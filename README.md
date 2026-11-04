# Turismo San Miguel de Tucumán — landing

Landing de turismo de la Municipalidad de San Miguel de Tucumán. La
estructura sigue a [turismo.buenosaires.gob.ar](https://turismo.buenosaires.gob.ar/es)
y la estética es la del portal nuevo de smt.gob.ar
([DIA-SMT/Pagina-SMT-IA](https://github.com/DIA-SMT/Pagina-SMT-IA)): mismos
tokens de color, misma tipografía, mismo encabezado y pie, y Migue
presentando la ciudad.

Stack igual al del portal para que se pueda integrar sin traducir nada:
Next.js 16.3.5 · React 19.2.8 · App Router · TypeScript · CSS propio, sin
Tailwind.

## Cómo levantarla

Requisitos: Node 20.9 o superior.

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. También está la configuración `turismo-smt`
en `.claude/launch.json`.

Variables opcionales:

| Variable | Para qué |
|---|---|
| `SITIO_URL` | URL pública del sitio. Next la usa para armar las URLs absolutas de Open Graph. Sin ella quedan apuntando a `localhost`. |

## Secciones

| Sección | Equivale en BA a | Contenido |
|---|---|---|
| Hero | Video "Siempre es temporada alta" | Panorámicas de día o de noche según el tema, Migue y cuatro accesos rápidos |
| Destacados | Destacados | Bus turístico, circuito a pie, la ciudad de noche |
| Qué hacer | Carrusel "Qué hacer" | Ocho categorías: patrimonio, gastronomía, religioso, parques, cultura, deportes, plazas, escapadas |
| Una ciudad que hizo historia | Razones para venir | Línea de tiempo 1565 · 1685 · 1812 · 1816 |
| Recorridos | Paseos y experiencias | Los tres circuitos del bus turístico en pestañas, inscripción y otras experiencias |
| Agenda | Eventos | Fechas fijas del calendario tucumano |
| Sabores / Escapadas | Gastronomía, Naturaleza | Platos típicos y salidas desde la ciudad |
| Antes de llegar | Cómo llegar, moverse, clima, datos útiles, accesibilidad | Con el clima actual en vivo |
| Contacto | Contacto | Dirección de Turismo, redes y mapa interactivo |

## Dónde está cada cosa

| Archivo | Contenido |
|---|---|
| `lib/contenido.ts` | **Todo el texto de la página.** Para corregir un horario, una parada o un enlace no hace falta tocar componentes. |
| `lib/clima.ts` | Clima actual desde [Open-Meteo](https://open-meteo.com/) (gratis, sin clave). Se pide desde el servidor y se cachea 30 minutos; si falla, la página se arma igual sin el dato. |
| `app/page.tsx` | La landing, sección por sección. |
| `components/` | Encabezado, pie, hero, carrusel, pestañas de circuitos. `Tema.tsx` y `LogoSMT.tsx` son copia exacta de los del portal. |
| `styles/tokens.css` | Copia exacta de los tokens del portal (paleta del isologotipo, tipografía, espaciado, tema oscuro). |
| `styles/base.css` | Reset, accesibilidad, encabezado, botones, emergencias y pie, tomados del portal. |
| `styles/landing.css` | Las secciones de la landing. |

## De dónde sale el contenido

Los recorridos, horarios, paradas, domicilio y correo se tomaron de las notas
publicadas en smt.gob.ar: `busturistico`, `circuitosturisticospie`,
`circuitos-turisticos`, `museoescultorio`, `parques_smt`, `historia` y el área
89 (Dirección de Turismo) de la estructura de gobierno. Los teléfonos de
emergencia salen del mismo CMS.

Fotos, ilustraciones, logos, la tipografía Encode Sans y Migue son los
recursos oficiales que ya usa el portal.

## Para revisar con la Dirección de Turismo antes de publicar

- **Domicilio de la oficina.** El área publica "Congreso y Crisóstomo
  Álvarez", la nota del bus dice "Congreso 101" y la ficha "Congreso 171".
  Se usó el del área.
- **Distancias de las escapadas** (San Javier 25 km, Tafí del Valle 107 km,
  Quilmes 180 km, Famaillá 35 km): son aproximadas.
- **Agenda.** Hoy son fechas fijas del calendario. Lo ideal es que salga del
  CMS con los eventos reales de cada mes, como en BA.
- **Formularios de contacto y newsletter.** BA los tiene; acá se reemplazaron
  por el correo de Turismo porque necesitan un backend que todavía no existe.
- **Idiomas.** BA ofrece inglés y portugués. No está implementado.
