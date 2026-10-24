// La finestra «Procedure e funzioni…» del menu Progetto: una riga per procedura o
// funzione, le procedure e poi le funzioni in ordine alfabetico come nell'elenco delle schede, con il nome, il genere, i
// parametri, che cosa restituisce, chi la chiama (tutti, una volta ciascuno) e quanti casi d'uso ha; in fondo alla riga
// un «⋯» che apre il suo menu (Apri, Rinomina…, Proprietà…, Duplica, Elimina…), dentro la finestra. Nessuna cella va a
// capo: la finestra è larga, e una riga più larga ancora (molti chiamanti) fa scorrere la tabella di lato. Esc col menu
// aperto chiude il solo menu. Senza procedure né funzioni dice che non ce ne sono ancora, e «Nuova…» ne crea una;
// «Importa…» apre la finestra dell'importazione. Un comando che apre un'altra finestra chiude questa.
import { useRef, useState, type ReactElement } from "react";
import { risultatoDi } from "../../core/disegno/impaginazione";
import type { Funzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { MenuNelPunto } from "../dati/MenuDellaRiga";
import { tipoDelDato } from "../dati/righe";
import { Descrizione, Finestra, Rinuncia, stili } from "../finestre/Finestra";
import propri from "./Funzioni.module.css";
import { inOrdine } from "./Schede";

/** Il testo di ogni voce del menu di una riga: gli stessi del menu di una scheda. */
const testoDellaVoce = { apri: "menuApri", rinomina: "menuRinomina", proprieta: "menuProprieta", duplica: "menuDuplica", elimina: "menuEliminaFunzione" } as const;

export interface ComandiDellaFunzione {
  readonly apri: (id: string) => void;
  readonly rinomina: (id: string) => void;
  readonly proprieta: (id: string) => void;
  readonly duplica: (id: string) => void;
  readonly elimina: (id: string) => void;
}

export function FinestraFunzioni({
  aperta,
  funzioni,
  testi,
  lingua,
  chiamataDa,
  comandi,
  nuova,
  importa,
  chiudi,
}: {
  aperta: boolean;
  /** Le procedure e le funzioni del progetto. */
  funzioni: readonly Funzione[];
  testi: Dizionario;
  lingua: string;
  chiamataDa: (f: Funzione) => readonly string[];
  comandi: ComandiDellaFunzione;
  nuova: () => void;
  importa: () => void;
  chiudi: () => void;
}): ReactElement {
  const primo = useRef<HTMLButtonElement>(null);
  // Il menu di una riga, aperto sotto il suo «⋯».
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const { procedure, funzioni: fs } = inOrdine(funzioni, lingua);
  const righe = [...procedure, ...fs];
  return (
    <Finestra aperta={aperta} titolo={testi.funzioniTitolo} rinuncia={chiudi} larga="piena" iniziale={() => primo.current}>
      {righe.length === 0 ? (
        <Descrizione className={stili.spiegazione}>{testi.funzioniNessuna}</Descrizione>
      ) : (
        <div className={propri.scorre}>
        <table className={propri.tabella}>
          <thead>
            <tr>
              <th scope="col">{testi.funzioniNome}</th>
              <th scope="col">{testi.funzioniGenere}</th>
              <th scope="col">{testi.funzioniParametri}</th>
              <th scope="col">{testi.funzioniRestituisce}</th>
              <th scope="col">{testi.funzioniChiamataDa}</th>
              <th scope="col">{testi.funzioniCasi}</th>
              <th scope="col">{testi.funzioniComandi}</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((f, i) => {
              const parametri = f.data.filter((d) => d.parameter !== undefined).map((d) => d.name);
              const da = chiamataDa(f);
              return (
                <tr key={f.id} data-funzione={f.id}>
                  <th scope="row">{f.name}</th>
                  <td>{f.kind === "function" ? testi.genereFunzione : testi.genereProcedura}</td>
                  <td>{parametri.length === 0 ? testi.funzioniNessuno : parametri.join(", ")}</td>
                  <td>{f.return_type === undefined ? "—" : tipoDelDato(risultatoDi(f), testi)}</td>
                  <td>{da.length === 0 ? testi.funzioniNessuno : da.join(", ")}</td>
                  <td>{String(f.test_cases?.length ?? 0)}</td>
                  <td>
                    <button
                      type="button"
                      ref={i === 0 ? primo : undefined}
                      className={`${stili.comando} ${propri.puntini}`}
                      aria-label={riempi(testi.menuDellaFunzione, { nome: f.name ?? "" })}
                      title={riempi(testi.menuDellaFunzione, { nome: f.name ?? "" })}
                      aria-haspopup="menu"
                      aria-expanded={menu?.id === f.id}
                      data-comandi-della-riga={f.id}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenu({ id: f.id, x: r.left, y: r.bottom });
                      }}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
      <MenuNelPunto
        dove={menu}
        nome={riempi(testi.menuDellaFunzione, { nome: righe.find((f) => f.id === menu?.id)?.name ?? "" })}
        voci={(["apri", "rinomina", "proprieta", "duplica", "elimina"] as const).map((chiave) => ({
          chiave,
          testo: testi[testoDellaVoce[chiave]],
          azione: () => {
            const id = menu?.id;
            setMenu(null);
            if (id !== undefined) comandi[chiave](id);
          },
        }))}
        chiudi={(torna) => {
          const id = menu?.id;
          setMenu(null);
          if (torna && id !== undefined) document.querySelector<HTMLElement>(`[data-comandi-della-riga="${id}"]`)?.focus();
        }}
      />
      <div className={stili.comandi}>
        <button type="button" className={stili.comando} ref={righe.length === 0 ? primo : undefined} data-nuova="" onClick={nuova}>
          {testi.funzioniNuova}
        </button>
        <button type="button" className={stili.comando} onClick={importa}>
          {testi.funzioniImporta}
        </button>
        <Rinuncia type="button" className={stili.comando}>
          {testi.chiudiEsc}
        </Rinuncia>
      </div>
    </Finestra>
  );
}
