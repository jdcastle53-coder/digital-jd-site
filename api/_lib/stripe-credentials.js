export function getStripeAccessToken() {
  const token = process.env.STRIPE_ACCESS_TOKEN;
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(token || "")) return null;
  if (process.env.VERCEL_ENV === "production" && !/^(sk|rk)_live_/.test(token)) return null;
  return token;
}
