/**
 * charts.js — Chart.js wrapper with Hebrew/RTL, animations, countup
 */
const ChartManager = {
    instances: {},
    formatter: new Intl.NumberFormat('he-IL'),

    formatCurrency(value) {
        return '\u20AA' + this.formatter.format(Math.round(value));
    },

    formatShortCurrency(value) {
        if (Math.abs(value) >= 1000000) return '\u20AA' + (value / 1000000).toFixed(1) + 'M';
        if (Math.abs(value) >= 1000) return '\u20AA' + (value / 1000).toFixed(0) + 'K';
        return '\u20AA' + Math.round(value);
    },

    /** Animate a number counting up inside an element */
    countUp(el, targetValue, duration = 800) {
        const start = parseFloat(el.dataset.currentValue) || 0;
        const diff = targetValue - start;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + diff * eased;
            el.textContent = this.formatCurrency(current);
            el.dataset.currentValue = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                el.textContent = this.formatCurrency(targetValue);
                el.dataset.currentValue = targetValue;
            }
        };

        requestAnimationFrame(animate);
    },

    /** Run countUp on all .result-big-number[data-value] in a container */
    animateNumbers(container) {
        const els = container.querySelectorAll('.result-big-number[data-value]');
        els.forEach(el => {
            const target = parseFloat(el.dataset.value);
            if (!isNaN(target)) {
                this.countUp(el, target);
            }
        });
    },

    defaultOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    rtl: true,
                    textDirection: 'rtl',
                    labels: {
                        color: '#a0a0be',
                        font: { family: 'Heebo, sans-serif', size: 11, weight: '500' },
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8
                    }
                },
                tooltip: {
                    rtl: true,
                    textDirection: 'rtl',
                    backgroundColor: 'rgba(19, 19, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#f0f0f8',
                    bodyColor: '#a0a0be',
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { weight: '700', family: 'Heebo, sans-serif' },
                    bodyFont: { family: 'Heebo, sans-serif' },
                    callbacks: {
                        label: (ctx) => {
                            const label = ctx.dataset.label || '';
                            const val = ChartManager.formatCurrency(ctx.parsed.y ?? ctx.parsed);
                            return label + ': ' + val;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#606080', font: { size: 10, family: 'Heebo, sans-serif' } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: {
                        color: '#606080',
                        font: { size: 10, family: 'Heebo, sans-serif' },
                        callback: function(value) { return ChartManager.formatShortCurrency(value); }
                    }
                }
            }
        };
    },

    createLine(canvasId, labels, datasets, customOptions = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const options = this._mergeOptions(customOptions);

        this.instances[canvasId] = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels, datasets },
            options
        });
        return this.instances[canvasId];
    },

    createBar(canvasId, labels, datasets, customOptions = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const options = this._mergeOptions(customOptions);

        this.instances[canvasId] = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets },
            options
        });
        return this.instances[canvasId];
    },

    createDoughnut(canvasId, labels, data, colors, customOptions = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeInOutQuart' },
            cutout: '65%',
            plugins: {
                legend: {
                    rtl: true, textDirection: 'rtl', position: 'bottom',
                    labels: {
                        color: '#a0a0be',
                        font: { family: 'Heebo, sans-serif', size: 11, weight: '500' },
                        padding: 12, usePointStyle: true, pointStyle: 'circle', boxWidth: 8
                    }
                },
                tooltip: {
                    rtl: true, textDirection: 'rtl',
                    backgroundColor: 'rgba(19, 19, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
                    titleColor: '#f0f0f8', bodyColor: '#a0a0be',
                    padding: 12, cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => {
                            const label = ctx.label || '';
                            const val = ChartManager.formatCurrency(ctx.parsed);
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return label + ': ' + val + ' (' + pct + '%)';
                        }
                    }
                }
            },
            ...customOptions
        };

        this.instances[canvasId] = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderColor: '#06060b', borderWidth: 2, hoverOffset: 6 }]
            },
            options
        });
        return this.instances[canvasId];
    },

    _mergeOptions(custom) {
        const base = this.defaultOptions();
        // Deep merge plugins and scales
        if (custom.plugins) {
            base.plugins = { ...base.plugins, ...custom.plugins };
            if (custom.plugins.legend) base.plugins.legend = { ...base.plugins.legend, ...custom.plugins.legend };
        }
        if (custom.scales) {
            if (custom.scales.x) base.scales.x = { ...base.scales.x, ...custom.scales.x };
            if (custom.scales.y) base.scales.y = { ...base.scales.y, ...custom.scales.y };
        }
        return { ...base, ...custom, plugins: base.plugins, scales: base.scales };
    },

    destroy(canvasId) {
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
            delete this.instances[canvasId];
        }
    },

    colors: {
        blue: '#60a5fa', green: '#34d399', red: '#f87171', gold: '#fbbf24',
        purple: '#a78bfa', orange: '#fb923c', cyan: '#22d3ee', pink: '#f472b6',
        blueAlpha: 'rgba(96, 165, 250, 0.12)',
        greenAlpha: 'rgba(52, 211, 153, 0.12)',
        redAlpha: 'rgba(248, 113, 113, 0.12)',
        goldAlpha: 'rgba(251, 191, 36, 0.12)',
        purpleAlpha: 'rgba(167, 139, 250, 0.12)',
        orangeAlpha: 'rgba(251, 146, 60, 0.12)'
    }
};
