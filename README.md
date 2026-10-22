# Maxwellina Foods

A lightweight, high-performance static storefront for Maxwellina Foods' bofrot and pancake mixes, designed for easy deployment to **GitHub Pages**.

## Features

- **No Server / Zero Maintenance**: Pure HTML5, CSS3, and modern Vanilla JavaScript with zero dependencies.
- **WhatsApp Checkout**: Customers customize their cart, provide their name, phone, and optional delivery location, and submit directly to WhatsApp (+233 55 377 4381) with a pre-filled order breakdown.
- **Local Storage Cart**: Cart items, quantities, and totals persist seamlessly across browsing sessions.
- **Mobile Responsive**: Custom drawer menu, sliding cart drawer, and responsive layout tailored for all mobile and desktop screen sizes.
- **Instant GitHub Pages Deployment**: Can be hosted freely and directly from the repository.

## Project Structure

```text
├── index.html        # Main storefront page
├── about.html        # Story and brand about page
├── styles.css        # Core stylesheet and design system
├── app.js            # Shopping cart and WhatsApp checkout logic
└── images/           # Product photos, hero imagery, and brand assets
```

## Running Locally

Simply open `index.html` in any web browser, or serve it using any local web server (e.g., Laragon, VS Code Live Server, or Python):

```sh
python -m http.server 8000
```
