// Il flowchart in SVG, disegnato dai numeri dell'impaginazione (`Disegno`): qui non si calcola nessuna
// posizione. Forme dai vertici (inizio e fine: un rettangolo con le estremità a semicerchio), testo per
// righe, una punta di misura fissa alla fine di ogni linea di flusso (anche verso un punto di unione),
// punti di unione come cerchi vuoti, etichette Vero e Falso colorate, la nota del commento senza punta.
// Colori e carattere dalle variabili del tema; dimensioni dalla geometria del tema.
//
// Gli attributi `data-*` servono alle prove nei motori (testo dentro la sua forma, contrasto).
//
// Senza modifiche (la pagina di prova dei disegni) il flowchart è un'immagine con un nome. Con le modifiche
// è un gruppo: il disegno resta nascosto ai lettori di schermo, e sopra c'è lo strato che si usa, costruito
// dalla struttura accessibile (l'albero) e posto coi numeri dell'impaginazione: un pulsante per blocco,
// sulla sua forma, e un pulsante per punto di inserimento, il «+». Le posizioni dei «+» sono quelle di
// `Disegno.punti` nel sistema del disegno, quindi la scala le porta con sé: nessuna si legge dal DOM.
//
// Un blocco si sposta trascinandolo su un «+»: il bersaglio si sceglie coi punti dell'impaginazione
// (`bersaglio.ts`); dello schermo si legge solo l'angolo del disegno, che porta con sé lo scorrimento.
// Mentre si sposta (col mouse, o dalla tastiera: lo decide chi monta il flowchart) i «+» si vedono tutti,
// quelli su cui il blocco non va sono spenti, il blocco col suo contenuto è velato, e una copia del blocco
// con tutto il suo contenuto (un `se` coi suoi rami, un ciclo col suo corpo) segue il puntatore. Nessuna
// animazione: la copia si sposta col puntatore, senza transizioni.
//
// Durante l'esecuzione il flowchart è in sola lettura (niente «+», niente trascinamento né campi; i blocchi si
// scelgono ancora, per i punti di interruzione). Il blocco prima del quale l'esecuzione è in pausa ha nel
// disegno il bordo arancione, l'interno giallo e la punta della linea che entra grande e arancione, e nello strato
// `aria-current="step"` (la fine, che non è una voce dello strato, ha allora un elemento suo). In pausa sulla ripresa
// dell'azione di un blocco, dopo il ritorno da una funzione chiamata nella sua espressione, l'azione è a metà: niente
// punta che entra, e il segno «↩» della riga della ripresa (come nella tabella) in basso a destra, fuori dal blocco.
// Un punto di interruzione è un pallino rosso a sinistra in alto (nel rombo, a destra della punta che entra), e il blocco ha il
// contorno rosso finché l'esecuzione non lo raggiunge: le posizioni in `segni.ts`. Agli
// ausili un blocco descrive i suoi errori e avvisi e il suo punto
// (`aria-describedby`).
//
// La fine di una funzione («Restituisce …») è una voce dello strato (`data-restituisce`): il doppio clic e Invio aprono il
// campo di ciò che restituisce; non si sceglie, non si trascina, non ha un punto di interruzione.
//
// I valori iniziali dei dati, sotto «Inizio», sono forme del disegno come le altre (`data-valore-iniziale` col nome del
// dato) e voci dello strato (`data-iniziale` con la riga del dato, `data-iniziale-di` col nome): si scelgono col clic e
// dalla tastiera, il doppio clic apre i loro campi, il tasto destro il loro menu come quello di un blocco; non si
// trascinano e non hanno un punto di interruzione. La voce
// prende la forma del disegno nello stesso ordine: voci e blocchi disegnati vengono tutti e due dai dati, nell'ordine
// della vista. In pausa prima di un valore iniziale il suo blocco ha i segni del blocco corrente, e la sua voce
// `aria-current`.
//
// Con un'esecuzione, i nomi dei dati nel testo dei blocchi sono elementi col loro dato (`data-watch-dato`), sopra le loro
// lettere: le posizioni le dà il nucleo (`core/disegno/nomi.ts`), il testo disegnato resta quello di sempre. Col
// puntatore sopra un nome questo si evidenzia, e chi monta il flowchart mostra il watch; un clic sul nome lo ferma.
//
// I cicli `per` e `per ogni`: il riquadro tratteggiato sotto tutto il resto (`data-riquadro` col ciclo), col fondo
// colorato se l'app lo chiede (un velo solo: il riquadro dentro un altro non ne aggiunge); l'intestazione sul bordo è la forma del ciclo (su un fondo che interrompe la linea), e nello
// strato la sua voce. I blocchi che il riquadro aggiunge (`data-fase`) si disegnano e basta: non sono voci e non hanno
// punti di interruzione (il pallino sta sull'intestazione); il doppio clic su uno di loro lo passa a chi monta il
// flowchart (`apriParte`), che nel «per» apre i campi del ciclo. In una pausa del ciclo il blocco corrente nel disegno è
// quello della fase dell'evento, se la forma del ciclo lo ha; altrimenti (il ciclo chiuso) l'intestazione. Nello strato
// `aria-current` resta sulla voce del ciclo. La copia di un vettore col suo nome ha lo stesso riquadro: compatta, la sua
// scritta sul bordo (`data-didascalia`) non è un blocco e si disegna e basta, il blocco è l'assegnazione dentro; espansa,
// è come un ciclo aperto.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MutableRefObject, type PointerEvent, type ReactElement } from "react";
import type { Disegno, Elemento, Forma, PuntoDiInserimento, Rettangolo } from "../../core/disegno/impaginazione";
import type { FaseDelCiclo } from "../../core/interprete/interprete";
import type { NomeNelDisegno } from "../../core/disegno/nomi";
import { geometriaPredefinita, type GeometriaDelTema } from "../../core/disegno/tema";
import type { Posto } from "../../core/modifica/operazioni";
import { chiaveDelPosto, type Voce } from "./accessibile";
import { bersaglio, latoDellArea, nelDisegno, type Bersaglio, type Coordinate, type Copia } from "./bersaglio";
import stili from "./Flowchart.module.css";
import { bollino, pallino, punta as puntaCorrente, RAGGIO_DEL_BOLLINO, RAGGIO_DEL_PALLINO, ripresa as segnoDellaRipresa, segniDelDisegno } from "../../core/disegno/segni";

