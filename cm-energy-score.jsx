import React, { useMemo, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase — anon key volontairement en clair : clé publique par conception
// (RLS restreint son usage à INSERT uniquement sur la table respondents).
// Ne jamais y mettre le service_role key.
const supabase = createClient(
  'https://tybksqhfdkfovaeujvyy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5YmtzcWhmZGtmb3ZhZXVqdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDI0OTUsImV4cCI6MjEwMjcxODQ5NX0.IcZEBD_QtUzPsz9UqvqSxHq3LXJwl2N3PhmJnR0jDec'
);

// Assemble la restitution en objet JSON structuré pour la colonne
// `restitution` (jsonb) — permet à send-mail.js de placer chaque bloc
// au bon endroit dans le template mail sans parsing.
function buildRestitutionJSON(block3Text, reframeText, bridgeText, secondaryText) {
  return {
    block3:    block3Text,
    reframe:   reframeText,
    bridge:    bridgeText,
    secondary: secondaryText || null,
  };
}

// Insère la ligne initiale dans respondents dès la fin du test (avant
// tout formulaire email) — capture 100% des complétions. Un échec réseau
// ne bloque jamais l'affichage du résultat. Retourne l'id de la ligne
// créée (ou null en cas d'échec).
async function insertRespondent(computed, answers, restitutionJSON) {
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('respondents')
    .insert({
      id,
      score_percent:          computed.scorePercent,
      score_10:               computed.score10,
      profil_dominant:        computed.profilDominant,
      profil_secondaire:      computed.profilSecondaire,
      score_axe_reactivite:   computed.axisScoresBruts.reactivite,
      score_axe_repetition:   computed.axisScoresBruts.repetition,
      score_axe_invisibilite: computed.axisScoresBruts.invisibilite,
      score_axe_dependance:   computed.axisScoresBruts.dependance,
      score_axe_burnout:      computed.axisScoresBruts.burnout,
      reponses_brutes:        answers,
      restitution:            restitutionJSON,
    });

  if (error) {
    console.error('Insert respondents failed:', error);
    return null;
  }
  return id;
}

// URL réelle du deep dive — seul endroit à modifier si elle change.
const DEEP_DIVE_URL = 'https://hub.genyuss.com/p/truth-about-community-ops-role';

// Navigation via un vrai <a> créé/cliqué à la volée plutôt que
// window.location.href directement — certains environnements sandboxés
// (iframes d'artifact/preview) bloquent les redirections scriptées
// mais autorisent les clics sur de vrais liens. Comportement identique
// à window.location.href une fois déployé hors sandbox.
function navigateTo(url) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// GIF placeholder générique — à remplacer par les vrais GIFs (un par
// option de réponse) une fois fournis. Voir AnswerCard plus bas.


// ============================================================
// CM Energy Score — Composants UI partagés (étape 5 du plan,
// intégration du design — passe 1). Aucune dépendance au module
// scoring ni au module texte ci-dessous.
// ============================================================

function FlameLogo({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 480 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="flameGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9cf81" />
          <stop offset="50%" stopColor="#d16b59" />
          <stop offset="100%" stopColor="#2a1f2e" />
        </linearGradient>
      </defs>
      <path
        d="M317 34C317 34 300 90 260 130C220 170 175 175 160 235C150 200 165 175 130 190C60 220 35 300 35 375C35 470 110 545 240 545C370 545 445 470 445 375C445 320 420 280 400 260C405 285 385 290 375 275C360 250 365 200 317 34Z"
        fill="none" stroke="url(#flameGrad)" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round"
      />
      <path
        d="M275 255C275 255 265 285 240 305C215 325 190 330 182 360C177 340 185 328 165 335C125 350 110 395 110 435C110 485 150 520 220 520C290 520 330 485 330 435C330 405 315 385 305 373C308 386 296 389 290 380C282 366 285 340 275 255Z"
        fill="none" stroke="url(#flameGrad)" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  );
}

function Footer() {
  return (
    <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 300, color: 'rgba(85,58,89,0.60)', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>
      © 2026 Genyōz · All rights reserved{' · '}
      <a href="https://designtechcare.notion.site/Privacy-Policy-33162f1c9152804d82b9e863ab49991d" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Privacy Policy
      </a>
      {' · '}
      <a href="https://designtechcare.notion.site/Terms-of-Use-33162f1c915280d08e19d68c4af0631c" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Terms of Use
      </a>
    </div>
  );
}

// ============================================================
// LoadingScreen — jauge qui se remplit en boucle avec le logo flamme
// qui monte au meme niveau que le fluide, decale a droite de la
// jauge. Utilise entre Accueil -> Q1 et derniere Question -> Resultats.
// ============================================================
function LoadingScreen({ label, caption, mobile }) {
  const [pct, setPct] = useState(0);
  const gaugeHeight = mobile ? 200 : 240;
  const rafRef = React.useRef(null);

  useEffect(() => {
    const duration = 3200;
    let startTime = null;
    function ease(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    function tick(now) {
      if (startTime === null) startTime = now;
      const t = ((now - startTime) % duration) / duration;
      setPct(Math.round(ease(t) * 100));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const logoSize = mobile ? 30 : 34;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: mobile ? '64px 24px' : '80px 24px', background: '#fdf9f2', minHeight: mobile ? '100dvh' : '100vh', boxSizing: 'border-box', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>
      <div style={{ fontSize: mobile ? '9px' : '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(85,58,89,0.60)' }}>
        {label}
      </div>

      <div style={{ position: 'relative', width: mobile ? '180px' : '220px', height: `${gaugeHeight + 20}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ width: mobile ? '44px' : '56px', height: `${gaugeHeight}px`, position: 'relative', overflow: 'hidden', borderRadius: '999px', background: 'rgba(255,255,255,0.55)', border: '0.5px solid rgba(255,255,255,0.85)', boxShadow: '0 6px 18px rgba(237,140,102,0.30)' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, overflow: 'hidden', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${gaugeHeight}px`, background: 'linear-gradient(to top,#2a1f2e,#d16b59,#f9cf81)' }} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `${(pct / 100) * gaugeHeight - logoSize / 2}px`,
            transform: `translateX(calc(-50% + ${mobile ? 58 : 68}px))`,
            width: `${logoSize}px`,
            height: `${logoSize}px`,
            filter: 'drop-shadow(0 3px 6px rgba(190,150,140,0.35))',
          }}
        >
          <FlameLogo size={logoSize} />
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 400, color: '#4a3040' }}>
        {caption} <span style={{ fontWeight: 500 }}>{pct}%</span>
      </div>
    </div>
  );
}

// ============================================================
// DataBox — encart stats + anneau (SurveyResultsChart). CHART_DATA
// et les 2 phrases fixes ("X respondents...", "32% say...") sont des
// PLACEHOLDERS à remplacer par les vraies données une fois connues.
// ============================================================
const CHART_DATA = [
  { label: 'Proving worth', percent: 46, color: '#d16b59' },
  { label: 'Juggling tasks', percent: 18, color: '#ed8c66' },
  { label: 'Everything depends on', percent: 16, color: '#f1a385' },
  { label: 'Config issues', percent: 10, color: '#f5c0ab' },
  { label: 'Same questions', percent: 10, color: '#fad9cb' },
];

