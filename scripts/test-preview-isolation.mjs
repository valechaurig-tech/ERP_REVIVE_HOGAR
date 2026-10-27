import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const code = readFileSync(fileURLToPath(new URL('../js/config.js', import.meta.url)), 'utf8');
const run = host => {
  const context = vm.createContext({ window: { location: { hostname: host } }, Set });
  vm.runInContext(code, context);
  return context.window.RH_CONFIG;
};
const prod = run('revive-hogar.vercel.app');
assert.ok(prod.SUPABASE_URL.length > 0);
assert.ok(prod.SUPABASE_ANON_KEY.length > 0);
assert.equal(prod.ISOLATED_PREVIEW, undefined);
const alias = run('revive-hogar-echauri-apps.vercel.app');
assert.ok(alias.SUPABASE_URL.length > 0);
const p = run('revive-hogar-623kufeiz-echauri-apps.vercel.app');
assert.equal(p.ISOLATED_PREVIEW, true);
assert.equal(p.SUPABASE_URL, '');
assert.equal(p.SUPABASE_ANON_KEY, '');
const branch = run('revive-hogar-git-work-recovery-vercel-2026-10-27-echauri-apps.vercel.app');
assert.equal(branch.ISOLATED_PREVIEW, true);
assert.equal(branch.SUPABASE_URL, '');
console.log('PASS: producción conserva nube y preview usa datos aislados');
