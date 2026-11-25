/** Qué direcciones de /subidas/ se sirven: las del panel y las del importador, nunca rutas raras. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tipoDeSubida } from "../lib/subidas.ts";

describe("Subidas", () => {
  it("acepta las fotos del panel y las que copia el importador", () => {
    assert.equal(tipoDeSubida("lugares/3f2a9c1e-5b7d.jpg"), "jpg");
    assert.equal(tipoDeSubida("ilustraciones/ab12.webp"), "webp");
    assert.equal(tipoDeSubida("cultura/eventos-wordpress-8968/principal.jpg"), "jpg");
    assert.equal(tipoDeSubida("cultura/casa-de-la-cultura/galeria-2.jpg"), "jpg");
  });

  it("rechaza rutas que salen de la carpeta, archivos sueltos y otras extensiones", () => {
    for (const mala of ["../.env", "cultura/../../.env", "principal.jpg", "cultura/x/y/z/w.jpg", "cultura/X.jpg", "cultura/a.png", "cultura/a.jpg.php", "cultura//a.jpg", "/etc/passwd.jpg"]) {
      assert.equal(tipoDeSubida(mala), null, mala);
    }
  });
});
