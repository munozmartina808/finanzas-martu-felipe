/* ══════════════════════════════════════════════════════════════
   PRUEBAS DEL MOTOR

   Cómo correrlas:   cd motor && node --test

   Cada prueba dice en criollo qué está comprobando. Si alguna se
   pone en rojo, la matemática de la app se rompió: NO publiques.
   ══════════════════════════════════════════════════════════════ */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  aCentavos, sumar, repartir, formatear,
  parseFecha, formatFecha, diasEnMes, clampDia, sumarMeses,
  diasEntre, sumarDias, cicloId, hoyISO,
  cicloDeFecha, cierreDeCiclo, vencimientoDeCiclo,
  cuotasDeGasto, millasDe, financiacion,
  resumenDeTarjeta, panelTarjetas,
  mesesHasta, progresoDeMeta, panelAhorros,
  mesDe, balanceMensual, filtrarGastos, mesesConGastos,
} from './motor.js';

/* Tarjeta de mentira para las pruebas: cierra el 25, vence el 10. */
const TARJETA = {
  id: 't1', nombre: 'BBVA BLACK VISA', banco: 'BBVA', red: 'VISA', tema: 'negra',
  diaCierre: 25, diaVencimiento: 10, limiteCentavos: 50000000, millasPorMil: 1.5,
};
const gasto = (extra) => ({
  id: 'g1', descripcion: 'Super', montoCentavos: 100000, fecha: '2026-03-10',
  tarjetaId: 't1', cuotas: 1, persona: 'Martu', categoria: 'Supermercado', ...extra,
});

/* ────────────────────────────────────────────────────────────
   1. LA PLATA — siempre en centavos enteros
   ──────────────────────────────────────────────────────────── */
describe('La plata va en centavos enteros', () => {
  test('convierte pesos a centavos', () => {
    assert.equal(aCentavos(1), 100);
    assert.equal(aCentavos(12500.5), 1250050);
  });

  test('redondea sin dejar decimales sueltos', () => {
    assert.equal(aCentavos(0.1 + 0.2), 30);           // el clásico 0.30000000000000004
    assert.ok(Number.isInteger(aCentavos(19.99)));
  });

  test('suma una lista de montos', () => {
    assert.equal(sumar([100, 250, 3]), 353);
    assert.equal(sumar([]), 0);
  });
});

/* ────────────────────────────────────────────────────────────
   2. REPARTIR EN CUOTAS — el total tiene que dar exacto
   ──────────────────────────────────────────────────────────── */
describe('Repartir en cuotas nunca pierde ni inventa un centavo', () => {
  test('reparte parejo cuando da justo', () => {
    assert.deepEqual(repartir(9000, 3), [3000, 3000, 3000]);
  });

  test('cuando no da justo, los centavos de más van a las primeras cuotas', () => {
    assert.deepEqual(repartir(10000, 3), [3334, 3333, 3333]);
  });

  test('la suma de las cuotas SIEMPRE es el total, pruebe lo que pruebe', () => {
    for (let total = 1; total <= 400; total++) {
      for (const n of [1, 2, 3, 6, 9, 12, 18, 24]) {
        assert.equal(sumar(repartir(total, n)), total, `falló con ${total} en ${n} cuotas`);
      }
    }
  });

  test('un solo pago devuelve el total entero', () => {
    assert.deepEqual(repartir(12345, 1), [12345]);
  });

  test('con montos negativos también cierra', () => {
    assert.equal(sumar(repartir(-10000, 3)), -10000);
  });

  test('pedir cero cuotas es un error, no un resultado raro', () => {
    assert.throws(() => repartir(1000, 0), RangeError);
  });
});

/* ────────────────────────────────────────────────────────────
   3. LAS FECHAS — texto 'AAAA-MM-DD', nunca objetos Date
   ──────────────────────────────────────────────────────────── */
