// Ogni motivo per cui una riesecuzione non arriva allo stesso passaggio, in parole: una voce per motivo. Lo stesso per un valore scritto a mano e rifiutato.
import type { EsitoDellaModifica } from "../../core/esecuzione/esecuzione";
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

/** Una finestra su un valore che non si è potuto scrivere: i modelli hanno `{dato}`, e quello del valore non valido anche `{testo}`. I motivi che dicono un difetto dell'app o un
 * momento passato (la funzione non più attiva, il dato sconosciuto) dicono soltanto che adesso non si può. */
export const paroleDelRifiuto: Record<Extract<EsitoDellaModifica, { ok: false }>["motivo"], keyof Dizionario> = {
  non_valido: "modificaNonValido",
  troppo_lungo: "modificaTroppoLungo",
  costante: "modificaCostante",
  caso: "modificaNelCaso",
  non_ora: "modificaNonOra",
  funzione_non_attiva: "modificaNonOra",
  dato_sconosciuto: "modificaNonOra",
  elemento_sconosciuto: "modificaNonOra",
};
