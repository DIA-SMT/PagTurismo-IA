import 'server-only'

import { adminActual, type Admin } from '@/lib/admin/sesion'
import { consultar } from '@/lib/db'
import { puede, type Accion, type Modulo } from '@/lib/permisos'

// Reemplaza el login propio de BotTurismo (admin_profiles, admin_sessions, cookie
// smt_admin_session): el módulo de buses usa la sesión única del panel del portal y sus permisos por
// módulo. Conserva el nombre y la forma de lo que devolvía para no tocar las rutas de API portadas.
//
// Cada ruta dice qué módulo y qué acción pide (lo agregó la integración: ver
// docs/ESTADO_INTEGRACION.md). Las acciones que no son «ver» quedan en public.auditoria del portal
// con la persona y la operación (método y ruta).

export interface AdminProfile {
  id: string
  email: string | null
  role: 'admin'
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface AuthenticatedAdminUser {
  user: { id: string; email: string | null }
  profile: AdminProfile
  sessionId: string
  admin: Admin
}

async function auditar(admin: Admin, accion: Accion, operacion: string) {
  try {
    await consultar({ rol: 'servicio' }, 'select public.auditar_accion($1, $2, $3, $4, $5::text::jsonb)', [
      admin.id, accion, 'buses', operacion, JSON.stringify({ modulo: operacion.includes('/faqs') || operacion.includes('/interactions') ? 'migue' : 'buses' }),
    ])
  } catch (e) {
    // La auditoría no frena la operación, pero queda en el log del servidor.
    console.error('Auditoría de buses:', e instanceof Error ? e.message : e)
  }
}

/**
 * El integrante del equipo con sesión y permiso para `accion` en `modulo`, o null (las rutas
 * responden 401). `operacion` («POST /api/admin/tourist-departures») se registra en la auditoría.
 */
export async function getAuthenticatedAdminFromCookies(
  modulo: Modulo = 'buses',
  accion: Accion = 'ver',
  operacion?: string,
): Promise<AuthenticatedAdminUser | null> {
  const admin = await adminActual()
  if (!admin || !puede(admin, modulo, accion)) return null
  if (accion !== 'ver' && operacion) await auditar(admin, accion, operacion)
  const ahora = new Date().toISOString()
  return {
    user: { id: admin.id, email: admin.email },
    profile: { id: admin.id, email: admin.email, role: 'admin', must_change_password: false, created_at: ahora, updated_at: ahora },
    sessionId: '',
    admin,
  }
}
