"use client";

import { useEffect, useState } from "react";

import { Icono } from "./Iconos";
import { Vinculo as Link } from "./i18n/Idioma";

export type AccesoHoy = { titulo: string; detalle: string; url: string; icono: string; tono: number };
type Perfil = "vecino" | "turista";

const GUARDADO = "portada-perfil";

/**
 * «¿Qué hacer hoy?» en la portada: accesos con datos del día (la agenda, los talleres, el bus, los museos),
 * distintos para quien vive en la ciudad y para quien está de visita. Los arma el servidor; acá solo se elige
 * el perfil, que queda recordado en este navegador.
 */
export function QueHacerHoy({ t, accesos }: {
  t: { kicker: string; titulo: string; perfil: string; vecino: string; turista: string };
  accesos: Record<Perfil, AccesoHoy[]>;
}) {
  const [perfil, setPerfil] = useState<Perfil>("vecino");

  useEffect(() => {
    try {
      const previo = localStorage.getItem(GUARDADO);
      if (previo === "vecino" || previo === "turista") setPerfil(previo);
    } catch { /* sin almacenamiento: queda «vecino» */ }
  }, []);

  const elegir = (p: Perfil) => {
    setPerfil(p);
    try { localStorage.setItem(GUARDADO, p); } catch { /* sin almacenamiento */ }
  };

  return (
    <section className="bloque contenedor hoy" id="hoy" aria-labelledby="hoy-titulo">
      <div className="hoy__cabecera">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h2 id="hoy-titulo">{t.titulo}</h2>
        </div>
        <div className="hoy__perfil" role="group" aria-label={t.perfil}>
          {(["vecino", "turista"] as const).map((p) => (
            <button key={p} type="button" aria-pressed={perfil === p} onClick={() => elegir(p)}>
              <Icono nombre={p === "vecino" ? "persona" : "avion"} tamano={16} /> {t[p]}
            </button>
          ))}
        </div>
      </div>
      <ul className="hoy__accesos">
        {accesos[perfil].map((a) => (
          <li key={a.url}>
            <Link className={`acceso tono-${a.tono}`} href={a.url}>
              <span className="icono-pastel"><Icono nombre={a.icono} tamano={24} /></span>
              <span><strong>{a.titulo}</strong><small>{a.detalle}</small></span>
              <Icono nombre="flecha" tamano={18} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
