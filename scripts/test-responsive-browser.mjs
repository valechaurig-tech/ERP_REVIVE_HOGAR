#!/usr/bin/env node
/* Smoke visual sin credenciales, datos reales ni servicios externos. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const server = spawn('python3',['-m','http.server','8123','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8123';
mkdirSync('artifacts',{recursive:true});

async function waitServer(){
    for(let i=0;i<40;i++){
        try{ const response=await fetch(base);if(response.ok)return; }catch {}
        await new Promise(r=>setTimeout(r,150));
    }
    throw Error('El servidor estático no inició');
}
let browser;
try {
    await waitServer();
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const width of [320,390,768,1024]){
        const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
        page.on('dialog',d=>d.dismiss());
        // Únicamente contenido local de la rama. No consultar ni escribir en Supabase.
        await page.route('**/*', route => {
            const u=route.request().url();
            if(u.startsWith(base+'/')||u===base)route.continue();
            else route.abort();
        });
        await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
        await page.waitForSelector('#rh-mobile-menu',{state:'attached'});
        await page.evaluate(() => {
            document.getElementById('login-screen').style.display='none';
            const app=document.getElementById('app-screen');
            app.style.display='flex';
            const planner=document.getElementById('mod-planner');
            planner.classList.add('active');
            const nav=document.getElementById('sidebar');
            if(!nav.querySelector('.nav-item')) nav.insertAdjacentHTML('beforeend',
                '<button type="button" class="nav-item" data-module-id="mod-planner">Alertas</button>');
            const table=document.getElementById('table-planner');
            table.tBodies[0].innerHTML='<tr><td>Alerta</td><td>Seguimiento</td><td>29/oct</td><td>Pendiente</td><td><button>Ver</button></td></tr>';
        });
        await page.waitForTimeout(250);
        const state=await page.evaluate(() => {
            const app=document.getElementById('app-screen');
            const sidebar=document.getElementById('sidebar');
            const card=document.getElementById('table-planner').closest('.table-responsive');
            return {
              width:document.documentElement.scrollWidth,
              sidebar:getComputedStyle(sidebar).visibility,
              mobileMenu:getComputedStyle(document.getElementById('rh-mobile-menu')).display,
              isCard:card.classList.contains('rh-mobile-table-cards'),
              tdLabel:document.querySelector('#table-planner tbody td')?.getAttribute('data-rh-label'),
              contentWidth:app.querySelector('.content-area').clientWidth
            };
        });
        assert(state.contentWidth>0,'Área principal sin ancho: '+width);
        assert(state.width<=width+2,'Desbordamiento de página a '+width+'px: '+state.width);
        assert(state.isCard && state.tdLabel,'Tabla simple no preparada en '+width);
        if(width<=900){
           assert.equal(state.sidebar,'hidden','Drawer debe estar cerrado por defecto');
           assert.notEqual(state.mobileMenu,'none','Falta botón de menú');
           await page.locator('#rh-mobile-menu').click();
           assert(await page.locator('#app-screen.rh-menu-open').count(),'Drawer no abrió');
           await page.keyboard.press('Escape');
           assert.equal(await page.locator('#app-screen.rh-menu-open').count(),0,'Escape no cerró drawer');
           await page.locator('#rh-mobile-menu').click();
           await page.locator('#rh-drawer-backdrop').click({position:{x:width-6,y:250}});
           assert.equal(await page.locator('#app-screen.rh-menu-open').count(),0,'Backdrop no cerró drawer');
        }else{
           assert.equal(state.mobileMenu,'none','No mostrar hamburguesa en escritorio');
        }
        await page.screenshot({path:'artifacts/revive-hogar-'+width+'.png',fullPage:true});
        console.log('PASS UI',width,state);
        await page.close();
    }
} finally {
    await browser?.close();
    server.kill('SIGTERM');
}
