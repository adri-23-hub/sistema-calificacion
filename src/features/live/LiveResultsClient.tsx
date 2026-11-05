"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLiveResults } from "./useLiveResults";
import type { LiveCandidateItem, LiveDanceItem, LiveResultsPayload } from "./types";
import styles from "./LiveResultsClient.module.css";

type RankedItem = LiveCandidateItem | LiveDanceItem;
const nameOf = (item: RankedItem) => "fullName" in item ? item.fullName : item.danceName;
const scoreOf = (item: RankedItem) => "totalScore" in item ? item.totalScore : item.finalScore;
const expectedVotes = (item: RankedItem) => item.juryCount * ("runways" in item ? item.runways.length : 1);
function Icon({ children }: { children: string }) { return <span className={styles.icon} aria-hidden="true">{children}</span>; }

export default function LiveResultsClient({ initialData }: { initialData: LiveResultsPayload }) {
  const { data, error, isRefreshing } = useLiveResults(initialData);
  const [selection, setSelection] = useState(initialData.moduleB.categories[0]?.id ?? "danzas");
  const category = data.moduleB.categories.find(c => c.id === selection) ?? data.moduleB.categories[0];
  const dances = selection === "danzas" || !category;
  const items: RankedItem[] = dances ? data.moduleA.items : category.items;
  const ranked = items.filter(i => i.rank !== null).sort((a,b) => a.rank! - b.rank!);
  const isFinal = dances ? data.moduleA.isFinal : data.moduleB.isFinal;
  const title = dances ? "Entrada Folklórica" : category.name;
  const votes = items.reduce((sum,i) => sum+i.votesCount,0);
  const expected = items.reduce((sum,i) => sum+expectedVotes(i),0);
  const percent = expected ? Math.min(100,Math.round(votes/expected*100)) : 0;
  const updated = new Date(data.updatedAt).toLocaleTimeString("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const [fullscreen, setFullscreen] = useState(false);
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setFullscreen(Boolean(document.fullscreenElement)); } catch { /* Optional browser capability. */ }
  }
  return <div className={styles.page}>
    <main className={styles.main}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>TRINIDAD · {data.edition.year} / {data.edition.venue}</p><h1>RESULTADOS {isFinal ? "FINALES" : "EN VIVO"} & PODIO</h1><p className={styles.intro}>Sigue las posiciones de <strong>{title} {data.edition.year}</strong> en la {data.edition.name}.<br /><span>{isFinal ? "Calificaciones cerradas · Resultados finales." : "Escrutinio en curso · Las posiciones pueden cambiar."}</span></p></div>
        <div className={styles.stats}><div><Icon>how_to_vote</Icon><p><small>VOTOS EMITIDOS</small><strong>{percent}% <span>({votes}/{expected})</span></strong></p></div><div><Icon>workspace_premium</Icon><p><small>MAYOR PUNTAJE ACTUAL</small><strong className={styles.gold}>{ranked[0] ? scoreOf(ranked[0]).toFixed(2) : "—"} <span>puntos</span></strong></p></div></div>
      </header>
      {error && <div role="alert" className={styles.error}>{error} · Mostrando la última actualización disponible.</div>}
      <div className={styles.tabs} aria-label="Seleccionar concurso">{data.moduleB.categories.map(c => <button key={c.id} type="button" aria-pressed={!dances && category.id === c.id} onClick={() => setSelection(c.id)}><Icon>{c.name.toLowerCase().includes("moperita") ? "local_florist" : "diamond"}</Icon><span>{c.name} {data.edition.year}<small>ELECCIÓN UNIVERSITARIA NACIONAL</small></span></button>)}<button type="button" aria-pressed={dances} onClick={() => setSelection("danzas")}><Icon>diversity_2</Icon><span>Entrada Folklórica<small>FRATERNIDADES UNIVERSITARIAS</small></span></button></div>
      <section className={styles.podium} aria-label={`Podio de ${title}`}>
        {ranked.length ? ranked.slice(0,3).map(item => <PodiumCard key={`${selection}-${item.id}`} item={item} final={isFinal} title={title} />) : <div className={styles.empty}><Icon>workspace_premium</Icon><h2>El podio está por comenzar</h2><p>Las posiciones aparecerán cuando se registren las primeras calificaciones de {title}.</p></div>}
      </section>
      <div className={styles.status}><span className={styles.live}><i /> {isFinal ? "RESULTADOS FINALES" : "RESULTADOS PRELIMINARES"}</span><span aria-live="polite">{isRefreshing ? "Actualizando…" : `Actualizado ${updated}`}</span><button onClick={toggleFullscreen} type="button"><Icon>fullscreen</Icon>{fullscreen ? "Salir" : "Pantalla completa"}</button></div>
      <section className={styles.classification}>
        <div className={styles.tableHeading}><div><p className={styles.eyebrow}>EL CERTAMEN, EN DIRECTO</p><h2>Clasificación general</h2></div><Link href="/resultados/detalle">Ver detalle completo <span aria-hidden="true">↗</span></Link></div>
        <div className={styles.tableScroll}><table><thead><tr><th>Puesto</th><th>{dances ? "Danza / Fraternidad" : "Candidata / Fraternidad"}</th><th>Votos</th><th>Puntaje</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.rank ? String(item.rank).padStart(2,"0") : "—"}</td><td><strong>{nameOf(item)}</strong><small>{item.fraternityName} · {item.university}</small></td><td>{item.votesCount}/{expectedVotes(item)}</td><td>{item.rank ? scoreOf(item).toFixed(2) : "—"}</td></tr>)}</tbody></table>{!items.length && <p className={styles.noItems}>No hay participantes registrados en este concurso.</p>}</div>
      </section>
      <footer className={styles.footer}><span>{data.edition.name} · {data.edition.year}</span><span>CUB · FUL-UABJB</span></footer>
    </main>
  </div>;
}

