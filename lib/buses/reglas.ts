/**
 * Reglas del portal sobre el flujo de reservas del Bus Turístico. Corrigen las fallas que señaló la
 * auditoría (docs/auditoria/botturismo.md §4) SIN cambiar la función atómica de la base
 * (create_tourist_booking), que sigue siendo la única que escribe reservas.
 * Funciones puras, con pruebas en tests/buses-reglas.test.ts. Sin dependencias del servidor.
 */

import { aInstante } from "../fechas.ts";

/** ¿La salida ya partió? Fecha `AAAA-MM-DD` y hora `HH:MM[:SS]` de Tucumán. La base solo compara la fecha. */
export function yaPartio(fecha: string, hora: string, ahora = Date.now()): boolean {
  const hhmm = /^\d{2}:\d{2}/.exec(hora ?? "")?.[0] ?? "00:00";
  return aInstante(`${fecha}T${hhmm}`) <= ahora;
}

/**
 * Límite de pedidos en memoria (un proceso del portal): `max` en `ventanaMs` por clave. Frena que un
 * script agote los cupos de una salida. Se pierde al reiniciar, que está bien para este uso.
 */
export function crearLimitador(max: number, ventanaMs: number) {
  const pedidos = new Map<string, number[]>();
  return (clave: string, ahora = Date.now()): boolean => {
    const recientes = (pedidos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= max) {
      pedidos.set(clave, recientes);
      return false;
    }
    recientes.push(ahora);
    pedidos.set(clave, recientes);
    if (pedidos.size > 5000) for (const [k, v] of pedidos) if (!v.some((t) => ahora - t < ventanaMs)) pedidos.delete(k);
    return true;
  };
}

export type CambioSalida = { capacity?: number; bike_stock?: number | null; departure_date?: string; departure_time?: string };
export type Ocupacion = { reservadas: number; bicisReservadas: number; fechaActual: string; horaActual: string };

/**
 * ¿Se puede aplicar este cambio a una salida? Devuelve el motivo si no. Antes el panel dejaba bajar el
 * cupo o las bicis por debajo de lo ya reservado, y mover la salida al pasado.
 */
export function validarCambioSalida(cambio: CambioSalida, ocupacion: Ocupacion, ahora = Date.now()): string | null {
  if (cambio.capacity !== undefined && cambio.capacity < ocupacion.reservadas) {
    return `El cupo no puede ser menor que las ${ocupacion.reservadas} personas ya reservadas. Cancelá reservas primero o dejá el cupo en ${ocupacion.reservadas} o más.`;
  }
  if (cambio.bike_stock !== undefined && cambio.bike_stock !== null && cambio.bike_stock < ocupacion.bicisReservadas) {
    return `Las bicis no pueden ser menos que las ${ocupacion.bicisReservadas} ya prestadas en reservas.`;
  }
  if (cambio.bike_stock === null && ocupacion.bicisReservadas > 0) {
    return "Hay reservas con bicis municipales: no se puede quitar el stock de bicis.";
  }
  const cambiaFecha = cambio.departure_date !== undefined && cambio.departure_date !== ocupacion.fechaActual;
  const cambiaHora = cambio.departure_time !== undefined && cambio.departure_time.slice(0, 5) !== ocupacion.horaActual.slice(0, 5);
  if ((cambiaFecha || cambiaHora) && yaPartio(cambio.departure_date ?? ocupacion.fechaActual, cambio.departure_time ?? ocupacion.horaActual, ahora)) {
    return "La nueva fecha y hora ya pasaron.";
  }
  return null;
}
