#!/usr/bin/env node
// build.mjs — Génère les pages HTML du site à partir de content/ et templates/.
//
//   node build.mjs
//
// Sans dépendance. Écrit les pages françaises à la racine (index.html, o.html…)
// et les pages anglaises dans en/ (mêmes noms de fichiers), plus 404.html.
// Vérifie au passage : images manquantes, textes anglais manquants, liens internes cassés.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageAccueil } from './templates/accueil.mjs';
import { pageProjet } from './templates/projet.mjs';
import { pageExperimentations } from './templates/experimentations.mjs';
import { pageActualites } from './templates/actualites.mjs';
import { page404 } from './templates/404.mjs';

const RACINE = path.dirname(fileURLToPath(import.meta.url));
const LANGUES = ['fr', 'en'];
const avertissements = [];

// ---------------------------------------------------------------------------
// 1. Lecture des fichiers de contenu (.md avec en-tête YAML simplifié)
// ---------------------------------------------------------------------------

/** Valeur simple : "texte", 'texte', nombre, true/false, [a, b] ou texte brut. */
function valeur(brut) {
  const v = brut.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) return v.slice(1, -1).replace(/\\"/g, '"');
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return Number(v); // « 0650… » reste du texte
  if (v === 'true' || v === 'false') return v === 'true';
  if (v.startsWith('[') && v.endsWith(']')) {
    // liste sur une ligne, en respectant les guillemets : [a.jpg, "b, c"]
    const elements = [];
    let courant = '', guillemet = null;
    for (const c of v.slice(1, -1)) {
      if (guillemet) { courant += c; if (c === guillemet) guillemet = null; }
      else if (c === '"' || c === "'") { courant += c; guillemet = c; }
      else if (c === ',') { elements.push(courant); courant = ''; }
      else courant += c;
    }
    if (courant.trim()) elements.push(courant);
    return elements.map(valeur);
  }
  return v;
}

/**
 * En-tête YAML simplifié : « cle: valeur », listes « - … », objets imbriqués par indentation
 * de 2 espaces, commentaires sur une ligne commençant par #.
 */
function lireEnTete(texte, fichier) {
  const lignes = texte.split('\n')
    .map((l, n) => ({ n: n + 2, indent: l.search(/\S/), brut: l.trim() }))
    .filter((l) => l.brut && !l.brut.startsWith('#'));
  let i = 0;
  const erreur = (l, msg) => { throw new Error(`${fichier}, ligne ${l.n} : ${msg}`); };

  function bloc(indent) {
    if (i >= lignes.length) return null;
    return lignes[i].brut.startsWith('- ') || lignes[i].brut === '-' ? liste(indent) : objet(indent);
  }
  function objet(indent, obj = {}) {
    while (i < lignes.length && lignes[i].indent === indent && !lignes[i].brut.startsWith('-')) {
      const l = lignes[i];
      const m = l.brut.match(/^([\w-]+):(?:\s+(.*))?$/);
      if (!m) erreur(l, `« cle: valeur » attendu, trouvé « ${l.brut} »`);
      i++;
      if (m[2] !== undefined && m[2] !== '') obj[m[1]] = valeur(m[2]);
      else if (i < lignes.length && lignes[i].indent > indent) obj[m[1]] = bloc(lignes[i].indent);
      else obj[m[1]] = null;
    }
    if (i < lignes.length && lignes[i].indent > indent) erreur(lignes[i], 'indentation inattendue');
    return obj;
  }
  function liste(indent) {
    const arr = [];
    while (i < lignes.length && lignes[i].indent === indent && lignes[i].brut.startsWith('-')) {
      const l = lignes[i];
      const reste = l.brut.replace(/^-\s*/, '');
      const indentElement = indent + (l.brut.length - reste.length);
      if (/^[\w-]+:(\s|$)/.test(reste) && !/^https?:/.test(reste)) {
        // élément objet : « - cle: valeur » suivi des autres clés alignées
        lignes[i] = { ...l, indent: indentElement, brut: reste };
        arr.push(objet(indentElement));
      } else {
        i++;
        arr.push(valeur(reste));
      }
    }
    return arr;
  }
  const resultat = objet(lignes[0]?.indent ?? 0);
  if (i < lignes.length) erreur(lignes[i], 'ligne non comprise');
  return resultat;
}

