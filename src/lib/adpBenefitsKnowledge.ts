/**
 * ADP TotalSource Benefits Knowledge Base
 * Structured reference for PRIME underwriting, standard quoting, state carrier map,
 * dental rules, and quoting documentation requirements.
 * Last Updated: March 18, 2026
 */

export const BENEFITS_KNOWLEDGE_VERSION = "2026-03-18-v3";

export const ADP_BENEFITS_KNOWLEDGE = {
  // === PRIME GROUPS (2-9 Benefit-Eligible Employees) ===
  prime: {
    definition: "PRIME groups have 2 to 9 benefit-eligible employees",
    enrollmentCriteria: {
      minBenefitEligible: 2,
      maxBenefitEligible: 9,
      minEnrolledOnHealth: 2,
      participationRate: "50% overall",
      cobraAllowed: false,
      asiMaximum: 1.45,
    },
    averageWage: {
      standard: "$65,000",
      highCostMetro: "$75,000 (NYC, DC Metro, SF Metro)",
      includes: "W2 employees, non-paid participating SEI and K1s",
      exceptions: "NO EXCEPTIONS — if SEIs, K1s, or bonuses cause wages to exceed threshold, details must be in submission. Finance validates before implementation.",
    },
    carrierPlanLimits: {
      "UHC/NHP/UHCSV": "max 5 plans (standalone/combined)",
      "Oxford": "max 3 plans",
      "Aetna": "max 4 plans",
      "Anthem National": "max 4 plans",
      "Anthem CA": "max 5 plans",
      "Kaiser CA & CO": "max 3 plans",
      "Harvard Pilgrim": "max 3 plans",
      "BCBSTX": "max 6 plans",
    },
    restrictions: [
      "National + Local plan offering subject to carrier plan combination guidelines",
      "No slice business allowed in CA & CO",
    ],
    excludedStates: ["HI", "ID", "MD", "MN", "WA", "OR"],
    excludedCarriers: ["HMSA", "BCBS of Michigan/BCN", "Regence", "Kaiser HI & WA"],
  },

  // === STANDARD QUOTING (10+ Eligible) ===
  standardQuoting: {
    default: {
      minEligible: 10,
      minEnrolled: 5,
      asiStandard: "<= 1.45",
      asiGradientException: "1.45 - 1.55",
      participation: "50% overall",
      cobraExposure: "less than 10%",
    },
    stateExceptions: {
      WA: "Min 10 eligible, 7 enrolled, 75% participation after valid waivers removed",
      OR: "Min 10 eligible, 7 enrolled, 75% participation after valid waivers removed",
      HI: "Min 10 eligible, 5 enrolled, ASI <= 1.75 (higher threshold); all opportunities referred to TS Field",
      ID: "Must have 10+ eligible and at least 5 enrolling in medical; PRIME excluded",
      UT: "Must have 10+ eligible and at least 5 enrolling; benefits on exception basis only; contact broker; TS Select also available",
      MD: "Must have 60 EEs enrolled; TS Select available for less than 60 EEs",
      IL: "Standard tiers: Under 50, 51-149, Over 150 (different from most states)",
    },
  },

  // === STATE CARRIER MAP ===
  stateCarriers: {
    AZ: { medical: ["Aetna", "UHC"], prime: true },
    AR: { medical: ["UHC"], prime: true },
    CA_N: { medical: ["Aetna", "UHC", "Kaiser", "Anthem"], prime: true, note: "No slice business in CA for PRIME" },
    CA_S: { medical: ["Aetna", "Anthem", "Kaiser", "MediExcel"], prime: true, note: "No slice business in CA for PRIME" },
    CO: { medical: ["Aetna", "UHC", "Kaiser"], prime: true, note: "No slice business in CO for PRIME" },
    CT: { medical: ["Aetna", "Oxford"], prime: true },
    FL: { medical: ["Aetna", "UHC"], prime: true },
    GA: { medical: ["Anthem", "UHC"], prime: true },
    HI: { medical: ["HMSA", "Kaiser"], prime: false, note: "All opportunities must be referred to TS Field; Prepaid Health Care Act applies" },
    ID: { medical: ["Aetna", "Regence"], prime: false },
    IL: { medical: ["Aetna", "UHC"], prime: true },
    IN: { medical: ["Anthem", "UHC"], prime: true },
    IA: { medical: ["Aetna", "UHC"], prime: true },
    KS: { medical: ["Aetna", "UHC"], prime: true },
    KY: { medical: ["Anthem", "UHC"], prime: true },
    LA: { medical: ["Aetna", "UHC"], prime: true },
    MA: { medical: ["Aetna", "Harvard Pilgrim"], prime: true },
    MD: { medical: ["Aetna", "UHC"], prime: false, note: "60 EEs enrolled minimum; TS Select for <60" },
    MI: { medical: ["BCBSM/BCN", "UHC"], prime: true, note: "BCBS of Michigan/BCN excluded from PRIME" },
    MN: { medical: ["Medica", "UHC"], prime: false, note: "Medica excluded from PRIME" },
    MO: { medical: ["Aetna", "UHC"], prime: true },
    NC: { medical: ["Aetna", "UHC"], prime: true },
    NE: { medical: ["Aetna", "UHC"], prime: true },
    NH: { medical: ["Anthem", "Harvard Pilgrim", "Aetna"], prime: true },
    NJ: { medical: ["Aetna", "Oxford", "UHC"], prime: true },
    NV: { medical: ["Anthem", "UHC"], prime: true },
    NY: { medical: ["Empire", "Oxford", "UHC"], prime: true, note: "No PEO in 20 upstate counties" },
    OH: { medical: ["Aetna", "Anthem"], prime: true },
    OK: { medical: ["Aetna", "UHC"], prime: true },
    OR: { medical: ["Regence", "Kaiser"], prime: false },
    PA: { medical: ["Aetna", "UHC"], prime: true, note: "TS in Philadelphia/eastern; TS Select in western" },
    RI: { medical: ["Aetna", "UHC"], prime: true },
    SC: { medical: ["Aetna", "UHC"], prime: true },
    TN: { medical: ["Aetna", "UHC"], prime: true },
    TX: { medical: ["Aetna", "BCBSTX"], prime: true },
    UT: { medical: ["UHC"], prime: false, note: "Exception basis only; contact broker" },
    VA: { medical: ["Aetna", "UHC"], prime: true },
    WA: { medical: ["Asuris", "Kaiser", "Regence"], prime: false },
    WI: { medical: ["UHC", "Anthem"], prime: true },
  },

  // === STATES WHERE TS IS NOT AVAILABLE ===
  tsNotAvailable: ["MT", "WY", "SD", "ND", "NM", "WV", "VT", "ME", "AK", "AL", "MS"],

  // === DENTAL CARRIERS ===
  dental: {
    carriers: ["Aetna", "Delta Dental", "Guardian", "UHC (OK only)", "HMSA (HI only)"],
    standardRules: {
      under100Eligible: "May offer 2 plans (3 total if 1 is DHMO — Aetna only)",
      over100Eligible: "May offer 3 plans",
    },
    commonRestrictions: [
      "Aetna: Cannot offer both 5000 and 3500 maximum plans; Freedom of Choice Standalone Offering Only",
      "Delta: Cannot offer both 5000 and 3500 maximum plans",
      "Guardian: PPO 1650 & 1200 cannot be combined",
    ],
    note: "Passive equivalents of offered plans must be given to TX/LA incidentals",
  },

  // === QUOTING DOCUMENTATION ===
  quotingRequirements: {
    allGroups: [
      "Member Level Census (including dependent info)",
      "Current Invoice (within 60 days)",
      "Plan Designs (ACA plan designs not required in most states)",
      "Upcoming Renewal (if within 60/120 days depending on state)",
    ],
    largeGroups: [
      "Current Monthly Claim Report — 12 months (24 preferred)",
      "Current Large Claim Report with diagnosis",
      "Cobra/FIE Rates & Copy of Self-Funded Contract (self-funded only)",
    ],
    lowParticipation: "If under 45% overall participation: surveyed census of expected enrollees + business case on increasing participation",
  },
};
