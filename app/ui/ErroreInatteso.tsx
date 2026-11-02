// Il riparo dell'intera interfaccia: un errore durante il disegno (un calcolo nel render che lancia) lascerebbe la finestra bianca,
// senza una parola. Qui la finestra dice che qualcosa non ha funzionato, nella lingua dell'avvio, e l'errore va nell'elenco degli errori
// dell'app.
//
// `Applicazione` è smontata, e con lei i suoi presidi: per questo il progetto sta fuori da React (`ricordaIlLavoro`), all'ultimo
// aggiornamento riuscito della finestra. I comandi del guscio non dipendono dall'albero di React (misurato), quindi con modifiche non
// salvate il lavoro si salva da qui, e finché non è salvato questa pagina tiene ferme le vie che lo perderebbero: la X, i tasti della
// ricarica, il menu del motore. Senza nulla da perdere il guscio non deve aspettare nessuna domanda: la X chiude.
//
// Nessun componente di Ark UI: meno cose che si possono rompere una seconda volta.
import { Component, useEffect, useState, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import type { Dizionario } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { testoDellErrore } from "./esempi";
import { annota, annotaErrore } from "./errori-dell-app";
import stili from "./ErroreInatteso.module.css";
import { chiudiFinestra, erroreDelFile, eventoDiChiusura, nomeDelFile, scegliFileDaSalvare, scriviProgetto, segnaModificato } from "./file";
import stiliDelleFinestre from "./finestre/Finestra.module.css";
import { lasciaLaPagina } from "./modifiche";
import { baseProposta } from "./nomi";

/** Ciò che serve a salvare il progetto senza la finestra. Il testo si calcola solo se serve. */
export interface LavoroDaSalvare {
  readonly testo: () => string;
  readonly nome: string;
  readonly percorso: string | null;
  /** Da dove parte la finestra del sistema. */
  readonly cartella: string | null;
  readonly modificato: boolean;
}

let lavoro: LavoroDaSalvare | null = null;

export function ricordaIlLavoro(l: LavoroDaSalvare | null): void {
  lavoro = l;
}

const segnaSenzaModifiche = () => segnaModificato(false).catch((e: unknown) => annotaErrore("stato delle modifiche non comunicato", e));

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
      scelto = await scegliFileDaSalvare(proposto, testi.filtroDelFile, l.cartella);
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
      <p role="alert" data-errore-inatteso="" className={stili.frase}>
        {riempi(testi.erroreInattesoSalvato, { file: salvato })}
      </p>
    );

  if (sostituire !== null)
    return (
      <div
        role="alertdialog"
        aria-label={riempi(testi.sostituireTitolo, { file: nomeDelFile(sostituire) })}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSostituire(null);
        }}
      >
        <p className={stili.frase}>{riempi(testi.sostituireTitolo, { file: nomeDelFile(sostituire) })}</p>
        <p className={stili.frase}>{testi.sostituireSpiegazione}</p>
        <div className={stili.comandi}>
          <button type="button" className={stiliDelleFinestre.comando} autoFocus onClick={() => setSostituire(null)}>
            {testi.sostituireRinuncia}
          </button>
          <button type="button" className={stiliDelleFinestre.comando} onClick={() => void scrivi(sostituire)}>
            {testi.sostituireConferma}
          </button>
        </div>
      </div>
    );

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
      <div className={stili.comandi}>
        <button type="button" className={stiliDelleFinestre.comando} autoFocus onClick={() => void salva()}>
          {testi.salvaConNome}
        </button>
        <button type="button" className={stiliDelleFinestre.comando} onClick={chiudi}>
          {testi.erroreInattesoChiudi}
        </button>
      </div>
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
      <p role="alert" data-errore-inatteso="" className={stili.frase}>
        {this.props.testi.erroreInatteso}
      </p>
    );
  }
}
