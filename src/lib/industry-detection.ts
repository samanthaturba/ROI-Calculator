/**
 * Keyword-based industry detection.
 * Each industry has a list of weighted keywords. Scores are summed, normalised,
 * and the top match(es) returned with a confidence level.
 */

interface IndustryKeywords {
  industryId: string;
  keywords: string[]; // plain lowercase strings; multi-word phrases score higher
}

const INDUSTRY_KEYWORDS: IndustryKeywords[] = [
  {
    industryId: "plumbing",
    keywords: [
      "plumber", "plumbing", "drain cleaning", "clogged drain", "water heater",
      "pipe repair", "leak repair", "sewer", "toilet", "faucet", "repiping",
      "hydro jetting", "water line", "gas line", "bathroom remodel plumbing",
    ],
  },
  {
    industryId: "hvac",
    keywords: [
      "hvac", "air conditioning", "heating and cooling", "furnace", "heat pump",
      "ac repair", "ac installation", "ductwork", "thermostat", "mini split",
      "central air", "boiler", "ventilation", "indoor air quality", "ac tune up",
    ],
  },
  {
    industryId: "roofing",
    keywords: [
      "roofing", "roof replacement", "roof repair", "shingles", "gutters",
      "flashing", "flat roof", "leak repair roof", "roof inspection",
      "asphalt shingles", "metal roofing", "eaves", "ridge cap", "soffit",
    ],
  },
  {
    industryId: "electrical",
    keywords: [
      "electrician", "electrical", "panel upgrade", "wiring", "rewiring",
      "circuit breaker", "outlet installation", "lighting installation",
      "ev charger", "generator", "electrical inspection", "subpanel",
    ],
  },
  {
    industryId: "landscaping",
    keywords: [
      "landscaping", "lawn care", "lawn mowing", "landscape design",
      "mulch", "irrigation", "sprinkler", "sod installation", "tree trimming",
      "hardscaping", "patio installation", "retaining wall landscaping",
      "yard cleanup", "seasonal cleanup",
    ],
  },
  {
    industryId: "painting",
    keywords: [
      "painting", "painter", "interior painting", "exterior painting",
      "cabinet painting", "commercial painting", "house painting",
      "power washing paint", "staining", "epoxy painting",
    ],
  },
  {
    industryId: "concrete",
    keywords: [
      "concrete", "concrete driveway", "concrete foundation", "slab",
      "concrete repair", "decorative concrete", "flatwork", "sidewalk",
    ],
  },
  {
    industryId: "stamped-concrete",
    keywords: [
      "stamped concrete", "decorative concrete", "stamped patio",
      "exposed aggregate", "concrete overlay",
    ],
  },
  {
    industryId: "flooring",
    keywords: [
      "flooring", "hardwood floors", "carpet installation", "tile installation",
      "lvp", "luxury vinyl plank", "laminate flooring", "floor refinishing",
      "vinyl flooring", "floor installation",
    ],
  },
  {
    industryId: "cleaning",
    keywords: [
      "cleaning service", "house cleaning", "maid service", "janitorial",
      "commercial cleaning", "deep cleaning", "move out cleaning", "office cleaning",
      "post construction cleaning", "recurring cleaning",
    ],
  },
  {
    industryId: "pest-control",
    keywords: [
      "pest control", "exterminator", "termite", "rodent control",
      "bed bugs", "ant control", "mosquito control", "wildlife removal",
      "cockroach", "fumigation",
    ],
  },
  {
    industryId: "tree-service",
    keywords: [
      "tree service", "tree removal", "tree trimming", "stump grinding",
      "emergency tree", "arborist", "tree pruning", "land clearing trees",
    ],
  },
  {
    industryId: "pool",
    keywords: [
      "pool", "swimming pool", "pool cleaning", "pool repair", "pool installation",
      "pool renovation", "pool maintenance", "spa", "hot tub", "pool service",
    ],
  },
  {
    industryId: "fencing",
    keywords: [
      "fencing", "fence installation", "wood fence", "chain link fence",
      "vinyl fence", "iron fence", "privacy fence", "split rail", "fence repair",
    ],
  },
  {
    industryId: "garage-door",
    keywords: [
      "garage door", "garage door repair", "garage door installation",
      "garage door opener", "overhead door", "roll up door",
    ],
  },
  {
    industryId: "window-door",
    keywords: [
      "window replacement", "window installation", "door installation",
      "window repair", "sliding door", "entry door", "patio door",
      "energy efficient windows",
    ],
  },
  {
    industryId: "siding",
    keywords: [
      "siding", "vinyl siding", "fiber cement siding", "hardie board",
      "siding repair", "siding installation", "stucco",
    ],
  },
  {
    industryId: "insulation",
    keywords: [
      "insulation", "attic insulation", "spray foam", "blown in insulation",
      "crawl space insulation", "fiberglass insulation",
    ],
  },
  {
    industryId: "foundation-repair",
    keywords: [
      "foundation repair", "foundation crack", "foundation leveling",
      "basement waterproofing", "pier and beam", "helical piers",
      "foundation inspection", "structural foundation",
    ],
  },
  {
    industryId: "waterproofing",
    keywords: [
      "waterproofing", "basement waterproofing", "crawl space encapsulation",
      "french drain", "sump pump", "exterior waterproofing", "wet basement",
    ],
  },
  {
    industryId: "mold-remediation",
    keywords: [
      "mold remediation", "mold removal", "black mold", "mold testing",
      "mold inspection", "mold cleanup",
    ],
  },
  {
    industryId: "restoration",
    keywords: [
      "restoration", "water damage restoration", "fire damage restoration",
      "storm damage", "flood damage", "smoke damage", "disaster restoration",
    ],
  },
  {
    industryId: "septic",
    keywords: [
      "septic", "septic pumping", "septic installation", "septic repair",
      "septic tank", "drain field", "sewage",
    ],
  },
  {
    industryId: "well-service",
    keywords: [
      "well drilling", "well pump", "water well", "well inspection",
      "well repair", "borehole",
    ],
  },
  {
    industryId: "solar",
    keywords: [
      "solar", "solar panels", "solar installation", "solar energy",
      "photovoltaic", "solar battery", "net metering", "pv system",
    ],
  },
  {
    industryId: "home-security",
    keywords: [
      "home security", "security system", "security camera", "alarm system",
      "smart home security", "surveillance camera", "access control",
    ],
  },
  {
    industryId: "junk-removal",
    keywords: [
      "junk removal", "junk hauling", "debris removal", "dumpster rental",
      "trash removal", "cleanout service", "estate cleanout",
    ],
  },
  {
    industryId: "moving",
    keywords: [
      "moving", "movers", "moving company", "local moving", "long distance moving",
      "residential moving", "commercial moving", "relocation",
    ],
  },
  {
    industryId: "locksmith",
    keywords: [
      "locksmith", "lockout service", "lock rekeying", "lock installation",
      "key cutting", "car lockout", "emergency locksmith",
    ],
  },
  {
    industryId: "appliance-repair",
    keywords: [
      "appliance repair", "refrigerator repair", "washer repair", "dryer repair",
      "oven repair", "dishwasher repair", "appliance service",
    ],
  },
  {
    industryId: "pressure-washing",
    keywords: [
      "pressure washing", "power washing", "soft washing", "house washing",
      "driveway cleaning", "deck washing", "roof cleaning",
    ],
  },
  {
    industryId: "epoxy-flooring",
    keywords: [
      "epoxy flooring", "epoxy floor coating", "garage floor epoxy",
      "commercial epoxy", "floor coating", "polyaspartic",
    ],
  },
  {
    industryId: "drywall",
    keywords: [
      "drywall", "sheetrock", "drywall repair", "drywall installation",
      "drywall texturing", "popcorn ceiling removal",
    ],
  },
  {
    industryId: "countertops",
    keywords: [
      "countertops", "granite countertops", "quartz countertops",
      "marble countertops", "countertop installation", "kitchen countertops",
      "laminate countertops",
    ],
  },
  {
    industryId: "cabinetry",
    keywords: [
      "cabinets", "custom cabinets", "cabinet installation", "cabinet refacing",
      "kitchen cabinets", "bathroom cabinets",
    ],
  },
  {
    industryId: "tile-contractor",
    keywords: [
      "tile", "tile installation", "tile flooring", "bathroom tile",
      "kitchen backsplash", "ceramic tile", "porcelain tile", "tile repair",
    ],
  },
  {
    industryId: "paving",
    keywords: [
      "paving", "asphalt paving", "driveway paving", "parking lot paving",
      "sealcoating", "asphalt repair", "pothole repair",
    ],
  },
  {
    industryId: "excavation",
    keywords: [
      "excavation", "grading", "land clearing", "trenching",
      "site preparation", "earthwork", "dirt work",
    ],
  },
  {
    industryId: "demolition",
    keywords: [
      "demolition", "residential demolition", "commercial demolition",
      "interior demolition", "tear down", "structure removal",
    ],
  },
  {
    industryId: "irrigation",
    keywords: [
      "irrigation", "sprinkler system", "drip irrigation", "sprinkler repair",
      "irrigation installation", "lawn sprinklers",
    ],
  },
  {
    industryId: "artificial-turf",
    keywords: [
      "artificial turf", "synthetic turf", "artificial grass", "putting green",
      "pet turf", "turf installation",
    ],
  },
  {
    industryId: "metal-roofing",
    keywords: [
      "metal roofing", "metal roof", "standing seam", "metal roof installation",
      "corrugated metal roof", "steel roof",
    ],
  },
  {
    industryId: "construction",
    keywords: [
      "general contractor", "general contracting", "commercial construction",
      "construction company", "renovation", "remodeling", "build out",
    ],
  },
  {
    industryId: "commercial-contractor",
    keywords: [
      "commercial contractor", "tenant improvement", "commercial renovation",
      "commercial remodel", "design build", "commercial build out",
    ],
  },
  {
    industryId: "home-builders",
    keywords: [
      "home builder", "new home construction", "custom home builder",
      "new construction", "spec home", "production builder",
    ],
  },
  {
    industryId: "custom-home-builders",
    keywords: [
      "custom home", "luxury home builder", "custom home construction",
      "semi custom", "bespoke home", "architect builder",
    ],
  },
  {
    industryId: "fabrication",
    keywords: [
      "fabrication", "custom fabrication", "metal fabrication",
      "structural steel", "sheet metal", "welding fabrication",
    ],
  },
  {
    industryId: "metal-fabrication",
    keywords: [
      "metal fabrication", "custom metal", "structural steel fabrication",
      "sheet metal fabrication", "ironwork",
    ],
  },
  {
    industryId: "welding",
    keywords: [
      "welding", "welder", "mobile welding", "structural welding",
      "mig welding", "tig welding", "fabrication welding",
    ],
  },
  {
    industryId: "cnc-machining",
    keywords: [
      "cnc machining", "cnc milling", "cnc turning", "precision machining",
      "prototype machining", "cnc parts",
    ],
  },
  {
    industryId: "machining",
    keywords: [
      "machine shop", "machining", "precision machining", "custom parts",
      "cnc", "lathe", "mill", "turning", "boring",
    ],
  },
  {
    industryId: "powder-coating",
    keywords: [
      "powder coating", "powder coat", "industrial powder coating",
      "custom powder coating", "electrostatic coating",
    ],
  },
  {
    industryId: "metal-plating",
    keywords: [
      "metal plating", "electroplating", "chrome plating", "anodizing",
      "nickel plating", "zinc plating",
    ],
  },
  {
    industryId: "composite",
    keywords: [
      "composite", "fiberglass", "carbon fiber", "composite manufacturing",
      "fiberglass fabrication", "composite repair",
    ],
  },
  {
    industryId: "custom-engine",
    keywords: [
      "custom engine", "engine build", "crate engine", "engine builder",
      "ls engine", "big block", "small block", "horsepower", "hp build",
      "engine package", "stroker", "turn key engine", "dyno", "performance engine",
      "marine engine", "offshore engine", "airboat engine", "chevy engine",
      "ford engine", "mopar engine", "hemi build", "engine machining",
    ],
  },
  {
    industryId: "custom-car-shop",
    keywords: [
      "custom car", "hot rod", "restomod", "pro touring", "race car build",
      "engine swap", "ls swap", "performance shop", "custom car build",
      "drag car", "muscle car build", "street rod",
    ],
  },
  {
    industryId: "auto-body",
    keywords: [
      "auto body", "collision repair", "auto painting", "dent repair",
      "body shop", "car paint", "fender repair", "frame straightening",
    ],
  },
  {
    industryId: "rv-auto-repair",
    keywords: [
      "rv repair", "rv service", "auto repair", "car repair",
      "auto maintenance", "engine repair", "transmission repair auto",
    ],
  },
  {
    industryId: "truck-repair",
    keywords: [
      "truck repair", "diesel repair", "semi truck repair", "trailer repair",
      "diesel engine", "truck service", "commercial truck",
    ],
  },
  {
    industryId: "truck-fleet-service",
    keywords: [
      "fleet service", "fleet repair", "truck fleet", "fleet maintenance",
      "commercial vehicle service", "fleet management",
    ],
  },
  {
    industryId: "fleet-maintenance",
    keywords: [
      "fleet maintenance", "fleet management", "preventive maintenance fleet",
      "dot inspection", "fleet diagnostics",
    ],
  },
  {
    industryId: "towing",
    keywords: [
      "towing", "tow truck", "emergency towing", "roadside assistance",
      "long distance towing", "flatbed tow",
    ],
  },
  {
    industryId: "auto-shipping",
    keywords: [
      "auto shipping", "car shipping", "vehicle transport", "car transport",
      "enclosed transport", "open carrier",
    ],
  },
  {
    industryId: "marine",
    keywords: [
      "boat repair", "marine service", "marine engine", "boat detailing",
      "boat maintenance", "marina", "outboard motor",
    ],
  },
  {
    industryId: "motor-groups",
    keywords: [
      "car dealership", "auto dealer", "new vehicles", "used vehicles",
      "vehicle sales", "car lot", "ford dealer", "chevy dealer",
    ],
  },
  {
    industryId: "glass",
    keywords: [
      "glass", "window glass", "storefront glass", "glass installation",
      "glass repair", "commercial glass", "auto glass",
    ],
  },
  {
    industryId: "propane",
    keywords: [
      "propane", "propane delivery", "propane tank", "lp gas",
      "propane service", "propane installation",
    ],
  },
  {
    industryId: "commercial-plumbing",
    keywords: [
      "commercial plumbing", "commercial drain", "grease trap", "backflow",
      "commercial water heater", "commercial boiler",
    ],
  },
  {
    industryId: "commercial-kitchen",
    keywords: [
      "commercial kitchen", "kitchen equipment repair", "restaurant equipment",
      "hood cleaning", "commercial refrigeration",
    ],
  },
  {
    industryId: "commercial-agricultural-electric",
    keywords: [
      "agricultural electric", "farm electrical", "grain elevator electrical",
      "grain dryer", "three phase power farm",
    ],
  },
  {
    industryId: "structural-engineers",
    keywords: [
      "structural engineer", "structural engineering", "structural inspection",
      "load bearing", "beam design",
    ],
  },
  {
    industryId: "architecture",
    keywords: [
      "architect", "architecture", "architectural design", "building design",
      "floor plan design", "commercial architecture",
    ],
  },
  {
    industryId: "engineering",
    keywords: [
      "engineering", "civil engineering", "mechanical engineering",
      "environmental engineering", "naval engineering", "structural design",
    ],
  },
  {
    industryId: "surveying",
    keywords: [
      "surveying", "land surveying", "boundary survey", "construction survey",
      "topographic survey", "surveyor",
    ],
  },
  {
    industryId: "interior-design",
    keywords: [
      "interior design", "interior designer", "room makeover", "home staging",
      "space planning", "interior decorating",
    ],
  },
  {
    industryId: "consulting",
    keywords: [
      "consulting", "management consulting", "business consulting",
      "strategy consulting", "financial consulting",
    ],
  },
  {
    industryId: "printing",
    keywords: [
      "printing", "commercial printing", "large format printing",
      "brochure printing", "business cards", "custom printing",
    ],
  },
  {
    industryId: "sign-wraps",
    keywords: [
      "vehicle wrap", "car wrap", "signage", "custom signs", "business signs",
      "vinyl wrap", "fleet graphics", "banner printing",
    ],
  },
  {
    industryId: "service-cabling",
    keywords: [
      "structured cabling", "network cabling", "data cabling",
      "fiber optic", "cat6", "low voltage cabling",
    ],
  },
  {
    industryId: "installation",
    keywords: [
      "office furniture installation", "furniture assembly", "equipment installation",
      "office relocation", "cubicle installation",
    ],
  },
  {
    industryId: "waste",
    keywords: [
      "waste management", "commercial waste", "dumpster rental",
      "trash service", "hazardous waste", "waste disposal",
    ],
  },
  {
    industryId: "recycling",
    keywords: [
      "recycling", "scrap metal", "ewaste", "electronic recycling",
      "commercial recycling", "metal recycling",
    ],
  },
  {
    industryId: "distribution",
    keywords: [
      "distribution", "wholesale distribution", "freight", "logistics",
      "last mile delivery", "supply chain",
    ],
  },
  {
    industryId: "heavy-equipment",
    keywords: [
      "heavy equipment", "equipment rental", "equipment repair",
      "excavator rental", "crane rental", "construction equipment",
    ],
  },
  {
    industryId: "vending",
    keywords: [
      "vending machine", "vending services", "office vending",
      "snack vending", "drink vending",
    ],
  },
  {
    industryId: "lodging",
    keywords: [
      "hotel", "motel", "vacation rental", "inn", "resort",
      "bed and breakfast", "lodge", "airbnb management",
    ],
  },
  {
    industryId: "bolt-services",
    keywords: [
      "bolts", "fasteners", "industrial fastener", "custom bolt",
      "nut and bolt", "threaded rod",
    ],
  },
  {
    industryId: "cnc-machining",
    keywords: [
      "cnc machining", "cnc milling", "cnc turning",
      "precision parts", "prototype parts",
    ],
  },
  {
    industryId: "food-manufacturing",
    keywords: [
      "food manufacturing", "food production", "food processor", "specialty food",
      "meat processing", "sausage", "smoked meats", "cured meats", "jerky",
      "private label food", "co-packing", "co-pack", "food co-manufacturer",
      "wholesale food", "bulk food", "food supplier", "food distributor",
      "bakery wholesale", "catering", "meal prep", "food truck",
      "usda inspected", "food grade", "commercial kitchen production",
      "recipe", "ingredients", "seasonings", "spices", "deli", "butcher",
      "charcuterie", "salami", "pepperoni", "bacon", "ham", "hot dog",
      "bratwurst", "kielbasa", "andouille", "chorizo", "snack sticks",
      "food service", "food supplier", "restaurant supply",
      "institutional food", "school food", "military food",
      "bulk meat", "wholesale meat", "meat supplier",
    ],
  },
  {
    industryId: "rigging-millwright",
    keywords: [
      "rigging", "millwright", "heavy machinery moving", "machinery movers",
      "industrial rigging", "equipment erecting", "erecting services",
      "plant relocation", "facility relocation", "heavy haul",
      "crane service", "crane rental", "overhead crane",
      "equipment installation", "machinery installation",
      "precision alignment", "conveyor installation",
      "heavy equipment moving", "industrial moving",
      "turnkey relocation", "decommission", "equipment storage",
      "specialized moving", "medical equipment moving",
    ],
  },
];

