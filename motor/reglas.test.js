/* ══════════════════════════════════════════════════════════════
   LAS REGLAS DEL MOTOR

   Antes acá vivía un guardián que comparaba las dos copias del
   motor. Ya no hay dos copias, así que ese trabajo desapareció.

   Lo que sigue haciendo falta es vigilar que el motor se mantenga
   siendo lo que tiene que ser: matemática pura, sin pantalla, con
   la plata en centavos y las fechas en texto.

   Estas pruebas leen el motor DE LA APP (app/finanzas.html) y
   revisan justamente eso.
   ══════════════════════════════════════════════════════════════ */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { codigoDelMotor } from './motor.js';
import * as motor from './motor.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(aquí, '..', 'app', 'finanzas.html'), 'utf8');
const codigo = codigoDelMotor();

/* ────────────────────────────────────────────────────────────
   QUE EL MOTOR SE PUEDA ENCONTRAR
   ──────────────────────────────────────────────────────────── */
describe('El motor se encuentra adentro de la app', () => {
  test('los dos marcadores están puestos, una sola vez cada uno', () => {
    assert.equal((html.match(/▼▼▼ EMPIEZA EL MOTOR ▼▼▼/g) || []).length, 1);
    assert.equal((html.match(/▲▲▲ TERMINA EL MOTOR ▲▲▲/g) || []).length, 1);
  });

  test('lo que hay entre los marcadores es el motor de verdad', () => {
    assert.ok(codigo.includes('function cicloDeFecha'), 'falta la regla del ciclo');
    assert.ok(codigo.includes('function repartir'), 'falta el reparto de cuotas');
    assert.ok(codigo.includes('function balanceMensual'), 'falta el balance del mes');
    assert.ok(codigo.length > 5000, 'el motor salió sospechosamente corto');
  });

  test('hay UNA sola copia del motor: no quedó otra suelta por ahí', () => {
    // Si alguien vuelve a pegar el motor en otro lado, esto lo caza.
    assert.equal((html.match(/function cicloDeFecha\(/g) || []).length, 1);
    assert.equal((html.match(/function balanceMensual\(/g) || []).length, 1);
  });

  test('todas las funciones que las pruebas piden existen de verdad', () => {
    const faltan = Object.keys(motor)
      .filter((n) => n !== 'codigoDelMotor' && motor[n] === undefined);
    assert.deepEqual(faltan, [],
      `Estos nombres están en la lista de motor/motor.js pero no existen en el motor: ${faltan.join(', ')}`);
  });
});

/* ────────────────────────────────────────────────────────────
   QUE SIGA SIENDO MATEMÁTICA PURA
   ──────────────────────────────────────────────────────────── */
describe('El motor es matemática pura', () => {
  test('no toca la pantalla ni lo guardado: nada de document, window ni localStorage', () => {
    const prohibidas = codigo.match(/\b(document|window|localStorage|sessionStorage|alert)\b/g) || [];
    assert.deepEqual([...new Set(prohibidas)], [],
      'el motor tiene que poder correr sin navegador; sacá eso del bloque del motor');
  });

  test('no habla con internet', () => {
    const prohibidas = codigo.match(/\b(fetch|XMLHttpRequest|WebSocket)\b/g) || [];
    assert.deepEqual([...new Set(prohibidas)], []);
  });

  test('anda igual sin navegador (de hecho, así corren estas pruebas)', () => {
    assert.equal(typeof globalThis.document, 'undefined');
    assert.deepEqual(motor.cicloDeFecha('2026-03-26', 25), { y: 2026, m: 4 });
  });
});

/* ────────────────────────────────────────────────────────────
   LAS DOS REGLAS QUE NO SE NEGOCIAN
   ──────────────────────────────────────────────────────────── */
describe('Las dos reglas que no se negocian', () => {
  test('no arma fechas del negocio con objetos Date', () => {
    /* Dos usos de Date SÍ están permitidos:
         new Date()            → "¿qué día es hoy?", el único punto de entrada del reloj
         new Date(Date.UTC(…)) → cuenta pura en UTC, no se corre por zona horaria
       El prohibido es new Date('2026-03-09'): ese sí se corre un día según dónde
       estés parada, y el gasto termina cayendo en el resumen equivocado. */
    const sospechosas = codigo.match(/new Date\(\s*(?!\)|Date\.UTC)[^\n]{0,40}/g) || [];
    assert.deepEqual(sospechosas, [],
      `Estas líneas arman una fecha con Date y se pueden correr un día:\n  ${sospechosas.join('\n  ')}`);
  });

  test('la plata se mueve en centavos enteros', () => {
    // Un recorrido de punta a punta: si en algún lado se colara un decimal,
    // alguno de estos montos dejaría de ser un número entero.
    const t = { id: 't1', nombre: 'T', diaCierre: 25, diaVencimiento: 10, limiteCentavos: 100000, millasPorMil: 1 };
    const g = { id: 'g1', descripcion: 'x', montoCentavos: 10000, fecha: '2026-03-10', tarjetaId: 't1', cuotas: 7 };
    const r = motor.resumenDeTarjeta(t, [g], '2026-03-20');
    for (const c of r.ciclos) {
      assert.ok(Number.isInteger(c.totalCentavos), `${c.cicloId} tiene centavos partidos: ${c.totalCentavos}`);
      for (const i of c.items) assert.ok(Number.isInteger(i.montoCentavos));
    }
    assert.equal(motor.sumar(r.ciclos.map((c) => c.totalCentavos)), 10000);
  });
});
