import { Icono } from "@/components/Iconos";
import { estructurarDescripcion, type ClaveDato } from "@/lib/cultura/descripcion";
import { formatear } from "@/lib/i18n/definir";
import type { Textos } from "@/lib/i18n/textos";

const ICONO: Record<ClaveDato, string> = {
  duracion: "reloj", encuentro: "ubicacion", horario: "calendario", lugar: "ubicacion", costo: "ticket",
  cupo: "personas", edad: "persona", requisitos: "info", organiza: "info", docente: "persona",
};

/** Más de esto, y el texto restante se pliega detrás de «Leer la descripción completa». */
const LARGO_VISIBLE = 320;

/**
 * La descripción de un evento, para recorrer con la vista: datos clave en tarjetas, el itinerario como una
 * línea de paradas, los enlaces como botones y el resto como texto (plegado si es largo).
 */
export function DescripcionEvento({ texto, resumen, t }: { texto?: string; resumen: string; t: Textos["cultura"]["descripcion"] }) {
  const d = estructurarDescripcion(texto, resumen);
  const tarjetas = [
    ...d.datos.map((x) => ({ icono: ICONO[x.clave], titulo: t.datos[x.clave], texto: x.valor, aviso: false })),
    ...(d.anticipacion ? [{ icono: "alerta", titulo: formatear(t.anticipacion, { n: d.anticipacion }), texto: t.anticipacionDetalle, aviso: true }] : []),
    ...(d.suspendePorLluvia ? [{ icono: "lluvia", titulo: t.lluvia, texto: t.lluviaDetalle, aviso: true }] : []),
  ];
  const largo = d.parrafos.join(" ").length;
  const [primero, ...resto] = d.parrafos;

  return (
    <div className="descripcion-evento">
      {tarjetas.length > 0 && (
        <section aria-labelledby="vistazo">
          <h2 id="vistazo" className="visualmente-oculto">{t.vistazo}</h2>
          <ul className="vistazo">
            {tarjetas.map((x) => (
              <li key={x.titulo} className={x.aviso ? "vistazo__item vistazo__item--aviso" : "vistazo__item"}>
                <span className="vistazo__icono" aria-hidden="true"><Icono nombre={x.icono} tamano={22} /></span>
                <span>
                  {x.aviso ? <strong>{x.titulo}</strong> : <small>{x.titulo}</small>}
                  {x.aviso ? <small>{x.texto}</small> : <strong>{x.texto}</strong>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.enlaces.length > 0 && (
        <div className="descripcion-evento__acciones">
          {d.enlaces.map((e, i) => (
            <a key={e.url} className={`boton ${i === 0 ? "boton--primario" : "boton--claro"}`} href={e.url} target="_blank" rel="noopener">
              {e.tipo === "inscripcion" ? t.inscribirse : t.masInfo} <Icono nombre="externo" tamano={16} />
            </a>
          ))}
        </div>
      )}

      {d.itinerario.length > 0 && (
        <section aria-labelledby="recorrido" className="itinerario-evento">
          <h2 id="recorrido">{t.recorrido} <small>{formatear(t.paradas, { n: d.itinerario.length })}</small></h2>
          <ol>
            {d.itinerario.map((p, i) => (
              <li key={`${i}-${p.titulo}`}>
                <span className="itinerario-evento__numero" aria-hidden="true">{i + 1}</span>
                <span className="itinerario-evento__texto">
                  <strong>{p.titulo}</strong>
                  {p.detalle && <span>{p.detalle}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {primero && (
        <div className="prosa">
          <p>{primero}</p>
          {resto.length > 0 && (largo > LARGO_VISIBLE ? (
            <details className="descripcion-evento__mas">
              <summary>{t.leerMas}</summary>
              {resto.map((p, i) => <p key={i}>{p}</p>)}
            </details>
          ) : resto.map((p, i) => <p key={i}>{p}</p>))}
        </div>
      )}
    </div>
  );
}
