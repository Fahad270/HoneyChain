"""Mock tool-backend for Colab Stage-1 3-stage filter (parse -> schema -> LIVE execution).
Every real tool executes against fixtures and returns (ok, result|error).
Pseudo-tools (ask_clarify, refuse) are orchestrator-level: executing them is a
pass (they are valid router outputs, handled outside the backend).
Stdlib only.
"""
import json

with open("tool_schemas.json") as f:
    SCHEMAS = {t["name"]: t for t in json.load(f)["tools"]}

FIXTURES = {
    "hives": [{"hive_id": "hive_3", "health": "healthy"}, {"hive_id": "hive_5", "health": "attention"}],
    "weather": {"temp_c": 34, "humidity_pct": 58, "note": "monsoon: curing slows, keep supers dry"},
    "jars": {"a3f9c1d2e4": {"valid": True, "frozen": True}},
    "blocks": {"mined": 3},
    "centres": {"nashik": {"name": "KVIC Nashik", "city": "Nashik"}},
}


def _check_args(name, args):
    schema = SCHEMAS[name]["parameters"]
    for req in schema.get("required", []):
        if req not in args:
            return f"missing required arg: {req}"
    props = schema.get("properties", {})
    for k, v in args.items():
        if k not in props:
            return f"unknown arg: {k}"
        t = props[k].get("type")
        if t == "string" and not isinstance(v, str):
            return f"arg {k} must be string"
        if t == "number" and not isinstance(v, (int, float)):
            return f"arg {k} must be number"
        if t == "integer" and not isinstance(v, int):
            return f"arg {k} must be integer"
        if t == "array" and not isinstance(v, list):
            return f"arg {k} must be array"
        if t == "object" and not isinstance(v, dict):
            return f"arg {k} must be object"
        if t == "array" and len(v) < props[k].get("minItems", 0):
            return f"arg {k} needs >={props[k]['minItems']} items"
        if "enum" in props[k] and v not in props[k]["enum"]:
            return f"arg {k} must be one of {props[k]['enum']}"
    return None


def execute(name, args):
    """Returns (ok: bool, result: dict)."""
    if name not in SCHEMAS:
        return False, {"error": f"unknown tool: {name}"}
    if name in ("ask_clarify", "refuse"):
        err = _check_args(name, args)
        return (err is None), ({"pseudo": name} if err is None else {"error": err})
    err = _check_args(name, args)
    if err:
        return False, {"error": err}
    if name == "get_hives":
        return True, {"hives": FIXTURES["hives"]}
    if name == "get_weather":
        return True, FIXTURES["weather"]
    if name == "verify_jar":
        j = FIXTURES["jars"].get(args["hash"])
        return True, dict(j) if j else {"valid": False, "reason": "hash not found"}
    if name == "get_twin":
        return True, {"query": args["id"], "journey_blocks": 4, "current": "processing"}
    if name == "predict_yield":
        base = args.get("avgWeightGainKgPerWeek", 0.5) * args.get("weeksRemainingInSeason", 10) * args.get("noOfColonies", 1)
        return True, {"predictedYieldKg": round(base, 2), "formula": True}
    if name == "search_schemes":
        return True, {"query": args["query"], "cards": ["PMEGP beekeeping subsidy card"]}
    if name == "find_centre":
        c = FIXTURES["centres"].get(args["city"].lower())
        return True, dict(c) if c else {"city": args["city"], "note": "no centre listed; nearest cluster officer assigned"}
    if name == "get_my_blocks":
        return True, {"blocks": FIXTURES["blocks"]["mined"], "scope": "role-scoped"}
    if name == "log_extraction":
        return True, {"staged": True, "needs_confirm": True, "stage": "honey_extraction"}
    if name == "pool_lot":
        return True, {"staged": True, "needs_confirm": True, "parents": len(args["prev_hashes"])}
    if name == "log_stage":
        return True, {"staged": True, "needs_confirm": True}
    if name == "issue_sale":
        return True, {"staged": True, "needs_confirm": True}
    if name == "file_rti":
        return True, {"filed": True, "id": "RTI-MOCK-001"}
    return False, {"error": "no mock implementation"}


if __name__ == "__main__":
    n = ok = 0
    for tool in SCHEMAS:
        n += 1
        good_args = {"hash": "a3f9c1d2e4", "id": "x", "query": "q", "city": "Nashik",
                     "hive_id": "hive_3", "weight_kg": 1, "prev_hashes": ["a", "b"],
                     "stage": "transport", "prev_hash": "p", "channel": "offline",
                     "text": "t", "missing": ["hive_id"], "question": "q?",
                     "reason": "r"}
        req = SCHEMAS[tool]["parameters"].get("required", [])
        args = {k: good_args[k] for k in req}
        passed, _ = execute(tool, args)
        ok += passed
        print(("PASS " if passed else "FAIL ") + tool)
    print(f"{ok}/{n} mock tools execute")
