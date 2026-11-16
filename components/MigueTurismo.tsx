"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { EVENTO_ABRIR_MIGUE } from "./AbrirMigue";
import { useIdioma, useTextos, Vinculo } from "./i18n/Idioma";

/**
 * Migue, el asistente de la Municipalidad, en el sitio de turismo: un botón en la esquina
 * inferior derecha que abre un chat.
 *
 * Habla con el backend de Migue (POST /api/turismo/chat). Migue contesta con lo que el sitio
 * publica (lo lee de /api/migue/contenido), las fichas de la Oficina de Informes y el Bus
 * Turístico, y las preguntas frecuentes de la Dirección de Turismo. Las respuestas pueden traer
 * botones que llevan a una página del sitio; Migue ya las controla contra las que existen y las
 * manda en español ("/lugares/x"): Vinculo las lleva al idioma de la página ("/en/places/x").
 * Migue contesta en el idioma en que le escriben; además se le dice en qué idioma está el sitio.
 *
 * Es público: no hay login. La charla se identifica con un id anónimo que vive en la pestaña
 * (sessionStorage) y se pierde al cerrarla.
 *
 * Se configura con NEXT_PUBLIC_MIGUE_URL (ej. https://migue.smt.gob.ar). Sin esa variable el
 * botón no aparece.
 */

const MIGUE_URL = String(process.env.NEXT_PUBLIC_MIGUE_URL || "").replace(/\/+$/, "");

type Accion = { tipo: "navegar"; ruta: string; etiqueta: string };
type Mensaje = { rol: "usuario" | "migue"; texto: string; acciones?: Accion[]; error?: boolean };

const CLAVE_SESION = "migue-turismo-sesion";
const CLAVE_CHARLA = "migue-turismo-charla";

function nuevoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = sessionStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento la charla dura lo que la página */
  }
}

/** Convierte las direcciones web del texto en enlaces, sin inyectar HTML. */
function ConEnlaces({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(https?:\/\/[^\s]+)/g).map((parte, i) => {
        if (!/^https?:\/\//.test(parte)) return <span key={i}>{parte}</span>;
        const url = parte.replace(/[.,;:!?)\]]+$/, "");
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
            {parte.slice(url.length)}
          </span>
        );
      })}
    </>
  );
}

export function MigueTurismo() {
  const t = useTextos().migue;
  const idioma = useIdioma();
  const [abierto, setAbierto] = useState(false);
  // La charla de esta pestaña sobrevive a una recarga. Se lee al crear el estado (no en un
  // efecto, que la pisaría con la lista vacía): el panel arranca cerrado, así que no cambia
  // lo que se ve al hidratar.
  const [mensajes, setMensajes] = useState<Mensaje[]>(() =>
    typeof window === "undefined" ? [] : leer<Mensaje[]>(CLAVE_CHARLA, []));
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const sesion = useRef("");
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    sesion.current = leer(CLAVE_SESION, "") || nuevoId();
    guardar(CLAVE_SESION, sesion.current);
  }, []);

  useEffect(() => {
    guardar(CLAVE_CHARLA, mensajes.filter((m) => !m.error).slice(-30));
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, esperando]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  // Otras partes del sitio (la burbuja de la portada) abren el chat con un evento.
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_MIGUE, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_MIGUE, abrir);
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    boton.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, cerrar]);

  const enviar = useCallback(async (consulta: string) => {
    const limpio = consulta.trim();
    if (!limpio || esperando) return;
    setTexto("");
    setMensajes((m) => [...m, { rol: "usuario", texto: limpio }]);
    setEsperando(true);
    try {
      const r = await fetch(`${MIGUE_URL}/api/turismo/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: limpio, sessionId: sesion.current, idioma }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || typeof datos.respuesta !== "string") {
        throw new Error(t.error);
      }
      setMensajes((m) => [...m, { rol: "migue", texto: datos.respuesta, acciones: Array.isArray(datos.acciones) ? datos.acciones : [] }]);
    } catch (e) {
      const aviso = e instanceof TypeError ? t.sinConexion : t.error;
      setMensajes((m) => [...m, { rol: "migue", texto: aviso, error: true }]);
    } finally {
      setEsperando(false);
    }
  }, [esperando, idioma, t]);

  const reiniciar = () => {
    sesion.current = nuevoId();
    guardar(CLAVE_SESION, sesion.current);
    setMensajes([]);
    campo.current?.focus();
  };

  if (!MIGUE_URL) return null;

  return (
    <div className="migue">
      {abierto && (
        <section id="migue-panel" className="migue__panel" role="dialog" aria-label={t.chat}>
          <header className="migue__cabecera">
            <img className="migue__avatar" src="/migue/migue-avatar.webp" alt="" width={40} height={40} />
            <div className="migue__titulo">
              <strong>Migue</strong>
              <span>{t.subtitulo}</span>
            </div>
            {mensajes.length > 0 && (
              <button type="button" className="migue__icono" onClick={reiniciar} aria-label={t.nueva} title={t.nuevaCorto}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
              </button>
            )}
            <button type="button" className="migue__icono" onClick={cerrar} aria-label={t.cerrar} title={t.cerrarCorto}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" /></svg>
            </button>
          </header>

          <div className="migue__mensajes" ref={lista} aria-live="polite">
            {mensajes.length === 0 && (
              <div className="migue__bienvenida">
                <p>{t.hola}</p>
                <p className="migue__aviso">{t.aviso}</p>
                <div className="migue__sugerencias">
                  {t.sugerencias.map((s) => (
                    <button type="button" key={s} onClick={() => enviar(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`migue__msj migue__msj--${m.rol}${m.error ? " migue__msj--error" : ""}`}>
                <p><ConEnlaces texto={m.texto} /></p>
                {m.acciones && m.acciones.length > 0 && (
                  <div className="migue__acciones">
                    {m.acciones.map((a) => (
                      <Vinculo key={a.ruta} href={a.ruta} onClick={() => { if (window.matchMedia("(max-width: 560px)").matches) setAbierto(false); }}>
                        {a.etiqueta}
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z" /></svg>
                      </Vinculo>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {esperando && (
              <div className="migue__msj migue__msj--migue migue__escribiendo" aria-label={t.escribiendo}>
                <span /><span /><span />
              </div>
            )}
          </div>

          <form className="migue__form" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
            <label className="visualmente-oculto" htmlFor="migue-campo">{t.escribile}</label>
            <textarea
              id="migue-campo"
              ref={campo}
              rows={1}
              maxLength={1000}
              value={texto}
              placeholder={t.placeholder}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
            />
            <button type="submit" className="migue__enviar" disabled={!texto.trim() || esperando} aria-label={t.enviar}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z" /></svg>
            </button>
          </form>
        </section>
      )}

      <button
        ref={boton}
        type="button"
        className={`migue__boton${abierto ? " migue__boton--abierto" : ""}`}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-controls="migue-panel"
        aria-label={abierto ? t.cerrar : t.abrir}
      >
        <img src="/migue/migue-avatar.webp" alt="" width={56} height={56} />
        {!abierto && <span className="migue__globo">{t.globo}</span>}
      </button>
    </div>
  );
}
