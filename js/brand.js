/**
 * Revive Hogar — identidad visual oficial + marca EchauriApps
 */

const REVIVE_LOGO_MARK = 'assets/revive-hogar-mark.svg';
const REVIVE_LOGO_MARK_PNG = 'assets/revive-hogar-mark.png';
const REVIVE_LOGO_FULL = 'assets/revive-hogar-logo-full.svg';
const REVIVE_LOGO_FULL_PNG = 'assets/revive-hogar-logo-full.png';
const ECHAURI_LOGO_SRC = 'assets/echauriapps-logo.svg';

function getReviveMarkSvgInline(variant) {
    const v = variant || 'md';
    const id = 'rh' + v.replace(/\W/g, '');
    const cls = `logo-revive-svg logo-revive-svg--${v}`;
    return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" role="img" aria-label="Revive Hogar">
        <defs>
            <linearGradient id="${id}-outer-ring" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#f9b07a"/>
                <stop offset="25%" stop-color="#084d6e"/>
                <stop offset="55%" stop-color="#0d8ec4"/>
                <stop offset="80%" stop-color="#084d6e"/>
                <stop offset="100%" stop-color="#e8742a"/>
            </linearGradient>
            <linearGradient id="${id}-badge" x1="24" y1="18" x2="96" y2="102" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1490be"/>
                <stop offset="32%" stop-color="#084d6e"/>
                <stop offset="100%" stop-color="#021822"/>
            </linearGradient>
            <linearGradient id="${id}-badge-edge" x1="60" y1="16" x2="60" y2="104" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff" stop-opacity="0.22"/>
                <stop offset="45%" stop-color="#fff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#000" stop-opacity="0.18"/>
            </linearGradient>
            <linearGradient id="${id}-roof-l" x1="38" y1="28" x2="60" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#3ec5ef"/>
                <stop offset="100%" stop-color="#084d6e"/>
            </linearGradient>
            <linearGradient id="${id}-roof-r" x1="60" y1="28" x2="82" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#0a6289"/>
                <stop offset="100%" stop-color="#053448"/>
            </linearGradient>
            <linearGradient id="${id}-wall" x1="34" y1="48" x2="86" y2="88" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#0a6289"/>
                <stop offset="100%" stop-color="#032a3d"/>
            </linearGradient>
            <linearGradient id="${id}-accent" x1="64" y1="62" x2="98" y2="98" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffd4a8"/>
                <stop offset="35%" stop-color="#f68853"/>
                <stop offset="100%" stop-color="#c94e12"/>
            </linearGradient>
            <linearGradient id="${id}-accent-edge" x1="66" y1="64" x2="94" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${id}-letter" x1="36" y1="44" x2="62" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="55%" stop-color="#e8f6fc"/>
                <stop offset="100%" stop-color="#b8d9ea"/>
            </linearGradient>
            <linearGradient id="${id}-letter-shade" x1="36" y1="44" x2="62" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#084d6e" stop-opacity="0"/>
                <stop offset="100%" stop-color="#021822" stop-opacity="0.35"/>
            </linearGradient>
            <radialGradient id="${id}-ambient" cx="60" cy="42" r="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#5ecbf0" stop-opacity="0.28"/>
                <stop offset="55%" stop-color="#084d6e" stop-opacity="0.08"/>
                <stop offset="100%" stop-color="#021822" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="${id}-spot" cx="42" cy="36" r="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
            </radialGradient>
            <filter id="${id}-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#021822" flood-opacity="0.5"/>
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#f68853" flood-opacity="0.22"/>
            </filter>
            <filter id="${id}-glow-star" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="${id}-badge-clip">
                <rect x="22" y="22" width="76" height="76" rx="22"/>
            </clipPath>
            <pattern id="${id}-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M8 0 L0 0 0 8" fill="none" stroke="#fff" stroke-opacity="0.03" stroke-width="0.5"/>
            </pattern>
        </defs>
        <circle cx="60" cy="60" r="56" fill="url(#${id}-ambient)"/>
        <circle cx="60" cy="60" r="55" stroke="url(#${id}-outer-ring)" stroke-width="2.2" fill="none" opacity="0.92"/>
        <circle cx="60" cy="60" r="51.5" stroke="#fff" stroke-opacity="0.08" stroke-width="0.8" fill="none"/>
        <rect x="22" y="22" width="76" height="76" rx="22" fill="url(#${id}-badge)" filter="url(#${id}-shadow)"/>
        <rect x="22" y="22" width="76" height="76" rx="22" fill="url(#${id}-badge-edge)"/>
        <rect x="23.5" y="23.5" width="73" height="73" rx="20.5" stroke="#fff" stroke-opacity="0.1" stroke-width="0.8" fill="none"/>
        <rect x="22" y="22" width="76" height="76" rx="22" fill="url(#${id}-grid)" opacity="0.6"/>
        <g clip-path="url(#${id}-badge-clip)">
            <path d="M60 30 L30 48 V51 L60 35 L90 51 V48 Z" fill="url(#${id}-roof-l)"/>
            <path d="M60 30 L60 35 L90 51 V48 Z" fill="url(#${id}-roof-r)"/>
            <path d="M60 30 L30 48 L90 48 Z" fill="#fff" fill-opacity="0.1"/>
            <path d="M60 32 L38 47 H82 L60 32 Z" fill="#fff" fill-opacity="0.06"/>
            <path d="M32 50 H88 V84 C88 87.3 85.3 90 82 90 H38 C34.7 90 32 87.3 32 84 Z" fill="url(#${id}-wall)"/>
            <path d="M32 50 H88 V56 H32 Z" fill="#fff" fill-opacity="0.06"/>
            <path d="M62 62 H88 V84 C88 87.3 85.3 90 82 90 H62 V62 Z" fill="url(#${id}-accent)"/>
            <path d="M64 64 H86 V84 C86 86.2 84.2 88 82 88 H64 V64 Z" fill="url(#${id}-accent-edge)"/>
            <path d="M62 62 C72 62 82 72 88 84" stroke="#fff" stroke-opacity="0.18" stroke-width="0.8" fill="none"/>
            <path fill="url(#${id}-letter-shade)" d="M40 52 H56.5 C63.4 52 69 57.6 69 64.5 C69 69.2 66.2 73.3 62 75.4 L71.5 88 H65.2 L57.2 76.2 H46 V88 H40 V52 Z"/>
            <path fill="url(#${id}-letter)" d="M40 52 H56.5 C63.4 52 69 57.6 69 64.5 C69 69.2 66.2 73.3 62 75.4 L71.5 88 H65.2 L57.2 76.2 H46 V88 H40 V52 Z M44 56 V72.2 H56.5 C61.2 72.2 65 68.4 65 63.7 C65 59 61.2 55.2 56.5 55.2 H44 V56 Z"/>
            <path d="M40 52 H56.5 C63.4 52 69 57.6 69 64.5 C69 69.2 66.2 73.3 62 75.4 L71.5 88 H65.2 L57.2 76.2 H46 V88 H40 V52 Z M44 56 V72.2 H56.5 C61.2 72.2 65 68.4 65 63.7 C65 59 61.2 55.2 56.5 55.2 H44 V56 Z" stroke="#fff" stroke-opacity="0.35" stroke-width="0.6" fill="none"/>
            <path d="M72 78 C72 73.6 75.6 70 80 70 C84.4 70 88 73.6 88 78 V88 H72 V78 Z" fill="#021822" fill-opacity="0.22"/>
            <path d="M76 88 V78 C76 75.8 77.8 74 80 74 C82.2 74 84 75.8 84 78 V88" stroke="#fff" stroke-opacity="0.25" stroke-width="0.7" fill="none"/>
            <rect x="72" y="54" width="10" height="10" rx="2" fill="#021822" fill-opacity="0.2"/>
            <rect x="73" y="55" width="8" height="8" rx="1.5" fill="#fff" fill-opacity="0.15"/>
            <path d="M77 55 V63 M73 59 H81" stroke="#fff" stroke-opacity="0.3" stroke-width="0.6"/>
            <rect x="78" y="36" width="7" height="13" rx="1.5" fill="#021822"/>
            <rect x="78" y="36" width="3.5" height="13" rx="0.8" fill="#fff" fill-opacity="0.12"/>
            <ellipse cx="81.5" cy="35" rx="3" ry="1.2" fill="#fff" fill-opacity="0.08"/>
            <path d="M34 92 H86" stroke="url(#${id}-accent)" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
            <path d="M48 92 C54 88 66 88 72 92" stroke="#ffd4a8" stroke-width="0.8" stroke-linecap="round" opacity="0.45" fill="none"/>
            <g filter="url(#${id}-glow-star)" transform="translate(94,28)">
                <path d="M0 -4 L1 0 L4 1 L1 2 L0 6 L-1 2 L-4 1 L-1 0 Z" fill="#ffd4a8"/>
                <circle r="1.2" fill="#fff" opacity="0.9"/>
            </g>
        </g>
        <ellipse cx="60" cy="60" rx="38" ry="38" fill="url(#${id}-spot)"/>
        <path d="M28 34 C36 24 48 20 58 22 C46 26 36 34 32 42 Z" fill="#fff" fill-opacity="0.12"/>
        <path d="M28 88 C34 92 40 94 46 94" stroke="#f68853" stroke-opacity="0.25" stroke-width="0.8" stroke-linecap="round"/>
    </svg>`;
}

function getReviveLogoImg(variant) {
    const v = variant || 'md';
    if (v === 'full') {
        return `<img src="${REVIVE_LOGO_FULL}" alt="Revive Hogar" class="logo-revive-img logo-revive-img--full" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${REVIVE_LOGO_FULL_PNG}'">`;
    }
    return getReviveMarkSvgInline(v);
}

