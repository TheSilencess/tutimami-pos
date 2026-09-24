# TutiMami POS

POS web monorepo para tienda de ropa y accesorios. PostgreSQL exclusivamente.

## Requisitos
- Node.js 20+
- PostgreSQL 16+

## Instalación

```bash
npm install
```

### PostgreSQL local
Crea una base `tutimami` con usuario `postgres` y contraseña `admin` en el puerto `5432`. Este proyecto no requiere Docker.

Copia `apps/backend/.env.example` a `apps/backend/.env` y `apps/frontend/.env.example` a `apps/frontend/.env`.

## Prisma

```bash
npm --workspace apps/backend run prisma:generate
npm --workspace apps/backend run prisma:migrate -- --name init
npm --workspace apps/backend run prisma:seed
```

Si la base ya está sincronizada y solo quieres regenerar el cliente:

```bash
npm --workspace apps/backend run prisma:generate
```

## Ejecutar
Terminal 1:
```bash
npm run dev:backend
```

Terminal 2:
```bash
npm run dev:frontend
```

Frontend: http://localhost:5173
Backend: http://localhost:3000/api

## Login inicial
- Email: `admin@admin.com`
- Password: `Admin123!`

Cambia esta contraseña después de la primera instalación.

## Comprobaciones
Backend:
```bash
npm --workspace apps/backend run build
npm --workspace apps/backend run prisma:generate
npx prisma validate --schema apps/backend/prisma/schema.prisma
```
Frontend:
```bash
npm --workspace apps/frontend run build
```

El seed inicial crea únicamente los datos técnicos necesarios para autenticación y permisos: roles, permisos y el administrador. No crea productos, categorías, clientes, ventas ni movimientos de inventario.
## Permisos actuales

- **ADMIN:** acceso completo al sistema.
- **CAJERO:** únicamente Punto de venta, Productos (crear) y Reportes. El flujo de venta conserva los permisos técnicos necesarios para consultar/crear clientes y emitir el comprobante.

Si ya tienes una base de datos creada y quieres actualizar los permisos sin borrar usuarios, productos, clientes ni ventas:

```powershell
cd apps/backend
npm run prisma:sync-permissions
```

Este comando no ejecuta el seed destructivo.


### Base limpia

Para eliminar todos los datos existentes y dejar únicamente el administrador `admin@admin.com` / `Admin123!`, ejecuta desde `apps/backend`:

```bash
npm run prisma:reset-database
```

Es un comando destructivo: elimina usuarios, productos, clientes, categorías, ventas, movimientos y demás datos de la base.
