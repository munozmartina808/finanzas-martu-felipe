# MEMORIA del proyecto Finanzas

Este archivo es el estado del proyecto. Si alguien (o alguna IA) empieza a
trabajar acá de cero, esto es lo primero que tiene que leer.

Última actualización: **1 de septiembre de 2026** (segunda tanda del día)

---

## Qué es

**Finanzas** es la app que usamos Martu y Felipe para llevar las cuentas de a
dos: qué entra por mes, qué se gasta, las 4 tarjetas de crédito y los ahorros.

## Dónde vive la app de verdad

🔗 **https://claude.ai/code/artifact/495a3e03-ed5a-42fd-b4d3-a194dd2d7fc9**

> ⚠️ **REGLA NÚMERO UNO**
> Para cambiar la app hay que **publicar sobre ESA MISMA dirección**.
> No crear una nueva. Ahí están los datos guardados de Martu y Felipe.
> Publicar en otro lado significa perderlos de vista.

Los datos **no están en este repositorio**. Viven en la app publicada (la
capacidad `db`, compartida entre los dos). Este repositorio guarda el *código*,
no la plata.

---

## Las carpetas

```
finanzas-martu-felipe/
├── MEMORIA.md          ← este archivo: el estado del proyecto
├── README.md           ← cómo se usa la app
├── app/
│   └── finanzas.html   ← LA APP ENTERA. Un solo archivo, se abre con doble clic.
├── motor/              ← la matemática sola, con sus pruebas
│   ├── motor.js        ← las cuentas (copia gemela de la que está en el HTML)
│   ├── motor.test.js   ← 98 pruebas de la matemática
│   ├── copia-fiel.test.js ← 37 pruebas que vigilan que las dos copias no se separen
│   └── package.json
└── pruebas/            ← 33 pruebas que manejan la app en un navegador de verdad
    ├── app.test.js
    ├── package.json
    └── LEEME.md
```

**Para correr las pruebas — las dos tandas, siempre antes de publicar:**

```bash
cd motor && node --test        # 135 pruebas · las CUENTAS · tarda 1 segundo
cd pruebas && npm test         # 33 pruebas · los BOTONES · tarda unos minutos
```

Total: **168 en verde**. Si alguna se pone en rojo, algo se rompió: no publicar.

(Las de `pruebas/` necesitan `npm install` la primera vez. Las de `motor/` no
necesitan instalar nada.)

---

## La regla del ciclo (el corazón de todo)

Es lo más importante de la app y está resuelta y probada:

- Gasto **hasta el día de cierre** → entra en el resumen de **ESTE** mes.
- Gasto **después del cierre** → entra en el del mes **SIGUIENTE**.

Casos difíciles cubiertos por las pruebas:

| Caso | Qué hace |
|---|---|
| La tarjeta cierra el 31 y estamos en febrero | Cierra el 28 (o el 29 si es bisiesto) |
| El día de vencimiento es anterior al de cierre | Se paga el mes siguiente |
| Un gasto en cuotas | Se reparte en resúmenes seguidos y **siempre suma el total exacto** |
| Faltan 5 días o menos para el cierre | Avisa cuántos días de financiación se ganan esperando |

Un detalle que descubrimos probando: **el día justo después del cierre ya es el
mejor momento para comprar** (se gana el ciclo entero, 45 días). Por eso el
aviso sólo aparece cuando el cierre está cerca — esperar recién conviene ahí.

---

## Cómo está hecho (NO LO ROMPAS)

1. **Un solo archivo.** `app/finanzas.html` no necesita instalar nada.
   Se abre con doble clic.

2. **La plata va en centavos enteros, nunca en decimales.**
   Si se usan decimales, las cuotas no cierran y aparecen o desaparecen
   centavos. Hay pruebas que revisan esto con 3.200 combinaciones distintas.

3. **Las fechas son texto `'AAAA-MM-DD'`, nunca objetos `Date` de JavaScript.**
   Con `Date` la fecha se corre un día según la zona horaria y el gasto termina
   cayendo en el resumen equivocado. Hay una prueba que vigila que nadie meta un
   `new Date('...')` en el motor.

4. **Los datos se guardan compartidos** (capacidad `db` de la app publicada)
   para que Felipe y Martu vean lo mismo. Si eso no está disponible, la app
   sigue andando y guarda en el navegador. Nunca se queda en blanco.

5. **El motor está escrito dos veces**, a propósito:
   - en `motor/motor.js`, donde viven las pruebas;
   - pegado adentro de `app/finanzas.html`, para que la app sea un solo archivo.

   👉 **Si cambiás la matemática, cambiala en LOS DOS lados.**
   `motor/copia-fiel.test.js` compara las dos copias función por función y te
   dice exactamente cuál quedó distinta. Está probado que salta de verdad.

---

## Lo que la app ya hace

- **Inicio** — lo primero que se ve es "cuánto tengo y cuánto gasto": el sueldo
  del mes y los gastos del mes, en grande, con el porcentaje y una barra. Si se
  pasa del sueldo, lo dice en rojo. Abajo: a pagar este mes, deuda con cuotas,
  millas y ahorrado.

- **Tarjetas** — las 4, en este orden exacto:
  1. BBVA BLACK VISA
  2. BBVA BLACK MASTERCARD
  3. GALICIA GOLD VISA
  4. GALICIA GOLD AMEX

  Se ven como en la app de un banco (negras degradadas las BLACK, doradas las
  GOLD, chip, la marca de la red arriba a la derecha, el saldo a pagar). Cada
  una tiene un botón **+** de acción rápida para cargar un gasto.

