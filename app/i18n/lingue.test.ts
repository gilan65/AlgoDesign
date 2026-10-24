import { describe, expect, test } from "bun:test";
import { linguaDelSistema, linguaValida } from "./lingue";

describe("linguaDelSistema", () => {
  test("italiano per ogni varietà di italiano", () => {
    expect(linguaDelSistema("it")).toBe("it");
    expect(linguaDelSistema("it-IT")).toBe("it");
    expect(linguaDelSistema("it-CH")).toBe("it");
  });

  test("inglese per ogni altra lingua", () => {
    expect(linguaDelSistema("en-US")).toBe("en");
    expect(linguaDelSistema("fr-FR")).toBe("en");
    expect(linguaDelSistema("")).toBe("en");
  });
});

test("linguaValida accetta solo le lingue dei dizionari", () => {
  expect(linguaValida("it")).toBe(true);
  expect(linguaValida("en")).toBe(true);
  expect(linguaValida("fr")).toBe(false);
  expect(linguaValida("toString")).toBe(false);
  expect(linguaValida(undefined)).toBe(false);
});
