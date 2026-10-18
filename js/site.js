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
   ========================================================================== */
(() => {
  'use strict';

  const html = document.documentElement;
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

  const curseur = document.querySelector('.curseur');
  const avecCurseur = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 992px)');
  if (curseur) {
    const activer = () => html.classList.toggle('curseur-actif', avecCurseur.matches);
    activer();
    avecCurseur.addEventListener('change', activer);

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


  /* 3. MENU MOBILE -----------------------------------------------------------------
     Le logo de l'en-tête ouvre / ferme le panneau du menu (transition dans site.css). */

  const entete = document.querySelector('.entete-mobile');
  if (entete) {
    entete.addEventListener('click', () => {
      const ouvert = html.classList.toggle('menu-ouvert');
      entete.setAttribute('aria-expanded', String(ouvert));
      logoGlitch();
    });
    entete.addEventListener('mouseenter', logoGlitch);
  }


  /* 4. CONTACT ----------------------------------------------------------------------
     Survol (ordinateur) ou toucher (mobile) : CONTACT passe en jaune, les coordonnées
     se déplient et le logo passe en version pixel. Un toucher ailleurs referme. */

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


  /* 5. DIAPORAMAS -----------------------------------------------------------------------
     <div data-diaporama data-delai="5000" data-duree="800" data-glisser> + images.
     - fondu enchaîné de data-duree ms (CSS, section 8) ;
     - défilement automatique toutes les data-delai ms, arrêté définitivement dès que
       le visiteur touche ou clique le diaporama (comme sur l'ancien site) ;
     - clic n'importe où : image suivante ;
     - data-glisser : glisser vers la gauche = suivante, vers la droite = précédente. */

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


  /* 6. EXPÉRIMENTATIONS -------------------------------------------------------------------
     Un clic sur une vignette l'ouvre (photos ou vidéo à sa place, texte dans la colonne
     de gauche) et referme celle qui était ouverte. */

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


  /* 7. ACCUEIL : COMÈTES ----------------------------------------------------------------------
     Trois comètes jaunes parcourent l'écran sur des trajectoires courbes tirées au hasard
     à chaque chargement. Elles avancent quand le visiteur fait défiler (molette, glissé du
     doigt, flèches du clavier) et, plus doucement, quand il bouge la souris ; un élan les
     fait ralentir peu à peu. Elles avancent toujours vers l'avant : la tête (partie
     lumineuse) devant, la queue derrière. Une comète sortie de l'écran repart d'un autre bord.
     Les images comete-*.png ont la tête tournée vers la droite (0°). */

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
    }));

    // Taille affichée de chaque comète selon l'écran
    function mesurer() {
      const rx = window.innerWidth / 1052, ry = window.innerHeight / 732;
      cometes.forEach((c) => {
        const k = c.ajustement === 'couvrir' ? Math.max(rx, ry) : Math.min(rx, ry);
        c.largeur = c.largeur0 * k;
        c.hauteur = c.hauteur0 * k;
        c.img.style.width = `${c.largeur}px`;
        c.img.style.height = `${c.hauteur}px`;
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
      c.trajet = { echantillons, longueurs, total: longueurs.at(-1) };
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
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const p = c.distance / total;
      const echelle = c.echelles[0] + (c.echelles[1] - c.echelles[0]) * p;
      c.img.style.transform = `translate(${x - c.largeur / 2}px, ${y - c.hauteur / 2}px) rotate(${angle}rad) scale(${echelle})`;
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
})();
