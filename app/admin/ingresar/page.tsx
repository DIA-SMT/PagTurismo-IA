import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { adminActual } from "@/lib/admin/sesion";
import { modoLocal } from "@/lib/entorno";
import { FormularioIngreso } from "./FormularioIngreso";

export const metadata: Metadata = { title: "Ingresar" };

/**
 * Ingreso del equipo en dos mitades, como el panel de la subasta: a la izquierda, una foto de
 * la ciudad con el logo sobre azul noche; a la derecha, el formulario.
 */
export default async function Ingresar() {
  if (await adminActual()) redirect("/admin");
  return (
    <main id="contenido" className="adm-ingreso">
      <section className="adm-ingreso__imagen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="adm-ingreso__foto" src="/fotos/panoramas/casa-historica.webp" alt="" />
        <div className="adm-ingreso__marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-smt-neg.png" alt="Ciudad San Miguel de Tucumán" width={184} height={60} />
        </div>
        <div className="adm-ingreso__lema">
          <p>Dirección de Turismo</p>
          <strong>Turismo San Miguel de Tucumán</strong>
          <p>Panel de contenidos del portal: lugares, experiencias, agenda y recorridos.</p>
        </div>
      </section>

      <section className="adm-ingreso__formulario">
        <div className="adm-ingreso__caja">
          <p>Panel de Turismo</p>
          <h1>Ingreso del equipo</h1>
          <p style={{ marginTop: "0.75rem", color: "var(--a-gris)" }}>Solo para el equipo autorizado de la Dirección de Turismo.</p>
          <div className="adm-tarjeta">
            <FormularioIngreso />
            {modoLocal && (
              <p className="adm-ingreso__prueba">
                Modo local: usá <strong>admin@ejemplo.test</strong> y la contraseña <strong>turismo-local-2026</strong>.
              </p>
            )}
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/" className="adm-barra__enlace" style={{ paddingInline: 0 }}>
              <Icono nombre="flecha-izq" tamano={16} /> Volver al sitio
            </Link>
          </p>
        </div>
        <p className="adm-pie" style={{ borderTop: 0 }}>
          <span>Municipalidad de San Miguel de Tucumán · Dirección de Turismo</span>
          <span>Desarrollado por la Dirección de Inteligencia Artificial</span>
        </p>
      </section>
    </main>
  );
}
