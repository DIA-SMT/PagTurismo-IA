/** Lectura del sitio nuevo de la Agenda Cultural y contenido de sus páginas fijas (datos/cultura/paginas-agenda.json). */
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { esquemaDe } from "../lib/admin/esquemas.ts";
import { limpiarFicha, SLUG_VALIDO, type Contexto } from "../lib/admin/limpiar.ts";
import { fotoOriginal, fotosDeEventoDesdeHtml, lugarDesdeHtml, slugsDelSitemap } from "../lib/cultura/sitio-agenda.ts";
import { espacioALugar } from "../lib/cultura/importar.ts";
import { leerSemilla } from "../lib/db/semilla.ts";
import { normalizarExperiencia, normalizarLugar } from "../lib/normalizar.ts";

const BASE = "https://agenda.ejemplo.test";

// Recorte de /lugares/casa-belgraniana tal como lo sirve el sitio (Next transmite el contenido al final).
const LUGAR = `<html><head><title>Casa Belgraniana | Agenda Cultural SMT</title></head><body><header><h1 class="marca">Agenda</h1></header>
<main id="contenido"><template id="B:1"></template></main>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Place","name":"Casa Belgraniana","description":"Recreación de la vivienda donde vivió Manuel Belgrano.","image":"/media/lugares/casa-belgraniana/museo.jpg","telephone":"3814527836","address":{"@type":"PostalAddress","streetAddress":"Bernabé Aráoz 681","addressLocality":"San Miguel de Tucumán"}}</script>
<div hidden id="S:2"><div class="page-surface"><div class="place-detail-hero"><img alt="" decoding="async" src="/_next/image?url=%2Fmedia%2Flugares%2Fcasa-belgraniana%2Fmuseo.jpg&amp;w=3840&amp;q=75"/><div class="detail-overlay"></div>
<div class="shell detail-heading"><a class="back-link" href="/espacios-culturales"><svg></svg> <!-- -->Espacios culturales</a><p class="section-kicker">Museo</p><h1>Casa Belgraniana</h1><p>Recreación de la vivienda donde vivió Manuel Belgrano.</p></div></div>
<div class="shell detail-layout"><div class="detail-main"><section><h2>Sobre el espacio</h2><p>La Casa Belgraniana &#x27;Solar Histórico&#x27; recrea la vivienda.</p><p>Su recorrido incluye dos habitaciones.</p></section>
<section><h2>Qué vas a encontrar</h2><ul class="place-services"><li>Mural de 27 metros</li><li>Aljibe</li></ul></section>
<section><h2>Galería</h2><div class="place-gallery"><figure><img alt="foto 1" src="/_next/image?url=%2Fmedia%2Flugares%2Fcasa-belgraniana%2Fa.webp&amp;w=3840&amp;q=75"/></figure><figure><img alt="foto 2" src="/_next/image?url=%2Fmedia%2Flugares%2Fcasa-belgraniana%2Fb.webp&amp;w=3840&amp;q=75"/></figure></div></section>
<section><h2>Ubicación</h2><div class="place-map"><iframe title="Mapa" src="https://maps.google.com/maps?q=-26.838187,-65.218047&amp;z=16&amp;output=embed"></iframe></div></section></div>
<aside class="event-facts" aria-label="Datos del lugar"><div><svg><path d="M1"></path></svg><span><small>Dirección</small><strong>Bernabé Aráoz 681</strong><em>San Miguel de Tucumán</em></span></div>
<div><svg></svg><span><small>Horarios</small><em class="place-hours">Lunes a Viernes de 9 a 12:30 h</em><em class="place-hours">Sábado y domingo de 10 a 13 h</em></span></div>
<div><svg></svg><span><small>Teléfono</small><strong><a href="tel:3814527836">3814527836</a></strong></span></div>
<div><svg></svg><span><small>Redes</small><a href="https://www.instagram.com/casabelgranianasmt/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.facebook.com/CasaBelgranianaSMT/" target="_blank" rel="noreferrer">Facebook</a></span></div>
</aside></div></div></div></body></html>`;

describe("lugares del sitio de la Agenda", () => {
  const e = lugarDesdeHtml(LUGAR, "casa-belgraniana", BASE);

  it("lee nombre, tipo, resumen, descripción y servicios", () => {
    assert.equal(e.name, "Casa Belgraniana");
    assert.equal(e.type, "museum");
    assert.equal(e.summary, "Recreación de la vivienda donde vivió Manuel Belgrano.");
    assert.deepEqual(e.description, ["La Casa Belgraniana 'Solar Histórico' recrea la vivienda.", "Su recorrido incluye dos habitaciones."]);
    assert.deepEqual(e.services, ["Mural de 27 metros", "Aljibe"]);
  });

  it("lee dirección, horarios, teléfono, redes y coordenadas", () => {
    assert.equal(e.address, "Bernabé Aráoz 681");
    assert.deepEqual(e.opening_hours, ["Lunes a Viernes de 9 a 12:30 h", "Sábado y domingo de 10 a 13 h"]);
    assert.equal(e.phone, "3814527836");
    assert.equal(e.social_links?.instagram, "https://www.instagram.com/casabelgranianasmt/");
    assert.equal(e.social_links?.facebook, "https://www.facebook.com/CasaBelgranianaSMT/");
    assert.equal(e.latitude, -26.838187);
    assert.equal(e.longitude, -65.218047);
  });

  it("las fotos son las originales de /media/, no las recortadas por Next", () => {
    assert.equal(e.image, `${BASE}/media/lugares/casa-belgraniana/museo.jpg`);
    assert.deepEqual(e.gallery, [`${BASE}/media/lugares/casa-belgraniana/a.webp`, `${BASE}/media/lugares/casa-belgraniana/b.webp`]);
  });

  it("se convierte en un lugar válido del portal", () => {
    const l = normalizarLugar(espacioALugar(e), e.slug);
    assert.equal(l.tipoEspacio, "cultural");
    assert.deepEqual(l.coordenadas, { lat: -26.838187, lng: -65.218047 });
    assert.equal(l.legado?.id, "casa-belgraniana");
  });

  it("una plaza sin galería ni horarios no inventa datos", () => {
    const plaza = lugarDesdeHtml(`<div class="page-surface"><p class="section-kicker">Plaza</p><h1>Plaza Urquiza</h1>
      <section><h2>Ubicación</h2><a href="https://www.google.com/maps/search/?api=1&amp;query=-26.82,-65.2">Cómo llegar</a></section></div>`, "plaza-urquiza", BASE);
    assert.equal(plaza.type, "square");
    assert.deepEqual(plaza.gallery, []);
    assert.deepEqual(plaza.opening_hours, []);
    assert.equal(plaza.image, null);
    assert.equal(plaza.latitude, -26.82);
  });
});