function getEchauriLogoImg(variant) {
    const v = variant || 'badge';
    return `<img src="${ECHAURI_LOGO_SRC}" alt="EchauriApps" class="logo-echauri-img logo-echauri-img--${v}" width="110" height="56" loading="lazy" decoding="async">`;
}

function getEchauriBrandHtml(variant) {
    const v = variant || 'badge';
    return `
        <div class="echauri-brand-badge__glow" aria-hidden="true"></div>
        ${getEchauriLogoImg(v)}
    `;
}

/** @deprecated — conservado por compatibilidad; usar getReviveLogoImg */
function getReviveLogoSvg(className) {
    const v = (className || '').includes('sidebar') ? 'sidebar'
        : (className || '').includes('loader') ? 'loader'
        : (className || '').includes('lg') ? 'hero' : 'md';
    return getReviveLogoImg(v);
}

function getReviveBrandHtml(options) {
    const opts = options || {};
    const variant = opts.variant || (opts.size === 'lg' ? 'login' : opts.size || 'md');
    const wrapClass = opts.wrapClass || 'brand-lockup';
    const showSubtitle = opts.subtitle !== false;
    const subtitle = opts.subtitleText || 'Grupo inmobiliario';
    const useFullOnly = opts.fullLogo === true;

    if (useFullOnly) {
        return `
        <div class="${wrapClass} brand-lockup--image-only">
            ${getReviveLogoImg('full')}
        </div>`;
    }

    const imgVariant = variant === 'login' ? 'hero' : (variant === 'sm' ? 'topbar' : variant);

    return `
        <div class="${wrapClass}">
            <span class="brand-lockup-icon">${getReviveLogoImg(imgVariant)}</span>
            <span class="brand-lockup-text">
                <strong class="brand-lockup-title">
                    <span class="brand-revive">Revive</span>
                    <span class="brand-hogar">Hogar</span>
                </strong>
                ${showSubtitle ? `<small class="brand-lockup-sub">${escapeHtml(subtitle)}</small>` : ''}
            </span>
        </div>`;
}

