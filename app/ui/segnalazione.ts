// Il testo per segnalare un malfunzionamento, in un punto solo: l'esecuzione com'è adesso o, con la registrazione attiva, quelle registrate; e,
// dati una volta sola, ciò che il file vuole dire oltre a loro. Si calcola una volta per ogni apertura: chi lo mostra e chi lo scrive hanno la
// stessa stringa, e l'esecuzione può andare avanti nel frattempo. Può lanciare (`testoDellaRegistrazione` rilegge ciò che ha composto): lo prende
// chi lo chiede.
import type { Esecuzione } from "../core/esecuzione/esecuzione";
import type { CasoDiUnaFunzione } from "../core/progetto/modello";
import { componi, fotografa, type Fotografia } from "../core/registrazione/composizione";
import { testoDellaRegistrazione } from "../core/registrazione/formato";
import type { InRegistrazione } from "../core/registrazione/in-registrazione";
import type { Lingua } from "../i18n/lingue";
import { erroriDellApp } from "./errori-dell-app";
import { sistemaDelMotore } from "./piattaforma";
import { versione } from "./prodotto";

/** Il testo del file; `registrate`, se viene da una registrazione attiva: quante esecuzioni ha e quante non ha più. */
export interface PerSegnalare {
  readonly testo: string;
  readonly registrate: { readonly numero: number; readonly perse: number } | null;
}

const testoDi = (lingua: Lingua, fotografie: readonly Fotografia[], perse: number): string => {
  const { voci, perse: erroriPersi } = erroriDellApp();
  return testoDellaRegistrazione(componi({ versione, lingua, sistema: sistemaDelMotore(), erroriDellApp: voci, erroriPersi }, fotografie, perse));
};

/** Con una registrazione che ha esecuzioni, quelle (l'aperta compresa); se no l'esecuzione data. */
export function perSegnalare(lingua: Lingua, es: Esecuzione<CasoDiUnaFunzione> | null, registrazione: InRegistrazione | null): PerSegnalare {
  if (registrazione !== null && registrazione.numero > 0) {
    const { fotografie, perse } = registrazione.composizione(erroriDellApp().voci);
    return { testo: testoDi(lingua, fotografie, perse), registrate: { numero: fotografie.length, perse } };
  }
  if (es === null) throw new Error("nessuna esecuzione da segnalare");
  return { testo: testoDi(lingua, [fotografa(es)], 0), registrate: null };
}
