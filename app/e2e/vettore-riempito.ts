// Il programma più pesante per la tabella di traccia che le Impostazioni lasciano eseguire: un vettore di 1000 elementi
// (il massimo) riempito da un ciclo, circa 3000 azioni. Lo eseguono la prova nei motori (`programmi-pesanti.e2e.ts`) e
// le prove sul prodotto (`strumenti/prova-portabile.ts`, `strumenti/linux/giro.ts`): lo stesso testo per tutte.

export const vettoreRiempito = JSON.stringify({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "pesante" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "v", type: "integer", size: 1000 },
        { name: "i", type: "integer", initial: "0" },
      ],
      body: [
        {
          id: "b1",
          kind: "while",
          condition: "i < 1000",
          body: [
            { id: "b2", kind: "assignment", target: "v[i]", value: "i * i" },
            { id: "b3", kind: "assignment", target: "i", value: "i + 1" },
          ],
        },
      ],
      end: { id: "bz" },
    },
  ],
});
