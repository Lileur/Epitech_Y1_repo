# Sécurité — JobSense (Why / How / What)

Document aligné sur les exigences cybersécurité du projet JOBAGGREGATOR.

---

## 1. Gestion des secrets

| | |
|---|---|
| **Why** | Empêcher l'exposition des clés API, JWT et mots de passe en dépôt ou dans le code. |
| **How** | Variables dans `backend/.env`, `jobsense/.env`, `docker-compose.yml` via `env_file` et substitution `${JWT_SECRET}`. Fichiers `.env` non versionnés. |
| **What** | `WELOVEDEVS_API_KEY`, `JWT_SECRET`, `SESSION_SECRET`, OAuth, reCAPTCHA chargés au runtime uniquement. |
| **Tradeoff** | Pas de vault externe (HashiCorp/Vault) — acceptable pour démo locale / Epitech. |
| **Preuve** | `docker-compose.yml` lignes `env_file` ; `backend/src/server.js` lit `process.env`. |

---

## 2. Protection contre l'injection SQL

| | |
|---|---|
| **Why** | Les entrées utilisateur ne doivent jamais être concaténées dans du SQL brut. |
| **How** | Requêtes préparées `mysql2` avec placeholders `?` pour toutes les valeurs dynamiques. |
| **What** | Auth, jobs, admin, applications utilisent `db.execute(query, params)`. |
| **Tradeoff** | `LIMIT`/`OFFSET` parfois en littéraux entiers validés (`parsePositiveInt`) — pas de placeholder MySQL sur LIMIT dans certains drivers. |
| **Preuve** | `backend/src/controllers/auth.controller.js`, `jobs.controller.js`, `users.controller.js`. |

---

## 3. Mitigation brute-force

| | |
|---|---|
| **Why** | Limiter les tentatives de connexion et l'épuisement de l'API. |
| **How** | `express-rate-limit` global (100 req / 15 min) + limiteur dédié login ; délai WeLoveDevs 1 req/s. |
| **What** | Routes `/api/auth/login` protégées ; sync API espacée. |
| **Tradeoff** | Rate limit par IP — peut impacter réseau partagé (campus). |
| **Preuve** | `backend/src/server.js`, `backend/src/routes/auth.routes.js`, `welovedevs.service.js` (`respectRateLimit`). |

---

## 4. Sécurité des routes, sessions et tokens

| | |
|---|---|
| **Why** | Routes sensibles accessibles uniquement aux utilisateurs authentifiés et autorisés. |
| **How** | JWT Bearer (`verifyToken`) ; sessions Passport pour OAuth ; `requireRole('admin'|'candidate')` ; Helmet + CORS restreint. |
| **What** | Admin : double contrôle token + rôle ; candidatures réservées aux `candidate`. |
| **Tradeoff** | JWT stateless — révocation immédiate limitée sans blacklist (non requis au sujet). |
| **Preuve** | `backend/src/middleware/auth.middleware.js`, `backend/src/routes/admin.routes.js`. |

---

## 5. Authentification sécurisée

| | |
|---|---|
| **Why** | Protéger les comptes et les actions admin sensibles. |
| **How** | Mots de passe `bcrypt` ; validation Zod sur register/login ; reCAPTCHA optionnel ; 2FA TOTP pour promotion admin. |
| **What** | Comptes suspendus/bannis refusés au login ; emails bannis table `banned_emails`. |
| **Tradeoff** | reCAPTCHA désactivé si clés absentes (dev local). |
| **Preuve** | `backend/src/controllers/auth.controller.js`, `AdminDashboard` promotion 2FA. |

---

## 6. Données en transit et au repos

| | |
|---|---|
| **Why** | Réduire l'interception et le stockage en clair des données sensibles. |
| **How** | HTTPS recommandé en production ; cookies session `secure` si `NODE_ENV=production` ; mots de passe uniquement hashés en BDD. |
| **What** | Aucun `password` en clair en base ; `password_hash` uniquement. |
| **Tradeoff** | Démo locale HTTP — TLS à activer au déploiement. |
| **Preuve** | `backend/src/server.js` (session cookie), schéma `users.password_hash`. |

---

## 7. Middleware d'erreur et validation centralisée

| | |
|---|---|
| **Why** | Réponses cohérentes, pas de fuite de stack trace ; entrées validées avant la logique métier. |
| **How** | `validate.middleware.js` (Zod sur body/query) ; `error.middleware.js` (ZodError, AppError, 500 générique). |
| **What** | Routes admin utilisent `validateBody` ; erreurs JSON `{ success, message, errors? }`. |
| **Tradeoff** | Toutes les routes n'utilisent pas encore un schéma Zod — extension progressive. |
| **Preuve** | `backend/src/middleware/validate.middleware.js`, `error.middleware.js`, `server.js` (`app.use(errorHandler)`). |

---

## Synthèse pour la soutenance

- **Menaces couvertes** : injection SQL, brute-force, accès non autorisé, secrets exposés, comptes compromis.
- **Contrôles mesurables** : 403 sur routes admin sans rôle ; 400 sur body invalide ; rate limit 429 ; métriques `GET /api/admin/security-metrics`.
