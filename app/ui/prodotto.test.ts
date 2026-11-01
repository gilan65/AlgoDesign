// La versione del prodotto ha una fonte sola, `package.json`, e ogni copia deve dire lo stesso numero:
// - la configurazione di Tauri, che la legge da `package.json` (e la scrive nelle proprietà dell'eseguibile), o che
//   porterebbe un numero suo;
// - `shell/Cargo.toml`, che non sa leggerla da altrove e ne tiene una copia, e `shell/Cargo.lock`, che Cargo riscrive
//   da `Cargo.toml` al primo comando (un lock vecchio nel commit della release fa cambiare l'albero durante il build);
// - la finestra «Informazioni su AlgoDesign», nelle due lingue, con la data della versione;
// - i nomi del pacchetto della release (la cartella in `dist/`, lo zip e la cartella dentro lo zip), che lo strumento
//   del pacchetto ricava da `package.json` con `nomiDelPacchetto`.
// Controllo positivo: una versione alterata in ognuna delle copie, una alla volta, esce rossa col nome del file; per i
// nomi del pacchetto, un nome con una versione sua esce rosso.
//
// Le altre prove: il nome dell'app, uguale nei punti dove è scritto; i nomi dei file delle licenze nella finestra,
// appaiati con l'elenco del pacchetto; il copyright, uguale nel LICENSE, nella configurazione di Tauri (le proprietà
// dell'eseguibile) e nella finestra; il testo della politica di sicurezza dei contenuti, direttiva per direttiva.
//
// CHE COSA NON GUARDA:
// - le proprietà dell'eseguibile costruito: le confronta con `package.json` e `tauri.conf.json` lo strumento del
//   pacchetto, quando lo compone (rosso se diverse), non qui;
// - che la data della versione sia quella vera del rilascio: si cambia a mano, insieme alla versione.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { nomeApplicazione } from "../core/applicazione";
import { FinestraInformazioni } from "./finestre/FinestraInformazioni";
import { elencoDelloStrumento, elencoDelPacchetto, elencoDiLinux, guidaAdAccademico, guidaDelloStrumento, nomiDelloStrumento, nomiDelPacchetto } from "../strumenti/elenco-del-pacchetto";
import { politicaDelProdotto } from "../strumenti/politica";
import { dataConPreposizione, dataDellaVersione, dataMostrata, versione, versioneDiProva } from "./prodotto";

const app = join(import.meta.dir, "..");
const leggi = (percorso: string) => readFileSync(join(app, percorso), "utf8");

/** I file della versione, come stanno sul disco. */
const file = (): Record<string, string> => ({
  "package.json": leggi("package.json"),
  "shell/tauri.conf.json": leggi("shell/tauri.conf.json"),
  "shell/Cargo.toml": leggi("shell/Cargo.toml"),
  "shell/Cargo.lock": leggi("shell/Cargo.lock"),
});

/** La versione di ogni copia, letta dai testi dati (la configurazione di Tauri che rimanda a un `package.json` si
 * risolve sui testi dati, non sul disco); `null` se il file non la dice. I nomi del pacchetto vengono da `nomi`
 * applicata al `package.json` dato. */
function copie(testi: Record<string, string>, nomi = nomiDelPacchetto): Record<string, string | null> {
  const pacchetto = JSON.parse(testi["package.json"]!).version ?? null;
  const tauri: unknown = JSON.parse(testi["shell/tauri.conf.json"]!).version;
  const rimandoDiTauri = typeof tauri === "string" && tauri.endsWith("package.json") ? join(dirname("shell/tauri.conf.json"), tauri).replaceAll("\\", "/") : null;
  const n = nomi(testi["package.json"]!);
  return {
    "package.json": pacchetto,
    "shell/tauri.conf.json": rimandoDiTauri !== null ? (JSON.parse(testi[rimandoDiTauri] ?? "{}").version ?? null) : typeof tauri === "string" ? tauri : null,
    "shell/Cargo.toml": /^version = "([^"]+)"$/m.exec(testi["shell/Cargo.toml"]!)?.[1] ?? null,
    "shell/Cargo.lock": /^name = "algodesign"\r?\nversion = "([^"]+)"$/m.exec(testi["shell/Cargo.lock"]!)?.[1] ?? null,
    "cartella del pacchetto": n.cartella,
    "zip del pacchetto": /^AlgoDesign-(.+)-windows-x64\.zip$/.exec(n.zip)?.[1] ?? null,
    "cartella nello zip": /^AlgoDesign-(.+)$/.exec(n.cartellaNelloZip)?.[1] ?? null,
  };
}

