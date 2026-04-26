import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = "temp";

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating video:", prompt);

    // -----------------------------
    // VIDEO SOURCES
    // -----------------------------
    const scenes = [
      "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
      "https://videos.pexels.com/video-files/855564/855564-hd_1280_720_25fps.mp4"
    ];

    // -----------------------------
    // AUDIO (royalty-free sample)
    // -----------------------------
    const audioUrl =
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    const audioPath = path.join(TEMP_DIR, "audio.mp3");

    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.buffer();
    fs.writeFileSync(audioPath, audioBuffer);

    // -----------------------------
    // DOWNLOAD VIDEOS
    // -----------------------------
    const videoPaths = [];

    for (let i = 0; i < scenes.length; i++) {
      const filePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      const response = await fetch(scenes[i]);
      const buffer = await response.buffer();

      fs.writeFileSync(filePath, buffer);
      videoPaths.push(filePath);
    }

    // -----------------------------
    // LOOP VIDEOS (MAKE LONGER)
    // -----------------------------
    const loopedList = [];
    for (let i = 0; i < 10; i++) {
      loopedList.push(...videoPaths);
    }

    const concatFile = path.join(TEMP_DIR, "concat.txt");

    fs.writeFileSync(
      concatFile,
      loopedList.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const mergedPath = path.join(TEMP_DIR, "merged.mp4");

    // -----------------------------
    // CONCAT VIDEOS
    // -----------------------------
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p"
        ])
        .save(mergedPath)
        .on("end", resolve)
        .on("error", reject);
    });

    const finalPath = path.join(TEMP_DIR, "final.mp4");

    // -----------------------------
    // ADD AUDIO + TRIM TO DURATION
    // -----------------------------
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(mergedPath)
        .input(audioPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest",
          `-t ${duration}`
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ FINAL VIDEO READY");

    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});