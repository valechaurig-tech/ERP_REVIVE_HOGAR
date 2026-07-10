/**
 * Luna — asistente IA de Revive Hogar (avatar femenino premium)
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
                <stop offset="0%" stop-color="#134e4a"/>
                <stop offset="45%" stop-color="#0f766e"/>
                <stop offset="100%" stop-color="#042f2e"/>
            </linearGradient>
            <linearGradient id="${uid}-hair" x1="40" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#5eead4"/>
                <stop offset="40%" stop-color="#0d9488"/>
                <stop offset="100%" stop-color="#064e3b"/>
            </linearGradient>
            <linearGradient id="${uid}-skin" x1="60" y1="42" x2="60" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff7ed"/>
                <stop offset="100%" stop-color="#fed7aa"/>
            </linearGradient>
            <linearGradient id="${uid}-glow" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#99f6e4" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
            </linearGradient>
            <filter id="${uid}-soft" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f766e" flood-opacity="0.35"/>
            </filter>
        </defs>
        <circle class="luna-ring luna-ring--outer" cx="60" cy="60" r="56" stroke="url(#${uid}-glow)" stroke-width="2" fill="none" opacity="0.7"/>
        <circle class="luna-ring luna-ring--inner" cx="60" cy="60" r="52" fill="url(#${uid}-bg)" filter="url(#${uid}-soft)"/>
        <ellipse class="luna-hair luna-hair--back" cx="60" cy="58" rx="34" ry="38" fill="url(#${uid}-hair)"/>
        <path class="luna-hair luna-hair--strand-l" d="M28 52 C24 72 26 88 34 98 C38 78 32 62 28 52Z" fill="#0d9488" opacity="0.85"/>
        <path class="luna-hair luna-hair--strand-r" d="M92 52 C96 72 94 88 86 98 C82 78 88 62 92 52Z" fill="#0d9488" opacity="0.85"/>
        <ellipse cx="60" cy="62" rx="26" ry="28" fill="url(#${uid}-skin)"/>
        <path class="luna-hair luna-hair--bangs" d="M34 48 C42 36 78 36 86 48 C82 42 68 38 60 40 C52 38 38 42 34 48Z" fill="url(#${uid}-hair)"/>
        <ellipse class="luna-eye luna-eye--l" cx="50" cy="58" rx="4.5" ry="5.5" fill="#134e4a"/>
        <ellipse class="luna-eye luna-eye--r" cx="70" cy="58" rx="4.5" ry="5.5" fill="#134e4a"/>
        <circle class="luna-eye-shine" cx="51.5" cy="56.5" r="1.5" fill="#fff"/>
        <circle class="luna-eye-shine" cx="71.5" cy="56.5" r="1.5" fill="#fff"/>
        <path class="luna-lash" d="M44 54 Q50 50 56 54" stroke="#0f766e" stroke-width="1" fill="none" opacity="0.5"/>
        <path class="luna-lash" d="M64 54 Q70 50 76 54" stroke="#0f766e" stroke-width="1" fill="none" opacity="0.5"/>
        <path class="luna-smile" d="M52 68 Q60 74 68 68" stroke="#c2410c" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.55"/>
        <ellipse cx="44" cy="64" rx="4" ry="2.5" fill="#fda4af" opacity="0.35"/>
        <ellipse cx="76" cy="64" rx="4" ry="2.5" fill="#fda4af" opacity="0.35"/>
        <g class="luna-pendant" transform="translate(60,82)">
            <path d="M-6 0 L0 -8 L6 0 L4 6 L-4 6 Z" fill="#5eead4" stroke="#0f766e" stroke-width="0.8"/>
            <rect x="-2.5" y="1" width="5" height="4" rx="0.5" fill="#ecfdf5"/>
        </g>
        <circle class="luna-sparkle luna-sparkle--1" cx="22" cy="28" r="2" fill="#99f6e4" opacity="0.8"/>
        <circle class="luna-sparkle luna-sparkle--2" cx="98" cy="34" r="1.5" fill="#fde68a" opacity="0.9"/>
        <circle class="luna-sparkle luna-sparkle--3" cx="88" cy="18" r="1" fill="#fff" opacity="0.7"/>
    </svg>`;
}

function getLunaAvatarHtml(size) {
    const s = size || 'md';
    return `<span class="luna-avatar luna-avatar--${s}"><span class="luna-avatar-glow"></span>${getLunaSvg('luna-svg luna-svg--' + s)}</span>`;
}

function getLunaMiniHtml() {
    return getLunaAvatarHtml('xs');
}

/* Compatibilidad temporal */
const getRivaSvg = getLunaSvg;
const getRivaAvatarHtml = getLunaAvatarHtml;
const getRivaMiniHtml = getLunaMiniHtml;
