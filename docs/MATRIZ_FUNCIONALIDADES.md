# Matriz de funcionalidades

Estado actual = lo que se verificó leyendo el código, no lo que sugiere el nombre de la ruta.
Prioridad: P0 (núcleo, primero), P1 (necesario para el corte), P2 (después del corte), P3 (opcional).
Estrategia: **Reutilizar** (tal cual), **Adaptar** (misma lógica, otra forma), **Fusionar** (dos en uno),
**Reemplazar** (por lo del portal), **Retirar** (no se lleva; queda en el repo de origen).

Abreviaturas: PT = PagTurismo-IA, AC = Agenda Cultural, BT = BotTurismo-BackyFront.

## Portal y turismo

| Funcionalidad | Origen | Archivos | Estado actual | Dependencias | Destino | Estrategia | Riesgo | Prio |
|---|---|---|---|---|---|---|---|---|
| Portada | PT | `app/[idioma]/page.tsx` | Real, con contenido de la base | contenidos, clima | `/` + bloques de agenda y bus | Reutilizar + enriquecer | Bajo | P1 |
| Descubrí, Qué hacer, catálogo con filtros | PT | `app/[idioma]/descubri`, `que-hacer`, `components/Catalogo.tsx` | Real | contenidos | igual | Reutilizar | Bajo | P0 |
| Fichas de lugar, experiencia, recorrido | PT | `app/[idioma]/lugares/[slug]` y otras, `components/Ficha.tsx` | Real | contenidos | igual (lugar con galería y eventos) | Reutilizar + ampliar | Bajo | P0 |
| Planificá, Sabores, Escapadas | PT | `app/[idioma]/planifica`, `sabores`, `escapadas` | Real | contenidos | igual | Reutilizar | Bajo | P0 |
| i18n es/en/pt | PT | `proxy.ts`, `lib/i18n/*` | Real, 81 tests | — | se extiende a los módulos nuevos | Reutilizar + extender | Medio (textos nuevos) | P0 |
| Tema claro/oscuro, tokens | PT | `styles/tokens.css`, `components/Tema.tsx` | Real | — | sistema de diseño único | Reutilizar + ampliar (semáforo) | Bajo | P0 |
| Clima | PT | `lib/clima.ts`, `components/ClimaActual.tsx` | Real | API pública | igual | Reutilizar | Bajo | P3 |
| Sitemap, robots, hreflang | PT | `app/sitemap.ts`, `app/robots.ts`, `lib/i18n/servidor.ts` | Real | contenidos | suma lugares, bus, galería | Reutilizar + extender | Bajo | P1 |
| Fotos subidas desde el panel | PT | `lib/almacenamiento.ts`, `app/subidas/[...ruta]` | Real (sharp, sin EXIF) | sharp | igual | Reutilizar | Bajo | P0 |

## Cultura

