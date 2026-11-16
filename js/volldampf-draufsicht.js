// VOLLDAMPF – Züge von oben (Karte). Realistische Draufsicht: Dach mit Aufbauten, an beiden Rändern ein schmaler Streifen
// der Seitenwand (Fensterband, Zierstreifen), echte Lackierung. Einheiten: Breite 6 (y −3…3), Fahrtrichtung +x, Länge etwa
// im echten Verhältnis (≈1,35 je Meter; kleine Dampfloks etwas größer, sonst sieht man sie nicht).
//   teile(L, nah) -> [{ key, art, len, svg }]   ganzer Zug (nah) oder kurz für die Übersicht (Spitze + Ende)
//   teil(L, art, i) -> { len, svg }        ein Fahrzeug (x 0…len, Spitze bei len)
//   zug(L, nah, abstand) -> { len, svg }   alle Teile hintereinander (Vorschau, Tests)
const VolldampfDraufsicht = (function () {
  const f = n => (+n).toFixed(2);
  const R = (x, y, w, h, fill, extra) => '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra || '') + '/>';
  const C = (x, y, r, fill, extra) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || '') + '/>';
  const P = (d, fill, extra) => '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>';
  const L = (d, farbe, b, extra) => '<path d="' + d + '" fill="none" stroke="' + farbe + '" stroke-width="' + b + '"' + (extra || '') + '/>';
  const SCHATTEN = (d) => P(d, '#000', ' transform="translate(.55 .75)" opacity=".38"');
  const RAND = (c) => ' stroke="' + (c || '#0B0D0F') + '" stroke-width=".2"';
  const DUNKEL = '#141A21', LICHT = '#FFF3C4';
  const ROT = '#D0141C', CARGO = '#C0171D', WEISS = '#EEF0F2', DACH_HELL = '#D3D8DD', DACH = '#8E959C', ICE_ROT = '#EC0016';

  /** Umriss eines Wagenkastens; Enden: ['flach', r] | ['schraeg', t, b] (abgerundete Front, b = halbe Breite der Stirn) | ['nase', l] */
  function umriss(len, vorn, hinten) {
    let d = 'M' + f(hinten[1]) + ' -3H' + f(len - vorn[1]);
    if (vorn[0] === 'flach') { const r = vorn[1]; d += 'Q' + f(len) + ' -3 ' + f(len) + ' ' + f(-3 + r) + 'V' + f(3 - r) + 'Q' + f(len) + ' 3 ' + f(len - r) + ' 3'; }
    else if (vorn[0] === 'schraeg') { const t = vorn[1], b = vorn[2]; d += 'Q' + f(len) + ' -3 ' + f(len) + ' ' + f(-b) + 'V' + f(b) + 'Q' + f(len) + ' 3 ' + f(len - t) + ' 3'; }
    else { const l = vorn[1]; d += 'C' + f(len - l * 0.45) + ' -3 ' + f(len - l * 0.1) + ' -2.25 ' + f(len) + ' -0.7Q' + f(len + 0.3) + ' 0 ' + f(len) + ' 0.7C' + f(len - l * 0.1) + ' 2.25 ' + f(len - l * 0.45) + ' 3 ' + f(len - l) + ' 3'; }
    d += 'H' + f(hinten[1]);
    if (hinten[0] === 'flach') { const r = hinten[1]; d += 'Q0 3 0 ' + f(3 - r) + 'V' + f(-3 + r) + 'Q0 -3 ' + f(r) + ' -3'; }
    else if (hinten[0] === 'schraeg') { const t = hinten[1], b = hinten[2]; d += 'Q0 3 0 ' + f(b) + 'V' + f(-b) + 'Q0 -3 ' + f(t) + ' -3'; }
    else { const l = hinten[1]; d += 'C' + f(l * 0.45) + ' 3 ' + f(l * 0.1) + ' 2.25 0 0.7Q-0.3 0 0 -0.7C' + f(l * 0.1) + ' -2.25 ' + f(l * 0.45) + ' -3 ' + f(l) + ' -3'; }
    return d + 'Z';
  }
  /** Seitenwand-Streifen an beiden Rändern: Wandfarbe, Fensterband, Zierlinie */
  function seiten(x0, x1, opt) {
    let s = '';
    [-1, 1].forEach(sg => {
      if (opt.wand) s += R(x0, sg > 0 ? 2.45 : -3, x1 - x0, 0.55, opt.wand);
      if (opt.fenster) for (let x = x0 + opt.fenster.rand; x + opt.fenster.b <= x1 - opt.fenster.rand + 0.01; x += opt.fenster.b + opt.fenster.luecke)
        s += R(x, sg > 0 ? 2.47 : -2.79, opt.fenster.b, 0.32, opt.fenster.farbe || '#1B2129');
      if (opt.streifen) s += R(x0, sg > 0 ? 2.8 : -2.95, x1 - x0, 0.15, opt.streifen);
    });
    return s;
  }
  /** Wagenkasten mit Seitenwand und Dach; o: farbe, rand, dach, dachRx, dachB (halbe Dachbreite), vorn, hinten, + seiten()-Optionen */
  function kasten(len, o) {
    const v = o.vorn || ['flach', 0.6], h = o.hinten || ['flach', 0.6];
    const u = umriss(len, v, h);
    const x0 = h[0] === 'flach' ? 0.6 : h[1] * (h[0] === 'nase' ? 1 : 0.8), x1 = len - (v[0] === 'flach' ? 0.6 : v[1] * (v[0] === 'nase' ? 1 : 0.8));
    let s = SCHATTEN(u) + P(u, o.farbe, RAND(o.rand));
    if (o.kappe) s += '<g transform="translate(' + f(len - o.kappe.l) + ' 0)">' + P(umriss(o.kappe.l, v, ['flach', 0]), o.kappe.farbe) + '</g>';
    s += seiten(x0, x1, o);
    const db = o.dachB || 2.35;
    if (o.dach) s += R(x0 + 0.1, -db, x1 - x0 - 0.2, db * 2, o.dach, ' rx="' + (o.dachRx == null ? 0.6 : o.dachRx) + '"');
    return s;
  }
  function klima(x, b, farbe) {   // Klimaanlage auf dem Dach: Kasten mit zwei Lüftern
    return R(x, -1.55, b, 3.1, farbe || '#AEB5BD', ' rx=".35" stroke="#7E868F" stroke-width=".15"') +
      C(x + b * 0.3, 0, 0.62, '#868E97') + C(x + b * 0.7, 0, 0.62, '#868E97') +
      L('M' + f(x + b * 0.3 - 0.45) + ' 0H' + f(x + b * 0.3 + 0.45) + 'M' + f(x + b * 0.7 - 0.45) + ' 0H' + f(x + b * 0.7 + 0.45), '#5E656D', 0.12);
  }
  function stromabnehmer(x) {     // Einholm-Stromabnehmer (eingezogen) mit Wippe quer
    return R(x - 2.6, -0.25, 5.2, 0.5, '#59606A') + R(x + 2.1, -1.7, 0.45, 3.4, '#3B4149') + C(x - 2.3, 0, 0.45, '#3B4149') +
      L('M' + f(x - 2.3) + ' -1.2V1.2', '#3B4149', 0.25);
  }
  function uebergang(x) { return R(x - 0.45, -1.7, 0.9, 3.4, '#262B31'); }
  function luefter(x, r) {        // großer Kühlerlüfter (Diesel)
    return C(x, 0, r, '#2A2F35', ' stroke="#5B636C" stroke-width=".2"') + L('M' + f(x - r * 0.8) + ' 0H' + f(x + r * 0.8) + 'M' + f(x) + ' ' + f(-r * 0.8) + 'V' + f(r * 0.8), '#4B535B', 0.18) + C(x, 0, r * 0.25, '#1A1E22');
  }
  function auspuff(x) { return R(x - 0.8, -0.55, 1.6, 1.1, '#2B2F33', ' rx=".3"') + C(x, 0, 0.32, '#0C0E10'); }
  const spiegelX = (svg, len) => '<g transform="matrix(-1 0 0 1 ' + f(len) + ' 0)">' + svg + '</g>';
  const spiegeln = t => ({ len: t.len, svg: spiegelX(t.svg, t.len) });
  /** Frontscheibe + Scheinwerfer am vorderen Ende (x = len) */
  function front(len, ende, licht) {
    if (ende[0] === 'nase') {
      const l = ende[1], a = len - 0.78 * l, sp = len - 0.37 * l;
      return P('M' + f(a) + ' -2.25C' + f(len - 0.56 * l) + ' -2.25 ' + f(len - 0.42 * l) + ' -1.6 ' + f(sp) + ' 0C' + f(len - 0.42 * l) + ' 1.6 ' + f(len - 0.56 * l) + ' 2.25 ' + f(a) + ' 2.25C' + f(a + 1.2) + ' 1.2 ' + f(a + 1.2) + ' -1.2 ' + f(a) + ' -2.25Z', DUNKEL) +
        L('M' + f(a + 0.7) + ' -1.6C' + f(a + 1.8) + ' -0.6 ' + f(a + 1.8) + ' 0.6 ' + f(a + 0.7) + ' 1.6', '#5C6B7A', 0.18, ' opacity=".7"') +
        C(len - 0.9, -0.95, 0.22, licht || LICHT) + C(len - 0.9, 0.95, 0.22, licht || LICHT);
    }
    const t = ende[0] === 'flach' ? 0.2 : ende[1] * 0.5;
    const b = ende[0] === 'flach' ? 2.25 : Math.min(2.3, ende[2] + 0.5);
    const ly = ende[0] === 'flach' ? 2.2 : Math.max(1.1, ende[2] - 0.2);
    return R(len - t - 1.35, -b, 1.15, b * 2, DUNKEL, ' rx=".35"') + C(len - 0.3, -ly, 0.2, licht || LICHT) + C(len - 0.3, ly, 0.2, licht || LICHT);
  }

  // ================================================================ Fernverkehr: ICE
  const ICE = { farbe: WEISS, rand: '#9AA3AD', dach: DACH_HELL, fenster: { b: 2.6, luecke: 0.7, rand: 1.6 }, streifen: ICE_ROT };
  function iceMitte(len, art) {
    let s = kasten(len, ICE) + L('M0.7 -1.95H' + f(len - 0.7) + 'M0.7 1.95H' + f(len - 0.7), '#BFC5CB', 0.15);
    if (art === 'bistro') s += R(len * 0.28, -2.1, len * 0.44, 4.2, '#C2C8CE', ' rx="1.6" stroke="#A2A9B0" stroke-width=".15"') + L('M' + f(len * 0.3) + ' 0H' + f(len * 0.7), '#AEB5BC', 0.3);
    else s += klima(4, 6) + klima(len - 10, 6);
    if (art === 'mitte-strom') s += stromabnehmer(len / 2);
    return { len, svg: s + uebergang(0) + uebergang(len) };
  }
  /** Endwagen mit Nase (l = Nasenlänge); o.triebkopf: ICE 1 (ohne Fahrgastraum); o.licht: Scheinwerferfarbe */
  function iceEnde(len, l, o) {
    const n0 = len - l;
    let s = kasten(len, { farbe: WEISS, rand: '#9AA3AD', vorn: ['nase', l], fenster: o.triebkopf ? null : ICE.fenster });
    s += seiten(0.6, n0 - 2, { streifen: ICE_ROT });
    // roter Streifen läuft an der Nase nach vorn zusammen
    s += L('M' + f(n0 - 2) + ' -2.87C' + f(len - 0.55 * l) + ' -2.85 ' + f(len - 0.2 * l) + ' -2.2 ' + f(len - 0.11 * l) + ' -1.4', ICE_ROT, 0.15) +
      L('M' + f(n0 - 2) + ' 2.87C' + f(len - 0.55 * l) + ' 2.85 ' + f(len - 0.2 * l) + ' 2.2 ' + f(len - 0.11 * l) + ' 1.4', ICE_ROT, 0.15);
    s += P('M0.5 -2.35H' + f(n0 - 1) + 'C' + f(len - 0.64 * l) + ' -2.35 ' + f(len - 0.47 * l) + ' -1.9 ' + f(len - 0.42 * l) + ' -1.2V1.2C' + f(len - 0.47 * l) + ' 1.9 ' + f(len - 0.64 * l) + ' 2.35 ' + f(n0 - 1) + ' 2.35H0.5Z', DACH_HELL);
    s += front(len, ['nase', l], o.licht);
    if (o.triebkopf) {   // ICE 1: Lüftergitter, Hauptschalter, Stromabnehmer
      for (let x = 3; x < n0 - 4; x += 1.1) s += R(x, -2.95, 0.55, 0.42, '#9AA2AA') + R(x, 2.53, 0.55, 0.42, '#9AA2AA');
      s += stromabnehmer(n0 * 0.55) + R(n0 * 0.12, -0.9, 3.2, 1.8, '#7D858E', ' rx=".3"') + R(n0 * 0.82 - 1.5, -1.3, 3, 2.6, '#A9B0B7', ' rx=".3"');
    } else {
      s += klima(4, 6) + (n0 > 22 ? klima(n0 - 9, 6) : '');
      if (o.strom) s += stromabnehmer(n0 * 0.62);
    }
    return { len, svg: s + uebergang(0) };
  }
  const ICE_FORM = {
    ice4: { ende: 42, nase: 11, mitte: 38 },
    ice3: { ende: 36, nase: 12, mitte: 34 },
    ice3neo: { ende: 36, nase: 12.5, mitte: 34, licht: '#F4F8FF' },
    iceT: { ende: 37, nase: 8, mitte: 35 },
    ice1: { ende: 28, nase: 6.5, mitte: 36, triebkopf: true }
  };
  function ice(id, art) {
    const F = ICE_FORM[id];
    if (art === 'kopf' || art === 'schluss') {
      const t = iceEnde(F.ende, F.nase, F);
      return art === 'schluss' ? spiegeln(t) : t;
    }
    return iceMitte(F.mitte, art);
  }

  /** ICE L: kurze, niedrige Talgo-Wagen (ein Fahrwerk zwischen zwei Wagen), Steuerwagen mit Nase am Zugende */
  function talgo(art) {
    if (art === 'steuer') return spiegeln(iceEnde(25, 7, {}));
    const len = 18;
    let s = kasten(len, { farbe: WEISS, rand: '#9AA3AD', fenster: { b: 2.3, luecke: 0.9, rand: 1.3 }, streifen: ICE_ROT, dach: DACH_HELL, dachB: 2.2, dachRx: 0.9 });
    s += klima(len / 2 - 2.5, 5);
    return { len, svg: s + uebergang(0) + uebergang(len) };
  }

  // ================================================================ Elektro- und Dieselloks
  /** E-Lok: TRAXX (146, 185) mit gerundeter Stirn oder Vectron (193) mit kantiger Stirn */
  function elok(o) {
    const len = 26, ende = o.form === 'vectron' ? ['flach', 0.45] : ['schraeg', 1.5, 2.3];
    let s = kasten(len, { farbe: o.farbe, rand: o.rand, vorn: ende, hinten: ende, streifen: o.streifen });
    s += R(3.6, -1.95, len - 7.2, 3.9, o.dach || DACH, ' rx=".5"');
    for (let x = 5; x < len - 5; x += 1.15) s += L('M' + f(x) + ' -2.55V-2.05M' + f(x) + ' 2.05V2.55', 'rgba(0,0,0,.3)', 0.25);   // Lüftergitter
    s += stromabnehmer(6.6) + spiegelX(stromabnehmer(6.6), len);
    s += L('M8.8 0H' + f(len - 8.8), '#C9CED4', 0.3) + R(len / 2 - 1.6, -0.85, 3.2, 1.7, '#5E656D', ' rx=".3"') + C(len / 2, 0, 0.45, '#C9CED4');
    s += front(len, ende) + spiegelX(front(len, ende, '#C8312A'), len);
    return { len, svg: s };
  }
  /** Diesellok 232 „Ludmilla“: lang, rot, zwei große Kühlerlüfter, Führerstände an beiden Enden */
  function ludmilla() {
    const len = 28, ende = ['flach', 0.9];
    let s = kasten(len, { farbe: '#B32621', rand: '#5E120F', vorn: ende, hinten: ende, streifen: '#E3E6E9' });
    s += R(3.4, -2.3, len - 6.8, 4.6, '#6F767F', ' rx=".5"');
    s += luefter(6.5, 1.55) + luefter(len - 6.5, 1.55) + auspuff(len / 2 - 2) + auspuff(len / 2 + 2);
    for (let x = 9.5; x < len - 9.5; x += 0.9) s += L('M' + f(x) + ' -1.9V-1.1M' + f(x) + ' 1.1V1.9', '#4E555D', 0.22);
    s += front(len, ende) + spiegelX(front(len, ende, '#C8312A'), len);
    return { len, svg: s };
  }

  // ================================================================ Doppelstockwagen (RE und IC 2)
  function dosto(art, ic) {
    const farbe = ic ? WEISS : ROT, rand = ic ? '#9AA3AD' : '#7E0E12';
    const steuer = art === 'steuer', len = steuer ? 37 : 36;
    const vorn = steuer ? ['schraeg', 3.6, 1.7] : ['flach', 0.6];
    let s = kasten(len, { farbe, rand, vorn, fenster: { b: 3.1, luecke: 0.9, rand: 1.5, farbe: ic ? '#1B2129' : '#22272D' }, streifen: ic ? ICE_ROT : '#E2E5E8',
      dach: ic ? '#B9C0C6' : '#9AA0A6', dachB: ic ? 2.45 : 2.15, dachRx: 1.2 });
    for (let x = 4; x < len - 5; x += 5.5) s += L('M' + f(x) + ' -2.3V2.3', 'rgba(0,0,0,.14)', 0.22);   // Dachsicken
    s += klima(len / 2 - 3, 6, ic ? '#C3C9CF' : '#AEB5BD');
    if (steuer) {
      if (ic) s += P('M' + f(len - 4) + ' -2.55L' + f(len - 0.8) + ' -1.8V1.8L' + f(len - 4) + ' 2.55Z', ICE_ROT, ' opacity=".9"');
      s += front(len, vorn);
    }
    s += uebergang(0) + (steuer ? '' : uebergang(len));
    return steuer ? spiegeln({ len, svg: s }) : { len, svg: s };   // Steuerwagen: Führerstand am Zugende
  }

  // ================================================================ Triebwagen (Regionalverkehr)
  const REGIO = { farbe: ROT, rand: '#7E0E12', fenster: { b: 2.6, luecke: 0.8, rand: 1.6 }, streifen: '#E2E5E8', dach: '#A3AAB1', dachB: 2.05 };
  // Lackierungen anderer Betreiber: Westfalenbahn (FLIRT), S-Bahn (423), bwegt (Mireo), evb Wasserstoff (iLint)
  const STIL = {
    flirt: { farbe: '#3E8FC9', rand: '#1D4F75', dach: '#B8C2CA', streifen: '#DDE8C0', kappe: { farbe: '#C9D84C', l: 6 } },
    br423: { farbe: ROT, rand: '#7E0E12', dach: '#B9C0C6', streifen: '#F2F4F6', fenster: { b: 2.2, luecke: 0.6, rand: 1.2 } },
    mireo: { farbe: '#F1F2F0', rand: '#8E959C', dach: '#C9CFD4', streifen: '#F2C200', fenster: { b: 2.8, luecke: 0.5, rand: 1.4, farbe: '#16191D' }, kappe: { farbe: '#F2C200', l: 5.5 } },
    ilint: { farbe: '#1F4FA8', rand: '#0E2A5E', dach: '#C3CAD1', streifen: '#7FC3EA', kappe: { farbe: '#3E9AD8', l: 7 } }
  };
  function triebEnde(o) {
    const len = o.len;
    let s = kasten(len, Object.assign({}, REGIO, STIL[o.id] || {}, { vorn: o.ende, hinten: ['flach', 0.4] }));
    s += front(len, o.ende) + o.aufbau(len);
    return { len, svg: s + uebergang(0) };
  }
  const TRIEB_ENDE = {
    lint: () => triebEnde({ len: 28, ende: ['schraeg', 3.4, 1.6], aufbau: l => klima(l - 11, 5.5) + R(4, -1.7, 6.5, 3.4, '#4C535B', ' rx=".4"') + auspuff(7.2) + L('M4.6 -1.2H9.4M4.6 1.2H9.4', '#2F353B', 0.3) }),
    br612: () => triebEnde({ len: 35, ende: ['schraeg', 4.2, 1.3], aufbau: l => klima(l - 12, 6) + klima(5, 6) + auspuff(l / 2 - 1) + R(l / 2 + 1.5, -1.2, 4, 2.4, '#5E656D', ' rx=".4"') }),
    talent2: () => triebEnde({ len: 27, ende: ['schraeg', 5, 1.5], aufbau: l => klima(l - 11, 5) + stromabnehmer(8) + L('M10.3 0H' + f(l - 11.5), '#C9CED4', 0.28) }),
    desirohc: () => triebEnde({ len: 35, ende: ['schraeg', 4.2, 1.7], aufbau: l => klima(l - 12, 6) + stromabnehmer(9) + R(3, -1.3, 2.6, 2.6, '#5E656D', ' rx=".3"') }),
    flirt: () => triebEnde({ id: 'flirt', len: 27, ende: ['schraeg', 4.4, 1.5], aufbau: l => klima(l - 12, 5.5) + R(3.5, -1.3, 5, 2.6, '#7E868E', ' rx=".4"') }),
    br423: () => triebEnde({ id: 'br423', len: 24, ende: ['schraeg', 2.6, 2.0], aufbau: l => klima(l - 10, 5) + klima(3.5, 5) }),
    mireo: () => triebEnde({ id: 'mireo', len: 31, ende: ['schraeg', 5, 1.3], aufbau: l => klima(l - 12.5, 6) + R(4, -1.4, 6, 2.8, '#6E767E', ' rx=".4"') }),
    // iLint: Wasserstofftanks (lange Druckbehälter) und Brennstoffzelle auf dem Dach
    ilint: () => triebEnde({ id: 'ilint', len: 36, ende: ['schraeg', 3.6, 1.6], aufbau: l => klima(l - 11, 5.5) +
      R(4, -2.0, 15, 1.6, '#E3E8EC', ' rx=".8" stroke="#9AA2AA" stroke-width=".15"') + R(4, 0.4, 15, 1.6, '#E3E8EC', ' rx=".8" stroke="#9AA2AA" stroke-width=".15"') +
      R(4.6, -1.65, 13.8, 0.35, 'rgba(255,255,255,.7)', ' rx=".17"') + R(4.6, 0.75, 13.8, 0.35, 'rgba(255,255,255,.7)', ' rx=".17"') +
      R(20, -1.5, 5.5, 3.0, '#4E565E', ' rx=".4"') + L('M20.8 -0.6H24.7M20.8 0.6H24.7', '#2F353B', 0.3) })
  };
  const TRIEB_MITTE = { flirt: 23, br423: 23, mireo: 30, talent2: 22 };
  function trieb(id, art) {
    if (art === 'kopf') return TRIEB_ENDE[id]();
    if (art === 'schluss') return spiegeln(TRIEB_ENDE[id]());
    if (TRIEB_MITTE[id]) {   // Mittelwagen (kurzgekuppelt), teils mit Stromabnehmer
      const len = TRIEB_MITTE[id];
      let s = kasten(len, Object.assign({}, REGIO, STIL[id] || {}, { kappe: null })) + klima(art === 'mitte-strom' ? 2.5 : len / 2 - 3, 6);
      if (art === 'mitte-strom') s += stromabnehmer(len - 7) + L('M' + f(len - 4.4) + ' 0H' + f(len - 1.5), '#C9CED4', 0.28);
      return { len, svg: s + uebergang(0) + uebergang(len) };
    }
    // Desiro HC: doppelstöckige Mittelwagen (höheres, breiteres Dach)
    const len = 34;
    let s = kasten(len, Object.assign({}, REGIO, { fenster: { b: 3.1, luecke: 0.9, rand: 1.5, farbe: '#22272D' }, dach: '#9AA0A6', dachB: 2.55, dachRx: 1.2 }));
    for (let x = 4; x < len - 5; x += 5.5) s += L('M' + f(x) + ' -2.3V2.3', 'rgba(0,0,0,.14)', 0.22);
    return { len, svg: s + klima(len / 2 - 3, 6) + uebergang(0) + uebergang(len) };
  }
  /** Regio-Shuttle RS 1 (Süd-Thüringen-Bahn, grün-weiß) */
  function rs1() {
    const len = 30, g = '#3AA35B';
    const u = 'M1.2 -3H' + (len - 1.2) + 'L' + len + ' -2.2V2.2L' + (len - 1.2) + ' 3H1.2L0 2.2V-2.2Z';
    let s = SCHATTEN(u) + P(u, '#F1F3F2', RAND('#8E978F'));
    [-1, 1].forEach(sg => { s += R(1.4, sg > 0 ? 2.72 : -3, len - 2.8, 0.28, g); });
    s += seiten(2.4, len - 2.4, { fenster: { b: 3.1, luecke: 0.8, rand: 1.2 } });
    s += R(1.6, -2.35, len - 3.2, 4.7, '#D7DCD8', ' rx=".5"');
    [0, 1].forEach(e => {
      const x = e ? len - 1.55 : 0.45;
      s += R(x, -2.1, 1.1, 4.2, DUNKEL, ' rx=".3"');
      s += R(e ? len - 0.42 : 0.1, -1.9, 0.32, 3.8, g);
    });
    s += klima(5, 5.5, '#B7BEB9') + klima(len - 10.5, 5.5, '#B7BEB9');
    s += R(len / 2 - 1.2, -0.9, 2.4, 1.8, '#5A615C', ' rx=".4"') + C(len / 2 + 0.4, 0, 0.45, '#22262A');
    return { len, svg: s };
  }

  // ================================================================ Güterwagen (5 Bauarten im Wechsel)
  function gueter(v) {
    if (v === 0 || v === 4) {     // offener Wagen: Kohle bzw. Schrott
      const len = 22, schrott = v === 4;
      let s = kasten(len, { farbe: schrott ? '#7A4A2E' : '#5C4433', rand: '#20160F', vorn: ['flach', 0.3], hinten: ['flach', 0.3] });
      s += R(0.9, -2.45, len - 1.8, 4.9, schrott ? '#5B4636' : '#111315', ' rx=".3"');
      for (let k = 0; k < 16; k++) {
        const x = 1.8 + (k * 7.3) % (len - 3.6), y = ((k * 37) % 9 - 4) * 0.48;
        s += schrott ? R(x - 0.5, y - 0.25, 1.1 + (k % 3) * 0.3, 0.5, ['#8C6A4E', '#6E5A4A', '#9A7C5C'][k % 3], ' transform="rotate(' + (k * 47 % 180) + ' ' + f(x) + ' ' + f(y) + ')"')
          : C(x, y, 0.38 + (k % 3) * 0.07, '#2B2F33') + C(x - 0.1, y - 0.1, 0.1, '#6B7178');
      }
      for (let x = 5.5; x < len - 2; x += 5.5) s += L('M' + f(x) + ' -2.9V-2.45M' + f(x) + ' 2.45V2.9', '#3A2A1E', 0.3);
      return { len, svg: s };
    }
    if (v === 1) {                // Schiebewandwagen: gewelltes Dach
      const len = 26;
      let s = kasten(len, { farbe: '#8C3B2C', rand: '#3A1710' });
      s += R(0.8, -2.6, len - 1.6, 5.2, '#A9AEB3', ' rx=".8"');
      for (let x = 1.6; x < len - 1; x += 0.8) s += L('M' + f(x) + ' -2.5V2.5', 'rgba(0,0,0,.18)', 0.18);
      s += L('M' + f(len / 2) + ' -2.6V2.6', '#6E747A', 0.3);
      return { len, svg: s };
    }
    if (v === 2) {                // Containertragwagen mit zwei Containern
      const len = 27, farben = ['#2E6FA5', '#C9762B'];
      let s = SCHATTEN('M0 -2.8H' + len + 'V2.8H0Z') + R(0, -2.3, len, 4.6, '#2A2E33', RAND()) + L('M0 0H' + len, '#3A4047', 0.5);
      [[0.8, farben[0]], [len / 2 + 0.3, farben[1]]].forEach(([x, c]) => {
        s += R(x, -2.75, len / 2 - 1.1, 5.5, c, ' stroke="rgba(0,0,0,.45)" stroke-width=".2"');
        for (let k = x + 0.9; k < x + len / 2 - 1.5; k += 0.95) s += L('M' + f(k) + ' -2.6V2.6', 'rgba(0,0,0,.16)', 0.2);
      });
      return { len, svg: s };
    }
    // Kesselwagen: runder Kessel, Laufsteg, Dom, Warnbänder
    const len = 20;
    let s = SCHATTEN('M0 -2.6H' + len + 'V2.6H0Z') + R(0, -2.3, len, 4.6, '#22262A', RAND());
    s += R(0.8, -2.6, len - 1.6, 5.2, '#3A4046', ' rx="2.4"') + R(1.2, -1.1, len - 2.4, 0.9, 'rgba(255,255,255,.16)', ' rx=".45"');
    s += R(1.5, -0.25, len - 3, 0.5, '#7E868E') + C(len / 2, 0, 1.15, '#2B3035', ' stroke="#7E868E" stroke-width=".2"');
    s += R(1.4, -2.62, 1.6, 5.24, '#C88A1E', ' opacity=".85"') + R(len - 3, -2.62, 1.6, 5.24, '#C88A1E', ' opacity=".85"');
    return { len, svg: s };
  }

  // ================================================================ Dampfloks (aus der Achsfolge gebaut)
  const RAD_ROT = '#B3261E', LAUF_ROT = '#8E2019', RAHMEN_ROT = '#A42A23';
  function dampfLok(b) {
    const len = Math.round(b.laenge * 0.255 * 10) / 10;
    let svg;
    if (b.typ === 'frueh') svg = fruehLok(b, len);
    else if (b.typ === 'strom' && !b.halb) svg = stromLok(b, len);
    else svg = normaleLok(b, len);
    return { len, svg: b.schmal ? '<g transform="scale(1 .8)">' + svg + '</g>' : svg };
  }
  function normaleLok(b, len) {
    const tank = b.typ === 'tank';
    const farbe = b.farbe || '#1C2024';               // Führerhaus, Wasserkästen (grün bei 18 201)
    const kessel = b.farbe || '#262B30';
    let s = SCHATTEN('M0 -2.9H' + f(len - 1) + 'V2.9H0Z');
    s += R(0, -2.9, len - 1, 5.8, '#25292E', RAND()) + R(0, -3.05, len - 1, 0.18, RAHMEN_ROT) + R(0, 2.87, len - 1, 0.18, RAHMEN_ROT);
    s += R(len - 1.2, -2.95, 1.2, 5.9, RAD_ROT);
    s += b.schmal ? C(len + 0.35, 0, 0.6, '#1A1D20') : C(len + 0.35, -2.05, 0.55, '#1A1D20') + C(len + 0.35, 2.05, 0.55, '#1A1D20');
    // Räder: vordere Laufachsen, Kuppelachsen, hintere Laufachsen – ragen seitlich unter dem Umlauf hervor
    const dm = Math.max(2.3, b.rad * 0.37), pos = [];
    let x = 0;
    for (let k = 0; k < (b.vorn || 0); k++) { pos.push([x, 'l']); x += 2.6; }
    if (b.vorn) x += dm / 2 - 0.3; else x = 0;
    for (let k = 0; k < b.kuppel; k++) { pos.push([x, 'k']); x += dm + 0.45; }
    x -= dm + 0.45;
    for (let k = 0; k < (b.hinten || 0); k++) { x += k ? 2.6 : dm / 2 + 1.5; pos.push([x, 'l']); }
    const vorn0 = len - 3.3, platz = vorn0 - (tank ? 3.2 : 1.8), dehn = x > platz ? platz / x : 1;
    pos.forEach(([p, t]) => {
      const px = vorn0 - p * dehn;
      s += t === 'k' ? R(px - dm / 2, -3.3, dm, 0.42, RAD_ROT, ' rx=".2"') + R(px - dm / 2, 2.88, dm, 0.42, RAD_ROT, ' rx=".2"')
        : R(px - 0.9, -3.15, 1.8, 0.28, LAUF_ROT) + R(px - 0.9, 2.87, 1.8, 0.28, LAUF_ROT);
    });
    s += R(len - 6.2, -2.85, 2.8, 0.55, '#15181B') + R(len - 6.2, 2.3, 2.8, 0.55, '#15181B');      // Zylinder
    // Kohlenkasten (Tenderlok), Führerhaus, Kessel
    let c0 = 0.4;
    if (tank) {
      const bk = Math.max(2.6, len * 0.13);
      s += R(0.3, -2.6, bk, 5.2, farbe, RAND()) + R(0.8, -2.0, bk - 1, 4.0, '#0E1012', ' rx=".3"');
      for (let k = 0; k < 6; k++) s += C(1.3 + (k * 0.83) % (bk - 1.4), -1.3 + (k * 1.1) % 2.6, 0.3, '#2B2F33');
      c0 = bk + 0.5;
    }
    const cL = Math.min(6.4, len * 0.22), k0 = c0 + cL, k1 = len - 1.6;
    s += R(k0, -2.05, k1 - k0, 4.1, kessel) + R(k0, -0.75, k1 - k0, 0.55, 'rgba(255,255,255,.13)');
    for (let k = k0 + 2.4; k < len - 7; k += 3.3) s += L('M' + f(k) + ' -2.05V2.05', 'rgba(255,255,255,.12)', 0.16);
    if (tank) {   // seitliche Wasserkästen
      const tl = (len - 7) - k0;
      s += R(k0, -2.95, tl, 1.05, farbe, RAND()) + R(k0, 1.9, tl, 1.05, farbe, RAND());
    }
    s += R(len - 6.6, -1.95, 4.9, 3.9, '#2C3238', ' rx=".5"');                                      // Rauchkammer
    if (b.halb) {   // Baureihe 10: Teilverkleidung vorn
      s += P('M' + f(len - 10) + ' -2.6H' + f(len - 3.2) + 'Q' + f(len - 0.2) + ' -2.6 ' + f(len - 0.2) + ' 0Q' + f(len - 0.2) + ' 2.6 ' + f(len - 3.2) + ' 2.6H' + f(len - 10) + 'Z', '#1A1D21', RAND('#3A4148')) +
        R(len - 9.5, -0.7, 7, 0.5, 'rgba(255,255,255,.14)', ' rx=".25"');
    }
    s += C(len - 3.4, 0, b.schmal ? 0.8 : 0.95, '#0B0C0E', ' stroke="#3D444B" stroke-width=".2"');    // Schornstein
    const dom = (dx, r) => C(dx, 0, r, kessel, ' stroke="rgba(255,255,255,.28)" stroke-width=".18"') + C(dx - 0.35, -0.35, r * 0.3, 'rgba(255,255,255,.3)');
    s += dom(k0 + (k1 - k0) * 0.42, 1.25) + dom(k0 + (k1 - k0) * 0.66, 1.15);
    if (b.bleche) s += R(len - 8.2, -2.98, 6.6, 0.38, '#3A4148') + R(len - 8.2, 2.6, 6.6, 0.38, '#3A4148');   // Windleitbleche
    s += R(c0, -2.75, cL, 5.5, farbe, ' rx=".7" stroke="rgba(255,255,255,.18)" stroke-width=".15"');
    s += R(c0 + cL * 0.3, -0.8, cL * 0.4, 1.6, 'rgba(255,255,255,.12)', ' rx=".3"');
    s += C(len - 0.35, -1.6, 0.22, LICHT) + C(len - 0.35, 1.6, 0.22, LICHT);
    return s;
  }
  /** Baureihe 05: voll verkleidete Stromlinienlok (weinrot, goldene Zierlinien) */
  function stromLok(b, len) {
    const u = umriss(len, ['nase', 6.5], ['flach', 0.4]);
    let s = SCHATTEN(u) + P(u, b.farbe, RAND('#2A0C0A'));
    s += L('M0.5 -2.35H' + f(len - 6.5) + 'M0.5 2.35H' + f(len - 6.5), '#C9A04A', 0.2);
    s += R(0.8, -1.0, len - 7.5, 2.0, 'rgba(255,255,255,.12)', ' rx="1"');
    s += R(len - 7.5, -0.5, 3.0, 1.0, '#120607', ' rx=".5"');                     // Rauchabzug
    s += R(0.8, -2.5, 5.2, 5.0, 'rgba(0,0,0,.18)', ' rx=".6"') + R(1.6, -0.7, 3.2, 1.4, 'rgba(255,255,255,.12)', ' rx=".3"');   // Führerhausdach
    for (let x = 9; x < len - 9; x += 3.4) s += R(x, -3.02, 2.2, 0.22, '#3A0F0C') + R(x, 2.8, 2.2, 0.22, '#3A0F0C');   // Schürze
    s += C(len - 0.7, -1.1, 0.24, LICHT) + C(len - 0.7, 1.1, 0.24, LICHT) + C(len - 0.15, 0, 0.2, LICHT);
    return s;
  }
  /** 1830er-Loks (Adler, Saxonia): Holzrahmen, schlanker grüner Kessel mit Messingringen, hoher Schornstein, offener Stand */
  function fruehLok(b, len) {
    const holz = '#6B4A2A', messing = '#C9A04A';
    let s = SCHATTEN('M0 -2.6H' + f(len) + 'V2.6H0Z') + R(0, -2.6, len - 0.6, 5.2, holz, RAND('#2A1C10'));
    const dm = Math.max(2.4, b.rad * 0.37);
    const achsen = (b.vorn || 0) + b.kuppel + (b.hinten || 0);
    for (let k = 0; k < achsen; k++) {
      const px = len - 3 - k * (len - 5) / Math.max(1, achsen - 1), gross = k >= (b.vorn || 0) && k < (b.vorn || 0) + b.kuppel;
      const w = gross ? dm : 1.9;
      s += R(px - w / 2, -3.2, w, 0.42, RAD_ROT, ' rx=".2"') + R(px - w / 2, 2.78, w, 0.42, RAD_ROT, ' rx=".2"');
    }
    s += R(len - 1, -2.7, 1, 5.4, '#7A5634') + C(len + 0.3, -1.9, 0.5, '#2A2E33') + C(len + 0.3, 1.9, 0.5, '#2A2E33');
    s += R(0.3, -2.3, 2.9, 4.6, '#8A6A45') + L('M0.3 -1.15H3.2M0.3 0H3.2M0.3 1.15H3.2', '#5E4528', 0.18);   // offener Führerstand
    s += R(4.4, -1.6, len - 7.2, 3.2, b.farbe, ' rx="1.2"') + R(4.4, -0.6, len - 7.2, 0.45, 'rgba(255,255,255,.16)');
    for (let x = 5.6; x < len - 3.4; x += 2.4) s += L('M' + f(x) + ' -1.6V1.6', messing, 0.3);
    s += C(4.6, 0, 1.6, '#B87333', ' stroke="#7A4A20" stroke-width=".2"') + C(4.2, -0.45, 0.45, '#E8B07A');   // kupferner Stehkessel
    s += C(len - 2.3, 0, 1.25, '#1C1F23', ' stroke="' + messing + '" stroke-width=".3"') + C(len - 2.3, 0, 0.7, '#060708');   // hoher Schornstein
    return s;
  }
  /** Schlepptender, Spitze (+x) zur Lok: Kohle vorn, Wasserkasten hinten */
  function tender(b) {
    if (b.typ === 'frueh') {
      const len = 10.5;
      let s = SCHATTEN('M0 -2.5H' + len + 'V2.5H0Z') + R(0, -2.5, len, 5, '#6B4A2A', RAND('#2A1C10'));
      s += R(len - 6.2, -2.0, 5.6, 4.0, '#121315', ' rx=".4"');
      for (let k = 0; k < 6; k++) s += C(len - 5.5 + (k * 0.97) % 4.4, -1.3 + (k * 1.2) % 2.6, 0.32, '#2B2F33');
      s += C(2.3, 0, 1.6, '#7A5634', ' stroke="#3A2A18" stroke-width=".25"') + L('M0.7 0H3.9', '#3A2A18', 0.2);   // Wasserfass
      return { len, svg: s };
    }
    const len = b.tender === 3 ? 17 : 21, farbe = b.farbe || '#1E2226';
    const voll = b.typ === 'strom' && !b.halb;
    const u = voll ? umriss(len, ['flach', 0.4], ['flach', 2]) : 'M0 -2.9H' + len + 'V2.9H0Z';
    let s = SCHATTEN(u) + P(u, farbe, RAND('#0B0D0F'));
    if (voll) {
      s += L('M1 -2.35H' + f(len - 0.5) + 'M1 2.35H' + f(len - 0.5), '#C9A04A', 0.2) + R(1.2, -1.0, len - 2, 2.0, 'rgba(255,255,255,.12)', ' rx="1"') +
        R(len - 8, -1.5, 6, 3, 'rgba(0,0,0,.25)', ' rx=".4"');
      return { len, svg: s };
    }
    s += R(0, -3.05, len, 0.18, RAHMEN_ROT) + R(0, 2.87, len, 0.18, RAHMEN_ROT);
    const kohle = len * 0.42;
    s += R(0.6, -2.4, len - kohle - 1.4, 4.8, b.farbe ? 'rgba(0,0,0,.18)' : '#2A2F34', ' rx=".4"') + C((len - kohle) / 2, 0, 0.9, '#3A4046', ' stroke="#55606A" stroke-width=".15"');
    s += R(len - kohle - 0.4, -2.4, kohle - 0.2, 4.8, '#0E1012', ' rx=".5"');
    for (let k = 0; k < 10; k++) {
      const x = len - kohle + 0.4 + (k * 1.37) % (kohle - 1.4), y = -1.8 + (k * 0.93) % 3.6;
      s += C(x, y, 0.32 + (k % 3) * 0.08, '#2B2F33') + C(x - 0.1, y - 0.1, 0.1, '#6B7178');
    }
    return { len, svg: s };
  }
  /** Wagen hinter Dampfloks */
  function dampfWagen(Lk, art, i) {
    if (art === 'gueter') return gueter(i % 5);
    if (art === 'frueh') {   // Wagen der 1830er: gelb, grün, rot im Wechsel
      const len = 13, c = ['#C69A3A', '#2F5B40', '#8E2A22'][i % 3];
      let s = SCHATTEN('M0 -2.6H' + len + 'V2.6H0Z') + R(0, -2.6, len, 5.2, '#4A3420', RAND('#2A1C10'));
      s += R(0.5, -2.3, len - 1, 4.6, c, ' rx="1.4"') + R(1.2, -1.5, len - 2.4, 3.0, 'rgba(0,0,0,.18)', ' rx="1"') + R(2, -1.1, len - 4, 2.2, 'none', ' stroke="#3A2A18" stroke-width=".25"');
      return { len, svg: s };
    }
    if (art === 'schmal') {   // Schmalspurwagen mit offenen Bühnen: HSB rot, Rasender Roland grün
      const len = 22, c = Lk.id === 'hsb' ? '#8A2E24' : '#2F5B40';
      let s = kasten(len, { farbe: c, rand: '#1A0F0B', fenster: { b: 1.8, luecke: 0.9, rand: 2.4, farbe: '#D9D2BE' }, dach: '#6C7379', dachRx: 1.1 });
      s += R(0.2, -2.2, 1.6, 4.4, '#3A2E26') + R(len - 1.8, -2.2, 1.6, 4.4, '#3A2E26');
      return { len, svg: '<g transform="scale(1 .8)">' + s + '</g>' };
    }
    // grüner Personenwagen: gewölbtes Dach mit Lüftern
    const len = 30;
    let s = kasten(len, { farbe: '#2F5B40', rand: '#15291D', fenster: { b: 1.9, luecke: 0.9, rand: 1.8, farbe: '#C9D3CC' } });
    s += R(0.4, -2.3, len - 0.8, 4.6, '#7F868D', ' rx="1.2"') + L('M0.8 0H' + (len - 0.8), '#959CA3', 0.5);
    for (let x = 3.5; x < len - 2; x += 4.2) s += C(x, 0, 0.5, '#5E656C', ' stroke="#A9B0B7" stroke-width=".12"');
    return { len, svg: s + uebergang(0) + uebergang(len) };
  }

  // ================================================================ Zusammensetzung der Züge
  function teil(Lk, art, i) {
    const id = Lk.id;
    if (ICE_FORM[id]) return ice(id, art);
    if (Lk.antrieb === 'dampf') {
      if (art === 'lok') return dampfLok(Lk.bau);
      if (art === 'tender') return tender(Lk.bau);
      return dampfWagen(Lk, art, i);
    }
    if (art === 'gueter') return gueter((i + (id === 'vectron' ? 2 : id === 'br232' ? 1 : 0)) % 5);
    switch (id) {
      case 'rs1': return rs1();
      case 'lint': case 'br612': case 'talent2': case 'desirohc': case 'flirt': case 'br423': case 'mireo': case 'ilint': return trieb(id, art);
      case 'icel': return art === 'lok' ? elok({ farbe: WEISS, rand: '#9AA3AD', dach: '#9AA1A8', form: 'vectron', streifen: ICE_ROT }) : talgo(art);
      case 'br232': return ludmilla();
      case 'br185': return elok({ farbe: CARGO, rand: '#6E0B0F' });
      case 'vectron': return elok({ farbe: CARGO, rand: '#6E0B0F', dach: '#7E858C', form: 'vectron', streifen: '#E2E5E8' });
      case 'dosto': return art === 'lok' ? elok({ farbe: ROT, rand: '#7E0E12', streifen: '#E2E5E8' }) : dosto(art, false);
      case 'ic2': return art === 'lok' ? elok({ farbe: WEISS, rand: '#9AA3AD', dach: '#9AA1A8', streifen: ICE_ROT }) : dosto(art, true);
    }
    return elok({ farbe: '#6B737C' });   // unbekannte Lok: neutraler Kasten
  }
  const FOLGE = {
    ice4: [['kopf', 'mitte', 'mitte-strom', 'mitte', 'mitte', 'mitte-strom', 'schluss'], ['kopf', 'schluss']],
    ice3: [['kopf', 'mitte', 'mitte-strom', 'mitte-strom', 'mitte', 'schluss'], ['kopf', 'schluss']],
    ice3neo: [['kopf', 'mitte', 'mitte-strom', 'mitte-strom', 'mitte', 'schluss'], ['kopf', 'schluss']],
    iceT: [['kopf', 'mitte-strom', 'mitte', 'mitte-strom', 'schluss'], ['kopf', 'schluss']],
    ice1: [['kopf', 'mitte', 'mitte', 'bistro', 'mitte', 'mitte', 'schluss'], ['kopf', 'mitte', 'schluss']],
    ic2: [['lok', 'dosto', 'dosto', 'dosto', 'steuer'], ['lok', 'steuer']],
    dosto: [['lok', 'dosto', 'dosto', 'steuer'], ['lok', 'steuer']],
    desirohc: [['kopf', 'mitte', 'mitte', 'schluss'], ['kopf', 'schluss']],
    talent2: [['kopf', 'mitte', 'schluss'], ['kopf', 'schluss']],
    lint: [['kopf', 'schluss'], ['kopf', 'schluss']],
    br612: [['kopf', 'schluss'], ['kopf', 'schluss']],
    rs1: [['kopf'], ['kopf']],
    flirt: [['kopf', 'mitte-strom', 'mitte', 'schluss'], ['kopf', 'schluss']],
    br423: [['kopf', 'mitte-strom', 'mitte-strom', 'schluss'], ['kopf', 'schluss']],
    mireo: [['kopf', 'mitte-strom', 'schluss'], ['kopf', 'schluss']],
    ilint: [['kopf', 'schluss'], ['kopf', 'schluss']],
    icel: [['lok', 'talgo', 'talgo', 'talgo', 'talgo', 'talgo', 'talgo', 'steuer'], ['lok', 'steuer']],
    br232: [['lok', 'gueter', 'gueter', 'gueter', 'gueter'], ['lok', 'gueter']],
    br185: [['lok', 'gueter', 'gueter', 'gueter', 'gueter', 'gueter'], ['lok', 'gueter', 'gueter']],
    vectron: [['lok', 'gueter', 'gueter', 'gueter', 'gueter', 'gueter'], ['lok', 'gueter', 'gueter']]
  };
  function folge(Lk, nah) {
    if (FOLGE[Lk.id]) return FOLGE[Lk.id][nah ? 0 : 1];
    const B = Lk.bild || {}, a = ['lok'];
    if (Lk.bau && Lk.bau.tender) a.push('tender');
    const n = nah ? (B.n || 2) : 1;
    for (let k = 0; k < n; k++) a.push(B.wagen || 'gruen');
    return a;
  }
  const speicher = {};
  /** alle Fahrzeuge des Zuges, Spitze zuerst */
  function teile(Lk, nah) {
    let gz = 0;
    return folge(Lk, nah).map(art => {
      const i = art === 'gueter' || art === 'frueh' ? gz++ : 0;
      const key = Lk.id + '|' + art + '|' + i;
      if (!speicher[key]) { const t = teil(Lk, art, i); speicher[key] = { key, art, len: t.len, svg: t.svg }; }
      return speicher[key];
    });
  }
  /** ganzer Zug als SVG-Gruppe (Vorschau, Tests): Spitze rechts */
  function zug(Lk, nah, abstand) {
    const ab = abstand == null ? 0.6 : abstand;
    let x = 0; const g = [];
    teile(Lk, nah).slice().reverse().forEach(t => { g.push('<g transform="translate(' + f(x) + ' 0)">' + t.svg + '</g>'); x += t.len + ab; });
    return { len: x - ab, svg: g.join('') };
  }
  return { teil, teile, zug, folge };
})();
if (typeof module !== 'undefined') module.exports = VolldampfDraufsicht;
