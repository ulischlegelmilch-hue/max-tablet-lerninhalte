// Punkte-, Level- und Statistik-Verwaltung (localStorage)
const Storage = (function () {
  const KEY = 'maxlernt_state_v1';

  function defaultState() {
    return {
      sterne: 0,
      streak: 0,
      stats: {
        mathe: { richtig: 0, falsch: 0 },
        deutsch: { richtig: 0, falsch: 0 },
        lesen: { richtig: 0, falsch: 0 },
        heimat: { richtig: 0, falsch: 0 }
      },
      leseFortschritt: {},
      malfolgen: {},
      matheKategorien: {},
      schach: { stufe: 0, siege: 0 },
      // Kalendertag-Streak fuer den Startbildschirm ("X Tage in Folge dabei") -
      // bewusst ein eigenes Feld, nicht zu verwechseln mit `streak` oben, das nur
      // aufeinanderfolgende RICHTIGE ANTWORTEN innerhalb einer Sitzung zaehlt.
      tagesStreak: { anzahl: 0, letzterAktivTag: null },
      // Von Uli manuell gesetzte Ausnahmen fuer "welches Fach ist heute die
      // Tagesaufgabe" (siehe getTagesFach) - jeder Eintrag:
      // { typ: 'einzeltag', datum: 'YYYY-MM-DD', fach } |
      // { typ: 'zeitraum', von: 'YYYY-MM-DD', bis: 'YYYY-MM-DD', fach } |
      // { typ: 'wochenende', fach }
      tagesplanRegeln: [],
      // Welche 1er-10er-Reihen bei den Malfolgen abgefragt werden (Uli kann
      // das im Eltern-Bereich einschränken, damit Max klein anfangen kann) -
      // standardmäßig alle, damit sich am Verhalten nichts ändert, solange
      // niemand etwas einstellt.
      malfolgenReihen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      // Fortschritt im Taktik-Puzzletrainer, ein Eintrag pro Thema (siehe
      // TAKTIK_REIHENFOLGE) - rating steuert die adaptive Puzzle-Auswahl
      // (naeher am eigenen Rating = passende Schwierigkeit), zuletztGeloest
      // vermeidet, dass dieselben paar Puzzles direkt wiederholt werden.
      taktik: {},
      // Bestzeiten/Statistik fuers Konzentrationstraining (siehe konzentration.js).
      // koordinatenBestzeitMs: schnellste absolvierte 10er-Runde "Koordinaten
      // finden" in Millisekunden, null solange keine Runde beendet wurde.
      konzentration: { koordinatenBestzeitMs: null },
      // Schach-eigener Tagesplan (Taktik + Konzentration + evtl. Strategie,
      // siehe generiereSchachTagesplanSchritte) - unabhaengig vom allgemeinen
      // Tagesplan-Banner auf dem Startbildschirm (tagesplanRegeln oben), der
      // ist fuer Mathe/Deutsch. datum steuert, wann ein neuer Plan noetig ist.
      schachTagesplan: { datum: null, schritte: [] },
      // Vom Handy aus gesetzter Stand (siehe fernsync.js) - rein clientseitig
      // gecacht, wird bei jedem erfolgreichen Poll gegen das Max-Tablet-Backend
      // komplett ersetzt.
      fernstand: { regeln: [], zusatzaufgaben: [] },
      // Fortschritt in bildbasierten Buechern (Lesemodus, siehe lesemodus.js) -
      // eigenes Feld statt leseFortschritt, weil Buecher seitenbasiert sind
      // (Seitenzahl statt scrollTop) und keine Verstaendnisfragen haben.
      buchFortschritt: {}
    };
  }

  // Reihenfolge, in der die Taktik-Themen freigeschaltet werden (siehe
  // getTaktikFreigeschaltet) - folgt der paedagogischen Empfehlung
  // Gabel -> Fesselung -> Spieß -> Abzugsangriff (Gabeln sind fuer Kinder am
  // leichtesten zu erkennen, Abzugsangriffe am schwersten).
  const TAKTIK_REIHENFOLGE = ['fork', 'pin', 'skewer', 'discoveredAttack'];
  const TAKTIK_START_RATING = 700;
  // Ab wie vielen geloesten Aufgaben mit welcher Mindest-Trefferquote ein
  // Thema als "sitzt gut genug" gilt, um das naechste freizuschalten -
  // bewusst grosszuegig (70%), da "Genauigkeit vor Geschwindigkeit" das Ziel
  // ist, nicht Perfektion.
  const TAKTIK_FREISCHALT_MIN_VERSUCHE = 15;
  const TAKTIK_FREISCHALT_MIN_QUOTE = 0.7;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();

  function level() {
    return Math.floor(state.sterne / 100) + 1;
  }

  function heutigesDatum(versatzTage) {
    const d = new Date();
    if (versatzTage) d.setDate(d.getDate() + versatzTage);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Zaehlt den heutigen Kalendertag als "aktiv" fuer den Tages-Streak - wird
   *  bewusst erst bei einer ECHTEN Lernaktion aufgerufen (erste beantwortete
   *  Frage oder erster Schachsieg des Tages), nicht schon beim bloßen Oeffnen
   *  der App, damit der Streak wirklich "gelernt" statt nur "Tablet an" misst. */
  function registriereAktivenTag() {
    if (!state.tagesStreak) state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    const heute = heutigesDatum();
    if (state.tagesStreak.letzterAktivTag === heute) return;
    const gestern = heutigesDatum(-1);
    state.tagesStreak.anzahl = state.tagesStreak.letzterAktivTag === gestern ? state.tagesStreak.anzahl + 1 : 1;
    state.tagesStreak.letzterAktivTag = heute;
    save(state);
  }

  function getTagesStreak() {
    if (!state.tagesStreak) state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    return state.tagesStreak;
  }

  function getTagesplanRegeln() {
    if (!state.tagesplanRegeln) state.tagesplanRegeln = [];
    return state.tagesplanRegeln;
  }

  function setTagesplanRegeln(regeln) {
    state.tagesplanRegeln = regeln;
    save(state);
  }

  /** Sucht in EINER Regelliste nach einer heute zutreffenden Regel - Einzeltag
   *  vor Zeitraum vor Wochenende. null, wenn keine passt. Ausgelagert aus
   *  getTagesFach, damit sowohl die lokalen als auch die vom Handy synchronisierten
   *  Fern-Regeln (siehe getFernRegeln) mit derselben Logik geprueft werden koennen. */
  function findeZutreffendeRegel(regeln, heute, heuteIso) {
    const einzeltag = regeln.find(r => r.typ === 'einzeltag' && r.datum === heuteIso);
    if (einzeltag) return einzeltag;

    const zeitraum = regeln.find(r => r.typ === 'zeitraum' && r.von <= heuteIso && heuteIso <= r.bis);
    if (zeitraum) return zeitraum;

    const istWochenende = heute.getDay() === 0 || heute.getDay() === 6;
    if (istWochenende) {
      const wochenendeRegel = regeln.find(r => r.typ === 'wochenende');
      if (wochenendeRegel) return wochenendeRegel;
    }
    return null;
  }

  /** Welches Fach (mathe/deutsch) ist heute als Tagesaufgabe im Tagesplan
   *  hervorgehoben? Prueft zuerst die vom Handy synchronisierten Fern-Regeln
   *  (siehe fernsync.js - die sind "frischer", Papa hat sie gerade eben gesetzt),
   *  dann Ulis lokal am Tablet gesetzte Regeln, und faellt sonst auf eine feste
   *  taegliche Abwechslung zurueck (gerader Tag im Jahr = Mathe, ungerader =
   *  Deutsch), damit ohne jede Regel trotzdem taeglich gewechselt wird. Das
   *  andere Fach bleibt im Tagesplan immer zusaetzlich als "Extra" antippbar -
   *  diese Funktion sperrt nichts, sie entscheidet nur, was hervorgehoben wird. */
  function getTagesFach() {
    const heute = new Date();
    const heuteIso = heutigesDatum();

    const fernTreffer = findeZutreffendeRegel(getFernRegeln(), heute, heuteIso);
    if (fernTreffer) return fernTreffer.fach;

    const lokalerTreffer = findeZutreffendeRegel(getTagesplanRegeln(), heute, heuteIso);
    if (lokalerTreffer) return lokalerTreffer.fach;

    const jahresanfang = new Date(heute.getFullYear(), 0, 1);
    const tagDesJahres = Math.floor((heute - jahresanfang) / 86400000);
    return tagDesJahres % 2 === 0 ? 'mathe' : 'deutsch';
  }

  /** Vom Handy aus (ueber das Max-Tablet-Backend) gesetzte Regeln + freie
   *  Zusatzaufgaben - siehe fernsync.js. Rein clientseitig gecached, wird bei
   *  jedem erfolgreichen Poll komplett ueberschrieben (Server ist die Quelle
   *  der Wahrheit); ohne Internet/Backend bleibt einfach der letzte Stand. */
  function getFernRegeln() {
    if (!state.fernstand) state.fernstand = { regeln: [], zusatzaufgaben: [] };
    return state.fernstand.regeln;
  }

  function getFernZusatzaufgaben() {
    if (!state.fernstand) state.fernstand = { regeln: [], zusatzaufgaben: [] };
    return state.fernstand.zusatzaufgaben;
  }

  function setFernstand(regeln, zusatzaufgaben) {
    state.fernstand = { regeln: regeln || [], zusatzaufgaben: zusatzaufgaben || [] };
    save(state);
  }

  /** Optimistisches lokales Abhaken direkt nach dem Antippen, bevor die
   *  Server-Bestaetigung (per POST, siehe fernsync.js) zurueck ist - damit sich
   *  der Haken beim Antippen sofort und nicht erst nach dem naechsten Poll zeigt. */
  function markiereFernZusatzaufgabeLokalErledigt(id) {
    if (!state.fernstand) return;
    const a = state.fernstand.zusatzaufgaben.find(x => x.id === id);
    if (a) { a.erledigt = true; save(state); }
  }

  // faktor steuert den Punkteanteil: 1 = voller Erfolg (1. Versuch), 0.5 = halbe
  // Punkte (2. Versuch ohne Hilfe), 0 = keine Punkte (Hilfe angesehen) - siehe
  // App.verarbeiteQuizAntwort in app.js. korrekt && faktor<=0 zaehlt bewusst wie
  // "falsch" fuer Streak/Statistik, weil ohne Hilfe noch nicht sicher gekonnt.
  function addAntwort(fach, korrekt, faktor) {
    if (faktor === undefined) faktor = 1;
    registriereAktivenTag();
    if (!state.stats[fach]) state.stats[fach] = { richtig: 0, falsch: 0 };
    let gained = 0;
    if (korrekt && faktor > 0) {
      state.streak++;
      const bonus = Math.min(state.streak, 5);
      gained = Math.round((10 + bonus) * faktor);
      state.sterne += gained;
      state.stats[fach].richtig++;
    } else {
      state.streak = 0;
      state.stats[fach].falsch++;
    }
    save(state);
    return gained;
  }

  function getState() {
    return state;
  }

  function saveLeseFortschritt(index, scrollTop) {
    if (!state.leseFortschritt) state.leseFortschritt = {};
    const bestehend = state.leseFortschritt[index];
    state.leseFortschritt[index] = {
      scrollTop: scrollTop,
      fertig: bestehend ? bestehend.fertig : false
    };
    save(state);
  }

  function getLeseFortschritt(index) {
    return (state.leseFortschritt && state.leseFortschritt[index]) || null;
  }

  function markGeschichteFertig(index) {
    if (!state.leseFortschritt) state.leseFortschritt = {};
    if (!state.leseFortschritt[index]) state.leseFortschritt[index] = { scrollTop: 0 };
    state.leseFortschritt[index].fertig = true;
    save(state);
  }

  /** Fortschritt in einem Lesemodus-Buch (siehe lesemodus.js) - buchId ist ein
   *  fester String-Schluessel (z.B. "enzo"), nicht wie bei Geschichten ein Index. */
  function getBuchFortschritt(buchId) {
    return (state.buchFortschritt && state.buchFortschritt[buchId]) || null;
  }

  function saveBuchSeite(buchId, seite) {
    if (!state.buchFortschritt) state.buchFortschritt = {};
    const bestehend = state.buchFortschritt[buchId];
    state.buchFortschritt[buchId] = { seite, fertig: bestehend ? bestehend.fertig : false };
    save(state);
  }

  function markBuchFertig(buchId) {
    if (!state.buchFortschritt) state.buchFortschritt = {};
    if (!state.buchFortschritt[buchId]) state.buchFortschritt[buchId] = { seite: 0 };
    const warSchonFertig = state.buchFortschritt[buchId].fertig;
    state.buchFortschritt[buchId].fertig = true;
    save(state);
    return !warSchonFertig; // true, wenn dies das erste Mal ist (fuer Sterne-Vergabe)
  }

  /** Karteikarten-Statistik pro Malfolge (z. B. "3x7"): wie oft falsch beantwortet
   *  und wie viele Male in Folge zuletzt richtig - dient dazu, schwache Fakten
   *  in kuenftigen Malfolgen-Sitzungen haeufiger vorzulegen. */
  function getMalfolgenStats() {
    if (!state.malfolgen) state.malfolgen = {};
    return state.malfolgen;
  }

  function meldeMalfolgenErgebnis(fakt, korrekt) {
    if (!state.malfolgen) state.malfolgen = {};
    const stat = state.malfolgen[fakt] || { falsch: 0, serie: 0 };
    if (korrekt) {
      stat.serie = (stat.serie || 0) + 1;
    } else {
      stat.falsch = (stat.falsch || 0) + 1;
      stat.serie = 0;
    }
    state.malfolgen[fakt] = stat;
    save(state);
  }

  /** Welche 1er-10er-Reihen bei den Malfolgen abgefragt werden - siehe
   *  defaultState fuer den Hintergrund. Mindestens eine Reihe bleibt immer
   *  aktiv (leeres Array wuerde die Malfolgen-Uebung funktionslos machen). */
  function getMalfolgenReihen() {
    if (!state.malfolgenReihen || state.malfolgenReihen.length === 0) {
      state.malfolgenReihen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    return state.malfolgenReihen;
  }

  function setMalfolgenReihen(reihen) {
    if (!reihen || reihen.length === 0) return;
    state.malfolgenReihen = reihen;
    save(state);
  }

  function leererTaktikEintrag() {
    return { rating: TAKTIK_START_RATING, richtig: 0, falsch: 0, zuletztGeloest: [] };
  }

  /** Fortschritt je Taktik-Thema (fork/pin/skewer/discoveredAttack): Rating
   *  (steuert die Puzzle-Auswahl im Trainer), Trefferstatistik, zuletzt
   *  geloeste Puzzle-IDs. */
  function getTaktikStats() {
    if (!state.taktik) state.taktik = {};
    for (const thema of TAKTIK_REIHENFOLGE) {
      if (!state.taktik[thema]) state.taktik[thema] = leererTaktikEintrag();
    }
    return state.taktik;
  }

  /** Nach jedem geloesten (oder falsch geloesten) Taktik-Puzzle: passt das
   *  Rating fuers Thema leicht an (naeher an "gerade richtige Schwierigkeit"
   *  statt hartem Stufensystem) und merkt sich die Puzzle-ID, damit der
   *  Trainer sie in der naechsten Auswahl meidet. */
  function meldeTaktikErgebnis(thema, korrekt, puzzleId) {
    registriereAktivenTag();
    const stats = getTaktikStats();
    const stat = stats[thema];
    if (korrekt) {
      stat.richtig++;
      stat.rating = Math.min(1100, stat.rating + 25);
    } else {
      stat.falsch++;
      stat.rating = Math.max(500, stat.rating - 15);
    }
    stat.zuletztGeloest.push(puzzleId);
    if (stat.zuletztGeloest.length > 15) stat.zuletztGeloest.shift();
    save(state);
    return stat;
  }

  /** Welche Taktik-Themen sind schon anklickbar? Immer das erste
   *  (TAKTIK_REIHENFOLGE[0]), jedes weitere erst wenn das vorherige Thema
   *  genug (und gut genug) geuebt wurde - siehe TAKTIK_FREISCHALT_*. */
  function getTaktikFreigeschaltet() {
    const stats = getTaktikStats();
    const freigeschaltet = [TAKTIK_REIHENFOLGE[0]];
    for (let i = 1; i < TAKTIK_REIHENFOLGE.length; i++) {
      const vorher = stats[TAKTIK_REIHENFOLGE[i - 1]];
      const versuche = vorher.richtig + vorher.falsch;
      const quote = versuche > 0 ? vorher.richtig / versuche : 0;
      if (versuche >= TAKTIK_FREISCHALT_MIN_VERSUCHE && quote >= TAKTIK_FREISCHALT_MIN_QUOTE) {
        freigeschaltet.push(TAKTIK_REIHENFOLGE[i]);
      } else {
        break;
      }
    }
    return freigeschaltet;
  }

  const KONZENTRATION_SPIELE = ['koordinaten', 'feldfarbe', 'laeuferweg'];
  const STRATEGIE_QUIZZES = ['eroeffnung', 'material', 'bauern'];

  function tagDesJahres(datum) {
    return Math.floor((datum - new Date(datum.getFullYear(), 0, 1)) / 86400000);
  }

  /** Baut die 2-3 Schritte des heutigen Schach-Tagesplans: immer 1 Taktik-Puzzle-
   *  Runde zum aktuell am weitesten fortgeschrittenen (nicht zwingend gemeisterten)
   *  Thema, immer 1 Konzentrationsuebung (taeglich rotierend durch alle drei, fuer
   *  Abwechslung), und nur an jedem dritten Tag zusaetzlich 1 Strategie-Quiz -
   *  haelt den Plan an den meisten Tagen kurz (15-20 Minuten Zielrahmen). */
  function generiereSchachTagesplanSchritte() {
    const heute = new Date();
    const tag = tagDesJahres(heute);
    const frei = getTaktikFreigeschaltet();
    const schritte = [
      { typ: 'taktik', thema: frei[frei.length - 1], erledigt: false },
      { typ: 'konzentration', spiel: KONZENTRATION_SPIELE[tag % KONZENTRATION_SPIELE.length], erledigt: false }
    ];
    if (tag % 3 === 0) {
      schritte.push({ typ: 'strategie', quiz: STRATEGIE_QUIZZES[Math.floor(tag / 3) % STRATEGIE_QUIZZES.length], erledigt: false });
    }
    return schritte;
  }

  /** Liefert den Schach-Tagesplan fuer heute - erzeugt automatisch einen neuen,
   *  sobald sich das Kalenderdatum seit dem letzten Aufruf geaendert hat. */
  function getSchachTagesplan() {
    if (!state.schachTagesplan) state.schachTagesplan = { datum: null, schritte: [] };
    const heute = heutigesDatum();
    if (state.schachTagesplan.datum !== heute) {
      state.schachTagesplan = { datum: heute, schritte: generiereSchachTagesplanSchritte() };
      save(state);
    }
    return state.schachTagesplan;
  }

  /** Hakt den ersten noch offenen Schritt vom Typ `typ` im heutigen Schach-
   *  Tagesplan ab - wird von JEDER Taktik-/Konzentrations-/Strategie-Uebung beim
   *  Abschluss aufgerufen, unabhaengig davon ob sie ueber den Tagesplan-Button
   *  oder direkt ueber das jeweilige Menue gestartet wurde (Hauptsache, geuebt
   *  wurde). Kein Fehler, wenn kein passender offener Schritt existiert. */
  function meldeTagesplanSchrittErledigt(typ) {
    const plan = getSchachTagesplan();
    const schritt = plan.schritte.find(s => s.typ === typ && !s.erledigt);
    if (schritt) {
      schritt.erledigt = true;
      save(state);
    }
  }

  function getKonzentrationBestzeit() {
    if (!state.konzentration) state.konzentration = { koordinatenBestzeitMs: null };
    return state.konzentration.koordinatenBestzeitMs;
  }

  /** Meldet die Zeit einer abgeschlossenen "Koordinaten finden"-Runde (in ms) -
   *  aktualisiert die Bestzeit nur, wenn die neue Runde schneller war. */
  function meldeKoordinatenZeit(zeitMs) {
    registriereAktivenTag();
    if (!state.konzentration) state.konzentration = { koordinatenBestzeitMs: null };
    const bisherige = state.konzentration.koordinatenBestzeitMs;
    const istNeuerRekord = bisherige === null || zeitMs < bisherige;
    if (istNeuerRekord) state.konzentration.koordinatenBestzeitMs = zeitMs;
    save(state);
    return { istNeuerRekord, bestzeitMs: state.konzentration.koordinatenBestzeitMs };
  }

  /** Wie getMalfolgenStats/meldeMalfolgenErgebnis, nur pro Aufgaben-Bereich der
   *  Tagesaufgabe (z. B. "einmaleins", "textaufgaben") statt pro Einzelfakt -
   *  damit sich die taegliche Mischung automatisch an Max' Schwaechen anpasst. */
  function getMatheKategorienStats() {
    if (!state.matheKategorien) state.matheKategorien = {};
    return state.matheKategorien;
  }

  function meldeMatheKategorieErgebnis(kategorie, korrekt) {
    if (!state.matheKategorien) state.matheKategorien = {};
    const stat = state.matheKategorien[kategorie] || { falsch: 0, serie: 0 };
    if (korrekt) {
      stat.serie = (stat.serie || 0) + 1;
    } else {
      stat.falsch = (stat.falsch || 0) + 1;
      stat.serie = 0;
    }
    state.matheKategorien[kategorie] = stat;
    save(state);
  }

  /** Generische Sternevergabe fuer Erfolge außerhalb des Quiz-Systems (z. B. eine
   *  gewonnene Schachpartie). */
  function addSterne(betrag) {
    state.sterne += betrag;
    save(state);
  }

  /** Fortschritt auf der Schach-Schwierigkeitsleiter: aktuelle Stufe (Index)
   *  und Siege auf dieser Stufe seit dem letzten Aufstieg. */
  function getSchachFortschritt() {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    return state.schach;
  }

  function meldeSchachSieg() {
    registriereAktivenTag();
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.siege++;
    save(state);
    return state.schach;
  }

  /** Fortschritt fuer eine einfache Fach-Kachel (Mathe/Deutsch/Heimat): Anzahl
   *  richtig geloester Aufgaben. Geschichten und Schach haben eigene Anzeigen
   *  (siehe getGeschichtenFortschritt/getSchachFortschritt), da dort "Aufgaben
   *  geloest" nicht die passende Kennzahl ist. */
  function getFachFortschritt(fach) {
    return { geloest: (state.stats[fach] && state.stats[fach].richtig) || 0 };
  }

  /** Anzahl fertig gelesener Geschichten von insgesamt 7 - die 7 ist an die
   *  Anzahl der Geschichten in geschichten.js gekoppelt und muss synchron
   *  gehalten werden, bis es dafuer eine gemeinsame Konstante gibt. */
  function getGeschichtenFortschritt() {
    const eintraege = state.leseFortschritt ? Object.values(state.leseFortschritt) : [];
    const fertig = eintraege.filter(e => e.fertig).length;
    return { fertig, gesamt: 7 };
  }

  function schachStufeAufsteigen() {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.stufe++;
    state.schach.siege = 0;
    save(state);
  }

  /** Max waehlt die Stufe fuer die naechste Partie selbst - unabhaengig vom
   *  Sieg-Zaehler, der nur noch fuer den "Stufe geschafft"-Hinweis mitlaeuft. */
  function setSchachStufe(stufe) {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.stufe = stufe;
    state.schach.siege = 0;
    save(state);
  }

  /** Setzt Max' kompletten Lernfortschritt zurueck (Punkte, gelöste Aufgaben
   *  je Fach, Karteikarten-Gewichtung, Lese-/Buch-Fortschritt, Schach-/Taktik-/
   *  Konzentrations-Stand, Tages-Streak) - fuer einen echten Neustart, z. B.
   *  wenn ein neues Kind das Tablet uebernimmt. Bewusst NICHT zurueckgesetzt:
   *  tagesplanRegeln und malfolgenReihen (Ulis Eltern-Einstellungen bleiben
   *  erhalten) sowie fernstand (wird beim naechsten Poll vom Backend eh
   *  ueberschrieben). Nur ueber den PIN-geschuetzten Eltern-Bereich aufrufbar
   *  (siehe App.oeffneEinstellungen), da unwiderruflich. */
  function resetFortschritt() {
    state.sterne = 0;
    state.streak = 0;
    state.stats = {
      mathe: { richtig: 0, falsch: 0 },
      deutsch: { richtig: 0, falsch: 0 },
      lesen: { richtig: 0, falsch: 0 },
      heimat: { richtig: 0, falsch: 0 }
    };
    state.leseFortschritt = {};
    state.buchFortschritt = {};
    state.malfolgen = {};
    state.matheKategorien = {};
    state.schach = { stufe: 0, siege: 0 };
    state.taktik = {};
    state.konzentration = { koordinatenBestzeitMs: null };
    state.schachTagesplan = { datum: null, schritte: [] };
    state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    save(state);
  }

  return {
    addAntwort, getState, level, saveLeseFortschritt, getLeseFortschritt, markGeschichteFertig,
    getMalfolgenStats, meldeMalfolgenErgebnis, getMalfolgenReihen, setMalfolgenReihen,
    getMatheKategorienStats, meldeMatheKategorieErgebnis, addSterne,
    getSchachFortschritt, meldeSchachSieg, schachStufeAufsteigen, setSchachStufe,
    getTagesStreak, getFachFortschritt, getGeschichtenFortschritt,
    getTagesplanRegeln, setTagesplanRegeln, getTagesFach,
    getTaktikStats, meldeTaktikErgebnis, getTaktikFreigeschaltet,
    getKonzentrationBestzeit, meldeKoordinatenZeit,
    getSchachTagesplan, meldeTagesplanSchrittErledigt,
    getFernRegeln, getFernZusatzaufgaben, setFernstand, markiereFernZusatzaufgabeLokalErledigt,
    getBuchFortschritt, saveBuchSeite, markBuchFertig, resetFortschritt
  };
})();
