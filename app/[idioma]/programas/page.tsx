import type { Metadata } from "next";
import Image from "next/image";

import { GrillaEventos } from "@/components/cultura/Agenda";
import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina } from "@/components/Ui";
import { CIFRAS_CREAR_ENCUENTRO, ESQUINAS, PROGRAMAS, SEDE_PROGRAMAS, esDelPrograma, type IdPrograma } from "@/lib/cultura/programas";
import { contenido, ocurrenciasDeAgenda } from "@/lib/datos";
import { LOCALE } from "@/lib/i18n/config";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { rutas } from "@/lib/rutas";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).programas.pagina;
  return { title: t.titulo, description: t.meta, alternates: await alternativas("/programas") };
}

const MAX_ACTIVIDADES = 3;

/**
 * Los programas de la Dirección de Gestión Cultural: Crear Encuentro (cultura en los barrios y la Red de
 * Promotores Culturales) y Cultura Joven. Si en la agenda hay actividades de alguno, aparecen en su bloque.
 */
export default async function Programas() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.programas;
  const numero = new Intl.NumberFormat(LOCALE[c.idioma].intl);
  const ocurrencias = ocurrenciasDeAgenda(c);
  const programa = (id: IdPrograma) => PROGRAMAS.find((p) => p.id === id)!;
  const actividades = (id: IdPrograma) => ocurrencias.filter((o) => esDelPrograma(programa(id), o));
  const sede = c.lugares.find((l) => l.slug === SEDE_PROGRAMAS);
  const ce = t.crearEncuentro;
  const cj = t.culturaJoven;
  const nombres: Record<IdPrograma, { nombre: string; bajada: string; logoAlt: string }> = { "crear-encuentro": ce, "cultura-joven": cj };
  const cifras = [
    { n: CIFRAS_CREAR_ENCUENTRO.promotores, texto: ce.cifras.promotores, nota: formatear(ce.cifras.promotoresMeta, { n: CIFRAS_CREAR_ENCUENTRO.promotoresMeta }) },
    { n: CIFRAS_CREAR_ENCUENTRO.promotoresJovenes, texto: ce.cifras.jovenes },
    { n: CIFRAS_CREAR_ENCUENTRO.espectadores, texto: ce.cifras.espectadores },
    { n: CIFRAS_CREAR_ENCUENTRO.acciones, texto: ce.cifras.acciones },
  ];

  const bloqueActividades = (id: IdPrograma) => {
    const lista = actividades(id);
    if (!lista.length) return null;
    return (
      <div className="programa__actividades">
        <div className="grupo__cabecera">
          <h3>{t.pagina.actividades}</h3>
          <Link className="cabecera__enlace" href={`/agenda?q=${encodeURIComponent(nombres[id].nombre)}`}>{t.pagina.verAgenda} <Icono nombre="flecha" tamano={18} /></Link>
        </div>
        <GrillaEventos ocurrencias={lista.slice(0, MAX_ACTIVIDADES)} categorias={c.categoriasAgenda} titulo="h3" />
      </div>
    );
  };
  const prensa = (id: IdPrograma) => (
    <a className="enlace-flecha" href={programa(id).prensa} rel="noopener" target="_blank">
      {t.pagina.prensa} <Icono nombre="externo" tamano={16} /><span className="visualmente-oculto">{textos.comun.controles.otraPestana}</span>
    </a>
  );

  return (
    <div data-modulo="cultura">
      <EncabezadoPagina migas={[{ texto: t.pagina.titulo }]} kicker={t.pagina.kicker} titulo={t.pagina.titulo} bajada={t.pagina.bajada} />
      <div className="contenedor bloque-interno programas">
        <nav className="programas__indice" aria-label={t.pagina.indice}>
          {PROGRAMAS.map((p, i) => (
            <a key={p.id} className={`programa-acceso tono-${[0, 3][i]}`} href={`#${p.id}`}>
              <Image src={p.logo.src} alt="" width={p.logo.ancho} height={p.logo.alto} sizes="96px" />
              <span>
                <strong>{nombres[p.id].nombre}</strong>
                <small>{nombres[p.id].bajada}</small>
              </span>
              <Icono nombre="abajo" tamano={18} />
            </a>
          ))}
        </nav>

        {/* ---- Crear Encuentro ---- */}
        <section className="programa" id="crear-encuentro" aria-labelledby="crear-encuentro-titulo">
          <header className="programa__cabecera">
            <Image className="programa__logo" src={programa("crear-encuentro").logo.src} alt={ce.logoAlt} width={1024} height={1024} sizes="160px" />
            <div>
              <h2 id="crear-encuentro-titulo">{ce.nombre}</h2>
              <p className="programa__bajada">{ce.bajada}</p>
              <p>{ce.objetivo}</p>
            </div>
          </header>
          <ul className="programa__cifras">
            {cifras.map((k) => (
              <li key={k.texto}>
                <strong>{numero.format(k.n)}</strong>
                <span>{k.texto}</span>
                {k.nota && <small>{k.nota}</small>}
              </li>
            ))}
          </ul>
          <ul className="programa__lineas">
            {Object.values(ce.lineas).map((l, i) => (
              <li key={l.titulo} className={`tono-${[1, 4, 2][i]}`}>
                <h3>{l.titulo}</h3>
                <p>{l.texto}</p>
              </li>
            ))}
          </ul>
          <p className="programa__nota">{ce.modelo}</p>
          {prensa("crear-encuentro")}
          {bloqueActividades("crear-encuentro")}
        </section>

        {/* ---- Cultura Joven ---- */}
        <section className="programa" id="cultura-joven" aria-labelledby="cultura-joven-titulo">
          <header className="programa__cabecera">
            <Image className="programa__logo programa__logo--ancho" src={programa("cultura-joven").logo.src} alt={cj.logoAlt} width={431} height={306} sizes="200px" />
            <div>
              <h2 id="cultura-joven-titulo">{cj.nombre}</h2>
              <p className="programa__bajada">{cj.bajada}</p>
              <p>{cj.intro}</p>
            </div>
          </header>
          <div className="programa__objetivo">
            <h3>{cj.objetivoTitulo}</h3>
            <p>{cj.objetivo}</p>
          </div>
          <h3 className="programa__subtitulo">{cj.ejesTitulo}</h3>
          <ol className="programa__ejes">
            {Object.values(cj.ejes).map((e, i) => (
              <li key={e.titulo} className={`tono-${[3, 0, 4, 2][i]}`}>
                <span className="programa__numero" aria-hidden="true">{i + 1}</span>
                <h4>{e.titulo}</h4>
                <p>{e.texto}</p>
              </li>
            ))}
          </ol>
          <blockquote className="programa__lema"><p>{cj.lema}</p></blockquote>
          <div className="programa__esquinas">
            <Image src={ESQUINAS.logo.src} alt={cj.esquinasAlt} width={ESQUINAS.logo.ancho} height={ESQUINAS.logo.alto} sizes="220px" />
            <div>
              <h3>{cj.esquinasTitulo}</h3>
              <p>{cj.esquinasTexto}</p>
              <a className="boton boton--claro" href={ESQUINAS.instagram} rel="noopener" target="_blank">
                <Icono nombre="instagram" tamano={18} /> {cj.esquinasInstagram}<span className="visualmente-oculto">{textos.comun.controles.otraPestana}</span>
              </a>
            </div>
          </div>
          {prensa("cultura-joven")}
          {bloqueActividades("cultura-joven")}
        </section>

        {/* ---- Cómo ser parte (los dos programas) ---- */}
        <aside className="aviso-inscripcion" aria-labelledby="ser-parte">
          <span className="icono-pastel"><Icono nombre="personas" tamano={22} /></span>
          <div>
            <h2 id="ser-parte">{t.serParte.titulo}</h2>
            <p>{t.serParte.texto}</p>
            <p className="programa__sede">
              <span><Icono nombre="ubicacion" tamano={16} /> {t.serParte.direccion}</span>
              <span><Icono nombre="reloj" tamano={16} /> {t.serParte.horario}</span>
            </p>
          </div>
          {sede && <Link className="boton boton--primario" href={rutas.lugar(sede.slug)}>{t.serParte.verCentro} <Icono nombre="flecha" tamano={18} /></Link>}
        </aside>
      </div>
    </div>
  );
}
