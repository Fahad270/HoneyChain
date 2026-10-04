const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { blockHash, pooledHash, randomSecret, sha256 } = require("../utils/hash");

async function seed() {
  console.log("==> Generating clean, verifiable demo seed data for HoneyChain...");

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1. Beekeepers
  const beekeepers = [
    {
      _id: "bk_rameshwar01",
      name: "Rameshwar Patel",
      aadhaarNo: "892345671234",
      phoneNumber: "9876543210",
      village: "Alwar Khurd",
      district: "Alwar",
      state: "rajasthan",
      noOfBeeColonies: 18,
      status: "verified",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "bk_sunita02",
      name: "Sunita Devi",
      aadhaarNo: "543210987654",
      phoneNumber: "9876543211",
      village: "Bhiwadi Rural",
      district: "Alwar",
      state: "rajasthan",
      noOfBeeColonies: 25,
      status: "verified",
      createdAt: "2026-10-01T08:30:00.000Z",
      updatedAt: "2026-10-01T08:30:00.000Z",
    },
    {
      _id: "bk_vikram03",
      name: "Vikram Singh Gurjar",
      aadhaarNo: "678901234567",
      phoneNumber: "9876543212",
      village: "Tijara",
      district: "Alwar",
      state: "rajasthan",
      noOfBeeColonies: 30,
      status: "verified",
      createdAt: "2026-10-01T09:00:00.000Z",
      updatedAt: "2026-10-01T09:00:00.000Z",
    },
    {
      _id: "bk_kailash04",
      name: "Kailash Chand Verma",
      aadhaarNo: "789012345678",
      phoneNumber: "9876543213",
      village: "Keoladeo Rural",
      district: "Bharatpur",
      state: "rajasthan",
      noOfBeeColonies: 20,
      status: "verified",
      createdAt: "2026-10-01T09:30:00.000Z",
      updatedAt: "2026-10-01T09:30:00.000Z",
    },
    {
      _id: "bk_anita05",
      name: "Anita Choudhary",
      aadhaarNo: "890123456789",
      phoneNumber: "9876543214",
      village: "Bayana",
      district: "Bharatpur",
      state: "rajasthan",
      noOfBeeColonies: 16,
      status: "verified",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    },
  ];

  // 2. User Accounts
  const users = [
    {
      _id: "user_rameshwar01",
      name: "Rameshwar Patel",
      phone: "9876543210",
      email: "rameshwar@honeychain.org",
      passwordHash,
      role: "beekeeper",
      beekeeperId: "bk_rameshwar01",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "user_bk_kailash04",
      name: "Kailash Chand Verma",
      phone: "9876543213",
      email: "kailash@honeychain.org",
      passwordHash,
      role: "beekeeper",
      beekeeperId: "bk_kailash04",
      status: "active",
      createdAt: "2026-10-01T09:30:00.000Z",
      updatedAt: "2026-10-01T09:30:00.000Z",
    },
    {
      _id: "user_bk_anita05",
      name: "Anita Choudhary",
      phone: "9876543214",
      email: "anita@honeychain.org",
      passwordHash,
      role: "beekeeper",
      beekeeperId: "bk_anita05",
      status: "active",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    },
    {
      _id: "user_kvic_aditya02",
      name: "Aditya Verma (KVIC Officer)",
      phone: "9820012345",
      email: "kvic.officer@kvic.gov.in",
      passwordHash,
      role: "kvic",
      assignedCentreId: "kvic-jaipur",
      centreVerified: true,
      orgName: "KVIC Rajasthan State Directorate",
      designation: "District Beekeeping Development Officer",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "user_cbrti_dr_sharma",
      name: "Dr. Sneha Sharma (CBRTI Pune)",
      phone: "9820099881",
      email: "qa.cbrti@kvic.gov.in",
      passwordHash,
      role: "kvic",
      assignedCentreId: "cbrti-pune",
      centreVerified: true,
      orgName: "Central Bee Research & Training Institute",
      designation: "Senior Quality Control Biochemist",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
  ];

  // 3. Blocks & Chains
  const blocks = [];

  function addLinearBlock({ stage, prev_hash, data, beekeeper, createdBy, is_frozen = false, qa, lab, createdAt }) {
    const hash = blockHash(prev_hash, stage, data);
    let beekeeperObj = null;
    if (beekeeper) {
      if (typeof beekeeper === "object") {
        beekeeperObj = beekeeper;
      } else {
        const found = beekeepers.find((bk) => bk._id === beekeeper);
        beekeeperObj = found ? { _id: found._id, name: found.name, village: found.village, state: found.state } : { _id: beekeeper };
      }
    }
    const block = {
      _id: `blk_${hash.slice(0, 16)}`,
      hash,
      prev_hash,
      prev_hashes: [],
      stage,
      data,
      beekeeper: beekeeperObj,
      createdBy: createdBy || null,
      is_frozen,
      scan_secret: randomSecret(8),
      ...(qa ? { qa } : {}),
      ...(lab ? { lab } : {}),
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: createdAt || new Date().toISOString(),
    };
    blocks.push(block);
    return block;
  }

  function addPooledBlock({ stage, prev_hashes, collective_name, data, createdBy, is_frozen = false, createdAt }) {
    const hash = pooledHash(prev_hashes, stage, data);
    const block = {
      _id: `blk_${hash.slice(0, 16)}`,
      hash,
      prev_hash: prev_hashes[0] || null,
      prev_hashes,
      stage,
      collective_name: collective_name || "",
      data,
      createdBy: createdBy || null,
      is_frozen,
      scan_secret: randomSecret(8),
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: createdAt || new Date().toISOString(),
    };
    blocks.push(block);
    return block;
  }

  // --- Chain A: Rameshwar Patel ---
  const b1 = addLinearBlock({
    stage: "beekeeper_registration",
    prev_hash: null,
    data: {
      beekeeper_id: "bk_rameshwar01",
      name: "Rameshwar Patel",
      village: "Alwar Khurd",
      district: "Alwar",
      state: "Rajasthan",
      noOfBeeColonies: 18,
      aadhaar_masked: "XXXXXXXX1234",
    },
    beekeeper: "bk_rameshwar01",
    createdBy: { userId: "user_rameshwar01", name: "Rameshwar Patel", role: "beekeeper" },
    createdAt: "2026-10-01T09:15:00.000Z",
  });

  const b2 = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b1.hash,
    data: {
      hive_id: "HIVE-03",
      weight_kg: 14.5,
      flower_source: "mustard",
      harvest_date: "2026-10-02",
      moisture_est_pct: 18.2,
      notes: "Morning harvest, capped combs, Apiary Plot 2",
    },
    beekeeper: "bk_rameshwar01",
    createdBy: { userId: "user_rameshwar01", name: "Rameshwar Patel", role: "beekeeper" },
    createdAt: "2026-10-02T08:30:00.000Z",
  });

  const b3 = addLinearBlock({
    stage: "collection",
    prev_hash: b2.hash,
    data: {
      collection_centre: "Alwar KVIC Node #4",
      container_type: "stainless_drum_food_grade",
      quantity_kg: 14.5,
      temperature_c: 24,
      quality_grade: "Grade A Raw",
    },
    beekeeper: "bk_rameshwar01",
    createdBy: { userId: "user_kvic_rajesh", name: "Rajesh Sharma", role: "kvic", centreId: "kvic-alwar" },
    createdAt: "2026-10-02T11:00:00.000Z",
  });

  // --- Chain B: Sunita Devi ---
  const b4 = addLinearBlock({
    stage: "beekeeper_registration",
    prev_hash: null,
    data: {
      beekeeper_id: "bk_sunita02",
      name: "Sunita Devi",
      village: "Bhiwadi Rural",
      district: "Alwar",
      state: "Rajasthan",
      noOfBeeColonies: 25,
      aadhaar_masked: "XXXXXXXX7654",
    },
    beekeeper: "bk_sunita02",
    createdBy: { userId: "user_bk_sunita02", name: "Sunita Devi", role: "beekeeper" },
    createdAt: "2026-10-01T10:00:00.000Z",
  });

  const b5 = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b4.hash,
    data: {
      hive_id: "HIVE-08",
      weight_kg: 22.0,
      flower_source: "mustard",
      harvest_date: "2026-10-02",
      moisture_est_pct: 17.9,
    },
    beekeeper: "bk_sunita02",
    createdBy: { userId: "user_bk_sunita02", name: "Sunita Devi", role: "beekeeper" },
    createdAt: "2026-10-02T09:00:00.000Z",
  });

  const b6 = addLinearBlock({
    stage: "collection",
    prev_hash: b5.hash,
    data: {
      collection_centre: "Alwar KVIC Node #4",
      container_type: "stainless_drum_food_grade",
      quantity_kg: 22.0,
      temperature_c: 24,
    },
    beekeeper: "bk_sunita02",
    createdBy: { userId: "user_kvic_pooja", name: "Pooja Meena", role: "kvic", centreId: "kvic-alwar" },
    createdAt: "2026-10-02T11:30:00.000Z",
  });

  // --- Chain C: Vikram Singh Gurjar ---
  const b7 = addLinearBlock({
    stage: "beekeeper_registration",
    prev_hash: null,
    data: {
      beekeeper_id: "bk_vikram03",
      name: "Vikram Singh Gurjar",
      village: "Tijara",
      district: "Alwar",
      state: "Rajasthan",
      noOfBeeColonies: 30,
      aadhaar_masked: "XXXXXXXX4567",
    },
    beekeeper: "bk_vikram03",
    createdBy: { userId: "user_bk_vikram03", name: "Vikram Singh", role: "beekeeper" },
    createdAt: "2026-10-01T10:30:00.000Z",
  });

  const b8 = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b7.hash,
    data: {
      hive_id: "HIVE-14",
      weight_kg: 18.5,
      flower_source: "mustard",
      harvest_date: "2026-10-02",
      moisture_est_pct: 18.0,
    },
    beekeeper: "bk_vikram03",
    createdBy: { userId: "user_bk_vikram03", name: "Vikram Singh", role: "beekeeper" },
    createdAt: "2026-10-02T09:30:00.000Z",
  });

  const b9 = addLinearBlock({
    stage: "collection",
    prev_hash: b8.hash,
    data: {
      collection_centre: "Alwar KVIC Node #4",
      container_type: "stainless_drum_food_grade",
      quantity_kg: 18.5,
      temperature_c: 24,
    },
    beekeeper: "bk_vikram03",
    createdBy: { userId: "user_kvic_mukesh", name: "Mukesh Yadav", role: "kvic", centreId: "kvic-alwar" },
    createdAt: "2026-10-02T12:00:00.000Z",
  });

  // --- DAG CONVERGENCE: Collective Pool Block (Stage 3' pooled) ---
  const bPool = addPooledBlock({
    stage: "pooled",
    prev_hashes: [b3.hash, b6.hash, b9.hash],
    collective_name: "Alwar Honey Producers Federation",
    data: {
      lot_id: "LOT-ALW-2026-001",
      total_weight_kg: 55.0,
      member_farmers_count: 3,
      flora: "Mustard (Brassica juncea)",
      seal_id: "KVIC-SEAL-77412",
    },
    createdBy: { userId: "user_kvic_aditya02", name: "Aditya Verma", role: "kvic", centreId: "kvic-jaipur" },
    createdAt: "2026-10-02T15:00:00.000Z",
  });

  // --- Stage 4: Bulk Transport ---
  const bTransport = addLinearBlock({
    stage: "transport",
    prev_hash: bPool.hash,
    data: {
      vehicle_no: "RJ-02-GB-4481",
      driver_name: "Surender Meena",
      temp_controlled: true,
      avg_temp_c: 22,
      dispatch_time: "2026-10-03T06:00:00Z",
      destination: "KVIC Processing Plant, Jaipur",
    },
    createdBy: { userId: "user_transport_surender", name: "Surender Meena", role: "transporter", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T06:00:00.000Z",
  });

  // --- Stage 5: Processing & QA ---
  const bProc = addLinearBlock({
    stage: "processing",
    prev_hash: bTransport.hash,
    data: {
      facility: "KVIC State Processing Plant, Jaipur",
      batch_lot: "BATCH-JP-881",
      process_temp_c: 42,
      filtration_microns: 150,
      enzyme_activity_guaranteed: true,
    },
    qa: { passed: true, inspection_officer: "Dr. K. S. Rathore", date: "2026-10-03" },
    createdBy: { userId: "user_proc_dr_rathore", name: "Dr. K. S. Rathore", role: "processor", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T11:00:00.000Z",
  });

  // --- Stage 5b: CBRTI Pune Lab Certified ---
  const bLab = addLinearBlock({
    stage: "lab_certified",
    prev_hash: bProc.hash,
    data: {
      lab_name: "Central Bee Research and Training Institute (CBRTI), Pune",
      certificate_id: "CBRTI-QC-2026-9041",
      fssai_standard: "FSSAI Reg 2.8.3 Honey Standard",
      result: "PURITY PASS",
    },
    lab: {
      ca_number: "NABL-TC-8821",
      cert_hash: "9f8a7c6e5d4b3a210987654321fedcba0123456789abcdef",
      moisture_pct: 17.8,
      hmf_mg_kg: 16.4,
      sucrose_pct: 2.1,
      f_g_ratio: 1.18,
      c4_sugars_pct: 1.2,
      pollen_profile: "Monofloral Mustard >82%",
      antibiotics: "ND (Not Detected)",
    },
    createdBy: { userId: "user_cbrti_dr_sharma", name: "Dr. Sneha Sharma", role: "lab_analyst", centreId: "cbrti-pune" },
    createdAt: "2026-10-03T16:00:00.000Z",
  });

  // --- Stage 6: Packaging ---
  const bPack = addLinearBlock({
    stage: "packaging",
    prev_hash: bLab.hash,
    data: {
      packaging_unit: "Khadi Honey Bottling Facility #1",
      total_jars: 110,
      jar_size_g: 500,
      batch_code: "KHADI-RAW-MUSTARD-500G-B01",
      best_before: "2028-10-03",
    },
    createdBy: { userId: "user_pack_anil", name: "Anil Kumar", role: "packager", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T18:00:00.000Z",
  });

  // --- Stage 7: Distribution ---
  const bDist = addLinearBlock({
    stage: "distribution",
    prev_hash: bPack.hash,
    data: {
      distributor: "Khadi Gramodyog Bhavan Logistics Hub",
      dispatch_manifest: "MANIFEST-DELHI-004",
      consignee: "Khadi Gramodyog Bhavan, Connaught Circus, New Delhi",
    },
    createdBy: { userId: "user_dist_harish", name: "Harish Chander", role: "distributor", centreId: "kvic-delhi" },
    createdAt: "2026-10-04T05:30:00.000Z",
  });

  // --- Stage 8: Retail Freeze ---
  const bRetail = addLinearBlock({
    stage: "retail",
    prev_hash: bDist.hash,
    is_frozen: true,
    data: {
      store: "Khadi Gramodyog Bhavan, Connaught Circus, New Delhi 110001",
      shelf_date: "2026-10-04",
      retail_price_inr: 350,
      qr_verified: true,
      offlineStoreId: "khadi-delhi",
    },
    createdBy: { userId: "user_retail_meera", name: "Meera Joshi", role: "retailer", centreId: "khadi-delhi" },
    createdAt: "2026-10-04T09:00:00.000Z",
  });

  // --- Fresh Active Harvest for Rameshwar (Unfrozen, ready for live testing!) ---
  const bFreshHarvest = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b1.hash,
    data: {
      hive_id: "HIVE-05",
      weight_kg: 16.0,
      flower_source: "multiflora",
      harvest_date: "2026-10-04",
      moisture_est_pct: 18.5,
      notes: "Fresh afternoon extraction from Box 5, awaiting KVIC collection",
    },
    beekeeper: "bk_rameshwar01",
    createdBy: { userId: "user_rameshwar01", name: "Rameshwar Patel", role: "beekeeper" },
    createdAt: "2026-10-04T12:00:00.000Z",
  });

  // =========================================================================
  // --- CHAIN 2 (DEMO): Bharatpur Wild Berry Honey FPO -> Khadi Jaipur ---
  // =========================================================================
  // Kailash Chand Verma (Keoladeo Rural, Bharatpur)
  const b2_1 = addLinearBlock({
    stage: "beekeeper_registration",
    prev_hash: null,
    data: {
      beekeeper_id: "bk_kailash04",
      name: "Kailash Chand Verma",
      village: "Keoladeo Rural",
      district: "Bharatpur",
      state: "Rajasthan",
      noOfBeeColonies: 20,
      aadhaar_masked: "XXXXXXXX5678",
    },
    beekeeper: "bk_kailash04",
    createdBy: { userId: "user_bk_kailash04", name: "Kailash Chand Verma", role: "beekeeper" },
    createdAt: "2026-10-01T10:15:00.000Z",
  });

  const b2_2 = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b2_1.hash,
    data: {
      hive_id: "HIVE-B1",
      weight_kg: 18.0,
      flower_source: "wild_berry",
      harvest_date: "2026-10-02",
      moisture_est_pct: 17.5,
    },
    beekeeper: "bk_kailash04",
    createdBy: { userId: "user_bk_kailash04", name: "Kailash Chand Verma", role: "beekeeper" },
    createdAt: "2026-10-02T08:30:00.000Z",
  });

  const b2_3 = addLinearBlock({
    stage: "collection",
    prev_hash: b2_2.hash,
    data: {
      collection_centre: "KVIC Bharatpur Village Mandi Node",
      weight_received_kg: 18.0,
      tare_weight_kg: 1.2,
      net_honey_kg: 18.0,
      moisture_refractometer_pct: 17.5,
      quality_grade: "Grade A Raw",
    },
    beekeeper: "bk_kailash04",
    createdBy: { userId: "user_kvic_dinesh", name: "Dinesh Kumar", role: "kvic", centreId: "kvic-bharatpur" },
    createdAt: "2026-10-02T10:30:00.000Z",
  });

  // Anita Choudhary (Bayana, Bharatpur)
  const b2_4 = addLinearBlock({
    stage: "beekeeper_registration",
    prev_hash: null,
    data: {
      beekeeper_id: "bk_anita05",
      name: "Anita Choudhary",
      village: "Bayana",
      district: "Bharatpur",
      state: "Rajasthan",
      noOfBeeColonies: 16,
      aadhaar_masked: "XXXXXXXX6789",
    },
    beekeeper: "bk_anita05",
    createdBy: { userId: "user_bk_anita05", name: "Anita Choudhary", role: "beekeeper" },
    createdAt: "2026-10-01T10:45:00.000Z",
  });

  const b2_5 = addLinearBlock({
    stage: "honey_extraction",
    prev_hash: b2_4.hash,
    data: {
      hive_id: "HIVE-A2",
      weight_kg: 15.5,
      flower_source: "wild_berry",
      harvest_date: "2026-10-02",
      moisture_est_pct: 17.8,
    },
    beekeeper: "bk_anita05",
    createdBy: { userId: "user_bk_anita05", name: "Anita Choudhary", role: "beekeeper" },
    createdAt: "2026-10-02T09:00:00.000Z",
  });

  const b2_6 = addLinearBlock({
    stage: "collection",
    prev_hash: b2_5.hash,
    data: {
      collection_centre: "KVIC Bharatpur Village Mandi Node",
      weight_received_kg: 15.5,
      tare_weight_kg: 1.1,
      net_honey_kg: 15.5,
      moisture_refractometer_pct: 17.8,
      quality_grade: "Grade A Raw",
    },
    beekeeper: "bk_anita05",
    createdBy: { userId: "user_kvic_dinesh", name: "Dinesh Kumar", role: "kvic", centreId: "kvic-bharatpur" },
    createdAt: "2026-10-02T11:00:00.000Z",
  });

  // Collective Pool for Chain 2 — Minted by Aditya Verma (Nodal Officer)
  const b2_Pool = addPooledBlock({
    stage: "pooled",
    prev_hashes: [b2_3.hash, b2_6.hash],
    collective_name: "Bharatpur Organic Honey FPO",
    data: {
      lot_id: "LOT-BHP-2026-002",
      total_weight_kg: 33.5,
      member_farmers_count: 2,
      flora: "Wild Berry & Ber (Ziziphus mauritiana)",
      seal_id: "KVIC-SEAL-88931",
    },
    createdBy: { userId: "user_kvic_aditya02", name: "Aditya Verma", role: "kvic", centreId: "kvic-jaipur" },
    createdAt: "2026-10-02T16:00:00.000Z",
  });

  const b2_Trans = addLinearBlock({
    stage: "transport",
    prev_hash: b2_Pool.hash,
    data: {
      transporter: "Rajasthan State Road Logistics",
      vehicle_no: "RJ-05-GA-4419",
      gps_trace_id: "GPS-TRK-RJ05-8812",
      temperature_c: 23,
      dispatch_time: "2026-10-03T07:00:00Z",
      destination: "KVIC Processing Plant, Jaipur",
    },
    createdBy: { userId: "user_transport_mahesh", name: "Mahesh Gurjar", role: "transporter", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T07:00:00.000Z",
  });

  const b2_Proc = addLinearBlock({
    stage: "processing",
    prev_hash: b2_Trans.hash,
    data: {
      facility: "KVIC State Processing Facility, Jaipur",
      filtration_mesh: 80,
      settling_hours: 48,
      temperature_c: 41,
      raw_unheated: true,
      enzyme_activity_guaranteed: true,
    },
    qa: { passed: true, inspection_officer: "Dr. K. S. Rathore", date: "2026-10-03" },
    createdBy: { userId: "user_proc_dr_rathore", name: "Dr. K. S. Rathore", role: "processor", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T12:00:00.000Z",
  });

  const b2_Lab = addLinearBlock({
    stage: "lab_certified",
    prev_hash: b2_Proc.hash,
    data: {
      lab_name: "Central Bee Research & Training Institute (CBRTI), Pune",
      nabl_accr_no: "TC-5489",
      test_standard: "FSSAI Honey Standards (Gazette 2020) & Agmark Special Grade",
      certificate_no: "CBRTI-QC-2026-10-00892",
      moisture_pct: 17.6,
      c4_sugars_pct: 0.4,
      c3_sugars_pct: 0.1,
      hmf_mg_per_kg: 11.8,
      diastase_activity_dn: 14.5,
      fructose_pct: 39.4,
      glucose_pct: 32.1,
      fg_ratio: 1.23,
      sucrose_pct: 1.5,
      pollen_profile: "Monofloral Wild Berry >78%",
      antibiotics: "ND (Not Detected)",
    },
    createdBy: { userId: "user_cbrti_dr_sharma", name: "Dr. Sneha Sharma", role: "lab_analyst", centreId: "cbrti-pune" },
    createdAt: "2026-10-03T17:00:00.000Z",
  });

  const b2_Pack = addLinearBlock({
    stage: "packaging",
    prev_hash: b2_Lab.hash,
    data: {
      packager: "KVIC Automated Packaging Unit, Jaipur",
      jar_type: "Glass Jar with Tamper-Evident NFC & QR Seal",
      net_weight_g: 500,
      total_units_packed: 67,
      batch_code: "KHADI-RAW-BERRY-500G-B02",
      best_before: "2028-10-03",
    },
    createdBy: { userId: "user_pack_anil", name: "Anil Kumar", role: "packager", centreId: "kvic-jaipur" },
    createdAt: "2026-10-03T19:00:00.000Z",
  });

  const b2_Dist = addLinearBlock({
    stage: "distribution",
    prev_hash: b2_Pack.hash,
    data: {
      distributor: "KVIC Rajasthan State Distribution",
      dispatch_manifest: "MANIFEST-JAIPUR-009",
      consignee: "Khadi Gramodyog Bhavan, JLN Marg, Jaipur 302004",
    },
    createdBy: { userId: "user_dist_harish", name: "Harish Chander", role: "distributor", centreId: "kvic-delhi" },
    createdAt: "2026-10-04T06:00:00.000Z",
  });

  const b2_Retail = addLinearBlock({
    stage: "retail",
    prev_hash: b2_Dist.hash,
    is_frozen: true,
    data: {
      store: "Khadi Gramodyog Bhavan, JLN Marg, Jaipur 302004",
      shelf_date: "2026-10-04",
      retail_price_inr: 375,
      qr_verified: true,
      offlineStoreId: "khadi-jaipur",
    },
    createdBy: { userId: "user_retail_rajendra", name: "Rajendra Prasad", role: "retailer", centreId: "khadi-jaipur" },
    createdAt: "2026-10-04T09:30:00.000Z",
  });

  // 4. Jars
  const jars = [
    {
      _id: "jar_001",
      jarSerial: "KHADI-MUSTARD-2026-0001",
      hash: bRetail.hash,
      publicKey: sha256(`KHADI-MUSTARD-2026-0001|${bRetail.hash}`),
      packagingHash: bPack.hash,
      sold: true,
      channel: "offline",
      platform: "Khadi Gramodyog Bhavan",
      storeName: "Khadi Gramodyog Bhavan, Connaught Circus, New Delhi",
      billNo: "BILL-KGB-2026-8812",
      offlineStoreId: "khadi-delhi",
      verifyCount: 1,
      lastVerifiedAt: "2026-10-04T10:15:00.000Z",
      firstVerifiedAt: "2026-10-04T10:15:00.000Z",
      createdAt: "2026-10-04T09:30:00.000Z",
      updatedAt: "2026-10-04T10:15:00.000Z",
    },
    {
      _id: "jar_002",
      jarSerial: "KHADI-MUSTARD-2026-0002",
      hash: bRetail.hash,
      publicKey: sha256(`KHADI-MUSTARD-2026-0002|${bRetail.hash}`),
      packagingHash: bPack.hash,
      sold: false,
      channel: "offline",
      storeName: "Khadi Gramodyog Bhavan, Connaught Circus, New Delhi",
      offlineStoreId: "khadi-delhi",
      verifyCount: 0,
      createdAt: "2026-10-04T09:30:00.000Z",
      updatedAt: "2026-10-04T09:30:00.000Z",
    },
    {
      _id: "jar_003",
      jarSerial: "KHADI-BERRY-2026-0001",
      hash: b2_Retail.hash,
      publicKey: sha256(`KHADI-BERRY-2026-0001|${b2_Retail.hash}`),
      packagingHash: b2_Pack.hash,
      sold: true,
      channel: "offline",
      platform: "Khadi Gramodyog Bhavan",
      storeName: "Khadi Gramodyog Bhavan, JLN Marg, Jaipur",
      billNo: "BILL-KGB-JPR-2026-4401",
      offlineStoreId: "khadi-jaipur",
      verifyCount: 1,
      lastVerifiedAt: "2026-10-04T10:30:00.000Z",
      firstVerifiedAt: "2026-10-04T10:30:00.000Z",
      createdAt: "2026-10-04T09:45:00.000Z",
      updatedAt: "2026-10-04T10:30:00.000Z",
    },
    {
      _id: "jar_004",
      jarSerial: "KHADI-BERRY-2026-0002",
      hash: b2_Retail.hash,
      publicKey: sha256(`KHADI-BERRY-2026-0002|${b2_Retail.hash}`),
      packagingHash: b2_Pack.hash,
      sold: false,
      channel: "offline",
      storeName: "Khadi Gramodyog Bhavan, JLN Marg, Jaipur",
      offlineStoreId: "khadi-jaipur",
      verifyCount: 0,
      createdAt: "2026-10-04T09:45:00.000Z",
      updatedAt: "2026-10-04T09:45:00.000Z",
    },
  ];

  // 5. DBT Escrows
  const escrows = [
    {
      _id: "escrow_001",
      escrowId: "ESCROW-2026-ALW-001",
      lotHash: bPool.hash,
      extractionHash: b2.hash,
      collectionHash: b3.hash,
      beekeeper: "bk_rameshwar01",
      beekeeperName: "Rameshwar Patel",
      village: "Alwar Khurd",
      state: "Rajasthan",
      aadhaarMasked: "XXXXXXXX1234",
      aadhaarHash: sha256("892345671234"),
      upiVpa: "9876543210@upi",
      lotWeightKg: 14.5,
      mspRatePerKgInr: 225,
      totalAmountInr: 3262.5,
      status: "DISBURSED_DBT",
      collectionConfirmedAt: "2026-10-02T11:00:00.000Z",
      collectorName: "Aditya Verma",
      collectorCentre: "Alwar KVIC Node #4",
      cbrtiAttestedAt: "2026-10-03T16:00:00.000Z",
      cbrtiReport: {
        ca_number: "NABL-TC-8821",
        cert_hash: "9f8a7c6e5d4b3a210987654321fedcba0123456789abcdef",
        moisture: "17.8%",
        moistureVal: 17.8,
        c4_sugar_test: "1.2% (Pass < 7%)",
        c3_rice_syrup_test: "Absent (Pass)",
        passed: true,
        labTester: "Dr. Sneha Sharma (CBRTI Pune)",
      },
      disbursement: {
        method: "e_RUPI_VOUCHER",
        eRupiVoucherRef: "ERUPI-KVIC-2026-4401",
        transactionRef: "TXN-SBI-DBT-9920194",
        disbursedAt: "2026-10-03T17:00:00.000Z",
        beneficiaryBank: "State Bank of India (Aadhaar Seeding)",
        payoutStatus: "SUCCESS",
      },
      blockchainTxHash: bLab.hash,
      createdAt: "2026-10-02T08:30:00.000Z",
      updatedAt: "2026-10-03T17:00:00.000Z",
    },
    {
      _id: "escrow_002",
      escrowId: "ESCROW-2026-ALW-002",
      lotHash: bFreshHarvest.hash,
      extractionHash: bFreshHarvest.hash,
      collectionHash: null,
      beekeeper: "bk_rameshwar01",
      beekeeperName: "Rameshwar Patel",
      village: "Alwar Khurd",
      state: "Rajasthan",
      aadhaarMasked: "XXXXXXXX1234",
      aadhaarHash: sha256("892345671234"),
      upiVpa: "9876543210@upi",
      lotWeightKg: 16.0,
      mspRatePerKgInr: 225,
      totalAmountInr: 3600.0,
      status: "LOCKED_PENDING_COLLECTION",
      createdAt: "2026-10-04T12:00:00.000Z",
      updatedAt: "2026-10-04T12:00:00.000Z",
    },
  ];

  const fullStore = {
    beekeepers,
    users,
    blocks,
    jars,
    escrows,
    rti: [],
  };

  const storeFile = path.join(__dirname, "../data/runtime-store.json");
  fs.writeFileSync(storeFile, JSON.stringify(fullStore, null, 2), "utf8");

  console.log(`✅ Success! Seeded:`);
  console.log(`   - ${beekeepers.length} Beekeepers (Rameshwar Patel, Sunita Devi, Vikram Singh)`);
  console.log(`   - ${users.length} Users with Password 'Password@123':`);
  console.log(`       * Beekeeper: rameshwar@honeychain.org / 9876543210`);
  console.log(`       * KVIC Staff: kvic.officer@kvic.gov.in / 9820012345`);
  console.log(`       * CBRTI Lab:  qa.cbrti@kvic.gov.in / 9820099881`);
  console.log(`   - ${blocks.length} Cryptographic DAG Blocks:`);
  console.log(`       * 3 Farmer Branches converging into Collective Pool Lot`);
  console.log(`       * Transport -> Processing -> CBRTI Lab -> Packaging -> Distribution -> Retail Freeze`);
  console.log(`       * 1 Active Unfrozen Harvest Block for live testing`);
  console.log(`   - ${jars.length} Retail Jars ready for verification`);
  console.log(`   - ${escrows.length} DBT Escrows (1 Disbursed, 1 Locked Pending)`);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
