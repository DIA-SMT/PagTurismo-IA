# Plan de migración

Reglas que valen para todos los pasos:
- Nunca se borra ni se vacía una base de producción. Ninguna migración destructiva corre sola.
- Cada herramienta de copia/importación arranca en **prueba en seco** y solo escribe con `--escribir`.
- Antes de cada paso con escritura: respaldo con `pg_dump -Fc` verificado (`pg_restore --list` sin errores).
- Una sola autoridad de escritura de reservas en todo momento.
- Producción no se toca durante el desarrollo: todo se prueba en local (PGlite) y en staging.

---

## 0. Inventario de bases

| Base | Dueño | Qué tiene | Qué pasa |
|---|---|---|---|
| `portalturismo` (VPS) | PagTurismo | contenidos, admins, auditoría, intentos, `auth.users` | **Se migra en el lugar** con migraciones incrementales nuevas (no destructivas) |
| `turismo` (VPS) | BotTurismo | circuitos, salidas, reservas, educativo, books, bicitour, faqs, interacciones | **No se mueve.** El portal se conecta con `BUSES_DATABASE_URL` |
| base de Agenda (VPS, `/srv/agenda`) | Agenda Cultural | eventos, fechas, lugares, categorías, cuentas | Origen de importación (solo lectura). Se retira después del corte |
| WordPress `agendaculturalsmt.com` | externo | ~383 eventos EventON | Origen de importación por API pública mientras siga en uso |

## 1. Migraciones del portal (incrementales)

En `supabase/migrations/` (las aplica `npm run db:migrar` en `desplegar.sh`, antes de cambiar `actual`):

| Archivo | Qué hace | Reversión |
|---|---|---|
| `20261120120000_roles_permisos.sql` | `admins.rol`, `admins.modulos`, `admins.scrypt_pendiente`; función `public.puede()`; políticas de `contenidos` por módulo; disparador que exige `publicar` para pasar a publicado; colección `configuracion/categorias-agenda`. Las cuentas existentes quedan `superadmin` (hoy todas tienen acceso total: no cambia nada para nadie). | `supabase/rollback/20261120120000_roles_permisos.down.sql` (restaura las políticas `es_admin()`; no borra columnas con datos sin pedirlo) |

Las nuevas columnas tienen valores por defecto: una versión anterior del portal sigue funcionando contra la
base migrada (compatibilidad hacia atrás para poder volver atrás solo con `ln -sfn`).

## 2. Cuentas del equipo

```bash
npm run cuentas -- importar --desde bus     # lee admin_profiles de BUSES_DATABASE_URL
npm run cuentas -- importar --desde agenda  # lee profiles de AGENDA_DATABASE_URL
# prueba en seco: lista qué cuentas se crearían, cuáles ya existen y con qué rol
npm run cuentas -- importar --desde bus --escribir --rol admin --modulos buses,migue
npm run cuentas -- importar --desde agenda --escribir --rol admin --modulos cultura
```

- Si el correo ya existe en el portal, **no se toca** (se informa).
- bcrypt del bus → se copia tal cual a `auth.users.encrypted_password`.
- scrypt de Agenda → se guarda en `auth.users.encrypted_password` con su prefijo `scrypt$`; el ingreso lo
  valida en Node y lo re-hashea a bcrypt en el primer ingreso correcto.
- Rol de Agenda `admin` → `admin`; `editor` → `editor`. Cuentas inactivas → `activo = false`.
- Cada alta queda en la auditoría (disparador sobre `admins`).

## 3. Cultura: eventos y lugares a `contenidos`

```bash
# 1) espacios (lugares): primero, para que los eventos puedan enlazarlos
npm run cultura -- espacios                       # prueba en seco desde db/contenido de Agenda
npm run cultura -- espacios --escribir
# 2) eventos desde la base de Agenda (lo editado en su panel)
AGENDA_DATABASE_URL=… npm run cultura -- eventos --desde-base
AGENDA_DATABASE_URL=… npm run cultura -- eventos --desde-base --escribir
# 3) eventos del WordPress viejo que no estuvieran en la base
npm run cultura -- eventos --desde-wordpress [--escribir]
```

Reglas del importador (`scripts/cultura.ts`, lógica pura en `lib/cultura/importar.ts`, con pruebas):
- Identidad: `datos.legado = { origen: "agenda" | "wordpress", id }`. Si ya hay una ficha con ese legado, se
  **saltea** (no se pisa lo editado en el portal). `--actualizar` solo agrega fechas nuevas y nunca cambia
  el estado de una fecha existente ni el estado de publicación.
- Lugares: si ya existe un lugar del portal con el mismo slug o el mismo nombre normalizado, el espacio de
  Agenda **se fusiona en ese lugar** (completa campos vacíos, suma galería y legado); no se crea un duplicado.
  Las coincidencias dudosas se listan para revisión manual.
- Fechas: `timestamptz` → hora local de Tucumán `AAAA-MM-DDTHH:mm`; estados `scheduled→confirmado`,
  `suspended→suspendido`, `rescheduled→reprogramado`, `cancelled→cancelado`.
