// La conferma prima di eliminare una procedura o una funzione, in passi dentro la stessa finestra d'allerta:
// 1. la domanda, con dove è chiamata e che resteranno errori da correggere; la spunta «Elimina anche tutte le chiamate»
//    per una procedura, «Toglila dalle espressioni» per una funzione, in due modi (col valore predefinito, o togliendo le
//    assegnazioni che la contengono e altrove col valore predefinito); una funzione che restituisce un vettore non ha un
//    valore predefinito: si tolgono le sue assegnazioni, e altrove la chiamata resta;
// 2. con la spunta, la conferma globale: quante chiamate si tolgono e come;
// 3. per una funzione, ogni rombo (la condizione di un se, un mentre, un ripeti) che la chiama si conferma da solo:
//    «Lasciala» tiene lì la chiamata (resta un errore).
// Nessun passo cambia il progetto: lo cambia l'ultimo, in un passo solo della cronologia (Annulla riporta tutto). Esc, o
// «Non eliminare», a ogni passo chiude senza eliminare nulla; il fuoco parte dal comando che non elimina.
import { useEffect, useRef, useState, type ReactElement } from "react";
import type { Chiamata, ChiamateDaTogliere } from "../../core/modifica/funzioni";
import type { Funzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { Descrizione, Finestra, Rinuncia, stili } from "../finestre/Finestra";
import propri from "./Funzioni.module.css";

export interface DaEliminare {
  readonly funzione: Funzione;
  readonly chiamate: readonly Chiamata[];
  /** Dove sta una chiamata, in parole: la funzione e il blocco. */
  readonly dove: (c: Chiamata) => string;
  /** Il testo della condizione di un rombo. */
  readonly condizione: (c: Chiamata) => string;
  /** Il valore predefinito della funzione. */
  readonly valore: string;
}

type Passo = { readonly genere: "scelta" } | { readonly genere: "globale"; readonly come: ChiamateDaTogliere["come"] } | { readonly genere: "rombo"; readonly come: "predefinito" | "assegnazioni"; readonly i: number; readonly tenuti: readonly string[] };

function Passi({ da, testi, elimina }: { da: DaEliminare; testi: Dizionario; elimina: (scelta: ChiamateDaTogliere) => void }): ReactElement {
  const [passo, setPasso] = useState<Passo>({ genere: "scelta" });
  const [spunta, setSpunta] = useState(false);
  const vettore = da.funzione.return_size !== undefined;
  const [modo, setModo] = useState<"predefinito" | "assegnazioni">(vettore ? "assegnazioni" : "predefinito");
  const no = useRef<HTMLButtonElement>(null);
  const procedura = da.funzione.kind === "procedure";
  const nome = da.funzione.name ?? "";
  // Le chiamate che la spunta toglie: i salti di una procedura, i nomi nelle espressioni di una funzione; di una funzione
  // che restituisce un vettore solo quelle nelle assegnazioni (altrove restano), e senza nessuna la spunta non c'è.
  const daTogliere = da.chiamate.filter((c) => c.salto === procedura && (!vettore || c.assegnazione));
  // Per un vettore nessun rombo si conferma: la chiamata, che lì non è in un'assegnazione, resta.
  const rombi = procedura || vettore ? [] : daTogliere.filter((c) => c.rombo);
  // Un passo nuovo nella stessa finestra: il fuoco torna sul comando che non elimina.
  useEffect(() => {
    if (passo.genere !== "scelta") no.current?.focus();
  }, [passo]);

  function dopoIRombi(come: "predefinito" | "assegnazioni", tenuti: readonly string[], i: number): void {
    if (i < rombi.length) setPasso({ genere: "rombo", come, i, tenuti });
    else elimina({ come, rombiTenuti: tenuti });
  }
  const comandi = (si: string, fai: () => void, noTesto = testi.eliminaRinuncia, noFai?: () => void) => (
    <div className={stili.comandi}>
      <button type="button" className={stili.comando} data-elimina-si="" onClick={fai}>
        {si}
      </button>
      {noFai ? (
        <button type="button" ref={no} className={stili.comando} data-elimina-no="" onClick={noFai}>
          {noTesto}
        </button>
      ) : (
        <Rinuncia ref={no} className={stili.comando} data-elimina-no="">
          {noTesto}
        </Rinuncia>
      )}
    </div>
  );

  if (passo.genere === "globale") {
    const n = daTogliere.length;
    const spiegazione = riempi(
      passo.come === "salti" ? testi.eliminaGlobaleSalti : vettore ? testi.eliminaGlobaleAssegnazioniVettore : passo.come === "assegnazioni" ? testi.eliminaGlobaleAssegnazioni : testi.eliminaGlobalePredefinito,
      { nome, valore: da.valore },
    );
    return (
      <>
        <h3 className={stili.titolo} data-passo="globale">
          {n === 1 ? testi.eliminaGlobaleUna : riempi(testi.eliminaGlobaleTitolo, { n: String(n) })}
        </h3>
        <Descrizione className={stili.spiegazione}>{spiegazione}</Descrizione>
        {rombi.length > 0 && <p className={stili.spiegazione}>{riempi(testi.eliminaGlobaleRombi, { n: String(rombi.length) })}</p>}
        {comandi(testi.eliminaGlobaleConferma, () => (passo.come === "salti" ? elimina({ come: "salti" }) : dopoIRombi(passo.come as "predefinito" | "assegnazioni", [], 0)))}
      </>
    );
  }
  if (passo.genere === "rombo") {
    const c = rombi[passo.i]!;
    return (
      <>
        <h3 className={stili.titolo} data-passo="rombo" data-blocco-rombo={c.blocco}>
          {riempi(testi.eliminaRomboTitolo, { condizione: da.condizione(c) })}
        </h3>
        <Descrizione className={stili.spiegazione}>{riempi(testi.eliminaRomboSpiegazione, { i: String(passo.i + 1), n: String(rombi.length), nome, valore: da.valore })}</Descrizione>
        {comandi(testi.eliminaRomboSi, () => dopoIRombi(passo.come, passo.tenuti, passo.i + 1), testi.eliminaRomboNo, () => dopoIRombi(passo.come, [...passo.tenuti, c.blocco], passo.i + 1))}
      </>
    );
  }
  const n = da.chiamate.length;
  return (
    <>
      <Descrizione className={stili.spiegazione} data-passo="scelta">
        {n === 0 ? testi.eliminaFunzioneNonChiamata : n === 1 ? testi.eliminaFunzioneChiamataUna : riempi(testi.eliminaFunzioneChiamata, { n: String(n) })}
      </Descrizione>
      {n > 0 && (
        <>
          <p className={stili.spiegazione}>{testi.eliminaFunzioneDove}</p>
          <ul className={propri.dove}>
            {da.chiamate.map((c) => (
              <li key={c.blocco}>{da.dove(c)}</li>
            ))}
          </ul>
        </>
      )}
      {daTogliere.length > 0 && (
        <div className={propri.scelte}>
          <label className={propri.scelta}>
            <input type="checkbox" checked={spunta} data-spunta="" onChange={(e) => setSpunta(e.target.checked)} />
            <span>{procedura ? testi.eliminaAncheLeChiamate : testi.toglilaDalleEspressioni}</span>
          </label>
          {!procedura && (
            <div className={propri.rientro}>
              {(vettore ? (["assegnazioni"] as const) : (["predefinito", "assegnazioni"] as const)).map((m) => (
                <label key={m} className={propri.scelta}>
                  <input type="radio" name="modo" value={m} checked={modo === m} disabled={!spunta} data-modo={m} onChange={() => setModo(m)} />
                  <span>{m === "predefinito" ? riempi(testi.toglilaColPredefinito, { valore: da.valore }) : vettore ? testi.toglilaConLAssegnazioneVettore : testi.toglilaConLAssegnazione}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {comandi(testi.eliminaFunzioneConferma, () => {
        if (!spunta || daTogliere.length === 0) elimina({ come: "restano" });
        else setPasso({ genere: "globale", come: procedura ? "salti" : modo });
      })}
    </>
  );
}

export function EliminaFunzione({
  da,
  testi,
  elimina,
  rinuncia,
}: {
  /** `null`: la finestra è chiusa. */
  da: DaEliminare | null;
  testi: Dizionario;
  elimina: (scelta: ChiamateDaTogliere) => void;
  rinuncia: () => void;
}): ReactElement {
  const titolo = da === null ? "" : riempi(da.funzione.kind === "function" ? testi.eliminaFunzioneTitoloF : testi.eliminaFunzioneTitolo, { nome: da.funzione.name ?? "" });
  return (
    <Finestra aperta={da !== null} allerta titolo={titolo} rinuncia={rinuncia} iniziale={() => document.querySelector<HTMLElement>("[data-elimina-no]")}>
      {da && <Passi key={da.funzione.id} da={da} testi={testi} elimina={elimina} />}
    </Finestra>
  );
}
