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

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:    "#0E1029",
  mist:    "#9DB8EE",
  surface: "#ffffff",
  bg:      "#f8f9fa",
  text:    "#112431",
  muted:   "#6b7280",
  light:   "#a4afb7",
  border:  "#d9dfe3",
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

// ─── Timeline (30fps, 1200 frames = 40s) ─────────────────────────────────────
// Densité cible : ~0.7–1.0 événement/s par scène. Intervalle de base : 18–20f.
// Dwell minimum entre deux événements : 20f. Dead zone max : 60f.
//
// Hero:       0–88     (2.9s)  — logo spring, kinetic title
// Dashboard:  90–460   (12.3s) — KPIs 106, table 130, rows+badges 148–184, highlight 228, overlays 244–450
// Panel:      480–726  (8.2s)  — cards 496/514/532/550, role flip 594, MFA flip 630, unlock flip 666
// Invitation: 736–1044 (10.3s) — fields 756/772, role cards 794, select 848, agency 866, click 930, success 934
// CTA:        1060–1200 (4.7s) — Hero-loop ending
const TL = {
  // Hero
  heroIn: 0, heroText: 18, heroOut: 80,
  // Dashboard — badges done at ~184, highlight 44f later at 228, overlays cross-fade immediately
  dashIn: 90, kpiAll: 106, tableIn: 130, rows: 148,
  rowHighlight: 228,
  overlayText1: 244, overlayText1Out: 362,
  overlayText2: 364, overlayText2Out: 450,
  dashOut: 460,
  // Panel — all 4 cards done at ~564, flips start 30f later, spaced 36f apart
  panelIn: 480, panelOpen: 496, securityIn: 594, activityIn: 666, panelOut: 726,
  // Invitation — agency + footer appear AFTER role selection, 18f intervals
  inviteIn: 736, formFields: 756,
  dropdownOpen: 794, dropdownSelect: 848,
  cursorIn: 900, cursorAt: 920, clickFrame: 930, successIn: 934,
  inviteOut: 1044,
  // CTA
  ctaIn: 1060, end: 1200,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const fade  = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [0, 1], clamp);
const fdOut = (f: number, s: number, d = 20) => interpolate(f, [s, s + d], [1, 0], clamp);

function spr(frame: number, startAt: number, fps: number, cfg = { damping: 22, stiffness: 140 }) {
  return spring({ frame: frame - startAt, fps, config: cfg });
}

const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "0 16px",
  boxSizing: "border-box" as const,
  flexShrink: 0,
  fontSize: 14,
  color: T.text,
  display: "flex",
  alignItems: "center",
  height: "100%",
  ...extra,
});

const TH: React.CSSProperties = {
  padding: "10px 16px",
  boxSizing: "border-box" as const,
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  color: T.muted,
  display: "flex",
  alignItems: "center",
};

// ─── SceneHeadline ────────────────────────────────────────────────────────────
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
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)",
        letterSpacing: 2.2, textTransform: "uppercase",
        marginBottom: 16, opacity: chipO,
      }}>{chip}</div>
      <div style={{
        fontSize: 46, fontWeight: 800, lineHeight: 1.2,
        letterSpacing: -1.5, color: "#fff", opacity: titleO,
      }}>
        {title}{accent && <> <span style={{ color }}>{accent}</span></>}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const KPI_DATA = [
  { label: "Actifs",                value: 24, sub: "dont 18 avec MFA",      color: T.success },
  { label: "Invitations en attente", value: 3, sub: "depuis moins de 72h",   color: T.warning },
  { label: "Inactifs",               value: 5, sub: "accès révoqué",          color: T.text    },
  { label: "Sans MFA",               value: 9, sub: "MFA obligatoire activé", color: T.error   },
];

interface UserRow {
  initials: string; avatarColor: string;
  name: string; email: string;
  role: "admin" | "manager" | "agent" | "readonly";
  roleLabel: string; agency: string;
  status: "active" | "invited" | "inactive" | "blocked";
  statusLabel: string; lastLogin: string;
  mfa: boolean; mfaLabel: string;
}

