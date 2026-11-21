import { checkRateLimit, verifyAccess } from "./_lib/gateway-security.js";

const MAX_AUDIO_BYTES = 1024 * 1024;
const FILE_TYPES = new Map([
  ["audio/webm;codecs=opus", "recording.webm"],
  ["audio/mp4", "recording.mp4"],
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const access = await verifyAccess(req);
    if (!access.ok) return res.status(access.status || 401).json({ error: access.message });
    const { audio, mimeType } = req.body || {};
    const filename = FILE_TYPES.get(mimeType);
    if (!filename || typeof audio !== "string" || !audio ||
        audio.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
      return res.status(400).json({ error: "Use a short WebM or MP4 audio recording." });
    }
    const bytes = Buffer.from(audio, "base64");
    if (!bytes.length || bytes.length > MAX_AUDIO_BYTES || bytes.toString("base64") !== audio) {
      return res.status(400).json({ error: "The audio recording is invalid or too large." });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "Transcription is temporarily unavailable." });
    }
    const rate = await checkRateLimit("transcription", access.userId);
    if (!rate.allowed || rate.degraded) {
      return res.status(rate.degraded ? 503 : 429).json({ error: "Transcription is temporarily unavailable. Try again later." });
    }

    const form = new FormData();
    form.set("model", "gpt-transcribe");
    form.set("file", new Blob([bytes], { type: mimeType }), filename);
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: form,
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      console.error("[TRANSCRIBE] Provider returned status", response.status);
      return res.status(502).json({ error: "Could not transcribe the recording. Try again." });
    }
    const result = await response.json();
    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (!text) return res.status(422).json({ error: "No speech was recognized. Try again." });
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "Could not transcribe the recording. Try again." });
  }
}
