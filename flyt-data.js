/* ============================================================
   gong-bu · flyt · dataene

   Nettsiden eier ingen notater. Den får dem av deg: pluginen skriver
   gong-bu.json i vaulten, OneDrive tar fila med til telefonen, og du
   peker på den én gang med «Hent notater». Derfra ligger alt i
   nettleserens egen database og virker offline, også i flymodus.

   Ingenting sendes noe sted. Det finnes ingen tjener å sende til.

   Framdriften eies av denne appen. Pluginen har sin egen, og de to
   snakker ikke sammen — øver du begge steder, divergerer de.

   Bruk:  <script src="flyt-data.js"></script>
          await gongbu.klar()
   ============================================================ */

(function () {
  "use strict";

  var NAVN = "gong-bu";
  var UTGAVE = 1;
  var TRAPP = [0, 1, 3, 7, 16, 35, 75];      /* dager, som i pluginen */

  var db = null;

  /* ---------------------------------------------------------- basen */

  function aapne() {
    return new Promise(function (los, bryt) {
      var b = indexedDB.open(NAVN, UTGAVE);
      b.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains("meta"))      d.createObjectStore("meta");
        if (!d.objectStoreNames.contains("begreper"))  d.createObjectStore("begreper", { keyPath: "id" });
        if (!d.objectStoreNames.contains("kort"))      d.createObjectStore("kort", { keyPath: "id" });
        if (!d.objectStoreNames.contains("framdrift")) d.createObjectStore("framdrift");
      };
      b.onsuccess = function () { los(b.result); };
      b.onerror = function () { bryt(b.error); };
    });
  }

  function butikk(navn, modus) {
    return db.transaction(navn, modus || "readonly").objectStore(navn);
  }

  function be(forespoersel) {
    return new Promise(function (los, bryt) {
      forespoersel.onsuccess = function () { los(forespoersel.result); };
      forespoersel.onerror = function () { bryt(forespoersel.error); };
    });
  }

  function tomt(navn) {
    return be(butikk(navn, "readwrite").clear());
  }

  function leggAlle(navn, rader) {
    var s = butikk(navn, "readwrite");
    return Promise.all(rader.map(function (r) { return be(s.put(r)); }));
  }

  /* ---------------------------------------------------------- import */

  /**
   * Leser gong-bu.json og legger den i basen.
   * Framdriften røres ikke: skriver du nye notater og importerer på
   * nytt, husker appen fortsatt hva som sitter.
   */
  async function importer(fil) {
    var tekst = await fil.text();
    var data;
    try {
      data = JSON.parse(tekst);
    } catch (e) {
      throw new Error("Fila er ikke gyldig JSON. Er det riktig fil?");
    }
    if (!data || !Array.isArray(data.begreper)) {
      throw new Error("Fant ingen begreper i fila. Kjørte du «Eksporter til gong-bu.json» i Obsidian?");
    }

    await tomt("begreper");
    await tomt("kort");
    await leggAlle("begreper", data.begreper);
    await leggAlle("kort", data.kort || []);

    var m = butikk("meta", "readwrite");
    await be(m.put({
      laget: data.laget || null,
      hentet: new Date().toISOString(),
      vault: data.vault || null,
      antallBegreper: data.begreper.length,
      antallKort: (data.kort || []).length,
    }, "kilde"));

    /* Varig lagring, så iOS ikke rydder bort dataene dine. Den kan si
       nei, og da virker alt likevel — det er bare ikke garantert. */
    if (navigator.storage && navigator.storage.persist) {
      try { await navigator.storage.persist(); } catch (e) { /* uviktig */ }
    }

    return { begreper: data.begreper.length, kort: (data.kort || []).length };
  }

  /* ---------------------------------------------------------- lesing */

  function alle(navn) { return be(butikk(navn).getAll()); }
  function meta() { return be(butikk("meta").get("kilde")); }

  /* ------------------------------------------------------ framdrift */

  function tom() { return { trinn: 0, neste: 0, sett: 0, riktig: 0 }; }

  async function framdriftFor(id) {
    var k = await be(butikk("framdrift").get(id));
    return k || tom();
  }

  async function allFramdrift() {
    var s = butikk("framdrift");
    var noekler = await be(s.getAllKeys());
    var verdier = await be(s.getAll());
    var ut = {};
    noekler.forEach(function (n, i) { ut[n] = verdier[i]; });
    return ut;
  }

  /**
   * Treffer du, går kortet opp et trinn. Bommer du, faller det til
   * bunnen og kommer tilbake om ti minutter. «Delvis» holder deg der
   * du er — du kan det nesten, og da hjelper det ikke å starte på nytt.
   */
  async function svar(id, dom) {
    var k = await framdriftFor(id);
    k.sett += 1;
    if (dom === "satt") { k.trinn = Math.min(k.trinn + 1, TRAPP.length - 1); k.riktig += 1; }
    else if (dom === "bomma") { k.trinn = 0; }

    var dager = TRAPP[k.trinn];
    k.neste = Date.now() + (dager === 0 ? 10 * 60 * 1000 : dager * 864e5);
    k.sist = Date.now();
    await be(butikk("framdrift", "readwrite").put(k, id));
    return k;
  }

  function tilstand(k) {
    if (!k || !k.sett) return "urort";
    return k.trinn >= 3 ? "sitter" : "paavei";
  }

  function forfalt(k) { return !k || !k.sett || Date.now() >= k.neste; }

  /* ----------------------------------------------------------- valg */

  function bland(liste) {
    var a = liste.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /**
   * Distraktorer, i prioritert rekkefølge: søsken under samme «Del av»
   * først, så resten av gruppa, så hva som helst. Det er søsknene som
   * gjør kortet vanskelig — det er dem du faktisk forveksler.
   */
  function distraktorer(begreper, fasit, antall) {
    antall = antall || 3;
    var ut = [], sett = {};
    sett[fasit.id] = true;

    function legg(kandidater) {
      bland(kandidater).forEach(function (b) {
        if (ut.length < antall && b && !sett[b.id]) { sett[b.id] = true; ut.push(b); }
      });
    }
    var etterId = {};
    begreper.forEach(function (b) { etterId[b.id] = b; });

    legg((fasit.soesken || []).map(function (id) { return etterId[id]; }).filter(Boolean));
    legg(begreper.filter(function (b) { return b.gruppe === fasit.gruppe; }));
    legg(begreper);
    return ut;
  }

  /** Det som har ligget lengst, først. Urørte teller som eldst. */
  function velg(liste, fram) {
    if (!liste.length) return null;
    var forfalte = liste.filter(function (b) { return forfalt(fram[b.id]); });
    var pulje = forfalte.length ? forfalte : liste;
    pulje.sort(function (a, b) {
      return (fram[a.id] ? fram[a.id].neste : 0) - (fram[b.id] ? fram[b.id].neste : 0);
    });
    return pulje[Math.floor(Math.random() * Math.min(8, pulje.length))];
  }

  /* --------------------------------------------------------- utsiden */

  var klarLoefte = null;

  window.gongbu = {
    TRAPP: TRAPP,

    klar: function () {
      if (!klarLoefte) {
        klarLoefte = aapne().then(function (d) { db = d; return true; });
      }
      return klarLoefte;
    },

    harData: async function () {
      var m = await meta();
      return !!(m && m.antallBegreper);
    },

    meta: meta,
    importer: importer,
    begreper: function () { return alle("begreper"); },
    kort: function () { return alle("kort"); },

    /** Begreper som kan bli kort: de må ha en definisjon å vise. */
    brukbare: async function () {
      var b = await alle("begreper");
      return b.filter(function (x) { return x.definisjon; });
    },

    framdriftFor: framdriftFor,
    allFramdrift: allFramdrift,
    svar: svar,
    tilstand: tilstand,
    forfalt: forfalt,

    velg: velg,
    bland: bland,
    distraktorer: distraktorer,

    /** Tallene til hjem- og oversiktsskjermen. */
    status: async function () {
      var b = await alle("begreper");
      var k = await alle("kort");
      var f = await allFramdrift();
      var alleKort = b.filter(function (x) { return x.definisjon; }).concat(k);
      var t = { sitter: 0, paavei: 0, urort: 0, forfalt: 0, alle: alleKort.length };
      alleKort.forEach(function (x) {
        t[tilstand(f[x.id])] += 1;
        if (forfalt(f[x.id])) t.forfalt += 1;
      });
      return t;
    },

    /** Sletter alt appen har lagret. Notatene dine røres ikke. */
    glem: async function () {
      await tomt("begreper"); await tomt("kort");
      await tomt("framdrift"); await tomt("meta");
    },
  };
})();
