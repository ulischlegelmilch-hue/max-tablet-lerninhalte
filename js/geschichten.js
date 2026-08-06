// Ganze Kapitelgeschichten zum Lesen üben. Eigene, altersgerechte Geschichten
// für ca. 9-Jährige: Abenteuer, Detektiv, Fantasy/Ritter/Magie, Tiere.
const Geschichten = (function () {
  const bank = [
    {
      emoji: '🕵️',
      titel: 'Der Fall des verschwundenen Fahrrads',
      kapitel: [
        {
          titel: 'Kapitel 1: Der Diebstahl',
          absaetze: [
            'Finn war der beste Detektiv der Klasse 4b – jedenfalls behauptete er das von sich selbst, seit er im Sommer alle fünf Bände seiner Lieblings-Krimireihe durchgelesen hatte. Als Emma an einem Montagmorgen aufgelöst auf den Schulhof gerannt kam, wusste Finn: Endlich ein echter Fall!',
            '"Mein Fahrrad ist weg!", rief Emma. "Ich habe es gestern Abend nur kurz am Zaun vom Sportplatz abgestellt, um noch schnell den Ball zu holen. Als ich zurückkam, war es verschwunden!"',
            'Finn zückte sein kariertes Notizbuch, das er seit Wochen immer dabeihatte, für genau so einen Moment. "Keine Sorge", sagte er wichtig, "ich übernehme den Fall." Seine beste Freundin Zoe, die viel besser aufpassen konnte als er, schloss sich sofort an.'
          ]
        },
        {
          titel: 'Kapitel 2: Die falsche Spur',
          absaetze: [
            'Am Tatort, dem alten Zaun neben dem Sportplatz, fanden sie frische Reifenspuren im Matsch – aber sie waren viel breiter als die von Emmas schmalem Fahrrad. Direkt daneben hing ein blauer Wollfaden am Drahtzaun.',
            '"Ein Mountainbike", flüsterte Zoe. "Und schau, der Faden – von einer Mütze oder einem Schal." Die beiden folgten den breiten Reifenspuren durch die Pfützen, quer über den Schulhof, bis zum Fahrradkeller der Nachbarschule. Dort trafen sie einen älteren Jungen namens Ben, der eine auffällige blaue Mütze trug – exakt die Farbe des Wollfadens!',
            '"Der war\'s!", flüsterte Finn aufgeregt und wollte ihn schon zur Rede stellen. Doch als sie näherkamen, sahen sie: Ben hatte sein eigenes, kaputtes Fahrrad dabei, mit einem platten Reifen. Emmas Fahrrad war nirgends zu sehen. Die Spur war eine Sackgasse.'
          ]
        },
        {
          titel: 'Kapitel 3: Die echte Lösung',
          absaetze: [
            'Enttäuscht setzten sich Finn und Zoe auf eine Bank, um nachzudenken. "Warte", sagte Zoe plötzlich, "die Reifenspuren waren breit wie von einem Mountainbike – aber Ben fährt gar keins, seins hat schmale Rennradreifen!" Sie mussten die Spur neu verfolgen, diesmal in die andere Richtung, die sie beim ersten Mal übersehen hatten.',
            'Diesmal führten die Spuren zu einer Baustelle am Ende der Straße. Dort, halb unter einer Plane versteckt, stand Emmas Fahrrad – der Bauleiter hatte es versehentlich mit weggeräumt, weil er dachte, es gehöre zu herumliegendem Müll auf dem Grundstück!',
            'Emma war überglücklich, ihr Fahrrad wiederzuhaben, und Ben, der sich zunächst zu Unrecht verdächtigt gefühlt hatte, musste am Ende sogar lachen. Von diesem Tag an nannte die ganze Klasse Finn und Zoe nur noch "die Spürnasen von der 4b" – auch wenn Zoe insgeheim wusste, dass sie diesmal die eigentliche Lösung gefunden hatte.'
          ]
        }
      ],
      fragen: [
        { frage: 'Warum gerieten Finn und Zoe zuerst auf die falsche Spur?', optionen: ['Weil sie nicht aufpassten', 'Weil Bens Mütze zum gefundenen Wollfaden passte', 'Weil Emma sie in die Irre führte'], richtig: 1 },
        { frage: 'Was fiel Zoe später an den Reifenspuren auf?', optionen: ['Sie waren zu klein', 'Sie waren zu breit für Bens Rennrad', 'Sie fehlten komplett'], richtig: 1 },
        { frage: 'Wo war Emmas Fahrrad wirklich gelandet?', optionen: ['Bei Ben zuhause', 'Auf einer Baustelle unter einer Plane', 'Im Fluss'], richtig: 1 },
        { frage: 'Wie kam es dazu, dass das Fahrrad dort landete?', optionen: ['Es wurde gestohlen', 'Der Bauleiter räumte es versehentlich mit weg', 'Jemand hat es dort geparkt'], richtig: 1 }
      ]
    },
    {
      emoji: '🐉',
      titel: 'Der Ritter und der einsame Drache',
      kapitel: [
        {
          titel: 'Kapitel 1: Der Ruf aus den Bergen',
          absaetze: [
            'Seit drei Nächten hatten die Dorfbewohner von Steinbach ein furchterregendes Grollen aus der Berghöhle gehört, das bis ins Tal hallte. "Ein Drache!", flüsterten die Leute ängstlich auf dem Marktplatz. "Er wird bald das Dorf angreifen!"',
            'Ritter Tom, bekannt für seinen Mut, aber noch bekannter dafür, dass er lieber Rätsel löste als kämpfte, meldete sich freiwillig. Doch statt Schwert und Rüstung packte er nur sein Notizbuch und einen Krug Honig ein. "Ein wildes Tier greift nicht einfach so an", sagte er zu den erstaunten Dorfältesten. "Erst schauen, dann handeln."',
            'Der Weg zur Höhle führte steil bergauf, vorbei an umgestürzten Bäumen, die aussahen, als hätte etwas Riesiges sich hindurchgezwängt. Toms Herz klopfte schneller, je näher er kam.'
          ]
        },
        {
          titel: 'Kapitel 2: Das Ungeheuer in der Höhle',
          absaetze: [
            'Am Eingang der Höhle blieb Tom stehen. Aus der Dunkelheit drangen tiefe, unheimliche Töne – mal laut und krächzend, mal seltsam melodisch. Mit zitternden Händen zündete er seine Fackel an und trat ein.',
            'Plötzlich erschien vor ihm ein gewaltiger Schatten mit riesigen Flügeln. Tom wich erschrocken zurück – doch dann sah er genauer hin: Der Drache weinte. Große Tränen kullerten über seine schuppige Schnauze.',
            '"Bitte, tu mir nichts!", rief der Drache mit brüchiger Stimme. "Ich bin Fenn. Ich wollte niemandem Angst machen – ich habe nur versucht, ein Lied zu singen, aber es klingt wohl schrecklich, denn alle rennen immer weg." Tom senkte langsam seine Fackel und ließ sich vorsichtig auf einem Stein nieder. "Sing es mir vor", sagte er.'
          ]
        },
        {
          titel: 'Kapitel 3: Das Fest im Dorf',
          absaetze: [
            'Fenns Gesang war tatsächlich ziemlich schaurig – aber Tom erkannte schnell, dass der Drache einfach noch nie geübt hatte, weil er sein ganzes Leben allein in den Bergen verbracht hatte, von allen gemieden. "Komm mit ins Dorf", schlug Tom vor. Fenn zögerte lange, aus Angst, wieder Panik auszulösen.',
            'Also ritt Tom vor und erklärte den versammelten Dorfbewohnern die Wahrheit. Manche glaubten ihm nicht, bis Fenn selbst, ganz vorsichtig und mit gesenktem Kopf, ins Dorf trat. Ein paar Kinder begannen mutig, mit ihm zu singen – und siehe da, gemeinsam klang es plötzlich gar nicht mehr schrecklich, sondern schön.',
            'Von diesem Tag an veranstaltete Steinbach jedes Jahr im Herbst ein großes Fest zu Ehren von Fenn, dem singenden Drachen der Berge. Tom aber war stolz auf etwas anderes: dass er bewiesen hatte, wie wichtig es ist, erst genau hinzuschauen, bevor man urteilt.'
          ]
        }
      ],
      fragen: [
        { frage: 'Was nahm Tom NICHT mit auf seinen Weg zur Höhle?', optionen: ['Ein Notizbuch', 'Sein Schwert', 'Einen Krug Honig'], richtig: 1 },
        { frage: 'Wie reagierte Tom zuerst, als der Schatten des Drachen erschien?', optionen: ['Er griff sofort an', 'Er wich erschrocken zurück', 'Er lief sofort weg'], richtig: 1 },
        { frage: 'Warum klang Fenns Gesang so schaurig?', optionen: ['Er war böse', 'Er hatte nie geübt und war immer allein', 'Er hatte Zahnschmerzen'], richtig: 1 },
        { frage: 'Was feiert das Dorf seitdem jedes Jahr?', optionen: ['Ein Ritterturnier', 'Ein Fest zu Ehren von Fenn', 'Ein Erntefest'], richtig: 1 }
      ]
    },
    {
      emoji: '🗺️',
      titel: 'Die Schatzkarte im alten Baumhaus',
      kapitel: [
        {
          titel: 'Kapitel 1: Der Fund im Baumhaus',
          absaetze: [
            'Es regnete in Strömen, als Mia und ihr Bruder Jonas beschlossen, endlich das alte, verlassene Baumhaus am Waldrand aufzuräumen, das schon ihrem Opa gehört hatte. Zwischen Spinnweben und morschen Brettern fiel Mia eine lose Diele auf. Darunter, in einer kleinen Nische, lag eine vergilbte, brüchige Karte.',
            'Sie war handgezeichnet, mit krakeliger Schrift und einem deutlich erkennbaren Weg, der vom Baumhaus durch den Wald bis zu einem großen "X" am Fluss führte. "Ein Schatz!", flüsterte Jonas aufgeregt. Mia war skeptischer, aber die Neugier gewann: Am nächsten sonnigen Morgen packten sie Proviant, eine Taschenlampe und eine kleine Schaufel ein.'
          ]
        },
        {
          titel: 'Kapitel 2: Der falsche Weg',
          absaetze: [
            'Der Wald sah bei Tageslicht ganz anders aus als erwartet – dichter, unübersichtlicher. An einer Weggabelung, die auf der Karte gar nicht eingezeichnet war, mussten sie raten. Sie entschieden sich für den linken Pfad und liefen fast eine Stunde, bis der Weg plötzlich vor einer steilen Felswand endete. Falscher Weg.',
            'Während sie umkehrten, hörten sie ein lautes Rascheln im Gebüsch, das immer näherkam. Mias Herz schlug bis zum Hals – ein Wildschwein? Ein Bär? Beide hielten den Atem an, bis ein kleines, erschrockenes Reh aus dem Unterholz sprang und davonhoppelte. Erleichtert, aber mit zitternden Beinen, machten sie sich erneut auf den Weg, diesmal am rechten Pfad, wo Jonas endlich den markanten gespaltenen Felsen von der Karte wiedererkannte.'
          ]
        },
        {
          titel: 'Kapitel 3: Der wahre Schatz',
          absaetze: [
            'Am Fluss angekommen, gruben sie an der markierten Stelle im feuchten Sand. Nach zermürbenden Minuten voller Zweifel stieß Mias Schaufel auf etwas Hartes: eine alte, verrostete Blechdose. Mit zitternden Fingern öffnete Jonas den Deckel – doch statt Goldmünzen kamen vergilbte Fotografien und ein gefalteter Brief zum Vorschein.',
            'Der Brief war von ihrem Opa, geschrieben vor über fünfzig Jahren als Kind: Er beschrieb genau dieses Versteck, seine eigenen Abenteuer im selben Wald, und einen Freund, mit dem er die Karte gezeichnet hatte. Am Ende stand: "Wer immer das hier findet – möge dein Abenteuer genauso schön werden wie meins."',
            'Mia und Jonas waren zunächst enttäuscht, keinen echten Schatz gefunden zu haben – aber als sie abends ihrem Opa die Dose zeigten und seine Augen vor Rührung feucht wurden, verstanden sie: Sie hatten etwas viel Kostbareres gefunden. Sie füllten die Dose mit einem eigenen Brief und vergruben sie erneut, für die nächste Generation.'
          ]
        }
      ],
      fragen: [
        { frage: 'Wie war das Wetter, als Mia und Jonas das Baumhaus aufräumten?', optionen: ['Sonnig', 'Es regnete', 'Es schneite'], richtig: 1 },
        { frage: 'Was hörten sie auf dem falschen Weg im Gebüsch?', optionen: ['Ein Reh', 'Einen Bären', 'Ein Wildschwein'], richtig: 0 },
        { frage: 'Wer hatte die Schatzkarte ursprünglich gezeichnet?', optionen: ['Ein Pirat', 'Ihr Opa als Kind', 'Ein unbekannter Wanderer'], richtig: 1 },
        { frage: 'Was machten Mia und Jonas am Ende mit der Dose?', optionen: ['Sie behielten sie zuhause', 'Sie füllten sie neu und vergruben sie wieder', 'Sie warfen sie weg'], richtig: 1 }
      ]
    },
    {
      emoji: '🦊',
      titel: 'Luna und der sprechende Fuchs',
      kapitel: [
        {
          titel: 'Kapitel 1: Die Begegnung im Garten',
          absaetze: [
            'An einem nebligen Herbstabend hörte Luna ein leises Wimmern aus dem hinteren Teil ihres Gartens. Mit der Taschenlampe ihres Vaters schlich sie näher und entdeckte einen Fuchs, dessen Pfote sich in einer alten, rostigen Drahtschlinge verheddert hatte.',
            'Obwohl sie ein bisschen Angst hatte, kniete sie sich langsam hin und löste vorsichtig, Stück für Stück, den Draht. Kaum war die Pfote frei, sprang der Fuchs auf – und sprach! "Danke, kleine Menschin. Das werde ich dir nicht vergessen." Luna erstarrte vor Schreck, konnte aber kein Wort herausbringen.'
          ]
        },
        {
          titel: 'Kapitel 2: Die Nacht im Wald',
          absaetze: [
            'Der Fuchs stellte sich als Rufus vor, Wächter des nahen Waldes, und bot Luna als Dank eine geheime Nachtwanderung an. Zögernd, aber neugierig, folgte sie ihm durch den Zaun in den dunklen Wald. Rufus zeigte ihr leuchtende Pilze, die im Dunkeln blau schimmerten, und einen stillen Teich, in dem sich der Sternenhimmel doppelt spiegelte.',
            'Plötzlich hörten sie ein verzweifeltes Wimmern aus der Erde. Ein junger Dachs hatte sich in einem verlassenen Kaninchenbau verirrt, und in der Ferne hörte man bereits das unheimliche Heulen eines nahenden Waldkauzes. "Wir müssen uns beeilen", flüsterte Rufus angespannt, "bevor größere Tiere den Lärm bemerken." Luna, gerade klein genug, kroch mutig, aber mit klopfendem Herzen in den engen Bau.'
          ]
        },
        {
          titel: 'Kapitel 3: Die Rettung',
          absaetze: [
            'Im Dunkeln tastete Luna sich vorwärts, bis sie den zitternden kleinen Dachs erreichte, der sich zwischen zwei Wurzeln verkeilt hatte. Ganz behutsam befreite sie ihn und schob ihn vor sich her zurück zum Ausgang, während draußen Rufus aufmerksam Wache hielt und mit einem lauten Bellen einen neugierigen Fuchs aus der Nachbarschaft vertrieb, der sich näherte.',
            'Endlich draußen, brachte Rufus den kleinen Dachs sicher zu seinem Bau, wo seine Mutter ihn bereits erwartete. Erschöpft, aber überglücklich, brachte Rufus Luna zurück zum Gartenzaun, gerade als der Himmel im Osten hell wurde. "Wenn du mich brauchst, ruf einfach dreimal wie eine Eule", sagte er zum Abschied und verschwand im Unterholz.',
            'Luna erzählte niemandem von dieser Nacht – zu unglaublich klang sie. Aber seitdem übt sie heimlich, an ihrem Fenster, wie eine Eule zu rufen, in der Hoffnung, Rufus bald wiederzusehen.'
          ]
        }
      ],
      fragen: [
        { frage: 'Wobei half Luna dem Fuchs zuerst?', optionen: ['Sie fütterte ihn', 'Sie befreite seine Pfote aus einer Drahtschlinge', 'Sie brachte ihn nach Hause'], richtig: 1 },
        { frage: 'Was hörten sie, während sie dem Dachs halfen?', optionen: ['Einen Waldkauz', 'Ein Gewitter', 'Ein Auto'], richtig: 0 },
        { frage: 'Wer hielt draußen Wache, während Luna dem Dachs half?', optionen: ['Niemand', 'Rufus', 'Lunas Vater'], richtig: 1 },
        { frage: 'Wie kann Luna Rufus in Zukunft rufen?', optionen: ['Mit einer Pfeife', 'Indem sie wie eine Eule ruft', 'Mit einem Zauberspruch'], richtig: 1 }
      ]
    },
    {
      emoji: '🧙',
      titel: 'Die Zauberschule im Wald',
      kapitel: [
        {
          titel: 'Kapitel 1: Der Brief der Eule',
          absaetze: [
            'Als Elias an seinem elften Geburtstag aus dem Fenster schaute, sah er eine Eule mit einem versiegelten Brief im Schnabel direkt auf sich zufliegen. Der Brief kündigte an: Er sei aufgenommen an der Zauberschule Tannenzweig, versteckt tief im Wald, erreichbar nur für Kinder, die "das Funkeln in sich tragen".',
            'Am ersten Schultag, zwischen schiefen Baumhäusern und schwebenden Lichtern, lernte Elias, dass Magie hier nicht mit lauten Zaubersprüchen funktionierte, sondern mit Konzentration und viel Geduld. Sein erster Zauber – eine einzelne Feder zum Schweben bringen – misslang dreimal hintereinander, während ein Mitschüler namens Cornelius spöttisch grinste, weil ihm der Zauber sofort gelang.'
          ]
        },
        {
          titel: 'Kapitel 2: Der Nebel im Wald',
          absaetze: [
            'Bei einer Wanderung mit der ganzen Klasse durch den umliegenden Wald zog plötzlich ein dichter, unnatürlicher Nebel auf – so dick, dass man die eigene Hand kaum noch sehen konnte. Panik brach aus, als jemand rief: "Wo ist Paul?" Sein Mitschüler war in der Verwirrung vom Weg abgekommen.',
            'Die Lehrerin, Frau Silberblatt, versuchte einen Ruf-Zauber, doch der Nebel schluckte jeden Klang. Elias, dessen Herz vor Aufregung raste, erinnerte sich plötzlich an eine Lektion über Licht-Zauber, die er eigentlich noch gar nicht richtig konnte. Trotzdem konzentrierte er sich mit aller Kraft und schickte einen kleinen, zitternden Lichtfunken in die Richtung, aus der er entfernt Pauls ängstliche Rufe hörte.'
          ]
        },
        {
          titel: 'Kapitel 3: Der wahre Zauber',
          absaetze: [
            'Der Funke wuchs langsam zu einem schwachen, aber stetigen Leuchten heran und schwebte durch den dichten Nebel davon. Elias folgte ihm auf Zehenspitzen, das Herz bis zum Hals, bis er Paul fand, der zitternd an einem Baumstamm kauerte. Gemeinsam folgten sie dem Licht zurück zur Gruppe, während der Nebel sich langsam lichtete.',
            'Frau Silberblatt untersuchte Paul besorgt, doch ihm fehlte nichts außer dem Schrecken. Sie wandte sich zu Elias um und lächelte stolz: "Ein Licht-Zauber dieser Stärke, ganz ohne Übung – das habe ich selten gesehen. Du hast heute bewiesen, dass wahre Magie darin liegt, in schwierigen Momenten für andere da zu sein."',
            'Selbst Cornelius, der ihn zuvor ausgelacht hatte, klopfte ihm anerkennend auf die Schulter. Von diesem Tag an war Elias\' Lieblingsfach nicht mehr Zaubertränke, sondern Licht-Zauber – und er übte jeden Abend, bereit für das nächste Abenteuer.'
          ]
        }
      ],
      fragen: [
        { frage: 'Wie funktionierte Magie an der Zauberschule?', optionen: ['Mit lauten Sprüchen', 'Mit Konzentration und Geduld', 'Gar nicht ohne Zauberstab'], richtig: 1 },
        { frage: 'Was geschah während der Waldwanderung?', optionen: ['Ein dichter Nebel zog auf und Paul verschwand', 'Es regnete stark', 'Ein Zauberer griff sie an'], richtig: 0 },
        { frage: 'Warum konnte Frau Silberblatts Ruf-Zauber nicht helfen?', optionen: ['Sie kannte ihn nicht gut', 'Der Nebel schluckte jeden Klang', 'Sie hatte Angst'], richtig: 1 },
        { frage: 'Wie reagierte Cornelius am Ende?', optionen: ['Er lachte weiter über Elias', 'Er klopfte ihm anerkennend auf die Schulter', 'Er ignorierte ihn'], richtig: 1 }
      ]
    },
    {
      emoji: '🐕',
      titel: 'Rex, der Polizeihund, und der geheimnisvolle Dieb',
      kapitel: [
        {
          titel: 'Kapitel 1: Der nächtliche Dieb',
          absaetze: [
            'In der kleinen Bäckerei von Herrn Krause verschwanden seit einer Woche jede Nacht frische Brötchen – obwohl Türen und Fenster fest verschlossen blieben. Herr Krause war ratlos und verzweifelt, denn langsam sprach sich die merkwürdige Geschichte im ganzen Viertel herum. Manche Nachbarn tuschelten bereits, sein Lehrling Paul könnte heimlich naschen.',
            'Kommissarin Nadja und ihr junger, aber bereits legendärer Spürhund Rex wurden zum Fall gerufen. Rex, kaum ein Jahr alt, aber mit einer Nase, die schon drei schwierige Fälle gelöst hatte, schnüffelte aufgeregt durch die Backstube, während Nadja Notizen machte.'
          ]
        },
        {
          titel: 'Kapitel 2: Die falsche Spur',
          absaetze: [
            'Rex blieb zunächst vor Pauls Spind stehen und bellte aufgeregt – ein schlechtes Zeichen. Herr Krause wurde blass. War sein vertrauensvoller Lehrling wirklich der Dieb? Nadja bat Paul höflich, den Spind zu öffnen. Darin fanden sie jedoch nur sein Pausenbrot und ein Comicheft – Rex hatte offenbar nur den verlockenden Käsegeruch des Pausenbrots erschnüffelt, nicht den der gestohlenen Brötchen.',
            'Etwas enttäuscht, aber nicht entmutigt, führte Nadja Rex erneut durch die Backstube. Diesmal blieb er an einem winzigen, fast unsichtbaren Loch in der Wand nahe dem Boden stehen. Er kratzte aufgeregt daran und bellte einmal kurz – sein untrügliches Zeichen für "hier ist die echte Spur".'
          ]
        },
        {
          titel: 'Kapitel 3: Der wahre Übeltäter',
          absaetze: [
            'Nadja und Herr Krause folgten der Spur nach draußen und entdeckten einen frisch gegrabenen Tierbau unter dem alten Holzschuppen hinter der Bäckerei. Mit klopfendem Herzen ließ Nadja Rex vorsichtig vorausgehen. Nach angespannten Sekunden, in denen man nur Rex\' Schnaufen hörte, kam er rückwärts wieder heraus – mit einem völlig überraschten kleinen Waschbären, der noch ein halbes Brötchen im Maul hielt!',
            'Herr Krause musste lauthals lachen, so erleichtert war er. Kein Einbrecher, kein unehrlicher Lehrling – nur ein hartnäckiger, hungriger Waschbär war der "Dieb" gewesen. Er entschuldigte sich sofort bei Paul für den bösen Verdacht und stellte fortan jeden Abend eine kleine Schale mit Essensresten neben den Schuppen. Der Waschbär ließ die Backstube seitdem tatsächlich in Ruhe.',
            'Rex bekam als Belohnung sein Lieblingsspielzeug und ein extra dickes Leckerli – und Paul, überglücklich, dass sein Ruf gerettet war, backte am nächsten Tag eine ganze Extraportion Brötchen, nur für Nadja und ihren klugen Spürhund.'
          ]
        }
      ],
      fragen: [
        { frage: 'Wer stand zuerst fälschlich unter Verdacht?', optionen: ['Herr Krause selbst', 'Der Lehrling Paul', 'Ein Nachbar'], richtig: 1 },
        { frage: 'Was fand man wirklich in Pauls Spind?', optionen: ['Gestohlene Brötchen', 'Ein Pausenbrot und ein Comicheft', 'Nichts'], richtig: 1 },
        { frage: 'Wo entdeckten sie schließlich die echte Spur?', optionen: ['An einem Loch in der Wand nahe dem Boden', 'Auf dem Dach', 'Im Keller'], richtig: 0 },
        { frage: 'Wer war der wahre "Dieb"?', optionen: ['Ein Nachbarshund', 'Ein Waschbär', 'Eine Katze'], richtig: 1 },
        { frage: 'Was tat Herr Krause danach für den Waschbären?', optionen: ['Er fing ihn ein', 'Er stellte jeden Abend Essensreste raus', 'Er rief den Tierschutz'], richtig: 1 }
      ]
    },
    {
      emoji: '🦄',
      titel: 'Mira und das wilde Einhorn',
      kapitel: [
        {
          titel: 'Kapitel 1: Der Aufbruch',
          absaetze: [
            'Anders als in den Geschichten wollte Mira kein zahmes, glitzerndes Einhorn – sie wollte herausfinden, ob die wilden Einhörner im Nebelwald wirklich existierten, von denen die alten Dorfbewohner seit Generationen nur flüsternd erzählten, oft mit einem besorgten Kopfschütteln. Mit Kompass, Proviant und einer gehörigen Portion Mut brach sie früh am Morgen auf, ohne jemandem Bescheid zu sagen.',
            'Der Nebelwald war berüchtigt dafür, dass sich selbst erfahrene Jäger darin verirrten. Schon nach einer Stunde wurde die Luft dichter, feuchter, und ein grauer Nebel kroch zwischen den Bäumen hervor, der jeden Weg unkenntlich machte. Mira musste sich eingestehen: Sie wusste plötzlich nicht mehr genau, aus welcher Richtung sie gekommen war.'
          ]
        },
        {
          titel: 'Kapitel 2: Die Begegnung',
          absaetze: [
            'Tief im dichtesten Teil des Waldes, gerade als Mira langsam Angst bekam, hörte sie ein lautes, warnendes Schnauben. Vor ihr stand kein glitzerndes Fabelwesen, sondern ein zerzaustes, wildes Einhorn mit wirrer Mähne, das misstrauisch zurückwich, die Ohren angelegt. Sein Horn war an der Spitze angeschlagen und leicht blutig – es hatte sich offensichtlich schmerzhaft in dichtem Dornengestrüpp verfangen.',
            'Statt wegzulaufen, obwohl ihr Herz raste, setzte sich Mira ganz langsam auf einen Baumstumpf und blieb reglos sitzen. Minuten vergingen, in denen sich nur das Rascheln der Blätter hören ließ. Nach und nach, Schritt für vorsichtigen Schritt, wagte sich das Einhorn näher, neugierig auf den Apfel, den sie ihm mit ausgestreckter, zitternder Hand hinhielt.'
          ]
        },
        {
          titel: 'Kapitel 3: Der Weg nach Hause',
          absaetze: [
            'Vorsichtig, während das Einhorn stillhielt, befreite Mira die Zweige, die sich schmerzhaft in seiner Mähne verfangen hatten. Als Dank – oder vielleicht aus einem völlig anderen Grund – stieß das Einhorn sie sanft mit der Schnauze an und begann, in eine bestimmte Richtung zu traben, immer wieder zurückblickend, als wollte es sagen: Folg mir.',
            'Mira zögerte, doch ihr blieb wenig Wahl im dichten Nebel. Sie folgte dem Einhorn durch enge Pfade, die sie allein niemals gefunden hätte, bis der Nebel plötzlich dünner wurde und sie die vertrauten Umrisse des Dorfes am Waldrand erkannte. Das Einhorn hatte sie sicher nach Hause geführt.',
            'Das Einhorn – Mira nannte es insgeheim Sturm – ließ sie fortan gelegentlich näherkommen, blieb aber immer ein wildes, freies Tier, das sie nur selten wiedersah. Sie erzählte niemandem von diesem Tag, aus Angst, jemand könnte Sturm einfangen wollen. Manche Geheimnisse, dachte sie, sind einfach dafür da, geheim zu bleiben – und manche Freundschaften brauchen keine Worte.'
          ]
        }
      ],
      fragen: [
        { frage: 'Warum wollte Mira in den Nebelwald?', optionen: ['Sie hatte sich verlaufen', 'Sie wollte herausfinden, ob wilde Einhörner existieren', 'Sie suchte einen Schatz'], richtig: 1 },
        { frage: 'Was passierte Mira im Wald, bevor sie das Einhorn traf?', optionen: ['Sie verlor die Orientierung im Nebel', 'Sie fiel in einen Fluss', 'Sie traf einen Wolf'], richtig: 0 },
        { frage: 'Was war mit dem Horn des Einhorns?', optionen: ['Es leuchtete', 'Es war angeschlagen und leicht verletzt', 'Es war golden'], richtig: 1 },
        { frage: 'Wie fand Mira den Weg zurück ins Dorf?', optionen: ['Mit ihrem Kompass', 'Das Einhorn führte sie', 'Sie rief um Hilfe'], richtig: 1 }
      ]
    }
  ];

  // Lesefortschritt: merkt sich die Scroll-Position, damit Max nicht immer
  // von vorne anfangen muss, wenn er eine Geschichte nicht zu Ende liest.
  let aktiverIndex = null;
  let scrollSaveTimer = null;

  function scrollContainer() { return document.getElementById('app-root'); }

  scrollContainer().addEventListener('scroll', () => {
    if (aktiverIndex === null) return;
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
      Storage.saveLeseFortschritt(aktiverIndex, scrollContainer().scrollTop);
    }, 300);
  });

  function renderMenu() {
    const cards = bank.map((g, i) => {
      const fortschritt = Storage.getLeseFortschritt(i);
      let badge = '';
      if (fortschritt && fortschritt.fertig) {
        badge = '<div class="story-badge badge-fertig">✔ gelesen</div>';
      } else if (fortschritt && fortschritt.scrollTop > 40) {
        badge = '<div class="story-badge badge-weiter">↻ weiterlesen</div>';
      }
      return `<div class="story-card" onclick="Geschichten.leseGeschichte(${i})">
         ${badge}
         <span class="emoji">${g.emoji}</span>
         <div class="story-titel">${g.titel}</div>
       </div>`;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">⬅ Zurück</span></div>
      <div class="welcome">📚 Wähle eine Geschichte zum Lesen</div>
      <div class="story-grid">${cards}</div>
    `);
  }

  function leseGeschichte(i) {
    const g = bank[i];
    const kapitelHtml = g.kapitel.map(k =>
      `<h3 class="kapitel-titel">${k.titel}</h3>` +
      k.absaetze.map(a => `<p class="story-absatz">${a}</p>`).join('')
    ).join('');

    aktiverIndex = i;
    App.setOnLeaveScreen(() => { aktiverIndex = null; });

    App.render(`
      <div class="story-reader">
        <div class="back-row"><span class="back-btn" onclick="Geschichten.renderMenu()">⬅ Zur Bücherei</span></div>
        <h2>${g.emoji} ${g.titel}</h2>
        ${kapitelHtml}
        <div class="weiter-row">
          <span class="btn-primary" onclick="Geschichten.starteFragen(${i})">Weiter zu den Fragen ➜</span>
        </div>
      </div>
    `);

    const fortschritt = Storage.getLeseFortschritt(i);
    if (fortschritt && !fortschritt.fertig && fortschritt.scrollTop > 40) {
      setTimeout(() => { scrollContainer().scrollTop = fortschritt.scrollTop; }, 50);
    }
  }

  function starteFragen(i) {
    aktiverIndex = null;
    const g = bank[i];
    const fragen = g.fragen.map(f => ({
      typ: 'mc',
      frage: f.frage,
      optionen: f.optionen,
      richtigIndex: f.richtig
    }));
    const starter = () => App.startQuizSession('lesen', fragen, {
      onFinish: () => Storage.markGeschichteFertig(i)
    });
    App.setLastStarter(starter);
    starter();
  }

  return { renderMenu, leseGeschichte, starteFragen };
})();
