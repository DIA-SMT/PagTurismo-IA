import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioNuevaCuenta, FormularioPermisos } from "@/components/admin/FormularioCuenta";
import { Banda, Chip, Tarjeta, fechaCorta } from "@/components/admin/Piezas";
import { cambiarPermisos, crearCuenta } from "@/app/admin/usuarios-acciones";
import { requerirAdmin } from "@/lib/admin/sesion";
import { consultar } from "@/lib/db";
import { esModulo, esRol, esSuperadmin, NOMBRE_MODULO, NOMBRE_ROL } from "@/lib/permisos";

export const metadata: Metadata = { title: "Usuarios y permisos" };

type Cuenta = { user_id: string; email: string; nombre: string; rol: string; modulos: string[]; activo: boolean; creado_at: string };

/** Cuentas del equipo, sus roles y módulos. Solo superadministradores. */
export default async function Usuarios() {
  const admin = await requerirAdmin();
  if (!esSuperadmin(admin)) redirect("/admin?sin-permiso=usuarios");
  // El correo vive en auth.users, que solo lee el servidor: se consulta después de verificar el rol.
  const cuentas = await consultar<Cuenta>(
    { rol: "servicio" },
    `select a.user_id, u.email, a.nombre, a.rol, a.modulos, a.activo, a.creado_at
     from public.admins a join auth.users u on u.id = a.user_id order by a.activo desc, u.email`,
  );

  return (
    <>
      <Banda titulo="Usuarios y permisos" bajada="Quién entra al panel y qué puede hacer en cada módulo. Cada cambio queda en la auditoría." />
      <div className="adm-grilla adm-grilla--ficha">
        <div className="adm-lista">
          {cuentas.map((c) => {
            const rol = esRol(c.rol) ? c.rol : "consulta";
            const modulos = (c.modulos ?? []).filter(esModulo);
            return (
              <Tarjeta key={c.user_id}
                titulo={<>{c.nombre} <span className="adm-tabla__sub">{c.email}</span></>}
                acciones={<span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Chip tono={c.activo ? "verde" : "gris"}>{c.activo ? "Activa" : "Inactiva"}</Chip>
                  <Chip tono="azul">{NOMBRE_ROL[rol]}</Chip>
                </span>}
                descripcion={<>
                  {rol === "superadmin" ? "Todos los módulos." : modulos.length ? `Módulos: ${modulos.map((m) => NOMBRE_MODULO[m]).join(", ")}.` : "Sin módulos: no ve nada todavía."}
                  {" "}Alta: {fechaCorta(c.creado_at)}.
                </>}>
                <details>
                  <summary className="adm-boton adm-boton--secundario adm-boton--chico">Cambiar permisos</summary>
                  <div style={{ marginTop: "1rem" }}>
                    <FormularioPermisos accion={cambiarPermisos} uid={c.user_id} rol={rol} modulos={modulos} activo={c.activo} />
                  </div>
                </details>
              </Tarjeta>
            );
          })}
        </div>
        <aside className="adm-lateral">
          <Tarjeta titulo="Nueva cuenta" icono="persona">
            <FormularioNuevaCuenta accion={crearCuenta} />
          </Tarjeta>
        </aside>
      </div>
    </>
  );
}
