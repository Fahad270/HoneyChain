require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const beekeeperRoutes = require("./routes/beekeeperRoutes");
const hiveRoutes = require("./routes/hiveRoutes");
const videoRoutes = require("./routes/videoRoutes");
const diseaseRoutes = require("./routes/diseaseRoutes");
const productivityRoutes = require("./routes/productivityRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const escrowRoutes = require("./routes/escrowRoutes");
const mapRoutes = require("./routes/mapRoutes");
const rtiRoutes = require("./routes/rtiRoutes");
const kycRoutes = require("./routes/kycRoutes");
const authRoutes = require("./routes/authRoutes");
const { optionalAuth } = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/beekeepers", beekeeperRoutes);
app.use("/api/hives", hiveRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/disease", diseaseRoutes);
app.use("/api/productivity", productivityRoutes);
app.use("/api/ledger", optionalAuth, blockchainRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/rti", rtiRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] Running on http://localhost:${PORT}`));
