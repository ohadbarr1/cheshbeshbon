/**
 * rent-vs-buy.js — V2 Israeli Rent vs Buy Comparison
 * Purchase tax, sensitivity, insights, share, animated numbers
 */
const RentVsBuyCalc = {
    // 2025 Purchase tax tiers for single apartment
    PURCHASE_TAX_SINGLE: [
        { limit: 1919155, rate: 0 },
        { limit: 2276360, rate: 0.035 },
        { limit: 5872725, rate: 0.05 },
        { limit: 19575710, rate: 0.08 },
        { limit: Infinity, rate: 0.10 }
    ],
    PURCHASE_TAX_ADDITIONAL: [
        { limit: 5872725, rate: 0.08 },
        { limit: 19575710, rate: 0.10 },
        { limit: Infinity, rate: 0.10 }
    ],

    init() {
        // Range slider live display
        const rvbYears = document.getElementById('rvb-years');
        const rvbYearsDisplay = document.getElementById('rvb-years-display');
        if (rvbYears && rvbYearsDisplay) {
            rvbYears.addEventListener('input', () => {
                rvbYearsDisplay.textContent = rvbYears.value + ' שנים';
            });
        }
    },

    calculatePurchaseTax(price, isSingle) {
        const tiers = isSingle ? this.PURCHASE_TAX_SINGLE : this.PURCHASE_TAX_ADDITIONAL;
        let tax = 0, prev = 0;
        for (const tier of tiers) {
            if (price <= prev) break;
            const taxable = Math.min(price, tier.limit) - prev;
            tax += taxable * tier.rate;
            prev = tier.limit;
        }
        return tax;
    },

    simulate(price, equity, mortgageRate, mortgageYears, appreciation, arnona, vaad, isSingle, rent, rentIncrease, investmentReturn, years) {
        const purchaseTax = this.calculatePurchaseTax(price, isSingle);
        const mortgageAmount = price - equity;
        const monthlyRate = mortgageRate / 100 / 12;
        const totalMonths = mortgageYears * 12;
        const monthlyMortgage = monthlyRate > 0
            ? mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
            : mortgageAmount / totalMonths;

        const buyTimeline = [];
        const rentTimeline = [];
        let buyTotalSpent = equity + purchaseTax;
        let rentInvestmentBalance = equity;
        let currentRent = rent;
        let propertyValue = price;
        let mortgageBalance = mortgageAmount;

        for (let y = 1; y <= years; y++) {
            // BUY scenario
            const yearlyMortgage = monthlyMortgage * 12 * (y * 12 <= totalMonths ? 1 : 0);
            const yearlyArnona = arnona * 12;
            const yearlyVaad = vaad * 12;
            const yearlyMaintenance = propertyValue * 0.01;
            const yearlyCostBuy = yearlyMortgage + yearlyArnona + yearlyVaad + yearlyMaintenance;
            buyTotalSpent += yearlyCostBuy;
            propertyValue *= (1 + appreciation / 100);

            if (y * 12 <= totalMonths) {
                for (let m = 0; m < 12; m++) {
                    const interest = mortgageBalance * monthlyRate;
                    const principal = monthlyMortgage - interest;
                    mortgageBalance = Math.max(0, mortgageBalance - principal);
                }
            }
            const buyNetWealth = propertyValue - Math.max(0, mortgageBalance);
            buyTimeline.push({ year: y, netWealth: buyNetWealth, propertyValue, mortgageBalance: Math.max(0, mortgageBalance) });

            // RENT scenario
            const yearlyRent = currentRent * 12;
            const monthlySavings = (yearlyMortgage + yearlyArnona + yearlyVaad + yearlyMaintenance) / 12 - currentRent;
            if (monthlySavings > 0) {
                for (let m = 0; m < 12; m++) {
                    rentInvestmentBalance *= (1 + investmentReturn / 100 / 12);
                    rentInvestmentBalance += monthlySavings;
                }
            } else {
                rentInvestmentBalance *= (1 + investmentReturn / 100);
            }
            currentRent *= (1 + rentIncrease / 100);
            rentTimeline.push({ year: y, netWealth: rentInvestmentBalance });
        }

        return { buyTimeline, rentTimeline, purchaseTax, monthlyMortgage, mortgageAmount };
    },

    calculate() {
        const price = parseFloat(document.getElementById('rvb-property-price').value) || 0;
        const equity = parseFloat(document.getElementById('rvb-equity').value) || 0;
        const mortgageRate = parseFloat(document.getElementById('rvb-mortgage-rate').value) || 0;
        const mortgageYears = parseInt(document.getElementById('rvb-mortgage-years').value) || 25;
        const appreciation = parseFloat(document.getElementById('rvb-appreciation').value) || 0;
        const arnona = parseFloat(document.getElementById('rvb-arnona').value) || 0;
        const vaad = parseFloat(document.getElementById('rvb-vaad').value) || 0;
        const isSingle = document.getElementById('rvb-first-apt').checked;
        const rent = parseFloat(document.getElementById('rvb-rent').value) || 0;
        const rentIncrease = parseFloat(document.getElementById('rvb-rent-increase').value) || 0;
        const investmentReturn = parseFloat(document.getElementById('rvb-investment-return').value) || 0;
        const years = parseInt(document.getElementById('rvb-years').value) || 20;

        if (price <= 0 || rent <= 0) return;

        const result = this.simulate(price, equity, mortgageRate, mortgageYears, appreciation, arnona, vaad, isSingle, rent, rentIncrease, investmentReturn, years);
        const { buyTimeline, rentTimeline, purchaseTax, monthlyMortgage, mortgageAmount } = result;

        const finalBuyWealth = buyTimeline[buyTimeline.length - 1].netWealth;
        const finalRentWealth = rentTimeline[rentTimeline.length - 1].netWealth;
        const buyWins = finalBuyWealth > finalRentWealth;

        this.renderResults({
            buyTimeline, rentTimeline, years,
            purchaseTax, monthlyMortgage, mortgageAmount,
            finalBuyWealth, finalRentWealth, buyWins,
            equity, price, appreciation, investmentReturn,
            // Pass inputs for sensitivity
            mortgageRate, mortgageYears, arnona, vaad, isSingle,
            rent, rentIncrease
        });
    },

    renderResults(d) {
        const fmt = ChartManager.formatCurrency.bind(ChartManager);

        let html = '<div class="results-container">';

        // Verdict
        const diff = Math.abs(d.finalBuyWealth - d.finalRentWealth);
        const verdict = d.buyWins ? 'buy' : 'rent';
        const verdictText = d.buyWins
            ? `\uD83C\uDFE0 קנייה עדיפה ב-${fmt(diff)} אחרי ${d.years} שנים`
            : `\uD83D\uDD11 שכירות עדיפה ב-${fmt(diff)} אחרי ${d.years} שנים`;
        html += `<div class="verdict-banner ${verdict}">${verdictText}</div>`;

        // Key numbers
        html += `
            <div class="result-row">
                <div class="result-card themed-purple">
                    <h3>הון נקי — קנייה</h3>
                    <div class="result-big-number ${d.buyWins ? 'positive' : 'neutral'}" data-value="${d.finalBuyWealth}">${fmt(0)}</div>
                    <div class="result-subtitle">שווי נכס פחות משכנתא</div>
                </div>
                <div class="result-card themed-purple">
                    <h3>הון נקי — שכירות</h3>
                    <div class="result-big-number ${!d.buyWins ? 'positive' : 'neutral'}" data-value="${d.finalRentWealth}">${fmt(0)}</div>
                    <div class="result-subtitle">תיק השקעות</div>
                </div>
            </div>`;

        // Purchase details
        html += `
            <div class="result-card">
                <h3>פרטי רכישה</h3>
                <table class="payslip-table">
                    <tr><td>מחיר הנכס</td><td>${fmt(d.price)}</td></tr>
                    <tr><td>הון עצמי</td><td>${fmt(d.equity)}</td></tr>
                    <tr><td>סכום משכנתא</td><td>${fmt(d.mortgageAmount)}</td></tr>
                    <tr class="deduction"><td>מס רכישה</td><td>${fmt(d.purchaseTax)}</td></tr>
                    <tr><td>החזר חודשי (משכנתא)</td><td>${fmt(d.monthlyMortgage)}</td></tr>
                    <tr class="total-row"><td>הוצאה ראשונית</td><td>${fmt(d.equity + d.purchaseTax)}</td></tr>
                </table>
            </div>`;

        // Wealth timeline chart
        html += '<div class="result-card"><h3>הון נקי לאורך זמן</h3><div class="chart-container"><canvas id="rvb-wealth-chart"></canvas></div></div>';

        // Sensitivity slider
        html += `
            <div class="sensitivity-container">
                <h3>\uD83D\uDD2E מה אם עליית הערך תהיה שונה?</h3>
                <div class="sensitivity-slider">
                    <div class="sensitivity-label">
                        <span>עליית ערך שנתית</span>
                        <span class="sensitivity-value" id="rvb-sens-value">${d.appreciation.toFixed(1)}%</span>
                    </div>
                    <input type="range" id="rvb-sens-slider"
                        min="${Math.max(-2, d.appreciation - 4)}" max="${d.appreciation + 4}"
                        step="0.5" value="${d.appreciation}">
                    <div class="sensitivity-comparison">
                        <span class="sensitivity-original">מקורי: ${d.buyWins ? 'קנייה' : 'שכירות'} עדיפה</span>
                        <span class="sensitivity-new" id="rvb-sens-result">-</span>
                    </div>
                </div>
            </div>`;

        // Insights
        const insights = Insights.generate('rentVsBuy', {
            buyTimeline: d.buyTimeline, rentTimeline: d.rentTimeline,
            buyWins: d.buyWins, finalBuyWealth: d.finalBuyWealth,
            finalRentWealth: d.finalRentWealth, purchaseTax: d.purchaseTax
        });
        html += Insights.renderHTML(insights);

        // Share
        html += `<div class="share-row">
            <button class="btn-share" id="rvb-share-btn">\uD83D\uDD17 שתף תוצאות</button>
        </div>`;

        html += '</div>';
        document.getElementById('rent-vs-buy-results').innerHTML = html;

        // Animate numbers
        ChartManager.animateNumbers(document.getElementById('rent-vs-buy-results'));

        // Chart
        const labels = d.buyTimeline.map(t => 'שנה ' + t.year);
        ChartManager.createLine('rvb-wealth-chart', labels, [
            {
                label: 'קנייה — הון נקי', data: d.buyTimeline.map(t => t.netWealth),
                borderColor: ChartManager.colors.purple, backgroundColor: ChartManager.colors.purpleAlpha,
                fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 0
            },
            {
                label: 'שכירות — תיק השקעות', data: d.rentTimeline.map(t => t.netWealth),
                borderColor: ChartManager.colors.blue, backgroundColor: ChartManager.colors.blueAlpha,
                fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 0
            }
        ], { plugins: { legend: { position: 'bottom' } } });

        // Sensitivity slider
        this.bindSensitivity(d, fmt);

        // Share
        const shareBtn = document.getElementById('rvb-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                ShareManager.share('שכירות vs קנייה',
                    `\uD83C\uDFE0 חשבשבון — שכירות מול קנייה\n` +
                    `${d.buyWins ? 'קנייה' : 'שכירות'} עדיפה ב-${fmt(diff)}\n` +
                    `הון נקי קנייה: ${fmt(d.finalBuyWealth)}\n` +
                    `הון נקי שכירות: ${fmt(d.finalRentWealth)}\n` +
                    `אחרי ${d.years} שנים\n` +
                    `חשב גם: cheshbeshbon.co.il`
                );
            });
        }
    },

    bindSensitivity(d, fmt) {
        const slider = document.getElementById('rvb-sens-slider');
        const valueEl = document.getElementById('rvb-sens-value');
        const resultEl = document.getElementById('rvb-sens-result');
        if (!slider) return;

        slider.addEventListener('input', () => {
            const newApp = parseFloat(slider.value);
            valueEl.textContent = newApp.toFixed(1) + '%';

            const sim = this.simulate(
                d.price, d.equity, d.mortgageRate, d.mortgageYears,
                newApp, d.arnona, d.vaad, d.isSingle,
                d.rent, d.rentIncrease, d.investmentReturn, d.years
            );

            const newBuyWealth = sim.buyTimeline[sim.buyTimeline.length - 1].netWealth;
            const newRentWealth = sim.rentTimeline[sim.rentTimeline.length - 1].netWealth;
            const newDiff = newBuyWealth - newRentWealth;
            const newBuyWins = newDiff >= 0;

            resultEl.className = 'sensitivity-new ' + (newBuyWins ? 'better' : 'worse');
            resultEl.textContent = (newBuyWins ? 'קנייה' : 'שכירות') + ' עדיפה ב-' + fmt(Math.abs(newDiff));
        });
    }
};
