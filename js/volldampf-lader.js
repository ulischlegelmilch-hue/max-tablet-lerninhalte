// VOLLDAMPF erst bei Bedarf laden (wie FarmLader): Karte + Daten + Design-Modul sind ~350 KB und sollen den
// App-Start auf dem Tab S 8.4 nicht bremsen. Icons + Fritz kommen über FarmLader.stil() (nie doppelt laden!).
const VolldampfLader = (function () {
  const ALLE = ['glanz', 'volldampf-daten', 'volldampf-karte', 'volldampf-modell', 'volldampf-draufsicht', 'volldampf-ansicht', 'volldampf-bilder', 'volldampf-fotos', 'volldampf-ton', 'volldampf'];
  const SPEICHER = 'maxlernt_volldampf_v1';   // = VolldampfModell.SPEICHER (für die Kachel ohne geladenes Modell)
  const NEU = { id: '2026-11-19-knopf-gold', text: 'Neuigkeiten' };   // = letzter Eintrag in VolldampfDaten.NEUERUNGEN (Kachel-Hinweis bis Max ihn gesehen hat)
  const geladen = {};
  let bereitP = null;

  function skript(name) {
    if (!geladen[name]) {
      geladen[name] = new Promise((ok, fehler) => {
        const el = document.createElement('script');
        el.src = 'js/' + name + '.js';
        el.onload = ok;
        el.onerror = () => { delete geladen[name]; fehler(new Error(name)); };
        document.head.appendChild(el);
      });
    }
    return geladen[name];
  }
  const reihe = namen => namen.reduce((p, n) => p.then(() => skript(n)), Promise.resolve());
  function bereit() {
    if (!bereitP) bereitP = FarmLader.stil().then(() => reihe(ALLE)).catch(e => { bereitP = null; throw e; });
    return bereitP;
  }
  function ladeAnzeige(text, beiTipp) {
    let el = document.getElementById('vd-lader');
    if (!text) { if (el) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'vd-lader';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px;' +
        'background:#0A0C0F;color:#A1A9B3;font:500 15px/1.5 Roboto,"Segoe UI",system-ui,sans-serif;letter-spacing:1.5px;text-transform:uppercase';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.onclick = beiTipp || null;
  }
  function oeffnen(beimSchliessen) {
    if (typeof Volldampf !== 'undefined') { Volldampf.oeffnen(beimSchliessen); return; }
    ladeAnzeige('Volldampf wird geladen …');
    bereit().then(() => { ladeAnzeige(null); Volldampf.oeffnen(beimSchliessen); }, () => {
      ladeAnzeige('Volldampf konnte nicht laden. Tippen, um es erneut zu versuchen.', () => { ladeAnzeige(null); oeffnen(beimSchliessen); });
    });
  }
  function fortschrittText() {
    try {
      const S = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
      if (!S || !S.level) return 'Neu: Dampfbahn quer durch Deutschland';
      if (S.neuGesehen !== NEU.id && S.hilfe && S.hilfe.guide) return NEU.text + ' · Stufe ' + S.level;
      return 'Stufe ' + S.level + ' · ' + Object.keys(S.laender || {}).length + ' von 16 Ländern';
    } catch (e) { return 'Neu: Dampfbahn quer durch Deutschland'; }
  }
  return { oeffnen, fortschrittText, bereit };
})();
