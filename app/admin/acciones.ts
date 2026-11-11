"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mensajeDeErrorDb, type EstadoAccion } from "@/lib/admin/acciones";
import { contextoDeLimpieza, referenciasA, todasLasFichas } from "@/lib/admin/datos";
import { ESQUEMA_SITIO, ESQUEMA_TEMAS, esquemaDe } from "@/lib/admin/esquemas";
import { SLUG_VALIDO, limpiarFicha, slugDe } from "@/lib/admin/limpiar";
import { comoAdmin, requerirAdmin } from "@/lib/admin/sesion";
import { guardarFoto } from "@/lib/almacenamiento";
import { cerrarSesion } from "@/lib/auth";
import { conBase } from "@/lib/db";

export async function salirDelPanel() {
  await cerrarSesion();
  redirect("/admin/ingresar");
}

function leerDatos(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("datos") ?? "{}"));
  } catch {
    return null;
  }
}

/** Alta o cambio de una ficha. La base registra el cambio en la auditoría. */
export async function guardarFicha(_previo: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  const esquema = esquemaDe(String(form.get("coleccion") ?? ""));
  if (!esquema) return { error: "Colección desconocida." };

  const original = String(form.get("slugOriginal") ?? "");
  const estado = form.get("estado") === "publicado" ? "publicado" : "borrador";
  const crudo = leerDatos(form);
  if (!crudo) return { error: "No se pudieron leer los datos del formulario. Recargá la página." };

  const filas = await todasLasFichas(admin);
  const { datos, errores } = limpiarFicha(esquema, crudo, contextoDeLimpieza(filas));

  let slug = original;
  if (!original) {
    slug = String(form.get("slug") ?? "").trim() || slugDe(String(datos.titulo ?? ""));
    if (!SLUG_VALIDO.test(slug)) errores.slug = "La dirección solo puede tener minúsculas, números y guiones.";
    else if (filas.some((f) => f.coleccion === esquema.id && f.slug === slug)) errores.slug = "Ya hay una ficha con esa dirección.";
  }
  if (Object.keys(errores).length) {
    return { error: "Revisá los campos marcados.", errores };
  }

  try {
    await conBase(comoAdmin(admin), async (q) => {
      if (original) {
        const r = await q(
          "update public.contenidos set estado = $3, datos = $4::text::jsonb where coleccion = $1 and slug = $2 returning slug",
          [esquema.id, original, estado, JSON.stringify(datos)],
        );
        if (!r.length) throw Object.assign(new Error("sin permiso"), { code: "42501" });
      } else {
        await q("insert into public.contenidos (coleccion, slug, estado, datos) values ($1, $2, $3, $4::text::jsonb)", [
          esquema.id, slug, estado, JSON.stringify(datos),
        ]);
      }
    });
  } catch (e) {
    return { error: mensajeDeErrorDb(e) };
  }

  revalidatePath("/", "layout");
  if (!original) redirect(`/admin/${esquema.id}/${slug}?creada=1`);
  return { ok: true, mensaje: estado === "publicado" ? "Guardado y publicado." : "Guardado como borrador." };
}

/** Configuración del sitio o temas y etiquetas (una sola ficha cada una, siempre vigente). */
export async function guardarConfiguracion(_previo: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  const cual = String(form.get("slugOriginal") ?? "");
  const esquema = cual === "sitio" ? ESQUEMA_SITIO : cual === "categorias" ? ESQUEMA_TEMAS : null;
  if (!esquema) return { error: "Configuración desconocida." };
  const crudo = leerDatos(form);
  if (!crudo) return { error: "No se pudieron leer los datos del formulario. Recargá la página." };

  const filas = await todasLasFichas(admin);
  const { datos, errores } = limpiarFicha(esquema, crudo, contextoDeLimpieza(filas));

  if (cual === "categorias") {
    // Un tema o una etiqueta que todavía usa alguna ficha no se puede quitar.
    const quedan = {
      categorias: new Set(((datos.categorias ?? []) as { id: string }[]).map((c) => c.id)),
      etiquetas: new Set(((datos.etiquetas ?? []) as { id: string }[]).map((e) => e.id)),
    };
    // Solo cuentan las fichas: la propia configuración también tiene listas con esos nombres.
    const fichas = filas.filter((f) => f.coleccion !== "configuracion");
    for (const tipo of ["categorias", "etiquetas"] as const) {
      const faltan = new Map<string, string[]>();
      for (const f of fichas) {
        const ids = Array.isArray(f.datos[tipo]) ? (f.datos[tipo] as unknown[]).filter((x): x is string => typeof x === "string") : [];
        for (const id of ids) {
          if (!quedan[tipo].has(id)) faltan.set(id, [...(faltan.get(id) ?? []), String(f.datos.titulo ?? f.slug)]);
        }
      }
      if (faltan.size) {
        const detalle = [...faltan].map(([id, usan]) => `«${id}» (${usan.slice(0, 3).join(", ")}${usan.length > 3 ? ` y ${usan.length - 3} más` : ""})`).join("; ");
        errores[tipo] = `No se puede quitar porque todavía lo usan: ${detalle}. Sacalo de esas fichas primero.`;
      }
    }
  }
  if (Object.keys(errores).length) return { error: "Revisá los campos marcados.", errores };

  try {
    await conBase(comoAdmin(admin), (q) =>
      q(
        `insert into public.contenidos (coleccion, slug, estado, datos) values ('configuracion', $1, 'publicado', $2::text::jsonb)
         on conflict (coleccion, slug) do update set datos = excluded.datos`,
        [cual, JSON.stringify(datos)],
      ));
  } catch (e) {
    return { error: mensajeDeErrorDb(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Guardado. Ya se ve en el sitio." };
}

/** Borra una ficha si ninguna otra la usa. */
export async function borrarFicha(_previo: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  const esquema = esquemaDe(String(form.get("coleccion") ?? ""));
  const slug = String(form.get("slug") ?? "");
  if (!esquema || !slug) return { error: "Ficha desconocida." };
  if (form.get("confirmar") !== "si") return { error: "Marcá la casilla para confirmar que querés borrarla." };

  const filas = await todasLasFichas(admin);
  const refs = referenciasA(filas, esquema.id, slug);
  if (refs.length) {
    const lista = refs.map((r) => `${String(r.datos.titulo ?? r.slug)} (${r.coleccion})`).join(", ");
    return { error: `No se puede borrar: la usan ${lista}. Sacala de esas fichas primero, o dejala en borrador.` };
  }
  try {
    await conBase(comoAdmin(admin), (q) => q("delete from public.contenidos where coleccion = $1 and slug = $2", [esquema.id, slug]));
  } catch (e) {
    return { error: mensajeDeErrorDb(e) };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${esquema.id}?borrada=1`);
}

/** Sube una foto y devuelve su dirección pública para guardarla en la ficha. */
export async function subirFoto(form: FormData): Promise<{ src?: string; error?: string }> {
  await requerirAdmin();
  const archivo = form.get("archivo");
  const coleccion = String(form.get("coleccion") ?? "general");
  if (!(archivo instanceof File) || !archivo.size) return { error: "Elegí una foto." };
  try {
    const { src } = await guardarFoto(archivo, /^[a-z0-9-]+$/.test(coleccion) ? coleccion : "general");
    return { src };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
}
