const Deutsch = (function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }

  function renderMenu() {
    App.render(App.subMenuHtml('Deutsch – was übst du?', [
      { icon: 'rechtschreibung', titel: 'Rechtschreibung', onclick: 'Deutsch.starteRechtschreibung()' },
      { icon: 'lesen', titel: 'Lesen & Verstehen', onclick: 'Deutsch.starteLesen()' }
    ]));
  }

  // Jede Aufgabe: Satz mit Lücke (___), Optionen, Index der richtigen Antwort
  const rechtschreibBank = [
    { satz: 'Ich glaube, ___ er heute kommt.', optionen: ['das', 'dass'], richtig: 1 },
    { satz: 'Das ist ___ Buch, das ich meine.', optionen: ['das', 'dass'], richtig: 0 },
    { satz: 'Der ___ bellt laut im Garten.', optionen: ['hund', 'Hund'], richtig: 1 },
    { satz: 'Wir gehen heute in die ___.', optionen: ['schule', 'Schule'], richtig: 1 },
    { satz: 'Die Straße ist sehr ___.', optionen: ['breit', 'braid'], richtig: 0 },
    { satz: 'Er isst einen ___ Apfel.', optionen: ['grosen', 'großen'], richtig: 1 },
    { satz: 'Sie ___ jeden Tag zur Schule.', optionen: ['läuft', 'laüft'], richtig: 0 },
    { satz: 'Der ___ fliegt hoch am Himmel.', optionen: ['Vogel', 'Fogel'], richtig: 0 },
    { satz: 'Wir haben ___ Kinder in der Klasse.', optionen: ['fiele', 'viele'], richtig: 1 },
    { satz: 'Das Wasser im See ist ___ kalt.', optionen: ['ziemlich', 'ziehmlich'], richtig: 0 },
    { satz: 'Die Katze sitzt auf dem ___.', optionen: ['Tisch', 'Disch'], richtig: 0 },
    { satz: 'Er hat ein neues ___ bekommen.', optionen: ['Fahrad', 'Fahrrad'], richtig: 1 },
    { satz: 'Im Winter ist es oft ___.', optionen: ['kalt', 'kald'], richtig: 0 },
    { satz: 'Die Sonne ___ am Morgen auf.', optionen: ['geht', 'geth'], richtig: 0 },
    { satz: 'Wir ___ heute im Garten.', optionen: ['spielen', 'spilen'], richtig: 0 },
    { satz: 'Das Kind ___ sehr müde.', optionen: ['ist', 'ihst'], richtig: 0 },
    { satz: 'Er kauft ein ___ Brot.', optionen: ['frisches', 'frischess'], richtig: 0 },
    { satz: 'Meine Schwester ___ gern Musik.', optionen: ['hört', 'hörd'], richtig: 0 },
    { satz: 'Der ___ ist heute sehr blau.', optionen: ['Himel', 'Himmel'], richtig: 1 },
    { satz: 'Sie ___ einen Brief an die Oma.', optionen: ['schreibt', 'schreipt'], richtig: 0 },
    { satz: 'Wir fahren mit dem ___ in den Urlaub.', optionen: ['Auto', 'Autoh'], richtig: 0 },
    { satz: 'Der Ball ist ganz ___.', optionen: ['rund', 'rundt'], richtig: 0 },
    { satz: 'Die Blume wächst im ___.', optionen: ['Garten', 'Gardten'], richtig: 0 },
    { satz: 'Ich habe ___ Hunger.', optionen: ['grosen', 'großen'], richtig: 1 },
    { satz: 'Er ___ das Fenster.', optionen: ['öffnet', 'öfnet'], richtig: 0 },
    { satz: 'Das Eis ___ in der Sonne.', optionen: ['schmilzt', 'schmiltzt'], richtig: 0 },
    { satz: 'Wir treffen ___ am Nachmittag.', optionen: ['uns', 'unss'], richtig: 0 },
    { satz: 'Die Vögel ___ im Frühling zurück.', optionen: ['kommen', 'komen'], richtig: 0 },
    { satz: 'Er trägt eine warme ___.', optionen: ['Jacke', 'Jake'], richtig: 0 },
    { satz: 'Das Baby ___ ganz friedlich.', optionen: ['schläft', 'schlaft'], richtig: 0 },
    { satz: 'Die Prüfung war ziemlich ___.', optionen: ['schwer', 'schwär'], richtig: 0 },
    { satz: 'Ich ___ mir die Zähne jeden Abend.', optionen: ['putze', 'putse'], richtig: 0 },
    { satz: 'Der Zug fährt ___ pünktlich ab.', optionen: ['imer', 'immer'], richtig: 1 },
    { satz: 'Wir ___ ein tolles Fußballspiel gesehen.', optionen: ['haben', 'habn'], richtig: 0 },
    { satz: 'Das ___ scheint heute den ganzen Tag.', optionen: ['Sonne', 'Sonne'], richtig: 0 }
  ];

  function genRechtschreibung(anzahl) {
    return pickN(rechtschreibBank, anzahl).map(item => ({
      typ: 'mc',
      frage: item.satz,
      optionen: item.optionen,
      richtigIndex: item.richtig
    }));
  }

  // Lesetexte mit je 2 Verständnisfragen
  const leseBank = [
    {
      text: 'Lena und ihr Bruder Paul gehen jeden Samstag mit ihrem Hund Rocko in den Park. Dort spielen sie mit einem Ball und Rocko rennt fröhlich hinterher. Danach kaufen sie sich ein Eis am Kiosk.',
      fragen: [
        { frage: 'Wie heißt der Hund?', optionen: ['Rocko', 'Bello', 'Max'], richtig: 0 },
        { frage: 'Was kaufen sie am Kiosk?', optionen: ['Ein Buch', 'Ein Eis', 'Einen Ball'], richtig: 1 }
      ]
    },
    {
      text: 'In der Schule hat die Klasse 3b ein Aquarium mit bunten Fischen. Jeden Montag darf ein Kind die Fische füttern. Diese Woche ist Mia an der Reihe. Sie freut sich sehr darüber.',
      fragen: [
        { frage: 'Was steht in der Klasse?', optionen: ['Ein Aquarium', 'Ein Käfig', 'Ein Terrarium'], richtig: 0 },
        { frage: 'Wer darf diese Woche füttern?', optionen: ['Paul', 'Mia', 'Lena'], richtig: 1 }
      ]
    },
    {
      text: 'Im Herbst fallen die Blätter von den Bäumen. Die Kinder sammeln bunte Blätter und Kastanien auf dem Schulweg. Aus den Kastanien basteln sie später lustige Figuren.',
      fragen: [
        { frage: 'In welcher Jahreszeit spielt die Geschichte?', optionen: ['Sommer', 'Herbst', 'Winter'], richtig: 1 },
        { frage: 'Was sammeln die Kinder außer Blättern?', optionen: ['Kastanien', 'Steine', 'Muscheln'], richtig: 0 }
      ]
    },
    {
      text: 'Am Wochenende fährt Familie Berger an den See. Der Vater grillt Würstchen, während die Kinder im Wasser planschen. Am Abend sind alle müde, aber glücklich nach Hause.',
      fragen: [
        { frage: 'Wohin fährt die Familie?', optionen: ['An den See', 'In die Berge', 'In den Zoo'], richtig: 0 },
        { frage: 'Was macht der Vater?', optionen: ['Er schwimmt', 'Er grillt', 'Er liest'], richtig: 1 }
      ]
    },
    {
      text: 'Ein Igel lebt oft im Garten unter Laubhaufen. Im Winter hält er einen langen Winterschlaf. Erst wenn es wieder wärmer wird, wacht er auf und sucht nach Futter.',
      fragen: [
        { frage: 'Wo lebt der Igel oft?', optionen: ['Im Baum', 'Unter Laubhaufen', 'Im Fluss'], richtig: 1 },
        { frage: 'Was macht der Igel im Winter?', optionen: ['Er wandert', 'Er hält Winterschlaf', 'Er baut ein Nest'], richtig: 1 }
      ]
    },
    {
      text: 'Tom möchte Feuerwehrmann werden, wenn er groß ist. Deshalb besucht seine Klasse die Feuerwache in der Stadt. Dort darf er sogar in einem echten Feuerwehrauto sitzen.',
      fragen: [
        { frage: 'Was möchte Tom werden?', optionen: ['Feuerwehrmann', 'Arzt', 'Lehrer'], richtig: 0 },
        { frage: 'Was besucht die Klasse?', optionen: ['Die Feuerwache', 'Das Rathaus', 'Den Bahnhof'], richtig: 0 }
      ]
    },
    {
      text: 'Die Bäckerei in der Hauptstraße öffnet schon um sechs Uhr morgens. Der Duft von frischen Brötchen zieht durch die ganze Straße. Viele Leute kaufen dort ihr Frühstück.',
      fragen: [
        { frage: 'Wann öffnet die Bäckerei?', optionen: ['Um sechs Uhr', 'Um acht Uhr', 'Um zehn Uhr'], richtig: 0 },
        { frage: 'Was riecht man in der Straße?', optionen: ['Blumen', 'Frische Brötchen', 'Regen'], richtig: 1 }
      ]
    },
    {
      text: 'Im Zoo gibt es seit letzter Woche zwei kleine Löwenbabys. Viele Besucher kommen extra, um sie zu sehen. Die kleinen Löwen spielen den ganzen Tag miteinander.',
      fragen: [
        { frage: 'Welche Tiere sind neu im Zoo?', optionen: ['Löwenbabys', 'Elefanten', 'Affen'], richtig: 0 },
        { frage: 'Was machen die kleinen Löwen?', optionen: ['Sie schlafen nur', 'Sie spielen', 'Sie fressen Fisch'], richtig: 1 }
      ]
    }
  ];

  function genLesen(anzahlTexte) {
    const texte = pickN(leseBank, anzahlTexte);
    const fragen = [];
    texte.forEach(t => {
      t.fragen.forEach((f, idx) => {
        fragen.push({
          typ: 'mc',
          lesetext: idx === 0 ? t.text : null,
          frage: f.frage,
          optionen: f.optionen,
          richtigIndex: f.richtig
        });
      });
    });
    return fragen;
  }

  function starteRechtschreibung() {
    const starter = () => App.startQuizSession('deutsch', genRechtschreibung(10));
    App.setLastStarter(starter); starter();
  }
  function starteLesen() {
    const starter = () => App.startQuizSession('deutsch', genLesen(4));
    App.setLastStarter(starter); starter();
  }

  return { renderMenu, starteRechtschreibung, starteLesen };
})();
