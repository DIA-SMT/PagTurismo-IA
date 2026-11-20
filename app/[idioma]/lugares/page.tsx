import type { Metadata } from "next";

import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { catalogo, contenido } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import type { Lugar } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).cultura.lugares;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/lugares") };
}

type Tipo = "cultural" | "aire-libre" | "otros";
const TIPOS: Tipo[] = ["cultural", "aire-libre", "otros"];
const tipoDe = (l: Lugar): Tipo => l.tipoEspacio ?? "otros";

/**
 * Todos los lugares, agrupados por tipo de espacio. Reemplaza a /espacios-culturales y
 * /espacios-al-aire-libre de Agenda Cultural (que redirigen acá con ?tipo=).
 */
export default async function Lugares({ searchParams }: PageProps<"/[idioma]/lugares">) {
  const [c, textos, sp] = await Promise.all([contenido(), textosActuales(), searchParams]);
  const t = textos.cultura.lugares;
  const pedido = typeof sp.tipo === "string" && (TIPOS as string[]).includes(sp.tipo) ? (sp.tipo as Tipo) : null;
  const items = new Map(catalogo(c).filter((i) => i.entidad === "lugar").map((i) => [i.slug, i]));
  const titulo: Record<Tipo, string> = { cultural: t.cultural, "aire-libre": t.aireLibre, otros: t.otros };
  const grupos = TIPOS
    .filter((tipo) => !pedido || pedido === tipo)
    .map((tipo) => ({ tipo, lugares: c.lugares.filter((l) => tipoDe(l) === tipo) }))
    .filter((g) => g.lugares.length);

  return (
    <div data-modulo="cultura">
      <EncabezadoPagina migas={[{ texto: t.titulo }]} kicker={t.titulo} titulo={t.encabezado} bajada={t.bajada} />
      <div className="contenedor bloque-interno">
        <nav className="segmentado segmentado--grande" aria-label={t.filtro}>
          {([null, ...TIPOS] as (Tipo | null)[]).map((tipo) => (
            <Link key={tipo ?? "todos"} href={tipo ? `/lugares?tipo=${tipo}` : "/lugares"} aria-current={pedido === tipo ? "page" : undefined}
              className="segmentado__enlace">
              <span>{tipo ? titulo[tipo] : t.todos}</span>
            </Link>
          ))}
        </nav>
        {grupos.map((g) => (
          <section className="grupo" key={g.tipo} aria-labelledby={`grupo-${g.tipo}`}>
            <h2 id={`grupo-${g.tipo}`}>{titulo[g.tipo]}</h2>
            <ul className="items">
              {g.lugares.map((l) => {
                const i = items.get(l.slug);
                return i && <li key={l.slug}><TarjetaItem item={i} /></li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
