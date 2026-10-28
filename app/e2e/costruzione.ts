// La costruzione di un programma di riferimento (quello della tappa 1, quello della tappa 2 coi cicli `per`, o quello della
// tappa 3 con le procedure e la funzione) solo con l'interfaccia, come la farebbe l'utente: clic sui comandi, sui «+» e
// nell'elenco dei blocchi, testo nei campi. La usano la prova nel browser (`costruzione.e2e.ts`) e la prova sul prodotto
// (`strumenti/prova-portabile.ts`), quindi non usa `expect` del corridore delle prove: ogni attesa di un elemento che
// scade diventa un errore che dice quale passo manca (le azioni sugli elementi già trovati aspettano invece fino al
// limite della prova).
//
// I passi si ricavano dal file del corpus (`casi/tappa-<n>/riferimento-media-voti….algo`), non dall'atteso:
// l'atteso (`attesi/…`) è scritto a mano e si confronta col file salvato. Prima i dati, nell'ordine della vista; poi il
// caso d'uso, nella sua scheda (il nome, i valori col loro dato, l'output atteso), prima delle regole come lo scrive
// chi parte dai dati; poi i blocchi, nell'ordine del flusso (ogni blocco, poi il suo contenuto, poi il seguente),
// ciascuno sull'ultimo «+» della sua sequenza. Fra il caso e le regole chi chiama può fare altro (`traDatiERegole`: la
// prova lo salva, lo riapre e lo esegue). I testi si scrivono nella lingua dell'interfaccia (gli operatori a parola
// coi nomi della lingua), come li scrive l'utente.
//
// Le procedure e le funzioni nascono quando servono, come le farebbe nascere chi scrive il programma dall'alto: una
// procedura dai campi del salto che la chiama («Procedura» dal «+», poi «Nuova procedura…»: si apre la sua scheda); una
// funzione dal pulsante «Funzione», prima del blocco che la nomina in un'espressione. Nella scheda di ognuna: i parametri
// («Aggiungi un parametro», la natura) e i dati nell'ordine del file, le regole, ciò che restituisce (il doppio clic sulla
// fine), i casi d'uso (un caso nuovo ha già una voce per parametro); poi si torna alla scheda di chi la chiama, e il salto
// riceve i suoi argomenti.
//
// Selettori per ruolo e nome, con `exact: true`, tranne la barra (unica), le schede (`data-scheda`) e la fine di una
// funzione (`data-restituisce`); il modulo dei campi è quello del blocco appena inserito (per nome), e se ne legge la
// posizione per sapere in quale modo è aperto; nessun accesso al modello dalla pagina.

import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { traduciEspressione } from "../core/disegno/lingua";
import { paroleTolleranti } from "../core/espressioni/analizzatore";
import { apri as apriProgetto } from "../core/progetto/formato";
import { type Blocco, type CasoDiUnaFunzione, type Dato, type Funzione, type Progetto, type Tipo } from "../core/progetto/modello";
import type { Dizionario } from "../i18n/it";
import { dizionari, riempi, type Lingua } from "../i18n/lingue";
import { nomiDegliOperatori } from "../i18n/operatori";
import { bloccoDiNome } from "./albero";
import { voceDelMenu } from "./pagina";

const leggiProgetto = (percorso: string): { testo: string; progetto: Progetto } => {
  const testo = readFileSync(fileURLToPath(new URL(percorso, import.meta.url)), "utf8");
  const esito = apriProgetto(testo);
  if (!esito.ok) throw new Error(`${percorso} non si apre`);
  return { testo, progetto: esito.progetto };
};

