import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 para las panorámicas del hero, que se ven a pantalla completa;
    // el resto usa el 75 por defecto.
    qualities: [75, 90],
  },
};

export default nextConfig;
