ALTER TABLE openvpn_configuration
    ADD COLUMN config_name VARCHAR UNIQUE;

CREATE OR REPLACE FUNCTION insert_openvpn_configuration(config_name VARCHAR, user_name VARCHAR, certificate TEXT,
                                                        private_key TEXT)
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
    INSERT INTO openvpn_configuration (config_name, user_id, certificate, private_key) VALUES (config_name, user_id, certificate, private_key);

END;
$$ LANGUAGE plpgsql;
