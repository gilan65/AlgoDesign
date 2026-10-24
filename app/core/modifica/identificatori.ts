// Gli identificatori dei blocchi creati dall'editor (il formato li vuole non vuoti, unici e stabili, e
// lascia all'editor come si generano):
// `b<N>`, con N mai usato nel progetto né, prima, nella stessa sessione. Il progetto nuovo ha la funzione
// principale `f1` e il blocco di fine `b1`. Un identificatore non cambia modificando il blocco.
//
// «Mai usato» comprende i buchi: un `b5` che manca nel progetto non si riempie, perché un caso d'uso può
// ancora nominarlo nell'atteso (un errore atteso sul blocco `b5` cancellato non deve passare a un blocco
// nuovo). Per questo il primo numero libero è il più grande usato più uno, contando anche i blocchi degli
// attesi, e la cronologia ne ricorda il massimo raggiunto (un blocco annullato non restituisce il numero).
//
// Che cosa NON guarda: un numero oltre 2^53 scritto a mano in un file (perde la precisione: il numero
// nuovo può coincidere con uno usato, e allora il lettore rifiuta l'operazione per `id` doppio).

import type { Blocco, Progetto } from "../progetto/modello";

export const idDellaPrincipale = "f1";

const forma = /^b([1-9]\d*)$/;

/** Il numero di un identificatore della forma `b<N>`; `undefined` per ogni altra forma. */
export function numeroDi(id: string): number | undefined {
  const m = forma.exec(id);
  return m ? Number(m[1]) : undefined;
}

export const idDelBlocco = (numero: number) => `b${numero}`;

/** I blocchi dentro un blocco, ramo per ramo. */
export function sottoblocchi(b: Blocco): readonly Blocco[] {
  return b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? b.body : [];
}

/** Ogni identificatore che il progetto usa o nomina: funzioni, blocchi, fine, blocchi degli attesi (dei casi del programma
 * e di ogni procedura o funzione). */
export function idUsati(p: Progetto): string[] {
  const fuori: string[] = [];
  const blocco = (b: Blocco): void => {
    fuori.push(b.id);
    sottoblocchi(b).forEach(blocco);
  };
  for (const f of p.functions) {
    fuori.push(f.id, f.end.id);
    f.body.forEach(blocco);
  }
  for (const caso of [...(p.test_cases ?? []), ...p.functions.flatMap((f) => f.test_cases ?? [])]) {
    const { error, static_error, warnings } = caso.expected;
    for (const s of [error, static_error, ...(warnings ?? [])]) if (s !== undefined) fuori.push(s.block);
  }
  return fuori;
}

/** Il primo numero che nessun identificatore `b<N>` del progetto ha raggiunto. */
export function primoLibero(p: Progetto): number {
  return 1 + idUsati(p).reduce((massimo, id) => Math.max(massimo, numeroDi(id) ?? 0), 0);
}

/** Una copia del blocco col suo sottoalbero, con identificatori nuovi da `primo` in su, in ordine di lettura. */
export function conIdNuovi(b: Blocco, primo: number): { readonly blocco: Blocco; readonly prossimo: number } {
  let prossimo = primo;
  const copia = (x: Blocco): Blocco => {
    const id = idDelBlocco(prossimo++);
    switch (x.kind) {
      case "if":
        return { ...x, id, then: x.then.map(copia), else: x.else.map(copia) };
      case "while":
      case "repeat":
      case "for":
      case "for_each":
        return { ...x, id, body: x.body.map(copia) };
      default:
        return { ...x, id };
    }
  };
  const blocco = copia(b);
  return { blocco, prossimo };
}
