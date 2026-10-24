// `x elevato_a y`: lo stesso risultato, bit per bit, su ogni motore JavaScript.
//
// `Math.pow`, `Math.exp` e `Math.log` sono approssimati in modo diverso da un motore all'altro (Bun e
// WebView2 danno cifre diverse sulla stessa coppia), quindi qui non si usano. Si usano solo `+ − × ÷`,
// `Math.sqrt` (arrotondata correttamente per specifica), i confronti e i bit del `double`.
//
// - Esponente intero (per valore, anche se scritto `2.0`) fino a `sogliaEsatta`: la potenza si calcola
//   ESATTA con `BigInt` e si arrotonda una volta al `double` più vicino, metà alla pari. Il `pow` di glibc
//   non lo garantisce (`9 elevato_a 17`, `10 elevato_a 23` sono pari merito che arrotonda per eccesso).
// - Altrimenti: il `pow` di fdlibm portato riga per riga (sotto, con la sua nota di licenza), che usa solo
//   aritmetica in doppia precisione. È «quasi arrotondato»: le ultime cifre possono differire da quelle
//   del C e del Python, che usano altre librerie.

const parole = new DataView(new ArrayBuffer(8));

/** La parola alta del `double`, con segno. */
const alta = (x: number): number => {
  parole.setFloat64(0, x);
  return parole.getInt32(0);
};

/** La parola bassa del `double`, senza segno. */
const bassa = (x: number): number => {
  parole.setFloat64(0, x);
  return parole.getUint32(4);
};

const daParole = (hi: number, lo: number): number => {
  parole.setInt32(0, hi);
  parole.setUint32(4, lo >>> 0);
  return parole.getFloat64(0);
};

const conBassaZero = (x: number): number => daParole(alta(x), 0);
const conAlta = (x: number, hi: number): number => daParole(hi, bassa(x));

/**
 * Il più grande esponente intero calcolato esatto: le cifre crescono con l'esponente (misurato in Bun,
 * caso peggiore con mantissa di 53 bit ed esponente negativo: 0,26 ms qui, 4,4 ms a 10 000, 62 ms a
 * 100 000). Oltre 1076 una base fuori da [0.5, 2) dà comunque un overflow o zero, quindi lì fdlibm è
 * esatto; resta «quasi arrotondato» solo con una base in [0.5, 2).
 */
export const sogliaEsatta = 1100;

export function potenza(x: number, y: number): number {
  if (Number.isInteger(y) && Math.abs(y) <= sogliaEsatta && Number.isFinite(x)) return potenzaIntera(x, y);
  return potenzaFdlibm(x, y);
}

// --------------------------------------------------------------------------- esponente intero esatto

const lunghezza = (b: bigint): number => {
  const h = b.toString(16);
  return (h.length - 1) * 4 + 32 - Math.clz32(parseInt(h[0]!, 16));
};

/** 2^e, per e in [-1074, 1023], costruito dai bit. */
function dueAlla(e: number): number {
  if (e >= -1022) return daParole((e + 1023) << 20, 0);
  const k = e + 1074;
  return k >= 32 ? daParole(1 << (k - 32), 0) : daParole(0, 1 << k);
}

/** |x| = m · 2^e con m intero dispari (x finito, non zero). */
function scomponi(x: number): [bigint, number] {
  const hi = alta(x);
  const esponente = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(bassa(x)) | (esponente > 0 ? 1n << 52n : 0n);
  let e = Math.max(esponente, 1) - 1075;
  while ((m & 1n) === 0n) {
    m >>= 1n;
    e++;
  }
  return [m, e];
}

/** Il `double` più vicino a num / den · 2^p (num, den > 0), metà alla pari; `Infinity` oltre il massimo. */
function arrotonda(num: bigint, den: bigint, p: number): number {
  // Il quoziente scalato ha 55 o 56 bit; il resto non nullo è il bit appiccicoso.
  const s = 55 - (lunghezza(num) - lunghezza(den));
  const n = s >= 0 ? num << BigInt(s) : num;
  const d = s >= 0 ? den : den << BigInt(-s);
  const q0 = n / d;
  const appiccicoso = n % d !== 0n;
  const e0 = p - s; // valore = (q0 + resto) · 2^e0
  // L'ultimo bit tenuto: 53 bit di mantissa, ma mai sotto quello dei subnormali (2^-1074).
  let ultimo = Math.max(e0 + lunghezza(q0) - 53, -1074);
  const t = BigInt(ultimo - e0); // almeno 2
  let q = q0 >> t;
  const resto = q0 & ((1n << t) - 1n);
  const meta = 1n << (t - 1n);
  if (resto > meta || (resto === meta && (appiccicoso || (q & 1n) === 1n))) q += 1n;
  if (q === 0n) return 0;
  if (lunghezza(q) > 53) {
    q >>= 1n;
    ultimo++;
  }
  if (ultimo + lunghezza(q) - 1 > 1023) return Infinity;
  return Number(q) * dueAlla(ultimo); // esatto: q < 2^53 e il prodotto è rappresentabile
}

