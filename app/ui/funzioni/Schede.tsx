// Le schede sopra il flowchart, quando il progetto ha procedure o funzioni:
// «Programma principale» sempre presente e SEMPRE la prima a sinistra (nulla prima di lei); poi le procedure e le funzioni
// aperte, ognuna con la ×, che chiude la scheda (la funzione resta nel progetto); poi «+», che apre la scelta fra «Nuova
// procedura…» e «Nuova funzione…»; in fondo a destra, staccato, «Procedure e funzioni (n) ▾», che apre l'elenco di tutte.
// Col solo programma principale la fila non c'è.
//
// Le schede sono un `tablist` (non il componente di Ark: la scheda non ha un contenuto suo, il flowchart è uno solo):
// il fuoco è sulla scheda mostrata, le frecce a sinistra e a destra (Inizio, Fine) passano alla vicina e la mostrano; il
// tasto destro, il tasto Menu o Maiusc+F10 aprono il menu della procedura o della funzione (`menu`). La × non prende il
// fuoco col Tab: dalla tastiera si chiude dal menu.
//
// L'elenco: la ricerca sul nome, le procedure e poi le funzioni, ciascuna in ordine alfabetico, con l'intestazione come
// nel disegno e sotto chi la chiama; un clic (o Invio) la apre nella sua scheda, il tasto destro apre il suo menu. In
// fondo «Nuova procedura o funzione…». Esc chiude e torna al pulsante; un clic fuori chiude.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import type { ParteDelTesto } from "../../core/disegno/impaginazione";
import type { Funzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import type { GenereDiSottoprogramma } from "../../core/modifica/funzioni";
import { MenuNelPunto } from "../dati/MenuDellaRiga";
import stili from "./Funzioni.module.css";

/** L'intestazione a parti con lo stile: il nome in grassetto, *rif* e il tipo in corsivo. */
export function Intestazione({ parti }: { parti: readonly ParteDelTesto[] }): ReactElement {
  return (
    <>
      {parti.map((p, i) =>
        p.stile === "grassetto" ? <strong key={i}>{p.testo}</strong> : p.stile === "corsivo" ? <em key={i}>{p.testo}</em> : <span key={i}>{p.testo}</span>,
      )}
    </>
  );
}

/** Le procedure e le funzioni in ordine alfabetico, prima le procedure: l'ordine dell'elenco e della finestra. */
export function inOrdine(funzioni: readonly Funzione[], lingua: string): { procedure: Funzione[]; funzioni: Funzione[] } {
  const alfabetico = (a: Funzione, b: Funzione) => (a.name ?? "").localeCompare(b.name ?? "", lingua);
  return { procedure: funzioni.filter((f) => f.kind === "procedure").sort(alfabetico), funzioni: funzioni.filter((f) => f.kind === "function").sort(alfabetico) };
}

/** Il tasto Menu, o Maiusc con F10. */
const apreIlMenu = (e: KeyboardEvent) => (e.shiftKey ? e.key === "F10" : e.key === "ContextMenu");

export function Schede({
  testi,
  lingua,
  principale,
  funzioni,
  aperte,
  mostrata,
  intestazione,
  chiamataDa,
  giroDi,
  mostra,
  chiudi,
  nuova,
  menu,
  conUnaFinestra,
}: {
  testi: Dizionario;
  lingua: string;
  /** L'`id` del programma principale. */
  principale: string;
  /** Le procedure e le funzioni del progetto, nell'ordine del file. */
  funzioni: readonly Funzione[];
  /** Gli `id` delle schede aperte, oltre al programma principale, nell'ordine in cui si sono aperte. */
  aperte: readonly string[];
  /** L'`id` della funzione mostrata. */
  mostrata: string;
  intestazione: (f: Funzione) => readonly ParteDelTesto[];
  /** I nomi di chi la chiama. */
  chiamataDa: (f: Funzione) => readonly string[];
  /** Il giro della ricorsione in cui sta, in parole; nessuno fuori dai giri. */
  giroDi?: ((f: Funzione) => string | undefined) | undefined;
  mostra: (id: string) => void;
  chiudi: (id: string) => void;
  /** Una procedura o una funzione nuova: col genere dal menu del «+», senza dall'elenco (lo sceglie la finestra). */
  nuova: (genere?: GenereDiSottoprogramma) => void;
  /** Il menu della procedura o della funzione, aperto nel punto. */
  menu: (id: string, x: number, y: number) => void;
  /** Una finestra aperta (anche da una voce del menu di una voce dell'elenco): l'elenco si chiude. */
  conUnaFinestra: boolean;
}): ReactElement | null {
  const [elencoAperto, setElencoAperto] = useState(false);
  // Il menu del «+», aperto sotto il pulsante.
  const [menuDelPiu, setMenuDelPiu] = useState<{ x: number; y: number } | null>(null);
  const piu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (conUnaFinestra) setElencoAperto(false);
  }, [conUnaFinestra]);
  const pulsante = useRef<HTMLButtonElement>(null);
  const fila = useRef<HTMLDivElement>(null);
  if (funzioni.length === 0) return null;
  const schede = [principale, ...aperte.filter((id) => funzioni.some((f) => f.id === id))];
  const nomeDi = (id: string) => (id === principale ? testi.schedaPrincipale : (funzioni.find((f) => f.id === id)?.name ?? ""));

  /** Le frecce passano alla scheda vicina e la mostrano; il tasto Menu apre il menu sotto la scheda. */
  function tasto(e: KeyboardEvent<HTMLButtonElement>, id: string): void {
    const i = schede.indexOf(id);
    const vai = (j: number) => {
      const altra = schede[(j + schede.length) % schede.length]!;
      mostra(altra);
      fila.current?.querySelector<HTMLElement>(`[data-scheda="${altra}"]`)?.focus();
    };
    if (e.key === "ArrowRight") vai(i + 1);
    else if (e.key === "ArrowLeft") vai(i - 1);
    else if (e.key === "Home") vai(0);
    else if (e.key === "End") vai(schede.length - 1);
    else if (apreIlMenu(e) && id !== principale) {
      const r = e.currentTarget.getBoundingClientRect();
      menu(id, r.left, r.bottom);
    } else return;
    e.preventDefault();
  }
  const menuSu = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    if (id !== principale) menu(id, e.clientX, e.clientY);
  };

  return (
    <div className={stili.fila} ref={fila} data-schede="">
      <div role="tablist" aria-label={testi.schedeAperte} className={stili.schede}>
        {schede.map((id) => {
          const f = funzioni.find((x) => x.id === id);
          const scelta = id === mostrata;
          return (
            <span key={id} className={stili.linguetta} data-scelta={scelta ? "" : undefined}>
              <button
                role="tab"
                type="button"
                aria-selected={scelta}
                tabIndex={scelta ? 0 : -1}
                className={stili.scheda}
                data-scheda={id}
                onClick={() => mostra(id)}
                onKeyDown={(e) => tasto(e, id)}
                onContextMenu={menuSu(id)}
              >
                {f === undefined ? (
                  testi.schedaPrincipale
                ) : (
                  <>
                    {f.name}
                    <span className={stili.genere}> {f.kind === "function" ? testi.genereFunzione : testi.genereProcedura}</span>
                  </>
                )}
              </button>
              {f !== undefined && (
                <button
                  type="button"
                  tabIndex={-1}
                  className={stili.chiudi}
                  aria-label={riempi(testi.chiudiScheda, { nome: nomeDi(id) })}
                  title={testi.chiudiSchedaSuggerimento}
                  data-chiudi-scheda={id}
                  onClick={() => chiudi(id)}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
      <button
        ref={piu}
        type="button"
        className={stili.nuova}
        title={testi.nuovaProceduraOFunzione}
        aria-label={testi.nuovaProceduraOFunzione}
        aria-haspopup="menu"
        aria-expanded={menuDelPiu !== null}
        data-nuova-funzione=""
        onClick={(e) => {
          // Sempre aperto: un clic col menu aperto lo chiude già alla pressione (clic fuori), e lo riapre qui.
          const r = e.currentTarget.getBoundingClientRect();
          setMenuDelPiu({ x: r.left, y: r.bottom });
        }}
      >
        +
      </button>
      <MenuNelPunto
        dove={menuDelPiu}
        nome={testi.nuovaProceduraOFunzione}
        voci={(["procedure", "function"] as const).map((g) => ({
          chiave: g,
          testo: g === "procedure" ? testi.nuovaProcedura : testi.nuovaFunzione,
          azione: () => {
            setMenuDelPiu(null);
            nuova(g);
          },
        }))}
        chiudi={(torna) => {
          setMenuDelPiu(null);
          if (torna) piu.current?.focus();
        }}
      />
      <span className={stili.ancora}>
        <button
          ref={pulsante}
          type="button"
          className={stili.elencoComando}
          aria-expanded={elencoAperto}
          aria-haspopup="dialog"
          data-elenco-funzioni=""
          onClick={() => setElencoAperto((a) => !a)}
        >
          {riempi(testi.elencoFunzioni, { n: String(funzioni.length) })}
          <span aria-hidden="true" data-freccia="">
            {" ▾"}
          </span>
        </button>
        {elencoAperto && (
          <Elenco
            testi={testi}
            lingua={lingua}
            funzioni={funzioni}
            aperte={schede}
            intestazione={intestazione}
            chiamataDa={chiamataDa}
            giroDi={giroDi}
            sotto={pulsante.current}
            apri={(id) => {
              setElencoAperto(false);
              mostra(id);
            }}
            menu={menu}
            nuova={() => {
              setElencoAperto(false);
              nuova();
            }}
            chiudi={(torna) => {
              setElencoAperto(false);
              if (torna) pulsante.current?.focus();
            }}
          />
        )}
      </span>
    </div>
  );
}

function Elenco({
  testi,
  lingua,
  funzioni,
  aperte,
  intestazione,
  chiamataDa,
  giroDi,
  sotto,
  apri,
  menu,
  nuova,
  chiudi,
}: {
  testi: Dizionario;
  lingua: string;
  funzioni: readonly Funzione[];
  aperte: readonly string[];
  intestazione: (f: Funzione) => readonly ParteDelTesto[];
  chiamataDa: (f: Funzione) => readonly string[];
  giroDi: ((f: Funzione) => string | undefined) | undefined;
  sotto: HTMLElement | null;
  apri: (id: string) => void;
  menu: (id: string, x: number, y: number) => void;
  nuova: () => void;
  chiudi: (torna: boolean) => void;
}): ReactElement {
  const [cerca, setCerca] = useState("");
  const riquadro = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [posizione, setPosizione] = useState<{ left: number; top: number } | null>(null);

  // Sotto il pulsante, mai oltre i bordi della finestra.
  useLayoutEffect(() => {
    if (!sotto || !riquadro.current) return;
    const r = sotto.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = riquadro.current;
    setPosizione({ left: Math.max(Math.min(r.left, innerWidth - w), 0), top: Math.max(Math.min(r.bottom + 2, innerHeight - h), 0) });
  }, [sotto]);
  // Il fuoco nella ricerca quando l'elenco si vede: finché non ha la sua posizione è nascosto, e un elemento nascosto non
  // prende il fuoco (misurato in Chromium: restava sul pulsante).
  const posto = posizione !== null;
  useEffect(() => {
    if (posto) campo.current?.focus();
  }, [posto]);
  // Un clic fuori chiude (non quello sul pulsante, che lo chiude da sé).
  useEffect(() => {
    const fuori = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!riquadro.current?.contains(t) && !sotto?.contains(t) && !(t instanceof Element && t.closest('[role="menu"]'))) chiudi(false);
    };
    document.addEventListener("pointerdown", fuori, true);
    return () => document.removeEventListener("pointerdown", fuori, true);
  }, [sotto, chiudi]);

  const corrisponde = (f: Funzione) => cerca.trim() === "" || (f.name ?? "").toLowerCase().includes(cerca.trim().toLowerCase());
  const { procedure, funzioni: fs } = inOrdine(funzioni.filter(corrisponde), lingua);

  /** La procedura o la funzione di una voce dell'elenco (l'elemento col fuoco), se lo è. */
  const voce = (e: Element | null) => (e instanceof HTMLElement ? e.dataset.voceFunzione : undefined);
  /** Le frecce fra il campo della ricerca e le voci; Esc chiude e torna al pulsante. */
  function tasto(e: KeyboardEvent): void {
    const tutte = [...(riquadro.current?.querySelectorAll<HTMLElement>("input, [data-voce-funzione], [data-nuova]") ?? [])];
    const i = tutte.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") tutte[Math.min(i + 1, tutte.length - 1)]?.focus();
    else if (e.key === "ArrowUp") tutte[Math.max(i - 1, 0)]?.focus();
    else if (e.key === "Escape") chiudi(true);
    else if (apreIlMenu(e) && voce(document.activeElement) !== undefined) {
      const r = (document.activeElement as HTMLElement).getBoundingClientRect();
      menu(voce(document.activeElement)!, r.left, r.bottom);
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }

  const gruppo = (titolo: string, voci: readonly Funzione[]) => (
    <section className={stili.gruppo} aria-label={titolo}>
      <h3 className={stili.titoloDelGruppo}>{titolo}</h3>
      {voci.map((f) => {
        const da = chiamataDa(f);
        const giro = giroDi?.(f);
        return (
          <button
            key={f.id}
            type="button"
            className={stili.voce}
            data-voce-funzione={f.id}
            data-aperta={aperte.includes(f.id) ? "" : undefined}
            onClick={() => apri(f.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              menu(f.id, e.clientX, e.clientY);
            }}
          >
            <span className={stili.intestazione}>
              <Intestazione parti={intestazione(f)} />
            </span>
            <span className={stili.chiamataDa}>{da.length === 0 ? testi.nonChiamata : riempi(testi.chiamataDa, { chi: da.join(", ") })}</span>
            {giro !== undefined && (
              <span className={stili.chiamataDa} data-giro="">
                {giro}
              </span>
            )}
          </button>
        );
      })}
    </section>
  );

  return (
    <div
      ref={riquadro}
      role="dialog"
      aria-label={testi.elencoFunzioniTitolo}
      className={stili.elenco}
      style={posizione ?? { left: 0, top: 0, visibility: "hidden" }}
      onKeyDown={tasto}
      data-elenco=""
    >
      <input
        ref={campo}
        type="search"
        className={stili.cerca}
        value={cerca}
        aria-label={testi.cercaFunzione}
        placeholder={testi.cercaFunzioneSegnaposto}
        onChange={(e) => setCerca(e.target.value)}
      />
      {procedure.length > 0 && gruppo(riempi(testi.gruppoProcedure, { n: String(procedure.length) }), procedure)}
      {fs.length > 0 && gruppo(riempi(testi.gruppoFunzioni, { n: String(fs.length) }), fs)}
      {procedure.length + fs.length === 0 && <p className={stili.nessuna}>{testi.nessunaTrovata}</p>}
      <button type="button" className={stili.nuovaDallElenco} data-nuova="" onClick={() => nuova()}>
        {testi.nuovaProceduraOFunzione}
      </button>
    </div>
  );
}
