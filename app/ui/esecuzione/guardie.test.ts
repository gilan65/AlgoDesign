// Le guardie dell'esecuzione, decise una per una e appaiate per elementi coi sorgenti, nei due versi: ogni riga vera che ne usa una ha la sua voce, ogni voce la sua riga.
//
// - `soloLettura`: in pausa si modifica; in corso, in attesa di una riga e con «tutti i casi» no.
// - `inEsecuzione`: vale anche in pausa. Non è una guardia sulla modifica: i segni dell'esecuzione, oppure i comandi dei casi d'uso, che farebbero perdere la pausa.
// - `programmaCambiato`: in pausa, col programma cambiato dopo la pausa.
//
// Che cosa NON guarda: che il gesto faccia davvero ciò che la guardia dice (`e2e/riesegui.e2e.ts`, gesto per gesto nei quattro stati); le definizioni delle tre costanti,
// provate da quella stessa spec; una guardia scritta con altri nomi: le guardie sono queste perché lo stato si legge da qui.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const USA = /\b(soloLettura|inEsecuzione|programmaCambiato|situazioneDeiTasti|interazione\??\.solaLettura)\b/;
const NON_GUARDIE = /^\s*(const (soloLettura|inEsecuzione|programmaCambiato|situazioneDeiTasti)\b|\/\/|\/\*\*?|\*)/;

/** Un frammento della riga, col nome della guardia dentro: cambiare guardia su quella riga non la fa più trovare. */
const APPLICAZIONE: readonly string[] = [
  // In pausa sì, le modifiche.
  "if (soloLettura || !confermaIApertiCampi()) return;",
  "if (soloLettura) return;",
  "if (!soloLettura && !confermaIApertiCampi()) return;", // l'esportazione
  "if (!soloLettura && !confermaIApertiCampi()) return;", // la stampa
  "if (!soloLettura && !confermaIApertiCampi()) return;", // la segnalazione
  "!campiAperti && !soloLettura) {",
  "if (soloLettura) {",
  "if (!caso || !esito || soloLettura) return;",
  "salvaComeLibreria: soloLettura",
  "proprieta: soloLettura ? undefined",
  "...(soloLettura",
  "siAnnulla(cronologia) && !soloLettura",
  "siRipete(cronologia) && !soloLettura",
  "...(scelto !== null && !soloLettura",
  "sceltoValore !== null && !soloLettura &&",
  "funzioneDelMenu === undefined || soloLettura",
  "modificaRecord={soloLettura ? undefined",
  "aggiungiRecord={!soloLettura &&",
  "modifica={soloLettura ? undefined : {", // i dati
  "modificaComuni={soloLettura ||",
  "modifica={soloLettura ? undefined : {", // i casi d'uso
  "!soloLettura", // l'atteso dall'esito di un caso
  "(allarga && !soloLettura ?",
  "...(soloLettura ? {} :",
  "solaLettura: soloLettura,",
  "daiUnValore={soloLettura ? undefined",
  "sostituisciConOut={soloLettura ? undefined",
  // In pausa no, i casi d'uso: farebbero perdere la pausa senza dirlo.
  "if (inEsecuzione) return;", // «Esegui tutti»
  "if (inEsecuzione) return;", // un caso solo
  "eseguiTutti={!inEsecuzione &&",
  "eseguiSelezionati={!inEsecuzione ?",
  "eseguiCaso={!inEsecuzione ?",
  // I segni dell'esecuzione, non una guardia sulla modifica.
  "const inCorso = inEsecuzione;",
  "inPausa: inEsecuzione,",
  "const conSegni = inEsecuzione && s.segni;",
  "const conSegni = inEsecuzione && s.segni;",
  "const segni = inEsecuzione ?",
  "morbida={inEsecuzione}",
  "(mostrata.name ?? \"\"), inEsecuzione }",
  // Il programma cambiato in pausa.
  "azioneDelTasto(situazioneDeiTasti, t)",
  "programmaCambiato || campiAperti) {",
  "scelte.velocitaAnimata, programmaCambiato, campiAperti]",
  "adesso === \"in pausa\" && programmaCambiato ?",
  "animata: !tutti && !programmaCambiato &&",
  "esegui: programmaCambiato",
  "!programmaCambiato && tutti === null;", // scrivere un valore a mano dalla tabella
  "valoriDiPrima={programmaCambiato ?",
];

