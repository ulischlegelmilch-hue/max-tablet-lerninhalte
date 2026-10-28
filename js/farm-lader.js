// Hof-Farm erst bei Bedarf laden (28.10.2026, T4): Die Farm-Skripte sind fast 1 MB (davon 360 KB Icons/Schriften)
// und wurden frueher bei JEDEM App-Start geparst - auf dem Tab S 8.4 kostet das Startzeit und Speicher (Diagnose:
// "Speicherwarnung level=15" schon beim Start). Jetzt laedt erst das Antippen der Kachel die Farm; Hof-Meldungen
// (farm-meldung.js, bleibt immer geladen) holen sich bei der ersten Meldung nur Icons + Stil.
// Papas Eltern-App ist davon unberuehrt (laedt die Farm-Skripte selbst, backend/webapp/index.html).
const FarmLader = (function () {
  const STIL = ['farm-icons', 'farm-stil'];
  const ALLE = ['farm-gfx',   // farm-daten.js laedt index.html sofort (farm-meldung.js braucht die Namen)
                 'farm-modell', 'farm-icons', 'farm-stil', 'farm-ansicht', 'farm-lernen', 'farm'];
  const KONFIG = { fern: { basis: 'https://max-tablet-api.paceforge-pi.co.uk', von: 'max' } };   // gemeinsamer Hof auf dem Pi
  const SPEICHER = 'maxlernt_farm_v2';   // = FarmModell.SPEICHER (fuer die Kachel ohne geladenes Modell)
  const geladen = {};
  let farmBereit = null;

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
  // nacheinander - die Reihenfolge ist wichtig ((Daten) -> Gfx -> Modell -> Icons -> Stil -> Ansicht -> ... -> farm)
  const reihe = namen => namen.reduce((p, n) => p.then(() => skript(n)), Promise.resolve());

  function stil() { return reihe(STIL); }
  function bereit() {
    if (!farmBereit) farmBereit = reihe(ALLE).then(() => { Farm.konfig(KONFIG); }).catch(e => { farmBereit = null; throw e; });
    return farmBereit;
  }

  function ladeAnzeige(text) {
    let el = document.getElementById('farm-lader');
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'farm-lader';
      el.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;' +
        'background:radial-gradient(120% 80% at 50% -10%,#2B3589 0%,#161C4A 45%,#0A0D26 100%);color:#fff;font:700 28px system-ui,sans-serif';
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function oeffnen(beimSchliessen) {
    if (typeof Farm !== 'undefined') { Farm.oeffnen(beimSchliessen); return; }
    ladeAnzeige('Hof-Farm lädt …');
    // Anzeige zuerst weg: wirft oeffnen() doch einmal, steht Max wieder im Menue statt vor einer haengenden Ladeanzeige
    bereit().then(() => { ladeAnzeige(null); Farm.oeffnen(beimSchliessen); }, () => {
      ladeAnzeige('Die Hof-Farm konnte nicht laden. Tippe, um es nochmal zu versuchen.');
      const el = document.getElementById('farm-lader');
      if (el) el.onclick = () => { ladeAnzeige(null); oeffnen(beimSchliessen); };
    });
  }

  function fortschrittText() {
    try {
      const raw = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
      if (!raw || raw.v !== 2) return 'Neuer Hof';
      return 'Level ' + raw.level + ' · ' + Object.keys(raw.felder || {}).length + ' Felder';
    } catch (e) { return 'Neuer Hof'; }
  }

  return { oeffnen, fortschrittText, bereit, stil };
})();
