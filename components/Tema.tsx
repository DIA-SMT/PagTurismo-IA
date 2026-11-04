"use client";

import { useRef, useSyncExternalStore } from "react";

type Tema = "light" | "dark";

/**
 * El tema no se guarda en estado de React: ya vive en el DOM —el atributo
 * data-theme del <html>, que el script del layout estampa antes de pintar— y
 * en localStorage. Duplicarlo en un useState obliga a sincronizarlo desde un
 * efecto, y eso encadena renders además de arriesgar que las dos copias
 * discrepen.
 *
 * Con useSyncExternalStore, React lee de la fuente real. En el servidor
 * devuelve null y se dibuja el hueco; recién en el cliente aparece el botón,
 * así que el HTML servido y el hidratado coinciden.
 */
const oyentes = new Set<() => void>();

function leerTema(): Tema {
  const estampado = document.documentElement.dataset.theme;
  if (estampado === "dark" || estampado === "light") return estampado;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  // Si la persona nunca eligió, el tema sigue al sistema: hay que enterarse
  // cuando el sistema cambia solo, por ejemplo al anochecer.
  const consulta = window.matchMedia("(prefers-color-scheme: dark)");
  consulta.addEventListener("change", avisar);
  return () => {
    oyentes.delete(avisar);
    consulta.removeEventListener("change", avisar);
  };
}

/**
 * Interruptor de tema claro / oscuro.
 *
 * El cambio no es un corte ni un desvanecido: la luz se abre en círculo desde
 * el propio botón, como cuando se aprieta una llave y la habitación se
 * enciende desde ahí. Se hace con la View Transitions API del navegador, que
 * saca una foto del antes y del después y deja animar la de arriba: acá se le
 * anima el recorte circular, así que el tema nuevo "crece" desde el botón.
 *
 * Todo el movimiento es del navegador. Donde la API no existe, el tema cambia
 * igual, de una. Y si el sistema pide menos movimiento, tampoco se anima: un
 * círculo que barre la pantalla entera es exactamente el tipo de movimiento
 * grande que esa preferencia evita.
 */
export function Tema() {
  const boton = useRef<HTMLButtonElement>(null);
  const tema = useSyncExternalStore<Tema | null>(suscribir, leerTema, () => null);

  function cambiar() {
    const siguiente: Tema = tema === "dark" ? "light" : "dark";

    const aplicar = () => {
      document.documentElement.dataset.theme = siguiente;
      try {
        localStorage.setItem("tema", siguiente);
      } catch {
        // Ventana privada o almacenamiento bloqueado: el tema vale para esta
        // visita y no se recuerda. Preferible a que el botón no haga nada.
      }
      oyentes.forEach((avisar) => avisar());
    };

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto || !document.startViewTransition) {
      aplicar();
      return;
    }

    const transicion = document.startViewTransition(aplicar);

    transicion.ready.then(() => {
      const caja = boton.current?.getBoundingClientRect();
      // Centro del botón: de ahí sale la luz.
      const x = caja ? caja.left + caja.width / 2 : window.innerWidth;
      const y = caja ? caja.top + caja.height / 2 : 0;
      // El radio tiene que alcanzar la esquina más lejana, o el círculo deja
      // un rincón sin encender.
      const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        {
          duration: 520,
          // Sale rápido y frena largo: así se mueve algo con peso. La curva
          // por defecto arranca y termina lento, y eso lo vuelve blando.
          easing: "cubic-bezier(.22, 1, .36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  // Hasta saber el tema no se dibuja nada: un botón que dice "Oscuro" y al
  // segundo cambia a "Claro" es peor que un hueco de medio segundo. El hueco
  // se reserva con CSS para que el encabezado no salte.
  if (tema === null) return <span className="tema tema--reservado" aria-hidden="true" />;

  const vaAOscuro = tema === "light";

  return (
    <button
      ref={boton}
      type="button"
      className="tema"
      onClick={cambiar}
      /* La etiqueta dice qué va a pasar al apretarlo, que es el patrón de un
         interruptor. Sin aria-pressed: con los dos juntos, el lector de
         pantalla anuncia el estado dos veces. */
      aria-label={vaAOscuro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      title={vaAOscuro ? "Tema oscuro" : "Tema claro"}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        {vaAOscuro ? (
          // Luna: lo que vas a encender.
          <path
            d="M20.7 14.6A8.6 8.6 0 0 1 9.4 3.3a8.6 8.6 0 1 0 11.3 11.3Z"
            fill="currentColor"
          />
        ) : (
          // Sol.
          <>
            <circle cx="12" cy="12" r="4.4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
              <path d="M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
            </g>
          </>
        )}
      </svg>
    </button>
  );
}