const FLOWCHART: readonly string[] = [
  // Il clic su un nome è solo del watch.
  "interazione.ferma && interazione.solaLettura ?",
  "if (interazione.solaLettura) ev.stopPropagation();",
  // In sola lettura niente campi, niente trascinamento, niente «+».
  "onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apri(voce.id)}",
  "if (!interazione.solaLettura && ev.button === 0",
  "onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apriValore",
  "onDoubleClick={interazione.solaLettura ? undefined : () => interazione.apriRestituisce",
  "if (interazione.solaLettura) return null;",
  "interazione?.apriParte && !interazione.solaLettura ?",
];

const righeDi = (sorgente: string) => sorgente.split("\n").filter((r) => USA.test(r) && !NON_GUARDIE.test(r));

/** Le voci senza una riga e le righe senza una voce: ogni riga consuma una voce sola, così una guardia in più si vede anche se ne somiglia a un'altra. */
export function appaia(voci: readonly string[], righe: readonly string[]): { readonly vociSenzaRiga: readonly string[]; readonly righeSenzaVoce: readonly string[] } {
  const libere = [...voci];
  const righeSenzaVoce: string[] = [];
  for (const r of righe) {
    // La voce più lunga: una voce breve (`!soloLettura`) non deve prendersi la riga di una lunga.
    const candidate = libere.filter((v) => r.includes(v)).sort((a, b) => b.length - a.length);
    const scelta = candidate[0];
    if (scelta === undefined) righeSenzaVoce.push(r.trim());
    else libere.splice(libere.indexOf(scelta), 1);
  }
  return { vociSenzaRiga: libere, righeSenzaVoce };
}

const leggi = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

test("ogni riga che usa una guardia ha la sua voce, e ogni voce la sua riga: finestra e flowchart", () => {
  const app = righeDi(leggi("../Applicazione.tsx"));
  const flowchart = righeDi(leggi("../disegno/Flowchart.tsx"));
  console.log(`guardie: finestra ${app.length} righe su ${APPLICAZIONE.length} voci, flowchart ${flowchart.length} righe su ${FLOWCHART.length} voci`);
  expect(appaia(APPLICAZIONE, app)).toEqual({ vociSenzaRiga: [], righeSenzaVoce: [] });
  expect(appaia(FLOWCHART, flowchart)).toEqual({ vociSenzaRiga: [], righeSenzaVoce: [] });
  expect(app.length).toBe(APPLICAZIONE.length);
  expect(flowchart.length).toBe(FLOWCHART.length);
});

test("controllo positivo: una guardia in più, una in meno o una cambiata sulla stessa riga si vedono", () => {
  const app = righeDi(leggi("../Applicazione.tsx"));
  // Una riga vera tolta.
  const senza = app.filter((r) => !r.includes("proprieta: soloLettura"));
  expect(appaia(APPLICAZIONE, senza).vociSenzaRiga).toEqual(["proprieta: soloLettura ? undefined"]);
  // Una guardia nuova.
  const inPiu = appaia(APPLICAZIONE, [...app, "    nuova={soloLettura ? undefined : fai}"]);
  expect(inPiu.righeSenzaVoce).toEqual(["nuova={soloLettura ? undefined : fai}"]);
  // La guardia sbagliata su una riga vera: i casi d'uso che diventano modificabili in pausa.
  const cambiata = app.map((r) => r.replace("eseguiCaso={!inEsecuzione ?", "eseguiCaso={!soloLettura ?"));
  const esito = appaia(APPLICAZIONE, cambiata);
  expect(esito.vociSenzaRiga).toEqual(["eseguiCaso={!inEsecuzione ?"]);
  expect(esito.righeSenzaVoce.length).toBeGreaterThan(0);
  // Il flowchart: un doppio clic che resta acceso in sola lettura.
  const senzaGuardia = righeDi(leggi("../disegno/Flowchart.tsx")).filter((r) => !r.includes("interazione.apri(voce.id)"));
  expect(appaia(FLOWCHART, senzaGuardia).vociSenzaRiga.length).toBe(1);
});