/** Il «+»: raggio del cerchio disegnato, nel sistema del disegno (12 px di diametro al 100%). */
export const RAGGIO_DEL_PUNTO = 6;
/** Di quanti pixel dello schermo si muove il puntatore premuto su un blocco prima che sia un trascinamento
 * (sotto, è un clic che sceglie il blocco). */
export const SOGLIA_DEL_TRASCINAMENTO = 5;

/** Un blocco che si sta spostando (con i blocchi vicini fino all'`ancora`, se c'è): su quali «+» non va, quali blocchi si
 * portano con lui, e la copia dei blocchi col loro contenuto che segue il puntatore. */
export interface Spostamento {
  readonly id: string;
  readonly ancora?: string;
  readonly escluso: (posto: Posto) => boolean;
  readonly dentro: ReadonlySet<string>;
  readonly copia: Copia | null;
}

/** Ciò che serve al flowchart per farsi modificare: la struttura e chi risponde ai gesti. */
export interface Interazione {
  readonly struttura: Voce;
  /** I blocchi scelti: uno, o più blocchi vicini. */
  readonly selezionati: ReadonlySet<string>;
  /** Con più blocchi scelti e l'opzione dell'app, il riquadro tratteggiato intorno a loro (nel sistema del disegno). */
  readonly riquadroDellaScelta?: Rettangolo | null;
  /** Il clic su un blocco (con `allarga`, Maiusc+clic: la scelta si allarga fino a lui) e il fuoco che arriva su un blocco
   * fuori dalla scelta. */
  readonly scegli: (id: string, allarga?: boolean) => void;
  /** Un punto attivato col clic, Invio o Spazio: `elemento` è il «+», a cui si aggancia l'elenco. */
  readonly attiva: (posto: Posto, elemento: SVGGElement) => void;
  /** Lo spostamento che comincia su quel blocco (coi blocchi scelti con lui). */
  readonly perSpostare: (id: string) => Spostamento;
  /** I blocchi trascinati e rilasciati sul «+» di quel posto: lo spostamento cominciato, coi suoi capi. */
  readonly sposta: (id: string, posto: Posto, ancora: string | null) => void;
  /** Lo spostamento cominciato dalla tastiera, se c'è. */
  readonly spostando: Spostamento | null;
  /** Il doppio clic su un blocco: apre i suoi campi. */
  readonly apri: (id: string) => void;
  /** Il doppio clic su un blocco che il riquadro di un ciclo aggiunge: l'`id` del ciclo. */
  readonly apriParte?: ((id: string) => void) | undefined;
  /** Il tasto destro su un blocco, o sul blocco di un valore iniziale (`valore`, la chiave della riga del dato): il suo
   * menu, nel punto del clic (senza, il tasto destro non fa nulla). */
  readonly menu?: ((chi: { readonly id: string } | { readonly valore: string }, x: number, y: number) => void) | undefined;
  /** Il valore iniziale scelto (la chiave della riga del suo dato), la scelta e il doppio clic. */
  readonly valoreScelto?: string | null;
  readonly scegliValore?: (chiave: string) => void;
  readonly apriValore?: (chiave: string) => void;
  /** Il doppio clic sulla fine di una funzione: apre il campo di ciò che restituisce. */
  readonly apriRestituisce?: (() => void) | undefined;
  /** I blocchi con un errore o un avviso (del controllo statico, o l'errore che ha fermato l'esecuzione),
   * segnati nel disegno. */
  readonly segnati: ReadonlyMap<string, "errore" | "avviso">;
  /** Ciò che gli ausili leggono di un blocco oltre al nome: i suoi errori e avvisi, il punto di interruzione. */
  readonly descrizioni?: ReadonlyMap<string, string>;
  /** Durante l'esecuzione: niente «+», niente trascinamento né campi; i blocchi si scelgono ancora. */
  readonly solaLettura?: boolean;
  /** Il blocco (o la fine, o «Inizio») prima del quale l'esecuzione è in pausa. */
  readonly corrente?: string | null;
  /** In un ciclo `per` o `per ogni`, la parte dell'evento della pausa. */
  readonly faseCorrente?: FaseDelCiclo | null;
  /** Nella copia di un record col suo nome, la posizione del campo della pausa. */
  readonly campoCorrente?: number | null;
  /** La pausa è sulla ripresa dell'azione del blocco corrente, dopo il ritorno da una funzione chiamata nella sua
   * espressione: l'azione è a metà, non deve ancora cominciare. */
  readonly ripresa?: boolean;
  /** Il dato prima del cui valore iniziale l'esecuzione è in pausa, se il suo blocco si vede. */
  readonly correnteValore?: string | null;
  /** I blocchi (e le fini) coi punti di interruzione. */
  readonly interruzioni?: ReadonlySet<string>;
  /** Con un'esecuzione: i nomi dei dati nei blocchi, per blocco, e chi riceve il nome sotto il puntatore (`null`
   * quando il puntatore lo lascia). */
  readonly nomi?: ReadonlyMap<string, readonly NomeNelDisegno[]>;
  /** Con un'esecuzione: i nomi dei dati nei blocchi dei valori iniziali, per nome del dato. */
  readonly nomiDeiValori?: ReadonlyMap<string, readonly NomeNelDisegno[]>;
  readonly punta?: (nome: NomePuntato | null) => void;
  /** Con un'esecuzione: chi riceve il nome cliccato (il clic ferma il watch, e non sceglie il blocco). */
  readonly ferma?: (nome: NomePuntato) => void;
}

