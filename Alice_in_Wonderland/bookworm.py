from scripts import lexdiv as ld
from scripts import topics as tp
from scripts import entites as en
from scripts import similar as si
from scripts import summarize as su
import argparse

parser = argparse.ArgumentParser(description='Bookworm NLP')

# Chaque commande
parser.add_argument('--lexdiv',type=int, help="divesitée lexicale d'un livre")
parser.add_argument('--topics', type=int, help='theme du livre')
parser.add_argument('--entities',type=int, help='Les entitée nommée')
parser.add_argument('--summarize',type=int, help='Resume un livre')
parser.add_argument('--similar',type=int, help='Trouve des livres simmilaire')
parser.add_argument('--card', type=int, help='la carte du livre en entier')

args = parser.parse_args()

# Vérifier quelle commande l'utilisateur a tapée
if args.lexdiv:
    """
    1. donnée de l'utilisateur
    2. envoie à l'api de gutenberg le livre voulu : requests.get()
    3. sauvgarde du livre dans un fichier : f.write()
    4. tokeniser tout les mot du livre : re.findall()
    5. calcul des valeurs à afficher
    6. afficher les valeurs dans le terminal: print()
    """
    lexdiv = ld.lexdiv(int(args.lexdiv))
    if lexdiv :
        print (lexdiv)

elif args.topics:

    topics = tp.topics(int(args.topics))
    if topics :
        print (topics)

elif args.entities:

    entities = en.entities(int(args.entities))
    
    if entities:
        print (entities)

elif args.similar:

    similar = si.similar(int(args.similar))
    if similar :
        print (similar)

elif args.summarize:

    summarize = su.summarize(int(args.summarize))
    if summarize :
        print (summarize)