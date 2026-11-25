"use client";

/*
 * Piezas de la agenda cultural con protagonismo (vienen de Agenda Cultural: event-card, week-strip y
 * las categorías de su portada), con el sistema de diseño del portal. Las usan la portada y /agenda.
 */

import { Icono } from "@/components/Iconos";
import { Vinculo as Link, useIdioma, useTextos } from "@/components/i18n/Idioma";
import type { DiaSemana, OcurrenciaAgenda } from "@/lib/cultura/agenda";
import { emojiDeCategoria } from "@/lib/cultura/emojis";
import { fechaDeTarjeta, horaDeTarjeta } from "@/lib/fechas";
import { LOCALE } from "@/lib/i18n/config";
import { formatear } from "@/lib/i18n/definir";
import type { CategoriaAgenda } from "@/lib/tipos";

const ESTADO_TONO: Record<OcurrenciaAgenda["estado"], "ok" | "medio" | "aviso" | "mal" | null> = {
  confirmado: null, reprogramado: "medio", suspendido: "aviso", cancelado: "mal",
};

/** Si el evento no tiene foto ni la tiene su lugar (la misma de Agenda Cultural). */
export const IMAGEN_PREDETERMINADA = "/img/cultura/evento-predeterminado.jpg";

/**
 * Tarjeta de un evento, igual a la de Agenda Cultural (event-card): foto con la etiqueta de acceso y la de
 * destacado, fecha y hora, categorías, título, lugar con su dirección y «Ver evento».
 */
export function TarjetaEvento({ o, categorias, titulo: Titulo = "h3" }: {
  o: OcurrenciaAgenda;
  categorias: Map<string, CategoriaAgenda>;
  titulo?: "h2" | "h3";
}) {
  const idioma = useIdioma();
  const { cultura: t, agenda: ta, comun } = useTextos();
  const rubros = o.rubros.map((r) => categorias.get(r)).filter((k): k is CategoriaAgenda => !!k);
  const estado = ESTADO_TONO[o.estado];
  const hora = horaDeTarjeta(o.inicio, idioma);
  const modalidad = o.costo?.modalidad ?? (o.gratis ? "gratis" : "consultar");
  const acceso = modalidad === "gratis" ? t.gratis : modalidad === "pago" ? o.costo?.detalle || t.tarjeta.pago : t.tarjeta.consultar;
  return (
    <Link className={`tarjeta-evento${o.estado === "cancelado" ? " tarjeta-evento--apagada" : ""}`} href={o.url}>
      <span className="tarjeta-evento__foto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={o.imagen?.src ?? IMAGEN_PREDETERMINADA} alt="" loading="lazy" />
        <span className="tarjeta-evento__acceso">{acceso}</span>
        {o.destacado && <span className="tarjeta-evento__destacado">{t.destacado}</span>}
      </span>
      <span className="tarjeta-evento__cuerpo">
        <span className="tarjeta-evento__meta">
          <strong>{fechaDeTarjeta(o.inicio, idioma)}</strong>
          {hora && <span><Icono nombre="reloj" tamano={15} /> {hora}</span>}
        </span>
        {(estado || o.enCurso || o.fueraDeLaCiudad) && (
          <span className="tarjeta-evento__marcas">
            {estado && <span className={`estado estado--${estado}`}>{ta.estado[o.estado]}</span>}
            {o.enCurso && o.estado !== "cancelado" && <span className="estado estado--ok">{ta.estado.enCurso}</span>}
            {o.fueraDeLaCiudad && <span className="marca marca--alerta">{comun.ui.fueraDeLaCiudad}</span>}
          </span>
        )}
        {rubros.length > 0 && (
          <span className="tarjeta-evento__rubros">
            {rubros.map((k) => <span key={k.id}>{k.titulo}</span>)}
          </span>
        )}
        <Titulo className="tarjeta-evento__titulo">{o.titulo}</Titulo>
        {(o.sede || o.lugar) && (
          <span className="tarjeta-evento__lugar">
            <Icono nombre="ubicacion" tamano={17} />
            <span>{o.sede || o.lugar}{o.direccion && <small>{o.direccion}</small>}</span>
          </span>
        )}
        <span className="tarjeta-evento__ver">{t.tarjeta.verEvento} <Icono nombre="flecha-diagonal" tamano={18} /></span>
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

/**
 * Las categorías con más actividades por venir, como en la portada de Agenda Cultural: un «sticker» con el
 * emoji de la categoría sobre un cuadrado de color, un poco torcido. Va sobre la franja azul oscura.
 */
export function CategoriasAgenda({ populares, categorias }: { populares: { id: string; eventos: number }[]; categorias: CategoriaAgenda[] }) {
  const { cultura: t } = useTextos();
  const mapa = new Map(categorias.map((k) => [k.id, k]));
  const items = populares.map((p) => ({ ...p, k: mapa.get(p.id) })).filter((p) => p.k);
  if (!items.length) return null;
  return (
    <ul className="categorias-agenda">
      {items.map(({ id, eventos, k }) => (
        <li key={id}>
          <Link className="categoria-agenda" href={`/agenda?categoria=${id}`}>
            <span className="categoria-agenda__sticker" aria-hidden="true">{emojiDeCategoria(id)}</span>
            <span className="categoria-agenda__texto">
              <strong>{k!.titulo}</strong>
              <small>{eventos === 1 ? t.categorias.unaPorVenir : formatear(t.categorias.porVenir, { n: eventos })}</small>
            </span>
            <Icono nombre="flecha" tamano={24} className="categoria-agenda__flecha" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
