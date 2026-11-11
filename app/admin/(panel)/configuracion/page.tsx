import type { Metadata } from "next";

import { FormularioFicha } from "@/components/admin/FormularioFicha";
import { Banda, fechaCorta } from "@/components/admin/Piezas";
import { fichaDe, opcionesDeFormulario, todasLasFichas } from "@/lib/admin/datos";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Configuración" };

export default async function Configuracion() {
  const admin = await requerirAdmin();
  const [ficha, filas] = await Promise.all([fichaDe(admin, "configuracion", "sitio"), todasLasFichas(admin)]);
  return (
    <>
      <Banda titulo="Configuración" bajada="Textos de la portada, contacto, redes, teléfonos de emergencia y línea de tiempo. Los cambios se ven en el sitio al guardar." />
      <FormularioFicha
        esquemaId="sitio"
        modo="configuracion"
        inicial={ficha?.datos ?? {}}
        opciones={opcionesDeFormulario(filas)}
        rutaPublica="/"
        actualizado={ficha && <p className="adm-campo__ayuda">Último cambio: {fechaCorta(ficha.actualizado_at)}, por {ficha.actualizado_por_nombre ?? "la carga inicial"}.</p>}
      />
    </>
  );
}
