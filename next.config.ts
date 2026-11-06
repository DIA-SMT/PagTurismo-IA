import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  // PGlite (base local) carga un .wasm desde node_modules.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Sin Supabase (modo local, o una vista previa sin DATABASE_URL) la base se arma con las
  // migraciones y el contenido inicial: tienen que viajar con las funciones.
  outputFileTracingIncludes: {
    "/**": ["./supabase/migrations/*.sql", "./supabase/local/*.sql", "./supabase/semilla/**/*.json"],
  },
  experimental: {
    // Fotos que sube el equipo desde el panel. Vercel corta en 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // 90 para las panorámicas del hero, que se ven a pantalla completa;
    // el resto usa el 75 por defecto.
    qualities: [75, 90],
    // Fotos subidas desde el panel: en producción viven en Supabase Storage.
    remotePatterns: supabase
      ? [{ protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },

  async headers() {
    return [
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin/:ruta*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
