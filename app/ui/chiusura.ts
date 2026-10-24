// La chiusura automatica nei campi di un'espressione: una parentesi o un apice aperti si chiudono da sé, col cursore
// dentro; la chiusura scritta sopra quella già presente la salta, ⌫ subito dopo l'apertura toglie la coppia, e un testo
// selezionato si racchiude. Dentro un testo fra virgolette (o un carattere fra apici) una parentesi è un carattere
// qualunque, e un apice è l'apostrofo di una parola. Le graffe si chiudono da sé solo nel campo della lista dei valori di
// un vettore, l'unico dove si scrivono.
//
// La regola (`chiusura`) è pura: dal testo, dalla selezione e dal tasto, la modifica. Chi la applica (`applicaLaChiusura`)
// scrive col comando di modifica del motore, perché Ctrl+Z tolga la coppia in un colpo solo come la scrittura; senza il
// comando (sotto happy-dom) scrive il valore e manda l'evento di input.

/** Ciò che un tasto fa: sostituire `da`–`a` con `testo` e mettere il cursore in `cursore`, o solo spostare il cursore. */
export type Modifica =
  | { readonly genere: "scrivi"; readonly da: number; readonly a: number; readonly testo: string; readonly cursore: number }
  | { readonly genere: "salta"; readonly cursore: number };

const chiusure: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
/** I caratteri davanti ai quali un'apertura si chiude: la fine del testo, uno spazio, una chiusura, una virgola. */
const davanti = (c: string | undefined) => c === undefined || c === " " || c === "\t" || c === ")" || c === "]" || c === "}" || c === ",";
/** Un carattere di una parola: una lettera, una cifra, il trattino basso. */
const parola = (c: string | undefined) => c !== undefined && (c === "_" || /\p{Letter}|\p{Number}/u.test(c));

/** Dove sta la posizione `pos`: dentro un letterale aperto da `"` o da `'` (e se subito dopo una barra rovesciata che vale
 * per il carattere seguente), o fuori. Il testo si legge dal principio, con le sequenze di escape. */
export function contesto(testo: string, pos: number): { readonly aperto: '"' | "'" | null; readonly dopoLaBarra: boolean } {
  let aperto: '"' | "'" | null = null;
  let barra = false;
  for (let i = 0; i < pos; i++) {
    const c = testo[i];
    if (aperto === null) {
      if (c === '"' || c === "'") aperto = c;
    } else if (barra) barra = false;
    else if (c === "\\") barra = true;
    else if (c === aperto) aperto = null;
  }
  return { aperto, dopoLaBarra: barra };
}

/** La modifica del tasto `tasto` (il carattere scritto, o `Backspace`) sul testo con la selezione `inizio`–`fine`;
 * `undefined` se il tasto fa ciò che fa sempre. `elenco`: il campo è la lista dei valori di un vettore, con le graffe. */
export function chiusura(testo: string, inizio: number, fine: number, tasto: string, elenco = false): Modifica | undefined {
  const { aperto, dopoLaBarra } = contesto(testo, inizio);
  const scelto = testo.slice(inizio, fine);
  const dopo = testo[inizio];
  if (tasto === "Backspace") {
    // ⌫ fra un'apertura e la sua chiusura, senza niente in mezzo: via tutte e due.
    const prima = testo[inizio - 1];
    if (inizio !== fine || prima === undefined || chiusure[prima] !== dopo || contesto(testo, inizio - 1).aperto !== null) return undefined;
    return { genere: "scrivi", da: inizio - 1, a: inizio + 1, testo: "", cursore: inizio - 1 };
  }
  if (tasto === ")" || tasto === "]" || (tasto === "}" && elenco)) return aperto === null && inizio === fine && dopo === tasto ? { genere: "salta", cursore: inizio + 1 } : undefined;
  if (tasto === '"' || tasto === "'") {
    // Dentro il letterale che il tasto chiude: si salta la chiusura che c'è già; altrove dentro un letterale, niente.
    if (aperto !== null) return aperto === tasto && !dopoLaBarra && inizio === fine && dopo === tasto ? { genere: "salta", cursore: inizio + 1 } : undefined;
    if (inizio !== fine) return { genere: "scrivi", da: inizio, a: fine, testo: tasto + scelto + tasto, cursore: fine + 2 };
    return davanti(dopo) && !parola(testo[inizio - 1]) ? { genere: "scrivi", da: inizio, a: fine, testo: tasto + tasto, cursore: inizio + 1 } : undefined;
  }
  if (tasto === "(" || tasto === "[" || (tasto === "{" && elenco)) {
    if (aperto !== null) return undefined;
    if (inizio !== fine) return { genere: "scrivi", da: inizio, a: fine, testo: tasto + scelto + chiusure[tasto], cursore: fine + 2 };
    return davanti(dopo) ? { genere: "scrivi", da: inizio, a: fine, testo: tasto + chiusure[tasto], cursore: inizio + 1 } : undefined;
  }
  return undefined;
}

/** Il segno dei campi di un'espressione, che chiudono da sé: un attributo, letto da `applicaLaChiusura`. */
export const segnoDellEspressione = { "data-espressione": "" } as const;
/** Il segno del campo della lista dei valori di un vettore, dove si chiudono da sé anche le graffe. */
export const segnoDellElenco = { "data-espressione": "elenco" } as const;

/** Applica la chiusura a un tasto premuto in un campo segnato; dice se l'ha applicata (e il tasto non va oltre). */
export function applicaLaChiusura(e: KeyboardEvent): boolean {
  const campo = e.target;
  if (!(campo instanceof HTMLInputElement) || campo.dataset.espressione === undefined) return false;
  // Le quadre e le graffe della tastiera italiana si scrivono con AltGr, che su Windows arriva come Ctrl+Alt, e sul Mac con
  // Opzione (Alt): scrivono, non sono comandi. Comandi sono Ctrl senza Alt e Cmd.
  if ((e.ctrlKey && !e.altKey) || e.metaKey || e.isComposing) return false;
  const inizio = campo.selectionStart;
  const fine = campo.selectionEnd;
  if (inizio === null || fine === null) return false;
  const m = chiusura(campo.value, inizio, fine, e.key, campo.dataset.espressione === "elenco");
  if (m === undefined) return false;
  e.preventDefault();
  if (m.genere === "scrivi") {
    campo.setSelectionRange(m.da, m.a);
    const fatto = typeof document.execCommand === "function" && document.execCommand(m.testo === "" ? "delete" : "insertText", false, m.testo);
    if (!fatto) {
      const scrivi = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      scrivi.call(campo, campo.value.slice(0, m.da) + m.testo + campo.value.slice(m.a));
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  campo.setSelectionRange(m.cursore, m.cursore);
  return true;
}
