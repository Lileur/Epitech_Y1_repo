from scripts import books_func as bf 
from scripts import cache
import re
from collections import Counter

def tokenisation(book):
    """
    Prend un livre en paramétre et vas retourner une liste des mot (token) qui sont dans le livre

    args :
        le chemin du livre
    """
    try:
        
        # separe chaque mot alphanumérique
        tokens = re.findall(r'\w+', book.lower())
        return tokens

    # gerer les erreures
    except FileNotFoundError:
        print("Error : Le fichier est introuvable")
        return False
    except Exception as a:
        print(f"Error : {a}")
        return False

def lexdiv(id):
    """
    doone la diversitée lexicale d'un livre

    args : 
        int id : l'id du livre
    
    return :
        un dict avec 
        {
        "tok" : le nombre total de mot (int)
        "typ" : le nombre de mot unique utilisée (int)
        "hap" : le nombre de mot utiliée qu'une seule fois (int)
        "ttr" : le nombre de mot unique diviée par le nombre de mot totale (float) 
        "mwl" : la moyenne de la longeurs des mot (float)
        "mwf" : le nombre de mot totale divisée par le nombre de mot unique (float)
        }
    """
    try:
        if cache.is_cached("lexdiv",id):
            print("donnée trouvée en cache chargement depuis le cache")
            return cache.load_cache("lexdiv",id)

        output = {}
        book = bf.get_book(id)

        if not book:
            return False
            
        tokens = tokenisation(book)
        
        if not tokens:
            return False 

        # calcul des valeurs pour connaitre la diversitée lexicale
        output["tok"] = len(tokens)
        output["typ"] = len(set(tokens))
        output["hap"] = sum(1 for v in Counter(tokens).values() if v == 1)
        output["ttr"] = round(output["typ"] / output["tok"], 2)
        output["mwl"] = round(sum(len(mot) for mot in tokens) / len(tokens),2)
        output["mwf"] = round(output["tok"] / output["typ"], 2)
        
        cache.save_cache("lexdiv",id, output)
        return(output)

    except Exception as e:
        print(f"Error : {e}")