- **La página de cada tarjeta** — cierre, vencimiento, a pagar, botón
  "Ya pagué" (pasa el saldo al mes siguiente), la barra del ciclo, y la lista de
  consumos con nombre, fecha, monto y categoría.

- **Gastos** — nombre, monto, fecha, tarjeta, categoría (Comida, Pedidos,
  Supermercado, Viáticos, Salidas, Servicios, Salud, Ropa, Hogar, Otros),
  cuotas y quién lo hizo. Mientras se carga, avisa en qué resumen va a caer y
  cuándo se paga.

  Arriba de la lista hay **tres filtros**: por mes, por categoría y por quién.
  Se combinan entre sí, y el encabezado muestra cuántos gastos estás viendo y
  cuánto suman ("3 gastos de 12 · $45.000"). Los desplegables sólo ofrecen los
  meses, categorías y personas que existen de verdad en lo cargado.

- **Ahorros** — metas con nombre, objetivo, fecha límite opcional y aportes de
  cada uno. Muestra barra de progreso, porcentaje, cuánto falta y cuánto hay
  que poner por mes para llegar a la fecha.

  Cada aporte se puede **arreglar** con el lapicito: se abre el formulario
  completado con lo que tenía y se corrige en el lugar, sin duplicarlo. Cuando
  una meta tiene más de 6 aportes, un botón despliega todos.

---

## Lo que falta

1. **Cargar los datos reales de las 4 tarjetas.** Ahora tienen cierre 25 y
   vencimiento 10 puestos de mentira, por eso dicen "Completar datos".
   *Los carga Martu desde la app.*

2. **La estética de las tarjetas.** Martu quiere una parecida a la de la app del
   banco y mandó una foto de referencia que nunca llegó. Lo que hay ahora es una
   interpretación. *Falta que llegue la foto para ajustarla.*

3. **Unificar el motor duplicado.** Hoy está mitigado (el guardián avisa si las
   dos copias se separan), pero sigue habiendo dos copias.

### Ya hecho

- ~~Poder editar un aporte de ahorro ya cargado.~~ ✅ 1/9/2026
- ~~Filtrar los gastos por mes, por categoría o por persona.~~ ✅ 1/9/2026
- ~~Rehacer las pruebas de `pruebas/`.~~ ✅ 1/9/2026 — no son las 12 originales
  (se perdieron), son 33 nuevas escritas de cero.

---

## Historial

### 1 de septiembre de 2026 — Buscador de gastos y arreglar aportes

**Qué se agregó a la app:**

- **Filtros en la lista de gastos** (por mes, categoría y persona). Se combinan
  entre sí y el encabezado muestra el total de lo que se está viendo. Los
  desplegables se arman solos con lo que hay cargado: no ofrecen un mes o una
  categoría que no tenga ningún gasto.

- **Editar un aporte de ahorro ya cargado.** Antes había que borrarlo y cargarlo
  de nuevo. El lapicito abre el formulario completado y se corrige en el lugar.
  El botón Eliminar pasó a estar adentro del formulario, como en gastos y metas.
  Y como sólo se veían los últimos 6 aportes (y no se puede arreglar lo que no
  se ve), se agregó un botón para desplegarlos todos.

**Dónde se tocó:**

- `app/finanzas.html` — los filtros, el formulario de aporte y el motor.
- `motor/motor.js` — dos funciones nuevas: `filtrarGastos` y `mesesConGastos`.
  Se agregaron **en los dos lados** (módulo y HTML), como manda la regla.
- `motor/motor.test.js` — 13 pruebas nuevas del filtrado.
- `pruebas/app.test.js` — **carpeta estrenada**: 33 pruebas que abren la app en
  un navegador de verdad y tocan los botones.

**No se tocó** la regla del ciclo ni la matemática de las cuotas.

**Publicado** sobre la dirección de siempre, con los datos compartidos intactos.

---

### 1 de septiembre de 2026 — Rescate del proyecto

**Qué pasó:** al abrir el repositorio estaba **completamente vacío**. Sin ningún
archivo y sin ningún commit, ni acá ni en GitHub. `MEMORIA.md`, `README.md`,
`app/finanzas.html`, `motor/` y `pruebas/` no existían.

**Qué se pudo rescatar:** la app estaba sana y salva en la dirección publicada.
Se bajó de ahí y se guardó en `app/finanzas.html`. Se verificó que quedó
**idéntica bit por bit** (75.437 bytes) a la que está funcionando. Los datos de
Martu y Felipe nunca estuvieron en riesgo: viven en la app publicada, no acá.

**Qué se rehízo desde cero:**
- `motor/motor.js` — la matemática, sacada del HTML. Incluye `escapar`, `MESES` y
  `fechaCorta`, que el motor necesita para armar las alertas y que en el HTML
  viven en otro bloque.
- `motor/motor.test.js` — 85 pruebas nuevas (las 39 originales se perdieron),
  cubriendo todos los casos difíciles de la regla del ciclo.
- `motor/copia-fiel.test.js` — 37 pruebas nuevas que vigilan que las dos copias
  del motor no se separen. Se verificó que salta de verdad rompiendo el HTML a
  propósito.
- `MEMORIA.md` y `README.md`.

**Qué NO se pudo rescatar:** las 12 pruebas de `pruebas/` que manejaban la app
en un navegador. No hay de dónde sacarlas.

**Lo que NO se tocó:** la app publicada. Sigue exactamente igual — este rescate
sólo llenó el repositorio, no cambió nada de lo que Martu y Felipe usan.
