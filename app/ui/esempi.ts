// Gli esempi della finestra «Esempi»: i file `.algo` di una cartella dell'applicazione (`esempi` accanto alle
// preferenze, in `data\` nella versione portabile; cambiabile dalle Impostazioni). Ogni sottocartella è un gruppo; i
// file fuori da ogni gruppo si mostrano sopra i gruppi. Un esempio si apre come copia, non legata a un file;
// «Aggiungi» salva lì, nel gruppo scelto, una copia del progetto aperto, «Elimina» cancella il file.
//
// L'app ne fornisce dodici, in tre gruppi: «Primi passi» (il programma di riferimento della tappa 1 e tre casi del corpus
// con una condizione o un ciclo), «Cicli per e per ogni» (quello della tappa 2 e «parola al contrario»), «Funzioni e
// procedure» (quello della tappa 3, due casi del corpus, il fattoriale ricorsivo, la sequenza di Fibonacci e la
// ricorsione senza uscita della tappa 4, con la pila delle chiamate del progetto a 10), ognuno coi suoi casi d'uso. Al primo avvio, quando la cartella
// non c'è ancora, si copiano lì col nome del gruppo, il nome e la descrizione nella lingua dell'interfaccia;
// «Ripristina» ricopia quelli che mancano nel loro gruppo (un fornito c'è se nel suo gruppo c'è un file col suo nome,
// gruppo e nome in una qualunque delle lingue), anche in una cartella riempita quando i forniti erano meno. Un fornito
// che sta fuori da ogni gruppo (la cartella copiata quando i gruppi non c'erano) si sposta nel suo gruppo, se lì non c'è
// già.
//
// Un file della cartella che non si legge, che il lettore rifiuta o che usa la ricorsione (che il controllo non conosce
// ancora) resta nell'elenco col motivo, e non si apre. La cartella delle librerie si legge con le stesse regole, senza
// file forniti.
import testoFattoriale from "../casi/tappa-1/overflow-fattoriale.algo" with { type: "text" };
import testoPariDispari from "../casi/tappa-1/condizione-intero.algo" with { type: "text" };
import testoPrimoQuadrato from "../casi/tappa-1/condizione-booleano.algo" with { type: "text" };
import testoRiferimento from "../casi/tappa-1/riferimento-media-voti.algo" with { type: "text" };
import testoParolaAlContrario from "../casi/tappa-2/parola-al-contrario.algo" with { type: "text" };
import testoRiferimentoDeiCicli from "../casi/tappa-2/riferimento-media-voti-per.algo" with { type: "text" };
import testoCopie from "../casi/tappa-3/copie-senza-riferimento.algo" with { type: "text" };
import testoRiferimentoDelleFunzioni from "../casi/tappa-3/riferimento-media-voti-funzioni.algo" with { type: "text" };
import testoTreLivelli from "../casi/tappa-3/tre-livelli.algo" with { type: "text" };
import testoFattorialeRicorsivo from "../casi/tappa-4/fattoriale.algo" with { type: "text" };
import testoRicorsioneSenzaUscita from "../casi/tappa-4/ricorsione-senza-uscita.algo" with { type: "text" };
import testoSequenzaDiFibonacci from "../casi/tappa-4/sequenza-di-fibonacci.algo" with { type: "text" };
import { controlla, type Tetti } from "../core/controllo/controllo";
import { apri, salva, type ErroreDiApertura } from "../core/progetto/formato";
import type { Progetto } from "../core/progetto/modello";
import type { Dizionario } from "../i18n/it";
import { dizionari, riempi } from "../i18n/lingue";
import type { CartellaDegliEsempi, ErroreDelFile, FileDiEsempio } from "./file";
import { baseDelNome, nomeRiservato } from "./nomi";

/** Perché un file della cartella non si apre. */
export type Problema =
  | { readonly genere: "file"; readonly errore: ErroreDelFile }
  | { readonly genere: "apertura"; readonly errori: readonly ErroreDiApertura[] }
  | { readonly genere: "fuori_tappa" };

