# Auditoría técnica — BotTurismo-BackyFront ("Migue" + Bus Turístico/Educativo)

Repositorio auditado (solo lectura): `C:\Repos\FinalTurismo\_fuentes\BotTurismo-BackyFront`
Último commit: `1000e9b metadataBase con el dominio real y Telegram sin variables de Supabase` (rama `main`; remotos: Agustin, Lucas, matias, migracion-postgres, arreglos-post-migracion).
Destino de la integración: PagTurismo-IA (`C:\Repos\FinalTurismo`).
Fecha de la auditoría: 2026-11-20.

Rutas relativas a la raíz del repo auditado salvo que se indique otra cosa. "L" = número de línea.

---

## 0. Resumen ejecutivo

- **Dos aplicaciones en un repo**: sitio Next.js (`src/`, `middleware.ts`) y backend Express del bot (`backend/src`). Comparten **una sola base PostgreSQL** (sin Supabase en runtime desde el commit `b148051`), con SQL directo vía `postgres` (postgres.js 3.4.9).
- **Funcionalidades reales en producción**: reservas del Bus Turístico (con bicis municipales), solicitudes del Bus Educativo (con adjunto .docx), books de fotos con QR, panel admin (dashboard KPI, interacciones, FAQs, circuitos), login propio con bcrypt, Migue en WhatsApp (Cloud API de Meta), Telegram (grammY, long polling) y widget web.
- **Implementado pero apagado/oculto**: avisos por WhatsApp de reservas (`WHATSAPP_NOTIFICATIONS_ENABLED=false`, pausa por facturación de Meta) y **Bicitour en vivo** (funciona en `/admin/bicitour` y `/bicitour/[code]`, pero está comentado en el menú: `src/components/Sidebar.tsx` L13-15; el recorrido sembrado es `[DEMO]`).
- **Reserva atómica sólida**: función PL/pgSQL `create_tourist_booking` con `SELECT … FOR UPDATE` sobre la salida (`supabase_bike_availability_migration.sql` L17-114). Es lo que hay que preservar.
- **El bot NO reserva**: no usa tools/function calling; recibe en el prompt un resumen de circuitos y salidas con cupo leído directo de la base (`backend/src/services/db.js` L124-188) y deriva al link `/turistico`.
- **Contrato del chat incompatible con el destino**: este backend expone `POST /api/chat/web` con `{sessionId, kind, text|media|caption}` → `{reply}`; el `components/MigueTurismo.tsx` del portal destino llama `POST ${MIGUE_URL}/api/turismo/chat` con `{mensaje, sessionId, idioma}` y espera `{respuesta, acciones[]}`. Hay que adaptar uno de los dos lados.
- **Riesgos principales**: sin antiduplicado ni rate limit en reservas/solicitudes públicas; edición admin de cupo/fecha sin controles de consistencia; reconfirmación de reservas no atómica; reservas del mismo día aceptadas aunque la salida ya haya partido; books "privados" listados públicamente con su token; webhook de WhatsApp acepta pedidos sin firma si falta `WHATSAPP_APP_SECRET`; sin tests ni linter; orden de migraciones no documentado de forma ejecutable.

---

## 1. Dependencias y scripts

### 1.1 `package.json` (raíz, sitio Next.js) — nombre `dashboard` 0.1.0

| Paquete | Declarado | Bloqueado (package-lock) | Uso |
|---|---|---|---|
| next | `16.1.6` (exacto) | 16.1.6 | App Router |
| react / react-dom | `19.2.3` (exacto) | 19.2.3 | |
| postgres (postgres.js) | `^3.4.9` | 3.4.9 | `src/lib/db.ts` |
| nodemailer | `^9.0.5` | 9.0.5 | mails de reservas y recuperación de clave (`src/lib/tourist-booking-email.ts`, `src/lib/admin-auth.ts`) |
| bcryptjs | `^3.0.3` | 3.0.3 | hash de claves admin |
| leaflet | `^1.9.4` | 1.9.4 | mapas Bicitour (`src/components/bicitour/BicitourMap.tsx`), tiles OSM sin API key |
| qrcode | `^1.5.4` | 1.5.4 | QR de books (`PhotoBooksPage.tsx`) y de sesiones Bicitour (`GuidePanel.tsx`) |
| recharts | `^3.7.0` | 3.7.0 | gráficos del dashboard (`DashboardPage.tsx`) |
| lucide-react | `^0.575.0` | 0.575.0 | íconos (20 archivos) |
| date-fns | `^4.1.0` | 4.1.0 | formato de fechas en Dashboard/Interacciones |
| dev: typescript `^5` (5.9.3), @types/node `^20`, @types/react `^19`, @types/react-dom `^19`, @types/leaflet, @types/nodemailer, @types/qrcode | | | |

- **No hay SDK de IA en el sitio**: la traducción ES→EN de circuitos (`src/lib/ai-translate.ts`) y el asistente de preguntas Bicitour (`src/lib/bicitour-ai.ts`) llaman a OpenRouter por `fetch` (`https://openrouter.ai/api/v1/chat/completions`), modelo por defecto `google/gemini-2.5-flash` (override `OPENROUTER_TRANSLATE_MODEL`, usado por ambos).
- Geocoding de procedencia: proxy a Photon/Komoot (`src/app/api/tourist-bus/places/route.ts`), sin API key.
- Scripts: `dev` (`next dev`), `build` (`next build`), `start` (`next start`). **No hay `lint`, `test` ni `typecheck`.**
- `next.config.ts` vacío. `tsconfig.json`: `strict: true`, alias `@/* → ./src/*`.
- **Compatibilidad con objetivo Next 16 / React 19**: sí, misma mayor. El destino usa `next 16.3.5` y `react 19.2.8` → solo upgrade de menor. El código ya usa `params: Promise<…>` (convención Next 15+). Ojo: usa `middleware.ts` (L1-36), convención **deprecada en Next 16** (renombrada a `proxy.ts`); el destino ya tiene `proxy.ts` y la lógica debe fusionarse ahí.

### 1.2 `backend/package.json` — `backend` 1.0.0, `main: src/index.js`

| Paquete | Declarado | Bloqueado |
|---|---|---|
| express | `^4.21.2` | 4.22.1 |
| @langchain/openai | `^0.4.4` | 0.4.9 (trae `openai` 4.104.0) |
| @langchain/core | `^0.3.40` | 0.3.80 |
| axios | `^1.8.1` | 1.13.6 |
| grammy (Telegram) | `^1.46.0` | 1.46.0 |
| postgres | `^3.4.9` | 3.4.9 |
| cors `^2.8.5` (2.8.6), dotenv `^16.4.7` (16.6.1), date-fns `^4.1.0`, qs `^6.14.0` | | |
| dev: localtunnel `^2.0.2`, ssh2 `^1.17.0` | | |

- **IA**: LangChain `ChatOpenAI` apuntado a OpenRouter (`baseURL https://openrouter.ai/api/v1`), modelo fijo `google/gemini-2.5-flash`, `maxTokens 2500` (`backend/src/ai/agent.js` L5-12). Visión: axios a OpenRouter, `OPENROUTER_VISION_MODEL` o `google/gemini-2.5-flash` (`ai/vision.js`). Audio: `google/gemini-2.5-flash` fijo, el audio se manda como `image_url` con data URL (`ai/audio.js`). El README habla de "Gemini Flash & Pro" y ManyChat: desactualizado (solo Flash; ManyChat ya no se usa).
- No hay SDK de Gemini ni de OpenAI usados directamente (OpenAI solo como dependencia transitiva de LangChain).
- Scripts: `start` (`node src/index.js`), `dev` (`node --watch`), `telegram`, `dev:telegram`, `tunnel` (localtunnel, legado ManyChat).
- Sin `engines`; el README pide Node 18+, `deploy_vps.md` instala Node 20.

---

## 2. Rutas

Auth: "Admin" = `getAuthenticatedAdminFromCookies()` dentro del handler (valida firma de cookie + fila viva en `admin_sessions`). Además `middleware.ts` (matcher `/admin/:path*`, `/api/admin/:path*`) solo valida la firma HMAC y vencimiento (Edge). Las rutas admin que no están bajo `/api/admin` (p. ej. `/api/educational-bus-requests` GET) solo se protegen dentro del handler.

### 2.1 Páginas públicas

| Ruta | Archivo | Qué hace | Datos |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Landing selectora Bus Turístico / Bus Educativo (la tarjeta educativa se deshabilita si `publicRequestsEnabled=false`). `force-dynamic`. | `app_settings` (vía `getEducationalSettings`) |
| `/turistico` | `src/app/turistico/page.tsx` → `components/tourist-bus/TouristExperience.tsx` (988 líneas, client) | Catálogo de circuitos, salidas con cupo, formulario de reserva, toggle ES/EN (localStorage `tourist-bus-language`), autocompletado de procedencia, books recientes. | `/api/tourist-bus/{departures,circuits,places,bookings}`, `/api/photo-books` |
| `/educativo` | `src/app/educativo/page.tsx` + `components/educational-bus/*` | Acordeón de circuitos educativos, aviso de prioridad, formulario de solicitud con adjunto .docx y calendario de disponibilidad. `force-dynamic`. | `educational_circuits`, `app_settings`; API `/api/educational-bus/circuits`, `/api/educational-bus-requests/availability`, POST `/api/educational-bus-requests` |
| `/reserva/[token]` | `src/app/reserva/[token]/page.tsx` + `BookingCancelClient.tsx` | "Mi reserva": muestra la reserva y permite cancelarla (noindex). | GET/POST `/api/tourist-bus/bookings/[token]` |
| `/galeria` | `src/app/galeria/page.tsx` (server, `force-dynamic`) | Índice público de books vigentes, filtro por fecha (`?fecha=`). Lee la base directo y firma URLs de portada. | `photo_books`, `photo_book_photos` |
| `/fotos/[token]` | `src/app/fotos/[token]/page.tsx` + `PhotoGallery.tsx` | Galería de un book (grilla de miniaturas, ampliar, descargar). | GET `/api/photo-books/[token]` |
| `/bicitour/[code]` | `src/app/bicitour/[code]/page.tsx` → `components/bicitour/ParticipantExperience.tsx` | Participante de Bicitour en vivo (apodo, equipo, preguntas, ranking, insignias, tarjeta recuerdo en canvas). noindex. | `/api/bicitour/*` |
| `/faqs` | `src/app/faqs/page.tsx` | Redirect legado a `/admin/faqs`. | — |
| `/interactions` | `src/app/interactions/page.tsx` | Redirect legado a `/admin/interactions`. | — |
| `/login` | `src/app/login/page.tsx` + `components/auth/LoginPageClient.tsx` | Login admin; si ya hay sesión válida redirige a `/admin`. Incluye "olvidé mi contraseña". | `/api/auth/login`, `/api/auth/recover` |
| `/update-password` | `src/app/update-password/page.tsx` + `UpdatePasswordPageClient.tsx` | Cambio de clave (temporal obligatoria o por link `#token=` del mail). | `/api/auth/update-password` |

