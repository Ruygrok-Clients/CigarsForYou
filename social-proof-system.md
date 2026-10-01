# Social Proof Toast System

Bottom-corner social proof for CigarsForYou. The feed mixes live-site, newsletter, and back-in-stock signals, with purchase toasts kept sparse. There is no WebSocket: a daily job pre-schedules entries, and the storefront polls Firestore.

---

## Purpose

Show a steady stream of activity without depending on real order volume, and without repeating “someone just ordered” on every toast.

Generated mix (about **60–100** entries per Sydney day):

| Share | `eventType` | Copy |
|---|---|---|
| 35% | `site_viewers` | `{N} people are viewing this site live right now` (`N` is 12–48) |
| 30% | `newsletter` | `{firstName} from {City, NSW} signed up for our newsletter drop` |
| 25% | `stock_notify` | `{firstName} from {City, NSW} asked to be notified when {product} becomes back in stock` |
| 10% | `order` | `{firstName} from {City, NSW} just ordered {product}` |

Real orders still write one `source: "order"` entry when an order document is created. Newsletter and stock-notify toasts are generated only — those collections store an email, not a display name.

Locations are **NSW only** (`"Sydney, NSW"`). A real order outside NSW (or with no suburb) displays `"NSW"`, never another state.

---

## What the visitor sees

A card fixed to the bottom-left on desktop, centered at ≤1024px, and **narrower on phones (≤640px)**.

Behavior:

| Behavior | Detail |
|---|---|
| Show duration | **8 seconds** per toast |
| Exit animation | **~280ms** fade + slide down |
| Gap between toasts | **16 seconds** |
| Dismiss | X button → exit animation, then the cycle continues |
| Product link | Product name links to `/product/{slug}` when a slug exists |
| Hidden on | `/checkout`, `/checkout-details`, and `/admin` |
| Mount gate | After the loading screen finishes **and** the age gate is verified |
| Mobile | Same toast, smaller card and media so it takes less of the screen |
| Accessibility | `aria-live="polite"` on the aside; dismiss has an aria-label |

Relative time:

- `0` minutes → `"just now"`
- `1` minute → `"1 minute ago"`
- `N` minutes → `"N minutes ago"`

Media is [`src/assets/socialProofImage.png`](src/assets/socialProofImage.png) (full character, contained on a dark panel).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  BACKEND                                                     │
│                                                              │
│  Daily cron (01:00 Sydney)                                   │
│    → cleanup expired docs                                    │
│    → generate 60–100 mixed entries                           │
│    → timestamps: a few in the last ~50 min + rest over ~24h  │
│    → write social_proof_runs/{YYYY-MM-DD} (idempotency)      │
│                                                              │
│  onOrderCreated                                              │
│    → write one real entry (source: "order", displayAt: now)  │
│    → failure is logged and does not fail the order emails    │
│                                                              │
│  Nightly cleanup cron (22:00 Sydney)                         │
│    → delete displayAt < now − 59 minutes                     │
│                                                              │
│  Callable: runDailySocialProof (admin / member)              │
└────────────────────────────┬─────────────────────────────────┘
                             │ Firestore public read
