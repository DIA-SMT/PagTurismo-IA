"use client";

import { useTextos, Vinculo as Link } from "@/components/i18n/Idioma";

export default function ErrorDePagina({ reset }: { error: Error; reset: () => void }) {
  const t = useTextos().comun.errores;
  return (
    <section className="contenedor pagina-vacia" aria-labelledby="error-titulo">
      <p className="kicker">{t.algoSalioMal}</p>
      <h1 id="error-titulo">{t.noPudimos}</h1>
      <p>{t.noPudimosTexto}</p>
      <div className="vacio__acciones">
        <button type="button" className="boton boton--primario" onClick={reset}>{t.reintentar}</button>
        <Link className="boton boton--claro" href="/">{t.irAlInicio}</Link>
      </div>
    </section>
  );
}