`src/app/layout.tsx` monta `<MigueChat />` global (L75); `MigueChat` se oculta en `/admin`, `/login`, `/update-password`, `/bicitour`, `/fotos`, `/faqs`, `/interactions` y si falta `NEXT_PUBLIC_MIGUE_CHAT_URL` (`components/migue/MigueChat.tsx` L33-36, L280-283).

### 2.2 Páginas admin (todas bajo `src/app/admin/layout.tsx`: exige sesión y redirige a `/update-password` si `must_change_password`)

| Ruta | Componente | Función |
|---|---|---|
| `/admin` | `components/admin/DashboardPage.tsx` | KPIs del bot (recharts): por intent, origen, actividad diaria, franja horaria, internacionales, por canal. |
| `/admin/interactions` | `InteractionsPage.tsx` | Listado paginado/filtrable de `tourist_interactions` (intent, idioma, fechas, texto, canal). |
| `/admin/faqs` | `FaqsPage.tsx` | CRUD de FAQs que consume el bot. |
| `/admin/turistico` | `TouristDeparturesPage.tsx` (1243 l.) + `TouristCircuitsPanel.tsx` | Salidas (alta individual o por lote semanal), inscriptos, cancelar con aviso, exportar Excel, pestaña Circuitos (CRUD + traducción IA). |
| `/admin/solicitudes` | `EducationalRequestsPage.tsx` (919 l.) + `EducationalCircuitsPanel.tsx` | Solicitudes educativas: filtros, cambio de estado, carga manual, export Excel, catálogo educativo, configuración. |
| `/admin/solicitudes/[id]` | `EducationalRequestDetailPage.tsx` | Detalle, notas internas, guías, estado, descarga de adjunto. |
| `/admin/fotos` | `PhotoBooksPage.tsx` (850 l.) | Books: crear (título, fecha, guía, personas), subir fotos comprimidas en el navegador, QR, editar, borrar, registro de guías. |
| `/admin/bicitour` | `BicitourAdminPage.tsx` | Recorridos y sesiones Bicitour (oculto del menú). |
| `/admin/bicitour/[id]` | `BicitourRouteEditor.tsx` (1016 l.) | Editor de recorrido: traza en mapa, paradas, preguntas, propuestas IA, pistas IA. |
| `/admin/bicitour/sesion/[id]` | `components/bicitour/GuidePanel.tsx` | Panel del guía en vivo (GPS, abrir paradas, activar/cerrar preguntas, anuncios, QR). |

### 2.3 API pública (sin auth)

| Método y ruta | Qué hace | Tablas |
|---|---|---|
| GET `/api/tourist-bus/departures` | Salidas `active` con `departure_date >= hoy (AR)` + cupos/bicis calculados en app. | R `tourist_departures`, `tourist_bookings` |
| GET `/api/tourist-bus/circuits` | Circuitos activos (siembra la tabla si está vacía). | R/W(seed) `tourist_circuits` |
| GET `/api/tourist-bus/places?q=` | Proxy a Photon (OSM), devuelve hasta 6 "Ciudad / Provincia / País". 503 si falla. | — |
| POST `/api/tourist-bus/bookings` | Valida y llama `create_tourist_booking`; luego mail (y WhatsApp si está activo). 201/400/404/409/500. | W `tourist_bookings` (vía función), R `tourist_departures` |
| GET `/api/tourist-bus/bookings/[token]` | Datos de la reserva por `cancel_token` (UUID) + `canCancel`. | R `tourist_bookings`, `tourist_departures` |
| POST `/api/tourist-bus/bookings/[token]` | Baja autogestionada (≥24 h antes). Mail/WA de confirmación de baja. | W `tourist_bookings` |
| GET `/api/educational-bus/circuits` | Circuitos educativos activos. | R/W(seed) `educational_circuits` |
| GET `/api/educational-bus-requests/availability?circuit=&month=YYYY-MM` | Calendario mensual de turnos. | R `educational_circuits`, `app_settings`, `educational_bus_requests` |
| POST `/api/educational-bus-requests` (multipart) | Solicitud con adjunto .docx. | W `educational_bus_requests`, disco |
| GET `/api/photo-books[?date=]` | Lista books vigentes **incluyendo `access_token`**. | R `photo_books`, `photo_book_photos` |
| GET `/api/photo-books/[token]` | Book + URLs estables de fotos. | R |
| GET `/api/photo-books/[token]/photo/[photoId][?size=thumb][&download=1]` | Sirve la foto desde disco con `Cache-Control: public, immutable` hasta el vencimiento. | R + disco |
| GET/PUT `/api/archivos/[bucket]/[...ruta]?exp&sig[&op=write]` | Lectura/subida con URL firmada HMAC (reemplazo de Supabase Storage). | disco |
| GET `/api/cron/photo-books-cleanup` | Requiere `Authorization: Bearer $CRON_SECRET`. Borra hasta 100 books vencidos (fotos+miniaturas del disco y filas). | W `photo_books` (cascade a photos) |
| POST `/api/bicitour/join` | Ingreso con apodo (+equipo) o reconexión por token. | W `bicitour_participants`, `bicitour_session_events`, versión |
| POST `/api/bicitour/answer` | Respuesta única por pregunta (UNIQUE), suma puntos. | W `bicitour_answers`, `bicitour_participants` |
| GET `/api/bicitour/sessions/[code]/state?token&since` | Polling versionado del participante. | R varias, W `last_seen_at` |
| POST `/api/auth/login` | bcrypt + throttle en memoria; set cookie. | R `admin_profiles`, W `admin_sessions` |
| POST `/api/auth/logout` | Borra sesión y cookies. | W `admin_sessions` |
| POST `/api/auth/recover` | Mail con link de un solo uso (1 h). 503 si no hay SMTP. | W `admin_profiles` |
| POST `/api/auth/update-password` | Por token del mail o con sesión. Mínimo 8 caracteres. | W `admin_profiles`, `admin_sessions` |

### 2.4 API admin (todas exigen sesión admin)

| Ruta | Métodos | Qué hace | Tablas |
|---|---|---|---|
| `/api/admin/dashboard` | GET | 5 vistas `kpi_*` + conteos (total, EN, Telegram `tg:%`, web `web:%`, únicos) | `tourist_interactions`, vistas |
| `/api/admin/interactions` | GET | Paginado con filtros intent/language/fechas/search/channel | `tourist_interactions` |
| `/api/admin/faqs` | GET, POST | Listado / alta | `faqs` |
| `/api/admin/faqs/[id]` | PATCH, DELETE | Edición con whitelist (`pickColumns`) / borrado físico | `faqs` |
| `/api/admin/tourist-circuits` | GET, POST | Catálogo; alta con slug único y traducción IA | `tourist_circuits` |
| `/api/admin/tourist-circuits/[id]` | PATCH, DELETE | Edita (y renombra `title` de salidas del slug, L97); borra solo si no hay salidas con ese slug | `tourist_circuits`, `tourist_departures` |
| `/api/admin/tourist-departures` | GET (`scope=upcoming|past|all`), POST | Listado con cupos / alta individual | `tourist_departures`, `tourist_bookings` |
| `/api/admin/tourist-departures/batch` | POST | Alta recurrente por días de semana (máx. 60), saltea duplicados | `tourist_departures` |
| `/api/admin/tourist-departures/[id]` | PATCH, DELETE | Edita estado/cupo/fecha/hora/bicis/punto/notas; al cancelar con `notifyBookings` manda avisos y loguea; DELETE solo sin reservas confirmadas | `tourist_departures`, `tourist_bookings`, `tourist_notification_logs` |
| `/api/admin/tourist-departures/[id]/bookings` | GET | Reservas de la salida + historial de avisos | `tourist_bookings`, `tourist_notification_logs` |
| `/api/admin/tourist-departures/[id]/export` | GET | XLSX "lista de embarque" (confirmadas, por nombre) | idem |
| `/api/admin/tourist-departures/export?from&to[&circuit]` | GET | XLSX de reservas por rango (todas, incluidas canceladas) | idem |
| `/api/admin/tourist-bookings/[id]` | PATCH | Cambia estado confirmed/cancelled (reconfirmar verifica cupo de personas) | `tourist_bookings`, `tourist_departures` |
| `/api/educational-bus-requests` | GET (admin) | Listado con filtros search/status/preferredShift/institutionType/requestedDate | `educational_bus_requests` |
| `/api/educational-bus-requests/[id]` | GET, PATCH (admin) | Detalle; cambia status/internalNotes/guides validando choque de turno | idem |
| `/api/educational-bus-requests/[id]/attachment` | GET (admin) | Descarga el .docx desde disco (no URL firmada) | idem + disco |
| `/api/educational-bus-requests/export?from&to` | GET (admin) | XLSX de solicitudes **aprobadas** | idem |
| `/api/admin/educational-bus-requests/manual` | POST | Carga manual de turno (teléfono/presencial), status approved/pending | idem |
| `/api/admin/educational-circuits`, `/[id]` | GET, POST, PATCH, DELETE | Catálogo educativo (días/turnos por circuito) | `educational_circuits` (+ verifica uso en solicitudes) |
| `/api/admin/educational-settings` | GET, PUT | Config (habilitar solicitudes, bloqueo hasta fecha, min/max alumnos) | `app_settings` |
| `/api/admin/photo-books` | GET, POST | Listado + registro de guías / crea book y devuelve URLs firmadas de subida | `photo_books`, `photo_book_photos`, `tour_guide_log` |
| `/api/admin/photo-books/[id]` | PATCH, DELETE | Edita (y upsert en `tour_guide_log`) / borra book y archivos | idem |
| `/api/admin/photo-books/[id]/photos` | GET, POST | Fotos con preview firmado / subida multipart directa (legado) | idem |
| `/api/admin/photo-books/[id]/photos/upload-urls` | POST | URLs firmadas para agregar fotos | idem |
| `/api/admin/photo-books/[id]/photos/register` | POST | Verifica en disco y registra filas | `photo_book_photos` |
| `/api/admin/bicitour/routes`, `/[id]`, `/[id]/duplicate` | GET, POST, PATCH, DELETE | Recorridos | `bicitour_routes`, `bicitour_stops`, `bicitour_questions` |
| `/api/admin/bicitour/stops`, `/[id]` | POST, PATCH, DELETE | Paradas | `bicitour_stops` |
| `/api/admin/bicitour/stops/[id]/ai-proposals` | POST | Genera 1-5 propuestas IA (borradores) | `bicitour_question_proposals` |
| `/api/admin/bicitour/stops/[id]/ai-hint` | POST | Sugiere pista con IA | — |
| `/api/admin/bicitour/questions`, `/[id]` | POST, PATCH, DELETE | Preguntas | `bicitour_questions` |
| `/api/admin/bicitour/proposals/[id]` | PATCH | approve (copia a `bicitour_questions`, origin `ai`) / reject | ambas |
| `/api/admin/bicitour/sessions` | GET, POST | Lista / crea sesión con código corto y copia paradas | `bicitour_sessions`, `bicitour_session_stops` |
| `/api/admin/bicitour/sessions/[id]` | GET (`?since=`) | Estado del guía (polling) | varias |
| `/api/admin/bicitour/sessions/[id]/action` | POST | start, pause, resume, finish, reopen, gps, announce, open_stop, activate_question, close_question, complete_stop, skip_stop, spontaneous_stop (L52-218) | varias + versión |
| `/api/admin/bicitour/sessions/[id]/track` | POST | Lote de puntos GPS del guía | `bicitour_track_points` |

