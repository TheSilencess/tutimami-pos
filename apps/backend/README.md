
## Restablecer la base de datos

Si quieres dejar la base completamente limpia, eliminando usuarios, productos, clientes, categorías, ventas y demás datos, y dejando únicamente el usuario administrador, ejecuta:

```bash
npm run prisma:reset-database
```

Este comando es DESTRUCTIVO. No lo ejecutes si necesitas conservar datos reales.

Después del reset queda únicamente:

- Usuario: `admin@admin.com`
- Contraseña: `Admin123!`

No se crean productos, clientes, categorías ni ventas de demostración.
