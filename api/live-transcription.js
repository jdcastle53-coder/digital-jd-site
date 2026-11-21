import { createHash } from "node:crypto";
import { checkRateLimit, verifyAccess } from "./_lib/gateway-security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const access = await verifyAccess(req);
    if (!access.ok) return res.status(access.status || 401).json({ error: access.message });
    const { sdp } = req.body || {};
    if (typeof sdp !== "string" || sdp.length > 16384 || !sdp.startsWith("v=0")) {
      return res.status(400).json({ error: "Invalid audio connection offer." });
    }
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "Live transcription unavailable." });
    const rate = await checkRateLimit("transcription", access.userId);
    if (!rate.allowed) return res.status(429).json({ error: "Too many recordings. Try again later." });

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify({
      type: "transcription",
      audio: {
        input: {
          transcription: { model: "gpt-live-transcribe" },
          turn_detection: null,
        },
      },
    }));
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Safety-Identifier": createHash("sha256").update(access.userId).digest("hex"),
      },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn("[LIVE-TRANSCRIPTION] Provider returned status", response.status);
      return res.status(502).json({ error: "Live transcription unavailable." });
    }
    const answer = await response.text();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ sdp: answer });
  } catch {
    return res.status(502).json({ error: "Live transcription unavailable." });
  }
}
