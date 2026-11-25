# Arquitectura del Portal Unificado de Turismo y Cultura SMT

Decisiones tomadas a partir de [AUDITORIA_REPOSITORIOS.md](AUDITORIA_REPOSITORIOS.md). Cada decisión
tiene su motivo; si algo cambia, se actualiza acá y en [ESTADO_INTEGRACION.md](ESTADO_INTEGRACION.md).

---

## 1. Forma general

```
                         nginx (VPS municipal, 443)
                                   │
          ┌────────────────────────┴───────────────────────────┐
          │                                                     │
  Portal unificado (Next.js 16, PM2, :3007)          Backend de Migue (Express, PM2, :3000)
  PagTurismo-IA + módulos cultura y buses            + Telegram (PM2)   ← sin cambios de contrato
          │            │               │                        │
          │            │               └──── lee ──────┐        │
          ▼            ▼                               ▼        ▼
   Base «portalturismo»       Base «turismo» (buses)  ◄── lee/escribe interacciones
   contenidos, admins,        circuitos, salidas, reservas,     y memoria del chat
   auditoría, cuentas         educativo, books, bicitour, faqs
          │                            │
   CARPETA_SUBIDAS (fotos)      ARCHIVOS_DIR (books, adjuntos)
```

**Decisión A1 — Una sola aplicación Next.js.** PagTurismo-IA es la contenedora. Agenda Cultural y el sitio
de BotTurismo se integran como módulos de esa aplicación y sus despliegues propios se retiran (quedan
redirecciones). Motivo: comparten Next 16, React 19 y driver; tres procesos Next serían tres paneles,
tres sesiones y tres identidades visuales.

**Decisión A2 — El backend de Migue sigue siendo un servicio aparte.** Tiene procesos que no son web
(webhook de WhatsApp, long polling de Telegram), dependencias propias (LangChain, grammY) y un ciclo de
despliegue independiente. El portal no cambia su contrato: el bot sigue leyendo `faqs`,
`tourist_circuits`, `tourist_departures`, `tourist_bookings` de la base `turismo` con los mismos nombres
de tablas y columnas.

**Decisión A3 — Sin microservicios nuevos.** Los módulos son carpetas de la misma aplicación:

| Carpeta | Contenido |
|---|---|
| `app/[idioma]/…` | Sitio público en es/en/pt (incluye agenda, lugares, bus turístico, bus educativo, galería) |
| `app/admin/(panel)/…` | Panel único |
| `app/api/…` | API pública y del panel (las rutas del bus conservan su contrato) |
| `lib/…` | Núcleo de PagTurismo (contenido, i18n, auth, auditoría) |
| `lib/cultura/…` | Agenda cultural: filtros, calendario, ICS, importadores |
| `lib/buses/…` | Bus turístico, educativo, books, BiciTour (portado de BotTurismo) |
| `lib/permisos.ts` | Roles y permisos por módulo |
| `components/cultura/`, `components/buses/` | Piezas públicas de cada módulo con el sistema de diseño |

## 2. Datos: una fuente de verdad por entidad

**Decisión D1 — Turismo y cultura comparten `public.contenidos`.** Los eventos y espacios de la Agenda
Cultural se importan a las colecciones `eventos` y `lugares` del portal, que se amplían (no se reemplazan):

- `Evento` suma: `rubros` (categorías culturales), `galeria`, `lugarManual` (nombre, dirección, coordenadas
  de un lugar sin ficha), `entradas` (URL), `inscripcionUrl`, `capacidad`, `accesibilidad`, `requisitos`,
  `destacado`, `contacto`, `legado` (`{ origen, id, url }` para no duplicar al importar).
- `Lugar` suma: `tipoEspacio` (cultural / aire libre / otro), `galeria`, `servicios`, `redes`, `legado`.
- Nueva configuración `configuracion/categorias-agenda` con las categorías culturales (id, título, color).

Motivo: una sola ficha pública por entidad, un solo panel, traducciones, auditoría, RLS y Migue ya
resueltos. La base relacional de Agenda queda como **origen de importación** (solo lectura) y se retira.
Las nueve tablas sin uso de Agenda no se migran.

**Decisión D2 — Las operaciones del bus siguen en la base `turismo`.** El módulo de buses se conecta con
`BUSES_DATABASE_URL` a la base que hoy usan el sitio del bus y el bot. No se copian reservas.

- Una sola autoridad de escritura de reservas: el portal (vía `create_tourist_booking`, sin cambiar su
  firma). El sitio viejo del bus deja de escribir en el mismo corte (ver PLAN_MIGRACION).
- El bot sigue leyendo las mismas tablas.
- Las tablas se acceden sin prefijo de esquema; la conexión fija `search_path`. Así una consolidación
  futura en la base del portal (esquema `buses`) es cambiar la URL, no el código (PLAN_MIGRACION §7).
