// Preload di `bun test` (bunfig.toml → [test] preload). Tre cose, e ognuna ha una ragione:
//
// 1. Sotto `bun test` un `*.module.css` arriva come oggetto VUOTO: i CSS Modules sono del bundler,
//    non del runtime. Le classi varrebbero `undefined` e un test che confronta due `undefined`
//    passerebbe senza aver provato nulla. Il plugin restituisce ogni classe mappata sul proprio nome.
// 2. Il DOM per le prove dell'interfaccia viene da happy-dom.
// 3. Testing Library registra da sola la propria pulizia solo se trova un `afterEach` GLOBALE; qui
//    `afterEach` si importa da "bun:test", quindi la pulizia si registra a mano. Senza, i nodi resi da
//    una prova restano nel documento e la prova successiva ne trova due.
import { afterEach } from "bun:test";
import { plugin } from "bun";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

plugin({
  name: "css-modules-nelle-prove",
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, ({ path }) => {
      const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const classi: Record<string, string> = {};
      for (const m of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
        const nome = m[1];
        if (nome) classi[nome] = nome;
      }
      return { exports: { default: classi, ...classi }, loader: "object" };
    });
  },
});

GlobalRegistrator.register();

// Importata DOPO la registrazione del DOM: Testing Library legge `document` quando si carica.
const { cleanup } = await import("@testing-library/react");
afterEach(() => cleanup());
