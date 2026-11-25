import json

nb = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# Modèle Prédictif - Retard des Trains\n",
    "Entraînement d'un modèle pour prédire les retards à l'arrivée."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 1,
   "metadata": {},
   "outputs": [],
   "source": [
    "import pickle\n",
    "\n",
    "import numpy as np\n",
    "import pandas as pd\n",
    "from sklearn.ensemble import RandomForestRegressor\n",
    "from sklearn.metrics import mean_squared_error\n",
    "from sklearn.model_selection import train_test_split\n",
    "\n",
    "# 1. Load Data\n",
    "df = pd.read_csv(\"cleaned_dataset.csv\")\n",
    "\n",
    "# 2. Prepare Features\n",
    "features = [\"duree_moyenne_trajet\", \"circulations_prevues\"]\n",
    "target = \"retard_moyen_tous_arrivee\"\n",
    "\n",
    "X = df[features].fillna(0)\n",
    "y = df[target].fillna(0)\n",
    "\n",
    "# 3. Train/Test Split\n",
    "X_train, X_test, y_train, y_test = train_test_split(\n",
    "    X, y, test_size=0.2, random_state=42\n",
    ")\n",
    "\n",
    "# 4. Train Model\n",
    "model = RandomForestRegressor(n_estimators=10, random_state=42)\n",
    "model.fit(X_train, y_train)\n",
    "\n",
    "# 5. Evaluate Model\n",
    "preds = model.predict(X_test)\n",
    "mse = mean_squared_error(y_test, preds)\n",
    "print(f\"Mean Squared Error: {mse}\")\n",
    "\n",
    "# 6. Save Model\n",
    "with open(\"model.pkl\", \"wb\") as f:\n",
    "    pickle.dump(model, f)\n",
    "print(\"Model saved!\")\n"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.12.7"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}

with open("tardis_model.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)
