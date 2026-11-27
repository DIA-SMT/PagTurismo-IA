import type { Idioma } from "../config";
import { agenda } from "./agenda";
import { catalogo } from "./catalogo";
import { buses } from "./buses";
import { comun } from "./comun";
import { cultura } from "./cultura";
import { espacios } from "./espacios";
import { programas } from "./programas";
import { alojamientos } from "./alojamientos";
import { fichas } from "./fichas";
import { mapa } from "./mapa";
import { migue } from "./migue";
import { paginas } from "./paginas";
import { planificador } from "./planificador";
import { portada } from "./portada";
import { recorridos } from "./recorridos";
import { talleres } from "./talleres";

/** Todas las secciones de textos. Cada archivo define la suya en los tres idiomas. */
const SECCIONES = { comun, portada, paginas, catalogo, agenda, cultura, buses, fichas, recorridos, migue, planificador, talleres, mapa, espacios, programas, alojamientos };

export type Textos = { [K in keyof typeof SECCIONES]: (typeof SECCIONES)[K]["es"] };

export function textos(idioma: Idioma): Textos {
  return Object.fromEntries(Object.entries(SECCIONES).map(([k, s]) => [k, s[idioma]])) as Textos;
}

/** Lo que necesitan los componentes del navegador: viaja en cada página, así que solo lo justo. */
export type TextosCliente = Pick<Textos, "comun" | "catalogo" | "agenda" | "cultura" | "migue">;

export function textosCliente(idioma: Idioma): TextosCliente {
  return { comun: comun[idioma], catalogo: catalogo[idioma], agenda: agenda[idioma], cultura: cultura[idioma], migue: migue[idioma] } as TextosCliente;
}
