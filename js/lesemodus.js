// Lesemodus: Vollbild-E-Reader fuer bildbasierte Buecher (z.B. aus einem PDF
// gerenderte Seiten, siehe Geschichten.leseBuch) - blendet die Topbar aus,
// zeigt nur die Buchseite. Tipp-Zonen: links/rechts blaettern, Mitte zeigt/
// versteckt die duenne Kopfzeile (Titel/Seitenzahl/Verlassen), ganz wie bei
// einem echten E-Reader.
//
// onLeaveScreen-Kniff wie bei Chat/SchachOnline: jede Seite ist ein eigener
// App.render()-Aufruf, das darf NICHT bei jedem Blaettern die Topbar wieder
// einblenden - nur beim tatsaechlichen Verlassen.
const Lesemodus = (function () {
  let buchId = '';
  let titel = '';
  let seitenUrls = [];
  let seite = 0;
  let leisteSichtbar = true;
  let zurueckFn = null;
  let ersteAnzeige = true;

  function raeumeAuf() {
    const topbar = document.getElementById('topbar');
    if (topbar) topbar.style.display = '';
    const root = document.getElementById('app-root');
    if (root) root.classList.remove('lesemodus-aktiv');
  }

  function starteBuch(id, buchTitel, urls, zurueck) {
    buchId = id;
    titel = buchTitel;
    seitenUrls = urls;
    zurueckFn = zurueck;
    ersteAnzeige = true;
    leisteSichtbar = true;

    const fortschritt = Storage.getBuchFortschritt(id);
    seite = (fortschritt && fortschritt.seite < urls.length) ? fortschritt.seite : 0;
    // Merkt sich SOFORT beim Oeffnen (nicht erst beim ersten Umblaettern),
    // welches Buch Max zuletzt aufgeschlagen hat - der "Weiterlesen"-Chip im
    // Tagesplan (siehe Geschichten.naechsteOffene) zeigt genau dieses Buch.
    Storage.setZuletztGeoeffnetesBuch(id);

    document.getElementById('topbar').style.display = 'none';
    document.getElementById('app-root').classList.add('lesemodus-aktiv');
    zeichne();
  }

  function verlassen() {
    raeumeAuf();
    if (zurueckFn) zurueckFn(); else App.gotoHome();
  }

  function render(html) {
    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
    App.render(html);
    App.setOnLeaveScreen(raeumeAuf);
    ersteAnzeige = false;
  }

  function leisteHtml() {
    if (!leisteSichtbar) return '';
    return `
      <div class="lesemodus-leiste">
        <span class="lesemodus-verlassen" onclick="Lesemodus.verlassen()">${Icons.svg('zurueck')} Verlassen</span>
        <span class="lesemodus-titel">${titel} · Seite ${seite + 1}/${seitenUrls.length}</span>
        <span></span>
      </div>
    `;
  }

  function zeichne() {
    render(`
      <div class="lesemodus-seite">
        <img class="lesemodus-bild" src="${seitenUrls[seite]}">
        <div class="lesemodus-tap-links" onclick="Lesemodus.vorherigeSeite()"></div>
        <div class="lesemodus-tap-mitte" onclick="Lesemodus.toggleLeiste()"></div>
        <div class="lesemodus-tap-rechts" onclick="Lesemodus.naechsteSeite()"></div>
        ${leisteHtml()}
      </div>
    `);
  }

  function zeichneFertig() {
    render(`
      <div class="lesemodus-seite">
        <img class="lesemodus-bild" style="filter:brightness(0.35);" src="${seitenUrls[seite]}">
        <div class="lesemodus-fertig">
          <div style="font-size:48px;">🎉</div>
          <div style="font-size:22px;font-weight:700;">Fertig gelesen!</div>
          <div class="btn-primary" onclick="Lesemodus.nochmalVonVorne()">Nochmal von vorne</div>
          <span class="lesemodus-verlassen" onclick="Lesemodus.verlassen()">${Icons.svg('zurueck')} Zurück</span>
        </div>
      </div>
    `);
  }

  function naechsteSeite() {
    if (seite < seitenUrls.length - 1) {
      seite++;
      Storage.saveBuchSeite(buchId, seite);
      zeichne();
    } else {
      const istErstesMal = Storage.markBuchFertig(buchId);
      if (istErstesMal) { Storage.addSterne(30); App.updateTopbar(); }
      zeichneFertig();
    }
  }

  function vorherigeSeite() {
    if (seite > 0) {
      seite--;
      Storage.saveBuchSeite(buchId, seite);
      zeichne();
    }
  }

  function toggleLeiste() {
    leisteSichtbar = !leisteSichtbar;
    zeichne();
  }

  function nochmalVonVorne() {
    seite = 0;
    Storage.saveBuchSeite(buchId, seite);
    zeichne();
  }

  return { starteBuch, naechsteSeite, vorherigeSeite, toggleLeiste, verlassen, nochmalVonVorne };
})();
