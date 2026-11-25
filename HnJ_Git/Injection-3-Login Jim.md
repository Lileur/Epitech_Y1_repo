Login Jim

Méthodologie : 
1. [Récupérer l’addresse  e-mails de Jim] — Sur le site, il est possible de poster des commentaires sur les produits vendus. N'ayant pas de pseudonyme, les e-mails qui sont aussi les identifiants sont donc accessibles.

2. [Ajouter une injection de SQL dans le login] — Après avoir mis le login de Jim, j'ai simplement ajouté "';#" (le ' ferme le login sur le dans le SQL, le ; ferme la ligne et le # me permet d'ignorer le reste de la commande, dont le mot de passe). Cela me permet donc de ne pas avoir besoin du bon mot de passe et me permet donc d'accéder au compte de Bender.

Vulnerabilité : 
Injection de SQL dans le site, ce qui permet des attaques sur la base de données et d'usurper des identités ou de se connecter à des comptes qui ne sont pas censés être accessibles, une absence de protection contre les caractères spéciaux dans la requête (le # n'aurait pas dû mettre en commentaire la fin de la requête originelle).

Composants impactés : 
Le backend ne protège pas les entrées utilisateurs correctement, la base de données est bien sûr touchée car le hacker peut avoir accès à toutes les données, les modifier ou les supprimer sans souci et les données, comptes et cartes de crédit de l'utilisateur sont à la disposition du hacker.

Niveau de risque : élevé.
Le fait d'accéder à n'importe quel compte sans difficulté met à risque les comptes, les informations et les cartes de crédit des utilisateurs, ce qui peut découler sur des vols de données, des usurpations d'identités ou des vols de comptes, ou d'argent simplement.

Risques : 
Il y a donc des risques de fuite de documents confidentiels (données clients ou adresse e-mail…), dont des données de cartes bancaires. Il y a également un risque d'atteinte à l'intégrité du site car les hackers peuvent avoir accès à la base de données et donc au backend du site et, bien sûr, un impact réputationnel et légal dû à la fuite de données qui peut déboucher sur des poursuites judiciaires contre le site internet et une réputation de site non fiable. Avec la particularité que si les hackers volent de l'argent, les dommages et intérêts seront donc d'autant plus importants car il y aura des demandes de remboursement.

Actions proposées : 
Entre l'implémentation de pseudonymes pour empêcher la récupération du login et la sécurisation des requêtes SQL en empêchant par exemple les caractères spéciaux, les solutions sont nombreuses dans ce cas.