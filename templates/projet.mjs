// Gabarit d'une page projet (o.html, cadran.html…).
// Ordinateur : menu | texte fixe | colonne d'images qui défile.
// Mobile : titre, puis images, puis texte, crédits et liens précédent / suivant.
import { document, echapper, t, markdown, texteBrut, image, iframeVimeo, ratioCss } from './commun.mjs';

const TAILLES_PLEINE = '(max-width: 767px) 97vw, 49vw';
const TAILLES_DEMI = '(max-width: 767px) 48vw, 25vw';

/** Un bloc de la colonne d'images : image, paire, diaporama ou vidéo. */
function media(ctx, projet, m) {
  if (m.image) return image(ctx, 'projets', m.image, { classe: 'media', sizes: TAILLES_PLEINE });
  if (m.paire) {
    return `<div class="paire">${m.paire.map((f) => image(ctx, 'projets', f, { classe: 'media', sizes: TAILLES_DEMI })).join('')}</div>`;
  }
  if (m.diaporama) {
    const images = m.diaporama
      .map((f, i) => image(ctx, 'projets', f, { classe: `media${i === 0 ? ' est-active' : ''}`, sizes: TAILLES_PLEINE }))
      .join('\n          ');
    return `<div class="diaporama" data-diaporama data-delai="${m.delai ?? 5000}" data-duree="${m.duree ?? 1000}" data-glisser data-curseur="grand" data-logo="glitch">
          ${images}
        </div>`;
  }
  if (m.video) {
    // La vidéo est centrée dans un cadre noir au format des photos (6:5).
    return `<div class="media"><div class="video" style="--format-video: ${ratioCss(m.format_video ?? '16/9')}">${iframeVimeo({ ...m, titre: t(projet, 'menu', ctx.langue) })}</div></div>`;
  }
  throw new Error(`${projet.slug} : bloc de média inconnu ${JSON.stringify(m)}`);
}

export function pageProjet(ctx, projet) {
  const { langue, site, projets } = ctx;
  const i = projets.indexOf(projet);
  // Cycle chronologique : « suivant » = projet plus récent (au-dessus dans le menu), « précédent » = plus ancien.
  const suivant = projets[(i - 1 + projets.length) % projets.length];
  const precedent = projets[(i + 1) % projets.length];

  const credits = (projet.credits ?? [])
    .map(
      (c) => `<div class="credits__colonne">
            <h3 class="credits__titre">${echapper(t(c, 'rubrique', langue))}</h3>
            ${c.noms.map((n) => `<div class="credits__noms">${markdown(n)}</div>`).join('\n            ')}
          </div>`
    )
    .join('\n          ');

  const contenu = `<main class="projet">
      <h1 class="projet__titre">${echapper(t(projet, 'titre', langue))}</h1>
      <div class="projet__medias">
        ${projet.medias.map((m) => media(ctx, projet, m)).join('\n        ')}
      </div>
      <div class="projet__texte">
        <div class="texte">${markdown(projet.corps[langue] ?? projet.corps.fr)}</div>
        <div class="credits">
          ${credits}
        </div>
        <nav class="projet__navigation" aria-label="${t(site, 'menu_projets', langue)}">
          <a href="${precedent.slug}.html">${t(site, 'projet_precedent', langue)}</a>
          <a href="${suivant.slug}.html">${t(site, 'projet_suivant', langue)}</a>
        </nav>
      </div>
    </main>`;

  return document(ctx, {
    titre: t(projet, 'onglet', langue),
    description: texteBrut(projet.corps[langue] ?? projet.corps.fr),
    classeBody: 'page page--projet',
    contenu,
  });
}