- Estado: lo publicado en Agenda entra publicado; lo demás, borrador.
- Imágenes: se copian a `CARPETA_SUBIDAS/cultura/…` y se verifica el tamaño; si una falla, la ficha entra
  sin imagen y se reporta.
- Reporte JSON con creadas, fusionadas, salteadas y dudosas.

Validación posterior: `npm run validar` y el tablero del panel («Para revisar»).

## 4. Buses: corte del sitio viejo (una sola autoridad de escritura)

Previo (sin impacto):
1. Respaldo de `turismo`: `pg_dump -Fc turismo > /root/respaldos/turismo-<fecha>.dump` + `pg_restore --list`.
2. Crear el rol del portal en la base `turismo` (script `deploy/sql/turismo-rol-portal.sql`): `SELECT,
   INSERT, UPDATE` sobre las tablas del módulo, `EXECUTE` sobre `create_tourist_booking`, `DELETE` solo
   sobre `tourist_departures` (sin reservas confirmadas, lo controla la app), `faqs`, `photo_books`,
   `photo_book_photos`, tablas `bicitour_*`; **sin `DELETE` ni `TRUNCATE` sobre `tourist_bookings`**.
3. Aplicar `deploy/sql/turismo-mejoras.sql` (aditivo, idempotente): índice para antiduplicado de reservas
   confirmadas por salida y correo; nada se borra.
4. En `compartido/.env` del portal: `BUSES_DATABASE_URL`, `ARCHIVOS_DIR=/srv/turismo/compartido/archivos`
   (la carpeta existente, con permiso de lectura/escritura para el usuario `portalturismo`), `ARCHIVOS_SECRETO`
   (= `AUTH_SECRET` del bus, para que las URLs firmadas vigentes sigan valiendo), `SMTP_*`, `CRON_SECRET`.
5. Desplegar el portal en staging contra una **copia** de `turismo` (`createdb -T` o restore del respaldo)
   y correr la lista de verificación del §8.

Corte (ventana corta, idealmente fuera del horario de reservas):
1. `pm2 stop <sitio-del-bus>` (solo el sitio Next del bus, ver `pm2 ls`; **el bot sigue andando**).
2. Desplegar el portal con el módulo de buses activo.
3. nginx de `busturistico.smt.gob.ar` → `return 308 https://turismo.smt.gob.ar$uri_mapeada` con la tabla
   de redirecciones (ARQUITECTURA §3). Mantener la ruta de la API vieja `/api/tourist-bus/*` también
   redirigida (307 para POST) durante 30 días.
4. Crontab de limpieza de books → apuntar al puerto del portal (3007).
5. Verificación del §8.

Vuelta atrás: `pm2 start <sitio-del-bus>`, restaurar el nginx del bus y `ln -sfn` del portal a la versión
anterior. Como ambos usan la misma base y la misma función de reserva, no hay datos que reconciliar.

## 5. Archivos

| Origen | Destino | Cómo |
|---|---|---|
| `/srv/turismo/compartido/archivos` | la misma carpeta | se reutiliza (permiso de grupo para `portalturismo`) |
| `/srv/agenda/media` | `/srv/portalturismo/compartido/subidas/cultura` | lo copia el importador de cultura, archivo por archivo, verificando tamaño; el origen no se borra |

## 6. Migue

1. El portal publica en `/api/migue/contenido` la agenda, los espacios y el bus. Sin cambios en el backend.
2. En el `.env` del backend de Migue, sumar el dominio del portal a `WEB_CHAT_ALLOWED_ORIGINS` si el chat
   web del bus se sigue usando (el widget del portal usa `migue.smt.gob.ar`, que ya lo permite).
3. Opcional, en el repo del bot: reemplazar el `curl` a la agenda externa por `GET /api/migue/contenido`
   del portal. No es requisito del corte.

## 7. Consolidación futura de la base de buses (opcional)

Cuando el equipo lo decida, mover `turismo` al esquema `buses` de `portalturismo`: restaurar el respaldo
de `turismo` en una base temporal, `ALTER SCHEMA public RENAME TO buses` allí, y después
`pg_dump -n buses temporal | pg_restore -d portalturismo`. El portal
solo cambia `BUSES_DATABASE_URL` (misma base, `?options=-c search_path=buses`) y el bot su `DATABASE_URL`
con la misma opción. Requiere parar el bot durante el volcado.

## 8. Verificación posterior al corte

- [ ] `/`, `/agenda`, `/lugares`, `/bus-turistico`, `/bus-educativo` responden 200 en es/en/pt.
- [ ] Reserva de prueba en una salida de prueba (crear salida «PRUEBA», reservar, recibir mail, cancelar
      por el enlace, borrar la salida).
- [ ] Un enlace `/reserva/<token>` viejo abre en el portal.
- [ ] Un QR `/fotos/<token>` viejo abre la galería.
- [ ] Solicitud educativa de prueba con adjunto; descarga del adjunto desde el panel; rechazarla.
- [ ] Ingreso al panel con una cuenta importada de cada origen.
- [ ] Un editor no puede publicar; una cuenta de consulta no puede editar (probar en servidor, no solo menú).
- [ ] El bot de WhatsApp contesta y ve las salidas.
- [ ] `/.env`, `/.git/config`, `/package.json` → 404.
- [ ] Auditoría registra las acciones de prueba.
