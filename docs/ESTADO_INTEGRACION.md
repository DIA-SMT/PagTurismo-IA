# Estado de la integración

Registro vivo. Estados: ✅ hecho y probado · 🟡 hecho, falta probar algo (se dice qué) · ⏳ pendiente ·
⛔ bloqueado (se dice por qué). Nada figura como ✅ si usa datos ficticios o acciones simuladas en
producción: las pruebas locales usan la base embebida con datos **de prueba** marcados como tales.

Rama: `integracion/portal-unificado`. Última actualización: 2026-11-22. **Producción no se tocó.**

## Resumen

| Fase | Estado | Criterio de aceptación | Evidencia |
|---|---|---|---|
| A — Auditoría | ✅ | Cuatro documentos + informes detallados | `docs/`, `docs/auditoria/` |
| B — Arquitectura | ✅ | Decisiones con motivo | `docs/ARQUITECTURA_UNIFICADA.md` |
| C — Portal contenedor y permisos | ✅ | Tests de PagTurismo verdes; roles por módulo en servidor **y** base | `tests/permisos.test.ts` (la regla SQL y la de TS coinciden en todos los casos) |
| D — Cultura | ✅ | Agenda con filtros y calendario sobre `contenidos`; importador con prueba en seco | `tests/cultura.test.ts`, `tests/importar-cultura.test.ts`; 386 eventos reales importados en local sin duplicar al repetir |
| E — Buses | 🟡 | Reserva real contra la función atómica; panel con permisos | `tests/buses-base.test.ts`, `tests/buses-reglas.test.ts`; flujo completo en navegador (local). Falta: staging contra copia de la base `turismo`, SMTP real |
| F — Panel unificado | ✅ | Tablero con datos reales; usuarios y permisos | Tablero, `/admin/usuarios`, menú por permisos (verificado con 3 roles) |
| G — Migue | ✅ | Un widget; contenido con agenda y cupos reales | `tests/migue-bus.test.ts`; `/api/migue/contenido` sin datos personales (verificado) |
| H — Diseño y QA | 🟡 | typecheck, tests, build, responsive | 138/138 tests unitarios, **31/31 Playwright** (escritorio y celular), `tsc` limpio, `next build` OK, sin desborde horizontal a 375 px. Falta: auditoría WCAG automatizada |
| I — Despliegue | 🟡 | Guía de despliegue, rollback y verificación | `deploy/README.md`, `deploy/sql/`, `.env.example`. Falta: ensayo en staging |

## Qué está implementado

### Portal y permisos
- Migración aditiva `supabase/migrations/20261120120000_roles_permisos.sql`: `admins.rol` y `admins.modulos`,
  `public.puede()`, RLS de `contenidos` por módulo, disparador que exige permiso de **publicar** para pasar a
  publicado o tocar lo publicado, protección del superadmin, `auditar_accion()`. Vuelta atrás en
  `supabase/rollback/`.
- `lib/permisos.ts` (misma regla), `requerirPermiso`, `exigirContenido`, menú agrupado por módulo, pantalla
  **Usuarios y permisos** (solo superadmin), aviso de acceso sin permiso en el tablero.
- Ingreso único. Cuentas importables desde el bus (bcrypt) y la Agenda (scrypt, validado en Node y pasado a
  bcrypt en el primer ingreso): `npm run cuentas -- importar` (prueba en seco por defecto).

### Cultura
- Eventos y lugares ampliados (categorías de la agenda, destacado, galería, lugar sin ficha, entradas,
  capacidad, accesibilidad, requisitos, contacto, legado; tipo de espacio, servicios y redes).
- `/agenda`: búsqueda, categoría, lugar, gratis, hoy / fin de semana / fecha, **calendario mensual** con
  intensidad por día, destacados primero. `/agenda/[slug]`: compartir, todas las fechas en `.ics`, Google
  Calendar, galería y mapa OpenStreetMap. `/lugares` nuevo con filtro por tipo.
- `npm run cultura` (espacios, base de la Agenda, WordPress viejo) con legado, fusión sin pisar lo editado,
  fechas en hora de Tucumán y categorías nuevas. El mapeo EventON de la Agenda se reutiliza tal cual.
