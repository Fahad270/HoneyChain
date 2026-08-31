// Explainable formula-based yield estimate — deliberately not a trained
// ML model. For a hackathon this is a stronger answer than a black box:
// every number in the output can be justified to a judge.

const SEASON_MULTIPLIER = {
  spring: 1.25,
  summer: 0.9,
  monsoon: 0.55,
  winter: 0.8,
  autumn: 1.05,
};

function scoreInRange(value, min, max) {
  if (value >= min && value <= max) return 1;
  const dist = value < min ? min - value : value - max;
  return Math.max(0.4, 1 - dist * 0.06);
}

function predictProductivity(req, res) {
  try {
    const {
      avgWeightGainKgPerWeek = 0.5,
      avgTempC = 35,
      avgHumidityPct = 55,
      season = "summer",
      noOfColonies = 1,
      weeksRemainingInSeason = 10,
    } = req.body;

    const tempScore = scoreInRange(Number(avgTempC), 33, 36); // ideal brood temp band
    const humidityScore = scoreInRange(Number(avgHumidityPct), 40, 70);
    const seasonMult = SEASON_MULTIPLIER[String(season).toLowerCase()] ?? 1;

    const baseYieldKg =
      Number(avgWeightGainKgPerWeek) * Number(weeksRemainingInSeason) * Number(noOfColonies);

    const adjustedYieldKg = +(baseYieldKg * tempScore * humidityScore * seasonMult).toFixed(2);

    res.json({
      success: true,
      data: {
        predictedYieldKg: adjustedYieldKg,
        breakdown: {
          baseYieldKg: +baseYieldKg.toFixed(2),
          temperatureFactor: +tempScore.toFixed(2),
          humidityFactor: +humidityScore.toFixed(2),
          seasonFactor: seasonMult,
        },
        explanation:
          `Starting from ${baseYieldKg.toFixed(2)}kg based on current weight-gain trend, ` +
          `then adjusted for temperature (${(tempScore * 100).toFixed(0)}% of ideal), ` +
          `humidity (${(humidityScore * 100).toFixed(0)}% of ideal), and the ${season} season factor (${seasonMult}x).`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { predictProductivity };
