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
   *  lesen", falls schon alle fertig sind. status unterscheidet drei Faelle
   *  (siehe App.baueTagesplan fuer die Beschriftung): 'neu' = noch keine
   *  Seite gelesen (auch direkt nach Storage.resetFortschritt), 'weiter' =
   *  mindestens eine Seite gelesen, aber nicht fertig, 'nochmal' = schon
   *  fertig gelesen. Frueher wurde hier IMMER "Weiterlesen" angezeigt, auch
   *  fuer ein frisches/zurueckgesetztes Buch ohne jeden Fortschritt. */
  function statusFuer(fortschritt) {
    return fortschritt && fortschritt.seite > 0 ? 'weiter' : 'neu';
  }

  /** Zuerst das zuletzt GEOEFFNETE Buch bevorzugen (Storage.
   *  zuletztGeoeffnetesBuch, siehe Lesemodus.starteBuch) - vorher wurde hier
   *  IMMER das erste unfertige Buch in fester Listenreihenfolge gezeigt, auch
   *  wenn Max gerade ein ANDERES Buch angefangen/gelesen hat (13.08.2026 von
   *  Uli gemeldet: "steht oben immer noch das alte Buch"). Nur wenn es kein
   *  zuletzt geoeffnetes (oder das zuletzte bereits fertig gelesene) Buch
   *  gibt, faellt es auf die alte "erstes unfertiges in der Liste"-Regel
   *  zurueck (z.B. ganz am Anfang, bevor je ein Buch geoeffnet wurde). */
  function naechsteOffene() {
    const zuletztId = Storage.getZuletztGeoeffnetesBuch();
    const zuletzt = zuletztId && buecher.find(b => b.id === zuletztId);
    if (zuletzt) {
      const fortschritt = Storage.getBuchFortschritt(zuletzt.id);
      if (!fortschritt || !fortschritt.fertig) {
        return { id: zuletzt.id, titel: zuletzt.titel, status: statusFuer(fortschritt) };
      }
    }
    for (const b of buecher) {
      const fortschritt = Storage.getBuchFortschritt(b.id);
      if (!fortschritt || !fortschritt.fertig) {
        return { id: b.id, titel: b.titel, status: statusFuer(fortschritt) };
      }
    }
    const letztes = buecher[buecher.length - 1];
    return { id: letztes.id, titel: letztes.titel, status: 'nochmal' };
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
