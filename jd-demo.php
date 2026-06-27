<?php
declare(strict_types=1);

require_once __DIR__ . '/jd-access.php';

$trialToken = jd_get_trial_token_from_request();
$trialAccess = jd_validate_trial_token($trialToken);

$trialAllowed = $trialAccess['ok'] ?? false;
$trialRemaining = $trialAccess['remaining'] ?? '';
$trialMessage = $trialAccess['message'] ?? '';
$trialStatus = $trialAccess['status'] ?? 'missing';
$trialTokenSafe = $trialAllowed ? ($trialAccess['token'] ?? '') : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Digital JD</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #111c34;
      --panel-2: #16213d;
      --border: rgba(255,255,255,0.08);
      --text: #e2e8f0;
      --muted: #9fb0cc;
      --gold: #d4af37;
      --blue-1: #2563eb;
      --blue-2: #1d4ed8;
      --blue-3: #0f3d91;
      --input: #0b1223;
      --shadow: 0 18px 48px rgba(0,0,0,0.32);
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: linear-gradient(180deg, #081121 0%, #0f172a 100%);
      color: var(--text);
      font-family: Georgia, "Times New Roman", serif;
      min-height: 100%;
    }

    body {
      display: flex;
      justify-content: center;
      padding: 10px 12px;
    }

    .shell {
      width: 100%;
      max-width: 1400px;
    }

    .app {
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border);
      border-radius: 22px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .app-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }

    .app-top-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .brand-logo-wrap {
      width: 170px;
      height: 170px;
      flex: 0 0 170px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .brand-logo {
      width: 170px;
      height: 170px;
      object-fit: contain;
      object-position: top center;
      display: block;
    }

    .brand-stack {
      display: flex;
      flex-direction: column;
      gap: 0;
      line-height: 1;
      transform: translateY(-12px);
    }

    .brand-line {
      color: var(--gold);
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(37, 99, 235, 0.16);
      border: 1px solid rgba(37, 99, 235, 0.32);
      border-radius: 999px;
      color: #dbeafe;
      font-size: 13px;
      white-space: nowrap;
    }
    .logout-btn {
  margin-left: 12px;
  background: transparent;
  border: 1px solid rgba(212,175,55,0.45);
  color: #d4af37;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(212,175,55,0.12);
}

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #60a5fa;
    }

    .trial-banner {
      margin: 6px 16px 0;
      padding: 10px 16px;
      border-radius: 16px;
      background: rgba(212, 175, 55, 0.10);
      border: 1px solid rgba(212, 175, 55, 0.22);
      color: #f8e7a1;
    }

    .trial-banner-title {
      font-size: 24px;
      line-height: 1.2;
      font-weight: 700;
      margin-bottom: 10px;
      color: #fff3c4;
    }

    .trial-banner-copy {
      font-size: 14px;
      line-height: 1.6;
      color: #f8e7a1;
    }

    .trial-banner-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 14px;
      width: 100%;
      max-width: 420px;
    }

    .chat-wrap {
      padding: 12px 16px 8px;
      background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.015));
    }

   .chat-output {
  height: auto;
  min-height: 40px;
  max-height: 40vh;
      overflow-y: auto;
      padding-right: 6px;
      scroll-behavior: smooth;
    }

    .msg {
      margin-bottom: 12px;
      display: flex;
      width: 100%;
    }

    .msg.user { justify-content: flex-end; }
    .msg.assistant,
    .msg.system { justify-content: flex-start; }

    .bubble {
      max-width: 1000px;
      width: fit-content;
      border-radius: 18px;
      padding: 14px 18px;
      line-height: 1.6;
      font-size: 16px;
      box-shadow: 0 8px 22px rgba(0,0,0,0.22);
      white-space: pre-wrap;
    }

    .user .bubble {
      background: linear-gradient(180deg, #2d4fe0, #2643bc);
      color: #ffffff;
      border-top-right-radius: 6px;
    }

    .assistant .bubble,
    .system .bubble {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      color: var(--text);
      border: 1px solid var(--border);
      border-top-left-radius: 6px;
    }

    .bubble p { margin: 0 0 10px; }
    .bubble p:last-child { margin-bottom: 0; }

    .jd-answer { white-space: normal; }

    .jd-section { margin-bottom: 18px; }
    .jd-section:last-child { margin-bottom: 0; }

    .jd-section-title {
      color: var(--gold);
      font-size: 24px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: 0.01em;
      margin: 0 0 10px 0;
      scroll-margin-top: 8px;
    }

    .jd-paragraph {
      margin: 0 0 10px 0;
      color: var(--text);
      line-height: 1.7;
    }

    .jd-paragraph:last-child { margin-bottom: 0; }

 .jd-list {
  margin: 8px 0 12px 0;
  padding-left: 24px;
  }
  .jd-list-ul {
  list-style: disc;
  }
  .jd-list-ol {
  list-style: decimal;
  }

    .jd-list li {
      margin: 8px 0;
      color: var(--text);
      line-height: 1.7;
    }

    .jd-outline {
      margin: 6px 0;
    }
    .jd-outline-0 {
      margin-left: 0;
    }
    .jd-outline-1 {
      margin-left: 1.75rem;
    }
    .jd-outline-2 {
      margin-left: 3.5rem;
    }
    .jd-bullet-dot {
      display: inline-block;
      margin-right: 8px;
      color: var(--gold, #c9a84c);
    }

    .jd-list strong,
    .jd-paragraph strong {
      color: #ffffff;
      font-weight: 700;
    }

    .quick-answer-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .quick-answer-btn {
      border: 1px solid rgba(201, 168, 76, 0.65);
      border-radius: 12px;
      padding: 11px 15px;
      background: rgba(201, 168, 76, 0.08);
      color: #c9a84c;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      box-shadow: 0 8px 18px rgba(0,0,0,0.25);
    }

    .quick-answer-btn:hover {
      transform: translateY(-1px);
      background: rgba(201, 168, 76, 0.16);
    }

    .quick-answer-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .enhanced-analysis-panel {
      width: min(100%, 1120px);
      max-width: 1120px;
      background: linear-gradient(180deg, #0e1c33 0%, #0a1628 100%);
      color: #e2e8f0;
      border: 1px solid rgba(201, 168, 76, 0.30);
      border-radius: 18px;
      padding: 22px 24px;
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.38);
      white-space: normal;
    }

    .enhanced-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 28px;
      margin-bottom: 26px;
    }

    .enhanced-heading-wrap {
      flex: 1;
      min-width: 0;
    }

    .enhanced-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #f0f4f8;
      font-size: clamp(24px, 2.4vw, 34px);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.02em;
    }

    .enhanced-icon {
      flex: 0 0 auto;
      width: 0.92em;
      height: 0.92em;
      color: var(--gold);
    }

    .enhanced-subtitle {
      margin-top: 12px;
      color: #9fb0cc;
      font-size: 18px;
      line-height: 1.45;
      max-width: 620px;
    }

    .instant-insight-btn {
      flex: 0 0 220px;
      min-height: 132px;
      border: 1px solid rgba(201, 168, 76, 0.55);
      border-radius: 16px;
      background: rgba(201, 168, 76, 0.06);
      color: var(--gold);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    }

    .instant-insight-btn:hover {
      transform: translateY(-1px);
      background: rgba(201, 168, 76, 0.12);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.30);
    }

    .instant-insight-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .instant-bolt {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      background: rgba(201, 168, 76, 0.12);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .instant-bolt svg {
      width: 26px;
      height: 26px;
    }

    .instant-text {
      font-size: 24px;
      line-height: 1.1;
      text-align: center;
    }

    .enhanced-question-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .enhanced-question-label {
      display: block;
      color: #f0f4f8;
      font-size: 19px;
      font-weight: 800;
      line-height: 1.35;
      margin-bottom: 8px;
    }

    .clarifying-answer {
      width: 100%;
      min-height: 88px;
      resize: vertical;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: #0b1223;
      color: #e2e8f0;
      padding: 14px 16px;
      font-size: 17px;
      line-height: 1.45;
      outline: none;
    }

    .clarifying-answer:focus {
      border-color: var(--gold);
      box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.18);
    }

    .enhanced-note {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 18px 0 14px;
      color: #9fb0cc;
      font-size: 16px;
      line-height: 1.4;
    }

    .enhanced-note span:first-child {
      color: var(--gold);
      font-size: 22px;
      font-weight: 700;
    }

    .enhanced-submit-btn {
      width: 100%;
      border: none;
      border-radius: 12px;
      background: linear-gradient(180deg, #d4af37, #b8902a);
      color: #0a1628;
      padding: 18px 22px;
      font-size: 22px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .enhanced-submit-btn:hover {
      transform: translateY(-1px);
      opacity: 0.98;
    }

    .enhanced-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .enhanced-privacy-note {
      margin-top: 14px;
      color: #8aa0c0;
      font-size: 15px;
      text-align: center;
      line-height: 1.45;
    }

    @media (max-width: 700px) {
      .enhanced-analysis-panel {
        padding: 18px 16px;
      }

      /* Stack the title and Instant Insight vertically so the heading
         gets full width and the button never overshadows it. */
      .enhanced-top-row {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
        margin-bottom: 20px;
      }

      .enhanced-heading {
        font-size: clamp(22px, 6vw, 30px);
      }

      .enhanced-subtitle {
        font-size: 17px;
        max-width: none;
      }

      /* Full-width horizontal pill below the heading. */
      .instant-insight-btn {
        flex: none;
        width: 100%;
        min-height: 0;
        flex-direction: row;
        justify-content: center;
        gap: 12px;
        padding: 14px 16px;
      }

      .instant-bolt {
        width: 40px;
        height: 40px;
      }

      .instant-bolt svg {
        width: 22px;
        height: 22px;
      }

      .instant-text {
        font-size: 20px;
      }

      .enhanced-question-label {
        font-size: 18px;
      }

      .clarifying-answer {
        min-height: 110px;
        font-size: 16px;
      }

      .enhanced-submit-btn {
        font-size: 20px;
        padding: 16px 18px;
      }
    }

    .post-answer-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
      width: 100%;
      max-width: 360px;
    }

    .post-answer-btn {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: none;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease;
      box-shadow: 0 8px 18px rgba(0,0,0,0.24);
      text-align: left;
    }

    .post-answer-btn:hover {
      transform: translateY(-1px);
      opacity: 0.97;
    }

    .post-answer-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .post-answer-btn-title {
      display: block;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .post-answer-btn-subtext {
      display: block;
      font-size: 12px;
      line-height: 1.45;
      font-weight: 400;
      opacity: 0.92;
    }

    .btn-continue {
      background: linear-gradient(180deg, var(--blue-1), #1e40af);
      color: #ffffff;
    }

    .btn-close {
      background: linear-gradient(180deg, var(--blue-2), #1e3a8a);
      color: #ffffff;
    }

    .btn-new {
      background: linear-gradient(180deg, var(--blue-3), #0b2f70);
      color: #ffffff;
    }

.composer {
    border-top: 1px solid var(--border);
    padding: 6px 16px 8px;
    background: rgba(255,255,255,0.02);
}

   .composer-row {
    display: grid;
    grid-template-columns: 1fr 210px;
    gap: 12px;
    align-items: center;
}

    .input-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    textarea {
      width: 100%;
      min-height: 160px;
      max-height: 340px;
      resize: vertical;
      border-radius: 16px;
     border: 2px solid rgba(212, 175, 55, 0.55);
      background: var(--input);
      color: var(--text);
      padding: 14px 16px;
      font-size: 16px;
      line-height: 1.5;
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(212, 175, 55, 0.08);
transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

   textarea:focus {
  border-color: rgba(212, 175, 55, 0.9);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 3px rgba(212, 175, 55, 0.14);
}

    .helper {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .send-btn {
      min-width: 150px;
      height: 50px;
      border: none;
      border-radius: 14px;
      padding: 0 18px;
      background: linear-gradient(180deg, #d4af37, #b99324);
      color: #111827;
      font-weight: 800;
      font-size: 20px;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease;
      box-shadow: 0 10px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18);
    }

    .send-btn:hover {
      transform: translateY(-1px);
      opacity: 0.97;
    }

    .send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .thinking-wrap {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .thinking-label {
      color: #cbd5e1;
      font-size: 15px;
      letter-spacing: 0.02em;
    }

    .signal-ripple {
      position: relative;
      width: 144px;
      height: 144px;
      flex: 0 0 auto;
    }

    .signal-core {
      position: absolute;
      width: 24px;
      height: 24px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 999px;
      background: #67e8f9;
      box-shadow: 0 0 26px rgba(103, 232, 249, 0.9);
      z-index: 2;
    }

    .signal-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
      border-radius: 999px;
      border: 3px solid rgba(103, 232, 249, 0.82);
      animation: ripple 1.8s infinite ease-out;
    }

    .signal-ring.r2 {
      animation-delay: 0.45s;
      border-color: rgba(96, 165, 250, 0.75);
    }

    .signal-ring.r3 {
      animation-delay: 0.9s;
      border-color: rgba(250, 204, 21, 0.58);
    }

    .access-wrap {
      padding: 28px 22px 34px;
    }

    .access-card {
      max-width: 760px;
      margin: 0 auto;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 22px;
      box-shadow: var(--shadow);
      padding: 26px 24px;
    }

    .access-title {
      color: var(--gold);
      font-size: 30px;
      margin: 0 0 10px 0;
    }

    .access-copy {
      color: var(--text);
      font-size: 17px;
      line-height: 1.7;
      margin: 0 0 14px 0;
    }

    @keyframes ripple {
      0% {
        width: 36px;
        height: 36px;
        opacity: 0.98;
      }
      100% {
        width: 144px;
        height: 144px;
        opacity: 0;
      }
    }

    @media (max-width: 820px) {
      .composer-row { grid-template-columns: 1fr; }
      .send-btn { width: 100%; }
      .bubble { max-width: 100%; }
      .chat-output {
        height: 34vh;
        min-height: 220px;
      }
      .brand-line { font-size: 15px; }
      .brand-logo-wrap,
      .brand-logo {
        width: 90px;
        height: 90px;
      }
      .signal-ripple {
        width: 96px;
        height: 96px;
      }
      .signal-core {
        width: 18px;
        height: 18px;
      }
      .signal-ring {
        width: 24px;
        height: 24px;
      }
      .jd-section-title { font-size: 21px; }
      .trial-banner-title { font-size: 20px; }
      .post-answer-btn-title { font-size: 16px; }
      .access-title { font-size: 24px; }

      @keyframes ripple {
        0% {
          width: 24px;
          height: 24px;
          opacity: 0.98;
        }
        100% {
          width: 96px;
          height: 96px;
          opacity: 0;
        }
      }
    }
.action-column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
    width: 210px;
}

.cta-btn {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    color: #ffffff;
    text-align: center;
    transition: all 0.2s ease;
    box-shadow: 0 10px 22px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.10);
    text-shadow: 0 1px 0 rgba(0,0,0,0.25);
    font-style: italic;
}

.cta-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.30);
}

.sprint-btn {
    border: 1px solid rgba(255,255,255,0.35);
    background: linear-gradient(180deg, #9aa3af, #5f6875);
    color: #ffffff;
    .sprint-btn:hover {
    background: linear-gradient(180deg, #b2bac6, #6d7684);
}
}

.full-btn {
    border: 1px solid rgba(201, 168, 76, 0.7);
    background: rgba(201, 168, 76, 0.10);
    color: #d4af37;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255,255,255,0.06);
}
    .full-btn:hover {
    background: rgba(201, 168, 76, 0.18);
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255,255,255,0.08);
}
.manage-btn {
  border: 1px solid rgba(201,168,76,0.75);
  border-radius: 999px;
  background: transparent;
  color: #c9a84c;
  padding: 0.45rem 1.1rem;
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.manage-btn {
  border: 1px solid rgba(201,168,76,0.75);
  border-radius: 999px;
  background: transparent;
  color: #c9a84c;
  padding: 0.45rem 1.1rem;
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manage-btn:hover {
  background: rgba(201,168,76,0.12);
  box-shadow: 0 0 14px rgba(201,168,76,0.18);
}
@media (max-width: 768px) {
  .app-top {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
  }

  .app-top-left {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4rem;
  }

  .brand-logo {
    width: 120px;
    height: auto;
  }

  .brand-stack {
    align-items: center;
    text-align: center;
    line-height: 1;
  }

  .status-pill {
    position: static;
    width: auto;
    max-width: 340px;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
  }

  /* On phones, cancel the negative top margin so the login box sits
     BELOW the header instead of overlapping the brand text. */
  .auth-box {
    margin-top: 0 !important;
  }
}
  </style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="shell">
    <section class="app">
      <div class="app-top">
        <div class="app-top-left">
          <div class="brand-logo-wrap">
            <img
              src="digital-jd-logo.png"
              alt="Digital JD Bluehead Logo"
              class="brand-logo"
            />
          </div>

          <div class="brand-stack" aria-label="Intelligent Leadership System">
            <div class="brand-line">Intelligent</div>
            <div class="brand-line">Leadership</div>
            <div class="brand-line">System</div>
          </div>
        </div>

        <div class="status-pill">
    <span class="dot"></span>
    <span id="systemStatus">Subscription Active</span>

    <button id="manageSubscriptionBtn" class="manage-btn">
        Manage Subscription
    </button>

    <button id="logoutBtn" class="logout-btn">
        Logout
    </button>
</div>
      </div>

      <?php if (!$trialAllowed): ?>
        <div class="access-wrap">
          <div class="access-card">
            <h1 class="access-title">Digital JD Trial Access</h1>
            <p class="access-copy"><?php echo htmlspecialchars($trialMessage, ENT_QUOTES, 'UTF-8'); ?></p>
            <?php if ($trialStatus === 'expired'): ?>
              <p class="access-copy">This invite has completed its 7-day trial window.</p>
            <?php else: ?>
              <p class="access-copy">Use the full invite link you were given.</p>
            <?php endif; ?>
          </div>
        </div>
      <?php else: ?>

        <!-- Executive Sprint / Essential lifecycle banner (populated by sprint logic on load) -->
        <div id="sprintBanner" style="
          display:none;
          max-width: 760px;
          margin: 0 auto 18px auto;
          padding: 16px 20px;
          border: 1px solid rgba(212,175,55,0.55);
          border-radius: 16px;
          background: rgba(10,18,35,0.92);
          box-shadow: 0 14px 34px rgba(0,0,0,0.32);
          text-align: center;
        "></div>

        <div class="chat-wrap">
         <div id="chatOutput" class="chat-output" style="min-height: 40px;"></div>
        </div>

        <div class="composer">
          <div class="composer-row">
            <div class="input-wrap">
              
<div class="auth-box" style="
  max-width: 520px;
  margin: -85px auto 30px auto;
  padding: 18px;
  border: 1px solid rgba(212,175,55,0.55);
  border-radius: 18px;
  background: rgba(10,18,35,0.92);
  box-shadow: 0 18px 40px rgba(0,0,0,0.35);
">
  <div style="font-size:18px; font-weight:700; color:#f6d36b; text-align:center; margin-bottom:4px;">
    Digital JD Access
  </div>

  <div style="font-size:13px; color:#d7dcec; text-align:center; margin-bottom:14px;">
    Sign in, create access, or reset your password.
  </div>

  <input id="emailInput" type="email" placeholder="Email" style="
    width:100%;
    padding:12px 14px;
    margin-bottom:10px;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.22);
    background:#ffffff;
    font-size:15px;
  " />

  <input id="passwordInput" type="password" placeholder="Password" style="
    width:100%;
    padding:12px 14px;
    margin-bottom:12px;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.22);
    background:#ffffff;
    font-size:15px;
  " />

  <div style="display:flex; gap:8px;">
    <button id="loginBtn" style="flex:1; padding:10px; border-radius:10px; font-weight:700;">Log In</button>
    <button id="signUpBtn" style="flex:1; padding:10px; border-radius:10px; font-weight:700;">Sign Up</button>
    <button id="resetBtn" style="flex:1; padding:10px; border-radius:10px; font-weight:700;">Forgot</button>
  </div>

  <div id="authMessage" style="
    margin-top:10px;
    font-size:13px;
    color:#f6d36b;
    text-align:center;
  "></div>
</div>
             <div id="situationInputGroup">
             <div class="input-prompt">
                Describe your situation — the more detail you provide, the sharper the insight.
              </div>
              
            <div style="position:relative;">
  <textarea id="userInput" placeholder="Describe the leadership, communication, decision, or execution situation you want to work through."></textarea>

  <button id="micBtn" type="button" style="
    position:absolute;
    right:12px;
    bottom:12px;
    border:1px solid rgba(212,175,55,0.8);
    background:#0b1223;
    color:#f6d36b;
    border-radius:999px;
    padding:8px 12px;
    cursor:pointer;
    font-weight:700;
  ">🎙️ Dictate</button>
</div>
              
              <div class="helper" id="helperText">
                Digital JD will begin by asking a few clarifying questions unless you choose Quick Answer.
              </div>
              </div>
              
            </div>
            
<div class="action-column">
    <button id="sendBtn" class="send-btn">Get Insight</button>

    <button class="cta-btn full-btn"
       onclick="window.location.href='https://digitaljd.org/#pricing'">
        Get on board with Digital JD
    </button>
</div>
          </div>
        </div>
      <?php endif; ?>
    </section>
  </div>

<?php if ($trialAllowed): ?>
  <script>
    const DIGITAL_JD_TRIAL_TOKEN = <?php echo json_encode($trialTokenSafe, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
    const DIGITAL_JD_UPGRADE_LINK = 'https://digitaljd.org/';
    const DIGITAL_JD_SPRINT_LINK = 'https://digitaljd.org/#sprint';

    const chatOutput = document.getElementById('chatOutput');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const systemStatus = document.getElementById('systemStatus');

    let isBusy = false;
    let thinkingRow = null;

    let intakeState = {
      stage: 'initial',
      originalSituation: '',
      clarifyingQuestions: [],
      awaitingClarification: false,
      continuationMode: false,
      lastAnswer: ''
    };

    function setBusy(state, statusText = 'Analyzing...') {
      isBusy = state;
      sendBtn.disabled = state;
      systemStatus.textContent = state ? statusText : 'Trial Active';

      document.querySelectorAll('.quick-answer-btn, .post-answer-btn').forEach(btn => {
        btn.disabled = state;
      });
    }

    function scrollBubbleToTop(row) {
      if (!row) return;

      requestAnimationFrame(() => {
        const rowTop = row.offsetTop;
        const wrapPadding = 8;
        chatOutput.scrollTo({
          top: Math.max(rowTop - wrapPadding, 0),
          behavior: 'smooth'
        });
      });
    }

    function forceSectionTop(row) {
      if (!row) return;

      requestAnimationFrame(() => {
        const firstSectionTitle =
          row.querySelector('.jd-section-title') ||
          row.querySelector('.bubble');

        if (!firstSectionTitle) {
          scrollBubbleToTop(row);
          return;
        }

        const chatRect = chatOutput.getBoundingClientRect();
        const titleRect = firstSectionTitle.getBoundingClientRect();
        const currentScroll = chatOutput.scrollTop;
        const relativeTop = titleRect.top - chatRect.top + currentScroll;
        const targetTop = Math.max(relativeTop - 8, 0);

        chatOutput.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });

        setTimeout(() => {
          chatOutput.scrollTo({
            top: targetTop,
            behavior: 'auto'
          });
        }, 140);
      });
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatInline(text) {
      let safe = escapeHtml(text);
      safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return safe;
    }

    function formatReply(replyText) {
      if (!replyText || typeof replyText !== 'string') {
        return '<div class="jd-answer"><p class="jd-paragraph">No reply returned.</p></div>';
      }

      const normalized = replyText.replace(/\r/g, '').trim();
      const sectionTitles = [
        'SITUATIONAL ANALYSIS',
        'EXECUTIVE DRAFT',
        'JD INSIGHT',
        'EXECUTION PLAN',
        'COMMUNICATION DRAFT'
      ];

      let working = normalized;

      sectionTitles.forEach(title => {
        const regex = new RegExp(title, 'g');
        working = working.replace(regex, `|||SECTION|||${title}`);
      });

      const rawSections = working
        .split('|||SECTION|||')
        .map(part => part.trim())
        .filter(Boolean);

      if (rawSections.length === 0) {
        return `<div class="jd-answer"><p class="jd-paragraph">${formatInline(normalized)}</p></div>`;
      }

      let html = '<div class="jd-answer">';

      rawSections.forEach(section => {
        const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const title = lines.shift();
        html += `<div class="jd-section">`;
        html += `<div class="jd-section-title">${escapeHtml(title)}</div>`;

        const romanSet = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']);
        let sawOutline = false;

        lines.forEach(line => {
          const markerMatch = line.match(/^([A-Za-z]+|\d+)[\.\)]\s+(.*)$/);
          const bulletMatch = line.match(/^[-*•]\s+(.*)$/);

          if (markerMatch) {
            const marker = markerMatch[1];
            const rest = markerMatch[2].trim();
            let level;
            if (marker === marker.toUpperCase() && romanSet.has(marker)) {
              level = 0;
              sawOutline = true;
            } else if (/^[A-Z]$/.test(marker)) {
              level = 1;
              sawOutline = true;
            } else if (/^\d+$/.test(marker)) {
              level = sawOutline ? 2 : 0;
            } else {
              level = sawOutline ? 2 : 0;
            }
            html += `<p class="jd-paragraph jd-outline jd-outline-${level}">${formatInline(marker + '. ' + rest)}</p>`;
          } else if (bulletMatch) {
            const level = sawOutline ? 2 : 1;
            html += `<p class="jd-paragraph jd-outline jd-outline-${level}"><span class="jd-bullet-dot">&bull;</span>${formatInline(bulletMatch[1].trim())}</p>`;
          } else {
            html += `<p class="jd-paragraph">${formatInline(line)}</p>`;
          }
        });

        html += `</div>`;
      });

      html += '</div>';
      return html;
    }

    function createMessage(role, content, isHtml = false) {
      const row = document.createElement('div');
      row.className = `msg ${role}`;

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      if (isHtml) {
        bubble.innerHTML = content;
      } else {
        bubble.textContent = content;
      }

      row.appendChild(bubble);
      chatOutput.appendChild(row);

      return { row, bubble };
    }

    function removeTransientControls() {
      document.querySelectorAll('.quick-answer-wrap, .post-answer-actions').forEach(el => el.remove());
    }

    function renderQuickAnswerButton(container) {
      removeTransientControls();

      const wrap = document.createElement('div');
      wrap.className = 'quick-answer-wrap';

      const btn = document.createElement('button');
      btn.className = 'quick-answer-btn';
      btn.textContent = 'Quick Answer';
     btn.addEventListener('click', async () => {
  if (isBusy) return;

  userInput.value = '';
      userInput.style.height = '160px';

  await sendFinalToBrain(true);
});

      wrap.appendChild(btn);
      container.appendChild(wrap);
    }

    function renderPostAnswerButtons(container) {
      removeTransientControls();

      const actions = document.createElement('div');
      actions.className = 'post-answer-actions';
      actions.innerHTML = `
        <button class="post-answer-btn btn-continue" data-action="continue">
          <span class="post-answer-btn-title">Continue This Situation</span>
          <span class="post-answer-btn-subtext">Keep working on this same issue and go deeper.</span>
        </button>
        <button class="post-answer-btn btn-close" data-action="close">
          <span class="post-answer-btn-title">Close This Situation</span>
          <span class="post-answer-btn-subtext">Finish this issue and leave it complete for now.</span>
        </button>
        <button class="post-answer-btn btn-new" data-action="new">
          <span class="post-answer-btn-title">Start a New Situation</span>
          <span class="post-answer-btn-subtext">Begin a completely different issue or decision.</span>
        </button>
      `;

      actions.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function () {
          if (isBusy) return;
          handlePostAnswerAction(this.getAttribute('data-action'));
        });
      });

      container.appendChild(actions);
    }

    function handlePostAnswerAction(action) {
      removeTransientControls();

      if (action === 'continue') {
        intakeState.awaitingClarification = false;
        intakeState.continuationMode = true;

        // Bring back the input box so the user can actually type their continuation.
        const situationInputGroupContinue = document.getElementById('situationInputGroup');
        if (situationInputGroupContinue) situationInputGroupContinue.style.display = '';
        userInput.value = '';
        userInput.focus();

        const rendered = createMessage(
          'system',
          'Continue this situation. Tell me what part you want to work on next, what changed, or what decision you need to make now.'
        );
        scrollBubbleToTop(rendered.row);
        return;
      }

     if (action === 'close') {
  intakeState = {
    stage: 'closed',
    originalSituation: '',
    clarifyingQuestions: [],
    awaitingClarification: false,
    continuationMode: false,
    lastAnswer: ''
  };

  chatOutput.innerHTML = '';
  userInput.value = '';
  userInput.style.height = '160px';

  // Bring back the situation box for the next fresh situation.
  const situationInputGroupClose = document.getElementById('situationInputGroup');
  if (situationInputGroupClose) situationInputGroupClose.style.display = '';

  stopDictationIfRunning();

  const rendered = createMessage(
    'system',
    'Session closed. Describe a new situation whenever you are ready.'
  );

  scrollBubbleToTop(rendered.row);
  return;
}
      if (action === 'new') {
        intakeState = {
          stage: 'initial',
          originalSituation: '',
          clarifyingQuestions: [],
          awaitingClarification: false,
          continuationMode: false,
          lastAnswer: ''
        };

       chatOutput.innerHTML = '';
userInput.value = '';
userInput.style.height = '160px';

// Bring back the situation box for the next fresh situation.
const situationInputGroupNew = document.getElementById('situationInputGroup');
if (situationInputGroupNew) situationInputGroupNew.style.display = '';

if (recognition && isListening) {
  recognition.stop();
}

isListening = false;
finalTranscript = '';

const micBtn = document.getElementById('micBtn');
if (micBtn) {
  micBtn.innerText = '🎙️ Dictate';
  micBtn.style.background = '#0b1223';
}

const rendered = createMessage(
  'system',
  'Start a new situation whenever you are ready. Describe it, and I will begin by asking a few clarifying questions.'
);
scrollBubbleToTop(rendered.row);
      }
    }

    function showThinkingIndicator() {
      removeThinkingIndicator();

      const row = document.createElement('div');
      row.className = 'msg assistant';
      row.id = 'thinkingRow';

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = `
        <div class="thinking-wrap">
          <div class="signal-ripple" aria-hidden="true">
            <div class="signal-core"></div>
            <div class="signal-ring r1"></div>
            <div class="signal-ring r2"></div>
            <div class="signal-ring r3"></div>
          </div>
          <div class="thinking-label">Digital JD is analyzing your situation...</div>
        </div>
      `;

      row.appendChild(bubble);
      chatOutput.appendChild(row);
      thinkingRow = row;
      scrollBubbleToTop(row);
    }

    function removeThinkingIndicator() {
      if (thinkingRow && thinkingRow.parentNode) {
        thinkingRow.parentNode.removeChild(thinkingRow);
      }
      thinkingRow = null;
    }

   function buildClarifyingQuestions(originalSituation = '') {
  const s = originalSituation.toLowerCase();

  if (s.includes('conflict') || s.includes('tension') || s.includes('argument') || s.includes('frustrated')) {
    return [
      'What is the real point of tension between the people involved?',
      'What outcome would repair trust or move the relationship forward?',
      'What conversation needs to happen first?'
    ];
  }

  if (s.includes('team') || s.includes('morale') || s.includes('inspired') || s.includes('motivation')) {
    return [
      'What is the current energy level of the team?',
      'What do you believe is causing the lack of momentum?',
      'What would success look like in the next 30 days?'
    ];
  }

  if (s.includes('decision') || s.includes('choose') || s.includes('option') || s.includes('strategy')) {
    return [
      'What decision must be made?',
      'What are the main options on the table?',
      'What risk are you most concerned about?'
    ];
  }

  if (s.includes('communicat') || s.includes('message') || s.includes('email') || s.includes('meeting')) {
    return [
      'Who needs to receive the message?',
      'What do they need to understand, feel, or do afterward?',
      'What could be misunderstood if the message is not delivered well?'
    ];
  }

  if (s.includes('employee') || s.includes('performance') || s.includes('accountability')) {
    return [
      'What behavior or performance issue needs to change?',
      'What expectation has already been communicated?',
      'What consequence or support needs to be clear next?'
    ];
  }

  return [
    'What outcome matters most here?',
    'What is the biggest risk if this is handled poorly?',
    'What decision or action needs to happen next?'
  ];
}
    async function renderClarifyingStep(originalSituation) {
     const response = await fetch('./jd-brain.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mode: 'clarify',
    message: originalSituation
  })
});

