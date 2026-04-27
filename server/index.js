import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import OpenAI from "openai";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🧠 Prompt:", prompt);

    const clips = await downloadClips(prompt);
    const audio = await generateVoice(prompt);
    await generateCaptions(prompt);

    const output = "output.mp4";
    await buildVideo(clips, audio, output);

    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});


// ------------------------
// 🎬 DOWNLOAD CLIPS
// ------------------------
async function downloadClips(query) {
  const API_KEY = process.env.PEXELS_API_KEY;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3`,
    { headers: { Authorization: API_KEY } }
  );

  const data = await res.json();

  const clips = [];

  for (let i = 0; i < data.videos.length; i++) {
    const url = data.videos[i].video_files[0].link;
    const file = `clip-${i}.mp4`;

    const vid = await fetch(url);
    const buffer = await vid.arrayBuffer();

    fs.writeFileSync(file, Buffer.from(buffer));
    clips.push(file);

    console.log(`✅ ${file}`);
  }

  return clips;
}


// ------------------------
// 🔊 VOICE
// ------------------------
async function generateVoice(text) {
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync("voice.mp3", buffer);

  console.log("✅ voice.mp3");
  return "voice.mp3";
}


// ------------------------
// 📝 CAPTIONS
// ------------------------
async function generateCaptions(text) {
  const words = text.split(" ");
  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.6;

    const t = (x) =>
      `00:00:${String(x.toFixed(2)).padStart(5, "0").replace(".", ",")}`;

    srt += `${i + 1}\n${t(start)} --> ${t(end)}\n${word}\n\n`;
    time += 0.6;
  });

  fs.writeFileSync("captions.srt", srt);
}


// ------------------------
// 🎥 BUILD VIDEO (STABLE)
// ------------------------
async function buildVideo(clips, audio, output) {
  const normalized = [];

  // normalize clips
  for (let i = 0; i < clips.length; i++) {
    const out = `norm-${i}.mp4`;

    await new Promise((res, rej) => {
      ffmpeg(clips[i])
        .outputOptions([
          "-vf scale=720:1280",
          "-r 30",
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p",
        ])
        .noAudio()
        .save(out)
        .on("end", res)
        .on("error", rej);
    });

    normalized.push(out);
  }

  // concat list
  fs.writeFileSync(
    "concat.txt",
    normalized.map((f) => `file '${f}'`).join("\n")
  );

  // stitch
  await new Promise((res, rej) => {
    ffmpeg()
      .input("concat.txt")
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .save("temp.mp4")
      .on("end", res)
      .on("error", rej);
  });

  // final render (audio + captions)
  await new Promise((res, rej) => {
    ffmpeg()
      .input("temp.mp4")
      .input(audio)
      .outputOptions([
        "-vf subtitles=captions.srt:force_style='Fontsize=24,PrimaryColour=&H00FFFF&,Bold=1,Alignment=10'",
        "-map 0:v",
        "-map 1:a",
        "-shortest",
      ])
      .save(output)
      .on("end", res)
      .on("error", rej);
  });

  console.log("🔥 VIDEO DONE");
}


// ------------------------
app.listen(PORT, () => {
  console.log(`🚀 Running on ${PORT}`);
});