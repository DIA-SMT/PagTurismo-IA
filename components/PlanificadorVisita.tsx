"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icono } from "./Iconos";
import { Vinculo as Link, useIdioma } from "@/components/i18n/Idioma";
import { formatear } from "@/lib/i18n/definir";
import { LOCALE } from "@/lib/i18n/config";
import type { planificador } from "@/lib/i18n/textos/planificador";
import type { Compania, Plan, Ritmo } from "@/lib/planificador";

type Textos = (typeof planificador)["es"];

const RITMOS: Ritmo[] = ["tranquilo", "normal", "intenso"];
const COMPANIAS: Compania[] = ["solo", "pareja", "familia", "amigos", "mayores"];
const ICONO_TIPO: Record<string, string> = {
  lugar: "ubicacion", experiencia: "estrella", recorrido: "caminata", sabor: "plato", escapada: "brujula", evento: "calendario", bus: "bus-linea",
};
const GUARDADO = "turismo-plan-visita";

type Respuestas = {
  primeraVez: boolean | null; dias: number; llegada: string; compania: Compania; ritmo: Ritmo;
  intereses: string[]; gustos: string; movilidadReducida: boolean;
};

/**
 * Planificador de la visita (Planificá tu visita): un formulario corto y el itinerario que devuelve
 * /api/planifica/itinerario. El último plan queda en este navegador para no perderlo al recargar.
 */
