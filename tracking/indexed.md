# Tracking health — cigarsforyou.com.au

Search Console checklist below was checked 5 Oct 2026 (UTC+11). Property: `sc-domain:cigarsforyou.com.au`. Setup: [config.md](config.md). Events: [tracking.md](tracking.md).

Initial crawl and content inventory, same day: [seo-crawl.md](seo-crawl.md), [seo-inventory.md](seo-inventory.md), [seo-inventory.csv](seo-inventory.csv).

## Google Analytics 4 — how it runs

Checked in code and a production build on 5 Oct 2026 (UTC+11). Measurement ID `G-SRZFLMB8X7`.

1. The browser loads one Google tag from root `index.html`. The first `gtag('config', …)` sets `send_page_view: false`, so the tag does not emit its own page view.
2. After React Router is ready, `AnalyticsRouteListener` applies `?internal` / `?ga_debug` cookies, strips those parameters, and sends a single `page_view` for the storefront path.
3. Route changes send another `page_view`. `/admin` and `/admin/*` send none.
4. Shopping, lead, and engagement code calls `src/lib/analytics.ts`, which pushes the same measurement ID through `gtag('event', …)`.
5. When `cfy_ga_internal=1`, each event includes `traffic_type=internal`. When `cfy_ga_debug=1`, each event includes `debug_mode=true` and shows in DebugView.

```text
page load → gtag config (no page_view) → SPA page_view → ecommerce / lead / engagement events
```

### What Realtime and DebugView should show

| Journey | Events |
|---------|--------|
| Open the homepage | one `page_view` for `/` (not two) |
| Accept or decline the age gate | `age_gate_accept` or `age_gate_decline` |
| Open a catalogue | `view_item_list` |
| Open a product | `select_item`, then `view_item` |
| Add or remove a cart line | `add_to_cart` or `remove_from_cart` |
| Open the cart | `view_cart` |
| Continue to delivery details | `begin_checkout` |
| Continue after delivery details | `add_shipping_info`, then `/checkout` |
| Paid checkout screen (payments off) | `checkout_unavailable_view` — no `purchase` |
| Rewards checkout screen | `add_payment_info` (`checkout_type=rewards`) |
| Reward order actually placed | one `purchase` with that `transaction_id` |
| Contact / partnerships form success | `generate_lead` or `b2b_enquiry` |
| Staff browser after `?internal=1` | `traffic_type=internal` on later hits |

`purchase.value` for a rewards order is the AUD shipping amount. Points are sent as `points_redeemed`, not as revenue. Paid `purchase` events stay absent until `trackPaidPurchase()` runs on a real successful payment.

### Validation on 5 Oct 2026

| Check | Result |
|-------|--------|
| One Google tag in `dist/index.html` | Pass — single snippet, `send_page_view: false` |
| `public/index.html` did not replace the app shell | Pass — built file is the Vite storefront |
| Bundle contains measurement ID and one `page_view` event name | Pass |
| `gtag/js?id=G-SRZFLMB8X7` | HTTP 200 |
| `tsc -b` | Pass |
| Admin routes skip `page_view` | Pass in code (`pathname` starts with `/admin`) |
| Live DebugView / Realtime in the GA4 UI | Not run in this change — use `?ga_debug=1` and the journey table above |
| GA4 internal-traffic filter set to Active | Manual Admin step; not confirmed from the repo |
| GA4 ↔ Search Console product link | Manual Admin step; not confirmed from the repo |

## Search Console checklist

| # | Check | Result |
|---|--------|--------|
| 1 | Domain property | Pass |
| 2 | XML sitemap | Submitted (processing) |
| 3 | Crawling / indexation | Partial — homepage only |
| 4 | Initial indexing | Partial — homepage indexed; other priority URLs unknown |
| 5 | Core Web Vitals | Lab only — no field data yet |
| 6 | HTTPS | Apex pass; `www` certificate fails |
| 7 | Manual actions | Not available via API |
| 8 | Security issues | Not available via API |
| 9 | Structured data | None detected |
| 10 | Canonicalisation | Homepage canonical is the apex URL; no HTML canonical tags |
| 11 | Priority URL inspection | See table below |
| 12 | Performance data | API works; zero rows so far |

## 1. Domain property

`sites.list` returns one property:

- `sc-domain:cigarsforyou.com.au` — `siteOwner`

## 2. XML sitemap

Live files (hosting deploy 5 Oct 2026, afternoon):

