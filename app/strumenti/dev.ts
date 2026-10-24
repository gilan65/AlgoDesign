// Server di sviluppo. Indirizzo esplicito: `bun ./index.html` ascolta solo su [::1], e una seconda
// istanza si prende 127.0.0.1 sulla stessa porta senza errore; con `hostname` esplicito la seconda
// istanza esce con EADDRINUSE. La porta sta in porte.ts.
import pagina from "../index.html";
import { portaSviluppo } from "./porte";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: portaSviluppo,
  routes: { "/*": pagina },
  // Ricaricamento a caldo SPENTO: con Bun 1.4.2 rompe ogni componente che importa un *.module.css
  // (pagina vuota). Si ricarica la pagina a mano. Da riprovare a ogni aggiornamento di Bun.
  development: { hmr: false, console: true },
});

console.log(`server di sviluppo: ${server.url}`);
