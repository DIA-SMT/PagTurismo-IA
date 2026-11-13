"use client";

import Link from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";

import { IDIOMA_BASE, localizarRuta, type Idioma } from "@/lib/i18n/config";
import type { TextosCliente } from "@/lib/i18n/textos";

const Contexto = createContext<{ idioma: Idioma; t: TextosCliente } | null>(null);

/** Idioma y textos para los componentes del navegador. Lo pone el layout del sitio. */
export function ProveedorIdioma({ idioma, t, children }: { idioma: Idioma; t: TextosCliente; children: ReactNode }) {
  return <Contexto.Provider value={{ idioma, t }}>{children}</Contexto.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(Contexto)?.idioma ?? IDIOMA_BASE;
}

export function useTextos(): TextosCliente {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useTextos fuera de ProveedorIdioma");
  return valor.t;
}

/**
 * next/link que lleva al idioma actual: recibe la dirección interna en español ("/lugares/x")
 * y enlaza a la pública ("/en/places/x"). Las externas y las del panel pasan igual.
 */
export function Vinculo({ href, ...resto }: ComponentProps<typeof Link>) {
  const idioma = useIdioma();
  return <Link href={typeof href === "string" ? localizarRuta(href, idioma) : href} {...resto} />;
}
