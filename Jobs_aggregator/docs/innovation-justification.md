# Justification innovation — JobSense

Format exigé : problème utilisateur, hypothèse, pertinence, mesure du succès.  
**Evidence** : chemins code et métriques observables.

---

## 1. Agrégation WeLoveDevs + décision rapide

### Problème utilisateur

Les étudiants Epitech parcourent des centaines d'offres dispersées sur WeLoveDevs sans vue consolidée ni filtres homogènes (contrat, remote, compétences).

### Hypothèse

Si nous **normalisons** les offres WeLoveDevs dans une base unique avec **recherche/filtres** et **statistiques** sur la page d'accueil, le temps pour identifier des offres pertinentes diminue.

### Pourquoi cette approche

- Source **obligatoire** du sujet, données réelles marché.
- Normalisation (`transformWeLoveDevsJob`) permet facettes comparables (CDI, Remote, etc.).

### Mesure du succès

| Indicateur | Cible | Preuve |
|------------|-------|--------|
| Offres indexées | > 500 | Bandeau Hero « X offres indexées » (`App.tsx` → `Hero`) |
| Taux champs remplis | > 80 % | « % données normalisées » sur Hero |
| Délai sync manuel | < 3 min (20 pages) | `POST /api/jobs/sync?full=1` + logs `pagesFetched` |

**Tradeoff rejeté** : scraping HTML WeLoveDevs — fragile et hors contrat API.

---

## 2. Feature Data — exploration et facettes

### Problème utilisateur

Difficile de comparer le marché (répartition contrats, remote, entreprises) sans exporter les données.

### Hypothèse

Des **filtres multi-critères** + **compteurs de facettes** + **stats agrégées** sur l'accueil aident à cibler une recherche sans quitter la page principale.

### Pourquoi cette approche

- Exploite les données ingérées (pas du contenu statique seul).
- `computeFacetCounts`, `filterJobs` (`jobsense/src/utils/jobModel.ts`).

### Mesure du succès

| Indicateur | Cible | Preuve |
|------------|-------|--------|
| Filtres actifs utilisables | Contrat + mode + expérience | `Filters.tsx` + `App.tsx` |
| Facettes reflètent le catalogue | Compteurs cohérents avec liste | `facetCounts` dans Sidebar/Filters |
| Entreprises distinctes affichées | > 50 | Stat Hero « entreprises tech » |

**Tradeoff** : pages Tendances/Salaires avec données éditoriales — à migrer vers agrégats BDD (roadmap).

---

## 3. Feature IA légère — recommandation & CV assisté

### Problème utilisateur

Rédiger une candidature adaptée à chaque offre est long ; repérer des offres similaires demande une lecture manuelle.

### Hypothèse

Une **extraction de mots-clés locale** (dictionnaire compétences) + **score de similarité** entre offres permet recommandations et CV auto sans API LLM externe.

### Pourquoi cette approche

- Conforme contraintes sujet : < 500 Mo, < 5 s/offre, pas de fine-tuning au démarrage.
- `backend/src/AI/AIfeatures.js` : `extractKeywords`, `recommendJobs`, `computeSimilarity`.
- `resume.service.js` : génération CV/lettre à partir profil + mots-clés offre.

### Mesure du succès

| Indicateur | Cible | Preuve |
|------------|-------|--------|
| Temps génération CV | < 5 s | `POST /api/applications` / `preview-resume` |
| Recommandations retournées | 1–5 offres | `GET /api/ai/recommendations/:id` |
| Aucune clé OpenAI/Claude | 0 appel externe LLM | Code review `AIfeatures.js` |

**Tradeoff rejeté** : GPT-4 pour résumés — non autorisé, dépendance externe, latence/coût.

**Alternative rejetée** : modèle Transformer embarqué — dépasse 500 Mo et temps de chargement container.

---

## 4. Modération & confiance plateforme (admin)

### Problème utilisateur

Offres inadaptées ou doublons dégradent la confiance dans l'agrégateur.

### Hypothèse

Un **workflow de modération** (publier / masquer / rejeter / supprimer) côté admin avec effet immédiat sur le catalogue public réduit le bruit.

### Mesure du succès

| Indicateur | Cible | Preuve |
|------------|-------|--------|
| Action modération persistée | Oui | `PATCH /api/admin/jobs/:id/moderation` |
| Offre masquée invisible public | Oui | `getAllJobs` filtre `published` |
| Traçabilité | `moderated_at`, `moderated_by` | Colonnes BDD + update admin |

---

## Comment présenter à la soutenance (20 min)

1. **Parcours candidat** : recherche → filtre → détail → postuler (CV auto).
2. **Parcours admin** : modérer une offre → vérifier disparition côté public.
3. **Chiffres Hero** : offres indexées, dernière sync, normalisation.
4. **Décision technique** : pourquoi IA par mots-clés vs LLM (30 s, lien `docs/security.md` + ce document).
