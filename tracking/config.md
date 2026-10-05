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

The tag loads on every page, including the age gate and under-18 exit. No consent banner is installed.

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

### Re-auth (if scopes expire or ADC is wiped)

```bash
gcloud config set project cigarsforyou-ea835
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters"
gcloud auth application-default set-quota-project cigarsforyou-ea835
```

Sign in as the Google account that owns the GSC property (currently the account used for `cigars4uss@gmail.com` / site owner).

## Notes

- GSC reporting data typically lags 2–3 days.
- New properties often return empty `searchAnalytics` until Google has crawl/impression data.
- No sitemaps were registered via API at setup time (`sitemaps` list was empty).
