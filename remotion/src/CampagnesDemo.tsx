import React from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PilocLogo } from "./Icons";
import { waitForInter } from "./fonts";

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy:    "#0E1029",
  mist:    "#9DB8EE",
  solar:   "#FFB784",
  surface: "#ffffff",
  text:    "#112431",
  muted:   "#6b7280",
  light:   "#a4afb7",
  border:  "#e2e8f0",
  success: "#329547",
  error:   "#ec6369",
  warning: "#ffb704",
  orange:  "#F59E0B",
  font:    "'Inter', sans-serif",
};

const cardBase: React.CSSProperties = {
  background:   "rgba(255,255,255,0.97)",
  borderRadius: 16,
  border:       "1px solid rgba(255,255,255,0.60)",
  boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.28)",
};

// ─── Timeline (30 fps — 1502f = 50.1s) ────────────────────────────────────
//
// Hero:     0–88      (2.9s) — kinetic title
// Step 1:   98–318    (7.3s) — nom + canal-cards + template-cards
// Step 2:   328–620   (9.7s) — typewriter SMS + cursor clicks variables
// Step 3:   630–750   (4.0s) — CSV upload → 47 importés
// Step 4:   760–922   (5.4s) — 4 recipients aperçu cycling
// Step 5:   932–1072  (4.7s) — planification → confirmé
// Dashboard:1082–1342 (8.7s) — KPIs + barres + tableau
// CTA:      1352–1502 (5.0s) — hero loop
//
// Verify TL gaps before each scene: all 10f ✓
// Step 2 segment timing (CPS=16, FPC=1.875):
//   Seg1 "Bonjour " 8c → 15f → ends 375 → cursor in at 375
//   Seg2 ", votre loyer de " 17c → 32f → ends 441 → cur2At 445
//   Seg3 "€ est impayé. Lien de paiement : " 33c → 62f → ends 525 → cur3At 530
//   Seg4 ". — " 4c → 8f → ends 556 → cur4At 561
const TL = {
  heroIn: 0,       heroOut: 88,

  s1In: 98,        s1Out: 318,
  s1Card: 114,     s1Name: 130,
  s1Canal: 190,    s1CanSel: 228,
  s1Tpl: 252,      s1TplSel: 294,

  s2In: 328,       s2Out: 620,
  s2Card: 344,
  s2PillsIn: 350,  // 6 pills stagger: +0,+6,+12,+18,+24,+30
  s2Text: 360,
  s2Cur1In: 375,   s2Cur1At: 391,   s2Click1: 396,   // tenant_name
  s2Type2: 409,
  s2Cur2At: 445,   s2Click2: 450,                     // payment_url_amount
  s2Type3: 463,
  s2Cur3At: 530,   s2Click3: 535,                     // payment_url
  s2Type4: 548,
  s2Cur4At: 561,   s2Click4: 566,                     // agency_name
  s2CurOut: 600,

  s3In: 630,       s3Out: 750,
  s3Card: 646,     s3Cols: 662,     s3Drop: 684,     s3Loaded: 712,

  s4In: 760,       s4Out: 922,
  s4Card: 776,     s4Rows: 792,     s4Preview: 826,
  s4Sw1: 860,      s4Sw2: 880,      s4Sw3: 900,

  s5In: 932,       s5Out: 1072,
  s5Card: 948,     s5Date: 962,     s5Sum: 1004,
  s5Tip: 1030,     s5Click: 1044,

  dashIn: 1082,    dashOut: 1342,
  dHeadline: 1094, dKpi: 1108,
  dBars: 1146,     dChart: 1164,
  dTable: 1206,    dRows: 1224,
  dHL: 1280,       dAmount: 1300,

  ctaIn: 1352,     ctaChip: 1364,  ctaLine1: 1376,  ctaLine2: 1388,
  end: 1502,
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const fade  = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [0, 1], clamp);
const fdOut = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [1, 0], clamp);

function spr(frame: number, startAt: number, fps: number, cfg = { damping: 22, stiffness: 140 }) {
  return spring({ frame: frame - startAt, fps, config: cfg });
}

const fr = (n: number) => n.toLocaleString("fr-FR");

function typewriter(frame: number, text: string, startAt: number, cps = 10, fps = 30) {
  const fpc   = fps / cps;
  const count = Math.min(text.length, Math.floor(Math.max(0, frame - startAt) / fpc));
  const cursor = count < text.length && Math.floor(frame / 7) % 2 === 0 ? "|" : "";
  return { text: text.substring(0, count), cursor, done: count >= text.length };
}

// ─── Pill positions (world-space 1920×1080) ────────────────────────────────
// Card width 1000px, left edge (1920-1000)/2=460.
// Right section starts at 460+480=940, inner left at 940+28=968.
// 2-column pill grid, col centers at x=1068 and x=1278.
// Card top ≈ 376, tab bar 44px, body at 420, right panel padding 28 → 448,
// label 19 + subtitle 33 → pills start ≈500. Pill height ~30px + margin 10.
// Row centers: R1=515, R2=555, R3=595.
const PILL = {
  agency_name:         { x: 1068, y: 515 },
  asset_address:       { x: 1278, y: 515 },
  payment_url:         { x: 1068, y: 555 },
  rent_reference:      { x: 1278, y: 555 },
  tenant_name:         { x: 1068, y: 595 },
  payment_url_amount:  { x: 1278, y: 595 },
} as const;

// ─── Cursor system (Step 2 — multiple clicks) ──────────────────────────────
interface WP { f: number; x: number; y: number }

function getCursorPos(wps: WP[], frame: number, fps: number) {
  if (frame <= wps[0].f) return { x: wps[0].x, y: wps[0].y };
  if (frame >= wps[wps.length - 1].f) return wps[wps.length - 1];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    if (frame >= a.f && frame < b.f) {
      const s = spring({ frame: frame - a.f, fps, config: { damping: 30, stiffness: 100 } });
      return { x: interpolate(s, [0, 1], [a.x, b.x]), y: interpolate(s, [0, 1], [a.y, b.y]) };
    }
  }
  return wps[wps.length - 1];
}