export function PlanificadorVisita({ t, temas, hoy }: { t: Textos; temas: { id: string; titulo: string }[]; hoy: string }) {
  const idioma = useIdioma();
  const id = useId();
  const [r, setR] = useState<Respuestas>({
    primeraVez: null, dias: 2, llegada: hoy, compania: "pareja", ritmo: "normal", intereses: [], gustos: "", movilidadReducida: false,
  });
  const [estado, setEstado] = useState<"formulario" | "cargando" | "plan">("formulario");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Si ya había armado una visita en este navegador, se la mostramos.
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(GUARDADO) ?? "null") as { plan: Plan; respuestas: Respuestas } | null;
      if (guardado?.plan?.dias?.length && guardado.plan.dias.at(-1)!.fecha >= hoy) {
        setPlan(guardado.plan);
        setR(guardado.respuestas);
        setEstado("plan");
      }
    } catch { /* sin almacenamiento: no pasa nada */ }
  }, [hoy]);

  useEffect(() => {
    if (estado === "plan") titulo.current?.focus();
  }, [estado]);

  const cambiar = (parcial: Partial<Respuestas>) => setR((x) => ({ ...x, ...parcial }));
  const alternarInteres = (tema: string) =>
    cambiar({ intereses: r.intereses.includes(tema) ? r.intereses.filter((x) => x !== tema) : [...r.intereses, tema] });

  async function armar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEstado("cargando");
    try {
      const respuesta = await fetch("/api/planifica/itinerario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r, idioma }),
      });
      const datos = (await respuesta.json()) as { plan?: Plan; error?: keyof Textos["errores"] };
      if (!respuesta.ok || !datos.plan) {
        setError(t.errores[datos.error ?? "red"] ?? t.errores.red);
        setEstado("formulario");
        return;
      }
      setPlan(datos.plan);
      setEstado("plan");
      try { localStorage.setItem(GUARDADO, JSON.stringify({ plan: datos.plan, respuestas: r })); } catch { /* sin almacenamiento */ }
    } catch {
      setError(t.errores.red);
      setEstado("formulario");
    }
  }

  const fechaLarga = (dia: string) =>
    new Intl.DateTimeFormat(LOCALE[idioma].intl, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      .format(new Date(`${dia}T12:00:00Z`)).replace(/[   ]/g, " ");

  if (estado === "plan" && plan) {
    return (
      <section className="planificador planificador--plan" aria-labelledby={`${id}-plan`}>
        <div className="planificador__cabecera">
          <div>
            <p className="kicker">{t.tuVisita}</p>
            <h2 id={`${id}-plan`} ref={titulo} tabIndex={-1}>{plan.titulo}</h2>
            {plan.resumen && <p>{plan.resumen}</p>}
          </div>
          <div className="planificador__acciones">
            <button type="button" className="boton boton--claro" onClick={() => setEstado("formulario")}>
              <Icono nombre="lapiz" tamano={18} /> {t.otraVez}
            </button>
            <button type="button" className="boton boton--claro" onClick={() => window.print()}>
              <Icono nombre="descarga" tamano={18} /> {t.imprimir}
            </button>
          </div>
        </div>
        <p className={`planificador__aviso${plan.conIA ? "" : " planificador__aviso--sin-ia"}`}>
          <Icono nombre={plan.conIA ? "chispas" : "info"} tamano={18} /> {plan.conIA ? t.conIA : t.sinIA}
        </p>

        <ol className="planificador__dias">
          {plan.dias.map((d, i) => (
            <li key={d.fecha} className="planificador__dia">
              <h3>
                <span>{formatear(t.dia, { n: i + 1 })}</span> {fechaLarga(d.fecha)}
                {d.titulo && <small>{d.titulo}</small>}
              </h3>
              {d.actividades.length ? (
                <ol className="planificador__actividades">
                  {d.actividades.map((a, j) => (
                    <li key={j} className="planificador__actividad">
                      <span className="planificador__momento">
                        {t.momentos[a.momento]}{a.hora && <strong>{a.hora} h</strong>}
                      </span>
                      <div className="planificador__tarjeta">
                        {a.tipo && (
                          <span className="planificador__tipo"><Icono nombre={ICONO_TIPO[a.tipo] ?? "estrella"} tamano={14} /> {t.tipos[a.tipo]}</span>
                        )}
                        <strong className="planificador__titulo">
                          {a.url ? <Link href={a.url}>{a.titulo}</Link> : a.titulo}
                        </strong>
                        {a.detalle && <p>{a.detalle}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="planificador__libre">{t.sinActividades}</p>
              )}
            </li>
          ))}
        </ol>

        {plan.consejos.length > 0 && (
          <div className="planificador__consejos">
            <h3>{t.consejos}</h3>
            <ul>{plan.consejos.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="planificador" aria-labelledby={`${id}-titulo`}>
      <div className="planificador__intro">
        <p className="kicker">{t.kicker}</p>
        <h2 id={`${id}-titulo`}>{t.titulo}</h2>
        <p>{t.bajada}</p>
      </div>

      <form className="planificador__form" onSubmit={armar} aria-busy={estado === "cargando"}>
        <fieldset>
          <legend>{t.primeraVez}</legend>
          <div className="segmentado" role="radiogroup">
            {([true, false] as const).map((v) => (
              <label key={String(v)}>
                <input type="radio" name={`${id}-primera`} checked={r.primeraVez === v} onChange={() => cambiar({ primeraVez: v })} />
                <span>{v ? t.si : t.no}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="planificador__fila">
          <div className="filtros__campo">
            <label htmlFor={`${id}-dias`}>{t.dias}</label>
            <select id={`${id}-dias`} value={r.dias} onChange={(e) => cambiar({ dias: Number(e.target.value) })}>
              {t.opcionesDias.map((texto, i) => <option key={texto} value={i + 1}>{texto}</option>)}
            </select>
          </div>
          <div className="filtros__campo">
            <label htmlFor={`${id}-llegada`}>{t.llegada}</label>
            <input id={`${id}-llegada`} type="date" min={hoy} value={r.llegada} onChange={(e) => cambiar({ llegada: e.target.value || hoy })} />
          </div>
          <div className="filtros__campo">
            <label htmlFor={`${id}-compania`}>{t.compania}</label>
            <select id={`${id}-compania`} value={r.compania} onChange={(e) => cambiar({ compania: e.target.value as Compania })}>
              {COMPANIAS.map((c) => <option key={c} value={c}>{t.companias[c]}</option>)}
            </select>
          </div>
        </div>

        <fieldset>
          <legend>{t.ritmo}</legend>
          <div className="segmentado" role="radiogroup">
            {RITMOS.map((v) => (
              <label key={v}>
                <input type="radio" name={`${id}-ritmo`} checked={r.ritmo === v} onChange={() => cambiar({ ritmo: v })} />
                <span>{t.ritmos[v]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.intereses}</legend>
          <div className="planificador__intereses">
            {[...temas, { id: "agenda", titulo: t.interesesExtra.agenda }, { id: "bus", titulo: t.interesesExtra.bus }].map((k) => (
              <label key={k.id} className="planificador__interes">
                <input type="checkbox" checked={r.intereses.includes(k.id)} onChange={() => alternarInteres(k.id)} />
                <span>{k.titulo}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="filtros__campo">
          <label htmlFor={`${id}-gustos`}>{t.gustos}</label>
          <textarea id={`${id}-gustos`} rows={3} maxLength={500} value={r.gustos} aria-describedby={`${id}-gustos-ayuda`}
            onChange={(e) => cambiar({ gustos: e.target.value })} />
          <small id={`${id}-gustos-ayuda`} className="planificador__ayuda">{t.gustosAyuda} <span aria-hidden="true">({r.gustos.length}/500)</span></small>
        </div>

        <label className="filtros__check">
          <input type="checkbox" checked={r.movilidadReducida} onChange={(e) => cambiar({ movilidadReducida: e.target.checked })} />
          {t.movilidad}
        </label>

        {error && <p className="planificador__error" role="alert">{error}</p>}

        <div className="planificador__enviar">
          <button type="submit" className="boton boton--primario" disabled={estado === "cargando"}>
            <Icono nombre="chispas" tamano={18} /> {estado === "cargando" ? t.armando : t.armar}
          </button>
          <p aria-live="polite" className="planificador__cargando">{estado === "cargando" ? t.armandoDetalle : ""}</p>
        </div>
      </form>
    </section>
  );
}
