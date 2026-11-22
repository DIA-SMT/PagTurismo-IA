import type { Metadata } from "next";

import { BookingCancelClient } from "./BookingCancelClient";

export const metadata: Metadata = { title: "Mi reserva · Bus Turístico", robots: { index: false, follow: false } };

/**
 * «Mi reserva»: ver y cancelar una reserva del Bus Turístico con el token del correo de confirmación.
 * La misma ruta que usaban los correos ya enviados (/reserva/<token>), ahora en el portal.
 */
export default async function MiReserva({ params }: PageProps<"/[idioma]/reserva/[token]">) {
  const { token } = await params;
  return <div className="contenedor" data-modulo="buses"><BookingCancelClient token={token} /></div>;
}
