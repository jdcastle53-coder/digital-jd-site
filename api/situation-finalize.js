import { createClient } from "@supabase/supabase-js";
import { verifyAccess, checkRateLimit } from "./_lib/gateway-security.js";

export const config = { maxDuration: 20 };

/* =========================================================
   DIGITAL JD — STEP 1: SITUATION FINALIZE
   Input:  { originalSituation, analysis, clarifyingAnswers }
   Output: { caseFoundation }

   Persists the finished case record to Supabase table
   `case_foundations` when that table exists. If it does not exist yet
   (see data/case-foundations-schema.sql — not yet applied), the insert
   fails and is logged server-side, but the endpoint still returns the
   caseFoundation to the client so Step 2 handoff is never blocked on
   persistence. This is the one explicitly-flagged incomplete piece.
========================================================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const getSupabaseClient = () =>
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const ARRAY_FIELDS = ["stakeholders", "actionsAlreadyTaken", "constraints", "risks", "knownFacts", "assumptions"];
const STRING_FIELDS = ["situationSummary", "primaryIssue", "desiredOutcome", "decisionAuthority", "currentImpact", "urgency", "timeframe", "situationCategory"];

function log(level, action, data = {}) {
  console.log("[SITUATION-FINALIZE]", JSON.stringify({
    level, action, timestamp: new Date().toISOString(), ...data,
  }));
}

function safeArray(v) {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function normalizeClarifyingAnswers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      questionId: a?.questionId ? String(a.questionId) : "",
      field: a?.field ? String(a.field) : null,
      question: a?.question ? String(a.question) : "",
      answer: a?.answer ? String(a.answer) : "",
    }))
    .filter((a) => a.answer.trim());
}

function makeCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
    const analysis = body.analysis && typeof body.analysis === "object" ? body.analysis : {};
    const extracted = analysis.extracted && typeof analysis.extracted === "object" ? analysis.extracted : {};
    const clarifyingAnswers = normalizeClarifyingAnswers(body.clarifyingAnswers);

    if (!originalSituation) {
      return res.status(400).json({ error: "originalSituation is required.", code: "invalid_input" });
    }

    const now = new Date().toISOString();
    const caseFoundation = {
      caseId: analysis.caseId || makeCaseId(),
      createdAt: analysis.createdAt || now,
      updatedAt: now,
      originalSituation,
      clarifyingQuestions: Array.isArray(analysis.clarifyingQuestions) ? analysis.clarifyingQuestions : [],
      clarifyingAnswers,
    };

    for (const key of STRING_FIELDS) caseFoundation[key] = typeof extracted[key] === "string" ? extracted[key] : "";
    for (const key of ARRAY_FIELDS) caseFoundation[key] = safeArray(extracted[key]);

    // Attempt persistence. Known current blocker: the `case_foundations`
    // table has not been created yet (see data/case-foundations-schema.sql),
    // so this insert is expected to fail with a Postgres "relation does not
    // exist" error until that migration is run. Fails soft — Step 2 handoff
    // is not blocked on persistence.
    let persisted = false;
    let supabase = null;
    try {
      supabase = getSupabaseClient();
    } catch (_e) {
      supabase = null;
    }

    if (supabase) {
      try {
        const { error } = await supabase.from("case_foundations").insert({
          case_id: caseFoundation.caseId,
          user_id: access.userId,
          created_at: caseFoundation.createdAt,
          updated_at: caseFoundation.updatedAt,
          original_situation: caseFoundation.originalSituation,
          situation_summary: caseFoundation.situationSummary,
          primary_issue: caseFoundation.primaryIssue,
          desired_outcome: caseFoundation.desiredOutcome,
          stakeholders: caseFoundation.stakeholders,
          decision_authority: caseFoundation.decisionAuthority,
          current_impact: caseFoundation.currentImpact,
          actions_already_taken: caseFoundation.actionsAlreadyTaken,
          urgency: caseFoundation.urgency,
          timeframe: caseFoundation.timeframe,
          constraints: caseFoundation.constraints,
          risks: caseFoundation.risks,
          known_facts: caseFoundation.knownFacts,
          assumptions: caseFoundation.assumptions,
          situation_category: caseFoundation.situationCategory,
          clarifying_questions: caseFoundation.clarifyingQuestions,
          clarifying_answers: caseFoundation.clarifyingAnswers,
        });
        if (error) {
          log("ERROR", "persist_failed", { userId: access.userId, caseId: caseFoundation.caseId, message: error.message, code: error.code });
        } else {
          persisted = true;
        }
      } catch (dbError) {
        log("ERROR", "persist_exception", { userId: access.userId, caseId: caseFoundation.caseId, message: dbError.message });
      }
    } else {
      log("WARN", "persist_skipped_no_client", { userId: access.userId, caseId: caseFoundation.caseId });
    }

    log("INFO", "finalize_completed", {
      userId: access.userId,
      caseId: caseFoundation.caseId,
      persisted,
      durationMs: Date.now() - startTime,
    });

    return res.status(200).json({ caseFoundation });
  } catch (error) {
    log("ERROR", "unhandled_exception", { message: error?.message, name: error?.name });
    if (res.headersSent) return;
    return res.status(500).json({ error: "Server error: " + (error?.message || "unknown"), code: "unhandled_exception" });
  }
}
