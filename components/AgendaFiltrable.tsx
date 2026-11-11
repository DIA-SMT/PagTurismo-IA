"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { Icono } from "./Iconos";
import { Marca } from "./Ui";
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

const PESTANAS: { valor: Cuando; texto: string }[] = [
  { valor: "proximos", texto: "Próximos" },
  { valor: "hoy", texto: "Hoy" },
  { valor: "finde", texto: "Este fin de semana" },
  { valor: "fecha", texto: "Elegir fecha" },
];

const ESTADO: Record<OcurrenciaDeEvento["estado"], { texto: string; tipo: "exito" | "alerta" | "neutra" } | null> = {
  confirmado: null,
  reprogramado: { texto: "Reprogramado", tipo: "neutra" },
  suspendido: { texto: "Suspendido", tipo: "alerta" },
  cancelado: { texto: "Cancelado", tipo: "alerta" },
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
  const cuando: Cuando = PESTANAS.some((p) => p.valor === pedido) ? pedido! : "proximos";
  const [ahora, setAhora] = useState(ahoraServidor);
  const id = useId();

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
      <div className="segmentado segmentado--grande" role="radiogroup" aria-label="Cuándo">
        {PESTANAS.map((p) => (
          <label key={p.valor}>
            <input type="radio" name="cuando" value={p.valor} checked={cuando === p.valor}
              onChange={() => elegir(p.valor, p.valor === "fecha" ? fecha || hoy : undefined)} />
            <span>{p.texto}</span>
          </label>
        ))}
      </div>

      {cuando === "fecha" && (
        <div className="filtros__campo agenda-filtrable__fecha">
          <label htmlFor={`${id}-fecha`}>Fecha</label>
          <input id={`${id}-fecha`} type="date" value={soloDia(fecha) ? fecha : hoy} min={hoy}
            onChange={(e) => elegir("fecha", e.target.value)} />
        </div>
      )}

      <p className="catalogo__estado" aria-live="polite">
        <strong>{lista.length}</strong> {lista.length === 1 ? "actividad" : "actividades"}
      </p>

      {lista.length > 0 ? (
        <ul className="agenda-lista">
          {lista.map((o) => {
            const { dia, mes } = partesDeFecha(o.inicio);
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
                      {o.enCurso && o.estado !== "cancelado" && <Marca tipo="exito">En curso</Marca>}
                      {estado && <Marca tipo={estado.tipo}>{estado.texto}</Marca>}
                      {o.fueraDeLaCiudad && <Marca tipo="alerta">Fuera de la ciudad</Marca>}
                    </span>
                    <strong className="agenda-item__titulo">{o.titulo}</strong>
                    <span className="agenda-item__cuando">{formatearOcurrencia(o)}</span>
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
          <h2>Todavía no hay programación publicada para {cuando === "hoy" ? "hoy" : cuando === "finde" ? "este fin de semana" : cuando === "fecha" ? "esa fecha" : "las próximas semanas"}</h2>
          <p>Mientras tanto, la ciudad se puede recorrer todos los días: el Bus Turístico, el circuito a pie y los parques no dependen de la agenda.</p>
          <div className="vacio__acciones">
            <Link className="boton boton--primario" href="/recorridos">Ver recorridos</Link>
            {cuando !== "proximos" && (
              <button type="button" className="boton boton--claro" onClick={() => elegir("proximos")}>Ver todas las próximas fechas</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
