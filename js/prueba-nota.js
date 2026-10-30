/**
 * Nota de prueba: comentario y captura opcional de la pantalla.
 * No lee campos del formulario abierto ni contraseñas.
 */

function mostrarNotaPrueba(visible) {
    document.getElementById('rh-prueba')?.classList.toggle('hidden', !visible);
    if (!visible) cerrarNotaPrueba();
}

function abrirNotaPrueba() {
    document.getElementById('rh-prueba')?.classList.add('is-open');
    document.getElementById('rh-prueba-texto')?.focus();
}

function cerrarNotaPrueba() {
    document.getElementById('rh-prueba')?.classList.remove('is-open');
}

async function capturarNotaPrueba() {
    const caja = document.getElementById('rh-prueba');
    const destino = document.getElementById('rh-prueba-captura');
    const preview = document.getElementById('rh-prueba-preview');
    if (!navigator.mediaDevices?.getDisplayMedia || !destino) {
        alert('Este navegador no puede tomar la captura. El comentario sí se puede guardar.');
        return;
    }
    caja?.classList.add('rh-prueba--oculto');
    let stream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser' },
            audio: false,
            preferCurrentTab: true
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const ancho = video.videoWidth || 1100;
        const alto = video.videoHeight || 700;
        const escala = Math.min(1, 1100 / ancho);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(ancho * escala));
        canvas.height = Math.max(1, Math.round(alto * escala));
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.55);
        if (data.length > 140000) {
            destino.value = '';
            preview?.classList.add('hidden');
            alert('La captura pesa demasiado. Guarda la nota solo con el comentario.');
            return;
        }
        destino.value = data;
        if (preview) {
            preview.src = data;
            preview.classList.remove('hidden');
        }
    } catch (_) {
        /* La persona canceló el permiso de captura. */
    } finally {
        stream?.getTracks().forEach(track => track.stop());
        caja?.classList.remove('rh-prueba--oculto');
    }
}

function guardarNotaPrueba(event) {
    event.preventDefault();
    if (!currentUser || typeof DB === 'undefined') return;
    const texto = document.getElementById('rh-prueba-texto')?.value.trim().slice(0, 800) || '';
    if (!texto) {
        alert('Escribe qué viste antes de guardar.');
        return;
    }
    const captura = document.getElementById('rh-prueba-captura')?.value || '';
    const nota = {
        id: DB.getId(),
        ts: new Date().toISOString(),
        usuarioId: String(currentUser.id || '').slice(0, 40),
        usuario: String(currentUser.displayName || '').slice(0, 80),
        rol: currentUser.rol || '',
        modulo: typeof activeModuleId !== 'undefined' ? (activeModuleId || '') : '',
        comentario: texto,
        captura: captura.startsWith('data:image/jpeg') ? captura : ''
    };
    const lista = DB.get('notasPrueba') || [];
    DB.set('notasPrueba', lista.concat(nota).slice(-200));
    if (typeof logAction === 'function') logAction('Nota de prueba guardada');
    document.getElementById('rh-prueba-texto').value = '';
    document.getElementById('rh-prueba-captura').value = '';
    document.getElementById('rh-prueba-preview')?.classList.add('hidden');
    cerrarNotaPrueba();
    alert('Nota guardada. Dirección la ve en Bitácora.');
}
