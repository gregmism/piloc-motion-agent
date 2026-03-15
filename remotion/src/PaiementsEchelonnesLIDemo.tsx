import React from "react";
import {
  AbsoluteFill, continueRender, delayRender,
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

// ─── Timeline (30 fps) — LinkedIn ~40s, dynamique ────────────────────────────
// Hero → Dashboard live → Création → Lifecycle → Notif → CTA
const TL = {
  // Scene 0 — Hero title
  heroIn:  0,  heroOut: 80,  heroSceneOut: 92,

  // Scene 1 — Dashboard + incident live sur Karim
  dashIn:      100, kpiAll:      116,  tableIn:    136,  rows:     148,
  karimHL:     230, // row spotlight
  incidentPop: 276, // badge bounce in, ligne rouge, KPI +1
  dashOut:     430, dashSceneOut: 442,

  // Scene 2 — Création
  createIn:    452, formIn:      464,  scheduleIn: 496,
  createOut:   580, createSceneOut: 592,

  // Scene 3 — Cycle de vie
  lcSceneIn:   602, karimIn:     616,
  lcValidated: 652, lcPayment:   682,  lcIncident: 712,
  hl2Start:    722, lcSceneOut:  842,

  // Scene 4 — Notification
  notifierIn:  852, notifierCardIn: 862,
  cursorIn:    894, cursorAt:    930,  notifyClick: 942,
  confirm:     956, notifyOut:   1052,

  // Scene 5 — CTA
  ctaIn: 1062, end: 1210,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const fade  = (f: number, s: number, d = 12) => interpolate(f, [s, s + d], [0, 1], clamp);
const fdOut = (f: number, s: number, d = 12) => interpolate(f, [s, s + d], [1, 0], clamp);
function spr(frame: number, startAt: number, fps: number, cfg = { damping: 16, stiffness: 200 }) {
  return spring({ frame: frame - startAt, fps, config: cfg });
}
const fr   = (n: number) => n.toLocaleString("fr-FR");
const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "0 16px", boxSizing: "border-box" as const, flexShrink: 0,
  fontSize: 14, color: T.text, display: "flex", alignItems: "center", ...extra,
});

// ─── Data ─────────────────────────────────────────────────────────────────────
type BadgeType = "pending" | "validated" | "paid" | "incident" | "failed" | "scheduled" | "expired" | "active";

const KPI_INITIAL = [14, 38, 5, 12840];
const KPI_META = [
  { label: "Non validées",  sub: "En attente de consentement", color: T.warning },
  { label: "En cours",      sub: "Plan actif",                 color: T.info    },
  { label: "Avec incident", sub: "Échéance(s) échouée(s)",     color: T.error   },
  { label: "À encaisser",   sub: "Sur 57 demandes actives",    color: T.text, suffix: " €" },
];

type RowData = {
  name: string; ref: string; amount: string; schedule: string;
  status: BadgeType; statusLabel: string;
  collected: string; total: string; pct: number;
};
const TABLE_ROWS: RowData[] = [
  { name: "Karim Benali",    ref: "CTR-2025-0112", amount: "450 €",   schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "150 €", total: "450 €",   pct: 33  },
  { name: "Sophie Marchand", ref: "CTR-2025-0087", amount: "900 €",   schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "600 €", total: "900 €",   pct: 67  },
  { name: "Lucas Fernandez", ref: "CTR-2024-0204", amount: "1 200 €", schedule: "4× mensuel", status: "pending",   statusLabel: "Non validée", collected: "0 €",   total: "1 200 €", pct: 0   },
  { name: "Amina Touré",     ref: "CTR-2025-0033", amount: "600 €",   schedule: "2× mensuel", status: "validated", statusLabel: "Validée",     collected: "600 €", total: "600 €",   pct: 100 },
  { name: "Nathalie Lebrun", ref: "CTR-2025-0061", amount: "1 050 €", schedule: "3× mensuel", status: "validated", statusLabel: "Validée",     collected: "350 €", total: "1 050 €", pct: 33  },
];
const ROW_DATES   = ["03/03", "27/02", "25/02", "10/02", "01/02"];
const ROW_BARCOL  = [T.mist, T.warning, T.mist, T.success, T.error];
const COL_W       = ["10%", "22%", "9%", "11%", "13%", "18%", "17%"];