describe('Las fechas son texto y no se corren de día', () => {
  test('lee una fecha en sus tres pedazos', () => {
    assert.deepEqual(parseFecha('2026-03-09'), { y: 2026, m: 3, d: 9 });
  });

  test('la escribe de vuelta con los ceros adelante', () => {
    assert.equal(formatFecha({ y: 2026, m: 3, d: 9 }), '2026-03-09');
  });

  test('una fecha inventada tira error en vez de seguir de largo', () => {
    assert.throws(() => parseFecha('9 de marzo'), TypeError);
  });

  test('leer y escribir no cambia nada (ida y vuelta)', () => {
    for (const f of ['2024-02-29', '2026-01-01', '2026-12-31']) {
      assert.equal(formatFecha(parseFecha(f)), f);
    }
  });

  test('sabe cuántos días tiene cada mes', () => {
    assert.equal(diasEnMes(2026, 2), 28);
    assert.equal(diasEnMes(2024, 2), 29);   // bisiesto
    assert.equal(diasEnMes(2026, 4), 30);
    assert.equal(diasEnMes(2026, 12), 31);
  });

  test('cuenta los días entre dos fechas, cruzando meses', () => {
    assert.equal(diasEntre('2026-03-20', '2026-04-10'), 21);
    assert.equal(diasEntre('2026-03-10', '2026-03-10'), 0);
    assert.equal(diasEntre('2026-04-10', '2026-03-20'), -21);
  });

  test('cuenta bien pasando de un año a otro', () => {
    assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1);
  });

  test('suma meses sin desbordarse: 31 de enero + 1 mes = 28 de febrero', () => {
    assert.deepEqual(sumarMeses({ y: 2026, m: 1, d: 31 }, 1), { y: 2026, m: 2, d: 28 });
  });

  test('suma meses cruzando el año', () => {
    assert.deepEqual(sumarMeses({ y: 2026, m: 12, d: 5 }, 1), { y: 2027, m: 1, d: 5 });
  });

  test('resta meses cruzando el año para atrás', () => {
    assert.deepEqual(sumarMeses({ y: 2026, m: 1, d: 5 }, -1), { y: 2025, m: 12, d: 5 });
  });

  test('suma un día al último del mes', () => {
    assert.deepEqual(sumarDias({ y: 2026, m: 2, d: 28 }, 1), { y: 2026, m: 3, d: 1 });
    assert.deepEqual(sumarDias({ y: 2024, m: 2, d: 28 }, 1), { y: 2024, m: 2, d: 29 });
  });

  test('el nombre del resumen es año-mes', () => {
    assert.equal(cicloId({ y: 2026, m: 3 }), '2026-03');
  });

  test('hoy sale en el formato correcto', () => {
    assert.match(hoyISO(new Date(2026, 2, 9)), /^2026-03-09$/);
  });
});

/* ────────────────────────────────────────────────────────────
   4. LA REGLA DEL CICLO — el corazón de todo
   ──────────────────────────────────────────────────────────── */
describe('LA REGLA: hasta el cierre entra en este resumen, después en el siguiente', () => {
  test('un gasto ANTES del cierre cae en el resumen de este mes', () => {
    assert.deepEqual(cicloDeFecha('2026-03-20', 25), { y: 2026, m: 3 });
  });

  test('un gasto EL DÍA del cierre todavía cae en este mes', () => {
    assert.deepEqual(cicloDeFecha('2026-03-25', 25), { y: 2026, m: 3 });
  });

  test('un gasto DESPUÉS del cierre cae en el resumen del mes que viene', () => {
    assert.deepEqual(cicloDeFecha('2026-03-26', 25), { y: 2026, m: 4 });
  });

  test('en diciembre, pasar de mes es pasar de año', () => {
    assert.deepEqual(cicloDeFecha('2026-12-30', 25), { y: 2027, m: 1 });
  });

  test('CASO DIFÍCIL: si la tarjeta cierra el 31, en febrero cierra el 28', () => {
    assert.equal(cierreDeCiclo({ y: 2026, m: 2 }, 31), '2026-02-28');
    assert.deepEqual(cicloDeFecha('2026-02-28', 31), { y: 2026, m: 2 });
  });

  test('CASO DIFÍCIL: en febrero bisiesto cierra el 29', () => {
    assert.equal(cierreDeCiclo({ y: 2024, m: 2 }, 31), '2024-02-29');
    assert.deepEqual(cicloDeFecha('2024-02-29', 31), { y: 2024, m: 2 });
  });

  test('cierre 31 en un mes de 30 días cae el 30', () => {
    assert.equal(cierreDeCiclo({ y: 2026, m: 4 }, 31), '2026-04-30');
  });
});

