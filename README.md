# Maxwellina Foods

A responsive storefront for Maxwellina Foods' bofrot and pancake mixes, with online orders, Hubtel-hosted checkout, order tracking, and a private order-management page.

## Run locally

Requires Node.js 20.12 or newer. Copy `.env.example` to `.env`, choose a long private `ADMIN_TOKEN`, and start the app:

```sh
cp .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). Without Hubtel credentials the catalogue and site remain available, but checkout returns a clear setup message.

## Enable Hubtel checkout

In `.env`, set the merchant credentials issued by Hubtel:

```ini
PUBLIC_BASE_URL=https://your-domain.example
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_NUMBER=your-merchant-account-number
ADMIN_TOKEN=a-long-random-private-token
```

Configure the Hubtel merchant account for its online checkout product. The app creates a hosted checkout session on the server, uses the configured public URL for the return, cancellation, and payment callback URLs, and checks the transaction status with Hubtel before marking an order paid. Merchant credentials and the owner token must only be set as server-side environment variables; never place them in frontend code or commit `.env`.

Serve the app over HTTPS in production and use a Node host that supports a persistent disk. Order records are stored in `data/orders.json`; this simple file store is intended for a single app instance, so use persistent storage and regular backups. Do not deploy this as a static-only GitHub Pages site: payment initiation, status verification, and order management require the Node server.

## Orders

- Each bofrot or pancake mix costs **GH₵35**. The server independently calculates prices from its product catalogue.
- Checkout collects a customer name, Ghanaian mobile number, and optional location. Product payment excludes delivery: Maxwellina Foods confirms arrangements and any delivery fee with the customer separately.
- Customers can track an order on the storefront using its `MW-...` order code and the same phone number supplied at checkout.
- The owner can sign in at `/admin.html` using `ADMIN_TOKEN`, review customer and order details, and update paid orders through preparation, collection/delivery, or cancellation statuses.
- Fulfillment updates are not available until Hubtel payment has been verified. The admin token is kept in memory in the browser and is discarded when the owner signs out or closes the page.