const SCHEDULE_ROWS = [
  { label: "Éch. 1 · 01/04/2026", amount: "150,00 €" },
  { label: "Éch. 2 · 01/05/2026", amount: "150,00 €" },
  { label: "Éch. 3 · 01/06/2026", amount: "150,00 €" },
];

// ─── Cursor — positions dynamiques selon vw/vh ────────────────────────────────
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

function Cursor({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.cursorIn || frame > TL.notifyOut) return null;
  const { width: vw, height: vh } = useVideoConfig();
  const wps: WP[] = [
    { f: TL.cursorIn,         x: vw * 0.72, y: vh * 0.76 },
    { f: TL.cursorAt,         x: vw * 0.50, y: vh * 0.62 },
    { f: TL.notifyClick + 30, x: vw * 0.50, y: vh * 0.62 },
  ];
  const pos     = getCursorPos(wps, frame, fps);
  const o       = fade(frame, TL.cursorIn, 8) * fdOut(frame, TL.notifyOut - 16, 12);
  const clickDt = frame - TL.notifyClick;
  const isClick = clickDt >= 0 && clickDt <= 22;
  const dotSc   = isClick ? 1 - 0.4 * Math.sin((clickDt / 22) * Math.PI) : 1;
  const ringR   = isClick ? interpolate(clickDt, [0, 22], [14, 40], clamp) : 14;
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
    interpolate(frame, [showAt, showAt + 10], [0, 1], clamp),
    interpolate(frame, [hideAt - 8, hideAt],  [1, 0], clamp),
  );
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(14,16,41,0.68)", backdropFilter: "blur(2px)", borderRadius: 8, padding: "8px 20px", fontSize: 18, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", fontFamily: T.font, opacity: o, zIndex: 200 }}>
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

