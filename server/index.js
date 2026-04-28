import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import gTTS from "gtts";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TEMP_DIR = "/tmp";

// 🔥 LOCAL VIDEO FILES (MUST EXIST IN /server)
const LOCAL_VIDEOS = [
  `${process.cwd()}/server/clip-0.mp4`,
  `${process.cwd()}/server/clip-1.mp4`,
  `${process.cwd()}/server/clip-2.mp4`,
];

// 🎵 BACKGROUND MUSIC (optional but powerful)
const MUSIC_FILE = `${process.cwd()}/server/music.mp3`;

//////////////////////////////////////////////////////
// 🧠 SCRIPT
//////////////////////////////////////////////////////
function generateScript(topic) {
  return [
    `${topic} starts with your mindset`,
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit",
  ];
}

//////////////////////////////////////////////////////
// 🔊 TEXT → VOICE
//////////////////////////////////////////////////////
async function generateVoice(script, output) {
  return new Promise((resolve, reject) => {
    const text = script.join(". ");
    const gtts = new gTTS(text, "en");

    gtts.save(output, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

//////////////////////////////////////////////////////
// 🎬 GENERATE VIDEO
//////////////////////////////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const topic = req.body.topic || "success";

    // paths
    const merged = `${TEMP_DIR}/merged.mp4`;
    const voiceFile = `${TEMP_DIR}/voice.mp3`;
    const final = `${TEMP_DIR}/final.mp4`;

    const script = generateScript(topic);

    console.log("SCRIPT:", script);

    //////////////////////////////////////////////////////
    // 1. 🎥 MERGE CLIPS (FIXES 0.15s BUG)
    //////////////////////////////////////////////////////
    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      LOCAL_VIDEOS.forEach((clip) => {
        if (!fs.existsSync(clip)) {
          return reject(`Missing file: ${clip}`);
        }
        command.input(clip);
      });

      command
        .on("error", reject)
        .on("end", resolve)
        .mergeToFile(merged, TEMP_DIR);
    });

    //////////////////////////////////////////////////////
    // 2. 🔊 GENERATE VOICE
    //////////////////////////////////////////////////////
    await generateVoice(script, voiceFile);

    //////////////////////////////////////////////////////
    // 3. 🎵 ADD BACKGROUND MUSIC + VOICE MIX
    //////////////////////////////////////////////////////
    const withAudio = `${TEMP_DIR}/with-audio.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(merged)
        .input(voiceFile)
        .input(MUSIC_FILE)

        .complexFilter([
          // lower music volume
          "[2:a]volume=0.2[music]",
          // keep voice louder
          "[1:a]volume=1.5[voice]",
          // mix both
          "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        ])

        .outputOptions([
          "-map 0:v:0",
          "-map [aout]",
          "-c:v libx264",
          "-c:a aac",
          "-shortest",
        ])

        .save(withAudio)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////////////////////////////
    // 4. 🎬 FINAL OUTPUT
    //////////////////////////////////////////////////////
    fs.copyFileSync(withAudio, final);

    res.sendFile(final);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

//////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});