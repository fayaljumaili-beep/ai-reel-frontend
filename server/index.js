import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const OUTPUT = path.join(process.cwd(), "server/output.mp4");

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/generate", async (req, res) => {
  console.log("🎬 Generate request received");

  try {
    for (const clip of CLIPS) {
      if (!fs.existsSync(clip)) {
        return res.status(500).send(`Missing file: ${clip}`);
      }
    }

    if (fs.existsSync(OUTPUT)) {
      fs.unlinkSync(OUTPUT);
    }

    const command = ffmpeg();

    CLIPS.forEach((clip) => command.input(clip));

    command
      .on("start", (cmd) => console.log("FFmpeg:", cmd))
      .on("error", (err, stdout, stderr) => {
        console.error("FFmpeg error:", err.message);
        console.error(stderr);

        if (!res.headersSent) {
          res.status(500).send(stderr || err.message);
        }
      })
      .on("end", () => {
        console.log("✅ Video done");

        if (!fs.existsSync(OUTPUT)) {
          return res.status(500).send("No output file");
        }

        res.sendFile(OUTPUT);
      })
      .mergeToFile(OUTPUT);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});