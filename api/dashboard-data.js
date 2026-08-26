import { createClient } from "@supabase/supabase-js";

/* =========================================================
   DIGITAL JD — EXECUTIVE DASHBOARD ROLLUP API
   Computes risk-gauge data for the Executive Dashboard at three
   levels: company (all org members), department, and individual.

   Risk scale: risk_answers.score is 1 (unhealthy) - 5 (healthy).
   The gauge shows RISK, not health, so we invert:
     riskPercent = (5 - avgScore) / 4 * 100
   0% = perfectly healthy (avg 5), 100% = maximum risk (avg 1).

   Only the most recent completed assessment per user counts toward
   the rollup (a person's older, superseded submissions don't drag
   the average down).

   Gated to plan === 'executive'. Uses the service-role key to read
   across all org members' data server-side (RLS only allows a user
   to see their own answers, so aggregation must happen here).
========================================================= */

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function riskPercent(avgScore) {
  if (avgScore == null || Number.isNaN(avgScore)) return null;
  return Math.round(((5 - avgScore) / 4) * 100);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Server configuration error." });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Not signed in." });

  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
  const meta = authData.user.user_metadata || {};
  if (meta.plan !== "executive") {
    return res.status(403).json({ error: "This feature is available on the Executive plan." });
  }

  try {
    // Which org does this Executive belong to?
    const { data: myMembership, error: memErr } = await supabaseAdmin
      .from("org_memberships")
      .select("organization_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (memErr) throw memErr;

    if (!myMembership) {
      // No org set up yet — nothing to roll up.
      return res.status(200).json({
        hasOrg: false,
        domains: [],
        company: null,
        departments: [],
        individuals: [],
      });
    }

    const organizationId = myMembership.organization_id;

    const [{ data: domains, error: domErr }, { data: departments, error: deptErr }, { data: memberships, error: allMemErr }] =
      await Promise.all([
        supabaseAdmin.from("risk_domains").select("id, key, label, sort_order").order("sort_order", { ascending: true }),
        supabaseAdmin.from("departments").select("id, name").eq("organization_id", organizationId),
        supabaseAdmin.from("org_memberships").select("id, user_id, department_id").eq("organization_id", organizationId),
      ]);
    if (domErr) throw domErr;
    if (deptErr) throw deptErr;
    if (allMemErr) throw allMemErr;

    const domainById = {};
    for (const d of domains) domainById[d.id] = d;

    const userIds = memberships.map((m) => m.user_id);
    if (userIds.length === 0) {
      return res.status(200).json({
        hasOrg: true,
        domains: domains.map((d) => ({ key: d.key, label: d.label })),
        company: null,
        departments: departments.map((d) => ({ id: d.id, name: d.name, riskPercent: null, domainAverages: {} })),
        individuals: [],
      });
    }

    // Most recent completed assessment per user.
    const { data: assessments, error: aErr } = await supabaseAdmin
      .from("risk_assessments")
      .select("id, user_id, submitted_at")
      .in("user_id", userIds)
      .order("submitted_at", { ascending: false });
    if (aErr) throw aErr;

    const latestAssessmentByUser = {};
    for (const a of assessments) {
      if (!latestAssessmentByUser[a.user_id]) latestAssessmentByUser[a.user_id] = a;
    }
    const latestAssessmentIds = Object.values(latestAssessmentByUser).map((a) => a.id);

    let answersByAssessment = {};
    if (latestAssessmentIds.length > 0) {
      const { data: answers, error: ansErr } = await supabaseAdmin
        .from("risk_answers")
        .select("assessment_id, question_id, score, risk_questions(domain_id)")
        .in("assessment_id", latestAssessmentIds);
      if (ansErr) throw ansErr;

      for (const row of answers) {
        const domainId = row.risk_questions?.domain_id;
        if (!domainId) continue;
        if (!answersByAssessment[row.assessment_id]) answersByAssessment[row.assessment_id] = {};
        if (!answersByAssessment[row.assessment_id][domainId]) answersByAssessment[row.assessment_id][domainId] = [];
        answersByAssessment[row.assessment_id][domainId].push(row.score);
      }
    }

    // Resolve emails for the individuals view.
    const emailsByUserId = {};
    for (const uid of userIds) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (data?.user) emailsByUserId[uid] = data.user.email;
    }

    function domainAveragesForUser(userId) {
      const assessment = latestAssessmentByUser[userId];
      if (!assessment) return null;
      const byDomain = answersByAssessment[assessment.id] || {};
      const result = {};
      for (const domainId of Object.keys(byDomain)) {
        const key = domainById[domainId]?.key;
        if (!key) continue;
        const scores = byDomain[domainId];
        result[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
      return result;
    }

    function overallAverageFromDomainAverages(domainAverages) {
      const vals = Object.values(domainAverages || {});
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    function combineDomainAverages(listOfDomainAverages) {
      // Average of averages across the group, per domain key.
      const sums = {};
      const counts = {};
      for (const da of listOfDomainAverages) {
        if (!da) continue;
        for (const key of Object.keys(da)) {
          sums[key] = (sums[key] || 0) + da[key];
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      const result = {};
      for (const key of Object.keys(sums)) {
        result[key] = sums[key] / counts[key];
      }
      return result;
    }

    // Individuals
    const individuals = memberships
      .map((m) => {
        const domainAverages = domainAveragesForUser(m.user_id);
        const overallAvg = overallAverageFromDomainAverages(domainAverages);
        return {
          userId: m.user_id,
          email: emailsByUserId[m.user_id] || "(unknown)",
          departmentId: m.department_id,
          hasSubmitted: !!domainAverages && Object.keys(domainAverages).length > 0,
          riskPercent: riskPercent(overallAvg),
          domainAverages: domainAverages || {},
        };
      });

    // Departments
    const departmentsOut = departments.map((d) => {
      const deptIndividuals = individuals.filter((i) => i.departmentId === d.id && i.hasSubmitted);
      const combined = combineDomainAverages(deptIndividuals.map((i) => i.domainAverages));
      const overallAvg = overallAverageFromDomainAverages(combined);
      return {
        id: d.id,
        name: d.name,
        memberCount: individuals.filter((i) => i.departmentId === d.id).length,
        submittedCount: deptIndividuals.length,
        riskPercent: riskPercent(overallAvg),
        domainAverages: combined,
      };
    });

    // Company (all submitted individuals combined)
    const submittedIndividuals = individuals.filter((i) => i.hasSubmitted);
    const companyDomainAverages = combineDomainAverages(submittedIndividuals.map((i) => i.domainAverages));
    const companyOverallAvg = overallAverageFromDomainAverages(companyDomainAverages);

    return res.status(200).json({
      hasOrg: true,
      domains: domains.map((d) => ({ key: d.key, label: d.label })),
      company: {
        memberCount: individuals.length,
        submittedCount: submittedIndividuals.length,
        riskPercent: riskPercent(companyOverallAvg),
        domainAverages: companyDomainAverages,
      },
      departments: departmentsOut,
      individuals: individuals.map((i) => ({
        userId: i.userId,
        email: i.email,
        departmentId: i.departmentId,
        hasSubmitted: i.hasSubmitted,
        riskPercent: i.riskPercent,
        domainAverages: i.domainAverages,
      })),
    });
  } catch (e) {
    console.error("[DASHBOARD-DATA] error:", e.message);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
