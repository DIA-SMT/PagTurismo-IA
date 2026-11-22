import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta de los flujos críticos del portal unificado (e2e/).
 *
 *   npm run test:e2e            corre todo (levanta su propio servidor con una base aparte)
 *   npm run test:e2e -- --ui    modo interactivo
 *
 * El servidor de pruebas usa .local-e2e (scripts/e2e-servidor.ts): no toca la base de desarrollo
 * ni ninguna base real, y se rearma en cada corrida. Las pruebas modifican cupos y reservas, así
 * que corren en serie.
 */
const PUERTO = process.env.E2E_PUERTO || "3005";
const URL = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: URL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Tucuman",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    // En el celular solo lo público: el panel se prueba en escritorio.
    { name: "celular", use: { ...devices["Pixel 7"] }, grep: /@celular/ },
  ],
  webServer: {
    command: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e-servidor.ts",
    url: `${URL}/api/migue/contenido`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