| Funcionalidad | Origen | Archivos | Estado actual | Dependencias | Destino | Estrategia | Riesgo | Prio |
|---|---|---|---|---|---|---|---|---|
| Agenda: lista con búsqueda, categoría, lugar, gratis, fechas, hoy/finde | AC (+PT básico) | AC `src/services/events.ts`, `src/components/agenda/filters.tsx`; PT `components/AgendaFiltrable.tsx` | AC real con base; PT filtro por fecha | contenidos | `/agenda` | Fusionar (lógica AC portada sobre datos PT) | Medio | P0 |
| Calendario mensual y franja semanal | AC | `src/lib/calendar.ts`, `month-calendar.tsx`, `week-strip.tsx` | Real | — | `/agenda?vista=calendario` | Adaptar | Bajo | P1 |
| Ficha de evento | AC + PT | AC `src/app/eventos/[slug]`; PT `app/[idioma]/agenda/[slug]` | Ambas reales | contenidos | `/agenda/[slug]` | Fusionar (ficha PT + datos AC) | Bajo | P0 |
| Exportar al calendario (.ics) | AC + PT | AC `api/events/[slug]/ics` (solo 1ª fecha); PT data URI | Real, limitado | — | `/api/agenda/[slug]/ics` con todas las fechas | Reemplazar por versión completa | Bajo | P1 |
| Compartir (WhatsApp, copiar) | AC | `src/components/events/share-actions.tsx` | Real | — | ficha de evento | Adaptar | Bajo | P2 |
| Eventos recurrentes | PT (`recurrente`) / AC (tabla sin uso) | PT `lib/fechas.ts` | PT real (calendario anual); AC no implementado | — | PT | Reutilizar PT; AC retirar | Bajo | P1 |
| Eventos cancelados / suspendidos / reprogramados | PT (por fecha) / AC (por fecha y por evento) | PT `Ocurrencia.estado`; AC `occurrence_status` | PT los rotula; AC los oculta | — | PT: se rotulan, no se borran | Reutilizar PT | Bajo | P0 |
| Eventos destacados | AC | `events.featured` | Solo insignia | — | `Evento.destacado` + bloque en portada | Adaptar | Bajo | P2 |
| Categorías culturales | AC | `categories`, `category-emoji.ts` | Real | — | `configuracion/categorias-agenda` | Adaptar | Bajo | P0 |
| Espacios culturales y al aire libre | AC | `places`, `db/contenido/*.json` (21) | Real | — | `contenidos/lugares` + `/lugares` | Fusionar | Medio (duplicados por nombre) | P0 |
| Mapa embebido | AC | `components/content/map-embed.tsx` | Real (iframe Google) | Google Maps | ficha de lugar y evento (OpenStreetMap embebido, sin claves) | Adaptar | Bajo | P2 |
| Galería de fotos de lugar | AC | `photo-gallery.tsx` | Real | — | ficha de lugar | Adaptar | Bajo | P2 |
| Panel de eventos, lugares, categorías | AC | `src/app/admin/*` | Real | auth AC | panel PT (esquemas ampliados) | Reemplazar | Bajo | P0 |
| Importador EventON/WordPress | AC | `scripts/importar-eventos.mjs`, `src/lib/importacion/*` | Real, prueba en seco | red | `scripts/importar-agenda.ts` → contenidos | Adaptar | Medio | P1 |
| Importar desde la base de Agenda | — | — | — | `AGENDA_DATABASE_URL` | `scripts/importar-agenda.ts --desde-base` | Nuevo | Medio | P1 |
| Importador de espacios | AC | `scripts/importar-espacios.mjs` | Real | red | mismo script, a lugares | Adaptar | Medio | P1 |
| Páginas fijas (nuestra ciudad, patrimonio, ferias, gastronomía, guías, oficinas, FAQ, murales, museo a cielo abierto) | AC | `src/app/<ruta>/page.tsx` | Contenido real hardcodeado | fotos locales | fichas de Planificá / Qué hacer | Fusionar como contenido editable | Medio (volumen) | P2 |
| Tablas sin uso (recurrencias, tours, pages, faqs, guides, settings, redirects, media) | AC | migración inicial | Sin código | — | — | Retirar | Ninguno | — |
| Datos de demostración | AC | `src/data/demo.ts`, `demo-notice.tsx` | Demo | — | — | Retirar | Ninguno | — |

## Buses y circuitos

| Funcionalidad | Origen | Archivos | Estado actual | Dependencias | Destino | Estrategia | Riesgo | Prio |
|---|---|---|---|---|---|---|---|---|
| Reserva atómica de cupos | BT | `supabase_bike_availability_migration.sql` (`create_tourist_booking`) | Real, en producción | base `turismo` | misma función, misma base | **Reutilizar sin cambios** | Alto si se toca | P0 |
| API pública del bus (salidas, circuitos, reservas, baja por token, procedencia) | BT | `src/app/api/tourist-bus/**` | Real | base, SMTP | `app/api/tourist-bus/**` (mismo contrato) | Reutilizar + endurecer (límite de pedidos, antiduplicado) | Medio | P0 |
| Página pública del bus | BT | `src/app/turistico`, `TouristExperience.tsx` (988 l.) | Real | API | `/bus-turistico` con diseño del portal | Adaptar (reescribir visual) | Medio | P0 |
| Mi reserva / cancelación (24 h antes) | BT | `src/app/reserva/[token]`, `bookings/[token]/route.ts` | Real | API | `/reserva/[token]` | Adaptar | Medio (enlaces en mails) | P0 |
| Mails de confirmación/baja/cancelación | BT | `src/lib/tourist-booking-email.ts`, `email-assets.ts` | Real (si hay SMTP) | nodemailer | `lib/buses/correo.ts` | Reutilizar (enlaces al portal) | Medio | P0 |
| Avisos por WhatsApp | BT | `src/lib/tourist-whatsapp.ts` | Implementado, apagado | Meta | igual, apagado por bandera | Reutilizar | Bajo | P3 |
| Bicicletas municipales (BiciTour en el Parque) | BT | `bike_stock`, `municipal_bikes` | Real | — | dentro de reservas | Reutilizar | Bajo | P0 |
| Panel de salidas (alta, lote, edición, cancelación con aviso, inscriptos) | BT | `TouristDeparturesPage.tsx`, `api/admin/tourist-departures/**` | Real, con fallas (cupo < reservado, fecha pasada) | base | `/admin/buses` | Adaptar + corregir | Alto | P0 |
| Circuitos (CRUD + traducción IA) | BT | `TouristCircuitsPanel.tsx`, `api/admin/tourist-circuits/**` | Real | OpenRouter (opcional) | `/admin/buses/circuitos` | Adaptar | Medio | P1 |
| Reconfirmar / cancelar reserva desde el panel | BT | `api/admin/tourist-bookings/[id]` | Real, reconfirmación no atómica | base | igual, con bloqueo de fila | Adaptar + corregir | Medio | P1 |
| Exportaciones XLSX | BT | `src/lib/simple-xlsx.ts`, `…/export` | Real | — | igual | Reutilizar | Bajo | P1 |
| Bus Educativo: formulario, calendario, adjunto .docx | BT | `src/app/educativo`, `EducationalBusRequestForm.tsx`, `educational-bus-requests.ts` | Real | disco, base | `/bus-educativo` | Adaptar | Medio | P1 |
| Bus Educativo: panel (solicitudes, estados, manual, export, circuitos, configuración) | BT | `EducationalRequestsPage.tsx`, `EducationalCircuitsPanel.tsx`, APIs | Real | base | `/admin/buses/educativo` | Adaptar | Medio | P1 |
| Books de fotos (subida comprimida, QR, vencimiento, cron) | BT | `PhotoBooksPage.tsx`, `photo-book*.ts`, `archivos.ts`, APIs | Real | disco | `/admin/buses/fotos`, `/galeria`, `/galeria/[token]` | Adaptar | Medio (QR impresos) | P2 |
| BiciTour en vivo (sesiones, preguntas, IA, insignias, GPS) | BT | `src/lib/bicitour*.ts`, `components/bicitour/*`, APIs | Funcional, oculto, contenido demo | Leaflet, OpenRouter | `/admin/buses/bicitour`, `/bicitour/[codigo]` | Adaptar (oculto hasta tener contenido real) | Medio | P2 |
| Landing selectora `/` del bus | BT | `src/app/page.tsx` | Real | — | portada del portal | Retirar | Ninguno | — |
| Auth del bus (login, recuperar clave, sesiones) | BT | `admin-auth*.ts`, `api/auth/*` | Real | bcryptjs | auth del portal | Reemplazar (cuentas importadas) | Medio | P0 |
| `middleware.ts` | BT | raíz | Deprecado en Next 16 | — | `proxy.ts` | Reemplazar | Bajo | P0 |

