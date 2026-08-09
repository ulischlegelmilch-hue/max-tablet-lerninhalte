// Schachlektionen: getrennt vom eigentlichen Spiel (schach.js), damit Max nicht
// nur gegen die KI spielt, sondern gezielt darauf vorbereitet wird, gegen einen
// Menschen (Papa) zu bestehen. Bereiche:
// 1) Figuren-ABC - interaktive Zugregel-Erklaerung ohne Punktedruck.
// 2) Eröffnung - geführte Partie (Italienische Eröffnung) mit Prinzipien-Erklärung,
//    fester Zugskript statt freier Aufgabe (siehe ERWOEFFNUNG_SCHRITTE).
// 3-7) Schlagen/Schach geben/Matt in 1/Nicht hängen lassen/Fallen erkennen - kurze
// Aufgabenserien mit sofortigem Feedback, wie die Mathe-Quizzes, aber mit
// Brett-Tap statt Tastatur/MC. Alle Aufgaben werden zur Laufzeit erzeugt und
// dabei mit der echten Engine verifiziert (z. B. spielstatus === 'matt'), es
// gibt also keine "kaputten" Aufgaben - siehe generiereSchlagAufgabe usw.
const SchachLektionen = (function () {
  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function leereRochade() { return { wK: false, wD: false, bK: false, bD: false }; }
  function zufallsFeld() { return SchachEngine.idx(rnd(0, 7), rnd(0, 7)); }
  function neuerZustand(board, amZug) {
    return { board, amZug, rochade: leereRochade(), enPassantZiel: null, letzterZug: null };
  }

  // ---------------------------------------------------------------------
  // Menü
  // ---------------------------------------------------------------------
  function renderMenu() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Schachlektionen</div>
      <div class="sub-grid">
        <div class="sub-card" onclick="SchachLektionen.starteFigurenABC()"><span class="sub-icon">${Icons.svg('figuren')}</span><span class="sub-label">Wie ziehen die Figuren?</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteEroeffnung()"><span class="sub-icon">${Icons.svg('eroeffnung')}</span><span class="sub-label">Eröffnung</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteUebung('schlagen')"><span class="sub-icon">${Icons.svg('schlagen')}</span><span class="sub-label">Schlagen üben</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteUebung('schach')"><span class="sub-icon">${Icons.svg('schutz')}</span><span class="sub-label">Schach geben</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteUebung('matt')"><span class="sub-icon">${Icons.svg('matt')}</span><span class="sub-label">Matt in 1</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteUebung('haengt')"><span class="sub-icon">${Icons.svg('warnung')}</span><span class="sub-label">Nicht hängen lassen</span></div>
        <div class="sub-card" onclick="SchachLektionen.starteUebung('fallen')"><span class="sub-icon">${Icons.svg('falle')}</span><span class="sub-label">Fallen erkennen</span></div>
      </div>
    `);
  }

  // ---------------------------------------------------------------------
  // 1) Figuren-ABC: interaktive Zugregel-Erklaerung, kein Erfolg/Misserfolg -
  // Max tippt die Figur an und sieht, wohin sie ziehen darf.
  // ---------------------------------------------------------------------
  const FIGUREN_LEKTIONEN = [
    {
      titel: 'Der Bauer',
      text: 'Der Bauer zieht geradeaus, ein Feld nach vorne. Bei seinem allerersten Zug darf er auch zwei Felder ziehen. Schlagen kann er aber nur schräg nach vorne!',
      aufbau(board) {
        board[SchachEngine.idx(1, 4)] = { typ: 'p', farbe: 'w' };
        board[SchachEngine.idx(2, 3)] = { typ: 'p', farbe: 'b' };
        board[SchachEngine.idx(2, 5)] = { typ: 'p', farbe: 'b' };
      }
    },
    {
      titel: 'Der Turm',
      text: 'Der Turm zieht geradeaus - nach vorne, hinten oder zur Seite. Er darf so weit ziehen, wie das Feld frei ist.',
      aufbau(board) { board[SchachEngine.idx(3, 4)] = { typ: 'r', farbe: 'w' }; }
    },
    {
      titel: 'Der Läufer',
      text: 'Der Läufer zieht nur schräg - dafür so weit du willst. Ein Läufer bleibt immer auf Feldern derselben Farbe.',
      aufbau(board) { board[SchachEngine.idx(3, 4)] = { typ: 'b', farbe: 'w' }; }
    },
    {
      titel: 'Die Dame',
      text: 'Die Dame ist die stärkste Figur. Sie zieht wie Turm und Läufer zusammen: geradeaus UND schräg, so weit du willst.',
      aufbau(board) { board[SchachEngine.idx(3, 4)] = { typ: 'q', farbe: 'w' }; }
    },
    {
      titel: 'Der Springer',
      text: 'Der Springer springt in einem "L": zwei Felder in eine Richtung, dann eins zur Seite. Er darf sogar über andere Figuren drüberspringen!',
      aufbau(board) {
        board[SchachEngine.idx(3, 4)] = { typ: 'n', farbe: 'w' };
        board[SchachEngine.idx(3, 3)] = { typ: 'p', farbe: 'w' };
        board[SchachEngine.idx(4, 4)] = { typ: 'p', farbe: 'w' };
      }
    },
    {
      titel: 'Der König',
      text: 'Der König darf nur ein einziges Feld in jede Richtung ziehen. Er ist die wichtigste Figur - wird er geschlagen, ist die Partie vorbei!',
      aufbau(board) { board[SchachEngine.idx(3, 4)] = { typ: 'k', farbe: 'w' }; }
    }
  ];

  let figurIndex = 0;
  let figurZustand = null;
  let figurAusgewaehlt = null;
  let figurZiele = [];

  function starteFigurenABC() {
    figurIndex = 0;
    renderFigurLektion();
  }

  function renderFigurLektion() {
    const board = new Array(64).fill(null);
    FIGUREN_LEKTIONEN[figurIndex].aufbau(board);
    figurZustand = neuerZustand(board, 'w');
    figurAusgewaehlt = null;
    figurZiele = [];
    zeichneFigurLektion();
  }

  function zeichneFigurLektion() {
    const lekt = FIGUREN_LEKTIONEN[figurIndex];
    const zellenHtml = weisseSicht(figurZustand, figurAusgewaehlt, figurZiele, 'SchachLektionen.figurFeldGeklickt');
    const letzte = figurIndex === FIGUREN_LEKTIONEN.length - 1;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLektionen.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">${lekt.titel} (${figurIndex + 1}/${FIGUREN_LEKTIONEN.length})</div>
        <div class="lese-text">${lekt.text}<br><br><b>Tipp:</b> Tippe die Figur an - dann siehst du, wohin sie ziehen darf.</div>
        <div class="schach-brett">${zellenHtml}</div>
        <div class="btn-primary" onclick="SchachLektionen.naechsteFigurLektion()">${letzte ? 'Fertig' : 'Weiter'}</div>
      </div>
    `);
  }

  function figurFeldGeklickt(feld) {
    const stein = figurZustand.board[feld];
    if (figurAusgewaehlt !== null) {
      const zug = figurZiele.find(z => z.nach === feld);
      if (zug) {
        figurZustand = SchachEngine.zugAusfuehren(figurZustand, zug);
        figurZustand.amZug = 'w';
        figurAusgewaehlt = null;
        figurZiele = [];
        zeichneFigurLektion();
        return;
      }
    }
    if (stein && stein.farbe === 'w') {
      figurAusgewaehlt = feld;
      figurZiele = SchachEngine.generiereLegaleZuege(figurZustand, feld);
    } else {
      figurAusgewaehlt = null;
      figurZiele = [];
    }
    zeichneFigurLektion();
  }

  function naechsteFigurLektion() {
    if (figurIndex < FIGUREN_LEKTIONEN.length - 1) {
      figurIndex++;
      renderFigurLektion();
    } else {
      Storage.addSterne(15);
      App.updateTopbar();
      renderMenu();
    }
  }

  // ---------------------------------------------------------------------
  // Eröffnung: geführte Partie statt freier Aufgabe - Max spielt Zug für Zug
  // die Italienische Eröffnung nach, jeder Schritt erklärt WARUM (Zentrum,
  // Entwicklung, Königssicherheit). Der Gegner antwortet automatisch mit dem
  // hinterlegten Gegenzug. Die komplette Zugfolge ist per Skript in
  // scratchpad/verify_eroeffnung.js gegen die Engine geprüft.
  // ---------------------------------------------------------------------
  const EROEFFNUNG_SCHRITTE = [
    {
      erklaerung: 'Besetze zuerst die Mitte! Ein Bauer in der Mitte kontrolliert viele Felder und öffnet Dame und Läufer den Weg.',
      von: SchachEngine.idx(1, 4), nach: SchachEngine.idx(3, 4),
      gegenzug: { von: SchachEngine.idx(6, 4), nach: SchachEngine.idx(4, 4) }
    },
    {
      erklaerung: 'Entwickle zuerst deine Springer und Läufer, bevor du die Dame rausholst - sie sind schnell einsatzbereit und stehen sicher.',
      von: SchachEngine.idx(0, 6), nach: SchachEngine.idx(2, 5),
      gegenzug: { von: SchachEngine.idx(7, 1), nach: SchachEngine.idx(5, 2) }
    },
    {
      erklaerung: 'Der Läufer zielt aufs f7-Feld - direkt neben dem gegnerischen König. Das ist von Anfang an eine Schwachstelle, weil nur der König es beschützt.',
      von: SchachEngine.idx(0, 5), nach: SchachEngine.idx(3, 2),
      gegenzug: { von: SchachEngine.idx(7, 5), nach: SchachEngine.idx(4, 2) }
    },
    {
      erklaerung: 'Jetzt kannst du rochieren! Dein König geht in Sicherheit hinter die Bauern, und der Turm kommt gleich mit ins Spiel. Tippe den König an und ziehe ihn zwei Felder zur Seite.',
      von: SchachEngine.idx(0, 4), nach: SchachEngine.idx(0, 6), rochade: 'K',
      gegenzug: null
    }
  ];

  let eroeffnungIndex = 0;
  let eroeffnungZustand = null;
  let eroeffnungAusgewaehlt = null;
  let eroeffnungZiele = [];
  let eroeffnungHinweis = '';

  function starteEroeffnung() {
    eroeffnungIndex = 0;
    eroeffnungZustand = SchachEngine.anfangsstellung();
    eroeffnungAusgewaehlt = null;
    eroeffnungZiele = [];
    eroeffnungHinweis = '';
    zeichneEroeffnung();
  }

  function zeichneEroeffnung() {
    const schritt = EROEFFNUNG_SCHRITTE[eroeffnungIndex];
    const zellenHtml = weisseSicht(eroeffnungZustand, eroeffnungAusgewaehlt, eroeffnungZiele, 'SchachLektionen.eroeffnungFeldGeklickt');
    const hinweisHtml = eroeffnungHinweis ? `<div class="schach-status">${eroeffnungHinweis}</div>` : '';
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLektionen.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Eröffnung – Zug ${eroeffnungIndex + 1} / ${EROEFFNUNG_SCHRITTE.length}</div>
        <div class="lese-text">${schritt.erklaerung}</div>
        ${hinweisHtml}
        <div class="schach-brett">${zellenHtml}</div>
      </div>
    `);
  }

  function eroeffnungFeldGeklickt(feld) {
    const schritt = EROEFFNUNG_SCHRITTE[eroeffnungIndex];
    const stein = eroeffnungZustand.board[feld];

    if (eroeffnungAusgewaehlt !== null) {
      const zug = eroeffnungZiele.find(z => z.nach === feld);
      eroeffnungAusgewaehlt = null;
      eroeffnungZiele = [];
      if (zug && feld === schritt.nach && (!schritt.rochade || zug.rochade === schritt.rochade)) {
        eroeffnungZustand = SchachEngine.zugAusfuehren(eroeffnungZustand, zug);
        eroeffnungHinweis = '';
        if (schritt.gegenzug) {
          setTimeout(() => {
            const gegnerZuege = SchachEngine.generiereLegaleZuege(eroeffnungZustand, schritt.gegenzug.von);
            const gegnerZug = gegnerZuege.find(z => z.nach === schritt.gegenzug.nach);
            eroeffnungZustand = SchachEngine.zugAusfuehren(eroeffnungZustand, gegnerZug);
            naechsterEroeffnungSchritt();
          }, 900);
          zeichneEroeffnung();
          return;
        }
        naechsterEroeffnungSchritt();
        return;
      } else if (zug) {
        eroeffnungHinweis = 'Guter legaler Zug, aber probier den vorgeschlagenen Zug aus dieser Lektion.';
      }
    } else if (stein && stein.farbe === 'w') {
      eroeffnungAusgewaehlt = feld;
      eroeffnungZiele = SchachEngine.generiereLegaleZuege(eroeffnungZustand, feld);
    }
    zeichneEroeffnung();
  }

  function naechsterEroeffnungSchritt() {
    if (eroeffnungIndex < EROEFFNUNG_SCHRITTE.length - 1) {
      eroeffnungIndex++;
      zeichneEroeffnung();
    } else {
      Storage.addSterne(20);
      App.updateTopbar();
      App.render(`
        <div class="back-row"><span class="back-btn" onclick="SchachLektionen.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="result-card">
          <div class="result-emoji">🚀</div>
          <div class="result-title">Eröffnung geschafft!</div>
          <div class="lese-text" style="text-align:left;">Merk dir die drei Regeln: Mitte besetzen, Springer &amp; Läufer zuerst entwickeln, früh rochieren. Damit bist du für jede Partie gegen Papa gut vorbereitet!</div>
          <div class="btn-primary" onclick="SchachLektionen.starteEroeffnung()">Nochmal üben</div>
          <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="SchachLektionen.renderMenu()">Zurück zu den Lektionen</div>
        </div>
      `);
    }
  }

  // ---------------------------------------------------------------------
  // Gemeinsame Brett-Darstellung (immer aus Weiß-Sicht - die Aufgaben sind
  // grundsätzlich "Weiß ist am Zug").
  // ---------------------------------------------------------------------
  function weisseSicht(zustand, ausgewaehlt, ziele, onclickFn) {
    const zellen = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const rank = 7 - visRow, file = visCol;
        const feld = SchachEngine.idx(rank, file);
        const hell = (rank + file) % 2 === 1;
        const stein = zustand.board[feld];
        let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
        if (ausgewaehlt === feld) klassen += ' schach-feld-ausgewaehlt';
        if (ziele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
        const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
        zellen.push(`<div class="${klassen}" onclick="${onclickFn}(${feld})">${symbol}</div>`);
      }
    }
    return zellen.join('');
  }

  // ---------------------------------------------------------------------
  // 2/3/4) Aufgabenserien: pro Kategorie ein Generator, der eine garantiert
  // lösbare Stellung liefert (per Engine geprüft, nicht nur "gebaut").
  // ---------------------------------------------------------------------
  function generiereSchlagAufgabe() {
    const typen = ['p', 'n', 'b', 'r', 'q'];
    for (let versuch = 0; versuch < 30; versuch++) {
      const typ = typen[rnd(0, typen.length - 1)];
      const board = new Array(64).fill(null);
      let von, ziel;
      if (typ === 'p') {
        von = SchachEngine.idx(rnd(1, 5), rnd(0, 7));
        const rank = SchachEngine.rankOf(von), file = SchachEngine.fileOf(von);
        const df = Math.random() < 0.5 ? -1 : 1;
        const zielFile = file + df;
        if (zielFile < 0 || zielFile > 7) continue;
        ziel = SchachEngine.idx(rank + 1, zielFile);
      } else {
        von = zufallsFeld();
        board[von] = { typ, farbe: 'w' };
        const testZuege = SchachEngine.generiereLegaleZuege(neuerZustand(board, 'w'), von);
        if (testZuege.length === 0) continue;
        ziel = testZuege[rnd(0, testZuege.length - 1)].nach;
      }
      board[von] = { typ, farbe: 'w' };
      board[ziel] = { typ: typen[rnd(0, typen.length - 1)], farbe: 'b' };
      const zustand = neuerZustand(board, 'w');
      const zuege = SchachEngine.generiereLegaleZuege(zustand, von);
      if (!zuege.some(z => z.nach === ziel && z.schlag)) continue;
      return {
        zustand,
        anweisung: 'Schlage die schwarze Figur in einem Zug!',
        pruefung: (vorher, zug) => !!zug.schlag,
        loesungFalsch: 'Das war kein Schlagzug. Ziehe direkt auf die schwarze Figur.'
      };
    }
    // Sicherer Rückfall, falls alle Versuche scheitern (praktisch nie der Fall).
    const board = new Array(64).fill(null);
    board[SchachEngine.idx(0, 0)] = { typ: 'r', farbe: 'w' };
    board[SchachEngine.idx(0, 5)] = { typ: 'p', farbe: 'b' };
    return {
      zustand: neuerZustand(board, 'w'),
      anweisung: 'Schlage die schwarze Figur in einem Zug!',
      pruefung: (vorher, zug) => !!zug.schlag,
      loesungFalsch: 'Das war kein Schlagzug. Ziehe direkt auf die schwarze Figur.'
    };
  }

  function generiereSchachAufgabe() {
    const typen = ['r', 'b', 'q', 'n'];
    for (let versuch = 0; versuch < 40; versuch++) {
      const board = new Array(64).fill(null);
      const koenigFeld = zufallsFeld();
      board[koenigFeld] = { typ: 'k', farbe: 'b' };
      const von = zufallsFeld();
      if (von === koenigFeld) continue;
      const typ = typen[rnd(0, typen.length - 1)];
      board[von] = { typ, farbe: 'w' };
      const zustand = neuerZustand(board, 'w');
      if (SchachEngine.istImSchach(zustand, 'b')) continue;
      const zuege = SchachEngine.generiereLegaleZuege(zustand, von);
      const schachZuege = zuege.filter(z => SchachEngine.istImSchach(SchachEngine.zugAusfuehren(zustand, z), 'b'));
      if (schachZuege.length === 0) continue;
      return {
        zustand,
        anweisung: 'Setze dem schwarzen König in einem Zug Schach!',
        pruefung: (vorher, zug, nachher) => SchachEngine.istImSchach(nachher, 'b'),
        loesungFalsch: 'Damit stand der König nicht im Schach. Versuch eine Figur, die den König angreifen kann.'
      };
    }
    const board = new Array(64).fill(null);
    board[SchachEngine.idx(7, 4)] = { typ: 'k', farbe: 'b' };
    board[SchachEngine.idx(0, 4)] = { typ: 'q', farbe: 'w' };
    return {
      zustand: neuerZustand(board, 'w'),
      anweisung: 'Setze dem schwarzen König in einem Zug Schach!',
      pruefung: (vorher, zug, nachher) => SchachEngine.istImSchach(nachher, 'b'),
      loesungFalsch: 'Damit stand der König nicht im Schach. Versuch eine Figur, die den König angreifen kann.'
    };
  }

  // Zwei handgeprüfte Matt-in-1-Grundstellungen, die per Spiegelung (horizontal/
  // vertikal) für Abwechslung sorgen, ohne die Matt-Logik zu verändern - jede
  // Spiegelung erhält Reihen/Linien/Diagonalen und damit alle Zugbeziehungen.
  // Ausnahme: Bauern haben eine feste, farbabhängige Zugrichtung, die sich beim
  // vertikalen Spiegeln NICHT mitdreht - ein Muster mit Bauern darf deshalb nur
  // horizontal gespiegelt werden (erlaubeVertikal: false), sonst koennte ein
  // Bauer plötzlich rückwärts "vorziehen" und den Schach blockieren.
  const MATT_MUSTER = [
    // Rückrang-Matt: Turm läuft die offene a-Linie hoch, Bauern versperren dem König die 7. Reihe.
    {
      erlaubeVertikal: false,
      bauen() {
        const board = new Array(64).fill(null);
        board[SchachEngine.idx(7, 4)] = { typ: 'k', farbe: 'b' };
        board[SchachEngine.idx(6, 3)] = { typ: 'p', farbe: 'b' };
        board[SchachEngine.idx(6, 4)] = { typ: 'p', farbe: 'b' };
        board[SchachEngine.idx(6, 5)] = { typ: 'p', farbe: 'b' };
        board[SchachEngine.idx(0, 0)] = { typ: 'r', farbe: 'w' };
        return board;
      }
    },
    // Dame + Turm im Kistenmatt: Turm sperrt die g-Linie, Dame kommt über die 6. Reihe zum Schach.
    {
      erlaubeVertikal: true,
      bauen() {
        const board = new Array(64).fill(null);
        board[SchachEngine.idx(7, 7)] = { typ: 'k', farbe: 'b' };
        board[SchachEngine.idx(5, 0)] = { typ: 'q', farbe: 'w' };
        board[SchachEngine.idx(0, 6)] = { typ: 'r', farbe: 'w' };
        return board;
      }
    }
  ];

  function spiegelFeld(feld, horizontal, vertikal) {
    let rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
    if (horizontal) file = 7 - file;
    if (vertikal) rank = 7 - rank;
    return SchachEngine.idx(rank, file);
  }

  function generiereMattAufgabe() {
    const muster = MATT_MUSTER[rnd(0, MATT_MUSTER.length - 1)];
    const horizontal = Math.random() < 0.5;
    const vertikal = muster.erlaubeVertikal && Math.random() < 0.5;
    const rohesBoard = muster.bauen();
    const board = new Array(64).fill(null);
    for (let i = 0; i < 64; i++) {
      if (rohesBoard[i]) board[spiegelFeld(i, horizontal, vertikal)] = rohesBoard[i];
    }
    const zustand = neuerZustand(board, 'w');
    return {
      zustand,
      anweisung: 'Setze in einem Zug Matt!',
      pruefung: (vorher, zug, nachher) => SchachEngine.spielstatus(nachher) === 'matt',
      loesungFalsch: 'Das war noch kein Matt. Der König konnte entkommen oder stand gar nicht im Schach - versuch es nochmal.'
    };
  }

  // Prüft, ob Weiß im gegebenen Zustand (Weiß am Zug) eine Stellung erzwingen
  // kann, die spielstatus === 'matt' ist - Basis für die Fallen-Erkennung
  // ("droht der Gegner gerade Matt in 1?").
  function hatWeissMattIn1(zustand) {
    for (let f = 0; f < 64; f++) {
      if (!zustand.board[f] || zustand.board[f].farbe !== 'w') continue;
      const zuege = SchachEngine.generiereLegaleZuege(zustand, f);
      for (const zug of zuege) {
        if (SchachEngine.spielstatus(SchachEngine.zugAusfuehren(zustand, zug)) === 'matt') return true;
      }
    }
    return false;
  }

  // Nicht hängen lassen: eine weiße Figur wird von einer schwarzen bedroht,
  // Max muss sie retten (wegziehen) oder den Angreifer schlagen. Generisch
  // geprüft: Danach darf Schwarz nirgendwo mehr schlagen können.
  function generiereHaengtAufgabe() {
    const typen = ['n', 'b', 'r', 'q'];
    for (let versuch = 0; versuch < 40; versuch++) {
      const meinTyp = typen[rnd(0, typen.length - 1)];
      const meinFeld = zufallsFeld();
      let angreiferFeld = -1, angreiferTyp = '';
      for (let t = 0; t < 20; t++) {
        const kandidatTyp = typen[rnd(0, typen.length - 1)];
        const kandidatFeld = zufallsFeld();
        if (kandidatFeld === meinFeld) continue;
        const testBoard = new Array(64).fill(null);
        testBoard[kandidatFeld] = { typ: kandidatTyp, farbe: 'b' };
        const zuege = SchachEngine.generiereLegaleZuege(neuerZustand(testBoard, 'b'), kandidatFeld);
        if (zuege.some(z => z.nach === meinFeld)) {
          angreiferFeld = kandidatFeld; angreiferTyp = kandidatTyp;
          break;
        }
      }
      if (angreiferFeld === -1) continue;

      const board = new Array(64).fill(null);
      board[meinFeld] = { typ: meinTyp, farbe: 'w' };
      board[angreiferFeld] = { typ: angreiferTyp, farbe: 'b' };
      const zustand = neuerZustand(board, 'w');

      let loesbar = false;
      for (let f = 0; f < 64 && !loesbar; f++) {
        if (!zustand.board[f] || zustand.board[f].farbe !== 'w') continue;
        const zuege = SchachEngine.generiereLegaleZuege(zustand, f);
        for (const zug of zuege) {
          const nachher = SchachEngine.zugAusfuehren(zustand, zug);
          if (!SchachEngine.alleLegalenZuege(nachher, 'b').some(zz => zz.schlag)) { loesbar = true; break; }
        }
      }
      if (!loesbar) continue;

      return {
        zustand,
        anweisung: 'Deine Figur wird bedroht! Rette sie, oder schlage den Angreifer zuerst.',
        pruefung: (vorher, zug, nachher) => !SchachEngine.alleLegalenZuege(nachher, 'b').some(z => z.schlag),
        loesungFalsch: 'Deine Figur steht immer noch im Schlagfeld. Zieh sie in Sicherheit oder schlage den Angreifer.'
      };
    }
    const board = new Array(64).fill(null);
    board[SchachEngine.idx(3, 3)] = { typ: 'n', farbe: 'w' };
    board[SchachEngine.idx(1, 1)] = { typ: 'b', farbe: 'b' };
    return {
      zustand: neuerZustand(board, 'w'),
      anweisung: 'Deine Figur wird bedroht! Rette sie, oder schlage den Angreifer zuerst.',
      pruefung: (vorher, zug, nachher) => !SchachEngine.alleLegalenZuege(nachher, 'b').some(z => z.schlag),
      loesungFalsch: 'Deine Figur steht immer noch im Schlagfeld. Zieh sie in Sicherheit oder schlage den Angreifer.'
    };
  }

  // Fallen erkennen: die klassische "Schäfermatt"-Drohung nach 1.e4 e5 2.Dh5 Sc6
  // 3.Lc4 - Dame und Läufer zielen gemeinsam aufs f7-Feld. Max spielt hier
  // Schwarz (spielerFarbe: 'b') und muss die Matt-in-1-Drohung abwenden - jede
  // Verteidigung zählt (per Engine geprüft: mehrere Züge funktionieren
  // tatsächlich, siehe scratchpad/verify_falle.js).
  function generiereFalleAufgabe() {
    // Stellung durch echte Zugausfuehrung aufbauen (1.e4 e5 2.Dh5 Sc6 3.Lc4) statt
    // per Hand zusammengesetztem Board - das schliesst Tippfehler beim manuellen
    // Board-Aufbau aus (siehe scratchpad/vergleiche_falle.js zur Gegenprobe).
    let zustand = SchachEngine.anfangsstellung();
    const zugfolge = [
      [SchachEngine.idx(1, 4), SchachEngine.idx(3, 4)], // 1. e4
      [SchachEngine.idx(6, 4), SchachEngine.idx(4, 4)], // 1... e5
      [SchachEngine.idx(0, 3), SchachEngine.idx(4, 7)], // 2. Dh5
      [SchachEngine.idx(7, 1), SchachEngine.idx(5, 2)], // 2... Sc6
      [SchachEngine.idx(0, 5), SchachEngine.idx(3, 2)]  // 3. Lc4
    ];
    for (const [von, nach] of zugfolge) {
      const zug = SchachEngine.generiereLegaleZuege(zustand, von).find(z => z.nach === nach);
      zustand = SchachEngine.zugAusfuehren(zustand, zug);
    }
    return {
      zustand,
      spielerFarbe: 'b',
      anweisung: 'Weiß droht Dxf7 - Matt in einem Zug! Du spielst Schwarz: Wie verteidigst du dich?',
      pruefung: (vorher, zug, nachher) => !hatWeissMattIn1(nachher),
      loesungFalsch: 'Die Drohung Dxf7# besteht immer noch. Verteidige das f7-Feld oder vertreibe die Dame.'
    };
  }

  const GENERATOREN = {
    schlagen: generiereSchlagAufgabe, schach: generiereSchachAufgabe, matt: generiereMattAufgabe,
    haengt: generiereHaengtAufgabe, fallen: generiereFalleAufgabe
  };
  const ANZAHL_PRO_KATEGORIE = { schlagen: 6, schach: 6, matt: 6, haengt: 6, fallen: 3 };
  const KATEGORIE_NAMEN = {
    schlagen: 'Schlagen üben', schach: 'Schach geben', matt: 'Matt in 1',
    haengt: 'Nicht hängen lassen', fallen: 'Fallen erkennen'
  };

  let puzzleSession = null;
  let puzzleZustand = null;
  let puzzleAusgewaehlt = null;
  let puzzleZiele = [];
  let puzzleFeedback = null;

  function starteUebung(kategorie) {
    const aufgaben = [];
    for (let i = 0; i < ANZAHL_PRO_KATEGORIE[kategorie]; i++) aufgaben.push(GENERATOREN[kategorie]());
    puzzleSession = { kategorie, aufgaben, index: 0, richtigCount: 0, sterneGesamt: 0 };
    renderAufgabe();
  }

  function renderAufgabe() {
    puzzleAusgewaehlt = null;
    puzzleZiele = [];
    puzzleFeedback = null;
    puzzleZustand = puzzleSession.aufgaben[puzzleSession.index].zustand;
    zeichneAufgabe();
  }

  function zeichneAufgabe() {
    const a = puzzleSession.aufgaben[puzzleSession.index];
    const nr = puzzleSession.index + 1, total = puzzleSession.aufgaben.length;
    const zellenHtml = weisseSicht(puzzleZustand, puzzleAusgewaehlt, puzzleZiele, 'SchachLektionen.aufgabeFeldGeklickt');
    const feedbackHtml = puzzleFeedback
      ? `<div class="schach-status ${puzzleFeedback.korrekt ? 'schach-status-sieg' : 'schach-status-niederlage'}">${puzzleFeedback.text}</div>`
      : '';
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLektionen.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Aufgabe ${nr} / ${total}</div>
        <div class="lese-text">${a.anweisung}</div>
        ${feedbackHtml}
        <div class="schach-brett">${zellenHtml}</div>
      </div>
    `);
  }

  function aufgabeFeldGeklickt(feld) {
    if (puzzleFeedback) return;
    const a = puzzleSession.aufgaben[puzzleSession.index];
    const stein = puzzleZustand.board[feld];

    if (puzzleAusgewaehlt !== null) {
      const zug = puzzleZiele.find(z => z.nach === feld);
      if (zug) {
        const vorher = puzzleZustand;
        const nachher = SchachEngine.zugAusfuehren(puzzleZustand, zug);
        const korrekt = a.pruefung(vorher, zug, nachher);
        puzzleZustand = nachher;
        puzzleAusgewaehlt = null;
        puzzleZiele = [];

        const gained = Storage.addAntwort('schach', korrekt);
        if (korrekt) puzzleSession.richtigCount++;
        puzzleSession.sterneGesamt += gained;
        App.updateTopbar();
        puzzleFeedback = {
          korrekt,
          text: korrekt ? ('✔ Richtig! +' + gained + ' ⭐') : ('✘ ' + a.loesungFalsch)
        };
        zeichneAufgabe();
        setTimeout(naechsteAufgabe, 1900);
        return;
      }
    }

    if (stein && stein.farbe === (a.spielerFarbe || 'w')) {
      puzzleAusgewaehlt = feld;
      puzzleZiele = SchachEngine.generiereLegaleZuege(puzzleZustand, feld);
    } else {
      puzzleAusgewaehlt = null;
      puzzleZiele = [];
    }
    zeichneAufgabe();
  }

  function naechsteAufgabe() {
    puzzleSession.index++;
    if (puzzleSession.index >= puzzleSession.aufgaben.length) {
      renderAufgabenErgebnis();
    } else {
      renderAufgabe();
    }
  }

  function renderAufgabenErgebnis() {
    const total = puzzleSession.aufgaben.length;
    const quote = puzzleSession.richtigCount / total;
    const emoji = quote >= 0.8 ? '🏆' : quote >= 0.5 ? '🎉' : '👍';
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${puzzleSession.richtigCount} von ${total} richtig!</div>
        <div class="result-sterne">Du hast ${puzzleSession.sterneGesamt} ⭐ verdient</div>
        <div class="btn-primary" onclick="SchachLektionen.starteUebung('${puzzleSession.kategorie}')">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="SchachLektionen.renderMenu()">Zurück zu den Lektionen</div>
      </div>
    `);
    FernSync.meldeLernsetErledigt(
      'Lektion: ' + (KATEGORIE_NAMEN[puzzleSession.kategorie] || puzzleSession.kategorie),
      `${puzzleSession.richtigCount} von ${total} richtig`,
      puzzleSession.sterneGesamt
    );
  }

  return {
    renderMenu,
    starteFigurenABC, figurFeldGeklickt, naechsteFigurLektion,
    starteEroeffnung, eroeffnungFeldGeklickt,
    starteUebung, aufgabeFeldGeklickt
  };
})();
