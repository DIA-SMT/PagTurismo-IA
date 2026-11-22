-- Portal unificado — mejora ADITIVA e idempotente sobre la base del Bus Turístico.
-- En la VPS se aplica con deploy/sql/turismo-mejoras.sql (mismo contenido), con respaldo previo.
--
-- Una misma persona (correo) no puede tener dos reservas CONFIRMADAS en la misma salida. La función
-- create_tourist_booking no se toca: si el INSERT choca con este índice, la base lo rechaza y la API
-- responde «ya tenés una reserva en esta salida». Si la base ya tuviera duplicados, el índice NO se
-- crea (se avisa) y la API igual los frena con su propio control.
do $$
begin
  if to_regclass('public.idx_tourist_bookings_un_confirmado_por_correo') is not null then
    return;
  end if;
  if exists (
    select 1 from tourist_bookings where status = 'confirmed'
    group by departure_id, lower(email) having count(*) > 1
  ) then
    raise notice 'Hay reservas confirmadas duplicadas por correo: no se crea el índice. Revisarlas a mano.';
  else
    create unique index idx_tourist_bookings_un_confirmado_por_correo
      on tourist_bookings (departure_id, lower(email)) where status = 'confirmed';
  end if;
end $$;
