import type { Metadata, Viewport } from "next";
import "./globals.css";

import { SpriteIconos } from "@/components/Iconos";

export const metadata: Metadata = {
  // La URL pública con la que se arman las de Open Graph. Se define al
  // desplegar; ver README.
  metadataBase: new URL(process.env.SITIO_URL ?? "http://localhost:3000"),
  title: {
    default: "Turismo | Ciudad San Miguel de Tucumán",
    template: "%s | Turismo San Miguel de Tucumán",
  },
  description:
    "Sitio oficial de turismo de San Miguel de Tucumán: qué hacer, recorridos guiados gratuitos, agenda, gastronomía, escapadas y datos útiles para tu visita a la ciudad donde se declaró la Independencia.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Turismo — Ciudad San Miguel de Tucumán",
    images: ["/fotos/panoramas/casa-historica.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2438" },
  ],
};

/**
 * Aplica el tema elegido ANTES de que el navegador pinte, igual que en
 * smt.gob.ar: sin esto, quien eligió oscuro ve un destello claro al entrar.
 * Si no hay nada elegido no estampa nada y manda prefers-color-scheme.
 */
const TEMA_SIN_DESTELLO = `
try {
  var t = localStorage.getItem("tema");
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

// suppressHydrationWarning sólo en <html>: el script de arriba estampa
// data-theme antes de que React hidrate, así que ese atributo nunca coincide
// con el del HTML servido.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SIN_DESTELLO }} />
      </head>
      <body>
        <a className="saltar-contenido" href="#contenido">Saltar al contenido principal</a>
        <SpriteIconos />
        {children}
      </body>
    </html>
  );
}
