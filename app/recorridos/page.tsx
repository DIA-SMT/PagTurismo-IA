import type { Metadata } from "next";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Enlace, TarjetaItem } from "@/components/Ui";
import { getCatalogo, getExperiencias, getRecorridos } from "@/lib/datos";
import { BUS_TURISTICO } from "@/lib/contenido";

export const metadata: Metadata = {
  title: "Recorridos",
  description: "Circuitos del Bus Turístico, recorridos a pie e itinerarios según el tiempo que tengas para conocer San Miguel de Tucumán.",
  alternates: { canonical: "/recorridos" },
};

export default function Recorridos() {
  const catalogo = getCatalogo();
  const item = (entidad: string, slug: string) => catalogo.find((i) => i.entidad === entidad && i.slug === slug)!;
  const recorridos = getRecorridos();
  const bus = recorridos.filter((r) => r.modalidad === "bus");
  const itinerarios = recorridos.filter((r) => r.tipo === "itinerario");
  const otros = recorridos.filter((r) => r.modalidad !== "bus" && r.tipo !== "itinerario");
  const experiencias = getExperiencias().filter((e) => e.modalidad !== "bus");

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Recorridos" }]}
        kicker="Recorridos"
        titulo="Recorré la ciudad"
        bajada="Con guía en el Bus Turístico, a pie por el casco histórico o por tu cuenta, según el tiempo que tengas."
      />

      <div className="contenedor bloque-interno">
        {bus.length > 0 && (
          <section className="grupo" aria-labelledby="bus">
            <div className="grupo__cabecera">
              <div>
                <h2 id="bus">Bus Turístico, con guía</h2>
                <p className="texto-suave">Circuitos guiados y gratuitos de unas dos horas. Las salidas y la reserva se gestionan en el sitio del Bus Turístico.</p>
              </div>
              <Enlace href={BUS_TURISTICO} className="boton boton--amarillo">
                <Icono nombre="bus-linea" tamano={18} /> Ver salidas y reservar en Bus Turístico <Icono nombre="externo" tamano={16} />
              </Enlace>
            </div>
            <ul className="items">{bus.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        {itinerarios.length > 0 && (
          <section className="grupo" aria-labelledby="tiempo">
            <h2 id="tiempo">¿Cuánto tiempo tenés?</h2>
            <p className="texto-suave">Itinerarios sugeridos para recorrer por tu cuenta. Confirmá los horarios de apertura antes de salir.</p>
            <ul className="items">{itinerarios.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        {(otros.length > 0 || experiencias.length > 0) && (
          <section className="grupo" aria-labelledby="pie">
            <h2 id="pie">A pie y por tu cuenta</h2>
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
