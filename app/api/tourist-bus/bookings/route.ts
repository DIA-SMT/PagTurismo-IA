import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/buses/db'
import {
  toTouristBookingRpcParams,
  validateTouristBookingForm,
  type TouristBooking,
  type TouristBookingApiErrorCode,
  type TouristBookingFormData,
  type TouristDeparture,
  type TouristLanguage,
} from '@/lib/buses/tourist-bus'
import { isBookingEmailConfigured, sendTouristBookingConfirmationEmail } from '@/lib/buses/tourist-booking-email'
import { isBookingWhatsAppConfigured, sendTouristBookingConfirmationWhatsApp } from '@/lib/buses/tourist-whatsapp'
import { crearLimitador, yaPartio } from '@/lib/buses/reglas'
import { pgErrorCode, UNIQUE_VIOLATION } from '@/lib/buses/db'

// Portal unificado: límite de pedidos por conexión y por correo (antes no había ninguno).
const porIp = crearLimitador(10, 10 * 60 * 1000)
const porCorreo = crearLimitador(5, 60 * 60 * 1000)

function ipDe(request: NextRequest) {
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sin-ip'
}

export const runtime = 'nodejs'

const errorStatusByCode: Record<Exclude<TouristBookingApiErrorCode, 'VALIDATION' | 'SERVER'>, number> = {
  NOT_FOUND: 404,
  CANCELLED: 409,
  PAST: 409,
  NO_CAPACITY: 409,
  NO_BIKES: 409,
  INVALID_BIKES: 400,
  INVALID_PEOPLE_COUNT: 400,
  DUPLICATE: 409,
  RATE_LIMITED: 429,
}

function mapPayloadToFormData(payload: Record<string, unknown>): TouristBookingFormData {
  return {
    departureId: String(payload.departureId ?? ''),
    fullName: String(payload.fullName ?? ''),
    email: String(payload.email ?? ''),
    phone: String(payload.phone ?? ''),
    originCity: String(payload.originCity ?? ''),
    peopleCount: String(payload.peopleCount ?? ''),
    municipalBikes: String(payload.municipalBikes ?? '0'),
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'VALIDATION', error: 'Solicitud inválida.' }, { status: 400 })
  }

  const formData = mapPayloadToFormData(payload)
  const language: TouristLanguage = payload.language === 'en' ? 'en' : 'es'
  const fieldErrors = validateTouristBookingForm(formData, { bikesEnabled: true })

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { code: 'VALIDATION', error: 'Revisá los campos obligatorios.', fieldErrors },
      { status: 400 },
    )
  }

  if (!porIp(ipDe(request)) || !porCorreo(formData.email.trim().toLowerCase())) {
    return NextResponse.json({ code: 'RATE_LIMITED', error: 'Demasiados pedidos seguidos.' }, { status: 429 })
  }

  const sql = getSql()
  const params = toTouristBookingRpcParams(formData, language)

  // La base compara solo la fecha: una salida de hoy que ya partió seguía aceptando reservas.
  try {
    const [salida] = await sql<{ departure_date: string; departure_time: string }[]>`
      select departure_date, departure_time::text as departure_time from tourist_departures where id = ${params.p_departure_id}`
    if (salida && yaPartio(salida.departure_date, salida.departure_time)) {
      return NextResponse.json({ code: 'PAST', error: 'La salida ya partió.' }, { status: 409 })
    }
  } catch {
    return NextResponse.json({ code: 'SERVER', error: 'No se pudo registrar la reserva.' }, { status: 500 })
  }

  let data: unknown
  try {
    const [row] = await sql<{ result: unknown }[]>`
      select create_tourist_booking(
        p_departure_id => ${params.p_departure_id},
        p_full_name => ${params.p_full_name},
        p_email => ${params.p_email},
        p_phone => ${params.p_phone},
        p_origin_city => ${params.p_origin_city},
        p_people_count => ${params.p_people_count},
        p_language => ${params.p_language},
        p_municipal_bikes => ${params.p_municipal_bikes}
      ) as result
    `
    data = row?.result ?? null
  } catch (error) {
    // Índice antiduplicado (lib/buses/sql/mejoras/001): misma persona, misma salida, ya confirmada.
    if (pgErrorCode(error) === UNIQUE_VIOLATION) {
      return NextResponse.json({ code: 'DUPLICATE', error: 'Ya hay una reserva confirmada con ese correo en esta salida.' }, { status: 409 })
    }
    return NextResponse.json({ code: 'SERVER', error: 'No se pudo registrar la reserva.' }, { status: 500 })
  }

  const result = data as { ok: boolean; code?: TouristBookingApiErrorCode; remaining?: number; booking?: unknown } | null

  if (!result || typeof result.ok !== 'boolean') {
    return NextResponse.json({ code: 'SERVER', error: 'No se pudo registrar la reserva.' }, { status: 500 })
  }

  if (!result.ok) {
    const code = (result.code || 'SERVER') as TouristBookingApiErrorCode
    const status = code in errorStatusByCode ? errorStatusByCode[code as keyof typeof errorStatusByCode] : 500
    return NextResponse.json(
      { code, error: 'No se pudo registrar la reserva.', remaining: result.remaining ?? null },
      { status },
    )
  }

  // Avisos de confirmación (mail y WhatsApp): se intentan después de asegurar
  // la reserva y nunca la bloquean (si fallan o falta config, quedan en false).
  let emailSent = false
  let whatsappSent = false
  if ((isBookingEmailConfigured() || isBookingWhatsAppConfigured()) && result.booking) {
    const [departure] = await sql<TouristDeparture[]>`
      select * from tourist_departures where id = ${Number(formData.departureId)}
    `.catch((error) => {
      console.error('No se pudo leer la salida para los avisos de confirmación:', error)
      return [] as TouristDeparture[]
    })

    if (departure) {
      const input = {
        booking: result.booking as TouristBooking,
        departure,
      }
      ;[emailSent, whatsappSent] = await Promise.all([
        sendTouristBookingConfirmationEmail(input),
        sendTouristBookingConfirmationWhatsApp(input),
      ])
    }
  }

  return NextResponse.json(
    { data: { booking: result.booking, remaining: result.remaining ?? null, emailSent, whatsappSent } },
    { status: 201 },
  )
}
