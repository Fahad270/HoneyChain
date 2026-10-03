"""Convert HoneyChain golden traces -> laya finetune choice format.
Input : slm-rag/finetune/seeds.jsonl (+ shard*_clean.jsonl when present, e.g. next GPU session)
Output: slm-rag/finetune/laya_choice.jsonl rows {state, questions.tool, answer}
A laya `choice` question = {type, instructions, criteria{option: description}}.
The 15 router tools become the option set; ask_clarify/refuse stay options
(they are valid router outputs). Dosage/drug rows map to refuse targets.
Status: converter WRITTEN; conversion NOT RUN against shards (shard files live
on Drive from the Colab session — pull them into finetune/ first).
"""
import json
import os

DESCRIPTIONS = {
    "get_hives": "list hives and their health status",
    "get_weather": "apiary weather and climate context",
    "verify_jar": "check whether a jar QR hash is genuine",
    "get_twin": "trace where a harvest or beekeeper honey is now",
    "predict_yield": "estimate honey yield in kilos from hive numbers",
    "search_schemes": "KVIC/PMEGP/NBB subsidies and eligibility",
    "find_centre": "locate a KVIC/Khadi centre in a city",
    "get_my_blocks": "my own ledger journey",
    "log_extraction": "record a harvest just made (WRITE)",
    "pool_lot": "combine harvest hashes into one lot (WRITE, KVIC)",
    "log_stage": "record a lot arriving at a stage (WRITE, KVIC)",
    "issue_sale": "register sale of a jar (WRITE, KVIC retail)",
    "file_rti": "ask where collected honey went (WRITE)",
    "ask_clarify": "needed details are missing — ask the user",
    "refuse": "request outside role or policy — refuse with reason",
}

TOOL_QUESTION = {
    "type": "choice",
    "instructions": "Which single tool handles `message`? If required details are missing, pick ask_clarify. If outside role/policy, pick refuse.",
    "criteria": DESCRIPTIONS,
}


def convert(trace):
    user = trace.get("user")
    calls = trace.get("assistant")
    if not isinstance(user, str) or not (isinstance(calls, list) and len(calls) == 1):
        return None
    name = calls[0].get("name")
    if name not in DESCRIPTIONS:
        return None
    return {
        "state": {"message": user},
        "questions": {"tool": TOOL_QUESTION},
        "answer": {"tool": name},
    }


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    inputs = [os.path.join(here, "seeds.jsonl")]
    for i in (1, 2, 3, 4):
        p = os.path.join(here, f"shard{i}_clean.jsonl")
        if os.path.exists(p):
            inputs.append(p)
    rows, skipped = [], 0
    for path in inputs:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = convert(json.loads(line))
                if row is None:
                    skipped += 1
                else:
                    rows.append(row)
    out = os.path.join(here, "laya_choice.jsonl")
    with open(out, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"converted {len(rows)} rows -> {out} (skipped {skipped})")


if __name__ == "__main__":
    main()
