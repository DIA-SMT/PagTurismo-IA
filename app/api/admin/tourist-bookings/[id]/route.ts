import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdminFromCookies } from '@/lib/buses/admin-auth'
import { getSql } from '@/lib/buses/db'
import type { TouristBooking, TouristDeparture } from '@/lib/buses/tourist-bus'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await getAuthenticatedAdminFromCookies('buses', 'borrar', 'PATCH /api/admin/tourist-bookings/[id]')
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await context.params
  const bookingId = Number(id)
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: 'Reserva inválida.' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const status = String(body.status || '')
  if (status !== 'confirmed' && status !== 'cancelled') {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  }

  const sql = getSql()
  const [currentBooking] = await sql<TouristBooking[]>`
    select * from tourist_bookings where id = ${bookingId}
  `.catch(() => [] as TouristBooking[])

  if (!currentBooking) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })
  }

  // Al reconfirmar una reserva cancelada hay que verificar que siga habiendo cupo y bicis. Portal
  // unificado: se hace con la salida bloqueada (como create_tourist_booking), en una transacción.
  let rechazo: string | null = null
  const [data] = await sql
    .begin(async (tx) => {
      if (status === 'confirmed' && currentBooking.status !== 'confirmed') {
        const [departure] = await tx<TouristDeparture[]>`select * from tourist_departures where id = ${currentBooking.departure_id} for update`
        if (!departure) {
          rechazo = 'No se pudo verificar el cupo de la salida.'
          return [] as TouristBooking[]
        }
        const [ocupacion] = await tx<{ personas: number; bicis: number }[]>`
          select coalesce(sum(people_count), 0)::int as personas, coalesce(sum(municipal_bikes), 0)::int as bicis
          from tourist_bookings where departure_id = ${currentBooking.departure_id} and status = 'confirmed'`
        if (ocupacion.personas + currentBooking.people_count > departure.capacity) {
          rechazo = 'No hay cupo suficiente para reconfirmar esta reserva.'
          return [] as TouristBooking[]
        }
        if (currentBooking.municipal_bikes > 0 && ocupacion.bicis + currentBooking.municipal_bikes > (departure.bike_stock ?? 0)) {
          rechazo = 'No quedan bicis municipales para reconfirmar esta reserva.'
          return [] as TouristBooking[]
        }
      }
      return tx<TouristBooking[]>`update tourist_bookings set status = ${status} where id = ${bookingId} returning *`
    })
    .catch((error) => {
      if (String((error as { code?: string })?.code) === '23505') rechazo = 'Esa persona ya tiene otra reserva confirmada en esta salida.'
      return [] as TouristBooking[]
    })

  if (rechazo) {
    return NextResponse.json({ error: rechazo }, { status: 409 })
  }

  if (!data) {
    return NextResponse.json({ error: 'No se pudo actualizar la reserva.' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
