FROM node:20.13.0 AS viz

RUN apt-get update && apt-get install -y vim redis-tools postgresql-client htop

ENV NODE_OPTIONS="--max_old_space_size=8192"

WORKDIR /app

COPY /viz/package*.json ./
RUN npm ci

COPY /viz .

# Pas de build en mode production, cela cause des erreurs
# Au lieu de cela, nous allons exécuter en mode développement

# Exposer le port pour l'application
EXPOSE 3003

# Démarrer l'application en mode développement
CMD ["npm", "run", "dev"]