- `https://cigarsforyou.com.au/robots.txt` — `text/plain`, points at the sitemap, disallows account/checkout/admin paths, and disallows `search`, `brand`, and `category` query URLs
- `https://cigarsforyou.com.au/sitemap.xml` — `application/xml`, **106 URLs**. Includes core pages, brand categories that have products, active products, and published news. Omits empty brands (Bolivar, Trinidad), `/cigarettes`, and `/accessories`. Catalog and news URLs include `lastmod`.

Submitted with `sitemaps.put` at `2026-10-04T16:42:22Z`, then again at `2026-10-05T05:20:50Z` after the crawlability pass (106 URLs).

- `isPending`: true
- `errors`: 0
- `warnings`: 0
- `isSitemapsIndex`: false

Google has accepted the submission and has not finished processing it. Hosting deploys regenerate the sitemap before the frontend build (`scripts/deploy-firebase.sh`).

## 3–4. Crawling and indexing

Homepage URL Inspection:

- Verdict: `PASS`
- Coverage: Submitted and indexed
- Fetch: `SUCCESSFUL`
- Indexing: `INDEXING_ALLOWED`
- Robots: `ALLOWED`
- Last crawl: `2026-09-23T16:41:52Z` (mobile)

Every other inspected URL returned `NEUTRAL` / `URL is unknown to Google` (no crawl yet). That matches a property where only the homepage was known before the sitemap existed. Expect this to change after Google processes `sitemap.xml`.

## 5. Core Web Vitals

Search Console’s CWV report has no API. Field data from the Chrome UX Report for `https://cigarsforyou.com.au` returned **not found** (origin does not have enough Chrome traffic yet). PageSpeed field metrics (`loadingExperience` / `originLoadingExperience`) were also empty.

Lab PageSpeed (homepage, 4 Oct 2026):

| | Mobile | Desktop |
|--|--------|---------|
| Performance score | 0.64 | 0.86 |
| LCP | 5.1 s | 0.8 s |
| CLS | 0 | 0.003 |
| TBT | 0 ms | 210 ms |
| FCP | 5.1 s | 0.7 s |

Mobile lab LCP/FCP are the weak scores. There is no INP in this lab run.

GSC report (manual): https://search.google.com/search-console/core-web-vitals?resource_id=sc-domain%3Acigarsforyou.com.au

## 6. HTTPS

| URL | Result |
|-----|--------|
| `https://cigarsforyou.com.au/` | 200, `strict-transport-security: max-age=31556926` |
| `http://cigarsforyou.com.au/` | 301 → `https://cigarsforyou.com.au/` |
| `http://www.cigarsforyou.com.au/` | 301 → `https://www.cigarsforyou.com.au/` |
| `https://www.cigarsforyou.com.au/` | TLS failure: certificate has no name for `www` |

Apex HTTPS is fine. `www` is not a usable host until a certificate covers it (or `www` redirects to the apex before TLS).

## 7. Manual actions

No Search Console API for manual actions. Check in the UI:

https://search.google.com/search-console/manual-actions?resource_id=sc-domain%3Acigarsforyou.com.au

## 8. Security issues

No Search Console API for security issues. Check in the UI:

https://search.google.com/search-console/security-issues?resource_id=sc-domain%3Acigarsforyou.com.au

## 9. Structured data

- Homepage URL Inspection has no `richResultsResult`
- Live HTML for `/` and `/product/cohiba-black-supremo` is the same SPA shell
- No `application/ld+json`
- No `rel="canonical"`

There is nothing for a structured-data report to list until JSON-LD is in the HTML Google fetches.

## 10. Canonicalisation

- Homepage `googleCanonical`: `https://cigarsforyou.com.au/`
- Homepage `userCanonical`: still unset in URL Inspection. The raw HTML shell has no canonical tag. After JavaScript, indexable routes set a self-referencing `https://cigarsforyou.com.au` canonical with no trailing slash and no query string.
- Other inspected URLs: Google has not chosen a canonical yet (still unknown)
- `www` cannot compete today because HTTPS on `www` fails. A Hosting redirect cannot run until TLS succeeds, so `www` → apex is not configured yet.
- Trailing-slash URLs 301 to the slashless apex URL (`/shop/` → `/shop`, checked 5 Oct 2026 afternoon)

## 11. Priority URLs

Re-inspected 5 Oct 2026 (afternoon), after the crawlability deploy. Unchanged from the morning check: only `/` is known to Google.

