"use client";

import { useActionState } from "react";

import { MensajeAccion } from "@/components/admin/Piezas";
import { estadoInicial } from "@/lib/admin/acciones";
import { ingresarAlPanel } from "./acciones";

export function FormularioIngreso() {
  const [estado, enviar, enviando] = useActionState(ingresarAlPanel, estadoInicial);
  return (
    <form action={enviar} noValidate>
      <MensajeAccion estado={estado} />
      <div className="adm-campo">
        <label className="adm-campo__etiqueta" htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" className="adm-input" autoComplete="username" required
          defaultValue={estado.valores?.email} />
      </div>
      <div className="adm-campo">
        <label className="adm-campo__etiqueta" htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" className="adm-input" autoComplete="current-password" required />
      </div>
      <button type="submit" className="adm-boton adm-boton--primario adm-boton--ancho" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
