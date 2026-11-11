import type { Metadata } from "next";
import Link from "next/link";

import { Banda, Chip, Vacio, fechaCorta } from "@/components/admin/Piezas";
import { camposCambiados, describirCambio, ultimosCambios } from "@/lib/admin/datos";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Auditoría" };

const POR_PAGINA = 50;
const ACCION = {
  insert: { texto: "Alta", tono: "verde" },
  update: { texto: "Cambio", tono: "azul" },
  delete: { texto: "Baja", tono: "rojo" },
} as const;

/** Registro de cambios. Lo escribe la base con un disparador: no se puede editar ni borrar. */
export default async function Auditoria({ searchParams }: PageProps<"/admin/auditoria">) {
  const admin = await requerirAdmin();
  const pagina = Math.max(1, Number((await searchParams).pagina) || 1);
  const cambios = await ultimosCambios(admin, { limite: POR_PAGINA + 1, desde: (pagina - 1) * POR_PAGINA });
  const hayMas = cambios.length > POR_PAGINA;

  return (
    <>
      <Banda titulo="Auditoría" bajada="Cada alta, cambio o baja de una ficha queda registrada con la fecha, la persona y qué cambió. El registro no se puede modificar." />
      {cambios.length === 0 ? (
        <Vacio titulo="Todavía no hay cambios" icono="auditoria" />
      ) : (
        <div className="adm-tabla-caja" role="region" aria-label="Cambios registrados" tabIndex={0}>
          <table className="adm-tabla">
            <thead>
              <tr><th scope="col">Fecha</th><th scope="col">Quién</th><th scope="col">Acción</th><th scope="col">Ficha</th><th scope="col">Qué cambió</th></tr>
            </thead>
            <tbody>
              {cambios.slice(0, POR_PAGINA).map((c) => {
                const accion = ACCION[c.accion as keyof typeof ACCION] ?? { texto: c.accion, tono: "gris" as const };
                const { titulo, seccion, href } = describirCambio(c);
                const campos = c.accion === "update" ? camposCambiados(c) : [];
                return (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fechaCorta(c.ocurrido_at)}</td>
                    <td>{c.actor_nombre ?? (c.actor_tipo === "sistema" ? "Carga inicial" : "Equipo")}</td>
                    <td><Chip tono={accion.tono}>{accion.texto}</Chip></td>
                    <td>
                      {href
                        ? <Link className="adm-tabla__titulo" href={href}>{titulo}</Link>
                        : <span className="adm-tabla__titulo">{titulo}</span>}
                      <span className="adm-tabla__sub">{seccion}</span>
                    </td>
                    <td>{campos.length ? campos.join(", ") : <span className="adm-tabla__sub">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <nav style={{ display: "flex", gap: "0.75rem" }} aria-label="Páginas">
        {pagina > 1 && <Link className="adm-boton adm-boton--secundario" href={`/admin/auditoria?pagina=${pagina - 1}`}>Más recientes</Link>}
        {hayMas && <Link className="adm-boton adm-boton--secundario" href={`/admin/auditoria?pagina=${pagina + 1}`}>Más antiguos</Link>}
      </nav>
    </>
  );
}
