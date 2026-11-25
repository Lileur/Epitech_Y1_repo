from scripts import books_func as bf
from scripts import cache
from collections import Counter
import math
import re

def tokenisation(book):
    """
    Prend un livre en paramétre et vas retourner une liste des mot (token) qui sont dans le livre

    args :
        le contenu du livre
    """
    try:
        
        # separe chaque mot alphanumérique
        tokens = re.findall(r'\w+', book.lower())
        return tokens

    except AttributeError:
            # book est None ou pas une string
        print("Error : le contenu du livre est invalide")
    except Exception as a:
        print(f"Error : {a}")
        return False

def import_all_similar ():
    """
    telecharge tous les livres nécessaires pour la similaritée
    return:
        bool : True si tous les livres ont été téléchargés, False sinon
    """
    try:
        BOOKS = [11,12,16,55,113,120,236,108,834,863,1661,61262,69087,70114,35,36,84,159,164,345]
        if not bf.download_multiple_books(BOOKS):
            return False
        return True
    except Exception as e:
        print(f"Error : {e}")
        return False
        
def get_similar_tokens():
    """
    Récupère et tokenise tous les livres du corpus.

    return:
        dict[int, list[str]] pour chaque livre
    """
    try:
        
        tokens = {}
        
        for id in [11,12,16,55,113,120,236,108,834,863,1661,61262,69087,70114,35,36,84,159,164,345]:
            try:
                
                book = bf.get_book(id)

                if not book:
                    print(f"Warn : {book} not found skipping")
                    continue
                # tokeniser chaque livre
                book_tokens = tokenisation(book)

                if not book_tokens:
                    print(f"Warn : {id} couldn't be tokenised skipping")
                    continue
                
                # mettre les livre tokeniser dans le dict avec l'id du livre en tant que clée
                tokens[id] = book_tokens

            except Exception as e:
                print(f"Warn : {id} error {e}, skipping")
                continue
        
        return tokens
    except Exception as e:
        print (f"Error : {e}")
        return False
            





def word_frequences(tokens):
    """
    Calcule la fréquence de chaque mot dans un texte.
    args:
        list[str] tokens : liste de mots
    return:
        dict[str, float] : {mot: fréquence}
    """
    try:
        dic = {}

        # compter le nombre moi dans le livre
        count = Counter(tokens)

        # compter le nombre total de mot dans le livre
        total = len(tokens)

        for word in count:
            # compter le ratio d'apparition de chaque mot et les mettre dans le dict 
            dic[word] = count[word]/total
        return dic
    except ZeroDivisionError:
        print("Erreur : la liste de tokens est vide")
        return False
    except Exception as e:
        print(f"Erreur : {e}")
        return False

def general_frequences(all_tokens):
    """
    Calcule l'importance de chaque mot dans tout les livres.
    args:
        list[list[str]] all_tokens : liste de tokens par livre
    """
    try:
        # verifier si les info sont dans le cache si il le sont les renvoyer directement
        if cache.is_cached("idf","idf"):
            cached = cache.load_cache("idf","idf")

            if cached :
                return cached


        N = len(all_tokens)
        frequences = {}
        # recuperrer tout les mot unique
        all_words = set(word for tokens in all_tokens for word in tokens)

        # compter la récurance de chaque mot dans tout les texte
        for word in all_words:
            doc_count = sum(1 for tokens in all_tokens if word in tokens)
            frequences[word] = 1 - (doc_count / N)
        
        # mettre le resultat dans le cache
        cache.save_cache("idf","idf",frequences)
        return frequences

    except ZeroDivisionError:
        print("Erreur : aucun livre donnée")
        return False
    except Exception as e:
        print(f"Erreur : {e}")
        return False
    
def compute_tfidf(tokens, gf):
    """
    Combine TF et IDF pour obtenir le vecteur final d'un livre.
    args:
        list[str] tokens : liste de mots du livre
        dict[str, float] gf : le résultat de general_frequences()

    return:
        dict[str, float]
    """
    try:
        tf = word_frequences(tokens)
        if not tf:
            return False
        tfidf = {}
        for word in tf:
            tfidf[word] = tf[word] * gf.get(word, 0)
        
        return tfidf

    except Exception as e:
        print(f"Error : {e}")

def cosine_similarity(vec1, vec2):
    """
    mesure la similarite entre deux vecteurs TF-IDF.

    args:
        dict[str, float] vec1 : vecteur TF-IDF du premier livre
        dict[str, float] vec2 : vecteur TF-IDF du deuxième livre
    return:
        float : score de rapprochement entre les 2 livre
    """
    try:
        # recuperer tout les mot commun entre les 2 livre vectorisée
        common = set(vec1.keys()) & set(vec2.keys())
        vec = 0

        # somme des produits des valeurs communes
        for word in common :

            vec += vec1[word] * vec2[word] 
        
        # calculer la norme du premier vecteur
        # la norme est racine carrée de la somme des carrés de chaque valeur
        sum_squares1 = 0
        for v in vec1.values():
            sum_squares1 += v ** 2
        norm1 = math.sqrt(sum_squares1)

        # calculer la norme du deuxième vecteur
        sum_squares2 = 0
        for v in vec2.values():
            sum_squares2 += v ** 2
        norm2 = math.sqrt(sum_squares2)

        # si une des normes est 0 alors c'est un vecteur vide donc pas de similarité
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # rennvoie la similaritée
        return vec / (norm1 * norm2)

    except ZeroDivisionError:
        print("Erreur : division par zéro")
        return False
    except Exception as e:
        print(f"Erreur : {e}")
        return False


def similar(id):
    """
    Retourne les 5 livres les plus similaires au livre donné.
    args:
        int id : l'identifiant du livre
    return:
        list[str] : liste des 5 titres les plus similaires
    """
    try:
        if cache.is_cached("similar", id):
            cached = cache.load_cache("similar",id)

            if cached:
                return cached
        # récupérer et tokeniser le livre
        book = bf.get_book(id)

        if not book:
            return False

        book_tokens = tokenisation(book)

        if not book_tokens:
            return book_tokens


        # recuperer les tokens de tous les livres du a comparer
        all_tokens = get_similar_tokens()

        if not all_tokens:
            return False
        # calculer l'IDF sur tout les livre a comparer et le livre
        all_tokens[id] = book_tokens
        idf = general_frequences(list(all_tokens.values()))

        if not idf:
            return False
        # vectoriser le livre
        book_vector = compute_tfidf(book_tokens, idf)

        if not book_vector:
            return False
        # calculer la similarité avec chaque livre du corpus
        scores = {}
        for book_id, tokens in all_tokens.items():
            if book_id != id:
                vec = compute_tfidf(tokens, idf)

                if not vec:
                    print (f"Warn : couldn't vectorise {book_id} skipping")
                    continue
                
                similarity = cosine_similarity(book_vector, vec)


                if similarity is False:
                    print(f"Warn : couldn't calculate similarity for {book_id}, skipping")
                    continue 

                scores[book_id] = similarity

        # trier par score décroissant et prendre le top 5
        top5 = sorted(scores, key=lambda x: scores[x], reverse=True)[:5]
        result = [bf.get_title(book_id) for book_id in top5]
        cache.save_cache("similar",id,result)
        # retourner les titres
        return result
    except Exception as e:
        print(f"Error : {e}")
        return False

