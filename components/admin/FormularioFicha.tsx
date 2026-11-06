"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";

import { Icono } from "@/components/Iconos";
import { MensajeAccion } from "@/components/admin/Piezas";
import { guardarConfiguracion, guardarFicha, subirFoto } from "@/app/admin/acciones";
import { estadoInicial, type EstadoAccion } from "@/lib/admin/acciones";
import { ESQUEMAS, ESQUEMA_SITIO, ESQUEMA_TEMAS, type Campo } from "@/lib/admin/esquemas";
import { slugDe } from "@/lib/admin/limpiar";

type Json = Record<string, unknown>;
type Ruta = (string | number)[];
export type Opciones = {
  fichas: Record<string, { slug: string; titulo: string; estado: string }[]>;
  temas: { id: string; titulo: string }[];
  etiquetas: { id: string; titulo: string }[];
};

const esquemaPorId = (id: string) => (id === "sitio" ? ESQUEMA_SITIO : id === "categorias" ? ESQUEMA_TEMAS : ESQUEMAS.find((e) => e.id === id)!);

function leerRuta(obj: unknown, ruta: Ruta): unknown {
  return ruta.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Json)[k as string] : undefined), obj);
}

function escribirRuta(obj: unknown, ruta: Ruta, valor: unknown): unknown {
  if (!ruta.length) return valor;
  const [k, ...resto] = ruta;
  if (typeof k === "number") {
    const lista = Array.isArray(obj) ? [...obj] : [];
    lista[k] = escribirRuta(lista[k], resto, valor);
    return lista;
  }
  const o = obj && typeof obj === "object" && !Array.isArray(obj) ? { ...(obj as Json) } : {};
  o[k] = escribirRuta(o[k], resto, valor);
  return o;
}

/**
 * Formulario de una ficha del panel. Todo el contenido viaja como JSON en un campo oculto y el
 * servidor lo revisa con el mismo esquema (lib/admin/limpiar.ts).
 *  - modo "ficha": colecciones con estado (borrador o publicado) y dirección (slug).
 *  - modo "configuracion": datos del sitio o temas y etiquetas.
 */
