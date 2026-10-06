# Content inventory — cigarsforyou.com.au

Crawl date: 5 October 2026 (UTC+11). One row per page is in [seo-inventory.csv](seo-inventory.csv) (127 rows). How the URLs were collected is in [seo-crawl.md](seo-crawl.md).

Search Console, as already recorded in [indexed.md](indexed.md): only `/` is indexed. The other priority URLs were still unknown to Google. This inventory is the baseline those URLs will be judged against.

## Update — 6 October 2026

Head SEO is no longer browser-only. The production build writes a per-URL `index.html` head (title, description, canonical, robots, Open Graph, JSON-LD) via `scripts/prerender-heads.ts`. Visible body copy is still hydrated by the SPA. Brand name in those tags is `CigarsForYou` from `src/lib/brand.ts`. Organization schema has no `sameAs`: the site and these notes have no social or third-party business profile URLs. `public/llms.txt` points at the core public pages that are already in `public/sitemap.xml`. `public/robots.txt` documents an intentional allow-all for search and AI crawlers on public pages.

The 5 October inventory rows were not re-crawled. Treat “canonical: none” and the shared sitewide title as the state before the head-prerender pass.

## Update — 5 October 2026 (evening)

The sections below are the morning crawl. They are historical. A linking and content pass the same day superseded these points:

- Titles, robots, and canonicals are set in the browser after JavaScript (`src/lib/seo.ts`). The “canonical: none” column is stale.
- Indexable page types now have their own meta descriptions. Product descriptions use the rewritten short description.
- Catalogue sidebar brands are links to `/shop/{slug}`, not buttons. `?brand=` and `?category=` in the catalogue redirect to the path form.
- Brands with no active products are left out of the nav, footer, home brand list, and sidebar.
- The homepage has one `h1`. The mobile hero repeats the same line as a paragraph.
- Short and extended descriptions were rewritten in Firestore for all 83 active products. Tasting notes that were identical across a brand were replaced with format notes taken from the product name. Specification blocks copied across a brand were not used as facts.
- The five news articles in `scripts/seed-news.js` link to the catalogue, and the storage article cites Habanos, S.A. The live article text uses those labels as plain sentences so the current site does not show raw markdown. After this frontend is deployed, run `node scripts/seed-news.js --patch-body` to publish the links. The storage range is 16–18°C and 65–70% relative humidity, not 18–20°C.
- `/cigarettes` and `/accessories` stay in the nav, `noindex` while empty, and out of the sitemap.

The row-level crawl was not repeated. Treat the thin-product rows and “one title for the catalogue” as the state before this pass.

## Fields

| Column | How it was filled |
|--------|-------------------|
| URL | Production URL |
| Page type | `home`, `html`, `legal`, `category-index`, `category`, `article-index`, `article`, `product`, `search`, `filter`, `parameter`, `utility`, `admin` |
| Title | `document.title` after render |
| H1 | First `h1`. Empty if the page has none |
| Indexability | `indexable`, `indexable-parameter`, `robots-disallow`, or `soft-404` |
| Canonical | `none` on every row. No canonical element was found |
| Published | News `publishedAt`. Products and categories use the Firestore create date, which is a catalog write, not an editorial date |
| Last updated | News `updatedAt`, Firestore update date, or the “Last updated” line on legal pages |
| Content quality | Rubric below |
| Internal-link count | Other crawled pages that link to that path, counted once per path. Nav and footer count, so public chrome URLs land around 113–118 |

Quality rubric:

- **strong** — 400 or more words of real page copy (home, about, compliance).
- **adequate** — a real page of at least 120 words, a category that lists products, or a news article of 150–399 words.
- **thin** — coming-soon range, brand with zero products, templated product page, parameter duplicate, or empty shell.
- **low-value** — disallowed utility or admin URL.

| Quality | Rows |
|---------|-----:|
| strong | 3 |
| adequate | 19 |
| thin | 93 |
| low-value | 12 |

The 93 thin rows are 83 product pages, `/cigarettes`, `/accessories`, `/shop/bolivar`, `/shop/trinidad`, `/cookies`, and five sampled parameter URLs.

## Thin content

**Every product page.** All 83 active products share one description pattern:

> Premium hand-rolled {brand} {name} Cuban cigar. Freshly preserved in humidor humidity pouches.

Unique catalog copy (short line, that sentence, tasting notes, and specifications) is 78–84 words, and almost all of the variation is the length of the name. Rendered `<main>` is longer (about 200–450 words) because of the shared layout, related products, and repeated spec labels. None of that is distinct enough to treat the URL as its own document. Titles are the sitewide default, not the product name.

**Empty ranges**

| URL | H1 | What it shows |
|-----|----|----------------|
| `/cigarettes` | Retail Cigarettes Coming Soon | No products. Purchasing not available. |
| `/accessories` | Accessories Coming Soon | No products. |
| `/shop/bolivar` | Bolivar Cigars | Category exists. Sidebar count is 0. “No cigars match your criteria.” |
| `/shop/trinidad` | Trinidad Cigars | Same. No Bolivar or Trinidad products in Firestore. |

