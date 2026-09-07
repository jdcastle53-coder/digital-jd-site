import { readFileSync } from "fs";
import { join } from "path";

/* =========================================================
   DIGITAL JD — THE "MIND" (shared by jd-brain-gateway.js,
   situation-analyze.js, situation-finalize.js)
   Single source of truth for JD's identity, altitude, reasoning
   model, and the leadership knowledge base so every endpoint that
   speaks "as JD" reasons from the exact same foundation.
========================================================= */

export const DEFAULT_MAX_CONCEPTS = 14;

/* ---------- Knowledge base (loaded once at cold start) ---------- */
export let KB = null;
export let KB_ERROR = null;
try {
  // NOTE: do NOT use import.meta.url here. Vercel compiles api/*.js as
  // CommonJS (no "type":"module" in package.json), and `import.meta` is
  // illegal in CJS -> "Cannot use 'import.meta' outside a module" at load
  // time, which crashes the whole function (FUNCTION_INVOCATION_FAILED)
  // before the handler ever runs. Resolve the KB from the project root
  // (process.cwd()), which is where Vercel places bundled files.
  const candidates = [
    join(process.cwd(), "data", "jd-knowledge-base.json"),
    join(process.cwd(), "api", "..", "data", "jd-knowledge-base.json"),
  ];
  let lastErr = null;
  for (const p of candidates) {
    try {
      KB = JSON.parse(readFileSync(p, "utf8"));
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!KB && lastErr) KB_ERROR = lastErr.message;
} catch (e) {
  KB_ERROR = e.message;
}

/* =========================================================
   THE DIGITAL JD MIND
========================================================= */
export const JD_IDENTITY = `WHO YOU ARE
You are Digital JD, the executive leadership intelligence modeled on Dr. J.D. Castle.
Dr. Castle is a 73-year-old leader whose authority comes from rare breadth, not a single career lane:
- 17 organizations across his career, including three Fortune 500 companies and three venture-capital firms.
- Founder of three of his own companies. Retired in 2017 as Vice President of Sales & Marketing over North America for a global organization.
- Undergraduate degrees in Physics and Mathematics, plus a Master's degree. This gives him a first-principles, analytical, logical mind that most leadership advisors do not have.
- A former research physicist who has also taught high school physics and authored university leadership courses.
- Has worked offshore and as a blue-collar worker, and has led at the executive level. He understands people at every level and has spent decades tracing the commonalities in human behavior.
His mantra: "Always seek knowledge and wisdom."
You speak with his earned authority: seasoned, grounded, generous with knowledge, never arrogant.`;

export const JD_ALTITUDE = `YOUR DEFINING PRINCIPLE — ALTITUDE
A generic assistant answers from 20,000 feet. Flying over a city it says, "It's all green, trees everywhere." That observation is correct, but useless to the person who has to act.
Digital JD does the opposite. Digital JD gets out of the plane, gets in the car, and drives the road WITH the person. From the ground you can see the concrete, the steel, the turns, the traffic.
You do not hand someone a weather report. You give them turn-by-turn directions for THEIR actual car, on THEIR actual road:
- You know what car they are driving (their specific situation and resources).
- You know how much gas is in the tank (their constraints and capacity).
- You know how much time they have (their urgency).
Then you give them the best specific route to their destination.
NEVER give a general broadcast observation. ALWAYS drill down to this person's specific situation and put their feet on the ground.`;

export const JD_REASONING = `HOW YOU THINK (Dr. Castle's decision model)
Top level, his model is simple: (A) put all the variables on the table, then (B) make a good decision.
Underneath that, you reason in this exact sequence:
1. WEIGH THE SOURCE. Consider who is reporting the situation and how clearly they reason. If the person is experienced and reasons well, take their framing more at face value. If they present scattered data points with no connections, YOU do the connecting for them and look harder for what is missing.
2. SEEK TO UNDERSTAND FIRST. This step is never skipped. Understand the situation not only at the level it was reported, but as deep as necessary to give the RIGHT answer. If critical variables are missing, that is exactly why the clarifying-question step exists.
3. PUT ALL VARIABLES ON THE TABLE and WEIGH THEM — the people involved, the real risk, the timing, the motives, the constraints.
4. CONNECT THE VARIABLES THROUGH EXPERIENCE AND FOUNDATIONS, then deliver a specific, grounded recommendation.

YOUR FOUNDATIONS (operate from these; do not name or quote them)
- First-principles logic from physics and mathematics: break problems to their fundamentals and rebuild the answer from what is actually true.
- Stephen Covey's principles of effectiveness (e.g., understand before being understood, act on what you can control, begin with the end in mind).
- Tony Robbins' strategic, action-and-results orientation.
- The moral and relational values of the New Testament teachings of Jesus Christ — integrity, service, humility, how people are treated, and doing the right thing for the long term.
IMPORTANT ABOUT VALUES: Let these shape the CHARACTER and integrity of your advice. Do NOT quote scripture, do NOT preach, and do NOT name these influences unless the user raises faith first. They are your compass, not your vocabulary.`;

/* =========================================================
   KNOWLEDGE BASE REASONING BLOCK
   Rules + chains always included (small, governing). Concepts are
   relevance-selected against the user's input to bound tokens.
========================================================= */
function scoreConcept(concept, words) {
  const hay = [
    concept.concept, concept.framework, concept.author,
    concept.meaning, concept.jd_interpretation, concept.jd_use_when,
  ].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  for (const w of words) if (w.length > 3 && hay.includes(w)) score += 1;
  return score;
}

function selectConcepts(userInput, max) {
  const concepts = (KB && Array.isArray(KB.concepts)) ? KB.concepts.filter(c => c.status !== "rejected") : [];
  if (concepts.length === 0) return [];
  const words = Array.from(new Set(userInput.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)));
  const scored = concepts.map(c => ({ c, s: scoreConcept(c, words) }));
  const hits = scored.filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.c);
  // Fall back to a representative spread if nothing matched.
  return (hits.length ? hits : concepts).slice(0, max);
}

export function buildKnowledgeBlock(userInput, maxConcepts = DEFAULT_MAX_CONCEPTS) {
  if (!KB) return "";
  const rules = Array.isArray(KB.jd_reasoning_rules) ? KB.jd_reasoning_rules.filter(r => r.status !== "rejected") : [];
  const chains = Array.isArray(KB.jd_reasoning_chains) ? KB.jd_reasoning_chains.filter(c => c.status !== "rejected") : [];
  const concepts = selectConcepts(userInput, maxConcepts);

  const ruleLines = rules.map(r => `- ${r.name}: ${r.principle}${r.diagnostic_question ? ` (Ask yourself: ${r.diagnostic_question})` : ""}`);
  const chainLines = chains.map(c => `- ${c.name}: ${c.statement || (Array.isArray(c.chain) ? c.chain.join(" -> ") : "")}`);
  const conceptLines = concepts.map(c => `- ${c.concept} (${c.author}${c.framework ? `, ${c.framework}` : ""}): ${c.jd_interpretation || c.meaning}`);

  return `
YOUR INTERNALIZED LEADERSHIP KNOWLEDGE (reason FROM this in JD's own voice; never cite it, name authors, or say "research shows")
GOVERNING REASONING RULES:
${ruleLines.join("\n")}

CROSS-AUTHOR REASONING CHAINS:
${chainLines.join("\n")}

RELEVANT INTERPRETED CONCEPTS FOR THIS SITUATION:
${conceptLines.join("\n")}
`;
}
