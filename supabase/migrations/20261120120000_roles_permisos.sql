-- Portal unificado: roles y permisos por módulo (turismo, cultura, buses, migue).
--
-- Hasta acá todo el equipo activo podía todo (public.es_admin()). Ahora cada cuenta tiene un rol y
-- los módulos en que trabaja. Las cuentas que ya existían quedan como superadmin: para nadie cambia
-- nada al aplicar esta migración. Las cuentas nuevas arrancan como editor sin módulos (no pueden
-- nada hasta que un superadmin les asigne módulos).
--
--   superadmin  todo, en todos los módulos, más cuentas y permisos
--   admin       en sus módulos: ver, editar, publicar, borrar, exportar, configurar
--   editor      en sus módulos: ver y editar borradores (no publica ni toca lo publicado)
--   consulta    en sus módulos: ver
--
-- Las mismas reglas están en lib/permisos.ts (servidor) y las pruebas comparan ambas.
-- Aditiva y reversible: supabase/rollback/20261120120000_roles_permisos.down.sql.

alter table public.admins
  add column rol text not null default 'superadmin'
    check (rol in ('superadmin', 'admin', 'editor', 'consulta')),
  add column modulos text[] not null default '{}'
    check (modulos <@ array['turismo', 'cultura', 'buses', 'migue']::text[]);
alter table public.admins alter column rol set default 'editor';

-- ¿La persona con sesión puede hacer `accion` en `modulo`?
create function public.puede(p_modulo text, p_accion text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() and a.activo
      and (
        a.rol = 'superadmin'
        or (p_modulo = any (a.modulos) and (
          p_accion = 'ver'
          or (p_accion = 'editar' and a.rol in ('admin', 'editor'))
          or (p_accion in ('publicar', 'borrar', 'exportar', 'configurar') and a.rol = 'admin')
        ))
      )
  )
$$;

create function public.es_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid() and a.activo and a.rol = 'superadmin')
$$;

-- Módulos a los que pertenece cada ficha. Los lugares son de turismo y de cultura (espacios
-- culturales); las categorías de la agenda, de cultura; el resto de la configuración, de turismo.
create function public.modulos_de(p_coleccion text, p_slug text) returns text[]
language sql immutable set search_path = '' as $$
  select case
    when p_coleccion = 'eventos' then array['cultura']
    when p_coleccion = 'lugares' then array['turismo', 'cultura']
    when p_coleccion = 'configuracion' and p_slug = 'categorias-agenda' then array['cultura']
    else array['turismo']
  end
$$;

create function public.puede_contenido(p_coleccion text, p_slug text, p_accion text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from unnest(public.modulos_de(p_coleccion, p_slug)) m where public.puede(m, p_accion))
$$;

-- Publicar, o tocar algo ya publicado, exige el permiso de publicar del módulo. Lo hace un
-- disparador porque RLS no compara la fila vieja con la nueva. Las tareas del servidor (semilla,
-- importadores) corren sin usuario y no pasan por acá.
create function public.controlar_publicacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.estado = 'publicado' or (tg_op = 'UPDATE' and old.estado = 'publicado'))
     and not public.puede_contenido(new.coleccion, new.slug, 'publicar') then
    raise exception 'Sin permiso para publicar en este módulo.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger contenidos_publicacion before insert or update on public.contenidos
  for each row execute function public.controlar_publicacion();

-- Políticas de contenidos: las del equipo pasan de es_admin() a permisos por módulo.
drop policy contenidos_equipo_ver on public.contenidos;
drop policy contenidos_equipo_alta on public.contenidos;
drop policy contenidos_equipo_cambio on public.contenidos;
drop policy contenidos_equipo_baja on public.contenidos;

create policy contenidos_equipo_ver on public.contenidos
  for select to authenticated using (public.puede_contenido(coleccion, slug, 'ver'));
create policy contenidos_equipo_alta on public.contenidos
  for insert to authenticated with check (public.puede_contenido(coleccion, slug, 'editar'));
create policy contenidos_equipo_cambio on public.contenidos
  for update to authenticated
  using (public.puede_contenido(coleccion, slug, 'editar'))
  with check (public.puede_contenido(coleccion, slug, 'editar'));
create policy contenidos_equipo_baja on public.contenidos
  for delete to authenticated using (public.puede_contenido(coleccion, slug, 'borrar'));

-- Cuentas: cada uno ve la suya; un superadmin ve y cambia todas (rol, módulos, activo, nombre).
-- Dar de alta el usuario de ingreso (auth.users) lo hace el servidor después de verificar que
-- quien pide es superadmin (o `npm run cuentas` en la consola).
drop policy admins_ver on public.admins;
create policy admins_ver on public.admins
  for select to authenticated using (user_id = auth.uid() or public.es_admin());
create policy admins_alta on public.admins
  for insert to authenticated with check (public.es_superadmin());
create policy admins_cambio on public.admins
  for update to authenticated using (public.es_superadmin()) with check (public.es_superadmin());
grant insert, update on public.admins to authenticated;

-- Un superadmin no puede quitarse a sí mismo el rol ni desactivarse (no deja el panel sin dueño).
create function public.proteger_superadmin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id = auth.uid() and old.rol = 'superadmin' and (new.rol <> 'superadmin' or not new.activo) then
    raise exception 'No podés quitarte el rol de superadministrador ni desactivar tu propia cuenta.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger admins_proteger before update on public.admins
  for each row execute function public.proteger_superadmin();

revoke execute on function public.puede(text, text), public.es_superadmin(), public.puede_contenido(text, text, text) from public;
grant execute on function public.puede(text, text), public.es_superadmin(), public.puede_contenido(text, text, text) to anon, authenticated;

-- Acciones del panel sobre otros sistemas (la base de buses): la aplicación las anota acá con el
-- actor real. Solo agrega filas; la tabla sigue siendo inmutable.
create function public.auditar_accion(p_actor uuid, p_accion text, p_tabla text, p_registro text, p_detalle jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (actor_id, actor_tipo, accion, tabla, registro_id, detalle)
  values (p_actor, case when p_actor is null then 'sistema' else 'admin' end, p_accion, p_tabla, p_registro, p_detalle)
$$;
revoke execute on function public.auditar_accion(uuid, text, text, text, jsonb) from public, anon, authenticated;
