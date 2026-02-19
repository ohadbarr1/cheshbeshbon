/**
 * mortgage.js — V2 Multi-track Israeli Mortgage Calculator
 * Real-time, insights, sensitivity, early repayment, share, animated numbers
 */
const MortgageCalc = {
    trackCounter: 3,

    init() {
        // Add track button
        document.getElementById('add-track-btn').addEventListener('click', () => this.addTrack());

        // Remove track delegation
        document.getElementById('mortgage-tracks').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-track')) {
                const card = e.target.closest('.track-card');
                if (document.querySelectorAll('.track-card').length > 1) {
                    card.remove();
                    this.renumberTracks();
                    this.calculate();
                }
            }
        });
    },

    addTrack() {
        const tracks = document.querySelectorAll('.track-card');
        if (tracks.length >= 5) return;

        this.trackCounter++;
        const idx = this.trackCounter;
        const html = `
            <div class="track-card" data-track="${idx}">
                <div class="track-header">
                    <span class="track-title">מסלול ${tracks.length + 1}</span>
                    <button class="btn-remove-track" title="הסר מסלול">&#x2715;</button>
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label>סוג מסלול</label>
                        <select id="track-${idx}-type" class="track-type">
                            <option value="prime">פריים</option>
                            <option value="fixed">קבועה לא צמודה</option>
                            <option value="cpi-fixed">קבועה צמודת מדד</option>
                            <option value="variable">משתנה לא צמודה</option>
                            <option value="cpi-variable">משתנה צמודת מדד</option>
                        </select>
                    </div>
                </div>
                <div class="input-row three-col">
                    <div class="input-group">
                        <label>סכום (₪)</label>
                        <input type="number" id="track-${idx}-amount" class="track-amount" value="200000" min="0" step="10000" inputmode="numeric">
                    </div>
                    <div class="input-group">
                        <label>שנים</label>
                        <input type="number" id="track-${idx}-years" class="track-years" value="15" min="4" max="30" inputmode="numeric">
                    </div>
                    <div class="input-group">
                        <label>ריבית %</label>
                        <input type="number" id="track-${idx}-rate" class="track-rate" value="3.5" min="0" max="15" step="0.1" inputmode="decimal">
                    </div>
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label>גרייס (חודשים)
                            <span class="tooltip-trigger" data-tooltip="תקופת גרייס — תשלום ריבית בלבד, ללא קרן">?</span>
                        </label>
                        <input type="number" id="track-${idx}-grace" class="track-grace" value="0" min="0" max="24" inputmode="numeric">
                    </div>
                </div>
            </div>`;

        document.getElementById('mortgage-tracks').insertAdjacentHTML('beforeend', html);
    },

    renumberTracks() {
        document.querySelectorAll('.track-card').forEach((card, i) => {
            card.querySelector('.track-title').textContent = 'מסלול ' + (i + 1);
        });
    },

    getTrackTypeName(type) {
        const names = {
            'prime': 'פריים',
            'fixed': 'קבועה לא צמודה',
            'cpi-fixed': 'קבועה צמודת מדד',
            'variable': 'משתנה לא צמודה',
            'cpi-variable': 'משתנה צמודת מדד'
        };
        return names[type] || type;
    },

    calculateTrack(amount, years, annualRate, type, annualCPI, graceMonths = 0) {
        const months = years * 12;
        const monthlyRate = annualRate / 100 / 12;
        const monthlyCPI = Math.pow(1 + annualCPI / 100, 1 / 12) - 1;
        const isCPI = type === 'cpi-fixed' || type === 'cpi-variable';

        const schedule = [];
        let balance = amount;
        let totalPaid = 0;
        let totalInterest = 0;

        if (!isCPI) {
            let postGracePayment = 0;

            for (let m = 1; m <= months; m++) {
                const interestPayment = balance * monthlyRate;
                let payment, principalPayment;
                if (m <= graceMonths) {
                    // Grace period: interest only
                    payment = interestPayment;
                    principalPayment = 0;
                } else {
                    // After grace: calculate amortization over remaining months
                    if (m === graceMonths + 1) {
                        const remaining = months - graceMonths;
                        postGracePayment = monthlyRate > 0
                            ? balance * (monthlyRate * Math.pow(1 + monthlyRate, remaining)) / (Math.pow(1 + monthlyRate, remaining) - 1)
                            : balance / remaining;
                    }
                    payment = postGracePayment;
                    principalPayment = payment - interestPayment;
                }
                balance -= principalPayment;
                totalInterest += interestPayment;
                totalPaid += payment;
                schedule.push({ month: m, payment, principal: principalPayment, interest: interestPayment, balance: Math.max(0, balance) });
            }
        } else {
            for (let m = 1; m <= months; m++) {
                balance *= (1 + monthlyCPI);
                const interestPayment = balance * monthlyRate;
                let payment, principalPayment;
                if (m <= graceMonths) {
                    // Grace period: interest only, CPI still adjusts balance
                    payment = interestPayment;
                    principalPayment = 0;
                } else {
                    const remainingMonths = months - m + 1;
                    payment = monthlyRate > 0
                        ? balance * (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / (Math.pow(1 + monthlyRate, remainingMonths) - 1)
                        : balance / remainingMonths;
                    principalPayment = payment - interestPayment;
                }
                balance -= principalPayment;
                totalInterest += interestPayment;
                totalPaid += payment;
                schedule.push({ month: m, payment, principal: principalPayment, interest: interestPayment, balance: Math.max(0, balance) });
            }
        }

        return { schedule, totalPaid, totalInterest, firstPayment: schedule[0]?.payment || 0, lastPayment: schedule[schedule.length - 1]?.payment || 0 };
    },

    // Early repayment simulation
    simulateEarlyRepayment(tracks, extraMonthly, lumpSum, lumpSumMonth) {
        let originalTotalInterest = tracks.reduce((s, t) => s + t.totalInterest, 0);
        let originalTotalMonths = Math.max(...tracks.map(t => t.schedule.length));
        let newTotalInterest = 0;
        let newTotalMonths = 0;
        const totalAmount = tracks.reduce((s, t) => s + t.amount, 0);

        tracks.forEach(t => {
            const share = totalAmount > 0 ? t.amount / totalAmount : 0;
            const trackExtra = extraMonthly * share;
            const trackLump = lumpSum * share;
            const monthlyRate = t.rate / 100 / 12;
            let balance = t.amount;
            let interest = 0;
            let month = 0;

            while (balance > 0.5 && month < t.schedule.length) {
                month++;
                if (month === lumpSumMonth && trackLump > 0) {
                    balance = Math.max(0, balance - trackLump);
                }
                const interestPart = balance * monthlyRate;
                const remaining = t.schedule.length - month + 1;
                let payment = monthlyRate > 0
                    ? balance * (monthlyRate * Math.pow(1 + monthlyRate, remaining)) / (Math.pow(1 + monthlyRate, remaining) - 1)
                    : balance / remaining;
                payment += trackExtra;
                const principalPart = payment - interestPart;
                interest += interestPart;
                balance -= principalPart;
                if (balance <= 0) balance = 0;
            }
            newTotalInterest += interest;
            newTotalMonths = Math.max(newTotalMonths, month);
        });

        return {
            interestSaved: originalTotalInterest - newTotalInterest,
            monthsSaved: originalTotalMonths - newTotalMonths,
            newTotalInterest
        };
    },

    calculate() {
        const cpiRate = parseFloat(document.getElementById('cpi-rate').value) || 0;
        const trackCards = document.querySelectorAll('.track-card');
        const tracks = [];

        trackCards.forEach((card, i) => {
            const type = card.querySelector('.track-type').value;
            const amount = parseFloat(card.querySelector('.track-amount').value) || 0;
            const years = parseInt(card.querySelector('.track-years').value) || 20;
            const rate = parseFloat(card.querySelector('.track-rate').value) || 0;
            const graceEl = card.querySelector('.track-grace');
            const grace = graceEl ? (parseInt(graceEl.value) || 0) : 0;

            if (amount > 0) {
                const result = this.calculateTrack(amount, years, rate, type, cpiRate, grace);
                tracks.push({ index: i + 1, type, typeName: this.getTrackTypeName(type), amount, years, rate, grace, ...result });
            }
        });

        if (tracks.length === 0) return;

        // BOI regulatory warnings
        this.renderBOIWarnings(tracks);

        this.renderResults(tracks, cpiRate);
    },

    renderBOIWarnings(tracks) {
        const warningsEl = document.getElementById('boi-warnings');
        if (!warningsEl) return;

        const warnings = [];
        const totalAmount = tracks.reduce((s, t) => s + t.amount, 0);

        // Prime > 2/3 check
        const primeAmount = tracks.filter(t => t.type === 'prime').reduce((s, t) => s + t.amount, 0);
        if (totalAmount > 0 && primeAmount / totalAmount > 2 / 3) {
            const primePct = (primeAmount / totalAmount * 100).toFixed(0);
            warnings.push(`\u26A0\uFE0F מסלולי פריים מהווים ${primePct}% מהמשכנתא — בנק ישראל מגביל ל-⅔ (66.67%) מסך המשכנתא במסלול פריים.`);
        }

        // PTI > 40% check
        const netIncomeEl = document.getElementById('mortgage-net-income');
        const netIncome = netIncomeEl ? (parseFloat(netIncomeEl.value) || 0) : 0;
        if (netIncome > 0) {
            const firstMonthlyPayment = tracks.reduce((s, t) => s + (t.firstPayment || 0), 0);
            const pti = firstMonthlyPayment / netIncome;
            if (pti > 0.40) {
                const ptiPct = (pti * 100).toFixed(0);
                warnings.push(`\u26A0\uFE0F ההחזר החודשי מהווה ${ptiPct}% מההכנסה נטו — בנק ישראל מגביל ל-40% מהשכר נטו (PTI).`);
            }
        }

        if (warnings.length > 0) {
            warningsEl.innerHTML = warnings.map(w =>
                `<div class="insight-card warning"><p>${w}</p></div>`
            ).join('');
        } else {
            warningsEl.innerHTML = '';
        }
    },

    renderResults(tracks, cpiRate) {
        const totalAmount = tracks.reduce((s, t) => s + t.amount, 0);
        const totalPaid = tracks.reduce((s, t) => s + t.totalPaid, 0);
        const totalInterest = tracks.reduce((s, t) => s + t.totalInterest, 0);
        const maxMonths = Math.max(...tracks.map(t => t.schedule.length));

        const monthlyPayments = [];
        for (let m = 0; m < maxMonths; m++) {
            let total = 0;
            tracks.forEach(t => { if (m < t.schedule.length) total += t.schedule[m].payment; });
            monthlyPayments.push(total);
        }
        const firstMonthly = monthlyPayments[0];
        const maxMonthly = Math.max(...monthlyPayments);

        const fmt = ChartManager.formatCurrency.bind(ChartManager);

        let html = '<div class="results-container">';

        // Summary cards
        html += `
            <div class="result-row">
                <div class="result-card themed-blue">
                    <h3>החזר חודשי ראשון</h3>
                    <div class="result-big-number neutral" data-value="${firstMonthly}">${fmt(0)}</div>
                    <div class="result-subtitle">החזר מקסימלי: ${fmt(maxMonthly)}</div>
                </div>
                <div class="result-card themed-blue">
                    <h3>עלות כוללת</h3>
                    <div class="result-big-number gold" data-value="${totalPaid}">${fmt(0)}</div>
                    <div class="result-subtitle">מתוכם ריבית: ${fmt(totalInterest)}</div>
                </div>
            </div>`;

        // Per-track breakdown
        html += '<div class="result-card"><h3>פירוט לפי מסלול</h3><table class="payslip-table">';
        tracks.forEach(t => {
            html += `
                <tr><td>מסלול ${t.index} — ${t.typeName}</td><td>${fmt(t.amount)}</td></tr>
                <tr class="deduction"><td>&nbsp;&nbsp;ריבית כוללת</td><td>${fmt(t.totalInterest)}</td></tr>
                <tr><td>&nbsp;&nbsp;החזר ראשון / אחרון</td><td>${fmt(t.firstPayment)} / ${fmt(t.lastPayment)}</td></tr>`;
        });
        html += `<tr class="total-row"><td>סה"כ</td><td>${fmt(totalPaid)}</td></tr></table></div>`;

        // Payment timeline chart
        html += '<div class="result-card"><h3>החזר חודשי לאורך זמן</h3><div class="chart-container"><canvas id="mortgage-payment-chart"></canvas></div></div>';

        // Cost breakdown chart
        html += '<div class="result-card"><h3>חלוקת עלויות</h3><div class="chart-container"><canvas id="mortgage-cost-chart"></canvas></div></div>';

        // Early repayment simulator
        html += `
            <div class="result-card early-repayment-card">
                <h3>\uD83D\uDCB0 סימולציית פירעון מוקדם</h3>
                <p class="result-subtitle">כמה תחסוך אם תשלם יותר כל חודש?</p>
                <div class="input-row">
                    <div class="input-group">
                        <label>תוספת חודשית (₪)</label>
                        <input type="number" id="er-extra-monthly" value="500" min="0" step="100" inputmode="numeric">
                    </div>
                    <div class="input-group">
                        <label>תשלום חד-פעמי (₪)</label>
                        <input type="number" id="er-lump-sum" value="0" min="0" step="10000" inputmode="numeric">
                    </div>
                </div>
                <div id="er-results" class="er-results-grid"></div>
            </div>`;

        // Sensitivity slider
        const baseRate = tracks.length > 0 ? tracks[0].rate : 4;
        html += `
            <div class="sensitivity-container">
                <h3>\uD83D\uDD2E מה אם הריבית תשתנה?</h3>
                <div class="sensitivity-slider">
                    <div class="sensitivity-label">
                        <span>שינוי ריבית</span>
                        <span class="sensitivity-value" id="mort-sens-value">0%</span>
                    </div>
                    <input type="range" id="mort-sens-slider" min="-2" max="2" step="0.25" value="0">
                    <div class="sensitivity-comparison">
                        <span class="sensitivity-original">מקורי: ${fmt(totalPaid)}</span>
                        <span class="sensitivity-new" id="mort-sens-result">-</span>
                    </div>
                </div>
            </div>`;

        // Insights
        const insightsData = { tracks, totalInterest, totalPaid, totalAmount };
        const insights = Insights.generate('mortgage', insightsData);
        html += Insights.renderHTML(insights);

        // Share
        html += `<div class="share-row">
            <button class="btn-share" id="mortgage-share-btn">\uD83D\uDD17 שתף תוצאות</button>
            ${Scenarios.renderSaveButton('mortgage')}
            ${PDFExport.renderButton('mortgage', 'משכנתא')}
        </div>`;

        html += '</div>';
        document.getElementById('mortgage-results').innerHTML = html;

        // Animate numbers
        ChartManager.animateNumbers(document.getElementById('mortgage-results'));

        // Render charts
        this.renderPaymentChart(tracks, maxMonths);
        this.renderCostChart(tracks);

        // Bind early repayment
        this.bindEarlyRepayment(tracks, fmt);

        // Bind sensitivity
        this.bindSensitivity(tracks, cpiRate, totalPaid, fmt);

        // Share button
        const shareBtn = document.getElementById('mortgage-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                ShareManager.share('משכנתא',
                    `\uD83C\uDFE0 חשבשבון — חישוב משכנתא\n` +
                    `סה"כ משכנתא: ${fmt(totalAmount)}\n` +
                    `החזר חודשי: ${fmt(firstMonthly)}\n` +
                    `עלות כוללת: ${fmt(totalPaid)}\n` +
                    `ריבית: ${fmt(totalInterest)}\n` +
                    `חשב גם: cheshbeshbon.co.il`
                );
            });
        }
    },

    bindEarlyRepayment(tracks, fmt) {
        const extraInput = document.getElementById('er-extra-monthly');
        const lumpInput = document.getElementById('er-lump-sum');
        const resultsEl = document.getElementById('er-results');
        if (!extraInput || !lumpInput || !resultsEl) return;

        const update = () => {
            const extra = parseFloat(extraInput.value) || 0;
            const lump = parseFloat(lumpInput.value) || 0;
            if (extra === 0 && lump === 0) {
                resultsEl.innerHTML = '<p class="result-subtitle">הזן תוספת חודשית או תשלום חד-פעמי</p>';
                return;
            }
            const result = this.simulateEarlyRepayment(tracks, extra, lump, 12);
            resultsEl.innerHTML = `
                <div class="er-stat">
                    <span class="er-stat-value positive">${fmt(result.interestSaved)}</span>
                    <span class="er-stat-label">חיסכון בריבית</span>
                </div>
                <div class="er-stat">
                    <span class="er-stat-value positive">${result.monthsSaved}</span>
                    <span class="er-stat-label">חודשים שנחסכו</span>
                </div>`;
        };

        extraInput.addEventListener('input', update);
        lumpInput.addEventListener('input', update);
        update();
    },

    bindSensitivity(tracks, cpiRate, baseTotalPaid, fmt) {
        const slider = document.getElementById('mort-sens-slider');
        const valueEl = document.getElementById('mort-sens-value');
        const resultEl = document.getElementById('mort-sens-result');
        if (!slider) return;

        slider.addEventListener('input', () => {
            const delta = parseFloat(slider.value);
            valueEl.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(2) + '%';

            let newTotal = 0;
            tracks.forEach(t => {
                const adjustedRate = Math.max(0, t.rate + delta);
                const result = this.calculateTrack(t.amount, t.years, adjustedRate, t.type, cpiRate, t.grace || 0);
                newTotal += result.totalPaid;
            });

            const diff = newTotal - baseTotalPaid;
            const better = diff <= 0;
            resultEl.className = 'sensitivity-new ' + (better ? 'better' : 'worse');
            resultEl.textContent = fmt(newTotal) + ' (' + (better ? '' : '+') + fmt(diff) + ')';
        });
    },

    renderPaymentChart(tracks, maxMonths) {
        const yearCount = Math.ceil(maxMonths / 12);
        const yearlyLabels = [];
        for (let y = 1; y <= yearCount; y++) yearlyLabels.push('שנה ' + y);

        const trackColors = [ChartManager.colors.blue, ChartManager.colors.green, ChartManager.colors.purple, ChartManager.colors.orange, ChartManager.colors.pink];
        const trackAlphas = [ChartManager.colors.blueAlpha, ChartManager.colors.greenAlpha, ChartManager.colors.purpleAlpha, ChartManager.colors.orangeAlpha, 'rgba(236,72,153,0.15)'];

        const datasets = tracks.map((t, i) => {
            const yearlyPayments = [];
            for (let y = 0; y < yearCount; y++) {
                const mIndex = y * 12;
                yearlyPayments.push(mIndex < t.schedule.length ? t.schedule[mIndex].payment : 0);
            }
            return {
                label: 'מסלול ' + t.index + ' — ' + t.typeName,
                data: yearlyPayments,
                borderColor: trackColors[i % trackColors.length],
                backgroundColor: trackAlphas[i % trackAlphas.length],
                fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2
            };
        });

        ChartManager.createLine('mortgage-payment-chart', yearlyLabels, datasets, { plugins: { legend: { position: 'bottom' } } });
    },

    renderCostChart(tracks) {
        const labels = tracks.map(t => 'מסלול ' + t.index);
        ChartManager.createBar('mortgage-cost-chart', labels, [
            { label: 'קרן', data: tracks.map(t => t.amount), backgroundColor: ChartManager.colors.blue, borderRadius: 4 },
            { label: 'ריבית', data: tracks.map(t => t.totalInterest), backgroundColor: ChartManager.colors.red, borderRadius: 4 }
        ], {
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { legend: { position: 'bottom' } }
        });
    }
};
