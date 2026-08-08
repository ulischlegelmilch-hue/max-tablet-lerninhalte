// Schach-Oberflaeche: bindet SchachEngine an App.render() an. Spielzustand lebt
// nur hier im Modul (kein Speichern/Fortsetzen zwischen Sitzungen - "Neue Partie"
// jedes Mal beim Reinklicken). Max waehlt die Stufe vor jeder Partie selbst aus
// (siehe renderStufenwahl/STUFEN); der Sieg-Zaehler dient nur noch dem
// "Stufe geschafft"-Hinweis, nicht mehr einer erzwungenen Gate-Logik.
const Schach = (function () {
  let zustand = null;
  let spielerFarbe = 'w';
  let ausgewaehltesFeld = null;
  let legaleZiele = [];
  let spielLaeuft = false;
  let letzterAufstiegsHinweis = '';

  // Jede Stufe: KI-Suchtiefe + Chance, statt des besten Zugs einen zufaelligen
  // (schlechten) Zug zu spielen - simuliert Anfaenger-Fehler auf niedrigen
  // Stufen. Nach `siegeZumAufstieg` gewonnenen Partien geht's eine Stufe hoch.
  const STUFEN = [
    { name: 'Stufe 1 – Erste Schritte', beschreibung: 'Ganz leicht, viele Patzer', tiefe: 1, zufallsChance: 0.6, siegeZumAufstieg: 2 },
    { name: 'Stufe 2 – Vorsichtig üben', beschreibung: 'Etwas wacher als Stufe 1', tiefe: 1, zufallsChance: 0.35, siegeZumAufstieg: 2 },
    { name: 'Stufe 3 – Wird ernster', beschreibung: 'Denkt schon etwas voraus', tiefe: 2, zufallsChance: 0.2, siegeZumAufstieg: 2 },
    { name: 'Stufe 4 – Ordentlicher Gegner', beschreibung: 'Macht kaum noch Fehler', tiefe: 2, zufallsChance: 0, siegeZumAufstieg: 2 },
    { name: 'Stufe 5 – Taktisch stark', beschreibung: 'Für Fortgeschrittene', tiefe: 3, zufallsChance: 0.1, siegeZumAufstieg: 3 },
    { name: 'Stufe 6 – Papa in echt schlagen!', beschreibung: 'Die schwerste Stufe', tiefe: 3, zufallsChance: 0, siegeZumAufstieg: Infinity }
  ];

  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  function aktuelleStufe() {
    const fortschritt = Storage.getSchachFortschritt();
    return STUFEN[Math.min(fortschritt.stufe, STUFEN.length - 1)];
  }

  function renderMenu() {
    App.render(App.subMenuHtml('♟️ Schach', [
      { emoji: '🎮', titel: 'Spielen', onclick: 'Schach.renderStufenwahl()' },
      { emoji: '📘', titel: 'Lektionen', onclick: 'SchachLektionen.renderMenu()' }
    ]));
  }

  function renderStufenwahl() {
    const aktuelleIdx = Storage.getSchachFortschritt().stufe;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">⬅ Zurück</span></div>
      <div class="welcome">Welche Stufe möchtest du spielen?</div>
      <div class="stufen-grid">
        ${STUFEN.map((s, i) => `
          <div class="stufen-card${i === aktuelleIdx ? ' stufen-card-aktiv' : ''}" onclick="Schach.waehleStufe(${i})">
            <div class="stufen-name">${s.name}</div>
            <div class="stufen-beschreibung">${s.beschreibung}</div>
          </div>
        `).join('')}
      </div>
    `);
  }

  function waehleStufe(i) {
    Storage.setSchachStufe(i);
    renderFarbwahl();
  }

  function renderFarbwahl() {
    const stufe = aktuelleStufe();
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderStufenwahl()">⬅ Andere Stufe</span></div>
      <div class="welcome">♟️ ${stufe.name}</div>
      <div class="sub-grid">
        <div class="sub-card" onclick="Schach.starteSpiel('w')"><span class="emoji">⚪</span>Als Weiß spielen</div>
        <div class="sub-card" onclick="Schach.starteSpiel('b')"><span class="emoji">⚫</span>Als Schwarz spielen</div>
      </div>
    `);
  }

  function starteSpiel(farbe) {
    zustand = SchachEngine.anfangsstellung();
    spielerFarbe = farbe;
    ausgewaehltesFeld = null;
    legaleZiele = [];
    spielLaeuft = true;
    letzterAufstiegsHinweis = '';
    renderBrett();
    if (spielerFarbe !== zustand.amZug) setTimeout(kiZugAusfuehren, 1000);
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
        ? `<div class="schach-status schach-status-sieg">🏆 Schachmatt! Du hast gewonnen!${letzterAufstiegsHinweis}</div>`
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
    const letzterZug = zustand.letzterZug;

    const zellenHtml = visuelleFelder().map(feld => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = zustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehltesFeld === feld) klassen += ' schach-feld-ausgewaehlt';
      if (legaleZiele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
      if (feld === schachKoenigFeld) klassen += ' schach-feld-schach';
      if (letzterZug && (feld === letzterZug.von || feld === letzterZug.nach)) klassen += ' schach-feld-letzter-zug';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      return `<div class="${klassen}" onclick="Schach.feldGeklickt(${feld})">${symbol}</div>`;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderStufenwahl()">⬅ Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">${aktuelleStufe().name}</div>
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
          behandleSieg();
        }
        renderBrett();
        if (status !== 'matt' && status !== 'patt' && status !== 'remis') {
          setTimeout(kiZugAusfuehren, 1000);
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

  function behandleSieg() {
    const stufeVorher = Storage.getSchachFortschritt().stufe;
    const fortschritt = Storage.meldeSchachSieg();
    const stufe = STUFEN[Math.min(stufeVorher, STUFEN.length - 1)];
    letzterAufstiegsHinweis = '';
    if (fortschritt.siege >= stufe.siegeZumAufstieg && stufeVorher < STUFEN.length - 1) {
      Storage.schachStufeAufsteigen();
      const neueStufe = STUFEN[stufeVorher + 1];
      letzterAufstiegsHinweis = ` Du steigst auf: „${neueStufe.name}"! 🎉`;
    }
    Storage.addSterne(30);
    App.updateTopbar();
  }

  function kiZugAusfuehren() {
    if (!spielLaeuft) return;
    const stufe = aktuelleStufe();
    const zug = SchachEngine.waehleKiZugMitSchwierigkeit(zustand, stufe.tiefe, stufe.zufallsChance);
    if (!zug) { renderBrett(); return; }
    zustand = SchachEngine.zugAusfuehren(zustand, zug);
    renderBrett();
  }

  return { renderMenu, renderStufenwahl, waehleStufe, renderFarbwahl, starteSpiel, feldGeklickt };
})();
