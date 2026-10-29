import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eseguiCaso } from "../core/casi/esecutore";
import { tetti } from "../core/controllo/controllo";
import { apri } from "../core/progetto/formato";
import { usaLeMatrici } from "../core/progetto/modello";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { cerca, daSpostare, eGruppoFornito, esempiDa, forniti, gruppoDi, mancanti, nomeLibero } from "./esempi";
import { cartellaDi, erroreDelFile, nomeDelFile, type CartellaDegliEsempi, type FileDiEsempio } from "./file";
import { esempioValido, gruppoValido, nomeRiservato } from "./nomi";

/** I dodici esempi forniti, scritti qui gruppo per gruppo: i quattro primi, i due coi cicli `per` e `per ogni`, i sei
 * con le procedure e le funzioni (gli ultimi tre ricorsivi). */
const dodiciNomi = (testi: typeof it) =>
  [
    [testi.esempiGruppoPrimiPassi, [testi.esempioMediaVoti, testi.esempioPariDispari, testi.esempioPrimoQuadrato, testi.esempioFattoriale]],
    [testi.esempiGruppoCicli, [testi.esempioMediaVotiPer, testi.esempioParolaAlContrario]],
    [testi.esempiGruppoFunzioni, [testi.esempioMediaVotiFunzioni, testi.esempioCopie, testi.esempioTreLivelli, testi.esempioFattorialeRicorsivo, testi.esempioSequenzaDiFibonacci, testi.esempioRicorsioneSenzaUscita]],
  ].flatMap(([gruppo, nomi]) => (nomi as string[]).map((n) => `${gruppo as string}/${n}.algo`));

/** Una cartella coi file dati: «nome» fuori da ogni gruppo, «gruppo/nome» in un gruppo; «gruppo/» un gruppo vuoto. */
function cartella(file: Record<string, string | FileDiEsempio["errore"]>): CartellaDegliEsempi {
  const comeFile = (nome: string, v: string | FileDiEsempio["errore"]): FileDiEsempio => (typeof v === "string" ? { nome, testo: v } : { nome, errore: v });
  const chiavi = Object.keys(file);
  const gruppi = [...new Set(chiavi.filter((k) => k.includes("/")).map((k) => k.slice(0, k.indexOf("/"))))];
  return {
    cartella: "",
    predefinita: "",
    mancante: false,
    esiste: true,
    file: chiavi.filter((k) => !k.includes("/")).map((k) => comeFile(k, file[k])),
    gruppi: gruppi.map((g) => ({ nome: g, file: chiavi.filter((k) => k.startsWith(`${g}/`) && k !== `${g}/`).map((k) => comeFile(k.slice(g.length + 1), file[k])) })),
  };
}
const daForniti = (f: readonly { gruppo: string; nome: string; testo: string }[]) => cartella(Object.fromEntries(f.map((x) => [`${x.gruppo}/${x.nome}`, x.testo])));
const nomi = (f: readonly { gruppo: string; nome: string }[]) => f.map((x) => `${x.gruppo}/${x.nome}`);