## Migue

| Funcionalidad | Origen | Archivos | Estado actual | Dependencias | Destino | Estrategia | Riesgo | Prio |
|---|---|---|---|---|---|---|---|---|
| Widget de chat | PT, AC, BT | `MigueTurismo.tsx`, `migue-chat.tsx`, `MigueChat.tsx` | Los tres reales, contratos distintos | backend Migue | `MigueTurismo.tsx` en todo el sitio | Fusionar (queda el de PT) | Medio | P0 |
| Contenido público para Migue | PT, AC | `lib/migue.ts`, `app/api/migue/contenido` | Real, mismo formato | contenidos | misma ruta + agenda + bus con cupos reales | Fusionar | Medio | P1 |
| FAQ | BT | `faqs`, `FaqsPage.tsx`, `api/admin/faqs` | Real (las lee el bot) | base `turismo` | `/admin/migue` | Adaptar | Bajo | P1 |
| Interacciones y KPI | BT | `InteractionsPage.tsx`, `DashboardPage.tsx`, vistas `kpi_*` | Real (recharts) | base | `/admin/migue/interacciones` (tablas y barras CSS, sin recharts) | Adaptar | Bajo | P2 |
| Backend (WhatsApp, Telegram, web) | BT | `backend/src/**` | Real | OpenRouter, Meta, Telegram | servicio aparte, sin cambios de contrato | Reutilizar | Bajo | — |

## Administración y seguridad

| Funcionalidad | Origen | Archivos | Estado actual | Dependencias | Destino | Estrategia | Riesgo | Prio |
|---|---|---|---|---|---|---|---|---|
| Ingreso, sesión firmada, límites de intentos | PT | `lib/auth/*`, `app/admin/ingresar` | Real | pgcrypto | igual + verificación scrypt para cuentas importadas | Reutilizar + extender | Medio | P0 |
| Roles y permisos por módulo | AC (admin/editor), BT (uno) | — | Parcial | — | `lib/permisos.ts` + `public.puede()` + RLS | Nuevo | Alto | P0 |
| Usuarios y permisos desde el panel | — | — | Solo consola en los tres | — | `/admin/usuarios` (superadmin) | Nuevo | Medio | P1 |
| Auditoría | PT | `public.auditoria`, `/admin/auditoria` | Real (disparadores) | — | + acciones de buses y cuentas | Reutilizar + extender | Bajo | P1 |
| Tablero | PT, AC, BT | `app/admin/(panel)/page.tsx`, `admin/page.tsx`, `DashboardPage.tsx` | Reales, separados | — | tablero único con datos de los módulos | Fusionar | Medio | P1 |
| Configuración del sitio | PT | `/admin/configuracion` | Real | — | igual | Reutilizar | Bajo | P1 |