┌────────────────────────────▼─────────────────────────────────┐
│  FRONTEND                                                    │
│                                                              │
│  Poll every 30s: entries with displayAt in [now−59m, now]    │
│  Filter again with isSocialProofActive()                     │
│  Cycle: in (8s) → out (280ms) → gap (16s) → next             │
└──────────────────────────────────────────────────────────────┘
```

---

## Repo map

| Layer | Path | Role |
|---|---|---|
| Client helpers | `src/utils/socialProof.ts` | Visibility window, relative time, types |
| Cloud Functions | `functions/src/socialProof.ts` | Generate, cleanup, write order entry, NSW pools |
| Function wiring | `functions/src/index.ts` | Crons, order hook, admin callable |
| Client fetch | `src/services/socialProof.ts` | Firestore query + doc mapping |
| UI | `src/components/SocialProofToast.tsx` | Poll, cycle, copy by event type |
| Styles | `src/components/SocialProofToast.css` | Position, motion, compact mobile |
| Media | `src/assets/socialProofImage.png` | Character in the toast |
| Mount | `src/App.tsx` | After load + age verification; not on admin |
| Rules | `firestore.rules` | Public read on the feed; runs fully private |

---

## Data model

### Collection: `social_proof`

**Access:** `allow read: if true` · `allow write: if false` (Admin SDK / Cloud Functions only)

| Field | Type | Notes |
|---|---|---|
| `eventType` | `string` | `"order"` \| `"newsletter"` \| `"stock_notify"` \| `"site_viewers"` |
| `firstName` | `string` | First name only. Empty for `site_viewers` |
| `location` | `string` | `"City, NSW"` or `"NSW"`. Empty for `site_viewers` |
| `productName` | `string` | Set for `order` and `stock_notify` |
| `productSlug` | `string` | Builds `/product/{slug}`. Empty → plain text |
| `viewerCount` | `number` | `site_viewers` only, 12–48 on generated entries |
| `displayAt` | `Timestamp` | When the entry becomes eligible |
| `source` | `string` | `"generated"` \| `"order"` |
| `runId` | `string` | Sydney date `YYYY-MM-DD` on generated docs |
| `createdAt` | `Timestamp` | When the document was written |

### Collection: `social_proof_runs`

**Access:** `allow read, write: if false`

One document per Sydney calendar day, ID = `YYYY-MM-DD`.

```
{
  created: 82,
  skipped: false,
  deletedExpired: 12,
  createdAt: <Timestamp>
}
```

If the daily cron runs twice, the second run sees this doc and returns `{ created: 0, skipped: true }` without adding more entries. Cleanup still runs before that check.

### Visibility window

```
SOCIAL_PROOF_VISIBLE_MINUTES = 59
SOCIAL_PROOF_VISIBLE_MS = 59 * 60 * 1000
```

An entry is active when:

```
displayAt <= now  AND  (now − displayAt) <= 59 minutes
```

The UI only formats minutes, so the window stays under an hour.

---

## Backend

### Daily feed (`generateDailySocialProof`)

**Schedule:** `0 1 * * *` · `Australia/Sydney` · `retryCount: 1`

1. Delete expired docs (`displayAt < now − 59m`).
2. Stop if `social_proof_runs/{sydneyDateKey}` already exists.
3. Load in-stock products (`active !== false` and `stock > 0`).
4. Pick a count in **`[60, 100]`**.
5. Build timestamps:
   - **Backfill:** ~6% of the count, clamped to **4–12**, spread across the last **~50 minutes**.
   - **Future:** the rest spread across the next **~24 hours**, starting ~45s from now, with jitter so they are not evenly spaced.
6. For each timestamp, pick an event type with the weights above.
   - Person events use a first name (unique within the batch until the pool refills) and a random NSW location.
   - `order` and `stock_notify` attach a random in-stock product. If the catalog is empty, those rolls become `site_viewers` or `newsletter` instead.
7. Batch-write in chunks of **400**.
8. Write the run doc.

### Real orders (`writeOrderSocialProof`)

Called from `onOrderCreated` after the order emails are attempted. Errors are logged and do not fail checkout or email dispatch.

```
firstName   = first token of customerName, title-cased; empty → "Someone"
location    = "{Suburb}, NSW" when the address state is NSW (or blank) and a suburb exists
              otherwise "NSW"
