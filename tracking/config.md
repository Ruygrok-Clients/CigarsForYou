# Tracking setup — CigarsForYou

This file is how GA4 and Search Console are connected and configured. The events the site sends are in [tracking.md](tracking.md). Pipeline behaviour and the latest health check are in [indexed.md](indexed.md).

## Google Analytics 4

Direct `gtag.js` only. There is no Google Tag Manager container.

| Item | Value |
|------|--------|
| Measurement ID | `G-SRZFLMB8X7` |
| Tag | Google tag in root [`index.html`](../index.html), immediately after `<head>` |
| Script | `https://www.googletagmanager.com/gtag/js?id=G-SRZFLMB8X7` (Google’s direct tag host, not a GTM container) |
| Initial config | `gtag('config', 'G-SRZFLMB8X7', { send_page_view: false })` |
| Page views | SPA sends one `page_view` per storefront route from [`AnalyticsRouteListener`](../src/components/AnalyticsRouteListener.tsx) |
| Helpers | [`src/lib/analytics.ts`](../src/lib/analytics.ts) |
| Currency | `AUD` |
| Admin paths | `/admin` and `/admin/*` do not send page views or click events |

The tag loads on every page, including the age gate and under-18 exit. No consent banner is installed; cookies and analytics run by default. The public disclosure is at `/cookies` (Cookies Policy).

### Code layout

1. `index.html` defines `window.gtag` and configures the measurement ID without an automatic page view, so the first hit is not counted twice.
2. `AnalyticsRouteListener` (mounted inside `BrowserRouter` in `src/App.tsx`) reads `?internal` and `?ga_debug`, then sends `page_view` with `page_path`, `page_location`, and `page_title`.
3. Feature code calls helpers in `src/lib/analytics.ts`. If `gtag` is missing, those helpers do nothing.
4. Events never include name, email, phone, or message text.

### Internal traffic

Staff mark a browser, then exclude it in GA4 Admin.

1. Open any storefront URL with `?internal=1` (example: `https://cigarsforyou.com.au/?internal=1`).
2. The site sets cookie `cfy_ga_internal=1` for one year (`SameSite=Lax`, path `/`) and removes the query parameter.
3. Later hits from that browser include `traffic_type=internal`.
4. `?internal=0` clears the cookie.

Bookmarklet to turn the flag on (create a bookmark with this as the URL):

```text
javascript:(function(){var u=new URL(location.href);u.searchParams.set('internal','1');location.replace(u.toString());})();
```

Bookmarklet to turn it off:

```text
javascript:(function(){var u=new URL(location.href);u.searchParams.set('internal','0');location.replace(u.toString());})();
```

In GA4 Admin → Data streams → web stream → Configure tag settings → Define internal traffic, or Data filters:

1. Create an internal traffic rule where the event parameter `traffic_type` equals `internal`.
2. Create a data filter of type Internal traffic using that rule.
3. Leave the filter in Testing until Realtime shows staff hits as internal, then set it to Active.

### DebugView

Add `?ga_debug=1` on any storefront URL. The site sets cookie `cfy_ga_debug=1` and sends `debug_mode=true` on later events. `?ga_debug=0` clears it. Then open GA4 Admin → DebugView. The Chrome GA Debugger extension also works.

### GA4 Admin checklist

These steps are done in the GA4 interface, not in the repo:

1. Confirm the web stream uses measurement ID `G-SRZFLMB8X7`.
2. Set the reporting timezone to Australia/Sydney and the currency to AUD.
3. Enhanced measurement: keep scrolls if useful. This site already sends its own `page_view`, `search`, and outbound / `tel:` / `mailto:` clicks, so do not rely on Enhanced measurement for those or page views will double-count.
4. Mark as conversions (details and primary vs secondary are in [tracking.md](tracking.md)): `purchase`, `generate_lead`, `b2b_enquiry`, `sign_up`, `stock_notify_signup`, `waitlist_signup`.
5. Link Search Console: Admin → Product links → Search Console links → Link → choose property `sc-domain:cigarsforyou.com.au` and this web stream.
6. Activate the internal-traffic data filter after a Testing check (see above).

### Checkout and payments

Ecommerce and checkout events are wired on the storefront. Paid checkout still shows “Checkout unavailable”, and `VITE_PAYMENTS_ENABLED` is unchanged, so the site does not place paid orders. When payments are turned on, call `trackPaidPurchase()` from [`src/lib/analytics.ts`](../src/lib/analytics.ts) once on the success path (AUD order total, shipping, coupon, items, `transaction_id`) before navigating to confirmation. Rewards orders already call `trackPurchase()` with `checkout_type: 'rewards'` when a reward order is actually placed.