function SurveyResultsChart({ mobile }) {
  const circumference = 2 * Math.PI * 60;
  let cumulative = 0;
  const segments = CHART_DATA.map((d) => {
    const length = (d.percent / 100) * circumference;
    const seg = { ...d, length, offset: -cumulative };
    cumulative += length;
    return seg;
  });

  return (
    <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'center', gap: mobile ? '16px' : '18px' }}>
      <svg width={mobile ? 180 : 120} height={mobile ? 180 : 120} viewBox="0 0 150 150" style={{ flexShrink: 0 }}>
        <circle cx="75" cy="75" r="60" fill="none" stroke="rgba(85,58,89,0.08)" strokeWidth="18" />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="75" cy="75" r="60" fill="none"
            stroke={s.color} strokeWidth="18"
            strokeDasharray={`${s.length} ${circumference}`}
            strokeDashoffset={s.offset}
            transform="rotate(-90 75 75)"
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: mobile ? 'row' : 'column', flexWrap: mobile ? 'wrap' : 'nowrap', gap: '8px', fontSize: '11px', alignSelf: mobile ? 'flex-start' : 'auto' }}>
        {CHART_DATA.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
            <span style={{ color: '#2a1f2e' }}>{d.label} — {d.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// AXIS_META — couleur/glow/label affiché par axe (le label côté
// client peut différer de axisKey interne, ex. 'invisibilite' ->
// affiché "Operating Load")..
// ============================================================
const AXIS_META = {
  reactivite: { label: 'Reactivity', color: '#f4b1ab', textGlow: '0 0 20px rgba(244,177,171,0.65), 0 0 60px rgba(244,177,171,0.35), 0 0 120px rgba(244,177,171,0.15)', cardBorder: 'rgba(244,177,171,0.45)', cardGlow: '0 6px 18px rgba(244,177,171,0.30)' },
  repetition: { label: 'Repetition', color: '#f4b1ab', textGlow: '0 0 20px rgba(244,177,171,0.65), 0 0 60px rgba(244,177,171,0.35), 0 0 120px rgba(244,177,171,0.15)', cardBorder: 'rgba(244,177,171,0.45)', cardGlow: '0 6px 18px rgba(244,177,171,0.30)' },
  invisibilite: { label: 'Operating Load', color: '#ed8c66', textGlow: '0 0 20px rgba(209,107,89,0.55), 0 0 60px rgba(209,107,89,0.28), 0 0 120px rgba(249,207,129,0.15)', cardBorder: 'rgba(237,140,102,0.45)', cardGlow: '0 6px 18px rgba(237,140,102,0.30)' },
  dependance: { label: 'Dependency', color: '#ed8c66', textGlow: '0 0 20px rgba(209,107,89,0.55), 0 0 60px rgba(209,107,89,0.28), 0 0 120px rgba(249,207,129,0.15)', cardBorder: 'rgba(237,140,102,0.45)', cardGlow: '0 6px 18px rgba(237,140,102,0.30)' },
  burnout: { label: 'Burnout', color: '#d16b59', textGlow: '0 0 20px rgba(209,107,89,0.55), 0 0 60px rgba(209,107,89,0.28), 0 0 120px rgba(249,207,129,0.15)', cardBorder: 'rgba(237,140,102,0.45)', cardGlow: '0 6px 18px rgba(237,140,102,0.30)' },
};

function ProgressBar({ current, total }) {
  const percent = Math.round(((current + 1) / total) * 100);
  return (
    <div style={{ height: '6px', background: 'rgba(85,58,89,0.10)', borderRadius: '3px', marginBottom: '28px' }}>
      <div style={{ height: '100%', width: `${percent}%`, borderRadius: '3px', background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', transition: 'width 0.2s ease' }} />
    </div>
  );
}

function AxisLabel({ axisKey, mobile, centered }) {
  const meta = AXIS_META[axisKey];
  return (
    <div
      style={{
        fontSize: mobile ? '10px' : '11px',
        fontWeight: 400,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: meta.color,
        textShadow: meta.textGlow,
        marginBottom: mobile ? '10px' : '14px',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {meta.label}
    </div>
  );
}

function QuestionTitle({ text, mobile, centered }) {
  return (
    <div
      style={{
        fontSize: mobile ? '24px' : '28px',
        fontWeight: 400,
        lineHeight: mobile ? 1.35 : 1.3,
        color: '#2a1f2e',
        maxWidth: mobile ? 'none' : '760px',
        margin: mobile ? `0 0 28px 0` : `0 auto 28px`,
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {text}
    </div>
  );
}

// AnswerCard — option.gifUrl est lu directement depuis QUESTIONS.
// Champ vide ('') tant que les GIFs ne sont pas renseignés.
function AnswerCard({ option, axisKey, mobile, isSelected, hasSelection, onSelect }) {
  const meta = AXIS_META[axisKey];

  let cardStyle;
  if (isSelected) {
    cardStyle = { border: `1px solid ${meta.cardBorder}`, boxShadow: meta.cardGlow, opacity: 1, filter: 'none' };
  } else if (hasSelection) {
    cardStyle = { border: '0.5px solid rgba(255,255,255,0.75)', boxShadow: 'none', opacity: 0.4, filter: 'grayscale(0.5)' };
  } else {
    cardStyle = { border: '0.5px solid rgba(255,255,255,0.75)', boxShadow: meta.cardGlow, opacity: 1, filter: 'none' };
  }

  const base = {
    cursor: 'pointer',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.38)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    transition: 'all 0.15s ease',
    ...cardStyle,
  };

  function hideOnError(e) {
    e.target.style.display = 'none';
  }

  if (mobile) {
    return (
      <div onClick={onSelect} style={{ ...base, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
        <div style={{ width: '52px', height: '52px', flexShrink: 0, borderRadius: '10px', background: 'rgba(85,58,89,0.06)', overflow: 'hidden' }}>
          <img
            src={option.gifUrl}
            alt=""
            onError={hideOnError}
            style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', outline: 'none', display: 'block' }}
          />
        </div>
        {/* MODIF mobile : 13px/300 -> 14px/400 */}
        <div style={{ flex: 1, fontSize: '14px', fontWeight: 400, lineHeight: 1.45, color: '#2a1f2e' }}>{option.text}</div>
      </div>
    );
  }

  return (
    <div onClick={onSelect} style={{ ...base, padding: '16px' }}>
      <div style={{ width: '100%', height: '110px', borderRadius: '10px', background: 'rgba(85,58,89,0.06)', marginBottom: '14px', overflow: 'hidden' }}>
        <img
          src={option.gifUrl}
          alt=""
          onError={hideOnError}
          style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', outline: 'none', display: 'block' }}
        />
      </div>
      <div style={{ fontSize: '15px', fontWeight: 300, lineHeight: 1.4, color: '#2a1f2e' }}>{option.text}</div>
    </div>
  );
}

function PreviousButton({ mobile, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: mobile ? '46px' : '48px',
        flex: mobile ? 1 : undefined,
        padding: mobile ? undefined : '0 24px',
        borderRadius: '11px',
        fontSize: mobile ? '13px' : '15px',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        background: 'rgba(255,255,255,0.38)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '0.5px solid rgba(255,255,255,0.75)',
        color: '#553a59',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {mobile ? '← Prev' : '← Previous'}
    </button>
  );
}

function NextButton({ mobile, onClick, disabled, label, accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: mobile ? '46px' : '48px',
        flex: mobile ? 1 : undefined,
        padding: mobile ? undefined : '0 28px',
        borderRadius: '11px',
        fontSize: mobile ? '13px' : '15px',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        background: accent ? 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)' : '#2a1f2e',
        color: '#fefbf8',
        border: 'none',
        boxShadow: accent ? '0 6px 22px rgba(85,58,89,0.28)' : '0 6px 22px rgba(42,31,46,0.30)',
      }}
    >
      {label || 'Next →'}
    </button>
  );
}

// ============================================================
// ScoreGauge — barre verticale, radius round, glass 38%, dégradé
// Accent en reveal progressif, badge neu beige sur la coupure
// (chiffre arrondi, sans décimale), labels Compensation/Signal en Muted.
// ============================================================
function ScoreGauge({ scorePercent, score10Displayed, mobile }) {
  const width = mobile ? 56 : 72;
  const height = mobile ? 220 : 320;
  const roundedPoints = score10Displayed;
  const displayPercent = scorePercent === 0 ? 10 : scorePercent;
  const badgeTopPercent = 100 - displayPercent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: mobile ? '9px' : '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(85,58,89,0.60)' }}>
        Compensation
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ width: `${width}px`, height: `${height}px`, position: 'relative', overflow: 'hidden', borderRadius: '999px', background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '0.5px solid rgba(255,255,255,0.75)', boxShadow: '0 6px 18px rgba(237,140,102,0.30)' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${displayPercent}%`, overflow: 'hidden', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${height}px`, background: 'linear-gradient(to top,#2a1f2e,#d16b59,#f9cf81)' }} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: `${badgeTopPercent}%`, left: `${width / 2}px`, transform: 'translate(-50%,-50%)' }}>
          <div style={{ background: '#fdf9f2', boxShadow: '3px 3px 8px rgba(190,150,140,0.12), -2px -2px 5px rgba(255,255,255,0.85)', borderRadius: '20px', padding: mobile ? '3px 8px' : '4px 10px', fontSize: mobile ? '11px' : '13px', fontWeight: 600, color: '#2a1f2e' }}>
            {roundedPoints}
          </div>
        </div>
      </div>
      <div style={{ fontSize: mobile ? '9px' : '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(85,58,89,0.60)' }}>
        Signal
      </div>
    </div>
  );
}

