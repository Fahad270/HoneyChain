// Evaluation harness for Slice 2: Voice Harvest Extraction & Confirm-Before-Commit.
// Workstream F & Gate 2 requirement:
// "Voice logging and disease-conditioned advisory work end-to-end offline. The eval harness runs automatically."
// Runs standalone on Node with zero external deps.

const assert = require("assert");
const { parseVoiceHarvest } = require("../../backend/services/voiceHarvestService");

const CASES = [
  {
    id: "standard-word-numbers",
    text: "Log twelve kilos of mustard honey from hive three today",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-03",
    expectWeight: 12,
    expectFlower: "mustard",
  },
  {
    id: "numeric-decimal-litchi",
    text: "Recorded 15.5 kg litchi honey from box 2 on 2026-10-03",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-02",
    expectWeight: 15.5,
    expectFlower: "litchi",
  },
  {
    id: "asr-noise-phonetic",
    text: "log twelf kilo mustered honey from hive free",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-03",
    expectWeight: 12,
    expectFlower: "mustard",
  },
  {
    id: "hinglish-harvest",
    text: "aaj hive 5 se 8 kilo shahad nikala",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-05",
    expectWeight: 8,
  },
  {
    id: "devanagari-sarson",
    text: "बॉक्स 4 से 10 किलो सरसों का शहद निकाला",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-04",
    expectWeight: 10,
    expectFlower: "mustard",
  },
  {
    id: "yesterday-relative-date",
    text: "Harvested 20 kg eucalyptus from hive 7 yesterday",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-07",
    expectWeight: 20,
    expectFlower: "eucalyptus",
  },
  {
    id: "missing-weight-clarify",
    text: "Log mustard honey from hive 3",
    expectStatus: "needs_clarification",
    expectMissing: "weight_kg",
  },
  {
    id: "missing-hive-clarify",
    text: "Extracted 14 kilos of sunflower honey",
    expectStatus: "needs_clarification",
    expectMissing: "hive_id",
  },
  {
    id: "empty-transcript-clarify",
    text: "",
    expectStatus: "needs_clarification",
  },
  {
    id: "vague-transcript-clarify",
    text: "I collected honey today",
    expectStatus: "needs_clarification",
  },
  {
    id: "confirm-review-structure-present",
    text: "Hive 8 produced 25 kg acacia honey",
    expectStatus: "needs_confirmation",
    checkReviewCard: true,
  },
  {
    id: "user-colloquial-hinglish-origin",
    text: "aaj bara kg honey tha from 3",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-03",
    expectWeight: 12,
  },
  {
    id: "hindi-postposition-origin",
    text: "3 se 15 kilo nikala",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-03",
    expectWeight: 15,
  },
  {
    id: "spoken-number-peti-litchi",
    text: "chaar number peti se dus kilo litchi nikala",
    expectStatus: "needs_confirmation",
    expectHive: "HIVE-04",
    expectWeight: 10,
    expectFlower: "litchi",
  },
];

function run() {
  let passed = 0;
  for (const c of CASES) {
    const res = parseVoiceHarvest(c.text);
    assert.strictEqual(res.status, c.expectStatus, `${c.id}: status mismatch (got ${res.status}, expected ${c.expectStatus})`);

    if (c.expectStatus === "needs_confirmation") {
      if (c.expectHive) {
        assert.strictEqual(res.extracted.hive_id, c.expectHive, `${c.id}: hive mismatch`);
      }
      if (c.expectWeight) {
        assert.strictEqual(res.extracted.weight_kg, c.expectWeight, `${c.id}: weight mismatch`);
      }
      if (c.expectFlower) {
        assert.strictEqual(res.extracted.flower_source, c.expectFlower, `${c.id}: flower mismatch`);
      }
      if (c.checkReviewCard) {
        assert.ok(res.reviewCard, `${c.id}: reviewCard must be present`);
        assert.ok(res.reviewCard.fields.length >= 4, `${c.id}: reviewCard must have >=4 fields`);
      }
      assert.strictEqual(res.verdict, "confirm", `${c.id}: verdict must be confirm`);
      assert.strictEqual(res.stagedCall.name, "log_extraction", `${c.id}: stagedCall name must be log_extraction`);
    }

    if (c.expectMissing) {
      assert.ok(res.missing.includes(c.expectMissing), `${c.id}: expected missing ${c.expectMissing}`);
    }

    console.log(`PASS ${c.id} -> ${res.status}`);
    passed++;
  }

  console.log(`\n${passed}/${CASES.length} voice harvest eval cases pass\n`);
}

run();
