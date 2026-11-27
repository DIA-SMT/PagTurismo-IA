-- El portal pasa a ser de Cultura (con Turismo como sección): el texto principal de la portada deja de hablar
-- solo de turismo. Se cambia SOLO si sigue siendo el texto original de la carga inicial; si alguien ya lo editó
-- desde el panel (/admin/configuracion), no se toca. La auditoría guarda el antes y el después (actor «sistema»),
-- así que se puede volver atrás desde ahí o editándolo de nuevo en el panel.
update public.contenidos
set datos = jsonb_set(datos, '{hero}', $hero$
{
  "kicker": "San Miguel de Tucumán · Cultura",
  "titulo": "Viví la cultura de",
  "tituloAcento": "San Miguel",
  "bajada": "Agenda cultural, talleres gratuitos, museos y centros culturales. Y todo lo que necesitás para recorrer la ciudad donde nació la Independencia.",
  "traducciones": {
    "en": {
      "kicker": "San Miguel de Tucumán · Culture",
      "titulo": "Experience the culture of",
      "tituloAcento": "San Miguel",
      "bajada": "Cultural events, free workshops, museums and cultural centers. Plus everything you need to explore the city where Argentina declared its independence."
    },
    "pt": {
      "kicker": "San Miguel de Tucumán · Cultura",
      "titulo": "Viva a cultura de",
      "tituloAcento": "San Miguel",
      "bajada": "Agenda cultural, oficinas gratuitas, museus e centros culturais. E tudo o que você precisa para conhecer a cidade onde a Argentina declarou sua independência."
    }
  }
}
$hero$::jsonb)
where coleccion = 'configuracion'
  and slug = 'sitio'
  and datos -> 'hero' ->> 'titulo' = 'Donde nació'
  and datos -> 'hero' ->> 'tituloAcento' = 'la Independencia'
  and datos -> 'hero' ->> 'bajada' = 'Historia, sabores y naturaleza al pie del cerro San Javier. Viví la capital del Jardín de la República.';
