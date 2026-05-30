export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Helper function for consistent logging
  const log = (level, action, data = {}) => {
    console.log("[JD-BRAIN-GATEWAY]", JSON.stringify({
      level,
      action,
      requestId,
      timestamp: new Date().toISOString(),
      ...data
    }));
  };

  // 1. Request received
  log("INFO", "request_received", { method: req.method });

  // 2. Check request method
  if (req.method !== "POST") {
    log("WARN", "invalid_method", { method: req.method });
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  // 3. Check if message exists (do not log the actual message)
  log("INFO", "message_validation", { 
    messageExists: !!message,
    messageLength: message ? message.length : 0
  });

  if (!message) {
    log("WARN", "missing_message");
    const duration = Date.now() - startTime;
    log("INFO", "request_completed", { status: 400, durationMs: duration });
    return res.status(400).json({ error: "Message is required" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // 4. Check if OPENAI_API_KEY exists (never log the actual key)
  log("INFO", "api_key_check", { apiKeyExists: !!OPENAI_API_KEY });

  if (!OPENAI_API_KEY) {
    log("ERROR", "missing_api_key");
    const duration = Date.now() - startTime;
    log("INFO", "request_completed", { status: 500, durationMs: duration });
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // 5. OpenAI request started
    log("INFO", "openai_request_started");

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
    log("INFO", "openai_response_received", { 
      status: response.status,
      ok: response.ok
    });

    const data = await response.json();

    // 7. Check for OpenAI error response
    if (!response.ok) {
      log("ERROR", "openai_error_response", {
        status: response.status,
        errorType: data.error?.type || "unknown",
        errorMessage: data.error?.message || "Unknown error"
      });
      const duration = Date.now() - startTime;
      log("INFO", "request_completed", { status: 500, durationMs: duration });
      return res.status(500).json({ error: "AI request failed" });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      log("ERROR", "openai_empty_response", { 
        choicesExist: !!data.choices,
        choicesLength: data.choices?.length || 0
      });
      const duration = Date.now() - startTime;
      log("INFO", "request_completed", { status: 500, durationMs: duration });
      return res.status(500).json({ error: "AI returned empty response" });
    }

    // 8. Response sent successfully
    const duration = Date.now() - startTime;
    log("INFO", "response_sent", { 
      replyLength: reply.length,
      tokensUsed: data.usage?.total_tokens || null
    });

    // 10. Total duration
    log("INFO", "request_completed", { status: 200, durationMs: duration });

    res.status(200).json({ reply });

  } catch (error) {
    // 9. Caught exception
    log("ERROR", "exception_caught", {
      errorName: error.name,
      errorMessage: error.message
    });

    const duration = Date.now() - startTime;
    log("INFO", "request_completed", { status: 500, durationMs: duration });

    res.status(500).json({ error: "AI request failed" });
  }
}
