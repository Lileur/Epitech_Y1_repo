# Backend JobSense (Express + MySQL)

Aligné sur la stack **wystan** (Docker MySQL) et **site_web** (OAuth, IA, WeLoveDevs).

## Variables d’environnement

Configurer `backend/.env` (fichier local, non versionné).

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion MySQL (ex. `mysql://root:root@127.0.0.1:3307/jobsense` si Docker mappe 3307) |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_PORT` | Alternative à `DATABASE_URL` (souvent utilisé avec `docker-compose`) |
| `FRONTEND_ORIGIN` | CORS + redirections OAuth (ex. `http://localhost:5173`) |
| `JWT_SECRET` | Signature des JWT |
| `SESSION_SECRET` | Sessions Passport (OAuth) |
| `RECAPTCHA_SECRET_KEY` | Secret Google reCAPTCHA (v2 ou v3) — si absent, la vérif est désactivée (dev) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (optionnel) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth GitHub (optionnel) |
| `WELOVDEVS_API_KEY` | API offres WeLoveDevs |

## Base de données

Schéma principal : `schema.sql` (utilisateurs + offres).

```bash
npm run migrate
```

Init Docker (utilisateur MySQL + tables simplifiées) : `jobsense-init.sql` monté dans `docker-compose.yml`.

## Démarrage

```bash
npm install
npm run dev
```

Point d’entrée : **`src/server.js`** (Express, middleware, routes `/api`, écoute du port).

## Docker (wystan)

À la racine du dépôt :

```bash
docker compose up --build
```

MySQL : port **3307** → host `127.0.0.1`, user `jobsense_user` / mot de passe `jobsense_password`, base `jobsense`.
