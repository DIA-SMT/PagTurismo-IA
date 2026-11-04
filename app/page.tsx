import Image from "next/image";
import type { ReactNode } from "react";

import { Carrusel } from "@/components/Carrusel";
import { CircuitosBus } from "@/components/CircuitosBus";
import { HeroFotos } from "@/components/HeroFotos";
import { Icono } from "@/components/Iconos";
import { getClima } from "@/lib/clima";
import {
  ACCESOS, AGENDA, ANTES_DE_LLEGAR, BUS, BUS_TURISTICO, CATEGORIAS, DESTACADOS,
  ESCAPADAS, EXPERIENCIAS, FECHAS, REDES, SABORES, TURISMO,
} from "@/lib/contenido";

// El clima se vuelve a pedir cada media hora; el resto es estático.
export const revalidate = 1800;

/** Un enlace que sale de la landing: pestaña nueva y aviso para lector de pantalla. */
function Externo({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const sale = href.startsWith("http");
  return (
    <a href={href} className={className} {...(sale ? { rel: "noopener", target: "_blank" } : {})}>
      {children}
      {sale && <span className="visualmente-oculto"> (se abre en otra pestaña)</span>}
    </a>
  );
}

function Cabecera({ id, kicker, titulo, bajada, enlace }: {
  id: string;
  kicker: string;
  titulo: string;
  bajada?: string;
  enlace?: { texto: string; url: string };
}) {
  return (
    <div className="cabecera">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 id={id}>{titulo}</h2>
        {bajada && <p>{bajada}</p>}
      </div>
      {enlace && (
        <Externo href={enlace.url} className="cabecera__enlace">
          {enlace.texto} <Icono nombre={enlace.url.startsWith("http") ? "externo" : "flecha"} tamano={18} />
        </Externo>
      )}
    </div>
  );
}

export default async function Landing() {
  const clima = await getClima();

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="hero" id="inicio" aria-labelledby="hero-titulo">
        <HeroFotos />
        <div className="hero__velo" />
        <div className="contenedor hero__interior">
          <div className="hero__texto">
            <p className="kicker hero__kicker">San Miguel de Tucumán · Ciudad Histórica</p>
            <h1 id="hero-titulo">Donde nació<br /><span>la Independencia</span></h1>
            <p className="hero__bajada">
              Historia, sabores y naturaleza al pie del cerro San Javier.
              Viví la capital del Jardín de la República.
            </p>
            <div className="hero__botones">
              <a className="boton boton--primario" href="#que-hacer">
                Descubrí qué hacer <Icono nombre="flecha" tamano={18} />
              </a>
              <Externo className="boton boton--claro" href={BUS_TURISTICO}>
                <Icono nombre="bus-linea" tamano={18} /> Bus turístico gratuito <Icono nombre="externo" tamano={16} />
              </Externo>
            </div>
          </div>

          <div className="hero__migue" aria-hidden="true">
            <div className="hero__burbuja"><strong>¡Hola!</strong><span>Soy Migue y te<br />muestro la ciudad</span></div>
            <Image src="/migue/migue-presentando-palma-abierta.png" alt="" width={1315} height={1197} sizes="(max-width: 900px) 240px, 430px" loading="eager" />
          </div>

          <nav className="accesos" aria-label="Accesos rápidos">
            {ACCESOS.map((a, i) => (
              <Externo className={`acceso tono-${[1, 0, 3, 4][i]}`} href={a.url} key={a.titulo}>
                <span className="icono-pastel"><Icono nombre={a.icono} tamano={24} /></span>
                <span><strong>{a.titulo}</strong><small>{a.detalle}</small></span>
                <Icono nombre={a.url.startsWith("http") ? "externo" : "flecha"} tamano={18} />
              </Externo>
            ))}
          </nav>
        </div>
      </section>

      {/* ---- Destacados ---- */}
      <section className="bloque contenedor" aria-labelledby="destacados-titulo">
        <Cabecera id="destacados-titulo" kicker="Destacados" titulo="Para empezar a recorrer"
          bajada="Propuestas de la Dirección de Turismo para conocer la ciudad desde el primer día." />
        <div className="destacados">
          {DESTACADOS.map((d) => (
            <Externo className="tarjeta" href={d.url} key={d.titulo}>
              <div className="tarjeta__foto"><Image src={d.imagen} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" /></div>
              <div className="tarjeta__cuerpo">
                <span className="etiqueta">{d.etiqueta}</span>
                <h3>{d.titulo}</h3>
                <p>{d.detalle}</p>
                <span className="tarjeta__mas" aria-hidden="true">Ver más <Icono nombre="flecha" tamano={18} /></span>
              </div>
            </Externo>
          ))}
        </div>
      </section>

      {/* ---- Qué hacer ---- */}
      <section className="bloque contenedor" id="que-hacer" aria-labelledby="que-hacer-titulo">
        <Cabecera id="que-hacer-titulo" kicker="Qué hacer" titulo="Una ciudad para vivirla"
          bajada="Patrimonio, sabores, parques y noches: elegí por dónde empezar."
          enlace={{ texto: "Lugares de interés", url: "https://smt.gob.ar/lugares-de-interes" }} />
        <Carrusel etiqueta="Qué hacer en San Miguel de Tucumán">
          {CATEGORIAS.map((c) => (
            <li key={c.titulo}>
              <Externo className={`lugar${c.tono !== undefined ? ` tono-${c.tono}` : ""}`} href={c.url}>
                <div className={`lugar__media lugar__media--${c.foto ? "foto" : "sticker"}`}>
                  <Image src={c.foto ?? c.sticker!} alt="" fill sizes="(max-width: 600px) 80vw, (max-width: 1150px) 40vw, 25vw" />
                </div>
                <h3>{c.titulo} <Icono nombre="flecha" tamano={18} /></h3>
                <p>{c.detalle}</p>
              </Externo>
            </li>
          ))}
        </Carrusel>
      </section>

      {/* ---- Historia ---- */}
      <section className="historia" aria-labelledby="historia-titulo">
        <div className="contenedor">
          <Cabecera id="historia-titulo" kicker="Razones para venir" titulo="Una ciudad que hizo historia"
            bajada="Desde el año 2000, por la Ley 25.275, el casco urbano de San Miguel de Tucumán es Ciudad Histórica."
            enlace={{ texto: "Reseña histórica", url: "https://smt.gob.ar/historia" }} />
          <ol className="historia__lista">
            {FECHAS.map((f) => (
              <li key={f.anio}>
                <span className="historia__anio">{f.anio}</span>
                <h3>{f.titulo}</h3>
                <p>{f.detalle}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Recorridos ---- */}
      <section className="recorridos" id="recorridos" aria-labelledby="recorridos-titulo">
        <div className="contenedor">
          <div className="recorridos__grilla">
            <div className="recorridos__texto">
              <p className="kicker">Recorridos guiados</p>
              <h2 id="recorridos-titulo">Conocé la ciudad con guía, gratis</h2>
              <p>{BUS.detalle}</p>
              <ul className="datos-bus">
                <li><Icono nombre="bus-linea" tamano={16} /> Bus turístico</li>
                <li><Icono nombre="reloj" tamano={16} /> Unas 2 horas</li>
                <li><Icono nombre="brujula" tamano={16} /> 3 circuitos</li>
                <li><Icono nombre="ticket" tamano={16} /> Gratuito</li>
              </ul>
              <div className="inscripcion">
                <h3>Salidas y reservas</h3>
                <p>Los horarios de salida y la reserva están en el sitio del Bus Turístico, junto con los turnos del Bus Educativo para escuelas.</p>
                <Externo className="boton boton--amarillo" href={BUS.url}>
                  <Icono nombre="bus-linea" tamano={18} /> Ir al Bus Turístico <Icono nombre="externo" tamano={16} />
                </Externo>
              </div>
            </div>
            <CircuitosBus />
          </div>

          <ul className="experiencias" aria-label="Otras experiencias">
            {EXPERIENCIAS.map((e) => (
              <li key={e.titulo}>
                <Externo className="experiencia" href={e.url}>
                  <span className="experiencia__icono"><Icono nombre={e.icono} tamano={24} /></span>
                  <div>
                    <h3>{e.titulo} <Icono nombre="externo" tamano={15} /></h3>
                    <p>{e.detalle}</p>
                  </div>
                </Externo>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Agenda ---- */}
      <section className="bloque contenedor" id="agenda" aria-labelledby="agenda-titulo">
        <Cabecera id="agenda-titulo" kicker="Agenda" titulo="Fechas para agendar"
          bajada="Las celebraciones que cada año llenan de gente las plazas y las calles tucumanas."
          enlace={{ texto: "Noticias y eventos", url: "https://comunicacionsmt.gob.ar/" }} />
        <ul className="agenda">
          {AGENDA.map((e) => (
            <li key={e.titulo}>
              <article className="evento">
                <div className={`evento__fecha${e.dia ? "" : " evento__fecha--mes"}`} aria-hidden="true">
                  <span className="evento__mes">{e.mes}</span>
                  {e.dia && <span className="evento__dia">{e.dia}</span>}
                </div>
                <h3>
                  <span className="visualmente-oculto">{e.dia ? `${e.dia} de ` : ""}{nombreDelMes(e.mes)}: </span>
                  {e.titulo}
                </h3>
                <p className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{e.lugar}</p>
                <p>{e.detalle}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Sabores ---- */}
      <section className="bloque contenedor" id="sabores" aria-labelledby="sabores-titulo">
        <Cabecera id="sabores-titulo" kicker="Gastronomía" titulo="Sabores tucumanos"
          bajada="Cuatro platos que no te podés ir sin probar." />
        <ul className="sabores">
          {SABORES.map((s) => (
            <li key={s.titulo}>
              <article className={`sabor tono-${s.tono}`}>
                <div className="sabor__imagen"><Image src={s.sticker} alt="" fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                <div className="sabor__texto">
                  <h3>{s.titulo}</h3>
                  <p>{s.detalle}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Escapadas ---- */}
      <section className="bloque contenedor" id="escapadas" aria-labelledby="escapadas-titulo">
        <Cabecera id="escapadas-titulo" kicker="Escapadas" titulo="Más allá de la ciudad"
          bajada="Tucumán es la provincia más chica del país: cerros, diques, valles y ruinas quedan a pocas horas." />
        <ul className="escapadas">
          {ESCAPADAS.map((e) => (
            <li key={e.titulo}>
              <article className={`escapada tono-${e.tono}`}>
                <div className="escapada__imagen"><Image src={e.sticker} alt="" fill sizes="144px" /></div>
                <div>
                  <span className="escapada__distancia"><Icono nombre="ubicacion" tamano={14} />A {e.distancia}</span>
                  <h3>{e.titulo}</h3>
                  <p>{e.detalle}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Antes de llegar ---- */}
      <section className="bloque contenedor" id="antes-de-llegar" aria-labelledby="antes-titulo">
        <Cabecera id="antes-titulo" kicker="Antes de llegar" titulo="Planificá tu visita"
          bajada="Lo básico para moverte por la ciudad desde el primer día." />
        <div className="antes">
          <div className="clima-tarjeta">
            <p className="kicker">Clima ahora</p>
            {clima ? (
              <>
                <div className="clima-tarjeta__ahora">
                  <Icono nombre={clima.icono} tamano={56} />
                  <span className="clima-tarjeta__grados">{clima.temperatura}°C</span>
                </div>
                <span className="clima-tarjeta__estado">{clima.descripcion} en San Miguel de Tucumán</span>
              </>
            ) : (
              <div className="clima-tarjeta__ahora"><Icono nombre="nube-sol" tamano={56} /></div>
            )}
            <p>Clima subtropical: veranos cálidos y lluviosos, inviernos templados y secos. En verano no olvides el repelente.</p>
            {clima && <small>Datos de <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a></small>}
          </div>
          <ul className="datos">
            {ANTES_DE_LLEGAR.map((d, i) => (
              <li key={d.titulo}>
                <div className={`dato tono-${[1, 3, 0, 2][i]}`}>
                  <span className="icono-pastel"><Icono nombre={d.icono} tamano={24} /></span>
                  <div>
                    <h3>{d.titulo}</h3>
                    <p>{d.detalle}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Contacto ---- */}
      <section className="bloque contenedor contacto" id="contacto" aria-labelledby="contacto-titulo">
        <div className="oficina">
          <p className="kicker">Contacto</p>
          <h2 id="contacto-titulo">¿Tenés dudas? Te ayudamos a armar tu visita</h2>
          <p>La Dirección de Turismo de la Municipalidad responde consultas sobre recorridos, horarios y actividades.</p>
          <ul className="oficina__datos">
            <li><span className="icono-pastel"><Icono nombre="ubicacion" tamano={20} /></span>{TURISMO.domicilio}</li>
            <li><span className="icono-pastel"><Icono nombre="correo" tamano={20} /></span><a href={`mailto:${TURISMO.email}`}>{TURISMO.email}</a></li>
          </ul>
          <div className="oficina__acciones">
            <a className="boton boton--primario" href={`mailto:${TURISMO.email}`}>Escribinos <Icono nombre="flecha" tamano={18} /></a>
            <div className="oficina__redes">
              {REDES.map((red) => (
                <a key={red.url} href={red.url} rel="noopener" target="_blank" aria-label={`${red.titulo} de la Municipalidad (se abre en otra pestaña)`}>
                  <Icono nombre={red.icono} tamano={20} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Externo className="mapa" href="https://mapa.smt.gob.ar/">
          <div className="mapa__plano" aria-hidden="true">
            <span className="mapa__parque" />
            <span className="mapa__pin"><Icono nombre="ubicacion" tamano={40} /><span>San Miguel de Tucumán</span></span>
          </div>
          <div className="mapa__pie">
            <div>
              <h2>Mapa interactivo</h2>
              <p>Ubicá museos, plazas, paradas y servicios.</p>
            </div>
            <Icono nombre="externo" tamano={22} />
          </div>
        </Externo>
      </section>
    </>
  );
}

const MESES: Record<string, string> = {
  ENE: "enero", FEB: "febrero", MAR: "marzo", ABR: "abril", MAY: "mayo", JUN: "junio",
  JUL: "julio", AGO: "agosto", SEP: "septiembre", OCT: "octubre", NOV: "noviembre", DIC: "diciembre",
};
function nombreDelMes(abreviatura: string) {
  return MESES[abreviatura] ?? abreviatura;
}
