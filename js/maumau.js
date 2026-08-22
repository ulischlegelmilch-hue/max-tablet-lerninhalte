// Mau-Mau gegen den Computer. Regeln/Kartenmathematik leben in maumau-
// engine.js (MauMauEngine) - dieses Modul ist nur Oberflaeche + KI.
//
// Bindet sich wie schach.js/schiffeversenken.js direkt an App.render() an -
// kein Speichern/Fortsetzen zwischen Sitzungen, "Neue Runde" baut jedes Mal
// frisch auf.
const Maumau = (function () {
  const E = MauMauEngine;
  const HANDGROESSE = 5;

  function renderMenu() {
    App.render(App.subMenuHtml('Mau-Mau', [
      { icon: 'maumau', titel: 'Neues Spiel', onclick: 'Maumau.starteSpiel()' },
      { icon: 'online', titel: 'Online gegen Papa', onclick: 'MaumauOnline.starteAnsicht()' },
      { icon: 'einstellungen', titel: 'Spielregeln', onclick: 'Maumau.renderRegeln()' }
    ]));
  }

  function renderRegeln() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Maumau.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="maumau-wrap">
        <div class="welcome">Spielregeln</div>
        <div class="frage-card maumau-regeln-card">
          <p>Jeder bekommt 5 Karten aus einem 32er-Blatt (7 bis Ass, vier Farben). Wer zuerst keine Karten mehr hat, gewinnt!</p>
          <p>Du legst eine Karte, die zur obenliegenden Karte passt - <strong>gleiche Farbe</strong> oder <strong>gleicher Wert</strong>. Passt nichts, ziehst du eine Karte vom Stapel.</p>
          <ul>
            <li><strong>7</strong> – der Nächste zieht 2 Karten (mehrere Siebenen hintereinander addieren sich!)</li>
            <li><strong>8</strong> – der Nächste setzt aus</li>
            <li><strong>Bube</strong> – passt immer, du wünschst dir danach eine neue Farbe</li>
          </ul>
        </div>
      </div>
    `);
  }

  // -----------------------------------------------------------------------
  // Spielzustand
  // -----------------------------------------------------------------------
  let spielerHand = [];
  let computerHand = [];
  let nachziehstapel = [];
  let ablagestapel = []; // letzter Eintrag = obenliegende Karte
  let gewuenschteFarbe = null; // nach einem gespielten Buben
  let ziehstrafe = 0; // aktive Sieben-Kette: so viele Karten muss der naechste ziehen
  let amZug = 'spieler';
  let spielLaeuft = false;
  let aufgegeben = false;
  let spielerHatGewonnen = false;
  let gezogeneKarteIndex = null; // Index in spielerHand der gerade gezogenen, noch spielbaren Karte
  let farbwahlAktiv = false;
  let kiTimeoutHandle = null;

  function raeumeKiTimeoutAuf() {
    if (kiTimeoutHandle) { clearTimeout(kiTimeoutHandle); kiTimeoutHandle = null; }
  }

  /** Sucht im restlichen Nachziehstapel die erste NICHT-Sonderkarte (7/8/
   *  Bube) als Startkarte, damit die Partie nicht schon mit einer erzwungenen
   *  Zugfolge beginnt - bei nur 12 von 32 Sonderkarten praktisch immer sofort
   *  erfolgreich. */
  function ziehGueltigeStartkarte(deck) {
    for (let i = 0; i < deck.length; i++) {
      if (!['7', '8', 'B'].includes(deck[i].wert)) return deck.splice(i, 1)[0];
    }
    return deck.shift();
  }

  function stelleNachziehstapelSicher() {
    if (nachziehstapel.length > 0) return;
    if (ablagestapel.length <= 1) return; // nichts zum Nachmischen da
    const oben = ablagestapel.pop();
    nachziehstapel = E.mische(ablagestapel);
    ablagestapel = [oben];
  }

  function starteSpiel() {
    const deck = E.mische(E.neuesDeck());
    spielerHand = deck.splice(0, HANDGROESSE);
    computerHand = deck.splice(0, HANDGROESSE);
    ablagestapel = [ziehGueltigeStartkarte(deck)];
    nachziehstapel = deck;
    gewuenschteFarbe = null;
    ziehstrafe = 0;
    amZug = 'spieler';
    spielLaeuft = true;
    aufgegeben = false;
    spielerHatGewonnen = false;
    gezogeneKarteIndex = null;
    farbwahlAktiv = false;
    renderSpiel();
  }

  function obenliegendeKarte() { return ablagestapel[ablagestapel.length - 1]; }

  function waehleComputerFarbe() {
    const zaehlung = { kreuz: 0, pik: 0, herz: 0, karo: 0 };
    computerHand.forEach(k => zaehlung[k.farbe]++);
    return Object.keys(zaehlung).reduce((a, b) => (zaehlung[a] >= zaehlung[b] ? a : b));
  }

  /** Zentrale Spiellogik fuers Ablegen einer Karte - von Spieler UND Computer
   *  genutzt, damit Sieben-/Acht-/Buben-Effekte nur an einer Stelle stehen. */
  function spieleKarte(wer, index) {
    const hand = wer === 'spieler' ? spielerHand : computerHand;
    const karte = hand.splice(index, 1)[0];
    ablagestapel.push(karte);
    gewuenschteFarbe = null;
    if (wer === 'spieler') gezogeneKarteIndex = null;
    if (karte.wert === '7') ziehstrafe += 2;

    if (hand.length === 0) {
      spielLaeuft = false;
      aufgegeben = false;
      spielerHatGewonnen = wer === 'spieler';
      if (spielerHatGewonnen) {
        Storage.meldeMauMauSieg();
        Storage.addSterne(20);
        App.updateTopbar();
      }
      renderSpiel();
      return;
    }

    if (karte.wert === 'B') {
      if (wer === 'spieler') {
        farbwahlAktiv = true;
        renderSpiel();
      } else {
        gewuenschteFarbe = waehleComputerFarbe();
        naechsterZug(wer, false);
      }
      return;
    }

    naechsterZug(wer, karte.wert === '8');
  }

  /** warAcht: der jeweils ANDERE Spieler wird ausgesetzt - bei nur zwei
   *  Spielern heisst das schlicht "wer sie gelegt hat, ist gleich nochmal dran". */
  function naechsterZug(wer, warAcht) {
    amZug = warAcht ? wer : (wer === 'spieler' ? 'computer' : 'spieler');
    renderSpiel();
    if (spielLaeuft && amZug === 'computer') kiTimeoutHandle = setTimeout(computerZug, 900);
  }

  function spielerKarteGeklickt(index) {
    if (!spielLaeuft || amZug !== 'spieler' || farbwahlAktiv) return;
    if (gezogeneKarteIndex !== null && index !== gezogeneKarteIndex) return;
    const karte = spielerHand[index];
    if (ziehstrafe > 0 && karte.wert !== '7') return;
    if (!E.istLegbar(karte, obenliegendeKarte(), gewuenschteFarbe)) return;
    spieleKarte('spieler', index);
  }

  function spielerZieheKarte() {
    if (!spielLaeuft || amZug !== 'spieler' || farbwahlAktiv || gezogeneKarteIndex !== null) return;
    if (ziehstrafe > 0) {
      for (let i = 0; i < ziehstrafe; i++) {
        stelleNachziehstapelSicher();
        if (nachziehstapel.length) spielerHand.push(nachziehstapel.pop());
      }
      ziehstrafe = 0;
      naechsterZug('spieler', false);
      return;
    }
    stelleNachziehstapelSicher();
    if (!nachziehstapel.length) { naechsterZug('spieler', false); return; }
    const karte = nachziehstapel.pop();
    spielerHand.push(karte);
    if (E.istLegbar(karte, obenliegendeKarte(), gewuenschteFarbe)) {
      gezogeneKarteIndex = spielerHand.length - 1;
      renderSpiel();
    } else {
      naechsterZug('spieler', false);
    }
  }

  function spielerPasse() {
    if (!spielLaeuft || amZug !== 'spieler' || gezogeneKarteIndex === null) return;
    gezogeneKarteIndex = null;
    naechsterZug('spieler', false);
  }

  function waehleFarbe(farbe) {
    if (!farbwahlAktiv) return;
    gewuenschteFarbe = farbe;
    farbwahlAktiv = false;
    naechsterZug('spieler', false);
  }

  function computerZug() {
    kiTimeoutHandle = null;
    if (!spielLaeuft) return;
    const oben = obenliegendeKarte();

    if (ziehstrafe > 0) {
      const siebenIndex = computerHand.findIndex(k => k.wert === '7');
      // 65% Chance, eine vorhandene Sieben weiterzugeben statt selbst zu
      // ziehen - immer maximal aggressiv waere fuer ein Kind zu hart
      // (gleiche Kalibrier-Philosophie wie Schach.STUFEN/Schiffe-KI).
      if (siebenIndex !== -1 && Math.random() < 0.65) {
        spieleKarte('computer', siebenIndex);
        return;
      }
      for (let i = 0; i < ziehstrafe; i++) {
        stelleNachziehstapelSicher();
        if (nachziehstapel.length) computerHand.push(nachziehstapel.pop());
      }
      ziehstrafe = 0;
      naechsterZug('computer', false);
      return;
    }

    const legbare = E.legbareKarten(computerHand, oben, gewuenschteFarbe);
    // Bevorzugt normale Karten vor Sonderkarten (spart 7/8/Bube fuer spaeter
    // auf) - danach Acht (verschafft sich selbst nochmal einen Zug), dann
    // Sieben, zuletzt Bube (Wildcard, haelt sich Optionen offen).
    const wahl =
      legbare.find(k => !['7', '8', 'B'].includes(k.wert)) ||
      legbare.find(k => k.wert === '8') ||
      legbare.find(k => k.wert === '7') ||
      legbare.find(k => k.wert === 'B');

    if (wahl) {
      spieleKarte('computer', computerHand.indexOf(wahl));
      return;
    }

    stelleNachziehstapelSicher();
    if (!nachziehstapel.length) { naechsterZug('computer', false); return; }
    const gezogen = nachziehstapel.pop();
    computerHand.push(gezogen);
    // 60% Chance, die frisch gezogene Karte sofort zu spielen statt sie zu
    // behalten - nicht IMMER optimal, wirkt sonst zu maschinell.
    if (E.istLegbar(gezogen, oben, gewuenschteFarbe) && Math.random() < 0.6) {
      spieleKarte('computer', computerHand.length - 1);
    } else {
      naechsterZug('computer', false);
    }
  }

  function aufgeben() {
    if (!spielLaeuft) return;
    raeumeKiTimeoutAuf();
    spielLaeuft = false;
    aufgegeben = true;
    renderSpiel();
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  function karteHtml(karte, klassen, onclick) {
    const farbeKlasse = E.FARBROT[karte.farbe] ? 'karte-rot' : 'karte-schwarz';
    const klick = onclick ? ` onclick="${onclick}"` : '';
    return `<div class="maumau-karte ${farbeKlasse}${klassen ? ' ' + klassen : ''}"${klick}>
      <span class="maumau-karte-wert">${karte.wert}</span>
      <span class="maumau-karte-symbol">${E.FARBSYMBOL[karte.farbe]}</span>
    </div>`;
  }

  function renderSpiel() {
    const oben = obenliegendeKarte();
    let statusHtml = '';
    if (aufgegeben) {
      statusHtml = '<div class="schach-status schach-status-niederlage">Du hast aufgegeben.</div>';
    } else if (!spielLaeuft) {
      statusHtml = spielerHatGewonnen
        ? '<div class="schach-status schach-status-sieg">🏆 Alle Karten losgeworden – du hast gewonnen!</div>'
        : '<div class="schach-status schach-status-niederlage">Der Computer war zuerst fertig.</div>';
    }

    const infoText = !spielLaeuft ? '' : farbwahlAktiv ? 'Wähle eine Farbe' : (amZug === 'spieler' ? 'Du bist am Zug' : 'Computer ist am Zug …');

    const ziehstrafeHtml = ziehstrafe > 0
      ? `<div class="maumau-hinweis">🃏 Sieben-Kette: ${ziehstrafe} Karten ziehen oder eine Sieben nachlegen</div>` : '';
    const farbwunschHtml = gewuenschteFarbe
      ? `<div class="maumau-hinweis">Gewünschte Farbe: <span class="${E.FARBROT[gewuenschteFarbe] ? 'karte-rot' : 'karte-schwarz'}">${E.FARBSYMBOL[gewuenschteFarbe]} ${E.FARBNAME[gewuenschteFarbe]}</span></div>` : '';

    const computerHandHtml = computerHand.map(() => '<div class="maumau-kartenrueckseite"></div>').join('');

    const sortierteIndizes = E.sortiereHandIndizes(spielerHand);
    const spielerHandHtml = sortierteIndizes.map((i) => {
      const karte = spielerHand[i];
      const eigenerZug = spielLaeuft && amZug === 'spieler' && !farbwahlAktiv;
      const nurGezogeneSpielbar = gezogeneKarteIndex !== null && i !== gezogeneKarteIndex;
      const passtRegulaer = ziehstrafe > 0 ? karte.wert === '7' : E.istLegbar(karte, oben, gewuenschteFarbe);
      const legbar = eigenerZug && !nurGezogeneSpielbar && passtRegulaer;
      let klassen = legbar ? '' : 'maumau-karte-gesperrt';
      if (i === gezogeneKarteIndex) klassen += ' maumau-karte-gezogen';
      return karteHtml(karte, klassen.trim(), legbar ? `Maumau.spielerKarteGeklickt(${i})` : null);
    }).join('');

    const farbwahlHtml = farbwahlAktiv ? `
      <div class="maumau-farbwahl">
        ${E.FARBEN.map(f => `<span class="maumau-farbwahl-btn ${E.FARBROT[f] ? 'karte-rot' : 'karte-schwarz'}" onclick="Maumau.waehleFarbe('${f}')">${E.FARBSYMBOL[f]}</span>`).join('')}
      </div>
    ` : '';

    const kannZiehen = spielLaeuft && amZug === 'spieler' && !farbwahlAktiv && gezogeneKarteIndex === null;

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Maumau.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="maumau-wrap">
        <div class="welcome">Mau-Mau</div>
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        <div class="maumau-computerhand">${computerHandHtml}</div>
        <div class="maumau-tischmitte">
          <div class="maumau-stapel-gruppe">
            <div class="maumau-kartenrueckseite maumau-nachziehstapel${kannZiehen ? '' : ' maumau-stapel-inaktiv'}"${kannZiehen ? ' onclick="Maumau.spielerZieheKarte()"' : ''}></div>
            <div class="maumau-stapel-label">${nachziehstapel.length} übrig</div>
          </div>
          <div class="maumau-stapel-gruppe">
            ${karteHtml(oben, '')}
            <div class="maumau-stapel-label">Ablage</div>
          </div>
        </div>
        ${ziehstrafeHtml}
        ${farbwunschHtml}
        ${farbwahlHtml}
        <div class="maumau-spielerhand">${spielerHandHtml}</div>
        <div class="schach-aktionsleiste">
          ${gezogeneKarteIndex !== null ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Maumau.spielerPasse()">Passen</span>' : ''}
          ${spielLaeuft
            ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Maumau.aufgeben()">Aufgeben</span>'
            : '<span class="schach-aktion-btn" onclick="Maumau.starteSpiel()">Neue Runde</span>'}
        </div>
      </div>
    `);
    // ERST nach App.render() registrieren, siehe ausfuehrlicher Kommentar in
    // schiffeversenken.js renderKampf() (identischer Bug/Fix, 22.08.2026).
    App.setOnLeaveScreen(raeumeKiTimeoutAuf);
  }

  // Fuer die Fortschrittsanzeige auf der Spiele-Kachel (siehe App.renderSpieleMenu).
  function fortschrittText() {
    const f = Storage.getMauMauFortschritt();
    return f.siege > 0 ? `${f.siege} ${f.siege === 1 ? 'Sieg' : 'Siege'}` : 'Noch nicht gespielt';
  }

  return {
    renderMenu, renderRegeln, starteSpiel,
    spielerKarteGeklickt, spielerZieheKarte, spielerPasse, waehleFarbe, aufgeben,
    fortschrittText
  };
})();
