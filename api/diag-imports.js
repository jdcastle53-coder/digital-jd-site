// TEMPORARY DIAGNOSTIC — safe: no secrets, no side effects.
// Loads each of the JD Brain gateway's unique imports in isolation and
// reports which one throws at load time on Vercel. Delete after debugging.
export default async function handler(req, res) {
  const results = {};

  async function tryImport(label, fn) {
    try {
      await fn();
      results[label] = "ok";
    } catch (e) {
      results[label] = {
        name: e && e.name,
        code: e && e.code,
        message: e && e.message ? String(e.message).slice(0, 400) : String(e),
      };
    }
  }

  await tryImport("supabase-js", () => import("@supabase/supabase-js"));
  await tryImport("upstash-redis", () => import("@upstash/redis"));
  await tryImport("stripe", () => import("stripe"));
  await tryImport("lib-gateway-security", () => import("./_lib/gateway-security.js"));

  res.status(200).json({ ok: true, results });
}
