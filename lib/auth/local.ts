import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { consultar } from "@/lib/db";
import { esHashScrypt, verificarScrypt } from "./scrypt";
import type { ResultadoAuth, Usuario } from "./tipos";

// Ingreso al panel sin Supabase: en el modo local (PGlite) y en un servidor propio (PostgreSQL de
// la VPS). La contraseña se compara contra auth.users con bcrypt (pgcrypto), el mismo formato en
// que Supabase guarda las suyas, así una cuenta migrada desde Supabase conserva su contraseña. La
// sesión es una cookie firmada con HMAC. Las cuentas se manejan con `npm run cuentas`.

const COOKIE = "turismo_sesion_local";
const DURACION_S = 60 * 60 * 24 * 30;
const servicio = { rol: "servicio" } as const;

// En una vista previa de Vercel sin Supabase el disco es de solo lectura: el secreto vive en
// memoria y las sesiones duran lo que dure la instancia.
const secretoEnMemoria = crypto.randomBytes(32).toString("hex");

function secreto() {
  // En un servidor propio es obligatorio (lo exige lib/entorno.ts): sobrevive a los despliegues.
  if (process.env.SESION_SECRETO) return process.env.SESION_SECRETO;
  if (process.env.SESION_LOCAL_SECRETO) return process.env.SESION_LOCAL_SECRETO;
  if (process.env.VERCEL) return secretoEnMemoria;
  const archivo = path.join(process.cwd(), ".local", "secreto");
  if (!fs.existsSync(archivo)) {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, crypto.randomBytes(32).toString("hex"));
  }
  return fs.readFileSync(archivo, "utf8");
}

function firmar(valor: string) {
  return crypto.createHmac("sha256", secreto()).update(valor).digest("base64url");
}

async function abrirSesion(uid: string) {
  const vence = Math.floor(Date.now() / 1000) + DURACION_S;
  const valor = `${uid}.${vence}`;
  (await cookies()).set(COOKIE, `${valor}.${firmar(valor)}`, {
    httpOnly: true,
    sameSite: "lax",
    // En producción el sitio va por HTTPS: la cookie de sesión no viaja nunca sin cifrar.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_S,
  });
}

export async function usuarioActual(): Promise<Usuario | null> {
  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!cookie) return null;
  const [uid, vence, firma] = cookie.split(".");
  const valor = `${uid}.${vence}`;
  const esperada = firmar(valor);
  if (
    !firma ||
    firma.length !== esperada.length ||
    !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada)) ||
    Number(vence) * 1000 < Date.now()
  ) {
    return null;
  }
  const filas = await consultar<{ id: string; email: string }>(
    servicio,
    "select id, email from auth.users where id = $1",
    [uid],
  );
  return filas[0] ?? null;
}

export async function ingresarConContrasena(email: string, contrasena: string): Promise<ResultadoAuth> {
  // Cuentas importadas de Agenda Cultural: hash scrypt, que pgcrypto no conoce. Se verifica acá y,
  // si es correcta, se reemplaza por bcrypt (después de esto la cuenta es una más).
  const [importada] = await consultar<{ id: string; encrypted_password: string }>(
    servicio,
    "select id, encrypted_password from auth.users where lower(email) = lower($1) and encrypted_password like 'scrypt$%'",
    [email],
  );
  if (importada && esHashScrypt(importada.encrypted_password)) {
    if (!verificarScrypt(contrasena, importada.encrypted_password)) return { ok: false, error: "credenciales_invalidas" };
    await consultar(servicio, "update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 10)) where id = $1", [
      importada.id, contrasena,
    ]);
    await abrirSesion(importada.id);
    return { ok: true, uid: importada.id };
  }

  const [usuario] = await consultar<{ id: string }>(
    servicio,
    `select id from auth.users
     where lower(email) = lower($1) and encrypted_password is not null
       -- CASE fija el orden: crypt() con un hash que no es bcrypt (scrypt importado) da error.
       and case when encrypted_password like 'scrypt$%' then false
                else encrypted_password = extensions.crypt($2, encrypted_password) end`,
    [email, contrasena],
  );
  if (!usuario) return { ok: false, error: "credenciales_invalidas" };
  await abrirSesion(usuario.id);
  return { ok: true, uid: usuario.id };
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}
