import Image from "next/image";

import { Icono } from "./Iconos";
import { Vinculo as Link } from "./i18n/Idioma";

import { PIE, type Enlace } from "@/lib/contenido";
import { contenido } from "@/lib/datos";
import { formatear } from "@/lib/i18n/definir";
import { textosActuales } from "@/lib/i18n/servidor";
import type { Textos } from "@/lib/i18n/textos";

function EnlaceDelPie({ enlace, t }: { enlace: Enlace; t: Textos["comun"] }) {
  const texto = t.pie.enlaces[enlace.clave];
  if (enlace.externo) {
    return (
      <a href={enlace.url} rel="noopener" target="_blank" data-externo>
        {texto}
        <span className="visualmente-oculto">{t.controles.otraPestana}</span>
      </a>
    );
  }
  return <Link href={enlace.url}>{texto}</Link>;
}

/** Franja de emergencias y pie institucional, iguales a los de smt.gob.ar. */
export async function PieDePagina() {
  const [c, { comun: t }] = await Promise.all([contenido(), textosActuales()]);
  const { emergencias: EMERGENCIAS, municipalidad: MUNICIPALIDAD, redes: REDES, turismo: TURISMO } = c.sitio;
  return (
    <>
      <section className="franja-emergencias" aria-labelledby="titulo-emergencias">
        <div className="contenedor">
          <div className="franja-emergencias__presentacion">
            <span className="franja-emergencias__telefono"><Icono nombre="telefono" tamano={24} /></span>
            <div>
              <h2 id="titulo-emergencias">{t.pie.emergencias}</h2>
              <p>{t.pie.emergenciasBajada}</p>
            </div>
          </div>
          <ul className="franja-emergencias__numeros">
            {EMERGENCIAS.map((tel) => (
              <li key={tel.numero}>
                <a className="tel-emergencia" href={`tel:${tel.numero}`}>
                  <Icono nombre={tel.icono} tamano={20} />
                  <span>{tel.nombre}</span>
                  <strong>{tel.numero}</strong>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="footer">
        <div className="contenedor">
          <div className="footer__identidad">
            <div className="footer__logo">
              <Image src="/img/logo-smt-neg.png" alt={t.sitio.logoAlt} width={184} height={60} />
              <span className="footer__turismo">{t.sitio.turismo}</span>
            </div>
            <address className="footer__direccion">
              <span><Icono nombre="ubicacion" tamano={16} />{TURISMO.area}: {TURISMO.domicilio}</span>
              <span><Icono nombre="correo" tamano={16} /><a href={`mailto:${TURISMO.email}`}>{TURISMO.email}</a></span>
              <span><Icono nombre="telefono" tamano={16} />{t.pie.municipalidad}: <a href={`tel:${MUNICIPALIDAD.telefonoLink}`}>{MUNICIPALIDAD.telefono}</a></span>
            </address>
            <div className="footer__redes">
              {REDES.map((red) => (
                <a key={red.url} href={red.url} rel="noopener" target="_blank" aria-label={formatear(t.pie.redDeLaMunicipalidad, { red: red.titulo })}>
                  <Icono nombre={red.icono} tamano={20} />
                </a>
              ))}
            </div>
          </div>

          <nav className="footer__grid" aria-label={t.pie.directorio}>
            {PIE.map((columna) => (
              <div key={columna.columna}>
                <h2>{t.pie.columnas[columna.columna]}</h2>
                <ul>
                  {columna.enlaces.map((enlace) => (
                    <li key={enlace.url}><EnlaceDelPie enlace={enlace} t={t} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="footer__legal">
            <span>© {new Date().getFullYear()} {t.pie.legal}</span>
            <span>{MUNICIPALIDAD.direccion}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
