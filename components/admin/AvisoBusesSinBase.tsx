import { Banda, Vacio } from "@/components/admin/Piezas";

/** Cuando el portal no tiene configurada la base del Bus Turístico (BUSES_DATABASE_URL). */
export function AvisoBusesSinBase({ titulo }: { titulo: string }) {
  return (
    <>
      <Banda titulo={titulo} />
      <Vacio titulo="El módulo de buses no está conectado" icono="bus-linea">
        Falta configurar la conexión a la base del Bus Turístico (BUSES_DATABASE_URL) en el servidor. Ver
        docs/PLAN_MIGRACION.md, sección 4.
      </Vacio>
    </>
  );
}
