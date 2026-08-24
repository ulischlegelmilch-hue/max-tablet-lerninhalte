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
  PATHS.grundmatt = PATHS.matt;

  function svg(name) {
    return OPEN + (PATHS[name] || '') + CLOSE;
  }

  return { svg };
})();
