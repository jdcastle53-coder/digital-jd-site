# Digital JD — Website Migration Documentation

This document is **documentation only**. No changes were made to the live website while producing it. It exists to give a GoHighLevel (GHL) developer everything needed to faithfully reproduce the current public-facing Digital JD pages without needing to reverse-engineer the source code.

| | |
|---|---|
| **Project / repository** | `jdcastle53-coder/digital-jd-site` (public GitHub repo) |
| **Production website URL** | https://digitaljd.org |
| **Documentation generated** | August 18, 2026 |
| **Current production deployment/branch** | `main` (deployed to Vercel; digitaljd.org points at this deployment) |
| **Primary framework** | None — hand-written static HTML/CSS/JavaScript, one file per page. No React, Vue, Next.js, or static-site generator is used for the front end. |
| **Major libraries used** | Tailwind CSS (via CDN, on a subset of pages only — see Section 2), Supabase JS SDK v2 (via CDN, for auth), Google Fonts (webfonts, no build step) |
| **Backend** | Node.js serverless functions under `/api` (deployed as Vercel Functions), not part of the public page rendering itself but called by some pages via `fetch` |
| **Location of public-page source files** | Root of the repository — each public page is a single self-contained `.html` file (inline `<style>` and `<script>`), e.g. `/index.html`, `/contact.html`, `/the-system.html`. There is no `pages/`, `app/`, or `src/` directory for the front end. |

This documentation is fully available in the public GitHub repository — no Vercel project access is required to read it.

---

## 1. Repository & Documentation Access

- Repository: `https://github.com/jdcastle53-coder/digital-jd-site` — confirmed **public**, so this file (and the whole repo) is readable at a plain `github.com` URL without any special permissions.
- This file lives at `/docs/digital-jd-website-migration.md` in that repository.

---

## 2. Architecture of the Existing Public Website

### 2.1 Framework & rendering model
- **No JavaScript framework.** Every public page is a standalone `.html` file containing its own `<style>` block and `<script>` block(s). There is no shared layout component, no templating engine, and no server-side rendering — pages are static files served as-is.
- **Rendering model:** Plain client-side-rendered static HTML. The browser downloads the full HTML document; any dynamic behavior (form submission, modal open/close, chat calls) happens via vanilla JavaScript `fetch()` calls to the `/api/*` serverless functions after the page has loaded. There is no hydration step and no client-side router.
- Some pages duplicate large chunks of markup/CSS from `index.html` (e.g. the header, footer, and color variables), because there is no shared component system. A GHL developer should expect **near-duplicate**, not shared, header/footer markup across pages.