const S2_WPS: WP[] = [
  { f: TL.s2Cur1In,        x: 1420,                       y: 650                        },
  { f: TL.s2Cur1At,        x: PILL.tenant_name.x,         y: PILL.tenant_name.y         },
  { f: TL.s2Click1 + 12,   x: PILL.tenant_name.x,         y: PILL.tenant_name.y         },
  { f: TL.s2Cur2At - 6,    x: PILL.payment_url_amount.x,  y: PILL.payment_url_amount.y  },
  { f: TL.s2Cur2At,        x: PILL.payment_url_amount.x,  y: PILL.payment_url_amount.y  },
  { f: TL.s2Click2 + 12,   x: PILL.payment_url_amount.x,  y: PILL.payment_url_amount.y  },
  { f: TL.s2Cur3At - 6,    x: PILL.payment_url.x,         y: PILL.payment_url.y         },
  { f: TL.s2Cur3At,        x: PILL.payment_url.x,         y: PILL.payment_url.y         },
  { f: TL.s2Click3 + 12,   x: PILL.payment_url.x,         y: PILL.payment_url.y         },
  { f: TL.s2Cur4At - 6,    x: PILL.agency_name.x,         y: PILL.agency_name.y         },
  { f: TL.s2Cur4At,        x: PILL.agency_name.x,         y: PILL.agency_name.y         },
  { f: TL.s2CurOut - 5,    x: PILL.agency_name.x,         y: PILL.agency_name.y         },
];

const S2_CLICKS = [TL.s2Click1, TL.s2Click2, TL.s2Click3, TL.s2Click4];

function Step2Cursor({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.s2Cur1In || frame > TL.s2CurOut + 12) return null;
  const pos = getCursorPos(S2_WPS, frame, fps);
  const o   = fade(frame, TL.s2Cur1In, 10) * fdOut(frame, TL.s2CurOut, 14);

  // Find most recent active click (within 22f window)
  let clickDt = -1;
  for (const c of S2_CLICKS) {
    const dt = frame - c;
    if (dt >= 0 && dt <= 22) clickDt = dt;
  }
  const isClick = clickDt >= 0;
  const dotSc = isClick ? 1 - 0.4 * Math.sin((clickDt / 22) * Math.PI) : 1;
  const ringR = isClick ? interpolate(clickDt, [0, 22], [14, 38], clamp) : 14;
  const ringO = isClick ? interpolate(clickDt, [0, 4, 22], [0, 1, 0], clamp) : 0;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, pointerEvents: "none", zIndex: 300 }}>
      <div style={{
        position: "absolute",
        left: pos.x - ringR, top: pos.y - ringR,
        width: ringR * 2, height: ringR * 2, borderRadius: "50%",
        border: "2px solid rgba(14,16,41,0.85)",
        opacity: ringO,
      }} />
      <div style={{
        position: "absolute",
        left: pos.x - 10, top: pos.y - 10,
        width: 20, height: 20, borderRadius: "50%",
        background: T.navy,
        boxShadow: "0 0 0 3px rgba(255,255,255,0.90)",
        transform: `scale(${dotSc})`,
        transformOrigin: "center center",
      }} />
    </div>
  );
}

// ─── SMS text builder ──────────────────────────────────────────────────────
// Returns segments to render; variables highlighted in mist.
const SMS_CPS = 16;
const SMS_FPC = 30 / SMS_CPS;
const SEG1 = "Bonjour ";
const VAR1 = "{{ tenant_name }}";
const SEG2 = ", votre loyer de ";
const VAR2 = "{{ payment_url_amount }}";
const SEG3 = "€ est impayé. Lien de paiement : ";
const VAR3 = "{{ payment_url }}";
const SEG4 = ". — ";
const VAR4 = "{{ agency_name }}";

function buildSmsSegments(frame: number): { text: string; isVar: boolean; varKey?: string }[] {
  const c1 = Math.min(SEG1.length, Math.floor(Math.max(0, frame - TL.s2Text) / SMS_FPC));
  const c1done = frame >= TL.s2Click1 + 5;
  const c2 = c1done ? Math.min(SEG2.length, Math.floor(Math.max(0, frame - TL.s2Type2) / SMS_FPC)) : 0;
  const c2done = frame >= TL.s2Click2 + 5;
  const c3 = c2done ? Math.min(SEG3.length, Math.floor(Math.max(0, frame - TL.s2Type3) / SMS_FPC)) : 0;
  const c3done = frame >= TL.s2Click3 + 5;
  const c4 = c3done ? Math.min(SEG4.length, Math.floor(Math.max(0, frame - TL.s2Type4) / SMS_FPC)) : 0;
  const c4done = frame >= TL.s2Click4 + 5;

  // Blinking cursor: active only on the currently-typing segment
  const blink = Math.floor(frame / 7) % 2 === 0 ? "|" : "";
  const cur1 = c1 < SEG1.length ? blink : "";
  const cur2 = c1done && c2 < SEG2.length && !c2done ? blink : "";
  const cur3 = c2done && c3 < SEG3.length && !c3done ? blink : "";
  const cur4 = c3done && c4 < SEG4.length && !c4done ? blink : "";

  const out: { text: string; isVar: boolean; varKey?: string }[] = [];
  if (c1 > 0 || cur1) out.push({ text: SEG1.slice(0, c1) + cur1, isVar: false });
  if (c1done)         out.push({ text: VAR1, isVar: true, varKey: "var1" });
  if (c2 > 0 || cur2) out.push({ text: SEG2.slice(0, c2) + cur2, isVar: false });
  if (c2done)         out.push({ text: VAR2, isVar: true, varKey: "var2" });
  if (c3 > 0 || cur3) out.push({ text: SEG3.slice(0, c3) + cur3, isVar: false });
  if (c3done)         out.push({ text: VAR3, isVar: true, varKey: "var3" });
  if (c4 > 0 || cur4) out.push({ text: SEG4.slice(0, c4) + cur4, isVar: false });
  if (c4done)         out.push({ text: VAR4, isVar: true, varKey: "var4" });
  return out;
}

// ─── Data ──────────────────────────────────────────────────────────────────
const PILL_ROWS = [
  ["agency_name",  "asset_address"],
  ["payment_url",  "rent_reference"],
  ["tenant_name",  "payment_url_amount"],
] as const;

const RECIPIENTS = [
  { name: "Karim Benali",   phone: "+33 6 12 45 78 90", montant: "850 €",   msg: "Bonjour Karim Benali, votre loyer de 850 € est impayé. Lien de paiement : piloc.io/pay/kb850. — SOCIALHAB" },
  { name: "Fatima Ouali",   phone: "+33 7 23 56 89 12", montant: "620 €",   msg: "Bonjour Fatima Ouali, votre loyer de 620 € est impayé. Lien de paiement : piloc.io/pay/fo620. — SOCIALHAB" },
  { name: "David Marchand", phone: "+33 6 78 34 12 56", montant: "1 100 €", msg: "Bonjour David Marchand, votre loyer de 1 100 € est impayé. Lien de paiement : piloc.io/pay/dm1100. — SOCIALHAB" },
  { name: "Amina Traoré",   phone: "+33 7 45 67 23 89", montant: "490 €",   msg: "Bonjour Amina Traoré, votre loyer de 490 € est impayé. Lien de paiement : piloc.io/pay/at490. — SOCIALHAB" },
];

