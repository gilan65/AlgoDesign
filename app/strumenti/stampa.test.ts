// Lo strumento `algodesign-tools` e il suo comando `stampa` come processo, in una cartella temporanea: gli esiti (0, 1 senza
// scrivere nulla, 2 col modo d'uso), i nomi dei file, l'ordine delle colonne, la lingua. E i linguaggi letti dal registro: uno
// in più entra senza toccare lo strumento.
//
// Che cosa NON guarda: l'impaginazione sul corpus (`colonne.test.ts`, `e2e/pagina-affiancata.e2e.ts`); l'eseguibile a sé (le
// clausole STRUMENTO di `pacchetto.ts`).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { controlla, tetti } from "../core/controllo/controllo";
import { linguaggi } from "../core/genera/linguaggi";
import { apri } from "../core/progetto/formato";
import { testiDeiCodici } from "../i18n/codici";
import { codiceDi } from "../ui/genera/codice";
import { nomeDellaPagina, paginaDelProgetto, scegliColonne } from "./stampa";

const app = join(import.meta.dir, "..");
/** Le uscite del comando: 1 si ferma senza scrivere, 2 un'opzione sbagliata, col modo d'uso. */
const FERMO = 1;
const MODO_D_USO = 2;
let cartella = "";
beforeAll(() => {
  cartella = mkdtempSync(join(tmpdir(), "strumento stampa "));
});
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

function lancia(...argomenti: string[]): { esito: number; righe: string[] } {
  const r = Bun.spawnSync(["bun", "./strumenti/algodesign-tools.ts", ...argomenti], { cwd: app, stdout: "pipe", stderr: "pipe" });
  return { esito: r.exitCode ?? -1, righe: `${r.stdout}${r.stderr}`.trim().split(/\r?\n/) };
}
/** Una cartella nuova con la copia di un progetto del corpus. */
let contatore = 0;
function copia(caso: string, nome = "esercizio.algo"): { dove: string; file: string } {
  const dove = join(cartella, `prova ${++contatore}`);
  mkdirSync(dove);
  const file = join(dove, nome);
  copyFileSync(join(app, "casi", `${caso}.algo`), file);
  return { dove, file };
}
const titoli = (pagina: string) => [...pagina.matchAll(/data-titolo="\d">([^<]*)</g)].slice(0, 2).map((m) => m[1]);
const senzaIlProgetto = (dove: string) => readdirSync(dove).filter((f) => !f.endsWith(".algo"));

test("senza opzioni: TypeScript e JavaScript e la pagina di prova accanto al progetto; rilanciato, sostituisce e lo dice", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  const atteso = join(dove, "esercizio (TypeScript e JavaScript).html");
  const prova = join(dove, "esercizio (prova).html");
  expect(lancia("stampa", file)).toEqual({ esito: 0, righe: [`SCRITTO ${atteso}`, `SCRITTO ${prova}`] });
  expect(titoli(readFileSync(atteso, "utf8"))).toEqual(["TypeScript", "JavaScript"]);
  expect(readFileSync(prova, "utf8")).toContain('<textarea id="input"');
  writeFileSync(atteso, "vecchio");
  writeFileSync(prova, "vecchio");
  expect(lancia("stampa", file)).toEqual({ esito: 0, righe: [`SOSTITUITO ${atteso}`, `SOSTITUITO ${prova}`] });
  expect(readFileSync(atteso, "utf8")).toStartWith("<!doctype html>");
  expect(readFileSync(prova, "utf8")).toStartWith("<!doctype html>");
});

test("la pagina di prova col suo nome in inglese; con --linguaggi non c'è, e l'aiuto lo dice", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  expect(lancia("stampa", file, "--lingua", "en").righe).toEqual([`SCRITTO ${join(dove, "esercizio (TypeScript and JavaScript).html")}`, `SCRITTO ${join(dove, "esercizio (test).html")}`]);
  const altra = copia("tappa-3/tre-livelli");
  expect(lancia("stampa", altra.file, "--linguaggi", "python", "c").righe).toEqual([`SCRITTO ${join(altra.dove, "esercizio (Python e C).html")}`]);
  expect(senzaIlProgetto(altra.dove)).toEqual(["esercizio (Python e C).html"]);
  expect(lancia("stampa", "-h").righe.join(" ")).toContain("Senza --linguaggi scrive anche la pagina di prova");
});

test("il secondo file che non si scrive: esce 1, e il primo torna com'era, o non c'è", () => {
  // Una cartella col nome della pagina di prova: la scrittura fallisce davvero, sul solo secondo file.
  const { dove, file } = copia("tappa-3/tre-livelli");
  const prima = join(dove, "esercizio (TypeScript e JavaScript).html");
  const prova = join(dove, "esercizio (prova).html");
  mkdirSync(prova);
  const r = lancia("stampa", file);
  expect(r.esito).toBe(FERMO);
  expect(r.righe.slice(1)).toEqual([]);
  expect(r.righe[0]).toStartWith(`ERRORE ${prova} non si scrive: `);
  expect(existsSync(prima)).toBe(false);
  writeFileSync(prima, "la pagina di prima");
  expect(lancia("stampa", file).esito).toBe(FERMO);
  expect(readFileSync(prima, "utf8")).toBe("la pagina di prima");
  // Controllo positivo: tolto l'ostacolo, gli stessi due file si scrivono.
  rmSync(prova, { recursive: true });
  expect(lancia("stampa", file).righe).toEqual([`SOSTITUITO ${prima}`, `SCRITTO ${prova}`]);
});

