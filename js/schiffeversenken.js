// Schiffe versenken gegen den Computer. Regeln/Feld-Mathematik/Zufalls-Flotte
// leben in schiffe-engine.js (SchiffeEngine, geteilt mit schiffeversenken-
// online.js) - dieses Modul ist nur die Oberflaeche + die Computer-KI.
// Abwechselnd wird EIN Feld beschossen (kein Bonuszug bei Treffer - das ist
// eine Hasbro-Brettspiel-Variante, nicht Teil der klassischen Regeln).
//
// Bindet sich wie schach.js direkt an App.render() an - kein Speichern/
// Fortsetzen zwischen Sitzungen, "Neues Spiel" baut jedes Mal frisch auf.
const Schiffeversenken = (function () {
  const E = SchiffeEngine;

  // -----------------------------------------------------------------------
  // Flotten-Aufstellung
  // -----------------------------------------------------------------------
  let eigeneSchiffe = [];
  let platzierungsAusrichtung = 'h';
  let platzierungsHinweis = '';

  function renderMenu() {
    App.render(App.subMenuHtml('Schiffe versenken', [
      { icon: 'schiffe', titel: 'Neues Spiel', onclick: 'Schiffeversenken.starteFlottenaufstellung()' },
      { icon: 'online', titel: 'Online gegen Papa', onclick: 'SchiffeversenkenOnline.starteAnsicht()' },
      { icon: 'einstellungen', titel: 'Spielregeln', onclick: 'Schiffeversenken.renderRegeln()' }
    ]));
  }

  function renderRegeln() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schiffe-wrap">
        <div class="welcome">Spielregeln</div>
        <div class="frage-card schiffe-regeln-card">
          <p>Du und der Computer haben je ein 10×10-Meer mit einer Flotte aus <strong>10 Schiffen</strong>:</p>
          <ul>
            <li>1× Schlachtschiff (5 Felder)</li>
            <li>2× Kreuzer (4 Felder)</li>
            <li>3× Zerstörer (3 Felder)</li>
            <li>4× U-Boot (2 Felder)</li>
          </ul>
          <p>Schiffe dürfen sich nicht berühren – auch nicht über Eck.</p>
          <p>Abwechselnd wird ein Feld auf dem gegnerischen Meer beschossen. Wer zuerst alle gegnerischen Schiffe versenkt hat, gewinnt!</p>
        </div>
      </div>
    `);
  }

  function starteFlottenaufstellung() {
    eigeneSchiffe = [];
    platzierungsAusrichtung = 'h';
    platzierungsHinweis = '';
    renderPlatzierung();
  }

  function fleetUebersichtHtml() {
    return E.SCHIFF_TYPEN.map(def => {
      const platziert = eigeneSchiffe.filter(s => s.typ === def.typ).length;
      const fertig = platziert === def.anzahl;
      return `
        <div class="schiffe-fleet-zeile${fertig ? ' schiffe-fleet-zeile-fertig' : ''}">
          <span>${def.name} (${def.laenge})</span><span>${platziert} / ${def.anzahl}</span>
        </div>
      `;
    }).join('');
  }

  function platzierungsBrettHtml() {
    let zellenHtml = '';
    for (let i = 0; i < E.GESAMT; i++) {
      const hatSchiff = eigeneSchiffe.some(s => s.zellen.includes(i));
      const klasse = hatSchiff ? 'schiffe-feld-eigenes' : 'schiffe-feld-unbekannt';
      zellenHtml += `<div class="schiffe-feld ${klasse}" onclick="Schiffeversenken.platzierungsFeldGeklickt(${i})"></div>`;
    }
    return brettRahmenHtml(zellenHtml, 'gross');
  }

  function renderPlatzierung() {
    const naechstes = E.PLATZIERUNGS_REIHENFOLGE[eigeneSchiffe.length];
    const fertig = !naechstes;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schiffe-wrap">
        <div class="welcome">Flotte aufstellen</div>
        <div class="schach-info">${fertig ? 'Alle Schiffe platziert!' : `Platziere: ${naechstes.name} (${naechstes.laenge} Felder) – Startfeld antippen`}</div>
        ${platzierungsHinweis ? `<div class="schach-status schach-status-niederlage">${platzierungsHinweis}</div>` : ''}
        ${platzierungsBrettHtml()}
        <div class="schiffe-fleet-liste">${fleetUebersichtHtml()}</div>
        <div class="schach-aktionsleiste">
          ${!fertig ? `<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Schiffeversenken.dreheAusrichtung()">${Icons.svg('drehen')} Drehen: ${platzierungsAusrichtung === 'h' ? 'waagerecht' : 'senkrecht'}</span>` : ''}
          <span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Schiffeversenken.automatischPlatzieren()">${Icons.svg('schiffe')} Automatisch platzieren</span>
          <span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Schiffeversenken.platzierungZuruecksetzen()">Zurücksetzen</span>
        </div>
        ${fertig ? `<div class="schach-aktionsleiste"><span class="schach-aktion-btn" onclick="Schiffeversenken.kampfBeginnen()">⚓ Kampf beginnen</span></div>` : ''}
      </div>
    `);
  }

  function platzierungsFeldGeklickt(startIdx) {
    const def = E.PLATZIERUNGS_REIHENFOLGE[eigeneSchiffe.length];
    if (!def) return;
    const zellen = E.berechneZellen(startIdx, def.laenge, platzierungsAusrichtung);
    if (!zellen) {
      platzierungsHinweis = 'Das Schiff würde über den Rand hinausragen.';
      renderPlatzierung();
      return;
    }
    if (!E.kannPlatzieren(eigeneSchiffe, zellen)) {
      platzierungsHinweis = 'Hier ist kein Platz – Schiffe dürfen sich nicht berühren.';
      renderPlatzierung();
      return;
    }
    eigeneSchiffe.push(E.neuesSchiff(def, zellen));
    platzierungsHinweis = '';
    renderPlatzierung();
  }

  function dreheAusrichtung() {
    platzierungsAusrichtung = platzierungsAusrichtung === 'h' ? 'v' : 'h';
    renderPlatzierung();
  }

  function automatischPlatzieren() {
    const restlicheDefs = E.PLATZIERUNGS_REIHENFOLGE.slice(eigeneSchiffe.length);
    if (!restlicheDefs.length) return;
    const ergebnis = E.versucheZufaelligPlatzieren(eigeneSchiffe, restlicheDefs);
    if (ergebnis) {
      eigeneSchiffe = ergebnis;
      platzierungsHinweis = '';
    }
    renderPlatzierung();
  }

  function platzierungZuruecksetzen() {
    eigeneSchiffe = [];
    platzierungsHinweis = '';
    renderPlatzierung();
  }

  // -----------------------------------------------------------------------
  // Kampf-Phase
  // -----------------------------------------------------------------------
  let computerSchiffe = [];
  let beschussAufComputer = {}; // idx -> 'wasser' | 'treffer' | 'versenkt'
  let beschussAufSpieler = {};
  let amZug = 'spieler';
  let spielLaeuft = false;
  let aufgegeben = false;

  // KI: klassischer Hunt/Target-Algorithmus. Hunt-Modus (kiZielListe leer)
  // schiesst rein zufaellig auf noch unbeschossene Felder - BEWUSST ohne
  // Schachbrettmuster-Optimierung, sonst waere die KI fuer ein Kind kaum zu
  // schlagen (gleiche Kalibrier-Philosophie wie Schach.STUFEN: lieber
  // realistisch schlagbar als theoretisch optimal). Sobald ein Treffer landet,
  // wechselt sie in den Target-Modus und verfolgt die Schiffslinie sauber zu
  // Ende - das WIRKT dadurch trotzdem "klug genug".
  let kiGetestet = new Set();
  let kiZielListe = [];
  let kiAktiverTrefferAnker = [];
  let kiTimeoutHandle = null;

  function raeumeKiTimeoutAuf() {
    if (kiTimeoutHandle) { clearTimeout(kiTimeoutHandle); kiTimeoutHandle = null; }
  }

  function kiAktualisiereZielListe() {
    const anker = kiAktiverTrefferAnker;
    let kandidaten;
    if (anker.length === 1) {
      const z = E.zeileVon(anker[0]), s = E.spalteVon(anker[0]);
      kandidaten = [[z - 1, s], [z + 1, s], [z, s - 1], [z, s + 1]];
    } else {
      const zeilen = anker.map(E.zeileVon), spalten = anker.map(E.spalteVon);
      const horizontal = new Set(zeilen).size === 1;
      if (horizontal) {
        const zeile = zeilen[0];
        kandidaten = [[zeile, Math.min(...spalten) - 1], [zeile, Math.max(...spalten) + 1]];
      } else {
        const spalte = spalten[0];
        kandidaten = [[Math.min(...zeilen) - 1, spalte], [Math.max(...zeilen) + 1, spalte]];
      }
    }
    kiZielListe = kandidaten
      .filter(([z, s]) => E.inBrett(z, s))
      .map(([z, s]) => E.idx(z, s))
      .filter(i => !kiGetestet.has(i));
  }

  function kiWaehleZiel() {
    while (kiZielListe.length) {
      const kandidat = kiZielListe.shift();
      if (!kiGetestet.has(kandidat)) return kandidat;
    }
    const frei = [];
    for (let i = 0; i < E.GESAMT; i++) if (!kiGetestet.has(i)) frei.push(i);
    return frei[Math.floor(Math.random() * frei.length)];
  }

  function kampfBeginnen() {
    computerSchiffe = E.zufaelligeFlotte();
    beschussAufComputer = {};
    beschussAufSpieler = {};
    kiGetestet = new Set();
    kiZielListe = [];
    kiAktiverTrefferAnker = [];
    amZug = 'spieler';
    spielLaeuft = true;
    aufgegeben = false;
    renderKampf();
  }

  function feldKlasse(sicht, i) {
    if (sicht === 'eigenes') {
      const beschossen = beschussAufSpieler[i];
      if (beschossen === 'versenkt') return 'schiffe-feld-versenkt';
      if (beschossen === 'treffer') return 'schiffe-feld-treffer';
      if (beschossen === 'wasser') return 'schiffe-feld-wasser';
      return eigeneSchiffe.some(s => s.zellen.includes(i)) ? 'schiffe-feld-eigenes' : 'schiffe-feld-unbekannt';
    }
    const beschossen = beschussAufComputer[i];
    if (beschossen === 'versenkt') return 'schiffe-feld-versenkt';
    if (beschossen === 'treffer') return 'schiffe-feld-treffer';
    if (beschossen === 'wasser') return 'schiffe-feld-wasser';
    return 'schiffe-feld-unbekannt';
  }

  function brettRahmenHtml(zellenHtml, groesse) {
    let rang = '', datei = '';
    for (let i = 0; i < E.BREITE; i++) {
      rang += `<div>${i + 1}</div>`;
      datei += `<div>${String.fromCharCode(65 + i)}</div>`;
    }
    return `
      <div class="schiffe-rahmen${groesse === 'klein' ? ' schiffe-rahmen-klein' : ''}">
        <div class="schiffe-brett-zeile">
          <div class="schiffe-rang-leiste">${rang}</div>
          <div class="schiffe-brett">${zellenHtml}</div>
        </div>
        <div class="schiffe-datei-zeile">
          <div class="schiffe-rang-spacer"></div>
          <div class="schiffe-datei-leiste">${datei}</div>
        </div>
      </div>
    `;
  }

  function brettHtml(sicht, klickbar, groesse) {
    let zellenHtml = '';
    for (let i = 0; i < E.GESAMT; i++) {
      const klick = klickbar ? ` onclick="Schiffeversenken.gegnerFeldGeklickt(${i})"` : '';
      zellenHtml += `<div class="schiffe-feld ${feldKlasse(sicht, i)}"${klick}></div>`;
    }
    return brettRahmenHtml(zellenHtml, groesse);
  }

  function schiffeUebrig(schiffe) {
    return schiffe.filter(s => !E.schiffVersenkt(s)).length;
  }

  function renderKampf() {
    App.setOnLeaveScreen(raeumeKiTimeoutAuf);

    let statusHtml = '';
    if (aufgegeben) {
      statusHtml = '<div class="schach-status schach-status-niederlage">Du hast aufgegeben.</div>';
    } else if (!spielLaeuft) {
      const spielerGewonnen = schiffeUebrig(computerSchiffe) === 0;
      statusHtml = spielerGewonnen
        ? '<div class="schach-status schach-status-sieg">🏆 Alle gegnerischen Schiffe versenkt! Du hast gewonnen!</div>'
        : '<div class="schach-status schach-status-niederlage">Der Computer hat deine ganze Flotte versenkt.</div>';
    }
    const infoText = spielLaeuft ? (amZug === 'spieler' ? 'Du bist am Zug – tippe auf das Gegner-Meer' : 'Computer denkt nach …') : '';

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schiffe-wrap">
        <div class="welcome">Schiffe versenken</div>
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        <div class="schiffe-flotten-status">
          <span>🖥️ Computer: ${schiffeUebrig(computerSchiffe)} von ${E.SCHIFFE_GESAMT} Schiffen übrig</span>
          <span>🙂 Du: ${schiffeUebrig(eigeneSchiffe)} von ${E.SCHIFFE_GESAMT} Schiffen übrig</span>
        </div>
        ${brettHtml('gegner', spielLaeuft && amZug === 'spieler', 'gross')}
        <div class="schiffe-eigene-ueberschrift">Deine Flotte</div>
        ${brettHtml('eigenes', false, 'klein')}
        <div class="schach-aktionsleiste">
          ${spielLaeuft
            ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="Schiffeversenken.aufgeben()">Aufgeben</span>'
            : '<span class="schach-aktion-btn" onclick="Schiffeversenken.starteFlottenaufstellung()">Neues Spiel</span>'}
        </div>
      </div>
    `);
  }

  function pruefeSpielende() {
    if (schiffeUebrig(computerSchiffe) === 0) {
      spielLaeuft = false;
      Storage.meldeSchiffeSieg();
      Storage.addSterne(25);
      App.updateTopbar();
      return true;
    }
    if (schiffeUebrig(eigeneSchiffe) === 0) {
      spielLaeuft = false;
      return true;
    }
    return false;
  }

  function gegnerFeldGeklickt(ziel) {
    if (!spielLaeuft || amZug !== 'spieler' || beschussAufComputer[ziel]) return;
    const schiff = E.schiffAnFeld(computerSchiffe, ziel);
    if (schiff) {
      schiff.treffer[schiff.zellen.indexOf(ziel)] = true;
      if (E.schiffVersenkt(schiff)) schiff.zellen.forEach(z => { beschussAufComputer[z] = 'versenkt'; });
      else beschussAufComputer[ziel] = 'treffer';
    } else {
      beschussAufComputer[ziel] = 'wasser';
    }
    if (pruefeSpielende()) { renderKampf(); return; }
    amZug = 'computer';
    renderKampf();
    kiTimeoutHandle = setTimeout(computerZugAusfuehren, 900);
  }

  function computerZugAusfuehren() {
    kiTimeoutHandle = null;
    if (!spielLaeuft) return;
    const ziel = kiWaehleZiel();
    kiGetestet.add(ziel);
    const schiff = E.schiffAnFeld(eigeneSchiffe, ziel);
    if (schiff) {
      schiff.treffer[schiff.zellen.indexOf(ziel)] = true;
      if (E.schiffVersenkt(schiff)) {
        schiff.zellen.forEach(z => { beschussAufSpieler[z] = 'versenkt'; });
        kiAktiverTrefferAnker = [];
        kiZielListe = [];
      } else {
        beschussAufSpieler[ziel] = 'treffer';
        kiAktiverTrefferAnker.push(ziel);
        kiAktualisiereZielListe();
      }
    } else {
      beschussAufSpieler[ziel] = 'wasser';
    }
    if (pruefeSpielende()) { renderKampf(); return; }
    amZug = 'spieler';
    renderKampf();
  }

  function aufgeben() {
    if (!spielLaeuft) return;
    raeumeKiTimeoutAuf();
    spielLaeuft = false;
    aufgegeben = true;
    renderKampf();
  }

  // Fuer die Fortschrittsanzeige auf der Home-Kachel (siehe App.gotoHome).
  function fortschrittText() {
    const f = Storage.getSchiffeFortschritt();
    return f.siege > 0 ? `${f.siege} ${f.siege === 1 ? 'Sieg' : 'Siege'}` : 'Noch nicht gespielt';
  }

  return {
    renderMenu, renderRegeln, starteFlottenaufstellung,
    platzierungsFeldGeklickt, dreheAusrichtung, automatischPlatzieren, platzierungZuruecksetzen,
    kampfBeginnen, gegnerFeldGeklickt, aufgeben, fortschrittText
  };
})();
