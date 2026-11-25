import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { Tema } from "@/components/Tema";
import { AsistentePanel } from "@/components/admin/AsistentePanel";
import { BotonMenuPanel, MenuPanel } from "@/components/admin/MenuPanel";
import { sugerenciasPara } from "@/lib/admin/ayuda";
import { seccionesDelMenu } from "@/lib/admin/menu";
import { requerirAdmin } from "@/lib/admin/sesion";
import { NOMBRE_MODULO, NOMBRE_ROL } from "@/lib/permisos";
import { salirDelPanel } from "../acciones";

/**
 * Estructura del panel, con el mismo estilo del sitio: menú lateral y barra superior como el
 * encabezado público (con el cambio de tema claro/oscuro), y el contenido en tarjetas. Primera barrera: sin sesión del equipo, redirige
 * al ingreso. Cada página y cada acción vuelven a verificar con requerirAdmin().
 */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const admin = await requerirAdmin();
  return (
    <>
      <MenuPanel secciones={seccionesDelMenu(admin)} />
      <div className="adm-cuerpo">
        <header className="adm-barra">
          <div className="adm-barra__interior">
            <BotonMenuPanel />
            <Link className="adm-barra__titulo" href="/admin">
              <strong>Turismo y Cultura SMT</strong>
              <small>Panel del portal unificado</small>
            </Link>
            <Tema />
            <Link className="adm-barra__enlace" href="/" target="_blank">
              <Icono nombre="ojo" tamano={18} /><span>Ver el sitio</span>
            </Link>
            <div className="adm-usuario">
              <span className="adm-usuario__avatar" aria-hidden="true">{admin.nombre.charAt(0).toUpperCase()}</span>
              <span className="adm-usuario__datos">
                <strong>{admin.nombre}</strong>
                <small title={admin.email}>
                  {NOMBRE_ROL[admin.rol]}
                  {admin.rol !== "superadmin" && admin.modulos.length > 0 && ` · ${admin.modulos.map((m) => NOMBRE_MODULO[m]).join(", ")}`}
                </small>
              </span>
              <form action={salirDelPanel}>
                <button type="submit" className="adm-boton adm-boton--secundario adm-boton--chico">
                  <Icono nombre="salir" tamano={16} /> Salir
                </button>
              </form>
            </div>
          </div>
        </header>
        <main id="contenido" className="adm-main">
          {children}
          <footer className="adm-pie">
            <span>Municipalidad de San Miguel de Tucumán · Dirección de Turismo</span>
            <span>Desarrollado por la Dirección de Inteligencia Artificial</span>
          </footer>
        </main>
      </div>
      <AsistentePanel nombre={admin.nombre} sugerencias={sugerenciasPara(admin)} />
    </>
  );
}
