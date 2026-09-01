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

async function cargarGasto({ desc, monto, fecha, categoria, persona, cuotas, tipoPago, tarjeta }) {
  await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
  await page.waitForSelector('#dlg-gasto[open]');
  await page.fill('#g-desc', desc);
  await page.fill('#g-monto', String(monto));
  await page.fill('#g-fecha', fecha);
  if (tarjeta !== undefined) await page.selectOption('#g-tarjeta', tarjeta);
  if (categoria) await page.selectOption('#g-categoria', categoria);
  if (persona) await page.selectOption('#g-persona', persona);
  const forma = tipoPago || (cuotas && cuotas > 1 ? 'cuotas' : 'unico');
  await page.locator(`input[name="tipoPago"][value="${forma}"]`).check();
  await page.waitForTimeout(120);
  if (forma === 'cuotas' && cuotas) await page.selectOption('#g-cuotas', String(cuotas));
  await page.locator('#form-gasto button[type="submit"]').click();
  await page.waitForTimeout(250);
}

async function cargarSueldo(monto) {
  await irA('inicio');
  await page.locator('[data-accion="editar-sueldos"]').first().click();
  await page.waitForSelector('#dlg-sueldos[open]');
  await page.locator('#campos-sueldos input').first().fill(String(monto));
  await page.locator('#form-sueldos button[type="submit"]').click();
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

  test('están las 7 pestañas, en orden', async () => {
    assert.deepEqual(await page.locator('.pestana').allTextContents(),
      ['Inicio', 'Tarjetas', 'Gastos', 'Ahorros', 'Historial', 'Sueldo', 'Millas']);
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
    await page.locator('#panel-inicio [data-accion="editar-sueldos"]').click();
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
    await page.locator('#panel-inicio [data-accion="editar-sueldos"]').click();
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

/* ────────────────────────────────────────────────────────────
   CÓMO VIENE EL MES QUE VIENE
   ──────────────────────────────────────────────────────────── */
describe('Inicio: cómo viene el mes que viene', () => {
  test('ya NO está el card viejo de "a pagar / deuda / millas"', async () => {
    const t = await page.locator('#panel-inicio').innerText();
    assert.ok(!t.includes('A pagar este mes'), 'quedó el card redundante');
    assert.ok(!t.includes('Deuda con cuotas'), 'quedó el card redundante');
  });

  test('muestra lo que entra y lo que ya está comprometido', async () => {
    await cargarSueldo(1000000);
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 120000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('inicio');
    const t = await page.locator('#panel-inicio').innerText();
    assert.match(t, /Cómo viene/);
    assert.match(t, /YA COMPROMETIDO/i);
    assert.match(t, /120\.000/);
  });

  test('dice cuánto queda libre antes de gastar nada', async () => {
    await cargarSueldo(1000000);
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 120000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('inicio');
    assert.match(await page.locator('#panel-inicio').innerText(), /Te queda libre/);
  });

  test('un gasto fijo también cuenta para el mes que viene', async () => {
    await cargarSueldo(1000000);
    await irA('gastos');
    await cargarGasto({ desc: 'Alquiler', monto: 300000, fecha: '2026-09-01',
      categoria: 'Alquiler', persona: 'Martu', tipoPago: 'fijo', tarjeta: '' });
    await irA('inicio');
    const t = await page.locator('#panel-inicio').innerText();
    assert.match(t, /Gastos fijos/);
    assert.match(t, /300\.000/);
  });
});

/* ────────────────────────────────────────────────────────────
   TARJETAS: total de todas y en qué se fue la plata
   ──────────────────────────────────────────────────────────── */
describe('Tarjetas: el total y el gráfico', () => {
  test('arriba de todo está el total de las 4 juntas', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 120000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('tarjetas');
    const t = await page.locator('#panel-tarjetas').innerText();
    assert.match(t, /ENTRE LAS 4 TARJETAS/i);
    assert.match(t, /120\.000/);
  });

  test('el gráfico muestra en qué se fue más la plata, de mayor a menor', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 100000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await cargarGasto({ desc: 'Cine', monto: 20000, fecha: '2026-09-06', categoria: 'Salidas', persona: 'Felipe' });
    await irA('tarjetas');
    const nombres = await page.locator('#panel-tarjetas .cat-nombre').allTextContents();
    assert.deepEqual(nombres, ['Supermercado', 'Salidas'], 'tienen que venir de mayor a menor');
  });

  test('sin gastos con tarjeta no dibuja el gráfico', async () => {
    await irA('tarjetas');
    assert.equal(await page.locator('#panel-tarjetas .cat-fila').count(), 0);
  });
});

/* ────────────────────────────────────────────────────────────
   EL CIERRE Y EL VENCIMIENTO, MES A MES
   ──────────────────────────────────────────────────────────── */
describe('Cargar el cierre y el vencimiento de cada mes', () => {
  test('avisa que faltan las fechas de este mes, para las 4 tarjetas', async () => {
    await irA('tarjetas');
    const t = await page.locator('#panel-tarjetas').innerText();
    assert.match(t, /Faltan las fechas/);
    assert.equal(await page.locator('[data-accion="fechas-mes"]').count(), 4);
  });

  test('la ventana explica qué efecto tienen las fechas que ponés', async () => {
    await irA('tarjetas');
    await page.locator('[data-accion="fechas-mes"]').first().click();
    await page.waitForSelector('#dlg-fechas[open]');
    await page.fill('#fm-cierre', '27');
    await page.fill('#fm-venc', '12');
    await page.waitForTimeout(200);
    const pista = await page.locator('#fechas-pista').innerText();
    assert.match(pista, /27 sep 2026/);
    assert.match(pista, /12 oct 2026/);
  });

  test('al confirmarlas, esa tarjeta deja de aparecer en el aviso', async () => {
    await irA('tarjetas');
    await page.locator('[data-accion="fechas-mes"]').first().click();
    await page.waitForSelector('#dlg-fechas[open]');
    await page.fill('#fm-cierre', '27');
    await page.fill('#fm-venc', '12');
    await page.locator('#form-fechas button[type="submit"]').click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-accion="fechas-mes"]').count(), 3);
  });

  test('LO IMPORTANTE: cambiar el cierre mueve el gasto de resumen', async () => {
    // Con el cierre de siempre (25), un gasto del 26 de septiembre cae en OCTUBRE.
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.fill('#g-fecha', '2026-09-26');
    await page.waitForTimeout(200);
    assert.match(await page.locator('#pista-ciclo').textContent(), /oct 2026/);
    await page.locator('#dlg-gasto [data-cerrar]').click();
    await page.waitForTimeout(200);

    // Cargamos que en septiembre el banco cerró el 27.
    await irA('tarjetas');
    await page.locator('[data-accion="fechas-mes"]').first().click();
    await page.waitForSelector('#dlg-fechas[open]');
    await page.fill('#fm-cierre', '27');
    await page.fill('#fm-venc', '12');
    await page.locator('#form-fechas button[type="submit"]').click();
    await page.waitForTimeout(400);

    // Ahora el mismo gasto cae en SEPTIEMBRE.
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.fill('#g-fecha', '2026-09-26');
    await page.waitForTimeout(200);
    assert.match(await page.locator('#pista-ciclo').textContent(), /sep 2026/);
  });
});

