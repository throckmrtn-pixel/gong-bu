/* ============================================================
   gong-bu — øving på begrepene i din egen vault

   Leser notatene under «20 Begreper» rett fra Obsidian. Ingen
   datafil å bygge, ingen eksport: skriver du et nytt begrep, er
   det med i neste kort.

   Leser også «50 Kort» — kortene verktoy/lag-kort.py har laget av
   eksamenssett og notater. De er merket med hvem som laget dem og
   om du har godkjent dem, så du alltid vet hva du øver på.

   Leser notatene. Skriver dem aldri. Framdriften din ligger i
   plugin-ens egen data.json under .obsidian/plugins/gong-bu/ —
   utenfor notatene, men inne i vaulten, så den følger med når
   vaulten synkes til telefonen.

   Skrevet i ren JavaScript med vilje: ingen npm, intet byggesteg.
   Filene du ser her er filene som kjører.
   ============================================================ */

"use strict";

const { Plugin, ItemView, Notice, TFile, PluginSettingTab, Setting,
        requestUrl } = require("obsidian");

const VISNING = "gong-bu-visning";
const ROT = "20 Begreper";
const KORTROT = "50 Kort";

/* Hjelperen er et tillegg, aldri en forutsetning. Står modellen stille,
   skal hver eneste skjerm virke som før — du retter bare selv. Derfor
   er standarden «av», og derfor har hvert kall en kort tidsfrist. */
const STANDARD = {
  hjelperPaa: false,
  endepunkt: "http://localhost:11434/v1/chat/completions",
  modell: "normistral7",
  nokkel: "",            // tom for en lokal modell
};

const SJANGER = {
  scenario:   "Scenario · hvilket begrep?",
  finnfeilen: "Finn feilen",
  forskjell:  "Forskjellen på to",
  eksamen:    "Eksamensoppgave",
};

/* Intervaller i dager. Bommer du, kommer kortet rett tilbake.
   Ingen streak, ingen straff for en dag uten lesing — bare
   avstanden til neste gang. */
const TRAPP = [0, 1, 3, 7, 16, 35, 75];


/* ============================================================
   INDEKSEN — vaulten lest som begreper
   ============================================================ */

class Indeks {
  constructor(app) {
    this.app = app;
    this.begreper = [];
    this.etterId = new Map();
    this.etterNavn = new Map();
  }

  /** Alle markdown-filer under begrepsrota. */
  filer() {
    return this.app.vault.getMarkdownFiles()
      .filter((f) => f.path.startsWith(ROT + "/"));
  }

  async bygg() {
    const ut = [];
    for (const fil of this.filer()) {
      const fm = this.app.metadataCache.getFileCache(fil)?.frontmatter || {};
      if (String(fm.Type || "").trim() === "temakart") continue;
      if (!fm.Begrep) continue;

      const tekst = await this.app.vault.cachedRead(fil);
      ut.push(this.lesBegrep(fil, fm, tekst));
    }

    ut.sort((a, b) => a.navn.localeCompare(b.navn, "nb"));
    this.begreper = ut;

    this.etterId = new Map(ut.map((b) => [b.id, b]));
    this.etterNavn = new Map();
    for (const b of ut) {
      this.etterNavn.set(b.navn, b);
      for (const a of b.aliaser) if (!this.etterNavn.has(a)) this.etterNavn.set(a, b);
    }

    /* Søsken: begreper med samme overbegrep. Det er dem som er
       lette å forveksle, og derfor dem nivå 3 skal sortere. */
    for (const b of ut) {
      b.soesken = b.delAv
        ? ut.filter((a) => a.delAv === b.delAv && a.id !== b.id).map((a) => a.id)
        : [];
    }
    return ut;
  }

