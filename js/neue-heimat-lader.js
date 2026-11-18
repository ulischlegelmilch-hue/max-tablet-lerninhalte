// Mission Neue Heimat (Mars-Aufbauspiel, Quellen in ../neue-heimat): eigenständige Seite mit Phaser, läuft
// als iframe über der App und wird erst beim Öffnen geladen. Spielstand im localStorage (gleicher Ursprung).
// Das Spiel meldet „Speichern und beenden“ per postMessage {art:'nh-schliessen'}.
const NeueHeimatLader = (function () {
  const SPEICHER = 'neueheimat_spielstand_v1';
  const TAKTE_PRO_SOL = 96;

  function fortschrittText() {
    try {
      const z = JSON.parse(localStorage.getItem(SPEICHER) || 'null');
      if (!z || typeof z.takt !== 'number') return 'Neu: eine Kolonie auf dem Mars';
      const bewohner = Array.isArray(z.bewohner) ? z.bewohner.length : 0;
      return 'Sol ' + Math.floor(z.takt / TAKTE_PRO_SOL) + ' · ' + bewohner + ' Bewohner';
    } catch (e) { return 'Mars-Kolonie'; }
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
    box.innerHTML = '<iframe src="neue-heimat/spiel.html" title="Mission Neue Heimat" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
    document.body.appendChild(box);
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.art === 'nh-schliessen') schliessen();
  });

  // Kachel im Spiele-Menü erst, wenn das Spiel auf dem Tablet flüssig läuft; bis dahin nur Eltern-Bereich → Technik
  const fuerMax = false;

  return { oeffnen, schliessen, fortschrittText, fuerMax };
})();
