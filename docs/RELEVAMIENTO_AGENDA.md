# Relevamiento del sitio de la Agenda Cultural — 25/11/2026

Comparación del sitio publicado de la Agenda Cultural (<https://agenda.195-35-42-168.sslip.io>, la app de
[DIA-SMT/Agenda-Cultural](https://github.com/DIA-SMT/Agenda-Cultural); el sitio publicado coincide con
`_fuentes/Agenda-Cultural` en `df005ae`) con el portal publicado (<https://portalturismo.195-35-42-168.sslip.io>)
y la base local. Se leyeron el sitemap, las 21 fichas de lugares, los 59 eventos próximos, eventos pasados, las
12 páginas fijas y `/api/migue/contenido` de los dos sitios.

## Resultado

| Qué | En la Agenda | En el portal antes | Qué se hizo |
|---|---|---|---|
| Eventos próximos | 59 | Los 59, con las mismas fechas, horas y sedes | Nada: están sincronizados |
| Eventos (todos) | Cada uno con su página `/eventos/<slug>`, también los pasados | 390 (386 del WordPress + 4 propios), sin foto en la base local | `fotos-eventos`: 383 con foto; se saltean los 4 propios del portal y 3 cuyo título en la Agenda es otro |
| Espacios (lugares) | 21 fichas con fotos en `/media/lugares/…` | Los mismos 21, campo por campo iguales (textos, horarios, redes, coordenadas); 20 en borrador | `espacios --desde-sitio`: las fotos, que el portal no podía bajar (sus URLs eran del WordPress caído) |
| Páginas fijas (patrimonio, gastronomía, guías, oficinas, preguntas frecuentes, murales, ferias, museo a cielo abierto, nuestra ciudad, planificá tu viaje) | Texto y 88 fotos en el código de la Agenda | No estaban (pendiente P2 de `ESTADO_INTEGRACION.md`) | `paginas`: 17 fichas nuevas en borrador y fotos para el Museo Escultórico |

### Las 17 fichas nuevas (todas en borrador, con la página de la Agenda como fuente)

| Colección | Fichas | Origen |
|---|---|---|
| Lugares | Museo Histórico Provincial, Museo de Ciencias Naturales, Basílica Nuestra Señora de la Merced | Patrimonio histórico |
| Experiencias | Museo escultórico a cielo abierto (recorrido guiado de los viernes, con inscripción), Pintamos la ciudad que queremos (20 murales), Ferias municipales (11 fotos) | Sus páginas |
| Sabores | Panchuque, Achilata, Alfajores de miel de caña, Alfeñiques | Gastronomía |
| Planificá | Guías y mapas (3 PDF y el mapa interactivo), Oficinas de información (con horarios), Alojamiento, agencias y alquiler de autos (las guías de Turismo y la de bares y peñas), Cerca de la ciudad (escapadas, tren y rutas), Nuestra ciudad (historia y datos), Preguntas frecuentes (10 de visitantes), Preguntas de vecinos (10) | Guías, Oficinas, Planificá tu viaje, Gastronomía, Nuestra ciudad, Preguntas frecuentes |

Además, el **Museo Escultórico** (publicado) recibe foto principal, galería de 6 esculturas y las coordenadas del punto
de partida del recorrido: solo se completan campos vacíos.

Las experiencias ahora tienen **galería de fotos** (como lugares y eventos): campo nuevo en el panel y en la ficha.

## Para decidir (diferencias entre los dos sitios)

1. **Oficina de Turismo.** El portal dice «Congreso y Crisóstomo Álvarez» y no tiene horario de atención; la Agenda
   dice «Peatonal Congreso 121», lunes a viernes 8 a 13 y 16 a 21, sábados, domingos y feriados 9 a 20; el circuito a
   pie de la agenda sale de «Oficina de Turismo, Congreso 141». Confirmar y corregir Configuración.
2. **Museo Escultórico.** El portal habla de «catorce esculturas»; la Agenda lista 13 obras en el recorrido.
3. **Aeropuerto.** «Unos 10 km» en el portal, «9 km» en la Agenda.
4. **Cómo llegar** (publicada) no tiene el tren ni las rutas nacionales: quedaron en «Cerca de la ciudad» (borrador)
   para pasarlos a mano si se quiere.
5. **Sabores.** Los platos del portal usan ilustraciones (`/stickers/…`); los nuevos traen fotos de la Agenda.
6. **Preguntas frecuentes.** Las de Migue viven en la base del bot (decisión D4). Estas entran como guías de
   Planificá; decidir si se suman también a Migue y si «Preguntas de vecinos» va en un portal de turismo.
7. **Escapadas.** El Cadillal, Raco y El Siambón, y Villa Nougués solo aparecen como texto: faltan fotos para
   hacerles ficha.
8. **`agendacultural.smt.gob.ar`** redirige todavía al WordPress viejo, que no responde. El importador usa el sitio
   nuevo por defecto (`AGENDA_SITIO_URL` lo cambia).

## Cómo se carga

```bash
npm run cultura -- espacios --desde-sitio --fotos [--escribir]
npm run cultura -- paginas --fotos [--escribir]
npm run cultura -- fotos-eventos [--escribir]
```

Sin `--escribir` es prueba en seco. Las tres son idempotentes: lo que ya existe no se duplica y lo editado en el
panel no se pisa. En producción, ver `deploy/README.md` (Cultura). El contenido de las páginas fijas está en
`datos/cultura/paginas-agenda.json`; la lectura del sitio, en `lib/cultura/sitio-agenda.ts`, con pruebas en
`tests/sitio-agenda.test.ts`.
