/* ══════════════════════════════════════════════════════════════
   EL MOTOR, PARA PODER PROBARLO

   ⚠️  Este archivo NO tiene una copia del motor.

   La matemática está escrita en UN SOLO LUGAR: adentro de
   app/finanzas.html, entre los marcadores "EMPIEZA EL MOTOR" y
   "TERMINA EL MOTOR". Este archivo la va a buscar ahí y la deja
   lista para que las pruebas la usen.

   ¿Por qué así? Porque la app tiene que ser un solo archivo que se
   abre con doble clic, sin instalar nada. Eso obliga a que el motor
   viva adentro del HTML. Antes teníamos una segunda copia acá y
   había que acordarse de cambiar las dos; si te olvidabas de una,
   las pruebas probaban una cuenta y la app hacía otra.

   Ahora eso no puede pasar: las pruebas prueban, letra por letra,
   el mismo código que corre en la app.

   👉 Para cambiar la matemática, editá app/finanzas.html.
      Acá no hay nada que tocar, salvo agregar un nombre a la lista
      de abajo si creás una función nueva.
   ══════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'finanzas.html');
const INICIO = '/* ▼▼▼ EMPIEZA EL MOTOR ▼▼▼ */';
const FIN = '/* ▲▲▲ TERMINA EL MOTOR ▲▲▲ */';

/* Los nombres que el motor ofrece hacia afuera. Si agregás una función
   nueva al motor y querés probarla, sumá su nombre acá. */
const NOMBRES = [
  'aCentavos', 'sumar', 'repartir', 'formatear', 'formatearExacto',
  'parseFecha', 'formatFecha', 'diasEnMes', 'clampDia', 'sumarMeses',
  'diasAbsolutos', 'diasEntre', 'comparar', 'sumarDias', 'cicloId', 'hoyISO',
  'cicloDeFecha', 'cierreDeCiclo', 'vencimientoDeCiclo',
  'cuotasDeGasto', 'millasDe', 'financiacion',
  'resumenDeTarjeta', 'panelTarjetas',
  'mesesHasta', 'progresoDeMeta', 'panelAhorros',
  'mesDe', 'balanceMensual', 'filtrarGastos', 'mesesConGastos',
  'escapar', 'fechaCorta', 'MESES',
];

/* Saca el texto del motor de adentro del HTML. */
export function codigoDelMotor() {
  const html = readFileSync(APP, 'utf8');
  const desde = html.indexOf(INICIO);
  const hasta = html.indexOf(FIN);
  if (desde < 0 || hasta < 0 || hasta < desde) {
    throw new Error(
      'No encontré el motor adentro de app/finanzas.html.\n' +
      `Tienen que estar estas dos líneas, tal cual:\n  ${INICIO}\n  ${FIN}\n` +
      'Si las borraste sin querer, volvé a ponerlas alrededor de la matemática.',
    );
  }
  return html.slice(desde + INICIO.length, hasta);
}

/* Lo convierte en algo que las pruebas puedan usar. */
const codigo = `${codigoDelMotor()}\nexport { ${NOMBRES.join(', ')} };`;
const comoModulo = `data:text/javascript;base64,${Buffer.from(codigo, 'utf8').toString('base64')}`;

const motor = await import(comoModulo);

export const {
  aCentavos, sumar, repartir, formatear, formatearExacto,
  parseFecha, formatFecha, diasEnMes, clampDia, sumarMeses,
  diasAbsolutos, diasEntre, comparar, sumarDias, cicloId, hoyISO,
  cicloDeFecha, cierreDeCiclo, vencimientoDeCiclo,
  cuotasDeGasto, millasDe, financiacion,
  resumenDeTarjeta, panelTarjetas,
  mesesHasta, progresoDeMeta, panelAhorros,
  mesDe, balanceMensual, filtrarGastos, mesesConGastos,
  escapar, fechaCorta, MESES,
} = motor;
