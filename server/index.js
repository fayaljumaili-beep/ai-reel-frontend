import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI Reel Studio backend running 🚀");
});

/* =========================
   GENERATE SCRIPT
========================= */
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create a viral faceless reel script with hook, 5 short scenes, and CTA.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    res.json({ script });
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
    res.status(500).json({ error: "Script generation failed" });
  }
});

/* =========================
   GENERATE VOICE
========================= */
app.post("/voiceover", async (req, res) => {
  try {
    const { text } = req.body;

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const filePath = path.join(process.cwd(), "voiceover.mp3");
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    res.download(filePath);
  } catch (error) {
    console.error("VOICE ERROR:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

/* =========================
   GENERATE VIDEO WITH PEXELS
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    const searchTerm = text.split(" ").slice(0, 3).join(" ");

    const pexelsRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        searchTerm
      )}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videoUrl =
      pexelsRes.data.videos[0].video_files.find(
        (v) => v.quality === "sd"
      )?.link || pexelsRes.data.videos[0].video_files[0].link;

    const videoPath = path.join(process.cwd(), "stock.mp4");
    const writer = fs.createWriteStream(videoPath);

    const videoStream = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
    });

    videoStream.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const voice = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const audioPath = path.join(process.cwd(), "voice.mp3");
    const audioBuffer = Buffer.from(await voice.arrayBuffer());
    fs.writeFileSync(audioPath, audioBuffer);

    const outputPath = path.join(process.cwd(), "viral-reel.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(audioPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset ultrafast",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-shortest",
        ])
        .size("720x1280")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    res.download(outputPath);
  } catch (error) {
    console.error("VIDEO ERROR:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});