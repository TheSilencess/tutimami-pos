-- Add only the reprint permission; preserve all existing role assignments.
INSERT INTO "Permission" ("id", "key", "description")
VALUES ('permission_receipts_reprint', 'receipts.reprint', 'Reimprimir recibos')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'CAJERO' AND p."key" = 'receipts.reprint'
ON CONFLICT DO NOTHING;
