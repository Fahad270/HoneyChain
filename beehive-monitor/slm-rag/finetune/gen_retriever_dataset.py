#!/usr/bin/env python3
"""
Generate 525 domain-specific retriever training pairs for HoneyChain RAG.
Covers 15 reference cards across:
- Bee Diseases (Varroa, AFB, EFB, Chalkbrood, Sacbrood, Nosema, Inspection)
- FSSAI 2.8.3 Regulations (Moisture, Sucrose, HMF, SMR/TMR Adulteration)
- Government Schemes (KVIC Honey Mission, PMEGP, NBHM)
- Seasonal Management (Monsoon, Spring Honeyflow, Summer Heat Stress)

Languages: English technical, English colloquial, Devanagari Hindi, and Hinglish.
Format: Triplet / Pair for SentenceTransformers (MultipleNegativesRankingLoss).
"""

import json
import os

with open("/tmp/reference_passages.json", "r") as f:
    cards = json.load(f)

card_map = {c["id"]: c["text"] for c in cards}

# 35 queries per card (15 cards * 35 = 525 queries)
DATA = {
  "varroa-suspect": [
    # English technical
    "sticky bottom board natural mite fall count method",
    "phoretic varroa mites attached to adult honeybee abdomen",
    "uncapping white drone pupae to count mite infestation levels",
    "deformed wing virus symptoms associated with varroa mites",
    "economic threshold for varroa treatment in honeybee colonies",
    "screened bottom board for non-chemical varroa mite drop",
    "spotty brood pattern with perforated cappings caused by mites",
    "varroa destructor parasitic mite identification in apiary",
    "mite sampling method using sugar roll or alcohol wash",
    "hygienic bee stock resistant to varroa grooming behavior",
    # English colloquial
    "little red bugs crawling on my bees and brood cells",
    "worker bees crawling outside the entrance unable to fly with stubby wings",
    "how to check if my beehive has varroa mite infestation",
    "reddish brown oval specks on bee larvae and pupae",
    "bees with crippled shriveled wings walking in front of the hive",
    "what does high mite drop on bottom board indicate",
    "drone brood has tiny reddish ticks on pupae",
    "bees looking deformed and colony population suddenly declining",
    "how often should I monitor mite fall on bottom board",
    "safe non-chemical ways to reduce mite pressure in apiary",
    # Hindi Devanagari
    "मधुमक्खियों के शरीर पर छोटे लाल कीड़े चिपके हुए दिख रहे हैं",
    "मक्खियों के पंख मुड़े और कटे हुए हैं और वे जमीन पर रेंग रही हैं",
    "वरोआ माइट की पहचान और चिपचिपे बॉटम बोर्ड से जांच कैसे करें",
    "ड्रोन ब्रूड में माइट की गिनती करने का सही तरीका",
    "पेटी में जालीदार बॉटम बोर्ड लगाने के क्या फायदे हैं",
    "ब्रूड में छेद और अनियमित पैटर्न वरोआ के लक्षण",
    "मधुमक्खी के पंख खराब होने का क्या कारण है",
    "वरोआ माइट से बचाव के जैविक और प्राकृतिक उपाय",
    # Hinglish
    "bees ke wings deformed hain aur niche zameen par crawl kar rahi hain",
    "hive me red brown color ke chhote mites dikh rahe hain",
    "varroa mite ka natural count sticky board se kaise lein",
    "drone pupae par laal keede chipke hue hain kya karein",
    "brood me perforated cappings aur spotty pattern aa raha hai",
    "varroa control ke liye screened bottom board kaise use karein",
    "bees udd nahi pa rahi abdomen chhota lag raha hai"
  ],

  "afb-suspect": [
    # English technical
    "ropy matchstick test for American foulbrood diagnosis",
    "Paenibacillus larvae spore formation in honeybee comb",
    "dark sunken perforated brood cappings with foul odor",
    "hard dark pupal tongue scales adhering tightly to lower cell wall",
    "quarantine protocol for AFB infected apiary equipment",
    "scorching and fumigation of hive woodenware following AFB",
    "notifiable bee disease reporting to state apiary inspector",
    "why antibiotics should not be used to mask AFB symptoms",
    "destruction of infected frames and bees by burning AFB protocol",
    "elastic roping of larval remains over one inch",
    # English colloquial
    "brood looks sunken and punctured smelling like rotten meat",
    "larva stretches like elastic rubber band when pulled with stick",
    "dark scale stuck to bottom of honeycomb cell impossible to scrape",
    "comb smells like old sweaty socks with greasy sunken cappings",
    "dead brood melted into coffee brown gooey slime",
    "what to do if I suspect american foulbrood in my boxes",
    "can I save frames infected with AFB or do I have to burn them",
    "why is american foulbrood dangerous for neighboring apiaries",
    "field ropy test positive on sunken brown brood cells",
    "brown decayed pupae with extended tongue adhering to cell roof",
    # Hindi Devanagari
    "अमेरिकन फाउलब्रूड रोग के लक्षण और माचिस की तीली वाला रोपी टेस्ट",
    "छत्ते में से सड़े मोजे जैसी तीव्र बदबू और धंसे हुए छेददार ढक्कन",
    "लारवा कॉफी के रंग का चिपचिपा हो गया है और खींचने पर तार बनता है",
    "सेल के नीचे काली पपड़ी जो खुरचने से भी नहीं निकलती",
    "एएफबी रोग से पीड़ित छत्तों और फ्रेमों को जलाने का नियम",
    "क्या फाउलब्रूड में एंटीबायोटिक दवा देना सुरक्षित है",
    "अमेरिकन फाउलब्रूड फैलने से रोकने के लिए क्वारंटाइन के नियम",
    "रोगग्रस्त पेटी के औजार और डिब्बे को सैनिटाइज कैसे करें",
    # Hinglish
    "comb me se gandi badboo aa rahi hai aur cappings sunken punctured hain",
    "stick se larva nikaalo to elastic ki tarah rope banta hai",
    "afb suspect hone par frame ko destroy karna zaroori hai kya",
    "american foulbrood ke scales cell floor par jam gaye hain",
    "infected hive ka honey dusri peti me feed kar sakte hain kya",
    "ropy test positive aane par inspector ko report kaise karein",
    "afb roop test me tar 1 inch se jyada khinch raha hai"
  ],

  "efb-suspect": [
    # English technical
    "Melissococcus plutonius bacteria in unsealed larval gut",
    "twisted coiled larvae dying in open cells before capping",
    "larvae turning yellowish white to dull brown with visible tracheae",
    "sour or vinegary odor from decaying unsealed brood",
    "secondary bacterial invaders in European foulbrood infection",
    "shook swarm technique on clean foundation for EFB control",
    "distinguishing European foulbrood from American foulbrood",
    "larval segmentation and chalky tracheae lines visible in EFB",
    "EFB outbreaks during spring dearth and cold stress periods",
    "requeening with hygienic queen to clear EFB infected colonies",
    # English colloquial
    "larvae dying curled up in corkscrew shape in open cells",
    "baby bees turning yellowish brown before cells are capped",
    "sour acid smell coming from open brood frames",
    "larva looks melted in bottom of open cell but does not rope",
    "open brood dying in spring when weather turns cold",
    "how to treat european foulbrood without antibiotics",
    "why are larvae dying before cappings are put on",
    "white breathing tubes visible through discolored dead larvae",
    "brood comb has spotty pattern with unsealed dead grubs",
    "will replacing the queen help cure european foulbrood",
    # Hindi Devanagari
    "यूरोपियन फाउलब्रूड के लक्षण और खुले सेल में मुड़े हुए पीले लारवा",
    "खुले सेल में लारवा भूरा और पीला पड़कर मर रहा है",
    "छत्ते से खट्टी या सिरके जैसी हल्की बदबू आना",
    "लारवा खींचने पर तार नहीं बनाता लेकिन खुला मर जाता है",
    "वसंत ऋतु में ठंड और भोजन की कमी से ईएफबी का प्रकोप",
    "यूरोपियन फाउलब्रूड से बचाव के लिए रानी मधुमक्खी बदलना",
    "ईएफबी और एएफबी में अंतर कैसे पहचानें",
    "शुक स्वार्म तकनीक से बीमार छत्ते को साफ फाउंडेशन पर ले जाना",
    # Hinglish
    "open cells me larva twisted aur yellow brown hokar mar raha hai",
    "larva me ropy stretch nahi hai par sour vinegar jaisi smell hai",
    "european foulbrood me shook swarm method kaise kaam karta hai",
    "efb me tracheae safed lines ki tarah larva par dikh rahi hain",
    "uncapped brood me mortality kyu ho rahi hai spring ke time",
    "efb control ke liye hygienic queen replace karne ka tarika",
    "melissococcus plutonius infection ko naturally kaise rokein"
  ],

  "chalkbrood-suspect": [
    # English technical
    "Ascosphaera apis fungal spores infecting chilled larvae",
    "hard chalky white and black mummies on bottom board",
    "perforated brood cappings with hard calcified grubs inside",
    "fungal mycelium covering dead larvae in comb cells",
    "improved hive ventilation to reduce chalkbrood incidence",
    "replacing old moldy brood comb to eliminate Ascosphaera spores",
    "temperature fluctuation and condensation favoring chalkbrood",
    "hygienic worker bee behavior uncapping and removing mummies",
    "drying hive floor and tilting box forward for drainage",
    "requeening with chalkbrood resistant hygienic honeybee stock",
    # English colloquial
    "white chalk like pieces lying on hive entrance and landing board",
    "mummified dry hard grubs dropped in bottom tray",
    "brood looks like little pieces of white and grey blackboard chalk",
    "why is my hive throwing out dry hard white mummies",
    "damp cold hive causing chalkbrood fungus in spring",
    "how to stop chalkbrood mummies from spreading across frames",
    "comb cells contain white fuzzy fungus growing over dead larvae",
    "moldy looking chalk mummies found during hive inspection",
    "does wet damp weather trigger chalkbrood outbreak",
    "how to increase airflow and ventilation to cure chalkbrood",
    # Hindi Devanagari
    "छत्ते के प्रवेश द्वार पर सफेद चाक जैसी सूखी ममीज गिरना",
    "चाकब्रूड फफूंद रोग के कारण और लक्षण",
    "लारवा सूखकर सफेद और काले रंग की सख्त डली बन जाना",
    "पेटी में नमी और ठंड से एस्कोस्फेरा फंगस का फैलाव",
    "चाकब्रूड से बचाव के लिए पेटी में हवा और वेंटिलेशन सुधारना",
    "पुराने फफूंद लगे फ्रेम हटाना और नई मोम शीट देना",
    "हाइजीनिक रानी मक्खी लाकर चाकब्रूड की रोकथाम",
    "बरसात या सीलन वाले मौसम में चाकब्रूड नियंत्रण",
    # Hinglish
    "hive entrance aur floor par white chalk jaisi sukhi mummies hain",
    "chalkbrood fungal disease me ventilation kaise badhayein",
    "brood comb me dead larvae hard calcified white pieces ban gaye",
    "damp weather me chalkbrood spores kaise kill karein",
    "ascosphaera apis fungus se infected frames badalna zaroori hai",
    "chalk mummies ko clean karne ke liye hygienic stock select karein",
    "box ko aage tilt karke moisture nikalne se chalkbrood rukta hai kya"
  ],

  "sacbrood-suspect": [
    # English technical
    "sacbrood virus SBV causing failure of larval pupation",
    "canoe shaped or gondola shaped dead larvae with raised head",
    "watery fluid filled sac formed under loosened larval cuticle",
    "larval color changing from yellow to dark brown and black snout",
    "easy removal of intact sac-like dead larvae from cell with tweezers",
    "distinguishing sacbrood pointed snout from American foulbrood scales",
    "spontaneous clearance of sacbrood during strong nectar flows",
    "viral contamination of brood food by young nurse bees",
    "requeening colony to break brood cycle during heavy sacbrood",
    "Thai sacbrood virus TSBV vulnerability in Apis cerana colonies",
    # English colloquial
    "dead grub looks like a pointed boat or canoe with head sticking up",
    "bag of clear watery fluid inside dead bee larva skin",
    "larva has a black pointed head tip like a tiny shoe",
    "grub comes out whole like a water balloon without sticking",
    "why are capped brood dying with pointed dark heads in comb",
    "dead larvae look like little sacs filled with clear liquid",
    "sacbrood virus vs foulbrood how to tell the difference",
    "will sacbrood go away when honey flow starts in spring",
    "is thai sacbrood virus common in indian apis cerana bees",
    "larvae turning brown and head turned upward like a gondola",
    # Hindi Devanagari
    "सैकब्रूड विषाणु रोग के लक्षण और नाव के आकार का लारवा",
    "मरे हुए लारवे की थैली में पानी जैसा तरल पदार्थ भरा होना",
    "लारवा का सिर ऊपर की ओर उठा हुआ और नोकदार काला पड़ना",
    "चिमटी से पकड़ने पर लारवा पूरी थैली की तरह साबुत बाहर आ जाता है",
    "थाई सैकब्रूड रोग और भारतीय मधुमक्खी एपिस सेराना",
    "सैकब्रूड और फाउलब्रूड में अंतर कैसे करें",
    "अमृत प्रवाह (नेक्टर फ्लो) के समय सैकब्रूड का स्वतः ठीक होना",
    "सैकब्रूड के प्रभाव को कम करने के लिए रानी बदलना",
    # Hinglish
    "larva canoe ya boat shape me sar upar karke mar raha hai",
    "dead larva ko nikalo to pani bhara hua sac jaisa nikalta hai",
    "sacbrood virus me snout black aur pointed kyu ho jata hai",
    "thai sacbrood virus apis cerana me kaise pehchanein",
    "larva cell floor par chipak nahi raha balloon ki tarah whole nikal raha",
    "sacbrood hone par antibiotics kaam karega ya nahi",
    "nectar flow aane par sacbrood natural recover hota hai kya"
  ],

  "nosema-suspect": [
    # English technical
    "Nosema apis and Nosema ceranae microsporidian spore infection",
    "microscopic verification required for definitive nosema diagnosis",
    "fecal spotting and brown streaks on hive front wall and top bars",
    "distended milky white ventriculus in dissected worker gut",
    "forager bees crawling near entrance unable to fly with bloated abdomen",
    "dysentery symptoms resulting from winter confinement and nosema",
    "spore transmission through contaminated drinking water and feces",
    "providing clean fresh water with salt to prevent nosema spread",
    "disinfecting contaminated frames with acetic acid fumigation",
    "shortened worker lifespan and poor queen egg laying due to nosema",
    # English colloquial
    "brown diarrhea stains and streaks all over outside of hive box",
    "bees crawling on grass with swollen bellies unable to take flight",
    "can I diagnose nosema from photo or do I need a microscope",
    "why are worker bees dying in piles in front of hive in winter",
    "gut dissection reveals white swollen midgut instead of brown rings",
    "how does nosema ceranae differ from traditional nosema apis",
    "colony dwindling rapidly in early spring with fecal spotting",
    "preventing nosema spread through stagnant apiary water pools",
    "fumigating stored honey supers with acetic acid vapor",
    "bees shivering and crawling near landing board with dysentery",
    # Hindi Devanagari
    "नोसेमा रोग के लक्षण और पेटी की बाहरी दीवार पर भूरे दस्त के धब्बे",
    "मक्खियों का पेट फूला होना और जमीन पर रेंगते हुए उड़ न पाना",
    "नोसेमा की पुष्टि के लिए सूक्ष्मदर्शी (माइक्रोस्कोप) जांच क्यों जरूरी है",
    "मधुमक्खी की आंत का सफेद और सूजा हुआ दिखाई देना",
    "सर्दियों के बाद पेटी में पेचिश और मक्खियों की असमय मौत",
    "एसिटिक एसिड वाष्प द्वारा पुराने फ्रेमों का विसंक्रमण",
    "गंदे पानी से नोसेमा के बीजाणु फैलने से कैसे रोकें",
    "नोसेमा सेराणी और नोसेमा एपिस में मुख्य अंतर",
    # Hinglish
    "hive ke front wall par brown diarrhoea stains aur streaks dikh rahe",
    "bees ka abdomen swollen hai aur grass par crawl kar rahi hain",
    "nosema confirm karne ke liye microscopic spore count test",
    "gut dissection me ventriculus milky white swollen nikla",
    "acetic acid se frames fumigate karne ka tarika",
    "winter confinement ke baad sudden colony dwindling aur dysentery",
    "apiary me clean water source rakhne se nosema kaise rukta hai"
  ],

  "inspection-checklist": [
    # English technical
    "routine brood comb examination protocol and biosecurity hygiene",
    "evaluating queen laying pattern solid concentric brood circles",
    "distinguishing healthy pearly white larvae from diseased brood",
    "monitoring pollen stores honey bands and drone comb ratio",
    "smoker technique and gentle hive handling to minimize agitation",
    "disinfecting hive tool in bleach or flame between colonies",
    "detecting laying workers multiple eggs on cell sides vs single centered egg",
    "queen cup vs emergency swarm cell positioning on frame edges",
    "recommended inspection frequency during active foraging season",
    "biosecurity record keeping for apiary health certification",
    # English colloquial
    "what to look for when inspecting frames inside a beehive",
    "how does a healthy queen laying pattern look on comb",
    "healthy bee larva should be glistening pearl white in C shape",
    "how to tell if queen is present without spotting her directly",
    "why are there multiple eggs laid irregularly on cell walls",
    "how often should a beekeeper open and inspect hives in spring",
    "cleaning hive tool between boxes so diseases do not spread",
    "difference between supersedure swarm cell and normal queen cup",
    "how much honey and pollen stores does a colony need to survive",
    "signs that a colony is preparing to swarm during inspection",
    # Hindi Devanagari
    "छत्ते के नियमित निरीक्षण का सही तरीका और सावधानियां",
    "स्वस्थ रानी मक्खी का अंडा देने का पैटर्न और मोतियों जैसा सफेद लारवा",
    "पेटी में रानी उपस्थित है या नहीं यह अंडों से कैसे जानें",
    "हाइव टूल को साफ और कीटाणुरहित रखने का नियम",
    "मजदूर मक्खियों द्वारा अनियमित अंडे देने (लेइंग वर्कर) के लक्षण",
    "स्वाम सेल (झुंड सेल) और इमरजेंसी रानी सेल में क्या अंतर है",
    "सक्रिय मौसम में पेटी को कितने दिनों में खोलकर देखना चाहिए",
    "धुआं करने वाले यंत्र (स्मोकर) का सही उपयोग कैसे करें",
    # Hinglish
    "hive inspection karte time kya kya check karna chahiye",
    "healthy larva pearl white glistening C-shape me hota hai",
    "single egg cell ke center me hai to queen present hai",
    "laying worker multiple eggs side walls par deti hai",
    "hive tool ko bleach ya flame se sterilize kyu karna zaroori hai",
    "super frame par honey stores kitne hone chahiye dearth se pehle",
    "regular inspection checklist for commercial apiary management"
  ],

  "fssai-honey-composition": [
    # English technical
    "FSSAI Food Safety and Standards Regulations 2020 Regulation 2.8.3",
    "maximum permissible moisture percentage in raw honey under FSSAI",
    "hydroxymethylfurfural HMF limit 80 mg per kg tropical origin allowance",
    "apparent reducing sugars minimum 65 percent by mass for floral honey",
    "sucrose content maximum 5.0 percent limit for pure blossom honey",
    "fructose to glucose ratio F over G minimum 0.95 legal requirement",
    "moisture content exceeding 20 percent risk of Zygosaccharomyces fermentation",
    "water insoluble solids limit 0.1 percent for pressed and extracted honey",
    "electrical conductivity limit 0.8 milliSiemens per centimeter for blossom honey",
    "specific gravity and optical rotation testing parameters under FSSAI Table 1",
    # English colloquial
    "what is the maximum legal water percentage allowed in honey in India",
    "why did my honey fail the 20 percent moisture test",
    "HMF limit for honey in warm tropical countries like India",
    "minimum percentage of reducing sugars fructose plus glucose in pure honey",
    "how much cane sugar or sucrose is allowed in pure honey under FSSAI",
    "fructose glucose ratio must be at least 0.95 what does this mean",
    "fermentation spoilage risk when moisture is over 20 percent",
    "does boiling honey increase HMF levels above legal limit",
    "what lab tests are mandatory to sell bottled honey commercially in India",
    "fssai standards for pure honey testing report parameters",
    # Hindi Devanagari
    "एफएसएसएआई नियम 2.8.3 के तहत शहद के अनिवार्य मानक",
    "शुद्ध शहद में नमी (मॉइस्चर) की अधिकतम कानूनी सीमा 20 प्रतिशत",
    "एचएमएफ (HMF) की अधिकतम सीमा 80 मिलीग्राम प्रति किलोग्राम उष्णकटिबंधीय छूट",
    "शहद में सुक्रोज (चीनी) की अधिकतम मात्रा 5 प्रतिशत से कम होनी चाहिए",
    "अपचायक शर्करा (फ्रुक्टोज + ग्लूकोज) न्यूनतम 65 प्रतिशत अनिवार्य",
    "फ्रुक्टोज और ग्लूकोज का अनुपात (F/G ratio) कम से कम 0.95 होना चाहिए",
    "शहद में 20% से ज्यादा पानी होने पर खमीर (फर्मेंटेशन) उठने का खतरा",
    "शहद को गर्म करने पर एचएमएफ क्यों बढ़ जाता है",
    # Hinglish
    "fssai 2.8.3 standard me raw honey ka moisture maximum kitna hota hai",
    "hmf 80 mg/kg se jyada ho gaya to lab fail karega kya",
    "pure honey me sucrose limit 5% max kyu rakhi gayi hai",
    "fructose glucose ratio 0.95 se kam aane par adulteration suspect hota hai",
    "moisture 22 percent hone par zygosaccharomyces yeast spoilage",
    "honey ko over heat karne par fssai test me hmf fail hota hai",
    "commercial packaging ke liye fssai table 1 lab testing checklist"
  ],

  "fssai-adulteration-markers": [
    # English technical
    "specific marker for rice syrup SMR detection in commercial honey",
    "trace marker for rice syrup TMR test protocol under FSSAI gazette",
    "C4 sugars isotope ratio mass spectrometry EA-IRMS maximum 7 percent",
    "foreign oligosaccharides detection by HPLC-PAD in adulterated honey",
    "detecting high fructose corn syrup HFCS and cane sugar invert syrup",
    "carbon isotope discrimination delta 13C between honey and protein",
    "commercial sugar syrups designed to pass basic Brix and polarity tests",
    "mandatory SMR and TMR test pass required for Khadi and export honey",
    "golden syrup and beet sugar adulteration detection markers",
    "penalties for deliberate syrup adulteration under Food Safety Act",
    # English colloquial
    "how do labs detect rice syrup added into pure honey",
    "what does SMR detected mean on my honey lab report",
    "is my honey adulterated if trace marker for rice syrup TMR is present",
    "C4 test limit 7 percent what does C4 sugar mean",
    "why simple sugar tests cannot catch modern synthetic inverted syrups",
    "how to test if honey is mixed with corn syrup or cane sugar",
    "lab test found rice syrup marker will the batch be rejected",
    "EA-IRMS isotope testing explained for honey beekeepers",
    "can natural honey ever show positive for SMR without adulteration",
    "why FSSAI made SMR and TMR testing mandatory for honey brands",
    # Hindi Devanagari
    "शहद में चावल के सिरप (राइस सिरप) की मिलावट पकड़ने का SMR टेस्ट",
    "टीएमआर (TMR) मार्कर पॉजिटिव आने का क्या मतलब है",
    "सी4 (C4) शर्करा की अधिकतम सीमा 7 प्रतिशत ईए-आईआरएमएस पद्धति",
    "शहद में कृत्रिम चाशनी और कॉर्न सिरप की पहचान कैसे होती है",
    "एफएसएसएआई द्वारा चीनी सिरप की मिलावट पर कानूनी रोक",
    "लैब रिपोर्ट में एसएमआर 'एब्सेंट' (Absent) होना अनिवार्य क्यों है",
    "कार्बन आइसोटोप अनुपात परीक्षण द्वारा असली और नकली शहद की पहचान",
    "चावल का सिरप मिलाने पर मिलने वाली सजा और जब्ती के नियम",
    # Hinglish
    "rice syrup milawat check karne ka smr test kya hota hai",
    "lab report me smr detected aaya to batch reject ho jayega",
    "tmr test trace marker for rice syrup fssai standard",
    "c4 sugar limit 7% se zyada aane ka matlab cane sugar mix hai",
    "sugar syrup adulteration ko modern testing methods kaise pakadti hain",
    "khadi aur nabl lab me smr absent aana mandatory hai",
    "chawal ka syrup milane par fssai ke penalties aur rules"
  ],

  "scheme-kvic-honey-mission": [
    # English technical
    "KVIC Honey Mission scheme guidelines under Ministry of MSME",
    "distribution of 10 bee boxes and bee colonies to trained beekeepers",
    "free training on scientific beekeeping by KVIC certified trainers",
    "eligibility criteria for marginal farmers and rural youth Honey Mission",
    "provision of beekeeping kit honey extractor and smoker by Khadi board",
    "Meethi Kranti Sweet Revolution initiative for doubling farmers income",
    "role of State KVIC Divisional Offices in scheme implementation",
    "cluster development approach for honey production under KVIC",
    "post-training handholding and linkage with KVIC honey purchase centers",
    "documentation required Aadhaar card bank details and land proof for KVIC",
    # English colloquial
    "how to apply for 10 free bee boxes under KVIC Honey Mission",
    "who is eligible for free beekeeping training and boxes from Khadi board",
    "where to submit application for KVIC honey mission in my district",
    "do I get honey extractor tool kit free with KVIC boxes",
    "how long is the training course for KVIC honey mission scheme",
    "can small farmers get bee colonies without any initial investment",
    "how does KVIC buy back honey produced by Honey Mission farmers",
    "sweet revolution scheme for beekeeping in rural villages",
    "is Aadhaar card required to get KVIC bee boxes",
    "contacting local KVIC office to get enrolled in beekeeping program",
    # Hindi Devanagari
    "खादी और ग्रामोद्योग आयोग (KVIC) हनी मिशन योजना की जानकारी",
    "केवीआईसी द्वारा 10 मधुमक्खी बक्से और कॉलोनी मुफ्त पाने की प्रक्रिया",
    "मीठी क्रांति योजना में छोटे किसानों के लिए पात्रता और शर्तें",
    "खादी बोर्ड से वैज्ञानिक मधुमक्खी पालन का मुफ्त प्रशिक्षण",
    "हनी मिशन के तहत शहद निष्कासक यंत्र और स्मोकर टूल किट मिलना",
    "केवीआईसी में आवेदन करने के लिए आवश्यक दस्तावेज आधार और बैंक खाता",
    "प्रशिक्षण के बाद केवीआईसी शहद खरीद केंद्रों से जुड़ाव",
    "ग्रामीण युवाओं और महिलाओं के लिए केवीआईसी स्वरोजगार योजना",
    # Hinglish
    "kvic honey mission me 10 free bee boxes kaise apply karein",
    "khadi gramodyog me free beekeeping training kitne din ki hoti hai",
    "sweet revolution scheme me eligibility criteria kya hai",
    "kvic honey purchase centre par raw honey sell kar sakte hain kya",
    "honey mission form kaha submit karna hota hai district me",
    "aadhar card aur bank passbook se free bee boxes milte hain",
    "kvic tool kit me honey extractor aur smoker milta hai"
  ],

  "scheme-pmegp-beekeeping": [
    # English technical
    "Prime Ministers Employment Generation Programme PMEGP beekeeping category",
    "maximum project cost up to 25 to 50 lakhs for honey processing units",
    "margin money subsidy 25 percent for general and 35 percent for special category",
    "bank loan financing and collateral requirements under PMEGP scheme",
    "rural area subsidy rates vs urban area for apiary projects",
    "preparing Detailed Project Report DPR for commercial beekeeping PMEGP",
    "beneficiary contribution 5 to 10 percent of total project cost",
    "KVIC as the nodal agency for implementing PMEGP scheme across India",
    "scoring criteria and district task force committee DLEPC approval",
    "mandatory Entrepreneurship Development Programme EDP training for sanction",
    # English colloquial
    "how much subsidy does PMEGP give for setting up a honey processing plant",
    "can I get bank loan for 500 beehives under PM employment generation scheme",
    "is there 35 percent government subsidy for beekeeping under PMEGP",
    "how to make DPR project report for beekeeping loan in bank",
    "what is beneficiary share for SC ST and women in PMEGP honey scheme",
    "how to apply online on PMEGP portal for beekeeping project",
    "EDP training requirement before PMEGP loan disbursement",
    "getting loan for honey bottling packaging and testing machinery",
    "subsidy lock in period of 3 years in bank fixed deposit PMEGP",
    "who approves the PMEGP application in district industry centre DIC",
    # Hindi Devanagari
    "प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP) में मधुमक्खी पालन लोन",
    "पीएमईजीपी योजना में 25% से 35% तक की सरकारी सब्सिडी",
    "शहद प्रोसेसिंग और बॉटलिंग प्लांट लगाने के लिए 25 से 50 लाख का प्रोजेक्ट",
    "पीएमईजीपी में महिला, एससी, एसटी और ओबीसी के लिए विशेष छूट",
    "मधुमक्खी पालन के लिए बैंक डीपीआर (प्रोजेक्ट रिपोर्ट) कैसे तैयार करें",
    "स्वयं का अंशदान 5% से 10% और शेष बैंक द्वारा ऋण",
    "पीएमईजीपी पोर्टल पर ऑनलाइन आवेदन और जिला स्तरीय चयन प्रक्रिया",
    "लोन मिलने के बाद अनिवार्य ईडीपी उद्यमिता विकास प्रशिक्षण",
    # Hinglish
    "pmegp me honey processing unit ke liye kitna subsidy milta hai",
    "commercial beekeeping ke liye 25 lakh tak ka loan kaise lein",
    "pmegp online portal par apply karne ka step by step process",
    "general category ko 25 percent aur rural special ko 35 percent subsidy",
    "beekeeping bank project report dpr kaise banwaye",
    "bank loan approve hone ke baad edp training zaroori hoti hai",
    "subsidy 3 saal ke liye bank me lock rehti hai TDR format me"
  ],

  "scheme-nbhm-mission": [
    # English technical
    "National Beekeeping and Honey Mission NBHM under Ministry of Agriculture",
    "Madhukranti portal online registration for traceability and digital ID",
    "financial assistance for mini honey testing labs and regional labs",
    "subsidy for Custom Hiring Centres CHC for beekeeping equipment",
    "scientific pollination support and bee breeder registration under NBHM",
    "Mini Mission 1 production, Mini Mission 2 post-harvest, Mini Mission 3 research",
    "funding pattern 50 percent to 75 percent for bee breeders and FPOs",
    "Farmer Producer Organizations FPO formation in honey value chain",
    "source-to-consumer traceability integration with National Bee Board NBB",
    "subsidized disease diagnostic kits and mobile extraction vans",
    # English colloquial
    "how to register my apiary on Madhukranti portal to get farmer ID",
    "what benefits do beekeepers get under National Beekeeping Honey Mission",
    "how to get government subsidy for setting up a mini honey testing lab",
    "funding for honey FPO and collective beekeeper societies",
    "does NBHM provide mobile honey extraction vans for groups",
    "getting subsidy for bee breeding farm to sell certified bee colonies",
    "how Madhukranti portal tracks honey from beekeeper to consumer",
    "National Bee Board subsidy for commercial beekeeping infrastructure",
    "support for migratory beekeeping transport and equipment custom hiring",
    "financial help for disease diagnosis and quality testing under NBHM",
    # Hindi Devanagari
    "राष्ट्रीय मधुमक्खी पालन और शहद मिशन (NBHM) योजना के लाभ",
    "मधुक्रांति पोर्टल पर मधुमक्खी पालक का ऑनलाइन पंजीकरण",
    "मिनी हनी टेस्टिंग लैब और टेस्टिंग किट के लिए सरकारी अनुदान",
    "कस्टम हायरिंग सेंटर (CHC) के माध्यम से उपकरण किराए पर लेने की सुविधा",
    "हनी एफपीओ (FPO) किसान उत्पादक संगठन बनाकर बड़ा अनुदान पाना",
    "मधुमक्खी प्रजनक (बी ब्रीडर) बनने के लिए 50% से 75% तक की सहायता",
    "शहद की शुद्धता की डिजिटल ट्रैकिंग मधुक्रांति पोर्टल से कैसे होती है",
    "राष्ट्रीय मधुमक्खी बोर्ड (NBB) के तहत परागण और ब्रीडिंग योजनाएं",
    # Hinglish
    "madhukranti portal par beekeeper registration kaise karein",
    "nbhm mission me mini honey testing lab ke liye subsidy",
    "national beekeeping mission me fpo banane par kitna grant milta hai",
    "bee breeding centre establish karne ke liye 50 to 75 percent subsidy",
    "custom hiring centre se honey extractor rental par kaise lein",
    "madhukranti id se blockchain aur digital traceability connect hona",
    "national bee board certified beekeeper banne ke faayde"
  ],

  "seasonal-monsoon-management": [
    # English technical
    "monsoon dearth period management June to August in Indian apiaries",
    "artificial feeding with 1:1 sugar syrup to prevent colony starvation",
    "controlling high interior humidity and fungal mold growth during rains",
    "tilting hive boxes slightly forward to prevent rainwater accumulation",
    "narrowing hive entrance to prevent wasp hornets and robber bee attacks",
    "comb preservation against greater wax moth during monsoon dampness",
    "cleaning bottom board weekly to remove damp debris and dead bees",
    "raising hive stand height to avoid splash water and frog toad entry",
    "inspecting for queenlessness after continuous heavy rain periods",
    "prohibiting harvesting of unripened high moisture honey during monsoon",
    # English colloquial
    "how to feed bees during rainy season when there are no flowers",
    "sugar syrup ratio for feeding bees in monsoon dearth period",
    "how to prevent water from entering beehive during heavy rains",
    "comb getting moldy and wet inside box during monsoon",
    "wasps and hornets attacking weak colonies at hive entrance in rain",
    "why you should never extract honey during rainy humid months",
    "preventing starvation death in colonies during continuous rain",
    "putting hive on high stands so frogs and ants cannot climb inside",
    "narrowing entrance reducer to stop robber bees during rainy season",
    "checking food stores when rain stops for a few sunny hours",
    # Hindi Devanagari
    "मानसून (बरसात) में मधुमक्खियों का प्रबंधन और अकाल अवधि देखभाल",
    "बारिश में 1:1 अनुपात में चीनी का घोल (शुगर सिरप) कैसे दें",
    "पेटी में पानी घुसने और फफूंद (मोल्ड) लगने से कैसे बचाएं",
    "बरसात में पेटी को थोड़ा आगे की तरफ झुकाकर रखने का नियम",
    "ततैया (वास्प) और चींटियों के हमले से पेटी की सुरक्षा",
    "बरसात में शहद न निकालने की सलाह क्योंकि नमी 20% से ज्यादा होती है",
    "पेटी का प्रवेश द्वार छोटा करके डकैती (रॉबिंग) रोकना",
    "हाइव स्टैंड को ऊंचा रखना ताकि मेंढक और सीलन से बचाव हो सके",
    # Hinglish
    "monsoon dearth me bees ko sugar syrup feeding 1:1 ratio me",
    "rainy season me box ke andar mold aur moisture kaise control karein",
    "hive entrance chhota karne se wasp aur hornet attack rukta hai",
    "barsaat ke dino me unripened honey kyu nahi nikalna chahiye",
    "hive stand par pani ki katori rakhne se ants protection",
    "monsoon me comb ko wax moth aur moisture se bachane ke steps",
    "continuous rain me bees starv na karein isliye emergency feed"
  ],

  "seasonal-spring-honeyflow": [
    # English technical
    "major spring honey flow management February to April mustard and litchi",
    "adding honey supers above queen excluder before nectar glut starts",
    "checkerboarding brood and honey frames to provide queen laying space",
    "swarming prevention techniques during peak spring colony expansion",
    "demaree swarm control method separating queen from sealed brood",
    "monitoring nectar ripening moisture reduction below 20 percent on frame",
    "harvesting only fully sealed or at least 75 percent capped honey frames",
    "managing multi-super colonies during intense Brassica mustard bloom",
    "equalizing colony strength across apiary before main honey flow",
    "preventing honey bound brood nest where nectar blocks queen laying",
    # English colloquial
    "when to add honey supers during mustard flower blooming season",
    "how to prevent bees from swarming and flying away in spring",
    "only extract honey frames that are capped with wax over 75 percent",
    "what does honey bound brood chamber mean and how to fix it",
    "using queen excluder so queen does not lay eggs in honey super",
    "dividing strong colonies in February to double number of hives",
    "litchi blooming season management for transparent light honey",
    "how to tell when honey is ripe enough to harvest from frames",
    "spring colony buildup management to get maximum honey harvest",
    "checkerboarding technique to stop swarming impulse in spring",
    # Hindi Devanagari
    "वसंत ऋतु और मुख्य शहद प्रवाह (हनी फ्लो) प्रबंधन फरवरी से अप्रैल",
    "सरसों और लीची के समय शहद का सुपर बॉक्स और क्वीन एक्सक्लूडर लगाना",
    "स्वामिंग (मक्खियों का झुंड बनाकर भागना) रोकने के उपाय",
    "कम से कम 75% ढके (सील्ड) हुए छत्तों से ही शहद निकालना चाहिए",
    "ब्रूड चेंबर में शहद भर जाने (हनी बाउंड) पर रानी को अंडा देने की जगह देना",
    "शहद निकालने से पहले नमी 20% से कम होना सुनिश्चित करना",
    "मजबूत कालोनियों का विभाजन करके नए बक्से तैयार करना",
    "लीची के मौसम में उच्च गुणवत्ता वाला सफेद शहद प्राप्त करने के तरीके",
    # Hinglish
    "mustard bloom ke time super box aur queen excluder kab lagayein",
    "spring honeyflow me swarming impulse ko kaise control karein",
    "minimum 75 percent capped honey frame hi harvest karni chahiye",
    "honey bound brood chamber me empty drawn comb kaise add karein",
    "litchi season me pure light colored honey harvest ke precautions",
    "demaree method se queen ko swarm karne se kaise rokein",
    "unsealed raw honey nikalne se moisture fail ho jata hai"
  ],

  "seasonal-summer-heat": [
    # English technical
    "summer heat stress management May to June apiary temperatures above 40C",
    "comb collapse and melting risk in direct sunlight exposure",
    "providing artificial shading with thatched roofs or green agro-shade nets",
    "continuous clean cool drinking water supply to aid evaporative cooling",
    "widening hive entrance and providing top ventilation screen in peak summer",
    "painting hive exterior with reflective white paint to deflect solar heat",
    "migrating colonies to cooler high altitude or irrigated orchard areas",
    "preventing bearding of bees on hive exterior due to suffocating internal heat",
    "avoiding hive inspections during peak afternoon hours 12 to 3 PM",
    "summer dearth sugar feeding in evening to avoid robbing frenzy",
    # English colloquial
    "how to stop beeswax combs from melting in extreme 45 degree heat",
    "providing shade net and water source for bees in hot summer",
    "why are thousands of bees hanging outside the hive box in summer",
    "bearding bees clustering on front wall due to heat inside",
    "cooling beehives with wet gunny bags on top covers",
    "painting beehives white to reflect heat and sun in May June",
    "migrating apiaries to cooler canal banks or forest areas",
    "never open hives in hot afternoon sun to prevent brood chilling or boiling",
    "bees drinking massive amounts of water in summer for air conditioning",
    "how to protect bees when temperature crosses 42 degrees celsius",
    # Hindi Devanagari
    "गर्मी में लू और 40 से 45 डिग्री तापमान से मधुमक्खियों का बचाव",
    "धूप में मोम के छत्ते पिघलने (कोम्ब मेल्टिंग) का भारी खतरा",
    "पेटी के ऊपर गीली बोरी (टाट) डालना और ग्रीन शेड नेट लगाना",
    "पेटी के पास साफ ठंडे पानी का स्रोत उपलब्ध कराना ताकि मक्खियां ठंडक कर सकें",
    "पेटी को सफेद रंग से पेंट करने से गर्मी का परावर्तन",
    "गर्मी के कारण मक्खियों का बाहर लटकना (दाढ़ी बनाना / बीयर्डिंग)",
    "दोपहर 12 से 3 बजे के बीच पेटी का निरीक्षण न करने की सलाह",
    "गर्मी के अकाल में शाम के समय हल्का चीनी का घोल देना",
    # Hinglish
    "extreme 45 degree dhoop me comb melt hone se kaise bachayein",
    "hive ke upar wet gunny bag rakhne se evaporative cooling",
    "summer me bees box ke bahar bearding kyu bana leti hain",
    "box ko white paint karne se heat reflection hota hai",
    "peak afternoon 12 to 3 pm me hive kabhi open nahi karna chahiye",
    "summer me fresh drinking water source rakhna zaroori hai",
    "may june ke time cooler irrigated areas me apiary migration"
  ]
}

output_pairs = []
count_by_card = {}

for card_id, queries in DATA.items():
    passage = card_map.get(card_id, "")
    if not passage:
        print(f"Warning: card {card_id} has no text in reference_passages.json!")
    count_by_card[card_id] = len(queries)
    for q in queries:
        output_pairs.append({
            "query": q,
            "card_id": card_id,
            "passage": passage,
        })

print(f"Total queries generated: {len(output_pairs)}")
for cid, cnt in count_by_card.items():
    print(f"  {cid}: {cnt} queries")

out_path = "/home/RatAnon/HoneyChain/beehive-monitor/slm-rag/finetune/retriever_train_pairs.json"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output_pairs, f, indent=2, ensure_ascii=False)

print(f"Successfully saved {len(output_pairs)} pairs to {out_path}")
