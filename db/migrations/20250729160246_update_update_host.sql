CREATE OR REPLACE FUNCTION update_host(username varchar, mac text)
    RETURNS VOID AS
$$
DECLARE
    user_id uuid;
BEGIN
    -- Check if host exists
    IF EXISTS(SELECT 1 FROM host WHERE mac_address = mac::macaddr) THEN
        -- Update last_seen to current timestamp
        UPDATE host SET last_seen = NOW() WHERE mac_address = mac::macaddr;
    ELSE
        -- Get the user id
        SELECT u.id INTO user_id
        FROM openvpn_configuration oc
                 JOIN "user" u ON oc.user_id = u.id
        WHERE COALESCE(oc.config_name, u.name) = username;

        -- Check if user exists
        IF user_id IS NULL THEN
            RAISE 'User or OpenVPN configuration % not found', username;
        END IF;

        -- Create a new host
        INSERT INTO host(user_id, mac_address, last_seen) VALUES (user_id, mac::macaddr, NOW());
    END IF;
END
$$ LANGUAGE plpgsql;
