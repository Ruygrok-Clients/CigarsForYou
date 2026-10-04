# Search Console checklist — cigarsforyou.com.au

Checked 5 Oct 2026 (UTC+11). Property: `sc-domain:cigarsforyou.com.au`. Connection details: [config.md](config.md).

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

## Follow-ups

- Wait for sitemap processing, then re-check indexing on the priority URLs
- Fix `www` TLS (certificate or redirect to apex)
- Add HTML canonicals and JSON-LD if rich results matter
- Run `npm run generate:sitemap` when products or news change, then redeploy hosting