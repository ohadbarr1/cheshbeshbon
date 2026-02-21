/**
 * tests.js — Unit tests for core calculation functions
 * Open test-runner.html in a browser to run
 */
(function() {
    let passed = 0, failed = 0;
    const results = document.getElementById('results');

    function assert(name, condition, detail) {
        if (condition) {
            passed++;
            results.innerHTML += `<div class="result pass">✓ ${name}</div>`;
        } else {
            failed++;
            results.innerHTML += `<div class="result fail">✗ ${name}${detail ? ' — ' + detail : ''}</div>`;
        }
    }

    function approx(a, b, tolerance = 1) {
        return Math.abs(a - b) <= tolerance;
    }

    // ═══════════════════════════════════════
    // SalaryCalc.calculateIncomeTax
    // ═══════════════════════════════════════
    assert('Tax: zero income = zero tax',
        SalaryCalc.calculateIncomeTax(0) === 0);

    assert('Tax: income in first bracket (5000)',
        approx(SalaryCalc.calculateIncomeTax(5000), 5000 * 0.10));

    assert('Tax: income spanning two brackets (8000)',
        approx(SalaryCalc.calculateIncomeTax(8000),
            7010 * 0.10 + (8000 - 7010) * 0.14));

    assert('Tax: high income uses top bracket',
        SalaryCalc.calculateIncomeTax(100000) > 0);

    assert('Tax: monotonically increasing',
        SalaryCalc.calculateIncomeTax(20000) < SalaryCalc.calculateIncomeTax(30000));

    // ═══════════════════════════════════════
    // SalaryCalc.calculateNI
    // ═══════════════════════════════════════
    assert('NI: zero income = zero NI',
        SalaryCalc.calculateNI(0) === 0);

    assert('NI: below threshold uses lower rate',
        approx(SalaryCalc.calculateNI(5000), 5000 * SalaryCalc.EMP_NI_LOWER));

    assert('NI: above ceiling is capped',
        SalaryCalc.calculateNI(80000) === SalaryCalc.calculateNI(SalaryCalc.NI_CEILING),
        `80K NI=${SalaryCalc.calculateNI(80000)}, ceiling NI=${SalaryCalc.calculateNI(SalaryCalc.NI_CEILING)}`);

    // ═══════════════════════════════════════
    // SalaryCalc.calculateHealth
    // ═══════════════════════════════════════
    assert('Health: zero income = zero',
        SalaryCalc.calculateHealth(0) === 0);

    assert('Health: capped at ceiling',
        SalaryCalc.calculateHealth(80000) === SalaryCalc.calculateHealth(SalaryCalc.NI_CEILING));

    // ═══════════════════════════════════════
    // MortgageCalc.calculateTrack — non-CPI
    // ═══════════════════════════════════════
    const track1 = MortgageCalc.calculateTrack(100000, 10, 5, 'fixed', 0, 0);
    assert('Mortgage track: totalPaid > amount',
        track1.totalPaid > 100000, `totalPaid=${track1.totalPaid}`);

    assert('Mortgage track: totalInterest = totalPaid - amount',
        approx(track1.totalInterest, track1.totalPaid - 100000, 5));

    assert('Mortgage track: 120 months schedule',
        track1.schedule.length === 120);

    assert('Mortgage track: final balance near zero',
        track1.schedule[119].balance < 1);

    // Zero rate
    const track0rate = MortgageCalc.calculateTrack(120000, 10, 0, 'fixed', 0, 0);
    assert('Mortgage track: 0% rate = equal payments',
        approx(track0rate.firstPayment, 1000));

    assert('Mortgage track: 0% rate = zero interest',
        track0rate.totalInterest < 1);

    // ═══════════════════════════════════════
    // MortgageCalc.calculateTrack — CPI
    // ═══════════════════════════════════════
    const trackCPI = MortgageCalc.calculateTrack(100000, 10, 3, 'cpi-fixed', 2, 0);
    assert('CPI track: totalPaid > non-CPI track at same rate',
        trackCPI.totalPaid > MortgageCalc.calculateTrack(100000, 10, 3, 'fixed', 0, 0).totalPaid);

    // Grace period
    const trackGrace = MortgageCalc.calculateTrack(100000, 10, 5, 'fixed', 0, 6);
    assert('Grace period: first 6 months interest-only',
        trackGrace.schedule[0].principal === 0 && trackGrace.schedule[5].principal === 0);
    assert('Grace period: month 7 has principal',
        trackGrace.schedule[6].principal > 0);

    // ═══════════════════════════════════════
    // RentVsBuyCalc.calculatePurchaseTax
    // ═══════════════════════════════════════
    assert('Purchase tax: below threshold (single) = 0',
        RentVsBuyCalc.calculatePurchaseTax(1500000, true) === 0);

    assert('Purchase tax: above threshold (single) > 0',
        RentVsBuyCalc.calculatePurchaseTax(2500000, true) > 0);

    assert('Purchase tax: additional apartment > single apartment',
        RentVsBuyCalc.calculatePurchaseTax(2000000, false) > RentVsBuyCalc.calculatePurchaseTax(2000000, true));

    assert('Purchase tax: zero price = zero tax',
        RentVsBuyCalc.calculatePurchaseTax(0, true) === 0);

    // ═══════════════════════════════════════
    // RentVsBuyCalc.simulate
    // ═══════════════════════════════════════
    const sim = RentVsBuyCalc.simulate(
        2000000, 500000, 4.5, 25, 3, 350, 250, true,
        5000, 3, 6, 10, 2, 1, 50000
    );
    assert('RvB simulate: returns buyTimeline of correct length',
        sim.buyTimeline.length === 10);
    assert('RvB simulate: returns rentTimeline of correct length',
        sim.rentTimeline.length === 10);
    assert('RvB simulate: purchaseTax is zero for single < threshold',
        sim.purchaseTax >= 0);

    // ═══════════════════════════════════════
    // PensionCalc.simulate
    // ═══════════════════════════════════════
    const pensionSim = PensionCalc.simulate(20000, 6, 6.5, 100000, 5, 2, 30);
    assert('Pension simulate: balance > initial savings',
        pensionSim.balance > 100000);
    assert('Pension simulate: timeline has 30 entries',
        pensionSim.timeline.length === 30);
    assert('Pension simulate: totalContributions > initial',
        pensionSim.totalContributions > 100000);
    assert('Pension simulate: balance > totalContributions (with positive return)',
        pensionSim.balance > pensionSim.totalContributions);

    // Edge case: zero salary
    const pensionZero = PensionCalc.simulate(0, 6, 6.5, 50000, 5, 0, 10);
    assert('Pension simulate: zero salary still grows from initial savings',
        pensionZero.balance > 50000);

    // ═══════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════
    const summary = document.getElementById('summary');
    const total = passed + failed;
    const allPass = failed === 0;
    summary.className = 'summary ' + (allPass ? 'all-pass' : 'has-fail');
    summary.textContent = `${passed}/${total} עברו ${allPass ? '✓' : `(${failed} נכשלו)`}`;
})();
