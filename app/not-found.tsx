import Link from "next/link";

import { ClimaActual } from "@/components/ClimaActual";
import { Encabezado } from "@/components/Encabezado";
import { Icono } from "@/components/Iconos";
import { PieDePagina } from "@/components/PieDePagina";

// Va fuera del grupo (sitio): arma su propio encabezado y pie.
export default function NoEncontrada() {
  return (
    <>
      <Encabezado clima={<ClimaActual />} />
      <main id="contenido">
        <section className="contenedor pagina-vacia" aria-labelledby="no-encontrada">
          <p className="kicker">Error 404</p>
          <h1 id="no-encontrada">No encontramos esta página</h1>
          <p>Puede que la dirección esté mal escrita o que la propuesta ya no esté publicada.</p>
          <div className="vacio__acciones">
            <Link className="boton boton--primario" href="/que-hacer"><Icono nombre="buscar" tamano={18} /> Buscar qué hacer</Link>
            <Link className="boton boton--claro" href="/">Ir al inicio</Link>
          </div>
        </section>
      </main>
      <PieDePagina />
    </>
  );
}