test("i dodici esempi forniti: un file per lingua nel suo gruppo, col nome e la descrizione tradotti, che il lettore accetta e la cartella apre, coi casi d'uso verdi, anche quelli delle funzioni", () => {
  let casi = 0;
  let casiDiFunzioni = 0;
  for (const testi of [it, en]) {
    const f = forniti(testi);
    expect(nomi(f)).toEqual(dodiciNomi(testi));
    for (const x of f) {
      const esito = apri(x.testo);
      expect(esito.ok).toBe(true);
      if (!esito.ok) continue;
      expect(`${esito.progetto.metadata.name}.algo`).toBe(x.nome);
      const verde = (caso: Parameters<typeof eseguiCaso>[1], funzione?: string) => {
        const e = eseguiCaso(esito.progetto, caso, tetti, funzione);
        expect({ esempio: x.nome, funzione, caso: caso.name, verde: !e.fuoriTappa && e.raggiunto && e.avvisi === undefined }).toEqual({ esempio: x.nome, funzione, caso: caso.name, verde: true });
      };
      for (const caso of esito.progetto.test_cases ?? []) {
        verde(caso);
        casi++;
      }
      for (const fn of esito.progetto.functions)
        for (const caso of fn.kind === "main" ? [] : (fn.test_cases ?? [])) {
          verde(caso, fn.id);
          casiDiFunzioni++;
        }
    }
    // La cartella li apre tutti, nei loro gruppi, nell'ordine dei forniti.
    const esempi = esempiDa(daForniti(f), tetti);
    expect(esempi.sciolti).toEqual([]);
    expect(esempi.gruppi.flatMap((g) => g.esempi.map((e) => [`${g.nome}/${e.nome}`, e.problema?.genere ?? null]))).toEqual(f.map((x) => [`${x.gruppo}/${x.nome}`, null]));
  }
  // Un caso del programma per esempio, due per il fattoriale ricorsivo (dieci e uno) e tre per la sequenza di Fibonacci
  // (dieci, uno, ventisei: quest'ultimo atteso fermo al tetto dei passi), uno per la ricorsione senza uscita (atteso fermo
  // alla pila del progetto); i casi delle procedure e funzioni del riferimento (tre) e della procedura che riceve le copie
  // (uno), in due lingue.
  expect([casi, casiDiFunzioni]).toEqual([30, 8]);
  // Il caso al tetto dei passi fa un milione di azioni per lingua: qualche secondo.
}, 60_000);

test("gli esempi ricorsivi: nel gruppo delle funzioni, il fattoriale e la sequenza di Fibonacci con la funzione che chiama sé stessa, e la procedura senza uscita con la pila del progetto a 10", () => {
  const [fattoriale, sequenza] = forniti(it).slice(-3, -1).map((x) => {
    const esito = apri(x.testo);
    if (!esito.ok) throw new Error(x.nome);
    const f = esito.progetto.functions.find((g) => g.kind === "function")!;
    return [x.gruppo, f.name, esito.progetto.metadata.description, JSON.stringify(f.body), (esito.progetto.test_cases ?? []).map((c) => c.name).join(" ")];
  });
  expect(fattoriale!.slice(0, 3)).toEqual([it.esempiGruppoFunzioni, "fatt", it.esempioFattorialeRicorsivoDescrizione]);
  expect(fattoriale![3]).toContain("fatt(n - 1)");
  expect(sequenza!.slice(0, 3)).toEqual([it.esempiGruppoFunzioni, "fibonacci", it.esempioSequenzaDiFibonacciDescrizione]);
  expect(sequenza![3]).toContain("fibonacci(n - 1) + fibonacci(n - 2)");
  expect(sequenza![4]).toBe("dieci uno ventisei");
  const senzaUscita = apri(forniti(it).at(-1)!.testo);
  if (!senzaUscita.ok) throw new Error("la ricorsione senza uscita non si apre");
  expect([forniti(it).at(-1)!.gruppo, senzaUscita.progetto.options, senzaUscita.progetto.metadata.description]).toEqual([
    it.esempiGruppoFunzioni,
    { call_stack_limit: 10 },
    it.esempioRicorsioneSenzaUscitaDescrizione,
  ]);
});

