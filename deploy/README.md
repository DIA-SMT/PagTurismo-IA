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