### 2.5 Backend del bot (Express, `backend/src/index.js`)

| Método y ruta | Archivo | Auth |
|---|---|---|
| POST `/api/chat/web` (+ OPTIONS) | `routes/webChat.js` L43-44 → `controllers/webChatController.js` `handleWebChat` L138 | CORS restringido + rechazo de Origin ajeno + rate limit; body JSON hasta 9 MB |
| GET `/api/webhook/whatsapp` | `routes/webhook.js` → `verifyWhatsAppWebhook` | `hub.verify_token` == `WHATSAPP_VERIFY_TOKEN` |
| POST `/api/webhook/whatsapp` | `handleWhatsAppWebhook` L82 | firma `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET` (**si falta, acepta sin validar**, L20-25) |
| GET `/health` | `index.js` L38 | ninguna |

Escucha en `HOST` (default `127.0.0.1`) y `PORT` (default 3000) (L42-47). En producción se expone por nginx en `location /turismo/` → `https://srv1915283.hstgr.cloud/turismo/api/...`.

---

## 3. Modelo de datos (esquema efectivo final)

### 3.1 Cómo se arma
- Historia en `supabase_*.sql` (raíz) + `db/001_fuera_de_supabase.sql` (último paso: sale de Supabase). `db/README.md` indica cargar los `supabase_*.sql` "en orden" y luego `001`, previa creación de stubs de Supabase (`auth.users`, `auth.uid()`, `auth.role()`, `storage.buckets`, esquema `api`) que crea `db/migrar-desde-supabase.sh` (paso 4).
- **El orden no está codificado**: el alfabético falla (p. ej. `supabase_bike_availability_migration.sql` altera `tourist_departures`, que crea `supabase_tourist_bus_migration.sql`; `supabase_circuit_modality_migration.sql` altera `tourist_circuits`, que crea `supabase_admin_selfservice_migration.sql`). Orden cronológico deducido: `schema` → `tourist_bus` → `booking_cancel` → `bot` → `admin_selfservice` → `circuit_modality` → `bike_availability` → `notification_logs` → `photo_books` → `photo_books_guide` → `photo_thumbs` → `bicitour` → `bicitour_features_v2` → `keepalive` → `kpi_views_security` → `db/001_fuera_de_supabase.sql`.
- `supabase_schema.sql` no es re-ejecutable (los `CREATE POLICY` no tienen `IF NOT EXISTS`).
- `001_fuera_de_supabase.sql` (transacción): quita FK de `admin_profiles.id` a `auth.users`, default `gen_random_uuid()`, agrega `password_hash`, `reset_token_hash`, `reset_expires_at`; copia hashes bcrypt desde `auth.users.encrypted_password`; normaliza email y crea índice único `admin_profiles_email_key ON (lower(email))`; crea `admin_sessions`; borra trigger/función `handle_new_admin_user`; **borra todas las políticas RLS de `public` y deshabilita RLS en todas las tablas**; borra `public.keepalive()` y el esquema `api`.
- Requiere extensión **pgcrypto** (`gen_random_bytes` en `photo_books.access_token`; el script de migración la instala en el esquema `extensions`). `gen_random_uuid()` es nativa desde PG13.
- Producción: PostgreSQL 16 en la VPS (`db/README.md`); bases `turismo` (prod) y `turismo_dev`, roles homónimos. El volcado vino de PG 17 (Supabase) con filtros.
- El sitio conecta con `TimeZone=UTC` y parsers que imitan a Supabase: `date`→'YYYY-MM-DD', `timestamptz`→ISO UTC, `bigint`→number (`src/lib/db.ts` L18-48). El bot igual, sin parser de timestamptz (`backend/src/services/db.js` L9-19).

### 3.2 Tablas

**Bot / panel**
- `tourist_interactions` (`supabase_schema.sql` L8-37): `id bigserial PK`, `created_at`, `chat_id` (teléfono WhatsApp, `tg:<id>`, `web:<uuid>`), `user_name`, `intent`, `language` default 'es', `query_text`, `bot_response`, `origen_provincia`, `medio_transporte`, `budget`, `has_photo` bool, `live_chat_url`. Índices: created_at desc, intent, language, origen_provincia, chat_id.
- Vistas (security_invoker; el `REVOKE` a anon/authenticated de `supabase_kpi_views_security_migration.sql`): `kpi_consultas_por_intent`, `kpi_origen_turistas` (30 días), `kpi_actividad_diaria` (30 días, TZ America/Argentina/Tucuman), `kpi_franja_horaria`, `kpi_turistas_internacionales` (por mes), `kpi_medio_transporte` (30 días).
- `faqs` (L110-147): `id`, `created_at`, `updated_at`, `pregunta` NOT NULL, `respuesta` NOT NULL, `categoria` default 'general' (sin CHECK; categorías: excursiones, transporte, gastronomia, alojamiento, atracciones, museos, asamblea, servicios, nocturna, salud, compras, festivales, general), `activo`, `orden`. Trigger `faqs_updated_at`. Seeds: FAQs oficiales, museos (abril 2026, upsert por categoria+pregunta) y "VIII Asamblea RAMCC" (abril 2026, contenido ya vencido).
- `bot_chat_messages` (`supabase_bot_migration.sql`): `id`, `created_at`, `chat_id` NOT NULL, `role` CHECK ('user','assistant'), `content`. Índice `(chat_id, id desc)`. **Sin retención/limpieza** (crece indefinidamente; contiene texto de usuarios).

**Admin / auth**
- `admin_profiles`: `id uuid PK default gen_random_uuid()`, `email` (único por `lower(email)`), `role` CHECK `IN ('admin')` (un único rol), `must_change_password` default true, `password_hash` (bcrypt), `reset_token_hash` (sha256 hex), `reset_expires_at`, `created_at`, `updated_at` (trigger).
- `admin_sessions`: `id uuid PK`, `admin_id` FK→admin_profiles ON DELETE CASCADE, `created_at`, `expires_at`. Índices por admin y expires.

**Bus Turístico**
- `tourist_circuits` (`supabase_admin_selfservice_migration.sql` L16-45 + modality): `id`, timestamps, `slug` UNIQUE, `icon` default 'bus', `modality` NOT NULL default 'bus' CHECK ('bus','walking','bike'), `active`, `sort_order`, `default_capacity` (NULL o >0), `default_meeting_point`, `name_es` NOT NULL, `schedule_es`, `duration_es`, `summary_es`, `description_es`, `highlights_es jsonb`, y los mismos `_en`. Índice `(active, sort_order, id)`. Se siembra desde el catálogo estático del código (`src/lib/tourist-circuits.ts`, 13 circuitos) si está vacía (`src/lib/tourist-circuits-server.ts` L12-23).
- `tourist_departures` (`supabase_tourist_bus_migration.sql` L14-26 + bike): `id`, timestamps, `circuit_slug TEXT` (**sin FK** a `tourist_circuits`), `title` NOT NULL (copia del nombre del circuito o libre), `departure_date DATE`, `departure_time TIME`, `capacity INT >0`, `bike_stock INT NULL (>=0)`, `meeting_point`, `notes`, `status` CHECK ('active','cancelled'). Índices `(departure_date, departure_time)`, `(status)`. **Sin índice único** fecha+hora+circuito (el antiduplicado del lote es solo en app).
- `tourist_bookings`: `id`, timestamps, `departure_id` FK ON DELETE CASCADE, `full_name`, `email`, `phone` NOT NULL, `origin_city`, `people_count INT >0`, `municipal_bikes INT >=0 default 0`, `language` CHECK ('es','en'), `status` CHECK ('confirmed','cancelled'), `cancel_token UUID NOT NULL default gen_random_uuid()` con índice único `idx_tourist_bookings_cancel_token`. Índices `(departure_id, status)`, `(created_at desc)`. **Sin restricción de duplicados** (mismo email/salida).
- `tourist_notification_logs`: `id identity`, `created_at`, `departure_id` FK CASCADE, `kind` default 'departure_cancelled', `channel` default 'email', `reason`, `total`, `sent`, `failed`, `recipients jsonb` (`[{booking_id,name,email,ok,error?}]`).

