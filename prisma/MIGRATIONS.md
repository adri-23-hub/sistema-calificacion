# Instalación nueva y recuperación de migraciones

El historial actual no debe ejecutarse con `prisma migrate deploy` sobre una base vacía: dos migraciones de alteración tienen nombres anteriores a la inicial.

## Base vacía

`fresh-install.sql` se generó desde el esquema Prisma actual con `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. Crea el esquema completo, incluidas las fotografías y sin los campos retirados. Es exclusivamente para una base o esquema vacío; no ejecutarlo en una base existente.

Antes de usarlo, verificar el destino y probar en una base desechable. Después de aplicarlo en una base vacía, registrar las tres migraciones históricas como aplicadas con `prisma migrate resolve --applied NOMBRE`, una por cada directorio de `prisma/migrations`. Esto establece una línea base del esquema completo sin ejecutar las alteraciones fuera de orden. Las futuras migraciones deben tener nombres posteriores a `20261114_init`.

## Base existente

1. Crear y comprobar un respaldo restaurable.
2. Consultar `_prisma_migrations` y `prisma migrate status` en el entorno correcto.
3. Comparar el esquema real con `schema.prisma` y revisar el SQL de diferencia antes de aplicarlo a una copia.
4. Resolver el historial únicamente después de comprobar qué cambios existen realmente. No ejecutar `fresh-install.sql`, no resetear ni marcar migraciones a ciegas.

## Verificación remota — 5 de noviembre de 2026

Se comprobó la base configurada mediante una conexión con acceso de red habilitado:

- Las tres migraciones están aplicadas correctamente, sin registros fallidos ni revertidos.
- Los checksums de los archivos locales coinciden con los registrados en la base.
- La comparación del esquema remoto contra `schema.prisma` no produce cambios SQL.
- `prisma migrate deploy` terminó correctamente: no hay migraciones pendientes.

No se modificaron tablas, votos ni el historial. No fue necesario restaurar ni reconciliar esta base. El problema de orden de nombres sigue siendo relevante para bases vacías; el procedimiento de instalación nueva anterior todavía requiere una prueba en un entorno desechable.