- En desarrollo local, el módulo usa una base PGlite propia (`.local/buses`) expuesta por socket a
  postgres.js, con el esquema consolidado de `lib/buses/esquema.sql`.

**Decisión D3 — Circuito operativo vs. ficha narrativa.** `tourist_circuits` es la fuente de verdad del
circuito que se reserva (lo usan las salidas y el bot). Las fichas `recorridos/experiencias` de PagTurismo
pueden enlazar un circuito con el campo `circuitoBus` (slug): la ficha muestra salidas y cupos reales del
módulo de buses en vez de salidas cargadas a mano. Nunca hay dos fichas públicas para el mismo circuito:
la página `/bus-turistico` lista circuitos y enlaza a la ficha narrativa cuando existe.

**Decisión D4 — Las FAQ de Migue quedan en la base `turismo`** porque las lee el bot. El panel las
administra en la sección Migue.

## 3. Rutas públicas canónicas

Español sin prefijo; `en` y `pt` con la primera sección traducida (`lib/i18n/config.ts`).

| Español | Inglés | Portugués | Origen |
|---|---|---|---|
| `/` | `/en` | `/pt` | PagTurismo (enriquecida) |
| `/descubri`, `/que-hacer`, `/recorridos`, `/planifica`, `/sabores`, `/escapadas` | igual que hoy | igual que hoy | PagTurismo |
| `/agenda` (lista + calendario + filtros) | `/en/events` | `/pt/agenda` | PagTurismo + Agenda |
| `/agenda/[slug]` | `/en/events/[slug]` | `/pt/agenda/[slug]` | ficha única de evento |
| `/lugares` (nuevo listado, filtro por tipo) | `/en/places` | `/pt/lugares` | Agenda → PagTurismo |
| `/lugares/[slug]` | `/en/places/[slug]` | `/pt/lugares/[slug]` | ficha única de lugar |
| `/bus-turistico` | `/en/tourist-bus` | `/pt/onibus-turistico` | BotTurismo `/turistico` |
| `/bus-educativo` | `/en/school-bus` | `/pt/onibus-escolar` | BotTurismo `/educativo` |
| `/reserva/[token]` | `/en/booking/[token]` | `/pt/reserva/[token]` | BotTurismo (mismo token) |
| `/galeria`, `/galeria/[token]` | `/en/gallery…` | `/pt/galeria…` | BotTurismo `/galeria`, `/fotos/[token]` |
| `/bicitour/[codigo]` | — (fuera del i18n) | — | BotTurismo (participantes en vivo) |

### Redirecciones (308) para no romper enlaces

| Anterior | Nuevo |
|---|---|
| `/eventos/:slug` (Agenda) | `/agenda/:slug` |
| `/events/:slug`, `/www.agendaculturalsmt.com/events/:slug` | `/agenda/:slug` |
| `/espacios-culturales` | `/lugares?tipo=cultural` |
| `/espacios-al-aire-libre`, `/plazas-y-parques`, `/plazas`, `/parques` | `/lugares?tipo=aire-libre` |
| `/turistico` (bus) | `/bus-turistico` |
| `/educativo` (bus) | `/bus-educativo` |
| `/fotos/<token de 48 hex>` (QR impresos) | `/galeria/<token>` |
| `/login`, `/update-password` (bus) | `/admin/ingresar` |
| Dominio `busturistico.smt.gob.ar/*` | nginx → `turismo.smt.gob.ar` con la tabla de arriba |

`/admin` queda fuera del i18n. `/fotos/*.webp` sigue siendo la carpeta de fotos estáticas del portal: el
proxy solo redirige rutas `/fotos/<48 caracteres hex>`.

## 4. Panel único `/admin`

| Grupo | Secciones | Módulo de permiso |
|---|---|---|
| Tablero | indicadores de contenido, agenda, reservas, salidas, solicitudes, Migue, alertas | (cada tarjeta respeta el permiso de su módulo) |
| Turismo | Lugares, Experiencias, Recorridos, Planificá, Destacados, Sabores, Escapadas, Temas y etiquetas, Configuración del sitio | `turismo` (Lugares también `cultura`) |
| Cultura | Agenda (eventos y fechas), Categorías de la agenda | `cultura` |
| Buses | Salidas y reservas, Circuitos, Bus Educativo (solicitudes, circuitos, configuración), Books de fotos, BiciTour | `buses` |
| Migue | Preguntas frecuentes, Interacciones, Estado del servicio | `migue` |
| Sistema | Usuarios y permisos, Auditoría | `sistema` (superadministrador) |

## 5. Roles y permisos

`public.admins` suma `rol` y `modulos`:

| Rol | Puede |
|---|---|
| `superadmin` | Todo, en todos los módulos, más usuarios y configuración. |
| `admin` | En sus módulos: ver, editar, publicar, borrar, exportar y configurar. |
| `editor` | En sus módulos: ver y editar borradores. No publica, no borra, no cancela reservas. |
| `consulta` | En sus módulos: solo ver. |

