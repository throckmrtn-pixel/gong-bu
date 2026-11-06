/* ============================================================
   gong-bu · flyt · utseende

   Bakgrunnsbildet og temaet var attributter i markupen, som måtte
   endres i ti filer for å bytte. Her er de et valg i appen i
   stedet, lagret på enheten og brukt på alle skjermene.

   To ting styres:

     bak    hvilket motiv som ligger bakerst i scenen
     tema   «auto» lar klokka bestemme (se flyt-tid.js); ellers
            står temaet fast til du endrer det

   Dette skriptet må lastes FØR flyt-tid.js. Velger du et fast
   tema setter vi data-tema-laast, og det er det flagget flyt-tid
   ser etter for å la være å overstyre.
   ============================================================ */

(function () {
  "use strict";

  var MOTIV = [
    { id: 'ror',    navn: 'Rør',    bilde: 'bakgrunn-natt.webp', lys: 'bakgrunn-dag.webp' },
    { id: 'blomst', navn: 'Blomst', bilde: 'blomst-natt.webp',   lys: 'blomst-dag.webp'   }
  ];

  var TEMA = [
    { id: 'auto',  navn: 'Auto' },
    { id: 'klar',  navn: 'Klar' },
    { id: 'staal', navn: 'Stål' },
    { id: 'natt',  navn: 'Natt' }
  ];

  /* localStorage kan være avslått eller blokkert. Utseendet er ikke
     viktig nok til å velte siden hvis det ikke går. */
  function les(n, standard) {
    try { return localStorage.getItem('gongbu:' + n) || standard; }
    catch (e) { return standard; }
  }
  function skriv(n, v) {
    try { localStorage.setItem('gongbu:' + n, v); } catch (e) { /* lever uten */ }
  }

  var skjerm = document.querySelector('.skjerm');
  if (!skjerm) return;

  /* ---------- bruk det som er lagret ---------- */
  function bruk() {
    var bak  = les('bak', skjerm.dataset.bak || 'ror');
    var tema = les('tema', 'auto');

    skjerm.dataset.bak = bak;

    if (tema === 'auto') {
      delete skjerm.dataset.temaLaast;
    } else {
      skjerm.dataset.temaLaast = '';
      skjerm.dataset.tema = tema;
    }
    return { bak: bak, tema: tema };
  }

  var na = bruk();

  /* ---------- arket ---------- */
  var bunn, ark;

  function bygg() {
    bunn = document.createElement('div');
    bunn.className = 'arkbunn';
    bunn.dataset.apen = 'false';

    ark = document.createElement('div');
    ark.className = 'ark';
    ark.setAttribute('role', 'dialog');
    ark.setAttribute('aria-modal', 'true');
    ark.setAttribute('aria-label', 'Utseende');
    ark.innerHTML =
        '<div class="haandtak" aria-hidden="true"></div>'
      + '<h2>Utseende</h2>'
      + '<p class="hjelp">Gjelder alle skjermene, og huskes på denne enheten.</p>'

      + '<div class="gruppe">'
      +   '<span class="etikett">Bakgrunn</span>'
      +   '<div class="bildevalg">'
      +     MOTIV.map(function (m) {
              return '<button type="button" data-bak="' + m.id + '" aria-pressed="false">'
                   + '<span>' + m.navn + '</span></button>';
            }).join('')
      +   '</div>'
      + '</div>'

      + '<div class="gruppe">'
      +   '<span class="etikett">Tema</span>'
      +   '<div class="temavalg">'
      +     TEMA.map(function (t) {
              return '<button type="button" data-tema="' + t.id + '" aria-pressed="false">'
                   + t.navn + '</button>';
            }).join('')
      +   '</div>'
      +   '<p class="hjelp" style="margin-top:10px">Auto følger klokka: lyst på dagen, stål om ettermiddagen, mørkt om kvelden.</p>'
      + '</div>'

      /* Ikke .sokkel her. Inngangsanimasjonen skjuler .sokkel, .seksjon
         og .topp til observatøren har sett dem, og arket bygges lenge
         etter at den har kjørt — en .sokkel her ville stått på
         opacity 0 for alltid. Det gjelder alt som settes inn med
         skript: hold deg unna de klassene. */
      + '<div style="margin-top:22px">'
      +   '<button type="button" class="pille pille--stor pille--lys" data-lukk><span>Ferdig</span></button>'
      + '</div>';

    skjerm.appendChild(bunn);
    skjerm.appendChild(ark);

    /* Forhåndsvisningene viser motivet slik det er i det temaet du
       står i nå — ellers ville du valgt mellom to bilder du ikke
       får se. */
    tegnBilder();
    merk();

    bunn.addEventListener('click', function () { apne(false); });
    ark.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-lukk')) { apne(false); return; }
      if (b.dataset.bak)  { skriv('bak', b.dataset.bak); }
      if (b.dataset.tema) { skriv('tema', b.dataset.tema); }
      na = bruk();
      /* Et fast tema endrer hvilken utgave av motivet som vises. */
      tegnBilder();
      merk();
    });
  }

  function tegnBilder() {
    var lystTema = skjerm.dataset.tema === 'klar' || skjerm.dataset.tema === 'lys';
    Array.prototype.forEach.call(ark.querySelectorAll('.bildevalg button'), function (b) {
      var m = MOTIV.filter(function (x) { return x.id === b.dataset.bak; })[0];
      b.style.backgroundImage = 'url("' + (lystTema ? m.lys : m.bilde) + '")';
    });
  }

  function merk() {
    Array.prototype.forEach.call(ark.querySelectorAll('button[data-bak]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.bak === na.bak));
    });
    Array.prototype.forEach.call(ark.querySelectorAll('button[data-tema]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.tema === na.tema));
    });
  }

  function apne(pa) {
    if (!ark) bygg();
    bunn.dataset.apen = String(pa);
    ark.dataset.apen = String(pa);
    if (pa) { merk(); tegnBilder(); }
  }

  /* «···» i toppbaren åpner arket. Finnes den ikke på denne
     skjermen, gjør skriptet bare jobben sin med å bruke det
     lagrede utseendet. */
  var knapper = document.querySelectorAll('.mer, [data-utseende]');
  for (var i = 0; i < knapper.length; i++) {
    knapper[i].setAttribute('aria-label', 'Utseende');
    knapper[i].addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      apne(true);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ark && ark.dataset.apen === 'true') apne(false);
  });
})();
