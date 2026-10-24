// La divisione delle tracce per specie (`tracce.ts`), con una casa qualunque: quella di root nel container e quella
// dell'utente della CI devono dare le stesse specie. Controllo positivo: il giro senza `data/` accende i due rilevatori
// sulla cartella dell'identificatore, e un residuo senza quella cartella li dice spenti.
import { expect, test } from "bun:test";
import { controlloPositivo, residuo, type Voce } from "./tracce";

const id = "io.github.esempio.app";
const voci = (...percorsi: string[]): Voce[] => percorsi.map((percorso) => ({ tipo: "N", percorso }));

for (const casa of ["/root", "/home/runner"]) {
  test(`le specie delle voci nuove con la casa ${casa}`, () => {
    const dati = "/tmp/prova con spazi/AlgoDesign-1.0.0/data";
    const base = voci(`${casa}/.bun/install/cache`, "/tmp/.X11-unix/X99");
    const giro = voci(
      ...base.map((v) => v.percorso),
      dati,
      `${dati}/preferenze.json`,
      `${casa}/.cache`,
      `${casa}/.cache/mesa_shader_cache`,
      `${casa}/.cache/mesa_shader_cache/index`,
      "/tmp/appimage_extracted_0123abcd",
      `${casa}/.local/share/recently-used.xbel`,
      `${casa}/.config/${id}`,
    );
    const r = residuo(giro, base, dati, casa, id);
    expect(r.inData.map((v) => v.percorso)).toEqual([dati, `${dati}/preferenze.json`]);
    expect(r.ammesse.map((v) => v.percorso)).toEqual([`${casa}/.cache/mesa_shader_cache`, `${casa}/.cache/mesa_shader_cache/index`, "/tmp/appimage_extracted_0123abcd"]);
    expect(r.cartelle.map((v) => v.percorso)).toEqual([`${casa}/.cache`]);
    expect(r.fuori.map((v) => v.percorso)).toEqual([`${casa}/.local/share/recently-used.xbel`, `${casa}/.config/${id}`]);
    // I due rilevatori sono indipendenti: la cartella dell'identificatore è fuori dall'elenco E con l'identificatore.
    expect(r.conIdentificatore.map((v) => v.percorso)).toEqual([`${casa}/.config/${id}`]);
    expect(controlloPositivo(r, casa, id)).toEqual({ viste: [`${casa}/.config/${id}`], spente: [] });
  });
}

test("il controllo positivo si dice spento senza la cartella dell'identificatore", () => {
  const r = residuo(voci("/root/.cache/dconf/user"), [], "/prova/data", "/root", id);
  expect(controlloPositivo(r, "/root", id)).toEqual({ viste: [], spente: ["nessuna cartella dell'identificatore sotto /root"] });
  // Una casa diversa da quella delle voci non trova la cartella: la casa conta.
  const altrove = residuo(voci(`/root/.config/${id}`), [], "/prova/data", "/root", id);
  expect(controlloPositivo(altrove, "/home/runner", id).spente).toEqual(["nessuna cartella dell'identificatore sotto /home/runner"]);
});
