import { getClima } from "@/lib/clima";
import { Icono } from "./Iconos";

/** Chip del encabezado: "☁ 20°". Sin datos no ocupa lugar. */
export async function ClimaActual() {
  const clima = await getClima();
  if (!clima) return null;
  return (
    <a className="clima" href="#antes-de-llegar" title={`${clima.descripcion} en San Miguel de Tucumán`}>
      <Icono nombre={clima.icono} tamano={20} />
      <span>{clima.temperatura}°</span>
      <span className="visualmente-oculto">, {clima.descripcion.toLowerCase()} en San Miguel de Tucumán</span>
    </a>
  );
}