function potenzaIntera(x: number, n: number): number {
  if (n === 0) return 1;
  const negativo = alta(x) < 0 && n % 2 !== 0;
  let v: number;
  if (x === 0) v = n > 0 ? 0 : Infinity;
  else {
    const [m, e] = scomponi(x);
    const k = Math.abs(n);
    const mk = m ** BigInt(k);
    v = n > 0 ? arrotonda(mk, 1n, e * k) : arrotonda(1n, mk, -e * k);
  }
  return negativo ? -v : v;
}

// ------------------------------------------------------------------------------- fdlibm, e_pow.c
//
// Portato da FreeBSD lib/msun/src/e_pow.c. Nota di licenza dell'originale, conservata come chiede:
//
// ====================================================
// Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
//
// Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice
// is preserved.
// ====================================================
//
// Le costanti si scrivono coi loro bit: un letterale con più di 20 cifre significative può essere letto
// in modo diverso da motori diversi.

const dp_h1 = daParole(0x3fe2b803, 0x40000000);
const dp_l1 = daParole(0x3e4cfdeb, 0x43cfd006);
const two53 = daParole(0x43400000, 0);
const twom54 = daParole(0x3c900000, 0);
const huge = 1.0e300;
const tiny = 1.0e-300;
const L1 = daParole(0x3fe33333, 0x33333303);
const L2 = daParole(0x3fdb6db6, 0xdb6fabff);
const L3 = daParole(0x3fd55555, 0x518f264d);
const L4 = daParole(0x3fd17460, 0xa91d4101);
const L5 = daParole(0x3fcd864a, 0x93c9db65);
const L6 = daParole(0x3fca7e28, 0x4a454eef);
const P1 = daParole(0x3fc55555, 0x5555553e);
const P2 = daParole(0xbf66c16c, 0x16bebd93);
const P3 = daParole(0x3f11566a, 0xaf25de2c);
const P4 = daParole(0xbebbbd41, 0xc5d26bf1);
const P5 = daParole(0x3e663769, 0x72bea4d0);
const lg2 = daParole(0x3fe62e42, 0xfefa39ef);
const lg2_h = daParole(0x3fe62e43, 0);
const lg2_l = daParole(0xbe205c61, 0x0ca86c39);
const ovt = 8.0085662595372944372e-17; // -(1024-log2(ovfl+.5ulp)); 20 cifre: lettura esatta garantita
const cp = daParole(0x3feec709, 0xdc3a03fd);
const cp_h = daParole(0x3feec709, 0xe0000000);
const cp_l = daParole(0xbe3e2fe0, 0x145b01f5);
const ivln2 = daParole(0x3ff71547, 0x652b82fe);
const ivln2_h = daParole(0x3ff71547, 0x60000000);
const ivln2_l = daParole(0x3e54ae0b, 0xf85ddf44);
const thrd = daParole(0x3fd55555, 0x55555555);

/** scalbn di fdlibm per un risultato subnormale: un solo arrotondamento, nel prodotto per 2^-54. */
function scalbn(x: number, n: number): number {
  const hx = alta(x);
  let k = ((hx & 0x7ff00000) >> 20) + n;
  if (k > 0) return conAlta(x, (hx & 0x800fffff) | (k << 20));
  if (k <= -54) return tiny * (x < 0 ? -tiny : tiny);
  k += 54;
  return conAlta(x, (hx & 0x800fffff) | (k << 20)) * twom54;
}