| URL | Verdict | Coverage |
|-----|---------|----------|
| `/` | PASS | Submitted and indexed |
| `/shop` | NEUTRAL | URL is unknown to Google |
| `/cigarettes` | NEUTRAL | URL is unknown to Google |
| `/accessories` | NEUTRAL | URL is unknown to Google |
| `/about` | NEUTRAL | URL is unknown to Google |
| `/news` | NEUTRAL | URL is unknown to Google |
| `/contact` | NEUTRAL | URL is unknown to Google |
| `/product/cohiba-black-supremo` | NEUTRAL | URL is unknown to Google |
| `/product/cohiba-club-10-white-cigarillo` | NEUTRAL | URL is unknown to Google |
| `/product/montecristo-montecristo-no-2` | NEUTRAL | URL is unknown to Google |
| `/news/store-cuban-cigars-australian-climate` | NEUTRAL | URL is unknown to Google |

## 12. Performance data

`searchAnalytics.query` for 2026-09-04 through 2026-10-02 succeeded (`200`) for `query`, `page`, `device`, and `date`. Each returned **0 rows**. Collection is wired; Google has not recorded impressions in that window yet. Data usually lags 2–3 days after pages start appearing in search.

## Bing Webmaster checklist

Re-checked 5 Oct 2026 (UTC+11) via Bing Webmaster API. Setup: [config.md](config.md).

| # | Check | Result |
|---|--------|--------|
| 1 | Site ownership | Pass — `https://cigarsforyou.com.au/` verified (GSC import) |
| 2 | XML sitemap | Resubmitted 5 Oct 2026 afternoon — Status `Pending`. Last successful crawl still shows **109 URLs**, file size 9559, until Bing fetches the new 106-URL file |
| 3 | Crawlability (live) | Pass — Bingbot UA gets 200 on `/` and `/sitemap.xml`; `robots.txt` allows public pages |
| 4 | Indexing | Early — sitemap ingested; per-URL crawl dates not populated yet |
| 5 | Crawl issues | Pass — none reported (`GetCrawlIssues` empty) |
| 6 | Site diagnostics | Manual in Bing UI (Site Scan) if desired — no API equivalent; crawl issues already clear |
| 7 | Search performance | Wired — `GetRankAndTrafficStats` empty until Bing has impressions |

URL submission quota (Bing URL Submission API, separate from IndexNow): daily 100 / monthly 2700.

## IndexNow checklist

Hosting for the key file was deployed 5 Oct 2026 (afternoon). `https://cigarsforyou.com.au/778303fccee6212d5b66503c3f71025f.txt` returns the key. IndexNow Cloud Functions are still not deployed.

| # | Check | Result |
|---|--------|--------|
| 1 | Key file in build | Live — `https://cigarsforyou.com.au/778303fccee6212d5b66503c3f71025f.txt` returns the key |
| 2 | Product add / update / remove | Cloud Function `onProductIndexNow` (deploy pending) |
| 3 | Category changes | Cloud Function `onCatalogCategoryIndexNow` (deploy pending) |
| 4 | News publish / update / remove | Cloud Function `onNewsPostIndexNow` (deploy pending) |
| 5 | Stock / FBT-only product writes | Ignored (no IndexNow spam) |

## Crawlability pass — 5 Oct 2026 (afternoon)

Checked with `curl` after the hosting deploy. No WAF or bot-block rules in the repo. Googlebot, Googlebot-Image, and Bingbot each received HTTP 200 on `/`, `/shop`, `/product/cohiba-black-supremo`, `/robots.txt`, `/sitemap.xml`, and `/assets/index-B4ocCJD3.js`.

`robots.txt` is the static file (not the SPA shell). Disallow paths match the utility and admin routes in `src/App.tsx`. The sitemap line is `https://cigarsforyou.com.au/sitemap.xml` (106 `<loc>` entries; no Bolivar, Trinidad, `/cigarettes`, or `/accessories`).

`/shop/` and `/product/cohiba-black-supremo/` return **301** to the slashless apex URL.

`https://www.cigarsforyou.com.au/` still fails TLS (certificate has no `www` name). `http://www` 301s to `https://www`, which then fails. Connect `www.cigarsforyou.com.au` on Firebase Hosting so Google can issue a certificate, then redirect that host to `https://cigarsforyou.com.au`. Do not add the redirect before TLS works.

Canonicals and `noindex` are applied in the browser after render (`src/components/RouteSeo.tsx`). The first HTML byte is still the shared shell, so Google only sees those tags after it renders JavaScript.

## Follow-ups

- **Deploy IndexNow functions:** `firebase deploy --only functions:onProductIndexNow,functions:onCatalogCategoryIndexNow,functions:onNewsPostIndexNow` (or batch one-at-a-time if Cloud Run CPU quota bites). Hosting and the key file are already live.
- After the functions deploy, run the manual IndexNow test ping in [config.md](config.md)
- Wait for Google to finish processing the 106-URL sitemap, then re-inspect priority URLs
- Fix `www` TLS, then redirect `www` to the apex
- JSON-LD is still absent (not part of this pass)
