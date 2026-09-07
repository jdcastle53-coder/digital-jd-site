import { verifyAccess, checkRateLimit, getClientIp } from "./_lib/gateway-security.js";
import { JD_IDENTITY, JD_ALTITUDE, JD_REASONING, buildKnowledgeBlock } from "./_lib/jd-mind.js";

// Allow enough time for a JSON-mode OpenAI round trip.
export const config = { maxDuration: 30 };

/* =========================================================
   DIGITAL JD — STEP 1: SITUATION ANALYZE
   Input:  { originalSituation, source }
   Output: { caseId, createdAt, extracted, clarifyingQuestions }

   Auth: requires a signed-in Supabase session (Authorization: Bearer
   <access_token>), same gate as jd-brain-gateway.js. No anonymous/demo
   path — Step 1 always requires sign-in per product decision.
========================================================= */

const CONFIG = {
  openaiModel: "gpt-4o-mini",
  openaiUrl: "https://api.openai.com/v1/chat/completions",
  maxTokens: 1400,
  temperature: 0.4,
  maxConcepts: 14,
  minChars: 20,
  maxChars: 4000,
};

const EXTRACTED_SHAPE = {
  situationSummary: "",
  primaryIssue: "",
  desiredOutcome: "",
  stakeholders: [],
  decisionAuthority: "",
  currentImpact: "",
  actionsAlreadyTaken: [],
  urgency: "",
  timeframe: "",
  constraints: [],
  risks: [],
  knownFacts: [],
  assumptions: [],
  situationCategory: "",
};

function log(level, action, data = {}) {
  console.log("[SITUATION-ANALYZE]", JSON.stringify({
    level, action, timestamp: new Date().toISOString(), ...data,
  }));
}

function makeCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildAnalyzePrompt(userInput) {
  return `${JD_IDENTITY}

${JD_ALTITUDE}

${JD_REASONING}
${buildKnowledgeBlock(userInput, CONFIG.maxConcepts)}
YOUR JOB IN THIS STEP
Dr. Castle never advises before he understands. Read the user's situation below and do two things:

1. EXTRACT what is already known into structured fields (do not invent facts that were not stated or clearly implied).
2. ASK 0-5 clarifying questions — only the ones whose answers could materially change the guidance. Do not ask for information already clearly given. A well-specified situation may need 0-1 questions; a thin one may need up to 5.

Priority order when choosing which questions matter most (most important first):
1. desired outcome
2. core issue
3. people involved / decision authority
4. actions already tried
5. impact if nothing changes
6. urgency / deadline
7. constraints / risks

Return ONLY a single JSON object with this exact shape (no prose, no markdown fences):
{
  "extracted": {
    "situationSummary": "string",
    "primaryIssue": "string",
    "desiredOutcome": "string",
    "stakeholders": ["string"],
    "decisionAuthority": "string",
    "currentImpact": "string",
    "actionsAlreadyTaken": ["string"],
    "urgency": "string",
    "timeframe": "string",
    "constraints": ["string"],
    "risks": ["string"],
    "knownFacts": ["string"],
    "assumptions": ["string"],
    "situationCategory": "string"
  },
  "clarifyingQuestions": [
    { "id": "string", "field": "string", "question": "string" }
  ]
}
Use empty string "" or empty array [] for any field you cannot determine from the text. Never omit a field. clarifyingQuestions must have between 0 and 5 items, ordered by the priority above.`;
}

function safeArray(v) {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function normalizeExtracted(raw) {
  const out = { ...EXTRACTED_SHAPE };
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(EXTRACTED_SHAPE)) {
    if (Array.isArray(EXTRACTED_SHAPE[key])) {
      out[key] = safeArray(raw[key]);
    } else if (typeof raw[key] === "string") {
      out[key] = raw[key];
    }
  }
  return out;
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 5)
    .map((q, i) => {
      if (typeof q === "string") return { id: `q${i + 1}`, field: null, question: q };
      return {
        id: q?.id ? String(q.id) : `q${i + 1}`,
        field: q?.field ? String(q.field) : null,
        question: q?.question ? String(q.question) : String(q?.text || ""),
      };
    })
    .filter((q) => q.question.trim());
}

function fallbackResult() {
  // Malformed/empty model output: degrade gracefully instead of failing the
  // request outright — ask one safe, universally-relevant question so Step 1
  // can still proceed.
  return {
    extracted: { ...EXTRACTED_SHAPE },
    clarifyingQuestions: [
      { id: "q1", field: "desiredOutcome", question: "What outcome are you hoping for here?" },
    ],
  };
}

export default async function handler(req, res) {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const access = await verifyAccess(req);
    if (!access.ok) {
      const status = access.status || 401;
      log("WARN", "access_denied", { code: access.code, status });
      return res.status(status).json({ error: access.message, code: access.code || "auth_required" });
    }

    const rl = await checkRateLimit("user", access.userId);
    res.setHeader("X-RateLimit-Limit", rl.limit);
    res.setHeader("X-RateLimit-Remaining", rl.remaining);
    if (!rl.allowed) {
      res.setHeader("Retry-After", rl.resetSec);
      return res.status(429).json({
        error: "You're sending requests a bit fast. Please wait a moment and try again.",
        code: "rate_limited",
        retryAfterSec: rl.resetSec,
      });
    }

    const body = req.body || {};
    const originalSituation = typeof body.originalSituation === "string" ? body.originalSituation.trim() : "";

    if (originalSituation.length < CONFIG.minChars || originalSituation.length > CONFIG.maxChars) {
      return res.status(400).json({
        error: `Situation must be between ${CONFIG.minChars} and ${CONFIG.maxChars} characters.`,
        code: "invalid_input",
      });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      log("ERROR", "missing_api_key", { userId: access.userId });
      return res.status(500).json({ error: "Server configuration error" });
    }

    const systemPrompt = buildAnalyzePrompt(originalSituation);

    const response = await fetch(CONFIG.openaiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.openaiModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User's situation:\n${originalSituation}` },
        ],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      log("ERROR", "openai_error_response", { status: response.status, message: errData?.error?.message, userId: access.userId });
      return res.status(500).json({ error: "AI request failed" });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      log("WARN", "malformed_json_fallback", { userId: access.userId, rawPreview: raw.slice(0, 200) });
      parsed = fallbackResult();
    }

    const extracted = normalizeExtracted(parsed.extracted);
    const clarifyingQuestions = normalizeQuestions(parsed.clarifyingQuestions);

    const result = {
      caseId: makeCaseId(),
      createdAt: new Date().toISOString(),
      extracted,
      clarifyingQuestions,
    };

    log("INFO", "analyze_completed", {
      userId: access.userId,
      durationMs: Date.now() - startTime,
      questionCount: clarifyingQuestions.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    log("ERROR", "unhandled_exception", { message: error?.message, name: error?.name });
    if (res.headersSent) return;
    return res.status(500).json({ error: "Server error: " + (error?.message || "unknown"), code: "unhandled_exception" });
  }
}
