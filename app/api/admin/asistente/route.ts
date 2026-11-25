import { NextRequest, NextResponse } from "next/server";

import { instrucciones, leerHistorial } from "@/lib/admin/ayuda";
import { seccionesDelMenu } from "@/lib/admin/menu";
import { adminActual } from "@/lib/admin/sesion";
import { crearLimitador } from "@/lib/buses/reglas";
import { conversar, iaConfigurada } from "@/lib/ia";

/**
 * POST /api/admin/asistente — Migue del panel: responde cómo usar el panel, con la guía de lib/admin/ayuda.ts y
 * sabiendo el rol, los módulos y el menú de quien pregunta. Solo para cuentas del panel; no guarda la charla.
 */
export const dynamic = "force-dynamic";

const porCuenta = crearLimitador(30, 10 * 60 * 1000);
const sinCache = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: "sesion" }, { status: 401, headers: sinCache });
  if (!porCuenta(admin.id)) return NextResponse.json({ error: "limite" }, { status: 429, headers: sinCache });

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "pedido" }, { status: 400, headers: sinCache });
  }
  const historial = leerHistorial(cuerpo);
  if (!historial) return NextResponse.json({ error: "pedido" }, { status: 400, headers: sinCache });
  if (!iaConfigurada()) return NextResponse.json({ error: "sin-ia" }, { status: 503, headers: sinCache });

  const respuesta = await conversar([
    { role: "system", content: instrucciones(admin.nombre, admin, seccionesDelMenu(admin)) },
    ...historial.map((m) => ({ role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const), content: m.texto })),
  ], { modelo: process.env.PANEL_IA_MODELO || process.env.PLANIFICADOR_MODELO, titulo: "Turismo SMT - Migue del panel" });

  if (!respuesta) return NextResponse.json({ error: "sin-respuesta" }, { status: 502, headers: sinCache });
  return NextResponse.json({ respuesta }, { headers: sinCache });
}
