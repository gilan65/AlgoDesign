// La bozza dei campi di un dato: andata e ritorno senza perdite su ogni dato del corpus della tappa 1 e su
// un insieme scritto qui con ogni forma (il corpus non ha costanti, vettori con valore iniziale né
// lunghezze); l'elenco di un vettore separato fuori dai letterali; i campi che il ritorno non giudica.
import { expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { causaDelNome } from "../../core/controllo/controllo";
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
  expect(corpus.length).toBe(confermato("bozza - dati del corpus", corpus.length));
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

test("il nome di un dato: gli spazi ai lati si tolgono alla conferma, uno dentro resta e lo segnala il controllo", () => {
  const base = bozzaDi({ name: "x", type: "integer" }, "elenco");
  expect(["eta ", " eta", "  eta  "].map((nome) => datoDaBozza({ ...base, nome }).name)).toEqual(["eta", "eta", "eta"]);
  // Solo spazi: un nome vuoto, come il campo vuoto.
  expect(datoDaBozza({ ...base, nome: "   " }).name).toBe("");
  // Il dato di prima con uno spazio in più nella bozza non è un cambiamento.
  expect(stessoDato(datoDaBozza({ ...base, nome: "x " }), { name: "x", type: "integer" })).toBe(true);
  expect(datoDaBozza({ ...base, nome: "e ta" }).name).toBe("e ta");
  expect(causaDelNome("e ta", false)).toEqual({ causa: "nome_spazio" });
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

// ------------------------------------------------------------------------------------- le matrici

/** I dati con le colonne del corpus dei tipi: dati, parametri e costanti comuni. */
const delleMatrici = readdirSync(join(import.meta.dir, "..", "..", "casi", "tipi"))
  .filter((f) => f.endsWith(".algo"))
  .flatMap((f) => {
    const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", f), "utf8"));
    if (!a.ok) throw new Error(f);
    return [...(a.progetto.shared_constants ?? []), ...a.progetto.functions.flatMap((x) => x.data)].filter((d) => d.columns !== undefined);
  });

test("una matrice: andata e ritorno di ogni matrice del corpus dei tipi, col valore per righe o ripetuto", () => {
  const scritte: Dato[] = [
    { name: "m", type: "integer", size: 2, columns: 3, initial: [["1", "2", "3"], ["4", "5", "6"]] },
    { name: "s", type: "string", size: 2, columns: 2, initial: [['"a, b"', '"}"'], ['"{"', '""']], max_length: 4 },
    { name: "k", type: "real", size: 3, columns: 1, constant: true, initial: { each: "0.5" } },
  ];
  const tutte = [...delleMatrici, ...scritte];
  const diverse = tutte.filter((d) => !stessoDato(datoDaBozza(bozzaDi(d, "elenco")), d) || !stessoDato(datoDaBozza(bozzaDi(d, "un-valore")), d)).map((d) => d.name);
  console.log(`bozza delle matrici: corpus ${delleMatrici.length}, scritte qui ${scritte.length}; diverse al ritorno ${diverse.length}`);
  expect(diverse).toEqual([]);
  // La premessa: il corpus ha matrici, con l'elenco per righe e col valore ripetuto.
  expect(delleMatrici.length).toBeGreaterThanOrEqual(8);
  expect(delleMatrici.some((d) => Array.isArray(d.initial)) && delleMatrici.some((d) => d.initial !== undefined && !Array.isArray(d.initial))).toBe(true);
  // La bozza di una matrice: la forma, le righe nella dimensione, le colonne, l'elenco per righe fra graffe.
  expect(bozzaDi(scritte[0]!, "elenco")).toMatchObject({ vettore: true, matrice: true, dimensione: "2", colonne: "3", iniziale: "{{1, 2, 3}, {4, 5, 6}}", ripetuto: false });
  // Controllo positivo: senza le colonne il ritorno è un vettore, e il confronto lo vede.
  expect(stessoDato(datoDaBozza({ ...bozzaDi(scritte[0]!, "elenco"), matrice: false }), scritte[0]!)).toBe(false);
});

test("l'elenco di una matrice si legge per righe, con o senza le graffe esterne; non fatto di righe passa piatto", () => {
  const letto = (iniziale: string) => inizialeDaBozza({ iniziale, vettore: true, matrice: true, ripetuto: false });
  expect(letto("{{1, 2}, {3, 4}}")).toEqual([["1", "2"], ["3", "4"]]);
  expect(letto(" {1, 2} , {3,4} ")).toEqual([["1", "2"], ["3", "4"]]);
  // Le virgole e le graffe dentro un letterale non separano.
  expect(letto(`{{"a, }", 'x'}, {"{", ""}}`)).toEqual([['"a, }"', "'x'"], ['"{"', '""']]);
  // Righe e valori mescolati, o le righe senza le loro graffe: l'elenco piatto, che il controllo segnala.
  expect(letto("{{1, 2}, 3}")).toEqual(["{1, 2}", "3"]);
  expect(letto("{1, 2, {3, 4}}")).toEqual(["1", "2", "{3, 4}"]);
  expect(letto("{1, 2}")).toEqual(["1", "2"]);
  // Una riga sola vuole le graffe esterne.
  expect(letto("{{1, 2}}")).toEqual([["1", "2"]]);
  expect(letto("{}")).toBeUndefined();
  expect(inizialeDaBozza({ iniziale: "7", vettore: true, matrice: true, ripetuto: true })).toEqual({ each: "7" });
  // Lo stesso testo per un vettore: le virgole dentro le graffe separano come prima.
  expect(inizialeDaBozza({ iniziale: "{{1, 2}, {3, 4}}", vettore: true, ripetuto: false })).toEqual(["{1", "2}", "{3", "4}"]);
});

test("da un valore ripetuto all'elenco, una matrice si riempie riga per riga, entro il massimo degli elementi", () => {
  const b = bozzaDi({ name: "m", type: "integer", size: 2, columns: 3, initial: { each: "0" } }, "un-valore");
  expect(conRipetuto(b, false).iniziale).toBe("{{0, 0, 0}, {0, 0, 0}}");
  // Righe per colonne oltre il massimo (1000), o colonne che non sono un numero: il campo resta com'è.
  expect(conRipetuto({ ...b, dimensione: "40", colonne: "26" }, false).iniziale).toBe("0");
  expect(conRipetuto({ ...b, colonne: "tre" }, false).iniziale).toBe("0");
  expect(conRipetuto({ ...b, dimensione: "40", colonne: "25" }, false).iniziale.split("{").length - 2).toBe(40);
});

test("una matrice nuova scrive le righe e le colonne; un vettore che diventa matrice tiene gli elementi come righe", () => {
  const v = bozzaDi({ name: "v", type: "integer", size: 4 }, "elenco");
  expect(datoDaBozza({ ...v, matrice: true, colonne: "2" })).toEqual({ name: "v", type: "integer", size: 4, columns: 2 });
  // Le colonne che non sono un numero valgono 0, come la dimensione: lo segnala il controllo.
  expect(datoDaBozza({ ...v, matrice: true, colonne: "" })).toEqual({ name: "v", type: "integer", size: 4, columns: 0 });
  // Una forma semplice non scrive né la dimensione né le colonne, anche se la bozza le tiene.
  expect(datoDaBozza({ ...v, vettore: false, matrice: true, colonne: "2" })).toEqual({ name: "v", type: "integer" });
});

// ------------------------------------------------------------------------------------- le tabelle

/** Le tabelle (vettori di record) del corpus dei tipi col valore iniziale: dati e costanti comuni. */
const delleTabelle = readdirSync(join(import.meta.dir, "..", "..", "casi", "tipi"))
  .filter((f) => f.endsWith(".algo"))
  .flatMap((f) => {
    const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tipi", f), "utf8"));
    if (!a.ok) throw new Error(f);
    return [...(a.progetto.shared_constants ?? []), ...a.progetto.functions.flatMap((x) => x.data)].filter((d) => d.type === "record" && d.size !== undefined && d.initial !== undefined);
  });

test("una tabella: andata e ritorno di ogni tabella del corpus dei tipi, con l'elenco per record o il record ripetuto", () => {
  const diverse = delleTabelle.filter((d) => !stessoDato(datoDaBozza(bozzaDi(d, "elenco")), d) || !stessoDato(datoDaBozza(bozzaDi(d, "un-valore")), d)).map((d) => d.name);
  console.log(`bozza delle tabelle: corpus ${delleTabelle.length}; diverse al ritorno ${diverse.length}`);
  expect(diverse).toEqual([]);
  // La premessa: il corpus ha tabelle con l'elenco per record e col record ripetuto.
  expect(delleTabelle.length).toBeGreaterThanOrEqual(7);
  expect(delleTabelle.some((d) => Array.isArray(d.initial)) && delleTabelle.some((d) => d.initial !== undefined && !Array.isArray(d.initial))).toBe(true);
  // La bozza di una tabella: l'elenco dei record, ognuno fra graffe; il record ripetuto fra graffe.
  const t: Dato = { name: "t", type: "record", record: "alunno", size: 2, initial: [['"Anna"', "7"], ['"Bruno"', "9"]] };
  expect(bozzaDi(t, "elenco")).toMatchObject({ vettore: true, matrice: false, iniziale: '{{"Anna", 7}, {"Bruno", 9}}', ripetuto: false });
  expect(bozzaDi({ ...t, initial: { each: ['"x"', "0"] } }, "elenco")).toMatchObject({ iniziale: '{"x", 0}', ripetuto: true });
  // Controllo positivo: un record per elemento letto piatto non è la tabella, e il confronto lo vede.
  expect(stessoDato({ ...t, initial: ['"Anna"', "7", '"Bruno"', "9"] }, t)).toBe(false);
});

test("l'elenco di una tabella si legge per record, con o senza le graffe esterne; il record ripetuto è un elenco di campi", () => {
  const letto = (iniziale: string, ripetuto = false) => inizialeDaBozza({ iniziale, vettore: true, ripetuto }, true);
  expect(letto('{{"Anna", 7}, {"Bruno", 9}}')).toEqual([['"Anna"', "7"], ['"Bruno"', "9"]]);
  expect(letto('{"Anna", 7}, {"Bruno", 9}')).toEqual([['"Anna"', "7"], ['"Bruno"', "9"]]);
  // Le virgole e le graffe dentro un letterale non separano.
  expect(letto(`{{"a, }", 'x'}, {"{", 0}}`)).toEqual([['"a, }"', "'x'"], ['"{"', "0"]]);
  expect(letto('{"x", 0}', true)).toEqual({ each: ['"x"', "0"] });
  expect(letto('"x", 0', true)).toEqual({ each: ['"x"', "0"] });
  expect(letto("{}")).toBeUndefined();
  // Un record solo (non un vettore) resta l'elenco dei suoi campi.
  expect(inizialeDaBozza({ iniziale: '{"Anna", 7}', vettore: false, ripetuto: false }, true)).toEqual(['"Anna"', "7"]);
});

test("da un record ripetuto all'elenco, una tabella si riempie record per record", () => {
  const b = bozzaDi({ name: "t", type: "record", record: "alunno", size: 3, initial: { each: ['"x"', "0"] } }, "un-valore");
  expect(conRipetuto(b, false).iniziale).toBe('{{"x", 0}, {"x", 0}, {"x", 0}}');
  expect(datoDaBozza(conRipetuto(b, false)).initial).toEqual([['"x"', "0"], ['"x"', "0"], ['"x"', "0"]]);
});