test("--linguaggi: il primo a sinistra; l'ordine cambia il file e le colonne; le maiuscole non contano", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  // Il file che ogni comando dice di aver scritto: se le colonne si scambiassero col nome, i due file da soli non lo direbbero.
  expect(lancia("stampa", file, "--linguaggi", "pseudocodice", "c")).toEqual({ esito: 0, righe: [`SCRITTO ${join(dove, "esercizio (Pseudocodice e C).html")}`] });
  expect(lancia("stampa", file, "--linguaggi", "C", "Pseudocodice")).toEqual({ esito: 0, righe: [`SCRITTO ${join(dove, "esercizio (C e Pseudocodice).html")}`] });
  expect(senzaIlProgetto(dove).sort()).toEqual(["esercizio (C e Pseudocodice).html", "esercizio (Pseudocodice e C).html"]);
  expect(titoli(readFileSync(join(dove, "esercizio (Pseudocodice e C).html"), "utf8"))).toEqual(["Pseudocodice", "C"]);
  expect(titoli(readFileSync(join(dove, "esercizio (C e Pseudocodice).html"), "utf8"))).toEqual(["C", "Pseudocodice"]);
});

test("--lingua en: il codice, i titoli, la pagina e il nome del file; i messaggi in italiano", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  const atteso = join(dove, "esercizio (Pseudocode and C).html");
  expect(lancia("stampa", file, "--linguaggi", "pseudocodice", "c", "--lingua", "en")).toEqual({ esito: 0, righe: [`SCRITTO ${atteso}`] });
  const pagina = readFileSync(atteso, "utf8");
  expect(pagina).toContain('<html lang="en">');
  expect(titoli(pagina)).toEqual(["Pseudocode", "C"]);
  expect(pagina).toContain('"page "');
  expect(pagina).toContain("PROGRAM");
  expect(pagina).not.toContain("PROGRAMMA");
  expect(lancia("stampa", file, "--lingua", "fr").esito).toBe(MODO_D_USO);
});

test("-o scrive nella cartella data; una cartella che non c'è ferma senza scrivere", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  const altrove = join(dove, "altrove");
  mkdirSync(altrove);
  expect(lancia("stampa", file, "-o", altrove)).toEqual({ esito: 0, righe: [`SCRITTO ${join(altrove, "esercizio (TypeScript e JavaScript).html")}`, `SCRITTO ${join(altrove, "esercizio (prova).html")}`] });
  const manca = join(dove, "manca");
  expect(lancia("stampa", file, "-o", manca)).toEqual({ esito: FERMO, righe: [`ERRORE ${manca} non è una cartella`] });
  expect(existsSync(manca)).toBe(false);
});

test("un linguaggio che non c'è, scritto due volte, o la forma senza tipi: esce 2 col modo d'uso e non scrive", () => {
  const { dove, file } = copia("tappa-3/tre-livelli");
  const validi = linguaggi.map((v) => v.id).join(", ");
  const sconosciuto = lancia("stampa", file, "--linguaggi", "cobol", "c");
  expect(sconosciuto.esito).toBe(MODO_D_USO);
  expect(sconosciuto.righe[0]).toBe(`il linguaggio cobol non c'è: sono ${validi}`);
  const doppio = lancia("stampa", file, "--linguaggi", "c", "C");
  expect(doppio.esito).toBe(MODO_D_USO);
  expect(doppio.righe[0]).toBe(`c è scritto due volte: scegli due linguaggi diversi fra ${validi}`);
  for (const js of ["js", "javascript", "JavaScript"]) {
    const r = lancia("stampa", file, "--linguaggi", "python", js);
    expect(r.esito).toBe(MODO_D_USO);
    expect(r.righe[0]).toBe("JavaScript non è un linguaggio a scelta: si affianca al solo TypeScript, con stampa senza --linguaggi");
  }
  expect(lancia("stampa", file, "--linguaggi", "c").esito).toBe(MODO_D_USO);
  expect(lancia("stampa", file, "--linguaggi", "c", "-o", dove).esito).toBe(MODO_D_USO);
  expect(lancia("stampa", file, "--altro").esito).toBe(MODO_D_USO);
  expect(lancia("stampa", file, file).esito).toBe(MODO_D_USO);
  expect(lancia("stampa").esito).toBe(MODO_D_USO);
  expect(senzaIlProgetto(dove)).toEqual([]);
});

