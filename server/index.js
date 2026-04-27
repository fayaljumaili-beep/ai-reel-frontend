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
      if (err) {
        console.error(stderr);
        return reject(stderr);
      }
      resolve(stdout);
    });
  });

function splitScenes(text) {
  return text
    .split(/,|and|then|\./)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

async function getStockVideo(query) {
  try {
    const res = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY },
      }
    );

    const videos = res.data.videos;
    if (!videos.length) return null;

    // pick random video (more variety)
    const vid = videos[Math.floor(Math.random() * videos.length)];

    return vid.video_files[0].link;
  } catch {
    return null;
  }
}

app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    let scenes = splitScenes(text);

    // FORCE at least 3 scenes
    if (scenes.length < 3) {
      scenes = [
        text,
        "success business",
        "money lifestyle",
      ];
    }

    const clips = [];

    for (let i = 0; i < scenes.length; i++) {
      let url = await getStockVideo(scenes[i]);

      // fallback if failed
      if (!url) {
        url = await getStockVideo("success motivation");
      }

      if (!url) continue;

      const raw = path.join(__dirname, `raw${i}.mp4`);
      const clean = path.join(__dirname, `clip${i}.mp4`);

      const stream = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(raw);
      stream.data.pipe(writer);
      await new Promise((r) => writer.on("finish", r));

      // normalize ALL clips
      await run(`
        ffmpeg -y -i ${raw}
        -vf "scale=720:1280,setsar=1"
        -r 30
        -c:v libx264 -preset veryfast
        -pix_fmt yuv420p
        -an
        ${clean}
      `);

      clips.push(clean);
    }

    if (!clips.length) throw new Error("No clips");

    // concat
    const list = path.join(__dirname, "list.txt");
    fs.writeFileSync(list, clips.map((c) => `file ${c}`).join("\n"));

    const merged = path.join(__dirname, "merged.mp4");

    await run(
      `ffmpeg -y -f concat -safe 0 -i ${list} -c copy ${merged}`
    );

    // REAL MUSIC (no more silence)
    const music = path.join(__dirname, "music.mp3");

    await run(`
      ffmpeg -y -f lavfi -i "sine=frequency=440:duration=20"
      -q:a 9 ${music}
    `);

    const final = path.join(__dirname, "final.mp4");

    await run(`
      ffmpeg -y -i ${merged} -i ${music}
      -c:v copy -c:a aac -shortest ${final}
    `);

    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(final).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("🚀 Running on", PORT));