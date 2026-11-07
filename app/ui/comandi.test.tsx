// Il catalogo dei comandi (`comandi.ts`) e ciò che se ne ricava.
//
// - Ogni pulsante della barra e ogni voce dei menu «Progetto» e «Aiuto» (aperti a turno) vengono dal catalogo, e ogni
//   comando del catalogo è reso una volta in ognuno dei suoi posti (barra, menu, riga di stato): appaiamento nei due versi, sugli
//   elementi e col conteggio accanto. Controlli positivi: un pulsante messo nella barra fuori dal catalogo, e un
//   comando del catalogo tolto dalla pagina, escono dal rilevatore. Entra ed Esci stanno nella barra solo se il progetto ha
//   procedure o funzioni: nel progetto nuovo mancano loro due (dichiarati), e la barra con le chiamate li ha.
// - I tasti scritti nel catalogo sono quelli che la finestra riconosce, nei due versi: ogni tasto del catalogo
//   fa il suo comando, e ogni tasto riconosciuto è scritto nel catalogo sul comando che fa (a parte le varianti
//   dichiarate: Cmd al posto di Ctrl, Ctrl+Maiusc+Z per Ripeti). Sul Mac si scrivono coi simboli del Mac (attesi
//   alla lettera, accanto a quelli di Windows, che non cambiano), e ognuno fa il suo comando.
//
// CHE COSA NON GUARDA:
// - la barretta flottante dell'esecuzione (`barra.e2e.ts`: ci sono gli stessi comandi del gruppo, e la si prova
//   accesa nei motori);
// - che cosa fa ogni comando (le prove di ogni comando), né la disposizione (`barra.e2e.ts`);
// - i tasti sul flowchart (Canc, Ctrl+C, Ctrl+X, Ctrl+V): valgono sul blocco col fuoco, non dalla barra, e il
//   catalogo non li scrive.
import { expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { Applicazione } from "./Applicazione";
import { Barra } from "./Barra";
import { suggerimento, tastoDelComando, tastoDiEliminazione, tastoMostrato, catalogo as tuttiIComandi, type Comando, type IdComando } from "./comandi";
import { tastoDellEsecuzione } from "./esecuzione/tasti";
import { comandoDelFile, comandoDellaCronologia } from "./modifiche";

const misura = (t: string) => [...t].length * 10;
const catalogo: Record<IdComando, Comando> = tuttiIComandi;

/** I comandi resi, come «id @ posto», e ciò che sta nella barra o nel menu senza venire dal catalogo; con `soloMenu`,
 * solo ciò che sta nel menu aperto. */
function resi(soloMenu = false): { comandi: string[]; fuori: string[] } {
  const posto = (e: Element) =>
    e.closest("header") ? "barra" : e.closest('[role="menu"]') ? "menu" : e.closest(`section[aria-label="${it.rigaDiStato}"]`) ? "riga di stato" : "altrove";
  const comandi: string[] = [];
  const fuori: string[] = [];
  const dove = soloMenu ? '[role="menu"] [role="menuitem"], [role="menu"] [data-comando]' : 'header button, [role="menu"] [role="menuitem"], [data-comando]';
  for (const e of document.querySelectorAll<HTMLElement>(dove)) {
    const id = e.dataset.comando;
    if (id !== undefined) comandi.push(`${id} @ ${posto(e)}`);
    // Il pulsante che apre il menu è del menu, non un comando.
    else if (e.dataset.menu === undefined) fuori.push(e.textContent ?? "");
  }
  return { comandi, fuori };
}

const attesi = Object.entries(catalogo)
  .flatMap(([id, c]) => c.posti.map((p) => `${id} @ ${p}`))
  .sort();

/** L'appaiamento nei due versi, coi doppioni e i pulsanti fuori dal catalogo: ciò che è reso col menu aperto ora, più
 * le voci degli altri menu, raccolte prima a menu aperto. */
function appaia(altriMenu: { comandi: string[]; fuori: string[] }) {
  const ora = resi();
  const comandi = [...altriMenu.comandi, ...ora.comandi];
  const fuori = [...altriMenu.fuori, ...ora.fuori];
  return {
    conteggio: `catalogo ${attesi.length} · resi ${comandi.length}`,
    senzaResa: attesi.filter((a) => !comandi.includes(a)),
    senzaCatalogo: comandi.filter((c) => !attesi.includes(c)),
    doppi: comandi.filter((c, i) => comandi.indexOf(c) !== i),
    fuori,
  };
}

test("ogni pulsante della barra e ogni voce del menu vengono dal catalogo, e ogni comando del catalogo è reso una volta per posto", async () => {
  await act(async () => {
    render(<Applicazione linguaIniziale="it" misura={misura} />);
  });
  const pulsanteDel = (nome: string) => {
    const p = document.querySelector<HTMLElement>(`header [data-menu="${nome}"]`);
    expect(p, `il pulsante del menu «${nome}» non c'è`).not.toBeNull();
    return p!;
  };
  // Il menu «Aiuto» aperto e richiuso (le sue voci), poi il menu «Progetto» aperto, con la barra e la riga di stato.
  await act(async () => {
    fireEvent.click(pulsanteDel("aiuto"));
  });
  expect(screen.getAllByRole("menu").length).toBe(1);
  const aiuto = resi(true);
  await act(async () => {
    fireEvent.click(pulsanteDel("aiuto"));
  });
  await act(async () => await new Promise((r) => setTimeout(r, 20)));
  expect(screen.queryAllByRole("menu").length).toBe(0);
  await act(async () => {
    fireEvent.click(pulsanteDel("progetto"));
  });
  expect(screen.getAllByRole("menu").length).toBe(1);
  // Controllo positivo della raccolta: le voci del menu «Aiuto» ci sono.
  expect(aiuto.comandi).toEqual(["guida @ menu", "esempi @ menu", "registra @ menu", "segnala @ menu", "informazioni @ menu"]);
  const esito = appaia(aiuto);
  console.log(`appaiamento: ${esito.conteggio}`);
  const senzaChiamate = ["entra @ barra", "esci @ barra"];
  expect({ senzaResa: esito.senzaResa, senzaCatalogo: esito.senzaCatalogo, doppi: esito.doppi, fuori: esito.fuori }).toEqual({ senzaResa: senzaChiamate, senzaCatalogo: [], doppi: [], fuori: [] });
  expect(esito.conteggio).toBe(`catalogo ${attesi.length} · resi ${attesi.length - senzaChiamate.length}`);

  // Controlli positivi: un pulsante nella barra fuori dal catalogo, e un comando del catalogo che non c'è più.
  const intruso = Object.assign(document.createElement("button"), { textContent: "Intruso" });
  document.querySelector("header")!.append(intruso);
  document.querySelector('header [data-comando="copia"]')!.remove();
  const mutato = appaia(aiuto);
  expect(mutato.fuori).toEqual(["Intruso"]);
  expect(mutato.senzaResa).toEqual(["copia @ barra", ...senzaChiamate]);
});

test("Entra ed Esci sono nel gruppo dell'esecuzione della barra solo con le chiamate, dopo «Passo»", () => {
  const gruppo = (conChiamate: boolean) => {
    const r = render(<Barra testi={it} presentazione="icone-e-testo" azioni={{}} conChiamate={conChiamate} />);
    const ids = [...r.container.querySelectorAll<HTMLElement>('[data-gruppo="esecuzione"] [data-comando]')].map((e) => e.dataset.comando);
    r.unmount();
    return ids;
  };
  expect({ con: gruppo(true), senza: gruppo(false) }).toEqual({
    con: ["esegui", "passo", "entra", "esci", "animata", "velocita", "ferma", "punto", "togliPunti"],
    senza: ["esegui", "passo", "animata", "velocita", "ferma", "punto", "togliPunti"],
  });
});

// ------------------------------------------------------------------------------------------------- i tasti

/** L'evento di un tasto scritto coi nomi standard (quelli di `aria-keyshortcuts`). */
function evento(tasto: string) {
  const parti = tasto.split("+");
  const key = parti.at(-1)!;
  return { key: key.length === 1 ? key.toLowerCase() : key, ctrlKey: parti.includes("Control"), metaKey: parti.includes("Meta"), shiftKey: parti.includes("Shift"), altKey: false };
}

/** Il comando che la finestra fa con quel tasto, secondo i suoi riconoscitori; `null` se nessuno. */
function riconosciuto(e: ReturnType<typeof evento>): IdComando | null {
  const esecuzione = { F5: "esegui", F10: "passo", F11: "entra", "Maiusc+F11": "esci", "Maiusc+F5": "ferma", F9: "punto" } as const;
  const t = tastoDellEsecuzione(e);
  return comandoDelFile(e) ?? comandoDellaCronologia(e) ?? (t === null ? null : esecuzione[t]);
}

test("ogni tasto del catalogo fa il suo comando", () => {
  const conTasto = Object.entries(catalogo).filter(([, c]) => c.tasto !== undefined);
  // Controllo positivo della premessa: i tasti dei file, di Annulla e Ripeti e dell'esecuzione sono scritti.
  expect(conTasto.map(([id]) => id).sort()).toEqual(["annulla", "apri", "entra", "esci", "esegui", "ferma", "nuovo", "passo", "punto", "ripeti", "salva", "salvaConNome", "stampa"]);
  const sbagliati = conTasto.filter(([id, c]) => riconosciuto(evento(c.tasto!)) !== id).map(([id, c]) => `${id}: ${c.tasto} fa ${riconosciuto(evento(c.tasto!))}`);
  expect(sbagliati).toEqual([]);
});

test("ogni tasto che la finestra riconosce è scritto nel catalogo sul comando che fa", () => {
  // Tutte le lettere e i tasti funzione, con e senza Ctrl e Maiusc.
  const tasti = [..."abcdefghijklmnopqrstuvwxyz".toUpperCase(), ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`)];
  // Le varianti di un tasto del catalogo: Ripeti anche con Ctrl+Maiusc+Z, Stampa anche con Ctrl+Maiusc+P (che nella
  // WebView2 farebbe stampare il motore con la finestra del sistema).
  const varianti = new Map([
    ["Control+Shift+Z", "ripeti"],
    ["Control+Shift+P", "stampa"],
  ]);
  const trovati: string[] = [];
  const sbagliati: string[] = [];
  for (const k of tasti)
    for (const mod of ["", "Control+", "Shift+", "Control+Shift+"]) {
      const tasto = `${mod}${k}`;
      const id = riconosciuto(evento(tasto));
      // Una variante che la finestra non riconosce più è rossa come una che fa un altro comando.
      if (id === null && !varianti.has(tasto)) continue;
      if (varianti.has(tasto)) {
        if (varianti.get(tasto) !== id) sbagliati.push(`la variante ${tasto} fa «${id}» invece di «${varianti.get(tasto)}»`);
        continue;
      }
      if (id === null) continue;
      trovati.push(tasto);
      if (catalogo[id].tasto !== tasto) sbagliati.push(`${tasto} fa «${id}», che nel catalogo ha ${catalogo[id].tasto ?? "nessun tasto"}`);
    }
  console.log(`tasti riconosciuti: ${trovati.length} (${trovati.join(", ")})`);
  // L'elenco, non il conto: un tasto in più e uno in meno danno lo stesso numero.
  expect(trovati.sort()).toEqual(["Control+N", "Control+O", "Control+P", "Control+S", "Control+Shift+S", "Control+Y", "Control+Z", "F10", "F11", "F5", "F9", "Shift+F11", "Shift+F5"].sort());
  expect(sbagliati).toEqual([]);
});

test("i tasti si scrivono con Ctrl fuori dal Mac e coi simboli del Mac sul Mac, e il tasto scritto sul Mac fa il suo comando", () => {
  const conTasto = (Object.keys(catalogo) as IdComando[]).filter((id) => catalogo[id].tasto !== undefined);
  const scritti = (mac: boolean) => Object.fromEntries(conTasto.map((id) => [id, tastoMostrato(tastoDelComando(id, mac)!, it, mac)]));
  // Fuori dal Mac non cambia nulla.
  expect(scritti(false)).toEqual({
    nuovo: "Ctrl+N",
    apri: "Ctrl+O",
    salva: "Ctrl+S",
    salvaConNome: "Ctrl+Maiusc+S",
    annulla: "Ctrl+Z",
    ripeti: "Ctrl+Y",
    esegui: "F5",
    passo: "F10",
    entra: "F11",
    esci: "Maiusc+F11",
    ferma: "Maiusc+F5",
    punto: "F9",
    stampa: "Ctrl+P",
  });
  expect(scritti(true)).toEqual({ nuovo: "⌘N", apri: "⌘O", salva: "⌘S", salvaConNome: "⇧⌘S", annulla: "⌘Z", ripeti: "⇧⌘Z", esegui: "F5", passo: "F10", entra: "F11", esci: "⇧F11", ferma: "⇧F5", punto: "F9", stampa: "⌘P" });
  const sbagliati = conTasto.filter((id) => riconosciuto(evento(tastoDelComando(id, true)!)) !== id);
  expect(sbagliati).toEqual([]);
  // Il tasto che elimina, nelle due lingue fuori dal Mac e sul Mac; e il suggerimento intero.
  expect([tastoMostrato(tastoDiEliminazione(false), it, false), tastoMostrato(tastoDiEliminazione(false), en, false), tastoMostrato(tastoDiEliminazione(true), it, true)]).toEqual(["Canc", "Del", "⌫"]);
  expect([suggerimento("salvaConNome", it.salvaConNome, it, false), suggerimento("salvaConNome", it.salvaConNome, it, true)]).toEqual([
    `${it.salvaConNome} (Ctrl+Maiusc+S)`,
    `${it.salvaConNome} (⇧⌘S)`,
  ]);
});
