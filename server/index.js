import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🚀 START REQUEST");

    const { prompt = "Stay motivated and never give up!" } = req.body;

    // FILE PATHS (IMPORTANT)
    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const outputVideo = path.join(__dirname, "output.mp4");

    const duration = 30; // 🔥 keep low to avoid memory crash

    console.log("📂 Using files:");
    console.log(imagePath);
    console.log(musicPath);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        .input(musicPath)

        .videoFilters([
          // 🔥 SCALE DOWN (critical for Railway memory)
          "scale=720:1280",

          // 🔥 SIMPLE TEXT (low cost)
          `drawtext=text='${prompt}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`
        ])

        .outputOptions([
          "-t " + duration,
          "-preset ultrafast", // 🔥 reduces CPU/RAM
          "-crf 28",           // 🔥 reduces file weight
          "-pix_fmt yuv420p",
          "-shortest"
        ])

        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Video generated");

    res.sendFile(outputVideo);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ error: err.message || "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});