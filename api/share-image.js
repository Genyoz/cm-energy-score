// api/share-image.js
// Fonction serverless Vercel — génère le PNG 1080×1080 de l'image partageable.
// Aucune dépendance Supabase — tout est dans les query params + tables hardcodées.
// Endpoint : GET /api/share-image?profile=X&score=Y&fragmentValue=Z&id=UUID
//            GET /api/share-image?profile=architecte&score=Y&axis=Z&id=UUID
//
// Écrit sans JSX (React.createElement direct) car le build de ce projet
// (Vite, pas Next.js) ne transforme pas le JSX dans les fichiers .js de /api.

import React from 'react';
import { ImageResponse } from '@vercel/og';

const h = React.createElement;

// ─── Tables hardcodées ───────────────────────────────────────────────────────

const PROFILE_NAMES = {
  reactivite:   'The Firefighter',
  repetition:   'The Concierge',
  invisibilite: 'The Ghost Developer',
  dependance:   'The Guardian',
  eponge:       'The Handyman',
  architecte:   'The Architect',
};

const ARTICLE = {
  reactivite:   'a',
  repetition:   'a',
  invisibilite: 'a',
  dependance:   'a',
  eponge:       'a',
  architecte:   'an',
};

// Fragments punchline — version ajustée pour usage dans une phrase fluide
const FRAGMENTS = {
  reactivite: {
    2: 'the same handful of urgent issues, over and over',
    3: 'trouble that keeps landing in different corners of the system',
    4: 'emergencies popping up on a different front each time',
  },
  repetition: {
    2: 'a couple of things you keep needing to remind people about',
    3: 'having to repeat the same things, over and over',
    4: 'a habit of reusing the same answers so often you could copy-paste them',
  },
  invisibilite: {
    2: 'the operational side getting less attention than content and performance',
    3: 'governance and system health losing ground to metrics',
    4: 'the work behind the results getting none of the credit',
  },
  dependance: {
    2: 'having to step back in, even when things mostly hold without me',
    3: 'the team getting by on guesswork while I still step in from a distance',
    4: 'everything nearly grinding to a halt the moment I\'m not there',
  },
  eponge: {
    2: 'technical fixes every week, outside the actual community work',
    3: 'near-daily technical fixes, outside the actual community work',
    4: 'several technical fixes a day, outside the actual community work',
  },
};

const SELF_BLAME = {
  reactivite:   'careless',
  repetition:   'messy on my server',
  invisibilite: 'a background player',
  dependance:   'a lone wolf on my server',
  eponge:       'a scatterbrain',
};

const PROFILE_TRUTH = {
  reactivite:   'a job where the market never gives me room to plan ahead',
  repetition:   'a platform where nothing stays easy to find without constant upkeep as it grows',
  invisibilite: 'a role that\'s quietly become the ghost architecture behind a performance everyone sees, except the one building it',
  dependance:   'a platform with no way to automatically hand off its own configuration logic to anyone else without losing time',
  eponge:       'an extremely demanding job that places a heavy load on me',
};

// Textes complets Architect — un par axe assigné par la rotation
const ARCHITECT_TEXTS = {
  reactivite:   'My system absorbs whatever urgency comes its way, but it has no way to signal when that urgency happened without throwing off the rest of my organization. It reveals a system built to serve what the market rewards most, performance, without making visible the background that actually holds it together.',
  repetition:   'My system keeps information clear enough that people rarely need to ask twice, but that clarity work happens entirely behind the scenes, where the market never looks. It reveals a system built to serve what the market rewards most, performance, without making visible the background that actually holds it together.',
  invisibilite: 'My system produces metrics that track how well marketing actions perform in the community, but the operational work behind those very metrics stays completely out of sight. It reveals a system built to serve what the market rewards most, performance, without making visible the background that actually holds it together.',
  dependance:   'My system keeps running even when I\'m not there, but that autonomy can\'t sustain itself without constant monitoring. It reveals a system built to serve what the market rewards most, performance, without offering enough solutions to support the background work that actually holds it together.',
  burnout:      'My system absorbs whatever technical maintenance comes up, big or small, but none of that maintenance work ever counts as part of what people see as the actual job. It reveals a system built to serve what the market rewards most, performance, without making visible the background that actually holds it together.',
};

