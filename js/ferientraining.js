// Ferientraining (11.10.2026) - Uli-Wunsch: Max soll jeden Tag ein festes
// Pensum haben, das er als kleine To-do-Liste sieht und nach und nach abhakt.
// Die Liste (PLAN) ist bewusst eine einfache Konfiguration: weitere Punkte
// (z.B. Deutsch) oder andere Mengen sind nur ein Eintrag/eine Zahl hier.
//
// Fortschritt: Storage.getFerienZaehler(id) zaehlt HEUTE zum ersten Mal
// beantwortete Aufgaben bzw. bewertete Karten (Anzeige "x von Ziel"), taeglicher
// Reset. Abgehakt wird ein Punkt erst, wenn seine Sitzung ABGESCHLOSSEN ist
// (Ferientraining.abschluss) - und dazu gehoeren die Wiederholungen: fuer jede
// falsch beantwortete Aufgabe/Karte kommt eine weitere dazu (App.abschlussFrage
// bzw. Heimatkunde.bewerteLernkarte).
const Ferientraining = (function () {
  // 28.10.2026 (Uli: "nimm das Ferienlernen raus", Deutsch-Arbeit doppelte Mitlaute + vier Faelle, "die Matheaufgaben
  // sollten separat auch noch da sein"): Tagesplan = 2 Deutsch-Runden fuer die Arbeit + Mathe wie bisher.
  // ACHTUNG 29.10.2026 (Deutsch-Arbeit): nach der Arbeit die beiden Deutsch-Punkte ersetzen/entfernen.
  // Frueher hier (bei Bedarf wieder eintragen): gb_mathe/gb_deutsch (Grundbegriffe-Karten), mathe_rechenarten,
  // deutsch_tag (Faelle-Mischung), schreiben_tag (Schreiben.render), heimat_lernkarten (Radfahren) - siehe git-Historie.
  const PLAN = [
    {
      id: 'deutsch_doppel', fach: 'deutsch', icon: 'rechtschreibung', titel: 'Deutsch: Doppelte Mitlaute',
      text: 'Mit und ohne Doppelbuchstaben – auch am Wortende', einheit: 'Aufgaben', ziel: () => 10,
      start: () => Deutsch.starteDoppelTraining()
    },
    {
      id: 'deutsch_faelle', fach: 'deutsch', icon: 'deutsch', titel: 'Deutsch: Die vier Fälle',
      text: 'Wörter in die vier Fälle setzen', einheit: 'Aufgaben', ziel: () => 10,
      start: () => Deutsch.starteFaelleTraining()
    },
    {
      id: 'mathe_tag', fach: 'mathe', icon: 'tagesaufgabe', titel: 'Mathe: Aufgaben',
      text: 'Zahlen bis 10 000, Zahlenstrahl, Rechenregeln', einheit: 'Aufgaben', ziel: () => 10,
      start: () => Mathe.starteFerienTraining()
    },
    {
      // Start mit den gewaehlten Reihen; "die meisten" gekonnt -> naechste Reihe kommt dazu (siehe Mathe.erweitereMalfolgenReihen).
      id: 'mathe_malfolgen', fach: 'mathe', icon: 'malfolgen', titel: 'Mathe: Malfolgen',
      text: () => Mathe.malfolgenText(), einheit: 'Karten', ziel: () => Math.min(40, Mathe.malfolgenAnzahl()),
      start: () => Mathe.starteMalfolgenKarten()
    }
  ];

  function wert(x) { return typeof x === 'function' ? x() : x; }

  function stand(item) {
    const n = Storage.getFerienZaehler(item.id);
    const z = Math.max(1, wert(item.ziel));
    return { n, z, fertig: Storage.getFerienErledigt(item.id) };
  }

  function anzahlErledigt() { return PLAN.filter(i => stand(i).fertig).length; }

  /** Zaehlt eine erledigte Einheit fuer einen Plan-Punkt (ignoriert unbekannte ids). */
  function melde(id, korrekt) {
    const item = PLAN.find(i => i.id === id);
    if (!item) return;
    Storage.meldeFerienFortschritt(id, korrekt);
  }

  /** Sitzung des Punkts ist heute komplett abgeschlossen (inkl. Wiederholungen
   *  falscher Aufgaben/Karten) -> abgehakt. */
  function abschluss(id) {
    if (PLAN.some(i => i.id === id)) {
      Storage.setFerienErledigt(id);
      // Hof-Farm: jede geschaffte Tagesaufgabe verkuerzt dort die laufenden Arbeiten (siehe farm-meldung.js)
      try { if (typeof FarmMeldung !== 'undefined') FarmMeldung.schulaufgaben(); } catch (e) { /* Spiel darf das Training nie stoeren */ }
    }
  }

  /** Noch fehlende Einheiten (fuer Sitzungen, die nur den Rest abfragen sollen);
   *  ist der Punkt schon erledigt, ersatzweise `fallback`. */
  function restAnzahl(id, fallback) {
    const item = PLAN.find(i => i.id === id);
    const s = stand(item);
    return s.fertig ? fallback : Math.max(1, s.z - s.n);
  }

  // Chips fuer den Tagesplan-Bereich der Startseite (siehe App.baueTagesplan).
  function chips() {
    return PLAN.map(item => {
      const s = stand(item);
      return {
        fach: item.fach, icon: item.icon, fachName: wert(item.text), titel: item.titel,
        badge: s.fertig ? '✅ Geschafft' : `${s.n} von ${s.z}`, geschafft: s.fertig,
        onclick: `Ferientraining.starte('${item.id}')`
      };
    });
  }

  // Grundbegriffe-Karteikarten (siehe grundbegriffe.js): vor den Tagesaufgaben von Mathe/Deutsch wird
  // automatisch angeboten, erst die Karten zu ueben, solange die Grundbegriffe noch nicht sitzen.
  // Die Aufgaben selbst bleiben unveraendert Pflicht.
  // AUS (20.10.2026): die Grundbegriffe-Karten stehen jetzt als eigene Zeile ueber der jeweiligen Aufgabe
  // (PLAN: gb_mathe, gb_deutsch) - das Zusatz-Angebot vor den Aufgaben waere doppelt.
  const ANGEBOT_VOR_AUFGABEN = false;
  const GRUNDBEGRIFFE_FACH = { mathe_tag: 'mathe', mathe_rechenarten: 'mathe', deutsch_tag: 'deutsch' };

  function starte(id) {
    const item = PLAN.find(i => i.id === id);
    if (!item) return;
    const fach = GRUNDBEGRIFFE_FACH[id];
    if (ANGEBOT_VOR_AUFGABEN && fach && typeof Grundbegriffe !== 'undefined' && !Storage.getFerienErledigt(id) &&
        Grundbegriffe.bieteAn(fach, item.titel, () => item.start())) return;
    item.start();
  }

  function renderListe() {
    const erledigt = anzahlErledigt();
    const alle = erledigt === PLAN.length;
    const zeilen = PLAN.map(item => {
      const s = stand(item);
      const prozent = Math.min(100, Math.round(s.n / s.z * 100));
      return `
        <div class="ft-zeile${s.fertig ? ' ft-fertig' : ''}" onclick="Ferientraining.starte('${item.id}')">
          <span class="ft-haken">${s.fertig ? '✓' : ''}</span>
          <span class="ft-text">
            <span class="ft-titel">${item.titel}</span>
            <span class="ft-sub">${wert(item.text)}</span>
            <span class="ft-balken"><span class="ft-balken-fuell" style="width:${prozent}%"></span></span>
          </span>
          <span class="ft-stand">${s.fertig ? 'Geschafft!' : `${Math.min(s.n, s.z)} / ${s.z} ${item.einheit}`}</span>
        </div>`;
    }).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Deine Aufgaben heute</div>
      <div class="lese-text">${alle ? 'Alles geschafft für heute! 🎉 Super gemacht!' : `Heute: ${erledigt} von ${PLAN.length} erledigt. Tippe auf eine Aufgabe, um loszulegen.`}</div>
      <div class="ft-liste">${zeilen}</div>
    `);
  }

  /** Dashboard-Karte fuer die Startseite: Fortschrittsbalken + Checkliste, Tippen startet den Punkt.
   *  extraZeileHtml (optional): z.B. die naechste Geschichte als "Extra" unter der Liste. */
  function homeKarteHtml(extraZeileHtml) {
    const erledigt = anzahlErledigt();
    const alle = erledigt === PLAN.length;
    const prozent = Math.round(erledigt / PLAN.length * 100);
    const zeilen = PLAN.map(item => {
      const s = stand(item);
      return `
        <div class="fth-zeile${s.fertig ? ' fth-fertig' : ''}" onclick="Ferientraining.starte('${item.id}')">
          <span class="fth-haken">${s.fertig ? '✓' : ''}</span>
          <span class="fth-text"><span class="fth-titel">${item.titel}</span><span class="fth-sub">${wert(item.text)}</span></span>
          <span class="fth-stand">${s.fertig ? 'Geschafft!' : `${Math.min(s.n, s.z)} / ${s.z}`}</span>
        </div>`;
    }).join('');
    return `
      <div class="fth-karte">
        <div class="fth-kopf" onclick="Ferientraining.renderListe()">
          <span class="fth-kopf-titel">Deine Aufgaben heute</span>
          <span class="fth-kopf-zahl">${erledigt}<small> von ${PLAN.length}</small></span>
        </div>
        <div class="fth-balken"><div style="width:${prozent}%"></div></div>
        ${alle ? '<div class="fth-alles">Alles geschafft für heute! 🎉</div>' : ''}
        ${zeilen}
        ${extraZeileHtml || ''}
      </div>`;
  }

  /** Zusatz-Button "Zurück zum Ferientraining" fuer die Ergebnis-Bildschirme. */
  function rueckkehrButtonHtml() {
    return `<div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Ferientraining.renderListe()">Zurück zu deinen Aufgaben (${anzahlErledigt()} von ${PLAN.length})</div>`;
  }

  /** Heutige Punkte fuer die Hof-Farm: [{ id, titel, fertig, n, z, richtig }] */
  function liste() { return PLAN.map(i => { const s = stand(i); return { id: i.id, titel: i.titel, fertig: s.fertig, n: s.n, z: s.z, richtig: Math.min(s.n, Storage.getFerienRichtig(i.id)) }; }); }

  return { liste, melde, abschluss, restAnzahl, chips, homeKarteHtml, starte, renderListe, rueckkehrButtonHtml, anzahlErledigt, anzahlPunkte: () => PLAN.length };
})();