  lesBegrep(fil, fm, tekst) {
    const navn = String(fm.Begrep).trim();
    const kropp = tekst.replace(/^---[\s\S]*?\n---\n?/, "");

    return {
      id: slugg(navn),
      navn,
      aliaser: tilListe(fm.aliases || fm.Aliases).filter((a) => a !== navn),
      gruppe: fil.parent?.name || "Uplassert",
      delAv: forsteLenke(fm["Del av"]),
      fag: tilListe(fm.Fag),
      status: String(fm.Status || "utkast").trim(),
      definisjon: finnDefinisjon(kropp),
      hensikt: rens(seksjon(kropp, /^##\s+Hensikt/i)),
      eksempel: rens(seksjon(kropp, /^##\s+Eksempel/i)),
      sti: fil.path,
    };
  }

  hent(id) { return this.etterId.get(id); }
}


/* ============================================================
   KORTSTOKKEN — «50 Kort», laget av generatoren

   Disse kortene er skrevet av en språkmodell. Det står på hvert
   kort, og de som ikke er godkjent ennå får et tydelig merke i
   visningen. Da vet du hva som er dine egne ord og hva som er en
   maskins forslag.
   ============================================================ */

class Kortstokk {
  constructor(app) {
    this.app = app;
    this.kort = [];
  }

  async bygg() {
    const ut = [];
    const filer = this.app.vault.getMarkdownFiles()
      .filter((f) => f.path.startsWith(KORTROT + "/"));

    for (const fil of filer) {
      const fm = this.app.metadataCache.getFileCache(fil)?.frontmatter || {};
      const slag = String(fm.Korttype || "").trim();
      if (slag !== "flervalg" && slag !== "skriv") continue;

      const tekst = await this.app.vault.cachedRead(fil);
      const kropp = tekst.replace(/^---[\s\S]*?\n---\n?/, "");

      /* Spørsmålet står i en question-callout. Den eldre formen med
         «## Spørsmål» leses også, så gamle kort ikke slutter å virke. */
      const sporsmaal = rens(kallut(kropp, "question")?.tekst
        || seksjon(kropp, /^##\s+Spørsmål/i));
      if (!sporsmaal) continue;

      const svar = kallut(kropp, "success");
      const fasit = kallut(kropp, "abstract");
      const krit = kallut(kropp, "check");

      ut.push({
        id: "kort:" + fil.path,
        slag,
        sjanger: String(fm.Sjanger || "").trim(),
        handlerOm: forsteLenke(fm["Handler om"]) || "",
        kilde: String(fm.Kilde || "").trim(),
        godkjent: /^(ja|true|yes)$/i.test(String(fm.Sjekket || "").trim()),
        sporsmaal,
        alternativer: lesAlternativer(
          seksjon(kropp, /^##\s+Alternativer/i), fasitLinje(svar?.tekst)),
        begrunnelse: utenFasitLinje(svar?.tekst)
          || rens(seksjon(kropp, /^##\s+Begrunnelse/i)),
        fasit: rens(fasit?.tekst || svar?.tekst || seksjon(kropp, /^##\s+Fasit/i)),
        kriterier: lesPunkter(krit?.tekst || seksjon(kropp, /^##\s+Sensor/i)),
        sti: fil.path,
      });
    }

    /* Flervalgskort uten et gjenkjennelig riktig svar er ødelagte. Dropp
       dem heller enn å vise et kort det er umulig å svare riktig på. */
    this.kort = ut.filter((k) => k.slag !== "flervalg"
      || k.alternativer.some((a) => a.riktig));
    return this.kort;
  }
}

/**
 * Innholdet i en Obsidian-callout: «> [!question] Tittel» og linjene
 * under som begynner med «>».
 *
 * Callouts er grunnen til at kortene ser ut som de hører hjemme i
 * Obsidian: question står åpen, success/abstract står sammenslått, så
 * svaret ikke er synlig før du selv folder det ut.
 */
function kallut(kropp, slag) {
  const linjer = String(kropp || "").split("\n");
  const hode = new RegExp(`^>\\s*\\[!${slag}\\][+-]?\\s*(.*)$`, "i");
  for (let i = 0; i < linjer.length; i++) {
    const m = hode.exec(linjer[i]);
    if (!m) continue;
    const ut = [];
    for (let j = i + 1; j < linjer.length; j++) {
      if (!/^>/.test(linjer[j])) break;
      ut.push(linjer[j].replace(/^>\s?/, ""));
    }
    return { tittel: m[1].trim(), tekst: ut.join("\n").trim() };
  }
  return null;
}

/** Første fete linje i svar-callouten — selve fasiten. */
function fasitLinje(tekst) {
  const m = /\*\*(.+?)\*\*/.exec(String(tekst || ""));
  return m ? m[1].trim() : "";
}

/** Resten av svar-callouten, altså begrunnelsen. */
function utenFasitLinje(tekst) {
  if (!tekst) return "";
  return rens(String(tekst)
    .split("\n")
    .filter((l) => !/^\s*\*\*.+\*\*\s*$/.test(l))
    .join("\n"));
}

/** Til sammenligning: samme ord, uansett store bokstaver og tegnsetting. */
function kam(s) {
  return String(s || "").toLowerCase()
    .replace(/\*\*/g, "").replace(/[.,;:!?]+$/, "").trim();
}

/**
 * Alternativene under «## Alternativer». Tar både den rene lista
 * (ingen spoiler i Obsidian) og den eldre avkryssingsformen.
 */
function lesAlternativer(blokk, fasit) {
  const ut = [];
  for (const l of String(blokk || "").split("\n")) {
    const avkrysset = /^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/.exec(l);
    if (avkrysset) {
      ut.push({ tekst: rens(avkrysset[2]), riktig: avkrysset[1].toLowerCase() === "x" });
      continue;
    }
    const vanlig = /^\s*[-*]\s+(.+)$/.exec(l);
    if (vanlig) ut.push({ tekst: rens(vanlig[1]), riktig: false });
  }
  if (fasit && !ut.some((a) => a.riktig)) {
    const treff = ut.find((a) => kam(a.tekst) === kam(fasit));
    if (treff) treff.riktig = true;
  }
  return ut;
}

function lesPunkter(blokk) {
  return String(blokk || "").split("\n")
    .map((l) => /^\s*[-*]\s+(.+)$/.exec(l))
    .filter(Boolean).map((m) => rens(m[1]));
}


/* ============================================================
   TEKSTBITER UT AV ET NOTAT
   ============================================================ */

function slugg(s) {
  return s.toLowerCase().trim()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tilListe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s && s !== "[]" ? [s] : [];
}

function forsteLenke(v) {
  const m = /\[\[([^\]|]+)/.exec(String(v || ""));
  return m ? m[1].trim() : null;
}

/** Definisjonen er sitatblokka rett under tittelen. */
function finnDefinisjon(kropp) {
  const linjer = kropp.split("\n");
  const samlet = [];
  let startet = false;
  for (const l of linjer) {
    if (l.startsWith(">")) { startet = true; samlet.push(l.replace(/^>\s?/, "")); }
    else if (startet) { if (l.trim()) break; }
  }
  const t = rens(samlet.join("\n"));
  return /^definisjon$/i.test(t) ? "" : t;
}

/** Teksten under en ##-overskrift, fram til neste overskrift. */
function seksjon(kropp, regex) {
  const linjer = kropp.split("\n");
  const start = linjer.findIndex((l) => regex.test(l));
  if (start === -1) return "";
  const ut = [];
  for (let i = start + 1; i < linjer.length; i++) {
    if (/^##\s/.test(linjer[i])) break;
    ut.push(linjer[i]);
  }
  return ut.join("\n");
}

/** Markdown til lesbar tekst. */
function rens(s) {
  return String(s || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/* ============================================================
   FRAMDRIFT
   Bor i plugin-ens egen data.json. Rører aldri notatene.
   ============================================================ */

class Framdrift {
  constructor(plugin) {
    this.plugin = plugin;
    this.kort = {};          /* id -> { trinn, neste, sett, riktig } */
    this.bunke = "alt";      /* alt | begreper | laget */
    this.nivaa = 1;          /* 1 = kjenne igjen · 2 = forklare */
    this.innst = { ...STANDARD };
  }

  async last() {
    const lagret = (await this.plugin.loadData()) || {};
    this.kort = lagret.kort || {};
    this.bunke = lagret.bunke || "alt";
    this.nivaa = lagret.nivaa || 1;
    this.innst = { ...STANDARD, ...(lagret.innst || {}) };
  }

  lagre() {
    return this.plugin.saveData({
      versjon: 3, bunke: this.bunke, nivaa: this.nivaa,
      innst: this.innst, kort: this.kort,
    });
  }

  async settBunke(b) { this.bunke = b; await this.lagre(); }
  async settNivaa(n) { this.nivaa = n; await this.lagre(); }

  for(id) {
    return this.kort[id] || { trinn: 0, neste: 0, sett: 0, riktig: 0 };
  }

  tilstand(id) {
    const k = this.kort[id];
    if (!k || !k.sett) return "urort";
    return k.trinn >= 3 ? "sitter" : "paavei";
  }

  forfalt(id) {
    const k = this.kort[id];
    return !k || !k.sett ? true : Date.now() >= k.neste;
  }

  /** dom: «bomma» | «delvis» | «satt» */
  async svar(id, dom) {
    const k = this.for(id);
    k.sett += 1;
    if (dom === "satt") { k.trinn = Math.min(k.trinn + 1, TRAPP.length - 1); k.riktig += 1; }
    else if (dom === "delvis") { k.trinn = Math.max(1, k.trinn); }
    else { k.trinn = 0; }

    const dager = TRAPP[k.trinn];
    /* Trinn 0 betyr «snart igjen», ikke «om null dager». */
    k.neste = Date.now() + (dager === 0 ? 10 * 60 * 1000 : dager * 864e5);
    this.kort[id] = k;
    await this.lagre();
    return k;
  }

  async nullstill() { this.kort = {}; await this.lagre(); }
}


/* ============================================================
   HJELPEREN

   En språkmodell som leser svaret ditt og sier hva du manglet.
   Den er et tillegg, ikke en forutsetning: er den av, utilgjengelig
   eller treg, faller nivå 2 tilbake til at du retter selv — og det
   er uansett den avgjørelsen framdriften bygger på.

   Kjører modellen lokalt (Ollama), forlater svaret ditt aldri
   maskinen. På telefonen finnes det ingen lokal modell, så der er
   hjelperen stille med mindre du har satt opp et endepunkt du når.
   ============================================================ */

class Hjelper {
  constructor(plugin) {
    this.plugin = plugin;
    this._svarte = 0;        /* siste gang vi fikk kontakt */
    this._feilet = 0;        /* siste gang vi ikke fikk det */
  }

  get innst() { return this.plugin.innst; }
  get paa() { return !!this.innst.hjelperPaa && !!this.innst.endepunkt; }

  /** Har vi nettopp fått en feil, lar vi det ligge et minutt. */
  get hviler() { return Date.now() - this._feilet < 60000; }

  async kall(system, bruker, frist = 45000) {
    if (!this.paa || this.hviler) return null;

    const styr = new AbortController();
    const klokke = setTimeout(() => styr.abort(), frist);
    try {
      const svar = await requestUrl({
        url: this.innst.endepunkt,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.innst.nokkel ? { Authorization: "Bearer " + this.innst.nokkel } : {}),
        },
        body: JSON.stringify({
          model: this.innst.modell,
          messages: [
            { role: "system", content: system },
            { role: "user", content: bruker },
          ],
          stream: false,
        }),
        throw: false,
      });
      if (svar.status >= 400) throw new Error("status " + svar.status);
      const t = svar.json?.choices?.[0]?.message?.content;
      if (!t) throw new Error("tomt svar");
      this._svarte = Date.now();
      return t;
    } catch (e) {
      this._feilet = Date.now();
      console.log("gong-bu: hjelperen svarte ikke —", e.message);
      return null;
    } finally {
      clearTimeout(klokke);
    }
  }

  /**
   * Retter et fritekstsvar mot notatet ditt.
   *
   * Formatet er med vilje ikke JSON. En liten lokal modell bommer ofte
   * på syntaks, og da mister vi hele svaret. To merkede linjer tåler
   * at det står litt rot rundt.
   */
  async rett(begrep, mittSvar, soesken) {
    const naboer = soesken.slice(0, 6).map((b) => b.navn).join(", ");
    const system =
      "Du retter en students forklaring mot studentens egne notater. "
      + "Vær kort, konkret og vennlig. Skryt ikke uten grunn, men si klart "
      + "hva som sitter. Svar på norsk bokmål.\n\n"
      + "Svar i nøyaktig dette formatet, to linjer, ingenting annet:\n"
      + "RETTING: <to til tre setninger: hva som sitter, og hva som manglet>\n"
      + "BLANDET: <navnet på et nabobegrep studenten har blandet inn, eller - >";

    const bruker =
      `## Begrepet\n${begrep.navn}\n\n`
      + `## Notatet til studenten\nDefinisjon: ${begrep.definisjon}\n`
      + (begrep.hensikt ? `Hensikt: ${begrep.hensikt.slice(0, 600)}\n` : "")
      + (begrep.eksempel ? `Eksempel: ${begrep.eksempel.slice(0, 400)}\n` : "")
      + (naboer ? `\n## Nabobegreper det er lett å blande inn\n${naboer}\n` : "")
      + `\n## Svaret studenten skrev\n${mittSvar}`;

    const raa = await this.kall(system, bruker);
    if (!raa) return null;

    const r = /RETTING:\s*([\s\S]*?)(?:\n\s*BLANDET:|$)/i.exec(raa);
    const b = /BLANDET:\s*(.+)/i.exec(raa);
    const retting = rens(r ? r[1] : raa).trim();
    if (!retting) return null;

    let blandet = b ? rens(b[1]).trim() : "";
    if (/^[-–—]?$|^ingen$|^nei$/i.test(blandet)) blandet = "";
    return { retting, blandet };
  }
}


/* ============================================================
   KORTVALG
   ============================================================ */

/** Velger blant en liste med noe som har .id — begreper eller kort. */
function velgBlant(liste, framdrift) {
  if (!liste.length) return null;
  const forfalte = liste.filter((b) => framdrift.forfalt(b.id));
  const pulje = forfalte.length ? forfalte : liste;

  /* Det som har ligget lengst, først. Urørte teller som eldst. */
  pulje.sort((a, b) => framdrift.for(a.id).neste - framdrift.for(b.id).neste);
  return pulje[Math.floor(Math.random() * Math.min(8, pulje.length))];
}

function begrepskort(indeks) {
  return indeks.begreper.filter((b) => b.definisjon);
}

/**
 * Trekker neste kort etter hvilken bunke som er valgt.
 * «alt» vekter etter hvor mange kort hver bunke har, så du ikke får
 * eksamensoppgaver i ett strekk bare fordi de ligger øverst.
 */
function velgKort(indeks, stokk, framdrift, bunke) {
  const begreper = begrepskort(indeks);
  const laget = stokk.kort;

  if (bunke === "begreper") {
    const b = velgBlant(begreper, framdrift);
    return b && { slag: "begrep", data: b };
  }
  if (bunke === "laget") {
    const k = velgBlant(laget, framdrift);
    return k && { slag: "laget", data: k };
  }

  if (!begreper.length && !laget.length) return null;
  const velgLaget = Math.random() < laget.length / (begreper.length + laget.length);
  const forsok = velgLaget
    ? [["laget", laget], ["begrep", begreper]]
    : [["begrep", begreper], ["laget", laget]];
  for (const [slag, liste] of forsok) {
    const v = velgBlant(liste, framdrift);
    if (v) return { slag, data: v };
  }
  return null;
}

/** Tre forvekslinger: helst søsken, ellers samme gruppe. */
function distraktorer(indeks, fasit, antall = 3) {
  const tatt = new Set([fasit.id]);
  const ut = [];

  const legg = (liste) => {
    for (const b of bland(liste)) {
      if (ut.length >= antall) return;
      if (tatt.has(b.id) || !b.navn) continue;
      tatt.add(b.id); ut.push(b);
    }
  };

  legg(fasit.soesken.map((id) => indeks.hent(id)).filter(Boolean));
  legg(indeks.begreper.filter((b) => b.gruppe === fasit.gruppe));
  legg(indeks.begreper);
  return ut;
}

function bland(a) {
  const ut = a.slice();
  for (let i = ut.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ut[i], ut[j]] = [ut[j], ut[i]];
  }
  return ut;
}


/* ============================================================
   VISNINGEN
   ============================================================ */

class GongbuVisning extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.kort = null;
    this.svart = false;
  }

  getViewType() { return VISNING; }
  getDisplayText() { return "gong-bu"; }
  getIcon() { return "graduation-cap"; }

  async onOpen() {
    this.containerEl.children[1].addClass("gongbu");
    await this.plugin.klar;
    this.nesteKort();
  }

  get bunke() { return this.plugin.framdrift.bunke; }
  get nivaa() { return this.plugin.framdrift.nivaa; }

  nesteKort() {
    /* «Øv på skillet» setter et bestemt begrep som neste kort. */
    if (this.tvunget) {
      this.kort = { slag: "begrep", data: this.tvunget };
      this.tvunget = null;
    } else {
      this.kort = velgKort(this.plugin.indeks, this.plugin.stokk,
        this.plugin.framdrift, this.bunke);
    }
    this.svart = false;
    this.tegn();
  }

  async settBunke(b) {
    await this.plugin.framdrift.settBunke(b);
    this.nesteKort();
  }

  async settNivaa(n) {
    await this.plugin.framdrift.settNivaa(n);
    this.nesteKort();
  }

  tegn() {
    const rot = this.containerEl.children[1];
    rot.empty();

    const { indeks, stokk, framdrift } = this.plugin;

    if (!indeks.begreper.length && !stokk.kort.length) {
      rot.createDiv({ cls: "gongbu-tomt" }).setText(
        `Fant ingen begreper under «${ROT}». Mangler notatene Begrep-feltet i frontmatter?`
      );
      return;
    }

    /* --- topplinje med status --- */
    const alle = [...begrepskort(indeks), ...stokk.kort];
    const tall = { sitter: 0, paavei: 0, urort: 0 };
    for (const b of alle) tall[framdrift.tilstand(b.id)]++;
    const forfalte = alle.filter((b) => framdrift.forfalt(b.id)).length;

    const topp = rot.createDiv({ cls: "gongbu-topp" });
    topp.createSpan({ cls: "gongbu-merke", text: "공부 gong-bu" });
    topp.createSpan({ cls: "gongbu-stat" })
      .setText(`${tall.sitter} sitter · ${tall.paavei} på vei · ${forfalte} forfalt`);

    const stripe = rot.createDiv({ cls: "gongbu-stripe" });
    stripe.createDiv({ cls: "gongbu-stripe-fyll" })
      .style.width = Math.round((tall.sitter / Math.max(1, alle.length)) * 100) + "%";

    /* --- bunkevalg, bare når det finnes mer enn én bunke --- */
    if (stokk.kort.length) {
      const rad = rot.createDiv({ cls: "gongbu-bunker" });
      const valg = [
        ["alt", `Alt ${alle.length}`],
        ["begreper", `Begreper ${begrepskort(indeks).length}`],
        ["laget", `Kort ${stokk.kort.length}`],
      ];
      for (const [id, merke] of valg) {
        const kn = rad.createEl("button", { cls: "gongbu-bunke", text: merke });
        if (this.bunke === id) kn.addClass("gongbu-bunke-paa");
        kn.onclick = () => this.settBunke(id);
      }
    }

    /* --- nivåvalg, bare der det betyr noe --- */
    if (this.bunke !== "laget" && begrepskort(indeks).length) {
      const rad = rot.createDiv({ cls: "gongbu-bunker gongbu-nivaarad" });
      for (const [n, merke] of [[1, "Nivå 1 · kjenne igjen"], [2, "Nivå 2 · forklare"]]) {
        const kn = rad.createEl("button", { cls: "gongbu-bunke", text: merke });
        if (this.nivaa === n) kn.addClass("gongbu-bunke-paa");
        kn.onclick = () => this.settNivaa(n);
      }
    }

    if (!this.kort) {
      rot.createDiv({ cls: "gongbu-tomt" }).setText("Ingen kort i denne bunken ennå.");
      return;
    }

    if (this.kort.slag === "begrep") {
      if (this.nivaa === 2) this.tegnNivaa2(rot, this.kort.data);
      else this.tegnBegrep(rot, this.kort.data);
    } else {
      this.tegnLaget(rot, this.kort.data);
    }

    this.tegnBunn(rot, this.kort.data.sti);
  }

  /* --- nivå 1 på et av dine egne begreper --- */
  tegnBegrep(rot, k) {
    const kortEl = rot.createDiv({ cls: "gongbu-kort" });
    kortEl.createDiv({ cls: "gongbu-etikett", text: "Nivå 01 · hvilket begrep?" });
    kortEl.createDiv({ cls: "gongbu-def", text: k.definisjon });

    const valg = rot.createDiv({ cls: "gongbu-valg" });
    const alternativer = bland([k, ...distraktorer(this.plugin.indeks, k)]);

    alternativer.forEach((alt, i) => {
      const kn = valg.createEl("button", { cls: "gongbu-svar" });
      kn.createSpan({ cls: "gongbu-nr", text: String(i + 1).padStart(2, "0") });
      kn.createSpan({ text: alt.navn });
      kn.onclick = () => this.svarBegrep(alt, kn, valg, k);
    });
  }

  /* --- nivå 2: du forklarer selv, og retter etterpå --- */
  tegnNivaa2(rot, k) {
    const kortEl = rot.createDiv({ cls: "gongbu-kort" });
    kortEl.createDiv({ cls: "gongbu-etikett", text: "Nivå 02 · forklaring" });
    kortEl.createDiv({ cls: "gongbu-sporsmaal", text: `Forklar ${k.navn} med dine egne ord.` });
    kortEl.createDiv({ cls: "gongbu-hint", text: "To–tre setninger holder." });

    const felt = rot.createEl("textarea", { cls: "gongbu-felt" });
    felt.setAttr("placeholder", "Skriv det du husker.");
    felt.focus();

    const vis = rot.createEl("button", { cls: "gongbu-videre", text: "Vis fasit" });
    vis.onclick = () => this.visNivaa2(rot, k, felt.value.trim());
  }

  async visNivaa2(rot, k, mittSvar) {
    if (this.svart) return;
    this.svart = true;
    rot.querySelectorAll(".gongbu-videre").forEach((el) => el.remove());

    /* Notatet ditt først. Det er fasiten, uansett hva en modell måtte mene. */
    const fasit = rot.createDiv({ cls: "gongbu-fasit" });
    fasit.createDiv({ cls: "gongbu-etikett", text: "Fra notatet ditt" });
    fasit.createDiv({ text: k.definisjon });
    if (k.hensikt) {
      fasit.createDiv({ cls: "gongbu-hensikt", text: k.hensikt.split("\n")[0] });
    }

    /* Dommen din er alltid der. Rettingen er et tillegg som kanskje kommer. */
    const dom = rot.createDiv({ cls: "gongbu-dom" });
    for (const [merke, verdi] of [["Satt", "satt"], ["Delvis", "delvis"], ["Bomma", "bomma"]]) {
      dom.createEl("button", { cls: "gongbu-domknapp gongbu-dom-" + verdi, text: merke })
        .onclick = async () => {
          await this.plugin.framdrift.svar(k.id, verdi);
          this.nesteKort();
        };
    }

    if (!mittSvar || !this.plugin.hjelper.paa) return;

    const venter = rot.createDiv({ cls: "gongbu-venter", text: "Hjelperen leser svaret ditt …" });
    const soesken = k.soesken.map((id) => this.plugin.indeks.hent(id)).filter(Boolean);
    const r = await this.plugin.hjelper.rett(k, mittSvar, soesken);
    venter.remove();
    if (!r) return;                      /* stille. Du retter selv, som før. */

    const boks = rot.createDiv({ cls: "gongbu-retting" });
    boks.createDiv({ cls: "gongbu-etikett", text: "Retting" });
    boks.createDiv({ text: r.retting });

    const nabo = r.blandet && this.plugin.indeks.etterNavn.get(r.blandet);
    if (nabo && nabo.id !== k.id) {
      const rad = boks.createDiv({ cls: "gongbu-blandet" });
      rad.createSpan({ text: "Blandet du inn " });
      rad.createEl("strong", { text: nabo.navn });
      rad.createSpan({ text: "? " });
      const lenke = rad.createEl("a", { text: "Øv på skillet →" });
      lenke.onclick = (e) => {
        e.preventDefault();
        this.tvunget = nabo;
        this.plugin.framdrift.settNivaa(1).then(() => this.nesteKort());
      };
    }

    boks.createDiv({ cls: "gongbu-merknad", text:
      "Skrevet av en modell. Notatet ditt over er fasiten." });
  }

  /* --- et generert kort: flervalg eller skriv --- */
  tegnLaget(rot, k) {
    const kortEl = rot.createDiv({ cls: "gongbu-kort" });

    const hode = kortEl.createDiv({ cls: "gongbu-hode" });
    hode.createDiv({ cls: "gongbu-etikett", text: SJANGER[k.sjanger] || "Kort" });
    if (!k.godkjent) {
      hode.createSpan({ cls: "gongbu-ukontrollert", text: "ukontrollert" })
        .setAttr("aria-label", "Laget av en modell, ikke godkjent av deg ennå");
    }

    kortEl.createDiv({ cls: "gongbu-sporsmaal", text: k.sporsmaal });

    if (k.slag === "flervalg") {
      const valg = rot.createDiv({ cls: "gongbu-valg" });
      bland(k.alternativer).forEach((alt, i) => {
        const kn = valg.createEl("button", { cls: "gongbu-svar" });
        kn.createSpan({ cls: "gongbu-nr", text: String(i + 1).padStart(2, "0") });
        kn.createSpan({ text: alt.tekst });
        kn.onclick = () => this.svarFlervalg(alt, kn, valg, k);
      });
    } else {
      /* Skrivekort: du svarer for deg selv, så dømmer du selv. Det er
         hele poenget med en eksamensoppgave — du må se hva du glemte. */
      const felt = rot.createEl("textarea", { cls: "gongbu-felt" });
      felt.setAttr("placeholder", "Skriv svaret ditt, så sammenligner du.");
      felt.focus();

      const vis = rot.createEl("button", { cls: "gongbu-videre", text: "Vis fasit" });
      vis.onclick = () => this.visFasit(rot, k);
    }
  }

  tegnBunn(rot, sti) {
    const bunn = rot.createDiv({ cls: "gongbu-bunn" });
    const kilde = bunn.createEl("a", { cls: "gongbu-kilde", text: sti.split("/").pop() });
    kilde.onclick = (e) => {
      e.preventDefault();
      this.app.workspace.openLinkText(sti, "", true);
    };
    bunn.createEl("button", { cls: "gongbu-stille", text: "Hopp over" })
      .onclick = () => this.nesteKort();
  }

  /* ---------------------------------------------------------- svar */

  laas(beholder) {
    beholder.querySelectorAll(".gongbu-svar").forEach((el) => el.addClass("gongbu-laast"));
  }

  async svarBegrep(valgt, knapp, beholder, k) {
    if (this.svart) return;
    this.svart = true;

    const riktig = valgt.id === k.id;
    this.laas(beholder);
    knapp.addClass(riktig ? "gongbu-rett" : "gongbu-feil");
    if (!riktig) {
      beholder.querySelectorAll(".gongbu-svar").forEach((el) => {
        if (el.textContent.includes(k.navn)) el.addClass("gongbu-rett");
      });
    }

    await this.plugin.framdrift.svar(k.id, riktig ? "satt" : "bomma");

    /* Hensikten er den egentlige belønningen: nå får du vite hvorfor. */
    const rot = this.containerEl.children[1];
    if (k.hensikt) {
      const mer = rot.createDiv({ cls: "gongbu-fasit" });
      mer.createDiv({ cls: "gongbu-etikett", text: "Fra notatet ditt" });
      mer.createDiv({ text: k.hensikt.split("\n")[0] });
    }
    this.videre(rot);
  }

  async svarFlervalg(valgt, knapp, beholder, k) {
    if (this.svart) return;
    this.svart = true;

    this.laas(beholder);
    knapp.addClass(valgt.riktig ? "gongbu-rett" : "gongbu-feil");
    if (!valgt.riktig) {
      const fasit = k.alternativer.find((a) => a.riktig);
      beholder.querySelectorAll(".gongbu-svar").forEach((el) => {
        if (fasit && el.textContent.includes(fasit.tekst)) el.addClass("gongbu-rett");
      });
    }

    await this.plugin.framdrift.svar(k.id, valgt.riktig ? "satt" : "bomma");

    const rot = this.containerEl.children[1];
    if (k.begrunnelse) {
      const mer = rot.createDiv({ cls: "gongbu-fasit" });
      mer.createDiv({ cls: "gongbu-etikett", text: "Hvorfor" });
      mer.createDiv({ text: k.begrunnelse });
    }
    this.minnOmGodkjenning(rot, k);
    this.videre(rot);
  }

  visFasit(rot, k) {
    if (this.svart) return;
    this.svart = true;
    rot.querySelectorAll(".gongbu-videre").forEach((el) => el.remove());

    const mer = rot.createDiv({ cls: "gongbu-fasit" });
    mer.createDiv({ cls: "gongbu-etikett", text: "Fasit" });
    mer.createDiv({ text: k.fasit });
    if (k.kriterier.length) {
      mer.createDiv({ cls: "gongbu-etikett", text: "Sensor ser etter" });
      const liste = mer.createEl("ul", { cls: "gongbu-kriterier" });
      for (const kr of k.kriterier) liste.createEl("li", { text: kr });
    }

    /* Du dømmer selv. En modell kan ikke se om du traff poenget. */
    const dom = rot.createDiv({ cls: "gongbu-dom" });
    for (const [merke, verdi] of [["Satt", "satt"], ["Delvis", "delvis"], ["Bomma", "bomma"]]) {
      dom.createEl("button", { cls: "gongbu-domknapp gongbu-dom-" + verdi, text: merke })
        .onclick = async () => {
          await this.plugin.framdrift.svar(k.id, verdi);
          this.nesteKort();
        };
    }
    this.minnOmGodkjenning(rot, k);
  }

  /** Et ukontrollert kort bør du se på i notatet før du stoler på det. */
  minnOmGodkjenning(rot, k) {
    if (k.godkjent) return;
    const rad = rot.createDiv({ cls: "gongbu-godkjenn" });
    rad.createSpan({ text: "Dette kortet er ikke godkjent. " });
    const lenke = rad.createEl("a", { text: "Åpne og sett «Sjekket: ja»" });
    lenke.onclick = (e) => {
      e.preventDefault();
      this.app.workspace.openLinkText(k.sti, "", true);
    };
  }

  videre(rot) {
    const kn = rot.createEl("button", { cls: "gongbu-videre", text: "Neste kort" });
    kn.onclick = () => this.nesteKort();
    kn.focus();
  }
}


/* ============================================================
   PLUGINEN
   ============================================================ */

/* ============================================================
   INNSTILLINGER
   ============================================================ */

class GongbuInnstillinger extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl: c } = this;
    c.empty();

    c.createEl("p", { cls: "gongbu-innledning", text:
      "Hjelperen er en språkmodell som leser forklaringen din på nivå 2 og "
      + "sier hva du manglet. Den er valgfri: er den av, retter du selv, og "
      + "alt annet i pluginen virker likt." });

    new Setting(c)
      .setName("Hjelper")
      .setDesc("Av som standard. Slå på når du har en modell å snakke med.")
      .addToggle((t) => t
        .setValue(this.plugin.innst.hjelperPaa)
        .onChange(async (v) => { this.plugin.innst.hjelperPaa = v; await this.lagre(); }));

    new Setting(c)
      .setName("Endepunkt")
      .setDesc("Et OpenAI-kompatibelt chat-endepunkt. Ollama lokalt er standard. "
             + "Telefonen når ikke Mac-ens localhost — der trengs en adresse "
             + "begge enhetene deler, for eksempel over Tailscale.")
      .addText((t) => t
        .setPlaceholder(STANDARD.endepunkt)
        .setValue(this.plugin.innst.endepunkt)
        .onChange(async (v) => { this.plugin.innst.endepunkt = v.trim(); await this.lagre(); }));

    new Setting(c)
      .setName("Modell")
      .addText((t) => t
        .setPlaceholder(STANDARD.modell)
        .setValue(this.plugin.innst.modell)
        .onChange(async (v) => { this.plugin.innst.modell = v.trim(); await this.lagre(); }));

    new Setting(c)
      .setName("Nøkkel")
      .setDesc("La stå tom for en lokal modell. Fylles den ut, havner nøkkelen i "
             + "plugin-ens data.json inne i vaulten — og vaulten synkes.")
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("tom for Ollama")
          .setValue(this.plugin.innst.nokkel)
          .onChange(async (v) => { this.plugin.innst.nokkel = v.trim(); await this.lagre(); });
      });

    new Setting(c)
      .setName("Prøv tilkoblingen")
      .setDesc("Sender én kort melding og sier hva som kom tilbake.")
      .addButton((b) => b.setButtonText("Prøv").onClick(async () => {
        b.setButtonText("…").setDisabled(true);
        const foer = this.plugin.innst.hjelperPaa;
        this.plugin.innst.hjelperPaa = true;      /* prøv selv om den er av */
        this.plugin.hjelper._feilet = 0;
        const t0 = Date.now();
        const svar = await this.plugin.hjelper.kall(
          "Svar med nøyaktig ordet: klar", "Si klar.", 30000);
        this.plugin.innst.hjelperPaa = foer;
        b.setButtonText("Prøv").setDisabled(false);
        new Notice(svar
          ? `gong-bu: svar på ${((Date.now() - t0) / 1000).toFixed(1)} s — «${
              svar.trim().slice(0, 40)}»`
          : "gong-bu: ingen kontakt. Kjører modellen, og stemmer adressen?", 8000);
      }));

    c.createEl("h3", { text: "Framdrift" });
    new Setting(c)
      .setName("Nullstill all framdrift")
      .setDesc("Sletter hva som sitter og hva som er forfalt. Notatene dine røres ikke.")
      .addButton((b) => b.setWarning().setButtonText("Nullstill").onClick(async () => {
        await this.plugin.framdrift.nullstill();
        new Notice("gong-bu: framdriften er nullstilt");
      }));
  }

  lagre() { return this.plugin.framdrift.lagre(); }
}


module.exports = class GongbuPlugin extends Plugin {
  async onload() {
    this.indeks = new Indeks(this.app);
    this.stokk = new Kortstokk(this.app);
    this.framdrift = new Framdrift(this);
    this.hjelper = new Hjelper(this);

    this.registerView(VISNING, (leaf) => new GongbuVisning(leaf, this));
    this.addSettingTab(new GongbuInnstillinger(this.app, this));

    this.addRibbonIcon("graduation-cap", "gong-bu", () => this.aapne());
    this.addCommand({ id: "aapne", name: "Åpne gong-bu", callback: () => this.aapne() });
    this.addCommand({
      id: "eksporter", name: "Eksporter til gong-bu.json",
      callback: () => this.eksporter(),
    });
    this.addCommand({
      id: "bygg-indeks", name: "Les begrepene på nytt",
      callback: async () => {
        await this.lesAlt();
        new Notice(`gong-bu: ${this.indeks.begreper.length} begreper, `
          + `${this.stokk.kort.length} kort`);
      },
    });

    /* Første lesing venter til vaulten er ferdig indeksert av Obsidian,
       ellers er metadataCache tom og vi finner ingenting. */
    this.klar = new Promise((løs) => {
      this.app.workspace.onLayoutReady(async () => {
        await this.framdrift.last();
        await this.lesAlt();
        løs();
      });
    });

    /* Endrer du et notat eller legger inn nye kort, er det med neste
       gang et kort trekkes. */
    this.registerEvent(this.app.metadataCache.on("changed", (fil) => {
      if (!(fil instanceof TFile)) return;
      if (fil.path.startsWith(ROT + "/") || fil.path.startsWith(KORTROT + "/")) {
        this.planleggNyLesing();
      }
    }));
  }

  /** Innstillingene bor i framdriftens data.json, så alt lagres ett sted. */
  get innst() { return this.framdrift.innst; }

  /**
   * Skriver hele indeksen til gong-bu.json i rota av vaulten.
   *
   * Dette er den ene fila nettsiden leser. Den ligger i vaulten, så
   * OneDrive tar den med til telefonen av seg selv — og derfra henter
   * du den inn i nettsiden med filvelgeren. Ingenting publiseres.
   *
   * Framdrift er IKKE med. Den eies av den appen du faktisk øver i.
   */
  async eksporter() {
    await this.klar;
    await this.lesAlt();

    const data = {
      versjon: 1,
      laget: new Date().toISOString(),
      vault: this.app.vault.getName(),
      begreper: this.indeks.begreper.map((b) => ({
        id: b.id, navn: b.navn, aliaser: b.aliaser,
        gruppe: b.gruppe, delAv: b.delAv, soesken: b.soesken,
        fag: b.fag, status: b.status,
        definisjon: b.definisjon, hensikt: b.hensikt, eksempel: b.eksempel,
        sti: b.sti,
      })),
      kort: this.stokk.kort.map((k) => ({
        id: k.id, slag: k.slag, sjanger: k.sjanger,
        handlerOm: k.handlerOm, kilde: k.kilde, godkjent: k.godkjent,
        sporsmaal: k.sporsmaal, alternativer: k.alternativer,
        begrunnelse: k.begrunnelse, fasit: k.fasit, kriterier: k.kriterier,
        sti: k.sti,
      })),
    };

    const sti = "gong-bu.json";
    const tekst = JSON.stringify(data, null, 1);
    const fil = this.app.vault.getAbstractFileByPath(sti);
    try {
      if (fil instanceof TFile) await this.app.vault.modify(fil, tekst);
      else await this.app.vault.create(sti, tekst);
    } catch (e) {
      new Notice("gong-bu: fikk ikke skrevet " + sti + " — " + e.message, 8000);
      return;
    }

    new Notice(
      `gong-bu: ${data.begreper.length} begreper og ${data.kort.length} kort `
      + `skrevet til ${sti} (${Math.round(tekst.length / 1024)} kB)`, 7000);
  }

  lesAlt() {
    return Promise.all([this.indeks.bygg(), this.stokk.bygg()]);
  }

  planleggNyLesing() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.lesAlt(), 1500);
  }

  async aapne() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VISNING)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VISNING, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  onunload() { clearTimeout(this._timer); }
};
