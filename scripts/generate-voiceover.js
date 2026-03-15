#!/usr/bin/env node
/**
 * Piloc × Campagnes — ElevenLabs voiceover generator
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-voiceover.js
 *
 * Output: out/voiceover-campagnes.mp3
 * Then add <Audio src={staticFile("voiceover-campagnes.mp3")} /> in CampagnesDemo.tsx
 * and copy the file to remotion/public/.
 *
 * Timing reference (30fps):
 *   Hero       0–88    (0.0–2.9s)
 *   Step 1    98–318   (3.3–10.6s)
 *   Step 2   328–620  (10.9–20.7s)
 *   Step 3   630–750  (21.0–25.0s)
 *   Step 4   760–922  (25.3–30.7s)
 *   Step 5   932–1072 (31.1–35.7s)
 *   Dashboard 1082–1342 (36.1–44.7s)
 *   CTA      1352–1502 (45.1–50.1s)
 *
 * Voice recommendation: "Rachel" (en-US, warm & confident) or "Bella" fr-FR.
 * Adjust VOICE_ID below to your preferred ElevenLabs voice.
 */

const fs   = require("fs");
const path = require("path");

const API_KEY  = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam (free tier)

if (!API_KEY) {
  console.error("❌  Missing ELEVENLABS_API_KEY environment variable.");
  process.exit(1);
}

// ─── Voiceover script ───────────────────────────────────────────────────────
// One continuous take, ~48s. Light, professional, charming.
// Written in French to match the UI.
const SCRIPT = `
Avec Piloc, lancer une campagne de relance en impayés,
c'est une affaire de minutes.

Donnez un nom à votre campagne, choisissez le canal —
SMS ou email — et sélectionnez le modèle qui correspond à votre situation.

Passons au message. Rédigez votre texte directement,
et insérez des variables personnalisées en un seul clic.
Nom du locataire, montant, lien de paiement —
chaque destinataire recevra un message qui lui parle.

Vos données sont déjà là. Importez simplement votre liste via CSV —
quarante-sept locataires chargés et prêts en quelques secondes.

Un aperçu en temps réel vous montre exactement
ce que chaque personne va recevoir. Rien n'est laissé au hasard.

Planifiez l'envoi : date, heure, confirmation.
Votre campagne est programmée.

Et les résultats arrivent : quatre-vingt-dix-sept pourcent livrés,
quarante-six pourcent de conversion,
près de deux cent mille euros recouvrés sur la campagne.

Piloc. Pilotez vos encaissements. Sereinement.
`.trim();

// ─── API call ───────────────────────────────────────────────────────────────
async function generate() {
  console.log("🎙  Generating voiceover via ElevenLabs...");
  console.log(`   Voice ID : ${VOICE_ID}`);
  console.log(`   Script   : ${SCRIPT.length} chars\n`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key":   API_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text: SCRIPT,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability:        0.45,   // slight variation — more natural
          similarity_boost: 0.80,
          style:            0.30,   // a touch of expressiveness
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("❌  ElevenLabs API error:", response.status, err);
    process.exit(1);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const outDir = path.resolve(__dirname, "../out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "voiceover-campagnes.mp3");
  fs.writeFileSync(outPath, buffer);

  const publicPath = path.resolve(__dirname, "../remotion/public/voiceover-campagnes.mp3");
  fs.copyFileSync(outPath, publicPath);

  console.log(`✅  Saved to:`);
  console.log(`   ${outPath}`);
  console.log(`   ${publicPath}`);
  console.log(`\n📌  Next step — add to CampagnesDemo.tsx main composition:`);
  console.log(`   import { Audio, staticFile } from "remotion";`);
  console.log(`   <Audio src={staticFile("voiceover-campagnes.mp3")} />`);
}

generate().catch((e) => { console.error(e); process.exit(1); });
