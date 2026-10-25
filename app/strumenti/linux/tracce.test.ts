// La divisione delle tracce per specie (`tracce.ts`), con una casa qualunque: quella di root nel container e quella
// dell'utente della CI devono dare le stesse specie. Controllo positivo: il giro senza `data/` accende i due rilevatori
// su ciascuna delle due cartelle dell'identificatore, e un residuo senza una delle due li dice spenti su quella.
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
      `${casa}/.local/share/${id}`,
    );
    const r = residuo(giro, base, dati, casa, id);
    expect(r.inData.map((v) => v.percorso)).toEqual([dati, `${dati}/preferenze.json`]);
    expect(r.ammesse.map((v) => v.percorso)).toEqual([`${casa}/.cache/mesa_shader_cache`, `${casa}/.cache/mesa_shader_cache/index`, "/tmp/appimage_extracted_0123abcd"]);
    expect(r.cartelle.map((v) => v.percorso)).toEqual([`${casa}/.cache`]);
    expect(r.fuori.map((v) => v.percorso)).toEqual([`${casa}/.local/share/recently-used.xbel`, `${casa}/.config/${id}`, `${casa}/.local/share/${id}`]);
    // I due rilevatori sono indipendenti: la cartella dell'identificatore è fuori dall'elenco E con l'identificatore.
    expect(r.conIdentificatore.map((v) => v.percorso)).toEqual([`${casa}/.config/${id}`, `${casa}/.local/share/${id}`]);
    expect(controlloPositivo(r, casa, id)).toEqual({ viste: [`${casa}/.config/${id}`, `${casa}/.local/share/${id}`], spente: [] });
  });
}

test("una cartella che contiene solo voci giuste e cartelle giuste è giusta anche lei: la casa con dentro ~/.cache", () => {
  // Misurato sulla macchina della CI: la casa cambia, dentro ha solo `~/.cache` (giusta perché contiene solo cache
  // ammesse) e la cartella privata di un servizio di systemd in /tmp.
  const casa = "/home/runner";
  const giro = voci(casa, `${casa}/.cache`, `${casa}/.cache/mesa_shader_cache`, `${casa}/.cache/mesa_shader_cache/index`, "/tmp/systemd-private-5fca0bf5-systemd-timedated.service-mJ8kB3");
  const r = residuo(giro, [], "/prova/data", casa, id);
  expect(r.cartelle.map((v) => v.percorso).sort()).toEqual([casa, `${casa}/.cache`]);
  expect(r.ammesse.map((v) => v.percorso)).toEqual([`${casa}/.cache/mesa_shader_cache`, `${casa}/.cache/mesa_shader_cache/index`, "/tmp/systemd-private-5fca0bf5-systemd-timedated.service-mJ8kB3"]);
  expect(r.fuori).toEqual([]);
  // Una voce estranea sotto la casa rende la casa fuori dall'elenco, insieme a lei.
  const conEstranea = residuo(voci(...giro.map((v) => v.percorso), `${casa}/estranea.txt`), [], "/prova/data", casa, id);
  expect(conEstranea.fuori.map((v) => v.percorso).sort()).toEqual([casa, `${casa}/estranea.txt`]);
});

test("il controllo positivo si dice spento senza le cartelle dell'identificatore, e anche con una sola delle due", () => {
  const cieche = (p: string) => [`rilevatore dell'identificatore cieco su ${p}`, `rilevatore voci fuori dall'elenco cieco su ${p}`];
  const r = residuo(voci("/root/.cache/dconf/user"), [], "/prova/data", "/root", id);
  expect(controlloPositivo(r, "/root", id)).toEqual({ viste: [], spente: [...cieche(`/root/.config/${id}`), ...cieche(`/root/.local/share/${id}`)] });
  // Una sola delle due: «almeno una» non basta più.
  const una = residuo(voci(`/root/.config/${id}`), [], "/prova/data", "/root", id);
  expect(controlloPositivo(una, "/root", id)).toEqual({ viste: [`/root/.config/${id}`], spente: cieche(`/root/.local/share/${id}`) });
  // Una casa diversa da quella delle voci non trova le cartelle: la casa conta.
  const altrove = residuo(voci(`/root/.config/${id}`, `/root/.local/share/${id}`), [], "/prova/data", "/root", id);
  expect(controlloPositivo(altrove, "/home/runner", id).viste).toEqual([]);
});
