// Die Fuchs-Akademie (19.10.2026): Max soll Schach MOEGEN und Lust bekommen, gegen Papa zu spielen
// und Neues auszuprobieren - kein Pauken. Er lernt kleine "Geheimtricks" (je 3-5 Minuten):
// 1) Zuschauen (der Fuchs zeigt den Trick Zug fuer Zug), 2) Selber nachmachen, 3) MISSION: den Trick
// gegen Papa ausprobieren - waehrend der Partie liegt sein Plan als Merkzettel auf dem Bildschirm
// ("so merkt er sich, wie er es gegen Papa versuchen soll"), danach erzaehlt er, wie es lief.
// Papa sieht in der Eltern-App, welchen Trick Max gerade probiert (und kann ihn "reinlaufen" lassen).
// Die Uebungen selbst (Zugfolgen, Taktik-Raetsel, Grundmatt) sind die vorhandenen Module; sie melden
// ihr Ende ueber SchachWeg.uebernehmeErgebnis(), wenn sie als Trick gestartet wurden.
const SchachWeg = (function () {
  const TRICKS = [
    { id: 'blitz', emoji: '⚡', titel: 'Der Blitz-Angriff', kurz: 'Matt in nur 4 Zügen', farbe: '#ffb43a', demo: 'blitz', minuten: 3,
      geschichte: 'Psst, Max! Papa denkt oft: „Der Kleine kann doch noch nichts.“ Mit dem Blitz-Angriff überraschst du ihn: Schachmatt in nur 4 Zügen! Er klappt nicht immer – aber wenn Papa nicht aufpasst, hast du gewonnen, bevor er merkt, was passiert.',
      plan: ['Bauer nach e4', 'Läufer nach c4 – er zielt auf f7', 'Dame nach h5 – jetzt zielt auch sie auf f7', 'Dame schlägt f7: Schachmatt!'],
      wenn: 'Wehrt sich Papa (zum Beispiel mit g6)? Kein Problem: Dame zurückziehen, Springer entwickeln und normal weiterspielen. Du hast nichts verloren!',
      mission: 'Probiere den Blitz-Angriff in einer Partie gegen Papa. Vielleicht merkt er es nicht!',
      tipp: 'Zwei Angreifer (Läufer und Dame) gegen einen Verteidiger – so funktioniert der Trick.' },
    { id: 'legal', emoji: '🎭', titel: 'Die Dame-Opfer-Falle', kurz: 'Opfere die Dame – und gewinne', farbe: '#ff7a59', demo: 'legal', minuten: 4,
      geschichte: 'Das ist der Lieblings-Trick der Schachfüchse: Du gibst deine Dame her – mit Absicht! Papa freut sich, nimmt sie – und bekommt zwei Züge später Schachmatt. Er muss nur einmal nicht aufpassen.',
      plan: ['Springer nach f3 und Läufer nach c4', 'Wenn Papa deinen Springer fesselt: Springer schlägt e5!', 'Papa nimmt die Dame – dann Läufer schlägt f7 mit Schach', 'Springer nach d5: Schachmatt!'],
      wenn: 'Nimmt Papa die Dame nicht? Dann hast du einen Bauern gewonnen und stehst gut da. Probieren lohnt sich!',
      mission: 'Spiele e4, Sf3, Lc4, Sc3 und hoffe, dass Papa mit Lg4 deinen Springer fesselt.',
      tipp: 'Die Falle klappt nur, wenn Papa seinen Läufer auf g4 gestellt hat. Warte auf diesen Moment!' },
    { id: 'schutz', emoji: '🛡️', titel: 'Der Schutzschild', kurz: 'Papas Schäfermatt abwehren', farbe: '#4aa3ff', demo: 'scholar', minuten: 3,
      geschichte: 'Auch Papa kennt Tricks! Holt er früh die Dame heraus, will er dich mit dem Schäfermatt überlisten. Mit dem Schutzschild passiert dir das nie – und du stehst danach sogar besser da.',
      plan: ['Auf e4 antwortest du mit e5', 'Papa holt die Dame raus? Springer nach c6', 'Wenn Papa auf f7 zielt: g6! – das jagt die Dame weg', 'Dann in Ruhe weiterentwickeln'],
      wenn: 'Droht Matt auf f7? Dann ist g6 (oder Sf6) dein Retter. Prüfe jedes Mal, ob Papa auf f7 zielt!',
      mission: 'Wenn Papa früh die Dame herausholt, probiere den Schutzschild aus.',
      tipp: 'Das schwächste Feld am Anfang ist f7. Schau vor jedem Zug, ob Papa darauf zielt.' },
    { id: 'gabel', emoji: '🍴', titel: 'Die Gabel', kurz: 'Zwei Figuren auf einmal angreifen', farbe: '#34c98e', art: 'taktik', key: 'fork', min: 3, minuten: 4,
      fragen: [
        { q: 'Was ist eine Gabel?', o: ['Ein Zug, der zwei Figuren gleichzeitig angreift', 'Ein Zug, der zwei Bauern schlägt', 'Eine Rochade mit dem Turm'], e: 'Genau: Eine Figur bedroht zwei Ziele auf einmal.' },
        { q: 'Warum ist die Gabel so stark?', o: ['Papa kann nur eine der beiden Figuren retten', 'Papa darf danach nicht mehr ziehen', 'Die Figuren werden automatisch geschlagen'], e: 'Richtig: Er rettet eine – und du nimmst die andere.' },
        { q: 'Welche Figur ist ein echter Gabel-Meister?', o: ['Der Springer – er springt über andere Figuren', 'Der Bauer', 'Der König'], e: 'Der Springer! Er greift ganz anders an als alle anderen Figuren und wird oft übersehen.' }
      ],
      geschichte: 'Mit der Gabel greifst du zwei Figuren gleichzeitig an – Papa kann nur eine retten, die andere gehört dir! Springer sind echte Gabel-Meister.',
      plan: ['Suche einen Springer-Sprung, der zwei Figuren bedroht', 'Sind beide Ziele wertvoll oder ungeschützt?', 'Spring! Papa kann nur eine retten'],
      wenn: 'Siehst du keine Gabel? Dann entwickle deine Figuren weiter – die Gelegenheit kommt von allein.',
      mission: 'Halte in deiner Partie gegen Papa Ausschau nach einer Gabel – vor allem mit dem Springer.',
      tipp: 'Springer-Gabel: Der Springer springt auf ein Feld, von dem aus er zwei Figuren gleichzeitig angreift.' },
    { id: 'fessel', emoji: '🔗', titel: 'Die Fessel', kurz: 'Eine Figur festhalten', farbe: '#b57bff', art: 'taktik', key: 'pin', min: 3, minuten: 4,
      fragen: [
        { q: 'Was ist eine Fesselung?', o: ['Eine Figur darf nicht wegziehen, weil dahinter der König oder etwas Wertvolles steht', 'Eine Figur wird eingesperrt', 'Man nimmt dem Gegner die Dame'], e: 'Genau: Zieht die gefesselte Figur weg, wäre der König im Schach (oder etwas Wertvolles weg).' },
        { q: 'Eine Figur steht direkt vor ihrem König auf einer Linie, die dein Läufer angreift. Darf sie wegziehen?', o: ['Nein – sonst stünde der König im Schach', 'Ja, immer', 'Nur wenn es eine Dame ist'], e: 'Nein! Ein König darf nie im Schach stehen – die Figur ist gefesselt.' },
        { q: 'Welche Figuren können fesseln?', o: ['Läufer, Turm und Dame – sie ziehen über lange Linien', 'Nur Bauern', 'Nur der Springer'], e: 'Läufer, Turm und Dame: Sie greifen über die ganze Linie an.' }
      ],
      geschichte: 'Steht eine von Papas Figuren genau vor seinem König, darf sie sich nicht bewegen – sie ist gefesselt! Das nutzt du aus und greifst sie an.',
      plan: ['Finde eine Figur, hinter der der König (oder die Dame) steht', 'Greife sie an – sie kann nicht wegziehen', 'Hole dir die Figur oder zwinge Papa zu einem Fehler'],
      wenn: 'Keine Fessel in Sicht? Dann bleib wachsam – sie taucht oft nach ein paar Zügen auf.',
      mission: 'Schau in deiner Partie, ob eine von Papas Figuren vor seinem König steht – und fessle sie!',
      tipp: 'Schau auf die Linien: Hinter welcher Figur steht der König oder etwas Wertvolles?' },
    { id: 'rochade', emoji: '🏰', titel: 'Der Rochade-Schutzschild', kurz: 'König in Sicherheit bringen', farbe: '#7d89b8', demo: 'rochade', vorher: 'rochade', minuten: 6,
      geschichte: 'Ein Schachfuchs lässt seinen König nie in der Mitte stehen! Mit der Rochade verschwindet er hinter seinen Bauern – und Papas Tricks gehen ins Leere.',
      plan: ['Zuerst Springer und Läufer entwickeln', 'Dann rochieren: König nach g1, Turm nach f1', 'Danach in Ruhe angreifen'],
      wenn: 'Steht eine Figur zwischen König und Turm, geht die Rochade nicht. Entwickle zuerst die Figuren!',
      mission: 'Rochiere in deiner Partie gegen Papa so früh wie möglich – am besten in den ersten 8 Zügen.',
      tipp: 'Rochade geht nur, wenn zwischen König und Turm alles frei ist und der König nicht im Schach steht.' },
    { id: 'mattjaeger', emoji: '🎯', titel: 'Der Mattjäger', kurz: 'Matt in einem Zug finden', farbe: '#ff7a59', art: 'uebung', key: 'matt', min: 3, minuten: 4,
      fragen: [
        { q: 'Wann ist es Schachmatt?', o: ['Der König steht im Schach und kann nicht entkommen', 'Der König hat keine Figuren mehr', 'Die Dame wurde geschlagen'], e: 'Matt = Schach + keine Rettung. Dann hast du gewonnen!' },
        { q: 'Wie kann Papa ein Schach beenden?', o: ['Ausweichen, den Angreifer schlagen oder dazwischenziehen', 'Er darf einfach weiterspielen', 'Er gibt dem Schach einen Namen'], e: 'Drei Möglichkeiten: ausweichen, schlagen, dazwischenstellen. Wenn keine geht, ist es matt!' },
        { q: 'Der König steht NICHT im Schach, hat aber keinen erlaubten Zug. Was ist das?', o: ['Patt – unentschieden', 'Matt – du gewinnst', 'Der König darf pausieren'], e: 'Patt! Das ist unentschieden. Pass auf, dass dir das nicht aus Versehen passiert.' }
      ],
      geschichte: 'Ein echter Mattjäger sieht sofort: Hier kann ich den König mattsetzen! Das trainierst du jetzt – und in der Partie gegen Papa erkennst du die Gelegenheit blitzschnell.',
      plan: ['Schau, wo Papas König steht', 'Suche einen Zug mit Schach', 'Prüfe: Kann der König ausweichen oder die Figur schlagen? Wenn nicht – Matt!'],
      wenn: 'Siehst du kein Matt? Dann suche ein Schach, das Papa Platz wegnimmt – das bereitet es vor.',
      mission: 'Prüfe vor JEDEM Zug gegen Papa: Gibt es ein Schach, das matt ist?',
      tipp: 'Matt = Schach + der König kann nirgends hin + keiner kann den Angreifer schlagen.' },
    { id: 'wachhund', emoji: '🐕', titel: 'Der Wachhund', kurz: 'Nie eine Figur verschenken', farbe: '#34c98e', art: 'uebung', key: 'haengt', min: 3, minuten: 4,
      fragen: [
        { q: 'Wie viele Punkte ist eine Dame wert?', o: ['9', '3', '1'], e: '9! Bauer 1 · Springer und Läufer 3 · Turm 5 · Dame 9.' },
        { q: 'Dein Springer wird von einem Bauern angegriffen. Lässt du ihn stehen?', o: ['Nein – Bauer (1) gegen Springer (3) wäre ein schlechter Tausch', 'Ja, Springer sind stark', 'Das ist egal'], e: 'Nicht stehen lassen! Du würdest 3 Punkte für 1 hergeben.' },
        { q: 'Was fragt sich ein guter Wachhund vor jedem Zug?', o: ['Kann Papa danach etwas von mir schlagen?', 'Wie spät ist es?', 'Welche Farbe hat sein Springer?'], e: 'Genau! Diese eine Frage verhindert die meisten Fehler.' }
      ],
      geschichte: 'Auch Füchse brauchen einen Wachhund! Er passt auf, dass keine deiner Figuren ungeschützt herumsteht. Wer das kann, macht kaum noch Fehler – und das ist die beste Art, Papa zu schlagen.',
      plan: ['Vor jedem Zug fragen: Kann Papa etwas von mir schlagen?', 'Ist die Figur geschützt oder weglaufen?', 'Wert merken: Bauer 1 · Springer/Läufer 3 · Turm 5 · Dame 9'],
      wenn: 'Unsicher, ob etwas hängt? Zähle Angreifer und Beschützer – bei mehr Angreifern wird es gefährlich.',
      mission: 'Spiele eine Partie gegen Papa, in der du keine einzige Figur einfach verschenkst!',
      tipp: 'Schau auf JEDE deiner Figuren: Steht sie ungeschützt und wird angegriffen?' },
    { id: 'sackzu', emoji: '👑', titel: 'Sack zu!', kurz: 'Mit Dame und König mattsetzen', farbe: '#ffcb6b', art: 'grundmatt', key: 'dame', minuten: 5,
      fragen: [
        { q: 'Was musst du dem König beim Mattsetzen bis zum letzten Zug lassen?', o: ['Mindestens ein Fluchtfeld – sonst ist es Patt', 'Gar kein Feld', 'Alle Felder'], e: 'Ein Fluchtfeld! Nimmst du ihm alle weg, ohne Schach zu geben, ist es Patt – unentschieden.' },
        { q: 'Wo steht deine Dame am besten, um den König einzusperren?', o: ['Einen Springersprung vom König entfernt', 'Direkt neben dem König', 'Ganz weit weg'], e: 'Einen Springersprung entfernt – so kann der König sie nicht schlagen und bleibt eingesperrt.' },
        { q: 'Wer hilft deiner Dame beim letzten Zug?', o: ['Dein eigener König', 'Ein Bauer', 'Dein Läufer'], e: 'Dein König! Er schützt die Dame, die matt gibt.' }
      ],
      geschichte: 'Du bist im Vorteil – aber wie machst du den Sack zu? Mit König und Dame kannst du Papas König immer mattsetzen. Der Fuchs zeigt dir, wie du ihn Schritt für Schritt an den Rand drängst.',
      plan: ['Dame einen Springer-Sprung entfernt vom König halten', 'Den König Schritt für Schritt an den Rand drängen', 'Eigenen König zu Hilfe holen – und Vorsicht vor Patt!'],
      wenn: 'Ist plötzlich Patt (kein Zug mehr, aber kein Schach)? Dann hast du dem König zu wenig Platz gelassen. Nochmal von vorn!',
      mission: 'Hast du in einer Partie gegen Papa Dame und König übrig? Dann mach den Sack zu!',
      tipp: 'Lass dem Gegner bis zum letzten Zug ein Fluchtfeld – sonst ist es Patt.' }
  ];

  const ERGEBNISSE = {
    geklappt: { emoji: '🎉', text: 'Hat geklappt!', sterne: 30, antwort: 'Wahnsinn! Du hast Papa mit einem Geheimtrick geschlagen!' },
    fast: { emoji: '🤏', text: 'Fast!', sterne: 15, antwort: 'Fast geschafft – das nächste Mal klappt es! Du hast es immerhin ausprobiert.' },
    gemerkt: { emoji: '😅', text: 'Papa hat es gemerkt', sterne: 15, antwort: 'Papa ist ein alter Fuchs. Aber du hast es ausprobiert – und das nächste Mal überlistest du ihn!' },
    nicht: { emoji: '⏭', text: 'Keine Gelegenheit', sterne: 0, antwort: 'Kein Problem. Der Trick bleibt dir erhalten – probiere ihn beim nächsten Mal.' }
  };

  const api = { laufend: null };

  function w() { return Storage.getSchachWeg(); }
  function erledigt() { return w().erledigt; }
  function missionen() { if (!w().mission) w().mission = {}; return w().mission; }
  function trick(id) { return TRICKS.find(t => t.id === id); }
  function aktiverTrick() { const id = w().aktivId; return id ? trick(id) : null; }
  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function anzahlGelernt() { return TRICKS.filter(t => erledigt()[t.id]).length; }
  function anzahlGeklappt() { return TRICKS.filter(t => (missionen()[t.id] || {}).ergebnis === 'geklappt').length; }

  api.fortschrittText = function () {
    const n = anzahlGelernt();
    if (anzahlGeklappt() === TRICKS.length) return '🏆 Papa-Bezwinger!';
    return n === 0 ? 'Geheimtricks gegen Papa' : `${n} von ${TRICKS.length} Tricks gelernt`;
  };

  function fuchs(text) { return `<div class="weg-trainer"><div class="weg-fuchs">🦊</div><div class="weg-blase">${text}</div></div>`; }

  function statusBadge(t) {
    const m = missionen()[t.id];
    if (m && m.ergebnis === 'geklappt') return '<span class="trick-badge trick-badge-top">🏆 Geklappt!</span>';
    if (m && m.ergebnis) return '<span class="trick-badge trick-badge-gut">⭐ Probiert</span>';
    if (w().aktivId === t.id) return '<span class="trick-badge trick-badge-aktiv">🎯 Mission läuft</span>';
    if (erledigt()[t.id]) return '<span class="trick-badge trick-badge-gut">✓ Gelernt</span>';
    return '<span class="trick-badge">Neu</span>';
  }

  /** Karte "Mein Plan" waehrend einer Partie (aufklappbar) bzw. "Wie lief's?" nach der Partie. */
  api.planKarteHtml = function (spielVorbei) {
    const t = aktiverTrick();
    if (!t) return '';
    if (spielVorbei) {
      return `<div class="plan-karte plan-karte-ende"><div class="plan-titel">${t.emoji} Wie lief dein Trick „${esc(t.titel)}“?</div>
        <div class="plan-ergebnisse">${Object.entries(ERGEBNISSE).map(([k, e]) => `<span class="plan-erg" onclick="SchachWeg.meldeMission('${k}')"><b>${e.emoji}</b>${e.text}</span>`).join('')}</div></div>`;
    }
    return `<div class="plan-karte" onclick="this.classList.toggle('offen')">
      <div class="plan-titel">🦊 Mein Plan: ${t.emoji} ${esc(t.titel)} <span class="plan-pfeil">antippen</span></div>
      <div class="plan-inhalt"><ol>${t.plan.map(p => `<li>${esc(p)}</li>`).join('')}</ol><div class="plan-wenn">💡 ${esc(t.wenn)}</div></div></div>`;
  };

  // ---------------- Hub ----------------
  api.renderHub = function () {
    api.laufend = null;
    const aktiv = aktiverTrick();
    const n = anzahlGelernt();
    let gruss;
    if (aktiv) gruss = `<b>Viel Glück!</b> Du willst heute den ${aktiv.emoji} <b>${esc(aktiv.titel)}</b> gegen Papa probieren. Tippe auf „Gegen Papa spielen“ – dein Plan liegt dann auf dem Bildschirm.`;
    else if (n === 0) gruss = '<b>Hallo Max!</b> Ich bin der Fuchs und dein Schach-Trainer. Ich zeige dir <b>geheime Tricks</b>, mit denen du <b>Papa überraschen</b> kannst. Such dir einen aus – und dann probierst du ihn gegen Papa aus!';
    else gruss = `<b>Super!</b> Du kennst schon ${n} ${n === 1 ? 'Trick' : 'Tricks'}. Such dir den nächsten aus – oder probiere einen gegen Papa aus!`;

    const karten = TRICKS.map(t => `
      <div class="trick-karte" style="--tfarbe:${t.farbe}" onclick="SchachWeg.zeigeTrick('${t.id}')">
        <div class="trick-emoji">${t.emoji}</div>
        <div class="trick-name">${esc(t.titel)}</div>
        <div class="trick-kurz">${esc(t.kurz)}</div>
        ${statusBadge(t)}
      </div>`).join('');
    const album = TRICKS.map(t => {
      const m = missionen()[t.id] || {};
      const klasse = m.ergebnis === 'geklappt' ? 'album-gold' : erledigt()[t.id] ? 'album-an' : '';
      return `<span class="album-sticker ${klasse}" title="${esc(t.titel)}">${t.emoji}</span>`;
    }).join('');

    let offen = '';
    if (aktiv) {
      offen = `<div class="plan-karte plan-karte-ende"><div class="plan-titel">${aktiv.emoji} Wie lief dein Trick „${esc(aktiv.titel)}“?</div>
        <div class="plan-ergebnisse">${Object.entries(ERGEBNISSE).map(([k, e]) => `<span class="plan-erg" onclick="SchachWeg.meldeMission('${k}')"><b>${e.emoji}</b>${e.text}</span>`).join('')}</div></div>`;
    }
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.renderSpieleMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="weg-titel">Die Fuchs-Akademie</div>
        <div class="weg-untertitel">So schlägst du Papa</div>
        ${fuchs(gruss)}
        <div class="weg-fuchs-spielen" onclick="Schach.starteGegenFuchs()">
          <span class="weg-fuchs-spielen-emoji">🦊</span>
          <div><b>Gegen den Fuchs spielen</b><small>Zum Üben – der Fuchs hilft dir mit Tipps, so oft du willst</small></div>
          <span class="weg-fuchs-spielen-los">Los ▶</span>
        </div>
        <div class="weg-weiter" onclick="SchachOnline.starteAnsicht()">
          <div class="weg-weiter-label">${aktiv ? 'Deine Mission wartet' : 'Bereit?'}</div>
          <div class="weg-weiter-titel">Gegen Papa spielen</div>
          <div class="weg-weiter-meta">${aktiv ? `Dein Plan: ${aktiv.emoji} ${esc(aktiv.titel)}` : 'Probiere einen Trick aus – oder spiel einfach drauflos!'}</div>
          <div class="weg-weiter-knopf">Los geht's ▶</div>
        </div>
        ${offen}
        <div class="weg-abschnitt">Geheimtricks <span>(tippe einen an)</span></div>
        <div class="trick-raster">${karten}</div>
        <div class="weg-abschnitt">Mein Sticker-Album <span>${anzahlGelernt()}/${TRICKS.length} gelernt · ${anzahlGeklappt()} geklappt</span></div>
        <div class="album">${album}</div>
        <div class="weg-unten">
          <div class="weg-unten-knopf" onclick="Schach.renderStufenwahl()"><span>🪜</span>Fuchs-Stufe wählen</div>
          <div class="weg-unten-knopf" onclick="SchachEroeffnung.renderMenu()"><span>📖</span>Meine Eröffnungen</div>
          <div class="weg-unten-knopf" onclick="Schach.renderFreiesTraining()"><span>🧩</span>Mehr Training</div>
        </div>
      </div>
    `);
  };

  // ---------------- Trick: Vorstellung ----------------
  api.zeigeTrick = function (id) {
    const t = trick(id);
    if (!t) return;
    const gelernt = !!erledigt()[id];
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="SchachWeg.renderHub()">${Icons.svg('zurueck')} Zur Akademie</span></div>
      <div class="weg-wrap buehne-marker">
        <div class="trick-gross" style="--tfarbe:${t.farbe}">${t.emoji}</div>
        <div class="weg-titel">${esc(t.titel)}</div>
        ${fuchs(esc(t.geschichte))}
        <div class="weg-karte-info">
          <div class="weg-info-zeile"><span>🗺️</span><div><b>Dein Plan:</b><ol class="weg-liste weg-liste-nr">${t.plan.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div></div>
          <div class="weg-info-zeile"><span>💡</span><div><b>Wenn Papa sich wehrt:</b> ${esc(t.wenn)}</div></div>
          ${t.vorher === 'rochade' ? '<div class="weg-info-zeile"><span>📖</span><div><b>Erst die Rochade:</b> Der Fuchs erklärt dir, wie sie funktioniert – und du probierst sie selbst aus.</div></div>' : ''}
          <div class="weg-info-zeile"><span>⏱</span><div>Dauert etwa ${t.minuten} Minuten.</div></div>
        </div>
        <div class="weg-ergebnis-knoepfe">
          <div class="weg-weiter-knopf weg-start" onclick="SchachWeg.starte('${t.id}')">${gelernt ? 'Nochmal lernen ▶' : (t.vorher === 'rochade' ? 'Rochade lernen ▶' : 'Trick lernen ▶')}</div>
          ${gelernt ? `<div class="weg-unten-knopf" onclick="SchachWeg.zeigeMission('${t.id}')">🎯 Gegen Papa ausprobieren</div>` : ''}
        </div>
      </div>
    `);
  };

  // Wissensfragen vor den Raetseln sind AUS (Uli 19.10.2026: "ohne das mit dem Quiz") - Code bleibt fuer spaeter.
  const FRAGENRUNDEN = false;

  // Wissensstand (Fragen, die Max gleich richtig beantwortet hat) fuer die Meldung an Papa
  let wissen = { gesamt: 0, richtig: 0 };
  function wissenAdd(info) { if (info && info.gesamt) { wissen.gesamt += info.gesamt; wissen.richtig += info.richtig || 0; } }

  api.starte = function (id) {
    const t = trick(id);
    if (!t) return;
    wissen = { gesamt: 0, richtig: 0 };
    api.laufend = { station: { id: t.id, art: t.art || 'eroeffnung', key: t.key || t.id, titel: t.titel, tipp: t.tipp, min: t.min } };
    // Zuerst Vorwissen: Rochade-Schule (Regeln + Ausprobieren) bzw. Wissensfragen zum Trick
    if (t.vorher === 'rochade') {
      SchachLehre.rochadeSchule(info => { wissenAdd(info); api.starteUebung(id); });
      return;
    }
    if (t.fragen && FRAGENRUNDEN) {
      SchachLehre.fragenRunde(t.fragen, info => { wissenAdd(info); api.starteUebung(id); }, 'Der Fuchs fragt', 'Bevor wir loslegen, schauen wir, was du schon weißt. Antworte so gut du kannst – ich erkläre dir alles!');
      return;
    }
    api.starteUebung(id);
  };

  api.starteUebung = function (id) {
    const t = trick(id);
    if (!t) return;
    if (t.demo) {
      SchachEroeffnung.starte(t.demo, 'zuschauen', true, () => {
        App.render(`
          <div class="weg-wrap buehne-marker"><div class="weg-ergebnis">
            <div class="weg-ergebnis-emoji">${t.emoji}</div><div class="weg-titel">Jetzt bist du dran!</div>
            ${fuchs('Spiele den Trick selbst nach. Die Züge sind <b>grün markiert</b> – du brauchst nur zu tippen.')}
            <div class="weg-ergebnis-knoepfe"><div class="weg-weiter-knopf" onclick="SchachWeg.nachmachen('${t.id}')">Los ▶</div></div>
          </div></div>`);
      });
      return;
    }
    if (t.art === 'taktik') SchachTaktik.starteSession(t.key, 5);
    else if (t.art === 'uebung') SchachLektionen.starteUebungMit(t.key, 5);
    else if (t.art === 'grundmatt') Strategie.starteGrundmatt(t.key);
  };

  api.nachmachen = function (id) {
    const t = trick(id);
    api.laufend = { station: { id: t.id, art: 'eroeffnung', key: t.id, titel: t.titel } };
    SchachEroeffnung.starte(t.demo, 'lernen', true, (phase, info) => { wissenAdd(info); api.trickGelernt(id); });
  };

  function markiereGelernt(t) {
    const erstes = !erledigt()[t.id];
    if (erstes) {
      Storage.meldeSchachWegErledigt(t.id, { fragen: wissen.gesamt, fragenRichtig: wissen.richtig });
      Storage.addSterne(15);
      App.updateTopbar();
      const wissenText = wissen.gesamt ? `Wissensfragen: ${wissen.richtig} von ${wissen.gesamt} gleich richtig` : 'gelernt';
      try { FernSync.meldeLernsetErledigt('Schach-Trick gelernt: ' + t.titel, wissenText, 15, 'schach'); } catch (e) { /* optional */ }
    }
    return erstes;
  }

  api.trickGelernt = function (id) {
    const t = trick(id);
    const erstes = markiereGelernt(t);
    api.zeigeMission(id, erstes);
  };

  /** Mission: den Trick gegen Papa ausprobieren (Plan wird zum Merkzettel in der Partie). */
  api.zeigeMission = function (id, neu) {
    const t = trick(id);
    api.laufend = null;
    App.render(`
      <div class="weg-wrap buehne-marker"><div class="weg-ergebnis weg-ergebnis-gut">
        <div class="weg-ergebnis-emoji">${neu ? '🏆' : '🎯'}</div>
        <div class="weg-titel">${neu ? 'Trick gelernt! +15 ⭐' : 'Mission: ausprobieren!'}</div>
        ${fuchs(`Jetzt kommt das Beste: <b>Probier den Trick „${esc(t.titel)}“ gegen Papa aus!</b> ${esc(t.mission || '')}`)}
        <div class="weg-karte-info"><div class="weg-info-zeile"><span>🗺️</span><div><b>Dein Plan:</b><ol class="weg-liste weg-liste-nr">${t.plan.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div></div></div>
        <div class="weg-ergebnis-knoepfe">
          <div class="weg-weiter-knopf" onclick="SchachWeg.startMission('${t.id}','papa')">Gegen Papa spielen ▶</div>
          <div class="weg-unten-knopf" onclick="SchachWeg.startMission('${t.id}','computer')">Erst gegen den Fuchs üben</div>
          <div class="weg-unten-knopf" onclick="SchachWeg.renderHub()">Später</div>
        </div>
      </div></div>`);
  };

  api.startMission = function (id, wo) {
    const t = trick(id);
    w().aktivId = id;
    missionen()[id] = Object.assign({}, missionen()[id], { status: 'aktiv', ts: Date.now() });
    Storage.speichereSchachWeg();
    try { FernSync.meldeSchachPlan({ id: t.id, emoji: t.emoji, titel: t.titel, plan: t.plan, wenn: t.wenn }); } catch (e) { /* optional */ }
    if (wo === 'papa') SchachOnline.starteAnsicht(); else Schach.renderStufenwahl();
  };

  api.meldeMission = function (ergebnisKey) {
    const t = aktiverTrick();
    const e = ERGEBNISSE[ergebnisKey];
    if (!t || !e) return;
    missionen()[t.id] = { status: 'fertig', ergebnis: ergebnisKey, ts: Date.now() };
    w().aktivId = null;
    Storage.speichereSchachWeg();
    if (e.sterne) { Storage.addSterne(e.sterne); App.updateTopbar(); }
    try { FernSync.meldeSchachPlan(null); } catch (x) { /* optional */ }
    try { FernSync.meldeLernsetErledigt('Schach-Trick gegen Papa: ' + t.titel, `${e.emoji} ${e.text}`, e.sterne, 'schach'); } catch (x) { /* optional */ }
    App.render(`
      <div class="weg-wrap buehne-marker"><div class="weg-ergebnis ${ergebnisKey === 'geklappt' ? 'weg-ergebnis-gut' : ''}">
        <div class="weg-ergebnis-emoji">${e.emoji}</div>
        <div class="weg-titel">${esc(e.text)}${e.sterne ? ` +${e.sterne} ⭐` : ''}</div>
        ${fuchs(esc(e.antwort))}
        <div class="weg-ergebnis-knoepfe">
          <div class="weg-weiter-knopf" onclick="SchachWeg.renderHub()">Weiter zur Akademie ▶</div>
          <div class="weg-unten-knopf" onclick="SchachOnline.starteAnsicht()">Noch eine Partie gegen Papa</div>
        </div>
      </div></div>`);
  };

  // ---------------- Rueckmeldung der Uebungen (Taktik, Grundmatt) ----------------
  /** Von den Uebungen aufgerufen, wenn sie fertig sind. true = die Akademie zeigt das Ergebnis selbst. */
  api.uebernehmeErgebnis = function (art, key, richtig, gesamt, sterne, opts) {
    const l = api.laufend;
    if (!l || l.station.art !== art || String(l.station.key) !== String(key)) return false;
    const t = trick(l.station.id);
    if (!t) return false;
    if (art === 'eroeffnung') return false; // laeuft ueber die Callbacks oben
    const bestanden = t.min ? richtig >= t.min : true;
    if (bestanden) {
      const erstes = markiereGelernt(t);
      api.zeigeMission(t.id, erstes);
    } else {
      App.render(`
        <div class="weg-wrap buehne-marker"><div class="weg-ergebnis">
          <div class="weg-ergebnis-emoji">💪</div><div class="weg-titel">Fast geschafft!</div>
          ${fuchs(`${richtig} von ${gesamt} richtig – du brauchst ${t.min}. Lies den Tipp und versuch es gleich nochmal, du schaffst das!`)}
          <div class="weg-ergebnis-knoepfe">
            <div class="weg-weiter-knopf" onclick="SchachWeg.starte('${t.id}')">Nochmal versuchen ▶</div>
            <div class="weg-unten-knopf" onclick="SchachWeg.renderHub()">Zur Akademie</div>
          </div></div></div>`);
    }
    return true;
  };

  /** "Tipp vom Fuchs" fuer Uebungsbildschirme, solange ein Trick laeuft (aufklappbar). */
  api.tippHtml = function () {
    if (!api.laufend || !api.laufend.station.tipp) return '';
    return `<div class="weg-tipp" onclick="this.classList.toggle('offen')"><div class="weg-tipp-titel">🦊 Tipp vom Fuchs – antippen</div><div class="weg-tipp-text">${esc(api.laufend.station.tipp)}</div></div>`;
  };

  api.TRICKS = TRICKS;
  return api;
})();
