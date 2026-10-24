// La base delle finestre (`Finestra.tsx`) sotto happy-dom, con l'Ark vero: che cosa succede al fuoco fra un disegno
// e l'altro e alla chiusura.
//
// - Un disegno nuovo con la finestra aperta non tocca il fuoco: col fuoco sul corpo (come lo lascia il clic su un
//   pulsante in WebKit) non torna al primo campo e non va al comando che l'ha aperta; chiusa, il fuoco torna lì.
// - Chiusa, la finestra esce dal documento nello stesso disegno, e un fuoco messo subito fuori resta fuori: nessuna
//   trappola rimasta lo riprende.
// - Il ritorno del fuoco detto da chi apre la finestra si legge all'apertura: la conferma prima di eliminare un dato,
//   aperta da un comando che poi sparisce (una voce di menu), chiusa senza eliminare rimette il fuoco sulla riga.
// - Il ritorno del fuoco di una finestra chiusa, se arriva dopo che un'altra si è aperta, non tocca il fuoco: le
//   chiusure senza giri in mezzo imitano i timer che sotto carico arrivano tardi.
//
// CHE COSA NON GUARDA:
// - i motori veri: il clic che lascia il fuoco al corpo si imita togliendo il fuoco a mano, e i tempi della trappola
//   (attiva un fotogramma dopo) sono quelli di happy-dom. La trappola nei motori la prova `e2e/progetto-file.e2e.ts`;
// - le finestre dell'app una per una: qui la base, con un contenuto scritto qui, e la conferma di eliminazione;
// - Esc e il Tab: li provano i motori.

import { expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { it as testi } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { ConfermaEliminazione, testiDelDato, type DaEliminare } from "../dati/ConfermaEliminazione";
import { Finestra } from "./Finestra";

/** I fotogrammi e i timer in attesa (happy-dom), e gli aggiornamenti di React. */
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));
const attivo = () => {
  const a = document.activeElement;
  return a === document.body ? "corpo" : a === null ? "nessuno" : (a.getAttribute("data-nome") ?? a.tagName);
};

function ConLaFinestra({ aperta, disegno }: { aperta: boolean; disegno: number }): ReactElement {
  return (
    <>
      <button type="button" data-nome="apri">
        apri
      </button>
      <input data-nome="fuori" />
      <Finestra aperta={aperta} titolo="Prova" rinuncia={() => undefined}>
        <input data-nome="primo" defaultValue="testo" />
        <button type="button" data-nome="secondo">
          secondo {disegno}
        </button>
      </Finestra>
    </>
  );
}

test("un disegno nuovo con la finestra aperta non sposta il fuoco, e chiusa lo rimette sul comando che l'ha aperta", async () => {
  const r = render(<ConLaFinestra aperta={false} disegno={0} />);
  (document.querySelector('[data-nome="apri"]') as HTMLElement).focus();
  r.rerender(<ConLaFinestra aperta disegno={0} />);
  await giro();
  expect(attivo()).toBe("primo");
  // Il clic su un pulsante della finestra in WebKit: il fuoco resta al corpo.
  (document.querySelector('[data-nome="secondo"]') as HTMLElement).focus();
  (document.activeElement as HTMLElement).blur();
  expect(attivo()).toBe("corpo");
  const dopo: string[] = [];
  for (let i = 1; i <= 3; i++) {
    r.rerender(<ConLaFinestra aperta disegno={i} />);
    await giro();
    dopo.push(attivo());
  }
  expect(dopo).toEqual(["corpo", "corpo", "corpo"]);
  r.rerender(<ConLaFinestra aperta={false} disegno={4} />);
  await giro();
  expect(attivo()).toBe("apri");
});

