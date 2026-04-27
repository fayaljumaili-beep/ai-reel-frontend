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

function run(cmd) {
  return new Promise((res, rej) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return rej(stderr);
      res(stdout);
    });
  });
}

async function getVideos(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`,
    {
      headers: { Authorization: process.env.PEXELS_API_KEY },
    }
  );

  const data = await res.json();

  return data.videos.slice(0, 3).map(v =>
    v.video_files.find(f => f.quality === "sd")?.link || v.video_files[0].link
  );
}

// 🔊 AI VOICE
async function generateVoice(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVEN_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.7,
      },
    }),
  });

  const buffer = await res.arrayBuffer();
  const file = path.join(__dirname, "voice.mp3");
  fs.writeFileSync(file, Buffer.from(buffer));
  return file;
}

app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    console.log("🎬 FULL AI REEL:", text);

    const clips = await getVideos(text);

    const trimmed = [];

    // download + trim
    for (let i = 0; i < clips.length; i++) {
      const raw = path.join(__dirname, `c${i}.mp4`);
      const out = path.join(__dirname, `t${i}.mp4`);

      await run(`curl -L "${clips[i]}" -o "${raw}"`);
      await run(`ffmpeg -y -i "${raw}" -t 3 -vf scale=720:-2 -preset ultrafast "${out}"`);

      trimmed.push(out);
    }

    // concat
    const list = path.join(__dirname, "list.txt");
    fs.writeFileSync(list, trimmed.map(p => `file '${p}'`).join("\n"));

    const merged = path.join(__dirname, "merged.mp4");

    await run(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${merged}"`);

    // 🔊 voice
    const voice = await generateVoice(text);

    // 🎵 simple background tone (no API needed)
    const music = path.join(__dirname, "music.mp3");

    await run(
      `ffmpeg -y -f lavfi -i "sine=frequency=200:duration=15" -q:a 9 "${music}"`
    );

    const final = path.join(__dirname, "final.mp4");

    // 🎬 merge video + voice + music
    await run(`
      ffmpeg -y -i "${merged}" -i "${voice}" -i "${music}" \
      -filter_complex "[1:a]volume=1[a1];[2:a]volume=0.2[a2];[a1][a2]amix=inputs=2:duration=longest" \
      -map 0:v -map "[a1]" \
      -shortest \
      -preset ultrafast \
      "${final}"
    `);

    console.log("🔥 FINAL VIDEO READY");

    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(final).pipe(res);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(8080, () => console.log("🚀 Running"));