**Bus Educativo**
- `educational_bus_requests` (`supabase_schema.sql` L501-588): `id`, timestamps, `institution_name`, `school_address`, `contact_name`, `contact_role`, `contact_phone`, `contact_email`, `student_count INT >0`, `grade_year`, `circuit` NOT NULL default 'historico_cultural' (el CHECK fijo se elimina en `admin_selfservice`), `requested_date DATE`, `preferred_shift` CHECK ('manana','tarde'), `institution_type` CHECK ('municipal','provincial','private'), `attachment_name` NOT NULL, `attachment_path` NOT NULL, `additional_notes`, `status` CHECK ('pending','approved','rejected') default 'pending', `internal_notes`, `guides`. Índices por created_at, status, requested_date, institution_type, circuit. **Índice único parcial** `idx_educational_requests_unique_active_slot ON (requested_date, preferred_shift) WHERE status IN ('pending','approved')` — **global, no por circuito** (un turno ocupa el bus para todos los circuitos).
- `educational_circuits`: `id`, timestamps, `slug` UNIQUE, `name`, `summary`, `paragraphs jsonb`, `availability jsonb` (`{martes:['manana','tarde'],…}`), `active`, `sort_order`. Seeds en código (`src/lib/educational-circuits.ts` L80-128): `historico_cultural` (activo), `escultorico_cielo_abierto` y `city_tour_cementerio` (inactivos, sin disponibilidad).
- `app_settings`: `key TEXT PK`, timestamps, `value jsonb`. Hoy solo `educational_settings`.

**Books de fotos**
- `photo_books`: `id uuid`, timestamps, `title`, `tour_date DATE`, `description`, `access_token TEXT UNIQUE default encode(gen_random_bytes(24),'hex')`, `expires_at default now()+7 days`, `guide_name`, `people_count`. Índices expires_at, tour_date desc.
- `photo_book_photos`: `id uuid`, `book_id` FK CASCADE, `created_at`, `storage_path` UNIQUE, `thumb_path`, `original_name`, `mime_type`, `size_bytes >0`, `sort_order`. Índice `(book_id, sort_order)`.
- `tour_guide_log` (permanente): `id identity`, `created_at`, `book_id` FK ON DELETE SET NULL, `tour_date`, `title`, `guide_name`, `people_count`. Índice por guía y único parcial `(book_id) WHERE book_id IS NOT NULL`.

**Bicitour en vivo** (`supabase_bicitour_migration.sql`, `supabase_bicitour_features_v2.sql`)
- `bicitour_routes` (title, description, status draft/published/archived, mode individual/teams/mixed, `path jsonb [[lat,lng]]`).
- `bicitour_stops` (route_id CASCADE, position, title, description, fun_facts jsonb, image_urls jsonb, audio_url, hint, `hint_enabled`, lat, lng, `radius_m` default 60, `is_draft`).
- `bicitour_questions` (stop_id CASCADE, position, type multiple_choice/true_false, prompt, options jsonb, correct_key, explanation, points default 100, `origin` manual/ai, `category` historica/cultural/arquitectonica/observacion, `source_excerpt`).
- `bicitour_question_proposals` (borradores IA: status pending/approved/rejected, difficulty, category, source_excerpt, warning, decided_at).
- `bicitour_sessions` (`code` UNIQUE, route_id, status lobby/active/paused/finished, mode, teams jsonb, gps_enabled, announcement(_at), group_bonus_awarded, **`version BIGINT`** para polling, started/finished_at).
- `bicitour_session_stops` (session CASCADE, stop_id, position, status locked/open/question_active/question_closed/completed/skipped, active_question_id; UNIQUE(session_id, stop_id)).
- `bicitour_participants` (token UUID UNIQUE, nickname con único `(session_id, lower(nickname))`, team, score, joined_at, last_seen_at).
- `bicitour_answers` (UNIQUE(participant_id, question_id), is_correct, points_awarded).
- `bicitour_stamps` (UNIQUE(participant_id, stop_id); stop NULL = recorrido completo).
- `bicitour_participant_badges` (UNIQUE(participant_id, badge_key); definiciones en `src/lib/bicitour-badges.ts`: historiador, explorador, ojo_de_aguila, recorrido_completo).
- `bicitour_track_points` (GPS del guía), `bicitour_session_events` (bitácora).
- Seed: recorrido "Bicitour Centro Histórico [DEMO]" (draft) con 3 paradas y 3 preguntas placeholder.

### 3.3 Funciones, triggers, vistas
- `update_updated_at()` (trigger BEFORE UPDATE) en: `faqs`, `educational_bus_requests`, `admin_profiles`, `tourist_departures`, `tourist_bookings`, `tourist_circuits`, `educational_circuits`, `app_settings`, `photo_books`. (Las tablas bicitour no tienen `updated_at` con trigger salvo `bicitour_routes.updated_at`, que no tiene trigger.)
- **`create_tourist_booking(p_departure_id, p_full_name, p_email, p_phone, p_origin_city, p_people_count, p_language DEFAULT 'es', p_municipal_bikes DEFAULT 0) RETURNS JSONB`**, `SECURITY DEFINER`, `search_path=public` — versión vigente en `supabase_bike_availability_migration.sql` L17-114 (la de `supabase_tourist_bus_migration.sql` L70-142 se reemplaza con `DROP FUNCTION`). Detalle en §4.
- `bicitour_bump_version(p_session_id)` (SQL, SECURITY DEFINER): `version = version + 1`.
- Eliminadas por `001`: `handle_new_admin_user()` + trigger en `auth.users`; `public.keepalive()`, esquema `api` (`api.supabase_keepalive`, `api.keepalive()`).
- Supabase Storage: los `INSERT INTO storage.buckets` (`educational-bus-request-files` 10 MB .docx; `tour-photo-books` 15 MB jpeg/png/webp/heic/heif) ya no aplican; los buckets son carpetas en `ARCHIVOS_DIR`.

### 3.4 Tablas compartidas con el bot (`backend/src/services/db.js`)
| Tabla | Bot | Sitio |
|---|---|---|
| `faqs` | R (`activo = true`, L21-48) | CRUD admin |
| `tourist_circuits` | R (activos, L130-135) | CRUD admin + lectura pública |
| `tourist_departures` | R (activas, próximos 21 días, L136-140) | CRUD |
| `tourist_bookings` | R (confirmadas, para cupos, L146-149) | W |
| `tourist_interactions` | W (`logInteraction`, L51-71) | R (dashboard/interacciones) |
| `bot_chat_messages` | R/W (memoria, L79-119) | — |

---

## 4. Bus Turístico: flujo de reserva

### 4.1 Circuitos
- Catálogo administrable `tourist_circuits` con fallback estático `touristCircuitCatalog` en `src/lib/tourist-circuits.ts` (slugs: historico-cultural, lugares-notables, la-ciudadela, historico-a-pie, nocturno-recordar, museo-cielo-abierto, religioso, luces-de-mi-ciudad, ruta-milanga, ruta-empanada, acento-frances, pedaleando-parque, gira-pianos). Modalidad bus/walking/bike (etiqueta pública).
- ES obligatorio; EN generado por IA al crear/editar (`src/lib/tourist-circuits-admin.ts` `buildEnglishFields` → `src/lib/ai-translate.ts`, timeout 30 s, `temperature 0.2`); si falla, el EN cae campo por campo al ES (`mapTouristCircuitRecord`).
- Las salidas guardan `circuit_slug` + `title` desnormalizado; al renombrar un circuito se actualiza `title` de sus salidas (`src/app/api/admin/tourist-circuits/[id]/route.ts` L97). No se puede borrar un circuito con salidas (L130-147). Circuito inactivo → no se pueden crear salidas.

### 4.2 Salidas y cupos
- Alta individual: `src/app/api/admin/tourist-departures/route.ts` L62-141 (fecha no pasada, hora HH:MM, cupo 1-500, bicis 0-500 o null).
- **Alta por lote**: `src/app/api/admin/tourist-departures/batch/route.ts` — genera fechas por días de semana entre `fromDate` y `toDate` (`listDatesForWeekdays` L10-28), máximo 60 (`L8`), excluye fechas ya existentes con misma hora y mismo `circuit_slug` (o mismo `title` si es libre) (L104-126), insert multi-fila. Respuesta `{created, skipped}`; 409 si todas existían.
- **Disponibilidad**: calculada **en la aplicación**, no en SQL: `buildDeparturesWithAvailability` (`src/lib/tourist-bus.ts` L221-246) suma `people_count` y `municipal_bikes` de reservas `confirmed` por salida → `reserved`, `remaining = max(capacity − reserved, 0)`, `bikes_reserved`, `bikes_remaining` (null si `bike_stock` null). Público: `GET /api/tourist-bus/departures` (L16 filtra `status='active'` y `departure_date >= hoy` en `America/Argentina/Buenos_Aires`). El cliente refresca solo al cargar y tras cada intento de reserva (sin polling).