describe('El vencimiento: cuándo se paga cada resumen', () => {
  test('CASO DIFÍCIL: si vence ANTES del cierre, se paga el mes siguiente', () => {
    // cierra el 25, vence el 10 → el resumen de marzo se paga el 10 de ABRIL
    assert.equal(vencimientoDeCiclo({ y: 2026, m: 3 }, 25, 10), '2026-04-10');
  });

  test('si vence DESPUÉS del cierre, se paga el mismo mes', () => {
    // cierra el 10, vence el 25 → el resumen de marzo se paga el 25 de MARZO
    assert.equal(vencimientoDeCiclo({ y: 2026, m: 3 }, 10, 25), '2026-03-25');
  });

  test('el vencimiento también se achica en febrero', () => {
    assert.equal(vencimientoDeCiclo({ y: 2026, m: 1 }, 15, 31), '2026-01-31');
    assert.equal(vencimientoDeCiclo({ y: 2025, m: 12 }, 20, 31), '2025-12-31');
  });

  test('el vencimiento siempre cae después del cierre, nunca antes', () => {
    for (let mes = 1; mes <= 12; mes++) {
      const cierre = cierreDeCiclo({ y: 2026, m: mes }, 25);
      const venc = vencimientoDeCiclo({ y: 2026, m: mes }, 25, 10);
      assert.ok(diasEntre(cierre, venc) > 0, `mes ${mes}: ${cierre} → ${venc}`);
    }
  });

  test('el día del cierre nunca se sale del mes', () => {
    assert.equal(clampDia(2026, 2, 31), 28);
    assert.equal(clampDia(2026, 2, 0), 1);
    assert.equal(clampDia(2026, 3, 15), 15);
  });
});

/* ────────────────────────────────────────────────────────────
   5. CUOTAS REPARTIDAS EN RESÚMENES SEGUIDOS
   ──────────────────────────────────────────────────────────── */
describe('Las cuotas se reparten en resúmenes consecutivos', () => {
  test('un pago solo va al resumen que le toca', () => {
    const c = cuotasDeGasto(gasto({ fecha: '2026-03-10', cuotas: 1 }), TARJETA);
    assert.equal(c.length, 1);
    assert.equal(c[0].cicloId, '2026-03');
    assert.equal(c[0].montoCentavos, 100000);
  });

  test('tres cuotas caen en marzo, abril y mayo — uno atrás del otro', () => {
    const c = cuotasDeGasto(gasto({ fecha: '2026-03-10', cuotas: 3 }), TARJETA);
    assert.deepEqual(c.map((x) => x.cicloId), ['2026-03', '2026-04', '2026-05']);
  });

  test('las cuotas suman EXACTAMENTE el total del gasto', () => {
    const c = cuotasDeGasto(gasto({ montoCentavos: 100000, cuotas: 3 }), TARJETA);
    assert.equal(sumar(c.map((x) => x.montoCentavos)), 100000);
  });

  test('si el gasto es después del cierre, la primera cuota arranca un mes más tarde', () => {
    const c = cuotasDeGasto(gasto({ fecha: '2026-03-26', cuotas: 3 }), TARJETA);
    assert.deepEqual(c.map((x) => x.cicloId), ['2026-04', '2026-05', '2026-06']);
  });

  test('12 cuotas cruzan el año sin saltearse ningún mes', () => {
    const c = cuotasDeGasto(gasto({ fecha: '2026-10-05', cuotas: 12 }), TARJETA);
    assert.equal(c.length, 12);
    assert.equal(c[0].cicloId, '2026-10');
    assert.equal(c[11].cicloId, '2027-09');
  });

  test('cada cuota sabe cuál es y de cuántas', () => {
    const c = cuotasDeGasto(gasto({ cuotas: 3 }), TARJETA);
    assert.deepEqual(c.map((x) => `${x.numero}/${x.de}`), ['1/3', '2/3', '3/3']);
  });

  test('si las cuotas vienen mal cargadas, se toma como un pago', () => {
    assert.equal(cuotasDeGasto(gasto({ cuotas: 0 }), TARJETA).length, 1);
    assert.equal(cuotasDeGasto(gasto({ cuotas: undefined }), TARJETA).length, 1);
  });
});

