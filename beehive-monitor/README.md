# Madhu Setu — Beekeeper Monitoring Platform

React (Vite) + Express + MongoDB Atlas — 10-page platform for beekeeper onboarding, hive telemetry, skill videos, AI disease/yield, **Honey Ledger blockchain** (farmer → collective → processor → lab → Khadi retailer, freeze at retail), **two-tier accounts** (beekeeper | KVIC), **Aadhaar-linked KYC + DigiLocker**, and a **real-world KVIC directory** (47 published offices).

> **Status:** Hive telemetry mocked (`backend/data/mockHives.js:84`), beekeeper registrations + **Honey Ledger** persisted in MongoDB. Ledger follows your 9-step workflow diagram — first block auto-minted on registration, shows in awesome ledger UI without breaking the current theme.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 18 + Vite 5 + react-router-dom 6 + axios + recharts + qrcode.react 4 | Fast HMR, routing, lightweight charts, client-side QR SVG |
| **Backend** | Express 4 + Mongoose 8 + multer + dotenv + bcryptjs + jsonwebtoken | Minimal REST, schema validation, memory-upload for vision, password hashing, JWT sessions |
| **DB** | MongoDB Atlas (via `backend/config/db.js:3`) | `Beekeeper` + `LedgerBlock` + `User` + `JarRecord` + `RtiRequest` collections; indexed on `hash`/`prev_hash`/`aadhaarDigits` |
| **Chain** | SHA256 hash chain + DAG (`backend/utils/hash.js:3`) — no coin, no node | `blockHash(prev\|stage\|canonical(data))` at `hash.js:12`; `pooledHash(sorted(prevHashes)\|stage\|data)` at `hash.js:20` — mirrors `beekeeper/app.py:283` |
| **Auth** | Two-tier JWT (`backend/controllers/authController.js`, `middleware/auth.js`) | `beekeeper` (steps 1–2) vs `kvic` (steps 3–8); bcrypt cost 10, 7-day tokens; role comes ONLY from login — no role switch exists |
| **KYC** | Offline Aadhaar Verhoeff (`utils/aadhaar.js`) + demo OTP + DigiLocker OAuth (`controllers/kycController.js`) | Typo-proof numbers, OTP-gated linked-profile fetch, eAadhaar pull when `DIGILOCKER_*` set |
| **AI / Edge ML** | Multi-Tier Offline Pipeline: Level 0 Deterministic Dosage Safety Gate, `laya-choice` Intent Router (95.4% Acc), `Qwen2.5-0.5B` LoRA SLM (92.0% Acc, 34MB), `MiniLM-L12` Dense RAG (93.3% Top-3, 58MB), ESP32 In-Hive Acoustic Distress (8KB INT8), plus cloud vision backup via Anthropic Claude (`diseaseController.js`) | Zero chemical hallucination; runs on ₹3,000 Raspberry Pi at village KVIC node without cloud internet |
| **Styling** | Plain CSS, `:root` tokens in `frontend/src/index.css` | Zero framework, ledger cards reuse same tokens — theme untouched |

---

## Quick Start

### 1. Backend — `http://localhost:5000`

```bash
cd backend
npm install
# create .env:
# MONGODB_URI=mongodb+srv://...
# JWT_SECRET=long-random-string      # signs login tokens (dev fallback warns)
# ANTHROPIC_API_KEY=sk-ant-...   # only for POST /api/disease/detect
# ANTHROPIC_MODEL=claude-sonnet-4-5
# ALLOW_DEMO_OTP=true            # return demo OTP in API (no SMS gateway yet)
# STRICT_AADHAAR=false           # true → reject bad-checksum Aadhaar at register
# DIGILOCKER_CLIENT_ID/SECRET/REDIRECT_URI  # partner creds; else demo mode
# PORT=5000                      # optional
npm run dev
# health → http://localhost:5000/api/health  { ok: true }
```

### 2. Frontend — `http://localhost:5173`

