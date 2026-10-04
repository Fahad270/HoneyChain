"""Stage-gate validator: seeds.jsonl (and later teacher synthetics) vs tool_schemas.json.
Stage 1 filter = parse (JSON) -> schema (this file) -> live execution (mock_tools.py).
Usage: python3 validate_traces.py seeds.jsonl [--strict]
Exit 0 iff all traces pass. Stdlib only. Status: NOT RUN locally (box shell down).
"""
import json
import sys
from mock_tools import execute, SCHEMAS


def check_trace(line, lineno):
    try:
        t = json.loads(line)
    except json.JSONDecodeError as e:
        return [f"line {lineno}: unparseable JSON: {e}"]
    errs = []
    for key in ("id", "user", "assistant"):
        if key not in t:
            errs.append(f"line {lineno}: missing key {key}")
    if errs:
        return errs
    if not isinstance(t["assistant"], list) or len(t["assistant"]) != 1:
        return [f"line {lineno}: assistant must be a 1-element call list (single-call-per-turn)"]
    call = t["assistant"][0]
    if set(call.keys()) != {"name", "arguments"}:
        return [f"line {lineno}: call must be exactly {{name, arguments}}"]
    ok, res = execute(call["name"], call["arguments"])
    if not ok:
        return [f"line {lineno}: execution failed: {res}"]
    return []


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "seeds.jsonl"
    total = failed = 0
    with open(path) as f:
        for i, line in enumerate(f, 1):
            if not line.strip():
                continue
            total += 1
            for e in check_trace(line, i):
                failed += 1
                print("FAIL " + e)
    print(f"{total - failed}/{total} traces pass")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
