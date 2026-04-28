import express from "express";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import cors from "cors";


const app = express();
app.use(cors({
  origin: "*", // allow all (for now)
}));

const PORT = process.env.PORT || 8080;

// 🔥 absolute paths (CRITICAL)
const ASSETS_PATH = path.join(process.cwd(), "server/assets");

const LOCAL_VIDEOS = [
  path.join(ASSETS_PATH, "clip-0.mp4"),
  path.join(ASSETS_PATH, "clip-1.mp4"),
  path.join(ASSETS_PATH, "clip-2.mp4"),
];

const AUDIO = path.join(ASSETS_PATH, "music.mp3");
const OUTPUT = path.join(process.cwd(), "output.mp4");

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    // 👉 simple test: single video (stable)
    const inputVideo = LOCAL_VIDEOS[0];

    ffmpeg(inputVideo)
      .outputOptions([
        "-pix_fmt yuv420p",
      ])
      .on("start", (cmd) => console.log("FFmpeg cmd:", cmd))
      .on("end", () => {
        console.log("✅ Video generated");
        res.sendFile(OUTPUT);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).json({ error: err.message });
      })
      .save(OUTPUT);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// start server
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});