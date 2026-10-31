// La vista dei dati nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
//
// La vista mostra il modello: ogni tabella, trovata per ruolo e nome, si appaia ai dati del modello PER
// ELEMENTO e nei due versi (righe senza dato, dati senza riga), attributo per attributo, col conteggio
// accanto. Sui casi della tappa 1 del corpus e su un progetto scritto qui con ogni forma di dato (il corpus
// non ha né costanti né costanti comuni), in italiano e in inglese. Nelle colonne tipo, natura e ruolo
// dell'italiano nessuna parola inglese del file. Controlli positivi: una riga tolta dalla vista, e un tipo
// riscritto con la parola del file, fanno rosso.
//
// CHE COSA NON GUARDA:
// - i dati delle funzioni che non sono il programma principale, e i parametri (tappa 3);
// - la disposizione delle due viste (la guarda `finestra.e2e.ts`) né il contrasto della tabella, che usa
//   i colori del testo dell'interfaccia;
// - come un lettore di schermo vero legge la tabella: qui il nome accessibile delle celle col trattino.

import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Dato, Funzione } from "../core/progetto/modello";
import { tipi } from "../core/progetto/modello";
import { en } from "../i18n/en";
import { it, type Dizionario } from "../i18n/it";
import { misuraIlCorpus } from "../strumenti/corpus";
import { rigaDelDato, type RigaDelDato } from "../ui/dati/righe";
import { testiDelDisegno } from "../ui/disegno/testi";
import { apri, costruisciFinzione, scegliLingua } from "./pagina";

test.beforeAll(costruisciFinzione);

// ------------------------------------------------------------------------------------- gli ingressi

interface ProgettoDiProva {
  nome: string;
  funzione: Funzione;
  costantiComuni: readonly Dato[];
}

/** Apre un file come lo apre l'app: un progetto che il lettore rifiuta non è una prova. */
function daFile(nome: string, testo: string): ProgettoDiProva {
  const esito = apriProgetto(testo);
  if (!esito.ok) throw new Error(`${nome} non si apre`);
  return { nome, funzione: esito.progetto.functions[0]!, costantiComuni: esito.progetto.shared_constants ?? [] };
}

const cartellaCasi = fileURLToPath(new URL("../casi/tappa-1", import.meta.url));
const corpus = readdirSync(cartellaCasi)
  .filter((f) => f.endsWith(".algo"))
  .map((f) => daFile(f.slice(0, -".algo".length), readFileSync(join(cartellaCasi, f), "utf8")));

const ogniForma = daFile(
  "dati-di-ogni-forma",
  JSON.stringify({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "dati-di-ogni-forma" },
    shared_constants: [
      { name: "MASSIMO", type: "integer", constant: true, initial: "30" },
      { name: "SALUTO", type: "string", constant: true, initial: '"Buongiorno"' },
    ],
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "voti", type: "integer", size: 5, initial: { each: "0" }, role: "input" },
          { name: "pesi", type: "real", size: 3, constant: true, initial: ["1.0", "2.0", "0.5"] },
          { name: "iniziale", type: "character", role: "input_output" },
          { name: "nome", type: "string", max_length: 20, role: "input" },
          { name: "trovato", type: "boolean", initial: "false", role: "output" },
          { name: "minimo", type: "integer", constant: true, initial: "-5" },
        ],
        body: [],
        end: { id: "b1" },
      },
    ],
  }),
);

const progetti = [...corpus, ogniForma];

// ------------------------------------------------------------------------- che cosa si legge dal motore

interface TabellaLetta {
  nome: string;
  righe: { celle: string[]; nessuno: boolean[] }[];
}

/** Ogni tabella della pagina, per ruolo: il nome accessibile e il testo di ogni cella. Una cella col
 * trattino è segnata, e il suo testo è quello che si vede. */
async function leggi(page: Page): Promise<TabellaLetta[]> {
  const tabelle = page.getByRole("table");
  const nomi = await tabelle.evaluateAll((ts) => ts.length);
  const lette: TabellaLetta[] = [];
  for (let i = 0; i < nomi; i++) {
    const t = tabelle.nth(i);
    const nome = (await t.getAttribute("aria-label")) ?? (await t.locator("caption").innerText());
    const righe = await t.locator("tbody tr").evaluateAll((rs) =>
      rs.map((r) => {
        const celle = [...r.children] as HTMLElement[];
        return {
          celle: celle.map((c) => (c.hasAttribute("data-nessuno") ? "" : (c.textContent ?? ""))),
          nessuno: celle.map((c) => c.hasAttribute("data-nessuno")),
        };
      }),
    );
    lette.push({ nome, righe });
  }
  return lette;
}

