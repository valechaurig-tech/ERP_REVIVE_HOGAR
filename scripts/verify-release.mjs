#!/usr/bin/env node
/**
 * Revive Hogar — puerta de liberación.
 * Comprobaciones estáticas sin conexión y SIN tocar datos reales.
 * Ejecutar: node scripts/verify-release.mjs
 * Nunca considerar esta prueba equivalente a QA funcional ni respaldo.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const problems = [];
let passed = 0;
const exists = p => existsSync(resolve(root, p));
const read = p => readFileSync(resolve(root, p), 'utf8');
const check = (ok, code, detail) => {
  if (ok) passed++;
  else problems.push({ code, detail });
};
const mandatory = [
  'index.html', 'css/app.css', 'vercel.json',
  'js/app.js', 'js/auth.js', 'js/db.js', 'js/archivos.js',
  'js/expediente.js', 'js/gastos.js', 'js/gastos-empresa.js',
  'js/configuracion.js', 'js/referidos.js', 'js/recorrido.js',
  'api/archivos.js', 'api/ia.js', 'scripts/setup-storage.js'
];
for (const p of mandatory) {
  check(exists(p), 'REV-REL-001', `Falta archivo indispensable: ${p}`);
}

if (exists('index.html')) {
  const html = read('index.html');
  const refs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map(x => x[1].split('?')[0])
    .filter(x => !/^https?:\/\//i.test(x) && !x.startsWith('//'));
  for (const p of refs) check(exists(p), 'REV-REL-002', `Script referenciado ausente: ${p}`);
}

if (exists('js/db.js')) {
  const source = read('js/db.js');
  for (const col of ['presupuestos', 'archivos', 'configuracion', 'gastosEmpresa', 'presupuestoEmpresa', 'cuentasBancarias']) {
    check(source.includes(`'${col}'`), 'REV-REL-003', `Colección avanzada no declarada: ${col}`);
  }
}

for (let n = 1; n <= 18; n++) {
  const p = `demo-visita/${String(n).padStart(2, '0')}.jpg`;
  check(exists(p), 'REV-REL-004', `Fotografía del recorrido ausente: ${p}`);
  if (!exists(p)) continue;
  const b = readFileSync(resolve(root,p));
  check(b.length > 100 && b[0] === 0xff && b[1] === 0xd8 && b.at(-2) === 0xff && b.at(-1) === 0xd9,
    'REV-REL-005', `JPEG incompleto: ${p}`);
}

function jsFiles(dir) {
  if (!exists(dir)) return [];
  return readdirSync(resolve(root, dir)).flatMap(name => {
    const relative = dir + '/' + name;
    const st = statSync(resolve(root, relative));
    if (st.isDirectory()) return jsFiles(relative);
    return ['.js', '.mjs'].includes(extname(relative)) ? [relative] : [];
  });
}
for (const p of [...jsFiles('js'), ...jsFiles('api'), ...jsFiles('scripts')]) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, p)], { encoding: 'utf8' });
  check(result.status === 0, 'REV-REL-006', `Error sintáctico ${p}: ${(result.stderr||'').slice(0,350)}`);
}

if (exists('supabase/schema.sql')) {
  const sql = read('supabase/schema.sql');
  check(!/create\s+policy\s+["']?rh_anon_all["']?/i.test(sql),
    'REV-SEC-001', 'El SQL contiene una política rh_anon_all permisiva: diseñar migración y verificar RLS antes de liberar');
}

if (exists('js/config.js')) {
  const config = read('js/config.js');
  check(!/PASSWORD_INICIAL\s*:\s*['"]1234['"]/i.test(config),
    'REV-SEC-002', 'Configuración aún declara contraseña inicial de demostración; migrar autenticación con respaldo');
}

console.log(JSON.stringify({ scope: 'static-read-only', passed, blockers: problems }, null, 2));
process.exitCode = problems.length ? 1 : 0;
