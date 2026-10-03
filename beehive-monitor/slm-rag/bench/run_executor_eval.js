// Executor harness — proves the whitelist without any model.
// node slm-rag/bench/run_executor_eval.js
const { executePropose } = require("../../backend/services/routerExecutor");

const CASES = [
  { id: "valid-read", in: '[{"name":"verify_jar","arguments":{"hash":"a3f9c1d2e4"}}]', want: "execute" },
  { id: "valid-write", in: '[{"name":"log_extraction","arguments":{"hive_id":"hive_3","weight_kg":12}}]', want: "confirm" },
  { id: "invented-tool", in: '[{"name":"check_honey","arguments":{"hive_id":"HIVE_123"}}]', want: "clarify" },
  { id: "malformed-unquoted", in: '[{name:"verify_jar", arguments:{hash:"x"}}]', want: "clarify" },
  { id: "malformed-noname", in: '[{"hash":"a3f9c1d2e4","arguments":{}}]', want: "clarify" },
  { id: "missing-slot", in: '[{"name":"verify_jar","arguments":{}}]', want: "clarify" },
  { id: "extra-slot", in: '[{"name":"verify_jar","arguments":{"hash":"x","dose":"5ml"}}]', want: "clarify" },
  { id: "wrong-type", in: '[{"name":"log_extraction","arguments":{"hive_id":"hive_3","weight_kg":"twelve"}}]', want: "clarify" },
  { id: "pool-single", in: '[{"name":"pool_lot","arguments":{"prev_hashes":["abc123"]}}]', want: "clarify" },
  { id: "bad-enum", in: '[{"name":"issue_sale","arguments":{"hash":"cc11dd","channel":"telepathy"}}]', want: "clarify" },
  { id: "chemical-arg", in: '[{"name":"log_stage","arguments":{"stage":"processing","prev_hash":"p","note":"add Terramycin"}}]', want: "clarify" },
  { id: "prose-no-json", in: 'I think you should check the honey', want: "clarify" },
  { id: "two-calls", in: '[{"name":"get_hives","arguments":{}},{"name":"get_weather","arguments":{}}]', want: "clarify" },
  { id: "object-not-array", in: '{"name":"get_hives","arguments":{}}', want: "clarify" },
  { id: "null", in: null, want: "clarify" },
];

let pass = 0;
for (const c of CASES) {
  let got;
  try {
    got = executePropose(c.in).verdict;
  } catch (e) {
    got = "THREW:" + e.message;
  }
  const ok = got === c.want;
  if (ok) pass++;
  console.log((ok ? "PASS" : "FAIL") + " " + c.id + " -> " + got);
}
// chemical-arg expects clarify (unknown slot 'note'); the drug-name rule is an extra net:
const drug = executePropose('[{"name":"search_schemes","arguments":{"query":"buy amitraz strips"}}]');
console.log((drug.verdict === "refuse" ? "PASS" : "FAIL") + " drug-query-refuse -> " + drug.verdict);
if (drug.verdict === "refuse") pass++;
console.log(`${pass}/${CASES.length + 1} executor cases pass`);
process.exit(pass === CASES.length + 1 ? 0 : 1);
