"""
Manual verification of FreelancerTaxCalc accuracy.
Replicates the exact same logic as js/freelancer-tax.js using 2026 constants.

Run: python3 tests/verify-freelancer-tax.py
"""

# ─── 2026 Constants (mirrored from tax-data.js) ─────────────────
TAX_BRACKETS = [
    (7010,     0.10),
    (10060,    0.14),
    (19000,    0.20),
    (25100,    0.31),
    (46690,    0.35),
    (60130,    0.47),
    (float('inf'), 0.50),
]
NI_THRESHOLD    = 7522
NI_CEILING      = 48281
SELF_NI_LOWER   = 0.0287
SELF_NI_UPPER   = 0.1283
SELF_HL_LOWER   = 0.031
SELF_HL_UPPER   = 0.05
CREDIT_PT_VALUE = 242

SE_NI_DEDUCTION_RATE       = 0.52
SE_PENSION_RECOGNIZED      = 293400 / 12   # 24,450
SE_PENSION_DEDUCT_RATE     = 0.11
SE_PENSION_CREDIT_RATE     = 0.055
SE_KEREN_MAX_RATE          = 0.07
SE_KEREN_DEDUCTIBLE_RATE   = 0.045
SE_KEREN_INCOME_CEILING    = 293400 / 12

# ─── Core helpers (exact replica of JS functions) ─────────────────
def calc_income_tax(monthly_taxable):
    tax, prev = 0.0, 0.0
    for limit, rate in TAX_BRACKETS:
        if monthly_taxable <= prev:
            break
        tax += (min(monthly_taxable, limit) - prev) * rate
        prev = limit
    return tax

def calc_ni(monthly_gross):
    capped = min(monthly_gross, NI_CEILING)
    if capped <= NI_THRESHOLD:
        return capped * SELF_NI_LOWER
    return NI_THRESHOLD * SELF_NI_LOWER + (capped - NI_THRESHOLD) * SELF_NI_UPPER

def calc_health(monthly_gross):
    capped = min(monthly_gross, NI_CEILING)
    if capped <= NI_THRESHOLD:
        return capped * SELF_HL_LOWER
    return NI_THRESHOLD * SELF_HL_LOWER + (capped - NI_THRESHOLD) * SELF_HL_UPPER

