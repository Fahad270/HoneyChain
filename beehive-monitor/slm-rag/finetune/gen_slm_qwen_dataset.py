#!/usr/bin/env python3
"""
Generate comprehensive, balanced Qwen2.5-0.5B fine-tuning dataset
for HoneyChain Tool Routing & Information Extraction (Slot Filling).
Integrates:
- 1,403 verified seed shards from slm-rag/finetune/shard*.jsonl
- Rich conversational Hinglish, Hindi, and English voice harvest logging utterances
- Dialectal numbers: bara, barah, chaar, panch, gyarah, bees, etc.
- Prepositional origins: 'from 3', '3 se', 'chaar number peti'
- Missing slot clarification & safety refusals
- Strict ChatML envelope with 1-element JSON array format.
"""

import json
import os
import random

SYSTEM_PROMPT = """You are HoneyChain's private on-device tool router and slot extractor. You have access to the following tools:
- get_hives: List beekeeper's hives
- get_weather: Weather context for apiary
- verify_jar(hash): Verify honey jar QR against blockchain
- get_twin(id): Trace beekeeper harvest journey by ID or hash
- predict_yield(avgWeightGainKgPerWeek, avgTempC, avgHumidityPct, season, noOfColonies, weeksRemainingInSeason): Formula yield estimate
- search_schemes(query, language): Search KVIC, PMEGP, and NBHM schemes
- find_centre(city): Find KVIC / Khadi / bee centres near a city
- get_my_blocks: Personal journey blocks
- log_extraction(hive_id, weight_kg, flower_source, date): Log honey harvest (requires hive_id, weight_kg)
- pool_lot(prev_hashes): Merge 2+ farmer harvest hashes into cooperative lot
- log_stage(stage, prev_hash, data): Supply chain stage (transport, processing, packaging, distribution, retail)
- issue_sale(hash, channel, billNo, orderId): Register sale
- file_rti(text): File RTI query
- ask_clarify(missing, question): Ask user for missing required arguments
- refuse(reason): Refuse disallowed actions, chemical/dosage queries, or out-of-scope requests

Respond ONLY with a 1-element JSON array containing the tool call: [{"name": "...", "arguments": {...}}]."""

NUM_WORDS = {
    1: ["1", "one", "ek", "एक"],
    2: ["2", "two", "do", "दो"],
    3: ["3", "three", "teen", "तीन"],
    4: ["4", "four", "chaar", "char", "चार"],
    5: ["5", "five", "paanch", "panch", "पांच"],
    6: ["6", "six", "chhe", "che", "छह"],
    7: ["7", "seven", "saat", "सात"],
    8: ["8", "eight", "aath", "आठ"],
    9: ["9", "nine", "nau", "नौ"],
    10: ["10", "ten", "das", "दस"],
    11: ["11", "eleven", "gyarah", "gyara", "ग्यारह"],
    12: ["12", "twelve", "barah", "bara", "बारह"],
    13: ["13", "thirteen", "terah", "तेरह"],
    14: ["14", "fourteen", "chaudah", "चौदह"],
    15: ["15", "fifteen", "pandrah", "पंद्रह"],
    16: ["16", "sixteen", "solah", "सोलह"],
    18: ["18", "eighteen", "athrah", "अठारह"],
    20: ["20", "twenty", "bees", "बीस"],
    25: ["25", "twenty five", "pachees", "पच्चीस"],
    30: ["30", "thirty", "tees", "तीस"],
}

FLOWERS = [
    ("mustard", ["mustard", "sarson", "सरसों"]),
    ("litchi", ["litchi", "lychee", "लीची"]),
    ("eucalyptus", ["eucalyptus", "safeda", "सफेदा"]),
    ("sunflower", ["sunflower", "surajmukhi", "सूरजमुखी"]),
    ("acacia", ["acacia", "kikar", "कीकर"]),
    ("jamun", ["jamun", "जामुन"]),
    ("multifloral", ["multifloral", "jungle", "forest", "जंगली"]),
]