test("chiusa, la finestra esce subito dal documento, non lascia nulla nella pagina e un fuoco messo fuori resta fuori", async () => {
  const r = render(<ConLaFinestra aperta={false} disegno={0} />);
  const primaDiAprire = document.body.outerHTML;
  (document.querySelector('[data-nome="apri"]') as HTMLElement).focus();
  r.rerender(<ConLaFinestra aperta disegno={0} />);
  await giro();
  expect(attivo()).toBe("primo");
  // Controllo positivo: aperta, la finestra c'è, trattiene il fuoco e la pagina è cambiata.
  expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
  expect(document.body.outerHTML).not.toBe(primaDiAprire);
  act(() => r.rerender(<ConLaFinestra aperta={false} disegno={0} />));
  const nelDocumento = document.querySelectorAll('[role="dialog"]').length;
  (document.querySelector('[data-nome="fuori"]') as HTMLElement).focus();
  await giro();
  expect({ nelDocumento, fuoco: attivo() }).toEqual({ nelDocumento: 0, fuoco: "fuori" });
  // Né attributi sulla pagina (ciò che sta sotto la finestra nascosto agli ausili, lo scorrimento fermo) né nodi.
  expect(document.body.outerHTML).toBe(primaDiAprire);
});

function DueFinestre({ a, b }: { a: boolean; b: boolean }): ReactElement {
  return (
    <>
      <button type="button" data-nome="apriA">
        apri A
      </button>
      <button type="button" data-nome="apriB">
        apri B
      </button>
      <Finestra aperta={a} titolo="A" rinuncia={() => undefined}>
        <input data-nome="primoA" />
      </Finestra>
      <Finestra aperta={b} titolo="B" rinuncia={() => undefined}>
        <input data-nome="primoB" />
      </Finestra>
    </>
  );
}

test("il ritorno del fuoco di una finestra chiusa prima, arrivato tardi, non porta via il fuoco dal comando di quella aperta e chiusa dopo", async () => {
  const r = render(<DueFinestre a={false} b={false} />);
  (document.querySelector('[data-nome="apriA"]') as HTMLElement).focus();
  r.rerender(<DueFinestre a b={false} />);
  await giro();
  expect(attivo()).toBe("primoA");
  // Chiusa A, e prima che il suo ritorno arrivi (sotto carico i timer arrivano tardi) l'utente apre e chiude B: le
  // chiusure senza giri in mezzo, il fuoco sul comando di B messo a mano.
  act(() => r.rerender(<DueFinestre a={false} b={false} />));
  (document.querySelector('[data-nome="apriB"]') as HTMLElement).focus();
  act(() => r.rerender(<DueFinestre a={false} b />));
  const inB = attivo();
  act(() => r.rerender(<DueFinestre a={false} b={false} />));
  await giro();
  expect({ inB, fuoco: attivo() }).toEqual({ inB: "primoB", fuoco: "apriB" });
});

function ConLaConferma(): ReactElement {
  const [dato, setDato] = useState<DaEliminare | null>(null);
  const [menu, setMenu] = useState(true);
  return (
    <>
      <div data-nome="riga" tabIndex={-1}>
        riga
      </div>
      {menu && (
        <button
          type="button"
          data-nome="voce"
          onClick={() => {
            setDato({ indice: 0, nome: "n", regole: 2 });
            setMenu(false);
          }}
        >
          Elimina il dato
        </button>
      )}
      <ConfermaEliminazione
        testo={dato ? testiDelDato(dato, testi) : null}
        elimina={() => setDato(null)}
        rinuncia={() => setDato(null)}
        ritorno={() => (dato ? document.querySelector<HTMLElement>('[data-nome="riga"]') : null)}
        testi={testi}
      />
    </>
  );
}

test("la conferma prima di eliminare, aperta da una voce di menu che sparisce, chiusa senza eliminare rimette il fuoco sulla riga", async () => {
  render(<ConLaConferma />);
  const voce = document.querySelector('[data-nome="voce"]') as HTMLElement;
  voce.focus();
  act(() => voce.click());
  await giro();
  const finestra = document.querySelector('[role="alertdialog"]');
  expect(finestra?.textContent).toContain(riempi(testi.eliminaDatoTitolo, { nome: "n" }));
  expect(document.querySelector('[data-nome="voce"]')?.outerHTML ?? null).toBeNull();
  act(() => (document.querySelector('[role="alertdialog"] [data-part="close-trigger"]') as HTMLElement).click());
  // Il comando che rinuncia chiude la finestra un fotogramma dopo; il fuoco torna un istante dopo lo smontaggio.
  for (let i = 0; i < 10 && document.querySelector('[role="alertdialog"]'); i++) await giro();
  await giro();
  expect({ finestre: document.querySelectorAll('[role="alertdialog"]').length, fuoco: attivo() }).toEqual({ finestre: 0, fuoco: "riga" });
});
