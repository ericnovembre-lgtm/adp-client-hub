import type { Lead } from "@/types/database";

export interface CompetitorTemplate {
  subject_lines: string[];
  pain_points: string[];
  adp_counters: string[];
  killer_question: string;
  notes: string;
}

export const OUTREACH_TEMPLATES: Record<string, CompetitorTemplate> = {
  "Intuit QuickBooks": {
    subject_lines: [
      "{{first_name}}, what happens when QuickBooks can't answer an HR question?",
      "Beyond payroll: what {{company_name}} is missing with QuickBooks",
      "{{first_name}} — your QuickBooks promo pricing expires soon",
    ],
    pain_points: [
      "QuickBooks handles payroll but outsources HR to Mineral Inc — no in-house expertise",
      "No built-in hiring tools, ATS, or background checks",
      "Post-promo price increases of 50-100% after the introductory period",
      "DIY implementation with no dedicated onboarding support",
      "Premium support costs extra — basic plan gets basic help",
    ],
    adp_counters: [
      "ADP TotalSource includes 24/7/365 HR support from certified professionals",
      "Built-in ATS with ZipRecruiter integration and background check services",
      "Stable, transparent pricing with no post-promo shock",
      "Dedicated onboarding manager for every new client",
      "Co-employment model means ADP shares the compliance liability",
    ],
    killer_question:
      "If an employee filed a discrimination complaint at 2am, who handles it? With QuickBooks, you're on your own. With TotalSource, our HR and legal team steps in as your co-employer.",
    notes:
      "Intuit acquired GoCo (April 2025) to add HR. No timeline yet. Still safe to position QB as lacking HR, but this gap may close. Also watch for Intuit Assist AI features.",
  },

  Justworks: {
    subject_lines: [
      "{{first_name}}, is Justworks holding {{company_name}} back?",
      "What Justworks can't do for a growing team like {{company_name}}",
      "{{first_name}} — when you outgrow 20 pre-built reports",
    ],
    pain_points: [
      "Limited to 20 pre-built reports — no custom reporting or analytics",
      "No dedicated account manager unless you're one of their largest clients",
      "Missing: Total Comp Statements, compliance reporting, org charts, training library, talent features, employee surveys, benchmarking, OSHA support",
      "HR expertise outsourced to ThinkHR (not 24/7)",
      "Mobile app has under 75 total reviews (vs ADP's 2.8M+)",
    ],
    adp_counters: [
      "Full custom reporting and analytics dashboard",
      "Dedicated account manager from day one",
      "Comprehensive HR suite: talent management, compliance, training, surveys, benchmarking",
      "In-house HR and legal professionals available 24/7",
      "ADP mobile app: #5 free business app on Apple App Store with 2.8M reviews",
    ],
    killer_question:
      "When {{company_name}} grows past 20 employees, what happens? TotalSource scales with you — Justworks' limited reporting and lack of talent management tools become a bottleneck.",
    notes:
      "Justworks has transparent PEPM pricing on their website. Don't lead with price — lead with capability gaps and scale.",
  },

  Gusto: {
    subject_lines: [
      "{{first_name}}, is Gusto enough for what's ahead at {{company_name}}?",
      "{{company_name}} deserves Fortune 500 benefits — here's how",
      "{{first_name}} — the hidden cost of self-service HR",
    ],
    pain_points: [
      "Software-only platform — no co-employment, no shared compliance liability",
      "Self-service model means you handle all HR issues alone",
      "No dedicated HR professionals on your side",
      "Limited compliance support compared to a PEO model",
      "Designed for micro-businesses — grows out of its depth fast",
    ],
    adp_counters: [
      "TotalSource PEO model: co-employment gives you enterprise-level benefits at small business prices",
      "Dedicated HR team that shares compliance liability",
      "Workers' comp, EPLI, and regulatory compliance handled by ADP",
      "Fortune 500-level health insurance, 401(k), and benefits packages",
      "Full service — not a self-service platform where you figure it out alone",
    ],
    killer_question:
      "If an employee files a discrimination claim tomorrow, who handles that? With Gusto, it's 100% on you. With TotalSource, our HR and legal team steps in as your co-employer and shares that liability.",
    notes:
      "Gusto Wallet (early pay, financial wellness tools) is attractive to employees. Don't knock it — acknowledge it and pivot to employer-side value.",
  },

  Paychex: {
    subject_lines: [
      "{{first_name}}, getting the most from your payroll investment?",
      "{{company_name}} — there's a smarter way to handle HR + payroll",
      "{{first_name}}, what if your payroll provider was also your HR department?",
    ],
    pain_points: [
      "Paychex offers payroll but PEO (Oasis) is a separate, less integrated product",
      "Technology platform feels dated compared to modern solutions",
      "Service quality varies significantly by local office",
      "Complex pricing with many add-on fees",
      "Limited mobile app experience compared to ADP",
    ],
    adp_counters: [
      "ADP TotalSource is a fully integrated PEO — payroll, HR, benefits, compliance in one platform",
      "Modern technology platform with industry-leading mobile app",
      "Consistent service quality backed by 24/7/365 national support",
      "Transparent bundled pricing as a PEO",
      "40+ years of industry leadership with the deepest compliance expertise",
    ],
    killer_question:
      "Are you getting a true partner, or just a payroll processor? TotalSource means ADP is your co-employer — we have skin in the game on every compliance decision.",
    notes:
      "Paychex is the #1 most-tracked competitor (128 Klue cards). This is the most common head-to-head. Always emphasize the integrated PEO model vs Paychex's bolt-on approach.",
  },

  "DIY/None": {
    subject_lines: [
      "{{first_name}}, how much time does {{company_name}} spend on payroll?",
      "{{company_name}} is growing — is your HR keeping up?",
      "{{first_name}}, what if HR took zero hours of your week?",
    ],
    pain_points: [
      "Manual payroll is error-prone and creates tax liability risk",
      "No compliance safety net — one mistake can mean fines and lawsuits",
      "Time spent on HR admin is time not spent growing the business",
      "No access to enterprise-level benefits packages",
      "As you grow past 5-10 employees, the complexity compounds",
    ],
    adp_counters: [
      "TotalSource handles all payroll, tax filing, and compliance automatically",
      "Co-employment means ADP shares the liability — not just the work",
      "Access to Fortune 500 health insurance, 401(k), and benefits your team will love",
      "Free up 10-15 hours per week currently spent on HR admin",
      "One platform for everything: payroll, HR, benefits, compliance, hiring",
    ],
    killer_question:
      "How many hours a week do you personally spend on payroll and HR? What would you do with that time back?",
    notes:
      "These are your hottest leads. No switching costs, no competitor loyalty. Lead with time savings and liability reduction.",
  },

  Rippling: {
    subject_lines: [
      "{{first_name}}, is Rippling's tech enough when compliance gets real?",
      "{{company_name}} — software alone can't protect you from an audit",
      "{{first_name}}, who shares the liability when things go sideways?",
    ],
    pain_points: [
      "Rippling is software-only — no co-employment, no shared compliance liability",
      "No dedicated HR professionals on your account; support is ticket-based",
      "Complex modular pricing — costs escalate as you add each module",
      "Designed for tech companies; limited industry-specific compliance expertise",
      "No workers' comp co-management or EPLI coverage built in",
    ],
    adp_counters: [
      "TotalSource PEO model means ADP is your co-employer and shares compliance risk",
      "Dedicated HR Business Partner assigned to your account from day one",
      "All-inclusive bundled pricing — payroll, HR, benefits, compliance in one package",
      "75+ years of expertise across every industry vertical",
      "Built-in workers' comp, EPLI, and regulatory compliance management",
    ],
    killer_question:
      "Rippling gives you great software to manage HR tasks. But when a DOL auditor shows up or an employee files a discrimination claim, who's standing next to you? With TotalSource, ADP is your co-employer — we share that liability.",
    notes:
      "Rippling is gaining share fast in tech/startup space. Their strength is IT + HR integration (device management, app provisioning). Don't compete on tech features — compete on the PEO value prop: shared liability, dedicated expertise, enterprise benefits.",
  },

  BambooHR: {
    subject_lines: [
      "{{first_name}}, is BambooHR giving {{company_name}} real protection?",
      "Beyond employee records — what {{company_name}} needs next",
      "{{first_name}}, HR software ≠ HR expertise",
    ],
    pain_points: [
      "BambooHR is an HRIS — no payroll tax filing, no compliance management",
      "No co-employment model means zero shared liability protection",
      "Limited benefits administration — no access to enterprise-level plans",
      "No workers' comp management or EPLI coverage",
      "Requires bolting on separate payroll and benefits vendors",
    ],
    adp_counters: [
      "TotalSource is a complete solution: payroll, HR, benefits, and compliance in one platform",
      "Co-employment means ADP shares regulatory and compliance liability",
      "Fortune 500-level benefits packages with 98.2% in-network utilization",
      "Built-in workers' comp co-management and EPLI protection",
      "One vendor, one platform, one login — no bolt-on integrations needed",
    ],
    killer_question:
      "BambooHR keeps great employee records. But who files your payroll taxes, manages your workers' comp claims, and stands beside you during a compliance audit? With TotalSource, that's all included — and ADP shares the liability.",
    notes:
      "BambooHR is popular for its clean UI and culture features (eNPS, satisfaction surveys). Acknowledge the employee experience strengths, then pivot to what's missing: payroll, compliance, benefits, and shared liability.",
  },

  isolved: {
    subject_lines: [
      "{{first_name}}, is isolved keeping up with {{company_name}}'s growth?",
      "{{company_name}} — when your HCM can't share the compliance burden",
      "{{first_name}}, there's a difference between HCM software and an HR partner",
    ],
    pain_points: [
      "isolved is sold through a fragmented network of resellers — inconsistent service quality",
      "No co-employment model — all compliance risk stays with you",
      "Technology platform is less modern than competitors; user experience lags",
      "Support quality depends entirely on your local reseller partner",
      "Limited enterprise-grade benefits access for small employers",
    ],
    adp_counters: [
      "ADP provides consistent, national-level service quality — no reseller variability",
      "Co-employment means ADP shares compliance risk as your legal co-employer",
      "Industry-leading mobile app with 2.8M+ reviews and modern UX",
      "24/7/365 dedicated support from ADP professionals — not a third-party reseller",
      "Fortune 500 benefits buying power with 742,000+ worksite employees",
    ],
    killer_question:
      "When you call isolved support, are you reaching isolved — or a local reseller? With TotalSource, you get a dedicated ADP team that knows your business, available 24/7. And as your co-employer, we have skin in the game.",
    notes:
      "isolved uses a channel-partner model (resellers), which creates inconsistent experiences. This is the key attack vector. Also position against their 'People Cloud' branding — it's HCM software, not a PEO partnership.",
  },

  Insperity: {
    subject_lines: [
      "{{first_name}}, is Insperity the right fit for {{company_name}}'s size?",
      "{{company_name}} — comparing PEOs? Here's what matters most",
      "{{first_name}}, not all PEOs are created equal",
    ],
    pain_points: [
      "Insperity targets mid-market (50-5,000 employees) — small businesses get less attention",
      "Less flexible technology platform compared to ADP's modern suite",
      "Smaller benefits pool means less negotiating power on insurance rates",
      "Limited industry-specific compliance expertise for niche verticals",
      "No built-in ATS or recruiting tools — requires separate integrations",
    ],
    adp_counters: [
      "ADP TotalSource is purpose-built for small businesses (2-20 employees) with dedicated support",
      "Modern, industry-leading technology platform and mobile app",
      "742,000+ worksite employees = Fortune 500-level benefits buying power",
      "Deep compliance expertise across every industry vertical and all 50 states",
      "Built-in ATS with ZipRecruiter integration and background check services",
    ],
    killer_question:
      "Insperity is a solid PEO — but are you getting the attention you deserve? With 742,000+ worksite employees, ADP has more buying power for your benefits. And our Down Market team is dedicated to businesses exactly your size.",
    notes:
      "Insperity is a direct PEO competitor. Don't knock the PEO model (they validate it). Instead focus on scale advantages: ADP's larger benefits pool, better technology, and dedicated small business team. Insperity's sweet spot is 50-150 employees — position ADP as the better fit for smaller companies.",
  },
};

