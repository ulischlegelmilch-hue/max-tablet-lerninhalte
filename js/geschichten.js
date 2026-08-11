// Bildbasierte Buecher zum Lesen (aus PDFs gerenderte Seiten, siehe lesemodus.js).
// Fruehere Version hatte zusaetzlich 7 generische Text-Kapitelgeschichten
// (Detektiv/Ritter/Schatzkarte/Fuchs/Zauberschule/Polizeihund/Einhorn) in einer
// eigenen `bank` - auf Ulis Wunsch entfernt, die Buecherei besteht jetzt nur
// noch aus den beiden fuer Max gemachten Rennfahrer-/Rennauto-Buechern.
const Geschichten = (function () {
  // seiten = Anzahl JPG-Dateien seite-01.jpg..seite-NN.jpg im Ordner.
  const buecher = [
    { id: 'enzo', titel: 'ENZO – Die Legende vom roten Rennstall', seiten: 20, ordner: 'images/buecher/enzo' },
    { id: 'niki', titel: 'Niki: Die dritte Krone', seiten: 25, ordner: 'images/buecher/niki' }
  ];

  function buchSeitenUrls(buch) {
    const urls = [];
    for (let i = 1; i <= buch.seiten; i++) urls.push(`${buch.ordner}/seite-${String(i).padStart(2, '0')}.jpg`);
    return urls;
  }

  function leseBuch(id) {
    const buch = buecher.find(b => b.id === id);
    if (!buch) return;
    Lesemodus.starteBuch(buch.id, buch.titel, buchSeitenUrls(buch), renderMenu);
  }

  /** Liefert das erste noch nicht fertig gelesene Buch (fuer den Tagesplan-
   *  Banner auf dem Startbildschirm) - oder das letzte Buch mit "Nochmal
   *  lesen", falls schon alle fertig sind. */
  function naechsteOffene() {
    for (const b of buecher) {
      const fortschritt = Storage.getBuchFortschritt(b.id);
      if (!fortschritt || !fortschritt.fertig) {
        return { id: b.id, titel: b.titel, nochmal: false };
      }
    }
    const letztes = buecher[buecher.length - 1];
    return { id: letztes.id, titel: letztes.titel, nochmal: true };
  }

  function renderMenu() {
    const buecherCards = buecher.map(b => {
      const fortschritt = Storage.getBuchFortschritt(b.id);
      let badge = '';
      if (fortschritt && fortschritt.fertig) badge = '<div class="story-badge badge-fertig">✔ gelesen</div>';
      else if (fortschritt && fortschritt.seite > 0) badge = '<div class="story-badge badge-weiter">↻ weiterlesen</div>';
      return `<div class="story-card" onclick="Geschichten.leseBuch('${b.id}')">
         ${badge}
         <img class="story-buch-cover" src="${b.ordner}/seite-01.jpg">
         <div class="story-titel">${b.titel}</div>
       </div>`;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Wähle ein Buch zum Lesen</div>
      <div class="story-grid">${buecherCards}</div>
    `);
  }

  return { renderMenu, naechsteOffene, leseBuch };
})();