function inicializarMarcasUI() {
    const loginLockup = document.getElementById('login-brand-lockup');
    if (loginLockup) {
        loginLockup.innerHTML = getReviveBrandHtml({
            variant: 'login',
            wrapClass: 'brand-lockup brand-lockup--login',
            subtitleText: 'Grupo inmobiliario',
            fullLogo: false
        });
    }

    const loaderMark = document.getElementById('loader-brand-mark');
    if (loaderMark) loaderMark.innerHTML = getReviveLogoImg('loader');

    const topbarBrand = document.getElementById('topbar-brand');
    if (topbarBrand) {
        topbarBrand.innerHTML = getReviveBrandHtml({
            variant: 'topbar',
            wrapClass: 'brand-lockup brand-lockup--topbar',
            subtitle: false
        });
    }

    const sidebarLogo = document.getElementById('sidebar-brand-logo');
    if (sidebarLogo) sidebarLogo.innerHTML = getReviveLogoImg('sidebar');

    const loginEchauri = document.getElementById('login-echauri-brand');
    if (loginEchauri) {
        loginEchauri.innerHTML = `
            <span class="login-powered-by-label">Desarrollado por</span>
            <div class="echauri-brand-badge echauri-brand-badge--login">${getEchauriBrandHtml('login')}</div>
        `;
    }

    const badge = document.getElementById('echauri-brand-badge');
    if (badge) badge.innerHTML = getEchauriBrandHtml('badge');
}
