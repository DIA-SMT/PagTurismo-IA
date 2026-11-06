-- Portal de Turismo de San Miguel de Tucumán: contenidos, equipo, auditoría e ingreso.
--
-- Cada ficha del sitio (lugar, experiencia, evento, recorrido, guía, destacado, plato,
-- escapada) es una fila de public.contenidos con sus datos en jsonb. La forma de cada
-- colección la definen lib/tipos.ts y lib/admin/esquemas.ts; la base garantiza estado,
-- slug, permisos y auditoría. Las funciones SECURITY DEFINER fijan search_path vacío.

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  activo boolean not null default true,
  creado_at timestamptz not null default now()
);

create table public.contenidos (
  coleccion text not null check (coleccion in (
    'lugares', 'experiencias', 'eventos', 'recorridos', 'planifica',
    'destacados', 'sabores', 'escapadas', 'configuracion'
  )),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  datos jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object'),
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  actualizado_por uuid,
  primary key (coleccion, slug)
);
create index contenidos_estado on public.contenidos (coleccion, estado);

-- Registro de auditoría: solo se agregan filas.
create table public.auditoria (
  id bigint generated always as identity primary key,
  ocurrido_at timestamptz not null default now(),
  actor_id uuid,
  actor_tipo text not null check (actor_tipo in ('admin', 'sistema')),
  accion text not null,
  tabla text,
  registro_id text,
  antes jsonb,
  despues jsonb,
  detalle jsonb
);
create index auditoria_fecha on public.auditoria (ocurrido_at desc);
create index auditoria_registro on public.auditoria (tabla, registro_id);

-- ---------------------------------------------------------------------------
-- 2. Reglas
-- ---------------------------------------------------------------------------

create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid() and a.activo
  )
$$;

-- Fecha y autor del último cambio de cada ficha.
create function public.tocar_contenido() returns trigger
language plpgsql as $$
begin
  new.actualizado_at := now();
  new.actualizado_por := auth.uid();
  return new;
end $$;

create trigger contenidos_tocar before insert or update on public.contenidos
  for each row execute function public.tocar_contenido();

create function public.impedir_truncate() returns trigger
language plpgsql as $$
begin
  raise exception 'No se permite vaciar la tabla %.', tg_table_name;
end $$;

create function public.proteger_auditoria() returns trigger
language plpgsql as $$
begin
  raise exception 'El registro de auditoría no se puede modificar ni borrar.';
end $$;

create trigger auditoria_inmutable before update or delete on public.auditoria
  for each row execute function public.proteger_auditoria();
create trigger auditoria_sin_truncate before truncate on public.auditoria
  for each statement execute function public.impedir_truncate();
create trigger contenidos_sin_truncate before truncate on public.contenidos
  for each statement execute function public.impedir_truncate();

-- Cada alta, cambio o baja de una ficha o del equipo queda en la auditoría con el antes y el después.
create function public.registrar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.auditoria (actor_id, actor_tipo, accion, tabla, registro_id, antes, despues)
  values (
    auth.uid(),
    case when auth.uid() is null then 'sistema' else 'admin' end,
    lower(tg_op),
    tg_table_name,
    case
      when tg_table_name = 'contenidos' then (v_fila ->> 'coleccion') || '/' || (v_fila ->> 'slug')
      else v_fila ->> 'user_id'
    end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

create trigger auditar after insert or update or delete on public.contenidos
  for each row execute function public.registrar_cambio();
create trigger auditar after insert or update or delete on public.admins
  for each row execute function public.registrar_cambio();

-- ---------------------------------------------------------------------------
-- 3. Permisos (RLS)
--    El sitio público lee como anon: solo fichas publicadas y la configuración.
--    El equipo (admins activos) lee y escribe todo.
-- ---------------------------------------------------------------------------

alter table public.contenidos enable row level security;
alter table public.admins enable row level security;
alter table public.auditoria enable row level security;

revoke all on table public.contenidos, public.admins, public.auditoria from public, anon, authenticated;

create policy contenidos_publicos on public.contenidos
  for select to anon, authenticated
  using (estado = 'publicado' or coleccion = 'configuracion');
create policy contenidos_equipo_ver on public.contenidos
  for select to authenticated using (public.es_admin());
create policy contenidos_equipo_alta on public.contenidos
  for insert to authenticated with check (public.es_admin());
create policy contenidos_equipo_cambio on public.contenidos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy contenidos_equipo_baja on public.contenidos
  for delete to authenticated using (public.es_admin());

grant select on public.contenidos to anon, authenticated;
grant insert, update, delete on public.contenidos to authenticated;

-- Las cuentas del equipo se dan de alta desde Supabase (ver README), no desde el sitio.
create policy admins_ver on public.admins
  for select to authenticated using (user_id = auth.uid() or public.es_admin());
grant select on public.admins to authenticated;

create policy auditoria_ver on public.auditoria
  for select to authenticated using (public.es_admin());
grant select on public.auditoria to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Fotos (Supabase Storage)
--    Bucket público "fotos": cualquiera las ve; solo el equipo sube o borra.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy fotos_equipo_alta on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and public.es_admin());
create policy fotos_equipo_baja on storage.objects
  for delete to authenticated using (bucket_id = 'fotos' and public.es_admin());

