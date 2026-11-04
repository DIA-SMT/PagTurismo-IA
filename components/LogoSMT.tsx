import Image from "next/image";

/**
 * El logo del municipio, en sus dos versiones.
 *
 * El archivo trae la marca —el pétalo azul y el sol amarillo— y el nombre
 * escrito al lado. El pétalo y el sol son iguales en las dos versiones; lo que
 * cambia es el COLOR DE LAS LETRAS: oscuras en la positiva, blancas en la
 * negativa.
 *
 * Por eso hace falta elegir, y no alcanza con poner siempre la misma: el
 * encabezado es blanco de día —rgba(255,255,255,.92)— y azul oscuro de noche
 * —rgba(15,36,56,.92)—, y el panel del menú en teléfono usa --c-blanco, que
 * también se da vuelta. Con la positiva fija, de noche el nombre quedaba
 * escrito en oscuro sobre un fondo oscuro.
 *
 * ---- POR QUÉ SE PINTAN LAS DOS Y ELIGE EL CSS ----
 * Un <picture> con media="(prefers-color-scheme: dark)" bajaría una sola, pero
 * mira la preferencia del sistema y NO el interruptor de tema del portal: quien
 * tiene el sistema en claro y elige el tema oscuro a mano se quedaría con la
 * versión equivocada, y ese es justamente alguien que eligió a propósito.
 *
 * El precio es un PNG de más, 19 kB. Se paga.
 *
 * El pie NO usa este componente: su fondo es --c-azul-900, que es oscuro en
 * los dos temas, así que ahí la negativa es siempre la correcta.
 */
export function LogoSMT({
  ancho,
  alto,
  alt,
  prioritario,
}: {
  ancho: number;
  alto: number;
  /** Vacío cuando el logo va adentro de un enlace que ya se nombra solo. */
  alt: string;
  prioritario?: boolean;
}) {
  // El alt va escrito en cada <Image> y no en este objeto: la regla
  // jsx-a11y/alt-text hace análisis estático y no sigue un spread, así que
  // pasándolo ahí adentro avisa que falta aunque esté.
  const medidas = { width: ancho, height: alto } as const;
  const carga = prioritario
    ? ({ fetchPriority: "high", loading: "eager" } as const)
    : ({} as const);

  return (
    <span className="logo-smt">
      <Image className="logo-smt__pos" src="/img/logo-smt-pos.png" alt={alt} {...medidas} {...carga} />
      {/* La segunda va con alt vacío siempre: las dos dicen lo mismo y sólo se
          ve una, así que anunciarlo dos veces sería ruido para quien escucha. */}
      <Image className="logo-smt__neg" src="/img/logo-smt-neg.png" alt="" {...medidas} {...carga} />
    </span>
  );
}
