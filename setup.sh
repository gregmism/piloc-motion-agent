#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  Piloc × Genius — Motion Agent — Setup
# ─────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

print_step() { echo -e "\n${CYAN}▶ $1${RESET}"; }
print_ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
print_err()  { echo -e "${RED}✗ $1${RESET}"; }

echo -e "\n${BOLD}Piloc × Genius — Motion Agent Setup${RESET}"
echo "────────────────────────────────────"

# ── 1. Node.js ──────────────────────────────
print_step "Vérification Node.js (version 18+ requise)"

if ! command -v node &>/dev/null; then
  print_err "Node.js n'est pas installé."
  echo "  → Installe-le depuis https://nodejs.org/ (version LTS recommandée)"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  print_err "Node.js $NODE_VERSION détecté — version 18+ requise."
  echo "  → Met à jour depuis https://nodejs.org/"
  exit 1
fi

print_ok "Node.js $(node -v)"

# ── 2. Claude Code ───────────────────────────
print_step "Vérification Claude Code"

if ! command -v claude &>/dev/null; then
  print_warn "Claude Code n'est pas installé. Installation..."
  npm install -g @anthropic-ai/claude-code
  print_ok "Claude Code installé"
else
  print_ok "Claude Code $(claude --version 2>/dev/null || echo 'installé')"
fi

# ── 3. Dépendances Remotion ──────────────────
print_step "Installation des dépendances Remotion"

cd remotion
npm install --prefer-offline 2>&1 | tail -3
cd ..

print_ok "Dépendances installées"

# ── 4. Dossiers de travail ───────────────────
print_step "Création des dossiers in/ et out/"

mkdir -p in out
print_ok "Dossiers prêts"

# ── 5. Fichier .env ──────────────────────────
print_step "Configuration des variables d'environnement"

if [ ! -f .env ]; then
  cp .env.example .env
  print_warn ".env créé depuis .env.example"
  echo "  → Si tu veux la voix off ElevenLabs, édite .env et ajoute ta clé API"
else
  print_ok ".env déjà présent"
fi

# ── 6. Skills Claude Code ────────────────────
print_step "Installation du skill remotion-best-practices"

claude skills sync 2>/dev/null && print_ok "Skill remotion-best-practices installé" \
  || print_warn "Impossible d'installer le skill automatiquement. Lance manuellement : claude skills sync"

# ── 7. Résumé ────────────────────────────────
echo ""
echo -e "${BOLD}────────────────────────────────────${RESET}"
echo -e "${GREEN}${BOLD}✓ Setup terminé !${RESET}"
echo ""
echo -e "${BOLD}Pour démarrer :${RESET}"
echo ""
echo -e "  1. Dépose ton prototype HTML ou tes screenshots dans ${CYAN}in/${RESET}"
echo -e "  2. Lance l'agent :"
echo -e "       ${BOLD}claude${RESET}"
echo -e "  3. Décris ton scénario (voir ${CYAN}docs/01-prise-en-main.md${RESET})"
echo -e "  4. Valide le storyboard — la vidéo se génère dans ${CYAN}out/${RESET}"
echo ""
echo -e "  Optionnel : voix off ElevenLabs → édite ${CYAN}.env${RESET} avec ta clé"
echo ""
