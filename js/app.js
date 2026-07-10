/**
 * Revive Hogar — inicio de aplicación
 */
document.addEventListener('DOMContentLoaded', async function () {
    const loader = document.getElementById('app-loader');
    if (typeof inicializarMarcasUI === 'function') inicializarMarcasUI();
    try {
        if (loader) loader.classList.remove('hidden');
        await DB.init();
        initSeedData();
        await DB.flush();
        cargarUsuariosLogin();
        setLoginMode('general');
        bindAllForms();
        bindLoginForm();
        bindAuditoriaEvents();
        if (typeof initIAAssistant === 'function') initIAAssistant();
        const pipeFilter = document.getElementById('pipeline-filter');
        if (pipeFilter) pipeFilter.addEventListener('change', renderPipeline);
    } catch (error) {
        console.error('Error al iniciar Revive Hogar:', error);
        alert(`No se pudo iniciar la aplicación.\n\n${error.message || error}`);
    } finally {
        if (loader) loader.classList.add('hidden');
    }
});