- Redirecciones 308 de las rutas de la Agenda (`/eventos/x`, `/espacios-culturales`, espacios en la raíz…).

### Buses
- Código de BotTurismo portado (`lib/buses`, `components/buses`, `app/api/**` con los **mismos contratos**).
- Conexión a la base real del bus (`BUSES_DATABASE_URL`, rol restringido); en local, PGlite con las
  **migraciones históricas reales** servida por socket (`lib/buses/local/preparar.ts`).
- Correcciones sin tocar `create_tourist_booking`: salida del día ya partida, antiduplicado por correo
  (índice aditivo), límite de pedidos por IP y correo, cupo y bicis que no bajan de lo reservado,
  reconfirmación con bloqueo de fila.
- Públicas: `/bus-turistico`, `/bus-educativo`, `/reserva/[token]`, `/galeria`, `/galeria/[token]` (es/en/pt)
  y `/bicitour/[codigo]`. Próximas salidas reales en la portada.
- Panel: salidas y reservas, circuitos, Bus Educativo, books de fotos, BiciTour, FAQ e interacciones de Migue.
  Cada operación de escritura queda en la auditoría del portal con la persona.
- CSS del bus convertido a tokens del portal (tema claro y oscuro); íconos con el sprite del portal.

### Migue
- Un solo widget (`MigueTurismo`) en todo el sitio. `/api/migue/contenido` suma eventos próximos (120 días),
  espacios, páginas nuevas y circuitos con **cupos del momento**; si el bus no responde, le indica no
  confirmar disponibilidad. Sin datos personales.

## Qué está probado

| Qué | Cómo |
|---|---|
| Permisos (rol × módulo × acción), RLS, publicación, cuentas | `tests/permisos.test.ts` contra PGlite con las migraciones reales |
| Filtros, calendario, `.ics` | `tests/cultura.test.ts` |
| Importador (espacios, eventos, EventON, idempotencia, fechas) | `tests/importar-cultura.test.ts`; corrida real contra el WordPress público (dos veces, sin duplicar) |
| Reserva atómica, cupos, bicis, cancelación, antiduplicado, puente local | `tests/buses-base.test.ts` sobre el esquema real del bus |
| Reglas del portal sobre reservas | `tests/buses-reglas.test.ts` |
| Migue y el bus | `tests/migue-bus.test.ts` |
| Pruebas originales de PagTurismo | 81 de la línea base, todas verdes |
| En el navegador (local) | Reserva por la interfaz; sin cupo; duplicado; salida ya partida; «Mi reserva» y cancelación que libera el cupo; cupo que no baja; editor sin publicar ni borrar; cuenta de buses sin acceso a turismo; tablero con datos reales; agenda y calendario con 386 eventos; responsive 375 px |
| Build | `next build` sin errores (3 avisos de rastreo de archivos en `lib/buses/archivos.ts`, ver riesgos) |
| Punta a punta (Playwright, `npm run test:e2e`) | 31 pruebas en `e2e/` contra un servidor con base propia (`.local-e2e`): agenda (filtros, calendario, ficha, `.ics`, borradores ocultos, redirecciones, idiomas), reservas (formulario completo, validación, cupo, duplicado, ráfagas, regla de 24 h, cancelación que libera el lugar, enlaces viejos), panel (ingreso, contraseña equivocada, superadmin crea cuentas, editor sin publicar ni borrar, cultura publica y despublica, cultura y consulta sin acceso a buses por pantalla y por API, cupo que no baja, auditoría, tablero), Migue sin datos personales, y celular sin desborde |

## Qué falta