const USERS: UserRow[] = [
  { initials: "S", avatarColor: "#3b6fdb", name: "Sophie Martin",  email: "sophie.martin@agenceimmo.fr", role: "admin",    roleLabel: "Admin",         agency: "Toutes agences", status: "active",   statusLabel: "Actif",   lastLogin: "12/03 à 09:14", mfa: true,  mfaLabel: "TOTP"        },
  { initials: "T", avatarColor: "#d97246", name: "Thomas Renard",  email: "t.renard@agenceimmo.fr",      role: "manager",  roleLabel: "Manager",       agency: "Paris 11e",      status: "active",   statusLabel: "Actif",   lastLogin: "11/03 à 17:42", mfa: true,  mfaLabel: "TOTP"        },
  { initials: "C", avatarColor: "#329547", name: "Camille Dubois", email: "c.dubois@agenceimmo.fr",      role: "agent",    roleLabel: "Agent",         agency: "Lyon Centre",    status: "active",   statusLabel: "Actif",   lastLogin: "10/03 à 11:05", mfa: false, mfaLabel: "Non activé"  },
  { initials: "L", avatarColor: "#7c5cbf", name: "Lucas Bernard",  email: "l.bernard@agenceimmo.fr",     role: "agent",    roleLabel: "Agent",         agency: "Paris 18e",      status: "invited",  statusLabel: "Invité",  lastLogin: "—",             mfa: false, mfaLabel: "Non activé"  },
  { initials: "N", avatarColor: "#d97246", name: "Nadia Benzara",  email: "n.benzara@agenceimmo.fr",     role: "readonly", roleLabel: "Lecture seule", agency: "Bordeaux",       status: "inactive", statusLabel: "Inactif", lastLogin: "15/01 à 14:30", mfa: false, mfaLabel: "Non activé"  },
  { initials: "P", avatarColor: "#3b6fdb", name: "Pierre Moreau",  email: "p.moreau@agenceimmo.fr",      role: "manager",  roleLabel: "Manager",       agency: "Marseille",      status: "active",   statusLabel: "Actif",   lastLogin: "09/03 à 16:22", mfa: true,  mfaLabel: "TOTP"        },
  { initials: "E", avatarColor: "#ec6369", name: "Emma Lefebvre",  email: "emma.lefebvre@agenceimmo.fr", role: "agent",    roleLabel: "Agent",         agency: "Lyon Centre",    status: "blocked",  statusLabel: "Bloqué",  lastLogin: "08/03 à 08:51", mfa: true,  mfaLabel: "TOTP"        },
];

const ACTIVITY_LOG = [
  { text: "Utilisateur désactivé — Nadia Benzara",             date: "15/01/2026 à 10:22" },
  { text: "Invitation envoyée — lucas.bernard@agenceimmo.fr",  date: "11/03/2026 à 16:48" },
  { text: "Rôle modifié — Thomas Renard (Agent → Manager)",    date: "05/02/2026 à 14:03" },
];

// Column widths — must sum to 100%
const COL_W = ["22%", "24%", "10%", "14%", "10%", "13%", "7%"];

// ─── Atomic components ────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.44, fontWeight: 600,
      color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
}

function RoleBadge({ role, label }: { role: UserRow["role"]; label: string }) {
  const styles: Record<string, React.CSSProperties> = {
    admin:    { background: "rgba(14,16,41,.08)",   color: "#0e1029", fontWeight: 600 },
    manager:  { background: "rgba(160,184,238,.20)", color: "#2b56c0" },
    agent:    { background: "rgba(50,149,71,.10)",   color: "#1e7a38" },
    readonly: { background: "rgba(107,114,128,.10)", color: "#4b5563" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 99, fontSize: 12, fontWeight: 500,
      ...styles[role],
    }}>{label}</span>
  );
}

function StatusBadge({ status, label, scale = 1 }: { status: UserRow["status"]; label: string; scale?: number }) {
  const styles: Record<string, React.CSSProperties> = {
    active:   { background: "rgba(160,184,238,.15)", color: "#3b6fdb" },
    invited:  { background: "rgba(255,183,4,.15)",   color: "#b37d00" },
    inactive: { background: "rgba(107,114,128,.12)", color: "#4b5563" },
    blocked:  { background: "rgba(236,99,105,.12)",  color: "#dc2626" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 99, fontSize: 12, fontWeight: 500,
      transform: `scale(${scale})`, transformOrigin: "left center",
      ...styles[status],
    }}>{label}</span>
  );
}

function MfaTag({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 500,
      color: on ? T.success : T.light,
    }}>
      {/* Shield-check icon */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
      </svg>
      {label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ kpi, frame, fps }: { kpi: typeof KPI_DATA[0]; frame: number; fps: number }) {
  const s  = spr(frame, TL.kpiAll, fps, { damping: 22, stiffness: 130 });
  const o  = fade(frame, TL.kpiAll, 16);
  const ty = interpolate(s, [0, 1], [14, 0]);
  const val = Math.round(interpolate(frame, [TL.kpiAll, TL.kpiAll + 35], [0, kpi.value], clamp));
  return (
    <div style={{
      flex: 1, background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "16px 20px",
      boxShadow: "0 1px 8px rgba(0,0,0,.06)",
      opacity: o, transform: `translateY(${ty}px)`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginBottom: 8 }}>{kpi.label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 12, color: T.light, marginTop: 6 }}>{kpi.sub}</div>
    </div>
  );
}

