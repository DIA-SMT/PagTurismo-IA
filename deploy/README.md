# Portal de turismo en la VPS municipal

Sigue la guía «Migrar proyectos a la VPS» de la Dirección de Innovación. Datos de este proyecto:

| | |
|---|---|
| Servidor | 195.35.42.168 (Ubuntu 24.04, nginx 1.24, Node 22, PostgreSQL 16) |
| Usuario y carpeta | `portalturismo`, `/srv/portalturismo/` (`versiones/`, `compartido/`, `registros/`, `actual`) |
| Puerto | 3007 (solo en 127.0.0.1; entra todo por nginx) |
| Base | `portalturismo` en el PostgreSQL local |
| Dominio provisorio | `portalturismo.195-35-42-168.sslip.io` |

Sin Supabase el portal corre en **modo propio** (`lib/entorno.ts`):

- **Base:** PostgreSQL local. `npm run db:migrar` crea el esquema (con `supabase/local/shim.sql`: roles, `auth` y
  `storage` mínimos) y aplica las migraciones.
- **Ingreso del equipo:** lo resuelve el portal. Contraseña bcrypt en `auth.users`, sesión firmada con `SESION_SECRETO`.
  Las cuentas se manejan con `npm run cuentas` en el servidor.
- **Fotos:** en `CARPETA_SUBIDAS` (`/srv/portalturismo/compartido/subidas`), servidas por `/subidas/…`.

## `.env` (en `compartido/`, permisos 600)

```
NODE_ENV="production"
DATABASE_URL="postgresql://portalturismo:LA_CLAVE@127.0.0.1:5432/portalturismo"
DIRECT_URL="postgresql://portalturismo:LA_CLAVE@127.0.0.1:5432/portalturismo"
SESION_SECRETO="…"            # openssl rand -base64 48, generado en el servidor
CARPETA_SUBIDAS="/srv/portalturismo/compartido/subidas"
SITIO_URL="https://portalturismo.195-35-42-168.sslip.io"
```

Sin `NEXT_PUBLIC_SUPABASE_URL`: eso es lo que pone al portal en modo propio.

## Desplegar una versión nueva

```bash
/srv/portalturismo/desplegar.sh          # main
/srv/portalturismo/desplegar.sh Agustin  # otra rama
```

Clona en una carpeta nueva, compila, aplica las migraciones pendientes, apunta `actual` y hace `pm2 reload`.

**Volver atrás:** `ln -sfn /srv/portalturismo/versiones/LA_QUE_ANDABA /srv/portalturismo/actual` y
`sudo -u portalturismo pm2 reload portalturismo`.

## Cuentas del panel

```bash
cd /srv/portalturismo/actual
sudo -u portalturismo npm run cuentas -- listar
sudo -u portalturismo npm run cuentas -- crear persona@smt.gob.ar "Nombre Apellido"
sudo -u portalturismo npm run cuentas -- clave persona@smt.gob.ar
sudo -u portalturismo npm run cuentas -- desactivar persona@smt.gob.ar
```

La contraseña se pide por teclado y no se ve. Las cuentas que vinieron de Supabase conservan su contraseña.

## Migración inicial desde Supabase

1. Usuario, carpetas, base y rol como en la guía. Además, como `postgres`:
   `grant anon, authenticated to portalturismo;`. Así el portal puede tomar esos roles por consulta y las políticas
   RLS se aplican igual que en Supabase.
2. `.env` como arriba, y la primera versión con `desplegar.sh`. Eso crea el esquema.
3. Copiar el contenido, las cuentas y la auditoría:
   `ORIGEN_DATABASE_URL=<DIRECT_URL de Supabase> npm run db:copiar-desde-supabase`. La cadena va en un archivo que
   solo lee root, nunca en la línea de comandos.
4. pm2 + systemd y nginx + certbot como en la guía (`deploy/ecosystem.config.cjs`, `deploy/nginx-portalturismo.conf`).
5. Verificar: página 200, CSS 200, y `/.env` `/.env.local` `/.git/config` `/package.json` 404. Después recorrer el sitio en
   los tres idiomas y entrar al panel.

---

## Portal unificado (Turismo + Agenda Cultural + Bus Turístico)

Desde la rama `integracion/portal-unificado` el portal también sirve la agenda cultural, el Bus
Turístico, el Bus Educativo, los books de fotos, BiciTour y el panel de Migue. Sigue siendo **un solo
proceso** (`portalturismo`, puerto 3007). El bot de Migue (Express :3000 y Telegram) sigue igual.
Arquitectura y decisiones: `docs/ARQUITECTURA_UNIFICADA.md`. Pasos con datos reales:
`docs/PLAN_MIGRACION.md`.

### Variables nuevas en `compartido/.env`

Todas están explicadas en `.env.example`. Mínimo para el módulo de buses:

```
BUSES_DATABASE_URL="postgresql://portal_buses:LA_CLAVE@127.0.0.1:5432/turismo"
ARCHIVOS_DIR="/srv/turismo/compartido/archivos"
ARCHIVOS_SECRETO="…"     # el mismo valor que AUTH_SECRET del sitio del bus
CRON_SECRET="…"
SMTP_HOST=… SMTP_PORT=… SMTP_USER=… SMTP_PASS=… SMTP_FROM=…
SITIO_URL="https://turismo.smt.gob.ar"
```

