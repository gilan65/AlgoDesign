// La stampa senza il disegno della pagina: le scelte della finestra «Stampa», le procedure e funzioni che si stampano, le
// parti che hanno qualcosa da stampare, le sezioni della pagina preparata nell'ordine (una per foglio nuovo, ognuna con
// la sua regola `@page`) e il testo di quelle regole. Le parti escono in quest'ordine: Progetto, Dati, Flowchart, Casi
// d'uso; dentro una parte le procedure e funzioni nell'ordine del file (il programma principale per primo). Il flowchart
// di ogni funzione comincia su un foglio nuovo, coi fogli del nucleo (`fogliDelDisegno`); i dati e i casi d'uso di più
// funzioni si seguono sugli stessi fogli, o ognuna da un foglio nuovo con la casella «Ogni procedura e funzione da un
// foglio nuovo».
//
// Il foglio: A4, coi margini dove stanno l'intestazione (sopra) e il piè di pagina (sotto). Ogni margine è occupato,
// anche da uno spazio che non si vede: il motore aggiunge le sue intestazioni (data, titolo, indirizzo) nei margini che
// la pagina lascia liberi (misurato sulla WebView2 in DataDesign). Le regole si scrivono in un foglio di stile costruito
// dal CSSOM, non in un `<style>`: la politica di sicurezza dei contenuti dell'app (`style-src 'self'`) lo fermerebbe, e i
// fogli uscirebbero tutti verticali e senza intestazioni (misurato in Chromium).
//
// CHE COSA NON FA:
// - disegnare le parti (`PaginaStampata.tsx`) né stampare (`window.print` di chi la mostra);
// - le parti «codice» e «affiancati» (non ci sono ancora);
// - misure diverse da A4.
import { puntiDelTesto, puntiPredefiniti, type AreeDelFoglio, type FogliDelDisegno } from "../../core/disegno/fogli";
import type { ModoDiColore } from "../../core/disegno/tavolozza";
import type { GeometriaDelTema } from "../../core/disegno/tema";
import type { CasoDUso, CasoDiUnaFunzione, Funzione, Progetto } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";

/** Le parti della stampa, nell'ordine in cui escono. */
export const partiDellaStampa = ["progetto", "dati", "flowchart", "casi"] as const;
export type ParteDellaStampa = (typeof partiDellaStampa)[number];

/** Il testo di ogni parte: nella finestra e nell'intestazione dei fogli. */
export const testoDellaParte = { progetto: "stampaProgetto", dati: "stampaDati", flowchart: "stampaFlowchart", casi: "stampaCasi" } as const satisfies Record<ParteDellaStampa, keyof Dizionario>;

export interface ScelteDiStampa {
  readonly parti: Readonly<Record<ParteDellaStampa, boolean>>;
  /** Tutte le procedure e funzioni, o solo quella mostrata. */
  readonly tutte: boolean;
  /** «Ogni procedura e funzione da un foglio nuovo» (dati e casi d'uso; vale solo con tutte). */
  readonly foglioNuovo: boolean;
  /** «Adatta al foglio» e il testo minimo del flowchart, in punti. */
  readonly adatta: boolean;
  readonly punti: number;
  readonly colori: ModoDiColore;
  /** I segni dell'esecuzione sui flowchart (vale solo in pausa). */
  readonly segni: boolean;
  /** Nel piè di pagina. */
  readonly numeri: boolean;
  readonly data: boolean;
}

/** Le scelte della prima stampa della sessione: il flowchart di tutte, a 8 punti, a colori, col piè di pagina intero. */
export const sceltePredefinite: ScelteDiStampa = {
  parti: { progetto: false, dati: false, flowchart: true, casi: false },
  tutte: true,
  foglioNuovo: false,
  adatta: false,
  punti: puntiPredefiniti,
  colori: "colori",
  segni: true,
  numeri: true,
  data: true,
};

/** Le procedure e funzioni che si stampano, nell'ordine del file: tutte, o solo quella mostrata. */
export const funzioniDellaStampa = (p: Progetto, mostrata: string, tutte: boolean): readonly Funzione[] => (tutte ? p.functions : p.functions.filter((f) => f.id === mostrata));