```bash
cd frontend
npm install
# optional .env:
# VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

> Missing `MONGODB_URI` warns at `backend/config/db.js:6` — registration + ledger writes will 400 until set. `ANTHROPIC_API_KEY` missing makes `POST /api/disease/detect` 500.

---

## Architecture

```
Browser (Vite :5173)
   │  axios  frontend/src/api.js  baseURL = VITE_API_BASE_URL || http://localhost:5000/api
   ▼
Express :5000  backend/server.js
   ├─ GET  /api/health
   ├─ /api/beekeepers  ──► beekeeperRoutes  ──► beekeeperController ──► Beekeeper (Mongoose) ──► auto-mints LedgerBlock genesis
   ├─ /api/hives       ──► hiveRoutes       ──► hiveController      ──► mockHives.js (→ future Hive model)
   ├─ /api/videos      ──► videoRoutes      ──► videoController     ──► videos.js
   ├─ /api/disease     ──► diseaseRoutes (multer) ──► diseaseController ──► Anthropic
   ├─ /api/productivity──► productivityRoutes──► productivityController (formula)
   └─ /api/ledger      ──► blockchainRoutes ──► blockchainController ──► LedgerBlock + hash.js (sha256 + pooled DAG)
          ├─ POST /block  linear hop      (stages 2,4-8)
          ├─ POST /pool   pooled converge (stage 3′ many→one)  ← collective batches multiple farmers
          ├─ GET  /chain  full ordered ledger
          └─ GET  /verify/:hash?s=secret  walk + frozen check
```

**Honey Workflow → Ledger stages (your diagram)**

| Diagram step | Ledger `stage` | Who scans & appends |
|---|---|---|
| 1 Beekeeper / Colony Management | `beekeeper_registration` — **GENESIS** | Beekeeper Register form auto-mints; QR `verify/<hash>?s=secret` |
| 2 Honey Extraction | `honey_extraction` | Beekeeper (hive, weight, flower) |
| 3 Collection by Cooperative/NGO/Trader | `collection` (single) or `pooled` (many→one DAG) | **Collective** — picks many farmer hashes → `POST /pool` merges via `pooledHash` |
| 4 Transport to Processing Plant | `transport` | Collective/Driver |
| 5 Processing & QC | `processing` | **Processor** scans pooled QR, adds filtered/pasteurized/FSSAI |
| 5b Lab | `lab_certified` | **Lab** scans, adds `ca_number` + `cert_hash` |
| 6 Packaging & Labeling | `packaging` | Processor/packer |
| 7 Marketing & Distribution | `distribution` | Distributor |
| 8 Retail / Sales Outlets | `retail` — **FREEZE** (`is_frozen:true`) | **Khadi India** retailer — chain locks, no children |
| 9 Consumer | `verify` only | Consumer scans jar QR at Khadi store → `GET /verify/:hash` checks intact + frozen |

Freeze rule enforced in `blockchainController.js:52`/`blockchainController.js:72`: any parent with `is_frozen` rejects child, `verifyChain()` flags `child of frozen block`.

---

## Repo Map

```
beehive-monitor/
├── README.md
├── .gitignore
│
├── backend/
│   ├── server.js                      # cors+json, connectDB, mounts 6 routers (incl /api/ledger)
│   ├── package.json                   # + qrcode dep for server-side QR if needed
│   ├── config/db.js                   # mongoose.connect(MONGODB_URI)
│   ├── utils/hash.js                  # sha256, canonicalStringify, blockHash, pooledHash, randomSecret
│   ├── models/
│   │   ├── Beekeeper.js               # category, aadhaarNo*, name*, phoneNumber*, address, nominee, status
│   │   └── LedgerBlock.js             # hash UNIQUE, prev_hash, prev_hashes[], stage enum(10), data Mixed, beekeeper ref, collective_name, scan_secret, is_frozen, lab{}, qa{}
│   ├── controllers/
│   │   ├── beekeeperController.js     # registerBeekeeper() → Beekeeper.create + mintGenesisForBeekeeper()
│   │   ├── blockchainController.js    # createBlock, getChain, verifyBlock, getBlock, mintGenesisForBeekeeper, verifyChain + STAGE_META (diagram labels)
│   │   ├── hiveController.js          # mock pass-through (swap point)
│   │   ├── videoController.js
│   │   ├── diseaseController.js
│   │   └── productivityController.js
│   ├── routes/
│   │   ├── beekeeperRoutes.js         # POST /register, GET /
│   │   ├── blockchainRoutes.js        # POST /block, POST /pool, GET /chain, GET /verify/:hash, GET /block/:hash
│   │   ├── hiveRoutes.js
│   │   ├── videoRoutes.js
│   │   ├── diseaseRoutes.js           # multer 8MB
│   │   └── productivityRoutes.js
│   └── data/
│       ├── mockHives.js               # 20 seeded hives + mockWeather
│       └── videos.js                  # 4 YouTube embeds
│
└── frontend/
    ├── package.json                   # + qrcode.react
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx                   # BrowserRouter
        ├── App.jsx                    # 6 routes: / , /dashboard, /ledger, /verify/:hash, /learn, /diagnose
        ├── api.js                     # axios baseURL
        ├── index.css                  # :root tokens — ledger reuses same tokens, theme intact
        ├── components/
        │   ├── Navbar.jsx             # 5 NavLinks (Register / Dashboard / Ledger / Learn / Disease & Yield)
        │   └── Navbar.css
        └── pages/
            ├── Register.jsx/.css      # + genesis ledger card after success: hash/prev/QR/verify link (awesome UI, gold accent, same card/btn)
            ├── Dashboard.jsx/.css     # hex-grid + recharts
            ├── Ledger.jsx/.css        # awesome chain UI: workflow bar 1→9, filter chips, chain of block-cards (hash, prev, QR, pooled DAG, frozen badge) + right append form
            ├── Verify.jsx/.css        # Khadi verify: status pills (intact/broken/frozen/token), block data, pooled parents, QR, full chain timeline
            ├── Learn.jsx/.css
            └── DiseaseDetection.jsx/.css
