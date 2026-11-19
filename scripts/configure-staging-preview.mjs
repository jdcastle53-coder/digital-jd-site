import { readFileSync, writeFileSync } from 'node:fs';

const stagingBranch = 'feat/executive-case-workflow';
if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === stagingBranch) {
  const productionUrl = 'https://hiejaayyeprfnrrukbam.supabase.co';
  const stagingUrl = 'https://hnsadfxeliticpaiwyvx.supabase.co';
  const { SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_ACCESS_TOKEN, STRIPE_SECRET_KEY } = process.env;

  if (SUPABASE_URL !== stagingUrl || !SUPABASE_ANON_KEY || !/^(sk|rk)_test_/.test(STRIPE_ACCESS_TOKEN || STRIPE_SECRET_KEY || '')) {
    throw new Error('The Executive preview requires staging Supabase and Stripe test-mode configuration.');
  }

  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(SUPABASE_ANON_KEY)) {
    throw new Error('The Executive preview requires a Supabase publishable key.');
  }

  const browserClients = [
    'auth.js', 'executive-dashboard.html', 'jd-brain.html',
    'org-admin.html', 'reset-password.html', 'risk-assessment.html'
  ];
  for (const path of browserClients) {
    const source = readFileSync(path, 'utf8');
    const updated = source.replaceAll(productionUrl, stagingUrl)
      .replace(/eyJhbGci[A-Za-z0-9_.-]+/g, SUPABASE_ANON_KEY);
    if (updated === source || updated.includes(productionUrl) || !updated.includes(SUPABASE_ANON_KEY)) {
      throw new Error(`Could not configure staging browser authentication in ${path}.`);
    }
    writeFileSync(path, updated);
  }
}
