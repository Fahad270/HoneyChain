# HoneyChain (Madhu Shakti) — Official Video Presentation Script
**Smart India Hackathon 2026 · Problem Statement ID: 26021**  
**Team Number:** `125181` (Team BEE6)  
**Theme:** Blockchain-Based Honey Traceability, Multi-Stage Custody DAG & Edge AI on Dead-Cheap Hardware  
**Target Duration:** ~3.5 Minutes (Fast, dense, and cohesive)  

---

## 🎬 Recording Setup & Clear-Cut Credentials

1. **Local Servers Active:**
   - Backend API: `http://localhost:5000` (`node beehive-monitor/backend/server.js`)
   - Frontend UI: `http://localhost:5173` (`npm run dev`)
2. **One-Click Demo Credentials (Available directly on `/account`):**
   - **Login 1 (Beekeeper):** Rameshwar Patel · `9876543210` / `Password@123` (or click `🐝 BEEKEEPER Rameshwar Patel`)
   - **Login 2 (KVIC Officer):** Aditya Verma · `kvic.officer@kvic.gov.in` / `Password@123` (or click `🏛️ KVIC OFFICER Aditya Verma`)
   - **Public Consumer Jar QR Hash:** `bf96bd5d51796503877bedaca34267e853533701d73a0031002a9406785c4022`

---

## ⏱️ Video Breakdown (Total: 3 Minutes 30 Seconds)

```
[0:00 - 0:30]  Hook, Problem Statement 26021 & Solution Architecture
[0:30 - 1:15]  Step 1: Beekeeper Login & Offline Harvest Logbook (Voice SLM + Genesis Root)
[1:15 - 2:05]  Step 2: KVIC Officer Login & Blockchain Custody Ledger (3→1 Pooling DAG)
[2:05 - 2:40]  Step 3: Edge AI on Dead-Cheap Hardware ($4 ESP32 + $30 Raspberry Pi)
[2:40 - 3:15]  Step 4: Retail Consumer Purity Passport & Dual-Key Anti-Cloning
[3:15 - 3:30]  Conclusion & Impact
```

---

## 🕒 [0:00 – 0:30] Hook, Problem Statement 26021 & Architecture

### 🖥️ On Screen:
- Open browser to `http://localhost:5173/` showing the clean top header: **Madhu Shakti · HoneyChain · NBHM**.
- Point mouse to the Problem Statement title and the global language toggle `[ 🌐 हिन्दी ]`.

### 🎙️ Spoken Script:
> "Namaste Evaluators. We are Team **125181 (BEE6)**, presenting **HoneyChain** for Smart India Hackathon **Problem Statement 26021: Blockchain-based tracking of honey from source to retail.**
>
> Commercial honey in India faces a crisis of adulteration with synthetic C3 and C4 syrups. Meanwhile, rural beekeepers operating in forest dead zones get cheated by middlemen without a verifiable paper trail.
>
> HoneyChain solves this with an end-to-end cryptographic architecture:
> An **offline-first Directed Acyclic Graph (DAG) blockchain** that tracks honey through 10 custody stages, combined with **Edge AI running on dead-cheap hardware** — a $4 ESP32 acoustic sensor in the hive and a $30 Raspberry Pi node at the village KVIC centre.
>
> Let's demonstrate the live system step by step."

---

## 🕒 [0:30 – 1:15] Step 1: Rural Beekeeper Login & Harvest Logbook

### 🖥️ On Screen:
1. Navigate to `/account` (or click **Log in** in the navbar).
2. Click the quick button: **`🐝 BEEKEEPER Rameshwar Patel`** (or enter `9876543210` / `Password@123`).
3. Point out that the navbar immediately transforms to show `🐝 Beekeeper · Rameshwar` and links: `My Twin` · `Hives` · `Harvest Log` · `AI Lab`.
4. Click **Harvest Log** in the navbar (navigates to `/ledger`).
5. Show the clean **Harvest Logbook**:
   - Point out the top status: **`Apiary Logbook · Offline-Ready`** with the `🔄 Sync with KVIC Node` button.
   - Point out the entries: **`Registered Apiary (Genesis)`** with Rameshwar's masked Aadhaar KYC, and **`Honey Harvest (Hive HIVE-03 · 14.5 kg · Mustard · MSP ₹3,262.50)`**.
   - Click `📱 Show QR` on an entry to reveal the offline custody handoff QR code.
   - Click `[ 🌐 हिन्दी ]` in the navbar to demonstrate instant multilingual translation to Hindi, then click `[ 🌐 English ]` to return to clean English.