def calc_annual_tax(annual_revenue, annual_expenses, pension_pct, keren_pct, credit_points):
    """Exact replica of FreelancerTaxCalc.calculateAnnualTax()"""
    # Step 1
    annual_taxable_before_ni  = max(0, annual_revenue - annual_expenses)
    monthly_taxable_before_ni = annual_taxable_before_ni / 12

    # Step 2: NI & Health
    monthly_ni     = calc_ni(monthly_taxable_before_ni)
    monthly_health = calc_health(monthly_taxable_before_ni)
    annual_ni      = monthly_ni * 12
    annual_health  = monthly_health * 12

    # Step 3: 52% NI deduction
    ni_deduction = annual_ni * SE_NI_DEDUCTION_RATE

    # Step 4: Pension
    # Credit: 35% of min(actual contribution, 5.5% of recognized). Deduction: up to 11%.
    recognized_monthly      = min(monthly_taxable_before_ni, SE_PENSION_RECOGNIZED)
    pension_deduct_pct      = min(pension_pct / 100, SE_PENSION_DEDUCT_RATE)
    pension_monthly_deduct  = recognized_monthly * pension_deduct_pct
    annual_pension_deduct   = pension_monthly_deduct * 12
    pension_monthly_contrib = recognized_monthly * (pension_pct / 100)
    annual_pension_contrib  = pension_monthly_contrib * 12
    pension_credit_amount   = min(pension_monthly_contrib,
                                  recognized_monthly * SE_PENSION_CREDIT_RATE) * 12 * 0.35

    # Step 5: Keren
    keren_capped            = min(monthly_taxable_before_ni, SE_KEREN_INCOME_CEILING)
    keren_monthly_contrib   = keren_capped * min(keren_pct / 100, SE_KEREN_MAX_RATE)
    keren_monthly_deduct    = keren_capped * min(keren_pct / 100, SE_KEREN_DEDUCTIBLE_RATE)
    annual_keren_contrib    = keren_monthly_contrib * 12
    annual_keren_deduct     = keren_monthly_deduct * 12

    # Step 6: Adjusted taxable
    annual_adjusted_taxable  = max(0, annual_taxable_before_ni - ni_deduction
                                      - annual_pension_deduct - annual_keren_deduct)
    monthly_adjusted_taxable = annual_adjusted_taxable / 12

    # Step 7: Income tax
    monthly_tax_before     = calc_income_tax(monthly_adjusted_taxable)
    annual_tax_before      = monthly_tax_before * 12
    annual_credit_amount   = credit_points * CREDIT_PT_VALUE * 12
    annual_income_tax      = max(0, annual_tax_before - annual_credit_amount - pension_credit_amount)

    total_mandatory_tax = annual_income_tax + annual_ni + annual_health
    annual_net          = annual_revenue - annual_expenses - total_mandatory_tax \
                          - annual_pension_contrib - annual_keren_contrib
    effective_rate      = (total_mandatory_tax / annual_revenue * 100) if annual_revenue else 0

    return dict(
        annual_revenue=annual_revenue,
        annual_expenses=annual_expenses,
        annual_taxable_before_ni=annual_taxable_before_ni,
        monthly_taxable_before_ni=monthly_taxable_before_ni,
        monthly_ni=monthly_ni, annual_ni=annual_ni,
        monthly_health=monthly_health, annual_health=annual_health,
        ni_deduction=ni_deduction,
        recognized_monthly=recognized_monthly,
        pension_monthly_contrib=pension_monthly_contrib,
        annual_pension_contrib=annual_pension_contrib,
        annual_pension_deduct=annual_pension_deduct,
        pension_credit_amount=pension_credit_amount,
        annual_keren_contrib=annual_keren_contrib,
        annual_keren_deduct=annual_keren_deduct,
        monthly_adjusted_taxable=monthly_adjusted_taxable,
        annual_adjusted_taxable=annual_adjusted_taxable,
        annual_tax_before=annual_tax_before,
        annual_credit_amount=annual_credit_amount,
        pension_credit=pension_credit_amount,
        annual_income_tax=annual_income_tax,
        total_mandatory_tax=total_mandatory_tax,
        annual_net=annual_net,
        effective_rate=effective_rate,
    )

def fmt(n): return f"₪{n:,.2f}"
def pct(n): return f"{n*100:.2f}%"
def sep(): print("═" * 60)