// ─── User Table Row ───────────────────────────────────────────────────────────
function UserTableRow({ user, idx, frame, fps }: {
  user: UserRow; idx: number; frame: number; fps: number;
}) {
  const isHighlighted = user.status === "blocked";
  const rowO  = fade(frame, TL.tableIn, 14);
  const popAt = TL.rows + idx * 6;
  const badgeSc = frame >= popAt
    ? spring({ frame: frame - popAt, fps, config: { damping: 14, stiffness: 220 } })
    : 0;

  // Highlight Emma's row at TL.rowHighlight
  const hp = frame >= TL.rowHighlight
    ? spring({ frame: frame - TL.rowHighlight, fps, config: { damping: 28, stiffness: 120 } })
    : 0;
  const scale    = isHighlighted ? interpolate(hp, [0, 1], [1, 1.03]) : 1;
  const blurAmt  = !isHighlighted && frame >= TL.rowHighlight
    ? interpolate(frame, [TL.rowHighlight, TL.rowHighlight + 20], [0, 2.5], clamp)
    : 0;
  const rowBg    = isHighlighted && frame >= TL.rowHighlight
    ? `rgba(236,99,105,${interpolate(hp, [0, 1], [0, 0.06])})`
    : "transparent";
  const rowShadow = isHighlighted && frame >= TL.rowHighlight
    ? `0 4px 24px rgba(236,99,105,${interpolate(hp, [0, 1], [0, 0.20])})`
    : "none";

  return (
    <div style={{
      display: "flex", alignItems: "center", height: 66,
      borderBottom: `1px solid ${T.border}`,
      opacity: rowO,
      background: rowBg,
      transform: `scale(${scale})`,
      filter: blurAmt > 0 ? `blur(${blurAmt}px)` : "none",
      transformOrigin: "center center",
      position: "relative",
      zIndex: isHighlighted ? 5 : 1,
      boxShadow: rowShadow,
    }}>
      {/* Name + avatar */}
      <div style={{ ...cell(), width: COL_W[0], gap: 10 }}>
        <Avatar initials={user.initials} color={user.avatarColor} size={32} />
        <span style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</span>
      </div>
      {/* Email */}
      <div style={{ ...cell({ color: T.muted, fontSize: 13 }), width: COL_W[1] }}>{user.email}</div>
      {/* Role */}
      <div style={{ ...cell(), width: COL_W[2] }}>
        <RoleBadge role={user.role} label={user.roleLabel} />
      </div>
      {/* Agency */}
      <div style={{ ...cell({ color: T.muted, fontSize: 13 }), width: COL_W[3] }}>{user.agency}</div>
      {/* Status */}
      <div style={{ ...cell(), width: COL_W[4] }}>
        <StatusBadge status={user.status} label={user.statusLabel} scale={badgeSc} />
      </div>
      {/* Last login */}
      <div style={{ ...cell({ color: T.muted, fontSize: 13 }), width: COL_W[5] }}>{user.lastLogin}</div>
      {/* MFA */}
      <div style={{ ...cell(), width: COL_W[6] }}>
        <MfaTag on={user.mfa} label={user.mfaLabel} />
      </div>
    </div>
  );
}

// ─── SCENE 1: Hero ────────────────────────────────────────────────────────────
function HeroScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.heroIn || frame > TL.heroOut + 20) return null;
  const o = fade(frame, TL.heroIn, 18) * fdOut(frame, TL.heroOut, 16);

  const logoS  = spr(frame, TL.heroIn, fps, { damping: 18, stiffness: 120 });
  const logoSc = interpolate(logoS, [0, 1], [0.7, 1]);
  const logoO  = fade(frame, TL.heroIn, 14);

  const chipO  = fade(frame, TL.heroText, 12);
  const line1O = fade(frame, TL.heroText + 6, 14);
  const line1Y = interpolate(frame, [TL.heroText + 6, TL.heroText + 26], [18, 0], clamp);
  const line2O = fade(frame, TL.heroText + 16, 14);
  const line2Y = interpolate(frame, [TL.heroText + 16, TL.heroText + 36], [18, 0], clamp);

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 0, opacity: o, fontFamily: T.font,
    }}>
      {/* Logo */}
      <div style={{ opacity: logoO, transform: `scale(${logoSc})`, marginBottom: 28 }}>
        <PilocLogo height={40} textColor="#ffffff" markColor={T.mist} />
      </div>
      {/* Chip */}
      <div style={{
        display: "inline-flex", padding: "5px 18px", borderRadius: 99,
        background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)",
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)",
        letterSpacing: 2.4, textTransform: "uppercase",
        opacity: chipO, marginBottom: 24,
      }}>ADMINISTRATION · UTILISATEURS</div>
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 88, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3.5,
          color: "#fff", opacity: line1O, transform: `translateY(${line1Y}px)`,
        }}>Gérez vos équipes</div>
        <div style={{
          fontSize: 88, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3.5,
          opacity: line2O, transform: `translateY(${line2Y}px)`,
        }}>
          <span style={{ color: "#fff" }}>en toute </span>
          <span style={{ color: T.mist }}>sécurité.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 2: Dashboard ───────────────────────────────────────────────────────
function DashboardScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.dashIn || frame > TL.dashOut + 20) return null;
  const o = fade(frame, TL.dashIn, 18) * fdOut(frame, TL.dashOut, 16);

  // Cross-fade headline: "Gérez vos équipes" → "Compte bloqué détecté"
  const hl2Start = TL.rowHighlight - 2;
  const hl1O = fade(frame, TL.dashIn + 4, 14) * fdOut(frame, hl2Start, 16);
  const hl2O = fade(frame, hl2Start, 16)       * fdOut(frame, TL.dashOut, 16);

  const tableO   = fade(frame, TL.tableIn, 14);
  const footerO  = fade(frame, TL.tableIn + 10, 14);

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column",
      paddingTop: 56, opacity: o, fontFamily: T.font,
      overflow: "hidden",
    }}>
      {/* Headline — cross-fade */}
      <div style={{ position: "relative", height: 106, width: "100%", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: hl1O }}>
          <SceneHeadline
            chip="PILOC · UTILISATEURS"
            title="Gérez vos équipes"
            accent="en toute sécurité."
            frame={frame} startAt={TL.dashIn + 4}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: hl2O }}>
          <SceneHeadline
            chip="PILOC · SÉCURITÉ"
            title="Compte bloqué"
            accent="détecté."
            frame={frame} startAt={hl2Start}
            color={T.error}
          />
        </div>
      </div>

      {/* Floating card */}
      <div style={{ ...cardBase, width: 1560, margin: "20px auto 0", overflow: "hidden" }}>
        {/* KPI strip */}
        <div style={{ display: "flex", gap: 14, padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
          {KPI_DATA.map((kpi, i) => (
            <KpiCard key={i} kpi={kpi} frame={frame} fps={fps} />
          ))}
        </div>

        {/* Table header */}
        <div style={{
          display: "flex", background: "#fafafa",
          borderBottom: `1px solid ${T.border}`,
          opacity: tableO,
        }}>
          {["Nom / Prénom", "Email", "Rôle", "Agence", "Statut", "Dernière connexion", "MFA"].map((h, i) => (
            <div key={i} style={{ ...TH, width: COL_W[i] }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ opacity: tableO }}>
          {USERS.map((user, idx) => (
            <UserTableRow key={idx} user={user} idx={idx} frame={frame} fps={fps} />
          ))}
        </div>

        {/* Pagination footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", background: "#fafafa",
          borderTop: `1px solid ${T.border}`, opacity: footerO,
        }}>
          <span style={{ fontSize: 12, color: T.muted }}>7 résultats sur 32 — page 1/5</span>
          <div style={{ display: "flex", gap: 5 }}>
            {["‹", "1", "2", "3", "›"].map((p, i) => (
              <div key={i} style={{
                minWidth: 30, height: 30, display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: 6,
                border: `1px solid ${i === 1 ? T.mist : T.border}`,
                background: i === 1 ? T.mist : T.surface,
                fontSize: 13, color: i === 1 ? T.text : T.muted,
                fontWeight: i === 1 ? 600 : 400,
              }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Action Card (used in PanelScene) ─────────────────────────────────────────
function ActionCard({ frame, fps, startAt, label, icon, children }: {
  frame: number; fps: number; startAt: number;
  label: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  const sc = spring({ frame: frame - startAt, fps, config: { damping: 22, stiffness: 140 } });
  const o  = fade(frame, startAt, 14);
  const y  = interpolate(frame, [startAt, startAt + 22], [14, 0], clamp);
  const scIn = interpolate(sc, [0, 1], [0.94, 1]);
  return (
    <div style={{
      background: T.surface, borderRadius: 14, padding: "22px 24px",
      boxShadow: "0 2px 16px rgba(0,0,0,.06)", border: `1px solid ${T.border}`,
      opacity: o, transform: `translateY(${y}px) scale(${scIn})`,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: "rgba(157,184,238,.12)", border: "1px solid rgba(157,184,238,.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{label}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── SCENE 3: User Actions ────────────────────────────────────────────────────
function PanelScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.panelIn || frame > TL.panelOut + 20) return null;
  const sceneO = fade(frame, TL.panelIn, 18) * fdOut(frame, TL.panelOut, 16);

  const profileO = fade(frame, TL.panelIn + 6, 14);
  const profileY = interpolate(frame, [TL.panelIn + 6, TL.panelIn + 26], [16, 0], clamp);

  const ACTION_START = [TL.panelOpen, TL.panelOpen + 18, TL.panelOpen + 36, TL.panelOpen + 54];

  // State flip frames — Agent→Manager, MFA off→on, Bloqué→Actif
  const ROLE_FLIP   = TL.securityIn;       // 530
  const MFA_FLIP    = TL.securityIn + 36;  // 630 — 36f après ROLE_FLIP
  const UNLOCK_FLIP = TL.activityIn;       // 558

  const roleBeforeO = fdOut(frame, ROLE_FLIP - 2, 14);
  const roleAfterO  = fade(frame, ROLE_FLIP, 14);
  const mfaBeforeO  = fdOut(frame, MFA_FLIP - 2, 14);
  const mfaAfterO   = fade(frame, MFA_FLIP, 14);
  const lockBeforeO = fdOut(frame, UNLOCK_FLIP - 2, 14);
  const lockAfterO  = fade(frame, UNLOCK_FLIP, 14);

  const checkIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={T.success}>
      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" />
    </svg>
  );

  return (
    <AbsoluteFill style={{ opacity: sceneO, fontFamily: T.font }}>
      <div style={{ position: "absolute", inset: 0, background: T.navy }} />

      {/* Headline */}
      <div style={{ position: "absolute", top: 58, left: 0, right: 0, textAlign: "center" }}>
        <SceneHeadline
          chip="PILOC · ACTIONS ADMIN"
          title="Tout contrôler,"
          accent="en un clic."
          frame={frame} startAt={TL.panelIn + 4}
        />
      </div>

      {/* Profile pill — Emma Lefebvre (the blocked user) */}
      <div style={{
        position: "absolute", top: 196, left: "50%",
        transform: `translateX(-50%) translateY(${profileY}px)`,
        opacity: profileO,
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 99, padding: "10px 22px 10px 10px",
        whiteSpace: "nowrap",
      }}>
        <Avatar initials="E" color="#ec6369" size={40} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Emma Lefebvre</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>emma.lefebvre@agenceimmo.fr · Lyon Centre</div>
        </div>
        <div style={{ marginLeft: 8 }}>
          <StatusBadge status="blocked" label="Bloqué" scale={1} />
        </div>
      </div>

      {/* 2×2 action grid */}
      <div style={{
        position: "absolute", top: 294, left: "50%",
        transform: "translateX(-50%)",
        display: "grid", gridTemplateColumns: "460px 460px", gap: 18,
        width: 938,
      }}>
        {/* Card 1 — Changer le rôle */}
        <ActionCard frame={frame} fps={fps} startAt={ACTION_START[0]} label="Changer le rôle"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill={T.mist}>
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 1 1-1.49-.16 5.245 5.245 0 0 0-10.43 0 .75.75 0 0 1-1.49.16 6.745 6.745 0 0 1 1.011-4.38Z" />
            </svg>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
            <span style={{ fontSize: 13, color: T.muted, flexShrink: 0 }}>Rôle actuel</span>
            <div style={{ position: "relative", height: 24, flex: 1 }}>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: roleBeforeO }}>
                <RoleBadge role="agent" label="Agent" />
              </div>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: roleAfterO }}>
                <RoleBadge role="manager" label="Manager" />
              </div>
            </div>
            <div style={{ opacity: roleAfterO, flexShrink: 0 }}>{checkIcon}</div>
          </div>
        </ActionCard>

        {/* Card 2 — Réinitialiser le MFA */}
        <ActionCard frame={frame} fps={fps} startAt={ACTION_START[1]} label="Réinitialiser le MFA"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill={T.mist}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
            </svg>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
            <span style={{ fontSize: 13, color: T.muted, flexShrink: 0 }}>MFA</span>
            <div style={{ position: "relative", height: 24, flex: 1 }}>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: mfaBeforeO }}>
                <MfaTag on={false} label="Non activé" />
              </div>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: mfaAfterO }}>
                <MfaTag on={true} label="Réinitialisé — TOTP" />
              </div>
            </div>
          </div>
        </ActionCard>

        {/* Card 3 — Déverrouiller */}
        <ActionCard frame={frame} fps={fps} startAt={ACTION_START[2]} label="Déverrouiller le compte"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill={T.mist}>
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" />
            </svg>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
            <span style={{ fontSize: 13, color: T.muted, flexShrink: 0 }}>Statut</span>
            <div style={{ position: "relative", height: 24, flex: 1 }}>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: lockBeforeO }}>
                <StatusBadge status="blocked" label="Bloqué" scale={1} />
              </div>
              <div style={{ position: "absolute", left: 0, top: 0, opacity: lockAfterO }}>
                <StatusBadge status="active" label="Actif" scale={1} />
              </div>
            </div>
            <div style={{ opacity: lockAfterO, flexShrink: 0 }}>{checkIcon}</div>
          </div>
        </ActionCard>

        {/* Card 4 — Désactiver */}
        <ActionCard frame={frame} fps={fps} startAt={ACTION_START[3]} label="Désactiver l'accès"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill={T.error}>
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" />
            </svg>
          }
        >
          <div style={{ display: "flex", alignItems: "center", minHeight: 28 }}>
            <span style={{
              padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500,
              background: "rgba(236,99,105,.10)", color: T.error,
              border: "1px solid rgba(236,99,105,.20)",
            }}>Révoque tous les accès immédiatement</span>
          </div>
        </ActionCard>
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 4: Invitation ──────────────────────────────────────────────────────
const ROLE_CARDS = [
  { role: "admin"    as const, label: "Admin",         desc: "Accès complet",           accent: "#0e1029", selBg: "rgba(14,16,41,.06)",    selBorder: "rgba(14,16,41,.30)"   },
  { role: "manager"  as const, label: "Manager",       desc: "Pilotage agence",          accent: "#2b56c0", selBg: "rgba(43,86,192,.07)",   selBorder: "rgba(43,86,192,.30)"  },
  { role: "agent"    as const, label: "Agent",         desc: "Saisie & suivi dossiers",  accent: "#1e7a38", selBg: "rgba(50,149,71,.07)",   selBorder: "rgba(50,149,71,.30)", selected: true },
  { role: "readonly" as const, label: "Lecture seule", desc: "Consultation uniquement",  accent: "#4b5563", selBg: "rgba(107,114,128,.06)", selBorder: "rgba(107,114,128,.25)" },
];

function InvitationScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.inviteIn || frame > TL.inviteOut + 20) return null;
  const o = fade(frame, TL.inviteIn, 18) * fdOut(frame, TL.inviteOut, 16);

  const cardS  = spr(frame, TL.inviteIn + 6, fps, { damping: 18, stiffness: 100 });
  const cardSc = interpolate(cardS, [0, 1], [0.88, 1]);
  const cardO  = fade(frame, TL.inviteIn + 6, 20);

  const showSuccess = frame >= TL.successIn;
  const sucS  = frame >= TL.successIn
    ? spr(frame, TL.successIn, fps, { damping: 14, stiffness: 200 })
    : 0;
  const sucSc = interpolate(sucS, [0, 1], [0.8, 1]);

  // Role cards appear at dropdownOpen, Agent selection fires at dropdownSelect
  const roleCardsO = fade(frame, TL.dropdownOpen, 14);
  const selSpr = frame >= TL.dropdownSelect
    ? spring({ frame: frame - TL.dropdownSelect, fps, config: { damping: 14, stiffness: 200 } })
    : 0;

  // Other form fields
  const nameO  = fade(frame, TL.formFields, 14);
  const nameY  = interpolate(frame, [TL.formFields, TL.formFields + 20], [10, 0], clamp);
  const emailO = fade(frame, TL.formFields + 14, 14);
  const emailY = interpolate(frame, [TL.formFields + 14, TL.formFields + 34], [10, 0], clamp);
  // Agency + footer appear AFTER role selected — clean sequential reveal
  const agencyO = fade(frame, TL.dropdownSelect + 18, 14);
  const agencyY = interpolate(frame, [TL.dropdownSelect + 18, TL.dropdownSelect + 38], [10, 0], clamp);
  const footerO = fade(frame, TL.dropdownSelect + 36, 14);

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 52,
      opacity: o, fontFamily: T.font,
    }}>
      <SceneHeadline
        chip="PILOC · INVITATION"
        title="Inviter un utilisateur"
        accent="en quelques clics."
        frame={frame} startAt={TL.inviteIn + 4}
      />

      <div style={{
        ...cardBase,
        width: 660, marginTop: 24,
        opacity: cardO, transform: `scale(${cardSc})`,
        padding: "32px 36px",
      }}>
        {!showSuccess ? (
          <>
            {/* Name row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16,
              opacity: nameO, transform: `translateY(${nameY}px)`,
            }}>
              {["Prénom", "Nom"].map((label, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
                  <div style={{
                    height: 40, padding: "0 12px",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 14, color: T.text, fontWeight: 500,
                    display: "flex", alignItems: "center", background: T.bg,
                  }}>{i === 0 ? "Lucas" : "Bernard"}</div>
                </div>
              ))}
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16, opacity: emailO, transform: `translateY(${emailY}px)` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, letterSpacing: 0.3 }}>
                Email <span style={{ color: T.error }}>*</span>
              </div>
              <div style={{
                height: 40, padding: "0 12px",
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 14, color: T.text,
                display: "flex", alignItems: "center", background: T.surface,
              }}>lucas.bernard@agenceimmo.fr</div>
              <div style={{ fontSize: 11, color: T.light, marginTop: 4 }}>Lien d'invitation valable 72h</div>
            </div>

            {/* Role selector */}
            <div style={{ marginBottom: 16, opacity: roleCardsO }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 10, letterSpacing: 0.3 }}>
                Rôle <span style={{ color: T.error }}>*</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ROLE_CARDS.map((rc, ri) => {
                  const cardAppearO = fade(frame, TL.dropdownOpen + ri * 10, 14);
                  const cardAppearY = interpolate(frame, [TL.dropdownOpen + ri * 10, TL.dropdownOpen + ri * 10 + 18], [8, 0], clamp);
                  const isSelected = rc.selected;

                  // Selection spring only fires on the Agent card
                  const selProgress = isSelected ? selSpr : 0;
                  const selBorderAlpha = interpolate(selProgress, [0, 1], [0, 1]);
                  const selBgAlpha    = interpolate(selProgress, [0, 1], [0, 1]);
                  const checkO        = isSelected ? fade(frame, TL.dropdownSelect, 12) : 0;
                  const cardScale     = isSelected
                    ? interpolate(selProgress, [0, 0.5, 1], [1, 1.03, 1])
                    : 1;

                  const borderStyle = isSelected
                    ? `1px solid rgba(${selBorderAlpha > 0 ? rc.selBorder.replace(/rgba\(/, "").replace(/\)/, "").split(",").slice(0, 3).join(",") : "217,223,227"},${selBorderAlpha > 0 ? 0.3 + selBorderAlpha * 0.5 : 1})`
                    : `1px solid ${T.border}`;

                  return (
                    <div key={ri} style={{
                      padding: "12px 14px",
                      border: isSelected
                        ? `1.5px solid ${rc.selBorder}`
                        : `1px solid ${T.border}`,
                      borderRadius: 10,
                      background: isSelected
                        ? `rgba(${rc.selBg.replace("rgba(", "").replace(")", "").split(",").slice(0, 3).join(",")},${parseFloat(rc.selBg.replace("rgba(", "").replace(")", "").split(",")[3]) * selProgress})`
                        : T.surface,
                      opacity: cardAppearO,
                      transform: `translateY(${cardAppearY}px) scale(${cardScale})`,
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                      cursor: "pointer",
                      boxShadow: isSelected && selProgress > 0.5
                        ? `0 0 0 3px ${rc.selBg}`
                        : "none",
                      transition: "none",
                    }}>
                      <div>
                        <RoleBadge role={rc.role} label={rc.label} />
                        <div style={{ fontSize: 11, color: T.light, marginTop: 5 }}>{rc.desc}</div>
                      </div>
                      {/* Checkmark — springs in on selection */}
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        background: isSelected ? rc.accent : T.border,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: isSelected ? checkO : 0,
                        transform: `scale(${isSelected ? interpolate(selSpr, [0, 1], [0.5, 1]) : 1})`,
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agency */}
            <div style={{ marginBottom: 16, opacity: agencyO, transform: `translateY(${agencyY}px)` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, letterSpacing: 0.3 }}>Agence / Périmètre</div>
              <div style={{
                height: 40, padding: "0 12px",
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 14, color: T.text,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: T.surface,
              }}>
                Agence Paris 18e
                <svg width="14" height="14" viewBox="0 0 24 24" fill={T.light}>
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" />
                </svg>
              </div>
              <div style={{ fontSize: 11, color: T.light, marginTop: 4 }}>Définit le périmètre de visibilité des données</div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingTop: 18, borderTop: `1px solid ${T.border}`,
              opacity: footerO,
            }}>
              <div style={{
                height: 38, padding: "0 16px", border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 13, color: T.muted,
                display: "flex", alignItems: "center",
              }}>Annuler</div>
              <div style={{
                height: 38, padding: "0 22px", borderRadius: 8,
                background: T.navy, color: "#fff", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 14px rgba(14,16,41,.30)",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
                Envoyer l'invitation
              </div>
            </div>
          </>
        ) : (
          /* Success state */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 0", gap: 16,
            transform: `scale(${sucSc})`,
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: "50%",
              background: "rgba(50,149,71,.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill={T.success}>
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" />
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Invitation envoyée !</div>
            <div style={{ fontSize: 14, color: T.muted, textAlign: "center", lineHeight: 1.6 }}>
              Un email a été envoyé à<br />
              <strong style={{ color: T.text }}>lucas.bernard@agenceimmo.fr</strong>
            </div>
            <div style={{
              padding: "6px 16px", borderRadius: 99,
              background: "rgba(50,149,71,.10)", color: T.success,
              fontSize: 12, fontWeight: 600,
            }}>Agent · Agence Paris 18e · Lien valable 72h</div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ─── SCENE 5: CTA ─────────────────────────────────────────────────────────────
function CTAScene({ frame, fps }: { frame: number; fps: number }) {
  if (frame < TL.ctaIn) return null;
  const o = fade(frame, TL.ctaIn, 22);

  const logoS  = spr(frame, TL.ctaIn, fps, { damping: 18, stiffness: 120 });
  const logoSc = interpolate(logoS, [0, 1], [0.7, 1]);
  const logoO  = fade(frame, TL.ctaIn, 14);

  const chipO  = fade(frame, TL.ctaIn + 12, 12);
  const line1O = fade(frame, TL.ctaIn + 20, 14);
  const line1Y = interpolate(frame, [TL.ctaIn + 20, TL.ctaIn + 40], [18, 0], clamp);
  const line2O = fade(frame, TL.ctaIn + 30, 14);
  const line2Y = interpolate(frame, [TL.ctaIn + 30, TL.ctaIn + 50], [18, 0], clamp);

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 0, opacity: o, fontFamily: T.font,
    }}>
      {/* Logo */}
      <div style={{ opacity: logoO, transform: `scale(${logoSc})`, marginBottom: 28 }}>
        <PilocLogo height={40} textColor="#ffffff" markColor={T.mist} />
      </div>
      {/* Chip */}
      <div style={{
        display: "inline-flex", padding: "5px 18px", borderRadius: 99,
        background: "rgba(157,184,238,0.14)", border: "1px solid rgba(157,184,238,0.30)",
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)",
        letterSpacing: 2.4, textTransform: "uppercase",
        opacity: chipO, marginBottom: 24,
      }}>PILOC · GESTION DES UTILISATEURS</div>
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 88, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3.5,
          color: "#fff", opacity: line1O, transform: `translateY(${line1Y}px)`,
        }}>Pilotez vos accès.</div>
        <div style={{
          fontSize: 88, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3.5,
          opacity: line2O, transform: `translateY(${line2Y}px)`,
        }}>
          <span style={{ color: "#fff" }}>En toute </span>
          <span style={{ color: T.mist }}>sécurité.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Cursor ───────────────────────────────────────────────────────────────────
