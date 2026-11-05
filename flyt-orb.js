/* ============================================================
   gong-bu · flyt · orben

   Tegnet, ikke hentet fra bilde. Derfor skalerer den fritt, arver
   fargene fra temaet, og kan reagere på hva som skjer.

   Bruk:  <div class="orb" data-sinn="rolig"></div>
          <script src="flyt-orb.js"></script>

   Tilstander (data-sinn):
     rolig   puster langsomt, venter
     jobber  raskere puls, ringen løper
     hviler  dempet, øynene halvlukket
     ferdig  blusser opp

   Lagrekkefølge, bakfra og fram: glorie → bakre halvdel av begge
   ringene → kula → fremre halvdel av ringene → krusninger i vannet.
   Ringene krysser hverandre fordi de ligger i ulik vinkel; det er
   det som gir dybde.

   Merk: SVG-en har egne id-er i <defs>. Skal du ha to orber på
   samme side, må id-ene gjøres unike per forekomst.
   ============================================================ */

(function () {
  "use strict";

  var SVG = [
'<svg viewBox="0 0 240 240">',
'  <defs>',
'    <radialGradient id="halo">',
'      <stop offset="0"   stop-color="var(--orb-glod)" stop-opacity=".85"/>',
'      <stop offset=".45" stop-color="var(--orb-glod)" stop-opacity=".35"/>',
'      <stop offset="1"   stop-color="var(--orb-glod)" stop-opacity="0"/>',
'    </radialGradient>',
'    <radialGradient id="kuleFyll" cx=".36" cy=".3" r=".86">',
'      <stop offset="0"   stop-color="var(--orb-kjerne)"/>',
'      <stop offset=".34" stop-color="var(--orb-fyll)"/>',
'      <stop offset=".82" stop-color="var(--orb-rim)"/>',
'      <stop offset="1"   stop-color="var(--orb-rim)"/>',
'    </radialGradient>',
'    <linearGradient id="rimlys" x1="0" y1="1" x2=".4" y2="0">',
'      <stop offset="0"   stop-color="var(--orb-kjerne)" stop-opacity=".95"/>',
'      <stop offset=".45" stop-color="var(--orb-kjerne)" stop-opacity=".18"/>',
'      <stop offset="1"   stop-color="var(--orb-kjerne)" stop-opacity=".7"/>',
'    </linearGradient>',
'    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0.4">',
'      <stop offset="0"   stop-color="var(--orb-glod)" stop-opacity=".2"/>',
'      <stop offset=".18" stop-color="var(--orb-glod)" stop-opacity=".9"/>',
'      <stop offset=".5"  stop-color="var(--orb-kjerne)"/>',
'      <stop offset=".82" stop-color="var(--orb-fyll)" stop-opacity=".9"/>',
'      <stop offset="1"   stop-color="var(--orb-fyll)" stop-opacity=".2"/>',
'    </linearGradient>',
'    <linearGradient id="ringGrad2" x1="1" y1="0" x2="0" y2="0.5">',
'      <stop offset="0"   stop-color="var(--frynse-1)" stop-opacity="0"/>',
'      <stop offset=".3"  stop-color="var(--frynse-1)" stop-opacity=".75"/>',
'      <stop offset=".62" stop-color="var(--orb-kjerne)" stop-opacity=".9"/>',
'      <stop offset="1"   stop-color="var(--frynse-2)" stop-opacity="0"/>',
'    </linearGradient>',
'    <filter id="oyeglod" x="-200%" y="-120%" width="500%" height="340%">',
'      <feGaussianBlur stdDeviation="2.6" result="b"/>',
'      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>',
'    </filter>',
'    <filter id="mykt" x="-60%" y="-60%" width="220%" height="220%">',
'      <feGaussianBlur stdDeviation="5"/>',
'    </filter>',
'    <clipPath id="nedre"><rect x="2" y="118" width="236" height="52"/></clipPath>',
'    <clipPath id="nedre2"><rect x="2" y="118" width="236" height="46"/></clipPath>',
'  </defs>',

'  <circle class="halo" cx="120" cy="118" r="76" fill="url(#halo)"/>',

'  <!-- bakre halvdel av begge ringene -->',
'  <g transform="rotate(24 120 118)">',
'    <ellipse cx="120" cy="118" rx="84" ry="19" fill="none"',
'             stroke="url(#ringGrad2)" stroke-width="1.6" opacity=".6"/>',
'  </g>',
'  <g transform="rotate(-16 120 118)">',
'    <ellipse cx="120" cy="118" rx="94" ry="28" fill="none"',
'             stroke="url(#ringGrad)" stroke-width="2.4" opacity=".8"/>',
'    <ellipse class="ringlys" cx="120" cy="118" rx="94" ry="28" fill="none"',
'             stroke="var(--band-kjerne)" stroke-width="3" stroke-linecap="round"',
'             stroke-dasharray="30 382" opacity=".5"/>',
'  </g>',

'  <g class="kule">',
'    <circle cx="120" cy="118" r="52" fill="url(#kuleFyll)"/>',
'    <circle cx="120" cy="118" r="51.2" fill="none" stroke="url(#rimlys)" stroke-width="1.6"/>',
'    <ellipse cx="101" cy="96" rx="19" ry="13" fill="var(--orb-kjerne)" opacity=".5"',
'             transform="rotate(-28 101 96)" filter="url(#mykt)"/>',
'    <g filter="url(#oyeglod)">',
'      <rect class="oye" x="105" y="108" width="4.6" height="19" rx="2.3" fill="var(--orb-oye)"/>',
'      <rect class="oye" x="130.4" y="108" width="4.6" height="19" rx="2.3" fill="var(--orb-oye)"/>',
'    </g>',
'  </g>',

'  <!-- fremre halvdel av begge ringene -->',
'  <g transform="rotate(-16 120 118)">',
'    <ellipse clip-path="url(#nedre)" cx="120" cy="118" rx="94" ry="28" fill="none"',
'             stroke="url(#ringGrad)" stroke-width="2.6"/>',
'    <ellipse class="ringlys" clip-path="url(#nedre)" cx="120" cy="118" rx="94" ry="28" fill="none"',
'             stroke="var(--band-kjerne)" stroke-width="3.4" stroke-linecap="round"',
'             stroke-dasharray="30 382"/>',
'  </g>',
'  <g transform="rotate(24 120 118)">',
'    <ellipse clip-path="url(#nedre2)" cx="120" cy="118" rx="84" ry="19" fill="none"',
'             stroke="url(#ringGrad2)" stroke-width="1.8" opacity=".9"/>',
'  </g>',

'  <!-- krusningene i vannet under -->',
'  <g class="krus">',
'    <ellipse cx="120" cy="200" rx="40" ry="6"  fill="none" stroke="var(--band-kjerne)" stroke-width="1.4" opacity=".55"/>',
'    <ellipse cx="120" cy="206" rx="62" ry="9"  fill="none" stroke="var(--band-kjerne)" stroke-width="1.1" opacity=".34"/>',
'    <ellipse cx="120" cy="213" rx="84" ry="12" fill="none" stroke="var(--band-kjerne)" stroke-width="0.9" opacity=".18"/>',
'  </g>',
'  <ellipse class="speiling" cx="120" cy="204" rx="58" ry="9" fill="url(#halo)" filter="url(#mykt)"/>',
'</svg>'
  ].join("\n");

  function bygg() {
    var alle = document.querySelectorAll('.orb');
    for (var i = 0; i < alle.length; i++) {
      if (!alle[i].childElementCount) alle[i].innerHTML = SVG;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bygg);
  } else {
    bygg();
  }
})();