/** Il nome sotto il puntatore o cliccato: un dato, o una funzione chiamata nel blocco `chiamataIn`. */
export interface NomePuntato {
  readonly dato: string;
  readonly elemento: SVGGElement;
  readonly chiamataIn?: string;
}

/** Il blocco su cui è stato premuto il puntatore, coi pixel dello schermo; `maiusc`: premuto con Maiusc (il fuoco che
 * arriva non cambia la scelta: la allarga il clic). */
interface Presa {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly pointerId: number;
  readonly maiusc: boolean;
}

/** Il trascinamento in corso: dove il puntatore l'ha cominciato e dov'è, nel sistema del disegno. */
interface Trascinamento {
  readonly spostamento: Spostamento;
  readonly inizio: Coordinate;
  readonly puntatore: Coordinate;
  readonly bersaglio: Bersaglio | null;
  readonly pointerId: number;
}

/** La classe della forma, cioè il colore del suo genere; il rombo di un ciclo ha quello dei cicli. */
const classeDellaForma: Record<Forma, string | undefined> = {
  inizio: stili.inizioEFine,
  fine: stili.inizioEFine,
  assegnazione: stili.assegnazione,
  lettura: stili.lettura,
  scrittura: stili.scrittura,
  condizione: stili.se,
  commento: stili.commento,
  intestazione: stili.intestazione,
  chiamata: stili.procedura,
};

const punti = (ps: readonly { x: number; y: number }[]) => ps.map((p) => `${p.x},${p.y}`).join(" ");

function Contorno({ e }: { e: Elemento }): ReactElement {
  const classe = e.ciclo === true ? stili.cicli : classeDellaForma[e.forma];
  if (e.forma === "inizio" || e.forma === "fine") {
    const { x, y, larghezza, altezza } = e.riquadro;
    return <rect className={classe} x={x} y={y} width={larghezza} height={altezza} rx={altezza / 2} ry={altezza / 2} />;
  }
  return <polygon className={classe} points={punti(e.vertici)} />;
}

/** La forma di un elemento col suo testo; un testo a pezzi con uno stile ha un `tspan` per pezzo. Le righe ai lati del
 * blocco della chiamata dopo il testo: il contorno resta il primo figlio (le prove nei motori lo leggono lì). */