/* ────────────────────────────────────────────────────────────
   6. MILLAS
   ──────────────────────────────────────────────────────────── */
describe('Millas', () => {
  test('1,5 millas cada $1.000 sobre $100.000 son 150 millas', () => {
    assert.equal(millasDe(10000000, 1.5), 150);
  });

  test('sin millas configuradas, no suma nada', () => {
    assert.equal(millasDe(10000000, 0), 0);
    assert.equal(millasDe(10000000, undefined), 0);
  });
});

/* ────────────────────────────────────────────────────────────
   7. EL AVISO DE FINANCIACIÓN (faltan 5 días o menos)
   ──────────────────────────────────────────────────────────── */
describe('Cuánto gano si espero a comprar después del cierre', () => {
  test('faltando 5 días para el cierre, dice cuántos días extra gano', () => {
    const f = financiacion(TARJETA, '2026-03-20');
    assert.equal(f.proximoCierre, '2026-03-25');
    assert.equal(f.diasHastaCierre, 5);
    assert.equal(f.financiacionSiComproHoy, 21);        // 20 mar → 10 abr
    assert.equal(f.financiacionSiEsperoAlCierre, 45);   // 26 mar → 10 may
    assert.equal(f.diasExtraSiEspero, 24);
  });

  test('esperar nunca puede ser peor: los días extra jamás dan negativo', () => {
    for (const d of ['2026-03-01', '2026-03-15', '2026-03-25', '2026-03-26', '2026-02-27']) {
      assert.ok(financiacion(TARJETA, d).diasExtraSiEspero >= 0, `falló el ${d}`);
    }
  });

  test('el día DESPUÉS del cierre ya es el mejor momento: esperar no gana nada', () => {
    // Recién cerrado, la compra tiene el ciclo entero por delante: 45 días.
    // Por eso el aviso sólo aparece cuando el cierre está cerca.
    const f = financiacion(TARJETA, '2026-03-26');
    assert.equal(f.financiacionSiComproHoy, 45);
    assert.equal(f.diasExtraSiEspero, 0);
  });

  test('cuanto más cerca del cierre, más conviene esperar', () => {
    const lejos = financiacion(TARJETA, '2026-04-05').diasExtraSiEspero;   // faltan 20 días
    const cerca = financiacion(TARJETA, '2026-04-20').diasExtraSiEspero;   // faltan 5 días
    assert.ok(cerca > lejos, `cerca=${cerca} debería ser mayor que lejos=${lejos}`);
  });

  test('el día del cierre, faltan cero días', () => {
    assert.equal(financiacion(TARJETA, '2026-03-25').diasHastaCierre, 0);
  });
});

/* ────────────────────────────────────────────────────────────
   8. EL RESUMEN DE UNA TARJETA
   ──────────────────────────────────────────────────────────── */
