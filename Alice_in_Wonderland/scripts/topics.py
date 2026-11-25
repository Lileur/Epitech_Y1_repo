from scripts import books_func as bf
import re
from collections import Counter
from scripts import cache

STOP_WORDS = {
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "en",
    "à", "au", "aux", "il", "elle", "ils", "elles", "je", "tu", "nous",
    "vous", "on", "que", "qui", "se", "ce", "son", "sa", "ses", "sur",
    "par", "pour", "dans", "avec", "the", "a", "an", "of", "in", "to",
    "and", "is", "it", "was", "he", "she", "they", "that", "this", "his",
    "her", "with", "as", "at", "be", "by", "not", "but", "or", "from"
}


def extract_topics(book_text: str, delimiter: str = "\n\n") -> dict[int, list[str]]:
    # Extrait les top 10 mots de chaque section d'un livre
    # Retourne : {1: ['mot1', ...], 2: ['mot1', ...], ...}
    try:
        topics = {}

        sections = [s.strip() for s in book_text.split(delimiter) if s.strip()]
        #Découpe le texte brut en sections

        for i, section in enumerate(sections, start=1):
            words = re.findall(r'\b[a-záàâéèêëîïôùûüç]+\b', section.lower())
            #Convertit un texte en liste de mots (minuscules, sans ponctuation)
            filtered = [w for w in words if w not in STOP_WORDS and len(w) > 2]
            counter = Counter(filtered)
            topics[i] = [word for word, _ in counter.most_common(10)]

        return topics
    except Exception as e :
        print(f"Error : {e}")
        return False

def topics(id):
    try:
        if cache.is_cached("entities",id):
            print("donnée trouvée en cache, chargement depuis le cache")
            return cache.load_cache("entities",id)

        book = bf.get_book(id)

        if not book :
            return False
        
        topics = extract_topics(book)
        
        if not topics:
            return False
        
        cache.save_cache("lexdiv",id, topics)

        return topics
    except Exception as e:
        print(f"Error : {e}")
        return False