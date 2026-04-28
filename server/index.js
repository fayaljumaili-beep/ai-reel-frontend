import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// ✅ Absolute paths (Railway safe)
const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const OUTPUT = path.join(process.cwd(), "server/output.mp4");

// ✅ helper to escape text (safe for ffmpeg)
function safeText(text) {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

app.get("/generate-video", (req, res) => {
  console.log("🎬 HIT /generate-video");

  try {
    const command = ffmpeg();

    CLIPS.forEach((clip) => {
      command.input(clip);
    });

    command
      .complexFilter([
        ...CLIPS.map((_, i) => ({
          filter: "scale",
          options: { w: 720, h: 1280 },
          inputs: `${i}:v`,
          outputs: `v${i}`,
        })),
        {
          filter: "concat",
          options: {
            n: CLIPS.length,
            v: 1,
            a: 0,
          },
          inputs: CLIPS.map((_, i) => `v${i}`),
          outputs: "v",
        },
      ])
      .outputOptions(["-map [v]", "-c:v libx264"])
      .save(OUTPUT)
      .on("end", () => {
        console.log("✅ DONE");
        res.sendFile(OUTPUT);
      })
      .on("error", (err) => {
        console.error("❌ ERROR:", err.message);
        res.status(500).send(err.message);
      });

  } catch (err) {
    console.error("❌ CRASH:", err.message);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("NEW VERSION DEPLOYED");
});