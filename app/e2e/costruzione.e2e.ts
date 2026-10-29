// La costruzione dei programmi di riferimento delle tappe 1 e 2 (il secondo coi due cicli `per`) solo con l'interfaccia,
// nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build), col guscio simulato: la finestra del
// file nativa è finta (restituisce il percorso scritto dalla prova) e la scrittura cattura il testo.
//
// - Nei modi predefiniti (nessuna preferenza: i campi dei blocchi nel riquadro, i dati nella scheda): un
//   progetto nuovo («Nuovo», nome e descrizione nella sua finestra), gli 8 dati, il caso d'uso e i blocchi del
//   riferimento (23 nella tappa 1; 20 nella tappa 2, coi due `per` inseriti dall'elenco dei blocchi e scritti nei loro
//   campi; la Fine nasce col progetto) con clic e testo nei campi (`costruzione.ts`), «Salva con nome»: il testo
//   salvato è byte per byte quello dell'atteso scritto a mano (`attesi/riferimento-media-voti.algo`,
//   `attesi/riferimento-media-voti-per.algo`), caso d'uso compreso. Il messaggio di un rosso elenca i percorsi dei
//   campi diversi.
// - Il caso prima delle regole: coi soli dati e il caso, «Salva con nome», «Apri» lo stesso file e di nuovo «Salva con
//   nome» danno lo stesso testo (riaperto identico); «Esegui» sul caso dice non raggiunto (nessuna regola: nessun output,
//   i valori avanzano), e la riga di comando sullo stesso file dice `ROSSO` con gli stessi campi. Con le regole il caso è
//   raggiunto nella finestra («Esegui» della sua riga, anche coi cicli `per`), e la riga di comando sul file salvato dice
//   `VERDE`. Controllo positivo nei due: l'output atteso cambiato di un carattere nei campi del caso è non raggiunto
//   nella finestra e `ROSSO [output]` dalla riga di comando.
// - Negli altri due modi (pannello a destra, celle; scelti nelle preferenze, come li scrivono le
//   Impostazioni): lo stesso programma intero, e lo stesso file.
// - Controllo positivo, in ogni giro: un carattere cambiato nell'atteso dà il rosso col percorso di quel
//   campo. Che un passo tolto dalla costruzione faccia rosso lo prova una mutazione, una volta; che un campo dei cicli
//   perso nel file faccia rosso, un'altra.
//
// Che i numeri dei blocchi dell'atteso seguano l'ordine di creazione, e che l'atteso sia il riferimento a
// meno di quei numeri e dei casi d'uso, lo dice `attesi/atteso.test.ts`.
//
// CHE COSA NON GUARDA:
// - il disegno (lo guardano le prove del disegno): qui si confronta il FILE;
// - la finestra del file vera e il disco: li prova la prova sul prodotto, che costruisce il riferimento della tappa 2;
// - le differenze del caso campo per campo nella finestra (le confronta con la riga di comando `ui/casi/casi.test.tsx`):
//   qui il pallino, la riga dell'esito nella console e i campi della riga `ROSSO`;
// - il campo del passo (il riferimento della tappa 2 non ne ha: lo scrivono `editor-dei-cicli.e2e.ts` e le prove di
//   unità dei campi);
// - la costruzione in inglese (la fa la prova sul prodotto, se il sistema è in inglese), le forme dei dati
//   che il riferimento non ha (vettori, costanti, lunghezza: le scrive `modifica-dati.e2e.ts`).

import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { costruisci, differenze, programmaDeiRecord, programmaDelleMatrici, programmaDelleTabelle, riferimentoDellaTappa1, riferimentoDellaTappa2, riferimentoDellaTappa3, type DaCostruire, type Modi } from "./costruzione";
import { apriVuota, costruisciFinzione, voceDelMenu } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "parallel" });

const app = fileURLToPath(new URL("..", import.meta.url));

/** «Salva con nome» verso quel percorso; il testo scritto. */
async function salvaConNome(page: Page, percorso: string): Promise<string> {
  await page.evaluate((p) => Object.assign(window.__finzione__, { daSalvare: p }), percorso);
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await page.waitForFunction((p) => window.__finzione__.file[p] !== undefined, percorso, { polling: "raf" });
  return page.evaluate((p) => window.__finzione__.file[p]!, percorso);
}