/** Le copie che non dicono la versione della fonte. */
const discordi = (c: Record<string, string | null>) => Object.entries(c).filter(([, v]) => v !== c["package.json"] || v === null).map(([f, v]) => `${f}: ${v}`);

test("la versione è la stessa in package.json, nella configurazione di Tauri, in Cargo.toml e nei nomi del pacchetto; alterata in una copia, la prova lo dice", () => {
  const c = copie(file());
  console.log(`versione: ${JSON.stringify(c)}`);
  expect(discordi(c)).toEqual([]);
  expect(c["package.json"]).toBe(versione);
  // La configurazione di Tauri non ha un numero suo: lo legge dalla fonte.
  expect(JSON.parse(file()["shell/tauri.conf.json"]!).version).toBe("../package.json");

  // Controlli positivi: una versione alterata in ogni copia, una alla volta.
  const altrove = "9.9.9-prova";
  const alterati: Record<string, (t: string) => string> = {
    "package.json": (t) => t.replace(/"version": "[^"]+"/, `"version": "${altrove}"`),
    "shell/tauri.conf.json": (t) => t.replace(/"version": "[^"]+"/, `"version": "${altrove}"`),
    "shell/Cargo.toml": (t) => t.replace(/^version = "[^"]+"$/m, `version = "${altrove}"`),
    "shell/Cargo.lock": (t) => t.replace(/^(name = "algodesign"\r?\nversion = )"[^"]+"$/m, `$1"${altrove}"`),
  };
  const colti = Object.entries(alterati).map(([f, altera]) => {
    const testi = file();
    testi[f] = altera(testi[f]!);
    return discordi(copie(testi));
  });
  // Alterata la fonte, la configurazione di Tauri e i nomi del pacchetto la seguono: discordano Cargo.toml e il lock.
  expect(colti).toEqual([
    [`shell/Cargo.toml: ${versione}`, `shell/Cargo.lock: ${versione}`],
    [`shell/tauri.conf.json: ${altrove}`],
    [`shell/Cargo.toml: ${altrove}`],
    [`shell/Cargo.lock: ${altrove}`],
  ]);
  // Nomi del pacchetto con una versione loro, non quella della fonte: discordano tutti e tre.
  const nomiAltrove = (t: string) => ({ ...nomiDelPacchetto(t), cartella: altrove, zip: `AlgoDesign-${altrove}-windows-x64.zip`, cartellaNelloZip: `AlgoDesign-${altrove}` });
  expect(discordi(copie(file(), nomiAltrove))).toEqual([`cartella del pacchetto: ${altrove}`, `zip del pacchetto: ${altrove}`, `cartella nello zip: ${altrove}`]);
});

