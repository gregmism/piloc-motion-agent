#!/usr/bin/env node
/**
 * extract-bpm.js — Piloc Motion Agent
 *
 * Usage:
 *   node scripts/extract-bpm.js                       → list tracks in in/music/
 *   node scripts/extract-bpm.js in/music/track.mp3    → analyze and output JSON
 *
 * Output JSON:
 *   {
 *     file: "track.mp3",
 *     bpm: 128,
 *     fps: 30,
 *     beat_frames: 14,       ← 1 beat = N frames at 30fps
 *     half_bar_frames: 28,   ← 2 beats
 *     bar_frames: 56,        ← 4 beats = 1 bar
 *     two_bars: 112,         ← 8 beats — natural scene transition window
 *     phrase_frames: 224,    ← 16 beats = 1 musical phrase
 *   }
 *
 * Agent usage:
 *   Snap TL keyframes to multiples of beat_frames.
 *   Use bar_frames for scene transitions.
 *   Use phrase_frames for major narrative beats (Beat 1→2, Beat 2→3).
 *
 * Dependencies (install once from project root):
 *   npm install
 */

const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '..', 'in', 'music');
const SUPPORTED = /\.(mp3|wav|aac|m4a|flac|ogg)$/i;
const FPS = 30;

// ── helpers ──────────────────────────────────────────────────────────────────

function snapToGrid(frames, unit) {
  return Math.round(frames / unit) * unit;
}

function requireOrExit(pkg) {
  try {
    return require(pkg);
  } catch {
    console.error(`\n❌  Missing dependency: ${pkg}`);
    console.error(`    Run from the project root:  npm install\n`);
    process.exit(1);
  }
}

// ── list ─────────────────────────────────────────────────────────────────────

function listTracks() {
  if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
    console.log('📂  in/music/ created — drop your tracks there.');
    return;
  }

  const files = fs.readdirSync(MUSIC_DIR).filter(f => SUPPORTED.test(f));

  if (files.length === 0) {
    console.log('📭  in/music/ is empty.\n    Drop .mp3 / .wav / .m4a files there, then run:');
    console.log('    node scripts/extract-bpm.js in/music/<filename>');
  } else {
    console.log(`🎵  ${files.length} track(s) available in in/music/:\n`);
    files.forEach((f, i) => console.log(`  ${i + 1}.  ${f}`));
    console.log('\nAnalyze:  node scripts/extract-bpm.js in/music/<filename>');
  }
}

// ── analyze ───────────────────────────────────────────────────────────────────

async function analyzeBpm(filePath) {
  const MusicTempo = requireOrExit('music-tempo');
  const { AudioContext } = requireOrExit('node-web-audio-api');

  if (!fs.existsSync(filePath)) {
    console.error(`❌  File not found: ${filePath}`);
    process.exit(1);
  }

  if (!SUPPORTED.test(filePath)) {
    console.error(`❌  Unsupported format. Use: mp3, wav, aac, m4a, flac, ogg`);
    process.exit(1);
  }

  console.error(`🔍  Analyzing ${path.basename(filePath)} …`);

  const raw = fs.readFileSync(filePath);
  const ctx = new AudioContext();

  let decoded;
  try {
    decoded = await ctx.decodeAudioData(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
    );
  } catch (e) {
    console.error(`❌  Could not decode audio: ${e.message}`);
    await ctx.close();
    process.exit(1);
  }

  // Use mono mix of all channels for better accuracy
  const numChannels = decoded.numberOfChannels;
  const length = decoded.length;
  const mixed = new Float32Array(length);
  for (let c = 0; c < numChannels; c++) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < length; i++) mixed[i] += ch[i] / numChannels;
  }

  const mt = new MusicTempo(mixed);
  await ctx.close();

  const bpm = Math.round(mt.tempo * 10) / 10;

  const beat_frames      = Math.round(FPS * 60 / bpm);
  const half_bar_frames  = beat_frames * 2;
  const bar_frames       = beat_frames * 4;
  const two_bars         = beat_frames * 8;
  const phrase_frames    = beat_frames * 16;

  const result = {
    file:             path.basename(filePath),
    bpm,
    fps:              FPS,
    beat_frames,
    half_bar_frames,
    bar_frames,
    two_bars,
    phrase_frames,
    usage: {
      scene_transition: `bar_frames (${bar_frames}f) — snap sceneIn to multiples`,
      narrative_beat:   `phrase_frames (${phrase_frames}f) — Beat 1→2, Beat 2→3 transitions`,
      stagger_unit:     `Math.round(beat_frames / 4) = ${Math.round(beat_frames / 4)}f per item`,
      dwell_minimum:    `bar_frames (${bar_frames}f) — replaces the 20f minimum when music is set`,
    }
  };

  // Pretty print to stdout (agent reads this)
  console.log(JSON.stringify(result, null, 2));
}

// ── entry point ───────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg) {
  listTracks();
} else {
  const filePath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  analyzeBpm(filePath).catch(e => {
    console.error('❌', e.message);
    process.exit(1);
  });
}
