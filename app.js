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
const saveHistoryBtn = document.getElementById("save-history");
const historyListEl = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");
const clearHistoryBtn = document.getElementById("clear-history");

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const rateFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let publishedRate = null;
const historyKey = "rate-compare-history";
const historyLimit = 50;

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(historyKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const saveHistory = (entries) => {
  localStorage.setItem(historyKey, JSON.stringify(entries));
};

const renderHistory = () => {
  const entries = loadHistory();
  historyListEl.innerHTML = "";
  historyEmptyEl.style.display = entries.length ? "none" : "block";

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const header = document.createElement("div");
    header.className = "history-row";
    header.innerHTML = `<strong>${entry.krw.toLocaleString()} KRW</strong><span>$${entry.usd.toFixed(2)}</span>`;

    const rateRow = document.createElement("div");
    rateRow.className = "history-row";
    rateRow.innerHTML = `<span>Effective</span><span>${rateFormatter.format(entry.effectiveRate)} KRW/$</span>`;

    const publishedRow = document.createElement("div");
    publishedRow.className = "history-row";
    publishedRow.innerHTML = `<span>Published</span><span>${rateFormatter.format(entry.publishedRate)} KRW/$</span>`;

    const diffRow = document.createElement("div");
    diffRow.className = "history-row";
    diffRow.innerHTML = `<span>${entry.deltaPct >= 0 ? "Lost" : "Gained"} in exchange</span><span>${Math.abs(entry.deltaPct).toFixed(2)}%</span>`;

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${entry.timestamp} · Rate as of ${entry.rateDate}`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-entry";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.id = entry.id;

    item.append(header, rateRow, publishedRow, diffRow, meta, deleteButton);
    historyListEl.append(item);
  });
};

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
    impactCaptionEl.textContent = "";
    return;
  }

  if (!krw || !usd || krw <= 0 || usd <= 0) {
    effectiveRateEl.textContent = "--";
    deltaRateEl.textContent = "--";
    deltaCaptionEl.textContent = "Waiting for both inputs...";
    impactEl.textContent = "--";
    impactCaptionEl.textContent = "";
    return;
  }

  const effectiveRate = krw / usd;
  const deltaPct = ((publishedRate - effectiveRate) / publishedRate) * 100;
  const impliedUsd = krw / publishedRate;
  const extraUsd = usd - impliedUsd;

  effectiveRateEl.textContent = rateFormatter.format(effectiveRate);

  const deltaLabel = `${Math.abs(deltaPct).toFixed(2)}%`;
  deltaRateEl.textContent = deltaLabel;
  deltaCaptionEl.textContent = deltaPct >= 0
    ? "Lost in exchange"
    : "Gained in exchange";

  impactEl.textContent = `${Math.abs(extraUsd).toFixed(2)} USD`;
  impactCaptionEl.textContent = deltaPct >= 0
    ? "Lost in exchange"
    : "Gained in exchange";

  lastComputedSnapshot = {
    krw,
    usd,
    effectiveRate,
    publishedRate,
    deltaPct,
    rateDate: publishedMetaEl.textContent.replace("As of ", "").trim()
  };
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

let lastComputedSnapshot = null;

const saveHistoryEntry = ({ krw, usd, effectiveRate, publishedRate, deltaPct, rateDate }) => {
  if (!krw || !usd || !publishedRate) return;

  const entry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleString(),
    rateDate,
    krw,
    usd,
    effectiveRate,
    publishedRate,
    deltaPct
  };

  const entries = loadHistory();
  entries.unshift(entry);
  if (entries.length > historyLimit) {
    entries.length = historyLimit;
  }
  saveHistory(entries);
  renderHistory();
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

saveHistoryBtn.addEventListener("click", () => {
  if (!lastComputedSnapshot) return;
  saveHistoryEntry(lastComputedSnapshot);
});

historyListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (!target.classList.contains("delete-entry")) return;

  const id = target.dataset.id;
  const entries = loadHistory().filter((entry) => entry.id !== id);
  saveHistory(entries);
  renderHistory();
});

clearHistoryBtn.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

updatePublishedRate();
renderHistory();


