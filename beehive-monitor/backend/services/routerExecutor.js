// Router executor — the structural backstop behind ANY router model.
// A finetuned SLM (or any LLM) proposes; THIS decides what runs.
// Rules (all deterministic, all in code):
//  1. Unknown tool name -> ask_clarify (never execute, never invent).
//  2. Malformed envelope (not a 1-element [{name, arguments}]) -> ask_clarify.
//  3. Schema violations (missing/extra/wrong-typed args, minItems, enum) -> ask_clarify naming the slot.
//  4. WRITE tools are staged as needs_confirm (the UI confirm gate + server JWT re-check own the commit).
//  5. Dosage/drug questions never reach here (pre-LLM router refuses first), but a
//     proposed call whose args mention chemicals is refused anyway (defense in depth).

const SCHEMAS = require("../data/routerSchemas");

function validateCall(call) {
  if (!call || typeof call !== "object" || Array.isArray(call)) {
    return { ok: false, reason: "call must be an object {name, arguments}" };
  }
  const keys = Object.keys(call).sort().join(",");
  if (keys !== "arguments,name") {
    return { ok: false, reason: "call must be exactly {name, arguments}" };
  }
  const spec = SCHEMAS[call.name];
  if (!spec) {
    return { ok: false, unknownTool: call.name, reason: `unknown tool '${call.name}'` };
  }
  const args = call.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, reason: "arguments must be an object" };
  }
  const props = spec.parameters.properties || {};
  for (const req of spec.parameters.required || []) {
    if (!(req in args)) return { ok: false, reason: `missing required slot '${req}' for ${call.name}`, missing: [req] };
  }
  for (const [k, v] of Object.entries(args)) {
    const p = props[k];
    if (!p) return { ok: false, reason: `unknown slot '${k}' for ${call.name}` };
    const t = p.type;
    const good =
      (t === "string" && typeof v === "string") ||
      (t === "number" && typeof v === "number") ||
      (t === "integer" && Number.isInteger(v)) ||
      (t === "array" && Array.isArray(v)) ||
      (t === "object" && v && typeof v === "object" && !Array.isArray(v));
    if (!good) return { ok: false, reason: `slot '${k}' must be ${t}` };
    if (t === "array" && v.length < (p.minItems || 0)) {
      return { ok: false, reason: `slot '${k}' needs >=${p.minItems} items` };
    }
    if (p.enum && !p.enum.includes(v)) {
      return { ok: false, reason: `slot '${k}' must be one of ${p.enum.join(",")}` };
    }
    if (/terramycin|oxytet|tylosin|amitraz|acaricide|antibiotic|formic|oxalic|thymol/i.test(String(v))) {
      return { ok: false, refused: true, reason: "chemical/drug content is never routed to execution" };
    }
  }
  return { ok: true };
}

// propose: raw model output (string or object). Returns an execution verdict the
// orchestrator can act on without further model judgement.
function executePropose(proposed) {
  let call = proposed;
  if (typeof proposed === "string") {
    const m = proposed.match(/\[[\s\S]*\]/);
    if (!m) return { verdict: "clarify", reason: "no JSON call found in model output" };
    try {
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr) || arr.length !== 1) {
        return { verdict: "clarify", reason: "exactly one call per turn" };
      }
      call = arr[0];
    } catch {
      return { verdict: "clarify", reason: "model output is not parseable JSON" };
    }
  }
  const v = validateCall(call);
  if (!v.ok) {
    if (v.refused) return { verdict: "refuse", reason: v.reason };
    return { verdict: "clarify", reason: v.reason, missing: v.missing || [], unknownTool: v.unknownTool || null };
  }
  const spec = SCHEMAS[call.name];
  if (spec.write) return { verdict: "confirm", call };
  return { verdict: "execute", call };
}

module.exports = { validateCall, executePropose };
