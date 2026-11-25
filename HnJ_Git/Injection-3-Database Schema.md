Database Schema

Méthodologie : 
1. [intercepter le site internet avec burp] — Après avoir téléchargé Burp et appris comment il fonctionnait grâce au tutoriel intégré, j'ai intercepté les échanges avec le site dans la barre de recherche, ce qui m'a donné accès à une requête à la base de données du site internet.

2. [Modifier la requête pour récupérer le schéma de la base de données] — Après avoir intercepté la requête, j'avais la possibilité de modifier ce qui était écrit dans la requête, j'ai donc ajouté à la place de ce que j'avais écrit dans la barre de recherche avec " '))UNION SELECT sql,2,3,4,5,6,7,8,9 FROM sqlite_master;# ", ce qui m'a affiché toutes les tables accessibles avec la requête. (J'ai d'abord fermé la requête originelle puis j'ai sélectionné 9 colonnes avec en 1er la colonne avec les données, les autres étant vides. J'en ai sélectionné neuf car il y avait 9 colonnes dans le premier select et il faut qu'il y ait autant de colonnes dans le 1er que dans le 2e, j'ai su le nombre de colonnes grâce à order by.)

3. [Comprendre le shémas avec les exemples récuperer] – Grâce aux tables récupérées, le schéma était facile à comprendre en raison des exemples auxquels j'avais accès.

Vulnerabilité : 
Injection de SQL avec la requête modifier, ce qui permet des attaques sur la base de données, une absence de protection contre les caractères spéciaux dans la requête (le # n'aurait pas dû mettre en commentaire la fin de la requête originelle), une absence de séparation des données publiques et privées, ce qui expose les données sensibles plus facilement accessibles.

Composants impactés : 
Le backend ne protège pas les entrées utilisateurs correctement, la base de données est bien sûr touchée car le hacker peut avoir accès à toutes les données, les modifier ou les supprimer sans souci.

Niveau de risque : élevé.
Les données peuvent être volées, modifiées et effacées sans vraie difficulté, les fuites de données et/ou leur destruction peuvent donc arriver.

Risques : 
Il y a donc des risques de fuite de documents confidentiels (donnée confidentielle ou adresse e-mail…) et/ou une potentielle destruction de ces dernières. Il y a également un risque d'atteinte à l'intégrité du site car les hackers peuvent avoir accès à la base de données et donc au backend du site et, bien sûr, un impact réputationnel et légal dû à la fuite de données qui peut déboucher sur des poursuites judiciaires contre le site internet et une réputation de site non fiable.

Actions proposées : 
La meilleure façon de réparer ces problèmes est de sécuriser les entrées SQL sur le site internet pour par exemple empêcher les caractères spéciaux, et plus généralement les injections de SQL.