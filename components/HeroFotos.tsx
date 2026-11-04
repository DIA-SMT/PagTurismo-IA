"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { HERO } from "@/lib/contenido";

/**
 * Las panorámicas del hero. Hay una serie de día y otra de noche, y el CSS
 * muestra la que corresponde al tema: de noche la ciudad se ve de noche.
 *
 * Avanza sola cada ocho segundos salvo que el sistema pida menos movimiento,
 * y siempre se puede pausar: WCAG 2.2.2 pide un control para todo lo que se
 * mueve más de cinco segundos.
 */
export function HeroFotos() {
  const [foto, setFoto] = useState(0);
  const [pausado, setPausado] = useState<boolean | null>(null);

  useEffect(() => {
    const preferencia = matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => setPausado(preferencia.matches);
    sincronizar();
    preferencia.addEventListener("change", sincronizar);
    return () => preferencia.removeEventListener("change", sincronizar);
  }, []);

  useEffect(() => {
    if (pausado !== false) return;
    const reloj = window.setTimeout(() => {
      if (!document.hidden) setFoto((actual) => actual + 1);
    }, 8000);
    return () => window.clearTimeout(reloj);
  }, [foto, pausado]);

  return (
    <>
      <div className="hero-fotos" aria-hidden="true">
        {Object.entries(HERO).map(([tema, escenas]) => (
          <div key={tema} className={`hero-fotos__tema hero-fotos__tema--${tema}`}>
            {escenas.map(({ archivo }, indice) => (
              <Image
                key={archivo}
                className="hero-fotos__imagen"
                data-activa={indice === foto % escenas.length}
                src={`/fotos/panoramas/${archivo}.webp`}
                alt=""
                fill
                sizes="100vw"
                quality={90}
                loading={indice === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>
        ))}
      </div>

      {Object.entries(HERO).map(([tema, escenas]) => {
        const total = escenas.length;
        const actual = foto % total;
        return (
          <div key={tema} className={`hero-fotos__controles hero-fotos__tema--${tema}`} role="group" aria-label="Fotos de San Miguel de Tucumán">
            <p className="hero-fotos__lugar" aria-live="polite">{escenas[actual].lugar}</p>
            <div className="hero-fotos__botones">
              <button type="button" aria-label="Foto anterior" onClick={() => setFoto((actual + total - 1) % total)}>‹</button>
              {escenas.map(({ archivo }, indice) => (
                <button
                  key={archivo}
                  type="button"
                  className="hero-fotos__punto"
                  aria-label={`Foto ${indice + 1} de ${total}`}
                  aria-current={indice === actual}
                  onClick={() => setFoto(indice)}
                />
              ))}
              <button type="button" aria-label="Foto siguiente" onClick={() => setFoto((actual + 1) % total)}>›</button>
              <button type="button" aria-label={pausado ? "Reanudar fotos" : "Pausar fotos"} onClick={() => setPausado((p) => !p)}>
                {pausado ? "▶" : "❚❚"}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
