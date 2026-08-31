// Static data for now — swap this file for real ESP32/MongoDB-backed
// readings once the hardware pipeline is wired up. Ideal brood temp is
// 35°C; humidity ideal band is 40–70%.

const HIVE_NAMES = [
  "Clover Row A", "Clover Row B", "Meadowline 1", "Meadowline 2", "Sunridge",
  "Willow Edge", "North Fence", "South Fence", "Orchard 1", "Orchard 2",
  "Old Oak", "Creekside", "Wildflower 1", "Wildflower 2", "Hedgerow",
  "East Gate", "West Gate", "Lavender Row", "Backfield 1", "Backfield 2",
];

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildHive(i) {
  const rnd = seeded(i * 977 + 13);
  const tempBase = +(33 + rnd() * 4).toFixed(1);
  const humBase = +(48 + rnd() * 22).toFixed(1);
  const weightBase = +(28 + rnd() * 14).toFixed(1);

  const tempHistory = Array.from({ length: 24 }, (_, h) => ({
    t: `${h}:00`,
    temp: +(tempBase + Math.sin(h / 3.8) * 2.2 + (rnd() - 0.5)).toFixed(1),
    hum: +(humBase + Math.cos(h / 4.2) * 5 + (rnd() - 0.5) * 2).toFixed(1),
  }));

  let w = weightBase - 0.8;
  const weightHistory = Array.from({ length: 7 }, (_, d) => {
    w += (rnd() - 0.3) * 0.5;
    return { day: `D${d - 6}`, weight: +w.toFixed(2) };
  });
  weightHistory[6].weight = weightBase;
  const weightDelta = +(weightHistory[6].weight - weightHistory[5].weight).toFixed(2);

  const soundIndex = Math.round(40 + rnd() * 45);
  const battery = Math.round(28 + rnd() * 72);
  const lastTemp = tempHistory[23].temp;
  const lastHum = tempHistory[23].hum;

  let status = "healthy";
  const flags = [];
  if (lastTemp > 37.5 || lastTemp < 31) {
    status = "critical";
    flags.push(`Brood temp ${lastTemp}°C outside the 35°C safe range`);
  }
  if (weightDelta <= -0.9) {
    status = "critical";
    flags.push(`Sudden weight drop ${weightDelta}kg — possible swarm or robbing`);
  }
  if (battery < 20) {
    status = status === "critical" ? "critical" : "warning";
    flags.push(`Node battery low (${battery}%)`);
  }
  if ((lastHum > 72 || lastHum < 38) && status === "healthy") {
    status = "warning";
    flags.push(`Humidity ${lastHum}% outside ideal 40–70%`);
  }
  if (soundIndex > 78 && status === "healthy") {
    status = "warning";
    flags.push("Acoustic activity elevated — check for swarming");
  }

  return {
    id: i,
    name: HIVE_NAMES[i],
    status,
    flags,
    temp: lastTemp,
    hum: lastHum,
    weight: weightHistory[6].weight,
    weightDelta,
    soundIndex,
    battery,
    tempHistory,
    weightHistory,
  };
}

const mockHives = Array.from({ length: 20 }, (_, i) => buildHive(i));

// Static weather snapshot — swap for a real weather API call later.
const mockWeather = {
  condition: "Light rain expected, 2pm",
  tempC: 27,
  humidity: 81,
  wind: 14,
  pressure: 1006,
  note:
    "Falling pressure and high humidity — foraging will drop this afternoon and honey curing will slow.",
};

module.exports = { mockHives, mockWeather };
