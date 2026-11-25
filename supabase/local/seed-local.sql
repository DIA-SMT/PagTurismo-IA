-- Usuarios del panel SOLO para el modo local (PGlite). Credenciales de prueba.
-- En producción las cuentas se crean con `npm run cuentas` (ver deploy/README.md).
--   Contraseña de todas: turismo-local-2026
--   admin@ejemplo.test          superadmin (todo)
--   cultura@ejemplo.test        admin del módulo cultura
--   buses@ejemplo.test          admin del módulo buses y de Migue
--   editor@ejemplo.test         editor de turismo y cultura (no publica)
--   consulta@ejemplo.test       consulta de todos los módulos (solo ve)

insert into auth.users (id, email, email_confirmed_at, encrypted_password)
select id::uuid, email, now(), extensions.crypt('turismo-local-2026', extensions.gen_salt('bf'))
from (values
  ('00000000-0000-4000-d000-000000000001', 'admin@ejemplo.test'),
  ('00000000-0000-4000-d000-000000000002', 'cultura@ejemplo.test'),
  ('00000000-0000-4000-d000-000000000003', 'buses@ejemplo.test'),
  ('00000000-0000-4000-d000-000000000004', 'editor@ejemplo.test'),
  ('00000000-0000-4000-d000-000000000005', 'consulta@ejemplo.test')
) as u (id, email);

insert into public.admins (user_id, nombre, rol, modulos) values
  ('00000000-0000-4000-d000-000000000001', 'Equipo de Turismo (prueba)', 'superadmin', '{}'),
  ('00000000-0000-4000-d000-000000000002', 'Cultura (prueba)', 'admin', '{cultura}'),
  ('00000000-0000-4000-d000-000000000003', 'Buses (prueba)', 'admin', '{buses,migue}'),
  ('00000000-0000-4000-d000-000000000004', 'Editor (prueba)', 'editor', '{turismo,cultura}'),
  ('00000000-0000-4000-d000-000000000005', 'Consulta (prueba)', 'consulta', '{turismo,cultura,buses,migue}');
