// Éléments communs à toutes les pages : <head>, logo, en-tête mobile, menu, curseur.
// Chaque type de page (accueil, projet, experimentations, actualites, 404) a son propre
// gabarit dans ce dossier et appelle `document()` pour obtenir la page complète.

// --- Petits outils ---------------------------------------------------------

/** Échappe le texte pour l'insérer dans du HTML. */
export function echapper(texte = '') {
  return String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texte traduit : t(objet, 'titre', 'en') lit objet.titre_en (repli sur _fr, puis sur la clé sans suffixe). */
export function t(objet, cle, langue) {
  return objet[`${cle}_${langue}`] ?? objet[`${cle}_fr`] ?? objet[cle] ?? '';
}

/**
 * Markdown « en ligne » : [texte](url), **gras**, retour à la ligne simple = <br>,
 * ligne vide = nouveau paragraphe (rendu avec <p>). Les liens externes s'ouvrent dans un nouvel onglet.
 */
export function markdown(texte = '', { paragraphes = false } = {}) {
  const enLigne = (bloc) =>
    echapper(bloc)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, libelle, url) => {
        const externe = /^(https?:)?\/\//.test(url);
        return `<a href="${url}"${externe ? ' target="_blank" rel="noopener"' : ''}>${libelle}</a>`;
      })
      .replace(/\n/g, '<br>');
  const blocs = String(texte).trim().split(/\n\s*\n/);
  if (!paragraphes) return blocs.map(enLigne).join('<br><br>');
  return blocs.map((b) => `<p>${enLigne(b)}</p>`).join('\n');
}

