# Structure du projet

## Installation (nouvel utilisateur)

### Prérequis
- [Claude Code](https://claude.ai/code) installé et connecté à un compte Claude
- [Node.js](https://nodejs.org) v18 ou supérieur
- [ffmpeg](https://ffmpeg.org) installé (`brew install ffmpeg` sur Mac)

### Étapes

**1. Cloner le dépôt**
```bash
git clone [url-du-repo]
cd [nom-du-repo]
```

**2. Installer les dépendances Remotion**
```bash
cd remotion
npm install
cd ..
```

**3. Configurer la clé API** *(uniquement si tu veux la voix off)*
```bash
cp .env.example .env
# Ouvre .env et remplace sk_xxx par ta vraie clé ElevenLabs
```

**4. Créer les dossiers de travail**
```bash
mkdir in out
```

**5. Lancer Claude Code**
```bash
claude
```

C'est tout. L'agent lit `CLAUDE.md` automatiquement au démarrage.

---

## Arborescence

```
.
├── README.md                  ← Point d'entrée
├── CLAUDE.md                  ← Instructions de l'agent (ne pas modifier)
│
├── in/                        ← Dépose ici tes fichiers HTML et screenshots
├── out/                       ← Les vidéos rendues apparaissent ici
│
├── docs/                      ← Cette documentation
│   ├── 01-prise-en-main.md
│   ├── 02-animations.md
│   └── 03-structure.md
│
├── references/                ← Bibliothèque de l'agent (ne pas modifier)
│   ├── patterns               ← Tous les patterns de code réutilisables
│   ├── output                 ← Standards de storyboard
│   ├── html_to_tsx             ← Guide de conversion HTML → TSX
│   └── cinematic              ← Guide pour les styles cinématiques
│
└── remotion/                  ← Code source des vidéos
    ├── src/
    │   ├── index.tsx          ← Registre de toutes les compositions
    │   ├── fonts.ts           ← Chargement de la police Inter
    │   ├── Icons.tsx          ← Logo Piloc + icônes SVG
    │   └── [Feature]Demo.tsx  ← Un fichier par vidéo
    └── public/
        └── voiceover/         ← Fichiers MP3 des voix off (si activées)
```

---

## Les dossiers clés

### `in/`
Le dossier d'entrée. L'agent lit automatiquement ce qu'il contient en Phase 1. Dépose-y :
- Le `.html` du prototype — contient les données, les états, la structure de l'app
- Des `.png` / `.jpg` — utiles pour montrer un état particulier ou un écran difficile à déduire du HTML

Pas besoin de préciser le chemin dans ton prompt — l'agent sait où chercher.

### `out/`
Les vidéos rendues. Format de nommage : `YYYY-MM-DD-nom-de-la-feature.mp4`. Chaque render est un nouveau fichier — rien n'est écrasé.

### `remotion/src/`
Le code source. Un seul fichier par vidéo, auto-suffisant — toutes les données, animations et composants sont dedans. Pas de dépendances croisées entre les fichiers vidéo.

### `references/`
La bibliothèque interne de l'agent. Contient les patterns de code, les standards de qualité et les guides de conversion. L'agent lit ces fichiers avant d'écrire du code. **Ne pas modifier** — toute modification peut dégrader la qualité des vidéos générées.

---

## Le fichier `index.tsx`

C'est le registre central. Chaque vidéo doit y être déclarée pour être visible dans le Studio Remotion et rendable en ligne de commande.

```tsx
<Composition
  id="CampagnesDemo"           // ID utilisé dans la commande render
  component={CampagnesDemo}   // Le composant TSX
  fps={30}                    // 30 frames par seconde
  width={1920}                // Largeur en pixels
  height={1080}               // Hauteur en pixels
  durationInFrames={1502}     // Durée totale (1502 / 30 = ~50s)
/>
```

**Règle :** l'`id` est toujours identique au nom du fichier sans l'extension `.tsx`.

### Correspondance actuelle

| Fichier | ID | Durée | Plateforme |
|---|---|---|---|
| `CampagnesDemo.tsx` | `CampagnesDemo` | ~50s | YouTube |
| `PaiementsEchelonnesLIDemo.tsx` | `PaiementsEchelonnesLIDemo` | ~40s | LinkedIn 16:9 |
| `PaiementsEchelonnesLIDemo.tsx` | `PaiementsEchelonnesLIDemo-Square` | ~40s | LinkedIn 1:1 |
| `PaiementsEchelonnesYT2Demo.tsx` | `PaiementsEchelonnesYT2Demo` | ~50s | YouTube |
| `UtilisateursDemo.tsx` | `UtilisateursDemo` | ~40s | YouTube |

---

## Lancer un render manuellement

Depuis le dossier `remotion/` :

```bash
npx remotion render src/index.tsx [CompositionId] ../out/YYYY-MM-DD-sujet.mp4 --crf=8
```

Exemple :
```bash
npx remotion render src/index.tsx CampagnesDemo ../out/2026-03-15-campagnes.mp4 --crf=8
```

L'agent lance ce render automatiquement à la fin de la Phase 4. Tu n'as normalement pas à le faire manuellement.

**`--crf=8`** : qualité maximale. Valeur entre 0 (lossless, fichier énorme) et 51 (basse qualité). 8 est le standard pour la publication.

---

## Ouvrir le Studio Remotion

Le Studio permet de prévisualiser les compositions frame par frame dans le navigateur.

```bash
cd remotion
npx remotion studio
```

Puis ouvre `http://localhost:3000`. Toutes les compositions déclarées dans `index.tsx` sont visibles dans la sidebar.

---

## Anatomy d'un fichier `[Feature]Demo.tsx`

Chaque fichier vidéo suit toujours le même ordre interne :

```
1. Imports
2. const T          — Design tokens (couleurs, radius, shadows)
3. const TL         — Timeline (tous les keyframes nommés en frames)
4. Helpers          — fade(), fdOut(), spr(), clamp()
5. Data arrays      — Données réelles extraites du HTML
6. Composants       — Badge, KpiCard, TableRow, ProgressBar…
7. Scènes           — HeroScene, DashboardScene, DetailScene, CTAScene
8. Export principal — La composition Remotion
```

**`const TL`** est la clé de toute la vidéo. C'est un objet qui nomme chaque frame significatif :

```ts
const TL = {
  heroIn:     0,    // 0.0s — ouverture
  heroTitle:  14,   // 0.5s — titre entre
  dashIn:     90,   // 3.0s — dashboard
  kpiIn:      106,  // 3.5s — KPIs comptent
  tableIn:    130,  // 4.3s — tableau apparaît
  clickAt:    268,  // 8.9s — curseur clique
  ctaIn:      480,  // 16s  — scène finale
};
```

Ce fichier ne doit jamais être lu comme référence pour en écrire un nouveau — l'agent utilise `references/patterns` à la place.
