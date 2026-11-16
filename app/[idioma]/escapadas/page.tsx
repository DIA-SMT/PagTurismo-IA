import type { Metadata } from "next";
import Image from "next/image";

import { Icono } from "@/components/Iconos";
import { Aviso, EncabezadoPagina, Enlace, Marca } from "@/components/Ui";
import { contenido } from "@/lib/datos";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).paginas.escapadas;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/escapadas") };
}

export default async function Escapadas() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.paginas.escapadas;
  const escapadas = c.escapadas;
  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.miga }]}
        kicker={t.miga}
        titulo={t.encabezado}
        bajada={t.bajada}
      />
      <div className="contenedor bloque-interno">
        <Aviso tipo="alerta">{t.aviso}</Aviso>
        <ul className="escapadas escapadas--pagina">
          {escapadas.map((e) => (
            <li key={e.slug}>
              <article className={`escapada tono-${e.tono}`}>
                <div className="escapada__imagen"><Image src={e.imagen.src} alt={e.imagen.alt} fill sizes="144px" /></div>
                <div>
                  <Marca tipo="alerta">{textos.comun.ui.fueraDeLaCiudad}</Marca>
                  {e.distancia && <span className="escapada__distancia"><Icono nombre="ubicacion" tamano={14} />{formatear(t.distancia, { distancia: e.distancia })}{e.localidad ? ` · ${e.localidad}` : ""}</span>}
                  <h2>{e.titulo}</h2>
                  <p>{e.detalle}</p>
                  {e.url && <Enlace href={e.url} className="enlace-flecha">{t.masInformacion} <Icono nombre="externo" tamano={14} /></Enlace>}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
