-- Rol con el que el PORTAL se conecta a la base del Bus Turístico (`turismo`). Se corre UNA vez,
-- como el dueño de la base, con respaldo previo. No borra ni cambia datos: solo crea el rol y
-- otorga permisos. Docs: docs/PLAN_MIGRACION.md §4.
--
--   sudo -u postgres psql -d turismo -f deploy/sql/turismo-rol-portal.sql
--   sudo -u postgres psql -c "alter role portal_buses with password '...'"   -- la clave, a mano y fuera del historial
--
-- Después, en compartido/.env del portal:
--   BUSES_DATABASE_URL="postgresql://portal_buses:LA_CLAVE@127.0.0.1:5432/turismo"
--
-- Qué NO puede este rol: borrar reservas (tourist_bookings), vaciar tablas, cambiar el esquema ni
-- tocar las cuentas viejas del panel del bus (admin_profiles, admin_sessions) ni la memoria del bot.
-- Las reservas solo se crean por create_tourist_booking (la función atómica) y se cancelan
-- cambiando su estado.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'portal_buses') then
    create role portal_buses login;
  end if;
end $$;

grant connect on database turismo to portal_buses;
grant usage on schema public to portal_buses;

-- Lectura de todo lo operativo y de lo que el panel muestra.
grant select on
  tourist_circuits, tourist_departures, tourist_bookings, tourist_notification_logs,
  educational_bus_requests, educational_circuits, app_settings,
  photo_books, photo_book_photos, tour_guide_log,
  faqs, tourist_interactions
  to portal_buses;
grant select on all tables in schema public to portal_buses;  -- vistas kpi_* y tablas bicitour_*
revoke select on admin_profiles, admin_sessions, bot_chat_messages from portal_buses;

-- Escritura: lo que hace el panel y la API pública.
grant insert, update on tourist_bookings to portal_buses;                 -- sin DELETE
grant insert, update, delete on tourist_departures to portal_buses;       -- borrar solo sin reservas confirmadas (lo controla la app)
grant insert, update, delete on tourist_circuits to portal_buses;
grant insert on tourist_notification_logs to portal_buses;
grant insert, update on educational_bus_requests to portal_buses;
grant insert, update, delete on educational_circuits to portal_buses;
grant insert, update on app_settings to portal_buses;
grant insert, update, delete on photo_books, photo_book_photos to portal_buses;
grant insert, update on tour_guide_log to portal_buses;
grant insert, update, delete on faqs to portal_buses;
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'bicitour\_%' loop
    execute format('grant insert, update, delete on public.%I to portal_buses', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to portal_buses;
grant execute on function create_tourist_booking(bigint, text, text, text, text, integer, text, integer) to portal_buses;
do $$
begin
  if to_regprocedure('public.bicitour_bump_version(bigint)') is not null then
    execute 'grant execute on function public.bicitour_bump_version(bigint) to portal_buses';
  end if;
end $$;
