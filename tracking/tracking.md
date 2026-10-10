# Events tracked — CigarsForYou

What the storefront sends to GA4 (`G-SRZFLMB8X7`). Setup is in [config.md](config.md). How the pipeline behaves and how to check it is in [indexed.md](indexed.md).

No event includes a person’s name, email, phone number, or message. Currency is `AUD` unless noted. Item fields are `item_id`, `item_name`, `item_brand`, `item_category`, `price`, `quantity`.

## Primary conversions

Mark these as key events in GA4.

| Event | When | Params | Call site |
|-------|------|--------|-----------|
| `purchase` | A reward order is placed successfully. Paid checkout should call `trackPaidPurchase()` once on success; it does not fire while payment is off. | `transaction_id`, `value`, `shipping`, `coupon`, `items`, `checkout_type` (`rewards` or `paid`), `points_redeemed` (rewards only) | `src/pages/CheckoutPage.tsx` (`trackPurchase`); future paid success uses `trackPaidPurchase` in `src/lib/analytics.ts` |
| `generate_lead` | Contact form saved | `lead_type=contact`, `subject` | `src/pages/ContactUsPage.tsx` |
| `b2b_enquiry` | Partnerships form saved | `lead_type=b2b`, `interest` | `src/pages/PartnershipsPage.tsx` |

Rewards `purchase.value` is the AUD delivery fee. Points are not counted as revenue.

## Secondary conversions

| Event | When | Params | Call site |
|-------|------|--------|-----------|
| `sign_up` | Account created after age verification | `method=email` | `src/pages/SignupPage.tsx` |
| `stock_notify_signup` | Out-of-stock notify request saved | `item_id`, `item_name`, `item_category` | `src/components/StockNotificationModal.tsx` |
| `waitlist_signup` | Empty-range email list saved | `lead_type=waitlist`, `source` | `src/components/RangeComingSoon.tsx` |
| `login` | Email/password sign-in succeeds | `method=email` | `src/pages/LoginPage.tsx` |
| `click_to_call` | Click a `tel:` link | `link_url` | document click listener in `src/lib/analytics.ts` |
| `click_email` | Click a `mailto:` link | `link_url` | document click listener in `src/lib/analytics.ts` |
| `reward_redeem_begin` | Rewards cart continues to delivery details | `points_total`, `item_count` | `src/components/RewardsProgramPanel.tsx` |

## Ecommerce

| Event | When | Params | Call site |
|-------|------|--------|-----------|
| `view_item_list` | Catalogue list is showing products (capped at 30 items) | `item_list_id` (range), `item_list_name`, `items` | `src/pages/ProductRangePage.tsx` |
| `select_item` | Product card link to the product page | `item_list_id`, `item_list_name`, `items` | `src/components/ProductCard.tsx` |
| `view_item` | Product page has loaded the product | `currency`, `value`, `items` | `src/pages/ProductDetailPage.tsx` |
| `add_to_cart` | Line added, or cart quantity increased | `currency`, `value`, `coupon`, `items` | `src/context/CartContext.tsx` |
| `remove_from_cart` | Line removed, quantity decreased, or quantity set to 0 | `currency`, `value`, `coupon`, `items` | `src/context/CartContext.tsx` |
| `view_cart` | Cart page opens with at least one line | `currency`, `value`, `coupon`, `items` | `src/pages/CartPage.tsx` |
| `begin_checkout` | Delivery-details page opens with a product or rewards cart | `currency`, `value`, `coupon`, `checkout_type`, `items` | `src/pages/CustomerDetailsPage.tsx` |
| `add_shipping_info` | Shopper continues after delivery details pass validation | `currency`, `value`, `shipping_tier` (`express` or `immediate`), `coupon`, `checkout_type`, `items` | `src/pages/CustomerDetailsPage.tsx` |
| `add_payment_info` | Rewards checkout screen opens | `currency`, `value`, `payment_type=rewards`, `checkout_type=rewards`, `items` | `src/pages/CheckoutPage.tsx` |
| `view_promotion` | VIP Dispatch bar is shown | `promotion_id=spend_380`, `promotion_name`, `creative_name` (`progress`, `unlocked_immediate_credit`, or `unlocked_free_express`) | `src/components/SpendThresholdPromoBar.tsx` |
| `select_promotion` | Coupon applied or removed, spend threshold unlocks, or VIP reward is swapped | `promotion_id`, `promotion_name`, `creative_slot` (`coupon_apply`, `coupon_remove`, `spend_threshold`, `spend_reward_immediate_credit`, or `spend_reward_free_express`) | `src/context/CartContext.tsx`, `SpendThresholdPromoBar.tsx` |
| `search` | Navbar search submit, or catalogue `?search=` after typing pauses | `search_term`, `search_source` (`navbar` or `catalog`) | `src/components/Navbar.tsx`, `src/pages/ProductRangePage.tsx` |

The same search term is sent once within two seconds, so a navbar submit and the catalogue page do not double-count.

## Engagement

| Event | When | Params | Call site |
|-------|------|--------|-----------|
| `page_view` | Storefront route, including the first load | `page_path`, `page_location`, `page_title` | `src/components/AnalyticsRouteListener.tsx` |
| `age_gate_accept` | Shopper confirms they are 18+ | — | `src/components/AgeGateModal.tsx` |
| `age_gate_decline` | Shopper exits as under 18 | — | `src/components/AgeGateModal.tsx` |
| `cta_click` | Hero “Shop Now”, or Specials / Cigars / Cigarettes / Accessories in the nav | `cta_id`: `hero_shop_now`, `nav_specials`, `nav_cigars`, `nav_cigarettes`, `nav_accessories` | `src/pages/HomePage.tsx`, `src/components/Navbar.tsx` |
| `video_start` | Home hero video starts | `video_title=Home hero`, `video_provider=html5` | `src/pages/HomePage.tsx` |
| `video_progress` | Hero video reaches 25%, 50%, or 75% once per visit | `video_percent` | `src/pages/HomePage.tsx` |
| `video_complete` | Hero video fires `ended` (a looping background video often does not) | `video_percent=100` | `src/pages/HomePage.tsx` |
| `outbound_click` | Click an `http(s)` link to another site | `link_url`, `link_domain` | document click listener in `src/lib/analytics.ts` |
| `checkout_unavailable_view` | Paid checkout screen while orders cannot be placed | `checkout_type=paid` | `src/pages/CheckoutPage.tsx` |

`page_view` is not sent for `/admin` or `/admin/*`.

## Funnels

1. **Purchase:** `view_item_list` → `view_item` → `add_to_cart` → `view_cart` → `begin_checkout` → `add_shipping_info` → `add_payment_info` → `purchase`. Until paid checkout is on, the paid path stops at `checkout_unavailable_view` instead of `add_payment_info` / `purchase`.
2. **Lead:** storefront `page_view` → `generate_lead` or `b2b_enquiry`.
3. **Age gate:** `page_view` → `age_gate_accept` or `age_gate_decline`.
4. **Stock intent:** `view_item` → `stock_notify_signup`.
5. **Rewards:** `reward_redeem_begin` → `begin_checkout` (`checkout_type=rewards`) → `add_shipping_info` → `add_payment_info` → `purchase`.

Landing page, source, campaign, and conversion rate come from GA4 reports on these events plus `page_view`. No extra events are required for that.

## Not tracked

Live chat, appointment or booking widgets, quote-request forms beyond contact and partnerships, job or account applications, public file downloads, a footer newsletter (the range waitlist is `waitlist_signup`), and refunds.
