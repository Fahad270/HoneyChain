# Madhu Setu — Beekeeper Monitoring Platform

A full-stack starter: React (Vite) frontend + Express/MongoDB Atlas backend.

## Folder structure

```
beehive-monitor/
├── backend/     Express API + MongoDB models
└── frontend/    React (Vite) app — 4 pages
```

## 1. Backend setup

```
cd backend
npm install
cp .env.example .env
```

Open `.env` and paste in:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `ANTHROPIC_API_KEY` — only needed for the Disease Detection page

```
npm run dev
```

Runs on **http://localhost:5000**. Check `http://localhost:5000/api/health` returns `{ ok: true }`.

## 2. Frontend setup

Open a second terminal:

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs on **http://localhost:5173**.

## Pages

| Route | Page | Notes |
|---|---|---|
| `/` | Registration | Madhukranti-style form, saves to MongoDB via `POST /api/beekeepers/register` |
| `/dashboard` | Hive Dashboard | Hex-grid of 20 hives, weather + India climate notes, per-hive charts. Data is static for now (`backend/data/mockHives.js`) — swap this file for real ESP32 feeds later |
| `/learn` | Skill Building | Language-toggled video library (English/Hindi/Marathi), pulls from `backend/data/videos.js` |
| `/diagnose` | Disease & Yield | Image upload → Claude vision API diagnosis; formula-based productivity predictor |

## Swapping mock data for real sensors later

Everything hive-related currently reads from `backend/data/mockHives.js`. When your
ESP32/LoRa pipeline is ready, replace the contents of `getHives`/`getWeather` in
`backend/controllers/hiveController.js` to read from a new Mongoose model instead —
the frontend won't need to change since it just calls `GET /api/hives`.

## Notes

- Disease detection uses `claude-sonnet-5` via the Anthropic Messages API. If the
  model name changes on Anthropic's side, update the `model` field in
  `backend/controllers/diseaseController.js`.
- All CSS is plain, no framework — colors/fonts are controlled from
  `frontend/src/index.css` (`:root` variables) if you want to retheme.
