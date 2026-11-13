import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";

import { IDIOMAS, IDIOMA_BASE, LOCALE, esIdioma, localizarRuta, type Idioma } from "./config";
import { textos } from "./textos";

/** El idioma de este pedido. Lo fija el proxy a partir de la dirección (encabezado x-idioma). */
export const idiomaActual = cache(async (): Promise<Idioma> => {
  const valor = (await headers()).get("x-idioma");
  return esIdioma(valor) ? valor : IDIOMA_BASE;
});

/** Los textos del idioma de este pedido. */
export async function textosActuales() {
  return textos(await idiomaActual());
}

/** Una dirección interna en español, en el idioma de este pedido. */
export async function rutaLocal(href: string) {
  return localizarRuta(href, await idiomaActual());
}

/**
 * Canónica y alternativas de idioma (hreflang) de una página, a partir de su dirección interna
 * en español: alternativas("/lugares/x") → canónica /en/places/x en inglés, más es, pt y x-default.
 */
export async function alternativas(interna: string): Promise<NonNullable<Metadata["alternates"]>> {
  const idioma = await idiomaActual();
  return {
    canonical: localizarRuta(interna, idioma),
    languages: {
      ...Object.fromEntries(IDIOMAS.map((i) => [LOCALE[i].lang, localizarRuta(interna, i)])),
      "x-default": localizarRuta(interna, IDIOMA_BASE),
    },
  };
}
