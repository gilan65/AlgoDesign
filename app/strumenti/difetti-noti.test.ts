// La parte «Difetti noti» delle note di rilascio e le guide per segnalare un malfunzionamento si tengono per mano: le
// guide mandano chi segnala a guardare quella parte del file `NOTE-DI-RILASCIO.md` accanto al programma, e ogni nota
// (Windows e Linux) la ha, con almeno una voce e il rimando alla guida; le voci della nota di Windows sono anche, alla
// lettera, in quella di Linux, che ne ha in più solo di sue. Nei testi distribuiti non resta il nome di una versione
// di prova (beta, alpha): i numeri di versione sì, perché le note nominano la versione da cui si parte.
//
// Che cosa NON guarda: che le voci siano vere, né che siano tutte (lo decide chi scrive le note); le parole delle voci
// solo di Linux; le note in inglese, che non ci sono.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { elencoDelPacchetto, elencoDiLinux, guidePerSegnalare } from "./elenco-del-pacchetto";

const radice = join(import.meta.dir, "..", "..");
const leggi = (f: string) => readFileSync(join(radice, f), "utf8").replaceAll("\r\n", "\n");

const note = { windows: "rilascio/windows/NOTE-DI-RILASCIO.md", linux: "rilascio/linux/NOTE-DI-RILASCIO.md" } as const;
const titolo = "## Difetti noti";
const guidaItaliana = "GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md";

/** Le voci della parte «Difetti noti» di una nota, o `null` se la parte non c'è; la parte va fino al titolo dopo. */
export function vociDeiDifettiNoti(testo: string): string[] | null {
  const righe = testo.split("\n");
  const inizio = righe.indexOf(titolo);
  if (inizio < 0) return null;
  const dopo = righe.slice(inizio + 1);
  const fine = dopo.findIndex((r) => /^#{1,2} /.test(r));
  return (fine < 0 ? dopo : dopo.slice(0, fine)).filter((r) => r.startsWith("- "));
}

/** Il testo della parte «Difetti noti» di una nota, senza le voci (l'introduzione). */
function introduzione(testo: string): string {
  const parte = testo.slice(testo.indexOf(titolo) + titolo.length);
  return parte.slice(0, parte.indexOf("\n- "));
}

/** I nomi di una versione di prova rimasti in un testo, tolti i numeri di versione (`0.7.0-beta.3`). */
export function versioniDiProva(testo: string): string[] {
  const senzaNumeri = testo.replace(/\b\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?/g, "");
  return [...senzaNumeri.matchAll(/\b(beta|alpha|versione di prova|copia di prova)\b/gi)].map((m) => m[0]);
}

for (const [sistema, nota] of Object.entries(note)) {
  test(`la nota di rilascio di ${sistema} ha la parte «Difetti noti», con le voci e il rimando alla guida per segnalare`, () => {
    const testo = leggi(nota);
    expect(testo.split("\n").filter((r) => r === titolo).length).toBe(1);
    const voci = vociDeiDifettiNoti(testo)!;
    console.log(`${nota}: ${voci.length} voci nei «Difetti noti»`);
    expect(voci.length).toBeGreaterThan(0);
    expect(introduzione(testo)).toContain(`\`${guidaItaliana}\``);
  });
}

test("le voci della nota di Windows sono anche, alla lettera, in quella di Linux", () => {
  const windows = vociDeiDifettiNoti(leggi(note.windows))!;
  const linux = vociDeiDifettiNoti(leggi(note.linux))!;
  console.log(`voci: Windows ${windows.length}, Linux ${linux.length} (${linux.length - windows.length} solo di Linux)`);
  expect(windows.filter((v) => !linux.includes(v))).toEqual([]);
});

test("le due guide per segnalare mandano alla parte «Difetti noti» del file delle note, che è nei due pacchetti con loro", () => {
  for (const g of guidePerSegnalare) {
    const testo = leggi(join("docs", g));
    expect([g, testo.includes("`NOTE-DI-RILASCIO.md`"), testo.includes("Difetti noti")]).toEqual([g, true, true]);
  }
  for (const elenco of [elencoDelPacchetto, elencoDiLinux]) {
    expect(elenco).toContain("NOTE-DI-RILASCIO.md");
    for (const g of guidePerSegnalare) expect(elenco).toContain(g);
  }
  expect(guidePerSegnalare).toContain(guidaItaliana);
});

test("nei testi distribuiti non resta il nome di una versione di prova", () => {
  const testi = [
    ...Object.values(note),
    "rilascio/linux/ALGODESIGN-PER-LINUX.md",
    "rilascio/linux/LEGGIMI-DI-ALGODESIGN-TOOLS.md",
    "rilascio/linux/README-OF-ALGODESIGN-TOOLS.md",
    "README.md",
    "LEGGIMI.md",
  ];
  const trovati = testi.map((t): [string, string[]] => [t, versioniDiProva(leggi(t))]).filter(([, v]) => v.length > 0);
  expect(trovati).toEqual([]);
});

test("il rilevatore vede una parte tolta, una voce persa per Linux e il nome di una versione di prova", () => {
  const windows = leggi(note.windows);
  expect(vociDeiDifettiNoti(windows.replace(titolo, "## Altro"))).toBeNull();
  // La parte finisce al titolo dopo: le voci di un'altra parte non si contano.
  expect(vociDeiDifettiNoti(`${titolo}\n\nIntro.\n\n- a\n- b\n\n## Dopo\n\n- c\n`)).toEqual(["- a", "- b"]);
  const prima = vociDeiDifettiNoti(windows)![0]!;
  const linuxSenza = leggi(note.linux).replace(`${prima}\n`, "");
  expect(vociDeiDifettiNoti(linuxSenza)).not.toContain(prima);
  // Le forme vere delle versioni passate, e il numero di versione che resta lecito.
  expect(versioniDiProva("È la **terza versione beta** di AlgoDesign")).toEqual(["beta"]);
  expect(versioniDiProva("È la **quarta versione di prova** (ALPHA 4)")).toEqual(["versione di prova", "ALPHA"]);
  expect(versioniDiProva("Rispetto alla versione 0.7.0-beta.3:")).toEqual([]);
});