### 4.3 Creación de la reserva
1. Cliente (`TouristExperience.tsx` L438): `POST /api/tourist-bus/bookings` con `{departureId, fullName, email, phone, originCity, peopleCount, municipalBikes, language}`. El cliente además exige elegir "bici propia / municipal" para circuitos en bici.
2. Validación server (`src/app/api/tourist-bus/bookings/route.ts` L49 → `validateTouristBookingForm`, `src/lib/tourist-bus.ts` L121-166): nombre requerido; email regex; teléfono 8-15 dígitos; personas entero 1..**20** (`maximumPeoplePerBooking`, L97); bicis 0..personas; procedencia **obligatoria** ≤120 caracteres (`maximumOriginCityLength`, L102).
3. **Llamada atómica** (route L63-72): `select create_tourist_booking(p_… => …)`. La función (`supabase_bike_availability_migration.sql` L38-113):
   - `INVALID_PEOPLE_COUNT` si <1; `INVALID_BIKES` si bicis <0 o > personas.
   - `SELECT * … FROM tourist_departures WHERE id = p_departure_id FOR UPDATE` (L47-50) → **bloqueo de fila que serializa reservas concurrentes de la misma salida**.
   - `NOT_FOUND`; `CANCELLED` si `status <> 'active'`; `PAST` si `departure_date < hoy (Buenos Aires)` (**solo compara fecha: una salida de hoy que ya partió sigue aceptando reservas**).
   - Suma de `people_count` confirmadas; `NO_CAPACITY` con `remaining` si se excede.
   - Si pide bicis: `INVALID_BIKES` si `bike_stock` es null; suma `municipal_bikes`; `NO_BIKES` con `remaining_bikes`.
   - INSERT y devuelve `{ok:true, booking: to_jsonb(row), remaining}` (incluye `cancel_token`).
   - Mapeo HTTP en route L17-25: NOT_FOUND 404; CANCELLED/PAST/NO_CAPACITY/NO_BIKES 409; INVALID_* 400; error SQL 500.
4. Avisos (route L98-116): si hay SMTP o WhatsApp habilitado, relee la salida y envía en paralelo mail + WhatsApp. **Bloquea la respuesta HTTP hasta que el SMTP responda**, pero nunca revierte la reserva. Respuesta 201 `{data:{booking, remaining, emailSent, whatsappSent}}`.
- **Prevención de duplicados**: **no existe** (ni índice ni chequeo por email/teléfono/salida). Tampoco rate limit ni captcha en el endpoint público: un script podría agotar cupos con reservas de 20 personas.

### 4.4 Cancelación por token
- `src/app/api/tourist-bus/bookings/[token]/route.ts`: token debe ser UUID (regex L9). `CANCEL_WINDOW_MS = 24 h` (L31). `canCancel` (L40-45): reserva `confirmed`, salida `active` y `fecha+hora(-03:00 fijo, L37) − ahora ≥ 24 h`. POST hace `update … set status='cancelled' where id=… and status='confirmed'` (L99) y envía mail/WA de baja. GET expone nombre, personas, bicis, estado, idioma y datos de la salida.
- Admin (`src/app/api/admin/tourist-bookings/[id]/route.ts`): cancela/reconfirma sin ventana horaria. Reconfirmar verifica cupo de personas (L39-63) **sin lock ni control de bicis** (posible sobreventa en carrera).

### 4.5 Cancelación de salida y notificaciones
- `PATCH /api/admin/tourist-departures/[id]` con `status:'cancelled'`, `notifyBookings:true`, `cancelReason` (≤300) (L100-151): manda mails (y WA si está activo) a todas las confirmadas, en paralelo, y guarda una fila en `tourist_notification_logs` con totales y destinatarios (L127-147; canal siempre `'email'`). **No cambia el estado de las reservas** (quedan `confirmed` en una salida `cancelled`).
- Riesgos del PATCH: el cupo puede bajarse por debajo de lo reservado; la fecha puede moverse al pasado o cambiarse sin avisar a inscriptos; `bike_stock` puede bajar por debajo de lo prestado. `maxDuration = 60`.
- DELETE solo si no hay reservas confirmadas (L156-194); si las hay, 409 ("cancelala").

### 4.6 Mails (`src/lib/tourist-booking-email.ts`)
- Proveedor: **SMTP genérico con nodemailer** (`createBookingEmailTransporter`, ~L232-249): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (los 4 obligatorios para habilitar), `SMTP_FROM` (default `SMTP_USER`), `SMTP_SECURE` ("true" o puerto 465), `SMTP_REPLY_TO`, `SMTP_ALLOW_INVALID_CERT` (no documentada en `.env.example`). Base de links `PUBLIC_SITE_URL` (default `https://busturistico.smt.gob.ar`).
- Plantillas HTML+texto bilingües ES/EN con encabezado institucional; avatar de Migue y logo SMT **embebidos como CID** desde base64 en `src/lib/email-assets.ts` (35 KB). Tipos: confirmación (incluye link `/reserva/<cancel_token>`), salida cancelada (masivo, con `reason`), baja confirmada. Sin adjunto .ics ni QR.
- El mismo transporter se usa para la recuperación de clave admin.

### 4.7 WhatsApp de reservas (`src/lib/tourist-whatsapp.ts`)
- Cloud API de Meta, `graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` (v21.0 fijo aquí), plantillas aprobadas `reserva_confirmada`, `reserva_baja`, `salida_cancelada`. Normaliza teléfonos argentinos a `549…`. Habilitado solo con `WHATSAPP_NOTIFICATIONS_ENABLED=true` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`. **En pausa desde 2026-09-01.**

### 4.8 Exportaciones
- Generador XLSX propio sin dependencias (`src/lib/simple-xlsx.ts`, 347 líneas: zip + XML a mano, estilos fijos). **No hay CSV.**
- Lista de embarque por salida (`/api/admin/tourist-departures/[id]/export`): confirmadas ordenadas por nombre, columnas con bicis si aplica, totales.
- Reservas por rango (`/api/admin/tourist-departures/export?from&to&circuit`): 14 columnas (ID, salida, fecha, hora, estado salida, nombre, email, teléfono, procedencia, personas, bicis, idioma, estado reserva, fecha de reserva), incluye canceladas.

### 4.9 Bicicletas (BiciTour en el Parque)
- No es un módulo aparte: circuitos con `modality='bike'` + `tourist_departures.bike_stock` + `tourist_bookings.municipal_bikes`. Descuento atómico dentro de `create_tourist_booking`. El cliente pregunta bici propia/municipal.

---

## 5. Bus Educativo

- **Formulario** (`src/components/educational-bus/EducationalBusRequestForm.tsx`, multipart a `POST /api/educational-bus-requests`): circuit, institutionName, institutionType (municipal/provincial/private), schoolAddress, contactName, contactRole (lista + "Otro"), contactPhone, contactEmail, studentCount, gradeYear (1° primaria … 6° secundaria), requestedDate, preferredShift (manana/tarde), additionalNotes, **attachment** (.docx, nota modelo descargable en `public/nota_modelo_bus_turistico.docx`).
- **Validación** (`src/lib/educational-bus-requests.ts` `validateEducationalBusRequestForm` L517-570 y server route L81-141): alumnos entre `minStudents`/`maxStudents` (defaults 15/44, L37-38, configurables); fecha no pasada; fecha y turno permitidos según `availability` del circuito; adjunto `.docx`, ≤10 MB, MIME docx u `octet-stream` (sin verificación de contenido). Si `publicRequestsEnabled=false` → 403 (L88).
- **Disponibilidad**: por circuito (`educational_circuits.availability`, días de semana → turnos; default martes M/T, miércoles M/T, jueves T, viernes M). Bloqueo temporal "todo ocupado" desde hoy hasta `blockedUntil` (default codificado `'2026-08-31'`, L181). Turnos ocupados = solicitudes `pending|approved` en esa fecha+turno (de **cualquier** circuito). Calendario mensual: `buildMonthlyAvailability` (L457-503); endpoint `availability/route.ts` L52-73.
- **Antichoque**: pre-chequeo (route L143-168) + índice único parcial (respaldo, 409 en `UNIQUE_VIOLATION`, L197). No hay feriados.
- **Adjuntos**: se escriben a disco antes del INSERT en `ARCHIVOS_DIR/educational-bus-request-files/requests/<ts>-<rand>-<nombre>` (L37-46, L170-178); se borran si falla el INSERT. Descarga solo admin por `/api/educational-bus-requests/[id]/attachment` (stream desde disco).
- **Prioridad**: solo informativa en UI (`PriorityNotice.tsx`: 1 municipales, 2 provinciales, 3 privadas). **No hay lógica de prioridad**; el primero que solicita bloquea el turno.
- **Settings** (`app_settings.educational_settings`, `src/lib/educational-settings-server.ts`): `publicRequestsEnabled`, `blockedUntil`, `minStudents`, `maxStudents`, `availability` (global legado; la disponibilidad efectiva sale del circuito). Si no existe la fila, se inserta el default al leer.
- **Workflow admin**: estados `pending` → `approved` | `rejected` (cualquier transición). Al pasar a pending/approved se revalida choque de turno y fecha no pasada (`[id]/route.ts` L67-97). Campos `internal_notes`, `guides`. **No se notifica a la escuela** en ningún cambio (no hay mail educativo).
- **Carga manual** (`/api/admin/educational-bus-requests/manual`): turno tomado por teléfono; status approved (default) o pending; rellena `grade_year='carga_manual'`, `contact_email` default `carga-manual@smt.gob.ar`, `attachment_path='migracion/carga-manual.docx'` (archivo inexistente → la descarga devuelve 500).
- **Export**: XLSX de aprobadas por rango (`/api/educational-bus-requests/export`).
- Circuitos educativos: CRUD admin, slug único, solo español.

---

## 6. Bicitour en vivo

- **Estado**: funcional, oculto del menú ("pedido de Lucas 2026-09-01", `Sidebar.tsx` L13-15). Contenido sembrado `[DEMO]`.
- **Recorridos/paradas/preguntas**: editor con mapa Leaflet + OSM (`BicitourRouteEditor.tsx`), traza `path` como `[[lat,lng]]`, paradas con radio de proximidad, datos curiosos, imágenes por URL, audio por URL, pista y `hint_enabled`. Duplicar recorrido.
- **IA**: `src/lib/bicitour-ai.ts` (OpenRouter, `google/gemini-2.5-flash` o `OPENROUTER_TRANSLATE_MODEL`, máx. 4000 caracteres de contenido, máx. 5 propuestas). Genera propuestas de preguntas con `source_excerpt` y `warning`, que quedan `pending` hasta que un admin las aprueba (se copian a `bicitour_questions` con `origin='ai'`). También sugiere pistas.
- **Sesiones**: código corto `generateSessionCode(6)` UNIQUE, QR en el panel del guía. Estados lobby → active ↔ paused → finished (reopen posible). Por parada: locked → open → question_active → question_closed → completed / skipped. Paradas espontáneas creadas en vivo (`is_draft`).
- **Participantes**: anónimos (apodo único por sesión, case-insensitive), token UUID guardado en localStorage para reconexión. Una respuesta por pregunta (UNIQUE). El resultado se revela al cerrar la pregunta. Puntaje: `score = score_leído + puntos` (no atómico, pero cada pregunta solo puntúa una vez). Bonus grupal 150 (`BICITOUR_GROUP_BONUS_POINTS`). Sellos por parada y "Recorrido completo". Insignias evaluadas en el servidor al cerrar preguntas/completar paradas (`bicitour-badges-server.ts`). Tarjeta recuerdo 1080×1350 en canvas (`bicitour-card.ts`).
- **GPS**: solo el guía (`navigator.geolocation.watchPosition`, filtro por distancia, envío por lotes a `/track`); aviso de cercanía a la próxima parada (`GuidePanel.tsx` L228-230: radio + 40 m).
- **Tiempo real**: **polling cada 2,5 s** (`POLL_MS`, `ParticipantExperience.tsx` L31, `GuidePanel.tsx` L65) con `?since=<version>`; el servidor responde corto si `bicitour_sessions.version` no cambió. Cada acción incrementa la versión (`bumpSessionVersion`, `src/lib/bicitour-server.ts` L26-32). Sin WebSockets/SSE.
- Nota: el endpoint `join`/`answer`/`state` es público y sin rate limit.

---

## 7. Books de fotos

- **Flujo de subida** (`components/admin/PhotoBooksPage.tsx` + `src/lib/photo-book-upload.ts`):
  1. El navegador comprime cada foto a JPEG (máx. 1920 px, calidad 0,82) y genera miniatura (600 px, 0,70) (`src/lib/photo-compress.ts`).
  2. `POST /api/admin/photo-books` crea el book (vence a 7 días), upsert en `tour_guide_log`, y devuelve URLs firmadas de subida (path `<bookId>/<NNN>-<uuid>-<nombre>` y `thumb-…`).
  3. `PUT` directo a `/api/archivos/tour-photo-books/...?exp&sig&op=write` (vigencia 2 h, ≤15 MB, sin sobrescritura, `wx`).
  4. `POST /api/admin/photo-books/[id]/photos/register` verifica que los archivos existan en disco y registra filas (miniatura opcional). Si falla la creación, el cliente borra el book.
  - Máx. 30 fotos por book (`MAX_PHOTOS_PER_BOOK`), tipos jpeg/png/webp/heic/heif. Para agregar fotos a un book existente: `upload-urls` + `register`. Existe además subida multipart directa legada (`[id]/photos` POST).
- **Tokens**: `access_token` hex de 48 caracteres. URL pública `/fotos/<token>` + QR. **Pero** `GET /api/photo-books` y `/galeria` listan todos los books vigentes con su token: en la práctica son públicos por fecha.
- **Servido**: `/api/photo-books/[token]/photo/[photoId]` lee de disco y responde `public, max-age=…, immutable` hasta el vencimiento (pensado para CDN/caché tras el incidente de egress del 2026-10-10). Admin ve previews con URL firmada de lectura (1 h).
- **Almacenamiento** (`src/lib/archivos.ts`): raíz `ARCHIVOS_DIR` (default `./archivos`; VPS `/srv/turismo/compartido/archivos`), carpeta por bucket (`tour-photo-books`, `educational-bus-request-files`). Defensa de path traversal (L30-39). Firma HMAC-SHA256 con `AUTH_SECRET` sobre `archivo:<op>:<bucket>:<path>:<exp>` (L88-92), comparación `timingSafeEqual`. Content-Type por magic bytes para jpg/png/webp.
- **Limpieza**: `GET /api/cron/photo-books-cleanup` con `Bearer CRON_SECRET`; lotes de 100; borra fotos + miniaturas del disco y luego la fila (cascade). Crontab VPS: `15 3 * * *` contra `http://127.0.0.1:3004/...` (`db/README.md` paso 9). `tour_guide_log` queda (book_id → NULL).