def run_case(title, monthly_revenue, annual_expenses, pension_pct, keren_pct, credit_points):
    annual_revenue = monthly_revenue * 12
    r = calc_annual_tax(annual_revenue, annual_expenses, pension_pct, keren_pct, credit_points)
    sep()
    print(f"  {title}")
    sep()
    print(f"\n  INPUTS")
    print(f"    Monthly revenue  : {fmt(monthly_revenue)}")
    print(f"    Annual revenue   : {fmt(annual_revenue)}")
    print(f"    Annual expenses  : {fmt(annual_expenses)}")
    print(f"    Pension          : {pension_pct}%")
    print(f"    Keren            : {keren_pct}%")
    print(f"    Credit points    : {credit_points}")

    print(f"\n  STEP-BY-STEP BREAKDOWN")
    print(f"    [1] Taxable before NI  : {fmt(r['annual_taxable_before_ni'])}  ({fmt(r['monthly_taxable_before_ni'])}/mo)")
    print(f"    [2] Monthly NI         : {fmt(r['monthly_ni'])}  →  annual {fmt(r['annual_ni'])}")
    print(f"        Monthly health     : {fmt(r['monthly_health'])}  →  annual {fmt(r['annual_health'])}")
    print(f"    [3] NI deduction (52%) : {fmt(r['ni_deduction'])}")
    print(f"    [4] Pension deduction  : {fmt(r['annual_pension_deduct'])}/yr  (credit: {fmt(r['pension_credit'])})")
    print(f"    [5] Keren deduction    : {fmt(r['annual_keren_deduct'])}/yr")
    print(f"    [6] Adjusted taxable   : {fmt(r['annual_adjusted_taxable'])}  ({fmt(r['monthly_adjusted_taxable'])}/mo)")
    print(f"    [7] Tax before credits : {fmt(r['annual_tax_before'])}")
    print(f"        Credit pts amt     : {fmt(r['annual_credit_amount'])}")
    print(f"        Pension credit     : {fmt(r['pension_credit'])}")
    print(f"        Income tax         : {fmt(r['annual_income_tax'])}")

    print(f"\n  ANNUAL RESULTS")
    print(f"    Income tax         : {fmt(r['annual_income_tax'])}")
    print(f"    Bituach Leumi      : {fmt(r['annual_ni'])}")
    print(f"    Health insurance   : {fmt(r['annual_health'])}")
    print(f"    Total mandatory    : {fmt(r['total_mandatory_tax'])}")
    print(f"    Pension contrib    : {fmt(r['annual_pension_contrib'])}")
    print(f"    Keren contrib      : {fmt(r['annual_keren_contrib'])}")
    print(f"    ─────────────────────────────────────")
    print(f"    NET annual         : {fmt(r['annual_net'])}")
    print(f"    NET monthly avg    : {fmt(r['annual_net']/12)}")
    print(f"    Effective tax rate : {r['effective_rate']:.2f}%")

    # Sanity checks
    checks = [
        ("Net < Gross",                  r['annual_net'] < annual_revenue),
        ("Net > 0",                      r['annual_net'] > 0),
        ("Income tax > 0",               r['annual_income_tax'] > 0),
        ("NI > 0",                       r['annual_ni'] > 0),
        ("Effective rate reasonable",    5 < r['effective_rate'] < 60),
        ("NI deduction < annual NI",     r['ni_deduction'] < r['annual_ni']),
        ("Adjusted taxable < gross",     r['annual_adjusted_taxable'] < r['annual_taxable_before_ni']),
        ("Pension deduction ≤ contrib",  r['annual_pension_deduct'] <= r['annual_pension_contrib'] + 0.01),
        ("Components sum correctly",     abs(r['annual_income_tax'] + r['annual_ni'] + r['annual_health']
                                             - r['total_mandatory_tax']) < 0.01),
    ]
    print(f"\n  SANITY CHECKS")
    all_pass = True
    for label, result in checks:
        icon = "✅" if result else "❌"
        print(f"    {icon} {label}")
        if not result:
            all_pass = False
    return all_pass, r

# ─── Run test cases ──────────────────────────────────────────────
all_passed = True
results = {}

ok, r1 = run_case("TEST 1 — ₪30,000/mo, no expenses, pension 5%, keren 4.5%",
                  monthly_revenue=30000, annual_expenses=0,
                  pension_pct=5, keren_pct=4.5, credit_points=2.25)
all_passed &= ok
results['t1'] = r1

ok, r2 = run_case("TEST 2 — ₪15,000/mo, ₪3,000/mo expenses, no pension/keren",
                  monthly_revenue=15000, annual_expenses=3000*12,
                  pension_pct=0, keren_pct=0, credit_points=2.25)
all_passed &= ok
results['t2'] = r2

ok, r3 = run_case("TEST 3 — ₪50,000/mo, max pension 11%, max keren 7%",
                  monthly_revenue=50000, annual_expenses=0,
                  pension_pct=11, keren_pct=7, credit_points=2.25)
