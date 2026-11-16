// VOLLDAMPF: Seitenansichten der Züge (Laden, Fuhrpark, Sammlung) – technische Typenskizze mit Schattierung.
// Fahrtrichtung links; hinter der Lok folgen die Wagen, bis das Bild voll ist. viewBox 0 0 190 56, Schienenoberkante Y = 49.
// Eingabe: Zugdaten aus VolldampfDaten (bild, bau). Keine Logik, nur SVG-Text.
const VolldampfBilder = (function () {
  const W = 190, Y = 49;
  const f = n => (+n).toFixed(1);
  let nr = 0;
  // Farbe mischen (für Licht/Schatten auf Kessel und Kasten)
  function mix(a, b, t) {
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const hell = (c, t) => mix(c, '#ffffff', t), dunkel = (c, t) => mix(c, '#000000', t);
  const rect = (x, y, w, h, fill, extra) => '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra || '') + '/>';
  const KANTE = ' stroke="rgba(255,255,255,.22)" stroke-width=".5"';
  const FENSTER = '#121820';

  /** senkrechter Verlauf (Licht von oben) – gibt die url() zurück und hängt die Definition an defs */
  function verlauf(defs, farbe) {
    const id = 'vdb' + (++nr);
    defs.push('<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hell(farbe, .28) + '"/><stop offset=".38" stop-color="' + farbe + '"/><stop offset="1" stop-color="' + dunkel(farbe, .35) + '"/></linearGradient>');
    return 'url(#' + id + ')';
  }
  function rad(cx, r, speichen, farbe) {
    const cy = Y - r;
    let s = '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + (farbe || '#2A2F35') + '" stroke="#0A0C0F" stroke-width=".6"/>';
    if (speichen) {
      let d = '';
      for (let i = 0; i < 10; i++) { const w = i * Math.PI / 5; d += 'M' + f(cx) + ' ' + f(cy) + 'L' + f(cx + Math.cos(w) * (r - 1)) + ' ' + f(cy + Math.sin(w) * (r - 1)); }
      s += '<path d="' + d + '" stroke="' + hell(farbe || '#2A2F35', .25) + '" stroke-width=".45"/>' +
        '<path d="M' + f(cx - r * .62) + ' ' + f(cy + r * .3) + 'A' + f(r * .7) + ' ' + f(r * .7) + ' 0 0 0 ' + f(cx + r * .62) + ' ' + f(cy + r * .3) + 'Z" fill="' + dunkel(farbe || '#2A2F35', .25) + '"/>';
    }
    return s + '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(Math.min(1.7, r * .3)) + '" fill="#9AA1A9"/>';
  }
  function drehgestell(x, achsen, r) {
    r = r || 4;
    const ab = r * 2 + 2.2, breite = ab * (achsen - 1);
    let s = rect(x - breite / 2 - r - 1, Y - r * 2 - 1.5, breite + r * 2 + 2, 3.2, '#1D2126', KANTE);
    for (let i = 0; i < achsen; i++) s += rad(x - breite / 2 + i * ab, r, false, '#2E333A');
    return s;
  }
  function stromabnehmer(x, yDach) {
    return '<path d="M' + f(x - 7) + ' ' + f(yDach) + 'L' + f(x + 1) + ' ' + f(yDach - 6) + 'L' + f(x - 4) + ' ' + f(yDach - 10) + 'M' + f(x - 8) + ' ' + f(yDach - 10) + 'H' + f(x) + '" stroke="#20252B" stroke-width=".9" fill="none"/>' +
      rect(x - 6, yDach - 1.2, 10, 1.4, '#3A4048');
  }

  // ---------------------------------------------------------------- Dampflok (aus der Achsfolge)
  function dampf(L, x0, defs) {
    const b = L.bau;
    const SCHWARZ = '#16191D', ROT = '#7E2622', ROT2 = '#A23A30', MET = '#8C939C';
    const koerper = b.farbe || '#1C1F23', kv = verlauf(defs, koerper);
    const klein = b.schmal ? 3.6 : 4.3, raeder = [];
    let x = 0;
    for (let i = 0; i < (b.vorn || 0); i++) { x += klein + (i ? 1.5 : 3); raeder.push({ x, r: klein }); x += klein; }
    const ersteKuppel = raeder.length;
    for (let i = 0; i < b.kuppel; i++) { x += b.rad + (i ? 1.2 : (raeder.length ? 3 : 5)); raeder.push({ x, r: b.rad, k: 1 }); x += b.rad; }
    for (let i = 0; i < (b.hinten || 0); i++) { x += klein + 3; raeder.push({ x, r: klein }); x += klein; }
    const lang = Math.max(b.laenge, x + (b.typ === 'tank' ? 16 : 8));
    const tenderL = b.tender ? (b.typ === 'frueh' ? 30 : 46) : 0;
    const rMax = b.rad, yF = Y - 2 * rMax - 1.5;
    const kr = b.schmal || b.typ === 'frueh' ? 5.5 : 7.5, yK = yF - kr - 1;
    const xS = x0 + 3, xC = x0 + lang * (b.typ === 'frueh' ? 0.78 : 0.7);
    let s = '';
    s += rect(x0 + 4, yF + 1, lang - 8, rMax * 1.2, ROT);
    s += rect(x0 + 1, yF - 2.5, lang - 2, 3.5, SCHWARZ, KANTE);
    s += rect(x0 - 0.5, yF - 1.5, 3, 6, ROT) + rect(x0 - 3, yF - 0.5, 2.6, 2.4, MET);
    if (b.typ === 'strom') {
      const top = yK - kr - 4, unten = b.halb ? yF + 1 : Y - rMax * 0.95, ende = b.halb ? xC - 4 : x0 + lang - 1;
      s += '<path d="M' + f(x0 + 16) + ' ' + f(top) + 'Q' + f(x0) + ' ' + f(top) + ' ' + f(x0) + ' ' + f(top + 12) + 'L' + f(x0) + ' ' + f(unten) + 'L' + f(ende) + ' ' + f(unten) + 'L' + f(ende) + ' ' + f(top) + 'Z" fill="' + kv + '"' + KANTE + '/>';
      if (b.halb) s += rect(x0 + 14, yK - kr, xC - x0 - 14, kr * 2, kv, KANTE);
      s += '<path d="M' + f(x0 + 6) + ' ' + f(yK + 2) + 'H' + f(ende - 2) + '" stroke="rgba(255,255,255,.3)" stroke-width=".6"/>';
    } else {
      s += rect(xS, yK - kr, xC - xS, kr * 2, kv, KANTE);
      for (let bx = xS + 16; bx < xC - 4; bx += 12) s += '<path d="M' + f(bx) + ' ' + f(yK - kr) + 'V' + f(yK + kr) + '" stroke="rgba(255,255,255,.12)" stroke-width=".6"/>';   // Kesselringe
      s += '<path d="M' + f(xS + 9) + ' ' + f(yK - kr) + 'V' + f(yK + kr) + '" stroke="rgba(255,255,255,.3)" stroke-width=".5"/>';
      s += '<path d="M' + f(xS + 11) + ' ' + f(yK - 1) + 'H' + f(xC - 2) + '" stroke="' + MET + '" stroke-width=".5"/>';   // Griffstange
      const hoch = b.typ === 'frueh' ? 15 : b.schmal ? 7 : 6;
      s += rect(xS + 3.5, yK - kr - hoch, 5, hoch + 1, kv, KANTE) + rect(xS + 2.8, yK - kr - hoch - 1.2, 6.4, 1.8, SCHWARZ, KANTE);
      const dom = b.typ === 'frueh' ? '#B08A40' : kv;
      s += '<path d="M' + f(xS + (xC - xS) * 0.42) + ' ' + f(yK - kr + 0.5) + 'v-3.5a3.5 3.5 0 0 1 7 0v3.5z" fill="' + dom + '"' + KANTE + '/>';
      if (b.typ !== 'frueh') s += '<path d="M' + f(xS + (xC - xS) * 0.66) + ' ' + f(yK - kr + 0.5) + 'v-2.5a3 3 0 0 1 6 0v2.5z" fill="' + kv + '"' + KANTE + '/>';
      if (b.bleche) s += rect(xS + 1, yK - kr - 1, 9, kr * 2 + 3, '#1D2126', KANTE);
      if (b.typ === 'tank') s += rect(xS + 14, yK - 2, xC - xS - 14, yF - yK + 0.5, kv, KANTE);
    }
    const xEnde = x0 + lang - 1, cabEnde = b.typ === 'tank' ? xEnde - 11 : xEnde;
    if (b.typ === 'frueh') {
      s += '<path d="M' + f(xC + 1) + ' ' + f(yF - 2.5) + 'V' + f(yK - kr - 3) + 'M' + f(cabEnde - 1) + ' ' + f(yF - 2.5) + 'V' + f(yK - kr - 3) + 'M' + f(xC + 1) + ' ' + f(yK - kr - 3) + 'H' + f(cabEnde - 1) + '" stroke="' + MET + '" stroke-width=".8" fill="none"/>';
    } else {
      const cTop = yK - kr - 6;
      s += rect(xC, cTop, cabEnde - xC, yF - cTop, kv, KANTE);
      s += '<path d="M' + f(xC - 1.5) + ' ' + f(cTop) + 'Q' + f((xC + cabEnde) / 2) + ' ' + f(cTop - 2.5) + ' ' + f(cabEnde + 1.5) + ' ' + f(cTop) + '" stroke="' + SCHWARZ + '" stroke-width="1.6" fill="none"/>';
      s += rect(xC + 3, cTop + 3, Math.max(4, (cabEnde - xC) * 0.42), 6, '#8FA3B5', ' stroke="rgba(0,0,0,.5)" stroke-width=".4" opacity=".55"');
      if (b.typ === 'tank') s += rect(cabEnde, yK - 3, xEnde - cabEnde, yF - yK + 3, kv, KANTE);
    }
    raeder.forEach(r => { s += rad(x0 + r.x, r.r, !!r.k || r.r > 5, ROT).replace('#2A2F35', ROT); });
    const kup = raeder.filter(r => r.k);
    if (kup.length > 1) s += '<path d="M' + f(x0 + kup[0].x) + ' ' + f(Y - rMax + rMax * 0.35) + 'H' + f(x0 + kup[kup.length - 1].x) + '" stroke="' + MET + '" stroke-width="1.3" stroke-linecap="round"/>';
    if (kup.length) s += '<path d="M' + f(x0 + kup[0].x) + ' ' + f(Y - rMax + rMax * 0.35) + 'L' + f(x0 + Math.max(10, raeder[ersteKuppel].x - 16)) + ' ' + f(yK + kr * 0.6) + '" stroke="' + MET + '" stroke-width="1.1" stroke-linecap="round"/>';
    let ende = xEnde;
    if (tenderL) {
      const tx = xEnde + 3, tTop = b.typ === 'frueh' ? yF - 7 : yK - kr + 1;
      const tv = b.typ === 'frueh' ? verlauf(defs, '#6A5034') : kv;
      s += rect(tx, tTop, tenderL, yF - tTop + 1, tv, KANTE) + rect(tx + 1, yF + 1, tenderL - 2, 4, ROT);
      s += '<path d="M' + f(tx + 2) + ' ' + f(tTop) + 'Q' + f(tx + tenderL / 2) + ' ' + f(tTop - 3) + ' ' + f(tx + tenderL - 2) + ' ' + f(tTop) + 'z" fill="#08090B"/>';
      const n = b.tender, tr = b.typ === 'frueh' ? 4.5 : 4.2;
      for (let i = 0; i < n; i++) s += rad(tx + tr + 3 + i * ((tenderL - 2 * tr - 6) / Math.max(1, n - 1)), tr, false, ROT);
      ende = tx + tenderL;
    }
    void ROT2;
    return { s, ende };
  }

  // ---------------------------------------------------------------- Diesel- und E-Loks (Kastenlok)
  function kasten(B, x0, defs, elektro) {
    const len = { v200: 78, br218: 76, ludmilla: 84, br143: 72, traxx: 76, br101: 78, br103: 84 }[B.form] || 76;
    const oben = 17, unten = 41, x1 = x0 + len;
    const kv = verlauf(defs, B.farbe);
    const rund = B.form === 'v200' || B.form === 'br103';
    const nase = rund ? 12 : B.form === 'traxx' ? 3 : 5;
    let s = '';
    // Kasten mit Führerständen an beiden Enden
    s += '<path d="M' + f(x0 + nase) + ' ' + oben + 'H' + f(x1 - nase) + (rund ? 'Q' + f(x1) + ' ' + oben + ' ' + f(x1) + ' ' + (oben + 12) : 'L' + f(x1) + ' ' + (oben + 8)) + 'V' + unten + 'H' + f(x0) +
      'V' + (rund ? oben + 12 : oben + 8) + (rund ? 'Q' + f(x0) + ' ' + oben + ' ' + f(x0 + nase) + ' ' + oben : 'L' + f(x0 + nase) + ' ' + oben) + 'Z" fill="' + kv + '"' + KANTE + '/>';
    if (B.zweit) s += rect(x0 + 1, 33, len - 2, 5, B.zweit);
    if (B.streifen) s += '<path d="M' + f(x0 + 2) + ' 35H' + f(x1 - 2) + '" stroke="' + B.streifen + '" stroke-width="1.2"/>';
    // Frontfenster beidseitig
    const fen = (x, dir) => '<path d="M' + f(x) + ' ' + (oben + 3) + 'L' + f(x + dir * (rund ? 10 : 7)) + ' ' + (oben + 3) + 'L' + f(x + dir * (rund ? 10 : 7)) + ' ' + (oben + 10) + 'L' + f(x - dir * (rund ? 2 : 1)) + ' ' + (oben + 10) + 'Z" fill="' + FENSTER + '" stroke="rgba(255,255,255,.3)" stroke-width=".4"/>';
    s += fen(x0 + (rund ? 5 : 3), 1) + fen(x1 - (rund ? 5 : 3), -1);
    // Seitenfenster + Türen
    s += rect(x0 + nase + 10, oben + 4, 6, 6, FENSTER, ' rx="1"') + rect(x1 - nase - 16, oben + 4, 6, 6, FENSTER, ' rx="1"');
    s += '<path d="M' + f(x0 + nase + 19) + ' ' + (oben + 3) + 'V' + (unten - 3) + 'M' + f(x1 - nase - 19) + ' ' + (oben + 3) + 'V' + (unten - 3) + '" stroke="rgba(0,0,0,.4)" stroke-width=".6"/>';
    if (elektro) {
      s += stromabnehmer(x0 + len * 0.3, oben) + stromabnehmer(x0 + len * 0.7, oben);
      s += '<path d="M' + f(x0 + len * 0.3) + ' ' + (oben - 1.5) + 'H' + f(x0 + len * 0.7) + '" stroke="#C9CED4" stroke-width=".6"/>';
    } else {
      let g = ''; for (let gx = x0 + nase + 24; gx < x1 - nase - 22; gx += 1.6) g += 'M' + f(gx) + ' ' + (oben + 4) + 'V' + (oben + 11);
      s += '<path d="' + g + '" stroke="rgba(0,0,0,.45)" stroke-width=".6"/>' + rect(x0 + len * 0.45, oben - 2, 6, 2.5, '#2A2F35');
    }
    s += rect(x0 + 4, unten, len - 8, 2.5, '#1D2126');
    const ach = B.form === 'ludmilla' ? 3 : 2;
    s += drehgestell(x0 + len * 0.24, ach, 4.2) + drehgestell(x1 - len * 0.24, ach, 4.2);
    s += rect(x0 - 2.5, unten - 4, 2.5, 2.4, '#8C939C') + rect(x1, unten - 4, 2.5, 2.4, '#8C939C');
    return { s, ende: x1 };
  }

  // ---------------------------------------------------------------- Triebwagen
  function triebwagen(B, x0, defs, gespiegelt) {
    const len = B.form === 'br612' ? 84 : 98, oben = 16, unten = 41, x1 = x0 + len;
    const kv = verlauf(defs, B.farbe);
    let s = '<path d="M' + f(x0 + 9) + ' ' + oben + 'H' + f(x1 - (gespiegelt ? 9 : 2)) + (gespiegelt ? 'Q' + f(x1) + ' ' + oben + ' ' + f(x1) + ' ' + (oben + 10) : 'L' + f(x1) + ' ' + (oben + 2)) + 'V' + unten + 'H' + f(x0) + 'V' + (oben + 10) + 'Q' + f(x0) + ' ' + oben + ' ' + f(x0 + 9) + ' ' + oben + 'Z" fill="' + kv + '"' + KANTE + '/>';
    if (B.zweit) s += rect(x0 + 1, 34, len - 2, 3.5, B.zweit);
    // Fensterband mit Holmen
    s += rect(x0 + 12, oben + 5, len - 24, 9, FENSTER, ' rx="1"');
    let h = ''; for (let x = x0 + 22; x < x1 - 14; x += 10) h += 'M' + f(x) + ' ' + (oben + 5) + 'V' + (oben + 14);
    s += '<path d="' + h + '" stroke="' + B.farbe + '" stroke-width="1.2"/>';
    s += '<path d="M' + f(x0 + 1.5) + ' ' + (oben + 9) + 'Q' + f(x0 + 2) + ' ' + (oben + 3) + ' ' + f(x0 + 9) + ' ' + (oben + 3) + 'V' + (oben + 14) + 'H' + f(x0 + 1.5) + 'Z" fill="' + FENSTER + '" stroke="rgba(255,255,255,.3)" stroke-width=".4"/>';
    if (gespiegelt) s += '<path d="M' + f(x1 - 1.5) + ' ' + (oben + 9) + 'Q' + f(x1 - 2) + ' ' + (oben + 3) + ' ' + f(x1 - 9) + ' ' + (oben + 3) + 'V' + (oben + 14) + 'H' + f(x1 - 1.5) + 'Z" fill="' + FENSTER + '"/>';
    s += '<path d="M' + f(x0 + len * .33) + ' ' + (oben + 4) + 'V' + (unten - 2) + 'M' + f(x0 + len * .33 + 7) + ' ' + (oben + 4) + 'V' + (unten - 2) + 'M' + f(x0 + len * .7) + ' ' + (oben + 4) + 'V' + (unten - 2) + 'M' + f(x0 + len * .7 + 7) + ' ' + (oben + 4) + 'V' + (unten - 2) + '" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>';
    s += rect(x0 + len * .35, oben - 2.5, 12, 2.6, '#8E959D', ' rx=".8"') + rect(x0 + len * .6, oben - 2.5, 10, 2.6, '#8E959D', ' rx=".8"');
    s += rect(x0 + 6, unten, len - 12, 2.2, '#1D2126');
    s += drehgestell(x0 + 16, 2, 3.6) + drehgestell(x1 - 16, 2, 3.6);
    return { s, ende: x1 };
  }

  // ---------------------------------------------------------------- ICE-Triebkopf, Fliegender Hamburger, TEE
  function schnell(B, x0, defs) {
    const t = B.typ, len = t === 'ice' ? 80 : t === 'tee' ? 70 : 84, oben = 17, unten = 41, x1 = x0 + len;
    const nl = t === 'ice' ? (B.form === 'ice3' || B.form === 'ice4' ? 32 : 26) : 18;
    const grund = t === 'ice' ? '#EEF1F4' : t === 'tee' ? B.farbe : B.farbe;
    const kv = verlauf(defs, grund);
    let s = '<path d="M' + f(x0 + nl) + ' ' + oben + 'H' + f(x1) + 'V' + unten + 'H' + f(x0 + 5) + 'C' + f(x0) + ' ' + unten + ' ' + f(x0) + ' ' + (unten - 7) + ' ' + f(x0 + 2) + ' ' + (unten - 10) +
      'C' + f(x0 + nl * .35) + ' ' + (oben + 6) + ' ' + f(x0 + nl * .7) + ' ' + oben + ' ' + f(x0 + nl) + ' ' + oben + 'Z" fill="' + kv + '"' + KANTE + '/>';
    if (t === 'ice') {
      s += '<path d="M' + f(x0 + 3) + ' 35H' + f(x1) + '" stroke="#D3122A" stroke-width="2"/>';
      s += '<path d="M' + f(x0 + nl * .42) + ' ' + (oben + 7) + 'C' + f(x0 + nl * .6) + ' ' + (oben + 3) + ' ' + f(x0 + nl * .8) + ' ' + (oben + 2.5) + ' ' + f(x0 + nl + 2) + ' ' + (oben + 2.5) + 'V' + (oben + 9) + 'H' + f(x0 + nl * .42) + 'Z" fill="' + FENSTER + '" stroke="rgba(255,255,255,.4)" stroke-width=".4"/>';
      if (B.form === 'ice3' || B.form === 'ice4' || B.form === 'icet') s += rect(x0 + nl + 8, oben + 4, len - nl - 10, 7, FENSTER, ' rx="1.5"');
      else s += rect(x0 + nl + 10, oben + 4, 7, 5, FENSTER, ' rx="1"');
      s += stromabnehmer(x1 - 18, oben);
    } else if (t === 'stromlinie') {
      s += '<path d="M' + f(x0 + 4) + ' ' + (unten - 9) + 'H' + f(x1) + 'V' + unten + 'H' + f(x0 + 5) + 'C' + f(x0 + 1) + ' ' + unten + ' ' + f(x0 + 1) + ' ' + (unten - 5) + ' ' + f(x0 + 4) + ' ' + (unten - 9) + 'Z" fill="' + B.zweit + '"/>';
      s += rect(x0 + nl + 2, oben + 5, len - nl - 6, 7, FENSTER, ' rx="1"');
      s += '<path d="M' + f(x0 + 5) + ' ' + (oben + 11) + 'C' + f(x0 + 8) + ' ' + (oben + 6) + ' ' + f(x0 + 12) + ' ' + (oben + 4) + ' ' + f(x0 + nl) + ' ' + (oben + 4) + 'V' + (oben + 11) + 'Z" fill="' + FENSTER + '"/>';
    } else {
      s += rect(x0 + 6, 30, len - 6, 11, B.farbe) + rect(x0 + nl, oben + 3, len - nl - 3, 8, B.zweit);
      s += '<path d="M' + f(x0 + nl - 4) + ' ' + (oben - 5) + 'H' + f(x0 + nl + 12) + 'V' + oben + 'H' + f(x0 + nl - 10) + 'Z" fill="' + kv + '"' + KANTE + '/>';
      s += '<path d="M' + f(x0 + nl - 3) + ' ' + (oben - 3.5) + 'H' + f(x0 + nl + 4) + 'V' + (oben - .5) + 'H' + f(x0 + nl - 6.5) + 'Z" fill="' + FENSTER + '"/>';
      s += rect(x0 + nl + 16, oben + 4.5, len - nl - 22, 5, FENSTER, ' rx="1"');
    }
    s += rect(x0 + 8, unten, len - 12, 2.2, '#1D2126');
    s += drehgestell(x0 + nl * .9, 2, 3.8) + drehgestell(x1 - 14, 2, 3.8);
    return { s, ende: x1 };
  }

  // ---------------------------------------------------------------- Wagen
  const WAGEN = {
    gruen: { koerper: '#2F4A3B', dach: '#4B535C' }, rot: { koerper: '#B8232E', dach: '#7D848D' },
    ic: { koerper: '#E3E6EA', dach: '#9AA1A9', band: '#C42430' }, ice: { koerper: '#EEF1F4', dach: '#C9CFD6', band: '#D3122A' },
    tee: { koerper: '#9B2335', dach: '#7D848D', oben: '#E3D6B6' }, dosto: { koerper: '#E4E8EC', dach: '#9AA1A9', band: '#C42430', doppel: true },
    schmal: { koerper: '#3B5A44', dach: '#5A636C', klein: true }, frueh: { koerper: '#9A7432', dach: '#3A2E22', klein: true }
  };
  function wagen(art, x0, i, defs) {
    if (art === 'gueter') {
      const len = 50, x1 = x0 + len;
      let s = '';
      if (i % 2 === 0) {
        s += '<path d="M' + f(x0) + ' 24H' + f(x1) + 'L' + f(x1 - 4) + ' 41H' + f(x0 + 4) + 'Z" fill="' + verlauf(defs, '#5A4535') + '"' + KANTE + '/>';
        s += '<path d="M' + f(x0 + 1) + ' 24Q' + f(x0 + len / 2) + ' 17 ' + f(x1 - 1) + ' 24Z" fill="#111214"/>';
        for (let x = x0 + 8; x < x1 - 4; x += 8) s += '<path d="M' + f(x) + ' 24.5V40" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>';
      } else {
        const c = ['#3E6E8E', '#8E5A3E', '#4F7A4E', '#8A7A3A'][(i >> 1) % 4];
        s += rect(x0 + 1, 21, len - 2, 17, verlauf(defs, c), KANTE);
        for (let x = x0 + 4; x < x1 - 2; x += 2.6) s += '<path d="M' + f(x) + ' 22V37" stroke="rgba(0,0,0,.22)" stroke-width=".5"/>';
        s += rect(x0, 38, len, 3, '#2A2F35');
      }
      s += rect(x0 + 3, 41, len - 6, 2, '#1D2126') + drehgestell(x0 + 11, 2, 3.4) + drehgestell(x1 - 11, 2, 3.4);
      return { s, ende: x1 };
    }
    const w = WAGEN[art] || WAGEN.gruen;
    const len = w.klein ? (art === 'frueh' ? 30 : 42) : 64, oben = w.doppel ? 10 : w.klein ? 24 : 18, unten = 41, x1 = x0 + len;
    let s = '<path d="M' + f(x0) + ' ' + (oben + 3) + 'Q' + f(x0) + ' ' + oben + ' ' + f(x0 + 4) + ' ' + oben + 'H' + f(x1 - 4) + 'Q' + f(x1) + ' ' + oben + ' ' + f(x1) + ' ' + (oben + 3) + 'V' + unten + 'H' + f(x0) + 'Z" fill="' + verlauf(defs, w.koerper) + '"' + KANTE + '/>';
    s += rect(x0 + 2, oben - 1.6, len - 4, 2.2, w.dach, ' rx="1"');
    if (w.oben) s += rect(x0 + .5, oben + 2, len - 1, 10, w.oben);
    const reihe = y => { let r = ''; for (let x = x0 + 5; x < x1 - 7; x += (art === 'frueh' ? 9 : 8)) r += rect(x, y, art === 'frueh' ? 6 : 6, 6, FENSTER, ' rx="1"'); return r; };
    s += reihe(oben + 4);
    if (w.doppel) s += reihe(oben + 15);
    if (w.band) s += '<path d="M' + f(x0 + .5) + ' ' + (w.doppel ? unten - 4 : oben + 14) + 'H' + f(x1 - .5) + '" stroke="' + w.band + '" stroke-width="' + (w.doppel ? 3 : 1.8) + '"/>';
    s += rect(x0 + 3, unten, len - 6, 2, '#1D2126');
    if (w.klein) s += rad(x0 + 7, 3.8, true, '#3A3F45') + rad(x1 - 7, 3.8, true, '#3A3F45');
    else s += drehgestell(x0 + 11, 2, 3.6) + drehgestell(x1 - 11, 2, 3.6);
    return { s, ende: x1 };
  }

  // ---------------------------------------------------------------- ganzes Bild
  const speicher = {};
  /** SVG-Seitenansicht; breit: Pixelbreite oder 'gross' (100 %) */
  function zug(L, breit) {
    const k = L.id + '|' + (breit || '');
    if (speicher[k]) return speicher[k];
    const B = L.bild, defs = [];
    let x = 6, teil;
    if (B.typ === 'dampf') teil = dampf(L, x + 3, defs);
    else if (B.typ === 'diesel' || B.typ === 'elok') teil = kasten(B, x + 2, defs, B.typ === 'elok');
    else if (B.typ === 'triebwagen') teil = triebwagen(B, x, defs, !B.n);
    else teil = schnell(B, x, defs);
    let s = teil.s;
    x = teil.ende + 2.5;
    for (let i = 0; i < (B.n || 0) && x < W; i++) {
      s += '<path d="M' + f(x - 2.5) + ' 37H' + f(x) + '" stroke="#5A6068" stroke-width="1.2"/>';
      let w;
      if (B.wagen === 'eigen') w = B.typ === 'triebwagen' ? triebwagen(B, x, defs, true) : spiegel(schnell(B, 0, defs), x, B.typ === 'stromlinie' ? 84 : 80);
      else if (B.schluss && i === B.n - 1) w = spiegel(schnell(B, 0, defs), x, B.typ === 'tee' ? 70 : 80);
      else w = wagen(B.wagen, x, i, defs);
      s += w.s; x = w.ende + 2.5;
    }
    // Gleis mit Schwellen + Schatten unter dem Zug
    let schw = ''; for (let sx = 2; sx < W; sx += 5) schw += 'M' + sx + ' ' + (Y + 1.2) + 'h2.6';
    const boden = '<rect x="0" y="' + (Y - 1) + '" width="' + W + '" height="3" fill="rgba(0,0,0,.28)"/><path d="' + schw + '" stroke="#2B3036" stroke-width="2.2"/><path d="M0 ' + (Y + .4) + 'H' + W + '" stroke="#8A929B" stroke-width=".9"/>';
    const h = breit && breit !== 'gross' ? Math.round(breit * 56 / 190) : 0;
    return (speicher[k] = '<svg class="vd-lokbild' + (L.gold ? ' vd-gold' : '') + (breit === 'gross' ? ' vd-lokbild-gross' : '') + '" viewBox="0 0 190 56" preserveAspectRatio="xMinYMid slice"' +
      (breit && breit !== 'gross' ? ' style="width:' + breit + 'px;height:' + h + 'px"' : '') + '><defs>' + defs.join('') + '</defs>' + boden + s + '</svg>');
  }
  function spiegel(t, x, len) { return { s: '<g transform="translate(' + f(x + len) + ' 0) scale(-1 1)">' + t.s + '</g>', ende: x + len }; }

  return { zug };
})();
