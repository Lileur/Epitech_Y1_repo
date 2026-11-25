#!/usr/bin/env python
# coding: utf-8

# ## modele ia de retard

# In[19]:


import pandas as pd  # Manipulation de données
import numpy as np  # Calculs mathématiques
import matplotlib.pyplot as plt  # Affichage de graphiques
from sklearn.feature_extraction.text import CountVectorizer  # Transformer le texte en nombres
from sklearn.model_selection import train_test_split  # Séparer les données
from sklearn.naive_bayes import MultinomialNB  # Modèle d'apprentissage
from sklearn.metrics import accuracy_score  # Vérifier la performance du modèle


# In[20]:


# Importer les bibliothèques nécessaires
import pandas as pd


# In[21]:


# Charger le fichier depuis Google Colab
df = pd.read_csv('cleaned_dataset.csv', sep='\t', header=None, names=['label', 'message'])

# Afficher les 5 premières lignes du dataset
df.head()


# In[22]:


# Convertir les labels en 0 (ham) et 1 (spam)
df['label'] = df['label'].map({'ham': 0, 'spam': 1})

# Afficher les 5 premières lignes
df.head()

from sklearn.feature_extraction.text import CountVectorizer

# Convertir les messages en nombres
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(df['message'])

# Labels (0 ou 1)
y = df['label']

# Afficher la taille des données
X.shape, y.shape

