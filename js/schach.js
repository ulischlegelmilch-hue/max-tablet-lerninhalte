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
  let zugHistorie = []; // Kurznotation je ausgefuehrtem Zug, fuer die Zugliste
  let aufgegeben = false;

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
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const FIGURWERT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const NOTATIONS_BUCHSTABE = { k: 'K', q: 'D', r: 'T', b: 'L', n: 'S', p: '' };

  function feldName(feld) {
    return DATEIEN[SchachEngine.fileOf(feld)] + (SchachEngine.rankOf(feld) + 1);
  }

  /** Kurznotation eines bereits ausgefuehrten Zugs (ohne Mehrdeutigkeits-
   *  Aufloesung bei zwei gleichen Figuren, die dasselbe Ziel erreichen
   *  koennten - fuer eine Kinder-Zugliste ausreichend genau). */
  function zugKurzNotation(zug) {
    if (zug.rochade === 'K') return 'O-O';
    if (zug.rochade === 'D') return 'O-O-O';
    const buchstabe = NOTATIONS_BUCHSTABE[zug.stein.typ];
    const schlag = (zug.schlag || zug.enPassant) ? 'x' : '';
    const vonSpalte = (zug.stein.typ === 'p' && schlag) ? DATEIEN[SchachEngine.fileOf(zug.von)] : '';
    const promo = zug.promotion ? '=' + NOTATIONS_BUCHSTABE[zug.promotion] : '';
    return `${buchstabe}${vonSpalte}${schlag}${feldName(zug.nach)}${promo}`;
  }

  /** Geschlagene Figuren + Materialvorteil aus der aktuellen Brettstellung
   *  (Vergleich mit der Grundstellung noetig, da wir keine laufende Liste
   *  fuehren - so bleibt es robust, egal ob per Klick oder KI geschlagen wurde). */
  function materialUebersicht(zust) {
    const vorhanden = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    for (const stein of zust.board) {
      if (stein && stein.typ !== 'k') vorhanden[stein.farbe][stein.typ]++;
    }
    const GRUNDANZAHL = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const geschlagenVon = { w: [], b: [] }; // geschlagenVon.w = vom weissen Spieler geschlagene (schwarze) Figuren
    let wertW = 0, wertB = 0;
    for (const typ of ['q', 'r', 'b', 'n', 'p']) {
      const fehlendSchwarz = GRUNDANZAHL[typ] - vorhanden.b[typ];
      for (let i = 0; i < fehlendSchwarz; i++) geschlagenVon.w.push(typ);
      const fehlendWeiss = GRUNDANZAHL[typ] - vorhanden.w[typ];
      for (let i = 0; i < fehlendWeiss; i++) geschlagenVon.b.push(typ);
      wertW += vorhanden.w[typ] * FIGURWERT[typ];
      wertB += vorhanden.b[typ] * FIGURWERT[typ];
    }
    return { geschlagenVon, vorteil: wertW - wertB };
  }

  function geschlagenHtml(figuren, farbeDerFiguren) {
    return figuren.map(t => FIGUR_SYMBOL[farbeDerFiguren][t]).join('');
  }

  /** Baut die Rang-/Datei-Beschriftung AUSSERHALB des Bretts (wie bei einem
   *  echten Schachbrett) aus derselben visuell geordneten Feldliste, die auch
   *  fuer die Zellen selbst verwendet wird - garantiert automatisch dieselbe
   *  Ausrichtung (auch bei gedrehtem Brett), ohne die Orientierungslogik ein
   *  zweites Mal nachzubauen. */
  function koordLeisten(felderOrient) {
    let rang = '', datei = '';
    for (let i = 0; i < 8; i++) {
      rang += `<div>${SchachEngine.rankOf(felderOrient[i * 8]) + 1}</div>`;
      datei += `<div>${DATEIEN[SchachEngine.fileOf(felderOrient[56 + i])]}</div>`;
    }
    return { rang, datei };
  }

  function aktuelleStufe() {
    const fortschritt = Storage.getSchachFortschritt();
    return STUFEN[Math.min(fortschritt.stufe, STUFEN.length - 1)];
  }

  function renderMenu() {
    App.render(App.subMenuHtml('Schach', [
      { icon: 'tagesaufgabe', titel: 'Heute üben', onclick: 'Schach.renderTagesplan()' },
      { icon: 'spielen', titel: 'Spielen', onclick: 'Schach.renderStufenwahl()' },
      { icon: 'online', titel: 'Online gegen Papa', onclick: 'SchachOnline.starteAnsicht()' },
      { icon: 'lektionen', titel: 'Lektionen', onclick: 'SchachLektionen.renderMenu()' },
      { icon: 'taktik', titel: 'Taktik-Training', onclick: 'SchachTaktik.renderMenu()' },
      { icon: 'konzentration', titel: 'Konzentration', onclick: 'Konzentration.renderMenu()' },
      { icon: 'materialwert', titel: 'Strategie', onclick: 'Strategie.renderMenu()' }
    ]));
  }

  // -------------------------------------------------------------------
  // Schach-Tagesplan: verbindet Taktik/Konzentration/Strategie zu einem
  // kurzen taeglichen Pensum (siehe Storage.getSchachTagesplan). Jeder
  // Schritt hakt sich selbst ab, sobald das jeweilige Modul eine Runde
  // abgeschlossen hat (Storage.meldeTagesplanSchrittErledigt) - unabhaengig
  // davon, ob er hier oder direkt ueber das Modul-Menue gestartet wurde.
  // -------------------------------------------------------------------
  const TAKTIK_THEMA_NAMEN = { fork: 'Gabeln', pin: 'Fesselungen', skewer: 'Spieße', discoveredAttack: 'Abzugsangriffe' };
  const KONZENTRATION_SPIEL_NAMEN = { koordinaten: 'Koordinaten finden', feldfarbe: 'Feldfarbe-Quiz', laeuferweg: 'Läufer-Weg merken' };
  const STRATEGIE_QUIZ_NAMEN = { eroeffnung: 'Eröffnungsprinzipien', material: 'Materialwerte', bauern: 'Bauernendspiel-Wissen' };

  function schrittLabel(s) {
    if (s.typ === 'taktik') return 'Taktik: ' + (TAKTIK_THEMA_NAMEN[s.thema] || s.thema);
    if (s.typ === 'konzentration') return 'Konzentration: ' + (KONZENTRATION_SPIEL_NAMEN[s.spiel] || s.spiel);
    return 'Strategie: ' + (STRATEGIE_QUIZ_NAMEN[s.quiz] || s.quiz);
  }

  function schrittOnclick(s) {
    if (s.typ === 'taktik') return `SchachTaktik.starteSession('${s.thema}')`;
    if (s.typ === 'konzentration') {
      if (s.spiel === 'koordinaten') return 'Konzentration.starteKoordinaten()';
      if (s.spiel === 'feldfarbe') return 'Konzentration.starteFeldfarbe()';
      return 'Konzentration.starteLaeuferWeg()';
    }
    if (s.quiz === 'eroeffnung') return 'Strategie.starteEroeffnungsQuiz()';
    if (s.quiz === 'material') return 'Strategie.zeigeMaterialwerte()';
    return 'Strategie.starteBauernQuiz()';
  }

  function renderTagesplan() {
    const plan = Storage.getSchachTagesplan();
    const alleErledigt = plan.schritte.every(s => s.erledigt);
    const zeilenHtml = plan.schritte.map(s => `
      <div class="regel-zeile">
        <span>${s.erledigt ? '✅' : '⬜'} ${schrittLabel(s)}</span>
        ${s.erledigt ? '' : `<span class="btn-primary" style="padding:8px 16px;" onclick="${schrittOnclick(s)}">Los</span>`}
      </div>
    `).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Dein Schach-Tagesplan</div>
      <div class="lese-text">${alleErledigt ? 'Alles geschafft für heute – klasse gemacht! ✅' : 'Ein paar kurze Übungen für heute (zusammen etwa 15–20 Minuten).'}</div>
      <div class="regel-karte"><div class="regel-liste">${zeilenHtml}</div></div>
    `);
  }

  function renderStufenwahl() {
    const aktuelleIdx = Storage.getSchachFortschritt().stufe;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
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
      <div class="back-row"><span class="back-btn" onclick="Schach.renderStufenwahl()">${Icons.svg('zurueck')} Andere Stufe</span></div>
      <div class="welcome">${stufe.name}</div>
      <div class="sub-grid">
        <div class="sub-card" onclick="Schach.starteSpiel('w')"><span class="sub-icon farbe-kreis farbe-weiss"></span><span class="sub-label">Als Weiß spielen</span></div>
        <div class="sub-card" onclick="Schach.starteSpiel('b')"><span class="sub-icon farbe-kreis farbe-schwarz"></span><span class="sub-label">Als Schwarz spielen</span></div>
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
    zugHistorie = [];
    aufgegeben = false;
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

  function zuglisteHtml() {
    if (zugHistorie.length === 0) return '<div class="schach-zugliste-leer">Noch keine Züge.</div>';
    let rows = '';
    for (let i = 0; i < zugHistorie.length; i += 2) {
      const nr = i / 2 + 1;
      rows += `<div class="schach-zugliste-zeile"><span class="schach-zugliste-nr">${nr}.</span><span class="schach-zugliste-zug">${zugHistorie[i] || ''}</span><span class="schach-zugliste-zug">${zugHistorie[i + 1] || ''}</span></div>`;
    }
    return rows;
  }

  function renderBrett() {
    const status = SchachEngine.spielstatus(zustand);

    let statusHtml = '';
    if (aufgegeben) {
      statusHtml = '<div class="schach-status schach-status-niederlage">Du hast aufgegeben.</div>';
    } else if (status === 'matt') {
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

    const felderOrient = visuelleFelder();
    const zellenHtml = felderOrient.map((feld) => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = zustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehltesFeld === feld) klassen += ' schach-feld-ausgewaehlt';
      if (legaleZiele.some(z => z.nach === feld)) klassen += zustand.board[feld] ? ' schach-feld-ziel-schlag' : ' schach-feld-ziel';
      if (feld === schachKoenigFeld) klassen += ' schach-feld-schach';
      if (letzterZug && (feld === letzterZug.von || feld === letzterZug.nach)) klassen += ' schach-feld-letzter-zug';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      return `<div class="${klassen}" onclick="Schach.feldGeklickt(${feld})">${symbol}</div>`;
    }).join('');
    const { rang: rangLeisteHtml, datei: dateiLeisteHtml } = koordLeisten(felderOrient);

    const gegnerFarbe = spielerFarbe === 'w' ? 'b' : 'w';
    const { geschlagenVon, vorteil } = materialUebersicht(zustand);
    const spielerVorteil = spielerFarbe === 'w' ? vorteil : -vorteil;
    const spielerGeschlagenHtml = geschlagenHtml(geschlagenVon[spielerFarbe], gegnerFarbe);
    const gegnerGeschlagenHtml = geschlagenHtml(geschlagenVon[gegnerFarbe], spielerFarbe);

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderStufenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">${aktuelleStufe().name}</div>
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        <div class="schach-spieler-leiste">
          <span class="schach-spieler-name">🖥️ Computer</span>
          <span class="schach-geschlagen">${gegnerGeschlagenHtml}${spielerVorteil < 0 ? `<span class="schach-materialvorteil">+${-spielerVorteil}</span>` : ''}</span>
        </div>
        <div class="schach-rahmen">
          <div class="schach-brett-zeile">
            <div class="schach-rang-leiste">${rangLeisteHtml}</div>
            <div class="schach-brett">${zellenHtml}</div>
          </div>
          <div class="schach-datei-zeile">
            <div class="schach-rang-spacer"></div>
            <div class="schach-datei-leiste">${dateiLeisteHtml}</div>
          </div>
        </div>
        <div class="schach-spieler-leiste">
          <span class="schach-spieler-name">🙂 Du</span>
          <span class="schach-geschlagen">${spielerGeschlagenHtml}${spielerVorteil > 0 ? `<span class="schach-materialvorteil">+${spielerVorteil}</span>` : ''}</span>
        </div>
        <div class="schach-aktionsleiste">
          ${spielLaeuft
            ? `<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Schach.aufgeben()">Aufgeben</span>`
            : `<span class="schach-aktion-btn" onclick="Schach.starteSpiel('${spielerFarbe}')">Neue Partie</span>`}
        </div>
        <div class="schach-zugliste">${zuglisteHtml()}</div>
      </div>
    `);
  }

  function aufgeben() {
    if (!spielLaeuft) return;
    spielLaeuft = false;
    aufgegeben = true;
    renderBrett();
  }

  function feldGeklickt(feld) {
    if (!spielLaeuft || zustand.amZug !== spielerFarbe) return;
    const stein = zustand.board[feld];

    if (ausgewaehltesFeld !== null) {
      const zug = legaleZiele.find(z => z.nach === feld);
      if (zug) {
        zugHistorie.push(zugKurzNotation(zug));
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
    zugHistorie.push(zugKurzNotation(zug));
    zustand = SchachEngine.zugAusfuehren(zustand, zug);
    renderBrett();
  }

  // Fuer die Fortschrittsanzeige auf der Home-Kachel (siehe App.gotoHome).
  function aktuelleStufeName() { return aktuelleStufe().name; }

  return { renderMenu, renderTagesplan, renderStufenwahl, waehleStufe, renderFarbwahl, starteSpiel, feldGeklickt, aufgeben, aktuelleStufeName };
})();
