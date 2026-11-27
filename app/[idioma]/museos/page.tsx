import type { Metadata } from "next";

import { GrillaEventos } from "@/components/cultura/Agenda";
import { TarjetaEspacio } from "@/components/cultura/Espacios";
import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina } from "@/components/Ui";
import { actividadesEn, actividadesPorLugar, museosCerrados, museosDe } from "@/lib/cultura/espacios";
import { contenido, ocurrenciasDeAgenda } from "@/lib/datos";
import { diaDeSemana } from "@/lib/fechas";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).espacios.museos;
  return { title: t.titulo, description: t.meta, alternates: await alternativas("/museos") };
}

const MAX_ACTIVIDADES = 6;

/**
 * Los museos: primero los cuatro municipales (Dirección de Museos), después los demás de la ciudad, el aviso
 * de que los lunes cierran todos y las próximas actividades que pasan en ellos.
 */
export default async function Museos() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.espacios;
  const ahora = Date.now();
  const { municipales, otros } = museosDe(c.lugares);
  const todos = [...municipales, ...otros];
  const actividades = actividadesEn(ocurrenciasDeAgenda(c, ahora), todos.map((l) => l.slug));
  const porLugar = actividadesPorLugar(actividades);
  const lunes = museosCerrados(diaDeSemana(ahora));
  const tarjeta = (l: (typeof todos)[number], i: number) => (
    <li key={l.slug}>
      <TarjetaEspacio lugar={l} t={t.tarjeta} borrador={textos.comun.ui.borrador} actividades={porLugar.get(l.slug) ?? 0} tono={[1, 3, 4, 0][i % 4]} icono="estatua" />
    </li>
  );

  return (
    <div data-modulo="cultura">
      <EncabezadoPagina migas={[{ texto: t.museos.titulo }]} kicker={t.museos.kicker} titulo={t.museos.titulo} bajada={t.museos.bajada} />
      <div className="contenedor bloque-interno espacios">
        <p className={`aviso-lunes${lunes ? " aviso-lunes--hoy" : ""}`} role="note">
          <Icono nombre="info" tamano={20} />
          <span><strong>{t.museos.lunesTitulo}.</strong> {lunes ? t.museos.hoyLunes : t.museos.lunes}</span>
        </p>

        {todos.length === 0 && <p className="espacios__vacio">{t.museos.vacio}</p>}
        {municipales.length > 0 && (
          <section className="grupo" aria-labelledby="museos-municipales">
            <h2 id="museos-municipales">{t.museos.municipales}</h2>
            <ul className="espacios__grilla">{municipales.map(tarjeta)}</ul>
          </section>
        )}
        {otros.length > 0 && (
          <section className="grupo" aria-labelledby="museos-otros">
            <h2 id="museos-otros">{t.museos.otros}</h2>
            <ul className="espacios__grilla">{otros.map((l, i) => tarjeta(l, i + municipales.length))}</ul>
          </section>
        )}

        {actividades.length > 0 && (
          <section className="grupo" aria-labelledby="museos-actividades">
            <div className="grupo__cabecera">
              <h2 id="museos-actividades">{t.museos.actividades}</h2>
              <Link className="cabecera__enlace" href="/agenda">{textos.cultura.portada.verAgenda} <Icono nombre="flecha" tamano={18} /></Link>
            </div>
            <GrillaEventos ocurrencias={actividades.slice(0, MAX_ACTIVIDADES)} categorias={c.categoriasAgenda} />
          </section>
        )}
      </div>
    </div>
  );
}
