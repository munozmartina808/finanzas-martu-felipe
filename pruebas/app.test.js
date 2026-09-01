/* ══════════════════════════════════════════════════════════════
   PRUEBAS DE LA APP DE VERDAD

   Estas pruebas abren app/finanzas.html en un navegador real,
   tocan los botones como los tocarías vos, y revisan que la
   pantalla muestre lo correcto.

   Las de motor/ prueban las CUENTAS. Éstas prueban los BOTONES.

   Cómo correrlas:
       cd pruebas
       npm install          (una sola vez)
       npm test
   ══════════════════════════════════════════════════════════════ */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const APP = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'finanzas.html'),
).href;

/* En algunas máquinas hay que decirle dónde está el navegador.
   Se hace con:  CHROMIUM_PATH=/ruta/al/chrome npm test          */
const navegador = process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH }
  : {};

let browser, page, erroresJs;

before(async () => { browser = await chromium.launch(navegador); });
after(async () => { await browser?.close(); });

/* Cada prueba arranca con la app recién abierta y vacía. */
beforeEach(async () => {
  const contexto = await browser.newContext();
  page = await contexto.newPage();
  erroresJs = [];
  page.on('pageerror', (e) => erroresJs.push(e.message));
  page.on('dialog', (d) => d.accept());        // aceptar los "¿estás segura?"
  await page.goto(APP);
  /* Esperamos a que las 4 tarjetas estén cargadas. Van con 'attached' y no
     'visible' porque al abrir la app la pestaña Tarjetas está escondida:
     existen en la página, pero todavía no se ven. */
  await page.waitForSelector('.tarjeta-banco', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.tarjeta-banco').length === 4);
});

const irA = async (tab) => {
  await page.locator(`.pestana[data-tab="${tab}"]`).click();
  await page.waitForTimeout(150);
};

async function cargarGasto({ desc, monto, fecha, categoria, persona, cuotas }) {
  await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
  await page.waitForSelector('#dlg-gasto[open]');
  await page.fill('#g-desc', desc);
  await page.fill('#g-monto', String(monto));
  await page.fill('#g-fecha', fecha);
  if (categoria) await page.selectOption('#g-categoria', categoria);
  if (persona) await page.selectOption('#g-persona', persona);
  if (cuotas) await page.selectOption('#g-cuotas', String(cuotas));
  await page.locator('#form-gasto button[type="submit"]').click();
  await page.waitForTimeout(250);
}

const resumenGastos = () => page.locator('#panel-gastos .eyebrow').first().textContent();

/* ────────────────────────────────────────────────────────────
   ARRANQUE
   ──────────────────────────────────────────────────────────── */
describe('La app arranca bien', () => {
  test('abre sola desde el archivo, sin errores de JavaScript', async () => {
    assert.equal(await page.title(), 'Finanzas');
    assert.deepEqual(erroresJs, []);
  });

  test('están las 4 pestañas', async () => {
    assert.deepEqual(await page.locator('.pestana').allTextContents(),
      ['Inicio', 'Tarjetas', 'Gastos', 'Ahorros']);
  });

  test('las 4 tarjetas aparecen en el orden correcto', async () => {
    await irA('tarjetas');
    const bancos = await page.locator('.tb-banco').allTextContents();
    const tiers = await page.locator('.tb-tier').allTextContents();
    const nombres = bancos.map((b, i) => `${b} ${tiers[i] || ''}`.trim());
    assert.deepEqual(nombres, [
      'BBVA BLACK VISA',
      'BBVA BLACK MASTERCARD',
      'GALICIA GOLD VISA',
      'GALICIA GOLD AMEX',
    ]);
  });

  test('las BLACK son negras y las GOLD doradas', async () => {
    await irA('tarjetas');
    const temas = await page.locator('.tarjeta-banco').evaluateAll(
      (els) => els.map((e) => (e.classList.contains('dorada') ? 'dorada' : 'negra')));
    assert.deepEqual(temas, ['negra', 'negra', 'dorada', 'dorada']);
  });

  test('sin gastos cargados lo dice, no queda en blanco', async () => {
    await irA('gastos');
    assert.match(await page.locator('#panel-gastos .vacio').textContent(), /Sin gastos/);
  });
});

/* ────────────────────────────────────────────────────────────
   CARGAR UN GASTO — que la regla del ciclo se vea en pantalla
   ──────────────────────────────────────────────────────────── */
describe('Cargar un gasto', () => {
  test('avisa en qué resumen va a caer ANTES de guardarlo', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.fill('#g-fecha', '2026-09-20');            // ANTES del cierre (25)
    await page.waitForTimeout(150);
    assert.match(await page.locator('#pista-ciclo').textContent(), /sep 2026/);
  });

  test('un gasto DESPUÉS del cierre cae en el resumen del mes siguiente', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.fill('#g-fecha', '2026-09-26');            // DESPUÉS del cierre (25)
    await page.waitForTimeout(150);
    assert.match(await page.locator('#pista-ciclo').textContent(), /oct 2026/);
  });

  test('el gasto aparece en la lista después de guardarlo', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Verdulería', monto: 15000, fecha: '2026-09-05', categoria: 'Comida', persona: 'Martu' });
    const fila = await page.locator('#panel-gastos .lista li').first().innerText();
    assert.match(fila, /Verdulería/);
    assert.match(fila, /15\.000/);
    assert.match(fila, /Comida/);
  });

  test('en cuotas, avisa cuántas y las reparte', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Zapatillas', monto: 90000, fecha: '2026-09-05', cuotas: 3, categoria: 'Ropa', persona: 'Martu' });
    assert.match(await page.locator('#panel-gastos .lista li').first().innerText(), /3 cuotas/);

    await irA('tarjetas');
    const saldos = await page.locator('.tb-plata').allTextContents();
    assert.match(saldos[0], /30\.000/);        // 90.000 en 3 = 30.000 por resumen
  });

  test('el saldo de la tarjeta sube cuando cargás un gasto', async () => {
    await irA('tarjetas');
    assert.match((await page.locator('.tb-plata').first().textContent()), /0/);
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 50000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('tarjetas');
    assert.match((await page.locator('.tb-plata').first().textContent()), /50\.000/);
  });
});

