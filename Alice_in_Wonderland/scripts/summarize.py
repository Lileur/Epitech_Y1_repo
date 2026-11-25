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
        return {}
    except Exception as e:
        print(f"Erreur : {e}")
        return {}

def general_frequences(all_tokens):
    """
    Calcule l'importance de chaque mot dans tout les livres.
    args:
        list[list[str]] all_tokens : liste de tokens par livre
    """
    try:
        N = len(all_tokens)
        frequences = {}
        # recuperrer tout les mot unique
        all_words = set(word for tokens in all_tokens for word in tokens)

        # compter la récurance de chaque mot dans tout les texte
        for word in all_words:
            doc_count = sum(1 for tokens in all_tokens if word in tokens)
            frequences[word] = 1 - (doc_count / N)
        
        return frequences

    except ZeroDivisionError:
        print("Erreur : aucun livre donnée")
        return {}
    except Exception as e:
        print(f"Erreur : {e}")
        return {}
    
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

def summarize(id):
    """
    Retourne un résumé du livre en quelques phrases.
    args:
        int id : l'identifiant du livre
    return:
        str : le résumé du livre
    """
    try:
        # verifier si le livre est en cache
        if cache.is_cached("summarize", id):
            cached = cache.load_cache("summarize", id)

            if cached:
                return cached

        #  récupérer le livre et le découper en phrases
        book = bf.get_book(id)

        if not book:
            return False

        # recuperer les phrases
        sentences = re.split(r'(?<=[.!?;:])\s+', book.strip())

        # met dans une liste chaque phrase tokenisée
        tokens = [tokenisation(s) for s in sentences]

        # récupére la fr&quance de tout les mot dans le livre
        gf = general_frequences(tokens) 

        valid = []
        for sentence in sentences:
            t = tokenisation(sentence)
            if not t:
                continue
            vec = compute_tfidf(t, gf)
            if vec and vec is not False:
                valid.append((vec, sentence))

        scores = []

        for i, (vec, sentences) in enumerate(valid):
            score = 0
            # comparer la phrase i avec toutes les autres phrases
            for j, (vec2, s) in enumerate(valid):
                # ne pas comparer la phrase avec elle-même
                if i != j:
                        score += cosine_similarity(vec, vec2)
            # sauvegarder le score et la phrase correspondante
            scores.append((score, sentences))

        top5 = sorted(scores, reverse=True)[:5]
        top5 = sorted(top5, key=lambda x: book.index(x[1]))
        result = []

        for score, sentence in top5:
            result.append(sentence)

        summarize = " ".join(result)

        cache.save_cache("summarize", id, summarize)

        return summarize
    except Exception as e:
        print(f"Error : {e}")
        return False