// api/send-mail.js
// Fonction serverless Vercel — orchestrateur principal du flux mail CMES.
// Déclenchée par le JSX au moment de la soumission du popup (email + prénom + LinkedIn).
// Variables d'environnement requises dans Vercel :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY
//   BASE_URL (ex. https://cmes.genyoz.com)
//   ALLOWED_ORIGIN (ex. https://cmes.genyoz.com)
//   OPSCIRCLE_URL

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { mail1Template } from '../emails/mail1.js';
import { mail2Template } from '../emails/mail2.js';

// ─── Clients ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Tables internes ────────────────────────────────────────────────────────

// Clé interne profil_dominant → question retenue pour fragmentValue
// (axe + index dans le tableau de 3 réponses de l'axe)
const QUESTION_BY_PROFILE = {
  reactivite:   { axe: 'reactivite',   index: 1 }, // Q2
  repetition:   { axe: 'repetition',   index: 0 }, // Q4
  invisibilite: { axe: 'invisibilite', index: 1 }, // Q8
  dependance:   { axe: 'dependance',   index: 0 }, // Q10
  eponge:       { axe: 'burnout',      index: 2 }, // Q15
};

// Noms affichés par profil (clé interne → nom EN)
const PROFILE_NAMES = {
  reactivite:   'The Firefighter',
  repetition:   'The Concierge',
  invisibilite: 'The Ghost Developer',
  dependance:   'The Guardian',
  eponge:       'The Handyman',
  architecte:   'The Architect',
};

// Hiérarchie de fallback Architect (ordre : du plus grave au moins grave)
// Si l'axe assigné par la rotation a score_axe_* >= 6, on descend dans cette liste.
const ARCHITECT_FALLBACK_HIERARCHY = [
  'invisibilite',
  'dependance',
  'reactivite',
  'repetition',
  'burnout',
];

// Correspondance axe interne → colonne Supabase score_axe_*
const SCORE_AXE_COL = {
  reactivite:   'score_axe_reactivite',
  repetition:   'score_axe_repetition',
  invisibilite: 'score_axe_invisibilite',
  dependance:   'score_axe_dependance',
  burnout:      'score_axe_burnout',
};

// ─── Rate limiting en mémoire ────────────────────────────────────────────────
// Limite : 5 requêtes par IP par minute.
// Note : stateless par instance Vercel — suffisant pour bloquer les abus simples.
// Pour un rate limiting robuste multi-instances, utiliser Upstash Redis.

const ipRequests = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX       = 5;          // max requêtes par fenêtre

function isRateLimited(ip) {
  const now    = Date.now();
  const record = ipRequests.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count     = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  }

  record.count++;
  ipRequests.set(ip, record);

  return record.count > RATE_LIMIT_MAX;
}

