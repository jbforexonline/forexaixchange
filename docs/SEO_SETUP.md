# SEO & Indexing Setup (ForexAiXchange)

Production domain: **https://forexaiexchange.com**

This document describes what was added for production-ready SEO and how to validate it. Auth flows are unchanged (all redirects remain client-side in `RoleBasedLayout`).

---

## What Was Added / Changed

### A) Crawlability

1. **`/robots.txt`**  
   - Implemented via **App Router** metadata: `frontend/src/app/robots.ts`.  
   - Served as plain text at `https://forexaiexchange.com/robots.txt`.  
   - No redirect to login; allowlist in middleware (see below) ensures these paths are never redirected if you add auth middleware later.

2. **`/sitemap.xml`**  
   - Implemented via **App Router** metadata: `frontend/src/app/sitemap.ts`.  
   - Contains **only public marketing/legal pages**: `/`, `/terms`, `/privacy`.  
   - Base URL is `https://forexaiexchange.com` (not onrender.com).  
   - Private/auth routes (e.g. `/login`, `/dashboard`, `/admin`, `/api/*`) are excluded.

3. **Middleware allowlist**  
   - File: `frontend/src/middleware.ts`.  
   - Currently: sets `X-Robots-Tag: noindex, nofollow` when the request host ends with `.onrender.com` (so the Render subdomain is not indexed).  
   - Exports `SEO_ALLOWLIST_PATHS` and `isAllowlisted()` so that **if you later add middleware that redirects unauthenticated users**, you can bypass redirects for:
     - `/robots.txt`, `/sitemap.xml`, `/sitemap-*.xml`
     - `/favicon.ico`, `/manifest.json`, `/site.webmanifest`, `/og.png`, `/apple-touch-icon.png`, `/image/logo.png`, `/image/logo.svg`
     - `/_next/*` and static assets
     - `/`, `/terms`, `/privacy` (public landing/legal pages)

### B) SEO Tags

4. **Router**: **App Router** (`frontend/src/app/`).

5. **Global metadata** (`frontend/src/app/layout.tsx`):  
   - `metadataBase`: `https://forexaiexchange.com` (used for canonical and OG URLs).  
   - Title template: `%s | ForexAiXchange`.  
   - Default title/description, robots (index, follow), Open Graph, Twitter card.  
   - Icons: `/favicon.ico`, `/image/logo.png`; manifest: `/site.webmanifest`.

6. **Landing page** (`frontend/src/app/page.tsx`):  
   - Page-specific title/description targeting long-tail keywords (e.g. "forex gamification platform", "forex trading game", "AI forex platform", "forex simulation game").  
   - Canonical: `https://forexaiexchange.com`.  
   - Open Graph and Twitter metadata.  
   - No fake awards, rankings, or reviews.

### C) Duplicate Content (onrender.com)

7. **Render subdomain**:  
   - Middleware checks `Host`. If it ends with `.onrender.com`, the response includes:
     - `X-Robots-Tag: noindex, nofollow`  
   - Canonicals on all pages point to `https://forexaiexchange.com/...` via `metadataBase` and page-level `alternates.canonical`.

### D) Structured Data (JSON-LD)

8. **Landing page** (`frontend/src/app/page.tsx`):  
   - **Organization** schema: name ForexAiXchange, url `https://forexaiexchange.com`, logo from `/image/logo.png`.  
   - **WebSite** schema with same name/url/description and optional SearchAction.  
   - No fake ratings or reviews.

### E) Assets

9. **Favicon**: `frontend/src/app/favicon.ico` is served at `/favicon.ico` by Next.js.  
10. **OG image**: Metadata uses `/image/logo.png`. You can add a dedicated `frontend/public/og.png` (e.g. 1200×630) and switch metadata to `/og.png` for better social previews.  
11. **Manifest**: `frontend/public/site.webmanifest` (name, short_name, icons, theme_color). Referenced in root layout as `/site.webmanifest`.

### F) Sitemap Generation

12. **Approach**: Next.js built-in **App Router** metadata:  
    - `frontend/src/app/robots.ts` → `/robots.txt`  
    - `frontend/src/app/sitemap.ts` → `/sitemap.xml`  
    No `next-sitemap` or custom API route; stable on Render.

---

## Where Things Live

| Item            | Location |
|-----------------|----------|
| robots.txt      | Generated from `frontend/src/app/robots.ts` |
| sitemap.xml     | Generated from `frontend/src/app/sitemap.ts` |
| Middleware      | `frontend/src/middleware.ts` |
| Global metadata | `frontend/src/app/layout.tsx` |
| Landing SEO + JSON-LD | `frontend/src/app/page.tsx` |
| Terms/Privacy canonicals | `frontend/src/app/terms/layout.tsx`, `frontend/src/app/privacy/layout.tsx` |
| Web manifest    | `frontend/public/site.webmanifest` |

---

## Manual Steps (Google Search Console)

1. **Add property**  
   - Add `https://forexaiexchange.com` as a property (domain or URL prefix).

2. **Submit sitemap**  
   - Sitemap URL: `https://forexaiexchange.com/sitemap.xml`  
   - In Search Console: Sitemaps → Add a new sitemap → enter `sitemap.xml`.

3. **Request indexing** (optional)  
   - URL Inspection → enter `https://forexaiexchange.com` → Request indexing.

4. **Verify**  
   - Ensure no critical crawl errors and that the main landing page is indexed.

---

## How to Validate

Open these URLs (production) and check as below:

| URL | What to check |
|-----|----------------|
| https://forexaiexchange.com/robots.txt | Plain text; no redirect to login; contains `Sitemap: https://forexaiexchange.com/sitemap.xml` and allow/disallow rules. |
| https://forexaiexchange.com/sitemap.xml | XML sitemap; only public pages (/, /terms, /privacy); URLs use `https://forexaiexchange.com`. |
| https://forexaiexchange.com | View page source: `<title>`, `<meta name="description">`, `<link rel="canonical" href="https://forexaiexchange.com/">`, Open Graph and Twitter meta tags, and a `<script type="application/ld+json">` with Organization and WebSite schema. |

**On Render subdomain** (e.g. `https://<your-app>.onrender.com`):

- Response headers should include: `X-Robots-Tag: noindex, nofollow`.  
- Page source should still show canonical pointing to `https://forexaiexchange.com/...`.

---

## Quick Validation Checklist

- [ ] **https://forexaiexchange.com/robots.txt** — plain text, no redirect, includes Sitemap line  
- [ ] **https://forexaiexchange.com/sitemap.xml** — XML, public pages only, forexaiexchange.com base URL  
- [ ] **https://forexaiexchange.com** — view-source has title, meta description, canonical, OG/Twitter tags, JSON-LD  
- [ ] **Render host** — response header `X-Robots-Tag: noindex, nofollow`  
- [ ] **Auth** — login/dashboard flows still work; no new redirects for logged-in or logged-out users
