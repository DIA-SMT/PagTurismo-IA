import type { Metadata } from "next";
import Image from "next/image";

import { Icono } from "@/components/Iconos";
import { Aviso, EncabezadoPagina, Enlace, Marca } from "@/components/Ui";
import { getEscapadas } from "@/lib/datos";

export const metadata: Metadata = {
  title: "Escapadas desde la ciudad",
  description: "Cerro San Javier, Tafí del Valle y las Ruinas de Quilmes: salidas para ampliar la estadía fuera de San Miguel de Tucumán.",
  alternates: { canonical: "/escapadas" },
};

export default function Escapadas() {
  const escapadas = getEscapadas();
  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Escapadas" }]}
        kicker="Escapadas"
        titulo="Más allá de la ciudad"
        bajada="Tucumán es la provincia más chica del país: cerros, diques, valles y ruinas quedan a pocas horas."
      />
      <div className="contenedor bloque-interno">
        <Aviso tipo="alerta">
          Estos destinos están fuera de San Miguel de Tucumán y no dependen de la Municipalidad. Las distancias son aproximadas desde el centro.
        </Aviso>
        <ul className="escapadas escapadas--pagina">
          {escapadas.map((e) => (
            <li key={e.slug}>
              <article className={`escapada tono-${e.tono}`}>
                <div className="escapada__imagen"><Image src={e.imagen.src} alt={e.imagen.alt} fill sizes="144px" /></div>
                <div>
                  <Marca tipo="alerta">Fuera de la ciudad</Marca>
                  {e.distancia && <span className="escapada__distancia"><Icono nombre="ubicacion" tamano={14} />A unos {e.distancia}{e.localidad ? ` · ${e.localidad}` : ""}</span>}
                  <h2>{e.titulo}</h2>
                  <p>{e.detalle}</p>
                  {e.url && <Enlace href={e.url} className="enlace-flecha">Más información <Icono nombre="externo" tamano={14} /></Enlace>}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
