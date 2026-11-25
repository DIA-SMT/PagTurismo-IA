"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icono } from "@/components/Iconos";
import type { MensajeAsistente } from "@/lib/admin/ayuda";

const GUARDADO = "panel-asistente";
/** Los enlaces que puede poner el asistente: solo rutas internas del panel. */
const ENLACE_PERMITIDO = /^\/admin(\/[a-z0-9-]+)*\/?$/;
const ERRORES: Record<string, string> = {
  limite: "Hiciste muchas preguntas seguidas. Esperá unos minutos y volvé a probar.",
  "sin-ia": "El asistente no está disponible en este servidor (falta la clave de IA).",
  "sin-respuesta": "No pude responder ahora. Probá de nuevo en un momento.",
  sesion: "Tu sesión venció. Volvé a ingresar al panel.",
  red: "No hay conexión con el servidor. Probá de nuevo.",
};

/** Texto del asistente → nodos: enlaces internos [texto](/admin/...) y **negrita**; todo lo demás, texto plano. */
function formatear(texto: string): ReactNode[] {
  return texto.split("\n").map((original, i) => {
    const linea = original.replace(/^(\s*)[*-]\s+/, "$1• ");
    const partes: ReactNode[] = [];
    const patron = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
    let desde = 0;
    for (const m of linea.matchAll(patron)) {
      partes.push(linea.slice(desde, m.index));
      if (m[3]) partes.push(<strong key={partes.length}>{m[3]}</strong>);
      else if (ENLACE_PERMITIDO.test(m[2])) partes.push(<Link key={partes.length} href={m[2]}>{m[1]}</Link>);
      else partes.push(m[1]);
      desde = m.index! + m[0].length;
    }
    partes.push(linea.slice(desde));
    return <p key={i}>{partes}</p>;
  });
}

/**
 * Migue del panel: el asistente para usar el panel. Un botón flotante abre la charla; las respuestas salen de
 * /api/admin/asistente. La charla queda en esta pestaña (sessionStorage) y no se guarda en el servidor.
 */
export function AsistentePanel({ nombre, sugerencias }: { nombre: string; sugerencias: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    try { setMensajes(JSON.parse(sessionStorage.getItem(GUARDADO) ?? "[]")); } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(GUARDADO, JSON.stringify(mensajes.slice(-20))); } catch { /* sin almacenamiento */ }
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes, cargando]);
  useEffect(() => {
    if (!abierto) return;
    campo.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  async function preguntar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || cargando) return;
    const historial: MensajeAsistente[] = [...mensajes, { rol: "usuario", texto: limpia }];
    setMensajes(historial);
    setTexto("");
    setError("");
    setCargando(true);
    try {
      const r = await fetch("/api/admin/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: historial.slice(-10) }),
      });
      const datos = (await r.json()) as { respuesta?: string; error?: string };
      if (!r.ok || !datos.respuesta) setError(ERRORES[datos.error ?? ""] ?? ERRORES["sin-respuesta"]);
      else setMensajes([...historial, { rol: "asistente", texto: datos.respuesta }]);
    } catch {
      setError(ERRORES.red);
    } finally {
      setCargando(false);
      campo.current?.focus();
    }
  }

  return (
    <>
      <button type="button" className="adm-asistente__abrir" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto((x) => !x)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/migue/migue-avatar.webp" alt="" width={40} height={40} />
        <span>{abierto ? "Cerrar ayuda" : "¿Te ayudo?"}</span>
      </button>

      {abierto && (
        <section className="adm-asistente" id={id} role="dialog" aria-label="Migue del panel: ayuda para usar el panel">
          <header className="adm-asistente__cabecera">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/migue/migue-avatar.webp" alt="" width={36} height={36} />
            <div>
              <strong>Migue del panel</strong>
              <small>Te ayudo a usar y configurar el panel</small>
            </div>
            {mensajes.length > 0 && (
              <button type="button" className="adm-asistente__nueva" onClick={() => { setMensajes([]); setError(""); }}>Nueva charla</button>
            )}
            <button type="button" className="adm-asistente__cerrar" aria-label="Cerrar la ayuda" onClick={() => setAbierto(false)}>
              <Icono nombre="cerrar" tamano={18} />
            </button>
          </header>

          <div className="adm-asistente__charla" aria-live="polite">
            <div className="adm-asistente__msj adm-asistente__msj--migue">
              <p>¡Hola, {nombre.split(" ")[0]}! Preguntame cómo cargar, publicar o configurar cualquier cosa del panel. Respondo según tus permisos.</p>
            </div>
            {!mensajes.length && (
              <ul className="adm-asistente__sugerencias">
                {sugerencias.map((s) => (
                  <li key={s}><button type="button" onClick={() => preguntar(s)}>{s}</button></li>
                ))}
              </ul>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`adm-asistente__msj adm-asistente__msj--${m.rol === "usuario" ? "yo" : "migue"}`}>
                {m.rol === "usuario" ? <p>{m.texto}</p> : formatear(m.texto)}
              </div>
            ))}
            {cargando && <p className="adm-asistente__escribiendo">Migue está escribiendo…</p>}
            {error && <p className="adm-asistente__error" role="alert">{error}</p>}
            <div ref={fin} />
          </div>

          <form className="adm-asistente__form" onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
            <label htmlFor={`${id}-texto`} className="adm-oculto">Tu pregunta</label>
            <textarea id={`${id}-texto`} ref={campo} rows={2} maxLength={1500} value={texto} placeholder="Por ejemplo: ¿cómo cancelo una salida del bus?"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); preguntar(texto); } }} />
            <button type="submit" className="adm-boton" disabled={cargando || !texto.trim()} aria-label="Enviar la pregunta">
              <Icono nombre="flecha" tamano={18} />
            </button>
          </form>
          <p className="adm-asistente__aviso">Asistente con IA: puede equivocarse. No le compartas contraseñas ni datos personales.</p>
        </section>
      )}
    </>
  );
}