export const BATTLECARD_KNOWLEDGE: Record<string, {
  overview: string;
  why_adp_wins: string[];
  why_adp_loses: string[];
  pricing_intel: string;
  objection_handlers: Record<string, string>;
}> = {
  "Intuit QuickBooks": {
    overview: "41 Klue cards. Accounting-first platform that added payroll. Dominant brand in small biz. No real HR solution — outsources to Mineral Inc. Intuit acquired GoCo (April 2025) to add HR but no timeline for integration.",
    why_adp_wins: [
      "ADP rated #1 small business software by G2 (2025)",
      "True HR solution vs QuickBooks payroll-only approach",
      "SUI management, hiring tools (ZipRecruiter integration), background checks",
      "LifeMart employee discounts, EAP, HR Tracking, Cloud-Based Storage",
      "24/7/365 customer support across multiple channels",
      "Dedicated onboarding for all client sizes",
      "Stable pricing — no post-promo sticker shock",
      "Registers with tax agencies in all 50 states without third parties",
      "Free printed labor law posters (QuickBooks charges extra)",
      "Built-in salary benchmarks for pay transparency compliance",
      "Money movement capability",
    ],
    why_adp_loses: [
      "QuickBooks has massive brand awareness and aggressive discounting (50-90% off)",
      "Accounting + payroll bundle creates stickiness",
      "800+ app integrations via marketplace",
      "Intuit Assist AI and upcoming AI Agents (Payroll Agent coming soon)",
      "ProAdvisor program incentivizes accountants to keep clients on QB",
      "E-commerce buying experience — prospects can sign up without talking to sales",
    ],
    pricing_intel: "QBO Payroll tiers: Core, Premium, Elite. Introductory promos run 3 months at 50% off (sometimes 75-90%). Per-employee fees range $4-$10/month. Multi-state filing $12/month extra. Service optimized for up to 50 employees, capped at 150.",
    objection_handlers: {
      "We already use QuickBooks for accounting": "That's great — and ADP integrates with QuickBooks for accounting. The question is whether QuickBooks payroll gives you the HR protection you need. When's the last time you had an employee issue that QuickBooks couldn't help with?",
      "QuickBooks is cheaper": "It is — for the first 3 months. After the promo ends, prices jump 50-100%. More importantly, what's the cost of handling an HR issue without professional support? One EEOC complaint can cost $50,000+. TotalSource's co-employment model means ADP shares that liability.",
      "We don't need HR features": "Most companies say that until they do. With {{employee_count}} employees, you're one pregnancy leave question, one ADA accommodation request, or one termination dispute away from needing HR expertise. TotalSource means that expertise is already in place.",
      "QuickBooks just acquired GoCo for HR": "They did — but there's no timeline for integration, and when it does come, it'll be a bolted-on acquisition vs ADP's 75+ years of HR expertise built into the platform from the ground up.",
    },
  },

  Justworks: {
    overview: "32 Klue cards. PEO model targeting tech startups and small businesses. Simple UI, transparent pricing, fast implementation. Key gaps: limited reporting (20 pre-built only), no dedicated account managers, outsources HR to ThinkHR.",
    why_adp_wins: [
      "Full custom reporting and analytics (Justworks: 20 pre-built reports only)",
      "Dedicated account manager from day one",
      "Total Compensation Statements",
      "Compliance reporting",
      "Org charting and policy acknowledgments",
      "Training library and talent management features",
      "Employee surveys and engagement tools",
      "Salary benchmarking capabilities",
      "OSHA support",
      "Mobile app: 2.8M+ reviews, #5 free business app (Justworks: under 75 reviews)",
      "In-house HR experts (Justworks outsources to ThinkHR, not 24/7)",
    ],
    why_adp_loses: [
      "Justworks has transparent PEPM pricing on their website",
      "Simple, clean UI/UX attractive to tech companies",
      "Fast implementation: online in 4-5 days, enrollment in 2-3 weeks",
      "Slack integration for support",
      "Startup-friendly: real-time payroll tax deduction adjustments for R&D credits",
      "5-year average NPS of 58%",
    ],
    pricing_intel: "Transparent PEPM pricing on website. Basic plan: Workers Comp only. Plus plan: adds benefits. Usage-based billing for international contractor payments.",
    objection_handlers: {
      "Justworks is easier to set up": "Justworks can get you running in a week — but what about month 6 when you need a custom report for your board, or month 12 when you need to benchmark salaries? ADP's setup takes a bit longer because we're building something that scales with you.",
      "We like the transparent pricing": "Transparency is great. Let's compare total value: Justworks' Plus plan vs TotalSource, feature by feature. When you factor in what Justworks charges extra for or simply doesn't offer — analytics, dedicated AM, talent management — TotalSource often comes out ahead.",
      "Justworks has a PEO too": "They do — but it's a technology-first PEO. When you need real HR guidance, they transfer you to ThinkHR, a third party that isn't available 24/7. ADP's HR professionals are in-house, available around the clock, and they know your account.",
      "We're a startup, Justworks gets us": "Justworks is great for getting started. The question is: does it grow with you? At {{employee_count}} employees, you're already hitting the limits of 20 pre-built reports and no talent management. TotalSource is built for where you're going, not just where you are.",
    },
  },

  Gusto: {
    overview: "18 Klue cards. Payroll/HR software platform for small businesses. Not a PEO. Key differentiator: Gusto Wallet with early pay and financial wellness tools. Strong with startups and micro-businesses under 10 employees.",
    why_adp_wins: [
      "PEO model: co-employment means shared compliance liability",
      "Fortune 500-level benefits packages at small business prices",
      "Dedicated HR team — not just a help center",
      "Workers comp, EPLI, and regulatory compliance handled by ADP",
      "Enterprise-grade compliance support",
      "Scales for companies growing beyond 20 employees",
    ],
    why_adp_loses: [
      "Gusto Wallet: early pay (2 days), no fees, financial wellness tools",
      "Clean, modern interface",
      "Self-service model appeals to DIY-minded founders",
      "Apple Pay and Google Pay integration",
      "Gusto Wallet Premium: up to 2.00% APY on savings",
      "Lower price point for payroll-only needs",
    ],
    pricing_intel: "Software-only pricing model. Lower than PEO pricing but doesn't include PEO benefits (co-employment, enterprise benefits, shared liability).",
    objection_handlers: {
      "Gusto is cheaper": "For payroll alone, it often is. But Gusto is software — you're the HR department. TotalSource is a partnership. When you add up the cost of an HR consultant, employment practices liability insurance, and enterprise benefits separately, TotalSource is often the better value.",
      "Our employees love Gusto Wallet": "The Wallet features are nice. ADP offers Wisely — same early pay, same digital wallet, plus it's backed by the largest payroll company in the world. The real question is: does your employee love Gusto enough to handle their own discrimination claim?",
      "We don't need a PEO": "Most companies with {{employee_count}} employees don't think they do — until they get their first DOL audit, EEOC complaint, or workers comp claim. The PEO model means ADP has skin in the game on every compliance decision. That protection is the product.",
    },
  },

  Paychex: {
    overview: "128 Klue cards — most tracked competitor. Largest head-to-head competitor. Offers payroll and has a PEO product (Paychex Oasis), but it's a separate, less integrated experience than TotalSource.",
    why_adp_wins: [
      "Fully integrated PEO platform — not a bolt-on acquisition",
      "Modern technology with industry-leading mobile app",
      "Consistent national service quality (Paychex varies by local office)",
      "24/7/365 support with no local office dependency",
      "40+ years of industry leadership",
      "Deeper compliance expertise and regulatory coverage",
    ],
    why_adp_loses: [
      "Paychex has strong local sales presence",
      "Established relationships with accountants and brokers",
      "Competitive pricing on payroll-only deals",
      "Oasis PEO is a known brand in the PEO space",
    ],
    pricing_intel: "Complex pricing with many add-on fees. Varies significantly by local office and salesperson. Often competitive on base payroll price but adds up with extras.",
    objection_handlers: {
      "We already use Paychex": "Paychex is solid for payroll processing. The question is whether you're getting a true HR partner or just a payroll vendor. With TotalSource, ADP is your co-employer — we have skin in the game on every compliance decision. Does Paychex share that liability with you?",
      "Our accountant recommended Paychex": "Many accountants recommend what they know. We work with thousands of accounting firms through our RUN for Partners program. I'd love to show you — and your accountant — how TotalSource goes beyond payroll into full HR protection.",
      "Paychex Oasis is a PEO too": "It is — but Oasis was an acquisition that's still being integrated. TotalSource was built from the ground up as an integrated PEO platform. Ask your Paychex rep if your payroll, HR, benefits, and compliance all live in one system with one login. With TotalSource, they do.",
    },
  },
};