// Target: "Envoyer l'invitation" button in InvitationScene
// Card centered at x=960, width=640 → right inner edge ≈ 1240
// Button right-aligned, width ≈ 220px → center x ≈ 1240 - 110 = 1130
// Button y: paddingTop(66) + headline(102) + gap(28) + cardPaddingTop(36)
//           + nameRow(78) + email(92) + role(74) + agence(92) + footerOffset(30) ≈ 598
const CLICK_X = 1148;
const CLICK_Y = 604;

interface WP { f: number; x: number; y: number }
const CURSOR_WPS: WP[] = [
  { f: TL.cursorIn, x: 1420, y: 480 },
  { f: TL.cursorAt, x: CLICK_X, y: CLICK_Y },
  { f: TL.inviteOut - 40, x: CLICK_X, y: CLICK_Y },
];

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
  if (frame < TL.cursorIn || frame > TL.inviteOut - 30) return null;
  const pos     = getCursorPos(CURSOR_WPS, frame, fps);
  const o       = fade(frame, TL.cursorIn, 10) * fdOut(frame, TL.inviteOut - 40, 14);
  const clickDt = frame - TL.clickFrame;
  const isClick = clickDt >= 0 && clickDt <= 22;

  const dotSc = isClick ? 1 - 0.4 * Math.sin((clickDt / 22) * Math.PI) : 1;
  const ringR = isClick ? interpolate(clickDt, [0, 22], [14, 38], clamp) : 14;
  const ringO = isClick ? interpolate(clickDt, [0, 4, 22], [0, 1, 0], clamp) : 0;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, pointerEvents: "none", zIndex: 300 }}>
      {/* Ripple ring */}
      <div style={{
        position: "absolute",
        left: pos.x - ringR, top: pos.y - ringR,
        width: ringR * 2, height: ringR * 2, borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.85)",
        opacity: ringO,
      }} />
      {/* Dot */}
      <div style={{
        position: "absolute",
        left: pos.x - 10, top: pos.y - 10,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.22), 0 0 24px rgba(255,255,255,0.55)",
        transform: `scale(${dotSc})`,
        transformOrigin: "center center",
      }} />
    </div>
  );
}

