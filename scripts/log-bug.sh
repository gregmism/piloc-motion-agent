#!/bin/bash
# Usage:
#   Enregistrer un bug ouvert :
#     bash scripts/log-bug.sh "slug" "plainte" "contexte"
#
#   Enregistrer un bug résolu :
#     bash scripts/log-bug.sh "slug" "plainte" "contexte" "solution" "explication"

SUPABASE_URL="https://iklwrcficjtpdkomnttd.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbHdyY2ZpY2p0cGRrb21udHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQxMTQsImV4cCI6MjA4OTI4MDExNH0.zHtm6okS5E_HXqy_mUp6RMWuREF-lrST_cCPG1Ailrw"

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
