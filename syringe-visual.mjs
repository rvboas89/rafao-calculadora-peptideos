export function buildSyringeScale(capacity) {
  if (capacity !== 50 && capacity !== 100) throw new RangeError("A capacidade deve ser 50 ou 100 UI.");

  return Array.from({ length: capacity + 1 }, (_, unit) => ({
    unit,
    percent: (unit / capacity) * 100,
    kind: unit % 10 === 0 ? "major" : unit % 5 === 0 ? "medium" : "minor",
    label: unit % 10 === 0 ? String(unit) : null,
  }));
}

export function getSyringePresentation(units, capacity) {
  if (capacity !== 50 && capacity !== 100) throw new RangeError("A capacidade deve ser 50 ou 100 UI.");
  const percent = (units / capacity) * 100;
  const boundedPercent = Math.min(100, Math.max(0, percent));

  return {
    fillPercent: boundedPercent,
    markerPercent: boundedPercent,
    overflow: units > capacity,
  };
}

export function getSyringeGeometry(capacity) {
  if (capacity === 50) {
    return {
      className: "capacity-50",
      maximumLabel: "50 UI MAX",
      volumeLabel: "0,5 mL",
      barrelPercent: 72,
    };
  }
  if (capacity === 100) {
    return {
      className: "capacity-100",
      maximumLabel: "100 UI MAX",
      volumeLabel: "1,0 mL",
      barrelPercent: 100,
    };
  }
  throw new RangeError("A capacidade deve ser 50 ou 100 UI.");
}
