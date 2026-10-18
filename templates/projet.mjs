// Gabarit d'une page projet (o.html, cadran.html…).
// Ordinateur : menu | texte fixe | colonne d'images qui défile.
// Mobile : titre, puis images, puis texte, crédits et liens précédent / suivant.
import { document, echapper, t, markdown, texteBrut, resume, image, texteAlt, iframeVimeo, ratioCss, urlPublique, idAuteur } from './commun.mjs';

const TAILLES_PLEINE = '(max-width: 767px) 97vw, 49vw';
const TAILLES_DEMI = '(max-width: 767px) 48vw, 25vw';

/**
 * Un bloc de la colonne d'images : image, paire, diaporama ou vidéo.
 * premier : premier bloc de la page, dont la première image est chargée en priorité.
 */
function media(ctx, projet, m, premier) {
  const options = (classe, sizes, i = 0) => ({ classe, sizes, source: projet, prioritaire: premier && i === 0 });
  if (m.image) return image(ctx, 'projets', m.image, options('media', TAILLES_PLEINE));
  if (m.paire) {
    return `<div class="paire">${m.paire.map((f, i) => image(ctx, 'projets', f, options('media', TAILLES_DEMI, i))).join('')}</div>`;
  }
  if (m.diaporama) {
    const images = m.diaporama
      .map((f, i) => image(ctx, 'projets', f, options(`media${i === 0 ? ' est-active' : ''}`, TAILLES_PLEINE, i)))
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

/** Toutes les images d'un projet, dans l'ordre de la colonne. */
const imagesDu = (projet) => projet.medias.flatMap((m) => m.image ?? m.paire ?? m.diaporama ?? []);

/**
 * Noms d'une rubrique de crédits, pour les données structurées :
 * « [Nom](url), Autre nom » → [{ name: 'Nom', url }, { name: 'Autre nom' }].
 */
function noms(liste) {
  return [...liste.join(', ').matchAll(/\[([^\]]+)\]\(([^)\s]+)\)|([^,[\]]+)/g)]
    .map(([, nom, url, brut]) => (nom ? { name: nom, url } : { name: (brut ?? '').trim() }))
    .filter((n) => n.name);
}

// Rubrique des crédits (titre anglais) → rôle dans les données structurées. Les autres
// rubriques (crédit photo…) n'y figurent pas.
const ROLES = {
  'Co-author': (n) => ({ creator: { '@type': 'Person', ...n } }),
  Publisher: (n) => ({ publisher: { '@type': 'Organization', ...n } }),
  With: (n) => ({ contributor: n }),
};

/** Le projet décrit comme une œuvre (CreativeWork), avec son auteur et les crédits. */
function oeuvre(ctx, projet, description) {
  const { site, langue } = ctx;
  const url = urlPublique(ctx, langue);
  const donnees = {
    '@type': 'CreativeWork',
    '@id': `${url}#projet`,
    name: t(projet, 'menu', langue),
    description,
    url,
    inLanguage: langue,
    image: imagesDu(projet).filter((f) => f.endsWith('.jpg')).map((f) => `${site.url}/images/projets/${f}`),
    creator: [{ '@id': idAuteur(site) }],
    contributor: [],
  };
  for (const c of projet.credits ?? []) {
    for (const n of noms(c.noms)) {
      const role = ROLES[c.rubrique_en]?.(n);
      if (!role) continue;
      const [cle, valeur] = Object.entries(role)[0];
      if (Array.isArray(donnees[cle])) donnees[cle].push(valeur);
      else donnees[cle] = valeur;
    }
  }
  if (!donnees.contributor.length) delete donnees.contributor;
  return donnees;
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
        ${projet.medias.map((m, i) => media(ctx, projet, m, i === 0)).join('\n        ')}
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

  // Aperçu de partage : l'image choisie dans « partage », sinon la première photo du projet.
  const imagePartage = projet.partage ?? imagesDu(projet).find((f) => f.endsWith('.jpg'));
  const description = resume(texteBrut(projet.corps[langue] ?? projet.corps.fr));
  return document(ctx, {
    titre: t(projet, 'onglet', langue),
    description,
    classeBody: 'page page--projet',
    contenu,
    partage: { chemin: `images/projets/${imagePartage}`, alt: texteAlt(ctx, projet, imagePartage) },
    donnees: [oeuvre(ctx, projet, description)],
  });
}
