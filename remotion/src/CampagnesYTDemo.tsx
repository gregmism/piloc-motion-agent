import React from "react";
import {
  AbsoluteFill, Audio, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { PilocLogo } from "./Icons";
import { waitForInter } from "./fonts";

// ─── Design tokens — dark navy ─────────────────────────────────────────────
const T = {
  navy:    "#0E1029",
  mist:    "#9DB8EE",
  surface: "#ffffff",
  text:    "#112431",
  muted:   "#6b7280",
  light:   "#a4afb7",
  border:  "#e2e8f0",
  success: "#329547",
  error:   "#ec6369",
  warning: "#ffb704",
  font:    "'Inter', sans-serif",
};

const cardBase: React.CSSProperties = {
  background:   "rgba(255,255,255,0.97)",
  borderRadius: 16,
  border:       "1px solid rgba(255,255,255,0.60)",
  boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.28)",
};

// ─── Timeline — Garden Leaves 112.1 BPM @ 30fps ────────────────────────────
// beat=16f | bar=64f | phrase=256f | micro_stagger=4f
//
// Hero:         0–64     (2.1s)
// Paramétrage:  64–384   (10.7s)  — nom 80, canal 144, modèle 224, suivant 320
// Template:    384–768   (12.8s)  — pills 400, type 416, v1 480, v2 560, v3 640, v4 720
// Données:     768–1024   (8.5s)  — cards 784, download 864, drop 928, success 944
// Aperçus:    1024–1280   (8.5s)  — panels 1040, r1 1056, r2 1136, r3 1216
// Planif:     1280–1536   (8.5s)  — banner 1296, cards 1312, count 1440, clic 1488, confirm 1504
// Dashboard:  1536–2048  (17.1s)  — kpi 1568, funnel 1632, revenue 1696, table 1760, hl 1888
// CTA:        2048–2240   (6.4s)
const TL = {
  heroIn:          0,   heroLogo:   16,  heroChip:  28,  heroLine1: 36,  heroLine2: 46,  heroOut:   64,

  paramIn:        64,   paramName:  80,  paramCanal:     144, paramCanalClick: 160,
  paramModel:    224,   paramModelClick: 288, paramNext: 320, paramOut:   384,

  tplIn:         384,   tplPills:  400,  tplTypeStart:   416,
  tplVar1:       480,   tplTypeResume1: 496,
  tplVar2:       560,   tplTypeResume2: 576,
  tplVar3:       640,   tplTypeResume3: 656,
  tplVar4:       720,   tplOut:    768,

  dataIn:        768,   dataCards: 784,  dataDownload:   864, dataDrop: 928, dataSuccess: 944, dataOut: 1024,

  previewIn:    1024,   prevPanels: 1040, prevRecip1: 1056, prevRecip2: 1136, prevRecip3: 1216, previewOut: 1280,

  scheduleIn:   1280,   scheduleBanner: 1296, scheduleCards: 1312,
  scheduleCount: 1440,  schedulePlanify: 1488, scheduleConfirm: 1504, scheduleOut: 1536,

  dashIn:       1536,   dashHeadline: 1552, dashKpi:   1568, dashFunnel: 1632,
  dashRevenue:  1696,   dashTable:  1760,   dashHighlight: 1888, dashOut: 2048,

  ctaIn:        2048,   ctaLogo:  2064,  ctaChip:  2076,  ctaLine1: 2084,  ctaLine2: 2094,  ctaSub: 2128,
  totalDur:     2240,
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const fade  = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [0, 1], clamp);
const fdOut = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [1, 0], clamp);
function spr(frame: number, startAt: number, fps: number, cfg = { damping: 22, stiffness: 140 }) {
  return spring({ frame: frame - startAt, fps, config: cfg });
}

// ─── Data ──────────────────────────────────────────────────────────────────
const ROWS = [
  { name: "Stephanie HAYET",   canal: "email", units: 143, delivered: 143, paid: 71,  amount: "20 226 €" },
  { name: "Isabelle DEVROUTE", canal: "sms",   units: 251, delivered: 251, paid: 129, amount: "39 355 €" },
  { name: "Michaël KACZMAREK", canal: "sms",   units: 456, delivered: 228, paid: 104, amount: "31 644 €" },
  { name: "Sandra DACHICOURT", canal: "sms",   units: 650, delivered: 325, paid: 181, amount: "51 472 €" },
  { name: "Julie KOSZUCKI",    canal: "sms",   units: 476, delivered: 238, paid: 111, amount: "40 716 €" },
];

const KPIS = [
  { label: "SMS envoyés",  value: 1311, suffix: "",  prefix: "" },
  { label: "Campagnes",    value: 8,    suffix: "",  prefix: "" },
  { label: "Conversion",   value: 46,   suffix: "%", prefix: "" },
];

const FUNNEL = [
  { label: "Ciblé",   count: 1311, pct: 100, color: "#cbd5e1" },
  { label: "Délivré", count: 1275, pct: 97,  color: T.mist },
  { label: "Payé",    count: 814,  pct: 62,  color: T.success },
];

const RECIPS = [
  { name: "Marie DUPONT",  phone: "06 ·· ·· ·· 01", sms: "Paiement : SOCIALHAB vous invite à régler 320,00 € pour votre contrat B-2024-0892 : https://pay.piloc.io/x7k2" },
  { name: "Jean MARTIN",   phone: "06 ·· ·· ·· 02", sms: "Paiement : SOCIALHAB vous invite à régler 450,00 € pour votre contrat A-2024-1134 : https://pay.piloc.io/m9p1" },
  { name: "Fatima OUALI",  phone: "06 ·· ·· ·· 03", sms: "Paiement : SOCIALHAB vous invite à régler 185,00 € pour votre contrat C-2024-2201 : https://pay.piloc.io/r3w8" },
];

