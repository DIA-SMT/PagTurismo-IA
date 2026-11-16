import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { opcionesCookie, vidaAcotada } from "@/lib/auth/cookies";
import { interpretarRuta } from "@/lib/i18n/config";

/**
 * Dos trabajos antes de cada pedido:
 *  1. Idiomas: la dirección pública (/en/things-to-do) se muestra con la página interna
 *     (/en/que-hacer) y el idioma viaja en el encabezado x-idioma. /es/… y las secciones en
 *     español dentro de otro idioma redirigen a la dirección canónica.
 *  2. Con Supabase, renueva la sesión (los Server Components no pueden escribir cookies).
 */
export async function proxy(request: NextRequest) {
  const ruta = interpretarRuta(request.nextUrl.pathname);
  if (ruta.tipo === "redirigir") {
    const destino = request.nextUrl.clone();
    destino.pathname = ruta.destino;
    return NextResponse.redirect(destino, 308);
  }

  const encabezados = new Headers(request.headers);
  if (ruta.tipo === "pagina") encabezados.set("x-idioma", ruta.idioma);
  const seguir = () => {
    if (ruta.tipo !== "pagina") return NextResponse.next({ request: { headers: encabezados } });
    const interna = request.nextUrl.clone();
    interna.pathname = ruta.interna;
    return NextResponse.rewrite(interna, { request: { headers: encabezados } });
  };

  if (!process.env.DATABASE_URL) return seguir();

  let respuesta = seguir();
  // Si @supabase/ssr escribe cookies más de una vez, la respuesta se vuelve a crear: se
  // guardan las cookies y los encabezados anti-caché (que manda solo en la primera escritura)
  // para aplicarlos todos en la respuesta nueva.
  const escritas = new Map<string, { value: string; options: CookieOptions }>();
  const antiCache: Record<string, string> = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: opcionesCookie,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista, cabeceras) => {
          Object.assign(antiCache, cabeceras);
          for (const { name, value, options } of lista) {
            request.cookies.set(name, value);
            escritas.set(name, { value, options });
          }
          // Las cookies nuevas también tienen que llegar al servidor en este mismo pedido.
          encabezados.set("cookie", request.cookies.toString());
          respuesta = seguir();
          for (const [name, { value, options }] of escritas) respuesta.cookies.set(name, value, vidaAcotada(options));
          // Una respuesta con el token de una persona no puede quedar en la caché de un CDN.
          for (const [clave, valor] of Object.entries(antiCache)) respuesta.headers.set(clave, valor);
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fotos/|stickers/|img/|migue/|fonts/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
