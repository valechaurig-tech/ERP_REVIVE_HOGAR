/**
 * Revive Hogar | Navegación móvil y tablas adaptativas.
 * No escribe información, no altera permisos, estados comerciales ni colecciones.
 * Puede convivir con el ERP sin modificar sus controladores.
 */
(() => {
    'use strict';

    function iniciarUIResponsive() {
    const MOBILE_QUERY = '(max-width: 900px)';
    const app = document.getElementById('app-screen');
    const topbar = app?.querySelector('.topbar-left');
    const sidebar = app?.querySelector('#sidebar');
    const content = app?.querySelector('.content-area');
    if (!app || !topbar || !sidebar || !content) return;

    const mq = window.matchMedia(MOBILE_QUERY);
    const menu = document.createElement('button');
    menu.id = 'rh-mobile-menu';
    menu.type = 'button';
    menu.className = 'rh-mobile-menu-button';
    menu.setAttribute('aria-label', 'Abrir menú de módulos');
    menu.setAttribute('aria-controls', 'sidebar');
    menu.setAttribute('aria-expanded', 'false');
    menu.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

    const title = document.createElement('span');
    title.id = 'rh-mobile-title';
    title.className = 'rh-mobile-title';
    title.textContent = 'Revive Hogar';
    topbar.prepend(title);
    topbar.prepend(menu);

    const backdrop = document.createElement('button');
    backdrop.id = 'rh-drawer-backdrop';
    backdrop.type = 'button';
    backdrop.className = 'rh-drawer-backdrop';
    backdrop.setAttribute('aria-label', 'Cerrar menú');
    backdrop.tabIndex = -1;
    app.appendChild(backdrop);

    // Botón independiente: buildSidebar() reescribe el contenido de #sidebar al entrar.
    function attachClose() {
        if (sidebar.querySelector('.rh-drawer-close')) return;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'rh-drawer-close';
        close.setAttribute('aria-label', 'Cerrar menú de módulos');
        close.textContent = '×';
        close.addEventListener('click', () => setMenu(false));
        sidebar.prepend(close);
    }

    let focusBeforeOpen = null;
    function setMenu(open) {
        const visible = !!open && mq.matches;
        if (visible && app.style.display === 'none') return;
        if (visible) {
            attachClose();
            focusBeforeOpen = document.activeElement;
        }
        app.classList.toggle('rh-menu-open', visible);
        menu.setAttribute('aria-expanded', String(visible));
        menu.setAttribute('aria-label', visible ? 'Cerrar menú de módulos' : 'Abrir menú de módulos');
        if (visible) sidebar.querySelector('.rh-drawer-close')?.focus({preventScroll:true});
        else if (open === false && focusBeforeOpen instanceof HTMLElement && document.activeElement?.closest('#sidebar')) {
            focusBeforeOpen.focus({preventScroll:true});
        }
    }

    menu.addEventListener('click', () => setMenu(!app.classList.contains('rh-menu-open')));
    backdrop.addEventListener('click', () => setMenu(false));
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item[data-module-id]')) setMenu(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && app.classList.contains('rh-menu-open')) setMenu(false);
        if (e.key === 'Tab' && app.classList.contains('rh-menu-open')) {
            const candidates = [...sidebar.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')]
                .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
            if (!candidates.length) return;
            const first = candidates[0], last = candidates[candidates.length-1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
    mq.addEventListener?.('change', () => setMenu(false));

    function updateTitle() {
        const active = content.querySelector('.module.active');
        if (!active) return;
        const label = active.querySelector('.module-toolbar h3, .module-header h3, h3')?.textContent?.trim();
        if (label) title.textContent = label;
    }

    // Solo tablas planas de pocos campos. Las financieras y jerárquicas mantienen
    // su cuadrícula original con scroll horizontal interno, sin perder columnas.
    const nonCardModules = new Set(['mod-gastos','mod-gastos-empresa','mod-referidos','mod-auditoria','mod-configuracion']);
    function isSimpleTable(table) {
        if (nonCardModules.has(table.closest('.module')?.id)) return false;
        const headings = [...table.querySelectorAll('thead tr:first-child th')];
        if (headings.length < 2 || headings.length > 7) return false;
        if (table.querySelector('thead tr:nth-child(2), th[rowspan], th[colspan], td[rowspan], tbody table')) return false;
        return true;
    }
    function enhanceTables() {
        for (const table of content.querySelectorAll('.table-responsive table')) {
            const wrap = table.closest('.table-responsive');
            if (!wrap) continue;
            const simple = isSimpleTable(table);
            wrap.classList.toggle('rh-mobile-table-cards', simple);
            if (!simple) continue;
            const headers = [...table.querySelectorAll('thead tr:first-child th')]
                .map(h => h.textContent.trim().replace(/\s+/g,' ').slice(0,65));
            for (const row of table.tBodies) {
                for (const tr of row.rows) {
                    if (tr.cells.length !== headers.length) continue;
                    [...tr.cells].forEach((td,i) => {
                        if (td.getAttribute('data-rh-label') !== headers[i]) td.setAttribute('data-rh-label', headers[i]);
                    });
                }
            }
        }
    }
    let scheduled = false;
    function scheduleEnhance() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            updateTitle();
            enhanceTables();
            // En cada login buildSidebar reemplaza su HTML; reinsertar cierre
            // solo cuando el drawer esté abierto y exista una navegación.
            if (app.classList.contains('rh-menu-open')) attachClose();
        });
    }

    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(content, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
    const sidebarObserver = new MutationObserver(() => {
        if (app.classList.contains('rh-menu-open')) attachClose();
    });
    sidebarObserver.observe(sidebar, {childList:true});
    scheduleEnhance();

    window.addEventListener('pagehide', () => {
        observer.disconnect();
        sidebarObserver.disconnect();
    }, {once:true});
    }
    // js/app.js inicializa la marca en DOMContentLoaded y reemplaza
    // #topbar-brand.innerHTML: insertar el menú DESPUÉS de esa inicialización.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarUIResponsive, {once:true});
    } else iniciarUIResponsive();
})();
