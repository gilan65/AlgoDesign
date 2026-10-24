// La bozza dei campi di un dato: andata e ritorno senza perdite su ogni dato del corpus della tappa 1 e su
// un insieme scritto qui con ogni forma (il corpus non ha costanti, vettori con valore iniziale né
// lunghezze); l'elenco di un vettore separato fuori dai letterali; i campi che il ritorno non giudica.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { apri } from "../../core/progetto/formato";
import type { Dato } from "../../core/progetto/modello";
import { bozzaDi, conNatura, conRipetuto, datoDaBozza, elementi, inizialeDaBozza, naturaDi, stessoDato } from "./bozza";

const cartella = join(import.meta.dir, "..", "..", "casi", "tappa-1");
const corpus = readdirSync(cartella)
  .filter((f) => f.endsWith(".algo"))
  .flatMap((f) => {
    const a = apri(readFileSync(join(cartella, f), "utf8"));
    if (!a.ok) throw new Error(f);
    return [...(a.progetto.shared_constants ?? []), ...a.progetto.functions.flatMap((x) => x.data)];
  });

const ogniForma: Dato[] = [
  { name: "voti", type: "integer", size: 5, initial: { each: "0" }, role: "input" },
  { name: "pesi", type: "real", size: 3, constant: true, initial: ["1.0", "-2.0", "0.5"] },
  { name: "sigle", type: "character", size: 3, initial: ["','", "'\\''", "'a'"] },
  { name: "frasi", type: "string", size: 2, initial: ['"uno, due"', '"tre \\" quattro, cinque"'], max_length: 30 },
  { name: "iniziale", type: "character", role: "input_output" },
  { name: "nome", type: "string", max_length: 20, role: "input" },
  { name: "trovato", type: "boolean", initial: "false", role: "output" },
  { name: "minimo", type: "integer", constant: true, initial: "-5" },
];

test("andata e ritorno: ogni dato del corpus e di ogni forma torna uguale dalla sua bozza", () => {
  const diversi = [...corpus, ...ogniForma].filter((d) => !stessoDato(datoDaBozza(bozzaDi(d, "elenco")), d) || !stessoDato(datoDaBozza(bozzaDi(d, "un-valore")), d)).map((d) => d.name);
  console.log(`bozza dei dati: corpus ${corpus.length} dati, di ogni forma ${ogniForma.length}; diversi al ritorno ${diversi.length}`);
  expect(diversi).toEqual([]);
  expect(corpus.length).toBe(104);
  // Controllo positivo: il confronto vede un attributo cambiato.
  expect(stessoDato({ ...ogniForma[0]!, role: "output" }, ogniForma[0]!)).toBe(false);
});

test("l'elenco di un vettore si separa sulle virgole fuori dai letterali", () => {
  expect(elementi("1, 2 ,3")).toEqual(["1", "2", "3"]);
  expect(elementi(`"a, b", 'c', ','`)).toEqual(['"a, b"', "'c'", "','"]);
  expect(elementi(`"x \\" y, z", "w"`)).toEqual(['"x \\" y, z"', '"w"']);
  expect(elementi("")).toEqual([""]);
});

test("il ritorno non giudica: campi vuoti, numeri non interi, lunghezza fuori dalle stringhe", () => {
  const base = bozzaDi({ name: "x", type: "integer" }, "elenco");
  expect(datoDaBozza({ ...base, nome: "" })).toEqual({ name: "", type: "integer" });
  expect(datoDaBozza({ ...base, vettore: true, dimensione: "tre" })).toEqual({ name: "x", type: "integer", size: 0 });
  // Un intero che il file non sa scrivere esatto (oltre i 2^53) vale come un numero non intero.
  for (const dimensione of ["9".repeat(17), "9".repeat(309)]) expect(datoDaBozza({ ...base, vettore: true, dimensione })).toEqual({ name: "x", type: "integer", size: 0 });
  expect(datoDaBozza({ ...base, tipo: "string", lunghezza: "9".repeat(309) })).toEqual({ name: "x", type: "string", max_length: 0 });
  expect(datoDaBozza({ ...base, vettore: true, dimensione: "4", iniziale: "1, 2" })).toEqual({ name: "x", type: "integer", size: 4, initial: ["1", "2"] });
  expect(datoDaBozza({ ...base, iniziale: "  " })).toEqual({ name: "x", type: "integer" });
  expect(datoDaBozza({ ...base, lunghezza: "20" })).toEqual({ name: "x", type: "integer" });
  expect(datoDaBozza({ ...base, tipo: "string", lunghezza: "20" })).toEqual({ name: "x", type: "string", max_length: 20 });
  expect(datoDaBozza({ ...base, costante: true, ruolo: "input" })).toEqual({ name: "x", type: "integer", constant: true, role: "input" });
});