export interface Esempio {
  /** Il nome del file nella cartella. */
  readonly nome: string;
  /** Il gruppo (la sottocartella); `null` fuori da ogni gruppo. */
  readonly gruppo: string | null;
  readonly progetto: Progetto | null;
  readonly problema: Problema | null;
}

export interface GruppoDiEsempi {
  readonly nome: string;
  readonly esempi: readonly Esempio[];
}

/** Gli esempi della cartella: quelli fuori da ogni gruppo, poi i gruppi. */
export interface EsempiDellaCartella {
  readonly sciolti: readonly Esempio[];
  readonly gruppi: readonly GruppoDiEsempi[];
}

/** Un file da scrivere nella cartella: il gruppo, il nome, il testo. */
export interface FileDaScrivere {
  readonly gruppo: string;
  readonly nome: string;
  readonly testo: string;
}

type ChiaveDelGruppo = "esempiGruppoPrimiPassi" | "esempiGruppoCicli" | "esempiGruppoFunzioni";
type Fornito = { readonly testo: string; readonly titolo: keyof Dizionario; readonly descrizione: keyof Dizionario; readonly gruppo: ChiaveDelGruppo };

/** I gruppi dei forniti, nell'ordine in cui la finestra li mostra (prima degli altri). */
const gruppiForniti: readonly ChiaveDelGruppo[] = ["esempiGruppoPrimiPassi", "esempiGruppoCicli", "esempiGruppoFunzioni"];

const fornitiConLAapp: readonly Fornito[] = [
  { testo: testoRiferimento, titolo: "esempioMediaVoti", descrizione: "esempioMediaVotiDescrizione", gruppo: "esempiGruppoPrimiPassi" },
  { testo: testoPariDispari, titolo: "esempioPariDispari", descrizione: "esempioPariDispariDescrizione", gruppo: "esempiGruppoPrimiPassi" },
  { testo: testoPrimoQuadrato, titolo: "esempioPrimoQuadrato", descrizione: "esempioPrimoQuadratoDescrizione", gruppo: "esempiGruppoPrimiPassi" },
  { testo: testoFattoriale, titolo: "esempioFattoriale", descrizione: "esempioFattorialeDescrizione", gruppo: "esempiGruppoPrimiPassi" },
  { testo: testoRiferimentoDeiCicli, titolo: "esempioMediaVotiPer", descrizione: "esempioMediaVotiPerDescrizione", gruppo: "esempiGruppoCicli" },
  { testo: testoParolaAlContrario, titolo: "esempioParolaAlContrario", descrizione: "esempioParolaAlContrarioDescrizione", gruppo: "esempiGruppoCicli" },
  { testo: testoRiferimentoDelleFunzioni, titolo: "esempioMediaVotiFunzioni", descrizione: "esempioMediaVotiFunzioniDescrizione", gruppo: "esempiGruppoFunzioni" },
  { testo: testoCopie, titolo: "esempioCopie", descrizione: "esempioCopieDescrizione", gruppo: "esempiGruppoFunzioni" },
  { testo: testoTreLivelli, titolo: "esempioTreLivelli", descrizione: "esempioTreLivelliDescrizione", gruppo: "esempiGruppoFunzioni" },
  { testo: testoFattorialeRicorsivo, titolo: "esempioFattorialeRicorsivo", descrizione: "esempioFattorialeRicorsivoDescrizione", gruppo: "esempiGruppoFunzioni" },
  { testo: testoSequenzaDiFibonacci, titolo: "esempioSequenzaDiFibonacci", descrizione: "esempioSequenzaDiFibonacciDescrizione", gruppo: "esempiGruppoFunzioni" },
  { testo: testoRicorsioneSenzaUscita, titolo: "esempioRicorsioneSenzaUscita", descrizione: "esempioRicorsioneSenzaUscitaDescrizione", gruppo: "esempiGruppoFunzioni" },
];

/** I nomi senza badare alle maiuscole, come il disco di Windows e del Mac: «primi passi» e «Primi passi» sono la
 * stessa cartella, e un file dell'utente che si chiama come un fornito a meno delle maiuscole è lo stesso file. */
const uguali = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Il nome di un gruppo dei forniti in una qualunque lingua. */
const eDelGruppo = (nome: string, chiave: ChiaveDelGruppo) => Object.values(dizionari).some((d) => uguali(d[chiave], nome));

