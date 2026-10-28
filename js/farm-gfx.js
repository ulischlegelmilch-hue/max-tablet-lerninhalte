// Hof-Farm: Grafik. Alle Sprites werden einmal in Offscreen-Canvases gezeichnet (Draufsicht, Fahrtrichtung = +x)
// und danach nur noch gedreht aufs Spielfeld kopiert - schnell genug auch fuer das alte Tablet.
// Stil (seit 10/2026, Richtung "Arena"): Licht von links oben, dunkle Kontur, eingebackene Schatten nach rechts unten
// ohne Weichzeichner, "falsche 3/4-Tiefe" (dunklere Seitenwand 2-3 px tiefer). Kein shadowBlur, kein filter.
const FarmGfx = (function () {
  const D = FarmDaten;
  const SK = 3; // Sprite-Aufloesung (Pixel je Weltpixel)
  // Gelaende-Texturen: 1 = einfache Muster (schnell). 2 waere schaerfer auf Handys, kostet aber ohne GPU rund 10 ms je Bild (gemessen).
  const TS = 1;
  const INK = '#0A0D26';
  function muster(ctx, c) {
    const p = ctx.createPattern(c, 'repeat');
    if (TS !== 1) { try { p.setTransform(new DOMMatrix([1 / TS, 0, 0, 1 / TS, 0, 0])); } catch (e) { /* ungeschaerft */ } }
    return p;
  }
  const cache = {};

  function leinwand(b, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(b)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function abdunkeln(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r = r * (1 + f); gg = gg * (1 + f); b = b * (1 + f); } else { r = r + (255 - r) * f; gg = gg + (255 - gg) * f; b = b + (255 - b) * f; }
    return 'rgb(' + Math.round(r) + ',' + Math.round(gg) + ',' + Math.round(b) + ')';
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function zufall(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // Spriteflaeche in Weltkoordinaten [x0..x1] x [y0..y1]; zeichnet fn(g) mit Weltkoordinaten
  function sprite(x0, y0, x1, y1, fn, sk) {
    sk = sk || SK;
    const c = leinwand((x1 - x0) * sk, (y1 - y0) * sk);
    const g = c.getContext('2d');
    g.scale(sk, sk); g.translate(-x0, -y0);
    fn(g);
    return { c, ox: -x0, oy: -y0, w: x1 - x0, h: y1 - y0 };
  }
  // Silhouette eines Sprites in einer Farbe
  function silhouette(src, farbe) {
    const c = leinwand(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = farbe; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // Dunkle Kontur rundum (Silhouette in 12 Richtungen versetzt), danach das Original darueber
  function konturieren(sp, dicke, farbe) {
    const d = dicke * SK, si = silhouette(sp.c, farbe || INK);
    const c = leinwand(sp.c.width, sp.c.height), g = c.getContext('2d');
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.drawImage(si, Math.cos(a) * d, Math.sin(a) * d); }
    g.drawImage(sp.c, 0, 0);
    sp.c = c;
    return sp;
  }
  // Schatten: Silhouette schwarz einfaerben
  function schattenVon(sp) {
    return { c: silhouette(sp.c, 'rgba(14,30,6,0.34)'), ox: sp.ox, oy: sp.oy, w: sp.w, h: sp.h };
  }
  // Seitenwand ("falsche Tiefe"): dunklere Kopie des Sprites
  function seiteVon(sp) {
    const c = leinwand(sp.c.width, sp.c.height), g = c.getContext('2d');
    g.drawImage(sp.c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(10,13,38,0.72)'; g.fillRect(0, 0, c.width, c.height);
    return { c, ox: sp.ox, oy: sp.oy, w: sp.w, h: sp.h };
  }
  // Zeichnet ein Sprite gedreht. Schatten und Seitenwand liegen mit festem WELT-Versatz nach rechts unten bzw. unten,
  // damit das Licht immer von links oben kommt, egal wohin die Maschine faehrt.
  function zeichne(ctx, sp, x, y, winkel, mitSchatten, skala) {
    const s = skala || 1, k = s / 0.55;
    const ca = Math.cos(winkel) * s, sa = Math.sin(winkel) * s;
    ctx.save();
    if (mitSchatten && sp.schatten) {
      ctx.transform(ca, sa, -sa, ca, x + 4.5 * k, y + 6.5 * k);
      ctx.drawImage(sp.schatten.c, -sp.ox, -sp.oy, sp.w, sp.h);
      ctx.restore(); ctx.save();
    }
    if (sp.seite) {
      ctx.transform(ca, sa, -sa, ca, x, y + 2.3 * k);
      ctx.drawImage(sp.seite.c, -sp.ox, -sp.oy, sp.w, sp.h);
      ctx.restore(); ctx.save();
    }
    ctx.transform(ca, sa, -sa, ca, x, y);
    ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
    ctx.restore();
  }
  function mitSchatten(sp) { sp.schatten = schattenVon(sp); sp.seite = seiteVon(sp); return sp; }
  function fertig(sp, kontur) { konturieren(sp, kontur || 1.6); return mitSchatten(sp); }
  function glanz(g, x, y, w, h, a) { g.fillStyle = 'rgba(255,255,255,' + (a || 0.35) + ')'; rr(g, x, y, w, h, Math.min(w, h) / 2); g.fill(); }

  // ---- Reifen ----
  function reifen(g, cx, cy, laenge, breite) {
    g.fillStyle = '#1c1c22';
    rr(g, cx - laenge / 2, cy - breite / 2, laenge, breite, Math.min(laenge, breite) * 0.3); g.fill();
    g.strokeStyle = '#45464f'; g.lineWidth = 1.1;
    const n = Math.max(4, Math.round(laenge / 3.6));
    for (let i = 0; i < n; i++) {
      const x = cx - laenge / 2 + (i + 0.5) * laenge / n;
      g.beginPath(); g.moveTo(x - laenge * 0.03, cy - breite / 2 + 0.8); g.lineTo(x + laenge * 0.03, cy); g.lineTo(x - laenge * 0.03, cy + breite / 2 - 0.8); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    rr(g, cx - laenge / 2 + 1, cy - breite / 2 + 0.8, laenge - 2, breite * 0.28, 2); g.fill();
  }

  // ---- Traktor ----
  function traktorKoerper(d) {
    const m = D.MARKEN[d.marke];
    const l = d.l, b = d.b, ax = d.achs;
    const rw = b * 0.34, rtw = b * 0.24;
    return sprite(-l * 0.5, -b * 0.66, l * 0.9, b * 0.66, g => {
      // Hinterreifen
      reifen(g, 0, -(b / 2 - rtw / 2), rw * 2, rtw);
      reifen(g, 0, (b / 2 - rtw / 2), rw * 2, rtw);
      // Vorderachse (Reifen werden dynamisch gezeichnet)
      g.fillStyle = '#2b2d30'; g.fillRect(ax - 2, -b * 0.3, 4, b * 0.6);
      // Rahmen / Motorhaube
      const hx0 = ax * 0.22, hx1 = ax + l * 0.18, hb = b * 0.5;
      const grad = g.createLinearGradient(0, -hb / 2, 0, hb / 2);
      grad.addColorStop(0, abdunkeln(m.c1, 0.32)); grad.addColorStop(0.45, m.c1); grad.addColorStop(1, abdunkeln(m.c1, -0.3));
      g.fillStyle = grad; rr(g, hx0, -hb / 2, hx1 - hx0, hb, hb * 0.3); g.fill();
      // Glanzstreifen auf der Haube (Licht von links oben)
      glanz(g, hx0 + (hx1 - hx0) * 0.12, -hb * 0.4, (hx1 - hx0) * 0.7, hb * 0.14, 0.42);
      // Zierstreifen
      g.fillStyle = m.c2; g.fillRect(hx0 + (hx1 - hx0) * 0.06, hb * 0.02, (hx1 - hx0) * 0.86, hb * 0.14);
      // Kuehlergrill vorn
      g.fillStyle = '#16181a'; rr(g, hx1 - 5, -hb * 0.34, 4, hb * 0.68, 1.5); g.fill();
      g.strokeStyle = '#4a4d52'; g.lineWidth = 0.6;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx1 - 5, i * hb * 0.12); g.lineTo(hx1 - 1.5, i * hb * 0.12); g.stroke(); }
      // Scheinwerfer
      g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(hx1 - 1.5, -hb * 0.42, 2.2, 0, 7); g.arc(hx1 - 1.5, hb * 0.42, 2.2, 0, 7); g.fill();
      // Auspuff
      g.fillStyle = '#3d4044'; g.beginPath(); g.arc(hx0 + (hx1 - hx0) * 0.38, -hb * 0.3, 2.6, 0, 7); g.fill();
      g.fillStyle = '#8a8e93'; g.beginPath(); g.arc(hx0 + (hx1 - hx0) * 0.38 - 0.5, -hb * 0.3 - 0.5, 1.2, 0, 7); g.fill();
      // Kotfluegel ueber den Hinterreifen
      g.fillStyle = abdunkeln(m.c1, -0.08);
      rr(g, -rw * 0.95, -b / 2 - 0.5, rw * 1.9, rtw + 1.5, 3); g.fill();
      rr(g, -rw * 0.95, b / 2 - rtw - 1, rw * 1.9, rtw + 1.5, 3); g.fill();
      glanz(g, -rw * 0.8, -b / 2 + 0.4, rw * 1.4, 1.6, 0.4);
      // Kabine: Glasrand + Dach
      const cx0 = -l * 0.2, cx1 = ax * 0.34 + 2, cb = b * 0.74;
      g.fillStyle = '#1d2a36'; rr(g, cx0, -cb / 2, cx1 - cx0, cb, 4); g.fill();
      g.fillStyle = 'rgba(150,215,255,0.55)'; rr(g, cx0 + 1, -cb / 2 + 1, cx1 - cx0 - 2, cb - 2, 3.5); g.fill();
      const dg = g.createLinearGradient(0, -cb / 2, 0, cb / 2);
      dg.addColorStop(0, abdunkeln(m.dach, 0.3)); dg.addColorStop(1, abdunkeln(m.dach, -0.2));
      g.fillStyle = dg; rr(g, cx0 + 2.6, -cb / 2 + 2.6, cx1 - cx0 - 5.6, cb - 5.2, 3); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.7; g.stroke();
      glanz(g, cx0 + 4, -cb / 2 + 4, (cx1 - cx0) * 0.55, 2, 0.75);
      // Lichtbalken / Arbeitsscheinwerfer
      g.fillStyle = '#ffd96b'; g.fillRect(cx1 - 4, -cb * 0.3, 1.6, cb * 0.6);
      // Heckanbau-Arme
      g.strokeStyle = '#2a2d31'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-l * 0.2, -b * 0.18); g.lineTo(-l * 0.38, -b * 0.1); g.moveTo(-l * 0.2, b * 0.18); g.lineTo(-l * 0.38, b * 0.1); g.stroke();
      g.fillStyle = '#c8cdd2'; g.beginPath(); g.arc(-l * 0.38, 0, 2.2, 0, 7); g.fill();
    });
  }
  function vorderrad(d) {
    const b = d.b;
    return sprite(-b * 0.27, -b * 0.13, b * 0.27, b * 0.13, g => { reifen(g, 0, 0, b * 0.4, b * 0.17); });
  }

  // ---- Erntemaschine ----
  function erntemaschine(d) {
    const m = D.MARKEN[d.marke];
    const l = d.l, b = d.b;
    const wurzel = d.typ === 'rodemaschine';
    const hw = d.w;
    return sprite(-l * 0.95, -Math.max(hw, b) * 0.62, l * 0.45 + 30, Math.max(hw, b) * 0.62, g => {
      // Hinterraeder (lenken) werden dynamisch gezeichnet - Treibachse bei x=0
      reifen(g, 0, -b * 0.46, b * 0.5, b * 0.16);
      reifen(g, 0, b * 0.46, b * 0.5, b * 0.16);
      g.fillStyle = '#2b2d30'; g.fillRect(-1.5, -b * 0.46, 3, b * 0.92);
      // Korpus
      const x0 = -l * 0.82, x1 = l * 0.2;
      const grad = g.createLinearGradient(0, -b * 0.4, 0, b * 0.4);
      grad.addColorStop(0, abdunkeln(m.c1, 0.3)); grad.addColorStop(0.45, m.c1); grad.addColorStop(1, abdunkeln(m.c1, -0.32));
      g.fillStyle = grad; rr(g, x0, -b * 0.38, x1 - x0, b * 0.76, 6); g.fill();
      // Korntank / Dreschwerk (Deckel)
      g.fillStyle = abdunkeln(m.c1, 0.14); rr(g, x0 + 4, -b * 0.3, (x1 - x0) * 0.62, b * 0.6, 5); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.7; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      for (let i = 1; i < 5; i++) { const xx = x0 + 4 + (x1 - x0) * 0.62 * i / 5; g.beginPath(); g.moveTo(xx, -b * 0.28); g.lineTo(xx, b * 0.28); g.stroke(); }
      glanz(g, x0 + 7, -b * 0.27, (x1 - x0) * 0.5, 2.4, 0.4);
      // Entladerohr (eingeklappt, seitlich)
      g.fillStyle = m.c2 === '#d4202a' ? '#8a1219' : abdunkeln(m.c1, -0.4);
      rr(g, x0 + 8, b * 0.3, (x1 - x0) * 0.55, 4, 2); g.fill();
      // Kabine vorn
      const cx0 = x1 - l * 0.34, cx1 = x1 + 6, cb = b * 0.58;
      g.fillStyle = '#1d2a36'; rr(g, cx0, -cb / 2, cx1 - cx0, cb, 4); g.fill();
      g.fillStyle = 'rgba(150,215,255,0.55)'; rr(g, cx0 + 1, -cb / 2 + 1, cx1 - cx0 - 2, cb - 2, 3.5); g.fill();
      const dg = g.createLinearGradient(0, -cb / 2, 0, cb / 2);
      dg.addColorStop(0, abdunkeln(m.dach, 0.3)); dg.addColorStop(1, abdunkeln(m.dach, -0.2));
      g.fillStyle = dg; rr(g, cx0 + 2.6, -cb / 2 + 2.6, cx1 - cx0 - 6, cb - 5.2, 3); g.fill();
      glanz(g, cx0 + 4, -cb / 2 + 4, (cx1 - cx0) * 0.5, 2, 0.75);
      g.fillStyle = '#ffd96b'; g.fillRect(cx1 - 3, -cb * 0.3, 1.6, cb * 0.6);
      // Einzugskanal
      g.fillStyle = '#3a3f44'; g.fillRect(x1 + 4, -Math.min(hw * 0.5, b * 0.34), 12, Math.min(hw, b * 0.68));
      // Schneidwerk / Roder
      const hx0 = x1 + 14, hl = wurzel ? 16 : 22;
      if (!wurzel) {
        g.fillStyle = '#2d3135'; g.fillRect(hx0 + hl - 2, -hw / 2, 3, hw);
        const hg = g.createLinearGradient(hx0, 0, hx0 + hl, 0);
        hg.addColorStop(0, abdunkeln(m.c1, -0.2)); hg.addColorStop(1, abdunkeln(m.c1, 0.12));
        g.fillStyle = hg; rr(g, hx0, -hw / 2, hl - 2, hw, 3); g.fill();
        // Haspel (Streifen)
        g.fillStyle = 'rgba(255,255,255,0.26)';
        for (let yy = -hw / 2 + 4; yy < hw / 2 - 3; yy += 7) g.fillRect(hx0 + 3, yy, hl - 8, 2.4);
        // Messerbalken-Spitzen
        g.fillStyle = '#d7dadd';
        for (let yy = -hw / 2; yy < hw / 2; yy += 4) g.fillRect(hx0 + hl - 1, yy, 3, 2);
      } else {
        const reihen = Math.max(2, Math.round(hw / 28));
        for (let i = 0; i < reihen; i++) {
          const yy = -hw / 2 + (i + 0.5) * hw / reihen;
          g.fillStyle = abdunkeln(m.c1, -0.25); rr(g, hx0, yy - 7, hl + 4, 14, 4); g.fill();
          g.fillStyle = '#d7dadd'; g.beginPath(); g.moveTo(hx0 + hl + 4, yy - 5); g.lineTo(hx0 + hl + 12, yy); g.lineTo(hx0 + hl + 4, yy + 5); g.fill();
        }
        g.fillStyle = '#2d3135'; g.fillRect(hx0 - 2, -hw / 2, 4, hw);
      }
    });
  }
  function lenkrad(d) {
    const b = d.b;
    return sprite(-b * 0.2, -b * 0.12, b * 0.2, b * 0.12, g => { reifen(g, 0, 0, b * 0.32, b * 0.12); });
  }

  // ---- Anbaugeraete (Ursprung = Kupplungspunkt, ragt nach -x) ----
  function geraet(d) {
    const m = D.MARKEN[d.marke];
    const w = d.w, len = d.len;
    return sprite(-len - 20, -w / 2 - 8, 10, w / 2 + 8, g => {
      // Zugdreieck
      g.strokeStyle = '#2a2d31'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -Math.min(14, w * 0.18)); g.moveTo(0, 0); g.lineTo(-12, Math.min(14, w * 0.18)); g.stroke();
      const bal = (x, dicke, farbe) => { g.fillStyle = farbe; rr(g, x - dicke, -w / 2, dicke, w, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x - dicke + 0.8, -w / 2 + 1, dicke * 0.35, w - 2); };
      if (d.typ === 'grubber') {
        bal(-13, 7, m.c1);
        g.strokeStyle = '#33373b'; g.lineWidth = 1.2;
        for (let r = 0; r < 2; r++) for (let y = -w / 2 + 4 + r * 4; y < w / 2 - 2; y += 8) { g.beginPath(); g.moveTo(-14 - r * 8, y); g.lineTo(-22 - r * 8, y); g.stroke(); }
        bal(-30, 5, abdunkeln(m.c1, -0.15));
        // Packerwalze
        const seg = Math.max(8, Math.round(w / 9));
        for (let i = 0; i < seg; i++) {
          g.fillStyle = i % 2 ? '#8a9096' : '#b4bbc1';
          g.fillRect(-len + 0, -w / 2 + i * w / seg, 12, w / seg + 0.4);
        }
      } else if (d.typ === 'pflug') {
        bal(-12, 6, m.c1);
        const n = Math.max(3, Math.round(w / 24));
        for (let i = 0; i < n; i++) {
          const y = -w / 2 + (i + 0.5) * w / n;
          g.fillStyle = '#3a3e43'; g.beginPath(); g.moveTo(-16, y - 8); g.lineTo(-len, y + 4); g.lineTo(-len + 6, y + 10); g.lineTo(-16, y + 3); g.closePath(); g.fill();
          g.fillStyle = '#c9ced3'; g.beginPath(); g.moveTo(-24, y - 4); g.lineTo(-len + 2, y + 6); g.lineTo(-len + 7, y + 10); g.lineTo(-28, y + 2); g.closePath(); g.fill();
        }
      } else if (d.typ === 'saeen') {
        bal(-12, 6, '#3b3f44');
        // Saatkasten
        const teile = Math.max(2, Math.round(w / 60));
        for (let i = 0; i < teile; i++) {
          const y0 = -w / 2 + 2 + i * (w - 4) / teile;
          g.fillStyle = m.c1; rr(g, -42, y0 + 1, 26, (w - 4) / teile - 3, 4); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-38, y0 + 4, 18, 2.4);
        }
        // Saatscheiben
        g.fillStyle = '#2f3337';
        for (let y = -w / 2 + 3; y < w / 2 - 1; y += 6) { g.beginPath(); g.arc(-len + 2, y, 2.3, 0, 7); g.fill(); }
        bal(-len + 8, 3, '#4a4f55');
      } else if (d.typ === 'walze') {
        bal(-12, 6, '#3b3f44');
        const seg = Math.max(6, Math.round(w / 12));
        for (let r = 0; r < 2; r++) {
          const x0 = -20 - r * 14;
          for (let i = 0; i < seg; i++) {
            g.fillStyle = (i + r) % 2 ? '#7f868c' : '#b3bbc1';
            g.fillRect(x0 - 12, -w / 2 + i * w / seg, 12, w / seg + 0.4);
          }
        }
        g.fillStyle = m.c1; rr(g, -16, -w / 2 - 2, 4, w + 4, 2); g.fill();
      } else if (d.typ === 'kalk') {
        bal(-10, 5, '#3b3f44');
        const hw = Math.min(w * 0.42, 70);
        g.fillStyle = m.c1; rr(g, -34, -hw / 2, 26, hw, 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)'; rr(g, -31, -hw / 2 + 4, 20, hw - 8, 3); g.fill();
        g.fillStyle = '#cfd3d6';
        g.beginPath(); g.arc(-40, -w * 0.28, 5, 0, 7); g.arc(-40, w * 0.28, 5, 0, 7); g.fill();
      } else if (d.typ === 'spritze') {
        bal(-10, 4, '#3b3f44');
        g.fillStyle = m.c1; g.beginPath(); g.ellipse(-22, 0, 14, 20, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-26, -6, 6, 8, 0, 0, 7); g.fill();
        g.fillStyle = '#4a4f55'; g.fillRect(-len + 2, -w / 2, 3, w);
        g.strokeStyle = '#4a4f55'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-len + 3, 0); g.stroke();
      } else { // duenger
        bal(-10, 5, '#3b3f44');
        g.fillStyle = m.c1; g.beginPath(); g.ellipse(-24, 0, 16, Math.min(24, w * 0.15), 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-28, -5, 7, 5, 0, 0, 7); g.fill();
        g.fillStyle = '#cfd3d6';
        g.beginPath(); g.arc(-40, -Math.min(30, w * 0.2), 5, 0, 7); g.arc(-40, Math.min(30, w * 0.2), 5, 0, 7); g.fill();
      }
    });
  }
  // Streu-/Spruehfaecher hinter dem Geraet (ohne Kontur, halbdurchsichtig) - nur beim Arbeiten gezeichnet
  const faecherCache = {};
  function faecher(d) {
    if (faecherCache[d.id] !== undefined) return faecherCache[d.id];
    const w = d.w, len = d.len;
    let sp = null;
    if (d.typ === 'kalk' || d.typ === 'duenger' || d.typ === 'spritze') {
      sp = sprite(-len - 22, -w / 2 - 4, -len + 4, w / 2 + 4, g => {
        if (d.typ === 'spritze') {
          g.fillStyle = 'rgba(170,220,255,0.30)'; g.fillRect(-len - 14, -w / 2, 14, w);
          g.fillStyle = 'rgba(200,235,255,0.75)';
          for (let y = -w / 2 + 6; y < w / 2 - 3; y += 12) { g.beginPath(); g.arc(-len - 2, y, 1.7, 0, 7); g.fill(); }
        } else {
          g.fillStyle = d.typ === 'kalk' ? 'rgba(250,250,245,0.36)' : 'rgba(225,235,240,0.34)';
          g.beginPath(); g.moveTo(-len + 2, -w * 0.2); g.lineTo(-len - 20, -w / 2); g.lineTo(-len - 20, w / 2); g.lineTo(-len + 2, w * 0.2); g.closePath(); g.fill();
        }
      });
    }
    faecherCache[d.id] = sp;
    return sp;
  }

  // ---- Zugriff mit Cache ----
  function fuerDef(d) {
    if (cache[d.id]) return cache[d.id];
    let r;
    if (d.art === 'traktor') {
      r = { koerper: fertig(traktorKoerper(d), 1.7), rad: konturieren(vorderrad(d), 1.2) };
    } else if (d.art === 'ernter') {
      r = { koerper: fertig(erntemaschine(d), 1.8), rad: konturieren(lenkrad(d), 1.2) };
    } else {
      r = { koerper: fertig(geraet(d), 1.5) };
    }
    cache[d.id] = r;
    return r;
  }

  // Vorschau-Bild (fuer Haendler-Karten): Draufsicht, quer gestellt
  function vorschau(d, breite, hoehe) {
    const c = leinwand(breite * 2, hoehe * 2);
    const g = c.getContext('2d');
    const s = fuerDef(d);
    const k = s.koerper;
    const dreh = d.art === 'geraet';   // Geraete quer legen: Arbeitsbreite waagerecht
    const bw = dreh ? k.h : k.w, bh = dreh ? k.w : k.h;
    let sk = Math.min(breite * 2 / bw, hoehe * 2 / bh) * 0.92;
    sk = Math.min(sk, 3.4);
    g.translate(c.width / 2, c.height / 2);
    if (dreh) g.rotate(-Math.PI / 2);
    g.scale(sk, sk);
    g.translate(-(k.w / 2 - k.ox), -(k.h / 2 - k.oy));
    g.drawImage(k.seite.c, -k.ox, -k.oy + 1.6, k.w, k.h);
    g.drawImage(k.c, -k.ox, -k.oy, k.w, k.h);
    if (s.rad) {
      const ax = d.art === 'traktor' ? d.achs : -d.achs;
      const hr = (d.art === 'traktor') ? d.b * 0.34 : d.b * 0.46;
      [-1, 1].forEach(v => {
        g.drawImage(s.rad.c, ax - s.rad.ox, v * hr - s.rad.oy, s.rad.w, s.rad.h);
      });
    }
    return c.toDataURL('image/png');
  }

  // ---- Gelaende-Texturen (alte Muster, fuer Kompatibilitaet) ----
  function grasMuster(ctx) { return muster(ctx, textur('gras')); }
  function asphaltMuster(ctx) { return muster(ctx, textur('asphalt')); }
  function betonMuster(ctx) { return muster(ctx, textur('beton')); }
  function brachMuster(ctx) { return muster(ctx, textur('wiese')); }

  // ---- Neue Texturkacheln (1 px je Weltpixel, nahtlos). grob=true: ruhigere Variante fuer kleinen Zoom (kein Flimmern) ----
  const texCache = {};
  function nahtlos(g, n, fn) { [-n, 0, n].forEach(dx => [-n, 0, n].forEach(dy => { g.save(); g.translate(dx, dy); fn(g); g.restore(); })); }
  function textur(art, grob) {
    const key = art + (grob ? '~' : '');
    if (texCache[key]) return texCache[key];
    let n = 128;
    const c = leinwand(n, n), g = c.getContext('2d');
    const rnd = zufall(art.length * 977 + art.charCodeAt(0) * 13 + (grob ? 5 : 0));
    if (art === 'gras') {
      g.fillStyle = '#86CC47'; g.fillRect(0, 0, n, n);
      const flecken = [];
      for (let i = 0; i < (grob ? 70 : 40); i++) flecken.push([rnd() * n, rnd() * n, grob ? 2 + rnd() * 4 : 5 + rnd() * 14, rnd() < 0.5]);
      nahtlos(g, n, gg => flecken.forEach(f => { gg.fillStyle = f[3] ? (grob ? 'rgba(155,219,90,0.22)' : 'rgba(155,219,90,0.24)') : (grob ? 'rgba(104,180,46,0.18)' : 'rgba(104,180,46,0.20)'); gg.beginPath(); gg.ellipse(f[0], f[1], f[2], f[2] * 0.7, 0, 0, 7); gg.fill(); }));
      if (!grob) {
        const halme = [];
        for (let i = 0; i < 260; i++) halme.push([rnd() * n, rnd() * n, 2.5 + rnd() * 3, rnd() < 0.55]);
        nahtlos(g, n, gg => {
          gg.lineWidth = 1;
          halme.forEach(h => { gg.strokeStyle = h[3] ? 'rgba(175,232,110,0.55)' : 'rgba(70,140,32,0.40)'; gg.beginPath(); gg.moveTo(h[0], h[1]); gg.lineTo(h[0] + 0.8, h[1] - h[2]); gg.stroke(); });
        });
        const blumen = [];
        for (let i = 0; i < 4; i++) blumen.push([rnd() * n, rnd() * n, ['#ffffff', '#fff27a', '#ffd0e0'][i % 3]]);
        nahtlos(g, n, gg => blumen.forEach(b => { gg.fillStyle = b[2]; gg.beginPath(); gg.arc(b[0], b[1], 1.1, 0, 7); gg.fill(); }));
      }
    } else if (art === 'wiese') {
      g.fillStyle = '#93D452'; g.fillRect(0, 0, n, n);
      const fl = [];
      for (let i = 0; i < (grob ? 80 : 30); i++) fl.push([rnd() * n, rnd() * n, grob ? 2 + rnd() * 4 : 6 + rnd() * 16, rnd() < 0.5]);
      nahtlos(g, n, gg => fl.forEach(f => { gg.fillStyle = f[3] ? (grob ? 'rgba(170,228,105,0.3)' : 'rgba(170,228,105,0.28)') : (grob ? 'rgba(110,184,52,0.22)' : 'rgba(110,184,52,0.22)'); gg.beginPath(); gg.ellipse(f[0], f[1], f[2], f[2] * 0.75, 0, 0, 7); gg.fill(); }));
      if (grob) { const bl = []; for (let i = 0; i < 40; i++) bl.push([rnd() * n, rnd() * n, ['rgba(255,255,255,0.7)', 'rgba(255,226,61,0.7)', 'rgba(255,159,192,0.6)'][i % 3]]); nahtlos(g, n, gg => bl.forEach(b => { gg.fillStyle = b[2]; gg.fillRect(b[0], b[1], 2, 2); })); }
      if (!grob) {
        const halme = [];
        for (let i = 0; i < 340; i++) halme.push([rnd() * n, rnd() * n, 3 + rnd() * 4.5, rnd()]);
        nahtlos(g, n, gg => { gg.lineWidth = 1.1; halme.forEach(h => { gg.strokeStyle = h[3] < 0.5 ? 'rgba(190,240,120,0.6)' : 'rgba(78,150,40,0.45)'; gg.beginPath(); gg.moveTo(h[0], h[1]); gg.quadraticCurveTo(h[0] + 1, h[1] - h[2] * 0.6, h[0] + (h[3] - 0.5) * 3, h[1] - h[2]); gg.stroke(); }); });
        const bl = [];
        for (let i = 0; i < 26; i++) bl.push([rnd() * n, rnd() * n, ['#ffffff', '#ffe23d', '#ff9fc0', '#c9a7ff', '#ffffff'][i % 5]]);
        nahtlos(g, n, gg => bl.forEach(b => { gg.fillStyle = b[2]; gg.beginPath(); gg.arc(b[0], b[1], 1.5, 0, 7); gg.fill(); gg.fillStyle = 'rgba(255,200,40,0.9)'; gg.fillRect(b[0] - 0.4, b[1] - 0.4, 0.8, 0.8); }));
      }
    } else if (art === 'asphalt') {
      g.fillStyle = '#5E6577'; g.fillRect(0, 0, n, n);
      if (!grob) for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '10,13,38') + ',' + (0.04 + rnd() * 0.06) + ')'; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
    } else if (art === 'kies') {
      g.fillStyle = '#DCCBA2'; g.fillRect(0, 0, n, n);
      if (!grob) {
        const st = [];
        for (let i = 0; i < 420; i++) st.push([rnd() * n, rnd() * n, 0.7 + rnd() * 1.5, rnd()]);
        nahtlos(g, n, gg => st.forEach(s => { gg.fillStyle = s[3] < 0.45 ? 'rgba(160,135,90,0.55)' : s[3] < 0.8 ? 'rgba(245,236,212,0.8)' : 'rgba(120,100,70,0.45)'; gg.beginPath(); gg.arc(s[0], s[1], s[2], 0, 7); gg.fill(); }));
      } else { for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(160,135,90,0.18)'; g.fillRect(rnd() * n, rnd() * n, 4, 4); } }
    } else if (art === 'beton') {
      n = 160;
      c.width = n; c.height = n;
      g.fillStyle = '#CFC8B6'; g.fillRect(0, 0, n, n);
      if (!grob) for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '90,80,60') + ',' + (0.04 + rnd() * 0.05) + ')'; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
      g.fillStyle = 'rgba(110,100,82,0.45)'; g.fillRect(0, 0, n, 1.5); g.fillRect(0, 0, 1.5, n); g.fillRect(0, n / 2, n, 1); g.fillRect(n / 2, 0, 1, n);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 1.5, n, 1); g.fillRect(1.5, 0, 1, n);
    } else if (art === 'sand') {
      g.fillStyle = '#E3CD96'; g.fillRect(0, 0, n, n);
      if (!grob) for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '250,240,210' : '170,140,90') + ',0.4)'; g.fillRect(rnd() * n, rnd() * n, 1.2, 1.2); }
    } else if (art === 'weg') {
      g.fillStyle = '#D9B57A'; g.fillRect(0, 0, n, n);
      if (!grob) for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '245,225,180' : '160,120,70') + ',0.45)'; g.beginPath(); g.arc(rnd() * n, rnd() * n, 0.6 + rnd(), 0, 7); g.fill(); }
    }
    texCache[key] = c;
    return c;
  }

  // ---- Feldoberflaechen-Kacheln (48x48 Weltpixel, Reihen laengs = waagerecht; quer=true dreht die Reihen) ----
  const FRUCHT_REIF = {
    weizen: { grund: '#F0C552', reihe: '#D9A23A', hell: '#FBE08A' },
    gerste: { grund: '#D8CF8A', reihe: '#B8AE66', hell: '#ECE6B4' },
    roggen: { grund: '#DDBA6C', reihe: '#BF9A48', hell: '#F0D79A' },
    hafer: { grund: '#E8D592', reihe: '#C9B062', hell: '#F6EAC0' },
    raps: { grund: '#6DB83A', reihe: '#4F9A2C', hell: '#9AD45E', bluete: '#FFE23D' },
    mais: { grund: '#B9B243', reihe: '#8E8A2A', hell: '#DCD478' },
    sonnenblume: { grund: '#4C9A2C', reihe: '#3A7E22', hell: '#78BE48', bluete: '#F7C21A' }
  };
  function fruchtFarben(frucht) {
    if (FRUCHT_REIF[frucht]) return FRUCHT_REIF[frucht];
    const fz = D.frucht(frucht), f = fz ? fz.farben : { reif: '#d9c070', reihe: '#b09040' };
    return { grund: f.reif, reihe: f.reihe, hell: abdunkeln(f.reif, 0.35) };
  }
  // art: stoppel | bearbeitet | gepfluegt | pflanze (stufe 0..4) | wiese
  function feldKachel(art, frucht, stufe, quer, grob) {
    const key = [art, frucht || '', stufe, quer ? 1 : 0, grob ? 1 : 0].join('|');
    if (texCache[key]) return texCache[key];
    const n = 48, c = leinwand(n, n), g0 = c.getContext('2d');
    if (quer) { g0.translate(n, 0); g0.rotate(Math.PI / 2); }
    const g = g0, rnd = zufall(key.length * 131 + stufe * 17 + (frucht ? frucht.charCodeAt(0) * 7 : 3));
    const reihen = y => { for (let r = 0; r < 6; r++) y(r * 8); };
    const punkte = (anz, farbe, gr) => { for (let i = 0; i < anz; i++) { g.fillStyle = farbe; g.beginPath(); g.arc(rnd() * n, rnd() * n, gr * (0.6 + rnd() * 0.6), 0, 7); g.fill(); } };
    if (art === 'stoppel') {
      g.fillStyle = '#E7D28F'; g.fillRect(0, 0, n, n);
      if (grob) { reihen(y => { g.fillStyle = 'rgba(190,160,90,0.35)'; g.fillRect(0, y + 5, n, 2); }); }
      else {
        reihen(y => { g.fillStyle = 'rgba(196,166,96,0.55)'; g.fillRect(0, y + 5, n, 1.4); g.fillStyle = 'rgba(255,246,205,0.6)'; g.fillRect(0, y + 1, n, 1); });
        for (let i = 0; i < 90; i++) { const x = rnd() * n, y = rnd() * n; g.strokeStyle = rnd() < 0.6 ? 'rgba(170,140,70,0.6)' : 'rgba(255,248,210,0.8)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.6, y - 2); g.stroke(); }
      }
    } else if (art === 'bearbeitet') {
      g.fillStyle = '#C48B55'; g.fillRect(0, 0, n, n);
      reihen(y => { g.fillStyle = 'rgba(150,100,55,0.55)'; g.fillRect(0, y + 5, n, 2); g.fillStyle = 'rgba(222,170,115,0.5)'; g.fillRect(0, y + 1.5, n, 1.4); });
      if (!grob) { punkte(46, 'rgba(140,92,48,0.75)', 1.2); punkte(34, 'rgba(232,186,132,0.85)', 0.9); }
    } else if (art === 'gepfluegt') {
      g.fillStyle = '#A9693A'; g.fillRect(0, 0, n, n);
      reihen(y => {
        g.fillStyle = 'rgba(110,62,28,0.85)'; g.fillRect(0, y + 5.2, n, 2.6);
        g.fillStyle = 'rgba(205,140,86,0.75)'; g.fillRect(0, y + 1, n, 2.2);
        g.fillStyle = 'rgba(236,180,120,0.5)'; g.fillRect(0, y + 1, n, 0.8);
      });
      if (!grob) punkte(26, 'rgba(90,50,22,0.6)', 1.1);
    } else if (art === 'wiese') {
      const t = textur('wiese', grob);
      g.drawImage(t, 0, 0, n, n, 0, 0, n, n);
    } else { // pflanze
      const f = frucht ? D.frucht(frucht) : null, ff = f ? f.farben : { jung: '#7ec850', hoch: '#5fae3a' };
      if (stufe <= 0) {
        g.fillStyle = '#8C5830'; g.fillRect(0, 0, n, n);
        reihen(y => { g.fillStyle = 'rgba(105,62,30,0.9)'; g.fillRect(0, y + 3, n, 2.4); g.fillStyle = 'rgba(178,120,72,0.6)'; g.fillRect(0, y + 1, n, 1); });
        if (!grob) reihen(y => { for (let x = 1; x < n; x += 4) { g.fillStyle = 'rgba(170,228,110,0.85)'; g.fillRect(x + rnd(), y + 3.5, 1.2, 1.2); } });
      } else if (stufe === 1 || stufe === 2) {
        g.fillStyle = '#93603A'; g.fillRect(0, 0, n, n);
        reihen(y => { g.fillStyle = 'rgba(110,66,34,0.8)'; g.fillRect(0, y + 6.4, n, 1.4); });
        const br = stufe === 1 ? 2.2 : 4.4;
        reihen(y => {
          g.fillStyle = ff.jung; g.fillRect(0, y + 4 - br / 2, n, br);
          if (!grob) { g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, y + 4 - br / 2, n, 0.8); g.fillStyle = 'rgba(30,70,10,0.3)'; g.fillRect(0, y + 4 + br / 2 - 0.8, n, 0.8); }
        });
        if (!grob) for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(150,220,90,0.8)'; g.fillRect(rnd() * n, Math.floor(rnd() * 6) * 8 + 4 - br / 2 - 1, 1.4, br + 2); }
      } else if (stufe === 3) {
        const gr = frucht === 'raps' ? '#6DB83A' : ff.hoch;
        g.fillStyle = gr; g.fillRect(0, 0, n, n);
        reihen(y => { g.fillStyle = 'rgba(20,60,10,0.26)'; g.fillRect(0, y + 6, n, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y + 1, n, 1.4); });
        if (!grob) { punkte(70, 'rgba(160,225,100,0.5)', 1.3); punkte(40, 'rgba(25,70,15,0.3)', 1.2); }
        if (frucht === 'raps' && !grob) punkte(10, '#FFE23D', 0.9);
        if (frucht === 'lein' && !grob) punkte(14, '#9cc8ff', 1);
      } else { // reif
        const rf = fruchtFarben(frucht);
        g.fillStyle = rf.grund; g.fillRect(0, 0, n, n);
        reihen(y => { g.fillStyle = rf.reihe; g.fillRect(0, y + 5.6, n, 2.2); g.fillStyle = rf.hell; g.globalAlpha = 0.7; g.fillRect(0, y + 1, n, 1.6); g.globalAlpha = 1; });
        if (!grob) {
          if (rf.bluete && frucht === 'raps') { punkte(30, 'rgba(160,225,100,0.6)', 1.4); punkte(120, rf.bluete, 1.25); punkte(30, '#FFF6A8', 0.7); }
          else if (frucht === 'sonnenblume') {
            reihen(y => { for (let x = 3 + (y % 16 ? 4 : 0); x < n; x += 8) { g.fillStyle = rf.bluete; g.beginPath(); g.arc(x, y + 3.5, 2.6, 0, 7); g.fill(); g.fillStyle = '#6a4515'; g.beginPath(); g.arc(x, y + 3.5, 1.1, 0, 7); g.fill(); } });
          } else {
            // Aehren als kleine Striche quer zur Reihe
            reihen(y => { for (let x = (y % 16) ? 1 : 3; x < n; x += 4) { g.fillStyle = rf.hell; g.fillRect(x, y + 1.5, 1.2, 3.2); g.fillStyle = rf.reihe; g.fillRect(x + 1.2, y + 2.5, 0.8, 2.6); } });
            if (frucht === 'gerste') reihen(y => { g.strokeStyle = 'rgba(250,245,210,0.65)'; g.lineWidth = 0.6; for (let x = 2; x < n; x += 4) { g.beginPath(); g.moveTo(x, y + 1.5); g.lineTo(x + 1.6, y - 1); g.stroke(); } });
          }
        } else if (frucht === 'raps') { punkte(40, rf.bluete, 1.6); }
      }
    }
    texCache[key] = c;
    return c;
  }

  // ---- Alte 20x20-Feldkacheln (Kompatibilitaet; die neue Ansicht nutzt feldKachel) ----
  function kachel(art, frucht, stufe, variante) {
    return feldKachel(art === 'pflanze' ? 'pflanze' : art, frucht, art === 'pflanze' ? stufe : 0, false, false);
  }

  // ---- Baeume (3/4: Stamm unten sichtbar, Krone mit Licht links oben, Schlagschatten rechts unten) ----
  const baumCache = [];
  function baum(variante) {
    if (baumCache[variante]) return baumCache[variante];
    const v = variante % 6;
    const r = [26, 32, 22, 36, 28, 20][v];
    const sp = sprite(-r - 6, -r - 8, r + 22, r + 22, g => {
      const rnd = zufall(variante * 71 + 5);
      // Schlagschatten (zwei Stufen, kein Blur)
      g.fillStyle = 'rgba(30,58,10,0.20)'; g.beginPath(); g.ellipse(9, r * 0.62 + 4, r * 1.0, r * 0.55, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(30,58,10,0.16)'; g.beginPath(); g.ellipse(14, r * 0.72 + 6, r * 0.9, r * 0.45, 0, 0, 7); g.fill();
      // Stamm
      g.fillStyle = '#6B4524'; rr(g, -r * 0.13, r * 0.25, r * 0.26, r * 0.62, 2); g.fill();
      g.fillStyle = '#8A5B30'; g.fillRect(-r * 0.13, r * 0.25, r * 0.08, r * 0.62);
      if (v === 5) {
        // Nadelbaum: Kegel aus drei Stufen
        const stufe = (y, w, h, f) => { g.fillStyle = f; g.beginPath(); g.moveTo(0, y - h); g.lineTo(w, y); g.quadraticCurveTo(0, y + 5, -w, y); g.closePath(); g.fill(); };
        g.lineJoin = 'round';
        [[r * 0.6, r * 1.15, r * 1.1], [r * 0.05, r * 0.95, r * 1.0], [-r * 0.5, r * 0.7, r * 0.9]].forEach(s => {
          g.strokeStyle = '#1F4A14'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, s[0] - s[2]); g.lineTo(s[1], s[0]); g.quadraticCurveTo(0, s[0] + 5, -s[1], s[0]); g.closePath(); g.stroke();
          stufe(s[0], s[1], s[2], '#2F7A2A');
          g.fillStyle = 'rgba(140,210,90,0.45)'; g.beginPath(); g.moveTo(0, s[0] - s[2] + 2); g.lineTo(-s[1] * 0.7, s[0] - 1); g.lineTo(-s[1] * 0.15, s[0] - 2); g.closePath(); g.fill();
        });
        return;
      }
      const basis = [['#3E9A28', '#5DB82E', '#8BD346'], ['#358F2A', '#4FAE34', '#80CC4A'], ['#3F9630', '#5CB43A', '#90D452'], ['#2F8526', '#4AA232', '#7CC646'], ['#3E9A28', '#5DB82E', '#8BD346']][v];
      // Krone: Umriss (dunkel), Grundform, Lichtkugeln, Glanz
      const kugeln = [[0, 0, r]];
      for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, d = r * (0.35 + rnd() * 0.3); kugeln.push([Math.cos(a) * d, Math.sin(a) * d * 0.85, r * (0.42 + rnd() * 0.2)]); }
      g.fillStyle = '#1F4A14';
      kugeln.forEach(k => { g.beginPath(); g.arc(k[0], k[1], k[2] + 2.2, 0, 7); g.fill(); });
      g.fillStyle = basis[0];
      kugeln.forEach(k => { g.beginPath(); g.arc(k[0], k[1], k[2], 0, 7); g.fill(); });
      g.fillStyle = basis[1];
      kugeln.forEach(k => { g.beginPath(); g.arc(k[0] - k[2] * 0.18, k[1] - k[2] * 0.2, k[2] * 0.78, 0, 7); g.fill(); });
      g.fillStyle = basis[2];
      kugeln.forEach(k => { g.beginPath(); g.arc(k[0] - k[2] * 0.36, k[1] - k[2] * 0.4, k[2] * 0.36, 0, 7); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.5, r * 0.22, r * 0.12, -0.6, 0, 7); g.fill();
      if (v === 4) { // Apfelbaum
        for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, d = r * rnd() * 0.75; g.fillStyle = '#E8452C'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 2.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(Math.cos(a) * d - 1, Math.sin(a) * d - 1.2, 0.9, 0.9); }
      }
    }, 2);
    baumCache[variante] = sp;
    return sp;
  }
  // Busch (fuer Gestruepp auf Wiesen, Zaunraender)
  const buschCache = [];
  function busch(v) {
    if (buschCache[v]) return buschCache[v];
    const r = [9, 12, 7][v % 3];
    const sp = sprite(-r - 4, -r - 4, r + 10, r + 10, g => {
      const rnd = zufall(v * 37 + 11);
      g.fillStyle = 'rgba(30,58,10,0.22)'; g.beginPath(); g.ellipse(4, r * 0.5 + 2, r * 1.05, r * 0.55, 0, 0, 7); g.fill();
      const k = [[0, 0, r * 0.75], [-r * 0.45, r * 0.15, r * 0.55], [r * 0.45, r * 0.2, r * 0.55]];
      g.fillStyle = '#2A5E1C'; k.forEach(q => { g.beginPath(); g.arc(q[0], q[1], q[2] + 1.6, 0, 7); g.fill(); });
      g.fillStyle = '#4E9A30'; k.forEach(q => { g.beginPath(); g.arc(q[0], q[1], q[2], 0, 7); g.fill(); });
      g.fillStyle = '#7CC94A'; k.forEach(q => { g.beginPath(); g.arc(q[0] - q[2] * 0.3, q[1] - q[2] * 0.35, q[2] * 0.42, 0, 7); g.fill(); });
      if (v % 3 === 1) for (let i = 0; i < 4; i++) { g.fillStyle = ['#ffffff', '#ff9fc0'][i % 2]; g.beginPath(); g.arc((rnd() - 0.5) * r * 1.4, (rnd() - 0.5) * r, 1.4, 0, 7); g.fill(); }
    }, 2);
    buschCache[v] = sp;
    return sp;
  }

  // ---- Tiere: kleine Figuren in Seitenansicht (Blick nach rechts), 2 Lauf-Bilder. Anker = zwischen den Fuessen ----
  const tierCache = {};
  const tsp = (x0, y0, x1, y1, fn) => sprite(x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, fn);
  function tier(art, bild, variante) {
    const key = art + bild + '|' + (variante || 0);
    if (tierCache[key]) return tierCache[key];
    const b = bild ? 1 : 0;
    const bein = (g, x, y0, l, dick, farbe, phase) => { g.strokeStyle = farbe; g.lineWidth = dick; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + phase, y0 + l); g.stroke(); };
    let sp;
    if (art === 'huehner') {
      sp = tsp(-9, -14, 10, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(1, 1, 6, 1.6, 0, 0, 7); g.fill();
        bein(g, -1, -3, 3, 1, '#E89A1A', b ? 1 : -1); bein(g, 1.5, -3, 3, 1, '#E89A1A', b ? -1 : 1);
        g.fillStyle = '#F7F3EA'; g.beginPath(); g.moveTo(-7.5, -10); g.lineTo(-4, -6); g.lineTo(-6.5, -4.5); g.closePath(); g.fill(); // Schwanz
        g.beginPath(); g.ellipse(0, -6, 5.2, 3.8, 0, 0, 7); g.fill();
        g.fillStyle = '#E2DACB'; g.beginPath(); g.ellipse(-0.8, -5.4, 2.8, 1.8, 0.2, 0, 7); g.fill(); // Fluegel
        g.fillStyle = '#F7F3EA'; g.beginPath(); g.arc(4.2, -9.6, 2.6, 0, 7); g.fill(); // Kopf
        g.fillStyle = '#E0362B'; g.beginPath(); g.arc(3.6, -12.2, 1.2, 0, 7); g.arc(4.9, -12.4, 1.1, 0, 7); g.fill(); // Kamm
        g.beginPath(); g.ellipse(5.6, -7.6, 0.7, 1, 0, 0, 7); g.fill(); // Kehllappen
        g.fillStyle = '#F2A81A'; g.beginPath(); g.moveTo(6.4, -10.2); g.lineTo(8.6, -9.4); g.lineTo(6.4, -8.8); g.closePath(); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(4.9, -10.1, 0.55, 0, 7); g.fill();
      });
    } else if (art === 'enten') {
      sp = tsp(-10, -13, 11, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(0, 1, 7, 1.6, 0, 0, 7); g.fill();
        bein(g, -1, -2.5, 2.5, 1.1, '#F28C1A', b ? 1 : -1); bein(g, 2, -2.5, 2.5, 1.1, '#F28C1A', b ? -1 : 1);
        g.fillStyle = '#F6F1E4'; g.beginPath(); g.ellipse(-0.5, -5, 6.4, 3.4, -0.08, 0, 7); g.fill();
        g.beginPath(); g.moveTo(-7.5, -7.5); g.lineTo(-5, -4); g.lineTo(-7, -3.8); g.closePath(); g.fill();
        g.fillStyle = '#DCD3BE'; g.beginPath(); g.ellipse(-1.2, -4.6, 3.2, 1.7, 0, 0, 7); g.fill();
        g.fillStyle = '#F6F1E4'; g.beginPath(); g.ellipse(4.2, -7.5, 1.6, 2.6, 0.3, 0, 7); g.fill(); // Hals
        g.beginPath(); g.arc(5, -10, 2.4, 0, 7); g.fill();
        g.fillStyle = '#F2A81A'; g.beginPath(); g.ellipse(8, -9.6, 2.2, 0.9, 0.1, 0, 7); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(5.8, -10.6, 0.55, 0, 7); g.fill();
      });
    } else if (art === 'schafe') {
      sp = tsp(-14, -17, 15, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(0, 1, 10, 2, 0, 0, 7); g.fill();
        [-6, -3, 4, 7].forEach((x, i) => bein(g, x, -5, 5, 1.6, '#3A302C', (i % 2 ? 1 : -1) * (b ? 0.9 : -0.9)));
        g.fillStyle = '#F4EFE4';
        [[-6, -9, 4.4], [-1, -11, 4.6], [4, -10, 4.2], [-3, -7, 4.2], [3, -7, 4], [-8, -7, 3.2], [6.5, -7.5, 3]].forEach(k => { g.beginPath(); g.arc(k[0], k[1], k[2], 0, 7); g.fill(); });
        g.fillStyle = 'rgba(190,180,160,0.5)'; g.beginPath(); g.ellipse(0, -5.5, 7, 1.8, 0, 0, 7); g.fill();
        g.fillStyle = '#3A302C'; g.beginPath(); g.ellipse(9.5, -10.5, 3, 2.4, 0.35, 0, 7); g.fill(); // Kopf
        g.beginPath(); g.ellipse(7.8, -12.6, 1.6, 0.8, -0.6, 0, 7); g.fill(); // Ohr
        g.fillStyle = '#fff'; g.beginPath(); g.arc(10.2, -11.4, 0.6, 0, 7); g.fill();
      });
    } else if (art === 'ziegen') {
      sp = tsp(-14, -19, 15, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(0, 1, 9, 2, 0, 0, 7); g.fill();
        [-6, -3, 4, 7].forEach((x, i) => bein(g, x, -6, 6, 1.5, '#8C7A5E', (i % 2 ? 1 : -1) * (b ? 0.9 : -0.9)));
        g.fillStyle = '#EDE6D8'; g.beginPath(); g.ellipse(0, -8.5, 8.5, 4.2, 0, 0, 7); g.fill();
        g.fillStyle = '#C9B89A'; g.beginPath(); g.ellipse(-1.5, -7.2, 4.5, 2, 0, 0, 7); g.fill();
        g.fillStyle = '#EDE6D8'; g.beginPath(); g.moveTo(5, -11); g.lineTo(9, -15); g.lineTo(11.5, -13); g.lineTo(8, -8); g.closePath(); g.fill(); // Hals
        g.beginPath(); g.ellipse(10.5, -14, 3, 2.2, 0.4, 0, 7); g.fill();
        g.strokeStyle = '#6B5A44'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(9.5, -16); g.quadraticCurveTo(8.5, -19, 6.5, -18.5); g.stroke(); // Horn
        g.fillStyle = '#C9B89A'; g.beginPath(); g.moveTo(11.5, -12.5); g.lineTo(11, -10); g.lineTo(12.4, -12); g.closePath(); g.fill(); // Bart
        g.fillStyle = INK; g.beginPath(); g.arc(11, -14.6, 0.6, 0, 7); g.fill();
        g.strokeStyle = '#EDE6D8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-8, -10); g.lineTo(-10, -12); g.stroke(); // Schwaenzchen
      });
    } else if (art === 'alpakas') {
      const fell = ['#E9DCC6', '#A98562', '#6B4F3A', '#F4EFE4'][(variante || 0) % 4];
      sp = tsp(-12, -27, 13, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(0, 1, 8, 2, 0, 0, 7); g.fill();
        [-5, -2.5, 3, 5.5].forEach((x, i) => bein(g, x, -6, 6, 2, abdunkeln(fell, -0.25), (i % 2 ? 1 : -1) * (b ? 0.8 : -0.8)));
        g.fillStyle = fell;
        g.beginPath(); g.ellipse(0, -9, 7.5, 4.6, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(3.5, -11); g.lineTo(5, -21); g.lineTo(8.6, -21); g.lineTo(8, -10); g.closePath(); g.fill(); // Hals
        g.beginPath(); g.ellipse(7.6, -22.5, 3.4, 2.6, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(6.4, -25.6, 0.9, 1.8, -0.3, 0, 7); g.ellipse(8.4, -25.6, 0.9, 1.8, 0.3, 0, 7); g.fill(); // Ohren
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-2, -11, 4, 2, 0, 0, 7); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(8.7, -23, 0.6, 0, 7); g.fill();
        g.fillStyle = abdunkeln(fell, -0.35); g.beginPath(); g.arc(10.6, -22, 0.7, 0, 7); g.fill();
      });
    } else { // kuehe
      const braun = variante % 2 === 1;
      sp = tsp(-19, -22, 21, 3, g => {
        g.fillStyle = 'rgba(30,58,10,0.25)'; g.beginPath(); g.ellipse(0, 1, 14, 2.4, 0, 0, 7); g.fill();
        [-10, -6.5, 7, 10.5].forEach((x, i) => bein(g, x, -8, 8, 2.4, '#E9E4DA', (i % 2 ? 1 : -1) * (b ? 1 : -1)));
        [-10, -6.5, 7, 10.5].forEach((x, i) => { g.fillStyle = '#3A302C'; g.fillRect(x - 1.2 + (i % 2 ? 1 : -1) * (b ? 1 : -1), -1.4, 2.4, 1.6); });
        g.fillStyle = '#F7F5F0'; rr(g, -14, -17, 27, 11, 5); g.fill();
        g.fillStyle = braun ? '#7A4A2A' : '#2A2623';
        g.beginPath(); g.ellipse(-6, -13.5, 4.2, 3, 0.3, 0, 7); g.fill();
        g.beginPath(); g.ellipse(4, -11, 3.2, 2.6, -0.2, 0, 7); g.fill();
        g.beginPath(); g.ellipse(-11.5, -9.5, 2, 2.4, 0, 0, 7); g.fill();
        g.fillStyle = '#F2B4B0'; g.beginPath(); g.ellipse(4, -5.6, 2.6, 1.4, 0, 0, 7); g.fill(); // Euter
        g.strokeStyle = '#F7F5F0'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -15); g.quadraticCurveTo(-17, -11, -15.5, -7); g.stroke(); // Schwanz
        g.fillStyle = INK; g.beginPath(); g.arc(-15.4, -6.6, 1, 0, 7); g.fill();
        // Kopf
        g.fillStyle = '#F7F5F0'; g.beginPath(); g.ellipse(15.5, -15.5, 4, 4.4, 0.2, 0, 7); g.fill();
        g.fillStyle = '#F2B4B0'; g.beginPath(); g.ellipse(17.6, -12.4, 3, 2.2, 0.1, 0, 7); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(16.8, -16.4, 0.7, 0, 7); g.fill();
        g.fillStyle = braun ? '#7A4A2A' : '#2A2623'; g.beginPath(); g.ellipse(13, -18.6, 2, 1.1, -0.5, 0, 7); g.fill(); // Ohr
        g.fillStyle = '#EDE3C8'; g.beginPath(); g.moveTo(15, -19.4); g.lineTo(16.4, -21.6); g.lineTo(17, -19); g.closePath(); g.fill(); // Horn
      });
    }
    konturieren(sp, 0.75, 'rgba(10,13,38,0.85)');
    tierCache[key] = sp;
    return sp;
  }

  // ---- Partikel-Wolke (weiches Puff-Bild je Farbe, einmal gerastert) ----
  const puffCache = {};
  function puff(farbe) {
    if (puffCache[farbe]) return puffCache[farbe];
    const n = 32, c = leinwand(n, n), g = c.getContext('2d');
    const gr = g.createRadialGradient(n / 2 - 3, n / 2 - 3, 1, n / 2, n / 2, n / 2);
    gr.addColorStop(0, farbe); gr.addColorStop(0.55, farbe); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.globalAlpha = 1; g.beginPath(); g.arc(n / 2, n / 2, n / 2, 0, 7); g.fill();
    // weiche Ecke nach aussen (Farbe mit Alpha 0 am Rand)
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(n / 2, n / 2, n * 0.2, n / 2, n / 2, n / 2);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, n, n);
    puffCache[farbe] = c;
    return c;
  }

  return {
    SK, TS, INK, muster, fuerDef, zeichne, vorschau, grasMuster, asphaltMuster, betonMuster, brachMuster, kachel, baum, busch, rr, abdunkeln, rgba, zufall, sprite,
    textur, feldKachel, fruchtFarben, tier, puff, faecher, leinwand, konturieren, silhouette
  };
})();
