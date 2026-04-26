import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🚀 START REQUEST");

    const { prompt = "motivation", duration = 60 } = req.body;

    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const voicePath = path.join(__dirname, "voice.mp3");
    const outputVideo = path.join(__dirname, "final.mp4");

    // ========================
    // 1. SCRIPT
    // ========================
    console.log("🧠 Generating script...");
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short viral motivational script about: ${prompt}`,
        },
      ],
    });

    const script =
      scriptRes.choices?.[0]?.message?.content ||
      "Stay focused. Work hard. You will succeed.";

    console.log("✅ Script OK");

    // ========================
    // 2. VOICE
    // ========================
    console.log("🔊 Generating voice...");
    const tts = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    fs.writeFileSync(voicePath, buffer);

    console.log("✅ Voice saved");

    // ========================
    // 3. VALIDATE FILES
    // ========================
    if (!fs.existsSync(imagePath)) {
      throw new Error("image.jpg missing in /server");
    }

    if (!fs.existsSync(musicPath)) {
      throw new Error("music.mp3 missing in /server/assets");
    }

    if (!fs.existsSync(voicePath)) {
      throw new Error("voice.mp3 not generated");
    }

    console.log("✅ All files exist");

    // ========================
    // 4. FFMPEG
    // ========================
    console.log("🎬 Rendering video...");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)
        .input(voicePath)
        .input(musicPath)
        .complexFilter([
          "[1:a]volume=1[a1]",
          "[2:a]volume=0.25[a2]",
          "[a1][a2]amix=inputs=2:duration=longest[aout]",
        ])
        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-t " + duration,
          "-shortest",
        ])
        .videoFilters([
          `drawtext=text='${prompt}':fontcolor=cyan:fontsize=40:x=(w-text_w)/2:y=h-100`,
        ])
        .save(outputVideo)
        .on("end", () => {
          console.log("✅ Video complete");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFMPEG ERROR:", err);
          reject(err);
        });
    });

    // ========================
    // 5. RETURN
    // ========================
    res.sendFile(outputVideo);
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);

    res.status(500).json({
      error: err.message || "FAILED",
    });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});