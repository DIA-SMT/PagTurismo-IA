import { ClimaActual } from "@/components/ClimaActual";
import { Encabezado } from "@/components/Encabezado";
import { PieDePagina } from "@/components/PieDePagina";

/** El sitio público: encabezado, contenido y pie. El panel (/admin) tiene su propio layout. */
export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Encabezado clima={<ClimaActual />} />
      <main id="contenido">{children}</main>
      <PieDePagina />
    </>
  );
}
