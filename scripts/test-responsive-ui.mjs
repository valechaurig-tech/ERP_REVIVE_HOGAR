#!/usr/bin/env node
/** Comprobación estática no destructiva del rediseño móvil. */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const html=read('index.html'),css=read('css/responsive-redesign.css'),script=read('js/mobile-ui.js');
for(const path of ['css/responsive-redesign.css','js/mobile-ui.js']){
  assert(existsSync(new URL('../'+path,import.meta.url)),path+' no existe');
  assert(html.includes('src="'+path+'"')||html.includes('href="'+path+'"'),'HTML no incluye '+path);
}
for(const id of ['app-screen','sidebar','mod-dashboard','mod-compradores','mod-operaciones','mod-pipeline','mod-gastos','mod-referidos','mod-usuarios']){
  assert(html.includes('id="'+id+'"'),'Falta módulo original: '+id);
}
assert(html.includes('name="viewport"') && html.includes('width=device-width'),'Falta viewport');
assert(css.includes('@media (max-width:900px)'),'Falta breakpoint para drawer');
assert(css.includes('@media (max-width:640px)'),'Falta breakpoint para tarjetas');
assert(css.includes('body > .modal'),'Falta adaptar ventanas externas');
assert(css.includes('prefers-reduced-motion'),'Falta reducción de movimiento');
for(const token of ['aria-expanded','aria-controls','Escape','MutationObserver','data-rh-label','rh-mobile-menu-button','rh-drawer-backdrop']){
  assert(script.includes(token),'Falta comportamiento '+token);
}
assert(!/\bDB\.(set|delete|save|upsert)\s*\(/.test(script),'El adaptador de UI no debe escribir datos');
assert(!/transform:\s*scale\(/.test(css),'No reducir pantalla con zoom artificial');
execFileSync(process.execPath,['--check',new URL('../js/mobile-ui.js',import.meta.url).pathname],{stdio:'inherit'});
console.log('PASS: estructura, navegación accesible, activos, responsive y aislamiento de datos.');
