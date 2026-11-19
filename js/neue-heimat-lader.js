// Mission Neue Heimat (Aufbauspiel: erst Mondbasis, später Mars; Quellen in ../neue-heimat): eigenständige Seite
// mit Phaser, läuft als iframe über der App und wird erst beim Öffnen geladen. Spielstand im localStorage (gleicher
// Ursprung). Das Spiel meldet „Speichern und beenden“ per postMessage {art:'nh-schliessen'}.
// ?v=<Zeit>: frische URL bei jedem Öffnen, damit der WebView keine alte spiel.html aus dem Arbeitsspeicher nimmt
// (18.11.2026: nach Inhalts-Update lief weiter die alte Fassung); spiel.js trägt die Build-Nummer im Namen-Query.
const NeueHeimatLader = (function () {
  const SPEICHER = 'neueheimat_mond_v1';
  const TAKTE_PRO_TAG = 96;

  function fortschrittText() {
    try {
      const z = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
      const kol = z && z.kol;
      if (!kol || typeof kol.takt !== 'number') return 'Neu: eine Basis auf dem Mond';
      const tag = 'Mondbasis · Tag ' + (Math.floor(kol.takt / TAKTE_PRO_TAG) + 1);
      const m = z.mission;
      if (m && m.fertig) return tag + ' · alle Aufträge erfüllt';
      return m && typeof m.nr === 'number' ? tag + ' · Auftrag ' + m.nr : tag;
    } catch (e) { return 'Mondbasis'; }
  }

  function schliessen() {
    const box = document.getElementById('nh-spiel');
    if (box) box.remove();
    if (typeof App !== 'undefined' && App.renderSpieleMenu) App.renderSpieleMenu();
  }

  function oeffnen() {
    if (document.getElementById('nh-spiel')) return;
    const box = document.createElement('div');
    box.id = 'nh-spiel';
    box.style.cssText = 'position:fixed;inset:0;z-index:9400;background:#0b0f1a';
    box.innerHTML = '<iframe src="neue-heimat/spiel.html?v=' + Date.now() + '" title="Mission Neue Heimat" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
    document.body.appendChild(box);
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.art === 'nh-schliessen') schliessen();
  });

  // Kachel im Spiele-Menü seit 19.11.2026 (Mondbasis spielbar; Messrunde 3 am Tablet: fest 30 Bilder/s)
  const fuerMax = true;

  return { oeffnen, schliessen, fortschrittText, fuerMax };
})();
