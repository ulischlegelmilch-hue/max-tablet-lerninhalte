// Lernrunden für den Hof-Bonus (seit 15.11.2026; vorher die Tagesaufgaben-Liste „Such dir heute etwas aus“).
//
// 15.11.2026, Uli: „Streich die Tagesaufgaben. Ab jetzt muss Max erst mal aus den Kategorien wählen, was er macht.“
// – „Bonus sollte nicht wegfallen.“ Darum gibt es keine Liste und keine Startseiten-Karte mehr. PLAN ist nur noch
// die Liste der Lernarten, die auf der Hof-Farm zählen: Jede fertige Runde einer Lernart (einmal am Tag je Art)
// macht dort alles schneller, je mehr beim ersten Versuch richtig, desto mehr (siehe farm-meldung.js schulaufgaben).
//
// Zählen: Storage.getFerienZaehler(id) = heute zum ersten Mal beantwortete Aufgaben/bewertete Karten,
// Storage.getFerienRichtig(id) = davon richtig. „Fertig“ ist eine Art, sobald heute eine Runde davon komplett
// abgeschlossen ist (Ferientraining.abschluss), inklusive der Wiederholungen falscher Aufgaben/Karten.
//
// Neue Lernart: Eintrag hier + in der Sitzung ferienItem/melde/abschluss mit derselben id.
// Quizze ohne eigene id zählen über ihr pensumFach (App.startQuizSession, RUNDE_FUER_FACH).
// Der Name „Ferientraining“ bleibt, weil Hof-Farm, Sitzungen und Tests ihn benutzen.
const Ferientraining = (function () {
  const PLAN = [
    // ziel = Rundengröße beim ersten Start am Tag (App.starteFerienQuiz holt nur den heute noch fehlenden Rest)
    { id: 'mathe_mio', titel: 'Mathe: Zahlen bis 1 000 000', ziel: () => 10 },
    { id: 'mathe_tag', titel: 'Mathe: Zahlen bis 10 000', ziel: () => 10 },
    { id: 'mathe_gemischt', titel: 'Mathe: Übungen', ziel: () => 10 },
    { id: 'mathe_malfolgen', titel: 'Malfolgen', ziel: () => Math.min(40, Mathe.malfolgenAnzahl()) },
    { id: 'geometrie_karten', titel: 'Geometrie-Lernkarten', ziel: () => 6 },
    { id: 'geometrie', titel: 'Geometrie-Aufgaben', ziel: () => 10 },
    { id: 'gb_mathe', titel: 'Mathe-Grundbegriffe', ziel: () => 10 },
    { id: 'deutsch_gemischt', titel: 'Deutsch-Aufgaben', ziel: () => 10 },
    { id: 'gb_deutsch', titel: 'Deutsch-Grundbegriffe', ziel: () => 10 },
    { id: 'deutsch_tag', titel: 'Deutsch: Fälle & Regeln', ziel: () => 10 },
    { id: 'deutsch_lesen', titel: 'Deutsch: Lesen', ziel: () => 8 },
    { id: 'sport_karten', titel: 'Sport-Lernkarten', ziel: () => 6 },
    { id: 'musik_karten', titel: 'Musik-Lernkarten', ziel: () => 6 },
    { id: 'musik_zeichnen', titel: 'Noten zeichnen', ziel: () => 6 },
    { id: 'musik_taktstriche', titel: 'Taktstriche setzen', ziel: () => 5 }
  ];

  function wert(x) { return typeof x === 'function' ? x() : x; }
  const finde = id => PLAN.find(i => i.id === id);

  function stand(item) {
    const n = Storage.getFerienZaehler(item.id);
    let z = 10;
    try { z = Math.max(1, wert(item.ziel)); } catch (e) { /* z.B. Mathe noch nicht geladen */ }
    return { n, z, fertig: Storage.getFerienErledigt(item.id) };
  }

  function anzahlErledigt() { return PLAN.filter(i => stand(i).fertig).length; }

  /** Zählt eine erledigte Einheit (unbekannte ids werden ignoriert). */
  function melde(id, korrekt) {
    if (!finde(id)) return;
    Storage.meldeFerienFortschritt(id, korrekt);
  }

  /** Runde der Lernart ist komplett (inkl. Wiederholungen) -> heute fertig, Hof-Farm bekommt den Bonus. */
  function abschluss(id) {
    if (!finde(id)) return;
    Storage.setFerienErledigt(id);
    try { if (typeof FarmMeldung !== 'undefined') FarmMeldung.schulaufgaben(); } catch (e) { /* Spiel darf das Lernen nie stören */ }
  }

  /** Noch fehlende Einheiten der ersten Runde heute; ist die Art schon fertig (oder unbekannt): `fallback`. */
  function restAnzahl(id, fallback) {
    const item = finde(id);
    if (!item) return fallback;
    const s = stand(item);
    return s.fertig ? fallback : Math.max(1, s.z - s.n);
  }

  /** Früher „Zurück zur Auswahl“ auf den Ergebnis-Seiten – die Auswahl ist jetzt die Startseite. */
  function rueckkehrButtonHtml() { return ''; }
  function renderListe() { App.gotoHome(); }

  /** Heutige Lernarten für die Hof-Farm: [{ id, titel, fertig, n, z, richtig }] */
  function liste() { return PLAN.map(i => { const s = stand(i); return { id: i.id, titel: i.titel, fertig: s.fertig, n: s.n, z: s.z, richtig: Math.min(s.n, Storage.getFerienRichtig(i.id)) }; }); }

  /** Heute schon fertig? (für den Haken auf den Kategorie-Karten der Startseite) */
  function heuteFertig(ids) { return ids.some(id => finde(id) && Storage.getFerienErledigt(id)); }

  return { liste, melde, abschluss, restAnzahl, renderListe, rueckkehrButtonHtml, anzahlErledigt, heuteFertig, anzahlPunkte: () => PLAN.length };
})();