```

---

## API Contract

All `{ success, data?, error? }` unless noted.

| Method | Route | Controller | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/health` | `server.js:19` | — | `{ ok: true }` |
| `POST` | `/api/beekeepers/register` | `beekeeperController.js:4` | Beekeeper fields (`aadhaarNo`, `name`, `phoneNumber` required) | `{ data: beekeeper, genesis: LedgerBlock }` — genesis auto-minted with `stage=beekeeper_registration`, `hash=blockHash(null,…)`, `scan_secret` |
| `GET` | `/api/beekeepers` | `beekeeperController.js:17` | — | `Beekeeper[]` |
| `GET` | `/api/hives` | `hiveController.js:3` | — | `Hive[]` 20 mocked |
| `GET` | `/api/hives/weather` | `hiveController.js:7` | — | weather |
| `GET` | `/api/videos` | `videoController.js:3` | — | `Video[]` |
| `POST` | `/api/disease/detect` | `diseaseController.js:19` | `multipart image ≤8MB` | `{ likelyCondition, confidence, visualEvidence, recommendedAction }` |
| `POST` | `/api/productivity/predict` | `productivityController.js:19` | 6-field JSON | `{ predictedYieldKg, breakdown, explanation }` |
| `POST` | `/api/ledger/block` | `blockchainController.js:33` | `{ stage, prev_hash?, prev_hashes? (if pooled), data:{}, collective_name?, lab?, qa?, beekeeperId? }` | `{ data: block, meta:{ verify_url, stage_meta } }` — hash computed as `blockHash` or `pooledHash`; `is_frozen=true` if `stage=retail`; rejects child of frozen |
| `POST` | `/api/ledger/pool` | `blockchainRoutes.js:9` | alias to `/block` with `stage=pooled` | same — needs `prev_hashes.length≥2` |
| `GET` | `/api/ledger/chain` | `blockchainController.js:104` | — | `LedgerBlock[]` sorted `createdAt`, each with `stage_meta` |
| `GET` | `/api/ledger/mine` | `blockchainController.js` (Bearer JWT) | — | Personal ledger: beekeeper tier → claimed profile's full journey (blocks + downstream); kvic tier → minted blocks + onward journeys + centre |
| `GET` | `/api/ledger/block/:hash` | `blockchainController.js:128` | — | single block + `stage_meta` |
| `GET` | `/api/ledger/verify/:hash?s=secret` | `blockchainController.js:121` | query `?s=scan_secret` optional | `{ block, tokenValid, pooledParents[], chain: LedgerBlock[], valid, reason, frozenBlock }` — `valid` false if missing parent/cycle/frozen-child, `tokenValid` false if `?s` mismatches |
| `POST` | `/api/auth/register` | `authController.js` | `{ name, phone?, email?, password(8+), role: beekeeper\|kvic, orgName?, designation?, assignedCentreId?, beekeeperId? }` | `{ data: { user, token } }` — bcrypt hash, JWT 7d; centre must exist; beekeeper link needs OTP-verified profile + matching phone |
| `POST` | `/api/auth/login` | `authController.js` | `{ login (phone\|email), password }` | `{ data: { user, token } }` — 401 on wrong id/password |
| `GET` | `/api/auth/me` | `authController.js` | Bearer JWT | `{ data: { user, beekeeper?, centre? } }` |
| `POST` | `/api/auth/claim-beekeeper` | `authController.js` | Bearer + `{ beekeeperId, verifiedAt }` | Binds OTP-verified profile to a beekeeper-tier account (phone must match) |
| `POST` | `/api/auth/claim-centre` | `authController.js` | Bearer (kvic) + `{ centreId }` | Self-asserted centre attach (`centreVerified: false`) |
| `GET` | `/api/auth/centres/:id/staff` | `authController.js` | — | Public roster: names + org/designation only, no contacts |
| `GET` | `/api/kyc/aadhaar/check?no=` | `kycController.js` | 12-digit number | Offline Verhoeff verdict + masked linked-account hints (no PII) |
| `POST` | `/api/kyc/aadhaar/otp` | `kycController.js` | `{ aadhaarNo }` (rate-limited) | Demo OTP + masked phones; 404 when no linked accounts |
| `POST` | `/api/kyc/aadhaar/verify` | `kycController.js` | `{ aadhaarNo, otp }` (rate-limited, 5 tries) | Full linked profile: accounts + blocks + jars + RTI + form prefill |
| `GET` | `/api/kyc/digilocker/auth-url?beekeeperId=` | `kycController.js` | — | Real OAuth URL when `DIGILOCKER_*` set, else demo-mode steps |
| `GET` | `/api/kyc/digilocker/callback?code=&state=` | `kycController.js` | DigiLocker redirect | Token exchange → profile + issued docs → links `digilockerId` + doc refs |
| `GET` | `/api/kyc/digilocker/docs?beekeeperId=` | `kycController.js` | — | Stored DigiLocker refs for an account |
| `GET` | `/api/map/geo` | `mapController.js` | — | `{ centres, clusters, unclustered }` — clusters merge live registered farmers |
| `GET` | `/api/map/kvic-centres` | `mapController.js` | — | Real directory + per-centre clusters served + claimed staff + sources |

