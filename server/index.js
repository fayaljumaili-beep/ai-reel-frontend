import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = "/tmp";

// ------------------------
// 🔊 SIMPLE TTS (FREE)
async function generateVoice(text, outputPath) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    text
  )}&tl=en&client=tw-ob`;

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// ------------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt = "test video", length = "60" } = req.body;

    let duration = 60;
    if (length === "30") duration = 30;
    if (length === "90") duration = 90;

    // 🧠 split into scenes
    const words = prompt.split(" ");
    const chunkSize = 3;
    const scenes = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      scenes.push(words.slice(i, i + chunkSize).join(" "));
    }

    const sceneCount = Math.min(scenes.length, 5) || 3;
    const sceneDuration = Math.floor(duration / sceneCount);

    // 🔥 clean temp
    try {
      fs.readdirSync(TEMP_DIR).forEach(file => {
        try {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        } catch {}
      });
    } catch {}

    // 🔊 FULL VOICE (entire script)
    const audioPath = path.join(TEMP_DIR, "voice.mp3");
    await generateVoice(prompt, audioPath);

    // 🔥 caption timings (approx sync)
    const captions = words.map((w, i) => ({
      word: w,
      time: i * 0.35
    }));

    const sceneVideos = [];

    for (let i = 0; i < sceneCount; i++) {
      const scene = scenes[i];

      const imageUrl = `https://picsum.photos/seed/${scene}/720/1280`;
      const imagePath = path.join(TEMP_DIR, `img${i}.jpg`);
      const videoPath = path.join(TEMP_DIR, `scene${i}.mp4`);

      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(imagePath, Buffer.from(buffer));

      // 🎬 NO drawtext → stable
      await new Promise((resolve, reject) => {
        ffmpeg(imagePath)
          .loop(sceneDuration)
          .outputOptions([
            "-vf scale=720:1280",
            "-pix_fmt yuv420p",
            "-y"
          ])
          .save(videoPath)
          .on("end", resolve)
          .on("error", reject);
      });

      sceneVideos.push(videoPath);
    }

    // 🔗 concat scenes
    const concatFile = path.join(TEMP_DIR, "concat.txt");
    fs.writeFileSync(
      concatFile,
      sceneVideos.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const mergedPath = path.join(TEMP_DIR, "merged.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy", "-y"])
        .save(mergedPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🔊 add audio
    const finalPath = path.join(TEMP_DIR, "final.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg(mergedPath)
        .input(audioPath)
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-shortest",
          "-y"
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🎯 IMPORTANT: send BOTH video + captions
    res.json({
      video: "/video-file",
      captions,
      url: "https://ai-reel-studio-production.up.railway.app/video-file"
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

// serve video
app.get("/video-file", (req, res) => {
  res.sendFile(path.resolve("/tmp/final.mp4"));
});

app.listen(8080, () => console.log("Server running 🚀"));