test("la natura: un parametro torna col suo modo, senza valore iniziale, ruolo né costante; «globale» solo per una costante", () => {
  const parametri: Dato[] = [
    { name: "voti", type: "integer", size: 5, parameter: "reference" },
    { name: "nome", type: "string", max_length: 20, parameter: "value" },
  ];
  expect(parametri.filter((d) => !stessoDato(datoDaBozza(bozzaDi(d, "elenco")), d))).toEqual([]);
  const base = bozzaDi({ name: "x", type: "integer", initial: "3", role: "input" }, "elenco");
  const comeParametro = conNatura(base, "value");
  expect(datoDaBozza(comeParametro)).toEqual({ name: "x", type: "integer", parameter: "value" });
  // Tornando variabile, il valore iniziale e il ruolo che la bozza teneva ricompaiono.
  expect(datoDaBozza(conNatura(comeParametro, "variabile"))).toEqual({ name: "x", type: "integer", initial: "3", role: "input" });
  expect([naturaDi(comeParametro), naturaDi(conNatura(base, "costante")), naturaDi(base)]).toEqual(["value", "costante", "variabile"]);
  const globale = { ...conNatura(base, "costante"), globale: true };
  expect([conNatura(globale, "costante").globale, conNatura(globale, "variabile").globale, conNatura(globale, "reference").globale]).toEqual([true, false, false]);
  expect(bozzaDi({ name: "MAX", type: "integer", constant: true, initial: "1" }, "elenco", true).globale).toBe(true);
});

test("un vettore nuovo nasce nel modo delle Impostazioni, e ogni vettore lo scavalca", () => {
  // Un dato semplice, o un vettore ancora senza valore, che diventa un vettore: il modo scelto nelle Impostazioni.
  for (const d of [{ name: "x", type: "integer" as const }, { name: "v", type: "integer" as const, size: 3 }]) {
    expect(bozzaDi(d, "elenco").ripetuto).toBe(false);
    expect(bozzaDi(d, "un-valore").ripetuto).toBe(true);
  }
  // Un vettore che ha già un valore tiene il suo modo, qualunque sia l'impostazione.
  const ripetuto = { name: "v", type: "integer" as const, size: 3, initial: { each: "0" } };
  const elenco = { name: "w", type: "integer" as const, size: 3, initial: ["1", "2", "3"] };
  for (const modo of ["elenco", "un-valore"] as const) {
    expect(bozzaDi(ripetuto, modo).ripetuto).toBe(true);
    expect(bozzaDi(elenco, modo).ripetuto).toBe(false);
  }
});

test("l'elenco di un vettore si mostra fra graffe, come il blocco e la riga della tabella, e si legge con o senza", () => {
  const vettore = (initial: Dato["initial"]): Dato => ({ name: "v", type: "string", size: 3, ...(initial === undefined ? {} : { initial }) });
  expect(bozzaDi(vettore(["1", "2", "3"]), "elenco").iniziale).toBe("{1, 2, 3}");
  // Il valore ripetuto e un dato semplice restano senza graffe.
  expect(bozzaDi(vettore({ each: "0" }), "elenco").iniziale).toBe("0");
  expect(bozzaDi({ name: "x", type: "integer", initial: "5" }, "elenco").iniziale).toBe("5");
  const letto = (iniziale: string) => inizialeDaBozza({ iniziale, vettore: true, ripetuto: false });
  for (const testo of ["{1, 2, 3}", "1, 2, 3", "  { 1, 2, 3 }  "]) expect(letto(testo)).toEqual(["1", "2", "3"]);
  // Una graffa dentro un letterale non conta; le graffe vuote sono l'elenco vuoto, cioè nessun valore.
  expect(letto('{"}", "{"}')).toEqual(['"}"', '"{"']);
  expect(letto("{}")).toBeUndefined();
  expect(letto("{ }")).toBeUndefined();
  // Una graffa sola resta nel testo: la segnala il controllo.
  expect(letto("{1, 2")).toEqual(["{1", "2"]);
  // Il valore ripetuto non toglie graffe.
  expect(inizialeDaBozza({ iniziale: "{1}", vettore: true, ripetuto: true })).toEqual({ each: "{1}" });
});

