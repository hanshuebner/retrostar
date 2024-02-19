DROP TABLE IF EXISTS event;
CREATE TABLE event
(
    id        serial PRIMARY KEY,
    timestamp timestamp WITHOUT TIME ZONE DEFAULT NOW(),
    type      varchar NOT NULL,
    message   varchar NOT NULL,
    data      jsonb
);

CREATE OR REPLACE FUNCTION notify_event()
    RETURNS TRIGGER AS
$$
BEGIN
    PERFORM pg_notify('event', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_notify
    AFTER INSERT
    ON event
    FOR EACH ROW
EXECUTE PROCEDURE notify_event();