«Administrador de Turismo» = `admin` con módulos `{turismo}`; «Administrador Cultural» = `admin` con
`{cultura}`; «Administrador de Buses» = `admin` con `{buses}`.

Dónde se aplica:
1. **Servidor**: `requerirPermiso(modulo, accion)` en cada página, Server Action y Route Handler del panel
   (`lib/permisos.ts`). El menú solo muestra lo permitido, pero no es la protección.
2. **Base del portal**: `public.puede(modulo, accion)` en las políticas RLS de `contenidos` (alta/cambio
   exigen `editar` del módulo de la colección; publicar exige `publicar`, verificado por disparador; baja
   exige `borrar`). Cuentas y permisos solo los cambia un superadmin (política sobre `admins`).
3. **Base de buses**: el portal se conecta con un rol propio (`portal_buses`) sin `DELETE` sobre
   `tourist_bookings` ni `TRUNCATE`; cada acción del panel queda en `public.auditoria` del portal con el
   actor real.

Las cuentas de BotTurismo (bcrypt) y de Agenda (scrypt) se importan a `auth.users` con
`npm run cuentas -- importar` (prueba en seco por defecto). Las scrypt se validan en Node y se re-hashean a
bcrypt al primer ingreso correcto.

## 6. Sistema de diseño

**Fuente predominante: PagTurismo** (`styles/tokens.css`): azul `#0066FF`, celeste `#2EB1FF`, amarillo
`#F4DC00`, Encode Sans autoalojada, escala tipográfica, espaciados, radios, sombras de dos capas, anillo de
foco de dos tonos, tema claro/oscuro por tokens. No se incorpora Tailwind, Inter, Manrope ni la paleta
`#126ff5` del bus.

La skill `estetica-cimba` (estética municipal de CIMBA Ciudadano) comparte la misma paleta oficial. De ella
se toman solo piezas compatibles que PagTurismo no tenía, expresadas como tokens del portal:
- **Semáforo de estados** (pastilla con fondo pastel y punto): programada, completa/agotada, suspendida,
  cancelada, pendiente, aprobada, rechazada. `--c-estado-*` en `styles/tokens.css`, con variantes oscuras.
- **Tonos pastel por módulo** (decorativos): turismo azul, cultura amarillo/violeta, buses celeste/verde.
- **Estados vacíos honestos** y esqueletos de carga en lugar de spinners.
No se toman la tipografía Plus Jakarta Sans ni el wordmark/glifo de CIMBA.

Reglas:
- Los módulos nuevos usan las clases del portal (`.contenedor`, `.boton`, `.marca`, `.aviso`, `.item`,
  `.pagina-cabecera`, `.adm-*`) y, cuando hace falta algo propio, **CSS Modules que solo consumen tokens**.
- Acentos por módulo vía `data-modulo="cultura|buses"` que cambia `--c-acento`; nada de una segunda paleta.
- Todo respeta `prefers-reduced-motion` y el tema oscuro.

## 7. Migue

- **Un solo widget**: `components/MigueTurismo.tsx` (el de PagTurismo), en todas las páginas públicas. Se
  retiran el de Agenda y el del bus. Contrato sin cambios: `POST {NEXT_PUBLIC_MIGUE_URL}/api/turismo/chat`.
- **Contenido**: `GET /api/migue/contenido` (mismo formato `version: 1`) suma ahora los eventos importados
  de la agenda, los espacios culturales, los circuitos del bus y las **próximas salidas con cupo real**
  leídas de la base de buses en el momento. Nunca incluye borradores, reservas, datos personales ni
  información del panel.
- El backend del bot (WhatsApp/Telegram) sigue leyendo su base; PLAN_MIGRACION §6 deja el cambio
  opcional para que también lea `/api/migue/contenido` del portal (una sola fuente de texto).

## 8. Archivos

| Tipo | Carpeta | Cómo se sirve |
|---|---|---|
| Fotos de contenido (lugares, eventos, temas) | `CARPETA_SUBIDAS` | `/subidas/…` (ya existente) |
| Fotos importadas de Agenda | se copian a `CARPETA_SUBIDAS/cultura/…` | `/subidas/…` |
| Books de fotos, adjuntos del Bus Educativo | `ARCHIVOS_DIR` (la misma carpeta de hoy) | `/api/archivos/…` firmado y `/api/photo-books/…` |

## 9. Despliegue

Sigue el procedimiento de `deploy/` (versiones, `actual`, `pm2 reload`, migraciones antes de cambiar).
Variables nuevas en `compartido/.env` del portal: `BUSES_DATABASE_URL`, `ARCHIVOS_DIR`,
`ARCHIVOS_SECRETO`, `SMTP_*`, `CRON_SECRET`, opcionales `WHATSAPP_*`, `OPENROUTER_*`.
Detalle completo en [`deploy/README.md`](../deploy/README.md) y [PLAN_MIGRACION.md](PLAN_MIGRACION.md).
