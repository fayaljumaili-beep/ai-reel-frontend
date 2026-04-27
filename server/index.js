import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ===============================
// 🎬 GENERATE VIDEO ENDPOINT
// ===============================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("📩 Request:", prompt);

    // 1. Get clips
    const clips = await getClips(prompt);
    console.log("🎞 Clips:", clips);

    // 2. Generate voice
    const voicePath = await generateVoice(prompt);
    console.log("🎙 Voice:", voicePath);

    // 3. Output path
    const outputPath = path.join(process.cwd(), "output.mp4");

    // 4. Build video
    await buildVideo(clips, voicePath, outputPath);

    // 5. Send result
    res.sendFile(outputPath);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🎥 GET STOCK CLIPS (PEXELS)
// ===============================
async function getClips(query) {
  const API_KEY = process.env.PEXELS_API_KEY;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${query}&per_page=3`,
    {
      headers: {
        Authorization: API_KEY,
      },
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error("No videos found");
  }

  const clips = [];

  for (let i = 0; i < 3; i++) {
    const videoUrl = data.videos[i].video_files[0].link;
    const filePath = path.join(process.cwd(), `clip-${i}.mp4`);

    const videoRes = await fetch(videoUrl);
    const buffer = await videoRes.buffer();

    fs.writeFileSync(filePath, buffer);
    clips.push(filePath);
  }

  return clips;
}

// ===============================
// 🔊 GENERATE VOICE (OPENAI TTS)
// ===============================
async function generateVoice(text) {
  const apiKey = process.env.OPENAI_API_KEY;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("OpenAI TTS error: " + err);
  }

  const buffer = await res.arrayBuffer();
  const filePath = path.join(process.cwd(), "voice.mp3");

  fs.writeFileSync(filePath, Buffer.from(buffer));

  return filePath;
}

// ===============================
// 🎬 BUILD VIDEO (FIXED FFmpeg)
// ===============================
function buildVideo(clips, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log("🎬 Building video...");

    const command = ffmpeg();

    // add clips
    clips.forEach((clip) => command.input(clip));

    // add audio
    command.input(audioPath);

    command
      .on("start", (cmd) => console.log("🚀 FFmpeg:", cmd))
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("✅ Video built!");
        resolve();
      })
      .mergeToFile(outputPath);
  });
}

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Server running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});