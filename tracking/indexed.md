# Tracking health — cigarsforyou.com.au

Search Console checklist below was checked 5 Oct 2026 (UTC+11). Property: `sc-domain:cigarsforyou.com.au`. Setup: [config.md](config.md). Events: [tracking.md](tracking.md).

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

Live files (after hosting deploy):

- `https://cigarsforyou.com.au/robots.txt` — `text/plain`, points at the sitemap, disallows account/checkout/admin paths
- `https://cigarsforyou.com.au/sitemap.xml` — `application/xml`, **109 URLs** (core pages, catalog categories, active products, published news)

Submitted with `sitemaps.put` at `2026-10-04T16:42:22Z`.

- `isPending`: true
- `errors`: 0
- `warnings`: 0
- `isSitemapsIndex`: false

Google has accepted the submission and has not finished processing it. Regenerate after catalog changes with `npm run generate:sitemap`, then redeploy hosting.

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
- Homepage `userCanonical`: not set (no canonical tag in HTML)
- Other inspected URLs: Google has not chosen a canonical yet
- `www` cannot compete today because HTTPS on `www` fails
- Risk: every route currently returns the same HTML document, so Google has no HTML-level canonical or unique content until it renders JavaScript

## 11. Priority URLs

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
| 2 | XML sitemap | Pass — `https://cigarsforyou.com.au/sitemap.xml`, Status `Success`, **109 URLs**, file size 9559 |
| 3 | Crawlability (live) | Pass — Bingbot UA gets 200 on `/` and `/sitemap.xml`; `robots.txt` allows public pages |
| 4 | Indexing | Early — sitemap ingested; per-URL crawl dates not populated yet |
| 5 | Crawl issues | Pass — none reported (`GetCrawlIssues` empty) |
| 6 | Site diagnostics | Manual in Bing UI (Site Scan) if desired — no API equivalent; crawl issues already clear |
| 7 | Search performance | Wired — `GetRankAndTrafficStats` empty until Bing has impressions |

URL submission quota (Bing URL Submission API, separate from IndexNow): daily 100 / monthly 2700.

## IndexNow checklist

Implemented in repo and production build (`dist/` includes the key file). **Live deploy was not run** (deploy approval skipped) — run the commands in Follow-ups to go live.

| # | Check | Result |
|---|--------|--------|
| 1 | Key file in build | `public/778303fccee6212d5b66503c3f71025f.txt` → `dist/` (live URL after hosting deploy) |
| 2 | Product add / update / remove | Cloud Function `onProductIndexNow` (deploy pending) |
| 3 | Category changes | Cloud Function `onCatalogCategoryIndexNow` (deploy pending) |
| 4 | News publish / update / remove | Cloud Function `onNewsPostIndexNow` (deploy pending) |
| 5 | Stock / FBT-only product writes | Ignored (no IndexNow spam) |

## Follow-ups

- **Deploy IndexNow:** `npm run deploy:hosting` then `firebase deploy --only functions:onProductIndexNow,functions:onCatalogCategoryIndexNow,functions:onNewsPostIndexNow` (or batch one-at-a-time if Cloud Run CPU quota bites)
- After hosting deploy, confirm `https://cigarsforyou.com.au/778303fccee6212d5b66503c3f71025f.txt` returns the key, then run the manual IndexNow test ping in [config.md](config.md)
- Wait for Google + Bing to crawl priority URLs after sitemap success, then re-check indexing
- Fix `www` TLS (certificate or redirect to apex)
- Add HTML canonicals and JSON-LD if rich results matter
- Run `npm run generate:sitemap` when products or news change, then redeploy hosting
