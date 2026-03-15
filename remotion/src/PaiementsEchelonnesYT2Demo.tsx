import React from "react";
import {
  AbsoluteFill, Easing, continueRender, delayRender,
  interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { PilocLogo } from "./Icons";
import { waitForInter } from "./fonts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:    "#0E1029",
  mist:    "#9DB8EE",
  solar:   "#FFB784",
  surface: "#ffffff",
  text:    "#112431",
  muted:   "#6b7280",
  light:   "#a4afb7",
  border:  "#d9dfe3",
  bg:      "#f8f9fa",
  success: "#329547",
  error:   "#ec6369",
  warning: "#ffb704",
  info:    "#0066cc",
  font:    "'Inter', sans-serif",
};

const cardBase: React.CSSProperties = {
  background:   "rgba(255,255,255,0.97)",
  borderRadius: 16,
  border:       "1px solid rgba(255,255,255,0.60)",
  boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.28)",
};

// ─── Timeline (30fps, 1510 frames = 50.3s) ────────────────────────────────────
// Densité cible : ~0.7–1.0 événement/s. Intervalle de base : 18–20f. Dead zone max : 60f.
//
// Hero:       0–104    (3.5s)  — chip + title kinetic
// Dashboard:  120–420  (10s)   — KPIs 136, table 156, rows+badges 168–234, overlays 185–400
// Create:     430–724  (9.8s)  — fields 454–490, nb-cards 466–490, nbSelect 498, freqSelect 506, schedule 540–594
// Lifecycle:  730–1060 (11s)   — karim 746, états 810/870/950, headline 960, overlay 960–1040
// Notify:     1070–1354 (9.5s) — card 1084, cursor 1114–1164, confirm 1178, overlay 1120–1260
// CTA:        1370–1510 (4.7s) — Hero-loop ending (navy + logo + titre cinétique)
const TL = {
  // Scene 1 — Hero
  heroIn: 0, heroOut: 104,
  // Scene 2 — Dashboard
  dashIn: 120, kpiAll: 136, tableIn: 156, rows: 168, rowHighlight: 228,
  dashOut: 410, dashSceneOut: 420,
  // Scene 3 — Création — nbSelect avant freqSelect (8f)
  createIn: 430, formIn: 446,
  nbSelect: 498, freqSelect: 506,
  scheduleIn: 540, createOut: 714, createSceneOut: 724,
  // Scene 4 — Cycle de vie — lcSceneOut resserré (110f après incident)
  lcSceneIn: 730, karimIn: 746,
  lcValidated: 810, lcPayment: 870, lcIncident: 950,
  hl2Start: 960,
  lcSceneOut: 1060,
  // Scene 5 — Notification — cascade -130f
  notifierIn: 1070, notifierCardIn: 1084,
  cursorIn: 1114, cursorAt: 1150,
  notifyClick: 1164, confirm: 1178,
  notifyOut: 1354,
  // Scene 6 — CTA
  ctaIn: 1370, end: 1510,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const fade  = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [0, 1], clamp);
const fdOut = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [1, 0], clamp);
function spr(frame: number, startAt: number, fps: number, cfg = { damping: 22, stiffness: 140 }) {
  return spring({ frame: frame - startAt, fps, config: cfg });
}
const fr   = (n: number) => n.toLocaleString("fr-FR");

// Typewriter helper — skill: text-animations (smooth blink via interpolate, never per-char opacity)
function typewriter(f: number, text: string, startAt: number, fps: number, cps = 12) {
  const fpChar = fps / cps;
  const count  = Math.max(0, Math.min(text.length, Math.floor((f - startAt) / fpChar)));
  const blinkO = count < text.length
    ? interpolate(f % 14, [0, 7, 14], [1, 0, 1], clamp)
    : 0;
  return { text: text.substring(0, count), blinkO, done: count >= text.length };
}
// Smooth border color lerp: T.border → T.mist as a field activates
function fieldBorder(t: number) {
  const r = Math.round(interpolate(t, [0, 1], [217, 157], clamp));
  const g = Math.round(interpolate(t, [0, 1], [223, 184], clamp));
  const b = Math.round(interpolate(t, [0, 1], [227, 238], clamp));
  return `rgb(${r},${g},${b})`;
}
const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding:    "0 16px",
  boxSizing:  "border-box" as const,
  flexShrink: 0,
  fontSize:   14,
  color:      T.text,
  display:    "flex",
  alignItems: "center",
  ...extra,
});

// ─── Data ─────────────────────────────────────────────────────────────────────
type KpiItem = { label: string; value: number; sub: string; color: string; suffix?: string };
const KPI_DATA: KpiItem[] = [
  { label: "Non validées",  value: 14,    sub: "En attente de consentement", color: T.warning },
  { label: "En cours",      value: 38,    sub: "Plan actif",                 color: T.info    },
  { label: "Avec incident", value: 6,     sub: "Échéance(s) échouée(s)",     color: T.error   },
  { label: "À encaisser",   value: 12840, sub: "Sur 57 demandes actives",    color: T.text, suffix: " €" },
];

