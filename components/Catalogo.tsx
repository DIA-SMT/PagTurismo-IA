"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { Icono } from "./Iconos";
import { TarjetaItem } from "./Ui";
import { Vinculo, useTextos } from "@/components/i18n/Idioma";
import { FILTROS_VACIOS, aParametros, filtrarCatalogo, hayFiltros, leerFiltros, type Filtros } from "@/lib/buscar";
import type { ItemCatalogo } from "@/lib/tipos";

const TIPOS: Filtros["tipo"][] = ["", "lugar", "experiencia", "recorrido", "evento"];

/**
 * Catálogo "Qué hacer": texto, tema, tipo y gratuidad.
 *
 * La URL es la fuente de verdad. Cada cambio la reescribe con
 * history.replaceState (Next sincroniza useSearchParams con la API nativa),
 * así una búsqueda se comparte con un enlace y, al volver desde una ficha
 * con "atrás", los filtros siguen ahí.
 */
export function Catalogo({ items, categorias }: {
  items: ItemCatalogo[];
  categorias: { id: string; titulo: string }[];
}) {
  const { catalogo: t, comun } = useTextos();
  const textoTipo = (tipo: Filtros["tipo"]) => t.tipos[tipo || "todo"];
  const params = useSearchParams();
  const filtros = useMemo(() => leerFiltros(params), [params]);
  // El texto se edita localmente para no reescribir la URL en cada tecla.
  const [texto, setTexto] = useState(filtros.q);
  const ids = useId();

  useEffect(() => setTexto(filtros.q), [filtros.q]);

  // Aplica el texto tras una pausa corta al escribir.
  useEffect(() => {
    if (texto === filtros.q) return;
    const espera = setTimeout(() => aplicar({ ...filtros, q: texto }), 350);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function aplicar(f: Filtros) {
    window.history.replaceState(null, "", `${window.location.pathname}${aParametros(f)}`);
  }

  const nombres = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.titulo])), [categorias]);
  const resultados = useMemo(() => filtrarCatalogo(items, filtros, nombres), [items, filtros, nombres]);
  const activos = hayFiltros(filtros);

  const chips: { texto: string; quitar: Filtros }[] = [];
  if (filtros.q) chips.push({ texto: `“${filtros.q}”`, quitar: { ...filtros, q: "" } });
  if (filtros.categoria) chips.push({ texto: nombres[filtros.categoria] ?? filtros.categoria, quitar: { ...filtros, categoria: "" } });
  if (filtros.tipo) chips.push({ texto: textoTipo(filtros.tipo), quitar: { ...filtros, tipo: "" } });
  if (filtros.gratis) chips.push({ texto: comun.ui.gratis, quitar: { ...filtros, gratis: false } });

  return (
    <div className="catalogo">
      <form
        className="filtros"
        role="search"
        aria-label={t.buscarEnCatalogo}
        onSubmit={(e) => { e.preventDefault(); aplicar({ ...filtros, q: texto }); }}
      >
        <div className="filtros__campo filtros__campo--texto">
          <label htmlFor="buscar">{t.buscar}</label>
          <div className="filtros__buscador">
            <Icono nombre="buscar" tamano={20} />
            <input
              id="buscar"
              type="search"
              name="q"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="filtros__campo">
          <label htmlFor={`${ids}-tema`}>{t.tema}</label>
          <select id={`${ids}-tema`} name="categoria" value={filtros.categoria}
            onChange={(e) => aplicar({ ...filtros, q: texto, categoria: e.target.value })}>
            <option value="">{t.todosLosTemas}</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </div>

        <fieldset className="filtros__campo filtros__tipos">
          <legend>{t.mostrar}</legend>
          <div className="segmentado">
            {TIPOS.map((tipo) => (
              <label key={tipo || "todo"}>
                <input type="radio" name="tipo" value={tipo} checked={filtros.tipo === tipo}
                  onChange={() => aplicar({ ...filtros, q: texto, tipo })} />
                <span>{textoTipo(tipo)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="filtros__check">
          <input type="checkbox" name="gratis" value="1" checked={filtros.gratis}
            onChange={(e) => aplicar({ ...filtros, q: texto, gratis: e.target.checked })} />
          <span>{t.soloGratis}</span>
        </label>

        <button type="submit" className="visualmente-oculto">{t.buscar}</button>
      </form>

      <div className="catalogo__estado">
        <p aria-live="polite" aria-atomic="true">
          <strong>{resultados.length}</strong> {resultados.length === 1 ? t.resultado : t.resultados}
          {activos ? t.conEstosFiltros : ""}
        </p>
        {activos && (
          <ul className="chips" aria-label={t.filtrosActivos}>
            {chips.map((c) => (
              <li key={c.texto}>
                <button type="button" className="chip" onClick={() => aplicar(c.quitar)}>
                  {c.texto} <Icono nombre="cerrar" tamano={14} />
                  <span className="visualmente-oculto">{t.quitarFiltro}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="chip chip--limpiar" onClick={() => aplicar(FILTROS_VACIOS)}>
                {t.restablecer}
              </button>
            </li>
          </ul>
        )}
      </div>

      {resultados.length > 0 ? (
        <ul className="items" aria-label={t.listaResultados}>
          {resultados.map((i) => <li key={`${i.entidad}-${i.slug}`}><TarjetaItem item={i} /></li>)}
        </ul>
      ) : (
        <div className="vacio">
          <h2>{t.vacioTitulo}</h2>
          <p>{t.vacioTexto}</p>
          <div className="vacio__acciones">
            <button type="button" className="boton boton--primario" onClick={() => aplicar(FILTROS_VACIOS)}>{t.quitarTodos}</button>
            <Vinculo className="boton boton--claro" href="/agenda">{t.verAgenda}</Vinculo>
          </div>
        </div>
      )}
    </div>
  );
}
