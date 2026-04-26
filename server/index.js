import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🚀 START");

    const { prompt = "how to become rich and successful" } = req.body;

    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const voicePath = path.join(__dirname, "voice.mp3");
    const outputVideo = path.join(__dirname, "output.mp4");

    // 🔥 STEP 1 — GENERATE VOICE
    console.log("🎤 Generating voice...");

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: prompt,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync(voicePath, buffer);

    console.log("✅ Voice saved");

    // 🔥 STEP 2 — GET AUDIO DURATION
    const duration = 12; // keep simple for now

    const words = prompt.split(" ");
    const wordDuration = duration / words.length;

    const filters = [];

    // 🎬 ZOOM
    filters.push("zoompan=z='min(zoom+0.0005,1.1)':d=125:s=720x1280");

    // 🔥 HOOK
    filters.push(
      `drawtext=text='MAKE MONEY FAST':fontcolor=white:fontsize=70:x=(w-text_w)/2:y=80`
    );

    // 🔥 WORD CAPTIONS (still simple, next step = real timing)
    words.forEach((word, i) => {
      const start = i * wordDuration;
      const end = start + wordDuration;

      filters.push(
        `drawtext=text='${word}':fontcolor=cyan:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start},${end})'`
      );
    });

    // 🔥 SUBTITLE
    filters.push(
      `drawtext=text='${prompt}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-120`
    );

    // 🔥 STEP 3 — FFMPEG
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        // 🔥 VOICE
        .input(voicePath)

        // 🔥 MUSIC (LOWER VOLUME)
        .input(musicPath)
        .complexFilter([
          "[2:a]volume=0.2[a2]",
          "[1:a][a2]amix=inputs=2:duration=longest[aout]",
        ])

        .videoFilters(filters)

        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-t " + duration,
          "-preset ultrafast",
          "-crf 30",
          "-shortest",
        ])

        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("🎬 DONE");

    res.sendFile(outputVideo);

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});