// --------------------------------------------------------------------------------- l'appaiamento

/** I testi attesi di una riga, nell'ordine delle colonne; un attributo assente è la stringa vuota. */
const attese = (r: RigaDelDato) => [r.nome, r.tipo, r.natura, r.iniziale ?? "", r.ruolo ?? ""];

function appaia(lette: TabellaLetta[], testi: Dizionario) {
  const difetti: string[] = [];
  let [tabelle, dati, righe, appaiati, assenti] = [0, 0, 0, 0, 0];
  const attesi = progetti.flatMap((p) => [
    ...(p.costantiComuni.length > 0 ? [{ nome: `${testi.costantiComuni}: ${p.nome}`, dati: p.costantiComuni }] : []),
    { nome: `${testi.dati}: ${p.nome}`, dati: p.funzione.data },
  ]);
  // Tabelle nei due versi.
  for (const t of lette) if (!attesi.some((a) => a.nome === t.nome)) difetti.push(`tabella senza dati nel modello: ${t.nome}`);
  for (const a of attesi) {
    tabelle++;
    const t = lette.find((l) => l.nome === a.nome);
    if (!t) {
      difetti.push(`dati senza tabella: ${a.nome}`);
      continue;
    }
    righe += t.righe.length;
    // Righe nei due versi, per nome; poi attributo per attributo.
    for (const r of t.righe)
      if (!a.dati.some((d) => d.name === r.celle[0])) difetti.push(`${a.nome}: riga senza dato «${r.celle[0]}»`);
    for (const d of a.dati) {
      dati++;
      const trovate = t.righe.filter((r) => r.celle[0] === d.name);
      if (trovate.length !== 1) {
        difetti.push(`${a.nome}: dato «${d.name}» con ${trovate.length} righe`);
        continue;
      }
      appaiati++;
      // Il valore iniziale come lo scrive il nucleo, col modo predefinito del valore ripetuto (l'elenco).
      const voluta = attese(rigaDelDato(d, testi, "elenco", testiDelDisegno(testi === en ? "en" : "it")));
      const vista = trovate[0]!;
      assenti += voluta.filter((v) => v === "").length;
      if (JSON.stringify(vista.celle) !== JSON.stringify(voluta)) difetti.push(`${a.nome}: «${d.name}» mostra ${JSON.stringify(vista.celle)}, il modello ${JSON.stringify(voluta)}`);
      if (JSON.stringify(vista.nessuno) !== JSON.stringify(voluta.map((v) => v === ""))) difetti.push(`${a.nome}: «${d.name}» trattini fuori posto`);
    }
  }
  return { difetti, premesse: { tabelle, lette: lette.length, dati, righe, appaiati, assenti } };
}

/** Nelle colonne tipo, natura e ruolo dell'italiano, le parole inglesi del file. */
const paroleDelFile = new RegExp(`\\b(${[...tipi, "input_output", "constant", "variable", "array"].join("|")})\\b`);
const inglesi = (lette: TabellaLetta[]) =>
  lette.flatMap((t) => t.righe.flatMap((r) => [r.celle[1], r.celle[2], r.celle[4]].filter((c) => c !== undefined && paroleDelFile.test(c)).map((c) => `${t.nome}, ${r.celle[0]}: «${c}»`)));

// ------------------------------------------------------------------------------------- le prove

