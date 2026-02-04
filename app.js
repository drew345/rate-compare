const apiUrl = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW";

const publishedRateEl = document.getElementById("published-rate");
const publishedMetaEl = document.getElementById("published-meta");
const krwInput = document.getElementById("krw");
const usdInput = document.getElementById("usd");
const effectiveRateEl = document.getElementById("effective-rate");
const deltaRateEl = document.getElementById("delta-rate");
const deltaCaptionEl = document.getElementById("delta-caption");
const impactEl = document.getElementById("impact");
const impactCaptionEl = document.getElementById("impact-caption");
const refreshBtn = document.getElementById("refresh");

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const rateFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let publishedRate = null;

const parseNumber = (value) => {
  if (!value) return null;
  const clean = value.toString().replace(/,/g, "");
  const parsed = Number.parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : null;
};

const updateOutputs = () => {
  const krw = parseNumber(krwInput.value);
  const usd = parseNumber(usdInput.value);

  if (!publishedRate) {
    effectiveRateEl.textContent = "--";
    deltaRateEl.textContent = "--";
    deltaCaptionEl.textContent = "Waiting for published rate...";
    impactEl.textContent = "--";
    return;
  }

  if (!krw || !usd || krw <= 0 || usd <= 0) {
    effectiveRateEl.textContent = "--";
    deltaRateEl.textContent = "--";
    deltaCaptionEl.textContent = "Waiting for both inputs...";
    impactEl.textContent = "--";
    return;
  }

  const effectiveRate = krw / usd;
  const deltaPct = ((publishedRate - effectiveRate) / publishedRate) * 100;
  const impliedUsd = krw / publishedRate;
  const extraUsd = usd - impliedUsd;

  effectiveRateEl.textContent = rateFormatter.format(effectiveRate);

  const deltaLabel = `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%`;
  deltaRateEl.textContent = deltaLabel;
  deltaCaptionEl.textContent = deltaPct >= 0
    ? "Lost in exchange"
    : "Gained in exchange";

  impactEl.textContent = `${deltaPct >= 0 ? "+" : ""}${formatter.format(extraUsd)} USD`;
};

const updatePublishedRate = async () => {
  publishedRateEl.textContent = "--";
  publishedMetaEl.textContent = "Fetching latest rate...";

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch rate");
    }
    const data = await response.json();
    const rate = data?.rates?.KRW;
    if (!rate) {
      throw new Error("Rate missing");
    }

    publishedRate = rate;
    publishedRateEl.textContent = rateFormatter.format(rate);
    publishedMetaEl.textContent = `As of ${data.date}`;
  } catch (error) {
    publishedRateEl.textContent = "Unavailable";
    publishedMetaEl.textContent = "Check your connection and try again.";
    publishedRate = null;
  }

  updateOutputs();
};

const setupInputBlur = (input, nextInput) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (nextInput) {
        nextInput.focus();
      } else {
        input.blur();
      }
    }
  });

  input.addEventListener("change", () => {
    if (document.activeElement === input) {
      input.blur();
    }
  });
};

setupInputBlur(krwInput, usdInput);
setupInputBlur(usdInput, null);

[krwInput, usdInput].forEach((input) => {
  input.addEventListener("input", updateOutputs);
});

refreshBtn.addEventListener("click", updatePublishedRate);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

updatePublishedRate();


