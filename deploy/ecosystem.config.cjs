// pm2 del portal de turismo en la VPS. desplegar.sh lo copia a /srv/portalturismo/ecosystem.config.cjs.
//
// Sin "-H 127.0.0.1", igual que FerIA en la guía: con ese valor Next arma su dirección interna
// como 127.0.0.1 pero la del proxy (proxy.ts) como "localhost", las toma por sitios distintos y
// la reescritura de idiomas (/ → /es) se vuelve un reenvío externo que termina en un bucle 308.
// El puerto 3007 igual queda cerrado hacia afuera: el firewall (ufw) solo deja pasar 22, 80 y 443.
module.exports = {
  apps: [{
    name: "portalturismo",
    cwd: "/srv/portalturismo/actual",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3007",
    env: { NODE_ENV: "production" },
    max_memory_restart: "700M",
    error_file: "/srv/portalturismo/registros/error.log",
    out_file: "/srv/portalturismo/registros/salida.log",
  }],
};