describe('El resumen de una tarjeta', () => {
  const gastos = [
    gasto({ id: 'a', fecha: '2026-03-10', montoCentavos: 100000 }),
    gasto({ id: 'b', fecha: '2026-03-26', montoCentavos: 50000 }),   // ya cae en abril
  ];

  test('separa los gastos en el resumen que le toca a cada uno', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20');
    assert.equal(r.ciclos.find((c) => c.cicloId === '2026-03').totalCentavos, 100000);
    assert.equal(r.ciclos.find((c) => c.cicloId === '2026-04').totalCentavos, 50000);
  });

  test('el próximo a pagar es el resumen abierto de marzo', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20');
    assert.equal(r.proximoAPagar.cicloId, '2026-03');
    assert.equal(r.proximoAPagar.vencimiento, '2026-04-10');
  });

  test('marcar "Ya pagué" saca ese resumen y pasa al siguiente', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20', ['t1__2026-03']);
    assert.equal(r.proximoAPagar.cicloId, '2026-04');
  });

  test('la deuda comprometida es todo lo que falta pagar', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20');
    assert.equal(r.comprometidoCentavos, 150000);
  });

  test('el disponible es el límite menos lo comprometido', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20');
    assert.equal(r.disponibleCentavos, 50000000 - 150000);
  });

  test('un resumen sin vencer todavía está "abierto"', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-20');
    assert.equal(r.ciclos.find((c) => c.cicloId === '2026-03').estado, 'abierto');
  });

  test('pasado el cierre pero antes del vencimiento está "cerrado"', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-04-01');
    assert.equal(r.ciclos.find((c) => c.cicloId === '2026-03').estado, 'cerrado');
  });

  test('pasado el vencimiento y sin pagar, queda "vencido"', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-04-20');
    assert.equal(r.ciclos.find((c) => c.cicloId === '2026-03').estado, 'vencido');
    assert.equal(r.vencidos.length, 1);
  });

  test('avisa fuerte cuando algo está vencido e impago', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-04-20');
    assert.ok(r.alertas.some((a) => a.tipo === 'vencido' && a.nivel === 'critico'));
  });

  test('avisa cuando el cierre está a 5 días o menos', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-21');
    assert.ok(r.alertas.some((a) => a.tipo === 'cierre-proximo'));
  });

  test('NO avisa del cierre cuando todavía falta mucho', () => {
    const r = resumenDeTarjeta(TARJETA, gastos, '2026-03-05');
    assert.ok(!r.alertas.some((a) => a.tipo === 'cierre-proximo'));
  });

  test('los consumos del resumen salen ordenados por fecha', () => {
    const desordenados = [
      gasto({ id: 'x', fecha: '2026-03-20' }),
      gasto({ id: 'y', fecha: '2026-03-02' }),
    ];
    const r = resumenDeTarjeta(TARJETA, desordenados, '2026-03-21');
    const items = r.ciclos.find((c) => c.cicloId === '2026-03').items;
    assert.deepEqual(items.map((i) => i.fecha), ['2026-03-02', '2026-03-20']);
  });

  test('los gastos de otra tarjeta no se mezclan', () => {
    const ajenos = [gasto({ id: 'z', tarjetaId: 'otra', montoCentavos: 999999 })];
    const r = resumenDeTarjeta(TARJETA, ajenos, '2026-03-20');
    assert.equal(r.comprometidoCentavos, 0);
  });

  test('el nombre de la tarjeta se escapa: nadie puede meter HTML en las alertas', () => {
    const peligrosa = { ...TARJETA, nombre: '<img src=x onerror=alert(1)>' };
    const r = resumenDeTarjeta(peligrosa, gastos, '2026-04-20');
    const texto = r.alertas.map((a) => a.mensaje).join(' ');
    assert.ok(!texto.includes('<img'), 'el HTML no quedó neutralizado');
    assert.ok(texto.includes('&lt;img'));
  });
});

/* ────────────────────────────────────────────────────────────
   9. EL PANEL DE TODAS LAS TARJETAS
   ──────────────────────────────────────────────────────────── */