/** Texte brut (sans markdown), pour les balises meta. */
export function texteBrut(texte = '') {
  return String(texte).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Résumé pour la description affichée par Google (~160 caractères au plus) :
 * phrases entières tant qu'elles tiennent, sinon le début coupé au mot, suivi de « … ».
 */
export function resume(texte, max = 160) {
  const phrases = String(texte).match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [];
  let r = '';
  for (const p of phrases) {
    if ((r + p).trim().length > max) break;
    r += p;
  }
  return r.trim() || `${String(texte).slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/**
 * Balise <img> avec dimensions réelles et, si une variante -600 existe, un srcset.
 * Les PNG de contenu sont des bitmaps 1 bit (tramage en petits carrés) : classe « bitmap »,
 * que site.js affiche sans lissage ou re-trame à la taille d'affichage (section 8).
 * Ceux listés dans bitmaps_lisses (content/site.md) gardent le lissage : data-retramer="non".
 * source : le contenu (projet, expérimentation, actualité) dont le bloc « alt » décrit l'image ;
 * le build signale les images sans texte alternatif.
 * prioritaire : image visible dès l'arrivée sur la page, chargée en premier (au lieu de « lazy »).
 */
export function image(ctx, dossier, fichier, { classe = '', sizes = '', attributs = '', source = null, prioritaire = false } = {}) {
  const chemin = `images/${dossier}/${fichier}`;
  if (fichier.endsWith('.png')) {
    classe = `${classe} bitmap`.trim();
    if ((ctx.site.bitmaps_lisses ?? []).includes(fichier)) attributs += ' data-retramer="non"';
  }
  const alt = source ? texteAlt(ctx, source, fichier) : '';
  const { largeur, hauteur, variante } = ctx.infoImage(chemin);
  const src = ctx.racine + chemin;
  let srcset = '';
  if (variante) srcset = ` srcset="${ctx.racine + variante} 600w, ${src} ${largeur}w" sizes="${sizes}"`;
  const chargement = prioritaire ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img${classe ? ` class="${classe}"` : ''} src="${src}"${srcset} width="${largeur}" height="${hauteur}" alt="${echapper(alt)}" ${chargement} decoding="async"${attributs}>`;
}

/** Texte alternatif d'une image, lu dans le bloc « alt » du fichier de contenu. */
export function texteAlt(ctx, source, fichier) {
  const entree = (source.alt ?? []).find((a) => a.image === fichier);
  if (!entree) ctx.avertir(`${source.slug} : texte alternatif manquant pour ${fichier} (bloc « alt »)`);
  return entree ? t(entree, 'texte', ctx.langue) : '';
}

/** Iframe Vimeo (paramètres identiques à l'ancien site : boucle, sans titre ni avatar). */
export function iframeVimeo({ video, hash, titre }) {
  const h = hash ? `h=${hash}&amp;` : '';
  return `<iframe src="https://player.vimeo.com/video/${video}?${h}loop=1&amp;color=ffffff&amp;title=0&amp;byline=0&amp;portrait=0" title="${echapper(titre)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
}

/** Ratio « 16/9 » → « 16 / 9 » pour la propriété CSS aspect-ratio. */
export const ratioCss = (r) => String(r).replace('/', ' / ');

// --- Morceaux de page -------------------------------------------------------

/** URL publique d'une page dans une langue (canonical, hreflang, sitemap.xml). */
export function urlPublique(ctx, langue) {
  const dossier = langue === 'fr' ? '/' : `/${langue}/`;
  const fichier = ctx.fichier === 'index.html' ? '' : ctx.fichier;
  return `${ctx.site.url}${dossier}${fichier}`;
}

const LOCALES = { fr: 'fr_FR', en: 'en_GB' }; // langue des aperçus de partage (og:locale)

/** Identifiant de Victor Mauro dans les données structurées (repris par les pages projets). */
export const idAuteur = (site) => `${site.url}/#auteur`;

/**
 * Données structurées (JSON-LD) : description du site lisible par Google, invisible à l'écran.
 * Toujours l'auteur (Person) ; le site (WebSite) sur l'accueil ; plus ce que la page ajoute
 * (une œuvre CreativeWork sur chaque page projet).
 */
function donneesStructurees(ctx, autres) {
  const { site, langue } = ctx;
  const auteur = {
    '@type': 'Person',
    '@id': idAuteur(site),
    name: site.auteur,
    jobTitle: t(site, 'metier', langue),
    url: `${site.url}/`,
    email: site.contact_email,
  };
  if (site.profils?.length) auteur.sameAs = site.profils;
  const graphe = [auteur];
  if (ctx.typePage === 'accueil') {
    graphe.push({
      '@type': 'WebSite',
      '@id': `${site.url}/#site`,
      name: site.nom_site,
      url: `${site.url}/`,
      description: t(site, 'description', langue),
      inLanguage: langue,
      author: { '@id': idAuteur(site) },
    });
  }
  graphe.push(...autres);
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graphe }, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n  </script>`;
}

/**
 * <head> : titre de l'onglet, description, langues, aperçu de partage, données structurées.
 * Rien de tout cela ne s'affiche dans la page ; c'est ce que lisent Google et les réseaux sociaux.
 */
function head(ctx, { titre, description, partage, donnees = [], scriptTete = '' }) {
  const r = ctx.racine;
  const { site, langue } = ctx;
  // Onglet et résultat Google : « Cadran, horloge lumineuse — ça va faire du bruit. » (accueil : titre seul).
  const titreOnglet = ctx.typePage === 'accueil' ? titre : `${titre} — ${site.nom_site}`;
  const url = urlPublique(ctx, langue);
  const alternatives = ctx.langues
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${urlPublique(ctx, l)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${urlPublique(ctx, 'fr')}">`)
    .join('\n  ');
  // Image de l'aperçu (WhatsApp, LinkedIn, iMessage…) : celle de la page, sinon celle du site.
  const img = partage ?? { chemin: site.image_partage, alt: t(site, 'image_partage_alt', langue) };
  const { largeur, hauteur } = ctx.infoImage(img.chemin);
  const imgUrl = `${site.url}/${img.chemin}`;
  const localesAutres = ctx.langues
    .filter((l) => l !== langue)
    .map((l) => `\n  <meta property="og:locale:alternate" content="${LOCALES[l]}">`)
    .join('');
  return `<head>
  <meta charset="utf-8">
  <title>${echapper(titreOnglet)}</title>
  <meta name="description" content="${echapper(description)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="${echapper(site.auteur)}">
  <meta name="google-site-verification" content="${site.google_site_verification}">
  <link rel="canonical" href="${url}">
  ${alternatives}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${echapper(site.nom_site)}">
  <meta property="og:locale" content="${LOCALES[langue]}">${localesAutres}
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${echapper(titre)}">
  <meta property="og:description" content="${echapper(description)}">
  <meta property="og:image" content="${imgUrl}">
  <meta property="og:image:width" content="${largeur}">
  <meta property="og:image:height" content="${hauteur}">
  <meta property="og:image:alt" content="${echapper(img.alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${echapper(titre)}">
  <meta name="twitter:description" content="${echapper(description)}">
  <meta name="twitter:image" content="${imgUrl}">
  <meta name="twitter:image:alt" content="${echapper(img.alt)}">
  ${donneesStructurees(ctx, donnees)}
  <link rel="preload" href="${r}fonts/gt-pressura-light.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${r}fonts/gt-pressura-mono-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${r}css/site.css?v=${ctx.versions.css}">
  <link rel="icon" href="${r}images/interface/favicon.png?v=${ctx.versions.icone}" type="image/png" sizes="96x96">
  <link rel="apple-touch-icon" href="${r}images/interface/webclip.png">${scriptTete}
  <script src="${r}js/site.js?v=${ctx.versions.js}" defer></script>
</head>`;
}

/** Logo vertical fixé en bas à gauche (ordinateur) : 3 états superposés, voir « LOGO » dans site.css. */
function logo(ctx) {
  const i = `${ctx.racine}images/interface/`;
  return `<a class="logo" href="index.html" aria-label="${echapper(ctx.site.nom_site)}">
    <img class="logo__une-fois" src="${i}logo-vertical.gif" alt=""><img class="logo__pixel" src="${i}logo-vertical-pixel.png" alt=""><img class="logo__boucle" src="${i}logo-vertical-boucle.gif" alt="">
  </a>`;
}

