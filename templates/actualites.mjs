// Gabarit de la page actualites.html.
// Liste chronologique ; au survol d'une actualité (ordinateur), ses deux photos apparaissent
// à droite, à la hauteur de l'actualité, et le logo passe en version pixel.
import { document, echapper, t, markdown, image } from './commun.mjs';

function actualite(ctx, a) {
  const { langue } = ctx;
  const libelle = echapper(t(a, 'lien', langue));
  let lien = '';
  if (a.lien_url) {
    const externe = /^https?:\/\//.test(a.lien_url);
    lien = `<a class="actu__lien" href="${a.lien_url}"${externe ? ' target="_blank" rel="noopener"' : ''}>${libelle}</a>`;
  } else if (libelle) {
    lien = `<span class="actu__lien actu__lien--inactif">${libelle}</span>`; // pas de page : libellé seul
  }
  const texte = [a.date, t(a, 'texte', langue)].filter(Boolean).join('\n');
  const photos = a.photos
    ? `\n          <div class="actu__photos">${a.photos.map((f) => image(ctx, 'actualites', f)).join('')}</div>`
    : '';
  return `<article class="actu"${a.photos ? ' data-logo="pixel"' : ''}>
          <h2 class="actu__titre">${echapper(t(a, 'titre', langue))}</h2>
          <p class="actu__texte">${markdown(texte)}</p>
          ${lien}${photos}
        </article>`;
}

export function pageActualites(ctx, page) {
  const contenu = `<main class="actus">
      <h1 class="visuellement-cache">${t(ctx.site, 'menu_actualites', ctx.langue)}</h1>
      <div class="actus__liste">
        ${ctx.actualites.map((a) => actualite(ctx, a)).join('\n        ')}
      </div>
    </main>`;
  return document(ctx, {
    titre: t(page, 'onglet', ctx.langue),
    description: t(ctx.site, 'description', ctx.langue),
    classeBody: 'page page--actualites',
    contenu,
  });
}
