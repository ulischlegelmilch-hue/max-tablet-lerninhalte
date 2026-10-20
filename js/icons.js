// Zentrale Icon-Bibliothek: einfache, selbst gezeichnete Strich-Icons (24x24,
// Feather/Lucide-Stil) statt Emoji. Emoji rendern je nach Plattform/Schriftart
// unterschiedlich und wirken wie Klebebildchen statt wie Teil eines Produkts -
// echte Vektor-Icons sind konsistent, skalieren sauber und lesen sich als
// "gestaltet" statt "zusammengeklickt". Referenz: Things 3 / Notion / Linear
// nutzen alle handgezeichnete Strich-Icons statt Emoji fuer Navigation.
const Icons = (function () {
  const OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';
  const CLOSE = '</svg>';

  const PATHS = {
    mathe: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><line x1="8" y1="7.2" x2="16" y2="7.2"/>' +
      '<circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="0.9" fill="currentColor" stroke="none"/>' +
      '<circle cx="8" cy="16" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="0.9" fill="currentColor" stroke="none"/>',
    deutsch: '<path d="M12 6.5c-1.7-1.3-4-2-6.5-2-.8 0-1.5.6-1.5 1.4v11c0 .8.7 1.4 1.5 1.4 2.5 0 4.8.7 6.5 2 1.7-1.3 4-2 6.5-2 .8 0 1.5-.6 1.5-1.4v-11c0-.8-.7-1.4-1.5-1.4-2.5 0-4.8.7-6.5 2z"/><line x1="12" y1="6.5" x2="12" y2="19.5"/>',
    geschichten: '<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="5" y1="3" x2="5" y2="21"/><path d="M14 3v6l-2-1.5-2 1.5V3"/>',
    // Heimat & Sachkunde: Globus statt Verkehrsschild (das Warndreieck passte
    // eher zu "Gefahr/Verkehr" als zum Fach als Ganzes, siehe eigener
    // verkehrszeichen-Eintrag weiter unten fuer die Verkehrszeichen-Kachel).
    heimat: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a13 13 0 0 1 3.5 9 13 13 0 0 1-3.5 9 13 13 0 0 1-3.5-9A13 13 0 0 1 12 3z"/>',
    schach: '<path d="M7 21h10v-3H7z"/><path d="M8 18V10h8v8z"/><path d="M8 10V6h2v2h1V6h2v2h1V6h2v4z"/>',
    spielen: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none"/>',
    lektionen: '<path d="M12 5l9 4-9 4-9-4z"/><path d="M7 11v4c0 1.4 2.5 2.5 5 2.5s5-1.1 5-2.5v-4"/><line x1="21" y1="9" x2="21" y2="15"/>',
    figuren: '<circle cx="12" cy="7" r="2.3"/><path d="M9 12h6l1.5 6h-9z"/><line x1="7.5" y1="18" x2="16.5" y2="18"/>',
    eroeffnung: '<path d="M12 2c3 2 4.5 5.5 4.5 9 0 2-1 4-1 4h-7s-1-2-1-4c0-3.5 1.5-7 4.5-9z"/><circle cx="12" cy="9" r="1.6"/><path d="M8.5 15l-2.5 5 3.5-2M15.5 15l2.5 5-3.5-2"/>',
    schlagen: '<line x1="5" y1="19" x2="19" y2="5"/><line x1="19" y1="19" x2="5" y2="5"/>',
    schutz: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    matt: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="13" x2="12" y2="17"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="17" x2="12" y2="20"/>',
    warnung: '<path d="M12 3l9 16H3z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>',
    falle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    zurueck: '<polyline points="15 4 7 12 15 20"/>',
    tagesaufgabe: '<rect x="4" y="5" width="16" height="15" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="8" y1="3" x2="8" y2="6"/><line x1="16" y1="3" x2="16" y2="6"/>',
    malfolgen: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    rechtschreibung: '<path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19z"/><line x1="13" y1="7" x2="17" y2="11"/>',
    home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"/>',
    streak: '<path d="M12 2c1 3-3 4-3 7.5a3 3 0 0 0 6 0c0-1.2-.7-2-1.2-2.7.9.2 3.2 1.7 3.2 5.2a5 5 0 0 1-10 0c0-4.5 3.5-6.5 5-10z"/>',
    loeschen: '<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    taktik: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>',
    // Gabel (Fork): bewusst als echte Ess-Gabel gezeichnet - passt zum
    // deutschen Wort doppelt (Springergabel UND Essgabel), leicht zu merken.
    gabel: '<path d="M7 3v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V3"/><line x1="12" y1="11" x2="12" y2="21"/><line x1="7" y1="3" x2="7" y2="7"/><line x1="17" y1="3" x2="17" y2="7"/>',
    // Fesselung (Pin): Nadel/Pinnadel - die Figur "steckt fest".
    fesselung: '<circle cx="12" cy="6" r="3"/><line x1="12" y1="9" x2="12" y2="21"/>',
    // Spieß (Skewer): Spieß-Stab mit zwei aufgespießten Figuren, wie ein Grillspieß.
    spiess: '<line x1="4" y1="20" x2="20" y2="4"/><circle cx="8" cy="16" r="2.3"/><circle cx="16" cy="8" r="2.3"/>',
    // Abzugsangriff (Discovered Attack): eine Figur zieht zur Seite weg, dahinter
    // wird eine Angriffslinie frei, die ein Ziel trifft.
    abzug: '<path d="M4 20l6-6"/><path d="M7 20h3v-3"/><line x1="10" y1="14" x2="20" y2="4"/><circle cx="20" cy="4" r="1.3" fill="currentColor" stroke="none"/>',
    // Konzentration: Auge, steht fuer Wahrnehmung/Fokus.
    konzentration: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    // Koordinaten finden: Gitter mit markiertem Feld.
    koordinaten: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    // Feldfarbe-Quiz: Schachbrett-Karo (zwei helle, zwei gefuellte Felder).
    feldfarbe: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/><rect x="13" y="3" width="8" height="8" fill="currentColor" stroke="none"/><rect x="3" y="13" width="8" height="8" fill="currentColor" stroke="none"/>',
    // Läufer-Weg: gestrichelter Diagonalpfad mit Zielpunkt.
    laeuferweg: '<line x1="4" y1="20" x2="18" y2="6" stroke-dasharray="3 3"/><circle cx="20" cy="4" r="1.6" fill="currentColor" stroke="none"/>',
    einstellungen: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    online: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8 15.8a6 6 0 0 1 8 0"/><path d="M11 19a2 2 0 0 1 2 0"/><circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none"/>',
    chat: '<path d="M4 4h16v12H8l-4 4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/>',
    bauer: '<circle cx="12" cy="6.5" r="2.6"/><path d="M9 10.5h6l1.5 9h-9z"/><line x1="7" y1="19.5" x2="17" y2="19.5"/>',
    materialwert: '<line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7h6M13 7h6"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0z"/><line x1="8" y1="21" x2="16" y2="21"/>',
    // Geschenk: fuer die Belohnungen-Kachel (siehe belohnungen.js).
    geschenk: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="12" y1="10" x2="12" y2="20"/>' +
      '<path d="M12 10c-1-2.6-3-3.6-4.3-2.6C6.6 8.3 7.6 10 12 10z"/><path d="M12 10c1-2.6 3-3.6 4.3-2.6C17.4 8.3 16.4 10 12 10z"/>',
    // Schiffe versenken: kleines Schiff (Rumpf + Mast + Flagge) ueber einer
    // Wellenlinie - fuer die Menuekachel und den "Automatisch platzieren"-Button.
    schiffe: '<path d="M3 16h18l-2.5 4h-13z"/><path d="M7 16V9h10v7"/><line x1="12" y1="9" x2="12" y2="3"/>' +
      '<path d="M12 3.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/>',
    // Zielkreuz fuer die "Automatisch platzieren"/Wuerfel-Aktion beim Schiffe-
    // versenken-Aufbau sowie fuer Treffer-Anzeigen.
    ziel: '<circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',
    drehen: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    // Mau-Mau: zwei leicht gefaecherte Spielkarten fuer die Menuekachel.
    quartett: '<path d="M3 15l1.6-4.6A2 2 0 0 1 6.5 9h11a2 2 0 0 1 1.9 1.4L21 15v3h-2.5"/><path d="M5.5 18H3v-3"/><path d="M8 18h8"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    maumau: '<rect x="3" y="5" width="11" height="16" rx="1.5" transform="rotate(-10 8.5 13)"/><rect x="10" y="5" width="11" height="16" rx="1.5" transform="rotate(10 15.5 13)"/>',
    // Wortarten erkennen: Textzeilen (ein Satz) mit einer Lupe darueber -
    // steht fuers "Herausfinden/Heraussuchen" eines Worts im Satz.
    wortarten: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="13" y2="12"/><line x1="4" y1="18" x2="17" y2="18"/><circle cx="16" cy="15" r="3.2"/><line x1="18.3" y1="17.3" x2="21" y2="20"/>'
  };
  PATHS.lesen = PATHS.deutsch;
  // Eigenes Icon (Warndreieck) statt Alias auf heimat - wird nur noch für die
  // Verkehrszeichen-Kachel INNERHALB von Heimat & Sachkunde gebraucht, dort
  // passt das Verkehrsschild-Motiv nach wie vor.
  PATHS.verkehrszeichen = '<path d="M12 3l8 14H4z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="15.5" r="0.9" fill="currentColor" stroke="none"/>';
  // Fahrrad (Radfahrausbildung in Heimat & Sachkunde)
  PATHS.fahrrad = '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16L9 8h5l4.5 8M9 8L12 16M14 8l-1-3h-2"/>';
  // Klammern (Mathe: Punkt vor Strich & Klammern)
  PATHS.klammern = '<path d="M8 4C4.5 8.5 4.5 15.5 8 20"/><path d="M16 4c3.5 4.5 3.5 11.5 0 16"/><line x1="11" y1="12" x2="13" y2="12"/>';
  PATHS.grundmatt = PATHS.matt;

  function svg(name) {
    return OPEN + (PATHS[name] || '') + CLOSE;
  }

  // Kategorie-Icons (20.10.2026): gefuellte Zweiton-Symbole (32x32) fuer die farbigen Kacheln im dunklen Design.
  // Weiss + teiltransparentes Weiss; die zweite Farbe kommt aus der CSS-Variable --kat-dunkel der jeweiligen Kachel.
  const W = '#fff', D = 'var(--kat-dunkel, #234)';
  const KAT = {
    mathe: `<g stroke="${W}" stroke-width="3" stroke-linecap="round" fill="none"><path d="M9.5 5.2v8.6M5.2 9.5h8.6"/><path d="M18.2 9.5h8.6"/><path d="M6.3 19.3l6.4 6.4M12.7 19.3l-6.4 6.4"/><path d="M18.2 22.5h8.6"/></g><circle cx="22.5" cy="18.6" r="1.6" fill="${W}"/><circle cx="22.5" cy="26.4" r="1.6" fill="${W}"/>`,
    deutsch: `<path d="M4.5 24.5L11.5 7l7 17.5M7.2 19h8.6" stroke="${W}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="24" cy="20.8" r="3.7" stroke="${W}" stroke-width="2.6" fill="none"/><path d="M27.7 17.2v7.6" stroke="${W}" stroke-width="2.6" stroke-linecap="round"/><path d="M4 28.6h24" stroke="${W}" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>`,
    heimat: `<circle cx="16" cy="16" r="11" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="2.4"/><ellipse cx="16" cy="16" rx="5" ry="11" fill="none" stroke="${W}" stroke-width="2"/><path d="M5 16h22" stroke="${W}" stroke-width="2"/><path d="M7.2 9.8c5.6 2.2 11.6 2.2 17.6 0M7.2 22.2c5.6-2.2 11.6-2.2 17.6 0" fill="none" stroke="${W}" stroke-opacity=".8" stroke-width="1.8" stroke-linecap="round"/>`,
    geschichten: `<path d="M16 9.5C13 7 8.5 6.4 5 7.4V24c3.5-1 8-.5 11 2z" fill="${W}" fill-opacity=".95"/><path d="M16 9.5c3-2.5 7.5-3.1 11-2.1V24c-3.5-1-8-.5-11 2z" fill="${W}" fill-opacity=".6"/><path d="M8 11.4c2-.3 4 0 5.4.8M8 15c2-.3 4 0 5.4.8M8 18.6c2-.3 4 0 5.4.8" stroke="${D}" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M24 3.6l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="${W}"/>`,
    spiele: `<path d="M8 10h16c2.4 0 4.5 1.7 4.9 4.1l1.4 7.6c.4 2.3-1.4 4.3-3.7 4.3-1.2 0-2.3-.6-3-1.5l-2.2-2.7H10.6l-2.2 2.7c-.7.9-1.8 1.5-3 1.5-2.3 0-4.1-2-3.7-4.3l1.4-7.6C3.5 11.7 5.6 10 8 10z" fill="${W}" fill-opacity=".96"/><rect x="8.2" y="13.6" width="2.6" height="7" rx="1" fill="${D}"/><rect x="6" y="15.8" width="7" height="2.6" rx="1" fill="${D}"/><circle cx="22" cy="15.6" r="1.8" fill="${D}"/><circle cx="25.6" cy="18.6" r="1.8" fill="${D}"/>`,
    chat: `<path d="M6 5.5h20a3 3 0 0 1 3 3v11.5a3 3 0 0 1-3 3H15.5L9 28v-5H6a3 3 0 0 1-3-3V8.5a3 3 0 0 1 3-3z" fill="${W}" fill-opacity=".96"/><circle cx="10.5" cy="14.2" r="1.9" fill="${D}"/><circle cx="16" cy="14.2" r="1.9" fill="${D}"/><circle cx="21.5" cy="14.2" r="1.9" fill="${D}"/>`,
    belohnung: `<path d="M10 4.5h12v7.5a6 6 0 0 1-12 0z" fill="${W}" fill-opacity=".97"/><path d="M10 6.8H6.2v2.4a4.6 4.6 0 0 0 4.4 4.6M22 6.8h3.8v2.4a4.6 4.6 0 0 1-4.4 4.6" fill="none" stroke="${W}" stroke-width="2.2" stroke-linecap="round"/><path d="M16 18.5v4" stroke="${W}" stroke-width="2.6"/><rect x="11" y="22.5" width="10" height="3.6" rx="1.4" fill="${W}"/><path d="M16 7.2l1.15 2.35 2.6.35-1.9 1.8.5 2.55L16 13l-2.35 1.25.5-2.55-1.9-1.8 2.6-.35z" fill="${D}"/>`,
    schach: `<path d="M9 28h14v-3.2H9z" fill="${W}"/><path d="M10.6 24.6l1-9.4h8.8l1 9.4z" fill="${W}" fill-opacity=".92"/><path d="M9 15.2V7.6h3.3v2.8h2.2V7.6h3v2.8h2.2V7.6H23v7.6z" fill="${W}"/>`,
    schiffe: `<path d="M16 15.5V5.5" stroke="${W}" stroke-width="2.2" stroke-linecap="round"/><path d="M16.8 6.4l7.2 6.6h-7.2z" fill="${W}" fill-opacity=".95"/><path d="M15.2 8.2L9 13h6.2z" fill="${W}" fill-opacity=".6"/><path d="M4 18h24l-3.6 7.4H7.6z" fill="${W}"/><path d="M3 29c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0 5-1.6 8 0" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round"/>`,
    quartett: `<path d="M3 20v-3.4l3.2-1.2 3.6-5.2c.5-.7 1.3-1.1 2.1-1.1h8.1c.8 0 1.5.4 2 1l3.3 4.6 3 1.1V20c0 1-.8 1.8-1.8 1.8H4.8C3.8 21.8 3 21 3 20z" fill="${W}" fill-opacity=".97"/><path d="M11.6 10.9L9.4 14.2h6.1v-3.3zM17.5 10.9v3.3h5.6l-2.3-3.3z" fill="${D}" fill-opacity=".85"/><circle cx="9.6" cy="22.2" r="3.3" fill="${D}" stroke="${W}" stroke-width="2"/><circle cx="23.2" cy="22.2" r="3.3" fill="${D}" stroke="${W}" stroke-width="2"/>`,
    tagesaufgabe: `<rect x="4.5" y="6.5" width="23" height="21" rx="3.5" fill="${W}" fill-opacity=".96"/><rect x="10" y="3.5" width="2.6" height="6" rx="1.3" fill="${W}"/><rect x="19.4" y="3.5" width="2.6" height="6" rx="1.3" fill="${W}"/><path d="M4.5 13h23" stroke="${D}" stroke-opacity=".25" stroke-width="1.6"/><path d="M10.5 20.3l4 4 7-8" fill="none" stroke="${D}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    verkehrszeichen: `<path d="M16 4.5l12.5 21.5H3.5z" fill="${W}" fill-opacity=".96" stroke="${W}" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 12v7" stroke="${D}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="22.6" r="1.8" fill="${D}"/>`,
    malfolgen: `<circle cx="16" cy="16" r="12" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="2.2"/><path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke="${W}" stroke-width="3.4" stroke-linecap="round"/>`,
    rechtschreibung: `<path d="M6 26l1.6-6.2L21 6.4l4.6 4.6L12.2 24.4z" fill="${W}" fill-opacity=".96"/><path d="M6 26l1.6-6.2 4.6 4.6z" fill="${D}"/><path d="M22.4 5l4.6 4.6 1.6-1.6a2.4 2.4 0 0 0 0-3.4l-1.2-1.2a2.4 2.4 0 0 0-3.4 0z" fill="${W}" fill-opacity=".6"/><path d="M13 28.5h15" stroke="${W}" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`,
    wortarten: `<path d="M5.5 5.5h9.8c.6 0 1.2.2 1.6.7l10.3 10.3c.9.9.9 2.3 0 3.2l-7 7c-.9.9-2.3.9-3.2 0L6.7 16.4c-.4-.4-.7-1-.7-1.6V6c0-.3.2-.5.5-.5z" fill="${W}" fill-opacity=".96"/><circle cx="11" cy="11" r="2.3" fill="${D}"/>`,
    fahrrad: `<g fill="none" stroke="${W}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="5"/><circle cx="24" cy="21" r="5"/><path d="M8 21l5-9h8l3 9M13 12l4.5 9M11 8.5h4M21 12l-1.8-3.5h3"/></g>`,
    feldfarbe: `<rect x="4.5" y="4.5" width="11" height="11" rx="2.4" fill="${W}" fill-opacity=".97"/><rect x="16.5" y="4.5" width="11" height="11" rx="2.4" fill="${W}" fill-opacity=".38"/><rect x="4.5" y="16.5" width="11" height="11" rx="2.4" fill="${W}" fill-opacity=".38"/><rect x="16.5" y="16.5" width="11" height="11" rx="2.4" fill="${W}" fill-opacity=".97"/>`,
    koordinaten: `<circle cx="16" cy="16" r="9" fill="none" stroke="${W}" stroke-width="2.4"/><circle cx="16" cy="16" r="3.2" fill="${W}"/><path d="M16 3v6M16 23v6M3 16h6M23 16h6" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/>`,
    laeuferweg: `<path d="M7 24.5L16 14l9-7" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/><circle cx="7" cy="24.5" r="3.4" fill="${W}"/><circle cx="16" cy="14" r="3.4" fill="${W}"/><circle cx="25" cy="7" r="3.4" fill="${W}"/>`,
    einstellungen: `<circle cx="16" cy="16" r="10.6" fill="none" stroke="${W}" stroke-width="4.4" stroke-dasharray="3.1 3.1"/><circle cx="16" cy="16" r="8.4" fill="${W}" fill-opacity=".97"/><circle cx="16" cy="16" r="3.6" fill="${D}"/>`,
    taktik: `<path d="M18.5 3L7 18h8l-2 11 12-16h-8z" fill="${W}" fill-opacity=".97" stroke="${W}" stroke-width="1.6" stroke-linejoin="round"/>`,
    online: `<circle cx="11.5" cy="11" r="4.4" fill="${W}" fill-opacity=".97"/><path d="M3.5 26c0-4.6 3.3-7.4 8-7.4s8 2.8 8 7.4z" fill="${W}" fill-opacity=".97"/><circle cx="22.8" cy="12" r="3.5" fill="${W}" fill-opacity=".6"/><path d="M19.4 25.6c.3-3.8 2.7-6 5.7-6 3.1 0 5.3 2.2 5.3 6z" fill="${W}" fill-opacity=".6"/>`,
    eroeffnung: `<path d="M16 3c4.6 3.3 6.6 8.2 6 14.2l-2.7 3.1h-6.6L10 17.2C9.4 11.2 11.4 6.3 16 3z" fill="${W}" fill-opacity=".97"/><circle cx="16" cy="11.4" r="2.5" fill="${D}"/><path d="M10 17.4l-4.2 6.2 5.4-1.6zM22 17.4l4.2 6.2-5.4-1.6z" fill="${W}" fill-opacity=".62"/><path d="M13.3 22.6h5.4L16 29z" fill="${W}" fill-opacity=".85"/>`,
    konzentration: `<path d="M2.8 16C6.3 10 10.8 7 16 7s9.7 3 13.2 9c-3.5 6-8 9-13.2 9S6.3 22 2.8 16z" fill="${W}" fill-opacity=".97"/><circle cx="16" cy="16" r="5.2" fill="${D}"/><circle cx="16" cy="16" r="2.1" fill="${W}"/>`,
    lektionen: `<path d="M16 6l13 6.5L16 19 3 12.5z" fill="${W}" fill-opacity=".97"/><path d="M8 16.4v5.6c0 1.8 3.6 3.5 8 3.5s8-1.7 8-3.5v-5.6l-8 4z" fill="${W}" fill-opacity=".62"/><path d="M28 13.5v8" stroke="${W}" stroke-width="2" stroke-linecap="round"/>`,
    materialwert: `<path d="M16 5v20.5" stroke="${W}" stroke-width="2.6" stroke-linecap="round"/><rect x="10" y="25.5" width="12" height="2.8" rx="1.2" fill="${W}"/><path d="M5 8.8h22" stroke="${W}" stroke-width="2.6" stroke-linecap="round"/><path d="M7.7 8.8l-4.3 8.2M7.7 8.8L12 17M24.3 8.8L20 17M24.3 8.8l4.3 8.2" stroke="${W}" stroke-opacity=".7" stroke-width="1.4"/><path d="M2.4 17h10.6a5.3 5.3 0 0 1-10.6 0zM19 17h10.6a5.3 5.3 0 0 1-10.6 0z" fill="${W}" fill-opacity=".97"/>`,
    bauer: `<circle cx="16" cy="9" r="4.2" fill="${W}"/><path d="M12.6 14.4h6.8l-1 5h2.6l1.6 5.6H9.4L11 19.4h2.6z" fill="${W}" fill-opacity=".97"/><rect x="8" y="25" width="16" height="3.2" rx="1.3" fill="${W}"/>`,
    grundmatt: `<path d="M5.5 24l-2-13.5 6.5 5.5L16 7l6 9 6.5-5.5-2 13.5z" fill="${W}" fill-opacity=".97"/><rect x="5.5" y="25.5" width="21" height="3" rx="1.3" fill="${W}"/><circle cx="16" cy="6" r="1.8" fill="${W}"/>`,
    spielen: `<circle cx="16" cy="16" r="12" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="2.2"/><path d="M13 10.5l9 5.5-9 5.5z" fill="${W}"/>`,
    maumau: `<rect x="6.5" y="6" width="14" height="19" rx="2.4" transform="rotate(-12 13.5 15.5)" fill="${W}" fill-opacity=".55"/><g transform="rotate(10 19 16.5)"><rect x="12" y="7" width="14" height="19" rx="2.4" fill="${W}" fill-opacity=".97"/><path d="M19 21.2c-4-2.8-5.6-5-5.6-6.9 0-1.5 1.2-2.6 2.6-2.6 1.1 0 2.4.7 3 1.7.6-1 1.9-1.7 3-1.7 1.4 0 2.6 1.1 2.6 2.6 0 1.9-1.6 4.1-5.6 6.9z" fill="${D}"/></g>`
  };
  const KAT_ALIAS = { geschenk: 'belohnung', lesen: 'geschichten', fachbegriffe: 'wortarten' };
  function kat(name) {
    const k = KAT[KAT_ALIAS[name] || name];
    return k ? '<svg viewBox="0 0 32 32" class="kat-icon">' + k + '</svg>' : svg(name);
  }

  return { svg, kat };
})();
