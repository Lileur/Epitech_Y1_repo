from scripts import lexdiv_func as lex_func
from scripts import topics_func as top_func
from scripts import entites_func as ent_func
from scripts import similar_func as simi_func

def get_book_data(id):
    dictionnaire = {
        "info": "",
        "lexdiv": lex_func.lexdiv(id),
        "topics": top_func.topics(id),
        "entities": ent_func.entities(id),
        "summary": "",
        "similar": simi_func.similar(id),
    }
    return dictionnaire