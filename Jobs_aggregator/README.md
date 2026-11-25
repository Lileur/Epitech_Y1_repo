# JobSense (Job Aggregator)

JobSense relie candidats et recruteurs via une plateforme web moderne : interfaces distinctes, offres agrégées (WeLoveDevs), authentification JWT et OAuth.

## Architecture

- **Frontend** : React + TypeScript + Vite (`jobsense/`) — voir aussi `jobsense/README.md`.
- **Backend** : Node.js + Express + **MySQL** (`backend/`) — détails : `backend/README.md`.
- **Docker (stack wystan)** : `docker-compose.yml` à la racine (MySQL 8, backend, frontend).

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React, Vite, proxy `/api` → backend |
| Backend | Express, `mysql2`, Passport (Google/GitHub), Zod, Helmet, rate-limit |
| Base | MySQL (`schema.sql`, script `npm run migrate`) |
| Sécurité | Mots de passe **bcrypt**, requêtes paramétrées, **reCAPTCHA** (login / register) si clés configurées |

## Prérequis

- Node.js 18+
- MySQL 8 (ou **Docker** : `docker compose up`)

## Installation rapide

### Backend

```bash
cd backend
# Fichier backend/.env déjà présent (non versionné)
npm install
npm run migrate
npm run dev
```

API sur `http://localhost:3000`.

### Frontend

```bash
cd jobsense
# Fichier jobsense/.env déjà présent (non versionné)
npm install
npm run dev
```

Interface sur `http://localhost:5173` (proxy Vite vers l’API).

### Tout avec Docker

```bash
docker compose up --build
```

Configurer `backend/.env` (voir `backend/README.md`) — notamment `FRONTEND_ORIGIN=http://localhost:5173` et l’URL MySQL vers le service `db`.

## reCAPTCHA (anti-bot)

1. Créer une clé **v3** sur [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin).
2. Backend : `RECAPTCHA_SECRET_KEY` dans `backend/.env`.
3. Frontend : `VITE_RECAPTCHA_SITE_KEY` dans `jobsense/.env`.

Sans ces variables, l’API **n’exige pas** le captcha (pratique en dev).

## Structure du dépôt

```text
.
├── docker-compose.yml      # MySQL + backend + frontend (wystan)
├── backend/
│   ├── README.md           # Env, migrate, Docker
│   ├── schema.sql
│   ├── migrate.js
│   └── src/
│       ├── server.js       # Point d’entrée : Express + routes /api + listen
│       ├── config/         # db.js, passport.js
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── services/
└── jobsense/               # SPA React
    ├── README.md
    └── src/
```

## Documentation projet (sujet JOBAGGREGATOR)

| Document | Contenu |
|----------|---------|
| [docs/roles-and-access.md](docs/roles-and-access.md) | Rôles user/admin, modération offres |
| [docs/security.md](docs/security.md) | Cybersécurité Why / How / What |
| [docs/innovation-justification.md](docs/innovation-justification.md) | Innovation : problème, hypothèse, métriques |

## Sécurité (résumé)

Voir [docs/security.md](docs/security.md).

- Requêtes SQL paramétrées (`?`) contre l’injection SQL.
- Validation Zod centralisée + middleware d'erreur global.
- Routes admin : `verifyToken` + `requireRole('admin')`.
- Rate limiting (global + login).
- Helmet, CORS configuré, sessions sécurisées en production.
- reCAPTCHA sur **POST /api/auth/register** et **POST /api/auth/login** lorsque les clés sont présentes.
