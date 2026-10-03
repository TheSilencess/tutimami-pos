# Reimpresión para cajeros

Conserva tus .env, instala con npm install y publica el frontend/backend actualizados.

En apps/backend ejecuta `npx prisma migrate deploy` apuntando a la base de producción. La nueva migración agrega receipts.reprint al rol CAJERO sin eliminar permisos existentes ni datos. No ejecutes seed ni reset.

Después, cierra sesión y vuelve a entrar para actualizar los permisos del menú. Aparecerá Reimpresión de recibos; permite ventanas emergentes para abrir la impresión. El historial conserva el alcance existente (últimos 100 trabajos de impresión de la tienda).

La reimpresión también muestra todos los métodos de un pago dividido y su cambio correcto.