/** Lit un fichier .md : en-tête + sections « ## fr » / « ## en » du corps. */
function lireContenu(fichier) {
  const texte = fs.readFileSync(fichier, 'utf8').replace(/\r\n/g, '\n');
  const m = texte.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${fichier} : en-tête --- manquant`);
  const donnees = lireEnTete(m[1], path.relative(RACINE, fichier));
  donnees.slug = path.basename(fichier, '.md');
  donnees.corps = {};
  for (const section of m[2].split(/^##\s+/m).slice(1)) {
    const [titre, ...reste] = section.split('\n');
    donnees.corps[titre.trim().toLowerCase()] = reste.join('\n').trim();
  }
  return donnees;
}

const lireDossier = (dossier) =>
  fs.readdirSync(path.join(RACINE, 'content', dossier))
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireContenu(path.join(RACINE, 'content', dossier, f)))
    .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));

const site = lireContenu(path.join(RACINE, 'content/site.md'));
const pages = Object.fromEntries(lireDossier('pages').map((p) => [p.slug, p]));
const projets = lireDossier('projets');
const experimentations = lireDossier('experimentations');
const actualites = lireDossier('actualites');

// ---------------------------------------------------------------------------
// 2. Dimensions des images (lues dans les en-têtes PNG / JPEG / GIF)
// ---------------------------------------------------------------------------

const cacheImages = new Map();
function infoImage(chemin) {
  if (cacheImages.has(chemin)) return cacheImages.get(chemin);
  const complet = path.join(RACINE, chemin);
  if (!fs.existsSync(complet)) {
    avertissements.push(`image manquante : ${chemin}`);
    return { largeur: 0, hauteur: 0 };
  }
  const b = fs.readFileSync(complet);
  let largeur = 0, hauteur = 0;
  if (b.readUInt32BE(0) === 0x89504e47) { largeur = b.readUInt32BE(16); hauteur = b.readUInt32BE(20); }
  else if (b.toString('ascii', 0, 3) === 'GIF') { largeur = b.readUInt16LE(6); hauteur = b.readUInt16LE(8); }
  else if (b[0] === 0xff && b[1] === 0xd8) {
    for (let o = 2; o < b.length;) {
      const marqueur = b[o + 1], taille = b.readUInt16BE(o + 2);
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        hauteur = b.readUInt16BE(o + 5); largeur = b.readUInt16BE(o + 7); break;
      }
      o += 2 + taille;
    }
  }
  const variante = chemin.replace(/(\.\w+)$/, '-600$1');
  const info = { largeur, hauteur, variante: fs.existsSync(path.join(RACINE, variante)) ? variante : null };
  cacheImages.set(chemin, info);
  return info;
}

// ---------------------------------------------------------------------------
// 3. Génération des pages
// ---------------------------------------------------------------------------

function ecrire(relatif, html) {
  const complet = path.join(RACINE, relatif);
  fs.mkdirSync(path.dirname(complet), { recursive: true });
  fs.writeFileSync(complet, html);
  return relatif;
}

// Textes anglais manquants : signalés (la page affiche alors le texte français).
for (const obj of [site, ...Object.values(pages), ...projets, ...experimentations, ...actualites]) {
  for (const cle of Object.keys(obj)) {
    if (cle.endsWith('_fr') && obj[cle.replace(/_fr$/, '_en')] === undefined) avertissements.push(`${obj.slug} : « ${cle.replace(/_fr$/, '_en')} » manquant`);
  }
  if (obj.corps.fr && !obj.corps.en) avertissements.push(`${obj.slug} : section « ## en » manquante`);
}

// Empreinte du CSS et du JS, ajoutée à leur adresse (site.js?v=…) : après chaque mise en
// ligne, les navigateurs rechargent les nouveaux fichiers au lieu de garder l'ancienne version.
const empreinte = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(RACINE, f))).digest('hex').slice(0, 8);
const versions = { css: empreinte('css/site.css'), js: empreinte('js/site.js') };

const ecrites = [];
for (const langue of LANGUES) {
  const dossier = langue === 'fr' ? '' : `${langue}/`;
  const ctx = (fichier, typePage) => ({
    langue, langues: LANGUES, site, projets, experimentations, actualites, infoImage, versions,
    fichier, typePage, racine: langue === 'fr' ? '' : '../',
  });
  ecrites.push(ecrire(`${dossier}index.html`, pageAccueil(ctx('index.html', 'accueil'), pages.accueil)));
  for (const p of projets) ecrites.push(ecrire(`${dossier}${p.slug}.html`, pageProjet(ctx(`${p.slug}.html`, 'projet'), p)));
  ecrites.push(ecrire(`${dossier}experimentations.html`, pageExperimentations(ctx('experimentations.html', 'experimentations'), pages.experimentations)));
  ecrites.push(ecrire(`${dossier}actualites.html`, pageActualites(ctx('actualites.html', 'actualites'), pages.actualites)));
}
ecrites.push(ecrire('404.html', page404({ site, versions })));

// ---------------------------------------------------------------------------
// 4. Vérification des liens et ressources internes de chaque page générée
// ---------------------------------------------------------------------------

for (const relatif of ecrites) {
  const html = fs.readFileSync(path.join(RACINE, relatif), 'utf8');
  for (const [, attr, valeurs] of html.matchAll(/\s(href|src|srcset)="([^"]+)"/g)) {
    const urls = attr === 'srcset' ? valeurs.split(',').map((s) => s.trim().split(/\s+/)[0]) : [valeurs];
    for (const url of urls) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
      const cible = url.startsWith('/') ? path.join(RACINE, url) : path.join(RACINE, path.dirname(relatif), url);
      const fichier = url.endsWith('/') ? path.join(cible, 'index.html') : cible;
      if (!fs.existsSync(fichier.split(/[?#]/)[0])) avertissements.push(`${relatif} : lien cassé « ${url} »`);
    }
  }
}

console.log(`${ecrites.length} pages générées.`);
if (avertissements.length) {
  console.log(`\n${avertissements.length} avertissement(s) :`);
  for (const a of avertissements) console.log(`  - ${a}`);
  process.exitCode = 1;
}
