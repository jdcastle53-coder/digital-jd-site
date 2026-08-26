import { createClient } from "@supabase/supabase-js";

/* =========================================================
   DIGITAL JD — ORG ADMIN API
   Minimal admin surface for the Executive Dashboard's department
   layer. Lets an Executive-tier user:
     - list their organization (auto-created on first use) + departments + members
     - create a department
     - assign an existing user (by email) to a department
     - remove a member from a department
   Gated to plan === 'executive'. Uses the service-role key server-side
   to look up users by email and write org_memberships (RLS on those
   tables only allows reading your own membership row, not writing
   others' — this endpoint is the one privileged path that does).
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

async function requireExecutive(req, supabaseAdmin) {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, message: "Not signed in." };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, message: "Invalid or expired session." };
  const meta = data.user.user_metadata || {};
  if (meta.plan !== "executive") {
    return { ok: false, status: 403, message: "This feature is available on the Executive plan." };
  }
  return { ok: true, user: data.user };
}

async function ensureOrgForUser(supabaseAdmin, userId) {
  // Does this user already belong to an org (as admin or member)?
  const { data: existingMembership } = await supabaseAdmin
    .from("org_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMembership) return existingMembership.organization_id;

  // First time: create an org owned by this Executive user and make them admin.
  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .insert({ name: "My Organization", created_by: userId })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  const { error: memErr } = await supabaseAdmin
    .from("org_memberships")
    .insert({ organization_id: org.id, user_id: userId, role: "admin" });
  if (memErr) throw memErr;

  return org.id;
}

export default async function handler(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Server configuration error." });
  }

  const auth = await requireExecutive(req, supabaseAdmin);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.message });

  try {
    const organizationId = await ensureOrgForUser(supabaseAdmin, auth.user.id);

    if (req.method === "GET") {
      const [{ data: departments, error: deptErr }, { data: memberships, error: memErr }] = await Promise.all([
        supabaseAdmin
          .from("departments")
          .select("id, name, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("org_memberships")
          .select("id, user_id, department_id, role")
          .eq("organization_id", organizationId),
      ]);
      if (deptErr) throw deptErr;
      if (memErr) throw memErr;

      // Resolve emails for the members list (admin API, not exposed to client directly).
      const userIds = memberships.map((m) => m.user_id);
      const emailsByUserId = {};
      for (const uid of userIds) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (data?.user) emailsByUserId[uid] = data.user.email;
      }
      const members = memberships.map((m) => ({
        ...m,
        email: emailsByUserId[m.user_id] || "(unknown)",
      }));

      return res.status(200).json({ organizationId, departments, members });
    }

    if (req.method === "POST") {
      const { action } = req.body || {};

      if (action === "create_department") {
        const name = (req.body.name || "").trim();
        if (!name) return res.status(400).json({ error: "Department name is required." });
        const { data, error } = await supabaseAdmin
          .from("departments")
          .insert({ organization_id: organizationId, name })
          .select("id, name")
          .single();
        if (error) throw error;
        return res.status(200).json({ department: data });
      }

      if (action === "assign_member") {
        const email = (req.body.email || "").trim().toLowerCase();
        const departmentId = req.body.departmentId || null;
        if (!email) return res.status(400).json({ error: "Email is required." });

        // Look up the user by email via admin API (paginated scan — fine at this scale).
        let foundUser = null;
        let page = 1;
        while (!foundUser) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) throw error;
          foundUser = (data.users || []).find((u) => (u.email || "").toLowerCase() === email);
          if (foundUser || data.users.length < 200) break;
          page++;
        }
        if (!foundUser) return res.status(404).json({ error: "No account found with that email." });

        const { data: existing } = await supabaseAdmin
          .from("org_memberships")
          .select("id")
          .eq("user_id", foundUser.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin
            .from("org_memberships")
            .update({ department_id: departmentId, organization_id: organizationId })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from("org_memberships")
            .insert({
              organization_id: organizationId,
              department_id: departmentId,
              user_id: foundUser.id,
              role: "member",
            });
          if (error) throw error;
        }
        return res.status(200).json({ ok: true, email: foundUser.email });
      }

      if (action === "remove_member") {
        const membershipId = req.body.membershipId;
        if (!membershipId) return res.status(400).json({ error: "membershipId is required." });
        const { error } = await supabaseAdmin
          .from("org_memberships")
          .delete()
          .eq("id", membershipId)
          .eq("organization_id", organizationId);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "Unknown action." });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    console.error("[ORG-ADMIN] error:", e.message);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