/* ────────────────────────────────────────────────────────────
   GASTOS FIJOS, CUOTAS Y UN SOLO PAGO
   ──────────────────────────────────────────────────────────── */
describe('Cómo se paga: fijo, cuotas o un solo pago', () => {
  test('las tres opciones están', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    const valores = await page.locator('input[name="tipoPago"]').evaluateAll(
      (els) => els.map((e) => e.value));
    assert.deepEqual(valores, ['unico', 'cuotas', 'fijo']);
  });

  test('"cuántas cuotas" sólo aparece si elegís cuotas', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    assert.ok(await page.locator('#campo-cuotas').isHidden(), 'con un pago no va');
    await page.locator('input[name="tipoPago"][value="cuotas"]').check();
    await page.waitForTimeout(150);
    assert.ok(await page.locator('#campo-cuotas').isVisible());
    await page.locator('input[name="tipoPago"][value="fijo"]').check();
    await page.waitForTimeout(150);
    assert.ok(await page.locator('#campo-cuotas').isHidden(), 'con fijo tampoco va');
  });

  test('al elegir fijo, avisa que se repite todos los meses', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.locator('input[name="tipoPago"][value="fijo"]').check();
    await page.waitForTimeout(200);
    assert.match(await page.locator('#pista-ciclo').innerText(), /todos los meses/);
  });

  test('un gasto fijo queda marcado en la lista', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Psicóloga', monto: 60000, fecha: '2026-09-03',
      categoria: 'Psicóloga', persona: 'Martu', tipoPago: 'fijo' });
    const t = await page.locator('#panel-gastos').innerText();
    assert.match(t, /todos los meses/);
    assert.match(t, /desde 3 sep/);
  });

  test('la lista se separa en fijos y variables, con el total de cada grupo', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Alquiler', monto: 300000, fecha: '2026-09-01',
      categoria: 'Alquiler', persona: 'Martu', tipoPago: 'fijo', tarjeta: '' });
    await cargarGasto({ desc: 'Cine', monto: 20000, fecha: '2026-09-06',
      categoria: 'Salidas', persona: 'Felipe' });
    const t = await page.locator('#panel-gastos').innerText();
    assert.match(t, /Gastos fijos/);
    assert.match(t, /Gastos variables/);
    assert.match(t, /300\.000/);
    assert.match(t, /20\.000/);
  });
});

