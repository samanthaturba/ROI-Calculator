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
  lsa: "Google Local Services Ads (LSA)",
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
  closeRateIsDefault: boolean;
  grossMarginPercent: number | null;
  blendedMultiplier: number;
  cogentLogoBase64: string;
  clientLogoBase64?: string;
  clientWebsiteUrl?: string;
  selectedPlatforms?: AdPlatform[];
  platformAllocations?: Record<AdPlatform, number>;
  platformResults?: Record<AdPlatform, CalculationResult | null>;
  industryCloseRate?: { closeRate: number; source: string };
}

function addRoasSlide(
  pres: PptxGenJS,
  data: PowerPointData,
  platformForSlide: AdPlatform,
  resultForSlide: CalculationResult,
  budgetForSlide: number,
  slideNumber: number,
  isMultiPlatform: boolean,
  allocationPercent?: number,
) {
  const selectedServices = data.services.filter((s) => s.selected);
  const isConservative = data.roundingMode === "conservative";
  const platformLabel = PLATFORM_LABELS[platformForSlide];
  const areasWithTier = data.targetAreas.filter((a) => a.tier);

  const revenue = isConservative ? resultForSlide.totalRevenueRounded : resultForSlide.totalRevenue;
  const gpPercent = data.grossMarginPercent ?? 52.5;
  const gpIsAssumed = data.grossMarginPercent === null;

  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  // -- Header bar --
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 10, h: 1.1,
    fill: { color: WHITE },
  });

  // Client logo (top-left) or placeholder
  if (data.clientLogoBase64) {
    slide.addImage({
      data: data.clientLogoBase64,
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      sizing: { type: "contain", w: 1.5, h: 0.8 },
    });
  } else {
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fill: { color: LIGHT_GRAY },
      line: { color: MED_GRAY, width: 1 },
    });
    slide.addText("Add Client\nLogo Here", {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fontSize: 8, color: "999999",
      align: "center", valign: "middle",
      fontFace: "Arial",
    });
  }

  // Title
  const titleSuffix = isMultiPlatform && allocationPercent !== undefined
    ? `\n${platformLabel} (${allocationPercent}% of budget)`
    : `\n${platformLabel} Advertising Strategy`;
  slide.addText(`Potential ROAS/ROI from${titleSuffix}`, {
    x: 2.0, y: 0.1, w: 5.5, h: 0.95,
    fontSize: 22, fontFace: "Georgia",
    color: BLACK, bold: true, align: "center", valign: "middle",
    margin: 0,
  });

  // Cogent logo area (top-right)
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 7.8, y: 0.0, w: 2.2, h: 1.1,
    fill: { color: "E8E8E0" },
  });
  slide.addImage({
    data: data.cogentLogoBase64,
    x: 7.9, y: 0.1, w: 0.7, h: 0.7,
    sizing: { type: "contain", w: 0.7, h: 0.7 },
  });
  slide.addText([
    { text: "Cogent", options: { fontSize: 16, color: COGENT_SAGE_DARK, bold: true } },
    { text: " Analytics", options: { fontSize: 16, color: COGENT_SAGE_DARK } },
  ], {
    x: 8.55, y: 0.15, w: 1.4, h: 0.55,
    fontFace: "Georgia",
    valign: "middle",
    margin: 0,
  });

  // -- Calculate layout dimensions dynamically --
  const namedAreas = areasWithTier.filter((a) => a.name && a.name.trim() !== "");
  const hasLocations = namedAreas.length > 0;
  const numServices = selectedServices.length;
  const numLocations = namedAreas.length;

  const totalRows = (hasLocations ? numLocations + 1 : 0) + (numServices + 1) + (numServices + 2);
  const isCompact = totalRows > 10;
  const rowH = isCompact ? 0.2 : 0.23;
  const headerH = isCompact ? 0.22 : 0.25;
  const fontSize = isCompact ? 8 : 9;
  const headerFontSize = isCompact ? 9 : 10;

  // -- Content area border --
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.2, y: 1.15, w: 9.6, h: 3.85,
    fill: { color: WHITE },
    line: { color: MED_GRAY, width: 1 },
  });

  // -- Recommendation line --
  const recText = `Recommendation: ${fmt$(budgetForSlide)}/month advertising budget for ${platformLabel} Ads`;
  slide.addText(recText, {
    x: 0.3, y: 1.18, w: 9.4, h: 0.3,
    fontSize: 12, fontFace: "Arial",
    color: BLACK, align: "center", valign: "middle",
    bold: true,
  });

  // -- Locations Table (only if locations have names) --
  let currentY = 1.5;

  if (hasLocations) {
    const locHeader: PptxGenJS.TableCell[][] = [[
      { text: "Locations", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
      { text: "Budget %", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
      { text: "Budget $", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    ]];
    const locRows: PptxGenJS.TableCell[][] = namedAreas.map((area) => [
      { text: area.name, options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: String(area.budgetPercent), options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(budgetForSlide * area.budgetPercent / 100)), options: { fontSize, fontFace: "Arial", align: "center" } },
    ]);

    slide.addTable([...locHeader, ...locRows], {
      x: 2.0, y: currentY, w: 6.0,
      colW: [2.5, 1.5, 2.0],
      border: { pt: 0.5, color: MED_GRAY },
      rowH: [headerH, ...namedAreas.map(() => rowH)],
      margin: 2,
    });

    currentY += headerH + rowH * numLocations + 0.08;
  }

  // -- Service Offerings Table --
  const svcHeader: PptxGenJS.TableCell[][] = [[
    { text: "Sample Service Offerings", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Budget %", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Budget $", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Average CPL", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Avg Job Value", options: { bold: true, fontSize: headerFontSize, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
  ]];

  const svcRows: PptxGenJS.TableCell[][] = selectedServices.map((svc) => {
    const sr = resultForSlide.serviceResults.find((r) => r.serviceName === svc.serviceName);
    return [
      { text: svc.serviceName, options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: String(svc.allocationPercent), options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(budgetForSlide * svc.allocationPercent / 100)), options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: sr ? fmt$(sr.cplUsed) : "\u2014", options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: sr ? fmt$(sr.jobValue) : "\u2014", options: { fontSize, fontFace: "Arial", align: "center" } },
    ];
  });

  slide.addTable([...svcHeader, ...svcRows], {
    x: 0.3, y: currentY, w: 9.4,
    colW: [2.8, 1.2, 1.2, 1.6, 1.6],
    border: { pt: 0.5, color: MED_GRAY },
    rowH: [headerH, ...selectedServices.map(() => rowH)],
    margin: 2,
  });

  currentY += headerH + rowH * numServices + 0.12;

  // -- "Potential for Return" heading --
  slide.addText("Potential for Return", {
    x: 0.3, y: currentY, w: 9.4, h: 0.25,
    fontSize: 13, fontFace: "Arial",
    color: BLACK, bold: true, align: "center",
    margin: 0,
  });
  currentY += 0.28;

  // -- Results Table --
  const resHeaderCells: PptxGenJS.TableCell[] = [
    { text: "Sample Service Offerings", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Ad Spend", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Weighted Avg CPL", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Leads/Mth", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Jobs/Mth", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } },
    { text: "Est. Additional Revenue/Mth", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center", border: [{ pt: 2, color: BLACK }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
  ];
  let resColW = [1.8, 1.0, 1.3, 1.1, 1.0, 2.2];

  if (!gpIsAssumed) {
    resHeaderCells.push({ text: "Est. Addtl GP/Mth", options: { bold: true, fontSize, fontFace: "Arial", fill: { color: WHITE }, color: BLACK, align: "center" } });
    resColW = [1.5, 0.9, 1.2, 1.0, 0.9, 2.0, 1.5];
  }

  const resHeader: PptxGenJS.TableCell[][] = [resHeaderCells];

  const resRows: PptxGenJS.TableCell[][] = resultForSlide.serviceResults.map((sr) => {
    const jobs = isConservative ? sr.jobsRounded : sr.jobs;
    const rev = isConservative ? sr.revenueRounded : sr.revenue;
    const gp = rev * (gpPercent / 100);
    const row: PptxGenJS.TableCell[] = [
      { text: sr.serviceName, options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: fmt$(sr.allocatedSpend), options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: fmt$(sr.cplUsed), options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: `~${fmtNum(sr.leads)}`, options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: `~${fmtNum(jobs)}`, options: { fontSize, fontFace: "Arial", align: "center" } },
      { text: `~${fmt$(rev)}`, options: { fontSize, fontFace: "Arial", align: "center", border: [{ pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
    ];
    if (!gpIsAssumed) {
      row.push({ text: `~${fmt$(gp)}`, options: { fontSize, fontFace: "Arial", align: "center" } });
    }
    return row;
  });

  // Total row
  const totalJobs = isConservative ? resultForSlide.totalJobsRounded : resultForSlide.totalJobs;
  const totalGP = revenue * (gpPercent / 100);
  const totalRowCells: PptxGenJS.TableCell[] = [
    { text: "Total", options: { bold: true, fontSize, fontFace: "Arial", align: "center" } },
    { text: fmt$(resultForSlide.totalSpend), options: { bold: true, fontSize, fontFace: "Arial", align: "center" } },
    { text: fmt$(Math.round(resultForSlide.weightedAvgCpl)), options: { bold: true, fontSize, fontFace: "Arial", align: "center" } },
    { text: `~${fmtNum(resultForSlide.totalLeads)}`, options: { bold: true, fontSize, fontFace: "Arial", align: "center" } },
    { text: `~${fmtNum(totalJobs)}`, options: { bold: true, fontSize, fontFace: "Arial", align: "center" } },
    { text: `~${fmt$(revenue)}`, options: { bold: true, fontSize, fontFace: "Arial", align: "center", border: [{ pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }, { pt: 0.5, color: MED_GRAY }, { pt: 2, color: BLACK }] } },
  ];
  if (!gpIsAssumed) {
    totalRowCells.push({ text: `~${fmt$(totalGP)}`, options: { bold: true, fontSize, fontFace: "Arial", align: "center" } });
  }

  slide.addTable([...resHeader, ...resRows, totalRowCells], {
    x: 0.3, y: currentY, w: 9.4,
    colW: resColW,
    border: { pt: 0.5, color: MED_GRAY },
    rowH: [headerH, ...resultForSlide.serviceResults.map(() => rowH), rowH],
    margin: 2,
  });

  // -- Disclaimer --
  slide.addText([
    { text: "DISCLAIMER", options: { bold: true } },
    { text: ": The projections shown above are " },
    { text: "estimates based on published industry benchmarks", options: { bold: true, underline: { style: "sng" } } },
    { text: " and the inputs provided. They represent the " },
    { text: "potential opportunity", options: { bold: true } },
    { text: ", not a guarantee of results. Actual lead volume, cost per lead, close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the client's ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from " },
    { text: `${platformLabel} Ads` },
    { text: " and to set realistic expectations for campaign performance once fully optimized (typically 60-90 days)." },
  ], {
    x: 0.2, y: 5.0, w: 9.6, h: 0.55,
    fontSize: 6.5, fontFace: "Arial",
    color: DARK_GRAY, valign: "top",
    fill: { color: DISCLAIMER_BG },
    margin: [3, 5, 3, 5],
  });

  // Page number
  slide.addText(String(slideNumber), {
    x: 9.5, y: 5.35, w: 0.3, h: 0.2,
    fontSize: 8, fontFace: "Arial",
    color: "999999", align: "right",
  });
}

function addAssumptionsSlide(
  pres: PptxGenJS,
  data: PowerPointData,
  platformForSlide: AdPlatform,
  resultForSlide: CalculationResult,
  slideNumber: number,
  allPlatforms?: AdPlatform[],
) {
  const isConservative = data.roundingMode === "conservative";
  const platformLabel = PLATFORM_LABELS[platformForSlide];
  const platforms = allPlatforms && allPlatforms.length > 0 ? allPlatforms : [platformForSlide];
  const isMulti = platforms.length > 1;
  const revenue = isConservative ? resultForSlide.totalRevenueRounded : resultForSlide.totalRevenue;
  const gpPercent = data.grossMarginPercent ?? 52.5;
  const gpIsAssumed = data.grossMarginPercent === null;
  const roas = resultForSlide.totalSpend > 0 ? revenue / resultForSlide.totalSpend : 0;

  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  // -- Header --
  if (data.clientLogoBase64) {
    slide.addImage({
      data: data.clientLogoBase64,
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      sizing: { type: "contain", w: 1.5, h: 0.8 },
    });
  } else {
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fill: { color: LIGHT_GRAY },
      line: { color: MED_GRAY, width: 1 },
    });
    slide.addText("Add Client\nLogo Here", {
      x: 0.3, y: 0.15, w: 1.5, h: 0.8,
      fontSize: 8, color: "999999",
      align: "center", valign: "middle",
      fontFace: "Arial",
    });
  }

  slide.addText("Assumptions, KPIs, and\nOther Considerations", {
    x: 2.0, y: 0.1, w: 5.5, h: 0.95,
    fontSize: 22, fontFace: "Georgia",
    color: BLACK, bold: true, align: "center", valign: "middle",
    margin: 0,
  });

  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 7.8, y: 0.0, w: 2.2, h: 1.1,
    fill: { color: "E8E8E0" },
  });
  slide.addImage({
    data: data.cogentLogoBase64,
    x: 7.9, y: 0.1, w: 0.7, h: 0.7,
    sizing: { type: "contain", w: 0.7, h: 0.7 },
  });
  slide.addText([
    { text: "Cogent", options: { fontSize: 16, color: COGENT_SAGE_DARK, bold: true } },
    { text: " Analytics", options: { fontSize: 16, color: COGENT_SAGE_DARK } },
  ], {
    x: 8.55, y: 0.15, w: 1.4, h: 0.55,
    fontFace: "Georgia",
    valign: "middle",
    margin: 0,
  });

  // -- Content border --
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.2, y: 1.15, w: 9.6, h: 3.85,
    fill: { color: WHITE },
    line: { color: MED_GRAY, width: 1 },
  });

  // -- Assumptions & KPIs Table --
  const closeRateNote = data.closeRateIsDefault ? " *" : "";
  const gpNote = gpIsAssumed ? " *" : "";

  const kpiHeader: PptxGenJS.TableCell[][] = [[
    { text: "Assumptions and KPIs", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "A/KPI", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
    { text: "Targets", options: { bold: true, fontSize: 11, fontFace: "Arial", fill: { color: COGENT_SAGE }, color: BLACK, align: "center" } },
  ]];

  const kpiRows: PptxGenJS.TableCell[][] = [
    [
      { text: `Sales Closing Rate${closeRateNote}`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "A", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${data.closeRate}%`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: `Gross Margin${gpNote}`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "A", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${gpPercent}%`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Estimated Cost per Lead (CPL)", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "KPI", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: fmt$(Math.round(resultForSlide.weightedAvgCpl)), options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
    [
      { text: "Estimated Return on Ad Spend\n(ROAS)", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: "KPI", options: { fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: `${roas.toFixed(1)}x`, options: { fontSize: 10, fontFace: "Arial", align: "center" } },
    ],
  ];

  slide.addTable([...kpiHeader, ...kpiRows], {
    x: 0.35, y: 1.3, w: 4.6,
    colW: [2.5, 0.8, 1.3],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  // Footnote for assumed values
  const assumptions: string[] = [];
  if (data.closeRateIsDefault) {
    const crInfo = data.industryCloseRate;
    if (crInfo) {
      assumptions.push(`closing rate (industry avg of ${crInfo.closeRate}%, source: ${crInfo.source})`);
    } else {
      assumptions.push("closing rate (general industry avg of 20%)");
    }
  }
  if (gpIsAssumed) assumptions.push("gross margin (industry avg estimate of 52.5%)");
  if (assumptions.length > 0) {
    slide.addText(`* Not provided \u2014 using ${assumptions.join(" and ")}. Update in the ROI calculator for accuracy.`, {
      x: 0.35, y: 2.65, w: 4.6, h: 0.25,
      fontSize: 7, fontFace: "Arial",
      color: "CC6600", italic: true,
      margin: 0,
    });
  }

  // -- Other Factors Table --
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

  slide.addTable([...factorsHeader, ...factorsRows], {
    x: 5.15, y: 1.3, w: 4.5,
    colW: [2.25, 2.25],
    border: { pt: 0.5, color: MED_GRAY },
    margin: 3,
  });

  // -- Learning & Ramp-Up Period --
  const learnY = 3.3;
  const sectionTitle = isMulti
    ? "Learning & Ramp-Up Period by Platform*"
    : `${platformLabel} Ads Learning & Ramp-Up Period*`;
  slide.addText(sectionTitle, {
    x: 0.4, y: learnY, w: 9.2, h: 0.3,
    fontSize: 13, fontFace: "Arial",
    color: BLACK, bold: true,
    margin: 0,
  });

  const getPhasesForPlatform = (p: AdPlatform) => p === "google" ? [
    { title: "Weeks 1-2: Learning Phase", body: "Google's algorithm is gathering data. Expect higher CPL and fewer conversions. Do not make major changes during this period." },
    { title: "Weeks 3-6: Optimization", body: "Data builds, CPL stabilizes. Campaign adjustments begin. Results start trending toward benchmarks shown above." },
    { title: "Months 2-3+: Mature Performance", body: "Campaigns are optimized and performing at or near projected benchmarks. Continuous optimization drives improvement." },
  ] : p === "meta" ? [
    { title: "Weeks 1-2: Learning Phase", body: "Meta's algorithm is learning your audience. Ad delivery will fluctuate. Avoid editing ads or audiences during this phase." },
    { title: "Weeks 3-6: Optimization", body: "Audience data matures. Retargeting audiences build. CPL begins to stabilize as winning ad creatives emerge." },
    { title: "Months 2-3+: Mature Performance", body: "Lookalike audiences and retargeting are fully built. Campaigns running at steady-state performance with consistent lead flow." },
  ] : p === "lsa" ? [
    { title: "Weeks 1-2: Building Visibility", body: "Your LSA profile is building visibility. Lead volume starts low as Google verifies your business and profile completeness." },
    { title: "Weeks 3-6: Growing Momentum", body: "Lead volume increases as reviews accumulate and your profile ranks higher. Respond quickly to leads to maintain your ranking." },
    { title: "Months 2-3+: Established Profile", body: "Established profile with consistent lead flow. Maintain high review ratings and fast response times to keep top placement." },
  ] : [
    { title: "Weeks 1-2: Learning Phase", body: "LinkedIn's audience targeting is calibrating. Expect higher CPL initially as the algorithm identifies your ideal prospects." },
    { title: "Weeks 3-6: Optimization", body: "Sponsored Content and InMail performance stabilizes. A/B test messaging and audience segments for better CPL." },
    { title: "Months 2-3+: Mature Performance", body: "Pipeline of B2B leads is established. Account-based targeting refined. Ongoing optimization for lower CPL." },
  ];

  if (!isMulti) {
    // Single platform: original 3-box layout
    const phaseY = learnY + 0.35;
    const phases = getPhasesForPlatform(platformForSlide);
    phases.forEach((phase, i) => {
      const px = 0.4 + i * 3.1;
      slide.addText([
        { text: phase.title, options: { bold: true, fontSize: 9, breakLine: true } },
        { text: phase.body, options: { fontSize: 8 } },
      ], {
        x: px, y: phaseY, w: 2.9, h: 0.85,
        fontFace: "Arial", color: DARK_GRAY,
        valign: "top", margin: [2, 3, 2, 3],
      });
    });

    slide.addText(`*Most ${platformLabel} Ads campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.`, {
      x: 0.4, y: phaseY + 0.85, w: 9.2, h: 0.2,
      fontSize: 7, fontFace: "Arial",
      color: "666666", italic: true,
      margin: 0,
    });
  } else {
    // Multi-platform: one compact row per platform
    const phaseY = learnY + 0.35;
    const availableHeight = 1.35;
    const rowHeight = Math.min(0.42, availableHeight / platforms.length);
    const fontSizeTitle = platforms.length <= 2 ? 8.5 : 7.5;
    const fontSizeBody = platforms.length <= 2 ? 7 : 6.5;

    platforms.forEach((p, idx) => {
      const py = phaseY + idx * rowHeight;
      const pLabel = PLATFORM_LABELS[p];
      const pPhases = getPhasesForPlatform(p);

      // Platform label on left
      slide.addText(`${pLabel}`, {
        x: 0.4, y: py, w: 1.3, h: rowHeight,
        fontSize: fontSizeTitle, fontFace: "Arial",
        color: BLACK, bold: true, valign: "middle",
        margin: 0,
      });

      // Three phase columns
      pPhases.forEach((phase, i) => {
        const px = 1.75 + i * 2.7;
        slide.addText([
          { text: phase.title.split(":")[0] + ":", options: { bold: true, fontSize: fontSizeBody - 0.5, color: COGENT_NAVY } },
          { text: " " + phase.body, options: { fontSize: fontSizeBody, color: DARK_GRAY } },
        ], {
          x: px, y: py, w: 2.65, h: rowHeight,
          fontFace: "Arial",
          valign: "middle", margin: [1, 2, 1, 2],
        });
      });
    });

    slide.addText(`*Each platform requires 60-90 days to reach full optimization. With multiple platforms running, learning phases happen in parallel. The estimates above represent mature campaign performance across all selected platforms, not Day 1 results.`, {
      x: 0.4, y: phaseY + platforms.length * rowHeight + 0.02, w: 9.2, h: 0.25,
      fontSize: 6.5, fontFace: "Arial",
      color: "666666", italic: true,
      margin: 0,
    });
  }

  // -- Disclaimer --
  const disclaimerPlatformText = isMulti
    ? platforms.map((p, i) => {
        const lbl = `${PLATFORM_LABELS[p]} Ads`;
        if (i === 0) return lbl;
        if (i === platforms.length - 1) return ` and ${lbl}`;
        return `, ${lbl}`;
      }).join("")
    : `${platformLabel} Ads`;

  slide.addText([
    { text: "DISCLAIMER", options: { bold: true } },
    { text: ": The projections shown above are " },
    { text: "estimates based on published industry benchmarks", options: { bold: true, underline: { style: "sng" } } },
    { text: " and the inputs provided. They represent the " },
    { text: "potential opportunity", options: { bold: true } },
    { text: ", not a guarantee of results. Actual lead volume, cost per lead, close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the client's ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from " },
    { text: disclaimerPlatformText },
    { text: " and to set realistic expectations for campaign performance once fully optimized (typically 60-90 days)." },
  ], {
    x: 0.2, y: 5.05, w: 9.6, h: 0.55,
    fontSize: 6.5, fontFace: "Arial",
    color: DARK_GRAY, valign: "top",
    fill: { color: DISCLAIMER_BG },
    margin: [3, 5, 3, 5],
  });

  // Page number
  slide.addText(String(slideNumber), {
    x: 9.5, y: 5.35, w: 0.3, h: 0.2,
    fontSize: 8, fontFace: "Arial",
    color: "999999", align: "right",
  });
}

export async function generatePowerPoint(data: PowerPointData): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Cogent Analytics";
  pres.title = `ROAS Report — ${data.clientName || "Client"}`;

  const platforms = data.selectedPlatforms ?? [data.platform];
  const isMultiPlatform = platforms.length > 1;

  let slideNum = 1;

  if (isMultiPlatform && data.platformResults && data.platformAllocations) {
    // Multi-platform: one ROAS slide per platform, then one Assumptions slide
    for (const plat of platforms) {
      const platResult = data.platformResults[plat];
      if (!platResult) continue;
      const platBudget = data.monthlyAdSpend * (data.platformAllocations[plat] / 100);

      addRoasSlide(pres, data, plat, platResult, platBudget, slideNum, true, data.platformAllocations[plat]);
      slideNum++;
    }

    // Assumptions slide: use the combined result for aggregated KPIs, and pass all platforms so
    // the learning & ramp-up period is shown for every selected platform.
    addAssumptionsSlide(pres, data, platforms[0], data.result, slideNum, platforms);
  } else {
    // Single platform: exactly as before (2 slides)
    addRoasSlide(pres, data, data.platform, data.result, data.monthlyAdSpend, 1, false);
    addAssumptionsSlide(pres, data, data.platform, data.result, 2);
  }

  // Generate and download
  await pres.writeFile({ fileName: `${data.clientName || "Client"} - ROAS Report.pptx` });
}
