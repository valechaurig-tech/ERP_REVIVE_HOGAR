/**
 * Revive Hogar — Google Maps (vista y captura de dirección)
 */

function direccionParaMapa(address) {
    return String(address || '').trim();
}

function getGoogleMapsLinkUrl(address) {
    const q = encodeURIComponent(direccionParaMapa(address));
    if (!q) return '';
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function getGoogleMapsEmbedUrl(address) {
    const q = encodeURIComponent(direccionParaMapa(address));
    if (!q) return '';
    return `https://maps.google.com/maps?q=${q}&hl=es&z=16&output=embed`;
}

function getHtmlMapaDireccion(address) {
    const dir = direccionParaMapa(address);
    if (dir.length < 5) {
        return `<div class="rh-map-card rh-map-card--empty">
            <span class="rh-map-placeholder">📍 Escribe la dirección para ver el mapa</span>
        </div>`;
    }
    const link = getGoogleMapsLinkUrl(dir);
    const embed = getGoogleMapsEmbedUrl(dir);
    return `<div class="rh-map-card">
        <iframe class="rh-map-embed" title="Mapa: ${escapeHtml(dir)}" src="${embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        <div class="rh-map-footer">
            <span class="rh-map-pin">📍 ${escapeHtml(dir)}</span>
            <a class="rh-map-link" href="${link}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps ↗</a>
        </div>
    </div>`;
}

function actualizarMapaDireccion(inputOrAddress, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    const address = typeof inputOrAddress === 'string'
        ? inputOrAddress
        : (inputOrAddress?.value || '');
    const dir = direccionParaMapa(address);
    preview.innerHTML = getHtmlMapaDireccion(dir);
    preview.classList.toggle('hidden', dir.length < 5);
}

const _mapDebounceTimers = {};

function bindMapaDireccionInput(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    const refresh = () => actualizarMapaDireccion(input, previewId);
    input.removeEventListener('input', input._rhMapInputHandler);
    input._rhMapInputHandler = () => {
        clearTimeout(_mapDebounceTimers[inputId]);
        _mapDebounceTimers[inputId] = setTimeout(refresh, 450);
        if (direccionParaMapa(input.value).length >= 3) preview.classList.remove('hidden');
    };
    input.addEventListener('input', input._rhMapInputHandler);
    refresh();
}