test("i nomi del pacchetto dello strumento seguono la versione; l'eseguibile ha i tre numeri e uno zero", () => {
  const s = nomiDelloStrumento(file()["package.json"]!);
  expect(s).toEqual({
    versione,
    versioneDellEseguibile: `${/^\d+\.\d+\.\d+/.exec(versione)![0]}.0`,
    cartella: `${versione}-tools`,
    zip: `AlgoDesign-Tools-${versione}-windows.zip`,
    cartellaNelloZip: `AlgoDesign-Tools-${versione}`,
  });
  // Controllo positivo: un'altra versione cambia tutti i nomi; una definitiva ha la stessa versione dell'eseguibile.
  const conVersione = (v: string) => nomiDelloStrumento(JSON.stringify({ version: v }));
  expect(conVersione("9.9.9-prova")).toEqual({ versione: "9.9.9-prova", versioneDellEseguibile: "9.9.9.0", cartella: "9.9.9-prova-tools", zip: "AlgoDesign-Tools-9.9.9-prova-windows.zip", cartellaNelloZip: "AlgoDesign-Tools-9.9.9-prova" });
  expect(conVersione("1.0.0").versioneDellEseguibile).toBe("1.0.0.0");
  // La guida ad «Accademico» e quella dello strumento stanno in ogni pacchetto, e quello dello strumento ha le licenze come quello dell'app.
  for (const g of [guidaAdAccademico, guidaDelloStrumento]) for (const elenco of [elencoDelPacchetto, elencoDelloStrumento, elencoDiLinux]) expect(elenco).toContain(g);
  expect(elencoDelloStrumento.filter((v) => v.startsWith("LICEN")).sort()).toEqual(elencoDelPacchetto.filter((v) => v.startsWith("LICEN")).sort());
});

/** Il nome dell'app in ogni punto dove è scritto, letto dai testi dati; `null` se il punto non lo dice. */
function nomi(testi: Record<string, string>): Record<string, string | null> {
  const conf = JSON.parse(testi["shell/tauri.conf.json"]!) as { productName?: string; bundle?: { publisher?: string } };
  return {
    "core/applicazione.ts": /^export const nomeApplicazione = "([^"]+)";$/m.exec(testi["core/applicazione.ts"]!)?.[1] ?? null,
    "index.html": /<title>([^<]+)<\/title>/.exec(testi["index.html"]!)?.[1] ?? null,
    "shell/src/main.rs": /\.title\("([^"]+)"\)/.exec(testi["shell/src/main.rs"]!)?.[1] ?? null,
    "shell/tauri.conf.json productName": conf.productName ?? null,
    "shell/tauri.conf.json publisher": conf.bundle?.publisher ?? null,
  };
}

