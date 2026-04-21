process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION:", err);
});

import express from "express";
import cors from "cors";

console.log(🚀 Server starting...");
console.log("PORT:", process.env.PORT);
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is alive ✅");
});

app.post("/generate-video", (req, res) => {
  console.log("🔥 route hit");

  res.json({
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Running on port", PORT);
});