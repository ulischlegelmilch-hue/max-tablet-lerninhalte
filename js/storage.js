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
      tagesplanRegeln: []
    };
  }

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

  /** Welches Fach (mathe/deutsch) ist heute als Tagesaufgabe im Tagesplan
   *  hervorgehoben? Prueft zuerst Ulis manuell gesetzte Regeln - Einzeltag vor
   *  Zeitraum vor Wochenende - und faellt sonst auf eine feste taegliche
   *  Abwechslung zurueck (gerader Tag im Jahr = Mathe, ungerader = Deutsch),
   *  damit ohne jede Regel trotzdem taeglich gewechselt wird. Das andere Fach
   *  bleibt im Tagesplan immer zusaetzlich als "Extra" antippbar - diese
   *  Funktion sperrt nichts, sie entscheidet nur, was hervorgehoben wird. */
  function getTagesFach() {
    const heute = new Date();
    const heuteIso = heutigesDatum();
    const regeln = getTagesplanRegeln();

    const einzeltag = regeln.find(r => r.typ === 'einzeltag' && r.datum === heuteIso);
    if (einzeltag) return einzeltag.fach;

    const zeitraum = regeln.find(r => r.typ === 'zeitraum' && r.von <= heuteIso && heuteIso <= r.bis);
    if (zeitraum) return zeitraum.fach;

    const istWochenende = heute.getDay() === 0 || heute.getDay() === 6;
    if (istWochenende) {
      const wochenendeRegel = regeln.find(r => r.typ === 'wochenende');
      if (wochenendeRegel) return wochenendeRegel.fach;
    }

    const jahresanfang = new Date(heute.getFullYear(), 0, 1);
    const tagDesJahres = Math.floor((heute - jahresanfang) / 86400000);
    return tagDesJahres % 2 === 0 ? 'mathe' : 'deutsch';
  }

  function addAntwort(fach, korrekt) {
    registriereAktivenTag();
    if (!state.stats[fach]) state.stats[fach] = { richtig: 0, falsch: 0 };
    if (korrekt) {
      state.streak++;
      const bonus = Math.min(state.streak, 5);
      state.sterne += 10 + bonus;
      state.stats[fach].richtig++;
    } else {
      state.streak = 0;
      state.stats[fach].falsch++;
    }
    save(state);
    return korrekt ? 10 + Math.min(state.streak, 5) : 0;
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

  return {
    addAntwort, getState, level, saveLeseFortschritt, getLeseFortschritt, markGeschichteFertig,
    getMalfolgenStats, meldeMalfolgenErgebnis,
    getMatheKategorienStats, meldeMatheKategorieErgebnis, addSterne,
    getSchachFortschritt, meldeSchachSieg, schachStufeAufsteigen, setSchachStufe,
    getTagesStreak, getFachFortschritt, getGeschichtenFortschritt,
    getTagesplanRegeln, setTagesplanRegeln, getTagesFach
  };
})();
