-- Vuelta atrás de 20261120120000_roles_permisos.sql. NO la aplica ningún script: se corre a mano,
-- con un respaldo previo, solo si hay que volver a la versión anterior del portal Y la versión
-- anterior no funcionara con la base migrada (no debería: las columnas nuevas tienen valor por defecto).
-- Conserva las columnas rol y modulos (no borra datos); solo restaura las políticas originales.
begin;
drop trigger if exists contenidos_publicacion on public.contenidos;
drop trigger if exists admins_proteger on public.admins;
drop policy if exists contenidos_equipo_ver on public.contenidos;
drop policy if exists contenidos_equipo_alta on public.contenidos;
drop policy if exists contenidos_equipo_cambio on public.contenidos;
drop policy if exists contenidos_equipo_baja on public.contenidos;
create policy contenidos_equipo_ver on public.contenidos for select to authenticated using (public.es_admin());
create policy contenidos_equipo_alta on public.contenidos for insert to authenticated with check (public.es_admin());
create policy contenidos_equipo_cambio on public.contenidos for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy contenidos_equipo_baja on public.contenidos for delete to authenticated using (public.es_admin());
drop policy if exists admins_alta on public.admins;
drop policy if exists admins_cambio on public.admins;
drop policy if exists admins_ver on public.admins;
create policy admins_ver on public.admins for select to authenticated using (user_id = auth.uid() or public.es_admin());
revoke insert, update on public.admins from authenticated;
-- Para que la migración se pueda volver a aplicar con `npm run db:migrar`:
--   alter table public.admins drop column rol, drop column modulos;  (solo si se decide perder los roles)
--   delete from supabase_migrations.schema_migrations where version = '20261120120000';
commit;