test("un esempio con procedure o funzioni si apre, su ogni file della tappa 3 (anche quelli con una stringa o un vettore restituiti) e della tappa 4 (la ricorsione)", () => {
  // I file della tappa 3 con una funzione che restituisce una stringa o un vettore, scritti per nome: si aprono come gli
  // altri, e la prova lo dice di ognuno.
  const conRisultato = new Set([
    "copia-di-stringhe-piu-lunghe.algo",
    "copia-di-un-vettore.algo",
    "risultato-stringa-messo-da-parte.algo",
    "risultato-stringa-oltre-la-lunghezza.algo",
    "risultato-stringa-troppo-lunga.algo",
    "risultato-stringa.algo",
    "risultato-vettore-argomento.algo",
    "risultato-vettore-assegnato.algo",
    "risultato-vettore-con-indice.algo",
    "risultato-vettore-di-stringhe-oltre-la-lunghezza.algo",
    "risultato-vettore-per-ogni.algo",
    "vettore-di-dimensione-diversa.algo",
  ]);
  const radice = (tappa: string) => join(import.meta.dir, "..", "casi", tappa);
  const file = (tappa: string) =>
    Object.fromEntries(
      readdirSync(radice(tappa))
        .filter((f) => f.endsWith(".algo"))
        .map((nome) => [nome, readFileSync(join(radice(tappa), nome), "utf8")]),
    );
  const esempi = (tappa: string) => esempiDa(cartella(file(tappa)), tetti).sciolti;
  expect(esempi("tappa-3").map((e) => [e.nome, e.problema?.genere ?? null])).toEqual(Object.keys(file("tappa-3")).map((n) => [n, null]));
  expect(esempi("tappa-4").map((e) => [e.nome, e.problema?.genere ?? null])).toEqual(Object.keys(file("tappa-4")).map((n) => [n, null]));
  expect(esempi("tappa-4").filter((e) => e.progetto !== null).length).toBe(22);
  // Controllo positivo: i denominatori sono le tappe intere (la tappa 3 con le sue procedure e funzioni), e i file con
  // un risultato nuovo ci sono tutti, e si aprono.
  expect([Object.keys(file("tappa-3")).length, Object.keys(file("tappa-4")).length]).toEqual([53, 22]);
  expect(Object.keys(file("tappa-3")).filter((n) => conRisultato.has(n)).length).toBe(12);
  expect(esempi("tappa-3").filter((e) => conRisultato.has(e.nome) && e.progetto !== null).length).toBe(12);
  expect(esempi("tappa-3").filter((e) => (e.progetto?.functions.length ?? 0) > 1).length).toBe(53);
});

test("mancano i forniti che il loro gruppo non ha in nessuna lingua, e vanno nel gruppo che c'è già col suo nome; in un gruppo riempito quando i forniti erano meno mancano i nuovi", () => {
  expect(nomi(mancanti(cartella({}), it))).toEqual(dodiciNomi(it));
  // Il gruppo in inglese, scritto con altre maiuscole, è quello dei primi passi: ci vanno i due che mancano, col suo nome.
  const c = cartella({
    [`first STEPS/${en.esempioMediaVoti}.algo`]: "",
    [`first STEPS/${it.esempioPariDispari.toUpperCase()}.algo`]: "",
    "first STEPS/altro.algo": "",
    [`${it.esempiGruppoCicli}/${it.esempioMediaVotiPer}.algo`]: "",
    [`${it.esempiGruppoCicli}/${it.esempioParolaAlContrario}.algo`]: "",
    // Un fornito in un altro gruppo non è nel suo: manca.
    [`${it.esempiGruppoMiei}/${it.esempioMediaVotiFunzioni}.algo`]: "",
  });
  expect(nomi(mancanti(c, it))).toEqual([
    `first STEPS/${it.esempioPrimoQuadrato}.algo`,
    `first STEPS/${it.esempioFattoriale}.algo`,
    ...dodiciNomi(it).slice(6),
  ]);
  // «Ripristina» in una cartella riempita coi sei forniti di prima nei loro gruppi: arrivano i sei nuovi; coi nove di
  // prima, i tre ricorsivi.
  expect(nomi(mancanti(daForniti(forniti(it).slice(0, 6)), it))).toEqual(dodiciNomi(it).slice(6));
  expect(nomi(mancanti(daForniti(forniti(it).slice(0, 9)), it))).toEqual(dodiciNomi(it).slice(9));
  expect(mancanti(daForniti(forniti(en)), it)).toEqual([]);
});

