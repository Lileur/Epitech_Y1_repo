# Documentation des décisions techniques & produit
Version 1.0 — 2025

# 1. Choix Produit
1.1 Utilisateurs cibles
L'application s'adresse à trois profils principaux :
    - Étudiants (Bac+1 à Bac+5) en recherche de stage obligatoire ou de première expérience
    - Jeunes diplômés cherchant une alternance ou un premier emploi (< 2 ans d'expérience)
    - Jeunes professionnels en reconversion, ciblant des postes tech ou digitaux

1.2 Pain points priorisés
Trois problèmes majeurs identifiés lors de la phase de benchmark :

Problème                            Priorité            Réponse produit
Offres dispersées sur 10+ sites     P0 — Critique       Agrégation WeLoveDevs API 
Candidatures non suivies            P1 — Haute          Tableau de bord personnel de candidatures
Offres non adaptées au profil       P2 — Moyenne        Matching IA sur compétences déclarées

1.3 Plus-value utilisateur attendue
Pourquoi — Réduire le temps de recherche d'offres pertinentes de ~3h/semaine à moins de 30 min.
Comment — Agrégation d'offres WeLoveDevs filtrées par profil + matching IA léger + dashboard centralisé.
Trade-off — Dépendance forte à l'API WeLoveDevs : si elle est indisponible, les offres ne s'affichent pas. Mitigation : cache local 24h.

# 2. Choix Dashboard

Le dashboard est agencé de manière à être ergonomique et simple :

Les boutons en haut de page (offres, entreprises, salaires et tendances) ont tous pour but de renseigner l'utilisateur sur le sujet correspondant. Dans la recherche d'offres, toutes les recherches peuvent être accélérées avec les options sur la gauche afin de gagner du temps et de ne rechercher que ce qui est demandé.

# 3. Choix d'Architecture

3.1 Stack sélectionnée
Couche           Technologie      Raison
Frontend         React 18         Performance élevée, forte adoption par les entreprises et communauté open source
Backend          Express,nodeJS   Légèreté et flexibilité
Base de données  MYSQL            Open source, sécurisé et facile à utiliser
Infra            Docker           Déploiement gratuit pour prototype, scalable si trafic augmente

3.2 Alternatives rejetées
Rejeté : Next.js full-stack à cause d'une complexité inutile sans plus de valeur
Rejeté : MongoDB à cause des difficultée de jointure et de la consomation élever de ressources

# 4. Choix Data
4.1 Stratégie d'intégration WeLoveDevs
Pourquoi — WeLoveDevs est la principale source d'offres pour les profil ciblé, l'API officielle évite le scraping de mauvaise qualité.
Comment — Appels REST authentifiés via clé API.
Trade-off — Dépendance à un fournisseur unique. Si WeLoveDevs change son API ou révoque la clé, le service tombe.

4.2 Gestion du rate-limit

4.4 Sources additionnelles
Pour une v2, l'intégration de sources complémentaires est envisagée :

France Travail (ex-Pôle Emploi) API : offres hors tech, alternances conventionnées
LinkedIn Jobs API : offres CDI grandes entreprises (sous réserve d'accès partenaire)

# 5. Choix IA
DataCollect.js:
Purpose:
Used to collect and normalize job offers from the WeLoveDevs API.  
It performs two main tasks:
1. Fetches job offers from the external API
2. Converts the raw API data into a clean and standardized format

What it does:
1. normalizeOffers(rawOffers):
This function transforms raw job data into a structured clean array of normalized offers.
2. collectFromWeLoveDevs(apiKey):
This function retrieves job offers from the WeLoveDevs API, converts the response into JSON, normalizes the data using normalizeOffers() then returns the clean job offers.

Technology Used:
JavaScript
REST API
Fetch API
JSON
Bearer Token Authentication (for collectFromWeLoveDevs(apiKey))

Precautions:
- Asynchronous Programming
- API Integration

AIfeatures.js:
Purpose:
This code builds a simple intelligent job recommendation system.
It analyzes job descriptions, extracts technical skills, compares jobs based on shared technologies, and recommends similar jobs to users.

What it does:
1. skillDictionary: This object acts as a skill database. It maps technologies to their possible variations or aliases.
2. extractKeywords(description): This function extracts technical skills from a job description by
-Converting text to lowercase for easier matching
-Scanning the description for known skill variations
-Counting how many times each skill appears
-Assigning a relevance score 
-Sorting skills by importance
3. computeSimilarity(keywordsA, keywordsB): This function compares two jobs based on shared skills by
-Creating a fast lookup structure using Map
-Checking which skills exist in both jobs
-Adding similarity points based on shared relevance
-Returning a total similarity score
4.recommendJobs(targetJobId, db): This is the main recommendation engine.
Uses the previous functions and object to sort jobs by relevance then returns the most similar jobs.

Technology Used:
-JavaScript
-SQL Database
-Regular Expressions or RegExp (Used for keyword detection and text analysis)
-Maps (Efficient data lookup structure)
-Asynchronous Programming
-rule based AI approach using Natural Language Processing concepts.

# 6. Choix Sécurité
6.1 Menaces identifiées et contrôles
Menace                  Criticité       Contrôle implémenté
Fuite de clé API        Critique        Stockage en variable d'environnement (.env) — jamais dans le code.
Injection SQL           Critique
Brute force sur login   Moyenne         A2F

Pourquoi — Un projet gérant des données personnelles (profils, candidatures) est une cible même à petite échelle. Les contrôles de base coûtent peu et évitent des incidents majeurs.
Comment — OWASP Top 10 utilisé comme checklist. Secrets gérés via variables d'environnement
Trade-off — Pas d'audit de sécurité externe (budget nul). Les contrôles couvrent les vecteurs les plus courants mais pas les attaques avancées.

# 7. Choix CI/CD
7.1 Ce qui est automatisé
Pipeline GitHub Actions déclenché sur chaque Pull Request et push sur production 