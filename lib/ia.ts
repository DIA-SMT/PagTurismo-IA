/**
 * Conversación con el modelo de IA del portal (OpenRouter, la misma cuenta del planificador y del bus). Solo
 * servidor: la clave nunca llega al navegador. Recibe `fetch` para poder probarse sin red.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_POR_DEFECTO = "google/gemini-2.5-flash";

export type MensajeModelo = { role: "system" | "user" | "assistant"; content: string };

export function iaConfigurada(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

/** Devuelve la respuesta del modelo, o null si no hay clave o no respondió bien. */
export async function conversar(
  mensajes: MensajeModelo[],
  opciones: { modelo?: string; maxTokens?: number; temperatura?: number; titulo?: string; fetch?: typeof fetch; env?: Record<string, string | undefined>; esperaMs?: number } = {},
): Promise<string | null> {
  const env = opciones.env ?? process.env;
  if (!env.OPENROUTER_API_KEY) return null;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), opciones.esperaMs ?? 45_000);
  try {
    const r = await (opciones.fetch ?? fetch)(OPENROUTER_URL, {
      method: "POST",
      signal: control.signal,
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": opciones.titulo ?? "Turismo SMT" },
      body: JSON.stringify({
        model: opciones.modelo ?? MODELO_POR_DEFECTO,
        messages: mensajes,
        temperature: opciones.temperatura ?? 0.3,
        max_tokens: opciones.maxTokens ?? 1200,
      }),
    });
    if (!r.ok) {
      console.error(`IA: el modelo respondió ${r.status}.`);
      return null;
    }
    const datos = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return datos.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("IA: el modelo no respondió.", e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(reloj);
  }
}
