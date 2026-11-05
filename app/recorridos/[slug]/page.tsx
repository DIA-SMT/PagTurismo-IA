import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonAccion, Dato } from "@/components/Ficha";
import { AvisoBorrador, Aviso, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos } from "@/components/Ui";
import { getExperiencia, getRecorrido, getRecorridos, lugaresPorSlug } from "@/lib/datos";
import { MAPA } from "@/lib/contenido";
import type { Parada } from "@/lib/tipos";

export const dynamicParams = false;

export function generateStaticParams() {
  return getRecorridos().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/recorridos/[slug]">): Promise<Metadata> {
  const r = getRecorrido((await params).slug);
  if (!r) return {};
  return {
    title: r.titulo,
    description: r.resumen,
    alternates: { canonical: `/recorridos/${r.slug}` },
    openGraph: { title: r.titulo, description: r.resumen, ...(r.imagen ? { images: [r.imagen.src] } : {}) },
    robots: r.estado === "borrador" ? { index: false } : undefined,
  };
}

const MODALIDAD = { bus: "En bus", "a-pie": "A pie", mixto: "A pie y en transporte" } as const;

export default async function FichaRecorrido({ params }: PageProps<"/recorridos/[slug]">) {
  const r = getRecorrido((await params).slug);
  if (!r) notFound();

  const lugares = lugaresPorSlug();
  const experiencia = r.experiencia ? getExperiencia(r.experiencia) : undefined;
  const accion = experiencia?.accion.url ? experiencia.accion : undefined;

  // Itinerarios de varios días: las paradas se agrupan por día.
  const dias = [...new Set(r.paradas.map((p) => p.dia ?? 0))].sort((a, b) => a - b);
  const porDia = dias.map((d) => ({ dia: d, paradas: r.paradas.filter((p) => (p.dia ?? 0) === d) }));
  let numero = 0;

  const listaParadas = (paradas: Parada[]) => (
    <ol className="paradas">
      {paradas.map((p) => {
        numero += 1;
        const lugar = p.lugar ? lugares.get(p.lugar) : undefined;
        return (
          <li key={`${numero}-${p.nombre}`} className="parada">
            <span className="parada__numero" aria-hidden="true">{numero}</span>
            <div>
              {lugar ? <Link href={`/lugares/${lugar.slug}`}>{p.nombre}</Link> : <span>{p.nombre}</span>}
              {lugar?.resumen && <p>{lugar.resumen}</p>}
              {p.nota && <p className="parada__nota">{p.nota}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Recorridos", url: "/recorridos" }, { texto: r.titulo }]}
        kicker={r.tipo === "itinerario" ? `Itinerario · ${r.duracion ?? ""}` : `Circuito ${MODALIDAD[r.modalidad].toLowerCase()}`}
        titulo={r.titulo}
        bajada={r.resumen}
      >
        <div className="marcas">
          {r.guiado && <Marca>Con guía</Marca>}
          {r.etiquetas.includes("gratis") && <Marca tipo="exito">Gratis</Marca>}
          {r.etiquetas.includes("requiere-reserva") && <Marca>Requiere reserva</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          {r.estado === "borrador" && <AvisoBorrador />}
          {r.aviso && <Aviso>{r.aviso}</Aviso>}
          <FotoFicha imagen={r.imagen} />
          <Parrafos texto={r.descripcion} className="prosa" />

          <section aria-labelledby="paradas">
            <h2 id="paradas">Paradas, en orden</h2>
            <p className="texto-suave">
              La secuencia es orientativa. Las paradas con enlace tienen su ficha con datos para la visita.
            </p>
            {porDia.length > 1 || porDia[0]?.dia ? (
              porDia.map((g) => (
                <div key={g.dia} className="paradas__dia">
                  <h3>Día {g.dia || "sin asignar"}</h3>
                  {listaParadas(g.paradas)}
                </div>
              ))
            ) : (
              listaParadas(r.paradas)
            )}
          </section>

          {r.condiciones && (
            <section aria-labelledby="condiciones">
              <h2 id="condiciones">Condiciones</h2>
              <Parrafos texto={r.condiciones} className="prosa" />
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">Información práctica</h2>
            <dl>
              <Dato icono={r.modalidad === "bus" ? "bus-linea" : "caminata"} titulo="Modalidad">{MODALIDAD[r.modalidad]}{r.guiado ? ", con guía" : ", por tu cuenta"}</Dato>
              {r.duracion && <Dato icono="reloj" titulo="Duración">{r.duracion}</Dato>}
              {r.distancia && <Dato icono="mapa" titulo="Distancia">{r.distancia}</Dato>}
              {r.esfuerzo && <Dato icono="info" titulo="Esfuerzo">{r.esfuerzo}</Dato>}
              {r.inicio && <Dato icono="ubicacion" titulo="Empieza en">{r.inicio}</Dato>}
              {r.fin && <Dato icono="ubicacion" titulo="Termina en">{r.fin}</Dato>}
              <Dato icono="brujula" titulo="Paradas">{r.paradas.length}</Dato>
            </dl>
            <div className="panel-practico__acciones">
              {accion && <BotonAccion url={accion.url!} texto={accion.texto} />}
              {experiencia && <BotonAccion url={`/experiencias/${experiencia.slug}`} texto="Ver condiciones de la visita" primario={!accion} />}
              <BotonAccion url={MAPA} texto="Mapa interactivo de la ciudad" primario={false} />
            </div>
          </div>
        </aside>
      </div>

      <div className="contenedor relacionados">
        <Fuentes fuentes={r.fuentes} validacion={r.validacion} />
      </div>
    </>
  );
}