// Variable pills for template editor
const VAR_PILLS = ["agency_name", "asset_address", "payment_url", "rent_reference", "tenant_name", "payment_url_amount"];
const PILL_CLICKS: Record<string, number> = {
  agency_name:        TL.tplVar1,
  payment_url_amount: TL.tplVar2,
  rent_reference:     TL.tplVar3,
  payment_url:        TL.tplVar4,
};

// Dashboard table COL_W
const DCOL_W = ["28%", "12%", "12%", "12%", "14%", "22%"];

// ─── Cell factory ──────────────────────────────────────────────────────────
const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "10px 14px", boxSizing: "border-box" as const, flexShrink: 0,
  fontSize: 13, color: T.text, display: "flex", alignItems: "center", ...extra,
});

// ─── Typewriter helper ─────────────────────────────────────────────────────
function typewriter(frame: number, text: string, startAt: number, cps = 12, fps = 30) {
  const fpc   = fps / cps;
  const count = Math.min(text.length, Math.floor(Math.max(0, frame - startAt) / fpc));
  const cursor = count < text.length && Math.floor(frame / 7) % 2 === 0 ? "|" : "";
  return { text: text.substring(0, count), cursor, done: count >= text.length };
}

// ─── Cursor helpers ────────────────────────────────────────────────────────
interface WP { f: number; x: number; y: number }

function getCursorPos(wps: WP[], frame: number, fps: number) {
  if (frame <= wps[0].f) return { x: wps[0].x, y: wps[0].y };
  if (frame >= wps[wps.length - 1].f) return { x: wps[wps.length - 1].x, y: wps[wps.length - 1].y };
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    if (frame >= a.f && frame < b.f) {
      const s = spring({ frame: frame - a.f, fps, config: { damping: 30, stiffness: 100 } });
      return { x: interpolate(s, [0, 1], [a.x, b.x]), y: interpolate(s, [0, 1], [a.y, b.y]) };
    }
  }
  return { x: wps[wps.length - 1].x, y: wps[wps.length - 1].y };
}

// Cursor world-space positions for template scene
// Card: 1500×580px, centered → cardLeft=210, cardTop≈310
// Left panel width=300, padding=32 → col0cX=320, col1cX=484
// Pills area starts y≈594, rowH=40px → row0cY=610, row1cY=650, row2cY=690
// agency_name(row0,col0)=(320,610), payment_url_amount(row2,col1)=(484,690)
// rent_reference(row1,col1)=(484,650), payment_url(row1,col0)=(320,650)
const TPL_WPS: WP[] = [
  { f: TL.tplIn + 16,    x: 960, y: 900 },
  { f: TL.tplVar1 - 20,  x: 320, y: 610 },
  { f: TL.tplVar1,       x: 320, y: 610 },
  { f: TL.tplVar1 + 12,  x: 320, y: 610 },
  { f: TL.tplVar2 - 20,  x: 484, y: 690 },
  { f: TL.tplVar2,       x: 484, y: 690 },
  { f: TL.tplVar2 + 12,  x: 484, y: 690 },
  { f: TL.tplVar3 - 20,  x: 484, y: 650 },
  { f: TL.tplVar3,       x: 484, y: 650 },
  { f: TL.tplVar3 + 12,  x: 484, y: 650 },
  { f: TL.tplVar4 - 20,  x: 320, y: 650 },
  { f: TL.tplVar4,       x: 320, y: 650 },
  { f: TL.tplOut - 20,   x: 320, y: 650 },
];
const TPL_CLICKS = [TL.tplVar1, TL.tplVar2, TL.tplVar3, TL.tplVar4];

// Planifier button position (schedule scene card right bottom)
const SCHED_WPS: WP[] = [
  { f: TL.scheduleCards + 16,    x: 960, y: 900 },
  { f: TL.schedulePlanify - 20,  x: 1400, y: 830 },
  { f: TL.schedulePlanify,       x: 1400, y: 830 },
  { f: TL.scheduleOut - 20,      x: 1400, y: 830 },
];
const SCHED_CLICKS = [TL.schedulePlanify];

// Download button position (data scene)
const DATA_WPS: WP[] = [
  { f: TL.dataCards + 16,      x: 960, y: 700 },
  { f: TL.dataDownload - 16,   x: 570, y: 540 },
  { f: TL.dataDownload,        x: 570, y: 540 },
  { f: TL.dataOut - 20,        x: 570, y: 540 },
];
const DATA_CLICKS = [TL.dataDownload];

function SceneCursor({ frame, fps, wps, clicks, visStart, visEnd }: {
  frame: number; fps: number; wps: WP[]; clicks: number[]; visStart: number; visEnd: number;
}) {
  if (frame < visStart || frame > visEnd + 14) return null;
  const pos = getCursorPos(wps, frame, fps);
  const o   = fade(frame, visStart, 10) * fdOut(frame, visEnd, 14);
  let clickDt = -1;
  for (const c of clicks) { const dt = frame - c; if (dt >= 0 && dt <= 22) clickDt = dt; }
  const isClick = clickDt >= 0;
  const dotSc   = isClick ? 1 - 0.4 * Math.sin((clickDt / 22) * Math.PI) : 1;
  const ringR   = isClick ? interpolate(clickDt, [0, 22], [14, 38], clamp) : 14;
  const ringO   = isClick ? interpolate(clickDt, [0, 4, 22], [0, 1, 0], clamp) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, pointerEvents: "none", zIndex: 300 }}>
      <div style={{ position: "absolute", left: pos.x - ringR, top: pos.y - ringR, width: ringR * 2, height: ringR * 2, borderRadius: "50%", border: "2px solid rgba(14,16,41,0.85)", opacity: ringO }} />
      <div style={{ position: "absolute", left: pos.x - 10, top: pos.y - 10, width: 20, height: 20, borderRadius: "50%", background: T.navy, boxShadow: "0 0 0 3px rgba(255,255,255,0.90)", transform: `scale(${dotSc})`, transformOrigin: "center center" }} />
    </div>
  );
}

