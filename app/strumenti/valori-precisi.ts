// I valori precisi delle prove che leggono il corpus: i numeri che restano scritti nelle loro asserzioni, ognuno col
// perché. La prova-guardia (`strumenti/corpus.test.ts`) è rossa su un numero scritto che non è qui, e su una voce di qui
// che non trova più la sua asserzione. Un numero che cambia se il corpus cresce NON va qui: si confronta con
// `confermato(nome, ottenuto)` (`strumenti/corpus.ts`).
//
// Una voce è la riga dove comincia il confronto (senza gli spazi in testa e in coda) e i numeri trovati nel suo
// argomento, nell'ordine (il rilevatore è `strumenti/denominatori.ts`): un numero cambiato, anche su una riga che
// continua l'asserzione, è una voce che non c'è.
//
// I tempi massimi: misurati a macchina libera e scritti col margine; sotto carico una prova di tempo può uscire rossa
// senza un difetto, e la misura scritta accanto al limite dice quanto margine c'è.

export interface ValoriPrecisi {
  readonly file: string;
  readonly perche: string;
  /** [i numeri, il testo della riga]. */
  readonly righe: readonly (readonly [string, string])[];
}

const programma = "un valore di un programma preciso, costruito nella prova o letto per nome dal corpus (il riferimento): cambia se cambia quel programma, non se il corpus cresce";
const catalogo = "un catalogo del codice (operatori, codici, cause, motivi, regole del formato, linguaggi del registro, finestre): cambia col codice, e la prova lo deve vedere";
const relazione = "una relazione fra conti della prova (un fattore, un'unità in più o in meno), non un conto del corpus";
const occorrenza = "una sola occorrenza nel sorgente: la sostituzione di una mutazione deve trovare il suo posto, e uno solo";
const tetto = "un tetto o una soglia del programma (righe della traccia e della console, caratteri di una riga, passi, carattere minimo)";
const tempo = "un tempo massimo misurato a macchina libera, col margine (vedi la testata)";
const prova = "le combinazioni, le misure o il campione scritti nella prova stessa";
const esempi = "un contenuto dell'applicazione (gli esempi forniti e i loro casi), non del corpus";

