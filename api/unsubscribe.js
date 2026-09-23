// api/unsubscribe.js
// Fonction serverless Vercel — gère les demandes de désabonnement.
// Déclenchée par le lien unsubscribe dans le footer des mails.
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY
//   ADMIN_EMAIL
//   CMES_URL

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ─── Clients ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {

  // 1. MÉTHODE — GET uniquement (lien cliqué depuis le mail)
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // 2. EXTRACTION EMAIL
  const email = req.query.email;

  if (!email) {
    return res.status(400).send(pageHtml('Something went wrong.', 'No email address was provided.'));
  }

  // 3. UPDATE SUPABASE — marquer unsubscribed = true
  const { error: updateError } = await supabase
    .from('respondents')
    .update({ unsubscribed: true })
    .eq('email', email);

  if (updateError) {
    console.error('Unsubscribe UPDATE failed:', updateError.message);
    // On continue quand même — on envoie la notif admin et on confirme à l'utilisateur
  }

  // 4. NOTIF ADMIN — email de notification
  await resend.emails.send({
    from:    'CM Energy Score <results@cmes.genyoz.com>',
    to:      process.env.ADMIN_EMAIL,
    subject: '[CMES] Unsubscribe request',
    html:    `<p style="font-family:Arial,sans-serif;font-size:14px;color:#2a1f2e;">
               <strong>${email}</strong> has requested to unsubscribe from CM Energy Score emails.<br><br>
               Action required if Mail 2 is still scheduled in Resend: cancel it manually from the Resend dashboard.
             </p>`,
  });

  // 5. RÉPONSE — page de confirmation pour l'utilisateur
  return res.status(200).send(pageHtml(
    "You've been unsubscribed.",
    "You won't receive any more emails from CM Energy Score."
  ));
}

// ─── Page HTML de confirmation ────────────────────────────────────────────────

function pageHtml(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      margin: 0; padding: 0;
      background: #fdf9f2;
      font-family: 'Poppins', Arial, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      max-width: 480px; width: 100%;
      margin: 40px 20px;
      background: rgba(255,255,255,0.80);
      border: 1px solid #ffffff;
      border-radius: 16px;
      padding: 48px 40px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 999px;
      background: rgba(255,255,255,0.80);
      border: 1px solid #ffffff;
      font-size: 13px;
      font-weight: 500;
      color: #ed8c66;
      margin-bottom: 28px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #2a1f2e;
      margin: 0 0 12px 0;
    }
    p {
      font-size: 14px;
      font-weight: 300;
      line-height: 1.75;
      color: rgba(85,58,89,0.80);
      margin: 0 0 28px 0;
    }
    a {
      font-size: 13px;
      color: rgba(85,58,89,0.50);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Carefully made for CMs</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://ai.genyoz.com/">Back to Genyōz</a>
  </div>
</body>
</html>`;
}
