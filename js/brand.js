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
    return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" role="img" aria-label="Revive Hogar">
        <defs>
            <linearGradient id="${id}-plate" x1="18" y1="10" x2="82" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#0d7aa8"/>
                <stop offset="38%" stop-color="#084d6e"/>
                <stop offset="100%" stop-color="#032a3d"/>
            </linearGradient>
            <linearGradient id="${id}-plate-deep" x1="50" y1="30" x2="50" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#084d6e" stop-opacity="0"/>
                <stop offset="100%" stop-color="#021a26" stop-opacity="0.55"/>
            </linearGradient>
            <linearGradient id="${id}-roof" x1="50" y1="14" x2="50" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1a8fbf"/>
                <stop offset="100%" stop-color="#084d6e"/>
            </linearGradient>
            <linearGradient id="${id}-accent" x1="58" y1="58" x2="92" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffc08a"/>
                <stop offset="45%" stop-color="#f68853"/>
                <stop offset="100%" stop-color="#e06530"/>
            </linearGradient>
            <linearGradient id="${id}-accent-shine" x1="62" y1="62" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fff" stop-opacity="0.45"/>
                <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${id}-r-fill" x1="30" y1="36" x2="58" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#d4eaf4"/>
            </linearGradient>
            <linearGradient id="${id}-ring" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#f68853" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="#7ec8e3" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#084d6e" stop-opacity="0.85"/>
            </linearGradient>
            <radialGradient id="${id}-ambient" cx="50" cy="38" r="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#3eb8e8" stop-opacity="0.22"/>
                <stop offset="70%" stop-color="#084d6e" stop-opacity="0"/>
            </radialGradient>
            <filter id="${id}-glow" x="-35%" y="-35%" width="170%" height="170%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#032a3d" flood-opacity="0.45"/>
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#f68853" flood-opacity="0.18"/>
            </filter>
            <clipPath id="${id}-clip">
                <rect x="14" y="14" width="72" height="72" rx="20"/>
            </clipPath>
        </defs>
        <circle cx="50" cy="50" r="47" stroke="url(#${id}-ring)" stroke-width="1.2" fill="url(#${id}-ambient)" opacity="0.95"/>
        <rect x="14" y="14" width="72" height="72" rx="20" fill="url(#${id}-plate)" filter="url(#${id}-glow)"/>
        <rect x="14" y="14" width="72" height="72" rx="20" fill="url(#${id}-plate-deep)"/>
        <g clip-path="url(#${id}-clip)">
            <path d="M50 20 L22 38.5 V41 L50 24.5 L78 41 V38.5 Z" fill="url(#${id}-roof)"/>
            <path d="M50 20 L22 38.5 L78 38.5 Z" fill="#ffffff" fill-opacity="0.12"/>
            <path d="M24 40 H76 V78 C76 81.3 73.3 84 70 84 H30 C26.7 84 24 81.3 24 78 Z" fill="#053448" fill-opacity="0.35"/>
            <path d="M24 40 H76 V78 C76 81.3 73.3 84 70 84 H30 C26.7 84 24 81.3 24 78 Z" fill="url(#${id}-plate)" fill-opacity="0.92"/>
            <path d="M58 58 H76 V78 C76 81.3 73.3 84 70 84 H58 Z" fill="url(#${id}-accent)"/>
            <path d="M60 60 H74 V80 C74 81.5 72.8 82.5 71 82.5 H60 Z" fill="url(#${id}-accent-shine)"/>
            <path fill="url(#${id}-r-fill)" d="M34 42 H48 C54.6 42 60 47.4 60 54 C60 58.2 57.6 61.9 54 63.8 L62 78 H56.5 L49.2 64.5 H38 V78 H34 V42 Z M38 46 V60.5 H48 C52.4 60.5 56 56.9 56 52.5 C56 48.1 52.4 44.5 48 44.5 H38 Z"/>
            <rect x="62" y="46" width="8" height="8" rx="1.5" fill="#fff" fill-opacity="0.22"/>
            <path d="M66 46 V54 M62 50 H70" stroke="#fff" stroke-opacity="0.35" stroke-width="0.8"/>
            <rect x="68" y="28" width="6" height="11" rx="1.2" fill="#032a3d"/>
            <rect x="68" y="28" width="3" height="11" rx="0.8" fill="#ffffff" fill-opacity="0.12"/>
            <path d="M88 24 L89.6 27.8 L93.5 28.5 L90.5 31.2 L91.2 35 L88 33.2 L84.8 35 L85.5 31.2 L82.5 28.5 L86.4 27.8 Z" fill="#ffc08a" opacity="0.95"/>
        </g>
        <path d="M22 28 C30 20 42 17 50 18 C38 22 30 30 26 38 Z" fill="#fff" fill-opacity="0.14"/>
        <ellipse cx="36" cy="26" rx="10" ry="4" fill="#fff" fill-opacity="0.08" transform="rotate(-18 36 26)"/>
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