// ─── TextOverlay ───────────────────────────────────────────────────────────
const TextOverlay: React.FC<{ frame: number; showAt: number; hideAt: number; text: string }> = ({ frame, showAt, hideAt, text }) => {
  const o = Math.min(interpolate(frame, [showAt, showAt + 12], [0, 1], clamp), interpolate(frame, [hideAt - 10, hideAt], [1, 0], clamp));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(14,16,41,0.65)", borderRadius: 8, padding: "8px 20px", fontSize: 18, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", fontFamily: T.font, opacity: o, zIndex: 200 }}>
      {text}
    </div>
  );
};

// ─── SceneHeadline ─────────────────────────────────────────────────────────
function SceneHeadline({ chip, title, accent, frame, startAt, color = T.mist }: {
  chip: string; title: string; accent?: string; frame: number; startAt: number; color?: string;
}) {
  const chipO  = fade(frame, startAt, 12);
  const titleO = fade(frame, startAt + 8, 14);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.72)", letterSpacing: 2.2, textTransform: "uppercase", fontFamily: T.font, marginBottom: 16, opacity: chipO }}>
        {chip}
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1.5, color: "#fff", fontFamily: T.font, opacity: titleO }}>
        {title}{accent && <> <span style={{ color }}>{accent}</span></>}
      </div>
    </div>
  );
}

// ─── StepBar ───────────────────────────────────────────────────────────────
const STEPS = ["Paramétrage", "Modèle", "Données", "Aperçus", "Planification"];
function StepBar({ activeIdx, frame, startAt }: { activeIdx: number; frame: number; startAt: number }) {
  const o = fade(frame, startAt, 12);
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, opacity: o }}>
      {STEPS.map((label, idx) => {
        const isActive = idx === activeIdx;
        return (
          <div key={label} style={{ padding: "14px 24px", fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? T.mist : T.muted, borderBottom: isActive ? `2px solid ${T.mist}` : "2px solid transparent", flexShrink: 0 }}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Canal badge (dashboard table) ─────────────────────────────────────────
function CanalBadge({ canal }: { canal: string }) {
  const isSms = canal === "sms";
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: isSms ? "rgba(157,184,238,0.15)" : "rgba(50,149,71,0.12)", color: isSms ? T.mist : T.success, letterSpacing: 0.5, textTransform: "uppercase" as const }}>
      {canal}
    </span>
  );
}

// ─── SMS display builder (typewriter + variable tokens) ────────────────────
function SmsDisplay({ frame, fps }: { frame: number; fps: number }) {
  const parts: React.ReactNode[] = [];
  const varStyle: React.CSSProperties = { color: T.mist, fontWeight: 600, background: "rgba(157,184,238,0.12)", borderRadius: 4, padding: "1px 5px", display: "inline-block", transformOrigin: "left center" };

  // Seg 1
  const s1 = typewriter(frame, "Paiement : ", TL.tplTypeStart, 12, fps);
  parts.push(<span key="t1">{s1.text}{frame < TL.tplVar1 && <span style={{ opacity: 0.4 }}>{s1.cursor}</span>}</span>);

  if (frame >= TL.tplVar1) {
    const sc = spring({ frame: frame - TL.tplVar1, fps, config: { damping: 14, stiffness: 200 } });
    parts.push(<span key="v1" style={{ ...varStyle, transform: `scale(${sc})` }}>{`{{ agency_name }}`}</span>);
    const s2 = typewriter(frame, " vous invite à régler ", TL.tplTypeResume1, 12, fps);
    parts.push(<span key="t2">{s2.text}{frame < TL.tplVar2 && <span style={{ opacity: 0.4 }}>{s2.cursor}</span>}</span>);
  }

  if (frame >= TL.tplVar2) {
    const sc = spring({ frame: frame - TL.tplVar2, fps, config: { damping: 14, stiffness: 200 } });
    parts.push(<span key="v2" style={{ ...varStyle, transform: `scale(${sc})` }}>{`{{ payment_url_amount }}`}</span>);
    const s3 = typewriter(frame, " pour votre contrat ", TL.tplTypeResume2, 12, fps);
    parts.push(<span key="t3">{s3.text}{frame < TL.tplVar3 && <span style={{ opacity: 0.4 }}>{s3.cursor}</span>}</span>);
  }

  if (frame >= TL.tplVar3) {
    const sc = spring({ frame: frame - TL.tplVar3, fps, config: { damping: 14, stiffness: 200 } });
    parts.push(<span key="v3" style={{ ...varStyle, transform: `scale(${sc})` }}>{`{{ rent_reference }}`}</span>);
    const s4 = typewriter(frame, " : ", TL.tplTypeResume3, 16, fps);
    parts.push(<span key="t4">{s4.text}{frame < TL.tplVar4 && <span style={{ opacity: 0.4 }}>{s4.cursor}</span>}</span>);
  }

  if (frame >= TL.tplVar4) {
    const sc = spring({ frame: frame - TL.tplVar4, fps, config: { damping: 14, stiffness: 200 } });
    parts.push(<span key="v4" style={{ ...varStyle, transform: `scale(${sc})` }}>{`{{ payment_url }}`}</span>);
  }

  return <>{parts}</>;
}

// ─── SCENE 1 — HERO ────────────────────────────────────────────────────────
function HeroScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.heroIn || frame > TL.heroOut + 20) return null;
  const o      = fade(frame, TL.heroIn, 16) * fdOut(frame, TL.heroOut, 14);
  const logoSc = spr(frame, TL.heroLogo, fps, { damping: 18, stiffness: 120 });
  const chipSc = spr(frame, TL.heroChip, fps, { damping: 22, stiffness: 130 });
  const l1     = spr(frame, TL.heroLine1, fps, { damping: 26, stiffness: 140 });
  const l2     = spr(frame, TL.heroLine2, fps, { damping: 26, stiffness: 140 });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ marginBottom: 32, opacity: logoSc, transform: `scale(${interpolate(logoSc, [0, 1], [0.7, 1])})` }}>
        <PilocLogo height={40} />
      </div>
      <div style={{ display: "inline-flex", padding: "6px 20px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: T.mist, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: T.font, marginBottom: 36, opacity: chipSc, transform: `translateY(${interpolate(chipSc, [0, 1], [14, 0])}px)` }}>
        PILOC · CAMPAGNES
      </div>
      <div style={{ fontSize: 100, fontWeight: 900, color: "#fff", letterSpacing: -4, lineHeight: 1.0, fontFamily: T.font, opacity: l1, transform: `translateY(${interpolate(l1, [0, 1], [34, 0])}px)` }}>
        Relancez vos impayés.
      </div>
      <div style={{ fontSize: 100, fontWeight: 900, color: T.mist, letterSpacing: -4, lineHeight: 1.0, fontFamily: T.font, opacity: l2, transform: `translateY(${interpolate(l2, [0, 1], [34, 0])}px)` }}>
        En quelques clics.
      </div>
    </div>
  );
}

