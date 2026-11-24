"use client";

import "leaflet/dist/leaflet.css";

import type { Map as MapaLeaflet, CircleMarker, LayerGroup } from "leaflet";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Icono } from "./Iconos";
import { Vinculo as Link, useIdioma } from "@/components/i18n/Idioma";
import { localizarRuta } from "@/lib/i18n/config";
import { formatear } from "@/lib/i18n/definir";
import type { mapa as textosMapa } from "@/lib/i18n/textos/mapa";
import { puntosVisibles, type DatosMapa, type PuntoMapa } from "@/lib/mapa";

type Textos = (typeof textosMapa)["es"];
const CENTRO: [number, number] = [-26.8305, -65.2075];
const POR_PAGINA = 30;

/**
 * Mapa interactivo propio: capas del mapa municipal y del portal, búsqueda, y una lista accesible de lo que
 * se ve. Las capas encendidas y la búsqueda quedan en la URL (?capas=…&q=…); ?lugar=slug abre ese lugar.
 */
export function MapaInteractivo({ t, urlMunicipal }: { t: Textos; urlMunicipal: string }) {
  const idioma = useIdioma();
  const params = useSearchParams();
  const id = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const capa = useRef<LayerGroup | null>(null);
  const marcadores = useRef(new Map<string, CircleMarker>());
  const [listo, setListo] = useState(false);
  const [datos, setDatos] = useState<DatosMapa | null>(null);
  const [error, setError] = useState(false);
  const [encendidas, setEncendidas] = useState<Set<string> | null>(null);
  // La URL se lee una sola vez: después la actualiza este componente (y no debe volver a cargar los datos).
  const [inicial] = useState(() => ({ capas: params.get("capas"), lugar: params.get("lugar"), q: params.get("q") ?? "" }));
  const [q, setQ] = useState(inicial.q);
  const [limite, setLimite] = useState(POR_PAGINA);
  // En el celular la lista de capas arranca cerrada, para que el mapa quede a la vista.
  const [capasAbiertas, setCapasAbiertas] = useState(true);
  useEffect(() => setCapasAbiertas(window.matchMedia("(min-width: 56.01rem)").matches), []);

  // Los datos (municipales y del portal) llegan por /api/mapa.
  useEffect(() => {
    let vivo = true;
    fetch(`/api/mapa?idioma=${idioma}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: DatosMapa) => {
        if (!vivo) return;
        setDatos(d);
        const pedidas = inicial.capas?.split(",").filter((c) => d.capas.some((k) => k.id === c));
        setEncendidas(new Set(pedidas?.length ? pedidas : d.capas.filter((k) => k.porDefecto).map((k) => k.id)));
      })
      .catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [idioma, inicial]);

  // El mapa base (Leaflet se carga solo en el navegador).
  useEffect(() => {
    let vivo = true;
    import("leaflet").then(({ default: L }) => {
      if (!vivo || !contenedor.current || mapa.current) return;
      const m = L.map(contenedor.current, { zoomControl: true, scrollWheelZoom: false }).setView(CENTRO, 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.on("focus", () => m.scrollWheelZoom.enable());
      m.on("blur", () => m.scrollWheelZoom.disable());
      capa.current = L.layerGroup().addTo(m);
      mapa.current = m;
      setListo(true);
    });
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  const colores = useMemo(() => new Map((datos?.capas ?? []).map((k) => [k.id, k])), [datos]);
  const visibles = useMemo(() => (datos && encendidas ? puntosVisibles(datos, encendidas, q) : []), [datos, encendidas, q]);

  // Los marcadores de lo visible; el globo se arma con texto, nunca con HTML de los datos.
  useEffect(() => {
    if (!listo || !capa.current) return;
    import("leaflet").then(({ default: L }) => {
      capa.current!.clearLayers();
      marcadores.current.clear();
      for (const p of visibles) {
        const k = colores.get(p.capa);
        const marcador = L.circleMarker([p.lat, p.lng], {
          radius: p.capa.startsWith("p-") ? 9 : 7, color: "#ffffff", weight: 2, fillColor: k?.color ?? "#1878d6", fillOpacity: 0.95,
        }).bindPopup(() => globo(p, k?.nombre ?? "", t, idioma), { maxWidth: 280 });
        marcador.bindTooltip(p.nombre, { direction: "top", offset: [0, -6] });
        capa.current!.addLayer(marcador);
        marcadores.current.set(p.id, marcador);
      }
    });
  }, [listo, visibles, colores, t, idioma]);

  // ?lugar=slug: centra el mapa en ese lugar del portal (o en el punto municipal que enlaza su ficha).
  useEffect(() => {
    const slug = inicial.lugar;
    if (!slug || !datos || !listo || !mapa.current) return;
    const p = datos.puntos.find((x) => x.id === `p-${slug}`) ?? datos.puntos.find((x) => x.ficha?.endsWith(`/${slug}`));
    if (!p) return;
    setEncendidas((e) => new Set([...(e ?? []), p.capa]));
    mapa.current.setView([p.lat, p.lng], 17);
    setTimeout(() => marcadores.current.get(p.id)?.openPopup(), 300);
  }, [datos, listo, inicial]);

  // Capas y búsqueda en la URL, sin recargar.
  useEffect(() => {
    if (!datos || !encendidas) return;
    const s = new URLSearchParams(window.location.search);
    const porDefecto = datos.capas.filter((k) => k.porDefecto).map((k) => k.id).sort().join(",");
    const ahora = [...encendidas].sort().join(",");
    if (ahora === porDefecto) s.delete("capas"); else s.set("capas", ahora);
    if (q) s.set("q", q); else s.delete("q");
    const texto = s.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${texto ? `?${texto}` : ""}`);
  }, [datos, encendidas, q]);

  const alternar = (capaId: string) =>
    setEncendidas((e) => { const n = new Set(e); if (n.has(capaId)) n.delete(capaId); else n.add(capaId); return n; });
  const verEnMapa = (p: PuntoMapa) => {
    mapa.current?.setView([p.lat, p.lng], 17);
    contenedor.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => marcadores.current.get(p.id)?.openPopup(), 300);
  };
  const grupos = useMemo(() => {
    const g = new Map<string, DatosMapa["capas"]>();
    for (const k of datos?.capas ?? []) g.set(k.grupo, [...(g.get(k.grupo) ?? []), k]);
    return [...g.entries()];
  }, [datos]);
  const cuenta = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of datos?.puntos ?? []) c.set(p.capa, (c.get(p.capa) ?? 0) + 1);
    return c;
  }, [datos]);
  const ordenados = useMemo(() => [...visibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), [visibles]);

  return (
    <div className="mapa-interactivo">
      <aside className="mapa-panel">
        <div className="filtros__campo filtros__buscador">
          <label htmlFor={`${id}-q`}>{t.buscar}</label>
          <div style={{ position: "relative" }}>
            <Icono nombre="buscar" tamano={18} />
            <input id={`${id}-q`} type="search" value={q} placeholder={t.buscarMarcador} onChange={(e) => { setQ(e.target.value); setLimite(POR_PAGINA); }} />
          </div>
        </div>
        <details className="mapa-capas" open={capasAbiertas} onToggle={(e) => setCapasAbiertas(e.currentTarget.open)}>
          <summary>{t.capasTitulo}</summary>
          <div className="mapa-capas__acciones">
            <button type="button" className="chip" onClick={() => setEncendidas(new Set(datos?.capas.map((k) => k.id)))}>{t.todas}</button>
            <button type="button" className="chip" onClick={() => setEncendidas(new Set())}>{t.ninguna}</button>
          </div>
          {grupos.map(([grupo, capas]) => (
            <fieldset key={grupo}>
              <legend>{grupo}</legend>
              {capas.map((k) => (
                <label key={k.id} className="mapa-capa">
                  <input type="checkbox" checked={!!encendidas?.has(k.id)} onChange={() => alternar(k.id)} />
                  <span className="mapa-capa__punto" style={{ background: k.color }} aria-hidden="true" />
                  <span>{k.nombre}</span>
                  <small>{cuenta.get(k.id) ?? 0}</small>
                </label>
              ))}
            </fieldset>
          ))}
        </details>
      </aside>

      <div className="mapa-principal">
        {datos && !datos.municipal && <p className="mapa-aviso" role="status">{t.sinMunicipal}</p>}
        {error && <p className="mapa-aviso" role="alert">{t.error}</p>}
        <div className="mapa-lienzo" ref={contenedor} role="region" aria-label={t.titulo} tabIndex={0}>
          {!datos && !error && <p className="mapa-cargando">{t.cargando}</p>}
        </div>
        <p className="mapa-fuente">
          {t.fuente} <a href={urlMunicipal} target="_blank" rel="noopener">{t.verMapaMunicipal} <Icono nombre="externo" tamano={14} /></a>
        </p>

        <section className="mapa-lista" aria-labelledby={`${id}-lista`}>
          <h2 id={`${id}-lista`}>
            {t.lista} <small aria-live="polite">{visibles.length === 1 ? t.unResultado : formatear(t.resultados, { n: visibles.length })}</small>
          </h2>
          {datos && !visibles.length && <p>{t.sinResultados}</p>}
          <ul>
            {ordenados.slice(0, limite).map((p) => (
              <li key={p.id}>
                <span className="mapa-capa__punto" style={{ background: colores.get(p.capa)?.color }} aria-hidden="true" />
                <span className="mapa-lista__texto">
                  <strong>{p.nombre}</strong>
                  <small>{colores.get(p.capa)?.nombre}</small>
                </span>
                <span className="mapa-lista__acciones">
                  <button type="button" className="chip" onClick={() => verEnMapa(p)}>{t.verEnMapa}</button>
                  {p.ficha && <Link className="chip" href={p.ficha}>{t.verFicha}</Link>}
                </span>
              </li>
            ))}
          </ul>
          {ordenados.length > limite && (
            <button type="button" className="boton boton--claro" onClick={() => setLimite((n) => n + POR_PAGINA)}>
              {t.mostrarMas} ({ordenados.length - limite})
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

/** El globo de un punto, armado con nodos de texto (los datos municipales nunca entran como HTML). */
function globo(p: PuntoMapa, nombreCapa: string, t: Textos, idioma: Parameters<typeof localizarRuta>[1]): HTMLElement {
  const div = document.createElement("div");
  div.className = "mapa-globo";
  const capa = document.createElement("small");
  capa.textContent = nombreCapa;
  const titulo = document.createElement("strong");
  titulo.textContent = p.nombre;
  div.append(capa, titulo);
  if (p.detalle) {
    const detalle = document.createElement("p");
    detalle.textContent = p.detalle;
    div.append(detalle);
  }
  const enlaces = document.createElement("span");
  enlaces.className = "mapa-globo__enlaces";
  const agregar = (texto: string, href: string, externo: boolean) => {
    const a = document.createElement("a");
    a.textContent = texto;
    a.href = href;
    if (externo) { a.target = "_blank"; a.rel = "noopener"; }
    enlaces.append(a);
  };
  if (p.ficha) agregar(t.verFicha, localizarRuta(p.ficha, idioma), false);
  if (p.url && !p.ficha) agregar(t.masInfo, p.url, true);
  agregar(t.comoLlegar, `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, true);
  div.append(enlaces);
  return div;
}
