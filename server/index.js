import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI Reel backend live 🚀");
});

app.post("/generate", async (req, res) => {
  try {
    const { topic, tone, niche } = req.body;

    const prompt = `
Create a short viral faceless reel script.

Topic: ${topic}
Tone: ${tone}
Niche: ${niche}

Return JSON in this exact shape:
{
  "hook": "",
  "scenes": ["", "", ""],
  "cta": ""
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content;
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (error) {
    console.error("Script generation error:", error);
    res.status(500).json({ error: "Failed to generate script" });
  }
});

app.post("/generate-voice", async (req, res) => {
  try {
    const { text } = req.body;

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    const audioPath = path.join(process.cwd(), "voiceover.mp3");

    fs.writeFileSync(audioPath, audioBuffer);

    res.download(audioPath, "voiceover.mp3");
  } catch (error) {
    console.error("Voice generation error:", error);
    res.status(500).json({ error: "Failed to generate voiceover" });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const sampleVideoPath = path.join(process.cwd(), "server", "sample.mp4");
    const audioPath = path.join(process.cwd(), "voiceover.mp3");
    const outputPath = path.join(process.cwd(), "final-reel.mp4");

    console.log("🎬 sample path:", sampleVideoPath);
    console.log("🎵 audio path:", audioPath);
    console.log("📦 output path:", outputPath);

    ffmpeg(sampleVideoPath)
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ video created:", outputPath);
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err, stdout, stderr) => {
        console.error("❌ FFMPEG ERROR:", err.message);
        console.error("📤 STDOUT:", stdout);
        console.error("📥 STDERR:", stderr);

        res.status(500).json({
          error: "FFmpeg merge failed",
          details: stderr || err.message,
        });
      });
  } catch (error) {
    console.error("❌ Video route crash:", error);
    res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});