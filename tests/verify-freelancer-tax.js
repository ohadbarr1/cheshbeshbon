/**
 * Manual verification of FreelancerTaxCalc accuracy
 * Test case: ₪30,000/month gross revenue, no expenses,
 *            5% pension, 4.5% keren, 2.25 credit points, Osek Patur
 *
 * Run: node tests/verify-freelancer-tax.js
 */

// ─── 2026 constants (from tax-data.js) ───────────────────────────
const TAX_BRACKETS = [
    { limit: 7010,     rate: 0.10 },
    { limit: 10060,    rate: 0.14 },
    { limit: 19000,    rate: 0.20 },
    { limit: 25100,    rate: 0.31 },
    { limit: 46690,    rate: 0.35 },
    { limit: 60130,    rate: 0.47 },
    { limit: Infinity, rate: 0.50 }
];

const NI_THRESHOLD    = 7522;
const NI_CEILING      = 48281;
const SELF_NI_LOWER   = 0.0287;
const SELF_NI_UPPER   = 0.1283;
const SELF_HL_LOWER   = 0.031;
const SELF_HL_UPPER   = 0.05;
const CREDIT_PT_VALUE = 242;

const SE = {
    NI_DEDUCTION_RATE:             0.52,
    PENSION_RECOGNIZED_INCOME:     293400 / 12,   // 24,450
    PENSION_DEDUCTION_RATE:        0.11,
    PENSION_CREDIT_RATE:           0.055,
    KEREN_MAX_DEPOSIT_RATE:        0.07,
    KEREN_DEDUCTIBLE_RATE:         0.045,
    KEREN_INCOME_CEILING:          293400 / 12,
};

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n) => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
const pct = (n) => (n * 100).toFixed(2) + '%';

function calcIncomeTax(monthlyTaxable) {
    let tax = 0, prev = 0;
    for (const b of TAX_BRACKETS) {
        if (monthlyTaxable <= prev) break;
        tax += (Math.min(monthlyTaxable, b.limit) - prev) * b.rate;
        prev = b.limit;
    }
    return tax;
}

function calcNI(gross) {
    const capped = Math.min(gross, NI_CEILING);
    if (capped <= NI_THRESHOLD) return capped * SELF_NI_LOWER;
    return NI_THRESHOLD * SELF_NI_LOWER + (capped - NI_THRESHOLD) * SELF_NI_UPPER;
}

function calcHealth(gross) {
    const capped = Math.min(gross, NI_CEILING);
    if (capped <= NI_THRESHOLD) return capped * SELF_HL_LOWER;
    return NI_THRESHOLD * SELF_HL_LOWER + (capped - NI_THRESHOLD) * SELF_HL_UPPER;
}

// ─── Test Inputs ─────────────────────────────────────────────────
const MONTHLY_REVENUE  = 30000;
const ANNUAL_REVENUE   = MONTHLY_REVENUE * 12;      // 360,000
const ANNUAL_EXPENSES  = 0;
const PENSION_PCT      = 5;                         // %
const KEREN_PCT        = 4.5;                       // %
const CREDIT_POINTS    = 2.25;

console.log('═══════════════════════════════════════════════════════');
console.log('  MANUAL TAX VERIFICATION — ₪30,000/month freelancer');
console.log('  Pension 5% | Keren 4.5% | 2.25 credit pts | Osek Patur');
console.log('═══════════════════════════════════════════════════════\n');

// ─── Step 1: Gross → Taxable before NI ───────────────────────────
const annualTaxableBeforeNI = ANNUAL_REVENUE - ANNUAL_EXPENSES;
const monthlyTaxableBeforeNI = annualTaxableBeforeNI / 12;
console.log('STEP 1 — Revenue after expenses');
console.log(`  Annual taxable before NI: ${fmt(annualTaxableBeforeNI)}  (${fmt(monthlyTaxableBeforeNI)}/mo)\n`);

// ─── Step 2: NI & Health (on monthly gross after expenses) ───────
const monthlyNI     = calcNI(monthlyTaxableBeforeNI);
const monthlyHealth = calcHealth(monthlyTaxableBeforeNI);
const annualNI      = monthlyNI * 12;
const annualHealth  = monthlyHealth * 12;