// ─── Text Overlay ─────────────────────────────────────────────────────────────
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
      position: "absolute", bottom: 80, left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(14,16,41,0.68)", backdropFilter: "blur(2px)",
      borderRadius: 8, padding: "8px 22px",
      fontSize: 18, fontWeight: 600, color: "#ffffff",
      whiteSpace: "nowrap", fontFamily: T.font,
      opacity: o, zIndex: 200,
    }}>{text}</div>
  );
}

// ─── Main Composition ─────────────────────────────────────────────────────────
export const UtilisateursDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [handle] = React.useState(() => delayRender("Loading Inter font"));
  React.useEffect(() => {
    waitForInter().then(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: T.navy, fontFamily: T.font, overflow: "hidden" }}>
      <HeroScene       frame={frame} fps={fps} />
      <DashboardScene  frame={frame} fps={fps} />
      <PanelScene      frame={frame} fps={fps} />
      <InvitationScene frame={frame} fps={fps} />
      <CTAScene        frame={frame} fps={fps} />

      {/* Text overlays — screen space */}
      <TextOverlay frame={frame} showAt={TL.overlayText1}   hideAt={TL.overlayText1Out} text="Compte bloqué — 3 tentatives échouées" />
      <TextOverlay frame={frame} showAt={TL.overlayText2}   hideAt={TL.overlayText2Out} text="Déverrouillage en 1 clic depuis le profil" />
      <TextOverlay frame={frame} showAt={TL.panelIn + 20}   hideAt={TL.securityIn - 5}  text="Actions disponibles sur chaque utilisateur" />
      <TextOverlay frame={frame} showAt={TL.securityIn}     hideAt={TL.panelOut - 20}   text="Rôle changé · MFA réinitialisé · Compte débloqué" />
      <TextOverlay frame={frame} showAt={TL.inviteIn + 20}  hideAt={TL.dropdownOpen - 5} text="Invitation par email · Lien valable 72h" />
      <TextOverlay frame={frame} showAt={TL.dropdownOpen}   hideAt={TL.dropdownSelect}   text="Rôle assignable dès l'invitation — Admin, Manager, Agent, Lecture seule" />
      <TextOverlay frame={frame} showAt={TL.successIn + 8}  hideAt={TL.inviteOut - 20}   text="Invitation envoyée ✓ — Lucas Bernard (Agent)" />

      {/* Cursor — screen space, always last */}
      <Cursor frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
