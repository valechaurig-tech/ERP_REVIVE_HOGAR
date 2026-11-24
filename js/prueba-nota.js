/** Envía a la tabla privada con la misma sesión del ERP. El texto de borradores fallidos se recupera en esta pestaña durante 30 minutos. */
const rhPruebas = (() => {
    const get = id => document.getElementById('rh-pruebas-' + id);
    const boundary = () => document.getElementById('rh-pruebas');
    const pdfLimit = 3 * 1024 * 1024;
    let epoch = 0, controller, draft, attachment, sending = false, panelCaller, receiptCaller;
    let initialized = false;

    function say(text, error = false) {
        const node = get('message');
        node.textContent = text;
        node.dataset.error = String(error);
    }
    const current = revision => revision === epoch && !boundary().hidden;
    const focus = el => { if (el?.isConnected) el.focus({ preventScroll: true }); };
    const panelOpen = () => !get('panel').hidden;
    const triggers = () => [get('trigger'), get('report-entry')].filter(Boolean);
    const accountId = () => typeof currentUser !== 'undefined' ? currentUser?.id : null;
    const typePrefixes = { error:'', mejora:'Mejora: ', pregunta:'Pregunta: ' };


    // Solo texto y metadatos mínimos, dentro de esta pestaña y por tiempo limitado.
    // Nunca guardar imágenes ni PDFs en sessionStorage/localStorage.
    const draftStoreKey = 'rh_pruebas_borrador_temporal_v1';
    const draftLifeMs = 30 * 60 * 1000;
    function forgetDraft() {
        try { window.sessionStorage?.removeItem(draftStoreKey); } catch (_) {}
    }
    function rememberDraft() {
        try {
            if (!draft?.owner || draft.owner !== accountId()) return;
            const comment = String(get('comment')?.value || '').slice(0, 800);
            const type = get('type')?.value || 'error';
            const hasFile = !!draft.file;
            const pendingWithFile = !!(draft.pending?.image || draft.pending?.pdf);
            const pending = draft.pending && !pendingWithFile ?
                {
                    expectedUser:draft.owner,
                    requestId:draft.pending.requestId,
                    comment:draft.pending.comment,
                    screen:draft.pending.screen,
                    version:draft.pending.version,
                    image:null,
                    pdf:null
                } : null;
            const missingFile = hasFile || !!draft.needsAttachment || pendingWithFile;
            if (!comment.trim() && !missingFile && !pending) return forgetDraft();
            window.sessionStorage?.setItem(draftStoreKey, JSON.stringify({
                owner:draft.owner, savedAt:Date.now(), comment,
                type: Object.hasOwn(typePrefixes,type) ? type : 'error',
                screen:draft.screen, version:draft.version,
                missingFile, uncertain:pendingWithFile || !!draft.uncertain,
                pending
            }));
        } catch (_) { /* Navegadores sin almacenamiento: no bloquear Pruebas. */ }
    }
    function restoreDraft() {
        try {
            const stored = window.sessionStorage?.getItem(draftStoreKey);
            if (!stored) return false;
            const d = JSON.parse(stored);
            if (!d || d.owner !== accountId() ||
                !Number.isFinite(d.savedAt) ||
                Date.now() - d.savedAt > draftLifeMs || d.savedAt > Date.now() + 60000 ||
                typeof d.comment !== 'string' || d.comment.length > 800 ||
                !Object.hasOwn(typePrefixes,d.type) ||
                typeof d.screen !== 'string' || !/^mod-[a-z0-9-]{1,72}$|^app$/.test(d.screen)) {
                forgetDraft();
                return false;
            }
            const oldPending = d.pending;
            const safePending = oldPending && !d.missingFile &&
                oldPending.expectedUser === d.owner &&
                /^[0-9a-f-]{36}$/i.test(oldPending.requestId) &&
                typeof oldPending.comment === 'string' &&
                oldPending.comment.length <= 800 &&
                oldPending.screen === d.screen &&
                oldPending.image == null && oldPending.pdf == null ?
                { expectedUser:d.owner, requestId:oldPending.requestId,
                  comment:oldPending.comment, screen:d.screen,
                  version:d.version || null, image:null, pdf:null } : null;
            draft = {
                ...newDraft(), screen:d.screen, version:d.version || null,
                pending:safePending, needsAttachment:!!d.missingFile,
                uncertain:!!d.uncertain, restored:true
            };
            get('comment').value = d.comment;
            get('type').value = d.type;
            get('confirmed').checked = false;
            return true;
        } catch (_) {
            forgetDraft();
            return false;
        }
    }

    function newId() {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 15) | 64;
        b[8] = (b[8] & 63) | 128;
        const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
        return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
    }
    function newDraft() {
        const screen = typeof activeModuleId === 'string' && /^mod-[a-z0-9-]{1,72}$/.test(activeModuleId) ? activeModuleId : 'app';
        const label = window.RH_CONFIG?.APP_VERSION || document.querySelector('meta[name="app-version"]')?.content;
        const version = typeof label === 'string' && /^[a-zA-Z0-9._+-]{1,80}$/.test(label) ? label : null;
        return { screen, version, file: null, pending: null, owner: accountId() };
    }
    function controls() {
        const locked = sending || Boolean(draft?.pending);
        const busy = Boolean(attachment);
        get('comment').readOnly = locked;
        for (const id of ['capture','attach','remove','file','type','confirmed']) get(id).disabled = locked || busy;
        get('send').disabled = sending || busy;
        get('send').textContent = sending ? 'Enviando…' : draft?.pending ? 'Reintentar envío' : 'Enviar reporte';
        get('panel').setAttribute('aria-busy', String(sending || busy));
    }
    function showFile(file) {
        if (draft) {
            draft.file = file;
            if (file) { draft.needsAttachment = false; draft.uncertain = false; }
            rememberDraft();
        }
        const pdf = file?.kind === 'pdf';
        get('preview-label').textContent = pdf ? 'Factura PDF lista · ' + file.name
            : file ? 'Vista previa de la captura. Todavía no se ha enviado.' : 'Adjunta solo lo necesario para revisar el reporte.';
        get('privacy').hidden = get('remove').hidden = !file;
        get('confirmed').checked = false;
        get('remove').textContent = pdf ? 'Quitar PDF' : 'Quitar captura';
        get('privacy-text').textContent = pdf ? 'Revisé el PDF y tengo autorización para enviarlo.'
            : 'Revisé la captura y tengo autorización para enviarla. No contiene datos sensibles de otras personas.';
        const preview = get('preview-image');
        preview.hidden = file?.kind !== 'image';
        if (file?.kind === 'image') preview.src = 'data:image/jpeg;base64,' + file.data;
        else preview.removeAttribute('src');
    }
    function openPanel(caller) {
        if (boundary().hidden) return;
        if (panelOpen()) {
            if (!sending) closePanel();
            return;
        }
        if (!draft) restoreDraft();
        const fresh = !draft || (!get('comment').value && !draft.file && !draft.pending &&
            !draft.needsAttachment && get('type').value === 'error');
        if (fresh) {
            draft = newDraft();
            showFile(null);
        }
        get('receipt').hidden = true;
        panelCaller = caller;
        get('context').textContent = typeof RH_MODULE_LABELS !== 'undefined' && Object.hasOwn(RH_MODULE_LABELS,draft.screen)
            ? RH_MODULE_LABELS[draft.screen] : 'Revive Hogar';
        say(draft.pending ? 'Se recuperó tu envío pendiente. Reintenta con el mismo folio de solicitud.' :
            draft.needsAttachment ? (draft.uncertain ?
                'Recuperamos tu comentario, no el archivo. El envío anterior pudo recibirse: confirma primero con Dirección antes de volver a enviarlo. Si hace falta, adjunta otra vez la captura o PDF.' :
                'Recuperamos tu comentario. Por privacidad, vuelve a adjuntar la captura o PDF.') :
            draft.restored ? 'Recuperamos tu borrador de esta pestaña.' : '');
        controls();
        get('panel').hidden = false;
        get('panel').scrollTop = 0;
        for (const button of triggers()) button.setAttribute('aria-expanded','true');
        if (fresh) addAttachment('screen', null, true);
        focus(draft.pending ? get('send') : get('panel'));
    }
    function closePanel(restoreFocus = true) {
        get('panel').hidden = true;
        for (const button of triggers()) button.setAttribute('aria-expanded','false');
        stopAttachment();
        if (restoreFocus) focus(panelCaller);
    }
    function closeReceipt() {
        get('receipt').hidden = true;
        focus(receiptCaller);
    }
    function stopAttachment() {
        attachment?.abort();
        attachment = null;
    }
    async function readPdf(file, signal) {
        if (!file.size || file.size > pdfLimit) throw new Error('El PDF debe pesar hasta 3 MB.');
        const head = new TextDecoder().decode(await file.slice(0, 8).arrayBuffer());
        if (!/^%PDF-[12]\.\d/.test(head)) throw new Error('El archivo no parece ser un PDF válido.');
        if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
        return new Promise((resolve,reject) => {
            const reader = new FileReader();
            const abort = () => reader.abort();
            signal.addEventListener('abort', abort, { once:true });
            reader.onloadend = () => signal.removeEventListener('abort', abort);
            reader.onerror = () => reject(new Error('No se pudo leer el PDF.'));
            reader.onabort = () => reject(new DOMException('Cancelado', 'AbortError'));
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.readAsDataURL(file);
        });
    }
    async function addAttachment(kind, file, automatic = false) {
        if (!draft || sending || draft.pending || attachment) return;
        const c = new AbortController();
        attachment = c;
        const revision = epoch;
        const pdf = kind === 'file' && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
        say(kind === 'screen' ? 'Capturando la vista actual…' : 'Preparando archivo…');
        controls();
        try {
            const data = kind === 'screen' ? await rhPruebasImagen.fromPage(c.signal)
                : pdf ? await readPdf(file,c.signal) : await rhPruebasImagen.fromFile(file);
            if (current(revision) && attachment === c && panelOpen()) {
                showFile({ kind:pdf ? 'pdf' : 'image', data, name:pdf ? file.name.slice(0,120) : '' });
                say('');
            }
        } catch (error) {
            if (current(revision) && attachment === c) {
                say(kind === 'screen'
                    ? 'No se pudo capturar la vista. Reintenta, adjunta un archivo o envía solo el comentario.'
                    : error?.message || 'No se pudo preparar el archivo.', true);
            }
        } finally {
            if (attachment === c) {
                stopAttachment();
                controls();
                // Never steal focus while the reporter is typing.
                if (panelOpen() && !automatic && document.activeElement === document.body) focus(get(kind === 'screen' ? 'capture' : 'attach'));
            }
        }
    }
    async function request(payload) {
        const signal = controller.signal;
        const timeout = new AbortController();
        const abort = () => timeout.abort();
        const timer = setTimeout(abort, 28000);
        signal.addEventListener('abort', abort, { once:true });
        try {
            const res = await fetch('/api/pruebas', {
                method:'POST', credentials:'same-origin', redirect:'error', cache:'no-store', signal:timeout.signal,
                headers:{ 'X-RH-Session':'1', 'Content-Type':'application/json' }, body:JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw Object.assign(new Error(data.message || 'No se pudo completar el envío.'), { status:res.status });
            if (typeof data.folio !== 'string' || !/^RH-\d+$/.test(data.folio)) throw new Error('No se recibió el folio.');
            return data;
        } finally {
            clearTimeout(timer);
            signal.removeEventListener('abort',abort);
        }
    }
    async function send() {
        if (!draft || sending || attachment || !panelOpen()) return;
        const comment = get('comment').value.trim();
        if (!comment && !draft.file) { say('Escribe un comentario o adjunta una factura o imagen.',true); return focus(get('comment')); }
        if (draft.file && !get('confirmed').checked) { say('Confirma que revisaste el adjunto antes de enviarlo.',true); return focus(get('confirmed')); }
        if (!draft.owner || draft.owner !== accountId()) { say('La cuenta cambió. Vuelve a abrir Pruebas con tu cuenta.',true); return; }
        const prefix = typePrefixes[get('type').value] || '';
        const message = comment ? prefix + comment : prefix.trimEnd();
        if (message.length > 800) { say('Acorta un poco el comentario para incluir el tipo de reporte.',true); return focus(get('comment')); }
        if (!draft.pending) draft.pending = {
            expectedUser:draft.owner, requestId:newId(), comment:message, screen:draft.screen, version:draft.version,
            image:draft.file?.kind === 'image' ? draft.file.data : null,
            pdf:draft.file?.kind === 'pdf' ? draft.file.data : null
        };
        rememberDraft();
        sending = true;
        const revision = epoch;
        controls();
        say('Enviando reporte…');
        try {
            const receipt = await request(draft.pending);
            if (!current(revision)) return;
            receiptCaller = panelCaller;
            closePanel(false);
            showFile(null);
            get('comment').value = '';
            get('type').value = 'error';
            draft = null;
            forgetDraft();
            get('folio').textContent = receipt.folio;
            get('receipt').hidden = false;
            focus(get('dismiss'));
        } catch (error) {
            if (!current(revision)) return;
            if ([400,413,415].includes(error.status)) draft.pending = null;
            rememberDraft();
            say(error.status && error.status < 500 ? error.message :
                'No se confirmó el envío. Reintenta para recuperar el mismo folio. Tu borrador sigue aquí.',true);
        } finally {
            if (current(revision)) {
                sending = false;
                controls();
                if (panelOpen()) focus(get('send'));
            }
        }
    }
    function visible(on) {
        if (!initialized) return;
        const enabled = Boolean(on);
        const entry = get('report-entry');
        if (entry) entry.hidden = !enabled;
        if (enabled) {
            if (boundary().hidden || !controller) {
                epoch++;
                controller = new AbortController();
                boundary().hidden = false;
            }
            return;
        }
        epoch++;
        controller?.abort();
        controller = null;
        sending = false;
        closePanel(false);
        get('receipt').hidden = true;
        showFile(null);
        draft = null;
        forgetDraft();
        get('comment').value = get('folio').textContent = '';
        get('type').value = 'error';
        boundary().hidden = true;
    }
    function init() {
        if (initialized || !boundary()) return;
        initialized = true;
        for (const button of triggers()) button.addEventListener('click', e => openPanel(e.currentTarget));
        get('capture').addEventListener('click', () => addAttachment('screen'));
        get('attach').addEventListener('click', () => get('file').click());
        get('file').addEventListener('change', e => {
            const file = e.currentTarget.files[0];
            e.currentTarget.value = '';
            if (file) addAttachment('file',file);
        });
        get('remove').addEventListener('click', () => {
            showFile(null);
            say('Adjunto retirado.');
            focus(get('attach'));
        });
        get('form').addEventListener('submit', event => { event.preventDefault(); send(); });
        get('comment').addEventListener('input', rememberDraft);
        get('type').addEventListener('change', rememberDraft);
        for (const button of boundary().querySelectorAll('[data-pruebas-close]')) {
            button.addEventListener('click', () => {
                if (button === get('dismiss')) closeReceipt();
                else if (!sending) closePanel();
            });
        }
        window.addEventListener('keydown', e => {
            if (e.defaultPrevented || e.key !== 'Escape' || boundary().hidden) return;
            if (panelOpen() && !sending) { e.preventDefault(); closePanel(); }
            else if (!get('receipt').hidden) { e.preventDefault(); closeReceipt(); }
        });
        window.addEventListener('pagehide', () => { rememberDraft(); stopAttachment(); controls(); });
    }
    return { init, visible };
})();

function inicializarPruebas() { rhPruebas.init(); }
function mostrarNotaPrueba(visible) { rhPruebas.visible(visible); }
