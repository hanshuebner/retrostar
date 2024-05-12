CREATE TABLE article
(
    id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    content text NOT NULL
);
