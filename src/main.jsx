/**
 * main.jsx
 * Point d'entree de l'application React.
 * Monte le composant racine <App /> dans le div # root de index.html.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