## Google Search Console

### Connection (local agent / CLI)

| Item | Value |
|------|--------|
| GSC property | `sc-domain:cigarsforyou.com.au` |
| Permission | `siteOwner` (via ADC user) |
| GCP project (quota) | `cigarsforyou-ea835` |
| API | `searchconsole.googleapis.com` (enabled) |
| Auth | Application Default Credentials with `webmasters` + `cloud-platform` scopes |

### Auth token + required header

```bash
TOKEN=$(gcloud auth application-default print-access-token)
# Always send quota project header for Search Console:
#   -H "x-goog-user-project: cigarsforyou-ea835"
```

### Common calls

```bash
SITE_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('sc-domain:cigarsforyou.com.au', safe=''))")
TOKEN=$(gcloud auth application-default print-access-token)
H=(-H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: cigarsforyou-ea835")

# List properties
curl -sS "${H[@]}" 'https://www.googleapis.com/webmasters/v3/sites'

# Search analytics (queries)
curl -sS -X POST "${H[@]}" -H 'Content-Type: application/json' \
  -d '{"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","dimensions":["query"],"rowLimit":25}' \
  "https://www.googleapis.com/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query"

# List / submit sitemap
curl -sS "${H[@]}" "https://www.googleapis.com/webmasters/v3/sites/${SITE_ENC}/sitemaps"
curl -sS -X PUT "${H[@]}" "https://www.googleapis.com/webmasters/v3/sites/${SITE_ENC}/sitemaps/$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://cigarsforyou.com.au/sitemap.xml', safe=''))")"
```

### Re-auth (Search Console only)

Do **not** add `analytics.readonly` to this command. Google blocks the shared gcloud app from requesting Analytics. See the Analytics API section below.

```bash
gcloud config set project cigarsforyou-ea835
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters"
gcloud auth application-default set-quota-project cigarsforyou-ea835
```

Sign in as the Google account that owns the GSC property (currently the account used for `cigars4uss@gmail.com` / site owner).

## Google Analytics API

The Data and Admin APIs are enabled on `cigarsforyou-ea835`:

- `analyticsdata.googleapis.com`
- `analyticsadmin.googleapis.com`

Measurement ID on the site: `G-SRZFLMB8X7`. This property is not linked from Firebase (`analyticsDetails` returns not found), so access is granted in the GA4 property itself.

### Why the Google page says "This app is blocked"

`gcloud auth application-default login` normally uses Google's shared Cloud SDK app. That app is allowed to ask for Cloud Platform and Search Console. It is **not** allowed to ask for Google Analytics. Adding `https://www.googleapis.com/auth/analytics.readonly` opens the account picker, then Google shows "This app is blocked". That login did not change the existing Search Console credentials.

### Connection that Google allows

Use a Desktop OAuth client owned by this project, then pass it to gcloud.

1. Open [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients?project=cigarsforyou-ea835) for project `cigarsforyou-ea835`.
2. If the consent screen is not set up yet: audience **External**, publishing status **Testing**, and add `cigars4uss@gmail.com` as a test user.
3. Under data access, add scope `https://www.googleapis.com/auth/analytics.readonly`.
4. Create a client of type **Desktop app**. Download the JSON and save it outside the repo:

```bash
mkdir -p ~/.config/gcloud
# move the downloaded file, then:
chmod 600 ~/.config/gcloud/cfy-ga-client.json
```

5. Sign in with that client (this replaces the blocked shared-app request):

```bash
gcloud auth application-default login \
  --client-id-file="$HOME/.config/gcloud/cfy-ga-client.json" \
  --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/analytics.readonly"
gcloud auth application-default set-quota-project cigarsforyou-ea835
```

On the consent screen, Google may say the app is not verified because it is in Testing. Continue as `cigars4uss@gmail.com`. That is a different page from "This app is blocked".

6. Confirm the property is visible (no token is printed):

```bash
curl -sS \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "x-goog-user-project: cigarsforyou-ea835" \
  "https://analyticsadmin.googleapis.com/v1beta/accountSummaries"
```

Look for the account that contains measurement ID `G-SRZFLMB8X7`, then list its streams with the property resource name from that response:

```bash
# PROPERTY is like properties/123456789
curl -sS \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "x-goog-user-project: cigarsforyou-ea835" \
  "https://analyticsadmin.googleapis.com/v1beta/PROPERTY/dataStreams"
```

### Service account

`ga4-reader@cigarsforyou-ea835.iam.gserviceaccount.com` exists, and `cigars4uss@gmail.com` has `roles/iam.serviceAccountTokenCreator` on it. Impersonation from gcloud currently returns `PERMISSION_DENIED` on `iam.serviceAccounts.getAccessToken`, so the API connection is not using this account yet. No key file was created.