/** I casi d'uso di una funzione: del progetto per il programma principale, suoi per una procedura o funzione. */
export const casiDi = (p: Progetto, f: Funzione): readonly (CasoDUso | CasoDiUnaFunzione)[] => (f.kind === "main" ? (p.test_cases ?? []) : (f.test_cases ?? []));

/** Le costanti comuni stanno coi dati del programma principale. */
export const comuniDi = (p: Progetto, f: Funzione) => (f.kind === "main" ? (p.shared_constants ?? []) : []);

/** Una funzione ha qualcosa da stampare nei dati: dati, parametri o (il programma principale) costanti comuni. */
export const conDati = (p: Progetto, f: Funzione) => f.data.length > 0 || comuniDi(p, f).length > 0;

/** Le parti che hanno qualcosa da stampare per quelle funzioni: le altre sono spente nella finestra. Il progetto col solo
 * nome non fa un foglio. */
export function partiPiene(p: Progetto, funzioni: readonly Funzione[]): Record<ParteDellaStampa, boolean> {
  const m = p.metadata;
  return {
    progetto: [m.author, m.description, m.notes].some((x) => (x ?? "").trim() !== ""),
    dati: funzioni.some((f) => conDati(p, f)),
    flowchart: funzioni.length > 0,
    casi: funzioni.some((f) => casiDi(p, f).length > 0),
  };
}

/** Una sezione della pagina: comincia su un foglio nuovo e ha la sua regola `@page` (il nome), col verso e
 * l'intestazione; le funzioni che contiene; per il flowchart, quale foglio. */
export interface Sezione {
  readonly parte: ParteDellaStampa;
  readonly nome: string;
  readonly orizzontale: boolean;
  readonly testa: string;
  readonly destra: string;
  readonly funzioni: readonly Funzione[];
  readonly foglio?: number;
}

/** Il nome di una funzione nella stampa: il programma principale col nome della sua scheda. */
export const nomeNellaStampa = (f: Funzione, testi: Dizionario) => (f.kind === "main" ? testi.schedaPrincipale : (f.name ?? ""));

/** Le sezioni della pagina, nell'ordine: le parti scelte e piene, dati e casi d'uso di seguito o una funzione per
 * sezione, il flowchart un foglio per sezione (`fogliDi` dà i fogli del nucleo di una funzione). */
export function sezioniDellaStampa(p: Progetto, funzioni: readonly Funzione[], scelte: ScelteDiStampa, fogliDi: (f: Funzione) => Pick<FogliDelDisegno, "orizzontale" | "fogli">, testi: Dizionario): Sezione[] {
  const piene = partiPiene(p, funzioni);
  const progetto = p.metadata.name;
  const testa = (parte: ParteDellaStampa, f?: Funzione) => [progetto, testi[testoDellaParte[parte]], ...(f ? [nomeNellaStampa(f, testi)] : [])].join(" · ");
  const divise = scelte.foglioNuovo && scelte.tutte;
  const fuori: Omit<Sezione, "nome">[] = [];
  for (const parte of partiDellaStampa) {
    if (!scelte.parti[parte] || !piene[parte]) continue;
    if (parte === "progetto") fuori.push({ parte, orizzontale: false, testa: testa(parte), destra: "", funzioni: [] });
    else if (parte === "flowchart")
      for (const f of funzioni) {
        const g = fogliDi(f);
        const n = g.fogli.length;
        g.fogli.forEach((_, i) =>
          fuori.push({ parte, orizzontale: g.orizzontale, testa: testa(parte, f), destra: n > 1 ? riempi(testi.stampaFoglio, { n: String(i + 1), m: String(n) }) : "", funzioni: [f], foglio: i }),
        );
      }
    else {
      const conQualcosa = funzioni.filter((f) => (parte === "dati" ? conDati(p, f) : casiDi(p, f).length > 0));
      if (divise) for (const f of conQualcosa) fuori.push({ parte, orizzontale: false, testa: testa(parte, f), destra: "", funzioni: [f] });
      else fuori.push({ parte, orizzontale: false, testa: testa(parte), destra: "", funzioni: conQualcosa });
    }
  }
  return fuori.map((s, k) => ({ ...s, nome: `stampa-${k}` }));
}