test("da un valore ripetuto all'elenco: il campo si riempie col valore, uno per elemento", () => {
  const b = bozzaDi({ name: "v", type: "integer", size: 4, initial: { each: "7" } }, "elenco");
  const passato = conRipetuto(b, false);
  expect(passato.iniziale).toBe("{7, 7, 7, 7}");
  expect(datoDaBozza(passato)).toEqual({ name: "v", type: "integer", size: 4, initial: ["7", "7", "7", "7"] });
  // Un letterale con una virgola resta un elemento solo.
  expect(conRipetuto({ ...b, iniziale: '"a, b"', tipo: "string", dimensione: "2" }, false).iniziale).toBe('{"a, b", "a, b"}');
  // Senza un valore, o con una dimensione che non è un intero fra 1 e 1000, il campo resta com'è.
  expect(conRipetuto({ ...b, iniziale: "" }, false).iniziale).toBe("");
  for (const dimensione of ["", "zero", "0", "1001", "2.5"]) expect(conRipetuto({ ...b, dimensione }, false).iniziale).toBe("7");
  // Dall'elenco al valore ripetuto il campo resta com'è; e la casella cambia in ogni caso.
  expect(conRipetuto(passato, true)).toEqual({ ...passato, ripetuto: true });
  expect(conRipetuto({ ...b, iniziale: "" }, false).ripetuto).toBe(false);
});

// I campi rifiutati di un dato non si raggiungono dai campi: il nucleo accetta ogni dato che una bozza produce (gli errori
// li dice il controllo statico, il nucleo rifiuta solo un progetto che il file non potrebbe contenere). Per questo il
// ritorno della scheda dei dati quando i campi sono rifiutati (`confermaIApertiCampi`) è provato solo per i casi
// (`ui/casi/casi.test.tsx`): se una bozza diventasse rifiutabile, questa prova è rossa e il ramo dei dati va provato.
test("nessuna bozza di un dato, anche coi campi più strani, è rifiutata dal nucleo; un dato che il file non può contenere sì", async () => {
  const { cambiaDato } = await import("../../core/modifica/operazioni");
  const a = apri(readFileSync(join(cartella, "lettura-intero.algo"), "utf8"));
  if (!a.ok) throw new Error("lettura-intero.algo");
  // Le 309 cifre: un numero che `parseInt` fa diventare infinito, e che il file non sa scrivere.
  const strani = ["", " ", "0", "-3", "2.5", "1001", "abc", "1e9", "'", '"', "{", "x, y", "è", "9".repeat(40), "9".repeat(309)];
  const tipi = ["integer", "real", "character", "string", "boolean"] as const;
  let provate = 0;
  const rifiutate: string[] = [];
  for (const tipo of tipi)
    for (const vettore of [false, true])
      for (const s of strani) {
        const base = bozzaDi(a.progetto.functions[0]!.data[0]!, "elenco");
        for (const b of [
          { ...base, tipo, vettore, nome: s },
          { ...base, tipo, vettore, dimensione: s },
          { ...base, tipo, vettore, iniziale: s },
          { ...base, tipo, vettore, lunghezza: s },
          { ...base, tipo, vettore, iniziale: s, ripetuto: true },
        ]) {
          provate++;
          const r = cambiaDato(0, datoDaBozza(b))(a.progetto, 1000);
          if (!r.ok) rifiutate.push(JSON.stringify(b));
        }
      }
  console.log(`bozze di un dato provate: ${provate}, rifiutate dal nucleo: ${rifiutate.length}`);
  expect(provate).toBe(tipi.length * 2 * strani.length * 5);
  expect(rifiutate).toEqual([]);
  // Controllo positivo: un dato con un genere che il file non conosce è rifiutato.
  expect(cambiaDato(0, { name: "n", type: "intero" } as unknown as Dato)(a.progetto, 1000).ok).toBe(false);
});
