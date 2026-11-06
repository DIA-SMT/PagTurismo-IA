import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";

export const metadata: Metadata = {
  title: "Sabores tucumanos",
  description: "Empanada tucumana, sánguche de milanesa, locro, tamales y humitas: los platos que no te podés ir sin probar.",
  alternates: { canonical: "/sabores" },
};

export default async function Sabores() {
  const c = await contenido();
  const platos = c.platos;
  const relacionados = catalogo(c).filter((i) => i.categorias.includes("sabores-tucumanos"));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Qué hacer", url: "/que-hacer" }, { texto: "Sabores tucumanos" }]}
        kicker="Gastronomía"
        titulo="Sabores tucumanos"
        bajada="Los platos que no te podés ir sin probar."
      />
      <div className="contenedor bloque-interno">
        <ul className="sabores">
          {platos.map((s) => (
            <li key={s.slug}>
              <article className={`sabor tono-${s.tono}`}>
                <div className="sabor__imagen"><Image src={s.imagen.src} alt={s.imagen.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                <div className="sabor__texto">
                  <h2>{s.titulo}</h2>
                  <p>{s.detalle}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {relacionados.length > 0 && (
          <section className="grupo" aria-labelledby="relacionados">
            <h2 id="relacionados">Fechas y propuestas para comer rico</h2>
            <ul className="items">{relacionados.map((i) => <li key={`${i.entidad}-${i.slug}`}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}

        <p className="texto-suave">
          <Link className="enlace-flecha" href="/que-hacer/sabores-tucumanos">Todo sobre sabores en el catálogo <Icono nombre="flecha" tamano={16} /></Link>
        </p>
      </div>
    </>
  );
}
