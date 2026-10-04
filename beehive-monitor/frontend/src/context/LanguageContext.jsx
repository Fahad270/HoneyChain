import { createContext, useContext, useState } from "react";

const LanguageContext = createContext(null);

const TRANSLATIONS = {
  en: {
    // Navigation
    my_twin: "My Twin",
    hives: "Hives",
    harvest_log: "Harvest Log",
    custody_ledger: "Custody Ledger",
    public_ledger: "Public Ledger",
    dag_graph: "DAG Graph",
    map: "Map",
    centres: "Centres",
    ai_lab: "AI Lab",
    learn: "Learn",
    verify_jar: "Verify Jar",
    login: "Log in",
    logout: "Log out",

    // Beekeeper Harvest Logbook
    harvest_logbook_title: "Harvest Logbook",
    harvest_logbook_sub: "Official Apiary Harvest Logbook · Log honey yields, speak via voice SLM, and track KVIC procurement at MSP (₹225/kg).",
    custody_ledger_title: "Blockchain Custody Ledger",
    public_ledger_title: "Public Blockchain Ledger",
    my_harvest_entries: "My Harvest Entries",
    local_logbook_offline: "Local Apiary Logbook · Offline-Ready",
    local_logbook_desc: "Harvest records are stored locally with offline timestamps and can be synced at the village KVIC centre.",
    sync_with_kvic: "Sync with KVIC Node",
    records_logged: "Records Logged",
    registered_apiary: "Registered Apiary (Genesis)",
    honey_harvest: "Honey Harvest",
    hive_number: "Hive Number",
    honey_yield: "Honey Yield",
    floral_source: "Floral Source",
    kvic_msp: "KVIC MSP (₹225/kg)",
    verify_purity_cert: "Verify Purity Certificate",
    show_harvest_qr: "Show Harvest QR",
    hide_qr: "Hide QR",
    proof_hash: "Proof Hash",
    ready_for_kvic: "Ready for Village KVIC Collection",
    fssai_standards_title: "Pre-Harvest Field Standards (FSSAI / Agmark)",
    track_honey_beyond: "Track Your Honey Beyond The Apiary",
    track_honey_desc: "Want to see which Khadi store your honey lot reached after KVIC collection and CBRTI testing?",
    open_my_twin: "Open My Twin (Traceability Journey) →",
    mustard: "Mustard",
    multiflora: "Multiflora",

    // Consumer Passport
    passport_title: "Khadi Honey Passport",
    passport_sub: "Official digital purity certificate & farm-to-shelf provenance record",
    verify_title: "Verify Authenticity",
    verify_sub: "Khadi counters + ekhadiindia.com orders · public, no login · paste the hash from the jar QR",
    emblem: "KVIC Honey Mission · Ministry of MSME, Govt. of India",
    hero_title: "Certified Pure Khadi Honey Passport",
    hero_desc: "Direct-from-apiary traceability verified on HoneyChain’s tamper-proof cryptographic ledger. Every batch tested for zero synthetic adulteration and backed by fair farmer procurement at official MSP.",
    purity_stamp: "100% Pure Honey · Authenticity Guaranteed",
    genuine_verified: "Genuine HoneyChain Verified",
    batch_details: "Honey Batch & Origin Details",
    cbrti_attestation: "CBRTI Pune Quality & Purity Attestation",
    cbrti_sub: "Central Bee Research & Training Institute, Pune • Apex NABL Honey Laboratory",
    farm_to_spoon: "Farm-to-Spoon Journey",
    register_bill_btn: "Register / Verify Store Purchase Bill",
    view_dag_btn: "View Blockchain Technical Hashes & DAG (Auditors)",
  },
  hi: {
    // Navigation
    my_twin: "मेरी डिजिटल ट्विन",
    hives: "मधुमक्खी छत्ते",
    harvest_log: "मधु पुस्तिका",
    custody_ledger: "कस्टडी लेजर",
    public_ledger: "सार्वजनिक लेजर",
    dag_graph: "डीएजी ग्राफ",
    map: "नक्शा",
    centres: "केवीआईसी केंद्र",
    ai_lab: "एआई लैब",
    learn: "सीखें",
    verify_jar: "जार सत्यापन",
    login: "लॉग इन",
    logout: "लॉग आउट",

    // Beekeeper Harvest Logbook
    harvest_logbook_title: "मधु पुस्तिका",
    harvest_logbook_sub: "आधिकारिक मधुमक्खी फार्म लॉगबुक · शहद उत्पादन दर्ज करें, ध्वनि एसएलएम से बोलें, और एमएसपी (₹225/किग्रा) पर केवीआईसी खरीद ट्रैक करें।",
    custody_ledger_title: "ब्लॉकचेन कस्टडी लेजर",
    public_ledger_title: "सार्वजनिक ब्लॉकचेन लेजर",
    my_harvest_entries: "मेरी शहद निकासी प्रविष्टियां",
    local_logbook_offline: "स्थानीय मधु पुस्तिका · ऑफलाइन-सक्षम",
    local_logbook_desc: "शहद रिकॉर्ड स्थानीय रूप से ऑफलाइन सुरक्षित हैं और गांव के केवीआईसी केंद्र पर नेटवर्क मिलने पर सिंक किए जा सकते हैं।",
    sync_with_kvic: "केवीआईसी नोड से सिंक करें",
    records_logged: "रिकॉर्ड दर्ज",
    registered_apiary: "पंजीकृत एपियरी (उत्पत्ति ब्लॉक)",
    honey_harvest: "शहद निकासी",
    hive_number: "छत्ता संख्या",
    honey_yield: "शहद की मात्रा",
    floral_source: "पुष्प स्रोत",
    kvic_msp: "केवीआईसी समर्थन मूल्य (₹225/किग्रा)",
    verify_purity_cert: "शुद्धता प्रमाणपत्र देखें",
    show_harvest_qr: "क्यूआर कोड दिखाएं",
    hide_qr: "क्यूआर छिपाएं",
    proof_hash: "प्रमाण हैश",
    ready_for_kvic: "गांव केवीआईसी संग्रह हेतु तैयार",
    fssai_standards_title: "निकासी पूर्व मानक (FSSAI / एगमार्क)",
    track_honey_beyond: "एपियरी से आगे अपने शहद को ट्रैक करें",
    track_honey_desc: "जानना चाहते हैं कि संग्रह और सीबीआरटीआई परीक्षण के बाद आपका शहद किस खादी स्टोर तक पहुंचा?",
    open_my_twin: "मेरी ट्विन खोलें (सफर देखें) →",
    mustard: "सरसों",
    multiflora: "मल्टीफ्लोरा",

    // Consumer Passport
    passport_title: "खादी हनी पासपोर्ट",
    passport_sub: "आधिकारिक डिजिटल शुद्धता प्रमाणपत्र और खेत से दुकान तक का रिकॉर्ड",
    verify_title: "प्रामाणिकता सत्यापित करें",
    verify_sub: "खादी काउंटर + ekhadiindia.com ऑर्डर · सार्वजनिक, कोई लॉगिन आवश्यक नहीं · जार क्यूआर का हैश दर्ज करें",
    emblem: "केवीआईसी हनी मिशन · एमएसएमई मंत्रालय, भारत सरकार",
    hero_title: "प्रमाणित शुद्ध खादी हनी पासपोर्ट",
    hero_desc: "हनीचेन के अपरिवर्तनीय लेजर पर प्रत्यक्ष ट्रेसिबिलिटी। प्रत्येक बैच शून्य मिलावट हेतु परीक्षित और किसान को एमएसपी भुगतान की गारंटी।",
    purity_stamp: "100% शुद्ध शहद · प्रामाणिकता की पूर्ण गारंटी",
    genuine_verified: "हनीचेन द्वारा प्रमाणित शुद्ध",
    batch_details: "शहद बैच व स्रोत विवरण",
    cbrti_attestation: "सीबीआरटीआई पुणे गुणवत्ता व शुद्धता सत्यापन",
    cbrti_sub: "केंद्रीय मधुमक्खी अनुसंधान एवं प्रशिक्षण संस्थान, पुणे • शीर्ष एनएबीएल प्रयोगशाला",
    farm_to_spoon: "खेत से चम्मच तक का सफर",
    register_bill_btn: "दुकान बिल दर्ज / सत्यापित करें",
    view_dag_btn: "तकनीकी ब्लॉकचेन हैश और डीएजी देखें (ऑडिटर्स)",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("honeychain_lang") || "en";
    } catch {
      return "en";
    }
  });

  const toggleLanguage = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    try {
      localStorage.setItem("honeychain_lang", next);
    } catch {}
  };

  const setLanguage = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem("honeychain_lang", newLang);
    } catch {}
  };

  const t = (key, fallback = "") => {
    return TRANSLATIONS[lang]?.[key] || fallback || TRANSLATIONS.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: "en",
      toggleLanguage: () => {},
      setLanguage: () => {},
      t: (k, fb) => fb || k,
    };
  }
  return ctx;
}
