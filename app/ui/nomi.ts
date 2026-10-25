// Le regole dei nomi dei file e delle cartelle che l'app scrive: le stesse del guscio (`shell/src/progetto.rs`), provate
// sulla tabella comune `shell/src/nomi.json` da `cargo test` e da `bun test`. Senza dipendenze: le usa anche il guscio
// simulato delle prove nel browser.

/** I caratteri che Windows non ammette in un nome di file o di cartella (oltre a quelli di controllo). */
export const caratteriVietati = '\\/:*?"<>|';

/** Un carattere vietato o di controllo, come `is_control` del guscio: anche U+007F e U+0080…U+009F. */
export const vietato = (c: string) => caratteriVietati.includes(c) || /\p{Cc}/u.test(c);

/** Un nome che Windows riserva ai dispositivi (`CON`, `PRN`, `AUX`, `NUL`, `COM` e `LPT` con una cifra, anche in
 * apice), a meno delle maiuscole: conta la parte prima del primo punto, senza gli spazi in fondo («nul.algo», «Con
 * .algo»). Lo stesso predicato del guscio (`nome_riservato`). */
export function nomeRiservato(nome: string): boolean {
  const base = nome.split(".")[0]!.replace(/ +$/, "").toUpperCase();
  return ["CON", "PRN", "AUX", "NUL"].includes(base) || /^(COM|LPT)[0-9¹²³]$/u.test(base);
}

/** Il nome di un gruppo nuovo che una sottocartella può avere (`nome_di_gruppo_valido` del guscio: niente separatori,
 * niente caratteri vietati o di controllo, niente punto in testa, niente spazio o punto in fondo, nessun nome
 * riservato). */
export function gruppoValido(nome: string): boolean {
  return nome.trim() !== "" && ![...nome].some(vietato) && !nome.startsWith(".") && !/[ .]$/.test(nome) && !nomeRiservato(nome);
}

/** Il nome del progetto senza i caratteri vietati e di controllo, senza gli spazi ai lati né i punti in testa (può
 * restare vuoto). */
export const senzaVietati = (nomeDelProgetto: string) => [...nomeDelProgetto].filter((c) => !vietato(c)).join("").trim().replace(/^\.+/, "").trim();

/** Il nome di un file (senza l'estensione) per un progetto di quel nome: tolti i caratteri vietati e di controllo, gli
 * spazi ai lati e i punti in testa; se non resta nulla, `ripiego` (una parola dei dizionari); un nome riservato seguito
 * da un punto ha il punto cambiato in trattino basso («CON.x» → «CON_x»), così il nome non è più riservato. */
export function baseDelNome(nomeDelProgetto: string, ripiego: string): string {
  const intero = senzaVietati(nomeDelProgetto) || ripiego;
  return nomeRiservato(intero) && intero.includes(".") ? intero.replace(".", "_") : intero;
}

/** Il nome proposto per un file del progetto, del codice o della tabella (senza l'estensione): `baseDelNome`, e un nome
 * che Windows riserva prende « (2)», come gli esempi («con» → «con (2)»). */
export function baseProposta(nomeDelProgetto: string, ripiego: string): string {
  const base = baseDelNome(nomeDelProgetto, ripiego);
  return nomeRiservato(base) ? `${base} (2)` : base;
}

/** Perché il file proposto non si chiama come il progetto: un nome che Windows riserva (anche dopo aver tolto i caratteri
 * vietati), o dei caratteri tolti. */
export function motivoDelCambio(nomeDelProgetto: string): "riservato" | "caratteri" {
  return nomeRiservato(senzaVietati(nomeDelProgetto)) ? "riservato" : "caratteri";
}

/** Il nome di un file (senza l'estensione) che lo studente scrive nell'avviso: non vuoto, senza spazi ai lati, senza
 * caratteri vietati o di controllo, senza punto in testa né punto o spazio in fondo, e non riservato con l'estensione. */
export function nomeDiFileValido(base: string, estensione: string): boolean {
  return base !== "" && base.trim() === base && ![...base].some(vietato) && !base.startsWith(".") && !/[ .]$/.test(base) && !nomeRiservato(`${base}${estensione}`);
}

/** Il file proposto non si chiama come il progetto (caratteri tolti, un nome riservato): l'app lo dice prima della
 * finestra del sistema. Un progetto senza nome no: non c'è un nome da cambiare. */
export const nomeCambiato = (nomeDelProgetto: string, base: string) => nomeDelProgetto.trim() !== "" && base !== nomeDelProgetto.trim();

/** Il nome di un file d'esempio che il guscio elenca, riscrive e toglie (`nome_di_esempio_valido`): un file `.algo`
 * (l'estensione in qualunque maiuscola) con qualcosa prima, senza caratteri vietati o di controllo, senza punto in testa
 * (i file nascosti, come `._media.algo` che il Mac scrive su una chiavetta), senza spazio in fondo, e non riservato. */
export function esempioValido(nome: string): boolean {
  const base = nome.toLowerCase().endsWith(".algo") ? nome.slice(0, -".algo".length) : "";
  return base.trim() !== "" && ![...nome].some(vietato) && !nome.startsWith(".") && !nome.endsWith(" ") && !nomeRiservato(nome);
}
