import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { BotonMenuPanel, MenuPanel, type SeccionMenu } from "@/components/admin/MenuPanel";
import { ESQUEMAS } from "@/lib/admin/esquemas";
import { requerirAdmin } from "@/lib/admin/sesion";
import { salirDelPanel } from "../acciones";

const SECCIONES: SeccionMenu[] = [
  { href: "/admin", texto: "Tablero", icono: "tablero" },
  ...ESQUEMAS.map((e) => ({ href: `/admin/${e.id}`, texto: e.titulo, icono: e.icono })),
  { href: "/admin/temas", texto: "Temas y etiquetas", icono: "etiqueta", separar: true },
  { href: "/admin/configuracion", texto: "Configuración", icono: "ajustes" },
  { href: "/admin/auditoria", texto: "Auditoría", icono: "auditoria" },
];

/**
 * Estructura del panel: menú lateral en azul noche municipal, barra superior blanca con la
 * sesión y el contenido sobre blanco cálido. Primera barrera: sin sesión del equipo, redirige
 * al ingreso. Cada página y cada acción vuelven a verificar con requerirAdmin().
 */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const admin = await requerirAdmin();
  return (
    <>
      <MenuPanel secciones={SECCIONES} />
      <div className="adm-cuerpo">
        <header className="adm-barra">
          <div className="adm-barra__interior">
            <BotonMenuPanel />
            <Link className="adm-barra__titulo" href="/admin">
              <strong>Turismo San Miguel</strong>
              <small>Panel de contenidos del portal</small>
            </Link>
            <Link className="adm-barra__enlace" href="/" target="_blank">
              <Icono nombre="ojo" tamano={18} /><span>Ver el sitio</span>
            </Link>
            <div className="adm-usuario">
              <span className="adm-usuario__avatar" aria-hidden="true">{admin.nombre.charAt(0).toUpperCase()}</span>
              <span className="adm-usuario__datos">
                <strong>{admin.nombre}</strong>
                <small>{admin.email}</small>
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
    </>
  );
}
