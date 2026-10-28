import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { avvisiDelDato } from "../core/controllo/controllo";
import { tettoDeiPassi } from "../core/interprete/interprete";
import { codiciAvviso, codiciErrore, codiciErroreStatico } from "../core/progetto/modello";
import { causeDeiCodici } from "../core/espressioni/analizzatore";
import { codiciSulRisultato, numeroDelCodice, testiDeiCodici, testiDelleCause, testiSulRisultato, testoDelMessaggio, testoDellaSegnalazione } from "./codici";
import { dizionari } from "./lingue";

// I codici del modello e i testi di ogni lingua, appaiati nei due versi. `tsc` lo garantisce già sulle
// chiavi; questa prova lo ripete a tempo d'esecuzione, controlla che nessun testo sia vuoto, che nessuno
// dei due testi (accaduto e suggerimento) sia uguale fra le due lingue, e che ogni ramo del nucleo che
// solleva un codice abbia la sua causa nel testo. Ogni rilevatore ha il suo controllo positivo.
//
// Che cosa NON guarda:
// - se la causa nominata descrive DAVVERO il ramo: la tabella dice «questo ramo, questa parola», e la
//   corrispondenza fra condizione e parola si rilegge; il comportamento del ramo lo provano i test
//   dell'analizzatore e del controllo;
// - i codici con una causa sola (`unaCausa`): lì tutti i rami sono la stessa causa, e il testo si rilegge;
//   la prova pretende solo che ogni codice sollevato stia in uno dei due elenchi;
// - le cause che non sono un ramo con il codice scritto (per esempio i motivi per cui una riga letta non è
//   valida, decisi in una funzione che restituisce `undefined`);
// - il `suggerimento` contro i rami: le parole delle cause si cercano solo nell'`accaduto`;
// - un testo falso che conserva le parole tabellate: per questo, dove la correzione era un predicato (che
//   cosa fa un «ripeti» con false), la tabella porta il predicato e non solo il nome del blocco;
// - i rami fuori dal nucleo (`app/core`): oggi nessun altro file solleva un codice;
// - la qualità della traduzione: due testi diversi fra le lingue possono dire cose diverse;
// - per «non inizializzata» e per il tetto dei passi, il resto del testo oltre alle parole cercate.

type Testi = Record<string, { breve?: string; accaduto: string; suggerimento: string }>;
type Causa = { readonly it: string; readonly en: string };

const codici = [...new Set<string>([...codiciErrore, ...codiciErroreStatico, ...codiciAvviso])];
const lingue = Object.keys(dizionari) as (keyof typeof dizionari)[];

const appaia = (testi: Testi) => ({
  senzaTesto: codici.filter((c) => !(c in testi)),
  senzaCodice: Object.keys(testi).filter((c) => !codici.includes(c)),
  vuoti: Object.entries(testi).filter(([, t]) => t.accaduto.trim() === "" || t.suggerimento.trim() === "").map(([c]) => c),
});

const nonTradotti = (it: Testi, en: Testi) =>
  codici.flatMap((c) => (["accaduto", "suggerimento"] as const).filter((campo) => it[c]?.[campo] === en[c]?.[campo]).map((campo) => `${c} ${campo}`));

test("testi dei codici: ogni codice in ogni lingua, nessun testo in più, nessuno vuoto, nessuno uguale fra le lingue", () => {
  for (const lingua of lingue) expect({ lingua, ...appaia(testiDeiCodici[lingua]) }).toEqual({ lingua, senzaTesto: [], senzaCodice: [], vuoti: [] });
  const uguali = nonTradotti(testiDeiCodici.it, testiDeiCodici.en);
  console.log(`testi dei codici: ${codici.length} codici distinti, lingue ${lingue.join(" e ")}, testi per lingua ${Object.keys(testiDeiCodici.it).length}, campi confrontati fra le lingue ${codici.length * 2}; non tradotti ${uguali.length}`);
  expect(uguali).toEqual([]);
  expect(Object.keys(testiDeiCodici).sort()).toEqual([...lingue].sort());
  expect(codici.length).toBe(61);

  // Controlli positivi, uno per rilevatore, su copie dei testi veri.
  const { uninitialized: _, ...copia } = testiDeiCodici.it;
  expect(appaia({ ...copia, codice_inventato: { accaduto: "x", suggerimento: "y" } })).toEqual({ senzaTesto: ["uninitialized"], senzaCodice: ["codice_inventato"], vuoti: [] });
  expect(appaia({ ...testiDeiCodici.it, unknown_name: { ...testiDeiCodici.it.unknown_name, suggerimento: " " } }).vuoti).toEqual(["unknown_name"]);
  const enCopiato = {
    ...testiDeiCodici.en,
    uninitialized: { ...testiDeiCodici.en.uninitialized, accaduto: testiDeiCodici.it.uninitialized.accaduto },
    syntax_error: { ...testiDeiCodici.en.syntax_error, suggerimento: testiDeiCodici.it.syntax_error.suggerimento },
  };
  expect(nonTradotti(testiDeiCodici.it, enCopiato)).toEqual(["uninitialized accaduto", "syntax_error suggerimento"]);
});

