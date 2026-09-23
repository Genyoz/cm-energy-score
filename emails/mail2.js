// emails/mail2.js
// Template HTML du Mail 2 — envoyé J+2 après Mail 1.
// Tout le CSS est inline — les clients mail (Gmail) strippent les <style>.

// Noms affichés par profil (clé interne → nom EN)
const PROFILE_NAMES = {
  reactivite:   'The Firefighter',
  repetition:   'The Concierge',
  invisibilite: 'The Ghost Developer',
  dependance:   'The Guardian',
  eponge:       'The Handyman',
  architecte:   'The Architect',
};

// ─── Tables hardcodées par profil ────────────────────────────────────────────

// Blind Spot — ${profileName} et ${score} injectés dynamiquement
const BLIND_SPOT = {
  reactivite: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't reveal a lack of personal method. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive reveals</span> that a silent force is the architect of the system you're subject to, one that was never designed to absorb the load it places on you. Your system therefore structurally produces an operating mode that constantly keeps you in reactivity.`,

  repetition: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't reveal that the information doesn't exist or isn't accessible. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive actually reveals</span> that, not being the true architect of your system, you have to prioritize the social and marketing side of your work, at the expense of what runs in the background, like your community's governance. That's what makes it harder to keep a living space always up to date.`,

  invisibilite: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't reveal your inability to make your work count. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive actually reveals</span> that the market's own logic keeps the perception of your role stuck in its purely social and marketing dimension. In turn, that same market never lifts the veil on how your role has quietly shifted toward architecting a system you're not the designer of.`,

  dependance: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't reveal an inability to delegate or an incompetent team. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive actually reveals</span> that the invisible layers of your work, like your server's transmission or your team's coordination, don't receive the same attention from the market as your social and marketing work. The time allocated to this kind of task, often time-consuming, is therefore harder to defend.`,

  eponge: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't reveal a disorganized way of working. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive actually reveals</span> that the market and its motivations are what make you compensate for a system that doesn't account for the full scope of your role, not just the social or marketing side, but also governance, coordination, and maintenance. The market measures your visible performance, but never the one happening in the background.`,

  architecte: (profileName, score) => `Your operating mode <strong style="font-weight:400;color:rgba(85,58,89,1);">${profileName}</strong> and your score <strong style="font-weight:400;color:rgba(85,58,89,1);">${score}</strong> don't guarantee that you're the master of your system. <span style="font-weight:400;color:rgba(85,58,89,1);">Our deep dive actually reveals</span> that you've done very well at getting your system to absorb a large part of the invisible layer of your role, but not necessarily that your system is able to make your own work visible. The truth is, you're mostly adapting to the architecture the market imposes, one that only values the performance of your social and marketing work, at the expense of the unseen work it depends on.`,
};

