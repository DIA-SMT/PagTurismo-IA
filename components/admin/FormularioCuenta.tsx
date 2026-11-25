"use client";

import { useActionState } from "react";

import { Icono } from "@/components/Iconos";
import { MensajeAccion } from "@/components/admin/Piezas";
import { estadoInicial, type EstadoAccion } from "@/lib/admin/acciones";
import { DESCRIPCION_ROL, MODULOS, NOMBRE_MODULO, NOMBRE_ROL, ROLES, type Modulo, type Rol } from "@/lib/permisos";

type Accion = (previo: EstadoAccion, form: FormData) => Promise<EstadoAccion>;

function CamposPermisos({ rol, modulos, error }: { rol?: Rol; modulos?: Modulo[]; error?: string }) {
  return (
    <>
      <fieldset className="adm-campo">
        <legend className="adm-campo__etiqueta">Rol</legend>
        {ROLES.map((r) => (
          <label className="adm-casilla" key={r}>
            <input type="radio" name="rol" value={r} defaultChecked={(rol ?? "editor") === r} />
            <span><strong>{NOMBRE_ROL[r]}</strong> — {DESCRIPCION_ROL[r]}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="adm-campo" aria-describedby={error ? "error-modulos" : undefined}>
        <legend className="adm-campo__etiqueta">Módulos</legend>
        <span className="adm-campo__ayuda">No hace falta para un superadministrador.</span>
        {MODULOS.map((m) => (
          <label className="adm-casilla" key={m}>
            <input type="checkbox" name="modulos" value={m} defaultChecked={modulos?.includes(m)} />
            <span>{NOMBRE_MODULO[m]}</span>
          </label>
        ))}
        {error && <span className="adm-campo__error" id="error-modulos">{error}</span>}
      </fieldset>
    </>
  );
}

/** Alta de una cuenta. */
export function FormularioNuevaCuenta({ accion }: { accion: Accion }) {
  const [r, enviar, enviando] = useActionState(accion, estadoInicial);
  const e = r.errores ?? {};
  return (
    <form action={enviar} className="adm-lista" noValidate>
      <div className="adm-campos">
        <div className="adm-campo">
          <label className="adm-campo__etiqueta" htmlFor="cuenta-email">Correo</label>
          <input id="cuenta-email" name="email" type="email" className="adm-input" autoComplete="off" defaultValue={r.valores?.email} aria-invalid={!!e.email} />
          {e.email && <span className="adm-campo__error">{e.email}</span>}
        </div>
        <div className="adm-campo">
          <label className="adm-campo__etiqueta" htmlFor="cuenta-nombre">Nombre y apellido</label>
          <input id="cuenta-nombre" name="nombre" className="adm-input" defaultValue={r.valores?.nombre} aria-invalid={!!e.nombre} />
          {e.nombre && <span className="adm-campo__error">{e.nombre}</span>}
        </div>
        <div className="adm-campo">
          <label className="adm-campo__etiqueta" htmlFor="cuenta-clave">Contraseña inicial</label>
          <input id="cuenta-clave" name="clave" type="password" className="adm-input" autoComplete="new-password" aria-invalid={!!e.clave} />
          <span className="adm-campo__ayuda">Mínimo 10 caracteres. Pasala por un canal seguro; se cambia con «npm run cuentas -- clave».</span>
          {e.clave && <span className="adm-campo__error">{e.clave}</span>}
        </div>
        <CamposPermisos error={e.modulos} />
      </div>
      <MensajeAccion estado={r} />
      <button type="submit" className="adm-boton adm-boton--primario" disabled={enviando}>
        <Icono nombre="mas" tamano={18} /> {enviando ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}

/** Rol, módulos y estado de una cuenta existente. */
export function FormularioPermisos({ accion, uid, rol, modulos, activo }: { accion: Accion; uid: string; rol: Rol; modulos: Modulo[]; activo: boolean }) {
  const [r, enviar, enviando] = useActionState(accion, estadoInicial);
  return (
    <form action={enviar} className="adm-lista">
      <input type="hidden" name="uid" value={uid} />
      <CamposPermisos rol={rol} modulos={modulos} />
      <label className="adm-casilla">
        <input type="checkbox" name="activo" value="si" defaultChecked={activo} />
        <span>Cuenta activa (puede entrar al panel)</span>
      </label>
      <MensajeAccion estado={r} />
      <button type="submit" className="adm-boton adm-boton--secundario" disabled={enviando}>
        <Icono nombre="check" tamano={18} /> {enviando ? "Guardando…" : "Guardar permisos"}
      </button>
    </form>
  );
}
