import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormularioFicha } from "@/components/admin/FormularioFicha";
import { Banda } from "@/components/admin/Piezas";
import { opcionesDeFormulario, todasLasFichas } from "@/lib/admin/datos";
import { esquemaDe } from "@/lib/admin/esquemas";
import { requerirAdmin } from "@/lib/admin/sesion";

export async function generateMetadata({ params }: PageProps<"/admin/[coleccion]/nueva">): Promise<Metadata> {
  return { title: esquemaDe((await params).coleccion)?.nuevo ?? "Nueva ficha" };
}

/** Valores con los que arranca una ficha nueva. */
const INICIALES: Record<string, Record<string, unknown>> = {
  lugares: { costo: { modalidad: "consultar" }, horario: { confirmado: false } },
  experiencias: { modalidad: "a-pie", costo: { modalidad: "consultar" }, accion: { tipo: "consultar" } },
  eventos: { clase: "espectaculo", costo: { modalidad: "consultar" }, ocurrencias: [{ estado: "confirmado" }] },
  recorridos: { tipo: "circuito", modalidad: "a-pie", paradas: [{}] },
  planifica: { icono: "info", secciones: [{}] },
  destacados: { destino: { coleccion: "experiencias" }, orden: 10 },
  sabores: { tono: 0, orden: 10 },
  escapadas: { tono: 0, orden: 10 },
};

export default async function NuevaFicha({ params }: PageProps<"/admin/[coleccion]/nueva">) {
  const admin = await requerirAdmin();
  const esquema = esquemaDe((await params).coleccion);
  if (!esquema) notFound();
  const filas = await todasLasFichas(admin);

  return (
    <>
      <Banda
        titulo={esquema.nuevo}
        migas={[{ href: `/admin/${esquema.id}`, texto: esquema.titulo }]}
        bajada="Se guarda como borrador hasta que la publiques. Cargá solo datos confirmados."
      />
      <FormularioFicha
        esquemaId={esquema.id}
        modo="ficha"
        inicial={INICIALES[esquema.id] ?? {}}
        opciones={opcionesDeFormulario(filas)}
      />
    </>
  );
}
