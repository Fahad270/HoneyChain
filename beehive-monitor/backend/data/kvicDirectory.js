// Real-world KVIC / Khadi / allied-government directory.
//
// Every entry traces to a published source (see CENTRE_SOURCES). Addresses,
// PINs, phones and emails are transcribed from those sources — NOT invented.
// `lat/lng` are city-level APPROXIMATE map pins (coordApprox: true); use the
// street address for anything exact.
//
// verified: 'official'  = kvic.gov.in / nbb.gov.in / PMEGP office directory
//           'directory' = reputable third-party business/government listings
// kind: kvic (Commission office) | khadi (Khadi Gramodyog Bhavan store)
//       | training (CBRTI/MDTC) | gov (allied govt institution)
// level: headquarters | zonal | state | divisional | store | institute

const CENTRE_SOURCES = {
  pmegp_dir: {
    label: "PMEGP official office directory (KVIC + KVIB + DIC addresses, phones, emails, PINs)",
    url: "https://www.kviconline.gov.in/pmegp/pmegpweb/docs/jsp/officeAddress.jsp",
  },
  kvic_contacts: {
    label: "KVIC zonal / CPIO / training-centre contact compilation (phones, @kvic.gov.in emails)",
    url: "https://www.indiacustomercare.com/khadi-and-village-industries-commission-inquiry-number",
  },
  cbrti: {
    label: "CBRTI Pune — kvic.gov.in institute page (est. 1962, 15 SBECs, 100 institutions)",
    url: "https://www.kvic.gov.in/kvicres/newhm/cbrtintro.html",
  },
  sbec_pdf: {
    label: "Address of Beekeeping Industry under KVIC — 15 State Beekeeping Extension Centres (official PDF)",
    url: "https://www.kvic.gov.in/kvicres/update/BeeKeep_SBEC_Address.pdf",
  },
  nbb: {
    label: "National Bee Board — nbb.gov.in + official contact directory",
    url: "https://nbb.gov.in/",
  },
  bhavan_listings: {
    label: "Khadi Gramodyog Bhavan directory listings (address, phones, coords)",
    url: "https://www.kvic.gov.in/kvicres/contactbhavans.php",
  },
};

