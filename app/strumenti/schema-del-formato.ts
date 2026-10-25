// Scrive `docs/algo.schema.json`, lo JSON Schema del file `.algo` composto dal lettore (`schemaDelFormato` in
// `core/progetto/formato.ts`). Si rilancia dopo ogni cambio del lettore: `core/progetto/schema.test.ts` resta rossa
// finché il file pubblicato non coincide con quello composto.
//   bun ./strumenti/schema-del-formato.ts

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { testoDelloSchema } from "../core/progetto/formato";

const file = join(import.meta.dir, "..", "..", "docs", "algo.schema.json");
writeFileSync(file, testoDelloSchema());
console.log(`scritto ${file}`);
