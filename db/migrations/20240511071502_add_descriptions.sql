CREATE TABLE article
(
    id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    content text NOT NULL
);

CREATE TABLE image
(
    id        SERIAL PRIMARY KEY,
    article   UUID    NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    name      VARCHAR NOT NULL,
    data      BYTEA   NOT NULL,
    mime_type TEXT    NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/gif', 'image/png'))
);

ALTER TABLE host
    ADD COLUMN article uuid REFERENCES article (id);
