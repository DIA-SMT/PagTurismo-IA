/**
 * Clima actual de San Miguel de Tucumán, desde Open-Meteo.
 *
 * Open-Meteo es gratuito, no pide clave y no rastrea: el pedido sale del
 * servidor de Next, no del navegador de quien visita, y se cachea media hora.
 * Si la API no responde la landing se arma igual, sin el dato.
 */

export type Clima = {
  temperatura: number;
  descripcion: string;
  icono: string;
};

// Plaza Independencia.
const URL_CLIMA =
  "https://api.open-meteo.com/v1/forecast?latitude=-26.8303&longitude=-65.2038" +
  "&current=temperature_2m,weather_code,is_day&timezone=America%2FArgentina%2FTucuman";

/** Códigos WMO agrupados en lo que alguien de visita necesita saber. */
function describir(codigo: number, esDeDia: boolean): Pick<Clima, "descripcion" | "icono"> {
  if (codigo === 0) return { descripcion: "Despejado", icono: esDeDia ? "sol" : "luna" };
  if (codigo <= 2) return { descripcion: "Algo nublado", icono: "nube-sol" };
  if (codigo === 3) return { descripcion: "Nublado", icono: "nube" };
  if (codigo === 45 || codigo === 48) return { descripcion: "Niebla", icono: "niebla" };
  if (codigo >= 95) return { descripcion: "Tormenta", icono: "tormenta" };
  if (codigo >= 80) return { descripcion: "Chaparrones", icono: "lluvia" };
  if (codigo >= 51) return { descripcion: "Lluvia", icono: "lluvia" };
  return { descripcion: "Nublado", icono: "nube" };
}

export async function getClima(): Promise<Clima | null> {
  try {
    const respuesta = await fetch(URL_CLIMA, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(4000),
    });
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    const actual = datos?.current;
    if (typeof actual?.temperature_2m !== "number") return null;
    return {
      temperatura: Math.round(actual.temperature_2m),
      ...describir(actual.weather_code, actual.is_day === 1),
    };
  } catch {
    return null;
  }
}
