/**
 * salary.js — V2 Israeli Salary Calculator (2026)
 * Employee & Self-Employed modes, company car, insights, share, animated countup
 * Tax data sourced from TaxData (js/tax-data.js)
 */
const SalaryCalc = {
    employmentMode: 'employee',

    // Reference TaxData for all year-specific constants
    get TAX_BRACKETS() { return TaxData.TAX_BRACKETS; },
    get EMP_NI_LOWER() { return TaxData.EMP_NI_LOWER; },
    get EMP_NI_UPPER() { return TaxData.EMP_NI_UPPER; },
    get EMP_HEALTH_LOWER() { return TaxData.EMP_HEALTH_LOWER; },
    get EMP_HEALTH_UPPER() { return TaxData.EMP_HEALTH_UPPER; },
    get SELF_NI_LOWER() { return TaxData.SELF_NI_LOWER; },
    get SELF_NI_UPPER() { return TaxData.SELF_NI_UPPER; },
    get SELF_HEALTH_LOWER() { return TaxData.SELF_HEALTH_LOWER; },
    get SELF_HEALTH_UPPER() { return TaxData.SELF_HEALTH_UPPER; },
    get NI_THRESHOLD() { return TaxData.NI_THRESHOLD; },
    get NI_CEILING() { return TaxData.NI_CEILING; },
    get CREDIT_POINT_VALUE() { return TaxData.CREDIT_POINT_VALUE; },
    get PENSION_CEILING() { return TaxData.PENSION_CEILING; },

    init() {
        // Employment toggle
        const toggleGroup = document.getElementById('employment-toggle');
        if (toggleGroup) {
            toggleGroup.querySelectorAll('.toggle-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    toggleGroup.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.employmentMode = btn.dataset.mode;
                    this.updateUIForMode();
                    this.calculate();
                });
            });
        }
    },

    updateUIForMode() {
        const isEmployee = this.employmentMode === 'employee';
        const empPension = document.getElementById('salary-pension-employer');
        const empKeren = document.getElementById('salary-keren-employer');

        // Show/hide employer inputs
        if (empPension) {
            const group = empPension.closest('.input-group');
            if (group) group.style.display = isEmployee ? '' : 'none';
        }
        if (empKeren) {
            const group = empKeren.closest('.input-group');
            if (group) group.style.display = isEmployee ? '' : 'none';
        }
    },

    calculateIncomeTax(taxableIncome) {
        let tax = 0, prev = 0;
        for (const bracket of this.TAX_BRACKETS) {
            if (taxableIncome <= prev) break;
            const taxable = Math.min(taxableIncome, bracket.limit) - prev;
            tax += taxable * bracket.rate;
            prev = bracket.limit;
        }
        return tax;
    },

    calculateNI(gross) {
        const capped = Math.min(gross, this.NI_CEILING);
        const lower = this.employmentMode === 'employee' ? this.EMP_NI_LOWER : this.SELF_NI_LOWER;
        const upper = this.employmentMode === 'employee' ? this.EMP_NI_UPPER : this.SELF_NI_UPPER;
        if (capped <= this.NI_THRESHOLD) return capped * lower;
        return this.NI_THRESHOLD * lower + (capped - this.NI_THRESHOLD) * upper;
    },

    calculateHealth(gross) {
        const capped = Math.min(gross, this.NI_CEILING);
        const lower = this.employmentMode === 'employee' ? this.EMP_HEALTH_LOWER : this.SELF_HEALTH_LOWER;
        const upper = this.employmentMode === 'employee' ? this.EMP_HEALTH_UPPER : this.SELF_HEALTH_UPPER;
        if (capped <= this.NI_THRESHOLD) return capped * lower;
        return this.NI_THRESHOLD * lower + (capped - this.NI_THRESHOLD) * upper;
    },

    calculate() {
        Validation.clearErrors('salary-section');
        const gross = Validation.validateInput('salary-gross', { min: 0, max: 500000, label: 'שכר ברוטו' });
        if (gross === null || gross <= 0) return;

        const isEmployee = this.employmentMode === 'employee';
        const pensionEmployeePct = parseFloat(document.getElementById('salary-pension-employee').value) || 0;
        const pensionEmployerPct = isEmployee ? (parseFloat(document.getElementById('salary-pension-employer').value) || 0) : 0;
        const kerenEmployeePct = parseFloat(document.getElementById('salary-keren-employee').value) || 0;
        const kerenEmployerPct = isEmployee ? (parseFloat(document.getElementById('salary-keren-employer').value) || 0) : 0;
        const creditPoints = parseFloat(document.getElementById('salary-credit-points').value) || 0;
        const travel = parseFloat(document.getElementById('salary-travel').value) || 0;
        const carValue = parseFloat(document.getElementById('salary-car-value').value) || 0;

        const pensionEmployee = gross * (pensionEmployeePct / 100);
        const pensionEmployer = gross * (pensionEmployerPct / 100);
        const kerenEmployee = gross * (kerenEmployeePct / 100);
        const kerenEmployer = gross * (kerenEmployerPct / 100);

        // Taxable income
        const grossForTax = gross + carValue;
        const recognizedSalary = Math.min(gross, this.PENSION_CEILING);
        const pensionTaxDeduction = isEmployee
            ? recognizedSalary * (pensionEmployeePct / 100)
            : recognizedSalary * (Math.min(pensionEmployeePct, 11) / 100);
        const taxableIncome = Math.max(0, grossForTax - pensionTaxDeduction);

        // Income tax
        const incomeTaxBefore = this.calculateIncomeTax(taxableIncome);
        const creditAmount = creditPoints * this.CREDIT_POINT_VALUE;
        const incomeTax = Math.max(0, incomeTaxBefore - creditAmount);

        // NI & Health
        const ni = this.calculateNI(gross);
        const health = this.calculateHealth(gross);

        // Net
        const totalDeductions = incomeTax + ni + health + pensionEmployee + kerenEmployee;
        const netSalary = gross - totalDeductions + travel;

        // Employer cost
        const totalBenefits = pensionEmployer + kerenEmployer;
        const employerCost = gross + totalBenefits;
        const realValue = isEmployee ? (netSalary + totalBenefits) : netSalary;

        // Effective rate
        const effectiveRate = (totalDeductions / gross * 100);

        // Marginal rate
        let marginalRate = 0, prev = 0;
        for (const bracket of this.TAX_BRACKETS) {
            if (taxableIncome > prev) marginalRate = bracket.rate;
            prev = bracket.limit;
        }

        this.renderResults({
            gross, netSalary, realValue, employerCost,
            incomeTax, incomeTaxBefore, creditAmount,
            ni, health,
            pensionEmployee, pensionEmployer,
            pensionEmployeePct, pensionEmployerPct,
            kerenEmployee, kerenEmployer,
            kerenEmployeePct, kerenEmployerPct,
            travel, carValue, taxableIncome, totalDeductions,
            totalBenefits, isEmployee, marginalRate, effectiveRate,
            creditPoints, pensionTaxDeduction
        });
    },

    renderResults(d) {
        const fmt = ChartManager.formatCurrency.bind(ChartManager);
        const container = document.getElementById('salary-results');
        if (!container) return;

        let html = '<div class="results-container">';

        // Big numbers
        html += `
            <div class="result-row">
                <div class="result-card themed-green">
                    <h3>שכר נטו</h3>
                    <div class="result-big-number positive" data-value="${d.netSalary}">${fmt(0)}</div>
                    <div class="result-subtitle">מתוך ברוטו ${fmt(d.gross)} | ניכויים ${d.effectiveRate.toFixed(1)}%</div>
                </div>`;
        if (d.isEmployee) {
            html += `
                <div class="result-card themed-green">
                    <h3>ערך אמיתי כולל</h3>
                    <div class="result-big-number gold" data-value="${d.realValue}">${fmt(0)}</div>
                    <div class="result-subtitle">נטו + הפרשות מעסיק לחיסכון</div>
                </div>`;
        }
        html += '</div>';

        // Payslip table
        html += `
            <div class="result-card">
                <h3>תלוש שכר מפורט</h3>
                <table class="payslip-table">
                    <tr><td>שכר ברוטו</td><td>${fmt(d.gross)}</td></tr>`;
        if (d.carValue > 0) html += `<tr><td>שווי רכב צמוד (מתווסף למס)</td><td>${fmt(d.carValue)}</td></tr>`;
        if (d.pensionTaxDeduction > 0) html += `<tr class="benefit"><td>ניכוי פנסיה מהכנסה חייבת</td><td>-${fmt(d.pensionTaxDeduction)}</td></tr>`;
        html += `
                    <tr><td>הכנסה חייבת במס</td><td>${fmt(d.taxableIncome)}</td></tr>
                    <tr><td>מדרגת מס שולית</td><td>${(d.marginalRate * 100).toFixed(0)}%</td></tr>
                    <tr class="deduction"><td>מס הכנסה (לפני זיכוי: ${fmt(d.incomeTaxBefore)} | זיכוי: ${fmt(d.creditAmount)})</td><td>-${fmt(d.incomeTax)}</td></tr>
                    <tr class="deduction"><td>ביטוח לאומי</td><td>-${fmt(d.ni)}</td></tr>
                    <tr class="deduction"><td>ביטוח בריאות</td><td>-${fmt(d.health)}</td></tr>
                    <tr class="deduction"><td>פנסיה ${d.isEmployee ? 'עובד' : ''} (${d.pensionEmployeePct}%)</td><td>-${fmt(d.pensionEmployee)}</td></tr>`;
        if (d.kerenEmployee > 0) html += `<tr class="deduction"><td>קרן השתלמות ${d.isEmployee ? 'עובד' : ''} (${d.kerenEmployeePct}%)</td><td>-${fmt(d.kerenEmployee)}</td></tr>`;
        if (d.travel > 0) html += `<tr class="benefit"><td>החזר נסיעות</td><td>+${fmt(d.travel)}</td></tr>`;
        html += `
                    <tr class="total-row"><td><strong>שכר נטו</strong></td><td><strong>${fmt(d.netSalary)}</strong></td></tr>
                </table>
            </div>`;

        // Employer contributions
        if (d.isEmployee && d.totalBenefits > 0) {
            html += `
            <div class="result-card">
                <h3>הפרשות מעסיק (כסף שעובד בשבילך)</h3>
                <table class="payslip-table">
                    <tr class="benefit"><td>פנסיה מעסיק (${d.pensionEmployerPct}%)</td><td>+${fmt(d.pensionEmployer)}</td></tr>
                    <tr class="benefit"><td>קרן השתלמות מעסיק (${d.kerenEmployerPct}%)</td><td>+${fmt(d.kerenEmployer)}</td></tr>
                    <tr class="total-row"><td>סה"כ הפרשות מעסיק</td><td>${fmt(d.totalBenefits)}</td></tr>
                    <tr><td>עלות מעסיק כוללת</td><td>${fmt(d.employerCost)}</td></tr>
                </table>
            </div>`;
        }

        // Doughnut chart
        html += '<div class="result-card"><h3>לאן הולך הכסף?</h3><div class="chart-container"><canvas id="salary-breakdown-chart"></canvas></div></div>';

        // Insights
        const insightsData = {
            gross: d.gross, netSalary: d.netSalary, incomeTax: d.incomeTax, ni: d.ni, health: d.health,
            taxableIncome: d.taxableIncome, pensionEmployee: d.pensionEmployee, pensionEmployer: d.pensionEmployer,
            pensionEmployeePct: d.pensionEmployeePct, kerenEmployee: d.kerenEmployee, kerenEmployer: d.kerenEmployer,
            carValue: d.carValue, isEmployee: d.isEmployee,
            calculateTax: (income) => this.calculateIncomeTax(income)
        };
        const insights = Insights.generate('salary', insightsData);
        html += Insights.renderHTML(insights);

        // Share
        html += `<div class="share-row">
            <button class="btn-share" id="salary-share-btn">\uD83D\uDD17 שתף תוצאות</button>
            ${Scenarios.renderSaveButton('salary')}
            ${PDFExport.renderButton('salary', 'שכר')}
        </div>`;

        html += '</div>';
        container.innerHTML = html;

        // Chart data
        const chartItems = [
            { label: 'נטו לחשבון', value: Math.max(0, d.netSalary - d.travel), color: ChartManager.colors.green },
            { label: 'מס הכנסה', value: d.incomeTax, color: ChartManager.colors.red },
            { label: 'ביטוח לאומי', value: d.ni, color: ChartManager.colors.orange },
            { label: 'ביטוח בריאות', value: d.health, color: ChartManager.colors.purple },
            { label: 'פנסיה', value: d.pensionEmployee, color: ChartManager.colors.blue },
            { label: 'קרן השתלמות', value: d.kerenEmployee, color: ChartManager.colors.cyan }
        ].filter(x => x.value > 0);

        ChartManager.createDoughnut('salary-breakdown-chart',
            chartItems.map(x => x.label), chartItems.map(x => x.value), chartItems.map(x => x.color)
        );

        // Animate numbers
        ChartManager.animateNumbers(container);

        // Share button
        const shareBtn = document.getElementById('salary-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const modeLabel = d.isEmployee ? 'שכיר' : 'עצמאי';
                ShareManager.share('שכר',
                    `\uD83D\uDCB5 חשבשבון — חישוב שכר (${modeLabel})\n` +
                    `ברוטו: ${fmt(d.gross)}\n` +
                    `נטו: ${fmt(d.netSalary)}\n` +
                    `מס הכנסה: ${fmt(d.incomeTax)}\n` +
                    (d.isEmployee ? `ערך אמיתי: ${fmt(d.realValue)}\n` : '') +
                    `חשב גם: cheshbeshbon.co.il`
                );
            });
        }
    }
};
