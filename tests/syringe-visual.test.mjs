import test from "node:test";
import assert from "node:assert/strict";

test("gera escala completa de 50 UI com marcações principais, intermediárias e menores", async () => {
  const visual = await import("../syringe-visual.mjs").catch(() => ({}));
  assert.equal(typeof visual.buildSyringeScale, "function", "buildSyringeScale precisa existir");

  const scale = visual.buildSyringeScale(50);
  assert.equal(scale.length, 51);
  assert.deepEqual(scale.filter((tick) => tick.kind === "major").map((tick) => tick.unit), [0, 10, 20, 30, 40, 50]);
  assert.deepEqual(scale.filter((tick) => tick.kind === "medium").map((tick) => tick.unit), [5, 15, 25, 35, 45]);
  assert.equal(scale.filter((tick) => tick.kind === "minor").length, 40);
});

test("posiciona o líquido e o marcador conforme a capacidade selecionada", async () => {
  const { getSyringePresentation } = await import("../syringe-visual.mjs");
  assert.equal(typeof getSyringePresentation, "function", "getSyringePresentation precisa existir");

  assert.deepEqual(getSyringePresentation(10, 50), {
    fillPercent: 20,
    markerPercent: 20,
    overflow: false,
  });
  assert.deepEqual(getSyringePresentation(10, 100), {
    fillPercent: 10,
    markerPercent: 10,
    overflow: false,
  });
  assert.deepEqual(getSyringePresentation(75, 50), {
    fillPercent: 100,
    markerPercent: 100,
    overflow: true,
  });
});
