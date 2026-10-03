const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      "[db] MONGODB_URI is not set in .env — registration will fail until you add it."
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("[db] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("[db] Failed to connect to MongoDB:", err.message);
    console.warn("[db] Falling back to local JSON store — registration & ledger still work.");
  }
}

module.exports = connectDB;
