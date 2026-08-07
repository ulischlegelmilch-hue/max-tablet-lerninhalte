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
      malfolgen: {}
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

  function addAntwort(fach, korrekt) {
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

  /** Generische Sternevergabe fuer Erfolge außerhalb des Quiz-Systems (z. B. eine
   *  gewonnene Schachpartie). */
  function addSterne(betrag) {
    state.sterne += betrag;
    save(state);
  }

  return {
    addAntwort, getState, level, saveLeseFortschritt, getLeseFortschritt, markGeschichteFertig,
    getMalfolgenStats, meldeMalfolgenErgebnis, addSterne
  };
})();
