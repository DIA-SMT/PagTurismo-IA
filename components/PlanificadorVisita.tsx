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
/** Espacios especiales de Intl (cambian según el motor): se pasan a espacios comunes. */
const ESPACIOS = new RegExp(`[${String.fromCharCode(0xa0, 0x2009, 0x202f)}]`, "g");

/** Una pregunta por paso; las de una sola respuesta avanzan solas al elegir. */
const PASOS = ["primera", "dias", "llegada", "compania", "ritmo", "intereses", "gustos"] as const;
type Paso = (typeof PASOS)[number];

type Respuestas = {
  primeraVez: boolean | null; dias: number; llegada: string; compania: Compania; ritmo: Ritmo;
  intereses: string[]; gustos: string; movilidadReducida: boolean;
};

const sumarDia = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};

/**
 * Planificador de la visita (Planificá tu visita): una pregunta por vez en una tarjeta compacta y el
 * itinerario que devuelve /api/planifica/itinerario. El último plan queda en este navegador.
 */
export function PlanificadorVisita({ t, temas, hoy }: { t: Textos; temas: { id: string; titulo: string }[]; hoy: string }) {
  const idioma = useIdioma();
  const id = useId();
  const manana = sumarDia(hoy, 1);
  const [r, setR] = useState<Respuestas>({
    primeraVez: null, dias: 2, llegada: hoy, compania: "pareja", ritmo: "normal", intereses: [], gustos: "", movilidadReducida: false,
  });
  const [paso, setPaso] = useState(0);
  const [otraFecha, setOtraFecha] = useState(false);
  const [estado, setEstado] = useState<"formulario" | "cargando" | "plan">("formulario");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const pregunta = useRef<HTMLHeadingElement>(null);
  const movio = useRef(false);

  // Si ya había armado una visita en este navegador, se la mostramos.
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(GUARDADO) ?? "null") as { plan: Plan; respuestas: Respuestas } | null;
      if (guardado?.plan?.dias?.length && guardado.plan.dias.at(-1)!.fecha >= hoy) {
        setPlan(guardado.plan);
        setR({ ...guardado.respuestas, llegada: guardado.respuestas.llegada < hoy ? hoy : guardado.respuestas.llegada });
        setEstado("plan");
      }
    } catch { /* sin almacenamiento: no pasa nada */ }
  }, [hoy]);

  useEffect(() => {
    if (estado === "plan") titulo.current?.focus();
  }, [estado]);

  // Al cambiar de paso, el foco va a la pregunta nueva (salvo al cargar la página).
  useEffect(() => {
    if (movio.current) pregunta.current?.focus();
  }, [paso]);

  const cambiar = (parcial: Partial<Respuestas>) => setR((x) => ({ ...x, ...parcial }));
  const irA = (n: number) => { movio.current = true; setPaso(Math.max(0, Math.min(PASOS.length - 1, n))); };
  const elegir = (parcial: Partial<Respuestas>) => { cambiar(parcial); irA(paso + 1); };
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
      .format(new Date(`${dia}T12:00:00Z`)).replace(ESPACIOS, " ");

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
            <button type="button" className="boton boton--claro" onClick={() => { setEstado("formulario"); setPaso(PASOS.length - 1); }}>
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

  const actual: Paso = PASOS[paso];
  const opcion = (clave: string, texto: string, elegida: boolean, alElegir: () => void) => (
    <button key={clave} type="button" className="planificador__opcion" aria-pressed={elegida} onClick={alElegir}>{texto}</button>
  );
  const preguntas: Record<Paso, string> = {
    primera: t.primeraVez, dias: t.dias, llegada: t.llegada, compania: t.compania, ritmo: t.ritmo, intereses: t.intereses, gustos: t.gustos,
  };

  return (
    <section className="planificador planificador--pasos" aria-labelledby={`${id}-titulo`}>
      <div className="planificador__intro">
        <p className="kicker">{t.kicker}</p>
        <h2 id={`${id}-titulo`}>{t.titulo}</h2>
        <p>{t.bajada}</p>
      </div>

      <form className="planificador__paso" onSubmit={armar} aria-busy={estado === "cargando"}>
        <div className="planificador__progreso">
          {paso > 0 ? (
            <button type="button" className="planificador__atras" onClick={() => irA(paso - 1)}>
              <Icono nombre="flecha-izq" tamano={16} /> {t.atras}
            </button>
          ) : <span><Icono nombre="chispas" tamano={16} /> {t.kicker}</span>}
          <span aria-live="polite">{formatear(t.pasoDe, { n: paso + 1, total: PASOS.length })}</span>
        </div>
        <div className="planificador__barra" aria-hidden="true"><span style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} /></div>

        <h3 className="planificador__pregunta" ref={pregunta} tabIndex={-1} id={`${id}-pregunta`}>{preguntas[actual]}</h3>

        <div className="planificador__opciones" role="group" aria-labelledby={`${id}-pregunta`}>
          {actual === "primera" && [
            opcion("si", t.si, r.primeraVez === true, () => elegir({ primeraVez: true })),
            opcion("no", t.no, r.primeraVez === false, () => elegir({ primeraVez: false })),
          ]}
          {actual === "dias" && t.opcionesDias.map((texto, i) => opcion(String(i), texto, r.dias === i + 1, () => elegir({ dias: i + 1 })))}
          {actual === "llegada" && (
            <>
              {opcion("hoy", t.hoy, !otraFecha && r.llegada === hoy, () => { setOtraFecha(false); elegir({ llegada: hoy }); })}
              {opcion("manana", t.manana, !otraFecha && r.llegada === manana, () => { setOtraFecha(false); elegir({ llegada: manana }); })}
              {opcion("otra", t.otraFecha, otraFecha || (r.llegada !== hoy && r.llegada !== manana), () => setOtraFecha(true))}
              {(otraFecha || (r.llegada !== hoy && r.llegada !== manana)) && (
                <div className="planificador__fecha">
                  <label htmlFor={`${id}-fecha`} className="visualmente-oculto">{t.llegada}</label>
                  <input id={`${id}-fecha`} type="date" min={hoy} value={r.llegada} onChange={(e) => cambiar({ llegada: e.target.value || hoy })} />
                  <button type="button" className="boton boton--primario" onClick={() => irA(paso + 1)}>{t.seguir}</button>
                </div>
              )}
            </>
          )}
          {actual === "compania" && COMPANIAS.map((c) => opcion(c, t.companias[c], r.compania === c, () => elegir({ compania: c })))}
          {actual === "ritmo" && RITMOS.map((v) => opcion(v, t.ritmos[v], r.ritmo === v, () => elegir({ ritmo: v })))}
          {actual === "intereses" && (
            <>
              {[...temas, { id: "agenda", titulo: t.interesesExtra.agenda }, { id: "bus", titulo: t.interesesExtra.bus }]
                .map((k) => opcion(k.id, k.titulo, r.intereses.includes(k.id), () => alternarInteres(k.id)))}
              <p className="planificador__ayuda">{t.variosIntereses}</p>
              <div className="planificador__siguiente">
                <button type="button" className="boton boton--primario" onClick={() => irA(paso + 1)}>
                  {r.intereses.length ? t.seguir : t.saltar} <Icono nombre="flecha" tamano={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {actual === "gustos" && (
          <div className="planificador__final">
            <label htmlFor={`${id}-gustos`} className="visualmente-oculto">{t.gustos}</label>
            <textarea id={`${id}-gustos`} rows={3} maxLength={500} value={r.gustos} placeholder={t.gustosEjemplo}
              aria-describedby={`${id}-gustos-ayuda`} onChange={(e) => cambiar({ gustos: e.target.value })} />
            <small id={`${id}-gustos-ayuda`} className="planificador__ayuda">{t.gustosAyuda} <span aria-hidden="true">({r.gustos.length}/500)</span></small>
            <label className="filtros__check">
              <input type="checkbox" checked={r.movilidadReducida} onChange={(e) => cambiar({ movilidadReducida: e.target.checked })} />
              {t.movilidad}
            </label>
            {error && <p className="planificador__error" role="alert">{error}</p>}
            <button type="submit" className="boton boton--primario" disabled={estado === "cargando"}>
              <Icono nombre="chispas" tamano={18} /> {estado === "cargando" ? t.armando : t.armar}
            </button>
            <p aria-live="polite" className="planificador__cargando">{estado === "cargando" ? t.armandoDetalle : ""}</p>
          </div>
        )}
      </form>
    </section>
  );
}
