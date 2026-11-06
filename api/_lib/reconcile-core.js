// Pure comparison logic for the daily payment-vs-account reconciliation.
// No network calls here so it can be tested with plain data.

export function maskEmail(email) {
  if (!email) return "(none)";
  const [name, domain] = String(email).split("@");
  if (!domain) return "(invalid)";
  return `${name.slice(0, 2)}***@${domain}`;
}

// A completed checkout counts only when money actually settled (or none was due,
// e.g. a 100% discount). Delayed payment methods stay "unpaid" until they clear.
function isSettled(session) {
  return session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
}

export function classifyCheckouts(sessions, users) {
  const usersByEmail = new Map();
  for (const user of users) {
    if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
  }

  const findings = [];
  let checked = 0;
  let ok = 0;

  for (const session of sessions) {
    if (!isSettled(session)) continue;
    checked++;

    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const base = {
      sessionId: session.id,
      email: maskEmail(email),
      createdAt: new Date(session.created * 1000).toISOString(),
      amountTotal: session.amount_total,
      tier: session.metadata?.tier || null,
    };

    if (!email) {
      findings.push({ kind: "no_email_on_session", ...base });
      continue;
    }

    const user = usersByEmail.get(email);
    if (!user) {
      findings.push({ kind: "missing_account", ...base });
    } else if (user.user_metadata?.membership !== true) {
      findings.push({ kind: "account_not_marked_paid", ...base });
    } else {
      ok++;
    }
  }

  return { checked, ok, findings };
}