test("i forniti fuori da ogni gruppo si spostano nel loro, se lì non ci sono già; i file dell'utente, i non leggibili e quelli già nel gruppo restano", () => {
  // La cartella di chi aveva i sei forniti in un elenco piatto (uno in inglese), un file suo, uno illeggibile col nome di un
  // fornito, e il gruppo dei cicli già creato (con l'inglese di «parola al contrario» dentro).
  const prima = forniti(it);
  const sciolti = Object.fromEntries(prima.slice(0, 5).map((f) => [f.nome, f.testo]));
  const c = cartella({
    ...sciolti,
    [`${en.esempioParolaAlContrario}.algo`]: "testo inglese",
    "il mio esercizio.algo": "mio",
    [`${it.esempioMediaVotiFunzioni}.algo`]: { genere: "non_testo", dettaglio: "" },
    [`${it.esempiGruppoCicli.toLowerCase()}/${en.esempioParolaAlContrario.toLowerCase()}.algo`]: "",
  });
  const spostati = daSpostare(c, it);
  expect(spostati.map((f) => [f.gruppo, f.nome])).toEqual([
    ...prima.slice(0, 4).map((f) => [it.esempiGruppoPrimiPassi, f.nome]),
    [it.esempiGruppoCicli.toLowerCase(), prima[4]!.nome],
  ]);
  // Il testo è quello del file, com'è.
  expect(spostati.map((f) => f.testo)).toEqual(prima.slice(0, 5).map((f) => f.testo));
  // Controllo positivo: senza il gruppo dei cicli, si sposta anche l'inglese, in un gruppo nuovo col nome italiano.
  const senza = cartella({ ...sciolti, [`${en.esempioParolaAlContrario}.algo`]: "testo inglese" });
  expect(daSpostare(senza, it).at(-1)).toEqual({ gruppo: it.esempiGruppoCicli, nome: `${en.esempioParolaAlContrario}.algo`, testo: "testo inglese" });
  // Due copie dello stesso fornito, a meno delle maiuscole: si sposta la prima, la seconda resta.
  expect(daSpostare(cartella({ "media dei voti.algo": "a", [`${it.esempioMediaVoti}.algo`]: "b" }), it).map((f) => f.testo)).toEqual(["a"]);
});

test("i gruppi in ordine: prima quelli dei forniti, nel loro ordine e in una qualunque lingua, poi gli altri come li dà il guscio; i file fuori dai gruppi a parte", () => {
  const c = cartella({
    "Altri/a.algo": "{",
    [`${en.esempiGruppoFunzioni}/`]: "",
    [`${it.esempiGruppoMiei}/`]: "",
    [`${it.esempiGruppoPrimiPassi}/b.algo`]: "{",
    "sciolto.algo": "{",
  });
  const esempi = esempiDa(c, tetti);
  expect(esempi.gruppi.map((g) => [g.nome, g.esempi.map((e) => [e.nome, e.gruppo])])).toEqual([
    [it.esempiGruppoPrimiPassi, [["b.algo", it.esempiGruppoPrimiPassi]]],
    [en.esempiGruppoFunzioni, []],
    ["Altri", [["a.algo", "Altri"]]],
    [it.esempiGruppoMiei, []],
  ]);
  expect(esempi.sciolti.map((e) => [e.nome, e.gruppo])).toEqual([["sciolto.algo", null]]);
});

test("la ricerca trova nel nome, nella descrizione e nel nome del file, senza maiuscole né accenti; i gruppi senza nessuno spariscono", () => {
  const esempi = esempiDa(daForniti(forniti(it)), tetti);
  const trovati = (testo: string) => cerca(esempi, testo).gruppi.map((g) => [g.nome, g.esempi.map((e) => e.progetto?.metadata.name)]);
  expect(cerca(esempi, "  ")).toBe(esempi);
  expect(trovati("MEDIA")).toEqual([
    [it.esempiGruppoPrimiPassi, [it.esempioMediaVoti]],
    [it.esempiGruppoCicli, [it.esempioMediaVotiPer]],
    [it.esempiGruppoFunzioni, [it.esempioMediaVotiFunzioni]],
  ]);
  // Nella descrizione, senza l'accento: «più uno».
  expect(trovati("piu uno")).toEqual([[it.esempiGruppoFunzioni, [it.esempioTreLivelli]]]);
  expect(trovati("vocali")).toEqual([[it.esempiGruppoCicli, [it.esempioParolaAlContrario]]]);
  expect(trovati("nessuno così")).toEqual([]);
  // Nel nome del file, per un esempio che non si apre.
  expect(cerca(esempiDa(cartella({ "rotto.algo": "{" }), tetti), "rott").sciolti.map((e) => e.nome)).toEqual(["rotto.algo"]);
});

