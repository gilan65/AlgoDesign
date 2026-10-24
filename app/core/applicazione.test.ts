import { describe, expect, test } from "bun:test";
import { nomeApplicazione, titoloFinestra } from "./applicazione";

describe("titoloFinestra", () => {
  test("senza progetto è il nome dell'applicazione", () => {
    expect(titoloFinestra()).toBe("AlgoDesign");
    expect(titoloFinestra("   ")).toBe(nomeApplicazione);
  });

  test("con un progetto lo antepone al nome dell'applicazione", () => {
    expect(titoloFinestra(" Massimo di tre numeri ")).toBe("Massimo di tre numeri — AlgoDesign");
  });
});
