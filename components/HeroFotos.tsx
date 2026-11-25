"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { useTextos } from "./i18n/Idioma";
import { HERO } from "@/lib/contenido";

/**
 * Las panorámicas del hero. Hay una serie de día y otra de noche, y el CSS
 * muestra la que corresponde al tema: de noche la ciudad se ve de noche.
 *
 * Sin botonera: arriba a la derecha queda el nombre del lugar con una línea que
 * se llena en ocho segundos (la animación es el reloj: al terminar, pasa la foto;
 * se frena con el mouse encima y en pestañas ocultas). Un clic en el nombre
 * adelanta. No avanza si el sistema pide menos movimiento, y la pausa que pide
 * WCAG 2.2.2 aparece al llegar con el teclado.
 */
export function HeroFotos() {
  const { comun: t } = useTextos();
  const [foto, setFoto] = useState(0);
  const [pausado, setPausado] = useState<boolean | null>(null);

  useEffect(() => {
    const preferencia = matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => setPausado(preferencia.matches);
    sincronizar();
    preferencia.addEventListener("change", sincronizar);
    return () => preferencia.removeEventListener("change", sincronizar);
  }, []);

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
        const lugar = t.hero[escenas[foto % escenas.length].archivo];
        return (
          <div key={tema} className={`hero-fotos__controles hero-fotos__tema--${tema}`} role="group" aria-label={t.controles.fotosDeLaCiudad}>
            {/* El nombre del lugar es el control: un clic pasa a la siguiente foto. La línea de abajo es el reloj. */}
            <button type="button" className="hero-fotos__lugar" title={t.controles.fotoSiguiente} onClick={() => setFoto((f) => f + 1)}>
              <span aria-live="polite">{lugar}</span>
              <span className="visualmente-oculto"> · {t.controles.fotoSiguiente}</span>
              <span
                key={foto}
                className="hero-fotos__reloj"
                data-corre={pausado === false}
                aria-hidden="true"
                onAnimationEnd={() => setFoto((f) => f + 1)}
              />
            </button>
            {/* La pausa que pide WCAG 2.2.2: solo el ícono, transparente. */}
            <button type="button" className="hero-fotos__pausa" aria-label={pausado ? t.controles.reanudarFotos : t.controles.pausarFotos}
              title={pausado ? t.controles.reanudarFotos : t.controles.pausarFotos} onClick={() => setPausado((p) => !p)}>
              <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}
