"use client";

/*
 * Piezas de la agenda cultural y los lugares: compartir, galería y mapa. Vienen de Agenda Cultural
 * (share-actions, photo-gallery, map-embed) con el sistema de diseño del portal.
 */

import { useState } from "react";

import { Icono } from "@/components/Iconos";
import { useTextos } from "@/components/i18n/Idioma";
import { formatear } from "@/lib/i18n/definir";
import type { Imagen } from "@/lib/tipos";

/** WhatsApp, copiar el enlace y, si se pasa `ics`, todas las fechas al calendario. */
export function Compartir({ titulo, ics, google }: { titulo: string; ics?: string; google?: string }) {
  const { cultura: t } = useTextos();
  const [copiado, setCopiado] = useState(false);
  const url = () => window.location.href;

  return (
    <div className="compartir" role="group" aria-label={t.compartir.titulo}>
      <a className="boton boton--claro" href="#" onClick={(e) => {
        e.preventDefault();
        window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo} ${url()}`)}`, "_blank", "noopener");
      }}>
        <Icono nombre="compartir" tamano={16} /> {t.compartir.whatsapp}
      </a>
      <button type="button" className="boton boton--claro" onClick={async () => {
        try {
          await navigator.clipboard.writeText(url());
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          /* sin portapapeles: el enlace está en la barra de direcciones */
        }
      }}>
        <Icono nombre={copiado ? "check" : "copiar"} tamano={16} /> {copiado ? t.compartir.copiado : t.compartir.copiar}
      </button>
      {ics && (
        <a className="boton boton--claro" href={ics} download>
          <Icono nombre="calendario" tamano={16} /> {t.compartir.calendarioCompleto}
        </a>
      )}
      {google && (
        <a className="boton boton--claro" href={google} target="_blank" rel="noopener">
          <Icono nombre="externo" tamano={16} /> {t.compartir.google}
        </a>
      )}
      <span className="visualmente-oculto" aria-live="polite">{copiado ? t.compartir.copiado : ""}</span>
    </div>
  );
}

/** Fotos adicionales con su crédito. Livianas: se cargan al acercarse. */
export function Galeria({ fotos }: { fotos: Imagen[] }) {
  const { cultura: t } = useTextos();
  if (!fotos.length) return null;
  return (
    <section aria-labelledby="galeria-titulo">
      <h2 id="galeria-titulo">{t.lugares.galeria}</h2>
      <ul className="galeria">
        {fotos.map((f, i) => (
          <li key={f.src}>
            <figure>
              <a className="galeria__marco" href={f.src} target="_blank" rel="noopener"
                aria-label={f.alt || formatear(t.lugares.foto, { n: i + 1, total: fotos.length })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={f.alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </a>
              {f.credito && <figcaption>{f.credito}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mapa de OpenStreetMap (sin claves ni cookies de terceros) y enlace para llegar. */
export function MapaEmbebido({ lat, lng, nombre }: { lat: number; lng: number; nombre: string }) {
  const { cultura: t } = useTextos();
  const d = 0.004;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d * 0.7},${lng + d},${lat + d * 0.7}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <section aria-labelledby="mapa-titulo">
      <h2 id="mapa-titulo">{t.lugares.mapa}</h2>
      <div className="mapa-embebido">
        <iframe src={src} title={`${t.lugares.mapa}: ${nombre}`} loading="lazy" referrerPolicy="no-referrer" />
      </div>
      <p style={{ marginTop: "0.75rem" }}>
        <a className="enlace-flecha" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener">
          <Icono nombre="mapa" tamano={16} /> {t.lugares.comoLlegar}
        </a>
      </p>
    </section>
  );
}