/** «Apri» quel percorso (già salvato nella finzione). */
async function apriIl(page: Page, percorso: string): Promise<void> {
  await page.evaluate((p) => Object.assign(window.__finzione__, { daAprire: p }), percorso);
  await (await voceDelMenu(page, it.apri)).click();
  await expect(page.locator('output[role="status"]')).toHaveText(riempi(it.apertoIl, { file: percorso.split("\\").at(-1)! }));
}

/** «Esegui» sul primo caso, dalla sua scheda: il pallino del caso prima e dopo la corsa, e la riga dell'esito in fondo
 * alla console. */
async function eseguiIlCaso(page: Page): Promise<{ prima: string | null; dopo: string | null; console: string | null }> {
  await page.getByRole("tab", { name: riempi(it.schedaCasi, { n: "1" }), exact: true }).click();
  const riga = page.locator('tr[data-caso="0"]');
  const pallino = riga.locator("[data-esito]");
  const prima = await pallino.getAttribute("data-esito");
  // La riga dell'esito di una corsa di prima sparisce quando la colonna si apre di nuovo.
  const esito = page.locator('[role="log"] [data-esito-del-caso]');
  await riga.locator('[data-esegui-caso="tutto"]').click();
  await expect(pallino).not.toHaveAttribute("data-esito", prima ?? "");
  await esito.waitFor();
  return { prima, dopo: await pallino.getAttribute("data-esito"), console: await esito.textContent() };
}

/** La riga di comando su un file scritto qui: il file, l'uscita e il codice. */
function rigaDiComando(cartella: string, nome: string, testo: string): { file: string; uscita: string; codice: number | null } {
  mkdirSync(cartella, { recursive: true });
  const file = join(cartella, nome);
  writeFileSync(file, testo);
  const r = Bun.spawnSync([process.execPath, join(app, "strumenti", "casi.ts"), file], { cwd: app });
  return { file, uscita: r.stdout.toString(), codice: r.exitCode };
}

const modi: { nome: string; salvate: object; modi: Modi }[] = [
  { nome: "nei modi predefiniti", salvate: { lingua: "it" }, modi: { blocchi: "riquadro", dati: "scheda" } },
  { nome: "negli altri due modi (pannello, celle)", salvate: { lingua: "it", modoDeiBlocchi: "pannello", modoDeiDati: "celle" }, modi: { blocchi: "pannello", dati: "celle" } },
];
const riferimenti: { tappa: string; quale: DaCostruire; blocchi: number; cicli: number }[] = [
  { tappa: "della tappa 1", quale: riferimentoDellaTappa1, blocchi: 23, cicli: 0 },
  { tappa: "della tappa 2 (cicli per)", quale: riferimentoDellaTappa2, blocchi: 20, cicli: 2 },
];

