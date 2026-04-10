# Mémoire de l'agent — Piloc Motion Agent

Ce fichier est l'index des souvenirs de l'agent. Il est mis à jour automatiquement au fil des sessions.

---

<!-- L'agent ajoute ses entrées ci-dessous, une ligne par souvenir -->

- [feedback] [Centrage vertical scènes](feedback_scene_vertical_centering.md) — Toujours justifyContent:center, jamais flex-start+paddingTop manuel
- [2026-03-18] PRÉFÉRENCE GLOBALE : ne jamais utiliser le curseur animé par défaut. Montrer les clics via l'animation bouton (spring scale, pattern #18). Curseur uniquement si demande explicite.

- [2026-03-17] CampagnesDemo : durée 2048f = 68.3s — intentionnellement plus long que la limite LinkedIn (45s). À traiter comme vidéo YouTube ou long-form. Square (1080×1080) enregistré en index.tsx le 2026-03-17, mais le composant n'utilise `useVideoConfig` que pour `fps` — adapter le layout si l'export Square est utilisé.
- [2026-03-17] PaiementsEchelonnesLIDemo : format LinkedIn 40.3s, seule composition avec Square opérationnel dès le départ (PaiementsEchelonnesLIDemo-Square). Référence pour le format Square.
- [2026-03-17] PaiementsEchelonnesYT2Demo : nom « YT2 » indique qu'il y a eu une version 1 (non conservée dans index.tsx). Durée 50.3s YouTube uniquement — pas de Square (normal pour YouTube).
- [2026-03-17] UtilisateursDemo : 1200f = 40s LinkedIn. Square (1080×1080) ajouté en index.tsx le 2026-03-17. Même remarque que CampagnesDemo : `useVideoConfig` utilisé uniquement pour `fps` — layout adaptatif à vérifier avant export Square.
- [project] [Video Registry](video-registry.md) — Index des IDs vidéo, variantes, noms de fichiers. Next available ID: 01.
