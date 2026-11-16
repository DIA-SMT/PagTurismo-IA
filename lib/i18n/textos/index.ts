import type { Idioma } from "../config";
import { agenda } from "./agenda";
import { catalogo } from "./catalogo";
import { comun } from "./comun";
import { fichas } from "./fichas";
import { paginas } from "./paginas";
import { portada } from "./portada";
import { recorridos } from "./recorridos";

/** Todas las secciones de textos. Cada archivo define la suya en los tres idiomas. */
const SECCIONES = { comun, portada, paginas, catalogo, agenda, fichas, recorridos };

export type Textos = { [K in keyof typeof SECCIONES]: (typeof SECCIONES)[K]["es"] };

export function textos(idioma: Idioma): Textos {
  return Object.fromEntries(Object.entries(SECCIONES).map(([k, s]) => [k, s[idioma]])) as Textos;
}

/** Lo que necesitan los componentes del navegador: viaja en cada página, así que solo lo justo. */
export type TextosCliente = Pick<Textos, "comun" | "catalogo" | "agenda">;

export function textosCliente(idioma: Idioma): TextosCliente {
  return { comun: comun[idioma], catalogo: catalogo[idioma], agenda: agenda[idioma] } as TextosCliente;
}