// Where to Dig — URLs injectées dynamiquement
const WHERE_TO_DIG = {
  reactivite: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0 0 10px 0;"><a href="${urls.trials}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Trials: What the Arena Hides About the Community Ops Role</a> which should speak to your situation</p>
    <p style="margin:0;"><a href="${urls.revelation}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Revelation</a> which clearly exposes the engine behind the system that makes you operate like a firefighter</p>
  `,

  repetition: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0 0 10px 0;"><a href="${urls.architecture}" style="color:#ed8c66;font-weight:400;text-decoration:none;">What Really Drives the CM's Architecture System</a> which will help you understand why you don't really have control over your system's architecture</p>
    <p style="margin:0;"><a href="${urls.system}" style="color:#ed8c66;font-weight:400;text-decoration:none;">When System Doesn't Carry the Entire Community Ops Role</a> which explains how we got to that conclusion</p>
  `,

  invisibilite: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0;"><a href="${urls.trials}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Trials: What the Arena Hides About the Community Ops Role</a> and <a href="${urls.revelation}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Revelation</a> will explain how the system defines its own architecture, one you're forced to follow. It makes the background work you carry out invisible, even though the visible performance the market values actually depends on it.</p>
  `,

  dependance: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0;"><a href="${urls.revelation}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Revelation</a> and <a href="${urls.transformation}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Necessary Transformation</a> where you'll understand how not proving the value of the invisible layers of your work impacts the time you can allocate to them, and what's really behind that lack of recognition.</p>
  `,

  eponge: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0 0 10px 0;"><a href="${urls.trials}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Trials: What the Arena Hides About the Community Ops Role</a> which should speak to your situation</p>
    <p style="margin:0;"><a href="${urls.revelation}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The Revelation</a> which clearly exposes the engine behind the system that's slowly leading you toward burnout</p>
  `,

  architecte: (urls) => `
    <p style="font-weight:400;margin:0 0 10px 0;">I highly recommend reading:</p>
    <p style="margin:0;">From <a href="${urls.architecture}" style="color:#ed8c66;font-weight:400;text-decoration:none;">What Really Drives the CM's Architecture System</a> all the way to, and especially, <a href="${urls.newworld}" style="color:#ed8c66;font-weight:400;text-decoration:none;">The New World of Discord CM</a>, you'll understand the exact dynamic at play, who's really in control of the system you run, and how to take back power over it to become its architect.</p>
  `,
};

// What Can Change — texte fixe par profil
const WHAT_CAN_CHANGE = {
  reactivite:   `Your results and Darda's world may look dystopian, but <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power to change things</span> by no longer being alone in absorbing the tasks, broken configs, or repeated questions that keep piling up. That's thanks to our AI solution, Aksa, to whom you can delegate part of that load.`,
  repetition:   `Your results and Darda's world may look dystopian, but <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power to change things</span> by delegating the work of keeping your documentation and space up to date as it evolves, so it stays readable. That's thanks to our AI solution, Aksa, with whom you can collaborate to free yourself from part of that load.`,
  invisibilite: `Your results and Darda's world may look dystopian, but <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power to change things</span> by taking back control of your system's architecture, delegating the invisible tasks of your role to free up your time, and, in time, make the value your work brings to your community's performance more visible. That's thanks to our AI solution, Aksa.`,
  dependance:   `Your results and Darda's world may look dystopian, but <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power to change things</span> by no longer carrying your Discord server alone, whether it's the configuration logic itself or its translation and handoff. That's thanks to our AI solution, Aksa, which will let you read your setup and translate it for different audiences.`,
  eponge:       `Your results and Darda's world may look dystopian, but <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power to change things</span> by taking back control of your system's architecture, thanks to our AI solution, Aksa. You'll be able to delegate several of the tasks you're compensating for: auditing, analysis, infrastructure design, and documentation, to free yourself from the mental load.`,
  architecte:   `Your results are good, but in the light of Darda's world, you'll discover <span style="font-weight:400;color:rgba(85,58,89,1);">you have the power</span> to finally bring to light the unseen, unrecognized work behind your visible performance. That's thanks to our AI solution, Aksa, which will very soon be able to measure the value of your work and its impact on your community's performance.`,
};

// ─── Template principal ───────────────────────────────────────────────────────

