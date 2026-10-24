// I colori dei generi di blocco nella finestra delle Impostazioni, sotto happy-dom con l'Ark vero: nove righe, una per
// genere, coi quadratini delle sue tinte e «Come l'insieme» per primo; la scelta vale sulla copia (il blocco d'esempio
// del genere la riceve, gli altri no) e arriva a chi conferma solo con «Conferma»; «Come l'insieme» e «Tutti come
// l'insieme» la tolgono; «Annulla» non conferma niente; la copia parte dalle scelte in uso; i nomi delle tinte.
//
// CHE COSA NON GUARDA: i colori calcolati e il loro contrasto (happy-dom non calcola le variabili: `e2e/colori.e2e.ts`),
// la radice del documento e il file delle preferenze (`e2e/colori.e2e.ts`), il file del progetto.
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { en } from "../../i18n/en";
import { it as testi } from "../../i18n/it";
import { generiColorati, tinteDeiBlocchi, tinteDelRiquadro, type ColoriDeiBlocchi } from "../colori";
import { scelteIniziali, type Scelte } from "../preferenze";
import { nomeDellaTinta } from "./ColoriDeiBlocchi";
import { FinestraImpostazioni } from "./FinestraImpostazioni";

afterEach(cleanup);
const giro = () => act(async () => await new Promise((r) => setTimeout(r, 20)));

async function apri(coloriDeiBlocchi: ColoriDeiBlocchi = {}) {
  const confermate: Scelte[] = [];
  let rinunce = 0;
  const v = render(
    <FinestraImpostazioni
      aperta
      testi={testi}
      lingua="it"
      scelte={{ ...scelteIniziali, coloriDeiBlocchi }}
      esempi={null}
      librerie={null}
      scegliCartella={async () => null}
      conferma={(_, s) => confermate.push(s)}
      rinuncia={() => rinunce++}
    />,
  );
  await giro();
  const riga = (g: string) => document.querySelector<HTMLElement>(`[data-genere="${g}"]`)!;
  const quadratino = (g: string, tinta = "") => riga(g).querySelector<HTMLInputElement>(`input[data-tinta="${tinta}"]`)!;
  const pulsante = (nome: string) => [...document.querySelectorAll("button")].find((b) => b.textContent === nome)!;
  return { v, confermate, rinunce: () => rinunce, riga, quadratino, pulsante };
}

test("nove righe, una per genere, ognuna con «Come l'insieme» e le sue tinte; scelto «Come l'insieme» per tutti", async () => {
  const f = await apri();
  const righe = [...document.querySelectorAll<HTMLElement>("[data-genere]")];
  expect(righe.map((r) => r.dataset.genere)).toEqual([...generiColorati]);
  for (const r of righe) {
    const tinte = [...r.querySelectorAll<HTMLInputElement>("input[type=radio]")].map((i) => i.dataset.tinta);
    expect(tinte).toEqual(["", ...(r.dataset.genere === "riquadro" ? tinteDelRiquadro : tinteDeiBlocchi)]);
    expect(f.quadratino(r.dataset.genere!).checked).toBe(true);
    // Il nome del genere per gli ausili, e il blocco d'esempio.
    expect(r.getAttribute("role")).toBe("radiogroup");
    expect(r.querySelector(`svg[data-esempio="${r.dataset.genere}"]`)).not.toBeNull();
  }
  expect(righe.length).toBe(9);
});

test("la scelta vale sulla copia e arriva con «Conferma»; il blocco d'esempio la riceve, gli altri no", async () => {
  const f = await apri();
  fireEvent.click(f.quadratino("se", "verde"));
  fireEvent.click(f.quadratino("riquadro", "linea-blu"));
  await giro();
  expect(f.quadratino("se", "verde").checked).toBe(true);
  // Il riquadro della scelta porta le variabili dei generi scelti: le forme d'esempio le prendono da lì.
  const riquadro = f.riga("se").closest("fieldset")!;
  expect(riquadro.style.getPropertyValue("--blocco-se")).toBe("var(--tinta-verde)");
  expect(riquadro.style.getPropertyValue("--blocco-riquadro")).toBe("var(--tinta-linea-blu)");
  expect(riquadro.style.getPropertyValue("--blocco-cicli")).toBe("");
  expect(f.confermate).toEqual([]);
  fireEvent.click(f.pulsante(testi.progettoConferma));
  await giro();
  expect(f.confermate.map((s) => s.coloriDeiBlocchi)).toEqual([{ se: "verde", riquadro: "linea-blu" }]);
});

test("«Come l'insieme» toglie la scelta di un genere, «Tutti come l'insieme» quelle di tutti; la copia parte dalle scelte in uso", async () => {
  const f = await apri({ se: "verde", cicli: "malva", commento: "sabbia" });
  expect(f.quadratino("cicli", "malva").checked).toBe(true);
  expect(f.pulsante(testi.coloriTuttiComeLInsieme).getAttribute("aria-disabled")).toBe("false");
  fireEvent.click(f.quadratino("cicli"));
  await giro();
  fireEvent.click(f.pulsante(testi.progettoConferma));
  await giro();
  expect(f.confermate.at(-1)!.coloriDeiBlocchi).toEqual({ se: "verde", commento: "sabbia" });
  f.v.unmount();

  const g = await apri({ se: "verde", cicli: "malva" });
  fireEvent.click(g.pulsante(testi.coloriTuttiComeLInsieme));
  await giro();
  expect(g.pulsante(testi.coloriTuttiComeLInsieme).getAttribute("aria-disabled")).toBe("true");
  for (const genere of generiColorati) expect(g.quadratino(genere).checked).toBe(true);
  fireEvent.click(g.pulsante(testi.progettoConferma));
  await giro();
  expect(g.confermate.at(-1)!.coloriDeiBlocchi).toEqual({});
});

test("«Annulla» non conferma la scelta", async () => {
  const f = await apri();
  fireEvent.click(f.quadratino("lettura", "arancione"));
  fireEvent.click(f.pulsante(testi.annullaEsc));
  await giro();
  expect(f.confermate).toEqual([]);
  expect(f.rinunce()).toBe(1);
});

test("i nomi delle tinte: il colore, «intenso» dopo nelle intense; in inglese il colore minuscolo dopo «Deep»", () => {
  expect(nomeDellaTinta("verde-intenso", testi)).toBe("Verde intenso");
  expect(nomeDellaTinta("linea-blu", testi)).toBe("Blu");
  expect(nomeDellaTinta("acqua", testi)).toBe("Verde acqua");
  expect(nomeDellaTinta("verde-intenso", en)).toBe("Deep green");
  expect(nomeDellaTinta("malva", en)).toBe("Mauve");
  // Ogni tinta ha un nome, diverso fra le tinte dello stesso genere.
  for (const elenco of [tinteDeiBlocchi, tinteDelRiquadro]) for (const t of [testi, en]) expect(new Set(elenco.map((x) => nomeDellaTinta(x, t))).size).toBe(elenco.length);
});
