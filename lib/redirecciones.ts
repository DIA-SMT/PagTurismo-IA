/**
 * Redirecciones permanentes desde las rutas de los sitios que se integraron al portal
 * (docs/ARQUITECTURA_UNIFICADA.md §3). Las usa next.config.ts; las pruebas las revisan.
 * Sin dependencias.
 */

import { ALIAS_LUGARES } from "./cultura/importar.ts";

export type Redireccion = { source: string; destination: string; permanent: true };

const r = (source: string, destination: string): Redireccion => ({ source, destination, permanent: true });

/** Rutas propias del portal: un espacio de la Agenda con ese slug no puede redirigir desde la raíz. */
const RESERVADAS = new Set([
  "agenda", "lugares", "que-hacer", "recorridos", "experiencias", "planifica", "descubri", "sabores", "escapadas",
  "bus-turistico", "bus-educativo", "galeria", "reserva", "admin", "api", "en", "pt", "es",
]);

export function redireccionesHeredadas(espaciosAgenda: string[] = []): Redireccion[] {
  return [
    // Agenda Cultural
    r("/eventos/:slug", "/agenda/:slug"),
    r("/events/:slug", "/agenda/:slug"),
    r("/www.agendaculturalsmt.com/events/:slug", "/agenda/:slug"),
    r("/espacios-culturales", "/lugares?tipo=cultural"),
    r("/espacios-al-aire-libre", "/lugares?tipo=aire-libre"),
    r("/plazas-y-parques", "/lugares?tipo=aire-libre"),
    r("/plazas", "/lugares?tipo=aire-libre"),
    r("/parques", "/lugares?tipo=aire-libre"),
    r("/planifica-tu-viaje", "/planifica"),
    r("/donde-y-que-comer", "/sabores"),
    r("/gastronomia", "/sabores"),
    // Los espacios del sitio viejo colgaban de la raíz (/casa-historica): a su ficha en el portal.
    ...espaciosAgenda
      .filter((slug) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !RESERVADAS.has(slug))
      .map((slug) => r(`/${slug}`, `/lugares/${ALIAS_LUGARES[slug] ?? slug}`)),
    // Bus Turístico (busturistico.smt.gob.ar): mismo token en reservas y fotos.
    r("/turistico", "/bus-turistico"),
    r("/educativo", "/bus-educativo"),
    r("/login", "/admin/ingresar"),
    r("/update-password", "/admin/ingresar"),
    r("/faqs", "/admin/migue"),
    r("/interactions", "/admin/migue/interacciones"),
    // QR impresos de los books de fotos: /fotos/<token de 48 hex>. Las fotos estáticas del portal
    // (/fotos/panoramas/x.webp) no coinciden con el patrón.
    r("/fotos/:token([0-9a-f]{48})", "/galeria/:token"),
  ];
}