const CAMP_ROWS = [
  { titre: "Relance Impayé Juin",   canal: "SMS",   cible: 47,  delivre: "47 (100%)",  paye: "22 (47%)",  encaisse: "18 630,00 €", isGreen: true  },
  { titre: "Relance loyers Q1",     canal: "SMS",   cible: 81,  delivre: "81 (100%)",  paye: "0 (0%)",    encaisse: "0,00 €",      isGreen: false },
  { titre: "Campagne mail 01",      canal: "EMAIL", cible: 147, delivre: "143 (97%)",  paye: "71 (48%)",  encaisse: "20 226,68 €", isGreen: true  },
  { titre: "SMS Rejets DPL",        canal: "SMS",   cible: 0,   delivre: "1",          paye: "—",         encaisse: "0,00 €",      isGreen: false },
  { titre: "Camp. Stéphanie HAVET", canal: "EMAIL", cible: 143, delivre: "147",        paye: "143 (97%)", encaisse: "—",           isGreen: false },
];

// ─── SceneHeadline ─────────────────────────────────────────────────────────
function SceneHeadline({ chip, title, accent, frame, startAt, color = T.mist }: {
  chip: string; title: string; accent?: string;
  frame: number; startAt: number; color?: string;
}) {
  const chipO  = fade(frame, startAt, 12);
  const titleO = fade(frame, startAt + 8, 14);
  return (
    <div style={{ textAlign: "center", fontFamily: T.font }}>
      <div style={{
        display: "inline-flex", padding: "5px 16px", borderRadius: 99,
        background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)",
        fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.72)",
        letterSpacing: 2.2, textTransform: "uppercase",
        marginBottom: 20, opacity: chipO,
      }}>{chip}</div>
      <div style={{
        fontSize: 52, fontWeight: 800, lineHeight: 1.15,
        letterSpacing: -2, color: "#fff", opacity: titleO,
      }}>
        {title}{accent && <> <span style={{ color }}>{accent}</span></>}
      </div>
    </div>
  );
}

// ─── TextOverlay ───────────────────────────────────────────────────────────
function TextOverlay({ frame, showAt, hideAt, text }: {
  frame: number; showAt: number; hideAt: number; text: string;
}) {
  const o = Math.min(
    interpolate(frame, [showAt, showAt + 12], [0, 1], clamp),
    interpolate(frame, [hideAt - 10, hideAt], [1, 0], clamp),
  );
  if (o <= 0) return null;
  return (
    <div style={{
      position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "rgba(14,16,41,0.68)", borderRadius: 8, padding: "8px 24px",
      fontSize: 18, fontWeight: 600, color: "#fff", whiteSpace: "nowrap",
      fontFamily: T.font, opacity: o, zIndex: 200, pointerEvents: "none",
    }}>{text}</div>
  );
}

// ─── CanalBadge ────────────────────────────────────────────────────────────
function CanalBadge({ canal }: { canal: string }) {
  const isSms = canal.toUpperCase() === "SMS";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "3px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600,
      background: isSms ? "rgba(157,184,238,0.15)" : "rgba(245,158,11,0.12)",
      color: isSms ? T.mist : T.orange,
      border: `1px solid ${isSms ? "rgba(157,184,238,0.3)" : "rgba(245,158,11,0.3)"}`,
      whiteSpace: "nowrap" as const,
    }}>{canal.toLowerCase()}</span>
  );
}

// ─── SCENE 1 — Hero ────────────────────────────────────────────────────────
function HeroScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.heroIn || frame > TL.heroOut + 20) return null;
  const o    = fade(frame, TL.heroIn, 18) * fdOut(frame, TL.heroOut, 16);
  const chipS = spr(frame, 4,  fps, { damping: 22, stiffness: 120 });
  const l1s   = spr(frame, 18, fps, { damping: 22, stiffness: 120 });
  const l2s   = spr(frame, 32, fps, { damping: 22, stiffness: 120 });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: o, fontFamily: T.font,
    }}>
      <div style={{
        display: "inline-flex", padding: "6px 20px", borderRadius: 99,
        background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)",
        fontSize: 12, fontWeight: 700, color: T.mist, letterSpacing: 2.4,
        textTransform: "uppercase", marginBottom: 36,
        opacity: chipS,
        transform: `translateY(${interpolate(chipS, [0, 1], [14, 0])}px)`,
      }}>Piloc · Campagnes</div>

      <div style={{
        fontSize: 118, fontWeight: 900, letterSpacing: -4.5, lineHeight: 1.0, color: "#fff",
        opacity: l1s, transform: `translateY(${interpolate(l1s, [0, 1], [34, 0])}px)`,
      }}>Relancez.</div>

      <div style={{
        fontSize: 118, fontWeight: 900, letterSpacing: -4.5, lineHeight: 1.0, color: T.mist,
        opacity: l2s, transform: `translateY(${interpolate(l2s, [0, 1], [34, 0])}px)`,
      }}>Automatiquement.</div>

      <div style={{
        fontSize: 20, color: "rgba(255,255,255,0.38)", marginTop: 32,
        opacity: fade(frame, 44, 16) * fdOut(frame, TL.heroOut, 16),
      }}>Impayés · Communication · SMS & Email</div>

      <div style={{ marginTop: 28, opacity: fade(frame, 52, 16) * fdOut(frame, TL.heroOut, 16) }}>
        <PilocLogo height={36} textColor="#fff" markColor={T.mist} />
      </div>
    </div>
  );
}

