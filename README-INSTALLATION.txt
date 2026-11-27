OUISTI’TEAM COMPANION — VERSION 0.2
==================================

CONTENU DU PACK
- panel.html : panneau visible par les spectateurs
- mobile.html : version mobile du panneau
- config.html : page de configuration du streamer
- app.js : affichage des rubriques et lecture de la configuration Twitch
- config.js : formulaire et enregistrement des données sur Twitch
- styles.css : habillage graphique responsive
- assets/logo.png : logo 100 x 100 px
- assets/icon-24x24.png : icône de barre des tâches 24 x 24 px
- assets/vignette-300x200.png : vignette de découverte 300 x 200 px

IMPORTANT AVANT INSTALLATION
Ce pack est une version front-end fonctionnelle qui utilise le service de configuration Twitch. Il ne contient pas de serveur (EBS) et n'en a pas besoin pour les rubriques et données prévues ici.

ÉTAPE 1 — HÉBERGER LES FICHIERS
1. Ouvre le dépôt GitHub qui sert déjà ton site jordybala.github.io.
2. Ajoute les fichiers de ce pack à la racine du dépôt, en conservant le dossier assets/.
3. Ne supprime pas les fichiers déjà présents (notamment ceux de la politique de confidentialité).
4. Valide les changements (Commit changes) et attends la mise à jour de GitHub Pages.

ÉTAPE 2 — CONFIGURER TWITCH DEVELOPER
Dans la version de ton extension, renseigne :
- Base URI : https://jordybala.github.io/ (à confirmer selon l'adresse exacte de ton GitHub Pages)
- Panel Viewer Path : panel.html
- Mobile Panel Path : mobile.html (si ce champ est proposé)
- Config Path : config.html
- Type d'extension : Panel
- Configuration : Extension Configuration Service

Les chemins sont relatifs à la Base URI. Celle-ci doit se terminer par /.

ÉTAPE 3 — DONNÉES
Dans l'onglet de configuration de l'extension, complète les rubriques puis clique sur « Enregistrer sur Twitch ».
Les informations sont stockées dans le segment broadcaster de Twitch. La limite Twitch est de 5 Ko. Les visiteurs peuvent lire ces informations, mais seul le propriétaire de la chaîne doit utiliser la page de configuration pour les modifier.

ÉTAPE 4 — TEST
Teste d'abord l'extension en mode développement / aperçu dans Twitch. Vérifie le panneau, les six onglets et le bouton de copie des codes de decks. Ne publie pas l'extension avant d'avoir validé l'affichage sur ordinateur et mobile.

DONNÉES INITIALES
Le compagnon propose Dodo Ier comme roi actuel et Poulmorte Ier dans les anciens rois, conformément aux dernières informations données pour le Temple des Kings. Le planning, les decks et les tournois sont laissés vides pour éviter d'afficher de fausses dates ou de faux codes. Les liens sociaux peuvent être complétés dans la configuration.

NOTE
La vignette 300 x 200 est fournie comme visuel de découverte pour le portail Twitch. Le logo du pack est bien en 100 x 100 px. L’icône 24 x 24 est également fournie séparément dans assets/icon-24x24.png. Le champ d’icône de barre des tâches ne concerne que certains formats d’extension.
