/* ══════════════════════════════════════════════════════════════
   EL GUARDIÁN DE LA COPIA

   El motor está escrito dos veces: acá en motor/motor.js (donde
   viven las pruebas) y pegado adentro de app/finanzas.html (para
   que la app sea un solo archivo).

   El peligro es obvio: que alguien cambie uno y se olvide del otro.
   Ahí la app haría una cuenta y las pruebas probarían otra.

   Esta prueba compara los dos, función por función, y te dice
   exactamente cuál quedó distinta.
   ══════════════════════════════════════════════════════════════ */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aquí = dirname(fileURLToPath(import.meta.url));

/* Parte el código en pedazos: {nombre de la función → su texto}.
   Se apoya en que cada declaración de arriba de todo arranca en la
   columna 0, que es como está escrito el proyecto. */
function declaraciones(codigo) {
  const trozos = new Map();
  let actual = null;
  for (const linea of codigo.split('\n')) {
    const m = /^(?:function|const|let)\s+([A-Za-zÀ-ÿ_$][\w$]*)/.exec(linea);
    if (m) { actual = m[1]; trozos.set(actual, []); }
    else if (/^\S/.test(linea) && !/^[})\];]/.test(linea)) {
      // arrancó otra cosa de arriba de todo (un comentario, un export):
      // el trozo anterior terminó acá.
      actual = null;
    }
    if (actual) trozos.get(actual).push(linea);
  }
  return new Map([...trozos].map(([k, v]) => [k, v.join('\n').trimEnd()]));
}

const html = readFileSync(join(aquí, '..', 'app', 'finanzas.html'), 'utf8');
const modulo = readFileSync(join(aquí, 'motor.js'), 'utf8');

/* Del HTML nos quedamos con todo lo que hay dentro de los <script>. */
const codigoDelHtml = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

/* Del módulo sacamos el bloque de export, que en el HTML no existe. */
const codigoDelModulo = modulo.replace(/\nexport \{[\s\S]*?\};\s*$/, '\n');

const enHtml = declaraciones(codigoDelHtml);
const enModulo = declaraciones(codigoDelModulo);

/* Todo lo que el módulo define tiene que estar igual en el HTML. */
const DEL_MOTOR = [...enModulo.keys()];

test('el motor del módulo y el del HTML tienen las mismas funciones', () => {
  const faltan = DEL_MOTOR.filter((n) => !enHtml.has(n));
  assert.deepEqual(faltan, [],
    `Estas funciones están en motor/motor.js pero NO en app/finanzas.html: ${faltan.join(', ')}`);
});

for (const nombre of DEL_MOTOR) {
  test(`"${nombre}" está escrita igual en los dos lados`, () => {
    assert.equal(
      enHtml.get(nombre), enModulo.get(nombre),
      `\n\n  ⚠️  "${nombre}" quedó DISTINTA entre app/finanzas.html y motor/motor.js.` +
      `\n      Si cambiaste la matemática, hay que cambiarla en LOS DOS archivos.\n`,
    );
  });
}

test('el motor no toca la pantalla: nada de document ni window', () => {
  assert.ok(!/\b(document|window|localStorage)\b/.test(codigoDelModulo),
    'el motor tiene que ser matemática pura, sin nada de la pantalla');
});

test('el motor no arma fechas del negocio con objetos Date', () => {
  /* Dos usos de Date SÍ están permitidos:
       new Date()            → "¿qué hora es?", el único punto de entrada del reloj
       new Date(Date.UTC(…)) → cuenta pura en UTC, no se corre por zona horaria
     El prohibido es new Date('2026-03-09'): ese sí se corre un día según dónde
     estés parada, y el gasto termina cayendo en el resumen equivocado. */
  const sospechosas = codigoDelModulo.match(/new Date\(\s*(?!\)|Date\.UTC)[^\n]{0,40}/g) || [];
  assert.deepEqual(sospechosas, [],
    `Estas líneas arman una fecha con Date y se pueden correr un día:\n  ${sospechosas.join('\n  ')}`);
});
