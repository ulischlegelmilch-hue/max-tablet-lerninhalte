// VOLLDAMPF – Max' Eisenbahn quer durch Deutschland (eigenes Spiel neben der Hof-Farm, seit 15.11.2026).
//
// Uli, 15.11.2026: „ein Spiel abseits der Aufgaben, bei dem er aber die Aufgaben machen kann, um Boni zu bekommen“ –
// „es muss den höchsten spielerischen, aber auch stylistischen Ansprüchen genügen“. Nebenbei lernt Max:
//   * Erdkunde: 16 Bundesländer mit Hauptstadt, rund 80 echte Städte, Nachbarländer, Luftlinie in km
//   * Was woher kommt: jede Ware ist eine echte Spezialität der Stadt (Lebkuchen aus Nürnberg, Kalisalz von der Werra …)
//   * Uhrzeit und Zeitspannen: die Bahnuhr läuft 60-mal so schnell (1 Sekunde = 1 Bahn-Minute), Abfahrtstafeln
//     zeigen Abfahrt, Fahrzeit und Ankunft
//   * echte deutsche Dampfloks mit Baujahr, Höchstgeschwindigkeit und Spitzname
// Lernrunden (dieselben, die auf dem Hof zählen, ferientraining.js) bringen Kohle, Volldampf und Goldtickets.
//
// Diese Datei: nur Inhalte (Texte, Zahlen). Kartengeometrie: volldampf-karte.js (erzeugt von tools/export_volldampf.js).
// Fakten-Regel: nur, was belegbar ist, Zahlen gerundet („rund“). Siehe tools/volldampf/QUELLEN.md.
const VolldampfDaten = (function () {
  // --------------------------------------------------------------------------------------------
  // Bundesländer (id = ISO-Kürzel ohne „DE-“, wie in der Kartenquelle)
  // --------------------------------------------------------------------------------------------
  const LAENDER = {
    TH: { name: 'Thüringen', hauptstadt: 'erfurt', farbe: '#5DB58A', fakt: 'Das „grüne Herz Deutschlands“. Durch den Thüringer Wald führt der Rennsteig, ein berühmter Wanderweg.' },
    SN: { name: 'Sachsen', hauptstadt: 'dresden', farbe: '#5B9BD5', fakt: 'Im Erzgebirge werden Nussknacker und Räuchermännchen aus Holz gemacht.' },
    ST: { name: 'Sachsen-Anhalt', hauptstadt: 'magdeburg', farbe: '#D3A257', fakt: 'Hier steht der Brocken im Harz – mit 1141 Metern der höchste Berg Norddeutschlands.' },
    BB: { name: 'Brandenburg', hauptstadt: 'potsdam', farbe: '#CF6E62', fakt: 'Brandenburg liegt rund um Berlin herum und hat über 3000 Seen.' },
    BE: { name: 'Berlin', hauptstadt: 'berlin', farbe: '#C9719B', fakt: 'Berlin ist Stadt und Bundesland zugleich – und die Hauptstadt von ganz Deutschland.' },
    MV: { name: 'Mecklenburg-Vorpommern', hauptstadt: 'schwerin', farbe: '#4DB2B0', fakt: 'Hier liegt die größte deutsche Insel: Rügen. Das Land hat viele Kilometer Ostseeküste.' },
    SH: { name: 'Schleswig-Holstein', hauptstadt: 'kiel', farbe: '#7488D6', fakt: 'Das einzige Bundesland zwischen zwei Meeren: Nordsee im Westen, Ostsee im Osten.' },
    HH: { name: 'Hamburg', hauptstadt: 'hamburg', farbe: '#9D84CF', fakt: 'Stadt und Bundesland zugleich, mit dem größten Hafen Deutschlands und mehr Brücken als Venedig.' },
    HB: { name: 'Bremen', hauptstadt: 'bremen', farbe: '#D58A5E', fakt: 'Das kleinste Bundesland. Es besteht aus zwei Städten: Bremen und Bremerhaven.' },
    NI: { name: 'Niedersachsen', hauptstadt: 'hannover', farbe: '#8DBB63', fakt: 'Das zweitgrößte Bundesland. Vor der Küste liegen die Ostfriesischen Inseln.' },
    NW: { name: 'Nordrhein-Westfalen', hauptstadt: 'duesseldorf', farbe: '#CDB35A', fakt: 'Hier wohnen die meisten Menschen: rund 18 Millionen. Im Ruhrgebiet wurde früher viel Kohle abgebaut.' },
    HE: { name: 'Hessen', hauptstadt: 'wiesbaden', farbe: '#5BB4D0', fakt: 'In Frankfurt am Main kreuzen sich viele Bahn- und Fluglinien – ein Drehkreuz für ganz Europa.' },
    RP: { name: 'Rheinland-Pfalz', hauptstadt: 'mainz', farbe: '#B580C6', fakt: 'Hier fließen Rhein und Mosel. Am Rhein stehen besonders viele Burgen.' },
    SL: { name: 'Saarland', hauptstadt: 'saarbruecken', farbe: '#CF778D', fakt: 'Das kleinste Flächenland. Es grenzt an Frankreich und Luxemburg.' },
    BY: { name: 'Bayern', hauptstadt: 'muenchen', farbe: '#4F91D2', fakt: 'Das größte Bundesland. Die Zugspitze (2962 m) ist der höchste Berg Deutschlands.' },
    BW: { name: 'Baden-Württemberg', hauptstadt: 'stuttgart', farbe: '#D0A24F', fakt: 'Hier liegen der Schwarzwald und der Bodensee.' }
  };

  // --------------------------------------------------------------------------------------------
  // Waren: echte Spezialitäten. wert = Taler je Kiste und 100 km (Spielwert)
  // --------------------------------------------------------------------------------------------
  const WAREN = {
    kalisalz: { name: 'Kalisalz', wert: 3, fakt: 'Aus Bergwerken an der Werra – Dünger für die Felder.' },
    zwiebeln: { name: 'Zwiebelzöpfe', wert: 4, fakt: 'Jeden Oktober ist in Weimar Zwiebelmarkt.' },
    saatgut: { name: 'Saatgut', wert: 5, fakt: 'Erfurt ist seit Jahrhunderten eine Gärtnerstadt.' },
    optik: { name: 'Ferngläser', wert: 9, fakt: 'In Jena baut man seit über 150 Jahren Linsen und Optik.' },
    autos: { name: 'Autos', wert: 10, fakt: 'Autos werden in mehreren deutschen Städten gebaut.' },
    spielzeug: { name: 'Spielzeug', wert: 6, fakt: 'Sonneberg ist die Spielzeugstadt.' },
    bratwurst: { name: 'Rostbratwurst', wert: 5, fakt: 'Die Thüringer Rostbratwurst steht schon in einer Rechnung von 1404.' },
    spielkarten: { name: 'Spielkarten', wert: 5, fakt: 'In Altenburg werden seit fast 200 Jahren Spielkarten gedruckt – heute viele Millionen Kartenspiele im Jahr.' },
    lokteile: { name: 'Lok-Ersatzteile', wert: 8, fakt: 'Im Dampflokwerk Meiningen werden Dampfloks repariert.' },
    holz: { name: 'Holz', wert: 3, fakt: 'Holz aus dem Pfälzerwald.' },
    stollen: { name: 'Christstollen', wert: 6, fakt: 'Den Dresdner Stollen gibt es seit über 500 Jahren.' },
    buecher: { name: 'Bücher', wert: 6, fakt: 'Leipzig ist die Buchstadt mit der Buchmesse.' },
    porzellan: { name: 'Porzellan', wert: 9, fakt: 'Das erste europäische Porzellan kam ab 1710 aus Meißen.' },
    maschinen: { name: 'Maschinen', wert: 8, fakt: 'Chemnitz baut seit 200 Jahren Maschinen.' },
    schokolade: { name: 'Schokolade', wert: 6, fakt: 'In Halle steht Deutschlands älteste Schokoladenfabrik.' },
    zucker: { name: 'Zuckerrüben', wert: 3, fakt: 'Die Magdeburger Börde hat einen der besten Böden Deutschlands.' },
    spargel: { name: 'Spargel', wert: 5, fakt: 'Berühmter Spargel wächst in Beelitz bei Potsdam.' },
    braunkohle: { name: 'Braunkohle', wert: 2, fakt: 'In der Lausitz wird Braunkohle in riesigen Tagebauen gebaggert.' },
    gurken: { name: 'Spreewaldgurken', wert: 4, fakt: 'Die Gurken aus dem Spreewald sind weltbekannt.' },
    kreide: { name: 'Kreide', wert: 3, fakt: 'Die weißen Kreidefelsen von Rügen.' },
    marzipan: { name: 'Marzipan', wert: 7, fakt: 'Lübeck ist berühmt für Marzipan.' },
    container: { name: 'Container', wert: 7, fakt: 'Im Hamburger Hafen kommen Schiffe aus der ganzen Welt an.' },
    kaffee: { name: 'Kaffee', wert: 6, fakt: 'In Bremen wird viel Kaffee geröstet.' },
    fischstaebchen: { name: 'Fischstäbchen', wert: 5, fakt: 'In Bremerhaven steht eine der größten Fischstäbchen-Fabriken der Welt.' },
    sprotten: { name: 'Kieler Sprotten', wert: 5, fakt: 'Kleine, geräucherte Fische aus der Ostsee.' },
    krabben: { name: 'Nordseekrabben', wert: 6, fakt: 'Krabbenkutter bringen sie in den Husumer Hafen.' },
    kekse: { name: 'Butterkekse', wert: 5, fakt: 'Der Leibniz-Keks kommt seit 1891 aus Hannover.' },
    tee: { name: 'Tee', wert: 5, fakt: 'In Ostfriesland trinkt man besonders viel Tee.' },
    honig: { name: 'Heidehonig', wert: 6, fakt: 'Im Spätsommer blüht die Lüneburger Heide lila.' },
    erz: { name: 'Erz', wert: 3, fakt: 'Über 1000 Jahre lang wurde im Rammelsberg bei Goslar Erz abgebaut.' },
    steinkohle: { name: 'Steinkohle', wert: 2, fakt: 'Im Ruhrgebiet holten Bergleute Kohle tief aus der Erde – bis 2018.' },
    stahl: { name: 'Stahl', wert: 5, fakt: 'In Hochöfen wird aus Erz und Kohle Stahl.' },
    duftwasser: { name: 'Kölnisch Wasser', wert: 8, fakt: 'Das berühmte Duftwasser aus Köln.' },
    printen: { name: 'Printen', wert: 5, fakt: 'Ein würziges Gebäck aus Aachen.' },
    pudding: { name: 'Puddingpulver', wert: 4, fakt: 'Dr. Oetker wurde 1891 in Bielefeld gegründet.' },
    luftfracht: { name: 'Luftfracht', wert: 9, fakt: 'Frankfurt hat den größten Flughafen Deutschlands.' },
    brezeln: { name: 'Brezeln', wert: 4, fakt: 'Brezeln gehören zu Bayern wie die Berge.' },
    lebkuchen: { name: 'Lebkuchen', wert: 6, fakt: 'Nürnberger Lebkuchen gibt es seit Jahrhunderten.' },
    kuckucksuhren: { name: 'Kuckucksuhren', wert: 9, fakt: 'Kuckucksuhren werden im Schwarzwald gebaut.' },
    aepfel: { name: 'Äpfel', wert: 3, fakt: 'Am Bodensee wachsen besonders viele Äpfel.' },
    currywurst: { name: 'Currywurst', wert: 4, fakt: 'Die Currywurst wurde 1949 in Berlin erfunden.' }
  };

  // --------------------------------------------------------------------------------------------
  // Städte: Koordinaten (Grad), Einwohner gerundet, Ware = echte Spezialität.
  // kohle: Kohlerevier (angebunden = Kohle fließt in den Bunker). tourist: Ausflugsziel (mehr Fahrgäste am Wochenende).
  // --------------------------------------------------------------------------------------------
  const S = (id, name, land, lat, lon, einw, ware, fakt, extra) => Object.assign({ id, name, land, lat, lon, einw, ware, fakt }, extra || {});
  const STAEDTE = [
    // Thüringen – hier fängt alles an
    S('erfurt', 'Erfurt', 'TH', 50.978, 11.029, 215000, 'saatgut', 'Auf der Krämerbrücke stehen Häuser – mitten auf der Brücke! Der Erfurter Dom thront über der Stadt.'),
    S('weimar', 'Weimar', 'TH', 50.979, 11.329, 65000, 'zwiebeln', 'Hier lebten die Dichter Goethe und Schiller. Vor dem Theater steht ihr Denkmal.'),
    S('jena', 'Jena', 'TH', 50.927, 11.586, 110000, 'optik', 'Universitätsstadt an der Saale. Carl Zeiss baute hier ab 1846 Mikroskope.'),
    S('gera', 'Gera', 'TH', 50.880, 12.083, 92000, null, 'Drittgrößte Stadt Thüringens. Der Maler Otto Dix wurde hier geboren.'),
    S('eisenach', 'Eisenach', 'TH', 50.975, 10.320, 42000, 'autos', 'Über der Stadt steht die Wartburg. Dort übersetzte Martin Luther die Bibel ins Deutsche.'),
    S('bad_salzungen', 'Bad Salzungen', 'TH', 50.812, 10.233, 24000, 'kalisalz', 'Am Burgsee steht ein Gradierwerk: Salzwasser rieselt über Reisig – die Luft riecht wie am Meer.'),
    S('meiningen', 'Meiningen', 'TH', 50.568, 10.415, 25000, 'lokteile', 'Im Dampflokwerk Meiningen werden bis heute Dampfloks aus ganz Europa repariert.', { werk: true }),
    S('gotha', 'Gotha', 'TH', 50.949, 10.701, 45000, null, 'Schloss Friedenstein ist riesig. Von Gotha fährt eine Straßenbahn bis in den Thüringer Wald.'),
    S('arnstadt', 'Arnstadt', 'TH', 50.835, 10.947, 28000, 'bratwurst', 'Hier wurde die Thüringer Rostbratwurst zum ersten Mal aufgeschrieben – im Jahr 1404.'),
    S('sonneberg', 'Sonneberg', 'TH', 50.359, 11.170, 23000, 'spielzeug', 'Die Spielzeugstadt: Im Deutschen Spielzeugmuseum stehen Spielsachen aus vielen Jahrhunderten.'),
    S('nordhausen', 'Nordhausen', 'TH', 51.505, 10.791, 41000, null, 'Hier beginnt die Harzquerbahn: Dampfzüge fahren bis heute durch den Harz nach Wernigerode.'),
    S('zella_mehlis', 'Zella-Mehlis', 'TH', 50.656, 10.663, 12500, null, 'Mitten im Thüringer Wald gibt es hier ein Meeresaquarium: Im größten Becken schwimmen Haie.'),
    S('altenburg', 'Altenburg', 'TH', 50.985, 12.434, 31000, 'spielkarten', 'Die Skatstadt: Vor über 200 Jahren entstand hier das Kartenspiel Skat. Seit 1903 erinnert der Skatbrunnen daran.'),
    S('saalfeld', 'Saalfeld', 'TH', 50.649, 11.363, 28000, null, 'In den Saalfelder Feengrotten leuchten Tropfsteine in vielen Farben.', { tourist: true }),
    // Sachsen
    S('dresden', 'Dresden', 'SN', 51.050, 13.738, 560000, 'stollen', 'Die Frauenkirche wurde nach dem Krieg aus den alten Steinen wieder aufgebaut.'),
    S('leipzig', 'Leipzig', 'SN', 51.340, 12.375, 620000, 'buecher', 'Größte Stadt Sachsens. Der Leipziger Hauptbahnhof ist einer der größten Bahnhöfe Europas.'),
    S('chemnitz', 'Chemnitz', 'SN', 50.833, 12.925, 245000, 'maschinen', 'Chemnitz war 2025 Kulturhauptstadt Europas.'),
    S('meissen', 'Meißen', 'SN', 51.164, 13.474, 28000, 'porzellan', 'Hier entstand 1710 die erste Porzellan-Manufaktur Europas. Ihr Zeichen: zwei gekreuzte Schwerter.'),
    S('zwickau', 'Zwickau', 'SN', 50.718, 12.496, 87000, 'autos', 'Hier wurde früher der Trabant gebaut. Heute baut VW in Zwickau Elektroautos.'),
    S('goerlitz', 'Görlitz', 'SN', 51.153, 14.987, 56000, null, 'Die östlichste Stadt Deutschlands. Auf der anderen Seite der Neiße liegt Polen.'),
    // Sachsen-Anhalt
    S('magdeburg', 'Magdeburg', 'ST', 52.131, 11.640, 240000, 'zucker', 'Hier fahren Schiffe auf einer Brücke über die Elbe – die längste Kanalbrücke Europas.'),
    S('halle', 'Halle (Saale)', 'ST', 51.483, 11.970, 240000, 'schokolade', 'Geburtsstadt des Komponisten Händel. Die Halloren-Schokoladenfabrik gibt es seit 1804.'),
    S('wernigerode', 'Wernigerode', 'ST', 51.835, 10.785, 32000, null, 'Die bunte Stadt am Harz. Von hier dampft die Brockenbahn hinauf auf den Brocken.', { tourist: true }),
    S('dessau', 'Dessau', 'ST', 51.835, 12.243, 74000, null, 'Hier steht das Bauhaus – eine berühmte Schule für Kunst und Gestaltung.'),
    // Brandenburg
    S('potsdam', 'Potsdam', 'BB', 52.391, 13.065, 185000, 'spargel', 'Schloss Sanssouci war das Sommerschloss von König Friedrich dem Großen.'),
    S('cottbus', 'Cottbus', 'BB', 51.760, 14.334, 98000, 'braunkohle', 'Hier spricht man auch Sorbisch: Auf den Ortsschildern steht „Chóśebuz“.', { kohle: true }),
    S('luebbenau', 'Lübbenau', 'BB', 51.866, 13.966, 16000, 'gurken', 'Tor zum Spreewald: Kähne fahren auf vielen kleinen Flussarmen, sogar die Post kommt per Kahn.', { tourist: true }),
    S('frankfurt_oder', 'Frankfurt (Oder)', 'BB', 52.347, 14.551, 57000, null, 'Auf der anderen Seite der Oderbrücke liegt die polnische Stadt Słubice.'),
    // Berlin
    S('berlin', 'Berlin', 'BE', 52.520, 13.405, 3700000, 'currywurst', 'Hauptstadt Deutschlands und größte Stadt. Wahrzeichen: das Brandenburger Tor.'),
    // Mecklenburg-Vorpommern
    S('schwerin', 'Schwerin', 'MV', 53.635, 11.401, 97000, null, 'Das Schweriner Schloss steht auf einer Insel im See.'),
    S('rostock', 'Rostock', 'MV', 54.092, 12.099, 210000, null, 'Größte Stadt des Landes, mit großem Ostseehafen in Warnemünde.'),
    S('stralsund', 'Stralsund', 'MV', 54.309, 13.082, 60000, null, 'Über den Rügendamm fahren Züge auf die Insel Rügen.'),
    S('putbus', 'Putbus (Rügen)', 'MV', 54.354, 13.475, 4000, 'kreide', 'Hier startet der „Rasende Roland“: eine kleine Dampfbahn, die höchstens 30 km/h fährt.', { tourist: true }),
    // Schleswig-Holstein
    S('kiel', 'Kiel', 'SH', 54.323, 10.123, 247000, 'sprotten', 'Hier beginnt der Nord-Ostsee-Kanal, die meistbefahrene künstliche Wasserstraße der Welt.'),
    S('luebeck', 'Lübeck', 'SH', 53.866, 10.686, 218000, 'marzipan', 'Das Holstentor ist das Wahrzeichen. Lübeck ist berühmt für Marzipan.'),
    S('husum', 'Husum', 'SH', 54.477, 9.051, 23000, 'krabben', 'Die „graue Stadt am Meer“ an der Nordsee, mit Krabbenkuttern im Hafen.'),
    S('westerland', 'Westerland (Sylt)', 'SH', 54.907, 8.310, 9000, null, 'Auf Sylt führt keine Straße: Nur Züge fahren über den Hindenburgdamm, Autos fahren auf dem Autozug mit.', { tourist: true }),
    // Stadtstaaten
    S('hamburg', 'Hamburg', 'HH', 53.551, 9.994, 1900000, 'container', 'Zweitgrößte Stadt Deutschlands. Hier steht das Miniatur Wunderland – die größte Modelleisenbahn der Welt.'),
    S('bremen', 'Bremen', 'HB', 53.079, 8.802, 570000, 'kaffee', 'Am Rathaus stehen die Bremer Stadtmusikanten: Esel, Hund, Katze und Hahn.'),
    S('bremerhaven', 'Bremerhaven', 'HB', 53.540, 8.581, 114000, 'fischstaebchen', 'Gehört zum Land Bremen, liegt aber rund 60 Kilometer entfernt an der Nordsee.'),
    // Niedersachsen
    S('hannover', 'Hannover', 'NI', 52.376, 9.738, 545000, 'kekse', 'Hier findet jedes Jahr die Hannover Messe statt, eine der größten Messen der Welt.'),
    S('braunschweig', 'Braunschweig', 'NI', 52.264, 10.521, 250000, null, 'Heinrich der Löwe machte die Stadt groß. Der Burglöwe ist ihr Wahrzeichen.'),
    S('wolfsburg', 'Wolfsburg', 'NI', 52.423, 10.787, 125000, 'autos', 'Die VW-Stadt: Hier steht eines der größten Autowerke der Welt.'),
    S('goettingen', 'Göttingen', 'NI', 51.541, 9.916, 118000, null, 'Wer hier seinen Doktor macht, küsst das Gänseliesel – ein Mädchen aus Bronze auf dem Brunnen.'),
    S('emden', 'Emden', 'NI', 53.367, 7.207, 50000, 'tee', 'Hafenstadt in Ostfriesland. In Ostfriesland trinkt man mehr Tee als fast überall sonst.'),
    S('lueneburg', 'Lüneburg', 'NI', 53.249, 10.411, 78000, 'honig', 'Lüneburg wurde durch Salz reich. Ringsum liegt die Lüneburger Heide.'),
    S('goslar', 'Goslar', 'NI', 51.906, 10.429, 50000, 'erz', 'Das alte Erzbergwerk Rammelsberg ist heute Weltkulturerbe.'),
    S('osnabrueck', 'Osnabrück', 'NI', 52.279, 8.047, 165000, null, 'Friedensstadt: 1648 wurde hier und in Münster ein großer Krieg beendet.'),
    // Nordrhein-Westfalen
    S('duesseldorf', 'Düsseldorf', 'NW', 51.227, 6.773, 630000, null, 'Die Königsallee am Rhein ist eine berühmte Einkaufsstraße.'),
    S('koeln', 'Köln', 'NW', 50.938, 6.960, 1080000, 'duftwasser', 'Über 600 Jahre baute man am Kölner Dom, einer der größten Kirchen der Welt.'),
    S('essen', 'Essen', 'NW', 51.456, 7.012, 585000, 'steinkohle', 'Die Zeche Zollverein war einmal eine der größten Kohlezechen der Welt – heute Weltkulturerbe.', { kohle: true }),
    S('duisburg', 'Duisburg', 'NW', 51.435, 6.762, 500000, 'stahl', 'Hier ist der größte Binnenhafen Europas. In Hochöfen wird Stahl gemacht.'),
    S('dortmund', 'Dortmund', 'NW', 51.514, 7.468, 595000, null, 'Größte Stadt im Ruhrgebiet. Hier steht das Deutsche Fußballmuseum.'),
    S('aachen', 'Aachen', 'NW', 50.776, 6.084, 250000, 'printen', 'Kaiser Karl der Große liebte Aachen und ist im Dom begraben.'),
    S('bielefeld', 'Bielefeld', 'NW', 52.021, 8.532, 335000, 'pudding', 'Hier wurde 1891 die Firma Dr. Oetker gegründet – bekannt für Puddingpulver.'),
    S('muenster', 'Münster', 'NW', 51.961, 7.626, 320000, null, 'In Münster fahren besonders viele Menschen Fahrrad – hier sagt man „Leeze“ dazu.'),
    // Hessen
    S('wiesbaden', 'Wiesbaden', 'HE', 50.078, 8.240, 280000, null, 'In Wiesbaden sprudeln heiße Quellen aus der Erde.'),
    S('frankfurt', 'Frankfurt am Main', 'HE', 50.110, 8.682, 770000, 'luftfracht', 'Die Stadt der Hochhäuser, mit dem größten Flughafen Deutschlands.'),
    S('kassel', 'Kassel', 'HE', 51.313, 9.480, 200000, null, 'Hier sammelten die Brüder Grimm Märchen. Über der Stadt steht der Herkules.'),
    S('fulda', 'Fulda', 'HE', 50.551, 9.676, 70000, null, 'Barockstadt mit Dom. Hier ist der heilige Bonifatius begraben.'),
    S('bebra', 'Bebra', 'HE', 50.971, 9.791, 14000, null, 'Eine Eisenbahnerstadt: Hier treffen sich Bahnstrecken aus vier Richtungen. Bis 1990 fuhren von hier die Züge über die Grenze in die DDR.'),
    // Rheinland-Pfalz
    S('mainz', 'Mainz', 'RP', 49.993, 8.247, 220000, null, 'Johannes Gutenberg erfand hier um 1450 den Buchdruck mit beweglichen Buchstaben.'),
    S('koblenz', 'Koblenz', 'RP', 50.356, 7.594, 114000, null, 'Am Deutschen Eck fließt die Mosel in den Rhein.'),
    S('trier', 'Trier', 'RP', 49.750, 6.637, 111000, null, 'Die älteste Stadt Deutschlands: Die Römer bauten hier das Stadttor Porta Nigra.', { tourist: true }),
    S('kaiserslautern', 'Kaiserslautern', 'RP', 49.444, 7.769, 100000, 'holz', 'Mitten im Pfälzerwald, einem der größten zusammenhängenden Wälder Deutschlands.'),
    // Saarland
    S('saarbruecken', 'Saarbrücken', 'SL', 49.240, 6.997, 180000, 'stahl', 'Im Saarland wurde lange Kohle abgebaut und Stahl gemacht.', { kohle: true }),
    // Bayern
    S('muenchen', 'München', 'BY', 48.137, 11.575, 1500000, 'brezeln', 'Im Deutschen Museum stehen echte Loks, Flugzeuge und Schiffe.'),
    S('nuernberg', 'Nürnberg', 'BY', 49.452, 11.077, 530000, 'lebkuchen', 'Von hier fuhr 1835 der erste Zug Deutschlands, der Adler, nach Fürth.'),
    S('augsburg', 'Augsburg', 'BY', 48.371, 10.898, 300000, null, 'Die Fuggerei ist die älteste Sozialsiedlung der Welt – seit 1521.'),
    S('regensburg', 'Regensburg', 'BY', 49.013, 12.102, 155000, null, 'Die Steinerne Brücke über die Donau ist über 850 Jahre alt.'),
    S('wuerzburg', 'Würzburg', 'BY', 49.791, 9.953, 128000, null, 'Die Würzburger Residenz ist ein riesiges Barockschloss und Weltkulturerbe.'),
    S('bamberg', 'Bamberg', 'BY', 49.898, 10.902, 79000, null, 'Das alte Rathaus steht mitten im Fluss. Die Altstadt ist Weltkulturerbe.', { tourist: true }),
    S('coburg', 'Coburg', 'BY', 50.258, 10.965, 41000, null, 'Die Veste Coburg ist eine der größten Burgen Deutschlands. Bis 1920 gehörte Coburg nicht zu Bayern.'),
    S('ingolstadt', 'Ingolstadt', 'BY', 48.766, 11.426, 140000, 'autos', 'Hier baut Audi seine Autos.'),
    S('passau', 'Passau', 'BY', 48.567, 13.431, 53000, null, 'Dreiflüssestadt: Donau, Inn und Ilz fließen hier zusammen.', { tourist: true }),
    S('hof', 'Hof', 'BY', 50.313, 11.912, 46000, null, 'Hof liegt ganz im Norden Bayerns, nah an Sachsen, Thüringen und Tschechien.'),
    // Baden-Württemberg
    S('stuttgart', 'Stuttgart', 'BW', 48.776, 9.183, 630000, 'autos', 'Hier haben Mercedes-Benz und Porsche ihren Sitz.'),
    S('karlsruhe', 'Karlsruhe', 'BW', 49.007, 8.404, 305000, null, 'Die Stadt ist wie ein Fächer gebaut: Viele Straßen laufen auf das Schloss zu.'),
    S('freiburg', 'Freiburg', 'BW', 47.999, 7.842, 235000, 'kuckucksuhren', 'Sonnige Stadt am Schwarzwald, mit kleinen Wasserrinnen in den Straßen: den „Bächle“.'),
    S('ulm', 'Ulm', 'BW', 48.401, 9.988, 128000, null, 'Das Ulmer Münster hat den höchsten Kirchturm der Welt: 161,5 Meter.'),
    S('mannheim', 'Mannheim', 'BW', 49.488, 8.466, 315000, null, 'Carl Benz baute hier das erste richtige Auto und meldete es 1886 zum Patent an.'),
    S('konstanz', 'Konstanz', 'BW', 47.660, 9.175, 85000, 'aepfel', 'Am Bodensee, direkt an der Grenze zur Schweiz.', { tourist: true })
  ];
  const STADT = {};
  STAEDTE.forEach(s => { STADT[s.id] = s; });

  // Startauswahl: Heimatbahnhof in Thüringen
  const HEIMAT_AUSWAHL = ['bad_salzungen', 'eisenach', 'meiningen', 'zella_mehlis', 'gotha', 'erfurt', 'weimar', 'jena', 'arnstadt', 'saalfeld', 'sonneberg', 'gera', 'altenburg', 'nordhausen'];

  // Nachbarländer und Meere (nur Beschriftung auf der Karte)
  const NACHBARN = [
    { name: 'DÄNEMARK', lat: 55.02, lon: 9.75 }, { name: 'POLEN', lat: 52.75, lon: 14.95 }, { name: 'TSCHECHIEN', lat: 50.05, lon: 13.9 },
    { name: 'ÖSTERREICH', lat: 47.55, lon: 13.9 }, { name: 'SCHWEIZ', lat: 47.42, lon: 8.45 }, { name: 'FRANKREICH', lat: 48.75, lon: 7.25 },
    { name: 'LUXEMBURG', lat: 49.75, lon: 6.08 }, { name: 'BELGIEN', lat: 50.45, lon: 5.98 }, { name: 'NIEDERLANDE', lat: 52.45, lon: 6.35 },
    { name: 'Nordsee', lat: 54.25, lon: 7.55, meer: true }, { name: 'Ostsee', lat: 54.72, lon: 11.75, meer: true }
  ];

  // --------------------------------------------------------------------------------------------
  // Züge: echte deutsche Loks und Triebzüge. vmax/baujahr/anzahl = echte Daten (Fakten-Audit), Rest = Spielwerte.
  // seit: true -> baujahr ist das Jahr der Inbetriebnahme (Baubeginn nicht sicher belegt), Anzeige „Im Einsatz seit“.
  //   kmh = Spieltempo, plaetze = Fahrgäste je Fahrt, ladung = Kisten je Fahrt, kohle = Energie je 100 km
  //   (Dampf: Kohle, Diesel: Diesel, Elektro: Strom – alles aus demselben Energielager)
  //   preis in Talern, level = ab welcher Stufe kaufbar, gold = Goldtickets (nur durchs Lernen)
  //   abt: dampf | regional | fern (Abteilung im Laden; seit 16.11.: Dampfloks + heutige Züge, Uli), antrieb: dampf | diesel | elektro | wasserstoff (nur elektro braucht Oberleitung)
  //   art: tender (klein, sparsam), personen, gueter, schnell, schmal (Schmalspur), museum, triebwagen
  //   bonus: { staedte: [...], faktor } = mehr Fahrgäste, wenn die Linie diese Orte anfährt
  //   bild: Zeichnung (Draufsicht auf der Karte + Seitenansicht im Laden), bau: Achsfolge der Dampfloks
  // --------------------------------------------------------------------------------------------
  const L = (id, name, extra) => Object.assign({ id, name }, extra);
  const LOKS = [
    L('t3', 'T 3', { reihe: 'Preußische T 3 (Baureihe 89.70)', art: 'tender', baujahr: 1882, vmax: 40,
      fakt: 'Eine kleine Tenderlok: Kohle und Wasser trägt sie selbst mit, ganz ohne Tender. Sie zog Züge auf Nebenbahnen.',
      kmh: 40, plaetze: 60, ladung: 30, kohle: 15, preis: 600, level: 1, farbe: '#2E7D4F' }),
    L('br94', '94', { reihe: 'Baureihe 94 (Preußische T 16.1)', art: 'gueter', baujahr: 1913, vmax: 60,
      fakt: 'Stark am Berg: Sie zog Züge über steile Strecken im Thüringer Wald, zum Beispiel die Rennsteigbahn.',
      kmh: 60, plaetze: 40, ladung: 90, kohle: 22, preis: 2200, level: 3, farbe: '#1F2A44' }),
    L('br64', '64', { reihe: 'Baureihe 64', spitzname: 'Bubikopf', art: 'personen', baujahr: 1928, vmax: 90, anzahl: 520,
      fakt: 'Ihr Spitzname „Bubikopf“ kommt von einer kurzen Frisur, die damals modern war.',
      kmh: 90, plaetze: 140, ladung: 20, kohle: 20, preis: 4000, level: 4, farbe: '#1F2A44' }),
    L('br86', '86', { reihe: 'Baureihe 86', art: 'gueter', baujahr: 1928, vmax: 70, anzahl: 775,
      fakt: 'Eine Güterzug-Tenderlok für Nebenbahnen – auch in den Bergen des Erzgebirges.',
      kmh: 70, plaetze: 60, ladung: 140, kohle: 25, preis: 6500, level: 6, farbe: '#1F2A44' }),
    L('br38', '38', { reihe: 'Baureihe 38.10 (Preußische P 8)', art: 'personen', baujahr: 1906, vmax: 100,
      fakt: 'Eine der beliebtesten Dampfloks: Über 3500 Stück fuhren in ganz Europa, manche über 60 Jahre lang.',
      kmh: 100, plaetze: 230, ladung: 40, kohle: 30, preis: 11000, level: 8, farbe: '#1F2A44' }),
    L('br41', '41', { reihe: 'Baureihe 41', spitzname: 'Ochsenlok', art: 'gueter', baujahr: 1937, vmax: 90, anzahl: 366,
      fakt: 'Spitzname „Ochsenlok“: Sie zog schnelle Güterzüge, auch mit Tieren für den Markt.',
      kmh: 90, plaetze: 80, ladung: 220, kohle: 38, preis: 17000, level: 10, farbe: '#1F2A44' }),
    L('br44', '44', { reihe: 'Baureihe 44', spitzname: 'Jumbo', art: 'gueter', baujahr: 1926, vmax: 80,
      fakt: 'Der „Jumbo“ hat drei Zylinder und gehört zu den stärksten deutschen Dampfloks. Sie zog schwere Kohle- und Erzzüge.',
      kmh: 80, plaetze: 40, ladung: 360, kohle: 48, preis: 24000, level: 12, farbe: '#1F2A44' }),
    L('br23', '23', { reihe: 'Baureihe 23', art: 'personen', baujahr: 1950, vmax: 110, anzahl: 105,
      fakt: 'Die 23 105 war 1959 die letzte Dampflok, die für die Deutsche Bundesbahn gebaut wurde.',
      kmh: 110, plaetze: 320, ladung: 60, kohle: 35, preis: 33000, level: 14, farbe: '#1F2A44' }),
    L('br03', '03', { reihe: 'Baureihe 03', art: 'schnell', baujahr: 1930, vmax: 120, anzahl: 298,
      fakt: 'Die leichtere Schwester der 01 – darum durfte sie auch über schwächere Brücken fahren.',
      kmh: 120, plaetze: 380, ladung: 40, kohle: 42, preis: 45000, level: 16, farbe: '#1F2A44' }),
    L('br01', '01', { reihe: 'Baureihe 01', art: 'schnell', baujahr: 1926, vmax: 120, anzahl: 241,
      fakt: 'Erkennbar an den riesigen roten Rädern: Sie sind 2 Meter hoch – größer als ein Erwachsener.',
      kmh: 120, plaetze: 460, ladung: 60, kohle: 50, preis: 62000, level: 18, farbe: '#1F2A44' }),
    L('br10', '10', { reihe: 'Baureihe 10', art: 'schnell', baujahr: 1957, vmax: 140, anzahl: 2,
      fakt: 'Nur zwei Stück wurden gebaut: die letzten Schnellzug-Dampfloks der Bundesbahn, vorne mit Stromlinien-Haube.',
      kmh: 140, plaetze: 520, ladung: 60, kohle: 60, preis: 95000, level: 21, farbe: '#1F2A44' }),
    // ---- Regional & Güter ----
    L('rs1', 'RS 1', { reihe: 'Regio-Shuttle RS 1 (Baureihe 650)', abt: 'regional', antrieb: 'diesel', art: 'triebwagen', baujahr: 1996, vmax: 120,
      fakt: 'Ein Triebwagen: Motor, Führerstand und Fahrgäste stecken in einem einzigen Fahrzeug. In Thüringen fährt er zum Beispiel bei der Erfurter Bahn.',
      kmh: 80, plaetze: 70, ladung: 0, kohle: 9, preis: 600, level: 1,   // der erste Zug: wie bei der Süd-Thüringen-Bahn vor Max' Haustür
      bild: { typ: 'triebwagen', form: 'rs1', farbe: '#E4E8EC', zweit: '#3B4A5C', n: 0 } }),
    L('lint', 'LINT 41', { reihe: 'Coradia LINT 41 (Baureihe 648)', abt: 'regional', antrieb: 'diesel', art: 'triebwagen', baujahr: 1999, vmax: 120,
      fakt: 'LINT heißt „Leichter Innovativer Nahverkehrstriebwagen“. Seine zwei Wagen stehen in der Mitte auf einem gemeinsamen Drehgestell.',
      kmh: 115, plaetze: 120, ladung: 0, kohle: 12, preis: 3600, level: 3,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#E4E8EC', zweit: '#C42430', wagen: 'eigen', n: 1 } }),
    L('br232', '232', { reihe: 'Baureihe 232', spitzname: 'Ludmilla', abt: 'regional', antrieb: 'diesel', art: 'gueter', baujahr: 1973, vmax: 120,
      fakt: 'Gebaut in der Sowjetunion für die Reichsbahn der DDR – daher der russische Spitzname „Ludmilla“. Sie zieht schwere Güterzüge.',
      kmh: 100, plaetze: 0, ladung: 160, kohle: 26, preis: 2600, level: 2,   // erste Güterlok (Dampfloks fahren nur noch Sonderfahrten)
      bild: { typ: 'diesel', form: 'ludmilla', farbe: '#A9242B', dach: '#6F767F', wagen: 'gueter', n: 4 } }),
    L('talent2', 'Talent 2', { reihe: 'Talent 2 (Baureihe 442)', spitzname: 'Hamsterbacke', abt: 'regional', antrieb: 'elektro', art: 'triebwagen', baujahr: 2011, seit: true, vmax: 160,
      fakt: 'Wegen seiner rundlichen Front nennen ihn Eisenbahnfans „Hamsterbacke“. Er fährt bis zu 160 km/h schnell.',
      kmh: 140, plaetze: 230, ladung: 0, kohle: 16, preis: 10500, level: 7,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#C42430', zweit: '#E4E8EC', wagen: 'eigen', n: 2 } }),
    L('br612', '612', { reihe: 'Baureihe 612', spitzname: 'RegioSwinger', abt: 'regional', antrieb: 'diesel', art: 'triebwagen', baujahr: 1998, vmax: 160,
      fakt: 'Mit Neigetechnik: In Kurven legt er sich zur Seite wie ein Radfahrer und fährt deshalb schneller durch kurvige Strecken.',
      kmh: 150, plaetze: 150, ladung: 0, kohle: 18, preis: 15000, level: 9,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#C42430', zweit: '#E4E8EC', wagen: 'eigen', n: 1 } }),
    L('dosto', '146 + Dosto', { reihe: 'Baureihe 146 mit Doppelstockwagen', abt: 'regional', antrieb: 'elektro', art: 'personen', baujahr: 2001, vmax: 160,
      fakt: 'Ein Regional-Express mit zwei Stockwerken. Auf der Rückfahrt schiebt die Lok, und der Lokführer steuert vorne aus dem Steuerwagen.',
      kmh: 150, plaetze: 560, ladung: 0, kohle: 26, preis: 17500, level: 10,
      bild: { typ: 'elok', form: 'traxx', farbe: '#C42430', wagen: 'dosto', n: 3 } }),
    L('br185', '185', { reihe: 'Baureihe 185', abt: 'regional', antrieb: 'elektro', art: 'gueter', baujahr: 2000, vmax: 140,
      fakt: 'Eine Güterzuglok für zwei verschiedene Stromsysteme – deshalb kann sie ihre Züge auch in Nachbarländer ziehen.',
      kmh: 120, plaetze: 0, ladung: 520, kohle: 30, preis: 22000, level: 11,
      bild: { typ: 'elok', form: 'traxx', farbe: '#C42430', wagen: 'gueter', n: 5 } }),
    L('desirohc', 'Desiro HC', { reihe: 'Desiro HC (Baureihe 462)', spitzname: 'Rhein-Ruhr-Express', abt: 'regional', antrieb: 'elektro', art: 'triebwagen', baujahr: 2018, seit: true, vmax: 160,
      fakt: 'Die Endwagen haben ein Stockwerk, die Mittelwagen zwei. Eine längere Ausführung fährt als Franken-Thüringen-Express auch nach Thüringen.',
      kmh: 155, plaetze: 640, ladung: 0, kohle: 28, preis: 30000, level: 13,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#E4E8EC', zweit: '#2B2F36', wagen: 'dosto', n: 2 } }),
    L('vectron', 'Vectron', { reihe: 'Baureihe 193 (Siemens Vectron)', abt: 'regional', antrieb: 'elektro', art: 'gueter', baujahr: 2010, vmax: 160,
      fakt: 'Eine Lok für ganz Europa: Je nach Ausführung kommt sie mit mehreren Stromsystemen zurecht und zieht Güterzüge über viele Grenzen.',
      kmh: 130, plaetze: 0, ladung: 900, kohle: 40, preis: 45000, level: 16,
      bild: { typ: 'elok', form: 'traxx', farbe: '#2B2F36', wagen: 'gueter', n: 5 } }),
    // ---- weitere heutige Züge (16.11., Uli: „Züge für ganz Deutschland“; Fakten in tools/volldampf/QUELLEN.md) ----
    L('flirt', 'FLIRT', { reihe: 'Stadler FLIRT (Westfalenbahn)', abt: 'regional', antrieb: 'elektro', art: 'triebwagen', baujahr: 2004, seit: true, vmax: 160,
      fakt: 'FLIRT heißt „Flinker Leichter Intercity- und Regional-Triebzug“. Über 2500 wurden verkauft – in Deutschland fahren fast 500 bei vielen verschiedenen Bahnen.',
      kmh: 130, plaetze: 180, ladung: 0, kohle: 15, preis: 8500, level: 5,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#3E8FC9', zweit: '#C8D84A', wagen: 'eigen', n: 2 } }),
    L('br423', 'S-Bahn 423', { reihe: 'Baureihe 423 (S-Bahn)', abt: 'regional', antrieb: 'elektro', art: 'triebwagen', baujahr: 1999, vmax: 140,
      fakt: 'Die S-Bahn für große Städte: Sie fährt in München, Stuttgart, Frankfurt und Köln. Viele Türen, viele Stehplätze – so steigen alle schnell ein und aus.',
      kmh: 120, plaetze: 420, ladung: 0, kohle: 20, preis: 13000, level: 8,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#C42430', zweit: '#E4E8EC', wagen: 'eigen', n: 2 } }),
    L('mireo', 'Mireo', { reihe: 'Siemens Mireo (Baureihe 463)', abt: 'regional', antrieb: 'elektro', art: 'triebwagen', baujahr: 2020, seit: true, vmax: 160,
      fakt: 'Einer der neuesten Regionalzüge, leicht und sparsam. Beim Bremsen werden seine Motoren zu Stromerzeugern und schicken Strom zurück in die Oberleitung.',
      kmh: 150, plaetze: 300, ladung: 0, kohle: 13, preis: 24000, level: 14,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#EEF0F0', zweit: '#F2C200', wagen: 'eigen', n: 2 } }),
    L('ilint', 'iLint', { reihe: 'Coradia iLint (Baureihe 554)', spitzname: 'Wasserstoffzug', abt: 'regional', antrieb: 'wasserstoff', art: 'triebwagen', baujahr: 2018, seit: true, vmax: 140,
      fakt: 'Der erste Wasserstoffzug der Welt mit Fahrgästen, seit 2018 in Niedersachsen. Er macht aus Wasserstoff selbst Strom – hinten kommt nur Wasserdampf heraus. Oberleitung braucht er nicht.',
      kmh: 135, plaetze: 360, ladung: 0, kohle: 10, preis: 26000, level: 15,
      bild: { typ: 'triebwagen', form: 'br612', farbe: '#1F4FA8', zweit: '#3E9AD8', wagen: 'eigen', n: 1 } }),
    // ---- Fernverkehr ----
    L('ic2', 'IC 2', { reihe: 'Intercity 2 mit Baureihe 146.5', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 2015, seit: true, vmax: 160,
      fakt: 'Der erste Intercity mit zwei Stockwerken: 469 Sitzplätze. Vorne zieht die Lok, am anderen Ende ist ein Steuerwagen mit Führerstand.',
      kmh: 160, plaetze: 520, ladung: 0, kohle: 26, preis: 26000, level: 12,
      bild: { typ: 'elok', form: 'traxx', farbe: '#E8EBEE', wagen: 'dosto', n: 4 } }),
    L('icel', 'ICE L', { reihe: 'ICE L (Talgo 230) mit Vectron', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 2025, seit: true, vmax: 230,
      fakt: 'Der erste ICE ohne Stufen: Man kommt vom Bahnsteig ebenerdig in den Zug – auch mit Rollstuhl oder Kinderwagen. Seine kurzen Wagen kommen aus Spanien.',
      kmh: 200, plaetze: 560, ladung: 0, kohle: 36, preis: 40000, level: 14,
      bild: { typ: 'elok', form: 'traxx', farbe: '#E8EBEE', wagen: 'ice', n: 6 } }),
    L('iceT', 'ICE T', { reihe: 'ICE T (Baureihe 411)', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 1999, seit: true, vmax: 230,
      fakt: 'Ein ICE mit Neigetechnik für kurvige Strecken. Viele Jahre fuhr er durch Thüringen: über Jena und das Saaletal.',
      kmh: 220, plaetze: 380, ladung: 0, kohle: 32, preis: 52000, level: 15,
      bild: { typ: 'ice', form: 'icet', wagen: 'ice', n: 4, schluss: true } }),
    L('ice1', 'ICE 1', { reihe: 'ICE 1 (Baureihe 401)', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 1989, vmax: 280, anzahl: 60,
      fakt: 'Der erste ICE: Seit 1991 fährt er zwischen Hamburg, Frankfurt und München. Vorne und hinten zieht je ein Triebkopf.',
      kmh: 250, plaetze: 700, ladung: 0, kohle: 48, preis: 75000, level: 17,
      bild: { typ: 'ice', form: 'ice1', wagen: 'ice', n: 6, schluss: true } }),
    L('ice3', 'ICE 3', { reihe: 'ICE 3 (Baureihe 403)', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 2000, seit: true, vmax: 330,
      fakt: 'Ein Zug ohne Lok: Die Motoren sitzen verteilt unter den Wagen. Im Alltag fährt er bis zu 300 km/h.',
      kmh: 300, plaetze: 440, ladung: 0, kohle: 44, preis: 110000, level: 20,
      bild: { typ: 'ice', form: 'ice3', wagen: 'ice', n: 5, schluss: true } }),
    L('ice4', 'ICE 4', { reihe: 'ICE 4 (Baureihe 412)', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 2017, seit: true, vmax: 250,
      fakt: 'Der erste ICE mit Stellplätzen für Fahrräder. Die längsten ICE 4 haben 13 Wagen.',
      kmh: 250, plaetze: 900, ladung: 0, kohle: 52, preis: 140000, level: 23,
      bild: { typ: 'ice', form: 'ice4', wagen: 'ice', n: 7, schluss: true } }),
    L('ice3neo', 'ICE 3neo', { reihe: 'ICE 3neo (Baureihe 408)', abt: 'fern', antrieb: 'elektro', art: 'schnell', baujahr: 2022, seit: true, vmax: 320,
      fakt: 'In seine Fenster ist ein feines Raster gelasert: So kommt der Handyempfang besser in den Zug. In Deutschland fährt er bis 300 km/h.',
      kmh: 320, plaetze: 460, ladung: 0, kohle: 50, preis: 165000, level: 24,
      bild: { typ: 'ice', form: 'ice3', wagen: 'ice', n: 5, schluss: true } }),
    // ---- Goldloks (Dampf) ----
    L('br95', '95', { reihe: 'Baureihe 95', spitzname: 'Bergkönigin', art: 'museum', baujahr: 1922, vmax: 65, anzahl: 45,
      fakt: 'Die „Bergkönigin“ zog Züge über die steilsten Strecken, zum Beispiel die Rübelandbahn im Harz.',
      kmh: 70, plaetze: 120, ladung: 260, kohle: 28, preis: 3000, gold: 6, level: 3, farbe: '#1F2A44' }),
    L('hsb', '99 72', { reihe: 'Baureihe 99.72 (Harzer Schmalspurbahnen)', art: 'schmal', baujahr: 1954, vmax: 50, anzahl: 17,
      fakt: 'Fährt bis heute jeden Tag auf den Brocken – auf Schienen, die nur einen Meter auseinanderliegen.',
      kmh: 50, plaetze: 200, ladung: 40, kohle: 15, preis: 2000, gold: 8, level: 2, farbe: '#1F2A44',
      bonus: { staedte: ['wernigerode', 'nordhausen', 'goslar'], faktor: 2 } }),
    L('roland', 'Rasender Roland', { reihe: 'Rügensche Bäderbahn, Spurweite 750 mm', art: 'schmal', baujahr: 1895, vmax: 30,
      fakt: 'Die Bahn auf Rügen gibt es seit 1895. Höchstens 30 km/h – trotzdem heißt sie „Rasender Roland“.',
      kmh: 30, plaetze: 220, ladung: 30, kohle: 8, preis: 2000, gold: 8, level: 2, farbe: '#1F2A44',
      bonus: { staedte: ['putbus', 'stralsund', 'westerland'], faktor: 2.5 } }),
    L('saxonia', 'Saxonia', { reihe: 'Erste in Deutschland gebaute Dampflok', art: 'museum', baujahr: 1838, vmax: null,
      fakt: 'Johann Andreas Schubert baute sie 1838 bei Dresden – die erste Dampflok aus Deutschland.',
      kmh: 45, plaetze: 160, ladung: 60, kohle: 10, preis: 5000, gold: 10, level: 4, farbe: '#3A5A2A',
      bonus: { staedte: ['dresden', 'leipzig'], faktor: 2 } }),
    L('adler', 'Adler', { reihe: 'Erster Zug Deutschlands', art: 'museum', baujahr: 1835, vmax: null,
      fakt: 'Am 7. Dezember 1835 fuhr der Adler von Nürnberg nach Fürth – der erste Zug in Deutschland. Gebaut wurde er in England.',
      kmh: 40, plaetze: 180, ladung: 30, kohle: 8, preis: 5000, gold: 12, level: 5, farbe: '#2F6B3A',
      bonus: { staedte: ['nuernberg'], faktor: 3 } }),
    L('br05', '05', { reihe: 'Baureihe 05', art: 'schnell', baujahr: 1935, vmax: 175, anzahl: 3,
      fakt: 'Weltrekord! Am 11. Mai 1936 fuhr die 05 002 mit 200,4 km/h – so schnell war keine Dampflok vorher.',
      kmh: 175, plaetze: 520, ladung: 0, kohle: 65, preis: 40000, gold: 20, level: 12, farbe: '#8E1B22' }),
    L('br18201', '18 201', { reihe: 'Baureihe 18.2', art: 'schnell', baujahr: 1961, vmax: 180, anzahl: 1,
      fakt: 'Die schnellste betriebsfähige Dampflok der Welt: 180 km/h. Gebaut im Dampflokwerk Meiningen.',
      kmh: 180, plaetze: 560, ladung: 0, kohle: 65, preis: 50000, gold: 25, level: 15, farbe: '#1A4A2E' })
  ];
  // Dampfloks: Achsfolge für die Seitenansicht (vorn = Laufachsen vorn, kuppel = Kuppelachsen, hinten = hintere Laufachsen,
  // rad = Radius der Treibräder) und Bauart (tank = Tenderlok, tender = mit Schlepptender, strom = Stromlinie, frueh = 1830er)
  const BAU = {
    t3: { typ: 'tank', kuppel: 3, rad: 6.5, laenge: 66 },
    br94: { typ: 'tank', kuppel: 5, rad: 6.5, laenge: 92 },
    br64: { typ: 'tank', vorn: 1, kuppel: 3, rad: 7.5, hinten: 1, laenge: 92 },
    br86: { typ: 'tank', vorn: 1, kuppel: 4, rad: 6.8, hinten: 1, laenge: 100 },
    br95: { typ: 'tank', vorn: 1, kuppel: 5, rad: 7, hinten: 1, laenge: 112 },
    hsb: { typ: 'tank', vorn: 1, kuppel: 5, rad: 5.2, hinten: 1, laenge: 92, schmal: true },
    roland: { typ: 'tank', vorn: 1, kuppel: 4, rad: 5, hinten: 1, laenge: 84, schmal: true },
    br38: { typ: 'tender', vorn: 2, kuppel: 3, rad: 8.8, laenge: 96, tender: 3 },
    br41: { typ: 'tender', vorn: 1, kuppel: 4, rad: 8, hinten: 1, laenge: 108, tender: 4, bleche: true },
    br44: { typ: 'tender', vorn: 1, kuppel: 5, rad: 7.2, laenge: 110, tender: 4, bleche: true },
    br23: { typ: 'tender', vorn: 1, kuppel: 3, rad: 8.8, hinten: 1, laenge: 100, tender: 4, bleche: true },
    br03: { typ: 'tender', vorn: 2, kuppel: 3, rad: 10, hinten: 1, laenge: 108, tender: 4, bleche: true },
    br01: { typ: 'tender', vorn: 2, kuppel: 3, rad: 10.3, hinten: 1, laenge: 110, tender: 4, bleche: true },
    br10: { typ: 'strom', vorn: 2, kuppel: 3, rad: 10, hinten: 1, laenge: 112, tender: 4, halb: true },
    br05: { typ: 'strom', vorn: 2, kuppel: 3, rad: 11, hinten: 2, laenge: 118, tender: 4, farbe: '#7A2420' },
    br18201: { typ: 'tender', vorn: 2, kuppel: 3, rad: 11, hinten: 1, laenge: 112, tender: 4, bleche: true, farbe: '#1E4A33' },
    saxonia: { typ: 'frueh', vorn: 1, kuppel: 2, rad: 7.5, laenge: 58, tender: 2, farbe: '#2C4A35' },
    adler: { typ: 'frueh', vorn: 1, kuppel: 1, rad: 10.5, hinten: 1, laenge: 58, tender: 2, farbe: '#2C4A35' }
  };
  LOKS.forEach(l => {
    if (!l.antrieb) l.antrieb = 'dampf';
    if (!l.abt) l.abt = 'dampf';
    if (l.antrieb === 'dampf') {
      l.bau = BAU[l.id] || { typ: 'tender', vorn: 1, kuppel: 3, rad: 9, laenge: 100, tender: 4 };
      const frueh = l.bau.typ === 'frueh';
      l.bild = { typ: 'dampf', farbe: l.bau.farbe || '#1C1F23', tender: !!l.bau.tender, frueh, strom: l.bau.typ === 'strom',
        wagen: frueh ? 'frueh' : l.art === 'gueter' ? 'gueter' : l.art === 'schmal' ? 'schmal' : 'gruen',
        n: l.art === 'tender' || l.art === 'schmal' || frueh ? 2 : l.art === 'schnell' ? 4 : 3 };
    }
  });
  // Dampfloks sind Belohnungen (Uli 16.11.): Es gibt sie nur für Goldtickets, jede einmal, und sie fahren wie heute in echt
  // nur Sonderfahrten und Museumsbahnen (LINIEN mit dampf: true). Der normale Betrieb läuft mit heutigen Zügen.
  const DAMPF_GOLD = { t3: 1, br94: 1, br64: 2, br86: 2, br38: 3, br41: 3, br44: 4, br23: 4, br03: 5, br01: 6, br10: 8 };
  LOKS.forEach(l => { if (l.antrieb === 'dampf') { if (!l.gold) l.gold = DAMPF_GOLD[l.id] || 3; l.preis = 0; } });
  const LOK = {};
  LOKS.forEach(l => { LOK[l.id] = l; });
  const ANTRIEB = { dampf: { name: 'Dampf', stoff: 'Kohle' }, diesel: { name: 'Diesel', stoff: 'Diesel' }, elektro: { name: 'Elektro', stoff: 'Strom' },
    wasserstoff: { name: 'Wasserstoff', stoff: 'Wasserstoff', kurz: 'H₂' } };
  const ABTEILUNG = { regional: 'Regional & Güter', fern: 'Fernverkehr', dampf: 'Dampfloks' };

  // --------------------------------------------------------------------------------------------
  // Gebäude am Bahnhof (je Bahnhof jedes einmal). Wirkung im Modell, Zeichnung in der Karte (Nahansicht).
  // --------------------------------------------------------------------------------------------
  const GEBAEUDE = {
    stellwerk: { name: 'Stellwerk', preis: 1500, level: 2, icon: 'signal',
      text: 'Stellt Weichen und Signale. Züge halten hier nur halb so lange und fahren öfter.' },
    gaststaette: { name: 'Bahnhofsgaststätte', preis: 2500, level: 3, icon: 'fahrgast',
      text: 'Reisende kommen gern hierher: Fahrkarten nach diesem Bahnhof bringen 25 % mehr Geld.' },
    gueterhalle: { name: 'Güterhalle', preis: 4000, level: 4, icon: 'kiste', nurWare: true,
      text: 'Lager mit Laderampe: Hier stehen doppelt so viele Kisten bereit.' },
    betriebswerk: { name: 'Betriebswerk', preis: 9000, level: 6, icon: 'schuppen', max: 3, steigt: 2,
      text: 'Ringlokschuppen mit Drehscheibe: Platz für 2 weitere Züge in deinem Fuhrpark. Höchstens drei, jedes weitere kostet das Doppelte.' }
  };

  // --------------------------------------------------------------------------------------------
  // Großprojekte (Uli 18.11.2026: Max hatte nach wenigen Stunden 90 Mio. € – Geld braucht ein Ziel, „er soll langfristig
  // Spaß haben“). Echte Bauwerke, je drei Bauabschnitte (Preis in Spiel-Einheiten = 1000 €, Bauzeit in echten Minuten,
  // läuft auch, wenn das Spiel zu ist). Wirkung erst nach dem letzten Abschnitt:
  //   bahnhof: Fahrgäste und Waren in `stadt` × faktor · werk: `plaetze` mehr im Fuhrpark ·
  //   tempo: Züge auf den Abschnitten der Bahnstrecken `bahnen` fahren × faktor so schnell (Dampf ausgenommen)
  // Voraussetzung: Stufe + `stadt` angeschlossen bzw. alle Abschnitte von `bahnen` gebaut. Quellen: tools/volldampf/QUELLEN.md
  // --------------------------------------------------------------------------------------------
  const PROJEKTE = [
    { id: 'erfurt', name: 'ICE-Knoten Erfurt', art: 'bahnhof', stadt: 'erfurt', faktor: 2, level: 6, gold: 2, xp: 60,
      fakt: 'Seit 2017 kreuzen sich in Erfurt die schnellen ICE-Strecken von Berlin nach München und von Frankfurt nach Dresden. Hier steigen viele Reisende um.',
      abschnitte: [
        { name: 'Neuer Hauptbahnhof', preis: 15000, min: 20, text: 'Ab 2002 wird der Erfurter Hauptbahnhof ganz neu gebaut.' },
        { name: 'Brücken und Gleise', preis: 20000, min: 30, text: 'Neue Eisenbahnbrücken führen die Schnellfahrstrecken bis an die Bahnsteige.' },
        { name: 'Der Knoten geht in Betrieb', preis: 30000, min: 40, text: 'Die ICE kommen fast gleichzeitig an – so geht das Umsteigen schnell.' }] },
    { id: 'vde8', name: 'Schnellfahrstrecke VDE 8', art: 'tempo', bahnen: ['Schnellfahrstrecke Nürnberg–Erfurt', 'Schnellfahrstrecke Erfurt–Leipzig/Halle'], faktor: 1.5, level: 9, gold: 3, xp: 90,
      fakt: 'Das „Verkehrsprojekt Deutsche Einheit Nr. 8“ verbindet seit 2017 Nürnberg über Erfurt mit Halle und Leipzig. Seitdem fährt der schnellste ICE von Berlin nach München in rund vier Stunden.',
      abschnitte: [
        { name: 'Bleßbergtunnel', preis: 40000, min: 30, text: 'Rund 8 km lang: der längste Tunnel der Strecke, mitten durch den Thüringer Wald.' },
        { name: 'Saale-Elster-Talbrücke', preis: 60000, min: 45, text: 'Rund 8,6 km lang: die längste Eisenbahnbrücke Deutschlands.' },
        { name: 'Freigabe für 300 km/h', preis: 80000, min: 60, text: 'Probefahrten, dann dürfen die ICE mit 300 km/h fahren.' }] },
    { id: 'leipzig', name: 'City-Tunnel Leipzig', art: 'bahnhof', stadt: 'leipzig', faktor: 2, level: 11, gold: 3, xp: 110,
      fakt: 'Seit Dezember 2013 fahren S-Bahnen in einem Tunnel quer unter der Leipziger Innenstadt hindurch – vom Hauptbahnhof bis zum Bayerischen Bahnhof.',
      abschnitte: [
        { name: 'Tunnel unter der Altstadt', preis: 60000, min: 45, text: 'Zwei Tunnelröhren werden unter den Häusern der Innenstadt gegraben.' },
        { name: 'Vier Stationen unter der Erde', preis: 90000, min: 60, text: 'Hauptbahnhof (tief), Markt, Wilhelm-Leuschner-Platz und Bayerischer Bahnhof.' },
        { name: 'Die erste S-Bahn fährt', preis: 120000, min: 90, text: 'Das S-Bahn-Netz Mitteldeutschland startet.' }] },
    { id: 'cottbus', name: 'ICE-Werk Cottbus', art: 'werk', stadt: 'cottbus', plaetze: 3, level: 13, gold: 3, xp: 130,
      fakt: 'Das größte ICE-Werk der Bahn. Seit 2024 werden hier ICE 4 gewartet. Die erste Halle ist rund 445 m lang – da passt der längste ICE 4 mit 374 m ganz hinein.',
      abschnitte: [
        { name: 'Baufeld am alten Bahnwerk', preis: 80000, min: 45, text: 'In Cottbus werden schon seit über 100 Jahren Lokomotiven repariert.' },
        { name: 'Die lange Werkhalle', preis: 120000, min: 60, text: 'Ein ganzer ICE passt hinein, Arbeitsbühnen reichen bis aufs Dach.' },
        { name: 'Der erste ICE in der Halle', preis: 160000, min: 90, text: 'Weniger als zwei Jahre nach dem Baustart ist die erste Halle fertig.' }] },
    { id: 'berlin', name: 'Berlin Hauptbahnhof', art: 'bahnhof', stadt: 'berlin', faktor: 2, level: 15, gold: 4, xp: 160,
      fakt: 'Eröffnet 2006. Der größte Kreuzungsbahnhof Europas: Oben fahren die Züge von Osten nach Westen, tief unten im Tunnel von Norden nach Süden.',
      abschnitte: [
        { name: 'Tunnel unter dem Tiergarten', preis: 120000, min: 60, text: 'Die Nord-Süd-Strecke verschwindet unter Park, Spree und Regierungsviertel.' },
        { name: 'Glashalle und Bügelbauten', preis: 160000, min: 90, text: 'Zwei Bürotürme überspannen die gläserne Halle wie Bügel.' },
        { name: 'Eröffnung', preis: 220000, min: 120, text: 'Im Mai 2006, kurz vor der Fußball-WM, fahren die ersten Züge.' }] },
    { id: 'koelnrm', name: 'Schnellfahrstrecke Köln–Rhein/Main', art: 'tempo', bahnen: ['Schnellfahrstrecke Köln–Rhein/Main'], faktor: 1.5, level: 17, gold: 4, xp: 190,
      fakt: 'Seit 2002 fahren ICE von Köln nach Frankfurt in rund einer Stunde – auf der alten Strecke am Rhein entlang dauert es über zwei Stunden.',
      abschnitte: [
        { name: 'Tunnel und Talbrücken', preis: 160000, min: 60, text: 'Die Strecke führt fast schnurgerade durch Westerwald und Taunus.' },
        { name: 'Steigungen bis 40 Promille', preis: 220000, min: 90, text: 'So steil wie keine andere Schnellfahrstrecke: Das schaffen nur starke ICE.' },
        { name: 'Freigabe für 300 km/h', preis: 300000, min: 120, text: 'Die erste Strecke Deutschlands, die für 300 km/h gebaut wurde.' }] },
    { id: 'hwue', name: 'Schnellfahrstrecke Hannover–Würzburg', art: 'tempo', bahnen: ['Schnellfahrstrecke Hannover–Würzburg'], faktor: 1.5, level: 20, gold: 5, xp: 240,
      fakt: 'Eine der ersten Schnellfahrstrecken Deutschlands. Mit ihrer Eröffnung 1991 begann der ICE-Verkehr.',
      abschnitte: [
        { name: 'Landrückentunnel', preis: 220000, min: 90, text: 'Fast 11 km lang: der längste Eisenbahntunnel Deutschlands.' },
        { name: 'Mündener Tunnel', preis: 300000, min: 120, text: 'Gut 10,5 km: der zweitlängste – er liegt an derselben Strecke.' },
        { name: 'Der erste ICE', preis: 400000, min: 150, text: 'Im Juni 1991 fahren die ersten ICE im Liniendienst.' }] }
  ];
  const PROJEKT = {}; PROJEKTE.forEach(p => { PROJEKT[p.id] = p; });

  // --------------------------------------------------------------------------------------------
  // Neuigkeiten nach einem Update (Uli 18.11.2026: „Max soll eine Benachrichtigung über das Update und die Neuerungen bei
  // Spielstart bekommen“). Neueste zuletzt. Wer schon spielt, sieht jede einmal beim Spielstart; neue Spieler nicht (Einführung).
  // Bei jedem neuen Eintrag auch NEU in volldampf-lader.js anpassen (Hinweis auf der Kachel), der Modelltest prüft das.
  // zeige: welches Blatt sich nach dem Knopf öffnet.
  // --------------------------------------------------------------------------------------------
  const NEUERUNGEN = [
    { id: '2026-11-18-grossprojekte', titel: 'Großprojekte', unter: 'Neu bei Volldampf', knopf: 'Großprojekte ansehen', zeige: 'projekte',
      punkte: [
        { icon: 'kran', titel: 'Echte Bauwerke der Bahn.', text: 'Bau den ICE-Knoten Erfurt, Tunnel und Brücken für Schnellfahrstrecken, ein ICE-Werk und mehr – sieben Großprojekte, die es wirklich gibt.' },
        { icon: 'uhr', titel: 'Drei Bauabschnitte.', text: 'Jeder Abschnitt kostet viel Geld und braucht Zeit. Gebaut wird auch, wenn das Spiel zu ist. Es gibt immer nur eine Großbaustelle.' },
        { icon: 'stern', titel: 'Große Wirkung.', text: 'Ist ein Projekt fertig, kommen mehr Fahrgäste, deine Züge fahren schneller oder dein Fuhrpark wird größer. Dazu gibt es Goldtickets.' },
        { icon: 'muenze', titel: 'Wofür sich Sparen lohnt.', text: 'Die Großprojekte kosten zwischen 65 Mio. € und 920 Mio. €. Du findest sie unten über den Knopf „Großprojekte“ und rechts unter „Weitere Ziele“.' }] },
    { id: '2026-11-19-knopf-gold', titel: 'Großprojekte-Knopf und Goldtickets', unter: 'Neu bei Volldampf', knopf: 'Großprojekte ansehen', zeige: 'projekte',
      punkte: [
        { icon: 'kran', titel: 'Eigener Knopf.', text: 'Unten neben „Sammlung“ findest du jetzt alle Großprojekte: was du schon gebaut hast, was als Nächstes geht und was es kostet.' },
        { icon: 'liste', titel: 'Aufträge wieder oben.', text: 'Rechts stehen deine Aufträge jetzt wieder ganz oben. Linienkarte und Großprojekt findest du darunter bei „Weitere Ziele“.' },
        { icon: 'ticket', titel: 'Goldtickets bleiben besonders.', text: 'Fürs Lernen gibt es jetzt höchstens 3 Goldtickets am Tag. Jede Lernrunde bringt weiter Energie und Volldampf. Goldtickets gibt es außerdem für neue Bundesländer, Linienkarten und Großprojekte.' }] }
  ];


  // --------------------------------------------------------------------------------------------
  // Linienkarten: echte Zuglinien als Ziel. halte = Weg über das Gleisnetz (jede Nachbarschaft ist eine Strecke der Karte),
  // zuege = Fahrzeuge, die dort in echt fahren (Bonus), sonst antrieb. Quellen/Vereinfachungen: tools/volldampf/QUELLEN.md
  // --------------------------------------------------------------------------------------------
  const LINIEN = [
    { id: 'werrabahn', art: 'Regionalbahn', name: 'Werrabahn Eisenach – Meiningen', halte: ['eisenach', 'bad_salzungen', 'meiningen'], zuege: ['rs1'],
      info: 'Hier fährt die Süd-Thüringen-Bahn mit dem RegioShuttle.' },
    { id: 'stb_rennsteig', art: 'Regionalbahn', name: 'Erfurt – Meiningen über den Rennsteig', halte: ['erfurt', 'arnstadt', 'zella_mehlis', 'meiningen'], zuege: ['rs1'],
      info: 'Der Zug fährt im Brandleitetunnel unter dem Rennsteig hindurch.' },
    { id: 'mdv', art: 'Regionalexpress', name: 'Mitte-Deutschland-Verbindung Weimar – Gera', halte: ['weimar', 'jena', 'gera'], zuege: ['br612'],
      info: 'Ohne Oberleitung: Hier fahren Dieseltriebwagen mit Neigetechnik.' },
    { id: 'rodelblitz', art: 'Dampf-Sonderzug', name: 'Rodelblitz Eisenach – Arnstadt', halte: ['eisenach', 'bad_salzungen', 'meiningen', 'zella_mehlis', 'arnstadt'], dampf: true,
      info: 'An Winterwochenenden dampft der Rodelblitz durch den Thüringer Wald – mit Schlitten im Gepäck nach Oberhof.' },
    { id: 'dampfloktage', art: 'Dampf-Sonderzug', name: 'Sonderzug zu den Meininger Dampfloktagen', halte: ['erfurt', 'arnstadt', 'zella_mehlis', 'meiningen'], dampf: true,
      info: 'Jedes Jahr im September kommen Sonderzüge mit Dampfloks zum Dampflokwerk Meiningen. Dort werden bis heute Dampfloks repariert.' },
    { id: 'volldampf_th', art: 'Dampf-Sonderzug', name: 'Volldampf nach Thüringen Berlin – Eisenach', halte: ['berlin', 'leipzig', 'weimar', 'erfurt', 'gotha', 'eisenach'], dampf: true,
      info: 'Eisenbahnvereine fahren mit ihren Dampfloks Ausflugszüge von Berlin nach Erfurt, Gotha und Eisenach.' },
    { id: 'lausitz', art: 'Dampf-Sonderzug', name: 'Jubiläumszug Cottbus – Berlin', halte: ['cottbus', 'luebbenau', 'berlin'], dampf: true,
      info: 'Der Lausitzer Dampflok Club fährt mit seinen Loks Sonderzüge ab Cottbus.' },
    { id: 'mosel_dampf', art: 'Dampf-Sonderzug', name: 'Dampfspektakel an der Mosel Koblenz – Trier', halte: ['koblenz', 'trier'], dampf: true },
    { id: 'schwarzwald_dampf', art: 'Dampf-Sonderzug', name: 'Dampf über die Schwarzwaldbahn', halte: ['karlsruhe', 'konstanz'], dampf: true },
    { id: 'harzquerbahn', art: 'Museumsbahn', name: 'Harzquerbahn Nordhausen – Wernigerode', halte: ['nordhausen', 'wernigerode'], dampf: true, zuege: ['hsb'],
      info: 'Auf der Schmalspurbahn durch den Harz fahren bis heute jeden Tag Dampfloks.' },
    { id: 'fte', art: 'Regionalexpress', name: 'Franken-Thüringen-Express Nürnberg – Sonneberg', halte: ['nuernberg', 'bamberg', 'coburg', 'sonneberg'], zuege: ['talent2'] },
    { id: 'sbahn_md', art: 'S-Bahn', name: 'S-Bahn Mitteldeutschland Halle – Zwickau', halte: ['halle', 'leipzig', 'altenburg', 'zwickau'], zuege: ['talent2'],
      info: 'In Leipzig fahren die S-Bahnen durch den City-Tunnel unter der Innenstadt.' },
    { id: 'sbahn_dresden', art: 'S-Bahn', name: 'S-Bahn Dresden – Meißen', halte: ['dresden', 'meissen'], zuege: ['dosto'] },
    { id: 're1_bb', art: 'Regionalexpress', name: 'RE 1 Magdeburg – Berlin – Frankfurt (Oder)', halte: ['magdeburg', 'potsdam', 'berlin', 'frankfurt_oder'], zuege: ['desirohc'] },
    { id: 'rrx', art: 'Regionalexpress', name: 'Rhein-Ruhr-Express Köln – Dortmund', halte: ['koeln', 'duesseldorf', 'duisburg', 'essen', 'dortmund'], zuege: ['desirohc'],
      info: 'Eine der dichtesten Strecken Deutschlands: Hier folgt Zug auf Zug.' },
    { id: 'sbahn_rm', art: 'S-Bahn', name: 'S-Bahn Rhein-Main Wiesbaden – Frankfurt', halte: ['wiesbaden', 'mainz', 'frankfurt'], zuege: ['br423'] },
    { id: 'harz_elbe', art: 'Regionalexpress', name: 'Magdeburg – Wernigerode in den Harz', halte: ['magdeburg', 'wernigerode'], zuege: ['lint'] },
    { id: 'emsland', art: 'Regionalexpress', name: 'Emsland-Express Münster – Emden', halte: ['muenster', 'emden'], zuege: ['flirt'],
      info: 'Die Westfalenbahn fährt hier mit FLIRT-Triebzügen bis an die Nordsee.' },
    { id: 'mosel', art: 'Regionalexpress', name: 'Südwest-Express Koblenz – Saarbrücken', halte: ['koblenz', 'trier', 'saarbruecken'], zuege: ['flirt'],
      info: 'Die Strecke folgt den Schleifen von Mosel und Saar.' },
    { id: 'rheintal', art: 'Regionalexpress', name: 'Rheintalbahn Karlsruhe – Freiburg', halte: ['karlsruhe', 'freiburg'], zuege: ['mireo', 'desirohc'] },
    { id: 'schwarzwald', art: 'Regionalexpress', name: 'Schwarzwaldbahn Karlsruhe – Konstanz', halte: ['karlsruhe', 'konstanz'], zuege: ['dosto'],
      info: 'Mit 39 Tunneln durch den Schwarzwald bis an den Bodensee.' },
    { id: 'franken_sachsen', art: 'Regionalexpress', name: 'Nürnberg – Hof', halte: ['nuernberg', 'hof'], zuege: ['br612'] },
    { id: 'marschbahn', art: 'Fernzug', name: 'Marschbahn Hamburg – Westerland', halte: ['hamburg', 'husum', 'westerland'], antrieb: 'diesel',
      info: 'Über den Hindenburgdamm auf die Insel Sylt – ohne Oberleitung.' },
    { id: 'ic_rostock', art: 'Intercity', name: 'Intercity Dresden – Berlin – Rostock', halte: ['dresden', 'berlin', 'rostock'], zuege: ['ic2'],
      info: 'Im Sommer fahren die Züge weiter bis an den Strand von Warnemünde.' },
    { id: 'ic_nordsee', art: 'Intercity', name: 'Intercity an die Nordsee Bremen – Emden', halte: ['bremen', 'emden'], zuege: ['ic2'] },
    { id: 'gaeubahn', art: 'Intercity', name: 'Gäubahn Stuttgart – Konstanz', halte: ['stuttgart', 'konstanz'], zuege: ['ic2'] },
    { id: 'hafen', art: 'Güterzug', name: 'Containerzug Bremerhaven – Nürnberg', halte: ['bremerhaven', 'bremen', 'hannover', 'goettingen', 'bebra', 'fulda', 'wuerzburg', 'nuernberg'], zuege: ['br185', 'vectron'],
      info: 'Vom Seehafen quer durch Deutschland: Über Bebra rollen besonders viele Güterzüge.' },
    { id: 'ice_k_f', art: 'ICE', name: 'ICE Köln – Frankfurt', halte: ['koeln', 'frankfurt'], zuege: ['ice3', 'ice3neo'],
      info: 'Mit 300 km/h neben der Autobahn A 3.' },
    { id: 'ice_b_hh', art: 'ICE', name: 'ICE Berlin – Hamburg', halte: ['berlin', 'hamburg'], zuege: ['ice1', 'ice4', 'iceT', 'ice3'],
      info: 'Schon 1933 fuhr hier der „Fliegende Hamburger“ in 2 Stunden 18 Minuten.' },
    { id: 'dampf_b_hh', art: 'Dampf-Schnellzug', name: 'Rekordstrecke Hamburg – Berlin', halte: ['hamburg', 'berlin'], dampf: true, zuege: ['br05', 'br01', 'br03', 'br10', 'br18201'],
      info: 'Hier fuhr 1936 die Dampflok 05 002 über 200 km/h – Weltrekord.' },
    { id: 'ice_f_dd', art: 'ICE', name: 'ICE Frankfurt – Erfurt – Dresden', halte: ['frankfurt', 'fulda', 'bebra', 'eisenach', 'gotha', 'erfurt', 'weimar', 'leipzig', 'dresden'], zuege: ['iceT', 'ice1', 'ice4', 'ic2'] },
    { id: 'ice_b_k', art: 'ICE', name: 'ICE Berlin – Köln', halte: ['berlin', 'wolfsburg', 'hannover', 'bielefeld', 'dortmund', 'essen', 'duisburg', 'duesseldorf', 'koeln'], zuege: ['ice1', 'ice4', 'ice3', 'icel'],
      info: 'Zwischen Berlin und Wolfsburg fahren die Züge bis zu 250 km/h.' },
    { id: 'ice_ma_m', art: 'ICE', name: 'ICE Mannheim – Stuttgart – München', halte: ['mannheim', 'stuttgart', 'ulm', 'augsburg', 'muenchen'], zuege: ['ice3', 'ice4', 'ice1', 'ice3neo'] },
    { id: 'ice_hh_m', art: 'ICE', name: 'ICE Hamburg – München', halte: ['hamburg', 'lueneburg', 'hannover', 'goettingen', 'kassel', 'fulda', 'wuerzburg', 'nuernberg', 'ingolstadt', 'muenchen'], zuege: ['ice1', 'ice4', 'ice3'],
      info: 'Zwischen Hannover und Würzburg liegt die erste deutsche Schnellfahrstrecke für den ICE, fertig seit 1991.' },
    { id: 'ice_b_m', art: 'ICE', name: 'ICE Berlin – München', halte: ['berlin', 'leipzig', 'halle', 'erfurt', 'coburg', 'bamberg', 'nuernberg', 'ingolstadt', 'muenchen'], zuege: ['ice3', 'ice3neo', 'ice4', 'ice1', 'iceT'],
      info: 'Seit 2017 braucht der schnellste ICE von Berlin nach München weniger als vier Stunden.' }
  ];
  const LINIE = {}; LINIEN.forEach(l => { LINIE[l.id] = l; });

  return { LAENDER, WAREN, STAEDTE, STADT, LOKS, LOK, HEIMAT_AUSWAHL, NACHBARN, ANTRIEB, ABTEILUNG, GEBAEUDE, PROJEKTE, PROJEKT, NEUERUNGEN, LINIEN, LINIE };
})();
if (typeof module !== 'undefined') module.exports = VolldampfDaten;
