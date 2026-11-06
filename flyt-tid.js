/* ============================================================
   gong-bu · flyt · tiden på døgnet

   Temaet følger klokka. Appen er laget for eksamenslesing, og
   den lesingen skjer både klokka ti om formiddagen og klokka ett
   om natta — det er to ganske ulike lysforhold å se på en skjerm i.

     07–15   klar   dagslys
     15–20   staal  ettermiddag og skumring
     20–07   natt

   Grensene er satt etter norsk november, ikke etter et døgn ved
   ekvator: her er det mørkt før fire om ettermiddagen, og en app
   som fortsatt står i dagslysmodus da er ubehagelig å lese i.

   Skjermen må be om dette selv, med data-tema-auto. Galleriet,
   prototypen og menysiden gjør det ikke — der skal man kunne
   studere alle tre temaene uansett hva klokka er.
   ============================================================ */

(function () {
  "use strict";

  var FARGE = { klar: '#C3D8EF', staal: '#3C5473', natt: '#141E2E' };

  function temaNa(time) {
    if (time >= 7  && time < 15) return 'klar';
    if (time >= 15 && time < 20) return 'staal';
    return 'natt';
  }

  function sett() {
    var skjermer = document.querySelectorAll('.skjerm[data-tema-auto]');
    if (!skjermer.length) return;

    var tema = temaNa(new Date().getHours());
    for (var i = 0; i < skjermer.length; i++) {
      /* Har noen alt valgt tema manuelt i denne økta — prototypen
         sender det inn utenfra — skal ikke klokka overstyre det. */
      if (skjermer[i].dataset.temaLaast !== undefined) continue;
      skjermer[i].dataset.tema = tema;
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && FARGE[tema]) meta.setAttribute('content', FARGE[tema]);
  }

  sett();

  /* En økt som ligger åpen over et skifte skal følge med. Vi sjekker
     når fanen kommer fram igjen, og ellers én gang i kvarteret — en
     overgang er aldri mer enn et kvarter unna å bli riktig. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) sett();
  });
  setInterval(sett, 15 * 60 * 1000);

  /* Prototypen bytter tema utenfra; da låser vi klokka ute. */
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.tema) return;
    var alle = document.querySelectorAll('.skjerm');
    for (var i = 0; i < alle.length; i++) alle[i].dataset.temaLaast = '';
  });
})();