for (const r of riferimenti)
  for (const g of modi) {
    test(`il riferimento ${r.tappa} costruito solo con l'interfaccia ${g.nome} e salvato è byte per byte il file atteso`, async ({ page }, info) => {
      // Limite dichiarato: 8 dati e 23 blocchi (più la fine), campo per campo; misurati 4,5–8,3 s in Chromium
      // e 17–19 s in WebKit con i quattro progetti di questo file in parallelo, 30–33 s in WebKit nel
      // collaudo con tutti gli spec (i secondi sono nel log della prova): il limite ne lascia più del triplo.
      test.setTimeout(240_000);
      const { progetto: daCostruire, atteso } = r.quale;
      const coiCicli = r.cicli > 0;
      await apriVuota(page, g.salvate);
      const inizio = Date.now();
      const cartella = join(app, ".collaudo", "costruzione");
      const nomeDelCaso = daCostruire.test_cases![0]!.name;
      const nomeDelFile = `${info.project.name}-${coiCicli ? "cicli-" : ""}${g.modi.blocchi}`;
      // Il caso prima delle regole: salvato, riaperto identico, eseguito nella finestra e dalla riga di comando.
      const primaDelleRegole: Record<string, unknown> = {};
      const osservato = await costruisci(
        page,
        "it",
        g.modi,
        true,
        async () => {
          const soloDati = await salvaConNome(page, "C:\\prove\\solo-dati.algo");
          await apriIl(page, "C:\\prove\\solo-dati.algo");
          const riaperto = await salvaConNome(page, "C:\\prove\\solo-dati-riaperto.algo");
          const finestra = await eseguiIlCaso(page);
          const cli = rigaDiComando(cartella, `${nomeDelFile}-solo-dati.algo`, soloDati);
          const riga = cli.uscita.split("\n").find((x) => x.includes(`#${nomeDelCaso}`));
          Object.assign(primaDelleRegole, { riapertoIdentico: riaperto === soloDati, casi: JSON.parse(soloDati).test_cases, ...finestra, riga, codice: cli.codice, file: cli.file });
        },
        r.quale,
      );
      const testo = await salvaConNome(page, "C:\\prove\\costruito.algo");
      const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
      const diverse = differenze(JSON.parse(testo), JSON.parse(atteso.testo));
      console.log(
        `[${info.project.name}] costruzione ${r.tappa} ${g.nome}: dati ${osservato.dati}, blocchi ${osservato.blocchi} (cicli ${osservato.cicli}; in un riquadro ${osservato.riquadri}, nel pannello ${osservato.pannelli}), ${Buffer.byteLength(testo)} byte contro ${Buffer.byteLength(atteso.testo)} dell'atteso, campi diversi ${diverse.length}, ${secondi} s`,
      );
      expect(diverse, "il file salvato è diverso dall'atteso in questi campi").toEqual([]);
      expect(testo, "il file salvato è diverso dall'atteso nei byte (ordine delle chiavi, spazi, fine riga)").toBe(atteso.testo);
      expect({ dati: osservato.dati, blocchi: osservato.blocchi, cicli: osservato.cicli, valoriDelCaso: osservato.valoriDelCaso }).toEqual({ dati: 8, blocchi: r.blocchi, cicli: r.cicli, valoriDelCaso: 6 });
      const { file: fileSoloDati, ...visto } = primaDelleRegole;
      console.log(`[${info.project.name}] costruzione ${r.tappa} ${g.nome}: prima delle regole ${JSON.stringify(visto)}`);
      expect(visto).toEqual({
        riapertoIdentico: true,
        casi: daCostruire.test_cases,
        prima: "mai",
        dopo: "non-raggiunto",
        console: riempi(it.esitoDelCasoNonRaggiunto, { nome: nomeDelCaso, quante: riempi(it.diffTante, { n: "2" }) }),
        riga: `ROSSO ${fileSoloDati}#${nomeDelCaso} [output, error]`,
        codice: 1,
      });
      // I campi dei blocchi si sono aperti nel modo scelto, ogni volta.
      expect(g.modi.blocchi === "riquadro" ? osservato.riquadri : osservato.pannelli, `i campi non si sono aperti sempre ${g.modi.blocchi === "riquadro" ? "nel riquadro" : "nel pannello"}`).toBe(r.blocchi);

      // Con le regole: il caso raggiunto nella finestra, eseguito dalla sua riga; il file salvato, col caso scritto
      // dall'interfaccia, verde dalla riga di comando.
      expect(await eseguiIlCaso(page)).toEqual({ prima: "da-rieseguire", dopo: "raggiunto", console: riempi(it.esitoDelCasoRaggiunto, { nome: nomeDelCaso }) });
      const verde = rigaDiComando(cartella, `${nomeDelFile}.algo`, testo);
      console.log(`[${info.project.name}] costruzione ${r.tappa} ${g.nome}: bun run casi → exit ${verde.codice}, ${verde.uscita.trim().split("\n").at(-1)}`);
      expect(verde.uscita).toContain(`VERDE ${verde.file}#${nomeDelCaso}`);
      expect(verde.uscita).toContain("casi eseguiti 1, verdi 1, con avvisi diversi 0, rossi 0");
      expect(verde.codice).toBe(0);

      // Controllo positivo nei due: l'output atteso cambiato di un carattere nei campi del caso.
      await page.locator('tr[data-caso="0"]').dblclick();
      const campiDelCaso = page.locator("[data-campi-caso]");
      await campiDelCaso.getByRole("textbox", { name: it.casoOutput, exact: true }).fill(daCostruire.test_cases![0]!.expected.output.replace("Media", "Medio"));
      await campiDelCaso.getByRole("button", { name: it.conferma, exact: true }).click();
      await expect(campiDelCaso).toHaveCount(0);
      const rosso = rigaDiComando(cartella, `${nomeDelFile}-alterato.algo`, await salvaConNome(page, "C:\\prove\\alterato.algo"));
      const rigaRossa = { riga: rosso.uscita.split("\n").find((x) => x.includes(`#${nomeDelCaso}`)), codice: rosso.codice };
      expect({ ...(await eseguiIlCaso(page)), ...rigaRossa }).toEqual({
        prima: "raggiunto-prima",
        dopo: "non-raggiunto",
        console: riempi(it.esitoDelCasoNonRaggiunto, { nome: nomeDelCaso, quante: it.diffUna }),
        riga: `ROSSO ${rosso.file}#${nomeDelCaso} [output]`,
        codice: 1,
      });

      // Controllo positivo: un carattere cambiato nell'atteso, e il rilevatore dice quel campo.
      const mutato = atteso.testo.replace('"\\"Media: \\""', '"\\"Medio: \\""');
      expect(mutato).not.toBe(atteso.testo);
      expect(differenze(JSON.parse(testo), JSON.parse(mutato))).toEqual([`functions[0].body[${coiCicli ? 3 : 4}].then[1].values[0]`]);
    });
  }

