import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { pipeline } from "stream";
import { promisify } from "util";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath.path);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TEMP_DIR = "/tmp";
const streamPipeline = promisify(pipeline);

//////////////////////////////
// 🔥 MULTI-SOURCE VIDEOS
//////////////////////////////
const VIDEO_SOURCES = [
  // primary
  [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  ],
  // fallback
  [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  ]
];

//////////////////////////////
// 🔁 SAFE DOWNLOAD (RETRY)
//////////////////////////////
async function downloadWithRetry(urls, filepath) {
  for (let url of urls) {
    try {
      console.log("Trying:", url);

      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!res.ok) throw new Error("Bad response");

      await streamPipeline(res.body, fs.createWriteStream(filepath));

      const size = fs.statSync(filepath).size;
      if (size < 50000) throw new Error("Too small");

      console.log("Downloaded OK:", url);
      return;
    } catch (err) {
      console.log("Failed:", url);
    }
  }

  throw new Error("All video sources failed");
}

//////////////////////////////
// 🧠 SCRIPT
//////////////////////////////
function generateScript(prompt) {
  return [
    "Success starts with your mindset",
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit"
  ];
}

//////////////////////////////
// 🔊 VOICE
//////////////////////////////
async function generateVoice(text, output) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text
    })
  });

  if (!res.ok) throw new Error("Voice failed");

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(output, Buffer.from(buffer));
}

//////////////////////////////
// 🚀 MAIN
//////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const script = generateScript(req.body.prompt);
    const clips = [];

    console.log("SCRIPT:", script);

    ////////////////////////////
    // 🎬 CLIPS
    ////////////////////////////
    for (let i = 0; i < script.length; i++) {
      const input = `${TEMP_DIR}/input_${i}.mp4`;
      const output = `${TEMP_DIR}/clip_${i}.mp4`;

      // 🔥 retry across sources
      const sourceGroup = VIDEO_SOURCES[i % VIDEO_SOURCES.length];
      await downloadWithRetry(sourceGroup, input);

      const caption = script[i];
      const hook = "This will change your life";

      const filter = i === 0
        ? `drawtext=text='${hook}':fontsize=60:fontcolor=yellow:x=(w-text_w)/2:y=150,
           drawtext=text='${caption}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-200`
        : `drawtext=text='${caption}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-200`;

      await new Promise((resolve, reject) => {
        ffmpeg(input)
          .videoCodec("libx264")
          .setDuration(4)
          .videoFilters(["scale=720:1280", filter])
          .outputOptions(["-preset veryfast", "-crf 28"])
          .save(output)
          .on("end", resolve)
          .on("error", reject);
      });

      clips.push(output);
    }

    ////////////////////////////
    // 🔗 CONCAT
    ////////////////////////////
    const list = `${TEMP_DIR}/list.txt`;
    fs.writeFileSync(list, clips.map(c => `file '${c}'`).join("\n"));

    const merged = `${TEMP_DIR}/merged.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(list)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(merged)
        .on("end", resolve)
        .on("error", reject);
    });

    ////////////////////////////
    // 🔊 AUDIO
    ////////////////////////////
    const voiceFile = `${TEMP_DIR}/voice.mp3`;
    await generateVoice(script.join(". "), voiceFile);

    ////////////////////////////
    // 🎥 FINAL
    ////////////////////////////
    const final = `${TEMP_DIR}/final.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg(merged)
        .input(voiceFile)
        .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
        .save(final)
        .on("end", resolve)
        .on("error", reject);
    });

    res.sendFile(final);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});