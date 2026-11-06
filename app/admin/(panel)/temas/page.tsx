import type { Metadata } from "next";

import { FormularioFicha } from "@/components/admin/FormularioFicha";
import { Banda, fechaCorta } from "@/components/admin/Piezas";
import { fichaDe, opcionesDeFormulario, todasLasFichas } from "@/lib/admin/datos";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Temas y etiquetas" };

export default async function Temas() {
  const admin = await requerirAdmin();
  const [ficha, filas] = await Promise.all([fichaDe(admin, "configuracion", "categorias"), todasLasFichas(admin)]);
  return (
    <>
      <Banda titulo="Temas y etiquetas" bajada="Los temas organizan el catálogo «Qué hacer»; las etiquetas son filtros secundarios. Un tema que todavía usa alguna ficha no se puede quitar." />
      <FormularioFicha
        esquemaId="categorias"
        modo="configuracion"
        inicial={ficha?.datos ?? {}}
        opciones={opcionesDeFormulario(filas)}
        rutaPublica="/que-hacer"
        actualizado={ficha && <p className="adm-campo__ayuda">Último cambio: {fechaCorta(ficha.actualizado_at)}, por {ficha.actualizado_por_nombre ?? "la carga inicial"}.</p>}
      />
    </>
  );
}
