// Grundbegriffe per Karteikarte (20.10.2026, Uli-Wunsch): Max lernt die Fachbegriffe/Regeln aus Mathe und
// Deutsch SEPARAT von den Aufgaben - vorne ein Begriff ("Plus (+)"), hinten die Erklaerung
// ("Addition: Summand + Summand = Summe"), er dreht um und markiert SELBST, ob er es gewusst hat.
// Die taeglichen Aufgaben bleiben unveraendert Pflicht. Die Karten werden automatisch angeboten, solange
// die Grundbegriffe noch nicht sitzen (Startseite, Mathe-/Deutsch-Menue und vor den Tagesaufgaben).
// Statistik je Karte wie bei den Heimatkunde-Lernkarten (Storage.getLernkartenStats, Serie >= 2 = "sitzt").
const Grundbegriffe = (function () {
  const SITZT_AB_SERIE = 2;
  const SITZT_ANTEIL = 0.9;   // Deck "sitzt", wenn 90 % der Karten sitzen
  const KARTEN_PRO_RUNDE = 10;

  const DECKS = {
    mathe: {
      titel: 'Mathe-Grundbegriffe', kurz: 'Rechenarten, Fachbegriffe, Regeln', stat: 'gb_mathe', icon: '➕', fachName: 'Mathe',
      karten: [
        // Rechenarten
        { front: 'Plus (+)', back: '<b>Addition</b><br>Summand + Summand = <b>Summe</b>' },
        { front: 'Minus (−)', back: '<b>Subtraktion</b><br>Minuend − Subtrahend = <b>Differenz</b>' },
        { front: 'Mal (·)', back: '<b>Multiplikation</b><br>Faktor · Faktor = <b>Produkt</b>' },
        { front: 'Geteilt (:)', back: '<b>Division</b><br>Dividend : Divisor = <b>Quotient</b>' },
        { front: 'Addition', back: 'Das <b>Plus</b> (+)<br>Ergebnis: die <b>Summe</b>' },
        { front: 'Subtraktion', back: 'Das <b>Minus</b> (−)<br>Ergebnis: die <b>Differenz</b>' },
        { front: 'Multiplikation', back: 'Das <b>Mal</b> (·)<br>Ergebnis: das <b>Produkt</b>' },
        { front: 'Division', back: 'Das <b>Geteilt</b> (:)<br>Ergebnis: der <b>Quotient</b>' },
        // Ergebnisse
        { front: 'Wie heißt das Ergebnis beim Plus?', back: 'Die <b>Summe</b>' },
        { front: 'Wie heißt das Ergebnis beim Minus?', back: 'Die <b>Differenz</b>' },
        { front: 'Wie heißt das Ergebnis beim Mal?', back: 'Das <b>Produkt</b>' },
        { front: 'Wie heißt das Ergebnis beim Geteilt?', back: 'Der <b>Quotient</b>' },
        // Die Teile einer Rechnung
        { front: 'Summand', back: 'Eine Zahl, die man <b>zusammenzählt</b>.<br>3 + 4: Die 3 und die 4 sind Summanden.' },
        { front: 'Minuend', back: 'Die Zahl, <b>von der</b> abgezogen wird.<br>9 − 4: Die 9 ist der Minuend.' },
        { front: 'Subtrahend', back: 'Die Zahl, die <b>abgezogen</b> wird.<br>9 − 4: Die 4 ist der Subtrahend.' },
        { front: 'Faktor', back: 'Eine Zahl, die man <b>malnimmt</b>.<br>6 · 7: Die 6 und die 7 sind Faktoren.' },
        { front: 'Dividend', back: 'Die Zahl, die <b>geteilt</b> wird.<br>42 : 6: Die 42 ist der Dividend.' },
        { front: 'Divisor', back: 'Die Zahl, <b>durch die</b> geteilt wird.<br>42 : 6: Die 6 ist der Divisor.' },
        // Rechnen nach Worten
        { front: 'Summe aus 8 und 5', back: '8 <b>+</b> 5 = 13' },
        { front: 'Differenz aus 8 und 5', back: '8 <b>−</b> 5 = 3' },
        { front: 'Produkt aus 8 und 5', back: '8 <b>·</b> 5 = 40' },
        { front: 'Quotient aus 40 und 5', back: '40 <b>:</b> 5 = 8' },
        // Regeln
        { front: 'Punkt vor Strich', back: '<b>Mal (·)</b> und <b>Geteilt (:)</b> werden vor <b>Plus (+)</b> und <b>Minus (−)</b> gerechnet.<br>3 + 4 · 2 = 3 + 8 = 11' },
        { front: 'Welche Reihenfolge gilt beim Rechnen?', back: '1. <b>Klammern</b><br>2. <b>Punkt</b> (· und :)<br>3. <b>Strich</b> (+ und −)' },
        { front: 'Wozu sind Klammern da?', back: 'Was <b>in der Klammer</b> steht, wird <b>zuerst</b> gerechnet.<br>(3 + 4) · 2 = 7 · 2 = 14' },
        { front: 'Gleiche Rechenzeichen hintereinander', back: 'Von <b>links nach rechts</b> rechnen.<br>20 − 5 − 3 = 15 − 3 = 12' },
        // Zahlen
        { front: 'T · H · Z · E', back: '<b>T</b>ausender · <b>H</b>underter · <b>Z</b>ehner · <b>E</b>iner' },
        { front: 'Teiler', back: 'Eine Zahl, durch die man <b>ohne Rest</b> teilen kann.<br>3 ist ein Teiler von 12.' },
        { front: 'Vielfaches', back: 'Eine Zahl aus der <b>Mal-Reihe</b>.<br>12 ist ein Vielfaches von 3 (3 · 4).' },
        { front: 'Nachfolger und Vorgänger', back: '<b>Nachfolger</b>: eine Zahl mehr (+1)<br><b>Vorgänger</b>: eine Zahl weniger (−1)' },
        { front: 'Nachbarzehner und Nachbarhunderter', back: 'Der nächste <b>kleinere</b> und <b>größere</b> Zehner (Hunderter).<br>Nachbarzehner von 47: 40 und 50' }
      ]
    },
    deutsch: {
      titel: 'Deutsch-Grundbegriffe', kurz: 'Die vier Fälle, Wortarten, Rechtschreibung', stat: 'gb_deutsch', icon: '📖', fachName: 'Deutsch',
      karten: [
        // Die vier Faelle
        { front: '1. Fall', back: '<b>Nominativ</b> – Wer oder was?<br>Der Hund bellt.' },
        { front: '2. Fall', back: '<b>Genitiv</b> – Wessen?<br>Das Halsband des Hundes.' },
        { front: '3. Fall', back: '<b>Dativ</b> – Wem?<br>Ich gebe dem Hund einen Knochen.' },
        { front: '4. Fall', back: '<b>Akkusativ</b> – Wen oder was?<br>Ich sehe den Hund.' },
        { front: 'Nominativ', back: '<b>1. Fall</b> – Wer oder was?<br>der · die · das' },
        { front: 'Genitiv', back: '<b>2. Fall</b> – Wessen?<br>des · der · des' },
        { front: 'Dativ', back: '<b>3. Fall</b> – Wem?<br>dem · der · dem' },
        { front: 'Akkusativ', back: '<b>4. Fall</b> – Wen oder was?<br>den · die · das' },
        { front: 'Wer oder was?', back: 'Der <b>Nominativ</b> (1. Fall)' },
        { front: 'Wessen?', back: 'Der <b>Genitiv</b> (2. Fall)' },
        { front: 'Wem?', back: 'Der <b>Dativ</b> (3. Fall)' },
        { front: 'Wen oder was?', back: 'Der <b>Akkusativ</b> (4. Fall)' },
        // Artikel in den Faellen
        { front: 'der Hund – im Genitiv?', back: '<b>des Hundes</b><br>(bei der und das kommt oft -s oder -es dazu)' },
        { front: 'der Hund – im Dativ?', back: '<b>dem Hund</b>' },
        { front: 'der Hund – im Akkusativ?', back: '<b>den Hund</b><br>(nur bei „der“ ändert sich der Artikel)' },
        { front: 'die Katze – Genitiv und Dativ?', back: '<b>der Katze</b> (beide Male)<br>Akkusativ: die Katze' },
        { front: 'das Pferd – Genitiv, Dativ, Akkusativ?', back: '<b>des Pferdes</b> · <b>dem Pferd</b> · <b>das Pferd</b>' },
        { front: 'die Kinder – Genitiv und Dativ?', back: '<b>der Kinder</b> · <b>den Kindern</b>' },
        { front: 'Welcher Artikel verändert sich im Akkusativ?', back: 'Nur <b>der</b> → <b>den</b><br>(die und das bleiben gleich)' },
        // Adjektive
        { front: 'Zusammengesetztes Adjektiv', back: 'Zwei Wörter werden zu <b>einem</b> Wiewort.<br>grasgrün = grün wie Gras' },
        { front: 'feuerrot / schneeweiß / zuckersüß', back: 'rot <b>wie</b> Feuer · weiß <b>wie</b> Schnee · süß <b>wie</b> Zucker' },
        // Rechtschreibung
        { front: 'Doppelter Mitlaut', back: 'Nach einem <b>kurzen</b> Selbstlaut.<br>Kof-fer, Mut-ter, Tas-se, Som-mer<br>Tipp: in Silben sprechen!' },
        { front: 'Wann schreibt man ß?', back: 'Nach einem <b>langen</b> Selbstlaut oder Doppellaut (au, ei, eu).<br>groß, heiß, weiß' },
        // Wortarten
        { front: 'Nomen', back: '<b>Namenwort</b> – wird <b>großgeschrieben</b>.<br>der Hund, die Freude' },
        { front: 'Verb', back: '<b>Tunwort</b> – sagt, was jemand tut.<br>laufen, lesen, lachen' },
        { front: 'Adjektiv', back: '<b>Wiewort</b> – sagt, wie etwas ist.<br>groß, rot, schnell' },
        { front: 'Artikel', back: '<b>Begleiter</b> des Nomens.<br>der · die · das · ein · eine' },
        // Briefe
        { front: 'Anrede „Sie“ in einem Brief', back: '<b>Sie, Ihnen, Ihr</b> werden immer <b>großgeschrieben</b> (höfliche Anrede).' },
        { front: 'sie / ihre (über andere Personen)', back: 'Wenn es um <b>andere</b> geht, schreibt man <b>klein</b>.<br>Sie sagen, ihre Tasche ist weg.' }
      ]
    }
  };

  let session = null;
  let umgedreht = false;

  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function nurText(html) { return String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

  // ---------------- Stand ----------------
  function stand(fach) {
    const d = DECKS[fach];
    const stats = Storage.getLernkartenStats(d.stat);
    let sitzt = 0, gekonnt = 0;
    d.karten.forEach((k, i) => {
      const serie = stats[i] ? (stats[i].serie || 0) : 0;
      if (serie >= SITZT_AB_SERIE) sitzt++;
      if (serie >= 1) gekonnt++;   // zuletzt gewusst
    });
    const gesamt = d.karten.length;
    return { sitzt, gekonnt, gesamt, fertig: sitzt >= Math.ceil(gesamt * SITZT_ANTEIL) };
  }
  function sitzt(fach) { return stand(fach).fertig; }

  /** Karten, die noch nicht sitzen (fuer Papas Abfrage-Liste). */
  function offeneKarten(fach) {
    const d = DECKS[fach];
    const stats = Storage.getLernkartenStats(d.stat);
    return d.karten.filter((k, i) => !(stats[i] && (stats[i].serie || 0) >= SITZT_AB_SERIE)).map(k => nurText(k.front).slice(0, 40));
  }

  /** Fuer die Eltern-App: Stand je Fach + noch offene Karten. */
  function berichtFuerPapa() {
    const out = {};
    Object.keys(DECKS).forEach(f => { const s = stand(f); out[f] = { sitzt: s.sitzt, gesamt: s.gesamt, offen: offeneKarten(f).slice(0, 10) }; });
    return out;
  }

  // ---------------- Tagesmerker (Angebot nicht dauernd wiederholen) ----------------
  function heute() { return Storage.getHeutigesDatum(); }
  function merker(fach) { try { return localStorage.getItem('gbAngebot_' + fach + '_' + heute()); } catch (e) { return null; } }
  function setMerker(fach, wert) { try { localStorage.setItem('gbAngebot_' + fach + '_' + heute(), wert); } catch (e) { /* ohne Speicher */ } }

  // ---------------- Runde ----------------
  function gewicht(stat) {
    if (!stat) return 3;
    const w = Math.max(1, 3 + (stat.falsch || 0) * 2 - Math.min(stat.serie || 0, 4));
    return (stat.serie || 0) >= SITZT_AB_SERIE ? w * 0.3 : w; // schon sichere Karten seltener
  }

  function waehleKarten(fach, anzahl) {
    const d = DECKS[fach];
    const stats = Storage.getLernkartenStats(d.stat);
    const pool = d.karten.map((k, i) => ({ i, w: gewicht(stats[i]) }));
    const gezogen = [];
    while (gezogen.length < anzahl && pool.length) {
      let ziel = Math.random() * pool.reduce((s, p) => s + p.w, 0);
      let idx = pool.findIndex(p => (ziel -= p.w) <= 0);
      if (idx < 0) idx = pool.length - 1;
      gezogen.push(pool.splice(idx, 1)[0].i);
    }
    return gezogen.map(i => ({ _idx: i, front: d.karten[i].front, back: d.karten[i].back }));
  }

  /** nachher: optionaler Rueckruf, wenn Max danach zu seinen Aufgaben weitermoechte ({ text, aktion }). */
  function starte(fach, nachher) {
    setMerker(fach, 'gemacht');
    session = { fach, karten: waehleKarten(fach, KARTEN_PRO_RUNDE), index: 0, richtig: 0, verlauf: [], nachher: nachher || null, sterne: 0 };
    App.setLastStarter(() => starte(fach, nachher));
    zeichneKarte();
  }

  /** Status-Text fuer die Ferientraining-Zeile. */
  function statusText(fach) {
    const st = stand(fach);
    return `${st.gekonnt} von ${st.gesamt} gekonnt · ${st.sitzt} sicher`;
  }

  /** Tagesrunde im Ferientraining (Zeile "Grundbegriffe-Karten"): 10 Karten pro Tag, wird bei Unterbrechung
   *  (Hauptmenue, Tablet aus) bis Mitternacht an derselben Stelle fortgesetzt; abgehakt erst nach der
   *  kompletten Runde inkl. Wiederholung nicht gewusster Karten. */
  function starteTagesRunde(fach) {
    const itemId = 'gb_' + fach;
    const offen = Storage.getOffeneSession(itemId);
    if (offen && Array.isArray(offen.karten) && offen.index > 0 && offen.index < offen.karten.length && !Storage.getFerienErledigt(itemId)) {
      session = { fach, karten: offen.karten, index: offen.index, richtig: offen.richtig || 0, verlauf: offen.verlauf || [], nachher: null, sterne: offen.sterne || 0, ferienItem: itemId };
    } else {
      session = { fach, karten: waehleKarten(fach, Ferientraining.restAnzahl(itemId, KARTEN_PRO_RUNDE)), index: 0, richtig: 0, verlauf: [], nachher: null, sterne: 0, ferienItem: itemId };
    }
    App.setLastStarter(() => starteTagesRunde(fach));
    zeichneKarte();
  }

  function zeichneKarte() {
    const s = session; if (!s) return;
    umgedreht = false;
    const d = DECKS[s.fach];
    const k = s.karten[s.index];
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Grundbegriffe.zurueck()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="progress-row"><span>Karte ${s.index + 1} / ${s.karten.length}</span><span>${esc(d.titel.toUpperCase())}</span></div>
      <div class="karteikarte" onclick="Grundbegriffe.umdrehen()">
        <div class="karteikarte-inner" id="karteikarte-inner">
          <div class="karteikarte-seite karteikarte-vorne">
            <div class="lernkarte-text">${k.front}</div>
            <div class="karteikarte-hinweis">Überlege kurz – dann tippen zum Umdrehen</div>
          </div>
          <div class="karteikarte-seite karteikarte-hinten">
            <div class="lernkarte-text">${k.back}</div>
          </div>
        </div>
      </div>
      <div class="karteikarte-bewertung" id="karteikarte-bewertung">
        <div class="btn-bewertung btn-falsch" onclick="Grundbegriffe.bewerte(false)">✘ Nicht gewusst</div>
        <div class="btn-bewertung btn-richtig" onclick="Grundbegriffe.bewerte(true)">✔ Richtig gewusst</div>
      </div>`);
  }

  function umdrehen() {
    if (umgedreht || !session) return;
    umgedreht = true;
    document.getElementById('karteikarte-inner').classList.add('umgedreht');
    document.getElementById('karteikarte-bewertung').classList.add('sichtbar');
  }

  function bewerte(korrekt) {
    const s = session;
    if (!s || !umgedreht) return;
    const d = DECKS[s.fach];
    const k = s.karten[s.index];
    Storage.meldeLernkartenErgebnis(d.stat, k._idx, korrekt);
    if (korrekt) { s.richtig++; Storage.addSterne(1); s.sterne++; App.updateTopbar(); }
    s.verlauf.push({ frage: nurText(k.front).slice(0, 190), ergebnis: korrekt ? 'richtig' : 'falsch', richtigeAntwort: nurText(k.back).slice(0, 55) });
    // nicht gewusst: die Karte kommt ein paar Karten spaeter noch einmal
    if (!korrekt && !k._wiederholung) s.karten.splice(Math.min(s.karten.length, s.index + 4), 0, Object.assign({}, k, { _wiederholung: true }));
    if (s.ferienItem && !k._wiederholung) Ferientraining.melde(s.ferienItem);
    s.index++;
    if (s.index >= s.karten.length) {
      if (s.ferienItem) { Storage.loescheOffeneSession(s.ferienItem); Ferientraining.abschluss(s.ferienItem); }
      ergebnis();
    } else {
      if (s.ferienItem) Storage.setOffeneSession(s.ferienItem, { karten: s.karten, index: s.index, richtig: s.richtig, verlauf: s.verlauf, sterne: s.sterne });
      zeichneKarte();
    }
  }

  function ergebnis() {
    const s = session;
    const d = DECKS[s.fach];
    const st = stand(s.fach);
    const n = s.karten.length;
    const nachherHtml = s.nachher ? `<div class="btn-primary" onclick="Grundbegriffe.nachherStarten()">${esc(s.nachher.text)} ➜</div>` : '';
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${st.fertig ? '🏆' : '📇'}</div>
        <div class="result-title">${s.richtig} von ${n} gewusst!</div>
        <div class="result-sterne">${s.sterne} ⭐ verdient · <b>${st.gekonnt} von ${st.gesamt}</b> Karten gekonnt · ${st.sitzt} sitzen sicher</div>
        ${st.fertig ? '<div class="schach-status schach-status-sieg">Die Grundbegriffe sitzen! 🎉 Die Karten bleiben zum Auffrischen da.</div>' : '<div class="lese-text">Eine Karte sitzt sicher, wenn du sie zweimal hintereinander gewusst hast – noch eine Runde hilft!</div>'}
        ${nachherHtml}
        ${s.ferienItem ? Ferientraining.rueckkehrButtonHtml() : ''}
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Grundbegriffe.starte('${s.fach}')">Noch eine Runde</div>
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>`);
    try {
      FernSync.meldeLernsetErledigt('Grundbegriffe ' + d.fachName, `${s.richtig} von ${n} gewusst · ${st.sitzt} von ${st.gesamt} Karten sitzen sicher`, s.sterne, s.fach, s.verlauf);
    } catch (e) { /* optional */ }
  }

  function nachherStarten() {
    const s = session; if (!s || !s.nachher) return;
    const a = s.nachher.aktion; session = null; a();
  }

  function zurueck() {
    const f = session ? session.fach : null;
    session = null;
    if (f === 'deutsch' && typeof Deutsch !== 'undefined') Deutsch.renderMenu();
    else if (f === 'mathe' && typeof Mathe !== 'undefined') Mathe.renderMenu();
    else App.gotoHome();
  }

  // ---------------- Automatische Angebote ----------------
  /** Vor einer Tagesaufgabe: sitzen die Grundbegriffe des Fachs noch nicht, bietet die App die Karten an.
   *  Gibt true zurueck, wenn das Angebot gezeigt wird (der Aufrufer startet dann NICHT selbst). */
  function bieteAn(fach, aufgabenTitel, startAufgabe) {
    try {
      if (!DECKS[fach] || sitzt(fach) || merker(fach)) return false;
      const st = stand(fach), d = DECKS[fach];
      App.render(`
        <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="result-card">
          <div class="result-emoji">📇</div>
          <div class="result-title">Erst die Grundbegriffe?</div>
          <div class="lese-text">Die ${esc(d.titel)} sitzen noch nicht ganz (<b>${st.sitzt} von ${st.gesamt}</b> sitzen sicher). Zehn Karten dauern nur ein paar Minuten und helfen dir bei den Aufgaben.</div>
          <div class="btn-primary" id="gb-ja">Karten üben ➜</div>
          <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" id="gb-nein">Gleich zu den Aufgaben</div>
        </div>`);
      document.getElementById('gb-ja').onclick = () => starte(fach, { text: 'Weiter zu: ' + aufgabenTitel, aktion: startAufgabe });
      document.getElementById('gb-nein').onclick = () => { setMerker(fach, 'abgelehnt'); startAufgabe(); };
      return true;
    } catch (e) { return false; }
  }

  /** Karte auf der Startseite, solange mindestens ein Deck noch nicht sitzt. */
  function homeKarteHtml() {
    try {
      const offen = Object.keys(DECKS).filter(f => !sitzt(f));
      if (!offen.length) return '';
      const zeilen = offen.map(f => {
        const st = stand(f), d = DECKS[f];
        const prozent = Math.round(st.gekonnt / st.gesamt * 100);
        return `<div class="gb-zeile" onclick="Grundbegriffe.starte('${f}')">
          <span class="gb-icon">${d.icon}</span>
          <span class="gb-text"><b>${esc(d.titel)}</b><small>${st.gekonnt} von ${st.gesamt} gekonnt · ${st.sitzt} sicher · ${esc(d.kurz)}</small>
            <span class="gb-balken"><span style="width:${prozent}%"></span></span></span>
          <span class="gb-los">Üben ▶</span></div>`;
      }).join('');
      return `<div class="gb-karte"><div class="gb-kopf">📇 Grundbegriffe lernen <small>(Karteikarten – du markierst selbst)</small></div>${zeilen}</div>`;
    } catch (e) { return ''; }
  }

  /** Eintrag fuer das Mathe-/Deutsch-Menue. */
  function menueEintrag(fach) {
    const st = stand(fach);
    return { icon: 'lesen', titel: `Grundbegriffe (${st.gekonnt}/${st.gesamt} gekonnt)`, onclick: `Grundbegriffe.starte('${fach}')` };
  }

  return { starte, starteTagesRunde, statusText, umdrehen, bewerte, zurueck, nachherStarten, bieteAn, homeKarteHtml, menueEintrag, stand, sitzt, berichtFuerPapa, DECKS };
})();
