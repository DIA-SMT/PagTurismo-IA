/**
 * Cuentas del panel en un servidor propio (sin Supabase Auth). Se corre en el servidor:
 *
 *   npm run cuentas -- listar
 *   npm run cuentas -- crear correo@smt.gob.ar "Nombre y apellido"   pide la contraseña
 *   npm run cuentas -- clave correo@smt.gob.ar                         cambia la contraseña
 *   npm run cuentas -- desactivar correo@smt.gob.ar                    deja de poder entrar
 *   npm run cuentas -- activar correo@smt.gob.ar
 *
 * La contraseña se escribe a mano (no se ve en pantalla) y se guarda con bcrypt, igual que
 * Supabase. Nunca va como argumento: quedaría en el historial y a la vista en `ps`.
 * Con Supabase las cuentas se manejan desde su panel: este script no corre.
 */

import postgres from "postgres";

import { opcionesScript } from "../lib/db/conexion.ts";

const [accion, correo, nombre] = process.argv.slice(2);
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Este portal usa Supabase: las cuentas se manejan desde el panel de Supabase.");
  process.exit(1);
}
if (!url) {
  console.error("Falta DATABASE_URL en el .env.");
  process.exit(1);
}

/** Lee una línea sin mostrarla en pantalla. */
function leerOculto(pregunta: string): Promise<string> {
  return new Promise((resolver) => {
    const entrada = process.stdin;
    process.stdout.write(pregunta);
    let texto = "";
    const interactivo = entrada.isTTY;
    if (interactivo) entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    const alLeer = (trozo: string) => {
      for (const c of trozo) {
        if (c === "\r" || c === "\n") {
          entrada.off("data", alLeer);
          if (interactivo) entrada.setRawMode(false);
          entrada.pause();
          process.stdout.write("\n");
          return resolver(texto);
        }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f" || c === "\b") texto = texto.slice(0, -1);
        else texto += c;
      }
    };
    entrada.on("data", alLeer);
  });
}

async function pedirContrasena(): Promise<string> {
  const una = await leerOculto("Contraseña nueva (mínimo 10 caracteres): ");
  if (una.length < 10) throw new Error("La contraseña tiene que tener al menos 10 caracteres.");
  const otra = await leerOculto("Repetila: ");
  if (una !== otra) throw new Error("Las contraseñas no coinciden.");
  return una;
}

const sql = postgres(url, opcionesScript(url));
const HASH = "extensions.crypt($1, extensions.gen_salt('bf', 10))";

try {
  if (accion === "listar") {
    const filas = await sql`
      select u.email, a.nombre, a.activo, a.creado_at
      from public.admins a join auth.users u on u.id = a.user_id order by u.email`;
    if (!filas.length) console.log("No hay cuentas del equipo.");
    for (const f of filas) console.log(`${f.activo ? "activa  " : "inactiva"}  ${f.email}  (${f.nombre})`);
  } else if (accion === "crear" && correo && nombre) {
    const clave = await pedirContrasena();
    await sql.begin(async (tx) => {
      const [u] = await tx.unsafe(
        `insert into auth.users (email, email_confirmed_at, encrypted_password) values (lower($2), now(), ${HASH}) returning id`,
        [clave, correo],
      );
      await tx`insert into public.admins (user_id, nombre) values (${u.id}, ${nombre})`;
    });
    console.log(`Cuenta creada: ${correo}. Ya puede entrar al panel.`);
  } else if (accion === "clave" && correo) {
    const clave = await pedirContrasena();
    const r = await sql.unsafe(`update auth.users set encrypted_password = ${HASH} where lower(email) = lower($2) returning id`, [clave, correo]);
    console.log(r.length ? `Contraseña cambiada para ${correo}.` : `No hay ninguna cuenta ${correo}.`);
    if (!r.length) process.exitCode = 1;
  } else if ((accion === "desactivar" || accion === "activar") && correo) {
    const r = await sql`
      update public.admins set activo = ${accion === "activar"}
      where user_id = (select id from auth.users where lower(email) = lower(${correo})) returning user_id`;
    console.log(r.length ? `Cuenta ${correo}: ${accion === "activar" ? "activada" : "desactivada"}.` : `No hay ninguna cuenta ${correo}.`);
    if (!r.length) process.exitCode = 1;
  } else {
    console.error('Uso: npm run cuentas -- listar | crear <correo> "<nombre>" | clave <correo> | desactivar <correo> | activar <correo>');
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
