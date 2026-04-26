import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating:", prompt);

    // ====== 1. FETCH VIDEOS ======
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      return res.status(400).json({ error: "No videos found" });
    }

    // ====== 2. DOWNLOAD CLIPS ======
    const clips = [];

    for (let i = 0; i < Math.min(3, data.videos.length); i++) {
      const videoUrl = data.videos[i].video_files[0].link;
      const filePath = `clip${i}.mp4`;

      const videoRes = await fetch(videoUrl);
      const buffer = await videoRes.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      clips.push(filePath);
    }

    // ====== 3. CREATE CONCAT FILE ======
    const concatText = clips.map(c => `file '${c}'`).join("\n");
    fs.writeFileSync("concat.txt", concatText);

    // ====== 4. CONCAT VIDEOS ======
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input("concat.txt")
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save("combined.mp4")
        .on("end", resolve)
        .on("error", reject);
    });

    // ====== 5. ADD LOCAL MUSIC ======
    const musicPath = path.join("assets", "music.mp3");

    await new Promise((resolve, reject) => {
      ffmpeg("combined.mp4")
        .input(musicPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest"
        ])
        .save("final.mp4")
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ DONE");

    res.sendFile(path.resolve("final.mp4"));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port 8080");
});