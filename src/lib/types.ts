export type ConfidenceLevel = "high" | "medium" | "low";

export type CplChoice = "low" | "mid" | "high" | "custom";

export type RoundingMode = "exact" | "conservative";

export type AdPlatform = "google" | "meta" | "linkedin";

export interface PlatformRecommendation {
  rating: number; // 1-5
  note: string;
}

export interface IndustryBenchmark {
  industryId: string;
  industryName: string;
  serviceName: string;
  cplLow: number | null;
  cplMid: number | null;
  cplHigh: number | null;
  avgJobValue: number | null;
  recommendedMinAdSpend: number | null;
  recommendedTargetAdSpend: number | null;
  notes?: string;
  source?: string;
  confidence?: ConfidenceLevel;
}

export interface ServiceSelection {
  serviceName: string;
  selected: boolean;
  allocationPercent: number;
  cplChoice: CplChoice;
  customCpl: number | null;
  customJobValue: number | null;
  benchmark: IndustryBenchmark | null;
  isManual: boolean;
}

export interface ClientInputs {
  clientName: string;
  websiteUrl: string;
  gbpDescription: string;
  industryId: string;
}

export interface BudgetInputs {
  monthlyAdSpend: number;
  closeRate: number; // percentage 0-100
  roundingMode: RoundingMode;
  grossMarginPercent: number | null;
}

export interface ServiceResult {
  serviceName: string;
  allocatedSpend: number;
  cplUsed: number;
  leads: number;
  jobs: number;
  jobsRounded: number;
  revenue: number;
  revenueRounded: number;
  jobValue: number;
  isCustomEstimate: boolean;
  confidence: ConfidenceLevel | "custom";
}

export interface CalculationResult {
  totalSpend: number;
  weightedAvgCpl: number;
  totalLeads: number;
  totalJobs: number;
  totalJobsRounded: number;
  totalRevenue: number;
  totalRevenueRounded: number;
  grossProfit: number | null;
  grossProfitRounded: number | null;
  closeRate: number;
  serviceResults: ServiceResult[];
  hasCustomEstimates: boolean;
  hasLowConfidence: boolean;
  warnings: string[];
}

export interface ExtractedService {
  name: string;
  confidence: ConfidenceLevel;
  matchedBenchmark: string | null;
}
