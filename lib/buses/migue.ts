import 'server-only'

import type { CircuitoMigue, SalidaMigue } from '@/lib/migue'
import { busesDisponible, getSql } from './db'
import { yaPartio } from './reglas'

/**
 * Circuitos activos y salidas de los próximos 14 días, con cupos, para /api/migue/contenido.
 * Solo columnas públicas y conteos: ninguna columna de personas.
 */
export async function datosDelBusParaMigue(): Promise<{ circuitos: CircuitoMigue[]; salidas: SalidaMigue[] } | null> {
  if (!busesDisponible()) return null
  try {
    const sql = getSql()
    const circuitos = await sql<CircuitoMigue[]>`
      select slug, name_es as nombre, modality as modalidad, schedule_es as horario, duration_es as duracion, summary_es as resumen
      from tourist_circuits where active order by sort_order, id`
    const salidas = await sql<SalidaMigue[]>`
      select d.circuit_slug as circuito, d.title as titulo, d.departure_date as fecha, d.departure_time::text as hora,
             d.capacity as cupo, d.meeting_point as punto, d.bike_stock as bicis,
             coalesce(sum(b.people_count) filter (where b.status = 'confirmed'), 0)::int as reservadas,
             coalesce(sum(b.municipal_bikes) filter (where b.status = 'confirmed'), 0)::int as "bicisReservadas"
      from tourist_departures d left join tourist_bookings b on b.departure_id = d.id
      where d.status = 'active'
        and d.departure_date between (now() at time zone 'America/Argentina/Tucuman')::date
                                 and (now() at time zone 'America/Argentina/Tucuman')::date + 14
      group by d.id order by d.departure_date, d.departure_time`
    return { circuitos, salidas: salidas.filter((s) => !yaPartio(s.fecha, s.hora)) }
  } catch (e) {
    console.error('Migue: no se pudo leer el Bus Turístico:', e instanceof Error ? e.message : e)
    return null
  }
}