---

## 8. Autenticación del panel

- **Hash**: bcrypt (bcryptjs 3.0.3), costo 12 (`src/lib/admin-auth.ts` L27). Los hashes migrados de Supabase Auth (bcrypt `$2a$`) siguen validando.
- **Sesión**: fila en `admin_sessions` (30 días, `ADMIN_SESSION_MAX_AGE`, `admin-auth-core.ts` L8) + cookie **`smt_admin_session`** con formato `<sessionId>.<expUnix>.<HMAC-SHA256 base64url>` firmado con **`AUTH_SECRET`** (mín. 32 caracteres) sobre `admin-session:<id>.<exp>` (L51-57). Cookie `httpOnly`, `sameSite=lax`, `secure` en producción, `path=/`. Se borran cookies legadas `smt_admin_access_token`/`smt_admin_refresh_token`.
- **Middleware** (`middleware.ts`): Edge, solo verifica firma/vencimiento para `/admin/*` y `/api/admin/*`; el layout y cada handler confirman contra la base (sesión viva + perfil).
- **Login** (`/api/auth/login`): throttle **en memoria** por `email|IP`: 8 fallos / 15 min (L62-63). IP de `x-real-ip`/`x-forwarded-for`. Al loguear, borra sesiones vencidas.
- **Recuperación**: token aleatorio 32 bytes base64url; se guarda `sha256` en `reset_token_hash`, vence 1 h; link `PUBLIC_SITE_URL/update-password#token=…` (fragmento, no llega a logs). No revela si el email existe. Cambiar clave cierra las demás sesiones.
- **Roles**: uno solo (`'admin'`, CHECK). Sin permisos por módulo, sin auditoría de acciones.
- **Alta de admins**: `db/crear-admin.mjs <email>` (crea o resetea con clave temporal de 14 caracteres sin ambiguos, `must_change_password=true`, borra sesiones). No hay alta desde el panel.
- Debilidades: `must_change_password` solo se fuerza en páginas (layout), no en APIs; throttle se pierde al reiniciar y no es compartido entre procesos; sin CSRF token explícito (mitiga `SameSite=Lax` + JSON).

---

## 9. Backend del bot (`backend/src`)

- **Entrada**: `index.js` (Express). Orden: logger → `/api` webChat (con su propio CORS y parser de 9 MB) → `cors()` abierto → `express.json` con `rawBody` (firma Meta) → `/api` webhook → `/health`. `trust proxy` = loopback.
- **Flujo común** `services/conversation.js` `processTouristMessage` (L19-79):
  1. texto → directo; audio → `transcribeAudio` (Gemini Flash vía OpenRouter); imagen → `visionAnalyzeImage` responde directamente (intent `geo_quiz`, idioma fijo 'es', sin pasar por el agente).
  2. Contexto en paralelo: `fetchActiveFAQs()`, `fetchCulturalEvents()` (`services/api.js`: **ejecuta `curl` por shell** contra `https://comunicacionsmt.gob.ar/get_events` para evadir Cloudflare, 15 días), `fetchTouristBusSummary()` (circuitos activos + hasta 12 salidas con cupo en 21 días; **no considera bicis ni hora**), `getChatHistory(chatId, 6)`.
  3. `mainAgentProcess` (`ai/agent.js`): system prompt enorme en español con datos fijos (gastronomía, alojamiento, patrimonio, oficina), FAQs, agenda y bus inyectados; **salida estructurada** (`withStructuredOutput`, L253-270) con `intent`, `language`, `cuisine_type`, `budget`, `origen_provincia`, `medio_transporte`, `has_photo`, `additional_info` (la respuesta al usuario).
  4. Envía la respuesta, guarda memoria (`bot_chat_messages`, user+assistant) y loguea en `tourist_interactions`.
- **Tools/funciones**: **ninguna**. El agente no consulta disponibilidad a demanda ni crea reservas; solo ve el resumen inyectado y comparte `${PUBLIC_SITE_URL}/turistico` y `/educativo`.
- **Memoria**: últimas 6 entradas por `chat_id` en `bot_chat_messages`; si la tabla falla, cae a RAM (20 mensajes) hasta reiniciar. El widget además guarda hasta 60 mensajes en `localStorage` (`migue-chat-v1`) y reinicia la conversación tras 30 min de inactividad (`src/lib/migue-chat.ts` L28-46).
- **`services/api.js`**: **no llama a la app Next**; solo a la agenda cultural externa. Toda la integración con el sitio es por la base compartida.
- **WhatsApp** (`controllers/whatsappController.js`, `services/whatsapp.js`): Meta Cloud API (`GRAPH_API_VERSION` default v21.0), verificación GET, firma HMAC opcional, dedupe de `message.id` en memoria (≤2000), marca leído, descarga media a data URL, divide textos largos; soporta texto, audio/voice, imagen. Número "Migue Turista" +54 9 381 389-8033.
- **Telegram** (`src/telegram.js`, `services/telegram.js`): proceso aparte, grammY long polling, solo chats privados, cola por chat, "typing", HTML seguro (escapa y convierte `**`), `chat_id` `tg:<id>`. Requiere `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `OPENROUTER_API_KEY` o no arranca.
- **Chat web** (`controllers/webChatController.js`):
  - Request: `POST /api/chat/web`, JSON `{ sessionId: uuid, kind: 'text'|'image'|'audio', text?, media? (data URL base64), caption? }`. Texto ≤1000; caption ≤500; media ≤6 MB decodificados; imagen jpeg/png/webp; audio wav/x-wav/ogg/mpeg.
  - Response OK: `200 {reply: string}`. Error: `{error, message}` con códigos `invalid_session` 400, `empty_message`/`message_too_long`/`invalid_media`/`invalid_kind` 400, `rate_limited` 429 (+`Retry-After`), `busy` 429, `payload_too_large` 413, `forbidden_origin` 403, `bot_error` 502/504.
  - Rate limit en memoria: 8/min y 60/h por IP, 40/h por sesión, 1000/h global (`WEB_CHAT_MAX_*`). Cola por chat (máx. 2 en espera). Deadline 75 s (widget 90 s; nginx `proxy_read_timeout 90s`).
  - CORS: `WEB_CHAT_ALLOWED_ORIGINS` o `origin(PUBLIC_SITE_URL)` + `http://localhost:3000`.
  - `chat_id` = `web:<uuid>`.