/** La tabella dei nomi comune con la prova del guscio (`shell/src/nomi.json`, letta anche da `cargo test`), coi caratteri
 * di controllo scritti `<U+XXXX>` costruiti qui. */
const tabella = (() => {
  const letti = JSON.parse(readFileSync(new URL("../shell/src/nomi.json", import.meta.url), "utf8")) as Record<"esempi" | "gruppi", { buoni: string[]; cattivi: string[] }> & { riservati: { si: string[]; no: string[] } };
  const costruito = (n: string) => n.replace(/<U\+([0-9A-F]{4})>/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  const coppia = (c: { buoni: string[]; cattivi: string[] }) => ({ buoni: c.buoni.map(costruito), cattivi: c.cattivi.map(costruito) });
  return { esempi: coppia(letti.esempi), gruppi: coppia(letti.gruppi), riservati: { si: letti.riservati.si.map(costruito), no: letti.riservati.no.map(costruito) } };
})();

test("i nomi degli esempi, dei gruppi e quelli riservati seguono la tabella comune col guscio", () => {
  const sbagliati = [
    ...tabella.esempi.buoni.filter((n) => !esempioValido(n)).map((n) => `esempio buono rifiutato: ${JSON.stringify(n)}`),
    ...tabella.esempi.cattivi.filter(esempioValido).map((n) => `esempio cattivo accettato: ${JSON.stringify(n)}`),
    ...tabella.gruppi.buoni.filter((n) => !gruppoValido(n)).map((n) => `gruppo buono rifiutato: ${JSON.stringify(n)}`),
    ...tabella.gruppi.cattivi.filter(gruppoValido).map((n) => `gruppo cattivo accettato: ${JSON.stringify(n)}`),
    ...tabella.riservati.si.filter((n) => !nomeRiservato(n)).map((n) => `riservato non visto: ${JSON.stringify(n)}`),
    ...tabella.riservati.no.filter(nomeRiservato).map((n) => `simile visto riservato: ${JSON.stringify(n)}`),
  ];
  console.log(`esempi ${tabella.esempi.buoni.length} + ${tabella.esempi.cattivi.length}, gruppi ${tabella.gruppi.buoni.length} + ${tabella.gruppi.cattivi.length}, riservati ${tabella.riservati.si.length} + ${tabella.riservati.no.length}`);
  expect(sbagliati).toEqual([]);
  // Le premesse: la tabella è letta, e i caratteri di controllo sono costruiti.
  expect(tabella.esempi.cattivi.some((n) => n.includes(String.fromCharCode(0x7f)))).toBe(true);
  expect(Math.min(tabella.esempi.buoni.length, tabella.esempi.cattivi.length, tabella.gruppi.buoni.length, tabella.gruppi.cattivi.length, tabella.riservati.si.length, tabella.riservati.no.length)).toBeGreaterThan(3);
  // I nomi che `nomeLibero` dà sono nomi d'esempio validi.
  for (const progetto of ["Media", "nul", "CON.x", "..nascosto", "  ", `Voti${String.fromCharCode(0x85)}`, "a:b"]) expect({ progetto, valido: esempioValido(nomeLibero(progetto, [], "esempio")) }).toEqual({ progetto, valido: true });
});

test("un gruppo che c'è già a meno delle maiuscole è lo stesso; i gruppi dei forniti si riconoscono", () => {
  const c = ["Primi passi", "Cicli"];
  expect(gruppoDi(c, "primi PASSI")).toBe("Primi passi");
  expect(gruppoDi(c, "Altro")).toBe("Altro");
  // I gruppi dei forniti, che non si eliminano, in una qualunque lingua e senza maiuscole; gli altri sì.
  expect([it.esempiGruppoCicli, en.esempiGruppoFunzioni.toUpperCase(), it.esempiGruppoPrimiPassi, it.esempiGruppoMiei, "Verifica"].map(eGruppoFornito)).toEqual([true, true, true, false, false]);
});

test("un file della cartella che non si apre resta, col suo problema", () => {
  const [buono] = forniti(it);
  const esempi = esempiDa(cartella({ "a.algo": buono!.testo, "b.algo": "{", "c.algo": { genere: "non_testo", dettaglio: "" } }), tetti);
  expect(esempi.sciolti.map((e) => [e.nome, e.progetto !== null, e.problema?.genere ?? null])).toEqual([
    ["a.algo", true, null],
    ["b.algo", false, "apertura"],
    ["c.algo", false, "file"],
  ]);
});

test("un nome di file libero per un esempio: i caratteri vietati tolti, poi (2), (3)… senza badare alle maiuscole", () => {
  expect(nomeLibero("Media", [], "esempio")).toBe("Media.algo");
  expect(nomeLibero("Media", ["media.algo"], "esempio")).toBe("Media (2).algo");
  expect(nomeLibero("Media", ["Media.algo", "Media (2).algo"], "esempio")).toBe("Media (3).algo");
  expect(nomeLibero('a/b:c*?"<>|', [], "esempio")).toBe("abc.algo");
  // I caratteri di controllo che il guscio rifiuta, anche oltre il 31: U+007F, U+0085, U+009F.
  expect(nomeLibero(`Voti${String.fromCharCode(0x7f, 0x85, 0x9f)}`, [], "esempio")).toBe("Voti.algo");
  expect(nomeLibero("..nascosto", [], "esempio")).toBe("nascosto.algo");
  expect(nomeLibero("  ", [], "esempio")).toBe("esempio.algo");
  // Un nome che Windows riserva parte da (2); seguito da un punto, il punto diventa un trattino basso.
  expect(nomeLibero("nul", [], "esempio")).toBe("nul (2).algo");
  expect(nomeLibero("CON", ["CON (2).algo"], "esempio")).toBe("CON (3).algo");
  expect(nomeLibero("CON.x", [], "esempio")).toBe("CON_x.algo");
  expect([nomeLibero("nul", [], "esempio"), nomeLibero("CON.x", [], "esempio")].map(nomeRiservato)).toEqual([false, false]);
});

test("nome e cartella di un percorso, nome proposto, errore del guscio riconosciuto per forma", () => {
  expect(nomeDelFile("C:\\miei\\media voti.algo")).toBe("media voti.algo");
  expect(nomeDelFile("/home/x/media.algo")).toBe("media.algo");
  expect(cartellaDi("C:\\miei\\media voti.algo")).toBe("C:\\miei");
  expect(cartellaDi("/home/x/media.algo")).toBe("/home/x");
  expect(cartellaDi("media.algo")).toBeNull();
  expect(erroreDelFile({ genere: "non_testo", dettaglio: "byte" })).toEqual({ genere: "non_testo", dettaglio: "byte" });
  expect(erroreDelFile(new Error("file non trovato"))).toEqual({ genere: "sistema", dettaglio: "file non trovato" });
});

test("un esempio coi record o con le matrici si apre: ogni file della cartella dei tipi, anche con un errore statico (lo dice il controllo nella finestra)", () => {
  const radice = join(import.meta.dir, "..", "casi", "tipi");
  const file = Object.fromEntries(
    readdirSync(radice)
      .filter((f) => f.endsWith(".algo"))
      .map((nome) => [nome, readFileSync(join(radice, nome), "utf8")]),
  );
  const conLeMatrici = (testo: string) => {
    const a = apri(testo);
    return a.ok && usaLeMatrici(a.progetto);
  };
  const esempi = esempiDa(cartella(file), tetti).sciolti;
  expect(esempi.map((e) => [e.nome, e.progetto !== null, e.problema?.genere ?? null])).toEqual(Object.keys(file).map((n) => [n, true, null]));
  // Controllo positivo: il denominatore è la cartella intera (dei record sette file giusti e quattro sbagliati, delle
  // matrici tredici, quattro con un errore statico, delle tabelle sei, una con un errore statico, che si aprono lo stesso,
  // e uno senza tipi composti, il carattere del vettore di stringhe restituito), e un esempio senza record accanto si apre
  // come loro.
  expect(esempi.length).toBe(31);
  expect(Object.values(file).filter(conLeMatrici).length).toBe(13);
  const [buono] = forniti(it);
  expect(esempiDa(cartella({ "a.algo": buono!.testo }), tetti).sciolti.map((e) => e.problema)).toEqual([null]);
});
