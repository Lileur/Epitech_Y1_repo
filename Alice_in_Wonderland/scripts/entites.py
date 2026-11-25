from scripts import books_func as bf 
from scripts import cache

import re
import joblib

def _book_word_features(sentence, i):
    """
    refais les features d'un mot a la position i de la phrase donnée
    args:
        list[str] : les phrases a avoir les features
        int i : la position du mot pour avoir ses features

    return :
        dict: un dictionaire contenant toutes les features du mot
    """
    try:
        word = sentence[i]

        # les features du mot 
        features = {
            "word.lower":word.lower(),
            "word.istitle": word.istitle(),
            "word.isupper": word.isupper(),
            "word[-3:]":word[-3:],
            "word.isdigit": word.isdigit(),
        }

        # les features du mot precedent 
        if i > 0:
            prev = sentence[i - 1]
            features["-1:word.lower"] = prev.lower()
        else:
            # si il y as pas de mot précedent le marquer comme debut de la phrase
            features["BOS"] = True

        # les features du mot apres
        if i < len(sentence) - 1:
            after = sentence[i + 1]
            features["+1:word.lower"] = after.lower()
        else:
            # si il y as pas de mot arpes le marquer comme fin de la phrase
            features["EOS"] = True

        return features

    # Gerer les erreurs
    except IndexError:
        print(f"Error: l'index {i} est trop grand pour la liste")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def sentence_to_features(sentence):
    """
    Create features from all words in a sentence

    args:
        list[list[ str]] sentence : the sentence as a list of str

    returns:
        list[dict]: a list of features for each word in the sentence
    """
    try:
        sentence_features = []

        # create the features of each word
        for i, w in enumerate(sentence):
            current_word = _book_word_features(sentence, i)

            if current_word:
                sentence_features.append(current_word)

        return sentence_features

    # Handle error
    except TypeError:
        print("Error: sentence is invalid")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False




def get_book_sentences(id):
    """
    Récupère le livre et le découpe en liste de phrases.
    
    args:
        int id : l'identifiant du livre sur Project Gutenberg
    
    returns:
        list[str]: la liste des phrases du livre
    """
    try:
        # récupérer le contenu du livre
        book = bf.get_book(id)

        if not book:
            return False

        # découper le livre en phrases sur chaque . ! ?
        sentences = re.split(r'(?<=[.!?])\s+', book.strip())
        return sentences

    except AttributeError:
        # book est pas une string
        print(f"Error : le contenu du livre {id} est invalide")
        return False
    except Exception as e:
        print(f"Error : {e}")
        return False


def get_entities(tokens, labels):
    """
    prend en paramêtres les tokens et les labels des token dans l'ordre renvoie les entitée unique de location et de personnage dans un dictionaire 

    args :
        list[str] tokens : les tokens qui ont été labelisée

        list[str] labels : les labels des tokens dans le même ordre

    return : 

        dict [
            "locations" : list[str],
            "charaters" : list[str]
        ] 
    """
    
    try:

        # verifie que le nombre de token est équivalent au nombre de labels
        if (len(tokens) != len(labels)):
            print("Error : il n'y as pas le même nombre de token que label")
            return False
        
        temp = ""
        result = {"characters" : [], "locations" : []}
        

        
        for i in range(len(tokens)):

            """           
             # pour chaque token verifie si son label n'est pas une entitée
            if labels[i] == "O":
                                
                # si le token précedent est une entitée, l'ajouter a liste d'entitée correspoondante
                if prev == "I-LOC":
                    result["locations"].append(temp.strip())
                elif prev == "I-PER":
                    result["characters"].append(temp.strip())

                temp = ""
                prev = labels[i]
                pass


            else :

                # si le label du token précedent est le même que celui actuel ajouter le token au temp 
                if (prev == labels[i]):
                    temp += " " + tokens[i]
                    pass
                
                # si le label du précedent token etait une location, mettre le temp dans la liste de location 
                elif (prev == "I-LOC"):
                    result["locations"].append(temp)

                # si le label du précedent token etait un personnage, mettre le temp dans la liste de personnage
                elif (prev == "I-PER"):
                    result["characters"].append(temp)


                prev = labels[i]
                temp = tokens[i]
        # si le label du dernier token etait une entitée, mettre le token dans la liste correspondante
        if prev == "I-LOC":
            result["locations"].append(temp.strip())
        elif prev == "I-PER":
            result["characters"].append(temp.strip())
        """

            if labels[i] == "B-PER" :
                result["characters"].append(temp)
                temp = tokens[i]
            
            elif labels[i] == "B-LOC":
                result["locations"].append(temp)
                temp = tokens[i]

            elif labels[i] == "I-LOC" or labels[i] == "I-PER":
                temp += " " + tokens[i]
            
        # revoyer le dict avec la liste de personnage et location unique triée
        return {
            "characters": sorted(set(filter(None, result["characters"]))),
            "locations":  sorted(set(filter(None, result["locations"])))
        }


    # gerer les erreurs
    except Exception as e:
        print(f"Error : {e}")
        return False



def entities(id):
    """
    donne toutes les entitée (location, personnage), d'un livre

    args :
        int id : l'id du livre dans le projet gutenberg

    return :
        dict{ 
            "characters" : list[str],
            "locations" : list[str]
        }
    """

    try :
        if cache.is_cached("entities",id):
            print("donnée trouvée en cache, chargement depuis le cache")
            return cache.load_cache("entities",id)

        crf = joblib.load("models/crf.pkl")

        sentences = get_book_sentences(id)
        if not sentences :
            return False
        characters = []
        locations = []
        
        for s in sentences :
            tokens = re.findall(r"\w+", s)
            if not tokens:
                continue

            features = sentence_to_features(tokens)
            if not features:

                return False

            labels = list(crf.predict([features])[0])
            
            entities = get_entities(tokens,labels)

            if not entities:
                return False

            if entities:
                characters += entities["characters"]
                locations  += entities["locations"]
        output = {
            "characters": sorted(set(characters)),
            "locations":  sorted(set(locations))
        }
        cache.save_cache("entities",id, output)

        return output

    except Exception as e:
        print(f"Error : {e}")