/** Un programma da costruire (il file del corpus) e il file atteso, scritto a mano. */
export interface DaCostruire {
  readonly progetto: Progetto;
  readonly atteso: { readonly testo: string; readonly progetto: Progetto };
}
export const riferimentoDellaTappa1: DaCostruire = {
  progetto: leggiProgetto("../casi/tappa-1/riferimento-media-voti.algo").progetto,
  atteso: leggiProgetto("./attesi/riferimento-media-voti.algo"),
};
/** Il riferimento coi cicli `per` (nessun passo: il campo del passo resta vuoto). */
export const riferimentoDellaTappa2: DaCostruire = {
  progetto: leggiProgetto("../casi/tappa-2/riferimento-media-voti-per.algo").progetto,
  atteso: leggiProgetto("./attesi/riferimento-media-voti-per.algo"),
};
/** Il riferimento con due procedure (una con un parametro per riferimento) e una funzione, ognuna coi suoi casi. */
export const riferimentoDellaTappa3: DaCostruire = {
  progetto: leggiProgetto("../casi/tappa-3/riferimento-media-voti-funzioni.algo").progetto,
  atteso: leggiProgetto("./attesi/riferimento-media-voti-funzioni.algo"),
};

/** Il programma coi record: il record definito, un dato col valore iniziale, la copia col nome, i campi letti e scritti. */
export const programmaDeiRecord: DaCostruire = {
  progetto: leggiProgetto("../casi/tipi/copia-di-un-record.algo").progetto,
  atteso: leggiProgetto("./attesi/copia-di-un-record.algo"),
};

export interface Modi {
  blocchi: "riquadro" | "pannello";
  dati: "scheda" | "celle";
}

/** Che cosa la costruzione ha visto: quanti blocchi ha scritto in un riquadro sopra la pagina e quanti nel
 * pannello (e di quei blocchi quanti cicli `per` o `per ogni` e quanti salti), quanti dati e quanti valori dei casi
 * d'uso, quante procedure e funzioni ha creato e quanti casi loro. Un blocco si conta quando compare nel flowchart col
 * suo nome, ma il genere (un ciclo) lo dice il programma da costruire: che il blocco sia davvero un ciclo lo prova il file
 * salvato confrontato con l'atteso, non questo conteggio. */
export interface Osservato {
  riquadri: number;
  pannelli: number;
  blocchi: number;
  cicli: number;
  salti: number;
  dati: number;
  valoriDelCaso: number;
  funzioni: number;
  casiDelleFunzioni: number;
  /** I record definiti dal menu «Progetto», e i loro campi. */
  records: number;
  campi: number;
}

/** La voce dell'elenco del «+» di ogni genere (senza conversione di tipo: un genere nuovo del modello che manca qui è un
 * errore di compilazione). Il salto nell'elenco si chiama come ciò che chiama, «Procedura». */
const generi: Record<Blocco["kind"], keyof Dizionario> = {
  assignment: "bloccoAssegnazione",
  read: "bloccoLettura",
  write: "bloccoScrittura",
  if: "bloccoSe",
  while: "bloccoMentre",
  repeat: "bloccoRipeti",
  for: "bloccoPer",
  for_each: "bloccoPerOgni",
  call: "bloccoProcedura",
  comment: "bloccoCommento",
};

const nomiDeiTipi: Record<Tipo, keyof Dizionario> = { integer: "tipoIntero", real: "tipoReale", character: "tipoCarattere", string: "tipoStringa", boolean: "tipoBooleano" };
const nomiDeiRuoli: Record<NonNullable<Dato["role"]>, keyof Dizionario> = { input: "ruoloInput", output: "ruoloOutput", input_output: "ruoloInputOutput" };

/** Aspetta un elemento; se non arriva, l'errore dice quale passo non ha trovato che cosa. */
async function aspetta(l: Locator, cosa: string, stato: "visible" | "hidden" = "visible"): Promise<void> {
  try {
    await l.first().waitFor({ state: stato, timeout: 15_000 });
  } catch {
    throw new Error(`costruzione: ${stato === "visible" ? "manca" : "non sparisce"} ${cosa}`);
  }
}

