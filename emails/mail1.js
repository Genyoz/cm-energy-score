// emails/mail1.js
// Template HTML du Mail 1 — envoi immédiat après validation du popup.
// Tout le CSS est inline — les clients mail (Gmail) strippent les <style>.
// Variables d'environnement utilisées : FOUNDER_NAME, CMES_URL (passées en param depuis send-mail.js)

// Noms affichés par profil (clé interne → nom EN)
const PROFILE_NAMES = {
  reactivite:   'The Firefighter',
  repetition:   'The Concierge',
  invisibilite: 'The Ghost Developer',
  dependance:   'The Guardian',
  eponge:       'The Handyman',
  architecte:   'The Architect',
};

export function mail1Template({
  profil_dominant,
  profil_secondaire,
  score_10,
  shareImageUrl,
  restitution,       // jsonb : { block3, reframe, bridge, secondary }
  deepDiveUrl,
  founderName,       // process.env.FOUNDER_NAME
  cmesUrl,           // process.env.CMES_URL
  email,             // adresse du destinataire — pour le lien unsubscribe
}) {

  const profileName          = PROFILE_NAMES[profil_dominant]  || profil_dominant;
  const profileSecondaryName = profil_secondaire ? (PROFILE_NAMES[profil_secondaire] || profil_secondaire) : null;
  const hasSecondary         = profileSecondaryName !== null;

  // ── Bloc secondaire conditionnel ─────────────────────────────────────────
  const secondaryBlock = hasSecondary ? `
    <div style="padding:22px 24px;border-radius:14px;background:rgba(249,207,129,0.08);margin-top:0;">
      <div style="font-size:9px;font-weight:400;letter-spacing:0.10em;text-transform:uppercase;color:rgba(85,58,89,0.60);margin-bottom:8px;">Secondary profile</div>
      <div style="font-size:15px;font-weight:600;color:#2a1f2e;margin-bottom:12px;">${profileSecondaryName}</div>
      <div style="font-size:14px;font-weight:300;line-height:1.75;color:#553a59;">
        ${restitution.secondary || ''}
      </div>
    </div>
  ` : '';

  // ── HTML complet ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your CM Energy Score results</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
  </style>
  <style>
    @media (max-width: 480px) {
      .mail-inner { padding: 20px 20px 32px !important; }
      .share-img  { max-width: 100% !important; border-radius: 10px !important; margin-bottom: 24px !important; }
      .intro      { padding-left: 14px !important; margin-bottom: 28px !important; }
      .intro-p    { font-size: 13px !important; }
      .blocks     { gap: 14px !important; }
      .block-card { padding: 16px 18px !important; }
      .block-text { font-size: 13px !important; }
      .block-sec  { padding: 16px 18px !important; }
      .block-sec-title { font-size: 14px !important; }
      .separator  { margin: 24px 0 20px !important; }
      .footer-badge { font-size: 12px !important; padding: 7px 16px !important; }
      .footer-meta  { font-size: 10px !important; }
      .footer-copy  { font-size: 10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#fdf9f2;font-family:'Poppins',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf9f2;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fdf9f2;">
          <tr>
            <td class="mail-inner" style="padding:48px 40px 40px;">

              <!-- IMAGE PARTAGEABLE — cliquable, même lien que "Post your result" -->
              <a href="${shareImageUrl}&download=1" target="_blank" style="display:block;text-decoration:none;max-width:520px;margin:0 auto;">
                <img
                  class="share-img"
                  src="${shareImageUrl}"
                  alt="Your CM Energy Score result — ${profileName}, score ${score_10}"
                  width="520"
                  border="0"
                  style="display:block;width:100%;max-width:520px;margin:0 auto 10px;border-radius:14px;border:0;"
                />
              </a>
              <p style="margin:0 0 32px 0;text-align:center;font-size:12px;font-weight:400;line-height:1.5;">
                <a href="${shareImageUrl}&download=1" target="_blank" style="color:#ed8c66;text-decoration:none;">&#8595;&nbsp; Click the image to save it</a>
              </p>

              <!-- INTRO -->
              <div class="intro" style="padding-left:18px;border-left:1px solid rgba(42,31,46,0.40);margin-bottom:40px;">
                <p class="intro-p" style="font-size:14px;line-height:1.75;color:rgba(85,58,89,0.80);font-weight:300;margin:0 0 12px 0;">
                  This result puts a spotlight on an unseen reality about the Discord CM role, one the market and your decision-makers overlook. <span style="font-weight:400;color:rgba(85,58,89,1);">Posting your result and spreading the word about</span> this test will get common findings out at scale, from one single source! The more of us share it, the more weight this analysis carries.
                </p>
                <p class="intro-p" style="font-size:14px;line-height:1.75;color:rgba(85,58,89,0.80);font-weight:400;margin:0;">
                  Relate to this? Post the image above on LinkedIn, tag <strong style="font-weight:500;">${founderName}</strong>, and drop the scoring tool link: <a href="${cmesUrl}" style="color:#ed8c66;text-decoration:none;font-weight:400;">${cmesUrl}</a>
                </p>
              </div>

              <!-- BLOCS RESTITUTION -->
              <div class="blocks" style="margin-bottom:24px;">

                <!-- BLOC 3 — THE PATTERN -->
                <div class="block-card" style="padding:22px 24px;border-radius:14px;background:rgba(255,255,255,0.80);border:1px solid #ffffff;margin-bottom:24px;">
                  <div style="font-size:10px;font-weight:400;letter-spacing:0.10em;text-transform:uppercase;color:rgba(42,31,46,0.40);margin-bottom:12px;">The pattern</div>
                  <div class="block-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(42,31,46,0.80);">
                    ${restitution.block3 || ''}
                  </div>
                </div>

                <!-- BLOC 4 — THE REFRAME -->
                <div class="block-card" style="padding:22px 24px;border-radius:14px;background:rgba(255,255,255,0.80);border:1px solid #ffffff;margin-bottom:24px;">
                  <div style="font-size:10px;font-weight:400;letter-spacing:0.10em;text-transform:uppercase;color:rgba(42,31,46,0.40);margin-bottom:12px;">The reframe</div>
                  <div class="block-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(42,31,46,0.80);">
                    ${restitution.reframe || ''}
                  </div>
                </div>

                <!-- BLOC 5 — THE HIDDEN CAUSE -->
                <div class="block-card" style="padding:22px 24px;border-radius:14px;background:rgba(255,255,255,0.80);border:1px solid #ffffff;margin-bottom:24px;">
                  <div style="font-size:10px;font-weight:400;letter-spacing:0.10em;text-transform:uppercase;color:rgba(42,31,46,0.40);margin-bottom:12px;">The hidden cause</div>
                  <div class="block-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(42,31,46,0.80);">
                    ${restitution.bridge || ''}
                  </div>
                </div>

                <!-- BLOC SECONDAIRE — conditionnel -->
                ${secondaryBlock}

              </div>

              <!-- CTA — côte à côte sur ordinateur, empilés sur mobile.
                   Sans flexbox ni media query : Gmail supprime gap / flex-wrap / flex-direction. -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="font-size:0;line-height:0;text-align:center;">

                      <div style="display:inline-block;width:100%;max-width:242px;vertical-align:top;padding:6px;box-sizing:border-box;">
                        <a href="${shareImageUrl}&download=1" target="_blank"
                           style="display:block;height:48px;line-height:48px;border-radius:11px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:500;text-align:center;text-decoration:none;background-color:#ed8c66;background-image:linear-gradient(135deg,#553a59,#d16b59,#f9cf81);color:#fefbf8;">Post your result</a>
                      </div>

                      <div style="display:inline-block;width:100%;max-width:242px;vertical-align:top;padding:6px;box-sizing:border-box;">
                        <a href="${deepDiveUrl}" target="_blank"
                           style="display:block;height:46px;line-height:46px;border-radius:11px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:500;text-align:center;text-decoration:none;background-color:rgba(255,255,255,0.80);border:1px solid #ffffff;color:#553a59;">Go to the deep dive</a>
                      </div>

                    </td>
                  </tr>
                </table>

              <!-- SÉPARATEUR -->
              <hr class="separator" style="border:none;border-top:1px solid rgba(42,31,46,0.10);margin:36px 0 32px;" />

              <!-- FOOTER -->
              <div style="text-align:center;">
                <div class="footer-badge" style="display:inline-block;padding:8px 20px;border-radius:999px;background:rgba(255,255,255,0.80);border:1px solid #ffffff;font-size:13px;font-weight:500;color:#ed8c66;margin-bottom:12px;">
                  Carefully made for CMs
                </div>
                <p class="footer-meta" style="font-size:11px;font-weight:300;color:rgba(85,58,89,0.50);line-height:1.7;margin:0 0 6px 0;">
                  You received this because you completed the CM Energy Score.<br>
                  <a href="${cmesUrl}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(85,58,89,0.50);text-decoration:underline;">Unsubscribe</a>
                  &nbsp;·&nbsp;
                  <a href="https://designtechcare.notion.site/Privacy-Policy-33162f1c9152804d82b9e863ab49991d" style="color:rgba(85,58,89,0.50);text-decoration:underline;">Privacy Policy</a>
                </p>
                <p class="footer-copy" style="font-size:11px;font-weight:300;color:rgba(85,58,89,0.40);margin:0;">© 2026 Genyōz · All rights reserved</p>
              </div>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
