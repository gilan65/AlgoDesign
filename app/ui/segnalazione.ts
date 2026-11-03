// Il testo per segnalare un malfunzionamento, in un punto solo: l'esecuzione com'è adesso e, dati una volta sola, ciò che il file vuole dire
// oltre a lei. Si calcola una volta per ogni apertura: chi lo mostra e chi lo scrive hanno la stessa stringa, e l'esecuzione può andare
// avanti nel frattempo. Può lanciare (`testoDellaRegistrazione` rilegge ciò che ha composto): lo prende chi lo chiede.
import type { Esecuzione } from "../core/esecuzione/esecuzione";
import type { CasoDiUnaFunzione } from "../core/progetto/modello";
import { componi, fotografa } from "../core/registrazione/composizione";
import { testoDellaRegistrazione } from "../core/registrazione/formato";
import type { Lingua } from "../i18n/lingue";
import { erroriDellApp } from "./errori-dell-app";
import { sistemaDelMotore } from "./piattaforma";
import { versione } from "./prodotto";

export function testoPerSegnalare(es: Esecuzione<CasoDiUnaFunzione>, lingua: Lingua): string {
  const { voci, perse } = erroriDellApp();
  return testoDellaRegistrazione(componi({ versione, lingua, sistema: sistemaDelMotore(), erroriDellApp: voci, erroriPersi: perse }, [fotografa(es)]));
}
