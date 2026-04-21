import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/flowboard")({
  head: () => ({
    meta: [
      { title: "Flowboard — Internal Design Tool" },
      { name: "description", content: "Wireframe screens, map flows, export as AI prompt." },
      { property: "og:title", content: "Flowboard — Internal Design Tool" },
      { property: "og:description", content: "Wireframe screens, map flows, export as AI prompt." },
    ],
  }),
  component: FlowboardPage,
});

/* =========================================================
   CONSTANTS
========================================================= */
const C = {
  bg: "#0A0F1A",
  panel: "#0D1117",
  surface: "#111827",
  card: "#1F2937",
  borderSubtle: "#1F2937",
  border: "#374151",
  textPri: "#F9FAFB",
  textSec: "#9CA3AF",
  textMuted: "#4B5563",
  blue: "#3E63DD",
  blueHover: "#5472E4",
  blueDim: "#1E3A5F",
  blueBorder: "#2D3F6E",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  purple: "#8B5CF6",
} as const;

type BlockType =
  | "nav" | "sidebar" | "hero" | "heading" | "subheading" | "body" | "label"
  | "btn" | "input" | "dropdown" | "checkbox" | "toggle"
  | "image" | "video" | "icon"
  | "card" | "table" | "chart" | "stat"
  | "divider" | "spacer" | "footer" | "custom";

type Status = "draft" | "review" | "done";

interface Block { id: string; type: BlockType; label: string; h: number; notes: string }
interface RefLink { id: string; url: string; label: string }
interface Snippet { id: string; title: string; code: string; language: string }
interface Shot { id: string; label: string; dataUrl: string }
interface Override { key: string; value: string }
interface Screen {
  id: string; name: string; x: number; y: number; w: number; h: number; status: Status;
  blocks: Block[]; aiNote: string; animationNote: string; devNotes: string;
  vibeKeywords: string[]; referenceLinks: RefLink[]; codeSnippets: Snippet[]; screenshots: Shot[];
  overrides: { enabled: boolean; fields: Override[] }; inspiration: string;
  createdAt: string; updatedAt: string;
}
interface Conn { id: string; fromId: string; toId: string; label: string; triggerType: "click" | "scroll" | "submit" | "auto" | "other" }
interface Project {
  id: string; name: string; description: string;
  designSystem: {
    colors: { name: string; hex: string; role: string }[];
    fonts: { role: string; value: string; size?: string; weight?: string }[];
    spacing: string; vibe: string[]; notes: string; target?: string;
  };
  createdAt: string; updatedAt: string;
}
interface State { project: Project; screens: Screen[]; connections: Conn[] }

const BLOCK_GROUPS: { name: string; items: { type: BlockType; name: string }[] }[] = [
  { name: "Navigation", items: [{ type: "nav", name: "Nav Bar" }, { type: "sidebar", name: "Sidebar" }] },
  { name: "Content", items: [{ type: "hero", name: "Hero" }, { type: "heading", name: "Heading" }, { type: "subheading", name: "Subheading" }, { type: "body", name: "Body" }, { type: "label", name: "Label" }] },
  { name: "Interactive", items: [{ type: "btn", name: "Button" }, { type: "input", name: "Input" }, { type: "dropdown", name: "Dropdown" }, { type: "checkbox", name: "Checkbox" }, { type: "toggle", name: "Toggle" }] },
  { name: "Media", items: [{ type: "image", name: "Image" }, { type: "video", name: "Video" }, { type: "icon", name: "Icon" }] },
  { name: "Data", items: [{ type: "card", name: "Card" }, { type: "table", name: "Table" }, { type: "chart", name: "Chart" }, { type: "stat", name: "Stat" }] },
  { name: "Layout", items: [{ type: "divider", name: "Divider" }, { type: "spacer", name: "Spacer" }, { type: "footer", name: "Footer" }, { type: "custom", name: "Custom" }] },
];
const BLOCK_DEFS: Record<string, { name: string; group: string }> = {};
BLOCK_GROUPS.forEach((g) => g.items.forEach((b) => (BLOCK_DEFS[b.type] = { name: b.name, group: g.name })));

interface BlockRender {
  h: number; bg: string; border: string; text: string; color: string;
  pattern?: "diag" | "grid"; elevated?: boolean; dashed?: boolean; isDivider?: boolean;
}
const BLOCK_RENDER: Record<string, BlockRender> = {
  nav:        { h: 40,  bg: "#F3F4F6", border: "#D1D5DB", text: "≡ Navigation",   color: "#374151" },
  sidebar:    { h: 100, bg: "#E5E7EB", border: "#D1D5DB", text: "▎ Sidebar",      color: "#374151" },
  hero:       { h: 80,  bg: "#DBEAFE", border: "#93C5FD", text: "◈ Hero Section", color: "#1E40AF" },
  heading:    { h: 28,  bg: "#F9FAFB", border: "#E5E7EB", text: "— H1 Title —",   color: "#111827" },
  subheading: { h: 24,  bg: "#F9FAFB", border: "#E5E7EB", text: "— H2 —",         color: "#374151" },
  body:       { h: 52,  bg: "#F9FAFB", border: "#E5E7EB", text: "¶ Body text...", color: "#6B7280" },
  label:      { h: 20,  bg: "#F9FAFB", border: "#E5E7EB", text: "label",          color: "#6B7280" },
  btn:        { h: 32,  bg: "#DBEAFE", border: "#93C5FD", text: "[ Button ]",     color: "#1E40AF" },
  input:      { h: 32,  bg: "#FFFFFF", border: "#9CA3AF", text: "[ Input ]",      color: "#9CA3AF" },
  dropdown:   { h: 32,  bg: "#FFFFFF", border: "#9CA3AF", text: "[ Dropdown ▾ ]", color: "#9CA3AF" },
  checkbox:   { h: 24,  bg: "#F9FAFB", border: "#D1D5DB", text: "☐ Checkbox",     color: "#374151" },
  toggle:     { h: 24,  bg: "#F9FAFB", border: "#D1D5DB", text: "⊙ Toggle",       color: "#374151" },
  image:      { h: 80,  bg: "#E5E7EB", border: "#9CA3AF", text: "⊠ Image",        color: "#374151", pattern: "diag" },
  video:      { h: 90,  bg: "#E5E7EB", border: "#9CA3AF", text: "▶ Video",        color: "#374151", pattern: "diag" },
  icon:       { h: 32,  bg: "#F9FAFB", border: "#E5E7EB", text: "◉ Icon",         color: "#374151" },
  card:       { h: 68,  bg: "#FFFFFF", border: "#D1D5DB", text: "▣ Card",         color: "#374151", elevated: true },
  table:      { h: 72,  bg: "#F9FAFB", border: "#D1D5DB", text: "⊞ Table",        color: "#374151", pattern: "grid" },
  chart:      { h: 88,  bg: "#D1FAE5", border: "#6EE7B7", text: "⚡ Chart",        color: "#065F46" },
  stat:       { h: 48,  bg: "#F9FAFB", border: "#E5E7EB", text: "# Stat",         color: "#111827" },
  divider:    { h: 16,  bg: "transparent", border: "transparent", text: "",       color: "#9CA3AF", isDivider: true },
  spacer:     { h: 24,  bg: "transparent", border: "#E5E7EB", text: "↕ Spacer",   color: "#9CA3AF", dashed: true },
  footer:     { h: 44,  bg: "#F3F4F6", border: "#D1D5DB", text: "— Footer —",     color: "#374151" },
  custom:     { h: 40,  bg: "#FFFFFF", border: "#D1D5DB", text: "Custom",         color: "#374151" },
};

const STATUS_META: Record<Status, { color: string; letter: string; label: string }> = {
  draft:  { color: "#9CA3AF", letter: "D", label: "Draft" },
  review: { color: "#F59E0B", letter: "R", label: "Review" },
  done:   { color: "#10B981", letter: "✓", label: "Done" },
};

const VIBE_PRESETS = ["dark","minimal","editorial","dense","playful","urgent","calm","premium","technical","raw","bold","quiet","fast","heavy","light","warm","cold","classified"];

const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const snap = (v: number, s = 20) => Math.round(v / s) * s;
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

const fmtTime = (iso?: string | number) => {
  if (!iso) return "never";
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 5) return "just now";
  if (s < 60) return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return d.toLocaleDateString();
};