test("il riferimento della tappa 3 costruito solo con l'interfaccia (le procedure dai salti, la funzione dal pulsante) e salvato è byte per byte il file atteso, coi casi verdi dalla riga di comando", async ({ page }, info) => {
  // Limite dichiarato: 11 dati, 23 blocchi, tre procedure e funzioni coi loro casi, campo per campo (il doppio della
  // tappa 1, misurato nel log della prova).
  test.setTimeout(240_000);
  const { progetto: daCostruire, atteso } = riferimentoDellaTappa3;
  await apriVuota(page, { lingua: "it" });
  const inizio = Date.now();
  const osservato = await costruisci(page, "it", { blocchi: "riquadro", dati: "scheda" }, true, async () => {}, riferimentoDellaTappa3);
  const testo = await salvaConNome(page, "C:\\prove\\costruito-funzioni.algo");
  const diverse = differenze(JSON.parse(testo), JSON.parse(atteso.testo));
  console.log(
    `[${info.project.name}] costruzione della tappa 3: dati ${osservato.dati}, blocchi ${osservato.blocchi} (salti ${osservato.salti}, cicli ${osservato.cicli}; campi in un riquadro ${osservato.riquadri}), procedure e funzioni ${osservato.funzioni} coi casi ${osservato.casiDelleFunzioni}, valori dei casi ${osservato.valoriDelCaso}; ${Buffer.byteLength(testo)} byte contro ${Buffer.byteLength(atteso.testo)} dell'atteso, campi diversi ${diverse.length}, ${((Date.now() - inizio) / 1000).toFixed(1)} s`,
  );
  expect(diverse, "il file salvato è diverso dall'atteso in questi campi").toEqual([]);
  expect(testo, "il file salvato è diverso dall'atteso nei byte (ordine delle chiavi, spazi, fine riga)").toBe(atteso.testo);
  // Le premesse: ogni dato, blocco, salto, procedura e funzione e caso del riferimento è passato dall'interfaccia; i
  // campi dei due salti si sono aperti due volte (la procedura nasce dai loro campi, gli argomenti dopo).
  expect({ ...osservato, pannelli: undefined }).toEqual({ riquadri: 25, pannelli: undefined, blocchi: 23, cicli: 1, salti: 2, dati: 11, valoriDelCaso: 9, funzioni: 3, casiDelleFunzioni: 3, records: 0, campi: 0 });
  // I casi del file salvato, quello del programma e quelli delle funzioni, dalla riga di comando.
  const verde = rigaDiComando(join(app, ".collaudo", "costruzione"), `${info.project.name}-funzioni.algo`, testo);
  console.log(`[${info.project.name}] costruzione della tappa 3: bun run casi → exit ${verde.codice}, ${verde.uscita.trim().split("\n").at(-1)}`);
  expect(verde.uscita).toContain(`VERDE ${verde.file}#${daCostruire.test_cases![0]!.name}`);
  for (const caso of ["valido/voto valido", "valido/voto troppo alto", "stelle/tre stelle"]) expect(verde.uscita).toContain(`VERDE ${verde.file}#${caso}`);
  expect(verde.uscita).toContain("casi eseguiti 4, verdi 4, con avvisi diversi 0, rossi 0");
  expect(verde.codice).toBe(0);
  // Controllo positivo: un carattere cambiato nell'atteso (ciò che `valido` restituisce), e il rilevatore dice quel campo.
  const mutato = atteso.testo.replace('"voto >= 1 and voto <= 10"', '"voto >= 1 and voto <= 11"');
  expect(mutato).not.toBe(atteso.testo);
  expect(differenze(JSON.parse(testo), JSON.parse(mutato))).toEqual(["functions[2].end.return_value"]);
});

