const Mathe = (function () {
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function renderMenu() {
    App.render(App.subMenuHtml('🔢 Mathe – was übst du?', [
      { emoji: '➕', titel: 'Plus & Minus', onclick: 'Mathe.startePlusMinus()' },
      { emoji: '✖️', titel: 'Einmaleins', onclick: 'Mathe.starteEinmaleins()' },
      { emoji: '➗', titel: 'Geteilt', onclick: 'Mathe.starteGeteilt()' },
      { emoji: '📝', titel: 'Textaufgaben', onclick: 'Mathe.starteTextaufgaben()' }
    ]));
  }

  function generierePlusMinus(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const plus = Math.random() < 0.5;
      let a, b, frage, antwort;
      if (plus) {
        a = rnd(10, 500); b = rnd(10, 500);
        frage = `${a} + ${b} = ?`;
        antwort = a + b;
      } else {
        a = rnd(10, 500); b = rnd(10, a);
        frage = `${a} − ${b} = ?`;
        antwort = a - b;
      }
      fragen.push({ typ: 'numeric', frage, antwort });
    }
    return fragen;
  }

  function genEinmaleins(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const a = rnd(1, 10), b = rnd(1, 10);
      fragen.push({ typ: 'numeric', frage: `${a} × ${b} = ?`, antwort: a * b });
    }
    return fragen;
  }

  function genGeteilt(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const b = rnd(1, 10), erg = rnd(1, 10);
      const a = b * erg;
      fragen.push({ typ: 'numeric', frage: `${a} : ${b} = ?`, antwort: erg });
    }
    return fragen;
  }

  const textVorlagen = [
    () => { const a = rnd(3, 20), b = rnd(2, 15);
      return { frage: `Anna hat ${a} Äpfel. Sie bekommt ${b} weitere geschenkt. Wie viele Äpfel hat sie jetzt?`, antwort: a + b }; },
    () => { const a = rnd(10, 40), b = rnd(2, a - 1);
      return { frage: `Tim hat ${a} Bonbons. Er verschenkt ${b} davon. Wie viele Bonbons hat er noch?`, antwort: a - b }; },
    () => { const a = rnd(2, 9), b = rnd(2, 9);
      return { frage: `Im Regal stehen ${a} Kisten mit je ${b} Flaschen. Wie viele Flaschen sind das insgesamt?`, antwort: a * b }; },
    () => { const b = rnd(2, 9), erg = rnd(2, 9); const a = b * erg;
      return { frage: `${a} Kekse werden gleichmäßig auf ${b} Teller verteilt. Wie viele Kekse liegen auf jedem Teller?`, antwort: erg }; },
    () => { const a = rnd(5, 30), b = rnd(5, 30);
      return { frage: `Ein Bus fährt mit ${a} Personen los. An der Haltestelle steigen ${b} weitere Personen ein. Wie viele Personen sind jetzt im Bus?`, antwort: a + b }; },
    () => { const a = rnd(20, 60), b = rnd(5, 19);
      return { frage: `Max hat ${a} Euro Taschengeld gespart. Er kauft ein Spielzeug für ${b} Euro. Wie viel Geld hat er noch?`, antwort: a - b }; },
    () => { const a = rnd(2, 12), min = rnd(2, 8);
      return { frage: `Eine Klassenfahrt dauert ${a} Tage. Jeden Tag gibt es ${min} Stunden Programm. Wie viele Stunden Programm sind das insgesamt?`, antwort: a * min }; },
    () => { const a = rnd(30, 100), b = rnd(2, 10);
      return { frage: `${a} Kinder sollen in Gruppen zu je ${b} Kindern aufgeteilt werden. Es geht nicht ganz auf – wie viele volle Gruppen zu ${b} Kindern gibt es?`, antwort: Math.floor(a / b) }; }
  ];

  function genTextaufgaben(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const t = textVorlagen[rnd(0, textVorlagen.length - 1)]();
      fragen.push({ typ: 'numeric', frage: t.frage, antwort: t.antwort });
    }
    return fragen;
  }

  function startePlusMinus() {
    const starter = () => App.startQuizSession('mathe', generierePlusMinus(10));
    App.setLastStarter(starter); starter();
  }
  function starteEinmaleins() {
    const starter = () => App.startQuizSession('mathe', genEinmaleins(10));
    App.setLastStarter(starter); starter();
  }
  function starteGeteilt() {
    const starter = () => App.startQuizSession('mathe', genGeteilt(10));
    App.setLastStarter(starter); starter();
  }
  function starteTextaufgaben() {
    const starter = () => App.startQuizSession('mathe', genTextaufgaben(8));
    App.setLastStarter(starter); starter();
  }

  return { renderMenu, startePlusMinus, starteEinmaleins, starteGeteilt, starteTextaufgaben };
})();
