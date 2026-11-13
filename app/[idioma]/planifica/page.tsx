import type { Metadata } from "next";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina, Marca } from "@/components/Ui";
import { getClima } from "@/lib/clima";
import { contenido } from "@/lib/datos";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { rutas } from "@/lib/rutas";

export async function generateMetadata(): Promise<Metadata> {
  const t = await textosActuales();
  return {
    title: t.comun.nav.planifica,
    description: t.recorridos.planifica.metaDescripcion,
    alternates: await alternativas("/planifica"),
  };
}

export default async function Planifica() {
  const [c, t, clima] = await Promise.all([contenido(), textosActuales(), getClima()]);
  const tp = t.recorridos.planifica;
  const guias = c.guias;
  const sitio = c.sitio;

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.comun.nav.planifica }]}
        kicker={t.comun.nav.planifica}
        titulo={tp.titulo}
        bajada={tp.bajada}
      />

      <div className="contenedor bloque-interno">
        <ul className="guias">
          {guias.map((g, i) => (
            <li key={g.slug}>
              <Link className={`guia-tarjeta tono-${[1, 3, 0, 2, 4, 5][i % 6]}`} href={rutas.guia(g.slug)}>
                <span className="icono-pastel"><Icono nombre={g.icono} tamano={24} /></span>
                <span className="guia-tarjeta__texto">
                  <strong>{g.titulo}</strong>
                  {g.estado === "borrador" && <Marca tipo="borrador">{t.comun.ui.borrador}</Marca>}
                  <span>{g.resumen}</span>
                </span>
                <Icono nombre="flecha" tamano={18} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="antes antes--planifica">
          <div className="clima-tarjeta">
            <p className="kicker">{tp.climaAhora}</p>
            {clima ? (
              <>
                <div className="clima-tarjeta__ahora">
                  <Icono nombre={clima.icono} tamano={56} />
                  <span className="clima-tarjeta__grados">{clima.temperatura}°C</span>
                </div>
                <span className="clima-tarjeta__estado">
                  {formatear(t.comun.clima.enLaCiudad, { descripcion: t.comun.clima[clima.estado] })}
                </span>
              </>
            ) : (
              <div className="clima-tarjeta__ahora"><Icono nombre="nube-sol" tamano={56} /></div>
            )}
            <p>{tp.climaTexto}</p>
            {clima && <small>{tp.datosDe} <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a></small>}
          </div>

          <section className="oficina oficina--compacta" aria-labelledby="ayuda">
            <p className="kicker">{tp.ayuda}</p>
            <h2 id="ayuda">{tp.ayudaTitulo}</h2>
            <p>{formatear(tp.ayudaTexto, { area: sitio.turismo.area })}</p>
            <ul className="oficina__datos">
              <li><span className="icono-pastel"><Icono nombre="ubicacion" tamano={20} /></span>{sitio.turismo.domicilio}</li>
              <li><span className="icono-pastel"><Icono nombre="correo" tamano={20} /></span><a href={`mailto:${sitio.turismo.email}`}>{sitio.turismo.email}</a></li>
              {sitio.turismo.atencion && <li><span className="icono-pastel"><Icono nombre="reloj" tamano={20} /></span>{sitio.turismo.atencion}</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
