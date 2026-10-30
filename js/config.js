/**
 * Revive Hogar — Supabase dedicado (proyecto revive-hogar)
 */
window.RH_CONFIG = {
    SUPABASE_URL: 'https://fqoyvmhanouirqlcgskz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxb3l2bWhhbm91aXJxbGNnc2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTY2NTgsImV4cCI6MjA5OTEzMjY1OH0.yjR2lb1GoFMGTssMD0QftwS3D30hxftlN0ifOMuQJW4',
    LOGIN_REQUIERE_PASSWORD: true,
    PASSWORD_INICIAL: '1234'
};

/*
 * PROTECCIÓN: un Preview generado por Vercel no debe compartir datos reales.
 * Dominios de producción conservan la conexión existente; despliegues temporales
 * de echauri-apps usan solo datos locales de demostración. No reemplaza RLS.
 */
(function protegerEntornoPreviewRevive() {
    const host = String(window.location?.hostname || '').toLowerCase();
    const prodHosts = new Set(['revive-hogar.vercel.app', 'revive-hogar-echauri-apps.vercel.app']);
    const previewVercel = host.startsWith('revive-hogar-') && host.endsWith('-echauri-apps.vercel.app')
        && !prodHosts.has(host);
    if (previewVercel) {
        window.RH_CONFIG.SUPABASE_URL = '';
        window.RH_CONFIG.SUPABASE_ANON_KEY = '';
        window.RH_CONFIG.ISOLATED_PREVIEW = true;
    }
})();
