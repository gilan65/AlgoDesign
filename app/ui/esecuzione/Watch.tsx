// Il watch: col puntatore sopra il nome di un dato in un blocco, durante l'esecuzione, un riquadro accanto al nome con
// il nome, il tipo della vista dei dati e il valore della riga corrente della tabella di traccia (per un vettore,
// quanti elementi e un elemento per riga; per una matrice, righe per colonne e la griglia; per un record, un campo per
// riga; per una tabella, quanti record e la griglia, un record per riga e un campo per colonna). I valori li dà il nucleo (`TabellaMostrata.watch`), mai ricalcolati qui.
// Si chiude quando il puntatore lascia il nome, o con Esc. Il riquadro non
// prende il puntatore: lasciarlo non serve.
//
// Un clic sul nome lo FERMA (per i vettori lunghi): il riquadro fermo resta dove è
// comparso anche quando il puntatore lascia il nome, prende il puntatore e scorre (l'intestazione resta in cima), e i
// valori seguono l'esecuzione; si chiude col ×, con Esc o con un altro clic sul nome. Né l'uno né l'altro coprono il
// nome: stanno sotto, o sopra se sotto c'è meno posto, alti al più quanto quel posto.
//
// Dalla tastiera: Maiusc+F9 su un blocco apre il riquadro fermo del primo nome del blocco, col fuoco dentro (le frecce lo
// scorrono); Maiusc+F9 nel riquadro passa al nome dopo, e quando il riquadro si chiude il fuoco torna al blocco.
//
// Dentro una procedura un parametro per riferimento È il dato di chi chiama (lo stesso valore): sotto il valore una riga
// dice quale, con le parole di chi monta il watch. Di una funzione con più chiamate in corso (la ricorsione), una riga
// dice di quale livello sono i valori.
//
// Sul nome di una funzione chiamata in un blocco, il valore che ha restituito nell'ultima azione di
// quel blocco che l'ha chiamata (`TabellaMostrata.chiamata`); chiamata più volte nella stessa azione, ogni valore col
// numero della chiamata; prima di una chiamata finita lì, una riga lo dice.
import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import type { ChiamataNelWatch, DatoNelWatch } from "../../core/esecuzione/traccia";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import stili from "./Watch.module.css";

/** Quanto il riquadro sta staccato dal nome, e dal bordo della finestra. */
const STACCO = 4;
/** Una funzione chiamata più volte nella stessa azione: tutti i valori, ognuno col numero della chiamata. */
const TUTTE_LE_CHIAMATE = true;

/** Dove sta il riquadro alto `altezza` (il suo contenuto): sotto il nome se ci sta; altrimenti dalla parte col posto
 * maggiore, alto al più quel posto. Sempre dentro la finestra, anche quando il nome ne è uscito (la finestra abbassata
 * col riquadro fermo aperto). */
export function postoDelRiquadro(
  nome: { left: number; top: number; bottom: number },
  riquadro: { larghezza: number; altezza: number },
  finestra: { larghezza: number; altezza: number },
): { left: number; top: number; maxHeight: number } {
  const sotto = Math.max(0, finestra.altezza - nome.bottom - 2 * STACCO);
  const sopra = Math.max(0, nome.top - 2 * STACCO);
  const left = Math.max(STACCO, Math.min(nome.left, finestra.larghezza - riquadro.larghezza - STACCO));
  const dentro = (top: number, maxHeight: number) => {
    const alto = Math.min(maxHeight, Math.max(0, finestra.altezza - 2 * STACCO));
    return { left, top: Math.max(STACCO, Math.min(top, finestra.altezza - STACCO - alto)), maxHeight: alto };
  };
  if (riquadro.altezza <= sotto || sotto >= sopra) return dentro(nome.bottom + STACCO, Math.min(riquadro.altezza, sotto));
  const altezza = Math.min(riquadro.altezza, sopra);
  return dentro(nome.top - STACCO - altezza, altezza);
}

/** Si ridisegna solo quando cambiano i suoi dati: il riquadro fermo durante «tutto insieme» resta all'ultima fermata, e la
 * finestra che si ridisegna a ogni fetta non lo rifà. */
