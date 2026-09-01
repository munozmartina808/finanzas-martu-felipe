/* ══════════════════════════════════════════════════════════════
   MOTOR — la matemática de la app, sola y sin pantalla.

   Este archivo es la COPIA PROBABLE: acá viven las pruebas.
   La app (app/finanzas.html) tiene el mismo código pegado adentro
   para poder ser un solo archivo que se abre con doble clic.

   >>> SI CAMBIÁS LA MATEMÁTICA, CAMBIALA EN LOS DOS LADOS. <<<

   Dos reglas que no se negocian:
   - La plata va en centavos enteros. Nunca decimales.
   - Las fechas son texto 'AAAA-MM-DD'. Nunca objetos Date de
     JavaScript, porque se corren un día por la zona horaria.
   ══════════════════════════════════════════════════════════════ */

/* Estos tres viven en el bloque de DATOS del HTML, pero el motor los
   necesita para escribir las alertas. Van acá para que el módulo ande solo. */
function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCorta(iso) { const f = parseFecha(iso); return `${f.d} ${MESES[f.m - 1]}`; }

const aCentavos = (p) => Math.round(Number(p) * 100);
const sumar = (xs) => xs.reduce((a, b) => a + b, 0);

function repartir(total, partes) {
  const n = Math.trunc(partes);
  if (n < 1) throw new RangeError('repartir necesita al menos 1 parte');
  const signo = total < 0 ? -1 : 1, abs = Math.abs(total);
  const base = Math.floor(abs / n), resto = abs - base * n;
  return Array.from({ length: n }, (_, i) => signo * (base + (i < resto ? 1 : 0)));
}

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtc = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const formatear = (c) => fmt.format(c / 100);
const formatearExacto = (c) => fmtc.format(c / 100);

function parseFecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) throw new TypeError('Fecha inválida: ' + iso);
  return { y: +m[1], m: +m[2], d: +m[3] };
}
const formatFecha = (f) => `${f.y}-${String(f.m).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`;
const diasEnMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function clampDia(y, m, dia) { const max = diasEnMes(y, m); return dia < 1 ? 1 : (dia > max ? max : dia); }
function sumarMeses(f, n) {
  const t = f.y * 12 + (f.m - 1) + Math.trunc(n);
  const y = Math.floor(t / 12), m = (((t % 12) + 12) % 12) + 1;
  return { y, m, d: clampDia(y, m, f.d) };
}
function diasAbsolutos(f) {
  const y = f.m <= 2 ? f.y - 1 : f.y, era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (f.m + (f.m > 2 ? -3 : 9)) + 2) / 5) + f.d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
