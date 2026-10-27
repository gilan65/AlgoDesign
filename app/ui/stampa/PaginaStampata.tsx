// La pagina stampata: le sezioni di `sezioniDellaStampa` (`parti.ts`), ognuna da un foglio nuovo con la sua regola `@page`
// (verso, intestazione nel margine sopra, piè di pagina scelto nel margine sotto). Sta fuori dalla finestra dell'app
// (`createPortal` nel `body`): sullo schermo non si vede, in stampa è l'unica cosa che si vede (le regole nascondono
// `#radice`). Le regole entrano in un foglio di stile costruito dal CSSOM, tolto quando la pagina si smonta: un `<style>`
// lo fermerebbe la politica di sicurezza dei contenuti.
//
// Le parti: il progetto (il nome e, se ci sono, l'autore, la descrizione e le note); i dati, con le tabelle della vista
// dei dati in sola lettura (le costanti comuni col programma principale, i parametri con ciò che restituisce, i dati);
// il flowchart, un SVG del nucleo per foglio (mai la tela della finestra); i casi d'uso, una tabella per funzione col nome,
// la descrizione, i valori scritti nella console e l'output atteso (con l'errore e gli avvisi attesi, come li dice la
// scheda del caso). Le tabelle e i titoli delle funzioni si seguono; con una funzione per sezione il titolo resta.
// Il codice: le righe del foglio a spaziatura fissa, col numero vero della riga a destra nella sua colonna; il seguito di
// una riga a capo ha ↪ al posto del numero e una barretta grigia prima del testo. Gli affiancati: il foglio diviso a metà,
// a sinistra l'SVG del flowchart sul mezzo foglio (se quel foglio ne ha), a destra il codice (se ne ha). Senza codice:
// la frase e l'elenco (ciò che manca col suo posto, o gli errori).
//
// CHE COSA NON FA: stampare (`window.print` di chi la mostra); la tavolozza e il modo di colore del flowchart (gli SVG li
// dà chi la mostra, con la tavolozza della carta).
import { useLayoutEffect, type CSSProperties, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { risultatoDi, type TestiDelDisegno, type ValoreRipetuto } from "../../core/disegno/impaginazione";
import type { Dato, Funzione, Progetto, Segnalazione } from "../../core/progetto/modello";
import type { testiDeiCodici } from "../../i18n/codici";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { nomiDelleNature } from "../dati/CampiDelDato";
import { rigaDelDato, tipoDelDato } from "../dati/righe";
import { casiDi, comuniDi, nomeNellaStampa, regoleDeiFogli, type CodiceDelFoglio, type ScelteDiStampa, type Sezione } from "./parti";
import stili from "./Stampa.module.css";

type Codici = (typeof testiDeiCodici)["it"];

/** Le righe di un foglio del codice. */
function Codice({ codice }: { codice: CodiceDelFoglio }): ReactElement {
  return (
    <pre className={stili.codice} style={{ "--cifre": `${codice.cifre}ch` } as CSSProperties}>
      {codice.righe.map((r) => (
        <div key={`${r.riga}.${r.pezzo}`} className={stili.riga} data-riga={codice.primo + r.riga + 1} data-pezzo={r.pezzo}>
          <span className={stili.numero}>{r.pezzo === 0 ? codice.primo + r.riga + 1 : "↪"}</span>
          {r.pezzo === 0 ? (
            <span>{" ".repeat(r.colonna) + r.testo}</span>
          ) : (
            <span>
              {" ".repeat(r.colonna - 2)}
              <span className={stili.barra}> </span> {r.testo}
            </span>
          )}
        </div>
      ))}
    </pre>
  );
}

function Tabella({ titolo, righe, piede }: { titolo?: string; righe: readonly (readonly string[])[]; piede?: string | undefined }): ReactElement {
  const [colonne, ...corpo] = righe;
  return (
    <>
      {titolo !== undefined && <h3 className={stili.sottotitolo}>{titolo}</h3>}
      <table className={stili.tabella}>
        <thead>
          <tr>
            {colonne!.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corpo.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {piede !== undefined && (
          <tfoot>
            <tr>
              <td colSpan={colonne!.length}>{piede}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </>
  );
}

export function PaginaStampata({
  progetto,
  sezioni,
  svgDelFoglio,
  svgAccanto,
  senzaCodice,
  scelte,
  quando,
  lingua,
  testi,
  valori,
  codici,
  nomeDi,
}: {
  progetto: Progetto;
  sezioni: readonly Sezione[];
  /** L'SVG del nucleo per un foglio del flowchart di una funzione. */
  svgDelFoglio: (f: Funzione, foglio: number) => string;
  /** L'SVG del nucleo per un foglio del flowchart di una funzione sul mezzo foglio degli affiancati. */
  svgAccanto: (f: Funzione, foglio: number) => string;
  /** Al posto del codice, se il linguaggio non lo dà: la frase e l'elenco. */
  senzaCodice: { readonly frase: string; readonly voci: readonly { readonly breve: string; readonly posto?: string }[] };
  scelte: ScelteDiStampa;
  quando: Date;
  lingua: string;
  testi: Dizionario;
  /** Come si mostrano i valori iniziali (come la vista dei dati). */
  valori: { readonly testi: TestiDelDisegno; readonly ripetuto: ValoreRipetuto };
  codici: Codici;
  /** Il blocco di un errore o di un avviso in parole. */
  nomeDi: (blocco: string) => string;
}): ReactElement {
  const data = new Intl.DateTimeFormat(lingua, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(quando);
  const regole = regoleDeiFogli(sezioni, testi, scelte, data);
  useLayoutEffect(() => {
    const foglio = new CSSStyleSheet();
    foglio.replaceSync(regole);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, foglio];
    return () => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((f) => f !== foglio);
    };
  }, [regole]);

  const m = progetto.metadata;
  const nessuno = "—";
  const segnalazione = (s: Segnalazione<string>) => riempi(testi.diffSegnalazione, { breve: codici[s.code as keyof Codici].breve, dove: nomeDi(s.block) });

  const dati = (f: Funzione) => {
    const riga = (d: Dato) => rigaDelDato(d, testi, valori.ripetuto, valori.testi);
    const comuni = comuniDi(progetto, f);
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    const lavoro = f.data.filter((d) => d.parameter === undefined);
    const colonne = [testi.datiNome, testi.datiTipo, testi.datiNatura, testi.datiIniziale, testi.datiRuolo];
    const righeDi = (ds: readonly Dato[]) => ds.map((d) => [riga(d).nome, riga(d).tipo, riga(d).natura, riga(d).iniziale ?? nessuno, riga(d).ruolo ?? nessuno]);
    const restituisce = f.return_type
      ? riempi(f.return_type === "string" && f.return_size === undefined ? testi.restituisceUna : testi.restituisceUn, { tipo: tipoDelDato(risultatoDi(f), testi) })
      : undefined;
    return (
      <div key={f.id} data-funzione={f.id}>
        <h2 className={stili.titoloDellaFunzione}>{nomeNellaStampa(f, testi)}</h2>
        {comuni.length > 0 && <Tabella titolo={testi.costantiComuni} righe={[colonne, ...righeDi(comuni)]} />}
        {f.kind !== "main" &&
          (parametri.length === 0 ? (
            <>
              <h3 className={stili.sottotitolo}>{testi.parametri}</h3>
              <p className={stili.vuoto}>{testi.nessunParametro}</p>
              {restituisce !== undefined && <p className={stili.vuoto}>{restituisce}</p>}
            </>
          ) : (
            <Tabella
              titolo={testi.parametri}
              righe={[[testi.datiPosizione, testi.datiNome, testi.datiTipo, testi.datiNatura], ...parametri.map((d, i) => [String(i + 1), riga(d).nome, riga(d).tipo, testi[nomiDelleNature[d.parameter!]]])]}
              piede={restituisce}
            />
          ))}
        {lavoro.length > 0 && <Tabella titolo={testi.dati} righe={[colonne, ...righeDi(lavoro)]} />}
      </div>
    );
  };

  const casi = (f: Funzione) => {
    const voci = (c: ReturnType<typeof casiDi>[number]) =>
      c.inputs.length === 0
        ? testi.casoNessunValore
        : c.inputs
            .map((v) => {
              const testo = "text" in v ? v.text : undefined;
              const ogni = "each" in v && v.each === true;
              return riempi(testo === undefined ? (ogni ? testi.casoVoceSenzaValoreOgniElemento : testi.casoVoceSenzaValore) : ogni ? testi.casoVoceOgniElemento : testi.casoVoce, { dato: v.data, testo: testo ?? "" });
            })
            .join("\n");
    const atteso = (c: ReturnType<typeof casiDi>[number]) => {
      const a = c.expected;
      return [
        a.output.replace(/\n$/, ""),
        ...(a.error ? [riempi(testi.casoErroreAtteso, { breve: codici[a.error.code].breve, dove: nomeDi(a.error.block) })] : []),
        ...(a.static_error ? [riempi(testi.casoErroreStaticoAtteso, { breve: codici[a.static_error.code as keyof Codici].breve, dove: nomeDi(a.static_error.block) })] : []),
        ...(a.warnings && a.warnings.length > 0 ? [riempi(testi.casoAvvisiAttesi, { elenco: a.warnings.map(segnalazione).join("; ") })] : []),
      ]
        .filter((x) => x !== "")
        .join("\n");
    };
    return (
      <div key={f.id} data-funzione={f.id}>
        <h2 className={stili.titoloDellaFunzione}>{nomeNellaStampa(f, testi)}</h2>
        <Tabella righe={[[testi.casoNome, testi.casoDescrizione, testi.stampaValori, testi.stampaOutputAtteso], ...casiDi(progetto, f).map((c) => [c.name || testi.casoSenzaNome, c.description ?? "", voci(c), atteso(c)])]} />
      </div>
    );
  };

  const elenco = (
    <div data-senza-codice="">
      <p className={stili.frase}>{senzaCodice.frase}</p>
      {senzaCodice.voci.length > 0 && (
        <ul className={stili.elenco}>
          {senzaCodice.voci.map((v, i) => (
            <li key={i}>
              {v.breve}
              {v.posto !== undefined && <span className={stili.posto}>{v.posto}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const contenuto = (s: Sezione): ReactElement => {
    switch (s.parte) {
      case "progetto":
        return (
          <>
            <h1 className={stili.titolo}>{m.name}</h1>
            <dl className={stili.metadati}>
              {(
                [
                  [testi.progettoAutore, m.author],
                  [testi.progettoDescrizione, m.description],
                  [testi.progettoNote, m.notes],
                ] as const
              ).map(([t, v]) =>
                (v ?? "").trim() === "" ? null : (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{v}</dd>
                  </div>
                ),
              )}
            </dl>
          </>
        );
      case "dati":
        return <>{s.funzioni.map(dati)}</>;
      case "casi":
        return <>{s.funzioni.map(casi)}</>;
      case "flowchart":
        return <div className={stili.flowchart} data-funzione={s.funzioni[0]!.id} dangerouslySetInnerHTML={{ __html: svgDelFoglio(s.funzioni[0]!, s.foglio!) }} />;
      case "codice":
        return s.codice ? <Codice codice={s.codice} /> : elenco;
      case "affiancati": {
        if (!s.codice && s.foglio === undefined) return elenco;
        const f = s.funzioni[0];
        return (
          <div className={stili.accanto}>
            {f && s.foglio !== undefined ? <div className={stili.flowchart} data-funzione={f.id} dangerouslySetInnerHTML={{ __html: svgAccanto(f, s.foglio) }} /> : <div />}
            <div className={stili.latoDelCodice}>{s.codice && <Codice codice={s.codice} />}</div>
          </div>
        );
      }
    }
  };

  return createPortal(
    <div className={stili.pagina} data-stampa="">
      {sezioni.map((s) => (
        <section key={s.nome} className={stili.parte} data-parte={s.parte} data-testa={s.testa} data-destra={s.destra} style={{ page: s.nome }}>
          {contenuto(s)}
        </section>
      ))}
    </div>,
    document.body,
  );
}