test("un progetto con errori statici: esce 1, una riga per errore col codice e il testo breve, senza scrivere, con qualunque coppia", () => {
  const { dove, file } = copia("tipi/campo-sconosciuto");
  const a = apri(readFileSync(file, "utf8"));
  if (!a.ok) throw new Error("non si apre");
  const c = controlla(a.progetto, tetti);
  if (c.fuoriTappa) throw new Error("fuori tappa");
  expect(c.errori.length).toBeGreaterThan(0);
  const attese = [...new Set(c.errori.map((e) => `ERRORE ${file}: errore statico ${e.code}, ${testiDeiCodici.it[e.code as keyof typeof testiDeiCodici.it].breve}`))];
  expect(lancia("stampa", file)).toEqual({ esito: FERMO, righe: attese });
  expect(lancia("stampa", file, "--linguaggi", "pseudocodice", "accademico")).toEqual({ esito: FERMO, righe: attese });
  expect(senzaIlProgetto(dove)).toEqual([]);
});

test("un progetto che non ci sta in «Accademico»: esce 1 col numero di ciò che manca, senza scrivere; con gli altri due linguaggi si scrive", () => {
  const { dove, file } = copia("tappa-3/libreria-dei-voti");
  const a = apri(readFileSync(file, "utf8"));
  if (!a.ok) throw new Error("non si apre");
  const g = codiceDi(a.progetto, tetti, "accademico", "it");
  if (g.generato || g.perche !== "non-ci-sta") throw new Error("ci sta");
  const n = g.mancanze.length;
  expect(n).toBeGreaterThan(1);
  expect(lancia("stampa", file, "--linguaggi", "python", "accademico")).toEqual({ esito: FERMO, righe: [`ERRORE ${file} non ci sta in «Accademico»: mancano ${n} cose (l'elenco è nell'app, nella linguetta «Accademico»)`] });
  expect(senzaIlProgetto(dove)).toEqual([]);
  expect(lancia("stampa", file, "--linguaggi", "python", "c").esito).toBe(0);
});

test("un file che non si legge o non è valido: esce 1 col messaggio", () => {
  const dove = join(cartella, "non validi");
  mkdirSync(dove);
  const rotto = join(dove, "rotto.algo");
  writeFileSync(rotto, "non è un progetto");
  expect(lancia("stampa", rotto)).toEqual({ esito: FERMO, righe: [`ERRORE ${rotto} non è un file di AlgoDesign valido`] });
  const manca = join(dove, "manca.algo");
  const r = lancia("stampa", manca);
  expect(r.esito).toBe(FERMO);
  expect(r.righe[0]).toStartWith(`ERRORE ${manca} non si legge: `);
});

test("l'aiuto del comando elenca ogni linguaggio del registro; lo strumento senza comando o con uno che non c'è esce 2, con un consiglio a chi scrive subito il testo", () => {
  const aiuto = lancia("stampa", "-h");
  expect(aiuto.esito).toBe(0);
  const riga = aiuto.righe.find((r) => r.includes("(senza: TypeScript e JavaScript)"))!;
  expect(riga.trim().replace(" (senza: TypeScript e JavaScript)", "").split(", ")).toEqual(linguaggi.map((v) => v.id));
  const generale = lancia("-h");
  expect(generale.esito).toBe(0);
  expect(generale.righe.filter((r) => /^ +bun run tools (accademico|stampa) </.test(r)).map((r) => r.trim().split(" ")[3])).toEqual(["accademico", "stampa"]);
  expect(lancia().esito).toBe(MODO_D_USO);
  const altro = lancia("prova");
  expect(altro.esito).toBe(MODO_D_USO);
  expect(altro.righe[0]).toBe("il comando prova non c'è");
  const testo = lancia("programma.txt");
  expect(testo.esito).toBe(MODO_D_USO);
  expect(testo.righe[0]).toBe("il comando programma.txt non c'è: per leggere un testo scrivi bun run tools accademico programma.txt");
});

test("un linguaggio aggiunto al registro si sceglie senza toccare lo strumento; ogni voce del registro si sceglie", () => {
  const p = apri(readFileSync(join(app, "casi", "tappa-3", "tre-livelli.algo"), "utf8"));
  if (!p.ok) throw new Error("non si apre");
  const finto = { id: "finto", genera: () => ({ generato: true as const, righe: [{ testo: "riga del linguaggio finto" }] }) };
  const nomeDi = (id: string) => (id === "finto" ? "Finto" : id);
  const scelta = scegliColonne(["finto", "c"], [...linguaggi, finto], nomeDi);
  if ("motivo" in scelta) throw new Error(scelta.motivo);
  const pagina = paginaDelProgetto(p.progetto, scelta.colonne, scelta.allineamento, "it", "x.algo");
  if ("errori" in pagina) throw new Error(pagina.errori.join());
  expect(pagina.testo).toContain("riga del linguaggio finto");
  expect(nomeDellaPagina("x", scelta.colonne, "it")).toBe("x (Finto e c).html");
  // Controllo positivo: senza quella voce, «finto» non c'è.
  expect(scegliColonne(["finto", "c"])).toEqual({ motivo: `il linguaggio finto non c'è: sono ${linguaggi.map((v) => v.id).join(", ")}` });
  for (const a of linguaggi) for (const b of linguaggi) if (a.id !== b.id) expect("colonne" in scegliColonne([a.id, b.id])).toBe(true);
});
