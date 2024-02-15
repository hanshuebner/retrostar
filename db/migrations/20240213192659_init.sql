CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

CREATE TABLE public."user"
(
    id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v1(),
    name          VARCHAR UNIQUE NOT NULL,
    password_hash TEXT
);

CREATE OR REPLACE FUNCTION set_password(username VARCHAR, password TEXT) RETURNS VOID AS
$$
DECLARE
    salt TEXT := gen_salt('bf');
BEGIN
    PERFORM 1 FROM "user" WHERE name = username;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist', username;
    END IF;

    UPDATE public."user"
    SET password_hash = crypt(password, salt)
    WHERE name = username;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_password(username VARCHAR, password TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    hashed_password TEXT;
BEGIN
    SELECT password_hash
    INTO hashed_password
    FROM public."user"
    WHERE name = username;

    RETURN hashed_password = crypt(password, hashed_password);
END;
$$ LANGUAGE plpgsql;

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

CREATE FUNCTION hash_certificate() RETURNS TRIGGER AS
$$
BEGIN
    NEW.hash := digest(NEW.certificate, 'sha256');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_certificate_trigger
    BEFORE INSERT OR UPDATE
    ON openvpn_configuration
    FOR EACH ROW
EXECUTE PROCEDURE hash_certificate();

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

CREATE TABLE public.host
(
    mac_address MACADDR PRIMARY KEY,
    created     TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    last_seen   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    user_id     uuid REFERENCES "user" (id) NOT NULL,
    name        VARCHAR,
    description TEXT
);

CREATE OR REPLACE FUNCTION update_host(username varchar, mac text)
    RETURNS VOID AS
$$
DECLARE
    user_id uuid;
BEGIN
    -- Check if host exists
    IF EXISTS (SELECT 1 FROM host WHERE mac_address = mac::macaddr) THEN
        -- Update last_seen to current timestamp
        UPDATE host SET last_seen = NOW() WHERE mac_address = mac::macaddr;
    ELSE
        -- Get the user id
        SELECT id INTO user_id FROM "user" WHERE name = username;

        -- Check if user exists
        IF user_id IS NULL THEN
            RAISE 'User % not found', username;
        END IF;

        -- Create a new host
        INSERT INTO host(user_id, mac_address, last_seen) VALUES (user_id, mac::macaddr, NOW());
    END IF;
END
$$ LANGUAGE plpgsql;
