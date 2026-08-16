// Reine Mau-Mau-Spiellogik (keine Oberflaeche, kein Storage) - analog zu
// schach-engine.js/schiffe-engine.js: Kartendeck, Misch-/Legbarkeitsregeln.
//
// Klassisches deutsches Mau-Mau mit 32er Skat-Blatt (4 Farben x 7,8,9,10,
// Bube,Dame,Koenig,Ass). Sonderkarten: 7 = naechster zieht 2 (stapelbar,
// mehrere Siebenen hintereinander addieren sich), 8 = naechster Spieler
// setzt aus, Bube = jederzeit legbar, wer ihn legt wuenscht sich eine neue
// Farbe. Kein Sonderrecht fuer das Ass (das ist eine reine 3+-Spieler-
// Regel "Richtung umkehren", bei nur zwei Spielern wirkungslos).
const MauMauEngine = (function () {
  const FARBEN = ['kreuz', 'pik', 'herz', 'karo'];
  const FARBSYMBOL = { kreuz: '♣', pik: '♠', herz: '♥', karo: '♦' };
  const FARBROT = { herz: true, karo: true, kreuz: false, pik: false };
  const FARBNAME = { kreuz: 'Kreuz', pik: 'Pik', herz: 'Herz', karo: 'Karo' };
  const WERTE = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];
  const WERT_INDEX = { '7': 0, '8': 1, '9': 2, '10': 3, B: 4, D: 5, K: 6, A: 7 };

  function neuesDeck() {
    const deck = [];
    for (const farbe of FARBEN) for (const wert of WERTE) deck.push({ farbe, wert });
    return deck;
  }

  function mische(deck) {
    const kopie = deck.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = kopie[i]; kopie[i] = kopie[j]; kopie[j] = tmp;
    }
    return kopie;
  }

  /** Ist `karte` auf die obenliegende Ablagekarte legbar? gewuenschteFarbe
   *  greift nur direkt nach einem gespielten Buben, sonst null/undefined. */
  function istLegbar(karte, obenliegendeKarte, gewuenschteFarbe) {
    if (karte.wert === 'B') return true;
    if (gewuenschteFarbe) return karte.farbe === gewuenschteFarbe;
    return karte.farbe === obenliegendeKarte.farbe || karte.wert === obenliegendeKarte.wert;
  }

  function legbareKarten(hand, obenliegendeKarte, gewuenschteFarbe) {
    return hand.filter(k => istLegbar(k, obenliegendeKarte, gewuenschteFarbe));
  }

  /** Sortierreihenfolge (Index in eine sortierte Handanzeige) - nach Farbe,
   *  innerhalb der Farbe nach Wert, rein fuers uebersichtlichere Anzeigen. */
  function sortiereHandIndizes(hand) {
    return hand.map((_, i) => i).sort((a, b) => {
      const ka = hand[a], kb = hand[b];
      if (ka.farbe !== kb.farbe) return FARBEN.indexOf(ka.farbe) - FARBEN.indexOf(kb.farbe);
      return WERT_INDEX[ka.wert] - WERT_INDEX[kb.wert];
    });
  }

  return {
    FARBEN, FARBSYMBOL, FARBROT, FARBNAME, WERTE, WERT_INDEX,
    neuesDeck, mische, istLegbar, legbareKarten, sortiereHandIndizes
  };
})();
