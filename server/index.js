const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const rawPrompt = req.body.prompt;
  const prompt = (rawPrompt || "").toLowerCase().trim();

  console.log("RAW PROMPT:", rawPrompt);
  console.log("CLEAN PROMPT:", prompt);

  let videoUrl;

  if (prompt.includes("gym")) {
  console.log("GYM MATCHED ✅");
  videoUrl = "https://cdn.coverr.co/videos/coverr-man-doing-push-ups-1566/1080p.mp4";
} else if (prompt.includes("motivation")) {
  console.log("MOTIVATION MATCHED ✅");
  videoUrl = "https://cdn.coverr.co/videos/coverr-man-running-at-sunrise-1573/1080p.mp4";
} else if (prompt.includes("nature")) {
  console.log("NATURE MATCHED ✅");
  videoUrl = "https://cdn.coverr.co/videos/coverr-mountain-landscape-1579/1080p.mp4";
} else {
  console.log("DEFAULT TRIGGERED");
  videoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
}

  res.json({ videoUrl });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 THIS FILE IS RUNNING");
  console.log("Server running on port", PORT);
});