/**
 * ui-helpers.js — Shared rendering helpers for calculator results
 * Reduces duplication across mortgage.js, salary.js, rent-vs-buy.js, pension.js
 */
const UIHelpers = {
    /**
     * Render a share + save + PDF export row
     * @param {string} calcId - Calculator identifier
     * @param {string} btnId - Share button element ID
     * @param {string} pdfLabel - Hebrew label for PDF export
     */
    renderShareRow(calcId, btnId, pdfLabel) {
        return `<div class="share-row">
            <button class="btn-share" id="${btnId}">\uD83D\uDD17 שתף תוצאות</button>
            ${Scenarios.renderSaveButton(calcId)}
            ${PDFExport.renderButton(calcId, pdfLabel)}
        </div>`;
    },

    /**
     * Render a result card with big number
     * @param {string} title - Card title (Hebrew)
     * @param {number} value - Numeric value for countup animation
     * @param {string} subtitle - Subtitle text
     * @param {string} colorClass - CSS class (positive/negative/neutral/gold)
     * @param {string} themeClass - Card theme (themed-blue/themed-green/themed-purple/themed-gold)
     * @param {function} fmt - Currency formatter
     */
    renderBigNumberCard(title, value, subtitle, colorClass, themeClass, fmt) {
        return `<div class="result-card ${themeClass}">
            <h3>${title}</h3>
            <div class="result-big-number ${colorClass}" data-value="${value}">${fmt(0)}</div>
            <div class="result-subtitle">${subtitle}</div>
        </div>`;
    },

    /**
     * Render a payslip-style table
     * @param {Array} rows - Array of {label, value, class} objects
     * @param {string} title - Optional card title
     */
    renderTable(rows, title) {
        let html = '<div class="result-card">';
        if (title) html += `<h3>${title}</h3>`;
        html += '<table class="payslip-table">';
        rows.forEach(row => {
            const cls = row.class ? ` class="${row.class}"` : '';
            html += `<tr${cls}><td>${row.label}</td><td>${row.value}</td></tr>`;
        });
        html += '</table></div>';
        return html;
    },

    /**
     * Bind a share button click handler
     * @param {string} btnId - Button element ID
     * @param {string} title - Share title
     * @param {string} text - Share text
     */
    bindShareButton(btnId, title, text) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                ShareManager.share(title, text, btn);
            });
        }
    }
};