// ─── Validation email ────────────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {

  // 1. MÉTHODE
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. RATE LIMITING
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // 3. CORS
  const origin = req.headers.origin;
  if (origin !== process.env.ALLOWED_ORIGIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);

  // 4. EXTRACTION BODY
  const { id, email, prenom, linkedin_url, _hp } = req.body;

  // 5. HONEYPOT anti-spam (champ caché — si rempli, c'est un bot)
  if (_hp) {
    // Réponse 200 silencieuse pour ne pas signaler au bot qu'il a été détecté
    return res.status(200).json({ success: true });
  }

  // 6. VALIDATION
  if (!id || !email || !prenom) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // 7. UPDATE SUPABASE — ajout email, prénom, LinkedIn sur la ligne existante
  const { error: updateError } = await supabase
    .from('respondents')
    .update({
      email,
      prenom,
      linkedin_url: linkedin_url || null,
    })
    .eq('id', id);

  if (updateError) {
    console.error('UPDATE failed:', updateError.message);
    return res.status(500).json({ error: 'Database update failed' });
  }

  // 7. SELECT SUPABASE — lecture complète de la ligne
  const { data: row, error: selectError } = await supabase
    .from('respondents')
    .select(`
      email,
      prenom,
      profil_dominant,
      profil_secondaire,
      score_10,
      reponses_brutes,
      restitution,
      mail_sent,
      score_axe_reactivite,
      score_axe_repetition,
      score_axe_invisibilite,
      score_axe_dependance,
      score_axe_burnout
    `)
    .eq('id', id)
    .single();

  if (selectError || !row) {
    console.error('SELECT failed:', selectError?.message);
    return res.status(500).json({ error: 'Database read failed' });
  }

  // Vérification double envoi — si mail déjà envoyé, sortie silencieuse
  if (row.mail_sent === true) {
    return res.status(200).json({ success: true });
  }

  // 8. CALCUL SHARE-IMAGE PARAMS
  let shareImageParams;

  if (row.profil_dominant === 'architecte') {

    // 8a. Rotation Architect — incrément atomique du compteur
    const AXES_ROTATION = ['reactivite', 'repetition', 'invisibilite', 'dependance', 'burnout'];

    const { data: rotationData, error: rotationError } = await supabase
      .rpc('increment_architect_counter'); // fonction SQL : UPDATE SET counter+1 RETURNING counter

    if (rotationError || rotationData === null) {
      console.error('Architect rotation failed:', rotationError?.message);
      return res.status(500).json({ error: 'Architect rotation failed' });
    }

    const counter = rotationData;
    let axeAssigne = AXES_ROTATION[counter % 5];

    // 8b. Vérification seuil >= 6 — fallback si nécessaire
    const scoreAxeAssigne = row[SCORE_AXE_COL[axeAssigne]];
    if (scoreAxeAssigne >= 6) {
      // Descendre dans la hiérarchie jusqu'au premier axe < 6
      const fallback = ARCHITECT_FALLBACK_HIERARCHY.find(
        (axe) => row[SCORE_AXE_COL[axe]] < 6
      );
      // Note : il existera toujours un axe < 6 pour un Architect (score <= 20%)
      axeAssigne = fallback;
    }

    shareImageParams = new URLSearchParams({
      profile: 'architecte',
      score:   String(row.score_10),
      axis:    axeAssigne,
      id,
    });

  } else {

    // 8c. Profils normaux — extraction fragmentValue depuis reponses_brutes
    const { axe, index } = QUESTION_BY_PROFILE[row.profil_dominant];
    const fragmentValue = row.reponses_brutes[axe][index];

    shareImageParams = new URLSearchParams({
      profile:       row.profil_dominant,
      score:         String(row.score_10),
      fragmentValue: String(fragmentValue),
      id,
    });

  }

  // 9. FORGE URL SHARE-IMAGE
  const shareImageUrl = `${process.env.BASE_URL}/api/share-image?${shareImageParams.toString()}`;

  // 10. GÉNÉRATION HTML MAIL 1
  const htmlMail1 = mail1Template({
    profil_dominant:   row.profil_dominant,
    profil_secondaire: row.profil_secondaire,
    score_10:          row.score_10,
    shareImageUrl,
    restitution:       row.restitution,
    deepDiveUrl:       process.env.DEEP_DIVE_URL,
    founderName:       process.env.FOUNDER_NAME,
    cmesUrl:           process.env.CMES_URL,
    email:             row.email,
  });

  // 11. ENVOI MAIL 1 — immédiat
  const { error: mail1Error } = await resend.emails.send({
    from:    'CM Energy Score <results@cmes.genyoz.com>',
    to:      row.email,
    subject: `Your CM Energy Score + ${PROFILE_NAMES[row.profil_dominant]} mode result`,
    html:    htmlMail1,
  });

  if (mail1Error) {
    console.error('Mail 1 send failed:', mail1Error.message);
    return res.status(500).json({ error: 'Mail 1 send failed' });
  }

  // Marquer le mail comme envoyé — empêche tout double envoi ultérieur
  await supabase
    .from('respondents')
    .update({ mail_sent: true })
    .eq('id', id);

  // 12. GÉNÉRATION HTML MAIL 2
  const htmlMail2 = mail2Template({
    prenom:          row.prenom,
    profil_dominant: row.profil_dominant,
    score_10:        row.score_10,
    deepDiveUrl:     process.env.DEEP_DIVE_URL,
    opscircleUrl:    process.env.OPSCIRCLE_URL,
    cmesUrl:         process.env.CMES_URL,
    email:           row.email,
    trialsUrl:         process.env.DEEPDIVE_TRIALS_URL,
    revelationUrl:     process.env.DEEPDIVE_REVELATION_URL,
    architectureUrl:   process.env.DEEPDIVE_ARCHITECTURE_URL,
    systemUrl:         process.env.DEEPDIVE_SYSTEM_URL,
    transformationUrl: process.env.DEEPDIVE_TRANSFORMATION_URL,
    newworldUrl:       process.env.DEEPDIVE_NEWWORLD_URL,
  });

  // 13. ENVOI MAIL 2 — schedulé J+2
  const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const { error: mail2Error } = await resend.emails.send({
    from:        'CM Energy Score <results@cmes.genyoz.com>',
    to:          row.email,
    subject:     `What your ${PROFILE_NAMES[row.profil_dominant].replace(/^The /, '')} mode doesn't tell you yet!`,
    html:        htmlMail2,
    scheduledAt,
  });

  if (mail2Error) {
    console.error('Mail 2 schedule failed:', mail2Error.message);
    // Mail 1 est déjà envoyé — on log l'erreur mais on ne bloque pas
    // la réponse succès côté client (Mail 1 est la priorité)
  }

  // 14. RÉPONSE
  return res.status(200).json({ success: true });
}