// ─── SCENE 2 — Step 1: Paramétrage ────────────────────────────────────────
function Step1Scene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.s1In || frame > TL.s1Out + 20) return null;
  const o     = fade(frame, TL.s1In, 18) * fdOut(frame, TL.s1Out, 16);
  const cardW = Math.min(vw * 0.58, 960);

  const fName = typewriter(frame, "Relance Impayé Juin", TL.s1Name, 10);
  const nameBorder = frame >= TL.s1Name ? T.mist : T.border;

  const canalCards = [
    { key: "SMS",   label: "SMS",   desc: "Messages courts · 97% délivré",      icon: "💬" },
    { key: "Email", label: "Email", desc: "Avec mise en forme · Idéal documents", icon: "📧" },
  ];
  const smsSelected = frame >= TL.s1CanSel;

  const templateCards = [
    { label: "Relance loyer impayé (SMS)", vars: "tenant_name · payment_url_amount" },
    { label: "SMS - Suite rejet",          vars: "tenant_name · reason" },
    { label: "SMS Rejets DPL",             vars: "tenant_name · asset_address" },
  ];
  const tplStarts = [TL.s1Tpl, TL.s1Tpl + 8, TL.s1Tpl + 16];
  const showTemplates = frame >= TL.s1Tpl;

  const cardO  = fade(frame, TL.s1Card, 16);
  const cardTy = interpolate(cardO, [0, 1], [20, 0]);

  const tabs = ["Paramétrage", "Modèle", "Données", "Aperçus", "Planification"];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Créez en" accent="5 étapes" frame={frame} startAt={TL.s1Card} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 28px", background: "#fafafa" }}>
          {tabs.map((tab, i) => (
            <div key={tab} style={{
              padding: "14px 16px", fontSize: 13,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? T.navy : T.muted,
              borderBottom: i === 0 ? `2px solid ${T.navy}` : "2px solid transparent",
              fontFamily: T.font, whiteSpace: "nowrap" as const,
            }}>{tab}</div>
          ))}
        </div>

        <div style={{ padding: "28px 36px 24px", fontFamily: T.font }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Nom */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Nom de la campagne *</div>
              <div style={{
                height: 46, borderRadius: 10, border: `1.5px solid ${nameBorder}`,
                padding: "0 16px", display: "flex", alignItems: "center",
                fontSize: 15, color: T.text, background: "#fff",
                transition: "border-color 0.2s",
              }}>
                {fName.text}<span style={{ opacity: 0.4 }}>{fName.cursor}</span>
              </div>
            </div>

            {/* Canal — selection cards */}
            {frame >= TL.s1Canal - 8 && (
              <div style={{ opacity: fade(frame, TL.s1Canal - 8, 14) }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Canal *</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {canalCards.map((c, i) => {
                    const cO   = fade(frame, TL.s1Canal + i * 10, 14);
                    const isSel = c.key === "SMS" && smsSelected;
                    const selSc = isSel ? spr(frame, TL.s1CanSel, fps, { damping: 14, stiffness: 200 }) : 0;
                    return (
                      <div key={c.key} style={{
                        flex: 1, padding: "14px 18px", borderRadius: 12,
                        border: isSel ? `2px solid ${T.mist}` : `1.5px solid ${T.border}`,
                        background: isSel ? "rgba(157,184,238,0.07)" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        opacity: cO,
                        transform: `scale(${isSel ? interpolate(selSc, [0, 1], [0.97, 1]) : 1})`,
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{c.label}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{c.desc}</div>
                        </div>
                        {isSel && (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", background: T.mist,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transform: `scale(${interpolate(selSc, [0, 1], [0, 1])})`,
                            flexShrink: 0,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modèle — template cards */}
            {showTemplates && (
              <div style={{ opacity: fade(frame, TL.s1Tpl, 14) }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Modèle de message</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {templateCards.map((tc, i) => {
                    const tO   = fade(frame, tplStarts[i], 14);
                    const isSel = i === 0 && frame >= TL.s1TplSel;
                    const tSc  = isSel ? spr(frame, TL.s1TplSel, fps, { damping: 14, stiffness: 200 }) : 0;
                    return (
                      <div key={tc.label} style={{
                        opacity: tO,
                        padding: "12px 16px", borderRadius: 10,
                        border: isSel ? `2px solid ${T.mist}` : `1px solid ${T.border}`,
                        background: isSel ? "rgba(157,184,238,0.06)" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transform: `scale(${isSel ? interpolate(tSc, [0, 1], [0.98, 1]) : 1})`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{tc.label}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Variables : {tc.vars}</div>
                        </div>
                        {isSel && (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", background: T.mist,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transform: `scale(${interpolate(tSc, [0, 1], [0, 1])})`,
                            flexShrink: 0, marginLeft: 12,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              background: T.navy, color: "#fff", padding: "11px 26px",
              borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: T.font,
              opacity: frame >= TL.s1TplSel ? 1 : 0.28,
            }}>Suivant →</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 3 — Step 2: Modèle SMS ─────────────────────────────────────────
function Step2Scene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.s2In || frame > TL.s2Out + 20) return null;
  const o     = fade(frame, TL.s2In, 18) * fdOut(frame, TL.s2Out, 16);
  const cardW = Math.min(vw * 0.58, 1000);

  const cardO  = fade(frame, TL.s2Card, 16);
  const cardTy = interpolate(cardO, [0, 1], [18, 0]);

  // Pill state helpers
  const CLICK_MAP: Record<string, number> = {
    tenant_name: TL.s2Click1, payment_url_amount: TL.s2Click2,
    payment_url: TL.s2Click3, agency_name: TL.s2Click4,
  };
  const isPillDone = (key: string) => !!CLICK_MAP[key] && frame >= CLICK_MAP[key] + 5;
  const pillFlash  = (key: string) => {
    const at = CLICK_MAP[key]; if (!at) return 0;
    const dt = frame - at; if (dt < 0 || dt > 18) return 0;
    return interpolate(dt, [0, 4, 18], [0, 0.45, 0], clamp);
  };

  // Variable spring scale (pops in on click)
  const varSc = (clickAt: number): number => {
    if (frame < clickAt) return 0;
    const s = spring({ frame: frame - clickAt, fps, config: { damping: 13, stiffness: 200 } });
    return interpolate(s, [0, 1], [0, 1]);
  };

  const segs = buildSmsSegments(frame);

  // Tab bar — "Modèle" active
  const tabs = ["Paramétrage", "Modèle", "Données", "Aperçus", "Planification"];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Rédigez avec" accent="des variables" frame={frame} startAt={TL.s2Card} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 28px", background: "#fafafa" }}>
          {tabs.map((tab, i) => (
            <div key={tab} style={{
              padding: "14px 16px", fontSize: 13,
              fontWeight: i === 1 ? 600 : 400,
              color: i === 1 ? T.navy : T.muted,
              borderBottom: i === 1 ? `2px solid ${T.navy}` : "2px solid transparent",
              fontFamily: T.font, whiteSpace: "nowrap" as const,
            }}>{tab}</div>
          ))}
        </div>

        {/* Two-column body */}
        <div style={{ display: "flex", minHeight: 420 }}>

          {/* LEFT — template editor */}
          <div style={{ width: 480, padding: "28px 32px", borderRight: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Nom du modèle</div>
            <div style={{
              height: 44, borderRadius: 10, border: `1.5px solid ${T.border}`,
              padding: "0 14px", display: "flex", alignItems: "center",
              fontSize: 14, color: T.muted, background: "#fafafa", marginBottom: 20,
            }}>Relance Impayé</div>

            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Message SMS *</div>
            {/* SMS text area with typed content */}
            <div style={{
              minHeight: 200, borderRadius: 10, border: `1.5px solid ${T.mist}`,
              padding: "14px 16px", background: "#fff",
              fontSize: 14, lineHeight: 1.7, color: T.text, fontFamily: T.font,
              display: "flex", flexWrap: "wrap" as const, alignContent: "flex-start",
            }}>
              {segs.map((seg, i) => (
                <span
                  key={i}
                  style={seg.isVar ? {
                    color: T.mist, fontWeight: 600,
                    background: "rgba(157,184,238,0.12)",
                    borderRadius: 4, padding: "1px 4px", margin: "0 1px",
                    display: "inline-block",
                    transform: `scale(${varSc(CLICK_MAP[
                      seg.varKey === "var1" ? "tenant_name"
                      : seg.varKey === "var2" ? "payment_url_amount"
                      : seg.varKey === "var3" ? "payment_url"
                      : "agency_name"
                    ])})`,
                    transformOrigin: "left center",
                  } : { color: T.text }}
                >{seg.text}</span>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
              Longueur estimée : {Math.min(segs.reduce((a, s) => a + s.text.length, 0), 213)} / 160 (segments)
            </div>
          </div>

          {/* RIGHT — variable pills */}
          <div style={{ flex: 1, padding: "28px 28px", background: "#fafafa" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Ajouter des variables</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.4 }}>Cliquez pour insérer dans le message</div>

            {PILL_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {row.map((key, ci) => {
                  const pillIdx = ri * 2 + ci;
                  const pillO   = fade(frame, TL.s2PillsIn + pillIdx * 6, 14);
                  const done    = isPillDone(key);
                  const flash   = pillFlash(key);
                  return (
                    <div key={key} style={{
                      flex: 1, padding: "8px 14px", borderRadius: 8,
                      border: done ? `1.5px solid ${T.mist}` : `1px solid ${T.border}`,
                      background: done
                        ? `rgba(157,184,238,${0.15 + flash})`
                        : flash > 0 ? `rgba(157,184,238,${flash + 0.05})` : "#fff",
                      fontSize: 12, fontWeight: 600,
                      color: done ? T.mist : T.text,
                      cursor: "pointer",
                      opacity: pillO,
                      textAlign: "center" as const,
                      transition: "background 0.1s",
                    }}>{key}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 4 — Step 3: Données CSV ────────────────────────────────────────
function Step3Scene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.s3In || frame > TL.s3Out + 20) return null;
  const o     = fade(frame, TL.s3In, 18) * fdOut(frame, TL.s3Out, 16);
  const cardW = Math.min(vw * 0.52, 860);

  const cardO  = fade(frame, TL.s3Card, 16);
  const cardTy = interpolate(cardO, [0, 1], [18, 0]);

  const colTags = ["tenant_reference", "contact", "payment_url_amount"];
  const loaded  = frame >= TL.s3Loaded;
  const loadedP = interpolate(frame, [TL.s3Loaded, TL.s3Loaded + 20], [0, 1], clamp);

  // Dropzone pulse
  const pulse   = 0.45 + 0.25 * Math.sin(frame * 0.18);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Importez vos" accent="destinataires" frame={frame} startAt={TL.s3Card} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>
        <div style={{ display: "flex" }}>

          {/* Left — Exporter */}
          <div style={{ flex: 1, padding: "28px 28px", borderRight: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: T.font }}>1. Exporter</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 18, fontFamily: T.font }}>
              Colonnes requises dans le fichier CSV :
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 24 }}>
              {colTags.map((tag, i) => (
                <div key={tag} style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: "rgba(157,184,238,0.10)",
                  border: `1px solid rgba(157,184,238,0.25)`,
                  fontSize: 12, fontWeight: 600, color: T.mist, fontFamily: T.font,
                  opacity: fade(frame, TL.s3Cols + i * 8, 14),
                  transform: `scale(${interpolate(fade(frame, TL.s3Cols + i * 8, 14), [0, 1], [0.8, 1])})`,
                }}>{tag}</div>
              ))}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              border: `1.5px solid ${T.border}`, borderRadius: 10,
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              color: T.text, fontFamily: T.font,
              opacity: fade(frame, TL.s3Cols + 24, 14),
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={T.text}><path fillRule="evenodd" clipRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" /></svg>
              Télécharger .csv
            </div>
          </div>

          {/* Right — Importer */}
          <div style={{ flex: 1, padding: "28px 28px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: T.font }}>2. Importer</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 18, fontFamily: T.font }}>
              Glissez-déposez votre fichier CSV
            </div>

            {/* Dropzone */}
            <div style={{
              borderRadius: 12,
              border: loaded
                ? `2px solid ${T.success}`
                : `2px dashed rgba(157,184,238,${pulse})`,
              background: loaded
                ? `rgba(50,149,71,${0.06 * loadedP})`
                : "rgba(157,184,238,0.03)",
              padding: "36px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, textAlign: "center" as const,
              opacity: fade(frame, TL.s3Drop, 14),
            }}>
              {loaded ? (
                <>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(50,149,71,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: `scale(${interpolate(loadedP, [0, 1], [0.5, 1])})`,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.success, fontFamily: T.font, opacity: loadedP }}>47 destinataires importés</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, opacity: loadedP }}>locataires_impayés_juin.csv · 47 lignes</div>
                </>
              ) : (
                <>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(157,184,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.mist} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, fontFamily: T.font }}>+ Déposez .csv</div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 5 — Step 4: Aperçus (4 destinataires) ──────────────────────────
function Step4Scene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.s4In || frame > TL.s4Out + 20) return null;
  const o     = fade(frame, TL.s4In, 18) * fdOut(frame, TL.s4Out, 16);
  const cardW = Math.min(vw * 0.62, 1040);

  const cardO  = fade(frame, TL.s4Card, 16);
  const cardTy = interpolate(cardO, [0, 1], [18, 0]);

  // Active row cycles through recipients
  const activeRow = frame >= TL.s4Sw3 ? 3 : frame >= TL.s4Sw2 ? 2 : frame >= TL.s4Sw1 ? 1 : 0;

  // Preview cross-fade: fades in on each switch
  const switchPoints = [TL.s4Preview, TL.s4Sw1, TL.s4Sw2, TL.s4Sw3];
  const lastSwitch   = [...switchPoints].reverse().find(s => frame >= s) ?? TL.s4Preview;
  const previewO     = fade(frame, lastSwitch, 12);

  const rec = RECIPIENTS[activeRow];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Chaque message" accent="personnalisé" frame={frame} startAt={TL.s4Card} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>
        <div style={{ display: "flex", minHeight: 380 }}>

          {/* Left — recipient list */}
          <div style={{ width: 300, borderRight: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{
              padding: "16px 20px", fontSize: 11, fontWeight: 700, color: T.muted,
              textTransform: "uppercase" as const, letterSpacing: 0.5,
              borderBottom: `1px solid ${T.border}`, background: "#fafafa",
              fontFamily: T.font,
            }}>Destinataires — 47</div>

            {RECIPIENTS.map((r, i) => {
              const rowO  = fade(frame, TL.s4Rows + i * 8, 14);
              const isHL  = i === activeRow && frame >= TL.s4Preview;
              const hlP   = isHL ? interpolate(frame, [lastSwitch, lastSwitch + 12], [0, 1], clamp) : 0;
              return (
                <div key={i} style={{
                  padding: "14px 20px",
                  borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
                  background: isHL ? `rgba(157,184,238,${0.08 * hlP})` : "transparent",
                  borderLeft: isHL ? `3px solid ${T.mist}` : "3px solid transparent",
                  opacity: rowO,
                  fontFamily: T.font,
                }}>
                  <div style={{ fontSize: 13, fontWeight: isHL ? 600 : 400, color: T.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r.phone}</div>
                  <div style={{ fontSize: 11, color: T.mist, fontWeight: 600, marginTop: 2 }}>{r.montant}</div>
                </div>
              );
            })}
          </div>

          {/* Right — SMS preview */}
          <div style={{ flex: 1, padding: "24px 28px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ opacity: previewO }}>
              {/* Header */}
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginBottom: 16, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: T.text }}>De :</span> SOCIALHAB
                {"  "}
                <span style={{ fontWeight: 600, color: T.text }}>À :</span> {rec.phone}
              </div>

              {/* SMS bubble */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{
                  maxWidth: 460,
                  background: "#fff",
                  border: `1px solid ${T.border}`,
                  borderRadius: "4px 16px 16px 16px",
                  padding: "14px 18px",
                  fontSize: 13, lineHeight: 1.65, color: T.text,
                  fontFamily: T.font,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  {/* Render message with name highlighted in mist */}
                  {rec.msg.split(rec.name).map((part, pi, arr) => (
                    <React.Fragment key={pi}>
                      {part}
                      {pi < arr.length - 1 && (
                        <span style={{ color: T.mist, fontWeight: 600, background: "rgba(157,184,238,0.10)", borderRadius: 3, padding: "0 3px" }}>{rec.name}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: T.font }}>12:27</div>
              </div>

              {/* Bottom tip */}
              <div style={{
                marginTop: 18, fontSize: 12, color: T.muted, fontFamily: T.font,
                padding: "10px 14px", background: "rgba(157,184,238,0.08)",
                borderRadius: 8, border: `1px solid rgba(157,184,238,0.20)`,
              }}>
                ✓ Longueur estimée : 160 / 160 (1 segment)
              </div>
            </div>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 6 — Step 5: Planification ──────────────────────────────────────
function Step5Scene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.s5In || frame > TL.s5Out + 20) return null;
  const o     = fade(frame, TL.s5In, 18) * fdOut(frame, TL.s5Out, 16);
  const cardW = Math.min(vw * 0.52, 860);

  const cardO  = fade(frame, TL.s5Card, 16);
  const cardTy = interpolate(cardO, [0, 1], [18, 0]);

  const fDate    = typewriter(frame, "16/03/2026  14:27", TL.s5Date, 12);
  const dateBorder = frame >= TL.s5Date ? T.mist : T.border;

  const isConfirmed = frame >= TL.s5Click + 14;
  const sumItems = [
    { k: "Nom",     v: "Relance Impayé Juin" },
    { k: "Canal",   v: "sms" },
    { k: "Modèle",  v: "Relance loyer impayé" },
    { k: "Cibles",  v: "47 destinataires" },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="PILOC · CAMPAGNES" title="Planifiez" accent="l'envoi" frame={frame} startAt={TL.s5Card} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>
        <div style={{ display: "flex", gap: 0 }}>

          {/* Left — date */}
          <div style={{ flex: 1, padding: "28px 28px", borderRight: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: T.font }}>Planifiez</div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 22, fontFamily: T.font }}>
              Choisissez la date et l'heure d'exécution.<br />
              Modifiable jusqu'à 5 min avant le lancement.
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: T.font }}>Date d'envoi</div>
            <div style={{
              height: 46, borderRadius: 10, padding: "0 16px",
              border: `1.5px solid ${dateBorder}`,
              display: "flex", alignItems: "center",
              fontSize: 15, color: T.text, background: "#fff", fontFamily: T.font,
            }}>
              {fDate.text}<span style={{ opacity: 0.4 }}>{fDate.cursor}</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 10, fontFamily: T.font, opacity: fade(frame, TL.s5Date + 6, 12) }}>
              Fuseau : Europe/Paris
            </div>

            {/* Smart tip */}
            {frame >= TL.s5Tip && (
              <div style={{
                marginTop: 20, padding: "12px 16px", borderRadius: 10,
                background: "rgba(50,149,71,0.06)", border: "1px solid rgba(50,149,71,0.18)",
                opacity: fade(frame, TL.s5Tip, 16), fontFamily: T.font,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.success, marginBottom: 3 }}>
                  ✓ Ce créneau permet d'espérer un bon taux de transformation
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>Mar–Jeu entre 9h et 12h — créneau optimal</div>
              </div>
            )}
          </div>

          {/* Right — summary */}
          <div style={{ flex: 1, padding: "28px 28px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: T.font }}>Récapitulatif</div>
            {sumItems.map(({ k, v }, i) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
                fontSize: 13, fontFamily: T.font,
                opacity: fade(frame, TL.s5Sum + i * 6, 14),
              }}>
                <span style={{ color: T.muted }}>{k}</span>
                <span style={{ fontWeight: 500, color: T.text }}>{v}</span>
              </div>
            ))}

            {/* Planifier button */}
            <div style={{ position: "relative", height: 48, marginTop: 24 }}>
              <div style={{
                position: "absolute", inset: 0, background: T.navy, color: "#fff",
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font, opacity: isConfirmed ? 0 : 1,
                transform: `scale(${
                  frame >= TL.s5Click && !isConfirmed
                    ? 1 - 0.05 * Math.sin(((frame - TL.s5Click) / 14) * Math.PI) : 1
                })`,
              }}>Planifier →</div>

              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(50,149,71,0.10)", color: T.success,
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: fade(frame, TL.s5Click + 14, 14), fontFamily: T.font,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Campagne planifiée
              </div>
            </div>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 7 — Dashboard résultats ────────────────────────────────────────
function DashboardScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.dashIn || frame > TL.dashOut + 20) return null;
  const o     = fade(frame, TL.dashIn, 18) * fdOut(frame, TL.dashOut, 16);
  const cardW = Math.min(vw * 0.82, 1440);

  const v0 = Math.round(interpolate(frame, [TL.dKpi, TL.dKpi + 55], [0, 195120], clamp));
  const v1 = Math.round(interpolate(frame, [TL.dKpi, TL.dKpi + 45], [0, 1275],   clamp));
  const v2 = Math.round(interpolate(frame, [TL.dKpi, TL.dKpi + 38], [0, 46],     clamp));

  const kpis = [
    { label: "Collecté via campagnes", display: `${fr(v0)} €`, color: T.success, sub: "Total encaissé" },
    { label: "Emails & SMS délivrés",  display: fr(v1),          color: T.mist,    sub: "Toutes campagnes" },
    { label: "Taux de paiement",       display: `${v2} %`,       color: T.orange,  sub: "Cibles → Payé" },
  ];

  const convBars = [
    { label: "Cible",   value: 1311, pct: 100, color: T.navy   },
    { label: "Délivré", value: 1275, pct: 97,  color: T.mist   },
    { label: "Payé",    value: 614,  pct: 46,  color: T.orange },
  ];

  const COL_W = ["30%", "10%", "10%", "14%", "13%", "14%", "9%"];
  const HDR   = ["Titre", "Canal", "Cible", "Délivré", "Payé", "Encaissé", ""];

  const cardO  = fade(frame, TL.dKpi - 6, 16);
  const cardTy = interpolate(cardO, [0, 1], [22, 0]);

  // Chart SVG clip
  const clipW = interpolate(frame, [TL.dChart, TL.dChart + 55], [0, 340], clamp);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="TABLEAU DE BORD" title="Le retour sur" accent="investissement" frame={frame} startAt={TL.dHeadline} />

      <div style={{ ...cardBase, width: cardW, overflow: "hidden", opacity: cardO, transform: `translateY(${cardTy}px)` }}>

        {/* KPI strip */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {kpis.map((kpi, i) => {
            const dt     = frame - TL.dAmount;
            const bounce = i === 0 && dt >= 0 ? 1 + 0.09 * Math.sin(Math.min(1, dt / 18) * Math.PI) : 1;
            return (
              <div key={i} style={{
                flex: 1, padding: "22px 28px",
                borderRight: i < 2 ? `1px solid ${T.border}` : "none",
                opacity: fade(frame, TL.dKpi, 18), fontFamily: T.font,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ fontSize: i === 0 ? 26 : 30, fontWeight: 800, color: kpi.color, transform: `scale(${bounce})`, transformOrigin: "left center" }}>{kpi.display}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{kpi.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Conversion bars + mini chart */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {/* Conv bars */}
          <div style={{ flex: 1, padding: "18px 28px", borderRight: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 14, fontFamily: T.font }}>Conversion globale</div>
            {convBars.map((b, i) => {
              const filled = interpolate(frame, [TL.dBars + i * 12, TL.dBars + i * 12 + 40], [0, b.pct], clamp);
              const maxW   = 280;
              return (
                <div key={i} style={{ marginBottom: i < 2 ? 12 : 0, fontFamily: T.font, opacity: fade(frame, TL.dBars + i * 12, 14) }}>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 5 }}>
                    {b.value} ({b.pct}%)
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, width: maxW, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: b.color, width: `${filled}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini revenue chart */}
          <div style={{ flex: 1.4, padding: "18px 28px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8, fontFamily: T.font }}>Montant collecté</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.success, fontFamily: T.font, marginBottom: 10 }}>195 120,37 €</div>
            <svg width="100%" viewBox="0 0 340 70" preserveAspectRatio="none" style={{ opacity: fade(frame, TL.dChart, 16) }}>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.success} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={T.success} stopOpacity={0.02} />
                </linearGradient>
                <clipPath id="cClip">
                  <rect x="0" y="0" width={clipW} height="70" />
                </clipPath>
              </defs>
              <polygon points="0,68 40,64 80,60 120,52 160,38 200,22 240,10 280,5 340,4 340,70 0,70" fill="url(#cGrad)" clipPath="url(#cClip)" />
              <polyline points="0,68 40,64 80,60 120,52 160,38 200,22 240,10 280,5 340,4" fill="none" stroke={T.success} strokeWidth="2.5"
                strokeDasharray={420} strokeDashoffset={interpolate(frame, [TL.dChart, TL.dChart + 55], [420, 0], clamp)} />
            </svg>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: "flex", background: "#fafafa", borderBottom: `1px solid ${T.border}`, padding: "0 16px", opacity: fade(frame, TL.dTable, 14) }}>
          {HDR.map((h, i) => (
            <div key={i} style={{ width: COL_W[i], padding: "11px 14px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: T.font, boxSizing: "border-box", flexShrink: 0 }}>{h}</div>
          ))}
        </div>

        {/* Table rows */}
        {CAMP_ROWS.map((row, idx) => {
          const isHL     = idx === 2 && frame >= TL.dHL;
          const hp       = isHL ? spring({ frame: frame - TL.dHL, fps, config: { damping: 28, stiffness: 120 } }) : 0;
          const rowScale = isHL ? interpolate(hp, [0, 1], [1, 1.025]) : 1;
          const blurAmt  = !isHL && frame >= TL.dHL ? interpolate(frame, [TL.dHL, TL.dHL + 20], [0, 2.5], clamp) : 0;
          const liveAmt  = idx === 2 && frame >= TL.dAmount
            ? `${fr(Math.round(interpolate(frame, [TL.dAmount, TL.dAmount + 35], [0, 20226.68], clamp) * 100) / 100)} €`
            : row.encaisse;
          const isGreen  = row.isGreen && (idx !== 2 || frame >= TL.dAmount);

          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", padding: "0 16px",
              borderBottom: idx < CAMP_ROWS.length - 1 ? `1px solid ${T.border}` : "none",
              opacity: fade(frame, TL.dRows + idx * 5, 14),
              background: isHL ? "rgba(157,184,238,0.04)" : "transparent",
              transform: `scale(${rowScale})`, transformOrigin: "center center",
              filter: `blur(${blurAmt}px)`,
              zIndex: isHL ? 2 : 1, position: "relative",
              boxShadow: isHL ? "0 8px 32px rgba(14,16,41,0.10)" : "none",
            }}>
              {[
                <span style={{ fontFamily: T.font, fontSize: 13, fontWeight: isHL ? 600 : 400, color: T.text }}>{row.titre}</span>,
                <CanalBadge canal={row.canal} />,
                <span style={{ fontFamily: T.font, fontSize: 13, color: T.muted }}>{row.cible}</span>,
                <span style={{ fontFamily: T.font, fontSize: 13, color: T.text }}>{row.delivre}</span>,
                <span style={{ fontFamily: T.font, fontSize: 13, color: T.text }}>{row.paye}</span>,
                <span style={{ fontFamily: T.font, fontSize: 13, fontWeight: isGreen ? 700 : 400, color: isGreen ? T.success : T.muted }}>
                  {idx === 2 ? liveAmt : row.encaisse}
                </span>,
                <span style={{ color: T.light, fontSize: 14 }}>›</span>,
              ].map((cell, ci) => (
                <div key={ci} style={{ width: COL_W[ci], padding: "0 14px", boxSizing: "border-box", flexShrink: 0, height: 60, display: "flex", alignItems: "center" }}>{cell}</div>
              ))}
            </div>
          );
        })}

      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 8 — CTA (Hero loop) ─────────────────────────────────────────────
function CTAScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.ctaIn) return null;
  const o      = fade(frame, TL.ctaIn, 18);
  const logoSc = spr(frame, TL.ctaIn,      fps, { damping: 18, stiffness: 120 });
  const chipSc = spr(frame, TL.ctaChip,    fps, { damping: 22, stiffness: 120 });
  const l1s    = spr(frame, TL.ctaLine1,   fps, { damping: 22, stiffness: 120 });
  const l2s    = spr(frame, TL.ctaLine2,   fps, { damping: 22, stiffness: 120 });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: o, fontFamily: T.font,
    }}>
      <div style={{ marginBottom: 28, opacity: interpolate(logoSc, [0, 1], [0, 1]), transform: `scale(${interpolate(logoSc, [0, 1], [0.7, 1])})` }}>
        <PilocLogo height={40} textColor="#fff" markColor={T.mist} />
      </div>

      <div style={{
        display: "inline-flex", padding: "5px 18px", borderRadius: 99,
        background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)",
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)",
        letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 28,
        opacity: chipSc, transform: `translateY(${interpolate(chipSc, [0, 1], [10, 0])}px)`,
      }}>Piloc · Campagnes</div>

      <div style={{
        fontSize: 88, fontWeight: 900, letterSpacing: -3.5, lineHeight: 1.05, color: "#fff",
        opacity: l1s, transform: `translateY(${interpolate(l1s, [0, 1], [18, 0])}px)`,
      }}>Relancez en masse.</div>

      <div style={{
        fontSize: 88, fontWeight: 900, letterSpacing: -3.5, lineHeight: 1.05, color: T.mist,
        opacity: l2s, transform: `translateY(${interpolate(l2s, [0, 1], [18, 0])}px)`,
      }}>Encaissez davantage.</div>
    </div>
  );
}

// ─── Main composition ──────────────────────────────────────────────────────
export const CampagnesDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: vw } = useVideoConfig();

  const [handle] = React.useState(() => delayRender("Loading Inter font"));
  React.useEffect(() => {
    waitForInter().then(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: T.navy, fontFamily: T.font, overflow: "hidden" }}>
      <HeroScene      frame={frame} fps={fps} />
      <Step1Scene     frame={frame} fps={fps} vw={vw} />
      <Step2Scene     frame={frame} fps={fps} vw={vw} />
      <Step3Scene     frame={frame} fps={fps} vw={vw} />
      <Step4Scene     frame={frame} fps={fps} vw={vw} />
      <Step5Scene     frame={frame} fps={fps} vw={vw} />
      <DashboardScene frame={frame} fps={fps} vw={vw} />
      <CTAScene       frame={frame} fps={fps} />

      {/* Step2Cursor — screen space, always on top */}
      <Step2Cursor frame={frame} fps={fps} />

      {/* Text overlays */}
      <TextOverlay frame={frame} showAt={TL.s1Canal + 12}  hideAt={TL.s1TplSel + 20} text="Sélectionnez le canal et le modèle" />
      <TextOverlay frame={frame} showAt={TL.s2Text + 10}   hideAt={TL.s2Click1 - 2}  text="Rédigez votre message..." />
      <TextOverlay frame={frame} showAt={TL.s2Click1 + 4}  hideAt={TL.s2Click4 + 20} text="Cliquez sur une variable pour l'insérer" />
      <TextOverlay frame={frame} showAt={TL.s3Loaded + 10} hideAt={TL.s3Out - 10}     text="47 locataires chargés — prêts à recevoir" />
      <TextOverlay frame={frame} showAt={TL.s4Preview + 8} hideAt={TL.s4Out - 10}     text="Chaque destinataire reçoit son message personnalisé" />
      <TextOverlay frame={frame} showAt={TL.s5Tip + 8}     hideAt={TL.s5Out - 10}     text="Créneau optimal · Mar–Jeu 9h–12h" />
      <TextOverlay frame={frame} showAt={TL.dKpi + 22}     hideAt={TL.dHL + 10}       text="195 120 € collectés suite à vos campagnes" />
      <TextOverlay frame={frame} showAt={TL.dHL + 14}      hideAt={TL.dashOut - 20}   text="Identifiez vos campagnes les plus rentables" />
    </AbsoluteFill>
  );
};
