"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { Icono } from "./Iconos";
import { Marca } from "./Ui";
import { Vinculo as Link, useIdioma, useTextos } from "@/components/i18n/Idioma";
import {
  CUANDOS, contarPorDia, esMes, filtrarAgenda, filtrosAUrl, hayFiltrosDeContenido, intensidad, leerFiltrosAgenda, mesDe,
  opcionesConFechas, semanasDelMes, sumarMeses, type FiltrosAgenda, type OcurrenciaAgenda,
} from "@/lib/cultura/agenda";
import { formatear } from "@/lib/i18n/definir";
import { GrillaEventos } from "@/components/cultura/Agenda";
import { LOCALE } from "@/lib/i18n/config";
import { aInstante, diaLocal, formatearOcurrencia, partesDeFecha, soloDia, type OcurrenciaDeEvento } from "@/lib/fechas";
import type { CategoriaAgenda } from "@/lib/tipos";

export type { OcurrenciaAgenda };

/** Marca de cada estado (el texto sale de los textos de la agenda). Lo confirmado no lleva. */
const ESTADO: Record<OcurrenciaDeEvento["estado"], "ok" | "medio" | "aviso" | "mal" | null> = {
  confirmado: null,
  reprogramado: "medio",
  suspendido: "aviso",
  cancelado: "mal",
};

type Vista = "lista" | "tarjetas" | "calendario";
const VISTAS: Vista[] = ["lista", "tarjetas", "calendario"];
const ICONO_VISTA: Record<Vista, string> = { lista: "lista", tarjetas: "tablero", calendario: "calendario" };
const POR_PAGINA_TARJETAS = 24;

/** Día local `AAAA-MM-DD` más `n` días. */
const moverDia = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};

/**
 * Agenda cultural. El servidor entrega las ocurrencias vigentes; el navegador filtra con su
 * propio reloj (siempre en hora de Tucumán) para que «Hoy» no quede desactualizado. Los filtros
 * y la vista quedan en la URL, así una búsqueda se comparte y se recupera al volver de una ficha.
 */
