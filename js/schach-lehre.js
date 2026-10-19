// Lern-Bausteine fuer die Fuchs-Akademie (19.10.2026): Max soll Tricks VERSTEHEN, nicht nur nachklicken.
//  - fragenRunde(): kurze Wissensfragen (3 Antworten) mit Erklaerung, bevor die Uebung beginnt
//  - rochadeSchule(): Max kennt die Rochade noch nicht - erst erklaeren, dann selbst ausprobieren
const SchachLehre = (function () {
  const FIGUR_SYMBOL = SchachFiguren;
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function fuchs(text) { return `<div class="weg-trainer"><div class="weg-fuchs">🦊</div><div class="weg-blase">${text}</div></div>`; }

  /** Mischt die Antworten, merkt sich die richtige: frage = { q, o: [richtig, falsch, falsch], e: Erklaerung } (o[0] ist die richtige). */
  function mische(frage) {
    const opt = shuffle(frage.o.map((t, i) => ({ t, ok: i === 0 })));
    return { q: frage.q, e: frage.e || '', opt, versuche: 0, status: 'offen', falsch: [] };
  }

  // ---------------- Wissensfragen-Runde ----------------
  let runde = null;

  /** fragen: [{ q, o: [richtig, falsch, falsch], e: Erklaerung, brett?: Zustand }] - jede Frage mit 3 gemischten Antworten. */
  function fragenRunde(fragen, onFertig, titel, vorspann) {
    runde = { fragen: fragen.map(f => Object.assign(mische(f), { brett: f.brett || null })), i: 0, richtigErst: 0, onFertig, titel: titel || 'Der Fuchs fragt', vorspann: vorspann || '' };
    zeichneFrage();
  }

  function abbrechen() {
    runde = null; lehre = null;
    if (typeof SchachWeg !== 'undefined') SchachWeg.renderHub(); else Schach.renderMenu();
  }

  // ---------------- Brett-Hilfen ----------------
  function bauZustand(steine, amZug, rochade) {
    const b = new Array(64).fill(null);
    steine.forEach(s => { b[SchachEngine.idx(Number(s[2]) - 1, s.charCodeAt(1) - 97)] = { typ: s[0], farbe: s[3] || 'w' }; });
    return { board: b, amZug: amZug || 'w', rochade: rochade || { wK: true, wD: true, bK: true, bD: true }, enPassantZiel: null, letzterZug: null };
  }

  function zellenHtml(zustand, optionen) {
    const o = optionen || {};
    const zellen = [];
    for (let r = 7; r >= 0; r--) for (let c = 0; c < 8; c++) {
      const f = SchachEngine.idx(r, c);
      const hell = (r + c) % 2 === 1;
      const stein = zustand.board[f];
      let k = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (o.ausgewaehlt === f) k += ' schach-feld-ausgewaehlt';
      if (o.ziele && o.ziele.some(z => z.nach === f)) k += stein ? ' schach-feld-ziel-schlag' : ' schach-feld-ziel';
      if (o.hinweis && o.hinweis.includes(f)) k += ' schach-feld-hinweis';
      const klick = o.onclick ? ` onclick="${o.onclick}(${f})"` : '';
      zellen.push(`<div class="${k}"${klick}>${stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : ''}</div>`);
    }
    return zellen.join('');
  }

  function rahmenHtml(zustand, optionen, klein) {
    let rang = '', datei = '';
    for (let i = 0; i < 8; i++) { rang += `<div>${8 - i}</div>`; datei += `<div>${DATEIEN[i]}</div>`; }
    return `<div class="schach-rahmen${klein ? ' schach-rahmen-klein' : ''}">
      <div class="schach-brett-zeile"><div class="schach-rang-leiste">${rang}</div><div class="schach-brett">${zellenHtml(zustand, optionen)}</div></div>
      <div class="schach-datei-zeile"><div class="schach-rang-spacer"></div><div class="schach-datei-leiste">${datei}</div></div></div>`;
  }

  // ---------------- Rochade-Schule ----------------
  let lehre = null; // { schritt, zustand, ausgewaehlt, ziele, meldung, onFertig, infoFragen }

  // Die drei Wissensfragen am Ende der Rochade-Schule sind AUS (kein Quiz) - Erklaerung + Uebungen bleiben.
  const ROCHADE_FRAGEN = false;
  const ROCHADE_REGELN = ['König und Turm haben sich noch nie bewegt', 'Zwischen König und Turm steht keine Figur', 'Der König steht nicht im Schach und zieht nicht über ein bedrohtes Feld'];

  function rochadeSchule(onFertig) {
    lehre = { schritt: 0, onFertig, info: { gesamt: 0, richtig: 0 }, meldung: '' };
    schritt0();
  }

  // 0) Erklaerung: vorher / nachher
  function schritt0() {
    const vor = bauZustand(['ke1', 'rh1', 'ke8b'], 'w');
    const nach = bauZustand(['kg1', 'rf1', 'ke8b'], 'w');
    App.setOnLeaveScreen(null);
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLehre.abbrechen()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="weg-station-kapitel" style="--kfarbe:#7d89b8">Rochade-Schule</div>
        <div class="weg-titel">Was ist die Rochade?</div>
        ${fuchs('Die Rochade ist ein <b>Spezialzug</b>: Du bewegst <b>König und Turm gleichzeitig</b>! Der König geht <b>zwei Felder</b> zum Turm hin, und der Turm springt auf die <b>andere Seite des Königs</b>. So kommt dein König in Sicherheit und der Turm ins Spiel.')}
        <div class="rochade-vorher-nachher">
          <div><div class="rochade-label">Vorher</div>${rahmenHtml(vor, {}, true)}</div>
          <div class="rochade-pfeil">➜</div>
          <div><div class="rochade-label">Nachher</div>${rahmenHtml(nach, {}, true)}</div>
        </div>
        <div class="weg-karte-info"><div class="weg-info-zeile"><span>📜</span><div><b>Die Rochade geht nur, wenn …</b><ul class="weg-liste">${ROCHADE_REGELN.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div></div>
        <div class="weg-ergebnis-knoepfe"><div class="weg-weiter-knopf" onclick="SchachLehre.rochadeWeiter()">Jetzt ausprobieren ▶</div></div>
      </div>`);
    App.setOnLeaveScreen(() => { lehre = null; });
  }

  const UEBUNGEN = [
    { text: 'Rochiere <b>kurz</b> (zur Seite des Turms h1): Tippe den König an, dann das Feld <b>g1</b>.', art: 'K',
      zustand: () => bauZustand(['ke1', 'rh1', 'ra1', 'ke8b', 'pa2', 'pb2', 'pc2', 'pf2', 'pg2', 'ph2'], 'w'), ziel: SchachEngine.idx(0, 6),
      lob: 'Genau! Der König ist auf g1 und der Turm auf f1 – das ist die kurze Rochade.' },
    { text: 'Jetzt <b>lang</b> (zur Seite des Turms a1): Tippe den König an, dann das Feld <b>c1</b>.', art: 'D',
      zustand: () => bauZustand(['ke1', 'ra1', 'rh1', 'ke8b', 'pa2', 'pb2', 'pc2', 'pf2', 'pg2', 'ph2'], 'w'), ziel: SchachEngine.idx(0, 2),
      lob: 'Super! König auf c1, Turm auf d1 – das ist die lange Rochade.' }
  ];

  function rochadeWeiter() {
    if (!lehre) return;
    lehre.schritt++;
    const idx = lehre.schritt - 1;
    if (idx < UEBUNGEN.length) { const u = UEBUNGEN[idx]; lehre.zustand = u.zustand(); lehre.ausgewaehlt = null; lehre.ziele = []; lehre.meldung = ''; lehre.fertigLob = ''; zeichneUebung(); return; }
    if (!ROCHADE_FRAGEN) { const cb0 = lehre.onFertig; lehre = null; if (cb0) cb0({ gesamt: 0, richtig: 0 }); return; }
    // danach Wissensfragen (zurzeit aus)
    const fragen = [
      { q: 'Hier steht ein Läufer zwischen König und Turm. Darf rochiert werden?', o: ['Nein – es darf keine Figur dazwischen stehen', 'Ja, der Turm springt einfach drüber', 'Ja, aber nur mit der Dame'], e: 'Richtig: Zwischen König und Turm muss alles frei sein. Erst den Läufer wegziehen, dann rochieren!', brett: bauZustand(['ke1', 'bf1', 'rh1', 'ke8b'], 'w') },
      { q: 'Der König steht gerade im Schach. Darf er jetzt rochieren?', o: ['Nein – im Schach darf man nicht rochieren', 'Ja, die Rochade rettet immer', 'Nur mit dem Turm a1'], e: 'Richtig: Wer im Schach steht, muss das Schach erst beenden. Rochieren geht dann nicht.', brett: bauZustand(['ke1', 'rh1', 're8b', 'kg8b'], 'w') },
      { q: 'Warum rochiert man so früh?', o: ['Der König kommt in Sicherheit und der Turm ins Spiel', 'Weil es Punkte gibt', 'Damit Papa keine Dame bekommt'], e: 'Genau: Hinter den Bauern ist der König sicher – und der Turm kann mitspielen.' }
    ];
    runde = null;
    lehreFragen(fragen);
  }

  function lehreFragen(fragen) {
    const cb = lehre.onFertig;
    const info = lehre.info;
    lehre = null;
    // Brett (falls vorhanden) wird in der Frage mit angezeigt
    fragenRunde(fragen, (r) => { if (cb) cb({ gesamt: info.gesamt + r.gesamt, richtig: info.richtig + r.richtig }); }, 'Rochade-Schule');
  }

  function zeichneFrage() {
    const r = runde; if (!r) return;
    const f = r.fragen[r.i];
    const fertig = f.status === 'fertig';
    const optHtml = f.opt.map((o, i) => {
      let k = 'frage-opt';
      if (f.falsch.includes(i)) k += ' frage-opt-falsch';
      if (fertig && o.ok) k += ' frage-opt-richtig';
      return `<div class="${k}" onclick="SchachLehre.antwort(${i})">${esc(o.t)}</div>`;
    }).join('');
    const hinweis = fertig ? `<div class="fuchs-kommentar fuchs-lob"><span class="fuchs-kommentar-emoji">🦊</span><div>${esc(f.e)}</div></div>`
      : f.falsch.length ? '<div class="fuchs-kommentar fuchs-warnung"><span class="fuchs-kommentar-emoji">🦊</span><div>Nicht ganz – denk nochmal nach und probier es nochmal!</div></div>' : '';
    App.setOnLeaveScreen(null);
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLehre.abbrechen()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="weg-station-kapitel" style="--kfarbe:#FFB43A">${esc(r.titel)} · Frage ${r.i + 1} von ${r.fragen.length}</div>
        ${r.i === 0 && r.vorspann ? fuchs(esc(r.vorspann)) : ''}
        <div class="frage-grosse">${esc(f.q)}</div>
        ${f.brett ? rahmenHtml(f.brett, {}, true) : ''}
        <div class="frage-optionen">${optHtml}</div>
        ${hinweis}
        ${fertig ? `<div class="weg-ergebnis-knoepfe"><div class="weg-weiter-knopf" onclick="SchachLehre.weiter()">${r.i < r.fragen.length - 1 ? 'Nächste Frage ▶' : 'Weiter ▶'}</div></div>` : ''}
      </div>`);
    App.setOnLeaveScreen(() => { runde = null; });
  }

  function antwort(i) {
    const r = runde; if (!r) return;
    const f = r.fragen[r.i];
    if (f.status === 'fertig' || f.falsch.includes(i)) return;
    if (f.opt[i].ok) { if (f.versuche === 0) r.richtigErst++; f.status = 'fertig'; }
    else { f.falsch.push(i); f.versuche++; if (f.versuche >= 2) f.status = 'fertig'; }
    zeichneFrage();
  }

  function weiter() {
    const r = runde; if (!r) return;
    if (r.i < r.fragen.length - 1) { r.i++; zeichneFrage(); return; }
    const cb = r.onFertig; const info = { gesamt: r.fragen.length, richtig: r.richtigErst };
    runde = null;
    if (cb) cb(info);
  }

  function zeichneUebung() {
    const l = lehre; if (!l) return;
    const u = UEBUNGEN[l.schritt - 1];
    const hinweisFelder = l.versuchFalsch >= 2 ? [SchachEngine.idx(0, 4), u.ziel] : [];
    App.setOnLeaveScreen(null);
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachLehre.abbrechen()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="weg-station-kapitel" style="--kfarbe:#7d89b8">Rochade-Schule · Übung ${l.schritt} von ${UEBUNGEN.length}</div>
        ${fuchs(l.fertigLob ? esc(l.fertigLob) : u.text)}
        ${l.meldung ? `<div class="schach-status schach-status-niederlage">${esc(l.meldung)}</div>` : ''}
        ${rahmenHtml(l.zustand, { ausgewaehlt: l.ausgewaehlt, ziele: l.ziele, hinweis: hinweisFelder, onclick: l.fertigLob ? '' : 'SchachLehre.uebungFeld' }, true)}
        ${l.fertigLob ? '<div class="weg-ergebnis-knoepfe" style="margin-top:14px;"><div class="weg-weiter-knopf" onclick="SchachLehre.rochadeWeiter()">Weiter ▶</div></div>' : ''}
      </div>`);
    App.setOnLeaveScreen(() => { lehre = null; });
  }

  function uebungFeld(f) {
    const l = lehre; if (!l || l.fertigLob) return;
    const u = UEBUNGEN[l.schritt - 1];
    const stein = l.zustand.board[f];
    l.meldung = '';
    if (l.ausgewaehlt !== null) {
      const zug = l.ziele.find(z => z.nach === f);
      l.ausgewaehlt = null; const ziele = l.ziele; l.ziele = [];
      if (zug) {
        if (zug.rochade === u.art) {
          l.zustand = SchachEngine.zugAusfuehren(l.zustand, zug);
          l.fertigLob = u.lob; l.info.gesamt++; if (!l.versuchFalsch) l.info.richtig++;
          l.versuchFalsch = 0;
        } else {
          l.versuchFalsch = (l.versuchFalsch || 0) + 1;
          l.meldung = 'Das ist ein erlaubter Zug, aber keine Rochade. Der König muss zwei Felder zur Seite ziehen!';
        }
      }
    } else if (stein && stein.farbe === 'w') {
      l.ausgewaehlt = f; l.ziele = SchachEngine.generiereLegaleZuege(l.zustand, f);
    }
    zeichneUebung();
  }

  return { mische, fragenRunde, antwort, weiter, abbrechen, rochadeSchule, rochadeWeiter, uebungFeld, antwort, weiter, rahmenHtml, bauZustand };
})();
