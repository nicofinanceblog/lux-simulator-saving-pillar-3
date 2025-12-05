// script.js

(function () {
  // Final tax on profit at the end of the simulation
  const TAX_RATE_A = 0.2; // 20% tax on profit for Scenario Pillar 3
  const TAX_RATE_B = 0.0; // 0% tax on profit for Scenario Brokerage Account with ETF

  // Global inputs
  const performanceInput = document.getElementById("performance");
  const depositInput = document.getElementById("deposit");
  const taxCeilingInput = document.getElementById("taxCeiling");
  const yearsInput = document.getElementById("years");

  // Scenario-specific inputs
  const entryFeeAInput = document.getElementById("entryFeeA");
  const mgmtFeeAInput = document.getElementById("mgmtFeeA");
  const taxRateAInput = document.getElementById("taxRateA");
  const taxSavingModeASelect = document.getElementById("taxSavingModeA");

  const entryFeeBInput = document.getElementById("entryFeeB");
  const mgmtFeeBInput = document.getElementById("mgmtFeeB");

  // Scenario Pillar 3 summary
  const totalContribAEl = document.getElementById("total-contrib-a");
  const capitalBeforeTaxAEl = document.getElementById("capital-before-tax-a");
  const profitBeforeTaxAEl = document.getElementById("profit-before-tax-a");
  const capitalAfterTaxAEl = document.getElementById("capital-after-tax-a");

  // Scenario Pillar 3 tax summary
  const taxTotalContribAEl = document.getElementById("tax-total-contrib-a");
  const taxProfitAEl = document.getElementById("tax-profit-a");
  const taxFinalCapitalAEl = document.getElementById("tax-final-capital-a");
  const taxAmountAEl = document.getElementById("tax-amount-a");
  const taxCapitalAfterAEl = document.getElementById("tax-capital-after-a");
  const taxFeesAEl = document.getElementById("tax-fees-a");
  const taxSavingAEl = document.getElementById("tax-savings-a");
  const taxCapitalAfterSavingAEl = document.getElementById("tax-capital-after-saving-a");

  // Scenario Brokerage Account with ETF summary
  const totalContribBEl = document.getElementById("total-contrib-b");
  const capitalBeforeTaxBEl = document.getElementById("capital-before-tax-b");
  const profitBeforeTaxBEl = document.getElementById("profit-before-tax-b");
  const capitalAfterTaxBEl = document.getElementById("capital-after-tax-b");

  // Scenario Brokerage Account with ETF tax summary
  const taxTotalContribBEl = document.getElementById("tax-total-contrib-b");
  const taxProfitBEl = document.getElementById("tax-profit-b");
  const taxFinalCapitalBEl = document.getElementById("tax-final-capital-b");
  const taxAmountBEl = document.getElementById("tax-amount-b");
  const taxCapitalAfterBEl = document.getElementById("tax-capital-after-b");
  const taxFeesBEl = document.getElementById("tax-fees-b");

  // Tables
  const resultsBodyA = document.getElementById("results-body-a");
  const resultsBodyB = document.getElementById("results-body-b");

  // Toggles
  const langToggleBtn = document.getElementById("lang-toggle");
  const themeToggleBtn = document.getElementById("theme-toggle");

  const currencyFormatter = new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
  const currencyFormatterNoDecimals = new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  function parseNumber(input, fallback = 0) {
    const raw = String(input.value).replace(",", ".");
    const value = parseFloat(raw);
    return isNaN(value) ? fallback : value;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Simulate a scenario year-by-year.
   *
   * @param {number} perfPct   Performance % per year
   * @param {number} entryPct  Entry fee % on each contribution
   * @param {number} mgmtPct   Mgmt fee % per year
   * @param {number} contribution  Base yearly contribution (EUR)
   * @param {number} years
   * @param {number} extraTaxRatePct   Extra "Taux d'imposition" (%) on contribution to reinvest (Scenario Pillar 3 only)
   * @param {"reinvest"|"end"|"none"} taxSavingMode  How to handle the tax saving (reinvest, add at end, or ignore)
   * @param {number} taxDeductibleCeiling  Maximum yearly contribution eligible for tax deduction
   * @returns {{rows: Array<{year, startingCapital, grossContribution, netContribution, interest, endingCapital, entryFeePaid, mgmtFeePaid, cumulativeFees}>, taxSavingAtEnd: number}}
  */
  function simulateScenario(
    perfPct,
    entryPct,
    mgmtPct,
    contribution,
    years,
    extraTaxRatePct,
    taxSavingMode = "reinvest",
    taxDeductibleCeiling = Infinity
  ) {
    const perf = perfPct / 100;
    const entry = entryPct / 100;
    const mgmt = mgmtPct / 100;
    const extraTaxRate = extraTaxRatePct / 100;
    const deductibleLimit = Math.max(0, taxDeductibleCeiling);

    const rows = [];

    let startingCapital = 0;
    let taxSavingAtEnd = 0;
    let cumulativeFees = 0;

    for (let year = 1; year <= years; year++) {
      const baseContribution = contribution;
      const deductibleBase = Math.min(baseContribution, deductibleLimit);
      const taxSaving = deductibleBase * extraTaxRate;
      let extraTaxContribution = 0;

      if (taxSavingMode === "reinvest") {
        extraTaxContribution = taxSaving;
      } else if (taxSavingMode === "end") {
        taxSavingAtEnd += taxSaving;
      }

      // Total gross contribution for the year (base + reinvested tax saving)
      const grossContribution = baseContribution + extraTaxContribution;

      // Entry fee applies on the total contribution
      const entryFeePaid = grossContribution * entry;
      const netContribution = grossContribution - entryFeePaid;

      // Management fee is charged on managed assets
      const grossBase = startingCapital + netContribution;
      const mgmtFeePaid = grossBase * mgmt;

      // Interest on starting capital + net contribution before management fee
      const grossInterest = grossBase * perf;
      const interest = grossInterest - mgmtFeePaid;
      const endingCapital = startingCapital + netContribution + interest;

      cumulativeFees += entryFeePaid + mgmtFeePaid;

      rows.push({
        year,
        startingCapital,
        grossContribution,
        netContribution,
        interest,
        endingCapital,
        entryFeePaid,
        mgmtFeePaid,
        cumulativeFees,
      });

      startingCapital = endingCapital;
    }

    return { rows, taxSavingAtEnd };
  }

  /**
   * Fill UI for a scenario and return numeric summary for the chart.
   * totalContributions is the sum of netContribution per year
   */
  function fillScenario(
    rows,
    finalTaxRateOnProfit,
    // summary elements
    totalContribEl,
    capitalBeforeTaxEl,
    profitBeforeTaxEl,
    capitalAfterTaxEl,
    // tax summary elements
    taxTotalContribEl,
    taxProfitEl,
    taxFinalCapitalEl,
    taxAmountEl,
    taxCapitalAfterEl,
    // table body
    tableBodyEl,
    options = {}
  ) {
    const { taxSavingAtEnd = 0, taxSavingEl, taxCapitalAfterSavingEl, feesEl, taxFeesEl } = options;
    tableBodyEl.innerHTML = "";

    if (!rows || rows.length === 0) {
      const zero = currencyFormatter.format(0);
      [
        totalContribEl,
        capitalBeforeTaxEl,
        profitBeforeTaxEl,
        capitalAfterTaxEl,
        taxTotalContribEl,
        taxProfitEl,
        taxFinalCapitalEl,
        taxAmountEl,
        taxCapitalAfterEl,
      ].forEach((el) => (el.textContent = zero));

      if (feesEl) feesEl.textContent = zero;
      if (taxFeesEl) taxFeesEl.textContent = zero;
      if (taxSavingEl) taxSavingEl.textContent = zero;
      if (taxCapitalAfterSavingEl) taxCapitalAfterSavingEl.textContent = zero;

      return {
        totalContributions: 0,
        capitalBeforeTax: 0,
        profit: 0,
        capitalAfterTax: 0,
        capitalAfterTaxIncludingSavings: 0,
        taxSavingAtEnd: 0,
        totalFees: 0,
      };
    }

    const years = rows.length;
    const totalContributions = rows.reduce((sum, r) => sum + r.netContribution, 0);
    const last = rows[rows.length - 1];
    const capitalBeforeTax = last.endingCapital;
    const profit = Math.max(0, capitalBeforeTax - totalContributions);
    const tax = profit * finalTaxRateOnProfit;
    const capitalAfterTax = capitalBeforeTax - tax;
    const capitalAfterTaxIncludingSavings = capitalAfterTax + taxSavingAtEnd;
    const totalFees = last.cumulativeFees || 0;

    // Summary
    totalContribEl.textContent = currencyFormatter.format(totalContributions);
    capitalBeforeTaxEl.textContent = currencyFormatter.format(capitalBeforeTax);
    profitBeforeTaxEl.textContent = currencyFormatter.format(profit);
    const displayCapitalAfter = capitalAfterTaxIncludingSavings;
    capitalAfterTaxEl.textContent = currencyFormatter.format(displayCapitalAfter);
    if (feesEl) feesEl.textContent = currencyFormatter.format(totalFees);

    // Tax summary
    taxTotalContribEl.textContent = currencyFormatter.format(totalContributions);
    taxProfitEl.textContent = currencyFormatter.format(profit);
    taxFinalCapitalEl.textContent = currencyFormatter.format(capitalBeforeTax);
    taxAmountEl.textContent = currencyFormatter.format(tax);
    taxCapitalAfterEl.textContent = currencyFormatter.format(capitalAfterTax);
    if (taxFeesEl) taxFeesEl.textContent = currencyFormatter.format(totalFees);
    if (taxSavingEl) taxSavingEl.textContent = currencyFormatter.format(taxSavingAtEnd);
    if (taxCapitalAfterSavingEl) taxCapitalAfterSavingEl.textContent = currencyFormatter.format(capitalAfterTaxIncludingSavings);

    // Table rows
    for (const row of rows) {
      const tr = document.createElement("tr");

      const yearTd = document.createElement("td");
      yearTd.className = "px-3 py-2 text-slate-200 whitespace-nowrap text-center";
      yearTd.textContent = row.year.toString();

      const startTd = document.createElement("td");
      startTd.className = "px-3 py-2 text-slate-300 whitespace-nowrap text-right";
      startTd.textContent = currencyFormatterNoDecimals.format(row.startingCapital);

      const contribTd = document.createElement("td");
      contribTd.className = "px-3 py-2 text-slate-300 whitespace-nowrap text-right";
      contribTd.textContent = currencyFormatterNoDecimals.format(row.netContribution);

      const interestTd = document.createElement("td");
      interestTd.className = "px-3 py-2 text-slate-300 whitespace-nowrap text-right";
      interestTd.textContent = currencyFormatterNoDecimals.format(row.interest);

      const endTd = document.createElement("td");
      endTd.className = "px-3 py-2 text-slate-300 whitespace-nowrap text-right";
      endTd.textContent = currencyFormatterNoDecimals.format(row.endingCapital);

      const feesTd = document.createElement("td");
      feesTd.className = "px-3 py-2 text-slate-300 whitespace-nowrap text-right";
      feesTd.textContent = currencyFormatterNoDecimals.format(row.cumulativeFees || 0);

      tr.appendChild(yearTd);
      tr.appendChild(startTd);
      tr.appendChild(contribTd);
      tr.appendChild(interestTd);
      tr.appendChild(endTd);
      tr.appendChild(feesTd);

      tableBodyEl.appendChild(tr);
    }

    return {
      totalContributions,
      capitalBeforeTax,
      profit,
      capitalAfterTax,
      capitalAfterTaxIncludingSavings,
      taxSavingAtEnd,
      totalFees,
    };
  }

  // -----------------------
  // Chart.js - comparison bar chart (per year)
  // -----------------------

  let comparisonChart = null;
  let comparisonLineChart = null;
  let currentLang = "en";
  let currentTheme = "dark";

  function getChartTexts() {
    if (currentLang === "fr") {
      return {
        title: "Capital par année (dernière année après impôt le cas échéant)",
        yAxis: "Capital (€)",
        datasetLabel: "Capital",
        labelA: "Scénario Pilier 3",
        labelB: "Scénario Compte-Titre avec ETF",
        labelFeesA: "Frais (Pilier 3)",
        labelFeesB: "Frais (Compte-Titre)",
      };
    }
    return {
      title: "Capital by year (final year after tax when applicable)",
      yAxis: "Capital (€)",
      datasetLabel: "Capital",
      labelA: "Scenario Pillar 3",
      labelB: "Scenario Brokerage Account with ETF",
      labelFeesA: "Fees paid (Pillar 3)",
      labelFeesB: "Fees paid (Brokerage)",
    };
  }

  function initChart() {
    const canvas = document.getElementById("comparison-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const texts = getChartTexts();

    comparisonChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [], // years
        datasets: [
          {
            label: texts.labelA,
            data: [],
            stack: "scenario-a",
            backgroundColor: "rgba(153, 27, 27, 0.7)", // Pillar 3
            borderColor: "rgb(153, 27, 27)",
            borderWidth: 1,
          },
          {
            label: texts.labelFeesA,
            data: [],
            stack: "scenario-a",
            backgroundColor: "rgba(248, 113, 113, 0.55)",
            borderColor: "rgba(248, 113, 113, 0.9)",
            borderWidth: 1,
            hidden: true,
          },
          {
            label: texts.labelB,
            data: [],
            stack: "scenario-b",
            backgroundColor: "rgba(30, 144, 255, 0.7)", // Brokerage/ETF
            borderColor: "rgb(30, 144, 255)",
            borderWidth: 1,
          },
          {
            label: texts.labelFeesB,
            data: [],
            stack: "scenario-b",
            backgroundColor: "rgba(96, 165, 250, 0.55)",
            borderColor: "rgba(59, 130, 246, 0.9)",
            borderWidth: 1,
            hidden: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: texts.title,
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            beginAtZero: true,
            stacked: true,
            title: {
              display: true,
              text: texts.yAxis,
            },
          },
        },
      },
    });
  }

  function initLineChart() {
    const canvas = document.getElementById("comparison-line-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const texts = getChartTexts();

    comparisonLineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: texts.labelA,
            data: [],
            backgroundColor: "rgba(153, 27, 27, 0.15)",
            borderColor: "rgb(153, 27, 27)",
            borderWidth: 2,
            tension: 0.25,
            fill: false,
          },
          {
            label: texts.labelB,
            data: [],
            backgroundColor: "rgba(30, 144, 255, 0.15)",
            borderColor: "rgb(30, 144, 255)",
            borderWidth: 2,
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: texts.title,
          },
        },
        scales: {
          x: {
            stacked: false,
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: texts.yAxis,
            },
          },
        },
      },
    });
  }

  function updateChart(yearLabels, dataA, dataB, feesA, feesB) {
    if (!comparisonChart) return;
    const texts = getChartTexts();

    comparisonChart.data.labels = yearLabels;
    comparisonChart.data.datasets[0].label = texts.labelA;
    comparisonChart.data.datasets[1].label = texts.labelFeesA;
    comparisonChart.data.datasets[2].label = texts.labelB;
    comparisonChart.data.datasets[3].label = texts.labelFeesB;
    comparisonChart.data.datasets[0].data = dataA;
    comparisonChart.data.datasets[1].data = feesA;
    comparisonChart.data.datasets[2].data = dataB;
    comparisonChart.data.datasets[3].data = feesB;

    comparisonChart.options.plugins.title.text = texts.title;
    comparisonChart.options.scales.y.title.text = texts.yAxis;

    comparisonChart.update();

    if (comparisonLineChart) {
      comparisonLineChart.data.labels = yearLabels;
      comparisonLineChart.data.datasets[0].label = texts.labelA;
      comparisonLineChart.data.datasets[1].label = texts.labelB;
      comparisonLineChart.data.datasets[0].data = dataA;
      comparisonLineChart.data.datasets[1].data = dataB;
      comparisonLineChart.options.plugins.title.text = texts.title;
      comparisonLineChart.options.scales.y.title.text = texts.yAxis;
      comparisonLineChart.update();
    }
  }

  // -----------------------
  // Simulation update
  // -----------------------

  function update() {
    const perf = parseNumber(performanceInput, 0);
    const contribution = parseNumber(depositInput, 0);
    const taxDeductibleCeiling = parseNumber(taxCeilingInput, Infinity);

    let years = parseInt(yearsInput.value, 10);
    if (isNaN(years)) years = 1;
    years = clamp(years, 1, 60);
    yearsInput.value = years.toString();

    const entryFeeA = parseNumber(entryFeeAInput, 0);
    const mgmtFeeA = parseNumber(mgmtFeeAInput, 0);
    const taxRateAOnContribution = parseNumber(taxRateAInput, 0);
    const taxSavingModeA = taxSavingModeASelect.value || "reinvest";

    const entryFeeB = parseNumber(entryFeeBInput, 0);
    const mgmtFeeB = parseNumber(mgmtFeeBInput, 0);

    // Simulate Scenario Pillar 3 (with optional reinvestment of tax savings)
    const { rows: rowsA, taxSavingAtEnd: taxSavingAAtEnd } = simulateScenario(
      perf,
      entryFeeA,
      mgmtFeeA,
      contribution,
      years,
      taxRateAOnContribution,
      taxSavingModeA,
      taxDeductibleCeiling
    );

    // Simulate Scenario Compte Tître ETF (no reinvested tax savings)
    const { rows: rowsB } = simulateScenario(perf, entryFeeB, mgmtFeeB, contribution, years, 0, "none");

    // Fill Scenario Pillar 3
    const summaryA = fillScenario(
      rowsA,
      TAX_RATE_A,
      totalContribAEl,
      capitalBeforeTaxAEl,
      profitBeforeTaxAEl,
      capitalAfterTaxAEl,
      taxTotalContribAEl,
      taxProfitAEl,
      taxFinalCapitalAEl,
      taxAmountAEl,
      taxCapitalAfterAEl,
      resultsBodyA,
      {
        taxSavingAtEnd: taxSavingAAtEnd,
        taxFeesEl: taxFeesAEl,
        taxSavingEl: taxSavingAEl,
        taxCapitalAfterSavingEl: taxCapitalAfterSavingAEl,
      }
    );

    // Fill Scenario Compte Tître ETF
    const summaryB = fillScenario(
      rowsB,
      TAX_RATE_B,
      totalContribBEl,
      capitalBeforeTaxBEl,
      profitBeforeTaxBEl,
      capitalAfterTaxBEl,
      taxTotalContribBEl,
      taxProfitBEl,
      taxFinalCapitalBEl,
      taxAmountBEl,
      taxCapitalAfterBEl,
      resultsBodyB,
      {
        taxFeesEl: taxFeesBEl,
      }
    );

    // Build per-year data for the chart
    const yearLabels = rowsA.map((r) => r.year);

    // Scenario Pillar 3: final year after tax, other years = ending capital
    const dataA = rowsA.map((r, idx) =>
      idx === rowsA.length - 1 ? summaryA.capitalAfterTaxIncludingSavings : r.endingCapital
    );

    // Scenario Compte Tître ETF: always ending capital (no tax)
    const dataB = rowsB.map((r) => r.endingCapital);

    // Fees stacked on top of each scenario
    const feesAData = rowsA.map((r) => r.cumulativeFees || 0);
    const feesBData = rowsB.map((r) => r.cumulativeFees || 0);

    // Use the final after-tax + savings value for the last data point of Scenario A
    const lastYearIdx = Math.max(0, rowsA.length - 1);
    const dataAForChart = rowsA.map((r, idx) =>
      idx === lastYearIdx ? summaryA.capitalAfterTaxIncludingSavings : r.endingCapital
    );

    // Update chart with per-year series
    updateChart(yearLabels, dataAForChart, dataB, feesAData, feesBData);
  }

  // -----------------------
  // i18n (English / French)
  // -----------------------

  const translations = window.translations || {};

  // -----------------------
  // Language & theme
  // -----------------------

  function applyLanguage(lang) {
    const dict = translations[lang];
    if (!dict) return;

    Object.entries(dict).forEach(([id, text]) => {
      // This finds ALL elements with that exact id
      document.querySelectorAll(`#${id}`).forEach((el) => {
        el.textContent = text;
      });
    });

    currentLang = lang;

    // Show the flag of the OTHER language (the one you can switch to)
    if (lang === "en") {
      // Page is in English → show French flag to switch to French
      langToggleBtn.textContent = "🇫🇷";
      langToggleBtn.title = "Passer en français";
    } else {
      // Page is in French → show UK flag to switch to English
      langToggleBtn.textContent = "🇬🇧";
      langToggleBtn.title = "Switch to English";
    }

    // Re-run simulation so chart texts also update
    update();
  }

  function applyTheme(theme) {
    const body = document.body;
    body.classList.remove("theme-dark", "theme-light");
    body.classList.add(`theme-${theme}`);
    currentTheme = theme;
    if (theme === "dark") {
      themeToggleBtn.textContent = "🌙";
      themeToggleBtn.title = "Passer en thème clair";
    } else {
      themeToggleBtn.textContent = "☀️";
      themeToggleBtn.title = "Switch to dark theme";
    }
  }

  // Attach listeners to inputs (simulation) + Enter key
  [
    performanceInput,
    depositInput,
    taxCeilingInput,
    yearsInput,
    entryFeeAInput,
    mgmtFeeAInput,
    taxSavingModeASelect,
    taxRateAInput,
    entryFeeBInput,
    mgmtFeeBInput,
  ].forEach((el) => {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        update();
      }
    });
  });

  // Language toggle
  langToggleBtn.addEventListener("click", () => {
    const nextLang = currentLang === "en" ? "fr" : "en";
    applyLanguage(nextLang);
  });

  // Theme toggle
  themeToggleBtn.addEventListener("click", () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  function syncTaxRateEnabled() {
    taxRateAInput.disabled = taxSavingModeASelect.value === "none";
  }

  syncTaxRateEnabled();

  taxSavingModeASelect.addEventListener("change", () => {
    syncTaxRateEnabled();
    update();
  });

  // Initial setup: French + light theme
  applyTheme("light");
  applyLanguage("fr");
  initChart();
  initLineChart();
  update();
})();
