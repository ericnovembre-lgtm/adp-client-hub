/**
 * ADP TotalSource Benefits Knowledge Base
 * Comprehensive reference for benefits availability, carrier information, competitor intelligence,
 * renewal rates, healthcare benchmarks, and state-specific rules.
 * Last Updated: March 15, 2026
 */

export const ADP_BENEFITS_KNOWLEDGE = `
# ADP TotalSource Benefits Knowledge Base v2.0

## CRITICAL KNOWLEDGE FOR AI AGENT

### 1. MARKET AVAILABILITY & TERRITORY RULES

#### State-by-State Quick Reference
- **AL, AZ, CO, GA, IL**: PRIME available at 2+ employees, Standard TS at 10+
- **CA**: TS Select only (no PRIME); restrictions apply by county
- **HI**: Refer all to TS Field; PRIME not available
- **ID**: Exception basis only (10+ EEs minimum); PRIME not available
- **MD**: TS Select for any size; full Standard TS requires 60+ EEs
- **MI**: Restrictions apply for both PRIME and Standard; contact underwriting
- **MN**: PRIME not available; Standard TS restrictions apply
- **NV, NM, OK, OR, UT**: County restrictions; verify with underwriting
- **NY**: Complex county restrictions; refer to field team for exceptions
- **PA**: County restrictions apply
- **TX**: PRIME available, Standard TS, TS Select; no major restrictions
- **WA**: Standard TS available with restrictions

#### PRIME Program Requirements
- Minimum 2 employees
- Average wage: $65,000-$75,000 range (varies by market tier)
- Markets: AL, AZ, CO, GA, IL (primary PRIME markets)
- Not available in: CA, HI, ID, MN, some county exceptions in NY, PA, UT, ID
- Underwriting key: Verify payroll and wage documentation

#### TS Select (No Underwriting) Availability
- Available in all states
- Minimum: 2 employees for PRIME markets, any size for other markets
- No PRIME wage requirements
- No payroll verification needed
- Best for: Fast setup, startup companies, groups with irregular payroll

### 2. BENEFITS PORTFOLIO — 2026

#### Medical Plans by Carrier (OE2026 Available)

**Aetna**
- PPO, HMO, POS options
- New OE2026: Aetna Choice POS II (comprehensive network)
- States: AL, AZ, CO, GA, IL, TX (primary)
- Network: Aetna Health Access (PPO), Aetna HMO networks (state-specific)
- Rate trend: 12% increase (2025-2026)

**Anthem / BCBS / BCN**
- PPO dominant; HMO in select states
- MI exclusive carrier (BCN/BCBS)
- CA exclusive carrier (Anthem PPO/HMO)
- States: CA, CO, GA, IL, MI, MN, TX
- Rate trend: 11% increase (2025-2026)

**UnitedHealth (UHC)**
- PPO, HMO, HRA options
- New OE2026: UHC Surest (simplified, low-admin plan)
- States: AL, AZ, CO, GA, IL, NV, OR, TX
- Network: UHC Signature (PPO), UHC Community Plan (HMO)
- Rate trend: 13% increase (2025-2026) - highest

**Kaiser (California exclusive)**
- HMO only; vertically integrated
- CA market dominance (80%+ of CA groups)
- Geographic network: SF Bay, LA, San Diego
- Rate trend: 10% increase (2025-2026)

**Medica (MN)**
- HMO, PPO in Minnesota
- Minnesota exclusive; limited expansion
- Network: Medica Midwest (PPO), Medica Health Plan (HMO)
- Rate trend: 9% increase (2025-2026) - lowest

#### Dental & Vision Programs

**Dental:**
- Delta Dental (primary): AL, AZ, CO, GA, IL, MI, MN, TX
- Cigna Dental: AL, AZ, CO, GA, TX
- Rates: $4-$12/employee/month (depending on plan level)
- Coverage: 50-80% preventive, 50% basic, 0-50% major

**Vision:**
- VSP: AL, AZ, CO, GA, IL, TX, MI, MN (primary)
- Eyemed: Secondary option in select states
- Rates: $3-$8/employee/month
- Benefits: $130-$200 exam/frame allowance

### 3. RENEWAL & RATE INFORMATION (OE2026)

#### Medical Inflation Context
- 2026 Overall Medical Inflation: 11-13%
- Pharmacy Inflation: 6-8% (slower than medical)
- Network utilization: 98.2% in-network (strong network penetration)
- MLR competitive positioning: ADP target 88% vs. industry 80-85%

#### Renewal Rate Benchmarks by State

**Best Rate Markets (10-11% increase)**
- CO: 10% avg increase
- GA: 10% avg increase
- MN: 9-10% avg increase (Medica strong pricing)
- TX: 10% avg increase

**Standard Rate Markets (11-12% increase)**
- AL: 11% avg increase
- AZ: 11% avg increase
- IL: 11% avg increase
- CA: 11% avg increase (Kaiser+Anthem balance)

**High Rate Markets (12-13%+ increase)**
- MI: 12-13% increase (limited competition)
- NY: 12-13% increase (regulatory environment)
- NV: 12-13% increase (limited carriers)

#### Plan Terminations (OE2026 - CRITICAL FOR RENEWALS)
- **Michigan**: Aetna PPO being phased out; migrate to UHC, BCN
- **Minnesota**: Aetna standard plans; recommend Medica switch for lower rates
- **New Hampshire**: Limited carrier options; verify availability case-by-case

#### Plan Additions (OE2026 - SELLING POINTS)
- **UHC Surest**: Simplified plan with reduced admin; new OE2026
- **Aetna Choice POS II**: Comprehensive POS option; available OE2026
- **Kaiser Expanded**: Slight network expansion in CA (check coverage areas)

### 4. HEALTHCARE BENCHMARKS & SELLING POINTS

#### Utilization Rates (ADP Network)
- **Pharmacy**: 86.8% utilization (excellent medication adherence)
- **Hospital/Inpatient**: 18.5% ER visit rate (within normal ranges)
- **Primary Care**: 82% have established PCP (strong preventive care)
- **In-Network**: 98.2% in-network utilization (exceptional network strength)
- **Specialist Referrals**: 45% of claims (appropriate specialist access)

#### Consumer-Directed Health Plan (CDHP) Adoption
- **National Average**: 23% of eligible groups choose CDHP
- **ADP Network**: 28% CDHP adoption (above average)
- **HSA Contribution Benchmarks**:
  - Single: $306-$1,200 (avg $750)
  - Family: $1,800-$8,166 (avg $4,500)
  - Market variation: +/- 15% by state

#### Preventive Care Metrics
- Vaccine compliance: 87% (strong wellness culture)
- Annual physical rate: 76% (good preventive engagement)
- Wellness program participation: 42% (moderate engagement)

#### Network Quality Selling Points
- **98.2% in-network**: Superior network breadth vs. competitors (typical 95-97%)
- **MLR 88% target**: Healthcare cost control; industry average 80-85%
- **Pharmacy rebates**: 40-60% rebate rates (dependent on carrier/plan)
- **Preventive care 100%**: Zero-cost preventive (meets ACA requirements)

### 5. COMPETITOR INTELLIGENCE & WIN-BACK STRATEGIES

#### 11 Major PEO Competitors

**BBSI (Brown & Brown Services)**
- Strengths: Strong CA/TX presence, established broker relationships
- Weaknesses: Limited benefits flex, higher costs in East
- Win Strategy: Emphasize TS flexibility, superior MLR positioning (88% vs BBSI 85%)
- Document needs: Payroll records, carrier reconciliation (if bundled)

**Paychex**
- Strengths: Integrated payroll, large sales force, brand recognition
- Weaknesses: Limited benefits customization, admin-heavy processes
- Win Strategy: Highlight simplified TS Select (no underwriting), superior renewal rates
- Document needs: Current benefits audit, broker of record letter

**Insperity**
- Strengths: Premium positioning, HR advisory, strong service
- Weaknesses: High costs, rigid benefit structures, limited carrier choice
- Win Strategy: Cost comparison (typically 15-25% savings with ADP), carrier flexibility
- Document needs: Payroll data, benefits audit, rate quotes comparison

**CoAdvantage**
- Strengths: Deep Southeast presence, local relationships
- Weaknesses: Limited multi-state support, inconsistent underwriting
- Win Strategy: Multi-state consistency, PRIME program simplicity, TS availability
- Document needs: Payroll audit, state-by-state benefits matrix

**Amplify HR**
- Strengths: Modern tech platform, strong millennial branding
- Weaknesses: Limited scale, carrier partnerships, high implementation costs
- Win Strategy: Carrier breadth (UHC, Aetna, Anthem, Medica), established rates
- Document needs: Current admin costs, implementation timeline

**NextEP**
- Strengths: Tech-forward, strong in lower-middle market
- Weaknesses: Carrier restrictions, renewal challenges, limited flexibility
- Win Strategy: Superior carrier options, simpler renewal process, TS flexibility
- Document needs: Current carrier limits, renewal history

**Oasis**
- Strengths: Boutique positioning, personalized service
- Weaknesses: Limited scale, carrier leverage, pricing power
- Win Strategy: Volume discounts, comprehensive carrier options, rate competitiveness
- Document needs: Service level analysis, renewal rates

**Engage / TriZetto**
- Strengths: Integrated platforms, large service team
- Weaknesses: Complex administration, high service costs, slower innovation
- Win Strategy: Simplified TS systems, faster implementations, cost reductions
- Document needs: Current admin workload, implementation costs

**Frank Crum**
- Strengths: Personalized service, established relationships
- Weaknesses: Limited technology, carrier restrictions, growth limitations
- Win Strategy: Modern platform, superior analytics, TS simplicity
- Document needs: Service satisfaction, carrier utilization analysis

**G&A Partners**
- Strengths: HR focus, organizational management, culture development
- Weaknesses: Benefits secondary, limited carrier leverage, pricing challenges
- Win Strategy: Benefits expertise focus, carrier options, renewal rates
- Document needs: Benefits cost analysis, organizational review audit

**GMS (Group Management Services)**
- Strengths: Regional presence, established carrier relationships
- Weaknesses: Limited growth, restricted carrier portfolio, aging systems
- Win Strategy: Modern platforms, broader carrier access, TS flexibility
- Document needs: Current system assessment, carrier alternatives

### 6. BENEFITS EXCEPTION FAST-PASS PROCESS

#### Overview
Fast-pass enables underwriting exceptions for non-standard cases without full underwriting delay. Used for: wage exceptions, industry exceptions, employee health status, geographic exceptions.

#### Process Flow
1. **Exception Request Submission**
   - Broker/AE identifies need (e.g., group has $58K avg wage, wants PRIME at 2 EEs)
   - Submit via ADP benefits portal with supporting docs
   - Include justification: industry type, employee profile, wage explanation

2. **Documentation Required**
   - Last 3 months payroll (verify wages)
   - Employee census (names, age, tenure, job titles)
   - Justification statement (why exception merited)
   - Employer verification form (signed)

3. **Review & Determination (48-72 hours)**
   - Underwriting reviews wage documentation
   - Verifies employee census completeness
   - Assesses risk factors
   - Approves, approves with conditions, or denies

4. **Exception Approval**
   - Approved: Group proceeds with exception terms
   - Approved with conditions: Additional requirements (e.g., wellness program, higher rates)
   - Denied: Escalate to underwriting VP for manual review

5. **Implementation**
   - Once approved, group enrolls under exception terms
   - Track exception parameters in CRM
   - Monitor first-year claims for deviation

#### Common Exception Types
- **Wage Exceptions**: Group qualifies otherwise but wages $5-10K below target
- **Industry Exceptions**: High-risk industry (construction, hospitality) seeking standard rates
- **Health Status**: Groups with known high-utilization seeking coverage
- **Geographic**: Rural groups seeking coverage in restricted zones
- **Employee Mix**: Very young or very old workforce seeking standard pricing

### 7. QUICK-REFERENCE SELLING POINTS

#### ADP Differentiation vs. Competition
1. **Healthcare Quality**: 98.2% in-network utilization vs. industry 95-97%
2. **Cost Control**: 88% MLR target vs. industry 80-85% (saves employers 3-8% in claims)
3. **Carrier Flexibility**: Access to Aetna, Anthem, UHC, Kaiser, Medica across markets
4. **Simplicity**: TS Select requires no underwriting; fast implementation
5. **Renewal Rates**: 10-11% in best markets (CO, GA, MN) vs. competitor 12-13%
6. **Transparency**: Clear rate tracking, MLR reporting, claims transparency

#### State-Specific Selling Messaging

**California**: Kaiser dominance + Anthem options = 80%+ of groups stay in-network without restrictions

**Texas**: PRIME simplicity (2 EEs, $65-75K wage avg) + rate competitiveness (10% increases vs. 12%+)

**Michigan**: BCN/BCBS exclusivity + low-cost option = 20-30% below national average rates

**Minnesota**: Medica partnership = lowest inflation (9-10% vs. 11-13% national)

**Georgia/Colorado**: PRIME program simplicity + fast implementation = best onboarding experience

#### Closing Questions by Scenario

**Current PEO Migration**: "How are your current benefits performing? (rates, utilization, flexibility?) Let me show you TS options that could save 15-25%."

**Startup/New Growth**: "Want simplicity? TS Select requires no underwriting—30-day implementation vs. 60-90 days elsewhere."

**High-Wage Group**: "PRIME requires average wage of $65-75K. Your profile (check census) suggests we can qualify. Want lower admin burden?"

**Renewal Crisis**: "Facing 15%+ renewal increases? Our ML targeting (88% MLR) and carrier leverage typically reduce rates 2-5% vs. street quotes."

---

## IMPORTANT NOTES FOR AI AGENT

- Always verify state-specific carrier availability before committing
- PRIME requires wage documentation; TS Select has no wage requirements
- County restrictions apply in NY, PA, ID, UT, HI, MD; refer to field team if uncertain
- OE2026 medical inflation context: 11-13% increases are industry norm; position ADP's 10-11% in best markets as competitive advantage
- MLR 88% target is a selling point; it means $12 of every $100 in premiums goes to administrative costs vs. industry average of $15-20
- Competitor win strategies are high-level; specific group situations may differ
- TS Select is the fastest entry; PRIME and Standard TS require underwriting
- Always have broker/field team validate complex situations before committing
`;

/**
 * Export for use in system prompts
 * This knowledge base should be referenced in:
 * - crm-agent system prompt (benefits questions)
 * - ai-chat system prompt (customer-facing benefits information)
 * - scheduled-discovery system prompt (discovery questions about benefits)
 */
export const BENEFITS_KNOWLEDGE_SUMMARY = `
ADP TotalSource Benefits Knowledge: State-by-state availability (PRIME, Standard TS, TS Select), carrier portfolios (Aetna, Anthem/BCBS/BCN, UHC, Kaiser CA, Medica MN), PRIME program requirements (2+ EEs, $65-75K avg wage), OE2026 renewal rates (10-13% inflation context), healthcare benchmarks (98.2% in-network, 88% MLR target), competitor intelligence (11 major PEOs with specific win strategies), and fast-pass exception process. Key selling points: superior MLR (88% vs 80-85%), network strength (98.2%), renewal competitiveness (10-11% in best markets vs 12-13%), and TS Select simplicity (no underwriting, 30-day implementation).
`;