function PodiumCard({ item, final, title }: { item: RankedItem; final: boolean; title: string }) {
  const photo = "photoUrl" in item ? item.photoUrl : null;
  const [broken, setBroken] = useState(false);
  const first = item.rank === 1;
  const complete = expectedVotes(item) > 0 && item.votesCount >= expectedVotes(item);
  return <article className={`${styles.card} ${first ? styles.winner : item.rank === 2 ? styles.silver : styles.bronze}`}>
    <div className={styles.cardTop}><span><Icon>{first ? "crown" : "workspace_premium"}</Icon>{first ? "1ER LUGAR" : item.rank === 2 ? "SEGUNDO LUGAR" : "TERCER LUGAR"}{first && final ? " · CORONA OFICIAL" : ""}</span><Icon>{first ? "workspace_premium" : item.rank === 2 ? "looks_two" : "looks_3"}</Icon></div>
    <div className={styles.photo}>
      {photo && !broken ? <Image src={photo} alt={nameOf(item)} fill unoptimized sizes="(max-width: 600px) 90vw, 33vw" onError={() => setBroken(true)} /> : <div className={styles.placeholder}><Icon>{"fullName" in item ? "person" : "diversity_2"}</Icon><span>Fotografía por registrar</span></div>}
      {first && <span className={styles.photoTitle}><Icon>local_florist</Icon>{title}</span>}
      <div className={styles.photoCaption}><span>{item.university}</span><span><Icon>{complete ? "verified" : "schedule"}</Icon>{complete ? "Votos completos" : "En evaluación"}</span></div>
    </div>
    <h2>{nameOf(item)}</h2><p className={styles.fraternity}>{item.fraternityName}</p>
    <div className={styles.score}><span>{final ? "PUNTAJE DEFINITIVO" : "PUNTAJE ACTUAL"}<small>{item.votesCount}/{expectedVotes(item)} votos registrados</small></span><strong>{scoreOf(item).toFixed(2)}<small> pts</small></strong></div>
  </article>;
}
