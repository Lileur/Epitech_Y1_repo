Ester Egg

Méthodologie : 
1. [Aller dans le /ftp] – À partir de la page "À propos de nous", j'ai accédé à l'URL de "https://ctf.juice.cyber.epitest.eu/ftp/legal.md". D'ici, j'ai pu accéder au /ftp en raccourcissant l'URL.

2. [Télécharger le fichier Ester Egg] – Dans le /ftp, j'ai trouvé plusieurs fichiers, dont le fichier estere.gg. Afin de le récupérer, j'ai dû utiliser un procédé appelé nullbyte, cela consiste à ajouter à la fin de l'URL du fichier la chaine de caractères suivante : "%2500.md". La chaine a pour but d'encoder un nullbyte dans l'URL (%25 pour encoder un % et 00 le nullbyte) et de préciser le téléchargement en .md.

3. [Ouvrir le fichier afin de valider le défi] – Après avoir téléchargé le fichier en .md, j'ai donc pu l'ouvrir et valider le défi.

Vulnerabilités : 

Il s'agit de null byte injection ainsi que d'un contrôle insuffisant des chemins d'accès, mais on peut aussi noter des vulnérabilités secondaires telles qu'une Improper Input Validation (le site n'aurait pas dû accepter le %2500) et de l'Insecure Direct Object Reference (le /ftp n'aurait pas dû être accessible).

Composants impactés : 

Il y a la gestion des entrées car l'URL n'est pas suffisamment protégée.
Le mécanisme de protection des fichiers car les fichiers du FTP n'étaient pas censés être ouverts mais la sécurité a pu être contournée.
La gestion de l'accès aux ressources car on peut accéder au /ftp.

Niveau de risque : élevé.

La confidentialité est compromise car on a la possibilité de télécharger des fichiers confidentiels. L'attaque était plutôt simple car réalisée à partir de l'URL seulement et la surface d'attaque est grande car il y a possibilité d'accéder à beaucoup de documents et de chemins si la faille est connue.

Risques : 

Il y a donc des risques de fuite de documents confidentiels (documents légaux, sauvegardes, fichiers de logs…), une exposition de l'arborescence du serveur, ce qui aide les hackers dans la reconnaissance avant une attaque du site, ce qui peut donc mener à d'autres attaques potentiellement plus graves. Il y a également un risque d'atteinte à l'intégrité du site car les hackers peuvent avoir accès à une meilleure compréhension du code et de la logique du site et, bien sûr, un impact réputationnel et légal dû à la fuite de données qui peut déboucher sur des poursuites judiciaires contre le site internet et une réputation de site non fiable.

Actions proposées : 

Je recommande d'abord de patcher l'origine de la faille en empêchant l'utilisateur d'accéder au /ftp afin de faire une première correction, puis de protéger les URL du site afin d'empêcher les attaques null byte injection, et enfin de vérifier pour toute fuite de données afin de cerner les attaques subies et pouvoir se préparer à des attaques futures dues à la possible diffusion de l'arborescence du site internet.
