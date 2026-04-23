const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const prompt = (req.body.prompt || "").toLowerCase();

  let videoUrl;

if (prompt.includes("gym")) {
  videoUrl = "https://player.vimeo.com/external/449623360.sd.mp4?s=7c3c1b9a0e4a5d98b9e4c3f8d9f6a1b2&profile_id=165";
} else if (prompt.includes("motivation")) {
  videoUrl = "https://player.vimeo.com/external/434045526.sd.mp4?s=8a2f6b8d3e5c1a7f9c3e4d6b2a1f5c8d&profile_id=165";
} else if (prompt.includes("nature")) {
  videoUrl = "https://player.vimeo.com/external/370467553.sd.mp4?s=9b2c6d7e8f1a3b4c5d6e7f8a9b0c1d2e&profile_id=165";
} else {
  videoUrl = "https://player.vimeo.com/external/403973091.sd.mp4?s=2d3f4a5b6c7e8f9a0b1c2d3e4f5a6b7c&profile_id=165";
}

  res.json({
    videoUrl: videoUrl
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("NEW VERSION DEPLOYED 🚀"); // 👈 ADD THIS LINE
});