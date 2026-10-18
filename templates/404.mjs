// Gabarit de la page 404 (servie par GitHub Pages pour toute adresse inconnue, en FR comme en EN).
// Motif bleu plein écran et logo pixel animé au centre, qui ramène à l'accueil.
// Chemins absolus (/css/…) car la page peut être servie depuis n'importe quel dossier.
import { echapper } from './commun.mjs';

export function page404(ctx) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Not Found</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="/css/site.css?v=${ctx.versions.css}">
  <link rel="icon" href="/images/interface/favicon.png" type="image/png">
</head>
<body class="page page--404">
  <main class="introuvable">
    <a class="introuvable__lien" href="/" aria-label="${echapper(ctx.site.nom_site)}"><img src="/images/interface/logo-vertical-boucle.gif" width="175" alt=""></a>
  </main>
</body>
</html>
`;
}
