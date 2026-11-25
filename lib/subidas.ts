/**
 * Qué direcciones de /subidas/ se sirven. Las fotos del panel son «carpeta/<hex>.jpg»; las que copia el
 * importador de la Agenda, «cultura/eventos-wordpress-8968/principal.jpg». Se aceptan solo letras minúsculas,
 * números y guiones, de dos a cuatro tramos y extensión .jpg o .webp: nunca «..», barras de más ni otra cosa.
 */
const VALIDA = /^[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}\/[a-z0-9-]+\.(jpg|webp)$/;

export function tipoDeSubida(relativa: string): "jpg" | "webp" | null {
  return (VALIDA.exec(relativa)?.[1] as "jpg" | "webp" | undefined) ?? null;
}
