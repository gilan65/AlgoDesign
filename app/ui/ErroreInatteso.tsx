// Il riparo dell'intera interfaccia: un errore durante il disegno (un calcolo nel render che lancia) lascerebbe la finestra bianca,
// senza una parola. Qui la finestra dice che qualcosa non ha funzionato, nella lingua dell'avvio, e l'errore va nell'elenco degli errori
// dell'app.
//
// `Applicazione` è smontata, e con lei i suoi presidi: per questo il progetto sta fuori da React (`ricordaIlLavoro`), all'ultimo
// aggiornamento riuscito della finestra. I comandi del guscio non dipendono dall'albero di React (misurato), quindi con modifiche non
// salvate il lavoro si salva da qui, e finché non è salvato questa pagina tiene ferme le vie che lo perderebbero: la X, i tasti della
// ricarica, il menu del motore. Senza nulla da perdere il guscio non deve aspettare nessuna domanda: la X chiude.
//
// Con e senza modifiche da qui si salva anche il file per una segnalazione: l'elenco degli errori sta solo in memoria, e senza questo passo un
// errore nel disegno non arriverebbe mai in un file. Il testo si compone solo se viene chiesto, e si mostra prima di scrivere, come nella finestra.
//
// Nessun componente di Ark UI: meno cose che si possono rompere una seconda volta.
import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import type { Dizionario } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { testoDellErrore } from "./esempi";
import { annota, annotaErrore } from "./errori-dell-app";
import stili from "./ErroreInatteso.module.css";
import { chiudiFinestra, erroreDelFile, eventoDiChiusura, nomeDelFile, scegliFileDaSalvare, scegliFileDelCodice, scriviProgetto, segnaModificato } from "./file";
import { CorpoDellaSegnalazione } from "./finestre/CorpoDellaSegnalazione";
import stiliDelleFinestre from "./finestre/Finestra.module.css";
import { lasciaLaPagina } from "./modifiche";
import { baseProposta, senzaVietati } from "./nomi";
import type { PerSegnalare } from "./segnalazione";

/** Ciò che serve a salvare il progetto senza la finestra. Il testo si calcola solo se serve. */
export interface LavoroDaSalvare {
  readonly testo: () => string;
  readonly nome: string;
  readonly percorso: string | null;
  /** Da dove parte la finestra del sistema. */
  readonly cartella: string | null;
  readonly modificato: boolean;
  /** Il testo per una segnalazione: si compone solo se serve, e può lanciare. */
  readonly segnalazione: () => PerSegnalare;
}

let lavoro: LavoroDaSalvare | null = null;

export function ricordaIlLavoro(l: LavoroDaSalvare | null): void {
  lavoro = l;
}

const segnaSenzaModifiche = () => segnaModificato(false).catch((e: unknown) => annotaErrore("stato delle modifiche non comunicato", e));

function DomandaSostituire({ testi, percorso, rispondi }: { testi: Dizionario; percorso: string; rispondi: (sostituisci: boolean) => void }): ReactElement {
  return (
    <div
      role="alertdialog"
      aria-label={riempi(testi.sostituireTitolo, { file: nomeDelFile(percorso) })}
      onKeyDown={(e) => {
        if (e.key === "Escape") rispondi(false);
      }}
    >
      <p className={stili.frase}>{riempi(testi.sostituireTitolo, { file: nomeDelFile(percorso) })}</p>
      <p className={stili.frase}>{testi.sostituireSpiegazione}</p>
      <div className={stili.comandi}>
        <button type="button" className={stiliDelleFinestre.comando} autoFocus onClick={() => rispondi(false)}>
          {testi.sostituireRinuncia}
        </button>
        <button type="button" className={stiliDelleFinestre.comando} onClick={() => rispondi(true)}>
          {testi.sostituireConferma}
        </button>
      </div>
    </div>
  );
}

