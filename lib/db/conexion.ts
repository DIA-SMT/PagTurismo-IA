// Opciones de postgres.js para los scripts (migrar, semilla, cuentas, copiar). Sin "server-only".

/** ¿La base está en esta misma máquina? Entonces no hace falta TLS (la VPS municipal). */
export function esBaseLocal(cadena: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(cadena).hostname);
}

/** TLS obligatorio salvo contra la propia máquina; sin prepared statements (pooler de Supabase). */
export function opcionesScript(cadena: string) {
  return { ssl: esBaseLocal(cadena) ? (false as const) : ("require" as const), prepare: false, max: 1, onnotice: () => {} };
}