## Bing Webmaster Tools

Verified via Google Search Console import. Site URL Bing expects: `https://cigarsforyou.com.au/`.

### Connection (local agent / CLI)

Same idea as Search Console: credentials stay on the machine, not in Firebase secrets and not in git.

| Item | Value |
|------|--------|
| Site URL | `https://cigarsforyou.com.au/` |
| Auth | API key (Settings → API Access → API Key) |
| Key file | [`tracking/secrets.local.env`](secrets.local.env) (gitignored) |
| Example template | [`tracking/secrets.local.env.example`](secrets.local.env.example) |
| API base | `https://ssl.bing.com/webmaster/api.svc/json` |

```bash
cp tracking/secrets.local.env.example tracking/secrets.local.env
# paste BING_WEBMASTER_API_KEY=… into secrets.local.env, then:
set -a && source tracking/secrets.local.env && set +a
```

### Common calls

```bash
set -a && source tracking/secrets.local.env && set +a
SITE='https://cigarsforyou.com.au/'
BASE='https://ssl.bing.com/webmaster/api.svc/json'

# List verified sites
curl -sS "${BASE}/GetUserSites?apikey=${BING_WEBMASTER_API_KEY}"

# List / submit sitemap (JSON POST)
curl -sS "${BASE}/GetFeeds?apikey=${BING_WEBMASTER_API_KEY}&siteUrl=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${SITE}', safe=''))")"
curl -sS -X POST "${BASE}/SubmitFeed?apikey=${BING_WEBMASTER_API_KEY}" \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"siteUrl":"https://cigarsforyou.com.au/","feedUrl":"https://cigarsforyou.com.au/sitemap.xml"}'

# Crawl / issues / search performance
curl -sS "${BASE}/GetCrawlStats?apikey=${BING_WEBMASTER_API_KEY}&siteUrl=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${SITE}', safe=''))")"
curl -sS "${BASE}/GetCrawlIssues?apikey=${BING_WEBMASTER_API_KEY}&siteUrl=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${SITE}', safe=''))")"
curl -sS "${BASE}/GetRankAndTrafficStats?apikey=${BING_WEBMASTER_API_KEY}&siteUrl=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${SITE}', safe=''))")"
```

Do **not** use OAuth Client for this workflow — API Key is enough for local CLI, same role ADC plays for Search Console.

## IndexNow

Real-time URL change notifications for Bing and other IndexNow engines. Complements the XML sitemap (discovery) with push updates (freshness).

| Item | Value |
|------|--------|
| Key | `778303fccee6212d5b66503c3f71025f` (public by design) |
| Key file | [`public/778303fccee6212d5b66503c3f71025f.txt`](../public/778303fccee6212d5b66503c3f71025f.txt) → `https://cigarsforyou.com.au/778303fccee6212d5b66503c3f71025f.txt` |
| Endpoint | `https://api.indexnow.org/IndexNow` |
| Implementation | [`functions/src/indexNow.ts`](../functions/src/indexNow.ts) |
| Triggers | `onProductIndexNow`, `onCatalogCategoryIndexNow`, `onNewsPostIndexNow` |

### When URLs are submitted

| Change | Collection | URLs notified |
|--------|------------|---------------|
| Product added / updated / removed | `products` | `/product/{slug}` (old + new if slug changes); range listing when create/delete/active/range changes |
| Category added / renamed / removed | `catalogCategories` | category path + parent range listing |
| News published / updated / unpublished / removed | `newsPosts` | `/news/{slug}`; `/news` when active state changes |

Product stock-only and FBT-companion-only writes are ignored so automated jobs do not flood IndexNow.

### Manual test ping

```bash
set -a && source tracking/secrets.local.env && set +a
curl -sS -X POST 'https://api.indexnow.org/IndexNow' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"cigarsforyou.com.au\",\"key\":\"${INDEXNOW_KEY}\",\"keyLocation\":\"https://cigarsforyou.com.au/${INDEXNOW_KEY}.txt\",\"urlList\":[\"https://cigarsforyou.com.au/\"]}"
```

`200` = accepted. `202` = accepted, key validation pending. Activity also appears under Bing Webmaster Tools → IndexNow.

## Notes

- GSC reporting data typically lags 2–3 days.
- New properties often return empty `searchAnalytics` until Google has crawl/impression data.
- No sitemaps were registered via API at setup time (`sitemaps` list was empty).
- Bing sitemap submitted via `SubmitFeed` after GSC import; as of 5 Oct 2026 status is `Success` with 109 URLs. Crawl/traffic stats can still be empty until Bing has search impressions.