// Il numero di ogni codice: unico, E per gli errori e A per gli avvisi, tre cifre, in fila da 001 per genere (un
// codice nuovo prende il numero dopo l'ultimo). E il breve: una frase sola, che finisce col punto o col punto di
// domanda, al più 80 caratteri, diversa fra le lingue (uguale all'`accaduto` quando quello è già una frase breve: la
// spiegazione allora è il solo suggerimento).
const numeri = (tabella: Record<string, string>) => {
  const fuori: string[] = [];
  for (const c of codici) {
    const n = tabella[c];
    const genere = (codiciAvviso as readonly string[]).includes(c) ? "A" : "E";
    if (n === undefined || !new RegExp(`^${genere}\\d{3}$`).test(n)) fuori.push(`${c}: ${n ?? "senza numero"}`);
  }
  for (const genere of ["E", "A"]) {
    const dati = Object.values(tabella).filter((n) => n.startsWith(genere)).sort();
    const attesi = dati.map((_, k) => `${genere}${String(k + 1).padStart(3, "0")}`);
    if (dati.join() !== attesi.join()) fuori.push(`${genere}: ${dati.join(" ")} invece di ${attesi.join(" ")}`);
  }
  return fuori;
};
const brevi = (testi: Testi) =>
  codici.flatMap((c) => {
    const b = testi[c]?.breve ?? "";
    return b.length === 0 || b.length > 80 || !/[.?]$/.test(b) || /[.?!:;] /.test(b) ? [`${c}: «${b}»`] : [];
  });

test("testi dei codici: ogni codice ha il suo numero, e un breve di una frase in ogni lingua", () => {
  expect(numeri(numeroDelCodice)).toEqual([]);
  const quanti = Object.values(numeroDelCodice);
  console.log(`numeri dei codici: errori ${quanti.filter((n) => n.startsWith("E")).length}, avvisi ${quanti.filter((n) => n.startsWith("A")).length}; breve più lungo ${Math.max(...lingue.flatMap((l) => Object.values(testiDeiCodici[l]).map((t) => t.breve.length)))} caratteri`);
  expect([quanti.length, new Set(quanti).size]).toEqual([codici.length, codici.length]);
  for (const lingua of lingue) expect({ lingua, brevi: brevi(testiDeiCodici[lingua]) }).toEqual({ lingua, brevi: [] });
  expect(codici.filter((c) => testiDeiCodici.it[c as keyof typeof numeroDelCodice].breve === testiDeiCodici.en[c as keyof typeof numeroDelCodice].breve)).toEqual([]);
  // Controlli positivi: un numero col genere sbagliato, che lascia un buco negli avvisi; un breve di due frasi e uno vuoto.
  expect(numeri({ ...numeroDelCodice, missing_role: "E051" })).toEqual(["missing_role: E051", "A: A001 A002 A003 A004 A005 A006 A008 A009 A010 A011 invece di A001 A002 A003 A004 A005 A006 A007 A008 A009 A010"]);
  const it = testiDeiCodici.it;
  expect(brevi({ ...it, syntax_error: { ...it.syntax_error, breve: "Il testo non si legge. Rileggilo." }, real_equality: { ...it.real_equality, breve: "" } })).toEqual(["syntax_error: «Il testo non si legge. Rileggilo.»", "real_equality: «»"]);
});

// I testi di un errore sul risultato di una funzione: per ogni codice dell'elenco e in ogni lingua, nessuno vuoto, un breve
// di una frase al più di 80 caratteri, diversi fra le lingue e diversi da quelli del dato; la scelta li dà solo sul
// risultato e solo per quei codici.
type SulRisultato = typeof testiSulRisultato;
const difettiSulRisultato = (sul: SulRisultato) => {
  const difetti: string[] = [];
  for (const lingua of lingue)
    for (const c of codiciSulRisultato) {
      const t = sul[lingua][c];
      const b = t.breve;
      if (t.accaduto.trim() === "" || t.suggerimento.trim() === "") difetti.push(`${lingua} ${c}: vuoto`);
      if (b.length === 0 || b.length > 80 || !/[.?]$/.test(b) || /[.?!:;] /.test(b)) difetti.push(`${lingua} ${c}: breve`);
      if (b === testiDeiCodici[lingua][c].breve || t.accaduto === testiDeiCodici[lingua][c].accaduto) difetti.push(`${lingua} ${c}: uguale al dato`);
    }
  for (const c of codiciSulRisultato)
    for (const campo of ["breve", "accaduto", "suggerimento"] as const) if (sul.it[c][campo] === sul.en[c][campo]) difetti.push(`${c} ${campo}: non tradotto`);
  return difetti;
};