describe('El panel con las 4 tarjetas juntas', () => {
  const T2 = { ...TARJETA, id: 't2', nombre: 'GALICIA GOLD AMEX', diaCierre: 5, diaVencimiento: 20 };
  const gastos = [
    gasto({ id: 'a', tarjetaId: 't1', fecha: '2026-03-10', montoCentavos: 100000 }),
    gasto({ id: 'b', tarjetaId: 't2', fecha: '2026-03-02', montoCentavos: 200000 }),
  ];

  test('suma la deuda de todas las tarjetas', () => {
    const p = panelTarjetas([TARJETA, T2], gastos, '2026-03-03');
    assert.equal(p.deudaTotalCentavos, 300000);
  });

  test('ordena los vencimientos del más próximo al más lejano', () => {
    const p = panelTarjetas([TARJETA, T2], gastos, '2026-03-03');
    const fechas = p.proximosVencimientos.map((v) => v.vencimiento);
    assert.deepEqual(fechas, [...fechas].sort());
  });

  test('sin tarjetas, no explota: devuelve todo en cero', () => {
    const p = panelTarjetas([], [], '2026-03-03');
    assert.equal(p.deudaTotalCentavos, 0);
    assert.equal(p.aPagarCentavos, 0);
    assert.deepEqual(p.alertas, []);
  });
});

/* ────────────────────────────────────────────────────────────
   10. AHORROS
   ──────────────────────────────────────────────────────────── */
describe('Metas de ahorro', () => {
  const meta = { id: 'm1', nombre: 'Vacaciones', objetivoCentavos: 100000000, fechaLimite: '2026-09-01' };
  const aportes = [
    { id: 'a1', metaId: 'm1', montoCentavos: 20000000, fecha: '2026-01-15', persona: 'Martu' },
    { id: 'a2', metaId: 'm1', montoCentavos: 5000000, fecha: '2026-02-10', persona: 'Felipe' },
  ];

  test('suma lo aportado y calcula cuánto falta', () => {
    const p = progresoDeMeta(meta, aportes, '2026-03-01');
    assert.equal(p.acumuladoCentavos, 25000000);
    assert.equal(p.faltaCentavos, 75000000);
    assert.equal(p.porcentaje, 25);
  });

  test('muestra cuánto puso cada uno', () => {
    const p = progresoDeMeta(meta, aportes, '2026-03-01');
    assert.equal(p.porPersona.Martu, 20000000);
    assert.equal(p.porPersona.Felipe, 5000000);
  });

  test('dice cuánto hay que poner por mes para llegar a la fecha', () => {
    const p = progresoDeMeta(meta, aportes, '2026-03-01');
    assert.equal(p.mesesRestantes, 6);                          // marzo → septiembre
    assert.equal(p.sugerenciaMensualCentavos, 12500000);        // 75.000.000 / 6
  });

  test('la sugerencia mensual redondea para arriba: nunca queda corta', () => {
    const p = progresoDeMeta(
      { id: 'm2', nombre: 'X', objetivoCentavos: 1000, fechaLimite: '2026-06-01' },
      [], '2026-03-01',
    );
    assert.ok(p.sugerenciaMensualCentavos * p.mesesRestantes >= 1000);
  });

  test('meta cumplida: no falta nada y no pide más aportes', () => {
    const llena = [{ id: 'a3', metaId: 'm1', montoCentavos: 100000000, fecha: '2026-01-15', persona: 'Martu' }];
    const p = progresoDeMeta(meta, llena, '2026-03-01');
    assert.equal(p.alcanzada, true);
    assert.equal(p.faltaCentavos, 0);
    assert.equal(p.sugerenciaMensualCentavos, 0);
  });

  test('si se pasó la fecha y no llegó, queda marcada como vencida', () => {
    const p = progresoDeMeta(meta, aportes, '2026-10-01');
    assert.equal(p.vencida, true);
  });

  test('la barra nunca se pasa del 100% aunque ahorren de más', () => {
    const demas = [{ id: 'a4', metaId: 'm1', montoCentavos: 200000000, fecha: '2026-01-15', persona: 'Martu' }];
    const p = progresoDeMeta(meta, demas, '2026-03-01');
    assert.equal(p.porcentaje, 200);
    assert.equal(p.porcentajeBarra, 100);
  });

  test('una meta sin fecha límite no pide cuota mensual', () => {
    const p = progresoDeMeta({ id: 'm3', nombre: 'Auto', objetivoCentavos: 5000 }, [], '2026-03-01');
    assert.equal(p.conFecha, false);
    assert.equal(p.sugerenciaMensualCentavos, null);
  });

  test('cuenta los meses que faltan según el día del mes', () => {
    assert.equal(mesesHasta('2026-03-01', '2026-09-01'), 6);
    assert.equal(mesesHasta('2026-03-15', '2026-09-10'), 5);   // no llega a los 6 meses enteros
    assert.equal(mesesHasta('2026-09-01', '2026-03-01'), 0);   // fecha pasada: nunca negativo
  });

  test('el total de ahorros junta todas las metas', () => {
    const a = panelAhorros([meta], aportes, '2026-03-01');
    assert.equal(a.totalAhorradoCentavos, 25000000);
    assert.equal(a.totalObjetivoCentavos, 100000000);
    assert.equal(a.porcentajeGlobal, 25);
  });
});

