import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Cabecera } from "@/components/Ui";
import { CENTROS_TALLERES, TALLERES } from "@/lib/cultura/datos-talleres";
import { DISCIPLINAS, type DiaTaller, type Disciplina } from "@/lib/cultura/talleres";
import { diaDeSemana } from "@/lib/fechas";
import { formatear } from "@/lib/i18n/definir";
import type { Textos } from "@/lib/i18n/textos";

/** El «sticker» de cada disciplina (como los de las categorías de la agenda). */
const STICKER: Record<Disciplina, string> = {
  danza: "💃", musica: "🎸", artes: "🎨", oficios: "🧵", bienestar: "🧘", letras: "📚", teatro: "🎭", otros: "✨",
};
const MAX_HOY = 6;

/**
 * Talleres en la portada: las disciplinas como accesos (con cuántos talleres hay de cada una) y lo que se dicta
 * hoy en los centros culturales (el domingo no hay: se muestra el lunes).
 */
export function TalleresPortada({ t, ahora = Date.now() }: { t: Textos["talleres"]; ahora?: number }) {
  const talleres = TALLERES.talleres;
  const centro = new Map(CENTROS_TALLERES.map((k) => [k.slug, k.nombre]));
  const deUnDia = (dia: number) => talleres
    .flatMap((x) => x.horarios.filter((h) => h.dia === dia).map((h) => ({ taller: x, h })))
    .sort((a, b) => a.h.desde.localeCompare(b.h.desde));
  // Hoy, lo que todavía no empezó; si ya no queda nada, el próximo día con talleres (el domingo no hay).
  const hoy = diaDeSemana(ahora);
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Tucuman", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ahora);
  const quedanHoy = hoy === 0 ? [] : deUnDia(hoy).filter(({ h }) => h.desde >= hora);
  const dia = (quedanHoy.length ? hoy : hoy === 6 || hoy === 0 ? 1 : hoy + 1) as DiaTaller;
  const delDia = quedanHoy.length ? quedanHoy : deUnDia(dia);
  const titulo = quedanHoy.length ? t.hoyTitulo : dia === 1 ? t.proximoTitulo : t.mananaTitulo;
  const disciplinas = DISCIPLINAS.map((d) => ({ d, n: talleres.filter((x) => x.disciplina === d).length })).filter((x) => x.n);

  return (
    <section className="bloque contenedor talleres-portada" id="talleres" aria-labelledby="talleres-titulo" data-modulo="cultura">
      <Cabecera id="talleres-titulo" kicker={t.portadaKicker} titulo={t.portadaTitulo} bajada={t.portadaBajada}
        enlace={{ texto: formatear(t.portadaVerTodos, { n: talleres.length }), url: "/talleres" }} />
      <div className="talleres-portada__cuerpo">
        <ul className="talleres-portada__disciplinas">
          {disciplinas.map(({ d, n }) => (
            <li key={d}>
              <Link className="disciplina-taller" href={`/talleres?disciplina=${d}`}>
                <span className="disciplina-taller__sticker" aria-hidden="true">{STICKER[d]}</span>
                <strong>{t.disciplinas[d]}</strong>
                <small>{formatear(t.cantidad, { n })}</small>
              </Link>
            </li>
          ))}
        </ul>

        {delDia.length > 0 && (
          <div className="talleres-portada__hoy">
            <h3>{titulo}</h3>
            <ol>
              {delDia.slice(0, MAX_HOY).map(({ taller, h }) => (
                <li key={`${taller.id}-${h.desde}`}>
                  <span className="talleres-portada__hora">{h.desde}</span>
                  <span>
                    <strong>{taller.titulo}{h.nota ? ` · ${h.nota}` : ""}</strong>
                    <small>{centro.get(taller.centro) ?? taller.centro}</small>
                  </span>
                </li>
              ))}
            </ol>
            <Link className="enlace-flecha" href={`/talleres?dia=${dia}`}>
              {t.verDelDia} ({deUnDia(dia).length}) <Icono nombre="flecha" tamano={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
