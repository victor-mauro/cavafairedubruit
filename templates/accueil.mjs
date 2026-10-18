// Gabarit de la page d'accueil (index.html).
// Fond : couleur neutre + motif bitmap dont la couleur change à chaque chargement,
// comètes jaunes qui se baladent au défilement / glissé / mouvement de souris (voir site.js),
// texte d'introduction par-dessus.
import { document, t, markdown } from './commun.mjs';

export function pageAccueil(ctx, page) {
  const i = `${ctx.racine}images/interface/`;
  // Couleur du motif tirée au hasard dans la gamme des expérimentations (jamais deux fois de suite la même).
  // Script placé dans <head> pour que la couleur soit appliquée avant le premier affichage.
  const couleurs = JSON.stringify(page.couleurs_motif);
  const scriptTete = `
  <script>(function(){var c=${couleurs},p;try{p=localStorage.getItem('couleur-motif')}catch(e){}var l=c.filter(function(x){return x!==p}),x=l[Math.floor(Math.random()*l.length)];try{localStorage.setItem('couleur-motif',x)}catch(e){}document.documentElement.style.setProperty('--motif',x)})();</script>`;

  // data-tete : direction de la tête de la comète dans l'image (degrés, 0 = vers la droite,
  // sens horaire) ; le script en tient compte pour qu'elle avance toujours tête devant.
  const avantCadre = `<div class="motif motif--accueil" aria-hidden="true"></div>
  <div class="cometes" aria-hidden="true">
    <img class="comete" src="${i}comete-1.png" width="687" height="457" alt="" data-comete="grande" data-tete="-4.4">
    <img class="comete" src="${i}comete-2.png" width="274" height="289" alt="" data-comete="moyenne" data-tete="-59.3">
    <img class="comete" src="${i}comete-3.png" width="238" height="179" alt="" data-comete="petite" data-tete="-167.5">
  </div>
  `;

  const contenu = `<main class="intro">
      <div class="intro__texte">${markdown(page.corps[ctx.langue] ?? page.corps.fr, { paragraphes: true })}</div>
    </main>`;

  return document(ctx, {
    titre: t(page, 'onglet', ctx.langue),
    description: t(ctx.site, 'description', ctx.langue),
    classeBody: 'page page--accueil',
    contenu,
    avantCadre,
    scriptTete,
  });
}
