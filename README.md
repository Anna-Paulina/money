# money

Suivi de portfolio boursier en React/Vite, deployable sur GitHub Pages.

**Ce que fait l'app :**
- Prix en direct + variation du jour via Finnhub API (tier gratuit)
- Sentiment de marche par action (bullish / bearish / neutral)
- Analyse IA du portfolio par Claude en langage naturel
- Portfolio sauvegarde dans localStorage (persiste entre les sessions)
- Historique quotidien P&L enregistre automatiquement (90 derniers jours)
- Deploy GitHub Pages en une commande

---

## Installation

### 1. Cloner et installer

```bash
git clone https://github.com/TON_USERNAME/money.git
cd money
npm install
```

### 2. Obtenir les cles API

**Finnhub** (requis pour les prix — gratuit, sans carte bancaire) :
1. Creer un compte sur https://finnhub.io
2. Copier la cle API depuis le dashboard

**Claude** (optionnel — pour les analyses IA) :
1. Aller sur https://console.anthropic.com
2. Creer une cle sous "API Keys"
3. Chaque analyse coute environ $0.001

### 3. Configurer le base path GitHub Pages

Dans `vite.config.js`, verifier que `base` correspond au nom du repo :

```js
base: '/money/',  // doit correspondre exactement au nom du repo GitHub
```

### 4. Lancer en local

```bash
npm run dev
# Ouvre sur http://localhost:5173/money/
```

Entrer les cles API via le bouton **Parametres** dans l'app.

---

## Deployer sur GitHub Pages

### Premiere fois

```bash
# Pousser le code sur GitHub
git remote add origin https://github.com/TON_USERNAME/money.git
git push -u origin main

# Deployer
npm run deploy
```

Dans GitHub : Settings > Pages > source = branche `gh-pages`.

L'app sera disponible sur :
`https://TON_USERNAME.github.io/money/`

### Mises a jour suivantes

```bash
npm run deploy
```

---

## Structure du projet

```
money/
├── src/
│   ├── App.jsx                  # Composant racine, logique principale
│   ├── index.css                # Design system (dark theme)
│   ├── main.jsx
│   ├── components/
│   │   ├── HistoryChart.jsx     # Graphique Recharts (P&L / valeur)
│   │   ├── SettingsModal.jsx    # Saisie et sauvegarde des cles API
│   │   └── StockModal.jsx       # Ajout / edition d'une position
│   └── utils/
│       ├── claudeAi.js          # Appel API Claude
│       ├── finnhub.js           # Prix en direct + sentiment
│       └── storage.js           # Helpers localStorage
├── vite.config.js
└── package.json
```

---

## Donnees stockees en localStorage

| Cle                | Contenu                                           |
|--------------------|---------------------------------------------------|
| `money_portfolio`  | Positions (ticker, quantite, prix d'achat)        |
| `money_history`    | Snapshots quotidiens valeur + P&L (90 jours max)  |
| `money_apikeys`    | Cles API Finnhub et Claude                        |

Tout reste dans le navigateur — rien ne passe par un serveur intermediaire.

---

## Notes

- **Finnhub free tier** : 60 requetes/minute. Avec beaucoup de tickers, les requetes de sentiment sont sequentielles pour eviter les 429.
- **Hors heures de marche** : Finnhub retourne le dernier prix cote, pas une valeur en temps reel.
- **Historique** : un snapshot par jour est enregistre automatiquement a chaque refresh des prix.
