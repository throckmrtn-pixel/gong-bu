/* ============================================================
   gong-bu · flyt · nivå 1

   Fyller gjenkjenningskortet med dine ekte begreper. Definisjonen
   står i kortet, og de fire alternativene er fasiten pluss tre
   søsken under samme «Del av» — det er dem du faktisk forveksler.

   Har appen ingen data ennå, bytter skjermen ut kortet med en
   henteluke i stedet for å stå tom og se ødelagt ut.

   Bruk:  <script src="flyt-data.js"></script>
          <script src="flyt-nivaa1.js"></script>
   ============================================================ */

(function () {
  "use strict";

  var el = {};
  var begreper = [];
  var fram = {};
  var naa = null;
  var svart = false;

  function finn() {
    el.def     = document.querySelector("[data-definisjon]");
    el.valg    = document.querySelector("[data-valg]");
    el.kilde   = document.querySelector("[data-kilde]");
    el.teller  = document.querySelector("[data-teller]");
    el.hopp    = document.querySelector("[data-hopp]");
    el.kortEl  = el.def ? el.def.closest(".kort") : null;
    /* Henteluka bytter ut innholdet i kortet, og etter en hensikt er
       det en ekstra linje der. Vi husker den opprinnelige formen og
       setter den tilbake før hvert kort. */
    if (el.kortEl) el.form = el.kortEl.innerHTML;
    return el.def && el.valg;
  }

  function friskKort() {
    if (!el.kortEl || el.form == null) return;
    el.kortEl.innerHTML = el.form;
    el.def = el.kortEl.querySelector("[data-definisjon]");
  }

  /* ---------------------------------------------------- henteluka */

  function visHent(melding) {
    if (el.kortEl) {
      el.kortEl.innerHTML = "";
      var e = document.createElement("p");
      e.className = "etikett";
      e.textContent = "Ingen notater ennå";
      var p = document.createElement("p");
      p.className = "sporsmaal";
      p.textContent = melding || "Kjør «Eksporter til gong-bu.json» i Obsidian, "
        + "så finner du fila her under OneDrive.";
      el.kortEl.append(e, p);
    }

    el.valg.innerHTML = "";
    var knapp = document.createElement("button");
    knapp.type = "button";
    knapp.className = "pille svar";
    knapp.innerHTML = '<span class="nr">↓</span><span>Hent notater</span>';

    var inn = document.createElement("input");
    inn.type = "file";
    inn.accept = ".json,application/json";
    inn.hidden = true;

    knapp.onclick = function () { inn.click(); };
    inn.onchange = async function () {
      if (!inn.files || !inn.files[0]) return;
      knapp.querySelector("span:last-child").textContent = "Leser …";
      try {
        var n = await window.gongbu.importer(inn.files[0]);
        knapp.querySelector("span:last-child").textContent =
          n.begreper + " begreper hentet";
        await start();
      } catch (e) {
        knapp.querySelector("span:last-child").textContent = "Hent notater";
        visHent(e.message);
      }
    };

    el.valg.append(knapp, inn);
    if (el.kilde) el.kilde.textContent = "Fila ligger i vaulten din";
    if (el.teller) el.teller.textContent = "—";
  }

  /* ------------------------------------------------------- kortet */

  function tegn() {
    svart = false;
    naa = window.gongbu.velg(begreper, fram);
    if (!naa) return visHent("Fant ingen begreper med definisjon i fila.");

    friskKort();
    el.def.textContent = naa.definisjon;

    var fasit = naa;
    var alternativer = window.gongbu.bland(
      [fasit].concat(window.gongbu.distraktorer(begreper, fasit, 3)));

    el.valg.innerHTML = "";
    alternativer.forEach(function (b, i) {
      var k = document.createElement("button");
      k.type = "button";
      k.className = "pille svar";
      var nr = document.createElement("span");
      nr.className = "nr";
      nr.textContent = String(i + 1).padStart(2, "0");
      var tekst = document.createElement("span");
      tekst.textContent = b.navn;
      k.append(nr, tekst);
      k.onclick = function () { velg(b, k); };
      el.valg.appendChild(k);
    });

    if (el.kilde) {
      el.kilde.textContent = naa.gruppe + (naa.delAv ? " / " + naa.delAv : "");
    }
    oppdaterTeller();
  }

  async function oppdaterTeller() {
    if (!el.teller) return;
    var s = await window.gongbu.status();
    el.teller.textContent = s.forfalt + " FORFALT";
  }

  async function velg(valgt, knapp) {
    if (svart) return;
    svart = true;

    var riktig = valgt.id === naa.id;
    var alle = el.valg.querySelectorAll(".svar");
    alle.forEach(function (k) { k.classList.add("laast"); k.disabled = true; });
    knapp.classList.add(riktig ? "rett" : "feil");
    if (!riktig) {
      alle.forEach(function (k) {
        if (k.textContent.indexOf(naa.navn) !== -1) k.classList.add("rett");
      });
    }

    fram[naa.id] = await window.gongbu.svar(naa.id, riktig ? "satt" : "bomma");

    /* Hensikten er den egentlige belønningen: nå får du vite hvorfor. */
    if (naa.hensikt && el.kortEl) {
      var mer = document.createElement("p");
      mer.className = "hjelp";
      mer.style.marginTop = "11px";
      mer.textContent = naa.hensikt.split("\n")[0];
      el.kortEl.appendChild(mer);
    }

    var neste = document.createElement("button");
    neste.type = "button";
    neste.className = "pille pille--sterk";
    neste.innerHTML = "<span>NESTE KORT</span>";
    neste.onclick = tegn;
    el.valg.appendChild(neste);
    neste.focus();
  }

  /* -------------------------------------------------------- start */

  async function start() {
    begreper = await window.gongbu.brukbare();
    fram = await window.gongbu.allFramdrift();
    if (!begreper.length) return visHent();
    tegn();
  }

  async function opp() {
    if (!finn()) return;               /* ikke denne skjermen */
    if (el.hopp) el.hopp.onclick = function () { if (!svart) tegn(); };
    await window.gongbu.klar();
    if (await window.gongbu.harData()) await start();
    else visHent();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", opp);
  else opp();
})();
