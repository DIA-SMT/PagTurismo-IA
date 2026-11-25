# Auditoría de los tres repositorios

Fecha: 2026-11-20. Rama de integración: `integracion/portal-unificado` (sale de `main` de PagTurismo-IA).

| Repositorio | Commit auditado | Rol en la fusión |
|---|---|---|
| [DIA-SMT/PagTurismo-IA](https://github.com/DIA-SMT/PagTurismo-IA) | `352f6f9` (main) | **Base y fuente de verdad** del portal público, diseño, i18n, panel y auditoría |
| [DIA-SMT/Agenda-Cultural](https://github.com/DIA-SMT/Agenda-Cultural) | `df005ae` (main) | Origen de la agenda cultural, espacios culturales, calendario e importador |
| [DIA-SMT/BotTurismo-BackyFront](https://github.com/DIA-SMT/BotTurismo-BackyFront) | `1000e9b` (main) | Origen del Bus Turístico, Bus Educativo, books de fotos, BiciTour y backend de Migue (WhatsApp/Telegram/web) |

Los informes completos, con rutas y números de línea, están en
[`docs/auditoria/agenda-cultural.md`](auditoria/agenda-cultural.md) y
[`docs/auditoria/botturismo.md`](auditoria/botturismo.md). Este documento resume y compara.

Ramas no fusionadas: ninguna con trabajo pendiente salvo `matias` de BotTurismo (1 commit:
«Agregar aviso de museos cerrados los lunes», contenido del prompt del bot; queda registrado para el
equipo del bot, no afecta al portal).

---

## 1. Versiones y compatibilidad

| | PagTurismo | Agenda Cultural | BotTurismo (sitio) | BotTurismo (backend) |
|---|---|---|---|---|
| Next.js | 16.3.5 | 16.3.5 | 16.1.6 | — (Express 4.22) |
| React | 19.2.8 | 19.3.0 | 19.2.3 | — |
| TypeScript | 5 | 6.0.3 | 5.9 | JS |
| Driver PG | postgres.js 3.4.9 | postgres.js 3.4.9 | postgres.js 3.4.9 | postgres.js 3.4.9 |
| Estilos | CSS propio + tokens (sin Tailwind), tema claro/oscuro | CSS plano (Tailwind instalado pero sin clases) | CSS plano + CSS Modules | — |
| Tipografía | Encode Sans autoalojada | Manrope + Source Sans 3 (Google) | Inter (Google) | — |
| i18n | es / en / pt | solo es | es / en (toggle local) | detecta idioma |
| Tests | 81 (node:test) — **verdes** | 17 vitest + 2 Playwright | ninguno | ninguno |
| Dependencias extra | sharp, PGlite (dev) | zod, lucide, (leaflet y date-fns sin uso) | nodemailer, bcryptjs, leaflet, qrcode, recharts, lucide, date-fns | LangChain, grammY, axios |

Conclusión: los tres comparten la misma generación de Next/React y el mismo driver de base. **No hay
incompatibilidades de plataforma**; las diferencias son de modelo de datos, autenticación y estilo.

## 2. Arquitectura actual de cada proyecto

### PagTurismo-IA (base)
- App Router con todo el sitio público bajo `app/[idioma]/`; `proxy.ts` traduce `/en/things-to-do` →
  `/en/que-hacer` y pasa `x-idioma`. Panel en `app/admin/` (fuera del i18n).
- Datos: **una tabla documental** `public.contenidos (coleccion, slug, estado, datos jsonb)` con colecciones
  lugares, experiencias, eventos, recorridos, planifica, destacados, sabores, escapadas y configuracion.
  RLS: el sitio lee como `anon` (solo publicado), el equipo como `authenticated` con `es_admin()`.
  Auditoría por disparador, inmutable. Límite de intentos de ingreso en base.
- Tres modos (`lib/entorno.ts`): local (PGlite embebido), supabase (histórico) y **propio** (VPS municipal,
  producción actual: PostgreSQL 16, puerto 3007, `/srv/portalturismo`).
- Panel guiado por esquemas (`lib/admin/esquemas.ts`): un mismo esquema arma el formulario y valida en servidor.
  Traducciones por campo `traducible`.
- Migue: widget `components/MigueTurismo.tsx` → `POST https://migue.smt.gob.ar/api/turismo/chat`; Migue
  lee el contenido publicado de `GET /api/migue/contenido` (`lib/migue.ts`).

### Agenda Cultural
- Next 16 con `src/`; modelo **relacional** (`events`, `event_occurrences`, `event_categories`, `categories`,
  `places`, `profiles`, `login_attempts`) sin RLS. Nueve tablas más existen en el esquema pero **no las usa
  ningún código** (recurrencias, tours, páginas, faqs, guías, settings, redirecciones, media).
- Funciona de verdad con base: agenda con filtros, calendario mensual, franja semanal, ficha con `.ics`,
  Google Calendar y compartir; lugares con galería y mapa; panel de eventos/lugares/categorías.
- Sin base, los **eventos son de demostración** (`src/data/demo.ts`). Los e2e dependen de esa demo.
- Auth propia: scrypt `scrypt$N$r$p$sal$hash`, cookie `agenda_sesion` HMAC, roles admin/editor.
- Importador desde WordPress/EventON (`agendaculturalsmt.com`, ~383 eventos) con `legacy_id`.
- Páginas de contenido fijo (nuestra ciudad, patrimonio, ferias, gastronomía, guías…) escritas dentro de
  cada `page.tsx`.

### BotTurismo-BackyFront
- **Dos procesos**: sitio Next (127.0.0.1:3004, `busturistico.smt.gob.ar`) y backend Express del bot
  (127.0.0.1:3000, publicado bajo `/turismo/`), más Telegram como proceso PM2 aparte.
- Una base PostgreSQL `turismo` compartida por sitio y bot. Fuera de Supabase desde `b148051`.
- Reserva atómica en la base: `create_tourist_booking(...)` con `SELECT … FOR UPDATE` sobre la salida,
  control de cupo y de bicicletas municipales. **Es la pieza a preservar.**
- Bus Educativo con adjunto .docx en disco, turno único global (índice parcial fecha+turno).
- Books de fotos con URLs firmadas HMAC en disco, limpieza por cron.
- BiciTour en vivo funcional pero oculto del menú y con contenido `[DEMO]`.
- Auth propia: bcrypt costo 12, `admin_profiles` + `admin_sessions`, cookie `smt_admin_session`, un solo rol.
- El bot **no reserva**: inyecta en el prompt circuitos y salidas con cupo leídos de la base.

## 3. Modelos de datos y fuente de verdad

| Entidad | PagTurismo | Agenda | BotTurismo | **Fuente de verdad en el portal unificado** |
|---|---|---|---|---|
| Lugar turístico / espacio cultural | `contenidos/lugares` (24) | `places` (21 relevados) | — | `contenidos/lugares` (se amplía el modelo; se importan los espacios) |
| Evento y sus fechas | `contenidos/eventos` (4, calendario anual) | `events` + `event_occurrences` (~383 en el WordPress viejo) | — (el bot lee una agenda externa) | `contenidos/eventos` (se amplía con categorías culturales, galería, entradas, etc.) |
| Categoría cultural | — (temas y etiquetas) | `categories` | — | `configuracion/categorias.categoriasAgenda` |
| Recorrido narrativo | `contenidos/recorridos` | `tours` (sin uso) | — | `contenidos/recorridos` |
| Circuito operativo del bus | `experiencias/city-tour-bus-turistico` (texto) | — | `tourist_circuits` | `tourist_circuits` (base de buses); las fichas de recorrido lo enlazan por slug |
| Salida, cupo, reserva | `experiencias.salidas` (manual) | — | `tourist_departures`, `tourist_bookings` | **Solo la base de buses** (`create_tourist_booking`) |
| Solicitud educativa | — | — | `educational_bus_requests` | base de buses |
| Books de fotos | — | — | `photo_books`, `photo_book_photos` | base de buses + disco |
| BiciTour en vivo | — | — | `bicitour_*` | base de buses |
| FAQ de Migue | — | `faqs` (sin uso) | `faqs` (las lee el bot) | `faqs` de la base de buses (el bot ya las lee) |
| Interacciones de Migue | — | — | `tourist_interactions`, `bot_chat_messages` | base de buses (solo lectura desde el panel) |
| Cuentas del equipo | `auth.users` + `public.admins` | `profiles` (scrypt) | `admin_profiles` (bcrypt) | `auth.users` + `public.admins` con **rol y módulos** |
| Auditoría | `public.auditoria` (disparadores) | — | — | `public.auditoria` (se extiende a las acciones de buses) |
| Archivos | `CARPETA_SUBIDAS` → `/subidas/…` | `MEDIA_DIR` → `/media/…` | `ARCHIVOS_DIR` + `/api/archivos/…` firmado | Fotos de contenido: `CARPETA_SUBIDAS`; archivos operativos: `ARCHIVOS_DIR` |

## 4. Autenticación y permisos

| | Algoritmo | Sesión | Roles | Límite de intentos |
|---|---|---|---|---|
| PagTurismo | bcrypt (pgcrypto `crypt`) en `auth.users` | cookie HMAC `turismo_sesion_local`, 30 días | uno (admin activo) | en base, 5/15 min por correo e IP (hash SHA-256) |
| Agenda | scrypt (Node) | cookie HMAC `agenda_sesion`, 3 días deslizante | admin / editor | en base, 5 por correo, 20 por IP |
| BotTurismo | bcrypt (bcryptjs, costo 12) | cookie HMAC `smt_admin_session` + fila en `admin_sessions` | uno (`admin`) | en memoria |

Compatibilidad de contraseñas:
- **BotTurismo → portal: compatible.** Son hashes bcrypt (`$2a$`/`$2b$`), que `crypt()` de pgcrypto valida.
- **Agenda → portal: no compatible con pgcrypto.** Se agrega verificación scrypt en Node para cuentas
  importadas (ver ARQUITECTURA §6); nadie pierde su contraseña.

## 5. Integraciones externas y variables de entorno

| Integración | Dónde | Variables |
|---|---|---|
| Base del portal | PagTurismo | `DATABASE_URL`, `DIRECT_URL`, `SESION_SECRETO`, `CARPETA_SUBIDAS`, `SITIO_URL` |
| Base de buses | BotTurismo | `DATABASE_URL` (base `turismo`) → en el portal: `BUSES_DATABASE_URL` |
| Archivos operativos | BotTurismo | `ARCHIVOS_DIR`, `AUTH_SECRET` (firma) → en el portal: `ARCHIVOS_DIR`, `ARCHIVOS_SECRETO` |
| SMTP (mails de reservas) | BotTurismo | `SMTP_HOST/PORT/USER/PASS/FROM/SECURE/REPLY_TO`, `SMTP_ALLOW_INVALID_CERT` |
| WhatsApp Cloud API (avisos) | BotTurismo (apagado desde 2026-09-01) | `WHATSAPP_NOTIFICATIONS_ENABLED`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| OpenRouter (traducción de circuitos, IA de BiciTour) | BotTurismo | `OPENROUTER_API_KEY`, `OPENROUTER_TRANSLATE_MODEL` |
| Cron de limpieza de books | BotTurismo | `CRON_SECRET` |
| Migue (chat) | PagTurismo / Agenda | `NEXT_PUBLIC_MIGUE_URL` (compilación) |
| Clima | PagTurismo | API pública (`lib/clima.ts`) |
| Photon/Komoot (procedencia) | BotTurismo | sin clave |
| Backend del bot | BotTurismo `backend/` | `OPENROUTER_*`, `WHATSAPP_*`, `TELEGRAM_BOT_TOKEN`, `WEB_CHAT_*`, `DATABASE_URL` |

## 6. Despliegue real

Los tres proyectos corren en la **misma VPS municipal** (195.35.42.168, Ubuntu 24.04, nginx, PostgreSQL 16, PM2):

| Proceso | Puerto | Carpeta | Dominio |
|---|---|---|---|
| Portal de turismo (PagTurismo) | 3007 | `/srv/portalturismo` | `portalturismo.195-35-42-168.sslip.io` (provisorio), `turismo.smt.gob.ar` (destino) |
| Sitio Bus Turístico (BotTurismo) | 3004 | `/srv/turismo` | `busturistico.smt.gob.ar` |
| Bot Migue Turismo (Express) | 3000 | `/srv/turismo` | `srv1915283.hstgr.cloud/turismo/` |
| Bot Telegram | — | `/srv/turismo` | — |
| Agenda Cultural | (VPS, `/srv/agenda`, `MEDIA_DIR=/srv/agenda/media`) | | `agendaculturalsmt.com` sigue siendo el WordPress viejo |

El script de despliegue y el `ecosystem` de producción de BotTurismo **no están en el repo**; los del repo
están desactualizados. El de PagTurismo sí (`deploy/`).

## 7. Funcionalidades repetidas o incompatibles

1. **Agenda**: PagTurismo `/agenda` (+ ficha `/agenda/[slug]`) y Agenda Cultural `/agenda` + `/eventos/[slug]`.
2. **Lugares**: ambos `/lugares/[slug]`. PagTurismo no tiene listado `/lugares`; Agenda sí.
3. **Panel `/admin`**: tres paneles con tres autenticaciones.
4. **Migue**: tres widgets (`MigueTurismo`, `migue-chat` de Agenda, `MigueChat` del bus) contra tres
   contratos (`/api/turismo/chat`, `/api/agenda/chat`, `/api/chat/web`).
5. **`/api/migue/contenido`**: existe en PagTurismo y en Agenda, con **el mismo formato** (`version: 1`).
6. **Experiencia «City Tour en Bus Turístico»** de PagTurismo enlaza al sitio externo del bus; el bus
   tiene su propio catálogo de 13 circuitos en `tourist_circuits`.
7. **Archivos**: tres carpetas y tres formas de servir archivos.
8. **`middleware.ts`** (BotTurismo) vs **`proxy.ts`** (PagTurismo, convención de Next 16).

## 8. Riesgos de migración y de pérdida de información

| Riesgo | Mitigación |
|---|---|
| Reservas reales de producción | No se copian ni migran: el módulo de buses **se conecta a la misma base `turismo`**. Una sola autoridad de escritura (el portal) desde el corte. |
| Doble escritura durante el corte | El sitio viejo del bus pasa a redirecciones permanentes en el mismo despliegue en que el portal empieza a reservar (PLAN_MIGRACION §4). |
| Eventos editados en Agenda | Importación con prueba en seco por defecto, por `legacy_id`; nunca pisa una ficha editada en el portal sin `--actualizar`. |
| Contraseñas incompatibles (scrypt) | Verificación scrypt en Node para cuentas importadas; se re-hashea a bcrypt al primer ingreso. |
| Enlaces impresos y enviados por mail (`/reserva/<token>`, `/fotos/<token>`, QR) | Rutas conservadas en el portal y redirecciones 308 desde los dominios viejos. |
| Archivos (books, adjuntos educativos, fotos de Agenda) | Se reutiliza `ARCHIVOS_DIR` tal cual; las fotos de Agenda se copian a `CARPETA_SUBIDAS` con verificación. |
| Fallas detectadas en reservas (sin antiduplicado, cupo editable por debajo de lo reservado, salida del día ya partida) | Correcciones con pruebas, documentadas en ESTADO_INTEGRACION; la función atómica no se cambia de firma. |
| Datos personales (interacciones, chats, reservas) | Nunca entran en `/api/migue/contenido`; el panel los muestra solo con permiso de buses/Migue. |
| Build que consulta la base | El portal no consulta la base al compilar (lee en cada pedido). |
