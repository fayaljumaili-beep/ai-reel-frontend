import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (VERY IMPORTANT for audio/video access)
app.use(express.static(process.cwd()));

/**
 * 🎬 1. GENERATE SCRIPT
 */
app.post("/generate-script", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Missing topic" });
    }

    const script = `🎬 Viral Faceless Reel Script: "${topic}"

1. Hook (0–3s)
Start with a bold or emotional statement.

2. Main Point (3–8s)
Deliver the core idea clearly.

3. Value (8–15s)
Give insight, transformation, or lesson.

4. CTA (15–20s)
Tell viewers to follow for more.`;

    res.json({ script });
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
    res.status(500).json({ error: "Script generation failed" });
  }
});

/**
 * 🔊 2. GENERATE VOICEOVER (Mock for now)
 */
app.post("/voiceover", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    const inputPath = path.join(process.cwd(), "voice.mp3");
    const outputPath = path.join(process.cwd(), "voice-output.mp3");

    if (!fs.existsSync(inputPath)) {
      return res.status(500).json({
        error: "voice.mp3 not found in server folder",
      });
    }

    // Copy mock voice file
    fs.copyFileSync(inputPath, outputPath);

    // Return accessible URL
    res.json({
      audioUrl: "/voice-output.mp3",
    });
  } catch (error) {
    console.error("VOICEOVER ERROR:", error);
    res.status(500).json({ error: "Voiceover failed" });
  }
});

/**
 * 🎥 3. GENERATE VIDEO
 */
app.post("/generate-video", async (req, res) => {
  try {
    const videoPath = path.join(process.cwd(), "sample.mp4");
    const audioPath = path.join(process.cwd(), "voice-output.mp3");
    const outputPath = path.join(process.cwd(), "viral-reel.mp4");

    // Validate files exist
    if (!fs.existsSync(videoPath)) {
      return res.status(500).json({
        error: "sample.mp4 missing in server folder",
      });
    }

    if (!fs.existsSync(audioPath)) {
      return res.status(500).json({
        error: "voice-output.mp3 missing — generate voice first",
      });
    }

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v copy",
        "-preset ultrafast",
        "-crf 32",
        "-movflags frag_keyframe+empty_moov",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        const videoBuffer = fs.readFileSync(outputPath);

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="viral-reel.mp4"'
        );

        res.end(videoBuffer);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err);
        res.status(500).json({ error: "Video generation failed" });
      });
  } catch (error) {
    console.error("VIDEO CRASH:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

/**
 * 🚀 HEALTH CHECK (optional but useful)
 */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});