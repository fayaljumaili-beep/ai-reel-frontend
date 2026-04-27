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

app.post("/generate-video", async (req, res) => {
  try {
    const scenes = [
      "success",
      "luxury",
      "money",
      "business",
      "celebration"
    ];

    const clips = [];

    for (let i = 0; i < scenes.length; i++) {
      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${scenes[i]}&per_page=10`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const videos = response.data.videos;

      // 🔥 FORCE DIFFERENT CLIP EACH TIME
      const video = videos[i % videos.length];
      const url = video.video_files[0].link;

      const raw = `${TMP_DIR}/raw_${i}.mp4`;
      const clip = `${TMP_DIR}/clip_${i}.mp4`;

      const stream = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(raw);
      stream.data.pipe(writer);

      await new Promise((r) => writer.on("finish", r));

      // 🔥 TRIM EACH CLIP TO 4s (THIS FORCES MULTI-SCENE)
      await run(
        `ffmpeg -y -i ${raw} -t 4 -vf "scale=720:1280,setsar=1" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${clip}`
      );

      clips.push(clip);
    }

    console.log("CLIPS:", clips);

    // 🔥 CONCAT (HARD CUTS GUARANTEED)
    const list = clips.map(c => `file '${path.resolve(c)}'`).join("\n");
    fs.writeFileSync(`${TMP_DIR}/list.txt`, list);

    const merged = `${TMP_DIR}/merged.mp4`;

    await run(
      `ffmpeg -y -f concat -safe 0 -i ${TMP_DIR}/list.txt -c copy ${merged}`
    );

    // 🔇 SILENT AUDIO (NO BEEP)
    const audio = `${TMP_DIR}/audio.mp3`;

    await run(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 20 ${audio}`
    );

    const final = `${TMP_DIR}/final.mp4`;

    await run(
      `ffmpeg -y -i ${merged} -i ${audio} -c:v copy -c:a aac -shortest ${final}`
    );

    res.sendFile(path.resolve(final));

  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server running");
});