-- ---------------------------------------------------------------------------
-- 5. Límites de intentos de ingreso al panel
--    Supabase Auth limita por IP y ve la del servidor, compartida por todas las personas.
--    Estos límites cuentan por correo y por la IP de quien hace el pedido. No se guardan
--    correos ni IP en claro: la clave es un hash SHA-256. Los usa solo el servidor.
-- ---------------------------------------------------------------------------

create table public.intentos_ingreso (
  id bigint generated always as identity primary key,
  clave text not null,
  creado_at timestamptz not null default now()
);
create index intentos_ingreso_clave on public.intentos_ingreso (clave, creado_at desc);

alter table public.intentos_ingreso enable row level security;
revoke all on table public.intentos_ingreso from public, anon, authenticated;
revoke all on sequence public.intentos_ingreso_id_seq from public, anon, authenticated;

create function public.clave_ingreso(p_tipo text, p_valor text) returns text
language sql immutable set search_path = '' as $$
  select case
    when nullif(btrim(coalesce(p_valor, '')), '') is null then null
    else encode(extensions.digest(p_tipo || ':' || lower(btrim(p_valor)), 'sha256'), 'hex')
  end
$$;

-- 5 pruebas de contraseña en 15 minutos por correo o por IP. Devuelve 'ok', 'limite_correo' o 'limite_ip'.
create function public.ingreso_probar_contrasena(p_correo text, p_ip text) returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_correo text := public.clave_ingreso('correo', p_correo);
  v_ip text := public.clave_ingreso('ip', p_ip);
begin
  if v_correo is null then
    raise exception 'Falta el correo.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_correo, 0));

  if (select count(*) from public.intentos_ingreso
      where clave = v_correo and creado_at > now() - interval '15 minutes') >= 5 then
    return 'limite_correo';
  end if;
  if v_ip is not null and (select count(*) from public.intentos_ingreso
      where clave = v_ip and creado_at > now() - interval '15 minutes') >= 5 then
    return 'limite_ip';
  end if;

  delete from public.intentos_ingreso where creado_at < now() - interval '1 day';
  insert into public.intentos_ingreso (clave) values (v_correo);
  if v_ip is not null then
    insert into public.intentos_ingreso (clave) values (v_ip);
  end if;
  return 'ok';
end $$;

-- Con la contraseña correcta, los intentos anteriores de ese correo y esa IP dejan de contar.
create function public.ingreso_contrasena_correcta(p_correo text, p_ip text) returns void
language sql volatile set search_path = '' as $$
  delete from public.intentos_ingreso i
  where i.clave in (public.clave_ingreso('correo', p_correo), public.clave_ingreso('ip', p_ip))
$$;

revoke execute on function public.clave_ingreso(text, text) from public, anon, authenticated;
revoke execute on function public.ingreso_probar_contrasena(text, text) from public, anon, authenticated;
revoke execute on function public.ingreso_contrasena_correcta(text, text) from public, anon, authenticated;
