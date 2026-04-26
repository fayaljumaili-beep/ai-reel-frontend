import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

/* --------------------------
   🔹 Get random background video
-------------------------- */
function getRandomVideo() {
  const videosDir = path.join(__dirname, "assets", "videos");

  if (!fs.existsSync(videosDir)) {
    throw new Error("videos folder missing");
  }

  const files = fs.readdirSync(videosDir).filter(f => f.endsWith(".mp4"));

  if (files.length === 0) {
    throw new Error("no videos found");
  }

  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(videosDir, random);
}

/* --------------------------
   🔹 Build video
-------------------------- */
function buildVideo({ text, duration, outputPath }) {
  return new Promise((resolve, reject) => {
    try {
      const inputVideo = getRandomVideo();

      const safeText = text.replace(/:/g, "\\:").replace(/'/g, "\\'");

      const ffmpegArgs = [
        "-y",
        "-stream_loop", "-1",
        "-t", duration.toString(),
        "-i", inputVideo,

        "-vf",
        `drawtext=text='${safeText}':fontcolor=white:fontsize=40:x=20:y=20`,

        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "23",

        "-an",
        outputPath
      ];

      const ffmpeg = execFile("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) => {
        console.log("FFmpeg:", data.toString());
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error("FFmpeg failed"));
        }
      });

    } catch (err) {
      reject(err);
    }
  });
}

/* --------------------------
   🔹 API route
-------------------------- */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration } = req.body;

    const videoDuration =
      duration === "60 sec" ? 60 :
      duration === "90 sec" ? 90 : 8;

    const outputPath = path.join(__dirname, "output.mp4");

    const video = await buildVideo({
      text: prompt,
      duration: videoDuration,
      outputPath
    });

    res.sendFile(video);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------
   🔹 Health check
-------------------------- */
app.get("/", (req, res) => {
  res.send("🚀 Server running");
});

/* --------------------------
   🔹 Start server
-------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});