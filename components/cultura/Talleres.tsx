"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { formatear } from "@/lib/i18n/definir";
import type { talleres as textosTalleres } from "@/lib/i18n/textos/talleres";
import { DIAS_TALLER, DISCIPLINAS, filtrarTalleres, type Disciplina, type FiltrosTalleres, type Taller } from "@/lib/cultura/talleres";

type Textos = (typeof textosTalleres)["es"];
type Centro = { slug: string; nombre: string; ficha?: string };

/** Tono de cada disciplina (los cuatro tonos del portal). */
const TONO: Record<Disciplina, number> = { danza: 3, musica: 0, artes: 2, oficios: 1, bienestar: 1, letras: 0, teatro: 3, otros: 0 };

const leer = (p: URLSearchParams): FiltrosTalleres => ({
  q: p.get("q") ?? "",
  centro: p.get("centro") ?? "",
  dia: Number(p.get("dia")) || 0,
  disciplina: p.get("disciplina") ?? "",
  chicos: p.get("chicos") === "1",
});

/** Talleres con búsqueda y filtros por centro, día, disciplina y para chicos. Los filtros quedan en la URL. */
export function TalleresFiltrables({ talleres, centros, t }: { talleres: Taller[]; centros: Centro[]; t: Textos }) {
  const params = useSearchParams();
  const [f, setF] = useState<FiltrosTalleres>(() => leer(params));
  const id = useId();
  const nombre = useMemo(() => new Map(centros.map((k) => [k.slug, k])), [centros]);
  const lista = useMemo(() => filtrarTalleres(talleres, f, (c) => nombre.get(c)?.nombre ?? c), [talleres, f, nombre]);
  const disciplinas = DISCIPLINAS.filter((d) => talleres.some((x) => x.disciplina === d));
  const hayFiltros = !!(f.q || f.centro || f.dia || f.disciplina || f.chicos);
  const cambiar = (parcial: Partial<FiltrosTalleres>) => setF((x) => ({ ...x, ...parcial }));

  useEffect(() => {
    const s = new URLSearchParams();
    if (f.q) s.set("q", f.q);
    if (f.centro) s.set("centro", f.centro);
    if (f.dia) s.set("dia", String(f.dia));
    if (f.disciplina) s.set("disciplina", f.disciplina);
    if (f.chicos) s.set("chicos", "1");
    const texto = s.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${texto ? `?${texto}` : ""}`);
  }, [f]);

  return (
    <div className="talleres-filtrables">
      <div className="filtros talleres-filtros">
        <div className="filtros__campo filtros__buscador">
          <label htmlFor={`${id}-q`}>{t.buscar}</label>
          <div style={{ position: "relative" }}>
            <Icono nombre="buscar" tamano={18} />
            <input id={`${id}-q`} type="search" value={f.q} placeholder={t.buscarMarcador} onChange={(e) => cambiar({ q: e.target.value })} />
          </div>
        </div>
        <div className="filtros__campo">
          <label htmlFor={`${id}-centro`}>{t.centro}</label>
          <select id={`${id}-centro`} value={f.centro} onChange={(e) => cambiar({ centro: e.target.value })}>
            <option value="">{t.todos}</option>
            {centros.map((k) => <option key={k.slug} value={k.slug}>{k.nombre}</option>)}
          </select>
        </div>
        <div className="filtros__campo">
          <label htmlFor={`${id}-disciplina`}>{t.disciplina}</label>
          <select id={`${id}-disciplina`} value={f.disciplina} onChange={(e) => cambiar({ disciplina: e.target.value })}>
            <option value="">{t.todas}</option>
            {disciplinas.map((d) => <option key={d} value={d}>{t.disciplinas[d]}</option>)}
          </select>
        </div>
      </div>

      <div className="talleres-dias" role="group" aria-label={t.dia}>
        <button type="button" className="planificador__opcion" aria-pressed={!f.dia} onClick={() => cambiar({ dia: 0 })}>{t.cualquierDia}</button>
        {DIAS_TALLER.map((d) => (
          <button key={d} type="button" className="planificador__opcion" aria-pressed={f.dia === d} onClick={() => cambiar({ dia: f.dia === d ? 0 : d })}>
            {t.dias[d]}
          </button>
        ))}
      </div>
      <label className="filtros__check">
        <input type="checkbox" checked={f.chicos} onChange={(e) => cambiar({ chicos: e.target.checked })} />
        {t.chicos}
      </label>

      <p className="catalogo__estado" aria-live="polite">
        <span><strong>{lista.length === 1 ? t.unResultado : formatear(t.resultados, { n: lista.length })}</strong></span>
        {hayFiltros && (
          <button type="button" className="chip chip--limpiar" onClick={() => setF({ q: "", centro: "", dia: 0, disciplina: "", chicos: false })}>
            <Icono nombre="cerrar" tamano={14} /> {t.limpiar}
          </button>
        )}
      </p>

      {lista.length ? (
        <ul className="talleres-lista">
          {lista.map((x) => {
            const centro = nombre.get(x.centro);
            const horarios = f.dia ? x.horarios.filter((h) => h.dia === f.dia) : x.horarios;
            return (
              <li key={x.id} className="taller">
                <span className={`tono tono--${TONO[x.disciplina]}`}>{t.disciplinas[x.disciplina]}</span>
                <h2 className="taller__titulo">{x.titulo}</h2>
                {x.detalle && <p className="taller__detalle">{x.detalle}</p>}
                <ul className="taller__horarios">
                  {horarios.map((h, i) => (
                    <li key={i}>
                      <strong>{t.diasCortos[h.dia]}</strong> {h.desde}{h.hasta ? `–${h.hasta}` : ` (${t.horaAConfirmar})`}
                      {h.nota && <span className="taller__nota"> · {h.nota}</span>}
                    </li>
                  ))}
                </ul>
                <p className="taller__centro">
                  <Icono nombre="ubicacion" tamano={15} />
                  {centro?.ficha ? <Link href={centro.ficha}>{centro.nombre}</Link> : centro?.nombre ?? x.centro}
                </p>
                {x.profesor && <p className="taller__prof">{t.prof}: {x.profesor}</p>}
                {x.municipal && <span className="marca marca--exito taller__municipal">{t.municipal}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="vacio"><h2>{t.sinResultados}</h2></div>
      )}
    </div>
  );
}
