Nested Ester Egg

1. [Télécharger le fichier Ester Egg] — Pour cela, je vous demanderais d'aller voir mon rapport "Broken Access Control-4-Ester Egg.md" afin de voir la méthodologie. À partir du fichier, je peux donc récupérer la chaine de caractères à déchiffrer pour un véritable easter egg : L2d1ci9xcmlmL25lci9mYi9zaGFhbC9ndXJsL3V2cS9uYS9ybmZncmUvcnR0L2p2Z3V2YS9ndXIvcm5mZ3JlL3J0dA==

2. [Décrire la chaine de caractères en base 64] – Après un peu de recherche, je me suis rendu compte que la string était encodée en base 64 (j'ai simplement essayé plusieurs choses et demandé des conseils à mes camarades). De ce fait, je suis allé sur dcode, un décodeur en ligne afin de récupérer une nouvelle chaine de caractères : /gur/qrif/ner/fb/shaal/gurl/uvq/na/rnfgre/rtt/jvguva/gur/rnfgre/rtt

3. [À partir de la chaine de caractères une deuxième fois grâce au code César] — Ici j'ai reconnu le code César qui consiste à modifier chaque lettre par son équivalent x plus loin dans l'alphabet, je suis donc repartie sur le site dcode car il me donne chaque possibilité de x, ce qui me donne la phrase suivante : /the/devs/are/so/funny/they/hid/an/easter/egg/within/the/easter/egg, ainsi que la validation du défi.

Vulnerabilité : 
Ici il n'y a pas vraiment de vulnérabilité étant donné que c'est plus une chasse au trésor qu'un vrai problème de sécurité, mais cela reste des cryptages connus et déconseillés à utiliser.

Composants impactés : 
Dans le cas où ceci est le seul chiffrage des données sensibles (par exemple les mots de passe), un potentiel hacker pourrait sans trop de difficulté le déchiffrer.

Niveau de risque : moyen.
Bien que déchiffrer ne soit pas bien compliqué, il faudrait d'abord accéder à ces données, ce qui nécessite une autre faille, et la donnée cryptée ici n'est pas importante ou sensible, mais dans le cas où le fichier était sensible, sa sécurité serait compromise.

Risques : 
Il y a donc des risques de vols de données confidentielles dans le cas où des données sensibles étaient ici cryptées.

Actions proposées : 
Il existe plusieurs méthodes de cryptage bien plus sécurisées que celle-là. Je recommanderai donc de la changer avec par exemple un cryptage clé publique/clé privée ou bien des phases de cryptage plus complexes avec plus d'étapes avec la clé correctement sécurisée.