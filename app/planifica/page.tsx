import type { Metadata } from "next";
import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Marca } from "@/components/Ui";
import { getClima } from "@/lib/clima";
import { getGuias, getSitio } from "@/lib/datos";
import { rutas } from "@/lib/rutas";

export const metadata: Metadata = {
  title: "Planificá tu visita",
  description: "Cómo llegar a San Miguel de Tucumán, cómo moverse por la ciudad, accesibilidad, datos útiles y contacto con la Dirección de Turismo.",
  alternates: { canonical: "/planifica" },
};

export const revalidate = 1800;

export default async function Planifica() {
  const guias = getGuias();
  const sitio = getSitio();
  const clima = await getClima();

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Planificá tu visita" }]}
        kicker="Planificá tu visita"
        titulo="Todo para organizar el viaje"
        bajada="Cómo llegar, cómo moverte, qué tener en cuenta y a quién preguntar."
      />

      <div className="contenedor bloque-interno">
        <ul className="guias">
          {guias.map((g, i) => (
            <li key={g.slug}>
              <Link className={`guia-tarjeta tono-${[1, 3, 0, 2, 4, 5][i % 6]}`} href={rutas.guia(g.slug)}>
                <span className="icono-pastel"><Icono nombre={g.icono} tamano={24} /></span>
                <span className="guia-tarjeta__texto">
                  <strong>{g.titulo}</strong>
                  {g.estado === "borrador" && <Marca tipo="borrador">Borrador</Marca>}
                  <span>{g.resumen}</span>
                </span>
                <Icono nombre="flecha" tamano={18} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="antes antes--planifica">
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
            <p>Clima subtropical: veranos cálidos y lluviosos, inviernos templados y secos.</p>
            {clima && <small>Datos de <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a></small>}
          </div>

          <section className="oficina oficina--compacta" aria-labelledby="ayuda">
            <p className="kicker">Ayuda</p>
            <h2 id="ayuda">¿Tenés dudas? Escribinos</h2>
            <p>La {sitio.turismo.area} responde consultas sobre recorridos, horarios y actividades.</p>
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
