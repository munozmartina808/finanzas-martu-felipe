# Finanzas

La app que usamos Martu y Felipe para llevar las cuentas de a dos: qué entra por
mes, qué se gasta, las tarjetas de crédito y los ahorros.

**Para usarla:** https://claude.ai/code/artifact/495a3e03-ed5a-42fd-b4d3-a194dd2d7fc9

Esa es la app de verdad, la que tiene los datos. Se abre en el celular o en la
computadora, y los dos vemos lo mismo al mismo tiempo.

---

## Qué se puede hacer

| Pestaña | Para qué sirve |
|---|---|
| **Inicio** | Cuánto entró y cuánto se gastó este mes, con la barra de cuánto queda. Los avisos importantes: qué vence, qué está por cerrar. |
| **Tarjetas** | Las 4 tarjetas. Se toca una y se ve su resumen: cuándo cierra, cuándo vence, cuánto hay que pagar y en qué se gastó. |
| **Gastos** | Cargar un gasto. Mientras se carga, la app avisa en qué resumen va a caer y cuándo se paga. |
| **Ahorros** | Las metas ("Vacaciones", "Auto") con lo que puso cada uno y cuánto falta. |

## Lo que más se usa

El botón **+** que está abajo a la derecha de cada tarjeta: carga un gasto con
esa tarjeta ya elegida, sin dar vueltas.

## La regla que hay que entender

Cada tarjeta tiene un **día de cierre**. Lo que comprás **hasta ese día** entra
en el resumen de este mes. Lo que comprás **después** ya cae en el del mes que
viene.

Por eso, cuando faltan pocos días para el cierre, la app avisa cuántos días de
más tenés para pagar si esperás a comprar después del cierre.

---

## Para el que toque el código

Antes que nada, leé **[MEMORIA.md](MEMORIA.md)**. Ahí está todo: cómo está
armado, qué no hay que romper y qué falta hacer.

**Lo mínimo que tenés que saber:**

- La app entera es un solo archivo: `app/finanzas.html`. Se abre con doble clic,
  sin instalar nada.
- Para cambiarla hay que **publicar sobre la misma dirección de arriba**, nunca
  crear una nueva. Ahí están los datos.
- La plata va en **centavos enteros**. Las fechas son **texto `'AAAA-MM-DD'`**.
  Las dos cosas tienen razones concretas explicadas en MEMORIA.md.
- El motor está escrito dos veces (en `motor/motor.js` y adentro del HTML).
  **Si cambiás la matemática, cambiala en los dos lados.**

**Antes de publicar cualquier cambio, correr las pruebas:**

```bash
cd motor && node --test
```

Tienen que dar **122 en verde**. Si algo está en rojo, no publiques.
