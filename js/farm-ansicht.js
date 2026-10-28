// Hof-Farm: Darstellung der Spielwelt (Draufsicht mit "falscher 3/4-Tiefe": Licht von links oben, eingebackene
// Schatten nach rechts unten, Felder mit Vorderkante, Gebaeude mit sichtbarer Front). Maschinen fahren selbststaendig;
// hier wird nur aus dem Spielstand (FarmModell) und der Uhrzeit berechnet, wo was steht und wie die Felder aussehen.
// Leistung (altes Tablet): statischer Boden in vorgerenderten Kacheln (LRU), Feldoberflaeche je Feld+Zustand offscreen,
// Bahn-Fortschritt per Teil-drawImage, Partikel-Pool <= 40, Text/Icons als Bild. Kein shadowBlur/filter, keine
// Muster/Verlaeufe pro Frame.
const FarmAnsicht = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, Z = D.ZELLE, K = D.MASCHINEN_SKALA;
  const INK = '#0A0D26';
  const KANTE = 14;              // Feld-Vorderkante (reine Optik unter dem Feld)
  const PARTIKEL_MAX = 40;
  let baeume = [], flecken = [];
  let parkCache = { schluessel: '', pos: {} };
  const partikel = [];
  let dprAkt = 1;                // Geraetepixel je CSS-Pixel (aus dem Canvas, je Frame)
  let zone = { oben: 110, unten: 120, links: 12, rechts: 12 };
  let markierung = null;
  let blasenListe = [];
  let letzteCam = null;

  // ----------------------------------------------------------------------------------------------
  // Hilfen
  // ----------------------------------------------------------------------------------------------
  function inRect(px, py, r, rand) { rand = rand || 0; return px >= r.x - rand && px <= r.x + r.w + rand && py >= r.y - rand && py <= r.y + r.h + rand; }
  function schneidet(a, x, y, w, h) { return !(x > a.x1 || x + w < a.x0 || y > a.y1 || y + h < a.y0); }
  function hz(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function stufeVon(w) { return w < 0.1 ? 0 : w < 0.3 ? 1 : w < 0.55 ? 2 : 3; }
  function stil() { return (typeof FarmStil !== 'undefined' && FarmStil) ? FarmStil : null; }
  function effekteWenig() { const s = stil(); try { return !!(s && s.effekteWenig && s.effekteWenig()); } catch (e) { return false; } }
  // Arbeits-Budget je Frame fuer NEUE Kacheln/Feldbilder/Gebaeudebilder: mindestens eines, dann nur bis WERK_MS.
  // So ruckelt das Schwenken in neue Gegenden auf dem alten Tablet nicht; Fehlendes wird kurz grob vertreten.
  let werkT0 = 0, werkN = 0;
  const WERK_MS = 6;
  function werkStart() { werkT0 = performance.now(); werkN = 0; }
  function darfWerken() { return werkN === 0 || performance.now() - werkT0 < WERK_MS; }
  function fmtZahl(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  // ----------------------------------------------------------------------------------------------
  // Schrift + Text als Bild. Canvas-Text erst NACH FarmStil.schriftBereit() cachen (sonst wird die Ersatzschrift
  // eingebacken); bis dahin wird in eine Schmierflaeche gemalt und sofort kopiert.
  // ----------------------------------------------------------------------------------------------
  let schriftOk = true, schriftAngefragt = false;
  const textCache = {}; let textCacheN = 0;
  function textCacheLeeren() { Object.keys(textCache).forEach(k => delete textCache[k]); textCacheN = 0; }
  function schriftAnfragen() {
    if (schriftAngefragt) return;
    schriftAngefragt = true;
    const s = stil();
    if (s && typeof s.beiSchrift === 'function') {
      schriftOk = false;
      try { s.beiSchrift(() => { schriftOk = true; textCacheLeeren(); }); } catch (e) { schriftOk = true; }
    }
  }
  function font(px) { return stil() ? px + 'px "Lilita One", "Fredoka", system-ui, sans-serif' : 'bold ' + px + 'px system-ui, sans-serif'; }
  // Liefert ein Bild (Canvas, Geraetepixel) fuer key; malen(g, m) zeichnet es. Groesse ueber masse() = {w,h} in CSS-px.
  // ohneText=true: enthaelt keine Schrift -> darf immer gecacht werden.
  function textBild(key, masse, malen, ohneText) {
    const k = key + '@' + dprAkt;
    const cachen = schriftOk || ohneText;
    if (cachen && textCache[k]) return textCache[k];
    const m = masse(), wpx = Math.ceil(m.w * dprAkt), hpx = Math.ceil(m.h * dprAkt);
    if (cachen && textCacheN > 260) textCacheLeeren();
    const c = document.createElement('canvas'); c.width = wpx; c.height = hpx;
    const g = c.getContext('2d');
    g.setTransform(dprAkt, 0, 0, dprAkt, 0, 0);
    malen(g, m);
    c._w = m.w; c._h = m.h; c._sw = wpx; c._sh = hpx;
    if (cachen) { textCache[k] = c; textCacheN++; }
    return c;
  }
  function bildMalen(ctx, c, x, y) { ctx.drawImage(c, 0, 0, c._sw, c._sh, x, y, c._w, c._h); }
  const messC = document.createElement('canvas').getContext('2d');
  function textBreite(text, px) { messC.font = font(px); return messC.measureText(text).width; }
  // Pille mit Konturtext: bg = Fuellfarbe, links Platz fuer ein Icon (iconPx)
  function pille(text, px, bg, iconPx, textFarbe) {
    const key = 'p|' + text + '|' + px + '|' + bg + '|' + (iconPx || 0) + '|' + (textFarbe || '');
    return textBild(key, () => {
      const tw = textBreite(text, px), pad = px * 0.55;
      return { w: Math.ceil(tw + pad * 2 + (iconPx ? iconPx + 2 : 0) + 6), h: Math.ceil(px * 1.45 + 6) };
    }, (g, m) => {
      const h = m.h - 6, w = m.w - 6, r = h / 2;
      g.fillStyle = INK; G.rr(g, 1.5, 3.5, w + 3, h + 1.5, r + 1.5); g.fill();           // Lippe/Kontur unten
      G.rr(g, 1.5, 1.5, w + 3, h + 3, r + 1.5); g.fill();
      g.fillStyle = bg; G.rr(g, 3, 3, w, h - 2, r); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; G.rr(g, 3 + r * 0.6, 4.5, w - r * 1.2, h * 0.3, h * 0.15); g.fill();
      g.font = font(px); g.textAlign = 'center'; g.textBaseline = 'middle';
      const cx = 3 + (iconPx ? iconPx + 2 : 0) / 2 + w / 2, cy = 3 + (h - 2) / 2 + px * 0.06;
      g.lineJoin = 'round'; g.lineWidth = Math.max(3, px * 0.22); g.strokeStyle = INK; g.strokeText(text, cx, cy + 1);
      g.fillStyle = textFarbe || '#fff'; g.fillText(text, cx, cy);
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Icons: FarmStil.iconBild (gerastertes SVG, Geraetepixel) - solange nicht da: einfacher gezeichneter Ersatz (nie Emoji)
  // ----------------------------------------------------------------------------------------------
  const ersatzCache = {};
  function icon(name, cssPx) {
    const px = Math.max(8, Math.round(cssPx * dprAkt));
    const s = stil();
    if (s && s.iconBild) {
      try {
        if (!s.hatIcon || s.hatIcon(name)) { const c = s.iconBild(name, px); if (c) return c; }
      } catch (e) { /* Ersatz */ }
    }
    return ersatzIcon(name, px);
  }
  function ersatzIcon(name, px) {
    const key = name + '@' + px;
    if (ersatzCache[key]) return ersatzCache[key];
    const c = document.createElement('canvas'); c.width = px; c.height = px;
    const g = c.getContext('2d'); g.scale(px / 48, px / 48);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const kreis = (f, r) => { g.fillStyle = f; g.beginPath(); g.arc(24, 24, r || 19, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); };
    const fr = D.frucht && D.frucht(name);
    const tierDef = D.TIERE.find(t => t.id === name), betr = D.PRODUKTION.find(b => b.id === name);
    if (name === 'ernten') { // Sichel
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.arc(25, 21, 13, -2.6, 1.2); g.stroke();
      g.strokeStyle = '#E3E8EE'; g.lineWidth = 5; g.beginPath(); g.arc(25, 21, 13, -2.6, 1.2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(29, 33); g.lineTo(18, 43); g.stroke();
      g.strokeStyle = '#B97A3E'; g.lineWidth = 5; g.beginPath(); g.moveTo(29, 33); g.lineTo(18, 43); g.stroke();
    } else if (name === 'spross') {
      g.fillStyle = '#8C5830'; g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.ellipse(24, 38, 15, 6, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(24, 36); g.lineTo(24, 20); g.stroke();
      g.strokeStyle = '#3FD447'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 36); g.lineTo(24, 20); g.stroke();
      [[-1, 13], [1, 11]].forEach(b => { g.fillStyle = '#4BE35F'; g.beginPath(); g.ellipse(24 + b[0] * 8, b[1] + 6, 8, 4.5, b[0] * -0.5, 0, 7); g.fill(); g.stroke(); });
    } else if (name === 'traktor' || name === 'maehdrescher' || name === 'roder') {
      const f = name === 'traktor' ? '#3FD447' : name === 'roder' ? '#FF8A1A' : '#9BD43A';
      g.fillStyle = f; g.strokeStyle = INK; g.lineWidth = 2.6;
      G.rr(g, 8, 18, 30, 14, 3); g.fill(); g.stroke();
      g.fillStyle = '#8DF3FF'; G.rr(g, 12, 9, 14, 11, 2); g.fill(); g.stroke();
      [[15, 34, 8], [34, 36, 5.5]].forEach(r => { g.fillStyle = '#2A2D35'; g.beginPath(); g.arc(r[0], r[1], r[2], 0, 7); g.fill(); g.stroke(); g.fillStyle = '#C9CED6'; g.beginPath(); g.arc(r[0], r[1], r[2] * 0.4, 0, 7); g.fill(); });
      if (name !== 'traktor') { g.fillStyle = '#E3E8EE'; g.fillRect(37, 14, 5, 18); g.strokeRect(37, 14, 5, 18); }
    } else if (name === 'schloss') {
      g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(24, 20, 9, Math.PI, 0); g.stroke();
      g.strokeStyle = '#C9CED6'; g.lineWidth = 4; g.beginPath(); g.arc(24, 20, 9, Math.PI, 0); g.stroke();
      g.fillStyle = '#FFC531'; g.strokeStyle = INK; g.lineWidth = 2.6; G.rr(g, 11, 20, 26, 21, 4); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(24, 29, 3, 0, 7); g.fill(); g.fillRect(22.6, 29, 2.8, 7);
    } else if (name === 'muenze') {
      g.fillStyle = '#C26A00'; g.beginPath(); g.ellipse(24, 27, 19, 17, 0, 0, 7); g.fill();
      g.fillStyle = '#FFC531'; g.strokeStyle = '#5E3000'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(24, 23, 19, 17, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#FFAE00'; g.beginPath(); g.ellipse(24, 23, 12, 11, 0, 0, 7); g.fill();
      g.strokeStyle = '#FFE680'; g.lineWidth = 3; g.beginPath(); g.arc(25, 23, 6.5, 0.8, 5.5); g.stroke(); g.beginPath(); g.moveTo(16, 21); g.lineTo(26, 21); g.moveTo(16, 25.5); g.lineTo(26, 25.5); g.stroke();
    } else if (name === 'silo') {
      g.fillStyle = '#D5DDE2'; g.strokeStyle = INK; g.lineWidth = 2.6; G.rr(g, 13, 12, 22, 30, 3); g.fill(); g.stroke();
      g.fillStyle = '#F4F7F9'; g.beginPath(); g.ellipse(24, 12, 11, 5, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#F2424A'; g.fillRect(14.3, 33, 19.4, 4);
    } else if (name === 'boden' || name === 'stoppel') {
      const st = name === 'stoppel';
      g.fillStyle = st ? '#E7D28F' : '#A9693A'; g.strokeStyle = INK; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(5, 38); g.quadraticCurveTo(24, 6, 43, 38); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = st ? '#B9963E' : '#6E3E1C'; g.lineWidth = 2.2;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(13 + i * 7, 36); g.lineTo(st ? 12 + i * 7 : 16 + i * 6, st ? 26 - (i % 2) * 3 : 28); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(18, 22, 5, 2.2, -0.6, 0, 7); g.fill();
    } else if (name === 'futter') {
      g.fillStyle = '#B97A3E'; g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.moveTo(7, 22); g.lineTo(41, 22); g.lineTo(36, 38); g.lineTo(12, 38); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#F0C552'; g.beginPath(); g.ellipse(24, 22, 17, 5, 0, Math.PI, 0); g.fill(); g.stroke();
    } else if (fr) {
      const rf = G.fruchtFarben(name);
      kreis('#2F3A9A', 19);
      g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(24, 40); g.lineTo(24, 14); g.stroke();
      g.strokeStyle = '#6DB83A'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(24, 40); g.lineTo(24, 14); g.stroke();
      for (let i = 0; i < 4; i++) { [-1, 1].forEach(sd => { g.fillStyle = rf.bluete || rf.grund; g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.ellipse(24 + sd * 4.5, 16 + i * 5.5, 4.2, 2.6, sd * 0.6, 0, 7); g.fill(); g.stroke(); }); }
    } else if (tierDef) {
      kreis('#4BE35F', 19);
      g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.ellipse(24, 27, 11, 9, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.arc(17, 18, 4, 0, 7); g.arc(31, 18, 4, 0, 7); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(20, 25, 1.8, 0, 7); g.arc(28, 25, 1.8, 0, 7); g.fill();
    } else if (betr || ['fuhrpark', 'lager', 'haendler', 'betriebe', 'tierhof', 'haus'].indexOf(name) >= 0) {
      const farbe = betr ? betr.dach : name === 'haendler' ? '#F2424A' : name === 'lager' ? '#3A47B0' : name === 'fuhrpark' ? '#9a3b2e' : '#B9783F';
      kreis('#FFF6E0', 19);
      g.fillStyle = '#F4E9D2'; g.strokeStyle = INK; g.lineWidth = 2.4; g.fillRect(14, 24, 20, 13); g.strokeRect(14, 24, 20, 13);
      g.fillStyle = farbe; g.beginPath(); g.moveTo(10, 25); g.lineTo(24, 12); g.lineTo(38, 25); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = INK; g.fillRect(21, 29, 6, 8);
    } else { // Fragezeichen-Ersatz
      kreis('#7A4BF2', 19);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(17, 18); g.bezierCurveTo(17, 9, 31, 9, 31, 17); g.bezierCurveTo(31, 22, 24, 23, 24, 28); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(24, 36, 3.2, 0, 7); g.fill();
    }
    ersatzCache[key] = c;
    return c;
  }
  function iconMalen(ctx, name, cx, cy, cssPx) { const c = icon(name, cssPx); ctx.drawImage(c, cx - cssPx / 2, cy - cssPx / 2, cssPx, cssPx); }

  // ----------------------------------------------------------------------------------------------
  // Dekoration: Baeume, Wiesenflecken, Feldwege
  // ----------------------------------------------------------------------------------------------
  const WEGE = D.FELDER.map(f => {
    const w = M.wegPunkte(f.id), ex = w[2].x, fy = w[3].y, fw = f.c * Z;
    const r = [];
    const y0 = fy < D.STRASSE_Y ? fy - 13 : 1590, y1 = fy < D.STRASSE_Y ? 1500 : fy + 13;
    r.push({ x: ex - 13, y: y0, w: 26, h: y1 - y0 });
    if (ex < f.x) r.push({ x: ex - 13, y: fy - 13, w: f.x - ex + 13, h: 26 }); else r.push({ x: f.x + fw, y: fy - 13, w: ex + 13 - f.x - fw, h: 26 });
    return r;
  });
  function baumeErzeugen() {
    baeume = [];
    const rnd = G.zufall(4711);
    const sperr = [];
    D.FELDER.forEach(f => sperr.push({ x: f.x - 56, y: f.y - 56, w: f.c * Z + 112, h: f.r * Z + 112 + KANTE }));
    D.STRASSEN.forEach(s => sperr.push({ x: s.x - 50, y: s.y - 50, w: s.w + 100, h: s.h + 100 }));
    WEGE.forEach(ws => ws.forEach(r => sperr.push({ x: r.x - 34, y: r.y - 34, w: r.w + 68, h: r.h + 68 })));
    sperr.push({ x: D.HOF.x - 50, y: D.HOF.y - 50, w: D.HOF.w + 100, h: D.HOF.h + 100 });
    sperr.push({ x: D.PLATZ_LANDHANDEL.x - 50, y: D.PLATZ_LANDHANDEL.y - 50, w: D.PLATZ_LANDHANDEL.w + 100, h: D.PLATZ_LANDHANDEL.h + 450 });
    D.GEBAEUDE.forEach(g => sperr.push({ x: g.x - 70, y: g.y - 70, w: g.w + 140, h: g.h + 140 }));
    D.DEKO.forEach(g => { const w = g.w || g.r * 2, h = g.h || g.r * 2; sperr.push({ x: (g.art === 'windrad' ? g.x - g.r : g.x) - 40, y: (g.art === 'windrad' ? g.y - g.r : g.y) - 40, w: w + 80, h: h + 80 }); });
    D.PRODUKTION.forEach(g => sperr.push({ x: g.x - 50, y: g.y - 50, w: g.w + 100, h: g.h + 100 }));
    sperr.push({ x: D.TIERHOF.x - 60, y: D.TIERHOF.y - 60, w: D.TIERHOF.w + 120, h: D.TIERHOF.h + 120 });
    sperr.push({ x: 2780, y: 1590, w: 320, h: 470 });
    for (let n = 0; n < 2600 && baeume.length < 520; n++) {
      const x = 30 + rnd() * (D.WELT.b - 60), y = 30 + rnd() * (D.WELT.h - 60);
      const rand = Math.min(x, y, D.WELT.b - x, D.WELT.h - y);
      if (rand > 170 && rnd() < 0.78) continue;
      if (sperr.some(r => inRect(x, y, r))) continue;
      baeume.push({ x, y, v: (rnd() * 6) | 0 });
    }
    baeume.sort((a, b) => a.y - b.y);
    const r2 = G.zufall(99);
    flecken = [];
    for (let i = 0; i < 340; i++) flecken.push({ x: r2() * D.WELT.b, y: r2() * D.WELT.h, r: 40 + r2() * 120, k: 0.45 + r2() * 0.4, hell: r2() < 0.55, a: r2() * 3 });
  }

  // ----------------------------------------------------------------------------------------------
  // Felder: Bahnen und Fahrwege (Modell-Geometrie - NICHT veraendern)
  // ----------------------------------------------------------------------------------------------
  function bahnen(feldId, breite) {
    const f = D.feld(feldId), W = f.c * Z, H = f.r * Z;
    const horizontal = W >= H;
    const quer = horizontal ? H : W, laenge = horizontal ? W : H;
    const laneW = Math.max(16, breite);
    const n = Math.max(1, Math.ceil(quer / laneW));
    return { f, W, H, horizontal, quer, laenge, laneW, n };
  }
  function bahnMitte(b, i) { return b.laneW >= b.quer ? b.quer / 2 : Math.min((i + 0.5) * b.laneW, b.quer - b.laneW / 2); }
  // Bahn-Geometrie eines Einsatzes. d = Abstand Arbeitslinie - Bezugspunkt der Maschine in Fahrtrichtung
  // (Traktor mit Geraet: negativ, das Geraet haengt hinten; Erntemaschine: positiv, das Schneidwerk sitzt vorn).
  // delta0 = Richtung der ersten Bahn: der Einsatz beginnt an der Seite, die der Zufahrt am naechsten liegt.
  function bahnGeo(feldId, breite, d) {
    const b = bahnen(feldId, breite), f = b.f;
    const ex = M.wegPunkte(feldId)[2].x;
    b.delta0 = b.horizontal ? (ex < f.x ? 1 : -1) : ((f.y + b.H / 2) < D.STRASSE_Y ? -1 : 1);
    b.d = d;
    return b;
  }
  const bahnRichtung = (b, i) => b.delta0 * (i % 2 === 0 ? 1 : -1);
  const TURN = 0.1;   // Anteil der Bahnzeit fuer das Wenden am Feldende
  function weltPos(b, A, Q) { return b.horizontal ? { x: b.f.x + A, y: b.f.y + Q } : { x: b.f.x + Q, y: b.f.y + A }; }
  function weltWinkel(b, dA, dQ) { return b.horizontal ? Math.atan2(dQ, dA) : Math.atan2(dA, dQ); }
  function refPose(b, p) {
    const u = Math.min(0.99999, Math.max(0, p)) * b.n;
    const i = Math.floor(u), fr = u - i, delta = bahnRichtung(b, i);
    const letzte = i === b.n - 1;
    let A, Q, a;
    if (fr < 1 - TURN || letzte) {
      const s = -b.d + Math.min(1, fr / (1 - TURN)) * b.laenge;
      A = delta > 0 ? s : b.laenge - s; Q = bahnMitte(b, i);
      a = weltWinkel(b, delta, 0);
    } else {
      const th = Math.PI * (fr - (1 - TURN)) / TURN;
      const dq = bahnMitte(b, i + 1) - bahnMitte(b, i), r = dq / 2;
      const s = (b.laenge - b.d) + r * Math.sin(th);
      A = delta > 0 ? s : b.laenge - s;
      Q = bahnMitte(b, i) + dq * (1 - Math.cos(th)) / 2;
      a = weltWinkel(b, delta * r * Math.cos(th), r * Math.sin(th));
    }
    const pos = weltPos(b, A, Q);
    return { x: pos.x, y: pos.y, a, work: { x: pos.x + Math.cos(a) * b.d, y: pos.y + Math.sin(a) * b.d }, gerade: fr < 1 - TURN || letzte };
  }
  function runden(pts, R) {
    const out = [];
    const nachbar = (a, b2, t) => ({ x: a.x + (b2.x - a.x) * t, y: a.y + (b2.y - a.y) * t });
    out.push(pts[0]);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], c = pts[i], e = pts[i + 1];
      const l1 = Math.hypot(c.x - a.x, c.y - a.y), l2 = Math.hypot(e.x - c.x, e.y - c.y);
      if (l1 < 1 || l2 < 1) continue;
      const r = Math.min(R, l1 / 2, l2 / 2);
      const p1 = nachbar(c, a, r / l1), p2 = nachbar(c, e, r / l2);
      const n = Math.max(6, Math.round(r / 3));
      for (let k = 0; k <= n; k++) {
        const t = k / n, u = 1 - t;
        out.push({ x: u * u * p1.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * c.y + t * t * p2.y });
      }
    }
    out.push(pts[pts.length - 1]);
    const dicht = [{ x: out[0].x, y: out[0].y, s: 0 }];
    let s = 0;
    for (let i = 1; i < out.length; i++) {
      const l = Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
      if (l < 0.0001) continue;
      const teile = Math.max(1, Math.ceil(l / 5));
      for (let k = 1; k <= teile; k++) {
        const t = k / teile;
        dicht.push({ x: out[i - 1].x + (out[i].x - out[i - 1].x) * t, y: out[i - 1].y + (out[i].y - out[i - 1].y) * t, s: s + l * t });
      }
      s += l;
    }
    dicht.laenge = s;
    return dicht;
  }
  function versetzen(linie, off) {
    const n = linie.length;
    const neu = linie.map((q, i) => {
      const a = linie[Math.max(0, i - 2)], c = linie[Math.min(n - 1, i + 2)];
      const tx = c.x - a.x, ty = c.y - a.y, tl = Math.hypot(tx, ty) || 1;
      const k = Math.min(1, q.s / 70, (linie.laenge - q.s) / 70) * off;
      return { x: q.x - ty / tl * k, y: q.y + tx / tl * k, s: q.s };
    });
    neu.laenge = linie.laenge;
    return neu;
  }
  function entlangDicht(linie, p) {
    const n = linie.length;
    if (n < 2) return { x: linie[0].x, y: linie[0].y, a: 0 };
    const ziel = Math.max(0, Math.min(1, p)) * linie.laenge;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (linie[mid].s <= ziel) lo = mid; else hi = mid; }
    const a = linie[lo], c = linie[hi], l = c.s - a.s, t = l > 0 ? (ziel - a.s) / l : 0;
    const v = linie[Math.max(0, lo - 1)], w = linie[Math.min(n - 1, hi + 1)];
    return { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t, a: Math.atan2(w.y - v.y, w.x - v.x) };
  }
  const geoCache = {};
  function einsatzGeo(job, breite, d) {
    const key = job.id;
    if (geoCache[key]) return geoCache[key];
    const b = bahnGeo(job.feld, breite, d), f = b.f, weg = M.wegPunkte(job.feld);
    const gate = weg[0], sy = D.STRASSE_Y, ex = weg[2].x;
    const dir = a => ({ x: Math.cos(a), y: Math.sin(a) });
    const rand = Math.abs(d) + 46;
    const off = 14 + (job.id % 3) * 18;
    const p0 = refPose(b, 0), d0 = dir(p0.a);
    const aus = { x: p0.x - d0.x * rand, y: p0.y - d0.y * rand };
    const hin = [{ x: gate.x, y: gate.y }, { x: gate.x, y: sy }, { x: ex, y: sy }, { x: ex, y: aus.y }];
    if (!b.horizontal) hin.push({ x: aus.x, y: aus.y });
    hin.push({ x: aus.x, y: aus.y }); hin.push({ x: p0.x, y: p0.y });
    const pe = refPose(b, 1), de = dir(pe.a);
    const aus2 = { x: pe.x + de.x * rand, y: pe.y + de.y * rand };
    const rueck = [{ x: pe.x, y: pe.y }, aus2];
    if (b.horizontal) {
      const endeLinks = de.x < 0, lueckeLinks = ex < f.x;
      if (endeLinks !== lueckeLinks) {
        const yRand = (f.y + b.H / 2) < sy ? f.y + b.H + 30 : f.y - 30;
        rueck.push({ x: aus2.x, y: yRand }); rueck.push({ x: ex, y: yRand });
      } else rueck.push({ x: ex, y: aus2.y });
    } else rueck.push({ x: ex, y: aus2.y });
    rueck.push({ x: ex, y: sy }); rueck.push({ x: gate.x, y: sy }); rueck.push({ x: gate.x, y: gate.y });
    const geo = { b, hin: versetzen(runden(hin, 46), off), rueck: versetzen(runden(rueck, 46), off) };
    geoCache[key] = geo;
    return geo;
  }

  // ----------------------------------------------------------------------------------------------
  // Maschinen: Parkplaetze und Einsatz-Positionen
  // ----------------------------------------------------------------------------------------------
  function halbmasse(d) {
    if (d.art === 'traktor') return [(d.b * 0.5 + 4) * K, (d.l * 0.5 + 8) * K];
    if (d.art === 'ernter') return [(Math.max(d.w, d.b) * 0.5 + 4) * K, (d.l * 0.55 + 20) * K];
    return [(d.w * 0.5 + 4) * K, (d.len * 0.5 + 8) * K];
  }
  function parkplaetze(S) {
    const schluessel = S.flotte.map(m => m.uid + m.id).join(',');
    if (parkCache.schluessel === schluessel) return parkCache.pos;
    const pos = {}, platziert = [];
    const zeilen = [1960, 2090, 2210, 2330];
    S.flotte.forEach(m => {
      const d = D.def(m.id), [hw, hl] = halbmasse(d);
      let ok = false;
      for (let zi = 0; zi < zeilen.length && !ok; zi++) {
        for (let x = 1070 + hw; x < 2080 - hw; x += 12) {
          if (platziert.every(o => Math.abs(o.x - x) >= hw + o.hw || Math.abs(o.y - zeilen[zi]) >= hl + o.hl)) {
            pos[m.uid] = { x, y: zeilen[zi] }; platziert.push({ x, y: zeilen[zi], hw, hl }); ok = true; break;
          }
        }
      }
      if (!ok) { pos[m.uid] = { x: 1100, y: 2330 }; }
    });
    parkCache = { schluessel, pos };
    return pos;
  }
  function jobPosen(job, jetzt) {
    const st = M.jobStand(job, jetzt);
    const tm = M.maschine(job.traktor), gm = job.geraet ? M.maschine(job.geraet) : null;
    const td = D.def(tm.id), gd = gm ? D.def(gm.id) : null;
    const breite = (gd ? gd.w : td.w) * K;
    const d = (gd ? -(td.l * 0.38 + (gd.len - 6)) : (td.l * 0.2 + 14 + (td.typ === 'rodemaschine' ? 28 : 24))) * K;
    const geo = einsatzGeo(job, breite, d);
    let pose, arbeitend = false, arbeitslinie = null;
    if (st.teil === 'hin') pose = entlangDicht(geo.hin, st.p);
    else if (st.teil === 'rueck') pose = entlangDicht(geo.rueck, st.p);
    else {
      const r = refPose(geo.b, st.p);
      pose = { x: r.x, y: r.y, a: r.a };
      arbeitslinie = r.work; arbeitend = r.gerade;
    }
    return { st, pose, arbeitend, arbeitslinie, b: geo.b, tm, gm, td, gd };
  }
  function zeichneZugmaschine(ctx, m, x, y, a) {
    const d = D.def(m.id), s = G.fuerDef(d);
    G.zeichne(ctx, s.koerper, x, y, a, true, K);
    if (s.rad) {
      const ax = (d.art === 'traktor' ? d.achs : -d.achs) * K;
      const hr = (d.art === 'traktor' ? d.b * 0.34 : d.b * 0.46) * K;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let sd = -1; sd <= 1; sd += 2) {
        const ly = sd * hr;
        G.zeichne(ctx, s.rad, x + ca * ax - sa * ly, y + sa * ax + ca * ly, a, false, K);
      }
    }
  }
  function zeichneGeraetAm(ctx, g, tm, x, y, a, arbeitend) {
    const d = D.def(tm.id), gd = D.def(g.id);
    const hx = x - Math.cos(a) * d.l * 0.38 * K, hy = y - Math.sin(a) * d.l * 0.38 * K;
    G.zeichne(ctx, G.fuerDef(gd).koerper, hx, hy, a, true, K);
    if (arbeitend) { const f = G.faecher(gd); if (f) G.zeichne(ctx, f, hx, hy, a, false, K); }
  }

  // ---- Partikel-Pool (<= 40): Staub, Spreu, Rauch. Ein vorgerendertes Puff-Bild je Farbe ----
  const FARBE_STAUB = 'rgb(176,128,80)', FARBE_SPREU = 'rgb(240,214,120)', FARBE_WEISS = 'rgb(246,246,240)', FARBE_NEBEL = 'rgb(190,228,255)', FARBE_RAUCH = 'rgb(130,130,128)', FARBE_DAMPF = 'rgb(240,240,236)', FARBE_WEG = 'rgb(214,184,130)';
  function staub(x, y, farbe, dt, rate) {
    if (partikel.length >= PARTIKEL_MAX - 6 || Math.random() > dt * (rate || 14)) return;
    const w = Math.random() * 6.283;
    partikel.push({ x, y, vx: Math.cos(w) * 12, vy: Math.sin(w) * 12 - 3, t: 0, max: 0.7 + Math.random() * 0.7, bild: G.puff(farbe), r: 4 + Math.random() * 4, rauch: false });
  }
  function rauch(x, y, dt, rate, hell) {
    if (partikel.length >= PARTIKEL_MAX || Math.random() > dt * rate) return;
    partikel.push({ x: x + (Math.random() - 0.5) * 3, y, vx: 5 + Math.random() * 5, vy: -(9 + Math.random() * 6), t: 0, max: 1.2 + Math.random() * 0.9, bild: G.puff(hell ? FARBE_DAMPF : FARBE_RAUCH), r: 3 + Math.random() * 2, rauch: true });
  }
  function partikelStep(dt) {
    for (let i = partikel.length - 1; i >= 0; i--) {
      const p = partikel[i];
      p.t += dt;
      if (p.t >= p.max) { partikel.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; if (!p.rauch) { p.vx *= 0.96; p.vy *= 0.96; }
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Gebaeude in 3/4-Sicht: Dach (hinten hell, First, vorn dunkler) oben, Frontwand unten - alles im Grundriss
  // ----------------------------------------------------------------------------------------------
  function bodenSchatten(g, x, y, w, h) {
    g.fillStyle = 'rgba(30,48,12,0.20)'; g.fillRect(x + 8, y + 10, w, h);
    g.fillStyle = 'rgba(30,48,12,0.12)'; g.fillRect(x + 16, y + 18, w, h);
  }
  function fenster(g, x, y, w, h, nacht) {
    g.fillStyle = '#FFFFFF'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = nacht ? '#FFD86B' : '#7FC4F0'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x, y + h * 0.6); g.lineTo(x + w * 0.6, y); g.lineTo(x + w * 0.85, y); g.lineTo(x, y + h * 0.95); g.closePath(); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(x + w / 2 - 0.8, y, 1.6, h);
    g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }
  function tor(g, x, y, w, h, farbe) {
    g.fillStyle = farbe || '#8E96A3'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = y + 4; yy < y + h; yy += 5) g.fillRect(x, yy, w, 1.5);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, 2);
    g.strokeStyle = INK; g.lineWidth = 1.8; g.strokeRect(x, y, w, h);
  }
  function tuer(g, x, y, w, h, farbe) {
    g.fillStyle = farbe; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x + 2, y + 2, w * 0.3, h - 4);
    g.fillStyle = '#FFD86B'; g.beginPath(); g.arc(x + w - 4, y + h * 0.55, 1.4, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(x, y, w, h);
  }
  function kamin(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4, y + 5, 14, 14);
    g.fillStyle = '#A35A3C'; g.fillRect(x, y, 14, 16);
    g.fillStyle = '#C7765A'; g.fillRect(x, y, 14, 5);
    g.fillStyle = '#2A1E18'; g.fillRect(x + 3, y + 1, 8, 3);
    g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(x, y, 14, 16);
  }
  function gebaeude(g, x, y, w, h, o) {
    const wandH = Math.round(o.wandH || Math.max(24, Math.min(56, h * 0.42)));
    const dachH = h - wandH, ue = o.ue === undefined ? 6 : o.ue;
    if (!o.ohneSchatten) bodenSchatten(g, x, y, w + ue, h + 2);
    const wy = y + dachH;
    g.fillStyle = o.wand; g.fillRect(x, wy, w, wandH);
    if (o.holz) { g.fillStyle = 'rgba(60,30,10,0.22)'; for (let xx = x + 5; xx < x + w; xx += 7) g.fillRect(xx, wy, 1.4, wandH); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let xx = x + 1; xx < x + w; xx += 7) g.fillRect(xx, wy, 1.2, wandH); }
    if (o.ziegelwand) { g.fillStyle = 'rgba(90,30,15,0.18)'; for (let yy = wy + 5, k = 0; yy < wy + wandH; yy += 5, k++) { g.fillRect(x, yy, w, 1); for (let xx = x + (k % 2) * 6; xx < x + w; xx += 12) g.fillRect(xx, yy - 5, 1, 5); } }
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x, wy + wandH - 5, w, 5);
    if (o.front) o.front(g, x, wy, w, wandH);
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.fillRect(x, wy, w, 5);
    g.strokeStyle = INK; g.lineWidth = 2.2; g.strokeRect(x, wy, w, wandH);
    // Dach
    const dx = x - ue, dw = w + 2 * ue, dy = y - 2, dh = dachH + 5, fy = dy + Math.round(dh * 0.42);
    const hell = G.abdunkeln(o.dach, 0.2), dunkel = G.abdunkeln(o.dach, -0.22);
    g.fillStyle = hell; g.fillRect(dx, dy, dw, fy - dy);
    g.fillStyle = o.dach; g.fillRect(dx, fy, dw, dy + dh - fy);
    if (o.blech) {
      g.fillStyle = 'rgba(255,255,255,0.22)'; for (let xx = dx + 5; xx < dx + dw; xx += 8) g.fillRect(xx, dy, 1.6, dh);
      g.fillStyle = 'rgba(0,0,0,0.16)'; for (let xx = dx + 7; xx < dx + dw; xx += 8) g.fillRect(xx, dy, 1.2, dh);
    } else {
      g.fillStyle = 'rgba(0,0,0,0.16)';
      for (let yy = dy + 6, k = 0; yy < dy + dh - 3; yy += 6, k++) {
        if (Math.abs(yy - fy) < 3) continue;
        g.fillRect(dx, yy, dw, 1.2);
        for (let xx = dx + (k % 2) * 6; xx < dx + dw; xx += 12) g.fillRect(xx, yy - 6, 1, 6);
      }
    }
    g.fillStyle = G.abdunkeln(o.dach, 0.42); g.fillRect(dx, fy - 2.5, dw, 4);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(dx, fy + 1.5, dw, 2);
    g.fillStyle = dunkel; g.fillRect(dx, dy + dh - 5, dw, 5);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(dx + 6, dy + 3, dw * 0.32, 2.4);
    if (o.dachDeko) o.dachDeko(g, dx, dy, dw, dh, fy);
    g.strokeStyle = INK; g.lineWidth = 2.6; g.strokeRect(dx, dy, dw, dh);
  }
  // Bauplatz (noch nicht gebaut): Kies, gestrichelte Absperrung, Pfosten
  function bauplatz(g, x, y, w, h) {
    g.fillStyle = 'rgba(30,48,12,0.14)'; g.fillRect(x + 5, y + 6, w, h);
    g.fillStyle = G.muster(g, G.textur('kies')); g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(120,90,50,0.18)'; g.fillRect(x, y, w, h);
    g.setLineDash([10, 7]); g.lineWidth = 3; g.strokeStyle = '#FFF07A'; g.strokeRect(x + 4, y + 4, w - 8, h - 8); g.setLineDash([]);
    [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]].forEach(p => {
      g.fillStyle = INK; g.fillRect(p[0] - 3, p[1] - 9, 6, 12);
      g.fillStyle = '#F2424A'; g.fillRect(p[0] - 2, p[1] - 8, 4, 4); g.fillStyle = '#fff'; g.fillRect(p[0] - 2, p[1] - 4, 4, 3); g.fillStyle = '#F2424A'; g.fillRect(p[0] - 2, p[1] - 1, 4, 3);
    });
  }
  function silo3d(g, cx, cy, r) {
    const top = cy - r * 0.8, bot = cy + r * 0.5, ry = r * 0.36;
    g.fillStyle = 'rgba(30,48,12,0.20)'; g.beginPath(); g.ellipse(cx + 14, bot + 8, r * 1.05, ry * 1.2, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx + r, top + 10); g.lineTo(cx + r + 22, top + 30); g.lineTo(cx + r + 22, bot + 8); g.lineTo(cx + r, bot); g.closePath(); g.fill();
    const gr = g.createLinearGradient(cx - r, 0, cx + r, 0);
    gr.addColorStop(0, '#F6F9FB'); gr.addColorStop(0.35, '#DCE3E8'); gr.addColorStop(0.75, '#AEBAC2'); gr.addColorStop(1, '#8794A0');
    const koerper = () => { g.beginPath(); g.moveTo(cx - r, top); g.lineTo(cx - r, bot); g.ellipse(cx, bot, r, ry, 0, Math.PI, 0, true); g.lineTo(cx + r, top); g.closePath(); };
    g.fillStyle = gr; koerper(); g.fill();
    g.strokeStyle = 'rgba(70,85,95,0.35)'; g.lineWidth = 1.2;
    for (let yy = top + 12; yy < bot; yy += 11) { g.beginPath(); g.ellipse(cx, yy, r, ry, 0, Math.PI, 0, true); g.stroke(); }
    g.strokeStyle = '#E2453A'; g.lineWidth = 5; g.beginPath(); g.ellipse(cx, bot - 8, r - 1, ry, 0, Math.PI, 0, true); g.stroke();
    g.strokeStyle = '#6A757D'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - r * 0.55, top + 6); g.lineTo(cx - r * 0.55, bot + ry * 0.8); g.moveTo(cx - r * 0.38, top + 6); g.lineTo(cx - r * 0.38, bot + ry * 0.9); g.stroke();
    for (let yy = top + 10; yy < bot + ry * 0.7; yy += 6) { g.beginPath(); g.moveTo(cx - r * 0.55, yy); g.lineTo(cx - r * 0.38, yy); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 2.6; koerper(); g.stroke();
    g.fillStyle = '#E9EEF1'; g.beginPath(); g.ellipse(cx, top, r, ry, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#F7FAFC'; g.beginPath(); g.ellipse(cx - 3, top - 4, r * 0.7, ry * 0.68, 0, 0, 7); g.fill();
    g.fillStyle = '#8D99A2'; g.beginPath(); g.ellipse(cx, top - 6, r * 0.14, ry * 0.18, 0, 0, 7); g.fill(); g.lineWidth = 1.4; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(cx - r * 0.8, top + 8, 4, bot - top - 8);
  }
  function heuballen(g, x, y, r) {
    g.fillStyle = 'rgba(30,48,12,0.22)'; g.beginPath(); g.ellipse(x + 6, y + 8, r, r * 0.8, 0, 0, 7); g.fill();
    g.fillStyle = '#C99A3C'; g.beginPath(); g.arc(x, y + 3, r, 0, 7); g.fill();
    g.fillStyle = '#ECD27A'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(150,105,30,0.6)'; g.lineWidth = 1.2;
    g.beginPath(); for (let a = 0; a < 18; a += 0.3) { const rr = 1 + a * r / 19; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (a === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.15, -0.6, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
  // Statische Gebaeude (in den Boden-Kacheln)
  function zeichneGebaeudeStatisch(g, r) {
    D.GEBAEUDE.forEach(b => {
      if (!schneidet(r, b.x - 20, b.y - 20, b.w + 60, b.h + 60)) return;
      if (b.art === 'halle') {
        gebaeude(g, b.x, b.y, b.w, b.h, { dach: '#7E8A9C', wand: '#C9473A', blech: true, wandH: 62, front: (g2, x, wy, w, wh) => {
          const tw = (w - 80) / 3;
          for (let i = 0; i < 3; i++) tor(g2, x + 20 + i * (tw + 20), wy + 12, tw, wh - 12, i === 1 ? '#3A4250' : '#9AA3B0');
          g2.fillStyle = '#F7F3EA'; g2.fillRect(x, wy + 5, w, 4);
        }, dachDeko: (g2, dx, dy, dw) => { for (let k = 0; k < 3; k++) { g2.fillStyle = 'rgba(180,230,255,0.85)'; g2.fillRect(dx + 40 + k * (dw - 80) / 2 - 14, dy + 10, 28, 12); g2.strokeStyle = INK; g2.lineWidth = 1.4; g2.strokeRect(dx + 40 + k * (dw - 80) / 2 - 14, dy + 10, 28, 12); } } });
      } else if (b.art === 'haus') {
        gebaeude(g, b.x, b.y, b.w, b.h, { dach: '#C8502F', wand: '#F6EBD3', wandH: 54, front: (g2, x, wy, w, wh) => {
          g2.strokeStyle = '#7A4A24'; g2.lineWidth = 3;
          g2.beginPath(); g2.moveTo(x, wy + wh * 0.5); g2.lineTo(x + w, wy + wh * 0.5);
          for (let xx = x + 22; xx < x + w; xx += 32) { g2.moveTo(xx, wy); g2.lineTo(xx, wy + wh); }
          g2.moveTo(x + 6, wy + wh * 0.5); g2.lineTo(x + 22, wy + 6); g2.moveTo(x + w - 6, wy + wh * 0.5); g2.lineTo(x + w - 22, wy + 6); g2.stroke();
          fenster(g2, x + 30, wy + 12, 14, 12); fenster(g2, x + w - 44, wy + 12, 14, 12);
          tuer(g2, x + w / 2 - 9, wy + 18, 18, wh - 18, '#2E8B3C');
          ['#e8556b', '#f2c21a', '#ffffff', '#e8556b'].forEach((c, k) => { g2.fillStyle = c; g2.beginPath(); g2.arc(x + 31 + k * 4, wy + 27, 2.2, 0, 7); g2.arc(x + w - 43 + k * 4, wy + 27, 2.2, 0, 7); g2.fill(); });
        }, dachDeko: (g2, dx, dy, dw) => { kamin(g2, dx + 118, dy + 6); fenster(g2, dx + 40, dy + 16, 16, 10); } });
        g.fillStyle = '#D9D2C0'; g.fillRect(b.x + b.w / 2 - 16, b.y + b.h, 32, 6); g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(b.x + b.w / 2 - 16, b.y + b.h, 32, 6);
      } else if (b.art === 'handel') {
        gebaeude(g, b.x, b.y, b.w, b.h, { dach: '#53708A', wand: '#E9E2D2', blech: true, wandH: 60, front: (g2, x, wy, w, wh) => {
          g2.fillStyle = '#2B3589'; g2.fillRect(x + 20, wy + 8, w - 40, 12); g2.fillStyle = '#FFC61A'; g2.fillRect(x + 20, wy + 18, w - 40, 3);
          tor(g2, x + 30, wy + 26, 80, wh - 26, '#8E96A3'); tor(g2, x + 130, wy + 26, 80, wh - 26, '#3A4250');
          for (let k = 0; k < 5; k++) fenster(g2, x + 240 + k * 34, wy + 30, 20, 14);
        } });
        // Saecke + Palette
        g.fillStyle = '#B98A55'; g.fillRect(b.x + b.w - 70, b.y + b.h + 4, 44, 10); g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(b.x + b.w - 70, b.y + b.h + 4, 44, 10);
        [0, 1, 2].forEach(k => { g.fillStyle = '#F4EFE1'; g.beginPath(); g.ellipse(b.x + b.w - 62 + k * 14, b.y + b.h + 2, 7, 5, 0, 0, 7); g.fill(); g.stroke(); });
      } else if (b.art === 'haendler') {
        gebaeude(g, b.x, b.y, b.w, b.h, { dach: '#D9DDE0', wand: '#F7F8FA', blech: true, wandH: 66, front: (g2, x, wy, w, wh) => {
          g2.fillStyle = '#C8202A'; g2.fillRect(x, wy + 6, w, 12); g2.fillStyle = '#fff'; g2.fillRect(x, wy + 16, w, 2);
          for (let k = 0; k < 4; k++) { const fx = x + 22 + k * ((w - 44) / 4); g2.fillStyle = '#7FC4F0'; g2.fillRect(fx, wy + 24, (w - 44) / 4 - 14, wh - 30); g2.fillStyle = 'rgba(255,255,255,0.5)'; g2.beginPath(); g2.moveTo(fx, wy + 50); g2.lineTo(fx + 30, wy + 24); g2.lineTo(fx + 44, wy + 24); g2.lineTo(fx, wy + 62); g2.closePath(); g2.fill(); g2.strokeStyle = INK; g2.lineWidth = 1.6; g2.strokeRect(fx, wy + 24, (w - 44) / 4 - 14, wh - 30); }
        } });
        for (let k = 0; k < 9; k++) { // Wimpelkette
          const fx = b.x + 24 + k * ((b.w - 48) / 8);
          g.fillStyle = ['#F2424A', '#FFC61A', '#3FD447', '#25C8F3'][k % 4]; g.beginPath(); g.moveTo(fx - 6, b.y + b.h + 6); g.lineTo(fx + 6, b.y + b.h + 6); g.lineTo(fx, b.y + b.h + 18); g.closePath(); g.fill();
          g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
        }
        g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(b.x + 18, b.y + b.h + 6); g.lineTo(b.x + b.w - 18, b.y + b.h + 6); g.stroke();
      }
    });
    if (schneidet(r, 1500, 1640, 300, 160)) {
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(D.SILOS[0].x + 30, D.SILOS[0].y - 38); g.lineTo(D.SILOS[1].x - 30, D.SILOS[1].y - 38); g.stroke();
      g.strokeStyle = '#9AA6AE'; g.lineWidth = 5; g.stroke();
      D.SILOS.forEach(s => silo3d(g, s.x, s.y, s.r));
    }
    D.DEKO.forEach(d => {
      const w = d.w || d.r * 2, h = d.h || d.r * 2, x0 = d.art === 'windrad' ? d.x - d.r : d.x, y0 = d.art === 'windrad' ? d.y - d.r : d.y;
      if (!schneidet(r, x0 - 20, y0 - 20, w + 60, h + 80)) return;
      if (d.art === 'scheune') {
        gebaeude(g, d.x, d.y, d.w, d.h, { dach: '#8A3F2C', wand: '#C2412B', holz: true, wandH: 48, front: (g2, x, wy, w, wh) => {
          const tx = x + w / 2 - 26;
          g2.fillStyle = '#9A2E1E'; g2.fillRect(tx, wy + 8, 52, wh - 8);
          g2.strokeStyle = '#F7F3EA'; g2.lineWidth = 3; g2.strokeRect(tx, wy + 8, 52, wh - 8);
          g2.beginPath(); g2.moveTo(tx, wy + 8); g2.lineTo(tx + 52, wy + wh); g2.moveTo(tx + 52, wy + 8); g2.lineTo(tx, wy + wh); g2.moveTo(tx + 26, wy + 8); g2.lineTo(tx + 26, wy + wh); g2.stroke();
        } });
      } else if (d.art === 'heu') {
        [[22, 24], [58, 24], [94, 24], [40, 50], [76, 50], [58, 14]].forEach(p => heuballen(g, d.x + p[0], d.y + p[1], 16));
      } else if (d.art === 'garten') {
        g.fillStyle = 'rgba(30,48,12,0.2)'; g.fillRect(d.x + 6, d.y + 8, d.w, d.h);
        g.fillStyle = '#8A6238'; g.fillRect(d.x, d.y, d.w, d.h);
        g.fillStyle = '#6B4A2E'; g.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
        const farben = ['#6bbf3f', '#8ad14f', '#4ea83a', '#c9d44a'];
        for (let rr2 = 0; rr2 < 4; rr2++) {
          const by = d.y + 10 + rr2 * 22;
          g.fillStyle = '#7A5232'; g.fillRect(d.x + 10, by, d.w - 20, 15);
          for (let q = 0; q < 9; q++) { g.fillStyle = farben[(rr2 + q) % 4]; g.beginPath(); g.arc(d.x + 18 + q * ((d.w - 36) / 8), by + 7.5, 4.6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(d.x + 17 + q * ((d.w - 36) / 8), by + 6, 1.6, 0, 7); g.fill(); }
          g.fillStyle = ['#e8452c', '#f2a81a', '#e8556b', '#b36bd6'][rr2]; for (let q = 0; q < 4; q++) { g.beginPath(); g.arc(d.x + 28 + q * 30, by + 5, 2.2, 0, 7); g.fill(); }
        }
        g.strokeStyle = INK; g.lineWidth = 2.4; g.strokeRect(d.x, d.y, d.w, d.h);
      } else if (d.art === 'windrad') {
        g.fillStyle = 'rgba(30,48,12,0.25)'; g.beginPath(); g.moveTo(d.x - 3, d.y + 52); g.lineTo(d.x + 30, d.y + 66); g.lineTo(d.x + 34, d.y + 62); g.lineTo(d.x + 3, d.y + 50); g.closePath(); g.fill();
        g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(d.x - 8, d.y + 54); g.lineTo(d.x, d.y + 4); g.lineTo(d.x + 8, d.y + 54); g.stroke();
        g.strokeStyle = '#C9CED6'; g.lineWidth = 2.4; g.stroke();
        g.strokeStyle = '#9AA0AE'; g.lineWidth = 1.2; g.beginPath(); for (let yy = d.y + 16; yy < d.y + 52; yy += 9) { g.moveTo(d.x - (yy - d.y) * 0.15, yy); g.lineTo(d.x + (yy - d.y) * 0.15, yy + 6); } g.stroke();
      }
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Statischer Boden in Kacheln (Gras, Flecken, Feldwege, Feldschatten/-rain/-vorderkante, Strassen, Hofflaechen,
  // feste Gebaeude, Silos, Baeume). Stufen nach Geraetepixeln je Weltpixel, LRU <= 24 Kacheln.
  // ----------------------------------------------------------------------------------------------
  const STUFEN = [0.25, 0.375, 0.5, 0.75, 1, 1.25, 1.5];
  function stufeFuer(need) { for (let i = 0; i < STUFEN.length; i++) if (STUFEN[i] >= need * 0.85) return STUFEN[i]; return 1.5; }
  function kachelWelt(l) { return l <= 0.375 ? 2048 : l <= 0.75 ? 1024 : 512; }
  const BLEED = 2;
  const kacheln = new Map(); let kachelPixel = 0;
  const KACHEL_MAX = 24, KACHEL_PIXEL_MAX = 14e6;
  let uebersicht = null;
  const US = 0.0625;

  function zeichneStatisch(g, r, l) {
    const grob = l < 0.6;
    g.fillStyle = G.muster(g, G.textur('gras', grob)); g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    flecken.forEach(f => {
      if (!schneidet(r, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2)) return;
      g.fillStyle = f.hell ? 'rgba(160,222,96,0.30)' : 'rgba(96,170,44,0.22)'; g.beginPath(); g.ellipse(f.x, f.y, f.r, f.r * f.k, f.a, 0, 7); g.fill();
    });
    // Feldwege (Erdwege von der Strasse zu den Feldern)
    const weg = G.muster(g, G.textur('weg', grob));
    WEGE.forEach(ws => ws.forEach(w => {
      if (!schneidet(r, w.x - 4, w.y - 4, w.w + 8, w.h + 8)) return;
      g.fillStyle = 'rgba(120,150,60,0.55)'; g.fillRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
      g.fillStyle = weg; g.fillRect(w.x, w.y, w.w, w.h);
      g.fillStyle = 'rgba(150,110,60,0.35)';
      if (w.w < w.h) { g.fillRect(w.x + 6, w.y, 3, w.h); g.fillRect(w.x + w.w - 9, w.y, 3, w.h); g.fillStyle = 'rgba(130,190,70,0.6)'; g.fillRect(w.x + 11.5, w.y, 3, w.h); }
      else { g.fillRect(w.x, w.y + 6, w.w, 3); g.fillRect(w.x, w.y + w.h - 9, w.w, 3); g.fillStyle = 'rgba(130,190,70,0.6)'; g.fillRect(w.x, w.y + 11.5, w.w, 3); }
    }));
    // Felder: Schatten, Rain, Vorderkante (die Oberflaeche selbst zeichnet zeichneFeld je Frame)
    D.FELDER.forEach(f => {
      const fw = f.c * Z, fh = f.r * Z;
      if (!schneidet(r, f.x - 10, f.y - 10, fw + 40, fh + KANTE + 40)) return;
      g.fillStyle = 'rgba(30,58,10,0.16)'; g.fillRect(f.x + 8, f.y + 10, fw + 6, fh + KANTE + 4);
      g.fillStyle = 'rgba(30,58,10,0.14)'; g.fillRect(f.x + 16, f.y + 20, fw + 6, fh + KANTE + 4);
      g.fillStyle = '#A2DB64'; g.fillRect(f.x - 7, f.y - 7, fw + 14, fh + 7);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(f.x - 7, f.y - 7, fw + 14, 2);
      g.strokeStyle = 'rgba(60,110,30,0.45)'; g.lineWidth = 1.5; g.strokeRect(f.x - 7.5, f.y - 7.5, fw + 15, fh + 8);
      const kg = g.createLinearGradient(0, f.y + fh, 0, f.y + fh + KANTE);
      kg.addColorStop(0, '#9A6234'); kg.addColorStop(0.35, '#7A4A1F'); kg.addColorStop(1, '#5E3517');
      g.fillStyle = kg; g.fillRect(f.x - 7, f.y + fh, fw + 14, KANTE);
      g.fillStyle = 'rgba(40,20,5,0.35)'; for (let xx = f.x - 2; xx < f.x + fw + 7; xx += 9) g.fillRect(xx, f.y + fh + 5, 3, 2);
      g.fillStyle = '#7CC94A'; g.fillRect(f.x - 7, f.y + fh, fw + 14, 2.5);
      g.strokeStyle = INK; g.globalAlpha = 0.55; g.lineWidth = 1.6; g.beginPath(); g.moveTo(f.x - 7, f.y + fh + KANTE); g.lineTo(f.x + fw + 7, f.y + fh + KANTE); g.stroke(); g.globalAlpha = 1;
    });
    // Strassen
    const asph = G.muster(g, G.textur('asphalt', grob));
    D.STRASSEN.forEach(s => {
      if (!schneidet(r, s.x - 10, s.y - 10, s.w + 20, s.h + 20)) return;
      const quer = s.w > s.h;
      g.fillStyle = 'rgba(30,58,10,0.25)'; if (quer) g.fillRect(s.x, s.y + s.h, s.w, 8); else g.fillRect(s.x + s.w, s.y, 8, s.h);
      g.fillStyle = '#B9BCC6'; if (quer) { g.fillRect(s.x, s.y - 3, s.w, 3); g.fillRect(s.x, s.y + s.h, s.w, 3); } else { g.fillRect(s.x - 3, s.y, 3, s.h); g.fillRect(s.x + s.w, s.y, 3, s.h); }
    });
    D.STRASSEN.forEach(s => {
      if (!schneidet(r, s.x - 10, s.y - 10, s.w + 20, s.h + 20)) return;
      g.fillStyle = asph; g.fillRect(s.x, s.y, s.w, s.h);
    });
    const kreuz = { x: 2150, y: 1500, w: 90, h: 90 };
    D.STRASSEN.forEach(s => {
      if (!schneidet(r, s.x - 10, s.y - 10, s.w + 20, s.h + 20)) return;
      const quer = s.w > s.h;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      if (quer) {
        [[s.x, kreuz.x], [kreuz.x + kreuz.w, s.x + s.w]].forEach(ab => {
          const a0 = Math.max(ab[0], r.x0 - 64), a1 = Math.min(ab[1], r.x1 + 64);
          if (a1 <= a0) return;
          g.fillRect(a0, s.y + 6, a1 - a0, 2.5); g.fillRect(a0, s.y + s.h - 8.5, a1 - a0, 2.5);
          for (let xx = Math.ceil(a0 / 64) * 64; xx < a1 - 34; xx += 64) g.fillRect(xx, s.y + s.h / 2 - 1.5, 34, 3);
        });
      } else {
        [[s.y, kreuz.y], [kreuz.y + kreuz.h, s.y + s.h]].forEach(ab => {
          const a0 = Math.max(ab[0], r.y0 - 64), a1 = Math.min(ab[1], r.y1 + 64);
          if (a1 <= a0) return;
          g.fillRect(s.x + 6, a0, 2.5, a1 - a0); g.fillRect(s.x + s.w - 8.5, a0, 2.5, a1 - a0);
          for (let yy = Math.ceil(a0 / 64) * 64; yy < a1 - 34; yy += 64) g.fillRect(s.x + s.w / 2 - 1.5, yy, 3, 34);
        });
      }
    });
    // Hofflaechen
    const kies = G.muster(g, G.textur('kies', grob)), beton = G.muster(g, G.textur('beton', grob));
    const flaeche = (x, y, w, h, m, rand) => {
      if (!schneidet(r, x - 6, y - 6, w + 12, h + 12)) return;
      if (rand) { g.fillStyle = 'rgba(120,100,70,0.45)'; g.fillRect(x - 3, y - 3, w + 6, h + 6); }
      g.fillStyle = m; g.fillRect(x, y, w, h);
      if (rand) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h); }
    };
    flaeche(D.HOF.x, D.HOF.y, D.HOF.w, D.HOF.h, kies, true);
    flaeche(1040, 1800, 360, 90, beton, false);
    flaeche(1050, 1900, 1040, 350, beton, true);
    flaeche(1700, 1590, 200, 40, beton, false);
    flaeche(2240, 1590, 40, 60, beton, false);
    flaeche(D.PLATZ_LANDHANDEL.x, D.PLATZ_LANDHANDEL.y, D.PLATZ_LANDHANDEL.w, D.PLATZ_LANDHANDEL.h, beton, true);
    flaeche(2800, 1610, 280, 430, beton, true);
    const th = D.TIERHOF;
    flaeche(th.x, th.y, th.w, th.h, G.muster(g, G.textur('sand', grob)), true);
    if (schneidet(r, th.x, th.y, th.w, th.h)) {
      g.fillStyle = kies; g.fillRect(th.x, th.y + 670, th.w, 50); g.fillRect(th.x + 1050 - 25, th.y, 50, th.h);
    }
    zeichneGebaeudeStatisch(g, r);
    // Baeume (nach y sortiert, damit untere Kronen vorne liegen)
    for (let i = 0; i < baeume.length; i++) {
      const b = baeume[i];
      if (b.x < r.x0 - 60 || b.x > r.x1 + 40 || b.y < r.y0 - 60 || b.y > r.y1 + 40) continue;
      const sp = G.baum(b.v);
      g.drawImage(sp.c, b.x - sp.ox, b.y - sp.oy, sp.w, sp.h);
    }
  }
  function kachelRendern(l, tx, ty) {
    const T = kachelWelt(l), x0 = tx * T - BLEED, y0 = ty * T - BLEED, ww = T + 2 * BLEED;
    const px = Math.ceil(ww * l);
    const c = document.createElement('canvas'); c.width = px; c.height = px;
    const g = c.getContext('2d');
    g.setTransform(px / ww, 0, 0, px / ww, -x0 * px / ww, -y0 * px / ww);
    zeichneStatisch(g, { x0, y0, x1: x0 + ww, y1: y0 + ww }, l);
    return { c, x0, y0, ww, px: px * px };
  }
  // Grobe Uebersicht der ganzen Welt als Notbild fuer noch fehlende Kacheln - wird in 16 Teilen nebenbei gebaut
  let uebersichtTeile = null;
  function uebersichtArbeit() {
    if (!uebersicht) {
      uebersicht = document.createElement('canvas'); uebersicht.width = Math.ceil(D.WELT.b * US); uebersicht.height = Math.ceil(D.WELT.h * US);
      uebersichtTeile = [];
      const n = 4, tw = D.WELT.b / n, th = D.WELT.h / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) uebersichtTeile.push({ x0: x * tw, y0: y * th, x1: (x + 1) * tw, y1: (y + 1) * th });
    }
    if (!uebersichtTeile.length || !darfWerken()) return;
    const r = uebersichtTeile.shift(), g = uebersicht.getContext('2d');
    werkN++;
    g.setTransform(US, 0, 0, US, 0, 0);
    g.save(); g.beginPath(); g.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); g.clip();
    zeichneStatisch(g, r, 0.25);
    g.restore();
  }
  function kachelnZeichnen(ctx, sicht, l) {
    const T = kachelWelt(l), nx = Math.ceil(D.WELT.b / T) - 1, ny = Math.ceil(D.WELT.h / T) - 1;
    const tx0 = Math.max(0, Math.floor(sicht.x0 / T)), ty0 = Math.max(0, Math.floor(sicht.y0 / T));
    const tx1 = Math.min(nx, Math.floor(sicht.x1 / T)), ty1 = Math.min(ny, Math.floor(sicht.y1 / T));
    const fehlt = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const key = l + '|' + tx + '|' + ty, k = kacheln.get(key);
      if (k) { kacheln.delete(key); kacheln.set(key, k); ctx.drawImage(k.c, k.x0, k.y0, k.ww, k.ww); }   // LRU: ans Ende
      else fehlt.push({ tx, ty, key });
    }
    if (fehlt.length) {
      const mx = (sicht.x0 + sicht.x1) / 2, my = (sicht.y0 + sicht.y1) / 2;
      fehlt.sort((a, b) => Math.hypot((a.tx + 0.5) * T - mx, (a.ty + 0.5) * T - my) - Math.hypot((b.tx + 0.5) * T - mx, (b.ty + 0.5) * T - my));
      fehlt.forEach(f => {
        if (darfWerken()) {
          const k = kachelRendern(l, f.tx, f.ty); werkN++;
          kacheln.set(f.key, k); kachelPixel += k.px;
          ctx.drawImage(k.c, k.x0, k.y0, k.ww, k.ww);
        } else {
          const x = f.tx * T, y = f.ty * T, w = Math.min(T, D.WELT.b - x), h = Math.min(T, D.WELT.h - y);
          ctx.fillStyle = '#86CC47'; ctx.fillRect(x, y, w, h);
          if (uebersicht) ctx.drawImage(uebersicht, x * US, y * US, w * US, h * US, x, y, w, h);
        }
      });
    } else if (!uebersicht || uebersichtTeile.length) {
      uebersichtArbeit();
    } else if (darfWerken() && kacheln.size < KACHEL_MAX - 2) {
      // Vorausrendern: eine Nachbarkachel am Rand, solange Zeit ist
      for (let ty = Math.max(0, ty0 - 1); ty <= Math.min(ny, ty1 + 1); ty++) for (let tx = Math.max(0, tx0 - 1); tx <= Math.min(nx, tx1 + 1); tx++) {
        const key = l + '|' + tx + '|' + ty;
        if (werkN || kacheln.has(key)) continue;
        const k = kachelRendern(l, tx, ty); werkN++;
        kacheln.set(key, k); kachelPixel += k.px;
      }
    }
    while (kacheln.size > KACHEL_MAX || kachelPixel > KACHEL_PIXEL_MAX) {
      const ersterKey = kacheln.keys().next().value;
      kachelPixel -= kacheln.get(ersterKey).px; kacheln.delete(ersterKey);
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Felder: Oberflaeche je Feld + Zustand offscreen (LRU), Bahn-Fortschritt per Teil-drawImage
  // ----------------------------------------------------------------------------------------------
  const oberCache = new Map(); let oberPixel = 0;
  const OBER_PIXEL_MAX = 12e6, OBER_MAX = 60;
  const TINT = { duengen: 'rgba(255,255,255,0.18)', spritzen: 'rgba(110,190,255,0.22)', walzen: 'rgba(30,20,10,0.16)', kalken: 'rgba(255,255,255,0.40)' };
  function zustand(f, wachstum) {
    if (f.phase === 'stoppel' || f.phase === 'bearbeitet' || f.phase === 'gepfluegt') return { art: f.phase, frucht: '', stufe: 0 };
    if (f.phase === 'waechst') return { art: 'pflanze', frucht: f.frucht, stufe: stufeVon(wachstum) };
    return { art: 'pflanze', frucht: f.frucht, stufe: 4 };
  }
  function nachZustand(job, vor) {
    const s = job.schritt;
    if (s === 'grubbern') return { art: 'bearbeitet', frucht: '', stufe: 0 };
    if (s === 'pfluegen') return { art: 'gepfluegt', frucht: '', stufe: 0 };
    if (s === 'saeen') return { art: 'pflanze', frucht: job.frucht, stufe: 0 };
    if (s === 'ernten') return { art: 'stoppel', frucht: '', stufe: 0 };
    return { art: vor.art, frucht: vor.frucht, stufe: vor.stufe, tint: s };
  }
  const oberLetzt = {};
  function oberflaeche(d, z, l) {
    const zk = d.id + '|' + z.art + '|' + z.frucht + '|' + z.stufe + '|' + (z.tint || ''), key = zk + '|' + l;
    let o = oberCache.get(key);
    if (o) { oberCache.delete(key); oberCache.set(key, o); return o; }
    if (!darfWerken()) return oberLetzt[zk] || null;   // naechster Frame; solange gleiches Bild in anderer Stufe oder Grundfarbe
    werkN++;
    const fw = d.c * Z, fh = d.r * Z, cw = Math.max(1, Math.ceil(fw * l)), ch = Math.max(1, Math.ceil(fh * l));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    g.setTransform(cw / fw, 0, 0, ch / fh, 0, 0);
    const grob = l < 0.6, quer = fw < fh;
    const rnd = G.zufall(d.id * 7919 + z.art.length * 31 + z.stufe);
    g.fillStyle = G.muster(g, G.feldKachel(z.art, z.frucht, z.stufe, quer, grob)); g.fillRect(0, 0, fw, fh);
    // grosse, ruhige Hell-Dunkel-Flecken (natuerlicher Eindruck)
    for (let i = 0; i < 9; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(40,20,0,0.04)'; g.beginPath(); g.ellipse(rnd() * fw, rnd() * fh, 40 + rnd() * 90, 26 + rnd() * 60, rnd() * 3, 0, 7); g.fill(); }
    if (z.art === 'wiese') {
      // Gestruepp: Buesche und Steine, eher am Rand
      const n = Math.round(fw * fh / 9000);
      const sp = [];
      for (let i = 0; i < n; i++) { const amRand = rnd() < 0.6; const x = amRand ? (rnd() < 0.5 ? 10 + rnd() * 40 : fw - 10 - rnd() * 40) : 20 + rnd() * (fw - 40); const y = 12 + rnd() * (fh - 30); sp.push({ x, y, v: (rnd() * 3) | 0 }); }
      sp.sort((a, b) => a.y - b.y).forEach(b => { const s = G.busch(b.v); g.drawImage(s.c, b.x - s.ox, b.y - s.oy, s.w, s.h); });
      for (let i = 0; i < 6; i++) { const x = 20 + rnd() * (fw - 40), y = 20 + rnd() * (fh - 40); g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(x + 2, y + 2, 5, 3, 0, 0, 7); g.fill(); g.fillStyle = '#C9C3B3'; g.beginPath(); g.ellipse(x, y, 5, 3.4, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x - 3, y - 2, 3, 1.2); }
    }
    if (z.tint) {
      g.fillStyle = TINT[z.tint] || 'rgba(255,255,255,0.15)'; g.fillRect(0, 0, fw, fh);
      if (!grob && (z.tint === 'duengen' || z.tint === 'kalken')) for (let i = 0; i < fw * fh / 60; i++) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(rnd() * fw, rnd() * fh, 1.3, 1.3); }
      if (!grob && z.tint === 'spritzen') for (let i = 0; i < fw * fh / 120; i++) { g.fillStyle = 'rgba(220,245,255,0.9)'; g.fillRect(rnd() * fw, rnd() * fh, 1, 1); }
      if (z.tint === 'walzen') { g.fillStyle = 'rgba(255,255,255,0.08)'; if (quer) { for (let x = 0; x < fw; x += 24) g.fillRect(x, 0, 12, fh); } else { for (let y = 0; y < fh; y += 24) g.fillRect(0, y, fw, 12); } }
    }
    // Licht von links oben: oben hell, unten etwas dunkler; Innenkanten
    const lg = g.createLinearGradient(0, 0, fw * 0.25, fh);
    lg.addColorStop(0, 'rgba(255,255,255,0.24)'); lg.addColorStop(0.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.14)');
    g.fillStyle = lg; g.fillRect(0, 0, fw, fh);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, fw, 2.5); g.fillRect(0, 0, 2.5, fh);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, fh - 2.5, fw, 2.5); g.fillRect(fw - 2.5, 0, 2.5, fh);
    if (z.art === 'pflanze' && z.stufe === 4 && !grob && z.frucht !== 'raps' && z.frucht !== 'sonnenblume') {
      for (let i = 0; i < fw * fh / 14000; i++) { const x = 10 + rnd() * (fw - 20), y = 10 + rnd() * (fh - 20); g.fillStyle = 'rgba(255,255,240,0.85)'; g.fillRect(x - 2.5, y - 0.5, 5, 1); g.fillRect(x - 0.5, y - 2.5, 1, 5); }
    }
    o = { c, cw, ch, fw, fh, px: cw * ch };
    oberCache.set(key, o); oberPixel += o.px; oberLetzt[zk] = o;
    while (oberCache.size > OBER_MAX || oberPixel > OBER_PIXEL_MAX) {
      const k0 = oberCache.keys().next().value; if (k0 === key) break;
      const alt = oberCache.get(k0), zk0 = k0.slice(0, k0.lastIndexOf('|'));
      if (oberLetzt[zk0] === alt) delete oberLetzt[zk0];
      oberPixel -= alt.px; oberCache.delete(k0);
    }
    return o;
  }
  function grundFarbe(z) {
    if (z.art === 'stoppel') return '#E7D28F';
    if (z.art === 'bearbeitet') return '#C48B55';
    if (z.art === 'gepfluegt') return '#A9693A';
    if (z.art === 'wiese') return '#93D452';
    if (z.stufe <= 0) return '#8C5830';
    if (z.stufe <= 2) return '#93603A';
    if (z.stufe === 3) { const f = D.frucht(z.frucht); return f ? f.farben.hoch : '#5fae3a'; }
    return G.fruchtFarben(z.frucht).grund;
  }
  function flaecheOderBild(ctx, o, z, d, fw, fh) {
    if (o) ctx.drawImage(o.c, d.x, d.y, fw, fh);
    else { ctx.fillStyle = grundFarbe(z); ctx.fillRect(d.x, d.y, fw, fh); }
  }
  function teilBild(ctx, o, d, x, y, w, h) {
    if (w <= 0.5 || h <= 0.5) return;
    const sx = o.cw / o.fw, sy = o.ch / o.fh;
    ctx.drawImage(o.c, (x - d.x) * sx, (y - d.y) * sy, w * sx, h * sy, x, y, w, h);
  }
  let schimmerBild = null, funkelBild = null;
  function schimmerHolen() {
    if (schimmerBild) return schimmerBild;
    const c = document.createElement('canvas'); c.width = 128; c.height = 8;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,230,0)'); gr.addColorStop(0.5, 'rgba(255,255,230,1)'); gr.addColorStop(1, 'rgba(255,255,230,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 8);
    return (schimmerBild = c);
  }
  function funkelHolen() {
    if (funkelBild) return funkelBild;
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(255,250,210,1)';
    g.beginPath(); g.moveTo(16, 0); g.lineTo(19, 13); g.lineTo(32, 16); g.lineTo(19, 19); g.lineTo(16, 32); g.lineTo(13, 19); g.lineTo(0, 16); g.lineTo(13, 13); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 3, 0, 7); g.fill();
    return (funkelBild = c);
  }
  let fein = true;   // Feinheiten (Schimmer, Funkeln, Spuren) nur, wenn nah genug herangezoomt
  function zeichneFeld(ctx, d, S, jetzt, l) {
    const fw = d.c * Z, fh = d.r * Z;
    const f = S.felder[d.id];
    if (!f) {
      const zw = { art: 'wiese', frucht: '', stufe: 0 };
      flaecheOderBild(ctx, oberflaeche(d, zw, l), zw, d, fw, fh);
      return;
    }
    const wachstum = M.fortschrittWachstum(f, jetzt);
    const z = zustand(f, wachstum);
    flaecheOderBild(ctx, oberflaeche(d, z, l), z, d, fw, fh);
    const job = M.jobAufFeld(d.id);
    if (job) {
      const st = M.jobStand(job, jetzt);
      if (st.teil !== 'hin') {
        const p = st.teil === 'rueck' ? 1 : st.p;
        const gm = job.geraet ? M.maschine(job.geraet) : null, tm = M.maschine(job.traktor);
        const breite = (gm ? D.def(gm.id).w : D.def(tm.id).w) * K;
        const b = bahnGeo(d.id, breite, 0);
        const nz = nachZustand(job, z);
        let nach = oberflaeche(d, nz, l);
        if (!nach) { const c0 = document.createElement('canvas'); c0.width = 4; c0.height = 4; const g0 = c0.getContext('2d'); g0.fillStyle = grundFarbe(nz); g0.fillRect(0, 0, 4, 4); nach = { c: c0, cw: 4, ch: 4, fw, fh }; }
        const u = p * b.n, li = Math.min(b.n - 1, Math.floor(u)), fr = u - li;
        const fertigQuer = p >= 1 ? b.quer : Math.min(b.quer, li * b.laneW);
        const richtung = bahnRichtung(b, li);
        const teil = Math.min(1, fr / 0.9) * b.laenge;
        let front = null;
        if (b.horizontal) {
          teilBild(ctx, nach, d, d.x, d.y, fw, fertigQuer);
          if (p < 1) {
            const y0 = d.y + li * b.laneW, hh = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) { teilBild(ctx, nach, d, d.x, y0, teil, hh); front = { x: d.x + teil - 1, y: y0, w: 2, h: hh }; }
            else { teilBild(ctx, nach, d, d.x + b.laenge - teil, y0, teil, hh); front = { x: d.x + b.laenge - teil - 1, y: y0, w: 2, h: hh }; }
            if (fein && fertigQuer > 0) { ctx.fillStyle = 'rgba(255,250,225,0.5)'; ctx.fillRect(d.x, d.y + fertigQuer - 1, fw, 2); }
          }
        } else {
          teilBild(ctx, nach, d, d.x, d.y, fertigQuer, fh);
          if (p < 1) {
            const x0 = d.x + li * b.laneW, ww = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) { teilBild(ctx, nach, d, x0, d.y, ww, teil); front = { x: x0, y: d.y + teil - 1, w: ww, h: 2 }; }
            else { teilBild(ctx, nach, d, x0, d.y + b.laenge - teil, ww, teil); front = { x: x0, y: d.y + b.laenge - teil - 1, w: ww, h: 2 }; }
            if (fein && fertigQuer > 0) { ctx.fillStyle = 'rgba(255,250,225,0.5)'; ctx.fillRect(d.x + fertigQuer - 1, d.y, 2, fh); }
          }
        }
        if (fein) {
          // Radspuren in den fertigen Bahnen + der laufenden Bahn
          ctx.fillStyle = 'rgba(70,40,15,0.20)';
          const spur = Math.min(b.laneW * 0.3, 8);
          const bis = p >= 1 ? b.n : li;
          for (let i = 0; i < bis && i < 40; i++) {
            const m = bahnMitte(b, i);
            if (b.horizontal) { ctx.fillRect(d.x, d.y + m - spur - 1, fw, 2); ctx.fillRect(d.x, d.y + m + spur - 1, fw, 2); }
            else { ctx.fillRect(d.x + m - spur - 1, d.y, 2, fh); ctx.fillRect(d.x + m + spur - 1, d.y, 2, fh); }
          }
          if (p < 1 && teil > 0) {
            const m = bahnMitte(b, li), a0 = richtung > 0 ? 0 : b.laenge - teil;
            if (b.horizontal) { ctx.fillRect(d.x + a0, d.y + m - spur - 1, teil, 2); ctx.fillRect(d.x + a0, d.y + m + spur - 1, teil, 2); }
            else { ctx.fillRect(d.x + m - spur - 1, d.y + a0, 2, teil); ctx.fillRect(d.x + m + spur - 1, d.y + a0, 2, teil); }
          }
          if (front) { ctx.fillStyle = 'rgba(255,250,225,0.55)'; ctx.fillRect(front.x, front.y, front.w, front.h); }
        }
      }
    }
    // Leben auf dem Feld: Wind laeuft ueber die Pflanzen, reife Felder funkeln (vorgerenderte Bilder, keine Verlaeufe)
    if (fein && !job && (f.phase === 'reif' || (f.phase === 'waechst' && wachstum >= 0.3))) {
      const ts = jetzt / 1000, ph = (ts * 0.11 + d.id * 0.37) % 1, cx = d.x + (ph * 1.7 - 0.35) * fw, bw = fw * 0.22 + 30;
      const a0 = Math.max(d.x, cx - bw), a1 = Math.min(d.x + fw, cx + bw);
      if (a1 > a0) {
        const sb = schimmerHolen(), sx0 = (a0 - (cx - bw)) / (2 * bw) * 128, sx1 = (a1 - (cx - bw)) / (2 * bw) * 128;
        ctx.globalAlpha = f.phase === 'reif' ? 0.14 : 0.1;
        ctx.drawImage(sb, sx0, 0, Math.max(0.5, sx1 - sx0), 8, a0, d.y, a1 - a0, fh);
        ctx.globalAlpha = 1;
      }
      if (f.phase === 'reif') {
        const fb = funkelHolen();
        for (let i = 0; i < 7; i++) {
          const a2 = 0.5 + 0.5 * Math.sin(ts * 2.6 + i * 1.9);
          if (a2 < 0.35) continue;
          const sx = d.x + 14 + hz(d.id * 13 + i) * (fw - 28), sy = d.y + 14 + hz(d.id * 7 + i + 40) * (fh - 28), r = 4 + 7 * a2;
          ctx.globalAlpha = a2 * 0.9; ctx.drawImage(fb, sx - r, sy - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (f.phase === 'reif' && !job) { ctx.strokeStyle = 'rgba(255,226,122,0.75)'; ctx.lineWidth = 4; ctx.strokeRect(d.x + 2, d.y + 2, fw - 4, fh - 4); }
  }

  // ----------------------------------------------------------------------------------------------
  // Tierhof (Gehege + Staelle als gecachte Bilder je Zustand, Tiere als kleine Figuren)
  // ----------------------------------------------------------------------------------------------
  const bildCache = {};
  function bildHolen(key, x0, y0, x1, y1, fn) {
    let b = bildCache[key];
    if (!b) { if (!darfWerken()) return null; werkN++; b = bildCache[key] = G.sprite(x0, y0, x1, y1, fn, 2); }
    return b;
  }
  function malBild(ctx, b) { if (b) ctx.drawImage(b.c, -b.ox, -b.oy, b.w, b.h); }
  function zaun(g, x, y, w, h) {
    const pfosten = (px, py) => { g.fillStyle = 'rgba(30,48,12,0.25)'; g.fillRect(px + 2, py + 3, 5, 5); g.fillStyle = '#8A5A30'; g.fillRect(px - 2.5, py - 7, 5, 9); g.fillStyle = '#B07A44'; g.fillRect(px - 2.5, py - 7, 5, 2.5); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(px - 2.5, py - 7, 5, 9); };
    g.strokeStyle = INK; g.lineWidth = 4.2; g.strokeRect(x, y - 3, w, h); g.strokeRect(x, y - 7, w, h);
    g.strokeStyle = '#C08A50'; g.lineWidth = 2.2; g.strokeRect(x, y - 3, w, h); g.strokeRect(x, y - 7, w, h);
    for (let k = 0; k <= w; k += 30) { pfosten(x + k, y); pfosten(x + k, y + h); }
    for (let k = 30; k < h; k += 30) { pfosten(x, y + k); pfosten(x + w, y + k); }
  }
  function gehegeBild(d, gebaut, boxen) {
    const p = d.auslauf;
    return bildHolen('geh|' + d.id + '|' + (gebaut ? 1 : 0) + '|' + (boxen || 0), p.x - 12, p.y - 16, p.x + p.w + 20, p.y + p.h + 22, g => {
      g.fillStyle = 'rgba(30,48,12,0.16)'; g.fillRect(p.x + 6, p.y + 8, p.w, p.h);
      g.fillStyle = G.muster(g, G.textur(gebaut ? 'gras' : 'wiese')); g.fillRect(p.x, p.y, p.w, p.h);
      const rnd = G.zufall(d.id.length * 101 + 7);
      if (!gebaut) {
        g.setLineDash([8, 7]); g.strokeStyle = 'rgba(255,240,170,0.9)'; g.lineWidth = 2.5; g.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4); g.setLineDash([]);
        for (let i = 0; i < 6; i++) { const s = G.busch(i % 3); g.drawImage(s.c, p.x + 20 + rnd() * (p.w - 40) - s.ox, p.y + 20 + rnd() * (p.h - 40) - s.oy, s.w, s.h); }
        return;
      }
      if (d.id === 'huehner' || d.id === 'enten') { g.fillStyle = 'rgba(214,184,130,0.75)'; g.beginPath(); g.ellipse(p.x + p.w * 0.3, p.y + p.h * 0.45, p.w * 0.22, p.h * 0.3, 0, 0, 7); g.fill(); }
      if (d.id === 'enten') {
        g.fillStyle = '#1F8BC6'; g.beginPath(); g.ellipse(p.x + p.w * 0.7, p.y + p.h * 0.56, p.w * 0.22 + 3, p.h * 0.28 + 3, 0, 0, 7); g.fill();
        g.fillStyle = '#4FC3F7'; g.beginPath(); g.ellipse(p.x + p.w * 0.7, p.y + p.h * 0.55, p.w * 0.22, p.h * 0.28, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(p.x + p.w * 0.64, p.y + p.h * 0.47, p.w * 0.08, p.h * 0.05, -0.3, 0, 7); g.fill();
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x + p.w * 0.7, p.y + p.h * 0.56, p.w * 0.22 + 3, p.h * 0.28 + 3, 0, 0, 7); g.stroke();
      }
      if (d.id === 'bienen') {
        for (let i = 0; i < 40; i++) { const x = p.x + 10 + rnd() * (p.w - 20), y = p.y + 10 + rnd() * (p.h - 20); g.fillStyle = ['#FFF27A', '#FF9FC0', '#ffffff', '#C9A7FF'][i % 4]; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
        for (let i = 0; i < Math.min(12, boxen || 0); i++) {
          const x = p.x + 26 + (i % 6) * 42, y = p.y + 34 + Math.floor(i / 6) * 60;
          g.fillStyle = 'rgba(30,48,12,0.25)'; g.fillRect(x + 4, y + 4, 20, 16);
          g.fillStyle = ['#E8C14A', '#7FB0E0', '#E08A8A', '#9FD68A'][i % 4]; g.fillRect(x, y, 20, 18);
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x, y, 20, 5);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 11, 20, 1.5);
          g.fillStyle = INK; g.fillRect(x + 7, y + 14, 6, 2.5);
          g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(x, y, 20, 18);
        }
      } else if (d.futterKgH) {
        // Futtertrog
        const tx = p.x + p.w - 70, ty = p.y + 22;
        g.fillStyle = 'rgba(30,48,12,0.25)'; g.fillRect(tx + 4, ty + 5, 50, 12);
        g.fillStyle = '#8A5A30'; g.fillRect(tx, ty, 50, 12); g.fillStyle = '#F0C552'; g.fillRect(tx + 3, ty + 2, 44, 5);
        g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(tx, ty, 50, 12);
      }
      for (let i = 0; i < 8; i++) { const s = G.busch(i % 3); const x = i % 2 ? p.x + 10 + rnd() * 30 : p.x + p.w - 10 - rnd() * 30; g.drawImage(s.c, x - s.ox, p.y + p.h - 18 - rnd() * 30 - s.oy, s.w, s.h); }
      zaun(g, p.x, p.y, p.w, p.h);
    });
  }
  const STALL = {
    huehner: { wand: '#C98A4E', holz: true }, bienen: { wand: '#F2C64A', holz: true }, kuehe: { wand: '#B8432E', holz: true },
    schafe: { wand: '#C9A27A', holz: true }, enten: { wand: '#E9DFC9', holz: true }, ziegen: { wand: '#BFA37A', holz: true }, alpakas: { wand: '#D7B48C', holz: true }
  };
  function stallBild(d, gebaut) {
    const h = d.haus;
    return bildHolen('stall|' + d.id + '|' + (gebaut ? 1 : 0), h.x - 14, h.y - 14, h.x + h.w + 30, h.y + h.h + 30, g => {
      if (!gebaut) { bauplatz(g, h.x, h.y, h.w, h.h); return; }
      const s = STALL[d.id] || { wand: '#C98A4E', holz: true };
      gebaeude(g, h.x, h.y, h.w, h.h, { dach: h.dach, wand: s.wand, holz: s.holz, wandH: Math.min(48, h.h * 0.44), front: (g2, x, wy, w, wh) => {
        tuer(g2, x + w / 2 - 12, wy + 10, 24, wh - 10, '#6B4524');
        g2.strokeStyle = '#F7F3EA'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(x + w / 2 - 12, wy + 10); g2.lineTo(x + w / 2 + 12, wy + wh); g2.moveTo(x + w / 2 + 12, wy + 10); g2.lineTo(x + w / 2 - 12, wy + wh); g2.stroke();
        if (w > 120) { fenster(g2, x + 16, wy + 12, 14, 10); fenster(g2, x + w - 30, wy + 12, 14, 10); }
      } });
    });
  }
  // Bahn eines Tieres im Gehege: Position und Blickrichtung
  function tierPos(pen, i, t) {
    const pad = 16, w = pen.w - 2 * pad, h = pen.h - 2 * pad - 10;
    const f1 = 0.10 + hz(i) * 0.14, f2 = 0.07 + hz(i + 9) * 0.12, p1 = hz(i + 3) * 6.28, p2 = hz(i + 5) * 6.28;
    const u = 0.5 + 0.5 * Math.sin(t * f1 + p1), v = 0.5 + 0.5 * Math.sin(t * f2 * 1.3 + p2);
    const du = 0.5 * Math.cos(t * f1 + p1) * f1 * w, dv = 0.5 * Math.cos(t * f2 * 1.3 + p2) * f2 * 1.3 * h;
    return { x: pen.x + pad + u * w, y: pen.y + pad + 14 + v * h, a: Math.atan2(dv, du), dx: du, tempo: Math.hypot(du, dv) };
  }
  const tierBilder = {};
  function tierBild(art, bild, variante, links) {
    const key = art + bild + variante + (links ? 'L' : 'R');
    let b = tierBilder[key];
    if (b) return b;
    const sp = G.tier(art, bild, variante);
    if (!links) { b = sp; } else {
      const c = document.createElement('canvas'); c.width = sp.c.width; c.height = sp.c.height;
      const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(sp.c, 0, 0);
      b = { c, ox: sp.w - sp.ox, oy: sp.oy, w: sp.w, h: sp.h };
    }
    tierBilder[key] = b;
    return b;
  }
  function zeichneTierhof(ctx, sicht, S, jetzt, t) {
    const th = D.TIERHOF;
    if (!schneidet(sicht, th.x, th.y, th.w, th.h)) return;
    D.TIERE.forEach(d => {
      const st = S.tiere[d.id], h = d.haus, pen = d.auslauf;
      const bx0 = Math.min(pen.x, h.x) - 20, bx1 = Math.max(pen.x + pen.w, h.x + h.w) + 30, by0 = Math.min(pen.y, h.y) - 20, by1 = Math.max(pen.y + pen.h, h.y + h.h) + 30;
      if (bx0 > sicht.x1 || bx1 < sicht.x0 || by0 > sicht.y1 || by1 < sicht.y0) return;
      const n = st ? st.anzahl : 0;
      malBild(ctx, gehegeBild(d, !!st, d.id === 'bienen' ? Math.min(12, n) : 0));
      malBild(ctx, stallBild(d, !!st));
      if (!st) return;
      if (d.id === 'bienen') {
        ctx.fillStyle = '#F2C21A';
        for (let i = 0; i < Math.min(30, n * 3); i++) { const b = tierPos(pen, i + 40, t * 3); ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3); }
        if (fein) { ctx.fillStyle = INK; for (let i = 0; i < Math.min(30, n * 3); i++) { const b = tierPos(pen, i + 40, t * 3); ctx.fillRect(b.x - 0.5, b.y - 1.5, 1, 3); } }
        return;
      }
      const sichtN = Math.min(d.id === 'huehner' || d.id === 'enten' ? 16 : 10, n);
      const liste = [];
      for (let i = 0; i < sichtN; i++) liste.push(tierPos(pen, i, t));
      liste.sort((a, b) => a.y - b.y);
      liste.forEach((p, i) => {
        const bild = p.tempo > 2 ? ((t * 5 + i * 0.37) | 0) % 2 : 0;
        const b = tierBild(d.id, bild, i % 4, p.dx < 0);
        ctx.drawImage(b.c, p.x - b.ox, p.y - b.oy, b.w, b.h);
      });
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Betriebe, Silo-Anzeige, Deko-Bewegung
  // ----------------------------------------------------------------------------------------------
  function betriebBild(b, gebaut) {
    return bildHolen('betr|' + b.id + '|' + (gebaut ? 1 : 0), b.x - 14, b.y - 30, b.x + b.w + 30, b.y + b.h + 30, g => {
      if (!gebaut) { bauplatz(g, b.x, b.y, b.w, b.h); return; }
      gebaeude(g, b.x, b.y, b.w, b.h, { dach: b.dach, wand: b.id === 'muehle' ? '#EDE3CF' : '#E3D6BE', ziegelwand: b.id !== 'muehle', wandH: 44, blech: b.id !== 'muehle' && b.id !== 'baeckerei', front: (g2, x, wy, w, wh) => {
        tor(g2, x + 12, wy + 12, 40, wh - 12, '#9AA3B0');
        fenster(g2, x + w - 38, wy + 14, 18, 14);
      }, dachDeko: (g2, dx, dy, dw) => { if (b.id !== 'muehle') kamin(g2, dx + dw * 0.72, dy - 4); } });
    });
  }
  function zeichneBetriebe(ctx, sicht, S, jetzt, t, dt) {
    D.PRODUKTION.forEach(b => {
      if (!schneidet(sicht, b.x - 20, b.y - 60, b.w + 60, b.h + 90)) return;
      const p = S.produktion[b.id];
      malBild(ctx, betriebBild(b, !!p));
      if (!p) return;
      const laeuft = p.queue.length > 0;
      if (b.id === 'muehle') {
        // Muehlenfluegel drehen sich, solange gemahlen wird
        const cx = b.x + b.w / 2, cy = b.y + 34, w = laeuft ? t * 1.6 : 0.4;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(w);
        for (let k = 0; k < 4; k++) {
          ctx.rotate(Math.PI / 2);
          ctx.fillStyle = INK; ctx.fillRect(-3, 2, 6, 48);
          ctx.fillStyle = '#F4EFE4'; ctx.fillRect(-1.6, 4, 3.2, 44);
          ctx.fillStyle = '#EAD9B8'; ctx.fillRect(1.6, 14, 9, 32); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(1.6, 14, 9, 32);
        }
        ctx.restore();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#B97A3E'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
      }
      const q = p.queue[0];
      if (q && q.start != null) {
        const f = Math.min(1, Math.max(0, (jetzt - q.start) / Math.max(1, q.dauer)));
        const x = b.x + 8, y = b.y + b.h + 6, w = b.w - 16;
        ctx.fillStyle = INK; G.rr(ctx, x - 2, y - 2, w + 4, 11, 5.5); ctx.fill();
        ctx.fillStyle = '#1F2766'; G.rr(ctx, x, y, w, 7, 3.5); ctx.fill();
        if (f > 0.02) { ctx.fillStyle = '#3FD447'; G.rr(ctx, x, y, w * f, 7, 3.5); ctx.fill(); }
      }
    });
  }
  function zeichneSiloStand(ctx, sicht) {
    if (!schneidet(sicht, 1500, 1700, 300, 120)) return;
    const kap = M.siloKap(), voll = Math.min(1, M.lagerMenge() / kap);
    const x = 1520, y = 1792, w = 240;
    ctx.fillStyle = INK; G.rr(ctx, x - 3, y - 3, w + 6, 16, 8); ctx.fill();
    ctx.fillStyle = '#1F2766'; G.rr(ctx, x, y, w, 10, 5); ctx.fill();
    if (voll > 0.01) { ctx.fillStyle = voll > 0.9 ? '#F2424A' : '#FFC61A'; G.rr(ctx, x, y, Math.max(10, w * voll), 10, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 5, y + 1.5, Math.max(0, w * voll - 10), 2.5); }
  }
  function zeichneDekoBewegt(ctx, sicht, t) {
    D.DEKO.forEach(d => {
      if (d.art !== 'windrad' || !schneidet(sicht, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2 + 60)) return;
      const wind = t * 1.4 + 0.8 * Math.sin(t * 0.3);
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(wind);
      for (let k = 0; k < 3; k++) {
        ctx.rotate(Math.PI * 2 / 3);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, -4.4); ctx.lineTo(d.r + 1.5, -2.6); ctx.lineTo(d.r + 1.5, 4.6); ctx.lineTo(0, 4.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#F7F7F2'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(d.r, -1.2); ctx.lineTo(d.r, 3.2); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(d.x, d.y, 7.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#E2453A'; ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, 7); ctx.fill();
    });
  }
  // Eckklammer-Auswahl (aus C)
  function zielRechteck(z) {
    if (!z) return null;
    if (z.art === 'feld') { const f = D.feld(z.id); return f ? { x: f.x - 7, y: f.y - 7, w: f.c * Z + 14, h: f.r * Z + 7 + KANTE } : null; }
    if (z.art === 'stall') { const d = D.TIERE.find(x => x.id === z.id); if (!d) return null; const x0 = Math.min(d.haus.x, d.auslauf.x), y0 = Math.min(d.haus.y, d.auslauf.y); return { x: x0 - 6, y: y0 - 6, w: Math.max(d.haus.x + d.haus.w, d.auslauf.x + d.auslauf.w) - x0 + 12, h: Math.max(d.haus.y + d.haus.h, d.auslauf.y + d.auslauf.h) - y0 + 12 }; }
    if (z.art === 'betrieb') { const b = D.PRODUKTION.find(x => x.id === z.id); return b ? { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 } : null; }
    if (z.art === 'silo') return { x: 1510, y: 1650, w: 260, h: 160 };
    if (z.art === 'gebaeude') { const g = D.GEBAEUDE.find(x => x.art === z.id); return g ? { x: g.x - 10, y: g.y - 10, w: g.w + 20, h: g.h + 20 } : null; }
    return null;
  }
  function zeichneMarkierung(ctx, cam, t) {
    const r = zielRechteck(markierung);
    if (!r) return;
    const z = cam.z, atmen = effekteWenig() ? 0 : Math.sin(t * 3) * 4 / z;
    const L = Math.min(r.w, r.h) * 0.22 + 10 / z, o = 6 / z + atmen;
    const x0 = r.x - o, y0 = r.y - o, x1 = r.x + r.w + o, y1 = r.y + r.h + o;
    const pfad = () => {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
      ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
      ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
      ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    pfad(); ctx.strokeStyle = INK; ctx.lineWidth = 11 / z; ctx.stroke();
    pfad(); ctx.strokeStyle = '#FFC61A'; ctx.lineWidth = 6 / z; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }

  // ----------------------------------------------------------------------------------------------
  // Welt zeichnen
  // ----------------------------------------------------------------------------------------------
  function aufStrasse(x, y) { for (let i = 0; i < D.STRASSEN.length; i++) if (inRect(x, y, D.STRASSEN[i], 2)) return true; return inRect(x, y, D.HOF) || inRect(x, y, { x: 1700, y: 1590, w: 200, h: 40 }); }
  function zeichneWelt(ctx, cam, W, H, t, jetzt, dt) {
    const S = M.stand();
    schriftAnfragen();
    werkStart();
    dprAkt = Math.max(0.5, (ctx.canvas && W ? ctx.canvas.width / W : 1));
    fein = cam.z >= 0.55;
    const l = stufeFuer(dprAkt * cam.z);
    const sicht = { x0: cam.x - W / 2 / cam.z - 80, y0: cam.y - H / 2 / cam.z - 80, x1: cam.x + W / 2 / cam.z + 80, y1: cam.y + H / 2 / cam.z + 80 };
    // 1) Statischer Boden aus Kacheln
    kachelnZeichnen(ctx, sicht, l);
    // 2) Felder
    const lf = dprAkt * cam.z > 1.6 ? 2 : l;   // Feldbilder duerfen schaerfer sein als der Boden (wenige, grosse Flaechen)
    D.FELDER.forEach(d => {
      if (d.x > sicht.x1 || d.x + d.c * Z < sicht.x0 || d.y > sicht.y1 || d.y + d.r * Z < sicht.y0) return;
      zeichneFeld(ctx, d, S, jetzt, lf);
    });
    // 3) Tierhof, Betriebe, Silo-Fuellstand
    zeichneTierhof(ctx, sicht, S, jetzt, t);
    zeichneBetriebe(ctx, sicht, S, jetzt, t, dt);
    zeichneSiloStand(ctx, sicht);
    Object.keys(geoCache).forEach(k => { if (!S.jobs.some(j => String(j.id) === k)) delete geoCache[k]; });
    // 4) Maschinen
    const park = parkplaetze(S);
    const einsaetze = {};
    S.jobs.forEach(j => { einsaetze[j.traktor] = j; if (j.geraet) einsaetze[j.geraet] = j; });
    S.flotte.forEach(mm => {
      if (einsaetze[mm.uid]) return;
      const d = D.def(mm.id), p = park[mm.uid];
      if (!p || p.x < sicht.x0 - 200 || p.x > sicht.x1 + 200 || p.y < sicht.y0 - 200 || p.y > sicht.y1 + 200) return;
      if (d.art === 'geraet') G.zeichne(ctx, G.fuerDef(d).koerper, p.x, p.y - d.len * 0.5 * K, -Math.PI / 2, true, K);
      else zeichneZugmaschine(ctx, mm, p.x, p.y, -Math.PI / 2);
    });
    S.jobs.forEach(j => {
      const po = jobPosen(j, jetzt);
      if (po.pose.x < sicht.x0 - 300 || po.pose.x > sicht.x1 + 300 || po.pose.y < sicht.y0 - 300 || po.pose.y > sicht.y1 + 300) return;
      const bx = Math.sin(t * 52 + j.id) * 0.28, by = Math.cos(t * 61 + j.id) * 0.28;   // Motorbrummen
      po.pose.x += bx; po.pose.y += by;
      if (po.gm) zeichneGeraetAm(ctx, po.gm, po.tm, po.pose.x, po.pose.y, po.pose.a, po.arbeitend);
      zeichneZugmaschine(ctx, po.tm, po.pose.x, po.pose.y, po.pose.a);
      if (dt > 0) {
        const ca = Math.cos(po.pose.a), sa = Math.sin(po.pose.a);
        const ex = po.td.l * 0.18 * K, ey = -po.td.b * 0.26 * K;
        rauch(po.pose.x + ex * ca - ey * sa, po.pose.y + ex * sa + ey * ca, dt, po.arbeitend ? 6 : 3, false);
        if (po.arbeitend) {
          const farbe = j.schritt === 'ernten' ? FARBE_SPREU : j.schritt === 'duengen' || j.schritt === 'kalken' ? FARBE_WEISS : j.schritt === 'spritzen' ? FARBE_NEBEL : FARBE_STAUB;
          staub(po.arbeitslinie.x, po.arbeitslinie.y, farbe, dt, 16);
        } else if (po.st.teil !== 'arbeit' && !aufStrasse(po.pose.x, po.pose.y)) {
          // Staubspur auf Feldweg/Wiese, hinter der Maschine
          const hx = po.pose.x - ca * po.td.l * 0.45 * K, hy = po.pose.y - sa * po.td.l * 0.45 * K;
          staub(hx, hy, FARBE_WEG, dt, 9);
        }
      }
    });
    if (dt > 0) {
      partikelStep(dt);
      D.GEBAEUDE.forEach(g => { if (g.art === 'haus' && g.x < sicht.x1 && g.x + g.w > sicht.x0 && g.y < sicht.y1 && g.y + g.h > sicht.y0) rauch(g.x + 125, g.y + 2, dt, 2.5, true); });
      D.PRODUKTION.forEach(b => {
        const pr = S.produktion[b.id];
        if (b.id !== 'muehle' && pr && pr.queue.length && b.x < sicht.x1 && b.x + b.w > sicht.x0 && b.y < sicht.y1 && b.y + b.h > sicht.y0) rauch(b.x + b.w * 0.75 + 12, b.y - 6, dt, 4, true);
      });
    }
    zeichneDekoBewegt(ctx, sicht, t);
    // 5) Partikel (vorgerenderte Puffs, nur globalAlpha)
    for (let i = 0; i < partikel.length; i++) {
      const p = partikel[i], k = 1 - p.t / p.max;
      const r = p.rauch ? p.r * (1 + (1 - k) * 2.4) : p.r * (1.5 - k * 0.6);
      ctx.globalAlpha = Math.max(0, p.rauch ? k * 0.45 : k * 0.75);
      ctx.drawImage(p.bild, p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    // 6) Auswahl-Klammern
    zeichneMarkierung(ctx, cam, t);
    // 7) Wolkenschatten ziehen langsam ueber das Land
    const wk = wolkeHolen();
    for (let i = 0; i < 5; i++) {
      const w = 760 + hz(i + 11) * 520, h = w * 0.62, span = D.WELT.b + 2 * w;
      const x = ((hz(i + 3) * span + t * (9 + hz(i + 5) * 8)) % span) - w, y = hz(i + 7) * D.WELT.h - h / 2;
      if (x > sicht.x1 || x + w < sicht.x0 || y > sicht.y1 || y + h < sicht.y0) continue;
      ctx.globalAlpha = 0.42; ctx.drawImage(wk, x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }
  let wolkeBild = null;
  function wolkeHolen() {
    if (wolkeBild) return wolkeBild;
    const c = document.createElement('canvas'); c.width = 128; c.height = 80;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 40, 4, 64, 40, 62);
    gr.addColorStop(0, 'rgba(20,40,60,0.20)'); gr.addColorStop(0.6, 'rgba(20,40,60,0.10)'); gr.addColorStop(1, 'rgba(20,40,60,0)');
    g.save(); g.translate(64, 40); g.scale(1, 0.64); g.translate(-64, -40); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.restore();
    return (wolkeBild = c);
  }

  // ----------------------------------------------------------------------------------------------
  // Status-Blasen, Feldschilder, Gebaeude-Plaketten (Bildschirmkoordinaten, gut lesbar bei jedem Zoom)
  // ----------------------------------------------------------------------------------------------
  const FARBEN = {
    gruen: ['#9BF57A', '#3FD447', '#1FA334', '#0F6A25'], gelb: ['#FFF07A', '#FFC61A', '#FF9E00', '#B35C00'], cyan: ['#8DF3FF', '#25C8F3', '#0E94D0', '#09598C'],
    rot: ['#FF8C8C', '#F2424A', '#C81E2E', '#7E0E19'], navy: ['#4352C4', '#2F3A9A', '#232C7C', '#151B57'], violett: ['#B794FF', '#7A4BF2', '#5124C8', '#2E0F86']
  };
  const R_BLASE = 30;
  function blasenGrund(farbe) {
    const key = 'b|' + farbe;
    return textBild(key, () => ({ w: R_BLASE * 2 + 12, h: R_BLASE * 2 + 26 }), g => {
      const f = FARBEN[farbe], cx = R_BLASE + 6, cy = R_BLASE + 6, r = R_BLASE;
      // Spitze nach unten
      g.fillStyle = INK; g.beginPath(); g.moveTo(cx - 12, cy + r - 8); g.lineTo(cx, cy + r + 15); g.lineTo(cx + 12, cy + r - 8); g.closePath(); g.fill();
      g.beginPath(); g.arc(cx, cy + 2.5, r + 3, 0, 7); g.fill();
      g.fillStyle = f[3]; g.beginPath(); g.moveTo(cx - 8, cy + r - 6); g.lineTo(cx, cy + r + 10); g.lineTo(cx + 8, cy + r - 6); g.closePath(); g.fill();
      g.beginPath(); g.arc(cx, cy + 2, r, 0, 7); g.fill();
      const gr = g.createLinearGradient(0, cy - r, 0, cy + r);
      gr.addColorStop(0, f[0]); gr.addColorStop(0.5, f[1]); gr.addColorStop(1, f[2]);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy - 1, r - 1, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(cx - r * 0.35, cy - r * 0.55, r * 0.32, r * 0.16, -0.5, 0, 7); g.fill();
    }, true);
  }
  function ausrufeMalen(ctx, cx, cy) {
    ctx.fillStyle = INK; G.rr(ctx, cx - 6.5, cy - 19, 13, 25, 6.5); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy + 13, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; G.rr(ctx, cx - 4, cy - 16.5, 8, 20, 4); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy + 13, 4, 0, 7); ctx.fill();
  }
  function zeitGrob(ms) {
    const s = Math.max(0, ms / 1000);
    if (s < 90) return '1 Min';
    if (s < 3600) return Math.round(s / 60) + ' Min';
    return Math.max(1, Math.round(s / 3600)) + ' Std';
  }
  function schrittVorschlag(f) { return f.phase === 'stoppel' ? 'grubbern' : 'saeen'; }
  // Blasen-Inhalte aus dem Spielstand (Weltanker)
  function blasenBerechnen(S, jetzt) {
    const out = [];
    D.FELDER.forEach(d => {
      const f = S.felder[d.id];
      if (!f) return;
      const r = { x: d.x, y: d.y, w: d.c * Z, h: d.r * Z };
      const anker = { x: d.x + r.w / 2, y: d.y + r.h / 2 };
      const job = M.jobAufFeld(d.id);
      if (job) {
        const st = M.jobStand(job, jetzt);
        const td = D.def(M.maschine(job.traktor).id);
        out.push({ ziel: { art: 'feld', id: d.id }, aktion: 'oeffnen', anker, rect: r, farbe: 'navy', icon: td.art === 'ernter' ? (td.typ === 'rodemaschine' ? 'roder' : 'maehdrescher') : 'traktor',
          label: st.teil === 'hin' ? 'fährt hin' : st.teil === 'rueck' ? 'fertig' : Math.round(st.p * 100) + ' %', ring: st.teil === 'arbeit' ? st.p : st.teil === 'rueck' ? 1 : 0, ringFarbe: '#25C8F3', pille: '#0E94D0', prio: 2 });
      } else if (f.phase === 'reif') {
        out.push({ ziel: { art: 'feld', id: d.id }, aktion: 'ernten', anker, rect: r, farbe: 'gruen', icon: 'ernten', label: 'Ernten!', pille: '#1FA334', prio: 10, reif: true });
      } else if (f.phase === 'waechst') {
        const w = M.fortschrittWachstum(f, jetzt);
        out.push({ ziel: { art: 'feld', id: d.id }, aktion: 'oeffnen', anker, rect: r, farbe: 'navy', icon: 'spross', label: zeitGrob(M.restWachsen(d.id, jetzt)), ring: w, ringFarbe: '#4BE35F', pille: '#232C7C', prio: 1 });
      } else {
        const s = schrittVorschlag(f);
        out.push({ ziel: { art: 'feld', id: d.id }, aktion: 'arbeit', anker, rect: r, farbe: 'gelb', ausrufe: true, label: D.SCHRITTE[s].name, pille: '#FF9E00', prio: 6 });
      }
    });
    D.TIERE.forEach(d => {
      const st = S.tiere[d.id];
      if (!st || !st.anzahl) return;
      const ss = M.stallStand(d.id, jetzt);
      if (!ss) return;
      const h = d.haus, r = { x: Math.min(h.x, d.auslauf.x), y: h.y, w: Math.max(h.w, d.auslauf.w), h: d.auslauf.y + d.auslauf.h - h.y };
      const anker = { x: h.x + h.w / 2, y: h.y + 4 };
      if (d.futterKgH && !ss.laeuft) out.push({ ziel: { art: 'stall', id: d.id }, aktion: 'fuettern', anker, rect: r, farbe: 'rot', icon: 'futter', label: 'Futter!', pille: '#C81E2E', prio: 5 });
      else if (ss.lagerKap > 0 && st.lager >= ss.lagerKap * 0.9) out.push({ ziel: { art: 'stall', id: d.id }, aktion: 'einsammeln', anker, rect: r, farbe: 'gruen', icon: d.gut, label: 'Einsammeln', pille: '#1FA334', prio: 5 });
    });
    D.PRODUKTION.forEach(b => {
      const p = S.produktion[b.id];
      if (!p || p.queue.length) return;
      out.push({ ziel: { art: 'betrieb', id: b.id }, aktion: 'oeffnen', anker: { x: b.x + b.w / 2, y: b.y + 8 }, rect: b, farbe: 'gelb', icon: b.id, label: 'Starten', pille: '#FF9E00', prio: 3 });
    });
    try {
      const kap = M.siloKap();
      if (kap > 0 && M.lagerMenge() >= kap * 0.9) out.push({ ziel: { art: 'silo', id: 'silo' }, aktion: 'oeffnen', anker: { x: 1640, y: 1660 }, rect: { x: 1520, y: 1650, w: 240, h: 150 }, farbe: 'rot', icon: 'silo', label: 'Voll!', pille: '#C81E2E', prio: 4 });
    } catch (e) { /* ohne Silo-Anzeige */ }
    return out;
  }
  function zeichneBlase(ctx, b, t, puls) {
    const sk = puls ? 1 + 0.09 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 1.3)) : 1;
    const cx = b.x, cy = b.y;
    if (puls) {
      const ph = (t / 1.3) % 1, hr = R_BLASE * (0.8 + 0.65 * ph);
      ctx.globalAlpha = 0.75 * (1 - ph); ctx.strokeStyle = '#FFF07A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, hr, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (sk !== 1) { ctx.save(); ctx.translate(cx, cy); ctx.scale(sk, sk); ctx.translate(-cx, -cy); }
    const gb = blasenGrund(b.farbe);
    bildMalen(ctx, gb, cx - R_BLASE - 6, cy - R_BLASE - 6);
    if (b.ring !== undefined) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, cy, R_BLASE + 4, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R_BLASE + 4, 0, 7); ctx.stroke();
      if (b.ring > 0.005) { ctx.strokeStyle = b.ringFarbe; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R_BLASE + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.ring)); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    if (b.ausrufe) ausrufeMalen(ctx, cx, cy - 1);
    else iconMalen(ctx, b.icon, cx, cy - 1, 40);
    if (sk !== 1) ctx.restore();
    if (b.pl) bildMalen(ctx, b.pl, b.lx, b.ly);
  }
  function plakette(ctx, name, cx, cy, gr, gesperrt) {
    const key = 'pk|' + gr;
    const grund = textBild(key, () => ({ w: gr + 6, h: gr + 8 }), g => {
      const r = gr / 2;
      g.fillStyle = INK; g.beginPath(); g.arc(r + 3, r + 5, r + 2, 0, 7); g.fill(); g.beginPath(); g.arc(r + 3, r + 3, r + 2, 0, 7); g.fill();
      g.fillStyle = '#FFF6E0'; g.beginPath(); g.arc(r + 3, r + 3, r - 0.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.arc(r + 3, r + 4.5, r - 3, 0, Math.PI); g.fill();
    }, true);
    bildMalen(ctx, grund, cx - gr / 2 - 3, cy - gr / 2 - 3);
    if (gesperrt) ctx.globalAlpha = 0.55;
    iconMalen(ctx, name, cx, cy, gr * 0.74);
    ctx.globalAlpha = 1;
    if (gesperrt) iconMalen(ctx, 'schloss', cx + gr * 0.36, cy + gr * 0.3, gr * 0.48);
  }
  function inZone(x, y, W, H) { return x > zone.links && x < W - zone.rechts && y > zone.oben && y < H - zone.unten; }
  function zeichneBeschriftungen(ctx, cam, W, H, jetzt, t) {
    const S = M.stand();
    schriftAnfragen();
    dprAkt = Math.max(0.5, (ctx.canvas && W ? ctx.canvas.width / W : dprAkt));
    letzteCam = { x: cam.x, y: cam.y, z: cam.z, W, H };
    const zuS = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
    const sichtbar = r => { const a = zuS(r.x, r.y), b = zuS(r.x + r.w, r.y + r.h); return b.x > 0 && a.x < W && b.y > 0 && a.y < H; };
    const klemmX = (x, rand) => Math.max(zone.links + rand, Math.min(W - zone.rechts - rand, x));
    const klemmY = (y, oben, unten) => Math.max(zone.oben + oben, Math.min(H - zone.unten - unten, y));
    // passt senkrecht ganz in die sichere Zone? (sonst lieber weglassen, statt halb unter HUD/Panel zu zeigen)
    const passtY = (oben, unten) => oben >= zone.oben - 2 && unten <= H - zone.unten + 2;
    const belegt = [];
    const frei = (x, y, w, h) => !belegt.some(q => x < q.x + q.w && x + w > q.x && y < q.y + q.h && y + h > q.y);
    // a) Gebaeude-Plaketten (Icon statt Text; Name nur ab hohem Zoom)
    if (cam.z >= 0.4) {
      const gr = Math.round(Math.max(30, Math.min(54, 50 * cam.z)));
      const plak = [];
      D.GEBAEUDE.forEach(g => { const icn = { halle: 'fuhrpark', handel: 'lager', haendler: 'haendler', haus: '' }[g.art]; if (icn !== undefined) plak.push({ icon: icn, x: g.x + g.w / 2, y: g.y + g.h * 0.28, name: g.name }); });
      plak.push({ icon: 'silo', x: 1640, y: 1670, name: 'Silo' });
      D.PRODUKTION.forEach(b => { const p = S.produktion[b.id]; plak.push({ icon: b.id, x: b.x + b.w / 2, y: b.y + b.h * (p ? 0.3 : 0.45), name: p ? b.name : 'Bauplatz', aus: !p, lvl: !p && S.level < b.lvl ? b.lvl : 0 }); });
      D.TIERE.forEach(d => { const st = S.tiere[d.id]; plak.push({ icon: d.id, x: d.haus.x + d.haus.w / 2, y: d.haus.y + d.haus.h * (st ? 0.3 : 0.45), name: st ? d.stall : 'Bauplatz', aus: !st, lvl: !st && S.level < d.lvl ? d.lvl : 0 }); });
      plak.forEach(p => {
        const s = zuS(p.x, p.y);
        if (s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > H + 60 || !inZone(s.x, s.y, W, H)) return;
        if (p.icon) plakette(ctx, p.icon, s.x, s.y, gr, p.aus && p.lvl);
        if (cam.z >= 1.05 || (p.aus && cam.z >= 0.7)) {
          const txt = p.lvl ? 'ab Level ' + p.lvl : p.name;
          const pl = pille(txt, 17, p.aus ? '#2B3589' : '#161C4A');
          const ly = p.icon ? s.y + gr / 2 + 2 : s.y - pl._h / 2;
          bildMalen(ctx, pl, s.x - pl._w / 2, ly);
        }
      });
    }
    // b) Feldschilder (Name + Frucht-Icon) und Kauf-/Schloss-Schilder
    D.FELDER.forEach(d => {
      const r = { x: d.x, y: d.y, w: d.c * Z, h: d.r * Z + KANTE };
      if (!sichtbar(r)) return;
      const f = S.felder[d.id];
      const m = zuS(d.x + r.w / 2, d.y + d.r * Z / 2);
      if (!f) {
        const gesperrt = S.level < d.lvl;
        if (!inZone(m.x, m.y, W, H)) return;
        if (cam.z < 0.5) {
          const s = { x: klemmX(m.x, 24), y: klemmY(m.y, 24, 24) };
          plakette(ctx, gesperrt ? 'schloss' : 'muenze', s.x, s.y, 40, false);
          belegt.push({ x: s.x - 22, y: s.y - 22, w: 44, h: 44 });
          return;
        }
        const txt = gesperrt ? 'ab Level ' + d.lvl : fmtZahl(d.preis);
        const pl = pille(txt, 22, gesperrt ? '#2F3A9A' : '#FF9E00', 30);
        const x = klemmX(m.x, pl._w / 2), y = klemmY(m.y, 30, 30);
        const nm = pille(d.name, 17, '#161C4A');
        if (!passtY(y - pl._h / 2 - nm._h, y + pl._h / 2)) return;
        bildMalen(ctx, nm, x - nm._w / 2, y - pl._h / 2 - nm._h + 2);
        bildMalen(ctx, pl, x - pl._w / 2, y - pl._h / 2);
        iconMalen(ctx, gesperrt ? 'schloss' : 'muenze', x - pl._w / 2 + 20, y - 1, 30);
        belegt.push({ x: x - pl._w / 2, y: y - pl._h / 2 - nm._h, w: pl._w, h: pl._h + nm._h });
        return;
      }
      if (cam.z < 0.5) return;
      const icn = f.frucht && (f.phase === 'waechst' || f.phase === 'reif') ? f.frucht : f.phase === 'stoppel' ? 'stoppel' : 'boden';
      const pl = pille(d.name, 18, '#161C4A', 26);
      const s = zuS(d.x + r.w / 2, d.y + d.r * Z + KANTE / 2);
      const x = klemmX(s.x, pl._w / 2), y = klemmY(s.y, pl._h / 2, pl._h / 2);
      if (Math.abs(y - s.y) > 26 || Math.abs(x - s.x) > r.w * cam.z * 0.45 || !passtY(y - pl._h / 2, y + pl._h / 2)) return;
      bildMalen(ctx, pl, x - pl._w / 2, y - pl._h / 2);
      iconMalen(ctx, icn, x - pl._w / 2 + 18, y - 1, 26);
      belegt.push({ x: x - pl._w / 2, y: y - pl._h / 2, w: pl._w, h: pl._h });
    });
    // c) Status-Blasen (wichtigste zuletzt = oben), in der sicheren Zone geklemmt
    const roh = blasenBerechnen(S, jetzt).filter(b => sichtbar(b.rect));
    roh.sort((a, b) => b.prio - a.prio || (String(a.ziel.id) < String(b.ziel.id) ? -1 : String(a.ziel.id) > String(b.ziel.id) ? 1 : 0));
    const gesetzt = [];
    let puls = null;
    const AB = R_BLASE * 2 + 8;
    roh.forEach(b => {
      const a = zuS(b.anker.x, b.anker.y);
      if (a.x < 0 || a.x > W || a.y < 0 || a.y > H) return;   // Anker ausserhalb des Bildes: keine Blase (Kamera zeigt sie beim Hinfliegen)
      const wunschY = b.ziel.art === 'feld' ? a.y - 10 : a.y - R_BLASE - 14;
      const x0 = klemmX(a.x, R_BLASE + 8), y0 = klemmY(wunschY, R_BLASE + 8, R_BLASE + 52);
      if (Math.abs(x0 - a.x) > 80 || Math.abs(y0 - wunschY) > 80) return;   // liegt unter HUD/Dock: lieber weglassen als falsch zeigen
      // Ueberlappung mit wichtigeren Blasen vermeiden: naechste freie Stelle auf einem kleinen Raster suchen
      const kollidiert = (x, y) => gesetzt.some(q => Math.abs(q.x - x) < AB && Math.abs(q.y - y) < AB);
      let x = x0, y = y0;
      if (kollidiert(x, y)) {
        const kand = [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [0, 1], [2, 0], [-2, 0], [1, 1], [-1, 1]];
        for (let n = 0; n < kand.length; n++) {
          const cx = klemmX(x0 + kand[n][0] * AB, R_BLASE + 8), cy = klemmY(y0 + kand[n][1] * (AB + 26), R_BLASE + 8, R_BLASE + 52);
          if (!kollidiert(cx, cy)) { x = cx; y = cy; break; }
        }
      }
      if (!passtY(y - R_BLASE - 4, y + R_BLASE + 30)) return;
      b.x = x; b.y = y; b.r = Math.max(42, R_BLASE + 10);
      b.pl = pille(b.label, 20, b.pille);
      b.lx = x - b.pl._w / 2; b.ly = y + R_BLASE + 8;
      if (!frei(b.lx, b.ly, b.pl._w, b.pl._h) && cam.z < 0.5) b.pl = null; // Restzeit/Verb ist wichtiger als die Platzregel - nur ganz weit draussen weglassen
      belegt.push({ x: x - R_BLASE, y: y - R_BLASE, w: R_BLASE * 2, h: R_BLASE * 2 });
      if (b.pl) belegt.push({ x: b.lx, y: b.ly, w: b.pl._w, h: b.pl._h });
      if (b.reif && !puls) puls = b;
      gesetzt.push(b);
    });
    if (effekteWenig()) puls = null;
    for (let i = gesetzt.length - 1; i >= 0; i--) zeichneBlase(ctx, gesetzt[i], t, gesetzt[i] === puls);
    blasenListe = gesetzt.map(b => ({ typ: 'blase', ziel: { art: b.ziel.art, id: b.ziel.id }, aktion: b.aktion, x: b.x, y: b.y, r: b.r, label: b.label,
      lx: b.pl ? b.lx : 0, ly: b.pl ? b.ly : 0, lw: b.pl ? b.pl._w : 0, lh: b.pl ? b.pl._h : 0, puls: b === puls }));
  }
  function zeitText(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s >= 3600) return Math.floor(s / 3600) + ' Std ' + Math.floor((s % 3600) / 60) + ' Min';
    if (s >= 60) return Math.floor(s / 60) + ' Min ' + (s % 60 < 10 ? '0' : '') + (s % 60) + ' s';
    return s + ' s';
  }

  // ----------------------------------------------------------------------------------------------
  // Wetter und Tageszeit (Bildschirmkoordinaten). Regen = schraege Tropfen aus einer vorgerenderten Kachel.
  // ----------------------------------------------------------------------------------------------
  const RK = 256;
  let regenKachel = null, schneeKachel = null, vignette = null, vignetteKey = '', nebelBild = null;
  function regenHolen() {
    if (regenKachel) return regenKachel;
    const c = document.createElement('canvas'); c.width = RK; c.height = RK;
    const g = c.getContext('2d'), rnd = G.zufall(1234);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * RK, y = rnd() * RK, l = 7 + rnd() * 5, a = 0.6 + rnd() * 0.35;
      for (let dx = -RK; dx <= RK; dx += RK) for (let dy = -RK; dy <= RK; dy += RK) {
        const px = x + dx, py = y + dy;
        if (px < -20 || px > RK + 20 || py < -30 || py > RK + 20) continue;
        // Tropfen: schmaler Schweif oben, runder Kopf unten (Fallrichtung schraeg nach links unten)
        g.strokeStyle = 'rgba(225,238,255,' + (a * 0.55) + ')'; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(px + l * 0.32, py - l); g.lineTo(px + 0.6, py - 1.5); g.stroke();
        g.fillStyle = 'rgba(40,70,120,' + (a * 0.55) + ')'; g.beginPath(); g.ellipse(px + 0.7, py + 0.7, 2.5, 3.3, 0.3, 0, 7); g.fill();
        g.fillStyle = 'rgba(235,245,255,' + a + ')'; g.beginPath(); g.ellipse(px, py, 2.1, 2.9, 0.3, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(px - 0.9, py - 1.4, 0.9, 1.2);
      }
    }
    return (regenKachel = c);
  }
  function schneeHolen() {
    if (schneeKachel) return schneeKachel;
    const c = document.createElement('canvas'); c.width = RK; c.height = RK;
    const g = c.getContext('2d'), rnd = G.zufall(777);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * RK, y = rnd() * RK, r = 1.6 + rnd() * 2;
      for (let dx = -RK; dx <= RK; dx += RK) for (let dy = -RK; dy <= RK; dy += RK) {
        g.fillStyle = 'rgba(120,140,170,0.35)'; g.beginPath(); g.arc(x + dx + 0.6, y + dy + 0.8, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill();
      }
    }
    return (schneeKachel = c);
  }
  function kachelFlaeche(ctx, bild, W, H, ox, oy, alpha) {
    ox = ((ox % RK) + RK) % RK; oy = ((oy % RK) + RK) % RK;
    ctx.globalAlpha = alpha;
    for (let y = oy - RK; y < H; y += RK) for (let x = ox - RK; x < W; x += RK) ctx.drawImage(bild, x, y);
    ctx.globalAlpha = 1;
  }
  function vignetteHolen(W, H) {
    const key = Math.round(W) + 'x' + Math.round(H);
    if (vignette && vignetteKey === key) return vignette;
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 80, 40, 128, 80, 150);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
    vignette = c; vignetteKey = key;
    return c;
  }
  function nebelHolen() {
    if (nebelBild) return nebelBild;
    const c = document.createElement('canvas'); c.width = 8; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(240,243,247,0.55)'); gr.addColorStop(1, 'rgba(240,243,247,0.12)');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    return (nebelBild = c);
  }
  function zeichneWetter(ctx, W, H, t, typ) {
    const tint = { bewoelkt: 'rgba(70,82,115,0.12)', regen: 'rgba(40,62,110,0.22)', gewitter: 'rgba(20,24,64,0.36)', hitze: 'rgba(255,170,60,0.08)', nebel: 'rgba(225,230,238,0.22)', schnee: 'rgba(225,235,255,0.20)' }[typ];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    if (typ === 'regen' || typ === 'gewitter') {
      const r = regenHolen();
      const sp = typ === 'gewitter' ? 1.25 : 1;
      kachelFlaeche(ctx, r, W, H, -t * 160 * sp, t * 560 * sp, 0.9);
      ctx.save(); ctx.scale(1.6, 1.6); kachelFlaeche(ctx, r, W / 1.6, H / 1.6, -t * 120 * sp + 97, t * 420 * sp + 51, 0.55); ctx.restore();
      if (typ === 'gewitter') {
        const blitz = Math.floor(t * 1.3), phase = (t * 1.3) - blitz;
        if (hz(blitz * 7 + 3) < 0.28 && phase < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - phase / 0.12)) + ')'; ctx.fillRect(0, 0, W, H); }
      }
    } else if (typ === 'schnee') {
      const s = schneeHolen();
      kachelFlaeche(ctx, s, W, H, Math.sin(t * 0.7) * 20, t * 38, 0.95);
      ctx.save(); ctx.scale(1.5, 1.5); kachelFlaeche(ctx, s, W / 1.5, H / 1.5, Math.sin(t * 0.5 + 1) * 14 + 60, t * 26 + 90, 0.6); ctx.restore();
    } else if (typ === 'nebel') {
      ctx.drawImage(nebelHolen(), 0, 0, W, H);
    } else if (typ === 'hitze') {
      ctx.globalAlpha = 0.22; ctx.drawImage(vignetteHolen(W, H), 0, 0, W, H); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,120,20,0.06)'; ctx.fillRect(0, 0, W, H);
    }
  }
  // Tageszeit: abends und nachts wird der Hof sanft dunkler und blauer (Navy der UI), morgens/abends liegt ein warmer
  // Schimmer darauf; nachts dunkelt eine vorgerenderte Vignette die Raender ab.
  function zeichneTageszeit(ctx, W, H, ms) {
    const d = new Date(ms), h = d.getHours() + d.getMinutes() / 60;
    let a = 0;
    if (h >= 21 || h < 5) a = 0.34;
    else if (h >= 19) a = 0.34 * (h - 19) / 2;
    else if (h < 7) a = 0.34 * (7 - h) / 2;
    if (a > 0.01) {
      ctx.fillStyle = 'rgba(14,19,70,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a * 1.1; ctx.drawImage(vignetteHolen(W, H), 0, 0, W, H); ctx.globalAlpha = 1;
    }
    const warm = (h >= 6 && h < 8.5) ? 0.12 * (1 - Math.abs(h - 7.25) / 1.25) : (h >= 17.5 && h < 20) ? 0.15 * (1 - Math.abs(h - 18.75) / 1.25) : 0;
    if (warm > 0.01) { ctx.fillStyle = 'rgba(255,140,60,' + warm.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ----------------------------------------------------------------------------------------------
  // Treffertest: zuerst Status-Blasen (Bildschirm, Radius >= 40 px), dann die Welt wie bisher
  // ----------------------------------------------------------------------------------------------
  function trefferBei(wx, wy, S) {
    if (letzteCam && blasenListe.length) {
      const c = letzteCam, sx = (wx - c.x) * c.z + c.W / 2, sy = (wy - c.y) * c.z + c.H / 2;
      let best = null, bd = 1e9;
      for (let i = blasenListe.length - 1; i >= 0; i--) {
        const b = blasenListe[i], dd = Math.hypot(sx - b.x, sy - b.y);
        const inPille = b.lw && sx >= b.lx && sx <= b.lx + b.lw && sy >= b.ly && sy <= b.ly + b.lh;
        if ((dd <= b.r || inPille) && dd < bd) { best = b; bd = inPille ? 0 : dd; }
      }
      if (best) return { typ: 'blase', ziel: { art: best.ziel.art, id: best.ziel.id }, aktion: best.aktion, art: best.ziel.art, id: best.ziel.id };
    }
    for (let i = 0; i < D.PRODUKTION.length; i++) { const b = D.PRODUKTION[i]; if (inRect(wx, wy, b, 8)) return { art: 'betrieb', id: b.id }; }
    for (let i = 0; i < D.GEBAEUDE.length; i++) { const g = D.GEBAEUDE[i]; if (inRect(wx, wy, g, 6)) return { art: 'gebaeude', id: g.art }; }
    for (let i = 0; i < D.SILOS.length; i++) { const s = D.SILOS[i]; if (Math.hypot(wx - s.x, wy - s.y) < s.r + 6 || inRect(wx, wy, { x: s.x - s.r, y: s.y - s.r * 1.15, w: s.r * 2, h: s.r * 2 })) return { art: 'gebaeude', id: 'silo' }; }
    for (let i = 0; i < D.FELDER.length; i++) { const f = D.FELDER[i]; if (inRect(wx, wy, { x: f.x, y: f.y, w: f.c * Z, h: f.r * Z + KANTE }, 10)) return { art: 'feld', id: f.id }; }
    if (inRect(wx, wy, D.HOF)) return { art: 'gebaeude', id: 'halle' };
    for (let i = 0; i < D.TIERE.length; i++) { const d = D.TIERE[i]; if (inRect(wx, wy, d.haus, 8) || inRect(wx, wy, d.auslauf, 4)) return { art: 'stall', id: d.id }; }
    return null;
  }
  function blasen() { return blasenListe.map(b => ({ typ: b.typ, ziel: { art: b.ziel.art, id: b.ziel.id }, aktion: b.aktion, x: b.x, y: b.y, r: b.r, label: b.label, puls: b.puls })); }
  function markiere(z) { markierung = z && z.art ? { art: z.art, id: z.id } : null; }
  function sichereZone(z) {
    if (!z) return Object.assign({}, zone);
    ['oben', 'unten', 'links', 'rechts'].forEach(k => { if (typeof z[k] === 'number' && isFinite(z[k])) zone[k] = Math.max(0, z[k]); });
    return Object.assign({}, zone);
  }

  baumeErzeugen();
  return { zeichneWelt, zeichneWetter, zeichneTageszeit, zeichneBeschriftungen, trefferBei, zeitText, jobPosen, parkplaetze, bahnen, blasen, markiere, sichereZone, zeitGrob };
})();
