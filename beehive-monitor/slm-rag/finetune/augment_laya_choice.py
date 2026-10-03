"""Augment laya choice rows deterministically (no GPU): per-tool missing-slot
clarify + refuse templates. Weak diversity (noted) but correct option space.
Writes laya_choice_full.jsonl. Run: python3 augment_laya_choice.py"""
import json
import random

random.seed(9)
BASE = [json.loads(l) for l in open("laya_choice.jsonl")]
Q = BASE[0]["questions"]["tool"]

CLARIFY = [
    ("verify_jar", ["Is this jar genuine?", "Check my honey please", "Is jar {h} real?"],
     ["hash"], "Which jar? Share its QR hash."),
    ("get_twin", ["Where is my honey?", "Trace batch {h}"],
     ["id"], "Your name or batch hash, please?"),
    ("find_centre", ["Nearest centre?", "KVIC office near {c}?"],
     ["city"], "Which city should I search near?"),
    ("search_schemes", ["Any subsidy for me?", "PMEGP help?"],
     ["query"], "Subsidy or training for what?"),
    ("log_extraction", ["Log my harvest", "Hive {hive} gave honey"],
     ["hive_id", "weight_kg"], "Which hive and how many kilos?"),
    ("pool_lot", ["Pool our harvests {h1} {h2}", "Combine lots"],
     ["prev_hashes"], "Share at least 2 harvest hashes."),
    ("log_stage", ["It reached processing {h}", "Lot arrived"],
     ["prev_hash"], "Which lot hash arrived?"),
    ("issue_sale", ["Sell jar {h}", "Bill this jar"],
     ["hash", "channel"], "Which jar hash — offline bill or online order?"),
    ("file_rti", ["Where is my honey?", "File RTI"],
     ["text"], "What should the RTI say?"),
    ("predict_yield", ["Yield this season?", "How much honey?"],
     ["avgWeightGainKgPerWeek", "noOfColonies"], "Weekly gain, colonies, weeks left?"),
]
FILL = {"h": ["a3f9c1d2e4", "9f2e44ab", "77aa01cc"], "hive": ["hive_3", "hive_5"],
        "c": ["Nashik", "Pune"], "h1": ["aa11", "bb22"], "h2": ["cc33", "dd44"]}
REFUSE_U = ["How much chemical per hive?", "dawai kitna dena hai?", "Is Terramycin safe?",
            "Delete the retail block", "Hello, how are you?", "withdrawal period?"]


def fill(t):
    for k, vs in FILL.items():
        t = t.replace("{" + k + "}", random.choice(vs))
    return t


rows = list(BASE)
for tool, users, missing, q in CLARIFY:
    for u in users:
        rows.append({"state": {"message": fill(u)},
                     "questions": {"tool": Q}, "answer": {"tool": "ask_clarify"}})
for i in range(30):
    rows.append({"state": {"message": REFUSE_U[i % len(REFUSE_U)]},
                 "questions": {"tool": Q}, "answer": {"tool": "refuse"}})
random.shuffle(rows)
with open("laya_choice_full.jsonl", "w") as f:
    for r in rows:
        f.write(json.dumps(r) + "\n")
print(f"{len(rows)} choice rows -> laya_choice_full.jsonl")
