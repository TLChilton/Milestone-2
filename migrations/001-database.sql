-- Up
CREATE TABLE IF NOT EXISTS users
(
  id INTEGER PRIMARY KEY,
  firstName STRING,
  lastName STRING,
  email STRING,
  password STRING
);

CREATE TABLE IF NOT EXISTS pdfs         
(
  isbn INTEGER PRIMARY KEY,
  title STRING,
  author STRING,
  fileName STRING
);

CREATE TABLE IF NOT EXISTS authTokens
(
  token STRING PRIMARY KEY,
  userId INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- pdf tables will be static
INSERT OR IGNORE INTO pdfs (isbn, title, author, fileName)
VALUES
  (9780194230032, "Frankenstein", "Mary Shelley", "frankenstein.pdf"),
  (082191673, "The Scarlet Letter", "Nathaniel Hawthorne", "The_Scarlet_Letter.pdf"),
  (1575210304, "Teach Yourself Java in 21 Days", "Laura Lemay", "LearnJava.pdf");
  

/*
INSERT OR IGNORE INTO pdfs (title, author, fileName)
VALUES
  ("Dracula", "Bram Stoker", "dracula.pdf"),
  ("Moby Dick", "Herman Melville", "Moby_Dick.pdf"),
  ("A Modest Proposal", "Jonathan Swift", "modestproposal.pdf");
*/
-- Down
-- DROP TABLE users;
-- DROP TABLE pdfs;
-- DROP TABLE authTokens;