# HoneyChain (Madhu Shakti) — Video Presentation Script
**Smart India Hackathon 2026 · Problem Statement ID: 26021 · Team: 125181 (BEE6)**  
**Target Duration:** ~3.5 Minutes (Clear, professional, human delivery)  

---

### 🎬 Quick Links & Credentials for Recording
- **Base URL:** `http://localhost:5173`
- **Beekeeper Login:** `9876543210` / `Password@123` *(or click `🐝 BEEKEEPER Rameshwar Patel` on `/account`)*
- **KVIC Officer Login:** `kvic.officer@kvic.gov.in` / `Password@123` *(or click `🏛️ KVIC OFFICER Aditya Verma` on `/account`)*
- **Consumer Passport URL:** `http://localhost:5173/verify/bf96bd5d51796503877bedaca34267e853533701d73a0031002a9406785c4022`

---

## 🎙️ Spoken Teleprompter Script

### [0:00 – 0:25] Opening & Problem
*(Screen: Home Page · `http://localhost:5173`)*

"Namaste Evaluators. We are Team **125181 (BEE6)**, presenting **HoneyChain** for Problem Statement **26021: Blockchain-based tracking of honey from source to retail.**

Commercial honey in India faces widespread adulteration with synthetic C3 and C4 syrups, while rural beekeepers operating in remote areas lack an auditable, verifiable record of origin. HoneyChain resolves this with an **offline-first Directed Acyclic Graph (DAG) blockchain** combined with **Edge AI on low-cost hardware**: an affordable ₹350 ESP32 acoustic sensor in the hive, and a ₹2,500 Raspberry Pi gateway node at village KVIC centres."

---

### [0:25 – 1:15] Rural Beekeeper: Genesis & Voice Harvest Logging
*(Screen: Log in as Rameshwar Patel → go to Harvest Log `/ledger`)*

"We begin at the apiary with our beekeeper, **Rameshwar Patel**.

His dashboard is streamlined for field operations. Every harvest is cryptographically anchored back to his **Genesis Block (Block 0)**, binding his verified Aadhaar KYC and apiary location.

When working in remote orchards without cellular connectivity, the farmer speaks naturally into our offline speech-to-JSON engine *(Click sample: '12 kg mustard honey from hive 3' → click Extract)*.

Through our **Confirm-Before-Commit** safety protocol, the beekeeper reviews the extracted weight, hive number, and floral variety before signing. Clicking **Show QR** *(Click Show Harvest QR)* generates the offline cryptographic custody token for village collection. And using our language toggle *(Click 🌐 हिन्दी)*, the entire interface immediately switches to Hindi."

---

### [1:15 – 2:05] KVIC Officer: Multi-Farmer DAG Pooling
*(Screen: Log in as Aditya Verma → Custody Ledger `/ledger`)*

"Next, the beekeeper delivers his harvested containers to the village KVIC centre. We switch to **Aditya Verma, KVIC Custody Officer**.

In authentic honey procurement, lots do not move in a single linear thread—multiple smallholder harvests converge into a single processing batch. Traditional linear blockchains cannot represent this without fragmenting provenance.

HoneyChain utilizes a **Multi-Parent DAG convergence**: notice how harvests from Rameshwar, Sunita Devi, and Vikram Singh merge into a single 55-kilogram **Collective Pool Block** *(Click # Proof Hash)* via deterministic hashing, strictly preserving mass balance. 

Every subsequent custody transfer—temperature-regulated transport, micro-filtration, and packaging—appends an immutable block. Evaluators can inspect the full parent-child provenance tree on the **DAG Graph** *(Click DAG Graph)*."

---

### [2:05 – 2:40] Edge AI on Low-Cost Hardware (₹350 ESP32 + Safety Gateway)
*(Screen: AI Lab `/diagnose`)*

"Our AI infrastructure operates without recurrent cloud subscriptions by utilizing accessible edge hardware:

First, an in-hive acoustic sensor running on a **₹350 ESP32 microcontroller** analyzes colony vibration frequencies every 4 seconds, detecting queenless distress with 95% accuracy offline.

Second, our offline advisory incorporates a **Deterministic Safety Gate**: if a farmer inquires about chemical pesticide dosages *(Type: 'kitna formic acid dalna hai?' → click Ask Advisory)*, the system refuses to suggest unverified dosages and automatically escalates to a certified veterinary officer.

Third, our automated **FSSAI Compliance Engine** *(Click 'High Moisture (>20%)' → click Evaluate)* verifies moisture and sugar limits before any laboratory certification block can be committed to the chain."

---

### [2:40 – 3:15] Retail Consumer Purity Passport
*(Screen: Open jar verify URL)*

"Finally, when a consumer purchases a jar of honey at Khadi Bhavan in New Delhi and scans the QR code, they receive the **Certified Pure Khadi Honey Passport**.

It confirms the jar is genuine and frozen at retail, preventing reuse. It presents accredited NABL test results from **CBRTI Pune**, certifying zero C4 corn sugar and zero C3 rice syrup adulteration. It also confirms that farmer Rameshwar Patel received the official Minimum Support Price of ₹225 per kilogram directly through an Aadhaar Direct Benefit Transfer escrow.

To protect against label counterfeiting, our **Dual-Key Protocol** requires the paper cashier receipt code to claim ownership—rendering photocopied QR codes invalid."

---

### [3:15 – 3:30] Conclusion
*(Screen: My Twin `/twin`)*

"HoneyChain bridges the gap between rural beekeepers and retail consumers. By integrating an offline-first DAG blockchain with low-cost edge intelligence, we eliminate adulteration, secure guaranteed MSP for farmers, and restore complete consumer trust in authentic Khadi honey.

Thank you!"
