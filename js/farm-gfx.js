// Hof-Farm: Grafik. Alle Sprites werden einmal in Offscreen-Canvases gezeichnet (Draufsicht, Fahrtrichtung = +x)
// und danach nur noch gedreht aufs Spielfeld kopiert - schnell genug auch fuer das alte Tablet.
const FarmGfx = (function () {
  const D = FarmDaten;
  const SK = 2; // Sprite-Aufloesung (Pixel je Weltpixel)
  const cache = {};

  function leinwand(b, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(b); c.height = Math.ceil(h);
    return c;
  }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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
  // Spriteflaeche in Weltkoordinaten [x0..x1] x [y0..y1]; zeichnet fn(g) mit Weltkoordinaten
  function sprite(x0, y0, x1, y1, fn) {
    const c = leinwand((x1 - x0) * SK, (y1 - y0) * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.translate(-x0, -y0);
    fn(g);
    return { c, ox: -x0, oy: -y0, w: x1 - x0, h: y1 - y0 };
  }
  // Schatten: Silhouette schwarz einfaerben
  function schattenVon(sp) {
    const c = leinwand(sp.c.width, sp.c.height);
    const g = c.getContext('2d');
    g.drawImage(sp.c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgba(0,0,0,0.30)';
    g.fillRect(0, 0, c.width, c.height);
    return { c, ox: sp.ox, oy: sp.oy, w: sp.w, h: sp.h };
  }
  function zeichne(ctx, sp, x, y, winkel, mitSchatten) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(winkel);
    if (mitSchatten && sp.schatten) ctx.drawImage(sp.schatten.c, -sp.ox + 4, -sp.oy + 6, sp.w, sp.h);
    ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
    ctx.restore();
  }
  function mitSchatten(sp) { sp.schatten = schattenVon(sp); return sp; }

  // ---- Reifen ----
  function reifen(g, cx, cy, laenge, breite) {
    g.fillStyle = '#1c1c1e';
    rr(g, cx - laenge / 2, cy - breite / 2, laenge, breite, Math.min(laenge, breite) * 0.28); g.fill();
    g.strokeStyle = '#3a3a3e'; g.lineWidth = 1;
    const n = Math.max(4, Math.round(laenge / 4));
    for (let i = 0; i < n; i++) {
      const x = cx - laenge / 2 + (i + 0.5) * laenge / n;
      g.beginPath(); g.moveTo(x, cy - breite / 2 + 0.8); g.lineTo(x - laenge * 0.03, cy + breite / 2 - 0.8); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    rr(g, cx - laenge / 2 + 1, cy - breite / 2 + 1, laenge - 2, breite * 0.3, 2); g.fill();
  }

  // ---- Traktor ----
  function traktorKoerper(d) {
    const m = D.MARKEN[d.marke];
    const l = d.l, b = d.b, ax = d.achs;
    const rw = b * 0.34, rtw = b * 0.24;
    return sprite(-l * 0.5, -b * 0.62, l * 0.9, b * 0.62, g => {
      // Hinterreifen
      reifen(g, 0, -(b / 2 - rtw / 2), rw * 2, rtw);
      reifen(g, 0, (b / 2 - rtw / 2), rw * 2, rtw);
      // Vorderachse (Reifen werden dynamisch gezeichnet)
      g.fillStyle = '#2b2d30'; g.fillRect(ax - 2, -b * 0.3, 4, b * 0.6);
      // Rahmen / Motorhaube
      const hx0 = ax * 0.22, hx1 = ax + l * 0.18, hb = b * 0.5;
      const grad = g.createLinearGradient(0, -hb / 2, 0, hb / 2);
      grad.addColorStop(0, abdunkeln(m.c1, 0.28)); grad.addColorStop(0.5, m.c1); grad.addColorStop(1, abdunkeln(m.c1, -0.28));
      g.fillStyle = grad; rr(g, hx0, -hb / 2, hx1 - hx0, hb, hb * 0.28); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.stroke();
      // Zierstreifen
      g.fillStyle = m.c2; g.fillRect(hx0 + (hx1 - hx0) * 0.06, -hb * 0.1, (hx1 - hx0) * 0.86, hb * 0.2);
      // Kuehlergrill vorn
      g.fillStyle = '#16181a'; rr(g, hx1 - 5, -hb * 0.34, 4, hb * 0.68, 1.5); g.fill();
      g.strokeStyle = '#4a4d52'; g.lineWidth = 0.6;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx1 - 5, i * hb * 0.12); g.lineTo(hx1 - 1.5, i * hb * 0.12); g.stroke(); }
      // Scheinwerfer
      g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(hx1 - 1.5, -hb * 0.42, 2, 0, 7); g.arc(hx1 - 1.5, hb * 0.42, 2, 0, 7); g.fill();
      // Auspuff
      g.fillStyle = '#3d4044'; g.beginPath(); g.arc(hx0 + (hx1 - hx0) * 0.38, -hb * 0.3, 2.4, 0, 7); g.fill();
      g.fillStyle = '#6a6e73'; g.beginPath(); g.arc(hx0 + (hx1 - hx0) * 0.38, -hb * 0.3, 1.2, 0, 7); g.fill();
      // Kotfluegel ueber den Hinterreifen
      g.fillStyle = abdunkeln(m.c1, -0.12);
      rr(g, -rw * 0.95, -b / 2 - 0.5, rw * 1.9, rtw + 1.5, 3); g.fill();
      rr(g, -rw * 0.95, b / 2 - rtw - 1, rw * 1.9, rtw + 1.5, 3); g.fill();
      // Kabine
      const cx0 = -l * 0.2, cx1 = ax * 0.34 + 2, cb = b * 0.72;
      g.fillStyle = 'rgba(0,0,0,0.22)'; rr(g, cx0 + 1, -cb / 2 + 1.5, cx1 - cx0, cb, 4); g.fill();
      g.fillStyle = '#26323c'; rr(g, cx0, -cb / 2, cx1 - cx0, cb, 4); g.fill();
      const dg = g.createLinearGradient(0, -cb / 2, 0, cb / 2);
      dg.addColorStop(0, abdunkeln(m.dach, 0.1)); dg.addColorStop(1, abdunkeln(m.dach, -0.16));
      g.fillStyle = dg; rr(g, cx0 + 2, -cb / 2 + 2, cx1 - cx0 - 4.5, cb - 4, 3); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.7; g.stroke();
      // Lichtbalken / Arbeitsscheinwerfer
      g.fillStyle = '#ffd96b'; g.fillRect(cx1 - 3.5, -cb * 0.32, 1.6, cb * 0.64);
      // Heckanbau-Arme
      g.strokeStyle = '#2a2d31'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-l * 0.2, -b * 0.18); g.lineTo(-l * 0.38, -b * 0.1); g.moveTo(-l * 0.2, b * 0.18); g.lineTo(-l * 0.38, b * 0.1); g.stroke();
      g.fillStyle = '#c8cdd2'; g.beginPath(); g.arc(-l * 0.38, 0, 2.2, 0, 7); g.fill();
    });
  }
  function vorderrad(d) {
    const b = d.b;
    return sprite(-b * 0.25, -b * 0.2, b * 0.25, b * 0.2, g => { reifen(g, 0, 0, b * 0.4, b * 0.17); });
  }

  // ---- Erntemaschine ----
  function erntemaschine(d) {
    const m = D.MARKEN[d.marke];
    const l = d.l, b = d.b, ax = d.achs;
    const wurzel = d.typ === 'rodemaschine';
    const hw = d.w;
    const koerper = sprite(-l * 0.95, -Math.max(hw, b) * 0.62, l * 0.45 + 30, Math.max(hw, b) * 0.62, g => {
      // Hinterraeder (lenken) werden dynamisch gezeichnet - Treibachse bei x=0
      reifen(g, 0, -b * 0.46, b * 0.5, b * 0.16);
      reifen(g, 0, b * 0.46, b * 0.5, b * 0.16);
      g.fillStyle = '#2b2d30'; g.fillRect(-1.5, -b * 0.46, 3, b * 0.92);
      // Korpus
      const x0 = -l * 0.82, x1 = l * 0.2;
      const grad = g.createLinearGradient(0, -b * 0.4, 0, b * 0.4);
      grad.addColorStop(0, abdunkeln(m.c1, 0.25)); grad.addColorStop(0.5, m.c1); grad.addColorStop(1, abdunkeln(m.c1, -0.3));
      g.fillStyle = grad; rr(g, x0, -b * 0.38, x1 - x0, b * 0.76, 6); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.9; g.stroke();
      // Korntank / Dreschwerk (Deckel)
      g.fillStyle = abdunkeln(m.c1, 0.12); rr(g, x0 + 4, -b * 0.3, (x1 - x0) * 0.62, b * 0.6, 5); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.7; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      for (let i = 1; i < 5; i++) { const xx = x0 + 4 + (x1 - x0) * 0.62 * i / 5; g.beginPath(); g.moveTo(xx, -b * 0.28); g.lineTo(xx, b * 0.28); g.stroke(); }
      // Entladerohr (eingeklappt, seitlich)
      g.fillStyle = m.c2 === '#d4202a' ? '#8a1219' : abdunkeln(m.c1, -0.4);
      rr(g, x0 + 8, b * 0.3, (x1 - x0) * 0.55, 4, 2); g.fill();
      // Kabine vorn
      const cx0 = x1 - l * 0.34, cx1 = x1 + 6, cb = b * 0.56;
      g.fillStyle = '#26323c'; rr(g, cx0, -cb / 2, cx1 - cx0, cb, 4); g.fill();
      const dg = g.createLinearGradient(0, -cb / 2, 0, cb / 2);
      dg.addColorStop(0, abdunkeln(m.dach, 0.12)); dg.addColorStop(1, abdunkeln(m.dach, -0.18));
      g.fillStyle = dg; rr(g, cx0 + 2, -cb / 2 + 2, cx1 - cx0 - 5, cb - 4, 3); g.fill();
      g.fillStyle = '#ffd96b'; g.fillRect(cx1 - 3, -cb * 0.3, 1.6, cb * 0.6);
      // Einzugskanal
      g.fillStyle = '#3a3f44'; g.fillRect(x1 + 4, -Math.min(hw * 0.5, b * 0.34), 12, Math.min(hw, b * 0.68));
      // Schneidwerk / Roder
      const hx0 = x1 + 14, hl = wurzel ? 16 : 22;
      if (!wurzel) {
        g.fillStyle = '#2d3135'; g.fillRect(hx0 + hl - 2, -hw / 2, 3, hw);
        const hg = g.createLinearGradient(hx0, 0, hx0 + hl, 0);
        hg.addColorStop(0, abdunkeln(m.c1, -0.2)); hg.addColorStop(1, abdunkeln(m.c1, 0.1));
        g.fillStyle = hg; rr(g, hx0, -hw / 2, hl - 2, hw, 3); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.stroke();
        // Haspel (Streifen)
        g.fillStyle = 'rgba(255,255,255,0.22)';
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
    return koerper;
  }
  function lenkrad(d) {
    const b = d.b;
    return sprite(-b * 0.2, -b * 0.12, b * 0.2, b * 0.12, g => { reifen(g, 0, 0, b * 0.32, b * 0.12); });
  }

  // ---- Anbaugeraete (Ursprung = Kupplungspunkt, ragt nach -x) ----
  function geraet(d) {
    const m = D.MARKEN[d.marke];
    const w = d.w, len = d.len;
    return sprite(-len - 8, -w / 2 - 8, 10, w / 2 + 8, g => {
      // Zugdreieck
      g.strokeStyle = '#2a2d31'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -Math.min(14, w * 0.18)); g.moveTo(0, 0); g.lineTo(-12, Math.min(14, w * 0.18)); g.stroke();
      const bal = (x, dicke, farbe) => { g.fillStyle = farbe; rr(g, x - dicke, -w / 2, dicke, w, 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.7; g.stroke(); };
      if (d.typ === 'grubber') {
        bal(-13, 7, m.c1);
        g.strokeStyle = '#33373b'; g.lineWidth = 1.2;
        for (let r = 0; r < 2; r++) for (let y = -w / 2 + 4 + r * 4; y < w / 2 - 2; y += 8) { g.beginPath(); g.moveTo(-14 - r * 8, y); g.lineTo(-22 - r * 8, y); g.stroke(); }
        bal(-30, 5, abdunkeln(m.c1, -0.15));
        // Packerwalze
        const seg = Math.max(8, Math.round(w / 9));
        for (let i = 0; i < seg; i++) {
          g.fillStyle = i % 2 ? '#8a9096' : '#a4abb1';
          g.fillRect(-len + 0, -w / 2 + i * w / seg, 12, w / seg + 0.4);
        }
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.strokeRect(-len, -w / 2, 12, w);
      } else if (d.typ === 'pflug') {
        bal(-12, 6, m.c1);
        const n = Math.max(3, Math.round(w / 24));
        for (let i = 0; i < n; i++) {
          const y = -w / 2 + (i + 0.5) * w / n;
          g.fillStyle = '#3a3e43'; g.beginPath(); g.moveTo(-16, y - 8); g.lineTo(-len, y + 4); g.lineTo(-len + 6, y + 10); g.lineTo(-16, y + 3); g.closePath(); g.fill();
          g.fillStyle = '#b9bec3'; g.beginPath(); g.moveTo(-24, y - 4); g.lineTo(-len + 2, y + 6); g.lineTo(-len + 7, y + 10); g.lineTo(-28, y + 2); g.closePath(); g.fill();
        }
      } else if (d.typ === 'saeen') {
        bal(-12, 6, '#3b3f44');
        // Saatkasten
        const teile = Math.max(2, Math.round(w / 60));
        for (let i = 0; i < teile; i++) {
          const y0 = -w / 2 + 2 + i * (w - 4) / teile;
          g.fillStyle = m.c1; rr(g, -42, y0 + 1, 26, (w - 4) / teile - 3, 4); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-38, y0 + 4, 18, 2.4);
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
            g.fillStyle = (i + r) % 2 ? '#7f868c' : '#a3abb1';
            g.fillRect(x0 - 12, -w / 2 + i * w / seg, 12, w / seg + 0.4);
          }
          g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.strokeRect(x0 - 12, -w / 2, 12, w);
        }
        g.fillStyle = m.c1; rr(g, -16, -w / 2 - 2, 4, w + 4, 2); g.fill();
      } else if (d.typ === 'kalk') {
        bal(-10, 5, '#3b3f44');
        const hw = Math.min(w * 0.42, 70);
        g.fillStyle = m.c1; rr(g, -34, -hw / 2, 26, hw, 4); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.9; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)'; rr(g, -31, -hw / 2 + 4, 20, hw - 8, 3); g.fill();
        g.fillStyle = '#cfd3d6';
        g.beginPath(); g.arc(-40, -w * 0.28, 5, 0, 7); g.arc(-40, w * 0.28, 5, 0, 7); g.fill();
        g.fillStyle = 'rgba(245,245,240,0.3)';
        g.beginPath(); g.moveTo(-40, -w * 0.28); g.lineTo(-len - 14, -w / 2); g.lineTo(-len - 14, w / 2); g.lineTo(-40, w * 0.28); g.closePath(); g.fill();
      } else if (d.typ === 'spritze') {
        bal(-10, 4, '#3b3f44');
        g.fillStyle = m.c1; g.beginPath(); g.ellipse(-22, 0, 14, 20, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.9; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-25, -5, 7, 9, 0, 0, 7); g.fill();
        g.fillStyle = '#4a4f55'; g.fillRect(-len + 2, -w / 2, 3, w);
        g.strokeStyle = '#4a4f55'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-len + 3, 0); g.stroke();
        g.fillStyle = 'rgba(150,210,255,0.8)';
        for (let y = -w / 2 + 6; y < w / 2 - 3; y += 14) { g.beginPath(); g.arc(-len - 1, y, 1.6, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(160,215,255,0.22)'; g.fillRect(-len - 12, -w / 2, 12, w);
      } else { // duenger
        bal(-10, 5, '#3b3f44');
        g.fillStyle = m.c1; g.beginPath(); g.ellipse(-24, 0, 16, Math.min(24, w * 0.15), 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.9; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-27, -4, 8, 6, 0, 0, 7); g.fill();
        g.fillStyle = '#cfd3d6';
        g.beginPath(); g.arc(-40, -Math.min(30, w * 0.2), 5, 0, 7); g.arc(-40, Math.min(30, w * 0.2), 5, 0, 7); g.fill();
        g.fillStyle = 'rgba(214,226,232,0.28)';
        g.beginPath(); g.moveTo(-40, -Math.min(30, w * 0.2)); g.lineTo(-len - 18, -w / 2); g.lineTo(-len - 18, 0); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-40, Math.min(30, w * 0.2)); g.lineTo(-len - 18, w / 2); g.lineTo(-len - 18, 0); g.closePath(); g.fill();
      }
    });
  }

  // ---- Zugriff mit Cache ----
  function fuerDef(d) {
    if (cache[d.id]) return cache[d.id];
    let r;
    if (d.art === 'traktor') {
      r = { koerper: mitSchatten(traktorKoerper(d)), rad: vorderrad(d) };
    } else if (d.art === 'ernter') {
      r = { koerper: mitSchatten(erntemaschine(d)), rad: lenkrad(d) };
    } else {
      r = { koerper: mitSchatten(geraet(d)) };
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
    let sk = Math.min(breite * 2 / bw, hoehe * 2 / bh) * 0.95;
    sk = Math.min(sk, 3.4);
    g.translate(c.width / 2, c.height / 2);
    if (dreh) g.rotate(-Math.PI / 2);
    g.scale(sk, sk);
    g.translate(-(k.w / 2 - k.ox), -(k.h / 2 - k.oy));
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

  // ---- Gelaende-Texturen ----
  function zufall(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function grasMuster(ctx) {
    const c = leinwand(256, 256), g = c.getContext('2d'), rnd = zufall(7);
    g.fillStyle = '#5f9e3f'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) {
      const x = rnd() * 256, y = rnd() * 256, h = 3 + rnd() * 5;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(130,190,80,0.35)' : 'rgba(40,90,30,0.28)';
      g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - h); g.stroke();
      // Randwiederholung (nahtlos)
      if (x < 6) { g.beginPath(); g.moveTo(x + 256, y); g.lineTo(x + 256, y - h); g.stroke(); }
      if (y < 8) { g.beginPath(); g.moveTo(x, y + 256); g.lineTo(x, y + 256 - h); g.stroke(); }
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '58,120,40' : '110,170,70') + ',0.18)';
      g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 6 + rnd() * 16, 0, 7); g.fill();
    }
    return ctx.createPattern(c, 'repeat');
  }
  function asphaltMuster(ctx) {
    const c = leinwand(128, 128), g = c.getContext('2d'), rnd = zufall(21);
    g.fillStyle = '#4d5156'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.03 + rnd() * 0.05) + ')'; g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); }
    return ctx.createPattern(c, 'repeat');
  }
  function betonMuster(ctx) {
    const c = leinwand(160, 160), g = c.getContext('2d'), rnd = zufall(33);
    g.fillStyle = '#a7a39a'; g.fillRect(0, 0, 160, 160);
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '60,50,40') + ',' + (0.03 + rnd() * 0.05) + ')'; g.fillRect(rnd() * 160, rnd() * 160, 1 + rnd() * 3, 1 + rnd() * 3); }
    g.strokeStyle = 'rgba(70,64,56,0.45)'; g.lineWidth = 1.2;
    g.strokeRect(0.5, 0.5, 159, 159); g.beginPath(); g.moveTo(80, 0); g.lineTo(80, 160); g.moveTo(0, 80); g.lineTo(160, 80); g.stroke();
    return ctx.createPattern(c, 'repeat');
  }
  function brachMuster(ctx) {
    const c = leinwand(128, 128), g = c.getContext('2d'), rnd = zufall(55);
    g.fillStyle = '#8a8f4a'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) { g.strokeStyle = 'rgba(' + (rnd() < 0.5 ? '170,160,80' : '90,100,45') + ',0.35)'; g.beginPath(); const x = rnd() * 128, y = rnd() * 128; g.moveTo(x, y); g.lineTo(x + 2, y - 5); g.stroke(); }
    return ctx.createPattern(c, 'repeat');
  }

  // ---- Feldzellen-Kacheln (20x20) ----
  const KACHEL = D.ZELLE;
  const kacheln = {};
  function kachel(art, frucht, stufe, variante) {
    const key = art + '|' + (frucht || '') + '|' + stufe + '|' + variante;
    if (kacheln[key]) return kacheln[key];
    const c = leinwand(KACHEL, KACHEL), g = c.getContext('2d'), rnd = zufall(variante * 977 + stufe * 31 + (frucht ? frucht.charCodeAt(0) : 3));
    const fz = frucht ? D.frucht(frucht) : null;
    if (art === 'stoppel') {
      g.fillStyle = variante ? '#c9b46a' : '#c4ae62'; g.fillRect(0, 0, KACHEL, KACHEL);
      g.strokeStyle = 'rgba(150,125,55,0.55)'; g.lineWidth = 1;
      for (let x = 2; x < KACHEL; x += 4) { g.beginPath(); g.moveTo(x + rnd(), 0); g.lineTo(x + rnd(), KACHEL); g.stroke(); }
      for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '230,210,140' : '120,95,40') + ',0.45)'; g.fillRect(rnd() * KACHEL, rnd() * KACHEL, 1.5, 1.5); }
    } else if (art === 'bearbeitet') {
      g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, KACHEL, KACHEL);
      for (let x = 0; x < KACHEL; x += 4) {
        g.fillStyle = 'rgba(40,24,12,0.55)'; g.fillRect(x + 2, 0, 1.6, KACHEL);
        g.fillStyle = 'rgba(150,108,70,0.42)'; g.fillRect(x, 0, 1.4, KACHEL);
      }
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '25,14,6' : '170,125,82') + ',0.5)'; g.beginPath(); g.arc(rnd() * KACHEL, rnd() * KACHEL, 0.9 + rnd(), 0, 7); g.fill(); }
    } else if (art === 'gepfluegt') {
      g.fillStyle = '#5a3c24'; g.fillRect(0, 0, KACHEL, KACHEL);
      for (let x = 0; x < KACHEL; x += 6) {
        g.fillStyle = 'rgba(30,16,8,0.6)'; g.fillRect(x + 4, 0, 2, KACHEL);
        g.fillStyle = 'rgba(138,98,62,0.6)'; g.fillRect(x, 0, 3.4, KACHEL);
        g.fillStyle = 'rgba(180,138,95,0.3)'; g.fillRect(x + 0.6, 0, 1, KACHEL);
      }
    } else { // pflanze: stufe 0=Saat .. 4=reif
      const unter = { bearb: '#6b4a2e' };
      g.fillStyle = unter.bearb; g.fillRect(0, 0, KACHEL, KACHEL);
      for (let x = 0; x < KACHEL; x += 4) { g.fillStyle = 'rgba(40,24,12,0.5)'; g.fillRect(x + 2, 0, 1.4, KACHEL); }
      const f = fz.farben;
      const reihenX = [1.5, 5.5, 9.5, 13.5, 17.5];
      if (stufe === 0) {
        reihenX.forEach(x => { for (let y = 1; y < KACHEL; y += 3.4) { g.fillStyle = 'rgba(190,230,120,0.7)'; g.fillRect(x + rnd() * 0.8, y, 1, 1); } });
      } else {
        const breite = [0, 1.8, 2.6, 3.2, 3.6][stufe];
        const farbe = stufe === 1 ? f.jung : stufe === 2 ? f.jung : stufe === 3 ? f.hoch : f.reif;
        reihenX.forEach((x, i) => {
          g.fillStyle = farbe; g.fillRect(x - breite / 2 + 1.5, 0, breite, KACHEL);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - breite / 2 + 1.5 + breite - 0.8, 0, 0.8, KACHEL);
          g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x - breite / 2 + 1.5, 0, 0.8, KACHEL);
          if (stufe === 4) {
            g.fillStyle = f.reihe;
            for (let y = (i % 2) * 2; y < KACHEL; y += 4) g.fillRect(x - breite / 2 + 1.5, y, breite, 1.3);
          }
        });
        if (stufe >= 3) {
          for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(' + (stufe === 4 ? '255,245,200' : '170,230,120') + ',0.18)'; g.fillRect(rnd() * KACHEL, rnd() * KACHEL, 1.4, 1.4); }
        }
        if (fz.id === 'sonnenblume' && stufe === 4) {
          reihenX.forEach(x => { for (let y = 2; y < KACHEL; y += 5) { g.fillStyle = '#f7c21a'; g.beginPath(); g.arc(x + 1.5, y, 1.7, 0, 7); g.fill(); g.fillStyle = '#6a4515'; g.beginPath(); g.arc(x + 1.5, y, 0.8, 0, 7); g.fill(); } });
        }
        if (fz.id === 'raps' && stufe === 4) {
          for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,236,60,0.75)'; g.fillRect(rnd() * KACHEL, rnd() * KACHEL, 1.4, 1.4); }
        }
      }
    }
    kacheln[key] = c;
    return c;
  }

  // ---- Baeume ----
  const baumCache = [];
  function baum(variante) {
    if (baumCache[variante]) return baumCache[variante];
    const r = [26, 32, 22, 38][variante % 4];
    const sp = sprite(-r - 8, -r - 8, r + 14, r + 14, g => {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(6, 8, r * 0.95, r * 0.85, 0, 0, 7); g.fill();
      const rnd = zufall(variante * 71 + 5);
      const basis = [['#2f6b2a', '#3f8a35'], ['#356f2c', '#4a9a3c'], ['#2a5e2c', '#3a8240'], ['#3b7a2e', '#58a847']][variante % 4];
      g.fillStyle = basis[0]; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      for (let i = 0; i < 9; i++) {
        const a = rnd() * 6.28, d = r * (0.2 + rnd() * 0.55);
        g.fillStyle = i % 3 ? basis[1] : 'rgba(255,255,255,0.08)';
        g.beginPath(); g.arc(Math.cos(a) * d - 2, Math.sin(a) * d - 2, r * (0.3 + rnd() * 0.25), 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(r * 0.25, r * 0.3, r * 0.55, 0, 7); g.fill();
    });
    baumCache[variante] = sp;
    return sp;
  }

  return {
    SK, fuerDef, zeichne, vorschau, grasMuster, asphaltMuster, betonMuster, brachMuster, kachel, baum, rr, abdunkeln, zufall, sprite
  };
})();