6. On the right sidebar, highlight **Voice Harvest Logging**:
   - Click the quick sample button `"12 kg mustard honey from hive 3"`.
   - Click **Extract** $\to$ Show the extracted slots (`Hive: HIVE-03`, `Weight: 12 kg`, `Flower: Mustard`). Explain **Confirm-Before-Commit**.

### 🎙️ Spoken Script:
> "We start at the apiary with our beekeeper, **Rameshwar Patel**, logging in via secure, server-enforced role credentials.
>
> Notice that the beekeeper's view is completely uncluttered by downstream supply chain jargon. He sees his **Harvest Logbook**:
> - Every harvest is cryptographically anchored back to his **Genesis Block (Step 1)**, which binds his verified Aadhaar KYC and apiary location.
> - The system operates **100% offline**. When working in remote orchards with thick gloves, the farmer speaks naturally into our on-device speech-to-JSON engine.
> - With our **Confirm-Before-Commit** safety protocol, the farmer reviews the extracted weight and hive before signing.
> - Clicking `Show QR` generates the offline cryptographic handoff token. Notice our global language toggle: with one tap, the entire interface switches between English and Hindi."

---

## 🕒 [1:15 – 2:05] Step 2: KVIC Officer Login & Blockchain Custody Ledger (3→1 Pooling DAG)

### 🖥️ On Screen:
1. Navigate to `/account` and click **`🏛️ KVIC OFFICER Aditya Verma`** (or enter `kvic.officer@kvic.gov.in` / `Password@123`).
2. Show the top navbar transform to `🏛️ KVIC · Aditya` and links: `Custody Ledger` · `DAG Graph` · `Hives` · `Centres`.
3. Click **Custody Ledger** (`/ledger`).
4. Point out the full 10-hop blockchain custody flow:
   - *Collection (KVIC) $\to$ Collective Pool $\to$ Transport $\to$ Processing & QC $\to$ CBRTI NABL Lab $\to$ Packaging $\to$ Retail*.
5. Highlight the **3→1 DAG Convergence Point (Collective Pool Block `2f2d569d83...`)**:
   - Point out that 3 separate farmers' batches (Rameshwar Patel 14.5kg, Sunita Devi 22kg, Vikram Singh 18.5kg) merge into one 55kg cooperative lot.
   - Click the **`👁️ Hash`** button next to the block hash to show it expanding smoothly into the full 64-character SHA-256 string.
6. Click **DAG Graph** in the navbar (`/graph`) to briefly show the interactive visual tree of parent and child block edges.

### 🎙️ Spoken Script:
> "Now, the beekeeper brings his honey cans to the village KVIC centre. We switch to **Aditya Verma, KVIC Custody Officer**.
>
> Here, the full power of our **Directed Acyclic Graph (DAG) blockchain** comes alive:
> - Real honey doesn't move in a single straight line. Multiple farmers contribute to a collective lot. Traditional blockchains cannot represent this without fragmenting data.
> - HoneyChain uses a **multi-parent DAG convergence**: notice how harvests from Rameshwar, Sunita Devi, and Vikram Singh converge at Stage 3′ into a single 55kg **Collective Pool Block** via our deterministic `pooledHash` algorithm, strictly conserving mass balance.
> - Every custody transfer — from temperature-controlled transport to micro-filtration — appends an immutable block.
> - Click `👁️ Hash`, and the full 64-character SHA-256 hash expands for transparent auditor verification."

---

## 🕒 [2:05 – 2:40] Step 3: Edge AI on Dead-Cheap Hardware

### 🖥️ On Screen:
1. Click **AI Lab** in the navbar (`/diagnose`).
2. Show Section 1 (Field Advisory):
   - Type in the prompt: *"kitna formic acid dalna hai?"* and click **Ask Advisory**.
   - Show the instant **Level 0 Deterministic Safety Gate** rejecting the query and escalating to certified Krishi Vigyan Kendra veterinarians.
3. Show Section 2 (FSSAI Lab Compliance Checker):
   - Click the preset **"High Moisture (>20%)"** $\to$ Click **Evaluate Compliance** $\to$ Shows instant red **FAIL / Fermentation Risk** rejection.
   - Click preset **"Pure Honey (Pass)"** $\to$ Shows green **COMPLIANT** badge.

### 🎙️ Spoken Script:
> "Now, how does our AI work without expensive cloud subscriptions?
> We designed our AI models to run on **dead-cheap edge hardware**:
>
> 1. **In-Hive Acoustic Sensor ($4 ESP32-S3):** Mounted on the crown board, an 8 Kilobyte INT8 TensorFlow Lite model analyzes worker bee hum vibrations every 4 seconds. It detects queenless distress with **95% accuracy** with zero internet connection.
> 2. **Offline Disease Advisory:** Uses local, extractive knowledge cards in under 2 megabytes of browser storage. Notice our **Deterministic Safety Gate**: if someone asks for chemical pesticide dosages, the AI strictly refuses to hallucinate toxic milligrams and escalates to a veterinary officer.
> 3. **FSSAI Compliance Engine:** Evaluates moisture and HMF limits deterministically before lab blocks can be minted onto the blockchain."

