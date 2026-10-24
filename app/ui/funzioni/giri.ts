// I giri della ricorsione in parole (un'informazione su ciò che il progetto fa, non un errore): «La funzione «conta»
// chiama sé stessa», «La funzione «pari» chiama «dispari», che chiama di nuovo «pari»». I giri li dà il nucleo
// (`giriDellaRicorsione`); qui solo le parole.
import type { Funzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";

/** La frase di ogni giro, nell'ordine, e quella del giro di ogni funzione (per `id`). */
export function frasiDeiGiri(giri: readonly (readonly Funzione[])[], testi: Dizionario): { readonly frasi: readonly string[]; readonly diFunzione: ReadonlyMap<string, string> } {
  const diFunzione = new Map<string, string>();
  const frasi = giri.map((giro) => {
    const [prima, ...altre] = giro;
    const chi = riempi(prima!.kind === "function" ? testi.ricorsioneFunzione : testi.ricorsioneProcedura, { nome: prima!.name ?? "" });
    const frase =
      altre.length === 0
        ? riempi(testi.ricorsioneSeStessa, { chi })
        : [riempi(testi.ricorsioneChiama, { chi, nome: altre[0]!.name ?? "" }), ...altre.slice(1).map((f) => riempi(testi.ricorsioneChePoi, { nome: f.name ?? "" })), riempi(testi.ricorsioneDiNuovo, { nome: prima!.name ?? "" })].join("");
    for (const f of giro) if (!diFunzione.has(f.id)) diFunzione.set(f.id, frase);
    return frase;
  });
  return { frasi, diFunzione };
}
