// Verificación de contraseñas scrypt importadas de Agenda Cultural (src/lib/auth/password.mjs de
// ese repo): formato `scrypt$N$r$p$<sal base64>$<hash base64>`, contraseña normalizada NFKC.
// Solo verifica: el portal guarda bcrypt y, tras un ingreso correcto, reemplaza el hash viejo.
// Sin "server-only" para poder probarla.
import crypto from "node:crypto";

export const esHashScrypt = (hash: string | null | undefined): hash is string => !!hash?.startsWith("scrypt$");

export function verificarScrypt(contrasena: string, hash: string): boolean {
  const partes = hash.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, sal, guardado] = partes;
  const N = Number(n), R = Number(r), P = Number(p);
  if (![N, R, P].every((x) => Number.isInteger(x) && x > 0) || N > 2 ** 20) return false;
  const esperado = Buffer.from(guardado, "base64");
  if (!esperado.length) return false;
  const calculado = crypto.scryptSync(contrasena.normalize("NFKC"), Buffer.from(sal, "base64"), esperado.length, {
    N, r: R, p: P, maxmem: 128 * N * R + 64 * 1024 * 1024,
  });
  return crypto.timingSafeEqual(calculado, esperado);
}
