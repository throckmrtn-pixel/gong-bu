/* ============================================================
   gong-bu · flyt · små liv

   To ting som gjør grensesnittet mindre statisk:

     1  tall som teller seg opp når siden åpnes
        <span data-tall="62">62</span>
     2  en ring av lys der fingeren treffer en knapp

   Begge er pynt. Siden fungerer uten.
   ============================================================ */

(function () {
  "use strict";

  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- tall som teller seg opp --------------------------- */
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

  /* --- ring av lys der du trykker ------------------------ */
  function ringPaaTrykk(e) {
    var maal = e.target.closest('.pille, .svar, .valg button, .felle');
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
    document.addEventListener('pointerdown', ringPaaTrykk);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
