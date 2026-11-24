"use client";

/*
 * Piezas de la agenda cultural con protagonismo (vienen de Agenda Cultural: event-card, week-strip y
 * las categorías de su portada), con el sistema de diseño del portal. Las usan la portada y /agenda.
 */

import { Icono } from "@/components/Iconos";
import { Vinculo as Link, useIdioma, useTextos } from "@/components/i18n/Idioma";
import type { DiaSemana, OcurrenciaAgenda } from "@/lib/cultura/agenda";
import { formatearOcurrencia, partesDeFecha } from "@/lib/fechas";
import { LOCALE } from "@/lib/i18n/config";
import { formatear } from "@/lib/i18n/definir";
import type { CategoriaAgenda } from "@/lib/tipos";

const ESTADO_TONO: Record<OcurrenciaAgenda["estado"], "ok" | "medio" | "aviso" | "mal" | null> = {
  confirmado: null, reprogramado: "medio", suspendido: "aviso", cancelado: "mal",
};

/** Tarjeta grande de un evento: foto (o un fondo con el color de su categoría), fecha, lugar y categorías. */
export function TarjetaEvento({ o, categorias, titulo: Titulo = "h3" }: {
  o: OcurrenciaAgenda;
  categorias: Map<string, CategoriaAgenda>;
  titulo?: "h2" | "h3";
}) {
  const idioma = useIdioma();
  const { cultura: t, agenda: ta, comun } = useTextos();
  const { dia, mes } = partesDeFecha(o.inicio, idioma);
  const rubros = o.rubros.map((r) => categorias.get(r)).filter((k): k is CategoriaAgenda => !!k);
  const tono = rubros[0]?.tono ?? 0;
  const estado = ESTADO_TONO[o.estado];
  return (
    <Link className={`tarjeta-evento${o.estado === "cancelado" ? " tarjeta-evento--apagada" : ""}`} href={o.url}>
      <span className={`tarjeta-evento__foto tarjeta-evento__foto--tono-${tono}`}>
        {o.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.imagen.src} alt="" loading="lazy" />
        ) : (
          <span className="tarjeta-evento__sin-foto" aria-hidden="true">
            <Icono nombre="calendario" tamano={40} />
            {rubros[0]?.titulo}
          </span>
        )}
        <span className="tarjeta-evento__fecha" aria-hidden="true">
          <span>{mes}</span>
          <strong>{dia}</strong>
        </span>
      </span>
      <span className="tarjeta-evento__cuerpo">
        <span className="tarjeta-evento__marcas">
          {o.destacado && <span className="marca marca--destacado"><Icono nombre="estrella" tamano={12} /> {t.destacado}</span>}
          {estado && <span className={`estado estado--${estado}`}>{ta.estado[o.estado]}</span>}
          {o.enCurso && o.estado !== "cancelado" && <span className="estado estado--ok">{ta.estado.enCurso}</span>}
          {o.gratis && <span className="marca marca--exito">{t.gratis}</span>}
          {o.fueraDeLaCiudad && <span className="marca marca--alerta">{comun.ui.fueraDeLaCiudad}</span>}
        </span>
        <Titulo className="tarjeta-evento__titulo">{o.titulo}</Titulo>
        <span className="tarjeta-evento__cuando"><Icono nombre="reloj" tamano={15} /> {formatearOcurrencia(o, idioma)}</span>
        {(o.sede || o.lugar) && <span className="tarjeta-evento__lugar"><Icono nombre="ubicacion" tamano={15} /> {o.sede || o.lugar}</span>}
        {rubros.length > 0 && (
          <span className="tarjeta-evento__rubros">
            {rubros.slice(0, 3).map((k) => <span key={k.id} className={`tono tono--${k.tono}`}>{k.titulo}</span>)}
          </span>
        )}
      </span>
    </Link>
  );
}

export function GrillaEventos({ ocurrencias, categorias, titulo }: {
  ocurrencias: OcurrenciaAgenda[];
  categorias: CategoriaAgenda[];
  titulo?: "h2" | "h3";
}) {
  const mapa = new Map(categorias.map((k) => [k.id, k]));
  return (
    <ul className="tarjetas-evento">
      {ocurrencias.map((o) => <li key={`${o.evento}-${o.inicio}`}><TarjetaEvento o={o} categorias={mapa} titulo={titulo} /></li>)}
    </ul>
  );
}

/** Los próximos siete días con cuántas actividades tiene cada uno; cada día abre la agenda en esa fecha. */
export function SemanaAgenda({ dias, categorias }: { dias: DiaSemana[]; categorias: CategoriaAgenda[] }) {
  const idioma = useIdioma();
  const { cultura: t } = useTextos();
  const mapa = new Map(categorias.map((k) => [k.id, k]));
  const fmtDia = new Intl.DateTimeFormat(LOCALE[idioma].intl, { weekday: "short", timeZone: "UTC" });
  const fmtLargo = new Intl.DateTimeFormat(LOCALE[idioma].intl, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const cantidad = (n: number) => (n === 0 ? t.semana.sinActividades : n === 1 ? t.semana.unaActividad : formatear(t.semana.actividades, { n }));
  return (
    <section className="semana-agenda" aria-labelledby="semana-agenda-titulo">
      <div className="semana-agenda__cabecera">
        <h3 id="semana-agenda-titulo">{t.semana.titulo}</h3>
        <Link className="enlace-flecha" href="/agenda?vista=calendario">{t.semana.verCalendario} <Icono nombre="flecha" tamano={16} /></Link>
      </div>
      <ol>
        {dias.map((d, i) => {
          const fecha = new Date(`${d.dia}T12:00:00Z`);
          const nombre = i === 0 ? t.semana.hoy : i === 1 ? t.semana.manana : fmtDia.format(fecha).replace(".", "");
          return (
            <li key={d.dia}>
              <Link className={`semana-agenda__dia${i === 0 ? " semana-agenda__dia--hoy" : ""}${d.eventos ? "" : " semana-agenda__dia--vacio"}`}
                href={`/agenda?cuando=fecha&fecha=${d.dia}`} aria-label={`${fmtLargo.format(fecha)}: ${cantidad(d.eventos)}`}>
                <small>{nombre}</small>
                <strong>{Number(d.dia.slice(8))}</strong>
                <span className="semana-agenda__puntos" aria-hidden="true">
                  {d.rubros.slice(0, 3).map((r) => <span key={r} className={`tono tono--${mapa.get(r)?.tono ?? 0}`} />)}
                </span>
                <span className="semana-agenda__cantidad">{cantidad(d.eventos)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Las categorías con más actividades por venir, como accesos a la agenda filtrada. */
export function CategoriasAgenda({ populares, categorias }: { populares: { id: string; eventos: number }[]; categorias: CategoriaAgenda[] }) {
  const { cultura: t } = useTextos();
  const mapa = new Map(categorias.map((k) => [k.id, k]));
  const items = populares.map((p) => ({ ...p, k: mapa.get(p.id) })).filter((p) => p.k);
  if (!items.length) return null;
  return (
    <ul className="categorias-agenda">
      {items.map(({ id, eventos, k }) => (
        <li key={id}>
          <Link className={`categoria-agenda categoria-agenda--tono-${k!.tono}`} href={`/agenda?categoria=${id}`}>
            <strong>{k!.titulo}</strong>
            <small>{eventos === 1 ? t.categorias.unaPorVenir : formatear(t.categorias.porVenir, { n: eventos })}</small>
            <Icono nombre="flecha" tamano={18} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
