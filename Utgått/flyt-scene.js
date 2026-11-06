/* ============================================================
   gong-bu · flyt · scenen

   Bakgrunnen er et foto — det strømmende lyset Ida fant — lagt
   under tre lag: en flat demping som gjør teksten lesbar, en
   gradient på toppen der overskriftene står, og et korn som tar
   bort det digitale preget.

   Hvilket foto som brukes styres av temaet, gjennom --bakgrunn i
   flyt.css. Fotoet driver umerkelig, så flaten aldri står helt
   stille.

   Bruk:  <div class="scene"></div>
          <div class="scene" data-form="bred"></div>   (bredt utsnitt)
          <script src="flyt-scene.js"></script>
   ============================================================ */

(function () {
  "use strict";

  var LAG = '<div class="foto"></div><div class="skrim"></div><div class="korn"></div>';

  function bygg() {
    var alle = document.querySelectorAll('.scene');
    for (var i = 0; i < alle.length; i++) {
      if (!alle[i].childElementCount) alle[i].innerHTML = LAG;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bygg);
  else bygg();
})();
