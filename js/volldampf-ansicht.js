// VOLLDAMPF: die Karte (SVG-Deutschlandkarte + HTML-Ebene für Züge, Dampf, Baustellen, Preisschilder).
// Kamera = CSS-transform auf .vd-welt (billig beim Ziehen/Zoomen); will-change nur während der Geste, danach rastert der
// Browser scharf neu. Striche und Schriften bleiben über --s (= 1/Zoom) auf dem Bildschirm gleich dick/groß.
// Kein DOM-Wissen über das Spiel-UI: Tipps gehen per Rückruf an volldampf.js.
const VolldampfAnsicht = (function () {
  const D = VolldampfDaten, K = VolldampfKarte, M = VolldampfModell, G = Glanz;
  const VB = K.viewBox.split(' ').map(Number);           // [x, y, w, h] in km-Einheiten
  const NS = 'http://www.w3.org/2000/svg';
  let wurzel = null, karteEl = null, welt = null, svg = null, ebene = null, nachtEl = null;
  let gNetz = null, gPlan = null, gBau = null, gStaedte = null, gLabels = null, gLinie = null, gLichter = null;
  const cam = { x: 0, y: 0, z: 1, zMin: 0.5, zMax: 18 };
  const NAH = 5.5;            // ab diesem Zoom: Bahnhöfe als Gleisplan mit Gebäuden
  // Linienfarben wie auf einem Netzplan (Index = lok.f)
  const FARBEN = ['#4C9BE8', '#E5534B', '#3FB37F', '#E7A33E', '#A77BDB', '#2EB5C4', '#E07FB0', '#B5C252', '#E37B3A', '#8FA0B5'];
  /** Netz und Züge bleiben beim Zoomen etwa gleich groß, wachsen nah dran aber sanft mit (Welt-Einheiten je Zeichen-px) */
  function netzSkala() { return Math.max(1, Math.sqrt(cam.z / 3)) / cam.z; }
  let gLinien = null, gHoefe = null, letzteSn = 0, istNah = false, linienTimer = 0;
  const band = {};            // uid -> Punkte des eigenen Linienbands (Kartenkoordinaten, Reihenfolge linie.weg)
  const bandGeo = {};         // uid|richtung -> { pts, len, ges } in Welt-Pixeln (Züge)
  const stationN = {};        // Stadt -> größte Zahl Linien auf einer anliegenden Strecke (Größe des Haltepunkts)
  let vw = 0, vh = 0;
  let tippFn = null, modus = 'normal', modusDaten = null;
  const zugEl = {};          // uid -> { kopf, wagen:[], letzterPuff }
  let geste = null, schwung = null, kamFlug = null;
  let labelTimer = 0;
  let markiert = {};         // Stadt-ids, die pulsieren (Auftrag „Zeigen“, Linienwahl)
  let preisBoxen = [];       // sichtbare Preisschilder (Baumodus) – Beschriftungen weichen ihnen aus
  const namenEl = {};        // Land-id -> <text> mit dem Ländernamen

  // ------------------------------------------------------------------ Aufbau
  const STIL = `
.vd-karte{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;touch-action:none;background:#0A0C0F}
.vd-welt{position:absolute;left:0;top:0;transform-origin:0 0}
.vd-welt.vd-bewegt{will-change:transform}
.vd-svg{position:absolute;left:0;top:0;overflow:visible}
.vd-ebene{position:absolute;left:0;top:0;width:0;height:0}
.vd-land{fill:#13171C;stroke:#2B323B;stroke-width:calc(.8px * var(--s));stroke-linejoin:round;transition:fill .6s}
.vd-land.vd-an{fill:var(--lf);fill-opacity:.1;stroke:var(--lf);stroke-opacity:.55;stroke-width:calc(1px * var(--s))}
.vd-land-glut{visibility:hidden}
.vd-schatten{fill:#000;opacity:.35}
.vd-landname{font-family:var(--gz-titel);font-weight:600;letter-spacing:calc(2.6px * var(--s));font-size:calc(11.5px * var(--s));fill:#58616C;text-anchor:middle;
 paint-order:stroke;stroke:#0A0C0F;stroke-opacity:.7;stroke-width:calc(2.5px * var(--s));stroke-linejoin:round;pointer-events:none}
.vd-landname.vd-an{fill:var(--lf);fill-opacity:.85}
.vd-gitter{fill:none;stroke:#fff;stroke-opacity:.035;stroke-width:calc(1px * var(--s))}
.vd-nachbar{font-family:var(--gz-titel);font-weight:600;fill:#3C434C;letter-spacing:calc(3px * var(--s));font-size:calc(11.5px * var(--s));text-anchor:middle}
.vd-meer{font-family:var(--gz-text);font-style:italic;fill:#3D5672;font-size:calc(12px * var(--s));text-anchor:middle}
.vd-bett{fill:none;stroke:#0A0C0F;stroke-width:calc(6.5px * var(--sn));stroke-linecap:round;stroke-linejoin:round}
.vd-schwelle{fill:none;stroke:#3A414A;stroke-width:calc(5px * var(--sn));stroke-dasharray:calc(.9px * var(--sn)) calc(2.3px * var(--sn))}
.vd-schiene{fill:none;stroke:#7D8792;stroke-width:calc(1.5px * var(--sn));stroke-linecap:round;stroke-linejoin:round}
.vd-schiene-strom{stroke:#8FB6DA}
.vd-band-unter{fill:none;stroke:#0A0C0F;stroke-linecap:round;stroke-linejoin:round}
.vd-band{fill:none;stroke-width:calc(3.3px * var(--sn));stroke-linecap:round;stroke-linejoin:round}
.vd-mast{fill:none;stroke:#D5E1EC;stroke-opacity:.5;stroke-dasharray:calc(.6px * var(--sn)) calc(11px * var(--sn))}
.vd-hof{display:none}
.vd-nah .vd-hof{display:inline}
.vd-nah .vd-stadt.vd-an{display:none}
.vd-h-platte{fill:#1A2027;stroke:rgba(255,255,255,.16);stroke-width:.5}
.vd-nah .vd-licht{opacity:.15}
.vd-h-steig{fill:#77808B}
.vd-h-steigkante{fill:none;stroke:#E2C27A;stroke-opacity:.9;stroke-width:.4}
.vd-h-schwelle{fill:none;stroke:#3A4149;stroke-width:3.4;stroke-dasharray:.7 1.5}
.vd-h-schiene{fill:none;stroke:#B4BCC5;stroke-width:.45}
.vd-h-gleis{fill:none;stroke:#9AA3AD;stroke-width:1.1;stroke-linecap:round}
.vd-h-halle{fill:rgba(175,188,202,.2);stroke:#C3CCD6;stroke-opacity:.85;stroke-width:.5}
.vd-h-rippe{fill:none;stroke:rgba(195,206,218,.55);stroke-width:.35}
.vd-h-kante{fill:none;stroke:rgba(255,255,255,.35);stroke-width:.3}
.vd-h-zaun{fill:rgba(120,150,180,.07);stroke:#7E8792;stroke-width:.4;stroke-dasharray:1 .7}
.vd-h-draht{fill:none;stroke:#9FC0DC;stroke-width:.4}
.vd-plan{fill:none;stroke:#8B939D;stroke-opacity:.75;stroke-width:calc(1.2px * var(--s));stroke-dasharray:calc(3px * var(--s)) calc(4px * var(--s));stroke-linecap:round}
.vd-plan-strom{stroke:#8FB6DA}
.vd-plan-ziel{stroke:#E2A63B;stroke-opacity:1;stroke-width:calc(1.6px * var(--s))}
.vd-bau-rest{fill:none;stroke:#E2A63B;stroke-opacity:.4;stroke-width:calc(1.2px * var(--s));stroke-dasharray:calc(3px * var(--s)) calc(4px * var(--s))}
.vd-bau-fertig{fill:none;stroke:#E2A63B;stroke-width:calc(2.2px * var(--s));stroke-linecap:round}
.vd-linie{fill:none;stroke:#E2A63B;stroke-width:calc(16px * var(--sn));stroke-opacity:.35;stroke-linecap:round;stroke-linejoin:round}
.vd-stadt{fill:#4F5761;stroke:#0A0C0F;stroke-width:calc(.8px * var(--s))}
.vd-stadt.vd-an{fill:#F3F5F7;stroke:#0A0C0F;stroke-width:calc(1.4px * var(--s))}
.vd-stadt.vd-an.vd-hs{fill:#0A0C0F;stroke:#F3F5F7;stroke-width:calc(1.8px * var(--s))}
.vd-stadt.vd-heimat{stroke:#E2A63B}
.vd-licht{fill:url(#vd-licht);opacity:0;transition:opacity 2.5s}
.vd-ist-nacht .vd-licht{opacity:.8}
.vd-label{font-family:var(--gz-titel);font-weight:600;fill:#DDE2E7;letter-spacing:calc(.3px * var(--s));paint-order:stroke;stroke:#0A0C0F;stroke-opacity:.92;stroke-width:calc(3px * var(--s));stroke-linejoin:round;font-size:calc(13px * var(--s))}
.vd-label.vd-aus{fill:#78818C;font-size:calc(11.5px * var(--s))}
.vd-label.vd-gross{font-size:calc(14.5px * var(--s));letter-spacing:calc(.4px * var(--s))}
.vd-nacht{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;background:#02040A;opacity:0;transition:opacity 3s}
.vd-zug{position:absolute;left:0;top:0;width:0;height:0;will-change:transform;cursor:pointer}
.vd-zug svg{position:absolute;top:-3px;height:6px;overflow:visible}
.vd-preis{position:absolute;left:0;top:0;will-change:transform}
.vd-preis-in{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 7px 0 5px;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.16);border-radius:4px;
 background:#15191E;color:#E6E9ED;font-family:var(--gz-titel);font-weight:600;font-size:13px;letter-spacing:.3px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;font-variant-numeric:tabular-nums}
.vd-preis-in .gz-i{width:13px;height:13px;color:#E2A63B}
.vd-preis-teuer .vd-preis-in{color:#6A727D}
.vd-preis-teuer .vd-preis-in .gz-i{color:#6A727D}
.vd-preis-ziel .vd-preis-in{border-color:#E2A63B}
.vd-kran{position:absolute;left:0;top:0}
.vd-kran-in{position:relative;transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;height:20px;padding:0 6px 0 4px;border:1px solid rgba(226,166,59,.5);border-radius:4px;background:#15191E;color:#E2A63B;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.vd-kran-in .gz-i{width:13px;height:13px}
.vd-kran-zeit{font-family:var(--gz-titel);font-weight:600;font-size:12.5px;letter-spacing:.3px;white-space:nowrap;font-variant-numeric:tabular-nums}
.vd-puls{position:absolute;left:0;top:0;pointer-events:none}
.vd-puls i{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:1.5px solid #E2A63B;animation:vd-puls 1.8s ease-out infinite}
.vd-puls i+i{display:none}
@keyframes vd-puls{0%{transform:scale(.45);opacity:1}100%{transform:scale(1.25);opacity:0}}
.vd-heim{position:absolute;left:0;top:0;pointer-events:none}
.vd-heim-in{position:absolute;left:-8px;top:-25px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:#E2A63B}
.vd-heim-in .gz-i{width:16px;height:16px}
`;
  function el(tag, attrs, eltern) {
    const e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if (eltern) eltern.appendChild(e);
    return e;
  }
  const px = c => { const p = K.staedte[c]; return [p[0] - VB[0], p[1] - VB[1]]; };   // Karten-Einheit -> Welt-Pixel

  function bauen(ziel, opt) {
    wurzel = ziel;
    tippFn = opt && opt.beiTipp;
    if (!document.getElementById('vd-karte-stil')) {
      const st = document.createElement('style'); st.id = 'vd-karte-stil'; st.textContent = STIL; document.head.appendChild(st);
    }
    karteEl = document.createElement('div'); karteEl.className = 'vd-karte';
    welt = document.createElement('div'); welt.className = 'vd-welt';
    welt.style.width = VB[2] + 'px'; welt.style.height = VB[3] + 'px';
    karteEl.appendChild(welt);
    nachtEl = document.createElement('div'); nachtEl.className = 'vd-nacht';
    wurzel.appendChild(karteEl); wurzel.appendChild(nachtEl);
    svg = el('svg', { class: 'vd-svg', width: VB[2], height: VB[3], viewBox: K.viewBox }, welt);
    svg.innerHTML = '<defs><radialGradient id="vd-licht"><stop offset="0" stop-color="#F3C877" stop-opacity=".7"/><stop offset=".35" stop-color="#E2A63B" stop-opacity=".25"/>' +
      '<stop offset="1" stop-color="#FF9A3C" stop-opacity="0"/></radialGradient></defs>';
    // Schatten unter dem Land (Tiefe), Gitter, Länder, Glut
    const alleLaender = Object.keys(K.laender).map(id => K.laender[id]).join('');
    el('path', { class: 'vd-schatten', d: alleLaender, transform: 'translate(1.5 2.5)' }, svg);
    let gitter = '';
    for (let lon = 6; lon <= 15; lon++) { const x = (lon - K.projektion.LON0) * K.projektion.KM * K.projektion.COS; gitter += 'M' + x.toFixed(1) + ' ' + VB[1] + 'V' + (VB[1] + VB[3]); }
    for (let lat = 47; lat <= 55; lat++) { const y = (K.projektion.LAT0 - lat) * K.projektion.KM; gitter += 'M' + VB[0] + ' ' + y.toFixed(1) + 'H' + (VB[0] + VB[2]); }
    el('path', { class: 'vd-gitter', d: gitter }, svg);
    const gGlut = el('g', null, svg), gLand = el('g', null, svg);
    Object.keys(K.laender).forEach(id => {
      const farbe = D.LAENDER[id].farbe;
      el('path', { class: 'vd-land-glut', d: K.laender[id], 'data-land': id, style: '--lf:' + farbe + ';display:none' }, gGlut);
      el('path', { class: 'vd-land', d: K.laender[id], 'data-land': id, style: '--lf:' + farbe }, gLand);
    });
    // Namen der Bundesländer (Platz aus dem Export-Werkzeug; Stadtstaaten tragen den Stadtnamen)
    const gNamen = el('g', null, svg);
    Object.keys(K.namenPlatz || {}).forEach(id => {
      const p = K.namenPlatz[id][0], teile = D.LAENDER[id].name.toUpperCase().replace(/-/g, '-\n').split('\n');
      const klein = id === 'SL' || id === 'TH';   // kleine Länder: kleinere Schrift
      const t = el('text', { class: 'vd-landname', x: p[0], y: p[1], 'data-land': id, style: '--lf:' + D.LAENDER[id].farbe + (klein ? ';font-size:calc(11.5px * var(--s))' : '') }, gNamen);
      teile.forEach((z, i) => { const ts = el('tspan', { x: p[0], dy: i ? '1.08em' : (0.35 - (teile.length - 1) * 0.54).toFixed(2) + 'em' }, t); ts.textContent = z; });
      t._teile = teile; t._px = klein ? 11.5 : 13;
      namenEl[id] = t;
    });
    const gNb = el('g', null, svg);
    K.nachbarn.forEach(n => { const t = el('text', { class: n[3] ? 'vd-meer' : 'vd-nachbar', x: n[1], y: n[2] }, gNb); t.textContent = n[0]; });
    gLinie = el('g', null, svg);
    gPlan = el('g', null, svg);
    gNetz = el('g', null, svg);
    gLinien = el('g', null, svg);
    gBau = el('g', null, svg);
    gHoefe = el('g', null, svg);
    gLichter = el('g', null, svg);
    gStaedte = el('g', null, svg);
    gLabels = el('g', null, svg);
    D.STAEDTE.forEach(s => {
      const p = K.staedte[s.id];
      el('circle', { class: 'vd-licht', cx: p[0], cy: p[1], r: 4 + Math.sqrt(s.einw / 1000) * 0.55, 'data-stadt': s.id, style: 'display:none' }, gLichter);
      el('circle', { class: 'vd-stadt', cx: p[0], cy: p[1], 'data-stadt': s.id, style: '--lf:' + D.LAENDER[s.land].farbe }, gStaedte);
      const t = el('text', { class: 'vd-label', x: p[0], y: p[1], 'data-stadt': s.id }, gLabels);
      t.textContent = s.name;
    });
    ebene = document.createElement('div'); ebene.className = 'vd-ebene';
    welt.appendChild(ebene);
    ebene.addEventListener('click', ebeneKlick);
    gesten();
    groesse();
    window.addEventListener('resize', groesse);
    document.addEventListener('click', geistKlick, true);
  }
  // Am Tablet folgt auf jeden Finger-Tipp noch ein Klick des Browsers an derselben Stelle. Der Tipp auf die Karte ist
  // schon über pointerup erledigt – der Nachzügler darf nichts treffen, was dadurch gerade erst erschienen ist.
  let geist = null;
  function geistKlick(e) {
    if (!geist) return;
    const g = geist; geist = null;
    if (performance.now() < g.bis && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 30) { e.stopPropagation(); e.preventDefault(); }
  }
  function abbauen() {
    window.removeEventListener('resize', groesse);
    document.removeEventListener('click', geistKlick, true);
    geist = null;
    Object.keys(zugEl).forEach(k => delete zugEl[k]);
    markiert = {};
    if (karteEl && karteEl.parentNode) karteEl.parentNode.removeChild(karteEl);
    if (nachtEl && nachtEl.parentNode) nachtEl.parentNode.removeChild(nachtEl);
    wurzel = karteEl = welt = svg = ebene = nachtEl = null;
  }
  function groesse() {
    if (!karteEl) return;
    vw = karteEl.clientWidth || window.innerWidth; vh = karteEl.clientHeight || window.innerHeight;
    cam.zMin = Math.min(vw / VB[2], vh / VB[3]) * 0.92;
    kameraSetzen();
  }

  // ------------------------------------------------------------------ Kamera
  function begrenzen() {
    cam.z = Math.max(cam.zMin, Math.min(cam.zMax, cam.z));
    const rx = vw / 2 / cam.z, ry = vh / 2 / cam.z;
    const x0 = VB[0], x1 = VB[0] + VB[2], y0 = VB[1], y1 = VB[1] + VB[3];
    cam.x = (x1 - x0) < 2 * rx ? (x0 + x1) / 2 : Math.max(x0 + rx * 0.6, Math.min(x1 - rx * 0.6, cam.x));
    cam.y = (y1 - y0) < 2 * ry ? (y0 + y1) / 2 : Math.max(y0 + ry * 0.6, Math.min(y1 - ry * 0.6, cam.y));
  }
  let letzteS = 0;
  function kameraSetzen() {
    if (!welt) return;
    begrenzen();
    const tx = vw / 2 - (cam.x - VB[0]) * cam.z, ty = vh / 2 - (cam.y - VB[1]) * cam.z;
    welt.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + cam.z.toFixed(4) + ')';
    const sn = netzSkala();
    if (Math.abs(sn - letzteSn) / sn > 0.04) {
      letzteSn = sn; svg.style.setProperty('--sn', sn.toFixed(5));
      clearTimeout(linienTimer); linienTimer = setTimeout(linienZeichnen, geste ? 90 : 0);
    }
    const nah = cam.z >= NAH;
    if (nah !== istNah) { istNah = nah; svg.classList.toggle('vd-nah', nah); clearTimeout(labelTimer); labelTimer = setTimeout(labelsSetzen, 30); }
    const s = 1 / cam.z;
    if (Math.abs(s - letzteS) / s > 0.03) {   // Striche/Schrift erst bei spürbarer Änderung anpassen (spart Neuzeichnen)
      letzteS = s;
      svg.style.setProperty('--s', s.toFixed(4));
      Object.keys(zugEl).forEach(uid => { zugEl[uid].skala = s; });
      clearTimeout(labelTimer);
      labelTimer = setTimeout(labelsSetzen, geste ? 220 : 30);
    }
  }
  /** Zoom-Knöpfe: um den Bildschirmpunkt (sx, sy) heran- oder herauszoomen */
  function zoomen(f, sx, sy) {
    if (!welt) return;
    if (sx == null) { sx = vw / 2; sy = vh / 2; }
    const z = Math.max(cam.zMin, Math.min(cam.zMax, cam.z * f));
    const p = zuKarte(sx, sy);
    const ziel = { x: p[0] - (sx - vw / 2) / z, y: p[1] - (sy - vh / 2) / z, z };
    schwung = null;
    if (G.weniger()) { cam.x = ziel.x; cam.y = ziel.y; cam.z = z; kameraSetzen(); return; }
    kamFlug = { von: { x: cam.x, y: cam.y, z: cam.z }, ziel, t0: performance.now(), dauer: 320 };
    welt.classList.add('vd-bewegt');
  }
  /** Bildschirm -> Karte */
  function zuKarte(sx, sy) { return [cam.x + (sx - vw / 2) / cam.z, cam.y + (sy - vh / 2) / cam.z]; }
  function zuSchirm(x, y) { return [vw / 2 + (x - cam.x) * cam.z, vh / 2 + (y - cam.y) * cam.z]; }
  /** Kamera weich zu Städten fahren (ids) oder zu einem Punkt; zoom optional */
  function zeige(ids, opt) {
    opt = opt || {};
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    ids.forEach(c => { const p = K.staedte[c]; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const rand = opt.rand || 70;
    let z = Math.min((vw - 2 * rand - (opt.rechts || 0)) / Math.max(40, x1 - x0), (vh - 2 * rand - (opt.unten || 0)) / Math.max(40, y1 - y0));
    if (opt.z) z = opt.z;
    z = Math.max(cam.zMin, Math.min(opt.zMax || 3.2, z));
    const ziel = { x: (x0 + x1) / 2 + (opt.rechts || 0) / 2 / z, y: (y0 + y1) / 2 + (opt.unten || 0) / 2 / z, z };
    if (opt.sofort || G.weniger()) { cam.x = ziel.x; cam.y = ziel.y; cam.z = ziel.z; kameraSetzen(); return; }
    kamFlug = { von: { x: cam.x, y: cam.y, z: cam.z }, ziel, t0: performance.now(), dauer: 650 };
    welt.classList.add('vd-bewegt');
  }
  function kamFlugSchritt(t) {
    if (!kamFlug) return;
    const u = Math.min(1, (t - kamFlug.t0) / kamFlug.dauer), e = 1 - Math.pow(1 - u, 3);
    const a = kamFlug.von, b = kamFlug.ziel;
    cam.x = a.x + (b.x - a.x) * e; cam.y = a.y + (b.y - a.y) * e; cam.z = a.z * Math.pow(b.z / a.z, e);
    kameraSetzen();
    if (u >= 1) { kamFlug = null; welt.classList.remove('vd-bewegt'); }
  }

  // ------------------------------------------------------------------ Gesten (Ziehen, Zwei-Finger-Zoom, Tippen, Mausrad)
  function gesten() {
    const zeiger = {};
    let start = null;
    karteEl.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('.vd-preis,.vd-zug,.vd-kran')) return;   // eigene Klicks
      karteEl.setPointerCapture && karteEl.setPointerCapture(e.pointerId);
      zeiger[e.pointerId] = { x: e.clientX, y: e.clientY };
      kamFlug = null; schwung = null;
      const ids = Object.keys(zeiger);
      const r = karteEl.getBoundingClientRect();
      if (ids.length === 1) start = { x: e.clientX, y: e.clientY, t: performance.now(), cx: cam.x, cy: cam.y, bewegt: false, r };
      if (ids.length === 2) {
        const a = zeiger[ids[0]], b = zeiger[ids[1]];
        geste = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.z, mitte: zuKarte((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top), r };
        if (start) start.bewegt = true;
      } else geste = { pan: true };
      welt.classList.add('vd-bewegt');
    });
    let letzte = [];
    karteEl.addEventListener('pointermove', e => {
      if (!zeiger[e.pointerId]) return;
      zeiger[e.pointerId] = { x: e.clientX, y: e.clientY };
      const ids = Object.keys(zeiger);
      if (ids.length >= 2 && geste && geste.d0) {
        const a = zeiger[ids[0]], b = zeiger[ids[1]], r = geste.r;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        cam.z = Math.max(cam.zMin, Math.min(cam.zMax, geste.z0 * d / Math.max(1, geste.d0)));
        // der Punkt unter der Fingermitte bleibt unter der Fingermitte
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        cam.x = geste.mitte[0] - (mx - vw / 2) / cam.z; cam.y = geste.mitte[1] - (my - vh / 2) / cam.z;
        kameraSetzen();
      } else if (start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!start.bewegt && Math.hypot(dx, dy) > 10) start.bewegt = true;
        if (start.bewegt) {
          cam.x = start.cx - dx / cam.z; cam.y = start.cy - dy / cam.z; kameraSetzen();
          letzte.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (letzte.length > 5) letzte.shift();
        }
      }
    });
    const ende = e => {
      if (!zeiger[e.pointerId]) return;
      delete zeiger[e.pointerId];
      const rest = Object.keys(zeiger).length;
      if (rest === 0) {
        if (start && !start.bewegt && performance.now() - start.t < 600) { geist = { x: e.clientX, y: e.clientY, bis: performance.now() + 700 }; tippen(e.clientX - start.r.left, e.clientY - start.r.top); }
        else if (start && letzte.length >= 2 && !(geste && geste.d0)) {
          const a = letzte[0], b = letzte[letzte.length - 1], dt = Math.max(16, b.t - a.t);
          const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
          if (Math.hypot(vx, vy) > 0.25 && !G.weniger()) schwung = { vx, vy, t: performance.now() };
        }
        start = null; geste = null; letzte = [];
        if (!schwung) welt.classList.remove('vd-bewegt');
        clearTimeout(labelTimer); labelTimer = setTimeout(labelsSetzen, 60);
      } else if (rest === 1) {
        // von zwei auf einen Finger: neu ansetzen, ohne Sprung
        const id = Object.keys(zeiger)[0];
        start = { x: zeiger[id].x, y: zeiger[id].y, t: 0, cx: cam.x, cy: cam.y, bewegt: true, r: karteEl.getBoundingClientRect() };
        geste = { pan: true };
      }
    };
    karteEl.addEventListener('pointerup', ende);
    karteEl.addEventListener('pointercancel', ende);
    karteEl.addEventListener('wheel', e => {
      e.preventDefault();
      const r = karteEl.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const p = zuKarte(mx, my);
      cam.z = Math.max(cam.zMin, Math.min(cam.zMax, cam.z * Math.exp(-e.deltaY * 0.0015)));
      cam.x = p[0] - (mx - vw / 2) / cam.z; cam.y = p[1] - (my - vh / 2) / cam.z;
      kameraSetzen();
    }, { passive: false });
  }
  function schwungSchritt(t) {
    if (!schwung) return;
    const dt = Math.min(40, t - schwung.t); schwung.t = t;
    cam.x -= schwung.vx * dt / cam.z; cam.y -= schwung.vy * dt / cam.z;
    schwung.vx *= Math.pow(0.92, dt / 16); schwung.vy *= Math.pow(0.92, dt / 16);
    kameraSetzen();
    if (Math.hypot(schwung.vx, schwung.vy) < 0.02) { schwung = null; welt.classList.remove('vd-bewegt'); }
  }
  function abstandStrecke(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const u = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  }
  function tippen(sx, sy) {
    if (!tippFn) return;
    const p = zuKarte(sx, sy), radius = 30 / cam.z;
    // Stadt?
    let best = null, bd = radius;
    const S = M.zustand();
    D.STAEDTE.forEach(s => {
      const q = K.staedte[s.id], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const r = istNah && S && S.bahnhoefe[s.id] ? Math.max(radius, 5) : radius;
      if (d < r && d < bd + (r - radius)) { bd = d; best = s.id; }
    });
    if (modus === 'bauen') {
      // im Baumodus zählen Strecken, die man treffen kann, mehr als Städte daneben
      let kb = null, kd = 22 / cam.z;
      M.baubar().forEach(k => { const d = abstandStrecke(p, K.staedte[k.a], K.staedte[k.b]); if (d < kd) { kd = d; kb = k; } });
      if (kb && (!best || kd < bd * 0.6)) { tippFn({ art: 'kante', kante: kb }); return; }
    }
    if (best) { tippFn({ art: 'stadt', id: best }); return; }
    // fertige Strecke? (Name, Oberleitung nachrüsten)
    if (S && modus !== 'bauen') {
      let sb = null, sd = 16 / cam.z;
      Object.keys(S.strecken).forEach(k => { const s = S.strecken[k]; if (!s.fertig) return; const d = abstandStrecke(p, K.staedte[s.a], K.staedte[s.b]); if (d < sd) { sd = d; sb = s; } });
      if (sb) { tippFn({ art: 'strecke', a: sb.a, b: sb.b }); return; }
    }
    tippFn({ art: 'leer', x: p[0], y: p[1] });
  }
  function ebeneKlick(e) {
    const z = e.target.closest('[data-uid]'), pr = e.target.closest('[data-kante]'), kr = e.target.closest('[data-bau]');
    if (z && tippFn) tippFn({ art: 'zug', uid: +z.getAttribute('data-uid') });
    else if (pr && tippFn) { const k = M.baubar().find(x => x.id === pr.getAttribute('data-kante')); if (k) tippFn({ art: 'kante', kante: k }); }
    else if (kr && tippFn) tippFn({ art: 'baustelle', id: kr.getAttribute('data-bau') });
  }

  // ------------------------------------------------------------------ Netz zeichnen (bei Änderungen)
  function linienPfad(a, b) { const p = K.staedte[a], q = K.staedte[b]; return 'M' + p[0] + ' ' + p[1] + 'L' + q[0] + ' ' + q[1]; }
  function zeichneNetz() {
    if (!svg) return;
    const S = M.zustand();
    // Länder
    svg.querySelectorAll('.vd-land').forEach(p => { p.classList.toggle('vd-an', !!S.laender[p.getAttribute('data-land')]); });
    svg.querySelectorAll('.vd-land-glut').forEach(p => { p.style.display = S.laender[p.getAttribute('data-land')] ? '' : 'none'; });
    svg.querySelectorAll('.vd-landname').forEach(p => { p.classList.toggle('vd-an', !!S.laender[p.getAttribute('data-land')]); });
    // fertige Strecken: Bett, Schwellen, Schiene (je ein Pfad für alle – wenig DOM); mit Oberleitung bläulich
    let d = '', ds = '';
    Object.keys(S.strecken).forEach(k => { const s = S.strecken[k]; if (!s.fertig) return; const p = linienPfad(s.a, s.b); d += p; if (M.strom(s.a, s.b)) ds += p; });
    gNetz.innerHTML = '';
    if (d) { el('path', { class: 'vd-bett', d }, gNetz); el('path', { class: 'vd-schwelle', d }, gNetz); el('path', { class: 'vd-schiene', d }, gNetz); }
    if (ds) el('path', { class: 'vd-schiene vd-schiene-strom', d: ds }, gNetz);
    linienZeichnen();
    hoefeZeichnen();
    // Baustellen
    gBau.innerHTML = '';
    ebene.querySelectorAll('.vd-kran').forEach(k => k.parentNode.removeChild(k));
    M.baustellen().forEach(k => {
      const s = S.strecken[k];
      el('path', { class: 'vd-bau-rest', d: linienPfad(s.a, s.b) }, gBau);
      el('path', { class: 'vd-bau-fertig', d: linienPfad(s.a, s.b), 'data-bau': k, pathLength: 100, 'stroke-dasharray': '0 100' }, gBau);
      const pa = px(s.a), pb = px(s.b);
      const kr = document.createElement('div');
      kr.className = 'vd-kran'; kr.setAttribute('data-bau', k);
      kr.innerHTML = '<div class="vd-kran-in">' + G.icon('kran', 13) + '<span class="vd-kran-zeit">…</span></div>';
      kr.style.transform = 'translate(' + ((pa[0] + pb[0]) / 2).toFixed(1) + 'px,' + ((pa[1] + pb[1]) / 2).toFixed(1) + 'px) scale(' + (1 / cam.z).toFixed(3) + ')';
      kr._pos = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      ebene.appendChild(kr);
    });
    // Städte
    gStaedte.querySelectorAll('.vd-stadt').forEach(c => {
      const id = c.getAttribute('data-stadt'), an = !!S.bahnhoefe[id], hs = D.LAENDER[D.STADT[id].land].hauptstadt === id;
      c.classList.toggle('vd-an', an); c.classList.toggle('vd-hs', hs);
      const st = an ? S.bahnhoefe[id].stufe : 0;
      c._px = an ? (3 + st * 0.45 + (hs ? 0.6 : 0)) : (hs ? 2.3 : 1.9);
      c.classList.toggle('vd-heimat', id === S.heimat);
    });
    gLichter.querySelectorAll('.vd-licht').forEach(c => { c.style.display = S.bahnhoefe[c.getAttribute('data-stadt')] ? '' : 'none'; });
    // Heimat-Häuschen
    let heim = ebene.querySelector('.vd-heim');
    if (!heim) { heim = document.createElement('div'); heim.className = 'vd-heim'; heim.innerHTML = '<div class="vd-heim-in">' + G.icon('bahnhof', 16) + '</div>'; ebene.appendChild(heim); }
    const hp = px(S.heimat); heim._pos = hp;
    planZeichnen();
    labelsSetzen();
  }
  /** Linien wie auf einem Netzplan: jede Linie (= ein Zug) ein farbiges Band, mehrere auf einer Strecke nebeneinander.
   *  Hängt vom Zoom ab (Abstand der Bänder in Bildschirm-px) – deshalb neu, wenn sich der Zoom spürbar ändert. */
  function linienZeichnen() {
    if (!gLinien || !svg) return;
    const S = M.zustand(); if (!S) return;
    const sn = netzSkala(), P = 4.4 * sn;
    const auf = {};
    const loks = S.loks.filter(l => l.linie).sort((a, b) => ((a.f || 0) - (b.f || 0)) || (a.uid - b.uid));
    loks.forEach(l => { const w = l.linie.weg; for (let i = 1; i < w.length; i++) { const k = M.schl(w[i - 1], w[i]); (auf[k] = auf[k] || []).push(l.uid); } });
    Object.keys(stationN).forEach(c => delete stationN[c]);
    let html = '';
    const f2 = n => n.toFixed(2);
    Object.keys(auf).forEach(k => {
      const ab = k.split('|'), n = auf[k].length;
      ab.forEach(c => { stationN[c] = Math.max(stationN[c] || 0, n); });
      html += '<path class="vd-band-unter" d="' + linienPfad(ab[0], ab[1]) + '" style="stroke-width:' + (n * P + 2.4 * sn).toFixed(3) + '"/>';
    });
    loks.forEach(l => {
      const w = l.linie.weg, off = [];
      for (let i = 1; i < w.length; i++) {
        const k = M.schl(w[i - 1], w[i]), ab = k.split('|');
        const pa = K.staedte[ab[0]], pb = K.staedte[ab[1]], dx = pb[0] - pa[0], dy = pb[1] - pa[1], L = Math.hypot(dx, dy) || 1;
        const liste = auf[k], o = (liste.indexOf(l.uid) - (liste.length - 1) / 2) * P;
        off.push([-dy / L * o, dx / L * o]);
      }
      const pts = w.map((c, i) => {
        const p = K.staedte[c], o1 = off[i - 1], o2 = off[i];
        const o = o1 && o2 ? [(o1[0] + o2[0]) / 2, (o1[1] + o2[1]) / 2] : (o1 || o2 || [0, 0]);
        return [p[0] + o[0], p[1] + o[1]];
      });
      band[l.uid] = pts;
      html += '<path class="vd-band" d="M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + '" style="stroke:' + FARBEN[(l.f || 0) % FARBEN.length] + '"/>';
    });
    Object.keys(band).forEach(uid => { if (!loks.some(l => l.uid === +uid)) delete band[uid]; });
    Object.keys(bandGeo).forEach(k => delete bandGeo[k]);
    // Oberleitung: Mastreihe quer über das ganze Bündel
    Object.keys(S.strecken).forEach(k => {
      const s = S.strecken[k];
      if (!s.fertig || !M.strom(s.a, s.b)) return;
      html += '<path class="vd-mast" d="' + linienPfad(s.a, s.b) + '" style="stroke-width:' + (Math.max(1, (auf[k] || []).length) * P + 5 * sn).toFixed(3) + '"/>';
    });
    gLinien.innerHTML = html;
  }

  // ------------------------------------------------------------------ Bahnhöfe in der Nahansicht (Gleisplan + Gebäude)
  const HOF_K = 0.085;        // Karten-Einheiten je Zeichen-Einheit
  function hofWinkel(c) {
    const r = [];
    M.NACH[c].forEach(({ n }) => { if (M.streckeFertig(c, n)) { const p = K.staedte[c], q = K.staedte[n]; r.push(Math.atan2(q[1] - p[1], q[0] - p[0])); } });
    if (!r.length) return 0;
    let best = r[0], bw = -1;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { let d = Math.abs(r[i] - r[j]); if (d > Math.PI) d = 2 * Math.PI - d; if (d > bw) { bw = d; best = r[i]; } }
    let g = best * 180 / Math.PI;
    if (g > 90) g -= 180; if (g < -90) g += 180;
    return g;
  }
  function haus(x, y, w, h, hell, dunkel) {
    // Satteldach von oben: First entlang der langen Seite, Licht von oben links
    let s = '<rect x="' + (x + 0.9) + '" y="' + (y + 1.3) + '" width="' + w + '" height="' + h + '" fill="#000" opacity=".45"/>';
    if (w >= h) s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (h / 2) + '" fill="' + hell + '"/><rect x="' + x + '" y="' + (y + h / 2) + '" width="' + w + '" height="' + (h / 2) + '" fill="' + dunkel + '"/>';
    else s += '<rect x="' + x + '" y="' + y + '" width="' + (w / 2) + '" height="' + h + '" fill="' + hell + '"/><rect x="' + (x + w / 2) + '" y="' + y + '" width="' + (w / 2) + '" height="' + h + '" fill="' + dunkel + '"/>';
    return s + '<rect class="vd-h-kante" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
  }
  function hofSvg(c, b) {
    const st = b.stufe || 1, g = b.geb || {};
    const gleise = st >= 3 ? [0, 10, 20, 30] : st === 2 ? [0, 10] : [0];
    const yL = gleise[gleise.length - 1], yF = yL + 9;
    let s = '<rect class="vd-h-platte" x="-58" y="-31" width="116" height="' + (yF + (g.betriebswerk ? 42 : g.gueterhalle ? 20 : 4) + 31) + '" rx="5"/>';
    gleise.forEach(y => { s += '<path class="vd-h-schwelle" d="M-56 ' + y + 'H56"/><path class="vd-h-schiene" d="M-56 ' + (y - 1.1) + 'H56M-56 ' + (y + 1.1) + 'H56"/>'; });
    gleise.slice(1).forEach(y => { s += '<path class="vd-h-gleis" d="M-52 0L-38 ' + y + 'M52 0L38 ' + y + '"/>'; });
    const steig = (y0, y1, x0, x1) => '<rect class="vd-h-steig" x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" rx=".6"/>' +
      '<path class="vd-h-steigkante" d="M' + x0 + ' ' + (y0 + .5) + 'H' + x1 + 'M' + x0 + ' ' + (y1 - .5) + 'H' + x1 + '"/>';
    s += steig(-7, -3, -30, 30);
    if (st >= 2) s += steig(3.5, 6.5, -28, 28);
    if (st >= 3) s += steig(23.5, 26.5, -28, 28);
    if (st >= 3) {
      let r = ''; for (let x = -27; x <= 27; x += 6) r += 'M' + x + ' -3V33';
      s += '<rect class="vd-h-halle" x="-30" y="-3" width="60" height="36" rx="2"/><path class="vd-h-rippe" d="' + r + 'M-30 15H30"/>';
    }
    // Empfangsgebäude
    if (st >= 3) s += haus(-28, -22, 56, 13, '#8A6F5C', '#6E5747') + haus(-9, -28, 18, 19, '#9AA3AD', '#7B848E') + '<path class="vd-h-rippe" d="M-9 -18.5H9M-4.5 -28V-9M4.5 -28V-9"/>' +
      haus(-30, -25, 6, 6, '#9AA3AD', '#7B848E') + haus(24, -25, 6, 6, '#9AA3AD', '#7B848E');
    else if (st === 2) s += haus(-20, -19, 40, 10, '#8A6F5C', '#6E5747') + haus(-6, -23, 12, 14, '#9AA3AD', '#7B848E') + '<rect x="-1.6" y="-25.5" width="3.2" height="3.2" fill="#262B31" stroke="#C9B37A" stroke-width=".35"/>';
    else s += haus(-9, -16, 18, 8, '#8A6F5C', '#6E5747');
    const xr = st >= 3 ? 31 : st === 2 ? 23 : 12;
    if (g.gaststaette) {
      s += haus(xr, -19, 12, 9, '#A0573F', '#7F4532');
      for (let i = 0; i < 3; i++) s += '<circle cx="' + (xr + 2.5 + i * 3.5) + '" cy="-22" r="1.2" fill="#C9A46A" stroke="#1A1D21" stroke-width=".3"/>';
    }
    if (g.stellwerk) s += haus(42, -13, 7, 7, '#9AA3AD', '#7B848E') + '<rect x="43.2" y="-11.8" width="4.6" height="4.6" fill="none" stroke="#9DC0DE" stroke-width=".55"/>' +
      '<circle cx="51" cy="-5.5" r=".9" fill="#3FB37F"/><circle cx="53" cy="-5.5" r=".9" fill="#E5534B" opacity=".5"/>';
    if (g.gueterhalle) {
      s += '<path class="vd-h-gleis" d="M-56 ' + yL + 'L-46 ' + (yF - 3.5) + 'H-10"/>';
      s += '<rect x="-46" y="' + (yF - 1.4) + '" width="34" height="1.4" fill="#6B6359"/>' + haus(-46, yF, 34, 10, '#8E8578', '#716A5F');
      for (let i = 0; i < 4; i++) s += '<rect x="' + (-44 + i * 3.2) + '" y="' + (yF + 12) + '" width="2.6" height="2.6" fill="#8A6A44" stroke="#1A1D21" stroke-width=".3"/>';
    }
    if (g.betriebswerk) {
      const cx = 42, cy = yF + 16, ri = 9.5, ra = 19;
      const pt = (r, a) => (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
      const a0 = 25 * Math.PI / 180, a1 = 155 * Math.PI / 180;
      s += '<path class="vd-h-gleis" d="M30 ' + yL + 'L' + cx + ' ' + (cy - 6.5) + '"/>';
      s += '<path d="M' + pt(ra, a0) + 'A' + ra + ' ' + ra + ' 0 0 1 ' + pt(ra, a1) + 'L' + pt(ri, a1) + 'A' + ri + ' ' + ri + ' 0 0 0 ' + pt(ri, a0) + 'Z" fill="#8A6F5C" stroke="rgba(255,255,255,.3)" stroke-width=".3"/>';
      let st2 = ''; for (let a = a0; a <= a1 + 1e-6; a += (a1 - a0) / 9) st2 += 'M' + pt(ri, a) + 'L' + pt(ra, a);
      s += '<path d="' + st2 + '" stroke="#5B4838" stroke-width=".5"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="#22272D" stroke="#7E8792" stroke-width=".45"/><path d="M' + (cx - 6.3) + ' ' + cy + 'H' + (cx + 6.3) + '" stroke="#A9B0B8" stroke-width="1.3"/>';
    }
    return s;
  }
  function hoefeZeichnen() {
    if (!gHoefe) return;
    const S = M.zustand(); if (!S) return;
    let html = '';
    Object.keys(S.bahnhoefe).forEach(c => {
      const p = K.staedte[c];
      html += '<g class="vd-hof" transform="translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ') rotate(' + hofWinkel(c).toFixed(1) + ') scale(' + HOF_K + ')">' + hofSvg(c, S.bahnhoefe[c]) + '</g>';
    });
    gHoefe.innerHTML = html;
  }
  /** Baumodus: mögliche Strecken gestrichelt + Preisschilder */
  function planZeichnen() {
    gPlan.innerHTML = '';
    ebene.querySelectorAll('.vd-preis').forEach(k => k.parentNode.removeChild(k));
    if (modus !== 'bauen') return;
    const S = M.zustand(), ziele = (modusDaten && modusDaten.ziele) || {};
    M.baubar().forEach(k => {
      el('path', { class: 'vd-plan' + (ziele[k.a] || ziele[k.b] ? ' vd-plan-ziel' : '') + (k.strom ? ' vd-plan-strom' : ''), d: linienPfad(k.a, k.b) }, gPlan);
      const pa = px(k.a), pb = px(k.b);
      const p = document.createElement('div');
      p.className = 'vd-preis' + (k.preis > S.taler ? ' vd-preis-teuer' : '') + (ziele[k.a] || ziele[k.b] ? ' vd-preis-ziel' : '');
      p.setAttribute('data-kante', k.id);
      const text = k.preis === 0 ? 'gratis' : M.geld(k.preis);
      p.innerHTML = '<div class="vd-preis-in">' + G.icon('muenze', 13) + text + '</div>';
      p._pos = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      // Vorrang: Auftragsziel, dann bezahlbar (billig zuerst), dann der Rest – bei Platzmangel bleiben nur die wichtigen Schilder
      p._rang = (ziele[k.a] || ziele[k.b] ? 0 : k.preis <= S.taler ? 1e6 : 2e6) + k.preis;
      p._breite = 30 + text.length * 8;
      ebene.appendChild(p);
    });
    skalierteSetzen();
  }
  /** Linie hervorheben (Weg-Liste) */
  function linieZeigen(weg) {
    gLinie.innerHTML = '';
    if (!weg || weg.length < 2) return;
    el('path', { class: 'vd-linie', d: 'M' + weg.map(c => K.staedte[c].join(' ')).join('L') }, gLinie);
  }
  /** Städte pulsieren lassen (ids) */
  function markieren(ids) {
    markiert = {};
    ebene.querySelectorAll('.vd-puls').forEach(k => k.parentNode.removeChild(k));
    (ids || []).forEach(c => {
      const p = document.createElement('div'); p.className = 'vd-puls'; p.innerHTML = '<i></i><i></i>';
      p._pos = px(c); ebene.appendChild(p); markiert[c] = 1;
    });
    labelsSetzen();
  }
  /** Elemente in der Ebene, die ihre Bildschirmgröße behalten (Preisschilder, Kräne, Puls, Heimat) */
  function skalierteSetzen() {
    if (!ebene) return;
    const s = (1 / cam.z).toFixed(4);
    ebene.querySelectorAll('.vd-preis,.vd-kran,.vd-puls,.vd-heim').forEach(e => {
      if (e._pos) e.style.transform = 'translate(' + e._pos[0].toFixed(1) + 'px,' + e._pos[1].toFixed(1) + 'px) scale(' + s + ')';
    });
  }

  // ------------------------------------------------------------------ Beschriftung ohne Überlappung
  /** Preisschilder im Baumodus: höchstens 14, keine Überlappung (in Bildschirm-Pixeln, daher nach jedem Zoom neu) */
  function preiseOrdnen() {
    const s = 1 / cam.z, boxen = [];
    preisBoxen = boxen;
    const liste = [].slice.call(ebene.querySelectorAll('.vd-preis')).sort((a, b) => a._rang - b._rang);
    let n = 0;
    liste.forEach(p => {
      const w = p._breite * s / 2 + 4 * s, h = 15 * s;
      const b = [p._pos[0] - w, p._pos[1] - h, p._pos[0] + w, p._pos[1] + h];
      const frei = n < 14 && boxen.every(o => b[0] > o[2] || b[2] < o[0] || b[1] > o[3] || b[3] < o[1]);
      p.style.display = frei ? '' : 'none';
      if (frei) { boxen.push(b); n++; }
    });
  }
  function labelsSetzen() {
    if (!svg) return;
    skalierteSetzen();
    preiseOrdnen();
    const S = M.zustand(), s = 1 / cam.z;
    const liste = D.STAEDTE.map(c => {
      const an = !!(S && S.bahnhoefe[c.id]), hs = D.LAENDER[c.land].hauptstadt === c.id;
      const wichtig = (an ? 1e7 : 0) + (hs ? 5e6 : 0) + c.einw + (markiert[c.id] ? 1e8 : 0) + (S && c.id === S.heimat ? 2e8 : 0);
      return { c, an, hs, wichtig };
    });
    // Ländernamen: nach den Bahnhöfen und Hauptstädten, vor den übrigen Städten
    Object.keys(namenEl).forEach(id => liste.push({ land: id, wichtig: 4.9e6 }));
    liste.sort((a, b) => b.wichtig - a.wichtig);
    const boxen = modus === 'bauen' ? preisBoxen.slice() : [];
    const frei = b => boxen.every(o => b[0] > o[2] || b[2] < o[0] || b[1] > o[3] || b[3] < o[1]);
    // Punkte selbst freihalten (Radius in Karten-Einheiten wächst mit dem Bahnhof, mindestens 4 Bildschirm-px)
    const radius = {};
    const sn = netzSkala();
    gStaedte.querySelectorAll('.vd-stadt').forEach(k => {
      const id = k.getAttribute('data-stadt'), an = !!(S && S.bahnhoefe[id]);
      let r = Math.max((k._px || 1.9) * s, an && stationN[id] ? (stationN[id] * 2.2 + 1.4) * sn : 0);
      if (an && istNah) r = Math.max(r, 5.4);
      if (k._r !== r) { k._r = r; k.setAttribute('r', r.toFixed(2)); }
      radius[k.getAttribute('data-stadt')] = r;
    });
    const marke = id => radius[id] + 1.5 * s;
    D.STAEDTE.forEach(c => { const p = K.staedte[c.id], m = marke(c.id); boxen.push([p[0] - m, p[1] - m, p[0] + m, p[1] + m]); });
    if (S && S.heimat) { const p = K.staedte[S.heimat]; boxen.push([p[0] - 9 * s, p[1] - 26 * s, p[0] + 9 * s, p[1] - 7 * s]); }   // Heimat-Symbol
    const sichtbar = {};
    liste.forEach(({ c, an, hs, land }) => {
      if (land) { landNameSetzen(land, s, frei, boxen); return; }
      const t = gLabels.querySelector('[data-stadt="' + c.id + '"]');
      const gross = hs || c.einw > 500000;
      const fs = (an && gross ? 17 : an ? 15 : 13) * s;
      // Unverbundene kleine Städte erst beim Hineinzoomen
      if (!an && !markiert[c.id] && !(modus === 'bauen') && cam.z < 1.6 && !hs && c.einw < 400000) { t.style.display = 'none'; return; }
      const w = c.name.length * fs * 0.56, h = fs;
      const p = K.staedte[c.id], m = marke(c.id), abst = m + 2 * s;
      const versuche = [[p[0] + abst, p[1] + h * 0.35, 'start'], [p[0] - abst, p[1] + h * 0.35, 'end'],
        [p[0], p[1] - m - 2 * s - h * 0.21, 'middle'], [p[0], p[1] + m + 2 * s + h * 0.86, 'middle']];
      let platz = null;
      for (const v of versuche) {
        const x0 = v[2] === 'start' ? v[0] : v[2] === 'end' ? v[0] - w : v[0] - w / 2;
        const b = [x0, v[1] - h * 0.85, x0 + w, v[1] + h * 0.2];
        if (frei(b)) { platz = v; boxen.push(b); break; }
      }
      if (!platz) { t.style.display = 'none'; return; }
      t.style.display = '';
      t.setAttribute('x', platz[0].toFixed(1)); t.setAttribute('y', platz[1].toFixed(1)); t.setAttribute('text-anchor', platz[2]);
      t.setAttribute('class', 'vd-label' + (an || markiert[c.id] ? (gross ? ' vd-gross' : '') : ' vd-aus'));
      sichtbar[c.id] = 1;
    });
  }

  /** Ländername an den ersten Kandidaten-Platz, der beim aktuellen Zoom ins Land passt und frei ist – sonst ausblenden */
  function landNameSetzen(id, s, frei, boxen) {
    const t = namenEl[id], fs = t._px * s;
    const breit = Math.max.apply(null, t._teile.map(z => z.length));
    const w = breit * fs * 0.6 + (breit - 1) * 3.5 * s, h = t._teile.length * fs * 1.08;
    const kand = K.namenPlatz[id];
    for (let i = 0; i < kand.length; i++) {
      const k = kand[i];
      if (w / 2 > k[2] * 1.5 || h / 2 > k[2]) continue;       // passt nicht ins Land
      const b = [k[0] - w / 2, k[1] - h / 2, k[0] + w / 2, k[1] + h / 2];
      if (!frei(b)) continue;
      boxen.push(b);
      if (t.getAttribute('x') !== String(k[0])) { t.setAttribute('x', k[0]); t.setAttribute('y', k[1]); [].forEach.call(t.childNodes, ts => ts.setAttribute('x', k[0])); }
      t.style.display = '';
      return;
    }
    t.style.display = 'none';
  }

  // ------------------------------------------------------------------ Modi
  function modusSetzen(m, daten) {
    modus = m; modusDaten = daten || null;
    // Heimat-Wahl (erster Start, noch kein Spielstand): nur das eine Land leuchtet
    if (m === 'heimat' && svg) {
      const land = daten && daten.land;
      svg.querySelectorAll('.vd-land').forEach(p => { p.classList.toggle('vd-an', p.getAttribute('data-land') === land); });
      svg.querySelectorAll('.vd-land-glut').forEach(p => { p.style.display = p.getAttribute('data-land') === land ? '' : 'none'; });
      svg.querySelectorAll('.vd-landname').forEach(p => { p.classList.toggle('vd-an', p.getAttribute('data-land') === land); });
    }
    planZeichnen();
    labelsSetzen();
    if (m !== 'linie') linieZeigen(null);
  }

  // ------------------------------------------------------------------ Züge
  // Züge von oben (Draufsicht, volldampf-draufsicht.js): Lok/Triebkopf + Wagen, einzeln entlang des Linienbands gesetzt
  // (fahren durch Kurven). Jedes Fahrzeug wird nur einmal als <g> in einem unsichtbaren <defs> abgelegt und per <use>
  // eingesetzt – so bleibt die Seite auch mit vielen langen Zügen leicht. Nah: ganzer Zug, Übersicht: Spitze + Ende.
  let defsSvg = null, defsNr = 0;
  const defsId = {};
  function teilId(t) {
    if (!defsSvg || !defsSvg.isConnected) {
      defsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      defsSvg.setAttribute('width', '0'); defsSvg.setAttribute('height', '0'); defsSvg.setAttribute('aria-hidden', 'true');
      defsSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      defsSvg.innerHTML = '<defs></defs>';
      document.body.appendChild(defsSvg);
      Object.keys(defsId).forEach(k => { delete defsId[k]; });
    }
    if (!defsId[t.key]) {
      const id = 'vdz' + (++defsNr);
      defsSvg.firstChild.insertAdjacentHTML('beforeend', '<g id="' + id + '">' + t.svg + '</g>');
      defsId[t.key] = id;
    }
    return defsId[t.key];
  }
  function teilSvg(t) {
    const id = teilId(t), h = t.len / 2;
    return '<svg viewBox="' + (-h).toFixed(2) + ' -3 ' + t.len.toFixed(2) + ' 6" style="left:' + (-h).toFixed(2) + 'px;width:' + t.len.toFixed(2) + 'px">' +
      '<use href="#' + id + '" xlink:href="#' + id + '" x="' + (-h).toFixed(2) + '"/></svg>';
  }
  /** Fahrzeuge, die auf die Strecke passen (platz in Zug-Einheiten): Mittelwagen fallen weg, Spitze, Tender und Zugende bleiben */
  function passend(voll, platz) {
    const tl = voll.slice();
    const ende = tl.length > 1 && /^(schluss|steuer)$/.test(tl[tl.length - 1].art);
    const laenge = () => tl.reduce((a, t) => a + t.len + 0.6, -0.6);
    while (laenge() > platz) {
      const frei = [];
      tl.forEach((t, i) => { if (i > 0 && t.art !== 'tender' && !(ende && i === tl.length - 1)) frei.push(i); });
      if (frei.length <= (ende ? 0 : 1)) break;
      tl.splice(frei[Math.floor(frei.length / 2)], 1);
    }
    return tl;
  }
  function zugAnlegen(l, platz) {
    const L = D.LOK[l.id];
    const voll = VolldampfDraufsicht.teile(L, istNah), tl = passend(voll, platz);
    const el = tl.map((t, i) => {
      const e = document.createElement('div'); e.className = i ? 'vd-zug vd-wagen' : 'vd-zug'; e.setAttribute('data-uid', l.uid);
      e.innerHTML = teilSvg(t); return e;
    });
    el.slice(1).forEach(e => ebene.appendChild(e));
    ebene.appendChild(el[0]);
    const laengen = tl.slice(1).map(t => t.len);
    // Schornstein sitzt etwa 3,4 Einheiten hinter der Spitze der Lok (Dampfwolken)
    zugEl[l.uid] = { kopf: el[0], kopfLen: tl[0].len, wagen: el.slice(1), laengen, ges: tl[0].len + laengen.reduce((a, b) => a + b + 0.6, 0),
      letzterPuff: 0, dampf: L.antrieb === 'dampf', id: l.id, nah: istNah, voll, anzahl: tl.length, platz };
    return zugEl[l.uid];
  }
  function zugEntfernen(uid) {
    const z = zugEl[uid]; if (!z) return;
    [z.kopf].concat(z.wagen).forEach(e => { if (e.parentNode) e.parentNode.removeChild(e); });
    delete zugEl[uid];
  }
  // Punkt auf dem Weg in Abstand d vom Anfang (Welt-Pixel); vor dem Anfang geht es geradeaus rückwärts weiter
  function aufWeg(pts, len, d) {
    let i = 0;
    if (d <= 0) {
      const a = pts[0], b = pts[1], l0 = len[0] || 1, ux = (b[0] - a[0]) / l0, uy = (b[1] - a[1]) / l0;
      return { x: a[0] + ux * d, y: a[1] + uy * d, w: Math.atan2(uy, ux) };
    }
    while (i < len.length - 1 && d > len[i]) { d -= len[i]; i++; }
    const a = pts[i], b = pts[i + 1], u = len[i] ? Math.min(1, d / len[i]) : 0;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, w: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  /** Geometrie des eigenen Linienbands (Welt-Pixel), vorwärts = in Richtung linie.weg */
  function zugGeometrie(l, vorwaerts) {
    const key = l.uid + (vorwaerts ? '>' : '<');
    if (bandGeo[key]) return bandGeo[key];
    const roh = band[l.uid] || l.linie.weg.map(c => K.staedte[c]);
    let pts = roh.map(p => [p[0] - VB[0], p[1] - VB[1]]);
    if (!vorwaerts) pts = pts.slice().reverse();
    const len = []; let ges = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(d); ges += d; }
    return (bandGeo[key] = { pts, len, ges });
  }
  function setze(e, x, y, w, s) { e.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + (w * 180 / Math.PI).toFixed(1) + 'deg) scale(' + s.toFixed(4) + ')'; }
  function zuegeZeichnen(jetzt, tMs) {
    const S = M.zustand();
    const da = {};
    const s = netzSkala();
    const volldampf = jetzt < S.volldampf.bis;
    S.loks.forEach(l => {
      if (!l.linie || l.status === 'werkstatt') return;   // in der Werkstatt: nicht auf der Karte
      da[l.uid] = 1;
      const geo = l.status === 'faehrt' ? zugGeometrie(l, l.fahrt.weg[0] === l.linie.weg[0]) : zugGeometrie(l, l.ort === l.linie.von);
      const platz = geo.ges * 0.5 / s;   // höchstens halbe Strecke lang, damit man ihn fahren sieht
      let z = zugEl[l.uid];
      if (z && (z.id !== l.id || z.nah !== istNah)) z = null;
      else if (z && Math.abs(platz - z.platz) > 0.5) { if (passend(z.voll, platz).length !== z.anzahl) z = null; else z.platz = platz; }
      if (!z) { zugEntfernen(l.uid); z = zugAnlegen(l, platz); }
      // Der ganze Zug bleibt immer zwischen den beiden Bahnhöfen: Abfahrt mit dem Zugende am Bahnhof, Ankunft mit der Spitze am Bahnhof.
      // Beim Halt steht er genau dort, wo er angekommen ist (nur die Fahrtrichtung kehrt sich um, wie bei einem Wendezug).
      // Mittelwagen fallen weg, wenn der Zug sonst zu lang wäre; reicht das nicht, wird er passend verkleinert.
      const sz = Math.min(s, geo.ges * 0.92 / z.ges);
      const vorn = z.kopfLen / 2 * sz, hinten = (z.ges - z.kopfLen / 2) * sz;   // Kopfmitte bis Zugspitze / bis Zugende
      let d;
      if (l.status === 'faehrt') {
        const fort = Math.max(0, Math.min(1, (jetzt - l.fahrt.start) / (l.fahrt.ende - l.fahrt.start)));
        // weich anfahren/bremsen: ease-in-out über die ganze Fahrt (nur Optik, Ankunftszeit bleibt)
        const e = fort < 0.5 ? 2 * fort * fort : 1 - Math.pow(-2 * fort + 2, 2) / 2;
        d = hinten + (geo.ges - vorn - hinten) * (0.15 * e + 0.85 * fort);
      } else d = hinten;   // steht am Bahnsteig, Zugende am Bahnhof, Nase in die nächste Fahrtrichtung
      const kopf = aufWeg(geo.pts, geo.len, d);
      setze(z.kopf, kopf.x, kopf.y, kopf.w, sz);
      let ab = z.kopfLen / 2 + 0.6;
      z.wagen.forEach((w, i) => { ab += z.laengen[i] / 2; const p = aufWeg(geo.pts, geo.len, d - ab * sz); setze(w, p.x, p.y, p.w, sz); ab += z.laengen[i] / 2 + 0.6; });
      const op = l.status === 'kohle' || l.status === 'faellig' || l.status === 'stoerung' ? '.55' : '1';
      if (z.kopf.style.opacity !== op) { z.kopf.style.opacity = op; z.wagen.forEach(w => { w.style.opacity = op; }); }
      // Dampf: nur Dampfloks, nur wenn sie fahren, häufiger bei Volldampf
      const abstand = volldampf ? 260 : 520;
      if (z.dampf && l.status === 'faehrt' && tMs - z.letzterPuff > abstand && !G.weniger() && Object.keys(zugEl).length < 30) {
        z.letzterPuff = tMs;
        const vx = Math.cos(kopf.w), vy = Math.sin(kopf.w);
        const sch = z.kopfLen / 2 - 3.4;
        G.puff(ebene, kopf.x + vx * sch * sz, kopf.y + vy * sch * sz, (-vx * 7 + (Math.random() - 0.5) * 4) * sz, (-8 - Math.random() * 5) * sz, 11, sz * (volldampf ? 1.2 : 0.9));
      }
    });
    Object.keys(zugEl).forEach(uid => { if (!da[uid]) zugEntfernen(+uid); });
  }
  function baustellenZeichnen(jetzt) {
    const S = M.zustand();
    ebene.querySelectorAll('.vd-kran').forEach(kr => {
      const s = S.strecken[kr.getAttribute('data-bau')];
      if (!s || s.fertig) return;
      const rest = Math.max(0, s.ende - jetzt), anteil = Math.min(1, (jetzt - s.start) / Math.max(1, s.ende - s.start));
      const t = kr.querySelector('.vd-kran-zeit');
      const txt = rest > 60000 ? Math.ceil(rest / 60000) + ' Min' : Math.ceil(rest / 1000) + ' s';
      if (t.textContent !== txt) t.textContent = txt;
      const p = gBau.querySelector('[data-bau="' + kr.getAttribute('data-bau') + '"]');
      if (p) p.setAttribute('stroke-dasharray', (anteil * 100).toFixed(1) + ' 100');
    });
  }
  /** Tag und Nacht nach der Bahnuhr: 21–5 Uhr Nacht, dazwischen Dämmerung */
  let nachtLetzt = -1;
  function nachtSetzen(jetzt) {
    const m = M.bahnzeit(jetzt) / 60;
    let n = 0;
    if (m >= 21 || m < 5) n = 1; else if (m >= 19) n = (m - 19) / 2; else if (m < 7) n = (7 - m) / 2;
    const st = Math.round(n * 10) / 10;
    if (st === nachtLetzt) return;
    nachtLetzt = st;
    nachtEl.style.opacity = (st * 0.35).toFixed(2);
    svg.classList.toggle('vd-ist-nacht', st >= 0.5);
  }

  /** Pro Bild aufrufen (requestAnimationFrame) */
  function rahmen(jetzt, tMs) {
    if (!welt) return;
    kamFlugSchritt(tMs); schwungSchritt(tMs);
    zuegeZeichnen(jetzt, tMs);
    baustellenZeichnen(jetzt);
    nachtSetzen(jetzt);
  }
  /** Bildschirmposition einer Stadt / eines Zugs (für Effekte im UI) */
  function schirmVonStadt(c) { const p = K.staedte[c]; return zuSchirm(p[0], p[1]); }
  function schirmVonZug(uid) {
    const z = zugEl[uid]; if (!z) return null;
    const m = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(z.kopf.style.transform);
    return m ? zuSchirm(+m[1] + VB[0], +m[2] + VB[1]) : null;
  }

  return { bauen, abbauen, zeichneNetz, rahmen, zeige, zoomen, modus: modusSetzen, linieZeigen, markieren, schirmVonStadt, schirmVonZug, kamera: cam, groesse, FARBEN };
})();
