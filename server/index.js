import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;

// ---------- SCRIPT ----------
function generateScript(prompt) {
  return [
    "Nobody tells you this...",
    "You are wasting your time every day.",
    "Success comes from discipline.",
    "Stop waiting for motivation.",
    "Start building today.",
    "Your future depends on this."
  ];
}

// ---------- GET CLIPS ----------
async function getClip(query, i) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  const data = await res.json();
  const url = data.videos[0]?.video_files[0]?.link;

  const filePath = `clip_${i}.mp4`;

  const videoRes = await fetch(url);
  const buffer = await videoRes.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  return filePath;
}

// ---------- VOICE ----------
async function generateVoice(text) {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        }
      })
    }
  );

  const audioBuffer = await res.arrayBuffer();
  fs.writeFileSync("voice.mp3", Buffer.from(audioBuffer));
}

// ---------- MAIN ----------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 60 } = req.body;

    const script = generateScript(prompt);

    // 🎬 GET CLIPS
    const clips = await Promise.all(
      script.map((line, i) => getClip(line, i))
    );

    // 🔊 GENERATE VOICE
    await generateVoice(script.join(" "));

    // 📄 CREATE CONCAT FILE
    const listFile = "clips.txt";
    fs.writeFileSync(
      listFile,
      clips.map(c => `file '${path.resolve(c)}'`).join("\n")
    );

    // 🎬 CONCAT CLIPS
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -f concat -safe 0 -i ${listFile} -c copy combined.mp4`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 🔊 ADD AUDIO
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i combined.mp4 -i voice.mp3 -c:v copy -c:a aac -shortest with_audio.mp4`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 💬 CAPTIONS
    const segment = duration / script.length;

    const subtitleFilter = script
      .map((line, i) => {
        const start = (i * segment).toFixed(2);
        const end = ((i + 1) * segment).toFixed(2);

        return `drawtext=text='${line}':x=(w-text_w)/2:y=h-120:fontsize=42:fontcolor=white:enable='between(t,${start},${end})'`;
      })
      .join(",");

    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i with_audio.mp4 -vf "${subtitleFilter}" -y final.mp4`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 📦 SEND VIDEO
    res.download("final.mp4");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video");
  }
});

app.listen(PORT, () => console.log("Server running 🚀"));