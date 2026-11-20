import type { Metadata } from "next";

import { FormularioFicha } from "@/components/admin/FormularioFicha";
import { Banda, fechaCorta } from "@/components/admin/Piezas";
import { fichaDe, opcionesDeFormulario, todasLasFichas } from "@/lib/admin/datos";
import { requerirPermiso } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Categorías de la agenda" };

/** Las categorías de la agenda cultural (música, teatro, ferias…). Módulo cultura. */
export default async function CategoriasAgenda() {
  const admin = await requerirPermiso("cultura", "configurar");
  const [ficha, filas] = await Promise.all([fichaDe(admin, "configuracion", "categorias-agenda"), todasLasFichas(admin)]);
  return (
    <>
      <Banda
        titulo="Categorías de la agenda"
        migas={[{ href: "/admin/eventos", texto: "Agenda cultural" }]}
        bajada="Ordenan y filtran la agenda cultural. Una categoría que todavía usa algún evento no se puede quitar."
      />
      <FormularioFicha
        esquemaId="categorias-agenda"
        modo="configuracion"
        inicial={ficha?.datos ?? {}}
        opciones={opcionesDeFormulario(filas)}
        rutaPublica="/agenda"
        ultimoCambio={ficha ? `Último cambio: ${fechaCorta(ficha.actualizado_at)}, por ${ficha.actualizado_por_nombre ?? "la carga inicial"}.` : undefined}
      />
    </>
  );
}