- **Widget del sitio** (`src/components/migue/MigueChat.tsx`, 1121 l. + `migue-chat.module.css` 622 l.): URL de `NEXT_PUBLIC_MIGUE_CHAT_URL` (se hornea en build), timeout 90 s, fotos reescaladas a JPEG en el navegador, notas de voz grabadas con `MediaRecorder` y convertidas a WAV (≤60 s), render Markdown liviano propio (negrita, listas, links), idioma sincronizado con el toggle de `/turistico` (evento `tourist-language-change`), teaser en `/` y `/turistico`.
- **Puerto**: `PORT` (3000 en VPS; el README sugiere 3005 en local para no chocar con Next).
- **Archivos legados/inútiles**: `backend/tunnel.js` (localtunnel para ManyChat, webhook `/api/webhook/manychat` inexistente), `backend/setup_vps_multibot.sh`, `backend/deploy_vps.md` (IP vieja 77.37.126.249), `nginx_config*.conf` (`server_name servidoria.smt.gob.ar`), `test_curl.js` (simulador de webhook, útil).

---

## 10. Estilos

- **CSS plano + CSS Modules**, sin Tailwind ni librería de UI.
  - `src/app/globals.css` (1744 l.): importa **Inter** desde Google Fonts (`@import`, L1); tokens en `:root` (L4-31): `--bg-0 #f7f7f7`, `--bg-1 #ffffff`, `--bg-2 #f8fbff`, `--bg-3 #eef6ff`, `--border #e3e8ef`, `--accent #126ff5`, `--accent-light #2589ea`, `--accent-deep #28469f`, `--text-primary #080808`, `--text-secondary #1f2933`, `--text-muted #68737d`, `--success #10b981`, `--warning #f59e0b`, `--danger #ef4444`, `--radius 12px`, `--radius-sm 8px`, `--sidebar-w 240px`, sombras. Contiene el shell y todas las clases del panel admin (`.app-shell`, `.sidebar`, `.nav-link`, tablas, badges, modales).
  - Módulos: `components/educational-bus/form.module.css` (1179 l.; redefine `--brand-blue #2589ea`, `--brand-blue-strong #126ff5`, `--brand-blue-deep #28469f`, `--brand-blue-dark #1f367d`, `--brand-blue-soft #eef6ff`; **también lo usa el turístico como `formStyles`**), `tourist-bus/tourist.module.css` (559), `migue/migue-chat.module.css` (622, vars `--migue-*`), `bicitour/bicitour.module.css` (644, **Arial**), `bicitour/bicitour-map.css`, `fotos/[token]/gallery.module.css`, `galeria/gallery-index.module.css`, `landing.module.css`, `auth/auth.module.css`. `app/page.module.css` es sobrante de create-next-app (usa `--font-geist-sans`, sin uso).
  - Sin modo oscuro real (1 sola media query `prefers-color-scheme`). Efectos: `MouseExperience` (cursor), tilt/shine en tarjetas, video `public/videos/bus-turistico-smt.mp4` en hero.
  - Íconos `lucide-react`. Imágenes de hero en `public/hero-turistico-*`, logos `logoMuni-sm.png`, `Logo SMT blanco@2x.png`, `migue.jpg`.
- **Mapeo al destino** (`styles/tokens.css`, Encode Sans local, azul oficial `#0066FF`, celeste `#2EB1FF`, amarillo `#F4DC00`, escala `--c-azul-50…900`, tema claro/oscuro): `--accent #126ff5` ≈ `--c-azul-600`/`500`; `--accent-deep #28469f` ≈ `--c-azul-800/900`; `--bg-3 #eef6ff` ≈ `--c-azul-50 / --c-tinte-azul`; textos `#080808/#1f2933/#68737d` → tokens de tinta/gris del destino; Inter → Encode Sans. Recomendación: no portar `globals.css`; reescribir los componentes públicos con clases/tokens del destino y conservar solo los módulos de UI complejos (calendario educativo, chat) refactorizados a tokens.

---

## 11. Variables de entorno y despliegue

### 11.1 Sitio (`.env.example`)
Obligatorias: `DATABASE_URL`, `AUTH_SECRET` (≥32), `ARCHIVOS_DIR`. Opcionales: `OPENROUTER_API_KEY`, `OPENROUTER_TRANSLATE_MODEL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`, `SMTP_REPLY_TO`, `PUBLIC_SITE_URL`, `WHATSAPP_NOTIFICATIONS_ENABLED`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `CRON_SECRET`. No listadas pero usadas: `NEXT_PUBLIC_MIGUE_CHAT_URL` (build-time, documentada en README), `SMTP_ALLOW_INVALID_CERT`. Solo para la migración: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (`db/bajar-archivos.mjs`).

### 11.2 Backend (`backend/.env.example`)
`PORT`, `HOST`, `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_VISION_MODEL`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `GRAPH_API_VERSION`, `PUBLIC_SITE_URL`, `TELEGRAM_BOT_TOKEN`, `WEB_CHAT_ALLOWED_ORIGINS`, `WEB_CHAT_MAX_PER_IP_MINUTE`, `WEB_CHAT_MAX_PER_IP_HOUR`, `WEB_CHAT_MAX_PER_SESSION_HOUR`, `WEB_CHAT_MAX_GLOBAL_HOUR`.

### 11.3 Infraestructura (según `backend/DEPLOY.md`, `db/README.md`)
- VPS Hostinger `195.35.42.168` (`srv1915283.hstgr.cloud`), compartida con otros proyectos (panel en :3001).
- Usuario `turismo`, `/srv/turismo/{actual,versiones,compartido}`; `.env` del sitio en `/srv/turismo/compartido/.env`, del bot en `/srv/turismo/compartido/backend.env`; archivos en `/srv/turismo/compartido/archivos`.
- Despliegue: `/srv/turismo/desplegar.sh [rama]` (clona, instala, compila, mueve `actual`, `pm2 reload`) — **el script y `/srv/turismo/ecosystem.config.js` no están en el repo**.
- Procesos PM2 (3): sitio Next (`next start` en **127.0.0.1:3004**, inferido del comentario de `src/app/layout.tsx` L7-9 y del crontab), `turismo-bot` (Express :3000), `turismo-telegram`. El `backend/ecosystem.config.js` del repo usa nombres viejos (`bot-turismo-smt`, `bot-turismo-telegram`) y no incluye el sitio.
- nginx: sitio en `busturistico.smt.gob.ar` (`client_max_body_size 20M` para fotos); bot bajo `location /turismo/` → `http://127.0.0.1:3000/` con `client_max_body_size 10m`, `proxy_read_timeout 90s`, `X-Forwarded-For`. Webhook Meta: `https://srv1915283.hstgr.cloud/turismo/api/webhook/whatsapp`. Chat web: `https://srv1915283.hstgr.cloud/turismo/api/chat/web`.
- Cron: `15 3 * * *` limpieza de books. Respaldos: "pg_dump diario a programar" (no garantizado).
- Migración desde Supabase: `db/migrar-desde-supabase.sh` (pg_dump 17 → restore en 16, crea stubs auth/storage, corre 001, compara filas) y `db/bajar-archivos.mjs` (baja de Storage solo archivos referenciados).

---

## 12. Tests y lint
- **No hay tests** (ni unitarios ni e2e) en sitio ni backend. `backend/test_curl.js` es un script manual.
- **No hay ESLint** configurado ni como dependencia (hay comentarios `eslint-disable` sueltos). Sin Prettier. Solo `tsc` implícito en `next build` (`strict`).

---

## 13. Real vs. inacabado / dependencias de Supabase

| Elemento | Estado |
|---|---|
| Reservas turísticas, cancelación por token, exportaciones, lote semanal, bicis | Real, en producción |
| Mails SMTP | Real (opcional por env) |
| WhatsApp de reservas | Implementado, **apagado** por decisión 2026-09-01 |
| Traducción IA de circuitos | Real (opcional) |
| Bus Educativo (form, calendario, manual, export, settings, circuitos) | Real; 2 de 3 circuitos educativos inactivos; prioridad solo textual; sin mails a escuelas |
| Books de fotos + galería + cron | Real |
| Bicitour en vivo | Funcional pero oculto; contenido `[DEMO]`; sin pruebas de carga del polling |
| Dashboard/interacciones/FAQs | Real; seeds de RAMCC (abril 2026) vencidos |
| Bot WhatsApp/Telegram/web | Real; agenda cultural vía `curl` frágil (Cloudflare) |
| TODO/FIXME | Ninguno real (solo palabras "TODO(S)" en comentarios) |
| Catálogos estáticos duplicados | `touristCircuitCatalog` (13 circuitos; comentarios dicen 10), `circuitAvailability` y `defaultEducationalSettings` en código como fallback |

