# Auditoría técnica — Agenda Cultural SMT

Repositorio auditado: `C:\Repos\FinalTurismo\_fuentes\Agenda-Cultural` (solo lectura; no se modificó nada ni se corrió `npm install`).
Destino de la fusión: PagTurismo-IA (`C:\Repos\FinalTurismo`).
Fecha de la auditoría: 2026-11-20. Último commit del repo: `df005ae` (merge PR #14, "portada-sin-atajos"); 32 commits en total, casi todos del 18 al 20/11/2026 (el proyecto es muy reciente).

Todas las rutas de archivo son relativas a la raíz de Agenda-Cultural salvo indicación contraria.

---

## 0. Resumen ejecutivo

- App Next.js 16.3.5 (App Router, `src/`), React 19.3.0, TypeScript 6 estricto, PostgreSQL 16 vía driver `postgres` (postgres.js) 3.4.9, SQL a mano (sin ORM), zod 4 para validar.
- Tiene dos modos: **con `DATABASE_URL`** (real, DB) y **sin `DATABASE_URL`** (eventos de demostración de `src/data/demo.ts` + lugares reales leídos de `db/contenido/*.json`; el panel no funciona).
- Partes **reales y terminadas**: agenda pública (lista + calendario mensual + franja semanal), ficha de evento (con .ics, Google Calendar, WhatsApp/copiar enlace), lugares (listado, espacios culturales, al aire libre, ficha con galería y mapa), panel `/admin` (eventos con múltiples fechas, lugares con galería, categorías), login propio (scrypt + cookie HMAC), importadores desde WordPress/EventON y desde JSON, endpoint para Migue y widget de chat.
- Partes **solo de esquema (sin código que las use)**: `event_recurrence_rules`, `tours`, `tour_stops`, `pages`, `faqs`, `guides`, `site_settings`, `legacy_redirects`, `media_assets`, columna `scheduled_publish_at`, y varias columnas de `events`/`places` (ver §3.6).
- Páginas de contenido fijo (nuestra ciudad, patrimonio, ferias, gastronomía, guías, oficinas, FAQ, planificá tu viaje, murales, museo a cielo abierto): **texto hardcodeado en cada `page.tsx`**, fotos en `public/images/contenido/`. Contenido real (relevado del sitio viejo), no editable desde el panel.
- Estilo: **Tailwind 4 instalado pero sin usar** (solo `@import "tailwindcss"` como reset/preflight); todo el diseño es CSS plano en `src/app/globals.css` (755 líneas) con variables propias. Fuentes Manrope + Source Sans 3. Sin modo oscuro. Solo español, sin i18n.
- Modelo de datos **relacional** (tablas `events`, `event_occurrences`, `places`, `categories`…) vs. el destino, que guarda todo como **documentos jsonb** en `public.contenidos (coleccion, slug, estado, datos)`. Esta es la diferencia estructural más grande para la fusión.
- Conflictos directos con PagTurismo: rutas `/agenda`, `/lugares`, `/eventos`; entidades Evento/Lugar duplicadas; dos paneles admin con dos sistemas de auth distintos (scrypt+`agenda_sesion` vs bcrypt/pgcrypto o Supabase+`turismo_sesion_local`); dos widgets Migue con endpoints de chat distintos (`/api/agenda/chat` vs `/api/turismo/chat`) pero **el mismo formato** de `/api/migue/contenido`.

---

## 1. `package.json`

Archivo: `package.json` (49 líneas). Versiones fijadas exactas (sin `^`), confirmadas en `package-lock.json`.

### Dependencias de producción
| Paquete | Versión | Uso real |
|---|---|---|
| `next` | 16.3.5 | Sí |
| `react` / `react-dom` | 19.3.0 | Sí (el destino usa react 19.2.8 — **desalineado**) |
| `postgres` (postgres.js) | 3.4.9 | Sí, único driver de DB (`src/lib/db.ts`, scripts). No hay `pg`. |
| `zod` | 4.6.5 | Sí (validación de formularios y env) |
| `lucide-react` | 1.46.0 | Sí (iconos en todo el sitio) |
| `date-fns` | 4.4.0 | **No se usa** (grep sin resultados en `src/` y `scripts/`) |
| `leaflet` | 1.9.4 | **No se usa** (los mapas son iframes de Google Maps; `@types/leaflet` también sobra) |

### Dependencias de desarrollo
| Paquete | Versión |
|---|---|
| `tailwindcss` / `@tailwindcss/postcss` | 4.3.3 |
| `postcss` | 8.5.28 |
| `typescript` | 6.0.3 |
| `vitest` | 5.0.0 |
| `@vitejs/plugin-react` | 6.1.1 |
| `jsdom` | 30.0.1 |
| `@testing-library/react` | 16.3.3 |
| `@testing-library/jest-dom` | 7.0.1 |
| `@playwright/test` | 1.63.0 |
| `@electric-sql/pglite` | 0.5.16 (Postgres embebido para tests de SQL) |
| `eslint` / `eslint-config-next` | 9.39.5 / 16.3.5 |
| `@types/node` | 26.5.1 |
| `@types/react` / `@types/react-dom` | 19.3.0 |
| `@types/leaflet` | 1.9.22 (sobra) |

### Scripts (`package.json:5-19`)
- `dev` / `build` / `start`: Next estándar.
- `lint`: `eslint .` · `typecheck`: `tsc --noEmit` · `test`: `vitest run` · `test:watch` · `test:e2e`: `playwright test`.
- `db:migrate`: `node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/migrate.mjs`.
- `db:seed`: igual con `--seed` (carga `db/seed.sql`, solo desarrollo).
- `db:espacios`: `scripts/importar-espacios.mjs` (lugares desde JSON).
- `db:eventos`: `scripts/importar-eventos.mjs` (eventos desde WordPress/EventON).
- `equipo`: `scripts/equipo.mjs` (cuentas del panel).

Requiere Node ≥ 22.9 (por `--env-file-if-exists`; README:7).

Otros archivos de configuración:
- `next.config.ts`: `serverActions.bodySizeLimit: "32mb"` (l.18), `images.remotePatterns` para `https://agendaculturalsmt.com/wp-content/uploads/**` (l.21-27), formatos avif/webp, `allowedDevOrigins: ["127.0.0.1"]`, y **redirecciones** (l.30-50): `/que-hacer`→`/agenda`, `/bus-turistico(-smt)`→`https://busturistico.smt.gob.ar/` (307), `/faqs`, `/mapas-y-guias`, `/donde-y-que-comer`, `/plazas-y-parques`, `/plazas`, `/parques`, una redirección 308 `/<slug>`→`/lugares/<slug>` por cada uno de los 21 espacios de `db/contenido/*.json` (l.8-12), y `/www.agendaculturalsmt.com/events/:slug` y `/events/:slug` → `/eventos/:slug`.
- `postcss.config.mjs`: solo `@tailwindcss/postcss`.
- `tsconfig.json`: alias `@/*` → `./src/*`, `strict`, `allowJs: false` (los `.mjs` compartidos tienen `.d.mts` al lado).
- `AGENTS.md` / `CLAUDE.md`: solo el bloque estándar "This is NOT the Next.js you know".

---

## 2. Estructura y rutas

```
db/
  migrations/202609140001_initial_schema.sql   esquema completo
  migrations/202611180001_acceso_panel.sql     login del panel
  seed.sql                                     datos demo (solo dev)
  contenido/espacios-culturales.json           11 espacios relevados
  contenido/espacios-al-aire-libre.json        5 parques + 5 plazas
docs/architecture.md, docs/assets.md
scripts/  migrate.mjs, equipo.mjs, importar-espacios.mjs, importar-eventos.mjs
src/
  app/            rutas (públicas, admin, api, media)
  components/     admin/, agenda/, content/, events/, places/, header, footer, hero, migue-chat, demo-notice
  data/demo.ts    fixtures de demostración
  lib/            db, auth/, importacion/, fechas, formato, formularios, media, migue, links
  services/       consultas SQL públicas y admin/
  types/domain.ts contratos de dominio
  proxy.ts        protección de /admin (Next 16 "proxy", ex-middleware)
tests/e2e/public-flow.spec.ts
public/  brand/ciudad-smt.png, images/ (hero, circuito, contenido/<sección>/*.webp), migue/migue-avatar.webp  (~6,8 MB, 73 archivos)
```

### 2.1 Cuándo se usan datos demo
`isDatabaseConfigured = Boolean(process.env.DATABASE_URL)` (`src/lib/db.ts:6`).
- **Eventos**: sin DB, `getUpcomingEvents` devuelve `demoEvents` publicados (`src/services/events.ts:15-18`) y `getEventBySlug` busca en `demoEvents` (`events.ts:149-152`). Son 3 eventos demo con fechas fijas de septiembre de 2026 y **no se filtran por fecha** (siempre aparecen). Tienen `isDemo: true`.
- **Lugares**: sin DB, `getPlaces` usa los 21 espacios reales de `db/contenido/*.json` con fotos remotas de agendaculturalsmt.com (`src/services/places.ts:45-50`); `getPlaceBySlug` agrega además los 2 `demoPlaces` para que los eventos demo tengan ficha (`places.ts:52-60`).
- **Avisos**: `<DemoNotice/>` (`src/components/demo-notice.tsx`) solo se muestra si no hay DB; se usa en `/` (`src/app/page.tsx:30`) y `/agenda` (`src/app/agenda/page.tsx:67`). La ficha de evento muestra un aviso si `event.isDemo` (`src/app/eventos/[slug]/page.tsx:45`). El hero cambia su texto con `hasOfficialData` (`src/components/hero.tsx:43`).
- **Panel**: sin DB `currentStaff()` devuelve null y el login responde "El panel necesita la base de datos" (`src/app/admin/login/actions.ts:34`).
- **Migue**: excluye eventos `isDemo` (`src/lib/migue.ts:127`).
- Detalle: sin DB el **sitemap sí incluye los slugs demo** (`src/app/sitemap.ts:16` → `getEventSlugs`).
- `db/seed.sql` es otra fuente demo (para DB de desarrollo): 3 categorías "· Demo", 1 lugar demo, 1 evento demo `legacy_id='demo-1'` con 2 fechas relativas a `current_date`.

### 2.2 Rutas públicas
| Ruta | Archivo | Qué hace | Datos |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Portada: hero con buscador (`/agenda?q=`), 3 próximos eventos, franja de 7 días (`WeekStrip`), 4 categorías más populares con emoji, accesos a lugares/bus turístico, "imperdibles" (ferias, murales, museo cielo abierto) fijos, franja alojamiento/gastronomía/agencias, banner app Ciudad SMT. `revalidate = 300` (l.17). | DB (o demo) + fijo |
| `/agenda` | `src/app/agenda/page.tsx` | Vista **lista** (paginada de a 12, filtros q/category/place/from/to/free, atajos `range=today`/`weekend`) y vista **calendario** (`?view=calendar&month=AAAA-MM&day=AAAA-MM-DD`: mes con conteo por día y agenda del día con anterior/siguiente). No permite navegar a meses pasados (l.136-142). Dinámica (usa `searchParams`). | DB (o demo) |
| `/eventos/[slug]` | `src/app/eventos/[slug]/page.tsx` | Ficha: hero con imagen, categorías, descripción en párrafos, próximas fechas, compartir, datos (fecha/hora/lugar/entrada), botones "Cómo llegar" (Google Maps por dirección), Google Calendar (l.27, l.56) y `.ics`. JSON-LD `Event` (l.28). | DB (o demo) |
| `/lugares` | `src/app/lugares/page.tsx` | Todos los lugares publicados agrupados por tipo. `revalidate = 600`. | DB (o JSON) |
| `/lugares/[slug]` | `src/app/lugares/[slug]/page.tsx` | Ficha: hero, descripción, servicios, galería, mapa embebido (iframe Google Maps si hay coordenadas, l.92-97), próximos 3 eventos del lugar, horarios, teléfono, redes, "Cómo llegar", "Comprar entradas". JSON-LD `Place`. No muestra `email` ni `website` aunque existan. | DB (o JSON) |
| `/espacios-culturales` | `src/app/espacios-culturales/page.tsx` | Lugares de tipo museum/theater/cultural_house/heritage/other agrupados. `revalidate = 600`. | DB (o JSON) |
| `/espacios-al-aire-libre` | `src/app/espacios-al-aire-libre/page.tsx` | Parques y plazas (DB/JSON) + 3 tarjetas fijas (murales, museo cielo abierto, mapa.smt.gob.ar). | DB + fijo |
| `/nuestra-ciudad`, `/patrimonio-historico`, `/ferias-municipales`, `/gastronomia`, `/guias`, `/oficinas`, `/preguntas-frecuentes`, `/planifica-tu-viaje`, `/pintamos-la-ciudad-que-queremos`, `/museo-escultorico-a-cielo-abierto` | `src/app/<ruta>/page.tsx` | Contenido fijo (ver §9). | Hardcodeado |
| `/media/[...ruta]` | `src/app/media/[...ruta]/route.ts` | Sirve archivos de `MEDIA_DIR` (necesario para el optimizador de `next/image`; en la VPS nginx sirve `/media/` directo). Protección de path traversal (l.13-14), whitelist de extensiones, `Cache-Control: immutable`. | Disco |
| `/robots.txt` | `src/app/robots.ts` | Bloquea `/admin/` y `/api/`. | — |
| `/sitemap.xml` | `src/app/sitemap.ts` | 15 rutas fijas + eventos por venir + lugares. `revalidate = 3600`. | DB (o demo) |
| `error.tsx`, `not-found.tsx`, `loading.tsx` | `src/app/` | Estados de error/404/esqueleto. | — |

### 2.3 Rutas API
| Ruta | Archivo | Qué hace |
|---|---|---|
| `GET /api/events/[slug]/ics` | `src/app/api/events/[slug]/ics/route.ts` | Genera VCALENDAR con **solo la primera fecha** pendiente (l.12-13). |
| `GET /api/migue/contenido` | `src/app/api/migue/contenido/route.ts` | Contenido publicado en texto para Migue (ver §7). `force-dynamic`, `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. |

### 2.4 Rutas del panel (`/admin`)
Todas llaman `requireStaff()`; el layout (`src/app/admin/layout.tsx`) no protege por sí solo.
| Ruta | Archivo | Función |
|---|---|---|
| `/admin/login` | `src/app/admin/login/page.tsx` + `actions.ts` | Ingreso correo+contraseña; `logout` en el mismo `actions.ts:58-61`. |
| `/admin` | `src/app/admin/page.tsx` | Tablero: contadores (eventos por venir/publicados/borradores, lugares y categorías publicados). |
| `/admin/eventos` | `src/app/admin/eventos/page.tsx` | Lista (máx. 200) con búsqueda por título (`ilike`) y filtro por estado. |
| `/admin/eventos/nuevo`, `/admin/eventos/[id]` | `.../nuevo/page.tsx`, `.../[id]/page.tsx` | Formulario `EventForm` (`src/components/admin/event-form.tsx`); borrar solo admin (`[id]/page.tsx:39`). |
| `/admin/lugares`, `/nuevo`, `/[id]` | `src/app/admin/lugares/*` | Lista y formulario `PlaceForm`; **no hay borrado** (se pasa a borrador/archivado). |
| `/admin/categorias`, `/nueva`, `/[id]` | `src/app/admin/categorias/*` | CRUD; borrar solo admin (`[id]/page.tsx:25`). |

Server Actions: `src/app/admin/eventos/actions.ts`, `src/app/admin/lugares/actions.ts`, `src/app/admin/categorias/actions.ts`, `src/app/admin/login/actions.ts`.

No hay gestión de cuentas desde la web (solo consola, `scripts/equipo.mjs`), ni auditoría de cambios, ni vista previa de borradores, ni programación de publicación.

---

## 3. Modelo de datos

Archivos: `db/migrations/202609140001_initial_schema.sql` (280 líneas), `db/migrations/202611180001_acceso_panel.sql` (21 líneas). PostgreSQL 16 "sin servicios de Supabase", sin RLS (l.1-2): solo la app se conecta. `scripts/migrate.mjs` aplica cada archivo en su transacción y registra en `public.schema_migrations(name text pk, applied_at)` (l.21).

### 3.1 Enums (`initial_schema.sql:5-12`)
| Enum | Valores |
|---|---|
| `user_role` | admin, editor |
| `profile_status` | active, inactive |
| `publication_status` | draft, published, archived |
| `event_status` | draft, published, suspended, rescheduled, finished, archived |
| `occurrence_status` | scheduled, suspended, rescheduled, cancelled |
| `access_type` | free, paid, check |
| `place_type` | museum, theater, cultural_house, square, park, gastronomy, heritage, office, other |
| `tour_status` | draft, available, unavailable, archived |

### 3.2 Tablas en uso

**`public.profiles`** (l.14-22 + `acceso_panel.sql:3-9`) — cuentas del panel
- `id uuid pk default gen_random_uuid()`
- `email text not null unique`, check minúsculas + regex de email
- `full_name text not null` check 2–120
- `role user_role not null default 'editor'`
- `status profile_status not null default 'inactive'`
- `created_at`, `updated_at timestamptz` (trigger `set_updated_at`)
- `password_hash text` (formato scrypt, nulo hasta asignar)
- `sessions_valid_since timestamptz not null default date_trunc('second', now())`
- `last_login_at timestamptz`

**`public.login_attempts`** (`acceso_panel.sql:12-21`)
- `id bigint identity pk`, `email text not null`, `ip text`, `succeeded boolean not null`, `created_at`
- índices `(email, created_at desc)`, `(ip, created_at desc)`. Sin purga automática.

**`public.categories`** (l.24-34)
- `id uuid pk`, `name text` check 2–80, `slug text unique` regex kebab, `description text`, `color text` check `^#[0-9A-Fa-f]{6}$`, `icon text`, `status publication_status default 'draft'`, timestamps.
- `color` solo se usa en el panel (punto de color en la lista); `icon` nunca se usa. El sitio público usa emojis por slug (`src/lib/category-emoji.ts`, 50 slugs + palabras clave).

**`public.places`** (l.36-64) — "espacios"/lugares
- `id uuid pk`, `name` check 2–160, `slug unique` kebab, `type place_type default 'other'`
- `summary`, `description`, `address text`
- `latitude numeric(9,6)`, `longitude numeric(9,6)` con rangos y check "ambas o ninguna"
- `opening_hours jsonb default '{}'` — en la práctica `{"lineas": string[]}` (`src/services/place-rows.ts:16`)
- `phone`, `email` (regex), `website`, `social_links jsonb default '{}'` — `{instagram?, facebook?, entradas?}` (`src/types/domain.ts:37-42`)
- `accessibility text`, `services text[] default '{}'`, `price text`
- `main_image_path text`, `gallery_paths text[] default '{}'`
- `featured boolean default false`, `status publication_status default 'draft'`
- `seo_title`, `seo_description`
- `created_by uuid fk → profiles(id) on delete set null`, timestamps
- Índices: `places_type_status_idx (type, status)`, `places_featured_idx (featured) where featured`.

**`public.events`** (l.66-101)
- `id uuid pk`, `title` check 2–180, `slug unique` kebab, `summary`, `description`
- `main_image_path`, `gallery_paths text[]`
- `place_id uuid fk → places(id) on delete set null`
- Lugar "a mano": `custom_place_name`, `custom_address`, `custom_latitude`, `custom_longitude` (check ambas o ninguna)
- Check `place_id is not null or custom_place_name is not null` (l.99)
- `organizer`, `contact_info jsonb default '{}'`, `price text`, `access_type access_type default 'check'`
- `registration_url`, `ticket_url`, `capacity int > 0`, `accessibility`, `requirements`
- `featured boolean default false`, `status event_status default 'draft'`
- `published_at timestamptz`, `scheduled_publish_at timestamptz`
- `seo_title`, `seo_description`
- `legacy_id text`, `legacy_url text` (id y URL de WordPress)
- `created_by fk → profiles`, timestamps
- Índices: `events_status_publish_idx (status, published_at desc)`, `events_featured_idx (featured) where featured`, `events_legacy_id_idx (legacy_id) where legacy_id is not null` (**no es unique**: la unicidad de importación se garantiza en código).

**`public.event_categories`** (l.103-108): `event_id fk cascade`, `category_id fk cascade`, `created_at`, PK `(event_id, category_id)`.

**`public.event_occurrences`** (l.110-125) — las fechas/funciones
- `id uuid pk`, `event_id fk → events on delete cascade`
- `starts_at timestamptz not null`, `ends_at timestamptz` (check `>= starts_at`)
- `all_day boolean default false`
- `timezone text default 'America/Argentina/Tucuman'` con check que **solo admite ese valor**
- `status occurrence_status default 'scheduled'`
- `is_exception boolean default false`, `original_starts_at timestamptz`, `notes text` (sin uso en código)
- `unique (event_id, starts_at)`
- Índices `(starts_at, event_id)`, `(event_id, starts_at)`.

**`public.schema_migrations`**: creada por `scripts/migrate.mjs`.

### 3.3 Tablas que existen pero **no usa ningún código** (grep en `src/` y `scripts/` sin resultados)
- `event_recurrence_rules` (l.127-141): `frequency` weekly/monthly/custom, `interval_value`, `weekdays smallint[]`, `month_days smallint[]`, `until_date`, `rrule`, `exceptions jsonb`. **La recurrencia no está implementada**: cada repetición se carga como una fila en `event_occurrences`.
- `tours` (l.143-160) y `tour_stops` (l.162-173): circuitos/recorridos con paradas — sin pantallas ni consultas.
- `pages` (l.175-187): páginas con `content jsonb` — las páginas fijas no la usan.
- `faqs` (l.189-199): la página de FAQ está hardcodeada.
- `guides` (l.201-212): la página de guías está hardcodeada.
- `site_settings` (l.214-223): fila única (`id boolean pk check(id)`), insertada al migrar (l.280), nunca leída.
- `legacy_redirects` (l.225-232): las redirecciones están en `next.config.ts`.
- `media_assets` (l.234-246): las subidas no se registran en la DB.

### 3.4 Eventos vs. ocurrencias (fechas)
- Un **evento** es la ficha; sus **ocurrencias** son instantes `timestamptz` (UTC en DB, Tucumán UTC−3 fijo en la app: `src/lib/dates.ts:1-3`, sin horario de verano).
- Publicado públicamente = `events.status = 'published'` **y** al menos una ocurrencia no cancelada con `coalesce(ends_at, starts_at) >= now()` (`src/services/event-queries.ts:33-43`). Una muestra de un mes sigue visible hasta que termina.
- La ficha `/eventos/[slug]` se ve aunque todas las fechas hayan pasado (`event-queries.ts:46-55`), pero no si no tiene ninguna fecha no cancelada.
- Ocurrencias `cancelled` se excluyen siempre (SQL y `mapEventRow`, `src/services/event-rows.ts:126-129`). `suspended`/`rescheduled` se muestran **sin indicación visual** en el sitio (solo Migue las rotula, `src/lib/migue.ts:44-49`).
- `all_day`: soportado en el modelo, calendario y Migue, pero **el panel no permite marcarlo** (el editor de fechas solo tiene día, inicio, fin, estado: `src/components/admin/occurrences-editor.tsx`) y el importador tampoco lo setea. En la práctica siempre es `false`.
- Hora de cierre anterior a la de inicio ⇒ termina al día siguiente (`src/lib/occurrences-form.ts:30-31`).
- Los estados de evento `suspended`, `rescheduled`, `finished` existen en el panel, pero **el sitio solo muestra `published`**: un evento "Suspendido" desaparece en vez de mostrarse como suspendido. `src/lib/migue.ts:127` contempla `rescheduled` pero nunca le llega.
- JSON-LD siempre declara `eventStatus: EventScheduled` (`src/app/eventos/[slug]/page.tsx:28`).
- Publicar exige al menos una fecha no cancelada (`src/app/admin/eventos/actions.ts:60-62`). `published_at` se estampa la primera vez que se publica (`src/services/admin/events.ts:115,122`); no se usa para ordenar en público.

### 3.5 Categorías, lugares, estados, destacados, gratuidad, imágenes
- **Categorías**: N:M con eventos. Públicamente solo se ven las `published` (`event-queries.ts:18`). Los filtros de la agenda se derivan de las categorías/lugares que tienen eventos por venir (`src/services/events.ts:164-173`), no de la tabla completa.
- **Lugares**: `published` visibles; si el evento apunta a un lugar no publicado, se muestra como lugar "a mano" sin enlace (`event-rows.ts:93-105`). Agrupación por tipo con etiquetas en `src/services/place-rows.ts:29-39`. Tipos "culturales" = museum, theater, cultural_house, heritage, other; "aire libre" = park, square (`src/services/places.ts:11-12`). `gastronomy` y `office` existen pero no tienen datos ni página que los liste aparte.
- **Estados**: categorías y lugares usan `publication_status` (draft/published/archived); eventos usan `event_status` (6 valores); ocurrencias `occurrence_status`.
- **Destacado** (`featured`): en eventos solo agrega la insignia "Destacado" en la tarjeta (`src/components/events/event-card.tsx:18`); no hay sección ni orden por destacado. En lugares es editable pero no se usa en el sitio. El importador lo fuerza a `false` (`src/lib/importacion/eventon.mjs:172-174`: "el 73 % estaba marcado como destacado").
- **Gratis/pago**: `access_type` free/paid/check + `price` texto libre. Etiqueta: Gratis / precio o "Pago" / "Consultar" (`src/lib/format.ts:51-55`). Filtro `free=1` = `accessType === 'free'`.
- **Imágenes**: `main_image_path` es URL absoluta o ruta `/media/...`; cualquier otra cosa se descarta (`event-rows.ts:66-70`). Fallback del evento: imagen propia → imagen del lugar → `/images/hero-cultura-smt.jpg` (`event-rows.ts:137`). `events.gallery_paths` no se usa; `places.gallery_paths` sí.

### 3.6 Columnas sin uso en código
- `events`: `gallery_paths`, `custom_latitude/longitude` (se leen pero el panel no las edita), `contact_info` (el dominio `contact` nunca se llena), `capacity`, `requirements`, `scheduled_publish_at`, `seo_title`, `seo_description`, `created_by`.
- `places`: `price`, `accessibility` (se lee, no se edita), `seo_*`, `created_by`; `email`/`website` se editan pero no se muestran en la ficha.
- `event_occurrences`: `is_exception`, `original_starts_at`, `notes`, `timezone`.
- `categories`: `icon`, `description` (se edita, no se muestra).

### 3.7 Triggers y funciones
`public.set_updated_at()` (l.260-266) + 11 triggers `before update` (l.268-278). No hay auditoría.

---

## 4. Capa de servicios y librerías

### 4.1 Acceso a DB — `src/lib/db.ts`
- Pool global `postgres(databaseUrl, { max: DATABASE_POOL_MAX || 10, idle_timeout: 30 })` (l.19-25), reutilizado en hot reload.
- API propia `Query = (text, params) => Promise<T[]>` sobre `sql.unsafe(text, params)` (l.27-29) — SQL parametrizado `$1..$n`, no tagged templates. `db.transaction(work)` con `sql.begin`.
- Convención: los parámetros JSON se pasan como `$n::text::jsonb` (test dedicado `src/services/sql-params.test.ts`).

### 4.2 Consultas públicas de eventos
- `src/services/event-queries.ts`: `selectUpcomingEventRows(query, now)` (l.36-44) devuelve **todos** los eventos publicados con fechas pendientes, con lugar, categorías y ocurrencias anidadas por `json_build_object`/`json_agg`. `selectEventRowBySlug` (l.47-56).
- `src/services/event-rows.ts`: `mapEventRow` (l.124-151) convierte filas a `CulturalEvent`.
- `src/services/events.ts`: **todo el filtrado se hace en memoria**, sobre la lista completa cacheada por request con `React.cache` (l.15-18):
  - `matchingEvents` (l.21-28): búsqueda sin tildes/mayúsculas sobre título, resumen y nombre del lugar; `category` (slug); `place` (slug); `free`.
  - `filterEvents` (l.30-47): rango `from`/`to` (días de Tucumán), muestra la primera fecha dentro del rango, ordena por fecha, pagina (`pageSize` 1–24, default 9).
  - Calendario: `countByDay` (l.71-100: eventos distintos por día, muestras de varios días cuentan cada día, top 3 categorías por día), `lastActivityDay` (l.103-112), `eventsOnDay` (l.124-138: primero con horario, luego "todo el día"/en curso), `getCalendarDays`, `getDayEvents`.
  - `getAgendaOptions` (l.164-173), `getPopularCategories` (l.176-189), `getAllUpcomingEvents` (Migue), `getEventSlugs` (sitemap).
  - Rango "fin de semana": `weekendRange` en `src/lib/dates.ts:34-39` (vie–dom; si es sáb/dom, desde hoy).
- Escalabilidad: carga todos los eventos por venir en cada request dinámico (agenda). Con cientos de eventos está bien; con miles convendría filtrar en SQL.

### 4.3 Lugares
- `src/services/place-queries.ts`: `selectPublishedPlaceRows(query, types)` (tipos como CSV → `string_to_array(...)::place_type[]`, l.10-16), `selectPlaceRowBySlug`.
- `src/services/places.ts`: `getPlaces(types)`, `getPlaceBySlug`, `groupPlacesByType`; fallback JSON sin DB.

### 4.4 Fechas, formato y calendario
- `src/lib/dates.ts`: `todayInTucuman`, `tucumanDate` (offset fijo −3 h, l.23-26), `addDays`, `weekendRange`, `toTucumanParts`/`fromTucumanParts` (formularios), `startOfDay`/`endOfDay`.
- `src/lib/calendar.ts`: meses `AAAA-MM`, `monthWeeks` (lunes a domingo), etiquetas en español.
- `src/lib/format.ts`: formateadores `es-AR` en zona Tucumán; `formatCalendarDate` → `20260918T230000Z` (UTC) para Google Calendar e ICS (l.28-30); año visible solo si no es el actual.
- Componentes: `src/components/agenda/month-calendar.tsx` (4 tonos de intensidad según carga del día, emojis de categorías), `day-agenda.tsx`, `week-strip.tsx`, `filters.tsx` (formulario GET; en móvil `<dialog>`).

### 4.5 Exportación ICS — `src/app/api/events/[slug]/ics/route.ts`
- VCALENDAR 2.0, `PRODID:-//Agenda Cultural SMT//ES`, un único VEVENT con `UID:<occurrence.id>@agendaculturalsmt`, `DTSTART/DTEND` en UTC (Z), SUMMARY/DESCRIPTION (resumen)/LOCATION escapados (l.4-6, 13).
- Limitaciones: **solo la primera fecha pendiente**; sin plegado de líneas (RFC 5545 75 octetos); "todo el día" no se exporta como `VALUE=DATE`; sin URL del evento; no refleja estado suspendido/reprogramado.
- El destino ya genera su `.ics` como data URI en `app/[idioma]/agenda/[slug]/page.tsx:35-51` del portal.

### 4.6 Compartir — `src/components/events/share-actions.tsx`
WhatsApp (`https://wa.me/?text=`) y copiar enlace (`navigator.clipboard`). No usa Web Share API. Google Calendar se arma en la ficha (`src/app/eventos/[slug]/page.tsx:27`).

### 4.7 Medios (subida y servicio)
- Carpeta: `mediaDir()` = `process.env.MEDIA_DIR || <cwd>/media` (`src/lib/media.ts:5-7`). En la VPS `MEDIA_DIR=/srv/agenda/media`. `/media` está en `.gitignore`.
- Subida: `saveImage(file, "eventos" | "lugares")` (`src/lib/media-upload.ts:24-35`): máx. 10 MB, tipo detectado por *magic bytes* (JPG/PNG/WebP/AVIF, l.9-16), nombre `MEDIA_DIR/<carpeta>/<año>/<uuid>.<ext>`, devuelve `/media/<carpeta>/<año>/<uuid>.<ext>`. Sin redimensionado ni registro en `media_assets`.
- Servicio: `/media/[...ruta]` (ver §2.2) + nginx en producción. Extensiones admitidas: jpg, jpeg, png, webp, avif, gif, pdf (`src/lib/media.ts:9-17`).
- Imágenes importadas: `MEDIA_DIR/eventos/wordpress/<año>/<mes>/<archivo>` y `MEDIA_DIR/lugares/<slug>/<archivo>`.
- **Al reemplazar o quitar una imagen el archivo viejo no se borra** (huérfanos en disco).
- Límite de cuerpo de Server Actions 32 MB (`next.config.ts:18`); nginx debe tener `client_max_body_size 32M`.

### 4.8 Formularios y validación
- `src/lib/forms.ts`: lectura de `FormData` (`text`, `optionalText`, `lines`, `checkbox`, `all`, `files`), `slugify` (sin tildes, máx. 80), `SLUG_PATTERN`, `submittedValues` (para repoblar el formulario si falla), `isUniqueViolation` (código 23505).
- `src/lib/form-state.ts`: `firstError(zodError, labels)` y `revalidatePublicSite()` = `revalidatePath("/", "layout")` (**invalida todo el sitio** en cada guardado).
- `src/lib/occurrences-form.ts`: `readOccurrences` (columnas paralelas `occ_id[]`, `occ_date[]`, `occ_start[]`, `occ_end[]`, `occ_status[]`), valida formato, duplicados de inicio.
- Esquemas zod en cada `actions.ts` (eventos l.15-30, lugares l.14-28, categorías l.11-17, login l.16-19).
- `src/services/admin/events.ts:102-151` `saveEvent`: transacción que hace upsert del evento, reemplaza categorías, borra ocurrencias que no vinieron y actualiza/inserta el resto. `listEventsAdmin` (l.74-87), `adminCounts` (l.157-167).
- `src/services/admin/places.ts` y `categories.ts`: CRUD análogo. `placeOptions` incluye borradores para el selector de eventos.
- No hay CSRF propio (se apoya en Server Actions de Next) ni límite de tasa en acciones del panel.

### 4.9 Otros
- `src/lib/env.ts`: solo valida `NEXT_PUBLIC_SITE_URL` con zod.
- `src/lib/links.ts`: URLs municipales fijas (bus turístico, linktr.ee de inscripción, mapa.smt.gob.ar, apps Ciudad SMT, redes de Municipalidad y Turismo).

---

## 5. Autenticación del panel

- **Hash**: scrypt nativo de Node (`src/lib/auth/password.mjs`). Parámetros N=2^15, r=8, p=1, clave 64 bytes, sal 16 bytes aleatoria, `maxmem` 64 MB (l.5-10). Normaliza la contraseña NFKC (l.16). Formato guardado: `scrypt$N$r$p$<sal base64>$<hash base64>` (l.23-28). Verificación con `timingSafeEqual` (l.30-36). `verifyAgainstNothing` con hash ficticio para igualar tiempos (l.38-43). **Contraseña mínima: 6 caracteres** (l.12, "corto a pedido del equipo").
- **Token de sesión** (`src/lib/auth/token.ts`): `base64url(JSON{sub, auth, exp}) + "." + HMAC-SHA256(base64url)` (l.32-40). `sub` = `profiles.id`, `auth` = segundos del ingreso con contraseña, `exp` = vencimiento. Duración 3 días (l.9), renovación deslizante a partir de la mitad de su vida conservando `auth` (l.58-60).
- **Cookie**: nombre `agenda_sesion` (l.6); `httpOnly`, `secure` en producción, `sameSite: lax`, `path: /`, `maxAge` 3 días (l.62-71).
- **Secreto**: `SESION_SECRETO` (≥ 32 caracteres). En producción sin él lanza error (l.20-28); en dev usa uno fijo `"solo-para-desarrollo-no-usar-en-produccion-0000"`.
- **Proxy** (`src/proxy.ts`, matcher `/admin/:path*`, l.35): primera barrera; solo verifica firma y vencimiento sin ir a la DB; redirige a `/admin/login?next=<ruta>`; renueva cookie; agrega `X-Robots-Tag: noindex, nofollow` y `Cache-Control: no-store`.
- **Segunda barrera** (`src/lib/auth/session.ts`): `currentStaff()` (cacheado por request) relee la cuenta y aplica `sessionStillValid` (`src/services/admin/accounts.ts:30-33`: activa, con contraseña y `auth*1000 >= sessions_valid_since`). `requireStaff()` y `requireAdmin()` (redirige a `/admin?aviso=solo-admin`). Llamado en cada página y Server Action.
- **Login** (`src/app/admin/login/actions.ts:33-56`): zod, límite de intentos (5 fallos por correo o 20 por IP en 15 min, `accounts.ts:41-54`), mismo mensaje para cuenta inexistente/inactiva/contraseña mala, registra intento, `markLogin`, setea cookie, `safeNext` solo a rutas `/admin…` (l.22-25). IP de `x-real-ip` o primer valor de `x-forwarded-for` (l.27-31).
- **Logout**: borra la cookie; no invalida el token en servidor (para eso, `cerrar-sesiones`).
- **Roles**: `editor` y `admin`. Ambos crean/editan/publican eventos, lugares y categorías. Solo `admin` borra eventos y categorías. Nadie borra lugares.
- **Cuentas** (`scripts/equipo.mjs`): comandos `listar`, `crear <correo> "<Nombre>" [editor|admin]`, `clave <correo>`, `rol <correo> admin|editor`, `desactivar`, `activar`, `cerrar-sesiones`. Las contraseñas se piden por TTY oculto (l.24-32). Cortar sesiones = `sessions_valid_since = date_trunc('second', now())`.
- Comparación con el destino: PagTurismo usa `public.admins` ligado a `auth.users` (Supabase) y un modo local con bcrypt vía pgcrypto contra `auth.users`, cookie `turismo_sesion_local` firmada con HMAC (`C:\Repos\FinalTurismo\lib\auth\local.ts:10-14`), intentos con hash SHA-256 en `public.intentos_ingreso`, y tabla `public.auditoria`. **Los hashes scrypt de Agenda no son compatibles con bcrypt**: migrar cuentas implica pedir contraseña nueva (o verificación dual temporal).

---

## 6. Importadores

### 6.1 Eventos — `scripts/importar-eventos.mjs` + `src/lib/importacion/`
- **Fuente**: WordPress + plugin **EventON 5.0.2** en `https://agendaculturalsmt.com` (l.19), solo endpoints públicos, sin credenciales:
  - REST `/wp-json/wp/v2/ajde_events?_fields=id,slug,link,title,content,event_type,event_type_2,event_type_3` (paginado de a 100, l.40-47, 99).
  - Taxonomías `event_type`, `event_type_2`, `event_type_3` (l.100-102).
  - `POST /?evo-ajax=eventon_init_load` con el mismo payload que el calendario de `/que-hacer/` (constante `CALENDAR`, l.50) y el nonce extraído del HTML de `/que-hacer/` (l.52-65), rango 2015–2035.
- **Mapeo** (`src/lib/importacion/eventon.mjs`, funciones puras):
  - `occurrencesFrom` (l.100-115): usa `unix_start`/`unix_end`, corrige eventos guardados con zona UTC por error (comentario: 381 de 383 eventos coincidían), descarta el 23:59 de relleno si el cierre estaba oculto, deduplica.
  - `cardDetails` (l.76-91): lugar, dirección e imagen desde microdatos schema.org del HTML de las tarjetas.
  - Lugar: coincide por nombre normalizado o por `PLACE_ALIASES` (l.17-21: 3 alias); si no, queda como lugar "a mano" (`custom_place_name`, o "Lugar a confirmar").
  - Categorías: unión de las 3 taxonomías por slug; nombre capitalizado (l.70-73, 155-161).
  - `summaryFrom`: subtítulo EventON → meta description Yoast → primer párrafo, truncado a 220 (l.53-58).
  - `accessTypeFrom`: `free` si el texto matchea `/gratuit|entrada libre|acceso libre|sin costo|libre y gratuit/i`; si no, `check` (l.60-63). Nunca `paid`.
  - `htmlToParagraphs`: Gutenberg → párrafos texto plano (l.33-44). Se pierde el formato (enlaces, negritas).
  - `featured: false` siempre.
- **Escritura** (`src/lib/importacion/escribir.mjs:11-85`): crea categorías faltantes como `published`; identifica por `legacy_id`; si existe y no hay `--actualizar`, lo saltea; con `--actualizar` reemplaza datos, lugar, categorías y **borra y reinserta todas las ocurrencias** (se pierden estados de fecha editados en el panel), pero no toca `featured` ni `status`. Eventos nuevos entran como `published` con `published_at = now()`. Si el slug está tomado por otro evento, agrega `-<legacyId>`. Eventos sin fechas no se cargan. Si la foto falla, el evento se carga sin foto.
- **Modos**: prueba en seco por defecto (escribe `importacion-eventos.json`), `--escribir`, `--escribir --actualizar`, `--reporte <archivo>`. Pensado para correr de noche mientras se siga usando el WordPress viejo.
- **Volumen**: según el comentario del código, ~383 eventos en EventON. El fixture de tests `src/lib/importacion/__fixtures__/eventon-muestra.json` tiene una muestra recortada.

### 6.2 Lugares — `scripts/importar-espacios.mjs`
- Lee `db/contenido/espacios-culturales.json` y `espacios-al-aire-libre.json`, baja foto principal y galería a `MEDIA_DIR/lugares/<slug>/` (sin User-Agent propio, l.36), y hace `insert … on conflict (slug)`:
  - por defecto solo agrega faltantes y completa coordenadas si faltaban (l.74-77);
  - con `--actualizar` reemplaza todos los campos (l.71-73).
- Todos entran como `published`.

### 6.3 Contenido JSON — `db/contenido/*.json`
Estructura: `{ fuente, extraido, espacios: [...] }`.
- `espacios-culturales.json`: fuente `https://agendaculturalsmt.com/espacios-culturales/`, extraído 2026-11-18, **11 espacios**: museo-de-la-industria-azucarera-mia, casa-museo-de-la-ciudad, palacio-de-los-deportes (tipo `other`), casa-historica, museo-mercedes-sosa, teatro-rosita-avila, casa-de-la-cultura, casa-belgraniana, casa-del-bicentenario, centro-cultural-mercedes-sosa, centro-cultural-don-bosco. **3 sin coordenadas** (casa-museo-de-la-ciudad, casa-historica, museo-mercedes-sosa): sin mapa embebido; "Cómo llegar" busca por nombre y dirección.
- `espacios-al-aire-libre.json`: fuente `https://agendaculturalsmt.com/plazas-y-parques/`, extraído 2026-11-19, **10 espacios**: 5 parques (9 de Julio, Avellaneda, Guillermina, El Provincial, Quinto Centenario) y 5 plazas (Independencia, Urquiza, Belgrano, San Martín, Juan B. Alberdi). Todos con coordenadas; las plazas sin galería.
- Campos: `slug, name, type, summary, description (string[]), services (string[]), address, phone, opening_hours (string[]), social_links {instagram,facebook,entradas}, image (URL WP), gallery (URL[]), legacy_url, latitude, longitude` + `source_modified` en los culturales.
- Observación: MIA y Parque 9 de Julio comparten exactamente las mismas coordenadas (-26.826168, -65.190323) — el MIA está dentro del parque, pero conviene verificar.

---

## 7. Integración con Migue

- **Contenido** (`src/lib/migue.ts`): `paraMigue(eventos, lugares, ahora)` (l.123-147) devuelve
  ```json
  { "version": 1, "generado": "<ISO>", "general": "<texto>",
    "fichas": [ { "tipo": "evento|museo|teatro|…|página", "titulo": "…", "url": "/eventos/<slug>|/lugares/<slug>|/agenda…", "texto": "…" } ] }
  ```
  Eventos publicados (o reprogramados) no demo, fechas dentro de los próximos 120 días (máx. 6 fechas, descripción ≤ 700 caracteres, l.33-38), con líneas "Próximas fechas", "Dónde", "Categorías", "Entrada", "Entradas", "Inscripción", "Organiza", "Contacto", "Accesibilidad", "Descripción". Lugares publicados con dirección, horarios, teléfono, correo, web, redes, servicios. Más 3 `PAGINAS_GENERALES` (/agenda, /lugares, /espacios-culturales; l.27-31).
  El comentario dice explícitamente que es **el mismo formato que usa el sitio de turismo** — confirmado: `C:\Repos\FinalTurismo\lib\migue.ts` define el mismo `ContenidoMigue {version:1, generado, general, fichas}`.
- **Endpoint**: `GET /api/migue/contenido` (`src/app/api/migue/contenido/route.ts`), público, cacheable 5 min.
- **Widget** (`src/components/migue-chat.tsx`, montado en `src/app/layout.tsx:33`):
  - Backend: `NEXT_PUBLIC_MIGUE_URL` al compilar; si vacío ⇒ `https://migue.smt.gob.ar` en producción y apagado en desarrollo; `"no"` lo apaga (l.23-29).
  - Llamada: `POST ${MIGUE_URL}/api/agenda/chat` con `{"mensaje": string, "sessionId": uuid}` (l.128-132), petición cross-origin desde el navegador (requiere CORS en el backend de Migue).
  - Respuesta esperada: `{"respuesta": string, "acciones"?: [{"tipo":"navegar","ruta":"/…","etiqueta":"…"}]}` (l.31, 133-135).
  - `sessionId` anónimo y charla (últimos 30 mensajes) en `sessionStorage` (`migue-agenda-sesion`, `migue-agenda-charla`, l.34-35). Oculto en `/admin` (l.154). Avatar `/public/migue/migue-avatar.webp`. Estilos BEM `.migue__*` en `globals.css` desde l.702.
- En el destino, el widget equivalente es `components/MigueTurismo.tsx` + `AbrirMigue.tsx` y llama `POST /api/turismo/chat`. Fusionar implica un solo widget y un solo "canal" en el backend de Migue (o que el backend de turismo también consuma las fichas de la agenda).

---

## 8. Estilos

- **Tailwind 4.3.3** vía `@tailwindcss/postcss`; `src/app/globals.css:1` hace `@import "tailwindcss"` pero **no hay ninguna clase utilitaria de Tailwind en el JSX**, ni `@theme`, ni `@apply`. Tailwind aporta solo el preflight/reset. Es eliminable sin pérdida visual (verificar el reset).
- **CSS plano**: `src/app/globals.css` (755 líneas), clases semánticas en inglés (`.shell`, `.hero`, `.event-card`, `.button-primary`, `.page-hero`, `.agenda-layout`, `.calendar-*`, `.admin-*`, `.migue__*`). Contenedor `.shell { width: min(1180px, calc(100% - 2rem)) }`.
- **Tokens** (`globals.css:3-22`):
  | Token Agenda | Valor | Equivalente aproximado en `styles/tokens.css` del destino |
  |---|---|---|
  | `--blue-900` | #071f3d | `--c-azul-900` #0A2E6E / `--c-ink` #17293C |
  | `--blue-800` | #09345f | `--c-azul-800` #003E9C |
  | `--blue-700` | #07579a | `--c-azul-700` #0052CC |
  | `--blue-600` | #0274be | `--c-azul-600` #0066FF (o `--c-celeste-600` #0087DB, más parecido en tono) |
  | `--blue-500` | #1698df | `--c-celeste-400` #2EB1FF |
  | `--sky-300` | #83d2f4 | `--c-celeste-200` #A8DDFF |
  | `--yellow-500` | #f4c430 | `--c-amarillo-400` #F4DC00 |
  | `--yellow-600` | #d9a70d | `--c-amarillo-700` #6E6300 (texto) |
  | `--gray-50` / `--gray-100` | #f6f8fb / #eaf0f5 | `--c-fondo` #F4F7FB / `--c-fondo-alt` #EDF2F8 |
  | `--gray-300` | #bdc9d5 | `--c-borde` #DCE5EE |
  | `--gray-600` | #536577 | `--c-ink-muted` #5B6E80 |
  | `--text` | #102b45 | `--c-ink` #17293C |
  | `--radius-sm/md/lg` | .65 / 1 / 1.6 rem | `--r-md` .75 / `--r-lg` 1 / `--r-xl` 1.5 rem |
  | `--shadow-soft` | `0 16px 45px rgb(7 31 61 / .1)` | `--sombra-3` |
- Colores sueltos fuera de tokens: aviso demo (#fff8d9/#ead16b/#674e00), stickers de categoría (#ffe58a, #bfe9fb, #ffc9b8, #c9f0d9; l.130-133), hover de botón amarillo #ffda54.
- **Tipografía**: `next/font/google` Manrope (`--font-display`, titulares) + Source Sans 3 (`--font-body`) (`src/app/layout.tsx:8-9`). El destino usa Encode Sans autoalojada (`--f-sans`).
- **Look**: hero azul oscuro a pantalla completa con foto, degradé azul, "pétalos" con borde blanco y efecto parallax con el mouse (`src/components/hero.tsx:15-22`); tarjetas blancas con foto, insignias redondeadas (acceso, destacado amarillo); botones píldora (`border-radius: 999px`); kicker en mayúsculas con tracking .14em; titulares con letter-spacing negativo fuerte (-.055em); foco visible amarillo de 3 px. Header absoluto blanco sobre las portadas oscuras (por eso el panel tiene una banda oscura, `admin/layout.tsx:10`).
- **Sin modo oscuro** (el destino tiene claro/oscuro con `data-theme` y `prefers-color-scheme`). Respeta `prefers-reduced-motion`. Breakpoints 900/800/640/520 px.
- Iconos: `lucide-react` (el destino usa su propio componente `Icono`).

---

## 9. Páginas de contenido fijo

Todas tienen el texto **hardcodeado en el `page.tsx`** y fotos WebP versionadas en `public/images/contenido/<sección>/` (relevadas del sitio viejo el 19/11/2026, `docs/assets.md:11-16`). Son contenido real (no placeholder), pero no editable desde el panel y solo en español. Las tablas `pages`, `faqs`, `guides` no se usan.

| Ruta | Archivo (líneas) | Contenido |
|---|---|---|
| `/nuestra-ciudad` | `src/app/nuestra-ciudad/page.tsx` (78) | Historia y 6 datos (fundación 1565, 91 km², 590.342 hab. Censo 2022, clima, apodos). |
| `/patrimonio-historico` | `src/app/patrimonio-historico/page.tsx` (69) | 6 sitios (Casa Histórica, MIA, Museo Histórico Provincial, Ciencias Naturales, Parque 9 de Julio, Basílica La Merced) con enlace a `/lugares/<slug>` si existe o a Google Maps. |
| `/ferias-municipales` | `src/app/ferias-municipales/page.tsx` (55) | Texto + galería de 12 fotos + enlaces a la agenda filtrada (`category=ferias-emprendedores`, `ferias-gastronomicas`, `q=feria`). Las ferias concretas son eventos. |
| `/gastronomia` | `src/app/gastronomia/page.tsx` (68) | Platos y dulces típicos (6 tarjetas) + enlace a un Google Doc "Guía de bares y peñas". |
| `/guias` | `src/app/guias/page.tsx` (59) | 3 PDFs externos (2 en Google Drive, 1 en tucumanturismo.gob.ar) + mapa.smt.gob.ar. |
| `/oficinas` | `src/app/oficinas/page.tsx` (65) | Oficina de Turismo (Peatonal Congreso 121) y Municipalidad (9 de Julio 570): horarios, teléfono, mapa embebido, redes. |
| `/preguntas-frecuentes` | `src/app/preguntas-frecuentes/page.tsx` (106) | Grupos de preguntas (visitantes, etc.) en estructura de datos local con listas y enlaces. |
| `/planifica-tu-viaje` | `src/app/planifica-tu-viaje/page.tsx` (104) | Cómo llegar (avión/ómnibus/tren con coordenadas), alojamiento/agencias/autos (3 Google Docs), escapadas cercanas. |
| `/pintamos-la-ciudad-que-queremos` | `src/app/pintamos-la-ciudad-que-queremos/page.tsx` (56) | Proyecto de murales, estadísticas, galería de 21 fotos, enlace al mapa. |
| `/museo-escultorico-a-cielo-abierto` | `src/app/museo-escultorico-a-cielo-abierto/page.tsx` (105) | Recorrido guiado del Parque 9 de Julio: 13 obras, contenidos, 6 fotos, punto de partida con mapa, inscripción por linktr.ee del Bus Turístico. |

Dependencias externas frágiles: Google Docs/Drive públicos, linktr.ee, tucumanturismo.gob.ar. Bus Turístico no tiene página (redirige a `busturistico.smt.gob.ar`).

**Solapamiento fuerte con el destino**: PagTurismo ya tiene secciones `descubri`, `planifica`, `sabores`, `escapadas`, `recorridos`, `experiencias`, y colecciones `planifica`, `sabores`, `escapadas`, `recorridos`, `lugares` en `public.contenidos`. Estas páginas son mayormente contenido turístico, no de agenda.

---

## 10. Tests

Configuración: `vitest.config.mts` (jsdom, `src/**/*.test.{ts,tsx}`, alias `@`), `vitest.setup.ts` (jest-dom). Los tests de SQL usan **PGlite** con las migraciones y el seed reales (README:36).

| Archivo | Cubre |
|---|---|
| `src/app/media/[...ruta]/route.test.ts` | Servir archivos con tipo y caché; rechazo de path traversal, tipos desconocidos y faltantes. |
| `src/lib/auth/auth.test.ts` | Hash/verificación scrypt, sal distinta, hashes malformados; token: ida y vuelta, firma ajena/editada, vencimiento y renovación. |
| `src/lib/calendar.test.ts` | Validación de meses, cambio de año, último día (bisiestos), semanas lun–dom, etiquetas en español. |
| `src/lib/category-emoji.test.ts` | Emoji por slug, por palabra clave y fallback. |
| `src/lib/dates.test.ts` | Día de Tucumán vs UTC, `addDays`, límites del día, validación ISO, `weekendRange` (4 casos). |
| `src/lib/format.test.ts` | Año solo si no es el actual, fecha larga, formato calendario UTC, hora local, etiquetas de acceso. |
| `src/lib/forms.test.ts` | `slugify`, `lines`, `submittedValues`, `readOccurrences` (conversión, medianoche, ids, errores). |
| `src/lib/importacion/importacion.test.ts` | Mapeo EventON (ids/slugs/URLs, corrección UTC, 23:59 oculto, duplicados, alias de lugares, limpieza, categorías, destacado, Gutenberg, resumen) y escritura en PGlite (crear, idempotencia, `update`, foto fallida). |
| `src/lib/media-upload.test.ts` | Guardado con nombre nuevo por tipo real; rechazo de no-imágenes y >10 MB. |
| `src/lib/migue.test.ts` | Formato para Migue, exclusión de pasados/lejanos/borradores/demo, rótulos de estado, límite de fechas, lugares y páginas, "todo el día". |
| `src/services/admin/admin.test.ts` | Cuentas (búsqueda, corte de sesiones, bloqueo a 5 fallos), CRUD de categorías, lugares, eventos (transacción, actualización de fechas, rollback, listado, borrado). |
| `src/services/event-queries.test.ts` | SQL de eventos por venir y por slug (anidado, lugares no publicados, fechas vencidas, borradores). |
| `src/services/event-rows.test.ts` | `mapEventRow`: orden, cancelados, defaults, lugar a mano, resolución de imágenes. |
| `src/services/events.test.ts` | `countByDay`, `lastActivityDay`, `eventsOnDay`, `filterEvents` (búsqueda, filtros, rangos, paginación) y modo demo. |
| `src/services/place-queries.test.ts` | SQL de lugares (filtro por tipo, borradores, mapeo JSON/arrays/numéricos). |
| `src/services/places.test.ts` | Validez de los JSON de contenido y modo demo de lugares. |
| `src/services/sql-params.test.ts` | Ningún parámetro se castea directo a json/jsonb. |

Playwright (`playwright.config.ts`: baseURL `http://127.0.0.1:3000`, proyectos Desktop Chrome y Pixel 5, levanta `npm run dev`):
- `tests/e2e/public-flow.spec.ts`: (1) buscar "musical" desde la portada y abrir el evento demo `encuentro-musical-demo`; (2) los filtros `category=teatro&free=1` persisten en la URL. **Ambos dependen de los datos demo** (fallan con una DB real). No hay e2e del panel ni del calendario.

No se ejecutaron los tests (no hay `node_modules` instalados por restricción de la auditoría).

---

## 11. Variables de entorno, despliegue y launch.json

`.env.example`:
| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Origen público; se fija al compilar (metadataBase, sitemap, robots). Default `http://localhost:3000`. |
| `DATABASE_URL` | PostgreSQL, solo servidor. Vacía ⇒ modo demo. |
| `MEDIA_DIR` | Carpeta de medios; vacía ⇒ `./media`. Producción: `/srv/agenda/media`. |
| `SESION_SECRETO` | Firma de cookies del panel, ≥ 32 caracteres, obligatoria en producción. |
| `NEXT_PUBLIC_MIGUE_URL` | Backend de Migue; vacía ⇒ `https://migue.smt.gob.ar` en prod, sin chat en dev; `no` lo apaga. |
| `DATABASE_POOL_MAX` | No documentada en `.env.example` (`src/lib/db.ts:22`), default 10. |

Despliegue (README:103-111, `docs/architecture.md:17-21`): VPS de la Dirección, sin Docker; usuario de sistema propio, PostgreSQL 16 local, `.env` compartido entre versiones, `npm ci` → `npm run db:migrate` → `npm run build` → `next start` bajo pm2 detrás de nginx. **El build consulta la DB** (portada, lugares y sitemap se prerenderizan; revalidan cada 5 min/10 min/1 h), así que `DATABASE_URL` debe apuntar a una DB migrada al compilar. nginx: `client_max_body_size 32M` y servir `/media/` desde `MEDIA_DIR`. Ruta del equipo en VPS: `/srv/agenda/actual` (`scripts/equipo.mjs:12`).

`.claude/launch.json`: configuración `agenda-cultural-smt` → `npm run dev -- -p 3001`, puerto 3001 (para no chocar con el 3000 del portal).

`docs/architecture.md` describe capas y afirma que "la importación comienza siempre en modo dry-run… escritura solo contra una base de desarrollo autorizada". README:62 todavía dice "los permisos de edición se resolverán cuando se habilite la autenticación del panel" — **desactualizado** (la auth ya existe).

---

## 12. Solapamientos y conflictos con PagTurismo-IA

### 12.1 Rutas
| Agenda | PagTurismo | Conflicto |
|---|---|---|
| `/agenda` (lista + calendario) | `/[idioma]/agenda` y `/[idioma]/agenda/[slug]` | **Directo**: misma función. El destino usa `/agenda/[slug]` para la ficha; Agenda usa `/eventos/[slug]`. |
| `/eventos/[slug]` | (ficha en `/[idioma]/agenda/[slug]`) | Decidir una sola URL canónica + redirección. Agenda además redirige `/events/:slug` y `/www.agendaculturalsmt.com/events/:slug`. |
| `/lugares`, `/lugares/[slug]` | `/[idioma]/lugares/[slug]` | **Directo**. Slugs posiblemente distintos para el mismo lugar (p. ej. `casa-historica`). |
| `/que-hacer` (redirige a `/agenda`) | `/[idioma]/que-hacer` (catálogo) | Conflicto de redirección: en Agenda `/que-hacer` → `/agenda`; en el destino es una sección propia. |
| `/espacios-culturales`, `/espacios-al-aire-libre` | (lugares por clase en el destino) | Funcionalmente equivalente a filtros de lugares. |
| `/planifica-tu-viaje`, `/gastronomia`, `/guias`, `/nuestra-ciudad`… | `/[idioma]/planifica`, `/sabores`, `/descubri`, `/escapadas`, `/recorridos` | Solapamiento temático. |
| `/admin/*` | `/admin/*` (`(panel)`, `ingresar`) | **Directo**: dos paneles, dos logins (`/admin/login` vs `/admin/ingresar`). |
| `/api/migue/contenido` | `/api/migue/contenido` | **Directo**: misma ruta, mismo formato. Hay que fusionar fichas. |
| `/media/[...ruta]` | `app/subidas` (+ almacenamiento propio en `lib/almacenamiento.ts`) | Dos estrategias de archivos. |
| `/sitemap.xml`, `/robots.txt` | propios | Fusionar. |
| Sin prefijo de idioma, solo `es` | `/[idioma]/` es/en/pt | Todo lo de Agenda necesita i18n o quedar solo en `es`. |

### 12.2 Entidades
| Agenda (relacional) | PagTurismo (`contenidos.datos` jsonb, `lib/tipos.ts`) | Diferencias clave |
|---|---|---|
| `events` + `event_occurrences` + `event_categories` | `Evento` con `ocurrencias: Ocurrencia[]` embebidas | Agenda: instantes `timestamptz`; destino: hora local `AAAA-MM-DDTHH:mm` o `AAAA-MM-DD` (todo el día). Estados: scheduled/suspended/rescheduled/cancelled ↔ confirmado/suspendido/reprogramado/cancelado (mapeo 1:1). Destino tiene `clase` (efeméride, festividad, espectáculo, feria…), `recurrente {dia, mes}`, `sede`, `fueraDeLaCiudad`, `costo: Costo`, `fuentes`, `validacion`; Agenda tiene `access_type` + `price`, `ticket_url`/`registration_url`, `organizer`, `accessibility`, `featured`, `legacy_id/url`, lugar "a mano". |
| `places` | `Lugar` (`clase` texto libre, `coordenadas {lat,lng}`, `horario: DatoConfirmable`, `costo`, `contacto {telefono,email,web}`, `imperdible`, `zona`, `porQueIr`, `duracion`) | Agenda: `type` enum, `opening_hours {lineas[]}`, `services[]`, `social_links`, `gallery_paths[]`. Destino no tiene galería ni redes en el tipo base. |
| `categories` (tabla con slug, color) | `categorias: string[]` + `etiquetas: string[]` en cada contenido; `Categoria` es un tipo de portada | Las categorías importadas de EventON (decenas; `category-emoji.ts` lista 50 slugs, muy granulares: "bijouterie", "filatelia", "taekwondo"…) no encajan con la taxonomía turística del destino. |
| `profiles` + `login_attempts` | `admins` (→ `auth.users`) + `intentos_ingreso` + `auditoria` | Auth incompatible (scrypt vs bcrypt/Supabase). |
| `tours`/`tour_stops` (sin uso) | `Recorrido`, `Experiencia` con `salidas` | El destino ya cubre recorridos; las tablas de Agenda son vestigiales. |
| `faqs`, `guides`, `pages` (sin uso) | `Guia`, `planifica`, `configuracion` | Ídem. |

### 12.3 Funcionalidades duplicadas
- Agenda/calendario de eventos, ficha de evento con `.ics`, ficha de lugar con mapa.
- Panel de administración con login, roles y límite de intentos.
- Widget de Migue y endpoint de contenido.
- Contenido turístico estático (gastronomía, planificá, guías, oficinas, FAQ).
- Header/footer/hero propios y design system propio.

---

## 13. Riesgos y recomendación por funcionalidad

### 13.1 Recomendaciones
| Funcionalidad | Recomendación | Motivo / cómo |
|---|---|---|
| **Datos de eventos (contenido)** | **Fusionar** | Migrar los eventos (importados de EventON + cargados en el panel) a la colección `eventos` del destino, convirtiendo `event_occurrences` a `ocurrencias[]` en hora local, `access_type/price` a `costo`, `place_id` a `lugar` (slug del destino). Conservar `legacy_id`/`legacy_url` en `fuentes` o un campo extra para redirecciones. Alternativa si se quiere volumen alto: mantener las tablas relacionales de eventos en la DB del destino y adaptar el lector — decisión de arquitectura previa. |
| **Agenda pública (lista + filtros + calendario mensual + franja semanal)** | **Adaptar** | Es la parte más valiosa y probada (`src/services/events.ts`, `src/lib/calendar.ts`, `src/lib/dates.ts`, `src/components/agenda/*`). Las funciones `countByDay`/`eventsOnDay`/`filterEvents` son puras y portables sobre el tipo `Evento` del destino. Reescribir el marcado con los tokens/clases del destino e i18n. Ubicarla en `/[idioma]/agenda`. |
| **Ficha de evento** | **Fusionar** con `/[idioma]/agenda/[slug]` del destino | Tomar de Agenda: compartir WhatsApp/copiar, Google Calendar, JSON-LD. Corregir `eventStatus` según estado. Redirigir `/eventos/:slug`, `/events/:slug`, `/www.agendaculturalsmt.com/events/:slug`. |
| **ICS** | **Reemplazar** por el del destino (o fusionar) | El de Agenda exporta solo la primera fecha y sin plegado; el destino ya genera `.ics` por ocurrencia. |
| **Lugares (datos)** | **Fusionar** | Los 21 espacios de `db/contenido/*.json` son contenido real con coordenadas, horarios y galerías: mapear a `Lugar` del destino (deduplicar con los que ya existan, p. ej. Casa Histórica, Parque 9 de Julio). Agregar galería/redes al tipo del destino si se quieren conservar. |
| **Páginas de lugares** (`/lugares`, `/espacios-culturales`, `/espacios-al-aire-libre`) | **Reemplazar** por las del destino | Mantener redirecciones 308 de los slugs viejos (`/casa-historica` → nueva URL). |
| **Panel admin de Agenda** | **Retirar** (absorber en el admin del destino) | Agregar al admin del destino lo que falte para eventos: editor de múltiples fechas con estado por fecha (portar la lógica de `src/lib/occurrences-form.ts` y `occurrences-editor.tsx`, sumando "todo el día"), selector de lugar o lugar a mano, categorías. |
| **Auth del panel (scrypt + `agenda_sesion`)** | **Retirar** | Usar `lib/auth` del destino. Las cuentas de `profiles` deben recrearse (hashes incompatibles). `scripts/equipo.mjs` se retira. |
| **Subida de medios** | **Reemplazar** por `lib/almacenamiento.ts` del destino | Migrar los archivos de `MEDIA_DIR` (`/srv/agenda/media`) y reescribir rutas `/media/...` en los datos migrados. Ojo: archivos huérfanos acumulados. |
| **Importador EventON** (`scripts/importar-eventos.mjs`, `src/lib/importacion/*`) | **Adaptar** (temporal) | Útil mientras el WordPress viejo siga vivo; reescribir solo `escribir.mjs` para que escriba en `contenidos` del destino. `eventon.mjs` (mapeo puro y testeado) se reutiliza tal cual. Retirar cuando se apague agendaculturalsmt.com. |
| **Importador de espacios** | **Adaptar una vez y retirar** | Correrlo una sola vez contra el destino (o convertir el JSON a seed del destino). |
| **Migue** (`lib/migue.ts`, widget) | **Fusionar** contenido, **retirar** widget | El formato es idéntico: sumar las fichas de eventos de la agenda a `lib/migue.ts` del destino (reutilizar `fichaEvento`/`formatearFecha`). Un solo widget (`MigueTurismo`) y un solo endpoint de chat; coordinar con el backend de Migue el canal `/api/agenda/chat` vs `/api/turismo/chat`. |
| **Páginas de contenido fijo** | **Fusionar contenido / retirar páginas** | Pasar textos y fotos útiles a las colecciones del destino (`planifica`, `sabores`, `escapadas`, `recorridos`, `destacados`). Murales y museo a cielo abierto encajan como `Recorrido`/`Experiencia`. FAQ y oficinas: evaluar si el destino ya las cubre. |
| **Categorías EventON** | **Adaptar** | Mapear las categorías granulares de EventON (decenas) a `categorias`/`etiquetas` del destino; conservar `category-emoji.ts` solo si el diseño del destino lo admite. |
| **Design system de Agenda** (`globals.css`, Tailwind, Manrope/Source Sans) | **Reemplazar** | Usar `styles/tokens.css` del destino (Encode Sans, modo oscuro). Quitar Tailwind, `leaflet`, `date-fns`, `@types/leaflet`. |
| **Redirecciones del sitio viejo** (`next.config.ts:30-50`) | **Reutilizar** | Trasladarlas al `next.config.ts` del destino ajustando destinos con prefijo de idioma. Resolver el choque `/que-hacer`. |
| **Tablas sin uso** (`event_recurrence_rules`, `tours`, `tour_stops`, `pages`, `faqs`, `guides`, `site_settings`, `legacy_redirects`, `media_assets`) | **Retirar** | No tienen código ni datos; el destino ya modela recorridos, guías y configuración. |
| **Tests** | **Reutilizar** los de lógica pura | `dates`, `calendar`, `events` (filtros/calendario), `importacion`, `migue`. Los de SQL/PGlite y el e2e dependen del esquema y datos demo de Agenda: reescribir. |

### 13.2 Riesgos detectados
1. **Modelo relacional vs. jsonb**: la conversión de `timestamptz` a hora local de texto y de FK a slugs requiere un script de migración probado; posibles colisiones de slug entre eventos/lugares de ambos sistemas.
2. **Estados de evento no visibles**: `suspended`/`rescheduled`/`finished` hacen desaparecer el evento del sitio en lugar de rotularlo; estados de fecha suspendida/reprogramada no se muestran (solo Migue). Revisar la semántica antes de mapear a `EstadoOcurrencia` del destino.
3. **`all_day` inutilizable** desde el panel y el importador.
4. **Recurrencia no implementada** (tabla vacía); cargas repetitivas = una fila por fecha.
5. **`--actualizar` del importador borra y reinserta las fechas** (pierde estados editados en el panel).
6. **Contraseña mínima de 6 caracteres** y cuentas solo por consola; hashes no portables al destino.
7. **Archivos huérfanos** en `MEDIA_DIR` al reemplazar imágenes; sin registro en `media_assets`.
8. **Build acoplado a la DB** (prerender de portada, lugares y sitemap): el CI necesita DB accesible.
9. **Filtrado en memoria** de todos los eventos por venir en cada request de `/agenda` (aceptable al volumen actual, ~cientos).
10. **Dependencias externas** frágiles en páginas fijas (Google Docs/Drive, linktr.ee) y en el importador (nonce de EventON en el HTML; si cambia el tema o el plugin, se rompe).
11. **E2E dependiente de datos demo**; sitemap sin DB publica slugs demo.
12. **Dependencias muertas**: `leaflet`, `@types/leaflet`, `date-fns`; Tailwind sin uso real.
13. **Versión de React** 19.3.0 vs 19.2.8 en el destino; ambos con Next 16.3.5 y `postgres` 3.4.9 (alineados).
14. **README desactualizado** (l.62 sobre autenticación "a habilitar").
15. **Migue**: dos canales distintos en el backend (`/api/agenda/chat` y `/api/turismo/chat`); unificar requiere coordinación con quien mantiene `migue.smt.gob.ar` (incluido CORS para el dominio final).
16. **Sin i18n**: todo el texto (incluidas etiquetas, formatos `es-AR` y contenido fijo) está en español; el destino exige es/en/pt.

### 13.3 Nada encontrado de
- Comentarios `TODO`/`FIXME`/`XXX` en `src/`, `scripts/`, `db/`, `docs/` (grep sin resultados).
- Mocks fuera de `src/data/demo.ts`, `db/seed.sql` y el fixture de EventON.
- Secretos commiteados (`.env*` ignorado salvo `.env.example`, que está vacío).
