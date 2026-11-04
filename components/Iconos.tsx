/**
 * Sprite de iconos de la landing: una sola familia de trazo, 24x24.
 *
 * Los de interfaz, redes y emergencias son los mismos del portal
 * smt.gob.ar (components/Iconos.tsx de Pagina-SMT-IA), para que las dos
 * páginas se lean como el mismo sitio. Los de turismo —brújula, avión,
 * caminata, estatua y los del clima— están dibujados acá con el mismo trazo.
 *
 * `<SpriteIconos />` se renderiza una vez en el layout; después se usa
 * `<Icono nombre="avion" />` en cualquier lado.
 */

const T = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SpriteIconos() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: "none" }}>
      <defs>
        {/* ---- Interfaz ---- */}
        <symbol id="i-menu" viewBox="0 0 24 24" {...T}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </symbol>
        <symbol id="i-cerrar" viewBox="0 0 24 24" {...T}>
          <path d="M18 6 6 18M6 6l12 12" />
        </symbol>
        <symbol id="i-chevron" viewBox="0 0 24 24" {...T}>
          <path d="m6 9 6 6 6-6" />
        </symbol>
        <symbol id="i-flecha" viewBox="0 0 24 24" {...T}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </symbol>
        <symbol id="i-flecha-izq" viewBox="0 0 24 24" {...T}>
          <path d="M19 12H5m6 6-6-6 6-6" />
        </symbol>
        <symbol id="i-externo" viewBox="0 0 24 24" {...T}>
          <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
          <path d="M14 4h6v6" />
          <path d="M20 4 10 14" />
        </symbol>
        <symbol id="i-calendario" viewBox="0 0 24 24" {...T}>
          <rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 10h16M8 14h1m3 0h1m3 0h1M8 17h1m3 0h1m3 0h1" />
        </symbol>
        <symbol id="i-reloj" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </symbol>

        {/* ---- Turismo ---- */}
        <symbol id="i-brujula" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </symbol>
        <symbol id="i-avion" viewBox="0 0 24 24" {...T}>
          <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4-4.5c1-1 2.6-1.6 3.4-.9.7.8.1 2.4-.9 3.4L14 12.5l1 7.5-1.5 1.5-2.5-7.5-3.5 3V20l-1.5 1.5-1-4-4-1L3 15h3.5l3-3" />
        </symbol>
        <symbol id="i-bus-linea" viewBox="0 0 24 24" {...T}>
          <rect x="5" y="3" width="14" height="17" rx="3" /><path d="M5 7h14M5 14h14M8 20v2m8-2v2M8 17h.01M16 17h.01M3 8v5m18-5v5" />
        </symbol>
        <symbol id="i-hoja-linea" viewBox="0 0 24 24" {...T}>
          <path d="M12 3c-7 5-9 14 0 16 9-2 7-11 0-16ZM12 9v13" />
        </symbol>
        <symbol id="i-caminata" viewBox="0 0 24 24" {...T}>
          <circle cx="13" cy="4" r="1.8" /><path d="m9 21 2.5-6 2.5 2.5V21M8 11l2-3.5h3.5l2.5 3.5 2.5 1M10 7.5 8.5 14l3 1" />
        </symbol>
        <symbol id="i-estatua" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="4.5" r="2" /><path d="M10 9h4l-.5 6h-3L10 9Zm-2 9h8m-9 3h10m-9-3 .5-3h5l.5 3M14 9l2.5-3" />
        </symbol>
        <symbol id="i-ticket" viewBox="0 0 24 24" {...T}>
          <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M14 6v2m0 3v2m0 3v2" />
        </symbol>
        <symbol id="i-info" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-9.5v.01" />
        </symbol>
        <symbol id="i-accesibilidad" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5c4.5 1.3 9.5 1.3 14 0M12 9.8V14m0 0-3 7m3-7 3 7" />
        </symbol>
        <symbol id="i-ubicacion" viewBox="0 0 24 24" {...T}>
          <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </symbol>
        <symbol id="i-mapa" viewBox="0 0 24 24" {...T}>
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Zm6-2v14m6-12v14" />
        </symbol>
        <symbol id="i-correo" viewBox="0 0 24 24" {...T}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </symbol>
        <symbol id="i-telefono" viewBox="0 0 24 24" {...T}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </symbol>

        {/* ---- Clima ---- */}
        <symbol id="i-sol" viewBox="0 0 24 24" {...T}>
          <circle cx="12" cy="12" r="4" /><path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4" />
        </symbol>
        <symbol id="i-luna" viewBox="0 0 24 24" {...T}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </symbol>
        <symbol id="i-nube" viewBox="0 0 24 24" {...T}>
          <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5H7Z" />
        </symbol>
        <symbol id="i-nube-sol" viewBox="0 0 24 24" {...T}>
          <path d="M8 3.5v1.5M3.5 8H2m3-3L4 4m10 0-1 1M5.2 10.5A3.5 3.5 0 1 1 11.3 7" />
          <path d="M9 20a3.8 3.8 0 0 1-.5-7.6 5 5 0 0 1 9.6 1.2A3.3 3.3 0 0 1 17.5 20H9Z" />
        </symbol>
        <symbol id="i-lluvia" viewBox="0 0 24 24" {...T}>
          <path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6.5a4.3 4.3 0 0 1-.5 8.5H7Z" /><path d="m8 18-1 3m5-3-1 3m5-3-1 3" />
        </symbol>
        <symbol id="i-tormenta" viewBox="0 0 24 24" {...T}>
          <path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6.5a4.3 4.3 0 0 1-.5 8.5H7Z" /><path d="m12.5 13-2 4h3l-2 4" />
        </symbol>
        <symbol id="i-niebla" viewBox="0 0 24 24" {...T}>
          <path d="M4 9h16M3 13h18M5 17h14" />
        </symbol>

        {/* ---- Emergencias ---- */}
        <symbol id="i-emergencia-fuego" viewBox="0 0 24 24" {...T}>
          <path d="M12 2c1 5-4 6-3 10 1-1 2-2 2-4 5 3 8 6 6 10a6 6 0 0 1-11-1C4 11 10 9 12 2Z" />
        </symbol>
        <symbol id="i-emergencia-escudo" viewBox="0 0 24 24" {...T}>
          <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" />
        </symbol>
        <symbol id="i-emergencia-cruz" viewBox="0 0 24 24" {...T}>
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
        </symbol>

        {/* ---- Redes ---- */}
        <symbol id="i-facebook" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3V11H9v3h2.3v7z" />
        </symbol>
        <symbol id="i-instagram" viewBox="0 0 24 24" {...T}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M16.7 7.3v.01" />
        </symbol>
        <symbol id="i-x" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M17.3 3H20l-6.6 7.6L21 21h-5.9l-4.6-6-5.3 6H2.5l7-8.1L2.5 3h6l4.2 5.5zm-1 16.2h1.6L7.6 4.7H5.9z" />
        </symbol>
        <symbol id="i-youtube" viewBox="0 0 24 24" {...T}>
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="m10.5 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" stroke="none" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icono({
  nombre,
  tamano = 24,
  className,
}: {
  nombre: string;
  tamano?: number;
  className?: string;
}) {
  return (
    <svg width={tamano} height={tamano} aria-hidden="true" className={className}>
      <use href={`#i-${nombre}`} />
    </svg>
  );
}
