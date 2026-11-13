import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClimaActual } from "@/components/ClimaActual";
import { Encabezado } from "@/components/Encabezado";
import { ProveedorIdioma } from "@/components/i18n/Idioma";
import { PieDePagina } from "@/components/PieDePagina";
import { LOCALE, esIdioma } from "@/lib/i18n/config";
import { alternativas } from "@/lib/i18n/servidor";
import { textos, textosCliente } from "@/lib/i18n/textos";

export async function generateMetadata({ params }: LayoutProps<"/[idioma]">): Promise<Metadata> {
  const { idioma } = await params;
  if (!esIdioma(idioma)) return {};
  const t = textos(idioma).comun.sitio;
  return {
    title: { default: t.tituloInicio, template: t.plantillaTitulo },
    description: t.descripcion,
    alternates: await alternativas("/"),
    openGraph: {
      type: "website",
      locale: LOCALE[idioma].og,
      alternateLocale: Object.values(LOCALE).map((l) => l.og).filter((og) => og !== LOCALE[idioma].og),
      siteName: t.nombre,
      images: ["/fotos/panoramas/casa-historica.webp"],
    },
  };
}

/**
 * El sitio público en un idioma: encabezado, contenido y pie. Las direcciones públicas
 * (/en/things-to-do) llegan acá reescritas por el proxy (/en/que-hacer). El panel (/admin)
 * tiene su propio layout.
 */
export default async function LayoutSitio({ children, params }: LayoutProps<"/[idioma]">) {
  const { idioma } = await params;
  if (!esIdioma(idioma)) notFound();
  return (
    <ProveedorIdioma idioma={idioma} t={textosCliente(idioma)}>
      <Encabezado clima={<ClimaActual />} />
      <main id="contenido" lang={LOCALE[idioma].lang}>{children}</main>
      <PieDePagina />
    </ProveedorIdioma>
  );
}
