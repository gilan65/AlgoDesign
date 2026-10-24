// Il riparo dell'intera interfaccia: un errore durante il disegno (un calcolo nel render che lancia) lascerebbe
// la finestra bianca, senza una parola. Qui la finestra dice che qualcosa non ha funzionato, nella lingua
// dell'avvio, e l'errore va nella console. Il guscio non deve più aspettare la domanda sulle modifiche: chi la
// faceva non c'è più, e la X o l'uscita dal Mac non chiuderebbero mai (le modifiche, d'altra parte, non si possono più
// salvare).
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Dizionario } from "../i18n/it";
import { segnaModificato } from "./file";

export class ErroreInatteso extends Component<{ testi: Dizionario; children: ReactNode }, { errore: boolean }> {
  override state = { errore: false };

  static getDerivedStateFromError(): { errore: boolean } {
    return { errore: true };
  }

  override componentDidCatch(errore: unknown, info: ErrorInfo): void {
    console.error("interfaccia interrotta:", errore, info.componentStack);
    segnaModificato(false).catch((e: unknown) => console.error("stato delle modifiche non comunicato:", e));
  }

  override render(): ReactNode {
    if (!this.state.errore) return this.props.children;
    return (
      <p role="alert" data-errore-inatteso="">
        {this.props.testi.erroreInatteso}
      </p>
    );
  }
}