/* =========================================================
   DEFAULT PROJECT
========================================================= */
function defaultProject(): State {
  const s1id = "s_" + uid(), s2id = "s_" + uid(), s3id = "s_" + uid();
  const blockH = (b: { type: BlockType }) => BLOCK_RENDER[b.type]?.h ?? 32;
  const mkBlocks = (arr: { type: BlockType; label?: string }[]): Block[] =>
    arr.map((b) => ({ id: "b_" + uid(), type: b.type, label: b.label || "", h: blockH(b), notes: "" }));
  const sumH = (blocks: Block[]) => 28 + 12 + blocks.reduce((a, b) => a + b.h + 6, 0) + 12;
  const s1B = mkBlocks([{ type: "nav", label: "" }, { type: "hero", label: "Qatar LNG → Zomato chain animation" }, { type: "body", label: "3 feature bullets" }, { type: "btn", label: "Start for free" }]);
  const s2B = mkBlocks([{ type: "nav", label: "Top prompt bar" }, { type: "chart", label: "Chain canvas (AntV X6)" }, { type: "sidebar", label: "Right AI chat panel" }]);
  const s3B = mkBlocks([{ type: "heading", label: "Create your account" }, { type: "btn", label: "Continue with Google" }, { type: "divider", label: "or" }, { type: "input", label: "Email" }, { type: "btn", label: "Continue" }]);
  const mkScreen = (id: string, name: string, x: number, y: number, blocks: Block[], aiNote: string, animationNote: string, devNotes: string, vibe: string[]): Screen => ({
    id, name, x, y, w: 300, h: Math.max(200, sumH(blocks)), status: "draft", blocks,
    aiNote, animationNote, devNotes, vibeKeywords: vibe,
    referenceLinks: [], codeSnippets: [], screenshots: [],
    overrides: { enabled: false, fields: [] }, inspiration: "",
    createdAt: nowIso(), updatedAt: nowIso(),
  });
  return {
    project: {
      id: "p_" + uid(),
      name: "Clirun MVP",
      description: "Market intelligence platform for Indian retail investors. Connects global events to stock portfolios automatically through supply chain graph analysis.",
      designSystem: {
        colors: [
          { name: "App BG", hex: "#0A0F1A", role: "background" },
          { name: "Surface", hex: "#111827", role: "background" },
          { name: "Accent", hex: "#3E63DD", role: "accent" },
          { name: "Text", hex: "#F9FAFB", role: "text" },
          { name: "Border", hex: "#374151", role: "border" },
        ],
        fonts: [
          { role: "heading", value: "Inter, sans-serif", size: "32", weight: "700" },
          { role: "body", value: "Inter, sans-serif", size: "14", weight: "400" },
          { role: "mono", value: "JetBrains Mono, monospace", size: "13", weight: "400" },
        ],
        spacing: "8px grid",
        vibe: ["dark", "intelligence-tool", "minimal"],
        notes: "Dark Bloomberg-meets-Linear feel. Dense data, generous use of monospace for numerical values. No purple. Animations should feel mechanical, not bouncy.",
        target: "React + Vite",
      },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    screens: [
      mkScreen(s1id, "Landing Page", 60, 60, s1B, "Convert WhatsApp share click into signup. Hero should show the chain animation running live. Dark background. Feel like a Bloomberg terminal meets Linear.", "Hero chain animates L→R, 150ms stagger between nodes. CTA pulses subtly every 3s.", "", ["dark","intelligence-tool","minimal","trustworthy"]),
      mkScreen(s2id, "Canvas (Tool)", 440, 60, s2B, "The main tool screen. Dark canvas, chain nodes animated domino-style. Left sidebar collapsed (48px), right panel 300px for AI chat.", "Chain nodes domino-cascade. AI chat slides in from right.", "AntV X6 for the canvas. Persist node positions to backend.", ["dark","dense","technical","focused"]),
      mkScreen(s3id, "Sign Up", 820, 60, s3B, "Minimal auth screen. Use Clerk prebuilt if possible. After signup → drop user directly into Canvas with Qatar→Zomato chain pre-loaded.", "", "Use Clerk.", ["minimal","fast","clean"]),
    ],
    connections: [
      { id: "c_" + uid(), fromId: s1id, toId: s3id, label: "Click CTA", triggerType: "click" },
      { id: "c_" + uid(), fromId: s3id, toId: s2id, label: "After auth", triggerType: "auto" },
    ],
  };
}

/* =========================================================
   STORAGE
========================================================= */
const STORAGE_KEY = "flowboard_project";
function loadFromStorage(): State | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj.project || !obj.screens) return null;
    obj.screens.forEach((s: Screen) => {
      s.blocks ||= []; s.referenceLinks ||= []; s.codeSnippets ||= []; s.screenshots ||= [];
      s.vibeKeywords ||= []; s.overrides ||= { enabled: false, fields: [] };
      s.aiNote ||= ""; s.animationNote ||= ""; s.devNotes ||= ""; s.inspiration ||= "";
    });
    obj.connections ||= [];
    return obj as State;
  } catch { return null; }
}
function saveToStorage(state: State) {
  try {
    state.project.updatedAt = nowIso();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

/* =========================================================
   AI EXPORT
========================================================= */
function buildAIPrompt(state: State) {
  const { project, screens, connections } = state;
  const totalBlocks = screens.reduce((a, s) => a + s.blocks.length, 0);
  const ds = project.designSystem;
  const lines: string[] = [];
  lines.push(`# AI DESIGN BRIEF — ${project.name}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Screens: ${screens.length} · Flows: ${connections.length} · Blocks: ${totalBlocks}`);
  lines.push(`\n---\n`);
  lines.push(`## PROJECT CONTEXT\n`);
  lines.push(project.description || "(no description)");
  lines.push(`\n### Design System`);
  lines.push(`**Colors:**`);
  ds.colors.forEach((c) => lines.push(`- ${c.name}: ${c.hex} (${c.role || "other"})`));
  lines.push(`\n**Typography:**`);
  ds.fonts.forEach((f) => lines.push(`- ${f.role.charAt(0).toUpperCase() + f.role.slice(1)}: ${f.value}${f.size ? ` · ${f.size}px` : ""}${f.weight ? ` · ${f.weight}` : ""}`));
  lines.push(`\n**Spacing:** ${ds.spacing || "—"}`);
  lines.push(`\n**Global Vibe:** ${(ds.vibe || []).join(" · ") || "—"}`);
  lines.push(`\n**Additional context:**`);
  lines.push(ds.notes || "(none)");
  lines.push(`\n---\n`);
  lines.push(`## USER FLOWS\n`);
  if (connections.length === 0) lines.push(`(no flows defined)`);
  connections.forEach((c) => {
    const f = screens.find((s) => s.id === c.fromId), t = screens.find((s) => s.id === c.toId);
    if (!f || !t) return;
    lines.push(`**${f.name}** → **${t.name}**  `);
    lines.push(`Trigger: ${c.triggerType || "—"} — ${c.label || "(no label)"}\n`);
  });
  lines.push(`\n---\n`);
  lines.push(`## SCREENS\n`);
  screens.forEach((s, i) => {
    lines.push(`### Screen ${i + 1}: ${s.name}`);
    lines.push(`**Status:** ${s.status}`);
    lines.push(`**Size:** ${s.w}×${s.h}px`);
    lines.push(`**Vibe:** ${(s.vibeKeywords || []).join(" · ") || "—"}\n`);
    lines.push(`**Purpose (AI Context):**`);
    lines.push(s.aiNote || "(no AI context)");
    lines.push(`\n**Layout (top to bottom):**`);
    if (s.blocks.length === 0) lines.push(`- (no blocks)`);
    s.blocks.forEach((b) => {
      const def = BLOCK_DEFS[b.type];
      const name = def ? def.name : b.type;
      const label = b.label ? ` — ${b.label}` : "";
      lines.push(`- ${name}${label} (${b.h}px)`);
      if (b.notes) lines.push(`  Note: ${b.notes}`);
    });
    if (s.animationNote) { lines.push(`\n**Animations & Interactions:**`); lines.push(s.animationNote); }
    if (s.devNotes) { lines.push(`\n**Developer Notes:**`); lines.push(s.devNotes); }
    if (s.referenceLinks.length) {
      lines.push(`\n**Reference Links:**`);
      s.referenceLinks.forEach((l) => lines.push(`- ${l.label || "link"}: ${l.url}`));
    }
    if (s.codeSnippets.length) {
      lines.push(`\n**Code References:**`);
      s.codeSnippets.forEach((sn) => {
        lines.push("```" + (sn.language || ""));
        if (sn.title) lines.push(`// ${sn.title}`);
        lines.push(sn.code || "");
        lines.push("```");
      });
    }
    if (s.overrides?.enabled && s.overrides.fields.length) {
      lines.push(`\n**Design Overrides:**`);
      s.overrides.fields.forEach((f) => lines.push(`- ${f.key}: ${f.value}`));
    }
    if (s.inspiration) { lines.push(`\n**Inspiration:**`); lines.push(s.inspiration); }
    lines.push(`\n---\n`);
  });
  lines.push(`## HOW TO USE THIS BRIEF\n`);
  lines.push(`1. Read the PROJECT CONTEXT section first`);
  lines.push(`2. Note the DESIGN SYSTEM — apply these tokens globally`);
  lines.push(`3. For each screen in SCREENS: build exactly the layout described, in the order listed`);
  lines.push(`4. Respect the VIBE KEYWORDS — they describe the feel, not just the structure`);
  lines.push(`5. Implement the FLOWS between screens as navigation/routing`);
  lines.push(`\n**Build this as:** ${ds.target || "React"}`);
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   STYLES (injected once)
========================================================= */
const FB_STYLES = `
.fb-root *{box-sizing:border-box}
.fb-root{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif;background:${C.bg};color:${C.textPri};height:100vh;width:100%;overflow:hidden;display:flex;flex-direction:column}
.fb-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fb-scroll{overflow-y:auto}
.fb-scroll::-webkit-scrollbar{width:8px;height:8px}
.fb-scroll::-webkit-scrollbar-thumb{background:${C.borderSubtle};border-radius:4px}
.fb-scroll::-webkit-scrollbar-track{background:transparent}
.fb-input{background:${C.surface};border:1px solid ${C.borderSubtle};color:${C.textPri};padding:6px 8px;border-radius:6px;font-size:12px;width:100%;outline:none;font-family:inherit}
.fb-input:focus{border-color:${C.blue}}
.fb-input-num{background:${C.surface};border:1px solid ${C.borderSubtle};color:${C.textPri};padding:4px 6px;border-radius:4px;font-size:11px;font-family:ui-monospace,Menlo,monospace;width:100%;outline:none}
.fb-input-num:focus{border-color:${C.blue}}
.fb-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:background .12s,border-color .12s,color .12s;user-select:none;white-space:nowrap;font-family:inherit}
.fb-btn-primary{background:${C.blue};color:#fff}
.fb-btn-primary:hover{background:${C.blueHover}}
.fb-btn-ghost{background:transparent;color:${C.textSec};border-color:${C.borderSubtle}}
.fb-btn-ghost:hover{background:${C.surface};color:${C.textPri}}
.fb-btn-danger{background:transparent;color:${C.red};border-color:${C.borderSubtle}}
.fb-btn-danger:hover{background:rgba(239,68,68,.08)}
.fb-btn-sm{padding:3px 8px;font-size:11px}
.fb-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10px;background:${C.surface};border:1px solid ${C.borderSubtle};color:${C.textSec};cursor:pointer;font-family:inherit}
.fb-pill:hover{border-color:${C.blue};color:${C.textPri}}
.fb-label{font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.textSec}}
.fb-divider{height:1px;background:${C.borderSubtle};margin:10px 0}
.fb-toast{background:${C.surface};border:1px solid ${C.borderSubtle};border-left-width:3px;color:${C.textPri};padding:10px 14px;border-radius:6px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.fb-tab{flex:1;padding:10px 0;text-align:center;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.textSec};cursor:pointer;border-bottom:2px solid transparent}
.fb-tab.active{color:${C.textPri};border-bottom-color:${C.blue}}
.fb-seg{display:flex;background:${C.surface};border:1px solid ${C.borderSubtle};border-radius:6px;padding:2px;gap:2px}
.fb-seg button{flex:1;padding:5px 8px;font-size:11px;color:${C.textSec};border-radius:4px;cursor:pointer;background:transparent;border:none;display:flex;align-items:center;justify-content:center;gap:4px;font-family:inherit}
.fb-seg button.active{background:${C.blue};color:#fff}
.fb-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(255,255,255,.1);display:inline-block;flex-shrink:0}
.fb-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:10px;background:${C.blueDim};border:1px solid ${C.blueBorder};color:#93C5FD}
.fb-tag .x{cursor:pointer;opacity:.7}
.fb-tag .x:hover{opacity:1}
.fb-kbd{display:inline-block;padding:1px 5px;font-size:10px;font-family:ui-monospace,monospace;background:${C.surface};border:1px solid ${C.border};border-radius:3px;color:${C.textSec}}
.fb-grid-bg{background-color:${C.bg};background-image:radial-gradient(#1C2638 .9px, transparent .9px);background-size:20px 20px}
.fb-menu-item{width:100%;text-align:left;padding:6px 12px;font-size:12px;color:${C.textPri};background:transparent;border:none;cursor:pointer;font-family:inherit}
.fb-menu-item:hover{background:${C.card}}
@keyframes fb-screenIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes fb-connectPulse{0%,100%{border-color:${C.green}}50%{border-color:rgba(16,185,129,.4)}}
@keyframes fb-toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fb-blockIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes fb-modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes fb-drawLine{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
.fb-anim-screen{animation:fb-screenIn .15s ease-out}
.fb-anim-connect{animation:fb-connectPulse 1s infinite}
.fb-anim-toast{animation:fb-toastIn .2s ease-out}
.fb-anim-block{animation:fb-blockIn .15s ease-out}
.fb-anim-modal{animation:fb-modalIn .2s ease-out}
.fb-anim-draw{stroke-dasharray:1000;animation:fb-drawLine .3s ease-out forwards}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "fb-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id; el.textContent = FB_STYLES;
    document.head.appendChild(el);
  }, []);
}

/* =========================================================
   PAGE
========================================================= */
function FlowboardPage() {
  useInjectStyles();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div style={{ height: "100vh", background: C.bg, color: C.textSec, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
        Loading Flowboard…
      </div>
    );
  }
  return <App />;
}

function App() {
  const [state, setState] = useState<State>(() => loadFromStorage() || defaultProject());
  const [tool, setTool] = useState<"select" | "frame" | "connect">("select");
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connSrc, setConnSrc] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<"layout" | "notes" | "assets" | "vibe">("layout");
  const [toasts, setToasts] = useState<{ id: string; msg: string; kind: "info" | "success" | "error" }[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ state: "saved" | "saving" | "unsaved"; time: string | number }>({ state: "saved", time: state.project.updatedAt });
  const [showSettings, setShowSettings] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<Shot | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(state.project.name);
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1400);
  const [spaceDown, setSpaceDown] = useState(false);

  const historyRef = useRef<{ screens: Screen[]; connections: Conn[] }[]>([]);
  const futureRef = useRef<{ screens: Screen[]; connections: Conn[] }[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const dirtyRef = useRef(false);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox?: number; oy?: number; ow?: number; oh?: number; mode: "move" | "resize" } | null>(null);
  const panStateRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { setTempProjectName(state.project.name); }, [state.project.name]);
  useEffect(() => { const onR = () => setWinW(window.innerWidth); window.addEventListener("resize", onR); return () => window.removeEventListener("resize", onR); }, []);

  const pushToast = useCallback((msg: string, kind: "info" | "success" | "error" = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  const pushHistory = useCallback((prev: State) => {
    historyRef.current.push(clone({ screens: prev.screens, connections: prev.connections }));
    if (historyRef.current.length > 20) historyRef.current.shift();
    futureRef.current = [];
  }, []);

  const updateState = useCallback((updater: State | ((p: State) => State), opts: { skipHistory?: boolean } = {}) => {
    setState((prev) => {
      if (!opts.skipHistory) pushHistory(prev);
      const next = typeof updater === "function" ? (updater as (p: State) => State)(prev) : updater;
      dirtyRef.current = true;
      setSaveStatus((s) => ({ state: "unsaved", time: s.time }));
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) { pushToast("Nothing to undo", "info"); return; }
    const snapshot = historyRef.current.pop()!;
    setState((prev) => {
      futureRef.current.push(clone({ screens: prev.screens, connections: prev.connections }));
      dirtyRef.current = true;
      setSaveStatus((s) => ({ state: "unsaved", time: s.time }));
      return { ...prev, screens: snapshot.screens, connections: snapshot.connections };
    });
  }, [pushToast]);
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const snapshot = futureRef.current.pop()!;
    setState((prev) => {
      historyRef.current.push(clone({ screens: prev.screens, connections: prev.connections }));
      dirtyRef.current = true;
      setSaveStatus((s) => ({ state: "unsaved", time: s.time }));
      return { ...prev, screens: snapshot.screens, connections: snapshot.connections };
    });
  }, []);

  const doSave = useCallback(() => {
    setSaveStatus({ state: "saving", time: Date.now() });
    setTimeout(() => {
      const ok = saveToStorage(stateRef.current);
      if (ok) { dirtyRef.current = false; setSaveStatus({ state: "saved", time: nowIso() }); }
      else { setSaveStatus({ state: "unsaved", time: Date.now() }); pushToast("Save failed", "error"); }
    }, 150);
  }, [pushToast]);

  useEffect(() => {
    const t = setInterval(() => { if (dirtyRef.current) doSave(); }, 30000);
    return () => clearInterval(t);
  }, [doSave]);

  const selectedScreen = state.screens.find((s) => s.id === selectedScreenId) || null;
  const selectedConnection = state.connections.find((c) => c.id === selectedConnectionId) || null;

  const updateScreen = useCallback((id: string, patch: Partial<Screen> | ((s: Screen) => Partial<Screen>)) => {
    updateState((prev) => ({
      ...prev,
      screens: prev.screens.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch), updatedAt: nowIso() } : s)),
    }));
  }, [updateState]);
  const updateScreenNoHistory = useCallback((id: string, patch: Partial<Screen>) => {
    updateState((prev) => ({
      ...prev,
      screens: prev.screens.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s)),
    }), { skipHistory: true });
  }, [updateState]);
  const deleteScreen = useCallback((id: string) => {
    updateState((prev) => ({
      ...prev,
      screens: prev.screens.filter((s) => s.id !== id),
      connections: prev.connections.filter((c) => c.fromId !== id && c.toId !== id),
    }));
    if (selectedScreenId === id) setSelectedScreenId(null);
    pushToast("Screen deleted", "info");
  }, [updateState, selectedScreenId, pushToast]);
  const duplicateScreen = useCallback((id: string) => {
    const src = stateRef.current.screens.find((s) => s.id === id); if (!src) return;
    const newId = "s_" + uid();
    const copy = clone(src);
    copy.id = newId; copy.name = src.name + " copy"; copy.x = src.x + 30; copy.y = src.y + 30;
    copy.blocks = copy.blocks.map((b) => ({ ...b, id: "b_" + uid() }));
    copy.createdAt = nowIso(); copy.updatedAt = nowIso();
    updateState((prev) => ({ ...prev, screens: [...prev.screens, copy] }));
    setSelectedScreenId(newId);
    pushToast("Duplicated", "info");
  }, [updateState, pushToast]);
  const addScreenAtWorld = useCallback((wx: number, wy: number) => {
    const id = "s_" + uid();
    const sc: Screen = {
      id, name: `Screen ${stateRef.current.screens.length + 1}`,
      x: snap(wx - 150), y: snap(wy - 100), w: 300, h: 200, status: "draft",
      blocks: [], aiNote: "", animationNote: "", devNotes: "",
      vibeKeywords: [], referenceLinks: [], codeSnippets: [], screenshots: [],
      overrides: { enabled: false, fields: [] }, inspiration: "",
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    updateState((prev) => ({ ...prev, screens: [...prev.screens, sc] }));
    setSelectedScreenId(id); setActiveTab("layout"); setTool("select");
  }, [updateState]);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    const exists = stateRef.current.connections.some((c) => c.fromId === fromId && c.toId === toId);
    if (exists) { pushToast("Connection already exists", "info"); return; }
    const c: Conn = { id: "c_" + uid(), fromId, toId, label: "", triggerType: "click" };
    updateState((prev) => ({ ...prev, connections: [...prev.connections, c] }));
    setSelectedConnectionId(c.id); setSelectedScreenId(null);
    pushToast("Connected", "info");
  }, [updateState, pushToast]);
  const updateConnection = useCallback((id: string, patch: Partial<Conn>) => {
    updateState((prev) => ({ ...prev, connections: prev.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [updateState]);
  const deleteConnection = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, connections: prev.connections.filter((c) => c.id !== id) }));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
    pushToast("Connection deleted", "info");
  }, [updateState, selectedConnectionId, pushToast]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: sx, y: sy };
    return { x: (sx - r.left - pan.x) / zoom, y: (sy - r.top - pan.y) / zoom };
  }, [pan, zoom]);

  const fitAll = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
    const s = stateRef.current.screens; if (s.length === 0) { setPan({ x: 0, y: 0 }); setZoom(1); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    s.forEach((sc) => { minX = Math.min(minX, sc.x); minY = Math.min(minY, sc.y); maxX = Math.max(maxX, sc.x + sc.w); maxY = Math.max(maxY, sc.y + sc.h); });
    const pad = 80;
    const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
    const z = Math.min(r.width / w, r.height / h, 1.2);
    setZoom(Math.max(0.15, Math.min(4, z)));
    setPan({ x: r.width / 2 - ((minX + maxX) / 2) * z, y: r.height / 2 - ((minY + maxY) / 2) * z });
  }, []);

  const flyTo = useCallback((id: string) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
    const sc = stateRef.current.screens.find((s) => s.id === id); if (!sc) return;
    const cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2;
    setPan({ x: r.width / 2 - cx * zoom, y: r.height / 2 - cy * zoom });
  }, [zoom]);

  /* Wheel zoom */
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const wx = (cx - pan.x) / zoom, wy = (cy - pan.y) / zoom;
      const dz = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nz = Math.max(0.15, Math.min(4, zoom * dz));
      setZoom(nz);
      setPan({ x: cx - wx * nz, y: cy - wy * nz });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pan, zoom]);

  const exportAIPrompt = useCallback(() => {
    const md = buildAIPrompt(stateRef.current);
    const safe = stateRef.current.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(`ai-prompt-${safe}.md`, md, "text/markdown");
    pushToast("AI prompt exported", "success");
    setExportMenuOpen(false);
  }, [pushToast]);
  const exportJSON = useCallback(() => {
    const safe = stateRef.current.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(`flowboard-${safe}.json`, JSON.stringify(stateRef.current, null, 2), "application/json");
    pushToast("JSON exported", "success");
    setExportMenuOpen(false);
  }, [pushToast]);
  const copyAIPrompt = useCallback(async () => {
    const md = buildAIPrompt(stateRef.current);
    try { await navigator.clipboard.writeText(md); pushToast("Copied! Paste into Claude or Cursor", "success"); }
    catch { pushToast("Clipboard blocked — try export", "error"); }
    setExportMenuOpen(false);
  }, [pushToast]);
  const importJSON = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(r.result as string);
          if (!obj.project || !obj.screens) throw new Error("invalid");
          updateState(() => obj as State);
          pushToast("Imported", "success");
        } catch { pushToast("Invalid project file", "error"); }
      };
      r.readAsText(f);
    };
    inp.click();
    setExportMenuOpen(false);
  }, [updateState, pushToast]);

  /* Keyboard */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable;
      if (e.code === "Space" && !inField) { setSpaceDown(true); e.preventDefault(); }
      if (inField) return;
      if (e.key === "v" || e.key === "V") setTool("select");
      else if (e.key === "f" || e.key === "F") setTool("frame");
      else if (e.key === "c" || e.key === "C") setTool("connect");
      else if (e.key === "Escape") { setTool("select"); setConnSrc(null); setSelectedScreenId(null); setSelectedConnectionId(null); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedScreenId) deleteScreen(selectedScreenId);
        else if (selectedConnectionId) deleteConnection(selectedConnectionId);
      }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); if (selectedScreenId) duplicateScreen(selectedScreenId); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); doSave(); pushToast("Saved", "success"); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) { e.preventDefault(); exportAIPrompt(); }
      else if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(4, z * 1.2));
      else if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(0.15, z / 1.2));
      else if (e.key === "0") fitAll();
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [selectedScreenId, selectedConnectionId, deleteScreen, deleteConnection, duplicateScreen, undo, redo, doSave, fitAll, exportAIPrompt, pushToast]);

  /* Pan */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panStateRef.current) return;
      const p = panStateRef.current;
      setPan({ x: p.px + (e.clientX - p.sx), y: p.py + (e.clientY - p.sy) });
    };
    const onUp = () => { panStateRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  /* Frame drag */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const dx = (e.clientX - d.sx) / zoom, dy = (e.clientY - d.sy) / zoom;
      if (d.mode === "move") {
        updateScreenNoHistory(d.id, { x: snap((d.ox || 0) + dx), y: snap((d.oy || 0) + dy) });
      } else {
        updateScreenNoHistory(d.id, { h: Math.max(80, snap((d.oh || 200) + dy)) });
      }
    };
    const onUp = () => {
      if (dragRef.current) { pushHistory(stateRef.current); dragRef.current = null; }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [zoom, updateScreenNoHistory, pushHistory]);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (tool === "frame") {
      const w = screenToWorld(e.clientX, e.clientY);
      addScreenAtWorld(w.x, w.y);
      return;
    }
    if (e.target === e.currentTarget || spaceDown) {
      panStateRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
      setSelectedScreenId(null); setSelectedConnectionId(null); setConnSrc(null);
    }
  };
  const onFrameMouseDown = (e: React.MouseEvent, sc: Screen) => {
    if (tool === "connect") {
      e.stopPropagation();
      if (!connSrc) setConnSrc(sc.id);
      else if (connSrc !== sc.id) { addConnection(connSrc, sc.id); setConnSrc(null); setTool("select"); }
      return;
    }
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedScreenId(sc.id); setSelectedConnectionId(null); setActiveTab("layout");
    dragRef.current = { id: sc.id, sx: e.clientX, sy: e.clientY, ox: sc.x, oy: sc.y, mode: "move" };
  };
  const onResizeMouseDown = (e: React.MouseEvent, sc: Screen) => {
    e.stopPropagation();
    dragRef.current = { id: sc.id, sx: e.clientX, sy: e.clientY, ow: sc.w, oh: sc.h, mode: "resize" };
  };

  /* Block ops */
  const addBlock = useCallback((screenId: string, type: BlockType) => {
    const def = BLOCK_RENDER[type] || { h: 32 };
    const block: Block = { id: "b_" + uid(), type, label: "", h: def.h, notes: "" };
    updateScreen(screenId, (s) => {
      const blocks = [...s.blocks, block];
      const totalH = 28 + 12 + blocks.reduce((a, b) => a + b.h + 6, 0) + 12;
      return { blocks, h: Math.max(s.h, totalH) };
    });
  }, [updateScreen]);
  const removeBlock = useCallback((sId: string, bId: string) => updateScreen(sId, (s) => ({ blocks: s.blocks.filter((b) => b.id !== bId) })), [updateScreen]);
  const updateBlock = useCallback((sId: string, bId: string, p: Partial<Block>) => updateScreen(sId, (s) => ({ blocks: s.blocks.map((b) => (b.id === bId ? { ...b, ...p } : b)) })), [updateScreen]);
  const reorderBlocks = useCallback((sId: string, from: number, to: number) => updateScreen(sId, (s) => {
    const blocks = [...s.blocks]; const [m] = blocks.splice(from, 1); blocks.splice(to, 0, m); return { blocks };
  }), [updateScreen]);
  const clearBlocks = useCallback((sId: string) => updateScreen(sId, { blocks: [] }), [updateScreen]);

  if (winW < 1200) {
    return (
      <div style={{ background: C.bg, color: C.textPri, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⊡</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Flowboard is desktop only</div>
          <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>Please use on a screen at least 1200px wide.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-root">
      <TopBar
        tool={tool} setTool={setTool}
        projectName={tempProjectName}
        onProjectNameChange={setTempProjectName}
        onProjectNameCommit={() => updateState((p) => ({ ...p, project: { ...p.project, name: tempProjectName || "Untitled" } }))}
        editingProjectName={editingProjectName} setEditingProjectName={setEditingProjectName}
        saveStatus={saveStatus}
        onAddScreen={() => setTool("frame")}
        exportMenuOpen={exportMenuOpen} setExportMenuOpen={setExportMenuOpen}
        onExportJSON={exportJSON} onExportAI={exportAIPrompt} onCopyAI={copyAIPrompt} onImportJSON={importJSON}
        onSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftPanel
          screens={state.screens}
          designSystem={state.project.designSystem}
          selectedScreenId={selectedScreenId}
          onSelectScreen={(id) => { setSelectedScreenId(id); setSelectedConnectionId(null); setActiveTab("layout"); flyTo(id); }}
          onAddBlockToSelected={(type) => { if (selectedScreenId) addBlock(selectedScreenId, type); else pushToast("Select a screen first", "info"); }}
          onAddScreen={() => setTool("frame")}
          onUpdateScreen={updateScreen}
          onDeleteScreen={deleteScreen}
          onDuplicateScreen={duplicateScreen}
        />
        <div
          ref={canvasRef}
          className="fb-grid-bg"
          onMouseDown={onCanvasMouseDown}
          style={{ position: "relative", flex: 1, overflow: "hidden", cursor: tool === "frame" || tool === "connect" ? "crosshair" : (spaceDown ? "grab" : "default") }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            <ConnectionsLayer screens={state.screens} connections={state.connections} selectedConnectionId={selectedConnectionId} onSelectConnection={(id) => { setSelectedConnectionId(id); setSelectedScreenId(null); }} zoom={zoom} />
            {state.screens.map((sc) => (
              <Frame
                key={sc.id} screen={sc}
                selected={selectedScreenId === sc.id}
                connSrc={connSrc === sc.id}
                tool={tool} zoom={zoom}
                onMouseDown={(e) => onFrameMouseDown(e, sc)}
                onResizeMouseDown={(e) => onResizeMouseDown(e, sc)}
                onRename={(name) => updateScreen(sc.id, { name })}
              />
            ))}
          </div>

          {state.screens.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto", textAlign: "center", color: C.textSec }}>
                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "40px 48px" }}>
                  <div style={{ fontSize: 22, color: C.textPri, marginBottom: 6 }}>Start wireframing</div>
                  <div style={{ fontSize: 13, marginBottom: 14 }}>Press <span className="fb-kbd">F</span> and click to add your first screen</div>
                  <button className="fb-btn fb-btn-primary" onClick={() => setTool("frame")}>+ Add Screen</button>
                </div>
              </div>
            </div>
          )}

          {(tool === "frame" || tool === "connect") && (
            <div className="fb-anim-toast" style={{ position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)", padding: "6px 12px", borderRadius: 4, fontSize: 12, background: C.blueDim, border: `1px solid ${C.blueBorder}`, color: "#93C5FD" }}>
              {tool === "frame" && "Click to place screen · Esc to cancel"}
              {tool === "connect" && (connSrc ? "→ Click destination · Esc to cancel" : "Click first screen · Esc to cancel")}
            </div>
          )}

          <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: C.textSec }} className="fb-mono">
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => setZoom((z) => Math.max(0.15, z / 1.2))}>−</button>
            <span style={{ minWidth: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => setZoom((z) => Math.min(4, z * 1.2))}>+</button>
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={fitAll}>Fit</button>
          </div>

          <Minimap screens={state.screens} pan={pan} zoom={zoom} canvasRef={canvasRef} setPan={setPan} />
        </div>

        <RightPanel
          state={state}
          selectedScreen={selectedScreen}
          selectedConnection={selectedConnection}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onUpdateScreen={updateScreen}
          onDeleteScreen={deleteScreen}
          onDuplicateScreen={duplicateScreen}
          onAddBlock={addBlock} onRemoveBlock={removeBlock} onUpdateBlock={updateBlock}
          onReorderBlocks={reorderBlocks} onClearBlocks={clearBlocks}
          onUpdateConnection={updateConnection}
          onDeleteConnection={deleteConnection}
          onExportAI={exportAIPrompt}
          onShowImage={setShowImagePreview}
          pushToast={pushToast}
        />
      </div>

      <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 8, zIndex: 50 }}>
        {toasts.map((t) => (
          <div key={t.id} className="fb-toast fb-anim-toast" style={{ borderLeftColor: t.kind === "success" ? C.green : t.kind === "error" ? C.red : C.blue }}>{t.msg}</div>
        ))}
      </div>

      {showSettings && (
        <SettingsModal
          state={state}
          onClose={() => setShowSettings(false)}
          onSave={(project) => { updateState((p) => ({ ...p, project })); pushToast("Design system saved", "success"); setShowSettings(false); }}
        />
      )}
      {showImagePreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.8)" }} onClick={() => setShowImagePreview(null)}>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: "absolute", top: -36, right: 0, color: "#fff", fontSize: 22, background: "transparent", border: "none", cursor: "pointer" }} onClick={() => setShowImagePreview(null)}>×</button>
            <img src={showImagePreview.dataUrl} alt={showImagePreview.label} style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 8 }} />
            {showImagePreview.label && <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: C.textSec }}>{showImagePreview.label}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TOP BAR
========================================================= */
function TopBar(props: {
  tool: "select" | "frame" | "connect";
  setTool: (t: "select" | "frame" | "connect") => void;
  projectName: string;
  onProjectNameChange: (v: string) => void;
  onProjectNameCommit: () => void;
  editingProjectName: boolean;
  setEditingProjectName: (b: boolean) => void;
  saveStatus: { state: "saved" | "saving" | "unsaved"; time: string | number };
  onAddScreen: () => void;
  exportMenuOpen: boolean; setExportMenuOpen: (b: boolean) => void;
  onExportJSON: () => void; onExportAI: () => void; onCopyAI: () => void; onImportJSON: () => void;
  onSettings: () => void;
}) {
  const { tool, setTool, projectName, onProjectNameChange, onProjectNameCommit, editingProjectName, setEditingProjectName, saveStatus, onAddScreen, exportMenuOpen, setExportMenuOpen, onExportJSON, onExportAI, onCopyAI, onImportJSON, onSettings } = props;
  const dotColor = saveStatus.state === "saved" ? C.green : saveStatus.state === "saving" ? C.blue : C.amber;
  return (
    <div style={{ height: 48, background: C.panel, borderBottom: `1px solid ${C.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 5, background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>FB</div>
        {editingProjectName ? (
          <input
            autoFocus value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            onBlur={() => { onProjectNameCommit(); setEditingProjectName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onProjectNameCommit(); setEditingProjectName(false); } }}
            className="fb-input" style={{ maxWidth: 200 }}
          />
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => setEditingProjectName(true)} title="Click to rename">
            {projectName}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSec }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: dotColor, animation: saveStatus.state === "saving" ? "pulse 1s infinite" : undefined }} />
          {saveStatus.state === "saved" && <span>Saved {fmtTime(saveStatus.time)}</span>}
          {saveStatus.state === "saving" && <span>Saving…</span>}
          {saveStatus.state === "unsaved" && <span>Unsaved changes</span>}
        </div>
      </div>

      <div className="fb-seg" style={{ minWidth: 280 }}>
        {([["select", "↖ Select", "V"], ["frame", "⊡ Screen", "F"], ["connect", "⇢ Connect", "C"]] as const).map(([k, l, kk]) => (
          <button key={k} className={tool === k ? "active" : ""} onClick={() => setTool(k)} title={`${l} (${kk})`}>
            <span>{l}</span><span style={{ opacity: 0.5, marginLeft: 4 }}>{kk}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <button className="fb-btn fb-btn-primary" onClick={onAddScreen}>+ Add Screen</button>
        <div style={{ position: "relative" }}>
          <button className="fb-btn fb-btn-ghost" onClick={() => setExportMenuOpen(!exportMenuOpen)}>Export ▾</button>
          {exportMenuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setExportMenuOpen(false)} />
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 50, padding: "4px 0", minWidth: 220, borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                <button className="fb-menu-item" onClick={onExportAI}>📥 Export AI Prompt (.md)</button>
                <button className="fb-menu-item" onClick={onCopyAI}>📋 Copy AI Prompt to Clipboard</button>
                <button className="fb-menu-item" onClick={onExportJSON}>💾 Export JSON</button>
                <div style={{ height: 1, background: C.borderSubtle, margin: "4px 0" }} />
                <button className="fb-menu-item" onClick={onImportJSON}>📤 Import JSON…</button>
              </div>
            </>
          )}
        </div>
        <button className="fb-btn fb-btn-ghost" onClick={onSettings} title="Settings">⚙</button>
      </div>
    </div>
  );
}

