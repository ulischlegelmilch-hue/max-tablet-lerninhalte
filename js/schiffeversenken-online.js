// Schiffe versenken gegen Papa (Handy-App) ueber das Max-Tablet-Backend
// (WebSocket-Relay, siehe backend/server.js). Nutzt SchiffeEngine fuer Feld-
// Mathematik/Platzierungsregeln (geteilt mit schiffeversenken.js), aber
// eigene Oberflaechen-/Interaktionslogik (Projektkonvention, siehe schach.js/
// schach-online.js).
//
// WICHTIGER UNTERSCHIED zum Online-Schach: der Server speichert NIE
// Schiffspositionen (die blieben sonst fuer den Gegner einsehbar) - nur "wer
// hat wohin geschossen, mit welchem Ergebnis" (stand.beschuss). Die eigene
// Flotte (eigeneSchiffe) lebt AUSSCHLIESSLICH lokal in diesem Modul. Wird man
// beschossen, berechnet DIESES Modul das Ergebnis selbst (aus der eigenen,
// nur hier bekannten Flotte) und schickt es als "feuer_ergebnis" zurueck -
// der Server leitet das nur weiter, ohne es zu pruefen (gleiches
// Vertrauensmodell wie beim Online-Schach).
//
// onLeaveScreen-Kniff: siehe ausfuehrlicher Kommentar in schach-online.js -
// dieselbe Notwendigkeit, weil sich auch dieser Screen wiederholt selbst
// neu rendert.
const SchiffeversenkenOnline = (function () {
  const E = SchiffeEngine;
  const WS_URL = 'wss://max-tablet-backend.onrender.com/ws/schiffe';
  const MEINE_ROLLE = 'max';
  const GEGNER_ROLLE = 'papa';
  const RECONNECT_MS = 3000;

  let ws = null;
  let aktiv = false;
  let ersteAnzeige = true;
  let verbindungsStatus = 'verbindet';
  let stand = null; // letzte 'stand'-Nachricht vom Server
  let reconnectTimer = null;

  // Lokale Flotten-Aufstellung - NIE an den Server geschickt.
  let eigeneSchiffe = [];
  let platzierungsAusrichtung = 'h';
  let platzierungsHinweis = '';
  let bereitGesendet = false;

  // Verhindert Mehrfach-Antworten auf dieselbe Anfrage, solange der Server
  // sie noch nicht als beantwortet quittiert hat (mehrere "stand"-Broadcasts
  // koennen fuer dieselbe offene Anfrage eintreffen, bevor unsere Antwort
  // verarbeitet ist).
  let letzteBeantworteteZiel = null;

  function verbinden() {
    aktiv = true;
    verbindungsStatus = 'verbindet';
    zeichne();
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      verbindungsStatus = 'getrennt';
      zeichne();
      reconnectTimer = setTimeout(verbinden, RECONNECT_MS);
      return;
    }
    ws.onopen = () => ws.send(JSON.stringify({ typ: 'beitreten', rolle: MEINE_ROLLE }));
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      const vorherigerStatus = stand ? stand.status : null;
      stand = msg;
      verbindungsStatus = 'verbunden';
      // Neue Partie auf Server-Seite (z.B. Papa hat "Neues Spiel" gestartet,
      // waehrend wir hier schon/noch eine alte Aufstellung hatten) - eigene
      // Flotte muss neu aufgestellt werden.
      if (vorherigerStatus !== 'platzierung' && msg.status === 'platzierung') {
        eigeneSchiffe = [];
        platzierungsAusrichtung = 'h';
        platzierungsHinweis = '';
        bereitGesendet = false;
        letzteBeantworteteZiel = null;
      }
      beantworteOffeneAnfrageFallsNoetig();
      zeichne();
    };
    ws.onclose = () => {
      ws = null;
      if (!aktiv) return;
      verbindungsStatus = 'getrennt';
      zeichne();
      reconnectTimer = setTimeout(verbinden, RECONNECT_MS);
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* egal */ } };
  }

  function trennen() {
    aktiv = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) {
      ws.onclose = null; ws.onmessage = null; ws.onerror = null;
      try { ws.close(); } catch (e) { /* egal */ }
      ws = null;
    }
  }

  function starteAnsicht() {
    ersteAnzeige = true;
    stand = null;
    verbindungsStatus = 'verbindet';
    eigeneSchiffe = [];
    platzierungsAusrichtung = 'h';
    platzierungsHinweis = '';
    bereitGesendet = false;
    letzteBeantworteteZiel = null;
    verbinden();
  }

  /** Wenn gerade EIN Schuss auf UNSER Meer wartet (offeneAnfrage.angreifer
   *  ist der Gegner, nicht wir selbst): aus der eigenen, nur lokal bekannten
   *  Flotte automatisch Treffer/Wasser/Versenkt bestimmen und zurueckmelden -
   *  passiert ohne Zutun, sobald die App offen/verbunden ist (kein Tippen
   *  noetig, "Verteidigen" ist rein passiv). */
  function beantworteOffeneAnfrageFallsNoetig() {
    if (!stand || !stand.offeneAnfrage) return;
    const anfrage = stand.offeneAnfrage;
    if (anfrage.angreifer === MEINE_ROLLE) return; // wir selbst haben geschossen, warten auf Antwort
    if (anfrage.ziel === letzteBeantworteteZiel) return; // schon beantwortet, Server hat es nur noch nicht quittiert
    if (!eigeneSchiffe.length) return; // eigene Flotte nach Neuladen verloren, siehe renderKampfLaeuft-Hinweis

    const schiff = E.schiffAnFeld(eigeneSchiffe, anfrage.ziel);
    let ergebnis = 'wasser';
    let versenkteZellen = null;
    if (schiff) {
      schiff.treffer[schiff.zellen.indexOf(anfrage.ziel)] = true;
      ergebnis = E.schiffVersenkt(schiff) ? 'versenkt' : 'treffer';
      if (ergebnis === 'versenkt') versenkteZellen = schiff.zellen.slice();
    }
    const flotteBesiegt = E.flotteBesiegt(eigeneSchiffe);
    letzteBeantworteteZiel = anfrage.ziel;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ typ: 'feuer_ergebnis', ziel: anfrage.ziel, ergebnis, versenkteZellen, flotteBesiegt }));
    }
  }

  // -----------------------------------------------------------------------
  // Flotten-Aufstellung (Oberflaeche dupliziert zu schiffeversenken.js -
  // Projektkonvention, siehe Kopfkommentar)
  // -----------------------------------------------------------------------
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

  function platzierungsBrettHtml() {
    let zellenHtml = '';
    for (let i = 0; i < E.GESAMT; i++) {
      const hatSchiff = eigeneSchiffe.some(s => s.zellen.includes(i));
      const klasse = hatSchiff ? 'schiffe-feld-eigenes' : 'schiffe-feld-unbekannt';
      zellenHtml += `<div class="schiffe-feld ${klasse}" onclick="SchiffeversenkenOnline.platzierungsFeldGeklickt(${i})"></div>`;
    }
    return brettRahmenHtml(zellenHtml, 'gross');
  }

  function renderPlatzierung() {
    const naechstes = E.PLATZIERUNGS_REIHENFOLGE[eigeneSchiffe.length];
    const fertig = !naechstes;
    const gegnerBereit = stand.bereitschaft[GEGNER_ROLLE];
    let html = `
      <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schiffe-wrap">
        <div class="welcome">Flotte aufstellen (gegen Papa)</div>
    `;
    if (bereitGesendet) {
      html += `
        <div class="schach-info">Bereit! ${gegnerBereit ? 'Papa ist auch bereit – es geht gleich los …' : 'Warte auf Papa …'}</div>
        <div class="schiffe-eigene-ueberschrift">Deine Flotte</div>
        ${platzierungsBrettHtml()}
      `;
    } else {
      html += `
        <div class="schach-info">${fertig ? 'Alle Schiffe platziert!' : `Platziere: ${naechstes.name} (${naechstes.laenge} Felder) – Startfeld antippen`}</div>
        ${platzierungsHinweis ? `<div class="schach-status schach-status-niederlage">${platzierungsHinweis}</div>` : ''}
        ${platzierungsBrettHtml()}
        <div class="schiffe-fleet-liste">${fleetUebersichtHtml()}</div>
        <div class="schach-aktionsleiste">
          ${!fertig ? `<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="SchiffeversenkenOnline.dreheAusrichtung()">${Icons.svg('drehen')} Drehen: ${platzierungsAusrichtung === 'h' ? 'waagerecht' : 'senkrecht'}</span>` : ''}
          <span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="SchiffeversenkenOnline.automatischPlatzieren()">${Icons.svg('schiffe')} Automatisch platzieren</span>
          <span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="SchiffeversenkenOnline.platzierungZuruecksetzen()">Zurücksetzen</span>
        </div>
        ${fertig ? `<div class="schach-aktionsleiste"><span class="schach-aktion-btn" onclick="SchiffeversenkenOnline.bereitMelden()">⚓ Bereit</span></div>` : ''}
      `;
    }
    html += '</div>';
    App.render(html);
  }

  function platzierungsFeldGeklickt(startIdx) {
    if (bereitGesendet) return;
    const def = E.PLATZIERUNGS_REIHENFOLGE[eigeneSchiffe.length];
    if (!def) return;
    const zellen = E.berechneZellen(startIdx, def.laenge, platzierungsAusrichtung);
    if (!zellen) {
      platzierungsHinweis = 'Das Schiff würde über den Rand hinausragen.';
      zeichne();
      return;
    }
    if (!E.kannPlatzieren(eigeneSchiffe, zellen)) {
      platzierungsHinweis = 'Hier ist kein Platz – Schiffe dürfen sich nicht berühren.';
      zeichne();
      return;
    }
    eigeneSchiffe.push(E.neuesSchiff(def, zellen));
    platzierungsHinweis = '';
    zeichne();
  }

  function dreheAusrichtung() {
    platzierungsAusrichtung = platzierungsAusrichtung === 'h' ? 'v' : 'h';
    zeichne();
  }

  function automatischPlatzieren() {
    if (bereitGesendet) return;
    const restlicheDefs = E.PLATZIERUNGS_REIHENFOLGE.slice(eigeneSchiffe.length);
    if (!restlicheDefs.length) return;
    const ergebnis = E.versucheZufaelligPlatzieren(eigeneSchiffe, restlicheDefs);
    if (ergebnis) { eigeneSchiffe = ergebnis; platzierungsHinweis = ''; }
    zeichne();
  }

  function platzierungZuruecksetzen() {
    if (bereitGesendet) return;
    eigeneSchiffe = [];
    platzierungsHinweis = '';
    zeichne();
  }

  function bereitMelden() {
    if (bereitGesendet || eigeneSchiffe.length !== E.SCHIFFE_GESAMT) return;
    bereitGesendet = true;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ typ: 'bereit' }));
    zeichne();
  }

  // -----------------------------------------------------------------------
  // Kampf-Phase
  // -----------------------------------------------------------------------
  function feldKlasseEigenes(i) {
    const ergebnis = stand.beschuss[GEGNER_ROLLE][i];
    if (ergebnis === 'versenkt') return 'schiffe-feld-versenkt';
    if (ergebnis === 'treffer') return 'schiffe-feld-treffer';
    if (ergebnis === 'wasser') return 'schiffe-feld-wasser';
    return eigeneSchiffe.some(s => s.zellen.includes(i)) ? 'schiffe-feld-eigenes' : 'schiffe-feld-unbekannt';
  }

  function feldKlasseGegner(i) {
    const ergebnis = stand.beschuss[MEINE_ROLLE][i];
    if (ergebnis === 'versenkt') return 'schiffe-feld-versenkt';
    if (ergebnis === 'treffer') return 'schiffe-feld-treffer';
    if (ergebnis === 'wasser') return 'schiffe-feld-wasser';
    return 'schiffe-feld-unbekannt';
  }

  function schuesseUebrig(beschuss) {
    // Ungefaehre "noch nicht versenkte Schiffe"-Schaetzung aus der reinen
    // Treffer-/Versenkt-Zaehlung ist ohne Kenntnis der gegnerischen Flotte
    // nicht exakt moeglich - stattdessen zeigen wir die simplere, aber immer
    // korrekte Kennzahl "versenkte Schiffsteile" nicht an und beschraenken
    // uns auf den Spielausgang (siehe renderKampf statusHtml).
    return Object.values(beschuss).filter(e => e === 'versenkt').length;
  }

  function renderKampf() {
    const eigenBeschossen = stand.beschuss[GEGNER_ROLLE] || {};
    const gegnerBeschossen = stand.beschuss[MEINE_ROLLE] || {};
    let zellenEigen = '';
    for (let i = 0; i < E.GESAMT; i++) zellenEigen += `<div class="schiffe-feld ${feldKlasseEigenes(i)}"></div>`;
    const klickbar = stand.status === 'laeuft' && stand.amZug === MEINE_ROLLE && !stand.offeneAnfrage;
    let zellenGegner = '';
    for (let i = 0; i < E.GESAMT; i++) {
      const klick = klickbar && gegnerBeschossen[i] === undefined ? ` onclick="SchiffeversenkenOnline.feuern(${i})"` : '';
      zellenGegner += `<div class="schiffe-feld ${feldKlasseGegner(i)}"${klick}></div>`;
    }

    let statusHtml = '';
    if (stand.status === 'beendet') {
      const gewonnen = stand.gewinner === MEINE_ROLLE;
      if (stand.aufgegebenVon) {
        statusHtml = stand.aufgegebenVon === MEINE_ROLLE
          ? '<div class="schach-status schach-status-niederlage">Du hast aufgegeben.</div>'
          : '<div class="schach-status schach-status-sieg">Papa hat aufgegeben – du gewinnst!</div>';
      } else {
        statusHtml = gewonnen
          ? '<div class="schach-status schach-status-sieg">🏆 Alle gegnerischen Schiffe versenkt! Du hast gewonnen!</div>'
          : '<div class="schach-status schach-status-niederlage">Papa hat deine ganze Flotte versenkt.</div>';
      }
    }

    let infoText = '';
    if (stand.status === 'laeuft') {
      if (stand.offeneAnfrage) {
        infoText = stand.offeneAnfrage.angreifer === MEINE_ROLLE ? 'Papa prüft deinen Schuss …' : 'Dein Meer wird geprüft …';
      } else {
        infoText = stand.amZug === MEINE_ROLLE ? 'Du bist am Zug – tippe auf Papas Meer' : 'Papa ist am Zug …';
      }
      if (!stand.verbunden[GEGNER_ROLLE]) infoText += ' (Papa ist gerade offline, bekommt aber eine Benachrichtigung)';
    }

    const flottenlosHinweis = !eigeneSchiffe.length
      ? '<div class="schach-status schach-status-niederlage">Deine Flottendaten sind nach einem Neuladen verloren gegangen - du kannst diese Partie leider nur noch aufgeben.</div>'
      : '';

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schiffe-wrap">
        <div class="welcome">Schiffe versenken – gegen Papa</div>
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        ${flottenlosHinweis}
        <div class="schiffe-flotten-status">
          <span>📱 Papa: ${schuesseUebrig(eigenBeschossen)} von ${E.SCHIFFE_GESAMT} versenkt</span>
          <span>🙂 Du: ${schuesseUebrig(gegnerBeschossen)} von ${E.SCHIFFE_GESAMT} versenkt</span>
        </div>
        ${brettRahmenHtml(zellenGegner, 'gross')}
        <div class="schiffe-eigene-ueberschrift">Deine Flotte</div>
        ${brettRahmenHtml(zellenEigen, 'klein')}
        <div class="schach-aktionsleiste">
          ${stand.status === 'laeuft'
            ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="SchiffeversenkenOnline.aufgeben()">Aufgeben</span>'
            : '<span class="schach-aktion-btn" onclick="SchiffeversenkenOnline.starteSpiel()">Neues Spiel</span>'}
        </div>
      </div>
    `);
  }

  function zeichne() {
    let html;
    if (verbindungsStatus !== 'verbunden' || !stand) {
      html = `
        <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="schiffe-wrap">
          <div class="schach-info">${verbindungsStatus === 'verbindet' ? 'Verbinde mit Papa …' : 'Verbindung verloren – verbinde neu …'}</div>
        </div>
      `;
      if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
      App.render(html);
      App.setOnLeaveScreen(trennen);
      ersteAnzeige = false;
      return;
    }

    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
    if (stand.status === 'kein_spiel') {
      App.render(`
        <div class="back-row"><span class="back-btn" onclick="Schiffeversenken.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="welcome">Online gegen Papa</div>
        <div class="lese-text">${stand.verbunden[GEGNER_ROLLE] ? 'Papa ist gerade online! ' : 'Papa ist gerade nicht online, aber du kannst trotzdem starten - er bekommt eine Benachrichtigung. '}Wer startet, schießt nach der Flottenaufstellung zuerst.</div>
        <div class="btn-primary" onclick="SchiffeversenkenOnline.starteSpiel()">Neues Spiel starten</div>
      `);
    } else if (stand.status === 'platzierung') {
      renderPlatzierung();
    } else {
      renderKampf();
    }
    App.setOnLeaveScreen(trennen);
    ersteAnzeige = false;
  }

  function starteSpiel() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'neues_spiel' }));
  }

  function aufgeben() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'aufgeben' }));
  }

  function feuern(ziel) {
    if (!stand || stand.status !== 'laeuft' || stand.amZug !== MEINE_ROLLE || stand.offeneAnfrage) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (stand.beschuss[MEINE_ROLLE][ziel] !== undefined) return;
    ws.send(JSON.stringify({ typ: 'feuer', ziel }));
  }

  return {
    starteAnsicht, starteSpiel, aufgeben, feuern,
    platzierungsFeldGeklickt, dreheAusrichtung, automatischPlatzieren, platzierungZuruecksetzen, bereitMelden
  };
})();
