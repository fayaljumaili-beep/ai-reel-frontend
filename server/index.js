import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ----------------------
// 🧠 HELPERS
// ----------------------

function sanitizeText(text) {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\n/g, " ")
    .trim();
}

function generateHook(prompt) {
  const hooks = [
    "Nobody tells you this...",
    "This changed my life:",
    "Stop doing this if you want success:",
    "You're wasting your time if...",
    "This is why you're still broke:",
    "The truth about success:",
    "99% of people ignore this:"
  ];
  return `${hooks[Math.floor(Math.random() * hooks.length)]} ${prompt}`;
}

function splitText(text) {
  return text.split(" ").reduce((acc, word, i) => {
    const idx = Math.floor(i / 4);
    if (!acc[idx]) acc[idx] = [];
    acc[idx].push(word);
    return acc;
  }, []).map(chunk => chunk.join(" "));
}

function getRandomVideo() {
  const dir = path.join("server/assets/videos");
  const files = fs.readdirSync(dir);
  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, random);
}

async function generateVoice(text, outputPath) {
  const res = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text
  });

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function uploadVideo(filePath) {
  return await cloudinary.uploader.upload(filePath, {
    resource_type: "video"
  });
}

// ----------------------
// 🎬 BUILD VIDEO
// ----------------------

async function buildVideo({ prompt, outputPath }) {
  const hooked = generateHook(prompt);
  const parts = splitText(hooked);

  const voicePath = path.join("server/voice.mp3");
  await generateVoice(hooked, voicePath);

  const filters = parts.map((p, i) => {
    const start = i * 2;
    const end = start + 2;
    const clean = sanitizeText(p);

    return `drawtext=text='${clean}':enable='between(t,${start},${end})':fontcolor=white:fontsize=60:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-200`;
  }).join(",");

  const fullFilter =
    `zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',${filters}`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(getRandomVideo())
      .inputOptions(["-stream_loop -1"])
      .input(voicePath)
      .outputOptions([
        "-t 8",
        "-vf", fullFilter,
        "-pix_fmt yuv420p",
        "-c:v libx264",
        "-preset ultrafast",
        "-crf 32",
        "-s 720x1280",
        "-c:a aac",
        "-b:a 96k"
      ])
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });
}

// ----------------------
// 🎬 SINGLE
// ----------------------

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    const outputPath = "server/output.mp4";

    await buildVideo({ prompt, outputPath });

    res.sendFile(path.resolve(outputPath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

// ----------------------
// 🔁 BATCH
// ----------------------

app.post("/generate-batch", async (req, res) => {
  try {
    const { prompts } = req.body;
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      const out = `server/output_${i}.mp4`;

      await buildVideo({
        prompt: prompts[i],
        outputPath: out
      });

      results.push(out);
    }

    res.json({ videos: results });
  } catch (err) {
    res.status(500).json({ error: "batch failed" });
  }
});

// ----------------------
// 🧠 TOPIC → MANY
// ----------------------

function generateVariations(topic) {
  return [
    `how to ${topic}`,
    `why you fail at ${topic}`,
    `secrets of ${topic}`,
    `stop doing this in ${topic}`,
    `how I mastered ${topic}`,
    `mistakes in ${topic}`,
    `truth about ${topic}`,
    `beginner guide to ${topic}`,
    `why ${topic} is hard`,
    `daily habits for ${topic}`
  ];
}

app.post("/generate-from-topic", async (req, res) => {
  try {
    const { topic } = req.body;
    const prompts = generateVariations(topic);

    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      const out = `server/topic_${i}.mp4`;

      await buildVideo({
        prompt: prompts[i],
        outputPath: out
      });

      const uploaded = await uploadVideo(out);
      results.push(uploaded.secure_url);
    }

    res.json({ videos: results });
  } catch (err) {
    res.status(500).json({ error: "topic failed" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});