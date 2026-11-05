import Link from "next/link";

import { Icono } from "@/components/Iconos";

export default function NoEncontrada() {
  return (
    <section className="contenedor pagina-vacia" aria-labelledby="no-encontrada">
      <p className="kicker">Error 404</p>
      <h1 id="no-encontrada">No encontramos esta página</h1>
      <p>Puede que la dirección esté mal escrita o que la propuesta ya no esté publicada.</p>
      <div className="vacio__acciones">
        <Link className="boton boton--primario" href="/que-hacer"><Icono nombre="buscar" tamano={18} /> Buscar qué hacer</Link>
        <Link className="boton boton--claro" href="/">Ir al inicio</Link>
      </div>
    </section>
  );
}
