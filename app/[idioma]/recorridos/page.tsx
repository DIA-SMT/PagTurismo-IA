import type { Metadata } from "next";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Enlace, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";
import { BUS_TURISTICO } from "@/lib/contenido";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await textosActuales();
  return {
    title: t.comun.nav.recorridos,
    description: t.recorridos.recorridos.metaDescripcion,
    alternates: await alternativas("/recorridos"),
  };
}

export default async function Recorridos() {
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const tr = t.recorridos.recorridos;
  const todos = catalogo(c);
  const item = (entidad: string, slug: string) => todos.find((i) => i.entidad === entidad && i.slug === slug)!;
  const recorridos = c.recorridos;
  const bus = recorridos.filter((r) => r.modalidad === "bus");
  const itinerarios = recorridos.filter((r) => r.tipo === "itinerario");
  const otros = recorridos.filter((r) => r.modalidad !== "bus" && r.tipo !== "itinerario");
  const experiencias = c.experiencias.filter((e) => e.modalidad !== "bus");

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.comun.nav.recorridos }]}
        kicker={t.comun.nav.recorridos}
        titulo={tr.titulo}
        bajada={tr.bajada}
      />

      <div className="contenedor bloque-interno">
        {bus.length > 0 && (
          <section className="grupo" aria-labelledby="bus">
            <div className="grupo__cabecera">
              <div>
                <h2 id="bus">{tr.busTitulo}</h2>
                <p className="texto-suave">{tr.busTexto}</p>
              </div>
              <Enlace href={BUS_TURISTICO} className="boton boton--amarillo">
                <Icono nombre="bus-linea" tamano={18} /> {tr.busBoton} <Icono nombre="externo" tamano={16} />
              </Enlace>
            </div>
            <ul className="items">{bus.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        {itinerarios.length > 0 && (
          <section className="grupo" aria-labelledby="tiempo">
            <h2 id="tiempo">{tr.tiempoTitulo}</h2>
            <p className="texto-suave">{tr.tiempoTexto}</p>
            <ul className="items">{itinerarios.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        {(otros.length > 0 || experiencias.length > 0) && (
          <section className="grupo" aria-labelledby="pie">
            <h2 id="pie">{tr.pieTitulo}</h2>
            <ul className="items">
              {otros.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}
              {experiencias.map((e) => <li key={e.slug}><TarjetaItem item={item("experiencia", e.slug)} /></li>)}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
