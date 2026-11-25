import sklearn_crfsuite
from sklearn_crfsuite import metrics
import joblib
import os

def get_dataset(path):
    """
    load the datasets in to a string

    arg :
        the path of the datasets
    """
    try:
        # open the file
        with open(path, "r", encoding="utf-8") as f:
            # put the file in to an str
            dataset = f.read()
        # return the file content
        return dataset

    # handle errors
    except FileNotFoundError:
        print("Error : Le dataset est introuvable")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def _tokenisation(dataset):
    """
    
    tokenise the dataset into a list of sentences and return the sentence in a list of tuples (word, label)
    
    arg:
        string dataset : the dataset as a string

    return :
        list[list[tuple[str , str]]] : the list of all sentences with all the word and their labels
    """
    try:
        result = []

        # split the dataset with every \n\n witch represent the separation of every sentences
        sentences = dataset.split("\n\n")


        for s in sentences:

            current_sentence = []

            # split all the sentences with every \n witch represent the seperation of every word with they labels
            lines = s.split("\n")
            
            for line in lines:
                
                # split all line with every space to get in an list the word and thier label separately
                tokens = line.split()

                # check if the line is valable and takes the first and the fourth element of the list witch represent the word and the label that we need
                if len(tokens) >= 4 and not line.startswith("-DOCSTART-"):
                    current_sentence.append((tokens[0], tokens[3]))
            
            # check if the current sentences is not null
            if current_sentence:
                result.append(current_sentence)

        return result
    # handle error
    except AttributeError:
        print("Error: le dataset est invalide")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def word_features(sentence, i):
    """
    Create features from a word at position i in a sentence
    
    args:
        list[tuple[str, str]] sentence : the sentence as a list of tuples
        int i : the position of the word in the sentence

    return :
        dict: the dictionary of all the feature of the word
    """
    try:
        word = sentence[i][0]

        # features of the current word
        features = {
            "word.lower":word.lower(),
            "word.istitle": word.istitle(),
            "word.isupper": word.isupper(),
            "word[-3:]":word[-3:],
            "word.isdigit": word.isdigit(),
        }

        # features of the previous word
        if i > 0:
            prev = sentence[i - 1][0]
            features["-1:word.lower"] = prev.lower()
        else:
            # if no previous word, beginning of sentence
            features["BOS"] = True

        # features of the next word
        if i < len(sentence) - 1:
            after = sentence[i + 1][0]
            features["+1:word.lower"] = after.lower()
        else:
            # if no next word, end of sentence
            features["EOS"] = True

        return features

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
        list[list[tuple[str, str]]] sentence : the sentence as a list of tuples (word, label)

    returns:
        list[dict]: a list of features for each word in the sentence
    """
    try:
        sentence_features = []

        # create the features of each word
        for i, w in enumerate(sentence):
            current_word = word_features(sentence, i)

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


def sentence_to_labels(sentence):
    """
    Get labels from all words in a sentence

    args:
        list[tuple[str, str]] sentence : the sentence as a list of tuples

    returns:
        list[str]: a list of labels for each word in the sentence
        
    """
    try:
        final_result = []

        # get the labels of each word
        for i, w in enumerate(sentence):
            final_result.append(sentence[i][1])

        return final_result

    # Handle Errors
    except TypeError:
        print("Error: sentence is invalid")
        return []
    except IndexError:
        print("Error: missing label in sentence")
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []





def train(sentences):
    """
    train a CRF model with the sentences and save it

    args:
        
        list[list[tuple[str, str]]] sentences : list of sentences
        
    """
    try:
        # prepare features and labels for each sentence
        X = [sentence_to_features(s) for s in sentences]
        y = [sentence_to_labels(s)   for s in sentences]

        # create the CRF model
        crf = sklearn_crfsuite.CRF(
            algorithm="lbfgs",
            c1=0.1,
            c2=0.1,
            max_iterations=100,
            all_possible_transitions=True,
        )

        # train the model
        crf.fit(X, y)

        # Create the directory if not exist
        os.makedirs("models", exist_ok=True)
        
        # Save the model
        joblib.dump(crf, "models/crf.pkl")

        print("Model sauvegardée dans models/crf.pkl")

    # Handle Errors
    except ValueError as e:
        print(f"Error: invalid training data {e}")
    except Exception as e:
        print(f"Error: {e}")




def evaluate(sentences_dev):
    """
    Evaluate the model with sentences and print the result

    args:
        list[list[tuple[str, str]]] sentences_dev : list of the sentences
    """
    try:
        # load the saved model
        crf = joblib.load("models/crf.pkl")

        # prepare features and labels for each sentence
        X_dev = [sentence_to_features(s) for s in sentences_dev]
        y_dev = [sentence_to_labels(s) for s in sentences_dev]

        # predict labels
        y_pred = crf.predict(X_dev)

        # print the classification report for and only
        print(y_pred)
        print(metrics.flat_classification_report(y_dev, y_pred))

    except FileNotFoundError:
        print("Error: model not found at 'models/crf.pkl'")
    except Exception as e:
        print(f"Error: {e}")

dataset = get_dataset("datasets/eng.train")
sentences = _tokenisation(dataset)
train(sentences)

dataset_dev = get_dataset("datasets/eng.testa")
sentences_dev = _tokenisation(dataset_dev)
evaluate(sentences_dev)