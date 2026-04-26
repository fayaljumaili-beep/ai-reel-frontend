import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_PATH = path.join(__dirname, "assets/videos");


// 🔒 Escape text for FFmpeg
function escapeText(text) {
  return text
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\n/g, " ");
}


// 🎥 Get local fallback video
function getLocalVideo() {
  const files = fs.readdirSync(VIDEOS_PATH)
    .filter(f => f.endsWith(".mp4"));

  if (!files.length) {
    throw new Error("No local videos found");
  }

  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(VIDEOS_PATH, random);
}


// 🌍 Fetch from Pexels
async function getPexelsVideo(query) {
  try {
    console.log("🔎 Fetching Pexels video...");

    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    const data = await res.json();

    if (!data.videos || data.videos.length === 0) {
      throw new Error("No Pexels videos");
    }

    const video = data.videos[Math.floor(Math.random() * data.videos.length)];
    const file = video.video_files.find(v => v.quality === "sd") || video.video_files[0];

    const tempPath = path.join(__dirname, "temp.mp4");

    const videoRes = await fetch(file.link);
    const buffer = await videoRes.arrayBuffer();

    fs.writeFileSync(tempPath, Buffer.from(buffer));

    console.log("✅ Using Pexels video");

    return tempPath;

  } catch (err) {
    console.log("⚠️ Pexels failed → using local video");
    return getLocalVideo();
  }
}


// 🎬 Build video (FIXED)
function buildVideo({ input, text, output }) {
  return new Promise((resolve, reject) => {

    const safeText = escapeText(text).slice(0, 100);

    const cmd = `ffmpeg -y -i "${input}" -vf "drawtext=text='${safeText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-150" -t 8 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${output}"`;

    console.log("🎬 Running FFmpeg...");

    exec(cmd, (err) => {
      if (err) {
        console.error("FFmpeg error:", err);
        return reject(err);
      }
      resolve(output);
    });
  });
}


// 🚀 API
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const inputVideo = await getPexelsVideo(prompt);

    const outputPath = path.join(__dirname, "output.mp4");

    await buildVideo({
      input: inputVideo,
      text: prompt,
      output: outputPath
    });

    res.sendFile(outputPath);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});


// ❤️ Health check
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});