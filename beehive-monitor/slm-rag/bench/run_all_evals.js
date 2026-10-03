// Master Evaluation Harness Runner for SIH 26021 SLM + RAG layer.
// Runs all standalone benchmark suites with zero dependencies and produces an executive summary.

const { spawnSync } = require("child_process");
const path = require("path");

const SUITES = [
  { name: "Advisory Core Harness (Slice 1)", file: "run_advisory_eval.js", expected: 10 },
  { name: "Advisory Adversarial & Security Harness", file: "run_advisory_brutal.js", expected: 18 },
  { name: "Router Whitelist & Schema Executor Harness", file: "run_executor_eval.js", expected: 16 },
  { name: "Deterministic FSSAI Lab Report Checker", file: "run_lab_report_eval.js", expected: 10 },
  { name: "Voice Harvest Extraction & Confirm-Gating (Slice 2)", file: "run_voice_harvest_eval.js", expected: 11 },
  { name: "50-Prompt Comprehensive Benchmark (eval_set.jsonl)", file: "run_50_eval_set.js", expected: 50 },
];


console.log("================================================================================");
console.log("     HONEYCHAIN SLM + RAG EVALUATION BENCHMARK SUITE (SIH 2026 PS 26021)       ");
console.log("================================================================================\n");

let grandTotal = 0;
let grandPassed = 0;
const results = [];

for (const suite of SUITES) {
  const filePath = path.join(__dirname, suite.file);
  const start = Date.now();
  const proc = spawnSync(process.execPath, [filePath], { encoding: "utf8" });
  const durationMs = Date.now() - start;
  const passed = proc.status === 0;

  if (passed) {
    grandPassed += suite.expected;
  }
  grandTotal += suite.expected;

  results.push({
    name: suite.name,
    file: suite.file,
    status: passed ? "PASS" : "FAIL",
    score: `${passed ? suite.expected : 0}/${suite.expected}`,
    durationMs,
  });

  console.log(`[${passed ? "OK" : "FAILED"}] ${suite.name} (${suite.expected} cases, ${durationMs}ms)`);
}

console.log("\n--------------------------------------------------------------------------------");
console.log(`SUMMARY: ${grandPassed}/${grandTotal} total cases pass (${Math.round((grandPassed / grandTotal) * 100)}%)`);
console.log("--------------------------------------------------------------------------------\n");

if (grandPassed !== grandTotal) {
  process.exit(1);
}
