// Strategie-Lektionen: Prinzipien statt Zugregeln (die kennt Max schon) - warum
// man so zieht, wie man zieht. Vier Bereiche: Eröffnungsprinzipien (Quiz, ergänzt
// die geführte Eröffnungspartie aus schach-lektionen.js), Materialwerte (Lektion +
// Quiz), Grundmatt üben (Dame/Turm gegen die KI, echtes Spiel), Bauernendspiel-
// Wissen (Quiz zu Freibauer/Opposition - bewusst als handgeprüfte, feste Fragen
// statt prozedural erzeugter Stellungen, weil die Zugparität bei der "Quadratregel"
// leicht falsch zu berechnen ist und eine falsche Lernaufgabe schlimmer waere als
// weniger Abwechslung).
const Strategie = (function () {
  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderMenu() {
    App.render(App.subMenuHtml('Strategie', [
      { icon: 'eroeffnung', titel: 'Eröffnungsprinzipien', onclick: 'Strategie.starteEroeffnungsQuiz()' },
      { icon: 'materialwert', titel: 'Materialwerte', onclick: 'Strategie.zeigeMaterialwerte()' },
      { icon: 'grundmatt', titel: 'Grundmatt üben', onclick: 'Strategie.renderGrundmattWahl()' },
      { icon: 'bauer', titel: 'Bauernendspiel-Wissen', onclick: 'Strategie.starteBauernQuiz()' }
    ]));
  }

  // -----------------------------------------------------------------------
  // 1) Eröffnungsprinzipien-Quiz
  // -----------------------------------------------------------------------
  const EROEFFNUNG_FRAGEN = [
    { frage: 'Was ist zu Beginn einer Partie am wichtigsten?', optionen: ['Die Mitte besetzen', 'Sofort den Gegner angreifen', 'Den Turm entwickeln'], richtig: 0 },
    { frage: 'Wann solltest du am besten rochieren?', optionen: ['Erst ganz am Ende der Partie', 'Früh, sobald es möglich ist', 'Nie, das lohnt sich nicht'], richtig: 1 },
    { frage: 'Was entwickelst du normalerweise zuerst?', optionen: ['Die Türme', 'Springer und Läufer', 'Die Dame'], richtig: 1 },
    { frage: 'Warum ist es meist keine gute Idee, die Dame ganz am Anfang weit vorzuziehen?', optionen: ['Sie kann leicht angegriffen werden und muss dann zurück', 'Sie wird dadurch automatisch geschützt', 'Sie darf das gar nicht'], richtig: 0 },
    { frage: 'Ist es klug, dieselbe Figur mehrmals zu ziehen, bevor die anderen entwickelt sind?', optionen: ['Ja, das ist immer gut', 'Nein, das kostet nur Zeit', 'Das ist egal'], richtig: 1 },
    { frage: 'Warum ist ein Bauer in der Mitte (z. B. e4 oder d4) besonders wertvoll?', optionen: ['Er ist der schnellste Bauer', 'Er kontrolliert viele wichtige Felder', 'Er kann nicht geschlagen werden'], richtig: 1 },
    { frage: 'Wohin sollte dein König möglichst früh in Sicherheit gebracht werden?', optionen: ['In die Brettmitte', 'Durch Rochade hinter die Bauern', 'Er bleibt am besten auf e1/e8'], richtig: 1 },
    { frage: 'Was bedeutet "Entwicklung" beim Schach?', optionen: ['Figuren aus der Grundstellung ins Spiel bringen', 'Nur Bauern ziehen', 'Möglichst schnell Schach geben'], richtig: 0 }
  ];

  function starteEroeffnungsQuiz() {
    const auswahl = shuffle(EROEFFNUNG_FRAGEN.slice()).slice(0, 6).map(f => ({
      typ: 'mc', frage: f.frage, optionen: f.optionen, richtigIndex: f.richtig
    }));
    const starter = () => App.startQuizSession('schach', auswahl, {
      onFinish: () => Storage.meldeTagesplanSchrittErledigt('strategie')
    });
    App.setLastStarter(starter);
    starter();
  }

  // -----------------------------------------------------------------------
  // 2) Materialwerte: erst eine kurze Lektion mit der Wertetabelle, dann Quiz.
  // -----------------------------------------------------------------------
  const WERTE_TABELLE = [
    { icon: 'bauer', name: 'Bauer', wert: 1 },
    { icon: 'figuren', name: 'Springer', wert: 3 },
    { icon: 'figuren', name: 'Läufer', wert: 3 },
    { icon: 'figuren', name: 'Turm', wert: 5 },
    { icon: 'figuren', name: 'Dame', wert: 9 }
  ];

  function zeigeMaterialwerte() {
    const zeilenHtml = WERTE_TABELLE.map(w => `
      <div class="wert-zeile">
        <span class="wert-name">${w.name}</span>
        <span class="wert-punkte">${'●'.repeat(w.wert > 5 ? 5 : w.wert)}${w.wert > 5 ? ' +' + (w.wert - 5) : ''} <b>(${w.wert})</b></span>
      </div>
    `).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Strategie.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Wie viel ist welche Figur wert?</div>
      <div class="lese-text">Jede Figur hat einen ungefähren Punktewert. Das hilft dir zu entscheiden, ob ein Tausch für dich gut ist: Tausche nie eine wertvollere Figur gegen eine weniger wertvolle, wenn du es vermeiden kannst! Der König zählt nicht mit - er ist unersetzlich.</div>
      <div class="regel-karte">${zeilenHtml}</div>
      <div class="weiter-row"><span class="btn-primary" onclick="Strategie.starteMaterialQuiz()">Zum Quiz ➜</span></div>
    `);
  }

  const MATERIAL_FRAGEN = [
    { frage: 'Welche Figur ist mehr wert: ein Springer oder ein Turm?', optionen: ['Der Springer', 'Der Turm', 'Beide gleich viel'], richtig: 1 },
    { frage: 'Wie viele Bauern ist eine Dame ungefähr wert?', optionen: ['3', '5', '9'], richtig: 2 },
    { frage: 'Du kannst deinen Turm gegen den Läufer des Gegners tauschen. Ist das ein guter Tausch für dich?', optionen: ['Nein, der Turm ist mehr wert', 'Ja, das ist ein super Tausch', 'Das ist völlig egal'], richtig: 0 },
    { frage: 'Zwei Läufer gegen einen Turm tauschen - lohnt sich das ungefähr?', optionen: ['Nein, das ist ein schlechter Tausch', 'Ja, zwei Läufer sind zusammen etwas mehr wert', 'Läufer darf man nie tauschen'], richtig: 1 },
    { frage: 'Welche Figur ist am wenigsten wert?', optionen: ['Der Bauer', 'Der Springer', 'Der Läufer'], richtig: 0 },
    { frage: 'Springer und Läufer sind ungefähr...', optionen: ['gleich viel wert', 'der Springer ist viel mehr wert', 'der Läufer ist viel mehr wert'], richtig: 0 }
  ];

  function starteMaterialQuiz() {
    const auswahl = shuffle(MATERIAL_FRAGEN.slice()).slice(0, 5).map(f => ({
      typ: 'mc', frage: f.frage, optionen: f.optionen, richtigIndex: f.richtig
    }));
    const starter = () => App.startQuizSession('schach', auswahl, {
      onFinish: () => Storage.meldeTagesplanSchrittErledigt('strategie')
    });
    App.setLastStarter(starter);
    starter();
  }

  // -----------------------------------------------------------------------
  // 3) Grundmatt üben: König + Dame/Turm gegen einsamen König - echtes,
  // spielbares Endspiel gegen die bestehende KI (nur der einsame König muss
  // ziehen, keine neue Engine-Logik noetig).
  // -----------------------------------------------------------------------
  function renderGrundmattWahl() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Strategie.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Grundmatt üben</div>
      <div class="lese-text">Setze den einsamen König mit deinem König und einer starken Figur matt. Tipp: Dränge ihn Schritt für Schritt an den Rand, aber lass ihm bis zuletzt mindestens ein Fluchtfeld - sonst ist es Patt (unentschieden)!</div>
      <div class="sub-grid">
        <div class="sub-card" onclick="Strategie.starteGrundmatt('dame')"><span class="sub-icon">${Icons.svg('grundmatt')}</span><span class="sub-label">König + Dame</span></div>
        <div class="sub-card" onclick="Strategie.starteGrundmatt('turm')"><span class="sub-icon">${Icons.svg('grundmatt')}</span><span class="sub-label">König + Turm</span></div>
      </div>
    `);
  }

  let gmZustand = null, gmFigurTyp = null, gmAusgewaehlt = null, gmZiele = [], gmBeendet = false;

  function leereRochade() { return { wK: false, wD: false, bK: false, bD: false }; }
  function koenigsAbstand(a, b) {
    return Math.max(
      Math.abs(SchachEngine.rankOf(a) - SchachEngine.rankOf(b)),
      Math.abs(SchachEngine.fileOf(a) - SchachEngine.fileOf(b))
    );
  }

  function generiereGrundmattStellung(figurTyp) {
    for (let versuch = 0; versuch < 300; versuch++) {
      const wK = SchachEngine.idx(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8));
      const bK = SchachEngine.idx(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8));
      const fig = SchachEngine.idx(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8));
      if (wK === bK || wK === fig || bK === fig) continue;
      if (koenigsAbstand(wK, bK) < 2) continue;
      const board = new Array(64).fill(null);
      board[wK] = { typ: 'k', farbe: 'w' };
      board[bK] = { typ: 'k', farbe: 'b' };
      board[fig] = { typ: figurTyp === 'dame' ? 'q' : 'r', farbe: 'w' };
      const zustand = { board, amZug: 'w', rochade: leereRochade(), enPassantZiel: null, letzterZug: null };
      if (SchachEngine.istImSchach(zustand, 'b')) continue;
      return zustand;
    }
    // Fallback (im Normalfall nie noetig): feste Stellung.
    const board = new Array(64).fill(null);
    board[SchachEngine.idx(0, 4)] = { typ: 'k', farbe: 'w' };
    board[SchachEngine.idx(7, 4)] = { typ: 'k', farbe: 'b' };
    board[SchachEngine.idx(0, 0)] = { typ: figurTyp === 'dame' ? 'q' : 'r', farbe: 'w' };
    return { board, amZug: 'w', rochade: leereRochade(), enPassantZiel: null, letzterZug: null };
  }

  function starteGrundmatt(figurTyp) {
    gmFigurTyp = figurTyp;
    gmZustand = generiereGrundmattStellung(figurTyp);
    gmAusgewaehlt = null;
    gmZiele = [];
    gmBeendet = false;
    zeichneGrundmatt();
  }

  function visuelleFelderWeiss() {
    const felder = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) felder.push(SchachEngine.idx(7 - visRow, visCol));
    }
    return felder;
  }

  function zeichneGrundmatt() {
    const status = SchachEngine.spielstatus(gmZustand);
    let statusHtml = '';
    if (status === 'matt') {
      statusHtml = '<div class="schach-status schach-status-sieg">🏆 Matt gesetzt! Klasse gemacht!</div>';
      gmBeendet = true;
    } else if (status === 'patt') {
      statusHtml = '<div class="schach-status schach-status-niederlage">Patt! Der König hatte keinen Zug mehr, stand aber nicht im Schach - das zählt als Unentschieden. Häufiger Fehler beim Mattsetzen: den König zu früh ganz einengen. Versuch es nochmal!</div>';
      gmBeendet = true;
    }
    const letzterZug = gmZustand.letzterZug;
    const zellenHtml = visuelleFelderWeiss().map(feld => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = gmZustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (gmAusgewaehlt === feld) klassen += ' schach-feld-ausgewaehlt';
      if (gmZiele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
      if (letzterZug && (feld === letzterZug.von || feld === letzterZug.nach)) klassen += ' schach-feld-letzter-zug';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      return `<div class="${klassen}" onclick="Strategie.grundmattFeldGeklickt(${feld})">${symbol}</div>`;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Strategie.renderGrundmattWahl()">${Icons.svg('zurueck')} Andere Figur</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">Grundmatt: König + ${gmFigurTyp === 'dame' ? 'Dame' : 'Turm'}</div>
        <div class="schach-info">${gmBeendet ? '' : (gmZustand.amZug === 'w' ? 'Du bist am Zug' : 'Der König überlegt…')}</div>
        ${statusHtml}
        <div class="schach-brett">${zellenHtml}</div>
        <div class="btn-primary" onclick="Strategie.starteGrundmatt('${gmFigurTyp}')" style="margin-top:16px;">Neu starten</div>
      </div>
    `);
  }

  function grundmattFeldGeklickt(feld) {
    if (gmBeendet || gmZustand.amZug !== 'w') return;
    const stein = gmZustand.board[feld];

    if (gmAusgewaehlt !== null) {
      const zug = gmZiele.find(z => z.nach === feld);
      if (zug) {
        gmZustand = SchachEngine.zugAusfuehren(gmZustand, zug);
        gmAusgewaehlt = null;
        gmZiele = [];
        const status = SchachEngine.spielstatus(gmZustand);
        if (status === 'matt') {
          Storage.addSterne(40);
          App.updateTopbar();
        }
        zeichneGrundmatt();
        if (status !== 'matt' && status !== 'patt') setTimeout(schwarzZiehen, 700);
        return;
      }
    }

    if (stein && stein.farbe === 'w') {
      gmAusgewaehlt = feld;
      gmZiele = SchachEngine.generiereLegaleZuege(gmZustand, feld);
    } else {
      gmAusgewaehlt = null;
      gmZiele = [];
    }
    zeichneGrundmatt();
  }

  function schwarzZiehen() {
    const zug = SchachEngine.waehleKiZugMitSchwierigkeit(gmZustand, 2, 0);
    if (zug) gmZustand = SchachEngine.zugAusfuehren(gmZustand, zug);
    zeichneGrundmatt();
  }

  // -----------------------------------------------------------------------
  // 4) Bauernendspiel-Wissen: feste, handgeprüfte Verständnisfragen statt
  // prozedural erzeugter Stellungen (siehe Kommentar am Dateianfang).
  // -----------------------------------------------------------------------
  const BAUERN_FRAGEN = [
    { frage: 'Ein Bauer hat keinen gegnerischen Bauern mehr vor sich (auf seiner Linie oder den Nachbarlinien). Wie nennt man so einen Bauern?', optionen: ['Freibauer', 'Doppelbauer', 'Randbauer'], richtig: 0 },
    { frage: 'Dein Freibauer ist schon auf der 6. Reihe, der gegnerische König ist noch weit weg. Wer hat hier gute Chancen?', optionen: ['Der Gegner', 'Du - der Bauer könnte durchlaufen', 'Niemand, das ist immer remis'], richtig: 1 },
    { frage: 'Warum ist es im Bauernendspiel oft gut, wenn dein König VOR dem eigenen Bauern steht (statt dahinter)?', optionen: ['Er kann den Bauern beschützen und ihm den Weg freimachen', 'Das ist verboten', 'Es spielt keine Rolle, wo der König steht'], richtig: 0 },
    { frage: 'Stehen sich die beiden Könige direkt mit einem Feld Abstand gegenüber und DU bist NICHT am Zug - wie nennt man das?', optionen: ['Fesselung', 'Opposition', 'Rochade'], richtig: 1 },
    { frage: 'Was ist meistens besser: ein Randbauer (a- oder h-Linie) oder ein Mittelbauer, um durchzulaufen?', optionen: ['Der Mittelbauer, er ist schwerer aufzuhalten', 'Der Randbauer, er läuft schneller', 'Beide sind komplett gleich'], richtig: 0 },
    { frage: 'Dein König steht der gegnerischen Bauern-Umwandlung genau im Weg. Solltest du ihn dort stehen lassen?', optionen: ['Ja, so blockierst du die Umwandlung', 'Nein, das ist immer ein Fehler', 'Der König darf dort gar nicht stehen'], richtig: 0 }
  ];

  function starteBauernQuiz() {
    const auswahl = shuffle(BAUERN_FRAGEN.slice()).slice(0, 5).map(f => ({
      typ: 'mc', frage: f.frage, optionen: f.optionen, richtigIndex: f.richtig
    }));
    const starter = () => App.startQuizSession('schach', auswahl, {
      onFinish: () => Storage.meldeTagesplanSchrittErledigt('strategie')
    });
    App.setLastStarter(starter);
    starter();
  }

  return {
    renderMenu,
    starteEroeffnungsQuiz,
    zeigeMaterialwerte, starteMaterialQuiz,
    renderGrundmattWahl, starteGrundmatt, grundmattFeldGeklickt,
    starteBauernQuiz
  };
})();