const diasEntre = (a, b) => diasAbsolutos(parseFecha(b)) - diasAbsolutos(parseFecha(a));
const comparar = (a, b) => diasAbsolutos(a) - diasAbsolutos(b);
function sumarDias(f, n) {
  const d = new Date(Date.UTC(f.y, f.m - 1, f.d) + Math.trunc(n) * 86400000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const cicloId = (c) => `${c.y}-${String(c.m).padStart(2, '0')}`;
function hoyISO(ahora = new Date()) {
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
}

/* — LA REGLA — hasta el cierre entra en este resumen; después, en el siguiente. */
function cicloDeFecha(fechaISO, diaCierre) {
  const f = parseFecha(fechaISO);
  if (f.d <= clampDia(f.y, f.m, diaCierre)) return { y: f.y, m: f.m };
  const s = sumarMeses({ y: f.y, m: f.m, d: 1 }, 1);
  return { y: s.y, m: s.m };
}
const cierreDeCiclo = (c, diaCierre) => formatFecha({ y: c.y, m: c.m, d: clampDia(c.y, c.m, diaCierre) });

function vencimientoDeCiclo(c, diaCierre, diaVenc) {
  const cierre = { y: c.y, m: c.m, d: clampDia(c.y, c.m, diaCierre) };
  const mismo = { y: c.y, m: c.m, d: clampDia(c.y, c.m, diaVenc) };
  if (comparar(mismo, cierre) > 0) return formatFecha(mismo);
  const s = sumarMeses({ y: c.y, m: c.m, d: 1 }, 1);
  return formatFecha({ y: s.y, m: s.m, d: clampDia(s.y, s.m, diaVenc) });
}

function cuotasDeGasto(gasto, tarjeta) {
  const n = Math.max(1, Math.trunc(gasto.cuotas || 1));
  const base = cicloDeFecha(gasto.fecha, tarjeta.diaCierre);
  return repartir(gasto.montoCentavos, n).map((montoCentavos, i) => {
    const c = sumarMeses({ y: base.y, m: base.m, d: 1 }, i);
    return { ciclo: { y: c.y, m: c.m }, cicloId: cicloId({ y: c.y, m: c.m }), numero: i + 1, de: n, montoCentavos };
  });
}

const millasDe = (c, porMil) => Math.round(((c / 100 / 1000) * (porMil || 0)) * 100) / 100;

function financiacion(t, hoy) {
  const cHoy = cicloDeFecha(hoy, t.diaCierre);
  const cierre = cierreDeCiclo(cHoy, t.diaCierre);
  const venc = vencimientoDeCiclo(cHoy, t.diaCierre, t.diaVencimiento);
  const despues = formatFecha(sumarDias(parseFecha(cierre), 1));
  const cSig = cicloDeFecha(despues, t.diaCierre);
  const vencSig = vencimientoDeCiclo(cSig, t.diaCierre, t.diaVencimiento);
  const hoyF = diasEntre(hoy, venc), esperoF = diasEntre(despues, vencSig);
  return {
    proximoCierre: cierre, diasHastaCierre: diasEntre(hoy, cierre),
    financiacionSiComproHoy: hoyF, financiacionSiEsperoAlCierre: esperoF,
    diasExtraSiEspero: esperoF - hoyF,
  };
}

function resumenDeTarjeta(t, gastos, hoy, pagados = []) {
  const mios = gastos.filter((g) => g.tarjetaId === t.id);
  const porCiclo = new Map();
  const tocar = (ciclo) => {
    const id = cicloId(ciclo);
    if (!porCiclo.has(id)) porCiclo.set(id, {
      cicloId: id, ciclo, cierre: cierreDeCiclo(ciclo, t.diaCierre),
      vencimiento: vencimientoDeCiclo(ciclo, t.diaCierre, t.diaVencimiento),
      items: [], totalCentavos: 0, millas: 0, estado: 'abierto',
    });
    return porCiclo.get(id);
  };
  for (const g of mios) for (const q of cuotasDeGasto(g, t)) {
    const e = tocar(q.ciclo);
    e.items.push({ gastoId: g.id, descripcion: g.descripcion, fecha: g.fecha, persona: g.persona || null, categoria: g.categoria || null, cuota: q.numero, deCuotas: q.de, montoCentavos: q.montoCentavos });
    e.totalCentavos += q.montoCentavos;
  }
  const cicloHoy = cicloDeFecha(hoy, t.diaCierre);
  tocar(cicloHoy);

  const ciclos = [...porCiclo.values()].sort((a, b) => a.cicloId.localeCompare(b.cicloId));
  for (const c of ciclos) {
    c.millas = millasDe(c.totalCentavos, t.millasPorMil);
    c.items.sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (pagados.includes(t.id + '__' + c.cicloId)) c.estado = 'pagado';
    else if (diasEntre(hoy, c.cierre) >= 0) c.estado = 'abierto';
    else if (diasEntre(hoy, c.vencimiento) >= 0) c.estado = 'cerrado';
    else c.estado = 'vencido';
  }
  const conSaldo = ciclos.filter((c) => c.totalCentavos > 0 && c.estado !== 'pagado');
  const proximoAPagar = conSaldo.find((c) => diasEntre(hoy, c.vencimiento) >= 0) || null;
  const vencidos = conSaldo.filter((c) => c.estado === 'vencido');
  const enCurso = ciclos.find((c) => c.cicloId === cicloId(cicloHoy));
  const siguientes = ciclos.filter((c) => proximoAPagar && c.cicloId > proximoAPagar.cicloId && c.totalCentavos > 0);
  const comprometidoCentavos = sumar(conSaldo.map((c) => c.totalCentavos));
  const fin = financiacion(t, hoy);

  const alertas = [];
  if (fin.diasHastaCierre >= 0 && fin.diasHastaCierre <= 5) alertas.push({
    tipo: 'cierre-proximo', nivel: 'aviso', dias: fin.diasHastaCierre, tarjeta: t.nombre,
    mensaje: fin.diasHastaCierre === 0
      ? `<b>${escapar(t.nombre)}</b> cierra hoy. Si comprás mañana, ganás ${fin.diasExtraSiEspero} días más para pagarlo.`
      : `<b>${escapar(t.nombre)}</b> cierra en ${fin.diasHastaCierre} ${fin.diasHastaCierre === 1 ? 'día' : 'días'}. Esperando al cierre ganás ${fin.diasExtraSiEspero} días más de financiación.`,
  });
  if (proximoAPagar) {
    const d = diasEntre(hoy, proximoAPagar.vencimiento);
    if (d >= 0 && d <= 3) alertas.push({ tipo: 'vencimiento', nivel: 'critico', dias: d, tarjeta: t.nombre,
      mensaje: `<b>${escapar(t.nombre)}</b> vence ${d === 0 ? 'hoy' : 'en ' + d + (d === 1 ? ' día' : ' días')}: ${formatear(proximoAPagar.totalCentavos)}.` });
  }
  for (const v of vencidos) alertas.push({ tipo: 'vencido', nivel: 'critico', tarjeta: t.nombre,
    mensaje: `<b>${escapar(t.nombre)}</b>: el resumen de ${v.cicloId} venció el ${fechaCorta(v.vencimiento)} y figura impago.` });

  return {
    tarjeta: t, ciclos, enCurso, proximoAPagar, siguientes, vencidos, comprometidoCentavos,
    disponibleCentavos: Math.max(0, (t.limiteCentavos || 0) - comprometidoCentavos),
    usoDelLimite: t.limiteCentavos ? Math.round((comprometidoCentavos / t.limiteCentavos) * 1000) / 10 : 0,
    millasTotales: Math.round(sumar(ciclos.map((c) => c.millas)) * 100) / 100,
    ...fin, alertas,
  };
}

function panelTarjetas(tarjetas, gastos, hoy, pagados = []) {
  const resumenes = tarjetas.map((t) => resumenDeTarjeta(t, gastos, hoy, pagados));
  const proximosVencimientos = resumenes.filter((r) => r.proximoAPagar).map((r) => ({
    tarjetaId: r.tarjeta.id, tarjeta: r.tarjeta.nombre, cicloId: r.proximoAPagar.cicloId,
    vencimiento: r.proximoAPagar.vencimiento, dias: diasEntre(hoy, r.proximoAPagar.vencimiento),
    totalCentavos: r.proximoAPagar.totalCentavos,
  })).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  return {
    resumenes, proximosVencimientos, alertas: resumenes.flatMap((r) => r.alertas),
    aPagarCentavos: sumar(proximosVencimientos.map((v) => v.totalCentavos)),
    vencidoCentavos: sumar(resumenes.flatMap((r) => r.vencidos.map((v) => v.totalCentavos))),
    deudaTotalCentavos: sumar(resumenes.map((r) => r.comprometidoCentavos)),
    millasTotales: Math.round(sumar(resumenes.map((r) => r.millasTotales)) * 100) / 100,
  };
}

function mesesHasta(hoy, limite) {
  const h = parseFecha(hoy), l = parseFecha(limite);
  const bruto = l.y * 12 + l.m - (h.y * 12 + h.m);
  return Math.max(0, l.d >= h.d ? bruto : bruto - 1);
}

function progresoDeMeta(meta, aportes, hoy) {
  const mios = aportes.filter((a) => a.metaId === meta.id);
  const acumuladoCentavos = sumar(mios.map((a) => a.montoCentavos));
  const objetivo = meta.objetivoCentavos || 0;
  const faltaCentavos = Math.max(0, objetivo - acumuladoCentavos);
  const porPersona = {};
  for (const a of mios) porPersona[a.persona || 'Sin asignar'] = (porPersona[a.persona || 'Sin asignar'] || 0) + a.montoCentavos;
  const porcentaje = objetivo > 0 ? Math.round((acumuladoCentavos / objetivo) * 1000) / 10 : 0;
  const alcanzada = objetivo > 0 && acumuladoCentavos >= objetivo;
  const base = {
    meta, acumuladoCentavos, faltaCentavos, porcentaje,
    porcentajeBarra: Math.min(100, Math.max(0, porcentaje)), alcanzada, porPersona,
    aportes: mios.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    conFecha: Boolean(meta.fechaLimite), mesesRestantes: null, diasRestantes: null,
    sugerenciaMensualCentavos: null, vencida: false,
  };
  if (!meta.fechaLimite) return base;
  const diasRestantes = diasEntre(hoy, meta.fechaLimite);
  const mesesRestantes = mesesHasta(hoy, meta.fechaLimite);
  return { ...base, diasRestantes, mesesRestantes, vencida: diasRestantes < 0 && !alcanzada,
    sugerenciaMensualCentavos: alcanzada ? 0 : Math.ceil(faltaCentavos / Math.max(1, mesesRestantes)) };
}

function panelAhorros(metas, aportes, hoy) {
  const progresos = metas.map((m) => progresoDeMeta(m, aportes, hoy));
  const porPersona = {};
  for (const p of progresos) for (const [q, v] of Object.entries(p.porPersona)) porPersona[q] = (porPersona[q] || 0) + v;
  const totalAhorradoCentavos = sumar(progresos.map((p) => p.acumuladoCentavos));
  const totalObjetivoCentavos = sumar(progresos.map((p) => p.meta.objetivoCentavos || 0));
  return {
    metas: progresos, totalAhorradoCentavos, totalObjetivoCentavos,
    totalFaltaCentavos: Math.max(0, totalObjetivoCentavos - totalAhorradoCentavos),
    porcentajeGlobal: totalObjetivoCentavos > 0 ? Math.round((totalAhorradoCentavos / totalObjetivoCentavos) * 1000) / 10 : 0,
    porPersona, compromisoMensualCentavos: sumar(progresos.map((p) => p.sugerenciaMensualCentavos || 0)),
  };
}

const mesDe = (iso) => iso.slice(0, 7);

/* — FILTROS de la lista de gastos. Un filtro vacío quiere decir "todos". */
function filtrarGastos(gastos, filtros = {}) {
  const { mes, categoria, persona } = filtros;
  return gastos.filter((g) =>
    (!mes || mesDe(g.fecha) === mes)
    && (!categoria || g.categoria === categoria)
    && (!persona || g.persona === persona));
}

/* Los meses que tienen algún gasto, del más nuevo al más viejo. */
function mesesConGastos(gastos) {
  return [...new Set(gastos.map((g) => mesDe(g.fecha)))].sort().reverse();
}

function balanceMensual({ mes, sueldos, gastos, tarjetas, aportes, hoy, pagados }) {
  const ingresoCentavos = sumar(Object.values(sueldos || {}));
  const gastoDirectoCentavos = sumar(gastos.filter((g) => !g.tarjetaId && mesDe(g.fecha) === mes).map((g) => g.montoCentavos));
  const pagos = [];
  for (const t of tarjetas) {
    for (const c of resumenDeTarjeta(t, gastos, hoy, pagados).ciclos) {
      if (mesDe(c.vencimiento) === mes && c.totalCentavos > 0 && c.estado !== 'pagado') {
        pagos.push({ tarjeta: t.nombre, vencimiento: c.vencimiento, totalCentavos: c.totalCentavos });
      }
    }
  }
  pagos.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  const pagosDeTarjetasCentavos = sumar(pagos.map((p) => p.totalCentavos));
  const aportesAhorroCentavos = sumar(aportes.filter((a) => mesDe(a.fecha) === mes).map((a) => a.montoCentavos));
  const egresosCentavos = gastoDirectoCentavos + pagosDeTarjetasCentavos + aportesAhorroCentavos;
  return {
    mes, ingresoCentavos, gastoDirectoCentavos, pagos, pagosDeTarjetasCentavos,
    aportesAhorroCentavos, egresosCentavos, disponibleCentavos: ingresoCentavos - egresosCentavos,
    consumoCentavos: sumar(gastos.filter((g) => mesDe(g.fecha) === mes).map((g) => g.montoCentavos)),
  };
}

export {
  aCentavos, sumar, repartir, formatear, formatearExacto,
  parseFecha, formatFecha, diasEnMes, clampDia, sumarMeses,
  diasAbsolutos, diasEntre, comparar, sumarDias, cicloId, hoyISO,
  cicloDeFecha, cierreDeCiclo, vencimientoDeCiclo,
  cuotasDeGasto, millasDe, financiacion,
  resumenDeTarjeta, panelTarjetas,
  mesesHasta, progresoDeMeta, panelAhorros,
  mesDe, balanceMensual, filtrarGastos, mesesConGastos,
  escapar, fechaCorta, MESES,
};
