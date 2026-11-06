/* ============================================================
   gong-bu · flyt · scenen

   Atmosfæren bak glasset.

   Forrige utgave tegnet lyset som bånd: streker som strømmet over
   flaten. Det ga striper. Her er det samme lyset gjort om til
   volum — store uskarpe flekker, en myk kuleform, noen bobler og
   en dis langs bunnen. Ingen kanter, ingen linjer, ingenting som
   gjentar seg.

   Reglene for laget, hvis du skal røre det:

     · Ingenting her har en skarp kant. Alt som er en flekk har
       blur, alt som har kontur er en boble med mykt rim.
     · Ingenting beveger seg raskere enn førti sekunder. Går det
       fortere leses det som en animasjon i stedet for som luft.
     · Alt er dekorativt. Skjermene virker uten scenen.

   Lagene, bakfra og fram:

     0  foto      bakgrunnsbildet, og en vask av temaets grunnfarge
                   over det
     1  dis       tre store uskarpe lysflekker som driver
     2  bue       en diger, myk kulekant oppe til høyre
     3  bobler    tre gjennomsiktige kuler med mykt rim
     4  dugg      lysdisen langs nedre kant
     5  skrim     slør som gir tekst øverst noe å stå på
     6  korn      så gradientene ikke ser digitale ut

   Bruk:  <div class="scene"></div>
          <div class="scene" data-form="bred"></div>   (1280 × 800)
          <script src="flyt-scene.js"></script>
   ============================================================ */

(function () {
  "use strict";

  /* Hver flekk: venstre, topp, bredde, høyde, farge, takt.
     Verdiene er i prosent av flaten, så de samme tallene virker
     i begge formatene. */
  var FORM = {
    smal: {
      dis: [
        { x:  26, y: -26, b:  84, h:  54, f: 1, takt: 'a' },   /* glød, oppe til høyre */
        { x: -42, y:  40, b: 100, h:  64, f: 2, takt: 'b' },   /* dyp blå, nede til venstre */
        { x: -16, y:  -2, b:  76, h:  44, f: 3, takt: 'c' }    /* mykner overgangen */
      ],
      bue:    { x: 38, y: -30, d: 104 },
      bobler: [
        { x: 60, y:  3, d: 24, takt: 'b' },
        { x: 14, y: 24, d: 13, takt: 'c' },
        { x: 84, y: 31, d:  9, takt: 'a' }
      ]
    },
    bred: {
      dis: [
        { x:  46, y: -40, b:  62, h:  96, f: 1, takt: 'a' },
        { x: -22, y:  26, b:  74, h:  92, f: 2, takt: 'b' },
        { x:  10, y: -16, b:  58, h:  70, f: 3, takt: 'c' }
      ],
      bue:    { x: 58, y: -46, d: 62 },
      bobler: [
        { x: 70, y: 42, d: 16, takt: 'b' },
        { x: 14, y: 58, d: 10, takt: 'c' },
        { x: 46, y: 72, d:  7, takt: 'a' }
      ]
    }
  };

  function boks(d) {
    return 'left:' + d.x + '%; top:' + d.y + '%; width:' + d.b + '%; height:' + d.h + '%';
  }

  function bygg() {
    var alle = document.querySelectorAll('.scene');
    for (var i = 0; i < alle.length; i++) {
      var hus = alle[i];
      if (hus.childElementCount) continue;
      var f = FORM[hus.dataset.form === 'bred' ? 'bred' : 'smal'];
      var ut = '<div class="foto"></div><div class="vask"></div>';

      for (var j = 0; j < f.dis.length; j++) {
        var d = f.dis[j];
        ut += '<div class="dis dis--' + d.f + ' driv-' + d.takt + '" style="' + boks(d) + '"></div>';
      }

      ut += '<div class="bue driv-a" style="left:' + f.bue.x + '%; top:' + f.bue.y
          + '%; width:' + f.bue.d + '%; aspect-ratio:1"></div>';

      for (var k = 0; k < f.bobler.length; k++) {
        var b = f.bobler[k];
        ut += '<div class="boble driv-' + b.takt + '" style="left:' + b.x + '%; top:' + b.y
            + '%; width:' + b.d + '%; aspect-ratio:1"></div>';
      }

      ut += '<div class="dugg"></div>'
          + '<div class="skrim"></div>'
          + '<div class="korn"></div>';

      hus.innerHTML = ut;
    }
  }

  /* Eksponert så sider som bygger scener etter innlasting — galleriet
     og menysiden — kan be om en ny runde. */
  window.byggScene = bygg;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bygg);
  } else {
    bygg();
  }
})();
