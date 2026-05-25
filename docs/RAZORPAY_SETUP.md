# Razorpay Setup

Razorpay powers Indian payment methods (UPI, cards, net banking, wallets)
for ToolsYourWay plans and credit packs.

## Required environment variables

Set both of these in Render → Environment:

```
RAZORPAY_KEY_ID=rzp_live_xxx        # publishable key — sent to the browser
RAZORPAY_KEY_SECRET=xxx              # server-side only — used for HMAC verification
```

Get them from <https://dashboard.razorpay.com/app/keys>.

- Use **live** keys (`rzp_live_...`) on `https://www.toolsyourway.com`.
- Use **test** keys (`rzp_test_...`) on staging / local dev.

## How the integration works

1. Browser hits `POST /api/payments/razorpay/order` (or `/api/payments/credits/razorpay`).
2. Server creates an order with the Razorpay Orders API using `RAZORPAY_KEY_SECRET`.
3. Server returns `{ orderId, amount, currency, key: RAZORPAY_KEY_ID }`.
4. Browser opens Razorpay Checkout with the returned `key` and `order_id`.
5. After payment, the browser POSTs the signed response to `/api/payments/razorpay/verify`.
6. Server verifies the HMAC signature with `RAZORPAY_KEY_SECRET` and activates the plan / credits.

## Common failure mode: `checkout-static-next.razorpay.com/build/undefined`

This URL appears in the console when Razorpay Checkout is opened with an
undefined `key`. That happens when `RAZORPAY_KEY_ID` is missing from the
server environment, so the order endpoint returns `key: undefined`.

The frontend now guards against this: if the server response is missing
`keyId` / `orderId`, it shows a "Razorpay not configured" toast and does
**not** call `new window.Razorpay()`. The fix is to set both
`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Render and redeploy.

## Webhooks (optional but recommended)

Configure a webhook at <https://dashboard.razorpay.com/app/webhooks>:

- URL: `https://www.toolsyourway.com/api/payments/razorpay/webhook`
- Events: `payment.captured`, `payment.failed`, `order.paid`
- Secret: store as `RAZORPAY_WEBHOOK_SECRET` in Render
