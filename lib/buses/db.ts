import 'server-only'
import net from 'node:net'
import path from 'node:path'
import postgres from 'postgres'

// Conexión a la base del Bus Turístico (la base `turismo` de la VPS, la misma que lee el bot de
// Migue). Portado de BotTurismo (src/lib/db.ts) sin cambiar los tipos que devuelve.
//
// Dónde se conecta (docs/ARQUITECTURA_UNIFICADA.md, decisión D2):
//  - BUSES_DATABASE_URL: la base real. Opcional BUSES_DB_ESQUEMA si un día se consolida en un
//    esquema de la base del portal (search_path).
//  - Sin BUSES_DATABASE_URL y sin DATABASE_URL (modo local del portal): una base PGlite propia en
//    .local/buses con el esquema real (lib/buses/local/preparar.ts), servida por un socket local.
//  - Si no, el módulo de buses no está configurado: busesDisponible() da false y las páginas lo dicen.
//
// Los tipos se leen con el mismo formato que devolvía Supabase, así el resto
// del código (y lo que llega al navegador) no cambia:
//   date        -> 'YYYY-MM-DD' (texto, sin pasar por Date ni zona horaria)
//   timestamptz -> ISO 8601 en UTC
//   bigint      -> number (los ids y los count(*) entran de sobra)

const urlReal = () => process.env.BUSES_DATABASE_URL || ''
const usaBaseLocal = () => !urlReal() && !process.env.DATABASE_URL

/** ¿Hay base de buses? En producción, solo con BUSES_DATABASE_URL. */
export function busesDisponible() {
  return !!urlReal() || usaBaseLocal()
}

export class BusesSinConfigurar extends Error {
  constructor() {
    super('El módulo de buses no está configurado (falta BUSES_DATABASE_URL).')
  }
}

const globalLocal = globalThis as unknown as { busesPuertoLocal?: Promise<number> }

/** Base PGlite local servida por socket: un solo proceso, una conexión. */
function puertoLocal(): Promise<number> {
  globalLocal.busesPuertoLocal ??= (async () => {
    const { crearBaseBuses } = await import('./local/preparar')
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
    const db = await crearBaseBuses({ carpeta: path.join(process.cwd(), '.local', 'buses') })
    const inicial = Number(process.env.BUSES_PUERTO_LOCAL) || 54330
    for (let puerto = inicial; puerto < inicial + 40; puerto++) {
      const servidor = new PGLiteSocketServer({ db, port: puerto, host: '127.0.0.1', maxConnections: 1 })
      try {
        await servidor.start()
        return puerto
      } catch {
        /* puerto ocupado (otra copia del servidor de desarrollo): probar el siguiente */
      }
    }
    throw new Error('No se pudo abrir la base local de buses.')
  })()
  return globalLocal.busesPuertoLocal
}

function createSql() {
  const local = usaBaseLocal()
  if (!local && !urlReal()) throw new BusesSinConfigurar()
  const esquema = process.env.BUSES_DB_ESQUEMA
  return postgres(local ? 'postgres://postgres@127.0.0.1/postgres' : urlReal(), {
    max: local ? 1 : 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: !local,
    onnotice: () => {},
    ...(local
      ? {
          socket: async () => {
            const puerto = await puertoLocal()
            return net.connect(puerto, '127.0.0.1')
          },
        }
      : {}),
    // Supabase corre en UTC: now()::date, current_date y los JSON que arma
    // la base (create_tourist_booking) dependen de esto.
    connection: { TimeZone: 'UTC', ...(esquema ? { search_path: esquema } : {}) },
    types: {
      bigint: {
        to: 20,
        from: [20],
        serialize: (value: number | bigint | string) => String(value),
        parse: (value: string) => Number(value),
      },
      date: {
        to: 1082,
        from: [1082],
        serialize: (value: string) => value,
        parse: (value: string) => value,
      },
      timestamptz: {
        to: 1184,
        from: [1184, 1114],
        serialize: (value: Date | string) => (value instanceof Date ? value.toISOString() : value),
        parse: (value: string) => new Date(value).toISOString(),
      },
    },
  })
}

export type Sql = ReturnType<typeof createSql>

// En desarrollo Next recarga los módulos: sin esto cada recarga abriría un
// pool nuevo hasta agotar las conexiones.
const globalForDb = globalThis as unknown as { turismoSql?: Sql }

export function getSql(): Sql {
  if (!globalForDb.turismoSql) globalForDb.turismoSql = createSql()
  return globalForDb.turismoSql
}

// Valores para INSERT o UPDATE a partir de un objeto:
//   sql`insert into faqs ${rowValues(sql, data)} returning *`
//   sql`update faqs set ${rowValues(sql, data)} where id = ${id} returning *`
// Los arrays y objetos van como JSON: todas las columnas de ese tipo son
// jsonb (postgres.js, sin esto, mandaría un array como array de Postgres).
// Los undefined se descartan; para vaciar una columna hay que pasar null.
// Con un array de objetos arma un INSERT de varias filas (mismas claves).
export function rowValues(sql: Sql, data: Record<string, unknown> | Record<string, unknown>[]) {
  const prepare = (row: Record<string, unknown>) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined) continue
      out[key] =
        value !== null && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)
          ? sql.json(value as postgres.JSONValue)
          : value
    }
    return out
  }

  if (Array.isArray(data)) {
    const rows = data.map(prepare)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sql(rows as any[])
  }
  const row = prepare(data)
  if (Object.keys(row).length === 0) throw new Error('rowValues: no hay columnas para escribir')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sql(row as any)
}

// Se queda sólo con las columnas permitidas que vinieron en el objeto. Para
// payloads que llegan del cliente: Supabase aceptaba cualquier columna; acá
// la lista es explícita.
export function pickColumns<T extends Record<string, unknown>>(data: T, allowed: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) out[key] = data[key]
  }
  return out
}

// Error de Postgres (postgres.js los tira con el código SQLSTATE en .code).
export function pgErrorCode(error: unknown): string | null {
  return error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : null
}

export const UNIQUE_VIOLATION = '23505'
