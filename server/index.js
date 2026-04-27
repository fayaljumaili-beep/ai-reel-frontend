import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

// 🎥 Fetch MULTIPLE clips
async function getStockVideos(query, count = 3) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error("No videos found");
  }

  // shuffle + pick N
  const shuffled = data.videos.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map(video => {
    const file =
      video.video_files.find(v => v.quality === "sd") ||
      video.video_files[0];

    return file.link;
  });
}

app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("🎬 Multi-clip request:", text);

    const clips = await getStockVideos(text, 3);

    const clipPaths = [];

    // 📥 download clips
    for (let i = 0; i < clips.length; i++) {
      const filePath = path.join(__dirname, `clip${i}.mp4`);
      await runCommand(`curl -L "${clips[i]}" -o "${filePath}"`);
      clipPaths.push(filePath);
    }

    // ✂️ trim each clip to 3–4 sec
    const trimmedPaths = [];

    for (let i = 0; i < clipPaths.length; i++) {
      const out = path.join(__dirname, `trim${i}.mp4`);
      await runCommand(
        `ffmpeg -y -i "${clipPaths[i]}" -t 3 -vf "scale=720:-2" -preset ultrafast "${out}"`
      );
      trimmedPaths.push(out);
    }

    // 📄 concat list
    const listFile = path.join(__dirname, "list.txt");
    const listContent = trimmedPaths.map(p => `file '${p}'`).join("\n");
    fs.writeFileSync(listFile, listContent);

    const mergedVideo = path.join(__dirname, "merged.mp4");

    // 🔗 merge clips
    await runCommand(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${mergedVideo}"`
    );

    // 📝 captions
    const captionsPath = path.join(__dirname, "captions.srt");
    const captionContent = `1
00:00:00,000 --> 00:00:10,000
${text}
`;
    fs.writeFileSync(captionsPath, captionContent);

    const safeCaptionsPath = captionsPath.replace(/:/g, "\\:");

    const finalVideo = path.join(__dirname, "final.mp4");

    // 🎬 add subtitles
    await runCommand(
      `ffmpeg -y -i "${mergedVideo}" -vf "subtitles=${safeCaptionsPath}" -preset ultrafast -crf 28 "${finalVideo}"`
    );

    console.log("✅ Multi-clip video ready");

    // 🚀 stream
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(finalVideo);
    stream.pipe(res);

    stream.on("error", err => {
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
  console.log(`🚀 Server running on ${PORT}`);
});