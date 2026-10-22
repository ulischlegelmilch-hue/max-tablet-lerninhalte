// Hof-Farm: grosse Meldungen (Popup + eigener Ton) wenn auf dem Hof etwas passiert - auch ausserhalb der Farm, solange das Tablet an ist.
// Im Spiel ruft farm.js ereignis() auf; ausserhalb fragt start() den Pi alle 15 s nach neuen Ereignissen (ohne den Hof-Stand zu laden,
// und ohne sich als "Max ist im Spiel" zu melden). Nur am Tablet vorhanden.
const FarmMeldung = (function () {
  const D = FarmDaten;
  const SYNC_MS = 15000;
  let basis = null, ev = -1, timer = null, ac = null, box = null, offen = null;

  function kg(x) { return x >= 1000 ? (Math.round(x / 100) / 10).toLocaleString('de-DE') + ' t' : Math.round(x) + ' kg'; }

  // Ereignis -> Anzeige; null = keine Meldung wert
  function beschreibe(art, d) {
    try {
      if (art === 'jobFertig') { const s = D.SCHRITTE[d.job.schritt]; return { key: 'jf' + d.job.id, icon: s.icon, titel: s.name + ' fertig', text: D.feld(d.job.feld).name + ' – die Maschine ist zurück auf dem Hof.', ton: 'fertig' }; }
      if (art === 'reif') return { key: 'reif' + d.feld, icon: '🌾', titel: 'Erntereif!', text: D.feld(d.feld).name + ' kann geerntet werden.', ton: 'reif' };
      if (art === 'prodFertig') return { key: 'pf' + d.betrieb, icon: D.betrieb(d.betrieb).icon || '🏭', titel: D.betrieb(d.betrieb).name + ' fertig', text: kg(d.kg) + ' ' + D.gut(d.gut).name + ' sind bereit.', ton: 'fertig' };
      if (art === 'stallVoll') return { key: 'sv' + d.id, icon: D.tier(d.id).icon, titel: D.tier(d.id).stall + ' ist voll', text: 'Komm zum Einsammeln!', ton: 'fertig' };
      if (art === 'auftragNeu') return { key: 'an' + d.auftrag.id, icon: '📦', titel: 'Neuer Auftrag', text: kg(d.auftrag.kg) + ' ' + D.gut(d.auftrag.gut).name + ' gesucht.', ton: 'neu' };
      if (art === 'umgebrochen') return { key: 'ub' + d.feld, icon: '⚠️', titel: 'Pflanzen umgebrochen', text: D.feld(d.feld).name + ': Der Pflug hat die Saat zerstört.', ton: 'warn' };
    } catch (e) { /* unbekannte Daten */ }
    return null;
  }

  // ---------- Ton ----------
  function audio() {
    if (!ac) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* egal */ } }
    return ac;
  }
  const MELODIEN = {
    fertig: { w: 'triangle', n: [[784, 0], [988, .13], [1175, .26], [1568, .39]] },
    reif: { w: 'triangle', n: [[659, 0], [784, .12], [988, .24], [784, .4], [988, .52], [1319, .64]] },
    neu: { w: 'sine', n: [[1047, 0], [1397, .16]] },
    warn: { w: 'square', n: [[440, 0], [330, .18], [262, .36]] }
  };
  function ton(art) {
    const a = audio(); if (!a) return;
    try {
      const m = MELODIEN[art] || MELODIEN.fertig, t0 = a.currentTime;
      m.n.forEach(([fr, dt]) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = m.w; o.frequency.value = fr;
        const hoch = m.w === 'square' ? 0.07 : 0.22;
        g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(hoch, t0 + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.3);
        o.connect(g); g.connect(a.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.32);
      });
    } catch (e) { /* egal */ }
  }

  // ---------- Popup ----------
  const CSS = `
  #farm-meldungen{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;width:92%;max-width:520px;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .fm-karte{pointer-events:auto;display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,#2f7d3f,#1f5b2c);color:#fff;border:2px solid #9ff0a8;border-radius:18px;padding:12px 14px;box-shadow:0 10px 28px rgba(0,0,0,.5);font-family:system-ui,-apple-system,Roboto,sans-serif;animation:fmin .25s ease-out}
  .fm-karte.warn{background:linear-gradient(180deg,#a8452c,#782d1a);border-color:#ffb199}
  .fm-karte.reif{background:linear-gradient(180deg,#b88a14,#7e5c08);border-color:#ffe27a}
  .fm-karte.neu{background:linear-gradient(180deg,#2e6aa8,#1d4a7a);border-color:#9cc9ff}
  .fm-icon{font-size:38px;line-height:1;flex:none}
  .fm-text{flex:1;min-width:0}
  .fm-titel{font-weight:800;font-size:19px}
  .fm-sub{font-size:15px;opacity:.95;margin-top:2px}
  .fm-zu{flex:none;background:#fff;color:#1d3d24;border:0;border-radius:12px;font-weight:800;font-size:15px;padding:10px 14px;touch-action:manipulation}
  .fm-x{flex:none;background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:50%;width:36px;height:36px;font-size:18px;touch-action:manipulation}
  @keyframes fmin{from{transform:translateY(-30px);opacity:0}to{transform:none;opacity:1}}`;
  function behaelter() {
    if (box && box.parentNode) return box;
    if (!document.getElementById('farm-meldung-css')) { const st = document.createElement('style'); st.id = 'farm-meldung-css'; st.textContent = CSS; document.head.appendChild(st); }
    box = document.createElement('div'); box.id = 'farm-meldungen'; document.body.appendChild(box);
    return box;
  }
  function zeige(m, imHof) {
    const b = behaelter();
    const alt = b.querySelector('[data-k="' + m.key + '"]'); if (alt) alt.parentNode.removeChild(alt);
    const el = document.createElement('div');
    el.className = 'fm-karte ' + (m.ton === 'warn' || m.ton === 'reif' || m.ton === 'neu' ? m.ton : '');
    el.setAttribute('data-k', m.key);
    const zumHof = !imHof && !offen && typeof Farm !== 'undefined';
    el.innerHTML = '<div class="fm-icon">' + m.icon + '</div><div class="fm-text"><div class="fm-titel"></div><div class="fm-sub"></div></div>' +
      (zumHof ? '<button class="fm-zu">Zum Hof ▶</button>' : '') + '<button class="fm-x">✕</button>';
    el.querySelector('.fm-titel').textContent = m.titel; el.querySelector('.fm-sub').textContent = m.text;
    const weg = () => { if (el.parentNode) el.parentNode.removeChild(el); };
    el.querySelector('.fm-x').addEventListener('click', weg);
    const zu = el.querySelector('.fm-zu'); if (zu) zu.addEventListener('click', () => { weg(); Farm.oeffnen(); });
    b.appendChild(el);
    while (b.children.length > 3) b.removeChild(b.firstChild);
    setTimeout(weg, imHof ? 7000 : 12000);
  }

  // Aus dem Spiel: true = hier behandelt (farm.js zeigt dann kein eigenes Toast)
  function ereignis(art, d, mitTon) {
    const m = beschreibe(art, d);
    if (!m) return false;
    zeige(m, true);
    if (mitTon !== false) ton(m.ton);
    return true;
  }

  // ---------- Hintergrund-Abfrage (ausserhalb der Farm) ----------
  async function abfragen() {
    if (!basis || document.hidden) return;
    if (offen) { ev = -1; return; }
    try {
      const r = await fetch(basis + '/api/farm?von=hg&ohneStand=1' + (ev >= 0 ? '&ev=' + ev : ''));
      if (!r.ok) return;
      const j = await r.json();
      if (!j.init) return;
      if (ev >= 0 && j.ereignisse && !offen) {
        const liste = j.ereignisse.map(e => beschreibe(e.art, e.daten)).filter(Boolean);
        if (liste.length > 3) { zeige({ key: 'viel', icon: '🚜', titel: 'Auf dem Hof ist was los', text: liste.length + ' Meldungen – schau mal vorbei!', ton: 'fertig' }, false); ton('fertig'); }
        else liste.forEach(m => { zeige(m, false); ton(m.ton); });
      }
      ev = j.evLetzte;
    } catch (e) { /* offline: nichts tun */ }
  }
  function start(url) {
    basis = url;
    if (timer) return;
    // Ton braucht eine Beruehrung, bevor der Browser Audio erlaubt
    document.addEventListener('touchstart', function frei() { audio(); document.removeEventListener('touchstart', frei, true); }, true);
    abfragen(); schulaufgaben();
    timer = setInterval(() => { abfragen(); schulaufgaben(); }, SYNC_MS);
  }
  // ---------- Tagesaufgaben der Schule -> Zeitgutschrift auf dem Hof ----------
  // Jede geschaffte Ferientraining-Aufgabe (einmal am Tag) verkuerzt auf dem Hof alle laufenden Arbeiten um D.SCHUL_BONUS_MIN.
  const SCHUL_KEY = 'maxlernt_farm_schul';
  let schulLaeuft = false;
  function heute() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function schulBeansprucht() {
    try { const r = JSON.parse(localStorage.getItem(SCHUL_KEY) || 'null'); if (r && r.datum === heute()) return r; } catch (e) { /* leer */ }
    return { datum: heute(), ids: {} };
  }
  const quote = x => Math.max(0, Math.min(1, x.n > 0 ? x.richtig / x.n : 1));   // Anteil beim ersten Versuch richtig
  async function schulaufgaben() {
    if (!basis || schulLaeuft || typeof Ferientraining === 'undefined' || !Ferientraining.liste) return;
    const rec = schulBeansprucht();
    const offene = Ferientraining.liste().filter(x => x.fertig && !rec.ids[x.id]);
    if (!offene.length) return;
    schulLaeuft = true;
    try {
      let min = 0, n = 0, richtig = 0, gesamt = 0, anteil = 0, komplett = false;
      for (const x of offene) {
        let j = null;
        try {
          const r = await fetch(basis + '/api/farm/befehl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ von: 'max', name: 'tagesaufgabeGeschafft', args: [x.id, quote(x)] }) });
          if (r.status === 409) return;   // noch kein gemeinsamer Hof
          j = await r.json();
        } catch (e) { return; }           // offline: beim naechsten Mal
        const erg = j && j.ergebnis;
        if (erg && erg.ok) { min += erg.min; n++; richtig += x.richtig; gesamt += x.n; anteil = Math.max(anteil, erg.anteil); komplett = komplett || erg.komplett; }
        if (j) { rec.ids[x.id] = 1; localStorage.setItem(SCHUL_KEY, JSON.stringify(rec)); }   // auch eine Ablehnung ("schon belohnt") ist endgueltig
      }
      if (n) {
        const wirkung = komplett ? 'Perfekt – auf dem Hof ist jetzt alles sofort fertig!' : 'Auf dem Hof sind alle Arbeiten mindestens ' + min + ' Minuten schneller, ' + Math.round(anteil * 100) + ' % der Restzeit entfällt.';
        zeige({ key: 'schule', icon: komplett ? '🌟' : '📚', titel: komplett ? 'Alles richtig!' : (n === 1 ? 'Tagesaufgabe geschafft!' : n + ' Tagesaufgaben geschafft!'), text: richtig + ' von ' + gesamt + ' gleich richtig. ' + wirkung, ton: 'reif' }, !!offen);
        ton('reif');
      }
    } finally { schulLaeuft = false; }
  }
  function hofOffen(an) { offen = an; if (an) { ev = -1; schulaufgaben(); } }

  return { start, ereignis, hofOffen, schulaufgaben, _t: { beschreibe, zeige, ton, abfragen } };
})();
