// Hof-Farm: Darstellung der Spielwelt (Draufsicht). Maschinen fahren selbststaendig; hier wird nur aus dem Spielstand
// (FarmModell) und der Uhrzeit berechnet, wo was steht und wie die Felder aussehen.
const FarmAnsicht = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, Z = D.ZELLE, K = D.MASCHINEN_SKALA;
  let muster = null;
  const musterCache = {};
  let baeume = [];
  let parkCache = { schluessel: '', pos: {} };
  const partikel = [];
  let letztePartikelZeit = 0;

  // ----------------------------------------------------------------------------------------------
  // Hilfen
  // ----------------------------------------------------------------------------------------------
  function inRect(px, py, r, rand) { rand = rand || 0; return px >= r.x - rand && px <= r.x + r.w + rand && py >= r.y - rand && py <= r.y + r.h + rand; }
  function musterHolen(ctx) {
    if (!muster) muster = { gras: G.grasMuster(ctx), asphalt: G.asphaltMuster(ctx), beton: G.betonMuster(ctx), brach: G.brachMuster(ctx) };
    return muster;
  }
  function kachelMuster(ctx, art, frucht, stufe) {
    const key = art + '|' + frucht + '|' + stufe;
    if (!musterCache[key]) musterCache[key] = G.muster(ctx, G.kachel(art, frucht, stufe, 0));
    return musterCache[key];
  }
  function stufeVon(w) { return w < 0.1 ? 0 : w < 0.35 ? 1 : w < 0.65 ? 2 : 3; }
  // Muster fuer eine Feldphase
  function phaseMuster(ctx, phase, frucht, wachstum) {
    if (phase === 'stoppel') return kachelMuster(ctx, 'stoppel', '', 0);
    if (phase === 'bearbeitet') return kachelMuster(ctx, 'bearbeitet', '', 0);
    if (phase === 'gepfluegt') return kachelMuster(ctx, 'gepfluegt', '', 0);
    if (phase === 'waechst') return kachelMuster(ctx, 'pflanze', frucht, stufeVon(wachstum));
    return kachelMuster(ctx, 'pflanze', frucht, 4);
  }
  function nachMuster(ctx, job, f) {
    const s = job.schritt;
    if (s === 'grubbern') return kachelMuster(ctx, 'bearbeitet', '', 0);
    if (s === 'pfluegen') return kachelMuster(ctx, 'gepfluegt', '', 0);
    if (s === 'saeen') return kachelMuster(ctx, 'pflanze', job.frucht, 0);
    if (s === 'ernten') return kachelMuster(ctx, 'stoppel', '', 0);
    return null;
  }
  const TINT = { duengen: 'rgba(255,255,255,0.20)', spritzen: 'rgba(120,200,255,0.20)', walzen: 'rgba(0,0,0,0.16)', kalken: 'rgba(255,255,255,0.34)' };

  // Text samt Umrandung (Emoji-Text ist auf aelteren Tablets teuer): einmal in ein Bild rendern, danach nur noch drawImage
  const textCache = {}; let textCacheN = 0;
  const TXT_S = 2;
  function schildText(ctx, text, x, y, groesse, farbe) {
    const key = text + '|' + groesse + '|' + (farbe || '#fff');
    let c = textCache[key];
    if (!c) {
      if (textCacheN > 300) { Object.keys(textCache).forEach(k => delete textCache[k]); textCacheN = 0; }
      const font = 'bold ' + groesse * TXT_S + 'px system-ui, sans-serif';
      const mc = document.createElement('canvas').getContext('2d');
      mc.font = font;
      const w = Math.ceil(mc.measureText(text).width + groesse * TXT_S * 0.6), h = Math.ceil(groesse * TXT_S * 1.6);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(1, groesse * 0.14) * TXT_S; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(text, w / 2, h / 2);
      g.fillStyle = farbe || '#fff'; g.fillText(text, w / 2, h / 2);
      c = textCache[key] = cv; textCacheN++;
    }
    ctx.drawImage(c, x - c.width / TXT_S / 2, y - c.height / TXT_S / 2, c.width / TXT_S, c.height / TXT_S);
  }

  // ----------------------------------------------------------------------------------------------
  // Baeume (reine Dekoration)
  // ----------------------------------------------------------------------------------------------
  function baumeErzeugen() {
    baeume = [];
    const rnd = G.zufall(4711);
    const sperr = [];
    D.FELDER.forEach(f => sperr.push({ x: f.x - 56, y: f.y - 56, w: f.c * Z + 112, h: f.r * Z + 112 }));
    D.STRASSEN.forEach(s => sperr.push({ x: s.x - 50, y: s.y - 50, w: s.w + 100, h: s.h + 100 }));
    sperr.push({ x: D.HOF.x - 50, y: D.HOF.y - 50, w: D.HOF.w + 100, h: D.HOF.h + 100 });
    sperr.push({ x: D.PLATZ_LANDHANDEL.x - 50, y: D.PLATZ_LANDHANDEL.y - 50, w: D.PLATZ_LANDHANDEL.w + 100, h: D.PLATZ_LANDHANDEL.h + 450 });
    D.GEBAEUDE.forEach(g => sperr.push({ x: g.x - 70, y: g.y - 70, w: g.w + 140, h: g.h + 140 }));
    D.DEKO.forEach(g => { const w = g.w || g.r * 2, h = g.h || g.r * 2; sperr.push({ x: (g.art === 'windrad' ? g.x - g.r : g.x) - 40, y: (g.art === 'windrad' ? g.y - g.r : g.y) - 40, w: w + 80, h: h + 80 }); });
    D.PRODUKTION.forEach(g => sperr.push({ x: g.x - 50, y: g.y - 50, w: g.w + 100, h: g.h + 100 }));
    sperr.push({ x: D.TIERHOF.x - 60, y: D.TIERHOF.y - 60, w: D.TIERHOF.w + 120, h: D.TIERHOF.h + 120 });
    for (let n = 0; n < 2600 && baeume.length < 520; n++) {
      const x = 30 + rnd() * (D.WELT.b - 60), y = 30 + rnd() * (D.WELT.h - 60);
      const rand = Math.min(x, y, D.WELT.b - x, D.WELT.h - y);
      if (rand > 170 && rnd() < 0.78) continue;
      if (sperr.some(r => inRect(x, y, r))) continue;
      baeume.push({ x, y, v: (rnd() * 4) | 0 });
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Felder: Bahnen und Fahrwege
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
  // Weltposition aus Bahn-Koordinaten (A laengs der Bahn, Q quer dazu)
  function weltPos(b, A, Q) { return b.horizontal ? { x: b.f.x + A, y: b.f.y + Q } : { x: b.f.x + Q, y: b.f.y + A }; }
  function weltWinkel(b, dA, dQ) { return b.horizontal ? Math.atan2(dQ, dA) : Math.atan2(dA, dQ); }
  // Lage des Bezugspunkts der Maschine bei Fortschritt p (0..1): gerade Bahn, am Ende ein weicher Halbkreis-Wendebogen.
  // work = Lage der Arbeitslinie (Geraet bzw. Schneidwerk), nur auf der Geraden gleich der Bahn.
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

  // ---- Fahrwege: Eckpunkte -> abgerundete, dicht abgetastete Linie ----
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
    // gleichmaessig dicht machen (alle ~5 px)
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
  // Rechtsverkehr: seitlich versetzen, an den Enden einblenden (jede Maschine bekommt eine eigene Spur)
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
    // Hinweg
    const p0 = refPose(b, 0), d0 = dir(p0.a);
    const aus = { x: p0.x - d0.x * rand, y: p0.y - d0.y * rand };
    const hin = [{ x: gate.x, y: gate.y }, { x: gate.x, y: sy }, { x: ex, y: sy }, { x: ex, y: aus.y }];
    if (!b.horizontal) hin.push({ x: aus.x, y: aus.y });
    hin.push({ x: aus.x, y: aus.y }); hin.push({ x: p0.x, y: p0.y });
    // Rueckweg
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

  // Berechnet Lage von Zugmaschine/Erntemaschine und Geraet fuer einen Job
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
      [-1, 1].forEach(sd => {
        const lx = ax, ly = sd * hr;
        G.zeichne(ctx, s.rad, x + Math.cos(a) * lx - Math.sin(a) * ly, y + Math.sin(a) * lx + Math.cos(a) * ly, a, false, K);
      });
    }
  }
  function zeichneGeraetAm(ctx, g, tm, x, y, a) {
    const d = D.def(tm.id);
    const hx = x - Math.cos(a) * d.l * 0.38 * K, hy = y - Math.sin(a) * d.l * 0.38 * K;
    G.zeichne(ctx, G.fuerDef(D.def(g.id)).koerper, hx, hy, a, true, K);
  }

  function staub(x, y, farbe, jetzt, dt) {
    if (partikel.length > 150) return;
    if (Math.random() > dt * 14) return;
    const w = Math.random() * 6.283;
    partikel.push({ x, y, vx: Math.cos(w) * 14, vy: Math.sin(w) * 14, t: 0, max: 0.6 + Math.random() * 0.7, farbe, r: 2 + Math.random() * 3 });
  }
  // Rauch/Dampf: steigt langsam auf, wird groesser und blasser (Auspuff, Schornstein)
  function rauch(x, y, jetzt, dt, rate, hell) {
    if (partikel.length > 170 || Math.random() > dt * rate) return;
    partikel.push({ x: x + (Math.random() - 0.5) * 3, y, vx: 5 + Math.random() * 5, vy: -(9 + Math.random() * 6), t: 0, max: 1.1 + Math.random() * 0.9, farbe: hell ? 'rgb(236,236,232)' : 'rgb(120,120,118)', r: 2 + Math.random() * 1.5, rauch: true });
  }
  function partikelStep(dt) {
    for (let i = partikel.length - 1; i >= 0; i--) {
      const p = partikel[i];
      p.t += dt;
      if (p.t >= p.max) { partikel.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; if (!p.rauch) { p.vx *= 0.97; p.vy *= 0.97; }
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Gebaeude
  // ----------------------------------------------------------------------------------------------
  // Satteldach in der Draufsicht: zwei Dachflaechen (hell/dunkel), Firstlinie, Ziegelreihen, Dachfenster, Dachrand und Schatten.
  // Einmal in ein Bild gezeichnet (gecacht), danach nur noch drawImage.
  const dachCache = {};
  function dach(ctx, x, y, w, h, farbe, stil) {
    const key = [w, h, farbe, stil || ''].join('|');
    let sp = dachCache[key];
    if (!sp) {
      sp = dachCache[key] = G.sprite(-14, -14, w + 24, h + 26, g => {
        g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(9, 12, w, h);
        const quer = w >= h, firstL = quer ? h / 2 : w / 2;
        const hell = G.abdunkeln(farbe, 0.16), dunkel = G.abdunkeln(farbe, -0.28);
        // Dachflaechen
        const a = quer ? [0, 0, w, firstL] : [0, 0, firstL, h], b = quer ? [0, firstL, w, h - firstL] : [firstL, 0, w - firstL, h];
        const ga = quer ? g.createLinearGradient(0, 0, 0, firstL) : g.createLinearGradient(0, 0, firstL, 0);
        ga.addColorStop(0, G.abdunkeln(farbe, 0.08)); ga.addColorStop(1, hell);
        g.fillStyle = ga; g.fillRect(a[0], a[1], a[2], a[3]);
        const gb = quer ? g.createLinearGradient(0, firstL, 0, h) : g.createLinearGradient(firstL, 0, w, 0);
        gb.addColorStop(0, G.abdunkeln(farbe, -0.12)); gb.addColorStop(1, dunkel);
        g.fillStyle = gb; g.fillRect(b[0], b[1], b[2], b[3]);
        // Dachbelag
        g.lineWidth = 1;
        if (stil === 'blech') {
          g.strokeStyle = 'rgba(255,255,255,0.20)'; g.beginPath();
          if (quer) for (let xx = 6; xx < w; xx += 7) { g.moveTo(xx, 0); g.lineTo(xx, h); } else for (let yy = 6; yy < h; yy += 7) { g.moveTo(0, yy); g.lineTo(w, yy); }
          g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.16)'; g.beginPath();
          if (quer) for (let xx = 9.5; xx < w; xx += 7) { g.moveTo(xx, 0); g.lineTo(xx, h); } else for (let yy = 9.5; yy < h; yy += 7) { g.moveTo(0, yy); g.lineTo(w, yy); }
          g.stroke();
        } else {
          g.strokeStyle = 'rgba(0,0,0,0.20)'; g.beginPath();
          const reihen = quer ? h : w;
          for (let r = 7; r < reihen; r += 7) { if (Math.abs(r - firstL) < 3) continue; if (quer) { g.moveTo(0, r); g.lineTo(w, r); } else { g.moveTo(r, 0); g.lineTo(r, h); } }
          g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.10)'; g.beginPath();
          for (let r = 7, k = 0; r < reihen; r += 7, k++) {
            if (Math.abs(r - firstL) < 3) continue;
            const lang = quer ? w : h;
            for (let q = (k % 2) * 6; q < lang; q += 12) { if (quer) { g.moveTo(q, r); g.lineTo(q, r - 7); } else { g.moveTo(r, q); g.lineTo(r - 7, q); } }
          }
          g.stroke();
        }
        // First
        g.fillStyle = G.abdunkeln(farbe, 0.3);
        if (quer) g.fillRect(0, firstL - 2, w, 4); else g.fillRect(firstL - 2, 0, 4, h);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        if (quer) g.fillRect(0, firstL + 2, w, 1.5); else g.fillRect(firstL + 2, 0, 1.5, h);
        // Dachfenster auf der hellen Seite
        if ((quer ? w : h) > 130) {
          const n = Math.floor((quer ? w : h) / 90);
          for (let k = 0; k < n; k++) {
            const t = ((k + 0.5) / n) * (quer ? w : h);
            const fx = quer ? t - 11 : firstL * 0.35, fy = quer ? firstL * 0.28 : t - 11, fw = quer ? 22 : 16, fh = quer ? 16 : 22;
            g.fillStyle = 'rgba(30,40,50,0.55)'; g.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
            const gl = g.createLinearGradient(fx, fy, fx + fw, fy + fh); gl.addColorStop(0, '#bfe3f7'); gl.addColorStop(1, '#6fa6c8');
            g.fillStyle = gl; g.fillRect(fx, fy, fw, fh);
            g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(fx + 1, fy + 1, fw * 0.4, fh * 0.35);
          }
        }
        // Rand / Traufe
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1; g.strokeRect(2, 2, w - 4, h - 4);
      });
    }
    ctx.drawImage(sp.c, x - sp.ox, y - sp.oy, sp.w, sp.h);
  }

  // Kleine Bauteile, gecacht
  const teilCache = {};
  function teil(key, w, h, fn) {
    if (!teilCache[key]) teilCache[key] = G.sprite(0, 0, w, h, fn);
    return teilCache[key];
  }
  function zeichneTeil(ctx, sp, x, y) { ctx.drawImage(sp.c, x, y, sp.w, sp.h); }

  function zeichneKamin(ctx, x, y) {
    const sp = teil('kamin', 20, 22, g => {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(3, 4, 14, 16);
      g.fillStyle = '#8a7060'; g.fillRect(2, 2, 14, 16);
      g.fillStyle = '#a88a76'; g.fillRect(2, 2, 14, 4);
      g.fillStyle = '#2a1e18'; g.fillRect(5, 6, 8, 8);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(2, 2, 14, 16);
    });
    zeichneTeil(ctx, sp, x, y);
  }
  function zeichneLuefter(ctx, x, y, t) {
    const sp = teil('luefterfuss', 26, 26, g => {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(14, 15, 11, 0, 7); g.fill();
      g.fillStyle = '#9aa3aa'; g.beginPath(); g.arc(13, 13, 11, 0, 7); g.fill();
      g.strokeStyle = '#5c666d'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#3a4248'; g.beginPath(); g.arc(13, 13, 8, 0, 7); g.fill();
    });
    zeichneTeil(ctx, sp, x - 13, y - 13);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 5); ctx.fillStyle = '#c9d0d5';
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.ellipse(4.5, 0, 4.5, 1.8, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function zeichneDeko(ctx, sicht, jetzt) {
    const t = jetzt / 1000;
    D.DEKO.forEach(d => {
      const w = d.w || d.r * 2, h = d.h || d.r * 2, x0 = d.art === 'windrad' ? d.x - d.r : d.x, y0 = d.art === 'windrad' ? d.y - d.r : d.y;
      if (x0 > sicht.x1 || x0 + w < sicht.x0 || y0 > sicht.y1 || y0 + h < sicht.y0) return;
      if (d.art === 'scheune') {
        dach(ctx, d.x, d.y, d.w, d.h, d.dach);
        ctx.fillStyle = '#4a2c1c'; ctx.fillRect(d.x + d.w / 2 - 28, d.y + d.h - 4, 56, 9);
        ctx.strokeStyle = '#e8d2a6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x + d.w / 2 - 28, d.y + d.h - 4); ctx.lineTo(d.x + d.w / 2, d.y + d.h + 5); ctx.lineTo(d.x + d.w / 2 + 28, d.y + d.h - 4); ctx.moveTo(d.x + d.w / 2, d.y + d.h - 4); ctx.lineTo(d.x + d.w / 2, d.y + d.h + 5); ctx.stroke();
        schildText(ctx, 'SCHEUNE', d.x + d.w / 2, d.y + d.h / 2 - 4, 14, '#fff3e0');
      } else if (d.art === 'heu') {
        [[22, 24], [58, 24], [94, 24], [40, 50], [76, 50], [58, 14]].forEach(([bx, by], k) => {
          const x = d.x + bx, y = d.y + by, r = 17;
          ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, r, r * 0.9, 0, 0, 7); ctx.fill();
          const gr = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, r); gr.addColorStop(0, '#ecd27a'); gr.addColorStop(1, '#bf9a3c');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(120,85,20,0.5)'; ctx.lineWidth = 1;
          for (let q = 4; q < r; q += 4) { ctx.beginPath(); ctx.arc(x, y, q, 0, 7); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(90,60,20,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
        });
      } else if (d.art === 'garten') {
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(d.x + 4, d.y + 5, d.w, d.h);
        ctx.fillStyle = '#7a5a36'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#5d4128'; ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
        const farben = ['#6bbf3f', '#8ad14f', '#4ea83a', '#c9d44a'];
        for (let r = 0; r < 4; r++) {
          const by = d.y + 10 + r * 22;
          ctx.fillStyle = '#6b4a2e'; ctx.fillRect(d.x + 10, by, d.w - 20, 15);
          for (let q = 0; q < 9; q++) { ctx.fillStyle = farben[(r + q) % 4]; ctx.beginPath(); ctx.arc(d.x + 18 + q * ((d.w - 36) / 8), by + 7.5, 4.2, 0, 7); ctx.fill(); }
          ctx.fillStyle = ['#e8452c', '#f2a81a', '#e8556b', '#b36bd6'][r]; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(d.x + 28 + q * 30, by + 5, 2, 0, 7); ctx.fill(); }
        }
        ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 3; ctx.strokeRect(d.x, d.y, d.w, d.h);
      } else if (d.art === 'windrad') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(d.x + 8, d.y + 12, 9, 7, 0, 0, 7); ctx.fill();
        const wind = t * 1.4 + 0.8 * Math.sin(t * 0.3);
        ctx.save(); ctx.translate(d.x + 7, d.y + 9); ctx.rotate(wind); ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(d.r, -2); ctx.lineTo(d.r, 4); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(wind);
        for (let k = 0; k < 3; k++) {
          ctx.rotate(Math.PI * 2 / 3);
          ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(d.r, -1.2); ctx.lineTo(d.r, 3.2); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = '#cfd3d6'; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#d8402c'; ctx.beginPath(); ctx.arc(d.x, d.y, 3.4, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, 7); ctx.stroke();
      }
    });
  }
  function zeichneGebaeude(ctx, sicht, S, jetzt) {
    D.GEBAEUDE.forEach(g => {
      if (g.x > sicht.x1 || g.x + g.w < sicht.x0 || g.y > sicht.y1 || g.y + g.h < sicht.y0) return;
      dach(ctx, g.x, g.y, g.w, g.h, g.dach, g.art === 'halle' || g.art === 'haendler' ? 'blech' : '');
      if (g.art === 'halle') {
        ctx.fillStyle = '#2b2a2a'; ctx.fillRect(g.x + 30, g.y + g.h - 8, g.w - 60, 8);
        schildText(ctx, 'MASCHINENHALLE', g.x + g.w / 2, g.y + g.h / 2 - 6, 18, '#fff3e0');
      } else if (g.art === 'haus') {
        zeichneKamin(ctx, g.x + 118, g.y + 9);
        // Haustuer mit Stufe und Blumenkasten
        ctx.fillStyle = '#5a3a24'; ctx.fillRect(g.x + g.w / 2 - 12, g.y + g.h - 4, 24, 8); ctx.fillStyle = '#c9a56a'; ctx.fillRect(g.x + g.w / 2 + 6, g.y + g.h + 1, 3, 2);
        ctx.fillStyle = '#d9d2c0'; ctx.fillRect(g.x + g.w / 2 - 16, g.y + g.h + 4, 32, 5);
        ['#e8556b', '#f2c21a', '#e8556b', '#ffffff', '#f2c21a'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(g.x + 20 + k * 9, g.y + g.h + 3, 2.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(g.x + g.w - 56 + k * 9, g.y + g.h + 3, 2.6, 0, 7); ctx.fill(); });
        schildText(ctx, 'HOF', g.x + g.w / 2, g.y + g.h / 2 + 22, 20, '#ffe9d6');
      } else if (g.art === 'handel') {
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(g.x + 20, g.y + 20, g.w - 40, 16);
        ctx.fillStyle = '#3a5a78'; for (let xx = g.x + 24; xx < g.x + g.w - 28; xx += 22) ctx.fillRect(xx, g.y + 24, 12, 8);
        schildText(ctx, 'LANDHANDEL', g.x + g.w / 2, g.y + g.h / 2 + 14, 24, '#f4f8ff');
      } else if (g.art === 'haendler') {
        ctx.fillStyle = '#c8202a'; ctx.fillRect(g.x, g.y + g.h * 0.42, g.w, g.h * 0.16);
        schildText(ctx, 'TRAKTOR-HÄNDLER', g.x + g.w / 2, g.y + g.h * 0.5, 22, '#fff');
        for (let k = 0; k < 6; k++) {   // Wimpelkette
          const fx = g.x + 30 + k * ((g.w - 60) / 5), wv = Math.sin(jetzt / 400 + k) * 2;
          ctx.fillStyle = ['#e8452c', '#f2c21a', '#2e8b3c', '#1d5fb0'][k % 4]; ctx.beginPath(); ctx.moveTo(fx - 5, g.y + g.h + 6); ctx.lineTo(fx + 5, g.y + g.h + 6); ctx.lineTo(fx + wv, g.y + g.h + 18); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(120,150,175,0.65)'; ctx.fillRect(g.x + 14, g.y + g.h - 24, g.w - 28, 14);
      }
    });
    D.SILOS.forEach(s => {
      if (s.x + s.r < sicht.x0 || s.x - s.r > sicht.x1 || s.y + s.r < sicht.y0 || s.y - s.r > sicht.y1) return;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(s.x + 9, s.y + 11, s.r, 0, 7); ctx.fill();
      const rg = ctx.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.1, s.x, s.y, s.r);
      rg.addColorStop(0, '#f0f3f5'); rg.addColorStop(0.6, '#bcc6cc'); rg.addColorStop(1, '#7e8b94');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      [0.78, 0.55, 0.3].forEach(k => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * k, 0, 7); ctx.stroke(); });
      ctx.fillStyle = '#6a757d'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.12, 0, 7); ctx.fill();
    });
    ctx.strokeStyle = '#8b959c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(D.SILOS[0].x + 40, D.SILOS[0].y + 20); ctx.lineTo(D.SILOS[1].x - 40, D.SILOS[1].y + 20); ctx.stroke();
    // Silo-Fuellstand (Balken unter den Silos)
    const kap = M.siloKap(), voll = Math.min(1, M.lagerMenge() / kap);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(1520, 1792, 240, 10);
    ctx.fillStyle = voll > 0.9 ? '#e0533a' : '#f2c14a'; ctx.fillRect(1521, 1793, 238 * voll, 8);
    // Betriebe
    D.PRODUKTION.forEach(b => {
      if (b.x > sicht.x1 || b.x + b.w < sicht.x0 || b.y > sicht.y1 || b.y + b.h < sicht.y0) return;
      const p = S.produktion[b.id];
      if (!p) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,230,120,0.85)'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.setLineDash([]);
        schildText(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 - 14, 34, '#fff');
        schildText(ctx, 'BAUPLATZ', b.x + b.w / 2, b.y + b.h / 2 + 18, 12, '#ffe27a');
        schildText(ctx, b.name + (S.level < b.lvl ? ' · Lvl ' + b.lvl : ''), b.x + b.w / 2, b.y + b.h / 2 + 34, 12, '#fff');
      } else {
        dach(ctx, b.x, b.y, b.w, b.h, b.dach, 'blech');
        zeichneLuefter(ctx, b.x + b.w * 0.78, b.y + 17, p.queue.length ? jetzt / 1000 : 0);
        schildText(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 - 12, 34, '#fff');
        schildText(ctx, b.name, b.x + b.w / 2, b.y + b.h / 2 + 22, 13, '#fff');
        const q = p.queue[0];
        if (q && q.start != null) {
          const f = Math.min(1, (jetzt - q.start) / Math.max(1, q.dauer));
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(b.x + 8, b.y + b.h - 16, b.w - 16, 8);
          ctx.fillStyle = '#7fe083'; ctx.fillRect(b.x + 9, b.y + b.h - 15, (b.w - 18) * f, 6);
        }
      }
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Tierhof
  // ----------------------------------------------------------------------------------------------
  function hz(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // Bahn eines Tieres im Gehege: Position und Blickrichtung
  function tierPos(pen, i, t) {
    const pad = 14, w = pen.w - 2 * pad, h = pen.h - 2 * pad - 10;
    const f1 = 0.10 + hz(i) * 0.14, f2 = 0.07 + hz(i + 9) * 0.12, p1 = hz(i + 3) * 6.28, p2 = hz(i + 5) * 6.28;
    const u = 0.5 + 0.5 * Math.sin(t * f1 + p1), v = 0.5 + 0.5 * Math.sin(t * f2 * 1.3 + p2);
    const du = 0.5 * Math.cos(t * f1 + p1) * f1 * w, dv = 0.5 * Math.cos(t * f2 * 1.3 + p2) * f2 * 1.3 * h;
    return { x: pen.x + pad + u * w, y: pen.y + pad + 8 + v * h, a: Math.atan2(dv, du) };
  }
  function zeichneHuhn(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1.35, 1.35);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(1.5, 2.5, 6.5, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e2dccf'; ctx.beginPath(); ctx.ellipse(-1.5, 0.5, 3.6, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.arc(5.8, 0, 2.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9332a'; ctx.beginPath(); ctx.arc(6, -2, 1.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a81a'; ctx.beginPath(); ctx.moveTo(8, -0.8); ctx.lineTo(10.2, 0); ctx.lineTo(8, 0.9); ctx.fill();
    ctx.restore();
  }
  function zeichneSchaf(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(2, 3, 10, 7.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3f3a'; ctx.beginPath(); ctx.ellipse(10, 0, 4.2, 3.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4efe4';
    [[-3, -4], [-3, 4], [3, -4.5], [3, 4.5], [0, 0], [-6, 0], [5, 0]].forEach(c => { ctx.beginPath(); ctx.arc(c[0], c[1], 4.6, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(160,150,135,0.45)'; ctx.beginPath(); ctx.arc(-2, 2, 3.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function zeichneKuh(ctx, x, y, a, i) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(2, 4, 15, 8.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f7f5f0'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = hz(i) < 0.5 ? '#2a2623' : '#6b4a33';
    ctx.beginPath(); ctx.ellipse(-4, -2.5, 4.5, 3.4, 0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, 3, 3.6, 2.8, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#f0e9df'; ctx.beginPath(); ctx.ellipse(14, 0, 5.6, 4.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a9a0'; ctx.beginPath(); ctx.ellipse(18, 0, 2.4, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2623'; ctx.beginPath(); ctx.arc(14, -3.8, 1.5, 0, 7); ctx.arc(14, 3.8, 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9d2c4'; ctx.fillRect(-14, -1, 4, 2);
    ctx.restore();
  }
  function zeichneEnte(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1.3, 1.3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(1.5, 2.5, 7, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8cfb8'; ctx.beginPath(); ctx.ellipse(-1.5, 0.6, 3.8, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f7d5a'; ctx.beginPath(); ctx.arc(6.2, 0, 2.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a81a'; ctx.beginPath(); ctx.ellipse(9.3, 0, 2.2, 1.3, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function zeichneZiege(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(2, 3.5, 10, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e2d6'; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 5.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b9ae98'; ctx.beginPath(); ctx.ellipse(-2, 1.5, 4.5, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ddd5c4'; ctx.beginPath(); ctx.ellipse(10, 0, 4.2, 3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, -2.2); ctx.lineTo(7.5, -5.5); ctx.moveTo(10, 2.2); ctx.lineTo(7.5, 5.5); ctx.stroke();
    ctx.restore();
  }
  function zeichneAlpaka(ctx, x, y, a, i) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(2, 4, 12, 7.5, 0, 0, 7); ctx.fill();
    const fell = ['#e9dcc6', '#a98562', '#6b4f3a', '#f4efe4'][(i * 7) % 4];
    ctx.fillStyle = fell; ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 0, 4.2, 3.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-3, -2, 5, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2f28'; ctx.beginPath(); ctx.arc(14, 0, 1.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function zeichneBienenstock(ctx, x, y, farbe) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, y + 3, 16, 14);
    ctx.fillStyle = farbe; ctx.fillRect(x, y, 16, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, 16, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x + 6, y + 10, 4, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 16, 14);
  }
  function zeichneTierhof(ctx, sicht, S, jetzt, t, m) {
    const th = D.TIERHOF;
    if (th.x > sicht.x1 || th.x + th.w < sicht.x0 || th.y > sicht.y1 || th.y + th.h < sicht.y0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(th.x - 4, th.y - 4, th.w + 8, th.h + 8);
    ctx.fillStyle = m.beton; ctx.fillRect(th.x, th.y, th.w, th.h);
    schildText(ctx, 'TIERHOF', th.x + 120, th.y + 22, 20, '#fff7e0');
    D.TIERE.forEach(d => {
      const st = S.tiere[d.id], h = d.haus, pen = d.auslauf;
      // ausserhalb des Bildausschnitts nichts zeichnen (Gehege + Haus)
      const bx0 = Math.min(pen.x, h.x) - 20, bx1 = Math.max(pen.x + pen.w, h.x + h.w) + 20, by0 = Math.min(pen.y, h.y) - 20, by1 = Math.max(pen.y + pen.h, h.y + h.h) + 20;
      if (bx0 > sicht.x1 || bx1 < sicht.x0 || by0 > sicht.y1 || by1 < sicht.y0) return;
      // Gehege (Wiese + Zaun)
      ctx.fillStyle = d.id === 'bienen' ? '#7fb85a' : '#6fa84c'; ctx.fillRect(pen.x, pen.y, pen.w, pen.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let k = 0; k < pen.w; k += 22) ctx.fillRect(pen.x + k, pen.y, 10, pen.h);
      ctx.strokeStyle = st ? '#8a6238' : 'rgba(210,190,150,0.8)'; ctx.lineWidth = 3; if (!st) ctx.setLineDash([8, 7]);
      ctx.strokeRect(pen.x, pen.y, pen.w, pen.h); ctx.setLineDash([]);
      if (d.id === 'enten') { ctx.fillStyle = '#5b9bc4'; ctx.beginPath(); ctx.ellipse(pen.x + pen.w * 0.7, pen.y + pen.h * 0.55, pen.w * 0.22, pen.h * 0.28, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke(); }
      if (st) { ctx.fillStyle = '#6b4a2e'; for (let k = 0; k <= pen.w; k += 36) { ctx.fillRect(pen.x + k - 2, pen.y - 2, 4, 5); ctx.fillRect(pen.x + k - 2, pen.y + pen.h - 3, 4, 5); } }
      if (!st) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,230,120,0.85)'; ctx.lineWidth = 3; ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4); ctx.setLineDash([]);
        schildText(ctx, d.icon, h.x + h.w / 2, h.y + h.h / 2 - 12, 32, '#fff');
        schildText(ctx, 'BAUPLATZ', h.x + h.w / 2, h.y + h.h / 2 + 16, 11, '#ffe27a');
        schildText(ctx, d.stall + (S.level < d.lvl ? ' · Lvl ' + d.lvl : ''), h.x + h.w / 2, h.y + h.h / 2 + 31, 11, '#fff');
        return;
      }
      dach(ctx, h.x, h.y, h.w, h.h, h.dach);
      schildText(ctx, d.icon, h.x + h.w / 2, h.y + h.h / 2 - 10, 30, '#fff');
      schildText(ctx, d.stall, h.x + h.w / 2, h.y + h.h / 2 + 20, 12, '#fff');
      const n = st.anzahl;
      if (d.id === 'bienen') {
        const boxen = Math.min(12, n);
        for (let i = 0; i < boxen; i++) zeichneBienenstock(ctx, pen.x + 26 + (i % 6) * 40, pen.y + 28 + Math.floor(i / 6) * 50, ['#e8c14a', '#7fb0e0', '#e08a8a', '#9fd68a'][i % 4]);
        for (let i = 0; i < Math.min(30, n * 3); i++) {
          const b = tierPos({ x: pen.x, y: pen.y, w: pen.w, h: pen.h }, i + 40, t * 3);
          ctx.fillStyle = '#f2c21a'; ctx.beginPath(); ctx.arc(b.x, b.y, 1.7, 0, 7); ctx.fill();
        }
        // Blumen
        for (let i = 0; i < 26; i++) { const x = pen.x + 12 + hz(i) * (pen.w - 24), y = pen.y + pen.h - 22 + hz(i + 7) * 12; ctx.fillStyle = ['#f6e65a', '#f08aa0', '#ffffff', '#9ab8ff'][i % 4]; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
      } else {
        const sicht_n = Math.min(d.id === 'huehner' || d.id === 'enten' ? 16 : 10, n);
        for (let i = 0; i < sicht_n; i++) {
          const p = tierPos(pen, i, t);
          if (d.id === 'huehner') zeichneHuhn(ctx, p.x, p.y, p.a);
          else if (d.id === 'schafe') zeichneSchaf(ctx, p.x, p.y, p.a);
          else if (d.id === 'enten') zeichneEnte(ctx, p.x, p.y, p.a);
          else if (d.id === 'ziegen') zeichneZiege(ctx, p.x, p.y, p.a);
          else if (d.id === 'alpakas') zeichneAlpaka(ctx, p.x, p.y, p.a, i);
          else zeichneKuh(ctx, p.x, p.y, p.a, i);
        }
      }
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Felder
  // ----------------------------------------------------------------------------------------------
  function zeichneFeld(ctx, d, S, jetzt, m) {
    const fw = d.c * Z, fh = d.r * Z;
    const f = S.felder[d.id];
    ctx.fillStyle = 'rgba(40,30,15,0.35)'; ctx.fillRect(d.x - 5, d.y - 5, fw + 10, fh + 10);
    if (!f) {
      ctx.fillStyle = m.brach; ctx.fillRect(d.x, d.y, fw, fh);
      ctx.fillStyle = 'rgba(110,120,60,0.18)'; ctx.fillRect(d.x, d.y, fw, fh);
      ctx.strokeStyle = 'rgba(120,90,50,0.9)'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 1.5, d.y - 1.5, fw + 3, fh + 3);
      ctx.strokeStyle = 'rgba(210,190,150,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(d.x - 10, d.y - 10, fw + 20, fh + 20); ctx.setLineDash([]);
      const px = d.x - 18, py = d.y + fh / 2 - 20;
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px + 14, py + 18, 4, 22);
      ctx.fillStyle = '#fff'; ctx.fillRect(px - 20, py - 16, 70, 36);
      ctx.strokeStyle = '#d02a2a'; ctx.lineWidth = 3; ctx.strokeRect(px - 20, py - 16, 70, 36);
      schildText(ctx, 'ZU VERKAUFEN', px + 15, py - 5, 8.5, '#c02020');
      schildText(ctx, d.name, px + 15, py + 9, 10, '#222');
      return;
    }
    const wachstum = M.fortschrittWachstum(f, jetzt);
    ctx.fillStyle = phaseMuster(ctx, f.phase, f.frucht, wachstum);
    ctx.fillRect(d.x, d.y, fw, fh);
    const job = M.jobAufFeld(d.id);
    if (job) {
      const st = M.jobStand(job, jetzt);
      if (st.teil !== 'hin') {
        const p = st.teil === 'rueck' ? 1 : st.p;
        const gm = job.geraet ? M.maschine(job.geraet) : null, tm = M.maschine(job.traktor);
        const breite = (gm ? D.def(gm.id).w : D.def(tm.id).w) * K;
        const b = bahnGeo(d.id, breite, 0);
        const nach = nachMuster(ctx, job, f);
        const tint = TINT[job.schritt];
        const u = p * b.n, li = Math.min(b.n - 1, Math.floor(u)), fr = u - li;
        const fuell = (x, y, w, h) => {
          if (w <= 0 || h <= 0) return;
          if (nach) { ctx.fillStyle = nach; ctx.fillRect(x, y, w, h); }
          if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
        };
        // fertige Bahnen
        const fertigQuer = li >= b.n || p >= 1 ? b.quer : Math.min(b.quer, li * b.laneW);
        const richtung = bahnRichtung(b, li);
        const teil = Math.min(1, fr / 0.9) * b.laenge;
        if (b.horizontal) {
          fuell(d.x, d.y, fw, fertigQuer);
          if (p < 1) {
            const y0 = d.y + li * b.laneW, hh = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) fuell(d.x, y0, teil, hh); else fuell(d.x + b.laenge - teil, y0, teil, hh);
          }
        } else {
          fuell(d.x, d.y, fertigQuer, fh);
          if (p < 1) {
            const x0 = d.x + li * b.laneW, ww = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) fuell(x0, d.y, ww, teil); else fuell(x0, d.y + b.laenge - teil, ww, teil);
          }
        }
      }
    }
    // Leben auf dem Feld: Wind laeuft ueber die Pflanzen, reife Felder funkeln
    if (fein && !job && (f.phase === 'reif' || (f.phase === 'waechst' && wachstum >= 0.35))) {
      const ts = jetzt / 1000, ph = (ts * 0.11 + d.id * 0.37) % 1, cx = d.x + (ph * 1.7 - 0.35) * fw, bw = fw * 0.22 + 30;
      const wg = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
      wg.addColorStop(0, 'rgba(255,255,230,0)'); wg.addColorStop(0.5, 'rgba(255,255,230,' + (f.phase === 'reif' ? 0.13 : 0.09) + ')'); wg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = wg; ctx.fillRect(d.x, d.y, fw, fh);
      if (f.phase === 'reif') {
        ctx.strokeStyle = 'rgba(255,226,122,' + (0.35 + 0.3 * Math.sin(ts * 3.2)) + ')'; ctx.lineWidth = 5; ctx.strokeRect(d.x + 2.5, d.y + 2.5, fw - 5, fh - 5);
        for (let i = 0; i < 7; i++) {
          const a2 = 0.5 + 0.5 * Math.sin(ts * 2.6 + i * 1.9);
          if (a2 < 0.35) continue;
          const sx = d.x + 14 + hz(d.id * 13 + i) * (fw - 28), sy = d.y + 14 + hz(d.id * 7 + i + 40) * (fh - 28), r = 3 + 5 * a2;
          ctx.fillStyle = 'rgba(255,246,190,' + a2 * 0.9 + ')';
          ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.28, sy - r * 0.28); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.28, sy + r * 0.28);
          ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.28, sy + r * 0.28); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.28, sy - r * 0.28); ctx.closePath(); ctx.fill();
        }
      }
    }
    // Rand
    ctx.strokeStyle = 'rgba(90,60,30,0.9)'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 1.5, d.y - 1.5, fw + 3, fh + 3);
    // leichte Innenschatten
    const g1 = ctx.createLinearGradient(d.x, 0, d.x + 18, 0); g1.addColorStop(0, 'rgba(0,0,0,0.22)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(d.x, d.y, 18, fh);
    const g2 = ctx.createLinearGradient(0, d.y, 0, d.y + 18); g2.addColorStop(0, 'rgba(0,0,0,0.22)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fillRect(d.x, d.y, fw, 18);
  }

  // ----------------------------------------------------------------------------------------------
  // Welt zeichnen
  // ----------------------------------------------------------------------------------------------
  let fein = true;   // Feinheiten (Windschimmer, Funkeln) nur, wenn nah genug herangezoomt
  function zeichneWelt(ctx, cam, W, H, t, jetzt, dt) {
    const S = M.stand();
    fein = cam.z >= 0.55;
    const m = musterHolen(ctx);
    const sicht = { x0: cam.x - W / 2 / cam.z - 80, y0: cam.y - H / 2 / cam.z - 80, x1: cam.x + W / 2 / cam.z + 80, y1: cam.y + H / 2 / cam.z + 80 };
    ctx.fillStyle = m.gras; ctx.fillRect(sicht.x0, sicht.y0, sicht.x1 - sicht.x0, sicht.y1 - sicht.y0);
    // Strassen
    D.STRASSEN.forEach(s => {
      if (s.x > sicht.x1 || s.x + s.w < sicht.x0 || s.y > sicht.y1 || s.y + s.h < sicht.y0) return;
      const x0 = Math.max(s.x, sicht.x0), y0 = Math.max(s.y, sicht.y0), x1 = Math.min(s.x + s.w, sicht.x1), y1 = Math.min(s.y + s.h, sicht.y1);
      ctx.fillStyle = 'rgba(40,36,30,0.35)'; ctx.fillRect(x0 - (s.w > s.h ? 0 : 6), y0 - (s.w > s.h ? 6 : 0), (x1 - x0) + (s.w > s.h ? 0 : 12), (y1 - y0) + (s.w > s.h ? 12 : 0));
      ctx.fillStyle = m.asphalt; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = 'rgba(235,235,225,0.85)'; ctx.lineWidth = 3; ctx.setLineDash([34, 30]);
      ctx.beginPath();
      if (s.w > s.h) { ctx.moveTo(x0, s.y + s.h / 2); ctx.lineTo(x1, s.y + s.h / 2); } else { ctx.moveTo(s.x + s.w / 2, y0); ctx.lineTo(s.x + s.w / 2, y1); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(240,240,230,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (s.w > s.h) { ctx.moveTo(x0, s.y + 6); ctx.lineTo(x1, s.y + 6); ctx.moveTo(x0, s.y + s.h - 6); ctx.lineTo(x1, s.y + s.h - 6); }
      else { ctx.moveTo(s.x + 6, y0); ctx.lineTo(s.x + 6, y1); ctx.moveTo(s.x + s.w - 6, y0); ctx.lineTo(s.x + s.w - 6, y1); }
      ctx.stroke();
    });
    ctx.fillStyle = m.asphalt; ctx.fillRect(2150, 1500, 90, 90);
    [D.HOF, D.PLATZ_LANDHANDEL].forEach(r => {
      if (r.x > sicht.x1 || r.x + r.w < sicht.x0 || r.y > sicht.y1 || r.y + r.h < sicht.y0) return;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      ctx.fillStyle = m.beton; ctx.fillRect(r.x, r.y, r.w, r.h);
    });
    ctx.fillStyle = m.beton; ctx.fillRect(1700, 1590, 200, 40); ctx.fillRect(2240, 1590, 40, 60);
    // Betriebs-Platz (Beton)
    ctx.fillStyle = m.beton; ctx.fillRect(2800, 1610, 280, 430);
    // Felder
    D.FELDER.forEach(d => {
      if (d.x > sicht.x1 || d.x + d.c * Z < sicht.x0 || d.y > sicht.y1 || d.y + d.r * Z < sicht.y0) return;
      zeichneFeld(ctx, d, S, jetzt, m);
    });
    zeichneTierhof(ctx, sicht, S, jetzt, t, m);
    Object.keys(geoCache).forEach(k => { if (!S.jobs.some(j => String(j.id) === k)) delete geoCache[k]; });
    // Maschinen
    const park = parkplaetze(S);
    const einsaetze = {};
    S.jobs.forEach(j => { einsaetze[j.traktor] = j; if (j.geraet) einsaetze[j.geraet] = j; });
    // parkende Geraete und Maschinen
    S.flotte.forEach(mm => {
      if (einsaetze[mm.uid]) return;
      const d = D.def(mm.id), p = park[mm.uid];
      if (p.x < sicht.x0 - 200 || p.x > sicht.x1 + 200 || p.y < sicht.y0 - 200 || p.y > sicht.y1 + 200) return;
      if (d.art === 'geraet') G.zeichne(ctx, G.fuerDef(d).koerper, p.x, p.y - d.len * 0.5 * K, -Math.PI / 2, true, K);
      else zeichneZugmaschine(ctx, mm, p.x, p.y, -Math.PI / 2);
    });
    // Einsatz
    S.jobs.forEach(j => {
      const po = jobPosen(j, jetzt);
      if (po.pose.x < sicht.x0 - 300 || po.pose.x > sicht.x1 + 300 || po.pose.y < sicht.y0 - 300 || po.pose.y > sicht.y1 + 300) return;
      const bx = Math.sin(t * 52 + j.id) * 0.28, by = Math.cos(t * 61 + j.id) * 0.28;   // Motorbrummen
      po.pose.x += bx; po.pose.y += by;
      if (po.gm) zeichneGeraetAm(ctx, po.gm, po.tm, po.pose.x, po.pose.y, po.pose.a);
      zeichneZugmaschine(ctx, po.tm, po.pose.x, po.pose.y, po.pose.a);
      if (dt > 0) {
        const ex = po.td.l * 0.18 * K, ey = -po.td.b * 0.26 * K, ca = Math.cos(po.pose.a), sa = Math.sin(po.pose.a);
        rauch(po.pose.x + ex * ca - ey * sa, po.pose.y + ex * sa + ey * ca, jetzt, dt, po.arbeitend ? 7 : 4, false);
      }
      if (po.arbeitend && dt > 0) {
        const farbe = j.schritt === 'ernten' ? 'rgba(236,214,120,0.8)' : j.schritt === 'duengen' || j.schritt === 'kalken' ? 'rgba(240,240,235,0.75)' : j.schritt === 'spritzen' ? 'rgba(170,220,255,0.7)' : 'rgba(110,78,48,0.75)';
        staub(po.arbeitslinie.x, po.arbeitslinie.y, farbe, jetzt, dt);
      }
    });
    if (dt > 0) {
      partikelStep(dt);
      D.GEBAEUDE.forEach(g => { if (g.art === 'haus' && g.x < sicht.x1 && g.x + g.w > sicht.x0 && g.y < sicht.y1 && g.y + g.h > sicht.y0) rauch(g.x + 127, g.y + 18, jetzt, dt, 3, true); });
      D.PRODUKTION.forEach(b => {
        const pr = S.produktion[b.id];
        if (pr && pr.queue.length && b.x < sicht.x1 && b.x + b.w > sicht.x0 && b.y < sicht.y1 && b.y + b.h > sicht.y0) rauch(b.x + b.w * 0.78, b.y + 14, jetzt, dt, 5, true);
      });
    }
    zeichneDeko(ctx, sicht, jetzt);
    zeichneGebaeude(ctx, sicht, S, jetzt);
    partikel.forEach(p => {
      const k = 1 - p.t / p.max;
      ctx.globalAlpha = Math.max(0, p.rauch ? k * 0.38 : k * 0.8); ctx.fillStyle = p.farbe;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.rauch ? p.r * (1 + (1 - k) * 2.2) : p.r * (1.6 - k * 0.6), 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Baeume
    baeume.forEach(b => {
      if (b.x < sicht.x0 - 50 || b.x > sicht.x1 + 50 || b.y < sicht.y0 - 50 || b.y > sicht.y1 + 50) return;
      const sp = G.baum(b.v);
      ctx.drawImage(sp.c, b.x - sp.ox, b.y - sp.oy, sp.w, sp.h);
    });
    // Wolkenschatten ziehen langsam ueber das Land
    const wk = wolkeHolen();
    for (let i = 0; i < 5; i++) {
      const w = 760 + hz(i + 11) * 520, h = w * 0.62, span = D.WELT.b + 2 * w;
      const x = ((hz(i + 3) * span + t * (9 + hz(i + 5) * 8)) % span) - w, y = hz(i + 7) * D.WELT.h - h / 2;
      if (x > sicht.x1 || x + w < sicht.x0 || y > sicht.y1 || y + h < sicht.y0) continue;
      ctx.globalAlpha = 0.5; ctx.drawImage(wk, x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }
  let wolkeBild = null;
  function wolkeHolen() {
    if (wolkeBild) return wolkeBild;
    const c = document.createElement('canvas'); c.width = 128; c.height = 80;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 40, 4, 64, 40, 62);
    gr.addColorStop(0, 'rgba(20,30,40,0.20)'); gr.addColorStop(0.6, 'rgba(20,30,40,0.10)'); gr.addColorStop(1, 'rgba(20,30,40,0)');
    g.save(); g.translate(64, 40); g.scale(1, 0.64); g.translate(-64, -40); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.restore();
    return (wolkeBild = c);
  }

  // Beschriftungen in Bildschirmkoordinaten (gut lesbar bei jedem Zoom)
  function zeichneBeschriftungen(ctx, cam, W, H, jetzt, t) {
    const S = M.stand();
    const zuS = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
    const pille = (x, y, text, farbe, schrift) => {
      ctx.font = 'bold ' + (schrift || 13) + 'px system-ui,sans-serif';
      const w = ctx.measureText(text).width + 16, h = (schrift || 13) + 10;
      ctx.fillStyle = 'rgba(14,24,16,0.82)';
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 8, y - h / 2); ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, 8); ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, 8); ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, 8); ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, 8); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = farbe || '#fff'; ctx.fillText(text, x, y + 1);
      return h;
    };
    D.FELDER.forEach(d => {
      const cx = d.x + d.c * Z / 2, cy = d.y + d.r * Z / 2;
      const p = zuS(cx, cy);
      if (p.x < -120 || p.x > W + 120 || p.y < -60 || p.y > H + 60) return;
      const f = S.felder[d.id];
      if (!f) {
        if (cam.z > 0.4) pille(p.x, p.y, S.level < d.lvl ? '🔒 ab Level ' + d.lvl : '🏷 ' + Math.round(d.preis / 100) / 10 + ' T€', S.level < d.lvl ? '#ffb4a2' : '#ffe27a', 14);
        return;
      }
      const wachstum = M.fortschrittWachstum(f, jetzt);
      const job = M.jobAufFeld(d.id);
      const zeilen = [];
      let farbe = '#fff';
      const fn = f.frucht ? D.frucht(f.frucht).name : null;
      if (job) {
        const st = M.jobStand(job, jetzt);
        const sch = D.SCHRITTE[job.schritt];
        const rest = Math.max(0, st.restMs);
        zeilen.push(sch.icon + ' ' + sch.name + (st.teil === 'hin' ? ' · fährt hin' : st.teil === 'rueck' ? ' · fertig' : ' ' + Math.round(st.p * 100) + ' %'));
        if (st.teil !== 'rueck') zeilen.push('noch ' + zeitText(rest));
      } else if (f.phase === 'reif') { zeilen.push('🌾 ' + fn + ' erntereif!'); farbe = '#ffe27a'; }
      else if (f.phase === 'waechst') { zeilen.push('🌱 ' + fn + ' ' + Math.round(wachstum * 100) + ' %'); zeilen.push('noch ' + zeitText(M.restWachsen(d.id, jetzt))); }
      else if (f.phase === 'bearbeitet') zeilen.push('Gegrubbert – bereit zum Säen');
      else if (f.phase === 'gepfluegt') zeilen.push('Gepflügt – bereit zum Säen');
      else zeilen.push('Stoppelfeld – bearbeiten');
      if (f.auto) zeilen.push('👨‍🌾 Fahrer: ' + D.frucht(f.auto.frucht).name);
      let y = p.y - zeilen.length * 11;
      if (cam.z < 0.45) { pille(p.x, p.y, d.id + '', '#fff', 15); return; }
      zeilen.forEach((z, i) => { const h = pille(p.x, y, z, i === 0 ? farbe : '#cfe0cf', i === 0 ? 14 : 12); y += h + 3; });
      if (!job && f.phase === 'reif') {
        const k = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = 'rgba(255,226,90,' + (0.6 + 0.4 * k) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - zeilen.length * 11 - 20, 7 + 2 * k, 0, 7); ctx.fill();
      }
    });
    // Stall-Hinweise
    D.TIERE.forEach(d => {
      const st = S.tiere[d.id];
      if (!st || !st.anzahl || cam.z < 0.45) return;
      const ss = M.stallStand(d.id, jetzt);
      const p = zuS(d.haus.x + d.haus.w / 2, d.haus.y - 10);
      if (p.x < -150 || p.x > W + 150 || p.y < -50 || p.y > H + 50) return;
      let text = d.icon + ' ' + st.anzahl + '/' + ss.kap + (st.lager >= 1 ? ' · ' + (st.lager >= 1000 ? (st.lager / 1000).toFixed(1) + ' t' : Math.round(st.lager) + ' kg') + ' ' + D.gut(d.gut).name : '');
      let farbe = '#fff';
      if (d.futterKgH && !ss.laeuft) { text = '⚠ ' + d.name + ': Futter leer'; farbe = '#ffb4a2'; }
      else if (st.lager >= ss.lagerKap * 0.9 && ss.lagerKap > 0) { text = '✋ ' + d.name + ': einsammeln!'; farbe = '#ffe27a'; }
      pille(p.x, p.y, text, farbe, 13);
    });
    // Betriebs-Hinweise
    D.PRODUKTION.forEach(b => {
      const pr = S.produktion[b.id];
      if (!pr) return;
      const q = pr.queue[0];
      const p = zuS(b.x + b.w / 2, b.y - 8);
      if (cam.z > 0.5 && q && q.start != null) pille(p.x, p.y, 'noch ' + zeitText(Math.max(0, q.start + q.dauer - jetzt)) + (pr.queue.length > 1 ? ' (+' + (pr.queue.length - 1) + ')' : ''), '#cfe8cf', 12);
    });
  }
  function zeitText(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s >= 3600) return Math.floor(s / 3600) + ' Std ' + Math.floor((s % 3600) / 60) + ' Min';
    if (s >= 60) return Math.floor(s / 60) + ' Min ' + (s % 60 < 10 ? '0' : '') + (s % 60) + ' s';
    return s + ' s';
  }

  // Wetter-Effekte ueber der ganzen Szene (Bildschirmkoordinaten)
  function zeichneWetter(ctx, W, H, t, typ) {
    const tint = { bewoelkt: 'rgba(60,70,85,0.10)', regen: 'rgba(25,45,80,0.20)', gewitter: 'rgba(15,20,45,0.34)', hitze: 'rgba(255,150,40,0.11)', nebel: 'rgba(225,230,235,0.30)', schnee: 'rgba(235,242,255,0.20)' }[typ];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    if (typ === 'regen' || typ === 'gewitter') {
      const n = typ === 'gewitter' ? 170 : 110;
      ctx.strokeStyle = 'rgba(210,226,255,0.62)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = 520 + hz(i) * 260;
        const x = (hz(i + 1) * (W + 200) + t * 110 * (0.6 + hz(i + 2) * 0.5)) % (W + 200) - 100;
        const y = (hz(i + 3) * H + t * sp) % H;
        ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 13);
      }
      ctx.stroke();
      if (typ === 'gewitter') {
        const blitz = Math.floor(t * 1.3), phase = (t * 1.3) - blitz;
        if (hz(blitz * 7 + 3) < 0.28 && phase < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - phase / 0.12)) + ')'; ctx.fillRect(0, 0, W, H); }
      }
    } else if (typ === 'schnee') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 90; i++) {
        const x = (hz(i + 1) * W + Math.sin(t * 0.8 + i) * 18 + W) % W, y = (hz(i + 3) * H + t * (30 + hz(i + 2) * 40)) % H;
        ctx.beginPath(); ctx.arc(x, y, 1.6 + hz(i + 5) * 1.6, 0, 7); ctx.fill();
      }
    } else if (typ === 'nebel') {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(235,238,242,0.25)'); gr.addColorStop(1, 'rgba(235,238,242,0.05)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    } else if (typ === 'hitze') {
      const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); gr.addColorStop(0, 'rgba(255,170,60,0)'); gr.addColorStop(1, 'rgba(255,120,20,0.16)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
  }

  // Was liegt an Weltposition?
  function trefferBei(wx, wy, S) {
    for (let i = 0; i < D.PRODUKTION.length; i++) { const b = D.PRODUKTION[i]; if (inRect(wx, wy, b, 8)) return { art: 'betrieb', id: b.id }; }
    for (let i = 0; i < D.GEBAEUDE.length; i++) { const g = D.GEBAEUDE[i]; if (inRect(wx, wy, g, 6)) return { art: 'gebaeude', id: g.art }; }
    for (let i = 0; i < D.SILOS.length; i++) { const s = D.SILOS[i]; if (Math.hypot(wx - s.x, wy - s.y) < s.r + 6) return { art: 'gebaeude', id: 'silo' }; }
    for (let i = 0; i < D.FELDER.length; i++) { const f = D.FELDER[i]; if (inRect(wx, wy, { x: f.x, y: f.y, w: f.c * Z, h: f.r * Z }, 10)) return { art: 'feld', id: f.id }; }
    if (inRect(wx, wy, D.HOF)) return { art: 'gebaeude', id: 'halle' };
    for (let i = 0; i < D.TIERE.length; i++) { const d = D.TIERE[i]; if (inRect(wx, wy, d.haus, 8) || inRect(wx, wy, d.auslauf, 4)) return { art: 'stall', id: d.id }; }
    return null;
  }

  // Tageszeit: abends und nachts wird der Hof sanft dunkler und blauer, morgens/abends liegt ein warmer Schimmer darauf
  function zeichneTageszeit(ctx, W, H, ms) {
    const d = new Date(ms), h = d.getHours() + d.getMinutes() / 60;
    let a = 0, farbe = '18,28,64';
    if (h >= 21 || h < 5) a = 0.30;
    else if (h >= 19) a = 0.30 * (h - 19) / 2;
    else if (h < 7) a = 0.30 * (7 - h) / 2;
    if (a > 0.01) { ctx.fillStyle = 'rgba(' + farbe + ',' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    const warm = (h >= 6 && h < 8.5) ? 0.12 * (1 - Math.abs(h - 7.25) / 1.25) : (h >= 17.5 && h < 20) ? 0.14 * (1 - Math.abs(h - 18.75) / 1.25) : 0;
    if (warm > 0.01) { ctx.fillStyle = 'rgba(255,150,50,' + warm.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  baumeErzeugen();
  return { zeichneWelt, zeichneWetter, zeichneTageszeit, zeichneBeschriftungen, trefferBei, zeitText, jobPosen, parkplaetze, bahnen };
})();