/* ────────────────────────────────────────────────────────────
   FILTRAR LOS GASTOS
   ──────────────────────────────────────────────────────────── */
describe('Buscar entre los gastos', () => {
  beforeEach(async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Verdulería', monto: 15000, fecha: '2026-08-05', categoria: 'Comida', persona: 'Martu' });
    await cargarGasto({ desc: 'Sushi', monto: 40000, fecha: '2026-08-20', categoria: 'Pedidos', persona: 'Felipe' });
    await cargarGasto({ desc: 'Coto', monto: 90000, fecha: '2026-09-01', categoria: 'Supermercado', persona: 'Martu' });
    await cargarGasto({ desc: 'Cine', monto: 20000, fecha: '2026-09-01', categoria: 'Salidas', persona: 'Felipe' });
  });

  test('sin filtros muestra todos, con el total', async () => {
    assert.match(await resumenGastos(), /4 gastos · \$\s165\.000/);
  });

  test('filtra por mes', async () => {
    await page.selectOption('#filtro-mes', '2026-08');
    await page.waitForTimeout(200);
    assert.match(await resumenGastos(), /2 gastos de 4 · \$\s55\.000/);
  });

  test('filtra por persona', async () => {
    await page.selectOption('#filtro-persona', 'Martu');
    await page.waitForTimeout(200);
    assert.match(await resumenGastos(), /2 gastos de 4 · \$\s105\.000/);
  });

  test('filtra por categoría', async () => {
    await page.selectOption('#filtro-categoria', 'Comida');
    await page.waitForTimeout(200);
    assert.match(await resumenGastos(), /1 gasto de 4 · \$\s15\.000/);
  });

  test('los filtros se combinan', async () => {
    await page.selectOption('#filtro-persona', 'Martu');
    await page.waitForTimeout(200);
    await page.selectOption('#filtro-categoria', 'Comida');
    await page.waitForTimeout(200);
    assert.match(await resumenGastos(), /1 gasto de 4 · \$\s15\.000/);
  });

  test('si no hay nada que coincida, lo dice con palabras', async () => {
    await page.selectOption('#filtro-persona', 'Martu');
    await page.waitForTimeout(200);
    await page.selectOption('#filtro-categoria', 'Salidas');
    await page.waitForTimeout(200);
    assert.match(await page.locator('#panel-gastos .vacio').textContent(), /Ningún gasto coincide/);
  });

  test('el botón "Ver todos los gastos" limpia los filtros', async () => {
    await page.selectOption('#filtro-mes', '2026-08');
    await page.waitForTimeout(200);
    await page.locator('[data-accion="limpiar-filtros"]').click();
    await page.waitForTimeout(200);
    assert.match(await resumenGastos(), /4 gastos · \$\s165\.000/);
    assert.equal(await page.locator('[data-accion="limpiar-filtros"]').count(), 0);
  });

  test('el desplegable de meses sólo ofrece meses que tienen gastos', async () => {
    const meses = await page.locator('#filtro-mes option').allTextContents();
    assert.deepEqual(meses, ['Todos los meses', 'sep 2026', 'ago 2026']);
  });

  test('los filtros no se pierden al volver de otra pestaña', async () => {
    await page.selectOption('#filtro-mes', '2026-08');
    await page.waitForTimeout(200);
    await irA('inicio');
    await irA('gastos');
    assert.equal(await page.inputValue('#filtro-mes'), '2026-08');
    assert.match(await resumenGastos(), /2 gastos de 4/);
  });
});

