# money
# 📈 StockTrack

A React/Vite stock portfolio tracker deployable to GitHub Pages.

**Features:**
- Live prices + day change via Finnhub API (free tier)
- Market sentiment per ticker (bullish / bearish / neutral)
- AI portfolio analysis powered by Claude
- Portfolio persisted in localStorage (survives page refresh)
- Daily P&L history logged automatically (last 90 days)
- Deploy to GitHub Pages with one command

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/stock-tracker.git
cd stock-tracker
npm install
```

### 2. Get your API keys

**Finnhub** (required for live prices — free, no credit card):
1. Go to https://finnhub.io and create a free account
2. Copy your API key from the dashboard

**Claude** (optional — for AI portfolio summaries):
1. Go to https://console.anthropic.com
2. Create an API key under "API Keys"
3. Note: Claude API calls cost a small amount per request (~$0.001 per analysis)

### 3. Configure the GitHub Pages base path

In `vite.config.js`, make sure the `base` matches your repo name:

```js
export default defineConfig({
  base: '/stock-tracker/',  // ← change this to your repo name
})
```

### 4. Run locally

```bash
npm run dev
# Opens at http://localhost:5173/stock-tracker/
```

Add your API keys via the **⚙️ Settings** button in the app.  
Keys are stored in `localStorage` only — never sent anywhere except the respective APIs.

---

## 🌐 Deploy to GitHub Pages

### First-time setup

1. Push your code to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/stock-tracker.git
git push -u origin main
```

2. Install gh-pages (already in devDependencies):
```bash
npm install
```

3. Deploy:
```bash
npm run deploy
```

This runs `vite build` then pushes the `dist` folder to the `gh-pages` branch.

4. In your GitHub repo → Settings → Pages → set source to **gh-pages branch**.

Your app will be live at:  
`https://YOUR_USERNAME.github.io/stock-tracker/`

### Future deploys

```bash
npm run deploy
```

---

## 📁 Project structure

```
stock-tracker/
├── src/
│   ├── App.jsx                  # Main app
│   ├── index.css                # Design system
│   ├── main.jsx
│   ├── components/
│   │   ├── HistoryChart.jsx     # Recharts P&L / value chart
│   │   ├── SettingsModal.jsx    # API key storage
│   │   └── StockModal.jsx       # Add / edit positions
│   └── utils/
│       ├── claudeAi.js          # Claude API call
│       ├── finnhub.js           # Live price + sentiment fetching
│       └── storage.js           # localStorage helpers
├── vite.config.js
└── package.json
```

---

## 💾 What gets stored in localStorage

| Key | Contents |
|-----|----------|
| `stocktracker_portfolio` | Your positions (ticker, qty, buy price) |
| `stocktracker_history` | Daily snapshots of portfolio value + P&L (last 90 days) |
| `stocktracker_apikeys` | Your Finnhub and Claude API keys |

All data stays in your browser — nothing is sent to any server except the official APIs.

---

## 🔧 Notes

- **Finnhub free tier**: 60 API calls/minute. With many tickers, sentiment fetching may slow down slightly (requests are sequential to avoid rate limits).
- **Market hours**: Finnhub returns the last traded price. Outside market hours, prices won't update but the last close is shown.
- **History**: One snapshot per day is saved automatically each time you click "Refresh prices".
