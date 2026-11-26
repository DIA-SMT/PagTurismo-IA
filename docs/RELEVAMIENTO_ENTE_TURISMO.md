# Relevamiento del Ente Tucumán Turismo — 26/11/2026

Comparación de <https://www.tucumanturismo.gob.ar> (sitio del Ente Tucumán Turismo, el organismo provincial) con lo
que tiene el portal. Solo se tomó lo de **San Miguel de Tucumán**: el sitio cubre toda la provincia.

El sitio es una app Next.js exportada. Los artículos vienen dentro de cada página (`__NEXT_DATA__`) y los registros
(alojamientos, agencias, guías, autos, prestadores, eventos, colectivos) salen de una API pública de lectura en
`/api/v1/api/…` (`hoteles`, `agencias`, `autos`, `guias`, `prestadores`, `eventos`, `evento?id=`, `colectivos`,
`localidades`). Se leyeron el sitemap (1334 direcciones), las subsecciones de la capital, museos, gastronomía, peñas,
teatros y rutas temáticas, y los registros completos.

## Qué se trajo

Todo está en `datos/turismo/ente-tucuman-turismo.json` (70 fichas) y entra en **borrador**. En las fichas que ya
existen solo se completan campos vacíos y no se agregan fotos.

| Qué | Fichas nuevas | Fichas que se completan |
|---|---|---|
| Lugares para comer (guía «Bares y Restaurantes») | 16: Rosé, Florencia Rosello, Midgard, El Molino, La Pizzada, Positano, Oliver Brown, Sir Harris, La Marina, Los Naranjos, Kentucky, Leno, Grido, Filipo, Beans, Tótem | La Rural: servicios (El Portal, Mi Nueva Estancia e Il Postino ya tenían esos datos) |
| Peñas | 5: El Alto de la Lechuza, La 9, La Casa de Yamil, La Escondida, La Taba | El Cardón y Lo de la Paliza: teléfono, Instagram |
| Museos | 4: Arte Sacro, Folklórico Provincial, San Francisco, Iramain (con fotos del Ente) | 15 atractivos ya cargados: descripción, coordenadas, duración de la visita |
| Teatros | 5: Alberdi, Mercedes Sosa, Sala Orestes Caviglia, Sala Ross, General Manuel Belgrano | San Martín: dirección, teléfono, Instagram, descripción |
| Experiencias | 4: Luces y Sonidos de la Independencia, Bicilagos en el Lago San Miguel, Ruta del Art Nouveau, Ruta de la Fe en la Ciudad Histórica | — |
| Sabores | Empanadillas de dulce de cayote | — |
| Planificá | Alojamientos habilitados (los 35 del registro oficial, por categoría y estrellas), Agencias de viajes y alquiler de autos (11 agencias y 7 rentadoras, con enlaces a guías, prestadores y colectivos) | — |
| Agenda | 9 eventos de la capital: 7 espectáculos en el Teatro Mercedes Sosa y Lo de la Paliza, y una carrera | — |

Resuelve en parte tres pendientes de `ESTADO_INTEGRACION.md`: la guía de bares y peñas, los alojamientos (la fuente
oficial que esperaba «Dónde dormir») y las coordenadas de los atractivos (14 fichas, tomadas de los enlaces de
Google Maps del Ente, solo cuando el enlace apunta al mismo lugar).

## Lo que no se trajo

- **Guías de turismo** (41) y **prestadores de turismo activo** (46): son personas, con teléfono y correo
  personales. Quedan como enlace al registro del Ente.
- **Colectivos a otras localidades** (47 horarios): cambian seguido. Queda el enlace.
- **Cines y shoppings**: los shoppings están en Yerba Buena; los cines no son atractivos turísticos.
- **Recetas** (empanada, empanadillas): los sabores del portal no tienen campo para eso.
- Lo de fuera de la capital (Yerba Buena, Tafí del Valle, Raco…).

## Para decidir

1. **Fotos del Ente.** Se bajan para las fichas nuevas, con crédito «Ente Tucumán Turismo». Confirmar el permiso
   antes de publicarlas.
2. **El Ente se contradice o tiene errores:** el enlace de mapa del Museo Folklórico lleva al Museo Histórico
   Provincial (no se usó); el Teatro Mercedes Sosa figura en San Martín 479 y en San Martín 435; Garden Park
   aparece dos veces en el registro de alojamientos (mismo domicilio); la guía de bares es de junio de 2024.
3. **Rubros de los restaurantes.** La guía no dice qué es cada local: donde el nombre no lo aclara quedó «bar y
   restaurante». Revisar el tipo antes de publicar.
4. **Eventos comerciales.** Los del Ente son recitales con entrada. Decidir si van en la agenda del portal.
5. **«Dónde dormir»** (borrador vacío) y «Alojamientos habilitados»: quedarse con una.
6. **Alojamiento, agencias y alquiler de autos** (Agenda) y **Agencias de viajes y alquiler de autos** (Ente): las
   dos guías se solapan; la de la Agenda enlaza documentos de la Dirección de Turismo municipal.

## Cómo se carga

```bash
npm run cultura -- paginas --archivo datos/turismo/ente-tucuman-turismo.json --fotos             # prueba en seco
npm run cultura -- paginas --archivo datos/turismo/ente-tucuman-turismo.json --fotos --escribir
```

Correrlo después de `paginas` (Agenda): algunas fichas del Ente completan las que crea ese archivo. Es idempotente:
la segunda vez no cambia nada. Probado sobre una copia de la base local: 46 fichas nuevas, 19 completadas, 5 sin cambios, fotos de las 18 fichas
nuevas que las tienen, sin errores; la segunda corrida no cambió nada.
