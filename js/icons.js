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
    heimat: '<path d="M12 3l8 14H4z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="15.5" r="0.9" fill="currentColor" stroke="none"/><line x1="12" y1="17" x2="12" y2="21"/>',
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
    loeschen: '<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'
  };
  PATHS.lesen = PATHS.deutsch;
  PATHS.verkehrszeichen = PATHS.heimat;

  function svg(name) {
    return OPEN + (PATHS[name] || '') + CLOSE;
  }

  return { svg };
})();
