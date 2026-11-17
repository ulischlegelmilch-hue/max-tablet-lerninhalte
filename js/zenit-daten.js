// ZENIT – Max' Raumfahrtspiel (seit 17.11.2026, neben Hof-Farm und VOLLDAMPF).
//
// Uli, 17.11.2026: „ein Spiel, bei dem er etwas lernen kann … Weltraum“ – „Basen errichten … etwas über reale
// Raumfahrzeuge, Missionen und die Planeten lernen … vielleicht eine ISS bauen oder Mir“ – „eigener Style“.
// Kapitel 1: Max baut die ISS in der echten Reihenfolge (1998–2010). Jeder Bauabschnitt braucht, was er auch in echt
// brauchte (Swesda vor der Besatzung, Solarflügel vor dem Labor …) – so lernt er, wie eine Raumstation funktioniert.
// Lernrunden (dieselben wie beim Hof, ferientraining.js) bringen Treibstoff.
//
// Diese Datei: nur Inhalte. Alle Zahlen sind belegt, siehe tools/zenit/QUELLEN.md; „rund“ = gerundet oder
// Quellen uneinig. Was nur Spielregel ist, steht dort ebenfalls.
const ZenitDaten = (function () {
  // ---------------------------------------------------------------- Raketen
  // treibstoff = Summe (Startmasse − Leermasse) aller Stufen, gerundet; kostet im Spiel genau so viel
  const RAKETEN = {
    proton: { name: 'Proton-K', land: 'Russland', ort: 'Baikonur, Kasachstan', startmasse: 690, treibstoff: 620,
      text: 'Dreistufige russische Rakete. Fast ihr ganzes Gewicht beim Start ist Treibstoff.' },
    shuttle: { name: 'Space Shuttle', land: 'USA', ort: 'Kennedy Space Center, Florida', startmasse: 2030, treibstoff: 1700,
      text: 'Raumfähre mit Besatzung. Der große Außentank fasst 736 t Wasserstoff und Sauerstoff, die zwei weißen Booster je 500 t Festtreibstoff.' },
    sojus: { name: 'Sojus-U', land: 'Russland', ort: 'Baikonur, Kasachstan', startmasse: 313, treibstoff: 270,
      text: 'Russische Rakete für Menschen. Sie bringt die Sojus-Kapsel mit drei Raumfahrern zur Station.' },
  };

  // ---------------------------------------------------------------- Bauplan ISS (echte Reihenfolge)
  // start/an: Datum Start / angekoppelt (an: null = nicht belegt). tage = Flugdauer bis zur Station (im Spiel 1 Minute je Tag).
  // braucht: { id: Begründung } – was vorher fertig sein muss. kann: was die Station danach Neues kann.
  const BAU = [
    { id: 'sarja', name: 'Sarja', art: 'modul', land: 'Russland', rakete: 'proton', flug: 'Proton-K',
      start: '1998-11-20', an: null, tage: 0, masse: 20, laenge: 12.6, breite: 4.1,
      gebaut: 'Chrunitschew in Moskau, bezahlt von der NASA',
      zweck: 'Das erste Teil der ISS: Strom, Antrieb und Steuerung für den Anfang.',
      braucht: {},
      bericht: 'Sarja kreist allein um die Erde. Zwei Solarflügel liefern Strom, eigene Triebwerke halten die Lage.',
      kann: [['Strom', 'zwei Solarflügel'], ['Antrieb', 'Triebwerke für die Lage']],
      karten: [
        { f: 'Was heißt Sarja auf Deutsch?', a: 'Morgenröte. Sarja war das erste Teil der ISS und startete am 20. November 1998.' },
        { f: 'Wie lange braucht die ISS für eine Runde um die Erde?', a: 'Etwa anderthalb Stunden. Darum sieht die Besatzung jeden Tag rund 16 Sonnenaufgänge.' },
      ] },
    { id: 'unity', name: 'Unity', art: 'modul', land: 'USA', rakete: 'shuttle', flug: 'STS-88 · Endeavour',
      start: '1998-12-04', an: '1998-12-06', tage: 2, masse: 11.6, laenge: 5.5, breite: 4.6,
      gebaut: 'Boeing, USA',
      zweck: 'Ein Verbindungsknoten: Hier treffen sich der russische und der amerikanische Teil.',
      braucht: { sarja: 'Unity wird an Sarja angekoppelt.' },
      bericht: 'Die Besatzung der Endeavour hat Sarja mit dem Roboterarm eingefangen und an Unity gekoppelt. Die ISS hat jetzt zwei Teile.',
      kann: [['Andocken', 'sechs Anschlüsse für weitere Teile']],
      karten: [{ f: 'Wozu ist Unity da?', a: 'Unity ist ein Verbindungsknoten. Hier treffen sich der russische und der amerikanische Teil der Station.' }] },
    { id: 'swesda', name: 'Swesda', art: 'modul', land: 'Russland', rakete: 'proton', flug: 'Proton-K',
      start: '2000-07-12', an: '2000-07-26', tage: 14, masse: 20, laenge: 13.1, breite: 4.3,
      gebaut: 'Energija und Chrunitschew, Russland',
      zweck: 'Das Wohnhaus der Station: Schlafplätze, Küche, Toilette und Lebenserhaltung.',
      braucht: { sarja: 'Swesda wird hinten an Sarja angekoppelt.' },
      bericht: 'Swesda ist zwei Wochen allein geflogen und hat dann ganz automatisch angekoppelt. Jetzt kann eine Besatzung einziehen.',
      kann: [['Wohnen', 'Schlafkabinen, Küche und Toilette'], ['Atemluft', 'Lebenserhaltung macht Sauerstoff aus Wasser'], ['Höhe halten', 'Triebwerke heben die Station an']],
      karten: [
        { f: 'Was heißt Swesda auf Deutsch?', a: 'Stern.' },
        { f: 'Warum konnte erst nach Swesda eine Besatzung einziehen?', a: 'Swesda brachte Schlafplätze, Küche und die Lebenserhaltung für die Atemluft.' },
      ] },
    { id: 'expedition1', name: 'Erste Besatzung', art: 'besatzung', land: 'USA und Russland', rakete: 'sojus', flug: 'Sojus TM-31',
      start: '2000-10-31', an: '2000-11-02', tage: 2,
      crew: [['Bill Shepherd', 'USA', 'Kommandant'], ['Juri Gidsenko', 'Russland', 'Pilot'], ['Sergei Krikaljow', 'Russland', 'Bordingenieur']],
      zweck: 'Expedition 1: die ersten drei Bewohner der ISS.',
      braucht: { swesda: 'Ohne Swesda gibt es keine Schlafplätze und keine Atemluft.' },
      bericht: 'Bill Shepherd, Juri Gidsenko und Sergei Krikaljow sind eingezogen. Seit diesem Tag wohnen ständig Menschen auf der ISS.',
      kann: [['Besatzung', 'drei Raumfahrer an Bord']],
      karten: [{ f: 'Seit wann wohnen ständig Menschen auf der ISS?', a: 'Seit dem 2. November 2000, ohne Pause bis heute.' }] },
    { id: 'p6', name: 'Solarflügel P6', art: 'modul', land: 'USA', rakete: 'shuttle', flug: 'STS-97 · Endeavour',
      start: '2000-11-30', an: '2000-12-02', tage: 2, masse: 15.8,
      gebaut: 'USA (NASA)',
      zweck: 'Die ersten großen amerikanischen Solarflügel, auf einem Gitterträger über Unity.',
      braucht: { unity: 'Der Gitterträger mit den Flügeln sitzt oben auf Unity.' },
      bericht: 'Die großen Solarflügel sind ausgeklappt. Die Station hat jetzt genug Strom für ein Labor.',
      kann: [['Viel Strom', 'große Solarflügel für die Labore']],
      karten: [{ f: 'Woher bekommt die ISS ihren Strom?', a: 'Aus Solarflügeln. Ihre Solarzellen machen aus Sonnenlicht Strom.' }] },
    { id: 'destiny', name: 'Destiny', art: 'modul', land: 'USA', rakete: 'shuttle', flug: 'STS-98 · Atlantis',
      start: '2001-02-07', an: '2001-02-10', tage: 3, masse: 14.5, laenge: 8.5, breite: 4.3,
      gebaut: 'Boeing, USA',
      zweck: 'Das Forschungslabor der USA.',
      braucht: {
        unity: 'Destiny wird vorn an Unity angebaut.',
        p6: 'Ein Labor braucht viel Strom. Erst müssen die großen Solarflügel da sein.',
        expedition1: 'Im Labor muss jemand forschen. Erst muss eine Besatzung einziehen.',
      },
      bericht: 'Destiny ist angebaut. Die Besatzung kann jetzt Experimente machen.',
      kann: [['Forschen', 'Experimente im Labor']],
      karten: [{ f: 'Was ist Destiny?', a: 'Das Forschungslabor der USA. Es kam im Februar 2001 zur ISS.' }] },
    { id: 'canadarm2', name: 'Canadarm2', art: 'modul', land: 'Kanada', rakete: 'shuttle', flug: 'STS-100 · Endeavour',
      start: '2001-04-19', an: null, tage: 2, masse: 1.8, laenge: 17.6,
      gebaut: 'MDA für die kanadische Raumfahrtagentur',
      zweck: 'Der große Roboterarm: Er baut mit und greift ankommende Raumschiffe.',
      braucht: { destiny: 'Der Arm bekommt seinen ersten Halteplatz an Destiny.' },
      bericht: 'Canadarm2 hat sich an Destiny festgehalten. Ab jetzt können große Teile mit dem Arm angebaut werden.',
      kann: [['Greifen', 'Roboterarm zum Bauen und Einfangen']],
      karten: [{ f: 'Wer hat den großen Roboterarm der ISS gebaut?', a: 'Kanada. Ausgestreckt ist Canadarm2 17,6 Meter lang.' }] },
    { id: 'harmony', name: 'Harmony', art: 'modul', land: 'USA und Italien', rakete: 'shuttle', flug: 'STS-120 · Discovery',
      start: '2007-10-23', an: '2007-10-26', tage: 3, masse: 14.3, laenge: 6.7, breite: 4.4,
      gebaut: 'Thales Alenia Space in Turin, Italien',
      zweck: 'Ein Knoten mit sechs Andockstellen für Labore und Raumschiffe.',
      braucht: {
        destiny: 'Harmony bekommt seinen Platz vorn an Destiny.',
        canadarm2: 'Harmony wird mit dem Roboterarm an seinen Platz umgesetzt.',
      },
      bericht: 'Harmony sitzt vorn an Destiny. Jetzt ist Platz für die Labore aus Europa und Japan.',
      kann: [['Andocken', 'Platz für Columbus und Kibo']],
      karten: [{ f: 'Wie viele Andockstellen hat Harmony?', a: 'Sechs. An Harmony hängen heute Columbus und Kibo.' }] },
    { id: 'columbus', name: 'Columbus', art: 'modul', land: 'Europa', rakete: 'shuttle', flug: 'STS-122 · Atlantis',
      start: '2008-02-07', an: '2008-02-11', tage: 4, masse: 10.3, laenge: 6.9, breite: 4.5,
      gebaut: 'Hülle in Turin, ausgerüstet in Bremen, im Airbus Beluga nach Florida geflogen',
      zweck: 'Das Forschungslabor der ESA, gesteuert aus Oberpfaffenhofen bei München.',
      braucht: { harmony: 'Columbus kommt rechts an Harmony.' },
      person: 'Hans Schlegel aus Deutschland half beim Anbau, bei einem Außeneinsatz im Raumanzug.',
      bericht: 'Columbus ist angebaut. Europa hat jetzt ein eigenes Labor im All.',
      kann: [['Forschen', 'europäisches Labor']],
      karten: [
        { f: 'Von wo aus wird Columbus gesteuert?', a: 'Aus Oberpfaffenhofen bei München, vom Columbus-Kontrollzentrum.' },
        { f: 'Welcher deutsche Astronaut half beim Anbau von Columbus?', a: 'Hans Schlegel, bei einem Außeneinsatz im Raumanzug.' },
      ] },
    { id: 'kibo', name: 'Kibo', art: 'modul', land: 'Japan', rakete: 'shuttle', flug: 'STS-124 · Discovery',
      start: '2008-05-31', an: '2008-06-03', tage: 3, masse: 15.9, laenge: 11.2, breite: 4.4,
      gebaut: 'JAXA, Japan',
      zweck: 'Das größte Labor der ISS. Kibo kam in drei Flügen: Lager, Labor und Außenplattform.',
      braucht: { harmony: 'Kibo kommt links an Harmony.' },
      bericht: 'Kibo ist angebaut, das größte Labor der Station.',
      kann: [['Forschen', 'japanisches Labor mit Außenplattform']],
      karten: [{ f: 'Was heißt Kibo auf Deutsch?', a: 'Hoffnung. Kibo aus Japan ist das größte Labor der ISS.' }] },
    { id: 'tranquility', name: 'Tranquility und Cupola', art: 'modul', land: 'Europa und USA', rakete: 'shuttle', flug: 'STS-130 · Endeavour',
      start: '2010-02-08', an: '2010-02-12', tage: 4, masse: 20.8, laenge: 6.7, breite: 4.5,
      gebaut: 'Thales Alenia Space in Turin, Italien',
      zweck: 'Tranquility hilft bei Luft und Wasser. Die Cupola ist das Aussichtsfenster der Station.',
      braucht: {
        unity: 'Tranquility kommt links an Unity.',
        canadarm2: 'Aus der Cupola wird der Roboterarm gesteuert.',
      },
      bericht: 'Tranquility und die Cupola sind angebaut. Aus sieben Fenstern sieht die Besatzung jetzt auf die Erde.',
      kann: [['Aussicht', 'sieben Fenster der Cupola'], ['Lebenserhaltung', 'Luft und Wasser']],
      karten: [{ f: 'Was kann man in der Cupola machen?', a: 'Durch sieben Fenster auf die Erde schauen und den Roboterarm steuern.' }] },
  ];
  const BAU_ID = {}; BAU.forEach((b, i) => { b.nr = i + 1; BAU_ID[b.id] = b; });

  // allgemeine Werte der ISS (Anzeige)
  const ISS = { hoehe: 400, tempo: 27600, umlauf: 92, seit: '2000-11-02' };

  return { RAKETEN, BAU, BAU_ID, ISS };
})();
if (typeof module !== 'undefined') module.exports = ZenitDaten;
