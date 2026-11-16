import type { Metadata } from "next";

import { ProveedorIdioma } from "@/components/i18n/Idioma";
import { textosCliente } from "@/lib/i18n/textos";

export const metadata: Metadata = {
  title: { default: "Panel de Turismo", template: "%s · Panel de Turismo" },
  robots: { index: false, follow: false },
};

/**
 * El panel usa el mismo sistema visual que el sitio (styles/admin.css sobre styles/tokens.css),
 * con su tema claro u oscuro. Va siempre en español; el proveedor de idioma está para las piezas
 * compartidas con el sitio, como el botón de tema.
 */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorIdioma idioma="es" t={textosCliente("es")}>
      <div className="adm">{children}</div>
    </ProveedorIdioma>
  );
}