Both empty brands are in the nav, the footer, and the live sitemap.

**`/cookies`.** HTTP 200, no H1, empty main, zero internal links. The route exists in the repo and in `public/sitemap.xml`. It is not in the live JavaScript bundle or the live sitemap.

**Partnerships** is the shortest real page that still clears the adequate line (136 words).

## Duplicate content

1. **One title for the catalogue.** 121 of 127 inventoried URLs use `CigarsForYou — Premium Cuban Cigars & Subscription Delivery`. The exceptions are `/news` and the five articles.
2. **Product copy is a template.** Swapping the brand and vitola name makes the same sentence. Short descriptions, tasting notes, and spec blocks barely change between SKUs.
3. **`/shop?brand=Cohiba` is `/shop/cohiba`.** Same H1 (“Cohiba Cigars”). The path form is the one the nav uses for brands. The query form is still crawlable.
4. **`/shop?category=specials` and `/shop?category=cigars` are `/shop`.** The catalogue ignores `category`, so both nav targets render the full cigar grid (H1 “Cuban Cigars”).
5. **`/shop?search=`** is a second URL for a filtered grid. There is no canonical back to `/shop` or to a brand path.
6. **Trailing slash.** `/shop/` and `/product/cohiba-robustos/` return 200 and render the same H1 as the slashless URL. Nothing redirects or canonicalises them.
7. **Homepage has two `h1` elements** in the page source (the desktop and mobile heroes). The inventory records the first: “Authentic Cuban Cigars, Delivered To Your Door.”

## Obsolete pages

Nothing in Firestore is inactive or unpublished. All five news posts were updated on 3 October 2026. Publication dates run from 12 September 2026 to 2 October 2026.

16 products are active with stock 0. They are still normal product URLs, not retired pages:

`montecristo-no-1`, `montecristo-puritos`, `partagas-habaneros`, `partagas-shorts`, `partagas-petit-coronas-especiales`, `partagas-capitols-tin-of-5`, `partagas-puritos-pack-of-5`, `punch-coronations-tube`, `punch-double-corona`, `h-upmann-magnum-54`, `h-upmann-coronas-major-tube`, `h-upmann-h-upmann-no-2`, `cohiba-club-10-white-cigarillo`, `cohiba-cuban-selection-petit-robustos`, `cohiba-talisman-2017-limited-edition`, `hoyo-de-monterrey-epicure-de-luxe`.

## Orphan and weak links

Internal-link counts include the nav and footer, so a public page in the chrome is not an orphan even when its body never links anywhere.

| Situation | URLs |
|-----------|------|
| Public URL with zero inlinks | `/cookies` only (and it does not render) |
| Articles linked only from `/news` | all 5 posts (`internal_link_count` 1) |
| Products | none at zero. 79 products have 2 inlinking pages: `/shop` and their brand URL. Four Cohiba URLs are also linked from other product pages and land at 61–68: `cohiba-black-supremo`, `cohiba-club-10-white-cigarillo`, `cohiba-cuban-selection-petit-robustos`, `cohiba-cuban-selection-piramides` |
| Disallowed and unlinked | `/admin`, `/admin/login`, `/checkout`, `/checkout-details`, `/order-confirmation`, `/age-restricted` |

`/cart`, `/login`, and `/account` are in the chrome (118 inlinks) even though `robots.txt` disallows them. `/shop/bolivar` and `/shop/trinidad` are slightly lower, at 113.

## Low-value pages

Keep out of the index. They are already disallowed, except the parameter rows, which are not.

- Utility: `/cart`, `/checkout`, `/checkout-details`, `/order-confirmation`, `/account`, `/login`, `/signup`, `/forgot-password`, `/age-restricted`
- Admin: `/admin`, `/admin/login`
- Search and filter samples: `/shop?search=cohiba`, `/cigarettes?search=marlboro`, `/shop?brand=Cohiba`
- Ignored nav parameters: `/shop?category=specials`, `/shop?category=cigars`
- Coming-soon catalogues and the two empty brands, until they have products

Empty cart and empty delivery-details use an `h2` (“Your Cart is Empty”), not an `h1`. Logged-out `/account` renders the sign-in H1.

## Consolidation

Do not merge the 83 product URLs. They are different SKUs. They need different titles and copy, or they will keep competing as copies of one template.

| Candidate | Why |
|-----------|-----|
| `/shop/bolivar`, `/shop/trinidad` | In the nav and sitemap with zero products. Same empty state as a fake slug. |
| `/cigarettes`, `/accessories` | Coming-soon pages in the sitemap. |
| `/shop?brand={name}` | Duplicate of `/shop/{slug}`. |
| `/shop?category=specials`, `/shop?category=cigars` | Duplicate of `/shop`, and the nav points at them. |
| `/shop?search=` and other catalogue queries | Infinite URL space, no canonical. |
| Slash and non-slash pairs | Same render, no redirect. |
| `/cookies` | Either ship the page that is already in source, or take it out of `public/sitemap.xml` until that deploy. On production today it is an empty 200. |