// ─── SceneHeadline ────────────────────────────────────────────────────────────
function SceneHeadline({ chip, title, accent, frame, startAt, color = T.mist }: {
  chip: string; title: string; accent?: string; frame: number; startAt: number; color?: string;
}) {
  const chipO  = fade(frame, startAt, 10);
  const titleO = fade(frame, startAt + 6, 12);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)", letterSpacing: 2.2, textTransform: "uppercase", fontFamily: T.font, marginBottom: 14, opacity: chipO }}>
        {chip}
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1.5, color: "#fff", fontFamily: T.font, opacity: titleO }}>
        {title}{accent && <> <span style={{ color }}>{accent}</span></>}
      </div>
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "12px 16px", boxSizing: "border-box", flexShrink: 0,
  fontSize: 12, fontWeight: 600, color: T.muted,
  background: "#fafafa", borderBottom: `1px solid ${T.border}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 0 — Hero
// ═══════════════════════════════════════════════════════════════════════════════
function HeroScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.heroIn || frame > TL.heroSceneOut + 14) return null;
  const o = fade(frame, TL.heroIn, 14) * fdOut(frame, TL.heroOut, 14);

  const logoO   = fade(frame, TL.heroIn + 4, 12);
  const chipO   = fade(frame, TL.heroIn + 10, 12);
  const line1O  = fade(frame, TL.heroIn + 16, 14);
  const line2O  = fade(frame, TL.heroIn + 24, 14);
  const subO    = fade(frame, TL.heroIn + 34, 14);

  const line1Ty = interpolate(frame, [TL.heroIn + 16, TL.heroIn + 30], [18, 0], clamp);
  const line2Ty = interpolate(frame, [TL.heroIn + 24, TL.heroIn + 38], [18, 0], clamp);

  const titleSize = Math.round(interpolate(vw, [1080, 1920], [72, 96], clamp));

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, opacity: o }}>
      {/* Logo */}
      <div style={{ opacity: logoO, marginBottom: 36 }}>
        <PilocLogo height={44} textColor="#ffffff" markColor={T.mist} />
      </div>
      {/* Chip */}
      <div style={{ display: "inline-flex", padding: "6px 20px", borderRadius: 99, background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.72)", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: T.font, marginBottom: 28, opacity: chipO }}>
        PAIEMENT ÉCHELONNÉ
      </div>
      {/* Title */}
      <div style={{ textAlign: "center", fontFamily: T.font, lineHeight: 1.1 }}>
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: -3.5, color: "#ffffff", opacity: line1O, transform: `translateY(${line1Ty}px)` }}>
          Plus de flexibilité
        </div>
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: -3.5, color: T.mist, opacity: line2O, transform: `translateY(${line2Ty}px)` }}>
          pour vos clients
        </div>
      </div>
      {/* Sub */}
      <div style={{ marginTop: 28, fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.55)", fontFamily: T.font, opacity: subO, letterSpacing: 0.3 }}>
        Créez un plan en 30 secondes · Suivez chaque échéance · Réagissez aux incidents
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 1 — Dashboard avec incident live sur Karim
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.dashIn || frame > TL.dashSceneOut + 14) return null;
  const o = fade(frame, TL.dashIn, 14) * fdOut(frame, TL.dashOut, 14);
  const cardW = Math.min(vw * 0.82, 1500);

  const hasIncident  = frame >= TL.incidentPop;
  const hlSp = frame >= TL.karimHL
    ? spring({ frame: frame - TL.karimHL, fps, config: { damping: 28, stiffness: 120 } })
    : 0;
  const incSp = hasIncident
    ? spring({ frame: frame - TL.incidentPop, fps, config: { damping: 9, stiffness: 280 } })
    : 0;
  const flashO = interpolate(
    frame,
    [TL.incidentPop, TL.incidentPop + 5, TL.incidentPop + 28, TL.incidentPop + 90],
    [0, 0.22, 0.10, 0.06],
    clamp
  );
  const incKpiDt    = frame - TL.incidentPop;
  const incKpiVal   = hasIncident ? 6 : Math.round(interpolate(frame, [TL.kpiAll, TL.kpiAll + 32], [0, 5], clamp));
  const incKpiBounce = hasIncident
    ? 1 + 0.24 * Math.sin(Math.min(1, incKpiDt / 16) * Math.PI)
    : 1;
  const karimBarT    = hasIncident ? Math.min(1, incKpiDt / 10) : 0;
  const karimBarR    = Math.round(interpolate(karimBarT, [0, 1], [157, 236]));
  const karimBarG    = Math.round(interpolate(karimBarT, [0, 1], [184, 99]));
  const karimBarB    = Math.round(interpolate(karimBarT, [0, 1], [238, 105]));
  const karimBarColor = `rgb(${karimBarR},${karimBarG},${karimBarB})`;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o, paddingTop: 16 }}>
      <SceneHeadline chip="Piloc · Tableau de Bord" title="Tous vos plans," accent="en temps réel" frame={frame} startAt={TL.dashIn + 2} />
      <div style={{ ...cardBase, width: cardW, overflow: "hidden" }}>
        {/* KPI strip */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {KPI_META.map((kpi, i) => {
            const kpiO  = fade(frame, TL.kpiAll, 14);
            const rawVal = i === 2
              ? incKpiVal
              : Math.round(interpolate(frame, [TL.kpiAll, TL.kpiAll + 32], [0, KPI_INITIAL[i]], clamp));
            const bounce = i === 2 ? incKpiBounce : 1;
            return (
              <div key={i} style={{ flex: 1, padding: "20px 24px", borderRight: i < 3 ? `1px solid ${T.border}` : "none", opacity: kpiO }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color, lineHeight: 1, transform: `scale(${bounce})`, transformOrigin: "left center", display: "inline-block" }}>
                  {fr(rawVal)}{kpi.suffix ?? ""}
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
          const rowO  = fade(frame, TL.tableIn, 12);
          const popAt = TL.rows + i * 6;
          const statusSc = spr(frame, popAt, fps, { damping: 14, stiffness: 220 });
          const barFill  = interpolate(frame, [popAt + 2, popAt + 38], [0, row.pct], clamp);

          const isKarim     = i === 0;
          const scale       = isKarim ? interpolate(hlSp, [0, 1], [1, 1.016]) : 1;
          const blurAmt     = !isKarim && frame >= TL.karimHL
            ? interpolate(frame, [TL.karimHL, TL.karimHL + 18], [0, 2.2], clamp)
            : 0;
          const shadowAlpha = interpolate(hlSp, [0, 1], [0, 0.14]);
          const rowBg       = isKarim && hasIncident ? `rgba(236,99,105,${flashO})` : "transparent";
          const barColor    = isKarim ? karimBarColor : ROW_BARCOL[i];

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", height: 64,
              borderBottom: i < TABLE_ROWS.length - 1 ? `1px solid ${T.border}` : "none",
              opacity: rowO, position: "relative",
              transform: `scale(${scale})`, transformOrigin: "center center",
              filter: blurAmt > 0 ? `blur(${blurAmt}px)` : "none",
              boxShadow: isKarim && frame >= TL.karimHL ? `0 8px 32px rgba(14,16,41,${shadowAlpha})` : "none",
              zIndex: isKarim ? 2 : 1,
              background: rowBg,
            }}>
              <div style={{ ...cell({ color: T.muted, fontSize: 13 }), width: COL_W[0] }}>{ROW_DATES[i]}</div>
              <div style={{ ...cell({ flexDirection: "column", alignItems: "flex-start" }), width: COL_W[1] }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{row.ref}</div>
              </div>
              <div style={{ ...cell({ fontWeight: 600 }), width: COL_W[2] }}>{row.amount}</div>
              <div style={{ ...cell({ color: T.muted }), width: COL_W[3] }}>{row.schedule}</div>
              <div style={{ ...cell(), width: COL_W[4] }}>
                <Badge type={row.status} label={row.statusLabel} scale={statusSc} />
              </div>
              <div style={{ ...cell({ flexDirection: "column", alignItems: "flex-start", gap: 5 }), width: COL_W[5] }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{row.collected} / {row.total}</div>
                <div style={{ background: "#f1f5f9", borderRadius: 99, height: 5, overflow: "hidden", width: 100 }}>
                  <div style={{ height: "100%", borderRadius: 99, background: barColor, width: `${barFill}%` }} />
                </div>
              </div>
              <div style={{ ...cell(), width: COL_W[6] }}>
                {isKarim ? (
                  hasIncident
                    ? <Badge type="incident" label="Fonds insuf." scale={incSp} />
                    : <span style={{ color: T.light, fontSize: 14 }}>—</span>
                ) : (
                  <span style={{ color: T.light, fontSize: 14 }}>—</span>
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
// SCENE 2 — Création
// ═══════════════════════════════════════════════════════════════════════════════
function CreateScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.createIn || frame > TL.createSceneOut + 14) return null;
  const o      = fade(frame, TL.createIn, 12) * fdOut(frame, TL.createOut, 12);
  const cardW  = Math.min(vw * 0.82, 840);
  const freqSc = spr(frame, TL.formIn + 30, fps, { damping: 16, stiffness: 200 });
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="Piloc · Nouveau Plan" title="Configurez en" accent="30 secondes" frame={frame} startAt={TL.createIn + 2} />
      <div style={{ ...cardBase, width: cardW, padding: "28px 32px" }}>
        <div style={{ opacity: fade(frame, TL.formIn, 10), background: T.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>Payeur sélectionné</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Karim Benali</div>
            <div style={{ fontSize: 12, color: T.muted }}>CTR-2025-0112</div>
          </div>
          <Badge type="validated" label="Actif" />
        </div>
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, opacity: fade(frame, TL.formIn + 6, 10) }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 5 }}>Montant total (€)</div>
            <div style={{ height: 40, border: `1.5px solid ${T.mist}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontWeight: 700, color: T.text, background: "#fff" }}>450</div>
          </div>
          <div style={{ flex: 1, opacity: fade(frame, TL.formIn + 14, 10) }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 5 }}>Nombre d'échéances</div>
            <div style={{ height: 40, border: `1.5px solid ${T.border}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: T.text, background: "#fff", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>3 échéances</span>
              <span style={{ color: T.muted }}>▾</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16, opacity: fade(frame, TL.formIn + 22, 10) }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 7 }}>Périodicité</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Hebdomadaire", "Mensuel", "Bimensuel"].map((freq) => {
              const isSel = freq === "Mensuel";
              const selSc = isSel ? interpolate(freqSc, [0, 1], [0, 1], clamp) : 0;
              return (
                <div key={freq} style={{ padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${isSel ? T.mist : T.border}`, fontSize: 14, fontWeight: isSel ? 600 : 400, position: "relative", overflow: "hidden", background: "#fff", color: isSel ? "#3b6fdb" : T.muted }}>
                  {isSel && <div style={{ position: "absolute", inset: 0, background: "rgba(157,184,238,0.14)", opacity: selSc }} />}
                  <span style={{ position: "relative" }}>{freq}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Aperçu des échéances</div>
          {SCHEDULE_ROWS.map((row, i) => {
            const rowO = fade(frame, TL.scheduleIn + i * 12, 10);
            const ty   = interpolate(frame, [TL.scheduleIn + i * 12, TL.scheduleIn + i * 12 + 16], [8, 0], clamp);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: i < 2 ? 7 : 0, opacity: rowO, transform: `translateY(${ty}px)` }}>
                <span style={{ color: T.muted }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.amount}</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 10, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14, opacity: fade(frame, TL.scheduleIn + 36, 10) }}>
            <span style={{ fontWeight: 600, color: T.text }}>Total</span>
            <span style={{ fontWeight: 700, color: T.text }}>450,00 €</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 3 — Cycle de vie