// ============================================================
// ProfileHeader — score détaillé (weight 400, Plum Deep), "Your
// dominant operating mode" (weight 400, plum-soft), nom du profil
// dominant (weight 600, Coral + Glow), ligne secondaire (weight 300,
// Muted). Centré. Score affiché SANS "/10" — juste le nombre.
// ============================================================
function ProfileHeader({ score10Displayed, dominantName, secondaryText, mobile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
      <div style={{ fontSize: mobile ? '22px' : '28px', fontWeight: 400, color: '#2a1f2e', lineHeight: 1 }}>
        {score10Displayed}
      </div>
      <div style={{ fontSize: mobile ? '12px' : '14px', fontWeight: 400, color: '#4a3040', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>
        Your dominant operating mode
      </div>
      <div
        style={{
          fontSize: mobile ? '18px' : '22px',
          fontWeight: 600,
          color: '#ed8c66',
          textShadow: '0 0 20px rgba(209,107,89,0.55), 0 0 60px rgba(209,107,89,0.28), 0 0 120px rgba(249,207,129,0.15)',
        }}
      >
        {dominantName}
      </div>
      {secondaryText && (
        <div style={{ fontSize: mobile ? '12px' : '14px', fontWeight: 300, color: 'rgba(85,58,89,0.60)' }}>
          {secondaryText}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RevealButton — Plum Deep, neumorphisme atténué, sans flèche.
// ============================================================
function RevealButton({ onClick, mobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: mobile ? '12px 22px' : '12px 24px',
        borderRadius: '11px',
        fontSize: mobile ? '13px' : '14px',
        fontWeight: 500,
        background: '#2a1f2e',
        color: '#fefbf8',
        border: 'none',
        boxShadow: '2px 2px 6px rgba(0,0,0,0.22), -2px -2px 6px rgba(255,255,255,0.04)',
        cursor: 'pointer',
        marginTop: '16px',
      }}
    >
      See my full results
    </button>
  );
}

// ============================================================
// PageShell — conteneur glass qui enveloppe toute la restitution.
// ============================================================
function PageShell({ children, mobile }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: mobile ? '100dvh' : '100vh',
        background: '#fdf9f2',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: "'Visby CF', 'Poppins', sans-serif",
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, padding: mobile ? '24px' : '32px' }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// FunctionCard — glass soft 38%, glow Coral atténué, sous-titre en
// label d'axe Muted, texte 300 Plum Deep. ctaLine optionnelle stylée
// à part (500, dégradé) — utilisée pour la ligne "Discover how...".
// Note : les phrases stables (This isn't/It's the result of/etc.)
// ne sont pas mises en weight 400 ici — texte généré dynamiquement,
// nuance abandonnée (décision actée en conversation).
// ============================================================
function FunctionCard({ subtitle, text, ctaLine, revealRef, revealed }) {
  return (
    <div
      ref={revealRef}
      style={{
        padding: '18px',
        borderRadius: '14px',
        background: 'rgba(255,255,255,0.38)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '0.5px solid rgba(255,255,255,0.75)',
        boxShadow: '0 6px 18px rgba(237,140,102,0.18)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(85,58,89,0.60)', marginBottom: '8px' }}>
        {subtitle}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 300, lineHeight: 1.6, color: '#2a1f2e', whiteSpace: 'pre-line' }}>
        {text}
      </div>
      {ctaLine && (
        <div
          style={{
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.6,
            marginTop: '12px',
            background: 'linear-gradient(90deg,#553a59,#d16b59,#f9cf81)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {ctaLine}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SecondaryProfileCard — Yellow Joy 8%, sans contour, positionnée
// après les 3 FunctionCard.
// ============================================================
function SecondaryProfileCard({ name, text, revealRef, revealed }) {
  return (
    <div
      ref={revealRef}
      style={{
        padding: '20px',
        borderRadius: '14px',
        background: 'rgba(249,207,129,0.08)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={{ fontSize: '9px', fontWeight: 400, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(85,58,89,0.60)', marginBottom: '8px' }}>
        Secondary profile
      </div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#2a1f2e', marginBottom: '6px' }}>
        {name}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 300, lineHeight: 1.5, color: '#553a59', whiteSpace: 'pre-line' }}>
        {text}
      </div>
    </div>
  );
}

// ============================================================
// CtaButtonsRow — "Go to the deep dive" en Accent gradient,
// "Email me my results" en glass.
// ============================================================
function CtaButtonsRow({ onOpenDeepDive, onOpenEmail }) {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={onOpenDeepDive}
        style={{
          padding: '0 28px',
          height: '48px',
          borderRadius: '11px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)',
          color: '#fefbf8',
          border: 'none',
          boxShadow: '0 6px 22px rgba(85,58,89,0.28)',
        }}
      >
        Go to the deep dive
      </button>
      <button
        onClick={onOpenEmail}
        style={{
          padding: '0 24px',
          height: '48px',
          borderRadius: '11px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.38)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '0.5px solid rgba(255,255,255,0.75)',
          color: '#553a59',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        Email me my results
      </button>
    </div>
  );
}

// ============================================================
// AuthStyledField — le blur vit sur un div wrapper (pas sur l'input
// natif), plus fiable cross-browser. Focus et erreur gérés en state
// React plutôt qu'en manipulation DOM directe.
// ============================================================
function AuthStyledField({ label, type, placeholder, value, onChange, optional, helpText, error }) {
  const [focused, setFocused] = useState(false);

  let boxShadow = 'inset 0 0 0 0.5px rgba(244,177,171,0.45)';
  if (error) boxShadow = 'inset 0 0 0 1px #ed8c66, 0 0 0 3px rgba(237,140,102,0.16)';
  else if (focused) boxShadow = 'inset 0 0 0 0.5px rgba(209,107,89,0.55), 0 0 0 3px rgba(244,177,171,0.25)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11.5px', fontWeight: 500, color: 'rgba(85,58,89,0.60)', letterSpacing: '0.02em' }}>
        {label} {optional && <span style={{ color: 'rgba(85,58,89,0.35)' }}>(optional)</span>}
      </label>
      <div
        style={{
          borderRadius: '16px',
          background: focused ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow,
          transition: 'box-shadow 0.15s ease, background 0.15s ease',
        }}
      >
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 14px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '13.5px',
            fontWeight: 300,
            fontFamily: "'Visby CF', 'Poppins', sans-serif",
            color: '#3d2a30',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: '#ed8c66', letterSpacing: '0.01em', padding: '4px 2px 0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ed8c66" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {helpText && !error && (
        <div style={{ fontSize: '11px', color: 'rgba(85,58,89,0.35)', padding: '0 2px' }}>{helpText}</div>
      )}
    </div>
  );
}

function DataBox({ mobile }) {
  return (
    <div
      style={{
        padding: '32px',
        width: '100%',
        background: 'rgba(255,255,255,0.38)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '0.5px solid rgba(255,255,255,0.75)',
        borderRadius: '18px',
        boxSizing: 'border-box',
        fontFamily: "'Visby CF', 'Poppins', sans-serif",
      }}
    >
      <div style={{ display: mobile ? 'block' : 'flex', gap: '24px', marginBottom: '20px' }}>
        <div style={{ flex: 1, fontSize: '15px', fontWeight: 300, lineHeight: 1.6, color: 'rgba(85,58,89,0.60)', display: 'flex', alignItems: 'center', marginBottom: mobile ? '20px' : 0 }}>
          We opened an investigation into what weighs the most on Community Ops professionals in their day-to-day mission of engaging their community on Discord.
        </div>

        {!mobile && <div style={{ width: '1px', background: 'rgba(85,58,89,0.15)', flexShrink: 0 }} />}

        <div style={{ flex: 1 }}>
          <SurveyResultsChart mobile={mobile} />
          <div style={{ fontSize: '11px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(85,58,89,0.60)', marginTop: '12px' }}>
            39 respondents from LinkedIn survey
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', borderRadius: '10px', border: '1px solid rgba(85,58,89,0.25)', fontSize: '13px', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6, color: '#553a59' }}>
        <span style={{ fontWeight: 500 }}>Observed signal:</span> Qualitative feedback points to work invisibility and dependency on one person as the two heaviest weights combined — together accounting for more than 6 out of 10 respondents (62%) in our investigation. More striking still: 46% point to proving their worth and unseen work as their single biggest frustration (nearly three times the next most cited factor). Meanwhile, the reactive, "firefighting" side of the role most people associate with this job weighs less than expected: only 38% combined, across juggling tasks, configuration issues, and repeated questions. What these numbers point to isn't isolated pressures, but deeper structural causes, tied to the very nature of the role: ones this test will reveal for each practitioner, individually.
      </div>
    </div>
  );
}

// ============================================================
// NarrativeSection — texte narratif + bouton "Uncover it!". Reçoit
// onStart (même handler que le bouton "Start!" du Hero) pour que les
// 2 CTAs de la page d'accueil déclenchent le même flux loading -> Q1.
// ============================================================
function NarrativeSection({ mobile, onStart }) {
  return (
    <div style={{ width: '100%', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 400, lineHeight: 1.6, color: 'rgba(85,58,89,0.60)', marginBottom: '10px' }}>
          Our investigation shows that Community Ops professionals know what drains their energy — but do they know how much, and more importantly, where it actually comes from?
        </div>
        <div style={{ fontSize: '15px', fontWeight: 300, lineHeight: 1.7, color: 'rgba(85,58,89,0.60)' }}>
          After 6 months of field observation with professionals on their day-to-day operational realities, and following this investigation, we've identified several culprits the industry often overlooks, ones that might explain what's really behind the pressure they feel. <span style={{ fontWeight: 400 }}>The question is: which of these hidden culprits is yours?</span>
        </div>
      </div>

      <div
        style={{
          paddingLeft: '16px',
          borderLeft: '2px solid',
          borderImage: 'linear-gradient(180deg,#f4b1ab,#d16b59,#f9cf81) 1',
          fontSize: '18px',
          fontStyle: 'italic',
          fontWeight: 400,
          lineHeight: 1.5,
          color: '#2a1f2e',
          marginBottom: '24px',
        }}
      >
        Uncover the hidden culprit behind <span style={{ fontWeight: 600 }}>your</span> community-engagement burnout!
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onStart}
          style={{
            height: '48px',
            padding: '0 28px',
            borderRadius: '11px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.38)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '0.5px solid rgba(255,255,255,0.75)',
            boxShadow: 'none',
          }}
        >
          <span
            style={{
              background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Uncover it!
          </span>
        </button>
      </div>

    </div>
  );
}

// ============================================================
// HomeScreen — Hero (badge + titre + CTA "Start!") puis DataBox +
// NarrativeSection (CTA "Uncover it!") + Footer. Deux mises en page
// distinctes (mobile empilé / desktop deux colonnes), toutes deux
// alimentées par le même onStart.
// ============================================================
function HomeScreen({ mobile, onStart }) {
  if (mobile) {
    return (
      <div style={{ width: '100%', background: '#fdf9f2', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>

        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.38)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 6px 14px rgba(237,140,102,0.22)',
            padding: '48px 36px 36px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '12px', padding: '9px 20px 9px 11px', borderRadius: '999px', marginBottom: '14px', background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '0.5px solid rgba(255,255,255,0.75)' }}>
            <div style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FlameLogo size={22} /></div>
            <span style={{ fontWeight: 500, fontSize: '12px', background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>CM Energy Score</span>
          </div>
          {/* MODIF mobile : titre 37px/400 -> 42px/500 */}
          <div style={{ fontSize: '42px', fontWeight: 500, lineHeight: 1.25, color: '#2a1f2e', marginBottom: '16px' }}>
            Does engaging your community lead to{' '}
            <span style={{ background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>burnout</span>?
          </div>
          {/* MODIF mobile : sous-titre 400 -> 500 */}
          <div style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: 'rgba(85,58,89,0.60)', marginBottom: '20px' }}>
            This free 5-minute scoring tool, reveals your energy investment level and uncovers the blind spots you've never seen in your Discord community operations.
          </div>
          <button
            onClick={onStart}
            style={{ height: '48px', padding: '0 32px', borderRadius: '11px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', color: '#fefbf8', border: 'none', boxShadow: '0 6px 22px rgba(85,58,89,0.28)', marginBottom: '16px', width: '100%' }}
          >
            Start!
          </button>
          {/* MODIF mobile : 300 -> 400 */}
          <div style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(85,58,89,0.60)' }}>
            5 minutes. Free. No mail needed to run.
          </div>
        </div>

        <div style={{ padding: '40px 24px 0' }}>
          <DataBox mobile={true} />
          <div style={{ marginTop: '40px', paddingBottom: '38px' }}>
            <NarrativeSection mobile={true} onStart={onStart} />
          </div>
          <div style={{ paddingBottom: '12px' }}>
            <Footer />
          </div>
        </div>

      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#fdf9f2', display: 'flex', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>

      {/* Colonne gauche — le hero seul, fixe, ne scrolle jamais */}
      <div style={{ width: '40%', height: '100vh', position: 'sticky', top: 0, boxShadow: '6px 0 14px rgba(237,140,102,0.30)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '9px 20px 9px 11px', borderRadius: '999px', marginBottom: '14px', background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '0.5px solid rgba(255,255,255,0.75)' }}>
            <div style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FlameLogo size={22} /></div>
            <span style={{ fontWeight: 500, fontSize: '12px', background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>CM Energy Score</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 400, lineHeight: 1.25, color: '#2a1f2e', marginBottom: '18px' }}>
            Does engaging your community lead to{' '}
            <span style={{ background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>burnout</span>?
          </div>
          <div style={{ fontSize: '15px', fontWeight: 400, lineHeight: 1.6, color: 'rgba(85,58,89,0.60)', marginBottom: '24px', maxWidth: '380px' }}>
            This free 5-minute scoring tool, reveals your energy investment level and uncovers the blind spots you've never seen in your Discord community operations.
          </div>
          <button
            onClick={onStart}
            style={{ height: '48px', padding: '0 32px', borderRadius: '11px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)', color: '#fefbf8', border: 'none', boxShadow: '0 6px 22px rgba(85,58,89,0.28)', marginBottom: '16px' }}
          >
            Start!
          </button>
          <div style={{ fontSize: '13px', fontWeight: 300, color: 'rgba(85,58,89,0.60)' }}>
            5 minutes. Free. No mail needed to run.
          </div>
        </div>
      </div>

      {/* Colonne droite — data puis narrative empilés, scrolle seule */}
      <div style={{ width: '60%', height: '100vh', overflowY: 'auto', padding: '48px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <DataBox mobile={false} />
          <div style={{ marginTop: '40px', paddingBottom: '38px' }}>
            <NarrativeSection mobile={false} onStart={onStart} />
          </div>
          <div style={{ paddingBottom: '12px' }}>
            <Footer />
          </div>
        </div>
      </div>

    </div>
  );
}

// ============================================================
// CM Energy Score — Module de scoring (étape 1 du plan, section 7.5)
// Logique pure, validée sur 15 scénarios fictifs. Voir spec section 5
// + corrections actées en conversation :
//   - règle de dominance à écarts (Cas A/B/C/D), remplace le seuil 8/12
//   - seuil bande Architecte : scorePercent <= 20.0 (pas 22)
//   - plancher pondéré normalisé (raw-3)/9, jamais raw/12
//   - un seul arrondi, à la sortie de computeSeverityScore
// AUCUNE interface pour l'instant (étapes 2 à 5 restent à faire).
// ============================================================

const HIERARCHIE = ['invisibilite', 'dependance', 'reactivite', 'repetition'];

// --- Fonction 1 ---
function computeAxisScores(answers) {
  const axisScores = {};
  for (const axe of Object.keys(answers)) {
    axisScores[axe] = answers[axe].reduce((sum, v) => sum + v, 0);
  }
  return axisScores;
}

// --- Fonction 2 : usage exclusif = plancher pondéré (computeSeverityScore) ---
function normalizeAxisPercent(rawScore) {
  return ((rawScore - 3) / 9) * 100;
}

// --- Fonction 2bis : usage exclusif = affichage comparatif entre axes ---
function axisDisplayPercent(rawScore) {
  return (rawScore / 12) * 100;
}

// --- Fonction 3 ---
function computeSeverityScore(axisScores) {
  const axes = ['reactivite', 'repetition', 'invisibilite', 'dependance', 'burnout'];
  const totalBrut = axes.reduce((sum, axe) => sum + axisScores[axe], 0);
  const globalAverage = ((totalBrut - 15) / 45) * 100;

  const axesQualifies = axes.filter((axe) => axisScores[axe] >= 8);
  const nombreQualifies = axesQualifies.length;

  const poidsTable = { 0: 0.0, 1: 0.25, 2: 0.5, 3: 0.74, 4: 1.0, 5: 1.0 };
  const poids = poidsTable[nombreQualifies];

  let scoreFinalBrut;
  if (nombreQualifies === 0) {
    scoreFinalBrut = globalAverage;
  } else {
    const pireAxeRaw = Math.max(...axes.map((axe) => axisScores[axe]));
    const pireAxePercent = normalizeAxisPercent(pireAxeRaw); // fonction 2, jamais 2bis
    scoreFinalBrut = globalAverage + (pireAxePercent - globalAverage) * poids;
  }

  const scorePercent = Math.round(scoreFinalBrut * 10) / 10; // seul arrondi
  const score10 = Math.round(scorePercent / 10);
  const score10Displayed = Math.round(score10) === 0 ? 1 : Math.round(score10);

  return { scorePercent, score10, score10Displayed };
}

// --- Fonction 4 ---
function resolveDominance(axisScores) {
  const candidats = [
    { axe: 'reactivite', score: axisScores.reactivite },
    { axe: 'repetition', score: axisScores.repetition },
    { axe: 'invisibilite', score: axisScores.invisibilite },
    { axe: 'dependance', score: axisScores.dependance },
  ];

  candidats.sort((a, b) => b.score - a.score);
  const [s1, s2, s3, s4] = candidats;

  if (s1.score - s2.score >= 4) {
    return { dominant: s1.axe, secondaire: null }; // Cas A
  }
  if (s2.score - s3.score >= 2) {
    const dominant = s1.score !== s2.score
      ? s1.axe
      : HIERARCHIE.find((axe) => [s1.axe, s2.axe].includes(axe));
    const secondaire = s1.axe === dominant ? s2.axe : s1.axe;
    return { dominant, secondaire }; // Cas B
  }
  if (s3.score - s4.score >= 2) {
    return { dominant: 'eponge', secondaire: null }; // Cas C
  }
  return { dominant: 'eponge', secondaire: null }; // Cas D
}

// --- Fonction 5 ---
function determineProfile(scorePercent, axisScores) {
  if (scorePercent <= 20.0) {
    return { profilDominant: 'architecte', profilSecondaire: null };
  }
  const resultat = resolveDominance(axisScores);
  return { profilDominant: resultat.dominant, profilSecondaire: resultat.secondaire };
}

// --- Fonction 6 : point d'entrée public unique du module ---
function buildResult(answers) {
  const axisScores = computeAxisScores(answers);
  const severite = computeSeverityScore(axisScores);
  const profil = determineProfile(severite.scorePercent, axisScores);

  return {
    scorePercent: severite.scorePercent,
    score10: severite.score10,
    score10Displayed: severite.score10Displayed,
    profilDominant: profil.profilDominant,
    profilSecondaire: profil.profilSecondaire,
    axisScoresBruts: axisScores,
    axisScoresDisplayPercent: {
      reactivite: axisDisplayPercent(axisScores.reactivite),
      repetition: axisDisplayPercent(axisScores.repetition),
      invisibilite: axisDisplayPercent(axisScores.invisibilite),
      dependance: axisDisplayPercent(axisScores.dependance),
      burnout: axisDisplayPercent(axisScores.burnout),
    },
  };
}

// ============================================================
// Scénarios de test fictifs (référence de non-régression)
// ============================================================

function makeAnswers([reactivite, repetition, invisibilite, dependance, burnout]) {
  function split(total) {
    const a = Math.floor(total / 3);
    const rem = total - a * 3;
    const vals = [a, a, a];
    for (let i = 0; i < rem; i++) vals[i] += 1;
    return vals;
  }
  return {
    reactivite: split(reactivite),
    repetition: split(repetition),
    invisibilite: split(invisibilite),
    dependance: split(dependance),
    burnout: split(burnout),
  };
}

// ============================================================
// CM Energy Score — Module bloc 3 (le miroir) — étape 3 du plan
// Source de vérité : cm_energy_score_bloc3_miroir.md
// Module strictement additif — ne modifie rien au-dessus de cette ligne.
// ============================================================

const AXIS_NAMES = {
  reactivite: 'reactivity',
  repetition: 'repetition',
  invisibilite: 'carrying',
  // dependance : pas de nom générique, amorce dédiée
};

const FILL_PRIORITY_EPONGE = ['invisibilite', 'dependance', 'reactivite', 'repetition', 'burnout'];

// FRAGMENTS_P1 : axe -> index de question (0,1,2) -> valeur (2,3,4) -> texte
const FRAGMENTS_P1 = {
  reactivite: {
    0: {
      2: "having to adjust what you'd planned for your work, more often than you'd like",
      3: "spending a good part of your time responding to whatever comes up",
      4: "having almost no time to do what you'd actually planned",
    },
    1: {
      2: "the same handful of urgent issues, over and over",
      3: "trouble that keeps landing in different corners of the system",
      4: "an emergency that never gives warning, showing up on a different front each time",
    },
    2: {
      2: "half your changes made on the fly instead of by plan",
      3: "more reacting than planning behind most of what you do",
      4: "server changes made without any planning at all",
    },
  },
  repetition: {
    0: {
      2: "a couple of things you keep needing to remind people about",
      3: "saying the same things, over and over",
      4: "a habit of reusing the same answers so often you could copy-paste them",
    },
    1: {
      2: "the same handful of questions, almost always from a new member",
      3: "a different question every time, no matter who's asking",
      4: "the same topics you thought were settled, somehow becoming questions again",
    },
    2: {
      2: "documentation that's still around, just never kept up to date",
      3: "information that's documented somewhere people never think to look",
      4: "an answer buried somewhere in old messages, from months ago",
    },
  },
  invisibilite: {
    0: {
      2: "occasionally having to remind people that keeping the team aligned and the system monitored is part of the job",
      3: "having to re-explain at almost every project why coordination and monitoring need actual time set aside",
      4: "constantly justifying that keeping the team running and catching issues early is real work — and still watching it get treated as an afterthought",
    },
    1: {
      2: "the operational layers getting some attention, though content and performance still draw most of the focus",
      3: "community governance and system health regularly losing ground to the pressure around content and metrics",
      4: "the layers that make content and performance possible being consistently overlooked in favor of the results they produce",
    },
    2: {
      2: "some friction when structural gaps surface later — nothing critical, but more adjusting than planned",
      3: "regularly having to fix structural issues after the fact — on time that could have gone toward actual community work",
      4: "a recurring frustration of knowing what the server needs architecturally, but rarely getting the space to make the case for it",
    },
  },
  dependance: {
    0: {
      2: "a couple of moments where you had to step back in, even when the system mostly held on its own",
      3: "the team getting by on guesswork while you still step in from a distance",
      4: "everything nearly grinding to a halt the moment you're not there",
    },
    1: {
      2: "half the setup properly documented, but the rest only ever picked up on the job",
      3: "nearly all of the documentation living only in your head, never written down",
      4: "a handover that can't happen without you there, explaining it live",
    },
    2: {
      2: "a handful of things only you really know how to do",
      3: "most of the sensitive decisions landing on you, and no one else",
      4: "being the only one who actually understands how the setup works",
    },
  },
  burnout: {
    0: {
      2: "the same recurring tasks taking a little less time, without any real time gain",
      3: "the same tasks demanding just as much effort as six months ago, with nothing getting easier",
      4: "a pattern of the same tasks costing more energy every month, not less",
    },
    1: {
      2: "the quiet feeling that you could organize your community work better",
      3: "catching yourself wondering if you're simply not built for this much at once",
      4: "guilt for never quite keeping up with everything the community needs from you",
    },
    2: {
      2: "a technical fix needed a few times a week, outside the actual community work",
      3: "almost daily technical fixes just to keep the basics running, outside the actual community work",
      4: "several technical fixes a day, on top of the actual community work",
    },
  },
};

// P2_TABLE : clé = profilDominant tel que retourné par resolveDominance
const P2_TABLE = {
  reactivite: {
    selfBlame: 'a lack of foresight',
    closing: "Between the tools you're expected to juggle and the engagement numbers the market keeps pushing, there's rarely space left to get ahead of anything.",
  },
  repetition: {
    selfBlame: 'disorganization',
    closing: "Information doesn't stay easy to find on its own — without constant upkeep, it gets buried under everything that keeps piling on top of it.",
  },
  dependance: {
    selfBlame: 'an inability to delegate',
    closing: "Discord gives you no built-in way to hand off the opaque logic behind your setup — the roles, the permissions, the reasoning — and often no one to hand it to either.",
  },
  invisibilite: {
    selfBlame: 'an inability to assert your expertise',
    closing: "It's hard to make the impact of operational, governance, and technical layers visible when community performance is still primarily seen as a product of social and marketing activity.",
  },
  eponge: {
    selfBlame: 'a lack of rigor',
    closing: "There's no way to stay rigorous everywhere when everything demands the same level of attention.",
  },
};

// P3_FRAGMENTS : clé = axe candidat (jamais burnout)
const P3_FRAGMENTS = {
  reactivite: "a market that expects one person to cover every kind of skill, usually within a small, stretched team — and that kind of pressure rarely leaves much breathing room for what's next",
  repetition: "Discord's inherent complexity — as a community grows, interactions keep splitting into more channels, more categories, more spaces, and even a well-placed, well-documented answer gets increasingly drowned out by the noise",
  invisibilite: "a role still widely seen as social work whose strategic operational dimension goes unrecognized because of its structural invisibility — even as it quietly carries systems, operations, retention, psychology, and infrastructure all at once",
  dependance: "a market that doesn't yet have a solution to make it easier to automatically document the underlying logic of a server's configurations — a heavy, manual task that often gets pushed to the back burner",
};

const EPONGE_P3_FIXED = "It's not the result of one broken thing — it's what happens when a handful of small structural gaps are left unaddressed long enough that they all start pulling at once.";

const ARCHITECTE_FIXED_TEXT = [
  "There's nothing here that even mildly resembles compensation — not one part of your week spent covering for something that should just work on its own.",
  "This isn't luck. Systems don't run this smoothly by accident — someone built them that way, on purpose.",
  "It's the result of a system that was set up deliberately enough that it doesn't need you managing every piece in real time.",
];

// ============================================================
// Blocs 2, 4, 5+6 — étape 3 du plan (restitution complète)
// Texte fixe par profil, aucune injection de fragment.
// ============================================================

// Noms de profils affichés (bloc 2) — clé = profilDominant tel que retourné par buildResult
const PROFILE_NAMES = {
  reactivite: 'The Firefighter',
  repetition: 'The Concierge',
  invisibilite: 'The Ghost Developer',
  dependance: 'The Guardian',
  eponge: 'The Handyman',
  architecte: 'The Architect',
};

// Bloc 4 (reframe) et Bloc 5+6 (pont + CTA) — texte fixe par profil
const PROFILE_TEXTS = {
  reactivite: {
    reframe: "In other words, the way you run your community isn't proof of a lack of planning. It reflects the reality that the structure of your industry limits how much you can truly own your agenda.",
    bridge: "Your results are showing symptoms, not root causes. The real issue lies in a blind spot: a market that constantly demands more engaged members, without giving you the tools to build community systems capable of handling that engagement. This pressure isn't going away — but the way you operate on Discord can change.\n\nDiscover how in our deep dive!",
  },
  repetition: {
    reframe: "In other words, the way you run your community isn't proof of missing information. It reflects how hard it is to keep information accessible in an environment that makes it structurally easy to keep multiplying channels — erasing any accumulated effort and forcing you to start over every time.",
    bridge: "Your results are showing symptoms, not root causes. The real issue lies in a blind spot: a platform that, by its very nature, forces you to put in the same amount of effort — or more — as your community grows, regardless of whether the information is actually available. This reality isn't going away — but the way you operate on Discord can change.\n\nDiscover how in our deep dive!",
  },
  invisibilite: {
    reframe: "In other words, the way you run your community isn't proof of poor self-advocacy. It reveals a role that has quietly shifted — from managing conversations and driving engagement, to architecting and maintaining a multi-layered system in service of performance.",
    bridge: "Your results are showing symptoms, not root causes. The real issue lies in a blind spot: a role still seen through the lens of community management: the activity, the engagement, the social layer, but not through the lens of architecture: the interoperability of the multiple layers that actually make it work. But that can change only if the market starts seeing community pros as architects, not just managers.\n\nDiscover how in our deep dive!",
  },
  dependance: {
    reframe: "In other words, the way you run your community isn't proof of an inability to work as a team. It reveals a tool built for relationships between members, but not for the pros running the show behind them — which sometimes leaves the admin as the only one holding the whole system together.",
    bridge: "Your results are showing symptoms, not root causes. The real issue lies in a blind spot: a market where running communities on Discord has professionalized, without anyone thinking to equip those pros with tools to operate the one piece the whole community lives on — the infrastructure itself. Documenting a server's logic will stay just as tedious — but an operating mode that automates that task could make it far less of a burden.\n\nDiscover how in our deep dive!",
  },
  eponge: {
    reframe: "In other words, this isn't a lack of professionalism. It reveals an extremely demanding job — one that places a heavy load on a single person or a small team, wearing them down over time and rarely leaving room to be the architect they actually want to be for their community.",
    bridge: "Your results are showing symptoms, not root causes. The real issue lies in a blind spot: a market that cares about the community's wellbeing, but far less about the person taking care of it — the one absorbing client pressure while being the technician, the psychologist, the operator, and the manager, all at once, with nothing built to relieve any of it. But that can change.\n\nDiscover how in our deep dive!",
  },
  architecte: {
    reframe: "In other words, the way you run your community isn't a coincidence. But it doesn't mean the system serves your own sense of what matters most. It reveals a system able to absorb and limit pressure before compensation ever becomes necessary — but not necessarily one able to reveal the value of your own work.",
    bridge: "Your results show signs of good health — but it would be easy to assume your system is fully yours. That assumption misses a fundamental blind spot: even a well-built system still operates in service of what the market rewards most, visibility, engagement, growth, not necessarily what actually holds the system together. Proving the value of governance, coordination, and infrastructure remains just as hard, especially when what actually sustains your operational work, and turns community members into true advocates, isn't the engine that shapes the system's architecture. As long as the invisible side of your job stays secondary and unseen, you'll never be the true master of a system architecture that values the underlying work behind your community's performance. But that can change.\n\nDiscover how in our deep dive!",
  },
};

// Bloc 2 — mode opératoire (nom du profil + ligne secondaire discrète si Cas B)
function buildBlock2(profilDominant, profilSecondaire) {
  const domName = PROFILE_NAMES[profilDominant];
  if (profilSecondaire) {
    const secName = PROFILE_NAMES[profilSecondaire];
    return { dominant: domName, secondary: `With marked traits of ${secName}` };
  }
  return { dominant: domName, secondary: null };
}

function getReframe(profilDominant) {
  return PROFILE_TEXTS[profilDominant].reframe;
}

function getBridge(profilDominant) {
  return PROFILE_TEXTS[profilDominant].bridge;
}

function getAvailableFragments(axis, axisAnswers) {
  const pool = [];
  for (let i = 0; i < 3; i++) {
    if (axisAnswers[i] >= 2) {
      pool.push({ questionIndex: i, value: axisAnswers[i] });
    }
  }
  pool.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.questionIndex - b.questionIndex; // tie-break
  });
  return pool;
}

// Sélection avec diversité : pour 2 fragments, on préfère val.4 + val.3
// plutôt que val.4 + val.4 quand les deux valeurs sont disponibles.
// Fragment 1 -> valeur la plus haute (tie-break : premier dans l'ordre).
// Fragment 2 -> valeur strictement inférieure au fragment 1 si disponible,
//              sinon même valeur (fallback naturel).
function pickTopN(axis, axisAnswers, n) {
  const pool = getAvailableFragments(axis, axisAnswers);
  if (n <= 1 || pool.length <= 1) {
    return pool.slice(0, n).map((item) => FRAGMENTS_P1[axis][item.questionIndex][item.value]);
  }

  const first = pool[0];
  const secondDiverse = pool.slice(1).find((item) => item.value < first.value);
  const second = secondDiverse !== undefined ? secondDiverse : pool[1];

  return [first, second].map((item) => FRAGMENTS_P1[axis][item.questionIndex][item.value]);
}

// Cas E : se déclenche quand aucun fragment disponible de l'axe dominant
// ne dépasse la valeur 2 (pool non vide, mais value max === 2 partout).
function isWeakAxis(axis, axisAnswers) {
  const pool = getAvailableFragments(axis, axisAnswers);
  if (pool.length === 0) return false; // aucun fragment dispo -> pas Cas E, cas limite déjà géré ailleurs
  return pool.every((item) => item.value === 2);
}

function buildP1_CaseA(axisDominant, answers) {
  const frags = pickTopN(axisDominant, answers[axisDominant], 2);
  const first = frags[0];
  const second = frags.length > 1 ? ` On top of that, ${frags[1]}.` : '';

  if (axisDominant === 'dependance') {
    return `A significant part of your week only works because everything here runs through you — ${first}.${second}`;
  }
  const axisName = AXIS_NAMES[axisDominant];
  return `A significant part of your week goes into ${axisName} — ${first}.${second}`;
}

// Cas E : dominant faible (aucun fragment > valeur 2 dispo), liste format Cas C/D
function buildP1_CaseE(axisDominant, answers) {
  const pool = getAvailableFragments(axisDominant, answers[axisDominant]);
  const frags = pool.slice(0, 2).map((item) => FRAGMENTS_P1[axisDominant][item.questionIndex][item.value]);
  const list = frags.map((f) => `- ${f}`).join('\n');

  if (axisDominant === 'dependance') {
    return `A smaller part of your week still runs through you:\n${list}`;
  }
  const axisName = AXIS_NAMES[axisDominant];
  return `A smaller part of your week still goes into ${axisName}:\n${list}`;
}

// Cas B : dominant uniquement dans P1 (secondaire retiré, voir .md section 6bis)
// Connecteur different de Cas A ("Underneath that, you're also dealing with"
// au lieu de "On top of that, there's also") pour signaler qu'un secondaire existe.
function buildP1_CaseB(axisDominant, answers) {
  const frags = pickTopN(axisDominant, answers[axisDominant], 2);
  const first = frags[0];
  const second = frags.length > 1 ? ` Underneath that, you're also dealing with ${frags[1]}.` : '';

  if (axisDominant === 'dependance') {
    return `A significant part of your week only works because everything here runs through you — ${first}.${second}`;
  }
  const axisName = AXIS_NAMES[axisDominant];
  return `A significant part of your week goes into ${axisName} — ${first}.${second}`;
}

// Indépendante de resolveDominance (module scoring intouché) — voir points ouverts du .md
function determineTrio(profilDominant, axisScoresBruts) {
  if (profilDominant !== 'eponge') return null;

  const candidats = ['reactivite', 'repetition', 'invisibilite', 'dependance']
    .map((axe) => ({ axe, score: axisScoresBruts[axe] }));
  candidats.sort((a, b) => b.score - a.score);
  const [s1, s2, s3, s4] = candidats;

  if (s3.score - s4.score >= 2) {
    return { case: 'C', axes: [s1.axe, s2.axe, s3.axe] };
  }
  return { case: 'D', axes: ['dependance', 'reactivite', 'burnout'] };
}

function buildP1_Eponge(trioAxes, answers) {
  const pools = {};
  for (const axe of trioAxes) {
    pools[axe] = getAvailableFragments(axe, answers[axe]);
  }

  const selection = [];
  const usedCount = {};
  for (const axe of trioAxes) {
    usedCount[axe] = 0;
    if (pools[axe].length > 0) {
      const item = pools[axe][0];
      selection.push({ axe, text: FRAGMENTS_P1[axe][item.questionIndex][item.value] });
      usedCount[axe] = 1;
    }
  }

  let remaining = 3 - selection.length;
  if (remaining > 0) {
    const fillOrder = FILL_PRIORITY_EPONGE.filter((axe) => trioAxes.includes(axe));
    for (const axe of fillOrder) {
      while (remaining > 0 && usedCount[axe] < pools[axe].length) {
        const item = pools[axe][usedCount[axe]];
        selection.push({ axe, text: FRAGMENTS_P1[axe][item.questionIndex][item.value] });
        usedCount[axe] += 1;
        remaining -= 1;
      }
    }
  }

  const fragTexts = selection.map((s) => s.text);
  return `It's not one thing draining your week — it shows up in several places at once: ${fragTexts.join(', ')}.`;
}

function buildP2(profilDominant) {
  const entry = P2_TABLE[profilDominant];
  return `This isn't ${entry.selfBlame}. ${entry.closing}`;
}

function buildP3(profilDominant) {
  if (profilDominant === 'eponge') {
    return EPONGE_P3_FIXED;
  }
  const causeDom = P3_FRAGMENTS[profilDominant];
  return `It's the result of ${causeDom}.`;
}

// Point d'entrée public unique du module bloc 3
function buildBlock3(answers, scoringResult) {
  const { profilDominant, profilSecondaire, axisScoresBruts } = scoringResult;

  if (profilDominant === 'architecte') {
    return ARCHITECTE_FIXED_TEXT.join('\n\n');
  }

  if (profilDominant === 'eponge') {
    const trio = determineTrio(profilDominant, axisScoresBruts);
    const p1 = buildP1_Eponge(trio.axes, answers);
    const p2 = buildP2('eponge');
    const p3 = buildP3('eponge');
    return [p1, p2, p3].join('\n\n');
  }

  const isWeak = isWeakAxis(profilDominant, answers[profilDominant]);

  let p1;
  if (isWeak) {
    p1 = buildP1_CaseE(profilDominant, answers);
  } else if (profilSecondaire) {
    p1 = buildP1_CaseB(profilDominant, answers);
  } else {
    p1 = buildP1_CaseA(profilDominant, answers);
  }

  const p2 = buildP2(profilDominant);
  const p3 = buildP3(profilDominant);

  return [p1, p2, p3].join('\n\n');
}

// ============================================================
// Paragraphe secondaire autonome — section 6bis du doc de restitution.
// Affiché après le bloc 5 (bridgeText), avant les boutons CTA.
// Concerne uniquement les Cas B (profilSecondaire non null).
// Handyman (eponge) et Architecte n'ont jamais de secondaire — cette
// fonction retourne null dans ces cas (jamais appelée avec ces profils
// mais protégée par précaution).
// ============================================================

const SECONDARY_TEMPLATES = {
  reactivite: {
    opening: "There's also a trace of reactivity in how you operate:",
    p2: "This isn't a lack of foresight — it's what happens when the market never gives you room to plan ahead.",
    p3: "It comes from the market's own squeeze — one person expected to run every front, with a team too small to share the load.",
  },
  repetition: {
    opening: "There's also a trace of repetition in how you operate:",
    p2: "This isn't disorganization — it's what happens when nothing stays easy to find without constant upkeep.",
    p3: "It comes from Discord's inherent complexity — a platform that keeps splitting into more channels as the community grows, burying even well-documented answers in the noise.",
  },
  invisibilite: {
    opening: "There's also an invisible load in your operating mode:",
    p2: "This isn't an inability to assert your expertise — it's hard to make the impact of operational, governance, and technical layers visible when community performance is still primarily seen as a product of social and marketing activity.",
    p3: "It comes from a role still widely seen as social work whose strategic operational dimension goes unrecognized because of its structural invisibility.",
  },
  dependance: {
    opening: "There's also a system that still runs through you:",
    p2: "This isn't an inability to delegate — it's what happens when there's no built-in way to hand off a system's logic to anyone else.",
    p3: "It comes from a market that still hasn't equipped pros to automatically document a server's logic — leaving that work heavy, manual, and easy to push aside.",
  },
};

// Même logique de sélection que pickTopN : 2 fragments les plus hauts
// sur l'axe secondaire, tie-break par ordre de question.
function buildSecondaryParagraph(profilSecondaire, answers) {
  if (!profilSecondaire) return null;
  const template = SECONDARY_TEMPLATES[profilSecondaire];
  if (!template) return null;

  const frags = pickTopN(profilSecondaire, answers[profilSecondaire], 2);
  if (frags.length === 0) return null;

  const fragLines = frags.map((f) => `- ${f}`).join('\n');
  return [
    `${template.opening}\n${fragLines}`,
    template.p2,
    template.p3,
  ].join('\n\n');
}

// ============================================================
// Les 15 questions (étape 2) — anglais business US/UK.
// Chaque question porte : id, axisKey (clé utilisée par le module
// de scoring ci-dessus), axisIndex (position 0-2 dans le tableau de
// l'axe pour buildResult), le texte, et les 4 options {text, value}.
// Les noms de profils (profilDominant/profilSecondaire) restent en
// français pour l'instant (clés internes reactivite/repetition/...)
// — la traduction affichée viendra plus tard, fournie séparément.
// ============================================================

const QUESTIONS = [
  // --- Axe Réactivité ---
  {
    id: 'q1', axisKey: 'reactivite', axisIndex: 0,
    text: 'Which of these best describes your typical week, especially when it comes to managing the server(s) you run?',
    options: [
      { text: 'I do what I had planned to do.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazczdXZyanBsbjM4eGoyZ2V6OXp3d3RwMnZjb2k3M3lpN2V1ZW8wZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11kTQgng5gbqgM/giphy.gif' },
      { text: 'I do what I had planned, with a few adjustments along the way.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWM2Zzhidno2cXh3dm0ydjhzMmE1aHhxdGY2OW04MHZ2M2xhNWM5dyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2OP9jbHFlFPW/giphy.gif' },
      { text: 'I spend a good part of my time responding to whatever comes up.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzlxNWcyYWN5b2IwcjM0OGxzeTg5OTN4ZmFlcTEzdnByYzZqaWR2eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HUkOv6BNWc1HO/giphy.gif' },
      { text: 'I almost never have time to do what I had planned.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzlxNWcyYWN5b2IwcjM0OGxzeTg5OTN4ZmFlcTEzdnByYzZqaWR2eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1n4iuWZFnTeN6qvdpD/giphy.gif' },
    ],
  },
  {
    id: 'q2', axisKey: 'reactivite', axisIndex: 1,
    text: 'When an urgent issue comes up on your server, it is most often:',
    options: [
      { text: 'Rare, and almost always the same type of issue.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWM3MTI4eW93YThoY2Q1NHoxam9tbXMwdzVzd2RodnFlNHEwdDl6YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3GYmecuz4ncOc/giphy.gif' },
      { text: 'Occasional, around 2-3 topics you know well by now.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHd5c2gxemMzN3l1YnRidnR0a29icGFwMXBuMzY5enk1azZuaXkzbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d56crtwhXYRB62P6mo/giphy.gif' },
      { text: 'Something that often hits different areas of your system.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Zmx1aWJxM3FjN3ZyeXp1cGlydTU5dnR5NXRtd2VoaHZ1dTRyMTkwaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TlOANAQa3mQTVNLbrw/giphy.gif' },
      { text: "Something you never see coming — you're constantly putting out fires on different fronts.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NmJwZ3p5bHhoanpxdnM1ODVlMml4ZTdtdHRqaDd5dmxtMTI2ZG13MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7XSmVCuislQs0dYgTo/giphy.gif' },
    ],
  },
  {
    id: 'q3', axisKey: 'reactivite', axisIndex: 2,
    text: 'Of the last 5 changes you made to your server, how many were genuinely planned in advance?',
    options: [
      { text: 'Almost all of them were planned (4 or 5 out of 5).', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzhrc3ZlejJmdmhsbGsya2gyOXQ4NDBuZG02bW5ncm05dXdienVndCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IuzVc77zNNe3fXs2sK/giphy.gif' },
      { text: 'At least half, maybe a bit more (3 out of 5).', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnVwOWZwbmtwdDluZ3YzbTN1dDZ4ajcxeGZibmkzYXZ1a3owZDdkdCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/myDXHnYYPxT4od4NEN/giphy.gif' },
      { text: 'A minority (1 or 2 out of 5).', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGZ2cjlueDJyOGluczRlNzJlYTltaXBid2FoYnRjazhpc2RvZ2pveSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9SINEn8jWy7xzFquPG/giphy.gif' },
      { text: 'None were planned — it was all reactive.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Ym9jcXFod3M0dnpoY3ZsYjZwMXZqNGxvYzRienNqeTI1djNsZ3k5dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/O8Hm3wmKW7avWokROx/giphy.gif' },
    ],
  },
  // --- Axe Répétition ---
  {
    id: 'q4', axisKey: 'repetition', axisIndex: 0,
    text: 'Which of these sentences resonates most with your day-to-day?',
    options: [
      { text: "Once I've explained something, I never have to repeat it.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmQyOGZoemhnOGRnMXQwaml3bnNlNXFiZmppMTdtdGsyODgzcDllcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DfbpTbQ9TvSX6/giphy.gif' },
      { text: 'There are two or three things I need to remind people of from time to time.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDN6aHhwc2F4d2RnczU4eHR5ejgzenQyc2gwcXBndHA0Mnhkb3BuNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1XhytMN9mhDvcFSEHT/giphy.gif' },
      { text: 'I feel like I say the same things over and over.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWExcDFrbTY5cmdoYjFyYWxubGFoZXV5ZXJlMGo3Nm96ZWJtZ2ZvaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Y0JjG1SzwU6RZwv0F2/giphy.gif' },
      { text: 'I could copy-paste some of my answers, I repeat them so often.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZDV3OWJ0NWNtOG1iN2h5eGxkZGFkdG9ieGhzcmdvbGdmNXhleTFmcSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1IPjwAJ0x5sGqB8nHn/giphy.gif' },
    ],
  },
  {
    id: 'q5', axisKey: 'repetition', axisIndex: 1,
    text: 'When you have to re-explain something, it is most often:',
    options: [
      { text: 'Rarely need to repeat myself.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTdrbjJ5MWR5Mng5eDdleGo3dm51MDhrbmQ4cDNrMmhtZ2IwdXljZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vCpSKY03aSg9XkKFcW/giphy.gif' },
      { text: 'The same topics, almost always from a new member.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OXg3cDZzdnMzc2J0Mjg1dG15azFrc3dsYm83cW4xcGFoZDJ3NWdlOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JpjZCbYNb4sFCmclRB/giphy.gif' },
      { text: "Different topics, no matter who's asking.", value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWhtM3J4ejdsMzBsbmU1dGZqeW4wd3Z4cjA0dnVzbzcyamNsNDU3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jTZVegIrdLCCY/giphy.gif' },
      { text: 'The same topics that seemed settled keep coming back.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYThnYW0wYWFpeDZ0MDE3aXl0NjdjZnRjaTRyaHBtcHZreHgzdDd4NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PrMfVyIzKdkU8/giphy.gif' },
    ],
  },
  {
    id: 'q6', axisKey: 'repetition', axisIndex: 2,
    text: 'The information people ask you for most often:',
    options: [
      { text: 'Is documented somewhere, updated and easy to find.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWQ0cHMzM2k1a25pbTU5bGFjZGoxbndyZW5ldHBodWljMmt6NzNnOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7aPevwPAgsBkQ/giphy.gif' },
      { text: 'Is documented, but not updated.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3d2Zua3BoeXF4dngybDVpY212NmxjNnZmdndpOHZ6dmxreHIzZXFmbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bkllEwHU7vRVC/giphy.gif' },
      { text: "Is documented but people don't know where to look.", value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ODM0NXNwOXh6YnNsams1ZHYzMmxjN3EzM3gzM2o4eTA0ZW8yOWlkbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ji6zzUZwNIuLS/giphy.gif' },
      { text: 'Was said somewhere, but buried in old messages.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3ZwajZzdGRianY1amtuY2oycHJxa2E2ZThla3k4cG45cjh3YWhzZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/S99AYjfwrbAHWZ1o1h/giphy.gif' },
    ],
  },
  // --- Axe Invisibilité ---
  {
    id: 'q7', axisKey: 'invisibilite', axisIndex: 0,
    text: 'How often do you find yourself having to justify why coordinating your mod team and monitoring your server actually needs dedicated time and attention?',
    options: [
      { text: "Rarely — it's understood as part of the role, no explanation needed.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWg1ZzU0NjZrb3NneHN3MTV6dHVuMW02cDZ1aGhnaWZnM2Z6cmV4NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lEVZJzy4w15qE/giphy.gif' },
      { text: `Occasionally — I explain it sometimes, and once it's said, it holds.`, value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzY1eGg0N2RzMmFkN3oyd2N4cnRibXJoMzhmMjN2OGtxdWxpdjI1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NjfCErTI3zYVMHDUD6/giphy.gif' },
      { text: 'Regularly — I have to re-explain it at almost every project, as if the previous conversation never happened.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXByd3Y5MjJ6eWNhZ25jc2t6b2Ywd3ZoODcyZWE2NnJ6bnk4cWdwZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pZy0p2v9VjaBnNYQ7z/giphy.gif' },
      { text: "Constantly — and even with the explanation, it still gets treated as secondary to anything with a visible output.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2F0MHU5eTVrdDN6Y3MzNmhxM28wM3Vncmo4NmZudzd5ZTliZmsweCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ndi77oZV3Vu1OhVAtW/giphy.gif' },
    ],
  },
  {
    id: 'q8', axisKey: 'invisibilite', axisIndex: 1,
    text: 'To what extent do you find that recognition and attention in your role tend to focus on content, activation, and performance metrics — at the expense of the operational layers that actually make those results possible?',
    options: [
      { text: "It's rarely an issue — operational work gets its fair share of attention alongside content and performance.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NGlvdGxudThsNTdjcXQ2M3VqOWpkNXF4ZHlzZ3JqMWFwZjd2eDUzbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/z8Ea8EPG2cRszvYLKu/giphy.gif' },
      { text: "There's some imbalance, but I can work with it — the structural layers still get enough space to do their job.", value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWhqeXA3dnFoNzhpZzd2eXM1aWk0eGM0aW91azN6a2d1OGx6NTY5NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XdFe9qo1OEyibhU48t/giphy.gif' },
      { text: `It creates real tension — the focus on content and metrics regularly squeezes the time I'd need for community governance and system health.`, value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDVscmYzeDFuMm1id2M2OXFxZmNuZXZ4ZHN3dHdtMm9tcHdobDZxZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oxFDq4E9CHb7W/giphy.gif' },
      { text: "It's a constant frustration — the pressure around content and performance keeps eating into the layers that make both of them actually work.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Nzl2dmwzMHcwcGc4NHp5OW5yN3NhZmlpd2g0cDRzcDRpODgyZWFlMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WxUHSv0syjaxbU4por/giphy.gif' },
    ],
  },
  {
    id: 'q9', axisKey: 'invisibilite', axisIndex: 2,
    text: `To what extent does compressing the time allocated to server design and documentation — in favor of other priorities — affect your ability to operate your community the way you'd want to?`,
    options: [
      { text: "It rarely affects how I operate — the server stays modular enough that adjustments don't create new problems.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHI3OGFoaGNoY2F4Z285eDV3aHF6cjdyczR4bXJtamVyZnB0ejI2aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OrFmkOFx7PVK/giphy.gif' },
      { text: 'It creates some friction, but I can absorb it — I adjust methodically enough to keep the system coherent.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm1sMG5sajczeTEwZW9kdHd3Y2JpbmdnZ2lxb2VzZzBoZ3p2eHM2OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gp3aS4doWX6OYSuOI8/giphy.gif' },
      { text: `It regularly forces me to fix structural issues after the fact — time I'd rather spend on actual community work.`, value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHI3bmk3amhxbDVsZ21tbDY3b3hua2hhdjB1NzZiam10ajZ4amZrbCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AvMJCeu1EMmhG/giphy.gif' },
      { text: "It's a real source of frustration — I can rarely make the case for giving architecture its proper space, and end up compensating for the gaps it leaves.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzYwYThsNnIxcnRkZHBzOTUybWZxbm5laHI0Z2dvN2dyc3pjdXJoYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FFE9gAOWhJTK5slcpY/giphy.gif' },
    ],
  },
  // --- Axe Dépendance ---
  {
    id: 'q10', axisKey: 'dependance', axisIndex: 0,
    text: 'The last time you really tried to disconnect (evening, weekend, vacation), or if you had to be away for a week without preparing anything, what would happen / what happened?',
    options: [
      { text: 'Nothing special — the system and the team carry on without me.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYm95cTg5bG1sNGo5YXM3ZDhrMjgzdXVybGFyNzJncjlsMHgxZTM0dyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/j0QzDgFZRX2njRxxtP/giphy.gif' },
      { text: 'Things run more or less fine, with a couple of minor questions.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnR1MmZwcXB3cG5zbXBmOWVrcTRscjJzdm9ucndpZzN3cGNmeDl6aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/P5vATkPERjFKc8s94x/giphy.gif' },
      { text: 'The team manages with few clear guidelines, and I have to step in remotely.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWxocXU2ZHBhYXEwdzBzbnh3dmNwdHRwNWdnNWQ0aWt5anphZ3drZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/toXKzaJP3WIgM/giphy.gif' },
      { text: "It becomes nearly unmanageable without me — I've never really managed to disconnect.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHA5ZWlwbmszMTA2ZnhtcGp0MDQ5OWVwOHdicmM3dzMxbDcwY2FwaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/foEGSY7DcgExOMr2nH/giphy.gif' },
    ],
  },
  {
    id: 'q11', axisKey: 'dependance', axisIndex: 1,
    text: 'If a new team member had to take over managing your server(s) tomorrow, the logic behind the system (why this permission, this role, this structure) is:',
    options: [
      { text: 'Fully documented — they could read it and understand on their own.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazJ3d3FnZW1nMWFqa3hlMWNiamE0MGNxYTRsY2xydjRjc3gya2x3eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/896NyHxKgOwc8UoIar/giphy.gif' },
      { text: 'Partially documented, the rest is learned on the job.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTBrZ2lrcG51d3QxamtqNzZtcjY5NGtqODFzc2hqdWVnejEwaXNtdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cge9nG7e7wKWbMm9cY/giphy.gif' },
      { text: 'Almost entirely in my head, never written down.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2Y4NHpoanNpYzZ6NHhpNGQ5enNkNmg1M3Nha2ptc25vMml5NDEzMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iF2s2pVdMZoC66SDfK/giphy.gif' },
      { text: 'Impossible to hand over without me being there to explain everything live.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cG5iZGd0ZGk5OHB4NXB6Zmg4d3gxeTFzd2JvenM2Mzl1cDZncnIxaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/V30ebOftvifyWoJObh/giphy.gif' },
    ],
  },
  {
    id: 'q12', axisKey: 'dependance', axisIndex: 2,
    text: 'The number of things on your server that only YOU know how to do or understand:',
    options: [
      { text: 'Almost nothing — everything is shared or documented across the team.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXRkNW1iOGlkcTZsY3hvZThra2FyZmlqZnUwZWZobWYxamphZGlzdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6ZtfKwnx8bWjDAgo/giphy.gif' },
      { text: 'A few specific things, but minor ones.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDR3dTY3a2Riem1renhwNmpxbmhybWNjZGYzYXB3Zmw5cm93cXpkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JWnXY237vWeX3zx64V/giphy.gif' },
      { text: 'A significant share, including most sensitive or critical decisions.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3o0cDA3NHhheGdjc2N5d3YxZDVmemk1a3kyZTR0YzY0cHA4cjl5MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xUOrwihszfWZgSIHJK/giphy.gif' },
      { text: "Practically everything — I'm the only one who really knows how it works.", value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aHB1NWl4dm9peWlqcDBmbXl2eDY2MXdlNDkzODB6MWptN3czcDc2cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SB78ocqaQaZl6zcTUP/giphy.gif' },
    ],
  },
  // --- Axe Burnout ---
  {
    id: 'q13', axisKey: 'burnout', axisIndex: 0,
    text: 'The tasks you repeat most often require, today, compared to 6 months ago:',
    options: [
      { text: "Noticeably less effort — the system has learned, it's smoother now.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRhNHUwZ2k1bDBocjE4dHF4b3Vid2FoZ3l1aW4xc3ptYTlsZ2hvaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SULYSbq4uoTbnvLOSe/giphy.gif' },
      { text: 'A bit less effort than before.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2p5eDFhanNuYjd1Y2tncmI2cHE0NHp6NGNmeWphdWM3N2RsaXdheSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Cu5MnJIcKMvK8W99uC/giphy.gif' },
      { text: 'About the same effort as before.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eGNpbWhwMnpseG9zdjJqeXp2d2tkNGNsNmV2eDE1dmRhYml6d3A4eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XdDBcVRzNKbsxy4sQe/giphy.gif' },
      { text: 'More effort than before — it keeps getting worse.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ODBkaXdudWlqYjY2c2dkeXpvMThtbzluaXV3Nmw1MjN3OG01Ym5wZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2EPz0rpGsYQEw/giphy.gif' },
    ],
  },
  {
    id: 'q14', axisKey: 'burnout', axisIndex: 1,
    text: 'When you feel overwhelmed by your community work, you tend to think:',
    options: [
      { text: "It's temporary and tied to a specific context, nothing structural.", value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YWd6cjhvbm5qMGtoMG52M214b2Q3ZHJ4cjd1N3AyNGVhcDgzcWYyZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9dPCMEWBGWwfMmFKj2/giphy.gif' },
      { text: 'I could organize myself better, be more efficient.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eHo4cnp4N21kamFrbnFnaWR5NndmeG84eTB0eW8zdWhmcHZkZmpuZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nU2taQ1l0BMmNFDw0t/giphy.gif' },
      { text: "Maybe I'm just not cut out for handling this much at once.", value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWNlMXQ2bm9nMml0ZW1pY3AyazY1M2hhcXhtOW1lNXV4enk3Ymh4eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/wusAlMieMa6Ry9Deu7/giphy.gif' },
      { text: 'I often feel guilty for never managing to keep up with everything.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bWw5a2JpMnpxeHN2N3ZhbXgzZXFmZzNmdmljczhua3JnY3Z4NjVyMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UMNQoM6xapIti/giphy.gif' },
    ],
  },
  {
    id: 'q15', axisKey: 'burnout', axisIndex: 2,
    text: 'In a typical week, how often do you find yourself having to fix, adjust, or troubleshoot something on your server (bug, permission, setting, logistics) — outside of your community management or strategy work?',
    options: [
      { text: 'Rarely — a few times a month, or less.', value: 1, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c3BmbmUwdnVvaW01eWxmazJjbWl3ZGE1ODdyZHllYjVvc3llemVtMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hhbsgAvBkZqkKx2ys7/giphy.gif' },
      { text: 'A few times a week.', value: 2, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWphcWd4Nm03bW04bGQ0aGx2cWE5bXMzbDJqbmpqcTFsZ2J6encweCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2QDOt4Gf7K9ihCNi/giphy.gif' },
      { text: 'Almost every day, once a day.', value: 3, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm90NnFzNXZkdXVrbWJzazZ4dml6OHFteGhobDY0ZjlobmZtYWNieSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11r7lqqyAekINO/giphy.gif' },
      { text: 'Several times a day, constantly.', value: 4, gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjA4YXJoajJkamZ6OWRxbGlqcGJtZmkzZmRia2FuNWtpbzhncHRibSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/E47JKwZnxvHuPjPkn1/giphy.gif' },
    ],
  },
];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function emptyAnswers() {
  return {
    reactivite: [null, null, null],
    repetition: [null, null, null],
    invisibilite: [null, null, null],
    dependance: [null, null, null],
    burnout: [null, null, null],
  };
}

// ============================================================
// Composant — étape 2 : interface minimale, sans style.
// Écran d'intro (placeholder lorem ipsum) -> 15 questions
// (navigation Next/Previous, options randomisées une seule fois
// au chargement) -> résultat brut, sans les 6 blocs (étape 3).
// ============================================================

// ============================================================
// Bloc CTA + popup — commun à tous les profils (étape 4 du plan).
// Deux entrées possibles ('email' via le bouton "Email me my results",
// 'deepdive' via "Go to the deep dive") : mêmes 3 champs, mais titre
// et présence du lien "Skip" changent selon l'entrée, pour rester
// cohérents avec l'intention de la personne au moment du clic.
// Composant indépendant (pas défini à l'intérieur de CMEnergyScoreApp)
// pour ne pas être redéfini à chaque rendu, ce qui ferait perdre le
// focus des champs à chaque frappe.
// ============================================================
function CtaPopup({ entry, onClose, onSkip, onSubmit }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [sent, setSent] = useState(false);

  const title =
    entry === 'email' ? 'Where should we send it?' : 'Want your results in your inbox too?';
  const subtitle = entry === 'deepdive'
    ? 'Takes 10 seconds, no spam — then straight to the deep dive.'
    : 'Takes 10 seconds — no spam, ever.';

  function handleSubmit(e) {
    e.preventDefault();
    if (!firstName) {
      setFirstNameError(true);
      return;
    }
    if (!email) {
      setEmailError(true);
      return;
    }
    setFirstNameError(false);
    setEmailError(false);
    setSent(true);
    onSubmit({ firstName, email, linkedin, consent: consentChecked });
    // Laisse le message de confirmation visible un court instant avant
    // de rediriger — évite une redirection instantanée qui donnerait
    // l'impression que rien ne s'est passé.
    setTimeout(() => { navigateTo(DEEP_DIVE_URL); }, 1500);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'rgba(255,255,255,0.52)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '0.5px solid rgba(255,255,255,0.82)',
          boxShadow: '0 20px 60px -20px rgba(85,58,89,0.35), 0 4px 32px rgba(0,0,0,0.07)',
          borderRadius: '18px',
          padding: '32px',
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: "'Visby CF', 'Poppins', sans-serif",
        }}
      >
        {/* Croix de fermeture — ferme le popup sans naviguer nulle part,
            valable pour les deux entrées (email et deepdive). Distincte
            de "Skip", qui ferme ET redirige vers le deep dive. */}
        <button
          type="button" onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', fontSize: '18px', color: '#8a7f72', cursor: 'pointer', lineHeight: 1, zIndex: 2 }}
        >
          ×
        </button>

        {sent ? (
          <p style={{ fontSize: '14px', margin: 0 }}>Sent — redirecting you to the deep dive...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#2a1f2e', margin: '0 0 4px 0', paddingRight: '28px', lineHeight: 1.3 }}>
              {title}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(85,58,89,0.60)', margin: '0 0 20px 0' }}>{subtitle}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
              <AuthStyledField label="First name" type="text" placeholder="Jane" value={firstName} onChange={(e) => { setFirstName(e.target.value); setFirstNameError(false); }} error={firstNameError ? 'Please enter your name' : null} />
              <AuthStyledField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                error={emailError ? 'Please enter your email' : null}
              />
              <AuthStyledField label="LinkedIn" type="text" placeholder="Your name or LinkedIn link" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} optional helpText="So we can stay in touch beyond your inbox." />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '18px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                required
                style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 400, lineHeight: 1.5, color: 'rgba(85,58,89,0.60)' }}>
                I've read and agree to the{' '}
                <a
                  href="https://designtechcare.notion.site/Privacy-Policy-33162f1c9152804d82b9e863ab49991d"
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  Privacy Policy
                </a>.
              </span>
            </label>

            <button
              type="submit"
              disabled={!consentChecked}
              style={{
                width: '100%',
                height: '48px',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: '#fefbf8',
                background: 'linear-gradient(135deg,#553a59,#d16b59,#f9cf81)',
                borderRadius: '11px',
                boxShadow: '0 6px 22px rgba(85,58,89,0.28)',
                cursor: consentChecked ? 'pointer' : 'default',
                opacity: consentChecked ? 1 : 0.45,
              }}
            >
              Send{entry === 'deepdive' ? ' & continue' : ''}
            </button>

            {entry === 'deepdive' && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button" onClick={onSkip}
                  style={{ background: 'none', border: 'none', fontSize: '12px', color: '#666', cursor: 'pointer' }}
                >
                  Skip — just take me to the deep dive
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function CMEnergyScoreApp() {
  const [screen, setScreen] = useState('intro'); // 'intro' | 'loading-start' | 'quiz' | 'loading-results' | 'result'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [result, setResult] = useState(null);
  // id de la ligne Supabase créée à la fin du test — gardé en mémoire
  // pour l'UPDATE du popup email (étape 4 suivante du plan). null tant
  // que l'insert n'a pas répondu, ou s'il a échoué.
  const [respondentId, setRespondentId] = useState(null);
  // Quel bouton a ouvert le popup CTA : 'email' | 'deepdive' | null (fermé).
  // Conditionne le titre du popup et la présence du lien "Skip" (voir CtaPopup).
  const [ctaEntry, setCtaEntry] = useState(null);

  // Reveal progressif de la restitution complète (étape B) — revealed
  // bascule à true au clic sur RevealButton, visibleBlocks suit quelles
  // cards sont entrées dans le viewport (fondu individuel via IntersectionObserver).
  const [revealed, setRevealed] = useState(false);
  const [visibleBlocks, setVisibleBlocks] = useState({});
  const revealRefs = React.useRef([]);

  // Détection responsive — inexistante avant l'intégration du design.
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    function onResize() { setMobile(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Typographie — Visby CF (police réelle du design system Aksa) avec
  // repli sur Poppins (Google Fonts) si les fichiers Visby CF sont
  // absents. Chemins attendus : /fonts/VisbyCF-*.woff2 à la racine du
  // repo (voir recap_maj_etape4_supabase_email.md, section 10).
  // Injecté une seule fois au montage, indépendamment de l'écran affiché.
  useEffect(() => {
    if (document.getElementById('cm-energy-score-fonts')) return;
    const style = document.createElement('style');
    style.id = 'cm-energy-score-fonts';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

      @font-face {
        font-family: 'Visby CF';
        src: url('/fonts/VisbyCF-Light.woff2') format('woff2');
        font-weight: 300;
        font-display: swap;
      }
      @font-face {
        font-family: 'Visby CF';
        src: url('/fonts/VisbyCF-Regular.woff2') format('woff2');
        font-weight: 400;
        font-display: swap;
      }
      @font-face {
        font-family: 'Visby CF';
        src: url('/fonts/VisbyCF-Medium.woff2') format('woff2');
        font-weight: 500;
        font-display: swap;
      }
      @font-face {
        font-family: 'Visby CF';
        src: url('/fonts/VisbyCF-DemiBold.woff2') format('woff2');
        font-weight: 600;
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Ordre des options mélangé une seule fois par question, au montage —
  // ne rebattt pas les cartes si on revient en arrière (section 6 de la spec).
  const [shuffledOptions] = useState(() =>
    QUESTIONS.map((q) => shuffle(q.options))
  );

  const currentQuestion = QUESTIONS[currentIndex];
  const currentOptions = shuffledOptions[currentIndex];
  const currentValue = answers[currentQuestion.axisKey][currentQuestion.axisIndex];
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  // Précharge les GIFs de la question actuelle et de la suivante — ils
  // sont déjà en cache quand la question s'affiche (Q1 et Q2 se chargent
  // dès la page d'accueil). Doit rester AVANT les "if (screen === ...)"
  // plus bas : React interdit un hook après un return conditionnel.
  useEffect(() => {
    [QUESTIONS[currentIndex], QUESTIONS[currentIndex + 1]].forEach((q) => {
      if (!q) return;
      q.options.forEach((opt) => {
        if (opt.gifUrl) { const img = new Image(); img.src = opt.gifUrl; }
      });
    });
  }, [currentIndex]);

  function handleSelect(value) {
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion.axisKey]: [...prev[currentQuestion.axisKey]] };
      next[currentQuestion.axisKey][currentQuestion.axisIndex] = value;
      return next;
    });
  }

  function handleNext() {
    if (currentValue === null) return; // bloqué tant que rien n'est sélectionné
    if (isLastQuestion) {
      const computed = buildResult(answers);
      const block3Text = buildBlock3(answers, computed);
      const block2 = buildBlock2(computed.profilDominant, computed.profilSecondaire);
      const reframeText = getReframe(computed.profilDominant);
      const bridgeText = getBridge(computed.profilDominant);
      const secondaryText = buildSecondaryParagraph(computed.profilSecondaire, answers);
      setResult({ ...computed, block3Text, block2, reframeText, bridgeText, secondaryText });
      setScreen('loading-results');
      setTimeout(() => setScreen('result'), 2950);

      const restitutionJSON = buildRestitutionJSON(block3Text, reframeText, bridgeText, secondaryText);
      insertRespondent(computed, answers, restitutionJSON).then(setRespondentId);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  function handleStart() {
    setScreen('loading-start');
    setTimeout(() => setScreen('quiz'), 2950);
  }

  function handleReveal() {
    setRevealed(true);
    setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const index = revealRefs.current.indexOf(entry.target);
              setVisibleBlocks((prev) => ({ ...prev, [index]: true }));
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      revealRefs.current.forEach((el) => el && observer.observe(el));
    }, 50);
  }

  if (screen === 'intro') {
    return <HomeScreen mobile={mobile} onStart={handleStart} />;
  }

  if (screen === 'loading-start') {
    return <LoadingScreen label="Getting ready" caption="Loading your questions..." mobile={mobile} />;
  }

  if (screen === 'quiz') {
    return (
      <div style={{ background: '#fdf9f2', minHeight: mobile ? '100dvh' : '100vh', boxSizing: 'border-box', padding: mobile ? '24px' : '32px', display: 'flex', flexDirection: 'column', justifyContent: mobile ? undefined : 'center', fontFamily: "'Visby CF', 'Poppins', sans-serif" }}>
        <div style={{ marginBottom: mobile ? '20px' : undefined }}>
          <ProgressBar current={currentIndex} total={QUESTIONS.length} />
        </div>

        <div style={{ flex: mobile ? 1 : undefined, display: mobile ? 'flex' : undefined, flexDirection: mobile ? 'column' : undefined, justifyContent: mobile ? 'flex-start' : undefined, paddingTop: mobile ? '12px' : undefined }}>
        <div style={{ maxWidth: mobile ? 'none' : '760px', margin: '0 auto' }}>
          <AxisLabel axisKey={currentQuestion.axisKey} mobile={mobile} centered />
          <QuestionTitle text={currentQuestion.text} mobile={mobile} centered />

          <div
            style={{
              display: mobile ? 'flex' : 'grid',
              flexDirection: mobile ? 'column' : undefined,
              gridTemplateColumns: mobile ? undefined : '1fr 1fr',
              gap: mobile ? '24px' : '40px',
              maxWidth: mobile ? 'none' : '600px',
              margin: mobile ? '0' : '0 auto',
              marginBottom: mobile ? '32px' : '36px',
            }}
          >
            {currentOptions.map((opt) => (
              <AnswerCard
                key={`${currentQuestion.id}-${opt.value}`}
                option={opt}
                axisKey={currentQuestion.axisKey}
                mobile={mobile}
                isSelected={currentValue === opt.value}
                hasSelection={currentValue !== null}
                onSelect={() => handleSelect(opt.value)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: mobile ? '10px' : undefined, justifyContent: currentIndex === 0 ? 'flex-end' : (mobile ? undefined : 'space-between'), alignItems: 'center', maxWidth: mobile ? 'none' : '600px', margin: mobile ? '0' : '0 auto' }}>
            {currentIndex > 0 && (
              <PreviousButton mobile={mobile} onClick={handlePrevious} disabled={false} />
            )}
            <NextButton
              mobile={mobile}
              onClick={handleNext}
              disabled={currentValue === null}
              label={isLastQuestion ? 'See my results' : undefined}
              accent={isLastQuestion}
            />
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (screen === 'loading-results') {
    return <LoadingScreen label="Loading your results" caption="Calculating your energy score..." mobile={mobile} />;
  }

  // screen === 'result' — restitution complète : bloc 1 (score) -> bloc 2 (mode
  // opératoire) -> bloc 3 (miroir) -> bloc 4 (reframe) -> bloc 5+6 (pont + CTA).
  // ÉTAPE A de l'intégration design : jauge + profil + bouton reveal habillés.
  // Le reste (blocs 3/4/5+6, secondaire, CTA, popup, debug) suit aux étapes B/C
  // — encore en rendu minimal ci-dessous, pas encore dans le PageShell.
  return (
    <PageShell mobile={mobile}>
      <div style={{ width: mobile ? '100%' : '60%', maxWidth: mobile ? 'none' : '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'center', gap: mobile ? '36px' : '56px' }}>
          <ScoreGauge scorePercent={result.scorePercent} score10Displayed={result.score10Displayed} mobile={mobile} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ProfileHeader
              score10Displayed={result.score10Displayed}
              dominantName={result.block2.dominant}
              secondaryText={result.block2.secondary}
              mobile={mobile}
            />
            {!revealed && <RevealButton mobile={mobile} onClick={handleReveal} />}
          </div>
        </div>
      </div>

      {/* Reste de la restitution — rendu minimal temporaire, sera habillé
          aux étapes B (reveal + FunctionCard) et C (CTA + popup). */}
      {revealed && (
        <div style={{ margin: mobile ? '36px auto 0' : '64px auto 0', display: 'flex', flexDirection: 'column', gap: '28px', padding: mobile ? '0 24px 24px' : '0 32px 32px' }}>
          <FunctionCard
            subtitle="The pattern"
            text={result.block3Text}
            revealRef={(el) => (revealRefs.current[0] = el)}
            revealed={!!visibleBlocks[0]}
          />
          <FunctionCard
            subtitle="The reframe"
            text={result.reframeText}
            revealRef={(el) => (revealRefs.current[1] = el)}
            revealed={!!visibleBlocks[1]}
          />
          <FunctionCard
            subtitle="The hidden cause"
            text={result.bridgeText.split('\n\nDiscover how in our deep dive!')[0]}
            ctaLine="Discover how in our deep dive!"
            revealRef={(el) => (revealRefs.current[2] = el)}
            revealed={!!visibleBlocks[2]}
          />
          {result.secondaryText && (
            <SecondaryProfileCard
              name={PROFILE_NAMES[result.profilSecondaire]}
              text={result.secondaryText}
              revealRef={(el) => (revealRefs.current[3] = el)}
              revealed={!!visibleBlocks[3]}
            />
          )}

          {/* CTA + popup — étape C. Le <details> debug reste minimal
              (conservé tel quel, hors habillage design). Visibles
              uniquement après le reveal, avec le reste du contenu. */}
          <div style={{ fontFamily: 'sans-serif', padding: '24px 0 0', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

          <div style={{ marginBottom: '24px' }}>
            <CtaButtonsRow onOpenDeepDive={() => setCtaEntry('deepdive')} onOpenEmail={() => setCtaEntry('email')} />
          </div>

          {ctaEntry && (
            <CtaPopup
              entry={ctaEntry}
              onClose={() => setCtaEntry(null)}
              onSkip={() => { navigateTo(DEEP_DIVE_URL); }}
              onSubmit={async (formValues) => {
                if (!respondentId) return;
                try {
                  await fetch('/api/send-mail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id:          respondentId,
                      email:       formValues.email,
                      prenom:      formValues.firstName,
                      linkedin_url: formValues.linkedin || null,
                      _hp:         formValues._hp || '',
                    }),
                  });
                } catch (err) {
                  console.error('send-mail failed:', err);
                }
              }}
            />
          )}

          </div>
        </div>
      )}
      </div>
    </PageShell>
  );
}
