// La finestra «Guida», dal menu «Aiuto»: la guida per lo studente nella lingua dell'interfaccia, convertita in HTML
// durante la build (`ui/guida/guide.ts`): il prodotto porta l'HTML, non il Markdown né un convertitore.
//
// Non è modale: sta a destra, fra la barra e la riga di stato, e resta aperta mentre si lavora; l'app accanto si usa
// ancora, coi suoi tasti (F5, F10…), e le altre finestre si aprono sopra di lei. Per questo non usa la base delle
// finestre (`Finestra.tsx`, che trattiene il fuoco) né un `Dialog` di Ark non modale, che chiuderebbe la guida con Esc
// premuto in qualunque punto della pagina: Esc la chiude solo col fuoco dentro, e lì si ferma.
//
// A sinistra l'indice dei capitoli (un clic, o Invio, porta al capitolo e gli dà il fuoco), a destra il testo, che
// prende il fuoco all'apertura, così le frecce e Pag giù lo fanno scorrere subito; sopra il testo la ricerca, se le
// Impostazioni la mostrano. Se la lingua cambia con la guida aperta, la guida cambia lingua e resta sullo stesso
// capitolo. Con l'impostazione «si sposta e si ridimensiona» si trascina dal titolo e si allarga dall'angolo in basso.
// Chiusa e riaperta, finché AlgoDesign è aperto, torna dove era: posto, misure, punto del testo (`MemoriaDellaGuida`).
//
// L'HTML viene dal Markdown di `docs/` e la conversione lascia passare solo le etichette che la guida usa, senza
// attributi (`ui/guida/guida.ts`): per questo si può mettere nella pagina così com'è.
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { guide } from "../guida/guide" with { type: "macro" };
import { useSpostabile, type Posizione } from "../spostabile";
import stiliDellaFinestra from "./Finestra.module.css";
import stili from "./FinestraGuida.module.css";

/** Le due guide, già in HTML: le ha scritte la build. Sotto `bun test` l'import della macro diventa un import normale
 * (`strumenti/preload.ts`, il perché è lì). */
export const GUIDE = guide();

/** Ciò che la guida ricorda fra una chiusura e la riapertura, finché AlgoDesign è aperto. */
export interface MemoriaDellaGuida {
  posizione: Posizione | null;
  misure: { larghezza: number; altezza: number } | null;
  /** Il punto del testo, nella lingua in cui lo si leggeva. */
  scorrimento: { lingua: Lingua; alto: number } | null;
  /** Il capitolo in cima al testo, contato da 0 (-1 prima del primo): dopo un cambio di lingua si torna lì. */
  capitolo: number;
}

export const memoriaNuova = (): MemoriaDellaGuida => ({ posizione: null, misure: null, scorrimento: null, capitolo: -1 });

/** Il posto della guida fissa: a destra, fra la barra e la riga di stato (lette dal documento). */
interface Posto {
  readonly alto: number;
  readonly basso: number;
}

function postoDellaGuida(): Posto {
  const barra = document.querySelector("header")?.getBoundingClientRect();
  const riga = document.querySelector("[data-riga-di-stato]")?.getBoundingClientRect();
  return { alto: Math.round((barra?.bottom ?? 0) + 6), basso: Math.round(riga ? Math.max(0, window.innerHeight - riga.top) + 4 : 8) };
}

export function FinestraGuida({
  aperta,
  testi,
  lingua,
  ricerca,
  spostabile,
  memoria,
  chiudi,
}: {
  aperta: boolean;
  testi: Dizionario;
  lingua: Lingua;
  /** La ricerca sopra il testo (Impostazioni). */
  ricerca: boolean;
  /** La finestra si sposta e si ridimensiona (Impostazioni); altrimenti sta fissa a destra. */
  spostabile: boolean;
  memoria: MemoriaDellaGuida;
  chiudi: () => void;
}): ReactElement {
  if (!aperta) return <></>;
  return createPortal(<Guida testi={testi} lingua={lingua} ricerca={ricerca} spostabile={spostabile} memoria={memoria} chiudi={chiudi} />, document.body);
}

