// Hof-Farm: Lernrunde fuer schnelleres Wachstum. Waehlt 5 Karteikarten aus den Bereichen, in denen Max am meisten Uebung braucht
// (Malfolgen-Fakten, Radfahr-Lernkarten, Grundbegriffe) - nach den vorhandenen Statistiken: oft falsch / selten in Folge richtig
// = hohes Gewicht. Nur am Tablet vorhanden (Storage, Heimatkunde, Grundbegriffe). Das Ergebnis meldet Max selbst ("gewusst" / "noch nicht"),
// wie bei allen seinen Karteikarten; die Statistiken werden dabei genauso fortgeschrieben wie sonst.
const FarmLernen = (function () {
  function verfuegbar() {
    return typeof Storage !== 'undefined' && typeof Heimatkunde !== 'undefined' && typeof Grundbegriffe !== 'undefined';
  }

  // Gewicht je Karte: unbekannt = mittel, oft falsch und noch nicht gefestigt = hoch, gefestigt (>= 3 richtig in Folge) = kaum
  function gewicht(stat) {
    if (!stat) return 1.5;
    const falsch = stat.falsch || 0, serie = stat.serie || 0;
    if (serie >= 3) return 0.15;
    const w = Math.max(0.6, 1 + falsch * 2 - serie * 0.6);
    return falsch > 0 && serie < 2 ? w * 2 : w;
  }

  function sammeln() {
    const liste = [];
    // Malfolgen (nur aktive Reihen)
    try {
      const stats = Storage.getMalfolgenStats();
      Storage.getMalfolgenReihen().forEach(a => {
        for (let b = 1; b <= 10; b++) {
          const k = a + 'x' + b;
          liste.push({ quelle: 'mal', key: k, front: a + ' × ' + b + ' = ?', back: '<b>' + (a * b) + '</b>', w: gewicht(stats[k]), titel: 'Malfolgen' });
        }
      });
    } catch (e) { /* ohne Malfolgen */ }
    // Radfahr-Lernkarten
    try {
      Heimatkunde.lernthemenFuerExport().forEach(t => {
        const stats = Storage.getLernkartenStats(t.id);
        t.karten.forEach((c, i) => liste.push({ quelle: 'lern', thema: t.id, idx: i, front: c.front, back: c.back, w: gewicht(stats[i]), titel: 'Radfahren' }));
      });
    } catch (e) { /* ohne Radfahr-Karten */ }
    // Grundbegriffe (Rechenarten, Faelle)
    try {
      Object.keys(Grundbegriffe.DECKS).forEach(fach => {
        const d = Grundbegriffe.DECKS[fach];
        const stats = Storage.getLernkartenStats(d.stat);
        d.karten.forEach((c, i) => liste.push({ quelle: 'lern', thema: d.stat, idx: i, front: c.front, back: c.back, w: gewicht(stats[i]), titel: d.fachName || 'Schule' }));
      });
    } catch (e) { /* ohne Grundbegriffe */ }
    return liste;
  }

  // n Karten gewichtet ohne Zuruecklegen; aus einer Quelle (Malfolgen / Lernkarten) hoechstens zwei Drittel, damit es abwechslungsreich bleibt
  function waehle(n) {
    const pool = sammeln();
    const gewaehlt = [];
    const zaehl = { mal: 0, lern: 0 };
    const grenze = Math.ceil(n * 2 / 3);
    while (gewaehlt.length < n && pool.length) {
      const kand = pool.filter(k => zaehl[k.quelle] < grenze || !pool.some(o => zaehl[o.quelle] < grenze));
      const liste = kand.length ? kand : pool;
      let summe = 0; liste.forEach(k => { summe += k.w; });
      let r = Math.random() * summe, wahl = liste[liste.length - 1];
      for (const k of liste) { r -= k.w; if (r < 0) { wahl = k; break; } }
      gewaehlt.push(wahl); zaehl[wahl.quelle]++;
      pool.splice(pool.indexOf(wahl), 1);
    }
    return gewaehlt;
  }

  // Max hat die Karte als gewusst / nicht gewusst markiert
  function melde(karte, korrekt) {
    try {
      if (karte.quelle === 'mal') Storage.meldeMalfolgenErgebnis(karte.key, korrekt);
      else Storage.meldeLernkartenErgebnis(karte.thema, karte.idx, korrekt);
    } catch (e) { /* Statistik ist Zusatz */ }
  }

  // Tagesaufgaben der Schule (Ferientraining) fuer die Anzeige im Spiel
  function tagesplan() {
    try { return typeof Ferientraining !== 'undefined' && Ferientraining.liste ? Ferientraining.liste() : []; } catch (e) { return []; }
  }

  return { verfuegbar, waehle, melde, tagesplan };
})();
