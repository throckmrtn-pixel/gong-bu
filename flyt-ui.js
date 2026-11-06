/* ============================================================
   gong-bu · flyt · små liv

   Fire ting som gjør grensesnittet mindre statisk:

     1  tall som teller seg opp når siden åpnes
        <span data-tall="62">62</span>
     2  inngangen — blokkene legger seg på plass når de kommer
        til syne, forskjøvet nedenfra og med forsinkelse i rekka
     3  dybden — scenen beveger seg saktere enn innholdet når du
        ruller
     4  en ring av lys der fingeren treffer en knapp

   Alt er pynt. Siden fungerer uten, og alt er slått av under
   prefers-reduced-motion.
   ============================================================ */

(function () {
  "use strict";

  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1 · tall som teller seg opp ---------- */
  function tell() {
    var alle = document.querySelectorAll('[data-tall]');
    for (var i = 0; i < alle.length; i++) {
      (function (el) {
        var maal = parseFloat(el.dataset.tall);
        if (isNaN(maal)) return;
        if (rolig) { el.textContent = maal; return; }
        var start = performance.now();
        var tid = 900;
        function steg(na) {
          var p = Math.min(1, (na - start) / tid);
          var e = 1 - Math.pow(1 - p, 3);          /* roer ned mot slutten */
          el.textContent = Math.round(maal * e);
          if (p < 1) requestAnimationFrame(steg);
        }
        el.textContent = '0';
        requestAnimationFrame(steg);
      })(alle[i]);
    }
  }

  /* ---------- 2 · inngangen ----------
     Blokkene får .inne når de er i ferd med å komme til syne.
     Forsinkelsen settes per element og nullstilles når elementet
     er inne, slik at en blokk du ruller tilbake til ikke venter
     på nytt.

     Terskelen er -12 % nedenfra: blokken begynner å legge seg på
     plass mens den fortsatt er like under kanten, så den er ferdig
     omtrent når du ser hele den. Venter du til den er inne i
     bildet, rekker du å se den tomme plassen først. */
  function inngang() {
    var skjerm = document.querySelector('.skjerm');
    if (!skjerm || rolig || !('IntersectionObserver' in window)) return;

    var blokker = skjerm.querySelectorAll(
      '.topp, .toppbar, .seksjon, .telemetri, .sokkel, .fyll');
    if (!blokker.length) return;

    /* Først når vi vet at vi faktisk kan animere. Settes attributtet
       før dette, står siden tom hvis noe under feiler. */
    skjerm.dataset.liv = '';

    var teller = 0;
    var sisteTid = 0;

    var kikker = new IntersectionObserver(function (hendelser) {
      for (var i = 0; i < hendelser.length; i++) {
        var h = hendelser[i];
        if (!h.isIntersecting) continue;
        var el = h.target;

        /* Alt som kommer til syne i samme pust stables etter
           hverandre; en ny pust starter forfra. */
        var na = performance.now();
        if (na - sisteTid > 240) teller = 0;
        sisteTid = na;

        el.style.setProperty('--vent', (teller * 70) + 'ms');
        teller++;

        el.classList.add('inne');
        /* Forsinkelsen er brukt opp. Fjernes den ikke, arver kortene
           inni den ved neste overgang. */
        setTimeout(function (e) {
          return function () { e.style.removeProperty('--vent'); };
        }(el), 900);

        kikker.unobserve(el);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

    for (var j = 0; j < blokker.length; j++) kikker.observe(blokker[j]);
  }

  /* ---------- 3 · dybden ----------
     Rullehøyden legges på .skjerm som --rull, og stilarket bruker
     den til å flytte lagene i scenen i ulik takt. Verdien skrives
     i en animasjonsramme og ikke i selve hendelsen, ellers kan
     nettleseren bli bedt om å regne om layout for hvert hakk. */
  function dybde() {
    var skjerm = document.querySelector('.skjerm');
    var rull = document.querySelector('.rull');
    if (!skjerm || !rull || rolig) return;

    var venter = false;
    rull.addEventListener('scroll', function () {
      if (venter) return;
      venter = true;
      requestAnimationFrame(function () {
        skjerm.style.setProperty('--rull', rull.scrollTop);
        venter = false;
      });
    }, { passive: true });
  }

  /* ---------- 4 · lyset samler seg der du står ----------
     Midten av den aktive fanen, som prosent av kapselen, legges på
     menyen som --pille-x. Stilarket bruker den til å plassere både
     lysflekken på glassfasen og pølen under — så kapselen lyser der
     du er, i stedet for alltid på midten.

     Måles på nytt når vinduet endrer seg, fordi kapselen har fast
     bredde og innholdet kan flytte seg inni den. */
  function lysetFolger() {
    var tab = document.querySelector('.tab');
    if (!tab) return;

    function maal() {
      var aktiv = tab.querySelector('a[aria-current="page"]');
      if (!aktiv) return;
      var t = tab.getBoundingClientRect();
      var a = aktiv.getBoundingClientRect();
      if (!t.width) return;
      var x = ((a.left + a.width / 2) - t.left) / t.width * 100;
      tab.style.setProperty('--pille-x', x.toFixed(1) + '%');
    }

    maal();
    /* Etikettene utvider seg, så målingen må tas igjen når den
       overgangen er ferdig. */
    setTimeout(maal, 400);
    window.addEventListener('resize', maal);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(maal);
  }

  /* ---------- 5 · ring av lys der du trykker ---------- */
  function ringPaaTrykk(e) {
    var maal = e.target.closest('.pille, .svar, .valg button, .felle, .flisknapp, .tab a');
    if (!maal || rolig) return;
    var r = maal.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 2;
    var ring = document.createElement('span');
    ring.className = 'ring';
    ring.style.width = ring.style.height = d + 'px';
    ring.style.left = (e.clientX - r.left) + 'px';
    ring.style.top = (e.clientY - r.top) + 'px';
    if (getComputedStyle(maal).position === 'static') maal.style.position = 'relative';
    maal.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 650);
  }

  function start() {
    tell();
    inngang();
    dybde();
    lysetFolger();
    document.addEventListener('pointerdown', ringPaaTrykk);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
