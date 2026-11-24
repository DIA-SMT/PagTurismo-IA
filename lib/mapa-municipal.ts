/**
 * Pedidos a la API del mapa de la Municipalidad (solo servidor), con el certificado intermedio que su
 * servidor no envía (ver lib/certificados/sectigo-dv-r36.ts) y una copia en memoria por una hora.
 */
import https from "node:https";
import tls from "node:tls";

import { SECTIGO_DV_R36 } from "./certificados/sectigo-dv-r36";

let agente: https.Agent | undefined;
const copias = new Map<string, { hasta: number; datos: unknown }>();

function pedir(url: string, espera: number): Promise<unknown> {
  agente ??= new https.Agent({ ca: [...tls.rootCertificates, SECTIGO_DV_R36], keepAlive: true });
  return new Promise((resolver, rechazar) => {
    const pedido = https.get(url, { agent: agente, timeout: espera, headers: { Accept: "application/json" } }, (r) => {
      if (r.statusCode !== 200) { r.resume(); rechazar(new Error(`${url}: ${r.statusCode}`)); return; }
      let cuerpo = "";
      r.setEncoding("utf8");
      r.on("data", (parte: string) => {
        cuerpo += parte;
        if (cuerpo.length > 5_000_000) pedido.destroy(new Error("respuesta demasiado grande"));
      });
      r.on("end", () => { try { resolver(JSON.parse(cuerpo)); } catch (e) { rechazar(e); } });
    });
    pedido.on("timeout", () => pedido.destroy(new Error(`${url}: sin respuesta en ${espera} ms`)));
    pedido.on("error", rechazar);
  });
}

/** JSON de la API municipal; repite la copia guardada durante `vigencia` ms (y la usa si la API falla). */
export async function traerMunicipal(url: string, vigencia = 3_600_000, espera = 8_000): Promise<unknown> {
  const copia = copias.get(url);
  if (copia && copia.hasta > Date.now()) return copia.datos;
  try {
    const datos = await pedir(url, espera);
    copias.set(url, { hasta: Date.now() + vigencia, datos });
    return datos;
  } catch (e) {
    if (copia) return copia.datos;
    throw e;
  }
}
