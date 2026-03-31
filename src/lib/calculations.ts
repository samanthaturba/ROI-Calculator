import type {
  ServiceSelection,
  BudgetInputs,
  CalculationResult,
  ServiceResult,
  CplChoice,
  IndustryBenchmark,
} from "./types";

function getCplForService(
  service: ServiceSelection
): number | null {
  if (service.cplChoice === "custom") {
    return service.customCpl;
  }

  const benchmark = service.benchmark;
  if (!benchmark) return service.customCpl;

  const map: Record<Exclude<CplChoice, "custom">, number | null> = {
    low: benchmark.cplLow,
    mid: benchmark.cplMid,
    high: benchmark.cplHigh,
  };

  return map[service.cplChoice];
}

function getJobValueForService(
  service: ServiceSelection
): number | null {
  if (service.customJobValue !== null) return service.customJobValue;
  return service.benchmark?.avgJobValue ?? null;
}

export function validate(
  services: ServiceSelection[],
  budget: BudgetInputs
): string[] {
  const warnings: string[] = [];

  if (budget.monthlyAdSpend < 0) {
    warnings.push("Ad spend cannot be negative.");
  }
  if (budget.closeRate < 0) {
    warnings.push("Close rate cannot be negative.");
  }
  if (budget.closeRate > 100) {
    warnings.push("Close rate exceeds 100% — please verify.");
  }

  const selected = services.filter((s) => s.selected);
  if (selected.length === 0) {
    warnings.push("No services selected.");
  }

  const totalAllocation = selected.reduce(
    (sum, s) => sum + s.allocationPercent,
    0
  );
  if (selected.length > 0 && Math.abs(totalAllocation - 100) > 0.5) {
    warnings.push(
      `Service allocation totals ${totalAllocation.toFixed(1)}% — should be 100%.`
    );
  }

  for (const s of selected) {
    const cpl = getCplForService(s);
    if (cpl === null || cpl <= 0) {
      warnings.push(`"${s.serviceName}" is missing a valid cost per lead.`);
    }
    const jv = getJobValueForService(s);
    if (jv === null || jv <= 0) {
      warnings.push(`"${s.serviceName}" is missing a valid average job value.`);
    }
  }

  return warnings;
}

export function checkSpendWarning(
  monthlyAdSpend: number,
  recommendedMin: number | null
): string | null {
  if (recommendedMin !== null && monthlyAdSpend > 0 && monthlyAdSpend < recommendedMin) {
    return `Ad spend ($${monthlyAdSpend}) is below the recommended minimum ($${recommendedMin}) for this industry.`;
  }
  return null;
}