const result = await response.json();

let questions = [];

if (result.success && result.reply) {
  questions = result.reply
    .split('\n')
    .map(q => q.trim())
    .filter(q => q.match(/^\d+\./));
}

if (!questions.length) {
  questions = [
    '1. What outcome are you trying to create?',
    '2. What tension or obstacle matters most right now?',
    '3. What decision or conversation is most urgent?'
  ];
}
      intakeState.stage = 'awaiting_clarification';
      intakeState.originalSituation = originalSituation;
      intakeState.clarifyingQuestions = questions;
      intakeState.awaitingClarification = true;
      intakeState.continuationMode = false;

      // Hide the original "Describe your situation" box once the Enhanced Analysis
      // panel appears — the client now answers inside the question boxes instead.
      const situationInputGroup = document.getElementById('situationInputGroup');
      if (situationInputGroup) situationInputGroup.style.display = 'none';

      const questionFields = questions.map((q, index) => {
        const cleanQuestion = escapeHtml(q).replace(/^\d+\.\s*/, '');
        return `
          <div class="enhanced-question-block">
            <label class="enhanced-question-label" for="clarifyingAnswer${index}">
              ${index + 1}. ${cleanQuestion}
            </label>
            <textarea
              id="clarifyingAnswer${index}"
              class="clarifying-answer"
              data-question="${escapeHtml(q)}"
              placeholder="Your answer..."
            ></textarea>
          </div>
        `;
      }).join('');

      const html = `
        <div class="jd-answer enhanced-analysis-panel">
          <div class="enhanced-top-row">
            <div class="enhanced-heading-wrap">
              <div class="enhanced-heading">
                <svg class="enhanced-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 15.5l3.2-3.3 2.4 2.4L17 9.5"/><path d="M14 9.5h3v3"/></svg>
                <span>Enhanced Analysis</span>
              </div>
              <div class="enhanced-subtitle">
                Answer the questions below to receive deeper, more personalized leadership guidance.
              </div>
            </div>

            <button type="button" id="instantInsightBtn" class="instant-insight-btn">
              <span class="instant-bolt"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z"/></svg></span>
              <span class="instant-text">Instant Insight</span>
            </button>
          </div>

          <div class="enhanced-question-list">
            ${questionFields}
          </div>

          <div class="enhanced-note">
            <span>＋</span>
            <span>Additional questions may be added based on your situation.</span>
          </div>

          <button type="button" id="enhancedAnalysisBtn" class="enhanced-submit-btn">
            Get Enhanced Analysis
          </button>

          <div class="enhanced-privacy-note">
            Your responses are private and used only to provide you with better guidance.
          </div>
        </div>
      `;

      const rendered = createMessage('assistant', html, true);
      forceSectionTop(rendered.row);

      const instantInsightBtn = document.getElementById('instantInsightBtn');
      if (instantInsightBtn) {
        instantInsightBtn.addEventListener('click', async () => {
          if (isBusy) return;
          await sendFinalToBrain(true);
        });
      }

      const enhancedAnalysisBtn = document.getElementById('enhancedAnalysisBtn');
      if (enhancedAnalysisBtn) {
        enhancedAnalysisBtn.addEventListener('click', async () => {
          if (isBusy) return;

          const answers = Array.from(document.querySelectorAll('.clarifying-answer'));
          const clarificationText = answers.map((field, index) => {
            const question = field.dataset.question || `Question ${index + 1}`;
            const answer = field.value.trim() || '(No additional answer provided.)';
            return `${question}\nAnswer: ${answer}`;
          }).join('\n\n');

          await sendFinalToBrain(false, clarificationText);
        });
      }

      const firstAnswer = document.getElementById('clarifyingAnswer0');
      if (firstAnswer) {
        firstAnswer.focus();
      }
    }

    function buildFinalPrompt(useQuickAnswer, clarificationText = '') {
      if (useQuickAnswer) {
        return `
The user initially described this situation:
${intakeState.originalSituation}

The user selected Quick Answer instead of answering clarifying questions.

MODE DECISION — DO THIS FIRST, BEFORE WRITING ANYTHING:
If the user's message asks you to write, create, draft, generate, build, produce, make, design, develop, rewrite, restructure, or outline anything concrete — such as a training class, course, lesson, document, business plan, proposal, speech, email, letter, script, agenda, checklist, or outline — OR pastes a document for you to improve, you MUST use DOCUMENT MODE.
In DOCUMENT MODE: the very first heading MUST be EXECUTIVE DRAFT (never SITUATIONAL ANALYSIS), and directly under it you MUST deliver the COMPLETE finished work product itself, fully written out as a clean structured outline with headings and indented sub-points — as Dr. Castle's own work. Do NOT give advice about how to create it; actually create it.
Only use SITUATIONAL ANALYSIS when the user is purely asking for advice, analysis, or a decision with nothing to produce. When in doubt, choose DOCUMENT MODE. Never refuse or say you cannot create or edit documents.

Provide a first-pass Digital JD response in this exact order:
SITUATIONAL ANALYSIS (or EXECUTIVE DRAFT in document mode)
JD INSIGHT
EXECUTION PLAN

Be practical, executive-level, concise but meaningful.
        `.trim();
      }

      return `
The user initially described this situation:
${intakeState.originalSituation}

The user then provided these answers to clarifying questions:
${clarificationText}

MODE DECISION — DO THIS FIRST, BEFORE WRITING ANYTHING:
If the user's message asks you to write, create, draft, generate, build, produce, make, design, develop, rewrite, restructure, or outline anything concrete — such as a training class, course, lesson, document, business plan, proposal, speech, email, letter, script, agenda, checklist, or outline — OR pastes a document for you to improve, you MUST use DOCUMENT MODE.
In DOCUMENT MODE: the very first heading MUST be EXECUTIVE DRAFT (never SITUATIONAL ANALYSIS), and directly under it you MUST deliver the COMPLETE finished work product itself, fully written out as a clean structured outline with headings and indented sub-points — as Dr. Castle's own work. Do NOT give advice about how to create it; actually create it.
Only use SITUATIONAL ANALYSIS when the user is purely asking for advice, analysis, or a decision with nothing to produce. When in doubt, choose DOCUMENT MODE. Never refuse or say you cannot create or edit documents.

Now provide the Digital JD response in this exact order:
SITUATIONAL ANALYSIS (or EXECUTIVE DRAFT in document mode)
JD INSIGHT
EXECUTION PLAN

Include COMMUNICATION DRAFT only if it is truly useful.
Be practical, executive-level, and concrete.
      `.trim();
    }

    function buildContinuationPrompt(followUpText) {
      return `
We are continuing the same situation.

Original situation:
${intakeState.originalSituation}

Most recent Digital JD answer:
${intakeState.lastAnswer}

The user now wants to continue with this follow-up:
${followUpText}

MODE DECISION — DO THIS FIRST, BEFORE WRITING ANYTHING:
If the user is now asking you to write, create, draft, generate, build, produce, make, design, develop, rewrite, restructure, or outline anything concrete — such as a training class, course, lesson, document, business plan, proposal, speech, email, letter, script, agenda, checklist, or outline — OR pastes a document for you to improve, you MUST use DOCUMENT MODE.
In DOCUMENT MODE: the very first heading MUST be EXECUTIVE DRAFT (never SITUATIONAL ANALYSIS), and directly under it you MUST deliver the COMPLETE finished work product itself, fully written out as a clean structured outline with headings and indented sub-points — as Dr. Castle's own work. Do NOT give advice about how to create it; actually create it.
Only use SITUATIONAL ANALYSIS when the user is purely asking for advice, analysis, or a decision with nothing to produce. When in doubt, choose DOCUMENT MODE. Never refuse or say you cannot create or edit documents.

Continue advising on the same situation. Respond in this exact order:
SITUATIONAL ANALYSIS (or EXECUTIVE DRAFT in document mode)
JD INSIGHT
EXECUTION PLAN

Include COMMUNICATION DRAFT only if truly useful.
Build on the prior advice rather than starting generically from zero.
      `.trim();
    }

    function getDaysRemainingFromText(text) {
      const match = String(text || '').match(/(\d+)/);
      if (!match) return 0;
      return parseInt(match[1], 10);
    }

    function renderTrialBannerFromDays(daysRemaining) {
      const banner = document.getElementById('trialBanner');
      if (!banner) return;

      let html = '';

      if (daysRemaining >= 7) {
        html = `
          <div class="trial-banner-title">7 days remaining — Full access. Explore freely.</div>
          <div class="trial-banner-copy">Use this week to test real situations and see how Digital JD thinks with you.</div>
        `;
      } else if (daysRemaining === 6) {
        html = `
          <div class="trial-banner-title">6 days remaining — Start testing real decisions.</div>
          <div class="trial-banner-copy">Use this on something real, not hypothetical.</div>
        `;
      } else if (daysRemaining === 5) {
        html = `
          <div class="trial-banner-title">5 days remaining — Use this on something important.</div>
          <div class="trial-banner-copy">The more real the issue, the more valuable the system becomes.</div>
        `;
      } else if (daysRemaining === 4) {
        html = `
          <div class="trial-banner-title">4 days remaining — Is this improving clarity?</div>
          <div class="trial-banner-copy">Notice whether your decisions, communication, and execution are getting cleaner.</div>
        `;
      } else if (daysRemaining === 3) {
        html = `
          <div class="trial-banner-title">3 days remaining — Try a difficult conversation.</div>
          <div class="trial-banner-copy">This is a strong point to test communication under pressure.</div>
        `;
      } else if (daysRemaining === 2) {
        html = `
          <div class="trial-banner-title">2 days remaining — Most users decide here.</div>
          <div class="trial-banner-actions">
            <button onclick="window.location.href='${DIGITAL_JD_UPGRADE_LINK}'" class="post-answer-btn btn-continue">
              <span class="post-answer-btn-title">Get Full Access to Digital JD</span>
              <span class="post-answer-btn-subtext">Click here, then scroll down to pricing to sign up.</span>
            </button>
          </div>
        `;
      } else if (daysRemaining === 1) {
        html = `
          <div class="trial-banner-title">1 day remaining — Final day. Don’t lose this advantage.</div>
          <div class="trial-banner-actions">
            <button onclick="window.location.href='${DIGITAL_JD_UPGRADE_LINK}'" class="post-answer-btn btn-continue">
              <span class="post-answer-btn-title">Get Full Access to Digital JD</span>
              <span class="post-answer-btn-subtext">Click here, then scroll down to pricing to sign up.</span>
            </button>
            <button onclick="window.location.href='${DIGITAL_JD_SPRINT_LINK}'" class="post-answer-btn btn-new">
              <span class="post-answer-btn-title">Try the 7-Day Executive Sprint</span>
              <span class="post-answer-btn-subtext">Complimentary guided experience to continue evaluating before committing.</span>
            </button>
          </div>
        `;
      } else {
        html = `
          <div class="trial-banner-title">Your 7-day Executive Sprint has ended.</div>
          <div class="trial-banner-actions">
            <button onclick="window.location.href='${DIGITAL_JD_SPRINT_LINK}'" class="post-answer-btn btn-new">
              <span class="post-answer-btn-title">Try the 7-Day Executive Sprint</span>
              <span class="post-answer-btn-subtext">Complimentary guided experience to continue evaluating before committing.</span>
            </button>
            <button onclick="window.location.href='${DIGITAL_JD_UPGRADE_LINK}'" class="post-answer-btn btn-continue">
              <span class="post-answer-btn-title">Get Full Access to Digital JD</span>
              <span class="post-answer-btn-subtext">Click here, then scroll down to pricing to sign up.</span>
            </button>
          </div>
        `;
      }

      banner.innerHTML = html;
    }

    function renderTrialBannerFromRemainingText(remainingText) {
      const days = getDaysRemainingFromText(remainingText);
      renderTrialBannerFromDays(days);
    }

