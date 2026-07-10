/**
 * Revive Hogar — identidad visual + marca EchauriApps
 */

const ECHAURI_LOGO_SRC = 'assets/echauriapps-logo.svg';

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

function getReviveLogoSvg(className) {
    const cls = className || 'logo-revive-svg';
    const uid = 'rh' + Math.random().toString(36).slice(2, 9);
    return `<svg class="${cls}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
            <linearGradient id="${uid}-roof" x1="24" y1="8" x2="24" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#5eead4"/>
                <stop offset="100%" stop-color="#0d9488"/>
            </linearGradient>
            <linearGradient id="${uid}-base" x1="24" y1="22" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#14b8a6"/>
                <stop offset="100%" stop-color="#0d4f4a"/>
            </linearGradient>
        </defs>
        <path d="M24 6L8 22h4v18h24V22h4L24 6z" fill="url(#${uid}-base)"/>
        <path d="M24 10L12 24h3v14h18V24h3L24 10z" fill="url(#${uid}-roof)" opacity="0.9"/>
        <rect x="20" y="28" width="8" height="12" rx="1" fill="#ecfdf5" opacity="0.95"/>
        <path d="M18 24h12" stroke="#ccfbf1" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}

function getReviveBrandHtml(options) {
    const opts = options || {};
    const size = opts.size || 'md';
    const showSubtitle = opts.subtitle !== false;
    const wrapClass = opts.wrapClass || 'brand-lockup';
    const subtitle = opts.subtitleText || 'Soluciones habitacionales';
    const logoClass = `logo-revive-svg logo-revive-svg--${size}`;
    return `
        <div class="${wrapClass}">
            <span class="brand-lockup-icon">${getReviveLogoSvg(logoClass)}</span>
            <span class="brand-lockup-text">
                <strong class="brand-lockup-title"><span class="brand-revive">Revive</span> <span class="brand-hogar">Hogar</span></strong>
                ${showSubtitle ? `<small class="brand-lockup-sub">${escapeHtml(subtitle)}</small>` : ''}
            </span>
        </div>`;
}

function inicializarMarcasUI() {
    const loginLockup = document.getElementById('login-brand-lockup');
    if (loginLockup) {
        loginLockup.innerHTML = getReviveBrandHtml({
            size: 'lg',
            wrapClass: 'brand-lockup brand-lockup--login',
            subtitleText: 'Apoyo en créditos Infonavit y Fovissste'
        });
    }
    const loaderMark = document.getElementById('loader-brand-mark');
    if (loaderMark) loaderMark.innerHTML = getReviveLogoSvg('logo-revive-svg logo-revive-svg--loader');
    const topbarBrand = document.getElementById('topbar-brand');
    if (topbarBrand) {
        topbarBrand.innerHTML = getReviveBrandHtml({
            size: 'sm',
            wrapClass: 'brand-lockup brand-lockup--topbar',
            subtitle: false
        });
    }
    const sidebarLogo = document.getElementById('sidebar-brand-logo');
    if (sidebarLogo) sidebarLogo.innerHTML = getReviveLogoSvg('logo-revive-svg logo-revive-svg--sidebar');

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
