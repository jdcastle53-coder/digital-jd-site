# Bluehost Retrieval Checklist

**Purpose:** A complete, itemized checklist of every file, directory, and hidden
location that must be pulled (downloaded/backed up) from Bluehost **before** any
migration or teardown. The goal is a full, faithful capture of the live hosting
account so nothing load-bearing or historical is lost.

**Companion documents (same branch):**
- `docs/BLUEHOST_DISCOVERY_ANALYSIS.md` — full dependency inventory
- `docs/BLUEHOST_MIGRATION_EXECUTIVE_SUMMARY.md` — plain-language summary + objective

**Status:** Discovery/checklist only. No production code, PHP, Supabase, Stripe,
auth, trial, or AI functionality was modified in producing this document.

> **Golden rule:** Capture *everything* first, sort it *later*. It is far cheaper
> to download extra files you end up not needing than to discover a missing
> dependency after Bluehost is gone. Do a full account backup **and** a targeted
> file pull, so you have both.

---

## 0. Before You Start — Recommended Capture Methods

Use **all three** where possible, for redundancy:

- [ ] **cPanel → Backup → "Download a Full Account Backup"** (captures home dir,
      databases, email, DNS zones, cron jobs, settings). This is the single most
      complete artifact — get it first.
- [ ] **FTP/SFTP full mirror** (e.g. FileZilla) of the entire home directory with
      "show hidden files" enabled — see Section 5.
- [ ] **cPanel → File Manager** with **Settings → "Show Hidden Files (dotfiles)"**
      enabled, for spot verification and grabbing individual dotfiles.
- [ ] Record a **directory listing** (screenshot or text) of every folder before
      download, so you can verify the pull was complete afterward.

> Note: an FTP mirror alone will **not** capture MySQL databases or email — the
> full cPanel account backup is required for those.

---

## 1. Full Web Root

- [ ] `/public_html/` — the primary web root, captured **recursively** (all files
      and all subdirectories).
- [ ] Everything served at the domain apex (whatever loads at `digitaljd.org/`).
- [ ] `index.*` entry files (`index.php`, `index.html`) at the web root.
- [ ] `.htaccess` at the web root (**hidden** — governs redirects, HTTPS, rewrites,
      PHP handlers; easy to miss and often critical).
- [ ] `php.ini` / `.user.ini` if present (PHP config overrides — **hidden**).
- [ ] `robots.txt`, `sitemap.xml`, `favicon.ico`, and any verification files
      (Google/Bing site-verification `.html` or `.txt`).

## 2. Digital JD Document Root

Capture the exact directory that serves `digitaljd.org`. It may be `public_html/`
itself, or a subfolder, or an addon-domain folder (see Section 6). Confirm which.

Known Digital JD files to verify are present in the pull (from code analysis):

- [ ] `jd-demo.php` — the live app (already have a copy in the repo; grab the
      **server** copy too, in case it differs).
- [ ] **`jd-access.php`** — trial/access gate. **Referenced by `jd-demo.php` but
      NOT in the repo.** Exists only on Bluehost. **HIGH PRIORITY.**
- [ ] **`jd-brain.php`** — the AI gateway the app POSTs to. **Not in the repo.**
      Exists only on Bluehost. **HIGH PRIORITY** (a text copy was pasted in chat,
      but pull the authoritative server file).
- [ ] **`reset-password.php`** — Supabase password-reset target. **Not in the
      repo.** Exists only on Bluehost. **HIGH PRIORITY.**
- [ ] All marketing/content HTML: `index.html`, `contact.html`, `demo.html`,
      `jd-brain.html`, `signin.html`, `digitaljd-vs-ai.html`, and any siblings.
- [ ] `auth.js` and any other presentation/logic JS served here.
- [ ] All images, fonts, CSS, and asset folders referenced by those pages.
- [ ] Any `config`, `secrets`, `keys`, `.env`, or credentials files living in the
      doc root (**hidden or oddly named** — search carefully; these hold API keys).

## 3. Hidden Files (dotfiles) — Enable "Show Hidden Files"

These are invisible by default and are the most commonly lost items:

- [ ] `.htaccess` (every directory — there can be more than one).
- [ ] `.user.ini` / `php.ini`
- [ ] `.env`, `.env.*` (environment/API keys)
- [ ] `.well-known/` (SSL/ACME, Apple/Google domain association files)
- [ ] `.ftpquota`, `.bash_history`, `.bashrc`, `.cpanel/`, `.htpasswd`
- [ ] `.git/`, `.gitignore`, `.svn/` (if any version control was used on-server)
- [ ] Any other dotfile or dotfolder anywhere in the home directory.

## 4. Subdirectories (recursive, under every root)

- [ ] Every nested folder under `public_html/` and every domain root — pulled
      recursively, preserving structure.
- [ ] `assets/`, `images/`, `img/`, `css/`, `js/`, `fonts/`, `uploads/`,
      `media/`, `downloads/`, `docs/`, `pdf/` — any content/asset directories.
- [ ] `includes/`, `inc/`, `lib/`, `vendor/`, `api/`, `cgi-bin/` — any code or
      library directories (may contain shared PHP includes or dependencies).
- [ ] `wp-content/`, `wp-includes/`, `wp-admin/` **only if** any WordPress install
      lives on this account (e.g. the Comcastle-style site) — capture fully if so.

## 5. Full Home Directory (above the web root)

Files above `public_html/` are never served publicly but often hold the real
secrets and config. Do a complete pull of the home directory:

- [ ] `/home/<cpanel-user>/` captured recursively (the FTP root usually lands
      here, one level above `public_html`).
- [ ] `mail/` and `etc/` (email accounts and mail config) — or rely on the full
      cPanel backup for these.
- [ ] `ssl/`, `.well-known/`, and any certificate/private-key files.
- [ ] `logs/` and `access-logs/` (historical traffic/error logs, if you want them).
- [ ] `tmp/` at the home level (see Section 11).
- [ ] Any credentials or `.env`-style files stored outside the web root.

## 6. Addon Domains

- [ ] In **cPanel → Domains**, list **every** addon domain on the account.
- [ ] For each addon domain, capture its document root (often
      `public_html/<addondomain>/` or a sibling folder) recursively.
- [ ] Note the **domain → folder mapping** for each (needed to rebuild hosting
      elsewhere and to repoint DNS correctly).
- [ ] Confirm whether **Comcastle / comcastle.com** is an addon domain on this
      same account — if so, capture it fully (including its WordPress install).

## 7. Subdomains

- [ ] In **cPanel → Subdomains**, list **every** subdomain (e.g. `app.`, `dev.`,
      `staging.`, `test.`, `beta.`, `old.`, `mail.`, `cpanel.`, `webmail.`).
- [ ] Capture each subdomain's document root recursively.
- [ ] Record the **subdomain → folder mapping** for each.
- [ ] Pay special attention to any subdomain that runs a **copy of the app** or an
      older brain/access gateway.

## 8. Staging Folders

- [ ] Any `staging/`, `stage/`, `_staging/` directories.
- [ ] WordPress/Softaculous staging installs (often under a hidden or hashed
      folder name, or a `staging.` subdomain).
- [ ] Any folder that mirrors the live app for pre-release testing.

## 9. Test Folders

- [ ] `test/`, `tests/`, `_test/`, `testing/`, `sandbox/`, `demo/`, `tmp-test/`.
- [ ] One-off test scripts at the web root (e.g. `test.php`, `phpinfo.php`,
      `info.php`, `test-brain.php`, `test-checkout.php`) — capture **and** note
      them, since leftover `phpinfo`/test files are also a security cleanup item.

## 10. Backup Folders

- [ ] `backup/`, `backups/`, `bak/`, `_bak/`, `old-backup/`.
- [ ] `.zip`, `.tar`, `.tar.gz`, `.gz`, `.sql`, `.sql.gz` archive files anywhere
      in the account (manual backups people leave in the web root).
- [ ] cPanel-generated backup files (`backup-*.tar.gz`) in the home directory.
- [ ] Any dated backup folders (e.g. `public_html-2024/`, `site-backup-0625/`).

