"use client";

import { useRef, useState } from "react";

import { BUS } from "@/lib/contenido";

/**
 * Los tres circuitos del bus turístico como pestañas, con el patrón de
 * teclado de WAI-ARIA: flechas para moverse entre pestañas, Inicio y Fin
 * para ir a los extremos, y foco itinerante (sólo la activa es tabulable).
 */
export function CircuitosBus() {
  const [activo, setActivo] = useState(0);
  const pestanas = useRef<(HTMLButtonElement | null)[]>([]);
  const total = BUS.circuitos.length;

  function teclas(e: React.KeyboardEvent) {
    const destino =
      e.key === "ArrowRight" ? (activo + 1) % total
      : e.key === "ArrowLeft" ? (activo + total - 1) % total
      : e.key === "Home" ? 0
      : e.key === "End" ? total - 1
      : null;
    if (destino === null) return;
    e.preventDefault();
    setActivo(destino);
    pestanas.current[destino]?.focus();
  }

  const circuito = BUS.circuitos[activo];

  return (
    <div className="circuitos">
      <div className="circuitos__pestanas" role="tablist" aria-label="Circuitos del bus turístico" onKeyDown={teclas}>
        {BUS.circuitos.map((c, i) => (
          <button
            key={c.nombre}
            ref={(el) => { pestanas.current[i] = el; }}
            type="button"
            role="tab"
            id={`circuito-${i}`}
            aria-selected={i === activo}
            aria-controls="circuito-panel"
            tabIndex={i === activo ? 0 : -1}
            onClick={() => setActivo(i)}
          >
            <span className="circuitos__numero">{i + 1}</span>
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="circuitos__panel" id="circuito-panel" role="tabpanel" aria-labelledby={`circuito-${activo}`}>
        <p className="circuitos__bajada">{circuito.bajada}</p>
        <ol className="circuitos__paradas">
          {circuito.paradas.map((parada) => <li key={parada}>{parada}</li>)}
          <li className="circuitos__regreso">Regreso a Plaza Independencia</li>
        </ol>
      </div>
    </div>
  );
}
