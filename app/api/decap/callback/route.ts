/**
 * Inicio de sesión de /admin con GitHub (paso 2 de 2).
 *
 * GitHub vuelve acá con un código; se cambia por un token y se le entrega a
 * la ventana de /admin que abrió el popup, con el protocolo de mensajes que
 * espera Decap CMS. El token sólo se envía a una ventana de este mismo
 * dominio.
 */

import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function pagina(estado: "success" | "error", contenido: object, origen: string) {
  const mensaje = `authorization:github:${estado}:${JSON.stringify(contenido)}`;
  // JSON.stringify deja el texto listo para incrustarlo como literal de JS;
  // se escapa "<" para que no pueda cerrar la etiqueta <script>.
  const literal = (v: string) => JSON.stringify(v).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Iniciando sesión…</title></head>
<body><p>${estado === "success" ? "Sesión iniciada. Esta ventana se cierra sola." : "No se pudo iniciar sesión. Cerrá esta ventana e intentá de nuevo."}</p>
<script>
(function () {
  var origen = ${literal(origen)};
  var mensaje = ${literal(mensaje)};
  if (!window.opener) return;
  window.addEventListener("message", function (e) {
    if (e.origin !== origen) return;
    window.opener.postMessage(mensaje, origen);
  }, false);
  window.opener.postMessage("authorizing:github", origen);
})();
</script></body></html>`;
  const respuesta = new NextResponse(html, {
    status: estado === "success" ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
  respuesta.cookies.delete({ name: "decap_state", path: "/api/decap" });
  return respuesta;
}

export async function GET(request: NextRequest) {
  const origen = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const esperado = request.cookies.get("decap_state")?.value;

  if (!code || !state || !esperado || state !== esperado) {
    return pagina("error", { message: "La solicitud de inicio de sesión venció o no es válida." }, origen);
  }

  const clientId = process.env.DECAP_GITHUB_CLIENT_ID;
  const clientSecret = process.env.DECAP_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return pagina("error", { message: "La administración no está configurada en el servidor." }, origen);
  }

  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      cache: "no-store",
    });
    const datos = (await r.json()) as { access_token?: string; error_description?: string };
    if (!datos.access_token) {
      return pagina("error", { message: datos.error_description ?? "GitHub no entregó el token." }, origen);
    }
    return pagina("success", { token: datos.access_token, provider: "github" }, origen);
  } catch {
    return pagina("error", { message: "No se pudo contactar a GitHub." }, origen);
  }
}
