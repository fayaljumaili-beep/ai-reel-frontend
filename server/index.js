import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// helper to run ffmpeg
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.post("/generate-video", async (req, res) => {
  try {
    const { text, style, aesthetic, duration, voice } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("🎬 Request:", { text, style, aesthetic, duration, voice });

    // paths
    const tempVideo = path.join(__dirname, "temp.mp4");
    const captionsPath = path.join(__dirname, "captions.srt");
    const outputVideo = path.join(__dirname, "output.mp4");

    // simple placeholder captions
    const captionContent = `1
00:00:00,000 --> 00:00:05,000
${text}
`;

    fs.writeFileSync(captionsPath, captionContent);

    // sample video source (loop a static color if needed)
    await runCommand(
      `ffmpeg -y -f lavfi -i color=c=black:s=720x1280:d=5 -vf "drawtext=text='AI Reel Studio':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2" ${tempVideo}`
    );

    // FIX: escape path for Linux
    const safeCaptionsPath = captionsPath.replace(/:/g, "\\:");

    // FINAL VIDEO BUILD (optimized to prevent "Killed")
    await runCommand(
      `ffmpeg -y -i "${tempVideo}" -vf "scale=720:-2,subtitles=${safeCaptionsPath}" -preset ultrafast -crf 28 "${outputVideo}"`
    );

    console.log("✅ Video created:", outputVideo);

    // stream video (NO MORE 500s)
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(outputVideo);

    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      res.status(500).end();
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});