product     = first line item (name from the product doc when the lookup succeeds)
productSlug = product.slug when found
displayAt   = now
source      = "order"
eventType   = "order"
```

### Cleanup (`cleanupSocialProof`)

**Schedule:** `0 22 * * *` · `Australia/Sydney`  
Deletes `social_proof` where `displayAt < now − 59 minutes`. The generator also cleans up before writing.

### Manual seed (`runDailySocialProof`)

Callable. Caller must be signed in with Firestore role `admin` or `member`. Same generate function and the same daily lock.

---

## Frontend

### Mount (`src/App.tsx`)

```
{!isAdminPath && !showLoading && isAgeVerified && <SocialProofToast />}
```

The component itself renders nothing on routes starting with `/checkout` or `/admin`.

### Fetch (`src/services/socialProof.ts`)

Every **30 seconds**:

```
collection: social_proof
where displayAt >= Timestamp(now − 59m)
where displayAt <= Timestamp(now)
orderBy displayAt desc
limit 40
```

Docs are mapped to `SocialProofItem` and filtered again with `isSocialProofActive`. A range on a single field uses Firestore’s automatic single-field index.

**Dev preview:** if the query returns nothing and `import.meta.env.DEV`, one hard-coded `site_viewers` item is injected so the toast can be seen without waiting for the cron.

### Cycle (`SocialProofToast.tsx`)

| Constant | Value |
|---|---|
| `POLL_MS` | `30_000` |
| `VISIBLE_MS` | `8_000` |
| `EXIT_MS` | `280` |
| `GAP_MS` | `16_000` |

Phases: `hidden` | `in` | `out`

1. Checkout / admin, or no active items → `hidden`.
2. Otherwise start at index `0`, phase `in`.
3. After `VISIBLE_MS` → phase `out`.
4. After `EXIT_MS + GAP_MS` → next index, phase `in`, refresh `nowMs`.
5. When `items.length` changes or the route becomes hidden, the cycle resets.

Dismiss sets phase to `out` only. The existing exit timer then advances.

### Layout

- Desktop: `position: fixed; left: 24px; bottom: 24px; z-index: 900; width: min(392px, 100vw − 32px)`; media column **86px**
- Wrapper `pointer-events: none`; card `pointer-events: auto`
- Card: white, 14px radius, soft shadow; media panel `#111` so the character’s black background sits cleanly; image `object-fit: contain`
- Enter: 520ms spring — opacity 0→1, `translateY(22px) scale(0.96)` → rest
- Exit: 280ms — opacity 1→0, slight downward settle
- ≤1024px: horizontally centered; bottom includes `env(safe-area-inset-bottom)`
- ≤640px: width `min(300px, 100vw − 24px)`, media **54px**, tighter type and padding
- `prefers-reduced-motion: reduce` → no keyframes; exit phase forces `opacity: 0`

---

## Privacy

- Clients never write `social_proof` or `social_proof_runs`.
- Real orders expose a first name and a coarse NSW place only — no email, street, phone, or order id.
- Generated names are synthetic and are not taken from customers.
- Public read is intentional so anonymous visitors can query the feed.
- Order social-proof writes fail soft.

---

## Timing

```
Daily generate ...... 01:00 Australia/Sydney
Nightly cleanup ..... 22:00 Australia/Sydney
Visibility window ... 59 minutes
Client poll ......... every 30 seconds
Toast visible ....... 8 seconds
Exit animation ...... 280 ms
Gap between toasts .. 16 seconds
Fetch limit ......... 40 most recent active
Daily volume ........ 60–100 generated entries
Order share ......... about 10% of generated entries
Backfill ............ 4–12 entries in the last ~50 minutes
```

---

## Verify

1. Call `runDailySocialProof` as an admin (or wait for 01:00 Sydney) and confirm toasts appear from the backfill.
2. Confirm the mix is mostly viewers, newsletter, and stock-notify, with only occasional orders.
3. Confirm every place name is in NSW.
4. Place or create an order and confirm one `source: "order"` entry appears without blocking email.
5. Confirm `/checkout` and `/checkout-details` hide the toast, and that it stays hidden until age verification.
6. Confirm the character image shows, and that the phone card is smaller than tablet and desktop.
7. Confirm reduced motion disables the enter/exit animation.
8. Confirm expired docs are deleted and the public query does not return items older than 59 minutes.
