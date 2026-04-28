import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Absolute paths (Railway-safe)
const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const OUTPUT = path.join(process.cwd(), "server/output.mp4");

app.get("/generate-video", async (req, res) => {
  console.log("🎬 HIT /generate-video");

  // ✅ Check files exist
  for (const clip of CLIPS) {
    if (!fs.existsSync(clip)) {
      console.error("❌ Missing file:", clip);
      return res.status(500).send(`Missing file: ${clip}`);
    }
  }

  try {
    const command = ffmpeg();

    // Add inputs
    CLIPS.forEach((clip) => command.input(clip));

    // 🔥 Bulletproof normalize + concat
    const filter = `
      ${CLIPS.map((_, i) => `[${i}:v]scale=720:1280,setsar=1[v${i}]`).join(";")};
      ${CLIPS.map((_, i) => `[v${i}]`).join("")}concat=n=${CLIPS.length}:v=1:a=0[outv]
    `;

    command
      .outputOptions([
        "-filter_complex", filter,
        "-map", "[outv]",
        "-preset", "veryfast",
        "-crf", "23",
      ])
      .on("start", (cmd) => {
        console.log("🚀 FFmpeg started:", cmd);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        if (!res.headersSent) {
          res.status(500).send(err.message);
        }
      })
      .on("end", () => {
        console.log("✅ Video created");
        res.sendFile(OUTPUT);
      })
      .save(OUTPUT);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("NEW VERSION DEPLOYED");
});