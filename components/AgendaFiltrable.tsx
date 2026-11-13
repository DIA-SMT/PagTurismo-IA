"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { Icono } from "./Iconos";
import { Marca } from "./Ui";
import { Vinculo as Link, useIdioma, useTextos } from "@/components/i18n/Idioma";
import {
  aInstante, diaLocal, filtrarPorCuando, finDeOcurrencia, formatearOcurrencia, partesDeFecha, soloDia,
  type Cuando, type OcurrenciaDeEvento,
} from "@/lib/fechas";

export type OcurrenciaAgenda = OcurrenciaDeEvento & {
  titulo: string;
  url: string;
  lugar?: string;
  fueraDeLaCiudad: boolean;
};

const PESTANAS: Cuando[] = ["proximos", "hoy", "finde", "fecha"];

/** Marca de cada estado (el texto sale de los textos de la agenda). Lo confirmado no lleva. */
const ESTADO: Record<OcurrenciaDeEvento["estado"], "exito" | "alerta" | "neutra" | null> = {
  confirmado: null,
  reprogramado: "neutra",
  suspendido: "alerta",
  cancelado: "alerta",
};

/**
 * Agenda por fecha. El servidor entrega las ocurrencias vigentes al
 * generar la página; el navegador vuelve a filtrar con su propio reloj
 * (siempre en hora de Tucumán) para que "Hoy" no quede desactualizado si la
 * página se generó hace un rato. El filtro elegido queda en la URL.
 */
export function AgendaFiltrable({ ocurrencias, ahoraServidor }: { ocurrencias: OcurrenciaAgenda[]; ahoraServidor: number }) {
  const params = useSearchParams();
  const pedido = params.get("cuando") as Cuando | null;
  const fecha = params.get("fecha") ?? "";
  const cuando: Cuando = pedido && PESTANAS.includes(pedido) ? pedido : "proximos";
  const [ahora, setAhora] = useState(ahoraServidor);
  const id = useId();
  const idioma = useIdioma();
  const { agenda: t, comun } = useTextos();

  useEffect(() => setAhora(Date.now()), []);

  function elegir(c: Cuando, f?: string) {
    const p = new URLSearchParams();
    if (c !== "proximos") p.set("cuando", c);
    if (c === "fecha" && f) p.set("fecha", f);
    const s = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }

  const lista = useMemo(() => {
    const vigentes = ocurrencias
      .filter((o) => finDeOcurrencia(o) >= ahora)
      .map((o) => ({ ...o, enCurso: aInstante(o.inicio) <= ahora }));
    return filtrarPorCuando(vigentes, cuando, ahora, fecha) as OcurrenciaAgenda[];
  }, [ocurrencias, cuando, ahora, fecha]);

  const hoy = diaLocal(ahora);

  return (
    <div className="agenda-filtrable">
      <div className="segmentado segmentado--grande" role="radiogroup" aria-label={t.filtro.cuando}>
        {PESTANAS.map((p) => (
          <label key={p}>
            <input type="radio" name="cuando" value={p} checked={cuando === p}
              onChange={() => elegir(p, p === "fecha" ? fecha || hoy : undefined)} />
            <span>{t.filtro[p]}</span>
          </label>
        ))}
      </div>

      {cuando === "fecha" && (
        <div className="filtros__campo agenda-filtrable__fecha">
          <label htmlFor={`${id}-fecha`}>{t.filtro.campoFecha}</label>
          <input id={`${id}-fecha`} type="date" value={soloDia(fecha) ? fecha : hoy} min={hoy}
            onChange={(e) => elegir("fecha", e.target.value)} />
        </div>
      )}

      <p className="catalogo__estado" aria-live="polite">
        <strong>{lista.length}</strong> {lista.length === 1 ? t.actividad : t.actividades}
      </p>

      {lista.length > 0 ? (
        <ul className="agenda-lista">
          {lista.map((o) => {
            const { dia, mes } = partesDeFecha(o.inicio, idioma);
            const estado = ESTADO[o.estado];
            return (
              <li key={`${o.evento}-${o.inicio}`}>
                <Link className={`agenda-item${o.estado === "cancelado" || o.estado === "suspendido" ? " agenda-item--apagado" : ""}`} href={o.url}>
                  <span className="evento__fecha" aria-hidden="true">
                    <span className="evento__mes">{mes}</span>
                    <span className="evento__dia">{dia}</span>
                  </span>
                  <span className="agenda-item__texto">
                    <span className="agenda-item__marcas">
                      {o.enCurso && o.estado !== "cancelado" && <Marca tipo="exito">{t.estado.enCurso}</Marca>}
                      {estado && <Marca tipo={estado}>{t.estado[o.estado]}</Marca>}
                      {o.fueraDeLaCiudad && <Marca tipo="alerta">{comun.ui.fueraDeLaCiudad}</Marca>}
                    </span>
                    <strong className="agenda-item__titulo">{o.titulo}</strong>
                    <span className="agenda-item__cuando">{formatearOcurrencia(o, idioma)}</span>
                    {(o.sede || o.lugar) && (
                      <span className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{o.sede || o.lugar}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="vacio">
          <h2>{t.vacio[cuando]}</h2>
          <p>{t.vacio.texto}</p>
          <div className="vacio__acciones">
            <Link className="boton boton--primario" href="/recorridos">{t.vacio.verRecorridos}</Link>
            {cuando !== "proximos" && (
              <button type="button" className="boton boton--claro" onClick={() => elegir("proximos")}>{t.vacio.verTodas}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
