/**
 * Resultado común de los Server Actions del panel, para usar con useActionState.
 *  - ok + mensaje: aviso de éxito.
 *  - error: aviso general de error.
 *  - errores: mensajes por campo (clave = ruta del campo, por ejemplo "titulo" o "paradas.2.nombre").
 */
export type EstadoAccion = {
  ok?: boolean;
  mensaje?: string;
  error?: string;
  errores?: Record<string, string>;
  /** Para devolver los valores cargados cuando hay errores. */
  valores?: Record<string, string>;
  /** Tras crear una ficha, adónde ir. */
  destino?: string;
};

export const estadoInicial: EstadoAccion = {};

/** Traduce errores de Postgres frecuentes a mensajes para el equipo. */
export function mensajeDeErrorDb(error: unknown): string {
  const e = error as { code?: string; message?: string };
  switch (e.code) {
    case "23505":
      return "Ya existe una ficha con esa dirección. Cambiá la dirección (slug).";
    case "23514":
      return "Hay un dato fuera de los valores permitidos (por ejemplo, la dirección tiene mayúsculas o espacios).";
    case "42501":
      return "Tu usuario no tiene permiso para hacer este cambio.";
    default:
      console.error("Panel:", e.message ?? error);
      return "No se pudo guardar. Probá de nuevo.";
  }
}
