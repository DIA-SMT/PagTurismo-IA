import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 para las panorámicas del hero, que se ven a pantalla completa;
    // el resto usa el 75 por defecto.
    qualities: [75, 90],
  },

  // El contenido se lee del disco (contenido/*.json) también al regenerar
  // páginas en el servidor, así que tiene que viajar con cada función.
  outputFileTracingIncludes: {
    "/**": ["./contenido/**/*.json"],
  },

  async rewrites() {
    // El panel de Decap es un HTML estático en public/admin.
    return [{ source: "/admin", destination: "/admin/index.html" }];
  },

  async headers() {
    return [
      // Decap descarta la configuración si no llega como YAML.
      { source: "/admin/config.yml", headers: [{ key: "Content-Type", value: "text/yaml; charset=utf-8" }] },
      { source: "/admin/:ruta*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
