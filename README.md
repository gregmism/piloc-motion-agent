# Piloc × Genius — Motion Agent

Agent de création vidéo marketing automatisé pour Piloc. Tu fournis un prototype HTML et un scénario, l'agent produit une vidéo animée prête à publier sur LinkedIn ou YouTube — avec voix off optionnelle, boucle de feedback intégrée, et rendu automatique.

---

## Ce que tu peux produire

| Format | Dimensions | Durée | Usage |
|--------|-----------|-------|-------|
| LinkedIn 16:9 | 1920×1080 | 20–45s | Feed LinkedIn, sous-titres automatiques |
| LinkedIn 1:1 | 1080×1080 | 20–45s | Carré LinkedIn, rendu en même temps que le 16:9 |
| YouTube 16:9 | 1920×1080 | 45–90s | YouTube, démo longue forme |
| YouTube Shorts | 1080×1920 | 15–60s | Shorts verticaux |

**Style visuel :** dark navy (`#0E1029`), cartes blanches flottantes, typographie bold, palette accent bleue (`#9DB8EE`). Pas de screenshot — tout est reconstruit en TypeScript/Remotion depuis les données du prototype.

**Voix off (optionnel) :** narration ElevenLabs générée scène par scène, synchronisée frame par frame avec les animations.

---

## Processus de production — vue d'ensemble

```
[Tu fournis]          [L'agent fait]              [Tu valides / reçois]

Prototype HTML   →   Phase 0 : Intake (musique?)   →  Story map
+ Scénario           Phase 1 : Analyse
                     Phase 2 : Storyboard           →  ✋ Approbation storyboard
                     Phase 3.5 : Pré-plan tech
                     Phase 4 : Code TSX + rendu     →  Vidéo MP4 dans out/
                     Phase 5 : Feedback layers      →  ✋ Validation 5 couches
                                                    →  ✅ Vidéo prête à publier
```

---

## Étape 1 — Ce que tu prépares

### Fichier d'entrée

Dépose dans le dossier `in/` **au moins un** des éléments suivants :

| Format | Quoi mettre | Exemple |
|--------|------------|---------|
| `.html` | Export du prototype Piloc (page complète) | `prototype-campagnes.html` |
| `.png` / `.jpg` | Captures d'écran de l'interface | `dashboard.png`, `detail-panel.png` |

L'agent lit les vraies données du prototype (montants, noms, statuts, KPIs) et les utilise tels quels dans la vidéo. Pas de Lorem ipsum.

### Musique (optionnel)

Dépose un fichier audio dans `in/music/` (formats supportés : mp3, wav, m4a, flac, ogg). L'agent liste les tracks disponibles au démarrage et te propose de choisir.

```
in/
├── music/
│   └── ma-track.mp3    ← dépose ici
└── prototype.html
```

**Ce que la musique change :**
- Les timecodes de la timeline s'alignent automatiquement sur les beats et les bars de la track (BPM détecté)
- Les scènes entrent sur les bars, les actions clés sur les phrases musicales
- Le stagger des éléments UI est calé sur le rythme

**Analyser une track manuellement :**

```bash
node scripts/extract-bpm.js                      # liste toutes les tracks dans in/music/
node scripts/extract-bpm.js in/music/ma-track.mp3  # analyse une track spécifique
```

Exemple de sortie (128 BPM) :

```json
{
  "bpm": 128,
  "fps": 30,
  "beat_frames": 14,
  "bar_frames": 56,
  "phrase_frames": 224
}
```

Si tu ne veux pas de musique, l'agent applique les valeurs de dwell par défaut (25f minimum entre événements).

### Le prompt de démarrage

Lance l'agent (`claude`) et décris ton scénario en une ou deux phrases :

```
Crée une vidéo LinkedIn pour la fonctionnalité Campagnes.
Le scénario : un responsable recouvrement lance une campagne SMS sur
ses 12 impayés les plus anciens et voit le taux de réponse monter en temps réel.
Voix off : Non.
```