function potenzaFdlibm(x: number, y: number): number {
  const hx = alta(x);
  const lx = bassa(x);
  const hy = alta(y);
  const ly = bassa(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;

  if ((iy | ly) === 0) return 1;
  if (hx === 0x3ff00000 && lx === 0) return 1;
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return NaN;

  // yisint: 0 non intero, 1 intero dispari, 2 intero pari (serve solo con x < 0).
  let yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      const k = (iy >> 20) - 0x3ff;
      if (k > 20) {
        const j = ly >>> (52 - k);
        if (j << (52 - k) >>> 0 === ly) yisint = 2 - (j & 1);
      } else if (ly === 0) {
        const j = iy >> (20 - k);
        if (j << (20 - k) === iy) yisint = 2 - (j & 1);
      }
    }
  }

  if (ly === 0) {
    if (iy === 0x7ff00000) {
      if (((ix - 0x3ff00000) | lx) === 0) return 1;
      if (ix >= 0x3ff00000) return hy >= 0 ? y : 0;
      return hy < 0 ? -y : 0;
    }
    if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
  }

  let ax = Math.abs(x);
  if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
    let z = ax;
    if (hy < 0) z = 1 / z;
    if (hx < 0) {
      if (((ix - 0x3ff00000) | yisint) === 0) z = NaN;
      else if (yisint === 1) z = -z;
    }
    return z;
  }

  let n = (hx >>> 31) - 1;
  if ((n | yisint) === 0) return NaN;
  let s = 1;
  if ((n | (yisint - 1)) === 0) s = -1;

  let t1: number;
  let t2: number;
  if (iy > 0x41e00000) {
    if (iy > 0x43f00000) {
      if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny;
      if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny;
    if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny;
    const t = ax - 1;
    const w = t * t * (0.5 - t * (thrd - t * 0.25));
    const u = ivln2_h * t;
    const v = t * ivln2_l - w * ivln2;
    t1 = conBassaZero(u + v);
    t2 = v - (t1 - u);
  } else {
    n = 0;
    if (ix < 0x00100000) {
      ax *= two53;
      n -= 53;
      ix = alta(ax);
    }
    n += (ix >> 20) - 0x3ff;
    const j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    let k: number;
    if (j <= 0x3988e) k = 0;
    else if (j < 0xbb67a) k = 1;
    else {
      k = 0;
      n += 1;
      ix -= 0x00100000;
    }
    ax = conAlta(ax, ix);
    const bp = k === 1 ? 1.5 : 1;
    const dp_h = k === 1 ? dp_h1 : 0;
    const dp_l = k === 1 ? dp_l1 : 0;

    let u = ax - bp;
    let v = 1 / (ax + bp);
    const ss = u * v;
    const s_h = conBassaZero(ss);
    let t_h = daParole(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0);
    let t_l = ax - (t_h - bp);
    const s_l = v * (u - s_h * t_h - s_h * t_l);
    let s2 = ss * ss;
    let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += s_l * (s_h + ss);
    s2 = s_h * s_h;
    t_h = conBassaZero(3 + s2 + r);
    t_l = r - (t_h - 3 - s2);
    u = s_h * t_h;
    v = s_l * t_h + t_l * ss;
    const p_h = conBassaZero(u + v);
    const p_l = v - (p_h - u);
    const z_h = cp_h * p_h;
    const z_l = cp_l * p_h + p_l * cp + dp_l;
    const t = n;
    t1 = conBassaZero(z_h + z_l + dp_h + t);
    t2 = z_l - (t1 - t - dp_h - z_h);
  }

  // y = y1 + y2, poi (y1 + y2) · (t1 + t2).
  const y1 = conBassaZero(y);
  const p_l = (y - y1) * t1 + y * t2;
  let p_h = y1 * t1;
  let z = p_l + p_h;
  let j = alta(z);
  const i = bassa(z);
  if (j >= 0x40900000) {
    if (((j - 0x40900000) | i) !== 0) return s * huge * huge;
    if (p_l + ovt > z - p_h) return s * huge * huge;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if (((j - 0xc090cc00) | i) !== 0) return s * tiny * tiny;
    if (p_l <= z - p_h) return s * tiny * tiny;
  }

  // 2^(p_h + p_l)
  const aj = j & 0x7fffffff;
  let k = (aj >> 20) - 0x3ff;
  n = 0;
  if (aj > 0x3fe00000) {
    n = (j + (0x00100000 >> (k + 1))) | 0;
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    const t = daParole(n & ~(0x000fffff >> k), 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    p_h -= t;
  }
  let t = conBassaZero(p_l + p_h);
  const u = t * lg2_h;
  const v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
  z = u + v;
  const w = v - (z - u);
  t = z * z;
  t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const r = (z * t1) / (t1 - 2) - (w + z * w);
  z = 1 - (r - z);
  j = (alta(z) + (n << 20)) | 0;
  z = j >> 20 <= 0 ? scalbn(z, n) : conAlta(z, j);
  return s * z;
}
