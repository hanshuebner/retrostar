CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION if NOT EXISTS "pgcrypto" WITH SCHEMA public;

CREATE TABLE public."user"
(
    id   uuid PRIMARY KEY DEFAULT public.uuid_generate_v1(),
    name VARCHAR UNIQUE NOT NULL
);

CREATE OR REPLACE FUNCTION random_alphanumeric_char()
    RETURNS CHAR AS
$$
DECLARE
    random_index INT;
    charset      CHAR[] := ARRAY(SELECT CHR(i)
                                 FROM GENERATE_SERIES(48, 57) AS g(i)
                                 UNION ALL
                                 SELECT CHR(i)
                                 FROM GENERATE_SERIES(65, 90) AS g(i));
BEGIN
    random_index := FLOOR(RANDOM() * ARRAY_LENGTH(charset, 1)) + 1;
    RETURN charset[random_index];
END;
$$
    LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_install_key()
    RETURNS VARCHAR AS
$$
DECLARE
    random_string VARCHAR := '';
    i             INT;
BEGIN
    FOR i IN 1..4
        LOOP
            random_string := random_string || random_alphanumeric_char();
        END LOOP;

    random_string := random_string || '-';

    FOR i IN 1..4
        LOOP
            random_string := random_string || random_alphanumeric_char();
        END LOOP;

    RETURN random_string;
END;
$$
    LANGUAGE plpgsql;


CREATE SEQUENCE port_number_sequence START 1194;

CREATE TABLE public.openvpn_configuration
(
    id          uuid PRIMARY KEY                     DEFAULT public.uuid_generate_v1(),
    install_key VARCHAR UNIQUE                       DEFAULT generate_install_key(),
    user_id     uuid REFERENCES "user" (id) NOT NULL,
    port_number INT                         NOT NULL DEFAULT NEXTVAL('port_number_sequence'),
    certificate TEXT                        NOT NULL,
    private_key TEXT                        NOT NULL,
    hash        TEXT                        NOT NULL UNIQUE
);

CREATE FUNCTION hash_certificate() RETURNS trigger AS $$
BEGIN
    NEW.hash := digest(NEW.certificate, 'sha256');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_certificate_trigger
    BEFORE INSERT OR UPDATE ON openvpn_configuration
    FOR EACH ROW EXECUTE PROCEDURE hash_certificate();

CREATE OR REPLACE FUNCTION insert_openvpn_configuration(user_name VARCHAR, certificate TEXT, private_key TEXT)
    RETURNS VOID AS
$$
DECLARE
    user_id uuid;
BEGIN
    -- Check if the user exists
    SELECT id INTO user_id FROM "user" WHERE name = user_name;

    -- If the user doesn't exist, insert them
    IF user_id IS NULL THEN
        INSERT INTO "user" (name) VALUES (user_name) RETURNING id INTO user_id;
    END IF;

    -- Insert the OpenVPN configuration
    INSERT INTO openvpn_configuration (user_id, certificate, private_key) VALUES (user_id, certificate, private_key);

END;
$$ LANGUAGE plpgsql;