describe("fotos de los eventos del sitio de la Agenda", () => {
  it("toma la foto del evento (og:image en /media/) y el título", () => {
    const f = fotosDeEventoDesdeHtml(`<meta property="og:image" content="${BASE}/media/eventos/wordpress/2025/12/1001485311.jpg"/>
      <div hidden id="S:2"><article><h1>Acrobacias en tela</h1><h2>Sobre la actividad</h2></article></div>`, BASE);
    assert.equal(f.titulo, "Acrobacias en tela");
    assert.equal(f.imagen, `${BASE}/media/eventos/wordpress/2025/12/1001485311.jpg`);
  });

  it("la imagen por defecto del sitio no cuenta como foto del evento", () => {
    const f = fotosDeEventoDesdeHtml(`<meta property="og:image" content="${BASE}/images/agenda-por-defecto.webp"/><h1>Sin foto</h1>`, BASE);
    assert.equal(f.imagen, null);
  });
});

describe("piezas sueltas", () => {
  it("sitemap: solo las direcciones del tipo pedido", () => {
    const xml = `<urlset><url><loc>${BASE}/lugares/plaza-urquiza</loc></url><url><loc>${BASE}/eventos/yoga-6</loc></url><url><loc>${BASE}/lugares</loc></url></urlset>`;
    assert.deepEqual(slugsDelSitemap(xml, "lugares"), ["plaza-urquiza"]);
    assert.deepEqual(slugsDelSitemap(xml, "eventos"), ["yoga-6"]);
  });

  it("fotoOriginal deshace la URL de /_next/image", () => {
    assert.equal(fotoOriginal("/_next/image?url=%2Fmedia%2Fx%2Fy.webp&amp;w=640&amp;q=75", BASE), `${BASE}/media/x/y.webp`);
    assert.equal(fotoOriginal("https://otro.test/a.jpg", BASE), "https://otro.test/a.jpg");
  });
});

describe("páginas fijas de la Agenda → fichas (datos/cultura/paginas-agenda.json)", () => {
  const { fichas } = JSON.parse(fs.readFileSync("datos/cultura/paginas-agenda.json", "utf8")) as {
    fichas: { pagina: string; paginaTitulo: string; coleccion: string; slug: string; datos: Record<string, unknown> }[];
  };
  const semilla = leerSemilla();
  const config = semilla.find((f) => f.coleccion === "configuracion" && f.slug === "categorias")!.datos as { categorias: { id: string }[]; etiquetas: { id: string }[] };
  const porColeccion: Record<string, Set<string>> = {};
  for (const f of [...semilla, ...fichas]) (porColeccion[f.coleccion] ??= new Set()).add(f.slug);
  const ctx: Contexto = {
    temas: new Set(config.categorias.map((c) => c.id)),
    etiquetas: new Set(config.etiquetas.map((e) => e.id)),
    rubros: new Set(),
    fichas: porColeccion,
  };

  it("cada ficha nueva pasa el formulario del panel sin errores", () => {
    for (const f of fichas) {
      if (semilla.some((s) => s.coleccion === f.coleccion && s.slug === f.slug)) continue;
      assert.match(f.slug, SLUG_VALIDO, f.slug);
      const { errores } = limpiarFicha(esquemaDe(f.coleccion)!, f.datos, ctx);
      assert.deepEqual(errores, {}, `${f.coleccion}/${f.slug}`);
    }
  });

  it("las fichas que ya existen solo traen datos para completar (no títulos ni resúmenes)", () => {
    for (const f of fichas.filter((x) => semilla.some((s) => s.coleccion === x.coleccion && s.slug === x.slug))) {
      assert.ok(!("titulo" in f.datos) && !("resumen" in f.datos), `${f.coleccion}/${f.slug}`);
    }
  });

  it("las fotos son rutas del sitio de la Agenda y las páginas, rutas suyas", () => {
    for (const f of fichas) {
      assert.match(f.pagina, /^\/[a-z-]+$/);
      const fotos = [f.datos.imagen, ...((f.datos.galeria as { foto: unknown }[] | undefined) ?? []).map((g) => g.foto)] as ({ src: string } | undefined)[];
      for (const foto of fotos.filter(Boolean)) assert.match(foto!.src, /^\/images\/contenido\/[a-z-]+\/[a-z0-9-]+\.webp$/);
    }
  });

  it("la galería de una experiencia llega a la ficha publicada", () => {
    const murales = fichas.find((f) => f.slug === "pintamos-la-ciudad-que-queremos")!;
    const e = normalizarExperiencia(murales.datos, murales.slug);
    assert.equal(e.galeria.length, 20);
    assert.equal(e.accion.tipo, "sin-inscripcion");
  });
});
