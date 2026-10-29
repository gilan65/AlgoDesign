// La console dell'esecuzione: ciò che il programma scrive, i valori letti e quelli non validi, nell'ordine in
// cui li dà il nucleo (`Esecuzione.console`): qui non si ricalcola nulla. Quando il programma aspetta un
// valore, in fondo c'è la riga dove scriverlo, confermata con Invio (il fuoco ci va da sé), con l'istruzione
// subito sopra: sta qui e non sopra il flowchart, e non copre gli ultimi valori scritti. Un
// valore non valido lo dice, e la riga torna vuota per la stessa lettura. A esecuzione finita, la fine o l'errore, e
// sotto l'errore il suo suggerimento, in un riquadro; per un caso d'uso, in fondo, il suo esito (dal nucleo, con le
// parole di chi monta la console), e il nome del caso nel titolo; sotto, se chi la monta lo offre, il comando che salva
// l'esecuzione come caso d'uso. Il nucleo tiene le ultime 1000 righe:
// sopra la console una riga dice quante ne ha tolte, come la tabella; una riga tenuta dalla fine comincia con «…».
// L'ultima riga resta in vista a ogni cambio del contenuto, non solo del numero delle righe: una riga che si allunga
// e le righe che entrano mentre altrettante escono in cima lo cambiano senza cambiare il numero. Dopo la fine, un
// disegno che non cambia il contenuto (il puntatore su un nome, un clic altrove) lascia la console dove l'utente l'ha
// portata.
//
// Per un parametro della procedura o della funzione eseguita da sola, accanto alla riga della lettura: «A ogni elemento» al
// primo elemento di un vettore (il valore scritto va a tutti), mai di una tabella (si chiede campo per campo: i campi hanno
// tipi diversi). Nessun comando per farlo arrivare senza valore: un parametro
// per riferimento vuole il valore, e uno per uscita non si chiede. La riga di un parametro arrivato senza valore (la voce
// senza testo di un caso d'uso scritto prima di questa regola) si mostra com'è, e l'errore la segue. Un vettore si chiede elemento per elemento, col suo indice (lo scrive già chi
// monta la console nel nome). Una lettura dentro una procedura il cui valore va a un dato di chi chiama lo dice accanto.
//
// Il testo scritto dal programma sta in elementi suoi (`data-scrive`): le prove leggono l'output da lì, senza
// i valori letti in mezzo.
import { useEffect, useRef, useState, type ReactElement } from "react";
import type { VoceDellaConsole } from "../../core/esecuzione/esecuzione";
import type { Riga } from "../../core/interprete/interprete";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import stili from "./Console.module.css";