export interface IndustryMatch {
  industryId: string;
  score: number;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
}

/**
 * Score website text against all industries.
 * Returns up to 3 matches sorted by score descending.
 */
export function detectIndustries(text: string, topN = 3): IndustryMatch[] {
  const lower = text.toLowerCase();
  const results: IndustryMatch[] = [];

  for (const { industryId, keywords } of INDUSTRY_KEYWORDS) {
    const matched: string[] = [];
    let score = 0;

    for (const kw of keywords) {
      // Multi-word phrases get a bonus
      const isPhrase = kw.includes(" ");
      const weight = isPhrase ? 3 : 1;

      // Count occurrences (not just presence) up to a small cap
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const count = (lower.match(regex) ?? []).length;

      if (count > 0) {
        score += weight * Math.min(count, 4); // cap at 4 occurrences
        matched.push(kw);
      }
    }

    if (score > 0) {
      const confidence: "high" | "medium" | "low" =
        score >= 12 ? "high" : score >= 5 ? "medium" : "low";
      results.push({ industryId, score, confidence, matchedKeywords: matched });
    }
  }

  // Only return matches the scanner is reasonably confident about.
  // Low-confidence matches (score < 5, often from partial word overlaps
  // like "retail" matching "tile") cause false positives.
  const confident = results.filter((r) => r.confidence !== "low");

  confident.sort((a, b) => b.score - a.score);
  return confident.slice(0, topN);
}
