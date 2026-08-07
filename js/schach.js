// Schach-Oberflaeche: bindet SchachEngine an App.render() an. Spielzustand lebt
// nur hier im Modul (kein Speichern/Fortsetzen zwischen Sitzungen - "Neue Partie"
// jedes Mal beim Reinklicken).
const Schach = (function () {
  let zustand = null;
  let spielerFarbe = 'w';
  let ausgewaehltesFeld = null;
  let legaleZiele = [];
  let spielLaeuft = false;
  const KI_TIEFE = 3;

  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  function renderMenu() {
    App.render(App.subMenuHtml('♟️ Schach gegen den Computer', [
      { emoji: '⚪', titel: 'Als Weiß spielen', onclick: 'Schach.starteSpiel("w")' },
      { emoji: '⚫', titel: 'Als Schwarz spielen', onclick: 'Schach.starteSpiel("b")' }
    ]));
  }

  function starteSpiel(farbe) {
    zustand = SchachEngine.anfangsstellung();
    spielerFarbe = farbe;
    ausgewaehltesFeld = null;
    legaleZiele = [];
    spielLaeuft = true;
    renderBrett();
    if (spielerFarbe !== zustand.amZug) setTimeout(kiZugAusfuehren, 500);
  }

  function findeKoenigFeld(zust, farbe) {
    for (let i = 0; i < 64; i++) {
      const s = zust.board[i];
      if (s && s.typ === 'k' && s.farbe === farbe) return i;
    }
    return null;
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

  function renderBrett() {
    const status = SchachEngine.spielstatus(zustand);

    let statusHtml = '';
    if (status === 'matt') {
      const spielerHatGewonnen = zustand.amZug !== spielerFarbe;
      statusHtml = spielerHatGewonnen
        ? '<div class="schach-status schach-status-sieg">🏆 Schachmatt! Du hast gewonnen!</div>'
        : '<div class="schach-status schach-status-niederlage">Schachmatt! Der Computer hat gewonnen.</div>';
    } else if (status === 'patt') {
      statusHtml = '<div class="schach-status">Patt – unentschieden.</div>';
    } else if (status === 'remis') {
      statusHtml = '<div class="schach-status">Unentschieden (zu wenig Material für ein Matt).</div>';
    } else if (status === 'schach') {
      statusHtml = '<div class="schach-status schach-status-schach">Schach!</div>';
    }
    if (status !== 'laeuft' && status !== 'schach') spielLaeuft = false;

    const infoText = !spielLaeuft ? '' : (zustand.amZug === spielerFarbe ? 'Du bist am Zug' : 'Computer denkt nach…');
    const schachKoenigFeld = (status === 'schach' || status === 'matt') ? findeKoenigFeld(zustand, zustand.amZug) : null;

    const zellenHtml = visuelleFelder().map(feld => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = zustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehltesFeld === feld) klassen += ' schach-feld-ausgewaehlt';
      if (legaleZiele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
      if (feld === schachKoenigFeld) klassen += ' schach-feld-schach';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      return `<div class="${klassen}" onclick="Schach.feldGeklickt(${feld})">${symbol}</div>`;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">⬅ Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        <div class="schach-brett">${zellenHtml}</div>
        <div class="btn-primary" onclick="Schach.starteSpiel('${spielerFarbe}')" style="margin-top:16px;">Neue Partie</div>
      </div>
    `);
  }

  function feldGeklickt(feld) {
    if (!spielLaeuft || zustand.amZug !== spielerFarbe) return;
    const stein = zustand.board[feld];

    if (ausgewaehltesFeld !== null) {
      const zug = legaleZiele.find(z => z.nach === feld);
      if (zug) {
        zustand = SchachEngine.zugAusfuehren(zustand, zug);
        ausgewaehltesFeld = null;
        legaleZiele = [];
        const status = SchachEngine.spielstatus(zustand);
        if (status === 'matt' && zustand.amZug !== spielerFarbe) {
          Storage.addSterne(30);
          App.updateTopbar();
        }
        renderBrett();
        if (status !== 'matt' && status !== 'patt' && status !== 'remis') {
          setTimeout(kiZugAusfuehren, 500);
        }
        return;
      }
    }

    if (stein && stein.farbe === spielerFarbe) {
      ausgewaehltesFeld = feld;
      legaleZiele = SchachEngine.generiereLegaleZuege(zustand, feld);
    } else {
      ausgewaehltesFeld = null;
      legaleZiele = [];
    }
    renderBrett();
  }

  function kiZugAusfuehren() {
    if (!spielLaeuft) return;
    const zug = SchachEngine.waehleKiZug(zustand, KI_TIEFE);
    if (!zug) { renderBrett(); return; }
    zustand = SchachEngine.zugAusfuehren(zustand, zug);
    renderBrett();
  }

  return { renderMenu, starteSpiel, feldGeklickt };
})();
