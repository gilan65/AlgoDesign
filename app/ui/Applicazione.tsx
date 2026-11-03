import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";
import { funzioneChiamata, impagina, partiDellaFine, partiDellIntestazione, risultatoDi, type Disegno, type DomandaDellaLettura, type MisuraDelTesto } from "../core/disegno/impaginazione";
import { coppie, perScrittura, stessaDomanda, type Coppia } from "../core/disegno/domanda";
import { campiConLaDomanda, incollaDiSeguito, trattoDellaVista } from "../core/modifica/domanda";
import { nomiDeiValoriIniziali, nomiDelDisegno } from "../core/disegno/nomi";
import { geometriaPredefinita } from "../core/disegno/tema";
import { svgDelDisegno, svgDelFoglio } from "../core/disegno/svg";
import { fogliDelDisegno } from "../core/disegno/fogli";
import type { SegniDellEsecuzione } from "../core/disegno/segni";
import { flushSync } from "react-dom";
import {
  chiamataDa,
  chiamateDi,
  duplicaFunzione,
  eliminaFunzione,
  eliminaParametro,
  idDellaFunzioneNuova,
  motivoDelNome,
  nuovaFunzione,
  perUscita,
  predefinitoDi,
  proprietaDellaFunzione,
  restituisce,
  rinominaFunzione,
  spostaParametro,
  type ChiamateDaTogliere,
  type Proprieta,
} from "../core/modifica/funzioni";
import { fermatoDaUnPunto } from "../core/esecuzione/controllore";
import { Esecuzione, type Comando, type LivelloDellaPila } from "../core/esecuzione/esecuzione";
import type { Origine, Riga } from "../core/interprete/interprete";
import { csv, TabellaMostrata, type ChiamataNelWatch, type DatoNelWatch, type Traccia } from "../core/esecuzione/traccia";
import { annulla, applica, inizia, nomiDiPrima, ripeti, siAnnulla, siRipete, type Cronologia } from "../core/modifica/cronologia";
import { Tabs } from "@ark-ui/react/tabs";
import type { EsitoDelCaso } from "../core/casi/esito";
import { datiLettiAltrove } from "../core/casi/voci";
import { causaDelNome, controlla, giriDellaRicorsione, type FermataDelBlocco, type Tetti } from "../core/controllo/controllo";
import { tettoDelleChiamate } from "../core/controllo/spazio";
import {
  aggiungiCaso,
  aggiungiDato,
  attendiErrore,
  cambiaCaso,
  cambiaComune,
  cambiaDato,
  campi,
  dove,
  duplicaCaso,
  duplicaComune,
  duplicaDato,
  blocchiDelTratto,
  eliminaCaso,
  eliminaComune,
  eliminaDato,
  funzioneDi,
  funzioniCheUsano,
  poi,
  regoleCheUsanoLaComune,
  rendiComune,
  rendiDellaFunzione,
  spostaCaso,
  spostaComune,
  spostaDato,
  incolla,
  inserisci,
  metadati as metadatiDelProgetto,
  opzioni as opzioniDelProgetto,
  progettoNuovo,
  regoleCheUsano,
  scriviAvvisi,
  eliminaTratto,
  nellaSequenzaDel,
  spostaTratto,
  togliErroreAtteso,
  trattoFra,
  trova,
  vociCheRestano,
  type Operazione,
  type Posto,
  type Tratto,
} from "../core/modifica/operazioni";
import { eUnaParolaSola } from "../core/modifica/rinomina";
import { sottoblocchi } from "../core/modifica/identificatori";
import { importa as importaDa } from "../core/modifica/importa";
import { apri as apriTesto, salva as testoDi } from "../core/progetto/formato";
import { type Blocco, type CasoDiUnaFunzione, type Dato, type DefinizioneDelRecord, type Funzione, type Progetto } from "../core/progetto/modello";
import { bozzaDelCaso, casoDaBozza, datiDelleVoci, nomeDelCasoNuovo, stessoCaso, vociDelCasoNuovo, type BozzaDelCaso } from "./casi/bozza";
import { casiDella, chiaveDelCaso, chiaviDeiCasi, selezioneDopoIlPasso, TuttiICasi } from "./casi/tutti";
import { casoDallEsecuzione, casoUguale, stessoProgramma, type DallEsecuzione } from "../core/casi/dall-esecuzione";
import { riassunto, rigaDelCaso, segnoDi, VistaCasi, type SegnoDelCaso } from "./casi/VistaCasi";
import { chiaveDelPosto, nomeDelBlocco, nomeDelCampoDellaCopia, nomeDellaFase, nomeDelValoreIniziale, strutturaAccessibile, trovaPosto, vociDeiValori } from "./disegno/accessibile";
import { ConfermaValoreIniziale } from "./disegno/ConfermaValoreIniziale";
import { EditorDelValore } from "./disegno/EditorDelValore";
import { copiaDelBlocco, escluso, riquadroDellaCopia, soloIlBlocco, sottoalberoDelTratto } from "./disegno/bersaglio";
import { ElencoDeiBlocchi, type Scelta } from "./disegno/ElencoDeiBlocchi";
import { applicaLaChiusura } from "./chiusura";
import { suggerimento, tastoDelComando, tastoDiEliminazione, tastoMostrato, tastoSullaPiattaforma } from "./comandi";
import { eventoDelMenu, impostaMenu, VOCI_DELL_INTERFACCIA, type VoceDellInterfaccia } from "./menu";
import { sulMac } from "./piattaforma";
import { bloccoNelPosto, campoDiTesto, comandoDelFile, comandoDellaCronologia, lasciaLaPagina, nelCampo, tastoCheElimina } from "./modifiche";
import { testiDeiCodiciCol, testoDelMessaggio, testoDellaSegnalazione, type Codice } from "../i18n/codici";
import { testiDeiMotivi } from "../i18n/motivi";
import { dizionari, riempi, type Lingua } from "../i18n/lingue";
import { nomiDegliOperatori } from "../i18n/operatori";
import { bozzaDi, campiDaBozza, domandaDaBozza, nellaFormaDelFile, stessiCampi, type BozzaDelBlocco } from "./disegno/campi";
import { traduciEspressione } from "../core/disegno/lingua";
import { EditorDelBlocco, EditorDellaFine, type ProcedureDelSalto, type SegnalazioneMostrata } from "./disegno/EditorDelBlocco";
import { RigaDiStato, type VoceDelControllo } from "./RigaDiStato";
import stili from "./Applicazione.module.css";
import { Barra, type Azioni, type Stati } from "./Barra";
import { Divisore } from "./Divisore";
import { annotaErrore, erroriDellApp } from "./errori-dell-app";
import { ricordaIlLavoro } from "./ErroreInatteso";
import { InRegistrazione } from "../core/registrazione/in-registrazione";
import { perSegnalare, type PerSegnalare } from "./segnalazione";
import { Barretta } from "./esecuzione/Barretta";
import { Console } from "./esecuzione/Console";
import { DoveSei } from "./esecuzione/DoveSei";
import { colonneMostrate, disposizioneIniziale } from "./esecuzione/colonne";
import { sfondoDelLivello, TabellaDiTraccia, testiDellaTraccia } from "./esecuzione/TabellaDiTraccia";
import { Watch } from "./esecuzione/Watch";
import { conPunti, puntiDi, senzaPunti } from "./esecuzione/punti";
import { azioneDelTasto, tastoDellEsecuzione, type Azione, type Situazione, type TastoDellEsecuzione } from "./esecuzione/tasti";
import { Flowchart, type NomePuntato, type Spostamento } from "./disegno/Flowchart";
import { misuraDelCanvas } from "./disegno/misura";
import { disegniDiProva } from "./disegno/prova";
import { testiDelDisegno } from "./disegno/testi";
import { areaDelDisegno, limitaLaScala, PASSO, scalaAdatta, VistaFlowchart } from "./disegno/VistaFlowchart";
import { bozzaDi as bozzaDelDato, conIlValoreDi, datoDaBozza, intero, stessoDato, type BozzaDelDato, type Natura } from "./dati/bozza";
import { tipoDelDato } from "./dati/righe";
import { ConfermaEliminazione, testiDelDato, type DaEliminare } from "./dati/ConfermaEliminazione";
import { MenuNelPunto } from "./dati/MenuDellaRiga";
import { chiaveDellaRiga, VistaDati, type Segni } from "./dati/VistaDati";
import { bozzaDelRecord, recordDaBozza, stessoRecord, type BozzaDelRecord } from "./dati/record";
import { chiaveDelRecord } from "./dati/TabellaDeiRecord";
import { aggiungiRecord, cambiaRecord, duplicaRecord, eliminaRecord, recordNuovo, spostaRecord, usiDelRecord } from "../core/modifica/record";
import { daSpostare, esempiDa, forniti, gruppoDi, mancanti, nomeLibero, testoDelProblema, testoDellErrore, type Esempio } from "./esempi";
import {
  chiudiFinestra,
  elencaEsempi,
  elencaLibrerie,
  erroreDelFile,
  eventoDiChiusura,
  fileDatoAllAvvio,
  leggiProgetto,
  cartellaDi,
  scegliCartella,
  nomeDelFile,
  scegliFileDaAprire,
  scegliFileDaEsportare,
  scegliFileDaSalvare,
  scegliFileDelCodice,
  scegliFileDellImmagine,
  scriviByte,
  scriviEsempio,
  scriviLibreria,
  scriviProgetto,
  segnaModificato,
  togliEsempio,
  togliGruppo,
  type CartellaDegliEsempi,
} from "./file";
import { baseProposta, motivoDelCambio, nomeCambiato, senzaVietati } from "./nomi";
import { AvvisoDelNome, type NomeDaChiedere } from "./finestre/AvvisoDelNome";
import { EliminaFunzione, type DaEliminare as FunzioneDaEliminare } from "./funzioni/EliminaFunzione";
import { FinestraFunzione, type BozzaDellaFunzione, type ErroriDellaFunzione, type ModoDellaFinestra } from "./funzioni/FinestraFunzione";
import { FinestraFunzioni } from "./funzioni/FinestraFunzioni";
import { frasiDeiGiri } from "./funzioni/giri";
import { Schede } from "./funzioni/Schede";
import { ConfermaModifiche } from "./finestre/ConfermaModifiche";
import { ConfermaSostituzione } from "./finestre/ConfermaSostituzione";
import { ConfermaTogli, type DaTogliere } from "./finestre/ConfermaTogli";
import { FinestraErrori, type VoceDiErrore } from "./finestre/FinestraErrori";
import { FinestraEsempi } from "./finestre/FinestraEsempi";
import { FinestraEsporta } from "./finestre/FinestraEsporta";
import { FinestraStampa, type DaStampare } from "./stampa/FinestraStampa";
import { PaginaStampata } from "./stampa/PaginaStampata";
import {
  areeAccanto,
  areeDellaStampa,
  flowchartRistretti,
  fraseSenzaCodice,
  funzioniDellaStampa,
  misureDelCodice,
  nomeNellaStampa,
  notaDeiRistretti,
  notaSenzaCodice,
  partiPiene,
  partiStampate,
  PUNTI_DEL_CODICE,
  sceltePredefinite as stampaPredefinita,
  sezioniDellaStampa,
  type ScelteDiStampa,
  type Sezione,
} from "./stampa/parti";
import { estensioneDel, inBase64, nomeDellImmagine, pngDallSvg, sceltePredefinite as esportazionePredefinita, SFONDO_DELLA_CARTA, tavolozzaDellaPagina, type ScelteDellEsportazione } from "./disegno/esporta";
import { FinestraImporta, nomiCheEntrano, type DaUnFile } from "./finestre/FinestraImporta";
import { FinestraGuida, memoriaNuova } from "./finestre/FinestraGuida";
import { FinestraInformazioni } from "./finestre/FinestraInformazioni";
import { FinestraSegnala } from "./finestre/FinestraSegnala";
import { FinestraImpostazioni } from "./finestre/FinestraImpostazioni";
import { FinestraProgetto, type DatiDelProgetto } from "./finestre/FinestraProgetto";
import { useSpostabile } from "./spostabile";
import { righeDi, testoDelCodice, type Generato } from "../core/genera/forma";
import { voceDel } from "../core/genera/linguaggi";
import { codiceDi, nomeDelFileDelCodice, paroleDeiLinguaggi, type Linguaggio } from "./genera/codice";
import { vociDelleMancanze } from "./genera/mancanze";
import { PannelloDelCodice, type RigheEvidenziate } from "./genera/PannelloDelCodice";
import { applicaIColori } from "./colori";
import { durataDelPasso, righeLungheDi, scelteIniziali as predefinite, scriviPreferenze, separatoriDelCsv, voci as vociDelleScelte, type Scelte, type VelocitaAnimata } from "./preferenze";

/** Il progetto aperto: la cronologia delle modifiche, il file a cui è legato (nessuno per un progetto nuovo o
 * un esempio), il testo di riferimento, cioè quello del file sul disco o del progetto appena aperto, e i punti
 * di interruzione, tenuti fuori dalla cronologia (Annulla e Ripeti non li toccano: `esecuzione/punti.ts`). Il
 * progetto è «modificato» quando il suo testo, coi punti, è un altro (tornare indietro con Annulla lo riporta
 * pulito). */
interface Documento {
  readonly cronologia: Cronologia;
  readonly percorso: string | null;
  readonly riferimento: string;
  readonly interruzioni: ReadonlySet<string>;
}

const documentoDi = (p: Progetto, percorso: string | null): Documento => ({ cronologia: inizia(senzaPunti(p)), percorso, riferimento: testoDi(p), interruzioni: puntiDi(p) });

/** La situazione dell'esecuzione per la tabella dei tasti, letta dallo stato del nucleo. */
function situazioneDi(es: Esecuzione<CasoDiUnaFunzione> | null): Situazione {
  const s = es?.stato.genere;
  return s === undefined ? "ferma" : s === "pausa" || s === "pronta" ? "in pausa" : s === "in corso" ? "in corso" : s === "chiede" ? "chiede" : "finita";
}

/** Quanto dura una fetta dell'esecuzione: una per fotogramma, poi la finestra torna a rispondere. */
const DURATA_DELLA_FETTA = 8;
/** La riga della ripresa nella tabella di traccia dice anche il valore che la funzione chiamata ha restituito. */
const RESTITUITO_NELLA_RIPRESA = true;

/** Ciò che il watch mostra del nome puntato, dal nucleo: un dato della funzione mostrata, o i valori restituiti dalla
 * funzione chiamata in quel blocco. */
const nelWatch = (t: TabellaMostrata, traccia: Traccia, nome: NomePuntato, funzione: string | undefined, livello: number | undefined): DatoNelWatch | ChiamataNelWatch | undefined =>
  nome.chiamataIn === undefined ? t.watch(traccia, nome.dato, funzione, livello) : t.chiamata(traccia, nome.dato, nome.chiamataIn);
/** Il programma principale. */
const principaleDi = (p: Progetto) => p.functions.find((f) => f.kind === "main")!;
/** I dati della funzione con quell'`id` (il programma principale, senza); nessuno, se la funzione non c'è più. */
const datiDi = (p: Progetto, funzione?: string) => funzioneDi(p, funzione)?.data ?? [];

/** Il dato della riga con quella chiave (`chiaveDellaRiga`): una costante comune o un dato della funzione (il programma
 * principale, senza), con la sua posizione. È l'identità del blocco del suo valore iniziale nel flowchart. */
function datoDellaRiga(p: Progetto, chiave: string, funzione?: string): { readonly comune: boolean; readonly indice: number; readonly dato: Dato } | undefined {
  const [tabella, n] = chiave.split("-");
  const comune = tabella === "comuni";
  const indice = Number(n);
  const dato = (comune ? (p.shared_constants ?? []) : datiDi(p, funzione))[indice];
  return dato && chiaveDellaRiga(comune, indice) === chiave ? { comune, indice, dato } : undefined;
}

/** La chiave della riga del dato scelto, in quel progetto: quella data, se la riga è ancora del dato con quel nome;
 * altrimenti la riga del dato con quel nome, nella stessa tabella; nessuna, se il dato non c'è più. */
function chiaveDelDato(p: Progetto, scelta: { readonly chiave: string; readonly nome: string }, funzione?: string): string | null {
  const r = datoDellaRiga(p, scelta.chiave, funzione);
  if (r?.dato.name === scelta.nome) return scelta.chiave;
  const comune = scelta.chiave.startsWith("comuni");
  const i = (comune ? (p.shared_constants ?? []) : datiDi(p, funzione)).findIndex((d) => d.name === scelta.nome);
  return i < 0 ? null : chiaveDellaRiga(comune, i);
}

/** I parametri di una procedura o di una funzione per i campi dei suoi casi: per nome, se per riferimento, se vettori
 * che si chiedono (un parametro per uscita non si chiede: nessuna casella «in ogni elemento»; nemmeno una tabella, i cui
 * campi hanno tipi diversi) e se per uscita. */
const parametriDi = (f: Funzione) =>
  new Map(
    f.data
      .filter((d) => d.parameter !== undefined)
      .map((d) => [d.name, { rif: d.parameter === "reference", vettore: d.size !== undefined && d.type !== "record" && d.parameter !== "out", uscita: d.parameter === "out" }]),
  );

/** La funzione che contiene il blocco con quell'`id`. */
function funzioneCon(p: Progetto, id: string): Funzione | undefined {
  const dentro = (s: readonly Blocco[]): boolean => s.some((b) => b.id === id || dentro(sottoblocchi(b)));
  return p.functions.find((f) => dentro(f.body));
}

/** La funzione che vede le modifiche fra due progetti: la mostrata, se è cambiata lei (o non c'è più); altrimenti la
 * prima che è cambiata, o che c'è in uno solo dei due. Ogni oggetto si ricostruisce a ogni operazione: si confronta il
 * testo, mai l'oggetto. */
function funzioneCambiata(prima: Progetto, dopo: Progetto, mostrata: string): string | undefined {
  const testo = (p: Progetto, id: string) => JSON.stringify(p.functions.find((f) => f.id === id) ?? null);
  const ids = [...new Set([...dopo.functions, ...prima.functions].map((f) => f.id))];
  if (testo(prima, mostrata) !== testo(dopo, mostrata)) return mostrata;
  return ids.find((id) => testo(prima, id) !== testo(dopo, id));
}

/** Il progetto nuovo dell'avvio: Inizio e Fine, nessun dato, il nome da scrivere nella finestra Progetto, la pila delle
 * chiamate dei progetti nuovi (delle Impostazioni; uguale al predefinito non si scrive). */
function progettoVuoto(nome: string, pila: number): Progetto {
  const r = progettoNuovo({ name: nome });
  const p = r.ok ? opzioniDelProgetto({ call_stack_limit: pila })(r.progetto, r.prossimo) : r;
  if (!p.ok) throw new Error("il progetto nuovo non si costruisce");
  return p.progetto;
}

/** La finestra di dialogo aperta (una sola alla volta), oltre alla conferma di cancellazione di un dato. */
type Aperta =
  | { readonly genere: "progetto"; readonly nuovo: boolean }
  | { readonly genere: "esempi" }
  | { readonly genere: "togli"; readonly cosa: DaTogliere }
  | { readonly genere: "modifiche"; readonly poi: () => void }
  | { readonly genere: "sostituire"; readonly percorso: string; readonly risposta: (sostituisci: boolean) => void }
  /** L'avviso del nome del file, prima della finestra del sistema per salvare. */
  | { readonly genere: "nome"; readonly chiesto: NomeDaChiedere; readonly risposta: (nome: string | null) => void }
  | { readonly genere: "impostazioni" }
  | { readonly genere: "informazioni" }
  /** La finestra prima di salvare il file per una segnalazione, col testo fotografato all'apertura. */
  | { readonly genere: "segnala"; readonly segnalazione: PerSegnalare }
  /** La finestra di una procedura o di una funzione: nuova, le proprietà, il nome. */
  | { readonly genere: "funzione"; readonly modo: ModoDellaFinestra }
  /** «Procedure e funzioni…». */
  | { readonly genere: "funzioni" }
  /** «Importa procedure e funzioni…». */
  | { readonly genere: "importa" }
  /** La conferma prima di eliminarne una (l'`id`). */
  | { readonly genere: "eliminaFunzione"; readonly id: string }
  /** «Esporta il flowchart…». */
  | { readonly genere: "esporta" }
  /** «Stampa…». */
  | { readonly genere: "stampa" };

// La finestra: la barra in alto; sotto, le due viste affiancate, i dati a sinistra in un pannello che si
// chiude dalla barra e si allarga dal bordo, il flowchart a destra con lo spazio che resta; in fondo la riga
// di stato con gli errori e gli avvisi del progetto, lo stato dell'esecuzione e lo zoom. Con un'esecuzione, a destra del flowchart la colonna con
// la console (si allarga dal suo bordo); la vista dei dati si chiude all'avvio e si riapre alla fine o a
// «Ferma», e la colonna resta finché «Ferma» non la chiude.
/** La causa precisa dell'errore o dell'avviso di un blocco, se il controllo la sa. */
const fermataDel = (fermate: readonly FermataDelBlocco[], s: { code: string; block: string }) => fermate.find((f) => f.code === s.code && f.block === s.block)?.fermata;

