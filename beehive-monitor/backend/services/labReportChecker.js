// Lab report compliance checker — deterministic rule checks in code.
// As mandated by SIH PS 26021 & Execution Handoff (Constraint 3 & Touchpoint 4):
// "Numbers are checked in code, not by the model (e.g. comparing lab values to standards)."
// "Lab-report checker: deterministic rule check in code, SLM only phrases the explanation."
// Legal criteria: FSSAI Food Products Standards and Food Additives Regulations, 2011 (amended 2020),
// Regulation 2.8.3 Honey, and FSSAI Adulteration Direction 2020.

const FSSAI_STANDARDS = {
  moisture: {
    name: "Moisture content",
    unit: "%",
    min: null,
    max: 20.0,
    clause: "FSSAI Reg 2.8.3(1) Table 1 Item 2",
    riskOnViolation: "Moisture >20.0% enables osmophilic yeast fermentation (Zygosaccharomyces), causing sour ethanol/acetic spoilage.",
  },
  sucrose: {
    name: "Sucrose content",
    unit: "%",
    min: null,
    max: 5.0,
    clause: "FSSAI Reg 2.8.3(1) Table 1 Item 4",
    riskOnViolation: "Sucrose >5.0% indicates cane sugar or sugar beet syrup addition, or excessive sugar feeding during nectar flow.",
  },
  reducing_sugars: {
    name: "Apparent reducing sugars (Fructose + Glucose)",
    unit: "%",
    min: 65.0,
    max: null,
    clause: "FSSAI Reg 2.8.3(1) Table 1 Item 3",
    riskOnViolation: "Reducing sugars <65.0% indicates dilution or artificial non-floral syrup adulteration.",
  },
  fructose_glucose_ratio: {
    name: "Fructose / Glucose ratio (F/G)",
    unit: "ratio",
    min: 0.95,
    max: null,
    clause: "FSSAI Reg 2.8.3(1) Table 1 Item 5",
    riskOnViolation: "F/G ratio <0.95 indicates artificial glucose/dextrose-heavy syrup or premature crystallization risk.",
  },
  hmf: {
    name: "Hydroxymethylfurfural (HMF)",
    unit: "mg/kg",
    min: null,
    max: 80.0,
    clause: "FSSAI Reg 2.8.3(1) Table 1 Item 9 (Tropical Climate standard)",
    riskOnViolation: "HMF >80 mg/kg indicates thermal overheating (>45°C), prolonged high-temperature storage, or acid-hydrolyzed invert syrup.",
  },
  c4_sugars: {
    name: "C4 sugars (EA-IRMS isotope ratio)",
    unit: "%",
    min: null,
    max: 7.0,
    clause: "FSSAI Honey Direction 2020, Clause 3(c)",
    riskOnViolation: "C4 sugars >7.0% confirms adulteration with C4 photosynthetic plant syrups (corn syrup / cane sugar).",
  },
  smr: {
    name: "Specific Marker for Rice syrup (SMR)",
    unit: "detection",
    allowed: ["absent", "negative", "none", false],
    clause: "FSSAI Honey Direction 2020, Clause 3(a)",
    riskOnViolation: "SMR detected confirms adulteration with industrial clarified rice syrup.",
  },
  tmr: {
    name: "Trace Marker for Rice syrup (TMR)",
    unit: "detection",
    allowed: ["absent", "negative", "none", false],
    clause: "FSSAI Honey Direction 2020, Clause 3(b)",
    riskOnViolation: "TMR detected confirms trace marker residues of rice syrup adulteration.",
  },
};

function checkLabReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return { success: false, error: "Report payload must be an object with lab parameters" };
  }

  const results = [];
  const violations = [];
  let totalTested = 0;

  for (const [key, spec] of Object.entries(FSSAI_STANDARDS)) {
    if (!(key in report) || report[key] === null || report[key] === undefined || report[key] === "") {
      continue;
    }

    totalTested++;
    const val = report[key];

    if (spec.allowed) {
      const normalized = typeof val === "string" ? val.trim().toLowerCase() : val;
      const isAbsent = spec.allowed.includes(normalized);
      if (isAbsent) {
        results.push({
          parameter: key,
          name: spec.name,
          value: "Absent",
          requirement: "Must be Absent",
          clause: spec.clause,
          status: "PASS",
        });
      } else {
        const vItem = {
          parameter: key,
          name: spec.name,
          value: String(val),
          requirement: "Must be Absent",
          clause: spec.clause,
          status: "FAIL",
          risk: spec.riskOnViolation,
        };
        results.push(vItem);
        violations.push(vItem);
      }
      continue;
    }

    const numVal = Number(val);
    if (Number.isNaN(numVal)) {
      const vItem = {
        parameter: key,
        name: spec.name,
        value: val,
        requirement: "Numeric",
        clause: spec.clause,
        status: "FAIL",
        risk: `Invalid non-numeric value '${val}' submitted for quantitative parameter.`,
      };
      results.push(vItem);
      violations.push(vItem);
      continue;
    }

    let pass = true;
    let margin = null;

    if (spec.max !== null && numVal > spec.max) {
      pass = false;
      margin = `+${(numVal - spec.max).toFixed(2)} ${spec.unit} above limit`;
    }
    if (spec.min !== null && numVal < spec.min) {
      pass = false;
      margin = `-${(spec.min - numVal).toFixed(2)} ${spec.unit} below requirement`;
    }

    const reqStr = spec.min !== null && spec.max !== null
      ? `${spec.min} - ${spec.max} ${spec.unit}`
      : spec.max !== null
      ? `<= ${spec.max} ${spec.unit}`
      : `>= ${spec.min} ${spec.unit}`;

    const paramRes = {
      parameter: key,
      name: spec.name,
      value: numVal,
      unit: spec.unit,
      requirement: reqStr,
      clause: spec.clause,
      status: pass ? "PASS" : "FAIL",
    };

    if (!pass) {
      paramRes.margin = margin;
      paramRes.risk = spec.riskOnViolation;
      violations.push(paramRes);
    }
    results.push(paramRes);
  }

  if (totalTested === 0) {
    return { success: false, error: "No recognized FSSAI lab parameters provided in report" };
  }

  const compliant = violations.length === 0;
  const passedCount = totalTested - violations.length;

  let explanation = "";
  if (compliant) {
    explanation = `All ${totalTested} tested chemical and isotopic parameters strictly comply with FSSAI Honey Regulation 2.8.3 and the 2020 Adulteration Direction. Batch qualifies for commercial certification.`;
  } else {
    explanation = `Batch failed ${violations.length} of ${totalTested} tested parameters. Non-compliant: ${violations
      .map((v) => `${v.name} (${v.value} vs requirement ${v.requirement})`)
      .join("; ")}. Lot must be quarantined and rejected from consumer packaging.`;
  }

  return {
    success: true,
    compliant,
    verdict: compliant ? "COMPLIANT" : "NON_COMPLIANT",
    totalTested,
    passedCount,
    failedCount: violations.length,
    results,
    violations,
    explanation,
  };
}

module.exports = { checkLabReport, FSSAI_STANDARDS };