CITIES = [
    ("Nagpur", ["Nagpur", "nagpur", "नागपुर"]),
    ("Pune", ["Pune", "pune", "पुणे"]),
    ("Nashik", ["Nashik", "nashik", "नासिक"]),
    ("Indore", ["Indore", "indore", "इंदौर"]),
    ("Bhopal", ["Bhopal", "bhopal", "भोपाल"]),
    ("Jaipur", ["Jaipur", "jaipur", "जयपुर"]),
    ("Lucknow", ["Lucknow", "lucknow", "लखनऊ"]),
    ("Dehradun", ["Dehradun", "dehradun", "देहरादून"]),
    ("Chandigarh", ["Chandigarh", "chandigarh", "चंडीगढ़"]),
    ("Patna", ["Patna", "patna", "पटना"]),
    ("Ranchi", ["Ranchi", "ranchi", "रांची"]),
    ("Shimla", ["Shimla", "shimla", "शिमला"]),
]

def generate_voice_harvest_samples(n=350):
    samples = []
    # Templates for natural colloquial voice harvest
    templates = [
        # Colloquial Hinglish (like user's utterance)
        ("aaj {w_str} kg honey tha from {h_str}", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        ("aaj {h_str} se {w_str} kilo shahad nikala", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        ("kal {h_str} number peti se {w_str} kg {fl_str} nikala tha", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "yesterday"}),
        ("{h_str} peti se {w_str} kilo {fl_str} honey", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "today"}),
        ("peti number {h_str} se {w_str} kilo nikla", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        ("{h_str} se {w_str} kg", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        # English natural
        ("Log {w_str} kilos of {fl_str} honey from hive {h_str} today", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "today"}),
        ("Recorded {w_str} kg {fl_str} from box {h_str}", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "today"}),
        ("Hive {h_str} produced {w_str} kg {fl_str} honey", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "today"}),
        ("Harvested {w_str} kg from hive {h_str} yesterday", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "yesterday"}),
        ("We collected {w_str} kilos from {h_str}", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        # Devanagari Hindi
        ("बॉक्स {h_str} से {w_str} किलो {fl_str} का शहद निकाला", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "{fl_norm}", "date": "today"}),
        ("पेटी {h_str} से {w_str} किग्रा शहद प्राप्त हुआ", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        ("आज {h_str} नंबर पेटी से {w_str} किलो", "log_extraction", {"hive_id": "HIVE-{h_pad}", "weight_kg": "{w_val}", "flower_source": "multifloral", "date": "today"}),
        # Missing slots -> clarify
        ("Log {w_str} kilos of honey today", "ask_clarify", {"missing": ["hive_id"], "question": "Which hive did you harvest the honey from?"}),
        ("Extracted {w_str} kg {fl_str}", "ask_clarify", {"missing": ["hive_id"], "question": "Please specify which hive ID was harvested."}),
        ("Harvested from hive {h_str}", "ask_clarify", {"missing": ["weight_kg"], "question": "How many kilos of honey were harvested from hive {h_str}?"}),
        ("Log harvest from box {h_str} today", "ask_clarify", {"missing": ["weight_kg"], "question": "What was the harvest weight in kg for box {h_str}?"}),
        ("आज पेटी {h_str} से शहद निकाला", "ask_clarify", {"missing": ["weight_kg"], "question": "पेटी {h_str} से कितने किलो शहद निकाला गया?"}),
    ]

    for _ in range(n):
        tmpl, tool, args_tmpl = random.choice(templates)
        h_num = random.choice([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        w_num = random.choice([4, 6, 8, 10, 12, 14, 15, 18, 20, 25])
        fl_norm, fl_variants = random.choice(FLOWERS)
        
        h_str = random.choice(NUM_WORDS.get(h_num, [str(h_num)]))
        w_str = random.choice(NUM_WORDS.get(w_num, [str(w_num)]))
        fl_str = random.choice(fl_variants)
        h_pad = f"{h_num:02d}"

        u_text = tmpl.format(h_str=h_str, w_str=w_str, fl_str=fl_str)
        
        args = {}
        for k, v in args_tmpl.items():
            if isinstance(v, str):
                v_fmt = v.format(h_pad=h_pad, w_val=w_num, fl_norm=fl_norm, h_str=h_str)
                if k == "weight_kg":
                    args[k] = float(v_fmt)
                else:
                    args[k] = v_fmt
            else:
                args[k] = v
        
        samples.append({
            "user": u_text,
            "assistant": [{"name": tool, "arguments": args}]
        })
    return samples

def generate_centre_samples(n=100):
    samples = []
    templates = [
        ("Where is the nearest KVIC bee centre in {city}?", "find_centre"),
        ("Find bee training center near {city}", "find_centre"),
        ("{city} me KVIC center kaha hai?", "find_centre"),
        ("{city} ke pass khadi bee institution batao", "find_centre"),
        ("{city} में मधुमक्खी पालन केंद्र कहाँ है?", "find_centre"),
        ("Show government bee development centres in {city}", "find_centre"),
    ]
    for _ in range(n):
        c_norm, c_vars = random.choice(CITIES)
        c_str = random.choice(c_vars)
        tmpl, tool = random.choice(templates)
        samples.append({
            "user": tmpl.format(city=c_str),
            "assistant": [{"name": tool, "arguments": {"city": c_norm}}]
        })
    return samples

def generate_safety_refusals(n=80):
    samples = []
    cases = [
        ("How much amitraz should I put in hive 2 for varroa mites?", "Veterinary chemicals and acaricide dosages cannot be given by AI. Please consult an authorized veterinary extension officer or KVK scientist."),
        ("What dosage of oxytetracycline should I give for European foulbrood?", "Antibiotic dosages for honeybees are strictly regulated. Consult a registered bee veterinary doctor."),
        ("Give me the formula and ratio for mixing formic acid for brood treatment", "Chemical fumigants carry high queen toxicity risks. Please consult local government apiculture advisory."),
        ("Kitna terramycin dalna hai peti me?", "दवा या केमिकल की खुराक AI से नहीं दी जा सकती। कृपया कृषि विज्ञान केंद्र (KVK) के विशेषज्ञ से संपर्क करें।"),
        ("Can you transfer 5000 rupees from my bank account?", "Financial transfers are outside HoneyChain's scope. I can help with hive logs, ledger blocks, and KVIC schemes."),
        ("Write me a poem about butterflies", "I am a dedicated beekeeping and honey ledger assistant. I can help with hive health, harvest logging, and scheme info."),
    ]
    for _ in range(n):
        q, reason = random.choice(cases)
        samples.append({
            "user": q,
            "assistant": [{"name": "refuse", "arguments": {"reason": reason}}]
        })
    return samples

def build_full_dataset():
    random.seed(42)
    finetune_dir = "/home/RatAnon/HoneyChain/beehive-monitor/slm-rag/finetune"
    
    # 1. Load existing shards
    existing = []
    for sname in ["shard1_clean.jsonl", "shard2_clean.jsonl", "shard3_clean.jsonl", "shard4_clean.jsonl", "seeds.jsonl"]:
        spath = os.path.join(finetune_dir, sname)
        if os.path.exists(spath):
            with open(spath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            d = json.loads(line)
                            if "user" in d and "assistant" in d:
                                existing.append({"user": d["user"], "assistant": d["assistant"]})
                        except:
                            pass
    
    print(f"Loaded {len(existing)} existing shard traces.")

    # 2. Generate augmented voice harvest samples
    harvest_samples = generate_voice_harvest_samples(400)
    print(f"Generated {len(harvest_samples)} voice harvest samples.")

    # 3. Generate centre lookup samples
    centre_samples = generate_centre_samples(100)
    print(f"Generated {len(centre_samples)} centre lookup samples.")

    # 4. Generate safety refusals
    refusal_samples = generate_safety_refusals(80)
    print(f"Generated {len(refusal_samples)} safety refusal samples.")

    # Combine all
    all_samples = existing + harvest_samples + centre_samples + refusal_samples
    random.shuffle(all_samples)
    print(f"Total raw samples: {len(all_samples)}")

    # Convert to ChatML format
    chatml_data = []
    for item in all_samples:
        chatml_data.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": item["user"]},
                {"role": "assistant", "content": json.dumps(item["assistant"], ensure_ascii=False)}
            ]
        })

    # Train / Val split (85% train, 15% val)
    split_idx = int(len(chatml_data) * 0.85)
    train_data = chatml_data[:split_idx]
    val_data = chatml_data[split_idx:]

    out_train = "/tmp/qwen_slm_train.jsonl"
    out_val = "/tmp/qwen_slm_val.jsonl"

    with open(out_train, "w", encoding="utf-8") as f:
        for ex in train_data:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    with open(out_val, "w", encoding="utf-8") as f:
        for ex in val_data:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"Dataset generated:")
    print(f"  Train: {len(train_data)} examples -> {out_train}")
    print(f"  Val:   {len(val_data)} examples -> {out_val}")

if __name__ == "__main__":
    build_full_dataset()