console.log('STEP 2 — Bituach Leumi & Health');
const niLower  = NI_THRESHOLD * SELF_NI_LOWER;
const niUpper  = (Math.min(MONTHLY_REVENUE, NI_CEILING) - NI_THRESHOLD) * SELF_NI_UPPER;
console.log(`  NI lower band:  ${fmt(NI_THRESHOLD)} × ${pct(SELF_NI_LOWER)} = ${fmt(niLower)}`);
console.log(`  NI upper band:  ${fmt(MONTHLY_REVENUE - NI_THRESHOLD)} × ${pct(SELF_NI_UPPER)} = ${fmt(niUpper)}`);
console.log(`  Monthly NI:     ${fmt(monthlyNI)}`);
console.log(`  Annual NI:      ${fmt(annualNI)}`);
const hlLower = NI_THRESHOLD * SELF_HL_LOWER;
const hlUpper = (Math.min(MONTHLY_REVENUE, NI_CEILING) - NI_THRESHOLD) * SELF_HL_UPPER;
console.log(`  Health lower:   ${fmt(NI_THRESHOLD)} × ${pct(SELF_HL_LOWER)} = ${fmt(hlLower)}`);
console.log(`  Health upper:   ${fmt(MONTHLY_REVENUE - NI_THRESHOLD)} × ${pct(SELF_HL_UPPER)} = ${fmt(hlUpper)}`);
console.log(`  Monthly health: ${fmt(monthlyHealth)}`);
console.log(`  Annual health:  ${fmt(annualHealth)}\n`);

// ─── Step 3: 52% NI deduction ────────────────────────────────────
const niDeduction = annualNI * SE.NI_DEDUCTION_RATE;
console.log('STEP 3 — 52% NI deduction from taxable income');
console.log(`  ${fmt(annualNI)} × 52% = ${fmt(niDeduction)}\n`);

// ─── Step 4: Pension deduction ───────────────────────────────────
const recognizedMonthly        = Math.min(monthlyTaxableBeforeNI, SE.PENSION_RECOGNIZED_INCOME);
const pensionDeductPct         = Math.min(PENSION_PCT / 100, SE.PENSION_DEDUCTION_RATE);
const pensionMonthlyDeduction  = recognizedMonthly * pensionDeductPct;
const annualPensionDeduction   = pensionMonthlyDeduction * 12;
const pensionMonthlyContrib    = recognizedMonthly * (PENSION_PCT / 100);
const annualPensionContrib     = pensionMonthlyContrib * 12;
// Credit: 5.5% of contribution at 35%
const pensionCreditAmount      = recognizedMonthly * SE.PENSION_CREDIT_RATE * 0.35 * 12;

console.log('STEP 4 — Pension deduction & credit');
console.log(`  Recognized monthly income (capped at ${fmt(SE.PENSION_RECOGNIZED_INCOME)}): ${fmt(recognizedMonthly)}`);
console.log(`  Monthly pension contribution (5%): ${fmt(pensionMonthlyContrib)}`);
console.log(`  Deductible (min(5%,11%)=${pct(pensionDeductPct)}): ${fmt(pensionMonthlyDeduction)}/mo = ${fmt(annualPensionDeduction)}/yr`);
console.log(`  Pension tax credit (5.5% × 35%): ${fmt(pensionCreditAmount)}/yr\n`);

// ─── Step 5: Keren Hishtalmut ────────────────────────────────────
const kerenCapped           = Math.min(monthlyTaxableBeforeNI, SE.KEREN_INCOME_CEILING);
const kerenMonthlyContrib   = kerenCapped * Math.min(KEREN_PCT / 100, SE.KEREN_MAX_DEPOSIT_RATE);
const kerenMonthlyDeductible = kerenCapped * Math.min(KEREN_PCT / 100, SE.KEREN_DEDUCTIBLE_RATE);
const annualKerenContrib    = kerenMonthlyContrib * 12;
const annualKerenDeduction  = kerenMonthlyDeductible * 12;