test("ogni dato del modello ha la sua riga e ogni riga il suo dato, in italiano e in inglese", async ({ page }, info) => {
  // Limite dichiarato: 12 s da sola in WebKit, circa 30 nel collaudo coi quattro progetti in parallelo.
  test.setTimeout(90_000);
  await apri(
    page,
    { lingua: "it" },
    progetti.map((p) => ({ nome: p.nome, funzione: p.funzione, costantiComuni: p.costantiComuni })),
  );
  await expect(page.getByRole("table", { name: `${it.dati}: dati-di-ogni-forma`, exact: true })).toBeVisible();

  for (const [lingua, testi] of [["it", it], ["en", en]] as const) {
    if (lingua === "en") {
      await scegliLingua(page, "en");
      await expect(page.getByRole("table", { name: `${en.dati}: dati-di-ogni-forma`, exact: true })).toBeVisible();
    }
    const lette = await leggi(page);
    const { difetti, premesse } = appaia(lette, testi);
    const parole = lingua === "it" ? inglesi(lette) : [];
    console.log(
      `[${info.project.name}] dati ${lingua}: progetti ${progetti.length} (corpus ${corpus.length}), tabelle ${premesse.tabelle} attese e ${premesse.lette} lette, ` +
        `dati ${premesse.dati}, righe ${premesse.righe}, appaiati ${premesse.appaiati}, attributi assenti ${premesse.assenti}; difetti ${difetti.length}` +
        (lingua === "it" ? `; parole del file in italiano ${parole.length}` : ""),
    );
    expect(difetti.slice(0, 10)).toEqual([]);
    expect(parole).toEqual([]);
    // Le premesse: tutte le tabelle, tutti i dati appaiati, le costanti e la tabella delle costanti comuni.
    // I file della tappa 1, misurati dal disco da `strumenti/corpus.ts` (i conteggi confermati del corpus).
    expect(corpus.length).toBe(misuraIlCorpus().file["tappa-1"]!);
    expect(corpus.length).toBeGreaterThan(0);
    expect(premesse.lette).toBe(premesse.tabelle);
    expect(premesse.tabelle).toBe(progetti.length + 1);
    expect(premesse.appaiati).toBe(premesse.dati);
    expect(premesse.righe).toBe(premesse.dati);
    expect(premesse.dati).toBeGreaterThan(progetti.length);
    // Il trattino si legge «nessuno»: tante celle con quel nome quanti gli attributi assenti.
    await expect(page.getByRole("cell", { name: testi.datiNessuno, exact: true })).toHaveCount(premesse.assenti);
  }

  // Controllo positivo 1: una riga tolta dalla vista.
  await page.getByRole("table", { name: `${en.dati}: riferimento-media-voti`, exact: true }).locator("tbody tr").first().evaluate((r) => r.remove());
  const senzaRiga = appaia(await leggi(page), en);
  console.log(`[${info.project.name}] dati, controllo positivo (una riga tolta): difetti ${senzaRiga.difetti.length}`);
  expect(senzaRiga.difetti.some((d) => d.includes("riferimento-media-voti") && d.includes("«n» con 0 righe"))).toBe(true);

  // Controllo positivo 2: in italiano, un tipo riscritto con la parola del file. La pagina si ricarica
  // (torna in italiano), perché React non ridisegni un albero che la prova ha alterato.
  await page.reload();
  await expect(page.getByRole("table", { name: `${it.dati}: dati-di-ogni-forma`, exact: true })).toBeVisible();
  const tipo = page.getByRole("table", { name: `${it.dati}: dati-di-ogni-forma`, exact: true }).locator("tbody tr").first().locator("td").first();
  await tipo.evaluate((c) => (c.textContent = "integer"));
  const riscritti = inglesi(await leggi(page));
  console.log(`[${info.project.name}] dati, controllo positivo (tipo con la parola del file): ${riscritti.length}`);
  expect(riscritti).toEqual(["Dati: dati-di-ogni-forma, voti: «integer»"]);
});

test("nella finestra i dati del riferimento si trovano per ruolo e nome accanto al flowchart", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const tabella = page.getByRole("table", { name: `${it.dati}: riferimento-media-voti`, exact: true });
  await expect(tabella).toBeVisible();
  await expect(tabella.locator("tbody tr")).toHaveCount(8);
  await expect(page.getByRole("group", { name: `${it.flowchart}: riferimento-media-voti`, exact: true })).toBeVisible();
  // Affiancati: la tabella a sinistra della vista del flowchart.
  const [t, f] = [await tabella.boundingBox(), await page.getByRole("region", { name: it.vistaFlowchart, exact: true }).boundingBox()];
  expect(t!.x + t!.width).toBeLessThanOrEqual(f!.x);
  await scegliLingua(page, "en");
  await expect(page.getByRole("table", { name: `${en.dati}: riferimento-media-voti`, exact: true })).toBeVisible();
});
