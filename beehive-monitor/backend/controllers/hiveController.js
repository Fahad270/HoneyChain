const { mockHives, mockWeather } = require("../data/mockHives");

function getHives(req, res) {
  res.json({ success: true, data: mockHives });
}

function getWeather(req, res) {
  res.json({ success: true, data: mockWeather });
}

module.exports = { getHives, getWeather };
