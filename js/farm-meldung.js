// Hof-Farm: grosse Meldungen (Popup + eigener Ton) wenn auf dem Hof etwas passiert - auch ausserhalb der Farm, solange das Tablet an ist.
// Im Spiel ruft farm.js ereignis() auf; ausserhalb fragt start() den Pi alle 15 s nach neuen Ereignissen (ohne den Hof-Stand zu laden,
// und ohne sich als "Max ist im Spiel" zu melden). Nur am Tablet vorhanden.
const FarmMeldung = (function () {
  const D = FarmDaten;
  const SYNC_MS = 15000;
  let basis = null, ev = -1, timer = null, ac = null, box = null, offen = null;

  function kg(x) { return x >= 1000 ? (Math.round(x / 100) / 10).toLocaleString('de-DE') + ' t' : Math.round(x) + ' kg'; }

  // Ereignis -> Anzeige; null = keine Meldung wert. icon = Name aus FarmIcons (Stil B), Texte hoechstens 8 Woerter.
  function beschreibe(art, d) {
    try {
      if (art === 'jobFertig') { const s = D.SCHRITTE[d.job.schritt]; return { key: 'jf' + d.job.id, icon: d.job.schritt, titel: s.name + ' fertig', text: D.feld(d.job.feld).name + ': Maschine ist zurück.', ton: 'fertig' }; }
      if (art === 'reif') return { key: 'reif' + d.feld, icon: 'reif', titel: 'Erntereif!', text: D.feld(d.feld).name + ' kann geerntet werden.', ton: 'reif' };
      if (art === 'prodFertig') return { key: 'pf' + d.betrieb, icon: d.gut || d.betrieb, titel: D.betrieb(d.betrieb).name + ' fertig', text: kg(d.kg) + ' ' + D.gut(d.gut).name + ' sind bereit.', ton: 'fertig' };
      if (art === 'stallVoll') return { key: 'sv' + d.id, icon: d.id, titel: D.tier(d.id).stall + ' ist voll', text: 'Komm zum Einsammeln!', ton: 'fertig' };
      if (art === 'auftragNeu') return { key: 'an' + d.auftrag.id, icon: d.auftrag.gut, titel: 'Neuer Auftrag', text: kg(d.auftrag.kg) + ' ' + D.gut(d.auftrag.gut).name + ' gesucht.', ton: 'neu' };
      if (art === 'lohnFehlt') return { key: 'lohnfehlt', icon: 'lohn', titel: 'Kein Geld für Lohn', text: 'Die Fahrer machen Pause.', ton: 'warn' };
      if (art === 'umgebrochen') return { key: 'ub' + d.feld, icon: 'gefahr', titel: 'Pflanzen umgepflügt', text: D.feld(d.feld).name + ': Die Saat ist weg.', ton: 'warn' };
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

  // ---------- Popup (Stil B: Navy-Karte, Icon, Fuchs Fritz, max. 8 Woerter) ----------
  // Im Hof liegen die Karten im Toast-Bereich ueber dem Dock (#farm .fs-toasts) - so verdecken sie weder HUD noch Ziel-Banner.
  // Ausserhalb des Hofs: oben in der Mitte (eigene Ebene mit .fs-raum, damit die FarmStil-Komponenten greifen).
  const CSS = `
  #farm-meldungen{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;width:94%;max-width:600px;display:flex;flex-direction:column;gap:10px;pointer-events:none}
  .fm-karte{pointer-events:auto;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;max-width:600px;padding:8px 10px 8px 6px;border:3px solid #0A0D26;border-radius:22px;color:#fff;
    font-family:"Fredoka","Trebuchet MS",sans-serif;font-weight:600;background:linear-gradient(180deg,#2C3690 0%,#1C2366 55%,#151B52 100%);
    box-shadow:inset 0 2px 0 rgba(255,255,255,.22),0 0 0 3px var(--fm-rand,#4BE35F),0 5px 0 3px #0A0D26,0 14px 22px rgba(0,0,0,.45);animation:fmin .3s cubic-bezier(.34,1.56,.64,1) both}
  .fm-karte.reif{--fm-rand:#FFC531}.fm-karte.warn{--fm-rand:#F2424A}.fm-karte.neu{--fm-rand:#25C8F3}
  .fm-fuchs{flex:none;width:58px;height:58px;margin:-14px -4px -6px 0}
  .fm-fuchs>svg{display:block;width:100%;height:100%}
  .fm-icon{flex:none;width:54px;height:54px;border-radius:16px;border:3px solid #0A0D26;background:radial-gradient(circle at 50% 55%,rgba(255,255,255,.28),rgba(0,0,0,0) 70%),linear-gradient(#2E3893,#1B2266);display:flex;align-items:center;justify-content:center;box-sizing:border-box}
  .fm-icon>svg{width:42px;height:42px}
  .fm-icon.fm-emoji{font-size:30px;line-height:1}
  .fm-text{flex:1;min-width:0}
  .fm-titel{font-family:"Lilita One","Arial Black",sans-serif;font-weight:400;font-size:23px;line-height:27px;text-shadow:0 2px 0 #0A0D26,1px 1px 0 #0A0D26,-1px 1px 0 #0A0D26,1px -1px 0 #0A0D26,-1px -1px 0 #0A0D26;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fm-sub{font-size:19px;line-height:23px;color:#D5DBFF;margin-top:1px}
  .fm-karte .fm-zu{flex:none;min-height:64px;padding:4px 16px 8px;font-size:21px}
  .fm-karte .fm-x{flex:none;width:64px;height:64px;min-width:0;min-height:0;padding:0 0 4px}
  .fm-karte .fm-x>svg{width:30px;height:30px}
  .fm-ohne .fm-zu{border:3px solid #0A0D26;border-radius:18px;background:linear-gradient(#FFF07A,#FF9E00);color:#3A1E00;font-weight:700;font-size:19px;padding:10px 14px}
  .fm-ohne .fm-x{border:3px solid #0A0D26;border-radius:18px;background:#2F3A9A;color:#fff;font-size:24px;font-weight:700}
  @media (max-width:820px){.fm-titel{font-size:20px;line-height:24px;white-space:normal}.fm-sub{font-size:18px}.fm-fuchs{display:none}.fm-karte .fm-zu{padding:4px 10px 8px;font-size:19px}}
  @keyframes fmin{from{transform:translateY(-24px) scale(.94);opacity:0}to{transform:none;opacity:1}}`;
  const FS = () => (typeof FarmStil !== 'undefined' ? FarmStil : null);
  const POSE = { reif: 'jubelt', warn: 'gruebelt', neu: 'zeigt', fertig: 'jubelt' };
  function cssEinbauen() {
    if (!document.getElementById('farm-meldung-css')) { const st = document.createElement('style'); st.id = 'farm-meldung-css'; st.textContent = CSS; document.head.appendChild(st); }
  }
  function behaelter(imHof) {
    cssEinbauen();
    if (FS()) { try { FS().einbauen(); } catch (e) { /* ohne Stil */ } }
    // Im Hof: in den Toast-Bereich von farm.js (ueber dem Dock, unter Dialogen nicht verdeckt: z-index 80)
    const hof = imHof ? document.querySelector('#farm .fs-toasts') : null;
    if (hof) return hof;
    if (box && box.parentNode) return box;
    box = document.createElement('div'); box.id = 'farm-meldungen'; box.className = 'fs-raum'; document.body.appendChild(box);
    return box;
  }
  function zeige(m, imHof) {
    const b = behaelter(imHof);
    const alt = b.querySelector('[data-k="' + m.key + '"]'); if (alt) alt.parentNode.removeChild(alt);
    const el = document.createElement('div');
    const fs = FS();
    el.className = 'fm-karte ' + (m.ton === 'warn' || m.ton === 'reif' || m.ton === 'neu' ? m.ton : '') + (fs ? '' : ' fm-ohne');
    el.setAttribute('data-k', m.key);
    const zumHof = !imHof && !offen && typeof Farm !== 'undefined';
    const iconHtml = fs ? fs.icon(fs.hatIcon(m.icon) ? m.icon : 'ausrufe', 42) : '';
    el.innerHTML = (fs ? '<div class="fm-fuchs">' + fs.fuchs(POSE[m.ton] || 'neutral', 58) + '</div>' : '') +
      '<div class="fm-icon">' + iconHtml + '</div><div class="fm-text"><div class="fm-titel"></div><div class="fm-sub"></div></div>' +
      (zumHof ? '<button class="fm-zu' + (fs ? ' fs-btn fs-gelb' : '') + '">Zum Hof</button>' : '') +
      '<button class="fm-x' + (fs ? ' fs-btn fs-navy fs-rund' : '') + '" aria-label="Schließen">' + (fs ? fs.icon('schliessen', 30) : 'X') + '</button>';
    el.querySelector('.fm-titel').textContent = m.titel; el.querySelector('.fm-sub').textContent = m.text;
    const weg = () => { if (el.parentNode) el.parentNode.removeChild(el); };
    el.querySelector('.fm-x').addEventListener('click', weg);
    const zu = el.querySelector('.fm-zu'); if (zu) zu.addEventListener('click', () => { weg(); Farm.oeffnen(); });
    b.appendChild(el);
    // ausserhalb des Hofs nur EINE Karte (sonst zwei gelbe "Zum Hof"-Knoepfe gleichzeitig) - die neueste gewinnt
    while (b.children.length > (imHof ? 3 : 1)) b.removeChild(b.firstChild);
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
      if (j && j.zeit && typeof Storage !== 'undefined' && Storage.setServerZeit) Storage.setServerZeit(j.zeit);   // T3: Pi-Zeit gegen falsche Tablet-Uhr
      if (!j.init) return;
      if (ev >= 0 && j.ereignisse && !offen) {
        const liste = j.ereignisse.map(e => beschreibe(e.art, e.daten)).filter(Boolean);
        if (liste.length > 3) { zeige({ key: 'viel', icon: 'traktor', titel: 'Auf dem Hof ist was los', text: liste.length + ' Meldungen – schau mal vorbei!', ton: 'fertig' }, false); ton('fertig'); }
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
        const wirkung = komplett ? 'Hof: alles sofort fertig!' : 'Hof: ' + min + ' Min schneller!';
        zeige({ key: 'schule', icon: komplett ? 'level' : 'schule', titel: komplett ? 'Alles richtig!' : (n === 1 ? 'Aufgabe geschafft!' : n + ' Aufgaben geschafft!'), text: richtig + ' von ' + gesamt + ' richtig. ' + wirkung, ton: 'reif' }, !!offen);
        ton('reif');
      }
    } finally { schulLaeuft = false; }
  }
  function hofOffen(an) { offen = an; if (an) { ev = -1; schulaufgaben(); } }

  return { start, ereignis, hofOffen, schulaufgaben, _t: { beschreibe, zeige, ton, abfragen } };
})();
