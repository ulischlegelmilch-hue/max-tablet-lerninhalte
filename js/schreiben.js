// Schreibauftrag des Tages (11.10.2026, Uli-Wunsch: "Max soll auch animiert werden zu
// schreiben") - ein Punkt im Ferientraining. Montag-Freitag ein Auftrag zum Schulstoff
// (Faelle, zusammengesetzte Adjektive, doppelte Mitlaute), am Wochenende ein freier.
// Max schreibt AUF PAPIER ins Heft (Uli 15.10.2026: nicht auf dem Tablet) und tippt "Fertig"
// (Sterne!). Eine Texteingabe am Tablet gibt es bewusst nicht.
const Schreiben = (function () {
  const STOFF = [
    'Schreibe 3 Sätze über einen Wolf. Verwende: „das Fell des Wolfes“, „der Wolf lebt“ und „dem Wolf“.',
    'Schreibe 3 Sätze über einen Hund. Im 1. Satz steht „der Hund“, im 2. „dem Hund“, im 3. „den Hund“.',
    'Schreibe 3 Sätze über dein Lieblingstier. Benutze den Genitiv: „das Fell des …“, „die Ohren des …“.',
    'Finde 5 zusammengesetzte Adjektive (zum Beispiel grasgrün) und schreibe zu jedem einen Satz.',
    'Erkläre 3 zusammengesetzte Adjektive wie im Buch: feuerrot = rot wie das Feuer. Schreibe sie auf.',
    'Schreibe 5 Wörter mit doppeltem Mitlaut auf (zum Beispiel Koffer) und bilde mit jedem einen Satz.',
    'Schreibe 4 Sätze über Tiere im Wald. Unterstreiche den Dativ grün und den Akkusativ lila.',
    'Schreibe einen kurzen Text über deinen Tag. Unterstreiche alle Nomen im Nominativ blau.',
    'Schreibe 3 Fragen mit „Wem?“ oder „Wen oder was?“ und beantworte sie in ganzen Sätzen.',
    'Denke dir 4 neue zusammengesetzte Adjektive aus (zum Beispiel zuckersüß) und erkläre sie.'
  ];
  const FREI = [
    'Schreibe einen Tagebucheintrag: Was war heute das Schönste?',
    'Schreibe eine Postkarte an Oma oder Opa aus den Ferien.',
    'Erfinde eine kurze Geschichte über einen sprechenden Hund.',
    'Schreibe auf, was du in den Ferien noch erleben möchtest (5 Sätze).',
    'Beschreibe dein Lieblingsspiel so genau, dass jemand es nachspielen kann.',
    'Schreibe einen persönlichen Brief an einen Freund oder eine Freundin.'
  ];
  const ZIEL_ID = 'schreiben_tag';
  const STERNE = 10;

  function tagNummer() {
    const [j, m, t] = Storage.getHeutigesDatum().split('-').map(Number);
    return Math.floor(Date.UTC(j, m - 1, t) / 86400000);
  }

  /** Auftrag des Tages: Mo-Fr zum Stoff, Sa/So frei - ueber den Tag stabil, taeglich anders. */
  function auftragHeute() {
    const [j, m, t] = Storage.getHeutigesDatum().split('-').map(Number);
    const wochentag = new Date(j, m - 1, t).getDay(); // 0 = Sonntag
    const frei = wochentag === 0 || wochentag === 6;
    const liste = frei ? FREI : STOFF;
    return { text: liste[tagNummer() % liste.length], frei };
  }

  function kurzText() { return auftragHeute().text; }

  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render() {
    const a = auftragHeute();
    const fertig = Storage.getFerienErledigt(ZIEL_ID);
    App.setLastStarter(render);
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Ferientraining.renderListe()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Schreiben</div>
      <div class="schreib-karte">
        <div class="schreib-art">${a.frei ? 'Freier Schreibauftrag' : 'Schreibauftrag zum Stoff'}</div>
        <div class="schreib-auftrag">${esc(a.text)}</div>
      </div>
      ${fertig ? `
        <div class="schreib-fertig">✅ Geschafft! Heute hast du schon geschrieben. Super!</div>
        <div class="weiter-row"><span class="btn-primary" onclick="Ferientraining.renderListe()">Zurück zum Ferientraining</span></div>
      ` : `
        <div class="lese-text">Schreibe auf <strong>Papier</strong> ins Heft – mit der Hand, so schön du kannst. Wenn du fertig bist, tippe auf den Knopf. Dafür bekommst du ${STERNE} ⭐</div>
        <div class="weiter-row"><span class="btn-primary" onclick="Schreiben.fertig()">Ich habe es ins Heft geschrieben ✓</span></div>
      `}
    `);
  }

  function fertig() {
    if (Storage.getFerienErledigt(ZIEL_ID)) { render(); return; }
    const a = auftragHeute();
    Storage.addSterne(STERNE);
    App.updateTopbar();
    Ferientraining.melde(ZIEL_ID);
    Ferientraining.abschluss(ZIEL_ID);
    const kurz = a.text.length > 90 ? a.text.slice(0, 87) + '…' : a.text;
    FernSync.meldeLernsetErledigt('Schreibauftrag',
      'Im Heft geschrieben: ' + kurz, STERNE, 'deutsch');
    render();
  }

  return { render, fertig, kurzText, auftragHeute };
})();
