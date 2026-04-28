import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

async function run(cmd) {
  console.log("Running:", cmd);
  await execPromise(cmd);
}

// 🎤 Generate script
async function generateScript(prompt) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short viral motivational script about: ${prompt}. Max 2 sentences.`
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  return res.data.choices[0].message.content;
}

// 🔊 Generate voice
async function generateVoice(text) {
  const response = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
    { text },
    {
      responseType: "arraybuffer",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      }
    }
  );

  const file = `${TMP_DIR}/voice.mp3`;
  fs.writeFileSync(file, response.data);
  return file;
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, style, clips } = req.body;
    const count = parseInt(clips) || 5;

    // 🎯 style keywords
    let keywords = [];

    if (style === "luxury") {
      keywords = ["money", "luxury", "cars", "rich", "success"];
    } else if (style === "dark") {
      keywords = ["dark city", "night", "rain", "neon"];
    } else {
      keywords = ["motivation", "focus", "gym", "success"];
    }

    const scenes = keywords.slice(0, count);

    // 🎤 script + voice
    const script = await generateScript(prompt);
    console.log("SCRIPT:", script);

    const voiceFile = await generateVoice(script);

    const words = script.split(" ");

    const clipsArr = [];

    for (let i = 0; i < scenes.length; i++) {
      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${scenes[i]}&per_page=10`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          }
        }
      );

      const videos = response.data.videos;
      if (!videos.length) continue;

      const video = videos[i % videos.length];
      const url = video.video_files[0].link;

      const raw = `${TMP_DIR}/raw_${i}.mp4`;
      const clip = `${TMP_DIR}/clip_${i}.mp4`;

      const stream = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(raw);
      stream.data.pipe(writer);
      await new Promise(r => writer.on("finish", r));

      // 🧠 caption per scene
      const caption = words.slice(i * 3, i * 3 + 3).join(" ");

      await run(
        `ffmpeg -y -i ${raw} -t 4 -vf "scale=720:1280,drawtext=text='${caption}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${clip}`
      );

      clipsArr.push(clip);
    }

    console.log("CLIPS:", clipsArr);

    // 🧩 concat
    const list = clipsArr.map(c => `file '${path.resolve(c)}'`).join("\n");
    fs.writeFileSync(`${TMP_DIR}/list.txt`, list);

    const merged = `${TMP_DIR}/merged.mp4`;

    await run(
      `ffmpeg -y -f concat -safe 0 -i ${TMP_DIR}/list.txt -c copy ${merged}`
    );

    // 🔊 merge voice
    const final = `${TMP_DIR}/final.mp4`;

    await run(
      `ffmpeg -y -i ${merged} -i ${voiceFile} -c:v copy -c:a aac -shortest ${final}`
    );

    res.sendFile(path.resolve(final));

  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server running on port 8080");
});