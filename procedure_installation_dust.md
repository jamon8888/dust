# Procédure d'installation complète de Dust

Cette procédure détaille l'installation de tous les composants nécessaires pour faire fonctionner Dust, y compris les services backend, frontend, et les connecteurs.

## Prérequis

- Docker et Docker Compose installés
- Git
- Accès à un terminal

## Étapes d'installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/dust-tt/dust.git
cd dust
```

### 2. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet avec le contenu suivant :

```
ES_LOCAL_VERSION=8.12.1
ES_LOCAL_PORT=9200
ES_LOCAL_CONTAINER_NAME=elasticsearch
ES_LOCAL_HEAP_INIT=1g
ES_LOCAL_HEAP_MAX=1g
ELASTICSEARCH_PASSWORD=password
KIBANA_LOCAL_CONTAINER_NAME=kibana
KIBANA_LOCAL_PORT=5601
KIBANA_LOCAL_PASSWORD=password
KIBANA_ENCRYPTION_KEY=atleast32charactersforencryptionkey
```

### 3. Lancer les services d'infrastructure avec Docker Compose

```bash
docker-compose up -d db redis qdrant_primary qdrant_secondary apache-tika elasticsearch kibana_settings kibana
```

### 4. Initialiser les bases de données PostgreSQL

```bash
./init_dev_container.sh
```

Ce script va :
- Créer les bases de données nécessaires dans PostgreSQL
- Initialiser les collections Qdrant
- Créer les index Elasticsearch requis

### 5. Construire et lancer les services Core (Backend)

```bash
cd core
cargo build --release
cargo run --release --bin core-api
```

Dans un autre terminal :
```bash
cd core
cargo run --release --bin sqlite-worker
```

### 6. Installer et démarrer les connecteurs

```bash
cd connectors
npm install
npm run build
npm run start:web
```

### 7. Installer et démarrer le frontend

```bash
cd front
npm install
npm run dev
```

### 8. Installer et démarrer les services additionnels (si nécessaire)

#### Service Viz

```bash
cd viz
npm install
npm run dev
```

#### Service Alerting (si nécessaire)

```bash
cd alerting
npm install
npm run dev
```

### 9. Accéder à l'application

Une fois tous les services démarrés :

- Interface frontend : http://localhost:3000
- API Core : http://localhost:3001
- API Connecteurs : http://localhost:3002
- Interface Kibana : http://localhost:5601

## Alternative : Utiliser les Dockerfiles pour tous les services

Si vous préférez utiliser Docker pour tous les services, vous pouvez construire et lancer chaque service en utilisant les Dockerfiles fournis :

### Construire les images Docker

```bash
# Core (Backend)
docker build -t dust-core -f dockerfiles/core.Dockerfile .

# Frontend
docker build -t dust-front -f dockerfiles/front.Dockerfile .

# Connecteurs
docker build -t dust-connectors -f dockerfiles/connectors.Dockerfile .

# Viz
docker build -t dust-viz -f dockerfiles/viz.Dockerfile .

# Autres services selon les besoins
```

### Lancer les services Docker

```bash
# Core
docker run -d -p 3001:3001 --name dust-core dust-core

# Frontend
docker run -d -p 3000:3000 --name dust-front dust-front

# Connecteurs
docker run -d -p 3002:3002 --name dust-connectors dust-connectors

# Viz
docker run -d -p 3003:3003 --name dust-viz dust-viz
```

## Vérification de l'installation

Pour vérifier que tous les services fonctionnent correctement :

1. Accédez à http://localhost:3000 pour le frontend
2. Vérifiez que l'API core répond sur http://localhost:3001/api/status
3. Vérifiez que l'API des connecteurs répond sur http://localhost:3002/api/status

## Résolution des problèmes courants

- **Problèmes de connexion à PostgreSQL** : Vérifiez que le service est bien démarré avec `docker ps`
- **Problèmes d'accès à Elasticsearch** : Vérifiez les identifiants dans le fichier `.env`
- **Erreurs de construction des services** : Vérifiez les logs avec `docker logs <container_id>` 