**Paramètres utiles à préciser :**
- Plateforme cible : `LinkedIn` ou `YouTube`
- Musique : `Oui` (l'agent liste les tracks disponibles) ou `Non`
- Voix off : `Oui` (ElevenLabs) ou `Non`
- Durée souhaitée : `courte (20s)`, `standard (35s)`, `longue (60s)`
- Langue de la narration si voix off : `Français`

---

## Étape 2 — Le storyboard (tu approuves)

L'agent produit un storyboard complet avec :
- Arc narratif en 4 beats (Contexte → Walkthrough → Action clé → CTA)
- Objet `TL` avec tous les timecodes nommés
- Liste des overlays texte
- Choix d'architecture (Camera A ou Frame-based B)

**Tu réponds :**
- ✅ `Approuvé` — l'agent passe au code
- 🔄 `Révise — [décris les changements]` — l'agent itère le storyboard

> C'est le seul moment où tu valides la structure avant que le code soit écrit. Prends le temps de vérifier l'ordre des scènes et le message du CTA.

---

## Étape 3 — Génération et rendu (automatique)

Une fois le storyboard approuvé, l'agent :

1. Écrit le pré-plan technique (timings, spec animations)
2. Lit les règles Remotion nécessaires
3. Génère le fichier `remotion/src/[Feature]Demo.tsx`
4. Enregistre la composition dans `src/index.tsx`
5. Lance le rendu automatiquement :

```bash
# Commande exécutée par l'agent
npx remotion render src/index.tsx [CompositionId] ../out/YYYY-MM-DD-feature-li.mp4 --crf=8
```

**Sortie :** fichier(s) MP4 dans `out/`. Pour LinkedIn, deux fichiers sont rendus : 16:9 + 1:1 carré.

---

## Étape 4 — Voix off ElevenLabs (optionnel)

Si tu as demandé une voix off, l'agent génère un fichier MP3 par scène via ElevenLabs, les dépose dans `remotion/public/voiceover/[comp]/`, puis les synchronise frame par frame dans la composition via `<Sequence>/<Audio>`.

**Pour activer :**

1. Crée un compte ElevenLabs et récupère ta clé API
2. Édite `.env` à la racine du projet :
   ```
   ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxx
   ```
3. Précise `Voix off : Oui` dans ton prompt de démarrage

**Voix disponible sans abonnement payant :** Adam (`pNInz6obpgDQGcFmaJgB`). Les voix de la bibliothèque ElevenLabs nécessitent un plan payant.

> **Note LinkedIn :** 85% des vidéos LinkedIn sont regardées sans son. Les sous-titres et overlays texte sont générés automatiquement — la vidéo fonctionne toujours sans voix off.

---

## Étape 5 — Boucle de feedback (en français)

Après chaque rendu, l'agent envoie ce message et attend ton retour :

```
✅ Rendu terminé — out/2026-03-16-campagnes-li.mp4
   32s · 1920×1080 · 960 frames @ 30fps

Ouvre le fichier. Je vais recueillir ton feedback couche par couche :

  1 · NARRATION   — arc narratif, scènes présentes, ordre des scènes
  2 · DESIGN      — mise en page des cartes, couleurs, hiérarchie typo
  3 · CONTENU     — valeurs des données, labels, textes, message CTA
  4 · RYTHME      — vitesse générale, temps de dwell, zones mortes
  5 · ANIMATION   — ressenti des springs, stagger, transitions

On valide dans cet ordre par défaut — chaque couche s'appuie sur la précédente.
Tu peux sauter directement à n'importe quelle couche si les précédentes te conviennent.

→ Par quelle couche tu veux commencer ? Ou décris ce que tu as remarqué.
```

### Comment utiliser le feedback

**Commencer par le début** (parcours standard) :
> « La narration me convient. Le design aussi. Sur le contenu : le KPI "Taux de réponse" affiche 34%, ça devrait être 41%. »

→ L'agent corrige la valeur, re-rend, et revient à la couche Contenu pour valider.

**Sauter directement à une couche** (si les premières sont déjà bonnes) :
> « Narration, design et contenu c'est bon. Par contre le rythme est trop rapide sur la scène du tableau. »

→ L'agent ouvre directement la couche Rythme et ajuste les valeurs `TL`.

**Décrire librement** (sans se préoccuper des couches) :
> « Le texte du CTA est trop petit et la transition entre la scène 2 et 3 est abrupte. »

→ L'agent identifie lui-même les couches concernées (Design + Animation) et traite les deux.

### Trois types de correction

| Type | Délai | Exemples |
|------|-------|---------|
| **Rapide** | Re-render ~3min | Valeur incorrecte, texte à changer, timing trop rapide, couleur off |
| **Révision** | Approbation mini-storyboard + re-render | Scène manquante, mise en page à restructurer |
| **Refonte** | Nouveau storyboard complet | Narration complètement différente |

Une fois toutes les couches validées, l'agent confirme :
```
✅ Toutes les couches validées — campagnes-li.mp4 est prêt à publier.
```

---

## Installation et démarrage

### 1. Prérequis

- **Node.js 18+** — télécharge la version LTS sur [nodejs.org](https://nodejs.org/)
- **VS Code** — télécharge sur [code.visualstudio.com](https://code.visualstudio.com/)
- **Compte Claude Pro ou Max** — [claude.ai](https://claude.ai/)

### 2. Cloner le projet

```bash
git clone https://github.com/gregmism/piloc-motion-agent
cd piloc-motion-agent
./setup.sh
```

Le script installe Claude Code, les dépendances Remotion et crée les dossiers `in/` et `out/`.

### 3. Ouvrir le projet dans VS Code

Lance VS Code, puis ouvre le dossier du projet :
- **File → Open Folder…** → sélectionne le dossier `piloc-motion-agent`

### 4. Installer le plugin Claude Code

Dans VS Code, ouvre l'onglet Extensions (`⇧⌘X` sur Mac, `Ctrl+Shift+X` sur Windows) et recherche **Claude Code**. Installe l'extension Anthropic.

Au premier lancement, une fenêtre de navigateur s'ouvre pour connecter ton compte Claude — pas de clé API à copier.

### 5. Ouvrir une conversation avec l'agent

Une fois le plugin installé, ouvre le panneau Claude Code dans VS Code. L'agent charge automatiquement les instructions du projet (`CLAUDE.md`) — il est prêt à produire ta vidéo.

---

## Suivi des bugs

L'agent enregistre automatiquement les erreurs techniques dans une base de données centralisée. Tu n'as rien à faire — ça se passe en arrière-plan.

**Quand un bug est enregistré :**
- L'agent détecte un comportement clairement incorrect (render qui crashe, animation cassée, données incorrectes) et propose de le signaler
- Ou tu dis explicitement "signale ce bug" / "c'est une erreur"

**Ce qui est enregistré :** l'identifiant de la composition, ta plainte, le contexte, et si le bug a été résolu en session — la solution et l'explication.

**Où voir les bugs :** Grégoire accède à tous les bugs de tous les projets depuis son dashboard. Il reproduit, corrige les règles de l'agent, et pousse la mise à jour. Tu récupères la correction avec `git pull`.

> L'agent ne modifie jamais ses propres règles — il documente uniquement.

---

## Mémoire de l'agent

L'agent se souvient des décisions prises au fil des sessions. Sa mémoire est stockée dans **`memory/MEMORY.md`**, dans ce repo — elle voyage avec le projet et est visible par tout le monde.

```
memory/
└── MEMORY.md   ← l'agent écrit ici après chaque vidéo approuvée
```

**Ce qu'il mémorise :** uniquement les décisions non évidentes — une préférence de timing qui s'écarte des valeurs par défaut, un choix de mise en scène validé, une contrainte plateforme découverte en session.

**Ce qu'il ne mémorise pas :** les règles déjà dans `CLAUDE.md`, les données des prototypes, les corrections ponctuelles.

> Tu peux lire, corriger ou supprimer des entrées directement dans `memory/MEMORY.md`. L'agent relit ce fichier au démarrage de chaque conversation.

---

## Structure du projet

```
├── in/                    ← Tes fichiers HTML / screenshots (ignoré par git)
│   └── music/             ← Tracks audio pour beat-sync (mp3, wav…)
├── out/                   ← Vidéos rendues (ignoré par git)
├── memory/
│   └── MEMORY.md          ← Mémoire persistante de l'agent (lisible et modifiable)
├── remotion/
│   ├── src/               ← Compositions TSX générées par l'agent
│   └── public/music/      ← Copies des tracks utilisées dans les compositions
├── scripts/
│   └── extract-bpm.js     ← Analyse BPM d'une track audio
├── references/            ← Style guide, patterns, art direction
├── .agents/skills/        ← Règles Remotion chargées automatiquement
├── docs/                  ← Guides d'utilisation détaillés
└── CLAUDE.md              ← Instructions de l'agent (ne pas modifier)
```

---

## Render manuel

Pour re-rendre une composition existante sans relancer l'agent :

```bash
cd remotion
npx remotion render src/index.tsx [CompositionId] ../out/ma-video.mp4 --crf=8
```

---

## Mise à jour

```bash
cd piloc-motion-agent
git pull
```

Met à jour les instructions de l'agent, les patterns de code et les règles Remotion. Tes fichiers (`in/`, `out/`, `.env`) ne sont jamais touchés.

---

## Dépannage

L'agent vérifie l'environnement au démarrage de chaque conversation et t'indique exactement quoi faire si quelque chose manque. Voici les problèmes les plus courants :

| Problème | Solution |
|---------|---------|
| Node.js non installé | Télécharge la version LTS sur [nodejs.org](https://nodejs.org/) puis relance VS Code |
| Dépendances Remotion manquantes | `cd remotion && npm install` |
| Règles Remotion manquantes (`.agents/`) | `./setup.sh` depuis la racine du projet |
| Fichiers `references/` manquants | `git pull` depuis la racine du projet |
| Dossiers `in/` ou `out/` absents | L'agent les crée automatiquement |
| Mauvais dossier ouvert dans VS Code | **File → Open Folder** → sélectionner `piloc-motion-agent` |
| L'agent ne répond pas | Vérifier que le plugin Claude Code est installé et connecté |

---

## Documentation détaillée

| Guide | Description |
|---|---|
| [Prise en main](docs/01-prise-en-main.md) | Prompts, exemples, paramètres |
| [Animations disponibles](docs/02-animations.md) | Catalogue complet |
| [Structure du projet](docs/03-structure.md) | Fichiers, compositions, render |
