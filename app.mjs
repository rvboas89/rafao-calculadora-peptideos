import {
  calculatePeptide,
  formatNumber,
  formatPositiveMeasurement,
  parseLocaleNumber,
} from "./calculator.mjs";
import { buildSyringeScale, getSyringePresentation } from "./syringe-visual.mjs";

const warningCopy = {
  CAPACITY_EXCEEDED: "O volume calculado ultrapassa a capacidade da seringa selecionada. Revise os dados e confirme com um profissional habilitado.",
  BELOW_ONE_UNIT: "O resultado é menor que 1 unidade U-100 e pode não ser mensurável nesta seringa.",
  FRACTIONAL_UNIT: "O resultado possui fração de unidade. Não estime entre marcações que não existam fisicamente na seringa.",
  DOSE_EXCEEDS_VIAL: "A dose informada ultrapassa o conteúdo de um frasco. Revise os dados antes de continuar.",
};

const byId = (id) => document.getElementById(id);
const form = byId("calculatorForm");
const resultCard = byId("resultCard");
const errorPanel = byId("errorPanel");
const warningPanel = byId("warningPanel");
let installPrompt = null;

function selectedCapacity() {
  return Number(document.querySelector('input[name="syringeCapacity"]:checked').value);
}

function updateConversion() {
  const dose = parseLocaleNumber(byId("doseValue").value);
  const unit = byId("doseUnit").value;
  byId("doseInputSuffix").textContent = unit.toUpperCase();
  byId("conversion").textContent = Number.isFinite(dose)
    ? `Conversão automática: ${formatNumber(dose, 4)} ${unit} = ${formatNumber(unit === "mcg" ? dose / 1000 : dose * 1000, 4)} ${unit === "mcg" ? "mg" : "mcg"}`
    : "Digite uma dose válida para ver a conversão.";
}

function updateFrequencyLabel() {
  byId("frequencyLabel").textContent = byId("frequencyMode").value === "perDay"
    ? "Doses por dia"
    : "Intervalo em dias";
}

function updateSegmentedControl() {
  document.querySelectorAll('.segmented-control label').forEach((label) => {
    label.classList.toggle("selected", label.querySelector("input").checked);
  });
  renderSyringeScale(selectedCapacity());
}

function renderSyringeScale(capacity) {
  const scale = byId("syringeScale");
  const ticks = buildSyringeScale(capacity).map((tick) => {
    const element = document.createElement("i");
    element.className = `scale-tick ${tick.kind}`;
    element.style.left = `${tick.percent}%`;
    if (tick.label !== null) {
      const label = document.createElement("span");
      label.textContent = tick.label;
      element.append(label);
    }
    return element;
  });
  scale.replaceChildren(...ticks);
  byId("syringeScaleTitle").textContent = `ESCALA ${capacity} UI // ${formatNumber(capacity / 100, 1)} ML`;
  byId("syringeCapacityText").textContent = `CAP. ${capacity} UI`;
}

function appendListItems(list, values) {
  list.replaceChildren(...values.map((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    return item;
  }));
}