export const valoriPrecisi: readonly ValoriPrecisi[] = [
  {
    file: "core/casi/dall-esecuzione.test.ts",
    perche: programma,
    righe: [
      ["4", "expect(e.console.filter((v) => v.genere === \"letto\").length).toBe(4);"],
      ["1 2 3", "expect(unoPerUno.elementi).toEqual([0, 1, 2, 3]);"],
      ["1", "expect(casoUguale(casi, { inputs: [{ data: \"s\", text: \"due\" }], expected: { output: \"due\\n\", warnings: [b, a] } })).toBe(1);"],
      ["1", "expect(casoUguale(casi, { inputs: [{ data: \"s\", text: \"due\" }], expected: { output: \"due\\n\" } })).toBe(-1);"],
      ["1", "expect(casoUguale(casi, { inputs: [{ data: \"s\", text: \"uno\", each: true }], expected: { output: \"uno\\n\" } })).toBe(-1);"],
    ],
  },
  {
    file: "core/controllo/controllo.test.ts",
    perche: catalogo,
    righe: [
      ["28", "expect(nomiOperatori.length).toBe(28);"],
      ["67", "expect({ senzaRiga: delNucleo.filter((x) => !nelleRighe.includes(x)), senzaCausa: nelleRighe.filter((x) => !delNucleo.includes(x)), quante: delNucleo.length }).toEqual({ senzaRiga: [], senzaCausa: [], quante: 67 });"],
      ["2", "expect(controlla.length).toBe(2);"],
      ["85", "expect(voci.length).toBe(85);"],
      ["43 43", "expect([codici.length, daProvare.length]).toEqual([43, 43]);"],
    ],
  },
  {
    file: "core/controllo/controllo.test.ts",
    perche: relazione,
    righe: [
      ["1", "expect(conDati).toBe(conSegnalazioni.length + 1);"],
    ],
  },
  {
    file: "core/controllo/controllo.test.ts",
    perche: occorrenza,
    righe: [
      ["1", "expect(sorgente.split(discesa).length - 1).toBe(1);"],
      ["1", "if (vecchio !== \"\") expect(sorgente.split(vecchio).length - 1).toBe(1);"],
    ],
  },
  {
    file: "core/disegno/domanda.test.ts",
    perche: programma,
    righe: [
      ["1 2 4 6 7 8", "expect(posti(\"f1\")).toEqual([0, 1, 2, 4, 6, 7, 8]);"],
      ["2 3", "expect(posti(\"b7\").length).toBe(2 + 3);"],
      ["2 3", "expect(d.punti.filter((p) => p.posto.ramo === \"else\").map((p) => p.posto.indice).sort()).toEqual([0, 2, 3]);"],
    ],
  },
  {
    file: "core/disegno/fogli.test.ts",
    perche: programma,
    righe: [
      ["1310.5000000000005 2743", "expect([d.larghezza, d.altezza]).toEqual([1310.5000000000005, 2743]);"],
      ["4", "expect({ orizzontale: f.orizzontale, ristretto: f.ristretto, fogli: f.fogli.length, tagliX: f.tagliX }).toEqual({ orizzontale: true, ristretto: false, fogli: 4, tagliX: [] });"],
      ["3", "expect(f.tagliY.length).toBe(3);"],
      ["1788 2676", "expect(f.tagliY.slice(1)).toEqual([1788, 2676]);"],
      ["3 1353.5 2716", "expect({ orizzontale: f.orizzontale, ristretto: f.ristretto, fogli: f.fogli.length, tagliX: f.tagliX, tagliY: f.tagliY }).toEqual({ orizzontale: false, ristretto: false, fogli: 3, tagliX: [], tagliY: [1353.5, 2716] });"],
      ["1", "expect({ fogli: f.fogli.length, orizzontale: f.orizzontale }).toEqual({ fogli: 1, orizzontale: false });"],
      ["1", "expect(fogliDelDisegno(piccolo, a4, { adatta: false, punti: 8 }, tema).scala).toBe(1);"],
      ["12", "expect(fogliDelDisegno(d, a4, { adatta: false, punti: 30 }, tema)).toEqual(fogliDelDisegno(d, a4, { adatta: false, punti: 12 }, tema));"],
      ["6", "expect(fogliDelDisegno(d, a4, { adatta: false, punti: 1 }, tema)).toEqual(fogliDelDisegno(d, a4, { adatta: false, punti: 6 }, tema));"],
      ["1", "expect(f.tagliX.length).toBe(1);"],
      ["30 4", "expect(f.tagliX[0]!).toBeLessThanOrEqual(sinistra.larghezza + 30 - 4);"],
      ["191 196", "expect(casiAMano.map(({ d }) => fogliDelDisegno(d, areeAMano, o, tema).tagliY)).toEqual([[191], [196]]);"],
    ],
  },
  {
    file: "core/disegno/fogli.test.ts",
    perche: relazione,
    righe: [
      ["24", "expect(conti.divisioni).toBe(corpus.length * 24);"],
    ],
  },
  {
    file: "core/disegno/fogli.test.ts",
    perche: occorrenza,
    righe: [
      ["1", "for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });"],
    ],
  },
  {
    file: "core/disegno/impaginazione.test.ts",
    perche: relazione,
    righe: [
      ["1", "expect(senzaLinea.length).toBe(buono.connettori.length - 1);"],
      ["1 2", "expect(coppie).toBe((d.punti.length * (d.punti.length - 1)) / 2);"],
      ["1", "expect(spostati.length).toBe(nascosti.elementi.length - 1);"],
      ["2", "expect(confrontati).toBe(2 * tuttiGliAlberi.length);"],
    ],
  },
  {
    file: "core/disegno/impaginazione.test.ts",
    perche: occorrenza,
    righe: [
      ["1", "for (const [da] of sostituzioni) expect({ nome, da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ nome, da, occorrenze: 1 });"],
      ["1", "expect(sorgente.split(da).length - 1).toBe(1);"],
      ["1", "for (const [da] of sostituzioni) expect({ da, occorrenze: sorgente.split(da).length - 1 }).toEqual({ da, occorrenze: 1 });"],
    ],
  },
  {
    file: "core/disegno/impaginazione.test.ts",
    perche: programma,
    righe: [
      ["2", "expect(esaminaLeDueForme(fn, tema, [costruiti[0]!]).length).toBe(2);"],
      ["2", "expect(esaminaLeDueForme(fn, tema, [costruiti[1]!]).length).toBe(2);"],
      ["1", "expect(c.connettori.filter(alGiro).length).toBe(1);"],
      ["6", "else expect(d.elementi.filter((e) => e.fase !== undefined).length).toBe(6);"],
      ["2", "expect(d.riquadri.length).toBe(2);"],
      ["4", "expect(misurate.length).toBe(4);"],
      ["85 29 150 29 215 29 280 29 345 29", "expect(iniziali.map((e) => [e.testo, e.riquadro.y, e.riquadro.altezza])).toEqual(["],
      ["399.25", "expect(primo.y).toBe(399.25);"],
      ["1", "expect(r.length).toBe(1);"],
      ["1 2", "expect(dellaCopia(d)).toEqual(["],
      ["3", "expect(campi.length).toBe(3);"],
      ["1", "expect(r.length, id).toBe(1);"],
      ["2", "expect(d.elementi.filter((x) => x.id === \"b1\" && x.fase === \"inizio\").length).toBe(2);"],
      ["1 2", "expect(di(d, \"b1\")).toEqual(["],
    ],
  },
  {
    file: "core/disegno/nomi.test.ts",
    perche: programma,
    righe: [
      ["40 10 19 130 10 19", "expect(nomiDi(f, \"b1\").nomi).toEqual(["],
      ["90 10 19 140 10 19", "expect(nomiDi(f, \"b3\").nomi).toEqual(["],
      ["70", "expect(nomiDi(f, \"b2\").nomi.map((n) => [n.dato, n.x])).toEqual([[\"x\", 70]]);"],
      ["60", "expect(nomiDi(f, \"b4\").nomi.map((n) => [n.dato, n.x])).toEqual([[\"n\", 60]]);"],
      ["50 40", "expect(perFase(\"b1\")).toEqual({"],
      ["170 40", "expect(perFase(\"b3\")).toEqual({"],
      ["7 5", "expect([tutti.get(\"b1\")?.length, tutti.get(\"b3\")?.length]).toEqual([7, 5]);"],
      ["214 10", "expect(relativi(\"b1\")).toEqual([[\"n\", 214, 10]]);"],
      ["82 40 182 40", "expect(relativi(\"b2\")).toEqual(["],
      ["72 82 40 182 40", "expect(relativi(new Set([\"valido\"]))).toEqual(["],
      ["82 40 182 40", "expect(relativi()).toEqual(["],
      ["40", "expect([intestazione.testo, sopra(intestazione)]).toEqual([\"w ← v: copia elemento per elemento\", [[\"w\", 0], [\"v\", 40]]]);"],
      ["130", "expect(perFase).toEqual({"],
      ["4", "expect(tutti.get(\"b1\")?.length).toBe(4);"],
      ["50 19 80 50 19 160 40 19", "expect(nomiDi(f, \"b1\").nomi).toEqual(["],
      ["60 50 19", "expect(nomiDi(f, \"b1\").nomi).toEqual([{ dato: \"leggi\", x: 60, y: 0, larghezza: 50, altezza: 19 }]);"],
      ["180 50 19", "expect(nomiDi(f, \"b2\").nomi).toEqual([{ dato: \"somma\", x: 180, y: 0, larghezza: 50, altezza: 19 }]);"],
      ["40 19 140 40 19 95 19 50 19", "expect(nomi).toEqual(["],
      ["140 290", "expect(nomiDi(f, \"b1\", testiIt, \"su-una-riga\").nomi.map((n) => [n.dato, n.x, n.y])).toEqual(["],
      ["250", "expect(nomiDi(f, \"b1\", conOperatori(nomiDegliOperatori.it)).nomi.map((n) => [n.dato, n.x])).toEqual(["],
      ["160", "expect(nomiDi(f, \"b1\", conOperatori(nomiDegliOperatori.en)).nomi.map((n) => [n.dato, n.x])).toEqual(["],
      ["50", "expect(nomiDelValore([{ name: \"somma\", type: \"integer\", initial: \"0\" }], \"somma\")).toEqual([[\"somma\", 0, 0, 50]]);"],
      ["40", "expect(nomiDelValore(data, \"voti\")).toEqual([[\"voti\", 0, 0, 40]]);"],
      ["30", "expect(nomiDelValore(data, \"MAX\")).toEqual([[\"MAX\", 0, 0, 30]]);"],
      ["40", "expect(nomiDelValore(data, \"nome\")).toEqual([[\"nome\", 0, 0, 40]]);"],
      ["50", "expect(nomiDelValore(doppi, \"doppi\", \"un-valore\")).toEqual([[\"doppi\", 0, 0, 50]]);"],
      ["50", "expect(nomiDelValore(doppi, \"doppi\", \"elenco\")).toEqual([[\"doppi\", 0, 0, 50]]);"],
      ["50", "expect(nomiDelValore([{ name: \"x\", type: \"integer\", initial: \"0\" }], \"PASSO\", \"elenco\", [{ name: \"PASSO\", type: \"integer\", constant: true, initial: \"10\" }])).toEqual([[\"PASSO\", 0, 0, 50]]);"],
      ["10 40 10", "expect(nomiDelValore([{ name: \"n\", type: \"integer\", initial: \"k\" }, { name: \"k\", type: \"integer\" }], \"n\")).toEqual(["],
    ],
  },
  {
    file: "core/esecuzione/esecuzione.test.ts",
    perche: programma,
    righe: [
      ["1 6 5", "expect(viste).toEqual(["],
      ["65", "expect(e.passi).toBe(65);"],
      ["1", "expect(differenze(righeDelCsv(csv(e.traccia, riferimento, testiIt, separatoriPredefiniti.it)), alterato).length).toBe(1);"],
      ["65", "expect({ pause: k, sbagliate }).toEqual({ pause: 65, sbagliate: [] });"],
      ["29", "expect(attesi.flat().filter(Boolean).length).toBe(29);"],
      ["1 2", "expect(pause).toEqual(["],
      ["2 1 1 2 6", "expect(riprese).toEqual(["],
      ["2", "expect(e.console.filter((v) => v.genere !== \"scrive\")).toEqual(["],
      ["59 60 61 62 63 64 65 58", "expect({ numeri: e.traccia.righe.map((r) => r.numero), tolte: e.traccia.tolte }).toEqual({ numeri: [59, 60, 61, 62, 63, 64, 65], tolte: 58 });"],
      ["2 60", "expect(righe).toEqual([...csvItalianoAtteso.slice(0, 2), ...csvItalianoAtteso.slice(60)]);"],
      ["65", "expect({ pause, sbagliati: sbagliati.slice(0, 5), quanti: sbagliati.length }).toEqual({ pause: 65, sbagliati: [], quanti: 0 });"],
      ["1 2 3 3 4 5", "expect({ durata, dopo }).toEqual({ durata, dopo: [1, 2, 3, 3, 4, 5] });"],
      ["6", "expect({ passi: e.passi, output: scritto(e), righe: e.traccia.righe.map((r) => `${r.numero} ${r.blocco}`).slice(-2) }).toEqual({ passi: 6, output: \"ciao\\n\", righe: [\"5 b1\", \"6 b2\"] });"],
      ["6", "expect(e.passi).toBe(6);"],
      ["1 2 3", "expect(e.console).toEqual([1, 2, 3].map(() => ({ genere: \"scrive\", testo: \"ciao\", aCapo: true })));"],
      ["4", "expect({ righe: e.console.map((r) => (r.genere === \"scrive\" ? `${r.testo}${r.aCapo ? \"↵\" : \"\"}` : r.genere)), tolte: e.consoleTolte }).toEqual({"],
      ["74", "expect(conCaso.outputTenuto).toBe(74);"],
      ["3", "expect(scritto(e)).toBe(\"abcdefghij\".repeat(3) + \"xy\\n\");"],
      ["5", "expect({ righe: comeTesto(corta), tolte: corta.consoleTolte }).toEqual({ righe: [\"abcd\", \"efgh\", \"ijxy↵\"], tolte: 5 });"],
      ["1", "if (modo === \"la-fine\") expect(e.console.length).toBe(1);"],
      ["2", "expect(e.console.filter((v) => v.genere !== \"scrive\")).toEqual(inputDelRiferimento.map((t, i) => ({ genere: \"letto\", dato: i < 2 ? \"n\" : \"voto\", testo: t })));"],
      ["65", "expect(con.e.traccia.righe.length).toBe(65);"],
    ],
  },
  {
    file: "core/esecuzione/esecuzione.test.ts",
    perche: tetto,
    righe: [
      ["1000", "expect({ righe: t.righe.length, tolte: t.tolte, prima: t.righe[0]!.numero, ultima: t.righe.at(-1)!.numero }).toEqual({"],
      ["1002", "expect(righe.length).toBe(1002);"],
      ["50", "expect(e.passi).toBeLessThanOrEqual(50);"],
      ["50", "expect(e.passi).toBeLessThanOrEqual(dopoUna + 50);"],
      ["1000 1000", "expect({ righe: e.console.length, tolte: e.consoleTolte, tutte: e.console.every((r) => r.genere === \"scrive\" && r.testo === \"ciao\" && r.aCapo) }).toEqual({"],
      ["250", "expect(righeLunghePredefinite).toEqual({ caratteri: 250, modo: \"a-capo\" });"],
      ["1002", "expect(esito?.fuoriTappa === false && { raggiunto: esito.raggiunto, tenuto: esito.ottenuto.output.length, tagliato: esito.differenze[0]?.tagliato }).toEqual({ raggiunto: false, tenuto: 1002, tagliato: true });"],
    ],
  },
  {
    file: "core/interprete/interprete.test.ts",
    perche: programma,
    righe: [
      ["3 3 5 3 5 1 2 3 3 5 1 2 3 3 5 1 2 3", "expect(eventi.map((x) => x.dati.valori)).toEqual(["],
      ["121 122 121 122", "expect(fotografie).toEqual(["],
      ["1 2 3 1 1", "expect(eventi).toEqual(["],
    ],
  },
  {
    file: "core/interprete/interprete.test.ts",
    perche: occorrenza,
    righe: [
      ["1", "expect({ nome, occorrenze }).toEqual({ nome, occorrenze: 1 });"],
    ],
  },
  {
    file: "core/interprete/interprete.test.ts",
    perche: catalogo,
    righe: [
      ["20", "expect(codiciErrore.length).toBe(20);"],
    ],
  },
  {
    file: "core/modifica/funzioni.test.ts",
    perche: programma,
    righe: [
      ["29", "expect(r.ok && r.prossimo).toBe(29);"],
      ["2", "expect(f.test_cases?.length).toBe(2);"],
      ["2", "expect(f.body.length).toBe(2);"],
      ["3", "expect(vettore).toMatchObject({ return_type: \"integer\", return_size: 3 });"],
      ["3", "expect(funzione(dopo(proprietaDellaFunzione(\"f3\", { genere: \"function\", tipo: \"real\" }), conVettore), \"f3\")).toMatchObject({ return_type: \"real\", return_size: 3 });"],
      ["20", "expect(funzione(stringa, \"f3\")).toMatchObject({ return_type: \"string\", return_max_length: 20 });"],
      ["2 3", "expect(funzione(matrice, \"f3\")).toMatchObject({ return_type: \"integer\", return_size: 2, return_columns: 3 });"],
      ["2 3", "expect(funzione(dopo(proprietaDellaFunzione(\"f3\", { genere: \"function\", tipo: \"real\" }), matrice), \"f3\")).toMatchObject({ return_type: \"real\", return_size: 2, return_columns: 3 });"],
      ["2", "expect(funzione(dopo(proprietaDellaFunzione(\"f3\", { genere: \"function\", tipo: \"integer\", colonne: null }), matrice), \"f3\")).toMatchObject({ return_size: 2 });"],
      ["4", "expect(altre.ok && funzione(altre.progetto, \"f3\").return_columns).toBe(4);"],
      ["33", "expect(r.ok && r.prossimo).toBe(33);"],
      ["1", "expect({ come, corpo: funzione(q, \"f1\").body }).toEqual({ come, corpo: vettori.slice(1) });"],
      ["1", "expect(c.cronologia.passato.length).toBe(1);"],
      ["5", "expect(regoleCheUsano(riferimento, \"voto\")).toBe(5);"],
      ["1", "expect(regoleCheUsano(riferimento, \"voto\", \"f3\")).toBe(1);"],
      ["2", "expect(regoleCheUsano(riferimento, \"k\", \"f4\")).toBe(2);"],
      ["2", "expect(regoleCheUsanoLaComune(conComuni(), \"MAX\")).toBe(2);"],
    ],
  },
  {
    file: "core/modifica/operazioni.test.ts",
    perche: programma,
    righe: [
      ["15", "expect(conICicli).toBe(15);"],
      ["2", "expect(p).toEqual({ format: \"algodesign\", schema_version: 2, metadata: { name: \"primo\" }, functions: [{ id: \"f1\", kind: \"main\", data: [], body: [], end: { id: \"b1\" } }] });"],
      ["2", "expect(salva(p)).toBe(`${JSON.stringify(p, null, 2)}\\n`);"],
      ["1", "expect(dove(p, \"b25\")).toEqual({ contenitore: \"b9\", ramo: \"else\", indice: 1 });"],
      ["6", "expect(blocchiDi(p).length).toBe(blocchiDi(riferimento).length - 6);"],
      ["1 4", "expect(trattoFra(riferimento, \"b2\", \"b16\")).toEqual({ ...corpo, da: 1, a: 4 });"],
      ["1 4", "expect(trattoFra(riferimento, \"b16\", \"b2\")).toEqual({ ...corpo, da: 1, a: 4 });"],
      ["2 2", "expect(trattoFra(riferimento, \"b6\", \"b6\")).toEqual({ ...corpo, da: 2, a: 2 });"],
      ["3", "expect(trattoFra(riferimento, \"b1\", \"b13\")).toEqual({ ...corpo, da: 0, a: 3 });"],
      ["2", "expect(trattoFra(riferimento, \"b10\", \"b13\")).toEqual({ contenitore: \"b9\", ramo: \"then\", da: 0, a: 2 });"],
      ["1", "expect(trattoFra(riferimento, \"b10\", \"b8\")).toEqual({ ...delCiclo, da: 0, a: 1 });"],
      ["1 1", "expect(trattoFra(riferimento, \"b13\", \"b9\")).toEqual({ ...delCiclo, da: 1, a: 1 });"],
      ["1 1", "expect(trattoFra(riferimento, \"b13\", \"b14\")).toEqual({ ...delCiclo, da: 1, a: 1 });"],
      ["14", "expect(blocchiDi(senza).length).toBe(blocchiDi(riferimento).length - 14);"],
      ["1", "expect(e.cronologia.passato.length).toBe(1);"],
      ["12", "expect(ids.length).toBe(blocchiDi(riferimento).length + 12);"],
      ["2", "expect(dove(conPerOgni, \"b25\")).toEqual({ contenitore: \"b7\", ramo: \"body\", indice: 2 });"],
      ["1", "expect(trova(conPasso, \"b25\")).toEqual({ id: \"b25\", kind: \"for\", counter: \"i\", from: \"n\", to: \"1\", step: -1, body: [] });"],
      ["2", "expect(passo(progettoDi(applica(campi(\"b25\", { step: 2 }), conPasso)))).toBe(2);"],
      ["1", "expect(passo(progettoDi(applica(campi(\"b25\", { to: \"0\" }), conPasso)))).toBe(-1);"],
      ["1", "expect(passo(progettoDi(applica(campi(\"b25\", { counter: \"i\", from: \"1\", to: \"m\", step: 1 }), riaperto.progetto)))).toBe(1);"],
      ["25", "expect(primoLibero(riferimento)).toBe(25);"],
      ["25", "expect(primoLibero(buco)).toBe(25);"],
      ["41", "expect(primoLibero(conAtteso)).toBe(41);"],
      ["51", "expect(primoLibero(conAttesoDellaFunzione)).toBe(51);"],
      ["1", "expect(primoLibero(generati[0]!.progetto)).toBe(1);"],
      ["31", "expect(r.ok && [r.progetto.functions[0]!.body[0]!.id, r.prossimo]).toEqual([\"b30\", 31]);"],
      ["3", "expect(m.functions[0]!.data[1]).toEqual({ name: \"voto\", type: \"real\", size: 3, initial: { each: \"0.0\" } });"],
      ["5", "expect(regoleCheUsano(riferimento, \"voto\")).toBe(5);"],
      ["4", "expect(regoleCheUsano(riferimento, \"n\")).toBe(4);"],
      ["5", "expect(regoleCheUsano(riferimento, [\"nessuno\", \"voto\"])).toBe(5);"],
      ["5", "expect(regoleCheUsano(p, \"punteggio\")).toBe(5);"],
      ["4", "expect(p.test_cases![0]!.inputs.filter((x) => x.data === \"punteggio\").length).toBe(4);"],
      ["4 2 2", "expect([regoleCheUsano(parolaAlContrario, \"parola\"), regoleCheUsano(parolaAlContrario, \"i\"), regoleCheUsano(parolaAlContrario, \"c\")]).toEqual([4, 2, 2]);"],
      ["4 5", "expect([regoleCheUsano(riferimentoDeiCicli, \"n\"), regoleCheUsano(riferimentoDeiCicli, \"contati\")]).toEqual([4, 5]);"],
      ["1", "expect(per).toEqual({ id: \"b2\", kind: \"for\", counter: \"k\", from: \"length testo - 1\", to: \"0\", step: -1, body: [{ id: \"b3\", kind: \"write\", values: [\"testo[k]\"], newline: false }] });"],
      ["5", "expect({ nuovo, nome: p.functions[0]!.data[1]!.name, regole: regoleCheUsano(p, \"voto\") }).toEqual({ nuovo, nome: nuovo, regole: 5 });"],
      ["5", "expect(regoleCheUsano(p, \"voto\")).toBe(5);"],
      ["1", "expect([regoleCheUsanoLaComune(rinominata, \"MASSIMO\"), regoleCheUsano(rinominata, \"voto\")]).toEqual([1, regoleCheUsano(usata, \"voto\")]);"],
      ["1", "expect(regoleCheUsanoLaComune(progettoDi(applica(cambiaComune(0, { name: \"LIMITE\", type: \"integer\", constant: true, initial: \"10\" }), usata)), \"LIMITE\")).toBe(1);"],
      ["1", "expect(regoleCheUsano(illeggibile, \"n\")).toBe(regoleCheUsano(riferimento, \"n\") + 1);"],
      ["4", "expect(delProgramma.test_cases![0]!.inputs.filter((x) => x.data === \"punteggio\").length).toBe(4);"],
      ["5", "expect(regoleCheUsano(intero, \"punteggio\")).toBe(5);"],
      ["61", "expect(nomi(progettoDi(applica(duplicaDato(8), conLungo))).at(-1)).toBe(`${\"a\".repeat(61)}_2`);"],
      ["1 1", "expect(progettoDi(applica(spostaCaso(0, 1), lettura))).toStrictEqual(progettoDi(applica(spostaCaso(1, -1), lettura)));"],
    ],
  },
  {
    file: "core/modifica/record.test.ts",
    perche: programma,
    righe: [
      ["4", "expect(usiDelRecord(p, \"studente\")).toBe(4);"],
      ["1 2", "expect((c.record ?? []).map((s) => [s.indice, s.code, s.fermata?.causa])).toEqual(["],
    ],
  },
  {
    file: "ui/casi/casi.test.tsx",
    perche: relazione,
    righe: [
      ["2 3", "expect({ casi: delleTappe.size, funzioni: diFunzioni, file: dopo.length }).toEqual({ casi: dichiarati(2) + dichiarati(3), funzioni, file: confermato(\"casi - file delle tappe 2 e 3\", dopo.length) });"],
    ],
  },
  {
    file: "ui/casi/tutti.test.ts",
    perche: tempo,
    righe: [
      ["100", "expect(durata).toBeLessThan(100);"],
    ],
  },
  {
    file: "ui/casi/tutti.test.ts",
    perche: programma,
    righe: [
      ["2", "expect(p.test_cases!.length).toBe(2);"],
      ["2", "expect({ eseguiti: t.eseguiti, totale: t.totale }).toEqual({ eseguiti: 0, totale: 2 });"],
      ["2", "expect({ finita: t.finita, eseguiti: t.eseguiti }).toEqual({ finita: true, eseguiti: 2 });"],
      ["1", "expect({ eseguiti: t.eseguiti, finita: t.finita }).toEqual({ eseguiti: 1, finita: false });"],
      ["2", "expect(t.esiti.length).toBe(2);"],
      ["1", "expect({ eseguiti: t.eseguiti, totale: t.totale }).toEqual({ eseguiti: 0, totale: 1 });"],
      ["1", "expect({ finita: t.finita, eseguiti: t.eseguiti }).toEqual({ finita: true, eseguiti: 1 });"],
    ],
  },
  {
    file: "ui/dati/bozza.test.ts",
    perche: programma,
    righe: [
      ["4", "expect(datoDaBozza({ ...base, vettore: true, dimensione: \"4\", iniziale: \"1, 2\" })).toEqual({ name: \"x\", type: \"integer\", size: 4, initial: [\"1\", \"2\"] });"],
      ["20", "expect(datoDaBozza({ ...base, tipo: \"string\", lunghezza: \"20\" })).toEqual({ name: \"x\", type: \"string\", max_length: 20 });"],
      ["4", "expect(datoDaBozza(passato)).toEqual({ name: \"v\", type: \"integer\", size: 4, initial: [\"7\", \"7\", \"7\", \"7\"] });"],
      ["40", "expect(conRipetuto({ ...b, dimensione: \"40\", colonne: \"25\" }, false).iniziale.split(\"{\").length - 2).toBe(40);"],
      ["4 2", "expect(datoDaBozza({ ...v, matrice: true, colonne: \"2\" })).toEqual({ name: \"v\", type: \"integer\", size: 4, columns: 2 });"],
      ["4", "expect(datoDaBozza({ ...v, matrice: true, colonne: \"\" })).toEqual({ name: \"v\", type: \"integer\", size: 4, columns: 0 });"],
    ],
  },
  {
    file: "ui/dati/bozza.test.ts",
    perche: relazione,
    righe: [
      ["2 5", "expect(provate).toBe(tipi.length * 2 * strani.length * 5);"],
    ],
  },
  {
    file: "ui/disegno/accessibile.test.tsx",
    perche: programma,
    righe: [
      ["1", "expect(postiDellAlbero(f).map(chiaveDelPosto).filter((k) => !tolto.includes(k))).toHaveLength(1);"],
      ["1 1", "expect([flowchart.querySelectorAll('[data-iniziale=\"dati-3\"]').length, flowchart.querySelectorAll('[data-blocco=\"v-dati-3\"]').length]).toEqual([1, 1]);"],
    ],
  },
  {
    file: "ui/disegno/campi.test.ts",
    perche: programma,
    righe: [
      ["1", "expect(campiDaBozza(bozza, it)).toEqual({ counter: \"i\", from: \"length s - 1\", to: \"length t\", step: -1 });"],
      ["1 1 3 99999999999", "expect(visti).toEqual(["],
    ],
  },
  {
    file: "ui/disegno/segni.test.ts",
    perche: relazione,
    righe: [
      ["2", "expect(conti.etichette).toBe(2 * conti.condizioni);"],
    ],
  },
  {
    file: "ui/esecuzione/finestra.test.tsx",
    perche: programma,
    righe: [
      ["5", "expect(await pauseDiF5(\"per-ogni-vettore.algo\")).toEqual({ viste: Array(5).fill(\"b1:condizione\"), stato: testi.statoFinita });"],
      ["1 1 1", "expect(visti.mostrati).toEqual(["],
      ["1 1 1", "expect(visti.nascosti).toEqual(["],
      ["1", "expect({ avviso: avviso(), nellaConsole: inColonna.length }).toEqual({ avviso: \"\", nellaConsole: 1 });"],
      ["1", "expect([...colonna.querySelectorAll(\"*\")].filter((e) => e.children.length === 0 && e.textContent === istruzione).length).toBe(1);"],
      ["1", "expect(esiti).toEqual([`${limite} scelti: finita, «7»`, `${limite + 1} scelti: non parte`, `${limite} predefiniti: non parte`]);"],
      ["10 10 10", "expect(righe()).toEqual([\"abcde\".repeat(10), \"abcde\".repeat(10), \"abcde\".repeat(10)]);"],
      ["10", "expect(righe()).toEqual([`…${\"abcde\".repeat(10)}`]);"],
      ["10", "expect(outputMostrato()).toBe(\"abcde\".repeat(10));"],
    ],
  },
  {
    file: "ui/esecuzione/finestra.test.tsx",
    perche: tetto,
    righe: [
      ["1000", "expect(document.querySelectorAll('[role=\"log\"] [data-scrive]').length).toBe(1000);"],
    ],
  },
  {
    file: "ui/esempi.test.ts",
    perche: esempi,
    righe: [
      ["30 8", "expect([casi, casiDiFunzioni]).toEqual([30, 8]);"],
      ["10", "expect([forniti(it).at(-1)!.gruppo, senzaUscita.progetto.options, senzaUscita.progetto.metadata.description]).toEqual(["],
      ["6", "expect(nomi(mancanti(c, it))).toEqual(["],
      ["6", "expect(nomi(mancanti(daForniti(forniti(it).slice(0, 6)), it))).toEqual(dodiciNomi(it).slice(6));"],
      ["9", "expect(nomi(mancanti(daForniti(forniti(it).slice(0, 9)), it))).toEqual(dodiciNomi(it).slice(9));"],
      ["4", "expect(spostati.map((f) => [f.gruppo, f.nome])).toEqual(["],
      ["5", "expect(spostati.map((f) => f.testo)).toEqual(prima.slice(0, 5).map((f) => f.testo));"],
    ],
  },
  {
    file: "ui/genera/accademico.test.ts",
    perche: prova,
    righe: [
      ["15", "expect(Object.keys(delCorpus).length).toBe(15);"],
    ],
  },
  {
    file: "ui/genera/c.test.ts",
    perche: tempo,
    righe: [
      ["2000", "expect(performance.now() - inizio).toBeLessThan(2000);"],
    ],
  },
  {
    file: "ui/genera/c.test.ts",
    perche: programma,
    righe: [
      ["2", "expect(r.filter((x) => x.testo.startsWith(\"bool mai_chiamata(\")).length, l).toBe(2);"],
    ],
  },
  {
    file: "ui/genera/matrici.test.ts",
    perche: catalogo,
    righe: [
      ["5", "expect(linguaggi.length).toBe(5);"],
      ["3", "expect(daEseguire.length).toBe(3);"],
    ],
  },
  {
    file: "ui/genera/matrici.test.ts",
    perche: programma,
    righe: [
      ["7", "expect(righeDi(delPython, { blocco: \"b1\" })).toHaveLength(7);"],
    ],
  },
  {
    file: "ui/genera/pseudocodice.test.ts",
    perche: programma,
    righe: [
      ["1", "expect(r.filter((x) => x.blocco === main.end.id).length, f).toBe(1);"],
    ],
  },
  {
    file: "ui/genera/python.test.ts",
    perche: programma,
    righe: [
      ["4", "expect(r.righe.filter((x) => /\\b(uno|due|tre|quattro)\\b/.test(x.testo)).length, `${nome} (${l})`).toBe(scrive ? 4 : 0);"],
      ["1", "expect(r.filter((x) => x.testo.startsWith(\"def mai_chiamata(\")).length, l).toBe(1);"],
    ],
  },
  {
    file: "ui/genera/python.test.ts",
    perche: tempo,
    righe: [
      ["2000", "expect(performance.now() - inizio).toBeLessThan(2000);"],
    ],
  },
  {
    file: "ui/genera/python.test.ts",
    perche: catalogo,
    righe: [
      ["10", "expect(voci.length).toBe(10);"],
    ],
  },
  {
    file: "ui/genera/record.test.ts",
    perche: catalogo,
    righe: [
      ["5", "expect(linguaggi.length).toBe(5);"],
      ["3", "expect(daEseguire.length).toBe(3);"],
    ],
  },
  {
    file: "ui/genera/record.test.ts",
    perche: programma,
    righe: [
      ["3", "expect(righeDi(delPython, { blocco: \"b1\" })).toHaveLength(3);"],
    ],
  },
  {
    file: "ui/genera/stampato.test.ts",
    perche: programma,
    righe: [
      ["4 4", "expect(aCapo(riga, 77)).toEqual({ rientro: 4, colonna: 4, pezzi: ['print(f\"Errore alla riga {chiamante.f_lineno}: {motivo}\", ', \"file=sys.stderr)\"] });"],
      ["8 8", "expect(aCapo(riga, 77)).toEqual({ rientro: 8, colonna: 8, pezzi: ['printf(\"Media: %.2f su %d voti, insufficienti: %d\\\\n\", media, contati,', \" insufficienti);\"] });"],
      ["8 8", "expect(aCapo(riga, 77)).toEqual({ rientro: 8, colonna: 8, pezzi: ['fermati(\"La procedura o la funzione è stata richiamata 10 volte, e ', 'nessuna è finita.\", 3)'] });"],
      ["4 4", "expect(aCapo(riga, 20)).toEqual({ rientro: 4, colonna: 4, pezzi: [\"SetConsoleOutput\", \"CP(65001);\"] });"],
      ["200", "expect(rientro(riga)).toBe(200);"],
      ["200 34", "expect(aCapo(riga, 77)).toEqual({ rientro: 200, colonna: 34, pezzi: [riga.trimStart()] });"],
      ["4", "expect(rientroDelSeguito).toBe(4);"],
      ["8 8", "expect(aCapo(\"        \", 77)).toEqual({ rientro: 8, colonna: 8, pezzi: [\"\"] });"],
      ["4 4", "expect(aCapo(\"    se_vero = (c == ' ') && pronto;\", 24)).toEqual({ rientro: 4, colonna: 4, pezzi: [\"se_vero = (c == \", \"' ') && pronto;\"] });"],
      ["4 4", "expect(aCapo(`    s('\"', \"uno due tre\", fine);`, 24)).toEqual({ rientro: 4, colonna: 4, pezzi: [`s('\"', `, `\"uno due tre\", `, \"fine);\"] });"],
    ],
  },
  {
    file: "ui/genera/tabelle.test.ts",
    perche: catalogo,
    righe: [
      ["5", "expect(linguaggi.length).toBe(5);"],
      ["3", "expect(daEseguire.length).toBe(3);"],
    ],
  },
  {
    file: "ui/genera/tabelle.test.ts",
    perche: programma,
    righe: [
      ["6", "expect(righeDi(delPython, { blocco: \"b1\" })).toHaveLength(6);"],
    ],
  },
  {
    file: "ui/genera/typescript.test.ts",
    perche: programma,
    righe: [
      ["2", "expect(dichiarati.length).toBe(2);"],
      ["2", "expect(separatori.length).toBe(2);"],
    ],
  },
  {
    file: "e2e/dati.e2e.ts",
    perche: relazione,
    righe: [
      ["1", "expect(premesse.tabelle).toBe(progetti.length + 1);"],
    ],
  },
  {
    file: "e2e/disegno.e2e.ts",
    perche: prova,
    righe: [
      ["4", "expect(combinazioni.length).toBe(4);"],
      ["6", "expect(misure).toBe(6);"],
      ["2", "expect(sfondi.size).toBe(2);"],
      ["6", "expect(condizioni.size).toBe(6);"],
    ],
  },
  {
    file: "e2e/disegno.e2e.ts",
    perche: relazione,
    righe: [
      ["2", "expect(lati).toBe(2 * salti);"],
    ],
  },
  {
    file: "e2e/disegno.e2e.ts",
    perche: programma,
    righe: [
      ["3", "if (domandaNellaLettura) expect([nelFile, conLaDomanda]).toEqual([3, confermato(\"disegno e2e - letture con la domanda nel corpus\", conLaDomanda)]);"],
    ],
  },
  {
    file: "e2e/disegno.e2e.ts",
    perche: tetto,
    righe: [
      ["14", "expect(adattato).toBeLessThan(14);"],
    ],
  },
  {
    file: "e2e/flowchart-in-svg.e2e.ts",
    perche: programma,
    righe: [
      ["1", "expect({ soloTela: tolta.soloTela.length, soloNucleo: tolta.soloNucleo.length }).toEqual({ soloTela: 1, soloNucleo: 0 });"],
    ],
  },
  {
    file: "e2e/progetto-file.e2e.ts",
    perche: programma,
    righe: [
      ["1", "expect(await comando(page, it.menuProgetto).count(), \"non c'è il menu «Progetto» nella barra\").toBe(1);"],
      ["1", "for (const nome of [it.apri, it.salvaConNome]) expect(await (await voceDelMenu(page, nome)).count(), `non c'è il comando «${nome}» nel menu`).toBe(1);"],
      ["1", "expect({ finestre: f.finestre.salva, proposto: f.finestre.proposto, cartella: f.finestre.cartella }).toEqual({ finestre: 1, proposto: \"riferimento-media-voti.algo\", cartella: null });"],
      ["1", "expect(f.finestre.salva).toBe(1);"],
      ["3 10", "expect({ metadata: scritto.metadata, options: scritto.options }).toEqual({ metadata: { name: \"Prova nuova\" }, options: { real_decimals: 3, call_stack_limit: 10 } });"],
      ["1", "await expect.poll(async () => (await finzione(page)).finestre.salva, { message: \"la finestra del file non si è aperta\" }).toBe(finestreDiPrima + 1);"],
    ],
  },
  {
    file: "e2e/progetto-file.e2e.ts",
    perche: catalogo,
    righe: [
      ["14", "expect(motivi.length).toBe(14);"],
      ["13", "expect(giri.length).toBe(13);"],
    ],
  },
];
