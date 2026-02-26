/**
 * tax-data.js — 2026 Israeli Tax & Regulatory Constants
 * Single source of truth for all year-specific financial data.
 * When updating for a new tax year, only this file needs to change.
 */
const TaxData = {
    YEAR: 2026,

    // ═══════════════════════════════════════
    // Income Tax Brackets (monthly)
    // ═══════════════════════════════════════
    // Verify against official Rashut HaMisim 2026 publication
    TAX_BRACKETS: [
        { limit: 7010,     rate: 0.10 },
        { limit: 10060,    rate: 0.14 },
        { limit: 19000,    rate: 0.20 },
        { limit: 25100,    rate: 0.31 },
        { limit: 46690,    rate: 0.35 },
        { limit: 60130,    rate: 0.47 },
        { limit: Infinity, rate: 0.50 }
    ],

    // ═══════════════════════════════════════
    // National Insurance & Health Insurance
    // ═══════════════════════════════════════
    // Thresholds based on 2026 average wage (~13,769/month)
    // Verify against official Bituach Leumi 2026 circular
    NI_THRESHOLD: 7522,
    NI_CEILING: 48281,

    // Employee rates
    EMP_NI_LOWER: 0.004,
    EMP_NI_UPPER: 0.07,
    EMP_HEALTH_LOWER: 0.031,
    EMP_HEALTH_UPPER: 0.05,

    // Self-employed rates
    SELF_NI_LOWER: 0.0287,
    SELF_NI_UPPER: 0.1283,
    SELF_HEALTH_LOWER: 0.031,
    SELF_HEALTH_UPPER: 0.05,

    // ═══════════════════════════════════════
    // Credit Points & Pension
    // ═══════════════════════════════════════
    CREDIT_POINT_VALUE: 242,
    PENSION_CEILING: 12420,

    // ═══════════════════════════════════════
    // Purchase Tax (Mas Rechisha) Tiers
    // ═══════════════════════════════════════
    // Brackets frozen through 2026
    // Verify against official Rashut HaMisim publication
    PURCHASE_TAX_SINGLE: [
        { limit: 1919155, rate: 0 },
        { limit: 2276360, rate: 0.035 },
        { limit: 5872725, rate: 0.05 },
        { limit: 19575710, rate: 0.08 },
        { limit: Infinity, rate: 0.10 }
    ],
    // 2026: simplified to 8%/10% split at 6,055,070
    PURCHASE_TAX_ADDITIONAL: [
        { limit: 6055070, rate: 0.08 },
        { limit: Infinity, rate: 0.10 }
    ],

    // ═══════════════════════════════════════
    // BOI Prime Rate (for reference)
    // ═══════════════════════════════════════
    BOI_PRIME_RATE: 6.0,

    // ═══════════════════════════════════════
    // Self-Employed / Freelancer Constants
    // ═══════════════════════════════════════
    SELF_EMPLOYED: {
        // NI deduction from taxable income (52% of NI is deductible)
        NI_DEDUCTION_RATE: 0.52,

        // Pension deduction ceilings (recognized income ceiling = 293,400/year)
        PENSION_RECOGNIZED_INCOME: 293400 / 12,  // ~24,450/month
        PENSION_DEDUCTION_RATE: 0.11,             // up to 11% deductible
        PENSION_CREDIT_RATE: 0.055,               // 5.5% as tax credit (35% of contribution)
        PENSION_MANDATORY_RATE: 0.0445,           // 4.45% mandatory minimum
        PENSION_MANDATORY_INCOME_CEILING: 12420,  // monthly income ceiling for mandatory

        // Keren Hishtalmut
        KEREN_MAX_DEPOSIT_RATE: 0.07,             // up to 7% of income
        KEREN_DEDUCTIBLE_RATE: 0.045,             // 4.5% is tax-deductible
        KEREN_INCOME_CEILING: 293400 / 12,        // same recognized income ceiling

        // VAT
        VAT_RATE: 0.18,
        OSEK_PATUR_THRESHOLD: 120000,             // annual revenue threshold (2026)

        // Mikdamot (advance tax payments)
        MIKDAMOT_PERIODS: 6,                      // bimonthly payments

        // Common deductible expense rates
        EXPENSE_RATES: {
            HOME_OFFICE: 0.25,    // typical home office proportion
            CAR_BUSINESS: 0.45,   // 45% of car expenses deductible
            PHONE: 0.50,          // typical phone business use
            INTERNET: 0.50        // typical internet business use
        }
    }
};
