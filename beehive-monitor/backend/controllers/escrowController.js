const store = require("../store/appStore");
const crypto = require("crypto");
const { sha256 } = require("../utils/hash");

const KVIC_MSP_RATE_INR = 225; // Official KVIC Honey Mission Minimum Support Price: ₹225/kg

// Helper to auto-create or update an escrow when an extraction/collection/lab event occurs
async function syncEscrowFromBlock(block, beekeeperDoc) {
  try {
    if (!block) return null;
    const lotHash = block.hash;
    const stage = block.stage;

    // 1. Extraction / Harvest: Initialize Escrow
    if (stage === "honey_extraction") {
      const existing = await store.findEscrowByLot(lotHash);
      if (existing) return existing;

      const bk = beekeeperDoc || (block.beekeeper ? await store.findBeekeeperById(block.beekeeper) : null);
      if (!bk) return null;

      const weight = Number(block.data?.weight_kg || block.data?.quantity_kg || 15);
      const totalAmount = Math.round(weight * KVIC_MSP_RATE_INR);
      const rawAadhaar = String(bk.aadhaarNo || bk.aadhaarDigits || "");
      const aadhaarMasked = bk.aadhaarMasked || (rawAadhaar.length >= 4 ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` : "XXXX-XXXX-9999");
      const aadhaarHash = rawAadhaar ? sha256(rawAadhaar) : sha256(String(bk._id));
      const upiVpa = bk.phoneNumber ? `${bk.phoneNumber}@upi` : `${bk.name.toLowerCase().replace(/\s+/g, "")}@sbi`;

      const escrow = await store.createEscrow({
        escrowId: `ESC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
        lotHash,
        extractionHash: lotHash,
        beekeeper: bk._id,
        beekeeperName: bk.name,
        village: bk.village || "Apiary Cluster",
        state: bk.state || "Maharashtra",
        aadhaarMasked,
        aadhaarHash,
        upiVpa,
        lotWeightKg: weight,
        mspRatePerKgInr: KVIC_MSP_RATE_INR,
        totalAmountInr: totalAmount,
        status: "LOCKED_PENDING_COLLECTION",
      });
      return escrow;
    }

    // 2. Collection: Field Officer confirms receipt & weight
    if (stage === "collection") {
      let escrow = await store.findEscrowByLot(block.prev_hash);
      if (!escrow && block.beekeeper) {
        const bk = await store.findBeekeeperById(block.beekeeper);
        if (bk) {
          const weight = Number(block.data?.quantity_kg || block.data?.weight_kg || 15);
          escrow = await store.createEscrow({
            escrowId: `ESC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
            lotHash,
            extractionHash: block.prev_hash,
            beekeeper: bk._id,
            beekeeperName: bk.name,
            village: bk.village || "Apiary Cluster",
            state: bk.state || "Maharashtra",
            aadhaarMasked: bk.aadhaarMasked || "XXXX-XXXX-9999",
            aadhaarHash: sha256(String(bk.aadhaarNo || bk._id)),
            upiVpa: `${bk.phoneNumber || "farmer"}@upi`,
            lotWeightKg: weight,
            mspRatePerKgInr: KVIC_MSP_RATE_INR,
            totalAmountInr: Math.round(weight * KVIC_MSP_RATE_INR),
            status: "COLLECTED_PENDING_LAB",
            collectionConfirmedAt: new Date().toISOString(),
            collectorName: block.createdBy?.name || block.data?.collector_name || "KVIC Field Officer",
            collectorCentre: block.createdBy?.centreId || "KVIC Divisional Office",
          });
          return escrow;
        }
      }

      if (escrow) {
        const weight = Number(block.data?.quantity_kg || block.data?.weight_kg) || escrow.lotWeightKg;
        const totalAmount = Math.round(weight * KVIC_MSP_RATE_INR);
        return await store.updateEscrow(escrow.escrowId, {
          status: "COLLECTED_PENDING_LAB",
          collectionHash: block.hash,
          lotWeightKg: weight,
          totalAmountInr: totalAmount,
          collectionConfirmedAt: new Date().toISOString(),
          collectorName: block.createdBy?.name || block.data?.collector_name || "KVIC Field Officer",
          collectorCentre: block.createdBy?.centreId || "KVIC Divisional Office",
        });
      }
    }

    // 3. Lab Certified (CBRTI Pune): Autonomous Smart Payout Release or Rejection
    if (stage === "lab_certified") {
      let escrow = await store.findEscrowByLot(block.prev_hash);
      if (!escrow) {
        // Search through parent ancestry
        let curr = block.prev_hash;
        let depth = 0;
        while (curr && depth < 10) {
          depth++;
          escrow = await store.findEscrowByLot(curr);
          if (escrow) break;
          const p = await store.findBlockByHash(curr);
          curr = p?.prev_hash;
        }
      }

      if (escrow) {
        const lab = block.lab || block.data?.lab || {};
        const moistureRaw = lab.moisture || block.data?.moisture || "18.2%";
        const moistureVal = parseFloat(String(moistureRaw).replace("%", ""));
        const c3c4Passed = !String(lab.c4_sugar_test || "").includes("Positive");
        const passesQuality = !isNaN(moistureVal) ? moistureVal <= 20.0 && c3c4Passed : true;

        if (passesQuality) {
          const voucherRef = `ERUPI-KVIC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
          const txnRef = `NPCI-DBT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
          return await store.updateEscrow(escrow.escrowId, {
            status: "DISBURSED_DBT",
            cbrtiAttestedAt: new Date().toISOString(),
            cbrtiReport: {
              ca_number: lab.ca_number || "CBRTI-NABL-2026-CA",
              cert_hash: lab.cert_hash || sha256(JSON.stringify(lab)),
              moisture: `${moistureVal}%`,
              moistureVal,
              c4_sugar_test: lab.c4_sugar_test || "Negative",
              c3_rice_syrup_test: lab.c3_rice_syrup_test || "Negative",
              passed: true,
              labTester: lab.tester_name || "CBRTI Pune Quality Analyst",
            },
            disbursement: {
              method: "e_RUPI_VOUCHER",
              eRupiVoucherRef: voucherRef,
              transactionRef: txnRef,
              disbursedAt: new Date().toISOString(),
              beneficiaryBank: "State Bank of India (Aadhaar Seeding)",
              payoutStatus: "SUCCESS",
            },
            blockchainTxHash: block.hash,
          });
        } else {
          return await store.updateEscrow(escrow.escrowId, {
            status: "QUALITY_REJECTED",
            cbrtiAttestedAt: new Date().toISOString(),
            rejectionReason: moistureVal > 20.0 ? `Moisture ${moistureVal}% exceeds 20.0% limit` : "Syrup adulteration detected",
            cbrtiReport: {
              ca_number: lab.ca_number,
              cert_hash: lab.cert_hash,
              moisture: `${moistureVal}%`,
              moistureVal,
              passed: false,
              labTester: lab.tester_name,
            },
          });
        }
      }
    }

    return null;
  } catch (err) {
    console.error("syncEscrowFromBlock error:", err.message);
    return null;
  }
}

// GET /api/escrow/list
async function getEscrowList(req, res) {
  try {
    const escrows = await store.listEscrows();
    res.json({ success: true, count: escrows.length, data: escrows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/escrow/lot/:hash
async function getEscrowByLot(req, res) {
  try {
    const { hash } = req.params;
    const escrow = await store.findEscrowByLot(hash);
    if (!escrow) return res.status(404).json({ success: false, error: "Escrow not found for this lot" });
    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/escrow/beekeeper/:beekeeperId
async function getEscrowsByBeekeeper(req, res) {
  try {
    const { beekeeperId } = req.params;
    const escrows = await store.findEscrowsByBeekeeper(beekeeperId);
    const totalEarnings = escrows
      .filter((e) => e.status === "DISBURSED_DBT")
      .reduce((sum, e) => sum + (e.totalAmountInr || 0), 0);
    const pendingEarnings = escrows
      .filter((e) => e.status === "LOCKED_PENDING_COLLECTION" || e.status === "COLLECTED_PENDING_LAB")
      .reduce((sum, e) => sum + (e.totalAmountInr || 0), 0);

    res.json({
      success: true,
      count: escrows.length,
      stats: {
        totalDisbursedInr: totalEarnings,
        pendingInEscrowInr: pendingEarnings,
        mspRatePerKg: KVIC_MSP_RATE_INR,
      },
      data: escrows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/escrow/trigger-dbt (Manual or Oracle execution)
async function triggerDbtDisbursement(req, res) {
  try {
    const { escrowId, eRupiVoucherRef } = req.body;
    if (!escrowId) return res.status(400).json({ success: false, error: "escrowId required" });

    const escrow = await store.findEscrowById(escrowId);
    if (!escrow) return res.status(404).json({ success: false, error: "Escrow not found" });

    if (escrow.status === "DISBURSED_DBT") {
      return res.status(409).json({ success: false, error: "Funds already disbursed", escrow });
    }

    const voucher = eRupiVoucherRef || `ERUPI-KVIC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const txnRef = `NPCI-DBT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const updated = await store.updateEscrow(escrow.escrowId, {
      status: "DISBURSED_DBT",
      disbursement: {
        method: "e_RUPI_VOUCHER",
        eRupiVoucherRef: voucher,
        transactionRef: txnRef,
        disbursedAt: new Date().toISOString(),
        beneficiaryBank: "State Bank of India (Aadhaar Seeding)",
        payoutStatus: "SUCCESS",
      },
    });

    res.json({
      success: true,
      message: "DBT Payment successfully disbursed via NPCI e-RUPI smart voucher",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  syncEscrowFromBlock,
  getEscrowList,
  getEscrowByLot,
  getEscrowsByBeekeeper,
  triggerDbtDisbursement,
  KVIC_MSP_RATE_INR,
};
