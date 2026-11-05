# Turismo San Miguel de Tucumán — portal

Portal de turismo de la Municipalidad de San Miguel de Tucumán. Pasó de ser
una landing de una sola página a un portal con fichas propias de lugares,
experiencias, recorridos y eventos, un catálogo con filtros, una agenda por
fecha y una administración de contenidos en `/admin`.

La especificación es el informe *Investigación Turismo SMT* (comparación con
[turismo.buenosaires.gob.ar](https://turismo.buenosaires.gob.ar/es)). La
estética es la del portal nuevo de smt.gob.ar
([DIA-SMT/Pagina-SMT-IA](https://github.com/DIA-SMT/Pagina-SMT-IA)).

Stack: Next.js 16.3.5 · React 19.2.8 · App Router · TypeScript · CSS propio.
Contenido en archivos JSON dentro del repositorio, editados con
[Decap CMS](https://decapcms.org/). No tiene base de datos.

## Cómo levantarlo

Requisitos: Node 20.9 o superior para el sitio; Node 22.18 o superior para
las pruebas y el validador.

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. También está la configuración `turismo-smt`
en `.claude/launch.json`.

| Comando | Para qué |
|---|---|
| `npm run dev` | Sitio en desarrollo. Muestra también los borradores. |
| `npm run cms` | Servidor local de Decap: con él, `/admin` edita los archivos sin GitHub. |
| `npm run validar` | Revisa el contenido: relaciones, fechas, imágenes, revisiones vencidas. |
| `npm test` | Pruebas de agenda, catálogo y contenido. |
| `npm run build` | Compilación de producción. |

## Variables de entorno

| Variable | Para qué |
|---|---|
| `SITIO_URL` | URL pública. Se usa para Open Graph, sitemap y robots. |
| `DECAP_GITHUB_CLIENT_ID` | Aplicación OAuth de GitHub para entrar a `/admin`. |
| `DECAP_GITHUB_CLIENT_SECRET` | Secreto de esa aplicación. |
| `MOSTRAR_BORRADORES` | `1` en un despliegue de vista previa para revisar borradores en contexto. Nunca en producción. |

## Rutas

| Ruta | Contenido |
|---|---|
| `/` | Portada: búsqueda, accesos, destacados, temas, agenda, recorridos, itinerarios, sabores, planificación, ayuda. Las anclas viejas (`#que-hacer`, `#agenda`, `#recorridos`, `#sabores`, `#antes-de-llegar`, `#contacto`, `#escapadas`) siguen funcionando. |
| `/descubri` | Imperdibles, itinerarios por tiempo, temas e historia. |
| `/que-hacer` | Catálogo con búsqueda, tema, tipo y gratuidad. Los filtros quedan en la URL. |
| `/que-hacer/[tema]` | Todo lo de un tema. |
| `/lugares/[slug]` | Ficha de lugar. |
| `/experiencias/[slug]` | Ficha de experiencia con acción principal y salidas. |
| `/recorridos`, `/recorridos/[slug]` | Circuitos e itinerarios, con paradas numeradas. |
| `/agenda`, `/agenda/[slug]` | Agenda por fecha (hoy, fin de semana, fecha) y calendario anual. |
| `/planifica`, `/planifica/[slug]` | Guías prácticas. |
| `/sabores`, `/escapadas` | Gastronomía y salidas fuera de la ciudad. |
| `/admin` | Administración de contenidos (Decap CMS). |
| `/admin/revision` | Tablero de lo pendiente: borradores, avisos, revisiones vencidas. |

## Contenido

Cada ficha es un archivo en `contenido/<colección>/<slug>.json`. El slug es
el final de la dirección: `contenido/lugares/casa-historica.json` se ve en
`/lugares/casa-historica`.

| Colección | Qué es |
|---|---|
| `lugares` | Atractivos permanentes. |
| `experiencias` | Actividades con modalidad, acción principal (reservar, inscribirse, consultar) y salidas. |
| `eventos` | El concepto (la fiesta) con sus ocurrencias (cada fecha concreta). |
| `recorridos` | Circuitos e itinerarios: paradas ordenadas que enlazan lugares. |
| `planifica` | Guías prácticas. |
| `destacados` | Tarjetas de la portada, con ventana de publicación. |
| `sabores`, `escapadas` | Platos y destinos fuera de la ciudad. |
| `configuracion/` | Datos del sitio (portada, contacto, redes, emergencias, historia) y temas y etiquetas. |

Las relaciones se guardan por slug: un horario o una descripción se escribe
una sola vez y la portada, el catálogo y las fichas lo leen del mismo lugar.

### Reglas que aplica el sitio

- **Borradores.** Cada ficha tiene un estado. En producción sólo se ven las
  publicadas; si una ficha publicada apunta a un borrador, el enlace no
  aparece.
- **Datos sin confirmar.** Un horario sin la marca *confirmado* se muestra con
  "Dato a confirmar". No hay "Abierto ahora". El costo sin dato dice
  "Consultar antes de ir".
- **Reservas.** El sistema responsable es el del Bus Turístico. El portal
  enlaza con un botón explícito y no muestra cupos ni confirma nada.
- **Agenda.** Fechas en hora de Tucumán (`AAAA-MM-DDTHH:mm`). Las terminadas
  salen solas; las canceladas o suspendidas se muestran con su estado y no se
  destacan. Una efeméride va en el calendario anual, nunca como evento
  confirmado.
- **Escapadas** y eventos fuera de la ciudad llevan la marca "Fuera de la ciudad".

### Cómo cargar un lugar, un evento y un recorrido sin tocar código

1. Entrar a `/admin` con una cuenta de GitHub que tenga permiso de escritura en el repositorio.
2. **Lugar:** *Lugares → Nuevo lugar*. Completar título, tipo, resumen y
   temas; dirección y horario sólo si están confirmados (y tildar
   *Confirmado*). Cargar la foto con su texto alternativo, crédito y permiso.
   Dejar el estado en *Borrador* hasta revisar.
3. **Evento:** *Agenda → Nuevo evento*. La descripción es lo que no cambia; cada
   fecha concreta se agrega en *Ocurrencias* con inicio, fin y estado. Si
   después se cancela, se cambia el estado de esa ocurrencia: no se borra.
4. **Recorrido:** *Recorridos → Nuevo recorrido*. Agregar las paradas en orden;
   en cada una, elegir la ficha del lugar si existe. Si es guiado, elegir la
   experiencia que lo opera: de ahí salen el botón de reserva y las salidas.
5. Completar *Validación* (fecha, responsable, próxima revisión) y pasar a
   *Publicado*.
6. Guardar. Con el flujo editorial, el cambio queda como borrador → en
   revisión → listo; al publicarlo se hace un commit y el sitio se vuelve a
   desplegar.

Antes de publicar conviene mirar `/admin/revision` o correr `npm run validar`.

## Administración: puesta en marcha

`/admin` es Decap CMS (versión fijada en `public/admin/index.html`, con hash
de integridad). La configuración de colecciones y campos está en
`public/admin/config.yml`.

**En desarrollo** no hace falta GitHub: con `npm run dev` y `npm run cms` en
paralelo, el botón *Iniciar sesión* entra directo y los cambios se escriben
en los archivos locales.

**En producción** hay que crear una aplicación OAuth de GitHub (en la
organización DIA-SMT → Settings → Developer settings → OAuth Apps):

- *Homepage URL:* la URL pública del sitio.
- *Authorization callback URL:* `https://<dominio>/api/decap/callback`.

Después, cargar `DECAP_GITHUB_CLIENT_ID` y `DECAP_GITHUB_CLIENT_SECRET` en
las variables del despliegue. Sólo pueden guardar cambios las personas con
permiso de escritura en el repositorio. GitHub controla ese permiso, no el sitio.

Para actualizar Decap, cambiar la versión en `public/admin/index.html` y
recalcular el `integrity` (`sha384` del archivo `dist/decap-cms.js`).

## Para revisar con la Dirección de Turismo antes de publicar

- **Lugares nuevos (22).** Se armaron a partir de los recorridos y las notas
  de smt.gob.ar, pero en borrador. Hay que confirmar texto, horarios, costo,
  accesibilidad y dirección antes de publicarlos. Mientras tanto, las paradas
  de los circuitos se ven sin enlace.
- **Itinerarios por duración (3).** Son las ideas del apartado 8 del informe,
  en borrador. Hay que validar la secuencia y los tiempos.
- **Domicilio de la oficina.** El área publica "Congreso y Crisóstomo
  Álvarez", la nota del bus dice "Congreso 101" y la ficha "Congreso 171". Se
  usó el del área.
- **Circuitos del bus.** El sitio del Bus Turístico tiene más propuestas que
  los tres circuitos cargados; hay que conciliarlos.
- **Horario del circuito a pie (09:30).** Sale de una nota municipal: figura
  como "a confirmar".
- **Distancias de las escapadas.** Son aproximadas.
- **Dónde dormir.** Falta definir la fuente oficial de alojamientos (borrador).
- **Agenda.** No hay eventos con fecha confirmada cargados: la portada
  muestra el calendario anual y la agenda lo explica.
- **Formularios de contacto y newsletter.** Necesitan un backend que todavía no existe.
- **Idiomas.** No está implementado.