---

## 🕒 [2:40 – 3:15] Step 4: Retail Consumer Purity Passport & Dual-Key Anti-Cloning

### 🖥️ On Screen:
1. Navigate to:  
   `http://localhost:5173/verify/bf96bd5d51796503877bedaca34267e853533701d73a0031002a9406785c4022`
2. Show the clean **Certified Pure Khadi Honey Passport**:
   - Green Header: `🏛️ KVIC Honey Mission · Ministry of MSME, Govt. of India`
   - Stamp: `✓ 100% PURE HONEY · AUTHENTICITY GUARANTEED`
   - Status Pills: `✓ Genuine HoneyChain Verified` · `Frozen at Retail` · `Purchased at Khadi Gramodyog Bhavan, Connaught Circus`
   - Product Grid: Monofloral Mustard, Harvested by Rameshwar Patel (Alwar, Rajasthan), 500g Glass Jar.
   - **4 Pillars of CBRTI Lab Quality:** Moisture 18.2% (Pass), C4 Corn Sugar (Negative), C3 Rice Syrup (Negative), HMF 14.2 mg/kg.
   - **Direct Benefit Transfer (DBT) Guarantee:** Beekeeper paid official Minimum Support Price (₹225/kg) directly via Aadhaar DBT escrow.
   - **5-Step Farm-to-Spoon Timeline.**
3. Click the bottom accordion **`🔐 Register / Verify Store Purchase Bill`**:
   - Show the **Dual-Key Claim Form**: Public QR on jar + Private secret key from cashier receipt prevents photocopied QR code fraud.

### 🎙️ Spoken Script:
> "Finally, let's step into the shoes of a consumer buying a jar of honey at Khadi Gramodyog Bhavan in New Delhi.
>
> When the consumer scans the jar's QR code, they don't see technical blockchain clutter — they land on the **Certified Pure Khadi Honey Passport**:
> - It confirms the honey is **100% genuine and frozen at retail**, meaning this batch is locked and cannot be reused.
> - It displays official NABL test results from the **Central Bee Research & Training Institute in Pune**: confirming zero C4 corn sugar and zero C3 rice syrup adulteration.
> - It proves fair trade: the consumer can verify that farmer Rameshwar Patel received the official Minimum Support Price of ₹225/kg through an Aadhaar Direct Benefit Transfer escrow.
> - And to stop label counterfeiting, our **Dual-Key Protocol** requires the paper cashier receipt code to claim ownership. Photocopied QR codes trigger an instant red duplicate scan alert."

---

## 🕒 [3:15 – 3:30] Conclusion & Impact

### 🖥️ On Screen:
- Click **My Twin** in the top navbar (`/twin`) to show the farmer's complete end-to-end digital twin journey bar (10/10 hops completed).

### 🎙️ Spoken Script:
> "To conclude:
> HoneyChain bridges the gap between rural beekeepers and modern retail shelves.
> By combining an offline-first Directed Acyclic Graph blockchain with edge AI on affordable microcontrollers, we eliminate syrup adulteration, empower smallholder beekeepers with guaranteed MSP, and give Indian consumers complete faith in every drop of Khadi honey.
>
> Thank you!"

---

## 📌 Video Delivery Summary for the Presenter

| Timestamp | Screen URL | Action & Key Words |
|---|---|---|
| **0:00 – 0:30** | `/` (Home) | PS 26021, Team Number, Adulteration Problem, Offline DAG + Edge AI |
| **0:30 – 1:15** | `/account` $\to$ `/ledger` | Login as Rameshwar Patel (Beekeeper), Harvest Logbook, Voice SLM, Language Toggle |
| **1:15 – 2:05** | `/account` $\to$ `/ledger` | Login as Aditya Verma (KVIC), 10-hop Custody Ledger, 3→1 Pooling DAG, Expandable Hashes |
| **2:05 – 2:40** | `/diagnose` (AI Lab) | $4 ESP32 Acoustic AI (95%), Level 0 Dosage Safety Gate, FSSAI Moisture Checker |
| **2:40 – 3:15** | `/verify/:hash` | Consumer Purity Passport, CBRTI Pune NABL Results, DBT MSP ₹225/kg, Dual-Key Anti-Cloning |
| **3:15 – 3:30** | `/twin` (My Twin) | End-to-end Digital Twin provenance, Fair Trade, Conclusion |