test("il programma coi record costruito solo con l'interfaccia (il record dal menu «Progetto», i dati record, il valore iniziale, la copia e i campi letti e scritti) e salvato è byte per byte il file atteso, col caso verde dalla riga di comando", async ({ page }, info) => {
  const { progetto: daCostruire, atteso } = programmaDeiRecord;
  await apriVuota(page, { lingua: "it" });
  const inizio = Date.now();
  const osservato = await costruisci(page, "it", { blocchi: "riquadro", dati: "scheda" }, true, async () => {}, programmaDeiRecord);
  const testo = await salvaConNome(page, "C:\\prove\\costruito-record.algo");
  const diverse = differenze(JSON.parse(testo), JSON.parse(atteso.testo));
  console.log(
    `[${info.project.name}] costruzione coi record: record ${osservato.records} (campi ${osservato.campi}), dati ${osservato.dati}, blocchi ${osservato.blocchi}; ${Buffer.byteLength(testo)} byte contro ${Buffer.byteLength(atteso.testo)} dell'atteso, campi diversi ${diverse.length}, ${((Date.now() - inizio) / 1000).toFixed(1)} s`,
  );
  expect(diverse, "il file salvato è diverso dall'atteso in questi campi").toEqual([]);
  expect(testo, "il file salvato è diverso dall'atteso nei byte (ordine delle chiavi, spazi, fine riga)").toBe(atteso.testo);
  // Le premesse: il record coi suoi tre campi, i due dati e i cinque blocchi sono passati dall'interfaccia.
  expect({ records: osservato.records, campi: osservato.campi, dati: osservato.dati, blocchi: osservato.blocchi }).toEqual({ records: 1, campi: 3, dati: 2, blocchi: 5 });
  // Il caso del file salvato dalla riga di comando: la finestra non esegue ancora i record.
  const verde = rigaDiComando(join(app, ".collaudo", "costruzione"), `${info.project.name}-record.algo`, testo);
  expect(verde.uscita).toContain(`VERDE ${verde.file}#${daCostruire.test_cases![0]!.name}`);
  expect(verde.codice).toBe(0);
  // Controllo positivo: la lunghezza di un campo cambiata nell'atteso, e il rilevatore dice quel campo.
  const mutato = atteso.testo.replace('"max_length": 3', '"max_length": 4');
  expect(mutato).not.toBe(atteso.testo);
  expect(differenze(JSON.parse(testo), JSON.parse(mutato))).toEqual(["records[0].fields[1].max_length"]);
});

