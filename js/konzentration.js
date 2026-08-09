// Konzentrationstraining: drei kurze, in sich abgeschlossene Uebungen, die NICHT
// auf Schach-Regelkenntnis abzielen (das macht Taktik/Lektionen), sondern auf
// Brett-Wahrnehmung und mentales Vorstellungsvermoegen - genau die Faehigkeiten,
// die spaeter beim vorausschauenden Rechnen von Zuegen helfen.
const Konzentration = (function () {
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  function feldName(rank, file) { return DATEIEN[file] + (rank + 1); }

  function renderMenu() {
    App.render(App.subMenuHtml('Konzentration', [
      { icon: 'koordinaten', titel: 'Koordinaten finden', onclick: 'Konzentration.starteKoordinaten()' },
      { icon: 'feldfarbe', titel: 'Feldfarbe-Quiz', onclick: 'Konzentration.starteFeldfarbe()' },
      { icon: 'laeuferweg', titel: 'Läufer-Weg merken', onclick: 'Konzentration.starteLaeuferWeg()' }
    ]));
  }

  // -----------------------------------------------------------------------
  // 1) Koordinaten finden: Zielfeld wird genannt, auf leerem 8x8-Brett mit
  // Rand-Beschriftung (wie ein echtes Brett) antippen. Zeitmessung ueber eine
  // feste Rundenzahl, Bestzeit wird gespeichert.
  // -----------------------------------------------------------------------
  const KOORD_RUNDEN = 10;
  let koordSession = null;

  function starteKoordinaten() {
    const runden = [];
    for (let i = 0; i < KOORD_RUNDEN; i++) {
      runden.push({ rank: Math.floor(Math.random() * 8), file: Math.floor(Math.random() * 8) });
    }
    koordSession = { runden, index: 0, start: Date.now(), fehlklicks: 0 };
    zeichneKoordinaten();
  }

  function zeichneKoordinaten() {
    const ziel = koordSession.runden[koordSession.index];
    const zellenHtml = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const rank = 7 - visRow, file = visCol;
        const hell = (rank + file) % 2 === 1;
        let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
        let labelHtml = '';
        if (file === 0) labelHtml += `<span class="koord-label koord-label-rang">${rank + 1}</span>`;
        if (rank === 0) labelHtml += `<span class="koord-label koord-label-datei">${DATEIEN[file]}</span>`;
        zellenHtml.push(`<div class="${klassen}" onclick="Konzentration.koordFeldGeklickt(${rank},${file})">${labelHtml}</div>`);
      }
    }
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Konzentration.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Runde ${koordSession.index + 1} / ${koordSession.runden.length}</div>
        <div class="koord-ziel">Finde: <span class="koord-ziel-name">${feldName(ziel.rank, ziel.file)}</span></div>
        <div class="schach-brett">${zellenHtml.join('')}</div>
      </div>
    `);
  }

  function koordFeldGeklickt(rank, file) {
    const ziel = koordSession.runden[koordSession.index];
    if (rank === ziel.rank && file === ziel.file) {
      koordSession.index++;
      if (koordSession.index >= koordSession.runden.length) {
        beendeKoordinaten();
      } else {
        zeichneKoordinaten();
      }
    } else {
      koordSession.fehlklicks++;
    }
  }

  function beendeKoordinaten() {
    Storage.meldeTagesplanSchrittErledigt('konzentration');
    const dauerMs = Date.now() - koordSession.start;
    const { istNeuerRekord, bestzeitMs } = Storage.meldeKoordinatenZeit(dauerMs);
    Storage.addSterne(20);
    App.updateTopbar();
    const sek = (dauerMs / 1000).toFixed(1);
    const bestSek = (bestzeitMs / 1000).toFixed(1);
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${istNeuerRekord ? '🏆' : '⏱️'}</div>
        <div class="result-title">${sek} Sekunden${koordSession.fehlklicks ? ' · ' + koordSession.fehlklicks + ' Fehlversuche' : ''}</div>
        <div class="result-sterne">Du hast 20 ⭐ verdient${istNeuerRekord ? ' – NEUE BESTZEIT!' : ` (Bestzeit: ${bestSek} s)`}</div>
        <div class="btn-primary" onclick="Konzentration.starteKoordinaten()">Nochmal</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Konzentration.renderMenu()">Zurück</div>
      </div>
    `);
  }

  // -----------------------------------------------------------------------
  // 2) Feldfarbe-Quiz: reine Multiple-Choice-Fragen ("Welche Farbe hat Feld
  // e5?") - braucht keine eigene UI, laeuft komplett ueber das bestehende
  // App.startQuizSession (wie Mathe/Deutsch/Heimatkunde).
  // -----------------------------------------------------------------------
  function genFeldfarbeFragen(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const rank = Math.floor(Math.random() * 8), file = Math.floor(Math.random() * 8);
      const hell = (rank + file) % 2 === 1;
      const richtig = hell ? 'Hell' : 'Dunkel';
      const falsch = hell ? 'Dunkel' : 'Hell';
      const optionen = Math.random() < 0.5 ? [richtig, falsch] : [falsch, richtig];
      fragen.push({
        typ: 'mc',
        frage: `Welche Farbe hat Feld ${feldName(rank, file)}?`,
        optionen,
        richtigIndex: optionen.indexOf(richtig)
      });
    }
    return fragen;
  }

  function starteFeldfarbe() {
    const starter = () => App.startQuizSession('schach', genFeldfarbeFragen(10), {
      onFinish: () => Storage.meldeTagesplanSchrittErledigt('konzentration')
    });
    App.setLastStarter(starter);
    starter();
  }

  // -----------------------------------------------------------------------
  // 3) Läufer-Weg merken (Blindschach-light): ein Läufer startet sichtbar auf
  // einem kleinen 4x4-Denkfeld, zieht dann eine kurze Folge diagonaler
  // Schritte - die als Text angezeigt werden, WAEHREND das Brett leer bleibt.
  // Das Kind muss den Weg im Kopf nachvollziehen und das Zielfeld antippen.
  // -----------------------------------------------------------------------
  const DENKFELD_N = 4;
  const LAEUFER_SCHRITTE = 3;
  const LAEUFER_RUNDEN = 5;
  const DIAGONAL_RICHTUNGEN = [
    { dr: -1, dc: 1, pfeil: '↗', text: 'oben-rechts' },
    { dr: -1, dc: -1, pfeil: '↖', text: 'oben-links' },
    { dr: 1, dc: 1, pfeil: '↘', text: 'unten-rechts' },
    { dr: 1, dc: -1, pfeil: '↙', text: 'unten-links' }
  ];

  let laeuferSession = null;

  function generierePfad() {
    let r = Math.floor(Math.random() * DENKFELD_N), c = Math.floor(Math.random() * DENKFELD_N);
    const start = { r, c };
    const schritte = [];
    for (let i = 0; i < LAEUFER_SCHRITTE; i++) {
      const moeglich = DIAGONAL_RICHTUNGEN.filter(d =>
        r + d.dr >= 0 && r + d.dr < DENKFELD_N && c + d.dc >= 0 && c + d.dc < DENKFELD_N
      );
      const wahl = moeglich[Math.floor(Math.random() * moeglich.length)];
      r += wahl.dr; c += wahl.dc;
      schritte.push(wahl);
    }
    return { start, schritte, ziel: { r, c } };
  }

  function starteLaeuferWeg() {
    const runden = [];
    for (let i = 0; i < LAEUFER_RUNDEN; i++) runden.push(generierePfad());
    laeuferSession = { runden, index: 0, richtigCount: 0, sterneGesamt: 0 };
    zeigeLaeuferStart();
  }

  /** pieceAt: {r,c} oder null - wo (falls ueberhaupt) der Läufer gezeichnet wird.
   *  Bewusst NICHT an runde.start gekoppelt, damit im Ergebnis-Screen auch das
   *  tatsaechliche Zielfeld gezeigt werden kann. */
  function denkfeldZellenHtml(pieceAt, ausgewaehlt, klickbar) {
    const zellen = [];
    for (let r = 0; r < DENKFELD_N; r++) {
      for (let c = 0; c < DENKFELD_N; c++) {
        const hell = (r + c) % 2 === 1;
        let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
        if (ausgewaehlt && ausgewaehlt.r === r && ausgewaehlt.c === c) klassen += ' schach-feld-ausgewaehlt';
        const symbol = (pieceAt && pieceAt.r === r && pieceAt.c === c) ? '♗' : '';
        const onclick = klickbar ? ` onclick="Konzentration.laeuferFeldGeklickt(${r},${c})"` : '';
        zellen.push(`<div class="${klassen}"${onclick}>${symbol}</div>`);
      }
    }
    return zellen.join('');
  }

  function zeigeLaeuferStart() {
    const runde = laeuferSession.runden[laeuferSession.index];
    const nr = laeuferSession.index + 1, total = laeuferSession.runden.length;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Konzentration.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Runde ${nr} / ${total} · Präg dir das Startfeld ein…</div>
        <div class="denkfeld-brett">${denkfeldZellenHtml(runde.start, null, false)}</div>
      </div>
    `);
    setTimeout(zeigeLaeuferWeg, 1300);
  }

  function zeigeLaeuferWeg() {
    const runde = laeuferSession.runden[laeuferSession.index];
    const nr = laeuferSession.index + 1, total = laeuferSession.runden.length;
    const schritteHtml = runde.schritte.map((s, i) =>
      `<div class="laeufer-schritt"><span class="laeufer-schritt-pfeil">${s.pfeil}</span> Schritt ${i + 1}: schräg nach ${s.text}</div>`
    ).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Konzentration.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Runde ${nr} / ${total} · Wo landet der Läufer?</div>
        <div class="laeufer-schritte">${schritteHtml}</div>
        <div class="denkfeld-brett">${denkfeldZellenHtml(null, null, true)}</div>
      </div>
    `);
  }

  function laeuferFeldGeklickt(r, c) {
    const runde = laeuferSession.runden[laeuferSession.index];
    const korrekt = r === runde.ziel.r && c === runde.ziel.c;
    const gained = Storage.addAntwort('schach', korrekt);
    if (korrekt) laeuferSession.richtigCount++;
    laeuferSession.sterneGesamt += gained;
    App.updateTopbar();

    const nr = laeuferSession.index + 1, total = laeuferSession.runden.length;
    const feedbackText = korrekt ? `✔ Richtig! +${gained} ⭐` : '✘ Hier ist er wirklich gelandet:';
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Konzentration.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">Runde ${nr} / ${total}</div>
        <div class="schach-status ${korrekt ? 'schach-status-sieg' : 'schach-status-niederlage'}">${feedbackText}</div>
        <div class="denkfeld-brett">${denkfeldZellenHtml(runde.ziel, { r, c }, false)}</div>
      </div>
    `);
    setTimeout(naechsteLaeuferRunde, 1900);
  }

  function naechsteLaeuferRunde() {
    laeuferSession.index++;
    if (laeuferSession.index >= laeuferSession.runden.length) {
      renderLaeuferErgebnis();
    } else {
      zeigeLaeuferStart();
    }
  }

  function renderLaeuferErgebnis() {
    Storage.meldeTagesplanSchrittErledigt('konzentration');
    const total = laeuferSession.runden.length;
    const quote = laeuferSession.richtigCount / total;
    const emoji = quote >= 0.8 ? '🏆' : quote >= 0.5 ? '🎉' : '👍';
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${laeuferSession.richtigCount} von ${total} richtig!</div>
        <div class="result-sterne">Du hast ${laeuferSession.sterneGesamt} ⭐ verdient</div>
        <div class="btn-primary" onclick="Konzentration.starteLaeuferWeg()">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Konzentration.renderMenu()">Zurück</div>
      </div>
    `);
  }

  return {
    renderMenu,
    starteKoordinaten, koordFeldGeklickt,
    starteFeldfarbe,
    starteLaeuferWeg, laeuferFeldGeklickt
  };
})();