export function AgendaFiltrable({ ocurrencias, categorias, populares = [], ahoraServidor }: {
  /** Categorías con más actividades por venir: atajos arriba del buscador. */
  populares?: { id: string; eventos: number }[];
  ocurrencias: OcurrenciaAgenda[];
  categorias: CategoriaAgenda[];
  ahoraServidor: number;
}) {
  const params = useSearchParams();
  const [f, setF] = useState<FiltrosAgenda>(() => leerFiltrosAgenda(params));
  const [vista, setVista] = useState<Vista>(() => (VISTAS as string[]).includes(params.get("vista") ?? "") ? (params.get("vista") as Vista) : "lista");
  const [limiteTarjetas, setLimiteTarjetas] = useState(POR_PAGINA_TARJETAS);
  const [ahora, setAhora] = useState(ahoraServidor);
  const hoy = diaLocal(ahora);
  const [mes, setMes] = useState(() => (esMes(params.get("mes")) ? params.get("mes")! : mesDe(diaLocal(ahoraServidor))));
  const [busqueda, setBusqueda] = useState(f.q);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const id = useId();
  const idioma = useIdioma();
  const { agenda: t, cultura: tc, comun } = useTextos();

  useEffect(() => setAhora(Date.now()), []);

  // Los filtros a la URL, sin recargar ni sumar entradas al historial.
  useEffect(() => {
    const s = filtrosAUrl(f, vista === "calendario" ? { vista, mes } : vista === "tarjetas" ? { vista } : {});
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [f, vista, mes]);

  // La búsqueda se aplica al dejar de escribir.
  useEffect(() => {
    const espera = setTimeout(() => setF((x) => (x.q === busqueda ? x : { ...x, q: busqueda })), 250);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const cambiar = (parcial: Partial<FiltrosAgenda>) => setF((x) => ({ ...x, ...parcial }));
  const nombreRubro = useMemo(() => new Map(categorias.map((k) => [k.id, k])), [categorias]);
  const opciones = useMemo(() => opcionesConFechas(ocurrencias, ahora), [ocurrencias, ahora]);
  const rubrosVisibles = categorias.filter((k) => opciones.rubros.has(k.id));

  const lista = useMemo(() => filtrarAgenda(ocurrencias, f, ahora), [ocurrencias, f, ahora]);
  // El calendario cuenta lo que coincide con la búsqueda y los filtros, sin el filtro de fecha.
  const delMes = useMemo(
    () => contarPorDia(filtrarAgenda(ocurrencias, { ...f, cuando: "proximos", fecha: "" }, ahora), mes),
    [ocurrencias, f, ahora, mes],
  );

  const limpiar = () => {
    setBusqueda("");
    setF({ cuando: "proximos", fecha: "", q: "", rubro: "", lugar: "", gratis: false });
  };

  const filtros = (
    <>
      <div className="filtros__campo filtros__buscador agenda-buscador__q">
        <label htmlFor={`${id}-q`}>{tc.buscador.titulo}</label>
        <div style={{ position: "relative" }}>
          <Icono nombre="buscar" tamano={18} />
          <input id={`${id}-q`} type="search" value={busqueda} placeholder={tc.buscador.marcador}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>
      <div className="filtros__campo">
        <label htmlFor={`${id}-categoria`}>{tc.buscador.categoria}</label>
        <select id={`${id}-categoria`} value={f.rubro} onChange={(e) => cambiar({ rubro: e.target.value })}>
          <option value="">{tc.buscador.todas}</option>
          {rubrosVisibles.map((k) => <option key={k.id} value={k.id}>{k.titulo}</option>)}
          {f.rubro && !rubrosVisibles.some((k) => k.id === f.rubro) && <option value={f.rubro}>{nombreRubro.get(f.rubro)?.titulo ?? f.rubro}</option>}
        </select>
      </div>
      <div className="filtros__campo">
        <label htmlFor={`${id}-lugar`}>{tc.buscador.lugar}</label>
        <select id={`${id}-lugar`} value={f.lugar} onChange={(e) => cambiar({ lugar: e.target.value })}>
          <option value="">{tc.buscador.todos}</option>
          {opciones.lugares.map((l) => <option key={l.slug} value={l.slug}>{l.titulo}</option>)}
        </select>
      </div>
      <label className="filtros__check">
        <input type="checkbox" checked={f.gratis} onChange={(e) => cambiar({ gratis: e.target.checked })} />
        {tc.buscador.gratis}
      </label>
    </>
  );

  return (
    <div className="agenda-filtrable" data-modulo="cultura">
      <div className="agenda-barra">
        <div className="segmentado segmentado--grande" role="radiogroup" aria-label={t.filtro.cuando}>
          {CUANDOS.map((p) => (
            <label key={p}>
              <input type="radio" name={`${id}-cuando`} value={p} checked={f.cuando === p}
                onChange={() => cambiar({ cuando: p, fecha: p === "fecha" ? f.fecha || hoy : "" })} />
              <span>{t.filtro[p]}</span>
            </label>
          ))}
        </div>
        <div className="segmentado agenda-barra__vista" role="radiogroup" aria-label={tc.vista.etiqueta}>
          {VISTAS.map((v) => (
            <label key={v}>
              <input type="radio" name={`${id}-vista`} value={v} checked={vista === v} onChange={() => setVista(v)} />
              <span><Icono nombre={ICONO_VISTA[v]} tamano={16} /> {tc.vista[v]}</span>
            </label>
          ))}
        </div>
      </div>

      {populares.length > 0 && (
        <ul className="agenda-rapidas" aria-label={tc.categorias.rapidas}>
          {populares.map((p) => {
            const k = nombreRubro.get(p.id);
            if (!k) return null;
            const activa = f.rubro === p.id;
            return (
              <li key={p.id}>
                <button type="button" className={`tono tono--${k.tono}`} aria-pressed={activa}
                  onClick={() => cambiar({ rubro: activa ? "" : p.id })}>
                  {k.titulo} · {p.eventos}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {f.cuando === "fecha" && (
        <div className="filtros__campo agenda-filtrable__fecha">
          <label htmlFor={`${id}-fecha`}>{t.filtro.campoFecha}</label>
          <div className="agenda-dia-nav">
            <button type="button" className="boton-redondo" aria-label={tc.dia.anterior}
              disabled={!soloDia(f.fecha) || f.fecha <= hoy}
              onClick={() => { const d = moverDia(f.fecha, -1); cambiar({ fecha: d }); setMes(mesDe(d)); }}>
              <Icono nombre="flecha-izq" tamano={18} />
            </button>
            <input id={`${id}-fecha`} type="date" value={soloDia(f.fecha) ? f.fecha : hoy} min={hoy}
              onChange={(e) => { cambiar({ fecha: e.target.value }); if (soloDia(e.target.value)) setMes(mesDe(e.target.value)); }} />
            <button type="button" className="boton-redondo" aria-label={tc.dia.siguiente}
              onClick={() => { const d = moverDia(soloDia(f.fecha) ? f.fecha : hoy, 1); cambiar({ fecha: d }); setMes(mesDe(d)); }}>
              <Icono nombre="flecha" tamano={18} />
            </button>
          </div>
        </div>
      )}

      {/* En la computadora los filtros están a la vista; en el celular, detrás de un botón. */}
      <div className="filtros agenda-buscador agenda-buscador--amplio">{filtros}</div>
      <button type="button" className="boton boton--claro agenda-buscador__abrir" aria-expanded={panelAbierto}
        aria-controls={`${id}-panel`} onClick={() => setPanelAbierto((x) => !x)}>
        <Icono nombre="ajustes" tamano={18} /> {tc.buscador.filtros}
        {hayFiltrosDeContenido(f) && <span className="agenda-buscador__punto" aria-hidden="true" />}
      </button>
      {panelAbierto && (
        <div className="filtros agenda-buscador agenda-buscador--movil" id={`${id}-panel`}>
          {filtros}
          <button type="button" className="boton boton--primario" onClick={() => setPanelAbierto(false)}>{tc.buscador.verResultados}</button>
        </div>
      )}

      {vista === "calendario" && (
        <CalendarioMes
          mes={mes} hoy={hoy} dias={delMes} elegido={f.cuando === "fecha" ? f.fecha : ""}
          minimo={mesDe(hoy)} nombreRubro={nombreRubro}
          cambiarMes={setMes}
          elegir={(dia) => cambiar({ cuando: "fecha", fecha: dia })}
        />
      )}

      <p className="catalogo__estado" aria-live="polite">
        <span><strong>{lista.length}</strong> {lista.length === 1 ? t.actividad : t.actividades}</span>
        {hayFiltrosDeContenido(f) && (
          <button type="button" className="chip chip--limpiar" onClick={limpiar}>
            <Icono nombre="cerrar" tamano={14} /> {tc.buscador.limpiar}
          </button>
        )}
      </p>

      {lista.length > 0 && vista === "tarjetas" ? (
        <>
          <GrillaEventos ocurrencias={lista.slice(0, limiteTarjetas)} categorias={categorias} titulo="h2" />
          {lista.length > limiteTarjetas && (
            <div className="vacio__acciones" style={{ justifyContent: "center", marginTop: "var(--sp-5)" }}>
              <button type="button" className="boton boton--claro" onClick={() => setLimiteTarjetas((n) => n + POR_PAGINA_TARJETAS)}>
                {t.vacio.verTodas} ({lista.length - limiteTarjetas})
              </button>
            </div>
          )}
        </>
      ) : lista.length > 0 ? (
        <ul className="agenda-lista">
          {lista.map((o) => {
            const { dia, mes: m } = partesDeFecha(o.inicio, idioma);
            const estado = ESTADO[o.estado];
            return (
              <li key={`${o.evento}-${o.inicio}`}>
                <Link className={`agenda-item${o.estado === "cancelado" || o.estado === "suspendido" ? " agenda-item--apagado" : ""}`} href={o.url}>
                  <span className="evento__fecha" aria-hidden="true">
                    <span className="evento__mes">{m}</span>
                    <span className="evento__dia">{dia}</span>
                  </span>
                  <span className="agenda-item__texto">
                    <span className="agenda-item__marcas">
                      {o.enCurso && o.estado !== "cancelado" && <Marca tipo="exito">{t.estado.enCurso}</Marca>}
                      {estado && <span className={`estado estado--${estado}`}>{t.estado[o.estado]}</span>}
                      {o.destacado && <span className="marca marca--destacado"><Icono nombre="estrella" tamano={12} /> {tc.destacado}</span>}
                      {o.gratis && <Marca tipo="exito">{tc.gratis}</Marca>}
                      {o.fueraDeLaCiudad && <Marca tipo="alerta">{comun.ui.fueraDeLaCiudad}</Marca>}
                    </span>
                    <strong className="agenda-item__titulo">{o.titulo}</strong>
                    <span className="agenda-item__cuando">{formatearOcurrencia(o, idioma)}</span>
                    {(o.sede || o.lugar) && (
                      <span className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{o.sede || o.lugar}</span>
                    )}
                    {o.rubros.length > 0 && (
                      <span className="agenda-item__rubros">
                        {o.rubros.slice(0, 3).map((r) => {
                          const k = nombreRubro.get(r);
                          return k ? <span key={r} className={`tono tono--${k.tono}`}>{k.titulo}</span> : null;
                        })}
                      </span>
                    )}
                  </span>
                  {o.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="agenda-item__foto" src={o.imagen.src} alt="" loading="lazy" width={96} height={96} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="vacio">
          <h2>{hayFiltrosDeContenido(f) ? t.vacio.proximos : t.vacio[f.cuando]}</h2>
          <p>{t.vacio.texto}</p>
          <div className="vacio__acciones">
            <Link className="boton boton--primario" href="/recorridos">{t.vacio.verRecorridos}</Link>
            {(f.cuando !== "proximos" || hayFiltrosDeContenido(f)) && (
              <button type="button" className="boton boton--claro" onClick={limpiar}>{t.vacio.verTodas}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mes de lunes a domingo; cada día dice cuántas actividades tiene y se elige con un clic o con Enter. */
function CalendarioMes({ mes, hoy, minimo, dias, elegido, nombreRubro, cambiarMes, elegir }: {
  mes: string; hoy: string; minimo: string; elegido: string;
  dias: Map<string, { eventos: number; rubros: string[] }>;
  nombreRubro: Map<string, CategoriaAgenda>;
  cambiarMes: (m: string) => void;
  elegir: (dia: string) => void;
}) {
  const idioma = useIdioma();
  const { cultura: tc } = useTextos();
  const titulo = new Intl.DateTimeFormat(LOCALE[idioma].intl, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(Date.UTC(+mes.slice(0, 4), +mes.slice(5) - 1, 1));
  const largo = new Intl.DateTimeFormat(LOCALE[idioma].intl, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const cantidad = (n: number) => (n === 0 ? tc.mes.sinEventos : n === 1 ? tc.mes.unEvento : formatear(tc.mes.eventos, { n }));

  return (
    <section className="calendario-mes" aria-label={titulo}>
      <div className="calendario-mes__cabecera">
        <button type="button" className="boton-redondo" onClick={() => cambiarMes(sumarMeses(mes, -1))} disabled={mes <= minimo}
          aria-label={tc.mes.anterior}>
          <Icono nombre="flecha-izq" tamano={18} />
        </button>
        <h2 aria-live="polite">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
        <button type="button" className="boton-redondo" onClick={() => cambiarMes(sumarMeses(mes, 1))} aria-label={tc.mes.siguiente}>
          <Icono nombre="flecha" tamano={18} />
        </button>
      </div>
      <table className="calendario-mes__tabla">
        <thead>
          <tr>{tc.mes.dias.map((d, i) => <th key={d} scope="col" abbr={tc.mes.diasLargos[i]}>{d}</th>)}</tr>
        </thead>
        <tbody>
          {semanasDelMes(mes).map((semana, i) => (
            <tr key={i}>
              {semana.map((dia, j) => {
                if (!dia) return <td key={j} aria-hidden="true" />;
                const d = dias.get(dia);
                const n = d?.eventos ?? 0;
                const pasado = dia < hoy;
                const etiqueta = `${largo.format(aInstante(dia) + 12 * 3_600_000)}: ${cantidad(n)}`;
                return (
                  <td key={j}>
                    <button type="button" className={`calendario-mes__dia calendario-mes__dia--${intensidad(n)}`}
                      aria-pressed={elegido === dia} aria-label={etiqueta} disabled={pasado || n === 0}
                      data-hoy={dia === hoy ? "" : undefined} onClick={() => elegir(dia)}>
                      <span className="calendario-mes__numero">{Number(dia.slice(8))}</span>
                      {n > 0 && <span className="calendario-mes__cantidad" aria-hidden="true">{n}</span>}
                      {d && d.rubros.length > 0 && (
                        <span className="calendario-mes__puntos" aria-hidden="true">
                          {d.rubros.map((r) => <span key={r} className={`tono tono--${nombreRubro.get(r)?.tono ?? 0}`} />)}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="calendario-mes__ayuda">
        {elegido && soloDia(elegido) ? formatear(tc.mes.del, { dia: largo.format(aInstante(elegido) + 12 * 3_600_000) }) : tc.mes.elegirDia}
      </p>
    </section>
  );
}
