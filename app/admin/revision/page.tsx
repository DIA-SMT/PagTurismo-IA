import type { Metadata } from "next";
import Link from "next/link";

import { EncabezadoPagina, Marca } from "@/components/Ui";
import { MOSTRAR_BORRADORES, getTodo } from "@/lib/datos";
import { rutas } from "@/lib/rutas";
import { validarContenido } from "@/scripts/validar-contenido";

export const metadata: Metadata = {
  title: "Revisión de contenidos",
  robots: { index: false, follow: false },
};

// Las revisiones vencidas dependen de la fecha: se recalcula cada hora.
export const revalidate = 3600;

const RUTA: Record<string, ((s: string) => string) | undefined> = {
  lugares: rutas.lugar, experiencias: rutas.experiencia, eventos: rutas.evento,
  recorridos: rutas.recorrido, planifica: rutas.guia,
};

/**
 * Tablero para la Dirección de Turismo: qué está en borrador, qué
 * relaciones apuntan a fichas sin publicar y qué revisiones vencieron. Es el
 * mismo control que `npm run validar`. La edición se hace en /admin.
 */
export default function Revision() {
  const { errores, avisos, resumen } = validarContenido(process.cwd());
  const todo = getTodo();
  const borradores = Object.entries(todo).flatMap(([coleccion, lista]) =>
    lista.filter((f) => f.estado === "borrador").map((f) => ({ coleccion, slug: f.slug, titulo: f.titulo })));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Administración", url: "/admin" }, { texto: "Revisión" }]}
        kicker="Administración"
        titulo="Revisión de contenidos"
        bajada="Qué falta publicar o confirmar. Para editar, entrá a la administración."
      >
        <div className="marcas">
          <a className="boton boton--primario" href="/admin">Ir a la administración</a>
        </div>
      </EncabezadoPagina>

      <div className="contenedor bloque-interno revision">
        <section className="grupo" aria-labelledby="resumen">
          <h2 id="resumen">Resumen</h2>
          <table className="tabla">
            <thead><tr><th scope="col">Colección</th><th scope="col">Publicadas</th><th scope="col">Borradores</th></tr></thead>
            <tbody>
              {Object.entries(resumen).map(([c, r]) => (
                <tr key={c}><th scope="row">{c}</th><td>{r.publicadas}</td><td>{r.borradores}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grupo" aria-labelledby="errores">
          <h2 id="errores">Errores {errores.length ? <Marca tipo="alerta">{errores.length}</Marca> : <Marca tipo="exito">ninguno</Marca>}</h2>
          {errores.length > 0 && <ul className="lista-simple">{errores.map((e) => <li key={e}>{e}</li>)}</ul>}
        </section>

        <section className="grupo" aria-labelledby="avisos">
          <h2 id="avisos">Avisos {avisos.length > 0 && <Marca>{avisos.length}</Marca>}</h2>
          <ul className="lista-simple">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>

        <section className="grupo" aria-labelledby="borradores">
          <h2 id="borradores">Borradores ({borradores.length})</h2>
          <p className="texto-suave">
            {MOSTRAR_BORRADORES
              ? "En este entorno los borradores se pueden abrir para revisarlos en contexto."
              : "En el sitio público los borradores no se muestran. Revisalos en un despliegue de vista previa."}
          </p>
          <ul className="lista-simple">
            {borradores.map((b) => {
              const ruta = RUTA[b.coleccion];
              return (
                <li key={`${b.coleccion}/${b.slug}`}>
                  {MOSTRAR_BORRADORES && ruta ? <Link href={ruta(b.slug)}>{b.titulo}</Link> : b.titulo}
                  <span className="texto-suave"> · {b.coleccion}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
