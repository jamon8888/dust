-- Création de la table users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table access_tokens
CREATE TABLE IF NOT EXISTS access_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des utilisateurs de test
INSERT INTO users (email, password_hash, name) VALUES
  ('admin@example.com', 'a0.dXhJNzjSvkFDSOoGOjix2Guj1VIJm7TxYlT.cOxzDj.M2', 'Admin User'),
  ('user@example.com', 'a0MgZV0EAOKlI.U0yBaXBX.Drj9FmKxjfsHkIh8qPcuOlJ4haPC0/y', 'Regular User'),
  ('test@example.com', 'a0MgZV0EAOKlI.U0yBaXBX.Drj9FmKxjfsHkIh8qPcuOlJ4haPC0/y', 'Test User')
ON CONFLICT (email) DO NOTHING; 