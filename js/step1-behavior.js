/**
 * Digital JD — Step 1 behavior layer
 * PURPOSE: Wire functionality WITHOUT changing the approved client-facing
 * visual (sprint-1-situational-analysis.html). No CSS, no page-layout
 * markup — only IDs/data attributes already added to the approved page
 * and runtime-only overlay elements that never touch existing geometry.
 */

(() => {
  'use strict';

  const DEFAULTS = {
    analyzeEndpoint: '/api/situation-analyze',
    finalizeEndpoint: '/api/situation-finalize',
    step2Url: 'sprint-2-choose-level-of-analysis.html',
    homeUrl: 'index.html',
    riskAssessmentUrl: null, // no real Risk Assessment page exists yet — stays visible but inert
    plansUrl: 'index.html#pricing',
    maxClarifyingQuestions: 5,
    draftStorageKey: 'digitalJD.step1.draft',
    caseStorageKey: 'digitalJD.caseFoundation',
    signOut: null,
  };

  const CONFIG = Object.freeze({
    ...DEFAULTS,
    ...(window.DIGITAL_JD_STEP1_CONFIG || {}),
  });

  const byId = (id) => document.getElementById(id);

  function findByText(selector, text) {
    return [...document.querySelectorAll(selector)]
      .find((el) => (el.textContent || '').trim().toLowerCase() === text.toLowerCase()) || null;
  }

  // Existing approved visual elements.
  const els = {
    situationInput: byId('situationInput'),
    charCount: byId('charCount'),
    dictateBtn: byId('dictateBtn'),
    continueBtn: byId('continueBtn'),
    backHomeBtn: byId('backHomeBtn') || document.querySelector('.back-home'),

    homeLink: byId('homeLink') || findByText('.nav-link, a, button', 'Home'),
    riskAssessmentLink: byId('riskAssessmentLink') || findByText('.nav-link, a, button', 'Risk Assessment'),
    sprintActiveBtn: byId('sprintActiveBtn') || findByText('button, .pill', 'Sprint Active'),
    explorePlansBtn: byId('explorePlansBtn') || findByText('button, a, .pill', 'Explore Plans'),
    signOutBtn: byId('signOutBtn') || findByText('button, a, .pill', 'Sign out'),

    stepNodes: [...document.querySelectorAll('.step')],
  };

  const state = {
    latestAnalysis: null,
    dirty: false,
    busy: false,
  };

  function assertRequiredDom() {
    const required = ['situationInput', 'charCount', 'dictateBtn', 'continueBtn'];
    const missing = required.filter((key) => !els[key]);
    if (missing.length) {
      throw new Error(`Step 1 wiring stopped: required approved-page element(s) missing: ${missing.join(', ')}`);
    }
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    els.continueBtn.disabled = isBusy;
    els.dictateBtn.disabled = isBusy;

    if (!els.continueBtn.dataset.originalHtml) {
      els.continueBtn.dataset.originalHtml = els.continueBtn.innerHTML;
    }
    if (!els.dictateBtn.dataset.originalHtml) {
      els.dictateBtn.dataset.originalHtml = els.dictateBtn.innerHTML;
    }

    if (isBusy) {
      els.continueBtn.textContent = 'Digital JD is reviewing your situation...';
    } else {
      els.continueBtn.innerHTML = els.continueBtn.dataset.originalHtml;
      els.dictateBtn.innerHTML = els.dictateBtn.dataset.originalHtml;
    }
  }

  function saveDraft() {
    const draft = {
      originalSituation: els.situationInput.value,
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(CONFIG.draftStorageKey, JSON.stringify(draft));
    state.dirty = false;
  }

  function restoreDraft() {
    const raw = sessionStorage.getItem(CONFIG.draftStorageKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (!els.situationInput.value && draft && draft.originalSituation) {
        els.situationInput.value = String(draft.originalSituation).slice(0, 4000);
        els.charCount.textContent = String(els.situationInput.value.length);
      }
    } catch {
      // Ignore malformed old draft.
    }
  }

  async function getAuthHeader() {
    // Attach the signed-in Supabase session so server endpoints
    // (situation-analyze / situation-finalize) can verify the caller,
    // matching the pattern jd-brain.html already uses.
    if (!window.Auth || !window.Auth.client) return {};
    try {
      const { data } = await window.Auth.client.auth.getSession();
      const token = data && data.session && data.session.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  async function postJson(url, payload) {
    const authHeader = await getAuthHeader();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error((data && data.error) || `Digital JD request failed (${response.status}).`);
    }
    return data || {};
  }

  function normalizeQuestions(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .slice(0, CONFIG.maxClarifyingQuestions)
      .map((q, i) => (typeof q === 'string'
        ? { id: `q${i + 1}`, field: null, question: q }
        : {
          id: q.id || `q${i + 1}`,
          field: q.field || null,
          question: q.question || q.text || '',
        }))
      .filter((q) => q.question.trim());
  }

  /**
   * Runtime-only clarifying overlay. Created at runtime so the approved
   * Step 1 page layout/HTML/CSS remains completely unchanged.
   */
  function askClarifyingQuestions(rawQuestions) {
    const questions = normalizeQuestions(rawQuestions);
    if (!questions.length) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0,7,14,.84)',
        backdropFilter: 'blur(4px)',
      });

      const panel = document.createElement('div');
      Object.assign(panel.style, {
        width: 'min(760px,94vw)',
        maxHeight: '88vh',
        overflowY: 'auto',
        border: '1px solid #d7a000',
        borderRadius: '12px',
        padding: '24px',
        background: 'linear-gradient(180deg,#061422 0%,#03101b 100%)',
        boxShadow: '0 0 0 1px rgba(255,196,0,.14),0 0 28px rgba(255,191,0,.20)',
        color: '#f7f3ea',
        fontFamily: 'Inter,Arial,Helvetica,sans-serif',
      });

      const title = document.createElement('h2');
      title.textContent = 'A Few Clarifying Questions';
      Object.assign(title.style, {
        margin: '0 0 8px',
        color: '#ffc400',
        fontFamily: 'Georgia,"Times New Roman",serif',
        fontSize: '27px',
      });

      const intro = document.createElement('p');
      intro.textContent = 'Digital JD needs a little more information before continuing.';
      Object.assign(intro.style, {
        margin: '0 0 18px',
        color: '#f4f0e8',
        fontSize: '16px',
        lineHeight: '1.45',
      });

      panel.append(title, intro);

      const fields = questions.map((q, index) => {
        const group = document.createElement('div');
        group.style.marginTop = '16px';

        const label = document.createElement('label');
        label.textContent = `${index + 1}. ${q.question}`;
        Object.assign(label.style, {
          display: 'block',
          marginBottom: '8px',
          fontSize: '16px',
          fontWeight: '600',
          lineHeight: '1.35',
        });

        const textarea = document.createElement('textarea');
        textarea.maxLength = 1500;
        textarea.placeholder = 'Your answer...';
        Object.assign(textarea.style, {
          width: '100%',
          minHeight: '92px',
          resize: 'vertical',
          border: '1px solid #3a83d9',
          borderRadius: '8px',
          background: 'linear-gradient(135deg,rgba(8,21,35,.98),rgba(14,31,49,.98))',
          color: '#fff',
          padding: '13px 14px',
          outline: 'none',
          font: 'inherit',
          fontSize: '16px',
          lineHeight: '1.45',
        });

        group.append(label, textarea);
        panel.appendChild(group);

        return { ...q, element: textarea };
      });

      const error = document.createElement('div');
      Object.assign(error.style, {
        display: 'none',
        marginTop: '12px',
        border: '1px solid #c64a43',
        borderRadius: '8px',
        padding: '10px 12px',
        background: 'rgba(93,13,10,.48)',
        color: '#ffd7d4',
        fontSize: '14px',
      });
      panel.appendChild(error);

      const actions = document.createElement('div');
      Object.assign(actions.style, {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '14px',
        marginTop: '22px',
        flexWrap: 'wrap',
      });

      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Back to Situation';
      Object.assign(back.style, {
        minHeight: '52px',
        border: '1px solid #2e8df7',
        borderRadius: '9px',
        padding: '0 20px',
        background: '#06111f',
        color: '#56a9ff',
        font: 'inherit',
        fontWeight: '700',
        cursor: 'pointer',
      });

      const submit = document.createElement('button');
      submit.type = 'button';
      submit.textContent = 'Continue to Choose Your Level of Analysis \u2192';
      Object.assign(submit.style, {
        minHeight: '52px',
        minWidth: '310px',
        border: '3px solid #fff0a2',
        borderRadius: '9px',
        padding: '0 20px',
        background: 'linear-gradient(180deg,#ffd54a 0%,#ffba08 58%,#e59b00 100%)',
        color: '#12100a',
        font: 'inherit',
        fontWeight: '800',
        cursor: 'pointer',
        boxShadow: '0 4px 0 #8c5f00,0 0 0 3px #f7b500,0 0 14px rgba(255,191,0,.65)',
      });

      actions.append(back, submit);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      const priorOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeout(() => fields[0] && fields[0].element.focus(), 50);

      const cleanup = () => {
        document.body.style.overflow = priorOverflow;
        overlay.remove();
      };

      back.addEventListener('click', () => {
        cleanup();
        reject(new Error('__RETURN_TO_SITUATION__'));
      });

      submit.addEventListener('click', () => {
        const answers = fields.map((item) => ({
          questionId: item.id,
          field: item.field,
          question: item.question,
          answer: item.element.value.trim(),
        }));

        if (answers.some((a) => !a.answer)) {
          error.textContent = 'Please answer each clarifying question before continuing.';
          error.style.display = 'block';
          return;
        }

        cleanup();
        resolve(answers);
      });
    });
  }

  async function finalizeCase(clarifyingAnswers) {
    const result = await postJson(CONFIG.finalizeEndpoint, {
      originalSituation: els.situationInput.value.trim(),
      analysis: state.latestAnalysis,
      clarifyingAnswers,
    });

    const caseFoundation = result.caseFoundation || result;
    if (!caseFoundation || typeof caseFoundation !== 'object') {
      throw new Error('Digital JD did not return a valid case record.');
    }

    sessionStorage.setItem(CONFIG.caseStorageKey, JSON.stringify(caseFoundation));
    sessionStorage.removeItem(CONFIG.draftStorageKey);
    location.href = CONFIG.step2Url;
  }

  async function analyzeAndContinue() {
    const originalSituation = els.situationInput.value.trim();

    if (originalSituation.length < 20) {
      alert('Please provide a little more detail about the situation before continuing.');
      els.situationInput.focus();
      return;
    }

    saveDraft();
    setBusy(true);

    try {
      state.latestAnalysis = await postJson(CONFIG.analyzeEndpoint, {
        originalSituation,
        source: 'step-1-situational-analysis',
      });

      let answers = [];
      const questions = normalizeQuestions(state.latestAnalysis.clarifyingQuestions);

      if (questions.length) {
        try {
          answers = await askClarifyingQuestions(questions);
        } catch (error) {
          if (error && error.message === '__RETURN_TO_SITUATION__') {
            els.situationInput.focus();
            return;
          }
          throw error;
        }
      }

      await finalizeCase(answers);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  function wireSimpleNavigation(el, url, label) {
    if (!el) return;
    el.style.cursor = 'pointer'; // does not alter geometry
    el.addEventListener('click', (event) => {
      event.preventDefault();
      if (state.dirty) saveDraft();

      if (!url) {
        console.error(`${label} route is not configured.`);
        alert(`${label} is not connected yet.`);
        return;
      }
      location.href = url;
    });
  }

  function wireRiskAssessment() {
    if (!els.riskAssessmentLink) return;
    if (CONFIG.riskAssessmentUrl) {
      wireSimpleNavigation(els.riskAssessmentLink, CONFIG.riskAssessmentUrl, 'Risk Assessment');
      return;
    }
    // No real Risk Assessment page exists yet. Per product decision: stay
    // visible, but functionally inert (no alert, no navigation).
    els.riskAssessmentLink.setAttribute('aria-disabled', 'true');
    els.riskAssessmentLink.addEventListener('click', (event) => {
      event.preventDefault();
    });
  }

  function wireStepRail() {
    // Step 1 rule: Step 1 = current, Steps 2-9 = visible but locked.
    // No jumping ahead from Step 1. Does not change visible appearance.
    els.stepNodes.forEach((node, index) => {
      const stepNumber = index + 1;
      node.dataset.stepNumber = String(stepNumber);

      if (stepNumber === 1) {
        node.setAttribute('aria-current', 'step');
        return;
      }

      node.setAttribute('aria-disabled', 'true');
      node.title = 'Complete the current step before moving ahead.';
    });
  }

  function wireDictation() {
    els.dictateBtn.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Dictation is not supported in this browser. You can type your situation instead.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const baseText = els.situationInput.value.trim();
      els.dictateBtn.textContent = 'Listening...';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const combined = `${baseText ? `${baseText} ` : ''}${transcript.trim()}`;
        els.situationInput.value = combined.slice(0, 4000);
        els.charCount.textContent = String(els.situationInput.value.length);
        state.dirty = true;
      };

      const restore = () => {
        els.dictateBtn.innerHTML = els.dictateBtn.dataset.originalHtml || '\uD83C\uDFA4 Dictate';
      };
      recognition.onerror = restore;
      recognition.onend = restore;

      recognition.start();
    });
  }

  function wireSignOut() {
    if (!els.signOutBtn) return;

    els.signOutBtn.style.cursor = 'pointer';
    els.signOutBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      if (state.dirty) saveDraft();

      if (typeof CONFIG.signOut !== 'function') {
        console.error('Step 1 signOut function is not configured.');
        alert('Sign out is not connected yet.');
        return;
      }

      try {
        await CONFIG.signOut();
      } catch (error) {
        console.error(error);
        alert('Sign out could not be completed. Please try again.');
      }
    });
  }

  function wireSprintActive() {
    if (!els.sprintActiveBtn) return;
    if (CONFIG.sprintActiveUrl) {
      wireSimpleNavigation(els.sprintActiveBtn, CONFIG.sprintActiveUrl, 'Sprint Active');
    } else {
      els.sprintActiveBtn.setAttribute('aria-label', 'Sprint Active status');
    }
  }

  function initialize() {
    assertRequiredDom();

    if (!els.dictateBtn.dataset.originalHtml) {
      els.dictateBtn.dataset.originalHtml = els.dictateBtn.innerHTML;
    }

    restoreDraft();
    wireStepRail();
    wireDictation();

    els.situationInput.addEventListener('input', () => {
      els.charCount.textContent = String(els.situationInput.value.length);
      state.dirty = true;
    });

    els.situationInput.addEventListener('blur', saveDraft);
    els.continueBtn.addEventListener('click', analyzeAndContinue);

    wireSimpleNavigation(els.homeLink, CONFIG.homeUrl, 'Home');
    wireSimpleNavigation(els.backHomeBtn, CONFIG.homeUrl, 'Back to Home');
    wireRiskAssessment();
    wireSimpleNavigation(els.explorePlansBtn, CONFIG.plansUrl, 'Explore Plans');

    wireSprintActive();
    wireSignOut();

    window.addEventListener('beforeunload', () => {
      if (state.dirty) saveDraft();
    });

    // Readiness marker for sandbox tests.
    window.DIGITAL_JD_STEP1_READY = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
