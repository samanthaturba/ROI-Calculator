import PptxGenJS from "pptxgenjs";
import type { CalculationResult, ServiceSelection, RoundingMode, AdPlatform } from "./types";
import type { TargetAreaEntry } from "../app/page";

// Cogent brand colors (no # prefix for pptxgenjs)
const COGENT_NAVY = "002B49";
const COGENT_SAGE = "BCC26A";
const COGENT_SAGE_DARK = "8B8F3E";
const WHITE = "FFFFFF";
const BLACK = "000000";
const LIGHT_GRAY = "F5F5F5";
const MED_GRAY = "D9D9D9";
const DARK_GRAY = "333333";
const DISCLAIMER_BG = "FFF8F0";

const PLATFORM_LABELS: Record<AdPlatform, string> = {
  google: "Google",
  meta: "Meta (Facebook/Instagram)",
  linkedin: "LinkedIn",
};

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

interface PowerPointData {
  clientName: string;
  industryName: string;
  platform: AdPlatform;
  result: CalculationResult;
  services: ServiceSelection[];
  roundingMode: RoundingMode;
  targetAreas: TargetAreaEntry[];
  monthlyAdSpend: number;
  closeRate: number;
  grossMarginPercent: number | null;
  blendedMultiplier: number;
  cogentLogoBase64: string;
  clientLogoBase64?: string;
  clientWebsiteUrl?: string;
}