function FormaColTesto({ e, tema }: { e: Elemento; tema: GeometriaDelTema }): ReactElement {
  const t = e.riquadroTesto;
  const x = t.x + t.larghezza / 2;
  const classeDelPezzo = { grassetto: stili.grassetto, corsivo: stili.corsivo };
  return (
    <>
      <Contorno e={e} />
      <text className={stili.testo} data-testo="">
        {e.righe.map((riga, i) => (
          <tspan key={i} x={x} y={t.y + tema.altezzaRiga * (i + 0.5)}>
            {e.pezzi?.[i]?.map((p, k) => (
              <tspan key={k} className={p.stile === undefined ? undefined : classeDelPezzo[p.stile]} data-stile={p.stile}>
                {p.testo}
              </tspan>
            )) ?? riga}
          </tspan>
        ))}
      </text>
      {e.lati?.map(([a, b], i) => <line key={i} className={stili.latoDellaChiamata} data-lato="" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
    </>
  );
}

/** Invio e Spazio su un elemento con il ruolo di pulsante fanno ciò che fa il clic. */
function comeUnClic(azione: () => void) {
  return (evento: KeyboardEvent) => {
    if (evento.key !== "Enter" && evento.key !== " ") return;
    evento.preventDefault();
    azione();
  };
}

/** Le classi di un elemento: quelle date, senza le assenti. */
const classi = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** I nomi dei dati nel testo di una voce, sopra le loro lettere: col puntatore sopra, chi monta il flowchart mostra il
 * watch. */
function Nomi({ nomi, interazione, blocco }: { nomi: readonly NomeNelDisegno[] | undefined; interazione: Interazione; blocco?: string }): ReactElement {
  return (
    <>
      {nomi?.map((n, i) => {
        const { x, y, larghezza, altezza } = n.riquadro;
        const chiamata = n.chiamata && blocco !== undefined ? { chiamataIn: blocco } : {};
        return (
          <g
            key={i}
            className={stili.nome}
            data-watch-dato={n.chiamata ? undefined : n.dato}
            data-watch-funzione={n.chiamata ? n.dato : undefined}
            onPointerOver={(ev) => interazione.punta?.({ dato: n.dato, elemento: ev.currentTarget, ...chiamata })}
            onPointerOut={() => interazione.punta?.(null)}
            // Il clic sul nome è del watch; durante l'esecuzione solo suo (il blocco non prende il fuoco né la scelta), a
            // corsa finita il blocco li prende anche lui: il progetto si modifica di nuovo, e un blocco si sceglie per
            // copiarlo o cancellarlo dove capita il clic.
            onMouseDown={interazione.ferma && interazione.solaLettura ? (ev) => ev.preventDefault() : undefined}
            onClick={
              interazione.ferma
                ? (ev) => {
                    if (interazione.solaLettura) ev.stopPropagation();
                    interazione.ferma?.({ dato: n.dato, elemento: ev.currentTarget, ...chiamata });
                  }
                : undefined
            }
          >
            <rect x={x} y={y} width={larghezza} height={altezza} />
            <line x1={x} y1={y + altezza} x2={x + larghezza} y2={y + altezza} />
          </g>
        );
      })}
    </>
  );
}

/** Le voci dei valori iniziali della struttura (in testa alla sequenza principale) appaiate coi loro blocchi nel
 * disegno, nello stesso ordine: una voce il cui blocco non porta il suo nome resta senza forma. */
function formeDeiValori(struttura: Voce, disegno: Disegno): ReadonlyMap<string, Elemento> {
  const voci = struttura.genere === "sequenza" ? struttura.voci.filter((v) => v.genere === "valore") : [];
  const disegnati = disegno.elementi.filter((e) => e.dato !== undefined);
  const fuori = new Map<string, Elemento>();
  voci.forEach((v, i) => {
    const e = disegnati[i];
    if (e && e.dato === v.dato) fuori.set(v.chiave, e);
  });
  return fuori;
}

function Strato({ voce, interazione, elementi, valori, puntiPerPosto, lato, premuto, presa, inMovimento, sulBersaglio }: {
  voce: Voce;
  interazione: Interazione;
  elementi: ReadonlyMap<string, Elemento>;
  /** I blocchi dei valori iniziali, per chiave della voce. */
  valori: ReadonlyMap<string, Elemento>;
  puntiPerPosto: ReadonlyMap<string, PuntoDiInserimento>;
  lato: number;
  /** Il punto su cui è cominciato l'ultimo clic: un clic che finisce su un «+» senza esserci cominciato
   * (scelto un blocco nell'elenco, sotto il puntatore compare un «+» nuovo) non lo attiva. */
  premuto: MutableRefObject<string | null>;
  /** Il blocco su cui è stato premuto il puntatore: diventa un trascinamento se il puntatore si muove. */
  presa: MutableRefObject<Presa | null>;
  inMovimento: Spostamento | null;
  /** La chiave del «+» sotto il puntatore mentre si trascina. */
  sulBersaglio: string | null;
}): ReactElement | null {
  switch (voce.genere) {
    case "sequenza":
      return (
        <g role="group" aria-label={voce.nome}>
          {voce.voci.map((v, k) => (
            <Strato
              // Ogni genere di voce col suo prefisso: l'`id` di un blocco scritto a mano può essere qualunque testo, e senza
              // prefisso potrebbe coincidere con la chiave di un'altra voce (un valore iniziale, un punto). Il nome di una
              // sequenza si ripete (due cicli uguali): la sua chiave conta le sequenze di prima con lo stesso nome.
              key={
                v.genere === "blocco"
                  ? `b-${v.id}`
                  : v.genere === "punto"
                    ? `p-${chiaveDelPosto(v.posto)}`
                    : v.genere === "valore"
                      ? `v-${v.chiave}`
                      : v.genere === "restituisce"
                        ? `r-${v.id}`
                      : `s-${voce.voci.slice(0, k).filter((x) => x.genere === "sequenza" && x.nome === v.nome).length}-${v.nome}`
              }
              {...{ voce: v, interazione, elementi, valori, puntiPerPosto, lato, premuto, presa, inMovimento, sulBersaglio }}
            />
          ))}
        </g>
      );
    case "blocco": {
      const e = elementi.get(voce.id);
      if (!e) return null;
      const scelto = interazione.selezionati.has(voce.id);
      // Una Lettura con la domanda porta anche i segni, la descrizione e il passo della sua Scrittura.
      const ids = e.scrittura === undefined ? [voce.id] : [e.scrittura, voce.id];
      const segni = ids.map((x) => interazione.segnati.get(x));
      const segno = segni.includes("errore") ? "errore" : segni.find((s) => s !== undefined);
      const descrizione = ids.flatMap((x) => interazione.descrizioni?.get(x) ?? []).join(" ") || undefined;
      const idDescrizione = `descrizione-${voce.id}`;
      // Il segno dell'errore: un bollino su un angolo della forma (`bollino`), e il contorno.
      const b = bollino(e);
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={voce.nome}
          aria-pressed={scelto}
          data-blocco={voce.id}
          aria-invalid={segno === "errore" ? true : undefined}
          aria-current={interazione.corrente != null && ids.includes(interazione.corrente) ? "step" : undefined}
          aria-describedby={descrizione ? idDescrizione : undefined}
          aria-keyshortcuts={interazione.nomi?.get(voce.id)?.length ? "Shift+F9" : undefined}
          className={classi(stili.blocco, scelto && stili.selezionato, inMovimento?.dentro.has(voce.id) && stili.spostato, segno === "errore" && stili.conErrore, segno === "avviso" && stili.conAvviso)}
          // Il fuoco su un blocco della scelta la lascia com'è (il trascinamento di un blocco scelto porta gli altri; Maiusc+frecce
          // ci porta il fuoco); il clic sceglie il blocco solo, o con Maiusc allarga la scelta fino a lui.
          onFocus={() => {
            if (!scelto && !(presa.current?.id === voce.id && presa.current.maiusc)) interazione.scegli(voce.id);
          }}
          onClick={(ev) => interazione.scegli(voce.id, ev.shiftKey)}
          onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apri(voce.id)}
          onContextMenu={(ev) => {
            if (!interazione.menu) return;
            ev.preventDefault();
            if (!scelto) interazione.scegli(voce.id);
            interazione.menu({ id: voce.id }, ev.clientX, ev.clientY);
          }}
          onPointerDown={(ev) => {
            if (!interazione.solaLettura && ev.button === 0 && ev.isPrimary) presa.current = { id: voce.id, x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId, maiusc: ev.shiftKey };
          }}
        >
          {descrizione && <desc id={idDescrizione}>{descrizione}</desc>}
          <polygon className={stili.areaDelBlocco} points={punti(e.vertici)} />
          <Nomi nomi={interazione.nomi?.get(voce.id)} interazione={interazione} blocco={voce.id} />
          {segno && (
            <g className={stili.segno} data-segno={segno} transform={`translate(${b.x} ${b.y})`}>
              <circle r={RAGGIO_DEL_BOLLINO} />
              <text>{segno === "errore" ? "!" : "?"}</text>
            </g>
          )}
        </g>
      );
    }
    case "valore": {
      const e = valori.get(voce.chiave);
      if (!e) return null;
      const scelto = interazione.valoreScelto === voce.chiave;
      // Niente trascinamento: il puntatore premuto qui non prende nulla.
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={voce.nome}
          aria-pressed={scelto}
          data-iniziale={voce.chiave}
          data-iniziale-di={voce.dato}
          aria-current={interazione.correnteValore != null && interazione.correnteValore === voce.dato ? "step" : undefined}
          className={classi(stili.blocco, scelto && stili.selezionato)}
          onFocus={() => interazione.scegliValore?.(voce.chiave)}
          onClick={() => interazione.scegliValore?.(voce.chiave)}
          onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apriValore?.(voce.chiave)}
          onContextMenu={(ev) => {
            if (!interazione.menu) return;
            ev.preventDefault();
            interazione.scegliValore?.(voce.chiave);
            interazione.menu({ valore: voce.chiave }, ev.clientX, ev.clientY);
          }}
        >
          <polygon className={stili.areaDelBlocco} points={punti(e.vertici)} />
          <Nomi nomi={interazione.nomiDeiValori?.get(voce.dato)} interazione={interazione} />
        </g>
      );
    }
    case "restituisce": {
      const e = elementi.get(voce.id);
      if (!e) return null;
      // Non si sceglie e non si trascina: si apre, col doppio clic o con Invio. Un errore o un avviso su ciò che
      // restituisce la segna come un blocco.
      const segno = interazione.segnati.get(voce.id);
      const descrizione = interazione.descrizioni?.get(voce.id);
      const idDescrizione = `descrizione-${voce.id}`;
      const b = bollino(e);
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={voce.nome}
          data-restituisce={voce.id}
          aria-invalid={segno === "errore" ? true : undefined}
          aria-describedby={descrizione ? idDescrizione : undefined}
          aria-keyshortcuts={interazione.nomi?.get(voce.id)?.length ? "Shift+F9" : undefined}
          className={classi(stili.blocco, segno === "errore" && stili.conErrore, segno === "avviso" && stili.conAvviso)}
          onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apriRestituisce?.()}
        >
          {descrizione && <desc id={idDescrizione}>{descrizione}</desc>}
          <polygon className={stili.areaDelBlocco} points={punti(e.vertici)} />
          <Nomi nomi={interazione.nomi?.get(voce.id)} interazione={interazione} blocco={voce.id} />
          {segno && (
            <g className={stili.segno} data-segno={segno} transform={`translate(${b.x} ${b.y})`}>
              <circle r={RAGGIO_DEL_BOLLINO} />
              <text>{segno === "errore" ? "!" : "?"}</text>
            </g>
          )}
        </g>
      );
    }
    case "punto": {
      if (interazione.solaLettura) return null;
      const chiave = chiaveDelPosto(voce.posto);
      const p = puntiPerPosto.get(chiave);
      if (!p) return null;
      const attiva = (g: SVGGElement) => interazione.attiva(voce.posto, g);
      const r = RAGGIO_DEL_PUNTO;
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={voce.nome}
          aria-haspopup="menu"
          data-punto={chiave}
          data-spento={inMovimento?.escluso(voce.posto) ? "" : undefined}
          data-bersaglio={sulBersaglio === chiave ? "" : undefined}
          className={classi(stili.punto, inMovimento?.escluso(voce.posto) && stili.spento, sulBersaglio === chiave && stili.bersaglio)}
          transform={`translate(${p.x} ${p.y})`}
          onPointerDown={() => (premuto.current = chiave)}
          onClick={(ev) => {
            if (premuto.current === chiave) attiva(ev.currentTarget);
            premuto.current = null;
          }}
          onKeyDown={(ev) => comeUnClic(() => attiva(ev.currentTarget as SVGGElement))(ev)}
        >
          <rect className={stili.areaDelPunto} x={-lato / 2} y={-lato / 2} width={lato} height={lato} />
          <circle className={stili.cerchioDelPunto} r={r} />
          <path className={stili.segnoDelPunto} d={`M${-r / 2},0H${r / 2}M0,${-r / 2}V${r / 2}`} />
        </g>
      );
    }
  }
}