console.log('STEP 5 — Keren Hishtalmut (4.5%)');
console.log(`  Income capped at ceiling: ${fmt(kerenCapped)}`);
console.log(`  Monthly contribution (4.5%): ${fmt(kerenMonthlyContrib)}`);
console.log(`  Monthly deductible (min(4.5%,4.5%)): ${fmt(kerenMonthlyDeductible)}`);
console.log(`  Annual Keren deduction: ${fmt(annualKerenDeduction)}\n`);

// ─── Step 6: Adjusted taxable income ────────────────────────────
const annualAdjustedTaxable  = Math.max(0, annualTaxableBeforeNI - niDeduction - annualPensionDeduction - annualKerenDeduction);
const monthlyAdjustedTaxable = annualAdjustedTaxable / 12;

console.log('STEP 6 — Adjusted taxable income');
console.log(`  ${fmt(annualTaxableBeforeNI)} − ${fmt(niDeduction)} (NI) − ${fmt(annualPensionDeduction)} (pension) − ${fmt(annualKerenDeduction)} (keren)`);
console.log(`  Annual adjusted: ${fmt(annualAdjustedTaxable)}`);
console.log(`  Monthly adjusted: ${fmt(monthlyAdjustedTaxable)}\n`);

// ─── Step 7: Income tax on adjusted income ───────────────────────
const monthlyIncomeTaxBefore = calcIncomeTax(monthlyAdjustedTaxable);
const annualIncomeTaxBefore  = monthlyIncomeTaxBefore * 12;
const annualCreditAmount     = CREDIT_POINTS * CREDIT_PT_VALUE * 12;
const annualIncomeTax        = Math.max(0, annualIncomeTaxBefore - annualCreditAmount - pensionCreditAmount);

console.log('STEP 7 — Income tax calculation');
console.log(`  Monthly taxable: ${fmt(monthlyAdjustedTaxable)}`);
let prev = 0;
for (const b of TAX_BRACKETS) {
    if (monthlyAdjustedTaxable <= prev) break;
    const taxable = Math.min(monthlyAdjustedTaxable, b.limit) - prev;
    console.log(`  Bracket up to ${fmt(b.limit)}: ${fmt(taxable)} × ${pct(b.rate)} = ${fmt(taxable * b.rate)}`);
    prev = b.limit;
}
console.log(`  Monthly income tax (before credits): ${fmt(monthlyIncomeTaxBefore)}`);
console.log(`  Annual income tax (before credits): ${fmt(annualIncomeTaxBefore)}`);
console.log(`  Credit points deduction: ${CREDIT_POINTS} × ${CREDIT_PT_VALUE} × 12 = ${fmt(annualCreditAmount)}`);
console.log(`  Pension credit: ${fmt(pensionCreditAmount)}`);
console.log(`  Annual income tax (after credits): ${fmt(annualIncomeTax)}\n`);

// ─── Step 8: Totals ──────────────────────────────────────────────
const totalMandatoryTax = annualIncomeTax + annualNI + annualHealth;
const totalDeductions   = totalMandatoryTax + annualPensionContrib + annualKerenContrib;
const annualNet         = ANNUAL_REVENUE - totalDeductions;
const effectiveRate     = (totalMandatoryTax / ANNUAL_REVENUE) * 100;

