// Single source of truth for the honey workflow stages.
// Canonical order everywhere (page, graph, selects, filters):
// beekeeper → extraction → collection/collective (3, 3′) → transport
// → processing → lab → packaging → distribution → retail.

export const STAGE_ORDER = [
  "beekeeper_registration",
  "honey_extraction",
  "collection",
  "pooled",
  "transport",
  "processing",
  "lab_certified",
  "packaging",
  "distribution",
  "retail",
];

export const STAGE_LABEL = {
  beekeeper_registration: "Beekeeper Registration",
  honey_extraction: "Honey Extraction",
  collection: "Collection Phase 1",
  pooled: "Collective Pool",
  transport: "Transport",
  processing: "Processing & QC",
  lab_certified: "Lab Report",
  packaging: "Packaging & Labeling",
  distribution: "Distribution",
  retail: "Retail — Khadi India",
};

export const STAGE_SHORT = {
  beekeeper_registration: "Beekeeper",
  honey_extraction: "Extraction",
  collection: "Collection",
  pooled: "Collective",
  transport: "Transport",
  processing: "Processing",
  lab_certified: "Lab",
  packaging: "Packaging",
  distribution: "Distribution",
  retail: "Retail",
};

export const STAGE_ICON = {
  beekeeper_registration: "🐝",
  honey_extraction: "🍯",
  collection: "🤝",
  pooled: "🔗",
  transport: "🚚",
  processing: "🧪",
  lab_certified: "🔬",
  packaging: "🏷️",
  distribution: "📦",
  retail: "🏪",
};

// Workflow progress bar steps (page order). `num` is the diagram number;
// pooled shares 3 and lab shares 5 with a ′ marker in the UI.
export const WORKFLOW_STEPS = [
  { key: "beekeeper_registration", label: "Beekeeper", num: 1 },
  { key: "honey_extraction", label: "Extraction", num: 2 },
  { key: "collection", label: "Collection", num: 3 },
  { key: "pooled", label: "Collective", num: 3 },
  { key: "transport", label: "Transport", num: 4 },
  { key: "processing", label: "Processing", num: 5 },
  { key: "lab_certified", label: "Lab", num: 5 },
  { key: "packaging", label: "Packaging", num: 6 },
  { key: "distribution", label: "Distribution", num: 7 },
  { key: "retail", label: "Retail", num: 8 },
];
