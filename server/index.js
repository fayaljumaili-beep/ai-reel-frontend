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

    const duration = 12; // keep light

    // 🔥 SPLIT INTO WORDS
    const words = prompt.split(" ");
    const wordDuration = duration / words.length;

    // 🔥 BUILD WORD-BY-WORD CAPTIONS
    const filters = [];

    words.forEach((word, i) => {
      const start = i * wordDuration;
      const end = start + wordDuration;

      filters.push(
        `drawtext=text='${word}':fontcolor=cyan:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start},${end})'`
      );
    });

    // 🔥 ADD BACKGROUND SCALE
    filters.unshift("scale=720:1280");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        .input(musicPath)

        .videoFilters(filters)

        .outputOptions([
          "-t " + duration,
          "-preset ultrafast",
          "-crf 28",
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