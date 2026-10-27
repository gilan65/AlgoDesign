// Il lettore dei testi in «Accademico» da riga di comando: da un testo una libreria di AlgoDesign, nuova o allungata.
//
//   bun run accademico <testo.txt> [-l libreria.algo] [-o uscita.algo] [-n nome] [-d dimensione] [-r]
//   bun run accademico -h
//
// Il testo si legge col lettore del nucleo (`core/lettore/accademico.ts`): le funzioni del testo diventano procedure e
// funzioni della libreria, e il codice al livello più esterno una procedura col nome del file (o `-n`), coi nomi che usa e
// non dichiara come parametri. Con `-l` le procedure e funzioni si aggiungono a una libreria che c'è (ciò che c'è già
// identico non entra, il resto della libreria non cambia); senza, nasce una libreria nuova. Si scrive in `-o`; senza, nella
// libreria di `-l`, o accanto al testo col suo nome e l'estensione `.algo`. `-d` è la lunghezza di un vettore che il testo
// non dice (predefinita 10); `-r` rinomina col primo seguito `_2` libero un nome già nella libreria o riservato dal
// flowchart, che altrimenti ferma lo strumento.
//
// Stampa una riga per ogni trasformazione e ogni nota, con la riga del testo, e una per ogni procedura o funzione aggiunta
// o già presente; poi il file scritto. Esce con 1, senza scrivere nulla, su un testo che non si legge (la riga e il
// motivo), un nome in conflitto senza `-r`, o una libreria che ne esce con errori statici (la riga del blocco, se è del
// testo); con 2 su un'opzione sbagliata, insieme al modo d'uso.
//
// Che cosa NON guarda: gli avvisi del controllo statico (la libreria si apre e si esegue lo stesso); i casi d'uso, che il
// testo non ha.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { causaDelNome, controlla, tetti } from "../core/controllo/controllo";
import { aggiungiAllaLibreria, dimensionePredefinita, leggiAccademico, type Nota, type Trasformazione } from "../core/lettore/accademico";
import { progettoNuovo } from "../core/modifica/operazioni";
import { apri, salva } from "../core/progetto/formato";
import type { Blocco, Progetto } from "../core/progetto/modello";

// Il comando come lo scrive chi lo usa: `bun run accademico` nel repository, il nome dell'eseguibile a sé fuori.
const comando = basename(process.execPath).toLowerCase().startsWith("bun") ? "bun run accademico" : basename(process.execPath, extname(process.execPath));
const modoDUso = `Legge un testo in «Accademico» e ne fa una libreria di AlgoDesign.

  ${comando} <testo.txt> [-l libreria.algo] [-o uscita.algo] [-n nome] [-d dimensione] [-r]
  ${comando} -h

  <testo.txt>          il testo da leggere, in UTF-8
  -l libreria.algo     aggiunge a questa libreria (senza: una libreria nuova)
  -o uscita.algo       dove scrivere (senza: la libreria di -l, o <testo>.algo accanto al testo)
  -n nome              il nome della procedura del codice fuori dalle funzioni (senza: quello del file)
  -d dimensione        la lunghezza di un vettore che il testo non dice (senza: ${dimensionePredefinita})
  -r                   rinomina un nome già nella libreria o riservato, invece di fermarsi
  -h                   mostra questo aiuto

Esempio:
  ${comando} programma-01.txt -o esempi.algo
  ${comando} programma-02.txt -l esempi.algo -r
`;

const argomenti = process.argv.slice(2);
const sbagliato = (motivo: string): never => {
  console.error(`${motivo}\n\n${modoDUso}`);
  process.exit(2);
};
const ferma = (motivo: string): never => {
  console.log(`ERRORE ${motivo}`);
  process.exit(1);
};

if (argomenti.includes("-h")) {
  console.log(modoDUso);
  process.exit(0);
}
let testoDaLeggere: string | undefined;
let libreria: string | undefined;
let uscita: string | undefined;
let nome: string | undefined;
let dimensione = dimensionePredefinita;
let rinomina = false;
for (let i = 0; i < argomenti.length; i++) {
  const a = argomenti[i]!;
  const valore = () => argomenti[++i] ?? sbagliato(`${a} vuole un valore`);
  if (a === "-l") libreria = valore();
  else if (a === "-o") uscita = valore();
  else if (a === "-n") nome = valore();
  else if (a === "-d") {
    const v = valore();
    dimensione = Number(v);
    if (!/^[1-9]\d*$/.test(v) || dimensione > tetti.elementiDiUnVettore) sbagliato(`-d vuole un numero da 1 a ${tetti.elementiDiUnVettore}`);
  } else if (a === "-r") rinomina = true;
  else if (a.startsWith("-")) sbagliato(`l'opzione ${a} non c'è`);
  else if (testoDaLeggere === undefined) testoDaLeggere = a;
  else sbagliato(`un testo alla volta: ${a} è in più`);
}
if (testoDaLeggere === undefined) sbagliato("manca il testo da leggere");
const percorso = testoDaLeggere!;

let testo: string;
try {
  testo = readFileSync(percorso, "utf8").replace(/^﻿/, "");
} catch (e) {
  ferma(`${percorso} non si legge: ${(e as Error).message}`);
}
const radice = basename(percorso, extname(percorso));
const procedura = nome ?? radice.replace(/\W/g, "_");
if (causaDelNome(procedura, true) !== undefined) ferma(`${procedura} non è un nome per la procedura del codice esterno: dagliene uno con -n`);

