import Image from "next/image";
import Link from "next/link";

import { Carrusel } from "@/components/Carrusel";
import { HeroFotos } from "@/components/HeroFotos";
import { Icono } from "@/components/Iconos";
import { Cabecera, Enlace, Marca } from "@/components/Ui";
import { getClima } from "@/lib/clima";
import { BUS_TURISTICO, MAPA } from "@/lib/contenido";
import { contenido, destacadosVigentes, agendaDestacada } from "@/lib/datos";
import { MESES, diaLocal, formatearOcurrencia, partesDeFecha } from "@/lib/fechas";
import { rutas } from "@/lib/rutas";
import type { Evento } from "@/lib/tipos";

const ACCESOS = [
  { titulo: "Agenda", detalle: "Qué hay hoy y esta semana", url: "/agenda", icono: "calendario" },
  { titulo: "Bus turístico", detalle: "Salidas y reservas", url: BUS_TURISTICO, icono: "bus-linea" },
  { titulo: "Imperdibles", detalle: "Lo esencial de la ciudad", url: "/descubri", icono: "estrella" },
  { titulo: "Mapa", detalle: "Ubicá museos y plazas", url: MAPA, icono: "mapa" },
];

/** Las próximas fechas del calendario anual, para cuando no hay eventos confirmados. */
function proximasFechasDelCalendario(eventos: Evento[], ahora: number, cuantas: number) {
  const [anio, mes, dia] = diaLocal(ahora).split("-").map(Number);
  return eventos
    .filter((e) => e.recurrente)
    .map((e) => {
      const r = e.recurrente!;
      const pasada = r.mes < mes || (r.mes === mes && (r.dia ?? 31) < dia);
      return { e, orden: (pasada ? anio + 1 : anio) * 10_000 + r.mes * 100 + (r.dia ?? 0) };
    })
    .sort((a, b) => a.orden - b.orden)
    .slice(0, cuantas)
    .map((x) => x.e);
}

