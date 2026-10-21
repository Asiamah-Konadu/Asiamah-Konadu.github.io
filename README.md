# Maxwellina Foods

A Next.js storefront for Maxwellina Foods' bofrot and pancake mixes. Customers build an order on the site, enter their contact details, and send the prepared order through WhatsApp. Payment and delivery are confirmed directly with the Maxwellina Foods team.

## Run locally

Requires Node.js 20.12 or newer.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```sh
npm run build
npm start
```

The app can also be deployed to Vercel as a standard Next.js project. No payment-provider credentials or database are required; checkout is handled in WhatsApp.
