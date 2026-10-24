// Anteprima del build: serve i file di dist/, cioè ciò che Tauri incorpora nell'eseguibile, con la politica di
// sicurezza dei contenuti della configurazione di Tauri (`app.security.csp`), come il prodotto. Un verde solo sul
// server di sviluppo non prova il prodotto. Indirizzo esplicito come in dev.ts: una seconda istanza sulla stessa porta
// esce con EADDRINUSE invece di affiancarsi sull'altro loopback.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { politicaDelProdotto } from "./politica";
import { portaAnteprima } from "./porte";

const dist = join(import.meta.dir, "..", "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("manca dist/index.html: prima `bun run build`");
  process.exit(1);
}

const politica = politicaDelProdotto();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: portaAnteprima,
  async fetch(richiesta) {
    const percorso = new URL(richiesta.url).pathname;
    const file = Bun.file(join(dist, percorso === "/" ? "index.html" : percorso));
    return (await file.exists()) ? new Response(file, { headers: { "Content-Security-Policy": politica } }) : new Response("non trovato", { status: 404 });
  },
});

console.log(`anteprima del build: ${server.url}`);
