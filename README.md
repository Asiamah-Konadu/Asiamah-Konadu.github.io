# Maxwellina Foods

A responsive storefront for Maxwellina Foods' bofrot and pancake mixes, with online orders, Hubtel-hosted checkout, order tracking, and a private order-management page.

## Run locally

Requires Node.js 20.12 or newer. Install dependencies, copy `.env.example` to `.env`, choose a long private `ADMIN_TOKEN`, and start the app:

```sh
npm install
cp .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). Without Hubtel credentials the catalogue and site remain available, but checkout returns a clear setup message. Local orders are stored in `data/orders.json` unless `DATABASE_URL` is set.

## Deploy to Vercel

This repository includes a Vercel API function adapter and serves the storefront files as static assets. Order data is stored in Neon Postgres because Vercel function filesystems are not persistent.

1. Create a Neon Postgres database and copy its connection string.
2. Import this repository into Vercel. Vercel detects the `api/` function and serves the site files from the project root.
3. Add these environment variables to the Vercel project:
   - `DATABASE_URL`: the Neon Postgres connection string.
   - `PUBLIC_BASE_URL`: the public HTTPS URL for the site.
   - `HUBTEL_CLIENT_ID`, `HUBTEL_CLIENT_SECRET`, and `HUBTEL_MERCHANT_ACCOUNT_NUMBER`: credentials from Hubtel.
   - `ADMIN_TOKEN`: a long, private owner access token.
4. Redeploy after setting the variables. The app creates its `orders` table in Neon on its first API request.
5. Configure the Hubtel callback URL as `https://your-domain.example/api/hubtel/callback`.

The database role must be allowed to create the `orders` table. Keep the database URL, Hubtel credentials, and owner token in server-side Vercel environment variables only. The Vercel function returns a clear `503` API error if `DATABASE_URL` is missing rather than attempting to write orders to ephemeral storage.

## Enable Hubtel checkout

For local development, set the merchant credentials in `.env`:

```ini
PUBLIC_BASE_URL=https://your-domain.example
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_NUMBER=your-merchant-account-number
ADMIN_TOKEN=a-long-random-private-token
```

Configure the Hubtel merchant account for its online checkout product. The app creates a hosted checkout session on the server, uses the configured public URL for the return, cancellation, and payment callback URLs, and checks the transaction status with Hubtel before marking an order paid. Merchant credentials and the owner token must never be placed in frontend code or committed.

## Orders

- Each bofrot or pancake mix costs **GH₵35**. The server independently calculates prices from its product catalogue.
- Checkout collects a customer name, Ghanaian mobile number, and optional location. Product payment excludes delivery: Maxwellina Foods confirms arrangements and any delivery fee with the customer separately.
- Customers can track an order on the storefront using its `MW-...` order code and the same phone number supplied at checkout.
- The owner can sign in at `/admin.html` using `ADMIN_TOKEN`, review customer and order details, and update paid orders through preparation, collection/delivery, or cancellation statuses.
- Fulfillment updates are not available until Hubtel payment has been verified. The admin token is kept in memory in the browser and is discarded when the owner signs out or closes the page.
