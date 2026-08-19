import test from "node:test";
import assert from "node:assert/strict";

import {
  calculatePeptide,
  parseLocaleNumber,
} from "../calculator.mjs";

test("aceita vírgula ou ponto como separador decimal", () => {
  assert.equal(parseLocaleNumber("2,5"), 2.5);
  assert.equal(parseLocaleNumber("2.5"), 2.5);
  assert.ok(Number.isNaN(parseLocaleNumber("2,5 mg")));
});

test("converte 250 mcg em 10 unidades com frasco de 5 mg diluído em 2 mL", () => {
  const outcome = calculatePeptide({
    vialMg: 5,
    vialCount: 1,
    waterMl: 2,
    doseValue: 250,
    doseUnit: "mcg",
    syringeCapacity: 50,
    frequency: { mode: "perDay", dosesPerDay: 1 },
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.data.doseMg, 0.25);
  assert.equal(outcome.data.syringeUnits, 10);
  assert.equal(outcome.data.totalCompleteDoses, 20);
  assert.deepEqual(outcome.data.duration, { mode: "perDay", days: 20 });
});

test("mg e mcg produzem a mesma conversão para doses equivalentes", () => {
  const base = {
    vialMg: 10,
    vialCount: 2,
    waterMl: 2,
    syringeCapacity: 100,
    frequency: { mode: "interval", intervalDays: 3 },
  };
  const inMg = calculatePeptide({ ...base, doseValue: 0.5, doseUnit: "mg" });
  const inMcg = calculatePeptide({ ...base, doseValue: 500, doseUnit: "mcg" });

  assert.equal(inMg.ok, true);
  assert.equal(inMcg.ok, true);
  assert.equal(inMg.data.syringeUnits, inMcg.data.syringeUnits);
  assert.equal(inMg.data.syringeUnits, 10);
});

test("calcula cobertura e dia da última dose no modo intervalo", () => {
  const outcome = calculatePeptide({
    vialMg: 5,
    vialCount: 2,
    waterMl: 2,
    doseValue: 1,
    doseUnit: "mg",
    syringeCapacity: 100,
    frequency: { mode: "interval", intervalDays: 7 },
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.data.duration, {
    mode: "interval",
    coverageDays: 70,
    lastDoseDay: 64,
  });
});

test("emite alertas de capacidade, subunidade, fração e dose maior que o frasco", () => {
  const exceedsCapacity = calculatePeptide({
    vialMg: 5,
    vialCount: 1,
    waterMl: 2,
    doseValue: 3,
    doseUnit: "mg",
    syringeCapacity: 50,
    frequency: { mode: "perDay", dosesPerDay: 1 },
  });
  assert.deepEqual(exceedsCapacity.data.warnings, ["CAPACITY_EXCEEDED"]);

  const belowOne = calculatePeptide({
    vialMg: 10,
    vialCount: 1,
    waterMl: 1,
    doseValue: 50,
    doseUnit: "mcg",
    syringeCapacity: 50,
    frequency: { mode: "perDay", dosesPerDay: 1 },
  });
  assert.deepEqual(belowOne.data.warnings, ["BELOW_ONE_UNIT", "FRACTIONAL_UNIT"]);

  const exceedsVial = calculatePeptide({
    vialMg: 5,
    vialCount: 1,
    waterMl: 1,
    doseValue: 6,
    doseUnit: "mg",
    syringeCapacity: 100,
    frequency: { mode: "perDay", dosesPerDay: 1 },
  });
  assert.deepEqual(exceedsVial.data.warnings, ["CAPACITY_EXCEEDED", "DOSE_EXCEEDS_VIAL"]);
});

test("rejeita dados inválidos sem retornar números de aplicação", () => {
  const outcome = calculatePeptide({
    vialMg: 0,
    vialCount: 1.5,
    waterMl: Number.NaN,
    doseValue: -1,
    doseUnit: "mg",
    syringeCapacity: 50,
    frequency: { mode: "perDay", dosesPerDay: 0 },
  });

  assert.equal(outcome.ok, false);
  assert.deepEqual(outcome.errors, [
    "Informe os mg do frasco.",
    "Informe um número inteiro de frascos.",
    "Informe os mL de água por frasco.",
    "Informe uma dose válida.",
    "Informe quantas doses são utilizadas por dia.",
  ]);
});