let dove: Progetto;
if (libreria !== undefined) {
  let l: string;
  try {
    l = readFileSync(libreria, "utf8");
  } catch (e) {
    ferma(`${libreria} non si legge: ${(e as Error).message}`);
  }
  const a = apri(l!);
  if (!a.ok) ferma(`${libreria} non è un file di AlgoDesign valido`);
  if (a.ok && a.progetto.metadata.library !== true) ferma(`${libreria} non è una libreria`);
  dove = (a as { progetto: Progetto }).progetto;
} else {
  const n = progettoNuovo({ name: basename(uscita ?? percorso, extname(uscita ?? percorso)), library: true });
  if (!n.ok) throw new Error("la libreria nuova non nasce");
  dove = n.progetto;
}

const letto = leggiAccademico(testo!, { procedura, dimensione, rinomina, lingua: "it" }, dove);
if (!letto.ok) ferma(`${percorso}, riga ${letto.riga}: ${letto.motivo}`);
const l = letto as Extract<typeof letto, { ok: true }>;
const aggiunta = aggiungiAllaLibreria(dove, l, rinomina);
if (!aggiunta.ok) {
  for (const c of aggiunta.conflitti) console.log(`ERRORE ${percorso}, riga ${c.riga}: ${c.nome} c'è già nella libreria (con -r diventa ${c.proposto})`);
  process.exit(1);
}

const descrizione = (t: Trasformazione): string => {
  switch (t.specie) {
    case "return":
      return "un «return» prima della fine: ciò che segue va nell'altro ramo, il valore nel dato del risultato";
    case "dichiarazione":
      return "la dichiarazione va fra i dati della funzione";
    case "scambio":
      return "lo scambio diventa tre assegnazioni con un dato d'appoggio";
    case "elenco":
      return "l'elenco diventa un'assegnazione per elemento";
    case "nome-riservato":
      return `il nome ${t.nome} è riservato nel flowchart: diventa ${t.nuovo}`;
    case "nome-in-uso":
      return t.dato === true ? `il dato ${t.nome} ha il nome di una funzione: diventa ${t.nuovo}` : `il nome ${t.nome} c'è già nella libreria: diventa ${t.nuovo}`;
  }
};
const nota = (n: Nota): string => {
  switch (n.specie) {
    case "int":
      return "«int» si legge «integer»";
    case "parametro":
      return `${n.nome} non è dichiarata: diventa un parametro`;
    case "dimensione":
      return `il vettore ${n.nome} non dice la lunghezza: ne ha ${n.valore}`;
    case "procedura":
      return `il codice fuori dalle funzioni diventa la procedura ${n.nome}`;
  }
};
const trasformazioni = [...l.trasformazioni, ...aggiunta.rinominate].sort((a, b) => a.riga - b.riga);
for (const t of trasformazioni) console.log(`TRASFORMAZIONE riga ${t.riga} (${t.specie}): ${descrizione(t)}`);
for (const n of l.note) console.log(`NOTA riga ${n.riga} (${n.specie}): ${nota(n)}`);

// Gli errori statici della libreria che esce, con la riga del testo: le procedure e funzioni entrate hanno la stessa forma
// di quelle lette, con gli `id` nuovi nello stesso ordine di lettura.
const c = controlla(aggiunta.progetto, tetti);
if (c.fuoriTappa) ferma(`${percorso}: la libreria che ne esce ha costrutti che il flowchart non esegue ancora`);
if (!c.fuoriTappa && c.errori.length > 0) {
  const righe = new Map<string, number>();
  const inOrdine = (bs: readonly Blocco[]): Blocco[] => bs.flatMap((b) => [b, ...inOrdine(b.kind === "if" ? [...b.then, ...b.else] : "body" in b ? b.body : [])]);
  const rinominate = new Map(aggiunta.rinominate.map((r) => [r.nome!, r.nuovo!]));
  for (const f of l.progetto.functions.filter((x) => x.kind !== "main")) {
    const g = aggiunta.progetto.functions.find((x) => x.name === (rinominate.get(f.name!) ?? f.name));
    if (g === undefined || !aggiunta.aggiunte.includes(g.name!)) continue;
    const da = inOrdine(f.body);
    inOrdine(g.body).forEach((b, i) => righe.set(b.id, l.rigaDelBlocco.get(da[i]!.id) ?? 0));
    righe.set(g.end.id, l.rigaDelBlocco.get(f.end.id) ?? 0);
    righe.set(g.id, l.rigaDellaFunzione.get(f.name!) ?? 0);
  }
  for (const e of c.errori) console.log(`ERRORE ${percorso}${righe.has(e.block) ? `, riga ${righe.get(e.block)}` : ""}: errore statico ${e.code}`);
  process.exit(1);
}

for (const n of aggiunta.aggiunte) console.log(`AGGIUNTA ${n}`);
for (const n of aggiunta.identiche) console.log(`GIÀ PRESENTE ${n}`);
const scritto = uscita ?? libreria ?? join(dirname(percorso), `${radice}.algo`);
writeFileSync(scritto, salva(aggiunta.progetto), "utf8");
console.log(`SCRITTO ${scritto}`);
