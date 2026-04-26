import express from "express";
import cors from "cors";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 10 } = req.body;

    const videoDuration = Number(duration) || 10;

    const imagePath = "./server/image.jpg";
    const audioPath = "./server/music.mp3";
    const outputPath = "./server/output.mp4";

    if (!fs.existsSync(imagePath)) {
      return res.status(400).json({ error: "image missing" });
    }

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ error: "audio missing" });
    }

    // 🧠 SIMPLE SCRIPT (replace later with AI if you want)
    const script = `${prompt}`;

    const words = script.split(" ");

    const wordsPerSecond = words.length / videoDuration;
    const timePerWord = 1 / wordsPerSecond;

    // 🎬 Build dynamic captions
    const captions = words.map((word, i) => {
      const start = i * timePerWord;
      const end = start + timePerWord;

      return `drawtext=text='${word}':fontcolor=cyan:fontsize=60:x=(w-text_w)/2:y=h-200:enable='between(t,${start.toFixed(
        2
      )},${end.toFixed(2)})'`;
    });

    // 🔥 BIG HOOK at top (first 2 sec)
    const hook = `drawtext=text='${words
      .slice(0, 3)
      .join(" ")}':fontcolor=yellow:fontsize=80:x=(w-text_w)/2:y=80:enable='between(t,0,2)'`;

    const filters = [
      // zoom effect
      "zoompan=z='min(zoom+0.0005,1.5)':d=125",

      hook,
      ...captions,
    ];

    ffmpeg()
      .input(imagePath)
      .loop(videoDuration)
      .input(audioPath)
      .outputOptions([
        "-t " + videoDuration,
        "-vf " + filters.join(","),
        "-pix_fmt yuv420p",
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        res.sendFile(path.resolve(outputPath));
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).json({ error: "ffmpeg failed" });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});