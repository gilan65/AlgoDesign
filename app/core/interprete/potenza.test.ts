// `potenza`: l'esponente intero esatto arrotondato una volta, i bordi (subnormali, overflow, zero col
// segno), la soglia e i casi speciali dell'esponente non intero. L'atteso si calcola in modo indipendente:
// `Number(bigint)` e la lettura di `1eN` sono arrotondati al più vicino, metà alla pari, per specifica
// del linguaggio. Sul ramo dell'esponente non intero l'atteso sono i bit misurati in Bun e in V8 (in fondo):
// che il risultato sia lo stesso nei due motori non si prova qui (un solo motore), lo misurano gli script
// locali di stabilità (140 853 coppie) e dell'impronta.

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { potenza, sogliaEsatta } from "./potenza";

const uguale = (a: number, b: number, atteso: number) => expect({ a, b, v: potenza(a, b) }).toEqual({ a, b, v: atteso });

describe("esponente intero: la potenza esatta arrotondata una volta", () => {
  test("i pari merito, dove il pow di glibc arrotonda per eccesso", () => {
    // 9^17 = 16677181699666569 e 17^13 = 9904578032905937 stanno a metà fra due double: vince il pari.
    uguale(9, 17, Number(9n ** 17n));
    expect(potenza(9, 17)).toBe(16677181699666568);
    uguale(-9, 17, -16677181699666568);
    uguale(17, 13, 9904578032905936);
    uguale(10, 23, 1e23);
    uguale(-20, 23, Number((-20n) ** 23n));
  });

  test("basi intere da -30 a 30, esponenti da 0 a 60: uguale a Number del valore esatto", () => {
    const diversi: string[] = [];
    let n = 0;
    for (let a = -30; a <= 30; a++)
      for (let k = 0; k <= 60; k++) {
        n++;
        const atteso = Number(BigInt(a) ** BigInt(k));
        if (!Object.is(potenza(a, k), atteso)) diversi.push(`${a}^${k}`);
      }
    expect({ n, diversi }).toEqual({ n: 61 * 61, diversi: [] });
  });

  test("dieci alla n, da -323 a 308: uguale alla lettura di 1eN", () => {
    for (let k = -323; k <= 308; k++) uguale(10, k, Number(`1e${k}`));
  });

  test("subnormali, overflow e zero col segno", () => {
    uguale(2, -1074, 5e-324);
    uguale(2, -1075, 0); // metà esatta del più piccolo subnormale: alla pari, zero
    uguale(0.5, 1074, 5e-324);
    uguale(0.5, 1075, 0);
    expect(Object.is(potenza(-2, -1075), -0)).toBe(true);
    expect(Object.is(potenza(-2, -1076), 0)).toBe(true);
    uguale(2, 1023, Number(2n ** 1023n));
    uguale(2, 1024, Infinity);
    uguale(-2, 1025, -Infinity);
    uguale(1.5, 2, 2.25);
    uguale(2, -3, 0.125);
    uguale(-3, 3, -27);
  });

  test("zero, uno ed esponente zero", () => {
    uguale(0, 0, 1);
    uguale(0, 3, 0);
    expect(Object.is(potenza(-0, 3), -0)).toBe(true);
    expect(Object.is(potenza(-0, 2), 0)).toBe(true);
    uguale(0, -1, Infinity);
    uguale(-0, -1, -Infinity);
    uguale(1.0000000000000002, 0, 1);
  });

  test("oltre la soglia: fuori da [0.5, 2) overflow o zero; in [0.5, 2) un valore finito", () => {
    expect(sogliaEsatta).toBeGreaterThanOrEqual(1076);
    uguale(2, sogliaEsatta + 1, Infinity);
    uguale(0.49, sogliaEsatta + 1, 0);
    uguale(-1, 1e9 + 1, -1);
    uguale(1, 1e300, 1);
    const v = potenza(1.0000000000000002, 1e9);
    expect(v > 1.0000002 && v < 1.0000003).toBe(true); // e^(1e9 · 2.22e-16) ≈ 1.000000222
  });
});

describe("esponente non intero", () => {
  test("casi speciali e radici esatte", () => {
    uguale(4, 0.5, 2);
    uguale(16, 0.25, 2);
    uguale(4, 1.5, 8);
    uguale(4, -0.5, 0.5);
    expect(Object.is(potenza(-0, 0.5), 0)).toBe(true);
    uguale(0, -0.5, Infinity);
    expect(Number.isNaN(potenza(-8, 1 / 3))).toBe(true);
    expect(Number.isNaN(potenza(-1, 0.5))).toBe(true);
  });

  test("radici esatte: r^(p/q) con base r^q", () => {
    for (let r = 2; r <= 40; r++) {
      uguale(r * r, 1.5, r * r * r);
      uguale(r * r * r * r, 0.25, r);
      uguale(r * r * r * r, 0.75, r * r * r);
    }
  });
});