## 11. Archive Folders

- [ ] `archive/`, `archives/`, `_archive/`, `old/`, `old-site/`, `previous/`.
- [ ] Compressed archives not already caught in Section 10.
- [ ] Any "do not delete" / "keep" folders (people stash originals here).

## 12. Temporary Files

- [ ] `tmp/`, `temp/`, `.tmp/`, `cache/`, `.cache/` directories.
- [ ] Editor/OS junk: `*.swp`, `*.swo`, `*~`, `.DS_Store`, `Thumbs.db`,
      `desktop.ini`.
- [ ] Session files, upload temp files, and any `*.tmp` scattered in the tree.
      (Capture for completeness even if most are discardable.)

## 13. Renamed / Legacy Files

Legacy copies are the highest risk of hidden dependencies. Known examples from
your prior cleanup + likely patterns to hunt for:

- [ ] `jd-demo-BACKUP.php` (the one safety copy you kept).
- [ ] Any of the previously-seen copies still lingering:
      `jd-demo (1).php`, `jd-demo-old.php`, `jd-demo-old 2`,
      `jd-demo before UI 2026-6-24`, `jd-demo working May 2`,
      `jd-demo May 16`, `jd-demo-backup.php`.
- [ ] Renamed variants of the **brain/access** files:
      `jd-brain-old.php`, `jd-brain.bak`, `jd-brain.php.txt`,
      `jd-access-old.php`, `jd-access.bak`.
- [ ] Any file with suffixes: `*-old`, `*-bak`, `*-backup`, `*-copy`, `*-final`,
      `*-v1/v2`, `* (1)`, dated names (`*-YYYY-MM-DD`, `*MMDD`), or `.txt`
      appended to a code file.
- [ ] `.orig`, `.save`, `.new`, `.prev` variants left by editors or WP updates.

## 14. Old Application Versions

- [ ] Prior versions of `jd-demo.php` (the legacy PHP app) — all copies.
- [ ] Any earlier standalone app folder (e.g. `app-old/`, `jd-v1/`, `beta/`).
- [ ] Older `jd-brain*.php` / `jd-access*.php` implementations.
- [ ] Any earlier marketing site version superseded by the current `index.html`.
- [ ] Legacy Stripe/checkout scripts if an older PHP-based checkout ever existed.

---

## 15. Non-File Account Data (capture via full cPanel backup)

Not "files" in the web root, but essential to a complete migration and easy to
forget:

- [ ] **MySQL/MariaDB databases** + DB users (via cPanel backup or phpMyAdmin
      export) — confirm whether Digital JD uses any (auth is Supabase, but a
      local DB may still exist for the legacy app or WordPress).
- [ ] **Email accounts** and their stored mail.
- [ ] **DNS zone file** for each domain (the authoritative record set).
- [ ] **Cron jobs** (scheduled tasks).
- [ ] **SSL certificates** and private keys.
- [ ] **cPanel settings**: redirects, MIME types, error pages, IP blocks,
      hotlink protection, PHP version selections per domain.

---

## 16. Verification (after the pull)

- [ ] Re-list every domain/subdomain root and confirm file counts match the
      pre-download listing (Section 0).
- [ ] Confirm the three HIGH PRIORITY files are captured and non-empty:
      `jd-access.php`, `jd-brain.php`, `reset-password.php`.
- [ ] Confirm hidden files (`.htaccess`, `.env`, `.well-known/`) are present in
      the local copy (they are the most commonly missed).
- [ ] Store the full backup in **two** locations (local + cloud) before any
      teardown.

---

## Open Questions for the Owner

1. Is **Comcastle/comcastle.com** on the **same** Bluehost account as Digital JD,
   or a separate account/host? (Determines whether it's in this same pull.)
2. Are there any **addon domains or subdomains** you already know about
   (e.g. `app.digitaljd.org`, `staging.`, `old.`) that must be captured?
3. Do you have **cPanel access** to run a full account backup, or only
   FTP/File-Manager access? (Affects whether we can capture databases/email.)
4. Do you know of any **database** used by the legacy app, or is all state in
   Supabase + Stripe?
