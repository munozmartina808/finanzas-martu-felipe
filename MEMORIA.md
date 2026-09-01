# MEMORIA del proyecto Finanzas

Este archivo es el estado del proyecto. Si alguien (o alguna IA) empieza a
trabajar acá de cero, esto es lo primero que tiene que leer.

Última actualización: **1 de septiembre de 2026** (cuarta tanda del día)

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
├── motor/              ← las pruebas de la matemática
│   ├── motor.js        ← NO tiene el motor: lo LEE de app/finanzas.html
│   ├── motor.test.js   ← 148 pruebas de la matemática
│   ├── reglas.test.js  ← 9 pruebas de que el motor siga siendo matemática pura
│   └── package.json
└── pruebas/            ← 74 pruebas que manejan la app en un navegador de verdad
    ├── app.test.js
    ├── package.json
    └── LEEME.md
```

**Para correr las pruebas — las dos tandas, siempre antes de publicar:**

```bash
cd motor && node --test        # 157 pruebas · las CUENTAS · tarda 1 segundo
cd pruebas && npm test         # 74 pruebas · los BOTONES · tarda unos minutos
```

Total: **231 en verde**. Si alguna se pone en rojo, algo se rompió: no publicar.

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
| **El banco cambia el cierre cada mes** | Cada tarjeta guarda los días reales de cada mes; mientras falten avisa y usa los de siempre |

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

5. **"Fijo" quiere decir UNA sola cosa: que se repite todos los meses.**
   Es lo que decide tanto el grupo en que se muestra el gasto como lo que el
   balance proyecta hacia adelante. Que una categoría sea fija (Alquiler,
   Psicóloga) sólo hace que el formulario marque solo "gasto fijo": no
   convierte en fijo un gasto que pasó una vez. Si fueran dos criterios
   distintos, la pantalla diría una cosa y las cuentas otra.

6. **El motor está escrito UNA sola vez**, adentro de `app/finanzas.html`,
   entre los marcadores `▼▼▼ EMPIEZA EL MOTOR ▼▼▼` y `▲▲▲ TERMINA EL MOTOR ▲▲▲`.

   👉 **Si cambiás la matemática, se cambia ahí y en ningún otro lado.**

   `motor/motor.js` no tiene una copia: lee ese bloque del HTML y lo deja listo
   para las pruebas. Por eso las pruebas prueban, letra por letra, el mismo
   código que corre la app.

   ⚠️ **No borres los dos marcadores.** Si desaparecen, las pruebas no
   encuentran el motor (y te lo dicen con todas las letras).

---

## Lo que la app ya hace

- **Inicio** — lo primero que se ve es "cuánto tengo y cuánto gasto": el sueldo
  del mes y los gastos del mes, en grande, con el porcentaje y una barra. Si se
  pasa del sueldo, lo dice en rojo.

  Debajo, **cómo viene el mes que viene**: lo que entra y lo que ya está
  comprometido (resúmenes de tarjeta que vencen, cuotas que caen y gastos
  fijos), con cuánto queda libre antes de gastar nada. No es un borrador ni una
  estimación: es plata que ya está comprometida.

  ⚠️ **Se muestra SIEMPRE, aunque esté todo en cero.** Escondido cuando no hay
  datos es escondido justo cuando hace falta explicar para qué sirve. Hay una
  prueba que lo vigila.

- **Tarjetas** — las 4, en este orden exacto:
  1. BBVA BLACK VISA
  2. BBVA BLACK MASTERCARD
  3. GALICIA GOLD VISA
  4. GALICIA GOLD AMEX

  Se ven como en la app de un banco (negras degradadas las BLACK, doradas las
  GOLD, chip, la marca de la red arriba a la derecha, el saldo a pagar). Cada
  una tiene un botón **+** de acción rápida para cargar un gasto.

  Arriba de todo está **el total de las 4 juntas**, y abajo un **gráfico de
  barras** de en qué se fue más la plata, por categoría.

  Todos los meses aparece un **aviso para cargar el cierre y el vencimiento**,
  porque el banco los cambia. Mientras falten se usan los de siempre.

- **La página de cada tarjeta** — cierre, vencimiento, a pagar, botón
  "Ya pagué" (pasa el saldo al mes siguiente), la barra del ciclo, y la lista de
  consumos con nombre, fecha, monto y categoría.

- **Gastos** — nombre, monto, fecha, tarjeta, categoría, cómo se paga y quién
  lo hizo. Mientras se carga, avisa en qué resumen va a caer y cuándo se paga.

  Arriba de la lista hay **tres filtros**: por mes, por categoría y por quién.
  Se combinan entre sí, y el encabezado muestra cuántos gastos estás viendo y
  cuánto suman ("3 gastos de 12 · $45.000"). Los desplegables sólo ofrecen los
  meses, categorías y personas que existen de verdad en lo cargado.

  Al cargar un gasto se elige **cómo se paga**: un solo pago, en cuotas, o
  **gasto fijo** (se repite todos los meses). La lista se separa en **fijos y
  variables**, con el total de cada grupo y un gráfico por categoría.

  **Mientras cargás el gasto, un cartel dice cómo te pega en el mes que viene**:
  cuánto suma, de cuánto a cuánto pasa lo ya comprometido y cuánto te quedaría
  libre. En rojo si el mes deja de cerrar. Es lo que Martu más quería: *"hacer un
  gasto hoy sabiendo cómo me impacta el mes que viene"*.

  Las **categorías son editables** y se guardan: vienen Alquiler, Expensas,
  Tarjeta, Psicóloga, Cerámica, Servicios, Internet y celular, Gimnasio,
  Suscripciones, Comida, Pedidos, Supermercado, Viáticos, Salidas, Salud, Ropa,
  Hogar, Regalos y Otros. Se puede agregar una nueva desde el mismo formulario,
  diciendo si es fija o variable.

- **Ahorros** — metas con nombre, objetivo, fecha límite opcional y aportes de
  cada uno. Muestra barra de progreso, porcentaje, cuánto falta y cuánto hay
  que poner por mes para llegar a la fecha.

  Cada aporte se puede **arreglar** con el lapicito: se abre el formulario
  completado con lo que tenía y se corrige en el lugar, sin duplicarlo. Cuando
  una meta tiene más de 6 aportes, un botón despliega todos.

- **Historial** — cómo fue cada mes que pasó: cuánto entró, cuánto se gastó y
  cuánto sobró, con una barra para comparar de un vistazo. Se arma solo con los
  gastos cargados; no hay que guardar nada a mano.

- **Sueldo** — el total entre los dos, cuánto pone cada uno y contra qué se
  compara (lo gastado este mes y lo comprometido para el que viene).
  ⚠️ Es la **versión simple**: Martu dijo que después explica cómo la quiere.

- **Millas** — el total juntado, cuánto suma cada tarjeta y cuáles todavía no
  tienen cargado cuántas millas dan por cada $1.000.

---

## Lo que falta

1. **Cómo quiere Martu la pestaña Sueldo.** Dijo "después te explico". Por ahora
   está la versión simple. *Falta que Martu cuente qué necesita.*

2. **Cargar los datos reales de las 4 tarjetas.** Ahora tienen cierre 25 y
   vencimiento 10 puestos de mentira, por eso dicen "Completar datos".
   *Los carga Martu desde la app.*

3. **La estética de las tarjetas.** Martu quiere una parecida a la de la app del
   banco y mandó una foto de referencia que nunca llegó. Lo que hay ahora es una
   interpretación. *Falta que llegue la foto para ajustarla.*

*(Nada pendiente del lado técnico. Los tres puntos dependen de Martu.)*

### Ya hecho

- ~~Poder editar un aporte de ahorro ya cargado.~~ ✅ 1/9/2026
- ~~Filtrar los gastos por mes, por categoría o por persona.~~ ✅ 1/9/2026
- ~~Rehacer las pruebas de `pruebas/`.~~ ✅ 1/9/2026 — no son las 12 originales
  (se perdieron), son 33 nuevas escritas de cero.
- ~~Unificar el motor duplicado.~~ ✅ 1/9/2026
- ~~Cómo viene el mes que viene, en Inicio.~~ ✅ 1/9/2026
- ~~Sacar el card redundante de Inicio.~~ ✅ 1/9/2026
- ~~Total de todas las tarjetas y gráfico por categoría.~~ ✅ 1/9/2026
- ~~Alerta mensual para cargar cierre y vencimiento.~~ ✅ 1/9/2026
- ~~Categorías completas y editables.~~ ✅ 1/9/2026
- ~~Separar gastos fijos de variables.~~ ✅ 1/9/2026
- ~~Elegir fijo / cuotas / un solo pago.~~ ✅ 1/9/2026
- ~~Pestañas Historial, Sueldo y Millas.~~ ✅ 1/9/2026

---

## Historial

### 1 de septiembre de 2026 — Lo que Martu pedía y no veía

Martu avisó que en Inicio no aparecía lo que había pedido. Se auditó la app
**vacía, como la ve ella** (sin sueldo, sin gastos, tarjetas sin configurar) y
aparecieron tres fallas reales:

1. **El bloque "cómo viene el mes que viene" no se veía nunca.** Tenía esta
   condición: `if (!hayAlgo) return ''` — se escondía si no había sueldo cargado
   ni nada comprometido. O sea: se ocultaba exactamente en el estado en que
   estaba su app. Ahora se muestra siempre y, cuando está en cero, explica qué
   va a aparecer ahí y ofrece cargar el sueldo.

2. **El gráfico de categorías tampoco.** Desaparecía sin gastos. Ahora avisa que
   ahí se va a ver en qué se fue la plata.

3. **Faltaba lo que Martu más quería:** al cargar un gasto, saber cómo le pega
   en el mes que viene. No estaba hecho.

Y además Inicio repetía **cuatro veces** el mismo aviso de cierre y vencimiento,
uno por tarjeta. Ahora es uno solo, agrupado, con un botón que lleva a Tarjetas.

**El impacto del gasto** (`impactoDeGasto` en el motor) corre la misma cuenta del
balance **dos veces, con y sin el gasto**, y compara. Por eso las cuotas, los
gastos fijos y la regla del ciclo se respetan solos: no hay una segunda cuenta
que pueda quedar desincronizada. Muestra cuánto suma, de cuánto a cuánto pasa lo
comprometido, cuánto quedaría libre, y avisa en rojo si el mes deja de cerrar.
Si el gasto cae después del cierre y no toca el mes que viene, dice en cuál sí.

**Lección para la próxima:** probar siempre con la app **vacía**, no sólo con
datos cargados. Las pruebas nuevas incluyen un grupo entero para eso.

**Pruebas:** 157 de la matemática (10 nuevas) y 74 del navegador (12 nuevas).

---

### 1 de septiembre de 2026 — Tanda grande: 11 pedidos de Martu

**Inicio**
- Se agregó **cómo viene el mes que viene**: lo que entra y lo que ya está
  comprometido (resúmenes de tarjeta que vencen, cuotas que caen, gastos fijos),
  con cuánto queda libre. Es plata ya comprometida, no una estimación.
- Se eliminó el card de "a pagar este mes / deuda / millas / ahorrado", que
  repetía lo que ya se ve en Tarjetas y en Millas.

**Tarjetas**
- El **total de las 4 juntas** arriba de todo.
- Un **gráfico de barras** de en qué se fue más la plata, por categoría.
- **El cierre y el vencimiento ahora cambian mes a mes.** Cada tarjeta guarda
  los días reales de cada mes en `t.ciclos`, y mientras falten se usan los de
  siempre con un aviso. Cambiar el cierre de un mes **mueve los gastos de
  resumen**, que es el punto de todo esto.

**Gastos**
- Al cargar se elige **cómo se paga**: un solo pago, en cuotas o **gasto fijo**.
- La lista se separa en **fijos y variables**, con el total de cada grupo.
- Las **categorías son editables** y se guardan en config. Vienen las que pidió
  Martu (alquiler, tarjeta, psicóloga, cerámica…) y se puede agregar una nueva
  desde el mismo formulario.
- Al elegir una categoría fija, la forma de pago "gasto fijo" se marca sola.

**Tres pestañas nuevas:** Historial, Sueldo y Millas.

**Una decisión de diseño:** al probar apareció una incoherencia. Un gasto de
"Servicios" cargado una sola vez aparecía bajo *Gastos fijos* (porque la
categoría es fija) pero **no se repetía** el mes siguiente: la pantalla decía una
cosa y las cuentas otra. Se unificó — **fijo quiere decir una sola cosa: que se
repite todos los meses** — y para que no sea trabajo extra, elegir una categoría
fija marca sola la forma de pago.

**Compatibilidad:** se verificó con datos del formato viejo (sin `tipoPago`, sin
`ciclos`, sin categorías en config) que la app abre, muestra todo bien y deja
editar sin que haya que tocar nada.

**Pruebas:** 147 de la matemática (42 nuevas) y 62 del navegador (29 nuevas).
209 en verde.

**Pendiente:** Martu dijo que después explica cómo quiere la pestaña Sueldo. Lo
que hay es la versión simple.

---

### 1 de septiembre de 2026 — El motor unificado

**El problema:** el motor estaba escrito dos veces, una en `motor/motor.js` y
otra pegada adentro de `app/finanzas.html`. Si alguien cambiaba una y se
olvidaba de la otra, las pruebas probaban una cuenta y la app hacía otra.

**Por qué existía esa duplicación:** la app tiene que ser un solo archivo que se
abre con doble clic, sin instalar nada. Eso obliga a que el motor viva adentro
del HTML — un navegador no puede cargar un archivo `.js` de al lado cuando abrís
un HTML suelto (lo bloquea por seguridad). Así que la copia dentro del HTML no
se puede eliminar.

**La solución fue al revés de lo que parece:** en vez de sacar el motor del HTML,
se eliminó la copia de `motor/motor.js`. Ahora ese archivo **lee** el motor de
`app/finanzas.html`, entre dos marcadores, y lo deja listo para las pruebas.

Resultado: la matemática está escrita **en un solo lugar**, y las pruebas prueban
letra por letra el mismo código que corre la app. Antes probaban una copia que
podía haberse separado.

**Qué se tocó:**

- `app/finanzas.html` — se agregaron los marcadores `▼▼▼ EMPIEZA EL MOTOR ▼▼▼` y
  `▲▲▲ TERMINA EL MOTOR ▲▲▲`. Se mudaron `escapar`, `MESES` y `fechaCorta` del
  bloque de DATOS al del motor, que era lo único que el motor usaba de afuera.
  La matemática no se cambió.
- `motor/motor.js` — dejó de tener la copia; ahora extrae el motor del HTML.
- `motor/copia-fiel.test.js` — **eliminado**: comparaba las dos copias, y ya no
  hay dos.
- `motor/reglas.test.js` — nuevo, 9 pruebas. Se quedó con lo que seguía sirviendo
  del archivo anterior (que el motor no toque la pantalla, que no arme fechas con
  `Date`, que la plata sea entera) y suma que los marcadores estén y que no haya
  quedado otra copia suelta del motor.

**Verificado:** cambiando la matemática en el HTML a propósito, 5 pruebas del
motor se ponen en rojo al instante — o sea que de verdad leen la app. Y borrando
un marcador, el error explica qué pasó y cómo arreglarlo.

---

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
