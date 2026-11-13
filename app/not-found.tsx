import { ClimaActual } from "@/components/ClimaActual";
import { Encabezado } from "@/components/Encabezado";
import { Icono } from "@/components/Iconos";
import { ProveedorIdioma, Vinculo as Link } from "@/components/i18n/Idioma";
import { PieDePagina } from "@/components/PieDePagina";
import { idiomaActual } from "@/lib/i18n/servidor";
import { textos, textosCliente } from "@/lib/i18n/textos";

// Va fuera de app/[idioma]: arma su propio encabezado y pie. El idioma sale de la dirección
// pedida (el proxy lo pasa en x-idioma), así /en/lo-que-sea responde en inglés.
export default async function NoEncontrada() {
  const idioma = await idiomaActual();
  const t = textos(idioma).comun.errores;
  return (
    <ProveedorIdioma idioma={idioma} t={textosCliente(idioma)}>
      <Encabezado clima={<ClimaActual />} />
      <main id="contenido">
        <section className="contenedor pagina-vacia" aria-labelledby="no-encontrada">
          <p className="kicker">{t.error404}</p>
          <h1 id="no-encontrada">{t.noEncontrada}</h1>
          <p>{t.noEncontradaTexto}</p>
          <div className="vacio__acciones">
            <Link className="boton boton--primario" href="/que-hacer"><Icono nombre="buscar" tamano={18} /> {t.buscarQueHacer}</Link>
            <Link className="boton boton--claro" href="/">{t.irAlInicio}</Link>
          </div>
        </section>
      </main>
      <PieDePagina />
    </ProveedorIdioma>
  );
}
