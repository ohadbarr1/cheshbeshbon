/**
 * insights.js — Smart Insights Engine
 * Generates contextual, actionable Hebrew insights for each calculator
 */
const Insights = {
    fmt(v) { return ChartManager.formatCurrency(v); },

    generate(type, data) {
        switch (type) {
            case 'mortgage': return this.mortgageInsights(data);
            case 'salary': return this.salaryInsights(data);
            case 'rentVsBuy': return this.rentVsBuyInsights(data);
            case 'pension': return this.pensionInsights(data);
            default: return [];
        }
    },

    mortgageInsights(d) {
        const insights = [];
        const { tracks, totalInterest, totalPaid, totalAmount } = d;

        // Interest ratio insight
        const interestRatio = totalInterest / totalAmount;
        if (interestRatio > 0.5) {
            insights.push({
                type: 'warning',
                icon: '\u26A0\uFE0F',
                text: `אתה משלם <strong>${this.fmt(totalInterest)}</strong> ריבית — <strong>${(interestRatio * 100).toFixed(0)}%</strong> מהקרן. שקול לקצר תקופה או להגדיל החזר חודשי.`
            });
        } else if (interestRatio < 0.25) {
            insights.push({
                type: 'positive',
                icon: '\u2705',
                text: `ריבית כוללת נמוכה יחסית — רק <strong>${(interestRatio * 100).toFixed(0)}%</strong> מהקרן. תמהיל יעיל!`
            });
        }

        // CPI track warning
        const cpiTracks = tracks.filter(t => t.type === 'cpi-fixed' || t.type === 'cpi-variable');
        if (cpiTracks.length > 0) {
            const cpiInterest = cpiTracks.reduce((s, t) => s + t.totalInterest, 0);
            const cpiAmount = cpiTracks.reduce((s, t) => s + t.amount, 0);
            const cpiExtra = cpiInterest - (cpiAmount * 0.3); // rough comparison to non-CPI
            if (cpiExtra > 0) {
                insights.push({
                    type: 'tip',
                    icon: '\uD83D\uDCA1',
                    text: `המסלולים צמודי המדד מוסיפים <strong>${this.fmt(cpiInterest)}</strong> בריבית. באינפלציה גבוהה, ההחזר יעלה משמעותית.`
                });
            }
        }

        // Track duration optimization
        const longestTrack = tracks.reduce((a, b) => a.years > b.years ? a : b);
        if (longestTrack.years > 20) {
            // Calculate savings from 5 year reduction
            const shortYears = longestTrack.years - 5;
            const monthlyRate = longestTrack.rate / 100 / 12;
            const shortMonths = shortYears * 12;
            const shortTotal = monthlyRate > 0
                ? longestTrack.amount * (monthlyRate * Math.pow(1 + monthlyRate, shortMonths)) / (Math.pow(1 + monthlyRate, shortMonths) - 1) * shortMonths
                : longestTrack.amount;
            const savings = longestTrack.totalPaid - shortTotal;
            if (savings > 10000) {
                insights.push({
                    type: 'tip',
                    icon: '\uD83D\uDCB0',
                    text: `קיצור מסלול ${longestTrack.index} ב-5 שנים (${longestTrack.years} → ${shortYears}) יחסוך לך כ-<strong>${this.fmt(savings)}</strong>.`
                });
            }
        }

        return insights.slice(0, 3);
    },

    salaryInsights(d) {
        const insights = [];

        // Effective tax rate
        const effectiveTax = ((d.incomeTax + d.ni + d.health) / d.gross * 100).toFixed(1);
        insights.push({
            type: 'tip',
            icon: '\uD83D\uDCCA',
            text: `שיעור הניכויים האפקטיבי שלך: <strong>${effectiveTax}%</strong> (מס + ביטוח לאומי + בריאות). נטו = <strong>${((d.netSalary / d.gross) * 100).toFixed(0)}%</strong> מהברוטו.`
        });

        // Pension increase suggestion
        if (d.pensionEmployeePct < 7) {
            const extraPct = 1;
            const extraCost = d.gross * (extraPct / 100);
            // Tax saving from extra pension
            const newTaxable = d.taxableIncome - extraCost;
            const newTax = d.calculateTax ? d.calculateTax(newTaxable) : d.incomeTax * (newTaxable / d.taxableIncome);
            const taxSaving = d.incomeTax - newTax;
            const netCost = extraCost - taxSaving;
            insights.push({
                type: 'positive',
                icon: '\uD83C\uDFF7\uFE0F',
                text: `הגדלת פנסיה ב-1% תעלה לך רק <strong>${this.fmt(netCost > 0 ? netCost : extraCost * 0.7)}</strong> נטו, אבל תוסיף <strong>${this.fmt(extraCost)}</strong> לפנסיה כל חודש.`
            });
        }

        // Keren hishtalmut value
        if (d.kerenEmployer > 0) {
            const annualKeren = d.kerenEmployer * 12;
            insights.push({
                type: 'positive',
                icon: '\u2B50',
                text: `קרן השתלמות מעסיק שווה לך <strong>${this.fmt(annualKeren)}</strong> בשנה — כסף פטור ממס אחרי 6 שנים!`
            });
        }

        // Company car tax impact
        if (d.carValue > 0) {
            insights.push({
                type: 'warning',
                icon: '\uD83D\uDE97',
                text: `שווי הרכב הצמוד (<strong>${this.fmt(d.carValue)}</strong>/חודש) מגדיל את ההכנסה החייבת במס — עלות המס בפועל: כ-<strong>${this.fmt(d.carValue * 0.35)}</strong>/חודש.`
            });
        }

        return insights.slice(0, 3);
    },

    rentVsBuyInsights(d) {
        const insights = [];

        // Crossover point
        let crossoverYear = null;
        for (let i = 0; i < d.buyTimeline.length; i++) {
            if (d.buyTimeline[i].netWealth > d.rentTimeline[i].netWealth && !crossoverYear) {
                crossoverYear = i + 1;
            }
            if (d.buyTimeline[i].netWealth < d.rentTimeline[i].netWealth && crossoverYear) {
                crossoverYear = null; // crossed back
            }
        }

        if (crossoverYear && crossoverYear > 1) {
            insights.push({
                type: 'tip',
                icon: '\uD83D\uDCCD',
                text: `<strong>נקודת האיזון: שנה ${crossoverYear}</strong> — לפני כן שכירות עדיפה. אם אתה מתכנן לגור פחות מ-${crossoverYear} שנים, שכירות משתלמת יותר.`
            });
        }

        // Purchase tax impact
        if (d.purchaseTax > 0) {
            insights.push({
                type: 'warning',
                icon: '\uD83C\uDFE6',
                text: `מס רכישה: <strong>${this.fmt(d.purchaseTax)}</strong> — הוצאה חד-פעמית שנגרעת מההון העצמי שלך ביום הראשון.`
            });
        }

        // Investment sensitivity
        const finalDiff = Math.abs(d.finalBuyWealth - d.finalRentWealth);
        const pctDiff = (finalDiff / Math.max(d.finalBuyWealth, d.finalRentWealth) * 100).toFixed(0);
        if (pctDiff < 15) {
            insights.push({
                type: 'tip',
                icon: '\u2696\uFE0F',
                text: `ההפרש בין התרחישים קטן יחסית (<strong>${pctDiff}%</strong>). שינוי קטן בתשואה או בעליית ערך יכול להפוך את התוצאה. נסה לשחק עם הפרמטרים.`
            });
        }

        return insights.slice(0, 3);
    },

    pensionInsights(d) {
        const insights = [];

        // Compound interest power
        const totalGrowth = d.balance - d.totalContributions;
        const growthPct = (totalGrowth / d.totalContributions * 100).toFixed(0);
        if (totalGrowth > 0) {
            insights.push({
                type: 'positive',
                icon: '\uD83D\uDE80',
                text: `כוח הריבית דריבית: <strong>${this.fmt(totalGrowth)}</strong> רווחים (<strong>${growthPct}%</strong> מההפקדות). כל שנה נוספת של חיסכון עושה הבדל עצום.`
            });
        }

        // Extra contribution suggestion
        const extra500balance = d.balance * 1; // rough estimate
        const monthlyReturn = Math.pow(1 + d.annualReturn / 100, 1/12) - 1;
        let extraBalance = 0;
        for (let m = 0; m < d.yearsToRetire * 12; m++) {
            extraBalance = extraBalance * (1 + monthlyReturn) + 500;
        }
        const retirementMonths = 240;
        const extraMonthlyPension = extraBalance / retirementMonths;
        insights.push({
            type: 'tip',
            icon: '\uD83D\uDCB5',
            text: `הפקדה נוספת של <strong>₪500/חודש</strong> היום תגדיל את הפנסיה ב-<strong>${this.fmt(extraMonthlyPension)}</strong>/חודש בפרישה.`
        });

        // Early start advantage
        if (d.currentAge <= 30) {
            insights.push({
                type: 'positive',
                icon: '\u23F0',
                text: `יתרון ענק: כל ₪1 שמופקד היום שווה <strong>₪${(Math.pow(1 + d.annualReturn / 100, d.yearsToRetire)).toFixed(1)}</strong> בגיל פרישה. הזמן עובד בשבילך!`
            });
        } else if (d.currentAge >= 50) {
            insights.push({
                type: 'warning',
                icon: '\u26A1',
                text: `נותרו ${d.yearsToRetire} שנים — שקול להגדיל הפרשות או לדחות פרישה בשנה-שנתיים. כל שנה נוספת משמעותית מאוד.`
            });
        }

        return insights.slice(0, 3);
    },

    renderHTML(insights) {
        if (!insights || insights.length === 0) return '';
        let html = '<div class="insights-container">';
        insights.forEach(i => {
            html += `
                <div class="insight-card ${i.type}">
                    <span class="insight-icon">${i.icon}</span>
                    <div class="insight-text">${i.text}</div>
                </div>`;
        });
        html += '</div>';
        return html;
    }
};
