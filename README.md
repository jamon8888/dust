## [Dust](https://dust.tt)

Custom AI agent platform to speed up your work.

Check out our [user guides and developer platform](https://docs.dust.tt)

## We're hiring

- [Software Engineer](https://jobs.ashbyhq.com/dust/bad88b68-e2db-47f0-ab42-4d6dd2664e76)
- [Frontend Engineer](https://jobs.ashbyhq.com/dust/f4b23a43-5d07-4ea3-b291-90db7db5e011)
- [Security Engineer](https://jobs.ashbyhq.com/dust/4ef6ceae-4779-4113-a82c-198b4b341ef9)

## Installation

### Prérequis

- Docker et Docker Compose
- Git

### Étapes d'installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/dust-tt/dust.git
   cd dust
   ```

2. Créez un fichier `.env` à la racine du projet :
   ```bash
   cat > .env << EOL
   ES_LOCAL_VERSION=8.12.1
   ES_LOCAL_PORT=9200
   ES_LOCAL_HEAP_INIT=512m
   ES_LOCAL_HEAP_MAX=512m
   ES_LOCAL_CONTAINER_NAME=elasticsearch
   ELASTICSEARCH_PASSWORD=password
   KIBANA_LOCAL_PORT=5601
   KIBANA_LOCAL_PASSWORD=password
   KIBANA_LOCAL_CONTAINER_NAME=kibana
   KIBANA_ENCRYPTION_KEY=c34d38b3a14956121ff2880de59a60d1eab1d2d02ea1432663d3a265be1c6b94
   EOL
   ```

3. Créez un fichier `.env.local` à la racine du projet pour Auth0 :
   ```bash
   cat > .env.local << EOL
   # Clé secrète pour Auth0 (générée avec openssl rand -hex 32)
   AUTH0_SECRET=292e55c63251da0556923a5f3aaeafa3c81be3cba33722b75b64ffe1edcb140d

   # URL de base de l'application
   APP_BASE_URL=http://localhost:3000

   # Informations fictives pour le développement local
   AUTH0_DOMAIN=https://dev-example.us.auth0.com
   AUTH0_CLIENT_ID=fakeClientId123456789
   AUTH0_CLIENT_SECRET=fakeClientSecret123456789abcdef

   # Variables NextAuth alternatives (pour compatibilité)
   NEXTAUTH_SECRET=292e55c63251da0556923a5f3aaeafa3c81be3cba33722b75b64ffe1edcb140d
   NEXTAUTH_URL=http://localhost:3000
   EOL
   ```

4. Créez les bases de données PostgreSQL nécessaires :
   ```bash
   docker compose up -d db
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_api;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_databases_store;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_front;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_front_test;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_connectors;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_connectors_test;"
   docker exec -it dust-db-1 psql -U dev -c "CREATE DATABASE dust_oauth;"
   ```

## Lancer le projet

### 1. Lancer les services d'infrastructure

```bash
docker compose up -d db redis qdrant_primary qdrant_secondary apache-tika elasticsearch kibana_settings kibana
```

### 2. Construire et lancer les services principaux

#### Service Core (Backend)

```bash
docker build -t dust-core -f dockerfiles/core.Dockerfile .
docker run -d --name dust-core --network dust_default -p 3001:3001 \
  -e CORE_DATABASE_URI=postgres://dev:dev@db:5432/dust_api \
  -e DATABASES_STORE_DATABASE_URI=postgres://dev:dev@db:5432/dust_databases_store \
  -e REDIS_URL=redis://redis:6379 \
  -e ELASTICSEARCH_URL=http://elastic:password@elasticsearch:9200 \
  -e ELASTICSEARCH_USERNAME=elastic \
  -e ELASTICSEARCH_PASSWORD=password \
  -e QDRANT_CLUSTER_0_URL=http://qdrant_primary:6333 \
  -e QDRANT_CLUSTER_0_API_KEY= \
  dust-core
```

#### Service Connectors

```bash
docker build -t dust-connectors -f dockerfiles/connectors.Dockerfile .
docker run -d --name dust-connectors --network dust_default -p 3002:3002 \
  -e CONNECTORS_DATABASE_URI=postgres://dev:dev@db:5432/dust_connectors \
  -e CORE_API_URL=http://dust-core:3001 \
  -e DUST_CONNECTORS_SECRET=some_random_secret_value \
  -e DUST_CONNECTORS_WEBHOOKS_SECRET=some_other_random_secret_value \
  dust-connectors
```

#### Service Frontend

```bash
docker build -t dust-front -f dockerfiles/front.Dockerfile .
docker run -d --name dust-front --network dust_default -p 3000:3000 \
  -e FRONT_DATABASE_URI=postgres://dev:dev@db:5432/dust_front \
  -e CORE_API_BASE_URL=http://dust-core:3001 \
  -e CONNECTORS_API_BASE_URL=http://dust-connectors:3002 \
  -e AUTH0_SECRET=292e55c63251da0556923a5f3aaeafa3c81be3cba33722b75b64ffe1edcb140d \
  -e AUTH0_BASE_URL=http://localhost:3000 \
  -e AUTH0_ISSUER_BASE_URL=https://dev-example.us.auth0.com \
  -e AUTH0_CLIENT_ID=fakeClientId123456789 \
  -e AUTH0_CLIENT_SECRET=fakeClientSecret123456789abcdef \
  -e AUTH0_TENANT_DOMAIN_URL=dev-example.us.auth0.com \
  -e NEXTAUTH_SECRET=292e55c63251da0556923a5f3aaeafa3c81be3cba33722b75b64ffe1edcb140d \
  -e NEXTAUTH_URL=http://localhost:3000 \
  dust-front
```

#### Service Viz (Visualisation)

```bash
docker build -t dust-viz -f dockerfiles/viz.Dockerfile .
docker run -d --name dust-viz --network dust_default -p 3003:3000 dust-viz
```

### 3. Proxy Nginx (optionnel)

Si vous souhaitez utiliser un proxy Nginx pour accéder à l'application :

```bash
cd proxy && docker build -t dust-proxy .
cd .. && docker run -d --name dust-proxy --network dust_default -p 8080:80 dust-proxy
```

### 4. Accéder à l'application

- Interface principale : http://localhost:3000
- Via proxy Nginx : http://localhost:8080
- API Core : http://localhost:3001
- API Connectors : http://localhost:3002
- Visualisation : http://localhost:3003
- Elasticsearch : http://localhost:9200
- Kibana : http://localhost:5601