export async function generatePowerPoint(data: PowerPointData): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Cogent Analytics";
  pres.title = `ROAS Report — ${data.clientName || "Client"}`;

  const selectedServices = data.services.filter((s) => s.selected);
  const isConservative = data.roundingMode === "conservative";
  const platformLabel = PLATFORM_LABELS[data.platform];
  const areasWithTier = data.targetAreas.filter((a) => a.tier);

  // CPC and ROAS calculations
  const avgCpc = data.result.weightedAvgCpl * 0.15;
  const cpcMultiplier = data.platform === "google" ? 1.0 : data.platform === "meta" ? 0.6 : 2.5;
  const estimatedCpc = avgCpc * cpcMultiplier;
  const revenue = isConservative ? data.result.totalRevenueRounded : data.result.totalRevenue;
  const roas = data.result.totalSpend > 0 ? revenue / data.result.totalSpend : 0;

  // ========================
  // SLIDE 1: ROAS/ROI Data
  // ========================
  const slide1 = pres.addSlide();
  slide1.background = { color: WHITE };

  // -- Header bar --
  slide1.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 10, h: 1.1,
    fill: { color: WHITE },
  });

  // Client logo (top-left) or placeholder
  if (data.clientLogoBase64) {
    slide1.addImage({
      data: data.clientLogoBase64,
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      sizing: { type: "contain", w: 1.5, h: 0.8 },
    });
  } else {
    slide1.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fill: { color: LIGHT_GRAY },
      line: { color: MED_GRAY, width: 1 },
    });
    slide1.addText("Add Client\nLogo Here", {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fontSize: 8, color: "999999",
      align: "center", valign: "middle",
      fontFace: "Arial",
    });
  }

  // Title
  slide1.addText(`Potential ROAS/ROI from\n${platformLabel} Advertising Strategy`, {
    x: 2.0, y: 0.1, w: 5.5, h: 0.95,
    fontSize: 22, fontFace: "Georgia",
    color: BLACK, bold: true, align: "center", valign: "middle",
    margin: 0,
  });

  // Cogent logo area (top-right) — icon + text on muted background
  slide1.addShape('rect' as PptxGenJS.ShapeType, {
    x: 7.8, y: 0.0, w: 2.2, h: 1.1,
    fill: { color: "E8E8E0" },
  });
  slide1.addImage({
    data: data.cogentLogoBase64,
    x: 7.9, y: 0.1, w: 0.7, h: 0.7,
    sizing: { type: "contain", w: 0.7, h: 0.7 },
  });
  slide1.addText([
    { text: "Cogent", options: { fontSize: 16, color: COGENT_SAGE_DARK, bold: true } },
    { text: " Analytics", options: { fontSize: 16, color: COGENT_SAGE_DARK } },
  ], {
    x: 8.55, y: 0.15, w: 1.4, h: 0.55,
    fontFace: "Georgia",
    valign: "middle",
    margin: 0,
  });

  // -- Content area border --
  slide1.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.2, y: 1.15, w: 9.6, h: 4.1,
    fill: { color: WHITE },
    line: { color: MED_GRAY, width: 1 },
  });

  // -- Recommendation line --
  const recText = `Recommendation: ${fmt$(data.monthlyAdSpend)}/month advertising budget for ${platformLabel} Ads`;
  slide1.addText(recText, {
    x: 0.3, y: 1.2, w: 9.4, h: 0.35,
    fontSize: 13, fontFace: "Arial",
    color: BLACK, align: "center", valign: "middle",
    bold: true,
  });

  // -- Locations Table --
  let currentY = 1.6;

  if (areasWithTier.length > 0) {
    const locHeader: PptxGenJS.TableCell[][] = [[
      { text: "Locations", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
      { text: "Budget %", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
      { text: "Budget $", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    ]];
    const locRows: PptxGenJS.TableCell[][] = areasWithTier.map((area) => [
      { text: area.name || "—", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: String(area.budgetPercent), options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(data.monthlyAdSpend * area.budgetPercent / 100)), options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ]);

    slide1.addTable([...locHeader, ...locRows], {
      x: 2.0, y: currentY, w: 6.0,
      colW: [2.5, 1.5, 2.0],
      border: { pt: 0.5, color: MED_GRAY },
      margin: 3,
    });

    currentY += 0.28 * (areasWithTier.length + 1) + 0.15;
  }

  // -- Service Offerings Table --
  const svcHeader: PptxGenJS.TableCell[][] = [[
    { text: "Sample Service Offerings", options: { bold: true, fontSize: 10, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Budget %", options: { bold: true, fontSize: 10, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Budget $", options: { bold: true, fontSize: 10, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Average CPL", options: { bold: true, fontSize: 10, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Avg Job Value", options: { bold: true, fontSize: 10, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
  ]];

  const svcRows: PptxGenJS.TableCell[][] = selectedServices.map((svc) => {
    const sr = data.result.serviceResults.find((r) => r.serviceName === svc.serviceName);
    return [
      { text: svc.serviceName, options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: String(svc.allocationPercent), options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(data.monthlyAdSpend * svc.allocationPercent / 100)), options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: sr ? fmt$(sr.cplUsed) : "—", options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: sr ? fmt$(sr.jobValue) : "—", options: { fontSize: 9, fontFace: "Arial", align: "center" } },
    ];
  });

  slide1.addTable([...svcHeader, ...svcRows], {
    x: 0.3, y: currentY, w: 9.4,
    colW: [2.8, 1.2, 1.2, 1.6, 1.6],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  currentY += 0.28 * (selectedServices.length + 1) + 0.2;

  // -- "Potential for Return" heading --
  slide1.addText("Potential for Return", {
    x: 0.3, y: currentY, w: 9.4, h: 0.3,
    fontSize: 14, fontFace: "Arial",
    color: BLACK, bold: true, align: "center",
    margin: 0,
  });
  currentY += 0.35;

  // -- Results Table --
  const resHeader: PptxGenJS.TableCell[][] = [[
    { text: "Sample Service Offerings", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Ad Spend", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Weighted Avg CPL", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Leads/Mth", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Jobs/Mth", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Additional Revenue/Mth", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center", border: [{ pt: 2, color: BLACK }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
    { text: "Est. Addtl GP/Mth", options: { bold: true, fontSize: 9, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
  ]];

  const gpPercent = data.grossMarginPercent ?? 52.5;

  const resRows: PptxGenJS.TableCell[][] = data.result.serviceResults.map((sr) => {
    const jobs = isConservative ? sr.jobsRounded : sr.jobs;
    const rev = isConservative ? sr.revenueRounded : sr.revenue;
    const gp = rev * (gpPercent / 100);
    return [
      { text: sr.serviceName, options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: fmt$(sr.allocatedSpend), options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: fmt$(sr.cplUsed), options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: `~${fmtNum(sr.leads)}`, options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: `~${fmtNum(jobs)}`, options: { fontSize: 9, fontFace: "Arial", align: "center" } },
      { text: `~${fmt$(rev)}`, options: { fontSize: 9, fontFace: "Arial", align: "center", border: [{ pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
      { text: `~${fmt$(gp)}`, options: { fontSize: 9, fontFace: "Arial", align: "center" } },
    ];
  });

  // Total row
  const totalJobs = isConservative ? data.result.totalJobsRounded : data.result.totalJobs;
  const totalGP = revenue * (gpPercent / 100);
  const totalRow: PptxGenJS.TableCell[] = [
    { text: "Total", options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
    { text: fmt$(data.result.totalSpend), options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
    { text: fmt$(Math.round(data.result.weightedAvgCpl)), options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
    { text: `~${fmtNum(data.result.totalLeads)}`, options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
    { text: `~${fmtNum(totalJobs)}`, options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
    { text: `~${fmt$(revenue)}`, options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center", border: [{ pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
    { text: `~${fmt$(totalGP)}`, options: { bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
  ];

  slide1.addTable([...resHeader, ...resRows, [totalRow[0], totalRow[1], totalRow[2], totalRow[3], totalRow[4], totalRow[5], totalRow[6]]], {
    x: 0.3, y: currentY, w: 9.4,
    colW: [1.7, 0.9, 1.2, 1.1, 1.0, 2.0, 1.5],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  // -- Disclaimer --
  slide1.addText([
    { text: "DISCLAIMER", options: { bold: true } },
    { text: ": The projections shown above are " },
    { text: "estimates based on published industry benchmarks", options: { bold: true, underline: { style: "sng" } } },
    { text: " and the inputs provided. They represent the " },
    { text: "potential opportunity", options: { bold: true } },
    { text: ", not a guarantee of results. Actual lead volume, cost per lead, close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the client's ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from " },
    { text: `${platformLabel} Ads` },
    { text: " and to set realistic expectations for campaign performance once fully optimized (typically 60-90 days)." },
  ], {
    x: 0.2, y: 5.05, w: 9.6, h: 0.55,
    fontSize: 6.5, fontFace: "Arial",
    color: DARK_GRAY, valign: "top",
    fill: { color: DISCLAIMER_BG },
    margin: [3, 5, 3, 5],
  });

  // Page number
  slide1.addText("1", {
    x: 9.5, y: 5.35, w: 0.3, h: 0.2,
    fontSize: 8, fontFace: "Arial",
    color: "999999", align: "right",
  });

  // ========================
  // SLIDE 2: Assumptions & KPIs
  // ========================
  const slide2 = pres.addSlide();
  slide2.background = { color: WHITE };

  // -- Header --
  if (data.clientLogoBase64) {
    slide2.addImage({
      data: data.clientLogoBase64,
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      sizing: { type: "contain", w: 1.5, h: 0.8 },
    });
  } else {
    slide2.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fill: { color: LIGHT_GRAY },
      line: { color: MED_GRAY, width: 1 },
    });
    slide2.addText("Add Client\nLogo Here", {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fontSize: 8, color: "999999",
      align: "center", valign: "middle",
      fontFace: "Arial",
    });
  }

  slide2.addText("Assumptions, KPIs, and\nOther Considerations", {
    x: 2.0, y: 0.1, w: 5.5, h: 0.95,
    fontSize: 22, fontFace: "Georgia",
    color: BLACK, bold: true, align: "center", valign: "middle",
    margin: 0,
  });

  slide2.addShape('rect' as PptxGenJS.ShapeType, {
    x: 7.8, y: 0.0, w: 2.2, h: 1.1,
    fill: { color: "E8E8E0" },
  });
  slide2.addImage({
    data: data.cogentLogoBase64,
    x: 7.9, y: 0.1, w: 0.7, h: 0.7,
    sizing: { type: "contain", w: 0.7, h: 0.7 },
  });
  slide2.addText([
    { text: "Cogent", options: { fontSize: 16, color: COGENT_SAGE_DARK, bold: true } },
    { text: " Analytics", options: { fontSize: 16, color: COGENT_SAGE_DARK } },
  ], {
    x: 8.55, y: 0.15, w: 1.4, h: 0.55,
    fontFace: "Georgia",
    valign: "middle",
    margin: 0,
  });

  // -- Content border --
  slide2.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.2, y: 1.15, w: 9.6, h: 3.85,
    fill: { color: WHITE },
    line: { color: MED_GRAY, width: 1 },
  });

  // -- Assumptions & KPIs Table (left side) --
  const kpiHeader: PptxGenJS.TableCell[][] = [[
    { text: "Assumptions and KPIs", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "A/KPI", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Targets", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
  ]];

  const kpiRows: PptxGenJS.TableCell[][] = [
    [
      { text: "Sales Closing Rate", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "A", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${data.closeRate}%`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Gross Margin", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "A", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${gpPercent}%`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Estimated Cost per Click (CPC)", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "KPI", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `$${estimatedCpc.toFixed(2)}`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Estimated Cost per Lead (CPL)", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "KPI", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(data.result.weightedAvgCpl)), options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Estimated Return on Ad Spend\n(ROAS)", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "KPI", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${roas.toFixed(1)}x`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
  ];

  slide2.addTable([...kpiHeader, ...kpiRows], {
    x: 0.35, y: 1.3, w: 4.6,
    colW: [2.5, 0.8, 1.3],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  // -- Other Factors Table (right side) --
  const factorsHeader: PptxGenJS.TableCell[][] = [[
    { text: "Other Factors That Affect Return", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center", colspan: 2 } },
  ]];

  const factorsRows: PptxGenJS.TableCell[][] = [
    [
      { text: "1) Lead follow-up speed", options: { fontSize: 10, fontFace: "Arial" } },
      { text: "5) Phone answer rate", options: { fontSize: 10, fontFace: "Arial" } },
    ],
    [
      { text: "2) Landing Page Quality", options: { fontSize: 10, fontFace: "Arial" } },
      { text: "6) Sales Process", options: { fontSize: 10, fontFace: "Arial" } },
    ],
    [
      { text: "3) Seasonal demand", options: { fontSize: 10, fontFace: "Arial" } },
      { text: "7) Local competition", options: { fontSize: 10, fontFace: "Arial" } },
    ],
    [
      { text: "4) Review Reputation", options: { fontSize: 10, fontFace: "Arial" } },
      { text: "8) Budget consistency", options: { fontSize: 10, fontFace: "Arial" } },
    ],
  ];

  slide2.addTable([...factorsHeader, ...factorsRows], {
    x: 5.15, y: 1.3, w: 4.5,
    colW: [2.25, 2.25],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  // -- Learning & Ramp-Up Period --
  const learnY = 3.3;
  slide2.addText(`${platformLabel} Ads Learning & Ramp-Up Period*`, {
    x: 0.4, y: learnY, w: 9.2, h: 0.3,
    fontSize: 13, fontFace: "Arial",
    color: BLACK, bold: true,
    margin: 0,
  });

  // Three columns for learning phases
  const phaseY = learnY + 0.35;
  const phases = data.platform === "google" ? [
    { title: "Weeks 1-2: Learning Phase", body: "Google's algorithm is gathering data. Expect higher CPL and fewer conversions. Do not make major changes during this period." },
    { title: "Weeks 3-6: Optimization", body: "Data builds, CPL stabilizes. Campaign adjustments begin. Results start trending toward benchmarks shown above." },
    { title: "Months 2-3+: Mature Performance", body: "Campaigns are optimized and performing at or near projected benchmarks. Continuous optimization drives improvement." },
  ] : data.platform === "meta" ? [
    { title: "Weeks 1-2: Learning Phase", body: "Meta's algorithm is learning your audience. Ad delivery will fluctuate. Avoid editing ads or audiences during this phase." },
    { title: "Weeks 3-6: Optimization", body: "Audience data matures. Retargeting audiences build. CPL begins to stabilize as winning ad creatives emerge." },
    { title: "Months 2-3+: Mature Performance", body: "Lookalike audiences and retargeting are fully built. Campaigns running at steady-state performance with consistent lead flow." },
  ] : [
    { title: "Weeks 1-2: Learning Phase", body: "LinkedIn's audience targeting is calibrating. Expect higher CPL initially as the algorithm identifies your ideal prospects." },
    { title: "Weeks 3-6: Optimization", body: "Sponsored Content and InMail performance stabilizes. A/B test messaging and audience segments for better CPL." },
    { title: "Months 2-3+: Mature Performance", body: "Pipeline of B2B leads is established. Account-based targeting refined. Ongoing optimization for lower CPL." },
  ];

  phases.forEach((phase, i) => {
    const px = 0.4 + i * 3.1;
    slide2.addText([
      { text: phase.title, options: { bold: true, fontSize: 9, breakLine: true } },
      { text: phase.body, options: { fontSize: 8 } },
    ], {
      x: px, y: phaseY, w: 2.9, h: 0.85,
      fontFace: "Arial", color: DARK_GRAY,
      valign: "top", margin: [2, 3, 2, 3],
    });
  });

  // Footnote
  slide2.addText(`*Most ${platformLabel} Ads campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.`, {
    x: 0.4, y: phaseY + 0.85, w: 9.2, h: 0.2,
    fontSize: 7, fontFace: "Arial",
    color: "666666", italic: true,
    margin: 0,
  });

  // -- Disclaimer --
  slide2.addText([
    { text: "DISCLAIMER", options: { bold: true } },
    { text: ": The projections shown above are " },
    { text: "estimates based on published industry benchmarks", options: { bold: true, underline: { style: "sng" } } },
    { text: " and the inputs provided. They represent the " },
    { text: "potential opportunity", options: { bold: true } },
    { text: ", not a guarantee of results. Actual lead volume, cost per lead, close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the client's ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from " },
    { text: `${platformLabel} Ads` },
    { text: " and to set realistic expectations for campaign performance once fully optimized (typically 60-90 days)." },
  ], {
    x: 0.2, y: 5.05, w: 9.6, h: 0.55,
    fontSize: 6.5, fontFace: "Arial",
    color: DARK_GRAY, valign: "top",
    fill: { color: DISCLAIMER_BG },
    margin: [3, 5, 3, 5],
  });

  // Page number
  slide2.addText("2", {
    x: 9.5, y: 5.35, w: 0.3, h: 0.2,
    fontSize: 8, fontFace: "Arial",
    color: "999999", align: "right",
  });

  // Generate and download
  await pres.writeFile({ fileName: `${data.clientName || "Client"} - ROAS Report.pptx` });
}