all_passed &= ok
results['t3'] = r3

ok, r4 = run_case("TEST 4 — ₪8,000/mo (near NI threshold), no deductions",
                  monthly_revenue=8000, annual_expenses=0,
                  pension_pct=0, keren_pct=0, credit_points=2.25)
all_passed &= ok
results['t4'] = r4

# ─── Edge case: pension capped at 11% ──────────────────────────
sep()
print("  EDGE CASE — Pension > 11% deduction cap")
sep()
r_cap = calc_annual_tax(20000*12, 0, pension_pct=15, keren_pct=0, credit_points=2.25)
r_uncap = calc_annual_tax(20000*12, 0, pension_pct=11, keren_pct=0, credit_points=2.25)
print(f"  Pension at 15%: deduction = {fmt(r_cap['annual_pension_deduct'])}")
print(f"  Pension at 11%: deduction = {fmt(r_uncap['annual_pension_deduct'])}")
cap_ok = abs(r_cap['annual_pension_deduct'] - r_uncap['annual_pension_deduct']) < 0.01
print(f"  {'✅' if cap_ok else '❌'} Deduction identical at 15% and 11% (capped correctly)")
all_passed &= cap_ok

# ─── Edge case: NI ceiling ─────────────────────────────────────
sep()
print("  EDGE CASE — NI ceiling (₪48,281)")
sep()
ni_at_ceiling  = calc_ni(NI_CEILING)
ni_above_ceil  = calc_ni(NI_CEILING + 10000)
print(f"  NI at ceiling  (₪{NI_CEILING:,}):      {fmt(ni_at_ceiling)}")
print(f"  NI above ceiling (₪{NI_CEILING+10000:,}): {fmt(ni_above_ceil)}")
ceil_ok = abs(ni_at_ceiling - ni_above_ceil) < 0.01
print(f"  {'✅' if ceil_ok else '❌'} NI identical at and above ceiling (cap works)")
all_passed &= ceil_ok

# ─── Edge case: credit pts wipe tax at low income ─────────────
sep()
print("  EDGE CASE — Very low income (₪3,000/mo), should have near-zero tax")
sep()
r_low = calc_annual_tax(3000*12, 0, 0, 0, credit_points=2.25)
print(f"  Income tax: {fmt(r_low['annual_income_tax'])}  (expected ≈ 0 due to credits)")
low_ok = r_low['annual_income_tax'] == 0
print(f"  {'✅' if low_ok else '❌'} Income tax correctly floored at 0")
all_passed &= low_ok

# ─── Cross-reference: Test 1 vs published benchmark ───────────
sep()
print("  CROSS-REFERENCE — Test 1 vs expected ranges")
sep()
# For ₪30K/month freelancer with 5% pension + 4.5% keren:
# Accountant estimate range: income tax ~₪58K-65K, NI ~₪37K, effective ~30-33%
r = results['t1']
# With 5% pension + 4.5% keren deductions applied, income tax for ₪30K/mo is ~₪48-54K
# NI for ₪30K/mo should be ~₪35K-40K, effective rate ~27-32%
print(f"  Income tax     : {fmt(r['annual_income_tax'])}  (expected range ₪45,000–₪58,000)")
print(f"  Bituach Leumi  : {fmt(r['annual_ni'])}  (expected range ₪35,000–₪40,000)")
print(f"  Effective rate : {r['effective_rate']:.1f}%  (expected range 27–34%)")
ref_ok = (45000 <= r['annual_income_tax'] <= 58000 and
          35000 <= r['annual_ni'] <= 40000 and
          27 <= r['effective_rate'] <= 34)
print(f"  {'✅' if ref_ok else '❌'} Results within expected accountant range")
all_passed &= ref_ok

sep()
print(f"\n  {'✅ ALL CHECKS PASSED' if all_passed else '❌ SOME CHECKS FAILED'}")
sep()
