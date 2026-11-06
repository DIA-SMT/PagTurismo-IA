import "server-only";

import { conBase, consultar } from "@/lib/db";
import { ESQUEMAS } from "./esquemas";
import type { Contexto as ContextoLimpieza } from "./limpiar";
import { comoAdmin, type Admin } from "./sesion";

export type FilaPanel = {
  coleccion: string;
  slug: string;
  estado: "borrador" | "publicado";
  datos: Record<string, unknown>;
  actualizado_at: string;
  actualizado_por_nombre: string | null;
};

const SELECT = `
  select c.coleccion, c.slug, c.estado, c.datos, c.actualizado_at, a.nombre as actualizado_por_nombre
  from public.contenidos c
  left join public.admins a on a.user_id = c.actualizado_por`;

/** Todas las fichas, borradores incluidos (el equipo las ve por RLS). */
export function todasLasFichas(admin: Admin) {
  return consultar<FilaPanel>(comoAdmin(admin), `${SELECT} order by c.coleccion, c.slug`);
}

export function fichasDe(admin: Admin, coleccion: string) {
  return consultar<FilaPanel>(comoAdmin(admin), `${SELECT} where c.coleccion = $1 order by c.actualizado_at desc`, [coleccion]);
}

export async function fichaDe(admin: Admin, coleccion: string, slug: string) {
  const [f] = await consultar<FilaPanel>(comoAdmin(admin), `${SELECT} where c.coleccion = $1 and c.slug = $2`, [coleccion, slug]);
  return f ?? null;
}

/** Lo que el formulario necesita para revisar temas, etiquetas y relaciones. */
export function contextoDeLimpieza(filas: FilaPanel[]): ContextoLimpieza {
  const taxonomia = (filas.find((f) => f.coleccion === "configuracion" && f.slug === "categorias")?.datos ?? {}) as {
    categorias?: { id: string }[];
    etiquetas?: { id: string }[];
  };
  const fichas: Record<string, Set<string>> = {};
  for (const f of filas) (fichas[f.coleccion] ??= new Set()).add(f.slug);
  return {
    temas: new Set((taxonomia.categorias ?? []).map((c) => c.id)),
    etiquetas: new Set((taxonomia.etiquetas ?? []).map((e) => e.id)),
    fichas,
  };
}

/** Opciones para los selectores del formulario: fichas por colección y la taxonomía. */
export function opcionesDeFormulario(filas: FilaPanel[]) {
  const taxonomia = (filas.find((f) => f.coleccion === "configuracion" && f.slug === "categorias")?.datos ?? {}) as {
    categorias?: { id: string; titulo: string }[];
    etiquetas?: { id: string; titulo: string }[];
  };
  const fichas: Record<string, { slug: string; titulo: string; estado: string }[]> = {};
  for (const f of filas) {
    if (f.coleccion === "configuracion") continue;
    (fichas[f.coleccion] ??= []).push({ slug: f.slug, titulo: String(f.datos.titulo ?? f.slug), estado: f.estado });
  }
  for (const lista of Object.values(fichas)) lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  return {
    fichas,
    temas: (taxonomia.categorias ?? []).map((c) => ({ id: c.id, titulo: c.titulo })),
    etiquetas: (taxonomia.etiquetas ?? []).map((e) => ({ id: e.id, titulo: e.titulo })),
  };
}
export type OpcionesFormulario = ReturnType<typeof opcionesDeFormulario>;

/** Fichas que apuntan a otra. Antes de borrar una, hay que sacarla de estas. */
export function referenciasA(filas: FilaPanel[], coleccion: string, slug: string): FilaPanel[] {
  return filas.filter((f) => {
    const d = f.datos as Record<string, unknown>;
    if (coleccion === "lugares") {
      if (f.coleccion === "experiencias" && Array.isArray(d.lugares) && d.lugares.includes(slug)) return true;
      if (f.coleccion === "eventos" && d.lugar === slug) return true;
      if (f.coleccion === "recorridos" && Array.isArray(d.paradas) && d.paradas.some((p) => (p as { lugar?: string })?.lugar === slug)) return true;
    }
    if (coleccion === "experiencias" && f.coleccion === "recorridos" && d.experiencia === slug) return true;
    if (f.coleccion === "destacados") {
      const destino = (d.destino ?? {}) as { coleccion?: string; slug?: string };
      if (destino.coleccion === coleccion && destino.slug === slug) return true;
    }
    return false;
  });
}

export type Cambio = {
  id: number;
  ocurrido_at: string;
  accion: string;
  tabla: string | null;
  registro_id: string | null;
  actor_nombre: string | null;
  actor_tipo: string;
  antes: { estado?: string; datos?: Record<string, unknown> } | null;
  despues: { estado?: string; datos?: Record<string, unknown> } | null;
};

export function ultimosCambios(admin: Admin, { limite = 50, desde = 0, registro }: { limite?: number; desde?: number; registro?: string } = {}) {
  return conBase(comoAdmin(admin), (q) =>
    q<Cambio>(
      `select au.id::int as id, au.ocurrido_at, au.accion, au.tabla, au.registro_id, au.actor_tipo, au.antes, au.despues, ad.nombre as actor_nombre
       from public.auditoria au
       left join public.admins ad on ad.user_id = au.actor_id
       where ($3::text is null or au.registro_id = $3)
       order by au.id desc
       limit $1 offset $2`,
      [limite, desde, registro ?? null],
    ),
  );
}

/** Qué cambió entre dos versiones de una ficha (nombres de campos de primer nivel). */
export function camposCambiados(c: Cambio): string[] {
  const a = c.antes?.datos ?? {};
  const d = c.despues?.datos ?? {};
  const claves = new Set([...Object.keys(a), ...Object.keys(d)]);
  const cambiados = [...claves].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]));
  if (c.antes?.estado && c.despues?.estado && c.antes.estado !== c.despues.estado) cambiados.unshift("estado");
  return cambiados;
}

/** Cómo mostrar un cambio de la auditoría: título legible, sección y enlace a la ficha. */
export function describirCambio(c: Cambio): { titulo: string; seccion: string; href?: string } {
  if (c.tabla === "admins") {
    const nombre = (c.despues ?? c.antes) as { nombre?: string } | null;
    return { titulo: `Cuenta del equipo: ${nombre?.nombre ?? "sin nombre"}`, seccion: "Equipo" };
  }
  const [coleccion, slug] = (c.registro_id ?? "").split("/");
  const titulo = String(c.despues?.datos?.titulo ?? c.antes?.datos?.titulo ?? slug ?? "");
  if (coleccion === "configuracion") {
    return slug === "categorias"
      ? { titulo: "Temas y etiquetas", seccion: "Configuración", href: "/admin/temas" }
      : { titulo: "Datos del sitio", seccion: "Configuración", href: "/admin/configuracion" };
  }
  const esquema = ESQUEMAS.find((e) => e.id === coleccion);
  return {
    titulo,
    seccion: esquema?.titulo ?? coleccion,
    href: esquema && c.accion !== "delete" ? `/admin/${coleccion}/${slug}` : undefined,
  };
}

/** Cambia las referencias «coleccion/slug» de un aviso del validador por el título de la ficha. */
export function humanizar(mensaje: string, filas: FilaPanel[]): string {
  const titulos = new Map(filas.map((f) => [`${f.coleccion}/${f.slug}`, String(f.datos.titulo ?? f.slug)]));
  return mensaje.replace(/\b(lugares|experiencias|eventos|recorridos|planifica|destacados|sabores|escapadas)\/([a-z0-9-]+)/g,
    (m) => (titulos.has(m) ? `«${titulos.get(m)}»` : m));
}
