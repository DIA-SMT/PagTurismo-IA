import Link from "next/link";
import type { ReactNode } from "react";

import { Icono } from "@/components/Iconos";
import type { EstadoAccion } from "@/lib/admin/acciones";

// Piezas comunes de las pantallas del panel. Sin hooks: sirven en servidor y en cliente.

/** Banda azul con el título de cada pantalla. Con migas, en las fichas; sin migas, el rótulo del panel. */
export function Banda({ titulo, bajada, acciones, migas }: {
  titulo: ReactNode;
  bajada?: ReactNode;
  acciones?: ReactNode;
  migas?: { href: string; texto: string }[];
}) {
  const anterior = migas?.at(-1);
  return (
    <div className="adm-banda">
      <div>
        {anterior && (
          <Link className="adm-volver" href={anterior.href}>
            <Icono nombre="flecha-izq" tamano={18} /> Volver a {anterior.texto}
          </Link>
        )}
        {migas ? (
          <nav className="adm-migas" aria-label="Estás en">
            <ol>
              <li><Link href="/admin">Panel</Link></li>
              {migas.map((m) => <li key={m.href}><Link href={m.href}>{m.texto}</Link></li>)}
            </ol>
          </nav>
        ) : (
          <p className="adm-banda__rotulo">Panel de Turismo</p>
        )}
        <h1>{titulo}</h1>
        {bajada && <p>{bajada}</p>}
      </div>
      {acciones && <div className="adm-banda__acciones">{acciones}</div>}
    </div>
  );
}

export function Tarjeta({ titulo, icono, descripcion, acciones, children, className = "" }: {
  titulo?: ReactNode;
  icono?: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-tarjeta ${className}`}>
      {titulo && (
        <div className="adm-tarjeta__cabecera">
          <h2>{icono && <Icono nombre={icono} tamano={20} />}{titulo}</h2>
          {acciones}
        </div>
      )}
      {descripcion && <p className="adm-tarjeta__descripcion">{descripcion}</p>}
      {children}
    </section>
  );
}

/** Indicador del tablero. Va dentro de un <dl className="adm-datos">. */
export function Dato({ etiqueta, valor, icono, detalle, tono = "azul", href }: {
  etiqueta: ReactNode;
  valor: ReactNode;
  icono: string;
  detalle?: ReactNode;
  tono?: "azul" | "amarillo" | "ambar";
  href?: string;
}) {
  const contenido = (
    <>
      <span className="adm-dato__icono" aria-hidden="true"><Icono nombre={icono} tamano={22} /></span>
      <div>
        <dt>{etiqueta}</dt>
        <dd className="adm-dato__valor">{valor}</dd>
        {detalle && <dd className="adm-dato__detalle">{detalle}</dd>}
      </div>
    </>
  );
  const clase = `adm-dato adm-dato--${tono}`;
  return href ? <Link className={clase} href={href}>{contenido}</Link> : <div className={clase}>{contenido}</div>;
}

export function Chip({ tono, children }: { tono: "verde" | "ambar" | "rojo" | "gris" | "azul"; children: ReactNode }) {
  return <span className={`adm-chip adm-chip--${tono}`}>{children}</span>;
}

export function ChipEstado({ estado }: { estado: string }) {
  return estado === "publicado" ? <Chip tono="verde">Publicado</Chip> : <Chip tono="ambar">Borrador</Chip>;
}

/** Resultado de un Server Action: éxito o error general. */
export function MensajeAccion({ estado }: { estado: EstadoAccion }) {
  if (estado.error) {
    return <p role="alert" className="adm-aviso adm-aviso--error"><span className="adm-aviso__icono" aria-hidden="true">!</span>{estado.error}</p>;
  }
  if (estado.ok && estado.mensaje) {
    return <p role="status" className="adm-aviso adm-aviso--ok"><span className="adm-aviso__icono" aria-hidden="true">✓</span>{estado.mensaje}</p>;
  }
  return null;
}

export function Aviso({ children, tono = "info" }: { children: ReactNode; tono?: "info" | "ok" | "error" }) {
  return <p className={`adm-aviso adm-aviso--${tono}`}><span className="adm-aviso__icono" aria-hidden="true">{tono === "error" ? "!" : tono === "ok" ? "✓" : "i"}</span><span>{children}</span></p>;
}

export function Vacio({ titulo, icono = "info", children, accion }: { titulo: ReactNode; icono?: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="adm-tarjeta adm-vacio">
      <span className="adm-vacio__icono" aria-hidden="true"><Icono nombre={icono} tamano={26} /></span>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {accion && <div style={{ marginTop: "1.25rem" }}>{accion}</div>}
    </div>
  );
}

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Tucuman", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function fechaCorta(valor: string | Date) {
  return fmtFecha.format(new Date(valor)).replace(",", " ·");
}
