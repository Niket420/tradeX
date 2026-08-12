import { CompanySeed } from "@/lib/mock/generate-company";

// Fictional companies (not real listed entities) used to populate the mock universe.
export const SEED_COMPANIES: CompanySeed[] = [
  // IT
  { symbol: "NIMBUS", name: "Nimbus Technologies", sector: "IT", industry: "IT Services", archetype: "steady_large_cap", marketCapTier: "large" },
  { symbol: "ZENINF", name: "Zenith Infosystems", sector: "IT", industry: "IT Services", archetype: "quality_compounder", marketCapTier: "large" },
  { symbol: "COREWV", name: "Corewave Digital", sector: "IT", industry: "Software Products", archetype: "emerging_multibagger", marketCapTier: "small" },
  { symbol: "ANCDAT", name: "Anchor Data Systems", sector: "IT", industry: "Data & Analytics", archetype: "momentum_high_pe", marketCapTier: "mid" },

  // Banks
  { symbol: "SURYBK", name: "Suryoday Commercial Bank", sector: "Banks", industry: "Private Bank", archetype: "quality_compounder", marketCapTier: "large" },
  { symbol: "KONKBK", name: "Konkan Urban Bank", sector: "Banks", industry: "Small Finance Bank", archetype: "early_accelerator", marketCapTier: "small" },
  { symbol: "MERIBK", name: "Meridian Trust Bank", sector: "Banks", industry: "Private Bank", archetype: "steady_large_cap", marketCapTier: "large" },

  // Financial Services
  { symbol: "VANTCP", name: "Vantage Capital Markets", sector: "Financial Services", industry: "Broking & Markets", archetype: "momentum_high_pe", marketCapTier: "mid" },
  { symbol: "BLUEPK", name: "Bluepeak Finance", sector: "Financial Services", industry: "NBFC", archetype: "value_turnaround", marketCapTier: "mid" },
  { symbol: "TRIWTH", name: "Trident Wealth Services", sector: "Financial Services", industry: "Wealth Management", archetype: "emerging_multibagger", marketCapTier: "small" },

  // Pharma
  { symbol: "VINDPH", name: "Vindhya Pharmaceuticals", sector: "Pharma", industry: "Generics", archetype: "steady_large_cap", marketCapTier: "large" },
  { symbol: "SOLLIF", name: "Solaris Life Sciences", sector: "Pharma", industry: "APIs", archetype: "emerging_multibagger", marketCapTier: "small" },
  { symbol: "CRSTFM", name: "Crestline Formulations", sector: "Pharma", industry: "Formulations", archetype: "decelerating", marketCapTier: "mid" },
  { symbol: "NGBIO", name: "Northgate Biotech", sector: "Pharma", industry: "Biotech", archetype: "early_accelerator", marketCapTier: "micro" },

  // Healthcare
  { symbol: "SANJHS", name: "Sanjeevani Hospitals", sector: "Healthcare", industry: "Hospitals", archetype: "quality_compounder", marketCapTier: "mid" },
  { symbol: "AROGDX", name: "Arogya Diagnostics", sector: "Healthcare", industry: "Diagnostics", archetype: "surprise_priced_in", marketCapTier: "small" },

  // Auto
  { symbol: "ASHWMT", name: "Ashwamedh Motors", sector: "Auto", industry: "Passenger Vehicles", archetype: "steady_large_cap", marketCapTier: "large" },
  { symbol: "RIDGAT", name: "Ridgeline Auto", sector: "Auto", industry: "Commercial Vehicles", archetype: "cyclical_recovery", marketCapTier: "mid" },
  { symbol: "PIONTW", name: "Pioneer Two-Wheelers", sector: "Auto", industry: "Two Wheelers", archetype: "decliner", marketCapTier: "mid" },

  // Auto Components
  { symbol: "PRECGR", name: "Precision Gearworks", sector: "Auto Components", industry: "Drivetrain Components", archetype: "emerging_multibagger", marketCapTier: "small" },
  { symbol: "FALCBR", name: "Falcon Brakes & Systems", sector: "Auto Components", industry: "Braking Systems", archetype: "quality_compounder", marketCapTier: "mid" },
  { symbol: "ORBTAA", name: "Orbit Auto Ancillaries", sector: "Auto Components", industry: "Forgings", archetype: "value_turnaround", marketCapTier: "small" },

  // Capital Goods
  { symbol: "TITEN", name: "Titanium Engineering", sector: "Capital Goods", industry: "Industrial Machinery", archetype: "early_accelerator", marketCapTier: "small" },
  { symbol: "EVERHM", name: "Everest Heavy Machines", sector: "Capital Goods", industry: "Heavy Equipment", archetype: "steady_large_cap", marketCapTier: "large" },
  { symbol: "CONTFB", name: "Continental Fabricators", sector: "Capital Goods", industry: "Fabrication", archetype: "cyclical_recovery", marketCapTier: "small" },

  // Defence
  { symbol: "BHRSHD", name: "Bharat Shield Systems", sector: "Defence", industry: "Defence Electronics", archetype: "momentum_high_pe", marketCapTier: "mid" },
  { symbol: "RAKASP", name: "Rakshak Aerospace", sector: "Defence", industry: "Aerospace", archetype: "emerging_multibagger", marketCapTier: "mid" },
  { symbol: "VAJRDE", name: "Vajra Defence Electronics", sector: "Defence", industry: "Defence Electronics", archetype: "surprise_priced_in", marketCapTier: "small" },

  // Railways
  { symbol: "METRRL", name: "Metrolink Rail Systems", sector: "Railways", industry: "Rail Equipment", archetype: "momentum_high_pe", marketCapTier: "mid" },
  { symbol: "TRAKWL", name: "Trackwell Infra", sector: "Railways", industry: "Rail Infrastructure", archetype: "early_accelerator", marketCapTier: "small" },

  // Renewables
  { symbol: "SURYGE", name: "Suryodaya Green Energy", sector: "Renewables", industry: "Solar", archetype: "emerging_multibagger", marketCapTier: "mid" },
  { symbol: "WINDFR", name: "Windforce Renewables", sector: "Renewables", industry: "Wind", archetype: "value_turnaround", marketCapTier: "small" },
  { symbol: "HELISL", name: "Helios Solar Industries", sector: "Renewables", industry: "Solar Modules", archetype: "momentum_high_pe", marketCapTier: "mid" },

  // Power
  { symbol: "PWRGUC", name: "Powergrid Utilities Corp", sector: "Power", industry: "Transmission", archetype: "steady_large_cap", marketCapTier: "large" },
  { symbol: "VOLTRX", name: "Voltrex Transmission", sector: "Power", industry: "Transmission Equipment", archetype: "decelerating", marketCapTier: "mid" },

  // Chemicals
  { symbol: "KONKCH", name: "Konkan Chemicals", sector: "Chemicals", industry: "Bulk Chemicals", archetype: "cyclical_recovery", marketCapTier: "mid" },
  { symbol: "ANVLPC", name: "Anvil Petrochem", sector: "Chemicals", industry: "Petrochemicals", archetype: "decliner", marketCapTier: "large" },
  { symbol: "BLUWCH", name: "Bluewave Chemicals", sector: "Chemicals", industry: "Commodity Chemicals", archetype: "value_turnaround", marketCapTier: "small" },

  // Specialty Chemicals
  { symbol: "NEXNSC", name: "Nexon Specialty Chem", sector: "Specialty Chemicals", industry: "Specialty Chemicals", archetype: "emerging_multibagger", marketCapTier: "small" },
  { symbol: "CRYSFC", name: "Crystalline Fine Chem", sector: "Specialty Chemicals", industry: "Fine Chemicals", archetype: "quality_compounder", marketCapTier: "mid" },
  { symbol: "VRTXAC", name: "Vertex Agro Chem", sector: "Specialty Chemicals", industry: "Agrochemicals", archetype: "decelerating", marketCapTier: "mid" },

  // Consumer
  { symbol: "HMSTCG", name: "Homestead Consumer Goods", sector: "Consumer", industry: "Durables", archetype: "steady_large_cap", marketCapTier: "mid" },
  { symbol: "EVDYES", name: "Everyday Essentials", sector: "Consumer", industry: "Household Products", archetype: "early_accelerator", marketCapTier: "small" },

  // FMCG
  { symbol: "NUTRLF", name: "Nutrilife Foods", sector: "FMCG", industry: "Packaged Foods", archetype: "emerging_multibagger", marketCapTier: "small" },
  { symbol: "SUVDFM", name: "Suvidha FMCG", sector: "FMCG", industry: "Personal Care", archetype: "quality_compounder", marketCapTier: "large" },
  { symbol: "PURELD", name: "Purelife Dairy", sector: "FMCG", industry: "Dairy", archetype: "steady_large_cap", marketCapTier: "mid" },

  // Real Estate
  { symbol: "SKYLRE", name: "Skyline Realty", sector: "Real Estate", industry: "Residential", archetype: "momentum_high_pe", marketCapTier: "mid" },
  { symbol: "CRNRDV", name: "Cornerstone Developers", sector: "Real Estate", industry: "Commercial", archetype: "value_turnaround", marketCapTier: "small" },
  { symbol: "MEADBE", name: "Meadowbrook Estates", sector: "Real Estate", industry: "Residential", archetype: "decliner", marketCapTier: "small" },

  // Telecom
  { symbol: "STRMTL", name: "Streamline Telecom", sector: "Telecom", industry: "Telecom Services", archetype: "decelerating", marketCapTier: "large" },
  { symbol: "NOVABB", name: "Nova Broadband", sector: "Telecom", industry: "Broadband", archetype: "early_accelerator", marketCapTier: "small" },

  // Infrastructure
  { symbol: "BRDGIP", name: "Bridgeline Infra Projects", sector: "Infrastructure", industry: "Roads & Highways", archetype: "emerging_multibagger", marketCapTier: "mid" },
  { symbol: "HWYCON", name: "Highway Concessions", sector: "Infrastructure", industry: "Toll Concessions", archetype: "steady_large_cap", marketCapTier: "mid" },
  { symbol: "PANRPT", name: "Panorama Ports", sector: "Infrastructure", industry: "Ports & Logistics", archetype: "quality_compounder", marketCapTier: "large" },

  // Metals
  { symbol: "IRONCS", name: "Ironclad Steel", sector: "Metals", industry: "Steel", archetype: "cyclical_recovery", marketCapTier: "large" },
  { symbol: "ALLYCM", name: "Alloycraft Metals", sector: "Metals", industry: "Specialty Metals", archetype: "value_turnaround", marketCapTier: "mid" },
  { symbol: "CPRLIN", name: "Copperline Industries", sector: "Metals", industry: "Non-ferrous Metals", archetype: "decliner", marketCapTier: "mid" },

  // Mining
  { symbol: "DECMIN", name: "Deccan Minerals", sector: "Mining", industry: "Mining", archetype: "cyclical_recovery", marketCapTier: "mid" },
  { symbol: "CONTCC", name: "Continental Coal Corp", sector: "Mining", industry: "Coal", archetype: "decelerating", marketCapTier: "large" },

  // Textiles
  { symbol: "WEAVWL", name: "Weavewell Textiles", sector: "Textiles", industry: "Spinning & Weaving", archetype: "value_turnaround", marketCapTier: "small" },
  { symbol: "COTNLF", name: "Cottonline Fabrics", sector: "Textiles", industry: "Fabrics", archetype: "decliner", marketCapTier: "small" },
  { symbol: "SILKRA", name: "Silkroute Apparel", sector: "Textiles", industry: "Apparel", archetype: "emerging_multibagger", marketCapTier: "micro" },
];
