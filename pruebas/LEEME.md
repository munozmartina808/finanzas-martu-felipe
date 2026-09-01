# Pruebas de la app en un navegador

Estas pruebas **abren la app de verdad** en un navegador, tocan los botones como
los tocarías vos, y revisan que la pantalla muestre lo correcto.

La diferencia con las de `motor/`:

- `motor/` prueba **las cuentas** (que las cuotas sumen, que las fechas no se
  corran). Son rápidas: tardan menos de un segundo.
- `pruebas/` prueba **los botones** (que al tocar algo pase lo que tiene que
  pasar). Son más lentas: abren un navegador de verdad, tardan unos minutos.

## Cómo correrlas

```bash
cd pruebas
npm install     # una sola vez, baja el navegador de prueba
npm test
```

Tienen que dar **33 en verde**.

Si te dice que no encuentra el navegador, hay que indicarle dónde está:

```bash
CHROMIUM_PATH=/ruta/al/chrome npm test
```

## Qué revisan

| Grupo | Qué comprueba |
|---|---|
| **La app arranca bien** | Que abra sola desde el archivo, sin errores. Que estén las 4 pestañas y las 4 tarjetas en el orden correcto, negras las BLACK y doradas las GOLD. |
| **Cargar un gasto** | Que avise en qué resumen va a caer **antes** de guardarlo. Que un gasto después del cierre caiga en el mes siguiente. Que las cuotas se repartan. Que el saldo de la tarjeta suba. |
| **Buscar entre los gastos** | Los filtros por mes, categoría y persona; que se combinen; que el total sea correcto; que el botón de limpiar funcione; que los filtros no se pierdan al cambiar de pestaña. |
| **Metas de ahorro** | Registrar un aporte, **arreglarlo sin duplicarlo**, cambiar de quién fue, borrarlo, y ver todos cuando hay más de 6. |
| **La página de una tarjeta** | Que se abra con sus consumos, que "Ya pagué" saque el saldo, que Volver regrese, y que el botón **+** abra el gasto con esa tarjeta ya elegida. |
| **Inicio** | Que muestre el porcentaje gastado y que avise cuando te pasaste del sueldo. |

## Un detalle que hace tropezar

En pantalla, la plata se escribe con un **espacio especial** entre el `$` y el
número (uno que no se parte al final del renglón). Se ve igual que un espacio
común pero no lo es. Por eso, al comparar textos con plata, las pruebas usan
`\s` en vez de un espacio escrito a mano.

Lo mismo con los títulos que el diseño pone en MAYÚSCULAS: en el código dicen
"Vence" pero en pantalla se leen "VENCE", así que esas comparaciones no
distinguen mayúsculas.

## Historia

Acá había 12 pruebas que se perdieron cuando el repositorio quedó vacío (ver el
historial en [../MEMORIA.md](../MEMORIA.md)). No se pudieron recuperar porque,
a diferencia de la app, nunca estuvieron publicadas en ningún lado.

Estas 33 son nuevas, escritas de cero.