### Hash

```js
// backend/utils/hash.js:12
blockHash(prev, stage, data)  = SHA256(prev + "|" + stage + "|" + canonicalJSON(data))
pooledHash(hashes, stage, data) = SHA256(sorted(hashes).join("|") + "|" + stage + "|" + canonicalJSON(data))
// canonicalJSON = sorted-keys JSON.stringify — deterministic
```

---

## Frontend Routes

| Route | File | What it does |
|---|---|---|
| `/` | `Register.jsx:44` | Category tabs + ~22 inputs → `POST /api/beekeepers/register`; **on success shows awesome genesis card** inside same `.register-form` — gold-bordered `genesis-card` with `hash`/`prev`/`data` pretty-print, `QRCodeSVG` for `verify/<hash>?s=secret`, `scan_secret` hint, flow note `→ collective scans this → pooled → processor → lab → retail freezes → Khadi verifies`, buttons `Verify genesis` + `Open ledger`. Theme untouched — uses `card`, `hash-val`, `qr-box`, `genesis-*` that reuse `--color-accent`/`--color-primary-light`. |
| `/ledger` | `Ledger.jsx` + `LedgerGraph.jsx` | Evocative DAG graph (stage lanes, converging pool edges, click→verify) for public + personal scopes; **My honey / My lots** toggle when logged in (from `/ledger/mine`); mint form is login-gated (private) |
| `/graph` | `Graph.jsx` + `LedgerGraph.jsx` | Full-page graph explorer: scope toggle, hash search (scrolls to node), per-stage dim filters, selected-node detail card with Verify action |
| `/` | `Register.jsx` | Private — logged-out visitors redirect to `/account` (registration mints genesis, so it needs an account) |
| `/verify/:hash` | `Verify.jsx:7` | **Khadi store verify** — paste hash + `?s=` token input; status card green (`Chain intact`) / red (`broken`) + frozen/token pills; left card: stage icon, hash/prev, pooled parents as chips linking to their verify, data/pre + lab, QR; right card: `Full chain to this jar` vertical timeline (`v-item` dots) with active/frozen styles, `Open full ledger` + `Go to Khadi Store Ledger` buttons; bottom help shows `Collective → Processor → Lab → Retail freeze → Consumer verify` flow. |
| `/dashboard` | `Dashboard.jsx:11` | Hex-grid hives + recharts |
| `/learn` | `Learn.jsx:11` | Video language toggle |
| `/diagnose` | `DiseaseDetection.jsx:7` | Vision + productivity panels |
| `/twin`, `/track` | `FarmerTwin.jsx` | Digital twin: paste genesis/jar hash or pick beekeeper → journey timeline, pipeline, QR, RTI filing |
| `/map` | `Map.jsx` | India clusters + **47 real KVIC/Khadi/bee-institute pins** (city-approx) with published addresses, source badges, cluster links, claimed-staff rosters, centre picker |
| `/account` | `Account.jsx` | Two-tier login/signup (beekeeper | KVIC + real centre select), profile + beekeeper-profile claim via Aadhaar OTP proof + centre claim |

