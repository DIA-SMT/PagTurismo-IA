import type { Metadata } from "next";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina } from "@/components/Ui";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { TIPOS_ALOJAMIENTO, agrupar, telefonoParaLlamar, type Alojamiento, type ArchivoAlojamientos, type TipoAlojamiento } from "@/lib/turismo/alojamientos";
import archivo from "@/datos/turismo/alojamientos.json";

const DATOS = archivo as ArchivoAlojamientos;
const MAX_SERVICIOS = 6;

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).alojamientos;
  return { title: t.titulo, description: t.meta, alternates: await alternativas("/alojamientos") };
}

/**
 * Alojamientos habilitados de la ciudad, del registro oficial del Ente Tucumán Turismo
 * (datos/turismo/alojamientos.json, que actualiza `npm run alojamientos`). Los hoteles van por estrellas.
 */
export default async function Alojamientos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [textos, sp] = await Promise.all([textosActuales(), searchParams]);
  const t = textos.alojamientos;
  const todos = DATOS.alojamientos;
  const presentes = TIPOS_ALOJAMIENTO.filter((x) => todos.some((a) => a.tipo === x));
  const pedido = typeof sp.tipo === "string" && (presentes as string[]).includes(sp.tipo) ? (sp.tipo as TipoAlojamiento) : null;
  const grupos = agrupar(pedido ? todos.filter((a) => a.tipo === pedido) : todos);
  const tituloGrupo = (g: (typeof grupos)[number]) =>
    g.tipo !== "hotel" ? t.tipos[g.tipo]
      : g.estrellas === 1 ? t.hotelesUnaEstrella : g.estrellas ? formatear(t.hotelesEstrellas, { n: g.estrellas }) : t.hotelesSinCategoria;
  const fecha = DATOS.relevado.split("-").reverse().join("/");

  return (
    <div data-modulo="turismo">
      <EncabezadoPagina migas={[{ texto: textos.comun.nav.turismo, url: "/descubri" }, { texto: t.titulo }]} kicker={t.kicker} titulo={t.titulo}
        bajada={formatear(t.bajada, { n: todos.length })} />
      <div className="contenedor bloque-interno alojamientos">
        <nav className="segmentado segmentado--grande" aria-label={t.filtro}>
          {([null, ...presentes] as (TipoAlojamiento | null)[]).map((tipo) => (
            <Link key={tipo ?? "todos"} href={tipo ? `/alojamientos?tipo=${tipo}` : "/alojamientos"} aria-current={pedido === tipo ? "page" : undefined}
              className="segmentado__enlace">
              <span>{tipo ? t.tipos[tipo] : t.todos}</span>
            </Link>
          ))}
        </nav>

        {grupos.map((g) => (
          <section className="grupo" key={g.clave} aria-labelledby={`grupo-${g.clave}`}>
            <h2 id={`grupo-${g.clave}`}>{tituloGrupo(g)} <span className="alojamientos__cuenta">{g.lista.length}</span></h2>
            <ul className="alojamientos__grilla">
              {g.lista.map((a) => <li key={a.id}><TarjetaAlojamiento a={a} t={t} /></li>)}
            </ul>
          </section>
        ))}

        <p className="alojamientos__fuente">
          <Icono nombre="info" tamano={16} />
          <span>
            {formatear(t.fuente, { fuente: DATOS.fuente, fecha })}{" "}
            <a href={DATOS.url} rel="noopener" target="_blank">{DATOS.url.replace(/^https?:\/\//, "")}</a>
            {t.serviciosEnEspanol && ` ${t.serviciosEnEspanol}`}
          </span>
        </p>
      </div>
    </div>
  );
}

function TarjetaAlojamiento({ a, t }: { a: Alojamiento; t: Awaited<ReturnType<typeof textosActuales>>["alojamientos"] }) {
  const tel = telefonoParaLlamar(a.telefono);
  const mapa = a.coordenadas
    ? `https://www.google.com/maps/search/?api=1&query=${a.coordenadas.lat},${a.coordenadas.lng}`
    : a.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.direccion}, San Miguel de Tucumán`)}` : undefined;
  return (
    <article className="alojamiento">
      <h3>{a.nombre}</h3>
      {a.estrellas > 0 && (
        <p className="alojamiento__estrellas" aria-label={a.estrellas === 1 ? t.unaEstrella : formatear(t.estrellas, { n: a.estrellas })}>
          {"★".repeat(a.estrellas)}
        </p>
      )}
      {a.direccion && <p className="alojamiento__dato"><Icono nombre="ubicacion" tamano={16} /> {a.direccion}</p>}
      {a.telefono && <p className="alojamiento__dato"><Icono nombre="telefono" tamano={16} /> {a.telefono}</p>}
      {a.servicios.length > 0 && (
        <ul className="alojamiento__servicios" lang="es">
          {a.servicios.slice(0, MAX_SERVICIOS).map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
      <div className="alojamiento__acciones">
        {tel && <a href={`tel:${tel}`}><Icono nombre="telefono" tamano={16} /> {t.llamar}</a>}
        {a.web && <a href={a.web} rel="noopener" target="_blank"><Icono nombre="globo" tamano={16} /> {t.sitio}</a>}
        {a.instagram && <a href={a.instagram} rel="noopener" target="_blank"><Icono nombre="instagram" tamano={16} /> Instagram</a>}
        {mapa && <a href={mapa} rel="noopener" target="_blank"><Icono nombre="mapa" tamano={16} /> {t.comoLlegar}</a>}
      </div>
    </article>
  );
}
