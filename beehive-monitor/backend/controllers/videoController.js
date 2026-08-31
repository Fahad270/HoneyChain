const videos = require("../data/videos");

function getVideos(req, res) {
  res.json({ success: true, data: videos });
}

module.exports = { getVideos };