type BadgeType = "pending" | "validated" | "paid" | "incident" | "failed" | "scheduled" | "expired" | "active";
type RowData = {
  name: string; ref: string; amount: string; schedule: string;
  status: BadgeType; statusLabel: string;
  collected: string; total: string; pct: number; barColor: string;
  incident: string | null; incidentType: BadgeType | null;
};
const TABLE_ROWS: RowData[] = [
  { name: "Karim Benali",    ref: "CTR-2025-0112", amount: "450 €",   schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "150 €", total: "450 €",   pct: 33,  barColor: T.error,   incident: "Fonds insuf.",  incidentType: "incident" },
  { name: "Sophie Marchand", ref: "CTR-2025-0087", amount: "900 €",   schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "600 €", total: "900 €",   pct: 67,  barColor: T.warning, incident: null,            incidentType: null       },
  { name: "Lucas Fernandez", ref: "CTR-2024-0204", amount: "1 200 €", schedule: "4× mensuel", status: "pending",   statusLabel: "Non validée", collected: "0 €",   total: "1 200 €", pct: 0,   barColor: T.mist,    incident: null,            incidentType: null       },
  { name: "Amina Touré",     ref: "CTR-2025-0033", amount: "600 €",   schedule: "2× mensuel", status: "validated", statusLabel: "Validée",     collected: "600 €", total: "600 €",   pct: 100, barColor: T.success, incident: null,            incidentType: null       },
  { name: "Nathalie Lebrun", ref: "CTR-2025-0061", amount: "1 050 €", schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "350 €", total: "1 050 €", pct: 33,  barColor: T.error,   incident: "Carte expirée", incidentType: "incident" },
];
const ROW_DATES = ["03/03", "27/02", "25/02", "10/02", "01/02"];
const COL_W     = ["10%", "22%", "9%", "11%", "13%", "18%", "17%"];

const NB_OPTIONS = [2, 3, 4, 6];

const SCHEDULE_ROWS = [
  { label: "Éch. 1 · 01/04/2026", amount: "150,00 €" },
  { label: "Éch. 2 · 01/05/2026", amount: "150,00 €" },
  { label: "Éch. 3 · 01/06/2026", amount: "150,00 €" },
];

// ─── Cursor ───────────────────────────────────────────────────────────────────
interface WP { f: number; x: number; y: number }

// Plain function — NOT a hook (must not be prefixed with "use")
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

// NotifyScene: card 820px, centered at x=960, y≈682 (button center)
const CURSOR_WPS: WP[] = [
  { f: TL.cursorIn,           x: 1380, y: 820 }, // appears bottom-right
  { f: TL.cursorAt,           x: 960,  y: 682 }, // glides to button center
  { f: TL.notifyClick + 30,   x: 960,  y: 682 }, // holds after click
];

function Cursor({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.cursorIn || frame > TL.notifyOut) return null;
  const pos     = getCursorPos(CURSOR_WPS, frame, fps);
  const o       = fade(frame, TL.cursorIn, 10) * fdOut(frame, TL.notifyOut - 20, 14);
  const clickDt = frame - TL.notifyClick;
  const isClick = clickDt >= 0 && clickDt <= 22;
  const dotSc   = isClick ? 1 - 0.4 * Math.sin((clickDt / 22) * Math.PI) : 1;
  const ringR   = isClick ? interpolate(clickDt, [0, 22], [14, 38], clamp) : 14;
  const ringO   = isClick ? interpolate(clickDt, [0, 4, 22], [0, 1, 0], clamp) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, pointerEvents: "none", zIndex: 300 }}>
      <div style={{ position: "absolute", left: pos.x - ringR, top: pos.y - ringR, width: ringR * 2, height: ringR * 2, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.85)", opacity: ringO }} />
      <div style={{ position: "absolute", left: pos.x - 10, top: pos.y - 10, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 4px rgba(255,255,255,0.22), 0 0 24px rgba(255,255,255,0.55)", transform: `scale(${dotSc})`, transformOrigin: "center center" }} />
    </div>
  );
}

// ─── TextOverlay ──────────────────────────────────────────────────────────────
function TextOverlay({ frame, showAt, hideAt, text }: { frame: number; showAt: number; hideAt: number; text: string }) {
  const o = Math.min(
    interpolate(frame, [showAt, showAt + 12], [0, 1], clamp),
    interpolate(frame, [hideAt - 10, hideAt],  [1, 0], clamp),
  );
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(14,16,41,0.65)", backdropFilter: "blur(2px)", borderRadius: 8, padding: "8px 20px", fontSize: 18, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", fontFamily: T.font, opacity: o, zIndex: 200 }}>
      {text}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<BadgeType, { bg: string; color: string }> = {
  pending:   { bg: "rgba(255,183,4,.15)",   color: "#b37d00" },
  validated: { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  paid:      { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  active:    { bg: "rgba(160,184,238,.15)", color: "#3b6fdb" },
  incident:  { bg: "rgba(236,99,105,.12)",  color: "#dc2626" },
  failed:    { bg: "rgba(236,99,105,.12)",  color: "#dc2626" },
  scheduled: { bg: "rgba(255,183,4,.15)",   color: "#b37d00" },
  expired:   { bg: "rgba(107,114,128,.12)", color: "#4b5563" },
};

function Badge({ type, label, scale = 1 }: { type: BadgeType; label: string; scale?: number }) {
  const s = BADGE_STYLES[type] ?? BADGE_STYLES.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", background: s.bg, color: s.color, transform: `scale(${scale})`, transformOrigin: "left center" }}>
      {label}
    </span>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color, frame, startAt, duration = 40, height = 6 }: {
  pct: number; color: string; frame: number; startAt: number; duration?: number; height?: number;
}) {
  const filled = interpolate(frame, [startAt, startAt + duration], [0, pct], clamp);
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", borderRadius: 99, background: color, width: `${filled}%` }} />
    </div>
  );
}

