CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'team')),
  country    TEXT,
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE chats (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  title      TEXT,
  model      TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE messages (
  id         INTEGER PRIMARY KEY,
  chat_id    INTEGER NOT NULL REFERENCES chats(id),
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  tokens     INTEGER NOT NULL CHECK (tokens >= 0),
  created_at TIMESTAMP NOT NULL
);
CREATE TABLE credits (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL CHECK (balance >= 0)
);