**Supabase**: ya no hay `@supabase/supabase-js` ni llamadas en runtime. Quedan: nombre de archivo `src/lib/supabase.ts` (solo tipos/constantes: `TouristInteraction`, `FAQ`, KPIs, `CATEGORIAS`, `INTENT_LABELS`, canales; importado por 8 archivos); comentarios que dicen "como devolvía Supabase"; los `supabase_*.sql` requieren stubs `auth.*`/`storage.*` para reconstruir una base de desarrollo; `db/bajar-archivos.mjs` y la "vuelta atrás" de `db/README.md` dependen de credenciales de Supabase; comentarios a Vercel (`maxDuration`, `WHATSAPP_NOTIFICATIONS_ENABLED … en Vercel`). Los formatos de URL firmada imitan a Supabase Storage.

---

## 14. Riesgos de integración y recomendación por funcionalidad

### 14.1 Riesgos transversales
1. **Fusión de esquemas**: el destino usa nombres en español (`admins`, `contenidos`, `auditoria`, `intentos_ingreso`) y migraciones en `supabase/migrations/`; este repo usa nombres en inglés sin colisiones aparentes. Hay que convertir la historia `supabase_*.sql` + `001` en **una migración consolidada idempotente** con orden explícito, sin RLS/policies de Supabase, sin `storage.buckets`, con `pgcrypto`.
2. **Auth duplicado**: `admin_profiles`+`admin_sessions`+cookie `smt_admin_session` vs. auth del destino (`lib/auth`, `public.admins` ligado a `auth.users`, cookie `turismo_sesion_local`, bcrypt vía pgcrypto). Unificar en el del destino; migrar hashes bcrypt (verificar que pgcrypto `crypt()` del destino acepte el prefijo que genere bcryptjs 3 — típicamente `$2b$`; los migrados de Supabase son `$2a$`). Un solo rol hoy; el destino tiene auditoría que este repo no usa.
3. **Middleware → proxy**: `middleware.ts` (Edge) debe fusionarse en el `proxy.ts` del destino, que ya reescribe rutas por idioma (`/[idioma]`). Las rutas públicas nuevas (`turistico`, `educativo`, `galeria`, `fotos/[token]`, `reserva/[token]`) deben entrar al esquema i18n del destino; los links de mails (`/reserva/<token>`, `/update-password#token`) y QR existentes (`/fotos/<token>`, `/bicitour/<code>`) **deben seguir resolviendo** (redirects permanentes).
4. **Contrato Migue**: destino `POST {MIGUE_URL}/api/turismo/chat {mensaje, sessionId, idioma}` → `{respuesta, acciones[]}` (default `https://migue.smt.gob.ar`); backend actual `POST …/turismo/api/chat/web {sessionId, kind, text|media|caption}` → `{reply}` (sin `acciones`, con audio/foto). Hay que agregar un endpoint adaptador en el backend (o cambiar el widget del destino) y ampliar CORS (`WEB_CHAT_ALLOWED_ORIGINS`) al dominio del portal. Decidir qué widget queda (el del destino es más simple; el de este repo soporta voz/foto).
5. **Base compartida bot↔sitio**: el bot lee `tourist_*` y `faqs` por SQL directo; cualquier renombre de tablas/columnas en el portal rompe al bot. Mantener nombres o exponer vistas de compatibilidad. Si el destino usa Supabase en algún entorno, el bot necesita `DATABASE_URL` directo.
6. **Almacenamiento**: este repo guarda en disco (`ARCHIVOS_DIR`) con URLs firmadas propias; el destino tiene `lib/almacenamiento.ts` (Supabase o local) y `app/subidas`. Unificar en una sola abstracción; si el portal corre en Vercel/serverless, **el disco local no sirve** (books y adjuntos educativos).
7. **Estilos**: Inter + tokens propios vs. Encode Sans + tokens v2 con modo oscuro. Los CSS Modules grandes (form 1179 l., chat 622 l., globals admin 1744 l.) no respetan el tema oscuro del destino.
8. **Dependencias nuevas en el destino**: `bcryptjs` (si se conserva auth propio), `nodemailer`, `leaflet` (solo Bicitour), `qrcode`, `recharts`, `date-fns`, `lucide-react` (el destino tiene `components/Iconos.tsx`). Evaluar reemplazar recharts/date-fns/lucide para no inflar el bundle.
9. **Puertos/procesos**: el sitio actual corre en :3004 y el bot en :3000 en la misma VPS; el destino debe definir dónde vive el bot (¿`migue.smt.gob.ar`?) y el crontab de limpieza.
10. **Seguridad a corregir en la fusión**: rate limit/captcha en reservas, solicitudes educativas y endpoints Bicitour; índice antiduplicado de reservas (p. ej. único parcial por `departure_id, lower(email)` con `status='confirmed'`, a validar con negocio); exigir `WHATSAPP_APP_SECRET` (hoy acepta webhooks sin firma); quitar `access_token` del listado público si los books deben ser privados; reemplazar el `exec('curl …')` por `fetch`; política de retención de `bot_chat_messages` y `tourist_interactions` (datos personales).

### 14.2 Recomendación por funcionalidad

| Funcionalidad | Recomendación | Notas |
|---|---|---|
| `create_tourist_booking` + tablas `tourist_departures`/`tourist_bookings` | **Reutilizar** tal cual | Núcleo estable. Mejoras opcionales: comparar fecha+hora en `PAST`; índice antiduplicado; no tocar firma de la función (la usa el sitio por parámetros nombrados). |
| API pública de reservas/cancelación (`/api/tourist-bus/*`) | **Reutilizar / adaptar** | Mover a `app/api/...` del destino sin cambiar contrato; agregar rate limit; mandar el mail fuera del camino crítico (cola o `after()`). |
| UI pública turística (`TouristExperience`) | **Adaptar (reescribir visual)** | Lógica de formulario/validación reutilizable (`src/lib/tourist-bus.ts`, `tourist-copy.ts`); estilos a tokens del destino; ES/EN debe pasar al i18n del destino en vez de localStorage. |
| Catálogo `tourist_circuits` | **Fusionar** | Solapa con `contenidos` colección `recorridos`/`experiencias` del destino. Decidir fuente única; mantener `slug` porque `tourist_departures.circuit_slug` y el bot lo usan. |
| Panel admin turístico (salidas, lote, export, avisos) | **Adaptar** | Portar a `app/admin/(panel)` con el auth del destino; corregir PATCH (cupo < reservado, fecha pasada, aviso al cambiar fecha), reconfirmación con lock, estado de reservas al cancelar salida. |
| Mails SMTP | **Reutilizar** | Mover `tourist-booking-email.ts` + `email-assets.ts`; ajustar branding a los nuevos tokens. |
| WhatsApp de reservas | **Reutilizar (apagado)** | Mantener detrás del flag. |
| Bicis municipales | **Reutilizar** | Viene dentro de reservas. |
| Bus Educativo (form, calendario, settings, circuitos, manual, export) | **Adaptar** | Lógica reutilizable (`educational-bus-requests.ts`); revisar índice único global vs. por circuito, `blockedUntil` default vencido, placeholder de adjunto en carga manual, notificación a escuelas (inexistente). |
| Books de fotos + galería + cron | **Adaptar** | Unificar almacenamiento con el del destino; decidir si `/galeria` pública es deseada (hoy expone tokens). Mantener `/fotos/<token>` por QR impresos. |
| Bicitour en vivo | **Retirar del alcance inicial (conservar código/tablas)** o **reutilizar más adelante** | Oculto, con contenido demo, polling 2,5 s; no es requisito para la estabilidad de reservas. Si se integra: mapa Leaflet y CSS propio (Arial) a rediseñar. |
| FAQs (tabla + CRUD) | **Fusionar** | Las consume el bot; integrarlas al admin del destino (posible colección en `contenidos`, pero entonces adaptar `fetchActiveFAQs` del bot). Limpiar seeds vencidos (RAMCC). |
| Interacciones + dashboard KPI | **Reutilizar / adaptar** | Vistas `kpi_*` portables; UI con recharts a decidir. |
| Auth propio (`admin_profiles`, sesiones, recuperación) | **Reemplazar** por el del destino | Migrar usuarios/hashes; retirar `db/crear-admin.mjs` en favor de `npm run cuentas` del destino. |
| `middleware.ts` | **Reemplazar** (fusionar en `proxy.ts`) | |
| `src/lib/archivos.ts` + `/api/archivos` | **Fusionar** con `lib/almacenamiento.ts` del destino | Mantener verificación HMAC y anti traversal si queda en disco. |
| `simple-xlsx.ts` | **Reutilizar** | Sin dependencias. |
| Widget `MigueChat` | **Fusionar** con `MigueTurismo.tsx` | Quedarse con uno; si se quiere voz/foto, portar esas partes; si no, adaptar el backend al contrato del destino. |
| Backend bot (Express, WhatsApp, Telegram, web) | **Reutilizar como servicio aparte** + **adaptar** | Agregar endpoint `/api/turismo/chat` compatible con el destino (`{respuesta, acciones}`), firma obligatoria del webhook, `fetch` en vez de `curl`, retención de memoria; opcional: tools para consultar salidas en vivo (sin crear reservas desde el bot, para no tocar la lógica de cupos). |
| Contenido fijo del prompt (gastronomía, hoteles, patrimonio) | **Reemplazar** por contenido del portal (`lib/migue.ts` `paraMigue`) | Evita dos fuentes de verdad. |
| `tunnel.js`, `deploy_vps.md`, `setup_vps_multibot.sh`, `nginx_config*.conf`, `ecosystem.config.js` del repo, `app/page.module.css`, landing `/` | **Retirar** | Legado/desactualizado; la landing selectora la reemplaza la home del portal. |
| `supabase_*.sql` | **Retirar** tras consolidar una migración única | Conservar como historia fuera del build. |
