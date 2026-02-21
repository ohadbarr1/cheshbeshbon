/**
 * pension.js — Israeli Pension Calculator with insights, sensitivity, progress bar
 */
const PensionCalc = {
    lastData: null,

    init() { /* reactive listeners handled by app.js */ },

    calculate() {
        Validation.clearErrors('pension-section');
        const currentAge = Validation.validateInput('pension-age', { min: 18, max: 75, label: 'גיל' });
        const retireAge = Validation.validateInput('pension-retire-age', { min: 50, max: 80, label: 'גיל פרישה' });
        const salary = Validation.validateInput('pension-salary', { min: 0, max: 500000, label: 'שכר' });
        const employeePct = parseFloat(document.getElementById('pension-employee-pct').value) || 0;
        const employerPct = parseFloat(document.getElementById('pension-employer-pct').value) || 0;
        const currentSavings = parseFloat(document.getElementById('pension-current-savings').value) || 0;
        const annualReturn = parseFloat(document.getElementById('pension-return').value) || 0;
        const salaryGrowth = parseFloat(document.getElementById('pension-salary-growth').value) || 0;

        if (currentAge === null || retireAge === null || salary === null) return;
        if (salary <= 0 || retireAge <= currentAge) return;

        const yearsToRetire = retireAge - currentAge;
        const result = this.simulate(salary, employeePct, employerPct, currentSavings, annualReturn, salaryGrowth, yearsToRetire);

        // Estimate monthly pension (annuity over ~20 years with reduced returns)
        const retirementMonths = 240;
        const retMonthlyReturn = Math.pow(1 + annualReturn * 0.7 / 100, 1 / 12) - 1;
        const monthlyPension = retMonthlyReturn > 0
            ? result.balance * (retMonthlyReturn * Math.pow(1 + retMonthlyReturn, retirementMonths)) / (Math.pow(1 + retMonthlyReturn, retirementMonths) - 1)
            : result.balance / retirementMonths;

        const lastSalary = salary * Math.pow(1 + salaryGrowth / 100, yearsToRetire);
        const replacementRatio = (monthlyPension / lastSalary) * 100;
        const targetPension = lastSalary * 0.7;
        const gap = targetPension - monthlyPension;

        this.lastData = {
            ...result, monthlyPension, lastSalary, replacementRatio,
            targetPension, gap, yearsToRetire, currentAge, retireAge,
            annualReturn, salary, employeePct, employerPct
        };

        this.renderResults(this.lastData);
    },

    simulate(salary, employeePct, employerPct, currentSavings, annualReturn, salaryGrowth, years) {
        const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
        const timeline = [];
        let balance = currentSavings;
        let currentSalary = salary;
        let totalContributions = currentSavings;

        for (let y = 1; y <= years; y++) {
            const monthlyContribution = currentSalary * ((employeePct + employerPct) / 100);
            for (let m = 0; m < 12; m++) {
                balance *= (1 + monthlyReturn);
                balance += monthlyContribution;
            }
            totalContributions += monthlyContribution * 12;
            currentSalary *= (1 + salaryGrowth / 100);

            timeline.push({
                year: y, age: 0 + y, // age set externally
                balance, contributions: totalContributions,
                growth: balance - totalContributions
            });
        }

        return { timeline, balance, totalContributions };
    },

    renderResults(d) {
        const fmt = ChartManager.formatCurrency.bind(ChartManager);
        const container = document.getElementById('pension-results');

        // Gap indicator
        let gapClass, gapEmoji, gapTitle, gapDesc;
        if (d.replacementRatio >= 70) {
            gapClass = 'good'; gapEmoji = '\uD83C\uDF89';
            gapTitle = 'מצוין! אתה בכיוון טוב';
            gapDesc = 'הפנסיה צפויה לכסות ' + d.replacementRatio.toFixed(0) + '% מהשכר \u2014 מעל היעד של 70%';
        } else if (d.replacementRatio >= 50) {
            gapClass = 'warning'; gapEmoji = '\u26A0\uFE0F';
            gapTitle = 'יש מקום לשיפור';
            gapDesc = 'חסרים ' + fmt(d.gap) + '/חודש כדי להגיע ל-70% מהשכר';
        } else {
            gapClass = 'danger'; gapEmoji = '\uD83D\uDEA8';
            gapTitle = 'נדרשת תשומת לב';
            gapDesc = 'חסרים ' + fmt(d.gap) + '/חודש \u2014 שקול להגדיל הפרשות';
        }

        const progressPct = Math.min(d.replacementRatio, 100);

        let html = '<div class="results-container">';

        // Big numbers
        html += `
            <div class="result-row">
                <div class="result-card themed-gold">
                    <h3>צבירה בגיל פרישה</h3>
                    <div class="result-big-number gold" data-value="${d.balance}">${fmt(0)}</div>
                    <div class="result-subtitle">אחרי ${d.yearsToRetire} שנות חיסכון</div>
                </div>
                <div class="result-card themed-gold">
                    <h3>פנסיה חודשית צפויה</h3>
                    <div class="result-big-number ${d.gap <= 0 ? 'positive' : 'negative'}" data-value="${d.monthlyPension}">${fmt(0)}</div>
                    <div class="result-subtitle">${d.replacementRatio.toFixed(0)}% מהשכר האחרון</div>
                </div>
            </div>`;

        // Gap indicator with progress bar
        html += `
            <div class="result-card">
                <h3>ניתוח פערים</h3>
                <div class="gap-indicator ${gapClass}">
                    <span class="gap-emoji">${gapEmoji}</span>
                    <div class="gap-text">
                        <strong>${gapTitle}</strong>
                        <span>${gapDesc}</span>
                    </div>
                </div>
                <div class="pension-progress">
                    <div class="pension-progress-bar">
                        <div class="pension-progress-fill ${gapClass}" style="width: 0%;" data-target="${progressPct}"></div>
                    </div>
                    <div class="pension-progress-labels">
                        <span>0%</span>
                        <span>יעד: 70%</span>
                        <span>${d.replacementRatio.toFixed(0)}%</span>
                    </div>
                </div>
            </div>`;

        // Details table
        html += `
            <div class="result-card">
                <h3>פירוט</h3>
                <table class="payslip-table">
                    <tr><td>שנות חיסכון</td><td>${d.yearsToRetire}</td></tr>
                    <tr><td>סה"כ הפקדות</td><td>${fmt(d.totalContributions)}</td></tr>
                    <tr class="benefit"><td>רווחים מהשקעות</td><td>${fmt(d.balance - d.totalContributions)}</td></tr>
                    <tr class="total-row"><td>סה"כ צבירה</td><td>${fmt(d.balance)}</td></tr>
                    <tr><td>שכר אחרון (צפוי)</td><td>${fmt(d.lastSalary)}</td></tr>
                    <tr><td>יעד פנסיה (70%)</td><td>${fmt(d.targetPension)}</td></tr>
                </table>
            </div>`;

        // Growth chart
        html += `
            <div class="result-card">
                <h3>צמיחת החיסכון הפנסיוני</h3>
                <div class="chart-container">
                    <canvas id="pension-growth-chart"></canvas>
                </div>
            </div>`;

        // Sensitivity analysis
        html += `
            <div class="sensitivity-container">
                <h3>\uD83D\uDD2E מה אם התשואה תהיה שונה?</h3>
                <div class="sensitivity-slider">
                    <div class="sensitivity-label">
                        <span>תשואה שנתית</span>
                        <span class="sensitivity-value" id="pension-sens-value">${d.annualReturn.toFixed(1)}%</span>
                    </div>
                    <input type="range" id="pension-sens-slider"
                        min="${Math.max(0, d.annualReturn - 3)}"
                        max="${d.annualReturn + 3}"
                        step="0.5"
                        value="${d.annualReturn}">
                    <div class="sensitivity-comparison">
                        <span class="sensitivity-original">מקורי: ${fmt(d.monthlyPension)}/חודש</span>
                        <span class="sensitivity-new" id="pension-sens-result">-</span>
                    </div>
                </div>
            </div>`;

        // Insights
        const insights = Insights.generate('pension', d);
        html += Insights.renderHTML(insights);

        // Share
        html += `<div class="share-row">
            <button class="btn-share" id="pension-share-btn">\uD83D\uDD17 שתף תוצאות</button>
            ${Scenarios.renderSaveButton('pension')}
            ${PDFExport.renderButton('pension', 'פנסיה')}
        </div>`;

        html += '</div>';
        container.innerHTML = html;

        // Animate numbers
        ChartManager.animateNumbers(container);

        // Animate progress bar
        setTimeout(() => {
            const fill = container.querySelector('.pension-progress-fill');
            if (fill) fill.style.width = fill.dataset.target + '%';
        }, 100);

        // Render chart
        const labels = d.timeline.map((t, i) => 'גיל ' + (d.currentAge + i + 1));
        ChartManager.createLine('pension-growth-chart', labels, [
            {
                label: 'סה"כ צבירה',
                data: d.timeline.map(t => t.balance),
                borderColor: ChartManager.colors.gold,
                backgroundColor: ChartManager.colors.goldAlpha,
                fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 0
            },
            {
                label: 'הפקדות בלבד',
                data: d.timeline.map(t => t.contributions),
                borderColor: ChartManager.colors.blue,
                backgroundColor: ChartManager.colors.blueAlpha,
                fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0, borderDash: [5, 5]
            }
        ], { plugins: { legend: { position: 'bottom' } } });

        // Sensitivity slider
        this.bindSensitivity(d);

        // Share button
        const shareBtn = document.getElementById('pension-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                ShareManager.share('פנסיה',
                    `\uD83D\uDCCA חשבשבון - תחזית פנסיה\n` +
                    `צבירה צפויה: ${fmt(d.balance)}\n` +
                    `פנסיה חודשית: ${fmt(d.monthlyPension)}\n` +
                    `${d.replacementRatio.toFixed(0)}% מהשכר האחרון\n` +
                    `חשב גם: cheshbeshbon.co.il`
                );
            });
        }
    },

    bindSensitivity(d) {
        const slider = document.getElementById('pension-sens-slider');
        const valueEl = document.getElementById('pension-sens-value');
        const resultEl = document.getElementById('pension-sens-result');
        if (!slider) return;

        const fmt = ChartManager.formatCurrency.bind(ChartManager);

        slider.addEventListener('input', () => {
            const newReturn = parseFloat(slider.value);
            valueEl.textContent = newReturn.toFixed(1) + '%';

            const simResult = this.simulate(
                d.salary, d.employeePct, d.employerPct,
                parseFloat(document.getElementById('pension-current-savings').value) || 0,
                newReturn,
                parseFloat(document.getElementById('pension-salary-growth').value) || 0,
                d.yearsToRetire
            );

            const retMonthlyReturn = Math.pow(1 + newReturn * 0.7 / 100, 1 / 12) - 1;
            const newPension = retMonthlyReturn > 0
                ? simResult.balance * (retMonthlyReturn * Math.pow(1 + retMonthlyReturn, 240)) / (Math.pow(1 + retMonthlyReturn, 240) - 1)
                : simResult.balance / 240;

            const diff = newPension - d.monthlyPension;
            const better = diff >= 0;
            resultEl.className = 'sensitivity-new ' + (better ? 'better' : 'worse');
            resultEl.textContent = fmt(newPension) + '/חודש (' + (better ? '+' : '') + fmt(diff) + ')';
        });
    }
};