function stopDictationIfRunning() {
  if (recognition && isListening) {
    recognition.stop();
  }

  isListening = false;
  finalTranscript = '';

  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.innerText = '🎙️ Dictate';
    micBtn.style.background = '#0b1223';
  }
}
    async function sendFinalToBrain(useQuickAnswer, clarificationText = '') { stopDictationIfRunning();
      setBusy(true, useQuickAnswer ? 'Generating quick answer...' : 'Analyzing...');
      removeTransientControls();
      showThinkingIndicator();

      try {
        const finalPrompt = buildFinalPrompt(useQuickAnswer, clarificationText);

        const response = await fetch('./jd-brain.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
        body: JSON.stringify({
  message: finalPrompt,
  trial: DIGITAL_JD_TRIAL_TOKEN,
  user_email: db?.auth ? (await db.auth.getUser()).data?.user?.email || '' : ''
})
        });

        const rawText = await response.text();

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (error) {
          throw new Error('Server returned non-JSON output.');
        }

        removeThinkingIndicator();

        if (!response.ok || !data.success) {
          const rendered = createMessage('system', data.error || 'Something went wrong.');
          scrollBubbleToTop(rendered.row);
          return;
        }

        if (data.trial && data.trial.remaining) {
          renderTrialBannerFromRemainingText(data.trial.remaining);
        }

        intakeState.lastAnswer = data.reply || '';

        const formattedReply = formatReply(data.reply || 'No reply returned.');
        const rendered = createMessage('assistant', formattedReply, true);
        renderPostAnswerButtons(rendered.bubble);
        forceSectionTop(rendered.row);

        intakeState = {
          ...intakeState,
          stage: 'complete',
          clarifyingQuestions: [],
          awaitingClarification: false,
          continuationMode: false
        };
     } catch (error) {
  console.error('sendFinalToBrain error:', error);
  removeThinkingIndicator();
  const rendered = createMessage('system', 'There was a connection error. Please try again.');
  scrollBubbleToTop(rendered.row);
} finally {
        setBusy(false);
      }
    }

    async function sendContinuationToBrain(followUpText) { stopDictationIfRunning();
      setBusy(true, 'Continuing situation...');
      removeTransientControls();
      showThinkingIndicator();

      try {
        const continuationPrompt = buildContinuationPrompt(followUpText);

        const response = await fetch('./jd-brain.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
         body: JSON.stringify({
  message: continuationPrompt,
  trial: DIGITAL_JD_TRIAL_TOKEN,
  user_email: db?.auth ? (await db.auth.getUser()).data?.user?.email || '' : ''
})
        });

        const rawText = await response.text();

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (error) {
          throw new Error('Server returned non-JSON output.');
        }

        removeThinkingIndicator();

        if (!response.ok || !data.success) {
          const rendered = createMessage('system', data.error || 'Something went wrong.');
          scrollBubbleToTop(rendered.row);
          return;
        }

        if (data.trial && data.trial.remaining) {
          renderTrialBannerFromRemainingText(data.trial.remaining);
        }

        intakeState.lastAnswer = data.reply || '';

        const formattedReply = formatReply(data.reply || 'No reply returned.');
        const rendered = createMessage('assistant', formattedReply, true);
        renderPostAnswerButtons(rendered.bubble);
        forceSectionTop(rendered.row);

        intakeState.continuationMode = false;
      } catch (error) {
        removeThinkingIndicator();
        const rendered = createMessage('system', 'There was a connection error. Please try again.');
        scrollBubbleToTop(rendered.row);
      } finally {
        setBusy(false);
      }
    }

    function submitCurrentMessage() {
        stopDictationIfRunning();
      const text = userInput.value.trim();
      if (!text || isBusy) return;
      if (intakeState.stage === 'closed') {
    chatOutput.innerHTML = '';
    intakeState = {
        stage: 'initial',
        originalSituation: '',
        clarifyingQuestions: [],
        awaitingClarification: false,
        continuationMode: false,
        lastAnswer: ''
    };
}
      const renderedUser = createMessage('user', text);
      scrollBubbleToTop(renderedUser.row);

      userInput.value = '';
      userInput.style.height = '160px';

      if (intakeState.continuationMode) {
        sendContinuationToBrain(text);
        return;
      }

      if (intakeState.awaitingClarification) {
        intakeState.awaitingClarification = false;
        sendFinalToBrain(false, text);
        return;
      }

      renderClarifyingStep(text);
    }