/** Un gruppo degli esempi forniti (il nome in una qualunque lingua): non si elimina, i suoi esempi si tolgono uno per
 * uno. */
export const eGruppoFornito = (nome: string) => gruppiForniti.some((chiave) => eDelGruppo(nome, chiave));

/** Il file di un fornito in una qualunque lingua. */
const eDelFornito = (nome: string, f: Fornito) => Object.values(dizionari).some((d) => uguali(`${d[f.titolo]}.algo`, nome));

/** I dodici esempi forniti, come file da copiare: gruppo, nome e descrizione nella lingua data. */
export function forniti(testi: Dizionario): FileDaScrivere[] {
  return fornitiConLAapp.map((f) => {
    const esito = apri(f.testo);
    if (!esito.ok) throw new Error(`un esempio fornito non si apre: ${f.titolo}`);
    const progetto: Progetto = { ...esito.progetto, metadata: { name: testi[f.titolo], description: testi[f.descrizione] } };
    return { gruppo: testi[f.gruppo], nome: `${testi[f.titolo]}.algo`, testo: salva(progetto) };
  });
}

/** Il gruppo della cartella che è quello di un fornito (in una qualunque lingua), se c'è. */
const gruppoNellaCartella = (cartella: CartellaDegliEsempi, chiave: ChiaveDelGruppo) => cartella.gruppi.find((g) => eDelGruppo(g.nome, chiave));

/** I forniti che nel loro gruppo non ci sono, in nessuna lingua; vanno nel gruppo che c'è già (col nome che ha), o in
 * uno nuovo col nome nella lingua data. */
export function mancanti(cartella: CartellaDegliEsempi, testi: Dizionario): FileDaScrivere[] {
  const tutti = forniti(testi);
  return fornitiConLAapp.flatMap((f, i) => {
    const gruppo = gruppoNellaCartella(cartella, f.gruppo);
    if (gruppo?.file.some((x) => eDelFornito(x.nome, f))) return [];
    return [{ ...tutti[i]!, gruppo: gruppo?.nome ?? testi[f.gruppo] }];
  });
}

/** I forniti fuori da ogni gruppo (la cartella copiata quando i gruppi non c'erano) che il loro gruppo non ha ancora: si
 * spostano lì, col testo com'è (scritti nel gruppo, poi tolti da fuori). Un file che non si legge resta dov'è. */
export function daSpostare(cartella: CartellaDegliEsempi, testi: Dizionario): FileDaScrivere[] {
  const presenti = new Map<string, FileDiEsempio[]>(cartella.gruppi.map((g) => [g.nome, [...g.file]]));
  return cartella.file.flatMap((file) => {
    const f = fornitiConLAapp.find((x) => eDelFornito(file.nome, x));
    if (f === undefined || file.testo === undefined) return [];
    const gruppo = gruppoNellaCartella(cartella, f.gruppo)?.nome ?? testi[f.gruppo];
    if (presenti.get(gruppo)?.some((x) => uguali(x.nome, file.nome))) return [];
    presenti.set(gruppo, [...(presenti.get(gruppo) ?? []), file]);
    return [{ gruppo, nome: file.nome, testo: file.testo }];
  });
}

/** Un esempio da un file della cartella. */
function esempioDa(f: FileDiEsempio, gruppo: string | null, limiti: Tetti): Esempio {
  if (f.testo === undefined) return { nome: f.nome, gruppo, progetto: null, problema: { genere: "file", errore: f.errore ?? { genere: "sistema", dettaglio: "" } } };
  const esito = apri(f.testo);
  if (!esito.ok) return { nome: f.nome, gruppo, progetto: null, problema: { genere: "apertura", errori: esito.errori } };
  if (controlla(esito.progetto, limiti).fuoriTappa) return { nome: f.nome, gruppo, progetto: null, problema: { genere: "fuori_tappa" } };
  return { nome: f.nome, gruppo, progetto: esito.progetto, problema: null };
}

/** Gli esempi dai file della cartella: quelli fuori da ogni gruppo nell'ordine in cui il guscio li dà, poi i gruppi dei
 * forniti (nel loro ordine, in una qualunque lingua), poi gli altri nell'ordine del guscio. */
