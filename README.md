# Piloc × Genius — Motion Agent

Agent de création vidéo marketing automatisé. Tu fournis un prototype HTML ou des captures d'écran, l'agent produit une vidéo animée prête à publier sur LinkedIn ou YouTube.

---

## Prérequis

| Outil | Version | Installation |
|---|---|---|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) — prends la version LTS |
| **Claude Code** | dernière | installé automatiquement par `setup.sh` |
| **Clé API Anthropic** | — | [console.anthropic.com](https://console.anthropic.com/) |

> **Voix off (optionnel)** — clé ElevenLabs si tu veux une narration générée automatiquement. Le rendu fonctionne sans.

---

## Installation (une seule fois)

```bash
git clone https://github.com/[ton-org]/piloc-motion-agent
cd piloc-motion-agent
./setup.sh
```

Le script installe Claude Code, les dépendances Remotion, et crée les dossiers `in/` et `out/`.

### Configurer ta clé Anthropic

```bash
claude config set api_key sk-ant-XXXXXXXXXXXXXXXX
```

---

## Utilisation

```bash
# 1. Dépose ton prototype dans in/
cp mon-prototype.html in/

# 2. Lance l'agent
claude

# 3. Décris ton scénario (voir docs/01-prise-en-main.md pour les templates)
```

L'agent te demandera de valider le storyboard, puis génère la vidéo dans `out/`.

---

## Structure du projet

```
├── in/                    ← Tes fichiers HTML / screenshots (ignoré par git)
├── out/                   ← Vidéos rendues (ignoré par git)
├── remotion/src/          ← Compositions TSX générées par l'agent
├── references/            ← Style guide, patterns, art direction
├── .agents/skills/        ← Règles Remotion chargées automatiquement
├── docs/                  ← Guides d'utilisation
└── CLAUDE.md              ← Instructions de l'agent (ne pas modifier)
```

---

## Documentation

| Guide | Description |
|---|---|
| [Prise en main](docs/01-prise-en-main.md) | Prompts, exemples, paramètres |
| [Animations disponibles](docs/02-animations.md) | Catalogue complet |
| [Structure du projet](docs/03-structure.md) | Fichiers, compositions, render |

---

## Voix off ElevenLabs (optionnel)

Édite `.env` et ajoute ta clé :

```
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxx
```

Puis précise `Voix off : Oui` dans ton prompt. L'agent génère et synchronise l'audio automatiquement.

---

## Render manuel

Si tu veux re-rendre une composition existante sans relancer l'agent :

```bash
cd remotion
npx remotion render src/index.tsx [CompositionId] ../out/ma-video.mp4 --crf=8
```
