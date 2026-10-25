// La finestra «Esempi»: la cartella degli esempi, la ricerca e i suoi file, uno per riga, col nome del progetto in
// grassetto, sotto la descrizione e il nome del file; a destra «Apri» (una copia, non legata a un file) e «Elimina» (con
// conferma: cancella il file). I file fuori da ogni gruppo stanno in cima; sotto, i gruppi (le sottocartelle), ognuno
// col suo nome e quanti esempi ha, che si aprono e si chiudono col clic sul nome: chiusi la prima volta, poi come li ha
// lasciati l'utente finché l'app resta aperta; accanto al nome, «Elimina il gruppo» (con conferma: cancella i suoi
// esempi e la sottocartella), tranne che sui gruppi degli esempi forniti. Cercando, restano gli esempi che hanno il testo
// nel nome, nella descrizione o nel nome del file, coi loro gruppi aperti. Un file che non si apre resta nell'elenco col motivo, e il
// suo «Apri» è spento. In fondo il gruppo dove aggiungere il progetto aperto (uno che c'è, «I miei esempi» o uno
// nuovo), «Aggiungi il progetto aperto» e «Ripristina gli esempi forniti» (spento se non ne manca nessuno).
import { useRef, useState, type ReactElement, type RefObject } from "react";
import type { Dizionario } from "../../i18n/it";
import { riempi, type Lingua } from "../../i18n/lingue";
import { cerca, eGruppoFornito, gruppoDi, testoDelProblema, type Esempio, type EsempiDellaCartella, type GruppoDiEsempi } from "../esempi";
import { gruppoValido } from "../nomi";
import { Descrizione, Finestra, Rinuncia, stili } from "./Finestra";

/** La voce «Nuovo gruppo…» dell'elenco dei gruppi: una barra, che il nome di un gruppo non può avere. */
const NUOVO = "/";

interface Proprieta {
  aperta: boolean;
  /** Dove sta la cartella; vuota fuori dal guscio (la cartella è in memoria). */
  cartella: string;
  esempi: EsempiDellaCartella;
  testi: Dizionario;
  lingua: Lingua;
  apri: (e: Esempio) => void;
  togli: (e: Esempio) => void;
  togliGruppo: (g: GruppoDiEsempi) => void;
  /** Il progetto aperto nel gruppo dato (il nome scelto o scritto, come il guscio lo vuole). */
  aggiungi: (gruppo: string) => void;
  /** Assente se non manca nessuno degli esempi forniti. */
  ripristina: (() => void) | undefined;
  chiudi: () => void;
}

export function FinestraEsempi(p: Proprieta): ReactElement {
  // I gruppi aperti e il gruppo dell'ultima aggiunta durano finché l'app resta aperta (la finestra chiusa non li perde).
  const [aperti, setAperti] = useState<ReadonlySet<string>>(new Set());
  const [ultimo, setUltimo] = useState<string | null>(null);
  const ricerca = useRef<HTMLInputElement>(null);
  return (
    // Il fuoco parte dalla ricerca: si scrive subito ciò che si cerca.
    <Finestra aperta={p.aperta} titolo={p.testi.esempiTitolo} rinuncia={p.chiudi} larga iniziale={() => ricerca.current}>
      <Contenuto
        {...p}
        campo={ricerca}
        aperti={aperti}
        cambia={(nome, aperto) => setAperti((a) => (aperto ? new Set([...a, nome]) : new Set([...a].filter((x) => x !== nome))))}
        ultimo={ultimo}
        // Un gruppo che si elimina non resta il gruppo dove aggiungere: «Aggiungi» lo ricreerebbe (anche se poi
        // l'utente rinuncia nella conferma: si torna al gruppo predefinito, senza danno).
        togliGruppo={(g) => {
          if (ultimo !== null && ultimo.toLowerCase() === g.nome.toLowerCase()) setUltimo(null);
          setAperti((a) => new Set([...a].filter((x) => x !== g.nome)));
          p.togliGruppo(g);
        }}
        aggiungi={(gruppo) => {
          setUltimo(gruppo);
          setAperti((a) => new Set([...a, gruppo]));
          p.aggiungi(gruppo);
        }}
      />
    </Finestra>
  );
}

