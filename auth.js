(function () {
  const AUTH_ENABLED = true;
  const SUPABASE_URL = "https://hiejaayyeprfnrrukbam.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZWphYXl5ZXByZm5ycnVrYmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDI3OTAsImV4cCI6MjA4NjUxODc5MH0._gOINPPuGvuXMpEm_qv_cSkwemt7wvFl6QDADknq4Bg";
  const TRIAL_HOURS = 24;
  const SIGNIN_URL = "signin.html";
  const RENEW_URL = "expired.html";

  if (!AUTH_ENABLED) {
    window.Auth = {
      enabled: false,
      requireActiveSession: async function () { return null; },
      signOut: async function () {}
    };
    return;
  }

  if (!window.supabase) {
    console.warn("Supabase SDK not loaded.");
    return;
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function getExpiryIso(hours) {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }

  function isExpired(expiresAt) {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
  }

  async function ensureExpiry(session) {
    if (!session || !session.user) return null;
    const meta = session.user.user_metadata || {};
    if (meta.expires_at) return meta.expires_at;
    const expiresAt = getExpiryIso(TRIAL_HOURS);
    await client.auth.updateUser({ data: { expires_at: expiresAt } });
    return expiresAt;
  }

  async function requireActiveSession(options) {
    const opts = options || {};
    const result = await client.auth.getSession();
    const session = result && result.data ? result.data.session : null;

    if (!session) {
      if (opts.onMissing) opts.onMissing();
      else window.location.href = SIGNIN_URL;
      return null;
    }

    const meta = session.user.user_metadata || {};
    const expiresAt = meta.expires_at || (await ensureExpiry(session));

    if (!expiresAt || isExpired(expiresAt)) {
      if (opts.onExpired) opts.onExpired();
      else window.location.href = RENEW_URL;
      return null;
    }

    return session;
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.href = SIGNIN_URL;
  }

  window.Auth = {
    enabled: true,
    client: client,
    getExpiryIso: getExpiryIso,
    isExpired: isExpired,
    ensureExpiry: ensureExpiry,
    requireActiveSession: requireActiveSession,
    signOut: signOut,
    TRIAL_HOURS: TRIAL_HOURS,
    SIGNIN_URL: SIGNIN_URL,
    RENEW_URL: RENEW_URL
  };
})();