/** I nomi seguiti da «(» in un testo, letti dall'analizzatore: le funzioni che nomina. */
const chiamateNel = (testo: string) => {
  const ps = paroleTolleranti(testo);
  return ps.flatMap((p, k) => (p.genere === "nome" && ps[k + 1]?.testo === "(" ? [p.testo] : []));
};

export async function costruisci(
  page: Page,
  lingua: Lingua,
  modi: Modi,
  nuovo: boolean,
  traDatiERegole: () => Promise<void> = async () => {},
  quale: DaCostruire = riferimentoDellaTappa1,
): Promise<Osservato> {
  const t = dizionari[lingua];
  const espressione = (x: string) => traduciEspressione(x, nomiDegliOperatori[lingua]);
  const p = quale.progetto;
  const main = p.functions.find((f) => f.kind === "main")!;
  const funzioneDiNome = (nome: string) => p.functions.find((f) => f.kind !== "main" && f.name === nome);
  const parametriDi = (f: Funzione) => f.data.filter((d) => d.parameter !== undefined);
  const contenuto = (b: Blocco): string => {
    switch (b.kind) {
      case "assignment":
        return `${espressione(b.target)} ← ${espressione(b.value)}`;
      case "read":
        return espressione(b.target);
      case "write":
        return b.values.map(espressione).join(", ");
      case "if":
      case "while":
      case "repeat":
        return espressione(b.condition);
      case "for": {
        const valori = { contatore: espressione(b.counter), da: espressione(b.from), a: espressione(b.to) };
        return b.step === undefined || b.step === 1 ? riempi(t.contenutoPer, valori) : riempi(t.contenutoPerConPasso, { ...valori, passo: String(b.step) });
      }
      case "for_each":
        return riempi(t.contenutoPerOgni, { elemento: espressione(b.item), sorgente: espressione(b.source) });
      case "comment":
        return b.text;
      case "call": {
        const parametri = parametriDi(funzioneDiNome(b.callee)!);
        const parola = (i: number) => (parametri[i]?.parameter === "reference" ? `${t.disegnoRif} ` : parametri[i]?.parameter === "out" ? `${t.disegnoOut} ` : "");
        return `${b.callee}(${b.arguments.map((a, i) => `${parola(i)}${espressione(a)}`).join(", ")})`;
      }
    }
  };
  const genereNelNome = (b: Blocco) => t[generi[b.kind]];
  const nomeBlocco = (b: Blocco): string => `${genereNelNome(b)}: ${contenuto(b)}`;
  const nomeDellaFunzione = (f: Funzione) => (f.kind === "main" ? p.metadata.name : f.name!);
  const flowchartDi = (f: Funzione) => page.getByRole("group", { name: `${t.flowchart}: ${nomeDellaFunzione(f)}`, exact: true });
  const osservato: Osservato = { riquadri: 0, pannelli: 0, blocchi: 0, cicli: 0, salti: 0, dati: 0, valoriDelCaso: 0, funzioni: 0, casiDelleFunzioni: 0, records: 0, campi: 0 };
  // Le procedure e le funzioni già create.
  const create = new Set<string>();

  // Il progetto nuovo, col nome e la descrizione del riferimento.
  if (nuovo) {
    await (await voceDelMenu(page, t.nuovo, t)).click();
    const finestra = page.getByRole("dialog", { name: t.progettoNuovoTitolo, exact: true });
    await aspetta(finestra, `la finestra «${t.progettoNuovoTitolo}»`);
    await finestra.getByLabel(t.progettoNome, { exact: true }).fill(p.metadata.name);
    await finestra.getByLabel(t.progettoDescrizione, { exact: true }).fill(p.metadata.description ?? "");
    await finestra.getByRole("button", { name: t.progettoCrea, exact: true }).click();
    await aspetta(finestra, `la finestra «${t.progettoNuovoTitolo}»`, "hidden");
  }
  await aspetta(flowchartDi(main), `il flowchart «${p.metadata.name}»`);

  /** I record del progetto, prima dei dati che li usano: dal menu «Progetto», poi nella scheda del record nuovo il nome e i
   * campi (il primo c'è già; gli altri con «Aggiungi un campo»), Invio. */
  for (const r of p.records ?? []) {
    await (await voceDelMenu(page, t.aggiungiRecord, t)).click();
    const scheda = page.getByRole("form", { name: riempi(t.modificaDelRecord, { nome: t.datoSenzaNome }), exact: true });
    await aspetta(scheda, `la scheda del record nuovo «${r.name}»`);
    const nomeDelRecord = scheda.getByRole("textbox", { name: t.recordNome, exact: true });
    await nomeDelRecord.fill(r.name);
    for (const [k, c] of r.fields.entries()) {
      const n = String(k + 1);
      if (k > 0) await scheda.getByRole("button", { name: t.recordAggiungiCampo, exact: true }).click();
      const campo = scheda.getByRole("textbox", { name: riempi(t.recordNomeDelCampo, { n }), exact: true });
      await aspetta(campo, `il campo ${n} del record «${r.name}»`);
      await campo.fill(c.name);
      await scheda.getByRole("combobox", { name: riempi(t.recordTipoDelCampo, { n }), exact: true }).selectOption({ label: t[nomiDeiTipi[c.type]] });
      if (c.max_length !== undefined) await scheda.getByRole("spinbutton", { name: riempi(t.recordLunghezzaDelCampo, { n }), exact: true }).fill(String(c.max_length));
      osservato.campi++;
    }
    await nomeDelRecord.press("Enter");
    await aspetta(scheda, `la scheda del record «${r.name}»`, "hidden");
    osservato.records++;
  }

  /** I dati di una funzione, nell'ordine della vista: un parametro con «Aggiungi un parametro» e la sua natura, un dato
   * con «Aggiungi un dato». */
  const scriviIDati = async (f: Funzione): Promise<void> => {
    let parametri = 0;
    for (const [i, d] of f.data.entries()) {
      if (d.size !== undefined || d.max_length !== undefined) throw new Error(`costruzione: il dato «${d.name}» ha una forma che la costruzione non scrive`);
      const parametro = d.parameter !== undefined;
      if (parametro && modi.dati === "celle") throw new Error("costruzione: i parametri si scrivono solo nella scheda del dato");
      await page.getByRole("button", { name: parametro ? t.aggiungiParametro : t.aggiungiDato, exact: true }).click();
      const nome = modi.dati === "celle" ? (campo: string) => riempi(t.campoDellaRiga, { campo, n: String(i + 1 - parametri) }) : (campo: string) => campo;
      const dove: Page | Locator = modi.dati === "celle" ? page : page.getByRole("form", { name: riempi(t.modificaDelDato, { nome: t.datoSenzaNome }), exact: true });
      const campoNome = dove.getByRole("textbox", { name: nome(t.datiNome), exact: true });
      await aspetta(campoNome, `il campo «${nome(t.datiNome)}» del dato «${d.name}» (${modi.dati})`);
      await campoNome.fill(d.name);
      await dove.getByRole("combobox", { name: nome(t.datiTipo), exact: true }).selectOption({ label: d.type === "record" ? d.record! : t[nomiDeiTipi[d.type]] });
      await dove.getByRole("combobox", { name: nome(t.campoForma), exact: true }).selectOption({ label: t.formaSemplice });
      const natura =
        d.parameter === "reference" ? t.naturaParametroRiferimento
        : d.parameter === "out" ? t.naturaParametroUscita
        : d.parameter === "value" ? t.naturaParametroValore
        : d.constant ? t.naturaCostante
        : t.naturaVariabile;
      await dove.getByRole("combobox", { name: nome(t.datiNatura), exact: true }).selectOption({ label: natura });
      // Un parametro non ha valore iniziale né ruolo: i loro campi non ci sono.
      if (!parametro) {
        // Il valore di un record: un letterale per campo, fra graffe.
        const iniziale = typeof d.initial === "string" ? espressione(d.initial) : Array.isArray(d.initial) && d.type === "record" ? `{${(d.initial as readonly string[]).map(espressione).join(", ")}}` : "";
        await dove.getByRole("textbox", { name: nome(t.datiIniziale), exact: true }).fill(iniziale);
        // Una costante non ha la scelta del ruolo.
        if (!d.constant) await dove.getByRole("combobox", { name: nome(t.datiRuolo), exact: true }).selectOption({ label: d.role === undefined ? t.ruoloDiLavoro : t[nomiDeiRuoli[d.role]] });
      } else parametri++;
      await campoNome.press("Enter");
      if (modi.dati === "scheda") await aspetta(dove as Locator, `la scheda del dato «${d.name}»`, "hidden");
      osservato.dati++;
    }
  };

  /** I casi d'uso di una funzione (il programma principale, o una procedura o funzione eseguita da sola), nella sua scheda:
   * un caso nuovo coi campi aperti (con le voci dei parametri già pronte), il nome, i valori, l'output atteso, Invio. */
  const scriviICasi = async (f: Funzione, casi: readonly CasoDiUnaFunzione[]): Promise<void> => {
    const schedaDeiCasi = page.getByRole("tab", { name: riempi(t.schedaCasi, { n: "0" }), exact: true });
    await aspetta(schedaDeiCasi, `la scheda «${riempi(t.schedaCasi, { n: "0" })}» di «${nomeDellaFunzione(f)}»`);
    await schedaDeiCasi.click();
    for (const [k, caso] of casi.entries()) {
      if (caso.expected.error || caso.expected.static_error || caso.expected.warnings || caso.description !== undefined || caso.inputs.some((v) => v.text === undefined || v.each))
        throw new Error(`costruzione: il caso «${caso.name}» ha una forma che la costruzione non scrive`);
      await page.getByRole("button", { name: t.aggiungiCaso, exact: true }).click();
      const campiDelCaso = page.getByRole("form", { name: riempi(t.modificaDelCaso, { nome: riempi(t.nomeDelCasoNuovo, { n: String(k + 1) }) }), exact: true });
      await aspetta(campiDelCaso, `i campi del caso nuovo di «${nomeDellaFunzione(f)}»`);
      const nomeDelCaso = campiDelCaso.getByRole("textbox", { name: t.casoNome, exact: true });
      await nomeDelCaso.fill(caso.name);
      const pronte = f.kind === "main" ? 0 : parametriDi(f).length;
      for (const [i, v] of caso.inputs.entries()) {
        const n = String(i + 1);
        if (i >= pronte) await campiDelCaso.getByRole("button", { name: t.casoAggiungiValore, exact: true }).click();
        const dato = campiDelCaso.getByRole("combobox", { name: riempi(t.casoDatoDelValore, { n }), exact: true });
        await aspetta(dato, `la scelta del dato del valore ${n}`);
        await dato.selectOption({ label: v.data });
        await campiDelCaso.getByRole("textbox", { name: riempi(t.casoTestoDelValore, { n }), exact: true }).fill(v.text!);
        osservato.valoriDelCaso++;
      }
      await campiDelCaso.getByRole("textbox", { name: f.kind === "main" ? t.casoOutput : t.casoOutputFunzione, exact: true }).fill(caso.expected.output);
      await nomeDelCaso.press("Enter");
      await aspetta(campiDelCaso, "i campi del caso", "hidden");
      if (f.kind !== "main") osservato.casiDelleFunzioni++;
    }
  };

  /** Mostra la funzione: la sua scheda sopra il flowchart. */
  const mostra = async (f: Funzione): Promise<void> => {
    const scheda = page.locator(`[data-scheda]`, { hasText: f.kind === "main" ? t.schedaPrincipale : f.name! }).first();
    await aspetta(scheda, `la scheda di «${nomeDellaFunzione(f)}»`);
    await scheda.click();
    await aspetta(flowchartDi(f), `il flowchart di «${nomeDellaFunzione(f)}»`);
  };

  /** Una procedura o una funzione appena creata, mostrata nella sua scheda: i dati, le regole, ciò che restituisce, i
   * casi; poi si torna alla scheda di `chi` la chiama. */
  const scriviLaFunzione = async (f: Funzione, chi: Funzione): Promise<void> => {
    create.add(f.name!);
    osservato.funzioni++;
    await aspetta(flowchartDi(f), `il flowchart della funzione nuova «${f.name}»`);
    const schedaDeiDati = page.getByRole("tab", { name: riempi(t.schedaDati, { n: "0" }), exact: true });
    await schedaDeiDati.click();
    await scriviIDati(f);
    await sequenza(f, f.body, f.name!);
    if (f.kind === "function") {
      await flowchartDi(f).locator("[data-restituisce]").dblclick();
      const campo = page.getByRole("textbox", { name: t.campoRestituisce, exact: true });
      await aspetta(campo, `il campo «${t.campoRestituisce}» di «${f.name}»`);
      await campo.fill(espressione(f.end.return_value ?? ""));
      await campo.press("Enter");
      await aspetta(campo, `il campo «${t.campoRestituisce}» di «${f.name}»`, "hidden");
    }
    await scriviICasi(f, f.test_cases ?? []);
    await mostra(chi);
  };

  /** Le funzioni che il blocco nomina nei suoi testi e che non ci sono ancora: dal pulsante «Funzione». */
  const funzioniPrimaDi = async (b: Blocco, chi: Funzione): Promise<void> => {
    const testi = b.kind === "call" ? b.arguments : "condition" in b ? [b.condition] : b.kind === "assignment" ? [b.value] : b.kind === "write" ? b.values : [];
    for (const nome of testi.flatMap(chiamateNel)) {
      const f = funzioneDiNome(nome);
      if (!f || f.kind !== "function" || create.has(nome)) continue;
      await page.locator('[data-comando="funzione"]').click();
      const finestra = page.getByRole("dialog", { name: t.funzioneNuovaSoloTitolo, exact: true });
      await aspetta(finestra, `la finestra «${t.funzioneNuovaSoloTitolo}»`);
      await finestra.getByRole("textbox", { name: t.funzioneNome, exact: true }).fill(nome);
      await finestra.getByRole("combobox", { name: t.funzioneRestituisce, exact: true }).selectOption({ label: f.return_type === "record" ? f.return_record! : t[nomiDeiTipi[f.return_type!]] });
      if (f.default_result !== undefined) throw new Error(`costruzione: il valore predefinito di «${nome}» non si scrive qui`);
      await finestra.getByRole("button", { name: t.funzioneCrea, exact: true }).click();
      await aspetta(finestra, `la finestra «${t.funzioneNuovaSoloTitolo}»`, "hidden");
      await scriviLaFunzione(f, chi);
    }
  };

  // I blocchi, nell'ordine del flusso, ognuno sull'ultimo «+» della sua sequenza.
  async function sequenza(chi: Funzione, blocchi: readonly Blocco[], nomeSequenza: string): Promise<void> {
    const flowchart = flowchartDi(chi);
    for (const [indice, b] of blocchi.entries()) {
      await funzioniPrimaDi(b, chi);
      const posto = String(indice + 1);
      const punto = flowchart.getByRole("button", { name: riempi(t.nomeDelPunto, { sequenza: nomeSequenza, n: posto, totale: posto }), exact: true });
      await aspetta(punto, `il punto d'inserimento ${posto} di «${nomeSequenza}»`);
      await punto.click();
      const genere = t[generi[b.kind]];
      const voce = page.getByRole("menuitem", { name: genere, exact: true });
      await aspetta(voce, `la voce «${genere}» nell'elenco dei blocchi`);
      await voce.click();
      await scriviCampi(chi, b);
      await aspetta(bloccoDiNome(flowchart, nomeBlocco(b)), `il blocco «${nomeBlocco(b)}» dopo la conferma`);
      osservato.blocchi++;
      const n = nomeBlocco(b);
      if (b.kind === "if") {
        await sequenza(chi, b.then, riempi(t.sequenzaVero, { blocco: n }));
        await sequenza(chi, b.else, riempi(t.sequenzaFalso, { blocco: n }));
      } else if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") {
        if (b.kind === "for" || b.kind === "for_each") osservato.cicli++;
        await sequenza(chi, b.body, riempi(t.sequenzaCorpo, { blocco: n }));
      }
    }
  }

  /** I campi di un blocco nell'ordine dell'editor, col testo da scrivere. */
  const campiDi = (b: Blocco): [string, string][] => {
    switch (b.kind) {
      case "assignment":
        return [
          [t.campoDestinazione, espressione(b.target)],
          [t.campoValore, espressione(b.value)],
        ];
      case "read":
        return [[t.campoDestinazione, espressione(b.target)]];
      case "write":
        return b.values.map((v, i) => [riempi(t.campoValoreN, { n: String(i + 1) }), espressione(v)]);
      case "if":
      case "while":
      case "repeat":
        return [[t.campoCondizione, espressione(b.condition)]];
      case "for":
        // Il passo vuoto è il passo 1: il campo si scrive solo con un altro passo.
        return [
          [t.campoContatore, espressione(b.counter)],
          [t.campoDa, espressione(b.from)],
          [t.campoA, espressione(b.to)],
          ...(b.step === undefined ? [] : [[t.campoPasso, String(b.step)] as [string, string]]),
        ];
      case "for_each":
        return [
          [t.campoElemento, espressione(b.item)],
          [t.campoSorgente, espressione(b.source)],
        ];
      case "comment":
        return [[t.campoTesto, b.text]];
      // Un campo per parametro, col nome e com'è ricevuto.
      case "call": {
        const parametri = parametriDi(funzioneDiNome(b.callee)!);
        const modo = (d: Dato) => (d.parameter === "reference" ? t.campoParametroRiferimento : d.parameter === "out" ? t.campoParametroUscita : t.campoParametroValore);
        return b.arguments.map((a, i) => [riempi(modo(parametri[i]!), { nome: parametri[i]!.name }), espressione(a)]);
      }
    }
  };

  /** Il modulo dei campi del blocco col nome dato, e quanti se ne aprono nel riquadro o nel pannello. */
  const moduloDi = async (nomeDelBlocco: string, cosa: string): Promise<Locator> => {
    const modulo = page.getByRole("form", { name: riempi(t.modificaDelBlocco, { blocco: nomeDelBlocco }), exact: true });
    await aspetta(modulo, `i campi del blocco «${cosa}»`);
    const fisso = await modulo.evaluate((f) => getComputedStyle(f).position === "fixed");
    if (fisso) osservato.riquadri++;
    else osservato.pannelli++;
    return modulo;
  };

  /** I campi del blocco appena inserito (si aprono da soli, nel suo modulo), poi Invio nel primo. Un salto: prima la
   * procedura scelta (o creata, con la sua scheda), poi gli argomenti, scritti nei campi del salto riaperti se la procedura
   * è nata lì. */
  const scriviCampi = async (chi: Funzione, b: Blocco): Promise<void> => {
    const modulo = await moduloDi(riempi(t.nomeDelBlocco, { genere: genereNelNome(b), testo: t.bloccoSenzaTesto }), nomeBlocco(b));
    const campo = (dove: Locator, nome: string) => dove.getByRole("textbox", { name: nome, exact: true });
    const campi = campiDi(b);
    let dove = modulo;
    if (b.kind === "call") {
      osservato.salti++;
      const scelta = modulo.getByRole("combobox", { name: t.campoProcedura, exact: true });
      if (create.has(b.callee)) await scelta.selectOption({ label: b.callee });
      else {
        const f = funzioneDiNome(b.callee)!;
        await scelta.selectOption({ label: t.nuovaProcedura });
        const finestra = page.getByRole("dialog", { name: t.funzioneNuovaProceduraTitolo, exact: true });
        await aspetta(finestra, `la finestra «${t.funzioneNuovaProceduraTitolo}»`);
        await finestra.getByRole("textbox", { name: t.funzioneNome, exact: true }).fill(b.callee);
        await finestra.getByRole("button", { name: t.funzioneCrea, exact: true }).click();
        await aspetta(finestra, `la finestra «${t.funzioneNuovaProceduraTitolo}»`, "hidden");
        await scriviLaFunzione(f, chi);
        if (campi.length === 0) return;
        // Il salto chiama la procedura nuova, ancora senza argomenti: si riapre.
        const senzaArgomenti = `${t.bloccoProcedura}: ${b.callee}()`;
        await bloccoDiNome(flowchartDi(chi), senzaArgomenti).dblclick();
        dove = await moduloDi(senzaArgomenti, nomeBlocco(b));
      }
      if (campi.length === 0) {
        await scelta.press("Enter");
        return;
      }
    }
    const [primo] = campi[0]!;
    await aspetta(campo(dove, primo), `il campo «${primo}» del blocco «${nomeBlocco(b)}»`);
    for (const [i, [nome, testo]] of campi.entries()) {
      if (i > 0 && b.kind === "write") await dove.getByRole("button", { name: t.aggiungiValore, exact: true }).click();
      await aspetta(campo(dove, nome), `il campo «${nome}» del blocco «${nomeBlocco(b)}»`);
      await campo(dove, nome).fill(testo);
    }
    if (b.kind === "write" && !b.newline) await dove.getByRole("checkbox", { name: t.campoACapo, exact: true }).uncheck();
    await campo(dove, primo).press("Enter");
  };

  await scriviIDati(main);
  // Il caso d'uso del programma, nella sua scheda, prima delle regole.
  const casi = p.test_cases ?? [];
  if (casi.length !== 1) throw new Error("costruzione: il riferimento ha una forma che la costruzione non scrive (un caso solo)");
  await scriviICasi(main, casi);
  await traDatiERegole();
  await sequenza(main, main.body, t.sequenzaPrincipale);
  return osservato;
}

