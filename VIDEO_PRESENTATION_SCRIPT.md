# HoneyChain (Madhu Shakti) — Video Presentation Script
**SIH 2026 · Problem Statement ID: 26021 · Team: 125181 (BEE6)**  
**Target Duration:** 3 Minutes · Crisp, fast-paced walkthrough  

---

## ⚡ Demo Quick-Reference
- **App URL:** `http://localhost:5173`
- **Beekeeper Login:** Click `🐝 BEEKEEPER Rameshwar Patel` on `/account` (or `9876543210` / `Password@123`)
- **KVIC Officer Login:** Click `🏛️ KVIC OFFICER Aditya Verma` on `/account`
- **Consumer Passport URL:** `/verify/bf96bd5d51796503877bedaca34267e853533701d73a0031002a9406785c4022`

---

## ⏱️ Scene-by-Scene Script

### [0:00 – 0:25] Introduction & The Problem
- **Action:** Open home page (`/`). Point to title and language switcher (`[ 🌐 हिन्दी ]`).
- **Say:**  
  > "Namaste Evaluators. We are Team **125181 (BEE6)** presenting **HoneyChain** for Problem Statement **26021: Blockchain-based Honey Traceability**.  
  > Indian honey suffers from severe syrup adulteration, while rural beekeepers lack verifiable proof of origin. HoneyChain solves this with an **offline-first DAG blockchain** coupled with **Edge AI running on dead-cheap hardware** — a $4 ESP32 in the hive and a $30 Raspberry Pi node at village KVIC centres."

---

### [0:25 – 1:10] Rural Beekeeper: Genesis & Voice Harvest Logging
- **Action:**
  1. Go to `/account` $\to$ Click **`🐝 BEEKEEPER Rameshwar Patel`**.
  2. Click **Harvest Log** (`/ledger`).
  3. Show **`Registered Apiary (Genesis)`** card and click **`📱 Show Harvest QR`**.
  4. On the right, click sample voice query: `"12 kg mustard honey from hive 3"` $\to$ Click **Extract**.
- **Say:**  
  > "Logging in as beekeeper Rameshwar Patel, we see his clean **Harvest Logbook**.  
  > Every farmer starts with a cryptographic **Genesis Block (Block 0)** anchored to his Aadhaar KYC.  
  > In forest areas without internet, beekeepers wearing thick gloves can simply speak into our offline SLM. Our **Confirm-Before-Commit** protocol extracts the hive ID, weight, and flora for farmer verification before anything is signed.  
  > Clicking `Show QR` generates the offline token for village handoff."

---

### [1:10 – 1:55] KVIC Officer: Multi-Farmer DAG Pooling & Custody Flow
- **Action:**
  1. Go to `/account` $\to$ Click **`🏛️ KVIC OFFICER Aditya Verma`**.
  2. Click **Custody Ledger** (`/ledger`).
  3. Scroll to **Collective Pool (Stage 3′)** $\to$ Click **`# Proof Hash`** to expand the SHA-256 hash.
  4. Click **DAG Graph** (`/graph`) to show the visual convergence.
- **Say:**  
  > "Next, at the village collection centre, we switch to **Aditya Verma, KVIC Custody Officer**.  
  > In the real supply chain, honey doesn't travel in a single straight line — multiple smallholder harvests are combined.  
  > HoneyChain uses a **Multi-Parent Directed Acyclic Graph (DAG)**: harvests from three separate farmers merge into one 55-kilogram collective lot via deterministic hashing, with automated mass-balance checks to prevent dilution.  
  > Auditors can expand the full SHA-256 hash or inspect the live DAG graph at any time."

---

### [1:55 – 2:30] Edge AI on Cheap Hardware ($4 ESP32 + Safety Gateway)
- **Action:**
  1. Click **AI Lab** (`/diagnose`).
  2. Type *"kitna formic acid dalna hai?"* $\to$ Click **Ask Advisory** (shows red safety gate).
  3. Under FSSAI Compliance, click **"High Moisture (>20%)"** $\to$ Click **Evaluate** (shows FAIL).
- **Say:**  
  > "Our AI is built to run entirely on commodity edge devices:  
  > First, a $4 ESP32 runs an 8-kilobyte INT8 acoustic model directly on the crown board, detecting queenless colony distress with 95% accuracy offline.  
  > Second, our offline advisory uses a **Deterministic Safety Gate**: if a farmer asks for chemical pesticide dosages, the AI strictly refuses to hallucinate toxic milligrams and escalates to a certified veterinarian.  
  > Third, an automated FSSAI compliance checker verifies moisture and sugar limits before lab blocks can be minted."

---

### [2:30 – 3:00] Retail Consumer Purity Passport & Anti-Counterfeit
- **Action:**
  1. Open jar verify URL: `/verify/bf96bd5d5179...`
  2. Show green **Certified Pure Khadi Honey Passport**, NABL CBRTI lab stats, and DBT MSP guarantee.
  3. Scroll down to show **Register / Verify Store Purchase Bill**.
- **Say:**  
  > "Finally, when a consumer buys a jar at a Khadi Bhavan store and scans the QR code, they receive a **Certified Pure Honey Passport**.  
  > It proves the jar is genuine and frozen at retail, displays NABL lab results from CBRTI Pune confirming zero C3/C4 syrup adulteration, and verifies that the farmer received the ₹225/kg MSP via Aadhaar Direct Benefit Transfer.  
  > To stop QR photocopying fraud, our **Dual-Key Protocol** requires the paper receipt code to claim ownership."

---

### [3:00 – 3:15] Conclusion
- **Action:** Click **My Twin** (`/twin`) to show the end-to-end farm-to-spoon progress bar.
- **Say:**  
  > "HoneyChain protects honest Indian beekeepers, guarantees fair MSP, and gives consumers unshakeable trust in every jar of Khadi honey. Thank you!"

---

## 📋 Presenter Cue Card

| Time | Page | Key Words to Hit |
|---|---|---|
| **0:00** | `/` | PS 26021, Team 125181 (BEE6), Adulteration crisis, Offline DAG + Edge AI |
| **0:25** | `/account` $\to$ `/ledger` | Beekeeper Rameshwar, Genesis Block, Voice SLM, Confirm-Before-Commit, Offline QR |
| **1:10** | `/account` $\to$ `/ledger` $\to$ `/graph` | KVIC Officer Aditya, 3$\to$1 DAG Pooling, Mass-balance check, Proof Hash |
| **1:55** | `/diagnose` | $4 ESP32 Acoustic AI (95%), Level-0 Dosage Refusal, FSSAI Moisture Gate |
| **2:30** | `/verify/:hash` | Consumer Passport, CBRTI Pune 0% syrup, Aadhaar DBT MSP ₹225, Dual-Key |
| **3:00** | `/twin` | End-to-end digital twin, Impact, Thank you |
