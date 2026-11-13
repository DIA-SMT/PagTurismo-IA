import { getClima } from "@/lib/clima";
import { formatear } from "@/lib/i18n/definir";
import { rutaLocal, textosActuales } from "@/lib/i18n/servidor";
import { Icono } from "./Iconos";

/** Chip del encabezado: "☁ 20°". Sin datos no ocupa lugar. */
export async function ClimaActual() {
  const clima = await getClima();
  if (!clima) return null;
  const { comun: t } = await textosActuales();
  const enLaCiudad = formatear(t.clima.enLaCiudad, { descripcion: t.clima[clima.estado] });
  return (
    <a className="clima" href={await rutaLocal("/#antes-de-llegar")} title={enLaCiudad}>
      <Icono nombre={clima.icono} tamano={20} />
      <span>{clima.temperatura}°</span>
      <span className="visualmente-oculto">, {enLaCiudad.charAt(0).toLowerCase() + enLaCiudad.slice(1)}</span>
    </a>
  );
}
