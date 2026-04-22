const express = require("express");

const app = express();

// manual CORS (bulletproof)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const prompt = req.body.prompt.toLowerCase();

  let videoUrl;

  if (prompt.includes("gym")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/05/30/24177-339430569_large.mp4";
  } else if (prompt.includes("motivation")) {
    videoUrl = "https://cdn.pixabay.com/video/2020/01/28/31569-387605019_large.mp4";
  } else if (prompt.includes("nature")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/03/26/22388-327070540_large.mp4";
  } else {
    videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
  }

  res.json({ videoUrl });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port", PORT);
});