import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel de Turismo", template: "%s · Panel de Turismo" },
  robots: { index: false, follow: false },
};

/** Todo el panel va sobre el fondo y la paleta propios (styles/admin.css). */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