// ids kvic-mumbai … kvic-guwahati + nbb-*/khadi-* are stable: honey-belt
// clusters and existing accounts reference them. Do not rename.
const KVIC_CENTRES = [
  // ---- Headquarters ----
  { id: "kvic-mumbai", name: "KVIC Central Office (Headquarters)", kind: "kvic", level: "headquarters", city: "Mumbai", state: "Maharashtra", lat: 19.1076, lng: 72.8365, coordApprox: true, address: "Gramodaya, 3 Irla Road, Vile Parle (West), Mumbai 400056", pin: "400056", phone: "022-69168900", email: "ceo.kvic@gov.in", source: "kvic_contacts", verified: "official" },

  // ---- Zonal offices ----
  { id: "kvic-zo-delhi", name: "KVIC North Zone — Resident Representative Office", kind: "kvic", level: "zonal", city: "New Delhi", state: "Delhi", lat: 28.633, lng: 77.244, coordApprox: true, address: "KVIC Pavilion, Gate No. 4, Gandhi Darshan, Opp. Rajghat, New Delhi 110002", pin: "110002", phone: "011-23724695", email: "rrkvic.kvic@gov.in", source: "kvic_contacts", verified: "official" },
  { id: "kvic-zo-kolkata", name: "KVIC East Zone Office", kind: "kvic", level: "zonal", city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, coordApprox: true, address: "Zonal Office, KVIC, Kolkata (CPIO desk 033-22112762)", pin: "", phone: "033-22112762", email: "zonez.kvic@gov.in", source: "kvic_contacts", verified: "official" },
  { id: "kvic-zo-guwahati", name: "KVIC North-East Zone Office", kind: "kvic", level: "zonal", city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, coordApprox: true, address: "Zonal Office, KVIC, Guwahati (0361-2461024)", pin: "", phone: "0361-2461024", email: "zoez.kvic@gov.in", source: "kvic_contacts", verified: "official" },
  { id: "kvic-zo-bengaluru", name: "KVIC South Zone Office", kind: "kvic", level: "zonal", city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, coordApprox: true, address: "Zonal Office, KVIC, Bengaluru (080-26620067)", pin: "", phone: "080-26620067", email: "zosz.kvic@gov.in", source: "kvic_contacts", verified: "official" },

  // ---- State offices (PMEGP official directory) ----
  { id: "kvic-delhi", name: "KVIC State Office — Delhi", kind: "kvic", level: "state", city: "New Delhi", state: "Delhi", lat: 28.6315, lng: 77.2167, coordApprox: true, address: "K-Block, Chaudhary Building, Connaught Circus, New Delhi 110001", pin: "110001", phone: "011-23412796", email: "sodelhi.kvic@gov.in", source: "kvic_contacts", verified: "official" },
  { id: "kvic-kolkata", name: "KVIC State Office — Kolkata", kind: "kvic", level: "state", city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, coordApprox: true, address: "33, Chittaranjan Avenue, 6th & 7th Floor, Kolkata 700012", pin: "700012", phone: "033-22112762", email: "so.kolkata@kvic.gov.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-chennai", name: "KVIC State Office — Chennai", kind: "kvic", level: "state", city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, coordApprox: true, address: "326, Avvai Shanmugham Road, Gopalapuram, Chennai 600086", pin: "600086", phone: "044-28351019", email: "sokvicch@md4.vsnl.net.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-bengaluru", name: "KVIC State Office — Bengaluru", kind: "kvic", level: "state", city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, coordApprox: true, address: "Vijinapura, Dooravani Nagar Post, Bengaluru 560016", pin: "560016", phone: "080-25665884", email: "director_so_kvic_blr@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-ahmedabad", name: "KVIC State Office — Ahmedabad", kind: "kvic", level: "state", city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, coordApprox: true, address: "State Office, KVIC, Ahmedabad — exact address via PMEGP office directory", pin: "", phone: "079-26579965", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kvic-lucknow", name: "KVIC State Office — Lucknow", kind: "kvic", level: "state", city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, coordApprox: true, address: "Gramodaya, Indira Nagar, Faizabad Road, Lucknow 226016", pin: "226016", phone: "0522-2354511", email: "kvic.lko2011@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-bhopal", name: "KVIC State Office — Bhopal", kind: "kvic", level: "state", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, coordApprox: true, address: "B-3/4, Office Complex, Gautam Nagar, Bhopal 462023", pin: "462023", phone: "0755-2583668", email: "kvicbhopal@gmail.co.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-hyderabad", name: "KVIC State Office — Hyderabad (Telangana)", kind: "kvic", level: "state", city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, coordApprox: true, address: "Gandhi Bhavan, M.J. Road, Nampally, Hyderabad 500001", pin: "500001", phone: "", email: "kvichyd@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-guwahati", name: "KVIC State Office — Guwahati", kind: "kvic", level: "state", city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, coordApprox: true, address: "State Office, KVIC, Guwahati (0361-2461126)", pin: "", phone: "0361-2461126", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kvic-jaipur", name: "KVIC State Office — Jaipur", kind: "kvic", level: "state", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, coordApprox: true, address: "Jhalana Doongri, Institutional Area, J.L.N. Marg, Jaipur 302004", pin: "302004", phone: "0141-2707850", email: "kvicjpr@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-bhubaneswar", name: "KVIC State Office — Bhubaneswar", kind: "kvic", level: "state", city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, coordApprox: true, address: "J/16, Bhimpur, Gandamunda, Khandagiri, Bhubaneswar 751030", pin: "751030", phone: "0674-2311297", email: "kvicbbsr@bsnl.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-chandigarh", name: "KVIC State Office — Chandigarh (Punjab)", kind: "kvic", level: "state", city: "Chandigarh", state: "Punjab", lat: 30.7333, lng: 76.7794, coordApprox: true, address: "S.C.O. 3003-04, Sector 22-D, Chandigarh 160022", pin: "160022", phone: "0172-2701261", email: "sokvic_chd@rediffmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-trivandrum", name: "KVIC State Office — Thiruvananthapuram", kind: "kvic", level: "state", city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, coordApprox: true, address: "Gramodaya, M.G. Road, Thiruvananthapuram 695001", pin: "695001", phone: "0471-2331625", email: "kvictvm@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-dehradun", name: "KVIC State Office — Dehradun", kind: "kvic", level: "state", city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322, coordApprox: true, address: "Gen. Mahadev Singh Road, Kanwali, Dehradun 248001", pin: "248001", phone: "0135-2724709", email: "sodehradun@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-raipur", name: "KVIC State Office — Raipur", kind: "kvic", level: "state", city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, coordApprox: true, address: "817/6-7, 1st Floor, Anil Bhawan, Bilaspur Road, Fafadih, Raipur 492001", pin: "492001", phone: "", email: "sokvicrpr@sify.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-ranchi", name: "KVIC State Office — Ranchi", kind: "kvic", level: "state", city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096, coordApprox: true, address: "Shanti Bhavan, Albert Ekka Chowk, Main Road, Ranchi 834001", pin: "834001", phone: "", email: "stateoffice_ranchi@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-shimla", name: "KVIC State Office — Shimla", kind: "kvic", level: "state", city: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734, coordApprox: true, address: "Cleave Land, Chaura Maidan, Shimla 171004", pin: "171004", phone: "0177-2806528", email: "so.kvicshimla@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-ambala", name: "KVIC State Office — Ambala Cantt (Haryana)", kind: "kvic", level: "state", city: "Ambala", state: "Haryana", lat: 30.3782, lng: 76.7767, coordApprox: true, address: "103-A, The Mall, P.B. No. 34, Ambala Cantt 133001", pin: "133001", phone: "0171-2630334", email: "kvicamb@rediffmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-jammu", name: "KVIC State Office — Jammu", kind: "kvic", level: "state", city: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lng: 74.857, coordApprox: true, address: "384, Shastri Nagar, Jammu-Tawi 180004", pin: "180004", phone: "0191-2458333", email: "kvicjmu@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-shillong", name: "KVIC State Office — Shillong", kind: "kvic", level: "state", city: "Shillong", state: "Meghalaya", lat: 25.5788, lng: 91.8933, coordApprox: true, address: "Ward No. 8, Oakland, Shillong 793001", pin: "793001", phone: "0364-2227807", email: "so.shillong@kvic.gov.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-imphal", name: "KVIC State Office — Imphal", kind: "kvic", level: "state", city: "Imphal", state: "Manipur", lat: 24.817, lng: 93.9368, coordApprox: true, address: "Paona Bazar, Imphal 795001", pin: "795001", phone: "0385-2451759", email: "kvicimp@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-aizawl", name: "KVIC State Office — Aizawl", kind: "kvic", level: "state", city: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176, coordApprox: true, address: "D-66, C. Thansanga Building, Sikulpuikawn, Republic Road, Aizawl 796001", pin: "796001", phone: "0389-2316387", email: "kvic_azl@yahoo.co.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-dimapur", name: "KVIC State Office — Dimapur", kind: "kvic", level: "state", city: "Dimapur", state: "Nagaland", lat: 25.9044, lng: 93.7266, coordApprox: true, address: "Super Market Complex, Dimapur 797112", pin: "797112", phone: "03862-226546", email: "athubakvic@yahoo.co.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-gangtok", name: "KVIC State Office — Gangtok", kind: "kvic", level: "state", city: "Gangtok", state: "Sikkim", lat: 27.3389, lng: 88.6065, coordApprox: true, address: "Indira Bypass, Near SDF Bhavan, Tadong, Gangtok 737102", pin: "737102", phone: "03592-280696", email: "kvic_gtk@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-agartala", name: "KVIC State Office — Agartala", kind: "kvic", level: "state", city: "Agartala", state: "Tripura", lat: 23.8315, lng: 91.2868, coordApprox: true, address: "Asam-Agartala Road, Kamarpukurpar, Agartala 799004", pin: "799004", phone: "0381-2223735", email: "agt2209648@bsnl.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-patna", name: "KVIC State Office — Patna", kind: "kvic", level: "state", city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, coordApprox: true, address: "State Office, KVIC, Patna — exact address via PMEGP office directory", pin: "", phone: "0612-2224983", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kvic-panaji", name: "KVIC State Office — Panaji", kind: "kvic", level: "state", city: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278, coordApprox: true, address: "State Office, KVIC, Panaji — exact address via PMEGP office directory", pin: "", phone: "0832-2223676", email: "", source: "kvic_contacts", verified: "official" },

  // ---- Divisional offices (honey-belt + major, PMEGP directory) ----
  { id: "kvic-do-nagpur", name: "KVIC Divisional Office — Nagpur", kind: "kvic", level: "divisional", city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, coordApprox: true, address: "Somalwar Bhawan, 2nd Floor, Mount Extension Road, Sadar, Nagpur 440001", pin: "440001", phone: "0712-2565151", email: "kvicngp@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-varanasi", name: "KVIC Divisional Office — Varanasi", kind: "kvic", level: "divisional", city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, coordApprox: true, address: "Sanskrit University Marg, Telia Bagh, Varanasi 221002", pin: "221002", phone: "0542-2204434", email: "kvicvaranasi@yahoo.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-gorakhpur", name: "KVIC Divisional Office — Gorakhpur", kind: "kvic", level: "divisional", city: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, coordApprox: true, address: "Plot No. BL-3, Sector-7, GIDA, P.O. Sahajanwa, Gorakhpur 273209", pin: "273209", phone: "0551-2344943", email: "dogorakhpur@kvic.gov.in", source: "kvic_contacts", verified: "official" },
  { id: "kvic-do-meerut", name: "KVIC Divisional Office — Meerut", kind: "kvic", level: "divisional", city: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lng: 77.7064, coordApprox: true, address: "Near Old Chungi Ghar Road, Meerut 250001", pin: "250001", phone: "", email: "kvicrom@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-madurai", name: "KVIC Divisional Office — Madurai", kind: "kvic", level: "divisional", city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, coordApprox: true, address: "10, Bypass Road, Near PRC Depot, Madurai 625010", pin: "625010", phone: "0452-2386792", email: "kvic@md4.vsnl.net.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-vizag", name: "KVIC Divisional Office — Visakhapatnam", kind: "kvic", level: "divisional", city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, coordApprox: true, address: "13-28-8, Srihari Plaza, Dandu Bazar, Maharanipeta, Visakhapatnam 530002", pin: "530002", phone: "0891-2565904", email: "kvicvizag@gmail.com", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-bikaner", name: "KVIC Divisional Office — Bikaner", kind: "kvic", level: "divisional", city: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119, coordApprox: true, address: "Kishan Bhawan, Sriganganagar Road, Bikaner 334001", pin: "334001", phone: "0151-2250171", email: "dobikaner.kvic@gov.in", source: "pmegp_dir", verified: "official" },
  { id: "kvic-do-hubballi", name: "KVIC Divisional Office — Hubballi", kind: "kvic", level: "divisional", city: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.124, coordApprox: true, address: "Divisional Office, KVIC, Hubballi (0836-2282882)", pin: "", phone: "0836-2282882", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kvic-do-siliguri", name: "KVIC Divisional Office — Siliguri", kind: "kvic", level: "divisional", city: "Siliguri", state: "West Bengal", lat: 26.7271, lng: 88.3953, coordApprox: true, address: "Divisional Office, KVIC, Siliguri (0353-2568100)", pin: "", phone: "0353-2568100", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kvic-do-portblair", name: "KVIC Divisional Office — Port Blair", kind: "kvic", level: "divisional", city: "Port Blair", state: "Andaman & Nicobar", lat: 11.6234, lng: 92.7265, coordApprox: true, address: "Udyog Parisar, Middle Point, Port Blair 744101", pin: "744101", phone: "03192-233301", email: "", source: "pmegp_dir", verified: "official" },

  // ---- Khadi Gramodyog Bhavans (flagship Khadi retail) ----
  { id: "kgb-delhi", name: "Khadi Gramodyog Bhavan — Connaught Place", kind: "khadi", level: "store", city: "New Delhi", state: "Delhi", lat: 28.6339, lng: 77.2236, coordApprox: false, address: "24, Regal Building, Connaught Circus, New Delhi 110001 (listed on kvic.gov.in Khadi Bhavans page)", pin: "110001", phone: "011-23360902", email: "kgb.newdelhi@kvic.gov.in", source: "bhavan_listings", verified: "directory" },
  { id: "kgb-ernakulam", name: "Khadi Gramodyog Bhavan — Ernakulam", kind: "khadi", level: "store", city: "Ernakulam", state: "Kerala", lat: 9.9816, lng: 76.2999, coordApprox: true, address: "K.G. Bhavan, Ernakulam (0484-2355279)", pin: "", phone: "0484-2355279", email: "", source: "kvic_contacts", verified: "official" },
  { id: "kgb-goa", name: "Khadi Gramodyog Bhavan — Goa", kind: "khadi", level: "store", city: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278, coordApprox: true, address: "Listed on kvic.gov.in Khadi Bhavans page — exact address via KVIC", pin: "", phone: "", email: "", source: "bhavan_listings", verified: "directory" },

  // ---- Beekeeping training + allied government ----
  { id: "cbrti-pune", name: "Central Bee Research & Training Institute (CBRTI)", kind: "training", level: "institute", city: "Pune", state: "Maharashtra", lat: 18.531, lng: 73.847, coordApprox: true, address: "1153, Ganeshkhind Road (Nr. HP Petrol Pump, University Road), Shivajinagar, Pune 411016 — apex institute since 1962; 15 State Beekeeping Extension Centres, 100 registered institutions", pin: "411016", phone: "9594829758", email: "cbrti.pune@kvic.gov.in", source: "cbrti", verified: "official" },
  { id: "nbb-delhi", name: "National Bee Board (NBHM)", kind: "gov", level: "board", city: "New Delhi", state: "Delhi", lat: 28.616, lng: 77.214, coordApprox: true, address: "B Wing, IInd Floor, Janpath Bhawan, Janpath, New Delhi 110001 — Dept. of Agriculture & Farmers Welfare", pin: "110001", phone: "011-23325265", email: "nbb-nbhm@gov.in", source: "nbb", verified: "official" },
];

module.exports = { KVIC_CENTRES, CENTRE_SOURCES };