/* =========================================================
   LEFT PANEL
========================================================= */
function LeftPanel(props: {
  screens: Screen[]; designSystem: Project["designSystem"];
  selectedScreenId: string | null;
  onSelectScreen: (id: string) => void;
  onAddBlockToSelected: (t: BlockType) => void;
  onAddScreen: () => void;
  onUpdateScreen: (id: string, p: Partial<Screen>) => void;
  onDeleteScreen: (id: string) => void;
  onDuplicateScreen: (id: string) => void;
}) {
  const { screens, designSystem, selectedScreenId, onSelectScreen, onAddBlockToSelected, onAddScreen, onUpdateScreen, onDeleteScreen, onDuplicateScreen } = props;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [dsOpen, setDsOpen] = useState(false);
  return (
    <div className="fb-scroll" style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.borderSubtle}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "12px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fb-label">Screens</span>
          <span style={{ fontSize: 10, padding: "0 6px", borderRadius: 3, background: C.surface, color: C.textSec }}>{screens.length}</span>
        </div>
        <button onClick={onAddScreen} title="Add screen (F)" style={{ background: "transparent", border: "none", color: C.textSec, fontSize: 14, padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>+</button>
      </div>
      <div style={{ padding: "0 4px 8px" }}>
        {screens.map((s) => {
          const meta = STATUS_META[s.status];
          const sel = selectedScreenId === s.id;
          return (
            <div key={s.id} style={{ position: "relative", height: 32, paddingLeft: 8, paddingRight: 4, display: "flex", alignItems: "center", borderLeft: sel ? `2px solid ${C.blue}` : "2px solid transparent", background: sel ? "#0F1726" : "transparent", cursor: "pointer" }} onClick={() => onSelectScreen(s.id)}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: meta.color, marginRight: 8 }} />
              <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.textPri }}>{s.name}</span>
              <button style={{ background: "transparent", border: "none", padding: "0 4px", color: C.textSec, fontSize: 14, cursor: "pointer", opacity: openMenuId === s.id ? 1 : 0.5 }}
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}>···</button>
              {openMenuId === s.id && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                  <div style={{ position: "absolute", right: 4, top: "100%", zIndex: 50, padding: "4px 0", minWidth: 140, borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,.5)", fontSize: 11 }}>
                    <button className="fb-menu-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); const n = prompt("Rename screen:", s.name); if (n !== null) onUpdateScreen(s.id, { name: n || "Untitled" }); }}>Rename</button>
                    <button className="fb-menu-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDuplicateScreen(s.id); }}>Duplicate</button>
                    <div style={{ height: 1, background: C.borderSubtle, margin: "4px 0" }} />
                    {(["draft", "review", "done"] as Status[]).map((st) => (
                      <button key={st} className="fb-menu-item" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onUpdateScreen(s.id, { status: st }); }}>
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: STATUS_META[st].color }} />{STATUS_META[st].label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: C.borderSubtle, margin: "4px 0" }} />
                    <button className="fb-menu-item" style={{ color: C.red }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (confirm("Delete this screen?")) onDeleteScreen(s.id); }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {screens.length === 0 && <div style={{ fontSize: 11, padding: "8px 12px", color: C.textMuted }}>No screens yet.</div>}
      </div>

      <div className="fb-divider" />

      <div style={{ padding: "0 12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setBlocksOpen(!blocksOpen)}>
        <span className="fb-label">Blocks</span>
        <span style={{ fontSize: 10, color: C.textSec }}>{blocksOpen ? "▾" : "▸"}</span>
      </div>
      {blocksOpen && (
        <div style={{ padding: "0 8px 8px" }}>
          {BLOCK_GROUPS.map((g) => (
            <div key={g.name} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", padding: "0 4px", marginBottom: 4, color: C.textMuted }}>{g.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {g.items.map((b) => <button key={b.type} className="fb-pill" title={`Add ${b.name}`} onClick={() => onAddBlockToSelected(b.type)}>{b.name}</button>)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fb-divider" />

      <div style={{ padding: "0 12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setDsOpen(!dsOpen)}>
        <span className="fb-label">Design System</span>
        <span style={{ fontSize: 10, color: C.textSec }}>{dsOpen ? "▾" : "▸"}</span>
      </div>
      {dsOpen && (
        <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", marginBottom: 4, color: C.textMuted }}>Colors</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {designSystem.colors.map((c, i) => <span key={i} className="fb-swatch" style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", marginBottom: 4, color: C.textMuted }}>Fonts</div>
            <div className="fb-mono" style={{ fontSize: 10, color: C.textSec, display: "flex", flexDirection: "column", gap: 2 }}>
              {designSystem.fonts.map((f, i) => <div key={i}>{f.role}: {f.value}</div>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", marginBottom: 4, color: C.textMuted }}>Vibe</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {designSystem.vibe.map((v, i) => <span key={i} className="fb-tag">{v}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FRAME
========================================================= */
function Frame(props: {
  screen: Screen; selected: boolean; connSrc: boolean;
  tool: "select" | "frame" | "connect"; zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onRename: (n: string) => void;
}) {
  const { screen, selected, connSrc, tool, zoom, onMouseDown, onResizeMouseDown, onRename } = props;
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(screen.name);
  useEffect(() => setTempName(screen.name), [screen.name]);
  const meta = STATUS_META[screen.status];
  const showLabels = zoom >= 0.4;
  const showBorders = zoom >= 0.2;
  const headerH = 28;
  const borderColor = connSrc ? C.green : selected ? C.blue : "#D1D5DB";
  const borderWidth = connSrc || selected ? 2 : 1;
  return (
    <div
      className={"fb-anim-screen" + (connSrc ? " fb-anim-connect" : "")}
      style={{
        position: "absolute", left: screen.x, top: screen.y, width: screen.w, height: screen.h,
        background: "#FFFFFF", borderRadius: 6,
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: selected ? "0 0 0 3px rgba(62,99,221,.15), 0 4px 12px rgba(0,0,0,.4)" : "0 4px 12px rgba(0,0,0,.3)",
        cursor: tool === "connect" ? "crosshair" : tool === "select" ? "grab" : "default",
        overflow: "hidden",
      }}
      onMouseDown={onMouseDown}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "0 8px", height: headerH, background: selected ? C.blueDim : "#F3F4F6", borderBottom: `1px solid ${selected ? C.blueBorder : "#E5E7EB"}`, color: selected ? "#93C5FD" : "#374151", userSelect: "none" }}>
        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: selected ? C.blue : "#9CA3AF", marginRight: 8 }} />
        {editingName ? (
          <input
            autoFocus value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={() => { onRename(tempName || "Untitled"); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(tempName || "Untitled"); setEditingName(false); } if (e.key === "Escape") { setEditingName(false); setTempName(screen.name); } }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ fontSize: 11, fontWeight: 500, flex: 1, minWidth: 0, background: "#fff", border: "1px solid #9CA3AF", borderRadius: 3, padding: "0 4px", outline: "none", color: "#111", fontFamily: "inherit" }}
          />
        ) : (
          <div style={{ fontSize: 11, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}>
            {screen.name}
          </div>
        )}
        {showLabels && <span style={{ marginLeft: 4, fontSize: 9, padding: "1px 6px", borderRadius: 3, background: meta.color + "22", color: meta.color }}>{meta.letter}</span>}
      </div>

      <div style={{ padding: 8, height: `calc(100% - ${headerH}px)`, position: "relative" }}>
        {screen.blocks.length === 0 ? (
          showLabels ? (
            <div style={{ width: "100%", height: "100%", border: "2px dashed #E5E7EB", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9CA3AF" }}>Add blocks →</div>
          ) : null
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {screen.blocks.map((b) => <BlockShape key={b.id} block={b} showLabels={showLabels} showBorders={showBorders} />)}
          </div>
        )}
        <div style={{ pointerEvents: "none", position: "absolute", left: 0, right: 0, bottom: 0, height: 24, background: "linear-gradient(transparent, rgba(255,255,255,.95))" }} />
      </div>

      {selected && tool === "select" && (
        <div onMouseDown={onResizeMouseDown} style={{ position: "absolute", right: 0, bottom: 0, width: 14, height: 14, cursor: "nwse-resize", background: `linear-gradient(135deg, transparent 50%, ${C.blue} 50%)` }} />
      )}
    </div>
  );
}
function BlockShape({ block, showLabels, showBorders }: { block: Block; showLabels: boolean; showBorders: boolean }) {
  const def = BLOCK_RENDER[block.type] || BLOCK_RENDER.custom;
  const text = block.label || def.text || (BLOCK_DEFS[block.type]?.name || "Block");
  if (def.isDivider) {
    return <div style={{ height: def.h, display: "flex", alignItems: "center" }}><div style={{ flex: 1, height: 1, background: "#D1D5DB" }} /></div>;
  }
  return (
    <div className="fb-anim-block" style={{
      height: block.h, background: def.bg, border: showBorders ? `1px ${def.dashed ? "dashed" : "solid"} ${def.border}` : "none",
      borderRadius: 3, color: def.color, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", padding: "0 6px",
      boxShadow: def.elevated ? "0 1px 3px rgba(0,0,0,.08)" : "none",
      backgroundImage: def.pattern === "diag" ? "repeating-linear-gradient(45deg, rgba(0,0,0,.06) 0 2px, transparent 2px 8px)"
        : def.pattern === "grid" ? "linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)" : "none",
      backgroundSize: def.pattern === "grid" ? "16px 16px" : "auto",
    }}>
      {showLabels && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>}
    </div>
  );
}

/* =========================================================
   CONNECTIONS LAYER
========================================================= */
function ConnectionsLayer({ screens, connections, selectedConnectionId, onSelectConnection, zoom }: {
  screens: Screen[]; connections: Conn[]; selectedConnectionId: string | null;
  onSelectConnection: (id: string) => void; zoom: number;
}) {
  let maxX = 2000, maxY = 2000;
  screens.forEach((s) => { maxX = Math.max(maxX, s.x + s.w + 200); maxY = Math.max(maxY, s.y + s.h + 200); });
  const sw = Math.max(1, 1.5 * zoom);
  return (
    <svg width={maxX} height={maxY} style={{ position: "absolute", left: -1000, top: -1000, pointerEvents: "none", overflow: "visible" }}>
      <defs>
        <marker id="fb-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.blue} />
        </marker>
        <marker id="fb-arr-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.purple} />
        </marker>
      </defs>
      <g style={{ transform: "translate(1000px,1000px)" }}>
        {connections.map((c) => {
          const f = screens.find((s) => s.id === c.fromId);
          const t = screens.find((s) => s.id === c.toId);
          if (!f || !t) return null;
          const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
          const tcx = t.x + t.w / 2, tcy = t.y + t.h / 2;
          let sx, sy, ex, ey;
          if (Math.abs(tcx - fcx) >= Math.abs(tcy - fcy)) {
            if (tcx > fcx) { sx = f.x + f.w; sy = fcy; ex = t.x; ey = tcy; }
            else { sx = f.x; sy = fcy; ex = t.x + t.w; ey = tcy; }
          } else {
            if (tcy > fcy) { sx = fcx; sy = f.y + f.h; ex = tcx; ey = t.y; }
            else { sx = fcx; sy = f.y; ex = tcx; ey = t.y + t.h; }
          }
          const dx = Math.max(40, Math.abs(ex - sx) * 0.5);
          const cpx1 = sx + (ex > sx ? dx : -dx);
          const cpx2 = ex - (ex > sx ? dx : -dx);
          const d = `M${sx},${sy} C${cpx1},${sy} ${cpx2},${ey} ${ex},${ey}`;
          const sel = c.id === selectedConnectionId;
          const stroke = sel ? C.purple : C.blue;
          const mx = (sx + ex) / 2, my = (sy + ey) / 2;
          const labelText = c.label || c.triggerType;
          return (
            <g key={c.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); onSelectConnection(c.id); }}>
              <path d={d} stroke="transparent" strokeWidth={Math.max(10, sw * 4)} fill="none" />
              <path d={d} stroke={stroke} strokeWidth={sw} fill="none" opacity={sel ? 1 : 0.75} markerEnd={sel ? "url(#fb-arr-sel)" : "url(#fb-arr)"} className="fb-anim-draw" />
              {labelText && (
                <g transform={`translate(${mx},${my})`}>
                  <rect x={-(labelText.length * 3.2 + 8)} y={-9} width={labelText.length * 6.4 + 16} height={18} rx={3} fill={C.bg} stroke={stroke} strokeWidth={0.5} />
                  <text x={0} y={4} textAnchor="middle" fontSize="11" fill={stroke} style={{ fontFamily: "ui-sans-serif" }}>{labelText}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* =========================================================
   MINIMAP
========================================================= */
function Minimap({ screens, pan, zoom, canvasRef, setPan }: {
  screens: Screen[]; pan: { x: number; y: number }; zoom: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  setPan: (p: { x: number; y: number }) => void;
}) {
  const W = 160, H = 100;
  const r = canvasRef.current?.getBoundingClientRect();
  if (!r || screens.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  screens.forEach((s) => { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x + s.w); maxY = Math.max(maxY, s.y + s.h); });
  const vwx1 = -pan.x / zoom, vwy1 = -pan.y / zoom, vwx2 = vwx1 + r.width / zoom, vwy2 = vwy1 + r.height / zoom;
  minX = Math.min(minX, vwx1); minY = Math.min(minY, vwy1); maxX = Math.max(maxX, vwx2); maxY = Math.max(maxY, vwy2);
  const pad = 40;
  const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
  const sc = Math.min(W / w, H / h);
  const ox = (W - w * sc) / 2 - (minX - pad) * sc;
  const oy = (H - h * sc) / 2 - (minY - pad) * sc;
  const onMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const wx = (mx - ox) / sc, wy = (my - oy) / sc;
    setPan({ x: r.width / 2 - wx * zoom, y: r.height / 2 - wy * zoom });
  };
  return (
    <div onMouseDown={onMouseDown} style={{ position: "absolute", right: 16, bottom: 16, width: W, height: H, background: "rgba(13,17,23,.9)", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", cursor: "crosshair" }}>
      <svg width={W} height={H}>
        {screens.map((s) => {
          const meta = STATUS_META[s.status];
          return <rect key={s.id} x={s.x * sc + ox} y={s.y * sc + oy} width={s.w * sc} height={s.h * sc} fill={meta.color} opacity={0.7} rx={1} />;
        })}
        <rect x={vwx1 * sc + ox} y={vwy1 * sc + oy} width={(vwx2 - vwx1) * sc} height={(vwy2 - vwy1) * sc} fill="none" stroke="#fff" strokeWidth={1} />
      </svg>
    </div>
  );
}

/* =========================================================
   RIGHT PANEL
========================================================= */
function RightPanel(props: {
  state: State;
  selectedScreen: Screen | null;
  selectedConnection: Conn | null;
  activeTab: "layout" | "notes" | "assets" | "vibe";
  setActiveTab: (t: "layout" | "notes" | "assets" | "vibe") => void;
  onUpdateScreen: (id: string, p: Partial<Screen> | ((s: Screen) => Partial<Screen>)) => void;
  onDeleteScreen: (id: string) => void;
  onDuplicateScreen: (id: string) => void;
  onAddBlock: (sId: string, t: BlockType) => void;
  onRemoveBlock: (sId: string, bId: string) => void;
  onUpdateBlock: (sId: string, bId: string, p: Partial<Block>) => void;
  onReorderBlocks: (sId: string, f: number, t: number) => void;
  onClearBlocks: (sId: string) => void;
  onUpdateConnection: (id: string, p: Partial<Conn>) => void;
  onDeleteConnection: (id: string) => void;
  onExportAI: () => void;
  onShowImage: (img: Shot | null) => void;
  pushToast: (m: string, k?: "info" | "success" | "error") => void;
}) {
  const { state, selectedScreen, selectedConnection, activeTab, setActiveTab,
    onUpdateScreen, onDeleteScreen, onDuplicateScreen,
    onAddBlock, onRemoveBlock, onUpdateBlock, onReorderBlocks, onClearBlocks,
    onUpdateConnection, onDeleteConnection, onExportAI, onShowImage, pushToast } = props;
  const totalBlocks = state.screens.reduce((a, s) => a + s.blocks.length, 0);
  return (
    <div className="fb-scroll" style={{ width: 320, background: C.panel, borderLeft: `1px solid ${C.borderSubtle}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {!selectedScreen && !selectedConnection && (
        <NothingSelected screens={state.screens.length} flows={state.connections.length} blocks={totalBlocks} onExportAI={onExportAI} updatedAt={state.project.updatedAt} />
      )}
      {selectedConnection && !selectedScreen && (
        <ConnectionEditor c={selectedConnection} onUpdate={(p) => onUpdateConnection(selectedConnection.id, p)} onDelete={() => onDeleteConnection(selectedConnection.id)} screens={state.screens} />
      )}
      {selectedScreen && (
        <>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.borderSubtle}` }}>
            {(["layout", "notes", "assets", "vibe"] as const).map((t) => (
              <div key={t} className={"fb-tab " + (activeTab === t ? "active" : "")} onClick={() => setActiveTab(t)}>{t}</div>
            ))}
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {activeTab === "layout" && <LayoutTab s={selectedScreen} onUpdate={(p) => onUpdateScreen(selectedScreen.id, p)}
              onAddBlock={(t) => onAddBlock(selectedScreen.id, t)}
              onRemoveBlock={(id) => onRemoveBlock(selectedScreen.id, id)}
              onUpdateBlock={(id, p) => onUpdateBlock(selectedScreen.id, id, p)}
              onReorderBlocks={(f, t) => onReorderBlocks(selectedScreen.id, f, t)}
              onClearBlocks={() => onClearBlocks(selectedScreen.id)}
              onDuplicate={() => onDuplicateScreen(selectedScreen.id)}
              onDelete={() => onDeleteScreen(selectedScreen.id)} />}
            {activeTab === "notes" && <NotesTab s={selectedScreen} onUpdate={(p) => onUpdateScreen(selectedScreen.id, p)} />}
            {activeTab === "assets" && <AssetsTab s={selectedScreen} onUpdate={(p) => onUpdateScreen(selectedScreen.id, p)} onShowImage={onShowImage} pushToast={pushToast} />}
            {activeTab === "vibe" && <VibeTab s={selectedScreen} onUpdate={(p) => onUpdateScreen(selectedScreen.id, p)} />}
          </div>
        </>
      )}
    </div>
  );
}

function NothingSelected({ screens, flows, blocks, onExportAI, updatedAt }: { screens: number; flows: number; blocks: number; onExportAI: () => void; updatedAt: string }) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
        {[["Screens", screens], ["Flows", flows], ["Blocks", blocks]].map(([l, v]) => (
          <div key={String(l)} style={{ borderRadius: 4, padding: 8, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
            <div className="fb-mono" style={{ fontSize: 20, color: C.textPri }}>{v}</div>
            <div style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: C.textSec, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.textSec, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="fb-label" style={{ color: C.textPri, marginBottom: 4 }}>Quick start</div>
        <div><span className="fb-kbd">F</span> then click canvas — add screen</div>
        <div><span className="fb-kbd">C</span> then click two screens — connect</div>
        <div>Click a screen to edit it</div>
        <div><span className="fb-kbd">Ctrl</span>+<span className="fb-kbd">Z</span> undo · <span className="fb-kbd">0</span> fit · <span className="fb-kbd">Ctrl</span>+scroll zoom</div>
      </div>
      <button className="fb-btn fb-btn-primary" style={{ width: "100%" }} onClick={onExportAI}>Export AI Prompt</button>
      <div style={{ fontSize: 10, color: C.textMuted }}>Last saved {fmtTime(updatedAt)}</div>
    </div>
  );
}

/* ---- Layout Tab ---- */
function LayoutTab(props: {
  s: Screen;
  onUpdate: (p: Partial<Screen>) => void;
  onAddBlock: (t: BlockType) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, p: Partial<Block>) => void;
  onReorderBlocks: (f: number, t: number) => void;
  onClearBlocks: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { s, onUpdate, onAddBlock, onRemoveBlock, onUpdateBlock, onReorderBlocks, onClearBlocks, onDuplicate, onDelete } = props;
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Screen Name</div>
        <input className="fb-input" value={s.name} onChange={(e) => onUpdate({ name: e.target.value })} />
      </div>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Size & Position</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="fb-mono" style={{ fontSize: 10, width: 12, color: C.textSec }}>{k.toUpperCase()}</span>
              <input className="fb-input-num" type="number" value={s[k]} onChange={(e) => onUpdate({ [k]: Number(e.target.value) || 0 } as Partial<Screen>)} />
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Status</div>
        <div className="fb-seg">
          {(["draft", "review", "done"] as Status[]).map((st) => {
            const m = STATUS_META[st];
            return <button key={st} className={s.status === st ? "active" : ""} onClick={() => onUpdate({ status: st })} style={s.status === st ? { background: m.color, color: "#0A0F1A" } : {}}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: m.color, marginRight: 4 }} />{m.label}
            </button>;
          })}
        </div>
      </div>

      <div className="fb-divider" />

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span className="fb-label">Content Blocks ({s.blocks.length})</span>
          {s.blocks.length > 0 && <button style={{ fontSize: 10, color: C.red, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }} onClick={() => { if (confirm("Clear all blocks?")) onClearBlocks(); }}>Clear all</button>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {s.blocks.map((b, i) => {
            const def = BLOCK_DEFS[b.type];
            const expanded = expandedBlock === b.id;
            return (
              <div key={b.id}
                draggable
                onDragStart={(e) => { dragIdxRef.current = i; e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = dragIdxRef.current; if (f != null && f !== i) onReorderBlocks(f, i); dragIdxRef.current = null; }}
                style={{ borderRadius: 4, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
                <div onClick={() => setExpandedBlock(expanded ? null : b.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, color: C.textMuted, cursor: "grab" }}>⠿</span>
                  <span style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.textPri }}>
                    {def?.name || b.type}{b.label && <span style={{ color: C.textSec }}> · {b.label}</span>}
                  </span>
                  <span className="fb-mono" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: C.bg, color: C.textSec }}>{b.h}px</span>
                  <button style={{ fontSize: 12, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }} onClick={(e) => { e.stopPropagation(); onRemoveBlock(b.id); }}>×</button>
                </div>
                {expanded && (
                  <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${C.borderSubtle}` }}>
                    <div style={{ marginTop: 8 }}>
                      <div className="fb-label" style={{ marginBottom: 4 }}>Custom Label</div>
                      <input className="fb-input" value={b.label} onChange={(e) => onUpdateBlock(b.id, { label: e.target.value })} placeholder={def?.name || "Label"} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.textSec }}>Height</span>
                      <input className="fb-input-num" type="number" min={20} value={b.h} onChange={(e) => onUpdateBlock(b.id, { h: Math.max(20, Number(e.target.value) || 20) })} />
                    </div>
                    <textarea className="fb-input" placeholder="Note for AI..." value={b.notes} onChange={(e) => onUpdateBlock(b.id, { notes: e.target.value })} style={{ minHeight: 48, resize: "vertical" }} />
                  </div>
                )}
              </div>
            );
          })}
          {s.blocks.length === 0 && <div style={{ fontSize: 11, padding: "12px 0", textAlign: "center", borderRadius: 4, border: `1px dashed ${C.borderSubtle}`, color: C.textMuted }}>No blocks yet — add some below</div>}
        </div>
      </div>

      <div>
        <div className="fb-label" style={{ marginBottom: 8 }}>Add Block</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BLOCK_GROUPS.map((g) => (
            <div key={g.name}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, color: C.textMuted }}>{g.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {g.items.map((b) => <button key={b.type} className="fb-pill" onClick={() => onAddBlock(b.type)}>+ {b.name}</button>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fb-divider" />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="fb-btn fb-btn-ghost" style={{ flex: 1 }} onClick={onDuplicate}>Duplicate Screen</button>
        <button className="fb-btn fb-btn-danger" style={{ flex: 1 }} onClick={() => { if (confirm("Delete this screen?")) onDelete(); }}>Delete Screen</button>
      </div>
    </div>
  );
}

/* ---- Notes Tab ---- */
function NotesTab({ s, onUpdate }: { s: Screen; onUpdate: (p: Partial<Screen>) => void }) {
  const ta = (label: string, placeholder: string, key: "aiNote" | "animationNote" | "devNotes") => (
    <div>
      <div className="fb-label" style={{ marginBottom: 4 }}>{label}</div>
      <textarea className="fb-input" placeholder={placeholder} value={s[key] || ""} onChange={(e) => onUpdate({ [key]: e.target.value } as Partial<Screen>)} style={{ minHeight: 80, resize: "vertical" }} />
    </div>
  );
  const insert = (txt: string) => onUpdate({ aiNote: (s.aiNote ? s.aiNote + "\n" : "") + txt });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {ta("AI Context — What is this screen for?", "Describe this screen's purpose, what the user is trying to do, what should happen here. This goes directly into your AI prompt.", "aiNote")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {["This is the landing page", "User arrives from WhatsApp share", "Mobile first", "Authenticated only"].map((p) =>
          <button key={p} className="fb-pill" onClick={() => insert(p)}>+ {p}</button>
        )}
      </div>
      {ta("Animations & Interactions", "Describe transitions, hover states, loading states, motion. Example: hero fades in over 600ms, chain nodes appear L→R with 150ms stagger...", "animationNote")}
      {ta("Developer Notes", "Technical constraints, edge cases, backend dependencies...", "devNotes")}
    </div>
  );
}

/* ---- Assets Tab ---- */
function AssetsTab({ s, onUpdate, onShowImage, pushToast }: {
  s: Screen;
  onUpdate: (p: Partial<Screen> | ((c: Screen) => Partial<Screen>)) => void;
  onShowImage: (img: Shot | null) => void;
  pushToast: (m: string, k?: "info" | "success" | "error") => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleFiles = (files: FileList | null) => {
    Array.from(files || []).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = () => {
        onUpdate((curr) => ({ screenshots: [...(curr.screenshots || []), { id: "img_" + uid(), label: file.name, dataUrl: r.result as string }] }));
      };
      r.readAsDataURL(file);
    });
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items; if (!items) return;
      for (const it of items as unknown as DataTransferItem[]) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) { handleFiles({ 0: f, length: 1, item: () => f } as unknown as FileList); pushToast("Pasted image", "success"); }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [s.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const addLink = () => {
    if (!linkUrl) return;
    onUpdate((curr) => ({ referenceLinks: [...(curr.referenceLinks || []), { id: "l_" + uid(), url: linkUrl, label: linkLabel || linkUrl }] }));
    setLinkUrl(""); setLinkLabel("");
  };
  const delLink = (id: string) => onUpdate((curr) => ({ referenceLinks: curr.referenceLinks.filter((l) => l.id !== id) }));
  const delImage = (id: string) => onUpdate((curr) => ({ screenshots: curr.screenshots.filter((i) => i.id !== id) }));
  const updImage = (id: string, p: Partial<Shot>) => onUpdate((curr) => ({ screenshots: curr.screenshots.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const [editingSnippet, setEditingSnippet] = useState<string | null>(null);
  const [snTitle, setSnTitle] = useState(""); const [snLang, setSnLang] = useState("tsx"); const [snCode, setSnCode] = useState("");
  const startNew = () => { setEditingSnippet("new"); setSnTitle(""); setSnLang("tsx"); setSnCode(""); };
  const startEdit = (sn: Snippet) => { setEditingSnippet(sn.id); setSnTitle(sn.title); setSnLang(sn.language); setSnCode(sn.code); };
  const saveSn = () => {
    if (editingSnippet === "new") {
      onUpdate((curr) => ({ codeSnippets: [...(curr.codeSnippets || []), { id: "sn_" + uid(), title: snTitle || "Untitled", language: snLang, code: snCode }] }));
    } else if (editingSnippet) {
      const id = editingSnippet;
      onUpdate((curr) => ({ codeSnippets: curr.codeSnippets.map((x) => (x.id === id ? { ...x, title: snTitle, language: snLang, code: snCode } : x)) }));
    }
    setEditingSnippet(null);
  };
  const delSn = (id: string) => onUpdate((curr) => ({ codeSnippets: curr.codeSnippets.filter((x) => x.id !== id) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="fb-label">Reference Images</div>
          <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => fileRef.current?.click()}>+ Add</button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(s.screenshots || []).map((img) => (
            <div key={img.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, borderRadius: 4, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
              <img src={img.dataUrl} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 3, cursor: "pointer" }} onClick={() => onShowImage(img)} />
              <input className="fb-input" style={{ flex: 1 }} value={img.label} onChange={(e) => updImage(img.id, { label: e.target.value })} />
              <button style={{ fontSize: 12, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }} onClick={() => delImage(img.id)}>×</button>
            </div>
          ))}
          {(s.screenshots || []).length === 0 && <div style={{ fontSize: 11, color: C.textMuted }}>No images. Click + Add or paste.</div>}
        </div>
      </div>

      <div className="fb-divider" />

      <div>
        <div className="fb-label" style={{ marginBottom: 8 }}>Reference Links</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input className="fb-input" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <input className="fb-input" placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} style={{ maxWidth: 90 }} />
          <button className="fb-btn fb-btn-primary fb-btn-sm" onClick={addLink}>Add</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(s.referenceLinks || []).map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 4, fontSize: 11, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
              <span style={{ fontWeight: 500, color: C.textPri }}>{l.label}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.textSec }}>{l.url}</span>
              <button style={{ background: "transparent", border: "none", color: C.textSec, padding: "0 4px", cursor: "pointer" }} onClick={() => window.open(l.url, "_blank")}>↗</button>
              <button style={{ background: "transparent", border: "none", color: C.textMuted, padding: "0 4px", cursor: "pointer" }} onClick={() => delLink(l.id)}>×</button>
            </div>
          ))}
          {(s.referenceLinks || []).length === 0 && <div style={{ fontSize: 11, color: C.textMuted }}>No links yet.</div>}
        </div>
      </div>

      <div className="fb-divider" />

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="fb-label">Code Snippets</div>
          {editingSnippet === null && <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={startNew}>+ Add Snippet</button>}
        </div>
        {editingSnippet !== null && (
          <div style={{ padding: 8, borderRadius: 4, marginBottom: 8, background: C.surface, border: `1px solid ${C.borderSubtle}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <input className="fb-input" placeholder="Title" value={snTitle} onChange={(e) => setSnTitle(e.target.value)} style={{ flex: 1 }} />
              <select className="fb-input" style={{ maxWidth: 90 }} value={snLang} onChange={(e) => setSnLang(e.target.value)}>
                {["jsx", "tsx", "html", "css", "js", "ts", "json", "other"].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <textarea className="fb-input fb-mono" placeholder="// code..." value={snCode} onChange={(e) => setSnCode(e.target.value)} style={{ minHeight: 120, fontSize: 11, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => setEditingSnippet(null)}>Cancel</button>
              <button className="fb-btn fb-btn-primary fb-btn-sm" onClick={saveSn}>Save</button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(s.codeSnippets || []).map((sn) => (
            <SnippetRow key={sn.id} sn={sn} onEdit={() => startEdit(sn)} onDelete={() => delSn(sn.id)} pushToast={pushToast} />
          ))}
          {(s.codeSnippets || []).length === 0 && editingSnippet === null && <div style={{ fontSize: 11, color: C.textMuted }}>No snippets yet.</div>}
        </div>
      </div>
    </div>
  );
}
function SnippetRow({ sn, onEdit, onDelete, pushToast }: { sn: Snippet; onEdit: () => void; onDelete: () => void; pushToast: (m: string, k?: "info" | "success" | "error") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 4, fontSize: 11, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <span style={{ color: C.textSec }}>{open ? "▾" : "▸"}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.textPri }}>{sn.title}</span>
        <span className="fb-mono" style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, background: C.blueDim, color: "#93C5FD" }}>{sn.language}</span>
        <button style={{ background: "transparent", border: "none", color: C.textSec, padding: "0 4px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(sn.code); pushToast("Copied", "success"); }}>⧉</button>
        <button style={{ background: "transparent", border: "none", color: C.textSec, padding: "0 4px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>✎</button>
        <button style={{ background: "transparent", border: "none", color: C.textMuted, padding: "0 4px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
      </div>
      {open && <pre className="fb-mono" style={{ padding: 8, margin: 0, overflow: "auto", background: C.bg, color: C.textPri, fontSize: 10, maxHeight: 240 }}>{sn.code}</pre>}
    </div>
  );
}

/* ---- Vibe Tab ---- */
function VibeTab({ s, onUpdate }: { s: Screen; onUpdate: (p: Partial<Screen>) => void }) {
  const [tagInput, setTagInput] = useState("");
  const addTag = (t?: string) => {
    const v = (t || tagInput).trim().toLowerCase();
    if (!v || s.vibeKeywords.includes(v)) return;
    onUpdate({ vibeKeywords: [...s.vibeKeywords, v] });
    setTagInput("");
  };
  const removeTag = (v: string) => onUpdate({ vibeKeywords: s.vibeKeywords.filter((x) => x !== v) });
  const ovr = s.overrides || { enabled: false, fields: [] };
  const setOvr = (p: Partial<Screen["overrides"]>) => onUpdate({ overrides: { ...ovr, ...p } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Vibe Keywords — tone & feel</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {s.vibeKeywords.map((v) => <span key={v} className="fb-tag">{v}<span className="x" onClick={() => removeTag(v)}>×</span></span>)}
        </div>
        <input className="fb-input" placeholder="Type word, Enter or comma to add" value={tagInput}
          onChange={(e) => { const v = e.target.value; if (v.endsWith(",")) addTag(v.slice(0, -1)); else setTagInput(v); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {VIBE_PRESETS.map((v) => <button key={v} className="fb-pill" onClick={() => addTag(v)}>{v}</button>)}
        </div>
      </div>

      <div className="fb-divider" />

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className="fb-label">Override Global Design</div>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
            <input type="checkbox" checked={ovr.enabled} onChange={(e) => setOvr({ enabled: e.target.checked })} />
            <span style={{ color: C.textSec }}>{ovr.enabled ? "On" : "Off"}</span>
          </label>
        </div>
        {ovr.enabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(ovr.fields || []).map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 4 }}>
                <input className="fb-input" placeholder="key" value={f.key} onChange={(e) => { const fields = [...ovr.fields]; fields[i] = { ...f, key: e.target.value }; setOvr({ fields }); }} style={{ maxWidth: 100 }} />
                <input className="fb-input" placeholder="value" value={f.value} onChange={(e) => { const fields = [...ovr.fields]; fields[i] = { ...f, value: e.target.value }; setOvr({ fields }); }} />
                {(f.key.toLowerCase().includes("color") || f.key.toLowerCase().includes("background") || /^#/.test(f.value)) && <span className="fb-swatch" style={{ width: 24, height: 24, background: f.value }} />}
                <button style={{ background: "transparent", border: "none", color: C.textMuted, padding: "0 4px", cursor: "pointer" }} onClick={() => { const fields = ovr.fields.filter((_, idx) => idx !== i); setOvr({ fields }); }}>×</button>
              </div>
            ))}
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => setOvr({ fields: [...(ovr.fields || []), { key: "", value: "" }] })}>+ Add token</button>
          </div>
        )}
      </div>

      <div className="fb-divider" />

      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Inspiration — what should this feel like</div>
        <textarea className="fb-input" placeholder="Looks like Linear's settings page but with Razorpay's dark surface feel. Reference: linear.app/pricing" value={s.inspiration || ""} onChange={(e) => onUpdate({ inspiration: e.target.value })} style={{ minHeight: 80, resize: "vertical" }} />
      </div>
    </div>
  );
}

/* =========================================================
   CONNECTION EDITOR
========================================================= */
function ConnectionEditor({ c, onUpdate, onDelete, screens }: { c: Conn; onUpdate: (p: Partial<Conn>) => void; onDelete: () => void; screens: Screen[] }) {
  const f = screens.find((s) => s.id === c.fromId), t = screens.find((s) => s.id === c.toId);
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="fb-label">Flow Connection</div>
      <div style={{ fontSize: 11, padding: 8, borderRadius: 4, background: C.surface, border: `1px solid ${C.borderSubtle}`, color: C.textSec }}>
        <span style={{ color: C.textPri }}>{f?.name || "?"}</span> → <span style={{ color: C.textPri }}>{t?.name || "?"}</span>
      </div>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Label</div>
        <input className="fb-input" placeholder="e.g. User clicks CTA" value={c.label} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>
      <div>
        <div className="fb-label" style={{ marginBottom: 4 }}>Trigger</div>
        <div className="fb-seg">
          {(["click", "scroll", "submit", "auto", "other"] as const).map((tt) => (
            <button key={tt} className={c.triggerType === tt ? "active" : ""} onClick={() => onUpdate({ triggerType: tt })}>{tt}</button>
          ))}
        </div>
      </div>
      <button className="fb-btn fb-btn-danger" style={{ width: "100%" }} onClick={onDelete}>Delete Connection</button>
    </div>
  );
}

/* =========================================================
   SETTINGS MODAL
========================================================= */
function SettingsModal({ state, onClose, onSave }: { state: State; onClose: () => void; onSave: (p: Project) => void }) {
  const [p, setP] = useState<Project>(() => clone(state.project));
  const ds = p.designSystem;
  const setDS = (patch: Partial<Project["designSystem"]>) => setP((prev) => ({ ...prev, designSystem: { ...prev.designSystem, ...patch } }));
  const updateColor = (i: number, patch: Partial<Project["designSystem"]["colors"][number]>) => setDS({ colors: ds.colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const addColor = () => setDS({ colors: [...ds.colors, { name: "new", hex: "#000000", role: "other" }] });
  const delColor = (i: number) => setDS({ colors: ds.colors.filter((_, idx) => idx !== i) });
  const loadClirun = () => setDS({
    colors: [
      { name: "App BG", hex: "#0A0F1A", role: "background" }, { name: "Panel", hex: "#0D1117", role: "background" },
      { name: "Surface", hex: "#111827", role: "background" }, { name: "Card", hex: "#1F2937", role: "background" },
      { name: "Border", hex: "#374151", role: "border" }, { name: "Accent", hex: "#3E63DD", role: "accent" },
      { name: "Text", hex: "#F9FAFB", role: "text" }, { name: "Muted", hex: "#9CA3AF", role: "text" },
    ],
  });
  const updateFont = (i: number, patch: Partial<Project["designSystem"]["fonts"][number]>) => setDS({ fonts: ds.fonts.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const [vibeIn, setVibeIn] = useState("");
  const addVibe = () => { const v = vibeIn.trim().toLowerCase(); if (v && !ds.vibe.includes(v)) { setDS({ vibe: [...ds.vibe, v] }); setVibeIn(""); } };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.7)" }} onClick={onClose}>
      <div className="fb-anim-modal" onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, maxWidth: 560, width: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Project Design System</div>
            <div style={{ fontSize: 11, color: C.textSec }}>Included in every AI export.</div>
          </div>
          <button style={{ fontSize: 22, padding: "0 8px", background: "transparent", border: "none", color: C.textSec, cursor: "pointer" }} onClick={onClose}>×</button>
        </div>
        <div className="fb-scroll" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0 }}>
          <section>
            <div className="fb-label" style={{ marginBottom: 8 }}>Project</div>
            <input className="fb-input" style={{ marginBottom: 8 }} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            <textarea className="fb-input" placeholder="What is this project? Who uses it?" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} style={{ minHeight: 70, resize: "vertical" }} />
          </section>
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="fb-label">Colors</div>
              <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={loadClirun}>Load Clirun colors</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ds.colors.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input className="fb-input" value={c.name} onChange={(e) => updateColor(i, { name: e.target.value })} style={{ maxWidth: 120 }} />
                  <span className="fb-swatch" style={{ background: c.hex, width: 24, height: 24 }} />
                  <input className="fb-input fb-mono" value={c.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} style={{ maxWidth: 100 }} />
                  <select className="fb-input" value={c.role} onChange={(e) => updateColor(i, { role: e.target.value })}>
                    {["accent", "background", "text", "border", "other"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button style={{ background: "transparent", border: "none", color: C.textMuted, padding: "0 4px", cursor: "pointer" }} onClick={() => delColor(i)}>×</button>
                </div>
              ))}
              <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={addColor}>+ Add color</button>
            </div>
          </section>
          <section>
            <div className="fb-label" style={{ marginBottom: 8 }}>Typography</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ds.fonts.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 4 }}>
                  <input className="fb-input" value={f.role} onChange={(e) => updateFont(i, { role: e.target.value })} style={{ maxWidth: 90 }} />
                  <input className="fb-input" value={f.value} onChange={(e) => updateFont(i, { value: e.target.value })} />
                  <input className="fb-input" placeholder="size" value={f.size || ""} onChange={(e) => updateFont(i, { size: e.target.value })} style={{ maxWidth: 60 }} />
                  <input className="fb-input" placeholder="weight" value={f.weight || ""} onChange={(e) => updateFont(i, { weight: e.target.value })} style={{ maxWidth: 70 }} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="fb-label" style={{ marginBottom: 8 }}>Global Vibe</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              {ds.vibe.map((v) => <span key={v} className="fb-tag">{v}<span className="x" onClick={() => setDS({ vibe: ds.vibe.filter((x) => x !== v) })}>×</span></span>)}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input className="fb-input" placeholder="add tag" value={vibeIn} onChange={(e) => setVibeIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addVibe(); }} />
              <button className="fb-btn fb-btn-primary fb-btn-sm" onClick={addVibe}>Add</button>
            </div>
          </section>
          <section>
            <div className="fb-label" style={{ marginBottom: 8 }}>Global Notes for AI</div>
            <textarea className="fb-input" value={ds.notes || ""} onChange={(e) => setDS({ notes: e.target.value })} style={{ minHeight: 80, resize: "vertical" }} placeholder="Anything else the AI should know..." />
          </section>
          <section>
            <div className="fb-label" style={{ marginBottom: 8 }}>Build Target</div>
            <input className="fb-input" placeholder="e.g. React + Vite, Next.js" value={ds.target || ""} onChange={(e) => setDS({ target: e.target.value })} />
          </section>
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.borderSubtle}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="fb-btn fb-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="fb-btn fb-btn-primary" onClick={() => onSave(p)}>Save Design System</button>
        </div>
      </div>
    </div>
  );
}