/** Un rettangolo dentro un altro. */
const contiene = (fuori: Rettangolo, dentro: Rettangolo) =>
  dentro.x >= fuori.x && dentro.y >= fuori.y && dentro.x + dentro.larghezza <= fuori.x + fuori.larghezza && dentro.y + dentro.altezza <= fuori.y + fuori.altezza;

export function Flowchart({
  disegno,
  nome,
  scala = 1,
  tema = geometriaPredefinita,
  interazione,
  fondoDeiCicli = false,
}: {
  disegno: Disegno;
  /** Il nome accessibile: il flowchart si trova per ruolo e nome. */
  nome: string;
  scala?: number;
  tema?: GeometriaDelTema;
  /** Senza, il flowchart è un'immagine; con, si modifica. */
  interazione?: Interazione;
  /** Il riquadro dei cicli col fondo colorato (un'opzione dell'app). */
  fondoDeiCicli?: boolean;
}): ReactElement {
  // Un id per disegno: sulla stessa pagina possono esserci più flowchart.
  const punta = `punta-${useId().replace(/\W/g, "")}`;
  const premuto = useRef<string | null>(null);
  const presa = useRef<Presa | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [trascinamento, setTrascinamento] = useState<Trascinamento | null>(null);
  // Lo stesso trascinamento, letto dai gestori degli eventi senza aspettare il disegno.
  const corrente = useRef<Trascinamento | null>(null);
  const aggiorna = (t: Trascinamento | null) => {
    corrente.current = t;
    setTrascinamento(t);
  };

  /** Il trascinamento annullato: il blocco resta dov'è. */
  const annulla = () => {
    const t = corrente.current;
    if (t && svg.current?.hasPointerCapture(t.pointerId)) svg.current.releasePointerCapture(t.pointerId);
    presa.current = null;
    aggiorna(null);
  };
  // Esc durante il trascinamento lo annulla, e così la finestra che perde il fuoco (Alt+Tab a metà).
  const trascinando = trascinamento !== null;
  useEffect(() => {
    if (!trascinando) return;
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      annulla();
    };
    document.addEventListener("keydown", esc, true);
    window.addEventListener("blur", annulla);
    return () => {
      document.removeEventListener("keydown", esc, true);
      window.removeEventListener("blur", annulla);
    };
  }, [trascinando]);
  const { larghezza, altezza } = disegno;
  const disegnato = (
    <>
      <defs>
        <marker
          id={punta}
          viewBox="0 0 10 10"
          refX={10}
          refY={5}
          markerUnits="userSpaceOnUse"
          markerWidth={tema.punta}
          markerHeight={tema.punta}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className={stili.punta} />
        </marker>
      </defs>
      {parti(disegno, true)}
    </>
  );
  /** Linee, forme, etichette e unioni di un disegno (anche della copia che segue il puntatore); nel disegno
   * vero anche il blocco corrente (bordo, interno, punta che entra) e i punti di interruzione (pallino e contorno
   * rosso): posizioni e regole in `core/disegno/segni.ts`, le stesse del disegno in SVG. */
  function parti(d: Disegno, vero = false): ReactElement {
    const ripresa = vero && interazione?.ripresa === true;
    const segniDi = segniDelDisegno(d.elementi, vero ? interazione : undefined);
    const eCorrente = (e: Elemento) => segniDi(e).corrente;
    const conPunto = (e: Elemento) => segniDi(e).punto;
    const rigaCorrente = (e: Elemento) => segniDi(e).riga;
    return (
    <>
      {d.riquadri.map((r) => (
        <rect
          key={`riquadro-${r.blocco}`}
          data-riquadro={r.blocco}
          // Il fondo solo sul riquadro più esterno: dentro un altro il velo si sommerebbe.
          className={fondoDeiCicli && !d.riquadri.some((o) => o !== r && contiene(o.bordo, r.bordo)) ? `${stili.riquadro} ${stili.conFondo}` : stili.riquadro}
          x={r.bordo.x}
          y={r.bordo.y}
          width={r.bordo.larghezza}
          height={r.bordo.altezza}
        />
      ))}
      {d.connettori.map((c, i) =>
        c.genere === "flusso" ? (
          <polyline key={i} data-connettore="flusso" className={stili.linea} points={punti(c.punti)} markerEnd={`url(#${punta})`} />
        ) : (
          <polyline key={i} data-connettore="nota" className={stili.lineaNota} points={punti(c.punti)} />
        ),
      )}
      {d.riquadri.map(
        (r) =>
          r.didascalia && (
            <g key={`didascalia-${r.blocco}`} data-forma="intestazione" data-didascalia={r.blocco}>
              <FormaColTesto e={r.didascalia} tema={tema} />
            </g>
          ),
      )}
      {d.elementi.map((e, i) =>
        e.dato !== undefined ? (
          <g key={`valore-${i}`} data-forma={e.forma} data-valore-iniziale={e.dato} className={eCorrente(e) ? stili.corrente : undefined}>
            <FormaColTesto e={e} tema={tema} />
          </g>
        ) : (
          <g
            key={`${e.forma}-${e.id}-${e.fase ?? ""}-${e.campo ?? ""}`}
            data-forma={e.forma}
            data-id={e.id}
            data-fase={e.fase}
            data-campo-della-copia={e.campo}
            data-ciclo={e.ciclo ? "" : undefined}
            className={eCorrente(e) ? stili.corrente : conPunto(e) ? stili.conPunto : undefined}
            onDoubleClick={e.fase !== undefined && interazione?.apriParte && !interazione.solaLettura ? () => interazione.apriParte?.(e.id) : undefined}
            // Il tasto destro su una parte disegnata del riquadro: il menu del ciclo, come sulla sua intestazione.
            onContextMenu={
              e.fase !== undefined && interazione?.menu
                ? (ev) => {
                    ev.preventDefault();
                    interazione.scegli(e.id);
                    interazione.menu?.({ id: e.id }, ev.clientX, ev.clientY);
                  }
                : undefined
            }
          >
            <FormaColTesto e={e} tema={tema} />
          </g>
        ),
      )}
      {vero &&
        d.elementi.map((e, i) => {
          const p = pallino(e);
          const riga = rigaCorrente(e);
          const t = e.riquadroTesto;
          const h = t.altezza / e.righe.length;
          return (
            <g key={`esecuzione-${i}`}>
              {riga !== undefined && <rect data-riga-corrente={riga} className={stili.rigaCorrente} x={t.x - 4} y={t.y + h * riga} width={t.larghezza + 8} height={h} rx={3} />}
              {conPunto(e) && <circle data-interruzione={e.id} className={stili.interruzione} cx={p.x} cy={p.y} r={RAGGIO_DEL_PALLINO} />}
              {eCorrente(e) && !ripresa && <path data-freccia="" className={stili.freccia} d={`M${puntaCorrente(e).map((v) => `${v.x},${v.y}`).join(" L")} z`} />}
              {eCorrente(e) && ripresa && (
                <text data-segno-ripresa="" className={stili.segnoDellaRipresa} x={segnoDellaRipresa(e).base.x} y={segnoDellaRipresa(e).base.y}>
                  ↩
                </text>
              )}
            </g>
          );
        })}
      {d.etichette.map((t) => (
        <text
          key={`${t.blocco}-${t.valore}`}
          data-etichetta={t.valore}
          className={t.valore === "vero" ? stili.vero : stili.falso}
          x={t.riquadro.x}
          y={t.riquadro.y + t.riquadro.altezza / 2}
        >
          {t.testo}
        </text>
      ))}
      {d.ricongiungimenti.map((u, i) => (
        <circle key={i} data-unione="" className={stili.unione} cx={u.centro.x} cy={u.centro.y} r={u.raggio} />
      ))}
    </>
    );
  }
  const dimensioni = { className: stili.flowchart, viewBox: `0 0 ${larghezza} ${altezza}`, width: larghezza * scala, height: altezza * scala, fontSize: tema.carattere };
  if (!interazione)
    return (
      <svg role="img" aria-label={nome} {...dimensioni}>
        {disegnato}
      </svg>
    );
  // Le forme dei blocchi dell'albero: di un ciclo la sua intestazione.
  const elementi = new Map(disegno.elementi.filter((e) => e.dato === undefined && e.fase === undefined).map((e) => [e.id, e]));
  const valori = formeDeiValori(interazione.struttura, disegno);
  const puntiPerPosto = new Map(disegno.punti.map((p) => [chiaveDelPosto(p.posto), p]));
  const lato = latoDellArea(scala);
  const inMovimento = trascinamento?.spostamento ?? interazione.spostando;
  const sulBersaglio = trascinamento?.bersaglio ? chiaveDelPosto(trascinamento.bersaglio.punto.posto) : null;
  const conLe = interazione;

  /** Il puntatore nel sistema del disegno: l'angolo del disegno sullo schermo, poi la scala. */
  const nelSistema = (x: number, y: number): Coordinate => {
    const r = svg.current!.getBoundingClientRect();
    return nelDisegno({ x, y }, { x: r.left, y: r.top }, scala);
  };
  function muovi(ev: PointerEvent<SVGSVGElement>): void {
    const p = presa.current;
    if (p === null || ev.pointerId !== p.pointerId) return;
    // Nessun tasto premuto: il rilascio è avvenuto fuori dal disegno prima che il trascinamento partisse (e la cattura
    // non c'era), e la presa rimasta non deve far partire un trascinamento al primo movimento.
    if (ev.buttons === 0) {
      annulla();
      return;
    }
    const puntatore = nelSistema(ev.clientX, ev.clientY);
    let t = corrente.current;
    if (t === null) {
      if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < SOGLIA_DEL_TRASCINAMENTO) return;
      ev.currentTarget.setPointerCapture(p.pointerId);
      t = { spostamento: conLe.perSpostare(p.id), inizio: nelSistema(p.x, p.y), puntatore, bersaglio: null, pointerId: p.pointerId };
    }
    aggiorna({ ...t, puntatore, bersaglio: bersaglio(disegno.punti, puntatore, scala, t.spostamento.escluso) });
  }
  function rilascia(ev: PointerEvent<SVGSVGElement>): void {
    const t = corrente.current;
    presa.current = null;
    if (t === null || ev.pointerId !== t.pointerId) return;
    aggiorna(null);
    if (ev.type === "pointerup" && t.bersaglio) conLe.sposta(t.spostamento.id, t.bersaglio.punto.posto, t.spostamento.ancora ?? null);
  }

  const copia = trascinamento?.spostamento.copia;
  const fineCorrente = disegno.elementi.find((e) => e.dato === undefined && e.id === interazione.corrente && (e.forma === "fine" || e.forma === "inizio"));
  return (
    <svg
      ref={svg}
      role="group"
      aria-label={nome}
      tabIndex={-1}
      {...dimensioni}
      className={classi(stili.flowchart, stili.modificabile, inMovimento && stili.inMovimento)}
      onPointerMove={muovi}
      onPointerUp={rilascia}
      onPointerCancel={rilascia}
      onLostPointerCapture={rilascia}
    >
      <g aria-hidden="true">{disegnato}</g>
      {/* Il riquadro dei blocchi scelti insieme: sopra il disegno e sotto lo strato, non prende il puntatore. */}
      {interazione.riquadroDellaScelta && (
        <rect
          aria-hidden="true"
          className={stili.riquadroDellaScelta}
          data-riquadro-della-scelta=""
          x={interazione.riquadroDellaScelta.x}
          y={interazione.riquadroDellaScelta.y}
          width={interazione.riquadroDellaScelta.larghezza}
          height={interazione.riquadroDellaScelta.altezza}
          rx={6}
        />
      )}
      {/* La copia sotto lo strato: il «+» bersaglio resta visibile sopra di lei. */}
      {trascinamento && copia && (
        <g
          aria-hidden="true"
          data-copia=""
          className={stili.copia}
          transform={`translate(${copia.dx + trascinamento.puntatore.x - trascinamento.inizio.x} ${copia.dy + trascinamento.puntatore.y - trascinamento.inizio.y})`}
        >
          {parti(copia.disegno)}
        </g>
      )}
      <Strato voce={interazione.struttura} {...{ interazione, elementi, valori, puntiPerPosto, lato, premuto, presa, inMovimento, sulBersaglio }} />
      {/* La fine non è una voce dello strato: con una pausa sulla fine, gli ausili la trovano qui. Non prende il puntatore:
          sotto, sulla fine di una funzione, ci sono i nomi del watch di ciò che restituisce. */}
      {fineCorrente && (
        <g role="img" aria-label={fineCorrente.righe.join(" ")} aria-current="step" data-fine={fineCorrente.id} pointerEvents="none">
          <polygon className={stili.areaDelBlocco} points={punti(fineCorrente.vertici)} />
        </g>
      )}
    </svg>
  );
}
