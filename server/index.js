const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// 🔥 HARD CORS FIX
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "No script provided" });
    }

    const audioPath = path.join(__dirname, "assets", "audio.mp3");
    const imagePath = path.join(__dirname, "assets", "image.jpg");
    const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);


    // 🎬 CREATE VIDEO
    ffmpeg()
      .input(imagePath)       // ✅ local image
      .loop(10)              // loop image for duration
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-shortest"
      ])
      .save(outputPath)
      .on("end", () => {
        res.json({
          videoUrl: `https://ai-reel-studio-production.up.railway.app/${path.basename(outputPath)}`
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "FFmpeg failed" });
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// ✅ serve video files
app.use(express.static(__dirname));

app.listen(3000, () => console.log("Server running"));