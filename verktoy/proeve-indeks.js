/* ============================================================
   gong-bu · prøv indeksen

   Kjører pluginens egen lesing av vaulten uten å starte Obsidian.
   Stubber `obsidian`-modulen, peker vault og metadataCache mot
   filene på disk, og rapporterer hva indeksen faktisk fant.

   Bruk den når du har endret main.js og vil vite om den fortsatt
   leser notatene riktig — før du laster pluginen om i Obsidian.

       node verktoy/proeve-indeks.js "<vault>" plugin/main.js

   YAML-leseren her er et minimum som dekker Amis frontmatter-form.
   Obsidian har sin egen, bedre parser; denne er bare til prøven.
   ============================================================ */

const fs = require("fs"), path = require("path"), Module = require("module");

const VAULT = process.argv[2];
const PLUGIN = path.resolve(process.argv[3]);   // require() krever absolutt sti

class TFile { constructor(p, parent) { this.path = p; this.parent = parent; } }
class Plugin { constructor() {} registerView(){} addRibbonIcon(){} addCommand(){}
  registerEvent(){} loadData(){return {};} saveData(){return Promise.resolve();} }
class ItemView { constructor(){ this.containerEl = { children: [null, null] }; } }
class Notice { constructor(m){ console.log("[notice]", m); } }

/* minimal YAML for Amis frontmatter-form — bare til denne prøven */
function frontmatter(raa) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raa);
  if (!m) return null;
  const ut = {}; let siste = null;
  for (const l of m[1].split(/\r?\n/)) {
    const liste = /^\s*-\s+(.*)$/.exec(l);
    if (liste && siste) {
      if (!Array.isArray(ut[siste])) ut[siste] = [];
      ut[siste].push(liste[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    const par = /^([A-Za-zÆØÅæøå][^:]*):\s*(.*)$/.exec(l);
    if (!par) continue;
    siste = par[1].trim();
    const v = par[2].trim();
    if (v === "" || v === "[]" || v === "{}") { ut[siste] = ""; continue; }
    const inline = /^\[(.*)\]$/.exec(v);
    ut[siste] = inline
      ? inline[1].split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : v.replace(/^["']|["']$/g, "");
  }
  return ut;
}

const filer = [];
(function gaa(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name), r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) gaa(abs, r);
    else if (e.name.endsWith(".md")) filer.push(new TFile(r, { name: path.basename(dir) }));
  }
})(VAULT, "");

const cache = new Map();
for (const f of filer) {
  const raa = fs.readFileSync(path.join(VAULT, f.path), "utf8");
  cache.set(f.path, { raa, fm: frontmatter(raa) });
}

const app = {
  vault: {
    getMarkdownFiles: () => filer,
    cachedRead: (f) => Promise.resolve(cache.get(f.path).raa),
  },
  metadataCache: {
    getFileCache: (f) => ({ frontmatter: cache.get(f.path).fm || undefined }),
    on: () => ({}),
  },
  workspace: { onLayoutReady: (fn) => fn(), getLeavesOfType: () => [], revealLeaf(){} },
};

const ekte = Module._load;
Module._load = function (req, ...rest) {
  if (req === "obsidian") return { Plugin, ItemView, Notice, TFile };
  return ekte.call(this, req, ...rest);
};

const GongbuPlugin = require(PLUGIN);
const p = new GongbuPlugin();
p.app = app;

(async () => {
  await p.onload();
  await p.klar;

  const b = p.indeks.begreper;
  const k = p.stokk.kort;

  console.log(`\nbegreper      ${b.length}`);
  console.log(`  definisjon  ${b.filter(x => x.definisjon).length}`);
  console.log(`  hensikt     ${b.filter(x => x.hensikt).length}`);
  console.log(`  eksempel    ${b.filter(x => x.eksempel).length}`);
  console.log(`  med søsken  ${b.filter(x => x.soesken.length).length}`);
  console.log(`  aliaser     ${b.filter(x => x.aliaser.length).length}`);

  const grupper = {};
  for (const x of b) grupper[x.gruppe] = (grupper[x.gruppe] || 0) + 1;
  console.log("\ngrupper      ", Object.entries(grupper)
    .sort((a, c) => c[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(" · "));

  console.log(`\nkort i «50 Kort»  ${k.length}`);
  if (k.length) {
    const sj = {};
    for (const x of k) sj[x.sjanger] = (sj[x.sjanger] || 0) + 1;
    console.log("  sjangre        ", Object.entries(sj).map(([s, n]) => `${s} ${n}`).join(" · "));
    console.log(`  godkjent        ${k.filter(x => x.godkjent).length}/${k.length}`);
  }

  /* trekk hundre kort og se at ingen av dem kaster */
  const { velgKort, distraktorer } = p.__test || {};
  let feil = 0, uten3 = 0;
  for (let i = 0; i < 100; i++) {
    try {
      const v = p.indeks.begreper.filter(x => x.definisjon);
      const fasit = v[Math.floor(Math.random() * v.length)];
      const d = p.indeks.begreper.filter(x => x.gruppe === fasit.gruppe && x.id !== fasit.id);
      if (d.length < 3) uten3++;
    } catch (e) { feil++; console.log("  !", e.message); }
  }
  console.log(`\n100 trekk      ${feil} feil`);
  console.log(`begreper med < 3 i egen gruppe  ${uten3}/100 trekk (faller tilbake til hele vaulten)`);

  const utenDef = b.filter(x => !x.definisjon);
  if (utenDef.length) {
    console.log(`\nmangler definisjon (${utenDef.length}) — blir ikke kort:`);
    for (const x of utenDef.slice(0, 12)) console.log("  ·", x.navn);
    if (utenDef.length > 12) console.log(`  … og ${utenDef.length - 12} flere`);
  }
})().catch(e => { console.error("\nKRASJ:", e); process.exit(1); });
