/**
 * Inicio de sesión de /admin con GitHub (paso 1 de 2).
 *
 * Decap abre esta ruta en una ventana emergente. Redirige a GitHub para que
 * la persona autorice la aplicación OAuth de la Municipalidad; GitHub vuelve
 * a /api/decap/callback. Sólo quien tenga permiso de escritura en el
 * repositorio puede guardar cambios: GitHub lo controla, no este sitio.
 *
 * Requiere DECAP_GITHUB_CLIENT_ID y DECAP_GITHUB_CLIENT_SECRET (ver README).
 */

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALCANCES = new Set(["repo", "public_repo"]);

export function GET(request: NextRequest) {
  const clientId = process.env.DECAP_GITHUB_CLIENT_ID;
  if (!clientId || !process.env.DECAP_GITHUB_CLIENT_SECRET) {
    return new NextResponse(
      "La administración todavía no está configurada: faltan DECAP_GITHUB_CLIENT_ID y DECAP_GITHUB_CLIENT_SECRET en el servidor.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const pedido = request.nextUrl.searchParams.get("scope") ?? "repo";
  const scope = ALCANCES.has(pedido) ? pedido : "repo";
  const state = randomBytes(16).toString("hex");

  const destino = new URL("https://github.com/login/oauth/authorize");
  destino.searchParams.set("client_id", clientId);
  destino.searchParams.set("redirect_uri", new URL("/api/decap/callback", request.nextUrl.origin).toString());
  destino.searchParams.set("scope", scope);
  destino.searchParams.set("state", state);

  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.set("decap_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/decap",
    maxAge: 600,
  });
  return respuesta;
}
