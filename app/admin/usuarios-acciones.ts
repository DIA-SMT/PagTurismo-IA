"use server";

import { revalidatePath } from "next/cache";

import { mensajeDeErrorDb, type EstadoAccion } from "@/lib/admin/acciones";
import { comoAdmin, requerirAdmin } from "@/lib/admin/sesion";
import { conBase } from "@/lib/db";
import { esModulo, esRol, esSuperadmin, type Modulo } from "@/lib/permisos";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function leerPermisos(form: FormData) {
  const rol = String(form.get("rol") ?? "");
  const modulos = form.getAll("modulos").map(String).filter(esModulo) as Modulo[];
  return { rol: esRol(rol) ? rol : null, modulos: [...new Set(modulos)] };
}

/** Alta de una cuenta del equipo. Solo un superadmin (la política de la base lo vuelve a exigir). */
export async function crearCuenta(_previo: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  if (!esSuperadmin(admin)) return { error: "Solo un superadministrador crea cuentas." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const nombre = String(form.get("nombre") ?? "").trim();
  const clave = String(form.get("clave") ?? "");
  const { rol, modulos } = leerPermisos(form);
  const errores: Record<string, string> = {};
  if (!CORREO.test(email)) errores.email = "Escribí un correo válido.";
  if (nombre.length < 2 || nombre.length > 80) errores.nombre = "Escribí el nombre (2 a 80 caracteres).";
  if (clave.length < 10) errores.clave = "La contraseña inicial tiene que tener al menos 10 caracteres.";
  if (!rol) errores.rol = "Elegí un rol.";
  if (rol && rol !== "superadmin" && !modulos.length) errores.modulos = "Elegí al menos un módulo.";
  if (Object.keys(errores).length) return { error: "Revisá los campos marcados.", errores, valores: { email, nombre } };

  try {
    // El usuario de ingreso lo crea el servidor; la fila del equipo pasa por RLS como superadmin.
    const uid = await conBase({ rol: "servicio" }, async (q) => {
      const existe = await q("select 1 from auth.users where lower(email) = $1", [email]);
      if (existe.length) throw Object.assign(new Error("existe"), { code: "23505" });
      const [u] = await q<{ id: string }>(
        "insert into auth.users (email, email_confirmed_at, encrypted_password) values ($1, now(), extensions.crypt($2, extensions.gen_salt('bf', 10))) returning id",
        [email, clave],
      );
      return u.id;
    });
    try {
      await conBase(comoAdmin(admin), (q) =>
        q("insert into public.admins (user_id, nombre, rol, modulos) values ($1, $2, $3, $4)", [uid, nombre, rol, rol === "superadmin" ? [] : modulos]));
    } catch (e) {
      // Sin fila del equipo, el usuario de ingreso no sirve: se quita para no dejarlo suelto.
      await conBase({ rol: "servicio" }, (q) => q("delete from auth.users where id = $1", [uid]));
      throw e;
    }
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { error: "Ya hay una cuenta con ese correo.", errores: { email: "Ya existe." }, valores: { email, nombre } };
    return { error: mensajeDeErrorDb(e), valores: { email, nombre } };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: `Cuenta creada: ${email}. Pasale la contraseña inicial por un canal seguro.` };
}

/** Cambia rol, módulos o si la cuenta está activa. */
export async function cambiarPermisos(_previo: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  if (!esSuperadmin(admin)) return { error: "Solo un superadministrador cambia permisos." };
  const uid = String(form.get("uid") ?? "");
  const { rol, modulos } = leerPermisos(form);
  const activo = form.get("activo") === "si";
  if (!rol) return { error: "Elegí un rol." };
  if (rol !== "superadmin" && !modulos.length && activo) return { error: "Elegí al menos un módulo, o desactivá la cuenta." };
  try {
    const r = await conBase(comoAdmin(admin), (q) =>
      q("update public.admins set rol = $2, modulos = $3, activo = $4 where user_id = $1 returning 1", [uid, rol, rol === "superadmin" ? [] : modulos, activo]));
    if (!r.length) return { error: "No se encontró la cuenta." };
  } catch (e) {
    const m = (e as { message?: string }).message ?? "";
    if (/superadministrador/.test(m)) return { error: "No podés quitarte el rol de superadministrador ni desactivar tu propia cuenta." };
    return { error: mensajeDeErrorDb(e) };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: "Permisos guardados. Rigen desde el próximo pedido de esa persona." };
}
