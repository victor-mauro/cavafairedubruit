// Gabarit de la page experimentations.html.
// Grille de vignettes bicolores ; un clic sur une vignette la remplace par ses photos (diaporama)
// ou sa vidéo, et affiche son texte dans la colonne de gauche (ordinateur uniquement).
import { document, echapper, t, markdown, image, iframeVimeo, ratioCss } from './commun.mjs';

// Gabarit d'une vignette : ratio de l'image et nombre de rangées occupées dans la grille (ordinateur).
export const FORMATS = {
  paysage: { ratio: '4/3', rangees: 2 }, // 800 × 600
  carre: { ratio: '8/9', rangees: 3 }, // 800 × 900
  portrait: { ratio: '2/3', rangees: 4 }, // 800 × 1200
};

function experimentation(ctx, exp) {
  const { langue } = ctx;
  const format = FORMATS[exp.format];
  if (!format) throw new Error(`${exp.slug} : format inconnu « ${exp.format} » (paysage, carre ou portrait)`);
  const titre = t(exp, 'titre', langue);
  const vignette = exp.vignette ?? `${exp.slug}-00.png`;

  let contenu;
  if (exp.photos) {
    const images = exp.photos
      .map((f, i) => image(ctx, 'experimentations', f, { classe: `exp__photo${i === 0 ? ' est-active' : ''}` }))
      .join('');
    contenu = `<div class="diaporama diaporama--exp" data-diaporama data-duree="100" data-curseur="grand">${images}</div>`;
  } else {
    contenu = `<div class="video video--exp" style="--format-video: ${ratioCss(exp.format_video ?? '16/9')}">${iframeVimeo({ ...exp, titre })}</div>`;
  }

  const texte = [exp.date, t(exp, 'texte', langue)].filter(Boolean).join('\n');
  return `<article class="exp exp--${exp.format}" style="--rangees: ${format.rangees}; --format: ${ratioCss(format.ratio)}" data-exp>
          <button class="exp__vignette" type="button" aria-expanded="false" aria-label="${echapper(titre)}" data-curseur="grand" data-logo="glitch">${image(ctx, 'experimentations', vignette)}</button>
          <div class="exp__contenu">${contenu}</div>
          <div class="exp__texte">
            <h2 class="exp__titre">${echapper(titre)}</h2>
            <p>${markdown(texte)}</p>
          </div>
        </article>`;
}

export function pageExperimentations(ctx, page) {
  const contenu = `<main class="exps">
      <h1 class="visuellement-cache">${t(ctx.site, 'menu_experimentations', ctx.langue)}</h1>
      <div class="exps__grille">
        ${ctx.experimentations.map((e) => experimentation(ctx, e)).join('\n        ')}
      </div>
    </main>`;
  return document(ctx, {
    titre: t(page, 'onglet', ctx.langue),
    description: t(ctx.site, 'description', ctx.langue),
    classeBody: 'page page--experimentations',
    contenu,
  });
}
