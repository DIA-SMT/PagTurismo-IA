import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { Aviso, Banda, Chip, ChipEstado, Vacio, fechaCorta } from "@/components/admin/Piezas";
import { fichasDe } from "@/lib/admin/datos";
import { esquemaDe } from "@/lib/admin/esquemas";
import { requerirAdmin } from "@/lib/admin/sesion";
import { normalizar } from "@/lib/buscar";
import { diaLocal } from "@/lib/fechas";

export async function generateMetadata({ params }: PageProps<"/admin/[coleccion]">): Promise<Metadata> {
  return { title: esquemaDe((await params).coleccion)?.titulo ?? "Panel" };
}

export default async function Listado({ params, searchParams }: PageProps<"/admin/[coleccion]">) {
  const admin = await requerirAdmin();
  const esquema = esquemaDe((await params).coleccion);
  if (!esquema) notFound();
  const sp = await searchParams;
  const estado = sp.estado === "publicado" || sp.estado === "borrador" ? sp.estado : "";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";

  const todas = await fichasDe(admin, esquema.id);
  const hoy = diaLocal(Date.now());
  const busqueda = normalizar(q);
  const visibles = todas
    .filter((f) => !estado || f.estado === estado)
    .filter((f) => !busqueda || normalizar(`${f.datos.titulo ?? ""} ${f.datos.resumen ?? ""} ${f.slug}`).includes(busqueda));

  const cuenta = (e: string) => todas.filter((f) => !e || f.estado === e).length;
  const pestana = (e: string, texto: string) => {
    const p = new URLSearchParams();
    if (e) p.set("estado", e);
    if (q) p.set("q", q);
    const s = p.toString();
    return (
      <Link href={`/admin/${esquema.id}${s ? `?${s}` : ""}`} aria-current={estado === e ? "page" : undefined}>
        {texto} <small>{cuenta(e)}</small>
      </Link>
    );
  };

  return (
    <>
      <Banda
        titulo={esquema.titulo}
        bajada={esquema.descripcion}
        acciones={<Link className="adm-boton adm-boton--amarillo" href={`/admin/${esquema.id}/nueva`}><Icono nombre="mas" tamano={18} /> {esquema.nuevo}</Link>}
      />

      {sp.borrada === "1" && <Aviso tono="ok">La ficha se borró. El cambio quedó en la auditoría.</Aviso>}

      <div className="adm-tarjeta" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <form className="adm-filtros" role="search" action={`/admin/${esquema.id}`}>
          {estado && <input type="hidden" name="estado" value={estado} />}
          <div className="adm-campo">
            <label className="adm-campo__etiqueta" htmlFor="buscar">Buscar</label>
            <input id="buscar" name="q" type="search" className="adm-input" defaultValue={q} placeholder="Por título, resumen o dirección" />
          </div>
          <button type="submit" className="adm-boton adm-boton--primario"><Icono nombre="buscar" tamano={18} /> Buscar</button>
        </form>
        <nav className="adm-pestanas" aria-label="Estado">
          {pestana("", "Todas")}
          {pestana("publicado", "Publicadas")}
          {pestana("borrador", "Borradores")}
        </nav>
      </div>

      {visibles.length === 0 ? (
        <Vacio titulo={todas.length ? "No hay fichas con ese filtro" : "Todavía no hay fichas"} icono={esquema.icono}
          accion={<Link className="adm-boton adm-boton--primario" href={`/admin/${esquema.id}/nueva`}><Icono nombre="mas" tamano={18} /> {esquema.nuevo}</Link>}>
          {todas.length ? "Probá con otra búsqueda o con otra pestaña." : "Creá la primera con el botón de abajo."}
        </Vacio>
      ) : (
        <div className="adm-tabla-caja" role="region" aria-label={`Fichas de ${esquema.titulo}`} tabIndex={0}>
          <table className="adm-tabla">
            <thead>
              <tr>
                <th scope="col">Ficha</th>
                <th scope="col">Estado</th>
                <th scope="col">Validación</th>
                <th scope="col">Último cambio</th>
                <th scope="col"><span className="adm-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const v = (f.datos.validacion ?? {}) as { fecha?: string; proximaRevision?: string };
                const vencida = v.proximaRevision && v.proximaRevision < hoy;
                return (
                  <tr key={f.slug}>
                    <td>
                      <Link className="adm-tabla__titulo" href={`/admin/${esquema.id}/${f.slug}`}>{String(f.datos.titulo ?? f.slug)}</Link>
                      <span className="adm-tabla__sub">/{f.slug}</span>
                    </td>
                    <td><ChipEstado estado={f.estado} /></td>
                    <td>
                      {"validacion" in f.datos || esquema.secciones.some((s) => s.titulo === "Fuentes y validación")
                        ? vencida ? <Chip tono="rojo">Revisión vencida</Chip>
                          : v.fecha ? <Chip tono="verde">Validada {v.fecha.split("-").reverse().join("/")}</Chip>
                            : <Chip tono="gris">Sin validar</Chip>
                        : <span className="adm-tabla__sub">—</span>}
                    </td>
                    <td>
                      {fechaCorta(f.actualizado_at)}
                      <span className="adm-tabla__sub">{f.actualizado_por_nombre ?? "Carga inicial"}</span>
                    </td>
                    <td>
                      <div className="adm-tabla__acciones">
                        <Link className="adm-boton adm-boton--secundario adm-boton--chico" href={`/admin/${esquema.id}/${f.slug}`}>
                          <Icono nombre="lapiz" tamano={14} /> Editar
                        </Link>
                        {esquema.rutaPublica && (
                          <Link className="adm-boton adm-boton--secundario adm-boton--icono" href={esquema.rutaPublica(f.slug)} target="_blank"
                            aria-label={`Ver «${String(f.datos.titulo ?? f.slug)}» en el sitio`} title="Ver en el sitio">
                            <Icono nombre="ojo" tamano={16} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
