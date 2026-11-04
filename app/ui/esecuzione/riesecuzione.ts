// Ogni motivo per cui una riesecuzione non arriva allo stesso passaggio, in parole: una voce per motivo.
import type { MotivoDelNonRitrovato } from "../../core/esecuzione/ripartenza";
import type { Dizionario } from "../../i18n/it";

export const paroleDelMotivo: Record<MotivoDelNonRitrovato, keyof Dizionario> = {
  posto_cancellato: "rieseguiPostoCancellato",
  non_parte: "rieseguiNonParte",
  finito_prima: "rieseguiFinitoPrima",
  riga_mancante: "rieseguiRigaMancante",
  riga_per_un_altro_dato: "rieseguiRigaPerUnAltroDato",
  riga_non_ammessa: "rieseguiRigaNonAmmessa",
  riga_ora_rifiutata: "rieseguiRigaOraRifiutata",
  riga_ora_valida: "rieseguiRigaOraValida",
  modifica_persa: "rieseguiModificaPersa",
  modifica_rifiutata: "rieseguiModificaRifiutata",
};