// Il foglio A4 coi margini: 22 mm sopra per l'intestazione, 18 sotto per il piè di pagina, 12 ai lati. L'area utile del
// flowchart in pixel CSS (le unità del disegno alla scala 1).
const px = (mm: number) => (mm * 96) / 25.4;
export const MARGINI = "22mm 12mm 18mm";
export const areeDellaStampa: AreeDelFoglio = {
  orizzontale: { larghezza: px(297 - 24), altezza: px(210 - 22 - 18) },
  verticale: { larghezza: px(210 - 24), altezza: px(297 - 22 - 18) },
};

/** Un testo come stringa CSS. */
export const stringaCss = (t: string) => `"${t.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", " ")}"`;
/** Uno spazio che non si vede: occupa un margine. */
export const SPAZIO = stringaCss(String.fromCharCode(0xa0));
const CARATTERE = "font: 8.5pt system-ui, -apple-system, \"Segoe UI\", sans-serif; color: #444444;";

/** Le regole dei fogli: per ogni sezione la misura, i margini, l'intestazione nel margine sopra e il piè di pagina scelto
 * nel margine sotto (il numero col contatore dei fogli); i sei riquadri sempre occupati. Una regola per riga. In stampa
 * si vede solo la pagina preparata, su carta bianca. */
export function regoleDeiFogli(sezioni: readonly Sezione[], testi: Dizionario, scelte: Pick<ScelteDiStampa, "numeri" | "data">, data: string): string {
  const [prima, mezzo, dopo] = testi.stampaPagina.split(/\{n\}|\{m\}/) as [string, string, string];
  const sopra = "vertical-align: bottom; padding-bottom: 1.5mm; margin-bottom: 6mm; border-bottom: 0.5pt solid #999999;";
  const sotto = "vertical-align: top; margin-top: 6mm;";
  const piede = [
    `@bottom-left { content: ${scelte.data ? stringaCss(data) : SPAZIO}; ${CARATTERE} ${sotto} }`,
    `@bottom-center { content: ${SPAZIO}; ${sotto} }`,
    `@bottom-right { content: ${scelte.numeri ? `${stringaCss(prima)} counter(page) ${stringaCss(mezzo)} counter(pages) ${stringaCss(dopo)}` : SPAZIO}; ${CARATTERE} ${sotto} }`,
  ].join(" ");
  return [
    ...sezioni.map(
      (s) =>
        `@page ${s.nome} { size: A4 ${s.orizzontale ? "landscape" : "portrait"}; margin: ${MARGINI}; ` +
        `@top-left { content: ${stringaCss(s.testa)}; ${CARATTERE} ${sopra} } @top-center { content: ${SPAZIO}; ${sopra} } ` +
        `@top-right { content: ${s.destra === "" ? SPAZIO : stringaCss(s.destra)}; ${CARATTERE} ${sopra} } ${piede} }`,
    ),
    "@media print { html, body { background: #ffffff; } #radice { display: none; } }",
  ].join("\n");
}

/** I flowchart che ai punti scelti non stanno in larghezza ed escono più piccoli, coi punti veri; nessuno con «Adatta al
 * foglio». */
export function flowchartRistretti(funzioni: readonly Funzione[], scelte: Pick<ScelteDiStampa, "adatta" | "punti">, fogliDi: (f: Funzione) => Pick<FogliDelDisegno, "ristretto" | "scala">, geometria: GeometriaDelTema): { funzione: Funzione; punti: number }[] {
  if (scelte.adatta) return [];
  return funzioni.flatMap((f) => {
    const g = fogliDi(f);
    return g.ristretto ? [{ funzione: f, punti: puntiDelTesto(g.scala, geometria) }] : [];
  });
}

/** La nota dei flowchart ristretti, nella lingua; vuota se nessuno. I punti con un decimale. */
export function notaDeiRistretti(ristretti: readonly { funzione: Funzione; punti: number }[], punti: number, testi: Dizionario, lingua: string): string {
  const reali = (x: number) => x.toLocaleString(lingua, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (ristretti.length === 0) return "";
  if (ristretti.length === 1) return riempi(testi.stampaRistretto, { punti: String(punti), nome: nomeNellaStampa(ristretti[0]!.funzione, testi), reali: reali(ristretti[0]!.punti) });
  return riempi(testi.stampaRistretti, { punti: String(punti), elenco: ristretti.map((r) => riempi(testi.stampaVoceRistretta, { nome: nomeNellaStampa(r.funzione, testi), reali: reali(r.punti) })).join(", ") });
}
