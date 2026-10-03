"""Build SimPO/ORPO preference pairs deterministically (no teacher, no human labels).
Chosen = golden call. Rejected = one of:
  R1 wrong-tool      (right slots, wrong tool — incl. v1/v2 observed failures)
  R2 invented-slot   (right tool, hallucinated hash/id/city/weight)
  R3 malformed       (unquoted keys / missing name — as v2 actually emitted)
Covers all 13 real tools + ask_clarify/refuse targets.
Usage: python3 gen_pref_pairs.py  -> pref_pairs.jsonl  (prompt/chosen/rejected)
"""
import json
import random

random.seed(5)
CAT = open("tool_schemas.json").read()
SYS = ("You are a tool router. Tools: get_hives(list hives), get_weather(apiary weather), "
       "verify_jar(hash: check jar QR), get_twin(id: trace honey), predict_yield(numbers: estimate kilos), "
       "search_schemes(query: subsidies), find_centre(city: KVIC centres), get_my_blocks(my ledger), "
       "log_extraction(hive_id,weight_kg):WRITE harvest, pool_lot(2+hashes):WRITE lot, "
       "log_stage(stage,prev_hash):WRITE hop, issue_sale(hash,channel):WRITE sale, file_rti(text):WRITE RTI, "
       "ask_clarify(missing slots), refuse(deny). Reply ONE JSON array [{name,arguments}].")

SEEDS = [json.loads(l) for l in open("seeds.jsonl")]
SHARDS = []
for fn in ("shard1_clean.jsonl", "shard2_clean.jsonl", "shard3_clean.jsonl", "shard4_clean.jsonl"):
    try:
        SHARDS += [json.loads(l) for l in open(fn)]
    except FileNotFoundError:
        pass
GOLD = SEEDS + SHARDS
print(f"golden pool: {len(GOLD)} (seeds {len(SEEDS)}, shards {len(SHARDS)})")

TOOLS = ["get_hives", "get_weather", "verify_jar", "get_twin", "predict_yield",
         "search_schemes", "find_centre", "get_my_blocks", "log_extraction",
         "pool_lot", "log_stage", "issue_sale", "file_rti", "ask_clarify", "refuse"]

JUNK_HASH = ["H5C4R7Q2N", "hash1", "abc123", "HIVE_123", "test123"]
JUNK_TOOL = ["check_honey", "get_hive", "verify", "log_honey", "pool"]


def r1_wrong_tool(call):
    others = [t for t in TOOLS if t != call["name"]]
    wrong = random.choice(others)
    return {"name": wrong, "arguments": call["arguments"]}


def r2_invented_slot(call):
    args = dict(call["arguments"])
    if not args:
        return {"name": call["name"], "arguments": {"hash": random.choice(JUNK_HASH)}}
    k = random.choice(list(args.keys()))
    args[k] = random.choice(JUNK_HASH)
    return {"name": call["name"], "arguments": args}


def r3_malformed(call):
    style = random.choice([0, 1, 2])
    inner = json.dumps(call["arguments"])
    if style == 0:
        return ("[{name:\"" + call["name"] + "\", arguments:" + inner + "}]", True)
    if style == 1:
        return ("[" + inner + "]", True)
    return ("{\"name\": \"" + call["name"] + "\"}", True)


pairs = []
for t in GOLD:
    user = t["user"]
    if not isinstance(user, str):
        continue
    chosen = t["assistant"]
    if not (isinstance(chosen, list) and len(chosen) == 1):
        continue
    call = chosen[0]
    kind = random.choice(["R1", "R1", "R2", "R2", "R3"])
    if kind == "R3":
        rej_str, _ = r3_malformed(call)
        pairs.append({"prompt": user, "system": SYS, "chosen": chosen, "rejected_str": rej_str})
    else:
        rej = r1_wrong_tool(call) if kind == "R1" else r2_invented_slot(call)
        pairs.append({"prompt": user, "system": SYS, "chosen": chosen, "rejected": [rej]})

print(f"pairs: {len(pairs)}")
with open("pref_pairs.jsonl", "w") as f:
    for p in pairs:
        f.write(json.dumps(p) + "\n")
print("wrote pref_pairs.jsonl")