export function FormularioFicha({ esquemaId, modo, inicial, estado: estadoGuardado = "borrador", slugOriginal = "", opciones, rutaPublica, actualizado, lateralExtra }: {
  esquemaId: string;
  modo: "ficha" | "configuracion";
  inicial: Json;
  estado?: string;
  slugOriginal?: string;
  opciones: Opciones;
  rutaPublica?: string;
  actualizado?: ReactNode;
  lateralExtra?: ReactNode;
}) {
  const esquema = esquemaPorId(esquemaId);
  const [datos, setDatos] = useState<Json>(inicial);
  const [estado, setEstado] = useState(estadoGuardado);
  const [slug, setSlug] = useState(slugOriginal);
  const [slugTocado, setSlugTocado] = useState(!!slugOriginal);
  const [sucio, setSucio] = useState(false);
  const [resultado, enviar, enviando] = useActionState<EstadoAccion, FormData>(
    modo === "ficha" ? guardarFicha : guardarConfiguracion,
    estadoInicial,
  );
  const idFormulario = useId();
  const errores = resultado.errores ?? {};
  const nueva = modo === "ficha" && !slugOriginal;

  const cambiar = (ruta: Ruta, valor: unknown) => {
    setDatos((d) => escribirRuta(d, ruta, valor) as Json);
    setSucio(true);
  };

  // La dirección de una ficha nueva sigue al título hasta que alguien la edite.
  useEffect(() => {
    if (nueva && !slugTocado) setSlug(slugDe(String(datos.titulo ?? "")));
  }, [datos.titulo, nueva, slugTocado]);

  // Tras guardar bien, el formulario deja de estar "sucio".
  useEffect(() => {
    if (resultado.ok) setSucio(false);
  }, [resultado]);

  // Avisa antes de salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  // Con errores, lleva el foco al primer campo marcado.
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!resultado.errores) return;
    raiz.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [resultado]);

  const contexto: Contexto = { datos, cambiar, errores, opciones, coleccion: esquema.id };

  return (
    <div className="adm-grilla adm-grilla--ficha" ref={raiz}>
      <form id={idFormulario} action={enviar} className="adm-lista" noValidate>
        <input type="hidden" name="coleccion" value={esquema.id} />
        <input type="hidden" name="slugOriginal" value={modo === "configuracion" ? esquemaId : slugOriginal} />
        <input type="hidden" name="datos" value={JSON.stringify(datos)} />
        {modo === "ficha" && <input type="hidden" name="estado" value={estado} />}
        {modo === "ficha" && nueva && <input type="hidden" name="slug" value={slug} />}
        {esquema.secciones.map((s) => (
          <section className="adm-tarjeta" key={s.titulo}>
            <div className="adm-tarjeta__cabecera"><h2>{s.titulo}</h2></div>
            {s.descripcion && <p className="adm-tarjeta__descripcion">{s.descripcion}</p>}
            <div className="adm-campos">
              {s.campos.map((c) => <CampoFormulario key={c.nombre} campo={c} ruta={[c.nombre]} ctx={contexto} />)}
            </div>
          </section>
        ))}
      </form>

      <aside className="adm-lateral" aria-label="Guardar">
        <section className="adm-tarjeta">
          <div className="adm-tarjeta__cabecera"><h2>{modo === "ficha" ? "Publicación" : "Guardar"}</h2></div>
          <div className="adm-lista">
            {modo === "ficha" && (
              <div className="adm-campo">
                <label className="adm-campo__etiqueta" htmlFor={`${idFormulario}-estado`}>Estado</label>
                <select id={`${idFormulario}-estado`} value={estado} onChange={(e) => { setEstado(e.target.value); setSucio(true); }}>
                  <option value="borrador">Borrador (no se ve en el sitio)</option>
                  <option value="publicado">Publicado</option>
                </select>
                <span className="adm-campo__ayuda">Dejala en borrador hasta confirmar los datos operativos.</span>
              </div>
            )}
            {modo === "ficha" && (
              <div className="adm-campo">
                <label className="adm-campo__etiqueta" htmlFor={`${idFormulario}-slug`}>Dirección</label>
                {nueva ? (
                  <input id={`${idFormulario}-slug`} className="adm-input" value={slug} aria-invalid={!!errores.slug}
                    onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTocado(true); }} />
                ) : (
                  <input id={`${idFormulario}-slug`} className="adm-input" value={slug} readOnly aria-readonly="true" />
                )}
                <span className="adm-campo__ayuda">
                  {nueva ? "Se arma sola con el título. Después no se puede cambiar." : "Fija: otras fichas la usan para enlazar."}
                </span>
                {errores.slug && <span className="adm-campo__error">{errores.slug}</span>}
              </div>
            )}
            <MensajeAccion estado={resultado} />
            <button type="submit" form={idFormulario} className="adm-boton adm-boton--primario adm-boton--ancho" disabled={enviando}>
              <Icono nombre="check" tamano={18} />
              {enviando ? "Guardando…" : modo === "ficha" && estado === "publicado" ? "Guardar y publicar" : "Guardar"}
            </button>
            {sucio && !enviando && <span className="adm-campo__ayuda">Hay cambios sin guardar.</span>}
            {rutaPublica && (
              <Link className="adm-boton adm-boton--secundario adm-boton--ancho" href={rutaPublica} target="_blank">
                <Icono nombre="ojo" tamano={18} /> Ver en el sitio
              </Link>
            )}
            {actualizado}
          </div>
        </section>
        {lateralExtra}
      </aside>
    </div>
  );
}

type Contexto = {
  datos: Json;
  cambiar: (ruta: Ruta, valor: unknown) => void;
  errores: Record<string, string>;
  opciones: Opciones;
  coleccion: string;
};

const claveDe = (ruta: Ruta) => ruta.join(".");
const idDe = (ruta: Ruta) => `campo-${ruta.join("-")}`;

function Etiqueta({ campo, htmlFor }: { campo: Campo; htmlFor?: string }) {
  return (
    <label className="adm-campo__etiqueta" htmlFor={htmlFor}>
      {campo.etiqueta}
      {!campo.requerido && campo.tipo !== "booleano" && <small>(opcional)</small>}
    </label>
  );
}

function Pie({ campo, error, id }: { campo: Campo; error?: string; id: string }) {
  return (
    <>
      {campo.ayuda && campo.tipo !== "booleano" && <span className="adm-campo__ayuda" id={`${id}-ayuda`}>{campo.ayuda}</span>}
      {error && <span className="adm-campo__error" id={`${id}-error`}>{error}</span>}
    </>
  );
}

