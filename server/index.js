import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// helper to run ffmpeg
async function run(cmd) {
  console.log("Running:", cmd);
  try {
    await execPromise(cmd);
  } catch (err) {
    console.error("FFMPEG ERROR:", err.stderr || err);
    throw err;
  }
}

// 🎬 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const scenes = [
      prompt,
      "entrepreneur success",
      "luxury cars lifestyle",
      "money rain slow motion",
      "celebration victory"
    ];

    const clips = [];

    // 🎥 DOWNLOAD + NORMALIZE CLIPS
    for (let i = 0; i < scenes.length; i++) {
      const keyword = scenes[i];

      console.log("🔍 Searching:", keyword);

      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=5`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const videos = response.data.videos;

      if (!videos || videos.length === 0) {
        console.log("⚠️ No videos for:", keyword);
        continue;
      }

      // 🎯 pick random video
      const randomVideo =
        videos[Math.floor(Math.random() * videos.length)];

      const videoUrl = randomVideo?.video_files?.[0]?.link;

      if (!videoUrl) {
        console.log("⚠️ Invalid video for:", keyword);
        continue;
      }

      const rawPath = path.join(TMP_DIR, `raw_${i}.mp4`);
      const cleanPath = path.join(TMP_DIR, `clip_${i}.mp4`);

      // download
      const video = await axios.get(videoUrl, {
        responseType: "stream",
      });

      const writer = fs.createWriteStream(rawPath);
      video.data.pipe(writer);

      await new Promise((resolve) =>
        writer.on("finish", resolve)
      );

      // 🎯 normalize clip
      await run(
        `ffmpeg -y -i ${rawPath} -vf "scale=720:1280,setsar=1" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${cleanPath}`
      );

      clips.push(cleanPath);
    }

    console.log("🎬 CLIPS:", clips);

    if (clips.length < 2) {
      throw new Error("Not enough clips downloaded");
    }

    // 📄 CREATE CONCAT LIST
    const listPath = path.join(TMP_DIR, "list.txt");

    const listContent = clips
      .map((c) => `file '${path.resolve(c)}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    console.log("📄 LIST FILE:\n", listContent);

    const mergedPath = path.join(TMP_DIR, "merged.mp4");

    // 🔗 MERGE CLIPS (FORCE RE-ENCODE = GUARANTEED MULTI SCENE)
    await run(
      `ffmpeg -y -f concat -safe 0 -i ${listPath} -vf "scale=720:1280,setsar=1" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${mergedPath}`
    );

    // 🔇 CREATE SILENT AUDIO
    const audioPath = path.join(TMP_DIR, "audio.mp3");

    await run(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 20 ${audioPath}`
    );

    const finalPath = path.join(TMP_DIR, "final.mp4");

    // 🎥 FINAL VIDEO
    await run(
      `ffmpeg -y -i ${mergedPath} -i ${audioPath} -c:v copy -c:a aac -shortest ${finalPath}`
    );

    // send result
    res.sendFile(path.resolve(finalPath));
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send("Error generating video");
  }
});

// health check
app.get("/", (req, res) => {
  res.send("Server running");
});

// start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});