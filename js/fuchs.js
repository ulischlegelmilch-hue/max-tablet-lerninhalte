// Der Fuchs-Trainer (19.10.2026): stellt sich beim ersten Start vor, fragt Max jeden Tag, ob er gegen
// Papa spielen will (Popup + Karte auf der Startseite, Serie 🔥), und bewertet Max' Zuege in Partien
// (bewertet Max' Zuege - hilft aber nicht beim Denken). Die Tricks selbst stehen in schach-weg.js.
const Fuchs = (function () {
  const FIGUR = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };
  const WERT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const NUDGE_MAX_PRO_TAG = 2;
  const NUDGE_ABSTAND_MS = 90 * 60 * 1000;
  const VON_STUNDE = 9, BIS_STUNDE = 20;

  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function feldName(f) { return DATEIEN[SchachEngine.fileOf(f)] + (SchachEngine.rankOf(f) + 1); }

  // ================= Vorstellung (beim ersten Start nach dem Update) =================
  const FOLIEN = [
    { emoji: '🦊', titel: 'Hallo Max!', text: 'Ich bin <b>Fuchs</b> – dein neuer Schach-Trainer! Schön, dass du da bist.' },
    { emoji: '🎩', titel: 'Geheime Tricks', text: 'Ich kenne <b>Tricks</b>, mit denen du <b>Papa überraschen</b> kannst. Schachmatt in nur 4 Zügen? Die Dame opfern und trotzdem gewinnen? Das zeige ich dir!' },
    { emoji: '♟️', titel: 'Probier es aus!', text: 'Du musst nichts auswendig lernen. Schau dir einen Trick an, mach ihn nach – und dann <b>probierst du ihn gegen Papa aus</b>. Klappt es nicht? Macht nichts, das gehört dazu!' },
    { emoji: '🔥', titel: 'Jeden Tag eine Partie', text: 'Ich frage dich <b>jeden Tag</b>, ob du gegen Papa spielen willst. Wer jeden Tag spielt, sammelt eine <b>Serie</b> – und Sterne! ⭐' },
    { emoji: '🏆', titel: 'Bereit?', text: 'Dann lass uns gleich den <b>ersten Trick</b> ansehen!' }
  ];
  let folieIdx = 0;

  function zeigeVorstellung() {
    folieIdx = 0;
    zeichneFolie();
  }

  function zeichneFolie() {
    const f = FOLIEN[folieIdx];
    const letzte = folieIdx === FOLIEN.length - 1;
    let el = document.getElementById('fuchs-vorstellung');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fuchs-vorstellung';
      el.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;' +
        'background:radial-gradient(900px 600px at 50% 0%, #2b3659 0%, #161c31 55%, #0a0e1b 100%);';
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="fuchs-folie">
        <div class="fuchs-folie-emoji">${f.emoji}</div>
        <div class="fuchs-folie-titel">${esc(f.titel)}</div>
        <div class="fuchs-folie-text">${f.text}</div>
        <div class="fuchs-punkte">${FOLIEN.map((_, i) => `<span class="${i === folieIdx ? 'an' : ''}"></span>`).join('')}</div>
        <div class="fuchs-folie-knoepfe">
          ${letzte
            ? `<div class="weg-weiter-knopf" id="fuchs-los">Los geht's ▶</div><div class="fuchs-spaeter" id="fuchs-spaeter">Später</div>`
            : `<div class="weg-weiter-knopf" id="fuchs-weiter" style="background:linear-gradient(180deg,#FFC35C,#F59E0B);color:#2a1503;">Weiter ▶</div>`}
        </div>
      </div>`;
    const weiter = document.getElementById('fuchs-weiter');
    if (weiter) weiter.onclick = () => { folieIdx++; zeichneFolie(); };
    const los = document.getElementById('fuchs-los');
    if (los) los.onclick = () => { beendeVorstellung(); try { SchachWeg.renderHub(); } catch (e) { /* optional */ } };
    const spaeter = document.getElementById('fuchs-spaeter');
    if (spaeter) spaeter.onclick = beendeVorstellung;
  }

  function beendeVorstellung() {
    const el = document.getElementById('fuchs-vorstellung');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    const f = Storage.getFuchs();
    f.vorgestellt = true;
    Storage.speichereFuchs();
  }

  /** Beim App-Start aufrufen: stellt sich vor, solange er das noch nie getan hat. */
  function startPruefung() {
    try {
      if (!Storage.getFuchs().vorgestellt) { zeigeVorstellung(); return true; }
    } catch (e) { /* optional */ }
    return false;
  }

  // ================= Tagestrick + Aufforderung =================
  /** Papas Empfehlung (max. 3 Tage alt) oder der naechste noch nicht gelernte/geklappte Trick. */
  function empfohlenerTrick() {
    const tricks = SchachWeg.TRICKS;
    const papa = Storage.getFuchs().tagesTrick;
    if (papa && papa.id && Date.now() - (papa.ts || 0) < 3 * 86400000) {
      const t = tricks.find(x => x.id === papa.id);
      if (t) return { trick: t, vonPapa: true };
    }
    const w = Storage.getSchachWeg();
    const ungelernt = tricks.find(t => !w.erledigt[t.id]);
    if (ungelernt) return { trick: ungelernt, vonPapa: false };
    const ohneErfolg = tricks.find(t => ((w.mission || {})[t.id] || {}).ergebnis !== 'geklappt');
    if (ohneErfolg) return { trick: ohneErfolg, vonPapa: false };
    const tag = Math.floor(Date.now() / 86400000);
    return { trick: tricks[tag % tricks.length], vonPapa: false };
  }

  function imZeitfenster() {
    const h = new Date().getHours();
    return h >= VON_STUNDE && h < BIS_STUNDE;
  }

  /** Tages-Popup: hoechstens 2x pro Tag, nie wenn Max heute schon gegen Papa gespielt hat, nur tagsueber. */
  function tagesImpuls() {
    try {
      const f = Storage.getFuchs();
      if (!f.vorgestellt || Storage.fuchsHeuteGespielt() || !imZeitfenster()) return;
      if (document.getElementById('hinweis-popup') || document.getElementById('fuchs-vorstellung')) return;
      const heute = Storage.getHeutigesDatum();
      if (f.nudgeTag !== heute) { f.nudgeTag = heute; f.nudgeAnzahl = 0; f.nudgeTs = 0; }
      if (f.nudgeAnzahl >= NUDGE_MAX_PRO_TAG || Date.now() - (f.nudgeTs || 0) < NUDGE_ABSTAND_MS) return;
      f.nudgeAnzahl++; f.nudgeTs = Date.now();
      Storage.speichereFuchs();
      const { trick, vonPapa } = empfohlenerTrick();
      const serie = Storage.fuchsSerie();
      const tag = Math.floor(Date.now() / 86400000) % 3;
      let text;
      if (vonPapa) text = `Papa empfiehlt dir heute den Trick ${trick.emoji} „${trick.titel}“. Probier ihn gegen ihn aus!`;
      else if (serie >= 2 && f.nudgeAnzahl === 1) text = `Du hast schon ${serie} Tage in Folge gegen Papa gespielt 🔥 Mach weiter – heute probierst du: ${trick.emoji} „${trick.titel}“!`;
      else text = [
        `Hey Max! Papa wartet auf dich. Lust auf eine Partie? Probier heute: ${trick.emoji} „${trick.titel}“!`,
        `Na, Schachfuchs? Eine Partie gegen Papa gefällig? Heute dein Trick: ${trick.emoji} „${trick.titel}“!`,
        `Psst! Heute wäre ein guter Tag, Papa zu überraschen. Dein Trick: ${trick.emoji} „${trick.titel}“!`
      ][tag];
      const ohnePapa = !Storage.getSchachWeg().erledigt[trick.id];
      Hinweise.zeigePopup('🦊', 'Fuchs fragt', text + (ohnePapa ? '' : ' Oder üb erst gegen mich – ich helfe dir!'), [
        { text: 'Los, gegen Papa! ▶', primaer: true, aktion: () => tagesStart() },
        { text: 'Gegen den Fuchs 🦊', aktion: () => { try { Schach.starteGegenFuchs(); } catch (e) { /* optional */ } } },
        { text: 'Später' }
      ], 'fuchs');
    } catch (e) { /* Aufforderung ist optional */ }
  }

  /** "Los, gegen Papa": ist der Trick schon gelernt -> Mission + Online-Partie, sonst erst den Trick ansehen. */
  function tagesStart() {
    const { trick } = empfohlenerTrick();
    const gelernt = !!Storage.getSchachWeg().erledigt[trick.id];
    if (gelernt) SchachWeg.startMission(trick.id, 'papa');
    else SchachWeg.zeigeTrick(trick.id);
  }

  /** Karte auf der Startseite. */
  function homeKarteHtml() {
    try {
      const f = Storage.getFuchs();
      if (!f.vorgestellt) return '';
      const serie = Storage.fuchsSerie();
      if (Storage.fuchsHeuteGespielt()) {
        return `<div class="fuchs-karte fuchs-karte-fertig" onclick="SchachWeg.renderHub()"><span class="fuchs-karte-emoji">🦊</span>
          <span class="fuchs-karte-text"><b>Heute schon gegen Papa gespielt – klasse!</b><small>${serie >= 2 ? `🔥 ${serie} Tage in Folge` : 'Morgen wieder?'}</small></span><span class="fuchs-karte-los">Akademie ›</span></div>`;
      }
      const { trick, vonPapa } = empfohlenerTrick();
      return `<div class="fuchs-karte" onclick="Fuchs.tagesStart()"><span class="fuchs-karte-emoji">🦊</span>
        <span class="fuchs-karte-text"><b>Spielst du heute gegen Papa?</b><small>${vonPapa ? 'Papa empfiehlt' : 'Dein Trick'}: ${trick.emoji} ${esc(trick.titel)}${serie >= 1 ? ` · 🔥 ${serie}` : ''}</small></span><span class="fuchs-karte-los">Los ▶</span></div>
        <div class="fuchs-karte fuchs-karte-klein" onclick="Schach.starteGegenFuchs()"><span class="fuchs-karte-emoji" style="font-size:28px;">🎓</span>
        <span class="fuchs-karte-text"><b>Oder üb gegen mich!</b><small>Der Fuchs spielt mit dir und hilft dir mit Tipps</small></span><span class="fuchs-karte-los">Spielen ▶</span></div>`;
    } catch (e) { return ''; }
  }

  /** Max hat in einer Online-Partie gegen Papa gezogen. */
  let bonusOffen = false;
  function partieGespielt() {
    try {
      const erstes = Storage.fuchsPartieGespielt();
      if (!erstes) return;
      Storage.addSterne(10);
      App.updateTopbar();
      bonusOffen = true;
      FernSync.meldeSchachTag();
    } catch (e) { /* optional */ }
  }

  /** Nach dem Ende der Partie: Bonus-Meldung (einmal pro Tag). */
  function partieBeendetHinweis() {
    if (!bonusOffen) return;
    bonusOffen = false;
    const serie = Storage.fuchsSerie();
    try {
      Hinweise.zeigePopup('🔥', 'Fuchs-Bonus!', `Du hast heute gegen Papa gespielt: +10 ⭐${serie >= 2 ? ` · ${serie} Tage in Folge!` : ''}`, [{ text: 'Super!', primaer: true }], 'fuchsbonus');
    } catch (e) { /* optional */ }
  }

  // ================= Bewertung waehrend der Partie =================
  // Von sich aus gibt der Fuchs KEINE Hilfe vor dem Zug (Max soll selbst nachdenken) - Hilfe gibt es nur
  // auf Wunsch (siehe "Dosierte Hilfe" unten). Er BEWERTET den Zug, den Max gerade gemacht hat: Lob, "Vorsicht" bei einer hängenden Figur, "verpasst" bei einer
  // liegengelassenen Gratis-Figur. Die Bewertung bleibt stehen, bis Max den naechsten Zug macht.
  let kKey = null, kText = null, kZustandVorher = null, kZustandAktuell = null, kBewertung = null;

  function bester(liste, bewerte) { return liste.reduce((b, x) => (b === null || bewerte(x) > bewerte(b)) ? x : b, null); }

  /** Eigene Figuren, die der Gegner JETZT schlagen koennte und dabei Vorteil haette. */
  function bedrohteFiguren(z, meine) {
    const gegner = meine === 'w' ? 'b' : 'w';
    const z2 = Object.assign({}, z, { amZug: gegner, enPassantZiel: null });
    const res = [];
    SchachEngine.alleLegalenZuege(z2, gegner).filter(m => m.schlag && !m.enPassant).forEach(m => {
      const opfer = z.board[m.nach];
      if (!opfer || opfer.typ === 'k') return;
      const danach = SchachEngine.zugAusfuehren(z2, m);
      const zurueck = SchachEngine.alleLegalenZuege(danach, meine).some(r => r.nach === m.nach);
      const verlust = zurueck ? WERT[opfer.typ] - WERT[m.stein.typ] : WERT[opfer.typ];
      if (verlust >= 2) res.push({ feld: m.nach, typ: opfer.typ, verlust });
    });
    return res;
  }

  /** Gegnerische Figuren, die Max gratis (oder mit Gewinn) nehmen koennte. */
  function geschenkteFiguren(z, meine) {
    const res = [];
    SchachEngine.alleLegalenZuege(z, meine).filter(m => m.schlag && !m.enPassant).forEach(m => {
      const ziel = z.board[m.nach];
      if (!ziel || ziel.typ === 'k') return;
      const danach = SchachEngine.zugAusfuehren(z, m);
      const gegner = meine === 'w' ? 'b' : 'w';
      const zurueck = SchachEngine.alleLegalenZuege(danach, gegner).some(r => r.nach === m.nach);
      const gewinn = zurueck ? WERT[ziel.typ] - WERT[m.stein.typ] : WERT[ziel.typ];
      if (gewinn >= 3) res.push({ feld: m.nach, typ: ziel.typ, gewinn, gratis: !zurueck });
    });
    return res;
  }

  /** Bewertet Max' Zug: zustandVorher = Stellung vor seinem Zug (er war am Zug), zustandNachher = danach. */
  function bewerteZug(zustandVorher, zustandNachher, meine, status) {
    const lz = zustandNachher.letzterZug;
    const vorherBoard = zustandVorher ? zustandVorher.board : null;
    const geschlagen = lz.schlag && vorherBoard ? (lz.enPassant ? { typ: 'p' } : vorherBoard[lz.nach]) : null;
    // 1) Schlechtes zuerst: haengt jetzt etwas Wichtiges?
    const bedroht = bester(bedrohteFiguren(zustandNachher, meine), b => b.verlust);
    if (bedroht && status !== 'schach') {
      return { art: 'warnung', titel: '😬 Vorsicht', text: `Nach diesem Zug kann Papa deinen ${FIGUR[bedroht.typ]} auf ${feldName(bedroht.feld)} schlagen${bedroht.verlust >= 3 ? ' – das wäre ein echter Verlust' : ''}.` };
    }
    // 2) Gutes
    if (status === 'schach') return { art: 'lob', titel: '⭐ Super', text: 'Schach! Papa muss reagieren – gut gemacht.' };
    if (geschlagen) return { art: 'lob', titel: '👍 Gut', text: `Du hast Papas ${FIGUR[geschlagen.typ]} geschlagen.` };
    if (lz.rochade) return { art: 'lob', titel: '👍 Gut', text: 'Rochade! Dein König ist jetzt viel sicherer.' };
    // 3) Verpasst: war vorher etwas Gratis zu holen?
    const chance = zustandVorher ? bester(geschenkteFiguren(zustandVorher, meine), g => g.gewinn) : null;
    if (chance) {
      return { art: 'chance', titel: '🤔 Verpasst', text: `Schade: Papas ${FIGUR[chance.typ]} auf ${feldName(chance.feld)} war ${chance.gratis ? 'ungeschützt' : 'zu schlagen'} – dort lag ein Vorteil für dich.` };
    }
    // 4) Entwicklung / Mitte (nur kleines Lob, kein Tipp)
    const typ = lz.stein.typ;
    const startReihe = meine === 'w' ? 0 : 7;
    if ((typ === 'n' || typ === 'b') && SchachEngine.rankOf(lz.von) === startReihe) return { art: 'lob', titel: '👍 Gut', text: `Du hast deinen ${FIGUR[typ]} entwickelt.` };
    if (typ === 'p' && lz.doppelzug && ['d', 'e'].includes(DATEIEN[SchachEngine.fileOf(lz.nach)])) return { art: 'lob', titel: '👍 Gut', text: 'Ein Bauer in der Mitte – ein starker Start.' };
    return null;
  }

  /** Liefert { text, art, titel } - bewertet NUR Max' letzten Zug (bleibt stehen, bis er wieder zieht) - oder null. */
  function berechne(zustand, meine, zugNr, status) {
    try {
      const lz = zustand.letzterZug;
      const key = (lz ? lz.von + '-' + lz.nach : 'start') + ':' + zugNr + ':' + meine;
      if (key === kKey) return kText;
      kZustandVorher = kZustandAktuell; kZustandAktuell = zustand;
      kKey = key;
      if (status === 'matt' || status === 'patt' || status === 'remis' || !lz) { kBewertung = null; kText = null; return kText; }
      const ichHabeGezogen = lz.stein && lz.stein.farbe === meine;
      if (ichHabeGezogen) kBewertung = technikBewertung(kZustandVorher, zustand, meine) || bewerteZug(kZustandVorher, zustand, meine, status);
      kText = kBewertung; // nach Papas Antwort bleibt die Bewertung von Max' letztem Zug sichtbar
      return kText;
    } catch (e) { return null; }
  }

  function kommentarHtml(zustand, meine, zugNr, status) {
    const k = berechne(zustand, meine, zugNr, status);
    if (!k) return '';
    return `<div class="fuchs-kommentar fuchs-${k.art}"><span class="fuchs-kommentar-emoji">🦊</span><div><b>${esc(k.titel)} – dein letzter Zug:</b> ${esc(k.text)}</div></div>`;
  }

  function kommentarNeu(modus) { kKey = null; kText = null; kZustandVorher = null; kZustandAktuell = null; kBewertung = null; neuePartie(modus); }

  // ================= Coach: Solo-Zuege, Vorschlaege, Abfragen (Uli 19.10.2026) =================
  // Der Fuchs gibt nicht bei jedem Zug Hilfe, sondern FUEHRT Max:
  //  - SOLO-Zug:   "Dieser Zug gehoert dir allein" - keine Hilfe, Max denkt selbst (mindestens jeder 2. Zug).
  //  - VORSCHLAG:  bei einer wichtigen Technik (Matt in 1, Gabel, Fessel, Gratis-Figur, Gefahr, Rochade) nennt
  //                der Fuchs sie und zeigt auf Wunsch Schritt fuer Schritt wie - Max kann sie gegen Papa nutzen.
  //  - ABFRAGE:    taucht eine schon gezeigte Technik wieder auf, sagt der Fuchs nur "siehst du sie?" - Max
  //                soll sie SELBST finden; danach wird bewertet, ob er sie genutzt hat.
  // Nach der Partie fragt der Fuchs die Tipps kurz ab (Rueckblick) und schlaegt noch unbekannte Tricks vor.
  // Gegen den Fuchs selbst (Uebungspartie) darf Max jederzeit Hilfe holen.
  const TECHNIK = {
    matt1: { emoji: '🎯', name: 'Matt in einem Zug', kurz: 'Der König kann nicht mehr entkommen.' },
    gabel: { emoji: '🍴', name: 'Gabel', kurz: 'Eine Figur greift zwei Figuren gleichzeitig an.' },
    fessel: { emoji: '🔗', name: 'Fesselung', kurz: 'Eine Figur darf nicht wegziehen, weil dahinter der König steht.' },
    gratis: { emoji: '🎁', name: 'Gratis-Figur', kurz: 'Eine ungeschützte Figur kannst du einfach nehmen.' },
    gefahr: { emoji: '🐕', name: 'Wachhund', kurz: 'Eine deiner Figuren ist in Gefahr.' },
    rochade: { emoji: '🏰', name: 'Rochade', kurz: 'Der König kommt in Sicherheit, der Turm ins Spiel.' },
    eroeffnung: { emoji: '📖', name: 'Gute Eröffnung', kurz: 'Ein gut gelernter Start gibt dir Platz und einen sicheren König.' }
  };
  const IDEE_TRICK = { matt1: 'mattjaeger', gabel: 'gabel', fessel: 'fessel', rochade: 'rochade', gefahr: 'wachhund', gratis: 'wachhund' };
  const WICHTIG = ['matt1', 'gefahr', 'gratis', 'gabel', 'fessel'];
  const RUECKBLICK = {
    gabel: { q: 'Was ist eine Gabel?', o: ['Eine Figur greift zwei Figuren gleichzeitig an', 'Ein Zug mit zwei Bauern', 'Eine besondere Art zu rochieren'], e: 'Genau: Papa kann nur eine Figur retten – die andere gehört dir.' },
    fessel: { q: 'Was bedeutet es, wenn eine Figur gefesselt ist?', o: ['Sie darf nicht wegziehen, weil dahinter der König steht', 'Sie wurde geschlagen', 'Sie darf nur rückwärts ziehen'], e: 'Richtig: Zöge sie weg, stünde der König im Schach.' },
    matt1: { q: 'Wann ist es Schachmatt?', o: ['Der König steht im Schach und kann nicht entkommen', 'Der König hat keine Figuren mehr', 'Die Dame wurde geschlagen'], e: 'Genau: Schach – und keine Rettung. Dann hast du gewonnen!' },
    gratis: { q: 'Papa lässt eine Figur ungeschützt stehen. Was machst du?', o: ['Erst prüfen, ob sie wirklich ungeschützt ist – dann schlagen', 'Sofort mit der Dame schlagen', 'Nichts tun'], e: 'Richtig: Immer erst prüfen, ob es keine Falle ist!' },
    gefahr: { q: 'Was prüfst du vor jedem Zug?', o: ['Kann Papa danach etwas von mir schlagen?', 'Wie spät es ist', 'Welche Farbe sein Springer hat'], e: 'Genau – diese eine Frage verhindert die meisten Fehler.' },
    eroeffnung: { q: 'Warum startest du mit einer guten Eröffnung?', o: ['Du bekommst früh Platz, entwickelst deine Figuren und bringst den König in Sicherheit', 'Damit die Partie möglichst kurz ist', 'Weil man sonst nicht ziehen darf'], e: 'Genau: Eine gute Eröffnung gibt dir einen sicheren Start – dann kannst du in Ruhe Tricks suchen.' },
    rochade: { q: 'Wohin zieht der König bei der kurzen Rochade?', o: ['Zwei Felder zum Turm hin (nach g1)', 'Ein Feld nach vorn', 'Auf die andere Brettseite'], e: 'Der König zieht zwei Felder, der Turm springt auf die andere Seite.' }
  };
  // Hilfen pro Partie (die Eroeffnungs-Empfehlung zaehlt NICHT mit - Uli 19.10.2026)
  const HILFE_MAX_PAPA = 4;
  const HILFE_MAX_FUCHS = 10;

  let partie = null;

  function techStand(art) {
    const f = Storage.getFuchs();
    if (!f.technik) f.technik = {};
    if (!f.technik[art]) f.technik[art] = { gezeigt: 0, selbst: 0, abfrageOk: 0, abfrageGesamt: 0 };
    return f.technik[art];
  }

  function neuePartie(modus) {
    // Ziel fuer diese Partie: eine Technik, die der Fuchs schon gezeigt hat und die Max noch nie selbst genutzt hat
    let ziel = null;
    try {
      const f = Storage.getFuchs();
      const t = f.technik || {};
      const kand = Object.keys(t).filter(a => TECHNIK[a] && t[a].gezeigt > 0 && t[a].selbst === 0);
      kand.sort((x, y) => t[y].gezeigt - t[x].gezeigt);
      if (kand.length) ziel = kand[0];
    } catch (e) { /* optional */ }
    partie = { modus: modus || 'papa', k: 0, turn: null, key: null, genutzt: 0, stufe: -1, aktuelleIdee: null, ideenCache: null,
      allein: false, alleinVonStart: false, alleinAus: false, ersterZugGemacht: false, letzterVorschlagK: -9, letzteAbfrageK: -9,
      vorgeschlagen: [], lern: [], ende: false, ziel, zielErreicht: false, rb: null, rbFertig: false, rbRichtig: 0, rbGemeldet: false,
      z: null, meine: 'w', zugNr: 0, renderFn: null, letzteZugNr: undefined, gezaehlt: {} };
  }
  function p() { if (!partie) neuePartie(); return partie; }
  function setModus(m) { p().modus = m; }
  function setRender(fn) { p().renderFn = fn; }
  function neu() { p().renderFn && p().renderFn(); }

  const RICHTUNGEN_L = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const RICHTUNGEN_T = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /** Gegnerische Figuren, die gegen ihren KOENIG gefesselt sind (Max' Laeufer/Turm/Dame zielt durch sie auf den Koenig). */
  function gefesselte(z, meine) {
    const res = [];
    for (let s = 0; s < 64; s++) {
      const st = z.board[s];
      if (!st || st.farbe !== meine || !['b', 'r', 'q'].includes(st.typ)) continue;
      const dirs = st.typ === 'b' ? RICHTUNGEN_L : st.typ === 'r' ? RICHTUNGEN_T : RICHTUNGEN_L.concat(RICHTUNGEN_T);
      dirs.forEach(([dr, df]) => {
        let r = SchachEngine.rankOf(s) + dr, f = SchachEngine.fileOf(s) + df, erste = null;
        while (r >= 0 && r < 8 && f >= 0 && f < 8) {
          const q = z.board[SchachEngine.idx(r, f)];
          if (q) {
            if (!erste) { if (q.farbe === meine) break; erste = { typ: q.typ, feld: SchachEngine.idx(r, f) }; }
            else { if (q.farbe !== meine && q.typ === 'k' && erste.typ !== 'k' && WERT[erste.typ] >= 3) res.push({ feld: erste.feld, typ: erste.typ, von: s }); break; }
          }
          r += dr; f += df;
        }
      });
    }
    return res;
  }

  /** Greift die Figur nach dem Zug m zwei wertvolle gegnerische Figuren (oder Koenig + Figur) gleichzeitig an - und steht sicher? */
  function istGabelZug(z, m, meine) {
    if (m.stein.typ === 'k') return false;
    const nachher = SchachEngine.zugAusfuehren(z, m);
    const z3 = Object.assign({}, nachher, { amZug: meine, enPassantZiel: null });
    const ziele = SchachEngine.generiereLegaleZuege(z3, m.nach).filter(c => c.schlag).map(c => nachher.board[c.nach]).filter(x => x && x.typ !== 'k');
    const wertvoll = ziele.filter(x => WERT[x.typ] >= 3).length;
    const mitSchach = SchachEngine.istImSchach(nachher, nachher.amZug);
    if (!(wertvoll >= 2 || (mitSchach && wertvoll >= 1))) return false;
    return !bedrohteFiguren(nachher, meine).some(b => b.feld === m.nach);
  }

  // ---- Eroeffnungs-Empfehlung: folgt die Stellung noch einer gelernten Linie, empfiehlt der Fuchs den naechsten Zug ----
  function stellungSig(z) { return z.board.map(s => s ? (s.farbe === 'w' ? s.typ.toUpperCase() : s.typ) : '.').join('') + z.amZug; }
  let linienCache = null;
  function linien() {
    if (linienCache) return linienCache;
    linienCache = [];
    if (typeof SchachEroeffnung === 'undefined') return linienCache;
    SchachEroeffnung.REPERTOIRE.forEach(op => {
      let z = SchachEngine.anfangsstellung();
      const pos = [];
      for (let i = 0; i < op.zuege.length; i++) {
        pos.push({ sig: stellungSig(z), uci: op.zuege[i][0], ich: op.zuege[i][1] === 'ich' });
        const zug = SchachEngine.zugAusUci(z, op.zuege[i][0]);
        if (!zug) break;
        z = SchachEngine.zugAusfuehren(z, zug);
      }
      linienCache.push({ op, pos });
    });
    return linienCache;
  }

  function eroeffnungsIdee(z, meine, k) {
    try {
      if (k > 10) return null;
      const sig = stellungSig(z);
      const treffer = [];
      linien().forEach(l => { if (l.op.farbe === meine) { const t = l.pos.find(x => x.sig === sig && x.ich); if (t) treffer.push({ l, t }); } });
      if (!treffer.length) return null;
      // Bevorzugt eine Linie, die Max als Trick schon gelernt hat (so nutzt er sie gegen Papa), sonst die Standard-Empfehlung
      const gelernt = Storage.getSchachWeg().erledigt;
      const TRICK_LINIE = { blitz: 'blitz', legal: 'legal', rochade: 'rochade', schutz: 'scholar' };
      const lieblinge = Object.keys(TRICK_LINIE).filter(t => gelernt[t]).map(t => TRICK_LINIE[t]);
      const standard = meine === 'w' ? ['italienisch', 'london'] : ['spiegel', 'damengambit', 'scholar'];
      const wahl = treffer.find(x => lieblinge.includes(x.l.op.id)) || treffer.find(x => standard.includes(x.l.op.id)) || treffer[0];
      const u = wahl.t.uci;
      const von = SchachEngine.idx(Number(u[1]) - 1, u.charCodeAt(0) - 97), nach = SchachEngine.idx(Number(u[3]) - 1, u.charCodeAt(2) - 97);
      const stein = z.board[von];
      return { art: 'eroeffnung', prio: 55, von, nach, typ: stein ? stein.typ : 'p', titel: wahl.l.op.titel, untertitel: wahl.l.op.untertitel, linie: wahl.l.op.id };
    } catch (e) { return null; }
  }

  /** Alle "Ideen" in der Stellung (Max am Zug), nach Wichtigkeit sortiert. */
  function ideen(z, meine, k) {
    const out = [];
    if (!z || z.amZug !== meine) return out;
    const eroe = eroeffnungsIdee(z, meine, k == null ? 99 : k);
    if (eroe) out.push(eroe);
    const zuege = SchachEngine.alleLegalenZuege(z, meine);
    zuege.forEach(m => { if (SchachEngine.spielstatus(SchachEngine.zugAusfuehren(z, m)) === 'matt') out.push({ art: 'matt1', prio: 100, von: m.von, nach: m.nach, typ: m.stein.typ }); });
    const gefahr = bester(bedrohteFiguren(z, meine), b => b.verlust);
    if (gefahr) out.push({ art: 'gefahr', prio: 90, von: gefahr.feld, typ: gefahr.typ });
    const gratis = bester(geschenkteFiguren(z, meine), g => g.gewinn);
    if (gratis) {
      const m = zuege.find(x => x.nach === gratis.feld && x.schlag);
      out.push({ art: 'gratis', prio: 80, von: m ? m.von : gratis.feld, nach: gratis.feld, typ: gratis.typ });
    }
    const gm = zuege.find(m => istGabelZug(z, m, meine));
    if (gm) out.push({ art: 'gabel', prio: 70, von: gm.von, nach: gm.nach, typ: gm.stein.typ });
    const fe = gefesselte(z, meine)[0];
    if (fe) out.push({ art: 'fessel', prio: 60, von: fe.von, nach: fe.feld, typ: fe.typ });
    const roch = zuege.find(m => m.rochade);
    if (roch) out.push({ art: 'rochade', prio: 50, von: roch.von, nach: roch.nach, typ: 'k' });
    out.sort((a, b) => b.prio - a.prio);
    return out;
  }

  /** Welche Techniken hat Max' Zug m (Stellung z davor, nachher danach) tatsaechlich genutzt? */
  function zugArten(z, m, nachher, meine, turnIdee) {
    const arten = [];
    try {
      if (turnIdee && turnIdee.art === 'eroeffnung' && m.von === turnIdee.von && m.nach === turnIdee.nach) arten.push('eroeffnung');
      if (SchachEngine.spielstatus(nachher) === 'matt') arten.push('matt1');
      if (m.rochade) arten.push('rochade');
      if (m.schlag && geschenkteFiguren(z, meine).some(g => g.feld === m.nach)) arten.push('gratis');
      if (istGabelZug(z, m, meine)) arten.push('gabel');
      if (gefesselte(nachher, meine).length > gefesselte(z, meine).length) arten.push('fessel');
      if (bedrohteFiguren(z, meine).length > 0 && bedrohteFiguren(nachher, meine).length === 0) arten.push('gefahr');
    } catch (e) { /* optional */ }
    return arten;
  }

  function hinweisText(idee, stufe) {
    const F = t => FIGUR[t];
    switch (idee.art) {
      case 'matt1':
        return stufe === 0 ? 'Es gibt ein Schachmatt in einem Zug! Schau dir Papas König genau an.'
          : stufe === 1 ? `Das Matt gelingt mit deinem ${F(idee.typ)} auf ${feldName(idee.von)}.` : `Zieh ${feldName(idee.von)}–${feldName(idee.nach)} – Schachmatt!`;
      case 'gefahr':
        return stufe === 0 ? 'Pass auf: Papa droht, eine deiner Figuren zu schlagen.'
          : `Dein ${F(idee.typ)} auf ${feldName(idee.von)} ist in Gefahr – ziehe ihn weg oder schütze ihn.`;
      case 'gratis':
        return stufe === 0 ? 'Papa hat eine Figur ungeschützt stehen lassen …'
          : stufe === 1 ? `Schau dir Papas ${F(idee.typ)} auf ${feldName(idee.nach)} an – ist er geschützt?` : `Du kannst Papas ${F(idee.typ)} auf ${feldName(idee.nach)} schlagen – er ist nicht geschützt.`;
      case 'gabel':
        return stufe === 0 ? 'Eine Gabel ist möglich: Eine Figur könnte zwei Figuren von Papa gleichzeitig angreifen!'
          : stufe === 1 ? `Probier es mit deinem ${F(idee.typ)} auf ${feldName(idee.von)}.` : `Zieh ${feldName(idee.von)}–${feldName(idee.nach)}: Von dort greift er zwei Figuren an.`;
      case 'fessel':
        return stufe === 0 ? 'Eine von Papas Figuren ist gefesselt – sie darf nicht wegziehen!'
          : `Papas ${F(idee.typ)} auf ${feldName(idee.nach)} steht vor seinem König und ist gefesselt. Greif sie an!`;
      case 'eroeffnung':
        return stufe === 0 ? `Empfehlung: ${idee.titel} (${idee.untertitel.replace(/^Mit (Weiß|Schwarz): /, '')}). Das ist ein guter Start gegen Papa!`
          : stufe === 1 ? `Fang mit deinem ${F(idee.typ)} auf ${feldName(idee.von)} an.` : `Zieh ${feldName(idee.von)}–${feldName(idee.nach)}.`;
      case 'rochade':
        return stufe === 0 ? 'Du könntest jetzt rochieren – das bringt deinen König in Sicherheit.' : `Rochiere: König ${feldName(idee.von)}–${feldName(idee.nach)}.`;
      default: return '';
    }
  }

  function hinweisFelder() {
    const pa = p();
    if (!pa.z || pa.stufe < 1 || !pa.aktuelleIdee || pa.ende) return [];
    const i = pa.aktuelleIdee;
    if (i.art === 'gefahr') return [i.von];
    if (i.art === 'fessel') return [i.nach];
    if (pa.stufe === 1) return [i.von];
    return [i.von, i.nach];
  }

  function maxStufe(idee) { return idee && ['gefahr', 'fessel'].includes(idee.art) ? 1 : 2; }

  /** Entscheidet, was der Fuchs bei diesem Zug tut: 'solo' | 'vorschlag' | 'abfrage' | 'allein' | 'frei'. */
  function waehleZugart(pa, liste) {
    if (pa.allein) return { art: 'allein' };
    const wichtig = liste.filter(i => WICHTIG.includes(i.art) || i.art === 'eroeffnung' || (i.art === 'rochade' && pa.k <= 8));
    const spielt = Storage.getFuchs().technik || {};
    if (pa.modus === 'fuchs') return wichtig.length ? { art: 'vorschlag', idee: wichtig[0] } : { art: 'frei' };
    if (pa.k === 0) { const e = wichtig.find(i => i.art === 'eroeffnung'); return e ? { art: 'vorschlag', idee: e } : { art: 'solo' }; } // erster Zug: Eroeffnungs-Empfehlung (Max darf sie ignorieren)
    const bekannt = wichtig.find(i => i.art !== 'eroeffnung' && ((spielt[i.art] || {}).gezeigt > 0 && (spielt[i.art] || {}).selbst === 0 || (spielt[i.art] || {}).gezeigt > 1));
    if (bekannt && pa.k - pa.letzteAbfrageK >= 3 && pa.k - pa.letzterVorschlagK >= 2) return { art: 'abfrage', idee: bekannt };
    if (wichtig.length && pa.k - pa.letzterVorschlagK >= 2) return { art: 'vorschlag', idee: wichtig[0] };
    return { art: 'solo' };
  }

  function leisteHtml(zustand, meine, zugNr, status) {
    try {
      let pa = p();
      if (pa.letzteZugNr !== undefined && zugNr < pa.letzteZugNr) { const fn = pa.renderFn, modus = pa.modus; neuePartie(modus); pa = partie; pa.renderFn = fn; } // neue Partie
      pa.letzteZugNr = zugNr;
      pa.z = zustand; pa.meine = meine; pa.zugNr = zugNr;
      if (pa.ende || zustand.amZug !== meine || status === 'matt' || status === 'patt' || status === 'remis') return '';
      const key = (zustand.letzterZug ? zustand.letzterZug.von + '-' + zustand.letzterZug.nach : 'start') + ':' + zugNr;
      if (pa.key !== key) {
        pa.key = key; pa.stufe = -1; pa.aktuelleIdee = null;
        pa.ideenCache = ideen(zustand, meine, pa.k);
        pa.turn = waehleZugart(pa, pa.ideenCache);
        pa.turn.hilfeStufe = -1;
        if (pa.turn.art === 'vorschlag') { pa.letzterVorschlagK = pa.k; const a = pa.turn.idee.art; if (!pa.vorgeschlagen.includes(a)) pa.vorgeschlagen.push(a); techStand(a).gezeigt++; Storage.speichereFuchs(); }
        if (pa.turn.art === 'abfrage') { pa.letzteAbfrageK = pa.k; }
        if (pa.turn.art === 'vorschlag') pa.aktuelleIdee = pa.turn.idee;
      }
      const turn = pa.turn;
      // Lern-Chancen merken: Techniken, die Max noch nicht kennt
      const w = Storage.getSchachWeg().erledigt;
      pa.ideenCache.forEach(i => { const t = IDEE_TRICK[i.art]; if (t && !w[t] && !pa.lern.includes(t) && !['gefahr', 'gratis'].includes(i.art)) pa.lern.push(t); });
      const zielHtml = pa.ziel && !pa.zielErreicht ? `<div class="fuchs-ziel">🎯 Dein Ziel in dieser Partie: ${TECHNIK[pa.ziel].emoji} <b>${TECHNIK[pa.ziel].name}</b> selbst nutzen – ${esc(TECHNIK[pa.ziel].kurz)}</div>` : '';
      const schalter = `<span class="fuchs-schalter" onclick="Fuchs.alleinUmschalten()">🏅 ${pa.allein ? 'Hilfe zuschalten' : 'Ganz allein spielen'}</span>`;
      const kommentar = (cls, text) => `<div class="fuchs-kommentar ${cls}"><span class="fuchs-kommentar-emoji">🦊</span><div>${text}</div></div>`;
      if (turn.art === 'allein') return `<div class="fuchs-leiste">${zielHtml}<span class="fuchs-allein">🏅 Du spielst allein – ganz ohne Fuchs-Hilfe!</span><div class="fuchs-leiste-knoepfe">${schalter}</div></div>`;
      if (turn.art === 'solo') {
        return `<div class="fuchs-leiste">${zielHtml}${kommentar('fuchs-solo', '<b>Dieser Zug gehört dir allein!</b> Denk in Ruhe nach – ich schaue nur zu und sage dir danach, was ich davon halte.')}<div class="fuchs-leiste-knoepfe">${schalter}</div></div>`;
      }
      if (turn.art === 'abfrage') {
        return `<div class="fuchs-leiste">${zielHtml}${kommentar('fuchs-abfrage', '<b>Abfrage!</b> Hier passt eine Technik, die ich dir schon gezeigt habe. Siehst du sie? Spiel selbst – ich bewerte es danach.')}<div class="fuchs-leiste-knoepfe">${schalter}</div></div>`;
      }
      // 'vorschlag' oder 'frei' (Hilfe auf Wunsch)
      const idee = pa.aktuelleIdee;
      const t = idee ? TECHNIK[idee.art] : null;
      const limit = pa.modus === 'papa' ? HILFE_MAX_PAPA : HILFE_MAX_FUCHS;
      const uebrig = limit - pa.genutzt;
      const eroeffnungsHilfe = !!idee && idee.art === 'eroeffnung'; // kostet keine Hilfe
      let text = '';
      if (turn.art === 'vorschlag' && t) text = `<b>Wichtiger Vorschlag: ${t.emoji} ${esc(t.name)}!</b> ${esc(hinweisText(idee, Math.max(0, pa.stufe)))}`;
      else if (pa.stufe >= 0) text = esc(idee ? hinweisText(idee, pa.stufe) : 'Ich sehe nichts Besonderes – spiel deinen Plan!');
      const kannMehr = !!idee && pa.stufe < maxStufe(idee);
      const knopf = turn.art === 'vorschlag'
        ? (kannMehr ? (pa.stufe < 0 ? '👉 Zeig mir wie' : '👉 Noch genauer') : '')
        : '💡 Fuchs, hilf mir';
      const knopfAus = uebrig <= 0 && !eroeffnungsHilfe;
      return `<div class="fuchs-leiste">${zielHtml}
        ${text ? kommentar('fuchs-chance', text) : ''}
        <div class="fuchs-leiste-knoepfe">
          ${knopf ? `<span class="fuchs-hilfe${knopfAus ? ' fuchs-hilfe-aus' : ''}" onclick="Fuchs.hilfe()">${knopf}${eroeffnungsHilfe ? '' : ` <small>(${Math.max(0, uebrig)} übrig)</small>`}</span>` : ''}
          ${schalter}
        </div></div>`;
    } catch (e) { return ''; }
  }

  function hilfe() {
    const pa = p();
    if (!pa.z || pa.allein || !pa.turn) return;
    const limit = pa.modus === 'papa' ? HILFE_MAX_PAPA : HILFE_MAX_FUCHS;
    const liste = pa.ideenCache || [];
    if (!pa.aktuelleIdee) {
      if (!liste.length) { pa.stufe = 0; neu(); return; } // nichts Besonderes - kostet nichts
      pa.aktuelleIdee = liste[0];
    }
    // Eroeffnungs-Empfehlungen sind frei (zaehlen nicht zum Limit), alles andere kostet eine Hilfe
    const kostenlos = pa.aktuelleIdee.art === 'eroeffnung';
    if (!kostenlos && pa.genutzt >= limit) return;
    if (pa.turn.art === 'frei' && pa.stufe < 0 && !pa.aktuelleIdee) { pa.stufe = 0; neu(); return; }
    const naechste = pa.stufe < 0 ? 0 : pa.stufe + 1;
    if (naechste > maxStufe(pa.aktuelleIdee)) return;
    pa.stufe = naechste; pa.turn.hilfeStufe = naechste;
    if (!kostenlos) pa.genutzt++;
    neu();
  }

  function alleinUmschalten() {
    const pa = p();
    pa.allein = !pa.allein;
    if (pa.allein && !pa.ersterZugGemacht) pa.alleinVonStart = true;
    if (!pa.allein) pa.alleinAus = true;
    pa.key = null; // Zugart neu bestimmen
    neu();
  }

  /** Max hat gezogen (fuer "Allein von Anfang an" und die Zugzaehlung des Coaches). */
  function zugGemacht() { const pa = p(); pa.ersterZugGemacht = true; pa.k++; }

  /** Bewertet, ob Max' Zug eine Technik genutzt hat (Abfrage, Ziel, Vorschlag) - null, wenn nichts Besonderes. */
  function technikBewertung(zVorher, zNachher, meine) {
    const pa = p();
    const turn = pa.turn;
    if (!zVorher || !turn) return null;
    const lz = zNachher.letzterZug;
    const arten = zugArten(zVorher, lz, zNachher, meine, turn.idee || pa.aktuelleIdee);
    let msg = null;
    const mitHilfe = (turn.hilfeStufe || -1) >= 2;
    const wichtigGenutzt = arten.filter(a => WICHTIG.includes(a) || a === 'rochade' || a === 'eroeffnung');
    // Technik selbst genutzt?
    wichtigGenutzt.forEach(a => {
      const st = techStand(a);
      if (!mitHilfe && a !== 'gefahr') { st.selbst++; }
    });
    Storage.speichereFuchs();
    // Ziel erreicht?
    if (pa.ziel && !pa.zielErreicht && arten.includes(pa.ziel) && !mitHilfe) {
      pa.zielErreicht = true;
      Storage.addSterne(15); App.updateTopbar();
      const t = TECHNIK[pa.ziel];
      return { art: 'lob', titel: '🏆 Ziel geschafft', text: `Du hast die Technik ${t.emoji} ${t.name} selbst genutzt – genau wie geplant! +15 ⭐` };
    }
    if (turn.art === 'abfrage') {
      const gesucht = turn.idee.art;
      const st = techStand(gesucht); st.abfrageGesamt++;
      if (arten.includes(gesucht)) { st.abfrageOk++; Storage.speichereFuchs(); const t = TECHNIK[gesucht]; return { art: 'lob', titel: '⭐ Abfrage bestanden', text: `Du hast die Technik ${t.emoji} ${t.name} selbst gefunden!` }; }
      Storage.speichereFuchs();
      const t = TECHNIK[gesucht];
      return { art: 'chance', titel: '🤔 Abfrage', text: `Hier war eine Technik versteckt: ${t.emoji} ${t.name} (${feldName(turn.idee.von)}${turn.idee.nach != null ? '–' + feldName(turn.idee.nach) : ''}). Beim nächsten Mal findest du sie!` };
    }
    if (turn.art === 'vorschlag' && arten.includes(turn.idee.art)) {
      const t = TECHNIK[turn.idee.art];
      return { art: 'lob', titel: '👍 Gut', text: mitHilfe ? `Du hast die ${t.emoji} ${t.name} genutzt – nächstes Mal versuchst du sie ganz allein!` : `Du hast die ${t.emoji} ${t.name} genutzt!` };
    }
    return null;
  }

  // ---- Rueckblick nach der Partie ----
  function rueckblickStarten() {
    const pa = p();
    if (pa.rb) return;
    const arten = pa.vorgeschlagen.filter(a => RUECKBLICK[a]).slice(0, 2);
    if (!arten.length) { pa.rb = { fragen: [], i: 0 }; pa.rbFertig = true; return; }
    pa.rb = { i: 0, fragen: arten.map(a => Object.assign({ art: a }, SchachLehre.mische(RUECKBLICK[a]))) };
  }

  function rueckblickAntwort(i) {
    const pa = p();
    const rb = pa.rb; if (!rb || pa.rbFertig) return;
    const f = rb.fragen[rb.i];
    if (f.status === 'fertig' || f.falsch.includes(i)) return;
    if (f.opt[i].ok) { if (f.versuche === 0) pa.rbRichtig++; f.status = 'fertig'; }
    else { f.falsch.push(i); f.versuche++; if (f.versuche >= 2) f.status = 'fertig'; }
    neu();
  }

  function rueckblickWeiter() {
    const pa = p();
    const rb = pa.rb; if (!rb) return;
    if (rb.i < rb.fragen.length - 1) { rb.i++; }
    else {
      pa.rbFertig = true;
      if (!pa.rbGemeldet) {
        pa.rbGemeldet = true;
        rb.fragen.forEach(f => { const st = techStand(f.art); st.abfrageGesamt++; if (f.versuche === 0) st.abfrageOk++; });
        Storage.speichereFuchs();
        try { FernSync.meldeLernsetErledigt('Fuchs-Rückblick nach der Partie', `${pa.rbRichtig} von ${rb.fragen.length} Tipps gleich richtig gewusst`, 0, 'schach'); } catch (e) { /* optional */ }
      }
    }
    neu();
  }

  function rueckblickHtml() {
    try {
      const pa = p();
      if (!pa.ende) return '';
      rueckblickStarten();
      const rb = pa.rb;
      if (!rb.fragen.length) return '';
      if (pa.rbFertig) return `<div class="fuchs-lernkarte"><div class="fuchs-lernkarte-titel">🦊 Rückblick geschafft: ${pa.rbRichtig} von ${rb.fragen.length} Tipps gleich gewusst!</div></div>`;
      const f = rb.fragen[rb.i];
      const fertig = f.status === 'fertig';
      return `<div class="fuchs-lernkarte"><div class="fuchs-lernkarte-titel">🦊 Rückblick – weißt du es noch? (${rb.i + 1}/${rb.fragen.length})</div>
        <div class="frage-grosse" style="font-size:19px;margin:6px 0 10px;">${esc(f.q)}</div>
        <div class="frage-optionen">${f.opt.map((o, i) => `<div class="frage-opt${f.falsch.includes(i) ? ' frage-opt-falsch' : ''}${fertig && o.ok ? ' frage-opt-richtig' : ''}" onclick="Fuchs.rueckblickAntwort(${i})">${esc(o.t)}</div>`).join('')}</div>
        ${fertig ? `<div class="fuchs-kommentar fuchs-lob"><span class="fuchs-kommentar-emoji">🦊</span><div>${esc(f.e)}</div></div><div class="weg-ergebnis-knoepfe"><div class="weg-weiter-knopf" onclick="Fuchs.rueckblickWeiter()">${rb.i < rb.fragen.length - 1 ? 'Nächste Frage ▶' : 'Fertig ▶'}</div></div>` : ''}
      </div>`;
    } catch (e) { return ''; }
  }

  /** Nach der Partie: Bonus fuers Alleinspielen, Meldung an Papa. */
  function spielEnde(ergebnis, gegner) {
    const pa = p();
    if (pa.ende) return;
    pa.ende = true;
    let bonus = 0;
    const gespielt = pa.zugNr >= 10;
    if (pa.alleinVonStart && !pa.alleinAus && gespielt) { bonus = 10; Storage.addSterne(bonus); App.updateTopbar(); }
    const hilfeText = pa.alleinVonStart && !pa.alleinAus ? 'ganz allein gespielt' : `Fuchs-Hilfe ${pa.genutzt}× genutzt`;
    const techs = pa.vorgeschlagen.length ? ` · Tipps: ${pa.vorgeschlagen.map(a => TECHNIK[a].name).join(', ')}` : '';
    const zielText = pa.zielErreicht ? ' · Ziel geschafft 🏆' : '';
    try { FernSync.meldeLernsetErledigt(`Schach gegen ${gegner}: ${ergebnis}`, hilfeText + techs + zielText + (bonus ? ' (+10 ⭐ Selbstständig-Bonus)' : ''), bonus, 'schach'); } catch (e) { /* optional */ }
    if (bonus) {
      try { Hinweise.zeigePopup('🏅', 'Selbstständig-Bonus!', 'Du hast die ganze Partie allein gespielt – ohne Fuchs-Hilfe. +10 ⭐', [{ text: 'Super!', primaer: true }], 'fuchsbonus2'); } catch (e) { /* optional */ }
    }
  }

  /** Karte nach der Partie: Techniken, die der Fuchs gesehen hat und die Max noch lernen kann. */
  function lernKarteHtml() {
    try {
      const pa = p();
      if (!pa.ende) return '';
      const w = Storage.getSchachWeg().erledigt;
      const offen = pa.lern.filter(t => !w[t]);
      if (!offen.length) return '';
      const tricks = offen.map(id => SchachWeg.TRICKS.find(t => t.id === id)).filter(Boolean);
      return `<div class="fuchs-lernkarte"><div class="fuchs-lernkarte-titel">🦊 In deiner Partie gab es etwas Neues zu lernen:</div>
        ${tricks.map(t => `<div class="fuchs-lern-zeile" onclick="SchachWeg.zeigeTrick('${t.id}')"><span>${t.emoji}</span><div><b>${esc(t.titel)}</b><small>${esc(t.kurz)}</small></div><span class="fuchs-lern-los">Lernen ▶</span></div>`).join('')}</div>`;
    } catch (e) { return ''; }
  }

  return { startPruefung, tagesImpuls, tagesStart, homeKarteHtml, partieGespielt, partieBeendetHinweis, kommentarHtml, kommentarNeu, empfohlenerTrick, zeigeVorstellung,
    leisteHtml, hilfe, alleinUmschalten, hinweisFelder, setRender, setModus, zugGemacht, spielEnde, lernKarteHtml, rueckblickHtml, rueckblickAntwort, rueckblickWeiter, ideen };
})();
