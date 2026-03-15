#!/usr/bin/env node
/**
 * Piloc × Campagnes — Voiceover synced par scène
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-voiceover-synced.js
 *
 * Ce script :
 *   1. Génère un clip audio ElevenLabs par scène
 *   2. Place chaque clip à la milliseconde exacte avec ffmpeg (adelay)
 *   3. Mixe la piste audio avec la vidéo rendue
 *   → out/2026-03-15-campagnes-yt-final.mp4
 *
 * TL reference (30fps):
 *   Hero       0–88     0.0–2.9s
 *   Step 1    98–318    3.3–10.6s
 *   Step 2   328–620   10.9–20.7s
 *   Step 3   630–750   21.0–25.0s
 *   Step 4   760–922   25.3–30.7s
 *   Step 5   932–1072  31.1–35.7s
 *   Dashboard 1082–1342 36.1–44.7s
 *   CTA      1352–1502  45.1–50.1s
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os   = require("os");

const API_KEY  = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam
const FPS      = 30;
const FFMPEG   = "/opt/homebrew/bin/ffmpeg";

const VIDEO_IN  = path.resolve(__dirname, "../out/2026-03-15-campagnes-yt.mp4");
const VIDEO_OUT = path.resolve(__dirname, "../out/2026-03-15-campagnes-yt-final.mp4");
const TMP_DIR   = path.join(os.tmpdir(), "piloc-vo-" + Date.now());

if (!API_KEY) {
  console.error("❌  Missing ELEVENLABS_API_KEY");
  process.exit(1);
}
if (!fs.existsSync(VIDEO_IN)) {
  console.error("❌  Video not found:", VIDEO_IN, "\n   Run the Remotion render first.");
  process.exit(1);
}

fs.mkdirSync(TMP_DIR, { recursive: true });

// ─── Script par scène ────────────────────────────────────────────────────────
// startMs = milliseconde exacte dans la vidéo où la VO doit commencer
// text = court, percutant, finit avant la scène suivante
const SEGMENTS = [
  {
    id:      "hero",
    startMs: 200,                     // frame 0 → 0ms + 200ms marge
    text:    "Relancez vos impayés. En quelques clics.",
  },
  {
    id:      "step1",
    startMs: Math.round(98 / FPS * 1000) + 400,   // ~3 700ms
    text:    "Choisissez le canal — SMS ou email — et sélectionnez un modèle.",
  },
  {
    id:      "step2",
    startMs: Math.round(328 / FPS * 1000) + 400,  // ~11 300ms
    text:    "Rédigez votre message. Cliquez sur une variable — elle s'insère instantanément.",
  },
  {
    id:      "step3",
    startMs: Math.round(630 / FPS * 1000) + 300,  // ~21 300ms
    text:    "Importez vos destinataires. Quarante-sept locataires chargés en un instant.",
  },
  {
    id:      "step4",
    startMs: Math.round(760 / FPS * 1000) + 300,  // ~25 633ms
    text:    "Chaque locataire reçoit son message personnalisé, avec son montant et son lien de paiement.",
  },
  {
    id:      "step5",
    startMs: Math.round(932 / FPS * 1000) + 300,  // ~31 367ms
    text:    "Planifiez l'envoi au moment idéal. Votre campagne est prête.",
  },
  {
    id:      "dashboard",
    startMs: Math.round(1082 / FPS * 1000) + 400, // ~36 467ms
    text:    "Les résultats arrivent. Quatre-vingt-dix-sept pourcent livrés, quarante-six pourcent de conversion. Près de deux cent mille euros recouvrés.",
  },
  {
    id:      "cta",
    startMs: Math.round(1352 / FPS * 1000) + 300, // ~45 367ms
    text:    "Piloc. Pilotez vos encaissements. Sereinement.",
  },
];

// ─── Voice settings ───────────────────────────────────────────────────────────
const VOICE_SETTINGS = {
  stability:        0.42,
  similarity_boost: 0.82,
  style:            0.28,
  use_speaker_boost: true,
};

// ─── Generate clips ───────────────────────────────────────────────────────────
async function generateClip(seg) {
  console.log(`  ▶ [${seg.id}] ${seg.startMs}ms — "${seg.text.substring(0, 50)}..."`);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key":   API_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text:           seg.text,
        model_id:       "eleven_multilingual_v2",
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }

  const buf  = Buffer.from(await res.arrayBuffer());
  const file = path.join(TMP_DIR, `${seg.id}.mp3`);
  fs.writeFileSync(file, buf);
  return file;
}

// ─── Build ffmpeg mixed audio ─────────────────────────────────────────────────
function buildMixedAudio(clips) {
  // Each clip: [i]adelay=Xms|Xms[aN]; then amix all [aN] together
  const inputs      = clips.map(c => `-i "${c.file}"`).join(" ");
  const filterParts = clips.map((c, i) =>
    `[${i}]adelay=${c.startMs}|${c.startMs},volume=1.1[a${i}]`
  );
  const mixInputs   = clips.map((_, i) => `[a${i}]`).join("");
  const mixFilter   = `${mixInputs}amix=inputs=${clips.length}:duration=longest:normalize=0[out]`;
  const filterGraph = [...filterParts, mixFilter].join("; ");
  const mixedPath   = path.join(TMP_DIR, "mixed.mp3");

  const cmd = `"${FFMPEG}" -y ${inputs} -filter_complex "${filterGraph}" -map "[out]" -ar 44100 -b:a 192k "${mixedPath}"`;
  console.log("\n🎛  Mixing audio tracks...");
  execSync(cmd, { stdio: "pipe" });
  return mixedPath;
}

// ─── Merge audio + video ──────────────────────────────────────────────────────
function mergeAudioVideo(mixedAudio) {
  console.log("🎬  Merging audio into video...");
  const cmd = `"${FFMPEG}" -y -i "${VIDEO_IN}" -i "${mixedAudio}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${VIDEO_OUT}"`;
  execSync(cmd, { stdio: "pipe" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🎙  Generating per-scene voiceover clips...\n");
  console.log(`   Voice    : ${VOICE_ID}`);
  console.log(`   Segments : ${SEGMENTS.length}`);
  console.log(`   Temp dir : ${TMP_DIR}\n`);

  const clips = [];
  for (const seg of SEGMENTS) {
    const file = await generateClip(seg);
    clips.push({ ...seg, file });
    // Brief pause to respect rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅  ${clips.length} clips generated.`);

  const mixedAudio = buildMixedAudio(clips);
  mergeAudioVideo(mixedAudio);

  // Save mixed audio separately for inspection
  const audioOut = path.resolve(__dirname, "../out/voiceover-campagnes-synced.mp3");
  fs.copyFileSync(mixedAudio, audioOut);

  console.log(`\n✅  Done!`);
  console.log(`   Video : ${VIDEO_OUT}`);
  console.log(`   Audio : ${audioOut}`);
  console.log(`\n📋  Clip timings:`);
  clips.forEach(c => {
    const s = (c.startMs / 1000).toFixed(2);
    console.log(`   ${c.id.padEnd(10)} @ ${s.padStart(6)}s`);
  });
}

main().catch(e => { console.error("\n❌ ", e.message); process.exit(1); });
