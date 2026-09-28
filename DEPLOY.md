# Despliegue: Neon + Hostinger + Vercel

## 1. Base de datos en Neon

Crea un proyecto PostgreSQL y copia la cadena de conexión con SSL (`sslmode=require`). Conserva la contraseña fuera del repositorio. Ejecuta las migraciones **una sola vez** desde la raíz del proyecto, con `DATABASE_URL` apuntando a la base de Neon:

```bash
npm ci
npm --workspace apps/backend run prisma:generate
cd apps/backend
npx prisma migrate deploy
```

**Aviso:** el historial de migraciones existente contiene una alteración de `Customer.nit` a `NOT NULL`; sobre bases antiguas con clientes sin NIT puede fallar. Haz respaldo y revisa los datos antes de migrar una base ya poblada. El script `prisma:seed` borra datos y no debe ejecutarse sobre una base con datos reales. Para una base nueva, antes de activar producción, configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` únicos, ejecuta el seed desde un entorno de instalación local (`NODE_ENV` distinto de `production`) y luego elimina esas variables del servicio. Cambia la contraseña inicial al entrar.

## 2. Backend en Hostinger

Necesitas un plan con soporte de aplicaciones Node.js o un VPS. Usa Node.js 20 o 22 y despliega este repositorio; la aplicación está en `apps/backend`. En un VPS, desde la raíz:

```bash
npm ci
npm --workspace apps/backend run prisma:generate
npm --workspace apps/backend run build
npm --workspace apps/backend run start
```

Configura HTTPS público (por ejemplo `https://api.tudominio.com`). El servicio debe mantener el proceso Node activo y entregar `PORT` a la app. Variables en el servidor:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
JWT_SECRET=una_cadena_aleatoria_larga_y_privada
FRONTEND_URL=https://tu-sitio.vercel.app
PORT=3000
```

`FRONTEND_URL` debe ser el origen exacto, sin barra final ni ruta. Comprueba `https://api.tudominio.com/api/auth/me`: sin token debe responder 401, lo que confirma que la API está activa. No publiques `.env`.

## 3. Frontend en Vercel

Importa el repositorio con **Root Directory** `apps/frontend`, framework Vite, build `npm run build`, output `dist`. Define la variable de build:

```env
VITE_API_URL=https://api.tudominio.com/api
```

Vuelve a desplegar al cambiar esa variable. `vercel.json` permite abrir rutas como `/login` directamente. Una vez tengas la URL final de Vercel, actualiza `FRONTEND_URL` en Hostinger y reinicia el backend.

## Comprobación final

Inicia sesión, recarga la página, crea una categoría y producto, registra una venta, verifica el stock y cancela la venta. Prueba también el acceso con usuario cajero. El navegador debe aceptar cookies de terceros para renovar la sesión entre los dos dominios; usar subdominios propios del mismo dominio mejora esa compatibilidad.
