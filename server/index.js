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

    const { prompt = "how to become rich and successful" } = req.body;

    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const outputVideo = path.join(__dirname, "output.mp4");

    const duration = 12;

    const words = prompt.split(" ");
    const wordDuration = duration / words.length;

    // 🎬 FILTERS
    const filters = [];

    // 🔥 1. CINEMATIC ZOOM (Ken Burns)
    filters.push(
      "zoompan=z='min(zoom+0.0005,1.1)':d=125:s=720x1280"
    );

    // 🔥 2. HOOK (TOP TEXT)
    filters.push(
      `drawtext=text='MAKE MONEY FAST':fontcolor=white:fontsize=70:x=(w-text_w)/2:y=80`
    );

    // 🔥 3. WORD BY WORD (CENTER)
    words.forEach((word, i) => {
      const start = i * wordDuration;
      const end = start + wordDuration;

      filters.push(
        `drawtext=text='${word}':fontcolor=cyan:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start},${end})'`
      );
    });

    // 🔥 4. SUBTITLE (BOTTOM)
    filters.push(
      `drawtext=text='${prompt}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-120`
    );

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        .input(musicPath)

        .videoFilters(filters)

        .outputOptions([
          "-t " + duration,
          "-preset ultrafast",
          "-crf 30",
          "-pix_fmt yuv420p",
          "-shortest"
        ])

        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ VIDEO READY");

    res.sendFile(outputVideo);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ error: err.message || "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});