/* ────────────────────────────────────────────────────────────
   AHORROS — arreglar un aporte ya cargado
   ──────────────────────────────────────────────────────────── */
describe('Metas de ahorro', () => {
  const ahorrado = () => page.locator('#panel-ahorros .cifra-l').first().textContent();

  beforeEach(async () => {
    await irA('ahorros');
    await page.locator('[data-accion="nueva-meta"]').click();
    await page.waitForSelector('#dlg-meta[open]');
    await page.fill('#m-nombre', 'Vacaciones');
    await page.fill('#m-objetivo', '1000000');
    await page.locator('#form-meta button[type="submit"]').click();
    await page.waitForTimeout(300);
  });

  const cargarAporte = async (monto, fecha, quien) => {
    await page.locator('[data-accion="nuevo-aporte"]').first().click();
    await page.waitForSelector('#dlg-aporte[open]');
    await page.fill('#a-monto', String(monto));
    await page.fill('#a-fecha', fecha);
    await page.selectOption('#a-persona', quien);
    await page.locator('#form-aporte button[type="submit"]').click();
    await page.waitForTimeout(300);
  };

  test('registrar un aporte suma al total de la meta', async () => {
    await cargarAporte(50000, '2026-08-10', 'Martu');
    assert.match(await ahorrado(), /50\.000/);
  });

  test('EDITAR un aporte: el formulario viene con lo que había', async () => {
    await cargarAporte(5000, '2026-08-10', 'Martu');
    await page.locator('[data-accion="editar-aporte"]').first().click();
    await page.waitForSelector('#dlg-aporte[open]');
    assert.equal(await page.locator('#titulo-aporte').textContent(), 'Editar aporte');
    assert.equal(await page.inputValue('#a-monto'), '5000');
    assert.equal(await page.inputValue('#a-fecha'), '2026-08-10');
    assert.equal(await page.inputValue('#a-persona'), 'Martu');
  });

  test('EDITAR un aporte lo corrige en el lugar, no crea uno nuevo', async () => {
    await cargarAporte(5000, '2026-08-10', 'Martu');       // cargado mal a propósito
    await page.locator('[data-accion="editar-aporte"]').first().click();
    await page.waitForSelector('#dlg-aporte[open]');
    await page.fill('#a-monto', '50000');
    await page.locator('#form-aporte button[type="submit"]').click();
    await page.waitForTimeout(300);
    assert.match(await ahorrado(), /50\.000/);
    assert.equal(await page.locator('[data-accion="editar-aporte"]').count(), 1);
  });

  test('se puede cambiar de quién fue el aporte', async () => {
    await cargarAporte(50000, '2026-08-10', 'Martu');
    await page.locator('[data-accion="editar-aporte"]').first().click();
    await page.waitForSelector('#dlg-aporte[open]');
    await page.selectOption('#a-persona', 'Felipe');
    await page.locator('#form-aporte button[type="submit"]').click();
    await page.waitForTimeout(300);
    assert.match(await page.locator('#panel-ahorros').innerText(), /Felipe puso/);
  });

  test('el botón Eliminar del formulario borra el aporte', async () => {
    await cargarAporte(50000, '2026-08-10', 'Martu');
    await page.locator('[data-accion="editar-aporte"]').first().click();
    await page.waitForSelector('#dlg-aporte[open]');
    await page.locator('#borrar-aporte').click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-accion="editar-aporte"]').count(), 0);
  });

  test('con más de 6 aportes aparece el botón para ver todos', async () => {
    for (let i = 1; i <= 7; i++) await cargarAporte(1000 * i, `2026-08-0${i}`, 'Martu');
    assert.equal(await page.locator('[data-accion="editar-aporte"]').count(), 6);
    await page.locator('[data-accion="desplegar-aportes"]').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-accion="editar-aporte"]').count(), 7);
  });

  test('la meta muestra cuánto falta', async () => {
    await cargarAporte(250000, '2026-08-10', 'Martu');
    assert.match(await page.locator('#panel-ahorros').innerText(), /faltan \$\s750\.000/);
  });
});

