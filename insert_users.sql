-- Insertion des utilisateurs de test
INSERT INTO users (email, password_hash) VALUES
  ('admin@example.com', 'a0.dXhJNzjSvkFDSOoGOjix2Guj1VIJm7TxYlT.cOxzDj.M2'),
  ('user@example.com', 'a0MgZV0EAOKlI.U0yBaXBX.Drj9FmKxjfsHkIh8qPcuOlJ4haPC0/y'),
  ('test@example.com', 'a0MgZV0EAOKlI.U0yBaXBX.Drj9FmKxjfsHkIh8qPcuOlJ4haPC0/y')
ON CONFLICT (email) DO NOTHING; 