import Image from "next/image";

import { Icono } from "./Iconos";
import Link from "next/link";

import { PIE, type Enlace } from "@/lib/contenido";
import { contenido } from "@/lib/datos";

function EnlaceDelPie({ enlace }: { enlace: Enlace }) {
  if (enlace.externo) {
    return (
      <a href={enlace.url} rel="noopener" target="_blank" data-externo>
        {enlace.texto}
        <span className="visualmente-oculto"> (se abre en otra pestaña)</span>
      </a>
    );
  }
  return <Link href={enlace.url}>{enlace.texto}</Link>;
}

/** Franja de emergencias y pie institucional, iguales a los de smt.gob.ar. */
export async function PieDePagina() {
  const c = await contenido();
  const { emergencias: EMERGENCIAS, municipalidad: MUNICIPALIDAD, redes: REDES, turismo: TURISMO } = c.sitio;
  return (
    <>
      <section className="franja-emergencias" aria-labelledby="titulo-emergencias">
        <div className="contenedor">
          <div className="franja-emergencias__presentacion">
            <span className="franja-emergencias__telefono"><Icono nombre="telefono" tamano={24} /></span>
            <div>
              <h2 id="titulo-emergencias">Emergencias</h2>
              <p>Durante tu visita, ante una urgencia, marcá:</p>
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
              <Image src="/img/logo-smt-neg.png" alt="Ciudad San Miguel de Tucumán" width={184} height={60} />
              <span className="footer__turismo">Turismo</span>
            </div>
            <address className="footer__direccion">
              <span><Icono nombre="ubicacion" tamano={16} />{TURISMO.area}: {TURISMO.domicilio}</span>
              <span><Icono nombre="correo" tamano={16} /><a href={`mailto:${TURISMO.email}`}>{TURISMO.email}</a></span>
              <span><Icono nombre="telefono" tamano={16} />Municipalidad: <a href={`tel:${MUNICIPALIDAD.telefonoLink}`}>{MUNICIPALIDAD.telefono}</a></span>
            </address>
            <div className="footer__redes">
              {REDES.map((red) => (
                <a key={red.url} href={red.url} rel="noopener" target="_blank" aria-label={`${red.titulo} de la Municipalidad (se abre en otra pestaña)`}>
                  <Icono nombre={red.icono} tamano={20} />
                </a>
              ))}
            </div>
          </div>

          <nav className="footer__grid" aria-label="Directorio de turismo">
            {PIE.map((columna) => (
              <div key={columna.titulo}>
                <h2>{columna.titulo}</h2>
                <ul>
                  {columna.enlaces.map((enlace) => (
                    <li key={enlace.url}><EnlaceDelPie enlace={enlace} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="footer__legal">
            <span>© {new Date().getFullYear()} Municipalidad de San Miguel de Tucumán — Dirección de Turismo</span>
            <span>{MUNICIPALIDAD.direccion}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