export function Console({
  voci,
  tolte,
  chiede,
  inserisci,
  fine,
  caso,
  salva,
  testi,
  lingua,
}: {
  /** Le ultime righe della console. */
  voci: readonly VoceDellaConsole[];
  /** Le righe che il nucleo non tiene più, prima di `voci`: la posizione vera di ogni riga, che ne è la chiave. */
  tolte: number;
  /** Il dato di cui il programma aspetta il valore, se lo aspetta; `volta` cambia a ogni richiesta. Per un parametro
   * della funzione eseguita da sola, `parametro` (`riferimento`: può arrivare senza valore) ed `elemento` per un vettore. */
  chiede: { readonly dato: string; readonly di?: string; readonly volta: number; readonly parametro?: "valore" | "riferimento"; readonly elemento?: number; readonly campo?: string } | null;
  inserisci: (riga: Exclude<Riga, undefined>) => void;
  /** A esecuzione finita: la riga della fine o dell'errore (col testo breve), e la spiegazione dell'errore, che si apre con
   * «Spiegazione»: ciò che è successo, quando dice più del breve, e il suggerimento. */
  fine: { readonly testo: string; readonly errore: boolean; readonly accaduto?: string; readonly suggerimento?: string; readonly esito?: { readonly testo: string; readonly raggiunto: boolean } } | null;
  /** Il nome del caso d'uso eseguito, se l'esecuzione è di un caso. */
  caso?: string;
  /** A esecuzione finita, «Salva l'esecuzione come caso d'uso», solo quando l'esecuzione dà un caso. */
  salva?: (() => void) | undefined;
  testi: Dizionario;
  lingua: Lingua;
}): ReactElement {
  const [riga, setRiga] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const registro = useRef<HTMLDivElement>(null);
  const volta = chiede?.volta;
  const chiesto = chiede?.dato ?? "";
  useEffect(() => {
    if (volta === undefined) return;
    setRiga("");
    campo.current?.focus();
  }, [volta]);
  // L'ultima riga resta in vista (senza scorrimento animato), a ogni cambio del contenuto: la posizione vera dell'ultima
  // riga, la sua lunghezza e il suo a capo.
  const ultima = voci.at(-1);
  const contenuto = `${tolte + voci.length}:${ultima?.testo.length ?? 0}:${ultima?.genere === "scrive" && ultima.aCapo}`;
  // La fine come testo: un oggetto nuovo a ogni disegno non è un contenuto nuovo.
  const allaFine = fine === null ? "" : `${fine.testo}|${fine.suggerimento ?? ""}|${fine.esito?.testo ?? ""}`;
  // La spiegazione chiusa a ogni fine nuova.
  const [spiegata, setSpiegata] = useState("");
  const aperta = allaFine !== "" && spiegata === allaFine;
  useEffect(() => {
    const r = registro.current;
    if (r) r.scrollTop = r.scrollHeight;
  }, [contenuto, allaFine, volta]);

  return (
    <div className={stili.console}>
      <h2 className={stili.titolo}>{caso === undefined ? testi.console : riempi(testi.consoleDelCaso, { nome: caso || testi.casoSenzaNome })}</h2>
      {tolte > 0 && (
        <p className={stili.tolte} data-tolte-console>
          {tolte === 1 ? testi.consoleTolta : riempi(testi.consoleTolte, { n: tolte.toLocaleString(lingua) })}
        </p>
      )}
      <div ref={registro} role="log" aria-label={testi.console} className={stili.registro}>
        {voci.map((v, i) =>
          v.genere === "scrive" ? (
            <span key={tolte + i}>
              {v.tagliata && <span className={stili.tagliata}>…</span>}
              <span data-scrive="">
                {v.testo}
                {v.aCapo ? "\n" : ""}
              </span>
            </span>
          ) : v.genere === "letto" ? (
            <span key={tolte + i} className={stili.letto}>
              {v.tagliata && <span className={stili.tagliata}>…</span>}
              {v.testo}
              {"\n"}
            </span>
          ) : v.genere === "senzaValore" ? (
            <span key={tolte + i} className={stili.senzaValore} data-arrivato-senza-valore="">
              {riempi(testi.consoleArrivatoSenzaValore, { dato: v.dato })}
              {"\n"}
            </span>
          ) : (
            <span key={tolte + i} className={stili.nonValido}>
              {riempi(testi.consoleNonValido, { testo: `${v.tagliata ? "…" : ""}${v.testo}`, dato: v.dato })}
              {"\n"}
            </span>
          ),
        )}
        {fine && <span className={fine.errore ? stili.errore : stili.fine}>{fine.testo}</span>}
        {fine?.suggerimento && (
          <>
            {" "}
            <button type="button" className={stili.spiegazione} aria-expanded={aperta} onClick={() => setSpiegata(aperta ? "" : allaFine)}>
              {testi.spiegazione}
              <span aria-hidden="true">{aperta ? " ▾" : " ▸"}</span>
            </button>
            {aperta && (
              <span className={stili.spiegata} data-spiegazione>
                {fine.accaduto !== undefined && <span className={stili.accaduto}>{fine.accaduto}</span>}
                <span className={stili.suggerimento} data-suggerimento>
                  <strong>{testi.consoleSuggerimento}</strong>
                  <span>{fine.suggerimento}</span>
                </span>
              </span>
            )}
          </>
        )}
        {fine?.esito && (
          <span className={stili.esito} data-esito-del-caso="" data-raggiunto={fine.esito.raggiunto ? "" : undefined}>
            {fine.esito.testo}
          </span>
        )}
        {fine && salva && (
          <>
            {"\n"}
            <button type="button" className={stili.spiegazione} data-salva-esecuzione="" onClick={salva}>
              {testi.salvaEsecuzione}
            </button>
          </>
        )}
      </div>
      {chiede && (
        <p role="status" className={stili.istruzione}>
          {riempi(testi.annuncioChiede, { dato: chiesto })}
        </p>
      )}
      {chiede && (
        <div className={stili.lettura}>
        <label className={stili.campoDellaLettura}>
          <span>{riempi(testi.consoleValore, { dato: chiesto })}</span>
          {chiede.di !== undefined && (
            <span className={stili.riferimento} data-lettura-di="">
              {chiede.di}
            </span>
          )}
          <input
            ref={campo}
            value={riga}
            spellCheck={false}
            autoComplete="off"
            onChange={(cambio) => setRiga(cambio.target.value)}
            onKeyDown={(tasto) => {
              if (tasto.key !== "Enter") return;
              tasto.preventDefault();
              inserisci(riga);
              setRiga("");
            }}
          />
        </label>
        {chiede.elemento === 0 && chiede.campo === undefined && (
          <button type="button" className={stili.comando} title={testi.consoleOgniElementoSuggerimento} data-ogni-elemento="" onClick={() => inserisci({ ognuno: riga })}>
            {testi.consoleOgniElemento}
          </button>
        )}
        </div>
      )}
    </div>
  );
}
