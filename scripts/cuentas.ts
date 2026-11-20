/**
 * Cuentas del panel en un servidor propio (sin Supabase Auth). Se corre en el servidor:
 *
 *   npm run cuentas -- listar
 *   npm run cuentas -- crear correo@smt.gob.ar "Nombre y apellido" [rol] [módulos]   pide la contraseña
 *   npm run cuentas -- permisos correo@smt.gob.ar <rol> [módulos]
 *   npm run cuentas -- clave correo@smt.gob.ar                                       cambia la contraseña
 *   npm run cuentas -- desactivar correo@smt.gob.ar                                  deja de poder entrar
 *   npm run cuentas -- activar correo@smt.gob.ar
 *   npm run cuentas -- importar --desde bus|agenda [--rol admin] [--modulos buses,migue] [--escribir]
 *
 * Roles: superadmin, admin, editor, consulta. Módulos (separados por coma): turismo, cultura, buses,
 * migue. Sin rol, una cuenta nueva es editor; sin módulos no puede nada hasta que se le asignen.
 *
 * La contraseña se escribe a mano (no se ve en pantalla) y se guarda con bcrypt, igual que
 * Supabase. Nunca va como argumento: quedaría en el historial y a la vista en `ps`.
 *
 * importar: copia las cuentas del panel del Bus Turístico (admin_profiles de BUSES_DATABASE_URL,
 * bcrypt: conservan su contraseña) o de la Agenda Cultural (profiles de AGENDA_DATABASE_URL, scrypt:
 * el portal la valida y la pasa a bcrypt en el primer ingreso). Sin --escribir solo muestra qué haría.
 * Un correo que ya tiene cuenta en el portal no se toca.
 */

import postgres from "postgres";

import { opcionesScript } from "../lib/db/conexion.ts";
import { MODULOS, ROLES, esModulo, esRol, type Modulo, type Rol } from "../lib/permisos.ts";

const args = process.argv.slice(2);
const [accion, correo, nombre] = args;
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Este portal usa Supabase: las cuentas se manejan desde el panel de Supabase.");
  process.exit(1);
}
if (!url) {
  console.error("Falta DATABASE_URL en el .env.");
  process.exit(1);
}

const opcion = (nombre: string) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function leerRol(texto: string | undefined, porDefecto: Rol): Rol {
  if (!texto) return porDefecto;
  if (!esRol(texto)) throw new Error(`Rol desconocido «${texto}». Usá: ${ROLES.join(", ")}.`);
  return texto;
}