/** En-tête mobile : logo horizontal qui ouvre / ferme le menu. */
function enteteMobile(ctx) {
  const i = `${ctx.racine}images/interface/`;
  return `<button class="entete-mobile" type="button" aria-expanded="false" aria-controls="menu" aria-label="Menu">
      <img class="entete-mobile__une-fois" src="${i}logo-horizontal.gif" alt="${echapper(ctx.site.nom_site)}"><img class="entete-mobile__pixel" src="${i}logo-horizontal-pixel.png" alt="">
    </button>`;
}

function menu(ctx) {
  const { site, langue, projets } = ctx;
  const courant = (fichier) => (ctx.fichier === fichier ? ' aria-current="page"' : '');
  // Rubrique PROJETS : un clic affiche / masque la liste des projets, d'un coup ; dépliée
  // d'office sur une page projet. Survoler un projet fait « grésiller » le logo.
  // Sans JavaScript, le lien mène au projet le plus récent.
  const surProjet = ctx.typePage === 'projet';
  const liste = projets
    .map((p) => `<a class="menu__lien menu__projet" href="${p.slug}.html"${courant(`${p.slug}.html`)} data-logo="glitch">${echapper(t(p, 'menu', langue))}</a>`)
    .join('\n            ');
  const rubriqueProjets = `<div class="projets${surProjet ? ' est-ouvert' : ''}">
          <div class="menu__rubrique"><a class="menu__lien projets__bouton" href="${projets[0].slug}.html" aria-expanded="${surProjet}" aria-controls="liste-projets">${t(site, 'menu_projets', langue)}</a></div>
          <div class="menu__projets" id="liste-projets">
            ${liste}
          </div>
        </div>`;
  const lien = (fichier, cle) => `<div class="menu__rubrique"><a class="menu__lien" href="${fichier}"${courant(fichier)}>${t(site, cle, langue)}</a></div>`;
  const tel = String(site.contact_telephone);
  const langues = ctx.langues
    .map((l) => {
      const href = l === langue ? ctx.fichier : l === 'fr' ? `../${ctx.fichier}` : `${langue === 'fr' ? '' : '../'}${l}/${ctx.fichier}`;
      const actif = l === langue ? ' est-active" aria-current="true' : '';
      return `<a class="langues__lien${actif}" href="${href}" hreflang="${l}" lang="${l}">${l.toUpperCase()}</a>`;
    })
    .join('<span class="langues__point" aria-hidden="true">.</span>');
  return `<nav class="menu${ctx.typePage === 'accueil' ? ' menu--accueil' : ''}" id="menu" aria-label="Menu">
      <div class="menu__panneau">
        ${rubriqueProjets}
        ${lien('experimentations.html', 'menu_experimentations')}
        ${lien('actualites.html', 'menu_actualites')}
        <div class="contact">
          <div class="menu__rubrique"><button class="menu__lien contact__bouton" type="button" aria-expanded="false" aria-controls="contact-details">${t(site, 'menu_contact', langue)}</button></div>
          <div class="contact__details" id="contact-details">
            <div class="contact__interieur">
              <div class="contact__groupe">
                <span class="contact__ligne">${echapper(site.contact_nom)}</span>
                <a class="contact__ligne" href="mailto:${site.contact_email}">${site.contact_email}</a>
                <a class="contact__ligne" href="tel:+33${tel.replace(/^0/, '')}">${tel}</a>
              </div>
              <div class="contact__groupe">
                <span class="contact__ligne">${t(site, 'graphisme_titre', langue)}</span>
                <a class="contact__ligne" href="${site.graphisme_url}" target="_blank" rel="noopener">${echapper(site.graphisme_nom)}</a>
              </div>
              <div class="contact__espace"></div>
            </div>
          </div>
        </div>
        <div class="menu__rubrique"><div class="langues">${langues}</div></div>
      </div>
    </nav>`;
}

/** Curseur personnalisé (ordinateur) : petit soleil qui suit la souris, grossit sur les images. */
function curseur(ctx) {
  const src = `${ctx.racine}images/interface/curseur.png`;
  return `<div class="curseur" aria-hidden="true"><img class="curseur__grand" src="${src}" width="70" alt=""><img class="curseur__petit" src="${src}" width="50" alt=""></div>`;
}

/**
 * Page complète.
 * @param ctx         contexte de génération (langue, site, projets, fichier, racine…)
 * @param options     { titre, description, classeBody, contenu, avantCadre, scriptTete, partage, donnees }
 *                    partage : { chemin, alt } image de l'aperçu de partage (sinon celle du site)
 *                    donnees : objets JSON-LD propres à la page (voir donneesStructurees)
 */
export function document(ctx, { titre, description, classeBody, contenu, avantCadre = '', scriptTete = '', partage, donnees }) {
  return `<!DOCTYPE html>
<html lang="${ctx.langue}">
${head(ctx, { titre, description, scriptTete, partage, donnees })}
<body class="${classeBody}">
  ${avantCadre}${logo(ctx)}
  <div class="cadre">
    ${enteteMobile(ctx)}
    ${menu(ctx)}
    ${contenu}
  </div>
  ${curseur(ctx)}
</body>
</html>
`;
}
