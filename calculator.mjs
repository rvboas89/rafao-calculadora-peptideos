export function parseLocaleNumber(value) {
  const trimmed = String(value).trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed)) return Number.NaN;
  return Number(trimmed.replace(",", "."));
}

export function formatNumber(value, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

export function formatPositiveMeasurement(value, maximumSignificantDigits = 4) {
  if (!(Number.isFinite(value) && value > 0)) return formatNumber(value, maximumSignificantDigits);
  return new Intl.NumberFormat("pt-BR", { maximumSignificantDigits }).format(value);
}

function isPositiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

function validateInput(input) {
  const errors = [];
  if (!isPositiveFinite(input.vialMg)) errors.push("Informe os mg do frasco.");
  if (!Number.isInteger(input.vialCount) || input.vialCount <= 0) {
    errors.push("Informe um número inteiro de frascos.");
  }
  if (!isPositiveFinite(input.waterMl)) errors.push("Informe os mL de água por frasco.");
  if (!isPositiveFinite(input.doseValue)) errors.push("Informe uma dose válida.");
  if (input.doseUnit !== "mcg" && input.doseUnit !== "mg") {
    errors.push("Informe uma unidade de dose válida (mcg ou mg).");
  }
  if (input.syringeCapacity !== 50 && input.syringeCapacity !== 100) {
    errors.push("Informe uma capacidade de seringa válida (50 ou 100 unidades).");
  }
  const frequencyMode = input.frequency?.mode;
  if (frequencyMode !== "perDay" && frequencyMode !== "interval") {
    errors.push("Informe um tipo de frequência válido.");
  } else if (frequencyMode === "perDay" && !isPositiveFinite(input.frequency.dosesPerDay)) {
    errors.push("Informe quantas doses são utilizadas por dia.");
  } else if (frequencyMode === "interval" && !isPositiveFinite(input.frequency.intervalDays)) {
    errors.push("Informe o intervalo entre as doses.");
  }
  return errors;
}

function isEffectivelyInteger(value) {
  return Math.abs(value - Math.round(value)) < 1e-10;
}

function positiveRemainder(total, dose) {
  const completeDoses = Math.floor((total + Number.EPSILON) / dose);
  const remainder = total - completeDoses * dose;
  return Math.abs(remainder) < 1e-12 ? 0 : remainder;
}

export function calculatePeptide(input) {
  const errors = validateInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const doseMg = input.doseUnit === "mcg" ? input.doseValue / 1000 : input.doseValue;
  const concentrationMgMl = input.vialMg / input.waterMl;
  const volumeMl = doseMg / concentrationMgMl;
  const syringeUnits = volumeMl * 100;
  const totalStockMg = input.vialMg * input.vialCount;
  const totalCompleteDoses = Math.floor((totalStockMg + Number.EPSILON) / doseMg);
  const warnings = [];

  if (syringeUnits > input.syringeCapacity) warnings.push("CAPACITY_EXCEEDED");
  if (syringeUnits < 1) warnings.push("BELOW_ONE_UNIT");
  if (!isEffectivelyInteger(syringeUnits)) warnings.push("FRACTIONAL_UNIT");
  if (doseMg > input.vialMg) warnings.push("DOSE_EXCEEDS_VIAL");

  const duration = input.frequency.mode === "perDay"
    ? { mode: "perDay", days: totalCompleteDoses / input.frequency.dosesPerDay }
    : {
        mode: "interval",
        coverageDays: totalCompleteDoses * input.frequency.intervalDays,
        lastDoseDay: totalCompleteDoses > 0
          ? 1 + (totalCompleteDoses - 1) * input.frequency.intervalDays
          : 0,
      };

  return {
    ok: true,
    data: {
      doseMg,
      doseMcg: doseMg * 1000,
      concentrationMgMl,
      concentrationMcgMl: concentrationMgMl * 1000,
      volumeMl,
      syringeUnits,
      completeDosesPerVial: Math.floor((input.vialMg + Number.EPSILON) / doseMg),
      totalCompleteDoses,
      remainderPerVialMg: positiveRemainder(input.vialMg, doseMg),
      totalRemainderMg: positiveRemainder(totalStockMg, doseMg),
      duration,
      warnings,
    },
  };
}
