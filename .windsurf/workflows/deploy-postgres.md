---
description: Déployer l'application GEST_DAO avec PostgreSQL
---

# Workflow de déploiement avec PostgreSQL

## Prérequis
- PostgreSQL installé localement ou base de données PostgreSQL hébergée
- Node.js et npm/yarn installés
- Repository Git

## Étapes de migration et déploiement

### 1. Installation des dépendances PostgreSQL
```bash
npm install pg @types/pg
```

### 2. Configuration de la base de données
1. Copier le fichier d'environnement PostgreSQL:
```bash
cp .env.postgres.example .env.local
```

2. Configurer les variables dans `.env.local`:
- `DB_HOST`: hôte PostgreSQL (localhost pour local)
- `DB_PORT`: 5432 (port par défaut PostgreSQL)
- `DB_USER`: utilisateur PostgreSQL
- `DB_PASSWORD`: mot de passe PostgreSQL
- `DB_NAME`: nom de la base de données

### 3. Migration de la base de données
1. Créer la base de données PostgreSQL:
```sql
CREATE DATABASE dao_project;
```

2. Lancer la migration des tables:
```bash
npm run seed:postgres
```

### 4. Options de déploiement

#### Option A: Déploiement local avec Docker
1. Utiliser `docker-compose.yml` avec PostgreSQL
2. Démarrer les services:
```bash
docker-compose up -d
```

#### Option B: Déploiement sur Vercel/Railway/Render
1. Choisir un fournisseur avec support PostgreSQL
2. Configurer la base de données externe
3. Mettre à jour les variables d'environnement

### 5. Base de données PostgreSQL recommandées

#### Pour le développement:
- **Local**: PostgreSQL sur votre machine
- **Docker**: `postgres:15-alpine`

#### Pour la production:
- **Supabase**: PostgreSQL avec authentification incluse
- **Neon**: Serverless PostgreSQL
- **Railway**: PostgreSQL managé
- **Render**: PostgreSQL avec déploiement facile
- **AWS RDS**: PostgreSQL scalable

### 6. Configuration pour différents providers

#### Supabase:
```env
DB_HOST=xxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_supabase
DB_NAME=postgres
```

#### Neon:
```env
DB_HOST=xxx.neon.tech
DB_PORT=5432
DB_USER=xxx
DB_PASSWORD=votre_mot_de_passe_neon
DB_NAME=xxx
```

#### Railway:
```env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_railway
DB_NAME=railway
```

### 7. Test de la configuration
1. Démarrer l'application:
```bash
npm run dev
```

2. Vérifier la connexion à la base de données dans les logs

3. Tester les fonctionnalités principales:
   - Création de compte
   - Connexion
   - Création de DAO

### 8. Commandes utiles

// turbo
### Migration et seed
```bash
npm run seed:postgres
```

### Test de build
```bash
npm run build
npm start
```

### Backup de la base de données (local)
```bash
pg_dump -h localhost -U postgres dao_project > backup.sql
```

### Restore de la base de données
```bash
psql -h localhost -U postgres dao_project < backup.sql
```

## Dépannage

### Problèmes courants:
1. **Connexion refusée**: Vérifier que PostgreSQL est en cours d'exécution
2. **Base de données introuvable**: Créer la base de données avec `CREATE DATABASE`
3. **Erreur d'authentification**: Vérifier les identifiants dans `.env.local`
4. **Port occupé**: Changer le port PostgreSQL ou arrêter le service existant

### Logs PostgreSQL:
```bash
# Sur Ubuntu/Debian
sudo journalctl -u postgresql

# Sur macOS (Homebrew)
brew services list
brew services postgresql start
```

## Optimisations

### Indexation:
- Les index sont automatiquement créés pendant la migration
- Ajouter des index personnalisés selon les besoins de performance

### Connection pooling:
- Le pool PostgreSQL est configuré avec 20 connexions max
- Ajuster selon la charge de votre application

### Performance:
- Utiliser `EXPLAIN ANALYZE` pour optimiser les requêtes lentes
- Configurer le cache PostgreSQL si nécessaire

## Sécurité

### Variables d'environnement:
- Ne jamais committer `.env.local`
- Utiliser des secrets pour la production
- Limiter les accès à la base de données

### Connexions sécurisées:
- Utiliser SSL pour les connexions distantes
- Configurer les règles de pare-feu
- Utiliser des VPN si nécessaire