function fillMerge(template: string, fields: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(fields)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || `{{${key}}}`);
  }
  return result;
}

export function getCompetitorTemplate(provider: string): CompetitorTemplate | null {
  return OUTREACH_TEMPLATES[provider] ?? null;
}

export function buildCompetitorEmail(lead: Lead): { subject: string; body: string } | null {
  const provider = lead.current_provider ?? "";
  const tpl = getCompetitorTemplate(provider);
  if (!tpl) return null;

  const firstName = (lead.decision_maker_name ?? "").split(" ")[0] || "there";
  const mergeFields: Record<string, string> = {
    first_name: firstName,
    company_name: lead.company_name,
    employee_count: lead.headcount ? String(lead.headcount) : "",
    current_provider: provider,
    industry: lead.industry ?? "",
  };

  // Random subject line
  const subjectTemplate = tpl.subject_lines[Math.floor(Math.random() * tpl.subject_lines.length)];
  const subject = fillMerge(subjectTemplate, mergeFields);

  // Pick a pain point and matching counter (index-aligned)
  const painIdx = Math.floor(Math.random() * tpl.pain_points.length);
  const painPoint = tpl.pain_points[painIdx];
  const counter = tpl.adp_counters[painIdx] ?? tpl.adp_counters[0];

  // Build hook based on trigger event if available
  let hook: string;
  if (lead.trigger_event) {
    hook = `I noticed ${lead.company_name} recently ${lead.trigger_event.toLowerCase()}. That kind of change often puts new pressure on HR and payroll operations.`;
  } else if (lead.headcount) {
    hook = `With ${lead.headcount} employees, ${lead.company_name} is at the stage where HR complexity starts to outpace what most small business tools can handle.`;
  } else {
    hook = `I've been researching ${lead.company_name} and wanted to share something that might save you significant time and risk.`;
  }

  const killerQ = fillMerge(tpl.killer_question, mergeFields);

  const body = `Hi ${firstName},

${hook}

Here's something worth considering: ${painPoint.toLowerCase()}.

The good news? ${counter}.

${killerQ}

Would a 15-minute call make sense to explore whether TotalSource could be a fit for ${lead.company_name}?

Best regards,
Eric`;

  return { subject, body };
}