export function esempiDa(cartella: CartellaDegliEsempi, limiti: Tetti): EsempiDellaCartella {
  const posto = (nome: string) => {
    const i = gruppiForniti.findIndex((chiave) => eDelGruppo(nome, chiave));
    return i < 0 ? gruppiForniti.length : i;
  };
  const gruppi = [...cartella.gruppi].sort((a, b) => posto(a.nome) - posto(b.nome));
  return {
    sciolti: cartella.file.map((f) => esempioDa(f, null, limiti)),
    gruppi: gruppi.map((g) => ({ nome: g.nome, esempi: g.file.map((f) => esempioDa(f, g.nome, limiti)) })),
  };
}

/** Un testo da cercare: senza maiuscole e senza accenti («perche» trova «perché»). */
const piano = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Gli esempi che hanno il testo cercato nel nome del progetto, nella descrizione o nel nome del file; i gruppi senza
 * nessuno spariscono. Un testo vuoto (o di soli spazi) li lascia tutti. */
export function cerca(esempi: EsempiDellaCartella, testo: string): EsempiDellaCartella {
  const cercato = piano(testo.trim());
  if (cercato === "") return esempi;
  const trovato = (e: Esempio) => [e.progetto?.metadata.name ?? "", e.progetto?.metadata.description ?? "", e.nome].some((t) => piano(t).includes(cercato));
  return {
    sciolti: esempi.sciolti.filter(trovato),
    gruppi: esempi.gruppi.map((g) => ({ nome: g.nome, esempi: g.esempi.filter(trovato) })).filter((g) => g.esempi.length > 0),
  };
}

/** Il gruppo dove va un esempio aggiunto, fra i gruppi che ci sono: quello col nome scelto a meno delle maiuscole (è la
 * stessa cartella), altrimenti il nome scelto. */
export function gruppoDi(gruppi: readonly string[], scelto: string): string {
  return gruppi.find((g) => uguali(g, scelto)) ?? scelto;
}

/** Un nome di file libero nella cartella per un progetto di quel nome: `Nome.algo`, poi `Nome (2).algo`… Il nome è
 * `baseDelNome` (`ripiego` se non resta nulla); un nome che Windows riserva parte da `(2)` («nul (2).algo»). */
export function nomeLibero(nomeDelProgetto: string, esistenti: readonly string[], ripiego: string): string {
  const base = baseDelNome(nomeDelProgetto, ripiego);
  const usati = new Set(esistenti.map((n) => n.toLowerCase()));
  for (let i = 1; ; i++) {
    const nome = i === 1 ? `${base}.algo` : `${base} (${i}).algo`;
    if (!usati.has(nome.toLowerCase()) && !nomeRiservato(nome)) return nome;
  }
}

/** Un errore del guscio con le parole della lingua dell'interfaccia, genere per genere. */
export function testoDellErrore(e: ErroreDelFile, testi: Dizionario): string {
  switch (e.genere) {
    case "non_testo":
      return testi.erroreNonTesto;
    case "sistema":
      return riempi(testi.erroreDelSistema, { dettaglio: e.dettaglio });
    case "nome_non_valido":
      return riempi(testi.erroreNomeNonValido, { nome: e.dettaglio });
    case "gruppo_con_altro":
      return riempi(testi.erroreGruppoConAltro, { altro: e.dettaglio });
    case "gruppo_bloccato":
      return testi.erroreGruppoBloccato;
    case "sola_lettura":
      return riempi(testi.erroreSolaLettura, { nome: e.dettaglio });
  }
}

/** Il motivo per cui un esempio non si apre, nella lingua dell'interfaccia. Per un file che il lettore rifiuta, la
 * frase per lo studente: il percorso del campo e il motivo li dà «Apri», nei dettagli della finestra degli errori. */
export function testoDelProblema(p: Problema, testi: Dizionario): string {
  if (p.genere === "fuori_tappa") return testi.apriFuoriTappa;
  if (p.genere === "file") return testoDellErrore(p.errore, testi);
  return testi.apriNonEUnProgetto;
}
