# INFINITY VIDEO STUDIO — projet Bolt.new

Application React/Vite responsive en français. Le moteur est Wan 2.2 5B via l'API fal.ai et une Supabase Edge Function. La clé fal reste côté serveur.

## Import dans Bolt.new
1. Ouvre https://bolt.new/ et crée un projet web.
2. Utilise l'import de projet/ZIP si disponible, ou dépose les fichiers de ce dossier dans le projet Bolt.
3. Lance `npm install`, puis `npm run dev`.
4. Déploie la fonction Supabase `generate-video` dans le projet Supabase `hwvntotkozangzgwnxzk`.

## Activation réelle du moteur vidéo
Dans Supabase > Edge Functions > Secrets, ajoute `FAL_KEY` avec une clé créée sur https://fal.ai/dashboard/keys . Ne mets jamais cette clé dans le code navigateur ou dans le chat.

Déploiement avec Supabase CLI :
```
supabase link --project-ref hwvntotkozangzgwnxzk
supabase secrets set FAL_KEY=ta_cle_fal
supabase functions deploy generate-video --no-verify-jwt
```
Dans l'application, ouvre Paramètres et renseigne :
- URL : `https://hwvntotkozangzgwnxzk.supabase.co`
- clé publique anon/publishable de Supabase (Settings > API)

## Important — coûts et limites
- Le code appelle `fal-ai/wan/v2.2-5b/text-to-video`, modèle annoncé pour des clips jusqu'à 5 secondes en 720p. La génération via fal.ai est un service facturé selon son tarif courant; il n'y a pas de génération illimitée gratuite garantie.
- Le sélecteur 10/15/30 secondes est une intention d'interface; le moteur actuellement intégré génère un clip d'environ 5 secondes. Le montage multi-clips, musique intégrée, authentification, sauvegarde cloud et publication YouTube/Instagram ne sont pas encore implémentés.
- Les projets et paramètres sont conservés localement dans le navigateur. La vidéo est montrée via l'URL retournée par fal; prévoir un stockage durable si on veut conserver les fichiers à long terme.
- Cette base n'est pas déployée. Les étapes de déploiement et les secrets sont nécessaires avant le premier vrai rendu.
