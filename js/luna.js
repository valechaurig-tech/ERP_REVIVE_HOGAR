/**
 * Luna — asistente IA de Revive Hogar (avatar femenino premium + marco Gemini)
 */

const LUNA_NOMBRE = 'Luna';
const LUNA_TAGLINE = 'Tu guía inteligente del hogar';

function getLunaSvg(className, opts) {
    const o = opts || {};
    const cls = className || 'luna-svg';
    const anim = o.animated !== false ? ' luna-svg--animated' : '';
    const uid = 'ln' + Math.random().toString(36).slice(2, 9);
    return `<svg class="${cls}${anim}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="${uid}-bg" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#0a6289"/>
                <stop offset="50%" stop-color="#084d6e"/>
                <stop offset="100%" stop-color="#032a3d"/>
            </linearGradient>
            <linearGradient id="${uid}-hair" x1="40" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#7ec8e3"/>
                <stop offset="45%" stop-color="#084d6e"/>
                <stop offset="100%" stop-color="#032a3d"/>
            </linearGradient>
            <linearGradient id="${uid}-skin" x1="60" y1="42" x2="60" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff7ed"/>
                <stop offset="100%" stop-color="#fed7aa"/>
            </linearGradient>
            <linearGradient id="${uid}-glow" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#f9a66b" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#084d6e" stop-opacity="0"/>
            </linearGradient>
            <filter id="${uid}-soft" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#084d6e" flood-opacity="0.35"/>
            </filter>
        </defs>
        <circle class="luna-ring luna-ring--outer" cx="60" cy="60" r="56" stroke="url(#${uid}-glow)" stroke-width="2" fill="none" opacity="0.75"/>
        <circle class="luna-ring luna-ring--inner" cx="60" cy="60" r="52" fill="url(#${uid}-bg)" filter="url(#${uid}-soft)"/>
        <ellipse class="luna-hair luna-hair--back" cx="60" cy="58" rx="34" ry="38" fill="url(#${uid}-hair)"/>
        <path class="luna-hair luna-hair--strand-l" d="M28 52 C24 72 26 88 34 98 C38 78 32 62 28 52Z" fill="#084d6e" opacity="0.85"/>
        <path class="luna-hair luna-hair--strand-r" d="M92 52 C96 72 94 88 86 98 C82 78 88 62 92 52Z" fill="#084d6e" opacity="0.85"/>
        <ellipse cx="60" cy="62" rx="26" ry="28" fill="url(#${uid}-skin)"/>
        <path class="luna-hair luna-hair--bangs" d="M34 48 C42 36 78 36 86 48 C82 42 68 38 60 40 C52 38 38 42 34 48Z" fill="url(#${uid}-hair)"/>
        <ellipse class="luna-eye luna-eye--l" cx="50" cy="58" rx="4.5" ry="5.5" fill="#032a3d"/>
        <ellipse class="luna-eye luna-eye--r" cx="70" cy="58" rx="4.5" ry="5.5" fill="#032a3d"/>
        <circle class="luna-eye-shine" cx="51.5" cy="56.5" r="1.5" fill="#fff"/>
        <circle class="luna-eye-shine" cx="71.5" cy="56.5" r="1.5" fill="#fff"/>
        <path class="luna-lash" d="M44 54 Q50 50 56 54" stroke="#084d6e" stroke-width="1" fill="none" opacity="0.5"/>
        <path class="luna-lash" d="M64 54 Q70 50 76 54" stroke="#084d6e" stroke-width="1" fill="none" opacity="0.5"/>
        <path class="luna-smile" d="M52 68 Q60 74 68 68" stroke="#f68853" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.65"/>
        <ellipse cx="44" cy="64" rx="4" ry="2.5" fill="#fda4af" opacity="0.35"/>
        <ellipse cx="76" cy="64" rx="4" ry="2.5" fill="#fda4af" opacity="0.35"/>
        <g class="luna-pendant" transform="translate(60,82)">
            <path d="M-6 0 L0 -8 L6 0 L4 6 L-4 6 Z" fill="#f68853" stroke="#084d6e" stroke-width="0.8"/>
            <rect x="-2.5" y="1" width="5" height="4" rx="0.5" fill="#fff3ec"/>
        </g>
        <circle class="luna-sparkle luna-sparkle--1" cx="22" cy="28" r="2" fill="#7ec8e3" opacity="0.85"/>
        <circle class="luna-sparkle luna-sparkle--2" cx="98" cy="34" r="1.5" fill="#f68853" opacity="0.95"/>
        <circle class="luna-sparkle luna-sparkle--3" cx="88" cy="18" r="1" fill="#fff" opacity="0.8"/>
    </svg>`;
}

/** Marco mágico estilo Gemini alrededor del avatar */
function getLunaGeminiFrameHtml(innerHtml, variant) {
    const v = variant || 'md';
    return `<span class="luna-gemini-frame luna-gemini-frame--${v}">
        <span class="luna-gemini-frame__aura" aria-hidden="true"></span>
        <span class="luna-gemini-frame__ring" aria-hidden="true"></span>
        <span class="luna-gemini-frame__content">${innerHtml}</span>
    </span>`;
}

function getLunaAvatarHtml(size) {
    const s = size || 'md';
    const frameVariant = s === 'lg' ? 'header' : (s === 'xs' ? 'chat' : 'md');
    const svg = getLunaSvg('luna-svg luna-svg--' + s, { animated: s !== 'xs' });
    const frame = getLunaGeminiFrameHtml(svg, frameVariant);
    return `<span class="luna-avatar luna-avatar--${s}">${frame}</span>`;
}

function getLunaFabHtml() {
    return getLunaGeminiFrameHtml(
        getLunaSvg('luna-svg luna-svg--fab', { animated: true }),
        'fab'
    );
}

function getLunaMiniHtml() {
    return getLunaAvatarHtml('xs');
}

/* Compatibilidad temporal */
const getRivaSvg = getLunaSvg;
const getRivaAvatarHtml = getLunaAvatarHtml;
const getRivaMiniHtml = getLunaMiniHtml;
