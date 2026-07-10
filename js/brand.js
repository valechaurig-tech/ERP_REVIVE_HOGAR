/**
 * Revive Hogar — identidad visual oficial + marca EchauriApps
 */

const REVIVE_LOGO_MARK = 'assets/revive-hogar-mark.png';
const REVIVE_LOGO_FULL = 'assets/revive-hogar-logo-full.png';
const ECHAURI_LOGO_SRC = 'assets/echauriapps-logo.svg';

function getReviveLogoImg(variant) {
    const v = variant || 'md';
    const isFull = v === 'full';
    const src = isFull ? REVIVE_LOGO_FULL : REVIVE_LOGO_MARK;
    const sizes = {
        full: { h: 108, w: 280 },
        hero: { h: 68, w: 68 },
        md: { h: 44, w: 44 },
        sm: { h: 36, w: 36 },
        topbar: { h: 38, w: 38 },
        sidebar: { h: 34, w: 34 },
        loader: { h: 64, w: 64 }
    };
    const size = sizes[v] || sizes.md;
    const cls = `logo-revive-img logo-revive-img--${v}`;
    return `<img src="${src}" alt="Revive Hogar" class="${cls}" width="${size.w}" height="${size.h}" loading="eager" decoding="async">`;
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
        : (className || '').includes('lg') ? 'lg' : 'md';
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