// I bit attesi sul ramo dell'esponente non intero, che non ha un oracolo indipendente: i risultati che Bun e node
// danno uguali. Due prove. La tabella: 64 coppie della misura di stabilità (le prime dove il pow di glibc dà un altro
// ultimo bit, le prime che cambiano con un bit alterato in tre costanti, una ogni 4000 delle altre), ogni riga base,
// esponente, risultato: dice QUALE coppia sbaglia. L'impronta: i risultati di 50 000 coppie generate qui, solo con
// bit e operazioni esatte. Misurato su 528 costanti alterate di un bit: 393 cambiano almeno un risultato delle due
// prove, e l'impronta le coglie tutte, la tabella 346 (di 43 che cambiano meno di 500 coppie su 50 000, la tabella ne
// coglie 3); le altre 135 non cambiano nessuna delle 50 064 coppie, né alcuna delle 140 853 della misura di stabilità:
// sono equivalenti su quell'insieme, non mutanti sfuggiti.
const bitAttesi = [
  "408479999999999a 4013d70a3d70a3d7 42d52e704204073b",
  "408508cccccccccd 40008f5c28f5c28f 4125cf9b3198a5e2",
  "40871b5c28f5c28f c008a3d70a3d70a4 3e190d33ccbce828",
  "406d39999999999a 400dae147ae147ae 41c24f16c46586ab",
  "405bd5c28f5c28f6 bff4cccccccccccd 3f61e53e34334576",
  "407704147ae147ae bfe999999999999a 3f82216bddbf9d41",
  "40778fae147ae148 bfd47ae147ae147b 3fc32d6568a1639d",
  "406c29999999999a 400999999999999a 41801d354b0deb21",
  "4080be604189374c c00f1eb851eb851f 3dbaa18e53fbfe2c",
  "407df5eb851eb852 3ff2147ae147ae14 4090b5c6b0e9b672",
  "40693147ae147ae1 3ff199999999999a 407569b9faf007a8",
  "4067c9999999999a 400cf5c28f5c28f6 41a546831dc8cede",
  "4085a80000000000 c010666666666666 3d83d405b211e828",
  "4021cccccccccccd 400a147ae147ae14 409372307a7456ca",
  "408f2a6666666666 bffe666666666666 3ec0d2dc4c84d5bd",
  "407e81c28f5c28f6 3ffccccccccccccd 40f0dd4bee888c4e",
  "4074b33333333333 4012cccccccccccd 426457531fea3e5c",
  "4073980000000000 bff70a3d70a3d70a 3f30ab2633be6a26",
  "408bfa6666666666 3fef5c28f5c28f5c 40886c00d969f70e",
  "406898f5c28f5c29 bfeccccccccccccd 3f81a66cbe849cd0",
  "407b6d999999999a 40070a3d70a3d70a 41836b6b73d8b9f6",
  "40534ccccccccccd c010b851eb851eb8 3e4ba64f185977f1",
  "4080bb3333333333 400e51eb851eb852 42147461206d5a06",
  "4084d4e147ae147b 4004cccccccccccd 4174f6b18b47a40c",
  "407327126e978d50 bffdeb851eb851ec 3ef780d7746e2b17",
  "408b9ccccccccccd 40117ae147ae147b 429b4a250494c5ad",
  "407c2995810624dd c013333333333333 3d49b77f697555c2",
  "4062428f5c28f5c3 4000e147ae147ae1 40e207437faa631a",
  "406783d70a3d70a4 c012333333333333 3dc8a1a973bf4998",
  "40835f47ae147ae1 3ff999999999999a 40dcab7d3ca677e6",
  "40740b1eb851eb85 3fd51eb851eb851f 401adb98b13c3e88",
  "40874a28f5c28f5c 400e51eb851eb852 4231e9198fe6bf20",
  "4068f8f5c28f5c29 4012851eb851eb85 4224dffe4540987c",
  "40805f3333333333 4012000000000000 427917976c39d4dc",
  "4079de5e353f7cee 4004000000000000 414a971e86fb1068",
  "4089fc0000000000 4006666666666666 41a1dc9cbc143d24",
  "407c09999999999a c00f47ae147ae148 3dc7849a973f39f6",
  "4083c7d70a3d70a4 bff199999999999a 3f4b28d19f37b858",
  "4042d7ef9db22d0e 400c000000000000 41140e68dc5e9e36",
  "4088abc6a7ef9db2 bfe3333333333333 3f92b3d21cf3ff9c",
  "408bcccccccccccd c001333333333333 3e9e9ed3bfe337c4",
  "4073066666666666 3fe0000000000000 40317272b4fe879e",
  "4086c73333333333 c011eb851eb851ec 3d4511d4c429e9c4",
  "408f3bc6a7ef9db2 3febd70a3d70a3d7 407973171701e76a",
  "405ad9999999999a bffc28f5c28f5c29 3f3174673c8d4bd8",
  "404110a3d70a3d71 c013e147ae147ae1 3e59c69c3e7ed490",
  "47377b78a36588d1 c044b0a43c000000 0000000000000000",
  "445573548278876f c032defd98000000 0000000000000000",
  "3bc7550d6ce08e11 402ed33600000000 00035cb46cb6b316",
  "45c1904c0d7319d3 c045648060000000 0000000000000000",
  "41819b33839146f0 c034164450000000 206099ca36b41a32",
  "4198a2442f3718c9 40362d0b70000000 64d4d5c8819f8cff",
  "4716cbd3d01d4835 c0475d65e4000000 0000000000000000",
  "3b39260ef6159ce3 403746f58e000000 0000000000000000",
  "454fe638bf9e1125 c0318d6ec0000000 0000000000000000",
  "40393da515a3c4b2 c038ae1290000000 38c08be5d8d7823a",
  "3a3c2723fd052aee 402f2c01a4000000 0000000000000000",
  "4268a17fef713d5f c03d3da370000000 0000000000000000",
  "3f81bc5b031232bf c035a216c8000000 49329b03b9e117de",
  "4078d2147ae147ae 3fd5555555555555 401d66ceecd98f7e",
  "408e9f5c28f5c28f 3fd5555555555555 4023dd7f876b10c9",
  "4057551eb851eb85 3fd5555555555555 401224df2054c4f6",
  "408cb9d70a3d70a4 3fd5555555555555 40237243e0eef4a8",
  "40499d70a3d70a3d 3fd5555555555555 400db643a036a3c0",
];
const improntaAttesa = "3e02beb94a1489fdc8be5966c8ef4fb2c443aed1698250dc28ced2016bf1e1f7";