// ─── SCENE 2 — PARAMÉTRAGE ─────────────────────────────────────────────────
function ParamScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.paramIn || frame > TL.paramOut + 20) return null;
  const o = fade(frame, TL.paramIn, 16) * fdOut(frame, TL.paramOut, 16);

  const { text: nameVal, cursor: nameCursor } = typewriter(frame, "Juin Relance Impayé", TL.paramName, 12, fps);
  const smsSelected   = frame >= TL.paramCanalClick;
  const modelSelected = frame >= TL.paramModelClick;
  const canalO  = fade(frame, TL.paramCanal, 12);
  const modelO  = (i: number) => fade(frame, TL.paramModel + i * 12, 12);

  const nextDt  = frame - TL.paramNext;
  const nextSc  = nextDt >= 0 && nextDt <= 14 ? 1 - 0.07 * Math.sin((nextDt / 14) * Math.PI) : 1;

  const MODEL_LABELS = ["Créer un nouveau modèle", "Relance loyer impayé (SMS)", "SMS - Suite rejet", "SMS Rejets DPL"];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Créez votre campagne" accent="en 5 étapes" frame={frame} startAt={TL.paramIn} />
      <div style={{ ...cardBase, width: 900, overflow: "hidden" }}>
        <StepBar activeIdx={0} frame={frame} startAt={TL.paramIn} />
        <div style={{ padding: "28px 32px" }}>
          {/* Nom */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>Nom de la campagne *</div>
            <div style={{ border: `1.5px solid ${T.mist}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: T.text, background: "#fff", minHeight: 44, display: "flex", alignItems: "center" }}>
              {nameVal}<span style={{ opacity: 0.4 }}>{nameCursor}</span>
            </div>
          </div>

          {/* Canal */}
          <div style={{ opacity: canalO, marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 12 }}>Canal *</div>
            <div style={{ display: "flex", gap: 16 }}>
              {["SMS", "Email"].map((label) => {
                const isSel = smsSelected && label === "SMS";
                const sc    = isSel ? spr(frame, TL.paramCanalClick, fps, { damping: 18, stiffness: 200 }) : 1;
                return (
                  <div key={label} style={{ flex: 1, borderRadius: 10, padding: "16px 20px", border: isSel ? `2px solid ${T.mist}` : `1.5px solid ${T.border}`, background: isSel ? "rgba(157,184,238,0.08)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: isSel ? 600 : 400, color: isSel ? T.mist : T.text, transform: `scale(${sc})`, transformOrigin: "center" }}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modèle */}
          <div style={{ opacity: fade(frame, TL.paramModel, 12) }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 12 }}>Modèle *</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10 }}>
              {MODEL_LABELS.map((label, idx) => {
                const isRelance = label === "Relance loyer impayé (SMS)";
                const isSel     = modelSelected && isRelance;
                const sc        = isSel ? spr(frame, TL.paramModelClick, fps, { damping: 18, stiffness: 200 }) : 1;
                return (
                  <div key={label} style={{ width: "calc(50% - 5px)", boxSizing: "border-box", borderRadius: 8, padding: "12px 16px", border: isSel ? `2px solid ${T.mist}` : `1.5px solid ${T.border}`, background: isSel ? "rgba(157,184,238,0.08)" : "#fff", fontSize: 13, fontWeight: isSel ? 600 : 400, color: isSel ? T.mist : T.text, opacity: modelO(idx), transform: `scale(${sc})`, transformOrigin: "center" }}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 32px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <div style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, transform: `scale(${nextSc})`, transformOrigin: "center", opacity: fade(frame, TL.paramIn + 30, 16) }}>
            Suivant →
          </div>
        </div>
      </div>
      <TextOverlay frame={frame} showAt={TL.paramIn + 16} hideAt={TL.paramOut} text="1/5 — Paramétrage · Nom, Canal, Modèle" />
    </AbsoluteFill>
  );
}

// ─── SCENE 3 — TEMPLATE ────────────────────────────────────────────────────
function TemplateScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.tplIn || frame > TL.tplOut + 20) return null;
  const o       = fade(frame, TL.tplIn, 16) * fdOut(frame, TL.tplOut, 16);
  const pillsO  = fade(frame, TL.tplPills, 12);
  const editorO = fade(frame, TL.tplTypeStart - 8, 12);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Personnalisez votre" accent="message SMS" frame={frame} startAt={TL.tplIn} />

      <div style={{ ...cardBase, width: 1500, overflow: "hidden" }}>
        <StepBar activeIdx={1} frame={frame} startAt={TL.tplIn} />

        <div style={{ display: "flex", minHeight: 480 }}>
          {/* LEFT PANEL — Variables */}
          <div style={{ width: 300, borderRight: `1px solid ${T.border}`, padding: "24px 28px", flexShrink: 0 }}>
            {/* Nom du modèle */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>Nom du modèle *</div>
              <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: T.text, background: "#fff" }}>Relance SMS Personnalisé</div>
            </div>

            {/* Checkboxes */}
            <div style={{ marginBottom: 20 }}>
              {["Ne pas sauvegarder ce modèle", "Bloquer le montant du lien"].map((label) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${T.border}`, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: T.muted }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Variable pills */}
            <div style={{ opacity: pillsO }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>Ajouter des variables :</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>Cliquez pour insérer une variable Piloc</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                {VAR_PILLS.map((key, idx) => {
                  const clickAt = PILL_CLICKS[key];
                  const done    = !!clickAt && frame >= clickAt + 5;
                  const flashDt = clickAt ? frame - clickAt : -1;
                  const flash   = (flashDt >= 0 && flashDt <= 18) ? interpolate(flashDt, [0, 3, 18], [0, 0.25, 0], clamp) : 0;
                  const pillO   = fade(frame, TL.tplPills + idx * 4, 10);
                  return (
                    <div key={key} style={{ padding: "6px 10px", borderRadius: 6, border: done ? `1.5px solid ${T.mist}` : `1px solid ${T.border}`, background: done ? `rgba(157,184,238,${0.15 + flash})` : flash > 0 ? `rgba(157,184,238,${flash + 0.05})` : "#fff", color: done ? T.mist : T.text, fontSize: 12, fontWeight: done ? 600 : 400, opacity: pillO, cursor: "default" }}>
                      {key}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — SMS Editor */}
          <div style={{ flex: 1, padding: "24px 32px", opacity: editorO }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              Paiement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </div>
            <div style={{ border: `1.5px solid ${T.mist}`, borderRadius: 10, padding: "16px 20px", background: "#fafcff", minHeight: 160, fontSize: 15, lineHeight: 1.7, color: T.text, fontFamily: T.font }}>
              <SmsDisplay frame={frame} fps={fps} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: T.muted, textAlign: "right" as const }}>
              Longueur estimée du SMS : 121 (160/segments)
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fffbeb", borderRadius: 8, border: `1px solid #fed7aa` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.warning} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>Recommandations (1)</span>
            </div>
          </div>
        </div>
      </div>

      <TextOverlay frame={frame} showAt={TL.tplIn + 16} hideAt={TL.tplVar4 - 8} text="2/5 — Personnalisation du template SMS" />
      <TextOverlay frame={frame} showAt={TL.tplVar4 + 8} hideAt={TL.tplOut} text="4 variables personnalisées par destinataire" />

      <SceneCursor frame={frame} fps={fps} wps={TPL_WPS} clicks={TPL_CLICKS} visStart={TL.tplIn + 16} visEnd={TL.tplOut - 10} />
    </AbsoluteFill>
  );
}

// ─── SCENE 4 — DONNÉES ─────────────────────────────────────────────────────
function DataScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.dataIn || frame > TL.dataOut + 20) return null;
  const o = fade(frame, TL.dataIn, 16) * fdOut(frame, TL.dataOut, 16);

  const cardLeftO  = fade(frame, TL.dataCards, 14);
  const cardRightO = fade(frame, TL.dataCards + 32, 14);
  const cardLeftTy = interpolate(frame, [TL.dataCards, TL.dataCards + 14], [12, 0], clamp);
  const cardRightTy = interpolate(frame, [TL.dataCards + 32, TL.dataCards + 46], [12, 0], clamp);

  const dlDt   = frame - TL.dataDownload;
  const dlSc   = dlDt >= 0 && dlDt <= 14 ? 1 - 0.07 * Math.sin((dlDt / 14) * Math.PI) : 1;

  const dropped  = frame >= TL.dataDrop;
  const dropTy   = dropped ? interpolate(frame, [TL.dataDrop, TL.dataDrop + 20], [-80, 0], clamp) : -80;
  const dropO    = dropped ? interpolate(frame, [TL.dataDrop, TL.dataDrop + 16], [0, 1], clamp) : 0;
  const success  = frame >= TL.dataSuccess;
  const successO = success ? interpolate(frame, [TL.dataSuccess, TL.dataSuccess + 12], [0, 1], clamp) : 0;

  const COLS = ["tenant_reference", "contact", "payment_url_amount", "reason"];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Importez vos" accent="destinataires" frame={frame} startAt={TL.dataIn} />

      <div style={{ ...cardBase, width: 1400, overflow: "hidden" }}>
        <StepBar activeIdx={2} frame={frame} startAt={TL.dataIn} />
        <div style={{ display: "flex", padding: "32px", gap: 24 }}>

          {/* LEFT — Export */}
          <div style={{ flex: 1, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "24px", opacity: cardLeftO, transform: `translateY(${cardLeftTy}px)` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4, textAlign: "center" as const }}>1. Exporter</div>
            <div style={{ fontSize: 12, color: T.muted, textAlign: "center" as const, marginBottom: 16 }}>Colonnes requises dans le fichier CSV :</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center", marginBottom: 24 }}>
              {COLS.map((col) => (
                <span key={col} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#f8faff", fontSize: 12, color: T.text }}>{col}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.muted, textAlign: "center" as const, marginBottom: 20 }}>Téléchargez le fichier CSV type qui contient l'ensemble des variables nécessaires</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, transform: `scale(${dlSc})`, transformOrigin: "center", cursor: "default" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Télécharger .csv
              </div>
            </div>
          </div>

          {/* RIGHT — Import */}
          <div style={{ flex: 1, border: dropped && success ? `2px solid ${T.success}` : `1.5px dashed ${T.border}`, borderRadius: 12, padding: "24px", opacity: cardRightO, transform: `translateY(${cardRightTy}px)`, background: success ? "rgba(50,149,71,0.04)" : "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4, textAlign: "center" as const }}>2. Importer</div>
            <div style={{ fontSize: 12, color: T.muted, textAlign: "center" as const, marginBottom: 24 }}>Glissez-déposez ou importez le fichier CSV contenant la liste des destinataires (taille max. 10 Mo)</div>

            {/* Drop zone */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 140, position: "relative" }}>
              {/* Falling file */}
              {dropped && (
                <div style={{ opacity: dropO, transform: `translateY(${dropTy}px)` }}>
                  <div style={{ background: "#f0f9ff", border: `1.5px solid ${T.mist}`, borderRadius: 10, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.mist} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>clients_relance_juin.csv</div>
                      <div style={{ fontSize: 12, color: T.muted }}>2 150 destinataires</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Success state */}
              {success && (
                <div style={{ opacity: successO, marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.success }}>Fichier importé avec succès</span>
                </div>
              )}
              {!dropped && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <span style={{ fontSize: 14, color: T.muted }}>+ Déposez .csv</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TextOverlay frame={frame} showAt={TL.dataIn + 16} hideAt={TL.dataOut} text="3/5 — Import du fichier destinataires CSV" />
      <SceneCursor frame={frame} fps={fps} wps={DATA_WPS} clicks={DATA_CLICKS} visStart={TL.dataIn + 16} visEnd={TL.dataOut - 10} />
    </AbsoluteFill>
  );
}

// ─── SCENE 5 — APERÇUS ─────────────────────────────────────────────────────
function PreviewScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.previewIn || frame > TL.previewOut + 20) return null;
  const o = fade(frame, TL.previewIn, 16) * fdOut(frame, TL.previewOut, 16);

  const panelsO = fade(frame, TL.prevPanels, 14);

  const activeIdx = frame >= TL.prevRecip3 ? 2 : frame >= TL.prevRecip2 ? 1 : 0;
  const switchAt  = [TL.prevRecip1, TL.prevRecip2, TL.prevRecip3][activeIdx];
  const previewO  = fade(frame, switchAt, 12);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Vérifiez chaque message" accent="avant envoi" frame={frame} startAt={TL.previewIn} />

      <div style={{ ...cardBase, width: 1400, overflow: "hidden", opacity: panelsO }}>
        <StepBar activeIdx={3} frame={frame} startAt={TL.previewIn} />
        <div style={{ display: "flex", minHeight: 400 }}>

          {/* LEFT — Destinataires */}
          <div style={{ width: 320, borderRight: `1px solid ${T.border}`, padding: "20px 0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, padding: "0 20px 12px", letterSpacing: 1, textTransform: "uppercase" as const }}>Destinataires</div>
            {RECIPS.map((r, idx) => {
              const isActive = idx === activeIdx;
              const rowO     = fade(frame, TL.prevPanels + idx * 8, 12);
              return (
                <div key={r.name} style={{ padding: "14px 20px", background: isActive ? "rgba(157,184,238,0.10)" : "transparent", borderLeft: isActive ? `3px solid ${T.mist}` : "3px solid transparent", opacity: rowO, cursor: "default" }}>
                  <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? T.text : T.muted }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: T.light, marginTop: 2 }}>{r.phone}</div>
                </div>
              );
            })}
            <div style={{ margin: "16px 20px 0", padding: "10px 0", borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>
              <span style={{ fontWeight: 600, color: T.text }}>2 150</span> destinataires au total
            </div>
          </div>

          {/* RIGHT — Preview */}
          <div style={{ flex: 1, padding: "24px 32px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>De :</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>SOCIALHAB</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>À :</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{RECIPS[activeIdx].phone}</span>
            </div>
            <div key={activeIdx} style={{ border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "20px 24px", background: "#fafcff", opacity: previewO }}>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: T.text, fontFamily: T.font }}>{RECIPS[activeIdx].sms}</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: T.muted, textAlign: "right" as const }}>
              {RECIPS[activeIdx].sms.length} caractères
            </div>
          </div>
        </div>
      </div>

      <TextOverlay frame={frame} showAt={TL.previewIn + 16} hideAt={TL.previewOut} text="4/5 — Aperçu · 1 message par destinataire" />
    </AbsoluteFill>
  );
}

// ─── SCENE 6 — PLANIFICATION ───────────────────────────────────────────────
function ScheduleScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.scheduleIn || frame > TL.scheduleOut + 20) return null;
  const o = fade(frame, TL.scheduleIn, 16) * fdOut(frame, TL.scheduleOut, 16);

  const bannerO  = fade(frame, TL.scheduleBanner, 12);
  const card1O   = fade(frame, TL.scheduleCards, 14);
  const card2O   = fade(frame, TL.scheduleCards + 32, 14);
  const smsCount = Math.round(interpolate(frame, [TL.scheduleCount, TL.scheduleCount + 40], [0, 2150], clamp));

  const planDt      = frame - TL.schedulePlanify;
  const planIsClick = planDt >= 0 && planDt <= 14;
  const planSc      = planIsClick ? 1 - 0.07 * Math.sin((planDt / 14) * Math.PI) : 1;
  const confirmed   = frame >= TL.scheduleConfirm;
  const confirmO    = fade(frame, TL.scheduleConfirm, 14);
  const confirmSc   = spring({ frame: frame - TL.scheduleConfirm, fps, config: { damping: 22, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Planifiez l'envoi" accent="au moment optimal" frame={frame} startAt={TL.scheduleIn} />

      {/* Optimal banner */}
      <div style={{ width: 1400, opacity: bannerO }}>
        <div style={{ background: "rgba(50,149,71,0.10)", border: `1px solid rgba(50,149,71,0.30)`, borderLeft: `4px solid ${T.success}`, borderRadius: 8, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.success }}>Ce créneau est optimal pour obtenir un très bon taux de transformation</span>
        </div>
      </div>

      <div style={{ ...cardBase, width: 1400, overflow: "hidden" }}>
        <StepBar activeIdx={4} frame={frame} startAt={TL.scheduleIn} />
        <div style={{ display: "flex", padding: "32px", gap: 24 }}>

          {/* LEFT — Planifiez */}
          <div style={{ flex: 1, opacity: card1O }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Planifiez</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>Choisissez la date et l'heure d'exécution. Modifiable jusqu'à 5min avant le lancement.</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <div style={{ border: `1.5px solid ${T.mist}`, borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, color: T.text, background: "#fff" }}>19/03/2026 · 11:50</div>
              <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.muted, background: "#fff" }}>Europe/Paris</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${T.border}`, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: T.muted }}>Exécuter la campagne sous 30 minutes</div>
            </div>
          </div>

          {/* RIGHT — Récapitulatif */}
          <div style={{ flex: 1, background: "#f8faff", borderRadius: 12, padding: "24px", opacity: card2O }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Récapitulatif</div>
            {[
              ["Nom", "Juin Relance Impayé"],
              ["Canal", "sms"],
              ["Modèle", "Relance loyer impayé (SMS)"],
              ["Nb SMS envoyés", smsCount > 0 ? smsCount.toLocaleString("fr-FR") : "—"],
            ].map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: T.muted }}>{key}</span>
                <span style={{ fontSize: 13, fontWeight: key === "Nb SMS envoyés" ? 700 : 500, color: key === "Nb SMS envoyés" ? T.text : T.text }}>
                  {key === "Canal" ? <CanalBadge canal={val as string} /> : val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer — Planifier button */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 32px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 14, color: T.muted, cursor: "default" }}>Sauvegarder et quitter</div>
          <div style={{ position: "relative", minWidth: 160, height: 48 }}>
            {/* Planifier button */}
            <div style={{ position: "absolute", inset: 0, background: confirmed ? "transparent" : T.navy, color: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, gap: 8, transform: `scale(${planSc})`, transformOrigin: "center", opacity: confirmed ? 0 : 1 }}>
              Planifier →
            </div>
            {/* Confirm state */}
            {confirmed && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(50,149,71,0.10)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: confirmO, transform: `scale(${interpolate(confirmSc, [0, 1], [0.88, 1])})` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.success }}>Campagne planifiée</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <TextOverlay frame={frame} showAt={TL.scheduleIn + 16} hideAt={TL.schedulePlanify - 8} text="5/5 — Planification de l'envoi" />
      <TextOverlay frame={frame} showAt={TL.scheduleConfirm + 4} hideAt={TL.scheduleOut} text="Campagne planifiée · 2 150 destinataires · 19/03 à 11:50" />
      <SceneCursor frame={frame} fps={fps} wps={SCHED_WPS} clicks={SCHED_CLICKS} visStart={TL.scheduleCards + 16} visEnd={TL.scheduleOut - 10} />
    </AbsoluteFill>
  );
}

// ─── SCENE 7 — DASHBOARD ───────────────────────────────────────────────────
function DashboardScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.dashIn || frame > TL.dashOut + 20) return null;
  const o = fade(frame, TL.dashIn, 16) * fdOut(frame, TL.dashOut, 16);

  // KPI count-ups
  const kpiVals = KPIS.map((k) => Math.round(interpolate(frame, [TL.dashKpi, TL.dashKpi + 60], [0, k.value], clamp)));
  const kpiO    = fade(frame, TL.dashKpi, 14);

  // Funnel bars
  const funnelO = fade(frame, TL.dashFunnel, 14);

  // Revenue
  const revenue = interpolate(frame, [TL.dashRevenue, TL.dashRevenue + 80], [0, 195120.37], clamp);
  const revO    = fade(frame, TL.dashRevenue, 14);
  const clipW   = interpolate(frame, [TL.dashRevenue, TL.dashRevenue + 60], [0, 260], clamp);

  // Table rows
  const tableO  = (idx: number) => fade(frame, TL.dashTable + idx * 16, 14);
  const tableTy = (idx: number) => interpolate(frame, [TL.dashTable + idx * 16, TL.dashTable + idx * 16 + 14], [6, 0], clamp);

  // Row highlight
  const hlFrame = TL.dashHighlight;
  const hlO     = frame >= hlFrame ? interpolate(frame, [hlFrame, hlFrame + 12], [0, 1], clamp) : 0;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Suivez vos performances" accent="en temps réel" frame={frame} startAt={TL.dashHeadline} />

      {/* Top row — KPIs + Funnel + Revenue */}
      <div style={{ display: "flex", gap: 20, width: 1600 }}>
        {/* KPI strip */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: kpiO, flexShrink: 0 }}>
          {KPIS.map((k, idx) => (
            <div key={k.label} style={{ ...cardBase, padding: "18px 24px", width: 220, minWidth: 220 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.text, letterSpacing: -1 }}>
                {kpiVals[idx].toLocaleString("fr-FR")}{k.suffix}
              </div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <div style={{ ...cardBase, flex: 1, padding: "24px 28px", opacity: funnelO }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Conversion globale</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FUNNEL.map((f, idx) => {
              const barW = interpolate(frame, [TL.dashFunnel + idx * 16, TL.dashFunnel + idx * 16 + 24], [0, f.pct], clamp);
              return (
                <div key={f.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: T.muted }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{f.count.toLocaleString("fr-FR")} <span style={{ fontWeight: 400, color: T.muted }}>({f.pct}%)</span></span>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 99, height: 12, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: f.color, width: `${barW}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            {FUNNEL.map((f) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: f.color }} />
                <span style={{ fontSize: 12, color: T.muted }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div style={{ ...cardBase, padding: "24px 28px", width: 340, flexShrink: 0, opacity: revO }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Montant collecté</div>
          <div style={{ fontSize: 13, color: T.light, marginBottom: 12 }}>suite à une notification</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: T.text, letterSpacing: -1.5, marginBottom: 16 }}>
            {revenue.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
          </div>
          <svg width="260" height="56" viewBox="0 0 260 56" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.mist} stopOpacity={0.25} />
                <stop offset="100%" stopColor={T.mist} stopOpacity={0.02} />
              </linearGradient>
              <clipPath id="revClip">
                <rect x="0" y="0" width={clipW} height="56" />
              </clipPath>
            </defs>
            <polygon points="0,52 30,44 60,36 90,26 120,18 155,11 190,7 220,4 260,2 260,56 0,56" fill="url(#revGrad)" clipPath="url(#revClip)" />
            <polyline points="0,52 30,44 60,36 90,26 120,18 155,11 190,7 220,4 260,2" fill="none" stroke={T.mist} strokeWidth={2.5} strokeDasharray={320} strokeDashoffset={interpolate(frame, [TL.dashRevenue, TL.dashRevenue + 60], [320, 0], clamp)} />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardBase, width: 1600, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", background: "#fafafa", borderBottom: `1px solid ${T.border}`, padding: "0" }}>
          {["Auteur", "Canal", "Unités", "Délivré", "Payé", "Encaissé"].map((h, i) => (
            <div key={h} style={{ ...cell({ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 0.5, textTransform: "uppercase" as const }), width: DCOL_W[i] }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {ROWS.map((row, idx) => {
          const isHighlight = idx === 3; // Sandra Dachicourt
          const hlBg        = isHighlight ? `rgba(157,184,238,${0.14 * hlO})` : "transparent";
          return (
            <div key={row.name} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: hlBg, opacity: tableO(idx), transform: `translateY(${tableTy(idx)}px)` }}>
              <div style={{ ...cell({ fontWeight: 500 }), width: DCOL_W[0] }}>{row.name}</div>
              <div style={{ ...cell(), width: DCOL_W[1] }}><CanalBadge canal={row.canal} /></div>
              <div style={{ ...cell({ fontWeight: 600 }), width: DCOL_W[2] }}>{row.units}</div>
              <div style={{ ...cell(), width: DCOL_W[3] }}>{row.delivered}</div>
              <div style={{ ...cell({ color: T.success, fontWeight: 600 }), width: DCOL_W[4] }}>{row.paid}</div>
              <div style={{ ...cell({ fontWeight: 700, color: isHighlight ? T.text : T.text, fontSize: isHighlight ? 14 : 13 }), width: DCOL_W[5] }}>{row.amount}</div>
            </div>
          );
        })}
      </div>

      <TextOverlay frame={frame} showAt={TL.dashKpi} hideAt={TL.dashHighlight - 8} text="Dashboard · Campagnes SMS & Email" />
      <TextOverlay frame={frame} showAt={TL.dashHighlight + 4} hideAt={TL.dashOut} text="51 472 € encaissés suite à une campagne SMS" />
    </AbsoluteFill>
  );
}

// ─── SCENE 8 — CTA ─────────────────────────────────────────────────────────
function CTAScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.ctaIn || frame > TL.totalDur + 10) return null;
  const o    = fade(frame, TL.ctaIn, 16);
  const logo = spr(frame, TL.ctaLogo, fps, { damping: 18, stiffness: 120 });
  const chip = spr(frame, TL.ctaChip, fps, { damping: 22, stiffness: 130 });
  const l1   = spr(frame, TL.ctaLine1, fps, { damping: 26, stiffness: 140 });
  const l2   = spr(frame, TL.ctaLine2, fps, { damping: 26, stiffness: 140 });
  const subO = fade(frame, TL.ctaSub, 20);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ marginBottom: 32, opacity: logo, transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})` }}>
        <PilocLogo height={40} />
      </div>
      <div style={{ display: "inline-flex", padding: "6px 20px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: T.mist, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: T.font, marginBottom: 36, opacity: chip, transform: `translateY(${interpolate(chip, [0, 1], [14, 0])}px)` }}>
        PILOC · CAMPAGNES
      </div>
      <div style={{ fontSize: 88, fontWeight: 900, color: "#fff", letterSpacing: -3.5, lineHeight: 1.0, fontFamily: T.font, opacity: l1, transform: `translateY(${interpolate(l1, [0, 1], [24, 0])}px)` }}>
        Relancez vos impayés.
      </div>
      <div style={{ fontSize: 88, fontWeight: 900, color: T.mist, letterSpacing: -3.5, lineHeight: 1.0, fontFamily: T.font, marginTop: 4, opacity: l2, transform: `translateY(${interpolate(l2, [0, 1], [24, 0])}px)` }}>
        Automatiquement.
      </div>
      <div style={{ marginTop: 28, fontSize: 20, color: "rgba(255,255,255,0.45)", fontFamily: T.font, opacity: subO, letterSpacing: 1 }}>
        SMS · Email · En quelques clics
      </div>
    </div>
  );
}

// ─── MAIN COMPOSITION ──────────────────────────────────────────────────────
export const CampagnesYTDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [handle] = React.useState(() => delayRender("Loading Inter font"));
  React.useEffect(() => {
    waitForInter().then(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: T.navy, fontFamily: T.font, overflow: "hidden" }}>
      {/* Music */}
      <Audio
        src={staticFile("music/#33 Vendredi - Garden Leaves (feat. Mélanie).mp3")}
        volume={0.45}
      />

      {/* Scenes */}
      <HeroScene      frame={frame} fps={fps} />
      <ParamScene     frame={frame} fps={fps} />
      <TemplateScene  frame={frame} fps={fps} />
      <DataScene      frame={frame} fps={fps} />
      <PreviewScene   frame={frame} fps={fps} />
      <ScheduleScene  frame={frame} fps={fps} />
      <DashboardScene frame={frame} fps={fps} />
      <CTAScene       frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
