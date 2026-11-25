# Rôles et contrôle d'accès — JobSense

## Modèle de rôles (aligné sujet JOBAGGREGATOR)

Le sujet exige au minimum **user** et **admin**. JobSense implémente trois rôles métier, dont deux correspondent au rôle **user** du sujet :

| Rôle technique | Équivalent sujet | Description |
|----------------|------------------|-------------|
| `candidate` | **user** | Candidat : parcourir les offres, profil, favoris, postuler |
| `recruiter` | **user** | Recruteur : même accès public + champs entreprise (évolution produit) |
| `admin` | **admin** | Administration plateforme |

**Pourquoi** : distinguer candidat et recruteur à l'inscription améliore le profil et la personnalisation, sans changer le périmètre d'accès « utilisateur » vs « administrateur ».

**Comment** : colonne `users.role` (`ENUM`) + middleware `requireRole()` + vérifications dans les contrôleurs.

**Tradeoff** : un rôle `user` unique serait plus simple, mais moins expressif pour les parcours inscription (stage vs emploi vs recrutement).

## Matrice des permissions

### Utilisateur (`candidate` / `recruiter`)

| Action | Frontend | API | Contrôle serveur |
|--------|----------|-----|------------------|
| Lister offres publiées | Accueil, Offres | `GET /api/jobs` | Filtre `moderation_status = published` |
| Détail offre | Fiche offre | `GET /api/jobs/:id` | 404 si offre non publiée |
| Profil | Page Profil | `GET/PUT /api/users/me/profile` | `verifyToken` |
| Favoris | Sauvegarde offre | `POST/DELETE /api/users/me/saved-jobs` | `verifyToken` |
| Candidature | Postuler | `POST /api/applications` | `verifyToken` + `requireRole('candidate')` |

### Administrateur (`admin`)

| Action | Frontend | API | Contrôle serveur |
|--------|----------|-----|------------------|
| Gestion utilisateurs | Admin → Candidats / Recruteurs | `GET/PUT/DELETE /api/admin/users` | `verifyToken` + `requireRole('admin')` |
| Modération offres | Admin → Offres | `GET/PATCH/DELETE /api/admin/jobs` | `verifyToken` + `requireRole('admin')` |
| Métriques sécurité | Admin → Vue globale | `GET /api/admin/security-metrics` | `verifyToken` + `requireRole('admin')` |
| Promotion admin | Modal 2FA | `POST /api/admin/users/:id/promote` | 2FA TOTP obligatoire |

## Modération des offres

Chaque offre possède un `moderation_status` :

- `published` — visible sur le site public
- `pending` — en attente (file de modération)
- `hidden` — masquée sans suppression
- `rejected` — rejetée, non visible

**Preuve code** :

- Schéma : `backend/jobsense-init.sql` (colonne `moderation_status`)
- API admin : `backend/src/controllers/admin.controller.js` (`getAdminJobs`, `updateJobModeration`, `deleteAdminJob`)
- Routes : `backend/src/routes/admin.routes.js`
- Filtrage public : `backend/src/controllers/jobs.controller.js` (`getAllJobs`, `getJobById`)
- UI : `jobsense/src/components/AdminDashboard.tsx` (section Offres)

## Preuves d'application côté serveur

- `backend/src/middleware/auth.middleware.js` — JWT + `requireRole`
- `backend/src/controllers/admin.controller.js` — `assertAdmin()` sur chaque action admin
- `backend/src/routes/admin.routes.js` — chaîne `[verifyToken, requireRole('admin')]`

Les contrôles ne reposent **pas** uniquement sur le masquage UI : un appel API direct sans rôle `admin` reçoit **403**.