/* ────────────────────────────────────────────────────────────
   CATEGORÍAS
   ──────────────────────────────────────────────────────────── */
describe('Las categorías', () => {
  test('están las que pidió Martu, no sólo las viejas', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    const cats = (await page.locator('#g-categoria option').allTextContents()).join(' | ');
    for (const c of ['Alquiler', 'Tarjeta', 'Psicóloga', 'Cerámica', 'Comida']) {
      assert.ok(cats.includes(c), `falta la categoría ${c}`);
    }
  });

  test('las fijas se ven marcadas como fijas', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    const cats = await page.locator('#g-categoria option').allTextContents();
    assert.ok(cats.some((c) => c.startsWith('Alquiler') && c.includes('fijo')));
    assert.ok(cats.some((c) => c.startsWith('Comida') && !c.includes('fijo')));
  });

  test('se puede agregar una categoría nueva, y queda elegida', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.selectOption('#g-categoria', '__nueva__');
    await page.waitForSelector('#dlg-categoria[open]');
    await page.fill('#c-nombre', 'Veterinaria');
    await page.locator('#form-categoria input[value="fijo"]').check();
    await page.locator('#form-categoria button[type="submit"]').click();
    await page.waitForTimeout(400);
    assert.equal(await page.inputValue('#g-categoria'), 'Veterinaria');
  });

  test('la categoría nueva queda guardada para la próxima vez', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.selectOption('#g-categoria', '__nueva__');
    await page.waitForSelector('#dlg-categoria[open]');
    await page.fill('#c-nombre', 'Veterinaria');
    await page.locator('#form-categoria button[type="submit"]').click();
    await page.waitForTimeout(300);
    await page.locator('#dlg-gasto [data-cerrar]').click();
    await page.waitForTimeout(300);

    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    const cats = await page.locator('#g-categoria option').allTextContents();
    assert.ok(cats.some((c) => c.startsWith('Veterinaria')));
  });

  test('si cancelás, el desplegable no queda trabado en "Agregar…"', async () => {
    await irA('gastos');
    await page.locator('#panel-gastos [data-accion="nuevo-gasto"]').click();
    await page.waitForSelector('#dlg-gasto[open]');
    await page.selectOption('#g-categoria', '__nueva__');
    await page.waitForSelector('#dlg-categoria[open]');
    await page.locator('#dlg-categoria [data-cerrar]').click();
    await page.waitForTimeout(300);
    assert.notEqual(await page.inputValue('#g-categoria'), '__nueva__');
  });
});

