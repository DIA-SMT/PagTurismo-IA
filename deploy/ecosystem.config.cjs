// pm2 del portal de turismo en la VPS. Va copiado en /srv/portalturismo/ecosystem.config.cjs.
module.exports = {
  apps: [{
    name: "portalturismo",
    cwd: "/srv/portalturismo/actual",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3007 -H 127.0.0.1",
    env: { NODE_ENV: "production" },
    max_memory_restart: "700M",
    error_file: "/srv/portalturismo/registros/error.log",
    out_file: "/srv/portalturismo/registros/salida.log",
  }],
};