### Una sola vez, antes del primer despliegue del portal unificado

1. Respaldos verificados:
   ```bash
   sudo -u postgres pg_dump -Fc portalturismo > /root/respaldos/portalturismo-$(date +%F).dump
   sudo -u postgres pg_dump -Fc turismo > /root/respaldos/turismo-$(date +%F).dump
   pg_restore --list /root/respaldos/turismo-$(date +%F).dump > /dev/null && echo respaldo OK
   ```
2. Rol del portal en la base del bus (no toca datos): `sudo -u postgres psql -d turismo -f deploy/sql/turismo-rol-portal.sql`
   y la clave con `alter role portal_buses with password '…'` en una sesión de `psql` (no en la línea de comandos).
3. Mejora antiduplicado (aditiva, idempotente): `sudo -u postgres psql -d turismo -f deploy/sql/turismo-mejoras.sql`.
   Si avisa que hay duplicados, no crea el índice: revisarlos con el equipo del bus.
4. Archivos: el usuario `portalturismo` tiene que leer y escribir `/srv/turismo/compartido/archivos`
   (`setfacl -R -m u:portalturismo:rwX -m d:u:portalturismo:rwX /srv/turismo/compartido/archivos`).
5. nginx del portal: `client_max_body_size 20M;` (fotos de books hasta 15 MB).
6. Cuentas: `npm run cuentas -- importar --desde bus` (prueba en seco) y después con `--escribir`.
   Lo mismo `--desde agenda` con `AGENDA_DATABASE_URL`. Asignar roles: `npm run cuentas -- permisos …`.

### El corte (una ventana corta)

```bash
sudo -u turismo -H pm2 ls                           # anotar el nombre real del proceso del sitio Next del bus
sudo -u turismo -H pm2 stop <sitio-del-bus>         # solo el sitio; el bot de Migue sigue andando
/srv/portalturismo/desplegar.sh integracion/portal-unificado
```

Después, nginx de `busturistico.smt.gob.ar` → `deploy/nginx-busturistico-redireccion.conf`, y el cron
de limpieza de books al puerto del portal:

```cron
15 3 * * * . /srv/portalturismo/compartido/.env && curl -fsS -m 120 -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3007/api/cron/photo-books-cleanup > /dev/null
```

### Cultura (contenido)

```bash
cd /srv/portalturismo/actual
sudo -u portalturismo npm run cultura -- espacios                # prueba en seco
sudo -u portalturismo npm run cultura -- espacios --escribir --fotos
sudo -u portalturismo npm run cultura -- eventos --desde-base --escribir --fotos   # con AGENDA_DATABASE_URL
sudo -u portalturismo npm run cultura -- eventos --desde-wordpress --escribir --fotos
```

Los espacios nuevos entran en **borrador**: un administrador de cultura los revisa y publica.

El WordPress viejo (`agendaculturalsmt.com`) dejó de responder y `agendacultural.smt.gob.ar` todavía redirige
ahí, así que las fotos se traen del **sitio nuevo de la Agenda** (`AGENDA_SITIO_URL`, por defecto
`https://agenda.195-35-42-168.sslip.io`). Lo que la Agenda tiene y el portal no (relevado el 25/11/2026, ver
`docs/RELEVAMIENTO_AGENDA.md`):

```bash
sudo -u portalturismo npm run cultura -- espacios --desde-sitio --fotos             # prueba en seco
sudo -u portalturismo npm run cultura -- espacios --desde-sitio --fotos --escribir  # fotos de los 21 espacios
sudo -u portalturismo npm run cultura -- paginas --fotos --escribir                 # páginas fijas → 17 fichas en borrador
sudo -u portalturismo npm run cultura -- fotos-eventos --escribir                   # foto a los eventos que no tienen
# Después, lo del Ente Tucumán Turismo (docs/RELEVAMIENTO_ENTE_TURISMO.md): 46 fichas nuevas en borrador
sudo -u portalturismo npm run cultura -- paginas --archivo datos/turismo/ente-tucuman-turismo.json --fotos --escribir
```

### Verificación posterior

Lista completa en `docs/PLAN_MIGRACION.md` §8: páginas en es/en/pt, reserva y cancelación de
prueba, enlace `/reserva/<token>` viejo, QR `/fotos/<token>` viejo, solicitud educativa con adjunto,
ingreso con cuentas importadas, permisos por rol (en el servidor), bot de WhatsApp, auditoría.

### Vuelta atrás

- Portal: `ln -sfn /srv/portalturismo/versiones/LA_ANTERIOR /srv/portalturismo/actual` y `pm2 reload portalturismo`.
  La migración de roles es aditiva: la versión anterior funciona con la base migrada.
- Bus: `sudo -u turismo -H pm2 start <sitio-del-bus>` y restaurar el nginx anterior de `busturistico.smt.gob.ar`.
  Ambos usan la misma base y la misma función de reserva: no hay datos que reconciliar.
