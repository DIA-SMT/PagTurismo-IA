/**
 * URL pública del sitio, para el sitemap, robots y Open Graph.
 * Usa SITIO_URL si está definida; en Vercel, el dominio de producción del proyecto.
 */
export function urlDelSitio(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.SITIO_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