/* ────────────────────────────────────────────────────────────
   LAS PESTAÑAS NUEVAS
   ──────────────────────────────────────────────────────────── */
describe('Historial', () => {
  test('muestra el mes en curso aunque no haya nada cargado', async () => {
    await irA('historial');
    const t = await page.locator('#panel-historial').innerText();
    assert.match(t, /sep 2026/);
    assert.match(t, /en curso/);
  });

  test('cada mes dice cuánto entró, cuánto se gastó y cuánto sobró', async () => {
    await cargarSueldo(1000000);
    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 300000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('historial');
    const t = await page.locator('#panel-historial').innerText();
    assert.match(t, /ENTRÓ/i);
    assert.match(t, /SE GASTÓ/i);
    assert.match(t, /SOBRÓ/i);
    assert.match(t, /700\.000/);
  });

  test('arma un mes por cada mes con movimiento, sin saltearse ninguno', async () => {
    await irA('gastos');
    await cargarGasto({ desc: 'Viejo', monto: 10000, fecha: '2026-07-05', categoria: 'Comida', persona: 'Martu' });
    await irA('historial');
    const t = await page.locator('#panel-historial').innerText();
    for (const m of ['sep 2026', 'ago 2026', 'jul 2026']) assert.ok(t.includes(m), `falta ${m}`);
  });
});

describe('Sueldo', () => {
  test('sin sueldo cargado, invita a cargarlo', async () => {
    await irA('sueldo');
    assert.match(await page.locator('#panel-sueldo').innerText(), /Todavía no cargaron el sueldo/);
  });

  test('muestra el total y cuánto pone cada uno', async () => {
    await cargarSueldo(600000);
    await irA('sueldo');
    const t = await page.locator('#panel-sueldo').innerText();
    assert.match(t, /600\.000/);
    assert.match(t, /Quién pone qué/);
    assert.match(t, /Felipe/);
    assert.match(t, /Martu/);
  });

  test('se puede editar el sueldo desde su propia pestaña', async () => {
    await irA('sueldo');
    await page.locator('#panel-sueldo [data-accion="editar-sueldos"]').click();
    await page.waitForSelector('#dlg-sueldos[open]');
    await page.locator('#campos-sueldos input').first().fill('750000');
    await page.locator('#form-sueldos button[type="submit"]').click();
    await page.waitForTimeout(300);
    assert.match(await page.locator('#panel-sueldo').innerText(), /750\.000/);
  });
});

describe('Millas', () => {
  test('avisa qué tarjetas no tienen las millas cargadas', async () => {
    await irA('millas');
    const t = await page.locator('#panel-millas').innerText();
    assert.match(t, /falta cargar cuántas millas/);
    assert.match(t, /BBVA BLACK VISA/);
  });

  test('cuenta las millas cuando la tarjeta las tiene configuradas', async () => {
    await irA('tarjetas');
    await page.locator('[data-accion="abrir-tarjeta"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-accion="editar-tarjeta"]').click();
    await page.waitForSelector('#dlg-tarjeta[open]');
    await page.fill('#t-millas', '1.5');
    await page.fill('#t-limite', '500000');
    await page.locator('#form-tarjeta button[type="submit"]').click();
    await page.waitForTimeout(400);

    await irA('gastos');
    await cargarGasto({ desc: 'Coto', monto: 100000, fecha: '2026-09-05', categoria: 'Supermercado', persona: 'Martu' });
    await irA('millas');
    const t = await page.locator('#panel-millas').innerText();
    assert.match(t, /MILLAS JUNTADAS/i);
    assert.match(t, /150/);          // 1,5 millas cada $1.000 sobre $100.000
  });
});