// ═══════════════════════════════════════════════════════════════════════════════
function LifecycleScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.lcSceneIn || frame > TL.lcSceneOut + 18) return null;
  const o      = fade(frame, TL.lcSceneIn, 12) * fdOut(frame, TL.lcSceneOut, 16);
  const cardW  = Math.min(vw * 0.82, 1000);

  const isValidated = frame >= TL.lcValidated;
  const isPayment   = frame >= TL.lcPayment;
  const isIncident  = frame >= TL.lcIncident;

  const badgeType:  BadgeType = isIncident ? "incident"  : isValidated ? "validated" : "pending";
  const badgeLabel: string    = isIncident ? "Incident"  : isValidated ? "Validée"   : "En attente";
  const badgeSc = isIncident
    ? spring({ frame: frame - TL.lcIncident,  fps, config: { damping: 9, stiffness: 280 } })
    : isValidated
    ? spring({ frame: frame - TL.lcValidated, fps, config: { damping: 13, stiffness: 220 } })
    : spring({ frame: frame - TL.karimIn,     fps, config: { damping: 13, stiffness: 200 } });

  const incidentSc = isIncident
    ? spring({ frame: frame - TL.lcIncident, fps, config: { damping: 9, stiffness: 280 } })
    : 0;

  const barFilled = interpolate(frame, [TL.lcPayment, TL.lcPayment + 24], [0, 33], clamp);
  const incT      = isIncident ? Math.min(1, (frame - TL.lcIncident) / 16) : 0;
  const barR      = Math.round(interpolate(incT, [0, 1], [157, 236]));
  const barG      = Math.round(interpolate(incT, [0, 1], [184, 99]));
  const barB      = Math.round(interpolate(incT, [0, 1], [238, 105]));
  const barColor  = `rgb(${barR},${barG},${barB})`;

  const collectedVal = Math.round(interpolate(frame, [TL.lcPayment, TL.lcPayment + 20], [0, 150], clamp));

  const ech1State: BadgeType = isPayment  ? "paid"   : "scheduled";
  const ech2State: BadgeType = isIncident ? "failed" : "scheduled";
  const ech1Sc = isPayment  ? spring({ frame: frame - TL.lcPayment,  fps, config: { damping: 13, stiffness: 200 } }) : 1;
  const ech2Sc = isIncident ? spring({ frame: frame - TL.lcIncident, fps, config: { damping: 9,  stiffness: 280 } }) : 1;

  const hl1O = fade(frame, TL.lcSceneIn + 2, 12) * fdOut(frame, TL.hl2Start, 12);
  const hl2O = fade(frame, TL.hl2Start, 12)       * fdOut(frame, TL.lcSceneOut, 14);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <div style={{ position: "relative", height: 100, width: "100%", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: hl1O }}>
          <SceneHeadline chip="Piloc · Suivi Temps Réel" title="Cycle de vie du" accent="plan" frame={frame} startAt={TL.lcSceneIn + 2} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: hl2O }}>
          <SceneHeadline chip="Piloc · Suivi Temps Réel" title="Incident détecté" accent="automatiquement" frame={frame} startAt={TL.hl2Start} color={T.error} />
        </div>
      </div>
      <div style={{ position: "relative", width: cardW }}>
        <div style={{ ...cardBase, overflow: "hidden" }}>
          <div style={{ padding: "20px 26px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, TL.karimIn, 12) }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Karim Benali</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>CTR-2025-0112 · 3× mensuel · 450 €</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge type={badgeType} label={badgeLabel} scale={badgeSc} />
              {isIncident && <Badge type="incident" label="Fonds insuf." scale={incidentSc} />}
            </div>
          </div>
          <div style={{ padding: "20px 26px", borderBottom: `1px solid ${T.border}`, opacity: fade(frame, TL.karimIn + 6, 12) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: T.muted }}>Encaissé</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fr(collectedVal)} € / 450 €</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden", width: "100%" }}>
              <div style={{ height: "100%", borderRadius: 99, background: barColor, width: `${barFilled}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Créé le 03/03/2026</span>
              <span style={{ fontSize: 12, color: T.muted }}>Honorées : {isPayment ? "1" : "0"} / 3</span>
            </div>
          </div>
          <div style={{ padding: "18px 26px", opacity: fade(frame, TL.karimIn + 12, 12) }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Échéances</div>
            {[
              { idx: 1, date: "03/02/2026", amount: "150 €", state: ech1State, label: isPayment ? "Payée" : "Prévue", sc: ech1Sc },
              { idx: 2, date: "03/03/2026", amount: "150 €", state: ech2State, label: isIncident ? "Échouée" : "Prévue", sc: ech2Sc },
              { idx: 3, date: "03/04/2026", amount: "150 €", state: "scheduled" as BadgeType, label: "Prévue", sc: 1 },
            ].map((ech) => (
              <div key={ech.idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: ech.idx < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.muted, flexShrink: 0 }}>{ech.idx}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{ech.date} · {ech.amount}</div>
                <Badge type={ech.state} label={ech.label} scale={ech.sc} />
              </div>
            ))}
          </div>
        </div>
        {incT > 0 && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `rgba(236,99,105,${0.05 * incT})`, border: `1.5px solid rgba(236,99,105,${0.38 * incT})`, pointerEvents: "none" }} />
        )}
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 4 — Notification SMS
// ═══════════════════════════════════════════════════════════════════════════════
function NotifyScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.notifierIn || frame > TL.notifyOut + 14) return null;
  const o      = fade(frame, TL.notifierIn, 12) * fdOut(frame, TL.notifyOut, 14);
  const cardW  = Math.min(vw * 0.82, 820);
  const cardSc = interpolate(spr(frame, TL.notifierCardIn, fps, { damping: 16, stiffness: 200 }), [0, 1], [0.88, 1]);
  const clickDt   = frame - TL.notifyClick;
  const isClick   = clickDt >= 0 && clickDt <= 14;
  const btnSc     = isClick ? 1 - 0.06 * Math.sin((clickDt / 14) * Math.PI) : 1;
  const flashO    = interpolate(frame, [TL.notifyClick, TL.notifyClick + 4, TL.notifyClick + 20], [0, 0.32, 0], clamp);
  const confirmed = frame >= TL.confirm;
  const confirmO  = fade(frame, TL.confirm, 10);
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: o }}>
      <SceneHeadline chip="Piloc · Notification SMS" title="Relancez le payeur" accent="en 1 clic" frame={frame} startAt={TL.notifierIn + 2} />
      <div style={{ ...cardBase, width: cardW, transform: `scale(${cardSc})`, overflow: "hidden" }}>
        <div style={{ padding: "20px 26px", borderBottom: `1px solid ${T.border}`, background: "rgba(236,99,105,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Karim Benali</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>CTR-2025-0112 · Échéance 2 non honorée</div>
          </div>
          <Badge type="incident" label="Fonds insuf." />
        </div>
        <div style={{ padding: "18px 26px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 40 }}>
            <div><div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Montant dû</div><div style={{ fontSize: 22, fontWeight: 700, color: T.error }}>150 €</div></div>
            <div><div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Échéance</div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>03/03/2026</div></div>
            <div><div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Canal</div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>SMS</div></div>
          </div>
        </div>
        <div style={{ padding: "22px 26px" }}>
          <div style={{ position: "relative", height: 54 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#fff", gap: 10, transform: `scale(${btnSc})`, opacity: confirmed ? 0 : 1, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: T.solar, opacity: flashO }} />
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ position: "relative", flexShrink: 0 }}>
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" fill="white" />
              </svg>
              <span style={{ position: "relative" }}>Notifier le client</span>
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(50,149,71,0.10)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 16, fontWeight: 600, color: T.success, opacity: confirmO }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Notification envoyée
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 5 — CTA
// ═══════════════════════════════════════════════════════════════════════════════
function CTAScene({ frame, fps, vw }: { frame: number; fps: number; vw: number }) {
  if (frame < TL.ctaIn) return null;
  const o        = fade(frame, TL.ctaIn, 20);
  const sc       = interpolate(spr(frame, TL.ctaIn, fps, { damping: 16, stiffness: 120 }), [0, 1], [0.88, 1]);
  const cardW    = Math.min(vw * 0.64, 700);
  const features = ["Consentement CB sécurisé", "Suivi en temps réel", "Relance SMS en 1 clic"];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, pointerEvents: "none", zIndex: 100 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,10,28,0.65)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${sc})`, background: T.surface, borderRadius: 20, padding: "44px 56px", boxShadow: "0 48px 120px rgba(0,0,0,0.45)", width: cardW, textAlign: "center", fontFamily: T.font }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mist, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 18 }}>PILOC · PAIEMENT ÉCHELONNÉ</div>
        {/* Headline reécrit */}
        <div style={{ fontSize: 34, fontWeight: 800, color: T.text, lineHeight: 1.2, letterSpacing: -1, marginBottom: 8 }}>
          Offrez la flexibilité
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: T.mist, lineHeight: 1.2, letterSpacing: -1, marginBottom: 20 }}>
          qu'ils attendent.
        </div>
        <div style={{ fontSize: 15, color: T.muted, lineHeight: 1.8, marginBottom: 28 }}>
          Un plan créé en 30 secondes.<br />Un suivi automatique. Une relance en un clic.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {features.map((feat, i) => (
            <span key={feat} style={{ background: "rgba(157,184,238,0.15)", color: T.mist, borderRadius: 99, fontSize: 13, fontWeight: 600, padding: "7px 18px", opacity: fade(frame, TL.ctaIn + 12 + i * 7, 12) }}>
              {feat}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center", opacity: fade(frame, TL.ctaIn + 26, 12) }}>
          <PilocLogo height={28} textColor={T.text} markColor={T.mist} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════
export const PaiementsEchelonnesLIDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: vw, height: vh } = useVideoConfig();

  const [handle] = React.useState(() => delayRender("Loading Inter font"));
  React.useEffect(() => {
    waitForInter().then(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: T.navy, fontFamily: T.font, overflow: "hidden" }}>
      <HeroScene      frame={frame} fps={fps} vw={vw} />
      <DashboardScene frame={frame} fps={fps} vw={vw} />
      <CreateScene    frame={frame} fps={fps} vw={vw} />
      <LifecycleScene frame={frame} fps={fps} vw={vw} />
      <NotifyScene    frame={frame} fps={fps} vw={vw} />
      <CTAScene       frame={frame} fps={fps} vw={vw} />

      {/* Text overlays */}
      <TextOverlay frame={frame} showAt={150} hideAt={220} text="57 plans actifs · 12 840 € à encaisser" />
      <TextOverlay frame={frame} showAt={252} hideAt={350} text="Incident détecté sur la demande de Karim" />
      <TextOverlay frame={frame} showAt={470} hideAt={550} text="Plan configuré en 30 secondes" />
      <TextOverlay frame={frame} showAt={654} hideAt={724} text="Validée · Carte bancaire enregistrée" />
      <TextOverlay frame={frame} showAt={724} hideAt={812} text="Incident · Fonds insuffisants" />
      <TextOverlay frame={frame} showAt={906} hideAt={1032} text="1 clic pour notifier le payeur par SMS" />

      {/* Cursor — toujours en dernier */}
      <Cursor frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
