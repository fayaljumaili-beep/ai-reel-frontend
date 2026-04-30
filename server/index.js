import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/generate", async (req, res) => {
  try {
    const output = "output.mp4";

    // 👇 Your input clips (adjust if needed)
    const clips = [
      "assets/videos/clip-0.mp4",
      "assets/videos/clip-1.mp4",
      "assets/videos/clip-2.mp4"
    ];

    // 🔥 Step 1: normalize all clips
    const normalized = clips.map((_, i) => `temp${i}.mp4`);

    for (let i = 0; i < clips.length; i++) {
      await new Promise((resolve, reject) => {
  exec(
    `ffmpeg -y -i temp0.mp4 -i temp1.mp4 -i temp2.mp4 -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]" -map "[outv]" -c:v libx264 -preset fast ${output}`,
    (err) => (err ? reject(err) : resolve())
  );
});
    }

    // 🔥 Step 2: create concat file
    const listFile = "list.txt";
    fs.writeFileSync(
      listFile,
      normalized.map((f) => `file '${f}'`).join("\n")
    );

    // 🔥 Step 3: concatenate safely
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -f concat -safe 0 -i ${listFile} -c:v libx264 -preset fast ${output}`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 🔥 Step 4: send video
    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});