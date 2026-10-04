# Google Search Console — CigarsForYou

## Connection (local agent / CLI)

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
