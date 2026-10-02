# Actualización: apertura, cierre y reportes

1. Haz respaldo de tu base de datos antes de actualizar.
2. Conserva tu configuración actual de `.env` en backend y frontend.
3. Desde la raíz del proyecto ejecuta `npm install`.
4. En `apps/backend`, ejecuta `npx prisma migrate deploy`, luego `npx prisma generate` y `npm run build`.
5. En `apps/frontend`, ejecuta `npm run build`.
6. Publica el backend y frontend actualizados con tus variables de entorno actuales.

No ejecutes reset de base de datos ni seed para aplicar esta actualización. La migración agrega las tablas y relaciones sin borrar las ventas existentes.

## Uso

El cajero entra a Caja y turnos después del inicio de sesión. Selecciona el nombre de la caja (CAJA 1, CAJA 2, etc.) e ingresa el efectivo inicial; cero es válido. Cada cajero y cada nombre de caja solo pueden tener un turno abierto. El turno se conserva al cerrar sesión o recargar la página. Antes de vender, también el administrador debe abrir su caja.

Las ventas se vinculan al turno activo. En pagos mixtos, el efectivo neto descuenta el cambio entregado. Tarjeta y transferencia no aumentan el efectivo físico esperado. Efectivo esperado = fondo inicial + ventas netas de efectivo. Las ventas canceladas se excluyen. Para conservar un cierre definitivo, el sistema rechaza cancelaciones de ventas pertenecientes a turnos ya cerrados.

Al finalizar, abre Caja y turnos, revisa los montos, introduce el efectivo contado y confirma el cierre. Se guardan el fondo inicial, los tres métodos de pago, efectivo esperado, contado, diferencia y observaciones. Positivo indica sobrante; negativo indica faltante. Si hubo un retiro o gasto físico durante el turno, se reflejará en la diferencia: esta versión no incluye movimientos de retiros/gastos.

Los reportes de ventas y de cajas permiten día, semana (lunes a domingo) y mes, con descarga directa PDF. Usan horario de Guatemala. El historial de caja filtra por fecha de apertura del turno; todas sus ventas integran ese cuadre aunque el turno pase de medianoche. El administrador puede consultar todas las cajas; el cajero solo sus turnos. Los reportes de ventas mantienen el alcance general del permiso reports.view existente.

Las ventas anteriores se conservan en reportes de ventas, pero no se asignan retroactivamente a turnos.

## Verificación

Compilación de backend y frontend. Pruebas de cálculos de pagos mixtos/cambio, cancelaciones, centavos, fechas y generación PDF. Pruebas de apertura/cierre y auditoría con transacciones simuladas. No se ha conectado a tu base de datos de producción.

Después de compilar: `node tests/cash.test.cjs` y `node tests/cash-controller.test.cjs` desde la raíz.
