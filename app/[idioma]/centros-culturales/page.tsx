import type { Metadata } from "next";

import { GrillaEventos } from "@/components/cultura/Agenda";
import { TarjetaEspacio } from "@/components/cultura/Espacios";
import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina } from "@/components/Ui";
import { TALLERES } from "@/lib/cultura/datos-talleres";
import { CENTROS_CULTURALES, actividadesEn, actividadesPorLugar, enOrden } from "@/lib/cultura/espacios";
import { contenido, ocurrenciasDeAgenda } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).espacios.centros;
  return { title: t.titulo, description: t.meta, alternates: await alternativas("/centros-culturales") };
}

const MAX_ACTIVIDADES = 6;

/**
 * Los centros culturales de la Dirección de Gestión Cultural: dónde quedan, cuántos talleres dictan (la
 * inscripción es en cada centro) y sus próximas actividades de la agenda.
 */
export default async function CentrosCulturales() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.espacios;
  const centros = enOrden(c.lugares, CENTROS_CULTURALES);
  const slugs = centros.map((l) => l.slug);
  const actividades = actividadesEn(ocurrenciasDeAgenda(c), slugs);
  const porLugar = actividadesPorLugar(actividades);
  const talleres = (slug: string) => TALLERES.talleres.filter((x) => x.centro === slug).length;

  return (
    <div data-modulo="cultura">
      <EncabezadoPagina migas={[{ texto: t.centros.titulo }]} kicker={t.centros.kicker} titulo={t.centros.titulo} bajada={t.centros.bajada} />
      <div className="contenedor bloque-interno espacios">
        {centros.length === 0
          ? <p className="espacios__vacio">{t.centros.vacio}</p>
          : (
            <ul className="espacios__grilla">
              {centros.map((l, i) => (
                <li key={l.slug}>
                  <TarjetaEspacio lugar={l} t={t.tarjeta} borrador={textos.comun.ui.borrador} talleres={talleres(l.slug)}
                    actividades={porLugar.get(l.slug) ?? 0} tono={[0, 3, 1, 4][i % 4]} icono="personas" />
                </li>
              ))}
            </ul>
          )}

        <aside className="aviso-inscripcion" aria-labelledby="como-anotarse">
          <span className="icono-pastel"><Icono nombre="lapiz" tamano={22} /></span>
          <div>
            <h2 id="como-anotarse">{t.centros.inscripcionTitulo}</h2>
            <p>{t.centros.inscripcion}</p>
          </div>
          <Link className="boton boton--primario" href="/talleres">{t.centros.verTalleres} <Icono nombre="flecha" tamano={18} /></Link>
        </aside>

        <p className="espacios__programas">
          {t.centros.programas}{" "}
          <Link className="enlace-flecha" href="/programas">{t.centros.verProgramas} <Icono nombre="flecha" tamano={16} /></Link>
        </p>

        {actividades.length > 0 && (
          <section className="grupo" aria-labelledby="centros-actividades">
            <div className="grupo__cabecera">
              <h2 id="centros-actividades">{t.centros.actividades}</h2>
              <Link className="cabecera__enlace" href="/agenda">{textos.cultura.portada.verAgenda} <Icono nombre="flecha" tamano={18} /></Link>
            </div>
            <GrillaEventos ocurrencias={actividades.slice(0, MAX_ACTIVIDADES)} categorias={c.categoriasAgenda} />
          </section>
        )}
      </div>
    </div>
  );
}
