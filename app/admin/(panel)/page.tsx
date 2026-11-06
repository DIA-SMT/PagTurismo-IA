import type { Metadata } from "next";
import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { Banda, Chip, Dato, Tarjeta, fechaCorta } from "@/components/admin/Piezas";
import { camposCambiados, describirCambio, humanizar, todasLasFichas, ultimosCambios } from "@/lib/admin/datos";
import { ESQUEMAS } from "@/lib/admin/esquemas";
import { requerirAdmin } from "@/lib/admin/sesion";
import { formatearOcurrencia, ocurrenciasVigentes } from "@/lib/fechas";
import { normalizarEvento } from "@/lib/normalizar";
import { validarFilas } from "@/lib/validar";
import fs from "node:fs";
import path from "node:path";

export const metadata: Metadata = { title: "Tablero" };

const ACCION: Record<string, string> = { insert: "Alta", update: "Cambio", delete: "Baja" };

/** Una imagen existe si es una dirección externa, una foto subida o un archivo de public/. */
function existeImagen(src: string) {
  if (/^https?:\/\//.test(src) || src.startsWith("/subidas/")) return true;
  return fs.existsSync(path.join(process.cwd(), "public", src));
}

export default async function Tablero() {
  const admin = await requerirAdmin();
  const [filas, cambios] = await Promise.all([todasLasFichas(admin), ultimosCambios(admin, { limite: 8 })]);
  const ahora = Date.now();

  const fichas = filas.filter((f) => f.coleccion !== "configuracion");
  const publicadas = fichas.filter((f) => f.estado === "publicado").length;
  const borradores = fichas.length - publicadas;
  const { errores, avisos, resumen } = validarFilas(filas, { existeImagen, ahora });

  const eventos = filas.filter((f) => f.coleccion === "eventos").map((f) => normalizarEvento({ ...f.datos, estado: f.estado }, f.slug));
  const proximas = ocurrenciasVigentes(eventos, ahora).filter((o) => o.estado !== "cancelado");
  const tituloEvento = new Map(eventos.map((e) => [e.slug, e.titulo]));

  return (
    <>
      <Banda
        titulo="Tablero"
        bajada="Cómo está el contenido del portal. Los números se calculan cada vez que abrís esta página."
        acciones={<Link className="adm-boton adm-boton--claro" href="/" target="_blank"><Icono nombre="ojo" tamano={18} /> Ver el sitio</Link>}
      />

      <dl className="adm-datos">
        <Dato icono="check" etiqueta="Fichas publicadas" valor={publicadas} detalle={`De ${fichas.length} fichas cargadas.`} />
        <Dato icono="lapiz" tono="amarillo" etiqueta="Borradores" valor={borradores}
          detalle="No se ven en el sitio hasta que alguien las publique." href="/admin/lugares?estado=borrador" />
        <Dato icono="calendario" etiqueta="Próximas fechas" valor={proximas.length}
          detalle={proximas.length ? "Fechas confirmadas en la agenda." : "No hay fechas confirmadas: la agenda muestra el calendario anual."} href="/admin/eventos" />
        <Dato icono="info" tono="ambar" etiqueta="Para revisar" valor={errores.length + avisos.length}
          detalle={errores.length ? `${errores.length} con errores.` : "Sin errores."} />
      </dl>

      <div className="adm-grilla">
        <Tarjeta titulo="Para revisar" icono="info">
          {errores.length + avisos.length === 0 ? (
            <p>Todo en orden.</p>
          ) : (
            <ul className="adm-renglones">
              {errores.slice(0, 6).map((e) => (
                <li key={e}><span className="adm-renglones__punto adm-renglones__punto--rojo" aria-hidden="true" /><span><strong>Error:</strong> {humanizar(e, filas)}</span></li>
              ))}
              {avisos.slice(0, Math.max(0, 10 - Math.min(errores.length, 6))).map((a) => (
                <li key={a}><span className="adm-renglones__punto" aria-hidden="true" /><span>{humanizar(a, filas)}</span></li>
              ))}
              {errores.length + avisos.length > 10 && (
                <li><span className="adm-renglones__punto adm-renglones__punto--azul" aria-hidden="true" /><span>Y {errores.length + avisos.length - 10} más.</span></li>
              )}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Últimos cambios" icono="auditoria" acciones={<Link href="/admin/auditoria" className="adm-boton adm-boton--secundario adm-boton--chico">Ver todo</Link>}>
          {cambios.length === 0 ? (
            <p>Todavía no hay cambios registrados.</p>
          ) : (
            <ul className="adm-renglones">
              {cambios.map((c) => {
                const { titulo, href } = describirCambio(c);
                const campos = c.accion === "update" ? camposCambiados(c) : [];
                return (
                  <li key={c.id}>
                    <span className="adm-renglones__punto adm-renglones__punto--azul" aria-hidden="true" />
                    <span>
                      <strong>{ACCION[c.accion] ?? c.accion}</strong> · {href ? <Link href={href}>{titulo}</Link> : titulo}
                      {campos.length > 0 && <> — {campos.slice(0, 4).join(", ")}{campos.length > 4 ? "…" : ""}</>}
                      <small>{fechaCorta(c.ocurrido_at)} · {c.actor_nombre ?? (c.actor_tipo === "sistema" ? "Carga inicial" : "Equipo")}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="adm-grilla">
        <Tarjeta titulo="Contenido por sección" icono="tablero">
          <div className="adm-tabla-caja" style={{ boxShadow: "none" }}>
            <table className="adm-tabla" style={{ minWidth: 0 }}>
              <thead><tr><th scope="col">Sección</th><th scope="col">Publicadas</th><th scope="col">Borradores</th><th scope="col"><span className="adm-oculto">Acciones</span></th></tr></thead>
              <tbody>
                {ESQUEMAS.map((e) => (
                  <tr key={e.id}>
                    <th scope="row" style={{ background: "transparent", textTransform: "none", letterSpacing: 0, fontSize: "0.95rem", color: "var(--a-tinta)" }}>
                      <Link className="adm-tabla__titulo" href={`/admin/${e.id}`}>{e.titulo}</Link>
                    </th>
                    <td>{resumen[e.id]?.publicadas ?? 0}</td>
                    <td>{resumen[e.id]?.borradores ? <Chip tono="ambar">{resumen[e.id].borradores}</Chip> : 0}</td>
                    <td><div className="adm-tabla__acciones"><Link className="adm-boton adm-boton--secundario adm-boton--chico" href={`/admin/${e.id}/nueva`}><Icono nombre="mas" tamano={14} /> {e.singular}</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Próximas fechas de la agenda" icono="calendario" acciones={<Link href="/admin/eventos/nueva" className="adm-boton adm-boton--secundario adm-boton--chico"><Icono nombre="mas" tamano={14} /> Evento</Link>}>
          {proximas.length === 0 ? (
            <p>No hay fechas confirmadas. Cuando se confirme un evento, cargalo en <Link href="/admin/eventos">Agenda</Link> con su fecha y hora.</p>
          ) : (
            <ul className="adm-renglones">
              {proximas.slice(0, 6).map((o) => (
                <li key={`${o.evento}-${o.inicio}`}>
                  <span className="adm-renglones__punto adm-renglones__punto--azul" aria-hidden="true" />
                  <span>
                    <Link href={`/admin/eventos/${o.evento}`}>{tituloEvento.get(o.evento)}</Link>
                    <small>{formatearOcurrencia(o)}{o.estado !== "confirmado" ? ` · ${o.estado}` : ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
