// Taktik-Puzzletrainer: Stellungen aus der Lichess-Puzzle-Datenbank (siehe
// taktik-puzzles-data.js) ueben, Thema fuer Thema (Gabel -> Fesselung -> Spieß
// -> Abzugsangriff, siehe Storage.getTaktikFreigeschaltet). Jedes Puzzle startet
// mit einem automatisch gespielten "Einleitungszug" (moves[0] in den Puzzle-
// Daten) - danach ist das Kind am Zug, muss den Loesungszug finden, worauf bei
// mehrzuegigen Puzzles die Engine die Gegenantwort automatisch nachzieht.
const SchachTaktik = (function () {
  const TAKTIK_REIHENFOLGE = ['fork', 'pin', 'skewer', 'discoveredAttack'];
  const THEMEN = {
    fork: { icon: 'gabel', name: 'Gabeln', beschreibung: 'Eine Figur bedroht zwei Ziele gleichzeitig.' },
    pin: { icon: 'fesselung', name: 'Fesselungen', beschreibung: 'Eine Figur darf sich nicht wegbewegen, sonst steht der König im Schach.' },
    skewer: { icon: 'spiess', name: 'Spieße', beschreibung: 'Die wertvolle Figur muss zuerst weichen - dahinter wartet die nächste.' },
    discoveredAttack: { icon: 'abzug', name: 'Abzugsangriffe', beschreibung: 'Eine Figur zieht weg und gibt den Weg für eine andere frei.' }
  };
  const ANZAHL_PRO_SESSION = 10;

  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  let session = null;
  let rohZustand = null;
  let zustand = null;
  let spielerFarbe = 'w';
  let zugIndex = 0;
  let ausgewaehlt = null;
  let ziele = [];
  let feedback = null;
  let wartet = false;
  let freigeschaltetVorSession = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderMenu() {
    const stats = Storage.getTaktikStats();
    const frei = Storage.getTaktikFreigeschaltet();
    const kartenHtml = TAKTIK_REIHENFOLGE.map(thema => {
      const t = THEMEN[thema];
      const s = stats[thema];
      const versuche = s.richtig + s.falsch;
      if (!frei.includes(thema)) {
        return `
          <div class="taktik-card taktik-card-gesperrt">
            <span class="taktik-card-icon">${Icons.svg(t.icon)}</span>
            <span class="taktik-card-name">${t.name}</span>
            <span class="taktik-card-status">🔒 Erst das vorherige Thema meistern</span>
          </div>
        `;
      }
      return `
        <div class="taktik-card accent-schach" onclick="SchachTaktik.starteSession('${thema}')">
          <span class="taktik-card-icon">${Icons.svg(t.icon)}</span>
          <span class="taktik-card-name">${t.name}</span>
          <span class="taktik-card-beschreibung">${t.beschreibung}</span>
          <span class="taktik-card-status">${versuche === 0 ? 'Noch nicht geübt' : `${s.richtig} von ${versuche} richtig`}</span>
        </div>
      `;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Taktik-Training</div>
      <div class="lese-text">Löse kleine Rätselstellungen und lerne, gefährliche Muster zu erkennen. Sitzt ein Thema gut genug, schaltet sich das nächste frei.</div>
      <div class="taktik-grid">${kartenHtml}</div>
    `);
  }

  /** Waehlt ANZAHL_PRO_SESSION Puzzles aus dem Thema-Pool: bevorzugt Puzzles
   *  nahe am aktuellen Rating (passende Schwierigkeit) und meidet zuletzt
   *  geloeste, damit sich eine Sitzung nicht wiederholt anfuehlt. */
  function waehlePuzzles(thema, anzahl) {
    const pool = TaktikPuzzles[thema];
    const stat = Storage.getTaktikStats()[thema];
    const vermeiden = new Set(stat.zuletztGeloest);
    let kandidaten = pool.filter(p => !vermeiden.has(p.id));
    if (kandidaten.length < anzahl) kandidaten = pool.slice();
    kandidaten = kandidaten.slice().sort((a, b) => Math.abs(a.rating - stat.rating) - Math.abs(b.rating - stat.rating));
    const naheDran = kandidaten.slice(0, Math.min(anzahl * 3, kandidaten.length));
    shuffle(naheDran);
    return naheDran.slice(0, Math.min(anzahl, naheDran.length));
  }

  function starteSession(thema) {
    freigeschaltetVorSession = Storage.getTaktikFreigeschaltet().length;
    const puzzles = waehlePuzzles(thema, ANZAHL_PRO_SESSION);
    session = { thema, puzzles, index: 0, richtigCount: 0, sterneGesamt: 0 };
    ladePuzzle();
  }

  function ladePuzzle() {
    const p = session.puzzles[session.index];
    rohZustand = SchachEngine.ausFen(p.fen);
    zustand = null;
    // Die FEN-Stellung gehoert der Seite, die den Einleitungszug (moves[0])
    // spielt - danach ist die JEWEILS ANDERE Seite (das Kind) am Zug.
    const einleitungsFarbe = p.fen.split(' ')[1] === 'b' ? 'b' : 'w';
    spielerFarbe = einleitungsFarbe === 'w' ? 'b' : 'w';
    zugIndex = 0;
    ausgewaehlt = null;
    ziele = [];
    feedback = null;
    wartet = true;
    zeichne();
    setTimeout(() => {
      const zug0 = SchachEngine.zugAusUci(rohZustand, p.moves[0]);
      zustand = SchachEngine.zugAusfuehren(rohZustand, zug0);
      zugIndex = 1;
      wartet = false;
      zeichne();
    }, 900);
  }

  function visuelleFelder() {
    const felder = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const rank = spielerFarbe === 'w' ? 7 - visRow : visRow;
        const file = spielerFarbe === 'w' ? visCol : 7 - visCol;
        felder.push(SchachEngine.idx(rank, file));
      }
    }
    return felder;
  }

  function zeichne() {
    const anzeigeZustand = zustand || rohZustand;
    const letzterZug = anzeigeZustand.letzterZug;

    const zellenHtml = visuelleFelder().map((feld, i) => {
      const visRow = Math.floor(i / 8), visCol = i % 8;
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = anzeigeZustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehlt === feld) klassen += ' schach-feld-ausgewaehlt';
      if (ziele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
      if (letzterZug && (feld === letzterZug.von || feld === letzterZug.nach)) klassen += ' schach-feld-letzter-zug';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      let labelHtml = '';
      if (visCol === 0) labelHtml += `<span class="koord-label koord-label-rang">${rank + 1}</span>`;
      if (visRow === 7) labelHtml += `<span class="koord-label koord-label-datei">${DATEIEN[file]}</span>`;
      return `<div class="${klassen}" onclick="SchachTaktik.feldGeklickt(${feld})">${symbol}${labelHtml}</div>`;
    }).join('');

    const nr = session.index + 1, total = session.puzzles.length;
    const infoText = wartet
      ? (zugIndex === 0 ? 'Schau dir die Stellung an…' : 'Der Gegner zieht…')
      : (spielerFarbe === 'w' ? 'Weiß ist am Zug – finde den besten Zug!' : 'Schwarz ist am Zug – finde den besten Zug!');
    const feedbackHtml = feedback
      ? `<div class="schach-status ${feedback.korrekt ? 'schach-status-sieg' : 'schach-status-niederlage'}">${feedback.text}</div>`
      : '';

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachTaktik.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">${THEMEN[session.thema].name}</div>
        <div class="schach-info">Puzzle ${nr} / ${total} · ${infoText}</div>
        ${feedbackHtml}
        <div class="schach-brett">${zellenHtml}</div>
      </div>
    `);
  }

  function feldGeklickt(feld) {
    if (wartet || feedback) return;
    const stein = zustand.board[feld];

    if (ausgewaehlt !== null) {
      const zug = ziele.find(z => z.nach === feld);
      if (zug) {
        versucheZug(zug);
        return;
      }
    }

    if (stein && stein.farbe === spielerFarbe) {
      ausgewaehlt = feld;
      ziele = SchachEngine.generiereLegaleZuege(zustand, feld);
    } else {
      ausgewaehlt = null;
      ziele = [];
    }
    zeichne();
  }

  function versucheZug(zug) {
    const p = session.puzzles[session.index];
    const erwartet = SchachEngine.zugAusUci(zustand, p.moves[zugIndex]);
    const korrekt = !!erwartet && zug.von === erwartet.von && zug.nach === erwartet.nach;

    zustand = SchachEngine.zugAusfuehren(zustand, zug);
    ausgewaehlt = null;
    ziele = [];

    if (!korrekt) {
      behandleErgebnis(false);
      return;
    }

    zugIndex++;
    if (zugIndex >= p.moves.length) {
      behandleErgebnis(true);
      return;
    }

    // Weitere Zuege noetig (mehrzuegiges Puzzle): Gegenantwort automatisch
    // nachziehen, danach ist das Kind wieder am Zug.
    wartet = true;
    zeichne();
    setTimeout(() => {
      const gegenzug = SchachEngine.zugAusUci(zustand, p.moves[zugIndex]);
      zustand = SchachEngine.zugAusfuehren(zustand, gegenzug);
      zugIndex++;
      wartet = false;
      zeichne();
    }, 900);
  }

  function behandleErgebnis(korrekt) {
    const p = session.puzzles[session.index];
    Storage.meldeTaktikErgebnis(session.thema, korrekt, p.id);
    const gained = Storage.addAntwort('schach', korrekt);
    if (korrekt) session.richtigCount++;
    session.sterneGesamt += gained;
    App.updateTopbar();
    feedback = {
      korrekt,
      text: korrekt ? ('✔ Richtig! +' + gained + ' ⭐') : '✘ Das war nicht der beste Zug.'
    };
    wartet = true;
    zeichne();
    setTimeout(naechstesPuzzle, 1900);
  }

  function naechstesPuzzle() {
    session.index++;
    if (session.index >= session.puzzles.length) {
      renderErgebnis();
    } else {
      ladePuzzle();
    }
  }

  function renderErgebnis() {
    Storage.meldeTagesplanSchrittErledigt('taktik');
    const total = session.puzzles.length;
    const quote = session.richtigCount / total;
    const emoji = quote >= 0.8 ? '🏆' : quote >= 0.5 ? '🎉' : '👍';
    const neuFreigeschaltet = Storage.getTaktikFreigeschaltet().length > freigeschaltetVorSession;
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${session.richtigCount} von ${total} richtig!</div>
        <div class="result-sterne">Du hast ${session.sterneGesamt} ⭐ verdient</div>
        ${neuFreigeschaltet ? '<div class="schach-status schach-status-sieg">Neues Thema freigeschaltet! 🎉</div>' : ''}
        <div class="btn-primary" onclick="SchachTaktik.starteSession('${session.thema}')">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="SchachTaktik.renderMenu()">Zurück zur Themenwahl</div>
      </div>
    `);
    FernSync.meldeLernsetErledigt('Taktik: ' + THEMEN[session.thema].name, `${session.richtigCount} von ${total} richtig`, session.sterneGesamt);
  }

  return { renderMenu, starteSession, feldGeklickt };
})();