export function mail2Template({
  prenom,
  profil_dominant,
  score_10,
  deepDiveUrl,
  opscircleUrl,
  cmesUrl,
  email,             // adresse du destinataire — pour le lien unsubscribe
  // URLs des articles deep dive
  trialsUrl,
  revelationUrl,
  architectureUrl,
  systemUrl,
  transformationUrl,
  newworldUrl,
}) {

  const profileName = PROFILE_NAMES[profil_dominant] || profil_dominant;

  const urls = {
    trials:         trialsUrl,
    revelation:     revelationUrl,
    architecture:   architectureUrl,
    system:         systemUrl,
    transformation: transformationUrl,
    newworld:       newworldUrl,
  };

  const blindSpot    = BLIND_SPOT[profil_dominant]?.(profileName, score_10)   || '';
  const whereToDig   = WHERE_TO_DIG[profil_dominant]?.(urls)                  || '';
  const whatCanChange = WHAT_CAN_CHANGE[profil_dominant]                       || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>What your ${profileName} mode doesn't tell you yet</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
    @media (max-width: 480px) {
      .mail-inner  { padding: 20px 20px 32px !important; gap: 22px !important; }
      .opening     { font-size: 13.5px !important; }
      .body-text   { font-size: 13px !important; }
      .closing     { font-size: 13px !important; }
      .cta-section { gap: 28px !important; }
      .cta-wrap    { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
      .btn-primary, .btn-secondary { text-align: center !important; width: 100% !important; padding: 0 16px !important; display: block !important; }
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

              <!-- SALUTATION -->
              <div style="font-size:15px;font-weight:600;color:#2a1f2e;margin-bottom:28px;">${prenom},</div>

              <!-- COMMON OPENING -->
              <p class="opening" style="font-size:14.5px;font-weight:400;line-height:1.75;color:rgba(85,58,89,0.60);margin:0 0 28px 0;">
                <span style="color:rgba(85,58,89,1);">The system you operate to run your Discord community isn't yours.</span> It actually responds to an invisible logic whose motivations strip you of your strategic operational power, all while hiding the real value of your work from your decision-makers' eyes.
              </p>

              <!-- BLIND SPOT -->
              <div class="body-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(85,58,89,0.80);margin-bottom:28px;">
                <p style="margin:0;">${blindSpot}</p>
              </div>

              <!-- FILET BLOCK — Story bridge + Where to dig -->
              <div style="padding-left:18px;border-left:1px solid rgba(42,31,46,0.40);margin-bottom:28px;">

                <!-- COMMON STORY BRIDGE -->
                <div class="body-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(85,58,89,0.80);margin-bottom:16px;">
                  <p style="margin:0;">Your story looks a lot like <span style="font-weight:400;color:rgba(85,58,89,1);">@darda's</span>, whose adventures we tell in our deep dive on <span style="font-weight:400;color:rgba(85,58,89,1);">The World of Discord CMs.</span></p>
                </div>

                <!-- WHERE TO DIG -->
                <div class="body-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(85,58,89,0.80);">
                  ${whereToDig}
                </div>

              </div>

              <!-- WHAT CAN CHANGE -->
              <div class="body-text" style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(85,58,89,0.80);margin-bottom:28px;">
                <p style="margin:0;">${whatCanChange}</p>
              </div>

              <!-- CTA SECTION -->
              <div class="cta-section" style="margin-bottom:28px;">

                <!-- COMMON CLOSING -->
                <p class="closing" style="font-size:14px;font-weight:400;line-height:1.75;color:rgba(85,58,89,0.80);margin:0 0 40px 0;">
                  If you want to know how, discover the OpsCircle.<br>
                  Otherwise, go deeper into our deep dive.
                </p>

                <!-- DOUBLE CTA -->
                <div class="cta-wrap" style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
                  <a
                    href="${opscircleUrl}"
                    class="btn-primary"
                    style="display:inline-block;padding:0 28px;height:48px;line-height:48px;border-radius:11px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:500;text-decoration:none;background-color:#ed8c66;background-image:linear-gradient(135deg,#553a59,#d16b59,#f9cf81);color:#fefbf8;"
                  >
                    Discover the OpsCircle
                  </a>
                  <a
                    href="${deepDiveUrl}"
                    class="btn-secondary"
                    style="display:inline-block;padding:0 24px;height:48px;line-height:48px;border-radius:11px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:500;text-decoration:none;background:rgba(255,255,255,0.80);border:1px solid #ffffff;color:#553a59;"
                  >
                    Go to the deep dive
                  </a>
                </div>

              </div>

              <!-- SÉPARATEUR -->
              <hr style="border:none;border-top:1px solid rgba(42,31,46,0.10);margin:8px 0 0;" />

              <!-- FOOTER -->
              <div style="text-align:center;margin-top:28px;">
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
