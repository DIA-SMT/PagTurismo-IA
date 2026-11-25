import 'server-only'

import { busesDisponible, getSql } from './db'
import { yaPartio } from './reglas'

// Indicadores del módulo de buses y de Migue para el tablero del panel. Leen la base del Bus
// Turístico en el momento: si no responde, el tablero lo muestra como alerta de integración.

export type ProximaSalida = { id: number; titulo: string; fecha: string; hora: string; cupo: number; reservadas: number }

export type IndicadoresBuses =
  | { estado: 'sin-configurar' }
  | { estado: 'error'; mensaje: string }
  | {
      estado: 'ok'
      salidas7dias: number
      reservas7dias: number
      personas7dias: number
      lugaresLibres7dias: number
      casiCompletas: ProximaSalida[]
      proximas: ProximaSalida[]
      solicitudesPendientes: number
      booksVigentes: number
      consultasMigue7dias: number | null
      reservasUltimas24h: number
    }

export async function indicadoresBuses(): Promise<IndicadoresBuses> {
  if (!busesDisponible()) return { estado: 'sin-configurar' }
  try {
    const sql = getSql()
    const salidas = await sql<{ id: number; title: string; departure_date: string; departure_time: string; capacity: number; reservadas: number }[]>`
      select d.id, d.title, d.departure_date, d.departure_time::text as departure_time, d.capacity,
             coalesce(sum(b.people_count) filter (where b.status = 'confirmed'), 0)::int as reservadas
      from tourist_departures d left join tourist_bookings b on b.departure_id = d.id
      where d.status = 'active'
        and d.departure_date between (now() at time zone 'America/Argentina/Tucuman')::date
                                 and (now() at time zone 'America/Argentina/Tucuman')::date + 7
      group by d.id order by d.departure_date, d.departure_time`
    const vigentes = salidas.filter((s) => !yaPartio(s.departure_date, s.departure_time))
    const [{ reservas, ultimas }] = await sql<{ reservas: number; ultimas: number }[]>`
      select count(*) filter (where b.status = 'confirmed' and d.id = any(${vigentes.map((s) => s.id)}))::int as reservas,
             count(*) filter (where b.created_at > now() - interval '24 hours' and b.status = 'confirmed')::int as ultimas
      from tourist_bookings b join tourist_departures d on d.id = b.departure_id`
    const [{ pendientes }] = await sql<{ pendientes: number }[]>`
      select count(*)::int as pendientes from educational_bus_requests where status = 'pending'`
    const [{ books }] = await sql<{ books: number }[]>`select count(*)::int as books from photo_books where expires_at > now()`
    const consultas = await sql<{ n: number }[]>`
      select count(*)::int as n from tourist_interactions where created_at > now() - interval '7 days'`.catch(() => null)

    const aSalida = (s: (typeof salidas)[number]): ProximaSalida => ({
      id: s.id, titulo: s.title, fecha: s.departure_date, hora: s.departure_time.slice(0, 5), cupo: s.capacity, reservadas: s.reservadas,
    })
    return {
      estado: 'ok',
      salidas7dias: vigentes.length,
      reservas7dias: reservas,
      personas7dias: vigentes.reduce((t, s) => t + s.reservadas, 0),
      lugaresLibres7dias: vigentes.reduce((t, s) => t + Math.max(0, s.capacity - s.reservadas), 0),
      casiCompletas: vigentes.filter((s) => s.capacity - s.reservadas <= Math.max(2, s.capacity * 0.1)).map(aSalida),
      proximas: vigentes.slice(0, 6).map(aSalida),
      solicitudesPendientes: pendientes,
      booksVigentes: books,
      consultasMigue7dias: consultas ? consultas[0].n : null,
      reservasUltimas24h: ultimas,
    }
  } catch (e) {
    console.error('Indicadores de buses:', e instanceof Error ? e.message : e)
    return { estado: 'error', mensaje: 'La base del Bus Turístico no respondió.' }
  }
}
