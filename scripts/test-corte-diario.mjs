import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/gastos-empresa.js',import.meta.url),'utf8');
const cuentas=[
 {id:'c1',banco:'Banco',alias:'Cuenta origen',saldo:100},
 {id:'c2',banco:'Efectivo',alias:'Caja',saldo:200}
];
const movimientos=[
 {id:'m0',cuentaId:'c1',tipo:'ingreso',fecha:'2026-11-20',monto:50,concepto:'Ingreso previo'},
 {id:'m1',cuentaId:'c1',tipo:'gasto',fecha:'2026-11-21',monto:20,concepto:'Egreso hoy'},
 {id:'m2',cuentaId:null,tipo:'gasto',fecha:'2026-11-21',monto:6,concepto:'Sin cuenta histórico'}
];
const traspasos=[
 {id:'t1',cuenta_origen_id:'c1',cuenta_destino_id:'c2',fecha:'2026-11-21',monto:10,concepto:'Traspaso'}
];
function calcular(aperturas){
 const context={
  DB:{get:key=>key==='cuentasBancarias'?cuentas:key==='gastosEmpresa'?movimientos:[]},
  console,
  formatearMoneda:n=>'$'+Number(n).toFixed(2),
  escapeHtml:x=>String(x).replace(/[<>]/g,''),
  rhEsDireccion:()=>true,currentUser:{rol:'Direccion'},
  window:{},document:{}
 };
 vm.createContext(context);
 vm.runInContext(source,context,{timeout:2500});
 vm.runInContext('empresaCorteDatos = '+JSON.stringify({transferencias:traspasos,aperturas})+';',context);
 return JSON.parse(vm.runInContext("JSON.stringify(calcularCorteDiarioEmpresa('2026-11-21'))",context));
}
test('saldo inicial confirmado avanza desde el día de apertura al siguiente',()=>{
 const r=calcular([
  {cuenta_id:'c1',fecha_corte:'2026-11-20',saldo_inicial:100,estado:'confirmado'},
  {cuenta_id:'c2',fecha_corte:'2026-11-20',saldo_inicial:200,estado:'confirmado'}
 ]);
 const a=r.filas.find(x=>x.cuenta.id==='c1'),b=r.filas.find(x=>x.cuenta.id==='c2');
 assert.equal(a.inicio,150);assert.equal(a.cierre,120);
 assert.equal(b.inicio,200);assert.equal(b.cierre,210);
 assert.equal(r.apertura,350);assert.equal(r.cierre,330);
 assert.equal(r.recibidos,10);assert.equal(r.enviados,10);
 assert.equal(r.ingresos,0);assert.equal(r.egresos,20);
});
test('sin conciliación nunca declara cero como apertura real',()=>{
 const r=calcular([]);
 assert.equal(r.confirmado,false);
 assert.equal(r.apertura,null);assert.equal(r.cierre,null);
 assert.equal(r.filas.every(x=>x.inicio===null&&x.cierre===null),true);
});
test('históricos sin cuenta se muestran para conciliación, no se asignan',()=>{
 const r=calcular([]);
 assert.equal(r.sinCuenta.length,1);
 assert.equal(r.sinCuenta[0].monto,6);
 assert.equal(r.egresos,20);
});
test('con una sola cuenta pendiente tampoco declara el total como conciliado',()=>{
 const r=calcular([{cuenta_id:'c1',fecha_corte:'2026-11-20',saldo_inicial:100,estado:'confirmado'}]);
 assert.equal(r.confirmado,false);
 assert.equal(r.apertura,null);
 assert.equal(r.filas.find(x=>x.cuenta.id==='c2').cierre,null);
});