let recognition;
let isListening = false;
let committedTranscript = '';;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  var finalTranscript = '';

recognition.onresult = function(event) {
  let finalText = '';
  let interimText = '';

  for (let i = 0; i < event.results.length; i++) {
    const text = event.results[i][0].transcript;

    if (event.results[i].isFinal) {
      finalText += text + ' ';
    } else {
      interimText += text;
    }
  }

  const input = document.getElementById('userInput');
  input.value = (finalText + interimText).replace(/\s+/g, ' ').trimStart();
  input.style.height = '160px';
  input.style.height = Math.min(input.scrollHeight, 340) + 'px';
};

    recognition.onresult = function(event) {
    let interim = '';
    let newFinal = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        newFinal += text + ' ';
      } else {
        interim += text;
      }
    }
    if (newFinal) {
      committedTranscript = (committedTranscript + ' ' + newFinal).replace(/\s+/g, ' ').trim();
    }
    const input = document.getElementById('userInput');
    input.value = (committedTranscript + ' ' + interim).replace(/\s+/g, ' ').trimStart();
    input.style.height = '160px';
    input.style.height = Math.min(input.scrollHeight, 340) + 'px';
  };

  recognition.onend = function() {
    if (isListening) {
      try { recognition.start(); } catch (e) {}
    }
  };

  recognition.onerror = function(event) {
    console.log('Speech recognition error:', event.error);
  };
}