/** Il comando per segnalare e, chiesto, il testo esatto al suo posto. `children` dispone il pulsante fra gli altri della pagina. */
function DaSegnalare({ testi, lavoro: l, primo = false, children }: { testi: Dizionario; lavoro: LavoroDaSalvare; primo?: boolean; children: (pulsante: ReactElement) => ReactNode }): ReactElement {
  const [segnalazione, setSegnalazione] = useState<PerSegnalare | null>(null);
  const testo = segnalazione?.testo ?? null;
  const [sostituire, setSostituire] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const alTesto = useCallback((sezione: HTMLElement | null) => sezione?.querySelector("pre")?.focus(), []);

  function apri(): void {
    setEsito(null);
    try {
      setSegnalazione(l.segnalazione());
    } catch (e) {
      annotaErrore("testo per la segnalazione non preparato", e);
      setEsito(testi.segnalaNonPreparato);
    }
  }

  const nonSalvato = (file: string, e: unknown) => setEsito(`${riempi(testi.segnalaErroreTitolo, { file })}: ${testoDellErrore(erroreDelFile(e), testi)}`);

  async function scrivi(percorso: string, t: string): Promise<void> {
    setSostituire(null);
    try {
      await scriviProgetto(percorso, t);
    } catch (e) {
      nonSalvato(nomeDelFile(percorso), e);
      return;
    }
    setSegnalazione(null);
    setEsito(riempi(testi.segnalaSalvatoIn, { file: nomeDelFile(percorso) }));
  }

  async function salva(t: string): Promise<void> {
    setEsito(null);
    const proposto = riempi(testi.nomeDellaSegnalazione, { nome: senzaVietati(l.nome) || testi.ripiegoDelNomeDelFile });
    let scelto;
    try {
      scelto = await scegliFileDelCodice(testi.titoloSalvaSegnalazione, proposto, testi.filtroDellaSegnalazione, ".txt", l.cartella);
    } catch (e) {
      nonSalvato(proposto, e);
      return;
    }
    if (scelto === null) return;
    if (scelto.sostituire) setSostituire(scelto.percorso);
    else await scrivi(scelto.percorso, t);
  }

  const frase =
    esito !== null ? (
      <p role="alert" data-esito-della-segnalazione="" className={stili.frase}>
        {esito}
      </p>
    ) : null;

  if (testo !== null && sostituire !== null) return <DomandaSostituire testi={testi} percorso={sostituire} rispondi={(si) => (si ? void scrivi(sostituire, testo) : setSostituire(null))} />;

  if (segnalazione !== null && testo !== null)
    return (
      <section
        ref={alTesto}
        aria-label={testi.segnalaTitolo}
        className={stili.segnalazione}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSegnalazione(null);
        }}
      >
        <h2 className={stiliDelleFinestre.titolo}>{testi.segnalaTitolo}</h2>
        <CorpoDellaSegnalazione segnalazione={segnalazione} testi={testi} />
        {frase}
        <div className={stili.comandi}>
          <button type="button" className={stiliDelleFinestre.comando} onClick={() => setSegnalazione(null)}>
            {testi.annullaEsc}
          </button>
          <button type="button" className={stiliDelleFinestre.comando} onClick={() => void salva(testo)}>
            {testi.segnalaSalva}
          </button>
        </div>
      </section>
    );

  return (
    <>
      {children(
        <button type="button" className={stiliDelleFinestre.comando} autoFocus={primo} onClick={apri}>
          {testi.segnalaComando}
        </button>,
      )}
      {frase}
    </>
  );
}