function Guida({
  testi,
  lingua,
  ricerca,
  spostabile,
  memoria,
  chiudi,
}: {
  testi: Dizionario;
  lingua: Lingua;
  ricerca: boolean;
  spostabile: boolean;
  memoria: MemoriaDellaGuida;
  chiudi: () => void;
}): ReactElement {
  const finestra = useRef<HTMLElement>(null);
  const testo = useRef<HTMLElement>(null);
  const linguaPrima = useRef(lingua);
  const primaDiAprire = useRef<HTMLElement | null>(null);
  const [posto, setPosto] = useState<Posto>(postoDellaGuida);
  const { posizione, trascina } = useSpostabile(finestra, memoria.posizione);
  const guida = GUIDE[lingua];

  const capitoloInCima = (): number => {
    const t = testo.current;
    if (!t) return -1;
    // Un capitolo raggiunto dall'indice si ferma poco sotto la cima (il margine del titolo): conta già come in cima.
    const cima = t.getBoundingClientRect().top + 24;
    return [...t.querySelectorAll("h2")].filter((h) => h.getBoundingClientRect().top <= cima).length - 1;
  };
  const vaiAl = (indice: number, fuoco: boolean) => {
    const h = testo.current?.querySelectorAll<HTMLElement>("h2")[indice];
    if (!h) return;
    h.scrollIntoView({ block: "start" });
    memoria.capitolo = indice;
    if (fuoco) h.focus({ preventScroll: true });
  };

  // All'apertura: il fuoco nel testo, e il testo dove lo si era lasciato. Chiusa col fuoco dentro, il fuoco torna
  // dov'era prima di aprirla (il menu «Aiuto»).
  useLayoutEffect(() => {
    const dovEra = document.activeElement;
    primaDiAprire.current = dovEra instanceof HTMLElement ? dovEra : null;
    const t = testo.current;
    if (t && memoria.scorrimento?.lingua === lingua) t.scrollTop = memoria.scorrimento.alto;
    else if (memoria.capitolo >= 0) vaiAl(memoria.capitolo, false);
    t?.focus({ preventScroll: true });
    const lei = finestra.current;
    return () => {
      const attivo = document.activeElement;
      if (attivo === null || attivo === document.body || lei?.contains(attivo)) primaDiAprire.current?.focus({ preventScroll: true });
    };
  }, []);
  // La lingua cambiata con la guida aperta: lo stesso capitolo nell'altra lingua.
  useLayoutEffect(() => {
    if (linguaPrima.current === lingua) return;
    linguaPrima.current = lingua;
    if (memoria.capitolo >= 0) vaiAl(memoria.capitolo, false);
    else testo.current?.scrollTo({ top: 0 });
  }, [lingua]);
  // La guida fissa segue la barra e la riga di stato (la finestra ridimensionata, la barra con un'altra presentazione).
  useEffect(() => {
    const aggiorna = () => setPosto(postoDellaGuida());
    const osserva = new ResizeObserver(aggiorna);
    for (const e of [document.querySelector("header"), document.querySelector("[data-riga-di-stato]")]) if (e) osserva.observe(e);
    window.addEventListener("resize", aggiorna);
    return () => {
      osserva.disconnect();
      window.removeEventListener("resize", aggiorna);
    };
  }, []);
  // Le misure date dall'utente trascinando l'angolo si ricordano.
  useEffect(() => {
    const f = finestra.current;
    if (!f || !spostabile) return;
    const osserva = new ResizeObserver(() => {
      if (f.offsetWidth > 0) memoria.misure = { larghezza: f.offsetWidth, altezza: f.offsetHeight };
    });
    osserva.observe(f);
    return () => osserva.disconnect();
  }, [spostabile]);
  useEffect(() => {
    memoria.posizione = posizione;
  }, [posizione]);

  const larghezza = Math.min(44 * 16, Math.round(window.innerWidth * 0.46));
  const stile = spostabile
    ? {
        left: posizione?.x ?? window.innerWidth - 8 - (memoria.misure?.larghezza ?? larghezza),
        top: posizione?.y ?? posto.alto,
        width: memoria.misure?.larghezza ?? larghezza,
        height: memoria.misure?.altezza ?? Math.max(240, window.innerHeight - posto.alto - posto.basso),
      }
    : { right: 8, top: posto.alto, bottom: posto.basso, width: larghezza };

  return (
    <section
      ref={finestra}
      role="dialog"
      data-guida={lingua}
      aria-labelledby="titolo-della-guida"
      aria-modal="false"
      className={spostabile ? `${stili.guida} ${stili.spostabile}` : stili.guida}
      style={stile}
      onKeyDown={(tasto) => {
        if (tasto.key !== "Escape" || tasto.nativeEvent.isComposing) return;
        tasto.preventDefault();
        tasto.stopPropagation();
        chiudi();
      }}
    >
      <h2 id="titolo-della-guida" className={stili.titolo} onPointerDown={spostabile ? trascina : undefined}>
        {testi.guidaTitolo}
      </h2>
      <div className={stili.corpo}>
        <nav aria-label={testi.guidaIndice} className={stili.indice}>
          <ul>
            {guida.capitoli.map((c, i) => (
              <li key={c.id}>
                <button type="button" className={stili.voce} onClick={() => vaiAl(i, true)}>
                  {c.titolo}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className={stili.colonna}>
          {ricerca && <Ricerca testo={testo} html={guida.html} testi={testi} />}
          <article
            ref={testo}
            className={stili.testo}
            lang={lingua}
            aria-label={guida.titolo}
            tabIndex={0}
            onScroll={(e) => {
              memoria.scorrimento = { lingua, alto: e.currentTarget.scrollTop };
              memoria.capitolo = capitoloInCima();
            }}
            dangerouslySetInnerHTML={{ __html: guida.html }}
          />
        </div>
      </div>
      <div className={stiliDellaFinestra.comandi}>
        <button type="button" className={stiliDellaFinestra.comando} onClick={chiudi}>
          {testi.chiudiEsc}
        </button>
      </div>
    </section>
  );
}

/** La ricerca sopra il testo: le parole trovate (da due caratteri) segnate, Invio porta alla successiva e Maiusc+Invio
 * alla precedente. I segni si rifanno quando cambia la parola o la guida (l'altra lingua). */
function Ricerca({ testo, html, testi }: { testo: RefObject<HTMLElement | null>; html: string; testi: Dizionario }): ReactElement {
  const [parola, setParola] = useState("");
  const [corrente, setCorrente] = useState(0);
  const [trovate, setTrovate] = useState(0);
  const segni = useRef<HTMLElement[]>([]);
  const cercataPrima = useRef("");
  const cercata = parola.trim().toLocaleLowerCase();

  const segna = (i: number, scorri: boolean) => {
    segni.current.forEach((m, k) => (k === i ? m.setAttribute("data-corrente", "") : m.removeAttribute("data-corrente")));
    if (scorri) segni.current[i]?.scrollIntoView({ block: "center" });
  };
  useEffect(() => {
    const t = testo.current;
    if (!t) return;
    // Il testo com'è uscito dalla build, poi i segni sulla parola cercata.
    t.innerHTML = html;
    segni.current = cercata.length < 2 ? [] : segnaLaParola(t, cercata);
    setTrovate(segni.current.length);
    setCorrente(0);
    // La guida va alla prima trovata solo quando cambia la parola: con l'altra lingua resta sul capitolo.
    segna(0, cercataPrima.current !== cercata);
    cercataPrima.current = cercata;
  }, [cercata, html]);
  const vai = (passo: number) => {
    if (trovate === 0) return;
    const i = (corrente + passo + trovate) % trovate;
    setCorrente(i);
    segna(i, true);
  };

  return (
    <div className={stili.ricerca}>
      <input
        type="search"
        className={stiliDellaFinestra.campo}
        aria-label={testi.guidaCerca}
        placeholder={testi.guidaCerca}
        value={parola}
        onChange={(e) => setParola(e.target.value)}
        onKeyDown={(tasto) => {
          if (tasto.key !== "Enter") return;
          tasto.preventDefault();
          vai(tasto.shiftKey ? -1 : 1);
        }}
      />
      <span className={stili.trovate} data-trovate={trovate}>
        {trovate > 0 ? riempi(testi.guidaTrovate, { n: String(corrente + 1), totale: String(trovate) }) : cercata.length >= 2 ? testi.guidaNessuna : ""}
      </span>
    </div>
  );
}

/** Avvolge in un `<mark>` ogni punto in cui il testo contiene la parola (senza badare a maiuscole e minuscole), dentro
 * un nodo di testo; restituisce i segni in ordine. */
function segnaLaParola(radice: HTMLElement, parola: string): HTMLElement[] {
  const segni: HTMLElement[] = [];
  const giro = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
  const nodi: Text[] = [];
  while (giro.nextNode()) nodi.push(giro.currentNode as Text);
  for (const nodo of nodi) {
    const s = nodo.data;
    const minuscolo = s.toLocaleLowerCase();
    let i = minuscolo.indexOf(parola);
    if (i < 0) continue;
    const pezzi = document.createDocumentFragment();
    let da = 0;
    while (i >= 0) {
      pezzi.append(s.slice(da, i));
      const m = document.createElement("mark");
      m.textContent = s.slice(i, i + parola.length);
      pezzi.append(m);
      segni.push(m);
      da = i + parola.length;
      i = minuscolo.indexOf(parola, da);
    }
    pezzi.append(s.slice(da));
    nodo.replaceWith(pezzi);
  }
  return segni;
}