const dv = new DataView(new ArrayBuffer(8));
const daEsadecimale = (h: string) => {
  dv.setBigUint64(0, BigInt(`0x${h}`));
  return dv.getFloat64(0);
};
const esadecimale = (x: number) => {
  dv.setFloat64(0, x);
  return dv.getBigUint64(0).toString(16).padStart(16, "0");
};

/** Base m · 2^e con m in [1, 2) ed e fra -40 e 40, esponente fra -60 e 60 con tre decimali, mai intero. */
function coppieGenerate(n: number): [number, number][] {
  let s = 0x2545f491;
  const prossimo = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s >>> 0;
  };
  const fuori: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const e = (prossimo() % 81) - 40;
    dv.setUint32(0, (((e + 1023) << 20) | (prossimo() >>> 12)) >>> 0);
    dv.setUint32(4, prossimo());
    let y = ((prossimo() % 120001) - 60000) / 1000;
    if (Number.isInteger(y)) y += 0.5;
    fuori.push([dv.getFloat64(0), y]);
  }
  return fuori;
}

describe("il ramo dell'esponente non intero: i bit misurati", () => {
  test("la tabella", () => {
    const diverse = bitAttesi.filter((r) => {
      const [a, b, atteso] = r.split(" ") as [string, string, string];
      return esadecimale(potenza(daEsadecimale(a), daEsadecimale(b))) !== atteso;
    });
    expect({ coppie: bitAttesi.length, diverse }).toEqual({ coppie: 64, diverse: [] });
  });

  test("l'impronta di 50 000 coppie generate", () => {
    const coppie = coppieGenerate(50_000);
    // Le coppie sono quelle della misura: la prima, coi suoi bit.
    expect(`${esadecimale(coppie[0]![0])} ${esadecimale(coppie[0]![1])}`).toBe("4198b9a764e1b3ac 40394624dd2f1aa0");
    const risultati = coppie.map(([a, b]) => esadecimale(potenza(a, b)));
    expect(createHash("sha256").update(risultati.join("\n")).digest("hex")).toBe(improntaAttesa);
  });
});

test("nessuna funzione che cambi da un motore all'altro nel sorgente", () => {
  const vietate = /Math\.(pow|exp|expm1|log|log1p|log2|log10|cbrt|hypot|sinh|cosh|tanh|atan2)\b/g;
  // Senza i commenti, che le nominano per dire che non si usano.
  const sorgente = readFileSync(join(import.meta.dir, "potenza.ts"), "utf8").replace(/\/\/.*$/gm, "");
  expect(sorgente.match(vietate) ?? []).toEqual([]);
  // Controllo positivo: il rilevatore si accende sull'interprete di prima.
  expect("return reale(Math.pow(a, b));".match(vietate)).toEqual(["Math.pow"]);
});