/* ────────────────────────────────────────────────────────────
   11. EL BALANCE DEL MES (lo que se ve en Inicio)
   ──────────────────────────────────────────────────────────── */
describe('El balance del mes: cuánto tengo y cuánto gasto', () => {
  const base = {
    mes: '2026-03',
    sueldos: { Martu: 80000000, Felipe: 70000000 },
    tarjetas: [TARJETA],
    aportes: [],
    hoy: '2026-03-20',
    pagados: [],
  };

  test('el ingreso es la suma de los dos sueldos', () => {
    assert.equal(balanceMensual({ ...base, gastos: [] }).ingresoCentavos, 150000000);
  });

  test('los gastos del mes son todos los de ese mes, con tarjeta o sin ella', () => {
    const gastos = [
      gasto({ id: 'a', fecha: '2026-03-05', montoCentavos: 100000 }),
      gasto({ id: 'b', fecha: '2026-03-15', montoCentavos: 200000, tarjetaId: null }),
      gasto({ id: 'c', fecha: '2026-02-15', montoCentavos: 999999 }),   // otro mes: no cuenta
    ];
    assert.equal(balanceMensual({ ...base, gastos }).consumoCentavos, 300000);
  });

  test('el efectivo se cuenta aparte de las tarjetas', () => {
    const gastos = [gasto({ id: 'b', fecha: '2026-03-15', montoCentavos: 200000, tarjetaId: null })];
    assert.equal(balanceMensual({ ...base, gastos }).gastoDirectoCentavos, 200000);
  });

  test('un resumen ya pagado no vuelve a contarse como egreso', () => {
    const gastos = [gasto({ id: 'a', fecha: '2026-02-10', montoCentavos: 100000 })];
    const sinPagar = balanceMensual({ ...base, gastos });
    const pagado = balanceMensual({ ...base, gastos, pagados: ['t1__2026-02'] });
    assert.ok(pagado.pagosDeTarjetasCentavos < sinPagar.pagosDeTarjetasCentavos);
  });

  test('los aportes al ahorro también son plata que sale', () => {
    const aportes = [{ id: 'a1', metaId: 'm1', montoCentavos: 10000000, fecha: '2026-03-05', persona: 'Martu' }];
    assert.equal(balanceMensual({ ...base, gastos: [], aportes }).aportesAhorroCentavos, 10000000);
  });

  test('lo disponible es lo que entra menos todo lo que sale', () => {
    const b = balanceMensual({ ...base, gastos: [] });
    assert.equal(b.disponibleCentavos, b.ingresoCentavos - b.egresosCentavos);
  });

  test('sin sueldo cargado no explota: da cero', () => {
    const b = balanceMensual({ ...base, sueldos: {}, gastos: [] });
    assert.equal(b.ingresoCentavos, 0);
  });

  test('saca el mes de una fecha', () => {
    assert.equal(mesDe('2026-03-09'), '2026-03');
  });
});