export function Applicazione({
  linguaIniziale,
  scelteIniziali = predefinite,
  misura,
}: {
  linguaIniziale: Lingua;
  /** Le scelte delle Impostazioni lette dalle preferenze. */
  scelteIniziali?: Scelte;
  misura?: MisuraDelTesto;
}): ReactElement {
  const [lingua, setLingua] = useState(linguaIniziale);
  const [scelte, setScelte] = useState(scelteIniziali);
  // La registrazione delle esecuzioni: solo qui, mai su disco né nelle preferenze, quindi spenta a ogni avvio. L'oggetto cambia dentro, e il
  // disegno che segue mostra il numero: come per l'esecuzione.
  const [registrazione, setRegistrazione] = useState<InRegistrazione | null>(null);
  // La guida per lo studente: non è una delle finestre (`finestra`), resta aperta mentre si lavora e i tasti valgono.
  const [guidaAperta, setGuidaAperta] = useState(false);
  const memoriaDellaGuida = useRef(memoriaNuova());
  const { condizioni, modoDeiBlocchi: modo, modoDeiDati: modoDati, limiti } = scelte;
  const sempre = scelte.conferma === "sempre";
  const cartellaScelta = scelte.cartellaEsempi;
  // La chiusura automatica nei campi di un'espressione (quelli segnati, ovunque siano), prima dei tasti dei campi.
  useEffect(() => {
    if (!scelte.chiusuraAutomatica) return;
    const tasto = (e: KeyboardEvent) => void applicaLaChiusura(e);
    document.addEventListener("keydown", tasto, true);
    return () => document.removeEventListener("keydown", tasto, true);
  }, [scelte.chiusuraAutomatica]);
  const [scala, setScala] = useState(1);
  const [aperto, setAperto] = useState(true);
  const [larghezza, setLarghezza] = useState<number | null>(null);
  // La colonna dell'esecuzione, a destra del flowchart: la sua larghezza, se l'utente ne ha scelta una.
  const [larghezzaColonna, setLarghezzaColonna] = useState<number | null>(null);
  const colonna = useRef<HTMLElement>(null);
  const idColonna = useId();
  // Nella colonna, la tabella di traccia sopra la console: se si mostra (l'interruttore del gruppo Viste) e la
  // sua altezza, se l'utente ne ha scelta una.
  const [conTabella, setConTabella] = useState(true);
  const [altezzaTabella, setAltezzaTabella] = useState<number | null>(null);
  // Come l'utente ha disposto le colonne della tabella (l'ordine e le larghezze): vale fino alla chiusura dell'app.
  const [disposizione, setDisposizione] = useState(disposizioneIniziale);
  const pannelloTabella = useRef<HTMLDivElement>(null);
  const idTabella = useId();
  // Il codice generato nella colonna, con «Genera» premuto: anche senza esecuzione, al posto della tabella di traccia
  // (le due si escludono: si vede l'ultima scelta). Il linguaggio mostrato e, durante un'esecuzione, l'altezza del
  // codice sopra la console, se l'utente ne ha scelta una. Il linguaggio mostrato è uno di quelli accesi nel menu delle
  // Impostazioni: all'avvio il primo, e il primo anche quando quello scelto si spegne (`null`: nessuno scelto).
  const [conCodice, setConCodice] = useState(false);
  const [linguaggioScelto, setLinguaggio] = useState<Linguaggio | null>(null);
  const menuDeiLinguaggi = scelte.linguaggiDelCodice;
  const linguaggio = linguaggioScelto !== null && menuDeiLinguaggi.includes(linguaggioScelto) ? linguaggioScelto : menuDeiLinguaggi[0]!;
  const [altezzaCodice, setAltezzaCodice] = useState<number | null>(null);
  const pannelloCodice = useRef<HTMLDivElement>(null);
  const idCodice = useId();
  const tela = useRef<HTMLElement>(null);
  const pannello = useRef<HTMLElement>(null);
  const idPannello = useId();
  const testi = dizionari[lingua];
  // La misura del canvas, se chi monta l'app non ne dà un'altra (le prove sotto happy-dom, che il canvas non ce l'ha).
  const misuraDelTesto = useMemo(() => misura ?? misuraDelCanvas(), [misura]);
  const { valoriIniziali, valoreRipetuto, cicliPer, cicliPerOgni, copiaDeiVettori, domandaNellaLettura } = scelte;
  // La Lettura con la domanda: una vista, che il disegno e le modifiche leggono uguale.
  const domanda: DomandaDellaLettura = domandaNellaLettura ? "nella-lettura" : "nella-scrittura";
  // Le forme dei cicli e della copia di un vettore: il disegno, la tabella di traccia e il watch le leggono uguali.
  const formeDeiCicli = useMemo(() => ({ per: cicliPer, perOgni: cicliPerOgni, copia: copiaDeiVettori }), [cicliPer, cicliPerOgni, copiaDeiVettori]);
  // Il disegno di una funzione, coi valori iniziali dei suoi dati (e delle costanti comuni, nel programma principale)
  // sotto «Inizio», se le Impostazioni li mostrano: li disegna il nucleo, dai dati. I cicli nella forma scelta.
  const disegna = useMemo(
    () =>
      (funzione: Funzione, comuni: readonly Dato[] = [], funzioni: readonly Funzione[] = [], records: readonly DefinizioneDelRecord[] = []) =>
        impagina(
          funzione,
          geometriaPredefinita,
          misuraDelTesto,
          testiDelDisegno(lingua),
          { condizioniLunghe: condizioni, valoriIniziali, valoreRipetuto, ...formeDeiCicli, domanda },
          comuni,
          funzioni,
          records,
        ),
    [misuraDelTesto, lingua, condizioni, valoriIniziali, valoreRipetuto, formeDeiCicli, domanda],
  );
  // Come la vista dei dati mostra i valori iniziali: lo stesso testo del blocco, dal nucleo.
  const valoriMostrati = useMemo(() => ({ testi: testiDelDisegno(lingua), ripetuto: valoreRipetuto }), [lingua, valoreRipetuto]);
  const diProva = disegniDiProva();
  const [documento, setDocumento] = useState(() => documentoDi(progettoVuoto(dizionari[linguaIniziale].progettoSenzaNome, scelteIniziali.pilaDeiProgettiNuovi), null));
  const cronologia = documento.cronologia;
  const progetto = cronologia.presente;
  const interruzioni = documento.interruzioni;
  /** Il testo del progetto coi punti di interruzione: quello che si salva. */
  const testoCompleto = (p: Progetto) => testoDi(conPunti(p, interruzioni));
  const modificato = useMemo(() => testoDi(conPunti(progetto, interruzioni)) !== documento.riferimento, [progetto, interruzioni, documento.riferimento]);
  const [finestra, setFinestra] = useState<Aperta | null>(null);
  // Le scelte di «Esporta il flowchart», ricordate per la sessione (non nelle preferenze).
  const [scelteDellEsportazione, setScelteDellEsportazione] = useState<ScelteDellEsportazione>(esportazionePredefinita);
  // Le scelte di «Stampa», ricordate per la sessione; la pagina stampata, montata da «Stampa…» fino a `afterprint`.
  const [scelteDellaStampa, setScelteDellaStampa] = useState<ScelteDiStampa>(stampaPredefinita);
  const [stampata, setStampata] = useState<{
    readonly progetto: Progetto;
    readonly sezioni: readonly Sezione[];
    readonly svg: (f: Funzione, foglio: number) => string;
    readonly svgAccanto: (f: Funzione, foglio: number) => string;
    readonly senzaCodice: { readonly frase: string; readonly voci: readonly { readonly breve: string; readonly posto?: string }[] };
    readonly scelte: ScelteDiStampa;
    readonly quando: Date;
  } | null>(null);
  const [errori, setErrori] = useState<{ titolo: string; voci: readonly VoceDiErrore[] } | null>(null);
  const [cartella, setCartella] = useState<CartellaDegliEsempi>({ cartella: "", predefinita: "", mancante: false, esiste: false, file: [], gruppi: [] });
  // La cartella dell'ultimo file aperto o salvato in questa sessione: da lì partono le finestre del file
  // quando il progetto aperto non è legato a un file.
  const [ultimaCartella, setUltimaCartella] = useState<string | null>(null);
  const partenza = documento.percorso !== null ? cartellaDi(documento.percorso) : ultimaCartella;
  const esempi = useMemo(() => esempiDa(cartella, limiti), [cartella, limiti]);
  // La cartella delle librerie, letta come quella degli esempi (senza forniti).
  const [cartellaLibrerie, setCartellaLibrerie] = useState<CartellaDegliEsempi>({ cartella: "", predefinita: "", mancante: false, esiste: false, file: [], gruppi: [] });
  const librerie = useMemo(() => esempiDa(cartellaLibrerie, limiti), [cartellaLibrerie, limiti]);
  const principale = principaleDi(progetto);
  // Le schede delle procedure e delle funzioni aperte (oltre al programma principale, sempre aperto) e quella mostrata:
  // stanno nella finestra, non nel file, e fuori dalla cronologia (come i punti di interruzione). Una procedura o una
  // funzione che non c'è più (eliminata, tolta da Annulla) perde la scheda, e al suo posto si mostra il programma.
  const [schede, setSchede] = useState<{ readonly aperte: readonly string[]; readonly mostrata: string | null }>({ aperte: [], mostrata: null });
  const mostrata = (schede.mostrata === null ? undefined : progetto.functions.find((f) => f.id === schede.mostrata)) ?? principale;
  const nelProgramma = mostrata.kind === "main";
  const sottoprogrammi = useMemo(() => progetto.functions.filter((f) => f.kind !== "main"), [progetto.functions]);
  useEffect(() => {
    const ci = new Set(progetto.functions.map((f) => f.id));
    if (schede.aperte.every((id) => ci.has(id)) && (schede.mostrata === null || ci.has(schede.mostrata))) return;
    setSchede((s) => ({ aperte: s.aperte.filter((id) => ci.has(id)), mostrata: s.mostrata !== null && ci.has(s.mostrata) ? s.mostrata : null }));
  }, [progetto.functions, schede]);
  const nomeDelProgetto = progetto.metadata.name;
  const costantiComuni = progetto.shared_constants;
  // Le costanti comuni si mostrano e si cambiano nella vista dei dati di ogni scheda; si disegnano sotto «Inizio» solo nel
  // programma principale, dove prendono il valore.
  const comuniMostrate = costantiComuni;
  const comuniModificabili = true;
  const comuniNelDisegno = nelProgramma ? costantiComuni : undefined;
  const disegno = useMemo(() => disegna(mostrata, comuniNelDisegno, progetto.functions, progetto.records), [disegna, mostrata, comuniNelDisegno, progetto.functions, progetto.records]);
  // Le Letture che mostrano la domanda in tutto il progetto, per `id` della Lettura e della Scrittura: ciò che il disegno
  // unisce, le modifiche e i punti di interruzione lo trattano insieme.
  const coppieDi = (p: Progetto): ReadonlyMap<string, Coppia> =>
    domanda === "nella-lettura" ? new Map(p.functions.flatMap((f) => [...coppie(f.body)])) : new Map<string, Coppia>();
  const coppieDelProgetto = useMemo(() => coppieDi(progetto), [domanda, progetto.functions]);
  const coppieDelleScritture = useMemo(() => perScrittura(coppieDelProgetto), [coppieDelProgetto]);
  const espressione = useMemo(() => testiDelDisegno(lingua).espressione, [lingua]);
  // La struttura per gli ausili e per lo strato: coi valori iniziali, se il flowchart li mostra, coi testi dal nucleo.
  const valoriNelFlowchart = useMemo(
    () => (valoriIniziali === "mostrati" ? { comuni: comuniNelDisegno ?? [], disegno: testiDelDisegno(lingua), ripetuto: valoreRipetuto } : undefined),
    [valoriIniziali, comuniNelDisegno, lingua, valoreRipetuto],
  );
  const struttura = useMemo(
    () => strutturaAccessibile(mostrata, testi, espressione, valoriNelFlowchart, progetto.functions, coppieDelProgetto),
    [mostrata, testi, espressione, valoriNelFlowchart, progetto.functions, coppieDelProgetto],
  );
  const nomeDelFlowchart = (nome: string) => `${testi.flowchart}: ${nome}`;

  // Il blocco scelto, o il valore iniziale scelto (la chiave della riga del suo dato, e il nome del dato): uno solo dei
  // due. La scelta di un valore iniziale segue il dato: quando le righe cambiano posto (un dato spostato, duplicato o
  // cancellato sopra, Annulla) la chiave di quella posizione è di un altro dato, e la scelta si ritrova dal nome.
  // Col blocco scelto, l'ancora: il blocco da cui la scelta si è allargata (Maiusc+clic, Maiusc+frecce) ai blocchi vicini
  // fra i due, che si spostano, si copiano e si eliminano insieme; senza ancora, il blocco solo.
  const [scelta, setScelta] = useState<{ readonly id: string; readonly ancora: string | null } | null>(null);
  const selezionato = scelta?.id ?? null;
  const impostaSelezionato = (id: string | null, ancora: string | null = null) => setScelta(id === null ? null : { id, ancora: ancora === id ? null : ancora });
  const [sceltaDelValore, setSceltaDelValore] = useState<{ readonly chiave: string; readonly nome: string } | null>(null);
  const setValoreScelto = (chiave: string | null) => {
    const r = chiave === null ? undefined : datoDellaRiga(progetto, chiave, mostrata.id);
    setSceltaDelValore(chiave === null || !r ? null : { chiave, nome: r.dato.name });
  };
  const valoreScelto = sceltaDelValore === null ? null : chiaveDelDato(progetto, sceltaDelValore, mostrata.id);
  const setSelezionato = (id: string | null, ancora: string | null = null) => {
    impostaSelezionato(id, ancora);
    setValoreScelto(null);
  };
  const scegliValore = (chiave: string) => {
    impostaSelezionato(null);
    setValoreScelto(chiave);
  };
  // I campi del blocco del valore iniziale di un dato, e il valore iniziale che si sta per togliere, se la finestra di
  // conferma è aperta.
  const [valoreInModifica, setValoreInModifica] = useState<{ chiave: string; bozza: BozzaDelDato } | null>(null);
  const [togliendo, setTogliendo] = useState<{ chiave: string; nome: string } | null>(null);
  // I blocchi copiati: uno, o una Scrittura e la Lettura che la mostra come domanda.
  const [appunti, setAppunti] = useState<readonly Blocco[] | null>(null);
  const [elencoSu, setElencoSu] = useState<{ posto: Posto; elemento: SVGGElement } | null>(null);
  // Il menu di un blocco (Taglia, Copia, Elimina), aperto col tasto destro o dalla tastiera: di quale blocco (o del blocco
  // del valore iniziale di quale dato, che si toglie come con la barra e non si taglia né si copia) e dove.
  const [menuDelBlocco, setMenuDelBlocco] = useState<{ chi: { readonly id: string } | { readonly valore: string }; x: number; y: number } | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  /** L'avviso detto dall'ultima conferma dei campi aperti, che il comando dopo (il salvataggio) non deve cancellare. */
  const avvisoDellaConferma = useRef<string | null>(null);
  // L'elemento a cui dare il fuoco dopo il prossimo disegno (un selettore dello strato delle modifiche), e quello che
  // aveva il fuoco quando lo si è chiesto: il fuoco spostato dopo, anche prima del ridisegno, l'ha spostato l'utente.
  const [fuoco, impostaIlFuoco] = useState<string | null>(null);
  const fuocoChiestoDa = useRef<Element | null>(null);
  /** L'ultimo blocco a cui l'effetto del fuoco ha dato il fuoco, da quando il fuoco è stato chiesto: uno di una richiesta
   * di prima (Esc che lo rimette su un blocco) l'utente può averlo scelto di nuovo. */
  const bloccoColFuoco = useRef<Element | null>(null);
  const setFuoco = (f: string | null) => {
    if (f !== null) {
      fuocoChiestoDa.current = document.activeElement;
      bloccoColFuoco.current = null;
    }
    impostaIlFuoco(f);
  };
  const [adattata, setAdattata] = useState(false);
  // Lo zoom che c'era prima di «Adatta alla finestra»: lo stesso pulsante («Torna indietro») ci torna.
  const [scalaPrima, setScalaPrima] = useState(1);
  // Il blocco che si sposta dalla tastiera, coi blocchi fino all'ancora se ne ha una: preso con Spazio, rilasciato con
  // Invio su un «+». Si ricordano i due capi, non la scelta: mentre si raggiunge il «+» il fuoco passa su altri blocchi.
  const [spostando, setSpostando] = useState<{ readonly id: string; readonly ancora: string | null } | null>(null);
  // Il blocco di cui si scrivono i campi, col testo dei campi nella lingua dell'interfaccia.
  // Di una Lettura con la domanda anche la coppia che il disegno mostrava quando i campi si sono aperti: la conferma tocca
  // la Scrittura che i campi hanno mostrato, mai una che si è unita dopo.
  const [inModifica, setInModifica] = useState<{ id: string; bozza: BozzaDelBlocco; coppia?: Coppia } | null>(null);
  // Il campo della fine di una funzione (ciò che restituisce), della funzione con quell'`id`, nella lingua dell'interfaccia.
  const [fineInModifica, setFineInModifica] = useState<{ funzione: string; bozza: string } | null>(null);
  // Il dato di cui si scrivono i campi (un dato della funzione mostrata, o con `comune` una costante comune); il dato che si
  // sta per cancellare, se la finestra di conferma è aperta (con la spunta che toglie l'argomento di un parametro dalle
  // chiamate); la costante comune che si sta per togliere dalle comuni, se altre funzioni la usano; l'elemento della vista
  // dei dati a cui dare il fuoco dopo il prossimo disegno.
  const [datoInModifica, setDatoInModifica] = useState<{ indice: number; bozza: BozzaDelDato; campo?: "iniziale"; comune?: boolean } | null>(null);
  const [eliminando, setEliminando] = useState<DaEliminare | null>(null);
  // Il record di cui si scrivono i campi (la scheda sotto la sua riga); `nuovo`, appena aggiunto: la cronologia di prima e
  // se la prima conferma ha già mostrato i suoi errori (finché i campi sono aperti tace, come un dato nuovo).
  const [recordInModifica, setRecordInModifica] = useState<{ indice: number; bozza: BozzaDelRecord; nuovo?: { prima: Cronologia; mostrato: boolean } } | null>(null);
  const [eliminandoRecord, setEliminandoRecord] = useState<{ indice: number; nome: string; usi: number } | null>(null);
  // Un record appena aggiunto tace finché i suoi campi sono aperti e la prima conferma non li ha mostrati.
  const recordInSilenzio = recordInModifica?.nuovo && !recordInModifica.nuovo.mostrato ? recordInModifica.indice : null;
  const [togliArgomenti, setTogliArgomenti] = useState(false);
  const [togliendoComune, setTogliendoComune] = useState<{ indice: number; nome: string; chi: readonly string[] } | null>(null);
  const [fuocoDato, setFuocoDato] = useState<string | null>(null);
  // Il dato appena aggiunto con «Aggiungi un dato» (o un parametro), com'è nato, con la cronologia di prima: se l'utente
  // rinuncia ai suoi campi (o conferma i campi vuoti), il dato sparisce senza lasciare un passo.
  const [aggiunto, setAggiunto] = useState<{ indice: number; vuoto: Dato; prima: Cronologia } | null>(null);
  // L'elemento appena nato coi campi vuoti (il blocco inserito, il dato aggiunto), quindi con un errore che l'utente non
  // ha ancora commesso: finché non lo conferma, i suoi errori e avvisi non si mostrano, né nei campi né nella riga di
  // stato, sul blocco o sulla riga del dato. La prima conferma con un errore lascia aperti i campi e lo mostra (Invio,
  // Conferma, il clic fuori; nelle celle anche lasciare la riga). Un elemento che già c'era li mostra da subito.
  const [nuovo, setNuovo] = useState<{ readonly blocco: string } | { readonly dato: number } | null>(null);
  const bloccoNuovo = nuovo !== null && "blocco" in nuovo ? nuovo.blocco : null;
  const datoNuovo = nuovo !== null && "dato" in nuovo ? nuovo.dato : null;
  // Tace finché i suoi campi sono aperti (nelle celle la riga è già fatta di campi: finché il fuoco non la lascia): ricavato
  // qui, finisce nello stesso disegno in cui i campi si chiudono, non a quello dopo.
  const bloccoInSilenzio = bloccoNuovo !== null && inModifica?.id === bloccoNuovo ? bloccoNuovo : null;
  const datoInSilenzio = datoNuovo !== null && (modoDati === "celle" || (datoInModifica?.indice === datoNuovo && !datoInModifica.comune)) ? datoNuovo : null;
  // La scheda del pannello: i dati o i casi d'uso.
  const [scheda, setScheda] = useState<"dati" | "casi">("dati");
  // I casi d'uso: il caso scelto (sotto di lui le sue differenze), quello di cui si scrivono i campi, quello appena
  // aggiunto con la cronologia di prima (rinunciando ai suoi campi sparisce senza lasciare un passo, come un dato), quello
  // che si sta per eliminare (la finestra di conferma è aperta).
  const [casoScelto, setCasoScelto] = useState<number | null>(null);
  const [casoInModifica, setCasoInModifica] = useState<{ indice: number; bozza: BozzaDelCaso; seleziona?: true } | null>(null);
  const [casoAggiunto, setCasoAggiunto] = useState<{ indice: number; prima: Cronologia } | null>(null);
  const [eliminandoCaso, setEliminandoCaso] = useState<{ indice: number; nome: string } | null>(null);
  // «Esegui tutti» (o i selezionati) in corso, e l'ultimo esito di ogni caso, per funzione e nome (`chiaveDelCaso`: i nomi
  // dei casi sono unici fra quelli di una funzione, e il pallino segue il caso spostato), col progetto e i limiti con cui
  // è stato ottenuto: con un progetto diverso (una modifica) il pallino dice che va eseguito di nuovo, e Annulla fino a
  // quel progetto lo riaccende. I casi selezionati, per funzione e nome: stanno nella finestra, non nel file; Annulla e
  // Ripeti riportano la spunta dei casi che tornano.
  const [tutti, setTutti] = useState<TuttiICasi | null>(null);
  const [esitiPerNome, setEsitiPerNome] = useState<ReadonlyMap<string, { readonly progetto: Progetto; readonly limiti: Tetti; readonly esito: EsitoDelCaso }>>(new Map());
  const [selezionati, setSelezionati] = useState<ReadonlySet<string>>(new Set());
  // I casi della scheda mostrata: del programma principale, o della procedura o funzione (eseguita da sola).
  const funzioneDeiCasi = nelProgramma ? undefined : mostrata.id;
  const casi = casiDella(progetto, funzioneDeiCasi);
  const chiaveDiUnCaso = (nome: string) => chiaveDelCaso(mostrata.id, nome);
  // Le voci dei casi possono andare anche ai dati di lavoro delle procedure chiamate che una lettura riceve.
  const dalleProcedureChiamate = useMemo(() => datiLettiAltrove(progetto, mostrata.id), [progetto, mostrata.id]);
  // Un nome che non è più di un caso (tolto, o rinominato da Annulla) esce dalla selezione: un caso nuovo che ne prende il
  // nome non nasce selezionato, e «Esegui i selezionati (n)» conta e esegue gli stessi casi.
  useEffect(() => {
    const ci = chiaviDeiCasi(progetto);
    if ([...selezionati].some((n) => !ci.has(n))) setSelezionati((s) => new Set([...s].filter((n) => ci.has(n))));
  }, [progetto, selezionati]);
  // La selezione di ogni progetto della cronologia, l'ultima volta che era quello di adesso: Annulla e Ripeti la riportano
  // ai casi che tornano (`selezioneDopoIlPasso`).
  const selezioniRicordate = useRef(new WeakMap<Progetto, ReadonlySet<string>>());
  useEffect(() => {
    selezioniRicordate.current.set(progetto, selezionati);
  }, [progetto, selezionati]);
  // Un'altra scheda mostra altri casi: la scelta e i campi della scheda di prima si chiudono (i campi sono già un passo);
  // il caso finito in una scheda tornata da sola alla sua radice si sceglie qui, e qui si aprono i campi del caso salvato
  // da un'esecuzione nella scheda della sua radice.
  const casoDopoLaScheda = useRef<number | null>(null);
  const campiDopoLaScheda = useRef<{ indice: number; bozza: BozzaDelCaso; prima: Cronologia } | null>(null);
  useEffect(() => {
    setCasoScelto(casoDopoLaScheda.current);
    casoDopoLaScheda.current = null;
    const campi = campiDopoLaScheda.current;
    campiDopoLaScheda.current = null;
    setCasoInModifica(campi ? { indice: campi.indice, bozza: campi.bozza, seleziona: true } : null);
    setCasoAggiunto(campi ? { indice: campi.indice, prima: campi.prima } : null);
  }, [mostrata.id]);
  const nomi = nomiDegliOperatori[lingua];
  // Una Scrittura che il disegno mostra dentro la sua Lettura non ha un blocco: la scelta è quella della Lettura.
  const mostratoDi = (id: string) => coppieDelleScritture.get(id)?.lettura ?? id;
  const scelto = selezionato !== null && trova(progetto, selezionato) !== undefined ? mostratoDi(selezionato) : null;
  const ancoraScelta = scelto !== null && scelta?.ancora != null && trova(progetto, scelta.ancora) !== undefined ? mostratoDi(scelta.ancora) : null;
  // Il tratto scelto: i blocchi che il disegno mostra dall'ancora al blocco scelto, con le coppie intere; senza ancora (o
  // con un'ancora in un'altra funzione) il blocco solo. I blocchi del tratto per `id`, e quanti il disegno ne mostra.
  const trattoScelto = useMemo(
    () => (scelto === null ? undefined : ((ancoraScelta !== null ? trattoDellaVista(progetto, ancoraScelta, scelto, coppieDelProgetto) : undefined) ?? trattoDellaVista(progetto, scelto, scelto, coppieDelProgetto))),
    [progetto, scelto, ancoraScelta, coppieDelProgetto],
  );
  const blocchiScelti = useMemo(() => new Set(trattoScelto ? blocchiDelTratto(progetto, trattoScelto).map((b) => b.id) : []), [progetto, trattoScelto]);
  /** Quanti blocchi del tratto il disegno mostra: una Lettura con la domanda e la sua Scrittura sono uno. */
  const mostratiNel = (t: Tratto) => blocchiDelTratto(progetto, t).filter((b) => !coppieDelleScritture.has(b.id)).length;
  const quantiScelti = trattoScelto ? mostratiNel(trattoScelto) : 0;
  /** Il tratto di un comando sul blocco `id` (Taglia, Copia, Elimina, lo spostamento): quello scelto, se il blocco ne fa
   * parte; se no il blocco solo. */
  const trattoDi = (id: string): Tratto | undefined => (trattoScelto !== undefined && blocchiScelti.has(id) ? trattoScelto : trattoDellaVista(progetto, id, id, coppieDelProgetto));
  // Il valore iniziale scelto, finché il suo blocco c'è (il dato ha un valore, e il flowchart mostra i valori).
  const rigaScelta = valoreScelto !== null && valoriIniziali === "mostrati" ? datoDellaRiga(progetto, valoreScelto, mostrata.id) : undefined;
  const sceltoValore = rigaScelta?.dato.initial !== undefined ? valoreScelto : null;
  /** Il valore iniziale si toglie: non quello di una costante, né di una costante comune (in sola lettura). */
  const siToglie = (r: ReturnType<typeof datoDellaRiga>) => r !== undefined && !r.comune && r.dato.constant !== true && r.dato.initial !== undefined;

  // L'esecuzione, se ce n'è una: l'oggetto del nucleo, che cambia da sé a ogni fetta; `ridisegna` fa leggere
  // alla finestra il suo stato nuovo. Nulla di ciò che si mostra si ricalcola qui: stato, blocco della pausa,
  // console ed errore vengono dall'`Esecuzione`.
  const [esecuzione, setEsecuzione] = useState<Esecuzione<CasoDiUnaFunzione> | null>(null);
  const [giro, ridisegna] = useReducer((n: number) => n + 1, 0);
  const statoEs = esecuzione?.stato;
  const situazione = situazioneDi(esecuzione);
  // Durante l'esecuzione (e durante «Esegui tutti») flowchart, dati e casi sono in sola lettura; a esecuzione finita si
  // modificano di nuovo.
  const inEsecuzione = situazione === "in pausa" || situazione === "in corso" || situazione === "chiede" || tutti !== null;
  // Il caso d'uso dall'ultima esecuzione: nessun comando con la casella delle Impostazioni spenta; se no il caso (della
  // radice dell'esecuzione), o il motivo per cui non c'è. Il programma (o i limiti) cambiato dopo la fine non lo dà più:
  // il caso non sarebbe di quel programma; un caso d'uso cambiato sì, e Annulla fino al programma di allora lo riporta.
  const stessoProgrammaDellEsecuzione = useMemo(() => esecuzione !== null && stessoProgramma(esecuzione.progetto, progetto) && JSON.stringify(esecuzione.limiti) === JSON.stringify(limiti), [esecuzione, progetto, limiti]);
  const composto = esecuzione !== null && situazione === "finita" ? casoDallEsecuzione(esecuzione) : ({ ok: false, motivo: "non finita" } as const);
  const dallUltima: { readonly motivo: string } | { readonly caso: Extract<DallEsecuzione, { ok: true }>; readonly radice: string | undefined } | undefined = !scelte.offriCasoDallEsecuzione
    ? undefined
    : !composto.ok
      ? { motivo: composto.motivo === "output perso" ? testi.casoDallEsecuzioneOutputPerso : testi.casoDallEsecuzioneNonFinita }
      : !stessoProgrammaDellEsecuzione
        ? { motivo: testi.casoDallEsecuzioneCambiato }
        : { caso: composto, radice: esecuzione!.funzione };
  // Il blocco della pausa; sul valore iniziale di un dato, il suo blocco sotto «Inizio», o «Inizio» se le Impostazioni
  // nascondono i valori iniziali (l'esecuzione non cambia: cambia solo che cosa si evidenzia).
  // Il valore iniziale si evidenzia solo nella scheda della sua funzione (un'altra può avere un dato con lo stesso nome).
  const pausa = statoEs?.genere === "pausa" ? statoEs : undefined;
  const funzioneDellaPausa = pausa === undefined ? undefined : (pausa.funzione ?? principaleDi(esecuzione!.progetto).id);
  // Il valore iniziale corrente, se il disegno lo mostra; se no «Inizio» (i valori nascosti, o una costante comune nella
  // procedura o funzione eseguita da sola: il suo valore iniziale si disegna solo nel programma principale).
  const correnteValore =
    pausa?.dato !== undefined && valoriIniziali === "mostrati" && funzioneDellaPausa === mostrata.id && disegno.elementi.some((e) => e.dato === pausa.dato) ? pausa.dato : null;
  const corrente = pausa === undefined ? null : pausa.dato === undefined ? pausa.blocco : correnteValore === null ? funzioneDellaPausa! : null;
  // In un ciclo, la parte del riquadro: il disegno evidenzia il suo blocco, se la forma del ciclo ce l'ha.
  const faseCorrente = pausa?.fase ?? null;
  const campoCorrente = pausa?.campo ?? null;
  const internoCorrente = pausa?.interno === true;
  const erroreFinale = statoEs?.genere === "finita" ? statoEs.errore : undefined;
  // Il testo dell'errore che ha fermato l'esecuzione: quello del risultato, sulla fine di una funzione (la stringa
  // restituita troppo lunga).
  const testoDellErroreFinale =
    erroreFinale && esecuzione ? testoDelMessaggio(lingua, erroreFinale.code, esecuzione.progetto.functions.some((f) => f.kind === "function" && f.end.id === erroreFinale.block), tettoDelleChiamate(esecuzione.progetto)) : undefined;
  // Il codice del linguaggio mostrato, rigenerato a ogni modifica del progetto e al cambio di lingua; solo con «Genera»
  // premuto.
  const codice = useMemo(() => (conCodice ? codiceDi(progetto, limiti, linguaggio, lingua) : null), [conCodice, progetto, limiti, linguaggio, lingua]);
  // Le righe del blocco della pausa (o della dichiarazione del dato, sul suo valore iniziale) e quelle del blocco
  // dell'errore che ha fermato l'esecuzione, lette dalla provenienza che il generatore dà a ogni riga. Con «Esegui»
  // una pausa c'è solo a un punto di interruzione.
  const passi = esecuzione?.passi ?? 0;
  // La tabella di traccia del progetto eseguito, nella lingua, col separatore dei decimali e la forma dei vettori delle
  // Impostazioni: le stesse celle che si esportano col CSV «uguale».
  // La versione della tabella mostrata: durante «tutto insieme» quella dell'ultima fermata (la tabella si aggiorna
  // quando l'esecuzione si ferma, non a ogni fetta). Di un'esecuzione appena cominciata, la sua: una seconda esecuzione
  // uguale finisce con lo stesso conto della prima, e col conto rimasto dalla prima la tabella non si ridisegnava più.
  const versioneMostrata = useRef<{ readonly es: Esecuzione<CasoDiUnaFunzione>; readonly versione: number } | null>(null);
  if (esecuzione && (statoEs?.genere !== "in corso" || versioneMostrata.current?.es !== esecuzione))
    versioneMostrata.current = { es: esecuzione, versione: esecuzione.passi + esecuzione.traccia.tolte + esecuzione.traccia.righe.length };
  const versioneDellaTabella = versioneMostrata.current?.versione ?? 0;
  const separatori = separatoriDelCsv(scelte, lingua);
  const tabellaMostrata = useMemo(
    () =>
      esecuzione
        ? new TabellaMostrata(
            esecuzione.progetto,
            testiDellaTraccia(lingua),
            separatori.decimali,
            scelte.formaDeiVettori,
            valoreRipetuto,
            formeDeiCicli,
            esecuzione.funzione,
            RESTITUITO_NELLA_RIPRESA,
            scelte.formaDelleMatrici,
            scelte.formaDelleTabelle,
          )
        : null,
    [esecuzione, lingua, separatori.decimali, scelte.formaDeiVettori, scelte.formaDelleMatrici, scelte.formaDelleTabelle, valoreRipetuto, formeDeiCicli],
  );
  // «Dove sei»: la pila delle chiamate del nucleo, come la tabella all'ultima fermata durante un comando in corso (di
  // un'esecuzione appena cominciata, la sua).
  const pilaMostrata = useRef<{ readonly es: Esecuzione<CasoDiUnaFunzione>; readonly pila: readonly LivelloDellaPila[] } | null>(null);
  if (esecuzione && (statoEs?.genere !== "in corso" || pilaMostrata.current?.es !== esecuzione)) pilaMostrata.current = { es: esecuzione, pila: esecuzione.pila };
  const pila = esecuzione && pilaMostrata.current?.es === esecuzione ? pilaMostrata.current.pila : [];
  // Le righe del codice delle chiamate in corso ai livelli di sopra (i blocchi della pila tranne l'ultimo), con lo sfondo
  // del livello che ciascuna apre. Sull'errore, la parte del ciclo dell'ultima azione, se è del blocco dell'errore (un
  // errore nel controllo di un `per` evidenzia la riga del controllo, non tutte quelle del ciclo). La pausa su un campo
  // della copia di un record evidenzia la riga di quel campo; quella del ciclo delle colonne della copia di una matrice, la
  // riga di quel ciclo.
  const evidenziate = useMemo((): RigheEvidenziate | null => {
    // Durante «tutto insieme» non c'è né pausa né errore: le chiamate non si calcolano (la pila cambia a ogni fetta).
    if (!codice?.generato || (!pausa && !erroreFinale)) return null;
    // Una volta per blocco e parte del ciclo (con la ricorsione centinaia di livelli chiamano dallo stesso blocco), con lo
    // sfondo del più profondo; la parte del ciclo del livello (un `per` che chiama dai suoi limiti accende la partenza).
    const visti = new Set<string>();
    const chiamate: { righe: number[]; sfondo: number }[] = [];
    for (let k = pila.length - 2; k >= 0; k--) {
      const l = pila[k]!;
      const chiave = `${l.blocco} ${l.fase ?? ""}`;
      if (visti.has(chiave)) continue;
      visti.add(chiave);
      chiamate.push({ righe: righeDi(codice.righe, { blocco: l.blocco, ...(l.fase !== undefined ? { fase: l.fase } : {}) }), sfondo: sfondoDelLivello(k + 1)! });
    }
    chiamate.reverse();
    if (pausa)
      return {
        righe: righeDi(
          codice.righe,
          pausa.dato !== undefined
            ? { dato: pausa.dato }
            : {
                blocco: pausa.blocco,
                ...(pausa.fase !== undefined ? { fase: pausa.fase } : {}),
                ...(pausa.campo !== undefined ? { campo: pausa.campo } : {}),
                ...(pausa.interno === true ? { interno: true as const } : {}),
              },
        ),
        genere: "corrente",
        passo: passi,
        chiamate,
      };
    if (erroreFinale) {
      const ultima = esecuzione?.traccia.righe.at(-1);
      const fase = ultima?.blocco === erroreFinale.block ? ultima.fase : undefined;
      const interno = ultima?.blocco === erroreFinale.block && ultima.interno === true;
      // L'errore dentro la copia di un record accende la riga del campo, come la pausa.
      const campo = ultima?.blocco === erroreFinale.block ? ultima.campo : undefined;
      return {
        righe: righeDi(codice.righe, { blocco: erroreFinale.block, ...(fase !== undefined ? { fase } : {}), ...(campo !== undefined ? { campo } : {}), ...(interno ? { interno: true as const } : {}) }),
        genere: "errore",
        passo: passi,
        chiamate,
      };
    }
    return null;
  }, [codice, pausa, erroreFinale, passi, pila, esecuzione]);
  // La lettura che l'esecuzione aspetta, coi nomi da mostrare: il dato col suo indice (un parametro vettore della funzione
  // eseguita da sola si chiede elemento per elemento); dentro una procedura, il nome scritto nel blocco della lettura e, se
  // il valore va a un dato di chi chiama (un parametro per riferimento: la lettura nomina il dato che lo riceve, come la
  // voce di un caso), in parole quale: quello che il nucleo dice dietro il parametro (`origini`, col livello), mai
  // dedotto dai nomi.
  /** Il dato dietro un parametro per riferimento o di uscita, in parole: quello che il nucleo dice (`origine`), col nome
   * della funzione del suo livello e, se quella ha più chiamate in corso, il livello. */
  const dettoDalNucleo = (origine: Origine, uscita: boolean): string | undefined => {
    const f = esecuzione?.progetto.functions.find((x) => x.id === pila[origine.livello]?.funzione);
    if (!f) return undefined;
    const funzione = f.kind === "main" ? testi.schedaPrincipale : (f.name ?? "");
    const conLivello = pila.filter((l) => l.funzione === f.id).length > 1;
    const testo = conLivello ? (uscita ? testi.watchUscitaLivello : testi.watchRiferimentoLivello) : uscita ? testi.watchUscita : testi.watchRiferimento;
    return riempi(testo, { dato: origine.nome, funzione, livello: String(origine.livello) });
  };
  const chiesta = ((): { readonly nome: string; readonly di?: string } | null => {
    if (statoEs?.genere !== "chiede" || !esecuzione) return null;
    // Un parametro chiesto elemento per elemento (un vettore; una matrice riga dopo riga, coi due indici), campo per campo
    // (un record) o record per record e campo per campo (una tabella: l'elemento e il campo insieme, `t[0].nome`).
    const colonne = esecuzione.progetto.functions.find((f) => f.id === esecuzione.funzione)?.data.find((d) => d.name === statoEs.dato)?.columns;
    const indici = (k: number) => (colonne === undefined || colonne < 1 ? `[${k}]` : `[${Math.floor(k / colonne)}][${k % colonne}]`);
    const campo = statoEs.campo !== undefined ? `.${statoEs.campo}` : "";
    const nome = `${statoEs.dato}${statoEs.elemento !== undefined ? indici(statoEs.elemento) : ""}${campo}`;
    const l = pila.at(-1);
    const b = l === undefined ? undefined : trova(esecuzione.progetto, l.blocco);
    // Il dato della Lettura: il nome prima dell'indice di un elemento o del campo di un record.
    const scritto = b?.kind === "read" ? b.target.split(/[[.]/)[0]!.trim() : undefined;
    if (scritto === undefined || scritto === statoEs.dato) return { nome };
    const f = esecuzione.progetto.functions.find((x) => x.id === l!.funzione);
    const k = f?.data.findIndex((d) => d.name === scritto) ?? -1;
    const origine = esecuzione.traccia.righe.at(-1)?.dati.chiamate?.[pila.length - 2]?.origini[k];
    const di = origine === undefined ? undefined : dettoDalNucleo(origine, f?.data[k]?.parameter === "out");
    return { nome: scritto, ...(di !== undefined ? { di } : {}) };
  })();
  // La riga sopra la tabella: che cosa si vede dei vettori e che cosa ha il CSV, scritta dal nucleo.
  const spiegazione = useMemo(() => tabellaMostrata?.spiegazione(scelte.formaDelCsv), [tabellaMostrata, scelte.formaDelCsv]);
  // Il watch: i nomi dei dati nei blocchi (solo con un'esecuzione: fuori non c'è un valore da mostrare), il nome sotto
  // il puntatore e ciò che il nucleo ne dice, letto dalla riga corrente della tabella. Come la tabella, durante «tutto
  // insieme» resta all'ultima fermata (si ricalcola con la sua versione).
  const [puntato, setPuntato] = useState<NomePuntato | null>(null);
  // I nomi del watch sono i dati della funzione mostrata e le costanti comuni.
  const datiEseguiti = useMemo(() => (esecuzione ? new Set([...(costantiComuni ?? []), ...mostrata.data].map((d) => d.name)) : null), [esecuzione, costantiComuni, mostrata]);
  // E i nomi delle funzioni che restituiscono un valore: il watch sulla loro chiamata mostra ciò che hanno restituito lì.
  const funzioniEseguite = useMemo(() => (esecuzione ? new Set(esecuzione.progetto.functions.flatMap((f) => (f.kind === "function" ? [f.name!] : []))) : null), [esecuzione]);
  // Il watch legge i nomi nel disegno del progetto eseguito: a esecuzione finita, modificato il progetto, si spegne
  // (Annulla fino al progetto eseguito lo riaccende). In ogni scheda: i valori sono quelli della funzione mostrata, se è
  // attiva (il programma principale è la radice solo se non si esegue da sola una procedura o una funzione).
  const progettoEseguito = esecuzione !== null && progetto === esecuzione.progetto;
  const funzioneDelWatch = nelProgramma && esecuzione?.funzione === undefined ? undefined : mostrata.id;
  const nomiNelDisegno = useMemo(
    () =>
      datiEseguiti && progettoEseguito
        ? nomiDelDisegno(disegno, mostrata, geometriaPredefinita, misuraDelTesto, testiDelDisegno(lingua), formeDeiCicli, datiEseguiti, comuniNelDisegno ?? [], funzioniEseguite ?? undefined, progetto.records ?? [])
        : undefined,
    [disegno, mostrata, misuraDelTesto, lingua, formeDeiCicli, datiEseguiti, progettoEseguito, comuniNelDisegno, funzioniEseguite, progetto.records],
  );
  const nomiDeiValori = useMemo(
    () =>
      datiEseguiti && progettoEseguito
        ? nomiDeiValoriIniziali(disegno, [...(comuniNelDisegno ?? []), ...mostrata.data], geometriaPredefinita, misuraDelTesto, testiDelDisegno(lingua), valoreRipetuto, datiEseguiti)
        : undefined,
    [disegno, comuniNelDisegno, mostrata, misuraDelTesto, lingua, valoreRipetuto, datiEseguiti, progettoEseguito],
  );
  // Il watch fermato dal clic su un nome: resta finché non si chiude (×, Esc, un altro clic sullo stesso nome); il clic
  // su un altro nome ferma quello.
  const [fermo, setFermo] = useState<NomePuntato | null>(null);
  // Il livello scelto in «Dove sei», fino alla fermata dopo (un'azione, una ripresa, la fine, un'esecuzione nuova): il
  // watch di una funzione con più chiamate in corso mostra quella. Lo stato dell'esecuzione è un oggetto nuovo a ogni
  // fermata.
  const [livelloScelto, setLivelloScelto] = useState<{ readonly stato: Esecuzione["stato"]; readonly livello: number } | null>(null);
  const livelloDelWatch = statoEs !== undefined && livelloScelto?.stato === statoEs ? livelloScelto.livello : undefined;
  // Il riquadro fermo aperto dalla tastiera (Maiusc+F9 su un blocco): il blocco, a cui il fuoco torna quando si chiude, e
  // quale dei suoi nomi mostra; il clic su un nome lo apre dal puntatore del mouse.
  const [fermoDaTastiera, setFermoDaTastiera] = useState<{ readonly blocco: SVGGElement; readonly indice: number } | null>(null);
  const fermaIlWatch = useCallback((nome: NomePuntato) => {
    setFermoDaTastiera(null);
    setFermo((f) => (f?.elemento === nome.elemento ? null : nome));
  }, []);
  const chiudiIlFermo = useCallback(() => setFermo(null), []);
  // Un oggetto solo per tutta la vita del riquadro fermo: il watch non si ridisegna a ogni fetta.
  const conIlFermo = useMemo(() => ({ chiudi: chiudiIlFermo }), [chiudiIlFermo]);
  /** Maiusc+F9 su un blocco (o sulla fine di una funzione) durante l'esecuzione: il riquadro fermo del primo nome di un
   * dato o di una funzione nel blocco, col fuoco; di nuovo, quello del nome dopo. I nomi sono quelli disegnati nel blocco,
   * gli stessi su cui passa il puntatore del mouse, ognuno una volta (in «somma ← somma + voto» «somma» è un dato solo);
   * senza nomi, l'avviso. */
  const watchDaTastiera = useCallback(
    (blocco: SVGGElement) => {
      const visti = new Set<string>();
      const nomi = [...blocco.querySelectorAll<SVGGElement>("[data-watch-dato], [data-watch-funzione]")].filter((g) => {
        const funzione = g.getAttribute("data-watch-funzione");
        const chiave = funzione !== null ? `funzione ${funzione}` : `dato ${g.getAttribute("data-watch-dato")}`;
        if (visti.has(chiave)) return false;
        visti.add(chiave);
        return true;
      });
      if (nomi.length === 0) {
        setAvviso(testi.watchSenzaDati);
        return;
      }
      const indice = fermo !== null && fermoDaTastiera?.blocco === blocco ? (fermoDaTastiera.indice + 1) % nomi.length : 0;
      const g = nomi[indice]!;
      const funzione = g.getAttribute("data-watch-funzione");
      const chi = blocco.getAttribute("data-blocco") ?? blocco.getAttribute("data-restituisce");
      setFermoDaTastiera({ blocco, indice });
      setFermo(funzione !== null && chi !== null ? { dato: funzione, elemento: g, chiamataIn: chi } : { dato: g.getAttribute("data-watch-dato")!, elemento: g });
    },
    [fermo, fermoDaTastiera, testi],
  );
  const conLaTastiera = useMemo(
    () => (fermoDaTastiera ? { ritorno: fermoDaTastiera.blocco, prossimo: () => watchDaTastiera(fermoDaTastiera.blocco) } : undefined),
    [fermoDaTastiera, watchDaTastiera],
  );
  const versioneDelWatch = versioneDellaTabella;
  const datoNelWatch = useMemo(
    () => (puntato && esecuzione && tabellaMostrata ? nelWatch(tabellaMostrata, esecuzione.traccia, puntato, funzioneDelWatch, livelloDelWatch) : undefined),
    // La versione dice quando la tabella è cambiata: la traccia cambia da sé.
    [puntato, esecuzione, tabellaMostrata, versioneDelWatch, funzioneDelWatch, livelloDelWatch],
  );
  const datoNelFermo = useMemo(
    () => (fermo && esecuzione && tabellaMostrata ? nelWatch(tabellaMostrata, esecuzione.traccia, fermo, funzioneDelWatch, livelloDelWatch) : undefined),
    [fermo, esecuzione, tabellaMostrata, versioneDelWatch, funzioneDelWatch, livelloDelWatch],
  );
  /** Per un parametro per riferimento o di uscita, il dato che lo riceve davvero, in parole. */
  const riferimentoNelWatch = (d: DatoNelWatch | ChiamataNelWatch | undefined): string | undefined =>
    d === undefined || "chiamate" in d || d.origine === undefined ? undefined : dettoDalNucleo(d.origine, mostrata.data.find((x) => x.name === d.nome)?.parameter === "out");
  // Senza esecuzione, o col progetto modificato dopo la fine, il watch si chiude, anche fermo; Esc chiude tutti e due
  // (il riquadro del puntatore torna puntando di nuovo il nome), se non l'ha già usato chi sta sopra (una finestra).
  useEffect(() => {
    if (!progettoEseguito) {
      setPuntato(null);
      setFermo(null);
    }
  }, [progettoEseguito]);
  useEffect(() => {
    if (puntato === null && fermo === null) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setPuntato(null);
        setFermo(null);
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [puntato, fermo]);

  // L'esecuzione animata: un passo alla volta da sola, uno ogni durata della velocità scelta, come «Entra» (entra nelle
  // chiamate e si ferma anche sulla ripresa dopo un ritorno; la scheda segue l'azione). Un clic su «Animata»
  // da una pausa fa subito un passo (da ferma comincia un'esecuzione, fermandosi sulla prima azione); una lettura
  // aspetta il valore, poi l'animata riprende. La fermano un punto di interruzione raggiunto, la fine, F5, F10,
  // «Ferma» e un secondo clic.
  const [animata, setAnimata] = useState(false);
  const animataOra = useRef(false);
  animataOra.current = animata;
  const subito = useRef(false);
  // Senza esecuzione (dopo «Ferma», Nuovo, Apri, un esempio) l'animata non è più premuta.
  useEffect(() => {
    if (!esecuzione) setAnimata(false);
  }, [esecuzione]);
  /** Il nome di un blocco (o della fine) di quel progetto, negli annunci e nella console. Un errore di un dato (l'errore
   * statico di un caso) sta sulla funzione: si nomina col suo inizio, dove stanno i valori iniziali. Un blocco che non
   * c'è più (cancellato dopo che un caso ne attendeva l'errore) si dice tolto, non «Fine». */
  const nomeIn = (p: Progetto) => (id: string) => {
    const b = trova(p, id);
    if (b) return nomeDelBlocco(b, testi, espressione ?? ((t) => t), p.functions);
    if (p.functions.some((f) => f.id === id)) return testi.disegnoInizio;
    // La fine di una funzione si nomina col suo testo («Restituisce …»), quella di una procedura e del programma «Fine».
    const f = p.functions.find((x) => x.end.id === id);
    return f ? partiDellaFine(f, testiDelDisegno(lingua)).map((x) => x.testo).join("") : testi.bloccoTolto;
  };
  const nomeDi = nomeIn(progetto);
  // Ciò che manca al progetto nel linguaggio mostrato, coi posti in parole: la colonna del codice ne mostra frase e posto,
  // il clic porta al posto. Lo stesso elenco finché non cambia il codice (il riquadro del codice non si ridisegna invano).
  const vociDiCioCheManca = useMemo(
    () => (codice && !codice.generato && codice.perche === "non-ci-sta" ? vociDelleMancanze(codice.mancanze, progetto, lingua, testi, nomeIn(progetto)) : []),
    // `nomeIn` cambia a ogni disegno: dipende da progetto, testi, espressione e lingua, qui fra le dipendenze.
    [codice, progetto, lingua, testi, espressione],
  );
  /** Lo spostamento dei blocchi dal blocco `id` all'`ancora` (senza, il blocco solo), coi «+» su cui non vanno; `null` se
   * uno dei due non c'è più. Una Lettura con la domanda si sposta con la sua Scrittura. */
  const spostamentoFra = useCallback(
    (id: string, ancora: string | null): Spostamento | null => {
      const t = trattoDellaVista(progetto, ancora ?? id, id, coppieDelProgetto);
      if (t === undefined) return null;
      // La copia che segue il puntatore: i blocchi impaginati da soli, col loro contenuto.
      const copia = copiaDelBlocco(disegna(soloIlBlocco(mostrata, blocchiDelTratto(progetto, t)), [], progetto.functions, progetto.records), id, disegno);
      return { id, ...(ancora !== null && ancora !== id ? { ancora } : {}), escluso: escluso(progetto, t), dentro: sottoalberoDelTratto(progetto, t), copia };
    },
    [progetto, mostrata, disegna, disegno, coppieDelProgetto],
  );
  /** Il trascinamento comincia su un blocco: col tratto scelto, se il blocco ne fa parte; se no il blocco solo. */
  const perSpostare = (id: string): Spostamento =>
    (blocchiScelti.has(id) && scelto !== null ? spostamentoFra(scelto, ancoraScelta) : spostamentoFra(id, null)) ?? { id, escluso: () => true, dentro: new Set(), copia: null };
  const inMovimento = useMemo(() => (spostando === null ? null : spostamentoFra(spostando.id, spostando.ancora)), [spostando, spostamentoFra]);
  // Con più blocchi scelti e la casella delle Impostazioni, il riquadro intorno a loro: quello della copia che il
  // trascinamento farebbe seguire al puntatore, portata sul disegno.
  const riquadroDellaScelta = useMemo(() => {
    if (!scelte.riquadroDellaScelta || quantiScelti < 2 || scelto === null) return null;
    const copia = spostamentoFra(scelto, ancoraScelta)?.copia;
    return copia ? riquadroDellaCopia(copia) : null;
  }, [scelte.riquadroDellaScelta, quantiScelti, scelto, ancoraScelta, spostamentoFra]);

  // Il controllo statico del nucleo sul progetto: la riga di stato e i segni nel disegno e sulle righe dei
  // dati. Le segnalazioni della vista dei dati vengono dato per dato (`controllo.dati`); quelle della
  // funzione, che non dicono il dato, non si ripetono. Quelle dell'elemento appena nato si tacciono.
  const controllo = useMemo(() => controlla(progetto, limiti), [progetto, limiti]);
  // I testi dei codici col tetto delle chiamate del progetto (i tetti della ricorsione ne dicono il numero).
  const codici = useMemo(() => testiDeiCodiciCol(lingua, tettoDelleChiamate(progetto)), [lingua, progetto]);
  const voci = useMemo((): VoceDelControllo[] => {
    if (controllo.fuoriTappa) return [];
    const disegnoDiOra = testiDelDisegno(lingua);
    // Ciò che sta in una procedura o in una funzione si dice col suo nome davanti.
    const nellaFunzione = (f: Funzione, dove: string) => (f.kind === "main" ? dove : riempi(testi.voceNellaFunzione, { funzione: f.name ?? "", dove }));
    // Gli errori e gli avvisi di un dato il controllo li dà anche sulla sua funzione: quelli la vista dei dati li dice dato
    // per dato, e qui non si ripetono. Restano gli errori della funzione stessa (il suo nome, il valore predefinito).
    const deiDati = new Map<string, number>();
    const chiaveDel = (genere: string, block: string, code: string) => `${genere} ${block} ${code}`;
    for (const s of controllo.dati) if (!s.comune) deiDati.set(chiaveDel(s.genere, s.funzione, s.code), (deiDati.get(chiaveDel(s.genere, s.funzione, s.code)) ?? 0) + 1);
    const delBlocco =
      (genere: "errore" | "avviso") =>
      (s: { code: string; block: string }): VoceDelControllo[] => {
        if (s.block === bloccoInSilenzio) return [];
        const b = trova(progetto, s.block);
        const chiave = chiaveDel(genere, s.block, s.code);
        const ripetuti = b ? 0 : (deiDati.get(chiave) ?? 0);
        if (ripetuti > 0) {
          deiDati.set(chiave, ripetuti - 1);
          return [];
        }
        // Il blocco di una funzione, la funzione stessa (il nome, il valore predefinito) o la sua fine (ciò che restituisce).
        const f = b ? funzioneCon(progetto, s.block) : progetto.functions.find((x) => x.id === s.block || x.end.id === s.block);
        if (!f) return [];
        // Il dato letto prima di avere un valore: i dati li dice il controllo, per la funzione e la posizione.
        const senzaValore =
          s.code === "maybe_uninitialized"
            ? controllo.primaDelValore
                .filter((l) => l.block === s.block)
                .map((l) => ({ nome: datiDi(progetto, l.funzione)[l.indice]?.name ?? "", chiave: chiaveDellaRiga(false, l.indice), funzione: l.funzione }))
            : undefined;
        // Il riferimento senza valore: per i parametri che lo ricevono, e che la procedura non legge prima di dar loro un
        // valore, la correzione verso il passaggio per uscita (mai per uno letto prima: lì servirebbe il valore). Il nome
        // è quello della scheda mostrata: nella procedura il parametro, altrove l'argomento come lo scrive il salto.
        const versoOut =
          s.code === "reference_without_value" && b?.kind === "call"
            ? controllo.senzaValoreAlSalto
                .filter((a) => a.block === s.block && controllo.versoOut.some((v) => v.funzione === a.funzione && v.indice === a.indice))
                .map((a) => {
                  const dati = datiDi(progetto, a.funzione);
                  const parametro = dati[a.indice];
                  const argomento = b.arguments[dati.filter((d) => d.parameter !== undefined).indexOf(parametro!)] ?? "";
                  const nome = mostrata.id === a.funzione ? (parametro?.name ?? "") : (espressione ?? ((t: string) => t))(argomento);
                  return { nome, funzione: a.funzione, indice: a.indice };
                })
            : [];
        const testo = b
          ? nomeDelBlocco(b, testi, espressione ?? ((t) => t), progetto.functions)
          : (s.block === f.id ? partiDellIntestazione(f, disegnoDiOra) : partiDellaFine(f, disegnoDiOra)).map((p) => p.testo).join("");
        // Sulla funzione stessa (le misure del risultato) o sulla sua fine, l'errore è sul risultato: il suo testo.
        const sulRisultato = !b && f.kind === "function";
        return [
          {
            genere,
            codice: s.code,
            dove: nellaFunzione(f, testo),
            blocco: b ? b.id : null,
            ...(!b && s.block === f.end.id ? { fine: f.end.id } : {}),
            dato: null,
            funzione: f.id,
            breve: testoDellaSegnalazione(lingua, s.code as Codice, sulRisultato, fermataDel(controllo.fermate, s)).breve,
            ...(senzaValore ? { senzaValore } : {}),
            ...(versoOut.length > 0 ? { versoOut } : {}),
          },
        ];
      };
    const dati = controllo.dati
      .filter((s) => s.comune || s.funzione !== mostrata.id || s.indice !== datoInSilenzio)
      .map((s): VoceDelControllo => {
        const f = s.comune ? undefined : progetto.functions.find((x) => x.id === s.funzione);
        const d = (s.comune ? (progetto.shared_constants ?? []) : (f?.data ?? []))[s.indice]!;
        const voce = riempi(testi.voceDelDato, { tabella: s.comune ? testi.costantiComuni : testi.dati, nome: d.name || testi.datoSenzaNome });
        return {
          genere: s.genere,
          codice: s.code,
          dove: f ? nellaFunzione(f, voce) : voce,
          blocco: null,
          dato: chiaveDellaRiga(s.comune, s.indice),
          ...(f ? { funzione: f.id } : {}),
          breve: testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata).breve,
        };
      });
    // Gli errori dei record (del progetto, col blocco vuoto, che nessun blocco né funzione ha): uno per record e codice.
    const deiRecord = (controllo.record ?? [])
      .filter((s) => s.indice !== recordInSilenzio)
      .map((s): VoceDelControllo => ({
        genere: "errore",
        codice: s.code,
        dove: riempi(testi.voceDelDato, { tabella: testi.recordTitolo, nome: progetto.records?.[s.indice]?.name || testi.datoSenzaNome }),
        blocco: null,
        dato: chiaveDelRecord(s.indice),
        breve: testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata).breve,
      }));
    const errori = dati.filter((v) => v.genere === "errore");
    const avvisi = dati.filter((v) => v.genere === "avviso");
    return [...deiRecord, ...errori, ...controllo.errori.flatMap(delBlocco("errore")), ...controllo.avvisi.flatMap(delBlocco("avviso")), ...avvisi];
  }, [controllo, progetto, mostrata, lingua, testi, espressione, codici, bloccoInSilenzio, datoInSilenzio, recordInSilenzio]);
  // I segni sulle righe della vista dei dati: i dati della funzione mostrata e, nel programma principale, le costanti comuni.
  const segni = useMemo((): Segni => {
    const dati = new Map<number, SegnalazioneMostrata[]>();
    const comuni = new Map<number, SegnalazioneMostrata[]>();
    if (!controllo.fuoriTappa)
      for (const s of controllo.dati) {
        if (!s.comune && (s.funzione !== mostrata.id || s.indice === datoInSilenzio)) continue;
        const m = s.comune ? comuni : dati;
        m.set(s.indice, [...(m.get(s.indice) ?? []), { genere: s.genere, codice: s.code, ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata) }]);
      }
    return { dati, comuni };
  }, [controllo, lingua, datoInSilenzio, mostrata]);
  // I segni sui blocchi: gli errori e gli avvisi del controllo, e l'errore che ha fermato l'esecuzione. Agli
  // ausili il blocco dice i loro testi, e il suo punto di interruzione.
  const segnati = useMemo(() => {
    const m = new Map<string, "errore" | "avviso">();
    for (const v of voci) {
      const id = v.blocco ?? v.fine;
      if (id !== undefined && m.get(id) !== "errore") m.set(id, v.genere);
    }
    if (erroreFinale) m.set(erroreFinale.block, "errore");
    return m;
  }, [voci, erroreFinale]);
  const descrizioni = useMemo(() => {
    const m = new Map<string, string[]>();
    const aggiungi = (id: string, testo: string) => m.set(id, [...(m.get(id) ?? []), testo]);
    if (erroreFinale && testoDellErroreFinale) aggiungi(erroreFinale.block, riempi(testi.erroreInEsecuzione, testoDellErroreFinale));
    for (const v of voci) {
      const id = v.blocco ?? v.fine;
      if (id !== undefined) aggiungi(id, riempi(v.genere === "errore" ? testi.segnalazioneErrore : testi.segnalazioneAvviso, { breve: v.breve }));
    }
    for (const id of interruzioni) aggiungi(id, testi.descrizionePunto);
    return new Map([...m].map(([id, parti]) => [id, parti.join(" ")]));
  }, [voci, erroreFinale, testoDellErroreFinale, interruzioni, testi]);

  // Il blocco in modifica e gli errori del progetto CANDIDATO (il progetto coi campi scritti), di quel
  // blocco: sono quelli che il controllo darebbe confermando.
  const inScrittura = inModifica ? trova(progetto, inModifica.id) : undefined;
  // Dei campi aperti (di un blocco, la scheda o le celle di un dato), finché il loro bersaglio c'è.
  const rigaInScrittura = valoreInModifica ? datoDellaRiga(progetto, valoreInModifica.chiave, mostrata.id) : undefined;
  // Il dato dei campi aperti, finché c'è.
  const datoDeiCampi = datoInModifica ? (datoInModifica.comune ? (costantiComuni ?? []) : mostrata.data)[datoInModifica.indice] : undefined;
  // La funzione dei campi della sua fine, finché c'è (ed è una funzione).
  const funzioneDellaFine = fineInModifica ? progetto.functions.find((f) => f.id === fineInModifica.funzione && f.kind === "function") : undefined;
  // Il record dei campi aperti, finché c'è.
  const recordDeiCampi = recordInModifica ? progetto.records?.[recordInModifica.indice] : undefined;
  const campiAperti =
    inScrittura !== undefined ||
    funzioneDellaFine !== undefined ||
    datoDeiCampi !== undefined ||
    recordDeiCampi !== undefined ||
    rigaInScrittura !== undefined ||
    (casoInModifica !== null && casi[casoInModifica.indice] !== undefined);
  // Un bersaglio che sparisce (cancellato, tolto da Annulla) chiude i suoi campi e lo spostamento da tastiera.
  useEffect(() => {
    if (inModifica && !inScrittura) setInModifica(null);
    if (fineInModifica && !funzioneDellaFine) setFineInModifica(null);
    if (datoInModifica && datoDeiCampi === undefined) setDatoInModifica(null);
    if (recordInModifica && recordDeiCampi === undefined) setRecordInModifica(null);
    if (casoInModifica && casi[casoInModifica.indice] === undefined) setCasoInModifica(null);
    if (valoreInModifica && !rigaInScrittura) setValoreInModifica(null);
    if (spostando !== null && inMovimento === null) setSpostando(null);
  }, [inModifica, inScrittura, fineInModifica, funzioneDellaFine, datoInModifica, datoDeiCampi, valoreInModifica, rigaInScrittura, spostando, inMovimento, casoInModifica, casi]);
  // L'elemento appena nato non tace più quando i suoi campi si chiudono (o, nelle celle, quando il dato non c'è più: lì
  // la riga è già fatta di campi, e tace finché il fuoco non la lascia).
  useEffect(() => {
    if (bloccoNuovo !== null && inModifica?.id !== bloccoNuovo) setNuovo(null);
    if (datoNuovo !== null && (modoDati === "scheda" ? datoInModifica?.indice !== datoNuovo : mostrata.data[datoNuovo] === undefined)) setNuovo(null);
  }, [bloccoNuovo, datoNuovo, inModifica, datoInModifica, modoDati, mostrata]);
  // I campi del valore iniziale: gli errori e gli avvisi del suo dato nel progetto CANDIDATO.
  const candidatoDelValore = useMemo((): SegnalazioneMostrata[] => {
    if (!valoreInModifica || !rigaInScrittura || rigaInScrittura.comune) return [];
    const r = cambiaDato(rigaInScrittura.indice, conIlValoreDi(rigaInScrittura.dato, valoreInModifica.bozza), mostrata.id)(progetto, cronologia.prossimo);
    if (!r.ok) return [];
    const c = controlla(r.progetto, limiti);
    if (c.fuoriTappa) return [];
    return c.dati
      .filter((s) => !s.comune && s.funzione === mostrata.id && s.indice === rigaInScrittura.indice)
      .map((s) => ({ genere: s.genere, codice: s.code, ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata) }));
  }, [valoreInModifica, rigaInScrittura, mostrata, progetto, cronologia.prossimo, lingua, limiti]);
  /** I campi scritti come operazione, nella forma del file: con la domanda di una Lettura anche la Scrittura che la mostra,
   * in un passo solo. `undefined` se il passo di un `per` non si può scrivere nel file. */
  const operazioneDeiCampi = useMemo(
    () =>
      (id: string, bozza: BozzaDelBlocco, coppia: Coppia | undefined): Operazione | undefined => {
        const nuovi = campiDaBozza(bozza, nomi);
        if (nuovi === undefined) return undefined;
        const d = domandaDaBozza(bozza, nomi);
        return d === undefined ? campi(id, nuovi) : campiConLaDomanda(id, nuovi, d, coppia);
      },
    [nomi],
  );
  /** Se i campi scritti sono quelli che il blocco ha già, domanda compresa: confermarli non è un passo. */
  const campiDiPrima = (b: Blocco, bozza: BozzaDelBlocco, coppia: Coppia | undefined): boolean => {
    const nuovi = campiDaBozza(bozza, nomi);
    const d = domandaDaBozza(bozza, nomi);
    return nuovi !== undefined && stessiCampi(b, nuovi) && (d === undefined || (coppia ? stessaDomanda(d, coppia.domanda) : d.values.length === 0));
  };
  const segnalazioni = useMemo((): SegnalazioneMostrata[] => {
    if (!inModifica) return [];
    const operazione = operazioneDeiCampi(inModifica.id, inModifica.bozza, inModifica.coppia);
    // Un passo che non si può scrivere nel file: l'errore del passo, prima di ogni candidato.
    if (operazione === undefined) return [{ genere: "errore", codice: "invalid_step", ...codici.invalid_step }];
    const r = operazione(progetto, cronologia.prossimo);
    if (!r.ok) return [];
    const c = controlla(r.progetto, limiti);
    if (c.fuoriTappa) return [];
    // Con la domanda, anche gli errori della Scrittura che la mostra: nel candidato, il blocco subito prima della Lettura.
    const posto = inModifica.bozza.domanda?.length ? dove(r.progetto, inModifica.id) : undefined;
    const prima = posto && posto.indice > 0 ? bloccoNelPosto(r.progetto, { ...posto, indice: posto.indice - 1 }) : undefined;
    const suoi = new Set([inModifica.id, ...(prima?.kind === "write" ? [prima.id] : [])]);
    const mostra = (genere: "errore" | "avviso") => (s: { code: string; block: string }) => ({
      genere,
      codice: s.code,
      ...testoDellaSegnalazione(lingua, s.code as Codice, false, fermataDel(c.fermate, s)),
    });
    return [...c.errori.filter((e) => suoi.has(e.block)).map(mostra("errore")), ...c.avvisi.filter((a) => suoi.has(a.block)).map(mostra("avviso"))];
  }, [inModifica, progetto, cronologia.prossimo, codici, lingua, limiti, operazioneDeiCampi]);

  // I campi del dato in modifica: gli errori e gli avvisi di quel dato nel progetto CANDIDATO, dove va con la casella
  // «globale» (fra le costanti comuni, o fra i dati della funzione mostrata).
  /** Gli errori del record in quella posizione col nome e i campi della bozza, nel progetto candidato. */
  const erroriDelRecord = (p: Progetto, indice: number, bozza: BozzaDelRecord): SegnalazioneMostrata[] => {
    const op = passoDelRecord(p, indice, bozza);
    const r = op ? op(p, cronologia.prossimo) : ({ ok: true, progetto: p } as const);
    if (!r.ok) return [];
    const c = controlla(r.progetto, limiti);
    if (c.fuoriTappa) return [];
    return (c.record ?? []).filter((s) => s.indice === indice).map((s) => ({ genere: "errore", codice: s.code, ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata) }));
  };
  const candidatoDelRecord = useMemo(
    (): SegnalazioneMostrata[] => (!recordInModifica || recordInSilenzio !== null ? [] : erroriDelRecord(progetto, recordInModifica.indice, recordInModifica.bozza)),
    [recordInModifica, recordInSilenzio, progetto, cronologia.prossimo, lingua, limiti],
  );
  /** I segni sulle righe dei record: gli errori del controllo, record per record. */
  const segniDeiRecord = useMemo((): ReadonlyMap<number, readonly SegnalazioneMostrata[]> => {
    const m = new Map<number, SegnalazioneMostrata[]>();
    if (!controllo.fuoriTappa)
      for (const s of controllo.record ?? []) {
        if (s.indice === recordInSilenzio) continue;
        m.set(s.indice, [...(m.get(s.indice) ?? []), { genere: "errore", codice: s.code, ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata) }]);
      }
    return m;
  }, [controllo, lingua, recordInSilenzio]);
  const candidatoDelDato = useMemo((): SegnalazioneMostrata[] => {
    if (!datoInModifica) return [];
    const scelto = { indice: datoInModifica.indice, comune: datoInModifica.comune === true };
    const op = passoDelDato(progetto, scelto, datoInModifica.bozza);
    const r = op ? op(progetto, cronologia.prossimo) : ({ ok: true, progetto } as const);
    if (!r.ok) return [];
    const c = controlla(r.progetto, limiti);
    if (c.fuoriTappa) return [];
    const dopo = doveDopo(progetto, scelto, datoInModifica.bozza);
    return c.dati
      .filter((s) => s.comune === dopo.comune && (s.comune || s.funzione === mostrata.id) && s.indice === dopo.indice)
      .map((s) => ({ genere: s.genere, codice: s.code, ...testoDellaSegnalazione(lingua, s.code as Codice, false, s.fermata) }));
  }, [datoInModifica, mostrata, progetto, cronologia.prossimo, lingua, limiti]);

  // I campi del caso in modifica: perché il nucleo non li accetterebbe (un nome già usato o che si confonde con quello di
  // un caso dell'altra parte, un errore statico atteso con un output), coi testi dei motivi.
  const candidatoDelCaso = useMemo((): string[] => {
    const c = casoInModifica ? casi[casoInModifica.indice] : undefined;
    if (!casoInModifica || !c) return [];
    const r = cambiaCaso(casoInModifica.indice, casoDaBozza(c, casoInModifica.bozza), funzioneDeiCasi)(progetto, cronologia.prossimo);
    if (r.ok) return [];
    if (r.rifiuto.motivo === "nome_del_caso_confuso") return [testi.casoNomeConfuso];
    return r.rifiuto.motivo !== "illeggibile" ? [] : [...new Set(r.rifiuto.errori.map((e) => testiDeiMotivi[lingua][e.motivo]))];
  }, [casoInModifica, casi, funzioneDeiCasi, progetto, cronologia.prossimo, lingua, testi]);

  useEffect(() => {
    if (fuocoDato === null) return;
    pannello.current?.querySelector<HTMLElement>(fuocoDato)?.focus();
    setFuocoDato(null);
  }, [fuocoDato, progetto]);

  // Gli screen reader scelgono la voce dalla lingua del documento (quella iniziale la scrive l'avvio,
  // prima del primo render).
  useEffect(() => {
    document.documentElement.lang = lingua;
  }, [lingua]);
  useEffect(() => {
    document.documentElement.dataset.colori = scelte.colori;
  }, [scelte.colori]);
  useEffect(() => {
    applicaIColori(document.documentElement, scelte.coloriDeiBlocchi);
  }, [scelte.coloriDeiBlocchi]);

  useEffect(() => {
    if (fuoco === null) return;
    // Al giro dopo: chiudendosi, l'elenco dei blocchi sposta ancora il fuoco. Non se intanto si sono aperti dei
    // campi e il fuoco è lì: portarlo via li confermerebbe. E non se intanto l'utente l'ha messo su un altro blocco
    // (un Tab o un clic subito dopo Invio): Invio lì aprirebbe i campi del blocco di prima (misurato, fino a 9 su 30).
    // Il blocco a cui ha dato il fuoco questo effetto, un fotogramma prima, non l'ha scelto l'utente: due Maiusc+↓ nello
    // stesso fotogramma lasciavano il fuoco sul blocco di mezzo. Il confronto è col fuoco di quando lo si è chiesto, non
    // di quando l'effetto parte: un ridisegno lento lasciava passare il fuoco messo su un altro blocco nel frattempo.
    const allora = fuocoChiestoDa.current;
    requestAnimationFrame(() => {
      const ora = document.activeElement;
      const suUnAltroBlocco = ora !== allora && ora !== bloccoColFuoco.current && ora?.closest("[data-blocco]") != null && !ora.matches(fuoco);
      if (ora?.closest("form") || suUnAltroBlocco) return;
      const bersaglio = tela.current?.querySelector<SVGGElement>(fuoco);
      bersaglio?.focus();
      bloccoColFuoco.current = bersaglio ?? null;
    });
    setFuoco(null);
  }, [fuoco, disegno]);

  // L'avviso sta sopra l'area del flowchart, centrato su di lei e mai più largo: la sua posizione e la sua larghezza
  // seguono l'area quando cambia (la finestra, la vista dei dati, la colonna dell'esecuzione spostate dai bordi).
  // L'area si misura quando cambia di dimensione e, finché c'è un avviso, a ogni disegno: aprire la colonna e chiudere
  // la vista dei dati insieme la sposta senza cambiarne la larghezza (misurato in WebKit).
  const [areaDelFlowchart, setAreaDelFlowchart] = useState<{ centro: number; larghezza: number } | null>(null);
  const misuraLArea = useRef(() => {});
  misuraLArea.current = () => {
    const r = tela.current?.getBoundingClientRect();
    if (!r) return;
    const centro = Math.round(r.left + r.width / 2);
    const larghezza = Math.round(r.width);
    setAreaDelFlowchart((a) => (a?.centro === centro && a.larghezza === larghezza ? a : { centro, larghezza }));
  };
  useLayoutEffect(() => {
    const t = tela.current;
    if (!t) return;
    const osservatore = new ResizeObserver(() => misuraLArea.current());
    osservatore.observe(t);
    return () => osservatore.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (avviso !== null) misuraLArea.current();
  });
  // L'avviso si sposta trascinando la sua maniglia; la posizione scelta vale finché resta aperto: chiuso (con la ×, o da
  // un comando che lo toglie, come ogni passo dell'esecuzione), il prossimo torna al posto calcolato.
  const riquadroDellAvviso = useRef<HTMLDivElement>(null);
  const spostaLAvviso = useSpostabile(riquadroDellAvviso);
  const azzeraLAvviso = spostaLAvviso.azzera;
  useEffect(() => {
    if (avviso === null) azzeraLAvviso();
  }, [avviso]);

  // «Adatta alla finestra» resta valida finché non si sceglie un'altra scala: il disegno che cambia (una
  // modifica, un altro esempio, la lingua) si riadatta.
  useLayoutEffect(() => {
    if (!adattata || !tela.current) return;
    const area = areaDelDisegno(tela.current);
    setScala(scalaAdatta(disegno, area.larghezza, area.altezza));
  }, [adattata, disegno]);

  /** Applica l'operazione come un passo della cronologia; `dopo` riceve il progetto nuovo e dice che cosa
   * selezionare (con l'ancora, i blocchi fino a lei) e dove mettere il fuoco. */
  function modifica(operazione: Operazione, dopo?: (p: Progetto) => { seleziona: string | null; ancora?: string | null; fuoco: string | null }, da: Cronologia = cronologia): boolean {
    const esito = applica(da, operazione);
    if (!esito.ok) {
      setAvviso(esito.rifiuto.motivo === "dentro_se_stesso" ? testi.spostamentoDentroSeStesso : testi.modificaRifiutata);
      return false;
    }
    setAvviso(null);
    setDocumento((d) => ({ ...d, cronologia: esito.cronologia }));
    if (dopo) {
      const d = dopo(esito.cronologia.presente);
      setSelezionato(d.seleziona, d.ancora ?? null);
      setFuoco(d.fuoco);
    }
    return true;
  }
  /** Il blocco che il disegno mostra per `id` nel progetto `p`: una Scrittura unita alla Lettura che la segue è la Lettura. */
  const mostratoIn = (p: Progetto, id: string): string => perScrittura(coppieDi(p)).get(id)?.lettura ?? id;
  const ilBloccoNel = (posto: Posto) => (p: Progetto) => {
    const b = bloccoNelPosto(p, posto);
    const id = b === undefined ? undefined : mostratoIn(p, b.id);
    return { seleziona: id ?? null, fuoco: id !== undefined ? `[data-blocco="${id}"]` : null };
  };
  function inserisciNel(posto: Posto, scelta: Scelta): void {
    if (scelta === "incolla") {
      // I blocchi incollati restano scelti insieme, col fuoco sull'ultimo; una coppia si sceglie dalla Lettura (la Scrittura
      // non ha un blocco nel disegno).
      if (appunti)
        modifica(incollaDiSeguito(appunti, posto), (p) => {
          const [primo, ultimo] = [bloccoNelPosto(p, posto), bloccoNelPosto(p, { ...posto, indice: posto.indice + appunti.length - 1 })];
          const id = ultimo === undefined ? undefined : mostratoIn(p, ultimo.id);
          return { seleziona: id ?? null, ancora: primo === undefined ? null : mostratoIn(p, primo.id), fuoco: id !== undefined ? `[data-blocco="${id}"]` : null };
        });
    } else
      // Il blocco nuovo ha i campi vuoti: si aprono subito, col fuoco nel primo. Con la domanda nella Lettura il blocco
      // nuovo può unirsi a quello vicino: si aprono i campi del blocco che il disegno mostra, con le coppie del progetto
      // nuovo (quelle di adesso non hanno ancora il blocco nuovo).
      modifica(inserisci(posto, scelta), (p) => {
        const nuovo = bloccoNelPosto(p, posto);
        const b = nuovo === undefined ? undefined : trova(p, mostratoIn(p, nuovo.id));
        if (b) {
          apriCampi(b, coppieDi(p));
          setNuovo({ blocco: b.id });
        }
        return { seleziona: b?.id ?? null, fuoco: null };
      });
  }
  /** Elimina il blocco, o i blocchi scelti con lui; una Lettura con la domanda con la sua Scrittura. Il fuoco va sul «+» dove
   * stava il primo. */
  function cancella(id: string): void {
    const t = trattoDi(id);
    if (!t) return;
    modifica(eliminaTratto(t), () => ({ seleziona: null, fuoco: `[data-punto="${chiaveDelPosto({ contenitore: t.contenitore, ramo: t.ramo, indice: t.da })}"]` }));
  }
  /** Apre i campi del blocco (che resta selezionato); `coppie`: quelle del progetto in cui il blocco sta. */
  function apriCampi(b: Blocco, coppie: ReadonlyMap<string, Coppia> = coppieDelProgetto): void {
    // Una Lettura con l'opzione della domanda ha anche i campi della domanda (vuoti se il disegno non gliene mostra una).
    const conDomanda = domanda === "nella-lettura" && b.kind === "read";
    const coppia = conDomanda ? coppie.get(b.id) : undefined;
    const bozza = bozzaDi(b, nomi, conDomanda ? (coppia?.domanda ?? null) : undefined);
    if (!bozza) return;
    setSelezionato(b.id);
    setInModifica({ id: b.id, bozza, ...(coppia !== undefined ? { coppia } : {}) });
  }
  /** Invio (o un clic fuori dai campi): i campi diventano un passo della cronologia; se sono quelli di
   * prima, nessun passo. Con Invio il fuoco torna sul blocco; dopo un clic altrove resta dove l'utente ha
   * cliccato, e la selezione è quella del clic. Rifiutati dal nucleo, i campi restano aperti col testo scritto. */
  function confermaCampi(torna: boolean): void {
    if (!inModifica) return;
    const { id, bozza, coppia } = inModifica;
    // Un blocco appena inserito con un errore: la prima conferma lo mostra, e i campi restano aperti.
    if (bloccoNuovo === id) {
      setNuovo(null);
      if (segnalazioni.some((s) => s.genere === "errore")) return;
    }
    const b = trova(progetto, id);
    const operazione = operazioneDeiCampi(id, bozza, coppia);
    // Un passo che non si può scrivere nel file: i campi restano aperti, e sotto c'è l'errore del passo.
    if (operazione === undefined) setAvviso(testi.modificaRifiutata);
    else if (b && campiDiPrima(b, bozza, coppia)) {
      setInModifica(null);
      if (torna) setFuoco(`[data-blocco="${id}"]`);
    } else {
      // Una Scrittura che coi campi nuovi si unisce alla Lettura che la segue: la selezione e il fuoco vanno alla Lettura.
      const dopo = (p: Progetto) => ({ seleziona: mostratoIn(p, id), fuoco: `[data-blocco="${mostratoIn(p, id)}"]` });
      if (modifica(operazione, torna ? dopo : undefined)) setInModifica(null);
    }
  }
  /** Esc: i campi si chiudono senza passi, il fuoco torna sul blocco. */
  function rinunciaCampi(): void {
    if (inModifica) setFuoco(`[data-blocco="${inModifica.id}"]`);
    setInModifica(null);
  }

  // ------------------------------------------------------------- la fine di una funzione: ciò che restituisce

  const laFine = (f: Funzione) => `[data-restituisce="${f.end.id}"]`;
  /** Apre il campo di ciò che la funzione mostrata restituisce (una procedura e il programma non restituiscono nulla). */
  function apriRestituisce(): void {
    if (mostrata.kind !== "function") return;
    impostaSelezionato(null);
    setFineInModifica({ funzione: mostrata.id, bozza: traduciEspressione(mostrata.end.return_value ?? "", nomi) });
  }
  /** Invio (o un clic fuori dal campo): ciò che restituisce diventa un passo; lo stesso di prima, nessun passo. */
  function confermaRestituisce(torna: boolean): void {
    if (!fineInModifica || !funzioneDellaFine) return setFineInModifica(null);
    const testo = nellaFormaDelFile(fineInModifica.bozza, nomi);
    if (testo === (funzioneDellaFine.end.return_value ?? "") || modifica(restituisce(funzioneDellaFine.id, testo))) {
      setFineInModifica(null);
      if (torna) setFuoco(laFine(funzioneDellaFine));
    }
  }
  /** Esc: il campo si chiude senza passi, il fuoco torna sulla fine. */
  function rinunciaRestituisce(): void {
    if (funzioneDellaFine) setFuoco(laFine(funzioneDellaFine));
    setFineInModifica(null);
  }
  // Gli errori e gli avvisi della fine nel progetto CANDIDATO.
  const segnalazioniDellaFine = useMemo((): SegnalazioneMostrata[] => {
    if (!fineInModifica || !funzioneDellaFine) return [];
    const r = restituisce(funzioneDellaFine.id, nellaFormaDelFile(fineInModifica.bozza, nomi))(progetto, cronologia.prossimo);
    if (!r.ok) return [];
    const c = controlla(r.progetto, limiti);
    if (c.fuoriTappa) return [];
    // Sulla fine di una funzione l'errore è sul risultato: il suo testo.
    const mostra = (genere: "errore" | "avviso") => (s: { code: string; block: string }) => ({
      genere,
      codice: s.code,
      ...testoDellaSegnalazione(lingua, s.code as Codice, true, fermataDel(c.fermate, s)),
    });
    const fine = funzioneDellaFine.end.id;
    return [...c.errori.filter((e) => e.block === fine).map(mostra("errore")), ...c.avvisi.filter((a) => a.block === fine).map(mostra("avviso"))];
  }, [fineInModifica, funzioneDellaFine, progetto, cronologia.prossimo, nomi, lingua, limiti]);

  // ------------------------------------------------------------- il blocco del valore iniziale di un dato

  const laVoceDelValore = (chiave: string) => `[data-iniziale="${chiave}"]`;
  /** Apre i campi del valore iniziale (che resta scelto): il valore solo, il nome no. Una costante comune è in sola
   * lettura, come nella vista dei dati. */
  function apriValore(chiave: string): void {
    const r = datoDellaRiga(progetto, chiave, mostrata.id);
    if (!r || r.comune || r.dato.initial === undefined) return;
    scegliValore(chiave);
    setValoreInModifica({ chiave, bozza: bozzaDelDato(r.dato, valoreRipetuto) });
  }
  /** Invio (o un clic fuori dai campi): il valore scritto diventa il valore iniziale del dato, un passo della
   * cronologia; se è quello di prima, nessun passo. Un valore vuoto toglie il valore iniziale: lo si chiede, come con
   * Elimina; per una costante non si può, e i campi restano aperti (l'errore del dato lo dice sotto i campi). */
  function confermaValore(torna: boolean): void {
    if (!valoreInModifica) return;
    const { chiave, bozza } = valoreInModifica;
    const r = datoDellaRiga(progetto, chiave, mostrata.id);
    if (!r || r.comune) {
      setValoreInModifica(null);
      return;
    }
    const nuovo = conIlValoreDi(r.dato, bozza);
    if (nuovo.initial === undefined) {
      if (r.dato.constant === true) setAvviso(testi.annuncioCostanteSenzaValore);
      else chiediDiTogliere(chiave);
      return;
    }
    if (stessoDato(r.dato, nuovo) || modifica(cambiaDato(r.indice, nuovo, mostrata.id))) {
      setValoreInModifica(null);
      if (torna) setFuoco(laVoceDelValore(chiave));
    }
  }
  /** Esc: i campi si chiudono senza passi, il fuoco torna sul blocco. */
  function rinunciaValore(): void {
    if (valoreInModifica) setFuoco(laVoceDelValore(valoreInModifica.chiave));
    setValoreInModifica(null);
  }
  /** Elimina, Canc, o il valore vuotato nei suoi campi: la finestra che chiede se togliere il valore iniziale. I campi
   * aperti di quel valore si chiudono senza passi (il valore resta quello di prima finché la finestra non risponde); gli
   * altri diventano un passo, come prima di ogni comando. */
  function chiediDiTogliere(chiave: string): void {
    let c: Cronologia | null = cronologia;
    if (valoreInModifica?.chiave === chiave) setValoreInModifica(null);
    else c = confermaIApertiCampi();
    if (!c) return;
    const r = datoDellaRiga(c.presente, chiave, mostrata.id);
    if (!r || !siToglie(r)) return;
    setTogliendo({ chiave, nome: r.dato.name });
  }
  /** La conferma: il dato resta, senza valore iniziale (un passo). Il fuoco va al blocco dopo, cioè al valore iniziale
   * seguente o al primo «+» del programma. */
  function togliIlValore(): void {
    const t = togliendo;
    setTogliendo(null);
    const r = t ? datoDellaRiga(progetto, t.chiave, mostrata.id) : undefined;
    if (!t || !r || !siToglie(r)) return;
    const voci = valoriNelFlowchart ? vociDeiValori(mostrata, testi, valoriNelFlowchart) : [];
    const dopo = voci[voci.findIndex((v) => v.genere === "valore" && v.chiave === t.chiave) + 1];
    const fuoco = dopo?.genere === "valore" ? laVoceDelValore(dopo.chiave) : `[data-punto="${chiaveDelPosto({ contenitore: mostrata.id, ramo: "body", indice: 0 })}"]`;
    if (modifica(cambiaDato(r.indice, conIlValoreDi(r.dato, { iniziale: "", vettore: false, ripetuto: false }), mostrata.id))) {
      setValoreScelto(null);
      setFuoco(fuoco);
    }
  }
  /** Sposta il blocco nel posto, coi blocchi fino all'ancora se ne ha una (stessi identificatori, un passo): rifiutato dal
   * nucleo dentro sé stesso. I blocchi restano scelti come prima. Dalla tastiera, un rifiuto lascia lo spostamento aperto
   * per un altro «+». Una Lettura con la domanda si sposta con la sua Scrittura. */
  function spostaIn(id: string, posto: Posto, ancora: string | null = null): void {
    const t = trattoDellaVista(progetto, ancora ?? id, id, coppieDelProgetto);
    if (t && modifica(spostaTratto(t, posto), () => ({ seleziona: id, ancora, fuoco: `[data-blocco="${id}"]` }))) setSpostando(null);
  }
  /** Il blocco negli appunti, o i blocchi scelti con lui; una Lettura con la domanda con la sua Scrittura. */
  const copiaIl = (id: string) => {
    const t = trattoDi(id);
    const blocchi = t ? blocchiDelTratto(progetto, t) : [];
    setAppunti(blocchi.length > 0 ? blocchi : null);
  };
  /** Maiusc+clic e Maiusc+frecce: la scelta va dall'ancora `da` (di solito quella che c'è, o il blocco scelto) al blocco
   * `id`, coi blocchi vicini fra i due. Un blocco di un'altra sequenza vale il blocco della sequenza comune che lo contiene
   * (il «se» per un blocco di un suo ramo), e così l'ancora; in un'altra funzione si sceglie il blocco solo. Il fuoco va
   * sul blocco scelto. */
  function estendiA(id: string, da: string | null = ancoraScelta ?? scelto): void {
    const t = da === null ? undefined : trattoFra(progetto, da, id);
    const [ancora, fine] = da === null || t === undefined ? [undefined, undefined] : [nellaSequenzaDel(progetto, da, t), nellaSequenzaDel(progetto, id, t)];
    if (ancora === undefined || fine === undefined) {
      setSelezionato(id);
      return;
    }
    const [inizio, ultimo] = [mostratoDi(ancora), mostratoDi(fine)];
    setSelezionato(ultimo, inizio);
    setFuoco(`[data-blocco="${ultimo}"]`);
    const scelti = trattoDellaVista(progetto, inizio, ultimo, coppieDelProgetto);
    const n = scelti ? mostratiNel(scelti) : 1;
    if (n > 1) setAvviso(riempi(testi.blocchiSelezionati, { n: n.toLocaleString(lingua) }));
  }
  function cronologiaA(c: Cronologia): void {
    setDocumento((d) => ({ ...d, cronologia: c }));
    setAvviso(null);
  }
  /** Annulla e Ripeti; se il passo cambia un'altra procedura o funzione, la sua scheda si apre e si mostra: si vede che
   * cosa è tornato indietro (il programma principale, se la funzione mostrata non c'è più). */
  const passo = (comando: "annulla" | "ripeti") => {
    const c = comando === "annulla" ? annulla(cronologia) : ripeti(cronologia);
    cronologiaA(c);
    setSelezionati(selezioneDopoIlPasso(cronologia.presente, c.presente, selezionati, selezioniRicordate.current.get(c.presente)));
    const cambiata = funzioneCambiata(cronologia.presente, c.presente, mostrata.id);
    if (cambiata === undefined || cambiata === mostrata.id) return;
    const f = c.presente.functions.find((x) => x.id === cambiata);
    if (f !== undefined) apriScheda(f.id);
  };

  // ----------------------------------------------------------------------- le schede e le funzioni

  /** Mostra la funzione con quell'`id` (il programma principale col suo), aprendo la sua scheda. Prima i campi aperti
   * diventano un passo, come con un clic fuori: rifiutati, si resta dove si è. Scelte e spostamenti della scheda di prima
   * si chiudono. */
  function mostra(id: string): boolean {
    if (id === mostrata.id) return true;
    if (!confermaIApertiCampi()) return false;
    apriScheda(id);
    return true;
  }
  /** La scheda della funzione aperta e mostrata, senza conferme (chi chiama le ha già fatte). */
  function apriScheda(id: string): void {
    const principaleOra = id === principale.id;
    setSchede((s) => ({ aperte: principaleOra || s.aperte.includes(id) ? s.aperte : [...s.aperte, id], mostrata: principaleOra ? null : id }));
    impostaSelezionato(null);
    setSceltaDelValore(null);
    setSpostando(null);
    setElencoSu(null);
    setMenuDelBlocco(null);
  }
  /** La × di una scheda: la funzione resta nel progetto; se era mostrata, si mostra la scheda alla sua sinistra. */
  function chiudiScheda(id: string): void {
    const i = schede.aperte.indexOf(id);
    if (i < 0) return;
    if (id === mostrata.id && !confermaIApertiCampi()) return;
    const aperte = schede.aperte.filter((x) => x !== id);
    const dopo = id === mostrata.id ? (aperte[i - 1] ?? null) : schede.mostrata;
    setSchede({ aperte, mostrata: dopo });
    if (id === mostrata.id) {
      impostaSelezionato(null);
      setSceltaDelValore(null);
      setSpostando(null);
    }
  }
  // Il menu di una procedura o di una funzione (dalla sua scheda o dall'elenco) e la funzione su cui è aperto.
  const [menuDellaFunzione, setMenuDellaFunzione] = useState<{ id: string; x: number; y: number } | null>(null);
  /** I nomi di chi chiama ogni funzione, il programma principale col nome della sua scheda: calcolati una volta per
   * progetto (attraversano tutti i blocchi), non a ogni disegno, che durante «tutto insieme» è a ogni fetta (misurato:
   * con cento procedure la corsa passava da 20 s a oltre 200 s). */
  const chiamantiPerFunzione = useMemo(
    () =>
      new Map(
        progetto.functions.map((f) => [
          f.id,
          chiamataDa(progetto, f.name ?? "").map((id) => {
            const x = progetto.functions.find((g) => g.id === id)!;
            return x.kind === "main" ? testi.schedaPrincipale : (x.name ?? "");
          }),
        ]),
      ),
    [progetto, testi],
  );
  const chiamanti = useCallback((f: Funzione): readonly string[] => chiamantiPerFunzione.get(f.id) ?? [], [chiamantiPerFunzione]);
  // I giri della ricorsione in parole: un'informazione su ciò che il progetto fa, non un errore (nell'elenco delle
  // procedure e delle funzioni e nella riga di stato).
  const giri = useMemo(() => frasiDeiGiri(giriDellaRicorsione(progetto), testi), [progetto, testi]);
  const giroDi = useCallback((f: Funzione): string | undefined => giri.diFunzione.get(f.id), [giri]);
  /** Apre una finestra delle funzioni, dopo aver confermato i campi aperti. */
  function apriLaFinestra(f: Aperta): void {
    if (inEsecuzione || !confermaIApertiCampi()) return;
    setMenuDellaFunzione(null);
    setFinestra(f);
  }
  const sottoprogrammaDi = (id: string) => progetto.functions.find((f) => f.id === id && f.kind !== "main");
  /** Le proprietà della bozza della finestra: per una funzione il tipo, la dimensione di un vettore e la lunghezza massima
   * di una stringa (scritte come nella vista dei dati: un numero che non lo è vale 0, e lo segnala il controllo), il
   * valore predefinito. */
  const proprietaDi = (b: BozzaDellaFunzione): Proprieta =>
    b.genere === "procedure"
      ? { genere: "procedure" }
      : {
          genere: "function",
          tipo: b.tipo,
          ...(b.tipo === "record" ? { record: b.record } : {}),
          predefinito: b.predefinito,
          dimensione: b.vettore ? intero(b.dimensione) : null,
          colonne: b.vettore && b.matrice ? intero(b.colonne) : null,
          lunghezza: b.tipo === "string" && b.lunghezza.trim() !== "" ? intero(b.lunghezza) : null,
        };
  /** Gli errori della finestra di una procedura o di una funzione, con le regole del controllo: il nome (vuoto, non valido,
   * già usato) e il valore predefinito, provato sul progetto candidato. */
  function erroriDellaFunzione(modo: ModoDellaFinestra, b: BozzaDellaFunzione): ErroriDellaFunzione {
    const id = modo.modo === "nuova" ? undefined : modo.funzione.id;
    const fuori: { -readonly [K in keyof ErroriDellaFunzione]: ErroriDellaFunzione[K] } = {};
    if (modo.modo !== "proprieta") {
      const motivo = b.nome === "" ? undefined : motivoDelNome(progetto, b.nome, id);
      if (b.nome === "") fuori.nome = testi.funzioneNomeVuoto;
      else if (motivo !== undefined && !(modo.modo === "rinomina" && b.nome === modo.funzione.name))
        fuori.nome =
          motivo === "non_valido" ? testoDellaSegnalazione(lingua, "invalid_name", false, causaDelNome(b.nome, true)).breve : codici.function_name_in_use.breve;
    }
    if (modo.modo !== "rinomina" && b.genere === "function" && !b.vettore) {
      const nuovoId = id ?? idDellaFunzioneNuova(progetto);
      const op: Operazione = modo.modo === "nuova" ? nuovaFunzione("candidata", proprietaDi(b)) : proprietaDellaFunzione(nuovoId, proprietaDi(b));
      const r = op(progetto, cronologia.prossimo);
      const c = r.ok ? controlla(r.progetto, limiti) : undefined;
      if (!r.ok || (c && !c.fuoriTappa && c.errori.some((e) => e.code === "invalid_default_value" && e.block === nuovoId))) fuori.predefinito = codici.invalid_default_value.breve;
    }
    return fuori;
  }
  /** La conferma della finestra: crea, rinomina o cambia le proprietà, in un passo. Una funzione nuova si apre nella sua
   * scheda; una procedura nuova dai campi di un salto è chiamata da quel salto, nello stesso passo, senza argomenti (è
   * nuova: non ha parametri, e gli argomenti scritti per la procedura di prima non sono i suoi). */
  function confermaLaFunzione(modo: ModoDellaFinestra, b: BozzaDellaFunzione): void {
    setFinestra(null);
    const pr = proprietaDi(b);
    if (modo.modo === "nuova") {
      const id = idDellaFunzioneNuova(progetto);
      const salto = modo.salto !== undefined && trova(progetto, modo.salto) !== undefined ? modo.salto : undefined;
      if (modifica(salto === undefined ? nuovaFunzione(b.nome, pr) : poi(nuovaFunzione(b.nome, pr), campi(salto, { callee: b.nome, arguments: [] })))) apriScheda(id);
    } else if (modo.modo === "rinomina") {
      if (b.nome !== modo.funzione.name) modifica(rinominaFunzione(modo.funzione.id, b.nome));
    } else modifica(proprietaDellaFunzione(modo.funzione.id, pr));
  }
  /** La copia subito dopo l'originale, aperta nella sua scheda. */
  function duplicaLaFunzione(id: string): void {
    setMenuDellaFunzione(null);
    if (inEsecuzione) return;
    const c = confermaIApertiCampi();
    if (!c) return;
    const nuova = idDellaFunzioneNuova(c.presente);
    if (modifica(duplicaFunzione(id), undefined, c)) apriScheda(nuova);
  }
  /** La conferma dell'eliminazione: un passo solo, con la scelta fatta sulle chiamate. */
  function eliminaLaFunzione(id: string, scelta: ChiamateDaTogliere): void {
    setFinestra(null);
    modifica(eliminaFunzione(id, scelta));
  }

  // ----------------------------------------------------------------------------------- l'esecuzione

  /** Un'azione della tabella dei tasti (dai tasti e dai pulsanti della barra). */
  function fai(azione: Azione): void {
    if (azione !== "punto" && azione !== "nulla") setAnimata(false);
    if (azione === "esegui") avvia("continua");
    else if (azione === "passo") avvia("sopra");
    else if (azione === "continua") prosegui("continua");
    else if (azione === "un passo") prosegui("sopra");
    else if (azione === "entra") prosegui("dentro");
    else if (azione === "esci") prosegui("fuori");
    else if (azione === "ferma") ferma();
    else if (azione === "punto") alternaIlPunto();
  }
  /** Un'esecuzione nuova del progetto (dopo aver confermato i campi aperti), coi limiti delle Impostazioni:
   * gli stessi del controllo nella riga di stato. La vista dei dati si chiude; se il progetto ha errori
   * l'esecuzione non parte, e l'avviso lo dice. Con un caso d'uso (la sua posizione) l'esecuzione è nel modo caso: le
   * letture prendono i suoi valori, e alla fine l'esito del nucleo va accanto al caso e nella console; se il progetto
   * non parte l'esito c'è già (l'errore statico), e la colonna non si apre. Sulla scheda di una procedura o di una
   * funzione l'esecuzione è la sua, da sola (i casi sono i suoi); finché la colonna di un'esecuzione è aperta si
   * ricomincia la stessa, anche se la scheda mostrata è un'altra (la scheda segue l'azione). */
  function avvia(comando: Comando, indiceDelCaso?: number): boolean {
    const c = confermaIApertiCampi();
    if (!c) return false;
    const dellaScheda = nelProgramma ? undefined : mostrata.id;
    const radice = indiceDelCaso === undefined && esecuzione !== null ? esecuzione.funzione : dellaScheda;
    const funzione = radice !== undefined && c.presente.functions.some((f) => f.id === radice) ? radice : undefined;
    const caso = indiceDelCaso === undefined ? undefined : casiDella(c.presente, funzione)[indiceDelCaso];
    if (indiceDelCaso !== undefined && caso === undefined) return false;
    const es = new Esecuzione<CasoDiUnaFunzione>(c.presente, limiti, { righeLunghe: righeLungheDi(scelte), controllo: controlla(c.presente, limiti), ...(funzione !== undefined ? { funzione } : {}), ...(caso ? { caso } : {}) });
    if (es.stato.genere === "non parte") {
      registrazione?.tieni(es, erroriDellApp().voci);
      if (caso) concludiIlCaso(es);
      else setAvviso(testi.annuncioNonParte);
      ridisegna();
      return false;
    }
    // I punti li dà l'effetto qui sotto, prima della prima fetta: una via sola.
    es.comanda(comando);
    registrazione?.apri(es, erroriDellApp().voci);
    setEsecuzione(es);
    setAperto(false);
    setElencoSu(null);
    setSpostando(null);
    setAvviso(null);
    return true;
  }
  function prosegui(comando: Comando): void {
    const s = esecuzione?.stato.genere;
    if (s !== "pausa" && s !== "pronta") return;
    esecuzione!.comanda(comando);
    setAvviso(null);
    ridisegna();
  }
  /** «Ferma»: la colonna si chiude, la vista dei dati si riapre, il progetto si modifica di nuovo. */
  function ferma(): void {
    setAnimata(false);
    if (esecuzione === null) return;
    const inCorso = inEsecuzione;
    registrazione?.chiudi(erroriDellApp().voci);
    setEsecuzione(null);
    setAperto(true);
    setAvviso(inCorso ? testi.annuncioFermata : null);
  }
  /** Il valore scritto nella console per la lettura che l'esecuzione aspetta (per un parametro anche nessun valore, o lo
   * stesso a ogni elemento). */
  function inserisciNellaConsole(riga: Exclude<Riga, undefined>): void {
    if (esecuzione?.stato.genere !== "chiede") return;
    esecuzione.inserisci(riga);
    ridisegna();
  }
  /** Ciò che l'avviso dice quando un comando si ferma: la pausa, la fine o l'errore; la lettura la dice la
   * console, sopra la riga dove si scrive (l'avviso tace). A esecuzione finita la vista dei dati si riapre. */
  function annuncia(es: Esecuzione<CasoDiUnaFunzione>): void {
    const s = es.stato;
    const nomeDi = nomeIn(es.progetto);
    // La scheda segue l'azione (un caso torna alla sua alla fine: la mostra `concludiIlCaso`).
    const cambiata = s.genere === "finita" && es.caso ? false : seguiLAzione(es);
    if (s.genere === "pausa") {
      // Sul valore iniziale di un dato, il nome del suo blocco, col testo dalla stessa funzione del disegno: un dato della
      // funzione della pausa, o una costante comune (che prende il valore nella radice).
      const dato = s.dato === undefined ? undefined : [...(es.progetto.shared_constants ?? []), ...datiDi(es.progetto, s.funzione)].find((d) => d.name === s.dato);
      // In un ciclo aperto, la parte del riquadro della pausa; nella copia di un record, l'assegnazione del campo.
      const b = s.fase === undefined && s.campo === undefined ? undefined : trova(es.progetto, s.blocco);
      const della = b && (funzioneCon(es.progetto, b.id) ?? principaleDi(es.progetto));
      const fase =
        b && della && s.fase !== undefined
          ? nomeDellaFase(b, s.fase, formeDeiCicli, testi, testiDelDisegno(lingua), della, es.progetto.shared_constants ?? [])
          : b && della && s.campo !== undefined
            ? nomeDelCampoDellaCopia(b, s.campo, testi, testiDelDisegno(lingua), della, es.progetto.shared_constants ?? [], es.progetto.records ?? [])
            : undefined;
      const nome = dato ? nomeDelValoreIniziale(dato, testi, testiDelDisegno(lingua), valoreRipetuto) : (fase ?? nomeDi(s.blocco));
      // Sulla ripresa dopo un ritorno, la funzione tornata e il valore restituito, come li scrive la tabella.
      const r = s.ripresa;
      setAvviso(
        r === undefined
          ? riempi(testi.annuncioPausa, { blocco: nome, n: String(es.passi) })
          : riempi(testi.annuncioRipresa, { funzione: es.progetto.functions.find((f) => f.id === r.funzione)?.name ?? "", valore: tabellaMostrata?.valoreRestituito(r) ?? "", blocco: nome, n: String(es.passi) }),
      );
      // L'animata arrivata su un punto di interruzione si ferma lì, con la regola del passo (un valore iniziale non ne
      // ha, e in un ciclo il punto ferma solo il controllo); sulla ripresa no: il punto ha fermato l'azione, prima.
      if (animataOra.current && r === undefined && fermatoDaUnPunto(es.puntiDiInterruzione, { evento: s.blocco, dato: s.dato, fase: s.fase, campo: s.campo })) setAnimata(false);
      // Il blocco corrente in vista (lo scorrimento è morbido tranne con «riduci il movimento»: lo dice il CSS): sul
      // valore iniziale, il suo blocco o, se è nascosto, «Inizio». Con la scheda appena cambiata, al giro dopo il suo
      // disegno.
      // La Scrittura di una Lettura con la domanda non ha un blocco suo: si guarda la Lettura.
      const id = s.dato === undefined ? (coppieDelleScritture.get(s.blocco)?.lettura ?? s.blocco) : (s.funzione ?? principaleDi(es.progetto).id);
      const selettore = s.dato !== undefined && valoriIniziali === "mostrati" ? `[data-valore-iniziale="${s.dato}"]` : `[data-blocco="${id}"], [data-fine="${id}"]`;
      // In un ciclo aperto la parte della fase, che può stare lontana dall'intestazione (l'aumento in fondo al corpo).
      const parte =
        // Nella copia di una tabella la fase e il campo insieme: la riga del campo, non la prima del ciclo.
        s.dato === undefined && s.fase !== undefined
          ? `g[data-id="${id}"][data-fase="${s.fase}"]${s.interno ? "[data-interno]" : ":not([data-interno])"}${s.campo !== undefined ? `[data-campo-della-copia="${s.campo}"]` : ""}`
        : s.dato === undefined && s.campo !== undefined ? `g[data-id="${id}"][data-campo-della-copia="${s.campo}"]`
        : undefined;
      const inVista = () => ((parte ? tela.current?.querySelector(parte) : null) ?? tela.current?.querySelector(selettore))?.scrollIntoView({ block: "nearest", inline: "nearest" });
      requestAnimationFrame(cambiata ? () => requestAnimationFrame(inVista) : inVista);
    } else if (s.genere === "chiede") setAvviso(null);
    else if (s.genere === "finita") {
      setAperto(true);
      setAvviso(s.errore ? riempi(testi.annuncioErrore, { blocco: nomeDi(s.errore.block), breve: codici[s.errore.code].breve }) : testi.annuncioFinita);
      if (es.caso) concludiIlCaso(es);
    }
  }
  /** La fine di un caso eseguito nella colonna (o che non parte): l'esito del nucleo diventa l'ultimo del caso, il suo
   * pallino; la scheda dei casi si apre col caso scelto, e sotto di lui le differenze; l'avviso dice l'esito. */
  function concludiIlCaso(es: Esecuzione<CasoDiUnaFunzione>): void {
    const caso = es.caso;
    const esito = es.esito;
    if (!caso || !esito) return;
    const radice = es.funzione ?? principaleDi(es.progetto).id;
    setEsitiPerNome((m) => new Map(m).set(chiaveDelCaso(radice, caso.name), { progetto: es.progetto, limiti: es.limiti, esito }));
    setAperto(true);
    setScheda("casi");
    const indice = casiDella(es.progetto, es.funzione).indexOf(caso);
    // I casi sono nella scheda della radice: se la scheda ha seguito l'azione altrove, torna lì, e il caso si sceglie
    // dopo il cambio (che chiude la scelta della scheda di prima).
    if (radice !== mostrata.id && es.progetto.functions.some((f) => f.id === radice)) {
      casoDopoLaScheda.current = indice >= 0 ? indice : null;
      apriScheda(radice);
    } else if (indice >= 0) setCasoScelto(indice);
    setAvviso(testoDellEsito(caso, esito));
  }
  /** Il clic su un nome di «Dove sei»: la sua scheda, col blocco della chiamata (o dell'azione in corso) scelto e col
   * fuoco. */
  function mostraIlLivello(i: number): void {
    const l = pila[i];
    if (!l || !progetto.functions.some((f) => f.id === l.funzione)) return;
    if (esecuzione) setLivelloScelto({ stato: esecuzione.stato, livello: i });
    apriScheda(l.funzione);
    if (trova(progetto, l.blocco) !== undefined) impostaSelezionato(l.blocco);
    setFuoco(`[data-blocco="${l.blocco}"], [data-fine="${l.blocco}"]`);
  }
  /** La scheda segue l'azione: quella della procedura o della funzione dell'ultima azione (la pausa, la lettura, l'errore;
   * a fine normale la radice). Vero se è cambiata. */
  function seguiLAzione(es: Esecuzione<CasoDiUnaFunzione>): boolean {
    const id = es.pila.at(-1)?.funzione;
    if (id === undefined || id === mostrata.id || !progetto.functions.some((f) => f.id === id)) return false;
    apriScheda(id);
    return true;
  }
  /** L'esito di un caso in parole: la riga in fondo alla console e l'avviso. Le parole vengono dall'esito del nucleo, così
   * com'è. */
  function testoDellEsito(caso: CasoDiUnaFunzione, esito: EsitoDelCaso): string {
    const nome = caso.name || testi.casoSenzaNome;
    if (esito.fuoriTappa) return riempi(testi.esitoDelCasoFuoriTappa, { nome });
    if (!esito.raggiunto) {
      const n = esito.differenze.length;
      return riempi(testi.esitoDelCasoNonRaggiunto, { nome, quante: n === 1 ? testi.diffUna : riempi(testi.diffTante, { n: String(n) }) });
    }
    return riempi(esito.avvisi ? testi.esitoDelCasoAvvisi : testi.esitoDelCasoRaggiunto, { nome });
  }
  /** F9 e il pulsante: il punto di interruzione sul blocco scelto, messo o tolto. Fuori dalla cronologia; il
   * progetto risulta modificato. Si può anche durante l'esecuzione: vale da subito. Un commento non si esegue:
   * non riceve un punto (uno che avesse già, scritto nel file, si toglie). Un valore iniziale non ne riceve: F9 dice
   * perché. */
  function alternaIlPunto(): void {
    if (scelto === null) {
      setAvviso(sceltoValore !== null ? testi.annuncioPuntoSuUnValore : testi.annuncioSenzaBlocco);
      return;
    }
    if (!puntoPossibile(scelto)) {
      setAvviso(testi.annuncioPuntoSuUnCommento);
      return;
    }
    const c = new Set(interruzioni);
    // Una Lettura con la domanda: il punto va sulla Scrittura, e l'esecuzione si ferma alla domanda; si toglie da tutte e
    // due (uno messo sulla Lettura con l'opzione spenta si vede anche qui).
    const coppia = coppieDelProgetto.get(scelto);
    const messo = coppia ? ![coppia.scrittura, scelto].map((x) => c.delete(x)).some(Boolean) : !c.delete(scelto);
    if (messo) c.add(coppia?.scrittura ?? scelto);
    setDocumento((d) => ({ ...d, interruzioni: c }));
    setAvviso(riempi(messo ? testi.annuncioPuntoMesso : testi.annuncioPuntoTolto, { blocco: nomeDi(scelto) }));
  }
  /** Il punto di un blocco si può mettere o togliere: su un commento solo togliere. */
  const puntoPossibile = (id: string) => trova(progetto, id)?.kind !== "comment" || interruzioni.has(id);
  function togliIPunti(): void {
    setDocumento((d) => ({ ...d, interruzioni: new Set() }));
    setAvviso(testi.annuncioPuntiTolti);
  }
  /** «Animata»: comincia (o riprende) l'esecuzione animata, o la mette in pausa. */
  function alternaLAnimata(): void {
    if (animata) {
      setAnimata(false);
      return;
    }
    const s = situazioneDi(esecuzione);
    if (s === "in corso") return;
    // Da ferma (o finita) il primo passo è l'avvio, fermo sulla prima azione; da una pausa, un passo subito.
    if (s === "ferma" || s === "finita") {
      if (!avvia("sopra")) return;
    } else subito.current = true;
    setAnimata(true);
  }
  /** La velocità scelta dal menu della barra: vale subito e si ricorda nelle preferenze. */
  function scegliLaVelocita(v: VelocitaAnimata): void {
    if (v === scelte.velocitaAnimata) return;
    const nuove = { ...scelte, velocitaAnimata: v };
    setScelte(nuove);
    salvaPreferenze(lingua, nuove);
  }
  /** «Esporta la tabella»: il CSV della tabella com'è adesso, nella forma e coi separatori delle Impostazioni, nel file
   * che l'utente sceglie (e, se il file c'è e la finestra del sistema non l'ha confermato, se sostituirlo). Il messaggio
   * dopo dice, se mancano, quante righe il file non ha: le stesse che la tabella non ha più. */
  async function esportaLaTabella(): Promise<void> {
    const es = esecuzione;
    if (!es || !tabellaMostrata) return;
    // La tabella mostrata stessa: il CSV «uguale» ne ha le celle.
    // Il CSV uguale alla tabella ha le colonne nell'ordine in cui si mostrano.
    const ordine = colonneMostrate(tabellaMostrata.colonne, disposizione.ordine).map((m) => m.cella);
    const testo = csv(es.traccia, tabellaMostrata, scelte.formaDelCsv, separatori.campo, ordine);
    const tolte = es.traccia.tolte;
    const nome = await nomeDaUsare(es.progetto.metadata.name, ".csv", testi.nomeDellaTabella);
    if (nome === null) return;
    const scelto = await scegliFileDaEsportare(nome, testi.filtroDellaTabella, partenza);
    if (scelto === null || (scelto.sostituire && !(await sostituire(scelto.percorso)))) return;
    try {
      await scriviProgetto(scelto.percorso, testo);
    } catch (e) {
      erroreDiUnFile(testi.esportaErroreTitolo, scelto.percorso, e);
      return;
    }
    const file = nomeDelFile(scelto.percorso);
    setAvviso(
      tolte === 0
        ? riempi(testi.esportataIn, { file })
        : tolte === 1
          ? riempi(testi.esportataSenzaLaPrima, { file })
          : riempi(testi.esportataSenzaLePrime, { file, n: tolte.toLocaleString(lingua) }),
    );
  }

  /** «Esporta il flowchart»: la finestra con le scelte dell'ultima esportazione della sessione (prima si confermano i
   * campi aperti, come per i comandi dei file). */
  function apriLEsportazione(): void {
    if (!inEsecuzione && !confermaIApertiCampi()) return;
    setMenuDellaFunzione(null);
    setFinestra({ genere: "esporta" });
  }

  /** «Stampa…» (e Ctrl+P): disponibile quando lo è «Esporta il flowchart…»; la finestra con le scelte dell'ultima stampa
   * della sessione (prima si confermano i campi aperti, come per i comandi dei file). */
  const stampaDisponibile = situazione !== "in corso" && tutti === null;
  function apriLaStampa(): void {
    if (!inEsecuzione && !confermaIApertiCampi()) return;
    setMenuDellaFunzione(null);
    setFinestra({ genere: "stampa" });
  }
  /** Il disegno di una funzione per la stampa, come quello della sua scheda (le costanti comuni nel programma principale). */
  const disegnoPerLaStampa = (f: Funzione) => disegna(f, f.kind === "main" ? costantiComuni : undefined, progetto.functions, progetto.records);
  /** I segni dell'esecuzione sul flowchart di una funzione (il suo disegno `d`), con le regole della scheda mostrata: il
   * blocco della pausa, o il valore iniziale nella funzione della pausa se il disegno lo mostra, o il suo «Inizio». */
  const segniPerLaStampa = (f: Funzione, d: Disegno): SegniDellEsecuzione => {
    const valore = pausa?.dato !== undefined && valoriIniziali === "mostrati" && funzioneDellaPausa === f.id && d.elementi.some((e) => e.dato === pausa.dato) ? pausa.dato : null;
    const blocco = pausa === undefined ? null : pausa.dato === undefined ? pausa.blocco : valore === null ? funzioneDellaPausa! : null;
    return { corrente: blocco, faseCorrente, campoCorrente, internoCorrente, ripresa: pausa?.ripresa !== undefined, correnteValore: valore, interruzioni };
  };
  /** I fogli del flowchart di una funzione con le scelte della stampa (i segni, se ci sono, sono ostacoli dei tagli), sul
   * foglio intero o sul mezzo foglio degli affiancati. */
  const fogliPerLaStampa = (d: Disegno, s: ScelteDiStampa, segni: SegniDellEsecuzione | undefined, aree = areeDellaStampa) => fogliDelDisegno(d, aree, { adatta: s.adatta, punti: s.punti }, geometriaPredefinita, segni);
  /** Il linguaggio del codice stampato: quello scelto, se è ancora acceso nel menu, o quello mostrato. */
  const linguaggioDellaStampa = (s: ScelteDiStampa): Linguaggio => (s.linguaggio !== null && menuDeiLinguaggi.includes(s.linguaggio) ? s.linguaggio : linguaggio);
  /** Ciò che la finestra «Stampa» sa del progetto; i disegni e il codice si fanno una volta per apertura, quando servono. */
  const daStampare: DaStampare | null = (() => {
    if (finestra?.genere !== "stampa") return null;
    const disegni = new Map<string, Disegno>();
    const disegnoDi = (f: Funzione) => disegni.get(f.id) ?? disegni.set(f.id, disegnoPerLaStampa(f)).get(f.id)!;
    const generati = new Map<Linguaggio, Generato>();
    const generatoIn = (l: Linguaggio) => generati.get(l) ?? generati.set(l, codiceDi(progetto, limiti, l, lingua)).get(l)!;
    return {
      mostrata: nomeNellaStampa(mostrata, testi),
      inPausa: inEsecuzione,
      piene: (t) => partiPiene(progetto, funzioniDellaStampa(progetto, mostrata.id, t)),
      ristretti: (s) => {
        const conSegni = inEsecuzione && s.segni;
        // Sul mezzo foglio solo se gli affiancati escono davvero: senza il codice i flowchart vanno sul foglio intero.
        const accanto = partiStampate(s, partiPiene(progetto, funzioniDellaStampa(progetto, mostrata.id, s.tutte))).affiancati && generatoIn(linguaggioDellaStampa(s)).generato;
        const aree = accanto ? areeAccanto : areeDellaStampa;
        const ristretti = flowchartRistretti(funzioniDellaStampa(progetto, mostrata.id, s.tutte), s, (f) => fogliPerLaStampa(disegnoDi(f), s, conSegni ? segniPerLaStampa(f, disegnoDi(f)) : undefined, aree), geometriaPredefinita);
        return notaDeiRistretti(ristretti, s.punti, testi, lingua);
      },
      linguaggi: menuDeiLinguaggi.map((id) => ({ id, nome: testi[paroleDeiLinguaggi[id].nome] })),
      senzaCodice: (l) => notaSenzaCodice(generatoIn(l), testi[paroleDeiLinguaggi[l].nome], testi),
    };
  })();
  /** Il passo del carattere del codice stampato, in millimetri: misurato col carattere del tema, o 0,6 em. */
  const passoDelCodice = (): number => {
    const famiglia = getComputedStyle(document.documentElement).getPropertyValue("--carattere-codice").trim();
    const c = famiglia === "" ? null : document.createElement("canvas").getContext("2d");
    if (c) {
      c.font = `${PUNTI_DEL_CODICE}pt ${famiglia}`;
      const w = c.measureText("0".repeat(100)).width / 100;
      if (w > 0) return (w * 25.4) / 96;
    }
    return (0.6 * PUNTI_DEL_CODICE * 25.4) / 72;
  };
  /** «Stampa…» della finestra: la pagina stampata con le parti scelte (i flowchart dai fogli del nucleo, con la tavolozza
   * della carta e i segni se scelti in pausa), montata subito; dopo il suo disegno la stampa del motore. `afterprint` la
   * smonta. */
  function stampaIlProgetto(s: ScelteDiStampa): void {
    setScelteDellaStampa(s);
    setFinestra(null);
    const funzioni = funzioniDellaStampa(progetto, mostrata.id, s.tutte);
    const conSegni = inEsecuzione && s.segni;
    const tavolozza = tavolozzaDellaPagina();
    const carattere = getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim();
    const disegni = new Map(
      funzioni.map((f) => {
        const d = disegnoPerLaStampa(f);
        const segni = conSegni ? segniPerLaStampa(f, d) : undefined;
        return [f.id, { d, segni, fogli: fogliPerLaStampa(d, s, segni), accanto: fogliPerLaStampa(d, s, segni, areeAccanto) }] as const;
      }),
    );
    // Il codice del linguaggio scelto (anche senza «Genera»), e al suo posto, se non c'è, la frase e l'elenco: ciò che
    // manca come nella colonna del codice, o gli errori come nella riga di stato.
    const l = linguaggioDellaStampa(s);
    const nome = testi[paroleDeiLinguaggi[l].nome];
    const generato = codiceDi(progetto, limiti, l, lingua);
    const erroriDelProgetto = voci.filter((v) => v.genere === "errore").map((v) => ({ breve: riempi(testi.voceErrore, { dove: v.dove, breve: v.breve }) }));
    const mancanze = !generato.generato && generato.perche === "non-ci-sta" ? vociDelleMancanze(generato.mancanze, progetto, lingua, testi, nomeIn(progetto)).map((v) => ({ breve: v.breve, posto: v.posto })) : [];
    const senzaCodice = {
      frase: fraseSenzaCodice(generato, nome, erroriDelProgetto.length, testi),
      voci: generato.generato ? [] : generato.perche === "non-ci-sta" ? mancanze : generato.perche === "errori-statici" ? erroriDelProgetto : [],
    };
    const codice = { nome, generato, misure: misureDelCodice(passoDelCodice(), generato.generato ? generato.righe.length : 0), fogliAccanto: (f: Funzione) => disegni.get(f.id)!.accanto };
    const sezioni = sezioniDellaStampa(progetto, funzioni, s, (f) => disegni.get(f.id)!.fogli, testi, codice);
    const svgDi = (accanto: boolean) => (f: Funzione, i: number) => {
      const x = disegni.get(f.id)!;
      const g = accanto ? x.accanto : x.fogli;
      return svgDelFoglio(x.d, g.fogli[i]!, g.scala, {
        geometria: geometriaPredefinita,
        tavolozza,
        modo: s.colori,
        carattere,
        fondoDeiCicli: scelte.fondoDeiCicli,
        id: `stampa-${accanto ? "accanto-" : ""}${f.id}-${i}`,
        ...(x.segni ? { segni: x.segni } : {}),
      });
    };
    flushSync(() => setStampata({ progetto, sezioni, svg: svgDi(false), svgAccanto: svgDi(true), senzaCodice, scelte: s, quando: new Date() }));
    // La pagina è nel documento; il motore la impagina al disegno dopo.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
  // La stampa del motore finita (stampata o annullata): la pagina stampata esce dal documento.
  useEffect(() => {
    if (!stampata) return;
    const dopo = () => setStampata(null);
    window.addEventListener("afterprint", dopo);
    return () => window.removeEventListener("afterprint", dopo);
  }, [stampata]);
  /** Il flowchart della scheda mostrata, com'è adesso, nel file che l'utente sceglie (e, se il file c'è e la finestra del
   * sistema non l'ha confermato, se sostituirlo): l'SVG del nucleo coi colori del tema chiaro, nel modo scelto, coi segni
   * dell'esecuzione solo durante l'esecuzione; il PNG è quell'SVG al doppio. Il nome è quello del progetto, con la
   * procedura o la funzione fra parentesi. */
  async function esportaIlFlowchart(s: ScelteDellEsportazione): Promise<void> {
    setScelteDellEsportazione(s);
    // Il disegno di adesso, prima delle finestre: ciò che si esporta è ciò che si vedeva quando si è scelto «Esporta…».
    const segni = inEsecuzione ? { corrente, faseCorrente, campoCorrente, internoCorrente, ripresa: pausa?.ripresa !== undefined, correnteValore, interruzioni } : undefined;
    const svg = svgDelDisegno(disegno, {
      geometria: geometriaPredefinita,
      tavolozza: tavolozzaDellaPagina(),
      modo: s.colori,
      carattere: getComputedStyle(document.documentElement).getPropertyValue("--carattere").trim(),
      fondoDeiCicli: scelte.fondoDeiCicli,
      trasparente: s.trasparente,
      ...(segni ? { segni } : {}),
    });
    const { larghezza, altezza } = disegno;
    const funzione = nelProgramma ? null : (mostrata.name ?? "");
    const estensione = estensioneDel(s.formato);
    const base = await nomeDaUsare(progetto.metadata.name, estensione);
    if (base === null) return;
    const scelto = await scegliFileDellImmagine(`${nomeDellImmagine(base, funzione)}${estensione}`, s.formato === "png" ? testi.filtroPng : testi.filtroSvg, estensione, partenza);
    if (scelto === null || (scelto.sostituire && !(await sostituire(scelto.percorso)))) return;
    try {
      if (s.formato === "svg") await scriviProgetto(scelto.percorso, svg);
      else await scriviByte(scelto.percorso, inBase64(await pngDallSvg(svg, larghezza, altezza, s.trasparente ? null : SFONDO_DELLA_CARTA)));
    } catch (e) {
      erroreDiUnFile(testi.esportaFlowchartErroreTitolo, scelto.percorso, e);
      return;
    }
    setAvviso(riempi(testi.flowchartEsportatoIn, { file: nomeDelFile(scelto.percorso) }));
  }

  // «Copia» e «Salva…» del codice con funzioni che non cambiano (il riquadro del codice non si ridisegna a ogni fetta):
  // chiamano le ultime versioni, che leggono lo stato di adesso.
  const comandiDelCodice = useRef({ copia: copiaIlCodice, salva: salvaIlCodice, mostra: mostraLaMancanza });
  comandiDelCodice.current = { copia: copiaIlCodice, salva: salvaIlCodice, mostra: mostraLaMancanza };
  const copiaStabile = useCallback(() => comandiDelCodice.current.copia(), []);
  const mostraStabile = useCallback((i: number) => comandiDelCodice.current.mostra(i), []);
  /** Il clic su una voce di ciò che manca: la scheda della sua procedura o funzione e, dentro, il blocco scelto, il fuoco
   * su ciò che restituisce, o il fuoco sulla riga del dato nella vista dei dati; il suggerimento nella riga di stato. */
  function mostraLaMancanza(indice: number): void {
    const v = vociDiCioCheManca[indice];
    if (!v || !progetto.functions.some((f) => f.id === v.clic.funzione)) return;
    const c = v.clic;
    // Come la voce della riga di stato: i campi aperti prima diventano un passo, e rifiutati si resta dove si è.
    if (!mostra(c.funzione)) return;
    if ("blocco" in c) {
      impostaSelezionato(c.blocco);
      setFuoco(`[data-blocco="${c.blocco}"]`);
    } else if ("fine" in c) setFuoco(`[data-restituisce="${c.fine}"]`);
    else if ("dato" in c) {
      const dati = c.comune ? (costantiComuni ?? []) : (progetto.functions.find((f) => f.id === c.funzione)?.data ?? []);
      const i = dati.findIndex((d) => d.name === c.dato);
      if (i >= 0) {
        setAperto(true);
        setScheda("dati");
        setFuocoDato(rigaDelDato(i, c.comune));
      }
    }
    setAvviso(v.suggerimento);
  }
  const salvaStabile = useCallback(() => void comandiDelCodice.current.salva().catch((e: unknown) => annotaErrore("codice non salvato", e)), []);
  /** «Copia» del codice generato: il testo del linguaggio mostrato negli appunti; l'avviso dice com'è andata. */
  function copiaIlCodice(): void {
    if (!codice?.generato) return;
    const nome = testi[paroleDeiLinguaggi[linguaggio].nome];
    // Senza gli appunti del motore l'avviso dice il perché con parole sue, non col nome di un'interfaccia.
    const scritto = navigator.clipboard?.writeText(testoDelCodice(codice.righe)) ?? Promise.reject(new Error(testi.appuntiNonDisponibili));
    scritto.then(
      () => setAvviso(riempi(testi.codiceCopiato, { linguaggio: nome })),
      (e: unknown) => setAvviso(riempi(testi.codiceNonCopiato, { dettaglio: erroreDelFile(e).dettaglio })),
    );
  }
  /** «Salva…» del codice generato: il testo del linguaggio mostrato nel file che l'utente sceglie, con l'estensione del
   * linguaggio (e, se il file c'è e la finestra del sistema non l'ha confermato, se sostituirlo). */
  async function salvaIlCodice(): Promise<void> {
    if (!codice?.generato) return;
    const testo = testoDelCodice(codice.righe);
    const filtro = testi[paroleDeiLinguaggi[linguaggio].filtro];
    const { estensione } = voceDel(linguaggio);
    const base = await nomeDaUsare(progetto.metadata.name, estensione);
    if (base === null) return;
    const scelto = await scegliFileDelCodice(`${nomeDelFileDelCodice(base, linguaggio, testi)}${estensione}`, filtro, estensione, partenza);
    if (scelto === null || (scelto.sostituire && !(await sostituire(scelto.percorso)))) return;
    try {
      await scriviProgetto(scelto.percorso, testo);
    } catch (e) {
      erroreDiUnFile(testi.codiceSalvaErroreTitolo, scelto.percorso, e);
      return;
    }
    setAvviso(riempi(testi.codiceSalvatoIn, { file: nomeDelFile(scelto.percorso) }));
  }

  /** «Salva per segnalare…»: il testo si fotografa qui, una volta sola. Prima si confermano i campi aperti, come per i comandi dei file. */
  function apriLaSegnalazione(): void {
    if (!inEsecuzione && !confermaIApertiCampi()) return;
    setMenuDellaFunzione(null);
    try {
      setFinestra({ genere: "segnala", segnalazione: perSegnalare(lingua, esecuzione, registrazione) });
    } catch (e) {
      annotaErrore("testo per la segnalazione non preparato", e);
      setAvviso(testi.segnalaNonPreparato);
    }
  }

  /** Attiva la registrazione: da qui le esecuzioni restano in memoria, l'aperta compresa. Non scrive nulla. */
  function attivaLaRegistrazione(): void {
    setRegistrazione(new InRegistrazione(esecuzione, erroriDellApp().voci));
    setFinestra(null);
    setAvviso(testi.registrazioneAttivata);
  }
  /** Disattiva, senza chiedere: è un gesto esplicito dal menu, e l'avviso dice che le esecuzioni non ci sono più. */
  function disattivaLaRegistrazione(): void {
    setRegistrazione(null);
    setAvviso(testi.registrazioneDisattivata);
  }

  /** Il gesto: quel testo nel file che l'utente sceglie. Rinunciando (al nome, alla finestra del sistema, a «Sostituire?») nessun file, e si
   * torna alla finestra con lo stesso testo. */
  async function salvaLaSegnalazione(segnalazione: PerSegnalare): Promise<void> {
    const { testo } = segnalazione;
    const torna = () => setFinestra({ genere: "segnala", segnalazione });
    const nome = await nomeDaUsare(progetto.metadata.name, ".txt", testi.nomeDellaSegnalazione);
    if (nome === null) return torna();
    const scelto = await scegliFileDelCodice(nome, testi.filtroDellaSegnalazione, ".txt", partenza);
    if (scelto === null || (scelto.sostituire && !(await sostituire(scelto.percorso)))) return torna();
    setFinestra(null);
    try {
      await scriviProgetto(scelto.percorso, testo);
    } catch (e) {
      erroreDiUnFile(testi.segnalaErroreTitolo, scelto.percorso, e);
      return;
    }
    setAvviso(riempi(testi.segnalaSalvatoIn, { file: nomeDelFile(scelto.percorso) }));
  }

  /** Il comando di un pulsante della barra: ciò che fa il suo tasto in questa situazione; assente se nulla. */
  const comandoDelTasto = (t: TastoDellEsecuzione) => {
    const a = azioneDelTasto(situazione, t);
    return a === "nulla" ? undefined : () => fai(a);
  };
  const statoInParole = tutti
    ? testi.statoCasi
    : statoEs === undefined
      ? testi.statoPronto
      : statoEs.genere === "pausa" || statoEs.genere === "pronta"
        ? riempi(testi.statoInPausa, { n: String(esecuzione!.passi) })
        : statoEs.genere === "in corso"
          ? testi.statoInCorso
          : statoEs.genere === "chiede"
            ? riempi(testi.statoChiede, { dato: chiesta?.nome ?? statoEs.dato })
            : erroreFinale
              ? testi.statoFermataDaUnErrore
              : testi.statoFinita;

  // I punti valgono per l'esecuzione da subito.
  useEffect(() => {
    if (esecuzione) esecuzione.puntiDiInterruzione = interruzioni;
  }, [esecuzione, interruzioni]);

  // Un comando in corso avanza a fette, una per fotogramma: fra due fette la finestra risponde (ai tasti, a
  // «Ferma», alla chiusura). Quando il comando si ferma, l'avviso lo dice.
  useEffect(() => {
    const es = esecuzione;
    if (!es || es.stato.genere !== "in corso") return;
    const fotogramma = requestAnimationFrame(() => {
      es.fetta(() => performance.now(), DURATA_DELLA_FETTA);
      if (es.stato.genere !== "in corso") annuncia(es);
      ridisegna();
    });
    return () => cancelAnimationFrame(fotogramma);
  }, [esecuzione, giro]);

  // «Esegui tutti» avanza a fette, una per fotogramma, come un comando in corso; alla fine gli esiti restano legati al
  // progetto eseguito, e l'avviso dice quanti casi sono raggiunti.
  useEffect(() => {
    const t = tutti;
    if (!t) return;
    const fotogramma = requestAnimationFrame(() => {
      t.fetta(() => performance.now(), DURATA_DELLA_FETTA);
      if (t.finita) {
        const esiti = conGliEsitiDi(t);
        setEsitiPerNome(esiti);
        setTutti(null);
        // I casi di questa corsa (con «Esegui i selezionati», non tutti), dai suoi esiti: la scheda mostrata ora può essere
        // un'altra, coi suoi casi.
        setAvviso(riempi(testi.annuncioCasi, { esito: riassunto(t.esiti.flatMap((x) => (x === undefined ? [] : [segnoDi(x, true)])), testi) }));
      } else ridisegna();
    });
    return () => cancelAnimationFrame(fotogramma);
  }, [tutti, giro]);

  // L'animata: in pausa, dopo la durata di un passo (o subito, dopo il clic), il passo successivo. In attesa di un
  // valore o con un comando in corso aspetta (`giro` cambia quando lo stato del nucleo cambia); a esecuzione finita
  // si spegne.
  useEffect(() => {
    const es = esecuzione;
    if (!animata || !es) return;
    const s = es.stato.genere;
    if (s === "finita" || s === "non parte") {
      setAnimata(false);
      return;
    }
    if (s !== "pausa" && s !== "pronta") return;
    const t = setTimeout(
      () => {
        subito.current = false;
        prosegui("dentro");
      },
      subito.current ? 0 : durataDelPasso[scelte.velocitaAnimata],
    );
    return () => clearTimeout(t);
  }, [animata, esecuzione, giro, scelte.velocitaAnimata]);

  // I tasti della finestra. Con una finestra aperta (anche l'elenco dei blocchi, il menu di un dato, la
  // conferma prima di cancellare un dato) nessuno di questi tasti fa nulla. Altrimenti:
  // - i tasti dell'esecuzione fanno ciò che dice la tabella (`esecuzione/tasti.ts`), anche col fuoco in un
  //   campo: un'esecuzione comincia dopo aver confermato i campi aperti, come fanno i comandi dei file;
  // - le scorciatoie dei file valgono anche col fuoco in un campo (prima confermano i campi aperti);
  // - Annulla e Ripeti, tranne che dentro un campo di testo (lì il tasto resta del motore), con dei campi
  //   aperti (di un blocco, la scheda o le celle di un dato) e durante l'esecuzione: lì il progetto non si tocca.
  // Una finestra o un menu aperti: i tasti globali e le voci del menu del Mac tacciono. Il menu di un dato tiene il
  // suo stato dentro di sé: lo si trova nel documento.
  const conUnaFinestra = () =>
    elencoSu !== null ||
    eliminando !== null ||
    togliendoComune !== null ||
    eliminandoCaso !== null ||
    togliendo !== null ||
    finestra !== null ||
    errori !== null ||
    // Un menu, o l'elenco delle procedure e delle funzioni: tengono il loro stato dentro di sé.
    document.querySelector('[role="menu"], [data-elenco]') !== null;
  useEffect(() => {
    const ascolta = (e: KeyboardEvent) => {
      const comando = comandoDellaCronologia(e);
      const delFile = comandoDelFile(e);
      const tasto = tastoDellEsecuzione(e);
      // Le scorciatoie dei file e i tasti dell'esecuzione non arrivano mai al motore (Ctrl+N aprirebbe una
      // finestra del browser, Ctrl+P la sua stampa, F10 il menu della finestra).
      if (delFile !== null || tasto !== null) e.preventDefault();
      if (conUnaFinestra()) return;
      // Durante «Esegui tutti» Maiusc+F5 lo ferma, e gli altri tasti dell'esecuzione non fanno nulla.
      if (tasto !== null && tutti !== null) {
        if (tasto === "Maiusc+F5") fermaTutti();
      }
      // La situazione letta adesso dal nucleo, non quella dell'ultimo disegno: un secondo tasto può arrivare
      // prima che la finestra si ridisegni (un tasto tenuto premuto), e il comando di prima è già in corso.
      else if (tasto !== null) fai(azioneDelTasto(situazioneDi(esecuzione), tasto));
      else if (delFile === "stampa") {
        if (stampaDisponibile) apriLaStampa();
      } else if (delFile !== null) comandiDelProgetto[delFile]();
      else if (comando !== null && !nelCampo(e.target) && !campiAperti && !inEsecuzione) {
        e.preventDefault();
        passo(comando);
      }
    };
    document.addEventListener("keydown", ascolta);
    return () => document.removeEventListener("keydown", ascolta);
  });

  // La pagina non si ricarica e non si lascia: i tasti del motore (`lasciaLaPagina`) si fermano prima di ogni altro ascoltatore, e il menu del
  // motore col tasto destro (che ha «Ricarica») resta solo nei campi di testo, dove servono Taglia, Copia e
  // Incolla. Se una ricarica arriva comunque, con modifiche non salvate (o dei campi aperti) il motore chiede
  // conferma; mai mentre la finestra si chiude dopo la domanda dell'app (`uscendo`: nella WebView2 la finestra
  // distrutta non porta la domanda, misurato; il silenzio vale per un motore che la portasse).
  const uscendo = useRef(false);
  const daPerdere = modificato || campiAperti;
  const modificatoOra = useRef(daPerdere);
  modificatoOra.current = daPerdere;
  // Per il riparo, a ogni aggiornamento riuscito della finestra e non durante il disegno: se è l'ultima modifica a rompere il disegno,
  // il file salvato da lì si può riaprire. Il testo dei campi aperti non è nel progetto, e il riparo non lo salva.
  useLayoutEffect(() => {
    ricordaIlLavoro({
      testo: () => testoCompleto(progetto),
      nome: progetto.metadata.name,
      percorso: documento.percorso,
      cartella: partenza,
      modificato,
      // Solo se serve: le esecuzioni registrate, se ce ne sono; se no l'esecuzione aperta o, senza, una mai partita del progetto.
      segnalazione: () => perSegnalare(lingua, esecuzione ?? new Esecuzione<CasoDiUnaFunzione>(progetto, limiti, { tabella: false, righeLunghe: righeLungheDi(scelte) }), registrazione),
    });
  });
  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if (lasciaLaPagina(e)) e.preventDefault();
    };
    const menu = (e: MouseEvent) => {
      if (!campoDiTesto(e.target)) e.preventDefault();
    };
    const lascia = (e: BeforeUnloadEvent) => {
      if (!modificatoOra.current || uscendo.current) return;
      e.preventDefault();
      // I motori più vecchi chiedono solo con un valore non vuoto (il testo non lo mostrano più).
      e.returnValue = "modificato";
    };
    window.addEventListener("keydown", tasto, true);
    window.addEventListener("contextmenu", menu, true);
    window.addEventListener("beforeunload", lascia);
    return () => {
      window.removeEventListener("keydown", tasto, true);
      window.removeEventListener("contextmenu", menu, true);
      window.removeEventListener("beforeunload", lascia);
    };
  }, []);

  /** I tasti sul flowchart: Canc (sul Mac anche ⌫) toglie il blocco che ha il fuoco, Ctrl+C e Ctrl+X lo copiano e lo tagliano, il
   * tasto Menu o Maiusc+F10 aprono il suo menu, Ctrl+V incolla sul «+» che ha il fuoco, Spazio su un blocco comincia a spostarlo (Invio su un «+» lo
   * rilascia), Esc annulla lo spostamento o toglie la selezione. Col fuoco su un «+» Canc non tocca il blocco
   * scelto prima. Sul blocco del valore iniziale di un dato Invio apre i suoi campi e Canc chiede se toglierlo (non
   * per una costante); niente spostamento, Taglia, Copia. Durante l'esecuzione resta solo Esc. */
  function tastoSulFlowchart(e: ReactKeyboardEvent): void {
    const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
    const tasto = e.key.toLowerCase();
    const punto = (e.target as Element).closest?.("[data-punto]")?.getAttribute("data-punto");
    const blocco = (e.target as Element).closest?.("[data-blocco]")?.getAttribute("data-blocco");
    const iniziale = (e.target as Element).closest?.("[data-iniziale]")?.getAttribute("data-iniziale");
    const b = blocco ? trova(progetto, blocco) : undefined;
    // Con un watch aperto, Esc chiude prima lui (lo ascolta il documento): un secondo Esc toglie la scelta.
    const qualcosaScelto = (scelto !== null || sceltoValore !== null) && puntato === null && fermo === null;
    // Maiusc+F9: il watch dalla tastiera, finché i nomi nel disegno ci sono (durante l'esecuzione, e dopo la fine finché il
    // progetto non cambia).
    const conIlWatch = (e.target as Element).closest?.("[data-blocco], [data-restituisce]");
    if (e.key === "F9" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && nomiNelDisegno && conIlWatch instanceof SVGGElement) {
      e.preventDefault();
      watchDaTastiera(conIlWatch);
      return;
    }
    if (inEsecuzione) {
      if (e.key === "Escape" && qualcosaScelto) {
        setSelezionato(null);
        e.preventDefault();
      }
      return;
    }
    const apreIlMenu = e.key === "ContextMenu" || (e.shiftKey && e.key === "F10");
    const sotto = () => (e.target as Element).closest("[data-blocco], [data-iniziale]")!.getBoundingClientRect();
    const fine = (e.target as Element).closest?.("[data-restituisce]");
    if (e.key === "Enter" && !ctrl && fine && inMovimento === null) apriRestituisce();
    else if (e.key === "Enter" && !ctrl && iniziale && inMovimento === null) apriValore(iniziale);
    else if (apreIlMenu && iniziale) setMenuDelBlocco({ chi: { valore: iniziale }, x: sotto().left, y: sotto().bottom });
    else if (tastoCheElimina(e) && iniziale) {
      if (siToglie(datoDellaRiga(progetto, iniziale, mostrata.id))) chiediDiTogliere(iniziale);
    } else if (e.key === "Enter" && !ctrl && b && inMovimento === null) apriCampi(b);
    else if (e.key === " " && !ctrl && b) {
      // Su un blocco della scelta si spostano tutti i blocchi scelti.
      const conGliAltri = blocchiScelti.has(b.id) && quantiScelti > 1 && scelto !== null;
      setSpostando(conGliAltri ? { id: scelto, ancora: ancoraScelta } : { id: b.id, ancora: null });
      setAvviso(
        conGliAltri
          ? riempi(testi.spostamentoDiPiuIniziato, { n: quantiScelti.toLocaleString(lingua) })
          : riempi(testi.spostamentoIniziato, { blocco: nomeDelBlocco(b, testi, espressione ?? ((t) => t), progetto.functions) }),
      );
    } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp") && b) {
      // Maiusc+frecce: la scelta si allarga (o si stringe) al blocco vicino nella stessa sequenza, dal blocco scelto. Solo
      // col fuoco su un blocco: in un campo di testo (i campi stanno fuori dal disegno) il tasto resta del campo.
      const scelti = blocchiScelti.has(b.id) && scelto !== null;
      const attivo = scelti ? scelto : b.id;
      const u = trattoDellaVista(progetto, attivo, attivo, coppieDelProgetto);
      const i = u === undefined ? -1 : e.key === "ArrowDown" ? u.a + 1 : u.da - 1;
      const vicino = u === undefined || i < 0 ? undefined : blocchiDelTratto(progetto, { ...u, da: i, a: i })[0];
      if (vicino) estendiA(mostratoDi(vicino.id), scelti ? (ancoraScelta ?? scelto) : b.id);
    } else if (e.key === "Escape" && inMovimento !== null) {
      setSpostando(null);
      setAvviso(testi.spostamentoAnnullato);
    } else if (tastoCheElimina(e) && b) cancella(b.id);
    else if (apreIlMenu && b) setMenuDelBlocco({ chi: { id: b.id }, x: sotto().left, y: sotto().bottom });
    else if (ctrl && tasto === "c" && b) copiaIl(b.id);
    else if (ctrl && tasto === "x" && b) {
      copiaIl(b.id);
      cancella(b.id);
    } else if (ctrl && tasto === "v" && punto && appunti) {
      const posto = trovaPosto(struttura, punto);
      if (posto) inserisciNel(posto, "incolla");
    } else if (e.key === "Escape" && qualcosaScelto) setSelezionato(null);
    else return;
    e.preventDefault();
  }

  // ------------------------------------------------------------------------------ la vista dei dati

  /** La riga del dato, come elemento da mettere a fuoco: nelle celle il primo campo. */
  const rigaDelDato = (indice: number, comune = false) =>
    `[data-dato="${chiaveDellaRiga(comune, indice)}"]${modoDati === "celle" && (!comune || comuniModificabili) ? " input" : ""}`;
  function apriDato(indice: number, campo?: "iniziale", comune = false): void {
    const d = (comune ? (costantiComuni ?? []) : mostrata.data)[indice];
    if (d) setDatoInModifica({ indice, bozza: bozzaDelDato(d, valoreRipetuto, comune), ...(campo ? { campo } : {}), ...(comune ? { comune } : {}) });
  }
  /** Le scelte della natura nei campi dei dati della funzione mostrata: un parametro solo in una procedura o in una funzione
   * (per riferimento e per uscita solo in una procedura); un parametro diventa un dato di lavoro e il contrario. */
  const parametriAmmessi: readonly Natura[] = nelProgramma ? [] : mostrata.kind === "procedure" ? ["value", "reference", "out"] : ["value"];
  const nature = { parametri: [...parametriAmmessi, "variabile", "costante"], dati: ["variabile", "costante", ...parametriAmmessi] } as const;
  /** Dove va il dato dei campi confermando la bozza: la casella «globale» lo porta in fondo alle costanti comuni, o in fondo
   * ai dati della funzione mostrata. */
  function doveDopo(p: Progetto, scelto: { readonly indice: number; readonly comune: boolean }, bozza: BozzaDelDato): { comune: boolean; indice: number } {
    if (scelto.comune === bozza.globale) return scelto;
    return bozza.globale ? { comune: true, indice: (p.shared_constants ?? []).length } : { comune: false, indice: datiDi(p, mostrata.id).length };
  }
  /** Il passo che conferma la bozza del dato scelto nel progetto `p`: gli attributi (con le regole, se il nome cambia) e lo
   * spostamento della casella «globale», insieme; `null` se nulla cambia. Con `restaComune` una costante comune senza la
   * casella non si sposta (lo chiede la finestra di conferma). */
  function passoDelDato(p: Progetto, scelto: { readonly indice: number; readonly comune: boolean }, bozza: BozzaDelDato, restaComune = false): Operazione | null {
    const d = (scelto.comune ? (p.shared_constants ?? []) : datiDi(p, mostrata.id))[scelto.indice];
    if (!d) return null;
    const nuovo = datoDaBozza(bozza);
    const cambia = stessoDato(d, nuovo) ? null : scelto.comune ? cambiaComune(scelto.indice, nuovo) : cambiaDato(scelto.indice, nuovo, mostrata.id);
    const sposta = scelto.comune ? !bozza.globale && !restaComune : bozza.globale;
    const altrove = !sposta ? null : scelto.comune ? rendiDellaFunzione(scelto.indice, mostrata.id) : rendiComune(scelto.indice, mostrata.id);
    return cambia && altrove ? poi(cambia, altrove) : (cambia ?? altrove);
  }
  /** Il comando dell'avviso del dato letto prima di avere un valore: la vista dei dati si apre (se è chiusa), la
   * riga del dato si apre col fuoco nel campo del valore iniziale (la scheda lo dà da sé, all'apertura); nelle celle la
   * riga è già fatta di campi, e il fuoco va nella sua cella. */
  function daiUnValore(chiave: string, funzione: string = mostrata.id): void {
    const r = datoDellaRiga(progetto, chiave, funzione);
    if (!r || r.comune) return;
    // Il dato di un'altra procedura o funzione: prima la sua scheda.
    if (funzione !== mostrata.id && !mostra(funzione)) return;
    setAperto(true);
    setScheda("dati");
    if (modoDati === "scheda") setDatoInModifica({ indice: r.indice, bozza: bozzaDelDato(r.dato, valoreRipetuto), campo: "iniziale" });
    else setFuocoDato(`[data-dato="${chiave}"] [data-campo="iniziale"]`);
  }
  /** La correzione del riferimento senza valore: il parametro della procedura passa da *rif* a *out*, e le sue voci escono
   * dai casi della procedura, in un passo (Annulla lo riporta). */
  function sostituisciConOut(funzione: string, indice: number, blocco: string | null): void {
    const c = confermaIApertiCampi();
    if (!c) return;
    // Il pulsante sparisce con l'errore: il fuoco va al blocco della voce, se è nel flowchart mostrato; sulla scheda della
    // procedura, alla riga del parametro nella vista dei dati.
    const nelDisegno = blocco !== null && tela.current?.querySelector(`[data-blocco="${blocco}"]`) != null;
    const dopo = nelDisegno ? () => ({ seleziona: blocco, fuoco: `[data-blocco="${blocco}"]` }) : undefined;
    if (datiDi(c.presente, funzione)[indice]?.parameter !== "reference") return;
    if (modifica(perUscita(indice, funzione), dopo, c) && !nelDisegno && funzione === mostrata.id) setFuocoDato(rigaDelDato(indice, false));
  }
  /** Nelle celle si comincia a scrivere senza aprire nulla: scrivere in un'altra riga conferma la prima. */
  function cambiaDatoInModifica(indice: number, bozza: BozzaDelDato, comune = false): void {
    if (datoInModifica && (datoInModifica.indice !== indice || (datoInModifica.comune === true) !== comune) && !confermaDato(false)) return;
    setDatoInModifica({ indice, bozza, ...(comune ? { comune } : {}) });
  }
  /** Invio, un clic fuori dalla scheda, il fuoco che lascia la riga a celle: i campi diventano un passo; se
   * sono quelli di prima, nessun passo. Con Invio nella scheda il fuoco torna sulla riga. Rifiutati dal nucleo, i
   * campi restano aperti col testo scritto (falso). */
  function confermaDato(torna: boolean): boolean {
    if (!datoInModifica) return true;
    const { indice, bozza } = datoInModifica;
    const comune = datoInModifica.comune === true;
    if (!comune && aggiunto?.indice === indice && stessoDato(aggiunto.vuoto, datoDaBozza(bozza))) {
      togliIlDatoAggiunto(aggiunto.prima);
      return true;
    }
    // Un dato appena aggiunto con un errore: la prima conferma lo mostra, e i campi restano aperti.
    if (!comune && datoNuovo === indice) {
      setNuovo(null);
      if (candidatoDelDato.some((s) => s.genere === "errore")) return false;
    }
    // Una costante comune senza più la casella «globale» che altre funzioni usano: prima gli attributi, poi la finestra
    // chiede se toglierla dalle comuni (le altre funzioni mostreranno un errore).
    const vecchio = comune ? costantiComuni?.[indice]?.name : undefined;
    const chi = comune && !bozza.globale && vecchio !== undefined ? funzioniCheUsano(progetto, vecchio).filter((id) => id !== mostrata.id) : [];
    const chiede = chi.length > 0;
    const dopo = chiede ? { comune, indice } : doveDopo(progetto, { indice, comune }, bozza);
    const fuoco = torna && modoDati === "scheda" ? rigaDelDato(dopo.indice, dopo.comune) : null;
    const op = passoDelDato(progetto, { indice, comune }, bozza, chiede);
    const voci = op ? avvisoDelleVociCheRestano(progetto, indice, comune, bozza) : null;
    if (op && !modifica(op)) return false;
    if (voci !== null) setAvviso(voci);
    setAggiunto(null);
    setDatoInModifica(null);
    if (chiede) setTogliendoComune({ indice, nome: datoDaBozza(bozza).name, chi });
    else if (fuoco) setFuocoDato(fuoco);
    return true;
  }
  /** Rinominando un dato che una lettura riceve, i valori dei casi restano dove un altro dato con quel nome la riceve
   * dalla stessa radice: l'avviso dice dove. Si calcola sul progetto di prima del passo (dopo il nome è già quello
   * nuovo), da ogni conferma del dato: Invio, il clic fuori e i comandi che confermano i campi aperti. */
  function avvisoDelleVociCheRestano(p: Progetto, indice: number, comune: boolean, bozza: BozzaDelDato): string | null {
    if (comune) return null;
    const nome = datoDaBozza(bozza).name;
    const vecchioNome = datiDi(p, mostrata.id)[indice]?.name;
    const restano = vecchioNome !== undefined && vecchioNome !== nome && eUnaParolaSola(nome) ? vociCheRestano(p, indice, mostrata.id) : [];
    if (restano.length === 0) return null;
    const luoghi = [...new Set(restano.flatMap((r) => r.altre))].map((a) => (a === null ? testi.casoValoriRestanoNelProgramma : riempi(testi.casoValoriRestanoIn, { nome: a })));
    return riempi(testi.casoValoriRestano, { nome: vecchioNome!, nuovo: nome, dove: luoghi.join(testi.casoValoriRestanoE) });
  }
  /** La costante comune tolta dalle comuni dopo la finestra: in fondo ai dati della funzione mostrata. */
  function togliDalleComuni(): void {
    const t = togliendoComune;
    setTogliendoComune(null);
    if (t && modifica(rendiDellaFunzione(t.indice, mostrata.id))) setFuocoDato(rigaDelDato(mostrata.data.length));
  }
  /** Esc: i campi tornano quelli del dato, senza passi; un dato appena aggiunto sparisce. */
  function rinunciaDato(): void {
    if (datoInModifica && aggiunto?.indice === datoInModifica.indice) {
      togliIlDatoAggiunto(aggiunto.prima);
      return;
    }
    if (datoInModifica && modoDati === "scheda") setFuocoDato(rigaDelDato(datoInModifica.indice, datoInModifica.comune));
    setDatoInModifica(null);
  }
  /** La cronologia torna quella di prima dell'aggiunta (nemmeno «Ripeti» la riporta); il fuoco su «Aggiungi». */
  function togliIlDatoAggiunto(prima: Cronologia): void {
    const parametro = aggiunto?.vuoto.parameter !== undefined;
    setDocumento((d) => ({ ...d, cronologia: prima }));
    setAggiunto(null);
    setDatoInModifica(null);
    setFuocoDato(parametro ? "[data-aggiungi-parametro]" : "[data-aggiungi]");
  }
  // ------------------------------------------------------------------------------------- i record

  const rigaDelRecord = (indice: number) => `[data-record="${chiaveDelRecord(indice)}"]`;
  function apriRecord(indice: number): void {
    const r = progetto.records?.[indice];
    if (r) setRecordInModifica({ indice, bozza: bozzaDelRecord(r) });
  }
  /** Il passo che conferma la bozza del record in quella posizione nel progetto `p`; `null` se nulla cambia. */
  function passoDelRecord(p: Progetto, indice: number, bozza: BozzaDelRecord): Operazione | null {
    const r = p.records?.[indice];
    if (!r) return null;
    const { record, origini } = recordDaBozza(bozza);
    return stessoRecord(r, record) ? null : cambiaRecord(indice, record, origini);
  }
  /** Invio, un clic fuori dalla scheda: i campi diventano un passo. Un record appena aggiunto e lasciato com'era sparisce
   * senza passi; con un errore, la prima conferma lo mostra e i campi restano aperti. */
  function confermaRecord(torna: boolean): boolean {
    if (!recordInModifica) return true;
    const { indice, bozza, nuovo } = recordInModifica;
    if (nuovo && stessoRecord(recordDaBozza(bozza).record, recordNuovo)) {
      togliIlRecordAggiunto(nuovo.prima);
      return true;
    }
    if (nuovo && !nuovo.mostrato && erroriDelRecord(progetto, indice, bozza).length > 0) {
      setRecordInModifica({ ...recordInModifica, nuovo: { ...nuovo, mostrato: true } });
      return false;
    }
    const op = passoDelRecord(progetto, indice, bozza);
    if (op && !modifica(op)) return false;
    setRecordInModifica(null);
    if (torna) setFuocoDato(rigaDelRecord(indice));
    return true;
  }
  function rinunciaRecord(): void {
    if (recordInModifica?.nuovo) {
      togliIlRecordAggiunto(recordInModifica.nuovo.prima);
      return;
    }
    if (recordInModifica) setFuocoDato(rigaDelRecord(recordInModifica.indice));
    setRecordInModifica(null);
  }
  /** La cronologia torna quella di prima dell'aggiunta (nemmeno «Ripeti» la riporta). */
  function togliIlRecordAggiunto(prima: Cronologia): void {
    setDocumento((d) => ({ ...d, cronologia: prima }));
    setRecordInModifica(null);
  }
  /** Un record nuovo in fondo (dal menu «Progetto» o dal pulsante): un passo; poi la sua scheda, nella vista dei dati. */
  function aggiungiUnRecord(): void {
    const prima = confermaIApertiCampi();
    if (!prima) return;
    const indice = (prima.presente.records ?? []).length;
    if (!modifica(aggiungiRecord(), undefined, prima)) return;
    setAperto(true);
    setScheda("dati");
    // Dal menu «Progetto» il fuoco torna al pulsante del menu anche al fotogramma dopo il comando (Ark): la scheda aperta
    // subito lo prenderebbe per un «altrove» e confermerebbe il record ancora vuoto, che sparirebbe. Si apre dopo.
    requestAnimationFrame(() => requestAnimationFrame(() => setRecordInModifica({ indice, bozza: bozzaDelRecord(recordNuovo), nuovo: { prima, mostrato: false } })));
  }
  /** Cancellare un record: prima i campi aperti; poi, se qualche dato ha il suo tipo (o se la conferma è chiesta sempre),
   * la finestra. */
  function chiediDiEliminareIlRecord(indice: number): void {
    const c = confermaIApertiCampi();
    if (!c) return;
    const r = c.presente.records?.[indice];
    if (!r) return;
    const usi = usiDelRecord(c.presente, r.name);
    if (usi > 0 || sempre) setEliminandoRecord({ indice, nome: r.name, usi });
    else eliminaIlRecord(indice, c);
  }
  function eliminaIlRecord(indice: number, da: Cronologia = cronologia): void {
    setEliminandoRecord(null);
    modifica(eliminaRecord(indice), undefined, da);
  }
  /** Dal menu della riga: la copia sotto, o lo scambio col vicino; il fuoco sulla riga che ne esce. */
  function suUnRecord(operazione: Operazione, fuocoSu: number): void {
    const c = confermaIApertiCampi();
    if (c && modifica(operazione, undefined, c)) setFuocoDato(rigaDelRecord(fuocoSu));
  }

  /** Un dato nuovo in fondo, senza nome (o un parametro per valore, in fondo alla firma): un passo; poi i suoi campi, col
   * fuoco sul nome. Prima i campi aperti diventano un passo, come con un clic fuori (il pulsante non lo fa alla pressione:
   * `ui/fuori.ts`). */
  function aggiungiUnDato(parametro = false): void {
    const prima = confermaIApertiCampi();
    if (!prima) return;
    const indice = datiDi(prima.presente, mostrata.id).length;
    const nuovo: Dato = parametro ? { name: "", type: "integer", parameter: "value" } : { name: "", type: "integer" };
    if (!modifica(aggiungiDato(nuovo, mostrata.id), undefined, prima)) return;
    setNuovo({ dato: indice });
    if (modoDati === "scheda") {
      setDatoInModifica({ indice, bozza: bozzaDelDato(nuovo, valoreRipetuto) });
      setAggiunto({ indice, vuoto: nuovo, prima });
    }
    else setFuocoDato(rigaDelDato(indice));
  }
  /** Cancellare un dato: prima i campi aperti diventano un passo (il testo scritto resta nel progetto anche
   * rinunciando, e Ctrl+Z riporta il dato col testo); poi, se qualche regola lo usa (o se la conferma è chiesta
   * sempre), la finestra. Un dato appena aggiunto e lasciato vuoto sparisce già con la conferma, senza passi. */
  function chiediDiEliminare(indice: number, comune = false): void {
    const c = confermaIApertiCampi();
    if (!c) return;
    const d = (comune ? (c.presente.shared_constants ?? []) : datiDi(c.presente, mostrata.id))[indice];
    if (!d) {
      if (!comune && aggiunto?.indice === indice) setFuocoDato(aggiunto.vuoto.parameter !== undefined ? "[data-aggiungi-parametro]" : "[data-aggiungi]");
      return;
    }
    if (comune) {
      const regole = regoleCheUsanoLaComune(c.presente, d.name);
      if (regole > 0 || sempre) setEliminando({ indice, nome: d.name, regole, comune });
      else eliminaIlDato({ indice, nome: d.name, regole, comune }, c);
      return;
    }
    // Le regole si contano anche coi nomi che il dato aveva prima e che nessun dato porta più: un nome nuovo che
    // non è una parola sola non entra nelle regole, che restano scritte col nome vecchio, e il dato è usato lo stesso.
    const definiti = new Set([...datiDi(c.presente, mostrata.id), ...(c.presente.shared_constants ?? [])].map((x) => x.name));
    const regole = regoleCheUsano(c.presente, [d.name, ...nomiDiPrima(c, indice, mostrata.id).filter((n) => !definiti.has(n))], mostrata.id);
    // Un parametro: anche le chiamate della sua funzione, che hanno un argomento per lui.
    const chiamate = d.parameter === undefined ? undefined : { funzione: mostrata.name ?? "", n: chiamateDi(c.presente, mostrata.name ?? "").length };
    const daEliminare = { indice, nome: d.name, regole, ...(chiamate ? { chiamate } : {}) };
    setTogliArgomenti(false);
    if (regole > 0 || (chiamate?.n ?? 0) > 0 || sempre) setEliminando(daEliminare);
    else eliminaIlDato(daEliminare, c);
  }
  /** `da` è la cronologia su cui eliminare: quella mostrata, o quella appena uscita dalla conferma dei campi. Un parametro
   * con la spunta perde anche il suo argomento nelle chiamate. */
  function eliminaIlDato(e: DaEliminare, da: Cronologia = cronologia, conGliArgomenti = false): void {
    setEliminando(null);
    const { indice, comune = false } = e;
    const op = comune ? eliminaComune(indice) : e.chiamate ? eliminaParametro(indice, mostrata.id, conGliArgomenti) : eliminaDato(indice, mostrata.id);
    if (!modifica(op, undefined, da)) return;
    const dati = comune ? (da.presente.shared_constants ?? []) : datiDi(da.presente, mostrata.id);
    // Il fuoco sulla riga che prende il posto di quella tolta nella sua tabella, o su quella prima; nessuna, «Aggiungi».
    const stessa = (x: Dato) => comune || (x.parameter === undefined) === (e.chiamate === undefined);
    const dopo = dati.findIndex((x, i) => i > indice && stessa(x));
    const prima = dati.findLastIndex((x, i) => i < indice && stessa(x));
    const vicina = dopo >= 0 ? dopo - 1 : prima;
    setFuocoDato(vicina >= 0 ? rigaDelDato(vicina, comune) : e.chiamate ? "[data-aggiungi-parametro]" : "[data-aggiungi]");
  }
  /** Dal menu della riga: la copia del dato sotto di lui, o il dato scambiato col vicino; prima i campi aperti diventano
   * un passo. Il fuoco va alla riga della copia, o del dato spostato. */
  function suUnDato(operazione: Operazione, fuocoSu: number, comune = false): void {
    const c = confermaIApertiCampi();
    if (c && modifica(operazione, undefined, c)) setFuocoDato(rigaDelDato(fuocoSu, comune));
  }
  /** La posizione nel file del vicino, prima (`-1`) o dopo (`1`), nella stessa tabella del dato in `indice`: fra i parametri
   * o fra i dati di lavoro. */
  const vicinoNellaTabella = (indice: number, verso: -1 | 1) => {
    const parametro = mostrata.data[indice]?.parameter !== undefined;
    let i = indice + verso;
    while (i >= 0 && i < mostrata.data.length && (mostrata.data[i]!.parameter !== undefined) !== parametro) i += verso;
    return i;
  };

  // ------------------------------------------------------------------------------ i casi d'uso

  /** I campi del caso sotto la sua riga, che diventa il caso scelto. Prima i campi aperti di un altro diventano un
   * passo. */
  function apriCaso(indice: number): void {
    const c = casi[indice];
    if (!c) return;
    if (casoInModifica?.indice === indice) return;
    if (casoInModifica && !confermaCaso(false)) return;
    setCasoScelto(indice);
    setCasoInModifica({ indice, bozza: bozzaDelCaso(c) });
  }
  /** Invio, un clic fuori dai campi: i campi diventano un passo; se sono quelli di prima, nessun passo. Rifiutati dal
   * nucleo (un nome già usato), i campi restano aperti col testo scritto e il motivo sotto di loro (falso). */
  function confermaCaso(torna: boolean): boolean {
    if (!casoInModifica) return true;
    const { indice, bozza } = casoInModifica;
    const c = casi[indice];
    if (c && !stessoCaso(c, bozza) && !modifica(cambiaCaso(indice, casoDaBozza(c, bozza), funzioneDeiCasi))) return false;
    // Un caso selezionato resta selezionato col nome nuovo.
    if (c && c.name !== bozza.nome && selezionati.has(chiaveDiUnCaso(c.name)))
      setSelezionati((s) => new Set([...s].filter((n) => n !== chiaveDiUnCaso(c.name))).add(chiaveDiUnCaso(bozza.nome)));
    setCasoAggiunto(null);
    setCasoInModifica(null);
    if (torna) setFuocoDato(rigaDelCaso(indice));
    return true;
  }
  /** Esc: i campi si chiudono senza passi; un caso appena aggiunto sparisce. */
  function rinunciaCaso(): void {
    if (!casoInModifica) return;
    if (casoAggiunto?.indice === casoInModifica.indice) {
      setDocumento((d) => ({ ...d, cronologia: casoAggiunto.prima }));
      setCasoAggiunto(null);
      setCasoInModifica(null);
      setCasoScelto(null);
      setFuocoDato("[data-aggiungi-caso]");
      return;
    }
    setFuocoDato(rigaDelCaso(casoInModifica.indice));
    setCasoInModifica(null);
  }
  /** Un caso nuovo in fondo («caso N», nessun output; nessun valore, o in una procedura o funzione una voce per parametro):
   * un passo; poi i suoi campi, col fuoco sul nome. Prima i campi aperti diventano un passo. */
  function aggiungiUnCaso(): void {
    const prima = confermaIApertiCampi();
    if (!prima) return;
    const esistenti = casiDella(prima.presente, funzioneDeiCasi);
    const vuoto: CasoDiUnaFunzione = { name: nomeDelCasoNuovo(esistenti, (n) => riempi(testi.nomeDelCasoNuovo, { n: String(n) })), inputs: [], expected: { output: "" } };
    const nuovo = casoDaBozza(vuoto, { ...bozzaDelCaso(vuoto), voci: vociDelCasoNuovo(nelProgramma ? [] : mostrata.data, prima.presente.records) });
    if (!modifica(aggiungiCaso(nuovo, funzioneDeiCasi), undefined, prima)) return;
    setCasoScelto(esistenti.length);
    setCasoInModifica({ indice: esistenti.length, bozza: bozzaDelCaso(nuovo) });
    setCasoAggiunto({ indice: esistenti.length, prima });
  }
  /** «Salva l'esecuzione come caso d'uso» (nella console) e «Nuovo caso dall'ultima esecuzione» (nella scheda dei casi):
   * prima i campi aperti diventano un passo. Il caso va alla radice dell'esecuzione (il programma, o la funzione eseguita da
   * sola), non alla scheda mostrata: un errore in una funzione chiamata mostra la sua. Un caso uguale c'è già: nessun
   * passo, si sceglie lui col fuoco sulla sua riga, e l'avviso lo dice. Se no un caso nuovo («caso N», un passo) coi campi
   * aperti sul nome selezionato; in un'altra scheda i campi si aprono dopo il cambio, che chiude quelli di prima. */
  function salvaLEsecuzione(): void {
    if (dallUltima === undefined || !("caso" in dallUltima)) return;
    const { caso, radice } = dallUltima;
    const prima = confermaIApertiCampi();
    if (!prima) return;
    const id = radice ?? principaleDi(prima.presente).id;
    const altraScheda = id !== mostrata.id;
    const esistenti = casiDella(prima.presente, radice);
    setAperto(true);
    setScheda("casi");
    const uguale = casoUguale(esistenti, caso);
    if (uguale >= 0) {
      if (altraScheda) {
        casoDopoLaScheda.current = uguale;
        apriScheda(id);
      } else setCasoScelto(uguale);
      setFuocoDato(rigaDelCaso(uguale));
      setAvviso(riempi(testi.annuncioCasoUguale, { nome: esistenti[uguale]!.name || testi.casoSenzaNome }));
      return;
    }
    const nuovo: CasoDiUnaFunzione = { name: nomeDelCasoNuovo(esistenti, (n) => riempi(testi.nomeDelCasoNuovo, { n: String(n) })), inputs: caso.inputs, expected: caso.expected };
    if (!modifica(aggiungiCaso(nuovo, radice), undefined, prima)) return;
    const campi = { indice: esistenti.length, bozza: bozzaDelCaso(nuovo), prima };
    if (altraScheda) {
      casoDopoLaScheda.current = campi.indice;
      campiDopoLaScheda.current = campi;
      apriScheda(id);
      return;
    }
    setCasoScelto(campi.indice);
    setCasoInModifica({ indice: campi.indice, bozza: campi.bozza, seleziona: true });
    setCasoAggiunto({ indice: campi.indice, prima });
  }
  /** Canc, «Elimina» nel menu o nei campi: prima i campi aperti diventano un passo, poi la conferma, sempre. */
  function chiediDiEliminareIlCaso(indice: number): void {
    const c = confermaIApertiCampi();
    const caso = c ? casiDella(c.presente, funzioneDeiCasi)[indice] : undefined;
    if (caso) setEliminandoCaso({ indice, nome: caso.name });
  }
  /** La conferma: il caso sparisce (un passo); il fuoco va al caso che ne prende il posto, o ad «Aggiungi un caso». */
  function eliminaIlCaso(): void {
    const e = eliminandoCaso;
    setEliminandoCaso(null);
    if (!e || !modifica(eliminaCaso(e.indice, funzioneDeiCasi))) return;
    const resto = casi.length - 1;
    setCasoScelto(null);
    setFuocoDato(resto === 0 ? "[data-aggiungi-caso]" : rigaDelCaso(Math.min(e.indice, resto - 1)));
  }
  /** Dal menu della riga: la copia del caso («… (copia)») sotto di lui, o il caso scambiato col vicino. */
  function suUnCaso(operazione: Operazione, fuocoSu: number): void {
    const c = confermaIApertiCampi();
    if (c && modifica(operazione, undefined, c)) setFuocoDato(rigaDelCaso(fuocoSu));
  }
  /** «Esegui tutti», o solo i selezionati: prima i campi aperti diventano un passo; la colonna di un'esecuzione finita si
   * chiude. */
  function eseguiICasi(soloSelezionati: boolean): void {
    if (inEsecuzione) return;
    const c = confermaIApertiCampi();
    const tuttiICasi = c ? casiDella(c.presente, funzioneDeiCasi) : [];
    const indici = tuttiICasi.flatMap((x, i) => (!soloSelezionati || selezionati.has(chiaveDiUnCaso(x.name)) ? [i] : []));
    if (!c || indici.length === 0) return;
    registrazione?.chiudi(erroriDellApp().voci);
    setEsecuzione(null);
    setTutti(new TuttiICasi(c.presente, limiti, indici, funzioneDeiCasi));
    setAvviso(null);
  }
  /** «Esegui» e «Passo passo» di un caso: come F5 e F10, nella colonna, coi valori del caso. */
  function eseguiUnCaso(indice: number, passoPasso: boolean): void {
    if (inEsecuzione) return;
    setAnimata(false);
    avvia(passoPasso ? "sopra" : "continua", indice);
  }
  /** Dall'esito mostrato sotto il caso, nell'atteso (un passo): l'operazione del nucleo decide che cosa scrivere. Il caso
   * non si riesegue da sé: il suo pallino dice che va eseguito di nuovo, e Annulla riaccende l'esito
   * di prima. */
  function dallEsitoNellAtteso(indice: number, operazione: (indice: number, esito: EsitoDelCaso, funzione?: string) => Operazione, annuncio: (esito: EsitoDelCaso) => string): void {
    const caso = casi[indice];
    const esito = caso ? segniDeiCasi[indice]?.esito : undefined;
    if (!caso || !esito || inEsecuzione) return;
    // L'annuncio dopo il passo (che toglie quello di prima): l'atteso è cambiato, anche se il pallino lo dice solo a chi
    // lo vede.
    if (modifica(operazione(indice, esito, funzioneDeiCasi))) setAvviso(riempi(annuncio(esito), { nome: caso.name || testi.casoSenzaNome }));
  }
  /** Gli esiti per funzione e nome con quelli dei casi finiti in `t`. */
  function conGliEsitiDi(t: TuttiICasi): ReadonlyMap<string, { readonly progetto: Progetto; readonly limiti: Tetti; readonly esito: EsitoDelCaso }> {
    const m = new Map(esitiPerNome);
    const di = t.funzione ?? principaleDi(t.progetto).id;
    t.casi.forEach((c, i) => {
      const esito = t.esiti[i];
      if (esito) m.set(chiaveDelCaso(di, c.name), { progetto: t.progetto, limiti: t.limiti, esito });
    });
    return m;
  }
  /** «Ferma» (e Maiusc+F5) durante «Esegui tutti»: restano gli esiti dei casi finiti. */
  function fermaTutti(): void {
    const t = tutti;
    if (!t) return;
    setEsitiPerNome(conGliEsitiDi(t));
    setTutti(null);
    setAvviso(riempi(testi.annuncioCasiFermati, { n: String(t.eseguiti), totale: String(t.totale) }));
  }
  /** Il pallino di ogni caso della scheda mostrata: l'esito della corsa in corso (se è dei suoi casi), o l'ultimo di quel
   * caso, attuale se è del progetto e dei limiti di adesso. */
  function segniDi(esiti: typeof esitiPerNome, inCorso: TuttiICasi | null): SegnoDelCaso[] {
    const suoi = inCorso !== null && (inCorso.funzione ?? principale.id) === mostrata.id;
    return casi.map((c, i) => {
      const ora = suoi ? inCorso.esiti[i] : undefined;
      if (ora) return segnoDi(ora, true);
      const r = esiti.get(chiaveDiUnCaso(c.name));
      return segnoDi(r?.esito, r !== undefined && r.progetto === progetto && r.limiti === limiti);
    });
  }
  const segniDeiCasi = segniDi(esitiPerNome, tutti);

  // ------------------------------------------------------------------------ il progetto e i suoi file

  /** Il progetto aperto diventa `p`, con una cronologia nuova (la pila si azzera) e senza nulla in corso. */
  function carica(p: Progetto, percorso: string | null): void {
    setDocumento(documentoDi(p, percorso));
    setSchede({ aperte: [], mostrata: null });
    setMenuDellaFunzione(null);
    setSelezionato(null);
    setSpostando(null);
    setElencoSu(null);
    setInModifica(null);
    setFineInModifica(null);
    setDatoInModifica(null);
    setRecordInModifica(null);
    setEliminandoRecord(null);
    setValoreInModifica(null);
    setAggiunto(null);
    setEliminando(null);
    setTogliendoComune(null);
    setTogliendo(null);
    setCasoScelto(null);
    setCasoInModifica(null);
    setCasoAggiunto(null);
    setEliminandoCaso(null);
    setTutti(null);
    setEsitiPerNome(new Map());
    setSelezionati(new Set());
    setAvviso(null);
    if (esecuzione) setAperto(true);
    registrazione?.chiudi(erroriDellApp().voci);
    setEsecuzione(null);
  }

  /** Prima di un comando dei file e della chiusura: i campi aperti (di un blocco, la scheda o le celle di un
   * dato) diventano un passo, come con un clic fuori, e il testo scritto diventa una modifica. Restituisce la
   * cronologia che ne esce, perché il comando la usi già nello stesso gesto. Se il nucleo rifiuta un passo,
   * nulla cambia: i campi restano aperti col testo scritto, l'avviso lo dice, e la risposta è `null` (il
   * comando, o la chiusura, non prosegue). */
  function confermaIApertiCampi(): Cronologia | null {
    let c = cronologia;
    let rifiutato = false;
    // L'avviso della rinomina di un dato, detto dopo il passo; il salvataggio che segue lo tiene dopo il suo.
    let voci: string | null = null;
    avvisoDellaConferma.current = null;
    // La scheda della vista dei dati coi campi rifiutati: torna in vista (anche col pannello chiuso o sull'altra scheda),
    // perché i campi dicono il motivo.
    let schedaRifiutata: "dati" | "casi" | null = null;
    const unPasso = (operazione: Operazione, scheda?: "dati" | "casi") => {
      const esito = applica(c, operazione);
      if (esito.ok) c = esito.cronologia;
      else {
        rifiutato = true;
        schedaRifiutata ??= scheda ?? null;
      }
    };
    if (inModifica) {
      const b = trova(c.presente, inModifica.id);
      const operazione = operazioneDeiCampi(inModifica.id, inModifica.bozza, inModifica.coppia);
      if (operazione === undefined) rifiutato = true;
      else if (b && !campiDiPrima(b, inModifica.bozza, inModifica.coppia)) unPasso(operazione);
    }
    if (fineInModifica && funzioneDellaFine) {
      const testo = nellaFormaDelFile(fineInModifica.bozza, nomi);
      if (testo !== (funzioneDellaFine.end.return_value ?? "")) unPasso(restituisce(funzioneDellaFine.id, testo));
    }
    if (datoInModifica) {
      const { indice, bozza } = datoInModifica;
      const comune = datoInModifica.comune === true;
      // Un dato appena aggiunto e lasciato vuoto sparisce senza passi, come confermandolo. La casella «globale» qui sposta
      // il dato senza la finestra: un comando aspetta.
      const passo = passoDelDato(c.presente, { indice, comune }, bozza);
      if (!comune && aggiunto?.indice === indice && stessoDato(aggiunto.vuoto, datoDaBozza(bozza))) c = aggiunto.prima;
      else if (passo) {
        voci = avvisoDelleVociCheRestano(c.presente, indice, comune, bozza);
        unPasso(passo, "dati");
      }
    }
    // Il valore iniziale scritto nei campi del suo blocco. Vuoto, lo toglierebbe: senza la domanda non si toglie, e il
    // comando non prosegue (i campi restano aperti, l'avviso lo dice).
    let senzaValore = false;
    const r = valoreInModifica ? datoDellaRiga(c.presente, valoreInModifica.chiave, mostrata.id) : undefined;
    if (valoreInModifica && r && !r.comune) {
      const nuovo = conIlValoreDi(r.dato, valoreInModifica.bozza);
      if (nuovo.initial === undefined) senzaValore = true;
      else if (!stessoDato(r.dato, nuovo)) unPasso(cambiaDato(r.indice, nuovo, mostrata.id));
    }
    // I campi di un record: uno appena aggiunto e lasciato com'era sparisce senza passi.
    if (recordInModifica) {
      const { indice, bozza, nuovo } = recordInModifica;
      const passo = passoDelRecord(c.presente, indice, bozza);
      if (nuovo && stessoRecord(recordDaBozza(bozza).record, recordNuovo)) c = nuovo.prima;
      else if (passo) unPasso(passo, "dati");
    }
    // I campi di un caso.
    if (casoInModifica) {
      const { indice, bozza } = casoInModifica;
      const caso = casiDella(c.presente, funzioneDeiCasi)[indice];
      if (caso && !stessoCaso(caso, bozza)) unPasso(cambiaCaso(indice, casoDaBozza(caso, bozza), funzioneDeiCasi), "casi");
    }
    if (senzaValore) {
      setAvviso(r?.dato.constant === true ? testi.annuncioCostanteSenzaValore : testi.annuncioValoreVuoto);
      return null;
    }
    if (rifiutato) {
      if (schedaRifiutata !== null) {
        setAperto(true);
        setScheda(schedaRifiutata);
      }
      setAvviso(testi.modificaRifiutata);
      return null;
    }
    setInModifica(null);
    setFineInModifica(null);
    setDatoInModifica(null);
    setRecordInModifica(null);
    setValoreInModifica(null);
    setAggiunto(null);
    setCasoInModifica(null);
    setCasoAggiunto(null);
    if (c !== cronologia) setDocumento((doc) => ({ ...doc, cronologia: c }));
    if (voci !== null) {
      avvisoDellaConferma.current = voci;
      setAvviso(voci);
    }
    return c;
  }
  /** Il gesto `poi` col progetto che esce dalla conferma dei campi aperti; nulla, se la conferma è rifiutata. */
  const confermatiPoi = (poi: (p: Progetto) => void) => () => {
    const c = confermaIApertiCampi();
    if (c) poi(c.presente);
  };

  /** Il gesto `poi`, dopo aver chiesto che cosa fare delle modifiche non salvate (se ce ne sono) del progetto
   * `p` (quello mostrato, o quello appena uscito dalla conferma dei campi). */
  function seNonSiPerdeNulla(poi: () => void, p: Progetto = progetto): void {
    if (testoCompleto(p) !== documento.riferimento) setFinestra({ genere: "modifiche", poi });
    else poi();
  }

  function erroreDiUnFile(titolo: string, percorso: string, e: unknown): void {
    setErrori({ titolo: riempi(titolo, { file: nomeDelFile(percorso) }), voci: [{ testo: testoDellErrore(erroreDelFile(e), testi) }] });
  }

  /** La domanda «Sostituire?» sul file in quel percorso: vero se l'utente sceglie di sostituirlo. */
  const sostituire = (percorso: string) => new Promise<boolean>((risposta) => setFinestra({ genere: "sostituire", percorso, risposta }));

  /** Il nome (senza l'estensione) da proporre alla finestra del sistema per salvare il progetto, il codice o la tabella:
   * quello del progetto come lo propone `baseProposta`. Con `modello` (la tabella, la segnalazione: un nome col nome del progetto dentro e
   * l'estensione in fondo, dove un nome riservato non può nascere) si tolgono solo i caratteri. Se non è il nome del progetto, l'avviso lo
   * dice e lo lascia cambiare; `null` se l'utente rinuncia. */
  function nomeDaUsare(nomeDelProgetto: string, estensione: string, modello?: string): Promise<string | null> {
    const ripiego = testi.ripiegoDelNomeDelFile;
    const base = modello !== undefined ? senzaVietati(nomeDelProgetto) || ripiego : baseProposta(nomeDelProgetto, ripiego);
    const proposto = modello !== undefined ? riempi(modello, { nome: base }) : base;
    if (!nomeCambiato(nomeDelProgetto, base)) return Promise.resolve(proposto);
    const motivo = modello !== undefined ? "caratteri" : motivoDelCambio(nomeDelProgetto);
    // Il nome col modello porta già l'estensione: l'avviso la mostra accanto al campo, una volta, e la rimette dopo.
    if (modello !== undefined && proposto.endsWith(estensione)) {
      const senza = proposto.slice(0, -estensione.length);
      return new Promise((risposta) => setFinestra({ genere: "nome", chiesto: { progetto: nomeDelProgetto, proposto: senza, estensione, motivo }, risposta: (n) => risposta(n === null ? null : `${n}${estensione}`) }));
    }
    return new Promise((risposta) => setFinestra({ genere: "nome", chiesto: { progetto: nomeDelProgetto, proposto, estensione, motivo }, risposta }));
  }

  /** «Salva» va al file del progetto; senza file, e con «Salva con nome», chiede dove (e, se il file c'è e la
   * finestra del sistema non l'ha confermato, se sostituirlo). Vero se ha salvato. `p` è il progetto da
   * salvare: quello mostrato, o quello appena uscito dalla conferma dei campi. */
  async function salvaIl(conNome: boolean, p: Progetto = progetto, da: string | null = partenza): Promise<boolean> {
    const testo = testoCompleto(p);
    let percorso = !conNome ? documento.percorso : null;
    if (percorso === null) {
      // Il nome del file legato al progetto, o quello del progetto (l'avviso, se cambia).
      const base = documento.percorso === null ? await nomeDaUsare(p.metadata.name, ".algo") : null;
      if (documento.percorso === null && base === null) return false;
      const scelto = await scegliFileDaSalvare(documento.percorso !== null ? nomeDelFile(documento.percorso) : `${base}.algo`, testi.filtroDelFile, da);
      if (scelto === null || (scelto.sostituire && !(await sostituire(scelto.percorso)))) return false;
      percorso = scelto.percorso;
    }
    try {
      await scriviProgetto(percorso, testo);
    } catch (e) {
      erroreDiUnFile(testi.salvaErroreTitolo, percorso, e);
      return false;
    }
    setDocumento((d) => ({ ...d, percorso, riferimento: testo }));
    setUltimaCartella(cartellaDi(percorso));
    // Dopo la conferma dei campi aperti, l'avviso della rinomina resta, dopo quello del salvataggio.
    const salvato = riempi(testi.salvatoIl, { file: nomeDelFile(percorso) });
    const dellaConferma = avvisoDellaConferma.current;
    avvisoDellaConferma.current = null;
    setAvviso(dellaConferma === null ? salvato : `${salvato} ${dellaConferma}`);
    return true;
  }

  /** Il file in quel percorso diventa il progetto aperto, legato al file; se non si apre, la finestra degli
   * errori dice perché, motivo per motivo. */
  async function apriIl(percorso: string): Promise<void> {
    let testo: string;
    try {
      testo = await leggiProgetto(percorso);
    } catch (e) {
      erroreDiUnFile(testi.apriErroreTitolo, percorso, e);
      return;
    }
    const esito = apriTesto(testo);
    if (!esito.ok) {
      setErrori({
        titolo: riempi(testi.apriErroreTitolo, { file: nomeDelFile(percorso) }),
        voci: esito.errori.map((e) => ({ percorso: e.percorso, testo: testiDeiMotivi[lingua][e.motivo] })),
      });
      return;
    }
    // Un progetto con un costrutto che l'interfaccia non conosce ancora non si apre.
    if (controlla(esito.progetto, limiti).fuoriTappa) {
      setErrori({ titolo: riempi(testi.apriErroreTitolo, { file: nomeDelFile(percorso) }), voci: [{ testo: testi.apriFuoriTappa }] });
      return;
    }
    carica(esito.progetto, percorso);
    setUltimaCartella(cartellaDi(percorso));
    setAvviso(riempi(testi.apertoIl, { file: nomeDelFile(percorso) }));
  }

  /** «Salva come libreria…»: il segno della libreria e «Salva con nome», che parte dalla cartella delle librerie se
   * c'è. Il segno entra nella cronologia, come un passo (Annulla lo toglie), solo se il file si scrive; un progetto già
   * segnato si salva soltanto. `c` è la cronologia che esce dalla conferma dei campi aperti. */
  async function salvaComeLibreria(c: Cronologia): Promise<void> {
    const segno = metadatiDelProgetto({ ...c.presente.metadata, library: true });
    const r = segno(c.presente, c.prossimo);
    if (!r.ok) {
      setAvviso(testi.modificaRifiutata);
      return;
    }
    if (!(await salvaIl(true, r.progetto, cartellaLibrerie.esiste ? cartellaLibrerie.cartella : partenza))) return;
    if (c.presente.metadata.library !== true) modifica(segno, undefined, c);
  }

  /** «Da un altro file…» nella finestra dell'importazione: il progetto del file scelto, o perché non si apre (con le
   * regole di «Apri»: un file che non si legge, che il lettore rifiuta o che usa la ricorsione). */
  async function sorgenteDaUnFile(): Promise<DaUnFile> {
    const percorso = await scegliFileDaAprire(testi.filtroDelFile, partenza);
    if (percorso === null) return null;
    const nonSiApre = (motivo: string) => ({ errore: riempi(testi.importaFileNonSiApre, { file: nomeDelFile(percorso), motivo }) });
    let testo: string;
    try {
      testo = await leggiProgetto(percorso);
    } catch (e) {
      return nonSiApre(testoDelProblema({ genere: "file", errore: erroreDelFile(e) }, testi));
    }
    const esito = apriTesto(testo);
    if (!esito.ok) return nonSiApre(testoDelProblema({ genere: "apertura", errori: esito.errori }, testi));
    if (controlla(esito.progetto, limiti).fuoriTappa) return nonSiApre(testi.apriFuoriTappa);
    setUltimaCartella(cartellaDi(percorso));
    return { sorgente: { nome: esito.progetto.metadata.name, percorso, progetto: esito.progetto } };
  }

  async function apriUnFile(): Promise<void> {
    const percorso = await scegliFileDaAprire(testi.filtroDelFile, partenza);
    if (percorso !== null) await apriIl(percorso);
  }

  // L'uscita, dal menu e dalla X della finestra: i campi aperti si confermano e, se il progetto non è cambiato, si chiude
  // senza chiedere. Se la finestra non si chiude (il guscio rifiuta), la rete di `beforeunload` torna a parlare, e il guscio,
  // che azzera «modificato» solo dopo una chiusura riuscita, alla X dopo chiede di nuovo.
  const esciDallApp = confermatiPoi((p) =>
    seNonSiPerdeNulla(() => {
      uscendo.current = true;
      chiudiFinestra().catch((e: unknown) => {
        uscendo.current = false;
        annotaErrore("finestra non chiusa", e);
      });
    }, p),
  );

  // I comandi dei file confermano prima i campi aperti: il testo scritto è una modifica, che si salva o fa chiedere.
  const comandiDelProgetto = {
    nuovo: confermatiPoi((p) => seNonSiPerdeNulla(() => setFinestra({ genere: "progetto", nuovo: true }), p)),
    apri: confermatiPoi((p) => seNonSiPerdeNulla(() => void apriUnFile(), p)),
    // Non c'è un'app senza progetto: chiuso, torna quello senza nome dell'avvio, senza file.
    chiudiProgetto: confermatiPoi((p) => seNonSiPerdeNulla(() => carica(progettoVuoto(testi.progettoSenzaNome, scelte.pilaDeiProgettiNuovi), null), p)),
    esciDallApp,
    salva: confermatiPoi((p) => void salvaIl(false, p)),
    salvaConNome: confermatiPoi((p) => void salvaIl(true, p)),
    // Il segno della libreria è una modifica: durante l'esecuzione no, come le proprietà.
    salvaComeLibreria: inEsecuzione
      ? undefined
      : () => {
          const c = confermaIApertiCampi();
          if (c) void salvaComeLibreria(c);
        },
    // Durante l'esecuzione le proprietà non si modificano.
    proprieta: inEsecuzione ? undefined : () => setFinestra({ genere: "progetto", nuovo: false }),
    // Procedure e funzioni: la finestra di una nuova (dal pulsante solo una funzione) e quella di tutte.
    ...(inEsecuzione
      ? {}
      : {
          funzione: () => apriLaFinestra({ genere: "funzione", modo: { modo: "nuova", soloFunzione: true } }),
          aggiungiRecord: () => aggiungiUnRecord(),
          nuovaFunzione: () => apriLaFinestra({ genere: "funzione", modo: { modo: "nuova", soloFunzione: false } }),
          funzioni: () => apriLaFinestra({ genere: "funzioni" }),
          // La cartella delle librerie si rilegge a ogni apertura, come quella degli esempi.
          importa: () => {
            if (!confermaIApertiCampi()) return;
            setMenuDellaFunzione(null);
            void rileggiLibrerie()
              .then(() => setFinestra({ genere: "importa" }))
              .catch(erroreDelleLibrerie);
          },
        }),
    // La cartella si rilegge a ogni apertura della finestra: l'utente può averla cambiata da fuori.
    esempi: () => {
      if (!confermaIApertiCampi()) return;
      void rileggiEsempi()
        .then(() => setFinestra({ genere: "esempi" }))
        .catch(erroreDegliEsempi);
    },
  };

  /** La finestra Progetto: da «Nuovo» un progetto nuovo (la pila si azzera); altrimenti metadati e opzioni
   * del progetto aperto, in un passo solo (nessuno, se non cambia nulla). */
  function confermaProgetto(d: DatiDelProgetto): void {
    const nuovo = finestra?.genere === "progetto" && finestra.nuovo;
    setFinestra(null);
    const passo: Operazione = (p, prossimo) => {
      const r = metadatiDelProgetto(d.metadati)(p, prossimo);
      return r.ok ? opzioniDelProgetto(d.opzioni)(r.progetto, r.prossimo) : r;
    };
    if (nuovo) {
      const r = progettoNuovo(d.metadati);
      const p = r.ok ? passo(r.progetto, r.prossimo) : r;
      if (p.ok) carica(p.progetto, null);
      else setAvviso(testi.modificaRifiutata);
      return;
    }
    const r = passo(progetto, cronologia.prossimo);
    if (r.ok && testoDi(r.progetto) === testoDi(progetto)) return;
    modifica(passo);
  }

  // ------------------------------------------------------------------- la cartella degli esempi

  /** Rilegge la cartella degli esempi; se non c'è ancora (il primo avvio), ci copia gli esempi forniti, ognuno nel suo
   * gruppo; i forniti fuori da ogni gruppo (copiati quando i gruppi non c'erano) li sposta nel loro: prima la copia nel
   * gruppo, poi il file tolto da fuori, così un errore a metà lascia due copie e non nessuna. */
  async function rileggiEsempi(scelta: string | null = cartellaScelta): Promise<void> {
    let c = await elencaEsempi(scelta);
    if (!c.esiste) {
      for (const f of forniti(testi)) await scriviEsempio(f.nome, f.testo, scelta, f.gruppo);
      c = await elencaEsempi(scelta);
    }
    const spostati = daSpostare(c, testi);
    for (const f of spostati) {
      await scriviEsempio(f.nome, f.testo, scelta, f.gruppo);
      await togliEsempio(f.nome, scelta, null);
    }
    if (spostati.length > 0) c = await elencaEsempi(scelta);
    setCartella(c);
  }
  function erroreDegliEsempi(e: unknown): void {
    setFinestra(null);
    setErrori({ titolo: testi.esempiErroreTitolo, voci: [{ testo: testoDellErrore(erroreDelFile(e), testi) }] });
  }
  /** Un'operazione sulla cartella, poi la cartella riletta e la finestra degli esempi di nuovo aperta. */
  function nellaCartella(operazione: () => Promise<unknown>): void {
    operazione()
      .then(() => rileggiEsempi())
      .then(() => setFinestra({ genere: "esempi" }))
      .catch(erroreDegliEsempi);
  }
  const daRipristinare = useMemo(() => mancanti(cartella, testi), [cartella, testi]);

  // ------------------------------------------------------------------- la cartella delle librerie

  /** Rilegge la cartella delle librerie (se non c'è ancora, resta vuota: la crea la prima aggiunta). */
  async function rileggiLibrerie(scelta: string | null = scelte.cartellaLibrerie): Promise<void> {
    setCartellaLibrerie(await elencaLibrerie(scelta));
  }
  function erroreDelleLibrerie(e: unknown): void {
    setFinestra(null);
    setErrori({ titolo: testi.importaErroreTitolo, voci: [{ testo: testoDellErrore(erroreDelFile(e), testi) }] });
  }

  // All'avvio, una volta: gli esempi aggiunti e tolti, e il file dato come argomento (se c'è, si apre al
  // posto del progetto nuovo).
  const avviata = useRef(false);
  useEffect(() => {
    if (avviata.current) return;
    avviata.current = true;
    rileggiEsempi().catch((e: unknown) => annotaErrore("esempi non letti", e));
    rileggiLibrerie().catch((e: unknown) => annotaErrore("librerie non lette", e));
    fileDatoAllAvvio()
      .then((p) => (p === null ? undefined : apriIl(p)))
      .catch((e: unknown) => annotaErrore("file dato all'avvio non letto", e));
  });

  // Il guscio ferma la chiusura della finestra solo se sa che ci sono modifiche non salvate, o dei campi aperti:
  // allora la chiusura arriva qui, i campi si confermano e, se il progetto non è cambiato, si chiude senza chiedere.
  useEffect(() => {
    segnaModificato(daPerdere).catch((e: unknown) => annotaErrore("stato delle modifiche non comunicato", e));
  }, [daPerdere]);

  useEffect(() => {
    window.addEventListener(eventoDiChiusura, esciDallApp);
    return () => window.removeEventListener(eventoDiChiusura, esciDallApp);
  });

  // Sul Mac il menu in cima allo schermo, nella lingua dell'interfaccia. Le sue voci Informazioni e Impostazioni
  // fanno ciò che fanno nella barra, ma non sopra un'altra finestra (come i tasti globali).
  useEffect(() => {
    if (sulMac()) impostaMenu(dizionari[lingua]).catch((e: unknown) => annotaErrore("menu del Mac non impostato", e));
  }, [lingua]);
  useEffect(() => {
    const ascolta = (e: Event) => {
      const voce = (e as CustomEvent<unknown>).detail;
      if (!conUnaFinestra() && (VOCI_DELL_INTERFACCIA as readonly unknown[]).includes(voce)) azioniDelMenu[voce as VoceDellInterfaccia]();
    };
    window.addEventListener(eventoDelMenu, ascolta);
    return () => window.removeEventListener(eventoDelMenu, ascolta);
  });

  // Una domanda «Sostituire?» (o l'avviso del nome) rimpiazzata da un'altra finestra (la chiusura che chiede delle
  // modifiche) vale «no»: il salvataggio che l'aspettava finisce senza scrivere. Dopo una risposta vera non cambia nulla.
  const finestraPrima = useRef<Aperta | null>(null);
  useEffect(() => {
    const prima = finestraPrima.current;
    if (prima?.genere === "sostituire" && prima !== finestra) prima.risposta(false);
    if (prima?.genere === "nome" && prima !== finestra) prima.risposta(null);
    finestraPrima.current = finestra;
  }, [finestra]);

  /** Le scelte si scrivono nelle preferenze; se il sistema rifiuta, valgono lo stesso e la finestra degli
   * errori lo dice. */
  function salvaPreferenze(l: Lingua, s: Scelte): void {
    scriviPreferenze(l, s).catch((e: unknown) => {
      const t = dizionari[l];
      setErrori({ titolo: t.preferenzeErroreTitolo, voci: [{ testo: riempi(t.preferenzeErrore, { dettaglio: erroreDelFile(e).dettaglio }) }] });
    });
  }
  /** «Conferma» nelle Impostazioni: le scelte nuove valgono e si scrivono (nessuna scrittura se non cambia
   * nulla). */
  function confermaImpostazioni(l: Lingua, confermate: Scelte): void {
    setFinestra(null);
    if (l === lingua && JSON.stringify(confermate) === JSON.stringify(scelte)) return;
    // I limiti con gli stessi valori restano gli stessi: l'esito di un caso è attuale finché non cambiano.
    const nuove = JSON.stringify(confermate.limiti) === JSON.stringify(scelte.limiti) ? { ...confermate, limiti: scelte.limiti } : confermate;
    setLingua(l);
    setScelte(nuove);
    salvaPreferenze(l, nuove);
    // Un modo che cambia chiude i campi aperti nel modo di prima (senza passi).
    if (nuove.modoDeiBlocchi !== modo) setInModifica(null);
    if (nuove.modoDeiDati !== modoDati) setDatoInModifica(null);
    // Un'altra cartella degli esempi: si rilegge (se c'è e non ha esempi, resta vuota).
    if (nuove.cartellaEsempi !== cartellaScelta) rileggiEsempi(nuove.cartellaEsempi).catch(erroreDegliEsempi);
    if (nuove.cartellaLibrerie !== scelte.cartellaLibrerie) rileggiLibrerie(nuove.cartellaLibrerie).catch(erroreDelleLibrerie);
  }
  /** La lingua scelta dalla riga di stato: la stessa preferenza delle Impostazioni, scritta subito. */
  function scegliLingua(l: Lingua): void {
    if (l === lingua) return;
    setLingua(l);
    salvaPreferenze(l, scelte);
  }
  /** «Adatta alla finestra»; adattata, lo stesso pulsante torna allo zoom di prima. */
  function adatta(): void {
    if (adattata) {
      setScala(scalaPrima);
      setAdattata(false);
      return;
    }
    if (!tela.current) return;
    const area = areaDelDisegno(tela.current);
    setScalaPrima(scala);
    setScala(scalaAdatta(disegno, area.larghezza, area.altezza));
    setAdattata(true);
  }
  function scalaFissa(cambia: (s: number) => number): void {
    setScala(cambia);
    setAdattata(false);
  }

  const apriImpostazioni = () => setFinestra({ genere: "impostazioni" });
  // Le voci del menu del Mac che fanno qualcosa nella pagina: sempre disponibili, come nella barra.
  const azioniDelMenu: Record<VoceDellInterfaccia, () => void> = { impostazioni: apriImpostazioni, informazioni: () => setFinestra({ genere: "informazioni" }) };
  // I comandi del catalogo con la loro azione in questo momento: senza azione un comando non è disponibile.
  const azioni: Azioni = {
    ...comandiDelProgetto,
    ...azioniDelMenu,
    // La guida resta aperta mentre si lavora: già aperta, la voce le riporta il fuoco.
    registra: registrazione === null ? attivaLaRegistrazione : disattivaLaRegistrazione,
    ...((esecuzione !== null || (registrazione?.numero ?? 0) > 0) && situazione !== "in corso" && tutti === null ? { segnala: apriLaSegnalazione } : {}),
    guida: () => (guidaAperta ? document.querySelector<HTMLElement>("[data-finestra-guida] article")?.focus() : setGuidaAperta(true)),
    ...(siAnnulla(cronologia) && !inEsecuzione ? { annulla: () => passo("annulla") } : {}),
    ...(siRipete(cronologia) && !inEsecuzione ? { ripeti: () => passo("ripeti") } : {}),
    ...(scelto !== null && !inEsecuzione
      ? {
          taglia: () => {
            copiaIl(scelto);
            cancella(scelto);
          },
          copia: () => copiaIl(scelto),
          elimina: () => cancella(scelto),
        }
      : {}),
    // Il valore iniziale scelto si toglie (chiedendo), tranne quello di una costante; non si taglia né si copia.
    ...(sceltoValore !== null && !inEsecuzione && siToglie(rigaScelta) ? { elimina: () => chiediDiTogliere(sceltoValore) } : {}),
    // Durante «Esegui tutti» un'esecuzione non comincia, e «Ferma» ferma i casi.
    esegui: tutti ? undefined : comandoDelTasto("F5"),
    passo: tutti ? undefined : comandoDelTasto("F10"),
    entra: tutti ? undefined : comandoDelTasto("F11"),
    esci: tutti ? undefined : comandoDelTasto("Maiusc+F11"),
    // «Animata» la mette in pausa quando c'è; altrimenti la comincia, tranne durante «tutto insieme».
    animata: !tutti && (animata || situazione !== "in corso") ? alternaLAnimata : undefined,
    // La velocità si sceglie dal suo menu (lo stato del comando): sempre disponibile.
    velocita: () => {},
    ferma: tutti ? fermaTutti : comandoDelTasto("Maiusc+F5"),
    punto: scelto === null || !puntoPossibile(scelto) ? undefined : comandoDelTasto("F9"),
    togliPunti: interruzioni.size > 0 ? togliIPunti : undefined,
    dati: () => setAperto((a) => !a),
    // La tabella e la sua esportazione, finché la colonna dell'esecuzione è aperta; l'esportazione non durante «tutto
    // insieme», quando la tabella mostrata è ferma all'ultima fermata e il file avrebbe più righe.
    // La tabella e il codice si escludono: «Tabella» col codice in vista mostra la tabella; «Genera» mostra o toglie il
    // codice, e tolto torna la tabella, se c'era.
    ...(esecuzione
      ? {
          tabella: () => {
            if (conCodice) {
              setConCodice(false);
              setConTabella(true);
            } else setConTabella((t) => !t);
          },
        }
      : {}),
    genera: () => setConCodice((c) => !c),
    ...(esecuzione && situazione !== "in corso" ? { esportaTabella: () => void esportaLaTabella().catch((e: unknown) => annotaErrore("tabella non esportata", e)) } : {}),
    // Il flowchart si esporta sempre, tranne mentre l'esecuzione va avanti (il blocco corrente cambia) e durante «tutto
    // insieme».
    ...(situazione !== "in corso" && tutti === null ? { esportaFlowchart: apriLEsportazione } : {}),
    ...(stampaDisponibile ? { stampa: apriLaStampa } : {}),
    riduci: () => scalaFissa((s) => limitaLaScala(s / PASSO)),
    cento: () => scalaFissa(() => 1),
    ingrandisci: () => scalaFissa((s) => limitaLaScala(s * PASSO)),
    adatta,
  };
  const stati: Stati = {
    registra: { testo: registrazione === null ? testi.registraAttiva : testi.registraDisattiva },
    funzione: { suggerimento: testi.comandoFunzioneSuggerimento },
    esegui: { testo: situazione === "in pausa" ? testi.continua : testi.esegui },
    entra: { suggerimento: suggerimento("entra", testi.entraSuggerimento, testi) },
    esci: { suggerimento: suggerimento("esci", testi.esciSuggerimento, testi) },
    animata: animata ? { premuto: true, icona: "pausaAnimata", suggerimento: testi.animataInCorso } : { premuto: false },
    velocita: {
      scelta: {
        valore: scelte.velocitaAnimata,
        voci: vociDelleScelte.velocitaAnimata.map((v) => {
          const chiave = v === "lenta" ? "velocitaLenta" : v === "media" ? "velocitaMedia" : "velocitaVeloce";
          return { valore: v, testo: testi[chiave], icona: chiave };
        }),
        scegli: (v) => scegliLaVelocita(v as VelocitaAnimata),
      },
    },
    ...(scelto !== null ? { punto: { premuto: interruzioni.has(scelto) || interruzioni.has(coppieDelProgetto.get(scelto)?.scrittura ?? scelto) } } : {}),
    dati: { apre: { aperto, controlla: idPannello } },
    ...(esecuzione ? { tabella: { apre: { aperto: conTabella && !conCodice, controlla: idTabella } } } : {}),
    // Il riquadro del codice esiste solo quando si vede: chiuso, «Genera» non controlla un elemento assente.
    genera: { apre: { aperto: conCodice, ...(conCodice ? { controlla: idCodice } : {}) } },
    ...(adattata ? { adatta: { testo: testi.zoomTornaIndietro, suggerimento: testi.zoomTornaIndietroSuggerimento } } : {}),
  };
  // La barretta dell'esecuzione, se l'utente l'ha scelta: finché c'è un'esecuzione (la colonna è aperta).
  const conBarretta = scelte.esecuzioneFlottante && esecuzione !== null;
  const impostazioni = (
    <FinestraImpostazioni
      aperta={finestra?.genere === "impostazioni"}
      testi={testi}
      lingua={lingua}
      scelte={scelte}
      esempi={cartella.cartella === "" ? null : cartella}
      librerie={cartellaLibrerie.cartella === "" ? null : cartellaLibrerie}
      scegliCartella={scegliCartella}
      conferma={confermaImpostazioni}
      rinuncia={() => setFinestra(null)}
    />
  );

  // I campi di un salto: le procedure del progetto in ordine alfabetico, la firma letta dalla procedura scelta.
  const procedureDelSalto: ProcedureDelSalto = {
    nomi: sottoprogrammi
      .filter((f) => f.kind === "procedure")
      .map((f) => f.name ?? "")
      .sort((a, b) => a.localeCompare(b, lingua)),
    parametri: (nome) =>
      funzioneChiamata(progetto.functions, nome)
        ?.data.filter((d) => d.parameter !== undefined)
        .map((d) => ({ nome: d.name, rif: d.parameter === "reference", uscita: d.parameter === "out" })),
    nuova: () => {
      if (inModifica) apriLaFinestra({ genere: "funzione", modo: { modo: "nuova", soloFunzione: false, genere: "procedure", salto: inModifica.id } });
    },
  };
  const editor = (b: Blocco) => (
    <EditorDelBlocco
      key={b.id}
      blocco={b}
      nome={nomeDelBlocco(b, testi, espressione ?? ((t) => t), progetto.functions)}
      bozza={inModifica!.bozza}
      cambia={(bozza) => setInModifica((m) => ({ id: b.id, bozza, ...(m?.id === b.id && m.coppia !== undefined ? { coppia: m.coppia } : {}) }))}
      procedure={b.kind === "call" ? procedureDelSalto : undefined}
      conferma={confermaCampi}
      rinuncia={rinunciaCampi}
      segnalazioni={bloccoInSilenzio === b.id ? [] : segnalazioni}
      testi={testi}
      modo={modo}
      aggancio={() => tela.current?.querySelector(`[data-blocco="${b.id}"]`) ?? null}
    />
  );
  // I campi del valore iniziale: il nome è quello del suo blocco, col testo dal nucleo.
  const editorDelValore = (chiave: string, d: Dato) => (
    <EditorDelValore
      key={chiave}
      chiave={chiave}
      nome={nomeDelValoreIniziale(d, testi, testiDelDisegno(lingua), valoreRipetuto)}
      bozza={valoreInModifica!.bozza}
      cambia={(bozza) => setValoreInModifica({ chiave, bozza })}
      conferma={confermaValore}
      rinuncia={rinunciaValore}
      segnalazioni={candidatoDelValore}
      testi={testi}
      modo={modo}
      aggancio={() => tela.current?.querySelector(laVoceDelValore(chiave)) ?? null}
    />
  );
  const campiDelValore = valoreInModifica && rigaInScrittura ? editorDelValore(valoreInModifica.chiave, rigaInScrittura.dato) : null;
  // Il campo della fine di una funzione: il nome è quello del suo blocco.
  const campiDellaFine =
    fineInModifica && funzioneDellaFine ? (
      <EditorDellaFine
        key={funzioneDellaFine.end.id}
        chiave={funzioneDellaFine.end.id}
        nome={partiDellaFine(funzioneDellaFine, testiDelDisegno(lingua)).map((x) => x.testo).join("")}
        valore={fineInModifica.bozza}
        cambia={(bozza) => setFineInModifica({ funzione: funzioneDellaFine.id, bozza })}
        conferma={confermaRestituisce}
        rinuncia={rinunciaRestituisce}
        segnalazioni={segnalazioniDellaFine}
        testi={testi}
        modo={modo}
        aggancio={() => tela.current?.querySelector(laFine(funzioneDellaFine)) ?? null}
      />
    ) : null;

  // Il menu di un blocco: Taglia, Copia ed Elimina, le azioni della barra; sul blocco di un valore iniziale solo Elimina,
  // che lo toglie chiedendo (non per una costante). Il menu si chiude prima dell'azione; chiuso senza scelta, il fuoco
  // torna sul blocco.
  const sulMenu = menuDelBlocco?.chi;
  const rigaDelMenu = sulMenu && "valore" in sulMenu ? datoDellaRiga(progetto, sulMenu.valore, mostrata.id) : undefined;
  // Su un blocco della scelta il menu agisce su tutti i blocchi scelti, e il suo nome lo dice.
  const nomeDelMenuDelBlocco =
    sulMenu !== undefined && "id" in sulMenu && blocchiScelti.has(sulMenu.id) && quantiScelti > 1
      ? riempi(testi.menuDeiBlocchi, { n: quantiScelti.toLocaleString(lingua) })
      : riempi(testi.menuDelBlocco, {
          blocco: sulMenu === undefined ? "" : "id" in sulMenu ? nomeDi(sulMenu.id) : rigaDelMenu ? nomeDelValoreIniziale(rigaDelMenu.dato, testi, testiDelDisegno(lingua), valoreRipetuto) : "",
        });
  const poiDelMenu = (azione: () => void) => () => {
    setMenuDelBlocco(null);
    azione();
  };
  // Le voci coi tasti della piattaforma (sul Mac ⌘X, ⌘C, ⌫).
  const colTasto = (testo: string, tasto: string) => riempi(testo, { tasto: tastoMostrato(tastoSullaPiattaforma(tasto), testi) });
  const [voceTaglia, voceCopia, voceElimina] = [colTasto(testi.menuTaglia, "Control+X"), colTasto(testi.menuCopia, "Control+C"), colTasto(testi.menuEliminaBlocco, tastoDiEliminazione())];
  const vociDelMenuDelBlocco =
    sulMenu !== undefined && "id" in sulMenu
      ? [
          {
            chiave: "taglia",
            testo: voceTaglia,
            azione: poiDelMenu(() => {
              copiaIl(sulMenu.id);
              cancella(sulMenu.id);
            }),
          },
          {
            chiave: "copia",
            testo: voceCopia,
            azione: poiDelMenu(() => {
              copiaIl(sulMenu.id);
              setFuoco(`[data-blocco="${sulMenu.id}"]`);
            }),
          },
          { chiave: "elimina", testo: voceElimina, azione: poiDelMenu(() => cancella(sulMenu.id)) },
        ]
      : [
          { chiave: "taglia", testo: voceTaglia, azione: undefined },
          { chiave: "copia", testo: voceCopia, azione: undefined },
          { chiave: "elimina", testo: voceElimina, azione: sulMenu && siToglie(rigaDelMenu) ? poiDelMenu(() => chiediDiTogliere(sulMenu.valore)) : undefined },
        ];
  // Il menu di una procedura o di una funzione (dalla scheda o dall'elenco): le stesse azioni della finestra
  // «Procedure e funzioni…», e la chiusura della scheda se è aperta. Il menu si chiude prima dell'azione.
  const funzioneDelMenu = menuDellaFunzione ? sottoprogrammaDi(menuDellaFunzione.id) : undefined;
  const sullaFunzione = (azione: (id: string) => void) => () => {
    const id = menuDellaFunzione?.id;
    setMenuDellaFunzione(null);
    if (id !== undefined) azione(id);
  };
  const vociDelMenuDellaFunzione =
    funzioneDelMenu === undefined || inEsecuzione
      ? []
      : [
          { chiave: "apri", testo: testi.menuApri, azione: funzioneDelMenu.id === mostrata.id ? undefined : sullaFunzione((id) => void mostra(id)) },
          { chiave: "rinomina", testo: testi.menuRinomina, azione: sullaFunzione(() => apriLaFinestra({ genere: "funzione", modo: { modo: "rinomina", funzione: funzioneDelMenu } })) },
          { chiave: "proprieta", testo: testi.menuProprieta, azione: sullaFunzione(() => apriLaFinestra({ genere: "funzione", modo: { modo: "proprieta", funzione: funzioneDelMenu } })) },
          { chiave: "duplica", testo: testi.menuDuplica, azione: sullaFunzione(duplicaLaFunzione) },
          { chiave: "elimina", testo: testi.menuEliminaFunzione, azione: sullaFunzione((id) => apriLaFinestra({ genere: "eliminaFunzione", id })) },
          { chiave: "chiudi", testo: testi.menuChiudiScheda, azione: schede.aperte.includes(funzioneDelMenu.id) ? sullaFunzione(chiudiScheda) : undefined },
        ];
  const chiudiIlMenuDellaFunzione = (torna: boolean) => {
    const id = menuDellaFunzione?.id;
    setMenuDellaFunzione(null);
    if (torna && id !== undefined) document.querySelector<HTMLElement>(`[data-scheda="${id}"], [data-voce-funzione="${id}"]`)?.focus();
  };
  // La conferma prima di eliminare: dove è chiamata, in parole.
  const funzioneDaEliminare = finestra?.genere === "eliminaFunzione" ? sottoprogrammaDi(finestra.id) : undefined;
  const daEliminare = useMemo((): FunzioneDaEliminare | null => {
    if (funzioneDaEliminare === undefined) return null;
    const disegnoDiOra = testiDelDisegno(lingua);
    return {
      funzione: funzioneDaEliminare,
      // Le chiamate dentro la funzione stessa (la ricorsione) spariscono con lei: né si contano né si elencano.
      chiamate: chiamateDi(progetto, funzioneDaEliminare.name ?? "").filter((c) => c.funzione !== funzioneDaEliminare.id),
      dove: (c) => {
        const f = progetto.functions.find((x) => x.id === c.funzione)!;
        const b = trova(progetto, c.blocco);
        const testo = b ? nomeDelBlocco(b, testi, espressione ?? ((t) => t), progetto.functions) : partiDellaFine(f, disegnoDiOra).map((p) => p.testo).join("");
        return riempi(testi.eliminaFunzioneVoce, { funzione: f.kind === "main" ? testi.schedaPrincipale : (f.name ?? ""), blocco: testo });
      },
      condizione: (c) => {
        const b = trova(progetto, c.blocco);
        return b && "condition" in b ? (espressione ?? ((t: string) => t))(b.condition) : "";
      },
      valore: predefinitoDi(funzioneDaEliminare),
    };
  }, [funzioneDaEliminare, progetto, lingua, testi, espressione]);
  const chiudiIlMenuDelBlocco = (torna: boolean) => {
    if (torna && sulMenu) setFuoco("id" in sulMenu ? `[data-blocco="${sulMenu.id}"]` : laVoceDelValore(sulMenu.valore));
    setMenuDelBlocco(null);
  };

  if (diProva)
    return (
      <div className={stili.applicazione}>
        <Barra testi={testi} presentazione={scelte.barra} azioni={{ impostazioni: apriImpostazioni }} completa={false} />
        <main className={stili.prova}>
          {diProva.map((d) => (
            <div key={d.nome} className={stili.affiancate}>
              <VistaDati nome={d.nome} dati={d.funzione.data} costantiComuni={d.costantiComuni} testi={testi} valori={valoriMostrati} />
              <Flowchart disegno={disegna(d.funzione, d.costantiComuni, d.funzioni, d.records)} nome={nomeDelFlowchart(d.nome)} fondoDeiCicli={scelte.fondoDeiCicli} />
            </div>
          ))}
        </main>
        {impostazioni}
      </div>
    );

  return (
    <div className={stili.applicazione}>
      <Barra testi={testi} presentazione={scelte.barra} azioni={azioni} stati={stati} flottante={scelte.esecuzioneFlottante} velata={conBarretta} conChiamate={sottoprogrammi.length > 0} />
      {conBarretta && <Barretta testi={testi} presentazione={scelte.barra} azioni={azioni} stati={stati} stato={statoInParole} sopra={tela} conChiamate={sottoprogrammi.length > 0} />}
      <main className={stili.viste}>
        <section
          ref={pannello}
          id={idPannello}
          aria-label={testi.vistaDati}
          hidden={!aperto}
          className={stili.pannello}
          style={larghezza === null ? undefined : { width: larghezza }}
        >
          <Tabs.Root value={scheda} onValueChange={(d) => setScheda(d.value === "casi" ? "casi" : "dati")}>
            <Tabs.List className={stili.linguette} aria-label={testi.vistaDati}>
              <Tabs.Trigger value="dati" className={stili.linguetta}>
                {riempi(testi.schedaDati, { n: String(mostrata.data.length) })}
              </Tabs.Trigger>
              <Tabs.Trigger value="casi" className={stili.linguetta}>
                {riempi(testi.schedaCasi, { n: String(casi.length) })}
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="dati" className={stili.schedaDelPannello}>
              <p className={stili.premessa}>{testi.premessa}</p>
              <VistaDati
                nome={nelProgramma ? nomeDelProgetto : (mostrata.name ?? "")}
                progetto={nomeDelProgetto}
                genere={mostrata.kind}
                restituisce={
                  mostrata.return_type
                    ? riempi(mostrata.return_type === "string" && mostrata.return_size === undefined ? testi.restituisceUna : testi.restituisceUn, { tipo: tipoDelDato(risultatoDi(mostrata), testi) })
                    : undefined
                }
                dati={mostrata.data}
                costantiComuni={comuniMostrate}
                records={progetto.records}
                segniDeiRecord={segniDeiRecord}
                modificaRecord={inEsecuzione ? undefined : {
                  inModifica: recordInModifica,
                  apri: apriRecord,
                  cambia: (bozza) => setRecordInModifica((m) => (m ? { ...m, bozza } : m)),
                  conferma: (torna) => void confermaRecord(torna),
                  rinuncia: rinunciaRecord,
                  elimina: chiediDiEliminareIlRecord,
                  duplica: (i) => suUnRecord(duplicaRecord(i), i + 1),
                  sposta: (i, verso) => suUnRecord(spostaRecord(i, verso), i + verso),
                  candidato: candidatoDelRecord,
                }}
                aggiungiRecord={!inEsecuzione && ((progetto.records ?? []).length > 0 || scelte.pulsanteDeiRecord) ? aggiungiUnRecord : undefined}
                testi={testi}
                valori={valoriMostrati}
                segni={segni}
                modifica={inEsecuzione ? undefined : {
                  modo: modoDati,
                  inModifica: datoInModifica?.comune ? null : datoInModifica,
                  apri: (i) => apriDato(i),
                  cambia: (i, b) => cambiaDatoInModifica(i, b),
                  conferma: confermaDato,
                  rinuncia: rinunciaDato,
                  aggiungi: () => aggiungiUnDato(),
                  aggiungiParametro: () => aggiungiUnDato(true),
                  elimina: (i) => chiediDiEliminare(i),
                  duplica: (i) => suUnDato(duplicaDato(i, mostrata.id), i + 1),
                  sposta: (i, verso) => suUnDato(spostaDato(i, verso, mostrata.id), vicinoNellaTabella(i, verso)),
                  spostaParametro: (i, verso) => suUnDato(spostaParametro(i, verso, mostrata.id), vicinoNellaTabella(i, verso)),
                  nature,
                  candidato: datoInSilenzio !== null && datoInSilenzio === datoInModifica?.indice ? [] : candidatoDelDato,
                  lasciata: (i) => {
                    if (i === datoNuovo) setNuovo(null);
                  },
                }}
                modificaComuni={inEsecuzione || !comuniModificabili ? undefined : {
                  modo: modoDati,
                  inModifica: datoInModifica?.comune ? datoInModifica : null,
                  apri: (i) => apriDato(i, undefined, true),
                  cambia: (i, b) => cambiaDatoInModifica(i, b, true),
                  conferma: confermaDato,
                  rinuncia: rinunciaDato,
                  aggiungi: () => aggiungiUnDato(),
                  elimina: (i) => chiediDiEliminare(i, true),
                  duplica: (i) => suUnDato(duplicaComune(i), i + 1, true),
                  sposta: (i, verso) => suUnDato(spostaComune(i, verso), i + verso, true),
                  nature: { parametri: [], dati: ["variabile", "costante"] },
                  candidato: candidatoDelDato,
                }}
              />
            </Tabs.Content>
            <Tabs.Content value="casi" className={stili.schedaDelPannello}>
              <VistaCasi
                nome={nelProgramma ? nomeDelProgetto : (mostrata.name ?? "")}
                casi={casi}
                scelte={datiDelleVoci(mostrata.data)}
                dalleProcedureChiamate={dalleProcedureChiamate}
                esistenti={new Set([...mostrata.data.map((d) => d.name), ...dalleProcedureChiamate.flatMap((g) => g.dati)])}
                parametri={nelProgramma ? undefined : parametriDi(mostrata)}
                segni={segniDeiCasi}
                selezionati={casi.map((c) => selezionati.has(chiaveDiUnCaso(c.name)))}
                seleziona={(indice, si) => {
                  // La casella in testa (in un verso o nell'altro), o la spunta tolta al caso scelto, chiudono l'esito aperto
                  // sotto di lui.
                  if (indice === null || (!si && indice === casoScelto)) setCasoScelto(null);
                  setSelezionati((s) => {
                    const nomi = (indice === null ? casi.map((c) => c.name) : [casi[indice]?.name ?? ""]).map(chiaveDiUnCaso);
                    const nuovi = new Set(s);
                    for (const n of nomi) if (si) nuovi.add(n);
                    else nuovi.delete(n);
                    return nuovi;
                  });
                }}
                scelto={casoScelto}
                scegli={setCasoScelto}
                modifica={inEsecuzione ? undefined : {
                  inModifica: casoInModifica,
                  apri: apriCaso,
                  cambia: (indice, bozza) => setCasoInModifica({ indice, bozza }),
                  conferma: (torna) => void confermaCaso(torna),
                  rinuncia: rinunciaCaso,
                  aggiungi: aggiungiUnCaso,
                  elimina: chiediDiEliminareIlCaso,
                  duplica: (i) => suUnCaso(duplicaCaso(i, testi.parolaCopia, funzioneDeiCasi), i + 1),
                  sposta: (i, verso) => suUnCaso(spostaCaso(i, verso, funzioneDeiCasi), i + verso),
                  candidato: candidatoDelCaso,
                }}
                tutti={tutti ? { eseguiti: tutti.eseguiti, totale: tutti.totale } : null}
                eseguiTutti={!inEsecuzione && casi.length > 0 ? () => eseguiICasi(false) : undefined}
                eseguiSelezionati={!inEsecuzione ? () => eseguiICasi(true) : undefined}
                ferma={fermaTutti}
                eseguiCaso={!inEsecuzione ? eseguiUnCaso : undefined}
                dallEsecuzione={dallUltima && ("caso" in dallUltima ? { salva: salvaLEsecuzione } : { motivo: dallUltima.motivo })}
                dallEsito={
                  !inEsecuzione
                    ? {
                        attendiErrore: (i) => dallEsitoNellAtteso(i, attendiErrore, () => testi.annuncioAttendiErrore),
                        togliErrore: (i) => dallEsitoNellAtteso(i, (k, _, f) => togliErroreAtteso(k, f), () => testi.annuncioTogliErrore),
                        scriviAvvisi: (i) => dallEsitoNellAtteso(i, scriviAvvisi, (e) => ("avvisi" in e && e.avvisi?.ottenuti === "nessuno" ? testi.annuncioTogliAvvisi : testi.annuncioScriviAvvisi)),
                      }
                    : undefined
                }
                testi={testi}
                codici={codici}
                nomeDi={nomeDi}
              />
            </Tabs.Content>
          </Tabs.Root>
        </section>
        {aperto && <Divisore pannello={pannello} larghezza={larghezza} cambia={setLarghezza} nome={testi.larghezzaPannello} controlla={idPannello} />}
        {/* Il flowchart con, sopra, le schede delle procedure e delle funzioni (solo se il progetto ne ha). */}
        <div className={stili.colonnaDelFlowchart}>
        <Schede
          testi={testi}
          lingua={lingua}
          principale={principale.id}
          funzioni={sottoprogrammi}
          aperte={schede.aperte}
          mostrata={mostrata.id}
          intestazione={(f) => partiDellIntestazione(f, testiDelDisegno(lingua))}
          chiamataDa={chiamanti}
          giroDi={giroDi}
          mostra={(id) => void mostra(id)}
          chiudi={chiudiScheda}
          nuova={(genere) => apriLaFinestra({ genere: "funzione", modo: { modo: "nuova", soloFunzione: false, ...(genere ? { genere } : {}) } })}
          menu={(id, x, y) => setMenuDellaFunzione({ id, x, y })}
          conUnaFinestra={finestra !== null}
        />
        <VistaFlowchart
          disegno={disegno}
          nome={nomeDelFlowchart(nelProgramma ? nomeDelProgetto : (mostrata.name ?? ""))}
          etichetta={testi.vistaFlowchart}
          scala={scala}
          tela={tela}
          tasto={tastoSulFlowchart}
          morbida={inEsecuzione}
          fondoDeiCicli={scelte.fondoDeiCicli}
          interazione={{
            struttura,
            selezionati: blocchiScelti,
            riquadroDellaScelta,
            // Maiusc+clic allarga la scelta; durante l'esecuzione si sceglie un blocco solo (per il suo punto di interruzione).
            scegli: (id, allarga) => (allarga && !inEsecuzione ? estendiA(id) : setSelezionato(id)),
            attiva: (posto, elemento) => (inMovimento ? spostaIn(inMovimento.id, posto, inMovimento.ancora ?? null) : setElencoSu({ posto, elemento })),
            perSpostare,
            sposta: spostaIn,
            spostando: inMovimento,
            apri: (id) => {
              const b = trova(progetto, id);
              if (b) apriCampi(b);
            },
            ...(inEsecuzione ? {} : { menu: (chi: { readonly id: string } | { readonly valore: string }, x: number, y: number) => setMenuDelBlocco({ chi, x, y }) }),
            // Nel riquadro di un «per» le parti disegnate aprono i campi del ciclo; in quello di un «per ogni» non fanno
            // nulla (la posizione e l'elemento preso non sono campi dello studente).
            apriParte: (id) => {
              const b = trova(progetto, id);
              if (b?.kind === "for") apriCampi(b);
            },
            valoreScelto: sceltoValore,
            scegliValore,
            apriValore,
            apriRestituisce,
            segnati,
            descrizioni,
            solaLettura: inEsecuzione,
            corrente,
            faseCorrente,
            campoCorrente,
            internoCorrente,
            ripresa: pausa?.ripresa !== undefined,
            correnteValore,
            interruzioni,
            ...(nomiNelDisegno ? { nomi: nomiNelDisegno, punta: setPuntato, ferma: fermaIlWatch } : {}),
            ...(nomiDeiValori ? { nomiDeiValori } : {}),
          }}
        />
        </div>
        {fermo && datoNelFermo && fermo.elemento.isConnected && (
          <Watch key={fermo.dato} dato={datoNelFermo} sotto={fermo.elemento} testi={testi} fermo={conIlFermo} riferimento={riferimentoNelWatch(datoNelFermo)} {...(conLaTastiera ? { tastiera: conLaTastiera } : {})} />
        )}
        {puntato && datoNelWatch && puntato.elemento.isConnected && puntato.elemento !== fermo?.elemento && <Watch dato={datoNelWatch} sotto={puntato.elemento} testi={testi} riferimento={riferimentoNelWatch(datoNelWatch)} />}
        {inModifica && inScrittura && modo === "pannello" && editor(inScrittura)}
        {modo === "pannello" && campiDelValore}
        {modo === "pannello" && campiDellaFine}
        <ElencoDeiBlocchi
          aggancio={elencoSu?.elemento ?? null}
          testi={testi}
          conIncolla={appunti !== null}
          scegli={(s) => {
            const posto = elencoSu?.posto;
            setElencoSu(null);
            if (posto) inserisciNel(posto, s);
          }}
          chiudi={(torna) => {
            if (torna) elencoSu?.elemento.focus();
            setElencoSu(null);
          }}
        />
        <MenuNelPunto dove={menuDelBlocco} nome={nomeDelMenuDelBlocco} voci={vociDelMenuDelBlocco} chiudi={chiudiIlMenuDelBlocco} />
        <MenuNelPunto
          dove={vociDelMenuDellaFunzione.length > 0 ? menuDellaFunzione : null}
          nome={riempi(testi.menuDellaFunzione, { nome: funzioneDelMenu?.name ?? "" })}
          voci={vociDelMenuDellaFunzione}
          chiudi={chiudiIlMenuDellaFunzione}
        />
        {inModifica && inScrittura && modo === "riquadro" && editor(inScrittura)}
        {modo === "riquadro" && campiDelValore}
        {modo === "riquadro" && campiDellaFine}
        {(esecuzione || conCodice) && (
          <>
            <Divisore pannello={colonna} larghezza={larghezzaColonna} cambia={setLarghezzaColonna} nome={esecuzione ? testi.larghezzaColonna : testi.larghezzaColonnaCodice} controlla={idColonna} aDestra />
            <section
              ref={colonna}
              id={idColonna}
              aria-label={esecuzione ? testi.colonnaEsecuzione : testi.colonnaCodice}
              className={stili.colonna}
              style={larghezzaColonna === null ? undefined : { width: larghezzaColonna }}
            >
              {esecuzione && esecuzione.progetto.functions.length > 1 && (
                <DoveSei
                  livelli={pila.map((l) => {
                    const f = esecuzione.progetto.functions.find((x) => x.id === l.funzione);
                    return { ...l, nome: f?.kind === "main" ? testi.schedaPrincipale : (f?.name ?? "") };
                  })}
                  mostra={mostraIlLivello}
                  testi={testi}
                />
              )}
              {esecuzione && (
                <div
                  ref={pannelloTabella}
                  id={idTabella}
                  hidden={!conTabella || conCodice}
                  className={stili.tracciaNellaColonna}
                  style={altezzaTabella === null ? undefined : { height: altezzaTabella }}
                >
                  {tabellaMostrata && <TabellaDiTraccia tabella={tabellaMostrata} traccia={esecuzione.traccia} versione={versioneDellaTabella} visibile={conTabella && !conCodice} spiegazione={spiegazione} testi={testi} lingua={lingua} ferme={scelte.colonneFerme} disposizione={disposizione} disponi={setDisposizione} />}
                </div>
              )}
              {esecuzione && conTabella && !conCodice && <Divisore pannello={pannelloTabella} larghezza={altezzaTabella} cambia={setAltezzaTabella} nome={testi.altezzaTabella} controlla={idTabella} orizzontale />}
              {codice && (
                <div
                  ref={pannelloCodice}
                  id={idCodice}
                  className={esecuzione ? stili.codiceNellaColonna : stili.codiceDaSolo}
                  style={esecuzione && altezzaCodice !== null ? { height: altezzaCodice } : undefined}
                >
                  <PannelloDelCodice
                    testi={testi}
                    linguaggi={menuDeiLinguaggi}
                    linguaggio={linguaggio}
                    scegli={setLinguaggio}
                    codice={codice}
                    evidenziate={evidenziate}
                    copia={copiaStabile}
                    salva={salvaStabile}
                    mancanze={vociDiCioCheManca}
                    mostra={mostraStabile}
                  />
                </div>
              )}
              {esecuzione && codice && <Divisore pannello={pannelloCodice} larghezza={altezzaCodice} cambia={setAltezzaCodice} nome={testi.altezzaCodice} controlla={idCodice} orizzontale />}
              {esecuzione && <Console
                voci={esecuzione.console}
                tolte={esecuzione.consoleTolte}
                chiede={
                  statoEs?.genere === "chiede"
                    ? {
                        dato: chiesta?.nome ?? statoEs.dato,
                        ...(chiesta?.di !== undefined ? { di: chiesta.di } : {}),
                        volta: esecuzione.consoleTolte + esecuzione.console.length,
                        ...(statoEs.parametro !== undefined ? { parametro: statoEs.parametro } : {}),
                        ...(statoEs.elemento !== undefined ? { elemento: statoEs.elemento } : {}),
                        ...(statoEs.campo !== undefined ? { campo: statoEs.campo } : {}),
                      }
                    : null
                }
                inserisci={inserisciNellaConsole}
                fine={
                  statoEs?.genere === "finita"
                    ? {
                        testo: erroreFinale && testoDellErroreFinale ? riempi(testi.voceErrore, { dove: nomeIn(esecuzione.progetto)(erroreFinale.block), breve: testoDellErroreFinale.breve }) : testi.consoleFine,
                        errore: erroreFinale !== undefined,
                        ...(testoDellErroreFinale ? { suggerimento: testoDellErroreFinale.suggerimento } : {}),
                        ...(testoDellErroreFinale && testoDellErroreFinale.accaduto !== testoDellErroreFinale.breve ? { accaduto: testoDellErroreFinale.accaduto } : {}),
                        ...(esecuzione.caso && esecuzione.esito ? { esito: { testo: testoDellEsito(esecuzione.caso, esecuzione.esito), raggiunto: !esecuzione.esito.fuoriTappa && esecuzione.esito.raggiunto } } : {}),
                      }
                    : null
                }
                {...(esecuzione.caso ? { caso: esecuzione.caso.name } : {})}
                salva={dallUltima && "caso" in dallUltima ? salvaLEsecuzione : undefined}
                testi={testi}
                lingua={lingua}
              />}
            </section>
          </>
        )}
      </main>
      <RigaDiStato
        file={documento.percorso === null ? null : nomeDelFile(documento.percorso)}
        modificato={modificato}
        voci={voci}
        fuoriTappa={controllo.fuoriTappa}
        {...(giri.frasi.length > 0 ? { ricorsioni: giri.frasi } : {})}
        testi={testi}
        esecuzione={statoInParole}
        inRegistrazione={
          registrazione === null ? undefined : registrazione.numero === 0 ? testi.statoInRegistrazione : registrazione.numero === 1 ? testi.statoInRegistrazioneUna : riempi(testi.statoInRegistrazioneMolte, { n: String(registrazione.numero) })
        }
        zoom={{ scala, azioni, stati }}
        lingua={{ attuale: lingua, scegli: scegliLingua }}
        daiUnValore={inEsecuzione ? undefined : daiUnValore}
        sostituisciConOut={inEsecuzione ? undefined : sostituisciConOut}
        vai={(v) => {
          // La voce di un'altra procedura o funzione mostra prima la sua scheda.
          if (v.funzione !== undefined && v.funzione !== mostrata.id && !mostra(v.funzione)) return;
          if (v.blocco !== null) {
            // La voce di una Scrittura unita alla sua Lettura porta alla Lettura, il blocco che il disegno mostra.
            const blocco = coppieDelleScritture.get(v.blocco)?.lettura ?? v.blocco;
            setSelezionato(blocco);
            setFuoco(`[data-blocco="${blocco}"]`);
          } else if (v.fine !== undefined) setFuoco(`[data-restituisce="${v.fine}"]`);
          else if (v.dato !== null) {
            // La vista dei dati si apre, se era chiusa, sulla scheda dei dati; il fuoco va alla riga del dato.
            setAperto(true);
            setScheda("dati");
            const [tabella, n] = v.dato.split("-");
            setFuocoDato(tabella === "record" ? rigaDelRecord(Number(n)) : rigaDelDato(Number(n), tabella === "comuni"));
          }
        }}
      />
      <ConfermaEliminazione
        testo={eliminando ? testiDelDato(eliminando, testi) : null}
        elimina={() => eliminando && eliminaIlDato(eliminando, cronologia, togliArgomenti)}
        rinuncia={() => setEliminando(null)}
        ritorno={() => (eliminando ? (pannello.current?.querySelector<HTMLElement>(rigaDelDato(eliminando.indice, eliminando.comune)) ?? null) : null)}
        testi={testi}
        spunta={eliminando?.chiamate && eliminando.chiamate.n > 0 ? { testo: testi.togliArgomenti, valore: togliArgomenti, cambia: setTogliArgomenti } : undefined}
      />
      <ConfermaEliminazione
        testo={
          togliendoComune
            ? {
                titolo: riempi(testi.comuneTogliTitolo, { nome: togliendoComune.nome || testi.datoSenzaNome }),
                spiegazione: riempi(togliendoComune.chi.length === 1 ? testi.comuneTogliSpiegazioneUna : testi.comuneTogliSpiegazione, {
                  funzione: nelProgramma ? testi.schedaPrincipale : (mostrata.name ?? ""),
                  chi: togliendoComune.chi.map((id) => {
                    const f = progetto.functions.find((x) => x.id === id);
                    return riempi(testi.comuneTogliNome, { nome: f?.kind === "main" ? testi.schedaPrincipale : (f?.name ?? "") });
                  }).join(", "),
                }),
              }
            : null
        }
        elimina={togliDalleComuni}
        rinuncia={() => setTogliendoComune(null)}
        ritorno={() => (togliendoComune ? (pannello.current?.querySelector<HTMLElement>(rigaDelDato(togliendoComune.indice, true)) ?? null) : null)}
        testi={testi}
        comandi={{ si: testi.comuneTogliConferma, no: testi.comuneTogliRinuncia }}
      />
      <ConfermaEliminazione
        testo={
          eliminandoRecord
            ? {
                titolo: riempi(testi.eliminaRecordTitolo, { nome: eliminandoRecord.nome || testi.datoSenzaNome }),
                spiegazione: eliminandoRecord.usi === 0 ? testi.eliminaRecordNonUsato : eliminandoRecord.usi === 1 ? testi.eliminaRecordUsatoUno : riempi(testi.eliminaRecordUsato, { n: String(eliminandoRecord.usi) }),
              }
            : null
        }
        elimina={() => eliminandoRecord && eliminaIlRecord(eliminandoRecord.indice)}
        rinuncia={() => setEliminandoRecord(null)}
        ritorno={() => (eliminandoRecord ? (pannello.current?.querySelector<HTMLElement>(rigaDelRecord(eliminandoRecord.indice)) ?? null) : null)}
        testi={testi}
      />
      <ConfermaEliminazione
        testo={eliminandoCaso ? { titolo: riempi(testi.eliminaCasoTitolo, { nome: eliminandoCaso.nome || testi.casoSenzaNome }), spiegazione: testi.eliminaCasoSpiegazione } : null}
        elimina={eliminaIlCaso}
        rinuncia={() => setEliminandoCaso(null)}
        ritorno={() => (eliminandoCaso ? (pannello.current?.querySelector<HTMLElement>(rigaDelCaso(eliminandoCaso.indice)) ?? null) : null)}
        testi={testi}
      />
      <ConfermaValoreIniziale
        nome={togliendo?.nome ?? null}
        togli={togliIlValore}
        rinuncia={() => setTogliendo(null)}
        ritorno={() => (togliendo ? (tela.current?.querySelector<SVGGElement>(laVoceDelValore(togliendo.chiave)) ?? null) : null)}
        testi={testi}
      />
      <FinestraProgetto
        aperta={finestra?.genere === "progetto"}
        nuovo={finestra?.genere === "progetto" && finestra.nuovo}
        iniziali={
          finestra?.genere === "progetto" && finestra.nuovo
            ? { metadati: { name: "" }, opzioni: { call_stack_limit: scelte.pilaDeiProgettiNuovi } }
            : { metadati: progetto.metadata, opzioni: progetto.options ?? {} }
        }
        testi={testi}
        conferma={confermaProgetto}
        rinuncia={() => setFinestra(null)}
      />
      <FinestraEsempi
        aperta={finestra?.genere === "esempi"}
        cartella={cartella.cartella}
        esempi={esempi}
        testi={testi}
        lingua={lingua}
        apri={(e) => {
          setFinestra(null);
          const p = e.progetto;
          if (p) seNonSiPerdeNulla(() => carica(p, null));
        }}
        togli={(e) => setFinestra({ genere: "togli", cosa: { genere: "esempio", esempio: e } })}
        togliGruppo={(g) => setFinestra({ genere: "togli", cosa: { genere: "gruppo", gruppo: g } })}
        aggiungi={(scelto) => {
          // Un gruppo che c'è già a meno delle maiuscole è la stessa cartella: si usa il suo nome.
          const gruppo = gruppoDi(
            cartella.gruppi.map((g) => g.nome),
            scelto,
          );
          nellaCartella(() =>
            scriviEsempio(
              nomeLibero(
                progetto.metadata.name,
                (cartella.gruppi.find((g) => g.nome === gruppo)?.file ?? []).map((f) => f.nome),
                testi.ripiegoDelNomeDellEsempio,
              ),
              testoCompleto(progetto),
              cartellaScelta,
              gruppo,
            ),
          );
        }}
        ripristina={daRipristinare.length > 0 ? () => nellaCartella(async () => { for (const f of daRipristinare) await scriviEsempio(f.nome, f.testo, cartellaScelta, f.gruppo); }) : undefined}
        chiudi={() => setFinestra(null)}
      />
      <ConfermaTogli
        cosa={finestra?.genere === "togli" ? finestra.cosa : null}
        testi={testi}
        togli={() => {
          if (finestra?.genere !== "togli") return;
          const cosa = finestra.cosa;
          if (cosa.genere === "esempio") nellaCartella(() => togliEsempio(cosa.esempio.nome, cartellaScelta, cosa.esempio.gruppo));
          else nellaCartella(() => togliGruppo(cosa.gruppo.nome, cartellaScelta));
        }}
        rinuncia={() => setFinestra({ genere: "esempi" })}
      />
      <ConfermaModifiche
        aperta={finestra?.genere === "modifiche"}
        nome={nomeDelProgetto}
        testi={testi}
        salva={() => {
          const poi = finestra?.genere === "modifiche" ? finestra.poi : null;
          setFinestra(null);
          void salvaIl(false).then((fatto) => {
            if (fatto) poi?.();
          });
        }}
        nonSalvare={() => {
          const poi = finestra?.genere === "modifiche" ? finestra.poi : null;
          setFinestra(null);
          poi?.();
        }}
        rinuncia={() => setFinestra(null)}
      />
      <AvvisoDelNome
        chiesto={finestra?.genere === "nome" ? finestra.chiesto : null}
        testi={testi}
        rispondi={(nome) => {
          if (finestra?.genere !== "nome") return;
          setFinestra(null);
          finestra.risposta(nome);
        }}
      />
      <FinestraEsporta
        cosa={finestra?.genere === "esporta" ? { nome: nelProgramma ? nomeDelProgetto : (mostrata.name ?? ""), inEsecuzione } : null}
        scelte={scelteDellEsportazione}
        testi={testi}
        conferma={(s) => {
          setFinestra(null);
          // Un errore prima della finestra del sistema (la tavolozza, l'SVG, il nome) si dice come quelli della scrittura.
          void esportaIlFlowchart(s).catch((e: unknown) => setErrori({ titolo: testi.esportaFlowchartTitolo, voci: [{ testo: testoDellErrore(erroreDelFile(e), testi) }] }));
        }}
        rinuncia={() => setFinestra(null)}
      />
      <FinestraStampa
        cosa={finestra?.genere === "stampa" ? daStampare : null}
        scelte={{ ...scelteDellaStampa, linguaggio: linguaggioDellaStampa(scelteDellaStampa) }}
        testi={testi}
        stampa={stampaIlProgetto}
        rinuncia={() => setFinestra(null)}
      />
      {stampata && (
        <PaginaStampata
          progetto={stampata.progetto}
          sezioni={stampata.sezioni}
          svgDelFoglio={stampata.svg}
          svgAccanto={stampata.svgAccanto}
          senzaCodice={stampata.senzaCodice}
          scelte={stampata.scelte}
          quando={stampata.quando}
          lingua={lingua}
          testi={testi}
          valori={valoriMostrati}
          codici={codici}
          nomeDi={nomeDi}
        />
      )}
      <FinestraSegnala segnalazione={finestra?.genere === "segnala" ? finestra.segnalazione : null} testi={testi} salva={(s) => void salvaLaSegnalazione(s)} rinuncia={() => setFinestra(null)} attiva={attivaLaRegistrazione} />
      <ConfermaSostituzione
        file={finestra?.genere === "sostituire" ? nomeDelFile(finestra.percorso) : null}
        testi={testi}
        rispondi={(sostituisci) => {
          if (finestra?.genere !== "sostituire") return;
          setFinestra(null);
          finestra.risposta(sostituisci);
        }}
      />
      <FinestraFunzione
        modo={finestra?.genere === "funzione" ? finestra.modo : null}
        testi={testi}
        errori={(b) => (finestra?.genere === "funzione" ? erroriDellaFunzione(finestra.modo, b) : {})}
        conferma={(b) => {
          if (finestra?.genere === "funzione") confermaLaFunzione(finestra.modo, b);
        }}
        rinuncia={() => setFinestra(null)}
        records={(progetto.records ?? []).map((r) => r.name)}
      />
      <FinestraFunzioni
        aperta={finestra?.genere === "funzioni"}
        funzioni={sottoprogrammi}
        testi={testi}
        lingua={lingua}
        chiamataDa={chiamanti}
        comandi={{
          apri: (id) => {
            setFinestra(null);
            apriScheda(id);
          },
          rinomina: (id) => {
            const f = sottoprogrammaDi(id);
            if (f) setFinestra({ genere: "funzione", modo: { modo: "rinomina", funzione: f } });
          },
          proprieta: (id) => {
            const f = sottoprogrammaDi(id);
            if (f) setFinestra({ genere: "funzione", modo: { modo: "proprieta", funzione: f } });
          },
          duplica: (id) => {
            setFinestra(null);
            duplicaLaFunzione(id);
          },
          elimina: (id) => setFinestra({ genere: "eliminaFunzione", id }),
        }}
        nuova={() => setFinestra({ genere: "funzione", modo: { modo: "nuova", soloFunzione: false } })}
        importa={() => azioni.importa?.()}
        chiudi={() => setFinestra(null)}
      />
      <FinestraImporta
        aperta={finestra?.genere === "importa"}
        cartella={cartellaLibrerie.cartella}
        librerie={librerie}
        progetto={progetto}
        prossimo={cronologia.prossimo}
        limiti={limiti}
        testi={testi}
        lingua={lingua}
        daUnAltroFile={sorgenteDaUnFile}
        importa={(s, spuntate, conCasi, scelteFatte) => {
          const nomi = nomiCheEntrano(progetto, s.progetto, spuntate, scelteFatte);
          setFinestra(null);
          if (modifica(importaDa(s.progetto, spuntate, { conCasi, scelte: scelteFatte }))) setAvviso(riempi(testi.importaFatto, { nomi: nomi.join(", "), tasto: tastoMostrato(tastoDelComando("annulla")!, testi) }));
        }}
        aggiungi={
          progetto.metadata.library !== true
            ? undefined
            : (scelto) => {
                // Un gruppo che c'è già a meno delle maiuscole è la stessa cartella: si usa il suo nome.
                const gruppo = gruppoDi(
                  cartellaLibrerie.gruppi.map((g) => g.nome),
                  scelto,
                );
                const nome = nomeLibero(progetto.metadata.name, (cartellaLibrerie.gruppi.find((g) => g.nome === gruppo)?.file ?? []).map((f) => f.nome), testi.ripiegoDelNomeDellEsempio);
                scriviLibreria(nome, testoCompleto(progetto), scelte.cartellaLibrerie, gruppo)
                  .then(() => rileggiLibrerie())
                  .then(() => setFinestra({ genere: "importa" }))
                  .catch(erroreDelleLibrerie);
              }
        }
        chiudi={() => setFinestra(null)}
      />
      <EliminaFunzione
        da={daEliminare}
        testi={testi}
        elimina={(scelta) => {
          if (finestra?.genere === "eliminaFunzione") eliminaLaFunzione(finestra.id, scelta);
        }}
        rinuncia={() => setFinestra(null)}
      />
      {impostazioni}
      <FinestraInformazioni aperta={finestra?.genere === "informazioni"} testi={testi} lingua={lingua} chiudi={() => setFinestra(null)} />
      <FinestraGuida
        aperta={guidaAperta}
        testi={testi}
        lingua={lingua}
        ricerca={scelte.ricercaNellaGuida}
        spostabile={scelte.guidaSpostabile}
        memoria={memoriaDellaGuida.current}
        chiudi={() => setGuidaAperta(false)}
      />
      <FinestraErrori errori={errori} testi={testi} chiudi={() => setErrori(null)} />
      {/* L'avviso sopra il flowchart: si chiude con la ×, mai col clic sull'avviso stesso, che può partire per errore; si
          sposta trascinando la maniglia a sinistra. */}
      <div
        ref={riquadroDellAvviso}
        className={stili.avviso}
        data-vuoto={avviso === null ? "" : undefined}
        style={{
          ...(areaDelFlowchart === null ? {} : { left: areaDelFlowchart.centro, maxWidth: `min(40rem, ${Math.max(0, areaDelFlowchart.larghezza - 24)}px)` }),
          ...(spostaLAvviso.posizione === null ? {} : { left: spostaLAvviso.posizione.x, top: spostaLAvviso.posizione.y, bottom: "auto", translate: "none" }),
        }}
      >
        {avviso !== null && (
          <span className={stili.manigliaAvviso} title={testi.avvisoManiglia} aria-hidden="true" onPointerDown={spostaLAvviso.trascina}>
            ⋮⋮
          </span>
        )}
        <output role="status">{avviso}</output>
        {avviso !== null && (
          <button type="button" className={stili.chiudiAvviso} aria-label={testi.chiudiAvviso} title={testi.chiudiAvviso} onClick={() => setAvviso(null)}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}