test("il programma con le matrici costruito solo con l'interfaccia (la forma «matrice» con le righe e le colonne, il valore iniziale per righe, il vettore, le copie col nome e il «per ogni» su una riga) e salvato è byte per byte il file atteso, col caso verde dalla riga di comando", async ({ page }, info) => {
  const { progetto: daCostruire, atteso } = programmaDelleMatrici;
  await apriVuota(page, { lingua: "it" });
  const inizio = Date.now();
  const osservato = await costruisci(page, "it", { blocchi: "riquadro", dati: "scheda" }, true, async () => {}, programmaDelleMatrici);
  const testo = await salvaConNome(page, "C:\prove\costruito-matrici.algo");
  const diverse = differenze(JSON.parse(testo), JSON.parse(atteso.testo));
  console.log(
    `[${info.project.name}] costruzione con le matrici: dati ${osservato.dati}, blocchi ${osservato.blocchi} (cicli ${osservato.cicli}); ${Buffer.byteLength(testo)} byte contro ${Buffer.byteLength(atteso.testo)} dell'atteso, campi diversi ${diverse.length}, ${((Date.now() - inizio) / 1000).toFixed(1)} s`,
  );
  expect(diverse, "il file salvato è diverso dall'atteso in questi campi").toEqual([]);
  expect(testo, "il file salvato è diverso dall'atteso nei byte (ordine delle chiavi, spazi, fine riga)").toBe(atteso.testo);
  // Le premesse: i quattro dati (due matrici, un vettore, un intero) e i quattordici blocchi sono passati dall'interfaccia.
  expect({ dati: osservato.dati, blocchi: osservato.blocchi, cicli: osservato.cicli }).toEqual({ dati: 4, blocchi: 14, cicli: 1 });
  const verde = rigaDiComando(join(app, ".collaudo", "costruzione"), `${info.project.name}-matrici.algo`, testo);
  expect(verde.uscita).toContain(`VERDE ${verde.file}#${daCostruire.test_cases![0]!.name}`);
  expect(verde.codice).toBe(0);
  // Controllo positivo: le colonne di una matrice cambiate nell'atteso, e il rilevatore dice quel campo.
  const mutato = atteso.testo.replace('"columns": 2,\n          "initial"', '"columns": 3,\n          "initial"');
  expect(mutato).not.toBe(atteso.testo);
  expect(differenze(JSON.parse(testo), JSON.parse(mutato))).toEqual(["functions[0].data[0].columns"]);
});

test("il programma con le tabelle costruito solo con l'interfaccia (il record dal menu, la tabella con l'elenco per record, la costante comune col record ripetuto, il campo letto, il «per ogni» sui record) e salvato è byte per byte il file atteso, col caso verde dalla riga di comando", async ({ page }, info) => {
  const { progetto: daCostruire, atteso } = programmaDelleTabelle;
  await apriVuota(page, { lingua: "it" });
  const inizio = Date.now();
  const osservato = await costruisci(page, "it", { blocchi: "riquadro", dati: "scheda" }, true, async () => {}, programmaDelleTabelle);
  const testo = await salvaConNome(page, "C:\\prove\\costruito-tabelle.algo");
  const diverse = differenze(JSON.parse(testo), JSON.parse(atteso.testo));
  console.log(
    `[${info.project.name}] costruzione con le tabelle: record ${osservato.records} (campi ${osservato.campi}), dati ${osservato.dati}, blocchi ${osservato.blocchi} (cicli ${osservato.cicli}), valori del caso ${osservato.valoriDelCaso}; ${Buffer.byteLength(testo)} byte contro ${Buffer.byteLength(atteso.testo)} dell'atteso, campi diversi ${diverse.length}, ${((Date.now() - inizio) / 1000).toFixed(1)} s`,
  );
  expect(diverse, "il file salvato è diverso dall'atteso in questi campi").toEqual([]);
  expect(testo, "il file salvato è diverso dall'atteso nei byte (ordine delle chiavi, spazi, fine riga)").toBe(atteso.testo);
  // Le premesse: il record coi suoi tre campi, la costante comune e i tre dati, i sette blocchi (un «per ogni») e il valore
  // del caso sono passati dall'interfaccia.
  expect({ records: osservato.records, campi: osservato.campi, dati: osservato.dati, blocchi: osservato.blocchi, cicli: osservato.cicli, valori: osservato.valoriDelCaso }).toEqual({ records: 1, campi: 3, dati: 4, blocchi: 7, cicli: 1, valori: 1 });
  const verde = rigaDiComando(join(app, ".collaudo", "costruzione"), `${info.project.name}-tabelle.algo`, testo);
  expect(verde.uscita).toContain(`VERDE ${verde.file}#${daCostruire.test_cases![0]!.name}`);
  expect(verde.codice).toBe(0);
  // Controllo positivo: un campo del record ripetuto cambiato nell'atteso, e il rilevatore dice quel campo.
  const mutato = atteso.testo.replace('"\\"0X\\""', '"\\"0Y\\""');
  expect(mutato).not.toBe(atteso.testo);
  expect(differenze(JSON.parse(testo), JSON.parse(mutato))).toEqual(["shared_constants[0].initial.each[1]"]);
});
