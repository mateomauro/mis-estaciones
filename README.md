# Mis Estaciones

App para cargar las horas de cada estación de servicio y sacar las cuentas de la semana:
lo que se le cobra a CR, lo que se le paga a cada empleado y la ganancia. Arma dos PDF:
la planilla para CR y el detalle interno de pagos con todas las cuentas.

## Uso local

```bash
npm install
npm run dev    # abre en http://localhost:5173 (y en la red local para probar en el celular)
npm test       # pruebas de los cálculos con ejemplos reales
npm run build  # versión para publicar, en dist/
```

## Dónde está cada cosa

- `src/calculos.ts`: todas las reglas de cálculo (horas simples y extras, proporcional, fábrica, pago semanal).
- `src/planilla.ts`: los dos PDF.
- `src/pantallas/`: las pantallas de la app.
- `pruebas/`: pruebas de los cálculos, armadas con las hojas en papel.

## Publicación

Netlify publica solo cada vez que se sube un cambio a GitHub (configuración en `netlify.toml`).
Por ahora los datos se guardan en el navegador de cada dispositivo.
