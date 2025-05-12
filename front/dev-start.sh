#!/bin/bash
cd /app
export SKIP_AUTH=true
export DEVELOPMENT_SKIP_AUTH0=true
export NODE_ENV=development
export NEXT_PUBLIC_DUST_CLIENT_FACING_URL=http://localhost:3000
export FRONT_DATABASE_URI="postgresql://dev:dev@dust-db-1:5432/dust_front"
export FRONT_DATABASE_READ_REPLICA_URI="postgresql://dev:dev@dust-db-1:5432/dust_front"
export NEXT_TELEMETRY_DISABLED=1

# Installe les dépendances si nécessaire
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installation des dépendances..."
  npm install
fi

# Construit l'application
echo "Construction de l'application..."
npm run build

# Démarre en mode développement
echo "Démarrage du serveur..."
npm run dev
