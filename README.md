# Turismo San Miguel de Tucumán — portal

Portal de turismo de la Municipalidad de San Miguel de Tucumán: fichas de lugares,
experiencias, recorridos y eventos, un catálogo con filtros, una agenda por fecha y un
**panel de contenidos en `/admin`** para que la Dirección de Turismo cargue y publique sin
tocar código.

La especificación es el informe *Investigación Turismo SMT* (comparación con
[turismo.buenosaires.gob.ar](https://turismo.buenosaires.gob.ar/es)). El sitio usa la estética
del portal nuevo de smt.gob.ar ([DIA-SMT/Pagina-SMT-IA](https://github.com/DIA-SMT/Pagina-SMT-IA)).
El panel sigue el mismo esquema que el de la subasta del Cementerio del Oeste
([DIA-SMT/SubastaCementerio](https://github.com/DIA-SMT/SubastaCementerio)).

Stack: Next.js 16.3.5 · React 19.2.8 · App Router · TypeScript · CSS propio (sin Tailwind) ·
Supabase (Postgres, Auth y Storage) en producción · PGlite en local.

## 1. Probarlo en la computadora (modo local)

Requisitos: Node 22.18 o posterior. No hace falta Docker ni una cuenta de Supabase.

```bash
npm install
```

```bash
npm run dev
```

Abrir <http://localhost:3000> (si el puerto está ocupado, `npm run dev -- -p 3001`). Sin
variables de entorno, el portal arranca en **modo local**:

- Crea una base Postgres embebida (PGlite) en `.local/pgdata` con las mismas migraciones de
  `supabase/migrations/` y carga el contenido inicial de `supabase/semilla/`.
- El panel está en <http://localhost:3000/admin>. Usuario de prueba: **admin@ejemplo.test**,
  contraseña **turismo-local-2026** (`supabase/local/seed-local.sql`).
- Las fotos que se suben desde el panel se guardan en `.local/subidas/`.

Para volver a empezar con el contenido inicial:

```bash
npm run db:local:reiniciar
```

| Comando | Para qué |
|---|---|
| `npm run dev` | Sitio y panel en desarrollo. |
| `npm test` | Pruebas: base de datos y permisos, formularios, agenda, catálogo y contenido inicial. |
| `npm run typecheck` | Revisión de tipos. |
| `npm run validar` | Revisa el contenido inicial (`supabase/semilla`). |
| `npm run db:semilla` | Carga el contenido inicial en Supabase (ver 3). |
| `npm run build` | Compilación de producción. |

## 2. El panel (`/admin`)

| Pantalla | Para qué |
|---|---|
| Tablero | Publicadas y borradores, próximas fechas de la agenda, qué revisar y últimos cambios. |
| Lugares, Experiencias, Agenda, Recorridos, Planificá, Destacados, Sabores, Escapadas | Listado con búsqueda y filtro por estado; alta, edición y baja de cada ficha. |
| Temas y etiquetas | Los temas del catálogo «Qué hacer». Un tema en uso no se puede quitar. |
| Configuración | Textos de la portada, contacto, redes, teléfonos de emergencia, línea de tiempo. |
| Auditoría | Cada alta, cambio o baja, con fecha, persona y campos cambiados. No se puede modificar. |

Cómo funciona:

- **Borrador y publicado.** Una ficha en borrador no se ve en el sitio. Quien tiene sesión en
  el panel sí la ve en el sitio, marcada como borrador, para revisarla en contexto.
- **Los cambios se ven al instante**: el sitio lee la base en cada pedido.
- **Datos sin confirmar.** Un horario sin la casilla *Confirmado* se muestra con «Dato a
  confirmar». El costo sin dato dice «Consultar antes de ir». No hay «Abierto ahora».
- **Relaciones.** Las paradas de un recorrido, los lugares de una experiencia o el lugar de un
  evento se eligen de una lista. Una ficha que otra usa no se puede borrar.
- **Fechas** en hora de Tucumán. Una fecha cancelada se marca como cancelada: no se borra.
- **Reservas.** El sistema responsable es el del Bus Turístico. El panel no deja guardar un
  botón «Reservar» sin el enlace a ese sistema.
- **Fotos.** JPG, PNG o WebP de hasta 4 MB. Se corrigen la orientación y el tamaño y se les
  quitan los metadatos (ubicación GPS). Pide texto alternativo, crédito y permiso.

Protecciones (iguales a las de la subasta):

- Las políticas de la base (RLS) dejan escribir solo al equipo activo (`public.admins`). Cada
  página y cada acción del panel vuelve a verificar la sesión.
- Límite propio de intentos de ingreso: 5 en 15 minutos por correo o por conexión.
- La auditoría la escribe la base con un disparador; nadie puede editarla ni borrarla.

## 3. Puesta en producción (Supabase + Vercel)

1. **Crear el proyecto en Supabase.** En *SQL Editor*, ejecutar en orden los archivos de
   `supabase/migrations/`. Crean las tablas, los permisos, el bucket público `fotos` y los
   límites de ingreso.
2. **Variables en `.env.local`** (para cargar el contenido desde la computadora):

   | Variable | De dónde sale |
   |---|---|
   | `DATABASE_URL` | Supabase → *Connect* → *Transaction pooler* (puerto 6543), con la contraseña de la base. |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → *Project Settings* → *API*. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → *Project Settings* → *API* (clave `anon`). |
   | `SUPABASE_CA_CERT` | Opcional: certificado raíz de Supabase (PEM) para verificar la conexión. |
   | `SITIO_URL` | URL pública del sitio (Open Graph, sitemap). |
   | `MOSTRAR_BORRADORES` | `1` solo en un despliegue de vista previa, para que se vean los borradores sin sesión. |

3. **Cargar el contenido inicial:**

   ```bash
   npm run db:semilla
   ```

4. **Cuentas del equipo.** En Supabase → *Authentication* → *Users* → *Add user*, crear cada
   cuenta con correo y contraseña. Después, en *SQL Editor*:

   ```sql
   insert into public.admins (user_id, nombre)
   select id, 'Nombre y apellido' from auth.users where email = 'persona@smt.gob.ar';
   ```

   Para quitarle el acceso a alguien: `update public.admins set activo = false where user_id = …`.
5. **Vercel:** cargar las mismas variables en *Settings → Environment Variables* y desplegar.

## Rutas del sitio

| Ruta | Contenido |
|---|---|
| `/` | Portada: búsqueda, accesos, destacados, temas, agenda, recorridos, itinerarios, sabores, planificación, ayuda. Las anclas viejas (`#que-hacer`, `#agenda`, `#recorridos`, `#sabores`, `#antes-de-llegar`, `#contacto`, `#escapadas`) siguen funcionando. |
| `/descubri` | Imperdibles, itinerarios por tiempo, temas e historia. |
| `/que-hacer` | Catálogo con búsqueda, tema, tipo y gratuidad. Los filtros quedan en la URL. |
| `/que-hacer/[tema]` | Todo lo de un tema. |
| `/lugares/[slug]`, `/experiencias/[slug]`, `/recorridos/[slug]`, `/agenda/[slug]` | Fichas. |
| `/recorridos`, `/agenda`, `/planifica`, `/sabores`, `/escapadas` | Listados. |

## Dónde está cada cosa

| Archivo | Contenido |
|---|---|
| `supabase/migrations/` | Esquema de la base, permisos (RLS), auditoría, límites de ingreso, bucket de fotos. |
| `supabase/semilla/` | Contenido inicial en JSON (lo que había en la landing). Después de cargarlo, la fuente de verdad es la base. |
| `lib/datos.ts` | Lectura del contenido para el sitio. |
| `lib/admin/esquemas.ts` | Los campos de cada formulario del panel. |
| `lib/admin/limpiar.ts` | Revisión de lo que se guarda desde el panel. |
| `lib/validar.ts` | Avisos y errores del tablero (relaciones, fechas, revisiones vencidas). |
| `lib/fechas.ts` | Agenda en hora de Tucumán. |
| `app/(sitio)/` | El sitio público. |
| `app/admin/` | El panel. |
| `styles/admin.css` | Estilos del panel (paleta municipal de la subasta). |

## Para revisar con la Dirección de Turismo antes de publicar

- **Lugares nuevos (22).** Se armaron a partir de los recorridos y las notas de smt.gob.ar,
  pero en borrador. Hay que confirmar texto, horarios, costo, accesibilidad y dirección antes
  de publicarlos. Mientras tanto, las paradas de los circuitos se ven sin enlace.
- **Itinerarios por duración (3).** Son las ideas del apartado 8 del informe, en borrador.
- **Domicilio de la oficina.** El área publica «Congreso y Crisóstomo Álvarez», la nota del bus
  dice «Congreso 101» y la ficha «Congreso 171». Se usó el del área.
- **Circuitos del bus.** El sitio del Bus Turístico tiene más propuestas que los tres
  circuitos cargados; hay que conciliarlos.
- **Horario del circuito a pie (09:30).** Sale de una nota municipal: figura como «a confirmar».
- **Distancias de las escapadas.** Son aproximadas.
- **Dónde dormir.** Falta definir la fuente oficial de alojamientos (borrador).
- **Agenda.** No hay eventos con fecha confirmada: la portada muestra el calendario anual.
- **Formularios de contacto y newsletter, idiomas.** No están implementados.
