/**
 * app.js — V2 Reactive Engine, Tab Navigation, Presets, Router, Scenarios
 * The brain of the app: debounced real-time calculation, preset chips, tab switching
 */
// ═══════════════════════════════════════════════════════════
// INPUT VALIDATION UTILITY
// ═══════════════════════════════════════════════════════════
const Validation = {
    /** Validate a numeric input. Returns clamped value or null if invalid. */
    validateInput(inputId, { min = 0, max = Infinity, label = '' } = {}) {
        const el = document.getElementById(inputId);
        if (!el) return null;
        const group = el.closest('.input-group');
        const val = parseFloat(el.value);

        // Remove previous error
        if (group) {
            group.classList.remove('has-error');
            const prev = group.querySelector('.input-error-msg');
            if (prev) prev.remove();
        }

        if (isNaN(val)) return null;

        if (val < min) {
            if (group) {
                group.classList.add('has-error');
                const msg = document.createElement('span');
                msg.className = 'input-error-msg';
                msg.textContent = `${label || 'ערך'} לא יכול להיות קטן מ-${min}`;
                group.appendChild(msg);
            }
            return null;
        }
        if (val > max) {
            if (group) {
                group.classList.add('has-error');
                const msg = document.createElement('span');
                msg.className = 'input-error-msg';
                msg.textContent = `${label || 'ערך'} לא יכול לעלות על ${max.toLocaleString('he-IL')}`;
                group.appendChild(msg);
            }
            return null;
        }
        return val;
    },

    /** Clear all validation errors in a section */
    clearErrors(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        section.querySelectorAll('.has-error').forEach(g => g.classList.remove('has-error'));
        section.querySelectorAll('.input-error-msg').forEach(m => m.remove());
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════
    // INITIALIZE ALL MODULES
    // ═══════════════════════════════════════════════════════════
    Premium.init();
    MortgageCalc.init();
    SalaryCalc.init();
    RentVsBuyCalc.init();
    PensionCalc.init();
    Scenarios.init();
    Router.init();

    // ═══════════════════════════════════════════════════════════
    // TAB NAVIGATION (within calculators page)
    // ═══════════════════════════════════════════════════════════
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.calculator-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update active tab
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding section with animation
            sections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });
            const target = document.getElementById(tabId + '-section');
            if (target) {
                target.style.display = '';
                // Force reflow for animation
                void target.offsetWidth;
                target.classList.add('active');
            }
        });
    });

    // Ensure only active section is visible on load
    sections.forEach(s => {
        if (!s.classList.contains('active')) s.style.display = 'none';
    });

    // ═══════════════════════════════════════════════════════════
    // REACTIVE ENGINE — Debounced real-time calculation
    // ═══════════════════════════════════════════════════════════
    const DEBOUNCE_MS = 150;
    let debounceTimers = {};

    function debounceCalc(calcId, fn) {
        clearTimeout(debounceTimers[calcId]);
        debounceTimers[calcId] = setTimeout(() => {
            try { fn(); } catch (e) { console.warn('Calc error:', calcId, e); }
        }, DEBOUNCE_MS);
    }

    // Mortgage: listen to all inputs in mortgage section
    const mortgageSection = document.getElementById('mortgage-section');
    if (mortgageSection) {
        mortgageSection.addEventListener('input', (e) => {
            if (e.target.matches('input, select')) {
                debounceCalc('mortgage', () => MortgageCalc.calculate());
            }
        });
        mortgageSection.addEventListener('change', (e) => {
            if (e.target.matches('select')) {
                debounceCalc('mortgage', () => MortgageCalc.calculate());
            }
        });
    }

    // Salary: listen to all inputs in salary section
    const salarySection = document.getElementById('salary-section');
    if (salarySection) {
        salarySection.addEventListener('input', (e) => {
            if (e.target.matches('input[type="number"], input[type="range"]')) {
                debounceCalc('salary', () => SalaryCalc.calculate());
            }
        });
    }

    // Rent vs Buy: listen to all inputs in rent-vs-buy section
    const rvbSection = document.getElementById('rent-vs-buy-section');
    if (rvbSection) {
        rvbSection.addEventListener('input', (e) => {
            if (e.target.matches('input')) {
                debounceCalc('rvb', () => RentVsBuyCalc.calculate());
            }
        });
        rvbSection.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                debounceCalc('rvb', () => RentVsBuyCalc.calculate());
            }
        });
    }

    // Pension: listen to all inputs in pension section
    const pensionSection = document.getElementById('pension-section');
    if (pensionSection) {
        pensionSection.addEventListener('input', (e) => {
            if (e.target.matches('input')) {
                debounceCalc('pension', () => PensionCalc.calculate());
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // PRESET CHIPS
    // ═══════════════════════════════════════════════════════════
    document.querySelectorAll('[data-preset]').forEach(chip => {
        chip.addEventListener('click', () => {
            const preset = chip.dataset.preset;
            applyPreset(preset);
        });
    });

    function applyPreset(preset) {
        switch (preset) {
            // Mortgage presets
            case 'mortgage-800k':
                setTrackValues([
                    { amount: 400000, years: 20, rate: 5.5, type: 'prime' },
                    { amount: 250000, years: 15, rate: 4.2, type: 'fixed' },
                    { amount: 150000, years: 10, rate: 2.5, type: 'cpi-fixed' }
                ]);
                debounceCalc('mortgage', () => MortgageCalc.calculate());
                break;
            case 'mortgage-1m':
                setTrackValues([
                    { amount: 500000, years: 25, rate: 5.5, type: 'prime' },
                    { amount: 300000, years: 20, rate: 4.5, type: 'fixed' },
                    { amount: 200000, years: 15, rate: 3.0, type: 'cpi-fixed' }
                ]);
                debounceCalc('mortgage', () => MortgageCalc.calculate());
                break;
            case 'mortgage-1.5m':
                setTrackValues([
                    { amount: 750000, years: 25, rate: 5.5, type: 'prime' },
                    { amount: 450000, years: 20, rate: 4.5, type: 'fixed' },
                    { amount: 300000, years: 15, rate: 3.0, type: 'cpi-fixed' }
                ]);
                debounceCalc('mortgage', () => MortgageCalc.calculate());
                break;
            case 'mortgage-2m':
                setTrackValues([
                    { amount: 1000000, years: 25, rate: 5.5, type: 'prime' },
                    { amount: 600000, years: 20, rate: 4.5, type: 'fixed' },
                    { amount: 400000, years: 15, rate: 3.0, type: 'cpi-fixed' }
                ]);
                debounceCalc('mortgage', () => MortgageCalc.calculate());
                break;

            // Salary presets
            case 'salary-10k':
                setInputValue('salary-gross', 10000);
                debounceCalc('salary', () => SalaryCalc.calculate());
                break;
            case 'salary-15k':
                setInputValue('salary-gross', 15000);
                debounceCalc('salary', () => SalaryCalc.calculate());
                break;
            case 'salary-20k':
                setInputValue('salary-gross', 20000);
                debounceCalc('salary', () => SalaryCalc.calculate());
                break;
            case 'salary-30k':
                setInputValue('salary-gross', 30000);
                debounceCalc('salary', () => SalaryCalc.calculate());
                break;
            case 'salary-50k':
                setInputValue('salary-gross', 50000);
                debounceCalc('salary', () => SalaryCalc.calculate());
                break;

            // Rent vs Buy presets
            case 'rvb-1.5m':
                setInputValue('rvb-property-price', 1500000);
                setInputValue('rvb-equity', 375000);
                setInputValue('rvb-rent', 4000);
                debounceCalc('rvb', () => RentVsBuyCalc.calculate());
                break;
            case 'rvb-2m':
                setInputValue('rvb-property-price', 2000000);
                setInputValue('rvb-equity', 500000);
                setInputValue('rvb-rent', 5000);
                debounceCalc('rvb', () => RentVsBuyCalc.calculate());
                break;
            case 'rvb-3m':
                setInputValue('rvb-property-price', 3000000);
                setInputValue('rvb-equity', 750000);
                setInputValue('rvb-rent', 7000);
                debounceCalc('rvb', () => RentVsBuyCalc.calculate());
                break;

            // Pension presets
            case 'pension-young':
                setInputValue('pension-age', 25);
                setInputValue('pension-salary', 15000);
                setInputValue('pension-current-savings', 20000);
                debounceCalc('pension', () => PensionCalc.calculate());
                break;
            case 'pension-mid':
                setInputValue('pension-age', 35);
                setInputValue('pension-salary', 25000);
                setInputValue('pension-current-savings', 250000);
                debounceCalc('pension', () => PensionCalc.calculate());
                break;
            case 'pension-senior':
                setInputValue('pension-age', 50);
                setInputValue('pension-salary', 35000);
                setInputValue('pension-current-savings', 800000);
                debounceCalc('pension', () => PensionCalc.calculate());
                break;
        }
    }

    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    function setTrackValues(trackConfigs) {
        const trackCards = document.querySelectorAll('.track-card');
        trackConfigs.forEach((config, i) => {
            if (i < trackCards.length) {
                const card = trackCards[i];
                const amountInput = card.querySelector('.track-amount');
                const yearsInput = card.querySelector('.track-years');
                const rateInput = card.querySelector('.track-rate');
                const typeSelect = card.querySelector('.track-type');
                if (amountInput) amountInput.value = config.amount;
                if (yearsInput) yearsInput.value = config.years;
                if (rateInput) rateInput.value = config.rate;
                if (typeSelect) typeSelect.value = config.type;
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-CALCULATE ON LOAD — trigger first calculation
    // ═══════════════════════════════════════════════════════════
    try { MortgageCalc.calculate(); } catch (e) { console.warn('Mortgage init calc error:', e); }

    // ═══════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════
    document.addEventListener('keydown', (e) => {
        // Alt+1/2/3/4 to switch tabs
        if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            const btn = tabBtns[tabIndex];
            if (btn) btn.click();
        }
    });

    // ═══════════════════════════════════════════════════════════
    // TOOLTIP SYSTEM (accessible)
    // ═══════════════════════════════════════════════════════════
    function toggleTooltip(trigger) {
        const allTooltips = document.querySelectorAll('.tooltip-trigger.active');
        allTooltips.forEach(t => {
            if (t !== trigger) {
                t.classList.remove('active');
                t.setAttribute('aria-expanded', 'false');
            }
        });
        const isActive = trigger.classList.toggle('active');
        trigger.setAttribute('aria-expanded', String(isActive));
    }

    document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('aria-expanded', 'false');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTooltip(trigger);
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                toggleTooltip(trigger);
            }
        });
    });

    // Close tooltips on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.tooltip-trigger.active').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-expanded', 'false');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // SCROLL-TRIGGERED FADE-IN (IntersectionObserver)
    // ═══════════════════════════════════════════════════════════
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in-section').forEach(el => {
        fadeObserver.observe(el);
    });

    // ═══════════════════════════════════════════════════════════
    // SMOOTH SCROLL — scroll to results when calculated
    // ═══════════════════════════════════════════════════════════
    if (window.innerWidth <= 600) {
        // On mobile, scroll to results panel when calculation happens
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const target = mutation.target;
                    if (target.classList.contains('results-panel') && target.querySelector('.results-container')) {
                        setTimeout(() => {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                }
            });
        });

        document.querySelectorAll('.results-panel').forEach(panel => {
            observer.observe(panel, { childList: true });
        });
    }

    console.log('🧮 חשבשבון V2 loaded — Real-time reactive mode active');
});