function DaSalvare({ testi, lavoro: l }: { testi: Dizionario; lavoro: LavoroDaSalvare }): ReactElement {
  const [salvato, setSalvato] = useState<string | null>(null);
  const [sostituire, setSostituire] = useState<string | null>(null);
  const [chiusuraChiesta, setChiusuraChiesta] = useState(false);
  const [errore, setErrore] = useState<{ titolo: string; testo: string } | null>(null);

  // Finché il lavoro è solo qui: come fa `Applicazione` quando c'è.
  useEffect(() => {
    if (salvato !== null) return;
    const tasto = (e: KeyboardEvent) => {
      if (lasciaLaPagina(e)) e.preventDefault();
    };
    const menu = (e: MouseEvent) => e.preventDefault();
    const lascia = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "modificato";
    };
    const chiusura = () => setChiusuraChiesta(true);
    window.addEventListener("keydown", tasto, true);
    window.addEventListener("contextmenu", menu, true);
    window.addEventListener("beforeunload", lascia);
    window.addEventListener(eventoDiChiusura, chiusura);
    return () => {
      window.removeEventListener("keydown", tasto, true);
      window.removeEventListener("contextmenu", menu, true);
      window.removeEventListener("beforeunload", lascia);
      window.removeEventListener(eventoDiChiusura, chiusura);
    };
  }, [salvato]);

  async function scrivi(percorso: string): Promise<void> {
    setSostituire(null);
    try {
      await scriviProgetto(percorso, l.testo());
    } catch (e) {
      setErrore({ titolo: riempi(testi.salvaErroreTitolo, { file: nomeDelFile(percorso) }), testo: testoDellErrore(erroreDelFile(e), testi) });
      return;
    }
    setSalvato(nomeDelFile(percorso));
    void segnaSenzaModifiche();
  }

  async function salva(): Promise<void> {
    setErrore(null);
    const proposto = l.percorso !== null ? nomeDelFile(l.percorso) : `${baseProposta(l.nome, testi.ripiegoDelNomeDelFile)}.algo`;
    let scelto;
    try {
      scelto = await scegliFileDaSalvare(testi.titoloSalvaConNome, proposto, testi.filtroDelFile, l.cartella);
    } catch (e) {
      setErrore({ titolo: riempi(testi.salvaErroreTitolo, { file: proposto }), testo: testoDellErrore(erroreDelFile(e), testi) });
      return;
    }
    if (scelto === null) return;
    if (scelto.sostituire) setSostituire(scelto.percorso);
    else await scrivi(scelto.percorso);
  }

  function chiudi(): void {
    // Se la finestra non si chiude, il guscio non aspetti più nessuno: la X dopo chiude.
    chiudiFinestra().catch((e: unknown) => {
      annotaErrore("finestra non chiusa", e);
      void segnaSenzaModifiche();
    });
  }

  if (salvato !== null)
    return (
      <div>
        <p role="alert" data-errore-inatteso="" className={stili.frase}>
          {riempi(testi.erroreInattesoSalvato, { file: salvato })}
        </p>
        <DaSegnalare testi={testi} lavoro={l} primo>
          {(pulsante) => <div className={stili.comandi}>{pulsante}</div>}
        </DaSegnalare>
      </div>
    );

  if (sostituire !== null) return <DomandaSostituire testi={testi} percorso={sostituire} rispondi={(si) => (si ? void scrivi(sostituire) : setSostituire(null))} />;

  return (
    <div>
      <p role="alert" data-errore-inatteso="" className={stili.frase}>
        {testi.erroreInattesoConModifiche}
      </p>
      {chiusuraChiesta ? <p className={stili.frase}>{testi.erroreInattesoAllaChiusura}</p> : null}
      {errore !== null ? (
        <p role="alert" data-errore-del-salvataggio="" className={stili.frase}>
          {errore.titolo}: {errore.testo}
        </p>
      ) : null}
      <DaSegnalare testi={testi} lavoro={l}>
        {(pulsante) => (
          <div className={stili.comandi}>
            <button type="button" className={stiliDelleFinestre.comando} autoFocus onClick={() => void salva()}>
              {testi.salvaConNome}
            </button>
            {pulsante}
            <button type="button" className={stiliDelleFinestre.comando} onClick={chiudi}>
              {testi.erroreInattesoChiudi}
            </button>
          </div>
        )}
      </DaSegnalare>
    </div>
  );
}

export class ErroreInatteso extends Component<{ testi: Dizionario; children: ReactNode }, { errore: boolean }> {
  override state = { errore: false };

  static getDerivedStateFromError(): { errore: boolean } {
    return { errore: true };
  }

  override componentDidCatch(errore: unknown, info: ErrorInfo): void {
    console.error("interfaccia interrotta:", errore, info.componentStack);
    annota("drawing", "", errore, info.componentStack ?? "");
    if (!lavoro?.modificato) void segnaSenzaModifiche();
  }

  override render(): ReactNode {
    if (!this.state.errore) return this.props.children;
    if (lavoro?.modificato) return <DaSalvare testi={this.props.testi} lavoro={lavoro} />;
    return (
      <div>
        <p role="alert" data-errore-inatteso="" className={stili.frase}>
          {this.props.testi.erroreInatteso}
        </p>
        {lavoro !== null && (
          <DaSegnalare testi={this.props.testi} lavoro={lavoro} primo>
            {(pulsante) => <div className={stili.comandi}>{pulsante}</div>}
          </DaSegnalare>
        )}
      </div>
    );
  }
}
