# Estado de la integración

Registro vivo. Se actualiza en cada fase. Estados: ✅ hecho y probado · 🟡 hecho, falta probar algo
(se dice qué) · ⏳ pendiente · ⛔ bloqueado (se dice por qué).

Rama: `integracion/portal-unificado`. Última actualización: 2026-11-20.

## Fases

| Fase | Estado | Criterio de aceptación | Evidencia |
|---|---|---|---|
| A — Auditoría | ✅ | Los cuatro documentos de `docs/` y los informes de `docs/auditoria/` | este directorio |
| B — Arquitectura | ✅ | Decisiones con motivo en ARQUITECTURA_UNIFICADA | — |
| C — Portal contenedor | ⏳ | Tests de PagTurismo verdes + roles y permisos aplicados en servidor y base | — |
| D — Cultura | ⏳ | Agenda con filtros y calendario sobre contenidos; importador con prueba en seco y pruebas | — |
| E — Buses | ⏳ | Reserva real contra la función atómica en base local; panel de salidas con permisos | — |
| F — Panel unificado | ⏳ | Tablero con datos reales de los módulos; usuarios y permisos | — |
| G — Migue | ⏳ | Un widget; contenido con agenda y salidas reales | — |
| H — Diseño y QA | ⏳ | typecheck, tests, build, revisión en móvil/escritorio y teclado | — |
| I — Despliegue | ⏳ | Guía de despliegue, rollback y verificación | — |

## Línea base (antes de tocar código)

- `npm test`: 81 pruebas, 81 pasan.
- `npx next typegen && npx tsc --noEmit`: sin errores.
- Ajuste: `tsconfig.json` excluye `_fuentes/` (copias locales de los repos de origen, ignoradas por git).

## Decisiones tomadas

Ver [ARQUITECTURA_UNIFICADA.md](ARQUITECTURA_UNIFICADA.md): A1–A3 (una app + backend de Migue aparte),
D1 (cultura dentro de `contenidos`), D2 (buses en su base, una autoridad de escritura), D3 (circuito
operativo vs. ficha narrativa), D4 (FAQ en la base del bot), roles y permisos, sistema de diseño.

## Riesgos abiertos

| Riesgo | Estado |
|---|---|
| Fallas del flujo de reservas detectadas en la auditoría (sin antiduplicado, cupo editable por debajo de lo reservado, salida del día ya partida acepta reservas, reconfirmación no atómica) | ⏳ a corregir en fase E |
| Bus Educativo: `blockedUntil` por defecto vencido (2026-08-31), carga manual con adjunto inexistente | ⏳ fase E |
| Books listados públicamente con su token | ⏳ decisión de negocio: se mantiene el comportamiento actual hasta que la Dirección decida |
| Webhook de WhatsApp acepta pedidos sin firma si falta `WHATSAPP_APP_SECRET` | Fuera del portal (repo del bot) — informado |
| `bot_chat_messages` sin retención | Fuera del portal (repo del bot) — informado |

## Configuración externa que falta

- `BUSES_DATABASE_URL`, `ARCHIVOS_DIR`, `ARCHIVOS_SECRETO`, `SMTP_*`, `CRON_SECRET` en el `.env` del portal.
- Rol `portal_buses` en la base `turismo`.
- DNS/nginx de `turismo.smt.gob.ar` y redirecciones de `busturistico.smt.gob.ar`.
- Credenciales de staging y una copia anonimizada de `turismo` para pruebas.
