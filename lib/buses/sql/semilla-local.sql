-- SOLO desarrollo local y pruebas: salidas y reservas DE PRUEBA, con fechas relativas a hoy.
-- Correos @ejemplo.test. Nunca se aplica a la base real.
insert into tourist_departures (circuit_slug, title, departure_date, departure_time, capacity, meeting_point, notes, bike_stock, status) values
  ('historico-cultural', 'Histórico Cultural (PRUEBA)', current_date + 1, '10:00', 40, 'Plaza Independencia', 'Salida de prueba local', null, 'active'),
  ('historico-cultural', 'Histórico Cultural (PRUEBA)', current_date + 3, '10:00', 40, 'Plaza Independencia', null, null, 'active'),
  ('lugares-notables', 'Lugares Notables (PRUEBA)', current_date + 2, '17:00', 4, 'Plaza Independencia', 'Cupo chico para probar el «sin lugar»', null, 'active'),
  ('pedaleando-parque', 'Pedaleando el Parque (PRUEBA)', current_date + 2, '09:00', 15, 'Parque 9 de Julio', null, 6, 'active'),
  ('nocturno-recordar', 'Nocturno (PRUEBA)', current_date + 5, '20:30', 30, 'Plaza Independencia', null, null, 'cancelled'),
  ('historico-cultural', 'Histórico Cultural (PRUEBA, ya salió)', current_date, '00:01', 40, 'Plaza Independencia', 'Salida de hoy que ya partió', null, 'active');

insert into tourist_bookings (departure_id, full_name, email, phone, origin_city, people_count, language, status) values
  (1, 'Persona de Prueba Uno', 'uno@ejemplo.test', '3810000001', 'San Miguel de Tucumán, Tucumán, Argentina', 2, 'es', 'confirmed'),
  (3, 'Persona de Prueba Dos', 'dos@ejemplo.test', '3810000002', 'Córdoba, Córdoba, Argentina', 3, 'es', 'confirmed'),
  (1, 'Test Person Three', 'tres@ejemplo.test', '3810000003', 'Santiago, Chile', 1, 'en', 'cancelled');

insert into faqs (pregunta, respuesta, categoria, activo, orden) values
  ('¿El Bus Turístico es gratis? (PRUEBA)', 'Sí, con reserva previa en el portal.', 'excursiones', true, 1),
  ('¿Dónde sale el bus? (PRUEBA)', 'Desde Plaza Independencia.', 'transporte', true, 2);

insert into tourist_interactions (chat_id, user_name, intent, language, query_text, bot_response, origen_provincia) values
  ('web:prueba-1', 'Prueba', 'excursiones', 'es', '¿Qué salidas hay mañana?', 'Respuesta de prueba', 'Córdoba'),
  ('tg:prueba-2', 'Prueba', 'gastronomia', 'es', '¿Dónde como empanadas?', 'Respuesta de prueba', 'Tucumán'),
  ('5493810000000', 'Test', 'museos', 'en', 'Museum hours?', 'Test answer', 'Chile');