function leerModulos(texto: string | undefined): Modulo[] {
  if (!texto) return [];
  const lista = texto.split(",").map((m) => m.trim()).filter(Boolean);
  const malos = lista.filter((m) => !esModulo(m));
  if (malos.length) throw new Error(`Módulos desconocidos: ${malos.join(", ")}. Usá: ${MODULOS.join(", ")}.`);
  return [...new Set(lista)] as Modulo[];
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

type CuentaOrigen = { email: string; nombre: string; hash: string | null; activa: boolean; rol: Rol };

/** Cuentas del panel de otro sistema, con su hash de contraseña. */
async function cuentasDeOrigen(desde: string): Promise<CuentaOrigen[]> {
  const origen = desde === "bus" ? process.env.BUSES_DATABASE_URL : desde === "agenda" ? process.env.AGENDA_DATABASE_URL : undefined;
  if (desde !== "bus" && desde !== "agenda") throw new Error("Usá --desde bus o --desde agenda.");
  if (!origen) throw new Error(`Falta ${desde === "bus" ? "BUSES_DATABASE_URL" : "AGENDA_DATABASE_URL"} en el .env.`);
  const db = postgres(origen, opcionesScript(origen));
  try {
    if (desde === "bus") {
      const filas = await db`select lower(email) as email, password_hash from admin_profiles where email is not null order by email`;
      return filas.map((f) => ({
        email: String(f.email), nombre: String(f.email).split("@")[0], hash: f.password_hash ? String(f.password_hash) : null,
        activa: true, rol: "admin" as Rol,
      }));
    }
    const filas = await db`select lower(email) as email, full_name, role, status, password_hash from profiles order by email`;
    return filas.map((f) => ({
      email: String(f.email), nombre: String(f.full_name), hash: f.password_hash ? String(f.password_hash) : null,
      activa: f.status === "active", rol: (f.role === "admin" ? "admin" : "editor") as Rol,
    }));
  } finally {
    await db.end();
  }
}

const sql = postgres(url, opcionesScript(url));
const HASH = "extensions.crypt($1, extensions.gen_salt('bf', 10))";

try {
  if (accion === "listar") {
    const filas = await sql`
      select u.email, a.nombre, a.activo, a.rol, a.modulos
      from public.admins a join auth.users u on u.id = a.user_id order by u.email`;
    if (!filas.length) console.log("No hay cuentas del equipo.");
    for (const f of filas) {
      const modulos = f.rol === "superadmin" ? "todos" : (f.modulos as string[]).join(",") || "ninguno";
      console.log(`${f.activo ? "activa  " : "inactiva"}  ${f.rol.padEnd(10)}  ${modulos.padEnd(28)}  ${f.email}  (${f.nombre})`);
    }
  } else if (accion === "crear" && correo && nombre) {
    const rol = leerRol(args[3], "editor");
    const modulos = leerModulos(args[4]);
    const clave = await pedirContrasena();
    await sql.begin(async (tx) => {
      const [u] = await tx.unsafe(
        `insert into auth.users (email, email_confirmed_at, encrypted_password) values (lower($2), now(), ${HASH}) returning id`,
        [clave, correo],
      );
      await tx`insert into public.admins (user_id, nombre, rol, modulos) values (${u.id}, ${nombre}, ${rol}, ${modulos})`;
    });
    console.log(`Cuenta creada: ${correo} (${rol}${modulos.length ? `: ${modulos.join(", ")}` : ""}). Ya puede entrar al panel.`);
    if (rol !== "superadmin" && !modulos.length) console.log("Ojo: sin módulos no puede ver nada. Asignalos con `permisos`.");
  } else if (accion === "permisos" && correo && args[2]) {
    const rol = leerRol(args[2], "editor");
    const modulos = leerModulos(args[3]);
    const r = await sql`
      update public.admins set rol = ${rol}, modulos = ${modulos}
      where user_id = (select id from auth.users where lower(email) = lower(${correo})) returning user_id`;
    console.log(r.length ? `Permisos de ${correo}: ${rol}${modulos.length ? ` en ${modulos.join(", ")}` : ""}.` : `No hay ninguna cuenta ${correo}.`);
    if (!r.length) process.exitCode = 1;
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
  } else if (accion === "importar") {
    const desde = opcion("desde") ?? "";
    const escribir = args.includes("--escribir");
    const rolForzado = opcion("rol") ? leerRol(opcion("rol"), "editor") : undefined;
    const modulos = leerModulos(opcion("modulos") ?? (desde === "bus" ? "buses,migue" : desde === "agenda" ? "cultura" : ""));
    const cuentas = await cuentasDeOrigen(desde);
    const existentes = new Set((await sql`select lower(email) as email from auth.users`).map((f) => String(f.email)));

    let creadas = 0;
    for (const c of cuentas) {
      const rol = rolForzado ?? c.rol;
      const sinClave = !c.hash || !(c.hash.startsWith("$2") || c.hash.startsWith("scrypt$"));
      if (existentes.has(c.email)) {
        console.log(`  ya existe   ${c.email} (no se toca)`);
        continue;
      }
      console.log(`  ${escribir ? "crear      " : "crearía    "} ${c.email}  ${rol} en ${modulos.join(",") || "ningún módulo"}${c.activa ? "" : " (inactiva)"}${sinClave ? " — sin contraseña: usar `clave` después" : ""}`);
      if (!escribir) continue;
      await sql.begin(async (tx) => {
        const [u] = await tx`
          insert into auth.users (email, email_confirmed_at, encrypted_password)
          values (${c.email}, now(), ${sinClave ? null : c.hash}) returning id`;
        await tx`insert into public.admins (user_id, nombre, rol, modulos, activo) values (${u.id}, ${c.nombre}, ${rol}, ${modulos}, ${c.activa})`;
      });
      creadas++;
    }
    console.log(escribir ? `Listo: ${creadas} cuentas creadas.` : "Prueba en seco: no se escribió nada. Repetí con --escribir para crearlas.");
  } else {
    console.error(
      'Uso: npm run cuentas -- listar | crear <correo> "<nombre>" [rol] [módulos] | permisos <correo> <rol> [módulos] | clave <correo> | desactivar <correo> | activar <correo> | importar --desde bus|agenda [--rol R] [--modulos a,b] [--escribir]',
    );
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
