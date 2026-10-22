// Grundbegriffe per Karteikarte (20.10.2026, Uli-Wunsch): Max lernt die Grundbegriffe aus Mathe (die vier
// Rechenarten) und Deutsch (die vier Faelle) SEPARAT von den Aufgaben - vorne z.B. "Plus (+)", hinten
// "Summand + Summand = Summe"; er denkt sich die Rechnung selbst aus, dreht um und markiert SELBST, ob er es wusste.
// Die taeglichen Aufgaben bleiben unveraendert Pflicht. Die Karten werden automatisch angeboten, solange
// die Grundbegriffe noch nicht sitzen (Startseite, Mathe-/Deutsch-Menue und vor den Tagesaufgaben).
// Statistik je Karte wie bei den Heimatkunde-Lernkarten (Storage.getLernkartenStats, Serie >= 2 = "sitzt").
const Grundbegriffe = (function () {
  const SITZT_AB_SERIE = 2;
  const SITZT_ANTEIL = 0.9;   // Deck "sitzt", wenn 90 % der Karten sitzen
  const KARTEN_PRO_RUNDE = 4;      // jede Runde = alle (wenigen) Karten

  // Bewusst NUR wenige Karten (Uli 20.10.2026: "nur die vier Rechnungen strikt lernen ... nicht mehr, nicht
  // einzeln ... genauso bei den Faellen"): Max denkt sich zum Begriff die Rechnung/Frage selbst aus, dreht um
  // und markiert, ob er es gewusst hat. Die frueheren weiteren Karten (einzelne Begriffe, Regeln, Wortarten ...)
  // sind entfernt.
  const DECKS = {
    mathe: {
      titel: 'Die vier Rechenarten', kurz: 'Plus, Minus, Mal, Geteilt', stat: 'gb_mathe', icon: '➕', fachName: 'Mathe',
      hinweis: 'Denk dir die Rechnung aus: Wie heißen die Zahlen und das Ergebnis? Dann umdrehen.',
      karten: [
        { front: 'Plus (+)', back: 'Summand + Summand = <b>Summe</b>' },
        { front: 'Minus (−)', back: 'Minuend − Subtrahend = <b>Differenz</b>' },
        { front: 'Mal (·)', back: 'Faktor · Faktor = <b>Produkt</b>' },
        { front: 'Geteilt (:)', back: 'Dividend : Divisor = <b>Quotient</b>' }
      ]
    },
    deutsch: {
      titel: 'Die vier Fälle', kurz: 'Nominativ, Genitiv, Dativ, Akkusativ', stat: 'gb_deutsch', icon: '📖', fachName: 'Deutsch',
      hinweis: 'Wie heißt der Fall – und mit welcher Frage fragst du danach? Dann umdrehen.',
      karten: [
        { front: '1. Fall', back: '<b>Nominativ</b> – Wer oder was?' },
        { front: '2. Fall', back: '<b>Genitiv</b> – Wessen?' },
        { front: '3. Fall', back: '<b>Dativ</b> – Wem?' },
        { front: '4. Fall', back: '<b>Akkusativ</b> – Wen oder was?' }
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
            <div class="karteikarte-hinweis">${d.hinweis}</div>
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
    if (s.ferienItem && !k._wiederholung) Ferientraining.melde(s.ferienItem, korrekt);
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