test("il nome dell'app è lo stesso nel nucleo, nella pagina, nella finestra del guscio e nella configurazione di Tauri; cambiato in un punto, la prova lo dice", () => {
  const testi = () => ({
    "core/applicazione.ts": leggi("core/applicazione.ts"),
    "index.html": leggi("index.html"),
    "shell/src/main.rs": leggi("shell/src/main.rs"),
    "shell/tauri.conf.json": leggi("shell/tauri.conf.json"),
  });
  const discordanti = (n: Record<string, string | null>) => Object.entries(n).filter(([, v]) => v !== nomeApplicazione || v === null).map(([p, v]) => `${p}: ${v}`);
  const n = nomi(testi());
  console.log(`nome dell'app: ${JSON.stringify(n)}`);
  expect(discordanti(n)).toEqual([]);
  // Controllo positivo: il nome cambiato in ogni punto, uno alla volta, esce col nome del punto.
  const altrove = "AltroNome";
  const alterati: [string, string, (t: string) => string][] = [
    ["core/applicazione.ts", "core/applicazione.ts", (t) => t.replace(/nomeApplicazione = "[^"]+"/, `nomeApplicazione = "${altrove}"`)],
    ["index.html", "index.html", (t) => t.replace(/<title>[^<]+<\/title>/, `<title>${altrove}</title>`)],
    ["shell/src/main.rs", "shell/src/main.rs", (t) => t.replace(/\.title\("[^"]+"\)/, `.title("${altrove}")`)],
    ["shell/tauri.conf.json", "shell/tauri.conf.json productName", (t) => t.replace(/"productName": "[^"]+"/, `"productName": "${altrove}"`)],
    ["shell/tauri.conf.json", "shell/tauri.conf.json publisher", (t) => t.replace(/"publisher": "[^"]+"/, `"publisher": "${altrove}"`)],
  ];
  for (const [file, punto, altera] of alterati) {
    const t: Record<string, string> = testi();
    t[file] = altera(t[file]!);
    expect(discordanti(nomi(t))).toEqual([`${punto}: ${altrove}`]);
  }
});

test("i file delle licenze che la finestra nomina sono quelli del pacchetto, e il copyright è uno in quattro posti", () => {
  // I nomi in maiuscolo col trattino, con l'estensione se c'è (LICENSE, LICENSE-DOCS, LICENZE-DI-TERZE-PARTI.txt), nei
  // due testi della finestra, appaiati nei due versi con le voci del pacchetto che sono licenze.
  const nomina = (t: string) => [...new Set(t.match(/\bLICEN[A-Z-]*(\.txt)?\b/g) ?? [])].sort();
  const licenze = elencoDelPacchetto.filter((v) => v.startsWith("LICEN")).sort();
  for (const testi of [it, en]) expect(nomina(`${testi.informazioniFile} ${testi.informazioniDocumenti}`)).toEqual(licenze);
  expect(licenze.length).toBe(3);
  // Controllo positivo: un nome cambiato in un testo solo esce dall'appaiamento.
  const alterato = nomina(`${it.informazioniFile.replace("LICENZE-DI-TERZE-PARTI.txt", "LICENZE-DI-TERZE-PARTI")} ${it.informazioniDocumenti}`);
  expect(alterato).toEqual(["LICENSE", "LICENSE-DOCS", "LICENZE-DI-TERZE-PARTI"]);
  expect(alterato).not.toEqual(licenze);

  // Il copyright: nel LICENSE, nelle proprietà dell'eseguibile (tauri.conf.json) e nella finestra, nelle due lingue.
  const nelLicense = /^Copyright \(c\) (\d{4}) (.+)$/m.exec(readFileSync(join(app, "..", "LICENSE"), "utf8"));
  const conf = JSON.parse(file()["shell/tauri.conf.json"]!) as { bundle: { publisher: string; copyright: string } };
  expect(nelLicense).not.toBeNull();
  const copyright = `© ${nelLicense![1]} ${nelLicense![2]}`;
  expect(conf.bundle.copyright).toBe(copyright);
  for (const testi of [it, en]) expect(testi.informazioniLicenza.endsWith(` · ${copyright}`)).toBe(true);
  // La società nelle proprietà è il nome del prodotto: non c'è una società.
  expect(conf.bundle.publisher).toBe("AlgoDesign");
});

test("la politica di sicurezza dei contenuti è quella scritta qui, direttiva per direttiva", () => {
  // Scritta a mano: una direttiva allargata (`'unsafe-inline'`, `'unsafe-eval'`, un indirizzo in più) cambia il testo, e
  // nessuna prova nei motori o sul prodotto la vedrebbe (provano lo stile in linea, non le altre direttive).
  // Le direttive per sorgente, nell'ordine della politica: prima quelle della pagina stessa, poi i comandi del guscio,
  // poi quelle chiuse. Le immagini anche da `blob:`: il PNG del flowchart esportato è l'SVG del nucleo in un'immagine
  // fatta nella pagina (`ui/disegno/esporta.ts`); le immagini `data:` e da fuori restano fermate (le sonde).
  const dallaPagina = ["default-src", "script-src", "style-src", "img-src", "font-src"];
  const chiuse = ["object-src", "base-uri", "form-action"];
  const attese = [...dallaPagina.map((d) => (d === "img-src" ? `${d} 'self' blob:` : `${d} 'self'`)), "connect-src ipc: http://ipc.localhost", ...chiuse.map((d) => `${d} 'none'`)];
  expect(politicaDelProdotto().split("; ")).toEqual(attese);
});

test("il registro delle modifiche comincia dalla versione dei file e dalla sua data; i due README dicono la stessa versione e la stessa data", () => {
  // Il pacchetto controlla solo che la voce della versione ci sia, con una data qualsiasi: una data cambiata in
  // `package.json` e non nel registro o in un README (la release che slitta) uscirebbe con due date diverse.
  const radice = dirname(app);
  const registro = readFileSync(join(radice, "CHANGELOG.md"), "utf8");
  const prima = registro.split("\n").find((r) => r.startsWith("## "));
  expect(prima).toBe(`## ${versione}, ${dataMostrata(dataDellaVersione, "it")}`);
  const readme = [
    { nome: "README.md", riga: `Version ${versione} of ${dataMostrata(dataDellaVersione, "en")},` },
    { nome: "LEGGIMI.md", riga: `Versione ${versione} ${dataConPreposizione(dataDellaVersione, "it")},` },
  ];
  expect(readme.map((r) => [r.nome, readFileSync(join(radice, r.nome), "utf8").includes(r.riga)])).toEqual(readme.map((r) => [r.nome, true]));
  // Il nome dello zip dello strumento nei due README è quello della versione (un nome dimenticato alla
  // release dopo rimanderebbe a uno zip che non c'è): ogni nome scritto, e almeno uno.
  const zipDelloStrumento = (t: string) => [...t.matchAll(/AlgoDesign-Tools-[^\s`]*-windows\.zip/g)].map((m) => m[0]);
  const zip = nomiDelloStrumento(file()["package.json"]!).zip;
  expect(readme.map((r) => [r.nome, zipDelloStrumento(readFileSync(join(radice, r.nome), "utf8"))])).toEqual(readme.map((r) => [r.nome, [zip]]));
  // Lo stesso nelle due guide che lo nominano: il pacchetto le pretende, e qui si vede senza comporlo.
  const guide = [guidaAdAccademico, guidaDelloStrumento].map((g) => join("docs", g));
  expect(guide.map((g) => [g, zipDelloStrumento(readFileSync(join(radice, g), "utf8"))])).toEqual(guide.map((g) => [g, [zip]]));
  // Controllo positivo del rilevatore: un nome con un'altra versione si vede.
  expect(zipDelloStrumento("vedi `AlgoDesign-Tools-0.5.0-beta.1-windows.zip`.")).toEqual(["AlgoDesign-Tools-0.5.0-beta.1-windows.zip"]);
});

test("la data della versione è una data vera, e si legge nelle due lingue", () => {
  expect(dataDellaVersione.split("-").map((parte) => parte.length)).toEqual([4, 2, 2]);
  expect(new Date(`${dataDellaVersione}T00:00:00Z`).toISOString().slice(0, 10)).toBe(dataDellaVersione);
  // Il primo e l'ultimo giorno dell'anno: nessuno spostamento di fuso. `bun test` gira col fuso UTC, dove una data letta
  // nel fuso dell'orologio non si sposta: la prova si rifà col fuso di Roma, dove la mezzanotte è il giorno prima in UTC.
  const fuso = process.env.TZ;
  try {
    for (const tz of ["Etc/UTC", "Europe/Rome"]) {
      process.env.TZ = tz;
      // Controllo della premessa: il fuso è davvero cambiato.
      expect(new Date("2026-10-20T00:00:00").getTimezoneOffset()).toBe(tz === "Europe/Rome" ? -120 : 0);
      expect([dataMostrata("2026-10-20", "it"), dataMostrata("2026-10-20", "en"), dataMostrata("2027-01-01", "it"), dataMostrata("2026-12-31", "en")]).toEqual([
        "20 ottobre 2026",
        "20 October 2026",
        "1 gennaio 2027",
        "31 December 2026",
      ]);
    }
  } finally {
    if (fuso === undefined) delete process.env.TZ;
    else process.env.TZ = fuso;
  }
});

test("in italiano la data dopo «Versione» vuole «dell'» davanti a 1, 8 e 11 e «del» davanti agli altri giorni; in inglese è la data sola", () => {
  const giorni = Array.from({ length: 31 }, (_, i) => i + 1);
  const conLElisione = giorni.filter((g) => dataConPreposizione(`2026-10-${String(g).padStart(2, "0")}`, "it").startsWith("dell'"));
  expect(conLElisione).toEqual([1, 8, 11]);
  expect(giorni.filter((g) => dataConPreposizione(`2026-10-${String(g).padStart(2, "0")}`, "it").startsWith("del "))).toHaveLength(28);
  expect(dataConPreposizione("2026-11-01", "it")).toBe("dell'1 novembre 2026");
  expect(dataConPreposizione("2026-10-20", "it")).toBe("del 20 ottobre 2026");
  expect(dataConPreposizione("2026-11-01", "en")).toBe("1 November 2026");
  expect(riempi(it.informazioniVersione, { versione: "0.7.0-beta.3", data: dataConPreposizione("2026-11-01", "it") })).toBe("Versione 0.7.0-beta.3 dell'1 novembre 2026");
});

test("nei testi del pacchetto la data è scritta solo con i segnaposto che la dicono giusta: {{delData}} in italiano, {{date}} in inglese", () => {
  const cartella = join(dirname(app), "rilascio");
  const testi = readdirSync(cartella, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".md"));
  const nomi = (t: string) => [...t.matchAll(/\{\{([^{}]*)\}\}/g)].map((m) => m[1]!);
  const usati = new Set(testi.flatMap((f) => nomi(readFileSync(join(cartella, f), "utf8"))));
  expect([...usati].sort()).toEqual(["date", "delData", "versione"]);
  // Il solo testo inglese che dice la data ha {{date}}, gli italiani {{delData}}: i testi di ciascuno, con la cardinalità nel confronto.
  const conLaData = (n: string) => testi.filter((f) => nomi(readFileSync(join(cartella, f), "utf8")).includes(n)).map((f) => f.replaceAll("\\", "/")).sort();
  expect(conLaData("date")).toEqual(["windows/README-OF-ALGODESIGN-TOOLS.md"]);
  expect(conLaData("delData")).toEqual(["linux/ALGODESIGN-PER-LINUX.md", "linux/NOTE-DI-RILASCIO.md", "windows/LEGGIMI-DI-ALGODESIGN-TOOLS.md", "windows/NOTE-DI-RILASCIO.md"]);
  // Controllo positivo del rilevatore: un segnaposto vecchio si vede.
  expect(nomi("Versione del {{data}}.")).toEqual(["data"]);
});

test("la finestra delle informazioni mostra la versione dei file e la sua data, nelle due lingue", async () => {
  const fonte = JSON.parse(file()["package.json"]!) as { version: string; dataDiRilascio: string };
  for (const [lingua, testi] of [
    ["it", it],
    ["en", en],
  ] as const) {
    const r = await act(async () => render(createElement(FinestraInformazioni, { aperta: true, testi, lingua, chiudi: () => undefined })));
    const finestra = document.querySelector('[role="dialog"]');
    expect(finestra?.querySelector("[data-versione]")?.textContent).toBe(riempi(testi.informazioniVersione, { versione: fonte.version, data: dataConPreposizione(fonte.dataDiRilascio, lingua) }));
    for (const t of [testi.informazioniTitolo, testi.informazioniLicenza, testi.informazioniFile, testi.informazioniDocumenti]) expect(finestra?.textContent).toContain(t);
    // La frase della versione beta c'è se e solo se la versione dei file ha un suffisso.
    expect(finestra?.textContent?.includes(testi.informazioniProva)).toBe(versioneDiProva(fonte.version));
    r.unmount();
  }
});

test("il motto dei due README è quello dei dizionari, e la frase della versione la dice beta", () => {
  expect(readFileSync(join(dirname(app), "LEGGIMI.md"), "utf8")).toContain(`**${it.informazioniMotto}**`);
  expect(readFileSync(join(dirname(app), "README.md"), "utf8")).toContain(`**${en.informazioniMotto}**`);
  expect(it.informazioniProva).toContain("versione beta");
  expect(en.informazioniProva).toContain("beta version");
});

test("una versione è di prova se e solo se ha un suffisso dopo i tre numeri", () => {
  expect(["0.4.0-alpha.4", "0.5.0-beta.1", "1.0.0-rc.1"].map(versioneDiProva)).toEqual([true, true, true]);
  // Controllo positivo: le versioni definitive non lo sono.
  expect(["1.0.0", "1.2.10"].map(versioneDiProva)).toEqual([false, false]);
});