function CampoFormulario({ campo, ruta, ctx }: { campo: Campo; ruta: Ruta; ctx: Contexto }) {
  const valor = leerRuta(ctx.datos, ruta);
  const id = idDe(ruta);
  const error = ctx.errores[claveDe(ruta)];
  const clase = `adm-campo${campo.ancho === "medio" ? " adm-campo--medio" : ""}`;
  const describir = [campo.ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  const comunes = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describir };
  const texto = typeof valor === "string" || typeof valor === "number" ? String(valor) : "";

  switch (campo.tipo) {
    case "texto":
    case "url":
    case "correo":
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          <input {...comunes} className="adm-input" type={campo.tipo === "texto" ? "text" : campo.tipo === "url" ? "url" : "email"}
            value={texto} placeholder={campo.marcador} onChange={(e) => ctx.cambiar(ruta, e.target.value)} />
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    case "parrafo":
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          <textarea {...comunes} rows={campo.filas ?? 3} value={texto} onChange={(e) => ctx.cambiar(ruta, e.target.value)} />
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    case "numero":
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          <input {...comunes} className="adm-input" type="number" inputMode="decimal" step="any" min={campo.min} max={campo.max}
            value={texto} onChange={(e) => ctx.cambiar(ruta, e.target.value === "" ? undefined : e.target.value)} />
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    case "booleano":
      return (
        <div className={clase}>
          <label className="adm-casilla">
            <input type="checkbox" checked={valor === true} onChange={(e) => ctx.cambiar(ruta, e.target.checked)} />
            <span>{campo.etiqueta}{campo.ayuda && <small>{campo.ayuda}</small>}</span>
          </label>
        </div>
      );
    case "opciones":
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          <select {...comunes} value={texto} onChange={(e) => ctx.cambiar(ruta, e.target.value || undefined)}>
            {(!campo.requerido || !texto) && <option value="">—</option>}
            {campo.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    case "temas":
    case "etiquetas": {
      const lista = campo.tipo === "temas" ? ctx.opciones.temas : ctx.opciones.etiquetas;
      const elegidos = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <fieldset className={`${clase} adm-grupo`} style={{ background: "transparent", border: 0, padding: 0 }}>
          <legend className="adm-campo__etiqueta" style={{ padding: 0, marginBottom: "0.4rem" }}>{campo.etiqueta}</legend>
          <div className="adm-chips-seleccion">
            {lista.map((o) => (
              <label key={o.id}>
                <input type="checkbox" checked={elegidos.includes(o.id)}
                  onChange={(e) => ctx.cambiar(ruta, e.target.checked ? [...elegidos, o.id] : elegidos.filter((x) => x !== o.id))} />
                <span>{o.titulo}</span>
              </label>
            ))}
          </div>
          <Pie campo={campo} error={error} id={id} />
        </fieldset>
      );
    }
    case "relacion": {
      const fichas = ctx.opciones.fichas[campo.coleccion] ?? [];
      const nombre = (s: string) => {
        const f = fichas.find((x) => x.slug === s);
        return f ? `${f.titulo}${f.estado === "borrador" ? " (borrador)" : ""}` : s;
      };
      if (!campo.multiple) {
        return (
          <div className={clase}>
            <Etiqueta campo={campo} htmlFor={id} />
            <select {...comunes} value={texto} onChange={(e) => ctx.cambiar(ruta, e.target.value)}>
              <option value="">— Sin ficha —</option>
              {fichas.map((f) => <option key={f.slug} value={f.slug}>{nombre(f.slug)}</option>)}
            </select>
            <Pie campo={campo} error={error} id={id} />
          </div>
        );
      }
      const elegidos = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          {elegidos.length > 0 && (
            <ul className="adm-chips-seleccion" style={{ listStyle: "none", padding: 0, margin: "0 0 0.4rem" }}>
              {elegidos.map((s) => (
                <li key={s}>
                  <button type="button" className="adm-chip adm-chip--azul" style={{ border: 0, cursor: "pointer", font: "inherit", fontWeight: 700, fontSize: "0.85rem" }}
                    onClick={() => ctx.cambiar(ruta, elegidos.filter((x) => x !== s))}>
                    {nombre(s)} <Icono nombre="cerrar" tamano={12} /><span className="adm-oculto"> (quitar)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <select {...comunes} value="" onChange={(e) => e.target.value && ctx.cambiar(ruta, [...elegidos, e.target.value])}>
            <option value="">Agregar una ficha…</option>
            {fichas.filter((f) => !elegidos.includes(f.slug)).map((f) => <option key={f.slug} value={f.slug}>{nombre(f.slug)}</option>)}
          </select>
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    }
    case "imagen":
      return <CampoImagen campo={campo} ruta={ruta} ctx={ctx} />;
    case "fecha":
    case "fechaHora":
      return (
        <div className={clase}>
          <Etiqueta campo={campo} htmlFor={id} />
          <input {...comunes} className="adm-input" type={campo.tipo === "fecha" ? "date" : "datetime-local"}
            value={campo.tipo === "fechaHora" && /^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00` : texto}
            onChange={(e) => ctx.cambiar(ruta, e.target.value)} />
          <Pie campo={campo} error={error} id={id} />
        </div>
      );
    case "grupo":
      return (
        <fieldset className={`${clase} adm-grupo`}>
          <legend>{campo.etiqueta}</legend>
          {campo.ayuda && <p className="adm-campo__ayuda">{campo.ayuda}</p>}
          <div className="adm-campos">
            {campo.campos.map((c) => <CampoFormulario key={c.nombre} campo={c} ruta={[...ruta, c.nombre]} ctx={ctx} />)}
          </div>
          {error && <span className="adm-campo__error">{error}</span>}
        </fieldset>
      );
    case "lista":
      return <CampoLista campo={campo} ruta={ruta} ctx={ctx} />;
  }
}

function CampoLista({ campo, ruta, ctx }: { campo: Extract<Campo, { tipo: "lista" }>; ruta: Ruta; ctx: Contexto }) {
  const valor = leerRuta(ctx.datos, ruta);
  const filas = Array.isArray(valor) ? (valor as Json[]) : [];
  const error = ctx.errores[claveDe(ruta)];
  const mover = (desde: number, hasta: number) => {
    const nuevas = [...filas];
    const [f] = nuevas.splice(desde, 1);
    nuevas.splice(hasta, 0, f);
    ctx.cambiar(ruta, nuevas);
  };
  return (
    <fieldset className="adm-campo adm-grupo" style={{ background: "transparent" }}>
      <legend>{campo.etiqueta} <small style={{ color: "var(--a-gris)", fontWeight: 500 }}>({filas.length})</small></legend>
      {campo.ayuda && <p className="adm-campo__ayuda">{campo.ayuda}</p>}
      <div className="adm-lista">
        {filas.length === 0 && <p className="adm-lista__vacia">Todavía no hay elementos.</p>}
        {filas.map((f, i) => {
          const resumen = campo.resumen ? String(f?.[campo.resumen] ?? "") : "";
          return (
            <div className="adm-lista__item" key={i}>
              <div className="adm-lista__cabecera">
                <span className="adm-lista__numero">{i + 1}</span>
                <span className="adm-lista__resumen">{resumen || "Sin completar"}</span>
                <button type="button" className="adm-boton adm-boton--secundario adm-boton--icono" disabled={i === 0}
                  onClick={() => mover(i, i - 1)} aria-label={`Subir el elemento ${i + 1}`}><Icono nombre="arriba" tamano={16} /></button>
                <button type="button" className="adm-boton adm-boton--secundario adm-boton--icono" disabled={i === filas.length - 1}
                  onClick={() => mover(i, i + 1)} aria-label={`Bajar el elemento ${i + 1}`}><Icono nombre="abajo" tamano={16} /></button>
                <button type="button" className="adm-boton adm-boton--peligro adm-boton--icono"
                  onClick={() => ctx.cambiar(ruta, filas.filter((_, j) => j !== i))} aria-label={`Quitar el elemento ${i + 1}`}><Icono nombre="basura" tamano={16} /></button>
              </div>
              <div className="adm-lista__cuerpo adm-campos">
                {campo.campos.map((c) => <CampoFormulario key={c.nombre} campo={c} ruta={[...ruta, i, c.nombre]} ctx={ctx} />)}
              </div>
            </div>
          );
        })}
        <div>
          <button type="button" className="adm-boton adm-boton--secundario adm-boton--chico" onClick={() => ctx.cambiar(ruta, [...filas, {}])}>
            <Icono nombre="mas" tamano={16} /> {campo.textoAgregar}
          </button>
        </div>
      </div>
      {error && <span className="adm-campo__error">{error}</span>}
    </fieldset>
  );
}

function CampoImagen({ campo, ruta, ctx }: { campo: Campo; ruta: Ruta; ctx: Contexto }) {
  const imagen = (leerRuta(ctx.datos, ruta) ?? {}) as Json;
  const src = typeof imagen.src === "string" ? imagen.src : "";
  const [subiendo, iniciar] = useTransition();
  const [problema, setProblema] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const id = idDe(ruta);
  const error = ctx.errores[claveDe(ruta)] ?? ctx.errores[`${claveDe(ruta)}.src`];
  const cambiar = (k: string, v: string) => ctx.cambiar([...ruta, k], v);

  const elegir = (f: File | undefined) => {
    if (!f) return;
    setProblema("");
    const datos = new FormData();
    datos.set("archivo", f);
    datos.set("coleccion", ctx.coleccion);
    iniciar(async () => {
      const r = await subirFoto(datos);
      if (r.error) setProblema(r.error);
      else if (r.src) ctx.cambiar(ruta, { ...imagen, src: r.src, credito: imagen.credito ?? "", permiso: imagen.permiso ?? "" });
      if (archivo.current) archivo.current.value = "";
    });
  };

  const textoDe = (k: string) => (typeof imagen[k] === "string" ? (imagen[k] as string) : "");

  return (
    <fieldset className="adm-campo adm-grupo">
      <legend>{campo.etiqueta}{!campo.requerido && <small style={{ color: "var(--a-gris)", fontWeight: 500 }}> (opcional)</small>}</legend>
      <div className="adm-imagen">
        <div className="adm-imagen__vista">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" /> : <span className="adm-imagen__vacia"><Icono nombre="subir" tamano={28} /></span>}
        </div>
        <div className="adm-campos">
          <div className="adm-imagen__acciones">
            <label className="adm-boton adm-boton--secundario adm-boton--chico" style={{ cursor: subiendo ? "wait" : "pointer" }}>
              <Icono nombre="subir" tamano={16} /> {subiendo ? "Subiendo…" : src ? "Cambiar foto" : "Subir foto"}
              <input ref={archivo} type="file" accept="image/jpeg,image/png,image/webp" className="adm-oculto" disabled={subiendo}
                onChange={(e) => elegir(e.target.files?.[0])} />
            </label>
            {src && (
              <button type="button" className="adm-boton adm-boton--peligro adm-boton--chico" onClick={() => ctx.cambiar(ruta, undefined)}>
                Quitar
              </button>
            )}
            <span className="adm-campo__ayuda">JPG, PNG o WebP, hasta 4 MB. Se le quitan los datos de ubicación.</span>
          </div>
          {problema && <span className="adm-campo__error" role="alert">{problema}</span>}
          {error && <span className="adm-campo__error">{error}</span>}
          <div className="adm-campo">
            <label className="adm-campo__etiqueta" htmlFor={`${id}-alt`}>Texto alternativo</label>
            <input id={`${id}-alt`} className="adm-input" value={textoDe("alt")} onChange={(e) => cambiar("alt", e.target.value)}
              placeholder="Qué se ve en la foto" />
            <span className="adm-campo__ayuda">Para quien no ve la imagen. Vacío solo si es decorativa.</span>
          </div>
          <div className="adm-campo adm-campo--medio">
            <label className="adm-campo__etiqueta" htmlFor={`${id}-credito`}>Autor o crédito</label>
            <input id={`${id}-credito`} className="adm-input" value={textoDe("credito")} onChange={(e) => cambiar("credito", e.target.value)} />
          </div>
          <div className="adm-campo adm-campo--medio">
            <label className="adm-campo__etiqueta" htmlFor={`${id}-permiso`}>Procedencia y permiso</label>
            <input id={`${id}-permiso`} className="adm-input" value={textoDe("permiso")} onChange={(e) => cambiar("permiso", e.target.value)} />
          </div>
        </div>
      </div>
    </fieldset>
  );
}

/** Formulario chico para borrar una ficha, con confirmación. */
export function FormularioBorrar({ coleccion, slug, accion }: {
  coleccion: string;
  slug: string;
  accion: (previo: EstadoAccion, form: FormData) => Promise<EstadoAccion>;
}) {
  const [resultado, enviar, enviando] = useActionState(accion, estadoInicial);
  const id = useId();
  return (
    <section className="adm-tarjeta">
      <div className="adm-tarjeta__cabecera"><h2>Borrar</h2></div>
      <form action={enviar} className="adm-lista">
        <input type="hidden" name="coleccion" value={coleccion} />
        <input type="hidden" name="slug" value={slug} />
        <p className="adm-campo__ayuda">Si solo querés sacarla del sitio, pasala a borrador. Borrar no se puede deshacer (queda en la auditoría).</p>
        <label className="adm-casilla" htmlFor={id}>
          <input id={id} type="checkbox" name="confirmar" value="si" />
          <span>Sí, quiero borrar esta ficha</span>
        </label>
        <MensajeAccion estado={resultado} />
        <button type="submit" className="adm-boton adm-boton--peligro adm-boton--ancho" disabled={enviando}>
          <Icono nombre="basura" tamano={18} /> {enviando ? "Borrando…" : "Borrar ficha"}
        </button>
      </form>
    </section>
  );
}

