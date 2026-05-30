import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role for logging (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client only if credentials exist
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const supabase = getSupabaseClient();

  // Helper function for consistent logging - writes to both console and Supabase
  const log = async (level, action, data = {}) => {
    const logEntry = {
      level,
      action,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      component: "jd-brain-gateway",
      message: data.message || null,
      context: { ...data },
      duration_ms: data.durationMs || null,
      user_id: data.userId || null,
    };

    // Remove duplicated fields from context
    delete logEntry.context.message;
    delete logEntry.context.durationMs;
    delete logEntry.context.userId;

    // Always log to console for Vercel logs
    console.log("[JD-BRAIN-GATEWAY]", JSON.stringify(logEntry));

    // Also write to Supabase if client is available
    if (supabase) {
      try {
        await supabase.from("application_logs").insert({
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          component: logEntry.component,
          action: logEntry.action,
          message: logEntry.message,
          context: logEntry.context,
          duration_ms: logEntry.duration_ms,
          request_id: logEntry.request_id,
          user_id: logEntry.user_id,
        });
      } catch (dbError) {
        // Log DB error to console but don't fail the request
        console.error("[JD-BRAIN-GATEWAY] Failed to write log to Supabase:", dbError.message);
      }
    }
  };

  // 1. Request received
  await log("INFO", "request_received", { method: req.method });

  // 2. Check request method
  if (req.method !== "POST") {
    await log("WARN", "invalid_method", { method: req.method });
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  // 3. Check if message exists (do not log the actual message content)
  await log("INFO", "message_validation", { 
    messageExists: !!message,
    messageLength: message ? message.length : 0
  });

  if (!message) {
    await log("WARN", "missing_message", { message: "No message provided in request body" });
    const duration = Date.now() - startTime;
    await log("INFO", "request_completed", { status: 400, durationMs: duration });
    return res.status(400).json({ error: "Message is required" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // 4. Check if OPENAI_API_KEY exists (never log the actual key)
  await log("INFO", "api_key_check", { apiKeyExists: !!OPENAI_API_KEY });

  if (!OPENAI_API_KEY) {
    await log("ERROR", "missing_api_key", { message: "OPENAI_API_KEY environment variable not set" });
    const duration = Date.now() - startTime;
    await log("INFO", "request_completed", { status: 500, durationMs: duration });
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // 5. OpenAI request started
    await log("INFO", "openai_request_started", { model: "gpt-4o-mini" });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Digital JD, a PhD-level leadership advisor helping executives make better decisions." },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    // 6. OpenAI response status
    await log("INFO", "openai_response_received", { 
      status: response.status,
      ok: response.ok
    });

    const data = await response.json();

    // 7. Check for OpenAI error response
    if (!response.ok) {
      await log("ERROR", "openai_error_response", {
        status: response.status,
        errorType: data.error?.type || "unknown",
        message: data.error?.message || "Unknown error from OpenAI"
      });
      const duration = Date.now() - startTime;
      await log("INFO", "request_completed", { status: 500, durationMs: duration });
      return res.status(500).json({ error: "AI request failed" });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      await log("ERROR", "openai_empty_response", { 
        message: "OpenAI returned empty response",
        choicesExist: !!data.choices,
        choicesLength: data.choices?.length || 0
      });
      const duration = Date.now() - startTime;
      await log("INFO", "request_completed", { status: 500, durationMs: duration });
      return res.status(500).json({ error: "AI returned empty response" });
    }

    // 8. Response sent successfully
    const duration = Date.now() - startTime;
    await log("INFO", "response_sent", { 
      replyLength: reply.length,
      tokensUsed: data.usage?.total_tokens || null,
      promptTokens: data.usage?.prompt_tokens || null,
      completionTokens: data.usage?.completion_tokens || null
    });

    // 9. Total duration
    await log("INFO", "request_completed", { status: 200, durationMs: duration });

    res.status(200).json({ reply });

  } catch (error) {
    // 10. Caught exception
    await log("ERROR", "exception_caught", {
      errorName: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join(" | ") // First 3 lines of stack
    });

    const duration = Date.now() - startTime;
    await log("INFO", "request_completed", { status: 500, durationMs: duration });

    res.status(500).json({ error: "AI request failed" });
  }
}
