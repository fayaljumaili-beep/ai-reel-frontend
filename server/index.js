import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_, res) => {
  res.send("AI Reel backend running 🚀");
});

// ✅ FULL FINAL generate-video route
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, audioUrl, voiceUrl, audio, url } = req.body;

    const finalAudioUrl = audioUrl || voiceUrl || audio || url;

    if (!finalAudioUrl) {
      return res.status(400).send("Missing voice URL");
    }

    console.log("PROMPT:", prompt);
    console.log("FINAL AUDIO URL:", finalAudioUrl);

    // replace this with your real downloaded stock footage path
    const stockVideoPath = "/tmp/stock-video.mp4";
    const outputPath = `/tmp/viral-reel-${Date.now()}.mp4`;

    if (!fs.existsSync(stockVideoPath)) {
      return res.status(400).send("Missing stock video file");
    }

    ffmpeg()
      .input(stockVideoPath)
      .input(finalAudioUrl)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset veryfast",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .size("720x1280")
      .on("end", () => {
        console.log("VIDEO CREATED SUCCESSFULLY");
        return res.download(outputPath);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err);
        return res.status(400).send(`FFmpeg failed: ${err.message}`);
      })
      .save(outputPath);
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    return res.status(400).send(`Route failed: ${error.message}`);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