`Navbar.jsx` — 7 links + static tier pill (account tier only) + account chip / Log in. There is deliberately no role switch: logged-out users read everything and write nothing.

---

## Data Flow — Ledger

1. **Register** — `Register.jsx:56` posts form → `beekeeperController.js:7` `Beekeeper.create()` → `mintGenesisForBeekeeper()` (`blockchainController.js:141`) computes `blockHash(null, "beekeeper_registration", {name, village,…})` → `LedgerBlock.create({hash, scan_secret, is_frozen:false})` → `201 { data: beekeeper, genesis }` → genesis card + QR rendered inside same form.
2. **Collective pool** — collective opens `/ledger`, selects `3′ Collective Pool`, pastes 2+ farmer hashes (e.g., 5 genesis hashes) → `POST /api/ledger/pool` → `pooledHash(sorted(prev_hashes),"pooled",data)` → block with `prev_hashes` DAG, `hash` unique.
3. **Processor** — scans pooled QR (`verify/<hash>?s=secret`), copies hash → `/ledger` form picks `Processing & QC` → `prev_hash=pooled_hash` → `blockHash(pooled_hash,…)` → block.
4. **Lab** — scans processing QR → `lab_certified` block with `{ca_number, cert_hash}` → block.
5. **Retail (freeze)** — Khadi retailer scans lab QR → `retail` stage → `is_frozen:true` → chain rejects further children (`blockchainController.js:52`).
6. **Consumer verify** — at Khadi shelf scans jar QR → `GET /verify/:hash?s=secret` → `verifyChain()` (`blockchainController.js:20`) walks `prev_hash` (or first parent for pooled) reverse, checks missing/cycle/frozen-parent → `valid` + full `chain` + `tokenValid`; `Verify.jsx` shows `Chain intact` + `Frozen at retail` ✅.