test("testi dei codici: quelli sul risultato di una funzione, distinti da quelli del dato, e scelti solo lì", () => {
  console.log(`testi sul risultato: ${codiciSulRisultato.length} codici, breve più lungo ${Math.max(...lingue.flatMap((l) => codiciSulRisultato.map((c) => testiSulRisultato[l][c].breve.length)))} caratteri`);
  expect(difettiSulRisultato(testiSulRisultato)).toEqual([]);
  expect([...codiciSulRisultato]).toEqual(["string_too_long", "string_literal_too_long", "invalid_data_item", "limit_exceeded", "array_assignment"]);
  // La scelta: sul risultato il testo suo; sul dato, o per un codice che non ne ha uno, quello di sempre.
  expect(testoDelMessaggio("it", "string_too_long", true)).toBe(testiSulRisultato.it.string_too_long);
  expect(testoDelMessaggio("it", "string_too_long", false)).toBe(testiDeiCodici.it.string_too_long);
  // «Restituisce» di una funzione vettore senza un vettore intero: il testo suo, che non propone una copia `altri ← voti`.
  expect([testoDelMessaggio("it", "array_assignment", true).breve, testoDelMessaggio("it", "array_assignment", false).suggerimento.includes("altri ← voti")]).toEqual([
    "Restituisce vuole un vettore intero.",
    true,
  ]);
  expect(testoDelMessaggio("en", "uninitialized", true)).toBe(testiDeiCodici.en.uninitialized);
  // Controlli positivi, su copie: un breve oltre 80 caratteri, uno uguale a quello del dato, uno non tradotto.
  const it = testiSulRisultato.it;
  const alterati: SulRisultato = {
    it: { ...it, limit_exceeded: { ...it.limit_exceeded, breve: `${"a".repeat(80)}.` }, invalid_data_item: { ...it.invalid_data_item, breve: testiDeiCodici.it.invalid_data_item.breve } },
    en: { ...testiSulRisultato.en, string_too_long: { ...testiSulRisultato.en.string_too_long, suggerimento: it.string_too_long.suggerimento } },
  };
  expect(difettiSulRisultato(alterati)).toEqual(["it invalid_data_item: uguale al dato", "it limit_exceeded: breve", "string_too_long suggerimento: non tradotto"]);
});

// I due errori che l'esecuzione passo passo mostra per primi parlano con le parole che l'utente vede lì:
// la tabella di traccia scrive «non inizializzata» nelle celle senza valore, e il tetto dei passi è un
// numero che il testo dice (se il tetto cambia, la prova lo ricorda).
test("testi dei codici: «non inizializzata» e il tetto dei passi, con le parole della tabella di traccia", () => {
  const voci = (testi: Testi, parole: { uninitialized: string; tetto: string; tabella: string }) => ({
    nonInizializzata: testi.uninitialized!.accaduto.includes(parole.uninitialized),
    tetto: testi.too_many_steps!.accaduto.includes(parole.tetto),
    tabella: testi.too_many_steps!.suggerimento.includes(parole.tabella),
  });
  const tutte = { nonInizializzata: true, tetto: true, tabella: true };
  expect(voci(testiDeiCodici.it, { uninitialized: "non inizializzata", tetto: "un milione", tabella: "tabella di traccia" })).toEqual(tutte);
  expect(voci(testiDeiCodici.en, { uninitialized: "uninitialized", tetto: "one million", tabella: "trace table" })).toEqual(tutte);
  expect(tettoDeiPassi).toBe(1_000_000);
});

// Un avviso che cade sulla riga di un dato parla di QUEL dato: comincia con l'articolo determinativo (scelta
// dell'utente). Gli avvisi dato per dato sono quelli che il controllo statico mette nell'elenco dei dati
// (`avvisiDelDato`, l'unico tipo che la sua segnalazione dato per dato accetta): l'elenco scritto qui si appaia con
// quello, nei due versi, così un codice nuovo di quel genere fa rosso finché il suo testo non si guarda.
test("testi dei codici: gli avvisi sulla riga di un dato cominciano con «Il dato» e «The data item»", () => {
  const sulDato = ["input_never_read", "output_never_written", "missing_role", "unused_data", "unused_value"] as const;
  const appaiati = (controllo: readonly string[]) => ({
    soloNelControllo: controllo.filter((c) => !(sulDato as readonly string[]).includes(c)),
    soloQui: sulDato.filter((c) => !controllo.includes(c)),
    conteggi: [controllo.length, sulDato.length],
  });
  expect(appaiati(avvisiDelDato)).toEqual({ soloNelControllo: [], soloQui: [], conteggi: [5, 5] });
  // Controllo positivo: un avviso del dato in più nel controllo, uno in meno.
  expect(appaiati([...avvisiDelDato, "implicit_conversion"]).soloNelControllo).toEqual(["implicit_conversion"]);
  expect(appaiati(avvisiDelDato.filter((c) => c !== "missing_role")).soloQui).toEqual(["missing_role"]);
  const inizio = { it: "Il dato ", en: "The data item " } as const;
  const senzaArticolo = (testi: typeof testiDeiCodici) =>
    lingue.flatMap((l) => sulDato.filter((c) => !testi[l][c].accaduto.startsWith(inizio[l])).map((c) => `${l} ${c}`));
  expect(senzaArticolo(testiDeiCodici)).toEqual([]);
  // Controllo positivo: un testo con l'articolo indeterminativo, in una copia.
  const conUn = { ...testiDeiCodici, it: { ...testiDeiCodici.it, unused_data: { ...testiDeiCodici.it.unused_data, accaduto: "Un dato non è mai usato." } } };
  expect(senzaArticolo(conUn)).toEqual(["it unused_data"]);
});