| Pendiente | Prioridad | Nota |
|---|---|---|
| Ensayo en **staging** contra una copia de `turismo` y de `portalturismo` | P0 | Antes del corte (PLAN_MIGRACION §4) |
| Auditoría WCAG 2.2 AA automatizada (axe) en las pantallas portadas del bus | P1 | Lo nuevo tiene etiquetas, foco visible y `aria-live`. Playwright encontró y se corrigió que los campos con error del bus no se marcaban como inválidos (`aria-invalid`); las pantallas del panel del bus no se auditaron una por una |
| Páginas fijas de la Agenda (nuestra ciudad, patrimonio, ferias, gastronomía, guías, oficinas, FAQ, murales, museo a cielo abierto) | P2 | Pasarlas a fichas editables de Planificá / Qué hacer |
| Biblioteca de multimedia central (referencias, protección de borrado) | P2 | Hoy cada ficha guarda su foto con texto alternativo, crédito y permiso |
| Menús, SEO y módulos configurables desde el panel | P2 | Hoy: configuración del sitio existente |
| Portugués del Bus Turístico y Bus Educativo | P2 | Los textos del bus existen en es/en; en pt se muestra español con aviso |
| Auditoría con diferencias campo por campo en operaciones del bus | P3 | Hoy se registra persona, operación y ruta (se anota al pedirla: incluye intentos rechazados) |
| Lint (ESLint) | P3 | PagTurismo no tenía linter configurado |

## Decisiones tomadas

Ver `docs/ARQUITECTURA_UNIFICADA.md`. Las principales: una sola app Next.js + backend de Migue aparte (A1–A3);
cultura dentro de `public.contenidos` (D1); buses en su base con una sola autoridad de escritura (D2); circuito
operativo vs. ficha narrativa (D3); FAQ en la base del bot (D4); diseño de PagTurismo con semáforo y tonos
compatibles de la estética municipal (sin Plus Jakarta Sans ni marca CIMBA).

## Riesgos abiertos

| Riesgo | Estado |
|---|---|
| Cancelar una salida deja sus reservas como «confirmadas» (comportamiento original del bus) | Se mantuvo para no cambiar reglas de negocio sin acuerdo. Decisión pendiente de la Dirección de Turismo |
| Books «privados» listados públicamente con su token (`/galeria`) | Comportamiento original, mantenido. Decisión pendiente |
| Bus Educativo: `blockedUntil` por defecto ya vencido y carga manual con adjunto inexistente | Original del bus; no rompe nada, pendiente de limpiar |
| Webhook de WhatsApp sin firma si falta `WHATSAPP_APP_SECRET`; `curl` a la agenda externa; `bot_chat_messages` sin retención | En el repo del bot (fuera del portal). Informado |
| El portal carga todas las fichas de `contenidos` por pedido (ahora ~420 con la agenda) | Medido en local sin problema; vigilar al crecer (filtrar eventos viejos en SQL si hiciera falta) |
| Un aviso de hidratación de React apareció una vez en una corrida completa de Playwright (en modo desarrollo) | No se reproduce revisando cada página por separado; React lo corrige solo en el navegador. Vigilar |
| Aviso de build: `lib/buses/archivos.ts` hace que el rastreo de archivos incluya todo el proyecto | Solo agranda el bundle del servidor; no afecta la ejecución |
| Índice antiduplicado: si la base real ya tiene duplicados no se crea | La API igual frena duplicados nuevos; revisar los existentes |

## Configuración externa que falta

- En el `.env` del portal: `BUSES_DATABASE_URL`, `ARCHIVOS_DIR`, `ARCHIVOS_SECRETO` (= `AUTH_SECRET` del bus),
  `CRON_SECRET`, `SMTP_*`, `SITIO_URL`. Plantilla: `.env.example`.
- Rol `portal_buses` en la base `turismo` (`deploy/sql/turismo-rol-portal.sql`) y mejora
  `deploy/sql/turismo-mejoras.sql`.
- Permiso del usuario `portalturismo` sobre `/srv/turismo/compartido/archivos`.
- DNS/certificado de `turismo.smt.gob.ar`; nginx de `busturistico.smt.gob.ar` con
  `deploy/nginx-busturistico-redireccion.conf`; `client_max_body_size 20M` en el portal.
- Cron de limpieza de books al puerto 3007.
- `AGENDA_DATABASE_URL` (solo lectura) para importar lo editado en el panel de la Agenda.
- Staging con datos anonimizados.
