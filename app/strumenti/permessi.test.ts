import { expect, test } from "bun:test";
import { permessiDiversi, type VoceLetta } from "./permessi";

const cartella = "AlgoDesign-1.0.0";
const giuste: VoceLetta[] = [
  [cartella, "d", "0o755"],
  [`${cartella}/data`, "d", "0o755"],
  [`${cartella}/AlgoDesign.AppImage`, "f", "0o755"],
  [`${cartella}/README.md`, "f", "0o644"],
  [`${cartella}/LICENZE-DELLE-LIBRERIE-DI-SISTEMA/licenze-comuni`, "d", "0o755"],
];

test("i permessi attesi non danno nulla; una cartella 0777, un file eseguibile e l'eseguibile 0644 si dicono tutti", () => {
  expect(permessiDiversi(giuste, `${cartella}/AlgoDesign.AppImage`)).toEqual([]);
  // La cartella delle licenze comuni com'era nell'archivio della CI, un testo con l'esecuzione, l'AppImage senza.
  const sbagliate: VoceLetta[] = [
    [`${cartella}/LICENZE-DELLE-LIBRERIE-DI-SISTEMA/licenze-comuni`, "d", "0o777"],
    [`${cartella}/README.md`, "f", "0o755"],
    [`${cartella}/AlgoDesign.AppImage`, "f", "0o644"],
  ];
  expect(permessiDiversi(sbagliate, `${cartella}/AlgoDesign.AppImage`)).toEqual([
    `${cartella}/LICENZE-DELLE-LIBRERIE-DI-SISTEMA/licenze-comuni (cartella) 0o777`,
    `${cartella}/README.md (file) 0o755`,
    `${cartella}/AlgoDesign.AppImage (file) 0o644`,
  ]);
  // L'eseguibile si riconosce per nome intero: un altro file con lo stesso nome finale non lo è.
  expect(permessiDiversi([[`${cartella}/data/AlgoDesign.AppImage`, "f", "0o755"]], `${cartella}/AlgoDesign.AppImage`)).toEqual([`${cartella}/data/AlgoDesign.AppImage (file) 0o755`]);
});