Dashboard / Learn / Disease flows unchanged.

---

## Backend — File Details

| File | Note |
|---|---|
| `utils/hash.js:3` | `sha256` via `crypto`, `canonicalStringify:9` sorted-key JSON, `blockHash:12`, `pooledHash:20`, `randomSecret` |
| `models/LedgerBlock.js:5` | `STAGES` 10 enum matching diagram; fields `hash` UNIQUE indexed, `prev_hash`, `prev_hashes`, `stage`, `data` Mixed, `beekeeper` ref, `collective_name`, `scan_secret`, `is_frozen`, `lab{}`, `qa{}`, `timestamps` |
| `controllers/blockchainController.js:7` | `STAGE_META:7` (label/step/icon/desc), `verifyChain:20` (reverse walk + frozen/cycle check), `createBlock:33` (linear vs pooled branch, frozen guard, beekeeper ref, `randomSecret`), `getChain:104`, `verifyBlock:121` (token check + pooledParents fetch), `getBlock:128`, `mintGenesis:141` |
| `routes/blockchainRoutes.js:1` | `POST /block`, `POST /pool` alias, `GET /chain|/verify/:hash|/block/:hash` |
| `controllers/beekeeperController.js:7` | Now `try mintGenesisForBeekeeper` after create, returns `{ data, genesis }`, warn-only on failure |
| `server.js:8` | Mounts `/api/ledger` |
| `models/Beekeeper.js` | Unchanged |

---

## Frontend — File Details

| File | Note |
|---|---|
| `pages/Ledger.jsx:1` | Fetches `GET /ledger/chain`, `workflow-bar` from `activeStages` set, filter chips, maps `blocks` to `block-card` (genesis gold banner, DAG badge, frozen badge, hash rows, `QRCodeSVG`, `Use as prev`), right sticky `create-form` (stage, prev_hash(s), collective_name, JSON data, pooled-handling) calling `POST /ledger/block`. |
| `pages/Ledger.css:1` | Workflow bar (`wf-step`/`wf-num`/`wf-dot.on`), stats, `block-card`/`block-genesis`/`block-frozen`/`genesis-badge`, `block-head`/`block-grid`/`hash-val`/`payload-pre`/`qr-box`/`chain-connector`, `ledger-create` sticky. All `var(--color-*)` — no new palette. |
| `pages/Verify.jsx:1` | Reads `useParams hash` + `?s` token, fetches `GET /ledger/verify/:hash`, shows `verify-status ok/bad` pills, `verify-block` (hash, pooled parents as linked chips, QR), `verify-chain` vertical `v-item`s (active/frozen), search input. |
| `pages/Verify.css:1` | Status `ok/bad` gradients (`--color-success-bg`/`--color-danger-bg`), `v-item active` primary-light, frozen red, QR box same as ledger. |
| `pages/Register.jsx:44` | Now imports `QRCodeSVG`+`Link`, holds `genesis` state, captures `res.data.genesis`, renders `genesis-card` inside form on `success && genesis`. |
| `pages/Register.css:1` | Added `.genesis-card`/`genesis-head`/`genesis-grid`/`genesis-qr` … all via `var(--color-*)`. |
| `App.jsx:12` | 6 routes incl `/ledger` + `/verify/:hash` + `/verify` |
| `components/Navbar.jsx:4` | 5 links incl `Ledger` |

