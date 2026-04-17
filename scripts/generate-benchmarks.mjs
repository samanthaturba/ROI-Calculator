#!/usr/bin/env node
/**
 * Generate benchmarks.json with real sourced industry data.
 * Sources: WordStream 2025, LocaliQ 2025, SearchLight Digital 2026,
 * ASTRALCOM 2025, PPC Chief 2026, and industry-specific reports.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper to create benchmark entries
function entry(industryId, industryName, serviceName, cplLow, cplMid, cplHigh, avgJobValue, minSpend, targetSpend, notes, source, confidence) {
  return { industryId, industryName, serviceName, cplLow, cplMid, cplHigh, avgJobValue, recommendedMinAdSpend: minSpend, recommendedTargetAdSpend: targetSpend, notes, source, confidence };
}

const benchmarks = [];

// ─── HVAC ───────────────────────────────────────────────
// LocaliQ 2025: CPC $9.68, CTR 6.43%, CVR 6.56%, CPL $127.74
// SearchLight Jan 2026: avg CPL $104, non-branded $149, AC repair $231, heating repair $144
const hvacSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks; SearchLight Digital HVAC Benchmark Jan 2026 ($14.9M spend, 816 contractors)";
benchmarks.push(
  entry("hvac", "HVAC", "AC Repair", 140, 231, 310, 3200, 2000, 5000, "SearchLight Jan 2026: AC repair CPL $231, 37% book rate, $3,174 avg ticket. Highly seasonal — summer peaks can 3x costs.", hvacSrc, "high"),
  entry("hvac", "HVAC", "Heating Repair", 90, 144, 200, 3200, 2000, 5000, "SearchLight Jan 2026: heating repair CPL $144, 38.2% book rate, $3,225 avg ticket. Winter peaks drive higher competition.", hvacSrc, "high"),
  entry("hvac", "HVAC", "AC Installation", 100, 150, 220, 7500, 2500, 6000, "Derived from HVAC non-branded CPL $149 (SearchLight 2026). Installation leads are high-value but harder to convert.", hvacSrc, "high"),
  entry("hvac", "HVAC", "HVAC Maintenance", 60, 90, 130, 250, 1000, 2500, "Lower CPL for maintenance/tune-up keywords due to lower competition. Recurring revenue opportunity.", hvacSrc, "medium"),
  entry("hvac", "HVAC", "Ductwork & Ventilation", 80, 128, 180, 3000, 1500, 3500, "Based on HVAC overall CPL $127.74 (LocaliQ 2025). Ductwork is moderate-competition subcategory.", hvacSrc, "medium"),
);

// ─── PLUMBING ───────────────────────────────────────────
// LocaliQ 2025: CPC $10.49, CTR 4.97%, CVR 7.63%, CPL $129.02
// SearchLight 2026: non-branded $167
const plumbingSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (CPC $10.49, CVR 7.63%, CPL $129.02); SearchLight Digital Jan 2026 (non-branded CPL $167)";
benchmarks.push(
  entry("plumbing", "Plumbing", "Drain Cleaning", 70, 110, 155, 350, 1000, 2500, "Lower-value service but high search volume. CPL below plumbing average due to simpler service intent.", plumbingSrc, "medium"),
  entry("plumbing", "Plumbing", "Water Heater", 100, 145, 200, 2500, 1500, 3500, "High-intent emergency and replacement searches. Above-average CPL for plumbing.", plumbingSrc, "medium"),
  entry("plumbing", "Plumbing", "Pipe Repair", 90, 129, 180, 1500, 1200, 3000, "Aligns closely with plumbing overall CPL $129.02 (LocaliQ 2025).", plumbingSrc, "high"),
  entry("plumbing", "Plumbing", "Bathroom Remodel", 120, 167, 240, 12000, 2000, 5000, "Higher CPL aligned with SearchLight non-branded $167. High job value justifies premium lead costs.", plumbingSrc, "high"),
  entry("plumbing", "Plumbing", "Emergency Plumbing", 100, 150, 220, 800, 1500, 3500, "Emergency keywords command premium CPCs due to urgency. High conversion intent offsets cost.", plumbingSrc, "medium"),
);

// ─── ROOFING ────────────────────────────────────────────
// LocaliQ 2025: CPC $10.70, CTR 5.66%, CVR 3.70%, CPL $228.15
const roofingSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (CPC $10.70, CVR 3.70%, CPL $228.15 — highest in home services)";
benchmarks.push(
  entry("roofing", "Roofing", "Roof Replacement", 150, 228, 350, 9500, 2500, 6000, "Roof replacement drives the $228.15 avg CPL. Extremely competitive — storm season can spike CPCs to $60+.", roofingSrc, "high"),
  entry("roofing", "Roofing", "Roof Repair", 100, 160, 250, 1500, 1500, 4000, "Repair CPL below replacement due to lower ticket size and slightly less competition.", roofingSrc, "medium"),
  entry("roofing", "Roofing", "Roof Inspection", 60, 100, 160, 400, 800, 2000, "Lower CPL for inspection/assessment keywords. Often used as lead-in to replacement sales.", roofingSrc, "medium"),
  entry("roofing", "Roofing", "Gutter Installation", 70, 120, 180, 2000, 1000, 2500, "Grouped with roofing in LocaliQ data. Lower competition than roof replacement keywords.", roofingSrc, "medium"),
);

// ─── ELECTRICAL ─────────────────────────────────────────
// LocaliQ 2025: CPC $12.18, CTR 5.15%, CVR 9.08%, CPL $93.69
// SearchLight 2026: non-branded $163
const electricalSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (CPC $12.18, CVR 9.08%, CPL $93.69); SearchLight Digital Jan 2026 ($163 non-branded CPL)";
benchmarks.push(
  entry("electrical", "Electrical", "Panel Upgrade", 80, 120, 175, 3500, 1500, 3500, "High-value service. CPL above average due to technical keywords with less search volume.", electricalSrc, "medium"),
  entry("electrical", "Electrical", "Wiring & Rewiring", 65, 94, 140, 4000, 1500, 3500, "Aligns with electrical overall CPL $93.69 (LocaliQ 2025). Broad keyword category.", electricalSrc, "high"),
  entry("electrical", "Electrical", "Lighting Installation", 50, 75, 110, 1200, 1000, 2500, "Lower CPL than electrical average — consumer-friendly searches with good conversion rates.", electricalSrc, "medium"),
  entry("electrical", "Electrical", "EV Charger Installation", 70, 100, 150, 2500, 1200, 3000, "Growing market segment. Moderate competition with increasing search volume.", electricalSrc, "medium"),
  entry("electrical", "Electrical", "Generator Installation", 80, 115, 170, 8000, 1500, 3500, "High job value. Seasonal demand spikes (storm season, winter) increase CPCs.", electricalSrc, "medium"),
);

// ─── SEPTIC ─────────────────────────────────────────────
// Falls under home services average CPL $90.92 (LocaliQ 2025)
const septicSrc = "Derived from LocaliQ 2025 Home Services avg CPL $90.92; niche service with lower competition than mainstream trades";
benchmarks.push(
  entry("septic", "Septic Services", "Septic Pumping", 30, 50, 80, 400, 800, 1500, "Lower CPL due to niche market and clear service intent. Recurring service opportunity.", septicSrc, "medium"),
  entry("septic", "Septic Services", "Septic Installation", 80, 130, 200, 7000, 1500, 3500, "High-value installation. CPL aligned with construction/contractor benchmarks.", septicSrc, "medium"),
  entry("septic", "Septic Services", "Septic Repair", 50, 85, 130, 2500, 1000, 2500, "Moderate CPL — emergency repairs have higher intent but less competition than mainstream plumbing.", septicSrc, "medium"),
  entry("septic", "Septic Services", "Septic Inspection", 25, 45, 70, 400, 500, 1200, "Low CPL for inspection keywords. Often lead-in to larger repair/replacement projects.", septicSrc, "medium"),
);

// ─── PEST CONTROL ───────────────────────────────────────
// LocaliQ 2025 home services data; industry CPL ~$70-142
const pestSrc = "LocaliQ 2025 Home Services Benchmarks; VibeAds 2026 Pest Control Google Ads Guide (CPC $8.50, CVR 5-8%, CPL $106-$142)";
benchmarks.push(
  entry("pest-control", "Pest Control", "General Pest Control", 70, 106, 150, 250, 1000, 2500, "VibeAds 2026: CPC $8.50, CVR 5-8%. Good CPL target is $106-$142. Seasonal demand variations.", pestSrc, "high"),
  entry("pest-control", "Pest Control", "Termite Treatment", 90, 135, 190, 1500, 1500, 3500, "Higher CPL than general pest due to high job value and competitive keywords.", pestSrc, "medium"),
  entry("pest-control", "Pest Control", "Wildlife Removal", 60, 95, 140, 500, 800, 2000, "Lower competition niche within pest control. Seasonal variations (spring/fall).", pestSrc, "medium"),
  entry("pest-control", "Pest Control", "Bed Bug Treatment", 80, 120, 170, 1200, 1000, 2500, "High-urgency searches with strong conversion intent. Competitive in urban markets.", pestSrc, "medium"),
  entry("pest-control", "Pest Control", "Mosquito Control", 50, 80, 120, 350, 800, 1800, "Seasonal service (spring/summer). Lower CPL due to lower competition and recurring revenue model.", pestSrc, "medium"),
);

// ─── POOL SERVICES ──────────────────────────────────────
// LocaliQ 2025: CPL $45.15, CPC $5.81, CPC increased 46%+ YoY
const poolSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Pools & Spas CPL $45.15, CPC $5.81 — best CPL in home services)";
benchmarks.push(
  entry("pool", "Pool Services", "Pool Cleaning & Maintenance", 25, 40, 60, 200, 800, 1800, "Below-average CPL for recurring maintenance. Good for building client base.", poolSrc, "high"),
  entry("pool", "Pool Services", "Pool Repair", 35, 50, 75, 1200, 1000, 2500, "Moderate CPL aligned with pools overall $45.15. Repair intent converts well.", poolSrc, "high"),
  entry("pool", "Pool Services", "Pool Installation", 80, 130, 200, 45000, 2000, 5000, "Higher CPL for installation — high ticket justifies premium lead costs. PE investment driving up competition.", poolSrc, "medium"),
  entry("pool", "Pool Services", "Pool Renovation", 60, 95, 150, 15000, 1500, 3500, "Moderate-high CPL for renovation/resurfacing. Strong ROI due to high job value.", poolSrc, "medium"),
);

// ─── LANDSCAPING ────────────────────────────────────────
// LocaliQ 2025: lowest CTR at 4.69%. Lower CPL range ~$40-80
const landscapeSrc = "LocaliQ 2025 Home Services Benchmarks (Landscaping CTR 4.69% — lowest in home services); The Media Captain LSA data ($30-$80 CPL range)";
benchmarks.push(
  entry("landscaping", "Landscaping", "Lawn Care & Maintenance", 25, 40, 65, 200, 800, 1800, "Lower CPL for maintenance services. High volume, recurring revenue. Seasonal spring/summer peaks.", landscapeSrc, "medium"),
  entry("landscaping", "Landscaping", "Landscape Design", 50, 80, 130, 8000, 1500, 3500, "Higher CPL for design/install projects. High job value justifies cost.", landscapeSrc, "medium"),
  entry("landscaping", "Landscaping", "Tree & Shrub Care", 30, 50, 80, 500, 800, 1800, "Moderate CPL. Often bundled with lawn care for recurring clients.", landscapeSrc, "medium"),
  entry("landscaping", "Landscaping", "Hardscaping & Patios", 55, 90, 140, 6000, 1500, 3500, "Higher CPL for hardscape keywords. Construction-adjacent with high job value.", landscapeSrc, "medium"),
  entry("landscaping", "Landscaping", "Landscape Lighting", 35, 55, 85, 3000, 800, 2000, "Lower competition niche. Good conversion rates on specific intent keywords.", landscapeSrc, "medium"),
);

// ─── TREE SERVICE ───────────────────────────────────────
const treeSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; LSA data $20-$85/lead for tree-related services";
benchmarks.push(
  entry("tree-service", "Tree Service", "Tree Removal", 50, 85, 130, 1500, 1200, 2800, "Primary service. Storm-season CPCs spike significantly. LSA leads $35-$85.", treeSrc, "medium"),
  entry("tree-service", "Tree Service", "Tree Trimming", 35, 60, 90, 600, 800, 2000, "Lower CPL than removal. High volume in spring/summer.", treeSrc, "medium"),
  entry("tree-service", "Tree Service", "Stump Grinding", 25, 45, 70, 350, 600, 1500, "Lower CPL for specific service intent. Good add-on to removal leads.", treeSrc, "medium"),
  entry("tree-service", "Tree Service", "Emergency Tree Service", 60, 100, 150, 2000, 1000, 2500, "Premium CPL for emergency keywords. High conversion intent during storms.", treeSrc, "medium"),
);

// ─── PAINTING ───────────────────────────────────────────
// LocaliQ 2025: Paint & Painting highest CPC at $13.74
const paintSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Paint & Painting CPC $13.74 — highest CPC in home services)";
benchmarks.push(
  entry("painting", "Painting", "Interior Painting", 70, 110, 165, 3500, 1500, 3500, "High CPC ($13.74) but decent conversion. Residential interior is high-volume.", paintSrc, "medium"),
  entry("painting", "Painting", "Exterior Painting", 80, 125, 185, 5000, 1500, 3500, "Seasonal (spring/summer). Higher job value offsets premium CPL.", paintSrc, "medium"),
  entry("painting", "Painting", "Commercial Painting", 90, 140, 210, 15000, 2000, 5000, "B2B leads cost more but deliver much higher job values.", paintSrc, "medium"),
  entry("painting", "Painting", "Cabinet Painting", 60, 95, 145, 3000, 1000, 2500, "Niche within painting. Lower competition than general painting keywords.", paintSrc, "medium"),
);

// ─── FENCING ────────────────────────────────────────────
// Agency data: CPL $25-75 in season; home services umbrella
const fencingSrc = "WebTheory PPC Fence Company Google Ads data (CPL $25-$75 in season); LocaliQ 2025 Home Services Benchmarks";
benchmarks.push(
  entry("fencing", "Fencing", "Wood Fence Installation", 30, 55, 85, 4000, 800, 2000, "In-season CPL $25-$75 per WebTheory PPC data across fence companies. Wood is highest volume.", fencingSrc, "high"),
  entry("fencing", "Fencing", "Chain Link Fence", 20, 40, 65, 2500, 600, 1500, "Lower CPL than wood — less competitive keywords. Budget-focused customers.", fencingSrc, "medium"),
  entry("fencing", "Fencing", "Vinyl Fence Installation", 30, 55, 85, 5000, 800, 2000, "Similar CPL to wood fencing. Growing market segment with good margins.", fencingSrc, "medium"),
  entry("fencing", "Fencing", "Iron & Metal Fence", 35, 60, 95, 6000, 800, 2000, "Slightly higher CPL — premium product with higher job value.", fencingSrc, "medium"),
);

// ─── CONCRETE ───────────────────────────────────────────
const concreteSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67, CPC $5.31, CVR 2.61%)";
benchmarks.push(
  entry("concrete", "Concrete Services", "Concrete Driveways", 70, 115, 175, 5000, 1200, 3000, "Concrete falls under construction/contractors. CVR 2.61% drives CPL higher despite lower CPC.", concreteSrc, "medium"),
  entry("concrete", "Concrete Services", "Concrete Foundations", 90, 145, 220, 12000, 1500, 4000, "High-value commercial-adjacent service. CPL toward upper end of contractor benchmarks.", concreteSrc, "medium"),
  entry("concrete", "Concrete Services", "Concrete Repair", 50, 85, 130, 1500, 800, 2000, "Repair keywords convert better than installation, lowering CPL.", concreteSrc, "medium"),
  entry("concrete", "Concrete Services", "Decorative Concrete", 60, 100, 155, 4000, 1000, 2500, "Niche within concrete. Moderate competition with good conversion intent.", concreteSrc, "medium"),
);

// ─── STAMPED CONCRETE ───────────────────────────────────
const stampedSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors category)";
benchmarks.push(
  entry("stamped-concrete", "Stamped Concrete", "Stamped Concrete Patios", 60, 100, 155, 5000, 1000, 2500, "Niche specialty within concrete. Lower competition than general concrete.", stampedSrc, "medium"),
  entry("stamped-concrete", "Stamped Concrete", "Stamped Concrete Driveways", 65, 105, 160, 6000, 1000, 2500, "Higher job value. Moderate competition in suburban markets.", stampedSrc, "medium"),
  entry("stamped-concrete", "Stamped Concrete", "Stamped Concrete Repair", 45, 75, 115, 2000, 800, 1800, "Lower CPL for repair vs. installation keywords.", stampedSrc, "medium"),
);

// ─── EPOXY FLOORING ─────────────────────────────────────
const epoxySrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors category); flooring contractor benchmarks";
benchmarks.push(
  entry("epoxy-flooring", "Epoxy Flooring", "Garage Floor Epoxy", 50, 85, 130, 3000, 1000, 2500, "Strong consumer search volume. Lower CPL due to specific intent keywords.", epoxySrc, "medium"),
  entry("epoxy-flooring", "Epoxy Flooring", "Commercial Epoxy Flooring", 70, 115, 175, 15000, 1500, 3500, "B2B/commercial leads cost more but deliver much higher job values.", epoxySrc, "medium"),
  entry("epoxy-flooring", "Epoxy Flooring", "Epoxy Floor Coating", 55, 90, 140, 4000, 1000, 2500, "General coating keywords. Moderate competition.", epoxySrc, "medium"),
);

// ─── FLOORING ───────────────────────────────────────────
const flooringSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (home services avg CPL $90.92); Max Conversion flooring contractor data";
benchmarks.push(
  entry("flooring", "Flooring", "Hardwood Floor Installation", 65, 100, 155, 5000, 1200, 3000, "Mid-range CPL within home services. High job value for installation.", flooringSrc, "medium"),
  entry("flooring", "Flooring", "Carpet Installation", 50, 80, 125, 3000, 1000, 2500, "Lower CPL than hardwood — more price-sensitive market.", flooringSrc, "medium"),
  entry("flooring", "Flooring", "Tile Installation", 60, 95, 145, 4500, 1200, 3000, "Moderate CPL. Tile-specific keywords have decent conversion rates.", flooringSrc, "medium"),
  entry("flooring", "Flooring", "Floor Refinishing", 45, 75, 115, 2500, 800, 2000, "Lower CPL for refinishing vs. installation. Good conversion intent.", flooringSrc, "medium"),
  entry("flooring", "Flooring", "Vinyl & LVP Installation", 45, 70, 110, 3500, 1000, 2500, "Growing market segment. Lower competition than hardwood keywords.", flooringSrc, "medium"),
);

// ─── COUNTERTOPS ────────────────────────────────────────
const counterSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; home improvement category data";
benchmarks.push(
  entry("countertops", "Countertops", "Granite Countertops", 55, 90, 140, 4500, 1000, 2500, "Moderate CPL within home improvement. Strong consumer search volume.", counterSrc, "medium"),
  entry("countertops", "Countertops", "Quartz Countertops", 60, 95, 145, 5000, 1000, 2500, "Growing market. Slightly higher CPL due to premium product positioning.", counterSrc, "medium"),
  entry("countertops", "Countertops", "Marble Countertops", 65, 100, 155, 6000, 1200, 3000, "Premium market. Higher CPL but higher job values.", counterSrc, "medium"),
  entry("countertops", "Countertops", "Countertop Repair", 35, 55, 85, 800, 600, 1500, "Lower CPL for repair keywords. Lower job value but good lead volume.", counterSrc, "medium"),
);

// ─── WINDOW & DOOR ──────────────────────────────────────
// LocaliQ 2025: Doors & Windows Sales CPL $200.34
const windowSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Doors & Windows Sales CPL $200.34 — second highest in home services)";
benchmarks.push(
  entry("window-door", "Window & Door", "Window Replacement", 130, 200, 300, 8000, 2000, 5000, "LocaliQ 2025: $200.34 CPL for doors & windows. Highly competitive market.", windowSrc, "high"),
  entry("window-door", "Window & Door", "Door Installation", 100, 160, 240, 3500, 1500, 3500, "Slightly below window replacement CPL. Good conversion on specific door types.", windowSrc, "medium"),
  entry("window-door", "Window & Door", "Window Repair", 60, 100, 155, 500, 800, 2000, "Repair CPL significantly lower than replacement. Lower job value.", windowSrc, "medium"),
  entry("window-door", "Window & Door", "Sliding Door Installation", 90, 145, 220, 4000, 1500, 3500, "Specialty within doors. Moderate-high CPL.", windowSrc, "medium"),
);

// ─── SIDING ─────────────────────────────────────────────
const sidingSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; aligned with exterior renovation categories";
benchmarks.push(
  entry("siding", "Siding", "Vinyl Siding Installation", 80, 130, 195, 8000, 1500, 3500, "Exterior renovation category. CPL between painting and roofing.", sidingSrc, "medium"),
  entry("siding", "Siding", "Fiber Cement Siding", 85, 140, 210, 12000, 1500, 3500, "Premium product. Higher job value justifies higher CPL.", sidingSrc, "medium"),
  entry("siding", "Siding", "Siding Repair", 50, 80, 125, 1500, 800, 2000, "Lower CPL for repair keywords. Lower job value.", sidingSrc, "medium"),
);

// ─── GARAGE DOOR ────────────────────────────────────────
// LocaliQ 2025: Garages CPC $5.75
const garageSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Garages CPC $5.75)";
benchmarks.push(
  entry("garage-door", "Garage Door", "Garage Door Repair", 40, 65, 100, 400, 800, 2000, "Lower CPC ($5.75) drives moderate CPL. High-urgency emergency repairs.", garageSrc, "medium"),
  entry("garage-door", "Garage Door", "Garage Door Installation", 55, 90, 140, 2500, 1000, 2500, "Higher CPL than repair. Good job value for full installation.", garageSrc, "medium"),
  entry("garage-door", "Garage Door", "Garage Door Opener", 35, 55, 85, 500, 600, 1500, "Specific product-focused keywords. Lower CPL and job value.", garageSrc, "medium"),
  entry("garage-door", "Garage Door", "Commercial Garage Door", 60, 100, 155, 5000, 1200, 3000, "B2B leads. Higher CPL but much higher job value.", garageSrc, "medium"),
);

// ─── PAVING ─────────────────────────────────────────────
const pavingSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67)";
benchmarks.push(
  entry("paving", "Paving", "Asphalt Paving", 70, 115, 175, 5000, 1200, 3000, "Falls under construction/contractor benchmarks. Moderate competition.", pavingSrc, "medium"),
  entry("paving", "Paving", "Driveway Paving", 60, 100, 155, 4000, 1000, 2500, "Consumer-facing keywords convert better than commercial paving.", pavingSrc, "medium"),
  entry("paving", "Paving", "Parking Lot Paving", 80, 130, 200, 20000, 1500, 4000, "Commercial B2B leads. Higher CPL but very high job value.", pavingSrc, "medium"),
  entry("paving", "Paving", "Sealcoating", 40, 65, 100, 1500, 800, 1800, "Lower CPL for maintenance service. Good recurring revenue.", pavingSrc, "medium"),
);

// ─── FOUNDATION REPAIR ──────────────────────────────────
const foundationSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67); high-value specialty trade";
benchmarks.push(
  entry("foundation-repair", "Foundation Repair", "Foundation Crack Repair", 80, 130, 200, 5000, 1500, 3500, "High-urgency searches. CPL aligned with contractor benchmarks.", foundationSrc, "medium"),
  entry("foundation-repair", "Foundation Repair", "Foundation Leveling", 90, 150, 230, 10000, 2000, 4500, "High-value service. Premium CPL justified by job value.", foundationSrc, "medium"),
  entry("foundation-repair", "Foundation Repair", "Basement Waterproofing", 80, 130, 200, 7000, 1500, 3500, "Overlaps with waterproofing category. Seasonal demand.", foundationSrc, "medium"),
  entry("foundation-repair", "Foundation Repair", "Foundation Inspection", 50, 80, 125, 500, 800, 2000, "Lower CPL for inspection leads. Lead-in to repair projects.", foundationSrc, "medium"),
);

// ─── WATERPROOFING ──────────────────────────────────────
const waterSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; aligned with foundation/construction categories";
benchmarks.push(
  entry("waterproofing", "Waterproofing", "Basement Waterproofing", 80, 130, 200, 7000, 1500, 3500, "Seasonal demand (spring rains). CPL aligned with contractor benchmarks.", waterSrc, "medium"),
  entry("waterproofing", "Waterproofing", "Crawl Space Encapsulation", 75, 120, 185, 8000, 1500, 3500, "Growing specialty. Moderate competition with high job values.", waterSrc, "medium"),
  entry("waterproofing", "Waterproofing", "Exterior Waterproofing", 90, 145, 220, 10000, 2000, 4500, "Higher CPL for exterior work. Very high job values.", waterSrc, "medium"),
  entry("waterproofing", "Waterproofing", "French Drain Installation", 60, 100, 155, 4000, 1000, 2500, "Specific service with moderate competition.", waterSrc, "medium"),
);

// ─── DEMOLITION ─────────────────────────────────────────
const demoSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67, CPC $5.31)";
benchmarks.push(
  entry("demolition", "Demolition", "Residential Demolition", 70, 115, 175, 8000, 1200, 3000, "Lower CPC than most trades ($5.31) but low CVR drives CPL up.", demoSrc, "medium"),
  entry("demolition", "Demolition", "Commercial Demolition", 90, 150, 230, 50000, 2000, 5000, "B2B commercial leads. High value per project.", demoSrc, "medium"),
  entry("demolition", "Demolition", "Interior Demolition", 55, 90, 140, 3000, 1000, 2500, "More targeted niche with lower competition.", demoSrc, "medium"),
);

// ─── EXCAVATION ─────────────────────────────────────────
const excSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67)";
benchmarks.push(
  entry("excavation", "Excavation", "Site Excavation", 80, 130, 200, 10000, 1500, 3500, "Commercial/residential site prep. High job value.", excSrc, "medium"),
  entry("excavation", "Excavation", "Trenching", 60, 100, 155, 3000, 1000, 2500, "Specific service with moderate search volume.", excSrc, "medium"),
  entry("excavation", "Excavation", "Land Grading", 70, 115, 175, 5000, 1200, 3000, "Often bundled with site prep. Moderate CPL.", excSrc, "medium"),
);

// ─── WELDING ────────────────────────────────────────────
const weldSrc = "Derived from WordStream 2025 Business Services CPL $103.54; industrial/trade service category";
benchmarks.push(
  entry("welding", "Welding Services", "Mobile Welding", 50, 80, 125, 1000, 800, 2000, "Local service with lower competition than shop-based welding.", weldSrc, "medium"),
  entry("welding", "Welding Services", "Structural Welding", 65, 105, 160, 5000, 1200, 3000, "Commercial B2B service. Higher CPL justified by job value.", weldSrc, "medium"),
  entry("welding", "Welding Services", "Custom Fabrication Welding", 60, 95, 145, 3000, 1000, 2500, "Niche service combining welding + fabrication.", weldSrc, "medium"),
);

// ─── AUTO BODY ──────────────────────────────────────────
// WordStream 2025: Body Repair & Paint CPC $5.81; auto repair overall CPL $28.50
const autoBodySrc = "WordStream 2025 Google Ads Benchmarks (Auto Body Repair & Paint CPC $5.81; Automotive Repair overall CPL $28.50, CVR 14.67%)";
benchmarks.push(
  entry("auto-body", "Auto Body", "Collision Repair", 25, 40, 60, 3500, 1000, 2500, "Body Repair CPC $5.81 with strong CVR. CPL above auto repair avg due to higher CPC.", autoBodySrc, "high"),
  entry("auto-body", "Auto Body", "Auto Painting", 20, 35, 55, 2500, 800, 2000, "Good conversion rates in automotive. Moderate competition.", autoBodySrc, "medium"),
  entry("auto-body", "Auto Body", "Dent Repair", 15, 28, 45, 500, 600, 1500, "Low CPL aligned with automotive repair avg $28.50. Lower job value.", autoBodySrc, "high"),
);

// ─── TOWING ─────────────────────────────────────────────
const towingSrc = "Derived from WordStream 2025 Automotive Repair CPL $28.50; emergency service with high conversion intent";
benchmarks.push(
  entry("towing", "Towing", "Emergency Towing", 20, 35, 55, 200, 800, 1800, "Emergency-intent keywords convert extremely well. Low CPL.", towingSrc, "medium"),
  entry("towing", "Towing", "Long Distance Towing", 30, 50, 80, 500, 800, 2000, "Higher CPL for long-distance. Higher job value.", towingSrc, "medium"),
  entry("towing", "Towing", "Commercial Towing", 35, 55, 85, 800, 1000, 2500, "B2B/commercial fleet towing. Moderate CPL.", towingSrc, "medium"),
);

// ─── MOVING ─────────────────────────────────────────────
// Multiple sources: CPL $53-183; CPC $6.40-$11; SmartMoving 500 movers data
const movingSrc = "VibeAds 2026 Moving Google Ads Guide (CPC $6.40-$11, CPL $138-$183); SmartMoving data from 500 movers; INSIDEA Google Ads for Movers";
benchmarks.push(
  entry("moving", "Moving Services", "Local Moving", 80, 138, 200, 1500, 1500, 3500, "VibeAds 2026: good CPL target $138-$183. Peak season (May-Sept) drives costs up.", movingSrc, "high"),
  entry("moving", "Moving Services", "Long Distance Moving", 100, 165, 250, 4000, 2000, 5000, "Higher CPL for long-distance. Longer decision cycle but much higher job value.", movingSrc, "medium"),
  entry("moving", "Moving Services", "Commercial Moving", 110, 183, 270, 8000, 2000, 5000, "B2B leads at top of CPL range. Very high job values for office moves.", movingSrc, "high"),
);

// ─── JUNK REMOVAL ───────────────────────────────────────
const junkSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; 99calls.com junk removal lead data ($12.99-$30 for LSAs)";
benchmarks.push(
  entry("junk-removal", "Junk Removal", "Residential Junk Removal", 30, 50, 80, 400, 800, 1800, "Lower CPL category within home services. High conversion on urgent keywords.", junkSrc, "medium"),
  entry("junk-removal", "Junk Removal", "Commercial Junk Removal", 40, 65, 100, 1500, 1000, 2500, "B2B leads cost slightly more. Higher job values.", junkSrc, "medium"),
  entry("junk-removal", "Junk Removal", "Dumpster Rental", 35, 55, 85, 500, 800, 2000, "Specific service with strong intent keywords. Moderate CPL.", junkSrc, "medium"),
);

// ─── CLEANING ───────────────────────────────────────────
// LocaliQ 2025: Cleaning/Maid/Butler CPL $46.99
const cleanSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Cleaning/Maid/Butler CPL $46.99 — second-lowest CPL in home services)";
benchmarks.push(
  entry("cleaning", "Cleaning Services", "House Cleaning", 25, 40, 60, 200, 800, 1800, "Below-average CPL. High volume, strong conversion on local intent keywords.", cleanSrc, "high"),
  entry("cleaning", "Cleaning Services", "Deep Cleaning", 30, 47, 70, 400, 800, 2000, "Aligned with cleaning CPL $46.99. One-time service with moderate value.", cleanSrc, "high"),
  entry("cleaning", "Cleaning Services", "Commercial Cleaning", 40, 65, 100, 2000, 1200, 3000, "B2B leads cost more. Recurring contract value is very high.", cleanSrc, "medium"),
  entry("cleaning", "Cleaning Services", "Move-Out Cleaning", 25, 40, 65, 350, 600, 1500, "Seasonal alignment with moving. Good conversion rates.", cleanSrc, "medium"),
);

// ─── PRESSURE WASHING ───────────────────────────────────
const pressureSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; cleaning/maintenance subcategory";
benchmarks.push(
  entry("pressure-washing", "Pressure Washing", "House Washing", 30, 50, 80, 400, 800, 1800, "Lower CPL within home services. Strong local intent.", pressureSrc, "medium"),
  entry("pressure-washing", "Pressure Washing", "Driveway Pressure Washing", 25, 40, 65, 250, 600, 1500, "Specific service keywords with good conversion.", pressureSrc, "medium"),
  entry("pressure-washing", "Pressure Washing", "Commercial Pressure Washing", 40, 65, 100, 2000, 1000, 2500, "B2B leads. Higher CPL but recurring contracts.", pressureSrc, "medium"),
  entry("pressure-washing", "Pressure Washing", "Deck & Fence Washing", 25, 40, 65, 300, 600, 1500, "Add-on service. Lower CPL and job value.", pressureSrc, "medium"),
);

// ─── RESTORATION ────────────────────────────────────────
const restoreSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; emergency/restoration services category";
benchmarks.push(
  entry("restoration", "Restoration", "Water Damage Restoration", 80, 130, 200, 5000, 1500, 3500, "Emergency-intent keywords. Insurance-backed jobs have high value.", restoreSrc, "medium"),
  entry("restoration", "Restoration", "Fire Damage Restoration", 90, 145, 220, 15000, 2000, 5000, "High CPL but very high job value. Insurance-driven.", restoreSrc, "medium"),
  entry("restoration", "Restoration", "Storm Damage Restoration", 85, 140, 210, 8000, 1500, 4000, "Seasonal surges during storm events. CPCs can spike significantly.", restoreSrc, "medium"),
  entry("restoration", "Restoration", "Mold Remediation", 70, 115, 175, 4000, 1200, 3000, "Often bundled with water damage. Moderate-high CPL.", restoreSrc, "medium"),
);

// ─── MOLD REMEDIATION ───────────────────────────────────
const moldSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; specialty remediation services";
benchmarks.push(
  entry("mold-remediation", "Mold Remediation", "Mold Testing", 40, 65, 100, 500, 800, 1800, "Lower CPL for testing/inspection. Lead-in to remediation.", moldSrc, "medium"),
  entry("mold-remediation", "Mold Remediation", "Mold Removal", 70, 115, 175, 4000, 1500, 3500, "Core service. Moderate-high CPL for remediation keywords.", moldSrc, "medium"),
  entry("mold-remediation", "Mold Remediation", "Black Mold Remediation", 80, 130, 200, 6000, 1500, 3500, "High-urgency keywords command premium CPCs.", moldSrc, "medium"),
);

// ─── INSULATION ─────────────────────────────────────────
const insulSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (home services avg CPL $90.92)";
benchmarks.push(
  entry("insulation", "Insulation", "Attic Insulation", 50, 80, 125, 2500, 1000, 2500, "Mid-range CPL within home services. Energy-efficiency interest growing.", insulSrc, "medium"),
  entry("insulation", "Insulation", "Spray Foam Insulation", 55, 90, 140, 4000, 1000, 2500, "Premium product. Moderate competition with growing demand.", insulSrc, "medium"),
  entry("insulation", "Insulation", "Blown-In Insulation", 45, 75, 115, 2000, 800, 2000, "Lower CPL for common insulation type.", insulSrc, "medium"),
);

// ─── SOLAR ──────────────────────────────────────────────
const solarSrc = "Derived from WordStream 2025 Home & Home Improvement benchmarks; solar industry is highly competitive with high LTV";
benchmarks.push(
  entry("solar", "Solar", "Solar Panel Installation", 100, 165, 250, 25000, 2500, 6000, "Highly competitive. High CPCs but massive job value justifies costs.", solarSrc, "medium"),
  entry("solar", "Solar", "Solar Battery Storage", 80, 130, 200, 15000, 1500, 3500, "Growing market segment. Lower competition than panels.", solarSrc, "medium"),
  entry("solar", "Solar", "Solar Maintenance", 40, 65, 100, 500, 800, 1800, "Lower CPL for maintenance. Recurring revenue from existing installations.", solarSrc, "medium"),
);

// ─── HOME SECURITY ──────────────────────────────────────
const securitySrc = "Derived from WordStream 2025 Google Ads Benchmarks (Home & Home Improvement category)";
benchmarks.push(
  entry("home-security", "Home Security", "Security System Installation", 60, 95, 145, 2000, 1200, 3000, "Moderate CPL. Mix of residential and commercial leads.", securitySrc, "medium"),
  entry("home-security", "Home Security", "Security Camera Installation", 50, 80, 125, 1500, 1000, 2500, "Growing market. Good conversion on specific product keywords.", securitySrc, "medium"),
  entry("home-security", "Home Security", "Smart Home Security", 55, 90, 140, 2500, 1200, 3000, "Technology-forward keywords with growing search volume.", securitySrc, "medium"),
);

// ─── LOCKSMITH ──────────────────────────────────────────
const lockSrc = "Derived from WordStream 2025 Automotive Repair CPL $28.50 (emergency service); LSA data $20-$85/lead";
benchmarks.push(
  entry("locksmith", "Locksmith", "Emergency Lockout", 20, 35, 55, 150, 800, 1800, "High-urgency keywords convert extremely well. Low CPL.", lockSrc, "medium"),
  entry("locksmith", "Locksmith", "Lock Rekeying", 20, 30, 50, 200, 600, 1500, "Lower CPL for specific service. Good conversion intent.", lockSrc, "medium"),
  entry("locksmith", "Locksmith", "Commercial Locksmith", 30, 50, 80, 800, 800, 2000, "B2B leads cost more. Higher job value for commercial.", lockSrc, "medium"),
);

// ─── APPLIANCE REPAIR ───────────────────────────────────
// Closest to automotive repair category — service-based with good conversion
const applianceSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; Appliance Marketing Pros 2026 cost per lead analysis";
benchmarks.push(
  entry("appliance-repair", "Appliance Repair", "Refrigerator Repair", 35, 55, 85, 350, 800, 2000, "Good conversion rates on emergency keywords. Below home services avg CPL.", applianceSrc, "medium"),
  entry("appliance-repair", "Appliance Repair", "Washer/Dryer Repair", 30, 50, 80, 250, 800, 1800, "High search volume. Lower job value but steady demand.", applianceSrc, "medium"),
  entry("appliance-repair", "Appliance Repair", "Oven/Range Repair", 30, 50, 80, 300, 800, 1800, "Similar CPL to other appliance repair services.", applianceSrc, "medium"),
  entry("appliance-repair", "Appliance Repair", "Dishwasher Repair", 30, 50, 80, 250, 600, 1500, "Lower CPL for specific appliance keywords.", applianceSrc, "medium"),
);

// ─── DRYWALL ────────────────────────────────────────────
const drywallSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Construction & Contractors CPL $165.67)";
benchmarks.push(
  entry("drywall", "Drywall", "Drywall Installation", 60, 100, 155, 3000, 1000, 2500, "Falls under construction/contractor category. Moderate competition.", drywallSrc, "medium"),
  entry("drywall", "Drywall", "Drywall Repair", 40, 65, 100, 500, 600, 1500, "Lower CPL for repair. High conversion on local intent.", drywallSrc, "medium"),
  entry("drywall", "Drywall", "Drywall Texturing", 45, 75, 115, 1500, 800, 2000, "Specialty within drywall. Lower competition.", drywallSrc, "medium"),
);

// ─── CABINETRY ──────────────────────────────────────────
const cabSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; kitchen remodeling category";
benchmarks.push(
  entry("cabinetry", "Cabinetry", "Custom Cabinets", 70, 115, 175, 10000, 1500, 3500, "High job value. CPL aligned with home improvement benchmarks.", cabSrc, "medium"),
  entry("cabinetry", "Cabinetry", "Cabinet Refacing", 55, 90, 140, 5000, 1000, 2500, "Lower CPL than custom cabinets. Good conversion.", cabSrc, "medium"),
  entry("cabinetry", "Cabinetry", "Cabinet Installation", 60, 95, 145, 6000, 1200, 3000, "Moderate CPL for installation keywords.", cabSrc, "medium"),
);

// ─── GLASS (Commercial Glass Services) ──────────────────
// WordStream 2025: Automotive Glass Repair CPC $6.89
const glassSrc = "WordStream 2025 Google Ads Benchmarks (Automotive Glass Repair CPC $6.89); LocaliQ 2025 Home Services Benchmarks";
benchmarks.push(
  entry("glass", "Glass Services", "Commercial Glass Installation", 65, 105, 160, 8000, 1500, 3500, "B2B commercial glass. Higher CPL but high job value.", glassSrc, "medium"),
  entry("glass", "Glass Services", "Glass Repair & Replacement", 35, 55, 85, 500, 800, 2000, "Auto glass CPC $6.89 (WordStream). Good conversion rates.", glassSrc, "high"),
  entry("glass", "Glass Services", "Storefront Glass", 70, 115, 175, 5000, 1200, 3000, "Commercial B2B. Higher CPL for storefront/commercial keywords.", glassSrc, "medium"),
);

// ─── IRRIGATION ─────────────────────────────────────────
const irrigSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; landscaping-adjacent category";
benchmarks.push(
  entry("irrigation", "Irrigation", "Sprinkler Installation", 40, 65, 100, 3500, 1000, 2500, "Seasonal demand (spring). Moderate CPL within landscaping category.", irrigSrc, "medium"),
  entry("irrigation", "Irrigation", "Sprinkler Repair", 30, 50, 80, 300, 600, 1500, "Lower CPL for repair. High local intent.", irrigSrc, "medium"),
  entry("irrigation", "Irrigation", "Drip Irrigation", 35, 55, 85, 2000, 800, 2000, "Niche within irrigation. Lower competition.", irrigSrc, "medium"),
  entry("irrigation", "Irrigation", "Irrigation System Design", 50, 80, 125, 5000, 1000, 2500, "Higher CPL for design/planning keywords.", irrigSrc, "medium"),
);

// ─── WELL SERVICE ───────────────────────────────────────
const wellSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; niche service with lower online competition";
benchmarks.push(
  entry("well-service", "Well Service", "Well Drilling", 70, 115, 175, 10000, 1500, 3500, "High job value. Lower digital competition in rural markets.", wellSrc, "medium"),
  entry("well-service", "Well Service", "Well Pump Repair", 45, 75, 115, 1500, 800, 2000, "Emergency/repair intent converts well. Moderate CPL.", wellSrc, "medium"),
  entry("well-service", "Well Service", "Well Inspection", 30, 50, 80, 500, 600, 1500, "Lower CPL for inspection. Real estate transaction-driven.", wellSrc, "medium"),
);

// ─── PROPANE ────────────────────────────────────────────
const propaneSrc = "Derived from WordStream 2025 Google Ads Benchmarks; energy services category";
benchmarks.push(
  entry("propane", "Propane Services", "Propane Delivery", 25, 40, 65, 500, 800, 1800, "Lower CPL for delivery service. Recurring customer base.", propaneSrc, "medium"),
  entry("propane", "Propane Services", "Propane Tank Installation", 50, 80, 125, 3000, 1000, 2500, "Higher CPL for installation. High job value.", propaneSrc, "medium"),
  entry("propane", "Propane Services", "Propane System Service", 30, 50, 80, 400, 600, 1500, "Maintenance/repair. Lower CPL.", propaneSrc, "medium"),
);

// ─── MARINE ─────────────────────────────────────────────
const marineSrc = "Derived from WordStream 2025 Google Ads Benchmarks (Automotive category); marine/boat service is niche with lower digital competition";
benchmarks.push(
  entry("marine", "Marine Services", "Boat Repair", 35, 55, 85, 2000, 1000, 2500, "Niche market with seasonal demand. Lower CPL than automotive average.", marineSrc, "medium"),
  entry("marine", "Marine Services", "Marine Engine Service", 40, 65, 100, 3000, 1000, 2500, "Specialized service. Moderate CPL with good job values.", marineSrc, "medium"),
  entry("marine", "Marine Services", "Boat Detailing", 25, 40, 65, 500, 600, 1500, "Lower CPL for consumer service. Seasonal (spring/summer).", marineSrc, "medium"),
);

// ─── HEAVY EQUIPMENT ────────────────────────────────────
const heavySrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B/industrial equipment category";
benchmarks.push(
  entry("heavy-equipment", "Heavy Equipment", "Equipment Rental", 55, 90, 140, 5000, 1500, 3500, "B2B leads. Moderate CPL with high rental values.", heavySrc, "medium"),
  entry("heavy-equipment", "Heavy Equipment", "Equipment Repair", 50, 80, 125, 3000, 1000, 2500, "Lower CPL for repair services. Good local intent.", heavySrc, "medium"),
  entry("heavy-equipment", "Heavy Equipment", "Equipment Sales", 70, 115, 175, 50000, 2000, 5000, "Higher CPL justified by very high transaction values.", heavySrc, "medium"),
);

// ─── COMMERCIAL KITCHEN ─────────────────────────────────
const ckSrc = "Derived from WordStream 2025 Business Services CPL $103.54; commercial services category";
benchmarks.push(
  entry("commercial-kitchen", "Commercial Kitchen", "Kitchen Equipment Repair", 50, 80, 125, 1500, 1000, 2500, "B2B commercial. Emergency repairs have high conversion intent.", ckSrc, "medium"),
  entry("commercial-kitchen", "Commercial Kitchen", "Kitchen Equipment Installation", 65, 105, 160, 10000, 1500, 3500, "Higher CPL for installation. Very high job value.", ckSrc, "medium"),
  entry("commercial-kitchen", "Commercial Kitchen", "Kitchen Hood Cleaning", 40, 65, 100, 800, 800, 2000, "Compliance-driven service. Moderate CPL.", ckSrc, "medium"),
);

// ─── SIGN & GRAPHICS (existing sign-wraps) ──────────────
const signSrc = "Derived from WordStream 2025 Google Ads Benchmarks (all-industry avg CPL $70.11); estimated from B2B services benchmarks";
benchmarks.push(
  entry("sign-wraps", "Signs & Graphics", "Vehicle Wraps", 35, 55, 85, 3500, 1000, 2500, "Consumer and fleet wraps. Moderate CPL for visual service.", signSrc, "medium"),
  entry("sign-wraps", "Signs & Graphics", "Business Signage", 40, 65, 100, 2500, 1000, 2500, "B2B local service. CPL near all-industry average.", signSrc, "medium"),
  entry("sign-wraps", "Signs & Graphics", "Custom Signs & Banners", 30, 50, 80, 1500, 800, 2000, "Lower CPL for consumer-focused sign products.", signSrc, "medium"),
  entry("sign-wraps", "Signs & Graphics", "Graphic Design & Print", 35, 55, 85, 2000, 800, 2000, "Bundled service offering. Moderate CPL.", signSrc, "medium"),
);

// ─── POWDER COATING ─────────────────────────────────────
const powderSrc = "Derived from WordStream 2025 Business Services benchmarks; niche industrial service";
benchmarks.push(
  entry("powder-coating", "Powder Coating", "Powder Coating Services", 40, 65, 100, 1500, 800, 2000, "Niche industrial service. Lower competition drives moderate CPL.", powderSrc, "medium"),
  entry("powder-coating", "Powder Coating", "Custom Powder Coating", 45, 70, 110, 2000, 800, 2000, "Slightly higher CPL for custom/specialty work.", powderSrc, "medium"),
  entry("powder-coating", "Powder Coating", "Industrial Powder Coating", 55, 90, 140, 5000, 1200, 3000, "B2B industrial. Higher CPL and job value.", powderSrc, "medium"),
);

// ─── METAL ROOFING ──────────────────────────────────────
const metalRoofSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (Roofing & Gutters CPL $228.15); metal roofing is premium subcategory";
benchmarks.push(
  entry("metal-roofing", "Metal Roofing", "Metal Roof Installation", 150, 240, 360, 15000, 2500, 6000, "Premium above roofing avg $228.15 due to higher keyword competition. Very high job value.", metalRoofSrc, "medium"),
  entry("metal-roofing", "Metal Roofing", "Metal Roof Repair", 80, 130, 200, 2000, 1200, 3000, "Lower CPL for repair vs. installation.", metalRoofSrc, "medium"),
  entry("metal-roofing", "Metal Roofing", "Standing Seam Metal Roof", 160, 250, 380, 20000, 2500, 6000, "Premium product keywords. Highest CPL within roofing.", metalRoofSrc, "medium"),
);

// ─── ARTIFICIAL TURF ────────────────────────────────────
const turfSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; landscaping-adjacent specialty";
benchmarks.push(
  entry("artificial-turf", "Artificial Turf", "Artificial Turf Installation", 55, 90, 140, 6000, 1200, 3000, "Growing niche. Moderate CPL with good job values.", turfSrc, "medium"),
  entry("artificial-turf", "Artificial Turf", "Putting Green Installation", 60, 95, 145, 8000, 1200, 3000, "Premium product. Slightly higher CPL.", turfSrc, "medium"),
  entry("artificial-turf", "Artificial Turf", "Pet Turf Installation", 45, 75, 115, 3000, 800, 2000, "Consumer-focused niche. Lower CPL.", turfSrc, "medium"),
);

// ─── MACHINING / MACHINE WORKS ──────────────────────────
const machineSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B manufacturing/industrial benchmarks";
benchmarks.push(
  entry("machining", "Machine Works", "CNC Machining", 60, 100, 155, 5000, 1500, 3500, "B2B industrial. CPL aligned with business services benchmarks.", machineSrc, "medium"),
  entry("machining", "Machine Works", "Precision Machining", 65, 105, 160, 8000, 1500, 3500, "Higher-value precision work. Moderate competition in B2B space.", machineSrc, "medium"),
  entry("machining", "Machine Works", "Custom Parts Manufacturing", 70, 115, 175, 10000, 1500, 4000, "Custom work commands premium CPL. High job values.", machineSrc, "medium"),
  entry("machining", "Machine Works", "Machine Repair & Service", 50, 80, 125, 3000, 1000, 2500, "Lower CPL for repair/maintenance. Good B2B recurring revenue.", machineSrc, "medium"),
  entry("machining", "Machine Works", "Prototype Manufacturing", 75, 120, 180, 15000, 2000, 5000, "High-value B2B. Longer sales cycle justifies higher CPL.", machineSrc, "medium"),
);

// ═══════════════════════════════════════════════════════════
// NEW INDUSTRIES — Client-specific additions
// ═══════════════════════════════════════════════════════════

// ─── HOME BUILDERS ──────────────────────────────────────
const builderSrc = "ASTRALCOM 2025 Homebuilder Digital Advertising Benchmarks (avg cost/conversion $193.75); FatCat Strategies 2026 (paid lead CPL $135); LocaliQ 2025 (Construction CPL $165.67)";
benchmarks.push(
  entry("home-builders", "Home Builders", "Custom Home Building", 135, 194, 300, 350000, 5000, 15000, "ASTRALCOM 2025: avg cost per conversion $193.75 for homebuilders. Very high job value justifies premium CPL.", builderSrc, "high"),
  entry("home-builders", "Home Builders", "New Home Construction", 120, 175, 270, 300000, 5000, 12000, "FatCat 2026: paid leads ~$135. New construction is highly competitive in digital.", builderSrc, "high"),
  entry("home-builders", "Home Builders", "Home Remodeling", 90, 150, 230, 50000, 3000, 8000, "BGCollective 2026: remodeler CPL $150-$400. Moderate-high range for remodeling.", builderSrc, "medium"),
  entry("home-builders", "Home Builders", "Home Additions", 100, 165, 250, 75000, 3000, 8000, "Aligned with construction/contractor CPL $165.67 (LocaliQ 2025). High job value.", builderSrc, "medium"),
);

// ─── AUTO SHIPPING / TRANSPORT ──────────────────────────
const autoShipSrc = "Auto Transport Broker Leads PPC data (CPL $50-$115 per conversion); WordStream 2025 Automotive For Sale CPL $38.86";
benchmarks.push(
  entry("auto-shipping", "Auto Shipping Services", "Vehicle Transport", 50, 85, 130, 1200, 1500, 3500, "Auto transport PPC data: $50-$115 CPL. High-intent quotes keywords.", autoShipSrc, "high"),
  entry("auto-shipping", "Auto Shipping Services", "Long Distance Auto Shipping", 60, 100, 150, 1500, 1500, 3500, "Higher CPL for long-distance routes. Competitive market.", autoShipSrc, "medium"),
  entry("auto-shipping", "Auto Shipping Services", "Enclosed Auto Transport", 70, 115, 170, 2000, 1500, 3500, "Premium service. Higher CPL justified by higher rates.", autoShipSrc, "medium"),
);

// ─── CUSTOM ENGINE SERVICES ─────────────────────────────
const engineSrc = "Derived from WordStream 2025 Automotive Repair CPL $28.50, Body Repair CPC $5.81; performance/custom shops are niche with premium pricing";
benchmarks.push(
  entry("custom-engine", "Custom Engine Services", "Engine Building & Performance", 40, 65, 100, 8000, 1200, 3000, "Niche within automotive. Lower competition but enthusiast market.", engineSrc, "medium"),
  entry("custom-engine", "Custom Engine Services", "Engine Repair & Rebuild", 30, 50, 80, 4000, 1000, 2500, "Closer to auto repair avg CPL $28.50. Good conversion on urgent keywords.", engineSrc, "medium"),
  entry("custom-engine", "Custom Engine Services", "Performance Tuning", 35, 55, 85, 3000, 800, 2000, "Enthusiast market with specific intent. Moderate CPL.", engineSrc, "medium"),
);

// ─── RECYCLING SERVICES ─────────────────────────────────
const recycleSrc = "Derived from WordStream 2025 all-industry avg CPL $70.11; waste/recycling estimated from home services and B2B benchmarks";
benchmarks.push(
  entry("recycling", "Recycling Services", "Commercial Recycling", 40, 65, 100, 2000, 1000, 2500, "B2B service. Lower digital competition in recycling niche.", recycleSrc, "medium"),
  entry("recycling", "Recycling Services", "Electronic Waste Recycling", 30, 50, 80, 500, 800, 1800, "Consumer and B2B. Growing market with moderate competition.", recycleSrc, "medium"),
  entry("recycling", "Recycling Services", "Scrap Metal Recycling", 25, 40, 65, 1000, 600, 1500, "Lower CPL. Price-driven market with local intent.", recycleSrc, "medium"),
);

// ─── WASTE SERVICES ─────────────────────────────────────
const wasteSrc = "Derived from LocaliQ 2025 Home Services Benchmarks; waste management estimated CPL $30-$80 based on service type";
benchmarks.push(
  entry("waste", "Waste Services", "Commercial Waste Collection", 40, 65, 100, 3000, 1200, 3000, "B2B service. Recurring contract value is high. Moderate CPL.", wasteSrc, "medium"),
  entry("waste", "Waste Services", "Dumpster Rental", 30, 50, 80, 500, 800, 2000, "Consumer and B2B. Strong local intent keywords.", wasteSrc, "medium"),
  entry("waste", "Waste Services", "Hazardous Waste Disposal", 55, 90, 140, 5000, 1500, 3500, "Specialized B2B. Higher CPL but high-value contracts.", wasteSrc, "medium"),
);

// ─── INSTALLATION SERVICES (Office Moving / FF&E) ───────
const installSrc = "Derived from VibeAds 2026 Moving Google Ads data (commercial CPL $183); LocaliQ 2025 Home Services Benchmarks";
benchmarks.push(
  entry("installation", "Installation Services", "Office Furniture Installation", 70, 115, 175, 5000, 1500, 3500, "B2B commercial. Aligned with commercial moving CPL $183.", installSrc, "medium"),
  entry("installation", "Installation Services", "Office Relocation Services", 80, 135, 200, 10000, 2000, 5000, "Higher CPL for full relocation. Very high job value.", installSrc, "medium"),
  entry("installation", "Installation Services", "Equipment Installation", 60, 100, 155, 8000, 1500, 3500, "B2B. Moderate CPL with high job values.", installSrc, "medium"),
);

// ─── PRINTING SERVICES ──────────────────────────────────
const printSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B printing is moderate-competition niche";
benchmarks.push(
  entry("printing", "Printing Services", "Commercial Printing", 45, 75, 115, 3000, 1000, 2500, "B2B service. Lower CPL than business services avg due to niche market.", printSrc, "medium"),
  entry("printing", "Printing Services", "Large Format Printing", 40, 65, 100, 2000, 800, 2000, "Moderate CPL for specific service keywords.", printSrc, "medium"),
  entry("printing", "Printing Services", "Custom Business Printing", 35, 55, 85, 1500, 800, 2000, "Consumer and B2B. Lower CPL for card/brochure keywords.", printSrc, "medium"),
);

// ─── BOLT SERVICES ──────────────────────────────────────
const boltSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B industrial supply category";
benchmarks.push(
  entry("bolt-services", "Bolt Services", "Industrial Fastener Supply", 50, 80, 125, 5000, 1200, 3000, "B2B industrial supply. Niche with lower digital competition.", boltSrc, "medium"),
  entry("bolt-services", "Bolt Services", "Custom Bolt Manufacturing", 60, 100, 155, 10000, 1500, 3500, "Custom manufacturing B2B. Higher CPL but high order values.", boltSrc, "medium"),
  entry("bolt-services", "Bolt Services", "Bolt & Fastener Distribution", 45, 70, 110, 3000, 1000, 2500, "Distribution model. Moderate CPL with recurring orders.", boltSrc, "medium"),
);

// ─── ENGINEERING SERVICES ───────────────────────────────
const engSrc = "Derived from WordStream 2025 Business Services CPL $103.54; Flyweel 2025 B2B Professional Services CPL $80-$130";
benchmarks.push(
  entry("engineering", "Engineering Services", "Environmental Engineering", 80, 130, 200, 25000, 2000, 5000, "B2B professional service. High CPL justified by high contract values.", engSrc, "medium"),
  entry("engineering", "Engineering Services", "Naval & Marine Engineering", 90, 145, 220, 50000, 2500, 6000, "Highly specialized niche. Low search volume but very high contract values.", engSrc, "medium"),
  entry("engineering", "Engineering Services", "Civil Engineering", 75, 120, 185, 30000, 2000, 5000, "B2B. Moderate competition in professional services space.", engSrc, "medium"),
  entry("engineering", "Engineering Services", "Mechanical Engineering", 80, 130, 200, 20000, 2000, 5000, "B2B professional service. Moderate-high CPL.", engSrc, "medium"),
);

// ─── STRUCTURAL ENGINEERS ───────────────────────────────
const structSrc = "Derived from WordStream 2025 Business Services CPL $103.54; Flyweel 2025 Professional Services CPL $80-$130";
benchmarks.push(
  entry("structural-engineers", "Structural Engineers", "Residential Structural Engineering", 70, 115, 175, 5000, 1500, 3500, "B2B professional service. Residential projects have moderate CPL.", structSrc, "medium"),
  entry("structural-engineers", "Structural Engineers", "Commercial Structural Engineering", 90, 145, 220, 30000, 2000, 5000, "Higher CPL for commercial projects. Very high contract values.", structSrc, "medium"),
  entry("structural-engineers", "Structural Engineers", "Structural Inspections", 50, 80, 125, 2000, 1000, 2500, "Lower CPL for inspection leads. Often lead-in to larger projects.", structSrc, "medium"),
);

// ─── TILE CONTRACTOR ────────────────────────────────────
const tileSrc = "Derived from LocaliQ 2025 Home Services Benchmarks (avg CPL $90.92, Construction CPL $165.67); flooring contractor benchmarks";
benchmarks.push(
  entry("tile-contractor", "Tile Contractor", "Tile Floor Installation", 60, 95, 150, 4500, 1200, 3000, "Home services CPL range. Tile-specific keywords convert well.", tileSrc, "medium"),
  entry("tile-contractor", "Tile Contractor", "Bathroom Tile Installation", 65, 105, 160, 5000, 1200, 3000, "Bathroom remodel-adjacent. Moderate-high CPL.", tileSrc, "medium"),
  entry("tile-contractor", "Tile Contractor", "Kitchen Backsplash Installation", 50, 80, 125, 2500, 800, 2000, "Lower CPL for smaller projects. Good conversion intent.", tileSrc, "medium"),
  entry("tile-contractor", "Tile Contractor", "Tile Repair", 35, 55, 85, 500, 600, 1500, "Lower CPL for repair keywords. Lower job value.", tileSrc, "medium"),
);

// ─── LODGING ────────────────────────────────────────────
const lodgingSrc = "PPC Chief 2026 Travel & Hospitality Benchmarks (CPC $2.12, CTR 8.7%, CVR 5.8%, CPL $74); WordStream 2025 Travel category";
benchmarks.push(
  entry("lodging", "Lodging", "Hotel & Motel Advertising", 45, 74, 115, 150, 1500, 4000, "PPC Chief 2026: Travel & Hospitality CPL $74. Low CPC $2.12 but booking model differs from lead gen.", lodgingSrc, "high"),
  entry("lodging", "Lodging", "Vacation Rental Marketing", 40, 65, 100, 200, 1200, 3000, "Lower CPL for vacation rentals. Direct booking focus.", lodgingSrc, "medium"),
  entry("lodging", "Lodging", "Resort & Lodge Marketing", 50, 80, 125, 300, 2000, 5000, "Higher CPL for premium lodging. Higher booking values.", lodgingSrc, "medium"),
);

// ─── CONSTRUCTION SERVICES ──────────────────────────────
// LocaliQ 2025: Construction & Contractors CPL $165.67, CPC $5.31, CVR 2.61%
const constSrc = "LocaliQ 2025 Home Services Search Ad Benchmarks (Construction & Contractors CPL $165.67, CPC $5.31, CVR 2.61% — lowest CVR in home services)";
benchmarks.push(
  entry("construction", "Construction Services", "General Contracting", 100, 166, 250, 50000, 3000, 8000, "LocaliQ 2025: Construction CPL $165.67 with only 2.61% CVR. High job value.", constSrc, "high"),
  entry("construction", "Construction Services", "Commercial Construction", 120, 195, 300, 200000, 5000, 12000, "Above average CPL for commercial. Very high project values.", constSrc, "medium"),
  entry("construction", "Construction Services", "Renovation & Remodeling", 90, 150, 230, 35000, 2500, 6000, "Moderate-high CPL aligned with contractor benchmarks.", constSrc, "medium"),
  entry("construction", "Construction Services", "Tenant Improvement", 100, 165, 250, 80000, 3000, 8000, "B2B commercial. High CPL but very high project values.", constSrc, "medium"),
);

// ─── MOTOR GROUPS / AUTO DEALERSHIPS ────────────────────
const motorSrc = "WordStream 2025 Google Ads Benchmarks (Automotive For Sale CPC $2.41, CVR 7.76%, CPL $38.86); LocaliQ 2026 Automotive Benchmarks";
benchmarks.push(
  entry("motor-groups", "Motor Groups", "New Vehicle Sales", 25, 39, 60, 2500, 3000, 8000, "WordStream 2025: Auto For Sale CPL $38.86. Vehicle Listing Ads achieve 67% lower CPC.", motorSrc, "high"),
  entry("motor-groups", "Motor Groups", "Used Vehicle Sales", 20, 35, 55, 1500, 2000, 5000, "Lower CPL for used vehicles. Higher volume searches.", motorSrc, "high"),
  entry("motor-groups", "Motor Groups", "Vehicle Service & Parts", 15, 28, 45, 500, 1500, 3500, "WordStream 2025: Auto Repair CPL $28.50, CVR 14.67% — lowest CPL across all industries.", motorSrc, "high"),
  entry("motor-groups", "Motor Groups", "Vehicle Financing", 30, 50, 80, 1200, 2000, 5000, "Finance leads. Moderate CPL with good lifetime value.", motorSrc, "medium"),
);

// ─── DISTRIBUTION SERVICES ──────────────────────────────
const distSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B logistics/distribution estimated CPC $2-$6";
benchmarks.push(
  entry("distribution", "Distribution Services", "Wholesale Distribution", 50, 80, 125, 10000, 1500, 3500, "B2B distribution. Lower digital competition. High order values.", distSrc, "medium"),
  entry("distribution", "Distribution Services", "Freight & Logistics", 60, 100, 155, 5000, 1500, 3500, "Moderate CPL for logistics keywords. B2B market.", distSrc, "medium"),
  entry("distribution", "Distribution Services", "Last Mile Delivery", 45, 70, 110, 3000, 1000, 2500, "Growing market. Moderate CPL.", distSrc, "medium"),
);

// ─── SURVEYING COMPANIES ────────────────────────────────
const surveySrc = "Derived from WordStream 2025 Business Services CPL $103.54; professional services B2B benchmarks CPL $80-$130";
benchmarks.push(
  entry("surveying", "Surveying Companies", "Land Surveying", 50, 80, 125, 3000, 1000, 2500, "B2B professional service. Lower competition than legal/financial services.", surveySrc, "medium"),
  entry("surveying", "Surveying Companies", "Construction Surveying", 60, 100, 155, 5000, 1200, 3000, "Construction-adjacent. Moderate CPL for B2B.", surveySrc, "medium"),
  entry("surveying", "Surveying Companies", "Boundary Survey", 40, 65, 100, 1500, 800, 2000, "Consumer-facing surveys. Lower CPL with good local intent.", surveySrc, "medium"),
);

// ─── METAL FABRICATORS ──────────────────────────────────
const metalFabSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B manufacturing benchmarks CPL $75-$150";
benchmarks.push(
  entry("metal-fabrication", "Metal Fabricators", "Custom Metal Fabrication", 65, 105, 160, 10000, 1500, 3500, "B2B manufacturing. Moderate CPL with high order values.", metalFabSrc, "medium"),
  entry("metal-fabrication", "Metal Fabricators", "Structural Steel Fabrication", 75, 120, 185, 50000, 2000, 5000, "High-value B2B projects. Higher CPL justified by contract value.", metalFabSrc, "medium"),
  entry("metal-fabrication", "Metal Fabricators", "Sheet Metal Work", 55, 90, 140, 5000, 1200, 3000, "Lower CPL for general sheet metal. Good B2B keywords.", metalFabSrc, "medium"),
);

// ─── SERVICE CABLING ────────────────────────────────────
const cableSrc = "Derived from WordStream 2025 Business Services CPL $103.54; contractor/IT services benchmarks CPC $5-$20";
benchmarks.push(
  entry("service-cabling", "Service Cabling", "Structured Cabling Installation", 55, 90, 140, 8000, 1500, 3500, "B2B/commercial. Moderate CPL for contractor-oriented keywords.", cableSrc, "medium"),
  entry("service-cabling", "Service Cabling", "Network Cabling", 50, 80, 125, 5000, 1200, 3000, "IT infrastructure service. Good B2B conversion intent.", cableSrc, "medium"),
  entry("service-cabling", "Service Cabling", "Fiber Optic Installation", 60, 100, 155, 15000, 1500, 3500, "Higher CPL for specialized fiber work. Very high job values.", cableSrc, "medium"),
);

// ─── VENDING ────────────────────────────────────────────
const vendSrc = "Derived from WordStream 2025 all-industry avg CPL $70.11; B2B niche service with low digital competition";
benchmarks.push(
  entry("vending", "Vending Services", "Vending Machine Placement", 30, 50, 80, 2000, 800, 2000, "B2B niche with low digital competition. Most leads from location scouting.", vendSrc, "medium"),
  entry("vending", "Vending Services", "Vending Machine Service & Repair", 25, 40, 65, 500, 600, 1500, "Lower CPL for service keywords. Moderate job value.", vendSrc, "medium"),
  entry("vending", "Vending Services", "Office Vending Solutions", 35, 55, 85, 3000, 1000, 2500, "B2B office market. Moderate CPL with recurring revenue.", vendSrc, "medium"),
);

// ─── METAL PLATING ──────────────────────────────────────
const plateSrc = "Derived from WordStream 2025 Business Services CPL $103.54; B2B industrial finishing/plating benchmarks";
benchmarks.push(
  entry("metal-plating", "Metal Plating", "Electroplating Services", 55, 90, 140, 5000, 1200, 3000, "B2B industrial finishing. Niche market with moderate CPL.", plateSrc, "medium"),
  entry("metal-plating", "Metal Plating", "Chrome Plating", 50, 80, 125, 3000, 1000, 2500, "Consumer and B2B. Moderate CPL with good keyword intent.", plateSrc, "medium"),
  entry("metal-plating", "Metal Plating", "Anodizing Services", 55, 90, 140, 4000, 1200, 3000, "B2B industrial. Similar CPL to electroplating.", plateSrc, "medium"),
);

// Write the file
const outputPath = join(__dirname, '..', 'src', 'data', 'benchmarks.json');
writeFileSync(outputPath, JSON.stringify(benchmarks, null, 2) + '\n');
console.log(`✅ Generated ${benchmarks.length} benchmark entries across ${new Set(benchmarks.map(b => b.industryId)).size} industries`);
console.log(`\nIndustries:`);
const industries = [...new Set(benchmarks.map(b => b.industryName))].sort();
industries.forEach(i => {
  const count = benchmarks.filter(b => b.industryName === i).length;
  console.log(`  ${i} (${count} services)`);
});