const micBtn = document.getElementById('micBtn');
if (micBtn) {
  micBtn.addEventListener('click', function() {
    if (!recognition) {
      alert('Microphone dictation is not supported in this browser. Try Chrome.');
      return;
    }

    if (!isListening) {
            const cur = document.getElementById('userInput');
      committedTranscript = cur && cur.value ? cur.value.trim() : '';
      recognition.start();
      isListening = true;
      micBtn.innerText = '■ Stop';
      micBtn.style.background = '#7f1d1d';
    } else {
      recognition.stop();
      isListening = false;
      micBtn.innerText = '🎙️ Dictate';
      micBtn.style.background = '#0b1223';
    }
  });
}
    sendBtn.addEventListener('click', submitCurrentMessage);

   userInput.addEventListener('keydown', function (e) {
  // Enter now creates a new line. User submits only by clicking Get Insight.
});

    userInput.addEventListener('input', function () {
      this.style.height = '160px';
      this.style.height = Math.min(this.scrollHeight, 340) + 'px';
    });

    renderTrialBannerFromDays(7);

  
  </script>
<?php endif; ?>

<script>
const SUPABASE_URL = "https://hiejaayyeprfnrrukbam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rds2HjpM6PVVgQVoJ5W8Dg_URB-vraV";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function () {

  // ---- Executive Sprint lifecycle (free, computed from Supabase signup date) ----
  // Day 0-7   : Sprint  -> full Pro access + countdown banner
  // Day 7-37  : Essential (free, reduced features: dictation hidden) + upgrade banner
  // Day 37+   : Locked   -> input disabled + subscribe panel
  const SPRINT_UPGRADE_URL = 'https://digitaljd.org/#pricing';
  const SPRINT_LEN_DAYS = 7;
  const ESSENTIAL_END_DAY = 37; // 7 sprint days + 30 essential days

  function hideSprintBanner() {
    const b = document.getElementById('sprintBanner');
    if (b) b.style.display = 'none';
  }

  function showSprintBanner(html) {
    const b = document.getElementById('sprintBanner');
    if (b) { b.innerHTML = html; b.style.display = 'block'; }
  }

  function sprintEnableInput() {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerText = 'Get Insight';
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
    }
    if (userInput) {
      userInput.disabled = false;
      userInput.placeholder = 'Describe the leadership, communication, decision, or execution situation you want to work through.';
    }
  }

  function sprintLockInput(message) {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerText = 'Subscribe to Continue';
      sendBtn.style.opacity = '0.6';
      sendBtn.style.cursor = 'not-allowed';
    }
    if (userInput) {
      userInput.disabled = true;
      userInput.placeholder = message;
    }
  }

  function sprintBannerHtml(daysLeft) {
    const heading = daysLeft <= 2
      ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your Executive Sprint`
      : `Executive Sprint — ${daysLeft} days remaining`;
    const sub = daysLeft <= 2
      ? 'Most people decide here. Subscribe any time to keep full access.'
      : 'Full access. Test real situations and see how Digital JD thinks with you.';
    return `
      <div style="font-size:18px; font-weight:700; color:#f6d36b; margin-bottom:4px;">${heading}</div>
      <div style="font-size:13px; color:#d7dcec; margin-bottom:${daysLeft <= 2 ? '12px' : '0'};">${sub}</div>
      ${daysLeft <= 2 ? `<button onclick="window.location.href='${SPRINT_UPGRADE_URL}'" style="margin-top:4px; padding:10px 18px; border:none; border-radius:10px; font-weight:700; background:#d4af37; color:#0b1223; cursor:pointer;">Choose a Plan</button>` : ''}
    `;
  }

  function essentialBannerHtml(daysLeft) {
    return `
      <div style="font-size:18px; font-weight:700; color:#f6d36b; margin-bottom:4px;">Essential plan — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left</div>
      <div style="font-size:13px; color:#d7dcec; margin-bottom:12px;">You're on free Essential access (dictation is off). Upgrade any time for full Digital JD.</div>
      <button onclick="window.location.href='${SPRINT_UPGRADE_URL}'" style="padding:10px 18px; border:none; border-radius:10px; font-weight:700; background:#d4af37; color:#0b1223; cursor:pointer;">Upgrade for Full Access</button>
    `;
  }

  function lockedBannerHtml() {
    return `
      <div style="font-size:18px; font-weight:700; color:#f6d36b; margin-bottom:4px;">Your free access has ended</div>
      <div style="font-size:13px; color:#d7dcec; margin-bottom:12px;">Subscribe to continue using Digital JD. You can reactivate instantly at any time.</div>
      <button onclick="window.location.href='${SPRINT_UPGRADE_URL}'" style="padding:10px 18px; border:none; border-radius:10px; font-weight:700; background:#d4af37; color:#0b1223; cursor:pointer;">Subscribe Now</button>
      <div style="font-size:12px; color:#aab2c8; margin-top:10px;">Want this for your team? HR can help bring Digital JD to your organization.</div>
    `;
  }

  // Update the sidebar CTA button text/label for the current stage.
  function setSidebarCta(label) {
    const cta = document.querySelector('.cta-btn.full-btn');
    if (cta) cta.innerText = label;
  }

  // Show or hide the entire input area (prompt, textarea, helper, sidebar buttons).
  function setComposerVisible(visible) {
    const composer = document.querySelector('.composer');
    if (composer) composer.style.display = visible ? '' : 'none';
  }

  function applySprintStage(createdAtIso, systemStatus) {
    const micBtn = document.getElementById('micBtn');
    const created = new Date(createdAtIso).getTime();
    if (!createdAtIso || isNaN(created)) {
      // Fallback: if we can't read the signup date, don't lock anyone out.
      sprintEnableInput();
      hideSprintBanner();
      if (systemStatus) systemStatus.innerText = 'Executive Sprint Active';
      return;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const daysSince = Math.floor((Date.now() - created) / dayMs);

    if (daysSince < SPRINT_LEN_DAYS) {
      const daysLeft = SPRINT_LEN_DAYS - daysSince;
      if (systemStatus) systemStatus.innerText = `Executive Sprint — Day ${daysSince + 1} of 7`;
      setComposerVisible(true);
      sprintEnableInput();
      if (micBtn) micBtn.style.display = '';
      setSidebarCta('Get on board with Digital JD');
      showSprintBanner(sprintBannerHtml(daysLeft));
    } else if (daysSince < ESSENTIAL_END_DAY) {
      const daysLeft = ESSENTIAL_END_DAY - daysSince;
      if (systemStatus) systemStatus.innerText = `Essential Plan — ${daysLeft} days left`;
      setComposerVisible(true);
      sprintEnableInput();
      if (micBtn) micBtn.style.display = 'none'; // reduced features
      setSidebarCta('Get on board with Digital JD');
      showSprintBanner(essentialBannerHtml(daysLeft));
    } else {
      // Locked: hide the entire input area so only the banner shows.
      if (systemStatus) systemStatus.innerText = 'Access Locked';
      setComposerVisible(false);
      showSprintBanner(lockedBannerHtml());
    }
  }

async function restoreSessionOnLoad() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.log('Session restore error:', error.message);
    return;
  }

  if (data && data.session) {
    applyAuthGate(true);
    const authBox = document.querySelector('.auth-box');
    if (authBox) {
      authBox.style.display = 'none';
    }

   const systemStatus = document.getElementById('systemStatus');

if (systemStatus && data?.session?.user?.email) {

  const userEmail = data.session.user.email.toLowerCase();

  const { data: subscriptionData, error: subscriptionError } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_email', userEmail)
    .single();

  const hasActivePaid =
    subscriptionData &&
    !subscriptionError &&
    String(subscriptionData.subscription_status || '').toLowerCase() === 'active' &&
    ['pro', 'core', 'lite'].includes(String(subscriptionData.plan_tier || '').toLowerCase().trim());

  if (hasActivePaid) {

    // Paid subscriber — keep full paid behavior and hide the Sprint banner.
    hideSprintBanner();

    const tier = String(subscriptionData.plan_tier || 'lite').toLowerCase().trim();
    const micBtn = document.getElementById('micBtn');

    if (micBtn && tier === 'lite') {
      micBtn.style.display = 'none';
    }

    if (tier === 'pro') {
      systemStatus.innerText = 'JD Pro Active';
    } else if (tier === 'core') {
      systemStatus.innerText = 'Digital JD Core Active';
    } else if (tier === 'lite') {
      systemStatus.innerText = 'JD Essentials Active';
    } else {
      systemStatus.innerText = 'Subscription Active';
    }

  } else {

    // No active paid subscription — run the free Executive Sprint lifecycle
    // (7-day Sprint -> 30-day Essential -> Locked), anchored to the signup date.
    applySprintStage(data.session.user.created_at, systemStatus);

  }
}
  }
}

function applyAuthGate(isLoggedIn) {
  ['.status-pill', '.chat-wrap', '.input-prompt', '.helper', '.action-column'].forEach(function(sel){
    var el = document.querySelector(sel); if (el) el.style.display = isLoggedIn ? '' : 'none';
  });
  ['userInput','micBtn'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = isLoggedIn ? '' : 'none';
  });
  var authBox = document.querySelector('.auth-box');
  if (authBox) authBox.style.display = isLoggedIn ? 'none' : 'block';
}
applyAuthGate(false);

var manageBtn = document.getElementById('manageSubscriptionBtn');
if (manageBtn) {
  manageBtn.addEventListener('click', function() {
    window.location.href = 'https://digitaljd.org/#pricing';
  });
}
restoreSessionOnLoad();

db.auth.onAuthStateChange((event, session) => {
  if (session) {
    const authBox = document.querySelector('.auth-box');
    if (authBox) {
      authBox.style.display = 'none';
    }
  }
});
document.getElementById('logoutBtn').onclick = async () => {
  await db.auth.signOut();

  const authBox = document.querySelector('.auth-box');
  if (authBox) {
    authBox.style.display = 'block';
  }

  const systemStatus = document.getElementById('systemStatus');
  if (systemStatus) {
    systemStatus.innerText = 'Logged Out';
  }

  window.location.href = 'https://digitaljd.org/jd-demo.php';
};

  document.getElementById('signUpBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const { error } = await db.auth.signUp({ email, password });
    if (error) {
      document.getElementById('authMessage').innerText = error.message;
    } else {
      document.getElementById('authMessage').innerText = "Account created. Redirecting...";
      window.location.href = 'https://digitaljd.org/jd-demo.php';
    }
  };

 document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('authMessage').innerText = error.message;
  } else {
       document.getElementById('authMessage').innerText = "Logged in successfully.";
    window.location.href = 'https://digitaljd.org/jd-demo.php';
  }
};

  document.getElementById('resetBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: "https://digitaljd.org/reset-password.php"
    });
    if (error) {
      document.getElementById('authMessage').innerText = error.message;
    } else {
      document.getElementById('authMessage').innerText = "Password reset email sent.";
    }
  };
});
</script>
</body>
</html>
