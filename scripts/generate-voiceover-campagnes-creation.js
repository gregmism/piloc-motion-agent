#!/usr/bin/env node
// Generate ElevenLabs voiceover for CampagnesCreationDemo
// Usage: node scripts/generate-voiceover-campagnes-creation.js
// Requires: ELEVENLABS_API_KEY in .env at project root

import { writeFileSync, mkdirSync } from "fs";
import { readFileSync } from "fs";
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
const OUT_DIR  = join(ROOT, "remotion/public/voiceover/CampagnesCreationDemo");
const COMP_ID  = "CampagnesCreationDemo";

if (!API_KEY) {
  console.error("❌ ELEVENLABS_API_KEY not set");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const SCENES = [
  {
    id: "hero",
    text: "Avec Piloc, relancez vos usagers avec des campagnes SMS et email ciblées — en quelques minutes.",
  },
  {
    id: "param",
    text: "Nommez votre campagne, choisissez le canal SMS, et sélectionnez un modèle adapté à votre situation.",
  },
  {
    id: "modele",
    text: "Le message se personnalise automatiquement pour chaque destinataire grâce aux variables de votre base de données.",
  },
  {
    id: "donnees",
    text: "Exportez le fichier CSV modèle, remplissez vos données, puis importez la liste de vos destinataires.",
  },
  {
    id: "apercu",
    text: "Avant l'envoi, prévisualisez exactement ce que recevra chaque locataire.",
  },
  {
    id: "planif",
    text: "Planifiez l'envoi au créneau optimal recommandé par Piloc — et confirmez en un clic.",
  },
  {
    id: "dash",
    text: "Le dashboard centralise vos résultats : taux de délivrance, de conversion, et montant encaissé par campagne.",
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
          stability: 0.52,
          similarity_boost: 0.75,
          style: 0.25,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error for ${scene.id}: ${res.status} — ${err}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = join(OUT_DIR, `${scene.id}.mp3`);
  writeFileSync(outPath, buf);
  console.log(`  ✅ ${scene.id}.mp3 (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log(`\n🎙  Generating voiceover for ${COMP_ID}`);
  console.log(`   Voice: ${VOICE_ID}`);
  console.log(`   Output: remotion/public/voiceover/${COMP_ID}/\n`);

  for (const scene of SCENES) {
    try {
      await generateScene(scene);
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ All ${SCENES.length} clips generated.\n`);
}

main();