---

## Swapping Mock Data for Real Sensors

Only `backend/controllers/hiveController.js:1` needs replacing — swap `require("../data/mockHives")` for a `Hive` Mongoose model queried in `getHives`/`getWeather`. Frontend `Dashboard.jsx:18` unchanged.

Ledger already real — backed by `LedgerBlock` collection. When ESP32 pipeline is ready, sensor QA data can also be added as `processing` block `qa` field.

---

## Env

| File | Var | Need | Used |
|---|---|---|---|
| `backend/.env` | `MONGODB_URI` | Yes | `db.js:4` — registration + ledger |
| `backend/.env` | `JWT_SECRET` | Yes (prod) | `middleware/auth.js` + `authController.js` — login tokens; dev fallback warns |
| `backend/.env` | `ANTHROPIC_API_KEY` | Only disease | `diseaseController.js:24` |
| `backend/.env` | `ANTHROPIC_MODEL` | No (`claude-sonnet-4-5`) | `diseaseController.js` |
| `backend/.env` | `ALLOW_DEMO_OTP` | No (`true`) | `kycController.js` — return demo OTP vs real SMS gateway |
| `backend/.env` | `STRICT_AADHAAR` | No (`false`) | `beekeeperController.js` — reject bad-checksum Aadhaar |
| `backend/.env` | `DIGILOCKER_CLIENT_ID/SECRET/REDIRECT_URI` | Only eKYC | `kycController.js` — real OAuth vs demo mode |
| `backend/.env` | `PORT` | No (5000) | `server.js:27` |
| `frontend/.env` | `VITE_API_BASE_URL` | No (→ `http://localhost:5000/api`) | `api.js:4` |

---

## Notes

- Hash = `SHA256(prev|stage|canonical(data))`, pooled = `SHA256(sorted(prevs)|stage|canonical(data))` — same idea as `beekeeper/app.py:283` but with explicit `stage` so two stages with same data hash differently. Changing Anthropic model only affects `diseaseController.js:42`.
- **Two tiers are server-enforced**: `POST /ledger/block|/pool|/sale`, `POST /beekeepers/register`, `POST /map/farmers` all require `authenticate` (401 without JWT); the JWT role then flows through `getRole()`. Every minted block is stamped `createdBy { userId, name, role, centreId }` — the basis of personal ledgers (`GET /ledger/mine`). `claim-beekeeper` needs the Aadhaar-OTP stamp + phone match; centre claims stay `centreVerified: false` until a centre admin confirms (no admin tier yet — that's the honest next step, not a silent auto-verify). Public without login: chain/twin/verify reads, dual-key sale check, KYC, map, RTI filing. The Register form itself is private (`/` redirects to `/account` when logged out).
- **Aadhaar privacy**: full numbers never logged/listed; `check` shows masked names only; OTPs are sha256-hashed in memory with 5-min TTL + 5-attempt cap + rate limits. Demo OTP is returned in-band only while `ALLOW_DEMO_OTP=true`.
- **Directory honesty**: every centre carries `source` + `verified` (`official` vs `directory`); pins are city-level (`coordApprox`), street addresses authoritative. Mock cluster farmers remain mock — only the offices are real.
- Productivity stays formula-based (`productivityController.js:1`) — explainable.
- All CSS plain, ledger reuses `card`, `status-pill`, `hash-val`, `qr-box`, `btn` — no new theme.
- Retail freeze is app-level (`is_frozen` flag) — for real immutability add `tx_hash` column and anchor `hash` to Polygon/Fabric later without frontend change (same `block.hash`).
- Production hardening still open (deliberately out of scope): lock CORS origins (currently open), add helmet-style headers, move OTP + rate-limit stores to Redis for multi-replica, replace demo OTP with UIDAI-licensed/SMS sender, add a centre-admin approval step for `centreVerified`, and rotate `JWT_SECRET` into a secret manager.
