/* ============================================================
   gong-bu · eksporter fra terminalen

   Skriver gong-bu.json uten å gå veien om Obsidian. Nyttig når
   pluginen ikke er lastet inn på nytt ennå, og som en måte å
   oppdatere fila på uten å åpne appen.

   Den laster pluginens EGEN kode og bruker dens indeks, så det
   finnes bare én måte å lese notatene på. Ingen parallell
   implementasjon som kan drive fra hverandre.

       node verktoy/eksporter.js "<vault>" plugin/main.js

   Skriver til <vault>/gong-bu.json.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const Module = require("module");

const VAULT = process.argv[2];
const PLUGIN = path.resolve(process.argv[3] || "plugin/main.js");

if (!VAULT || !fs.existsSync(VAULT)) {
  console.error("Bruk: node verktoy/eksporter.js \"<vault>\" plugin/main.js");
  process.exit(1);
}

/* --- stubber av det pluginen venter seg fra Obsidian --- */

class TFile { constructor(p, parent) { this.path = p; this.parent = parent; } }
class Plugin {
  registerView() {} addRibbonIcon() {} addCommand() {} registerEvent() {}
  addSettingTab() {} loadData() { return {}; } saveData() { return Promise.resolve(); }
}
class ItemView { constructor() { this.containerEl = { children: [null, null] }; } }
class Notice { constructor(m) { console.log("  ·", m); } }
class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; } }
class Setting {
  setName() { return this; } setDesc() { return this; }
  addToggle() { return this; } addText() { return this; } addButton() { return this; }
}
const requestUrl = async () => { throw new Error("ingen nettverk her"); };

/* Minimal frontmatter-leser. Obsidian har en bedre; denne dekker
   formen notatene faktisk har. */
function frontmatter(raa) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raa);
  if (!m) return null;
  const ut = {};
  let siste = null;
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
      ? inline[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : v.replace(/^["']|["']$/g, "");
  }
  return ut;
}

/* --- les vaulten inn i minnet --- */

const filer = [];
(function gaa(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    const r = rel ? rel + "/" + e.name : e.name;
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
    getName: () => path.basename(VAULT),
    getMarkdownFiles: () => filer,
    cachedRead: (f) => Promise.resolve(cache.get(f.path).raa),
    getAbstractFileByPath: () => null,
    create: (p, t) => { fs.writeFileSync(path.join(VAULT, p), t); return Promise.resolve(); },
    modify: (f, t) => { fs.writeFileSync(path.join(VAULT, f.path), t); return Promise.resolve(); },
  },
  metadataCache: {
    getFileCache: (f) => ({ frontmatter: cache.get(f.path).fm || undefined }),
    on: () => ({}),
  },
  workspace: { onLayoutReady: (fn) => fn(), getLeavesOfType: () => [], revealLeaf() {} },
};

const ekte = Module._load;
Module._load = function (req, ...rest) {
  if (req === "obsidian") {
    return { Plugin, ItemView, Notice, TFile, PluginSettingTab, Setting, requestUrl };
  }
  return ekte.call(this, req, ...rest);
};

/* --- kjør pluginens egen eksport --- */

const GongbuPlugin = require(PLUGIN);
const p = new GongbuPlugin();
p.app = app;

(async () => {
  await p.onload();
  await p.klar;
  await p.eksporter();

  const ut = path.join(VAULT, "gong-bu.json");
  const data = JSON.parse(fs.readFileSync(ut, "utf8"));
  const medDef = data.begreper.filter((b) => b.definisjon).length;
  console.log(`\ngong-bu.json skrevet til vaulten`);
  console.log(`  ${data.begreper.length} begreper (${medDef} med definisjon)`);
  console.log(`  ${data.kort.length} kort`);
  console.log(`  ${Math.round(fs.statSync(ut).size / 1024)} kB`);
})().catch((e) => { console.error("\nKRASJ:", e); process.exit(1); });