// SVG FlameLogo — inline, réutilisé deux fois (jauge + badge)
function flameSvg(size, gradientId) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 480 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f9cf81"/>
        <stop offset="50%" stop-color="#d16b59"/>
        <stop offset="100%" stop-color="#2a1f2e"/>
      </linearGradient>
    </defs>
    <path d="M317 34C317 34 300 90 260 130C220 170 175 175 160 235C150 200 165 175 130 190C60 220 35 300 35 375C35 470 110 545 240 545C370 545 445 470 445 375C445 320 420 280 400 260C405 285 385 290 375 275C360 250 365 200 317 34Z"
      fill="none" stroke="url(#${gradientId})" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M275 255C275 255 265 285 240 305C215 325 190 330 182 360C177 340 185 328 165 335C125 350 110 395 110 435C110 485 150 520 220 520C290 520 330 485 330 435C330 405 315 385 305 373C308 386 296 389 290 380C282 366 285 340 275 255Z"
      fill="none" stroke="url(#${gradientId})" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const profile       = searchParams.get('profile');
  const score         = parseFloat(searchParams.get('score'));
  const fragmentValue = parseInt(searchParams.get('fragmentValue'), 10);
  const axis          = searchParams.get('axis');
  const download      = searchParams.get('download'); // '1' = forcer téléchargement PNG

  // Validation minimale
  if (!profile || !PROFILE_NAMES[profile]) {
    return new Response('Invalid profile', { status: 400 });
  }
  if (isNaN(score)) {
    return new Response('Invalid score', { status: 400 });
  }

  // ── Résolution des variables ──────────────────────────────────────────────

  const profileName = PROFILE_NAMES[profile];
  const article     = ARTICLE[profile];
  const jaugeHeight = Math.max(score * 10, 10); // minimum 10% cosmétique
  const badgeTop    = 100 - jaugeHeight;         // position badge sur la jauge

  let punchline;
  if (profile === 'architecte') {
    punchline = ARCHITECT_TEXTS[axis] || ARCHITECT_TEXTS['reactivite'];
  } else {
    const fragment     = FRAGMENTS[profile]?.[fragmentValue] || FRAGMENTS[profile]?.[4];
    const selfBlame    = SELF_BLAME[profile];
    const profileTruth = PROFILE_TRUTH[profile];
    punchline = `Dealing with ${fragment}, doesn't make me ${selfBlame}. It reveals ${profileTruth}.`;
  }

  // ── Chargement Poppins ───────────────────────────────────────────────────
  const [poppinsRegular, poppinsSemiBold, poppinsLight] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/poppins/v21/pxiDyp8kv8JHgFVrJJLm21llEN2PQEhcqw.woff2').then(r => r.arrayBuffer()),
  ]);

  // ── Composant — React.createElement, sans JSX ────────────────────────────

  const flameGaugeSvg = flameSvg(68, 'fga');
  const flameBadgeSvg = flameSvg(34, 'fgb');

  const element = h(
    'div',
    {
      style: {
        width: '1080px',
        height: '1080px',
        display: 'flex',
        fontFamily: 'Poppins, Arial, sans-serif',
        overflow: 'hidden',
      },
    },

    // ── GAUCHE 40% — fond Beige ──
    h(
      'div',
      {
        style: {
          width: '40%',
          background: '#fdf9f2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '80px',
          padding: '56px 32px',
        },
      },

      // Jauge verticale
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' } },

        // Label COMPENSATION
        h(
          'div',
          {
            style: {
              fontSize: '20px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'rgba(85,58,89,0.60)',
            },
          },
          'Compensation'
        ),

        // Barre jauge (wrapper relatif)
        h(
          'div',
          { style: { position: 'relative', width: '98px', height: '440px' } },

          // Fond de la barre
          h(
            'div',
            {
              style: {
                width: '98px', height: '440px',
                position: 'relative', overflow: 'hidden',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.38)',
                border: '1px solid rgba(255,255,255,0.75)',
                boxShadow: '0 12px 36px rgba(237,140,102,0.30)',
              },
            },
            // Remplissage gradient
            h(
              'div',
              {
                style: {
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${jaugeHeight}%`,
                  overflow: 'hidden',
                  borderBottomLeftRadius: '999px',
                  borderBottomRightRadius: '999px',
                },
              },
              h('div', {
                style: {
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '440px',
                  background: 'linear-gradient(to top, #2a1f2e, #d16b59, #f9cf81)',
                },
              })
            )
          ),

          // Badge score
          h(
            'div',
            {
              style: {
                position: 'absolute',
                top: `${badgeTop}%`,
                left: '49px',
                transform: 'translate(-50%, -50%)',
              },
            },
            h(
              'div',
              {
                style: {
                  background: '#fdf9f2',
                  borderRadius: '40px',
                  padding: '8px 20px',
                  fontSize: '24px', fontWeight: 600,
                  color: '#2a1f2e',
                  boxShadow: '6px 6px 16px rgba(190,150,140,0.12), -4px -4px 10px rgba(255,255,255,0.85)',
                },
              },
              String(score)
            )
          ),

          // FlameLogo aligné sur la ligne de coupure
          h(
            'div',
            {
              style: {
                position: 'absolute',
                top: `${badgeTop}%`,
                left: '49px',
                transform: 'translate(calc(-50% + 116px), -50%)',
                filter: 'drop-shadow(0 6px 12px rgba(190,150,140,0.35))',
                display: 'flex',
              },
            },
            h('img', {
              src: `data:image/svg+xml;utf8,${encodeURIComponent(flameGaugeSvg)}`,
              width: 68,
              height: 68,
            })
          )
        ),

        // Label SIGNAL
        h(
          'div',
          {
            style: {
              fontSize: '20px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'rgba(85,58,89,0.60)',
            },
          },
          'Signal'
        )
      ),

      // Badge CM Energy Score
      h(
        'div',
        {
          style: {
            display: 'flex', alignItems: 'center', gap: '24px',
            padding: '18px 40px 18px 22px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.38)',
            border: '1px solid rgba(255,255,255,0.75)',
          },
        },
        h(
          'div',
          { style: { width: '42px', height: '42px', display: 'flex', alignItems: 'center', flexShrink: 0 } },
          h('img', {
            src: `data:image/svg+xml;utf8,${encodeURIComponent(flameBadgeSvg)}`,
            width: 34,
            height: 34,
          })
        ),
        h(
          'span',
          {
            style: {
              fontWeight: 500, fontSize: '24px',
              background: 'linear-gradient(135deg, #553a59, #d16b59, #f9cf81)',
              backgroundClip: 'text',
              color: '#ed8c66', // fallback Coral
            },
          },
          'CM Energy Score'
        )
      )
    ),

    // ── DROITE 60% — Deep Plum ──
    h(
      'div',
      {
        style: {
          width: '60%',
          background: '#2a1f2e',
          boxShadow: '-16px 0 48px rgba(209,107,89,0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 48px',
          textAlign: 'center',
          position: 'relative',
        },
      },

      // Texte annonce profil
      h(
        'div',
        {
          style: {
            fontSize: '28px', fontWeight: 400,
            color: 'rgba(254,251,248,0.60)',
            lineHeight: 1.5, marginBottom: '28px',
          },
        },
        `Turns out, on Discord, I operate like ${article}`
      ),

      // Nom du profil — gradient texte, fallback Coral
      h(
        'div',
        {
          style: {
            fontSize: '44px', fontWeight: 600,
            background: 'linear-gradient(135deg, #553a59, #d16b59, #f9cf81)',
            backgroundClip: 'text',
            color: '#ed8c66', // fallback Coral
            lineHeight: 1.2,
            marginBottom: '56px',
          },
        },
        profileName
      ),

      // Punchline
      h(
        'div',
        {
          style: {
            fontSize: '25.6px', fontWeight: 300,
            color: 'rgba(254,251,248,0.75)',
            lineHeight: 1.7,
            maxWidth: '440px',
          },
        },
        punchline
      ),

      // Badge Carefully made for CMs
      h(
        'div',
        { style: { position: 'absolute', bottom: '64px', right: '64px', display: 'flex' } },
        h(
          'div',
          {
            style: {
              display: 'flex', alignItems: 'center',
              padding: '12px 28px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.07)',
              border: '0.5px solid rgba(255,255,255,0.12)',
            },
          },
          h(
            'span',
            {
              style: {
                fontSize: '24px', fontWeight: 400,
                background: 'linear-gradient(135deg, #553a59, #d16b59, #f9cf81)',
                backgroundClip: 'text',
                color: '#ed8c66', // fallback Coral
              },
            },
            'Carefully made for CMs'
          )
        )
      )
    )
  );

  const imageResponse = new ImageResponse(element, {
    width: 1080,
    height: 1080,
    fonts: [
      { name: 'Poppins', data: poppinsLight,    style: 'normal', weight: 300 },
      { name: 'Poppins', data: poppinsRegular,  style: 'normal', weight: 400 },
      { name: 'Poppins', data: poppinsSemiBold, style: 'normal', weight: 600 },
    ],
  });

  // Si download=1 — forcer le téléchargement du PNG plutôt que l'affichage
  if (download === '1') {
    const buffer = await imageResponse.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'image/png',
        'Content-Disposition': 'attachment; filename="cm-energy-score-result.png"',
        'Cache-Control':       'public, max-age=31536000, immutable',
      },
    });
  }

  return imageResponse;
}
