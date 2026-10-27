// Ciò che manca a un progetto perché si scriva nel linguaggio scelto, come lo mostra la colonna del codice: per ogni
// mancanza del nucleo la frase breve, il posto in parole, il suggerimento che la riga di stato mostra col clic, e dove
// porta il clic. Il posto viene dalla mancanza: il blocco (o la fine di una funzione, cioè ciò che restituisce), il dato
// (con la funzione che lo possiede, o del programma principale, o una costante comune), la sola funzione (il risultato,
// o il nome).
import { figliDelBlocco } from "../../core/controllo/controllo";
import type { Mancanza } from "../../core/genera/forma";
import type { Blocco, Funzione, Progetto } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { testiDelleMancanze } from "../../i18n/mancanze";
import { nomiDegliOperatori } from "../../i18n/operatori";

/** Dove porta il clic: la scheda della funzione e, dentro, il blocco da scegliere, la fine (ciò che restituisce) o il dato
 * della vista dei dati (`comune` per una costante comune); con la sola funzione, la sua scheda. */
export type DoveVaIlClic =
  | { readonly funzione: string; readonly blocco: string }
  | { readonly funzione: string; readonly fine: string }
  | { readonly funzione: string; readonly dato: string; readonly comune: boolean }
  | { readonly funzione: string };

export interface VoceDellaMancanza {
  readonly breve: string;
  readonly posto: string;
  readonly suggerimento: string;
  readonly clic: DoveVaIlClic;
}

const contiene = (s: readonly Blocco[], id: string): boolean => s.some((b) => b.id === id || contiene(figliDelBlocco(b), id));

/** Le voci dell'elenco, una per mancanza e nello stesso ordine. `nomeDelBlocco` è il nome che l'interfaccia dà a un
 * blocco o alla fine di una funzione (lo stesso degli annunci). */
export function vociDelleMancanze(mancanze: readonly Mancanza[], p: Progetto, lingua: Lingua, testi: Dizionario, nomeDelBlocco: (id: string) => string): VoceDellaMancanza[] {
  const principale = p.functions.find((f) => f.kind === "main")!;
  const dove = (f: Funzione) =>
    f.kind === "main" ? testi.doveProgramma : riempi(f.kind === "procedure" ? testi.doveProcedura : testi.doveFunzione, { nome: f.name ?? "" });
  const comuni = new Set((p.shared_constants ?? []).map((d) => d.name));
  return mancanze.map((m) => {
    const t = testiDelleMancanze[lingua][m.specie];
    // Gli operatori di una mancanza sono tutti a parola (il meno e `not` ci sono anche in «Accademico»).
    const nomi: Readonly<Record<string, string>> = nomiDegliOperatori[lingua];
    const breve = riempi(t.breve, { operatore: m.operatore === undefined ? "" : (nomi[m.operatore] ?? m.operatore) });
    const voce = (posto: string, clic: DoveVaIlClic): VoceDellaMancanza => ({ breve, posto, suggerimento: t.suggerimento, clic });
    if (m.blocco !== undefined) {
      const fine = p.functions.find((f) => f.end.id === m.blocco);
      if (fine) return voce(riempi(testi.postoRestituisce, { dove: dove(fine) }), { funzione: fine.id, fine: m.blocco });
      const f = p.functions.find((x) => contiene(x.body, m.blocco!)) ?? principale;
      return voce(riempi(testi.postoBlocco, { blocco: nomeDelBlocco(m.blocco), dove: dove(f) }), { funzione: f.id, blocco: m.blocco });
    }
    if (m.dato !== undefined) {
      const f = m.funzione === undefined ? undefined : p.functions.find((x) => x.id === m.funzione);
      if (f) return voce(riempi(testi.postoDato, { dato: m.dato, dove: dove(f) }), { funzione: f.id, dato: m.dato, comune: false });
      // Senza funzione: un dato del programma principale, o una costante comune (nessun dato può averne il nome).
      if (comuni.has(m.dato)) return voce(riempi(testi.postoCostanteComune, { dato: m.dato }), { funzione: principale.id, dato: m.dato, comune: true });
      return voce(riempi(testi.postoDato, { dato: m.dato, dove: dove(principale) }), { funzione: principale.id, dato: m.dato, comune: false });
    }
    const f = p.functions.find((x) => x.id === m.funzione) ?? principale;
    return voce(riempi(m.specie === "parola-del-linguaggio" ? testi.postoNome : testi.postoRisultato, { dove: dove(f) }), { funzione: f.id });
  });
}
