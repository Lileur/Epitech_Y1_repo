# Analyse Initiale et Plan d'Action - Projet JOBAGGREGATOR

Ce document synthétise les attentes du projet JobAggregator telles que décrites dans le sujet, en listant les notions à maîtriser, les exigences obligatoires (mandatory), l'ordre de développement recommandé, et une proposition de stack technologique pertinente.

---

## 1. Notions à Appréhender (Ce qu'il faut apprendre et maîtriser)

Le projet est un cas d'étude "Fullstack & Full-Lifecycle", voici les compétences qu'il requiert :

*   **Ingénierie Produit & Design :** Comprendre les besoins utilisateurs, faire une analyse de marché, concevoir une vraie "Value Proposition", réaliser des wireframes/maquettes, et s'assurer que chaque choix technique apporte une valeur produit justifiée.
*   **Développement Fullstack Architecture REST :** Création d'une API backend solide respectant les standards REST (Codes HTTP, endpoints propres), création d'une interface frontend réactive.
*   **Data Engineering (Ingestion & Nettoyage) :** Se connecter à une API externe (WeLoveDevs), respecter un *rate limiting* très strict (1 requête / seconde), extraire les données pertinentes, les normaliser puis les insérer dans sa propre base de données.
*   **Intelligence Artificielle "Embarquée" (Lightweight AI) :** Concevoir, intégrer et faire tourner un modèle d'IA localement sans dépendre d'API boîtes noires externes (interdiction d'utiliser OpenAI, Claude, etc.). Cela requiert des bases en NLP (Traitement du langage naturel) ou en algorithmique de recommandation (Scikit-Learn, Spacy, petits Transformers).
*   **Cybersécurité Appliquée :** Identifier et patcher les failles communes : stocker les mots de passe de manière sécurisée (hash + salt), gérer l'authentification (JWT, Sessions sécurisées), protéger l'application des injections (SQLi, XSS) et contrer les attaques par force brute (Brute-force mitigation).
*   **DevOps, CI/CD & Déploiement :** Appréhender la philosophie d'infrastructure as code via Docker et Docker Compose. Savoir scripter des pipelines d'Intégration Continue (GitHub Actions, GitLab CI) pour automatiser le linting, les tests et le build du projet à chaque "Push".

---

## 2. Ce qui est Strictement OBLIGATOIRE (Mandatory)

Tout ce qui suit doit être présent le jour de la soutenance pour que le projet soit valide.

### Produit, UI/UX & Gestion
*   Réaliser des **wireframes/mockups** des vues clés avant le dev.
*   Créer un document justifiant vos choix produits, architecturaux, IA, data et cybersécurité (avec des alternatives rejetées).
*   Avoir une interface contenant obligatoirement : Inscription/Authentification, Dashboard Utilisateur, Recherche et filtre d'offres, Page de détails de l'offre et un panneau d'Administration.

### Technique : Architecture & Dev
*   Le tout doit tourner localement avec **Docker et Docker Compose**. La commande de démarrage unique doit lancer au moins 3 services : Frontend, Backend, Base de Données.
*   Les identifiants et clés de configuration (Secrets) ne doivent **pas être en dur** dans le code (utiliser des variables d'environnement / fichiers `.env`).
*   Créer une **API REST** qui gère la logique de l'application et sécurise les accès en fonction des rôles.
*   Avoir au minimum un système de Rôles : **Administrateur** et **Utilisateur**. Validation et contrôles d'accès côté backend.
*   Utiliser une vraie **Base de Données** (Relationnelle ou NoSQL). La persistance des données doit survivre aux redémarrages de Docker (gestion des volumes).

### Data & Data Source
*   **Source requise : API WeLoveDevs** (*Token étudiant Epitech requis, contrainte stricte de 1 requête / seconde*).
*   Développement d'un système de récolte d'offres (manuel, déclenchable sur demande ou via un cron job).
*   Les offres enregistrées doivent contenir minimum : *Titre, Description, Entreprise, Localisation, Date/Durée, Salaire*.
*   **Feature Data :** Introduire au moins une fonctionnalité orientée "Données" : Filtres/Tris très complexes, Visualisations/Graphiques pour le Dashboard analytique sur les tendances de marché, ou score de pertinence.

### Intelligence Artificielle
*   **Feature IA :** Concevoir et implémenter au moins 1 fonctionnalité IA légère gérée intégralement par vous.
*   *Exemples valides :* Recommandation d'offres, Classification de jobs manquant d'info, Extraction de compétences depuis une description texte, Détection d'offres dupliquées.
*   **Interdiction formelle :** Déléguer la tâche à une API externe payante de LLM (ChatGPT etc.) ou utiliser un très gros modèle qui demanderait des serveurs massifs.

### DevOps & Cybersécurité
*   Création d'une **CI (Pipeline Automatisé)** qui se déclenche sur les Pull Requests/Push : Builds automatisés, Tests et Lint de code.
*   **Sécurité requise minimum :**
    *   Gestion sécurisée des secrets (.env non commités).
    *   Protection contre 1 type d'injection (Ex: Requêtes préparées SQL).
    *   Mitigation de brute force (Ex: Rate Limiter sur la route de Login).
    *   Sécurisation des Tokens (JSON Web Tokens expirables ou Sessions sécurisées).
    *   Chiffrement de la data au repos (mots de passe hachés avec Bcrypt/Argon2).
    *   Système de middleware global pour les erreurs et les validations d'inputs.

---

## 3. Quelle Stack Technologique utiliser ? (Recommandation)

Pour optimiser votre temps de développement tout en validant tous les points (particulièrement l'exigence d'une IA légère en local), voici la stack qui fait le plus de sens :

*   **Database : PostgreSQL**
    *   *Pourquoi :* Standard de l'industrie, hyper robuste, gestion facile des relations complexes (Membres -> Favoris -> Offres). Offre d'excellentes capacités de recherche textuelle natives. L’intégration avec les ORMs est parfaite.
*   **Backend (et Module Data/IA) : Python avec FastAPI (ou Django/Flask)**
    *   *Pourquoi :* Python est **le langage incontournable pour intégrer de l'IA et scroller de la donnée**. Avoir son Backend en Python permet de ne faire qu'**un seul conteneur backend** qui gère à la fois l'API REST, l'ingestion de la donnée depuis WeLoveDevs et l'IA (en utilisant des librairies légères comme `scikit-learn`, `spacy` ou `nltk` pour extraire des mots clés). *FastAPI* est moderne, propose de la validation de base (Pydantic), et génère la documentation de l'API toute seule (Swagger).
    *   *Alternative :* Backend Node.js (NestJS/Express) + Un petit service séparé en Python uniquement pour la gestion Serveur IA & Data ingestion (*Attention, oblige à avoir 4 conteneurs au lieu de 3, et complexifie l'architecture*).
*   **Frontend : React (Next.js) ou Vue (Nuxt) avec Tailwind CSS**
    *   *Pourquoi :* De loin le plus rapide pour construire un frontend moderne et un "Dashboard" demandé dans le sujet. L'écosystème regorge de librairies de graphiques esthétiques (Recharts, Chart.js) qui vous feront gagner du temps pour intégrer la *Data feature*.

---

## 4. Par quoi commencer ? (Le plan de bataille étape par étape)

Ne foncez surtout pas tête baissée dans le code. Procédez itérativement.

### Phase 1 : Cadrage Produit & Découverte (1 semaine)
1.  **Etudier l'API WeLoveDevs :** Obtenir la clé API de l'école. Tester l'API avec avec Postman ou Insomnia, analyser la forme exacte des données, comprendre ce qu'on peut en tirer de pertinent.
2.  **Product Discovery :** Définir qui est l'utilisateur ? (Un étudiant cherchant une alternance, un pro ?). Quelle est la valeur ajoutée de votre outil (ex: il aide à mieux négocier son salaire grâce à la Data feature ?).
3.  **Prototypage :** Faire des wireframes simples (Figma) pour les 4 grandes vues (Accueil, Dashboard, Recherche de Jobs détaillée, Admin).
4.  **Schéma SQL :** Dessiner le MLD (Modèle Logique de Données) : Tables `Users`, `Roles`, `Jobs`, `Jobs_Saved`, etc.
5.  **Setup Trello / Jira :** Découper en tâches et répartir dans l'équipe.

### Phase 2 : Setup Architecture & Base (Semaine 2)
1.  **Repository Git & CI :** Configurer un bot de lint (ESLint / Ruff pour python).
2.  **Dockerisation V0 :** Faire un `docker-compose.yml` qui lance vos trois bases : Frontend HelloWorld, Backend HelloWorld, Base de données vide. Assurez-vous que tout ce monde communique ensemble.

### Phase 3 : Back-Office, BDD et Agrégateur de Données
1.  **Connexion Base de données :** Setup de l'ORM côté backend.
2.  **Script d'ingestion WeLoveDevs :** Créer le service qui va appeler l'API (avec le sleep de 1 seconde obligatoire), formater la data et l'insérer en base.
3.  **Auth & Rôles :** Développer les routes `POST /register`, `POST /login` et mettre en place l’authentification sécurisée ainsi que le concept d'Admin/User.

### Phase 4 : Frontend & Core Features
1.  Lier les écrans maquettés avec les endpoints créés (Lister les offres, se connecter).
2.  Mettre en place un système de filtres efficace dans le catalogue.

### Phase 5 : Le "Wow Effect" (Data, IA, Sécurité et Finitions)
1.  **Feature Data :** Implémenter les visualisations (Dashboard) s'appuyant sur les données récoltées.
2.  **Feature AI :** Créer le modèle léger (ex: Recommandateur d'offres similaire en se basant sur le texte de la description, ou système qui flag automatiquement si une offre est suspecte).
3.  **Renfort Sécurité :** Implémenter les Request Limiters (contre le bruteforce), vérifier toutes les injections SQL.
4.  **Documentation :** Écrire le document justifiant vos choix produits, IA, cybersécurité comme demandé de manière explicite dans le sujet.
