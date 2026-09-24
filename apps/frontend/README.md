# TutiMami POS — Frontend

Frontend responsive del sistema POS de TutiMami.

## Requisitos
- Node.js 20+
- Backend NestJS ejecutándose en `http://localhost:3000`
- PostgreSQL configurado por el backend

## Ejecutar

```powershell
cd apps/frontend
npm install
npm run dev
```

El frontend usa `VITE_API_URL` desde `.env` o por defecto `http://localhost:3000/api`.

## Diseño
- Responsive desktop/tablet/mobile
- Paleta premium negro, blanco, gris cálido y beige
- POS con catálogo, categorías, carrito y checkout
- Dashboard conectado a reportes reales
- Productos, clientes, inventario, ventas, reportes, usuarios, categorías, impresión y auditoría
