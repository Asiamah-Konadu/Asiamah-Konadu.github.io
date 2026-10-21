# Maxwellina Foods

A simple online store for Maxwellina Foods' bofrot and pancake mixes. Storefront checkout prepares an order message in WhatsApp, where customers and the owner confirm payment and delivery. The API also supports Hubtel checkout for integrations, and the owner can manage API orders privately.

The customer-facing storefront sends customers to WhatsApp with their order details pre-filled. The API runs on Vercel, uses Prisma to save API orders in Neon Postgres, and supports Hubtel checkout. Keep payment details and owner access on the server; never put them in Canva code.

## Run locally

Requires Node.js 20.12 or newer. Install dependencies, copy `.env.example` to `.env`, choose a long private `ADMIN_TOKEN`, and start the app:

```sh
npm install
cp .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). Storefront checkout opens WhatsApp with the customer's order details; the order is placed when they send the message. Local API orders are stored in `data/orders.json` unless `DATABASE_URL` is set. With `DATABASE_URL`, Prisma stores them in Postgres.

## Deploy to Vercel

This repository includes a Vercel API function adapter. Order data must be stored in Neon Postgres because Vercel function files are not permanent.

1. Create a Neon Postgres database and copy its connection string.
2. Before the first deploy, apply the database migration from your computer:
   ```sh
   DATABASE_URL="your-Neon-connection-string" npx prisma migrate deploy
   ```
   This also works with the existing `orders` table created by the previous version.
3. Import this repository into Vercel. Vercel detects the `api/` function and serves the site files from the project root.
4. Add these environment variables to the Vercel project:
   - `DATABASE_URL`: the Neon Postgres connection string.
   - `PUBLIC_BASE_URL`: the public HTTPS URL for the site.
   - `FRONTEND_ORIGINS`: the Canva site's exact published URL (for example, `https://example.my.canva.site`).
   - `HUBTEL_CLIENT_ID`, `HUBTEL_CLIENT_SECRET`, and `HUBTEL_MERCHANT_ACCOUNT_NUMBER`: credentials from Hubtel.
   - `ADMIN_TOKEN`: a long, private owner access token.
5. Redeploy after setting the variables.
6. Configure the Hubtel callback URL as `https://your-domain.example/api/hubtel/callback`.

Keep the database URL, Hubtel credentials, and owner token in Vercel's server-side environment variables only. If `DATABASE_URL` is missing, the API cannot save orders.

## Connect the Canva Code site

The Canva site should send customer requests to the Vercel API:

- Start checkout with `POST /api/checkout` and send the customer's `name`, `phone`, optional `location`, and `items` (product keys `bofrot` or `pancake`, plus a quantity). The response includes a `checkoutUrl`; send the customer to that link to pay.
- Track an order with `GET /api/orders/{reference}?phone={phone}`.

Keep owner tools on the private `/admin.html` page. Do not put the owner token in Canva. Set `FRONTEND_ORIGINS` to the exact Canva site URL so browsers can call the API; add multiple URLs separated by commas if needed. Do not use `*` or put Hubtel credentials in Canva. We can verify whether Canva's published site supports these API requests once you share the project.

## Enable Hubtel checkout for API integrations

For local development, set the merchant credentials in `.env`:

```ini
PUBLIC_BASE_URL=https://your-domain.example
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_NUMBER=your-merchant-account-number
ADMIN_TOKEN=a-long-random-private-token
```

Configure the Hubtel merchant account for its online checkout product. The server creates a hosted checkout session, uses the configured public URL for return, cancellation, and payment callback URLs, and checks the transaction status with Hubtel before marking an order paid. Merchant credentials and the owner token must never be placed in Canva code or committed.

## Orders

- Each bofrot or pancake mix costs **GH₵35**. The server independently calculates prices from its product catalogue.
- Checkout collects a customer name, Ghanaian mobile number, and optional location. Product payment excludes delivery: Maxwellina Foods confirms arrangements and any delivery fee with the customer separately.
- Customers can track API-created orders on the storefront using their `MW-...` order code and the same phone number supplied at checkout. WhatsApp storefront orders are confirmed directly in the chat.
- The owner can sign in at `/admin.html` using `ADMIN_TOKEN`, review customer and order details, and update paid orders through preparation, collection/delivery, or cancellation statuses.
- Fulfillment updates are not available until Hubtel payment has been verified. The admin token is kept in memory in the browser and is discarded when the owner signs out or closes the page.