export function calculate(
  services: ServiceSelection[],
  budget: BudgetInputs
): CalculationResult {
  const warnings = validate(services, budget);
  const selected = services.filter((s) => s.selected);
  const closeRateDecimal = Math.max(0, Math.min(budget.closeRate, 100)) / 100;

  const serviceResults: ServiceResult[] = [];
  let hasCustomEstimates = false;
  let hasLowConfidence = false;

  for (const service of selected) {
    const cpl = getCplForService(service);
    const jobValue = getJobValueForService(service);

    if (!cpl || cpl <= 0 || !jobValue || jobValue <= 0) continue;

    const allocatedSpend =
      budget.monthlyAdSpend * (service.allocationPercent / 100);
    const leads = allocatedSpend / cpl;
    const jobs = leads * closeRateDecimal;
    const jobsRounded = Math.floor(jobs);
    const revenue = jobs * jobValue;
    const revenueRounded = jobsRounded * jobValue;

    const isCustom = service.isManual || service.cplChoice === "custom" || service.customJobValue !== null;
    if (isCustom) hasCustomEstimates = true;

    const confidence =
      isCustom
        ? ("custom" as const)
        : service.benchmark?.confidence ?? ("custom" as const);
    if (confidence === "low") hasLowConfidence = true;

    serviceResults.push({
      serviceName: service.serviceName,
      allocatedSpend,
      cplUsed: cpl,
      leads,
      jobs,
      jobsRounded,
      revenue,
      revenueRounded,
      jobValue,
      isCustomEstimate: isCustom,
      confidence,
    });
  }

  const totalLeads = serviceResults.reduce((s, r) => s + r.leads, 0);
  const totalJobs = serviceResults.reduce((s, r) => s + r.jobs, 0);
  const totalJobsRounded = serviceResults.reduce((s, r) => s + r.jobsRounded, 0);
  const totalRevenue = serviceResults.reduce((s, r) => s + r.revenue, 0);
  const totalRevenueRounded = serviceResults.reduce(
    (s, r) => s + r.revenueRounded,
    0
  );

  const totalSpendUsed = serviceResults.reduce(
    (s, r) => s + r.allocatedSpend,
    0
  );
  const weightedAvgCpl =
    totalLeads > 0 ? totalSpendUsed / totalLeads : 0;

  const grossProfit =
    budget.grossMarginPercent !== null
      ? totalRevenue * (budget.grossMarginPercent / 100)
      : null;
  const grossProfitRounded =
    budget.grossMarginPercent !== null
      ? totalRevenueRounded * (budget.grossMarginPercent / 100)
      : null;

  return {
    totalSpend: budget.monthlyAdSpend,
    weightedAvgCpl,
    totalLeads,
    totalJobs,
    totalJobsRounded,
    totalRevenue,
    totalRevenueRounded,
    grossProfit,
    grossProfitRounded,
    closeRate: budget.closeRate,
    serviceResults,
    hasCustomEstimates,
    hasLowConfidence,
    warnings,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function generateClientSummary(
  clientName: string,
  result: CalculationResult,
  roundingMode: "exact" | "conservative"
): string {
  const jobs = roundingMode === "conservative" ? result.totalJobsRounded : result.totalJobs;
  const revenue = roundingMode === "conservative" ? result.totalRevenueRounded : result.totalRevenue;

  return `With a Google Ads investment of ${formatCurrency(result.totalSpend)}/month, an estimated average cost per lead of ${formatCurrency(Math.round(result.weightedAvgCpl))}, and a ${result.closeRate}% close rate, ${clientName || "this client"} could generate approximately ${formatNumber(result.totalLeads)} leads per month, ${roundingMode === "conservative" ? jobs : formatNumber(jobs)} jobs per month, and about ${formatCurrency(revenue)}/month in new revenue potential depending on service mix and job values.`;
}

export function generateInternalSummary(
  clientName: string,
  industryName: string,
  services: ServiceSelection[],
  result: CalculationResult,
  roundingMode: "exact" | "conservative"
): string {
  const selected = services.filter((s) => s.selected);
  const jobs = roundingMode === "conservative" ? result.totalJobsRounded : result.totalJobs;
  const revenue = roundingMode === "conservative" ? result.totalRevenueRounded : result.totalRevenue;

  let text = `Client: ${clientName || "—"}\n`;
  text += `Industry: ${industryName}\n`;
  text += `Services selected: ${selected.map((s) => s.serviceName).join(", ")}\n`;
  text += `Spend: ${formatCurrency(result.totalSpend)}/month\n`;
  text += `CPL used: ${formatCurrency(Math.round(result.weightedAvgCpl))} (weighted avg)\n`;
  text += `Close rate: ${result.closeRate}%\n`;
  text += `Estimated leads: ${formatNumber(result.totalLeads)}\n`;
  text += `Estimated jobs: ${roundingMode === "conservative" ? jobs : formatNumber(jobs)}\n`;
  text += `Estimated monthly revenue: ${formatCurrency(revenue)}\n`;
  if (result.grossProfit !== null) {
    const gp = roundingMode === "conservative" ? result.grossProfitRounded! : result.grossProfit;
    text += `Estimated gross profit: ${formatCurrency(gp)}\n`;
  }

  if (result.serviceResults.length > 1) {
    text += `\nPer-service breakdown:\n`;
    for (const sr of result.serviceResults) {
      const srJobs = roundingMode === "conservative" ? sr.jobsRounded : sr.jobs;
      const srRev = roundingMode === "conservative" ? sr.revenueRounded : sr.revenue;
      text += `  ${sr.serviceName}: ${formatCurrency(sr.allocatedSpend)} spend → ${formatNumber(sr.leads)} leads → ${roundingMode === "conservative" ? srJobs : formatNumber(srJobs)} jobs → ${formatCurrency(srRev)} revenue\n`;
    }
  }

  if (result.hasCustomEstimates) {
    text += `\n⚠ Note: Some values are custom estimates based on user-entered values.\n`;
  }
  if (result.hasLowConfidence) {
    text += `⚠ Note: Some benchmarks are low-confidence seed data.\n`;
  }

  return text;
}
