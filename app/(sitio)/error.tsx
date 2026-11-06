"use client";

import Link from "next/link";

export default function ErrorDePagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="contenedor pagina-vacia" aria-labelledby="error-titulo">
      <p className="kicker">Algo salió mal</p>
      <h1 id="error-titulo">No pudimos mostrar esta página</h1>
      <p>Probá de nuevo en unos segundos. Si el problema sigue, escribinos a turismo@smt.gob.ar.</p>
      <div className="vacio__acciones">
        <button type="button" className="boton boton--primario" onClick={reset}>Reintentar</button>
        <Link className="boton boton--claro" href="/">Ir al inicio</Link>
      </div>
    </section>
  );
}
