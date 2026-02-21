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
    BOI_PRIME_RATE: 6.0
};