// ─── SceneHeadline — typewriter title (text-animations skill) ─────────────────
function SceneHeadline({ chip, title, accent, frame, startAt, fps, color = T.mist }: {
  chip: string; title: string; accent?: string; frame: number; startAt: number; fps: number; color?: string;
}) {
  const chipO = fade(frame, startAt, 12);
  const tw    = typewriter(frame, title, startAt + 8, fps, 22);
  // Accent appears 6f after title finishes typing
  const accentDelay = startAt + 8 + Math.ceil(title.length / 22 * fps) + 6;
  const accentO = fade(frame, accentDelay, 14);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)", letterSpacing: 2.2, textTransform: "uppercase", fontFamily: T.font, marginBottom: 16, opacity: chipO }}>
        {chip}
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1.5, color: "#fff", fontFamily: T.font }}>
        {tw.text}<span style={{ opacity: tw.blinkO * 0.5, fontWeight: 300 }}>|</span>
        {accent && <> <span style={{ color, opacity: accentO }}>{accent}</span></>}
      </div>
    </div>
  );
}

// ─── Table header cell style ──────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: "12px 16px", boxSizing: "border-box", flexShrink: 0,
  fontSize: 12, fontWeight: 600, color: T.muted,
  background: "#fafafa", borderBottom: `1px solid ${T.border}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 1 — Hero
// ═══════════════════════════════════════════════════════════════════════════════
function HeroScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.heroIn || frame > TL.heroOut + 20) return null;
  const o       = fade(frame, TL.heroIn, 18) * fdOut(frame, TL.heroOut, 16);
  const chipSc  = spr(frame, 4,  fps, { damping: 22, stiffness: 120 });
  const line1Sc = spr(frame, 16, fps, { damping: 22, stiffness: 120 });
  const line2Sc = spr(frame, 30, fps, { damping: 22, stiffness: 120 });
  const tagO    = fade(frame, 44, 16) * fdOut(frame, TL.heroOut, 16);
  const logoO   = fade(frame, 50, 16) * fdOut(frame, TL.heroOut, 16);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      {/* Chip */}
      <div style={{ display: "inline-flex", padding: "6px 20px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: T.mist, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: T.font, marginBottom: 36, opacity: chipSc, transform: `translateY(${interpolate(chipSc, [0, 1], [14, 0])}px)` }}>
        Piloc · Paiements Échelonnés
      </div>
      {/* Line 1 */}
      <div style={{ fontSize: 118, fontWeight: 900, color: "#fff", letterSpacing: -4.5, lineHeight: 1.0, fontFamily: T.font, opacity: line1Sc, transform: `translateY(${interpolate(line1Sc, [0, 1], [34, 0])}px)` }}>
        Paiement
      </div>
      {/* Line 2 */}
      <div style={{ fontSize: 118, fontWeight: 900, color: T.mist, letterSpacing: -4.5, lineHeight: 1.0, fontFamily: T.font, opacity: line2Sc, transform: `translateY(${interpolate(line2Sc, [0, 1], [34, 0])}px)` }}>
        Échelonné
      </div>
      {/* Tagline */}
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.40)", fontFamily: T.font, marginTop: 30, opacity: tagO }}>
        Créez · Suivez · Réagissez
      </div>
      {/* Logo */}
      <div style={{ marginTop: 28, opacity: logoO }}>
        <PilocLogo height={34} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 2 — Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.dashIn || frame > TL.dashSceneOut + 16) return null;
  const o      = fade(frame, TL.dashIn, 16) * fdOut(frame, TL.dashOut, 18);
  const cardTy = interpolate(spr(frame, TL.dashIn + 4, fps), [0, 1], [22, 0]);
  // Row slide-up on entry — easing from skill (Easing.out + quad)
  const easeOpt = { ...clamp, easing: Easing.out(Easing.quad) };
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o, paddingTop: 20 }}>
      <SceneHeadline chip="Piloc · Tableau de Bord" title="Tous vos plans," accent="en un coup d'œil" frame={frame} startAt={TL.dashIn + 4} fps={fps} />
      {/* Floating card */}
      <div style={{ ...cardBase, width: 1500, overflow: "hidden", transform: `translateY(${cardTy}px)` }}>
        {/* KPI strip */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {KPI_DATA.map((kpi, i) => {
            const kpiO = fade(frame, TL.kpiAll, 18);
            const val  = Math.round(interpolate(frame, [TL.kpiAll, TL.kpiAll + 35], [0, kpi.value], clamp));
            return (
              <div key={i} style={{ flex: 1, padding: "20px 24px", borderRight: i < 3 ? `1px solid ${T.border}` : "none", opacity: kpiO }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>
                  {fr(val)}{kpi.suffix ?? ""}
                </div>
                <div style={{ fontSize: 12, color: T.light, marginTop: 6 }}>{kpi.sub}</div>
              </div>
            );
          })}
        </div>
        {/* Table header */}
        <div style={{ display: "flex", background: "#fafafa", borderBottom: `1px solid ${T.border}` }}>
          {["Création", "Client · Réf.", "Montant", "Échéancier", "Statut", "Encaissé / Appelé", "Incident"].map((h, i) => (
            <div key={i} style={{ ...TH, width: COL_W[i] }}>{h}</div>
          ))}
        </div>
        {/* Table rows */}
        {TABLE_ROWS.map((row, i) => {
          const rowStart = TL.tableIn + i * 10;
          const rowO     = fade(frame, rowStart, 16);
          const rowTy    = interpolate(frame, [rowStart, rowStart + 22], [14, 0], { ...clamp, easing: Easing.out(Easing.quad) });
          const popAt    = TL.rows + i * 6;
          const badgeSc  = spr(frame, popAt, fps, { damping: 14, stiffness: 220 });
          const barFill  = interpolate(frame, [popAt + 2, popAt + 42], [0, row.pct], clamp);

          // Row 0 (Karim): incident flip at TL.rowHighlight — starts clean, turns red
          const isFlipRow     = i === 0;
          const incidentFlipT = isFlipRow ? Math.min(1, Math.max(0, (frame - TL.rowHighlight) / 18)) : 0;
          const incidentBadgeSc = isFlipRow ? spr(frame, TL.rowHighlight, fps, { damping: 13, stiffness: 220 }) : 0;
          // Bar color: mist → error for row 0
          const barColorR  = isFlipRow ? Math.round(interpolate(incidentFlipT, [0, 1], [157, 236])) : null;
          const barColorG  = isFlipRow ? Math.round(interpolate(incidentFlipT, [0, 1], [184,  99])) : null;
          const barColorB  = isFlipRow ? Math.round(interpolate(incidentFlipT, [0, 1], [238, 105])) : null;
          const resolvedBarColor = isFlipRow ? `rgb(${barColorR},${barColorG},${barColorB})` : row.barColor;
          // Row bg tint: transparent → red tint
          const rowBg = isFlipRow ? `rgba(236,99,105,${0.05 * incidentFlipT})` : "transparent";
          const rowBorderLeft = isFlipRow && incidentFlipT > 0
            ? `3px solid rgba(236,99,105,${incidentFlipT})`
            : undefined;

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 64, borderBottom: i < TABLE_ROWS.length - 1 ? `1px solid ${T.border}` : "none", opacity: rowO, transform: `translateY(${rowTy}px)`, background: rowBg, borderLeft: rowBorderLeft, transition: "none" }}>
              <div style={{ ...cell({ color: T.muted, fontSize: 13 }), width: COL_W[0] }}>{ROW_DATES[i]}</div>
              <div style={{ ...cell({ flexDirection: "column", alignItems: "flex-start" }), width: COL_W[1] }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{row.ref}</div>
              </div>
              <div style={{ ...cell({ fontWeight: 600 }), width: COL_W[2] }}>{row.amount}</div>
              <div style={{ ...cell({ color: T.muted }), width: COL_W[3] }}>{row.schedule}</div>
              <div style={{ ...cell(), width: COL_W[4] }}>
                <Badge type={row.status} label={row.statusLabel} scale={badgeSc} />
              </div>
              <div style={{ ...cell({ flexDirection: "column", alignItems: "flex-start", gap: 5 }), width: COL_W[5] }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{row.collected} / {row.total}</div>
                <div style={{ background: "#f1f5f9", borderRadius: 99, height: 5, overflow: "hidden", width: 100 }}>
                  <div style={{ height: "100%", borderRadius: 99, background: resolvedBarColor, width: `${barFill}%` }} />
                </div>
              </div>
              <div style={{ ...cell(), width: COL_W[6] }}>
                {isFlipRow ? (
                  // Incident badge springs in at rowHighlight — was "—" before
                  incidentFlipT > 0
                    ? <Badge type="incident" label="Fonds insuf." scale={incidentBadgeSc} />
                    : <span style={{ color: T.light, fontSize: 14 }}>—</span>
                ) : (
                  row.incident && row.incidentType
                    ? <Badge type={row.incidentType} label={row.incident} scale={badgeSc} />
                    : <span style={{ color: T.light, fontSize: 14 }}>—</span>
                )}
              </div>
            </div>
          );
        })}
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.muted }}>6 résultats sur 57 — page 1 / 10</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 3 — Création du plan
// ═══════════════════════════════════════════════════════════════════════════════
function CreateScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.createIn || frame > TL.createSceneOut + 16) return null;
  const o      = fade(frame, TL.createIn, 16) * fdOut(frame, TL.createOut, 16);
  const cardTy = interpolate(spr(frame, TL.createIn + 4, fps), [0, 1], [22, 0]);

  // Frequency pill highlight springs in when "Mensuel" is selected
  const freqSc = spr(frame, TL.freqSelect, fps, { damping: 18, stiffness: 140 });
  const freqBg = interpolate(freqSc, [0, 1], [0, 1], clamp);

  const f0 = fade(frame, TL.formIn + 8,  14);
  const f1 = fade(frame, TL.formIn + 20, 14);
  const f2 = fade(frame, TL.formIn + 32, 14);
  const f3 = fade(frame, TL.formIn + 44, 14);

  // Typewriter fills (text-animations skill) — montant + date
  const montantTw = typewriter(frame, "450", TL.formIn + 8,  fps, 10);
  const dateTw    = typewriter(frame, "01/04/2026", TL.formIn + 44, fps, 10);
  const montantBorderColor = fieldBorder(fade(frame, TL.formIn + 8,  14));
  const dateBorderColor    = fieldBorder(fade(frame, TL.formIn + 44, 14));

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="Piloc · Nouveau Plan" title="Configurez en" accent="30 secondes" frame={frame} startAt={TL.createIn + 4} fps={fps} />
      {/* Form card */}
      <div style={{ ...cardBase, width: 860, padding: "32px 36px", transform: `translateY(${cardTy}px)` }}>
        {/* Payeur sélectionné */}
        <div style={{ opacity: fade(frame, TL.formIn, 14), background: T.bg, borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Payeur sélectionné</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Karim Benali</div>
            <div style={{ fontSize: 12, color: T.muted }}>CTR-2025-0112</div>
          </div>
          <Badge type="validated" label="Actif" />
        </div>
        {/* Montant + Nb échéances */}
        <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1, opacity: f0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>Montant total (€)</div>
            <div style={{ height: 42, border: `1.5px solid ${montantBorderColor}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontWeight: 700, color: T.text, background: "#fff", fontFamily: T.font }}>
              {montantTw.text}<span style={{ opacity: montantTw.blinkO, fontWeight: 300, marginLeft: 1 }}>|</span>
            </div>
          </div>
          <div style={{ flex: 1, opacity: f1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8 }}>Nombre d'échéances</div>
            <div style={{ display: "flex", gap: 10 }}>
              {NB_OPTIONS.map((nb, i) => {
                const cardO  = fade(frame, TL.formIn + 20 + i * 8, 12);
                const isSel  = nb === 3 && frame >= TL.nbSelect;
                const selSpr = isSel ? spr(frame, TL.nbSelect, fps, { damping: 14, stiffness: 200 }) : 1;
                const sc     = isSel ? interpolate(selSpr, [0, 1], [0.88, 1]) : 1;
                return (
                  <div key={nb} style={{ flex: 1, height: 42, borderRadius: 7, border: `1.5px solid ${isSel ? T.mist : T.border}`, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, background: isSel ? "rgba(157,184,238,0.12)" : "#fff", opacity: cardO, transform: `scale(${sc})`, transformOrigin: "center center", position: "relative", overflow: "hidden" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isSel ? "#3b6fdb" : T.text, lineHeight: 1 }}>{nb}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: isSel ? "#3b6fdb" : T.muted }}>éch.</span>
                    {isSel && <div style={{ position: "absolute", top: 4, right: 6, width: 7, height: 7, borderRadius: "50%", background: T.mist, opacity: selSpr }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Périodicité */}
        <div style={{ marginBottom: 18, opacity: f2 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8 }}>Périodicité</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Hebdomadaire", "Mensuel", "Bimensuel"].map((freq) => {
              const isSel = freq === "Mensuel";
              return (
                <div key={freq} style={{ padding: "9px 20px", borderRadius: 8, border: `1.5px solid ${isSel ? T.mist : T.border}`, fontSize: 14, fontWeight: isSel ? 600 : 400, position: "relative", overflow: "hidden", background: "#fff", color: isSel ? "#3b6fdb" : T.muted }}>
                  {isSel && <div style={{ position: "absolute", inset: 0, background: "rgba(157,184,238,0.14)", opacity: freqBg }} />}
                  <span style={{ position: "relative" }}>{freq}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* 1ère échéance */}
        <div style={{ marginBottom: 28, opacity: f3 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>Date de la 1ʳᵉ échéance</div>
          <div style={{ height: 42, border: `1.5px solid ${dateBorderColor}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: T.text, background: "#fff", gap: 10, fontFamily: T.font }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={T.muted}><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd"/></svg>
            <span style={{ fontWeight: 600 }}>
              {dateTw.text}<span style={{ opacity: dateTw.blinkO, fontWeight: 300, marginLeft: 1 }}>|</span>
            </span>
          </div>
        </div>
        {/* Aperçu échéances */}
        <div style={{ background: T.bg, borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Aperçu des échéances</div>
          {SCHEDULE_ROWS.map((row, i) => {
            const rowO = fade(frame, TL.scheduleIn + i * 18, 14);
            const ty   = interpolate(frame, [TL.scheduleIn + i * 18, TL.scheduleIn + i * 18 + 20], [8, 0], clamp);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: i < 2 ? 8 : 0, opacity: rowO, transform: `translateY(${ty}px)` }}>
                <span style={{ color: T.muted }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.amount}</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14, opacity: fade(frame, TL.scheduleIn + 54, 14) }}>
            <span style={{ fontWeight: 600, color: T.text }}>Total</span>
            <span style={{ fontWeight: 700, color: T.text }}>450,00 €</span>
          </div>
        </div>
        {/* Submit button */}
        {(() => {
          const btnO  = fade(frame, TL.scheduleIn + 70, 16);
          const btnSc = interpolate(spr(frame, TL.scheduleIn + 70, fps, { damping: 18, stiffness: 150 }), [0, 1], [0.94, 1]);
          return (
            <div style={{ marginTop: 20, opacity: btnO, transform: `scale(${btnSc})` }}>
              <div style={{ height: 48, borderRadius: 10, background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: T.font }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Envoyer la demande
              </div>
            </div>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 4 — Cycle de vie
// ═══════════════════════════════════════════════════════════════════════════════
function LifecycleScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.lcSceneIn || frame > TL.lcSceneOut + 20) return null;
  const o      = fade(frame, TL.lcSceneIn, 16) * fdOut(frame, TL.lcSceneOut, 20);
  const cardTy = interpolate(spr(frame, TL.lcSceneIn + 4, fps), [0, 1], [22, 0]);

  // State machine
  const isValidated = frame >= TL.lcValidated;
  const isPayment   = frame >= TL.lcPayment;
  const isIncident  = frame >= TL.lcIncident;

  // Main status badge
  const badgeType:  BadgeType = isIncident ? "incident"  : isValidated ? "validated" : "pending";
  const badgeLabel: string    = isIncident ? "Incident"  : isValidated ? "Validée"   : "En attente";
  const badgeSc = isIncident
    ? spr(frame, TL.lcIncident,  fps, { damping: 13, stiffness: 200 })
    : isValidated
    ? spr(frame, TL.lcValidated, fps, { damping: 13, stiffness: 200 })
    : spr(frame, TL.karimIn,     fps, { damping: 13, stiffness: 200 });

  // Incident badge
  const incidentSc = isIncident ? spr(frame, TL.lcIncident, fps, { damping: 13, stiffness: 200 }) : 0;

  // Progress bar + color
  const barFilled = interpolate(frame, [TL.lcPayment, TL.lcPayment + 30], [0, 33], clamp);
  const incT      = isIncident ? Math.min(1, (frame - TL.lcIncident) / 22) : 0;
  const barR      = Math.round(interpolate(incT, [0, 1], [157, 236]));
  const barG      = Math.round(interpolate(incT, [0, 1], [184, 99]));
  const barB      = Math.round(interpolate(incT, [0, 1], [238, 105]));
  const barColor  = `rgb(${barR},${barG},${barB})`;

  // Collected amount count-up on lcPayment
  const collectedVal = Math.round(interpolate(frame, [TL.lcPayment, TL.lcPayment + 25], [0, 150], clamp));

  // Echéances pills
  const ech1State: BadgeType = isPayment  ? "paid"   : "scheduled";
  const ech2State: BadgeType = isIncident ? "failed" : "scheduled";
  const ech1Sc = isPayment  ? spr(frame, TL.lcPayment,  fps, { damping: 13, stiffness: 180 }) : 1;
  const ech2Sc = isIncident ? spr(frame, TL.lcIncident, fps, { damping: 13, stiffness: 200 }) : 1;

  // Headline cross-fade — shared bascule at TL.hl2Start
  const hl1O = fade(frame, TL.lcSceneIn + 4, 14) * fdOut(frame, TL.hl2Start, 16);
  const hl2O = fade(frame, TL.hl2Start, 16)       * fdOut(frame, TL.lcSceneOut, 18);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      {/* Cross-fade headline */}
      <div style={{ position: "relative", height: 110, width: "100%", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: hl1O }}>
          <SceneHeadline chip="Piloc · Suivi Temps Réel" title="Cycle de vie du" accent="plan" frame={frame} startAt={TL.lcSceneIn + 4} fps={fps} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: hl2O }}>
          <SceneHeadline chip="Piloc · Suivi Temps Réel" title="Incident détecté" accent="automatiquement" frame={frame} startAt={TL.hl2Start} fps={fps} color={T.error} />
        </div>
      </div>

      {/* Lifecycle card */}
      <div style={{ position: "relative", width: 1000, transform: `translateY(${cardTy}px)` }}>
        <div style={{ ...cardBase, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "22px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, TL.karimIn, 14) }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Karim Benali</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>CTR-2025-0112 · 3× mensuel · 450 €</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge type={badgeType} label={badgeLabel} scale={badgeSc} />
              {isIncident && <Badge type="incident" label="Fonds insuf." scale={incidentSc} />}
            </div>
          </div>
          {/* Progression */}
          <div style={{ padding: "22px 28px", borderBottom: `1px solid ${T.border}`, opacity: fade(frame, TL.karimIn + 8, 14) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: T.muted }}>Encaissé</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fr(collectedVal)} € / 450 €</span>
            </div>
            <ProgressBar pct={33} color={barColor} frame={frame} startAt={TL.lcPayment} duration={30} height={10} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Créé le 03/03/2026</span>
              <span style={{ fontSize: 12, color: T.muted }}>Honorées : {isPayment ? "1" : "0"} / 3</span>
            </div>
          </div>
          {/* Échéances */}
          <div style={{ padding: "20px 28px", opacity: fade(frame, TL.karimIn + 16, 14) }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Échéances</div>
            {[
              { idx: 1, date: "03/02/2026", amount: "150 €", state: ech1State, label: isPayment ? "Payée" : "Prévue", sc: ech1Sc },
              { idx: 2, date: "03/03/2026", amount: "150 €", state: ech2State, label: isIncident ? "Échouée" : "Prévue", sc: ech2Sc },
              { idx: 3, date: "03/04/2026", amount: "150 €", state: "scheduled" as BadgeType, label: "Prévue", sc: 1 },
            ].map((ech) => (
              <div key={ech.idx} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: ech.idx < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.muted, flexShrink: 0 }}>
                  {ech.idx}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{ech.date} · {ech.amount}</div>
                <Badge type={ech.state} label={ech.label} scale={ech.sc} />
              </div>
            ))}
          </div>
        </div>
        {/* Incident red overlay */}
        {incT > 0 && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `rgba(236,99,105,${0.05 * incT})`, border: `1.5px solid rgba(236,99,105,${0.35 * incT})`, pointerEvents: "none" }} />
        )}
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 5 — Notification SMS
// ═══════════════════════════════════════════════════════════════════════════════
function NotifyScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.notifierIn || frame > TL.notifyOut + 16) return null;
  const o      = fade(frame, TL.notifierIn, 16) * fdOut(frame, TL.notifyOut, 16);
  const cardTy = interpolate(spr(frame, TL.notifierCardIn, fps, { damping: 18, stiffness: 170 }), [0, 1], [20, 0]);

  // Card spring pop
  const cardSc = interpolate(
    spr(frame, TL.notifierCardIn, fps, { damping: 18, stiffness: 170 }),
    [0, 1], [0.88, 1]
  );

  // Button click feedback
  const clickDt   = frame - TL.notifyClick;
  const isClick   = clickDt >= 0 && clickDt <= 14;
  const btnSc     = isClick ? 1 - 0.05 * Math.sin((clickDt / 14) * Math.PI) : 1;
  const flashO    = interpolate(frame, [TL.notifyClick, TL.notifyClick + 5, TL.notifyClick + 22], [0, 0.3, 0], clamp);
  const confirmed = frame >= TL.confirm;
  const confirmO  = fade(frame, TL.confirm, 12);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, opacity: o }}>
      <SceneHeadline chip="Piloc · Notification SMS" title="Relancez le payeur" accent="en 1 clic" frame={frame} startAt={TL.notifierIn + 4} fps={fps} />
      {/* Notify card */}
      <div style={{ ...cardBase, width: 820, transform: `scale(${cardSc}) translateY(${cardTy}px)`, overflow: "hidden" }}>
        {/* Incident header */}
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${T.border}`, background: "rgba(236,99,105,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Karim Benali</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>CTR-2025-0112 · Échéance 2 non honorée</div>
          </div>
          <Badge type="incident" label="Fonds insuf." />
        </div>
        {/* Incident details */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 40 }}>
            <div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Montant dû</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.error }}>150 €</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Échéance</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>03/03/2026</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Canal</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>SMS</div>
            </div>
          </div>
        </div>
        {/* Action button */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ position: "relative", height: 56 }}>
            {/* Primary button */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#fff", gap: 10, transform: `scale(${btnSc})`, opacity: confirmed ? 0 : 1, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: T.solar, opacity: flashO }} />
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ position: "relative", flexShrink: 0 }}>
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" fill="white" />
              </svg>
              <span style={{ position: "relative" }}>Notifier le client</span>
            </div>
            {/* Confirmation */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(50,149,71,0.10)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 16, fontWeight: 600, color: T.success, opacity: confirmO }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Notification envoyée
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 6 — CTA (Hero-loop)
// ═══════════════════════════════════════════════════════════════════════════════
function CTAScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.ctaIn) return null;
  const o       = fade(frame, TL.ctaIn, 20);
  const logoSpr = spr(frame, TL.ctaIn + 6, fps, { damping: 18, stiffness: 120 });
  const chipO   = fade(frame, TL.ctaIn + 12, 14);
  const line1Sc = spr(frame, TL.ctaIn + 20, fps, { damping: 22, stiffness: 120 });
  const line2Sc = spr(frame, TL.ctaIn + 34, fps, { damping: 22, stiffness: 120 });
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      {/* Logo */}
      <div style={{ marginBottom: 38, opacity: logoSpr, transform: `scale(${interpolate(logoSpr, [0, 1], [0.7, 1])})` }}>
        <PilocLogo height={36} />
      </div>
      {/* Chip */}
      <div style={{ display: "inline-flex", padding: "6px 20px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: T.mist, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: T.font, marginBottom: 36, opacity: chipO }}>
        Piloc · Paiements Échelonnés
      </div>
      {/* Line 1 */}
      <div style={{ fontSize: 88, fontWeight: 900, color: "#fff", letterSpacing: -3.5, lineHeight: 1.05, fontFamily: T.font, opacity: line1Sc, transform: `translateY(${interpolate(line1Sc, [0, 1], [28, 0])}px)` }}>
        Encaissez vos retards.
      </div>
      {/* Line 2 */}
      <div style={{ fontSize: 88, fontWeight: 900, color: T.mist, letterSpacing: -3.5, lineHeight: 1.05, fontFamily: T.font, opacity: line2Sc, transform: `translateY(${interpolate(line2Sc, [0, 1], [28, 0])}px)` }}>
        Sans friction.
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════
export const PaiementsEchelonnesYT2Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [handle] = React.useState(() => delayRender("Loading Inter font"));
  React.useEffect(() => {
    waitForInter().then(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: T.navy, fontFamily: T.font, overflow: "hidden" }}>
      <HeroScene      frame={frame} fps={fps} />
      <DashboardScene frame={frame} fps={fps} />
      <CreateScene    frame={frame} fps={fps} />
      <LifecycleScene frame={frame} fps={fps} />
      <NotifyScene    frame={frame} fps={fps} />
      <CTAScene       frame={frame} fps={fps} />

      {/* Text overlays — screen space, burned-in */}
      <TextOverlay frame={frame} showAt={185}  hideAt={280}  text="57 plans actifs · 12 840 € à encaisser" />
      <TextOverlay frame={frame} showAt={295}  hideAt={395}  text="6 incidents à traiter · 14 consentements en attente" />
      <TextOverlay frame={frame} showAt={540}  hideAt={660}  text="Configuration du plan en 30 secondes" />
      <TextOverlay frame={frame} showAt={800}  hideAt={870}  text="En attente du consentement du payeur" />
      <TextOverlay frame={frame} showAt={870}  hideAt={940}  text="Validée · Carte bancaire enregistrée" />
      <TextOverlay frame={frame} showAt={940}  hideAt={958}  text="1ʳᵉ échéance reçue · 150 € encaissés" />
      <TextOverlay frame={frame} showAt={960}  hideAt={1040} text="Incident · Fonds insuffisants" />
      <TextOverlay frame={frame} showAt={1120} hideAt={1260} text="1 clic pour notifier le payeur par SMS" />

      {/* Cursor — always last (screen space) */}
      <Cursor frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
