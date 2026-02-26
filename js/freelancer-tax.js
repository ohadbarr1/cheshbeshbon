/**
 * freelancer-tax.js — Israeli Freelancer Tax Optimization Calculator (2026)
 * Full annual tax breakdown, mikdamot schedule, pension/Keren optimization,
 * Osek Patur vs. Murshe analysis, and actionable recommendations.
 * Tax data sourced from TaxData (js/tax-data.js)
 */
const FreelancerTaxCalc = {

    // ─────────────────────────────────────────
    // SHORTCUTS TO TAX DATA
    // ─────────────────────────────────────────
    get SE() { return TaxData.SELF_EMPLOYED; },
    get TAX_BRACKETS() { return TaxData.TAX_BRACKETS; },
    get NI_THRESHOLD() { return TaxData.NI_THRESHOLD; },
    get NI_CEILING() { return TaxData.NI_CEILING; },
    get SELF_NI_LOWER() { return TaxData.SELF_NI_LOWER; },
    get SELF_NI_UPPER() { return TaxData.SELF_NI_UPPER; },
    get SELF_HEALTH_LOWER() { return TaxData.SELF_HEALTH_LOWER; },
    get SELF_HEALTH_UPPER() { return TaxData.SELF_HEALTH_UPPER; },
    get CREDIT_POINT_VALUE() { return TaxData.CREDIT_POINT_VALUE; },

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        // Revenue period toggle (monthly / annual)
        const periodBtns = document.querySelectorAll('.ft-period-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.calculate();
            });
        });

        // Osek status toggle
        const osekBtns = document.querySelectorAll('.ft-osek-btn');
        osekBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                osekBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.calculate();
            });
        });
    },

    // ─────────────────────────────────────────
    // CORE TAX CALCULATIONS
    // ─────────────────────────────────────────

    /** Monthly income tax from monthly taxable income */
    _calcMonthlyIncomeTax(monthlyTaxable) {
        let tax = 0, prev = 0;
        for (const bracket of this.TAX_BRACKETS) {
            if (monthlyTaxable <= prev) break;
            const taxable = Math.min(monthlyTaxable, bracket.limit) - prev;
            tax += taxable * bracket.rate;
            prev = bracket.limit;
        }
        return tax;
    },

    /** Monthly NI (bituach leumi) for self-employed */
    _calcMonthlyNI(monthlyGross) {
        const capped = Math.min(monthlyGross, this.NI_CEILING);
        if (capped <= this.NI_THRESHOLD) return capped * this.SELF_NI_LOWER;
        return this.NI_THRESHOLD * this.SELF_NI_LOWER + (capped - this.NI_THRESHOLD) * this.SELF_NI_UPPER;
    },

    /** Monthly health insurance for self-employed */
    _calcMonthlyHealth(monthlyGross) {
        const capped = Math.min(monthlyGross, this.NI_CEILING);
        if (capped <= this.NI_THRESHOLD) return capped * this.SELF_HEALTH_LOWER;
        return this.NI_THRESHOLD * this.SELF_HEALTH_LOWER + (capped - this.NI_THRESHOLD) * this.SELF_HEALTH_UPPER;
    },

    /** Marginal income tax rate for a given monthly taxable income */
    _marginalRate(monthlyTaxable) {
        let rate = 0, prev = 0;
        for (const bracket of this.TAX_BRACKETS) {
            if (monthlyTaxable > prev) rate = bracket.rate;
            prev = bracket.limit;
        }
        return rate;
    },

    /**
     * Full annual tax computation.
     * Returns all components for rendering.
     */
    calculateAnnualTax(inputs) {
        const {
            annualRevenue, annualExpenses,
            pensionPct, kerenPct,
            creditPoints, isOsekMurshe
        } = inputs;

        // ── Step 1: Revenue → Taxable income after expenses ──
        const annualTaxableBeforeNI = Math.max(0, annualRevenue - annualExpenses);
        const monthlyTaxableBeforeNI = annualTaxableBeforeNI / 12;

        // ── Step 2: NI & Health (on gross after expenses) ──
        const monthlyNI = this._calcMonthlyNI(monthlyTaxableBeforeNI);
        const monthlyHealth = this._calcMonthlyHealth(monthlyTaxableBeforeNI);
        const annualNI = monthlyNI * 12;
        const annualHealth = monthlyHealth * 12;

        // ── Step 3: 52% of NI is deductible from taxable income ──
        const niDeduction = annualNI * this.SE.NI_DEDUCTION_RATE;

        // ── Step 4: Pension deduction ──
        const recognizedMonthly = Math.min(monthlyTaxableBeforeNI, this.SE.PENSION_RECOGNIZED_INCOME);
        const pensionMonthlyDeduction = recognizedMonthly * Math.min(pensionPct / 100, this.SE.PENSION_DEDUCTION_RATE);
        const annualPensionDeduction = pensionMonthlyDeduction * 12;

        // Pension credit: 35% of the lesser of (actual contribution) or (5.5% of recognized income)
        // When contribution < 5.5%, credit is capped to actual contribution; above 5.5% it caps at 5.5%
        const pensionMonthlyContribution = recognizedMonthly * (pensionPct / 100);
        const annualPensionContribution = pensionMonthlyContribution * 12;
        const pensionCreditAmount = Math.min(
            pensionMonthlyContribution,
            recognizedMonthly * this.SE.PENSION_CREDIT_RATE
        ) * 12 * 0.35;

        // ── Step 5: Keren Hishtalmut ──
        const kerenMonthlyIncomeCapped = Math.min(monthlyTaxableBeforeNI, this.SE.KEREN_INCOME_CEILING);
        const kerenMonthlyContribution = kerenMonthlyIncomeCapped * Math.min(kerenPct / 100, this.SE.KEREN_MAX_DEPOSIT_RATE);
        const kerenMonthlyDeductible = kerenMonthlyIncomeCapped * Math.min(kerenPct / 100, this.SE.KEREN_DEDUCTIBLE_RATE);
        const annualKerenContribution = kerenMonthlyContribution * 12;
        const annualKerenDeduction = kerenMonthlyDeductible * 12;

        // ── Step 6: Adjusted annual taxable income ──
        const annualAdjustedTaxable = Math.max(0,
            annualTaxableBeforeNI - niDeduction - annualPensionDeduction - annualKerenDeduction
        );
        const monthlyAdjustedTaxable = annualAdjustedTaxable / 12;

        // ── Step 7: Income tax ──
        const monthlyIncomeTaxBefore = this._calcMonthlyIncomeTax(monthlyAdjustedTaxable);
        const annualIncomeTaxBefore = monthlyIncomeTaxBefore * 12;
        const annualCreditAmount = creditPoints * this.CREDIT_POINT_VALUE * 12;
        const annualIncomeTax = Math.max(0, annualIncomeTaxBefore - annualCreditAmount - pensionCreditAmount);

        // ── Step 8: VAT (if osek murshe) ──
        const annualVAT = isOsekMurshe ? annualRevenue * this.SE.VAT_RATE : 0;

        // ── Step 9: Totals ──
        const totalMandatoryTax = annualIncomeTax + annualNI + annualHealth;
        const annualNet = annualRevenue - annualExpenses - totalMandatoryTax - annualPensionContribution - annualKerenContribution;
        const effectiveRate = annualRevenue > 0 ? (totalMandatoryTax / annualRevenue) * 100 : 0;
        const marginalRate = this._marginalRate(monthlyAdjustedTaxable);

        return {
            annualRevenue, annualExpenses,
            annualTaxableBeforeNI,
            niDeduction, annualPensionDeduction, annualKerenDeduction,
            annualAdjustedTaxable,
            annualIncomeTaxBefore, annualCreditAmount, pensionCreditAmount, annualIncomeTax,
            annualNI, annualHealth,
            annualPensionContribution, annualKerenContribution,
            annualVAT,
            totalMandatoryTax, annualNet,
            effectiveRate, marginalRate,
            isOsekMurshe
        };
    },

    /**
     * Optimize pension contribution — returns mandatory, optimal, tax savings.
     */
    optimizePension(monthlyIncome) {
        const capped = Math.min(monthlyIncome, this.SE.PENSION_RECOGNIZED_INCOME);

        // Mandatory minimum
        const mandatoryMonthly = Math.min(monthlyIncome, this.SE.PENSION_MANDATORY_INCOME_CEILING)
            * this.SE.PENSION_MANDATORY_RATE;

        // Optimal (11% of capped income = max deductible)
        const optimalMonthly = capped * this.SE.PENSION_DEDUCTION_RATE;

        // Tax saving from going from 0 to optimal
        const niDeductionPerMonth = this._calcMonthlyNI(monthlyIncome) * this.SE.NI_DEDUCTION_RATE;
        const baseTaxable = Math.max(0, monthlyIncome - niDeductionPerMonth);
        const taxWithout = this._calcMonthlyIncomeTax(baseTaxable);
        const taxWithOptimal = this._calcMonthlyIncomeTax(Math.max(0, baseTaxable - optimalMonthly));
        const annualTaxSaving = (taxWithout - taxWithOptimal) * 12;

        // Credit saving (5.5% at 35%)
        const annualCreditSaving = capped * 0.055 * 0.35 * 12;

        return {
            mandatoryMonthly,
            mandatoryAnnual: mandatoryMonthly * 12,
            optimalMonthly,
            optimalAnnual: optimalMonthly * 12,
            annualTaxSaving,
            annualCreditSaving,
            totalAnnualSaving: annualTaxSaving + annualCreditSaving
        };
    },

    /**
     * Optimize Keren Hishtalmut — returns max deposit, tax savings.
     */
    optimizeKeren(monthlyIncome) {
        const capped = Math.min(monthlyIncome, this.SE.KEREN_INCOME_CEILING);
        const maxMonthlyDeposit = capped * this.SE.KEREN_MAX_DEPOSIT_RATE;
        const deductibleMonthly = capped * this.SE.KEREN_DEDUCTIBLE_RATE;

        // Estimate tax saving on deductible portion
        const niDeductionPerMonth = this._calcMonthlyNI(monthlyIncome) * this.SE.NI_DEDUCTION_RATE;
        const baseTaxable = Math.max(0, monthlyIncome - niDeductionPerMonth);
        const taxWithout = this._calcMonthlyIncomeTax(baseTaxable);
        const taxWithKeren = this._calcMonthlyIncomeTax(Math.max(0, baseTaxable - deductibleMonthly));
        const annualTaxSaving = (taxWithout - taxWithKeren) * 12;

        return {
            maxMonthlyDeposit,
            maxAnnualDeposit: maxMonthlyDeposit * 12,
            deductibleMonthly,
            deductibleAnnual: deductibleMonthly * 12,
            annualTaxSaving,
            effectiveReturn: deductibleMonthly > 0
                ? (annualTaxSaving / (maxMonthlyDeposit * 12) * 100)
                : 0
        };
    },

    /**
     * Compare Osek Patur vs. Murshe at current revenue.
     */
    comparePaturVsMurshe(annualRevenue, annualExpenses) {
        const threshold = this.SE.OSEK_PATUR_THRESHOLD;
        const vatRate = this.SE.VAT_RATE;

        // As Patur: no VAT collection, no VAT reclaim on expenses
        const paturNet = annualRevenue - annualExpenses;

        // As Murshe: collect VAT on revenue, reclaim VAT on expenses
        // Revenue is VAT-exclusive (prices include VAT for Murshe)
        // Effective: you keep VAT charged minus VAT on expenses
        const vatOnRevenue = annualRevenue * vatRate;
        const vatOnExpenses = annualExpenses * vatRate; // approximation
        const netVATBenefit = vatOnExpenses - vatOnRevenue; // usually negative (you pay net VAT)

        // For pure comparison: murshe pays VAT net but can reclaim on expenses
        const mursheVATCost = Math.max(0, vatOnRevenue - vatOnExpenses);
        const murshePurchasingPowerGain = vatOnExpenses; // reclaim VAT on business expenses

        const isAboveThreshold = annualRevenue > threshold;
        const breakEvenRevenue = threshold;

        // At what revenue does Murshe break even on VAT reclaim vs. admin cost?
        // Rough estimate: worth switching when VAT reclaim on expenses > ~₪3,000/year admin cost
        const vatReclaimOnExpenses = annualExpenses * vatRate;

        return {
            isAboveThreshold,
            breakEvenRevenue,
            threshold,
            currentRevenue: annualRevenue,
            vatOnRevenue,
            vatOnExpenses,
            netVATBenefit,
            mursheVATCost,
            vatReclaimOnExpenses,
            mustBeMurshe: isAboveThreshold,
            recommendation: isAboveThreshold
                ? 'חייב להירשם כעוסק מורשה (הכנסה מעל סף פטור)'
                : (vatReclaimOnExpenses > 3000
                    ? 'שקול מעבר לעוסק מורשה — החזר מע"מ על הוצאות משתלם'
                    : 'עוסק פטור עדיף — חסכת בירוקרטיה ואין הכנסה מעל הסף')
        };
    },

    /**
     * Calculate bimonthly mikdamot schedule.
     */
    calculateMikdamot(annualTax) {
        const periods = this.SE.MIKDAMOT_PERIODS;
        const perPayment = annualTax / periods;
        const months = ['ינואר-פברואר', 'מרץ-אפריל', 'מאי-יוני',
                        'יולי-אוגוסט', 'ספטמבר-אוקטובר', 'נובמבר-דצמבר'];
        const dueDates = ['15 פברואר', '15 אפריל', '15 יוני',
                          '15 אוגוסט', '15 אוקטובר', '15 דצמבר'];
        return {
            perPayment,
            annualTotal: annualTax,
            schedule: months.map((m, i) => ({
                period: m,
                dueDate: dueDates[i],
                amount: perPayment
            }))
        };
    },

    // ─────────────────────────────────────────
    // COLLECT INPUTS
    // ─────────────────────────────────────────
    _getInputs() {
        const periodBtn = document.querySelector('.ft-period-btn.active');
        const isMonthly = periodBtn && periodBtn.dataset.period === 'monthly';

        const rawRevenue = parseFloat(document.getElementById('ft-revenue')?.value) || 0;
        const annualRevenue = isMonthly ? rawRevenue * 12 : rawRevenue;

        // Expenses
        const homeOffice = parseFloat(document.getElementById('ft-exp-home')?.value) || 0;
        const car = parseFloat(document.getElementById('ft-exp-car')?.value) || 0;
        const carBusinessPct = parseFloat(document.getElementById('ft-exp-car-pct')?.value) || 45;
        const phone = parseFloat(document.getElementById('ft-exp-phone')?.value) || 0;
        const internet = parseFloat(document.getElementById('ft-exp-internet')?.value) || 0;
        const equipment = parseFloat(document.getElementById('ft-exp-equipment')?.value) || 0;
        const professional = parseFloat(document.getElementById('ft-exp-professional')?.value) || 0;
        const other = parseFloat(document.getElementById('ft-exp-other')?.value) || 0;

        // Annual expenses (inputs assumed monthly, convert to annual)
        const annualExpenses = (
            homeOffice * this.SE.EXPENSE_RATES.HOME_OFFICE +
            car * (carBusinessPct / 100) +
            phone * this.SE.EXPENSE_RATES.PHONE +
            internet * this.SE.EXPENSE_RATES.INTERNET
        ) * 12 + equipment + professional + other;

        const pensionPct = parseFloat(document.getElementById('ft-pension-pct')?.value) || 0;
        const kerenPct = parseFloat(document.getElementById('ft-keren-pct')?.value) || 0;
        const creditPoints = parseFloat(document.getElementById('ft-credit-points')?.value) || 2.25;

        const osekBtn = document.querySelector('.ft-osek-btn.active');
        const isOsekMurshe = osekBtn && osekBtn.dataset.osek === 'murshe';

        return {
            annualRevenue,
            annualExpenses,
            pensionPct,
            kerenPct,
            creditPoints,
            isOsekMurshe,
            rawRevenue,
            isMonthly,
            homeOffice, car, carBusinessPct, phone, internet, equipment, professional, other
        };
    },

    // ─────────────────────────────────────────
    // MAIN CALCULATE
    // ─────────────────────────────────────────
    calculate() {
        Validation.clearErrors('freelancer-tax-section');
        const inputs = this._getInputs();
        if (inputs.annualRevenue <= 0) return;

        const taxResult = this.calculateAnnualTax(inputs);
        const monthlyIncome = inputs.annualRevenue / 12;

        const pensionOpt = this.optimizePension(monthlyIncome);
        const kerenOpt = this.optimizeKeren(monthlyIncome);
        const paturVsMurshe = this.comparePaturVsMurshe(inputs.annualRevenue, inputs.annualExpenses);
        const mikdamot = this.calculateMikdamot(taxResult.annualIncomeTax);

        this.renderResults(taxResult, pensionOpt, kerenOpt, paturVsMurshe, mikdamot, inputs);
    },

    // ─────────────────────────────────────────
    // RENDER RESULTS
    // ─────────────────────────────────────────
    renderResults(tax, pensionOpt, kerenOpt, paturVsMurshe, mikdamot, inputs) {
        const fmt = ChartManager.formatCurrency.bind(ChartManager);
        const container = document.getElementById('freelancer-tax-results');
        if (!container) return;

        const isPremium = typeof Premium !== 'undefined' && Premium.isActive;

        let html = '<div class="results-container">';

        // ── CARD 1: Annual Tax Summary ──
        html += `
        <div class="result-row">
            <div class="result-card themed-green">
                <h3>נטו שנתי אחרי מיסים</h3>
                <div class="result-big-number positive" data-value="${tax.annualNet}">${fmt(0)}</div>
                <div class="result-subtitle">מתוך הכנסה ${fmt(tax.annualRevenue)} | שיעור מס אפקטיבי ${tax.effectiveRate.toFixed(1)}%</div>
            </div>
            <div class="result-card themed-purple">
                <h3>סה"כ מיסים שנתי</h3>
                <div class="result-big-number" data-value="${tax.totalMandatoryTax}">${fmt(0)}</div>
                <div class="result-subtitle">מס הכנסה + ביטוח לאומי + בריאות</div>
            </div>
        </div>`;

        // Detailed breakdown table
        html += `
        <div class="result-card">
            <h3>פירוט מס שנתי</h3>
            <table class="payslip-table">
                <tr><td>הכנסה ברוטו שנתית</td><td>${fmt(tax.annualRevenue)}</td></tr>
                <tr class="deduction"><td>הוצאות מוכרות</td><td>-${fmt(tax.annualExpenses)}</td></tr>
                <tr><td>הכנסה חייבת לפני ניכויים</td><td>${fmt(tax.annualTaxableBeforeNI)}</td></tr>
                <tr class="benefit"><td>ניכוי 52% מביטוח לאומי</td><td>-${fmt(tax.niDeduction)}</td></tr>
                ${tax.annualPensionDeduction > 0 ? `<tr class="benefit"><td>ניכוי פנסיה (עד 11%)</td><td>-${fmt(tax.annualPensionDeduction)}</td></tr>` : ''}
                ${tax.annualKerenDeduction > 0 ? `<tr class="benefit"><td>ניכוי קרן השתלמות (עד 4.5%)</td><td>-${fmt(tax.annualKerenDeduction)}</td></tr>` : ''}
                <tr><td>הכנסה חייבת במס</td><td>${fmt(tax.annualAdjustedTaxable)}</td></tr>
                <tr><td>מדרגת מס שולית</td><td>${(tax.marginalRate * 100).toFixed(0)}%</td></tr>
                <tr class="deduction"><td>מס הכנסה (לפני זיכוי: ${fmt(tax.annualIncomeTaxBefore)})</td><td>-${fmt(tax.annualIncomeTax)}</td></tr>
                <tr class="deduction"><td>ביטוח לאומי</td><td>-${fmt(tax.annualNI)}</td></tr>
                <tr class="deduction"><td>ביטוח בריאות</td><td>-${fmt(tax.annualHealth)}</td></tr>
                ${tax.annualPensionContribution > 0 ? `<tr class="deduction"><td>הפרשה לפנסיה (${inputs.pensionPct}%)</td><td>-${fmt(tax.annualPensionContribution)}</td></tr>` : ''}
                ${tax.annualKerenContribution > 0 ? `<tr class="deduction"><td>הפרשה לקרן השתלמות (${inputs.kerenPct}%)</td><td>-${fmt(tax.annualKerenContribution)}</td></tr>` : ''}
                <tr class="total-row"><td><strong>נטו שנתי</strong></td><td><strong>${fmt(tax.annualNet)}</strong></td></tr>
                <tr><td>נטו חודשי ממוצע</td><td>${fmt(tax.annualNet / 12)}</td></tr>
            </table>
        </div>`;

        // Doughnut chart
        html += '<div class="result-card"><h3>לאן הולכת ההכנסה?</h3><div class="chart-container"><canvas id="ft-breakdown-chart"></canvas></div></div>';

        // ── CARD 2: Optimization Recommendations (premium gated) ──
        const totalSavings = pensionOpt.totalAnnualSaving + kerenOpt.annualTaxSaving;

        if (isPremium) {
            html += `
            <div class="result-card ft-optimization-card">
                <div class="ft-optimization-header">
                    <h3>המלצות אופטימיזציה</h3>
                    <div class="ft-savings-headline">חסוך עד <span class="ft-savings-amount">${fmt(totalSavings)}</span> בשנה</div>
                </div>
                <div class="ft-recommendations">`;

            // Pension recommendation
            const currentPensionMonthly = Math.min(inputs.annualRevenue / 12, this.SE.PENSION_RECOGNIZED_INCOME)
                * (inputs.pensionPct / 100);
            if (inputs.pensionPct < this.SE.PENSION_DEDUCTION_RATE * 100) {
                const gap = pensionOpt.optimalMonthly - currentPensionMonthly;
                html += `
                <div class="ft-recommendation-item">
                    <div class="ft-rec-icon">📈</div>
                    <div class="ft-rec-content">
                        <div class="ft-rec-title">הגדל פנסיה ל-${(this.SE.PENSION_DEDUCTION_RATE * 100).toFixed(0)}%</div>
                        <div class="ft-rec-detail">הפרשה חודשית נוספת: ${fmt(gap)} | חיסכון מס שנתי: ${fmt(pensionOpt.totalAnnualSaving)}</div>
                        <div class="ft-rec-explain">פנסיה עד 11% מההכנסה המוכרת מוכרת כניכוי + זיכוי מס 35% על 5.5%</div>
                    </div>
                </div>`;
            }

            // Keren Hishtalmut recommendation
            if (inputs.kerenPct < this.SE.KEREN_MAX_DEPOSIT_RATE * 100) {
                html += `
                <div class="ft-recommendation-item">
                    <div class="ft-rec-icon">💎</div>
                    <div class="ft-rec-content">
                        <div class="ft-rec-title">פתח/הגדל קרן השתלמות (${(this.SE.KEREN_MAX_DEPOSIT_RATE * 100).toFixed(0)}%)</div>
                        <div class="ft-rec-detail">הפקדה מקסימלית: ${fmt(kerenOpt.maxMonthlyDeposit)}/חודש | חיסכון מס: ${fmt(kerenOpt.annualTaxSaving)}/שנה</div>
                        <div class="ft-rec-explain">4.5% מוכר כניכוי | צובר ריבית/תשואה פטורה ממס לאחר 3 שנים</div>
                    </div>
                </div>`;
            }

            // Expenses recommendation
            if (tax.annualExpenses < tax.annualRevenue * 0.1) {
                html += `
                <div class="ft-recommendation-item">
                    <div class="ft-rec-icon">🧾</div>
                    <div class="ft-rec-content">
                        <div class="ft-rec-title">דווח הוצאות עסקיות (נמוך מ-10% מהכנסה)</div>
                        <div class="ft-rec-detail">כל ₪1,000 בהוצאות מוכרות חוסך ${fmt(tax.marginalRate * 1000)} במס</div>
                        <div class="ft-rec-explain">בית (25% שכ"ד), רכב (45%), טלפון (50%), ציוד (100%)</div>
                    </div>
                </div>`;
            }

            // Patur → Murshe recommendation
            if (!inputs.isOsekMurshe && paturVsMurshe.vatReclaimOnExpenses > 3000) {
                html += `
                <div class="ft-recommendation-item">
                    <div class="ft-rec-icon">🔄</div>
                    <div class="ft-rec-content">
                        <div class="ft-rec-title">שקול מעבר לעוסק מורשה</div>
                        <div class="ft-rec-detail">החזר מע"מ על הוצאות: ${fmt(paturVsMurshe.vatReclaimOnExpenses)}/שנה</div>
                        <div class="ft-rec-explain">שווה לבדוק אם לקוחות שלך עוסקים מורשים שיכולים לנכות מע"מ</div>
                    </div>
                </div>`;
            }

            html += `</div></div>`;
        } else {
            // Blurred premium card
            html += `
            <div class="premium-feature-card ft-premium-blur" onclick="Premium.showModal()">
                <span class="lock-badge">🔒 פרימיום</span>
                <h4>המלצות אופטימיזציה — חסוך עד ${fmt(totalSavings)}/שנה</h4>
                <p>הצג המלצות מדורגות: פנסיה אופטימלית, קרן השתלמות, הוצאות מוכרות ועוסק מורשה</p>
                <button class="btn-upgrade" onclick="event.stopPropagation(); Premium.showModal()">שדרג לפרימיום ←</button>
            </div>`;
        }

        // ── CARD 3: Mikdamot Schedule ──
        html += `
        <div class="result-card">
            <h3>לוח מקדמות מס (${this.SE.MIKDAMOT_PERIODS} תשלומים דו-חודשיים)</h3>
            <div class="ft-mikdamot-summary">
                <span>סה"כ מס הכנסה שנתי: <strong>${fmt(mikdamot.annualTotal)}</strong></span>
                <span>כל מקדמה: <strong>${fmt(mikdamot.perPayment)}</strong></span>
            </div>
            <table class="payslip-table ft-mikdamot-table">
                <thead><tr><th>תקופה</th><th>תאריך פירעון</th><th>סכום</th></tr></thead>
                <tbody>
                ${mikdamot.schedule.map(p => `
                    <tr>
                        <td>${p.period}</td>
                        <td>${p.dueDate}</td>
                        <td>${fmt(p.amount)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <p class="ft-tip">💡 ניתן לבקש עדכון שיעור מקדמה בפקיד שומה אם ההכנסה שונה מהצפי</p>
        </div>`;

        // ── CARD 4: Patur vs. Murshe (premium gated) ──
        if (isPremium) {
            html += `
            <div class="result-card ft-patur-murshe-card">
                <h3>עוסק פטור מול עוסק מורשה — ניתוח</h3>
                <div class="ft-patur-grid">
                    <div class="ft-patur-col">
                        <h4>עוסק פטור</h4>
                        <ul>
                            <li>אין גביית מע"מ מלקוחות</li>
                            <li>אין החזר מע"מ על הוצאות</li>
                            <li>פחות בירוקרטיה</li>
                            <li>מגבלה: עד ${fmt(paturVsMurshe.threshold)}/שנה</li>
                        </ul>
                    </div>
                    <div class="ft-patur-col ${paturVsMurshe.vatReclaimOnExpenses > 3000 ? 'ft-recommended' : ''}">
                        <h4>עוסק מורשה ${paturVsMurshe.vatReclaimOnExpenses > 3000 ? '⭐ מומלץ' : ''}</h4>
                        <ul>
                            <li>גובה מע"מ 18% מלקוחות</li>
                            <li>מחזיר מע"מ על הוצאות: ${fmt(paturVsMurshe.vatReclaimOnExpenses)}/שנה</li>
                            <li>מע"מ נטו לתשלום: ${fmt(paturVsMurshe.mursheVATCost)}/שנה</li>
                            <li>${paturVsMurshe.mustBeMurshe ? '⚠️ חובה בהכנסה זו' : 'אופציונלי'}</li>
                        </ul>
                    </div>
                </div>
                <div class="ft-patur-verdict">${paturVsMurshe.recommendation}</div>
                <div class="chart-container" style="height:200px"><canvas id="ft-patur-chart"></canvas></div>
            </div>`;
        } else {
            html += `
            <div class="premium-feature-card" onclick="Premium.showModal()">
                <span class="lock-badge">🔒 פרימיום</span>
                <h4>ניתוח עוסק פטור מול מורשה</h4>
                <p>גלה מתי כדאי לעבור ועד כמה תחסוך במע"מ</p>
            </div>`;
        }

        // ── CARD 5: Pension & Keren Optimization (premium gated) ──
        if (isPremium) {
            html += `
            <div class="result-card ft-pension-opt-card">
                <h3>אופטימיזציית פנסיה וקרן השתלמות</h3>
                <div class="ft-savings-grid">
                    <div class="ft-savings-item">
                        <h4>פנסיה</h4>
                        <table class="payslip-table">
                            <tr><td>מינימום חובה</td><td>${fmt(pensionOpt.mandatoryMonthly)}/חודש</td></tr>
                            <tr><td>אופטימלי (11%)</td><td>${fmt(pensionOpt.optimalMonthly)}/חודש</td></tr>
                            <tr><td>חיסכון מס שנתי</td><td class="benefit-text">${fmt(pensionOpt.totalAnnualSaving)}</td></tr>
                        </table>
                    </div>
                    <div class="ft-savings-item">
                        <h4>קרן השתלמות</h4>
                        <table class="payslip-table">
                            <tr><td>הפקדה מוכרת (4.5%)</td><td>${fmt(kerenOpt.deductibleMonthly)}/חודש</td></tr>
                            <tr><td>מקסימום אפשרי (7%)</td><td>${fmt(kerenOpt.maxMonthlyDeposit)}/חודש</td></tr>
                            <tr><td>חיסכון מס שנתי</td><td class="benefit-text">${fmt(kerenOpt.annualTaxSaving)}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="chart-container" style="height:220px"><canvas id="ft-savings-chart"></canvas></div>
            </div>`;
        } else {
            html += `
            <div class="premium-feature-card" onclick="Premium.showModal()">
                <span class="lock-badge">🔒 פרימיום</span>
                <h4>אופטימיזציית פנסיה וחיסכון</h4>
                <p>ראה בדיוק כמה להפריש לפנסיה ולקרן השתלמות לחיסכון מקסימלי</p>
            </div>`;
        }

        // Insights
        const insights = Insights.generate('freelancer-tax', {
            annualRevenue: tax.annualRevenue,
            annualNet: tax.annualNet,
            effectiveRate: tax.effectiveRate,
            marginalRate: tax.marginalRate,
            pensionPct: inputs.pensionPct,
            kerenPct: inputs.kerenPct,
            pensionOpt, kerenOpt,
            paturVsMurshe
        });
        html += Insights.renderHTML(insights);

        // Share row
        html += UIHelpers.renderShareRow('freelancer-tax', 'ft-share-btn', 'מס עצמאים');
        html += '</div>';

        container.innerHTML = html;

        // ── Charts ──
        const chartItems = [
            { label: 'נטו', value: Math.max(0, tax.annualNet), color: ChartManager.colors.green },
            { label: 'מס הכנסה', value: tax.annualIncomeTax, color: ChartManager.colors.red },
            { label: 'ביטוח לאומי', value: tax.annualNI, color: ChartManager.colors.orange },
            { label: 'ביטוח בריאות', value: tax.annualHealth, color: ChartManager.colors.purple },
            { label: 'פנסיה', value: tax.annualPensionContribution, color: ChartManager.colors.blue },
            { label: 'קרן השתלמות', value: tax.annualKerenContribution, color: ChartManager.colors.cyan },
            { label: 'הוצאות', value: tax.annualExpenses, color: ChartManager.colors.gray || '#6b7280' }
        ].filter(x => x.value > 0);

        ChartManager.createDoughnut('ft-breakdown-chart',
            chartItems.map(x => x.label),
            chartItems.map(x => x.value),
            chartItems.map(x => x.color)
        );

        // Patur vs. Murshe bar chart (premium)
        if (isPremium) {
            ChartManager._ensureLoaded().then(() => {
                const ctx = document.getElementById('ft-patur-chart');
                if (ctx) {
                    if (ChartManager.instances['ft-patur-chart']) {
                        ChartManager.instances['ft-patur-chart'].destroy();
                    }
                    ChartManager.instances['ft-patur-chart'] = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['הכנסה', 'מע"מ על הוצאות (החזר)', 'מע"מ לתשלום'],
                            datasets: [
                                {
                                    label: 'עוסק פטור',
                                    data: [tax.annualRevenue, 0, 0],
                                    backgroundColor: 'rgba(96, 165, 250, 0.7)'
                                },
                                {
                                    label: 'עוסק מורשה',
                                    data: [tax.annualRevenue, paturVsMurshe.vatReclaimOnExpenses, paturVsMurshe.mursheVATCost],
                                    backgroundColor: 'rgba(52, 211, 153, 0.7)'
                                }
                            ]
                        },
                        options: {
                            ...ChartManager.defaultOptions(),
                            plugins: { legend: { labels: { color: '#e2e8f0' } } },
                            scales: {
                                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                y: { ticks: { color: '#94a3b8', callback: v => '₪' + (v/1000).toFixed(0) + 'K' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                            }
                        }
                    });
                }

                // Savings optimization bar chart
                const savingsCtx = document.getElementById('ft-savings-chart');
                if (savingsCtx) {
                    if (ChartManager.instances['ft-savings-chart']) {
                        ChartManager.instances['ft-savings-chart'].destroy();
                    }
                    ChartManager.instances['ft-savings-chart'] = new Chart(savingsCtx, {
                        type: 'bar',
                        data: {
                            labels: ['פנסיה נוכחית', 'פנסיה אופטימלית', 'קרן השתלמות (מוכרת)'],
                            datasets: [{
                                label: 'הפקדה חודשית',
                                data: [
                                    Math.min(inputs.annualRevenue / 12, this.SE.PENSION_RECOGNIZED_INCOME) * (inputs.pensionPct / 100),
                                    pensionOpt.optimalMonthly,
                                    kerenOpt.deductibleMonthly
                                ],
                                backgroundColor: [
                                    'rgba(96, 165, 250, 0.7)',
                                    'rgba(52, 211, 153, 0.7)',
                                    'rgba(251, 191, 36, 0.7)'
                                ]
                            }]
                        },
                        options: {
                            ...ChartManager.defaultOptions(),
                            plugins: { legend: { display: false } },
                            scales: {
                                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                y: { ticks: { color: '#94a3b8', callback: v => '₪' + v.toLocaleString('he-IL') }, grid: { color: 'rgba(255,255,255,0.05)' } }
                            }
                        }
                    });
                }
            });
        }

        // Animate numbers
        ChartManager.animateNumbers(container);

        // Share button
        UIHelpers.bindShareButton('ft-share-btn', 'מס עצמאים',
            `📊 חשבשבון — מס עצמאים\n` +
            `הכנסה שנתית: ${fmt(tax.annualRevenue)}\n` +
            `נטו שנתי: ${fmt(tax.annualNet)}\n` +
            `שיעור מס אפקטיבי: ${tax.effectiveRate.toFixed(1)}%\n` +
            `חשב גם: cheshbeshbon.co.il`
        );
    }
};