/** I percorsi dei campi in cui due valori JSON sono diversi (`functions[0].body[4].then[1].values[0]`). */
export function differenze(a: unknown, b: unknown, percorso = ""): string[] {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    return Array.from({ length: n }, (_, i) => differenze(a[i], b[i], `${percorso}[${i}]`)).flat();
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const chiavi = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return chiavi.flatMap((k) => differenze((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], percorso === "" ? k : `${percorso}.${k}`));
  }
  return Object.is(a, b) ? [] : [percorso === "" ? "(il file intero)" : percorso];
}

/** Un pezzo di testo da mostrare in un messaggio: fra virgolette, coi caratteri che non si vedono in forma di fuga (il BOM
 * e gli spazi diversi dallo spazio, che `JSON.stringify` lascia com'è). */
const visibile = (t: string) => JSON.stringify(t).replace(/[\p{Cf}\p{Z}]/gu, (c) => (c === " " ? c : `${String.fromCharCode(92)}u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`));

/** Dove due testi cominciano a essere diversi, per il messaggio di un confronto per byte: il byte (in UTF-8), la riga e la
 * colonna, e i pezzi che seguono; vuoto se sono uguali. */
export function primaDifferenza(scritto: string, atteso: string): string {
  if (scritto === atteso) return "";
  let i = 0;
  while (i < scritto.length && i < atteso.length && scritto[i] === atteso[i]) i++;
  const prima = scritto.slice(0, i);
  const riga = prima.split("\n").length;
  const colonna = i - prima.lastIndexOf("\n");
  return `dal byte ${Buffer.byteLength(prima)} (riga ${riga}, colonna ${colonna}): ${visibile(scritto.slice(i, i + 24))} invece di ${visibile(atteso.slice(i, i + 24))}`;
}