/** Il contenuto, montato a ogni apertura: la ricerca riparte vuota. */
function Contenuto({
  cartella,
  esempi,
  testi,
  lingua,
  apri,
  togli,
  togliGruppo,
  aggiungi,
  ripristina,
  campo,
  aperti,
  cambia,
  ultimo,
}: Proprieta & {
  campo: RefObject<HTMLInputElement | null>;
  aperti: ReadonlySet<string>;
  cambia: (gruppo: string, aperto: boolean) => void;
  ultimo: string | null;
}): ReactElement {
  const [cercato, setCercato] = useState("");
  const cercando = cercato.trim() !== "";
  const mostrati = cerca(esempi, cercato);
  const vuota = esempi.sciolti.length === 0 && esempi.gruppi.length === 0;

  // Il gruppo dove aggiungere: i gruppi che ci sono, e «I miei esempi» se non c'è (a meno delle maiuscole); dopo
  // un'aggiunta, quello appena usato (anche nuovo, finché la cartella riletta non lo mostra).
  const gruppi = esempi.gruppi.map((g) => g.nome);
  const miei = gruppoDi(gruppi, testi.esempiGruppoMiei);
  const [scelto, setScelto] = useState(ultimo !== null ? gruppoDi(gruppi, ultimo) : miei);
  const scelte = [...new Set([...gruppi, miei, ...(scelto === NUOVO ? [] : [scelto])])];
  const [nuovo, setNuovo] = useState("");
  const gruppo = gruppoDi(gruppi, scelto === NUOVO ? nuovo.trim() : scelto);
  const valido = scelto !== NUOVO || gruppoValido(gruppo);

  const riga = (e: Esempio) => (
    <li key={`${e.gruppo ?? ""}/${e.nome}`} className={stili.esempio}>
      <span className={stili.nome}>
        <strong className={stili.titoloDellEsempio}>{e.progetto?.metadata.name ?? e.nome}</strong>
        {e.progetto?.metadata.description && <span className={stili.descrizione}>{e.progetto.metadata.description}</span>}
        {e.problema && <span className={stili.errore}>{riempi(testi.esempioNonSiApre, { motivo: testoDelProblema(e.problema, testi) })}</span>}
        <span className={stili.etichetta}>{e.nome}</span>
      </span>
      <button type="button" className={stili.comando} aria-disabled={e.progetto === null} onClick={e.progetto === null ? undefined : () => apri(e)}>
        {testi.esempioApri}
      </button>
      <button type="button" className={stili.comando} onClick={() => togli(e)}>
        {testi.esempioTogli}
      </button>
    </li>
  );

  return (
    <>
      <Descrizione className={stili.spiegazione}>{testi.esempiSpiegazione}</Descrizione>
      {cartella !== "" && <p className={`${stili.spiegazione} ${stili.percorso}`}>{riempi(testi.esempiCartella, { cartella })}</p>}
      <input
        ref={campo}
        type="search"
        className={stili.campo}
        aria-label={testi.esempiCerca}
        placeholder={testi.esempiCerca}
        value={cercato}
        onChange={(e) => setCercato(e.currentTarget.value)}
      />
      {vuota ? (
        <p className={stili.spiegazione}>{testi.esempiNessuno}</p>
      ) : mostrati.sciolti.length === 0 && mostrati.gruppi.length === 0 ? (
        <p className={stili.spiegazione}>{riempi(testi.esempiNessunoTrovato, { testo: cercato.trim() })}</p>
      ) : (
        <div className={stili.esempi}>
          {mostrati.sciolti.length > 0 && <ul className={stili.elenco}>{mostrati.sciolti.map(riga)}</ul>}
          {mostrati.gruppi.map((g) => {
            const aperto = cercando || aperti.has(g.nome);
            return (
              <section key={g.nome} className={stili.gruppoDegliEsempi} data-gruppo={g.nome}>
                <div className={stili.testaDelGruppo}>
                  <button type="button" className={stili.nomeDelGruppo} aria-expanded={aperto} onClick={cercando ? undefined : () => cambia(g.nome, !aperto)}>
                    <span aria-hidden="true" className={stili.freccia}>
                      {aperto ? "▾" : "▸"}
                    </span>
                    {g.nome}
                    <span className={stili.quanti}>({g.esempi.length})</span>
                  </button>
                  {/* Si elimina il gruppo intero, anche cercando: quello della cartella, non i soli esempi trovati. */}
                  {!eGruppoFornito(g.nome) && (
                    <button type="button" className={stili.comando} onClick={() => {
                        if (scelto.toLowerCase() === g.nome.toLowerCase()) setScelto(miei);
                        togliGruppo(esempi.gruppi.find((x) => x.nome === g.nome) ?? g);
                      }}
                    >
                      {testi.esempiEliminaGruppo}
                    </button>
                  )}
                </div>
                {aperto && (g.esempi.length === 0 ? <p className={stili.spiegazione}>{testi.esempiGruppoVuoto}</p> : <ul className={stili.elenco}>{g.esempi.map(riga)}</ul>)}
              </section>
            );
          })}
        </div>
      )}
      <div className={stili.comandi}>
        <label className={stili.inLinea}>
          {testi.esempiGruppo}
          <select className={stili.campo} value={scelto} onChange={(e) => setScelto(e.currentTarget.value)}>
            {scelte.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={NUOVO}>{testi.esempiGruppoNuovo}</option>
          </select>
        </label>
        {scelto === NUOVO && (
          <input
            className={stili.campo}
            aria-label={testi.esempiNomeDelGruppo}
            placeholder={testi.esempiNomeDelGruppo}
            aria-invalid={nuovo !== "" && !valido}
            value={nuovo}
            onChange={(e) => setNuovo(e.currentTarget.value)}
          />
        )}
        <button type="button" className={stili.comando} aria-disabled={!valido} onClick={
            valido
              ? () => {
                  aggiungi(gruppo);
                  setScelto(gruppo);
                  setNuovo("");
                }
              : undefined
          }
        >
          {testi.esempiAggiungi}
        </button>
      </div>
      {scelto === NUOVO && nuovo !== "" && !valido && <p className={stili.errore}>{testi.esempiGruppoNonValido}</p>}
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} aria-disabled={ripristina === undefined} onClick={ripristina}>
          {testi.esempiRipristina}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.chiudiEsc}
        </Rinuncia>
      </div>
    </>
  );
}