function renderResult(data, capacity) {
  const presentation = getSyringePresentation(data.syringeUnits, capacity);
  renderSyringeScale(capacity);
  byId("syringeUnitsResult").textContent = `${formatPositiveMeasurement(data.syringeUnits)} unidades U-100`;
  byId("volumeResult").textContent = `${formatPositiveMeasurement(data.volumeMl)} mL`;
  byId("syringeFill").style.width = `${presentation.fillPercent}%`;
  byId("syringeMarker").style.left = `${presentation.markerPercent}%`;
  byId("syringeMarkerLabel").textContent = `${formatPositiveMeasurement(data.syringeUnits)} UI`;
  byId("syringeDigitalReadout").textContent = `${formatNumber(data.syringeUnits, 2)} UI`;
  byId("syringeFigure").classList.toggle("is-overflow", presentation.overflow);
  byId("syringeFigure").setAttribute("aria-label", `Seringa U-100 preenchida aproximadamente em ${formatPositiveMeasurement(data.syringeUnits)} de ${capacity} unidades`);
  byId("syringeCaption").textContent = presentation.overflow
    ? `O resultado ultrapassa a capacidade de ${capacity} UI. Não tente representar o excesso nesta seringa.`
    : "Cada marca pequena representa 1 UI. Confirme a escala física da sua seringa.";
  byId("doseMgResult").textContent = `${formatNumber(data.doseMg, 4)} mg`;
  byId("doseMcgResult").textContent = `${formatNumber(data.doseMcg, 2)} mcg`;
  byId("concentrationMgResult").textContent = `${formatNumber(data.concentrationMgMl, 4)} mg/mL`;
  byId("concentrationMcgResult").textContent = `${formatNumber(data.concentrationMcgMl, 2)} mcg/mL`;
  byId("dosesPerVialResult").textContent = `${formatNumber(data.completeDosesPerVial)} por frasco`;
  byId("totalDosesResult").textContent = `${formatNumber(data.totalCompleteDoses)} no total`;
  byId("remainderPerVialMgResult").textContent = `${formatNumber(data.remainderPerVialMg, 4)} mg por frasco`;
  byId("remainderPerVialMcgResult").textContent = `${formatNumber(data.remainderPerVialMg * 1000, 2)} mcg por frasco`;
  byId("totalRemainderMgResult").textContent = `${formatNumber(data.totalRemainderMg, 4)} mg`;
  byId("totalRemainderMcgResult").textContent = `${formatNumber(data.totalRemainderMg * 1000, 2)} mcg`;
  byId("durationResult").textContent = data.duration.mode === "perDay"
    ? `${formatNumber(data.duration.days, 2)} dias, na frequência informada.`
    : `${formatNumber(data.duration.coverageDays, 2)} dias de cobertura; última dose no dia ${formatNumber(data.duration.lastDoseDay)}.`;

  const warnings = data.warnings.map((warning) => warningCopy[warning]);
  appendListItems(byId("warningList"), warnings);
  warningPanel.hidden = warnings.length === 0;
  errorPanel.hidden = true;
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const frequencyMode = byId("frequencyMode").value;
  const frequencyValue = parseLocaleNumber(byId("frequencyValue").value);
  const outcome = calculatePeptide({
    vialMg: parseLocaleNumber(byId("vialMg").value),
    vialCount: parseLocaleNumber(byId("vialCount").value),
    waterMl: parseLocaleNumber(byId("waterMl").value),
    doseValue: parseLocaleNumber(byId("doseValue").value),
    doseUnit: byId("doseUnit").value,
    syringeCapacity: selectedCapacity(),
    frequency: frequencyMode === "perDay"
      ? { mode: "perDay", dosesPerDay: frequencyValue }
      : { mode: "interval", intervalDays: frequencyValue },
  });

  if (outcome.ok) {
    renderResult(outcome.data, selectedCapacity());
  } else {
    appendListItems(byId("errorList"), outcome.errors);
    resultCard.hidden = true;
    errorPanel.hidden = false;
    errorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

byId("clearButton").addEventListener("click", () => {
  for (const id of ["vialMg", "vialCount", "waterMl", "doseValue", "frequencyValue"]) byId(id).value = "";
  resultCard.hidden = true;
  errorPanel.hidden = true;
  updateConversion();
  byId("vialMg").focus();
});

byId("doseValue").addEventListener("input", updateConversion);
byId("doseUnit").addEventListener("change", updateConversion);
byId("frequencyMode").addEventListener("change", updateFrequencyLabel);
document.querySelectorAll('input[name="syringeCapacity"]').forEach((input) => input.addEventListener("change", updateSegmentedControl));

function shareText() {
  return `Rafão Calculadora de Peptídeos: ${window.location.href}`;
}

byId("shareButton").addEventListener("click", async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, text: "Use a Rafão Calculadora de Peptídeos", url: window.location.href });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener,noreferrer");
});

byId("whatsAppButton").addEventListener("click", () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener,noreferrer");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  byId("installButton").hidden = false;
});

byId("installButton").addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  byId("installButton").hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  byId("installButton").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

updateConversion();
updateFrequencyLabel();
updateSegmentedControl();
