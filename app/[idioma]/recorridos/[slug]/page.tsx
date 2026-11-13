import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato } from "@/components/Ficha";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { AvisoBorrador, Aviso, AvisoSinTraducir, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos } from "@/components/Ui";
import { contenido, porSlug, lugaresPorSlug } from "@/lib/datos";
import { MAPA } from "@/lib/contenido";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import type { Parada } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/[idioma]/recorridos/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const r = porSlug(c.recorridos, (await params).slug);
  if (!r) return {};
  return {
    title: r.titulo,
    description: r.resumen,
    alternates: await alternativas(`/recorridos/${r.slug}`),
    openGraph: { title: r.titulo, description: r.resumen, ...(r.imagen ? { images: [r.imagen.src] } : {}) },
    robots: r.estado === "borrador" ? { index: false } : undefined,
  };
}

export default async function FichaRecorrido({ params }: PageProps<"/[idioma]/recorridos/[slug]">) {
  const { slug } = await params;
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const tr = t.recorridos.recorrido;
  const r = porSlug(c.recorridos, slug);
  if (!r) notFound();
  const modalidad = tr.modalidad[r.modalidad];

  const lugares = lugaresPorSlug(c);
  const experiencia = r.experiencia ? porSlug(c.experiencias, r.experiencia) : undefined;
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
        migas={[{ texto: t.comun.nav.recorridos, url: "/recorridos" }, { texto: r.titulo }]}
        kicker={r.tipo === "itinerario" ? formatear(tr.itinerario, { duracion: r.duracion ?? "" }) : tr.circuito[r.modalidad]}
        titulo={r.titulo}
        bajada={r.resumen}
      >
        <div className="marcas">
          {r.guiado && <Marca>{tr.conGuia}</Marca>}
          {r.etiquetas.includes("gratis") && <Marca tipo="exito">{t.comun.ui.gratis}</Marca>}
          {r.etiquetas.includes("requiere-reserva") && <Marca>{tr.requiereReserva}</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          <AvisoSinTraducir sinTraducir={c.sinTraducir.has(`recorridos/${slug}`)} />
          {r.estado === "borrador" && <AvisoBorrador />}
          {r.aviso && <Aviso>{r.aviso}</Aviso>}
          <FotoFicha imagen={r.imagen} />
          <Parrafos texto={r.descripcion} className="prosa" />

          <section aria-labelledby="paradas">
            <h2 id="paradas">{tr.paradasTitulo}</h2>
            <p className="texto-suave">{tr.paradasTexto}</p>
            {porDia.length > 1 || porDia[0]?.dia ? (
              porDia.map((g) => (
                <div key={g.dia} className="paradas__dia">
                  <h3>{g.dia ? formatear(tr.dia, { n: g.dia }) : tr.diaSinAsignar}</h3>
                  {listaParadas(g.paradas)}
                </div>
              ))
            ) : (
              listaParadas(r.paradas)
            )}
          </section>

          {r.condiciones && (
            <section aria-labelledby="condiciones">
              <h2 id="condiciones">{tr.condiciones}</h2>
              <Parrafos texto={r.condiciones} className="prosa" />
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">{tr.infoPractica}</h2>
            <dl>
              <Dato icono={r.modalidad === "bus" ? "bus-linea" : "caminata"} titulo={tr.modalidadTitulo}>
                {formatear(r.guiado ? tr.modalidadGuiada : tr.modalidadLibre, { modalidad })}
              </Dato>
              {r.duracion && <Dato icono="reloj" titulo={tr.duracion}>{r.duracion}</Dato>}
              {r.distancia && <Dato icono="mapa" titulo={tr.distancia}>{r.distancia}</Dato>}
              {r.esfuerzo && <Dato icono="info" titulo={tr.esfuerzo}>{r.esfuerzo}</Dato>}
              {r.inicio && <Dato icono="ubicacion" titulo={tr.empiezaEn}>{r.inicio}</Dato>}
              {r.fin && <Dato icono="ubicacion" titulo={tr.terminaEn}>{r.fin}</Dato>}
              <Dato icono="brujula" titulo={tr.paradas}>{r.paradas.length}</Dato>
            </dl>
            <div className="panel-practico__acciones">
              {accion && <BotonAccion url={accion.url!} texto={accion.texto} />}
              {experiencia && <BotonAccion url={`/experiencias/${experiencia.slug}`} texto={tr.verCondiciones} primario={!accion} />}
              <BotonAccion url={MAPA} texto={tr.mapa} primario={false} />
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