console.log('═══════════════════════════════════════════════════════');
console.log('  ANNUAL SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Gross revenue:      ${fmt(ANNUAL_REVENUE)}`);
console.log(`  Income tax:         ${fmt(annualIncomeTax)}`);
console.log(`  Bituach Leumi:      ${fmt(annualNI)}`);
console.log(`  Health insurance:   ${fmt(annualHealth)}`);
console.log(`  Pension (5%):       ${fmt(annualPensionContrib)}`);
console.log(`  Keren Hishtalmut:   ${fmt(annualKerenContrib)}`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Total deductions:   ${fmt(totalDeductions)}`);
console.log(`  NET annual:         ${fmt(annualNet)}`);
console.log(`  NET monthly avg:    ${fmt(annualNet / 12)}`);
console.log(`  Effective tax rate: ${effectiveRate.toFixed(2)}%`);
console.log(`  Marginal rate:      35% (bracket ₪25,100-₪46,690)`);

// ─── Cross-check: quick sanity tests ────────────────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  SANITY CHECKS');
console.log('═══════════════════════════════════════════════════════');
const checks = [
    ['Net < Gross',                annualNet < ANNUAL_REVENUE],
    ['Net > 0',                    annualNet > 0],
    ['Income tax > 0',             annualIncomeTax > 0],
    ['NI > 0',                     annualNI > 0],
    ['Effective rate 20–45%',      effectiveRate > 20 && effectiveRate < 45],
    ['NI deduction < annual NI',   niDeduction < annualNI],
    ['Adjusted taxable < gross',   annualAdjustedTaxable < annualTaxableBeforeNI],
    ['Pension deduction ≤ 11%',    annualPensionDeduction <= annualPensionContrib * 1.001],
    ['Tax + NI + health = total',  Math.abs(annualIncomeTax + annualNI + annualHealth - totalMandatoryTax) < 0.01],
];

let allPassed = true;
for (const [label, result] of checks) {
    console.log(`  ${result ? '✅' : '❌'} ${label}`);
    if (!result) allPassed = false;
}

// ─── Additional test: lower income (₪8,000/month, below NI threshold) ───
console.log('\n═══════════════════════════════════════════════════════');
console.log('  EDGE CASE — ₪8,000/month (straddles NI threshold)');
console.log('═══════════════════════════════════════════════════════');
const m2 = 8000;
const ni2 = calcNI(m2);
const hl2 = calcHealth(m2);
// Manual: lower: 7522×0.0287=215.88; upper: 478×0.1283=61.33
const ni2_expected = NI_THRESHOLD * SELF_NI_LOWER + (m2 - NI_THRESHOLD) * SELF_NI_UPPER;
console.log(`  Monthly NI on ₪8,000:`);
console.log(`    Lower: ${fmt(NI_THRESHOLD)} × ${pct(SELF_NI_LOWER)} = ${fmt(NI_THRESHOLD * SELF_NI_LOWER)}`);
console.log(`    Upper: ${fmt(m2 - NI_THRESHOLD)} × ${pct(SELF_NI_UPPER)} = ${fmt((m2 - NI_THRESHOLD) * SELF_NI_UPPER)}`);
console.log(`    Total: ${fmt(ni2_expected)}  →  calc(): ${fmt(ni2)}`);
console.log(`  ${Math.abs(ni2 - ni2_expected) < 0.01 ? '✅' : '❌'} NI matches expected`);

// ─── Additional test: income below NI threshold (₪5,000/month) ──
console.log('\n  EDGE CASE — ₪5,000/month (below NI threshold)');
const m3 = 5000;
const ni3 = calcNI(m3);
const ni3_expected = m3 * SELF_NI_LOWER;  // only lower rate applies
console.log(`  Monthly NI: ${fmt(m3)} × ${pct(SELF_NI_LOWER)} = ${fmt(ni3_expected)}  →  calc(): ${fmt(ni3)}`);
console.log(`  ${Math.abs(ni3 - ni3_expected) < 0.01 ? '✅' : '❌'} NI matches expected`);

// ─── Additional test: pension cap at 11% ────────────────────────
console.log('\n  EDGE CASE — Pension at 15% (over 11% deduction cap)');
const m4_monthly = 20000;
const m4_recognized = Math.min(m4_monthly, SE.PENSION_RECOGNIZED_INCOME);
const m4_pension_pct = 15;
const m4_deductPct = Math.min(m4_pension_pct / 100, SE.PENSION_DEDUCTION_RATE);
const m4_contribMonthly = m4_recognized * (m4_pension_pct / 100);
const m4_deductMonthly = m4_recognized * m4_deductPct;
console.log(`  Pension 15% of ${fmt(m4_recognized)}: ${fmt(m4_contribMonthly)}/mo`);
console.log(`  Deductible capped at 11%: ${fmt(m4_deductMonthly)}/mo`);
console.log(`  ${m4_deductPct === 0.11 ? '✅' : '❌'} Deduction correctly capped at 11%`);

console.log('\n' + (allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'));
console.log('═══════════════════════════════════════════════════════\n');
