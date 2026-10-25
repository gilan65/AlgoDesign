// Le porte del progetto stanno in un posto solo (`porte.ts`), ma la configurazione di Tauri è JSON e scrive la porta
// del server di sviluppo da sé (`build.devUrl`): questa prova le appaia, così una porta cambiata da una parte sola è
// rossa qui invece di lasciare `tauri dev` ad aspettare una pagina che non risponde.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { portaAnteprima, portaSviluppo } from "./porte";

test("la porta di sviluppo della configurazione di Tauri è quella del server di sviluppo", () => {
  const configurazione = JSON.parse(readFileSync(new URL("../shell/tauri.conf.json", import.meta.url), "utf8")) as { build: { devUrl: string } };
  const indirizzo = new URL(configurazione.build.devUrl);
  console.log(`devUrl ${configurazione.build.devUrl}; porta del server di sviluppo ${portaSviluppo}`);
  expect({ host: indirizzo.hostname, porta: Number(indirizzo.port) }).toEqual({ host: "127.0.0.1", porta: portaSviluppo });
  // Controllo positivo: la porta letta è un numero vero, e l'altra porta del progetto non passerebbe.
  expect(Number(indirizzo.port)).toBeGreaterThan(0);
  expect(Number(indirizzo.port)).not.toBe(portaAnteprima);
});
