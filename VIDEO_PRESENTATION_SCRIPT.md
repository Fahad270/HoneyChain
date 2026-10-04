# HoneyChain (Madhu Shakti) — Video Presentation Script
**Smart India Hackathon 2026 · Problem Statement ID: 26021 · Team: 125181 (BEE6)**  
**Target Duration:** ~3.5 Minutes (Fast, natural, human delivery)  

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

Commercial honey in India faces rampant adulteration with synthetic C3 and C4 syrups, while rural beekeepers operating in forest dead zones get cheated without a verifiable paper trail. HoneyChain solves this with an **offline-first Directed Acyclic Graph (DAG) blockchain** coupled with **Edge AI running on dead-cheap hardware**: a $4 ESP32 acoustic sensor in the hive, and a $30 Raspberry Pi node at the village KVIC centre."

---

### [0:25 – 1:15] Rural Beekeeper: Genesis & Voice Harvest Logging
*(Screen: Log in as Rameshwar Patel → go to Harvest Log `/ledger`)*

"We start at the apiary with our beekeeper, **Rameshwar Patel**.

His view is completely uncluttered. Every harvest is cryptographically anchored back to his **Genesis Block (Block 0)**, which binds his verified Aadhaar KYC and apiary location.

When working in remote orchards with thick gloves and no internet, the farmer speaks naturally into our offline speech-to-JSON engine *(Click sample: '12 kg mustard honey from hive 3' → click Extract)*.

With our **Confirm-Before-Commit** safety protocol, the farmer reviews the extracted weight, hive ID, and flower type before signing. Clicking **Show QR** *(Click Show Harvest QR)* generates the offline cryptographic token for village collection. And with our language toggle *(Click 🌐 हिन्दी)*, the entire interface instantly switches to Hindi."

---

### [1:15 – 2:05] KVIC Officer: Multi-Farmer DAG Pooling
*(Screen: Log in as Aditya Verma → Custody Ledger `/ledger`)*

"Now, the beekeeper brings his honey cans to the village KVIC centre. We switch to **Aditya Verma, KVIC Custody Officer**.

Real honey doesn't travel in a single straight line. Multiple farmers contribute to a collective lot. Traditional blockchains cannot represent this without fragmenting data.

HoneyChain uses a **Multi-Parent DAG convergence**: notice how harvests from Rameshwar, Sunita Devi, and Vikram Singh merge into a single 55kg **Collective Pool Block** *(Click # Proof Hash)* via deterministic hashing, strictly conserving mass balance. 

Every subsequent custody transfer—transport, processing, and packaging—appends an immutable block. We can also view the visual parent-child tree at any time on the **DAG Graph** *(Click DAG Graph)*."

---

### [2:05 – 2:40] Edge AI on Dead-Cheap Hardware ($4 ESP32 + Safety Gate)
*(Screen: AI Lab `/diagnose`)*

"How does our AI work without expensive cloud subscriptions? It runs on dead-cheap edge hardware:

First, an in-hive acoustic sensor on a **$4 ESP32** analyzes worker bee hum vibrations every 4 seconds, detecting queenless colony distress with 95% accuracy offline.

Second, our offline advisory uses a **Deterministic Safety Gate**: if a farmer asks for chemical pesticide dosages *(Type: 'kitna formic acid dalna hai?' → click Ask Advisory)*, the model strictly refuses to hallucinate toxic milligrams and escalates to a certified veterinarian.

Third, our automated **FSSAI Compliance Engine** *(Click 'High Moisture (>20%)' → click Evaluate)* checks moisture and sugar limits before lab blocks can ever be minted."

---

### [2:40 – 3:15] Retail Consumer Purity Passport
*(Screen: Open jar verify URL)*

"Finally, when a consumer buys a jar of honey at Khadi Bhavan in New Delhi and scans the QR code, they land on the **Certified Pure Khadi Honey Passport**.

It confirms the jar is genuine and frozen at retail, meaning this batch cannot be reused. It displays official NABL test results from **CBRTI Pune** confirming zero C4 corn sugar and zero C3 rice syrup adulteration. It verifies that farmer Rameshwar Patel received the official MSP of ₹225/kg via an Aadhaar Direct Benefit Transfer escrow.

And to stop label counterfeiting, our **Dual-Key Protocol** requires the paper cashier receipt code to claim ownership—preventing photocopied QR code fraud."

---

### [3:15 – 3:30] Conclusion
*(Screen: My Twin `/twin`)*

"HoneyChain bridges the gap between rural beekeepers and modern retail shelves. By combining an offline-first DAG blockchain with edge AI on affordable microcontrollers, we eliminate adulteration, guarantee MSP to farmers, and give consumers complete faith in every drop of Khadi honey.

Thank you!"
