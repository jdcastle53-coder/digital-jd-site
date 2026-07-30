// TEMPORARY DIAGNOSTIC — remove after debugging.
// Dynamically imports the gateway module and reports the exact load error,
// plus which relevant env vars are present (names only, never values).
export default async function handler(req, res) {
  const results = {};

  // 1) Try importing the gateway module itself and capture the real error.
  try {
    await import("./jd-brain-gateway.js");
    results.gatewayImport = "ok";
  } catch (e) {
    results.gatewayImport = {
      name: e && e.name,
      code: e && e.code,
      message: e && e.message ? String(e.message).slice(0, 500) : String(e),
      stack: e && e.stack ? String(e.stack).split("\n").slice(0, 6) : null,
    };
  }

  // 2) Report which relevant env vars are present (names only, never values).
  const envNames = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "OPENAI_API_KEY",
    "OPENAI_API_KEY_2",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  results.env = {};
  for (const k of envNames) results.env[k] = process.env[k] ? "present" : "MISSING";

  res.status(200).json({ ok: true, results });
}
