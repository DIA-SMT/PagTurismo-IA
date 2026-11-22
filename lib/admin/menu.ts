import { ESQUEMAS } from "./esquemas";
import { esSuperadmin, puede, puedeContenido, ve, type Permisos } from "../permisos";

export type SeccionMenu = { href: string; texto: string; icono: string; grupo?: string };

const esquema = (id: string) => ESQUEMAS.find((e) => e.id === id)!;
const deEsquema = (id: string, texto?: string): SeccionMenu => {
  const e = esquema(id);
  return { href: `/admin/${e.id}`, texto: texto ?? e.titulo, icono: e.icono };
};

/**
 * Menú del panel unificado, agrupado por módulo. Cada cuenta ve solo lo que puede ver: el menú
 * no es la protección (cada página y acción vuelve a controlar), pero no muestra puertas cerradas.
 */
export function seccionesDelMenu(p: Permisos): SeccionMenu[] {
  const grupos: { grupo: string; secciones: (SeccionMenu | false)[] }[] = [
    {
      grupo: "Turismo",
      secciones: [
        puedeContenido(p, "lugares", "", "ver") && deEsquema("lugares"),
        ve(p, "turismo") && deEsquema("experiencias"),
        ve(p, "turismo") && deEsquema("recorridos"),
        ve(p, "turismo") && deEsquema("planifica"),
        ve(p, "turismo") && deEsquema("destacados"),
        ve(p, "turismo") && deEsquema("sabores"),
        ve(p, "turismo") && deEsquema("escapadas"),
        puede(p, "turismo", "configurar") && { href: "/admin/temas", texto: "Temas y etiquetas", icono: "etiqueta" },
        puede(p, "turismo", "configurar") && { href: "/admin/configuracion", texto: "Configuración del sitio", icono: "ajustes" },
      ],
    },
    {
      grupo: "Cultura",
      secciones: [
        ve(p, "cultura") && deEsquema("eventos", "Agenda cultural"),
        puede(p, "cultura", "configurar") && { href: "/admin/categorias-agenda", texto: "Categorías de la agenda", icono: "etiqueta" },
      ],
    },
    {
      grupo: "Buses y circuitos",
      secciones: [
        ve(p, "buses") && { href: "/admin/buses", texto: "Salidas y reservas", icono: "bus-linea" },
        ve(p, "buses") && { href: "/admin/buses/educativo", texto: "Bus Educativo", icono: "escuela" },
        ve(p, "buses") && { href: "/admin/buses/fotos", texto: "Books de fotos", icono: "camara" },
        ve(p, "buses") && { href: "/admin/buses/bicitour", texto: "BiciTour", icono: "bici" },
      ],
    },
    {
      grupo: "Migue",
      secciones: [
        ve(p, "migue") && { href: "/admin/migue", texto: "Preguntas frecuentes", icono: "chat" },
        ve(p, "migue") && { href: "/admin/migue/interacciones", texto: "Interacciones", icono: "tendencia" },
      ],
    },
    {
      grupo: "Sistema",
      secciones: [
        esSuperadmin(p) && { href: "/admin/usuarios", texto: "Usuarios y permisos", icono: "persona" },
        { href: "/admin/auditoria", texto: "Auditoría", icono: "auditoria" },
      ],
    },
  ];

  const menu: SeccionMenu[] = [{ href: "/admin", texto: "Tablero", icono: "tablero" }];
  for (const g of grupos) {
    const visibles = g.secciones.filter((s): s is SeccionMenu => !!s);
    visibles.forEach((s, i) => menu.push(i === 0 ? { ...s, grupo: g.grupo } : s));
  }
  return menu;
}