// ------------------------------------------------------------------------------ ramo → causa nel testo

// I rami: le righe dei file del nucleo (non di test né d'appoggio alle prove, `*-di-prova.ts`, il modello
// escluso) che nominano un codice fra virgolette, tolti i commenti e le dichiarazioni di tipo. Una riga che è
// solo `return "<codice>";` porta con sé la riga prima, dove sta la condizione.
const nucleo = join(import.meta.dir, "..", "core");
const sorgenti = (readdirSync(nucleo, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith("-di-prova.ts") && !f.endsWith("modello.ts"))
  .map((f) => ({ file: f.replaceAll("\\", "/"), testo: readFileSync(join(nucleo, f), "utf8") }));

function rami(fonti: readonly { file: string; testo: string }[]): Map<string, string[]> {
  const fuori = new Map(codici.map((c) => [c, [] as string[]]));
  for (const { file, testo } of fonti) {
    const righe = testo.split("\n").map((r) => r.trim());
    righe.forEach((r, n) => {
      if (r.startsWith("//") || r.startsWith("*") || r.startsWith("/*") || r.startsWith("export type")) return;
      const conCondizione = /^return "\w+";$/.test(r) ? `${righe[n - 1]} ${r}` : r;
      for (const c of codici) if (r.includes(`"${c}"`)) fuori.get(c)!.push(`${file}:${n + 1}: ${conCondizione}`);
    });
  }
  return fuori;
}

// Per i codici il cui testo elenca più cause: ogni ramo, riconosciuto da un pezzo della sua riga, con le
// parole che nominano la sua causa nell'`accaduto` di ogni lingua.
const causeDeiRami: Record<string, Record<string, readonly Causa[]>> = {
  syntax_error: {
    "x === undefined": [{ it: "senza chiusura", en: "no closing one" }],
    "e === undefined": [{ it: "barra rovesciata", en: "backslash" }],
    "codice === 0": [
      { it: "codice 0", en: "code 0" },
      { it: "surrogato", en: "surrogate" },
    ],
    "lettera(c[i]) ||": [{ it: "numero scritto male", en: "badly written number" }],
    "codici.length === 0": [{ it: "due apici vuoti", en: "two empty single quotes" }],
    "segno === undefined": [
      { it: "simbolo che il linguaggio non conosce", en: "symbol the language does not know" },
      { it: "lettera accentata", en: "accented letter" },
    ],
    'x === ")" ? "tonda_aperta"': [{ it: "parentesi, tonda o quadra, aperta e mai chiusa", en: "bracket, round or square, opened and never closed" }],
    'else ferma("syntax_error", "simbolo_slegato"': [{ it: "in più dopo la fine", en: "extra after the end" }],
    'genere === "fine") return ferma': [{ it: "operando che manca", en: "missing operand" }],
    '"operando_mancante"': [{ it: "operando che manca", en: "missing operand" }],
    'guarda().genere !== "fine"': [{ it: "in più dopo la fine", en: "extra after the end" }],
    'base.genere !== "nome"': [{ it: "destinazione", en: "target" }],
    "livelli > tettoDiAnnidamento": [{ it: "annidata oltre", en: "nested beyond" }],
    '"campo_mancante"': [{ it: "un punto senza il nome di un campo", en: "a dot with no field name" }],
  },
  limit_exceeded: {
    "d.size > limiti": [{ it: "elementi di un vettore", en: "elements of an array" }],
    "d.max_length > limiti": [{ it: "lunghezza massima di una stringa", en: "maximum length of a string" }],
    caratteriDiUnVettoreDiStringhe: [{ it: "caratteri di un vettore di stringhe", en: "characters of an array of strings" }],
  },
  // Le sette cause di un nome non valido le distingue `causaDelNome`, che il ramo chiama.
  invalid_name: {
    "if (delNome !== undefined)": [
      { it: "è vuoto", en: "is empty" },
      { it: "cifra", en: "digit" },
      { it: "trattino basso", en: "underscore" },
      { it: "lettera accentata", en: "accented letter" },
      { it: "63", en: "63" },
      { it: "parola riservata", en: "reserved word" },
      { it: "libreria del C", en: "C library" },
    ],
    "else if (doppio)": [{ it: "nome di un altro dato", en: "name of another data item" }],
    // Il nome di un record (anche a livello di file) e quello di un campo.
    'delProgetto({ codice: "invalid_name"': [
      { it: "cifra", en: "digit" },
      { it: "parola riservata", en: "reserved word" },
      { it: "libreria del C", en: "C library" },
    ],
    '{ codice: "invalid_name", fermata: delCampo }': [
      { it: "cifra", en: "digit" },
      { it: "parola riservata", en: "reserved word" },
    ],
    'dellaFunzione(f, { codice: "invalid_name"': [
      { it: "cifra", en: "digit" },
      { it: "parola riservata", en: "reserved word" },
      { it: "libreria del C", en: "C library" },
    ],
  },
  invalid_data_item: {
    "d.size < 1": [{ it: "dimensione", en: "size" }],
    "d.max_length < 1": [{ it: "lunghezza", en: "length" }],
    '"lunghezza_non_stringa"': [{ it: "lunghezza", en: "length" }],
    'comune || genere === "main"': [{ it: "parametro del programma principale", en: "parameter of the main program" }],
    "d.initial !== undefined || d.role": [
      { it: "valore iniziale", en: "initial value" },
      { it: "costante", en: "constant" },
      { it: "ruolo", en: "role" },
    ],
    "comune && d.constant": [{ it: "costante", en: "constant" }],
    '"costante_senza_valore"': [{ it: "costante", en: "constant" }],
    '"costante_con_ruolo"': [
      { it: "costante", en: "constant" },
      { it: "ruolo", en: "role" },
    ],
    "erroreDelLetterale(d.initial, d) :": [{ it: "valore iniziale", en: "initial value" }],
    'if (typeof d.initial === "string") return': [{ it: "valore iniziale", en: "initial value" }],
    "d.initial.length !== d.size": [{ it: "valore iniziale", en: "initial value" }],
    "includes(o.genere)": [{ it: "valore iniziale", en: "initial value" }],
    "if (t === undefined)": [{ it: "valore iniziale", en: "initial value" }],
    'd.type === "record" && d.size !== undefined': [{ it: "vettore di record", en: "array of records" }],
    '? difetto("invalid_data_item", "vettore_di_record")': [{ it: "vettore di record", en: "array of records" }],
    "if (!Array.isArray(d.initial))": [{ it: "valore iniziale", en: "initial value" }],
    "d.initial.length !== record.fields.length": [{ it: "valore iniziale", en: "initial value" }],
  },
  constant_loop_condition: {
    'avvisa("constant_loop_condition"': [
      { it: "con true il ciclo non si ferma mai", en: "with true the loop never stops" },
      { it: "un «mentre» non comincia", en: "a While loop never starts" },
      { it: "un «ripeti» fa un giro solo", en: "a Repeat loop goes round only once" },
    ],
  },
  assign_to_read_only: {
    '"carattere_della_stringa"': [{ it: "carattere di una stringa", en: "character of a string" }],
    "soloLettura.has(base.nome)": [
      { it: "contatore di un ciclo «per»", en: "counter of a For loop" },
      { it: "elemento di un ciclo «per ogni»", en: "element of a For each loop" },
    ],
  },
  function_with_effect: {
    'corrente.kind === "function"': [
      { it: "non legge dalla console", en: "does not read from the console" },
      { it: "non scrive", en: "does not write" },
      { it: "non chiama una procedura", en: "does not call a procedure" },
    ],
    'd.parameter !== "value" ?': [{ it: "parametri per riferimento", en: "parameters by reference" }],
  },
  argument_mismatch: {
    '"argomenti_in_piu"': [{ it: "più o meno dei parametri", en: "more or fewer than the parameters" }],
    "if (!v.vettore)": [{ it: "stessa dimensione", en: "same size" }],
    "v.dimensione !== parametro.size": [
      { it: "stesso tipo", en: "same type" },
      { it: "stessa dimensione", en: "same size" },
    ],
    "if (v.vettore)": [{ it: "del tipo giusto", en: "of the right type" }],
    "parametro.type !== v.tipo": [{ it: "del tipo giusto", en: "of the right type" }],
    "v.record !== parametro.record": [{ it: "del tipo giusto", en: "of the right type" }],
    "d !== undefined && !stessaMisura": [{ it: "stessa lunghezza massima", en: "same maximum length" }],
    "if (vettore && !alParametro)": [{ it: "del tipo giusto", en: "of the right type" }],
    "if (!vettore && alParametro)": [{ it: "stessa dimensione", en: "same size" }],
    "v.lunghezza !== lunghezza(parametro)": [{ it: "stessa lunghezza massima", en: "same maximum length" }],
    "if (vettore && (dato.type": [
      { it: "stesso tipo", en: "same type" },
      { it: "stessa dimensione", en: "same size" },
    ],
    "else if (vettore && !stessaMisura": [{ it: "stessa lunghezza massima", en: "same maximum length" }],
    "dato.record !== parametro.record": [{ it: "stesso tipo", en: "same type" }],
    "if (!stessaMisura(dato, parametro))": [{ it: "stessa lunghezza massima", en: "same maximum length" }],
  },
  reference_not_assignable: {
    "if (!perNome)": [
      { it: "un calcolo", en: "A calculation" },
      { it: "un valore scritto", en: "a written value" },
    ],
    '"fra_parentesi"': [{ it: "fra parentesi", en: "in parentheses" }],
    '"costante_passata"': [{ it: "una costante", en: "a constant" }],
    "soloLettura.has(nome)": [{ it: "il contatore o l'elemento di un ciclo", en: "the counter or element of a loop" }],
    '"carattere_passato"': [{ it: "carattere di una stringa", en: "character of a string" }],
  },
  // L'elenco degli avvisi del dato nomina il codice senza sollevarlo: nessuna causa.
  unused_value: {
    "avvisiDelDato = [": [],
    'delDato("unused_value"': [
      { it: "iniziale", en: "initial" },
      { it: "da un'assegnazione", en: "from an assignment" },
      { it: "da una lettura", en: "a read" },
      { it: "«per ogni»", en: "For each" },
      { it: "dalla chiamata", en: "from the call" },
    ],
  },
  unknown_record_field: {
    '"campo_assente"': [{ it: "non ha quel campo", en: "does not have that field" }],
    '"non_un_record"': [{ it: "prima del punto non c'è un record", en: "there is no record before the dot" }],
  },
  record_name_in_use: {
    '"record_doppio"': [{ it: "di un altro record", en: "to another record" }],
    '"nome_di_un_tipo"': [{ it: "il nome di un tipo", en: "the name of a type" }],
    '"nome_di_un_dato"': [{ it: "di un dato", en: "to a data item" }],
    '"nome_di_una_funzione"': [{ it: "di una procedura o di una funzione", en: "to a procedure or to a function" }],
  },
  invalid_record: {
    '"senza_campi"': [{ it: "almeno un campo", en: "at least one field" }],
    '"campo_doppio"': [{ it: "tutti diversi", en: "all different" }],
  },
  multi_code_character: {
    "codici.length > 1": [
      { it: "più caratteri", en: "several characters" },
      { it: "due codici", en: "two codes" },
    ],
  },
};

// I codici sollevati con una causa sola: tutti i loro rami dicono la stessa cosa, e il testo si rilegge.
const unaCausa = [
  "uninitialized", "index_out_of_range", "string_too_long", "null_character_in_string", "invalid_character_code",
  "string_longer_than_array", "integer_overflow", "division_by_zero", "real_to_integer_out_of_range", "non_finite_real",
  "invalid_input", "input_exhausted", "input_mismatch", "unused_inputs", "too_many_steps", "out_of_memory", "unknown_name",
  "assign_to_constant", "array_assignment", "literal_out_of_range", "literal_leading_zero",
  "string_literal_too_long", "type_mismatch", "condition_not_boolean", "chained_comparison", "chained_power",
  "division_by_literal_zero", "integer_division_to_real", "real_equality", "useless_conversion", "input_never_read",
  "output_never_written", "missing_role", "maybe_uninitialized", "invalid_step", "unused_data", "same_reference",
  "unknown_callee", "function_as_statement", "procedure_in_expression", "invalid_default_value", "function_name_in_use",
  "implicit_conversion", "reference_without_value", "recursion_too_deep", "recursion_data_too_large", "unknown_record",
];

function appaiaRami(trovati: Map<string, string[]>, tabella: typeof causeDeiRami, elenco: readonly string[], testi: Record<string, Testi>) {
  const conRami = codici.filter((c) => trovati.get(c)!.length > 0);
  const decisi = [...Object.keys(tabella), ...elenco];
  const senzaCausa: string[] = [];
  const senzaRamo: string[] = [];
  const causeAssenti: string[] = [];
  for (const [codice, voci] of Object.entries(tabella)) {
    const righe = trovati.get(codice) ?? [];
    for (const riga of righe) if (!Object.keys(voci).some((pezzo) => riga.includes(pezzo))) senzaCausa.push(riga);
    for (const [pezzo, cause] of Object.entries(voci)) {
      const n = righe.filter((riga) => riga.includes(pezzo)).length;
      if (n !== 1) senzaRamo.push(`${codice}: ${pezzo} (${n} righe)`);
      for (const causa of cause)
        for (const lingua of lingue) if (!testi[lingua]![codice]!.accaduto.includes(causa[lingua])) causeAssenti.push(`${lingua} ${codice}: ${causa[lingua]}`);
    }
  }
  return {
    senzaDecisione: conRami.filter((c) => !decisi.includes(c)),
    decisiSenzaRami: decisi.filter((c) => !conRami.includes(c)),
    inDueElenchi: elenco.filter((c) => c in tabella),
    senzaCausa,
    senzaRamo,
    causeAssenti,
  };
}

test("testi dei codici: ogni ramo che solleva un codice ha la sua causa nel testo, nelle due lingue", () => {
  const trovati = rami(sorgenti);
  const totale = [...trovati.values()].reduce((n, r) => n + r.length, 0);
  const nellaTabella = Object.keys(causeDeiRami).reduce((n, c) => n + trovati.get(c)!.length, 0);
  const parole = Object.values(causeDeiRami).reduce((n, v) => n + Object.values(v).reduce((m, x) => m + x.length, 0), 0);
  const conRami = [...new Set([...trovati.values()].flat().map((r) => r.slice(0, r.indexOf(":"))))].sort();
  console.log(
    `rami dei codici: ${totale}; file scansionati ${sorgenti.length}, con rami ${conRami.length}; codici sollevati ${codici.filter((c) => trovati.get(c)!.length > 0).length} su ${codici.length}; ` +
      `con più cause ${Object.keys(causeDeiRami).length} codici, ${nellaTabella} rami, ${parole} parole per lingua; con una causa ${unaCausa.length} codici`,
  );
  // Il denominatore: i file che sollevano un codice, per nome. Un file nuovo che ne solleva uno fa rosso qui
  // finché non si guarda se i suoi rami hanno la loro causa nel testo. Le voci dei casi d'uso (`input_mismatch`,
  // `invalid_input` come esito, `unused_inputs`) le dà l'esecuzione nel modo caso, non più un esecutore a parte.
  expect(conRami).toEqual(["controllo/controllo.ts", "esecuzione/esecuzione.ts", "espressioni/analizzatore.ts", "interprete/interprete.ts"]);
  expect(appaiaRami(trovati, causeDeiRami, unaCausa, testiDeiCodici)).toEqual({
    senzaDecisione: [],
    decisiSenzaRami: [],
    inDueElenchi: [],
    senzaCausa: [],
    senzaRamo: [],
    causeAssenti: [],
  });

  // Controlli positivi, uno per ciascuno dei sei rilevatori, su copie del vero: una voce tolta dalla
  // tabella, una riga vera tolta dal sorgente, una parola tolta da un testo (e il predicato di «ripeti»
  // rimesso com'era prima della correzione), un codice tolto dall'elenco, uno che nessun ramo solleva
  // aggiunto e uno messo in tutti e due.
  const { "segno === undefined": __, ...sintassiRidotta } = causeDeiRami.syntax_error!;
  const senzaSimbolo = appaiaRami(trovati, { ...causeDeiRami, syntax_error: sintassiRidotta }, unaCausa, testiDeiCodici);
  expect(senzaSimbolo.senzaCausa.map((r) => r.replace(/:\d+:.*/, ""))).toEqual(["espressioni/analizzatore.ts"]);
  const fontiRidotte = sorgenti.map((s) => ({ ...s, testo: s.testo.replace(/^.*codici\.length === 0.*$/m, "") }));
  expect(appaiaRami(rami(fontiRidotte), causeDeiRami, unaCausa, testiDeiCodici).senzaRamo).toEqual(["syntax_error: codici.length === 0 (0 righe)"]);
  const itSenzaParola = { ...testiDeiCodici.it, syntax_error: { ...testiDeiCodici.it.syntax_error, accaduto: testiDeiCodici.it.syntax_error.accaduto.replace("barra rovesciata", "barra") } };
  expect(appaiaRami(trovati, causeDeiRami, unaCausa, { ...testiDeiCodici, it: itSenzaParola }).causeAssenti).toEqual(["it syntax_error: barra rovesciata"]);
  const ciclo = testiDeiCodici.it.constant_loop_condition;
  const itRipetiFalso = { ...testiDeiCodici.it, constant_loop_condition: { ...ciclo, accaduto: ciclo.accaduto.replace("fa un giro solo", "non comincia") } };
  expect(appaiaRami(trovati, causeDeiRami, unaCausa, { ...testiDeiCodici, it: itRipetiFalso }).causeAssenti).toEqual(["it constant_loop_condition: un «ripeti» fa un giro solo"]);
  const ridotto = appaiaRami(trovati, causeDeiRami, [...unaCausa.filter((c) => c !== "type_mismatch"), "limit_exceeded", "codice_senza_rami"], testiDeiCodici);
  expect([ridotto.senzaDecisione, ridotto.decisiSenzaRami, ridotto.inDueElenchi]).toEqual([["type_mismatch"], ["codice_senza_rami"], ["limit_exceeded"]]);
});

test("testi dei codici: nessun suggerimento nomina una parte della vista dei dati che c'è in un modo solo", () => {
  // «Opzioni avanzate» c'è nella scheda sotto la riga e non nei dati a celle: un suggerimento che la nomina
  // manda chi usa le celle a cercare ciò che non vede. Controllo positivo: il nome della parte, nelle due lingue.
  const parti = Object.entries(dizionari).map(([l, d]) => [l, d.opzioniAvanzate.toLowerCase()] as const);
  expect(parti.every(([, p]) => p.length > 0)).toBe(true);
  const colpiti = parti.flatMap(([l, p]) =>
    Object.entries(testiDeiCodici[l as keyof typeof testiDeiCodici])
      .filter(([, t]) => t.suggerimento.toLowerCase().includes(p) || t.accaduto.toLowerCase().includes(p))
      .map(([c]) => `${l} ${c}`),
  );
  expect(colpiti).toEqual([]);
});

test("testi dei codici: un suggerimento che propone un calcolo dice che il valore iniziale di un dato non lo è", () => {
  // Il valore iniziale si scrive come un valore: una conversione o un'operazione lì sono un altro errore. Un codice il
  // cui suggerimento le propone, e che nasce anche da un valore iniziale, lo dice. Ogni codice che propone un calcolo
  // sta in uno dei due elenchi: un codice nuovo va classificato. Controllo positivo: i due elenchi, contati per nome.
  const iniziale = { it: "valore iniziale", en: "initial value" } as const;
  const calcolo = /converti_a_|\bto_[a-z]+| - 1\b/;
  // Nascono solo da un blocco: una divisione, un intero che passa in un reale in una chiamata o nel risultato di una
  // funzione.
  const soloDaUnBlocco = ["integer_division_to_real", "implicit_conversion"];
  const proposti = lingue.flatMap((l) =>
    Object.entries(testiDeiCodici[l])
      .filter(([, t]) => calcolo.test(t.suggerimento))
      .map(([c, t]) => ({ codice: c, quale: `${l} ${c}`, dice: t.suggerimento.includes(iniziale[l]) })),
  );
  expect([...new Set(proposti.map((p) => p.codice))].sort()).toEqual(["implicit_conversion", "integer_division_to_real", "literal_out_of_range", "type_mismatch"]);
  expect(proposti.filter((p) => !soloDaUnBlocco.includes(p.codice) && !p.dice).map((p) => p.quale)).toEqual([]);
});

// La causa precisa: ogni causa ha la sua frase breve e il suo suggerimento nelle due lingue, e cita il pezzo di testo
// nelle due o in nessuna; con la causa il testo è quello della causa sola (anche al posto del breve), senza è quello del
// codice, che le elenca tutte.
test("testi delle cause: uno per causa, nelle due lingue, e il ripiego senza la causa", () => {
  const cause = Object.values(causeDeiCodici).flat();
  for (const lingua of ["it", "en"] as const) expect(Object.keys(testiDelleCause[lingua]).sort()).toEqual([...cause].sort());
  for (const c of cause) {
    const [it, en] = [testiDelleCause.it[c], testiDelleCause.en[c]];
    for (const t of [it, en]) {
      expect(t.breve.length).toBeGreaterThan(0);
      expect(t.suggerimento.length).toBeGreaterThan(0);
      expect(t.breve.length).toBeLessThanOrEqual(100);
    }
    expect(en.breve.includes("{segno}"), c).toBe(it.breve.includes("{segno}"));
    expect(it.breve).not.toBe(en.breve);
  }
  for (const [codice, elenco] of Object.entries(causeDeiCodici))
    for (const causa of elenco) {
      const t = testoDellaSegnalazione("it", codice as keyof typeof causeDeiCodici, false, { causa, segno: "§" });
      expect(t.breve).toBe(testiDelleCause.it[causa].breve.replace("{segno}", "§"));
      expect(t.accaduto).toBe(t.breve);
      expect(t.suggerimento).toBe(testiDelleCause.it[causa].suggerimento);
    }
  expect(testoDellaSegnalazione("en", "syntax_error", false)).toEqual(testiDeiCodici.en.syntax_error);
  expect(testoDellaSegnalazione("it", "limit_exceeded", true)).toEqual(testoDelMessaggio("it", "limit_exceeded", true));
  console.log(`cause con un testo: ${cause.length} per lingua, di ${Object.keys(causeDeiCodici).length} codici`);
});