/* ────────────────────────────────────────────────────────────
   12. FILTRAR LOS GASTOS
   ──────────────────────────────────────────────────────────── */
describe('Filtrar la lista de gastos', () => {
  const gastos = [
    gasto({ id: 'a', fecha: '2026-03-05', categoria: 'Comida', persona: 'Martu', montoCentavos: 10000 }),
    gasto({ id: 'b', fecha: '2026-03-20', categoria: 'Ropa', persona: 'Felipe', montoCentavos: 20000 }),
    gasto({ id: 'c', fecha: '2026-04-02', categoria: 'Comida', persona: 'Martu', montoCentavos: 30000 }),
    gasto({ id: 'd', fecha: '2026-04-11', categoria: 'Comida', persona: 'Felipe', montoCentavos: 40000 }),
  ];

  test('sin ningún filtro puesto, están todos', () => {
    assert.equal(filtrarGastos(gastos, {}).length, 4);
    assert.equal(filtrarGastos(gastos).length, 4);
  });

  test('filtra por mes', () => {
    assert.deepEqual(filtrarGastos(gastos, { mes: '2026-03' }).map((g) => g.id), ['a', 'b']);
  });

  test('filtra por categoría', () => {
    assert.deepEqual(filtrarGastos(gastos, { categoria: 'Comida' }).map((g) => g.id), ['a', 'c', 'd']);
  });

  test('filtra por persona', () => {
    assert.deepEqual(filtrarGastos(gastos, { persona: 'Martu' }).map((g) => g.id), ['a', 'c']);
  });

  test('los filtros se combinan: comida de Felipe en abril', () => {
    const r = filtrarGastos(gastos, { mes: '2026-04', categoria: 'Comida', persona: 'Felipe' });
    assert.deepEqual(r.map((g) => g.id), ['d']);
  });

  test('si no hay nada que coincida, devuelve la lista vacía (no explota)', () => {
    assert.deepEqual(filtrarGastos(gastos, { mes: '2020-01' }), []);
  });

  test('sirve para saber cuánto se gastó en algo: comida de marzo y abril', () => {
    const comida = filtrarGastos(gastos, { categoria: 'Comida' });
    assert.equal(sumar(comida.map((g) => g.montoCentavos)), 80000);
  });

  test('no toca la lista original', () => {
    filtrarGastos(gastos, { mes: '2026-03' });
    assert.equal(gastos.length, 4);
  });

  test('lista los meses que tienen gastos, del más nuevo al más viejo', () => {
    assert.deepEqual(mesesConGastos(gastos), ['2026-04', '2026-03']);
  });

  test('cada mes aparece una sola vez', () => {
    const repetidos = [gasto({ id: 'x', fecha: '2026-03-01' }), gasto({ id: 'y', fecha: '2026-03-02' })];
    assert.deepEqual(mesesConGastos(repetidos), ['2026-03']);
  });

  test('sin gastos, no hay meses', () => {
    assert.deepEqual(mesesConGastos([]), []);
  });
});

/* ────────────────────────────────────────────────────────────
   13. CÓMO SE MUESTRA LA PLATA
   ──────────────────────────────────────────────────────────── */
describe('Cómo se muestra la plata en pantalla', () => {
  test('muestra pesos sin centavos y con separador de miles', () => {
    const t = formatear(150000000);
    assert.ok(t.includes('1.500.000'), `salió "${t}"`);
    assert.ok(!t.includes(','), 'no debería mostrar centavos');
  });

  test('el cero se muestra como cero', () => {
    assert.ok(formatear(0).includes('0'));
  });
});
