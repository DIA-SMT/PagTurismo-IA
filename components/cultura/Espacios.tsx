import Image from "next/image";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Marca } from "@/components/Ui";
import { formatear } from "@/lib/i18n/definir";
import type { Textos } from "@/lib/i18n/textos";
import { rutas } from "@/lib/rutas";
import type { Lugar } from "@/lib/tipos";

/**
 * Tarjeta de un museo o centro cultural: foto (o un ícono si todavía no tiene), qué es, dónde queda y lo que
 * pasa ahí (talleres y próximas actividades, cada uno con su enlace).
 */
export function TarjetaEspacio({ lugar: l, t, borrador, talleres, actividades, tono, icono }: {
  lugar: Lugar;
  t: Textos["espacios"]["tarjeta"];
  borrador: string;
  talleres?: number;
  actividades: number;
  tono: number;
  icono: string;
}) {
  return (
    <article className={`espacio tono-${tono}`}>
      <Link className="espacio__foto" href={rutas.lugar(l.slug)} tabIndex={-1} aria-hidden="true">
        {l.imagen
          ? <Image src={l.imagen.src} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />
          : <span className="espacio__icono"><Icono nombre={icono} tamano={40} /></span>}
      </Link>
      <div className="espacio__cuerpo">
        <p className="espacio__clase">{l.clase}</p>
        <h3><Link href={rutas.lugar(l.slug)}>{l.titulo}</Link></h3>
        {l.estado === "borrador" && <Marca tipo="borrador">{borrador}</Marca>}
        <p className="espacio__resumen">{l.resumen}</p>
        {l.direccion && <p className="espacio__dato"><Icono nombre="ubicacion" tamano={16} /> {l.direccion}</p>}
        <ul className="espacio__enlaces">
          {talleres !== undefined && talleres > 0 && (
            <li><Link href={`/talleres?centro=${l.slug}`}><Icono nombre="personas" tamano={16} /> {talleres === 1 ? t.unTaller : formatear(t.talleres, { n: talleres })}</Link></li>
          )}
          {actividades > 0 && (
            <li><Link href={`/agenda?lugar=${l.slug}`}><Icono nombre="calendario" tamano={16} /> {actividades === 1 ? t.unaActividad : formatear(t.actividades, { n: actividades })}</Link></li>
          )}
        </ul>
        <Link className="enlace-flecha" href={rutas.lugar(l.slug)}>{t.verFicha} <Icono nombre="flecha" tamano={16} /></Link>
      </div>
    </article>
  );
}
