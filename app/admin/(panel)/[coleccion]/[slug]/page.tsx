import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioBorrar, FormularioFicha } from "@/components/admin/FormularioFicha";
import { Aviso, Banda, ChipEstado, Tarjeta, fechaCorta } from "@/components/admin/Piezas";
import { borrarFicha } from "@/app/admin/acciones";
import { camposCambiados, fichaDe, opcionesDeFormulario, todasLasFichas, ultimosCambios } from "@/lib/admin/datos";
import { esquemaDe } from "@/lib/admin/esquemas";
import { requerirAdmin } from "@/lib/admin/sesion";

export async function generateMetadata({ params }: PageProps<"/admin/[coleccion]/[slug]">): Promise<Metadata> {
  const { coleccion, slug } = await params;
  return { title: `${slug} · ${esquemaDe(coleccion)?.titulo ?? ""}` };
}

const ACCION: Record<string, string> = { insert: "Alta", update: "Cambio", delete: "Baja" };

export default async function EditarFicha({ params, searchParams }: PageProps<"/admin/[coleccion]/[slug]">) {
  const admin = await requerirAdmin();
  const { coleccion, slug } = await params;
  const esquema = esquemaDe(coleccion);
  if (!esquema) notFound();
  const [ficha, filas, historial] = await Promise.all([
    fichaDe(admin, esquema.id, slug),
    todasLasFichas(admin),
    ultimosCambios(admin, { limite: 6, registro: `${esquema.id}/${slug}` }),
  ]);
  if (!ficha) notFound();
  const sp = await searchParams;
  const titulo = String(ficha.datos.titulo ?? slug);

  return (
    <>
      <Banda
        titulo={titulo}
        migas={[{ href: `/admin/${esquema.id}`, texto: esquema.titulo }]}
        bajada={<>Editando {esquema.singular} · <ChipEstado estado={ficha.estado} /></>}
      />
      {sp.creada === "1" && <Aviso tono="ok">La ficha se creó. Seguí completándola y guardá cuando quieras.</Aviso>}

      <FormularioFicha
        esquemaId={esquema.id}
        modo="ficha"
        inicial={ficha.datos}
        estado={ficha.estado}
        slugOriginal={ficha.slug}
        opciones={opcionesDeFormulario(filas)}
        rutaPublica={esquema.rutaPublica?.(ficha.slug)}
        actualizado={
          <p className="adm-campo__ayuda">
            Último cambio: {fechaCorta(ficha.actualizado_at)}, por {ficha.actualizado_por_nombre ?? "la carga inicial"}.
          </p>
        }
        lateralExtra={
          <>
            <Tarjeta titulo="Historial">
              {historial.length === 0 ? <p className="adm-campo__ayuda">Sin cambios registrados.</p> : (
                <ul className="adm-renglones">
                  {historial.map((c) => {
                    const campos = c.accion === "update" ? camposCambiados(c) : [];
                    return (
                      <li key={c.id}>
                        <span className="adm-renglones__punto adm-renglones__punto--azul" aria-hidden="true" />
                        <span>
                          <strong>{ACCION[c.accion] ?? c.accion}</strong>{campos.length > 0 && <> — {campos.slice(0, 3).join(", ")}{campos.length > 3 ? "…" : ""}</>}
                          <small>{fechaCorta(c.ocurrido_at)} · {c.actor_nombre ?? (c.actor_tipo === "sistema" ? "Carga inicial" : "Equipo")}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p style={{ marginTop: "0.75rem" }}><Link href="/admin/auditoria" className="adm-campo__ayuda">Ver toda la auditoría</Link></p>
            </Tarjeta>
            <FormularioBorrar coleccion={esquema.id} slug={ficha.slug} accion={borrarFicha} />
          </>
        }
      />
    </>
  );
}
