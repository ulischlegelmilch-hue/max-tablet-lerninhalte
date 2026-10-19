// Eroeffnungs-Repertoire fuer Max (19.10.2026, Uli: "er muss nicht Schach vom Urschleim lernen,
// vielleicht sollte er gute Eroeffnungen lernen"). Sechs kurze, geprueft legale Zugfolgen (jede
// Zeile per Skript gegen SchachEngine verifiziert): drei mit Weiss, drei mit Schwarz. Jede wird
// in zwei Phasen gelernt: 1) LERNEN - der richtige Zug ist markiert, jeder Zug wird erklaert;
// 2) AUS DEM KOPF - ohne Markierung, Hinweis nur bei Bedarf. Wer die zweite Phase mit hoechstens
// zwei Fehlern schafft, hat die Station bestanden (siehe schach-weg.js).
const SchachEroeffnung = (function () {
  const FIGUR_SYMBOL = SchachFiguren;
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // wer: 'ich' = Max' Seite, 'papa' = der Gegner (spielt automatisch)
  const REPERTOIRE = [
    {
      id: 'italienisch', farbe: 'w', titel: 'Italienische Eröffnung', untertitel: 'Mit Weiß: der Klassiker',
      idee: ['Mitte besetzen (e4)', 'Läufer auf c4 zielt auf Papas schwachen Punkt f7', 'Dann rochieren – der König ist sicher'],
      zuege: [
        ['e2e4', 'ich', 'Besetze die Mitte! Der Bauer auf e4 kontrolliert wichtige Felder und öffnet Läufer und Dame.'],
        ['e7e5', 'papa', 'Papa antwortet meistens genauso: Bauer nach e5.'],
        ['g1f3', 'ich', 'Der Springer greift den Bauern e5 an und wird gleichzeitig entwickelt – zwei Dinge in einem Zug.'],
        ['b8c6', 'papa', 'Papa verteidigt seinen Bauern mit dem Springer.'],
        ['f1c4', 'ich', 'Der Läufer zielt auf f7. Dort wird Papas König nur vom König selbst geschützt – ein Schwachpunkt!'],
        ['f8c5', 'papa', 'Papa stellt seinen Läufer genauso auf.'],
        ['c2c3', 'ich', 'Bereite d4 vor: Mit c3 und später d4 bekommst du ein starkes Bauernzentrum.'],
        ['g8f6', 'papa', 'Papa entwickelt seinen Springer und greift e4 an.'],
        ['d2d3', 'ich', 'Solide: d3 schützt den Bauern e4 und öffnet den Weg für deinen Läufer c1.'],
        ['d7d6', 'papa', 'Papa stützt seine Mitte.'],
        ['e1g1', 'ich', 'Rochiere! Der König geht hinter die Bauern in Sicherheit und der Turm kommt ins Spiel.'],
        ['e8g8', 'papa', 'Papa rochiert auch.'],
        ['f1e1', 'ich', 'Der Turm stellt sich hinter den Bauern e4 und schaut in die Mitte. Fertig entwickelt – so startet man gut!']
      ]
    },
    {
      id: 'blitz', farbe: 'w', titel: 'Der Blitz-Angriff', untertitel: 'Mit Weiß: Matt in 4 Zügen',
      idee: ['Läufer c4 und Dame h5 zielen beide auf f7', 'Wenn Papa nicht aufpasst: Schachmatt in 4 Zügen!', 'Wehrt er sich, ziehst du einfach ruhig weiter'],
      zuege: [
        ['e2e4', 'ich', 'Erster Zug: Der Bauer macht Platz für Läufer und Dame.'],
        ['e7e5', 'papa', 'Papa antwortet mit e5 – ganz normal.'],
        ['f1c4', 'ich', 'Der Läufer zielt auf f7 – Papas schwächstes Feld. Dort steht nur der König als Beschützer.'],
        ['b8c6', 'papa', 'Papa entwickelt seinen Springer und merkt noch nichts.'],
        ['d1h5', 'ich', 'Jetzt zielt auch die Dame auf f7! Zwei Angreifer gegen einen Verteidiger – das wird knapp für Papa.'],
        ['g8f6', 'papa', 'Papa greift deine Dame an – er hat die Gefahr nicht gesehen!'],
        ['h5f7', 'ich', 'Die Dame schlägt f7: Schachmatt! Der König kann nirgends hin und niemand kann die Dame schlagen.']
      ]
    },
    {
      id: 'rochade', farbe: 'w', titel: 'Der Rochade-Schutzschild', untertitel: 'Mit Weiß: den König in Sicherheit bringen',
      idee: ['Erst Springer und Läufer entwickeln', 'Dann rochieren: König hinter die Bauern', 'Ein sicherer König kann nicht überrascht werden'],
      zuege: [
        ['e2e4', 'ich', 'Mitte besetzen – wie immer.'],
        ['e7e5', 'papa', 'Papa spiegelt dich.'],
        ['g1f3', 'ich', 'Springer raus! Er greift e5 an und macht den Platz für die Rochade frei.'],
        ['b8c6', 'papa', 'Papa verteidigt seinen Bauern.'],
        ['f1c4', 'ich', 'Läufer raus! Jetzt ist auch f1 frei – der König kann rochieren.'],
        ['g8f6', 'papa', 'Papa entwickelt seinen Springer.'],
        ['e1g1', 'ich', 'Rochade! Der König springt hinter die Bauern in Sicherheit, und der Turm kommt in die Mitte. Jetzt kann Papa dich nicht mehr so leicht überraschen.']
      ]
    },
    {
      id: 'legal', farbe: 'w', titel: 'Die Légal-Falle', untertitel: 'Mit Weiß: Dame opfern, Matt setzen',
      idee: ['Papa fesselt deinen Springer – das ist sein Fehler', 'Du opferst die Dame mit Absicht', 'Zwei Züge später: Schachmatt!'],
      zuege: [
        ['e2e4', 'ich', 'Wie immer: die Mitte besetzen.'],
        ['e7e5', 'papa', 'Papa antwortet mit e5.'],
        ['g1f3', 'ich', 'Springer raus – und der Bauer e5 wird angegriffen.'],
        ['d7d6', 'papa', 'Papa verteidigt e5 mit d6. Etwas passiv, aber nicht schlecht.'],
        ['f1c4', 'ich', 'Der Läufer zielt wieder auf den Schwachpunkt f7.'],
        ['c8g4', 'papa', 'Papa fesselt deinen Springer f3 – er glaubt, damit etwas Gutes zu tun…'],
        ['b1c3', 'ich', 'Entwickle den zweiten Springer. Die Falle ist gestellt!'],
        ['g7g6', 'papa', 'Papa merkt nichts und spielt g6. Das ist der Fehler!'],
        ['f3e5', 'ich', 'Das Opfer! Du lässt Papas Läufer deine Dame schlagen – mit voller Absicht.'],
        ['g4d1', 'papa', 'Papa nimmt die Dame und freut sich…'],
        ['c4f7', 'ich', 'Schach! Dein Läufer schlägt auf f7. Jetzt muss der König ziehen.'],
        ['e8e7', 'papa', 'Der König kann nur nach e7.'],
        ['c3d5', 'ich', 'Schachmatt! Der Springer auf d5 gibt Matt – obwohl du die Dame geopfert hast. Merke dir diese Falle!']
      ]
    },
    {
      id: 'london', farbe: 'w', titel: 'Das London-System', untertitel: 'Mit Weiß: einfach und sicher',
      idee: ['Mit d4 starten, Läufer VOR e3 nach f4', 'Immer dieselbe Aufstellung – leicht zu merken', 'Springer, Läufer, rochieren: fertig!'],
      zuege: [
        ['d2d4', 'ich', 'Wieder die Mitte – diesmal mit dem Damenbauern.'],
        ['d7d5', 'papa', 'Papa antwortet mit d5.'],
        ['c1f4', 'ich', 'Der Trick des London-Systems: Der Läufer geht VOR dem Bauern e3 heraus, damit er nicht eingesperrt wird.'],
        ['g8f6', 'papa', 'Papa entwickelt seinen Springer.'],
        ['e2e3', 'ich', 'Jetzt e3: Der Bauer schützt den Läufer und öffnet den Weg für deinen anderen Läufer.'],
        ['e7e6', 'papa', 'Papa öffnet seinen Läufer.'],
        ['g1f3', 'ich', 'Springer entwickeln – Richtung Mitte.'],
        ['f8d6', 'papa', 'Papa will deinen guten Läufer tauschen.'],
        ['f4g3', 'ich', 'Weiche aus! Du behältst deinen Läufer und er schaut weiter in die Mitte.'],
        ['e8g8', 'papa', 'Papa rochiert.'],
        ['b1d2', 'ich', 'Der Springer geht nach d2 – dort stört er nichts und deckt e4 und c4.'],
        ['c7c5', 'papa', 'Papa greift deine Mitte an.'],
        ['c2c3', 'ich', 'Stütze d4 – deine Bauernkette steht fest.'],
        ['b8c6', 'papa', 'Papa entwickelt den nächsten Springer.'],
        ['f1d3', 'ich', 'Der Läufer geht nach d3 und zielt auf Papas König.'],
        ['c8d7', 'papa', 'Papa entwickelt seinen letzten Läufer.'],
        ['e1g1', 'ich', 'Rochade – fertig! Alle Figuren sind im Spiel und dein König ist sicher.']
      ]
    },
    {
      id: 'spiegel', farbe: 'b', titel: 'Antwort auf e4: spiegeln', untertitel: 'Mit Schwarz: sicher gleichziehen',
      idee: ['Auf e4 antwortest du mit e5', 'Springer und Läufer entwickeln', 'Dann rochieren – wie Weiß'],
      zuege: [
        ['e2e4', 'papa', 'Papa beginnt mit e4 – das tut er meistens.'],
        ['e7e5', 'ich', 'Spiegle ihn: Besetze auch die Mitte.'],
        ['g1f3', 'papa', 'Papa greift deinen Bauern e5 an.'],
        ['b8c6', 'ich', 'Verteidige e5 und entwickle den Springer – in einem Zug.'],
        ['f1c4', 'papa', 'Papa zielt mit dem Läufer auf f7.'],
        ['f8c5', 'ich', 'Dein Läufer zielt auf f2 – ihr seid gleich stark.'],
        ['c2c3', 'papa', 'Papa bereitet d4 vor.'],
        ['g8f6', 'ich', 'Greife den Bauern e4 an! Jetzt muss Papa aufpassen.'],
        ['d2d3', 'papa', 'Papa schützt e4.'],
        ['d7d6', 'ich', 'Stütze e5 und öffne den Weg für deinen Läufer c8.'],
        ['e1g1', 'papa', 'Papa rochiert.'],
        ['e8g8', 'ich', 'Rochiere auch! Dein König ist sicher, und du hast alles richtig gemacht.']
      ]
    },
    {
      id: 'scholar', farbe: 'b', titel: 'Schäfermatt abwehren', untertitel: 'Mit Schwarz: Papas Falle entschärfen',
      idee: ['Wenn Papa früh die Dame rausholt, droht Matt auf f7', 'g6 jagt die Dame weg und versperrt ihren Weg', 'Danach stehst du besser da'],
      zuege: [
        ['e2e4', 'papa', 'Papa beginnt mit e4.'],
        ['e7e5', 'ich', 'Du spiegelst: Mitte besetzen.'],
        ['d1h5', 'papa', 'Papa holt die Dame früh heraus – er will das Schäfermatt auf f7!'],
        ['b8c6', 'ich', 'Entwickle den Springer. Er schützt auch den Bauern e5.'],
        ['f1c4', 'papa', 'Jetzt droht Matt auf f7: Dame und Läufer zielen beide dorthin.'],
        ['g7g6', 'ich', 'Der Abwehrzug! g6 greift die Dame an UND versperrt ihr den Weg nach f7.'],
        ['h5f3', 'papa', 'Die Dame muss ausweichen. Matt auf f7 ist vorbei.'],
        ['g8f6', 'ich', 'Entwickle den Springer. Du hast die Dame vertrieben und stehst besser entwickelt da!']
      ]
    },
    {
      id: 'damengambit', farbe: 'b', titel: 'Antwort auf d4: Damengambit', untertitel: 'Mit Schwarz: fest in der Mitte',
      idee: ['Auf d4 antwortest du mit d5', 'e6 stützt d5 – dann entwickeln', 'Läufer e7, rochieren: sicher und bequem'],
      zuege: [
        ['d2d4', 'papa', 'Papa beginnt mit dem Damenbauern.'],
        ['d7d5', 'ich', 'Spiegle ihn: Besetze die Mitte.'],
        ['c2c4', 'papa', 'Das Damengambit: Papa bietet dir einen Bauern an.'],
        ['e7e6', 'ich', 'Du lehnst ab und stützt d5. Gleichzeitig öffnest du deinen Läufer f8.'],
        ['b1c3', 'papa', 'Papa entwickelt seinen Springer.'],
        ['g8f6', 'ich', 'Springer entwickeln – er schützt auch d5.'],
        ['c1g5', 'papa', 'Papa fesselt deinen Springer f6.'],
        ['f8e7', 'ich', 'Entwickle den Läufer und löse die Fesselung auf.'],
        ['e2e3', 'papa', 'Papa schützt seinen Bauern.'],
        ['e8g8', 'ich', 'Rochiere! Dein König ist sicher.'],
        ['g1f3', 'papa', 'Papa entwickelt seinen Springer. Du stehst solide und bequem.']
      ]
    }
  ];

  // Fragen VOR Max' eigenen Zuegen (nur beim Nachmachen/Lernen): er soll den Gedanken hinter dem Zug
  // selbst finden, bevor er ihn spielt. o[0] ist die richtige Antwort (wird gemischt angezeigt).
  // Quiz vor den Zuegen ist AUS (Uli 19.10.2026: "ohne das mit dem Quiz") - Code bleibt fuer spaeter.
  const FRAGEN_VOR_ZUG = false;
  const FRAGEN_PRO_LINIE = {
    blitz: {
      e2e4: { q: 'Du beginnst mit e4. Was bringt dieser Bauernzug deinen Figuren?', o: ['Er macht Platz für Läufer und Dame', 'Er greift sofort Papas König an', 'Er schützt deinen Turm'], e: 'Genau: Ohne den Bauern wären Läufer und Dame eingesperrt. Jetzt können sie raus!' },
      f1c4: { q: 'Der Läufer geht nach c4. Auf welches Feld zielt er? Das ist Papas Schwachpunkt!', o: ['f7', 'a7', 'h8'], e: 'f7! Dort steht nur Papas König als Beschützer – das ist am Anfang das schwächste Feld.' },
      d1h5: { q: 'Warum ist die Dame auf h5 so gefährlich?', o: ['Sie zielt zusammen mit dem Läufer auf f7', 'Sie bedroht den Turm auf h8', 'Dort kann sie nie geschlagen werden'], e: 'Richtig: Zwei Angreifer (Dame und Läufer) gegen einen Verteidiger – f7 wackelt!' },
      h5f7: { q: 'Die Dame schlägt f7. Warum ist das Schachmatt?', o: ['Der König kann nirgends hin und niemand kann die Dame schlagen', 'Weil die Dame stärker als der König ist', 'Weil Papa keine Figuren mehr hat'], e: 'Genau: Der Läufer schützt die Dame, und der König hat keine Fluchtfelder. Matt in 4 Zügen!' }
    },
    legal: {
      e2e4: { q: 'Welches Gebiet besetzt du mit e4?', o: ['Die Mitte des Bretts', 'Die Ecke', 'Papas Königsfeld'], e: 'Die Mitte! Von dort aus kontrollieren deine Figuren viele Felder.' },
      g1f3: { q: 'Wen greift dein Springer auf f3 an?', o: ['Den Bauern e5', 'Den Turm h8', 'Die Dame d8'], e: 'Den Bauern e5 – und nebenbei hast du einen Springer entwickelt.' },
      f1c4: { q: 'Welches Feld ist Papas Schwachpunkt am Anfang?', o: ['f7', 'b7', 'h7'], e: 'f7! Nur der König deckt es. Dein Läufer zielt jetzt dorthin.' },
      b1c3: { q: 'Wozu brauchst du den zweiten Springer? (Das siehst du am Ende!)', o: ['Er hilft später beim Schachmatt auf d5', 'Er schlägt sofort den Läufer', 'Er schützt den König'], e: 'Er springt am Ende nach d5 und gibt Matt. Merk dir das!' },
      f3e5: { q: 'Jetzt kommt ein Opfer: Der Springer schlägt e5, Papa kann deine Dame nehmen. Was passiert dann?', o: ['Du setzt in zwei Zügen matt', 'Du verlierst die Partie', 'Nichts – alles bleibt gleich'], e: 'Du setzt matt! Die Dame ist nur der Köder.' },
      c4f7: { q: 'Warum ist „Läufer schlägt f7“ so stark?', o: ['Es ist Schach – der König muss nach e7', 'Er schlägt Papas Dame', 'Er schützt deinen Springer'], e: 'Schach! Papas König muss auf e7 ausweichen – und dort wartet das Matt.' },
      c3d5: { q: 'Warum ist Springer nach d5 ein Schachmatt?', o: ['Der König auf e7 hat keine freien Felder mehr', 'Weil der Springer stärker als die Dame ist', 'Weil Papa keine Dame mehr hat'], e: 'Alle Felder um den König sind besetzt oder bedroht – und der Springer kann nicht geschlagen werden.' }
    },
    scholar: {
      e7e5: { q: 'Papa spielt e4. Wie antwortest du am einfachsten?', o: ['Mit e5 – du spiegelst Papa', 'Mit a5', 'Mit der Dame'], e: 'Mit e5! Du besetzt auch die Mitte.' },
      b8c6: { q: 'Papa holt die Dame raus. Was ist ein guter, ruhiger Zug?', o: ['Springer nach c6 – er schützt e5 und entwickelt sich', 'Turm nach a6', 'Die Dame zurückziehen'], e: 'Springer nach c6: Du entwickelst und deckst e5 gleichzeitig.' },
      g7g6: { q: 'Papas Dame und Läufer zielen beide auf ein Feld. Auf welches droht das Schäfermatt?', o: ['f7', 'h7', 'e8'], e: 'f7! Mit g6 jagst du die Dame weg und versperrst ihren Weg nach f7.' },
      g8f6: { q: 'Was gewinnst du durch Springer nach f6?', o: ['Du entwickelst den Springer und greifst an', 'Der Springer geht verloren', 'Nichts besonderes'], e: 'Du stehst besser: Alle Figuren kommen ins Spiel, Papas Dame musste wegrennen.' }
    },
    rochade: {
      e2e4: { q: 'Womit beginnst du?', o: ['Mit einem Bauern in die Mitte', 'Mit dem König', 'Mit dem Turm'], e: 'Mit e4! Der Bauer macht Platz für Läufer und Dame.' },
      g1f3: { q: 'Warum muss der Springer von g1 weg, bevor du rochieren kannst?', o: ['Zwischen König und Turm muss alles frei sein', 'Weil Springer nicht rochieren dürfen', 'Damit er Papa schlägt'], e: 'Genau: Auf g1 und f1 darf nichts stehen, sonst geht die Rochade nicht.' },
      f1c4: { q: 'Und der Läufer von f1? Warum muss er weg?', o: ['Er steht zwischen König und Turm im Weg', 'Weil Läufer langsam sind', 'Er muss gar nicht weg'], e: 'Richtig: Der Läufer blockiert f1. Jetzt ist der Weg frei!' },
      e1g1: { q: 'Jetzt rochierst du kurz. Wohin geht der König – und wohin der Turm?', o: ['König nach g1, Turm nach f1', 'König nach f1, Turm nach g1', 'König nach e2, Turm bleibt'], e: 'König nach g1 (zwei Felder), Turm nach f1 – sicher und aktiv!' }
    }
  };

  function opening(id) { return REPERTOIRE.find(o => o.id === id); }
  function feldIdx(name) { return SchachEngine.idx(Number(name[1]) - 1, name.charCodeAt(0) - 97); }
  function ucFeld(uci, teil) { return teil === 0 ? feldIdx(uci.slice(0, 2)) : feldIdx(uci.slice(2, 4)); }
  function lesbar(uci) { return uci.slice(0, 2) + '–' + uci.slice(2, 4); }
  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---- Zustand eines Durchlaufs ----
  let lauf = null; // { op, phase:'lernen'|'ueben', i, zustand, ausgewaehlt, ziele, fehler, fehlerAmZug, meldung, gesperrt, inStation }

  function meineZuege(op) { return op.zuege.filter(z => z[1] === 'ich').length; }

  function starte(id, phase, inStation, onFertig) {
    const op = opening(id);
    if (!op) return;
    lauf = { op, phase: phase || 'lernen', i: 0, zustand: SchachEngine.anfangsstellung(), ausgewaehlt: null, ziele: [], fehler: 0, fehlerAmZug: 0, meldung: '', gesperrt: false, inStation: !!inStation, onFertig: onFertig || null, gespielt: -1 };
    App.setLastStarter(() => starte(id, phase, inStation, onFertig));
    if (lauf.phase === 'zuschauen') { zeichneZuschauen(); return; }
    weiter();
  }

  // ---- ZUSCHAUEN: Max schaut sich den Trick Zug fuer Zug an (er tippt "Weiter") ----
  function zeichneZuschauen() {
    if (!lauf) return;
    const op = lauf.op;
    const ende = lauf.gespielt >= op.zuege.length - 1;
    const letzter = lauf.gespielt >= 0 ? op.zuege[lauf.gespielt] : null;
    const felder = visuelleFelder();
    const lz = lauf.zustand.letzterZug;
    const zellen = felder.map(feld => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = lauf.zustand.board[feld];
      let k = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (lz && (feld === lz.von || feld === lz.nach)) k += ' schach-feld-letzter-zug';
      return `<div class="${k}">${stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : ''}</div>`;
    }).join('');
    let rang = '', datei = '';
    for (let i = 0; i < 8; i++) {
      rang += `<div>${SchachEngine.rankOf(felder[i * 8]) + 1}</div>`;
      datei += `<div>${DATEIEN[SchachEngine.fileOf(felder[56 + i])]}</div>`;
    }
    const wer = letzter ? (letzter[1] === 'ich' ? '🦊 Du' : '👨 Papa') : '';
    const text = letzter ? `<span class="eroeff-zug">${lesbar(letzter[0])}</span> <b>${wer}:</b> ${esc(letzter[2])}` : 'Schau gut zu! Tippe auf „Weiter“, dann wird der nächste Zug gespielt.';
    const stand = lauf.gespielt >= 0 ? `Zug ${lauf.gespielt + 1} von ${op.zuege.length}` : 'Los geht\'s';
    App.setOnLeaveScreen(null);
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachEroeffnung.zurueck()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">${esc(op.titel)} · Zuschauen</div>
        <div class="schach-info">${stand}</div>
        <div class="eroeff-text">${text}</div>
        <div class="schach-rahmen">
          <div class="schach-brett-zeile"><div class="schach-rang-leiste">${rang}</div><div class="schach-brett">${zellen}</div></div>
          <div class="schach-datei-zeile"><div class="schach-rang-spacer"></div><div class="schach-datei-leiste">${datei}</div></div>
        </div>
        <div class="weg-ergebnis-knoepfe" style="margin-top:14px;">
          <div class="weg-weiter-knopf" onclick="SchachEroeffnung.zuschauenWeiter()">${ende ? 'Jetzt du! ▶' : (lauf.gespielt < 0 ? 'Start ▶' : 'Weiter ▶')}</div>
          ${lauf.gespielt >= 0 ? '<div class="weg-unten-knopf" onclick="SchachEroeffnung.starte(\'' + op.id + '\',\'zuschauen\',' + lauf.inStation + ')">↺ Nochmal von vorn</div>' : ''}
        </div>
      </div>
    `);
    App.setOnLeaveScreen(() => { lauf = null; });
  }

  function zuschauenWeiter() {
    if (!lauf || lauf.phase !== 'zuschauen') return;
    const op = lauf.op;
    if (lauf.gespielt >= op.zuege.length - 1) {
      const cb = lauf.onFertig;
      if (cb) { lauf = null; cb('zuschauen', 0); return; }
      starte(op.id, 'lernen', lauf.inStation);
      return;
    }
    lauf.gespielt++;
    const zug = SchachEngine.zugAusUci(lauf.zustand, op.zuege[lauf.gespielt][0]);
    lauf.zustand = SchachEngine.zugAusfuehren(lauf.zustand, zug);
    zeichneZuschauen();
  }

  /** Spielt Papas Zuege automatisch, bis Max dran ist (oder die Linie zu Ende ist). */
  function weiter() {
    if (!lauf) return;
    const op = lauf.op;
    if (lauf.i >= op.zuege.length) { fertig(); return; }
    const schritt = op.zuege[lauf.i];
    if (schritt[1] === 'papa') {
      lauf.gesperrt = true;
      zeichne();
      const mein = lauf;
      setTimeout(() => {
        if (lauf !== mein) return;
        const zug = SchachEngine.zugAusUci(lauf.zustand, schritt[0]);
        lauf.zustand = SchachEngine.zugAusfuehren(lauf.zustand, zug);
        lauf.i++;
        lauf.gesperrt = false;
        lauf.meldung = lauf.phase === 'lernen' ? `Papa: ${schritt[2]}` : '';
        weiter();
      }, 900);
      return;
    }
    lauf.gesperrt = false;
    lauf.fehlerAmZug = 0;
    lauf.frage = null;
    if (lauf.phase === 'lernen') {
      const fr = FRAGEN_VOR_ZUG ? (FRAGEN_PRO_LINIE[op.id] || {})[schritt[0]] : null;
      if (fr) { lauf.frage = SchachLehre.mische(fr); lauf.fragenGesamt = (lauf.fragenGesamt || 0) + 1; }
    }
    zeichne();
  }

  /** Antwort auf die Frage vor Max' Zug. */
  function frageAntwort(i) {
    if (!lauf || !lauf.frage) return;
    const f = lauf.frage;
    if (f.status === 'fertig' || f.falsch.includes(i)) return;
    if (f.opt[i].ok) { if (f.versuche === 0) lauf.fragenRichtig = (lauf.fragenRichtig || 0) + 1; f.status = 'fertig'; }
    else { f.falsch.push(i); f.versuche++; if (f.versuche >= 2) f.status = 'fertig'; }
    zeichne();
  }

  function visuelleFelder() {
    const felder = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const rank = lauf.op.farbe === 'w' ? 7 - r : r;
      const file = lauf.op.farbe === 'w' ? c : 7 - c;
      felder.push(SchachEngine.idx(rank, file));
    }
    return felder;
  }

  function hinweisFelder() {
    if (!lauf || lauf.i >= lauf.op.zuege.length || lauf.op.zuege[lauf.i][1] !== 'ich') return { von: -1, nach: -1 };
    const u = lauf.op.zuege[lauf.i][0];
    if (lauf.phase === 'lernen') return (lauf.frage && lauf.frage.status !== 'fertig') ? { von: -1, nach: -1 } : { von: ucFeld(u, 0), nach: ucFeld(u, 1) };
    if (lauf.fehlerAmZug >= 3) return { von: ucFeld(u, 0), nach: ucFeld(u, 1) };
    if (lauf.fehlerAmZug >= 2) return { von: ucFeld(u, 0), nach: -1 };
    return { von: -1, nach: -1 };
  }

  function zeichne() {
    if (!lauf) return;
    const op = lauf.op;
    const felder = visuelleFelder();
    const hint = hinweisFelder();
    const letzter = lauf.zustand.letzterZug;
    const zellen = felder.map(feld => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = lauf.zustand.board[feld];
      let k = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (lauf.ausgewaehlt === feld) k += ' schach-feld-ausgewaehlt';
      if (lauf.ziele.some(z => z.nach === feld)) k += stein ? ' schach-feld-ziel-schlag' : ' schach-feld-ziel';
      if (letzter && (feld === letzter.von || feld === letzter.nach)) k += ' schach-feld-letzter-zug';
      if (feld === hint.von || feld === hint.nach) k += ' schach-feld-hinweis';
      return `<div class="${k}" onclick="SchachEroeffnung.feld(${feld})">${stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : ''}</div>`;
    }).join('');
    let rang = '', datei = '';
    for (let i = 0; i < 8; i++) {
      rang += `<div>${SchachEngine.rankOf(felder[i * 8]) + 1}</div>`;
      datei += `<div>${DATEIEN[SchachEngine.fileOf(felder[56 + i])]}</div>`;
    }
    const schritt = op.zuege[Math.min(lauf.i, op.zuege.length - 1)];
    const meinNr = op.zuege.slice(0, lauf.i + 1).filter(z => z[1] === 'ich').length;
    const gesamt = meineZuege(op);
    const lernen = lauf.phase === 'lernen';
    const meinZug = schritt[1] === 'ich';
    const fr = lauf.frage;
    const frageOffen = lernen && meinZug && fr && fr.status !== 'fertig';
    let kopf = lernen
      ? (meinZug ? `<span class="eroeff-zug">${lesbar(schritt[0])}</span> ${esc(schritt[2])}` : esc(lauf.meldung || 'Papa überlegt …'))
      : (meinZug ? 'Welcher Zug kommt jetzt? Spiele ihn aus dem Kopf.' : 'Papa überlegt …');
    let frageHtml = '';
    if (frageOffen) {
      kopf = '🤔 Bevor du ziehst – eine Frage:';
      frageHtml = `<div class="frage-grosse" style="font-size:20px;">${esc(fr.q)}</div>
        <div class="frage-optionen">${fr.opt.map((o, i) => `<div class="frage-opt${fr.falsch.includes(i) ? ' frage-opt-falsch' : ''}" onclick="SchachEroeffnung.frageAntwort(${i})">${esc(o.t)}</div>`).join('')}</div>
        ${fr.falsch.length ? '<div class="fuchs-kommentar fuchs-warnung"><span class="fuchs-kommentar-emoji">🦊</span><div>Nicht ganz – denk nochmal nach!</div></div>' : ''}`;
    } else if (lernen && meinZug && fr && fr.status === 'fertig') {
      frageHtml = `<div class="fuchs-kommentar fuchs-lob"><span class="fuchs-kommentar-emoji">🦊</span><div>${fr.versuche === 0 ? '✔ Richtig! ' : ''}${esc(fr.e)} <b>Jetzt spiele den Zug!</b></div></div>`;
    }
    const hinweisKnopf = (!lernen && meinZug && lauf.fehlerAmZug < 3)
      ? '<div class="eroeff-hinweis-knopf" onclick="SchachEroeffnung.hinweis()">💡 Hinweis</div>' : '';
    App.setOnLeaveScreen(null); // das eigene Neuzeichnen soll den Abbruch-Hinweis nicht ausloesen
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachEroeffnung.zurueck()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="schach-wrap">
        <div class="schach-stufe">${esc(op.titel)} · ${lernen ? 'Lernen' : 'Aus dem Kopf'}</div>
        <div class="schach-info">Dein Zug ${Math.min(meinNr, gesamt)} von ${gesamt}${!lernen ? ` · Fehler: ${lauf.fehler}` : ''}</div>
        <div class="eroeff-text">${kopf}</div>
        ${frageHtml}
        ${lauf.meldung && lauf.meldungArt === 'fehler' ? `<div class="schach-status schach-status-niederlage">${esc(lauf.meldung)}</div>` : ''}
        ${hinweisKnopf}
        <div class="schach-rahmen">
          <div class="schach-brett-zeile"><div class="schach-rang-leiste">${rang}</div><div class="schach-brett">${zellen}</div></div>
          <div class="schach-datei-zeile"><div class="schach-rang-spacer"></div><div class="schach-datei-leiste">${datei}</div></div>
        </div>
      </div>
    `);
    App.setOnLeaveScreen(() => { lauf = null; }); // verlaesst Max den Bildschirm, ist der Durchlauf beendet
  }

  function hinweis() {
    if (!lauf || lauf.phase !== 'ueben') return;
    lauf.fehlerAmZug = Math.max(lauf.fehlerAmZug, 2); // zeigt zuerst die Figur, nach weiteren Fehlern auch das Ziel
    lauf.fehler++;
    zeichne();
  }

  function feld(f) {
    if (!lauf || lauf.gesperrt || lauf.i >= lauf.op.zuege.length) return;
    const schritt = lauf.op.zuege[lauf.i];
    if (schritt[1] !== 'ich') return;
    if (lauf.frage && lauf.frage.status !== 'fertig') return; // erst die Frage beantworten
    const stein = lauf.zustand.board[f];
    const meineFarbe = lauf.op.farbe;
    lauf.meldungArt = '';
    if (lauf.ausgewaehlt !== null) {
      const zug = lauf.ziele.find(z => z.nach === f);
      const von = lauf.ausgewaehlt;
      lauf.ausgewaehlt = null; lauf.ziele = [];
      if (zug) {
        if (von === ucFeld(schritt[0], 0) && f === ucFeld(schritt[0], 1)) {
          lauf.zustand = SchachEngine.zugAusfuehren(lauf.zustand, zug);
          lauf.i++;
          lauf.meldung = '';
          weiter();
          return;
        }
        lauf.fehlerAmZug++;
        if (lauf.phase === 'ueben') lauf.fehler++;
        lauf.meldung = lauf.phase === 'lernen'
          ? 'Das ist ein erlaubter Zug – aber nicht der aus der Eröffnung. Probier den markierten Zug!'
          : 'Das ist ein erlaubter Zug, aber nicht der Eröffnungszug. Überlege nochmal!';
        lauf.meldungArt = 'fehler';
        zeichne();
        return;
      }
    }
    if (stein && stein.farbe === meineFarbe) {
      lauf.ausgewaehlt = f;
      lauf.ziele = SchachEngine.generiereLegaleZuege(lauf.zustand, f);
    }
    zeichne();
  }

  function fertig() {
    const op = lauf.op;
    const phase = lauf.phase;
    const inStation = lauf.inStation;
    if (phase === 'lernen' && lauf.onFertig) {
      const cb = lauf.onFertig;
      const info = { gesamt: lauf.fragenGesamt || 0, richtig: lauf.fragenRichtig || 0 };
      lauf = null;
      cb('lernen', info);
      return;
    }
    if (phase === 'lernen') {
      App.render(`
        <div class="weg-wrap buehne-marker">
          <div class="weg-ergebnis"><div class="weg-ergebnis-emoji">📖</div>
          <div class="weg-titel">Das war die Eröffnung!</div>
          <div class="weg-karte-info">${op.idee.map(t => `<div class="weg-info-zeile"><span>✔</span><div>${esc(t)}</div></div>`).join('')}</div>
          <div class="weg-ergebnis-knoepfe">
            <div class="weg-weiter-knopf" onclick="SchachEroeffnung.starte('${op.id}','ueben',${inStation})">Jetzt aus dem Kopf spielen ▶</div>
            <div class="weg-unten-knopf" onclick="SchachEroeffnung.starte('${op.id}','lernen',${inStation})">Nochmal ansehen</div>
          </div></div>
        </div>`);
      lauf = null;
      return;
    }
    const gesamt = meineZuege(op);
    const fehler = lauf.fehler;
    const bestanden = fehler <= 2;
    Storage.meldeEroeffnungGeuebt(op.id, fehler);
    lauf = null;
    if (inStation && typeof SchachWeg !== 'undefined' &&
        SchachWeg.uebernehmeErgebnis('eroeffnung', op.id, bestanden ? gesamt : 0, gesamt, 0,
          { bestanden, text: bestanden ? `${fehler === 0 ? 'Fehlerfrei!' : fehler + ' Fehler – das reicht!'} Du kennst die Eröffnung.` : `${fehler} Fehler. Erlaubt sind 2. Schau sie dir nochmal an und versuch es gleich nochmal!` })) return;
    App.render(`
      <div class="weg-wrap buehne-marker">
        <div class="weg-ergebnis ${bestanden ? 'weg-ergebnis-gut' : ''}"><div class="weg-ergebnis-emoji">${bestanden ? '🏆' : '💪'}</div>
        <div class="weg-titel">${bestanden ? 'Eröffnung sitzt!' : 'Fast!'}</div>
        <div class="weg-trainer"><div class="weg-fuchs">🦊</div><div class="weg-blase">${fehler === 0 ? 'Fehlerfrei!' : fehler + ' Fehler.'} ${bestanden ? 'Du kennst die Eröffnung.' : 'Schau sie dir nochmal an.'}</div></div>
        <div class="weg-ergebnis-knoepfe">
          <div class="weg-weiter-knopf" onclick="SchachEroeffnung.starte('${op.id}','ueben',false)">Nochmal aus dem Kopf ▶</div>
          <div class="weg-unten-knopf" onclick="SchachEroeffnung.renderMenu()">Alle Eröffnungen</div>
        </div></div>
      </div>`);
  }

  function zurueck() {
    const war = lauf && lauf.inStation;
    lauf = null;
    if (war && typeof SchachWeg !== 'undefined') { SchachWeg.renderHub(); return; }
    renderMenu();
  }

  /** Alle Eroeffnungen zum freien Ueben (aus "Mehr Training" und dem Auffrischen-Knopf). */
  function renderMenu() {
    const stand = Storage.getEroeffnungStand();
    const zeilen = REPERTOIRE.map(o => {
      const s = stand[o.id];
      return `<div class="eroeff-zeile" style="--kfarbe:${o.farbe === 'w' ? '#e9dcc0' : '#6b7391'}">
        <div class="eroeff-zeile-kopf"><span class="eroeff-farbe">${o.farbe === 'w' ? '⚪ Weiß' : '⚫ Schwarz'}</span><span class="eroeff-name">${esc(o.titel)}</span></div>
        <div class="eroeff-zeile-sub">${esc(o.untertitel)}${s ? ` · zuletzt ${s.fehler === 0 ? 'fehlerfrei' : s.fehler + ' Fehler'}` : ''}</div>
        <div class="eroeff-zeile-knoepfe"><span class="weg-unten-knopf" onclick="SchachEroeffnung.starte('${o.id}','lernen',false)">Lernen</span><span class="weg-unten-knopf" onclick="SchachEroeffnung.starte('${o.id}','ueben',false)">Aus dem Kopf</span></div>
      </div>`;
    }).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="weg-titel">Meine Eröffnungen</div>
        <div class="eroeff-liste">${zeilen}</div>
      </div>`);
  }

  /** Aelteste/noch nicht geuebte Eroeffnung der bereits bestandenen Stationen - fuer "Auffrischen" im Hub. */
  function auffrischKandidat() {
    const stand = Storage.getEroeffnungStand();
    const kandidaten = REPERTOIRE.filter(o => stand[o.id]);
    if (!kandidaten.length) return null;
    kandidaten.sort((a, b) => stand[a.id].ts - stand[b.id].ts);
    const o = kandidaten[0];
    const tage = (Date.now() - stand[o.id].ts) / 86400000;
    return tage >= 1 ? o : null;
  }

  return { REPERTOIRE, starte, feld, hinweis, frageAntwort, zurueck, zuschauenWeiter, renderMenu, auffrischKandidat, opening };
})();
