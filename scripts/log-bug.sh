#!/bin/bash
# Usage:
#   Enregistrer un bug ouvert :
#     bash scripts/log-bug.sh "slug" "plainte" "contexte"
#
#   Enregistrer un bug résolu :
#     bash scripts/log-bug.sh "slug" "plainte" "contexte" "solution" "explication"

set -e

if [ ! -f .env ]; then
  echo "❌ Fichier .env introuvable à la racine du projet."
  exit 1
fi

source .env

SLUG="${1:-}"
PLAINTE="${2:-}"
CONTEXTE="${3:-}"
SOLUTION="${4:-}"
EXPLICATION="${5:-}"

if [ -z "$PLAINTE" ]; then
  echo "❌ La plainte est obligatoire."
  exit 1
fi

if [ -n "$SOLUTION" ]; then
  STATUT="résolu"
else
  STATUT="ouvert"
fi

PAYLOAD=$(cat <<JSON
{
  "project": "motion",
  "slug": $(echo "$SLUG" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))"),
  "plainte": $(echo "$PLAINTE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))"),
  "contexte": $(echo "$CONTEXTE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))"),
  "statut": "$STATUT",
  "solution": $(echo "$SOLUTION" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))"),
  "explication": $(echo "$EXPLICATION" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))")
}
JSON
)

HTTP_CODE=$(curl -s -o /tmp/supabase_response.json -w "%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/bugs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$PAYLOAD")

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Bug enregistré dans Supabase (statut : $STATUT)"
else
  echo "❌ Erreur Supabase ($HTTP_CODE) : $(cat /tmp/supabase_response.json)"
  exit 1
fi
