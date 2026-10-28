// Fuchs "Fritz" (Begleiter aus der Hof-Farm 2.0) als eigenes kleines Modul fuer die Lern-App (28.10.2026, A1):
// dieselbe Zeichnung wie FarmStil.fuchs (farm-stil.js), aber ohne den grossen Farm-Stil (Schriften/Icons) zu laden.
// Fritz.svg(pose, px) -> HTML-String; pose: neutral | zeigt | jubelt | gruebelt.
const Fritz = (function () {
  const F = { ink: '#0A0D26', fell: '#F7862E', fellHell: '#FFA65A', braun: '#4A1A04', weiss: '#FFF4E6', ohr: '#3A1A10', pfote: '#3A1A10',
    kappe: '#2FB34A', kappeD: '#0F4A16', schirm: '#1F8E36', knopf: '#FFD23A', auge: '#1A1030', mund: '#8A1424', zunge: '#F2606E' };
  let fuchsNr = 0;
  // Arm: kraeftiger Fell-Strang mit dunkler "Socke" als Pfote (Fuchs-typisch), Pfote nur so breit wie der Arm
  function arm(d, pfX, pfY, r) {
    r = Math.min(r, 7.2);
    return '<path d="' + d + '" stroke="' + F.ink + '" stroke-width="17" fill="none" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="' + F.fell + '" stroke-width="10.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="' + pfX + '" cy="' + pfY + '" r="' + r + '" fill="' + F.pfote + '" stroke="' + F.ink + '" stroke-width="3"/>' +
      '<ellipse cx="' + (pfX - r * 0.3) + '" cy="' + (pfY - r * 0.38) + '" rx="' + (r * 0.42) + '" ry="' + (r * 0.22) + '" fill="#fff" opacity=".4" transform="rotate(-30 ' + (pfX - r * 0.3) + ' ' + (pfY - r * 0.38) + ')"/>';
  }
  function funkeln(x, y, s) {
    return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + s * 0.28) + ' ' + (y - s * 0.28) + ' L' + (x + s) + ' ' + y + ' L' + (x + s * 0.28) + ' ' + (y + s * 0.28) + ' L' + x + ' ' + (y + s) +
      ' L' + (x - s * 0.28) + ' ' + (y + s * 0.28) + ' L' + (x - s) + ' ' + y + ' L' + (x - s * 0.28) + ' ' + (y - s * 0.28) + ' Z" fill="#FFE14D" stroke="' + F.ink + '" stroke-width="1.6" stroke-linejoin="round"/>';
  }
  // Augen (100er-Kopfraster). blick: Versatz der Pupillen; lid: 0..1 Oberlid
  function augen(pose) {
    const a = function (cx, cy, rx, ry) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + F.auge + '"/>' +
        '<circle cx="' + (cx + 1.8) + '" cy="' + (cy - 2.6) + '" r="2.3" fill="#fff"/><circle cx="' + (cx - 2) + '" cy="' + (cy + 3) + '" r="1" fill="#fff" opacity=".7"/>';
    };
    const lid = function (cx, cy, tief) { // Oberlid in Fellfarbe + Lidstrich
      return '<path d="M' + (cx - 8) + ' ' + (cy - 9) + ' H' + (cx + 8) + ' V' + (cy - 9 + tief) + ' Q' + cx + ' ' + (cy - 15 + tief) + ' ' + (cx - 8) + ' ' + (cy - 9 + tief) + ' Z" fill="' + F.fell + '"/>' +
        '<path d="M' + (cx - 7.2) + ' ' + (cy - 9 + tief) + ' Q' + cx + ' ' + (cy - 15.2 + tief) + ' ' + (cx + 7.2) + ' ' + (cy - 9 + tief) + '" stroke="' + F.braun + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    };
    const brau = function (d) { return '<path d="' + d + '" stroke="' + F.braun + '" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };
    if (pose === 'jubelt') {
      return '<path d="M29 55 Q36 44.5 43 55" stroke="' + F.auge + '" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M57 55 Q64 44.5 71 55" stroke="' + F.auge + '" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
        brau('M28.5 39 Q35 34.5 42 38') + brau('M71.5 39 Q65 34.5 58 38');
    }
    if (pose === 'zeigt') {
      return a(38, 52.5, 6, 7.4) + a(66, 52.5, 6, 7.4) + lid(38, 52.5, 1.5) + lid(66, 52.5, 1.5) +
        brau('M29 40.5 L43 42') + brau('M71 39 L57 42.5');
    }
    if (pose === 'gruebelt') {
      return a(34, 50.5, 5.8, 7.2) + a(62, 50.5, 5.8, 7.2) + lid(34.5, 52, 2) + lid(62.5, 52, 5.5) +
        brau('M27 39.5 Q34 32.5 42 37') + brau('M72 44.5 L57.5 44.5');
    }
    // neutral: selbstsicher, halb geschlossene Lider
    return a(36, 52.5, 6, 7.4) + a(64, 52.5, 6, 7.4) + lid(36, 52.5, 3.8) + lid(64, 52.5, 3.8) +
      brau('M27.5 42.5 L42 45') + brau('M72.5 42.5 L58 45');
  }
  function mund(pose) {
    const nase = '<path d="M44 65.5 C44 61.5 56 61.5 56 65.5 C56 68.5 52 70.5 50 70.5 C48 70.5 44 68.5 44 65.5 Z" fill="' + F.auge + '"/><ellipse cx="48" cy="64" rx="2.2" ry="1.1" fill="#fff" opacity=".7"/>';
    if (pose === 'jubelt') {
      return nase + '<path d="M36.5 71.5 C38 89 62 89 63.5 71.5 C55 75 45 75 36.5 71.5 Z" fill="' + F.mund + '" stroke="' + F.braun + '" stroke-width="2.8" stroke-linejoin="round"/>' +
        '<path d="M39.5 73.4 C46 75.6 54 75.6 60.5 73.4 L59.8 76.6 C53.5 78.4 46.5 78.4 40.2 76.6 Z" fill="#fff"/>' +
        '<path d="M43 82.5 C46 78 54 78 57 82.5 C54 86.5 46 86.5 43 82.5 Z" fill="' + F.zunge + '"/>';
    }
    if (pose === 'zeigt') {
      return nase + '<path d="M40 72.5 C42.5 83.5 57.5 83.5 61 71.5 C54 74.5 47 74.5 40 72.5 Z" fill="' + F.mund + '" stroke="' + F.braun + '" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<path d="M42.4 73.6 C48 75.4 54 75.2 59.2 73 L58.6 75.8 C53.6 77.4 47.6 77.6 43 76.2 Z" fill="#fff"/>' +
        '<path d="M46.5 80.4 C48.5 77.6 54 77.6 55.8 79.8 C53.6 82.4 48.6 82.6 46.5 80.4 Z" fill="' + F.zunge + '"/>';
    }
    if (pose === 'gruebelt') {
      return nase + '<path d="M43 77 Q46.5 74.5 50 76.5 T57.5 75" stroke="' + F.braun + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    // neutral: schiefes, freches Grinsen
    return nase + '<path d="M41.5 74.5 C47 80 55 79.5 60.5 71.5" stroke="' + F.braun + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M60.5 71.5 L63 70.6" stroke="' + F.braun + '" stroke-width="2.6" stroke-linecap="round"/>';
  }
  function kopf(pose) {
    const kontur = ' stroke="' + F.ink + '" stroke-width="4" stroke-linejoin="round"';
    let s = '';
    // Ohren
    s += '<path d="M17 45 L26 6 L47 30 Z" fill="' + F.fell + '"' + kontur + '/><path d="M24.5 35 L27.8 16.5 L38.5 29 Z" fill="' + F.ohr + '"/>';
    s += '<path d="M83 45 L74 6 L53 30 Z" fill="' + F.fell + '"' + kontur + '/><path d="M75.5 35 L72.2 16.5 L61.5 29 Z" fill="' + F.ohr + '"/>';
    // Kopf mit spitzen Wangen
    s += '<path d="M50 24 C70 24 85 35 87 52 L98 60.5 L81.5 66.5 C75 81 63 90 50 92 C37 90 25 81 18.5 66.5 L2 60.5 L13 52 C15 35 30 24 50 24 Z" fill="' + F.fell + '"' + kontur + '/>';
    // Schnauze hell
    s += '<path d="M50 59.5 C60 56.5 72 60.5 81 66 C75 80.5 63 89.5 50 91.5 C37 89.5 25 80.5 19 66 C28 60.5 40 56.5 50 59.5 Z" fill="' + F.weiss + '"/>';
    s += '<path d="M50 30 C56 36 57 46 50 52 C43 46 44 36 50 30 Z" fill="' + F.fellHell + '" opacity=".85"/>';
    if (pose === 'jubelt') s += '<ellipse cx="24" cy="66" rx="5.5" ry="3.2" fill="#FF6B5A" opacity=".55"/><ellipse cx="76" cy="66" rx="5.5" ry="3.2" fill="#FF6B5A" opacity=".55"/>';
    s += augen(pose) + mund(pose);
    // Kappe + Schirm + Knopf mit H (als Pfad, schriftunabhaengig)
    s += '<path d="M23.5 35 C24.5 14 75.5 14 76.5 35 C66 30.5 34 30.5 23.5 35 Z" fill="' + F.kappe + '" stroke="' + F.kappeD + '" stroke-width="3.4" stroke-linejoin="round"/>';
    s += '<path d="M31 27 C37 20 46 18.5 52 19" stroke="#7BE38A" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>';
    s += '<path d="M56 31.5 C70 28 88.5 30 94 37.5 C80.5 39.8 66 38.8 54 36.5 Z" fill="' + F.schirm + '" stroke="' + F.kappeD + '" stroke-width="3.2" stroke-linejoin="round"/>';
    s += '<circle cx="50" cy="24" r="7" fill="' + F.knopf + '" stroke="' + F.kappeD + '" stroke-width="2.6"/>';
    s += '<path d="M47.1 20.4 V27.6 M52.9 20.4 V27.6 M47.1 24 H52.9" stroke="' + F.kappeD + '" stroke-width="2.3" stroke-linecap="round"/>';
    return s;
  }
  function fuchs(pose, px, rahmen) {
    if (pose !== 'zeigt' && pose !== 'jubelt' && pose !== 'gruebelt') pose = 'neutral';
    px = px || 96;
    const id = 'fritz-' + (++fuchsNr);
    let s = '<svg class="fs-fuchs fritz-' + pose + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + px + '" height="' + px + '" aria-hidden="true" focusable="false" style="overflow:visible">';
    let koerperAuf = '', koerperZu = '';
    if (rahmen) {
      s += '<defs><clipPath id="' + id + '-k"><circle cx="60" cy="64" r="49"/></clipPath></defs>';
      s += '<circle cx="60" cy="64" r="54" fill="#25C8F3" stroke="' + F.ink + '" stroke-width="4.5"/><circle cx="60" cy="64" r="47.5" fill="#1B2266"/>';
      s += '<path d="M24 36 A47.5 47.5 0 0 1 82 21" stroke="#8DF3FF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>';
      koerperAuf = '<g clip-path="url(#' + id + '-k)">'; koerperZu = '</g>';
    }
    // Schultern + Halstuch
    s += koerperAuf;
    s += '<path d="M15 120 C15 98 34 78 60 78 C86 78 105 98 105 120 Z" fill="' + F.fell + '"/>';
    s += '<path d="M42 92 C48 100 72 100 78 92 C83 102 85 112 84 120 H36 C35 112 37 102 42 92 Z" fill="' + F.weiss + '"/>';
    s += '<path d="M15 120 C15 98 34 78 60 78 C86 78 105 98 105 120" fill="none" stroke="' + F.ink + '" stroke-width="4" stroke-linejoin="round"/>';
    s += '<path d="M31 83 C43 94 77 94 89 83 L90 92 C77 103 43 103 30 92 Z" fill="' + F.kappe + '" stroke="' + F.kappeD + '" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M55 98 L65 98 L67.5 114 L60 109.5 L52.5 114 Z" fill="' + F.schirm + '" stroke="' + F.kappeD + '" stroke-width="2.8" stroke-linejoin="round"/>';
    s += '<circle cx="60" cy="98.5" r="4.2" fill="' + F.kappe + '" stroke="' + F.kappeD + '" stroke-width="2.6"/>';
    s += koerperZu;
    // Arme hinter dem Kopf
    if (pose === 'jubelt') {
      s += arm('M31 100 C18 93 11 78 11.5 60', 11.5, 55, 8.5) + arm('M89 100 C102 93 109 78 108.5 60', 108.5, 55, 8.5);
    } else if (pose === 'zeigt') {
      s += arm('M88 104 C98 101 105 94 108.5 86', 109.5, 83, 8);
      s += '<path d="M112 80 L119 76" stroke="' + F.ink + '" stroke-width="8" stroke-linecap="round"/><path d="M112 80 L119 76" stroke="' + F.pfote + '" stroke-width="3.6" stroke-linecap="round"/>';
    }
    // Kopf (100er Raster -> 120er)
    const tr = pose === 'zeigt' ? 'translate(16 2) scale(.84) rotate(5 50 60)' :
      pose === 'jubelt' ? 'translate(18 0) scale(.84) rotate(-3 50 60)' :
      pose === 'gruebelt' ? 'translate(19 3) scale(.84) rotate(-7 50 60)' : 'translate(18 2) scale(.84)';
    s += '<g transform="' + tr + '">' + kopf(pose) + '</g>';
    if (pose === 'gruebelt') {
      s += arm('M86 117 C86 105 79 95 69 90', 67.5, 89, 7.2);
      s += '<circle cx="101" cy="22" r="3.4" fill="#fff" stroke="' + F.ink + '" stroke-width="2.2"/><circle cx="110" cy="10" r="5" fill="#fff" stroke="' + F.ink + '" stroke-width="2.4"/>';
    }
    if (pose === 'jubelt') s += funkeln(10, 26, 7) + funkeln(110, 24, 6) + funkeln(101, 7, 4.5);
    return s + '</svg>';
  }
  return { svg: fuchs };
})();
