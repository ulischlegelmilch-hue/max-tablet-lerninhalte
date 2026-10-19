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
      Hinweise.zeigePopup('🦊', 'Fuchs fragt', text, [
        { text: 'Los, gegen Papa! ▶', primaer: true, aktion: () => tagesStart() },
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
        <span class="fuchs-karte-text"><b>Spielst du heute gegen Papa?</b><small>${vonPapa ? 'Papa empfiehlt' : 'Dein Trick'}: ${trick.emoji} ${esc(trick.titel)}${serie >= 1 ? ` · 🔥 ${serie}` : ''}</small></span><span class="fuchs-karte-los">Los ▶</span></div>`;
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
  // Der Fuchs HILFT nicht beim Denken (keine Warnungen vor Papas Drohungen, keine Tipps, keine
  // Hinweise auf freie Figuren) - Max soll selbst nachdenken (Uli 19.10.2026). Er BEWERTET nur den
  // Zug, den Max gerade gemacht hat: Lob, "Vorsicht" bei einer hängenden Figur, "verpasst" bei einer
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
      if (ichHabeGezogen) kBewertung = bewerteZug(kZustandVorher, zustand, meine, status);
      kText = kBewertung; // nach Papas Antwort bleibt die Bewertung von Max' letztem Zug sichtbar
      return kText;
    } catch (e) { return null; }
  }

  function kommentarHtml(zustand, meine, zugNr, status) {
    const k = berechne(zustand, meine, zugNr, status);
    if (!k) return '';
    return `<div class="fuchs-kommentar fuchs-${k.art}"><span class="fuchs-kommentar-emoji">🦊</span><div><b>${esc(k.titel)} – dein letzter Zug:</b> ${esc(k.text)}</div></div>`;
  }

  function kommentarNeu() { kKey = null; kText = null; kZustandVorher = null; kZustandAktuell = null; kBewertung = null; }

  return { startPruefung, tagesImpuls, tagesStart, homeKarteHtml, partieGespielt, partieBeendetHinweis, kommentarHtml, kommentarNeu, empfohlenerTrick, zeigeVorstellung };
})();
