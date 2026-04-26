import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Railway-safe temp dir
const TEMP_DIR = "/tmp";

// --------------------
// GENERATE VIDEO
// --------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt = "test video", duration = 30 } = req.body;

    // 🧠 Create simple scenes
    const scenes = prompt.split(" ").slice(0, 5);

    // 🔥 CLEAN TEMP (prevents conflicts)
    try {
      fs.readdirSync(TEMP_DIR).forEach(file => {
        try {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        } catch {}
      });
    } catch {}

    const sceneVideos = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      const imageUrl = `https://picsum.photos/seed/${scene}/720/1280`;
      const imagePath = path.join(TEMP_DIR, `img${i}.jpg`);
      const videoPath = path.join(TEMP_DIR, `scene${i}.mp4`);

      // 🖼️ Download image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(imagePath, Buffer.from(buffer));

      // 🔥 SAFE TEXT (prevents FFmpeg crash)
      const safeText = scene
        .replace(/'/g, "")
        .replace(/:/g, "")
        .replace(/,/g, "")
        .replace(/\?/g, "")
        .replace(/"/g, "")
        .slice(0, 60);

      // 🎬 Create scene video
      await new Promise((resolve, reject) => {
        ffmpeg(imagePath)
          .loop(duration / scenes.length)
          .videoFilters([
            "scale=720:1280",
            `drawtext=text='${safeText}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=h-200`
          ])
          .outputOptions([
            "-pix_fmt yuv420p",
            "-y" // 🔥 overwrite fix
          ])
          .save(videoPath)
          .on("end", resolve)
          .on("error", reject);
      });

      sceneVideos.push(videoPath);
    }

    // 📄 concat file
    const concatFile = path.join(TEMP_DIR, "concat.txt");
    fs.writeFileSync(
      concatFile,
      sceneVideos.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const finalPath = path.join(TEMP_DIR, "final.mp4");

    // 🔗 merge scenes
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy", "-y"])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🎉 send result
    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

// --------------------
app.listen(8080, () => console.log("Server running 🚀"));