export const Watch = memo(function Watch({
  dato,
  sotto,
  testi,
  fermo,
  riferimento,
  tastiera,
}: {
  dato: DatoNelWatch | ChiamataNelWatch;
  /** Per un parametro per riferimento: il dato di chi chiama, in parole. */
  riferimento?: string;
  /** Il nome nel disegno. */
  sotto: Element;
  testi: Dizionario;
  /** Il riquadro fermato dal clic sul nome, con chi lo chiude. */
  fermo?: { readonly chiudi: () => void };
  /** Il riquadro fermo aperto dalla tastiera: il blocco a cui torna il fuoco, e chi passa al nome dopo. */
  tastiera?: { readonly ritorno: SVGGElement; readonly prossimo: () => void };
}): ReactElement {
  const riquadro = useRef<HTMLDivElement>(null);
  const idDellAiuto = useId();
  const [posto, setPosto] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  // Dalla tastiera il fuoco entra nel riquadro quando ha il suo posto (prima è nascosto, e un elemento nascosto non prende
  // il fuoco: misurato in Chromium); alla chiusura torna al blocco, se non è andato altrove (il riquadro tolto lo lascia al
  // documento).
  const ritorno = tastiera?.ritorno;
  const aPosto = posto !== null;
  useEffect(() => {
    if (ritorno && aPosto) riquadro.current?.focus({ preventScroll: true });
  }, [ritorno, aPosto]);
  useEffect(() => {
    if (!ritorno) return;
    return () => {
      const qui = document.activeElement;
      if ((qui === null || qui === document.body || riquadro.current?.contains(qui)) && ritorno.isConnected) ritorno.focus({ preventScroll: true });
    };
  }, [ritorno]);
  // Accanto al nome, dentro la finestra. L'altezza è quella del contenuto (non quella già limitata dal posto di prima),
  // al più quella del foglio di stile. Fermo, il riquadro si mette a posto una volta sola: resta dov'è comparso, finché la
  // finestra non cambia misura (in una finestra più bassa il suo fondo ne uscirebbe).
  const datoDelPosto = fermo ? null : dato;
  const [misure, setMisure] = useState(0);
  useEffect(() => {
    const ridimensiona = () => setMisure((n) => n + 1);
    window.addEventListener("resize", ridimensiona);
    return () => window.removeEventListener("resize", ridimensiona);
  }, []);
  useLayoutEffect(() => {
    const el = riquadro.current;
    if (!el) return;
    const r = sotto.getBoundingClientRect();
    const w = el.getBoundingClientRect();
    const massima = parseFloat(getComputedStyle(el).getPropertyValue("--altezza-massima")) || Infinity;
    const bordi = el.offsetHeight - el.clientHeight;
    setPosto(postoDelRiquadro(r, { larghezza: w.width, altezza: Math.min(el.scrollHeight + bordi, (massima * window.innerHeight) / 100) }, { larghezza: window.innerWidth, altezza: window.innerHeight }));
  }, [sotto, datoDelPosto, misure]);
  const valore = (c: DatoNelWatch["elementi"][number]["cella"]) => (
    <>
      <span className={c.nonInizializzata ? stili.senzaValore : stili.valore} data-watch-valore="" data-non-inizializzata={c.nonInizializzata ? "" : undefined} data-modificata={c.modificata ? "" : undefined}>
        {c.testo}
      </span>
      {c.era !== undefined && (
        <small className={stili.era} data-watch-era="">
          {` (${c.era})`}
        </small>
      )}
    </>
  );
  /** Gli elementi di un vettore, o i campi di un record, uno per riga; di una matrice (`colonne`) la griglia, una riga
   * della tabella per riga della matrice, coi numeri delle colonne in cima e quelli delle righe a sinistra; di una tabella
   * la griglia, un record per riga coi nomi dei campi in cima. */
  const elementi = (es: DatoNelWatch["elementi"]) =>
    dato.colonne !== undefined ? (
      griglia(es, dato.colonne)
    ) : campi !== undefined ? (
      griglia(es, campi.length, campi)
    ) : (
      <table className={stili.elementi}>
        <tbody>
          {es.map((e) => (
            <tr key={e.nome} data-watch-elemento="">
              <td className={stili.indice} data-watch-indice="">
                {e.nome}
              </td>
              <td>{valore(e.cella)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  /** La griglia di una matrice (le colonne coi loro numeri) o di una tabella (`nomi`: le colonne sono i campi, coi loro
   * nomi; i valori allineati all'inizio, perché un record mescola testi e numeri). */
  const griglia = (es: DatoNelWatch["elementi"], colonne: number, nomi?: readonly string[]) => (
    <table className={`${stili.elementi} ${stili.griglia}${nomi ? ` ${stili.deiRecord}` : ""}`} data-watch-griglia="">
      <thead>
        <tr>
          <td />
          {Array.from({ length: colonne }, (_, j) => (
            <th key={j} scope="col" className={stili.indice}>
              {nomi ? nomi[j] : `[${j}]`}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: Math.ceil(es.length / colonne) }, (_, i) => (
          <tr key={i} data-watch-riga="">
            <th scope="row" className={stili.indice}>{`[${i}]`}</th>
            {es.slice(i * colonne, (i + 1) * colonne).map((e) => (
              <td key={e.nome} data-watch-elemento="" title={e.nome}>
                {valore(e.cella)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  const quanti = "chiamate" in dato ? (dato.chiamate[0]?.length ?? 0) : dato.elementi.length;
  // Una tabella (un vettore di record): i nomi dei campi, letti dai nomi che il nucleo dà ai valori del primo record
  // (`t[0].nome`, o `[0].nome` per ciò che una funzione ha restituito).
  const primi = "chiamate" in dato ? (dato.chiamate[0] ?? []) : dato.elementi;
  const campi = dato.vettore && dato.record ? primi.flatMap((e) => (/^[^[]*\[0\]\./.test(e.nome) ? [e.nome.slice(e.nome.indexOf("].") + 2)] : [])) : undefined;
  const intestazione = (
    <div className={stili.intestazione}>
      <span>
        <span className={stili.nome} data-watch-nome="">
          {"chiamate" in dato ? riempi(testi.watchFunzione, { nome: dato.nome }) : dato.nome}
        </span>{" "}
        <span className={stili.tipo} data-watch-tipo="">
          {dato.tipo}
        </span>
        {dato.vettore && quanti > 0 && (
          <span className={stili.tipo}>
            {" · "}
            <span data-watch-elementi="">
              {dato.colonne !== undefined
                ? riempi(testi.watchMatrice, { righe: String(Math.ceil(quanti / dato.colonne)), colonne: String(dato.colonne) })
                : campi !== undefined && campi.length > 0
                  ? riempi(testi.watchTabella, { n: String(Math.ceil(quanti / campi.length)) })
                  : quanti === 1
                    ? testi.watchElemento
                    : riempi(testi.watchElementi, { n: String(quanti) })}
            </span>
          </span>
        )}
      </span>
      {fermo && (
        <button type="button" className={stili.chiudi} aria-label={testi.chiudiEsc} title={testi.chiudiEsc} onClick={fermo.chiudi}>
          ×
        </button>
      )}
    </div>
  );
  return (
    <div
      ref={riquadro}
      role={fermo ? "dialog" : "tooltip"}
      aria-label={fermo ? dato.nome : undefined}
      aria-describedby={tastiera ? idDellAiuto : undefined}
      tabIndex={tastiera ? -1 : undefined}
      onKeyDown={
        tastiera
          ? (e) => {
              if (e.key !== "F9" || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
              e.preventDefault();
              tastiera.prossimo();
            }
          : undefined
      }
      data-watch=""
      data-watch-fermo={fermo ? "" : undefined}
      className={fermo ? `${stili.watch} ${stili.fermo}` : stili.watch}
      style={posto ?? { visibility: "hidden" }}
    >
      {tastiera && (
        <span id={idDellAiuto} hidden>
          {testi.watchDaTastiera}
        </span>
      )}
      {intestazione}
      {"chiamate" in dato ? (
        dato.chiamate.length === 0 ? (
          <div className={stili.senzaValore} data-watch-non-chiamata="">
            {testi.watchNonChiamata}
          </div>
        ) : (
          (TUTTE_LE_CHIAMATE ? dato.chiamate : dato.chiamate.slice(-1)).map((es, k, tutte) => (
            <div key={k} data-watch-chiamata="">
              {tutte.length > 1 && <div className={stili.riferimento}>{riempi(testi.watchChiamataNumero, { n: String(k + 1) })}</div>}
              {dato.vettore || dato.record ? elementi(es) : <div>{valore(es[0]!.cella)}</div>}
            </div>
          ))
        )
      ) : dato.vettore || dato.record ? (
        elementi(dato.elementi)
      ) : (
        <div>{valore(dato.elementi[0]!.cella)}</div>
      )}
      {!("chiamate" in dato) && dato.livello !== undefined && (
        <div className={stili.riferimento} data-watch-livello="">
          {riempi(testi.watchLivello, { di: String(dato.livello.di), su: String(dato.livello.su) })}
        </div>
      )}
      {riferimento !== undefined && (
        <div className={stili.riferimento} data-watch-riferimento="">
          {riferimento}
        </div>
      )}
    </div>
  );
});
