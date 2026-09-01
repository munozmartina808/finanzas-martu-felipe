# Pruebas de la app en un navegador

**Esta carpeta está vacía a propósito, y es una deuda pendiente.**

Acá vivían 12 pruebas que manejaban la app de verdad: abrían el archivo en un
navegador, tocaban los botones y revisaban que la pantalla mostrara lo correcto.

Se perdieron cuando el repositorio quedó vacío (ver el historial en
[../MEMORIA.md](../MEMORIA.md)) y no hay de dónde recuperarlas: a diferencia de
la app, nunca estuvieron publicadas en ningún lado.

## Qué queda cubierto igual

La **matemática** — que es donde de verdad se pueden colar los errores de plata —
está cubierta por las 122 pruebas de `motor/`:

```bash
cd motor && node --test
```

## Qué queda sin cubrir

Lo que las pruebas de esta carpeta miraban y hoy nadie mira automáticamente:

- Que los botones abran los diálogos que corresponden.
- Que cargar un gasto lo haga aparecer en la lista y en la tarjeta correcta.
- Que "Ya pagué" pase el saldo al mes siguiente.
- Que las 4 tarjetas se muestren en el orden correcto.
- Que la app arranque bien cuando no hay datos guardados.

Por ahora eso se revisa **a ojo**, abriendo `app/finanzas.html` y probando.

## Para rehacerlas

La herramienta natural sería Playwright, que ya viene instalado en este entorno.
Cada prueba abriría `app/finanzas.html` como archivo local (la app funciona sola,
sin la parte compartida: guarda en el navegador).
