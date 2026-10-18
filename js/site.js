/* ==========================================================================
   ça va faire du bruit. — script unique du site
   --------------------------------------------------------------------------
   Remplace jQuery, webflow.js (interactions et diaporamas Webflow) et Weglot.
   Chaque bloc correspond à un effet visible et fonctionne seul :
     1. Logo        : version « pixel » durable ou « glitch » de 0,2 s
     2. Curseur     : petit soleil qui suit la souris (ordinateur)
     3. Menu mobile : le logo de l'en-tête ouvre / ferme le menu
     4. Contact     : coordonnées dépliées au survol (au toucher sur mobile)
     5. Diaporamas  : fondu enchaîné, défilement auto, clic, glissé
     6. Expérimentations : une vignette cliquée laisse place à ses photos / sa vidéo
     7. Accueil     : comètes qui se baladent au défilement / glissé / souris
     8. Bitmaps     : images tramées affichées sans lissage quand c'est possible
   (4 bis : la rubrique PROJETS déplie la liste des projets.)
   ========================================================================== */
(() => {
  'use strict';

  const html = document.documentElement;
  // Exécute une section ; en cas d'erreur (navigateur ancien…), les autres sections continuent
  const bloc = (nom, section) => { try { section(); } catch (e) { console.error(`site.js — ${nom} :`, e); } };
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const appareilASurvol = window.matchMedia('(hover: hover)');


  /* 1. LOGO -------------------------------------------------------------------
     .logo-pixel : version pixel tant que dure un survol (CONTACT, actualité).
     .logo-glitch : version pixel pendant 0,2 s (survol / clic d'une image, du logo mobile).
     Les règles d'affichage sont dans site.css, section 5. */

  let finGlitch;
  function logoGlitch() {
    html.classList.add('logo-glitch');
    clearTimeout(finGlitch);
    finGlitch = setTimeout(() => html.classList.remove('logo-glitch'), 200);
  }
  function logoPixel(actif) {
    html.classList.toggle('logo-pixel', actif);
  }
  document.querySelectorAll('[data-logo="glitch"]').forEach((el) => {
    el.addEventListener('mouseenter', logoGlitch);
    el.addEventListener('click', logoGlitch);
  });
  document.querySelectorAll('[data-logo="pixel"]').forEach((el) => {
    el.addEventListener('mouseenter', () => logoPixel(true));
    el.addEventListener('mouseleave', () => logoPixel(false));
  });


  /* 2. CURSEUR PERSONNALISÉ ------------------------------------------------------
     Uniquement avec une souris sur écran > 991 px. Le soleil suit exactement la souris,
     grossit sur [data-curseur="grand"] et disparaît sur les liens, boutons et vidéos
     (le pointeur normal reprend alors sa place). */
  bloc('curseur', () => {
    const curseur = document.querySelector('.curseur');
    const avecCurseur = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 992px)');
    if (curseur) {
      const activer = () => html.classList.toggle('curseur-actif', avecCurseur.matches);
      activer();
      if (avecCurseur.addEventListener) avecCurseur.addEventListener('change', activer);
      else avecCurseur.addListener(activer); // anciens Safari

      document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        curseur.style.setProperty('--x', `${e.clientX - window.innerWidth / 2}px`);
        curseur.style.setProperty('--y', `${e.clientY - window.innerHeight / 2}px`);
        html.classList.add('curseur-visible'); // le petit soleil apparaît en fondu au premier mouvement
      });
      document.addEventListener('pointerover', (e) => {
        const cible = e.target instanceof Element ? e.target : null;
        if (!cible) return;
        curseur.classList.toggle('est-cache', !!cible.closest('a[href], button:not([data-curseur]), .video, iframe'));
        curseur.classList.toggle('est-grand', !!cible.closest('[data-curseur="grand"]'));
      });
    }
  });


  /* 3. MENU MOBILE -----------------------------------------------------------------
     Le logo de l'en-tête ouvre / ferme le panneau du menu (transition dans site.css). */
  bloc('menu mobile', () => {
    const entete = document.querySelector('.entete-mobile');
    if (entete) {
      entete.addEventListener('click', () => {
        const ouvert = html.classList.toggle('menu-ouvert');
        entete.setAttribute('aria-expanded', String(ouvert));
        logoGlitch();
      });
      entete.addEventListener('mouseenter', logoGlitch);
    }
  });


  /* 4. CONTACT ----------------------------------------------------------------------
     Survol (ordinateur) ou toucher (mobile) : CONTACT passe en jaune, les coordonnées
     se déplient et le logo passe en version pixel. Un toucher ailleurs referme. */
  bloc('contact', () => {
    const contact = document.querySelector('.contact');
    if (contact) {
      const bouton = contact.querySelector('.contact__bouton');
      const ouvrir = (ouvert) => {
        if (contact.classList.contains('est-ouvert') === ouvert) return;
        contact.classList.toggle('est-ouvert', ouvert);
        bouton.setAttribute('aria-expanded', String(ouvert));
        logoPixel(ouvert);
        if (ouvert) logoGlitch(); // logo horizontal (mobile) : bref passage en pixel
      };
      contact.addEventListener('mouseenter', () => appareilASurvol.matches && ouvrir(true));
      contact.addEventListener('mouseleave', () => appareilASurvol.matches && ouvrir(false));
      // Toute la ligne CONTACT réagit au toucher, pas seulement le mot
      bouton.parentElement.addEventListener('click', () => ouvrir(appareilASurvol.matches || !contact.classList.contains('est-ouvert')));
      document.addEventListener('click', (e) => { if (!contact.contains(e.target)) ouvrir(false); });
      contact.addEventListener('focusout', (e) => { if (!contact.contains(e.relatedTarget)) ouvrir(false); });
    }
  });


  /* 4 bis. PROJETS ----------------------------------------------------------------------
     Un clic (ou un toucher) sur PROJETS affiche / masque d'un coup la liste des projets
     (site.css) au lieu d'ouvrir directement le projet le plus récent (lien conservé sans
     JavaScript). Le clic fait « grésiller » le logo, tout comme le survol d'un projet
     de la liste (data-logo="glitch", section 1). */
  bloc('projets', () => {
    const projets = document.querySelector('.projets');
    if (projets) {
      const bouton = projets.querySelector('.projets__bouton');
      bouton.setAttribute('role', 'button');
      bouton.addEventListener('click', (e) => {
        e.preventDefault();
        bouton.setAttribute('aria-expanded', String(projets.classList.toggle('est-ouvert')));
        logoGlitch(); // le logo « grésille » à chaque dépli / repli
      });
    }
  });


  /* 5. DIAPORAMAS -----------------------------------------------------------------------
     <div data-diaporama data-delai="5000" data-duree="800" data-glisser> + images.
     - fondu enchaîné de data-duree ms (CSS, section 8) ;
     - défilement automatique toutes les data-delai ms, arrêté définitivement dès que
       le visiteur touche ou clique le diaporama (comme sur l'ancien site) ;
     - clic n'importe où : image suivante ;
     - data-glisser : glisser vers la gauche = suivante, vers la droite = précédente. */
  bloc('diaporamas', () => {
    document.querySelectorAll('[data-diaporama]').forEach((diapo) => {
      const images = Array.from(diapo.children);
      const delai = Number(diapo.dataset.delai) || 0;
      diapo.style.setProperty('--duree', `${Number(diapo.dataset.duree) || 500}ms`);
      if (images.length < 2) return;

      let actuelle = 0;
      const afficher = (n) => {
        images[actuelle].classList.remove('est-active');
        actuelle = (n + images.length) % images.length;
        images[actuelle].classList.add('est-active');
      };

      if (delai && !mouvementReduit) {
        const minuterie = setInterval(() => afficher(actuelle + 1), delai);
        diapo.addEventListener('pointerdown', () => clearInterval(minuterie), { once: true });
      }

      let aGlisse = false;
      diapo.addEventListener('click', () => { if (!aGlisse) afficher(actuelle + 1); });
      diapo.addEventListener('dragstart', (e) => e.preventDefault());

      if ('glisser' in diapo.dataset) {
        let depart = null;
        diapo.style.touchAction = 'pan-y'; // le défilement vertical de la page reste possible
        diapo.addEventListener('pointerdown', (e) => { depart = e.clientX; aGlisse = false; });
        diapo.addEventListener('pointermove', (e) => {
          if (depart === null) return;
          const ecart = e.clientX - depart;
          if (Math.abs(ecart) > Math.min(Math.round(window.innerWidth * 0.04), 40)) {
            aGlisse = true;
            depart = null;
            afficher(actuelle + (ecart < 0 ? 1 : -1));
          }
        });
        window.addEventListener('pointerup', () => { depart = null; });
        window.addEventListener('pointercancel', () => { depart = null; });
      }
    });
  });


  /* 6. EXPÉRIMENTATIONS -------------------------------------------------------------------
     Un clic sur une vignette l'ouvre (photos ou vidéo à sa place, texte dans la colonne
     de gauche) et referme celle qui était ouverte. */
  bloc('expérimentations', () => {
    const experimentations = document.querySelectorAll('[data-exp]');
    experimentations.forEach((exp) => {
      exp.querySelector('.exp__vignette').addEventListener('click', () => {
        experimentations.forEach((autre) => {
          const ouverte = autre === exp;
          autre.classList.toggle('est-ouverte', ouverte);
          autre.querySelector('.exp__vignette').setAttribute('aria-expanded', String(ouverte));
        });
      });
    });
  });


  /* 7. ACCUEIL : COMÈTES ----------------------------------------------------------------------
     Trois comètes jaunes parcourent l'écran sur des trajectoires courbes tirées au hasard
     à chaque chargement. Elles avancent quand le visiteur fait défiler (molette, glissé du
     doigt, flèches du clavier) et, plus doucement, quand il bouge la souris ; un élan les
     fait ralentir peu à peu. Elles avancent toujours vers l'avant : la tête (partie
     lumineuse) devant, la queue derrière. Une comète sortie de l'écran repart d'un autre bord.
     Les images comete-*.png gardent leurs pixels d'origine ; data-tete indique la direction
     de leur tête (degrés), retranchée de l'angle de la trajectoire. */
  bloc('comètes', () => {
    const calque = document.querySelector('.cometes');
    if (calque) {
      // Taille de référence : les comètes sont dessinées sur un canevas de 1052 × 732 px
      // agrandi à l'écran (« couvrir » ou « contenir »), comme sur l'ancien site.
      const REGLAGES = {
        grande: { ajustement: 'contenir', echelle: [0.7, 0.8], vitesse: 0.8 },
        moyenne: { ajustement: 'couvrir', echelle: [0.5, 1], vitesse: 1.1 },
        petite: { ajustement: 'couvrir', echelle: [0.85, 1], vitesse: 1.3 },
      };
      const ELAN_MAX = 40;        // vitesse maximale (px par image)
      const FROTTEMENT = 0.94;    // ralentissement par image (inertie)
      const hasard = (min, max) => min + Math.random() * (max - min);

      const cometes = Array.from(calque.querySelectorAll('[data-comete]')).map((img) => ({
        img, ...REGLAGES[img.dataset.comete], largeur0: img.width, hauteur0: img.height,
        tete: (Number(img.dataset.tete) || 0) * Math.PI / 180, images: [img],
      }));

      // En-tête mobile : son fond (même motif que la page) cache le texte qui défile dessous,
      // donc aussi les comètes, qui y étaient coupées net. On y place une copie des comètes,
      // entre ce fond et le logo, aux mêmes positions : elles le traversent sans coupure.
      const entete = document.querySelector('.entete-mobile');
      if (entete) {
        const copie = calque.cloneNode(true);
        copie.classList.add('cometes--entete');
        entete.prepend(copie);
        copie.querySelectorAll('[data-comete]').forEach((img, i) => cometes[i].images.push(img));
      }

      // Taille affichée de chaque comète selon l'écran
      function mesurer() {
        const rx = window.innerWidth / 1052, ry = window.innerHeight / 732;
        cometes.forEach((c) => {
          const k = c.ajustement === 'couvrir' ? Math.max(rx, ry) : Math.min(rx, ry);
          c.largeur = c.largeur0 * k;
          c.hauteur = c.hauteur0 * k;
          c.images.forEach((img) => { img.style.width = `${c.largeur}px`; img.style.height = `${c.hauteur}px`; });
        });
      }

      // Point au hasard sur un bord (0 haut, 1 droite, 2 bas, 3 gauche), hors de l'écran
      function pointBord(bord, marge) {
        const W = window.innerWidth, H = window.innerHeight;
        if (bord === 0) return [hasard(0, W), -marge];
        if (bord === 1) return [W + marge, hasard(0, H)];
        if (bord === 2) return [hasard(0, W), H + marge];
        return [-marge, hasard(0, H)];
      }

      // Trajectoire : courbe lisse (Catmull-Rom) qui traverse l'écran d'un bord à un autre
      // (bord opposé le plus souvent) en ondulant doucement, sans demi-tour.
      function nouveauTrajet(c) {
        const W = window.innerWidth, H = window.innerHeight;
        const marge = Math.max(c.largeur, c.hauteur) * 0.6;
        let S, E;
        do {
          const depart = Math.floor(Math.random() * 4);
          const arrivee = Math.random() < 0.6 ? (depart + 2) % 4 : (depart + (Math.random() < 0.5 ? 1 : 3)) % 4;
          S = pointBord(depart, marge);
          E = pointBord(arrivee, marge);
        } while (Math.hypot(E[0] - S[0], E[1] - S[1]) < 0.8 * Math.min(W, H));
        // Deux points intermédiaires sur la corde, décalés latéralement (au plus 20 % de sa longueur)
        const [dx, dy] = [E[0] - S[0], E[1] - S[1]];
        const L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
        const intermediaire = (t) => {
          const ecart = hasard(-0.2, 0.2) * L;
          return [
            Math.min(0.95 * W, Math.max(0.05 * W, S[0] + dx * t + nx * ecart)),
            Math.min(0.95 * H, Math.max(0.05 * H, S[1] + dy * t + ny * ecart)),
          ];
        };
        const points = [S, intermediaire(1 / 3), intermediaire(2 / 3), E];
        const P = [points[0], ...points, points[3]];
        const echantillons = [];
        for (let s = 1; s < P.length - 2; s++) {
          for (let i = 0; i < 40; i++) {
            const t = i / 40, t2 = t * t, t3 = t2 * t;
            echantillons.push([0, 1].map((a) => 0.5 * (2 * P[s][a] + (-P[s - 1][a] + P[s + 1][a]) * t
              + (2 * P[s - 1][a] - 5 * P[s][a] + 4 * P[s + 1][a] - P[s + 2][a]) * t2
              + (-P[s - 1][a] + 3 * P[s][a] - 3 * P[s + 1][a] + P[s + 2][a]) * t3)));
          }
        }
        echantillons.push(points[3]);
        const longueurs = [0];
        for (let i = 1; i < echantillons.length; i++) {
          longueurs.push(longueurs[i - 1] + Math.hypot(echantillons[i][0] - echantillons[i - 1][0], echantillons[i][1] - echantillons[i - 1][1]));
        }
        c.trajet = { echantillons, longueurs, total: longueurs[longueurs.length - 1] };
        c.echelles = [hasard(...c.echelle), hasard(...c.echelle)];
        c.distance = 0;
      }

      // Place la comète à c.distance sur son trajet, orientée dans le sens de la marche
      function placer(c) {
        const { echantillons, longueurs, total } = c.trajet;
        let i = 1;
        while (i < longueurs.length - 1 && longueurs[i] < c.distance) i++;
        const [x0, y0] = echantillons[i - 1], [x1, y1] = echantillons[i];
        const t = (c.distance - longueurs[i - 1]) / (longueurs[i] - longueurs[i - 1] || 1);
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        const angle = Math.atan2(y1 - y0, x1 - x0) - c.tete; // tête dans le sens de la marche
        const p = c.distance / total;
        const echelle = c.echelles[0] + (c.echelles[1] - c.echelles[0]) * p;
        const transformation = `translate(${x - c.largeur / 2}px, ${y - c.hauteur / 2}px) rotate(${angle}rad) scale(${echelle})`;
        c.images.forEach((img) => { img.style.transform = transformation; });
      }

      function avancer(c, pas) {
        c.distance += pas;
        if (c.distance >= c.trajet.total) nouveauTrajet(c); // sortie de l'écran : nouveau départ
        placer(c);
      }

      // Boucle d'animation : tourne seulement tant que les comètes ont de l'élan
      let elan = 0, enCours = false, precedente = null;
      function image(temps) {
        const f = precedente === null ? 1 : Math.min(3, (temps - precedente) / 16.7);
        precedente = temps;
        cometes.forEach((c) => avancer(c, elan * c.vitesse * f));
        elan *= FROTTEMENT ** f;
        if (elan < 0.05) { elan = 0; enCours = false; precedente = null; return; }
        requestAnimationFrame(image);
      }
      function pousser(quantite) {
        if (mouvementReduit) return;
        elan = Math.min(ELAN_MAX, elan + quantite);
        if (!enCours) { enCours = true; requestAnimationFrame(image); }
      }

      // Départ : chaque comète entre à peine dans l'écran, puis glisse un peu
      mesurer();
      cometes.forEach((c) => {
        nouveauTrajet(c);
        const W = window.innerWidth, H = window.innerHeight, m = Math.max(c.largeur, c.hauteur) * 0.25;
        const n = c.trajet.echantillons.findIndex(([x, y]) => x > -m && x < W + m && y > -m && y < H + m);
        c.distance = mouvementReduit ? c.trajet.total * 0.45 : c.trajet.longueurs[Math.max(0, n)];
        placer(c);
      });
      setTimeout(() => pousser(6), 400);

      // Gestes du visiteur
      window.addEventListener('wheel', (e) => pousser((Math.abs(e.deltaY) + Math.abs(e.deltaX)) * 0.1), { passive: true });
      let toucher = null;
      window.addEventListener('touchstart', (e) => { toucher = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (!toucher) return;
        const [x, y] = [e.touches[0].clientX, e.touches[0].clientY];
        pousser(Math.hypot(x - toucher[0], y - toucher[1]) * 0.12);
        toucher = [x, y];
      }, { passive: true });
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') pousser(Math.hypot(e.movementX, e.movementY) * 0.018);
      });
      window.addEventListener('keydown', (e) => {
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', ' '].includes(e.key)) pousser(12);
      });
      window.addEventListener('resize', () => {
        mesurer();
        cometes.forEach((c) => { const p = c.distance / c.trajet.total; nouveauTrajet(c); c.distance = p * c.trajet.total; placer(c); });
      });
    }
  });


  /* 8. BITMAPS NETS ----------------------------------------------------------------------------
     Les PNG de contenu (classe .bitmap) sont des images 1 bit : deux couleurs (papier + encre)
     posées en petits carrés. Le navigateur lisse les images qu'il redimensionne, ce qui floute
     les carrés. Selon la taille d'affichage, exprimée en pixels de l'écran :
     - image affichée à sa taille ou agrandie (Retina, mobile) : affichage sans lissage
       (classe .net, voir site.css) ;
     - image réduite (écran standard) : elle est RE-TRAMÉE à la taille exacte d'affichage —
       proportion locale d'encre calculée, réduite, puis retramée (diffusion d'erreur
       Floyd-Steinberg à seuil légèrement aléatoire) — et affichée pixel pour pixel ;
     - data-retramer="non" (liste bitmaps_lisses de content/site.md) : lissage conservé.
     Recalculé quand la fenêtre change de taille ; les images sont traitées une par une,
     à l'approche de l'écran, pour ne pas ralentir la page. */
  bloc('bitmaps', () => {
    const bitmaps = Array.from(document.querySelectorAll('img.bitmap'));
    const sources = new Map(); // image -> adresse du fichier d'origine

    // Taille d'affichage en pixels de l'écran (tient compte du recadrage object-fit: cover)
    function tailleEcran(img) {
      const r = img.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const nl = img.naturalWidth, nh = img.naturalHeight;
      const echelle = getComputedStyle(img).objectFit === 'cover' ? Math.max(r.width / nl, r.height / nh) : r.width / nl;
      const dpr = window.devicePixelRatio || 1;
      return { largeur: Math.round(nl * echelle * dpr), hauteur: Math.round(nh * echelle * dpr) };
    }

    // Re-tramage d'une image 1 bit (pixels RGBA) à la taille l × h
    function retramer(pixels, L, H, l, h) {
      // 1. les deux couleurs et le masque « papier » (1) / « encre » (0)
      const couleurs = [];
      const masque = new Float32Array(L * H);
      for (let i = 0; i < L * H; i++) {
        const c = (pixels[i * 4] << 24 | pixels[i * 4 + 1] << 16 | pixels[i * 4 + 2] << 8 | pixels[i * 4 + 3]) >>> 0;
        let k = couleurs.indexOf(c);
        if (k < 0) { if (couleurs.length === 2) return null; couleurs.push(c); k = couleurs.length - 1; }
        masque[i] = k === 0 ? 1 : 0;
      }
      if (couleurs.length < 2) return null;
      // 2. réduction par moyenne de surface : proportion de papier dans chaque pixel d'arrivée
      const reduire = (src, sl, sh, dl, vertical) => {
        const n = vertical ? sh : sl, d = dl, s = n / d;
        const dst = new Float32Array(vertical ? sl * d : d * sh);
        for (let o = 0; o < d; o++) {
          const a = o * s, b = a + s;
          for (let j = Math.floor(a); j < Math.min(n, Math.ceil(b)); j++) {
            const poids = (Math.min(b, j + 1) - Math.max(a, j)) / s;
            if (vertical) for (let x = 0; x < sl; x++) dst[o * sl + x] += src[j * sl + x] * poids;
            else for (let y = 0; y < sh; y++) dst[y * d + o] += src[y * sl + j] * poids;
          }
        }
        return dst;
      };
      let ton = reduire(reduire(masque, L, H, l, false), l, H, h, true);
      // 3. léger adoucissement (1-2-1) pour éviter les moirés de l'ancienne trame
      const adoucir = (t, pas, n) => {
        const r = new Float32Array(t.length);
        for (let i = 0; i < t.length; i++) {
          const p = Math.floor(i / pas) % n;
          const g = p > 0 ? t[i - pas] : t[i], d = p < n - 1 ? t[i + pas] : t[i];
          r[i] = (g + 2 * t[i] + d) / 4;
        }
        return r;
      };
      ton = adoucir(adoucir(ton, 1, l), l, h);
      // 4. diffusion d'erreur (Floyd-Steinberg, en serpentin) vers deux valeurs ; un seuil
      //    légèrement aléatoire (suite fixe) évite les damiers réguliers et redonne la
      //    dispersion « en grappes » des images d'origine
      let graine = 1;
      const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
      const sortie = new ImageData(l, h);
      const rgba = couleurs.map((c) => [c >>> 24, c >>> 16 & 255, c >>> 8 & 255, c & 255]);
      for (let y = 0; y < h; y++) {
        const gauche = y % 2 === 0;
        for (let k = 0; k < l; k++) {
          const x = gauche ? k : l - 1 - k, i = y * l + x;
          const v = ton[i], papier = v >= 0.5 + (alea() - 0.5) * 0.8, e = v - (papier ? 1 : 0), dx = gauche ? 1 : -1;
          if (x + dx >= 0 && x + dx < l) ton[i + dx] += e * 7 / 16;
          if (y + 1 < h) {
            if (x - dx >= 0 && x - dx < l) ton[i + l - dx] += e * 3 / 16;
            ton[i + l] += e * 5 / 16;
            if (x + dx >= 0 && x + dx < l) ton[i + l + dx] += e / 16;
          }
          sortie.data.set(rgba[papier ? 0 : 1], i * 4);
        }
      }
      return sortie;
    }

    function charger(src) {
      return new Promise((ok, echec) => { const i = new Image(); i.onload = () => ok(i); i.onerror = echec; i.src = src; });
    }

    async function ajusterBitmap(img) {
      if (!img.naturalWidth) return;
      if (!sources.has(img)) sources.set(img, img.currentSrc || img.src);
      const ecran = tailleEcran(img);
      if (!ecran || img.dataset.tailleRetramee === `${ecran.largeur}x${ecran.hauteur}`) return;
      const origine = await charger(sources.get(img));
      const L = origine.naturalWidth, H = origine.naturalHeight;
      const reduite = ecran.largeur < L * 0.98;
      if (!reduite || img.dataset.retramer === 'non') {
        if (img.src !== sources.get(img)) { img.src = sources.get(img); delete img.dataset.tailleRetramee; }
        img.classList.toggle('net', !reduite);
        return;
      }
      try {
        const toile = document.createElement('canvas');
        toile.width = L; toile.height = H;
        const c = toile.getContext('2d', { willReadFrequently: true });
        c.drawImage(origine, 0, 0);
        const resultat = retramer(c.getImageData(0, 0, L, H).data, L, H, ecran.largeur, ecran.hauteur);
        if (!resultat) return; // pas une image 1 bit : on garde le lissage
        toile.width = ecran.largeur; toile.height = ecran.hauteur;
        c.putImageData(resultat, 0, 0);
        const blob = await new Promise((ok) => toile.toBlob(ok));
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(blob);
        img.dataset.tailleRetramee = `${ecran.largeur}x${ecran.hauteur}`;
        img.classList.add('net');
      } catch (e) {
        // lecture des pixels impossible (ex. page ouverte en file://) : lissage conservé
      }
    }

    // File d'attente : une image à la fois, quand le navigateur est disponible
    const aTraiter = new Set();
    let enTraitement = false;
    async function traiter() {
      if (enTraitement) return;
      enTraitement = true;
      while (aTraiter.size) {
        const img = aTraiter.values().next().value;
        aTraiter.delete(img);
        await new Promise((ok) => (window.requestIdleCallback || setTimeout)(ok));
        await ajusterBitmap(img).catch(() => {});
      }
      enTraitement = false;
    }
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => { if (e.isIntersecting) { aTraiter.add(e.target); traiter(); } });
    }, { rootMargin: '300px' });
    bitmaps.forEach((img) => {
      const suivre = () => observateur.observe(img);
      if (img.complete && img.naturalWidth) suivre(); else img.addEventListener('load', suivre, { once: true });
    });
    let attenteBitmaps;
    window.addEventListener('resize', () => {
      clearTimeout(attenteBitmaps);
      attenteBitmaps = setTimeout(() => bitmaps.forEach((img) => { observateur.unobserve(img); observateur.observe(img); }), 200);
    });
  });
})();
