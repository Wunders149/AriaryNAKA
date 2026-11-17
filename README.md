# Ariary 50/30/20

> *« Chaque ariary compte. Chaque objectif se construit. »*

Application de gestion financière personnelle basée sur la règle budgétaire **50/30/20** en Ariary (`Ar`), avec synchronisation **Firebase Authentication** (Google Sign-In) et **Cloud Firestore**.

## Déploiement sur GitHub Pages

Ce dépôt est préconfiguré pour être déployé automatiquement sur **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`).

### 1. Activer GitHub Pages sur votre dépôt
1. Poussez votre code sur la branche `main`.
2. Sur GitHub, ouvrez **Settings → Pages**.
3. Dans **Build and deployment → Source**, sélectionnez **GitHub Actions**.
4. Le workflow `Deploy to GitHub Pages` se déclenchera automatiquement à chaque push sur `main` (ou manuellement depuis l'onglet **Actions**).

### 2. Autoriser le domaine GitHub Pages dans Firebase Authentication (Obligatoire)
Pour que la connexion Google (`signInWithPopup`) fonctionne depuis votre site GitHub Pages :
1. Ouvrez la [Console Firebase](https://console.firebase.google.com/) pour le projet `refined-odyssey-901dl`.
2. Allez dans **Authentication → Settings → Authorized domains**.
3. Cliquez sur **Add domain** et ajoutez votre domaine GitHub Pages (ex. `votre-utilisateur.github.io`, ou votre domaine personnalisé).

### 3. Build local pour hébergement statique
```bash
npm install
npm run lint
npm run build:gh-pages
```
Le dossier `dist/` généré contient les assets relatifs (`./`), `.nojekyll`, ainsi que `404.html` pour la prise en charge SPA.
