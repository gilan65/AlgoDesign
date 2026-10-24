// I punti di interruzione stanno nel file (il campo `breakpoint` di un blocco o della fine) ma non nella
// cronologia delle modifiche: Annulla e Ripeti non li toccano. All'apertura escono dal progetto e diventano un
// insieme di `id`; si rimettono nel progetto per salvarlo e per sapere se è modificato.
//
// Solo `breakpoint: true` esce dal progetto: un `false` scritto nel file resta dov'è, così il file si risalva
// identico byte per byte. Un `id` dell'insieme che non è più nel progetto (un blocco cancellato) non si scrive;
// se Annulla riporta il blocco, il suo punto torna con lui.
import type { Blocco, Progetto } from "../../core/progetto/modello";

const RAMI = ["then", "else", "body"] as const;

/** I blocchi dentro un blocco, ramo per ramo (quelli di un `se`, il corpo di un ciclo). */
function conIRami(b: Blocco, cambia: (bs: readonly Blocco[]) => readonly Blocco[]): Blocco {
  const r = b as unknown as Record<string, unknown>;
  const nuovo: Record<string, unknown> = { ...r };
  for (const ramo of RAMI) if (Array.isArray(r[ramo])) nuovo[ramo] = cambia(r[ramo] as Blocco[]);
  return nuovo as unknown as Blocco;
}

function visita(bs: readonly Blocco[], f: (b: Blocco) => void): void {
  for (const b of bs) {
    f(b);
    const r = b as unknown as Record<string, unknown>;
    for (const ramo of RAMI) if (Array.isArray(r[ramo])) visita(r[ramo] as Blocco[], f);
  }
}

/** Gli `id` dei blocchi e delle fini con un punto di interruzione. */
export function puntiDi(p: Progetto): ReadonlySet<string> {
  const punti = new Set<string>();
  for (const f of p.functions) {
    visita(f.body, (b) => {
      if (b.breakpoint === true) punti.add(b.id);
    });
    if (f.end.breakpoint === true) punti.add(f.end.id);
  }
  return punti;
}

/** Il progetto con i punti dell'insieme e senza gli altri `breakpoint: true`. */
export function conPunti(p: Progetto, punti: ReadonlySet<string>): Progetto {
  const segna = <T extends { readonly id: string; readonly breakpoint?: boolean }>(x: T): T => {
    if (punti.has(x.id)) return { ...x, breakpoint: true };
    if (x.breakpoint !== true) return x;
    const { breakpoint: _, ...senza } = x;
    return senza as T;
  };
  const blocchi = (bs: readonly Blocco[]): readonly Blocco[] => bs.map((b) => conIRami(segna(b), blocchi));
  return { ...p, functions: p.functions.map((f) => ({ ...f, body: blocchi(f.body), end: segna(f.end) })) };
}

/** Il progetto senza nessun `breakpoint: true`: quello che entra nella cronologia. */
export const senzaPunti = (p: Progetto): Progetto => conPunti(p, new Set());
