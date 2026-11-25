import type { Metadata } from "next";
import { Suspense } from "react";

import { TalleresFiltrables } from "@/components/cultura/Talleres";
import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina } from "@/components/Ui";
import { CENTROS_TALLERES, TALLERES } from "@/lib/cultura/datos-talleres";
import { contenido } from "@/lib/datos";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { rutas } from "@/lib/rutas";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).talleres;
  return { title: t.titulo, description: t.metaDescripcion, alternates: await alternativas("/talleres") };
}

/**
 * Talleres anuales de los centros culturales (planilla de la Dirección de Gestión Cultural). Van aparte
 * de la agenda: son clases semanales todo el año, no eventos con fecha.
 */
export default async function Talleres() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.talleres;
  const publicados = new Set(c.lugares.map((l) => l.slug));
  const centros = CENTROS_TALLERES.map((k) => ({ ...k, ficha: publicados.has(k.slug) ? rutas.lugar(k.slug) : undefined }));

  return (
    <div data-modulo="cultura">
      <EncabezadoPagina migas={[{ texto: t.titulo }]} kicker={t.kicker} titulo={t.titulo}
        bajada={formatear(t.bajada, { n: TALLERES.talleres.length })} />
      <div className="contenedor bloque-interno talleres">
        <Suspense>
          <TalleresFiltrables talleres={TALLERES.talleres} centros={centros} t={t} />
        </Suspense>

        <aside className="talleres-inscripcion" aria-labelledby="inscripcion-titulo">
          <h2 id="inscripcion-titulo">{t.inscripcionTitulo}</h2>
          <p>{t.inscripcionTexto}</p>
          <ul>
            {centros.map((k) => (
              <li key={k.slug}>
                <strong>{k.nombre}</strong>
                {k.direccion && <span><Icono nombre="ubicacion" tamano={16} /> {k.direccion}</span>}
                {k.horario && <span><Icono nombre="reloj" tamano={16} /> {k.horario}</span>}
                {k.telefono && <span><Icono nombre="telefono" tamano={16} /> <a href={`tel:+54381${k.telefono.replace(/\D/g, "")}`}>(0381) {k.telefono}</a></span>}
                {k.ficha && <Link className="enlace-flecha" href={k.ficha}>{t.verFicha} <Icono nombre="flecha" tamano={16} /></Link>}
              </li>
            ))}
          </ul>
          <p className="talleres-fuente">{formatear(t.fuente, { fuente: TALLERES.fuente, fecha: TALLERES.actualizado.split("-").reverse().join("/") })}</p>
        </aside>
      </div>
    </div>
  );
}
