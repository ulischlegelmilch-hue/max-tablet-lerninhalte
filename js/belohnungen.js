// Belohnungen: Max sieht hier sein Guthaben und den Fortschritt zu den von
// den Eltern eingetragenen Belohnungen (z.B. "Filmabend", "Übernachtung bei
// Papa", siehe Storage.getBelohnungen/getGuthaben) - rein informativ, Max
// kann hier NICHTS einlösen. Das eigentliche Einlösen (Guthaben wird
// abgezogen) passiert bewusst nur PIN-geschützt im Eltern-Bereich (siehe
// App.belohnungEinloesen), damit es sich lohnt, wirklich vorbeizukommen und
// zu zeigen, was man sich verdient hat - z.B. als kleines Ritual am Ende
// der Woche.
const Belohnungen = (function () {
  function renderMenu() {
    const guthaben = Storage.getGuthaben();
    const liste = Storage.getBelohnungen();

    const kartenHtml = liste.map(b => {
      const erreicht = guthaben >= b.kosten;
      const rest = Math.max(0, b.kosten - guthaben);
      const prozent = Math.min(100, Math.round((guthaben / b.kosten) * 100));
      return `
        <div class="belohnung-karte${erreicht ? ' belohnung-erreicht' : ''}">
          <div class="belohnung-name">${b.name}</div>
          <div class="belohnung-balken"><div class="belohnung-balken-fuellung" style="width:${prozent}%"></div></div>
          <div class="belohnung-status">${erreicht
            ? '🎉 Geschafft! Zeig das Mama oder Papa.'
            : `noch ${rest} ⭐ (du hast ${guthaben} von ${b.kosten})`}</div>
        </div>
      `;
    }).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Deine Belohnungen</div>
      <div class="lese-text">Du hast gerade <strong>${guthaben} ⭐</strong> gesammelt. Übe weiter, um dir etwas davon zu verdienen!</div>
      <div class="belohnung-liste">
        ${liste.length ? kartenHtml : '<div class="regel-leer">Noch keine Belohnungen eingetragen – frag Mama oder Papa!</div>'}
      </div>
    `);
  }

  return { renderMenu };
})();
