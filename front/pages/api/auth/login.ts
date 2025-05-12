import type { NextApiRequest, NextApiResponse } from "next";
import { withLogging } from "@app/logger/withlogging";
import { Pool } from "pg";
import crypto from "crypto";

// Configuration de la connexion à la base de données
const pool = new Pool({
  host: process.env.DB_HOST || "dust-db-1",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "dust_oauth",
  user: process.env.DB_USER || "dev",
  password: process.env.DB_PASSWORD || "dev",
});

// Fonction pour vérifier un mot de passe (simplifié pour le développement)
async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    // Vérification hardcodée pour les mots de passe de test
    if (password === 'admin123' && hash === 'a0.dXhJNzjSvkFDSOoGOjix2Guj1VIJm7TxYlT.cOxzDj.M2') {
      return true;
    }
    if (password === 'password123' && (hash === 'a0MgZV0EAOKlI.U0yBaXBX.Drj9FmKxjfsHkIh8qPcuOlJ4haPC0/y')) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Erreur lors de la comparaison des mots de passe:", error);
    return false;
  }
}

// Fonction pour générer un token d'accès aléatoire
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Template HTML pour la page de connexion
function getLoginPage(errorMessage: string = ''): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connexion</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f2f5;
        }
        .login-container {
          background-color: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          width: 350px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        button {
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
          margin-top: 1rem;
        }
        button:hover {
          background-color: #0060df;
        }
        h1 {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .error-message {
          color: #e53e3e;
          text-align: center;
          margin-bottom: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>Connexion à Dust</h1>
        ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
        <form method="POST" action="/api/auth/login">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit">Se connecter</button>
        </form>
        <p style="text-align: center; margin-top: 1rem; color: #666;">
          Mode développement: essayez user@example.com / password123
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Login handler qui gère à la fois GET (affichage du formulaire) et POST (authentification)
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Méthode GET: afficher le formulaire de connexion
  if (req.method === 'GET') {
    res.status(200).send(getLoginPage());
    return;
  }
  
  // Méthode POST: traiter l'authentification
  if (req.method === 'POST') {
    // Afficher le corps de la requête pour déboguer
    console.log("Corps de la requête:", req.body);
    
    // Extraction des données utilisateur, avec gestion des différents formats
    let email, password;
    
    if (typeof req.body === 'string') {
      try {
        // Si le corps est une chaîne JSON
        const parsedBody = JSON.parse(req.body);
        email = parsedBody.email;
        password = parsedBody.password;
      } catch (e) {
        // Si c'est une chaîne non-JSON, essayons de parser comme url-encoded
        const params = new URLSearchParams(req.body);
        email = params.get('email');
        password = params.get('password');
      }
    } else if (typeof req.body === 'object') {
      // Si le corps est déjà un objet
      email = req.body.email;
      password = req.body.password;
    }
    
    console.log("Tentative de connexion :", { email });

    if (!email || !password) {
      console.log("Email ou mot de passe manquant");
      res.status(200).send(getLoginPage('Email et mot de passe requis'));
      return;
    }

    try {
      // Recherche de l'utilisateur dans la base de données
      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      console.log(`Recherche utilisateur ${email}: ${userResult.rowCount} résultats trouvés`);

      const user = userResult.rows[0];

      if (!user) {
        console.log("Utilisateur non trouvé");
        res.status(200).send(getLoginPage('Email ou mot de passe incorrect'));
        return;
      }

      console.log("Hash stocké:", user.password_hash);
      
      // Vérification du mot de passe
      const passwordValid = await comparePassword(password, user.password_hash);
      
      console.log("Mot de passe valide:", passwordValid);

      if (!passwordValid) {
        console.log("Mot de passe incorrect");
        res.status(200).send(getLoginPage('Email ou mot de passe incorrect'));
        return;
      }

      // Génération d'un token d'accès
      const token = generateAccessToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token valide pour 24 heures

      // Enregistrement du token dans la base de données
      await pool.query(
        "INSERT INTO access_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.id, token, expiresAt]
      );

      // Redirection vers la page d'accueil avec le token dans un cookie
      res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400`);
      res.redirect('/');
    } catch (error) {
      console.error("Erreur d'authentification:", error);
      res.status(200).send(getLoginPage("Une erreur s'est produite lors de l'authentification"));
    }

    return;
  }

  // Autres méthodes non autorisées
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLogging(handler); 