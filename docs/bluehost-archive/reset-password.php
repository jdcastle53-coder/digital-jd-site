<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Password | Digital JD</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body style="margin:0; font-family:Arial, sans-serif; background:#071426; color:white;">
  <div style="
    max-width:420px;
    margin:120px auto;
    padding:28px;
    border:1px solid rgba(212,175,55,0.6);
    border-radius:18px;
    background:rgba(10,18,35,0.95);
    text-align:center;
  ">
    <h2 style="color:#f6d36b;">Set New Password</h2>
    <p id="statusMsg">Loading secure session...</p>
    <input id="newPassword" type="password" placeholder="New password"
      style="width:100%; padding:12px; margin-top:12px; border-radius:10px; border:none; font-size:16px; display:none;">
    <button id="updatePasswordBtn"
      style="width:100%; padding:12px; margin-top:14px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; display:none;">
      Update Password
    </button>
    <div id="resetMsg" style="margin-top:14px; color:#f6d36b;"></div>
  </div>

<script>
const SUPABASE_URL = "https://hiejaayyeprfnrrukbam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rds2HjpM6PVVgQVoJ5W8Dg_URB-vraV";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showForm() {
  document.getElementById('statusMsg').innerText = 'Enter your new Digital JD password.';
  document.getElementById('newPassword').style.display = 'block';
  document.getElementById('updatePasswordBtn').style.display = 'block';
}

function showError(msg) {
  document.getElementById('statusMsg').innerText = msg;
  document.getElementById('resetMsg').innerHTML =
    '<a href="https://digitaljd.org/jd-demo.php" style="color:#f6d36b;">Request a new reset link</a>.';
}

async function init() {
  // Supabase v2 PKCE flow puts the code in the query string
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) {
      showError('Link expired or already used.');
    } else {
      showForm();
    }
    return;
  }

  // Fallback: older implicit flow uses hash fragment
  const hash = new URLSearchParams(window.location.hash.replace('#', ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (accessToken) {
    const { error } = await db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) {
      showError('Link expired or already used.');
    } else {
      showForm();
    }
    return;
  }

  // Nothing in URL at all
  showError('Link expired or already used.');
}

init();

document.getElementById('updatePasswordBtn').onclick = async () => {
  const password = document.getElementById('newPassword').value;
  if (!password || password.length < 6) {
    document.getElementById('resetMsg').innerText = "Password must be at least 6 characters.";
    return;
  }
  const { error } = await db.auth.updateUser({ password });
  if (error) {
    document.getElementById('resetMsg').innerText = error.message;
  } else {
    document.getElementById('resetMsg').innerHTML =
      'Password updated! <a href="https://digitaljd.org/jd-demo.php" style="color:#f6d36b;">Return to login</a>.';
    document.getElementById('newPassword').style.display = 'none';
    document.getElementById('updatePasswordBtn').style.display = 'none';
  }
};
</script>
</body>
</html>