export default async function Portada() {
  const c = await contenido();
  const clima = await getClima();
  const ahora = Date.now();
  const sitio = c.sitio;
  const destacados = destacadosVigentes(c, ahora);
  const categorias = c.categorias;
  const agenda = agendaDestacada(c, ahora, 3);
  const calendario = agenda.length ? [] : proximasFechasDelCalendario(c.eventos, ahora, 3);
  const recorridos = c.recorridos;
  const circuitosBus = recorridos.filter((r) => r.modalidad === "bus");
  const itinerarios = recorridos.filter((r) => r.tipo === "itinerario");
  const experiencias = c.experiencias.filter((e) => e.modalidad !== "bus");
  const platos = c.platos;
  const escapadas = c.escapadas;
  const guias = c.guias;

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="hero" id="inicio" aria-labelledby="hero-titulo">
        <HeroFotos />
        <div className="hero__velo" />
        <div className="contenedor hero__interior">
          <div className="hero__texto">
            <p className="kicker hero__kicker">{sitio.hero.kicker}</p>
            <h1 id="hero-titulo">{sitio.hero.titulo} <span>{sitio.hero.tituloAcento}</span></h1>
            <p className="hero__bajada">{sitio.hero.bajada}</p>

            <form className="hero__buscador" action="/que-hacer" method="get" role="search" aria-label="Buscar en el portal">
              <label htmlFor="hero-buscar" className="visualmente-oculto">¿Qué querés hacer?</label>
              <Icono nombre="buscar" tamano={20} />
              <input id="hero-buscar" type="search" name="q" placeholder="Museos, plazas, bus turístico…" autoComplete="off" />
              <button type="submit" className="boton boton--primario">Buscar</button>
            </form>

            <div className="hero__botones">
              <Link className="boton boton--primario" href="/que-hacer">
                Explorar la ciudad <Icono nombre="flecha" tamano={18} />
              </Link>
              <Link className="boton boton--claro" href="/agenda">
                <Icono nombre="calendario" tamano={18} /> Ver agenda
              </Link>
            </div>
          </div>

          <div className="hero__migue" aria-hidden="true">
            <div className="hero__burbuja"><strong>¡Hola!</strong><span>Soy Migue y te<br />muestro la ciudad</span></div>
            <Image src="/migue/migue-presentando-palma-abierta.png" alt="" width={1315} height={1197} sizes="(max-width: 900px) 160px, 300px" loading="eager" />
          </div>

          <nav className="accesos" aria-label="Accesos rápidos">
            {ACCESOS.map((a, i) => (
              <Enlace className={`acceso tono-${[3, 0, 4, 1][i]}`} href={a.url} key={a.titulo}>
                <span className="icono-pastel"><Icono nombre={a.icono} tamano={24} /></span>
                <span><strong>{a.titulo}</strong><small>{a.detalle}</small></span>
                <Icono nombre={a.url.startsWith("http") ? "externo" : "flecha"} tamano={18} />
              </Enlace>
            ))}
          </nav>
        </div>
      </section>

      {/* ---- Destacados ---- */}
      {destacados.length > 0 && (
        <section className="bloque contenedor" aria-labelledby="destacados-titulo">
          <Cabecera id="destacados-titulo" kicker="Destacados" titulo="Para empezar a recorrer"
            bajada="Propuestas de la Dirección de Turismo para conocer la ciudad desde el primer día." />
          <div className="destacados">
            {destacados.slice(0, 3).map((d) => (
              <Enlace className="tarjeta" href={d.url} key={d.slug}>
                <div className="tarjeta__foto"><Image src={d.imagen.src} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" /></div>
                <div className="tarjeta__cuerpo">
                  <span className="etiqueta">{d.etiqueta}</span>
                  <h3>{d.titulo}</h3>
                  <p>{d.detalle}</p>
                  <span className="tarjeta__mas" aria-hidden="true">Ver más <Icono nombre="flecha" tamano={18} /></span>
                </div>
              </Enlace>
            ))}
          </div>
        </section>
      )}

      {/* ---- Qué hacer ---- */}
      <section className="bloque contenedor" id="que-hacer" aria-labelledby="que-hacer-titulo">
        <Cabecera id="que-hacer-titulo" kicker="Qué hacer" titulo="¿Qué te gustaría hacer?"
          bajada="Historia, sabores, parques, cultura: elegí por dónde empezar."
          enlace={{ texto: "Ver todo el catálogo", url: "/que-hacer" }} />
        <Carrusel etiqueta="Temas para recorrer San Miguel de Tucumán">
          {categorias.map((c) => (
            <li key={c.id}>
              <Link className={`lugar${c.tono !== undefined ? ` tono-${c.tono}` : ""}`} href={rutas.categoria(c.id)}>
                <div className={`lugar__media lugar__media--${c.tono === undefined ? "foto" : "sticker"}`}>
                  <Image src={c.imagen} alt="" fill sizes="(max-width: 600px) 80vw, (max-width: 1150px) 40vw, 25vw" />
                </div>
                <h3>{c.titulo} <Icono nombre="flecha" tamano={18} /></h3>
                <p>{c.detalle}</p>
              </Link>
            </li>
          ))}
        </Carrusel>
      </section>

      {/* ---- Agenda ---- */}
      <section className="bloque contenedor" id="agenda" aria-labelledby="agenda-titulo">
        <Cabecera id="agenda-titulo" kicker="Agenda" titulo={agenda.length ? "Esta semana en la ciudad" : "Fechas para agendar"}
          bajada={agenda.length
            ? "Actividades con fecha confirmada."
            : "Todavía no hay actividades con fecha confirmada para las próximas semanas. Estas son las próximas fechas que la ciudad celebra cada año."}
          enlace={{ texto: "Ver la agenda completa", url: "/agenda" }} />
        <ul className="agenda">
          {agenda.map((o) => {
            const { dia, mes } = partesDeFecha(o.inicio);
            return (
              <li key={`${o.evento}-${o.inicio}`}>
                <Link className="evento evento--enlace" href={rutas.evento(o.evento)}>
                  <div className="evento__fecha" aria-hidden="true">
                    <span className="evento__mes">{mes}</span>
                    <span className="evento__dia">{dia}</span>
                  </div>
                  <h3>{o.datos.titulo}</h3>
                  {o.enCurso && <Marca tipo="exito">En curso</Marca>}
                  <p className="evento__cuando">{formatearOcurrencia(o)}</p>
                  {(o.sede || o.datos.sede) && <p className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{o.sede || o.datos.sede}</p>}
                </Link>
              </li>
            );
          })}
          {calendario.map((e) => {
            const r = e.recurrente!;
            return (
              <li key={e.slug}>
                <Link className="evento evento--enlace" href={rutas.evento(e.slug)}>
                  <div className={`evento__fecha${r.dia ? "" : " evento__fecha--mes"}`} aria-hidden="true">
                    <span className="evento__mes">{MESES[r.mes - 1].slice(0, 3).toUpperCase()}</span>
                    {r.dia && <span className="evento__dia">{r.dia}</span>}
                  </div>
                  <h3>
                    <span className="visualmente-oculto">Cada {r.dia ? `${r.dia} de ` : ""}{MESES[r.mes - 1]}: </span>
                    {e.titulo}
                  </h3>
                  {e.fueraDeLaCiudad && <Marca tipo="alerta">Fuera de la ciudad</Marca>}
                  <p className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{e.fueraDeLaCiudad ? e.localidad || e.sede : e.sede}</p>
                  <p>{e.resumen}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Recorridos ---- */}
      <section className="recorridos" id="recorridos" aria-labelledby="recorridos-titulo">
        <div className="contenedor">
          <div className="recorridos__grilla">
            <div className="recorridos__texto">
              <p className="kicker">Recorré la ciudad</p>
              <h2 id="recorridos-titulo">Conocé la ciudad con guía, gratis</h2>
              <p>Recorridos guiados y gratuitos de unas dos horas en el Bus Turístico. Cada circuito propone una mirada distinta sobre la identidad tucumana.</p>
              <ul className="datos-bus">
                <li><Icono nombre="bus-linea" tamano={16} /> Bus turístico</li>
                <li><Icono nombre="reloj" tamano={16} /> Unas 2 horas</li>
                <li><Icono nombre="brujula" tamano={16} /> {circuitosBus.length} circuitos</li>
                <li><Icono nombre="ticket" tamano={16} /> Gratuito</li>
              </ul>
              <div className="inscripcion">
                <h3>Salidas y reservas</h3>
                <p>Los horarios de salida, los cupos y la reserva se gestionan en el sitio del Bus Turístico.</p>
                <Enlace className="boton boton--amarillo" href={BUS_TURISTICO}>
                  <Icono nombre="bus-linea" tamano={18} /> Ver salidas y reservar en Bus Turístico <Icono nombre="externo" tamano={16} />
                </Enlace>
              </div>
            </div>

            <div className="circuitos">
              <ol className="circuitos__lista">
                {circuitosBus.map((r, i) => (
                  <li key={r.slug}>
                    <Link className="circuito-enlace" href={rutas.recorrido(r.slug)}>
                      <span className="circuitos__numero">{i + 1}</span>
                      <span>
                        <strong>{r.titulo}</strong>
                        <small>{r.resumen} · {r.paradas.length} paradas</small>
                      </span>
                      <Icono nombre="flecha" tamano={18} />
                    </Link>
                  </li>
                ))}
              </ol>
              <Link className="cabecera__enlace circuitos__todos" href="/recorridos">
                Todos los recorridos <Icono nombre="flecha" tamano={18} />
              </Link>
            </div>
          </div>

          {experiencias.length > 0 && (
            <ul className="experiencias" aria-label="Otras experiencias">
              {experiencias.slice(0, 3).map((e) => (
                <li key={e.slug}>
                  <Link className="experiencia" href={rutas.experiencia(e.slug)}>
                    <span className="experiencia__icono"><Icono nombre={e.modalidad === "a-pie" ? "caminata" : "hoja-linea"} tamano={24} /></span>
                    <div>
                      <h3>{e.titulo} <Icono nombre="flecha" tamano={15} /></h3>
                      <p>{e.resumen}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---- Itinerarios ---- */}
      {itinerarios.length > 0 && (
        <section className="bloque contenedor" aria-labelledby="tiempo-titulo">
          <Cabecera id="tiempo-titulo" kicker="Primera visita" titulo="¿Cuánto tiempo tenés?"
            bajada="Itinerarios sugeridos para recorrer por tu cuenta." enlace={{ texto: "Descubrí San Miguel", url: "/descubri" }} />
          <ul className="itinerarios">
            {itinerarios.map((r) => (
              <li key={r.slug}>
                <Link className="itinerario" href={rutas.recorrido(r.slug)}>
                  <span className="itinerario__duracion">{r.duracion}</span>
                  <strong>{r.titulo}</strong>
                  <span>{r.resumen}</span>
                  {r.estado === "borrador" && <Marca tipo="borrador">Borrador</Marca>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Sabores ---- */}
      <section className="bloque contenedor" id="sabores" aria-labelledby="sabores-titulo">
        <Cabecera id="sabores-titulo" kicker="Gastronomía" titulo="Sabores tucumanos"
          bajada="Cuatro platos que no te podés ir sin probar." enlace={{ texto: "Más sobre sabores", url: "/sabores" }} />
        <ul className="sabores">
          {platos.map((s) => (
            <li key={s.slug}>
              <article className={`sabor tono-${s.tono}`}>
                <div className="sabor__imagen"><Image src={s.imagen.src} alt={s.imagen.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                <div className="sabor__texto">
                  <h3>{s.titulo}</h3>
                  <p>{s.detalle}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Planificá ---- */}
      <section className="bloque contenedor" id="antes-de-llegar" aria-labelledby="antes-titulo">
        <Cabecera id="antes-titulo" kicker="Planificá tu visita" titulo="Antes de llegar"
          bajada="Lo básico para moverte por la ciudad desde el primer día." enlace={{ texto: "Todas las guías", url: "/planifica" }} />
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
            {guias.filter((g) => g.estado === "publicado").slice(0, 4).map((g, i) => (
              <li key={g.slug}>
                <Link className={`dato dato--enlace tono-${[1, 3, 0, 2][i]}`} href={rutas.guia(g.slug)}>
                  <span className="icono-pastel"><Icono nombre={g.icono} tamano={24} /></span>
                  <div>
                    <h3>{g.titulo}</h3>
                    <p>{g.resumen}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Escapadas ---- */}
      {escapadas.length > 0 && (
        <section className="bloque contenedor" id="escapadas" aria-labelledby="escapadas-titulo">
          <Cabecera id="escapadas-titulo" kicker="Escapadas · Fuera de la ciudad" titulo="Más allá de San Miguel"
            bajada="Para ampliar la estadía: cerros, valles y ruinas a pocas horas, fuera del ejido municipal."
            enlace={{ texto: "Ver escapadas", url: "/escapadas" }} />
          <ul className="escapadas">
            {escapadas.map((e) => (
              <li key={e.slug}>
                <article className={`escapada tono-${e.tono}`}>
                  <div className="escapada__imagen"><Image src={e.imagen.src} alt={e.imagen.alt} fill sizes="144px" /></div>
                  <div>
                    {e.distancia && <span className="escapada__distancia"><Icono nombre="ubicacion" tamano={14} />A unos {e.distancia}</span>}
                    <h3>{e.titulo}</h3>
                    <p>{e.detalle}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Contacto ---- */}
      <section className="bloque contenedor contacto" id="contacto" aria-labelledby="contacto-titulo">
        <div className="oficina">
          <p className="kicker">Ayuda</p>
          <h2 id="contacto-titulo">¿Tenés dudas? Te ayudamos a armar tu visita</h2>
          <p>La {sitio.turismo.area} de la Municipalidad responde consultas sobre recorridos, horarios y actividades.</p>
          <ul className="oficina__datos">
            <li><span className="icono-pastel"><Icono nombre="ubicacion" tamano={20} /></span>{sitio.turismo.domicilio}</li>
            <li><span className="icono-pastel"><Icono nombre="correo" tamano={20} /></span><a href={`mailto:${sitio.turismo.email}`}>{sitio.turismo.email}</a></li>
            {sitio.turismo.atencion && <li><span className="icono-pastel"><Icono nombre="reloj" tamano={20} /></span>{sitio.turismo.atencion}</li>}
          </ul>
          <div className="oficina__acciones">
            <a className="boton boton--primario" href={`mailto:${sitio.turismo.email}`}>Escribinos <Icono nombre="flecha" tamano={18} /></a>
            <div className="oficina__redes">
              {sitio.redes.map((red) => (
                <a key={red.url} href={red.url} rel="noopener" target="_blank" aria-label={`${red.titulo} de la Municipalidad (se abre en otra pestaña)`}>
                  <Icono nombre={red.icono} tamano={20} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Enlace className="mapa" href={MAPA}>
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
        </Enlace>
      </section>
    </>
  );
}
