// Public, approximate locations of KVIC / Khadi / allied centres (not an official GIS dump).
// Clusters sit in known honey belts around those nodal offices.
// NOTE: KVIC_CENTRES now lives in kvicDirectory.js — real published addresses
// (PMEGP office directory, kvic.gov.in, nbb.gov.in) with per-entry sources.
// Centre `id`s are stable: honey-belt clusters reference them via kvicId.

const { KVIC_CENTRES } = require("./kvicDirectory");

const CLUSTERS = [
  {
    id: "cl-konkan",
    name: "Konkan–Sahyadri honey belt",
    kvicId: "kvic-mumbai",
    state: "Maharashtra",
    lat: 18.98,
    lng: 73.12,
    flower: "karvi / jamun / multiflora",
    collector: { name: "Sunita Patil", org: "Raigad Madhu Collective", phone: "9876500101" },
    farmers: [
      { name: "Ramesh More", village: "Mahad", colonies: 42, lat: 18.083, lng: 73.42, phone: "9876501001" },
      { name: "Lata Jadhav", village: "Poladpur", colonies: 28, lat: 17.98, lng: 73.47, phone: "9876501002" },
      { name: "Iqbal Shaikh", village: "Pen", colonies: 35, lat: 18.737, lng: 73.096, phone: "9876501003" },
    ],
  },
  {
    id: "cl-doon",
    name: "Doab–Himalayan foothills",
    kvicId: "kvic-dehradun",
    state: "Uttarakhand",
    lat: 30.15,
    lng: 78.28,
    flower: "lychee / mustard / wild flora",
    collector: { name: "Prakash Negi", org: "Garhwal Honey FPO", phone: "9876500201" },
    farmers: [
      { name: "Meera Bisht", village: "Rishikesh", colonies: 55, lat: 30.0869, lng: 78.2676, phone: "9876502001" },
      { name: "Harish Rawat", village: "Srinagar Garhwal", colonies: 40, lat: 30.22, lng: 78.78, phone: "9876502002" },
    ],
  },
  {
    id: "cl-sundarban",
    name: "Sundarbans mangrove honey",
    kvicId: "kvic-kolkata",
    state: "West Bengal",
    lat: 22.15,
    lng: 88.75,
    flower: "kewda / mangrove",
    collector: { name: "Anirban Mondal", org: "Sundarban Khadi Samiti", phone: "9876500301" },
    farmers: [
      { name: "Fatima Bibi", village: "Gosaba", colonies: 22, lat: 22.165, lng: 88.798, phone: "9876503001" },
      { name: "Sourav Halder", village: "Basanti", colonies: 18, lat: 22.2, lng: 88.72, phone: "9876503002" },
    ],
  },
  {
    id: "cl-coimbatore",
    name: "Western Ghats – Coimbatore",
    kvicId: "kvic-chennai",
    state: "Tamil Nadu",
    lat: 11.02,
    lng: 76.96,
    flower: "rubber / coffee / multiflora",
    collector: { name: "K. Selvam", org: "Kongu Bee Cooperative", phone: "9876500401" },
    farmers: [
      { name: "Lakshmi Palanisamy", village: "Valparai", colonies: 60, lat: 10.328, lng: 76.955, phone: "9876504001" },
      { name: "Murugan R", village: "Pollachi", colonies: 33, lat: 10.658, lng: 77.008, phone: "9876504002" },
    ],
  },
  {
    id: "cl-kodagu",
    name: "Kodagu coffee-honey cluster",
    kvicId: "kvic-bengaluru",
    state: "Karnataka",
    lat: 12.42,
    lng: 75.74,
    flower: "coffee / silver oak",
    collector: { name: "Ashwini Ponnappa", org: "Kodagu Honey Collective", phone: "9876500501" },
    farmers: [
      { name: "Nanjappa C", village: "Madikeri", colonies: 48, lat: 12.4244, lng: 75.7382, phone: "9876505001" },
      { name: "Divya Gowda", village: "Virajpet", colonies: 27, lat: 12.196, lng: 75.805, phone: "9876505002" },
    ],
  },
  {
    id: "cl-kutch",
    name: "Kutch–Saurashtra dryland",
    kvicId: "kvic-ahmedabad",
    state: "Gujarat",
    lat: 23.25,
    lng: 69.67,
    flower: "prosopis / cumin / desert flora",
    collector: { name: "Jignesh Jadeja", org: "Kutch Khadi Mandal", phone: "9876500601" },
    farmers: [
      { name: "Asha Rabari", village: "Bhuj", colonies: 20, lat: 23.242, lng: 69.667, phone: "9876506001" },
    ],
  },
  {
    id: "cl-bundelkhand",
    name: "Bundelkhand mustard belt",
    kvicId: "kvic-bhopal",
    state: "Madhya Pradesh",
    lat: 24.6,
    lng: 78.4,
    flower: "mustard / berseem",
    collector: { name: "Ravi Tiwari", org: "Bundelkhand Madhu Sangh", phone: "9876500701" },
    farmers: [
      { name: "Geeta Ahirwar", village: "Chhatarpur", colonies: 36, lat: 24.917, lng: 79.581, phone: "9876507001" },
      { name: "Mohan Singh", village: "Sagar", colonies: 24, lat: 23.8388, lng: 78.7378, phone: "9876507002" },
    ],
  },
  {
    id: "cl-terai",
    name: "UP Terai litchi–mustard",
    kvicId: "kvic-lucknow",
    state: "Uttar Pradesh",
    lat: 27.15,
    lng: 81.0,
    flower: "litchi / mustard",
    collector: { name: "Neelam Verma", org: "Awadh Honey FPO", phone: "9876500801" },
    farmers: [
      { name: "Abdul Rahman", village: "Bahraich", colonies: 31, lat: 27.574, lng: 81.594, phone: "9876508001" },
    ],
  },
  {
    id: "cl-kullu",
    name: "Himachal hill apiaries",
    kvicId: "kvic-chandigarh",
    state: "Himachal Pradesh",
    lat: 31.96,
    lng: 77.11,
    flower: "apple blossom / wild flora",
    collector: { name: "Suresh Thakur", org: "Kullu Bee Cooperative", phone: "9876500901" },
    farmers: [
      { name: "Poonam Sharma", village: "Manali", colonies: 19, lat: 32.2396, lng: 77.1887, phone: "9876509001" },
      { name: "Vijay Chauhan", village: "Kullu", colonies: 44, lat: 31.9578, lng: 77.1095, phone: "9876509002" },
    ],
  },
  {
    id: "cl-wayanad",
    name: "Wayanad forest honey",
    kvicId: "kvic-trivandrum",
    state: "Kerala",
    lat: 11.685,
    lng: 76.132,
    flower: "forest multiflora",
    collector: { name: "Anitha Varghese", org: "Wayanad Khadi Honey", phone: "9876501101" },
    farmers: [
      { name: "Thomas Mathew", village: "Kalpetta", colonies: 29, lat: 11.610, lng: 76.083, phone: "9876511001" },
    ],
  },
  {
    id: "cl-northeast",
    name: "Brahmaputra valley cluster",
    kvicId: "kvic-guwahati",
    state: "Assam",
    lat: 26.2,
    lng: 92.0,
    flower: "mustard / litchi / wild",
    collector: { name: "Bikash Das", org: "Assam Bee Keepers Sangha", phone: "9876501201" },
    farmers: [
      { name: "Nirmali Deka", village: "Nagaon", colonies: 38, lat: 26.35, lng: 92.68, phone: "9876512001" },
    ],
  },
];

module.exports = { KVIC_CENTRES, CLUSTERS };
