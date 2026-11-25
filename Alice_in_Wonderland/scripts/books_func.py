import requests
from pathlib import Path
import os
import re
from scripts import cache
def download_book(book_id):
    """
    prend en paramétre un id d'un livre du projet gutenberg et vas le telecharger dans le directory books

    args :
        book_id :  int l'id du book à telecharger dans le projet gutenberg 
    """
    try:

        if not isinstance(book_id, int):
            print("le paramétre donnée n'est pas un int")
            return False

        # definition de l'url ou chercher le livre avec l'id donnée en paramétre
        url = f"https://www.gutenberg.org/files/{book_id}/{book_id}-0.txt"
        
        # recupére la réponse 
        response = requests.get(url)
        
        # si la reponse revoie qu'elle as trouvée le livre 
        if response.status_code == 200:

            # si le fichier books n'existe pas le crée
            if not os.path.exists("books"):
                os.makedirs("books") 
            
            # crée ou ecrit dans le fichier books/{book_id}.txt avec book_id etant l'id du livre
            with open(f"books/{book_id}.txt", "w", encoding="utf-8") as f:

                # ecrit le contenu du livre dedans
                f.write(response.text)

            # print un message pour confirmer que ca as bien été fait
            print(f"Book {book_id} downloaded")
            return True
        # sinon renvoie un message d'erreur disant que le livre n'as pas été trouvé
        else:
            print(f"Error : Livre non trouvée status code : {response.status_code}")
            return False
    except ConnectionError:
        print("Erreur : Problème de connexion réseau.")
        return False
    except Exception as e:
        print(f"Une erreur inattendue est survenue : {e}")
        return False



def download_mutiple_books(array_of_books):
    """
    prend en paramétre une liste d'id de book et les telechage dans le directory books

    args: 
        array_of_books : l'array d'id a telecharger
    """
    try:
        # valiable donnée en paramêtre est bien une liste de int
        if isinstance(array_of_books, list):
            all_int = True
            for element in array_of_books:
                if not isinstance(element, int):
                    all_int = False
                    break
            if not all_int:
                print("ce n'est pas une liste d'int")
                return False

        # vas utiliser la fonction download_book sur tout les id de l'array
        for i in array_of_books:
            download_book(i)
            return True
    except ConnectionError:
        print("Error : Problème de connexion réseau.")
        return False    
    except Exception as e: 
        print(f"Error : Une erreur inattendue est survenue : {e}")
        return False


def clean_book(path):
    """
    permet de reformatter le livre pour enlever les textes de formatage de gutenberg
    args:
        path : le chemin du fichier a clean
    """
    try:
        # recupere le fichier et verifie que c'est bien un fichier
        file = Path(path)
        # si ca ne l'est pas renvoie false et renvoie un message
        if not file.is_file():
            print("Error : le fichier existe pas ou est un dossier")
            return False

        # ouvrir le fichier en mode lecture
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()

        # trouver le header de start et de end
        start = re.search(r"\*\*\* START OF THE PROJECT GUTENBERG EBOOK .+? \*\*\*", text)
        end = re.search(r"\*\*\* END OF THE PROJECT GUTENBERG EBOOK .+? \*\*\*", text)

        if start and end:
            # recuperer seulement le contenu entre le start et le end
            final_book = text[start.end():end.start()].strip()
        else:
            # si le debut ou la fin n'as pas été trouvée ne pas toucher au fichier
            final_book = text.strip()

        # enlever tous les commentaires restants entre *** xxx ***
        final_book = re.sub(r"\*\*\*.+?\*\*\*", "", final_book, flags=re.DOTALL).strip()
        # verifier les autorisations d'ecriture du fichier
        if not os.access(path, os.W_OK):
            print("Error : Vous n'avez pas les droits sur le fichier")
            return False

        # ouvrir le fichier en mode ecriture et ecrire
        with open(path, "w", encoding="utf-8") as f:
            f.write(final_book)

        return True

    # handle error
    except PermissionError:
        print("Error : Vous n'avez pas les droits sur le fichier")
        return False
    except FileNotFoundError:
        print("Error : le fichier existe pas ou est un dossier")
        return False
    except Exception as e:
        print(f"Error : Une erreur inattendue est survenue : {e}")
        return False


def download_and_clean(book_id):
    """
    Download and clean the book of the project Gutenberg at the id given
    
    args : 
        book_id : the id of the book in the project gutenberg
    """
    try:
        # telecharger le livre et si il as pas pu être telecharger print un message d'erreur
        if not download_book(book_id):
            return False

        # clean le livre pour enlever tout les ecrit par gutenberg
        if not clean_book(f"./books/{book_id}.txt"):
            return False
        print(f"Traitement terminé pour le livre {book_id}")
        return True

    # gerer les erreures
    except ConnectionError:
        print("Error : Problème de connexion réseau.")
        return False
    except FileNotFoundError:
        print(f"Error : Le fichier du livre {book_id} est introuvable après téléchargement.")
        return False
    except Exception as e:
        print(f"Error : Une erreur inattendue est survenue : {e}")
        return False


def open_book(id):
    """
    return the book in an string
    
    args:
        int id : id of the book
    """
    try:
        with open(f"books/{id}.txt", "r", encoding="utf-8") as f:
            book = f.read()
        return book
    except FileNotFoundError:
        print("Error : Le livre est introuvable")
        return False
    except Exception as e:
        print(f"Error : {e}")
        return False

def get_book(id):
    try:

        book = open_book(id)
        
        # recuperer le livre et si il existe pas le telecharger puis le recuperer
        if not (book):
            print("telechargement du fichier")

            if not download_and_clean(id):
                return False
            
            book = open_book(id)

            if not book : 
                return False
        return book
    
    except Exception as e:
        print(f"Error : {e}")
        return False

def get_title(id):
    """
    Retourne le titre d'un livre depuis l'API Gutenberg.
    args:
        int id : l'identifiant du livre
    return:
        str : le titre du livre
    """
    try:
        if cache.is_cached("titles", id):
            cached = cache.load_cache("titles", id)
            if cached :
                return cached

        response = requests.get(f"https://gutendex.com/books/{id}")
        data = response.json()
        result = data["title"]

        cache.save_cache("titles",id,result)
        
        return result

    except requests.exceptions.ConnectionError:
        # pas de connexion internet
        print("Error : pas de connexion internet")
        return False
    except requests.exceptions.Timeout:
        # requête trop longue
        print("Error : requête trop longue")
        return False
    except Exception as e:
        print(f"Error : {e}")
        return False

