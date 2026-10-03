// Eval harness for deterministic FSSAI lab report checker (Workstream D, Touchpoint 4).
// Runs standalone on Node with zero external deps.

const assert = require("assert");
const { checkLabReport } = require("../../backend/services/labReportChecker");

const TESTS = [
  {
    id: "clean-compliant-batch",
    report: {
      moisture: 18.2,
      sucrose: 3.1,
      reducing_sugars: 72.5,
      fructose_glucose_ratio: 1.15,
      hmf: 24.0,
      c4_sugars: 2.1,
      smr: "absent",
      tmr: "absent",
    },
    expectCompliant: true,
    expectViolations: 0,
  },
  {
    id: "high-moisture-fermentation-risk",
    report: {
      moisture: 22.4,
      sucrose: 2.8,
      reducing_sugars: 70.1,
      fructose_glucose_ratio: 1.12,
      hmf: 15.0,
    },
    expectCompliant: false,
    expectViolationParam: "moisture",
  },
  {
    id: "high-sucrose-cane-adulteration",
    report: {
      moisture: 17.5,
      sucrose: 8.5,
      reducing_sugars: 68.0,
      fructose_glucose_ratio: 1.05,
      hmf: 12.0,
    },
    expectCompliant: false,
    expectViolationParam: "sucrose",
  },
  {
    id: "overheated-high-hmf",
    report: {
      moisture: 18.0,
      sucrose: 1.5,
      reducing_sugars: 73.0,
      fructose_glucose_ratio: 1.1,
      hmf: 96.5,
    },
    expectCompliant: false,
    expectViolationParam: "hmf",
  },
  {
    id: "c4-corn-syrup-detected",
    report: {
      moisture: 18.0,
      c4_sugars: 14.5,
      smr: "absent",
      tmr: "absent",
    },
    expectCompliant: false,
    expectViolationParam: "c4_sugars",
  },
  {
    id: "smr-rice-syrup-detected",
    report: {
      moisture: 17.8,
      smr: "detected",
      tmr: "absent",
    },
    expectCompliant: false,
    expectViolationParam: "smr",
  },
  {
    id: "tmr-trace-marker-detected",
    report: {
      moisture: 17.8,
      smr: "absent",
      tmr: "present",
    },
    expectCompliant: false,
    expectViolationParam: "tmr",
  },
  {
    id: "low-fructose-glucose-ratio",
    report: {
      moisture: 18.0,
      reducing_sugars: 66.0,
      fructose_glucose_ratio: 0.88,
    },
    expectCompliant: false,
    expectViolationParam: "fructose_glucose_ratio",
  },
  {
    id: "empty-report-rejected",
    report: {},
    expectError: true,
  },
  {
    id: "invalid-type-rejected",
    report: "not an object",
    expectError: true,
  },
];

function run() {
  let passed = 0;
  for (const t of TESTS) {
    const res = checkLabReport(t.report);
    if (t.expectError) {
      assert.strictEqual(res.success, false, `${t.id}: should have failed with error`);
      console.log(`PASS ${t.id} -> correctly rejected empty/invalid payload`);
    } else {
      assert.strictEqual(res.success, true, `${t.id}: should succeed`);
      assert.strictEqual(res.compliant, t.expectCompliant, `${t.id}: compliant mismatch`);
      if (t.expectViolationParam) {
        const hasViol = res.violations.some((v) => v.parameter === t.expectViolationParam);
        assert.ok(hasViol, `${t.id}: expected violation for ${t.expectViolationParam}`);
      }
      console.log(`PASS ${t.id} -> compliant=${res.compliant}, failed=${res.failedCount}`);
    }
    passed++;
  }
  console.log(`\n${passed}/${TESTS.length} lab report eval cases pass\n`);
}

run();
