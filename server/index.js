const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      resolve(stdout);
    });
  });

/* 🎬 Split prompt into scenes */
function splitScenes(text) {
  return text
    .split(/,|and|then|\./)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 4);
}

app.post("/generate-video", async (req, res) => {
  try {
    const text = req.body.text;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const scenes = splitScenes(text);

    console.log("Scenes:", scenes);

    const clips = [];

    /* 🎥 Fetch clips from Pexels */
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(
          scene
        )}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const videoUrl =
        response.data.videos?.[0]?.video_files?.[0]?.link;

      if (!videoUrl) continue;

      const clipPath = path.join(__dirname, `clip${i}.mp4`);

      const videoStream = await axios.get(videoUrl, {
        responseType: "stream",
      });

      const writer = fs.createWriteStream(clipPath);
      videoStream.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      clips.push(clipPath);
    }

    if (clips.length === 0) {
      return res.status(500).json({ error: "No clips found" });
    }

    /* 📄 Create concat list */
    const listPath = path.join(__dirname, "list.txt");

    fs.writeFileSync(
      listPath,
      clips.map((c) => `file '${c}'`).join("\n")
    );

    const merged = path.join(__dirname, "merged.mp4");

    /* 🎬 Merge clips */
    await run(
      `ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${merged}`
    );

    /* 🔇 Create silent audio (no beep) */
    const audio = path.join(__dirname, "audio.mp3");

    await run(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 20 -q:a 9 -acodec libmp3lame ${audio}`
    );

    const final = path.join(__dirname, "final.mp4");

    /* 🎧 Attach audio to video */
    await run(`
      ffmpeg -y -i ${merged} -i ${audio} \
      -c:v copy -c:a aac -shortest ${final}
    `);

    console.log("✅ FINAL VIDEO READY");

    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(final).pipe(res);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

/* 🚀 Start server */
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});