/* ────────────────────────────────────────────────────────────
   LA TARJETA POR DENTRO
   ──────────────────────────────────────────────────────────── */
describe('La página de una tarjeta', () => {
  beforeEach(async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 50000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('tarjetas');
    await page.locator('[data-accion="abrir-tarjeta"]').first().click();
    await page.waitForTimeout(300);
  });

  test('al tocar una tarjeta se abre su detalle con los consumos', async () => {
    const texto = await page.locator('#panel-tarjetas').innerText();
    assert.match(texto, /BBVA BLACK VISA/);
    assert.match(texto, /Coto/);
    assert.match(texto, /cierra/i);
    assert.match(texto, /vence/i);
  });

  test('"Ya pagué" saca el saldo de este resumen', async () => {
    assert.match(await page.locator('#panel-tarjetas').innerText(), /50\.000/);
    await page.locator('[data-accion="pagar"]').first().click();
    await page.waitForTimeout(400);
    const pa = await page.locator('.fechas-clave .destacado .v').textContent();
    assert.match(pa, /\$\s0/);
  });

  test('el botón Volver regresa al mazo de tarjetas', async () => {
    await page.locator('[data-accion="volver"]').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.tarjeta-banco').count(), 4);
  });

  test('el botón + de la tarjeta abre el gasto con esa tarjeta ya elegida', async () => {
    await page.locator('[data-accion="volver"]').click();
    await page.waitForTimeout(300);
    await page.locator('.tb-rapido').nth(2).click();       // la tercera: GALICIA GOLD VISA
    await page.waitForSelector('#dlg-gasto[open]');
    const elegida = await page.locator('#g-tarjeta option:checked').textContent();
    assert.equal(elegida, 'GALICIA GOLD VISA');
  });
});

/* ────────────────────────────────────────────────────────────
   INICIO
   ──────────────────────────────────────────────────────────── */
describe('La pantalla de Inicio', () => {
  test('sin sueldo cargado, invita a cargarlo', async () => {
    assert.match(await page.locator('#panel-inicio').innerText(), /Cargá el sueldo/);
  });

  test('con sueldo cargado muestra el porcentaje gastado', async () => {
    await page.locator('[data-accion="editar-sueldos"]').click();
    await page.waitForSelector('#dlg-sueldos[open]');
    await page.locator('#campos-sueldos input').first().fill('100000');
    await page.locator('#form-sueldos button[type="submit"]').click();
    await page.waitForTimeout(300);

    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 25000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('inicio');
    assert.match(await page.locator('#panel-inicio').innerText(), /25% del sueldo/);
  });

  test('si te pasás del sueldo, lo dice', async () => {
    await page.locator('[data-accion="editar-sueldos"]').click();
    await page.waitForSelector('#dlg-sueldos[open]');
    await page.locator('#campos-sueldos input').first().fill('10000');
    await page.locator('#form-sueldos button[type="submit"]').click();
    await page.waitForTimeout(300);

    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 15000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('inicio');
    assert.match(await page.locator('#panel-inicio').innerText(), /Te pasaste/);
  });
});
