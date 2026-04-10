#!/usr/bin/env node
// Generate ElevenLabs voiceover for CampagnesCreationYTDemo
// Usage: node scripts/generate-voiceover-campagnes-creation-yt.js
// Requires: ELEVENLABS_API_KEY in .env at project root

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env
try {
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
} catch {
  console.error("❌ .env not found at project root");
  process.exit(1);
}

const API_KEY  = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam (free)
const OUT_DIR  = join(ROOT, "remotion/public/voiceover/CampagnesCreationYTDemo");

if (!API_KEY) {
  console.error("❌ ELEVENLABS_API_KEY not set");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const SCENES = [
  {
    id: "hero",
    text: "Dans les services essentiels, relancer les impayés prend du temps. Et chaque minute compte.",
  },
  {
    id: "param",
    text: "Nommez votre campagne, choisissez le canal — SMS ou email — et sélectionnez un modèle existant.",
  },
  {
    id: "template",
    text: "Insérez vos variables dynamiques : montant, référence, lien de paiement. Piloc remplace tout automatiquement, pour chaque usager.",
  },
  {
    id: "donnees",
    text: "Importez votre fichier CSV, puis planifiez l'envoi. Piloc vous indique le créneau optimal pour maximiser le taux de réponse.",
  },
  {
    id: "dashboard-kpis",
    text: "Une fois la campagne lancée, suivez vos performances en temps réel. Taux de délivrance, conversions, montants encaissés.",
  },
  {
    id: "dashboard-table",
    text: "Campagne par campagne, vous savez exactement ce qui a été envoyé, ouvert, et encaissé.",
  },
  {
    id: "cta",
    text: "Piloc. Le paiement au service de ceux qui servent.",
  },
];

async function generateScene(scene) {
  console.log(`  → Generating ${scene.id}…`);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: scene.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error for ${scene.id}: ${res.status} ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = join(OUT_DIR, `${scene.id}.mp3`);
  writeFileSync(outPath, buffer);
  console.log(`     ✅ ${outPath}`);
}

async function main() {
  console.log(`\n🎙  Generating voiceover for CampagnesCreationYTDemo`);
  console.log(`   Voice ID : ${VOICE_ID}`);
  console.log(`   Output   : ${OUT_DIR}\n`);

  for (const scene of SCENES) {
    await generateScene(scene);
  }

  console.log("\n✅ All clips generated. Run the render when ready:\n");
  console.log(
    "   cd remotion && npx remotion render src/index.tsx CampagnesCreationYTDemo ../out/$(date +%Y-%m-%d)-campagnes-creation-yt.mp4 --crf=18\n"
  );
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
