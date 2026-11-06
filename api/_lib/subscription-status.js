// Decides whether a Stripe subscription event should change the status
// recorded on a Supabase account. Stripe is authoritative; we only mirror it.
// Pure function so it can be tested without Stripe or Supabase.

export function planSubscriptionUpdate({ metadata, subscription, eventType, eventCreated }) {
  const storedSubscriptionId = metadata?.stripe_subscription_id;

  // An account with no stored subscription ID can't be tied to this event
  // safely (a customer can hold more than one subscription over time).
  if (!storedSubscriptionId) return { action: "ignore", reason: "no_stored_subscription_id" };
  if (storedSubscriptionId !== subscription.id) return { action: "ignore", reason: "different_subscription" };

  // Stripe does not guarantee event order; never let an older event overwrite a newer status.
  const lastRecordedAt = Number(metadata?.subscription_status_at) || 0;
  if (eventCreated < lastRecordedAt) return { action: "ignore", reason: "stale_event" };

  const status = eventType === "customer.subscription.deleted" ? "canceled" : subscription.status;
  return {
    action: "update",
    fields: { subscription_status: status, subscription_status_at: eventCreated },
  };
}