### 2.2 Routing structure
There is no router or rewrite layer for the public marketing pages — each file is served at its own path by filename (Vercel's default static-file serving). Examples:
- `/` and `/index.html` → home page
- `/contact.html` → contact page
- `/the-system.html` → "The System" explainer page
- `/demo.html` → free live demo
- `/digitaljd-vs-ai.html` → comparison page
- `/privacy.html`, `/terms.html` → legal pages
- `/signin.html`, `/reset-password.html` → auth pages (Supabase-backed)
- `/success.html`, `/cancel.html`, `/expired.html` → Stripe checkout / trial-expiration landing pages
- `/welcome-sprint.html`, `/welcome-membership.html` → post-signup welcome pages
- `/jd-brain.html` → the logged-in application itself (see Section 2.7 — out of scope for a marketing-only GHL migration, but documented for completeness)

`vercel.json` contains no `rewrites` or `redirects` — the only configuration in it applies to how the Vercel Function for `/api/jd-brain-gateway.js` bundles its `data/` folder. Routing is otherwise Vercel's default static-file behavior.

### 2.3 Major reusable "components"
None exist as actual code-level components. The following pieces of markup are **visually consistent** across most of the dark-themed pages but are copy-pasted into each file rather than shared:
- Top navigation bar (logo + "Intelligent Leadership System" wordmark + Home/Login/Start Sprint or Back links)
- Footer (© line, "Leadership Intelligence System — Not a coaching product" tagline, Privacy/Terms/Contact links)
- Pricing tier "card" markup (four cards: Essentials, Pro, Executive, Enterprise) — appears only on `index.html`
- Modal dialog markup (`.modal-overlay` / `.modal`) — appears only on `index.html`, used for three different modals (see Section 5)

### 2.4 CSS / styling approach
No CSS framework, preprocessor, or bundler for the dark-themed marketing pages — plain hand-written CSS inside a `<style>` tag in each file's `<head>`, using CSS custom properties (`:root { --variable: value; }`) for the color palette. See Section 4 for the full palette breakdown.

**Important inconsistency to be aware of:** a *second, unrelated* styling approach is used on a handful of pages that load the **Tailwind CSS CDN script** (`<script src="https://cdn.tailwindcss.com"></script>`) instead of hand-written CSS: `demo.html`, `digitaljd-vs-ai.html`, `success.html`, and `cancel.html`. These pages also use a **light background** theme (`bg-slate-50`), which visually breaks from the dark navy/gold theme used everywhere else on the site. A GHL developer should treat these as a distinct, lower-fidelity "utility" page style rather than the site's primary design language — see Section 4.1 for exact colors used on each.

### 2.5 Fonts
Three different font pairings are in use across the site (not one unified type system):

| Page group | Fonts loaded | Source |
|---|---|---|
| `index.html`, `contact.html`, `the-system.html`, `signin.html` | Cormorant Garamond (weights 300/400/600/700), Barlow (300/400/500/600), Barlow Condensed (400/600/700) | Google Fonts CDN |
| `privacy.html`, `terms.html` | Cormorant Garamond (300/400/600/700), Barlow (300/400/500/600) — no Barlow Condensed | Google Fonts CDN |
| `reset-password.html`, `expired.html` | Space Grotesk (400/500/600/700), Newsreader (weights 500/700, variable optical size) | Google Fonts CDN |
| `welcome-sprint.html`, `welcome-membership.html`, `jd-brain.html` | Georgia / "Times New Roman" (system serif fallback stack — no webfont loaded) | System fonts only |
| `demo.html`, `digitaljd-vs-ai.html`, `success.html`, `cancel.html` | Tailwind's default sans-serif stack (no custom webfont) | Tailwind CDN default |

General usage pattern on the primary theme: **Cormorant Garamond** for large display headlines, **Barlow** for body copy, **Barlow Condensed** (uppercase, letter-spaced) for nav links, eyebrow labels, and buttons.

### 2.6 JavaScript dependencies & third-party libraries
- **Supabase JS SDK v2** — loaded via `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">` on auth-related pages (`signin.html`, `reset-password.html`) and referenced in the shared `/auth.js` file. Used purely for authentication (email/password sign-in, sign-up, password reset, session retrieval) — no other Supabase product (database queries, storage) is called from the public pages.
- **Tailwind CSS CDN** — loaded on `demo.html`, `digitaljd-vs-ai.html`, `success.html`, `cancel.html` only (see 2.4).
- No other third-party JS libraries (no jQuery, no animation libraries, no carousel libraries, no chart libraries).
- All other interactivity (modals, form validation, the free chat demo, mobile menu behavior, scroll-triggered fade-in animations via `IntersectionObserver`) is hand-written vanilla JavaScript embedded directly in each page's `<script>` block.

### 2.7 Backend / API endpoints called from public pages
These are Vercel serverless functions (Node.js) in `/api`. They are **not** part of the public page rendering itself, but several public pages call them via `fetch()`:

| Endpoint | Called from | Purpose |
|---|---|---|
| `/api/create-checkout.js` | `index.html` pricing buttons (via inline JS) | Creates a Stripe Checkout session for the selected plan |
| `/api/create-portal.js` | `jd-brain.html` (logged-in app) | Opens the Stripe customer billing portal |
| `/api/stripe-webhook.js` | Called by Stripe, not by the browser | Listens for `checkout.session.completed`; provisions/upgrades the Supabase user account after payment |
| `/api/jd-brain-gateway.js` | `demo.html` (free demo) and `jd-brain.html` (logged-in app) | Server-side OpenAI-backed leadership advice engine; on `demo.html` it is called anonymously/rate-limited, on `jd-brain.html` it requires a Supabase session |

**Not part of the GHL scope**, but relevant context: `jd-brain.html` is the actual logged-in product (an AI leadership-advisor chat interface). It sits behind Supabase authentication and calls `/api/jd-brain-gateway.js` for every response. GHL cannot host this — per the existing target architecture, Vercel remains the home for all authenticated/programmatic functionality, and GHL is being adopted for the marketing pages only.

### 2.8 Third-party embedded services
- **Calendly** — `contact.html` links out to `https://calendly.com/jdcastle` (a plain link, opens Calendly's own hosted page — **not** an embedded/iframe widget).
- **Supabase Auth** — see 2.6.
- **Stripe Checkout / Billing Portal** — public pages never embed Stripe UI directly; they call the two `/api/create-*` functions, which redirect the browser to Stripe-hosted checkout/portal pages.

### 2.9 Analytics / tracking scripts
**None found.** No Google Analytics, Google Tag Manager, Meta/Facebook Pixel, Hotjar, Segment, Mixpanel, Microsoft Clarity, or any other analytics/tracking script exists on any current page. If analytics are desired on the new GHL pages, this will need to be added net-new — there is nothing to migrate.

### 2.10 Forms
There is **no traditional lead-capture `<form>` anywhere on the marketing pages.** Specifically:
- `contact.html` has **no `<form>` element at all** — "contacting" happens via three `mailto:` links (support@digitaljd.org, sales@digitaljd.org, comments@digitaljd.org) and one external link to Calendly.
- The only real `<form>` elements on the whole site are the Supabase-backed **sign-in/sign-up form** on `signin.html` and the **new-password form** on `reset-password.html` — both authentication forms, not marketing lead forms.
- `index.html`'s "Executive Sprint" modal (`#sprintModal`) contains a name + email capture UI, but it is built from plain `<input>` fields inside a `<div class="modal-form">`, not a `<form>` tag — submission is handled entirely by JavaScript calling Supabase's sign-up API directly, with no traditional form POST.

### 2.11 External APIs
| API | Called from | Purpose |
|---|---|---|
| OpenAI API | `/api/jd-brain-gateway.js` (server-side only) | Generates the leadership-advice text shown on `demo.html` and `jd-brain.html` |
| Semantic Scholar API (`api.semanticscholar.org`) | `/api/jd-brain-gateway.js` (server-side only) | Looks up supporting research citations for advice responses |
| Stripe API | `/api/create-checkout.js`, `/api/create-portal.js`, `/api/stripe-webhook.js` (server-side only) | Checkout sessions, billing portal, subscription webhooks |
| Supabase Auth API | Browser-side, via the Supabase JS SDK | Sign-up, sign-in, password reset, session retrieval |
| Upstash Redis (KV) REST API | `/api/jd-brain-gateway.js` (server-side only) | Rate-limiting the free demo and the logged-in chat |

### 2.12 Environment variables (names and purpose only — no values)
| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Auth for the OpenAI API calls that generate advice responses |
| `SUPABASE_URL` | Supabase project URL (server-side calls) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin access (used by the Stripe webhook to create/upgrade user accounts after payment) |
| `STRIPE_SECRET_KEY` | Server-side Stripe API authentication |
| `STRIPE_ACCESS_TOKEN` | Used by Stripe-related tooling/MCP access |
| `STRIPE_WEBHOOK_SECRET` | Verifies that incoming webhook requests genuinely originated from Stripe |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis REST endpoint + auth, used for rate limiting |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key (safe for client-side use) |

A Supabase project URL and a Supabase **anon** key are also hardcoded directly in `/auth.js` (not read from an environment variable). By Supabase's own design the anon key is meant to be public/client-exposed and is safe to ship in browser JavaScript — but for a GHL migration this means the new marketing site will need its own copy of that same project URL + anon key wired into any auth-related JavaScript it uses (e.g. for the sign-in link out to Vercel), since GHL will not have access to the Vercel project's environment variables.

---

## 3. Complete Page Inventory

For each page: Page Name, Public URL, Source File, and a top-to-bottom content breakdown. Exact copy is quoted from the live source so it can be reused verbatim.

> **Note on scope:** `jd-brain.html` (the logged-in AI advisor app), `success.html`/`cancel.html`/`expired.html` (Stripe/trial redirect landings), and `welcome-sprint.html`/`welcome-membership.html` (post-payment welcome pages) are included below for completeness, but most of them are **not marketing pages a visitor lands on organically** — they're transactional/behind-auth pages. The pages a GHL developer should prioritize for pixel-accurate reproduction are **`index.html`, `contact.html`, `the-system.html`, `digitaljd-vs-ai.html`, and `demo.html`**.

### 3.1 Home Page
- **Public URL:** `https://digitaljd.org/` (and `/index.html`)
- **Source file:** `/index.html` (2,353 lines — largest page on the site by far; contains the pricing tiers, comparison section, "System" teaser, Executive Sprint pitch, and three modals)
- **Function:** Primary marketing/landing page. Explains the product, contrasts it against generic AI and human coaching, presents the "Executive Sprint" free-trial offer, and lists all four pricing tiers.

**Top-to-bottom breakdown:**
1. **Navigation/Header** (`<nav>`, sticky): Logo image (`digital-jd-logo.png`) + three-line wordmark "Intelligent / Leadership / System". Nav links: `Home` (`#hero`), `Why Digital JD` (`#difference`), `The System` (`/the-system.html`), `Executive Sprint` (`#sprint`), `Access Tiers` (`#pricing`), `Login` (opens login modal / links to `signin.html`), and a gold "Start Sprint" button (`#sprint`).
2. **Hero section** (`id="hero"`): Small eyebrow label "Leadership Intelligence System". Primary headline (H1): **"The Way Executives Think Has Changed."** ("Think" is styled in italic/accent color.) Sub-line: "Executive Clarity : On Demand". Supporting paragraph: *"Digital JD is not a chatbot. It is a structured leadership intelligence system built on decades of executive leadership research — engineered to deliver situational clarity, strategic insight, and executable decisions when it matters most."* Secondary line: *"Your 7-day Executive Sprint is complimentary. No card. No commitment."* Two CTA buttons: **"Your Sprint Starts Now →"** (primary, gold) and **"Learn the system"** (secondary, outline). Micro-copy under CTAs: "No card. No contract. No commitment. Just clarity." A full-bleed background photo is applied here (see Section 4.4 — loaded from an external Unsplash URL, not a local file). A 4-column stat strip follows: "7 / Full Days Free / FREE / No Card Required", "3 / Reasoning Rules / Applied to Every Situation", "6 / Reasoning Chains / Cross-Author Logic Paths", "55 / Expert Concepts / From 10 Leadership Authorities". Below that, a "3 Output Dimensions" callout listing "Situational Analysis / Strategic Comments / Executive Recommendations", and a credential badge: "🎓 Ph.D. / Organizational Leadership / ✓ Peer-Reviewed Research / ✓ Validated Frameworks".
3. **"The Distinction" section** (`id="difference"`): Eyebrow "The Distinction". H2: **"They Answer Questions. Digital JD Changes How You Think."** Intro paragraph about testing "every major AI platform." Then a 3-column comparison grid (stacks to 1 column on mobile):
   - **"Other AI Platforms"** — *"Trained on everything. Accountable to nothing."* Bullet-style copy about pulling from "billions of internet sources." A "COMPARE WITH OTHER AIs" link opens the comparison-matrix modal.
   - **"Digital JD"** — *"Built on one framework. Accountable to your outcome."* Copy about peer-reviewed sourcing and a "same three-part output every time."
   - **"Human Executive Coaching"** — *"Powerful — but limited by time and access."* Copy about "$500–$1,000 per hour" and being "relationship-dependent."
   A pull-quote follows: *"Valuable advice is validated information processed through wisdom and applied for your specific situation." — Dr. JD Castle*
4. **"The System" teaser section** (`id="what"`): Eyebrow "The System". H2: **"Not just a Tool. A Thinking System."** Paragraph copy about executives operating "under pressure without a structured framework," and how Digital JD's response structure is "situational analysis first, strategic insight second, clear execution plan third." CTA link: **"View the System Map →"** (goes to `/the-system.html`). A numbered 5-item list (styled 01–05, not a literal ordered sequence in the visual sense — see Design Guidelines note): "01 Clarity Before Action", "02 Communication Excellence", "03 Decision Discipline", "04 Human Dynamics", "05 Practical Execution" — each with a one-sentence description. Side label: "Executive Clarity : On Demand".
5. **"Executive Sprint" section** (`id="sprint"`): Eyebrow "How It Works". H2: **"The Executive Sprint."** Intro paragraph about not needing to "commit before you understand what you're buying." Three-stage layout: "Days 1–7 / Full System Access" (description of unrestricted access), "Day 7 — Your Moment of Clarity / Still Waiting?" (copy about "JD Essentials" as a fallback tier), "The Final Day / The System Goes Quiet" (copy about the 30-day Essentials window ending). Followed by a features list styled as checkmarks: "Full Digital JD — unrestricted analytical depth", "Situational analysis on any leadership challenge", "Strategic insight drawn from your actual context", "Execution plans built for your real-world deployment", "Grounded in Dr. JD Castle's Ph.D-level organizational research", "Available on desktop and mobile." Primary CTA: **"Your Sprint Starts Now →"** (opens the Sprint signup modal).
6. **Pricing section** (`id="pricing"`) — Eyebrow "Access Structure". H2: **"Built for Sustained Executive Performance."** Four tier cards side by side on desktop, stacking to one column on mobile (see Section 4.5 for exact breakpoint behavior). Exact copy for all four tiers:
   - **Essentials** — "For Individual Leaders" / "Digital JD Essentials" / "Executive Clarity on Demand". Feature list: "Identify the Real Challenge", "PhD-Level Leadership Thinking", "Turn Insight into Action", "Personalized to Your Situation", "Confident Leadership Decisions". Price: **$199/month** or **$1,990/year (save $398)**. CTA: **"Start Building Clarity"**. Bottom link: "Leading a team? Explore Enterprise →" (links to `/contact.html`).
   - **Pro** — badge "Most Popular", a floating gold "★ First 50 members — Lifetime $99" founding-member pill. "For Executive Decision Making" / "Digital JD Pro" / "Complete Executive Decision Support". Feature list: "Alternative Courses of Action", "Risk & Consequence Analysis", "Stakeholder Impact", "Communication Strategy", "Implementation Roadmap", "90-Day Success Plan". Price: **$399/month** or **$3,990/year (save $798)**. CTA: **"Upgrade Your Decisions"**. Same bottom "Explore Enterprise" link.
   - **Executive** — "For Senior Executives" / "Digital JD Executive" / "Your Executive Leadership Advisor". Feature list: "Leadership Risk Assessment", "Blind Spot Analysis", "Executive Strategy Sessions", "Leadership Network Access", "Executive Dashboard", "White-Glove Support". Price: **$899/month** or **$8,990/year (save $1,798)**. Note line: *"Human executive coaching runs $500–$1,000 per hour. This is the alternative."* CTA: **"Lead at the Highest Level"**. Same bottom "Explore Enterprise" link.
   - **Enterprise** — "For Organizations" / "Digital JD Enterprise" / "One Leadership System. One Organization." Feature list: "Organization-Wide Deployment", "Executive Team Alignment", "Common Leadership Framework", "Department Integration", "Enterprise Knowledge Base", "Custom AI Deployment". Copy: *"Built for executive teams, departments, and organizations ready for transformation."* CTA: **"Transform Your Organization"** (links to `/contact.html`). This card has no price and no bottom "Explore Enterprise" link (it IS Enterprise).
   Repeated pull-quote after the pricing grid (same Dr. Castle quote as section 3).
7. **Final CTA section:** H2: **"Start Your Executive Sprint Now"**. Sub-line: "Totally Free for Seven Days." Button: **"Start Your Executive Sprint →"**. Micro-copy: "No Commitment · No Credit Card · No Contract".
8. **Footer:** "© 2025 Digital JD · digitaljd.org". Tagline: *"Leadership Intelligence System — Not a coaching product."* Links: Privacy, Terms, Contact.
9. **Modals (not part of the linear page flow, but part of the page's markup):**
   - **Sprint signup modal** (`#sprintModal`): Eyebrow "Executive Sprint — 7 Days Full Access". H2 "Begin Your Sprint". Copy: *"Enter your name and email. You will receive immediate access to the full Digital JD system — no credit card, no commitment."* Name + email inputs. Button: **"Activate Full Access →"**. Success state: "✓ You're in." / "Check your email for access instructions. Your Sprint clock starts on first login." / "Access activates immediately. Sprint clock begins on first login."
   - **Login modal** (`#loginModal`): H2 "Welcome Back". Copy: "Log in to continue your Digital JD session." Includes a "Forgot Password?" link and a "Login" button.
   - **Comparison matrix modal** (`#comparisonMatrixModal`): Displays the `/images/comparison-matrix.png` image full-size.

### 3.2 Contact Page
- **Public URL:** `https://digitaljd.org/contact.html`
- **Source file:** `/contact.html` (421 lines)
- **Function:** Contact/support routing page. No lead-capture form — routes visitors to one of three mailto addresses, a Calendly link, or a direct email to Dr. Castle.

**Top-to-bottom breakdown:**
1. **Header:** Logo + wordmark (same as home page), a **"← Back to Pricing"** link (goes to `/index.html#pricing`).
2. **Page title:** Small label "Contact Us". H1: **"Let's Have a Dialogue"**. Supporting text: *"Whether you're exploring enterprise deployment, need support, or simply want to share your thoughts — we're here and listening."*
3. **Three contact-routing cards:**
   - **Support** — "Support — support@digitaljd.org". Copy: *"Questions about your account, access, or the system? Our support team will help you get back on track."* Mailto link: `support@digitaljd.org`.
   - **Sales** — "Sales — sales@digitaljd.org". Copy: *"Interested in Enterprise deployment for your team, department, or organization? Let's talk."* Mailto link: `sales@digitaljd.org`.
   - **Comments** — "Comments — comments@digitaljd.org". Copy: *"Have feedback, ideas, or thoughts to share? We read every message and value your perspective."* Mailto link: `comments@digitaljd.org`.
4. **"Speak Directly With Dr. JD Castle" section:** Intro line: "If your matter is best handled personally." H2: **"Dr. JD Castle"**. Copy: *"For leadership strategy, enterprise deployment, or organizational alignment that the teams above can't resolve, you can reach Dr. Castle directly."* Two CTAs: **"Schedule a Video Call"** (external link to `https://calendly.com/jdcastle`) and **"Send an Email"** (mailto link with a pre-filled subject line).
5. **Footer:** Identical to the home page footer.

### 3.3 The System Page
- **Public URL:** `https://digitaljd.org/the-system.html`
- **Source file:** `/the-system.html` (188 lines)
- **Function:** Single-purpose visual explainer page showing the "System Map" diagram referenced from the home page's "View the System Map →" link.

**Top-to-bottom breakdown:**
1. **Header:** Simple bar with **"← Back to Digital JD"** link (to `/index.html#what`) and a small "Executive Clarity : On Demand" label.
2. **Page label:** "The System". H1: **"Not just a Tool. A Thinking System."** Supporting copy: *"A proven progression that turns insight into impact — the same structured cycle behind every response Digital JD delivers."*
3. **Main content:** A large image, `/images/system-map.png`, displayed as the page's centerpiece (no additional text sections below it in the current implementation).
4. **No footer content beyond the header bar.**

### 3.4 DigitalJD vs. AI Comparison Page
- **Public URL:** `https://digitaljd.org/digitaljd-vs-ai.html`
- **Source file:** `/digitaljd-vs-ai.html` (132 lines)
- **Function:** Side-by-side comparison of a sample leadership question answered by three generic AI tools versus Digital JD, to argue Digital JD's differentiation.
- **Note:** This page uses the light Tailwind theme (see Section 2.4), not the site's primary dark theme, and its header/nav markup is explicitly commented in the source as *"copied from index.html to keep consistent navigation"* — but it links to `#how`/`#faq` anchors that do not exist on this page (they only exist conceptually on `index.html`), and its "Login" flow points to `https://digitaljd.org/signin.html` as an absolute URL rather than a relative one. A GHL developer should not assume this page's nav links resolve correctly as-is.

**Top-to-bottom breakdown:**
1. **Header:** Logo (`images/ai-jd-logo.png` — **note:** this exact filename does not exist in the repository's `images/` folder; see Section 4.4) + "Digital JD" wordmark. Nav: "How it helps" (`#how`), "Pricing" (`#pricing`), "JD Brain" (`jd-brain.html`), "FAQ" (`#faq`), "Compare" (`/digitaljd-vs-ai.html`). CTA button: **"Get started"** (links to `signin.html`).
2. **Hero:** H1: **"Why DigitalJD Delivers Beyond AI"**. Sub-line: *"Real questions. Real leadership intelligence — not just answers, but transformation."*
3. **"The Question" section:** H2 "The Question". A quoted sample prompt: *"I have two employees showing friction. What's my path forward to resolve this and build a stronger relationship?"* Framing line: *"The source of your answer determines whether you get information — or transformation."*
4. **"Comparison Results" section:** H2 "Comparison Results". Four side-by-side response cards, each with a model name (H3) and its simulated answer plus a ✅/❌ verdict line:
   - **Gemini (Google)** — practical but "surface-level HR advice."
   - **Cirrus (Search Aggregator)** — a numbered list, described as feeling "like a search-result."
   - **ChatGPT (Generic GPT-4)** — "structured and thoughtful" but "still neutral."
   - **DigitalJD (Leadership-Grade Intelligence)** — longer, more narrative answer ("You're not managing a conflict — you're sculpting trust...") with a fully positive ✅/✅ verdict.
5. **"What Makes DigitalJD Different" comparison table (H4):** Three-row trait table: "Voice — Conversational, executive, human"; "Depth — Rooted in leadership psychology and trust dynamics"; "Context — Reads emotional subtext and organizational patterns." A **"See pricing"** link sits alongside this section.
6. **Closing CTA:** H3 **"Experience the Difference"**. Copy: *"Ask your toughest leadership question and feel how DigitalJD transforms answers into action."* Button: **"Try DigitalJD Now"** (links to `jd-brain.html`).
7. **Footer:** "Digital JD" wordmark, "© Digital JD. All rights reserved.", links: Terms, Privacy, Support (mailto to a placeholder `hello@your-domain.com` address — **not a real address**, flagged in Section 5).

### 3.5 Free Live Demo Page
- **Public URL:** `https://digitaljd.org/demo.html`
- **Source file:** `/demo.html` (278 lines)
- **Function:** No-signup-required interactive demo. Visitor types a leadership question, JavaScript calls `/api/jd-brain-gateway.js`, and the response renders as three cards.
- **Note:** Also uses the light Tailwind theme, not the primary dark theme.

**Top-to-bottom breakdown:**
1. **Header:** Logo (`../images/ai-jd-logo.png` — same missing-file issue as 3.4) + "Digital JD" wordmark, and a **"Back to site"** link (`/`).
2. **Intro:** Small pill label "Free Live Demo". H1: **"Ask Digital JD anything"**. Supporting copy: *"Describe a leadership challenge and get a structured response: a Situational Analysis, JD's Comment, and a clear Action Plan. No sign-up required."*
3. **Input card:** Label "Your question", a `<textarea>`, a "Dictate" voice-input button (uses the browser's Web Speech API — no external service), and a **"Get Digital JD's Insight"** submit button. While waiting, a "Digital JD is thinking..." status with animated dots displays.
4. **Result cards (rendered dynamically after submission):** Three labeled cards — "Situational Analysis", "JD's Comment", "Action Plan" — each populated with text returned from the gateway API.
5. **Closing CTA line:** *"Want the full experience with saved history and the Executive Sprint?"* Link: **"See Access Tiers"** (`/#pricing`).
6. **No footer beyond the header.**

### 3.6 Sign In Page
- **Public URL:** `https://digitaljd.org/signin.html`
- **Source file:** `/signin.html` (356 lines)
- **Function:** Supabase-backed sign-in / sign-up form. On successful sign-in, JavaScript redirects the user to `jd-brain.html` (the logged-in app — this file IS the effective "dashboard," there is no separate dashboard page).

**Top-to-bottom breakdown:**
1. **Header:** Logo + "Digital JD" link back to `/`.
2. **H1:** **"Welcome back to Digital JD"**. **H2:** "Sign in or create an account".
3. **Form:** Email + password fields, a submit button, a mode-toggle between "sign in" and "create account," and a "Forgot password?" link (routes into the Supabase password-reset flow, landing on `reset-password.html`).

### 3.7 Reset Password Page
- **Public URL:** `https://digitaljd.org/reset-password.html`
- **Source file:** `/reset-password.html` (136 lines)
- **Function:** Landing page for Supabase's password-recovery email link; lets the user set a new password.
- **Note:** Uses the third, light "ink/mist/sea/sage/sand" theme with Space Grotesk + Newsreader fonts — visually distinct from both the primary dark theme and the Tailwind utility pages.

**Top-to-bottom breakdown:**
1. Logo + "Digital JD" link.
2. **H1: "Set a new password."**
3. **Form:** New-password + confirm-password fields and a submit button.

### 3.8 Access Expired Page
- **Public URL:** `https://digitaljd.org/expired.html`
- **Source file:** `/expired.html` (43 lines — smallest page on the site)
- **Function:** Shown when a user's 7-day free trial has ended.
- **Note:** Same light "ink/mist" + Space Grotesk/Newsreader theme as `reset-password.html`.

**Top-to-bottom breakdown:**
1. **H1: "Your 7-day trial has ended."**
2. Two links: **"View plans"** (`/`) and **"Contact support"** (mailto to the same placeholder `hello@your-domain.com` address flagged in Section 5).

### 3.9 Post-Payment Welcome Pages
- **Public URLs:** `https://digitaljd.org/welcome-sprint.html` and `https://digitaljd.org/welcome-membership.html`
- **Source files:** `/welcome-sprint.html` (359 lines), `/welcome-membership.html` (357 lines) — near-identical structure, different copy
- **Function:** Landing pages shown immediately after a visitor confirms their free Sprint sign-up (`welcome-sprint.html`) or after a paid Membership checkout completes (`welcome-membership.html`).
- **Note:** Both use a fourth distinct color theme — navy/cream/gold with Georgia serif type — matching neither the primary dark theme nor the Tailwind utility pages.

**Top-to-bottom breakdown (both pages share this structure):**
1. Logo + wordmark.
2. Large label: **"EXECUTIVE SPRINT"** (sprint page) or **"MEMBERSHIP"** (membership page).
3. **"WELCOME"** heading (H3) with a personalized greeting.
4. **"ONE PROMISE"** section (H3) — a short statement of what the user can expect.
5. CTA button: **"START YOUR SPRINT NOW"** (sprint page) or **"START YOUR MEMBERSHIP"** (membership page) — both link to `jd-brain.html`.

### 3.10 Checkout Result Pages
- **Public URLs:** `https://digitaljd.org/success.html`, `https://digitaljd.org/cancel.html`
- **Source files:** `/success.html`, `/cancel.html` (short files, both under 20 lines of body content)
- **Function:** Stripe Checkout's `success_url` / `cancel_url` redirect targets.
- **Note:** Both use the Tailwind CDN light theme.

**`success.html`:** H1 "Payment received." Copy: *"Thanks for joining Digital JD Membership."* / *"A receipt is on its way. Check your email for a confirmation link — that's what sets up your account and unlocks your dashboard."* Button: **"Back to home"** (`/`).

**`cancel.html`:** H1 "No worries." Copy: *"Your Stripe checkout was canceled. You weren't charged."* Button: **"Return to site"** (`/`).

### 3.11 Legal Pages
- **Public URLs:** `https://digitaljd.org/privacy.html`, `https://digitaljd.org/terms.html`
- **Source files:** `/privacy.html` (105 lines), `/terms.html` (102 lines)
- **Function:** Standard legal boilerplate.

**Privacy Policy** — H1 "Privacy Policy", followed by H2 sections: "Introduction", "Information We Collect", "How We Use Your Information", "Data Security", "Your Rights", "Contact Us". Single "← Back to Home" link at the top.

**Terms of Service** — H1 "Terms of Service", followed by numbered H2 sections: "1. Acceptance of Terms" through "8. Contact" ("2. Description of Service", "3. User Accounts", "4. Subscription and Payment", "5. Intellectual Property", "6. Limitation of Liability", "7. Changes to Terms" in between). Same "← Back to Home" link.

### 3.12 The Logged-In App (out of GHL scope, documented for completeness)
- **Public URL:** `https://digitaljd.org/jd-brain.html`
- **Source file:** `/jd-brain.html` (1,293 lines)
- **Function:** The actual AI leadership-advisor chat product. Requires a Supabase session (unauthenticated visitors are effectively blocked from using it, though the HTML shell itself loads). This is the destination after sign-in and after both welcome pages — it is the site's de facto "dashboard." It has its own separate color theme (`--bg`, `--panel`, `--border`, `--text`, `--gold`, etc. — a dark blue/gold app UI, distinct from the marketing site's navy/cyan/gold theme) and is **not** part of the marketing-page migration to GHL per the existing target architecture (GHL = marketing only; Vercel remains the home for anything programmatic).

---

## 4. Visual Design Documentation

### 4.1 Color palettes (four distinct palettes are in active use — this is a real inconsistency, not a simplification on this document's part)

**Primary theme** (`index.html`, `contact.html`, `the-system.html`, `signin.html`; a trimmed-down version on `privacy.html`/`terms.html`):
| Variable | Value | Used for |
|---|---|---|
| `--black` | `#040608` | Page background |
| `--navy` | `#070d1a` | Secondary/panel backgrounds |
| `--deep` | `#0a1628` | Card/section backgrounds |
| `--cyan` | `#00b4d8` | Links, secondary accents, borders |
| `--cyan-bright` | `#00e5ff` | Hover states, bright accents |
| `--white` | `#f0f4f8` | Primary text |
| `--white-dim` | `rgba(240,244,248,0.85)` | Secondary/body text |
| `--white-faint` | `rgba(240,244,248,0.08)` | Faint borders/dividers |
| `--gold` | `#c9a84c` | Primary CTA buttons, headline accents, pricing highlights |
| `--gold-dim` | `rgba(201,168,76,0.2)` | Gold-tinted backgrounds/glows |
| `--gold-bright` (signin.html only) | `#f6d36b` | Brighter gold accent variant |

**Tailwind utility pages** (`demo.html`, `digitaljd-vs-ai.html`, `success.html`, `cancel.html`) — light theme, mostly Tailwind's default slate palette (`bg-slate-50`, `text-slate-900`, `text-slate-600`/`700`, `border-slate-200`) plus one custom variable:
| Variable | Value | Used for |
|---|---|---|
| `--accent-blue` | `#0b3b66` (demo.html) / `rgba(11,59,102,0.95)` (digitaljd-vs-ai.html) | Result-card headings, small accent details |

**Auth/utility theme** (`reset-password.html`, `expired.html`):
| Variable | Value | Used for |
|---|---|---|
| `--ink` | `#0b3b66` | Primary text/headings |
| `--mist` | `#f3f7fb` | Page background (reset-password.html) |
| `--clay` | `#f7efe6` | Page background (expired.html) |
| `--sea` | `#0ea5e9` | Accent/links |
| `--sage` | `#22c55e` | Success states |
| `--sand` | `#f6f2ea` | Card backgrounds |
| `--leaf` | `#22c55e` (expired.html) | Success accent |

**Welcome-page theme** (`welcome-sprint.html`, `welcome-membership.html`):
| Variable | Value | Used for |
|---|---|---|
| `--navy` | `#050c22` | Page background |
| `--cream` | `#f7f1e3` | Primary text/cards |
| `--gold` | `#b8860a` | Accents |
| `--gold-bright` | `#ffc700` | Bright accent |
| `--gold-soft` | `#ffe066` | Soft gold accent |
| `--ink` | `#1a1a1a` | Dark text on light backgrounds |

**The logged-in app** (`jd-brain.html`) uses yet another palette (`--bg: #0f172a`, `--panel: #111c34`, `--border: rgba(255,255,255,0.08)`, `--text: #e2e8f0`, `--muted: #9fb0cc`, `--gold: #d4af37`, `--input: #0b1223`) — out of GHL scope but noted for completeness.

### 4.2 Typography
See Section 2.5 for the full font breakdown by page. On the primary theme, headline type is `Cormorant Garamond` (a high-contrast serif) at large sizes for H1/H2, `Barlow` (a humanist sans) for body copy at regular weight, and `Barlow Condensed` (a condensed sans, typically uppercased with wide letter-spacing) for nav links, eyebrow labels, and button text.

### 4.3 Layout metrics (primary theme, `index.html`)
- **Content max-widths in use:** 1500px (hero/full-bleed sections), 1340px, 1100px (most common — used for the main content container in several sections), 1000px, 900px, 820px, 768px, 640px, 600px, 560px, 480px, 430px, 320px, 300px. There is **no single consistent max-width** applied site-wide — different sections use different container widths.
- **Section vertical padding:** `7rem 0` (112px top and bottom) is the standard default for `<section>` elements at desktop width.
- **Grid layouts used:** `grid-template-columns: repeat(4, 1fr)` (the hero stat strip and the "Output Dimensions" area), `grid-template-columns: 1fr 1fr` (a couple of two-column feature comparisons). The pricing tier grid (`.tiers-grid`) is its own custom grid definition (not a simple `repeat()`).
- **Breakpoints used:** `900px`, `768px`, `640px`, `600px`, `430px`. At `768px` and below, most multi-column grids collapse; the pricing `.tiers-grid` explicitly becomes a single column (`grid-template-columns: 1fr`) at `768px`, and the hero stat grid drops to 2 columns at that same breakpoint.
- **Cards:** Pricing tier cards, comparison cards, and feature cards all use a bordered/rounded box with generous internal padding — exact per-component padding values vary and are not standardized into a single spacing scale.

### 4.4 Image inventory
| File | Location | Used on | Notes |
|---|---|---|---|
| `digital-jd-logo.png` | Repository root | `index.html`, `contact.html`, `signin.html`, `welcome-sprint.html`, `welcome-membership.html` (as `digital-jd-logo.png`, relative to root) | Primary logo, ~263 KB |
| `digital-jd-head-icon.png` | `/images/` | Not confirmed as referenced by any current page — appears to be a spare/unused asset | ~218 KB |
| `icon-star-gold.png` | `/images/` | Not confirmed as referenced by any current page — appears to be a spare/unused asset | ~770 KB |
| `comparison-matrix.png` | `/images/` | `index.html` (inside the `#comparisonMatrixModal` modal) | ~2 MB — large file, should be optimized on rebuild |
| `system-map.png` | `/images/` | `the-system.html` (the entire content of the page) | ~2.3 MB — large file, should be optimized on rebuild |
| **`ai-jd-logo.png`** | Referenced as `images/ai-jd-logo.png` (and `../images/ai-jd-logo.png`) | `demo.html`, `digitaljd-vs-ai.html`, `reset-password.html` | **This file does not exist anywhere in the repository.** These three pages currently show a broken image (though `demo.html`'s `<img>` tag has an `onerror` handler that hides it gracefully; the other two do not). See Section 5. |
| *(external, not local)* Hero background photo | `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1800&q=80` | `index.html` hero section background-image | Loaded live from Unsplash's CDN, not stored in this repository — will need to be downloaded and re-hosted for the GHL migration since GHL will not have access to this exact remote URL's continued availability. |

### 4.5 Responsive behavior — desktop vs. mobile
- **Navigation:** Collapses to a simplified/stacked layout below `768px` (exact mobile nav pattern varies slightly per page since there's no shared header component — see Section 2.3).
- **Hero:** Large display headline scales down via `clamp()`-style or media-query font-size overrides below `768px`; the 4-column stat strip becomes 2 columns at `768px`.
- **"The Distinction" 3-column comparison:** Collapses to a single stacked column below `768px`.
- **Pricing tiers (`.tiers-grid`):** 4 cards side-by-side on desktop → single column, stacked, below `768px`. The Pro card's floating "founding member" gold pill also repositions at `640px` to sit fully above the card (avoiding overlap with the "Most Popular" badge).
- **General pattern:** Nearly every multi-column section on `index.html` has an explicit `768px` (tablet) and/or `430px`/`600px`/`640px` (phone) override — there is no single unified breakpoint system, so a GHL developer should expect to re-verify each section's mobile behavior individually rather than assuming one global mobile layout rule applies everywhere.

---

## 5. Interactive Elements, External Links, and SEO/Meta Data

### 5.1 Interactive elements
- **Modals:** Three on `index.html` — the Sprint signup modal, the Login modal, and the Comparison Matrix image modal (see Section 3.1, item 9). No modals exist on any other public page.
- **Forms:** Only `signin.html` (sign-in/sign-up) and `reset-password.html` (new password) contain real `<form>` elements. No other page has a `<form>`.
- **Buttons:** Every CTA on every page is a styled `<a>` or `<button>` — none use a custom web component.
- **Navigation menus:** Simple horizontal link lists; no dropdown/flyout submenus exist anywhere on the site.
- **Accordions:** None found on any page.
- **Carousels:** None found on any page.
- **Animations:** `index.html` uses CSS `@keyframes` for a slow background zoom (`slowZoom`), a subtle grid-line pulse (`gridPulse`), a button pulse (`btnPulse`), and a fade-up entrance (`fadeUp`) — the fade-up entrance is triggered by a single `IntersectionObserver` that reveals sections as the user scrolls. No other page uses scroll-triggered animation.
- **Embedded content:** None (no YouTube/Vimeo embeds, no embedded maps, no embedded social widgets). The Calendly link on `contact.html` is an outbound link, not an embed.
- **Voice input:** `demo.html` includes a "Dictate" button using the browser's native Web Speech API (no external voice service).

### 5.2 External links (leaving the Digital JD domain)
| Destination | Found on | Purpose |
|---|---|---|
| `https://calendly.com/jdcastle` | `contact.html` | Book a call with Dr. Castle |
| `mailto:support@digitaljd.org`, `mailto:sales@digitaljd.org`, `mailto:comments@digitaljd.org` | `contact.html` | Email routing |
| `mailto:jd@comcastle.com?subject=...` | `contact.html` | Direct email to Dr. Castle |
| `mailto:hello@your-domain.com` | `digitaljd-vs-ai.html`, `expired.html` | **Placeholder address — not a real, monitored inbox.** Flagged below. |
| `https://digitaljd.org/signin.html` (absolute, not relative) | `digitaljd-vs-ai.html` | "Get started" CTA |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Most pages | Webfont delivery |
| `cdn.jsdelivr.net` (Supabase SDK) | `signin.html`, `reset-password.html`, `auth.js` | Supabase JS library |
| `cdn.tailwindcss.com` | `demo.html`, `digitaljd-vs-ai.html`, `success.html`, `cancel.html` | Tailwind CSS |
| `images.unsplash.com` | `index.html` (hero background, via CSS) | Stock photo, loaded live (not local) |

### 5.3 Meta description, canonical URL, Open Graph, favicon, schema markup
This is a significant gap across the entire site — documented plainly rather than glossed over:
- **Meta descriptions:** Present on most pages (`contact.html`, `signin.html`, `welcome-sprint.html`, `jd-brain.html`, `expired.html`, `welcome-membership.html`, `reset-password.html`, `digitaljd-vs-ai.html`, `demo.html`). **Missing entirely** on `index.html` (the home page — the single most important page for SEO has no meta description), `the-system.html`, `privacy.html`, `terms.html`, `success.html`, and `cancel.html`.
- **Canonical URLs:** **None found on any page, site-wide.**
- **Open Graph / Twitter Card data:** **None found on any page, site-wide** — no `og:title`, `og:description`, `og:image`, or Twitter Card tags exist anywhere. Sharing any page on social media currently produces no rich preview.
- **Favicon:** Most pages use a placeholder empty-image data URI (`<link rel="icon" href="data:;base64,iVBORw0KGgo=" />`) — effectively **no real favicon is set**. `index.html` doesn't declare a favicon `<link>` at all.
- **Schema.org / structured data (JSON-LD):** **None found on any page, site-wide.**

A GHL developer/marketer should treat SEO metadata as something to be **created fresh** for every page during the migration, not "carried over," since there is very little to carry over.

---

## 6. Notes for the GoHighLevel Developer — Things to Pay Special Attention To

1. **There is no single design system to copy from one place.** Four distinct color/font themes exist across the current public-facing pages (see Section 4.1). Confirm with the site owner which theme should become the canonical one going forward — do not assume `index.html`'s theme should simply be reused for every page as-is, since several pages (legal pages, auth pages, welcome pages) were intentionally or unintentionally built differently.
2. **Two pages reference a logo file (`images/ai-jd-logo.png`) that does not exist in the repository** (`demo.html`, `digitaljd-vs-ai.html`, plus `reset-password.html`). Use `digital-jd-logo.png` (the file that does exist, at the repo root) as the actual logo source when rebuilding these pages, rather than trying to track down a file that was never committed.
3. **`contact.html` has no lead-capture form** — it is intentionally mailto-link + Calendly-link based. If GHL's own form/workflow tooling is meant to replace this with a real form, that is a **new feature decision**, not a like-for-like migration — flag it to the site owner rather than assuming.
4. **The placeholder email `hello@your-domain.com`** appears live on two pages (`digitaljd-vs-ai.html` footer, `expired.html` support link). This is almost certainly an unfinished placeholder that was never replaced with a real address — confirm the correct address with the site owner before reproducing it.
5. **`digitaljd-vs-ai.html`'s nav bar links to `#how` and `#faq` anchors that don't exist on that page** (they appear to have been copy-pasted from `index.html`'s planned structure, which itself doesn't have `id="how"` or `id="faq"` either). Don't reproduce these as literal working anchors without first deciding what content they should actually point to.
6. **The hero background photo on the home page is loaded live from Unsplash**, not stored in this repository. It should be downloaded and re-hosted (in GHL's own asset library) rather than left pointing at an external, unlicensed-for-this-use URL.
7. **No page currently has SEO essentials** (meta description on several pages, canonical URLs, Open Graph tags, real favicon, or structured data anywhere). This is a clean-slate opportunity during the GHL rebuild, not something to "migrate as-is."
8. **The pricing copy and dollar amounts in Section 3.1 are the current live numbers** ($199/$399/$899 monthly; annual equivalents with stated savings; the Pro tier's "First 50 members — Lifetime $99" founding-member offer). Confirm with the site owner whether these are still the intended live prices at the time GHL implementation begins, since pricing is the kind of content most likely to have changed between this document's generation date and actual migration work.
9. **`jd-brain.html` (the logged-in AI product) is intentionally out of scope for GHL** and should stay hosted on Vercel per the already-decided target architecture (GHL = marketing only, Vercel = all authenticated/programmatic functionality). Any "Login," "Start Sprint," or post-payment CTA on the new GHL pages should link **out** to the existing Vercel-hosted app/auth pages rather than attempting to rebuild sign-in, checkout, or the chat interface inside GHL itself.
10. **Nothing on the current site has analytics or tracking installed** (Section 2.9). If conversion tracking matters for the GHL relaunch, that instrumentation needs to be planned as new work, not assumed to already exist somewhere to copy.
