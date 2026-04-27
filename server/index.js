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
        console.error("FFMPEG ERROR:", stderr);
        return reject(stderr);
      }
      resolve(stdout);
    });
  });

function splitScenes(text) {
  const parts = text
    .split(/,|and|then|\./)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  return parts.length ? parts : [text, "success", "money"];
}

app.post("/generate-video", async (req, res) => {
  try {
    const { text, clips = 3, style = "cinematic" } = req.body;

    const scenes = splitScenes(text).slice(0, clips);

    const normalizedClips = [];

    for (let i = 0; i < scenes.length; i++) {
      try {
        const query = `${scenes[i]} ${style}`;

        const response = await axios.get(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`,
          {
            headers: {
              Authorization: process.env.PEXELS_API_KEY,
            },
          }
        );

        const videoUrl =
          response.data.videos?.[0]?.video_files?.[0]?.link;

        if (!videoUrl) continue;

        const rawPath = path.join(__dirname, `raw${i}.mp4`);
        const cleanPath = path.join(__dirname, `clip${i}.mp4`);

        // download
        const stream = await axios.get(videoUrl, {
          responseType: "stream",
        });

        const writer = fs.createWriteStream(rawPath);
        stream.data.pipe(writer);

        await new Promise((res) => writer.on("finish", res));

        // normalize (THIS FIXES EVERYTHING)
        await run(`
          ffmpeg -y -i ${rawPath} \
          -vf "scale=720:1280,setsar=1" \
          -r 30 \
          -c:v libx264 -preset veryfast \
          -pix_fmt yuv420p \
          -an \
          ${cleanPath}
        `);

        normalizedClips.push(cleanPath);
      } catch (err) {
        console.log("clip failed, skipping...");
      }
    }

    if (normalizedClips.length === 0) {
      throw new Error("No clips generated");
    }

    // create concat list
    const listPath = path.join(__dirname, "list.txt");

    fs.writeFileSync(
      listPath,
      normalizedClips.map((p) => `file ${p}`).join("\n")
    );

    const merged = path.join(__dirname, "merged.mp4");

    await run(
      `ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${merged}`
    );

    // silent audio (no beep)
    const audio = path.join(__dirname, "audio.mp3");

    await run(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 20 ${audio}`
    );

    const final = path.join(__dirname, "final.mp4");

    await run(`
      ffmpeg -y -i ${merged} -i ${audio} \
      -c:v copy -c:a aac -shortest ${final}
    `);

    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(final).pipe(res);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});