# STIA — AI Creative Studio

Application web française de création d’images et de vidéos avec fal.ai.

## Fonctionnalités
- Génération d’images avec FLUX.1 dev.
- Transformation d’une image avec FLUX image-to-image.
- Génération vidéo texte-vers-vidéo avec Hunyuan Video.
- Animation d’une photo avec Seedance 2.0.
- Mode démo local côté navigateur.

## Développement local
1. Installer Node.js 20 ou plus récent.
2. Lancer `npm install`.
3. Définir la variable d’environnement `FAL_KEY` dans le terminal ou dans un fichier `.env` local non versionné.
4. Lancer `npm start` pour servir l’application après compilation, ou `npm run dev` pour lancer Vite.

Pour compiler : `npm run build`.

## Déploiement Render
Le fichier `render.yaml` décrit un service web Node.
- Build command : `npm install && npm run build`
- Start command : `npm start`
- Health check : `/api/health`
- Ajouter dans les variables d’environnement Render : `FAL_KEY` avec la clé privée fournie par fal.ai.

Ne jamais mettre la clé fal.ai dans le code frontend, dans GitHub ou dans une variable `VITE_*`.

## Notes
Les générations réelles nécessitent une clé fal.ai valide et un compte fal.ai avec un solde ou une facturation active. Le mode démo n’appelle pas l’API.
